# Auditor D — Recheck of Recruit's MOSO dependencies, 01/11/2026

Read-only. Code was read only with `git show`, `git grep` and `git log` on fetched remote refs. Nothing was checked out, built or pushed. No database was touched.

## 0. Refs and baseline

| Repo | Baseline (audit A, 21/10) | origin/master now | origin/staging | origin/production |
|---|---|---|---|---|
| recruit-be | `8c064b0d` (#702) | `1f841b45` (31/10, #785), 79 commits after baseline | `99d2003d` (#784) | `9e20ef35` (#781) |
| recruit-fe | `0b353055` | `ebb1478d` (31/10, #648), 86 commits after baseline | `a96b5069` | `a96b5069` |

- recruit-be master is ahead of production by #784 (D351 invite-loss fix, staging only) and #785 (packs byOwner retry, master only).
- Everything else cited below is on production; `git merge-base --is-ancestor` was checked for each commit listed.

**Prod flags.**
- The "prod flags" columns come from `origin/production:helm-chart/config/production/values.yaml`.
- Prod DB settings were NOT re-measured here. They are taken from HANDOFF "AUDIT 31/10 evening":
  - `lo_mail.delivery_mode` = DRY_RUN;
  - `onboarding.reminder.delivery_mode` = DRY_RUN;
  - drip off;
  - no `RECRUIT_FEATURES_LO_MAIL_*` env;
  - `lo_mail_sends` = 0 rows.

**Scope.** As in HANDOFF §2, only packs/moso GAE, MOSO Datastore and moso-aid count as "old MOSO".
- omni-service, moso-notifier, cron-service, tera-core, auth/user-service, ai-hr-be, followup-be and the GCP/GKE infra are KEEP or platform-owned.
- Those are A-037…A-065 (except A-062), A-073…A-081 and B-110/B-111.
- They are left out of the percentage (see §5).
- moso-notifier items appear only where the plan uses them as a P1/P2 step (RECRUIT sender, mail-status intake, nurture on in prod).

**Status key.**

| Status | Meaning | Built score | Live score |
|---|---|---|---|
| REMOVED | The code is gone | 1 | 1 |
| REPLACED-ON | A Recruit replacement runs in prod | 1 | 1 |
| REPLACED-DARK | The replacement is on prod but its flag is OFF | 1 (0.75 if go-live gates are still open) | 0 |
| DATA-RESCUED | P0 data was copied | 1 | 1 |
| PARTIAL | Part of the item is replaced; the score is shown in the row | as shown | as shown |
| STILL-DEPENDS | Unchanged | 0 | 0 |
| NEW | A MOSO dependency added after 21/10 | — | — |

**ACTIVATED** marks a baseline item that was dormant in prod on 21/10 (its flag was absent) and has been live in prod since 29/10. It is still STILL-DEPENDS, but it now carries live traffic.

## 1. Headline findings

1. **P0 is finished.** These were rescued in prod on 30–31/10:
   - Cold import: 102,266 rows;
   - opt-out ledgers: black_list 83, sms 7,443, email 51,649, call 42,649;
   - moso-aid CSVs;
   - templates;
   - referral Checks and webinar history.
2. **P1 and P2 are built and on production, but dark.**
   - The four Recruit LO mails (reminder, webinar, invite, welcome) are on prod with flags OFF and DRY_RUN.
   - `moso-record-required` defaults to TRUE.
   - Only the logo move (and the RECRUIT sender row, per HANDOFF) are live.
3. **P3, P4 and P6 have not started.** P5 has two small partial wins: MMI production figures, and the MOSO sponsorship queue view removed.
4. **The live MOSO surface in prod grew.** On 29/10 (#703, `20bf683f`, Bao go, bead 61yi6) production turned on seven flags that open MOSO write-back:
   - `PACKS_WRITEBACK`, `ONBOARDING_WRITEBACK`, `ONBOARDING_V2_HANDOFF`, `ONBOARDING_HIRE_CLASSIFICATION`, `ONBOARDING_LEGAL_NAME`, `IDENTITY_WRITEBACK`, `IDENTITY_WRITEBACK_EMAIL`;
   - #766 added `WEBINAR_SIGNALS` on the same day;
   - (prod values `:334-374`).
   - On 21/10 the lead had measured "prod recruit → packs write-back is OFF". That is no longer true: every outbox kind except AGREEMENT_SEND can now reach MOSO from prod.
   - This is the "thin flagged bridge" Bao approved on 23/10, but it is live MOSO coupling.
5. **There are 11 NEW MOSO dependencies since 21/10** (§3). Seven of them are live in prod:
   - D303 identity write-back plus the new `/candidate/emailAvailable` endpoint;
   - MOSO field bells;
   - the REFERRER role, assigned from packs `byOwner` / `resolve`;
   - the default referral link from packs `domain_url`;
   - hand-off MOSO-refusal UX;
   - the "Previous MOSO recruiter" line;
   - MOSO apply links inside Recruit's own mails (deliberate, temporary).
   - The HANDOFF P0 rule "no new RecruitApiClient write kinds" held for outbox kinds (still 6). But the payload of `/candidate/sync` grew by 5 fields, and the read surface grew.

## 2. Deduped dependency list with status

64 in-scope items. A is primary; B/C items that A lacks are folded in and marked with their source ID. Evidence paths:
- `BE:` = `recruit-be@origin/master:src/main/java/com/loanfactory/recruit/`
- `FE:` = `recruit-fe@origin/master:`
- `vals` = `recruit-be@origin/production:helm-chart/config/production/values.yaml`

### G1. Lead intake: the MOSO push (P3)

| # | Item (source IDs) | Status | Evidence / note |
|---|---|---|---|
| D01 | Realtime LORecruiting push → `/public/v1/webhook/moso/listener` (A-001, B-020, C-001) | STILL-DEPENDS | `BE:moso/controller/PublicWebhookController.java` unchanged in role. The push now also carries packs program-credit fields (NEW N7) and feeds owner sync (NEW N3). |
| D02 | Webhook key ↔ SystemProp `recruit_webhook_api_key` (A-002) | STILL-DEPENDS | — |
| D03 | LORecruiting schema → candidates mapping (A-003) | STILL-DEPENDS, **grew** | `moso/` package grew from 33 to 49 files; `MosoRowMapper.java:1610` gained `lo_recruiter_program_*` (#772). |
| D04 | `native-candidate-create` off, so MOSO is the only way in (C-002) | STILL-DEPENDS | `application.yml:436` default false; not set in prod `vals`. |
| D05 | Hand-raise sources write LORecruiting: LF forms, FB ads, Calendly, CSV (B-021) | STILL-DEPENDS | No Recruit intake endpoint exists (P3 not started). |
| D06 | Origin stamps `lead_origin_*` (A-012, B-025) | STILL-DEPENDS | — |
| D07 | Webinar registration/attendance in the push (A-009, C-059) | STILL-DEPENDS, **ACTIVATED** | `vals:373` `WEBINAR_SIGNALS=true` (#766 `f0f3a3a2`, 29/10). |

### G2. Bulk import, Cold, suppression (P0 / P5)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D08 | Cold pool export/import (A-004, B-028, C-008) | **DATA-RESCUED** | Prod 31/10: 102,266 `cold_imported_at` rows (HANDOFF). Code: #724 `012c3a48` (D316 owner NONE), #732 `640ff76f` (D325), #776 `d7416133` (runner Datastore mode). The import tool and the endpoint remain (`BE:moso/controller/MosoImportController.java:33`). |
| D09 | Profile-fields re-import (A-005) | STILL-DEPENDS | Tool unchanged; not run. |
| D10 | Suppression ledgers: BlackList, SMS, email, call (A-006, C-009) | **DATA-RESCUED** | Prod 30/10: 83 / 7,443 / 51,649 / 42,649 rows (HANDOFF). #776 fixed the SMS ledger (0 → 7,832 rows dumped). New MOSO-side opt-outs still do not flow except through the push (D11). |
| D11 | STOP opt-out via push Notes scan (B-026, C-005) | STILL-DEPENDS | — |

### G3. Loan Officer data read from MOSO (P5, plus P4 for onboarding/sign state)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D12 | Loans / production figures (A-007) | **PARTIAL 0.5**, REPLACED-ON | MMI CRM push fills production (#707 `ebde09c5` D305; prod ON #762 `0d63d20d`, `vals:261`). `BE:candidate/experience/SinceFigureSource.java` adds `ANCHOR_MMI_LOWER_BOUND`. MOSO `closed_loans_since_2021` is still the fallback (`SINCE_2021`). |
| D13 | Licensing / NMLS / sponsorships (A-008, B-024) | **PARTIAL 0.25** | The FROM_MOSO licensing queue was REMOVED: `licensing/SponsorshipViews.java` and the licensing-rule APIs were deleted by #714 `0eaf0dea` (D308). Still present: `licensing/service/impl/SponsorshipBackfillServiceImpl.java` (LEGACY_IMPORT seed) and `nmls_status` from the push. |
| D14 | HR / employment signals: terminate, rehire (A-014) | **PARTIAL 0.25** | HR offboarding now marks a hired LO as left from HR (#723 `479237d1`, not MOSO). Rehire guard and `not_eligible_for_rehire` still come from MOSO. |
| D15 | MOSO free-text note (A-017) | STILL-DEPENDS | — |
| D16 | LO avatar URL from MOSO (C-F08) | STILL-DEPENDS | Not re-traced; nothing changed in that area. |
| D17 | Onboarding state read-back: meeting status, specialist (A-011, C-025) | STILL-DEPENDS | — |
| D18 | Legal / registration name (A-015) | STILL-DEPENDS, **ACTIVATED** | `vals:346` `ONBOARDING_LEGAL_NAME=true` (#703). |
| D19 | Signed / paid / fee-waiver state (A-010, B-022, B-023) | STILL-DEPENDS | `BE:inbox/controller/ExceptionsController.java:70` `/moso-sync` still present. |

### G4. Identity and acting user (P1a / P4 / P6)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D20 | `legacy_key` required to offer, invite, resend, register a webinar or survive dedup (A-016, C-006, C-017, C-F09, C-F10) | **REPLACED-DARK** | Flag `recruit.features.moso-record-required` (default TRUE): `BE:candidate/MosoRecordRequiredFlag.java:24`, used in `OfferServiceImpl.java:150/168/674`, `DedupServiceImpl.java:118`, `FollowUpServiceImpl.java:513`, `InviteResendServiceImpl`. BE #722 `e22559e1` (D314, V286 `outbox_legacy_key_nullable`); FE #569 `ba12f3ee`, #631 `6c998c62`. No prod env, so prod still requires a MOSO record. Turning it off also needs native create (D04). |
| D21 | Actor must be an active MOSO Admin with RECRUITING (A-019, B-014, C-011) | STILL-DEPENDS, **ACTIVATED** | Now exercised by every prod write-back. New code reads the refusal: `BE:offer/service/impl/MyInvitesActions.java:118,188` (#746). |
| D22 | MOSO Admin `branch` needed to sign the invite / welcome (B-015) | STILL-DEPENDS | New UI strings name it: `welcome_blocked_named` "…has no MOSO branch. Ask a MOSO admin…" (FE #632 `79a0c5e4`, BE #778 `ef520af7` D348). |
| D23 | MOSO app id / namespace pins for websafe keys (A-036) | STILL-DEPENDS | `vals:302-305`. |
| D24 | Onboarding specialist must be a MOSO `is_onboarding_specialist` (C-012) | STILL-DEPENDS, **ACTIVATED** | `vals` comment: 5 prod specialists checked on 29/10 for the v2 hand-off. |

### G5. packs write-back (P4 / P6)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D25 | `RECRUIT_API_BASE_URL` + key (A-018, B-013) | STILL-DEPENDS | `vals:202`. |
| D26 | `/candidate/sync` profile write-back (A-020, B-003, C-015) | STILL-DEPENDS, **ACTIVATED** | `vals:334` `PACKS_WRITEBACK=true` (#703, 29/10). The field map is unchanged (6 fields). The identity half is NEW N1. |
| D27 | `/candidate/invite` record (+ hand-off `send_invite:false`, reset stale) (A-021, B-001, B-002, C-019) | STILL-DEPENDS, **ACTIVATED** | In prod a SENT offer now goes to a specialist and packs records the invite (`vals:320-340`, `ONBOARDING_V2_HANDOFF=true`). The e-mail half is D44. |
| D28 | Onboarding-specialist write (A-022, B-006) | STILL-DEPENDS, **ACTIVATED** | `vals:336` `ONBOARDING_WRITEBACK=true`. |
| D29 | `/candidate/registerWebinar` (A-023, B-004, C-029) | STILL-DEPENDS | packs still registers. Only the confirmation mail moved (D43). |
| D30 | `GET /webinars` (A-024, B-010) | STILL-DEPENDS | — |
| D31 | `/candidate/onboardingMeeting` + RECRUIT_V2 + hire class (A-025, B-005, C-024) | STILL-DEPENDS, **ACTIVATED** | `vals:338-347`. The welcome-mail half is D45. |
| D32 | Experience class → commission plan (A-031) | STILL-DEPENDS | DB setting `packs.writeback.experience_enabled`; prod value not re-measured. |
| D33 | Relay tick + `packs_writeback_outbox` (A-033, C-016) | STILL-DEPENDS, **ACTIVATED** | Outbox kinds still 6 (`BE:packswriteback/model/PacksWritebackKind.java`). `packswriteback/` grew from 25 to 33 files. |

### G6. Agreement, portal, fee (P4)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D34 | `/candidate/agreement` dry run (A-026, B-007, C-021) | STILL-DEPENDS | — |
| D35 | `/candidate/agreement/send`: MOSO builds Inkless and mails it (A-027, B-008, C-022) | STILL-DEPENDS | `AGREEMENT_SEND` is still absent in prod. No document-esign client. |
| D36 | Signed-reconcile cron, 20 min (A-032, B-031) | STILL-DEPENDS | `application.yml:674` default true. |
| D37 | `register-status` pay gate (A-067, C-020) | STILL-DEPENDS | `BE:registerstatus/controller/RegisterStatusController.java` present. HANDOFF §3: no caller since 29/09, so a removal candidate. |
| D38 | LO portal `/apply_loan_officer` (B-042) | STILL-DEPENDS | Recruit's own new mails link there (`BE:template/lomail/LoanOfficerMailTokens.java:18,23`, `BE:offer/mail/InviteMail.java:43`, "TEMPORARY MOSO LINK"). |
| D39 | `DisclosureSetting.use_inkless` (B-043) | STILL-DEPENDS | — |
| D40 | Start-up fee / PayPal verification (B-023) | STILL-DEPENDS | Recruit only has a fee-amount setting for mail copy (`BE:template/lomail/send/StartupFee.java:14`, #737 `b30b1a2e`). No PayPal port. |

### G7. E-mails MOSO sends, plus P1/P2 enablers

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D41 | MOSO Datastore Templates → Recruit templates (B-041, P1c) | **REPLACED-DARK** | #730 `bdf4d8ea` (D324, V281 `loan_officer_mail_templates`), #737 sender + signature from user-service (`BE:template/lomail/SenderProfile.java`). Used only by the dark mailers below. |
| D42 | 1-1 reminder sent by packs `meetingReminder` (A-028, B-009, C-026) | **REPLACED-DARK** | #739 `ebe36ceb` (D329): `BE:onboarding/reminder/ReminderNotifierDelivery.java:42`, `LoanOfficerMailKind.java:9`. Flag `lo-mail-reminders` is off in prod and reminders are DRY_RUN, so prod sends neither. |
| D43 | Webinar confirmation mail (part of A-023 / B-004) | **REPLACED-DARK** | #740 `c60885e2` (D330), `LoanOfficerMailKind.java:11`. Staging e2e SENT + DELIVERED. |
| D44 | Invite mail (part of A-021 / B-001) | **REPLACED-DARK (0.75)** | #741 `51300fc5` (D331, V303 record-only), #782 `fd389aca` (D350), FE #636 `64973ee0`. #784 `99d2003d` (D351) is staging only. Open gates `agentflow-0gwad.11` (legacy SENT resend, CLAIMED stuck, DROPPED wording) block flag ON. |
| D45 | Welcome / `pre_onboarding_done` mail (part of A-025 / B-005) | **REPLACED-DARK** | #741 (`BE:onboarding/mail/WelcomeMail.java:24`). Recruit sends it only when MOSO will not. |
| D46 | Agreement-link mail `require_ilo_esign_documents` (B-008) | STILL-DEPENDS | Goes with P4. |
| D47 | Logo on MOSO `lender-rate` GCS bucket (A-062, B-104) | **REMOVED** | #721 `0900230b`: `BE:nurture/drip/NurtureEmailHtml.java:10`, `application.yml:1065` (recruit-fe hosted). `git grep lender-rate/CDN` on master leaves only a comment. |
| D48 | MOSO's own LORecruiting crons and mails on the same rows (B-113, B-040) | STILL-DEPENDS | The packs PR to skip Recruit-managed rows has not been sent (it waits for P2 go-live). |
| D49 | RECRUIT sender identity in prod notifier (B-073, P1b) | **REPLACED-ON** (enabler) | Not code-verifiable here. HANDOFF 29/10: prod notifier already has a live RECRUIT `mail_config` row. moso-notifier #350 is still open with Khai. |
| D50 | Mail-status intake on in prod (A-040, P1b) | STILL-DEPENDS (enabler) | `MAIL_STATUS_INTAKE` is still absent in prod `vals`. |
| D51 | Nurture drip / Send info ON in prod (A-037 as a P2 step) | **REPLACED-DARK** | Built before baseline. Prod drip off (HANDOFF 31/10). #764 `fecfb084` added an SMS Send-info path, flag off. |

### G8. Webinars (P3)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D52 | WebPlus `getNextWebinars`, ns 5716104026521600 (A-034, B-029, C-028) | STILL-DEPENDS | `BE:webinar/WebinarClient.java:170`; `vals:208`. |
| D53 | Own webinars (Google Calendar + Meet) | STILL-DEPENDS | Not started. Calendar/Meet flags are ON in prod for the 1-1 only (`vals:365-374`). |

### G9. Referrals, Headhunter, moso-aid (P5)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D54 | `/referrers/resolve`: MOSO Admin key ↔ e-mail (A-029, B-011, C-033) | STILL-DEPENDS, **grew** | New reads `currentCompanyEmail` and `domainUrl` (field `domain_url`) in `BE:referralview/client/RecruitApiReferralOwnershipClient.java:60-72`. 3 new callers (NEW N4–N6). |
| D55 | `/referrals/byOwner`: referral ownership + bonus Check state (A-030, B-012, C-030) | STILL-DEPENDS, **grew** | Now also drives REFERRER role assignment in prod (N4). Retries and timeouts were added: #783 `3ac0b3f5` (prod), #785 `1f841b45` (master only). |
| D56 | moso-aid roster → program roles (A-035, B-060, C-032) | STILL-DEPENDS | `BE:headhunter/program/MosoAidRosterClient.java` (8 refs, unchanged count). Rules changed by #761 `21d9e2e4` (D340.1). Central RBAC (#728 D320) now receives program roles, but the roster source is still moso-aid. |
| D57 | moso-aid roster / applications data (P0) | **DATA-RESCUED** | Bao exported both programs 30/10 (ambassador 29 rows, lo_recruiter 16). Bead 0gwad.1 closed 31/10. |
| D58 | Referral Checks + webinar history snapshot (P0) | **DATA-RESCUED** | P0 snapshot 23/10: Checks 484, Webinar 200. |

### G10. UI and ops copy (P6)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D59 | Screens and copy that exist because MOSO is the system of record (A-071, C-F12) | STILL-DEPENDS, **grew** | Still present: `FE:src/app/[locale]/(private)/exceptions/_components/MosoSyncSection/index.tsx`, `FE:src/shared/components/CandidateDrawer/SyncTraceSection/index.tsx`, `FE:src/shared/components/AgreementSend/agreementView.ts`, `FE:src/apis/recruit/programMembers.api.ts`. `WorkQueueClient/WelcomeEmailBanner.tsx` is gone: moved into the My hand-offs row, not removed. "MOSO" in en messages: 135 → 139 (§4). |
| D60 | Sync trace / `webhook_events` audit (A-072, C-007) | STILL-DEPENDS | `BE:synctrace/service/impl/SyncTraceServiceImpl.java` present. |

### G11. Config, secrets, domain (P6)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D61 | MOSO-paired secrets: SystemProps `recruit_api_key` / `recruit_webhook_api_key` / skew, moso-aid key (B-044, A-061 MOSO part) | STILL-DEPENDS | — |
| D62 | packs reached through `www.loanfactory.com/api/*` (A-066, B-105) | STILL-DEPENDS | `vals:202,208`. |

### G12. P0 tasks that are not code items

| # | Item | Status | Evidence / note |
|---|---|---|---|
| D63 | Measure prod settings | **DATA-RESCUED** (done) | P0-SNAPSHOT.md; re-measured 31/10 (HANDOFF). |
| D64 | Export the 5 MOSO mail bodies | **DATA-RESCUED** (done) | `templates/`; ported in D41. |

## 3. NEW MOSO dependencies added after 21/10

| # | What | Commit / PR (date) | On prod? | Live in prod? | Evidence |
|---|---|---|---|---|---|
| N1 | **D303 identity write-back (8oafx)**. A recruiter's fix of first/last name, phone, NMLS or e-mail is written to MOSO via `/candidate/sync` (fields `first_name`, `last_name`, `phone`, `nmls`, `new_email`). Adds a **new endpoint kind `/candidate/emailAvailable`** (11th kind). | be #704 `33c0221f` (21/10, after baseline #702), #706 staging on; prod ON #703 `20bf683f` (29/10); FE #556 `216bb90e` | yes | **YES** (`vals:350-356`) | `BE:packswriteback/identity/IdentityField.java:20-24`, `BE:packswriteback/identity/MosoFieldSync.java:162`, `BE:recruitapi/RecruitApiClient.java:428-439` |
| N2 | **MOSO field bells.** `MOSO_FIELD_CHANGED` / rejection bells when MOSO replaces or refuses a field, with who changed it, grouped per change, plus platform-inbox sentences. | be #704, #767 `033e5a9c` (29/10), #770 `6ae73baf` (30/10), #774 `65b464f8` (30/10); FE #612 `79346375`, #626 `dd619f0e` | yes | **YES** | `BE:packswriteback/identity/MosoFieldNotices.java`, `BE:notification/model/NotificationKind.java:180-189` |
| N3 | **D310 owner follows the MOSO recruiter on every push** (S5/S6/S7 rows), plus admin backfill. Cold rows are exempt (D325). | be #716 `434e8696` (23/10), #732 | yes | no: flag `moso-owner-sync` absent in prod (`vals:246` comment); dry-run endpoint usable | `BE:moso/ownersync/MosoOwnerSync.java`, `application.yml:470` |
| N4 | **REFERRER role assigned from packs.** Sweeps `byOwner` and maps owners through `resolve` / `currentCompanyEmail`. | be #734 `89b6fc12` (23/10), prod ON #781 `9e20ef35` (31/10), #783 `3ac0b3f5`, #785 `1f841b45` (master) | yes | **YES** (`vals:142` `REFERRER_ROLE=true`; 480 assigned 31/10 per memory) | `BE:rbac/referrer/ReferrerRoleService.java:174,230` |
| N5 | **My referrals change e-mails** (digest) that read the owner's company e-mail from packs. | be #725 `2cbd42da` (23/10) | yes | no: `referrals-notify.app-base-url` / recipients not set in prod `vals` | `BE:referralview/notice/ReferralNoticeTickServiceImpl.java:312` |
| N6 | **Default referral link from packs `domain_url`** (new response field read off `/referrers/resolve`). | be #718 `3177a77a` (23/10) | yes | **YES** (My referrals v2) | `BE:referralview/service/DefaultReferralLinks.java:78`, `RecruitApiReferralOwnershipClient.java:67-72` |
| N7 | **D268/D269 program credit read from packs' `lo_recruiter_program_*` push fields** (packs #3739/#3740). | be #772 `03a162f1` (30/10); FE #616 `267f923a` | yes | dark per memory (flag OFF; not re-measured) | `BE:referral/program/PacksProgramMarker.java`, `BE:moso/MosoRowMapper.java:1610` |
| N8 | **Hand-off UX built on packs refusal codes** ("why the 1-1 did not reach MOSO", actor lacks RECRUITING, hire class ignored) | be #746 `1950e193`, #748 `cf0f55dc` (23–25/10); FE #580 `05c3f928`, #584 | yes | **YES** | `BE:offer/service/impl/MyInvitesActions.java:118,144,188`, `BE:onboarding/service/impl/OnboardingMeetingResendServiceImpl.java:103` |
| N9 | **Ops scripts reading MOSO Datastore directly**: the go-live closing script (align Recruit with MOSO) and the migration runner's Datastore mode | be #715 `7c9c0370` (23/10), #776 `d7416133` (31/10) | n/a (scripts) | used by people | `scripts/golive/golive_closing.py`, `scripts/golive/sources.py`, `scripts/moso-migration-runner.py:91` |
| N10 | **"Previous MOSO recruiter"** on Cold rows (archive data shown in the UI) | be #736 `c925dcb7`, #744 `590cc760`; FE #577 `0c22616e` | yes | **YES** | FE en `profile_previous_moso_recruiter` |
| N11 | **Recruit's own LO mails link to MOSO `/apply_loan_officer`** (deliberate, "TEMPORARY MOSO LINK" until P4) | be #730 / #741 | yes | dark (mail flags off) | `BE:template/lomail/MosoApplyLinks.java`, `LoanOfficerMailTokens.java:18,23` |

**Not counted as NEW** (not MOSO):
- MMI push (D305);
- HR offboarding (#723);
- central RBAC / auth-service (#728, #777);
- omni Team-chat note (#753);
- scheduled SMS through omni (#764).

## 4. Hard metrics: baseline (be `8c064b0d` / fe `0b353055`) vs now (origin/master)

| Metric | Baseline | Now | Delta | How measured |
|---|---|---|---|---|
| Distinct packs Recruit-API endpoint kinds | 10 | **11** | +1 (`/candidate/emailAvailable`) | `git grep -hoE '"/(candidate\|referrers\|referrals\|webinars)[A-Za-z/]*"' -- src/main` |
| `PacksWritebackKind` outbox kinds | 6 | 6 | 0 | enum values |
| Files using `RecruitApiClient` (outside `recruitapi/`) | 18 | **21** | +3 (MyInvitesActions, OnboardingMeetingResendServiceImpl, MosoFieldSync); 0 removed | `git grep -l RecruitApiClient` |
| `RecruitApiClient` method call lines | 15 | **18** | +3 | `git grep -E '(recruitApi\|recruitApiClient\|client\|apiClient\|packs)\.(invite\|sync\|…\|emailAvailable\|read)\('` |
| Referral packs client (`ReferralOwnershipClient`) reference lines | 17 | **29** | +12; 3 new caller classes; interface methods 3 → 4 (`domainUrl`) | `git grep -n ReferralOwnershipClient` |
| moso-aid client (`MosoAidRosterClient`) reference lines | 8 | 8 | 0 | `git grep -n MosoAidRosterClient` |
| Datastore client usages in recruit-be `src/main` | 0 | 0 | 0 | `com.google.cloud.datastore` |
| Datastore usages in recruit-be `scripts/` | 0 | **5 files** | +5 (golive script, migration runner, tests, README) | `git grep -li datastore -- scripts` |
| Java files in `moso/` / `packswriteback/` | 33 / 25 | **49 / 33** | +16 / +8 | `git ls-tree` |
| Java files in `src/main` mentioning moso or packs | 389 | **480** | +91 | `git grep -liE 'moso\|packs'` |
| recruit-fe user-visible "MOSO" in `src/messages/en` (word count / lines) | 135 / 113 | **139 / 119** | +4 / +6 (added: hire type ignored, not sent to MOSO, 2 refusal reasons, Previous MOSO recruiter, 2 welcome-blocked "no MOSO branch"; removed: 3 My referrals "MOSO/Accounting" lines) | `git grep -ow MOSO` |
| recruit-fe "MOSO" in all locales (en+vi) | 270 | **278** | +8 | same |
| recruit-fe "MOSO" in src outside messages, non-test (copy + comments) | 224 | **284** | +60 | same |
| recruit-fe ts/tsx files mentioning moso (non-test) | 89 | **110** | +21 | `git grep -li moso` |
| Feature flags gating MOSO paths (`application.yml`) | 9 | **18** | +9: identity-writeback(+email), moso-record-required, moso-owner-sync, lo-mail ×4, referrer-role | fixed list of 18 names |
| …of those flags that open a MOSO **call or write** in prod | 2 (moso-signed-reconcile default true; onboarding-reminders, which only reached packs in SEND mode) | **11** | +9 (packs-writeback, onboarding-writeback, v2-handoff, hire-classification, legal-name, identity-writeback, identity-writeback-email, webinar-signals, referrer-role) | prod `vals` + defaults |
| …of those flags that turn on a Recruit **replacement** in prod | 0 | 0 | 0 (moso-record-required still TRUE; lo-mail ×4 absent) | prod `vals` |

**Reading the metrics.** On every surface measure the codebase is more coupled to MOSO than on 21/10, and the prod-live coupling went from 2 to 11 flags. The replacements exist, but none has a prod flag flipped yet.

## 5. Progress calculation

### 5a. By item count

Each item counts equally. "Built" counts REPLACED-DARK as done. "Live" counts only what runs in prod. NEW items and ACTIVATED status are not subtracted here (§5c gives the coupling-adjusted view).

| Phase | Items | Built | Built % | Live | Live % |
|---|---|---|---|---|---|
| P0 rescue data | 6 (D08, D10, D57, D58, D63, D64) | 6 | **100%** | 6 | **100%** |
| P1 foundations | 5 (D20, D41, D47, D49, D50) | 4 | **80%** | 2 | **40%** |
| P2 own e-mails | 6 (D42–D45, D48, D51) | 4.75 | **79%** | 0 | **0%** |
| P3 lead intake + webinars | 11 (D01–D07, D29, D30, D52, D53) | 0 | **0%** | 0 | **0%** |
| P4 portal / fee / e-sign / onboarding writes | 18 (D17–D19, D22, D24, D26–D28, D31, D32, D34–D40, D46) | 0 | **0%** | 0 | **0%** |
| P5 LO data / programs | 10 (D09, D11–D16, D54–D56) | 1.0 | **10%** | 1.0 | **10%** |
| P6 cut | 8 (D21, D23, D25, D33, D59–D62) | 0 | **0%** | 0 | **0%** |
| **Overall (64)** | | 15.75 | **24.6%** | 9.0 | **14.1%** |
| **Overall excluding P0 (58)** | | 9.75 | **16.8%** | 3.0 | **5.2%** |

### 5b. By effort (S=1, M=2, L=3, M–L=2.5; sizes from HANDOFF §4; P0 sized by the actual work)

| Phase | Effort units (items) | Built | Live |
|---|---|---|---|
| P0 | 8: Cold L3, opt-outs M2, moso-aid S1, templates S1, referral/webinar history S1 | 8 (100%) | 8 (100%) |
| P1 | 5: (a) M2, (b) S1, (c) M2 | 4.67 (93%): (a) 2, (b) 0.67, (c) 2 | 0.67 (13%): logo + sender only |
| P2 | 6: reminders S1, webinar S1, nurture/Send info ON S1, invite+welcome M2, MOSO crons off S1 | 4.75 (79%) | 0 (0%) |
| P3 | 8: intake L3, forms dual-post M2, FB/Calendly S1, own webinars M2 | 0 | 0 |
| P4 | 9.5: portal L3, PayPal M2, e-sign M–L 2.5, HR the only "joined" path M2 | 0 | 0 |
| P5 | 8.5: loans S1, NMLS/licences M2, opt-outs S1, referral bonus M2, LO Recruiter Program M–L 2.5 | 1.0 (12%): loans 0.5, licences 0.5 | 1.0 (12%) |
| P6 | 3: ("a few days") | 0 | 0 |
| **Total 48** | | **18.4 (38%)** | **9.7 (20%)** |
| **Excluding P0 (40)** | | **10.4 (26%)** | **1.7 (4%)** |

### 5c. Coupling-adjusted view (informational)

The percentages above count only replacements. Since 21/10:
- 9 baseline items went from dormant to live in prod (ACTIVATED: D07, D18, D21, D24, D26, D27, D28, D31, D33);
- 11 NEW dependencies were added, 7 of them live (§3).

If NEW items join the denominator as STILL-DEPENDS (they must all be undone in P6), the overall item-count figures become:
- built 15.75 / 75 = **21%**;
- live 9 / 75 = **12%**.

### 5d. Bottom line

| | Item count | Effort-weighted |
|---|---|---|
| Built (dark counts) | **~25%** | **~38%** |
| Live in prod | **~14%** | **~20%** |
| Excluding P0, built | ~17% | ~26% |
| Excluding P0, live | **~5%** | **~4%** |

The lead's 23/10 estimate was "~20% overall".
- The built number has moved: P1 and P2 are code-complete.
- The live, real decoupling number has barely moved beyond P0 and the logo.
- Until the lo-mail flags, `moso-record-required` and the D48 packs cron switch-off go live, every prod Loan Officer mail is still sent by MOSO, now with more write-back traffic than before.

## 6. Not re-measured here (needs gcloud / DB)

- Prod DB settings:
  - `program_sync.mode` (DRY_RUN on 23/10);
  - `referrals.enabled`;
  - `packs.writeback.experience_enabled`;
  - `headhunter.auto_own_enabled`;
  - the D268 snapshot flag.
- Whether `recruit-svc-secret` adds any `RECRUIT_FEATURES_*` beyond the values file. On 21/10 it did not.
- packs outbox volume in prod since 29/10. It was 0 rows on 29/10, before the flags went on.
- The moso-aid repo was not re-read; the recruit side is unchanged.
