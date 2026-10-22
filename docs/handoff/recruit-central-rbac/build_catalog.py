#!/usr/bin/env python3
"""Join the mechanical enumeration (raw_endpoints.tsv) with the hand classification below -> endpoints.tsv.

Usage: python3 -I build_catalog.py <catalog_dir> <src_snapshot_root>

Every enumerated endpoint MUST have a CLASS entry and vice versa (the script fails otherwise), so the hand
classification can never silently drop or invent a route.

gate notation (gate_permissions column):  A            single gate
                                           A|B          see notes: OR / AND / COND
notes prefix: gate_expr=...  ; S = AccessControlService.require (fail-open only if recruit.rbac.enforce=false;
enforce=true on staging + production helm values), H = hasPermission + throw (always enforced).
"""
import csv
import os
import re
import sys

CAT, ROOT = sys.argv[1], sys.argv[2]

# key: "METHOD path" -> (gate, shaping, notes)
P = "PUBLIC"
I = "INTERNAL"
N = "NONE"
CLASS = {
    # ---- agreement
    "GET /api/v1/candidates/{id}/agreement": ("CANDIDATE_READ", "AGREEMENT_SEND",
        "gate_expr=CANDIDATE_READ(S); AGREEMENT_SEND only sets the may-send flag in the response"),
    "POST /api/v1/candidates/{id}/agreement/send": ("AGREEMENT_SEND", "", "gate_expr=AGREEMENT_SEND(H)"),
    # ---- audit / admin jobs
    "GET /api/v1/admin/audit-events": ("AUDIT_VIEW", "", "gate_expr=AUDIT_VIEW(H)"),
    "POST /api/v1/admin/candidates/auto-stage/backfill": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(H)"),
    "GET /api/v1/calendar/guest-policy": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S); catalog, no candidate data"),
    # ---- candidates
    "POST /api/v1/candidates": ("CANDIDATE_CREATE", "", "gate_expr=CANDIDATE_CREATE(S)"),
    "GET /api/v1/candidates": ("CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM", "CANDIDATE_CLAIM|REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S) AND [if ?unowned=true] (CANDIDATE_CLAIM OR REPORT_TEAM)(S requireAny); "
        "without ?unowned the same requireAny only NARROWS rows (catch -> worked-or-specialist slice) = shaping; "
        "?collected=TEAM additionally requires ROLE TEAM_LEAD (role-code gate, CollectedFilter:66); "
        "REPORT_TEAM also widens follow-up visibility (CandidateFollowUpVisibility) and program-lead hiding (ProgramLeadVisibility)"),
    "GET /api/v1/candidates/{id}": ("CANDIDATE_READ", "REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S); REPORT_TEAM = follow-up visibility mask; non-owner redaction for scoped actors"),
    "PUT /api/v1/candidates/{id}": ("CANDIDATE_UPDATE", "", "gate_expr=CANDIDATE_UPDATE(S); scoped actors refused bonus fields"),
    "POST /api/v1/candidates/{id}/claim": ("CANDIDATE_CLAIM", "", "gate_expr=CANDIDATE_CLAIM(S)"),
    "POST /api/v1/candidates/batch-claim": ("CANDIDATE_CLAIM", "", "gate_expr=CANDIDATE_CLAIM(S)"),
    "POST /api/v1/candidates/{id}/transfer": ("CANDIDATE_TRANSFER", "",
        "gate_expr=[if actor != owner] CANDIDATE_TRANSFER(S) (owner hands off own lead with NO permission); "
        "target user must hold CANDIDATE_CLAIM (validation of the TARGET, not the caller, CandidateFacadeImpl:318)"),
    "POST /api/v1/candidates/bulk-transfer": ("CANDIDATE_READ|CANDIDATE_TRANSFER", "",
        "gate_expr=CANDIDATE_READ(S) AND [per row, if actor != owner] CANDIDATE_TRANSFER(S); target must hold CANDIDATE_CLAIM"),
    "POST /api/v1/candidates/bulk-archive": ("CANDIDATE_ARCHIVE|CANDIDATE_TRANSFER", "",
        "gate_expr=CANDIDATE_ARCHIVE(S) AND [per row, if row owned by someone else] CANDIDATE_TRANSFER(S)"),
    "POST /api/v1/candidates/{id}/transition": ("CANDIDATE_TRANSITION|CANDIDATE_OVERRIDE_GATE", "",
        "gate_expr=CANDIDATE_TRANSITION(S) AND [if override=true] CANDIDATE_OVERRIDE_GATE(S) - one endpoint, two permissions"),
    "GET /api/v1/candidates/{id}/stage-history": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "POST /api/v1/candidates/{id}/activities": ("ACTIVITY_LOG", "CANDIDATE_CLAIM|REPORT_TEAM",
        "gate_expr=ACTIVITY_LOG(S); CANDIDATE_CLAIM(real grant) decides auto-claim on touch; REPORT_TEAM (isElevated) "
        "decides the elevated outbound stamp; ROLE HEADHUNTER/TEAM_LEAD changes occurred_at rules (ActivityServiceImpl:154)"),
    "POST /api/v1/candidates/{id}/call-outcome": ("ACTIVITY_LOG|OFFER_REQUEST|REPORT_TEAM", "",
        "gate_expr=ACTIVITY_LOG(S) AND [if sendInvite] OFFER_REQUEST(S) AND (owner OR REPORT_TEAM) (FollowUpServiceImpl.ownedWorkingCandidate, 400 not 403)"),
    "GET /api/v1/candidates/{id}/suppressions": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S); scoped non-owner gets redacted rows"),
    "GET /api/v1/candidates/{id}/contact-route": ("ACTIVITY_LOG", "",
        "gate_expr=ACTIVITY_LOG(S) OR (caller is the candidate's assigned onboarding specialist) - ownership alternative, no permission"),
    "GET /api/v1/candidates/{id}/auto-stage-hold": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "GET /api/v1/candidates/{id}/activities": ("ACTIVITY_READ", "", "gate_expr=ACTIVITY_READ(S); scoped non-owner sees candidate-facing only"),
    "POST /api/v1/candidates/{id}/conversation/ensure-cast": ("ACTIVITY_READ|REPORT_TEAM", "",
        "gate_expr=ACTIVITY_READ(S) AND (on the candidate's cast OR REPORT_TEAM) (ActivityServiceImpl.mayOpenConversation)"),
    "POST /api/v1/candidates/{id}/revive": ("CANDIDATE_ARCHIVE", "", "gate_expr=CANDIDATE_ARCHIVE(S)"),
    "GET /api/v1/candidates/{id}/events/subscribe": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S) via CandidateFacade.get (SSE)"),
    # ---- follow-ups
    "GET /api/v1/candidates/{id}/follow-ups": ("CANDIDATE_READ|REPORT_TEAM", "",
        "gate_expr=CANDIDATE_READ(S) AND (owner OR REPORT_TEAM)(H, FollowUpServiceImpl.requireViewAccess)"),
    "POST /api/v1/candidates/{id}/follow-ups": ("ACTIVITY_LOG|REPORT_TEAM", "",
        "gate_expr=ACTIVITY_LOG(S) AND (owner OR REPORT_TEAM) (ownedWorkingCandidate, 400)"),
    "PATCH /api/v1/candidates/{id}/follow-ups/{fid}": ("ACTIVITY_LOG|REPORT_TEAM", "",
        "gate_expr=ACTIVITY_LOG(S) AND (owner OR REPORT_TEAM) (ownedWorkingCandidate, 400)"),
    "POST /api/v1/candidates/{id}/follow-ups/{fid}/done": ("ACTIVITY_LOG|REPORT_TEAM", "",
        "gate_expr=ACTIVITY_LOG(S) AND (owner OR REPORT_TEAM) (ownedWorkingCandidate, 400)"),
    # ---- followers / notes
    "GET /api/v1/candidates/{candidateId}/followers": ("CANDIDATE_READ", "REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S); REPORT_TEAM (isManager) decides viewerRemoves / FOLLOW self-action flags"),
    "POST /api/v1/candidates/{candidateId}/followers": ("CANDIDATE_READ|REPORT_TEAM", "",
        "gate_expr=CANDIDATE_READ(H) AND (cast OWNER/SPECIALIST/MANAGER OR REPORT_TEAM) to add someone; self-follow requires REPORT_TEAM; "
        "TARGET must hold CANDIDATE_READ + a role in followers.cast_eligible_roles (validation of target)"),
    "DELETE /api/v1/candidates/{candidateId}/followers/me": (N, "",
        "NO permission: anyone may unfollow themselves (service only touches the caller's own row)"),
    "DELETE /api/v1/candidates/{candidateId}/followers/{userId}": ("REPORT_TEAM", "",
        "gate_expr=self OR owner OR REPORT_TEAM(H) (CandidateFollowerServiceImpl.unfollow); no CANDIDATE_READ check"),
    "POST /api/v1/candidates/{candidateId}/notes": ("ACTIVITY_LOG", "CANDIDATE_READ|REPORT_TEAM",
        "gate_expr=ACTIVITY_LOG(H, as canLog) OR on the candidate's cast (isCastEligible); mentioned users must hold CANDIDATE_READ "
        "(validation of targets); REPORT_TEAM (mayAddFollowers) decides whether a mention also adds a follower"),
    "GET /api/v1/config/candidate-view": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S); config catalog"),
    # ---- checklist
    "POST /api/v1/admin/checklists/backfill": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(H)"),
    "GET /api/v1/candidates/{candidateId}/checklist-items": ("CHECKLIST_READ", "", "gate_expr=CHECKLIST_READ(S)"),
    "GET /api/v1/checklist/departments/{department}/items": ("CHECKLIST_READ", "",
        "gate_expr=CHECKLIST_READ(S); department role codes decide program-lead visibility (ProgramLeadVisibility:132)"),
    "GET /api/v1/checklist/departments/{department}/queue": ("CHECKLIST_READ", "",
        "gate_expr=CHECKLIST_READ(S); department role codes decide program-lead visibility"),
    "GET /api/v1/checklist/departments/{department}/candidates": ("CHECKLIST_READ", "",
        "gate_expr=CHECKLIST_READ(S); department role codes decide program-lead visibility"),
    "PATCH /api/v1/checklist-items/{id}": (
        "CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT", "",
        "gate_expr=CHECKLIST_ITEM_MANAGE_<department of the LOADED ROW>(H) (RecruitPermission.checklistItemManageFor) - "
        "one endpoint, 5 permissions selected by data, not by route"),
    "PUT /api/v1/checklist-items/{id}/onboarding-meeting/schedule": ("CHECKLIST_ITEM_MANAGE_ONBOARDING", "",
        "gate_expr=CHECKLIST_ITEM_MANAGE_ONBOARDING(H)"),
    "DELETE /api/v1/checklist-items/{id}/onboarding-meeting/schedule": ("CHECKLIST_ITEM_MANAGE_ONBOARDING", "",
        "gate_expr=CHECKLIST_ITEM_MANAGE_ONBOARDING(H)"),
    "GET /api/v1/admin/checklist/templates": ("CHECKLIST_READ", "", "gate_expr=CHECKLIST_READ(S)"),
    "GET /api/v1/admin/checklist/templates/{id}/impact": ("CHECKLIST_READ", "", "gate_expr=CHECKLIST_READ(S)"),
    "POST /api/v1/admin/checklist/templates": (
        "CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT", "",
        "gate_expr=CHECKLIST_TEMPLATE_MANAGE_<department in request body>(H) - one endpoint, 5 permissions selected by data"),
    "PUT /api/v1/admin/checklist/templates/{id}": (
        "CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT", "",
        "gate_expr=CHECKLIST_TEMPLATE_MANAGE_<department of the row>(H) - 5 permissions selected by data"),
    "DELETE /api/v1/admin/checklist/templates/{id}": (
        "CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT", "",
        "gate_expr=CHECKLIST_TEMPLATE_MANAGE_<department of the row>(H) - 5 permissions selected by data"),
    # ---- conversation access
    "POST /api/v1/candidates/{candidateId}/conversation/join": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(H) 'only a manager can join'"),
    "GET /api/v1/candidates/{candidateId}/conversation/participants": ("ACTIVITY_READ", "", "gate_expr=ACTIVITY_READ(S)"),
    "POST /api/v1/candidates/{candidateId}/conversation/leave": (N, "",
        "NO permission on purpose (ConversationAccessFacadeImpl:61): leaving your own grant"),
    "DELETE /api/v1/candidates/{candidateId}/conversation/participants/{userId}": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(H)"),
    # ---- dashboard
    "GET /api/v1/today": ("CANDIDATE_READ", "OFFER_APPROVE|REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S); OFFER_APPROVE adds the approval queue block, REPORT_TEAM the team-overdue count / elevated rows"),
    "GET /api/v1/today/handed-to-me": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "GET /api/v1/kpi/pipeline": ("CANDIDATE_READ", "REPORT_TEAM", "gate_expr=CANDIDATE_READ(S); REPORT_TEAM via program-lead visibility"),
    # ---- dedup
    "GET /api/v1/duplicates": ("CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM", "REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S) AND (CANDIDATE_CLAIM OR REPORT_TEAM)(S requireAny)"),
    "POST /api/v1/duplicates/merge": ("CANDIDATE_MERGE", "", "gate_expr=CANDIDATE_MERGE(S)"),
    # ---- exceptions (manager queues)
    "GET /api/v1/exceptions/counts": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "GET /api/v1/exceptions/moso-sync": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "POST /api/v1/exceptions/moso-sync/{offerId}/follow-signed": ("REPORT_TEAM|OFFER_APPROVE", "",
        "gate_expr=REPORT_TEAM(S) AND OFFER_APPROVE(S)"),
    "POST /api/v1/exceptions/moso-sync/{offerId}/accept-paid": ("REPORT_TEAM|OFFER_APPROVE", "",
        "gate_expr=REPORT_TEAM(S) AND OFFER_APPROVE(S)"),
    "POST /api/v1/exceptions/moso-sync/{offerId}/handled": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "GET /api/v1/exceptions/ready-to-join": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "POST /api/v1/exceptions/ready-to-join/{candidateId}/remind": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    # ---- admin jobs
    "POST /api/v1/admin/packs-writeback/experience-backfill": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(H) - a data job on the settings permission"),
    "POST /api/v1/admin/omni/followers/reconcile": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(H)"),
    # ---- google connect (self)
    "GET /api/v1/me/google/connect-url": (N, "", "no RecruitPermission; requires ANY rbac grant row with >=1 role code (GoogleConnectService:284, 'not a recruit user')"),
    "POST /api/v1/me/google/connect": (N, "", "no RecruitPermission; requires >=1 role code"),
    "GET /api/v1/me/google/status": (N, "", "no RecruitPermission; requires >=1 role code"),
    "DELETE /api/v1/me/google": (N, "", "no RecruitPermission; requires >=1 role code"),
    "POST /api/v1/admin/headhunter/catch-up/{userId}": ("RBAC_MANAGE", "",
        "gate_expr=RBAC_MANAGE(H); target must hold ROLE HEADHUNTER/TEAM_LEAD (validation)"),
    # ---- public / internal
    "GET /public/api/v1/comm/host/subjects/{subject-type}/{id}/active": (P, "", "PUBLIC path; shared secret Access-Token + X-Internal-Request (omni SPI); fail-closed when unset"),
    "GET /public/api/v1/comm/host/subjects/{subject-type}/resolve": (P, "", "PUBLIC path; shared secret (omni SPI)"),
    "GET /public/api/v1/comm/host/sender-identity": (P, "", "PUBLIC path; shared secret (omni SPI)"),
    "POST /api/v1/hot-idle-release/internal/tick": (I, "", "INTERNAL cron tick; service key header, constant-time"),
    "GET /api/v1/candidates/{id}/hr-handoff": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "POST /api/v1/candidates/{id}/hr-handoff": ("CANDIDATE_HR_HANDOFF", "", "gate_expr=CANDIDATE_HR_HANDOFF(S)"),
    "POST /api/v1/candidates/{id}/hr-handoff/resend": ("CANDIDATE_HR_HANDOFF", "", "gate_expr=CANDIDATE_HR_HANDOFF(S)"),
    "POST /api/v1/hr-handoff/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /api/v1/admin/hr-onboard/reconcile": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(H) - data job on the settings permission"),
    # ---- inbox
    "GET /api/v1/inbox/hot": ("CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM", "CANDIDATE_CLAIM|REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S) AND (CANDIDATE_CLAIM OR REPORT_TEAM)(S requireAny); held-by-collector block needs CLAIM or REPORT_TEAM; REPORT_TEAM via program-lead visibility"),
    "GET /api/v1/inbox/hot/counts": ("CANDIDATE_READ", "CANDIDATE_CLAIM|REPORT_TEAM",
        "gate_expr=CANDIDATE_READ(S) only (NOT the requireAny of /inbox/hot); REPORT_TEAM adds past-SLA counts, CLAIM|REPORT_TEAM adds lead counts"),
    "GET /api/v1/inbox/hot/claimed-idle": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "POST /api/v1/inbox/hot/claimed-idle/{candidateId}/remind": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(S)"),
    "GET /api/v1/inbox/cold": ("CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM", "",
        "gate_expr=CANDIDATE_READ(S) AND (CANDIDATE_CLAIM OR REPORT_TEAM)(S requireAny)"),
    "GET /api/v1/kpi/trends": ("CANDIDATE_READ", "REPORT_TEAM", "gate_expr=CANDIDATE_READ(S); REPORT_TEAM = team-wide vs own numbers"),
    # ---- labels
    "GET /api/v1/labels": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "POST /api/v1/labels": ("CANDIDATE_UPDATE", "", "gate_expr=CANDIDATE_UPDATE(H) - creating a catalog label rides on the candidate-edit permission (R11)"),
    "PUT /api/v1/labels/{id}": ("LABEL_MANAGE", "", "gate_expr=LABEL_MANAGE(H)"),
    "DELETE /api/v1/labels/{id}": ("LABEL_MANAGE", "", "gate_expr=LABEL_MANAGE(H)"),
    "GET /api/v1/candidates/{candidateId}/labels": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "GET /api/v1/candidate-labels": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "POST /api/v1/candidates/{candidateId}/labels": ("CANDIDATE_UPDATE", "", "gate_expr=CANDIDATE_UPDATE(H)"),
    "DELETE /api/v1/candidates/{candidateId}/labels/{labelId}": ("CANDIDATE_UPDATE", "", "gate_expr=CANDIDATE_UPDATE(H)"),
    # ---- legal name
    "POST /api/v1/candidates/{id}/legal-name/confirm": ("CANDIDATE_LEGAL_NAME_CONFIRM", "", "gate_expr=CANDIDATE_LEGAL_NAME_CONFIRM(H)"),
    "POST /api/v1/candidates/{id}/legal-name/registration": ("CANDIDATE_LEGAL_NAME_CONFIRM", "", "gate_expr=CANDIDATE_LEGAL_NAME_CONFIRM(H)"),
    # ---- licensing rules
    "GET /api/v1/admin/licensing/state-rules": ("LICENSING_RULE_MANAGE", "", "gate_expr=LICENSING_RULE_MANAGE(S) - read rides on the MANAGE permission"),
    "POST /api/v1/admin/licensing/state-rules": ("LICENSING_RULE_MANAGE", "", "gate_expr=LICENSING_RULE_MANAGE(H)"),
    "PUT /api/v1/admin/licensing/state-rules/{id}": ("LICENSING_RULE_MANAGE", "", "gate_expr=LICENSING_RULE_MANAGE(H)"),
    "DELETE /api/v1/admin/licensing/state-rules/{id}": ("LICENSING_RULE_MANAGE", "", "gate_expr=LICENSING_RULE_MANAGE(H)"),
    "GET /api/v1/me/nav-context": (N, "", "NO permission: caller's own role codes + referral flags (nav)"),
    "POST /api/v1/meet-attendance/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /public/v1/integrations/mmi/push/{token}": (P, "", "PUBLIC webhook (MMI CRM push); secret token in URL, constant-time, 404 on any failure"),
    # ---- modex
    "POST /api/v1/admin/import/modex-csv": ("MODEX_IMPORT|IMPORT_RUN", "", "gate_expr=MODEX_IMPORT OR IMPORT_RUN (H, ModexImportGate)"),
    "GET /api/v1/admin/modex/nmls-export": ("MODEX_IMPORT|IMPORT_RUN", "", "gate_expr=MODEX_IMPORT OR IMPORT_RUN (H)"),
    "GET /api/v1/admin/modex/status": ("MODEX_IMPORT|IMPORT_RUN", "", "gate_expr=MODEX_IMPORT OR IMPORT_RUN (H)"),
    "GET /api/v1/candidates/{id}/modex": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(H, ModexSnapshotService:104)"),
    "GET /api/v1/candidates/modex-summary": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(H)"),
    "GET /api/v1/candidates/{id}/moso-field-sync": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S) via CandidateFacade.get"),
    "POST /api/v1/admin/import/moso": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(S)"),
    "POST /api/v1/admin/import/moso/profile-fields": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(S)"),
    "POST /api/v1/moso-signed-reconcile/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    # ---- my invites (My hand-offs)
    "GET /api/v1/offers/mine": ("OFFER_REQUEST", "",
        "gate_expr=OFFER_REQUEST(H) OR ROLE ONBOARDING (role-code alternative, MyInvitesController.listCaller); "
        "approver list addressed by ROLE MANAGER AND usersWith(OFFER_APPROVE)"),
    "GET /api/v1/offers/mine/unseen-count": ("OFFER_REQUEST", "", "gate_expr=OFFER_REQUEST(H) OR ROLE ONBOARDING (role-code alternative)"),
    "POST /api/v1/offers/{offerId}/seen": ("OFFER_REQUEST", "", "gate_expr=OFFER_REQUEST(S)"),
    "POST /api/v1/offers/{offerId}/remind-approver": ("OFFER_REQUEST", "",
        "gate_expr=OFFER_REQUEST(S); recipients = ROLE MANAGER AND usersWith(OFFER_APPROVE) (addressing, not a gate)"),
    "POST /api/v1/offers/{offerId}/remind-onboarding": ("OFFER_REQUEST", "", "gate_expr=OFFER_REQUEST(S)"),
    "GET /api/v1/me/zoom-link": (N, "", "NO permission: caller's own zoom-link status"),
    # ---- notifications
    "GET /api/v1/notifications": (N, "", "NO permission: caller's own notifications"),
    "GET /api/v1/notifications/unread-count": (N, "", "NO permission: caller's own"),
    "POST /api/v1/notifications/{id}/read": (N, "", "NO permission: caller's own (404 if not theirs)"),
    "POST /api/v1/notifications/read-all": (N, "", "NO permission: caller's own"),
    "POST /api/v1/nurture-drip/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /api/v1/nurture-drip/internal/scheduled-send/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /api/v1/admin/nurture/migrate": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(H) - data job on the settings permission"),
    # ---- offers
    "POST /api/v1/candidates/{candidateId}/offers": ("OFFER_REQUEST|OFFER_APPROVE", "",
        "gate_expr=OFFER_REQUEST(S) AND (owner OR OFFER_APPROVE)(H, OfferRequestPermission) AND [if approveNow] OFFER_APPROVE(H, OfferServiceImpl:174); "
        "ROLE HEADHUNTER/TEAM_LEAD marks a program offer; notifies usersWith(OFFER_APPROVE)"),
    "GET /api/v1/candidates/{candidateId}/offers": ("OFFER_READ", "", "gate_expr=OFFER_READ(S); scoped non-owner redaction"),
    "GET /api/v1/candidates/{candidateId}/invite-status": ("OFFER_READ", "OFFER_APPROVE",
        "gate_expr=OFFER_READ(S); OFFER_APPROVE (or owner/requester) sets may-request / may-resend flags"),
    "POST /api/v1/offers/{offerId}/resend-invite": ("OFFER_APPROVE", "",
        "gate_expr=requester OR OFFER_APPROVE(H, InviteResendPermission) - no route-level permission; ownership alternative"),
    "GET /api/v1/offers/pending-approval": ("OFFER_APPROVE", "", "gate_expr=OFFER_APPROVE(S)"),
    "POST /api/v1/offers/{offerId}/approve": ("OFFER_APPROVE", "", "gate_expr=OFFER_APPROVE(S)"),
    "POST /api/v1/offers/{offerId}/decline": ("OFFER_REQUEST|OFFER_APPROVE", "",
        "gate_expr=OFFER_REQUEST(S) AND (owner OR requester OR OFFER_APPROVE)(H, OfferDeclinePermission)"),
    "POST /api/v1/admin/omni/cast-backfill/onboarding-specialists": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S) - data job on the settings permission"),
    "POST /api/v1/omni/cast-repush/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /api/v1/admin/omni/subject-alias/backfill": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(H)"),
    "POST /api/v1/omni/subject-alias/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    # ---- onboarding
    "POST /api/v1/checklist-items/{id}/onboarding-meeting/resend": ("CHECKLIST_ITEM_MANAGE_ONBOARDING", "", "gate_expr=CHECKLIST_ITEM_MANAGE_ONBOARDING(H)"),
    "POST /api/v1/onboarding-reminders/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "GET /api/v1/onboarding/specialists": ("ONBOARDING_SPECIALIST_ASSIGN", "", "gate_expr=ONBOARDING_SPECIALIST_ASSIGN(H)"),
    "POST /api/v1/onboarding/specialists/{userId}/clear-hold": ("REPORT_TEAM", "", "gate_expr=REPORT_TEAM(H)"),
    "PUT /api/v1/candidates/{id}/onboarding-specialist": ("ONBOARDING_SPECIALIST_ASSIGN", "", "gate_expr=ONBOARDING_SPECIALIST_ASSIGN(H)"),
    "GET /api/v1/packs-writeback/failures": ("ACTIVITY_LOG", "REPORT_TEAM", "gate_expr=ACTIVITY_LOG(S); REPORT_TEAM via program-lead visibility"),
    "POST /api/v1/packs-writeback/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "POST /api/v1/platform-inbox/internal/tick": (I, "", "INTERNAL cron tick; service key (+ refuses a user Bearer)"),
    # ---- post-joined onboarding progress
    "GET /api/v1/candidates/{id}/onboarding-progress": ("CANDIDATE_READ", "RBAC_MANAGE",
        "gate_expr=CANDIDATE_READ(S); RBAC_MANAGE (or owner / specialist) sets the may-tick flag"),
    "GET /api/v1/candidates/{id}/onboarding-progress/hr-checklist": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "GET /api/v1/candidates/{id}/onboarding-progress/licences": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "PUT /api/v1/candidates/{id}/onboarding-progress/{step}": ("RBAC_MANAGE", "",
        "gate_expr=owner OR onboarding specialist OR RBAC_MANAGE(H, PostJoinedProgressService.mayTick) - no route-level permission; RBAC_MANAGE used as an 'admin' proxy"),
    "DELETE /api/v1/candidates/{id}/onboarding-progress/{step}": ("RBAC_MANAGE", "",
        "gate_expr=owner OR onboarding specialist OR RBAC_MANAGE(H) - RBAC_MANAGE used as an 'admin' proxy"),
    "POST /api/v1/post-joined-reconcile/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    # ---- program members (headhunter program admin)
    "GET /api/v1/admin/program-members/pending": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(H) + per-caller rate limit"),
    "GET /api/v1/admin/program-members/pending/{mosoKey}/candidates": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(H) + rate limit"),
    "GET /api/v1/admin/program-members/exceptions": ("RBAC_MANAGE|CANDIDATE_TRANSFER", "", "gate_expr=RBAC_MANAGE OR CANDIDATE_TRANSFER (H)"),
    "POST /api/v1/admin/program-members/{mosoKey}/link": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(H)"),
    "POST /api/v1/admin/program-members/{mosoKey}/reject": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(H)"),
    "POST /api/v1/admin/program-members/{mosoKey}/unlink": ("RBAC_MANAGE", "",
        "gate_expr=RBAC_MANAGE(H); CANDIDATE_CLAIM of the UNLINKED user decides whether their leads are released (target, not caller)"),
    "POST /api/v1/program-sync/internal/tick": (I, "", "INTERNAL cron tick; service key (+ refuses a user Bearer)"),
    "POST /public/v1/webhook/{service-name}/listener": (P, "", "PUBLIC webhook (MOSO packs op); x-api-key header; only service-name=moso"),
    # ---- rbac admin
    "GET /api/v1/admin/rbac/roles": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S)"),
    "GET /api/v1/admin/rbac/directory": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S)"),
    "GET /api/v1/admin/rbac/grants": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S)"),
    "PUT /api/v1/admin/rbac/grants/{userId}": ("RBAC_MANAGE", "",
        "gate_expr=RBAC_MANAGE(S); last-RBAC_MANAGE-holder lockout guard (RbacAdminServiceImpl:557-579) evaluates OTHER users"),
    "POST /api/v1/admin/rbac/grants/bulk": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S); same lockout guard"),
    "DELETE /api/v1/admin/rbac/grants/{userId}": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S); lockout guard"),
    "GET /api/v1/admin/rbac/grants/{userId}/history": ("RBAC_MANAGE", "", "gate_expr=RBAC_MANAGE(S)"),
    "GET /api/v1/admin/rbac/me": (N, "", "NO permission: caller's own effective permissions (path is under /admin but is self-service)"),
    # ---- zoom links admin
    "GET /api/v1/admin/zoom-links": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "GET /api/v1/admin/zoom-links/{userId}": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "PUT /api/v1/admin/zoom-links/{userId}": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "DELETE /api/v1/admin/zoom-links/{userId}": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    # ---- referral
    "POST /api/v1/referral-attribution/{candidateId}/override": ("REFERRAL_ATTRIBUTION_OVERRIDE", "", "gate_expr=REFERRAL_ATTRIBUTION_OVERRIDE(S)"),
    "GET /api/v1/referral-attribution/{candidateId}": ("REFERRAL_ATTRIBUTION_READ", "", "gate_expr=REFERRAL_ATTRIBUTION_READ(S)"),
    "GET /api/v1/referrals/mine": (N, "", "NO permission: caller's own referrals by verified e-mail identity"),
    "GET /api/v1/referrals": ("REFERRAL_ADMIN_VIEW", "", "gate_expr=REFERRAL_ADMIN_VIEW(H) + feature flag"),
    "GET /api/v1/referrals/export.csv": ("REFERRAL_ADMIN_VIEW", "", "gate_expr=REFERRAL_ADMIN_VIEW(H) + feature flag"),
    "GET /public/api/v1/register-status": (P, "", "PUBLIC; the websafe key is the bearer; rate-limited; no existence oracle"),
    # ---- reports
    "GET /api/v1/reports/recruiters": ("CANDIDATE_READ", "REPORT_TEAM", "gate_expr=CANDIDATE_READ(S); REPORT_TEAM = every recruiter's rows vs own"),
    "GET /api/v1/reports/pivot": ("CANDIDATE_READ", "REPORT_TEAM", "gate_expr=CANDIDATE_READ(S); REPORT_TEAM = team vs own"),
    # ---- saved filters
    "GET /api/v1/saved-filters": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S); caller's own rows"),
    "POST /api/v1/saved-filters": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "PUT /api/v1/saved-filters/{id}": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    "DELETE /api/v1/saved-filters/{id}": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S)"),
    # ---- sequences
    "POST /api/v1/candidates/{candidateId}/sequences/{sequenceId}/enroll": ("SEQUENCE_MANAGE", "", "gate_expr=SEQUENCE_MANAGE(S)"),
    "POST /api/v1/sequence-enrollments/{enrollmentId}/stop": ("SEQUENCE_MANAGE", "", "gate_expr=SEQUENCE_MANAGE(S)"),
    "GET /api/v1/candidates/{candidateId}/sequence-enrollments": ("SEQUENCE_READ", "", "gate_expr=SEQUENCE_READ(S)"),
    "POST /api/v1/sequences/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    # ---- settings
    "GET /api/v1/admin/settings": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "GET /api/v1/admin/settings/{key}/history": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "GET /api/v1/admin/settings/business-hours/holidays": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    "PUT /api/v1/admin/settings/{key}": ("SETTINGS_MANAGE", "", "gate_expr=SETTINGS_MANAGE(S)"),
    # ---- sponsorships
    "POST /api/v1/admin/sponsorships/backfill": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(S)"),
    "GET /api/v1/sponsorships": ("CHECKLIST_READ", "", "gate_expr=CHECKLIST_READ(S); department role codes decide program-lead visibility"),
    "GET /api/v1/candidates/{candidateId}/sponsorships": ("CHECKLIST_READ", "", "gate_expr=CHECKLIST_READ(S)"),
    "POST /api/v1/candidates/{candidateId}/sponsorships/actions": ("SPONSORSHIP_MANAGE|SPONSORSHIP_ACCESS_RECORD", "",
        "gate_expr=SPONSORSHIP_MANAGE OR (action=RECORD_ACCESS AND SPONSORSHIP_ACCESS_RECORD) (H) - permission selected by body field"),
    # ---- suppressions
    "POST /api/v1/suppressions": ("SUPPRESSION_MANAGE", "", "gate_expr=SUPPRESSION_MANAGE(S)"),
    "GET /api/v1/suppressions": ("SUPPRESSION_MANAGE", "", "gate_expr=SUPPRESSION_MANAGE(S) - read rides on MANAGE"),
    "DELETE /api/v1/suppressions/{id}": ("SUPPRESSION_MANAGE", "", "gate_expr=SUPPRESSION_MANAGE(S)"),
    "GET /api/v1/candidates/{id}/sync-trace": ("SYNC_TRACE_READ", "AUDIT_VIEW", "gate_expr=SYNC_TRACE_READ(H); AUDIT_VIEW includes raw error text"),
    # ---- templates
    "GET /api/v1/templates": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S) - active template catalog"),
    "GET /api/v1/templates/manage": ("TEMPLATE_CREATE", "", "gate_expr=TEMPLATE_CREATE(S)"),
    "POST /api/v1/templates": ("TEMPLATE_CREATE", "", "gate_expr=TEMPLATE_CREATE(S)"),
    "PUT /api/v1/templates/{id}": ("TEMPLATE_CREATE", "TEMPLATE_APPROVE", "gate_expr=TEMPLATE_CREATE(S); TEMPLATE_APPROVE lets the edit touch TEAM/ACTIVE templates"),
    "POST /api/v1/templates/{id}/submit": ("TEMPLATE_CREATE", "", "gate_expr=TEMPLATE_CREATE(S)"),
    "POST /api/v1/templates/{id}/approve": ("TEMPLATE_APPROVE", "", "gate_expr=TEMPLATE_APPROVE(S)"),
    "POST /api/v1/templates/{id}/reject": ("TEMPLATE_APPROVE", "", "gate_expr=TEMPLATE_APPROVE(S)"),
    "POST /api/v1/templates/{id}/retire": ("TEMPLATE_CREATE", "TEMPLATE_APPROVE", "gate_expr=TEMPLATE_CREATE(S); TEMPLATE_APPROVE lets the caller retire TEAM templates"),
    "GET /api/v1/admin/webhook-events/unmatched": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(S)"),
    "POST /api/v1/admin/webhook-events/unmatched/purge": ("IMPORT_RUN", "", "gate_expr=IMPORT_RUN(S)"),
    "GET /public/api/v1/unsubscribe/{token}": (P, "", "PUBLIC; signed token is the credential"),
    "POST /public/api/v1/unsubscribe/{token}": (P, "", "PUBLIC; signed token is the credential"),
    "GET /api/v1/users": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(S); CANDIDATE_CLAIM evaluated on EACH LISTED user (canOwn flag), not the caller"),
    "GET /api/v1/users/names": ("CANDIDATE_READ", "", "gate_expr=CANDIDATE_READ(H); scope-filtered for HH/TL"),
    "POST /api/v1/user-service-sync/internal/tick": (I, "", "INTERNAL cron tick; service key"),
    "GET /api/v1/webinars": ("ACTIVITY_LOG", "", "gate_expr=ACTIVITY_LOG(S) - webinar catalog rides on ACTIVITY_LOG"),
}

# Library endpoints from tera-core-spring-boot-starter (component-scanned via @Import(AutoConfiguration) ->
# @ComponentScan("com.loanfactory.core"); verified with javap on ~/.m2 tera-core-spring-boot-starter-0.0.1-SNAPSHOT.jar, 2026-10-08).
LIBRARY = [
    ("POST", "/v1/webhook/{service-name}/listener", "tera-core WebhookController#listenWebhook", "tera-core jar",
     "BLOCKED", "", "n/a", "answered 404 by UnkeyedWebhookRouteBlocker (D165) - dead route, exclude from catalog"),
    ("POST", "/api/v1/file-storage/upload", "tera-core FileStorageController#upload", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route with NO RecruitPermission check (any authenticated user except HH/TL)"),
    ("GET", "/api/v1/file-storage", "tera-core FileStorageController#getAll", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission: lists every stored file"),
    ("GET", "/api/v1/file-storage/{id}", "tera-core FileStorageController#getById", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission"),
    ("GET", "/api/v1/file-storage/{id}/download", "tera-core FileStorageController#download", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission"),
    ("POST", "/api/v1/search/re-index", "tera-core SearchController#reindex", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission: rebuilds a search index"),
    ("POST", "/api/v1/search/clear-index", "tera-core SearchController#clearIndex", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission: clears a search index"),
    ("POST", "/api/v1/batch/run", "tera-core BatchActionController#run", "tera-core jar",
     N, "", "N(403 scoped)", "LIBRARY route, NO permission (UnmatchedWebhookAdminController javadoc says so); runs recruit "
     "batch handlers e.g. CANDIDATE_PHONE_NORMALIZATION_BACKFILL"),
]

allow_src = open(os.path.join(ROOT, "src/main/java/com/loanfactory/recruit/headhunter/web/ScopedRouteAllowlist.java")).read()
ALLOW = set(re.findall(r'"((?:GET|POST|PUT|PATCH|DELETE) /api/v1/[^"]*)"', allow_src))


def row_scope(method, path, gate):
    if gate in (P, I):
        return "n/a"
    if not path.startswith("/api/v1/"):
        return "n/a"
    return "Y" if f"{method} {path}" in ALLOW else "N(403 scoped)"


rows = list(csv.DictReader(open(os.path.join(CAT, "raw_endpoints.tsv")), delimiter="\t"))
keys = [f"{r['method']} {r['path']}" for r in rows]
missing = [k for k in keys if k not in CLASS]
extra = [k for k in CLASS if k not in keys]
dupes = {k for k in keys if keys.count(k) > 1}
assert not missing, f"unclassified endpoints: {missing}"
assert not extra, f"classified but not enumerated: {extra}"
assert not dupes, f"duplicate METHOD path: {dupes}"
stale_allow = sorted(a for a in ALLOW if a not in keys)

with open(os.path.join(CAT, "endpoints.tsv"), "w") as f:
    f.write("method\tpath\tcontroller#method\tfile:line\tgate_permissions\tshaping_permissions\trow_scope_applies\tnotes\n")
    for r, k in zip(rows, keys):
        gate, shaping, notes = CLASS[k]
        f.write("\t".join([r["method"], r["path"], r["handler"], "src/main/java/com/loanfactory/recruit/" + r["file_line"],
                           gate, shaping or "-", row_scope(r["method"], r["path"], gate), notes]) + "\n")
    for m, p, h, fl, gate, shaping, rs, notes in LIBRARY:
        f.write("\t".join([m, p, h, fl, gate, shaping or "-", rs, notes]) + "\n")

print("app endpoints", len(rows), "library endpoints", len(LIBRARY))
print("allowlist entries", len(ALLOW), "allowlist entries matching no endpoint:", stale_allow)
