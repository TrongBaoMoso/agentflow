# Recruit app (recruit-be) — QA ground truth for STAGING, 2026-10-06

Source of truth: `recruit-be` `origin/master` = **8b958c02** (what staging runs). 88 commits landed since
2026-09-29 12:00 (`git log --oneline --since=2026-09-29T12:00 origin/master`). Every path below is relative
to `src/main/java/com/loanfactory/recruit/` unless it starts with `helm-chart/`, `docs/` or `src/main/resources/`.

How to read this file:
- **Env flag** = a Spring property set from helm env (`helm-chart/config/staging/values.yaml`, defaults in
  `src/main/resources/application.yml`). Changing it needs a deploy.
- **DB setting** = a row in `recruit_settings`, editable at runtime by ADMIN via `PUT /api/v1/admin/settings/{key}`
  (cached 30 s per pod, D166). The values below are the **seeded** values from Flyway migrations. Somebody may have
  edited them on staging since: **runtime values on staging are UNCONFIRMED** (read them with
  `GET /api/v1/admin/settings` as an ADMIN before a test run).
- **UNCONFIRMED** = I could not prove it from code/config.

---

## 1. Feature flags and settings actually ON on staging

### 1.1 Env flags (deploy-time)

| Flag (property / env) | Default (application.yml) | STAGING | PRODUCTION | What it switches |
|---|---|---|---|---|
| `recruit.rbac.enforce` / `RECRUIT_RBAC_ENFORCE` | false | **true** | true | Permission checks really deny (403). With false, `require()` only logs "would deny". |
| `recruit.features.packs-writeback` / `RECRUIT_FEATURES_PACKS_WRITEBACK` | false | **true** | off | Recruit → MOSO writebacks (profile edits, INVITE, webinar registration, ONBOARDING_MEETING …) via MOSO Recruit API `https://www.viet18.com/api/recruit/v1`. Invites only reach the LO through this. |
| `recruit.features.onboarding-writeback` | false | **true** | off | Onboarding specialist auto-pick (round robin) at offer SENT + "1-1 Done" written back to MOSO (`onboardingMeeting`). Needs packs-writeback too. |
| `recruit.features.onboarding-v2-handoff` | false | **true (since 06/10, #561)** | off | **Option C hand-off (D207)**: an invite for a candidate with a recruit onboarding specialist sends **no invite e-mail**; it is "handed to the specialist". Effective only when packs-writeback AND onboarding-writeback AND this flag are on (`packswriteback/PacksWritebackEnqueuer.java:215`). See §3.6. |
| `recruit.features.onboarding-hire-classification` | false | **true** | off | W-2/1099 (`is_corporate_loan_officer`) capture required at 1-1 Done. |
| `recruit.features.onboarding-legal-name` | false | **true** | off | A CONFIRMED legal name rides on `onboardingMeeting` (holds nothing since D158). |
| `recruit.features.agreement-send` | false | **true** | off | "Send e-sign agreement from Recruit" (`POST /candidates/{id}/agreement/send`). |
| `recruit.agreement-send.recipient-policy` | ALLOWLIST | ALLOWLIST (default) | **ANY** | Who the agreement may be sent to. |
| `recruit.agreement-send.allowed-emails` | "" | `bao.trinh+onb-welcome1@loanfactory.com, bao.trinh+onb-welcome2@loanfactory.com, bao.trinh+agree1@loanfactory.com, bao.trinh+agree2@loanfactory.com, bao.trinh+agree3@loanfactory.com` | n/a | **Exact addresses**. A test LO whose e-mail is not on this list cannot receive the agreement on staging. |
| `recruit.features.onboarding-reminders` | false | **true** | off | Reminder e-mails to the LO before the 1-1 (T-2d/T-1d/T-2h). 3 more gates: DB `onboarding.reminder.delivery_mode` (seed DRY_RUN), `onboarding.reminder.allowed_emails` (seed []), tick key in the secret. Seeds say nothing is mailed, BUT V212's header says Bao received a real T-2h e-mail on staging (PR #526), so on staging those gates were opened at least once: **actual state UNCONFIRMED** (see §3.8). |
| `recruit.features.google-connect` | false | **true (05/10)** | off | "Connect Google" for any recruit user (`/api/v1/me/google/*`). Off/misconfigured → all 4 routes 404. |
| `recruit.features.google-calendar-events` | false | **true (05/10)** | off | The onboarding 1-1 (and since D213 the recruiter's "Meet 1-1" next step) gets a real Google Calendar event + Meet link created AS the connected scheduler. |
| `recruit.calendar.guest-policy` | ALLOWLIST | ALLOWLIST | **ANY** | Whether the **LO** is put on the Google event as a guest. |
| `recruit.calendar.guest-allowlist` | "" | **`bao.trinh+a3009f@loanfactory.com`** (only this one) | n/a | Only an LO with exactly this address is invited to the event on staging. Any other LO: event created with no LO guest, `sendUpdates=none`. |
| `recruit.calendar.internal-domains` | `loanfactory.com` | `loanfactory.com,viet18.com` | default (loanfactory.com) | Which staff e-mail domains may be added as **colleagues** on the 1-1 event (D211). Colleagues BYPASS the guest allowlist → real staff get real invites on staging. |
| `recruit.features.meet-attendance` | false | **OFF** (not in values) | off | Meet attendance read after the 1-1 (D212). Off ⇒ `GET /me/google/connect-url?grant=meet` → 404 `GRANT_NOT_AVAILABLE`. |
| `recruit.platform-inbox.enabled` / `RECRUIT_PLATFORM_INBOX_ENABLED` | false | **OFF** (not in values) | off | Copy of the recruit bell to the platform inbox (D188). Only the in-app recruit bell works on staging. (Could only be on via `recruit-svc-secret` envFrom — UNCONFIRMED, very unlikely.) |
| `recruit.omni.follower-role-enabled` | false | **true** | off | Candidate followers on the omni cast (role FOLLOWER), follower rows writable, @mention notes add followers (D191). |
| `recruit.features.hr-handoff-publish` | false | **true** | off | "Send to HR" / RECRUIT_HIRED publish to ai-hr-be (`http://ai-hr-backend.hr-dev...:8312`). |
| `recruit.hr-onboard.subscription` | "" | `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_STAGING` | not set | HR → recruit return path (`associate.onboarded` writes `candidates.account_id`). See §3.11. |
| `recruit.followup.*` (followup-be bridge) | off | **on** (`followup-be.follow-up-stag`) | **off** | Follow-ups / reminders / next_follow_up_at. Production has NONE of this (next_follow_up_at NULL on prod). |
| `recruit.features.native-candidate-create` | false | **OFF** | off | `POST /api/v1/candidates` → **403** for everyone incl. ADMIN (D165): every LO enters from MOSO. |
| `recruit.features.user-service-sync` | false | OFF | off | — |
| `recruit.recruit-api.fallback-actor-email` | "" | `manhadmin@viet18.com` | "" | When the acting recruiter has no e-mail on their grant, MOSO sends the invite AS this staging admin. Production: no fallback ⇒ approve 400s if the requester has no e-mail. |
| `recruit.recruit-api.referrals-system-actor-email` | "" | `manhadmin@viet18.com` | "" | Admin Referrals view asks packs as this user. |
| `recruit.google-connect.allowed-domain` | `loanfactory.com` (hard-coded in yml) | same | same | See §1.3 and §3.7 for what a @viet18.com account gets. |

Internal cron ticks (cron-service → `POST /api/v1/<x>/internal/tick`, header `x-service-key`) only exist when their key
is present in the k8s secret `recruit-svc-secret`. I cannot read the secret. Per values comments:
`PACKS_WRITEBACK_INTERNAL_API_KEY` present since 23/09 (relay runs); `RECRUIT_ONBOARDING_REMINDER_INTERNAL_API_KEY`
**absent as of 02/10** (no reminder tick runs); others (hot-idle-release, platform-inbox, meet-attendance,
program-sync, hr-handoff, omni alias/cast repush) **UNCONFIRMED**.

### 1.2 DB settings (runtime, seeded values — confirm on staging with GET /admin/settings)

Dark switches (all seeded OFF unless noted):

| Key | Seed | Meaning |
|---|---|---|
| `hot.idle_release_enabled` | **false** (V102) | Auto-release of a hot lead claimed and not contacted within `hot.idle_release_business_hours` = **4** business hours. OFF ⇒ nothing is auto-released (the warning/SLA facts still show, see §2.6). |
| `headhunter.auto_own_enabled` | **false** (V202) | A lead from an LO Recruiter Program member's own page is owned by them on arrival (D196/D197). |
| `program_sync.mode` | **"OFF"** (V208) | LO Recruiter Program roster sync from moso-aid (OFF / DRY_RUN / live). |
| `program_invite.require_verified_loans` | **false** (V207 flipped V206's true) | Guard 1 off: program (Headhunter) invites follow plain D64. |
| `referrals.enabled` | **false** (V174) | My referrals / admin Referrals → **404 "Referrals are not enabled"**. |
| `sequence.auto_send_enabled` | false (V052) | Auto-sequences. |
| `licensing.sponsorship_gate_enabled` | false (V068) | S6→S7 licensing gate (`sponsorship_gate_mode` AT_LEAST_ONE). |
| `onboarding.completion_requires_mandatory` | **true** (V068) | S7 requires all **mandatory** checklist items DONE/NA (no template is mandatory by seed). |
| `onboarding.reminder.delivery_mode` | **"DRY_RUN"** (V204) | Reminder e-mails are rendered and stored, never sent. |
| `onboarding.reminder.allowed_emails` | **[]** (V204) | ALLOWLIST policy ⇒ permits nobody. |
| `source_detail.enabled` | true (V161) | `source_detail` (referrer name/email/phone, webinar date, event) on candidate reads. |
| `offer.approval_mode` | `"RULE_BASED"` (V083) | D64 auto-approve rule on. Alternatives `RECRUITER_DECIDES`, `ALWAYS_REVIEW` ⇒ every invite waits for a manager. |

Numbers (seeds):

| Key | Seed | Used for |
|---|---|---|
| `business_hours` | `{"start":"08:00","end":"18:00","timezone":"America/Los_Angeles","days":[1,2,3,4,5]}` + US federal `holiday_rules` (V061/V108/V113) | THE business clock (D199): SLA, Today's "today", follow-up times, My-invites date filters. **Mon 2026-10-12 (Columbus Day) is a holiday.** |
| `sla.first_touch_hours` | 24 | Default first-touch SLA (hours) |
| `sla.first_touch_hours_by_source` | `{"WEB_FORM":1,"FB_ADS":1,"REFERRAL":4,"WEBINAR":24,"EVENT_RSVP":24}` | Per-source first-touch SLA (business hours) |
| `sla.after_hours_first_touch_hours` | 4 | Lead arriving outside business hours |
| `sla.no_claim_escalate_minutes` | 5 | |
| `hot.sources` | `["WEB_FORM","WEBINAR","EVENT_RSVP","REFERRAL","FB_ADS"]` | What counts as a HOT lead |
| `hot.hand_raise_window_days` / `hot.hand_raise_stages` | 3 / `["S0".."S5"]` | Re-raise window |
| `hot.due_soon_floor_minutes` / `hot.due_soon_budget_percent` | 120 / 25 | Amber "due soon" (D170) |
| `hot.idle_release_business_hours` / `_warn_business_hours` / `_grace_minutes` | 4 / 1 / 10 | Idle release (OFF) |
| `hot.manager_remind_cooldown_minutes` / `hot.manager_remind_pin_hours` | 60 / 72 | Manager Remind |
| `offer.auto_approve.loans_since_min` | **5** | D64: auto if `loans_since_anchor >= 5` … |
| `offer.auto_approve.loans_12mo_min` | **2** | … AND `units_12mo >= 2` (both must be present) |
| `modex.loans_since_year` / `_mode` | 2022 / FIXED_YEAR | "loans since 2022" |
| `offer.approval_sla_hours` | 24 | `sla_breached` on a PENDING_APPROVAL invite |
| `offer.invite_resend_after_days` | 3 | `resend_eligible` on the invite card |
| `offer.waive_requires_approval` | true | documentation only — a waive ask ALWAYS forces review |
| `invite.onboarding_1on1_late_days` | 3 | My invites "1-1 late" |
| `invite.ready_to_join_escalate_days` | 2 | Exceptions "ready to join, invite not sent" |
| `followup.default_due_days` | 1 | |
| `followup.no_answer_retry_days` | `[3,5,10,30]` (V074) | No-answer retry ladder (then exhausted) |
| `followup.nurture_default_days` | 14 | NEUTRAL with no date wakes in 14 days |
| `today.queue_cap` / `today.batch_claim_size` | 200 / 10 | |
| `today.handed_to_me_business_days` | 3 | |
| `today.s5_partial_resurface_days` / `today.s5_stalled_days` | 2 / 7 | S5 waiting-on-LO resurfaces on Today |
| `onboarding.meeting.default_minutes` | 30 | 1-1 length default |
| `onboarding.meeting_due_notice_minutes` | 60 | ONBOARDING_MEETING_DUE bell |
| `calendar.meet_one_on_one_minutes` | 30 | Recruiter Meet 1-1 event length when none chosen |
| `onboarding.reminder.email_offsets_minutes` | `[2880,1440,120]` | T-2d, T-1d, T-2h |
| `agreement.link_again_after_minutes` / `agreement.poll_seconds` | 10 / 5 | |
| `notifications.poll_seconds` / `page_size` / `retention_days` | 60 / 30 / 30 | Bell |
| `headhunter.qualified_loans_12mo_min` / `prior_source_grace_hours` | 12 / 24 | Program invite review reasons |
| `headhunter.auto_own_member_daily_cap` | 50 | |
| `followers.cast_eligible_roles` | ADMIN, MANAGER, RECRUITER, ONBOARDING, ACCOUNTING (per D191) | |
| `followers.mention_max_per_hour` / `_global` / `mention_bell_collapse_minutes` | 20 / 100 / 30 | |
| `labels.max_per_candidate` / `name_max_length` | 10 / 40 | |
| `capacity.max_open_candidates` | 50 | |

### 1.3 Allowlists a tester MUST respect on staging

| What | Exact addresses | Effect if you use another address |
|---|---|---|
| Agreement send (`POST /candidates/{id}/agreement/send`) | `bao.trinh+onb-welcome1@`, `+onb-welcome2@`, `+agree1@`, `+agree2@`, `+agree3@` (all `@loanfactory.com`) | Refused (recipient policy fails closed). |
| LO as guest on the Google 1-1 event | `bao.trinh+a3009f@loanfactory.com` | Event still created as the specialist, **without** the LO, no e-mail. |
| Onboarding reminder e-mails | seed: none (`[]`) + DRY_RUN; live staging values UNCONFIRMED (Bao got a real one, see V212) | Refused by guard `RECIPIENT_NOT_ALLOWED` (logged only, no ledger row). |
| Colleagues on the 1-1 event | any recruit user whose grant e-mail is on `loanfactory.com` or `viet18.com`, holding a non-program role | Real invitation e-mails to staff. |
| Invite e-mail itself (MOSO `interested_loan_officer_invitation_email`) | **NO allowlist in recruit** | Goes to the real LO address in staging MOSO (staging holds ~7.2k real viet18-ingested LOs). With the hand-off ON and a specialist assigned, no invite e-mail is sent at all. Use only `bao.trinh+tag` test LOs. |

Mail sender identity: MOSO sends the invite AS the requesting recruiter (grant e-mail); if their grant has no e-mail,
as `manhadmin@viet18.com` (staging fallback).

---

## 2. Candidate lifecycle

### 2.1 Enums
- `CandidateStage`: `S0 S1 S2 S3 S4 S5 S6 S7` (`candidate/model/CandidateStage.java`). Meaning, from code and docs:
  S0 = untouched/pool, S1 = owned (claim/transfer), S2 = contacted (MOSO `in_progress`/`message_sent`),
  S3 = in dialogue (`dialogue`/`interested_but_thinking`), S4 = meeting scheduled (no code writes it automatically;
  manual only; meaning from docs/BRIEF-VICTORIA, UNCONFIRMED), S5 = invited (offer SENT), S6 = joined
  (signed + fee PAID/WAIVED), S7 = 100% onboarded.
- `CandidateStatus`: `ACTIVE, NURTURE, DORMANT, ARCHIVED, BLOCKED` (`BLOCKED` reserved, nothing writes it).
  - NURTURE: parked by a NEUTRAL call outcome; comes back to Today by itself when `nurture_until <= today`.
  - DORMANT: only written by the MOSO import (ILO `hiatus`/`no_response`); never comes back alone; `POST /candidates/{id}/revive`.
  - ARCHIVED: an outcome (NOT_INTERESTED call, bulk archive, MOSO archived/denied). Free-text `archive_reason`
    (blank becomes `"(no reason given)"`). No unarchive endpoint (re-sourcing comes from MOSO).
- `CandidateSource`: `MODEX, IMPORT, MANUAL, WEB_FORM, WEBINAR, EVENT_RSVP, REFERRAL, FB_ADS, OTHER`.
- `OwnerChangeReason`: `CLAIM, AUTO_CLAIM, TRANSFER, IMPORT, CREATE, MERGE, RELEASE, IDLE_RELEASE, ORIGIN_OWN, PROGRAM_RELEASE`.
- `OfferStatus`: `DRAFT, PENDING_APPROVAL, APPROVED, SENT, SIGNED, DECLINED, EXPIRED` (nothing ever sets EXPIRED).
  `FeeStatus`: `PENDING, PAID, WAIVED`. `AgreementStatus`: `NOT_SENT, SENT, SIGNED`.
- My-invites `InviteStage`: `WAITING_APPROVAL` (PENDING_APPROVAL), `INVITED_1ON1_PENDING` (APPROVED, or SENT and 1-1 not done),
  `PAYING_SIGNING` (SENT and 1-1 done), `SIGNED, DECLINED, EXPIRED`.

### 2.2 Where candidates come from
- **Only from MOSO** (D165): `POST /api/v1/candidates` → 403 `"New Loan Officers come in from the Loan Factory website sign-up only. Ask them to sign up there."`
  (flag `native-candidate-create` off; ADMIN refused too). A scoped (Headhunter) user gets 403
  `"Your role cannot create candidates; new loan officers come in from the sign-up page"`.
- MOSO webhook `POST /public/v1/webhook/moso/listener` (key-protected). MOSO status → stage (`moso/MosoRowMapper.java:673-795`):
  RLO `in_progress|message_sent`→S2, `dialogue|interested_but_thinking`→S3, `invited_to_join|want_to_join`→S5, else S0;
  `claimed_profile` → at least S1 + owner; ILO `joined`→S7 (SIGNED offer), `interviewed_and_accepted`/HR or NMLS running→S6,
  `paid_and_signed`→S6, signed or paid/waived→S5, `hiatus|no_response`→S5 DORMANT, `denied_by_LO`→S5 ARCHIVED (+STOP suppression),
  `interviewed_and_rejected`→S5 ARCHIVED, otherwise S5 with an offer SENT.

### 2.3 Every automatic transition
| Trigger | Move | Code |
|---|---|---|
| Claim / batch claim | S0→S1 (stage reason `CLAIM`) | `CandidateServiceImpl.java:349` |
| Transfer (hand-off/reassign) | S0→S1 (`TRANSFER`); release-to-pool: no stage move | `:558` |
| Headhunter auto-own (switch OFF) | S0→S1 (`ORIGIN_OWN`, actor SYSTEM) | `:402` |
| Offer reaches **SENT** (AUTO approve, manager approve, send) | → **S5** if below (`INVITE_SENT`), credited to the requesting recruiter | `OfferServiceImpl.java:612`, `CandidateServiceImpl.java:1065-1074` |
| Offer **SIGNED** and fee **PAID or WAIVED** (any order) | → S5 then **S6** (`SIGNED_AND_SETTLED`) | same; triggered by `/signed`, `/fee-paid`, `/waive-fee`, MOSO push |
| Claim / transfer of an already-joined LO, revive of DORMANT, every MOSO push on a worked row | re-evaluates the two rules above | D167/D173, `#491`, `#501` |
| NEUTRAL call outcome | status → NURTURE (`nurture_until` = given date or today + 14, moved to a business day) | `FollowUpServiceImpl.java:644-677` |
| NOT_INTERESTED call outcome | status → ARCHIVED | `:882-900` |
| INTERESTED call outcome | status → ACTIVE | `:452/:524` |
| NO_ANSWER | status unchanged; streak+1; retry follow-up at +3, +5, +10, +30 days; 5th call: `"Call outcome NO_ANSWER -> retry ladder exhausted after N attempts, no further automatic retry"`, `no_answer_retry_exhausted=true` | `:710-810` |
| Hot idle release | owner removed (`IDLE_RELEASE`), **switch OFF** | §2.6 |
| HR `associate.onboarded` | writes `account_id` only, **no stage move** | §3.11 |

Rules of the auto-advance (S5/S6):
- Only for ACTIVE, not merged candidates below S6; nothing above S6 is automatic. **There is no automatic S7.**
- Runs after commit, in its own transaction; a failure never rolls back the offer action (logged WARN).
- **A person's downgrade sticks** (D173): if the latest HUMAN move crossing S5 (or S6) went DOWN, the auto step is vetoed until a
  newer offer event (SENT/SIGNED/IMPORTED). Missing stage requirements also hold it.
- Why a joined LO is not moving: `GET /candidates/{id}/auto-stage-hold` → `{held:false}` or
  `{held:true, reason: MANUAL_DOWNGRADE | MISSING_REQUIREMENTS | REQUIREMENTS_MISCONFIGURED, current_stage, target_stage, …}`.
- Admin backfill: `POST /admin/candidates/auto-stage/backfill` (IMPORT_RUN = ADMIN).

### 2.4 Manual stage move `POST /candidates/{id}/transition` `{to_stage, reason, override}`
- Permission `CANDIDATE_TRANSITION`; `override=true` also needs `CANDIDATE_OVERRIDE_GATE` (ONBOARDING only, + ADMIN) and a reason
  (`"reason is required when override is true"`).
- Any stage to any stage (also backwards). Same stage → 400 `"Candidate is already in stage S5"`.
- Requirements → 400 `"Transition to S6 requires missing fields: [...]"` (items `<field>`, `sponsorship:<STATE>`, `checklist:<CODE>`).
  Seeded `stage_requirements` for S6 (`nmls_id`, `sponsor_states`) are **inactive** (V041 `active=FALSE`). S7 extra gates:
  `onboarding.completion_requires_mandatory=true` (mandatory checklist items DONE/NA; no seeded template is mandatory) and
  `licensing.sponsorship_gate_enabled=false`.
- **Joined gate (override cannot skip)**: → S6 without a SIGNED offer with fee PAID/WAIVED → 400 `"Joined gate: S6 requires a SIGNED offer with the fee PAID or WAIVED"`.
- Entering S6 (any path) generates the ON_ENTER_S6 checklist (HR_BGC, HR_ONBOARDING, HR_DOCS, HR_COMPLETE, ONB_ACCOUNT,
  ONB_TRAINING, ONB_SETUP_CALL, ACCT_*, IT_*, LIC_* per sponsor state; all `mandatory=false`) and rings `ONBOARDING_CANDIDATE_JOINED`
  to the specialist. `ONB_PREMEETING` is generated earlier, at offer SENT (V118).

### 2.5 Timers / SLA (all business-time on `business_hours`, America/Los_Angeles, Mon–Fri 08:00–18:00, federal holidays)
| Timer | Value | Where it shows |
|---|---|---|
| First touch of a HOT lead | per source: WEB_FORM 1h, FB_ADS 1h, REFERRAL 4h, WEBINAR 24h, EVENT_RSVP 24h; other sources 24h; arrival outside business hours: 4h (replaces the source figure) | `GET /inbox/hot` items: `sla_due_at`, `anchor_at` (= last hand-raise, else sourced_at, else created), `first_touch_basis` SOURCE/DEFAULT/AFTER_HOURS, `due_soon_at` = deadline − max(120 min, 25% of budget) |
| Unclaimed escalate | `sla.no_claim_escalate_minutes` 5 | only passed to the FE as `escalate_after_minutes` (no BE action) |
| Claimed but not contacted | 4 business hours from CLAIM/TRANSFER/ORIGIN_OWN; warning 1 business hour before; release +10 min grace | `contact_due_at`/`contact_warn_at` on Today and the manager's claimed-idle list (always); `HOT_CLAIM_WARN` bell (always); actual auto-release only if `hot.idle_release_enabled` (OFF) and tick key present |
| Invite awaiting approval | `offer.approval_sla_hours` 24 (wall clock) | `sla_breached` on invite-status and pending-approval queue |
| Invite resend offered | `offer.invite_resend_after_days` 3 | `resend_eligible` (never for a hand-off) |
| "Save & invite" not sent | `invite.ready_to_join_escalate_days` 2 | manager Exceptions list `GET /exceptions/ready-to-join` |
| 1-1 late | `invite.onboarding_1on1_late_days` 3 | My invites |
| S5 waiting on LO hidden from Today | resurfaces PARTIAL after 2 days (only after the 1-1 is reached), STALLED after 7 days | Today |
| Hand-offs to me | 3 business days | `GET /today/handed-to-me` |
| 1-1 due bell | 60 min before the 1-1 | `ONBOARDING_MEETING_DUE` |
| Manager remind cooldown / pin | 60 min / 72 h | |

There is **no "offer review deadline"** that expires anything: EXPIRED is never written; only `sla_breached` flags.
**Hot idle release is OFF** on seed: claimed leads are never auto-returned to the pool.

### 2.6 HOT vs COLD
- HOT queue (`GET /inbox/hot`): unowned, not merged/blacklisted/DORMANT, and either (stock) ACTIVE + S0 + source in `hot.sources`,
  or (hand-raise) raised within 3 days and stage S0–S5. Cap 200. COLD = `GET /inbox/cold` (everything else unowned, paged 50/200).
- Staging data warning (agentflow-q0k9, measured 09/09): ~5.274 of 5.277 unowned S0 rows are `source=IMPORT`, so HOT/Exceptions
  are nearly empty unless you create test leads through the MOSO sign-up.

---

## 3. Offer / invite flow (as of 8b958c02)

### 3.1 Request (invite) `POST /api/v1/candidates/{candidateId}/offers`
Body `RequestOfferRequest`: `comp_band_id`, `comp_details`, `waive_fee` (bool), `waive_reason`.
Order of checks (`OfferController.java:51-58`, `OfferServiceImpl.java:121-247`):
1. `OFFER_REQUEST` (RECRUITER, MANAGER, LO_SUPPORT, OFFICER_RECRUITER, HEADHUNTER, TEAM_LEAD, ADMIN).
2. **Owner or manager only (D209, ttxvi, #559)**: actor == `candidates.owner_id` OR holds `OFFER_APPROVE`; else
   403 `"Only the lead's owner or a manager can invite this candidate"`. An **unowned** lead can be invited only by a manager.
   `GET /candidates/{id}/invite-status` exposes this as `can_request_offer` for the viewer.
3. ARCHIVED or DORMANT → 400 `"Cannot request an offer for an ARCHIVED candidate"` (/`DORMANT`).
4. Not linked to MOSO → 400 `"<Name> can't be invited yet because they haven't signed up on the Loan Factory website. Ask them to sign up, then send the invite again."`
5. Open offer exists (PENDING_APPROVAL/APPROVED/SENT…) → 400 `"Candidate already has an open offer — decline it before requesting another"`.
6. D64 decision (`OfferApprovalRuleImpl`): **AUTO** iff `offer.approval_mode = RULE_BASED` AND `loans_since_anchor` present and `>= 5`
   AND `units_12mo` present and `>= 2` AND no waive requested. Otherwise REVIEW with reasons
   `MODE_NOT_RULE_BASED, LOANS_SINCE_MISSING, UNITS_12MO_MISSING, LOANS_SINCE_BELOW, UNITS_12MO_BELOW, WAIVE_REQUESTED`.
   - AUTO: ledger REQUESTED → APPROVED (actor SYSTEM, reason "Auto-approved by OfferApprovalRule …") → SENT, in one transaction. No approver bell.
   - REVIEW: stays `PENDING_APPROVAL`; every `OFFER_APPROVE` holder except the requester gets `OFFER_APPROVAL_REQUESTED`.
   - Program (Headhunter) invite: same D64 (Guard 1 off); a frozen review (reasons `HEADHUNTER_INVITE, PROGRAM_COLLECTED_LEAD, LOANS_UNVERIFIED, BELOW_QUALIFIED_BAR, CREDIT_CONFLICT_PRIOR_SOURCE, CREDIT_CONFLICT_FIRST_CONTACT`) is stored on the REQUESTED row.
7. A waive **ask** never sets WAIVED: `fee_status` stays PENDING, `requested_waive_fee=true`, review forced.
8. Clears the "ready to join — invite not sent" strip (`pending_invite_at`).

"Save & invite" from the call result: `POST /candidates/{id}/call-outcome` with `attitude=INTERESTED`, `send_invite=true`, no
`next_step_kind` → only arms the strip (`pending_invites` on Today); the actual invite is still the offers POST.

### 3.2 SENT (any path) does, in order (`OfferServiceImpl#transitionToSent`)
1. MOSO link re-check (same 400). 2. Suppression gate on EMAIL → 400 naming the rule (BLACKLIST / STOP_SMS). 3. Offer SENT, agreement SENT.
4. Onboarding specialist **auto-pick** if none (round robin = least open ONB_PREMEETING items among `rbac_grants` with role ONBOARDING
   and an e-mail) → bell `ONBOARDING_ASSIGNED` to the specialist; if one already existed and the hand-off flag is on → the same bell
   with `handoff:true` (per offer). 5. `ONB_PREMEETING` checklist item created, assigned to the specialist.
6. INVITE writeback row to MOSO (`send_invite` true = invitation e-mail, or false = hand-off, decided at delivery). 7. Auto-stage → S5.

### 3.3 Approve / decline / waive / mark paid / signed
| Action | Endpoint | Who | Rules / messages |
|---|---|---|---|
| Approval queue | `GET /offers/pending-approval?limit=` | `OFFER_APPROVE` | oldest first, cap 200; each row has `sla_breached`, `rule` (D64 explanation), `approvable_by_me`, `approval_refusal` |
| Approve (= approve AND send, D124) | `POST /offers/{id}/approve` body `{keep_fee?}` | `OFFER_APPROVE` (MANAGER, ADMIN) | must be PENDING_APPROVAL else 400 `"Cannot approve an offer in status X (needs PENDING_APPROVAL)"`; candidate ARCHIVED/DORMANT → 400 `"Cannot approve an offer for an ARCHIVED candidate"`; waive asked + no `keep_fee` → fee WAIVED by the approver; `keep_fee=true` → fee stays PENDING (ledger FEE_WAIVE_DECLINED). Mail actor = the REQUESTING recruiter; if neither their grant e-mail nor the fallback exists → 400 `"Cannot approve: no resolvable e-mail on file for the requesting recruiter …"`. Requester gets `OFFER_APPROVED` (manual approvals only). |
| Program-invite refusals (403) | approve / waive-fee / fee-paid | | `SCOPED_ROLE` "Your role cannot approve, waive or mark paid an invite"; `SELF_REQUEST` "A program invite cannot be approved, waived or marked paid by the program member who requested it"; `COLLECTED_BY_YOU` "You collected this lead, so you cannot approve its invite, waive its fee or mark it paid"; `UNLINKED_PROGRAM_ACCOUNT` "Link your program account first: without it recruit cannot tell whether you collected this lead". Identity changed since request → 409 `"The loan officer's NMLS or e-mail changed since the request; ask for a new invite"` |
| Decline (D210, #562) | `POST /offers/{id}/decline?reason=` | `OFFER_REQUEST` **and** (offer requester OR candidate owner OR `OFFER_APPROVE`) | else 403 `"Only the requester, the lead's owner or a manager can decline this invite"`; status must be PENDING_APPROVAL/APPROVED/SENT else 400 `"Cannot decline an offer in status X"`; from PENDING_APPROVAL a reason is required: 400 `"A reason is required to decline an offer awaiting approval"`. Requester gets `OFFER_DECLINED` with the reason. |
| Send (legacy APPROVED offers) | `POST /offers/{id}/send` | `OFFER_APPROVE` | needs APPROVED |
| Mark signed | `POST /offers/{id}/signed` | `OFFER_APPROVE` | needs SENT; owner gets `AGREEMENT_SIGNED`; auto-stage |
| Mark fee paid | `POST /offers/{id}/fee-paid` | `OFFER_APPROVE` | fee must be PENDING else 400 `"Fee is already PAID"`; owner gets `FEE_PAID`; auto-stage |
| Waive fee | `POST /offers/{id}/waive-fee` | `OFFER_APPROVE` | fee must be PENDING; auto-stage (WAIVED counts as paid) |

Normally signed/paid arrive from MOSO pushes (LO signs/pays on the website); the buttons are manual stubs.

### 3.4 Resend invite `POST /offers/{id}/resend-invite` body `{confirm_may_duplicate?}`
- Who: offer requester (REQUESTED ledger actor) or `OFFER_APPROVE`; else 403 `"Only the person who requested this offer, or a manager who can approve offers, can resend its invite."`
- 409s: `"This offer is X, so its invite can't be sent again."`; `"Sending invites through MOSO is switched off, so there is nothing to resend."`;
  `"The invite is already being sent. It can take a few minutes."`; **hand-off**: `"This invite was handed to the onboarding specialist. No email goes out at this step, so there is nothing to resend."`;
  `"There is nothing to resend: the invite did not fail, or it can't be fixed by sending it again."`; 409 code `INVITE_MAY_HAVE_BEEN_EMAILED` `"An earlier attempt of this invite may already have emailed <Name>. Resending can send it twice."` (repeat with `confirm_may_duplicate=true`).
- 400s: `"<Name> has no MOSO record, so there is nobody to send the invite from."`, `"<Name> has no email address. Add one, then resend."`, `"Your account has no email on file, so MOSO can't send the invitation as you. Ask an admin to add one."`
- The card shows `invite_delivery {problem: NOT_QUEUED|NOT_DELIVERED|SKIPPED|UNCONFIRMED|HANDOFF_NO_SPECIALIST…, cause, email_reason, may_have_been_emailed, sending, can_resend}` with fixed sentences, e.g.
  `"The invite is saved in MOSO, but MOSO did not send the email to <Name>. … Use Resend invite on the candidate."`,
  `"The invite did not reach MOSO, so <Name> has not been emailed. Use Resend invite on the candidate."`,
  `"The hand-off of <Name> did not reach MOSO. No email goes out at this step; MOSO does not know about the invite yet. Use Resend invite on the candidate."`

### 3.5 My invites (recruiter) — `GET /offers/mine?stage=&from=&to=&q=&currentPage=&pageSize=` (`OFFER_REQUEST`)
Only offers whose REQUESTED actor is the caller. Reminds (requester only, else 403 `"Only the recruiter who requested this invite can do that"`):
- `POST /offers/{id}/remind-approver` (PENDING_APPROVAL only, else 400 `"Only an invite waiting for approval can be reminded about; this one is X"`) → `APPROVAL_REMIND` to all approvers.
- `POST /offers/{id}/remind-onboarding` (stage INVITED_1ON1_PENDING only; no specialist → 400 `"No onboarding specialist is assigned to this invite yet"`) → `ONBOARDING_REMIND`.
- Cooldown 60 min → 409 `COOLDOWN` `"You reminded about this invite recently — try again later"`.
- FE label: `GET /config/candidate-view` returns `onboarding_v2_handoff` (effective value, **true on staging**) → FE shows "My hand-offs" instead of "My invites".

### 3.6 Onboarding v2 hand-off (ON on staging since 06/10) — what each side gets
Condition: flag chain on (yes on staging) AND the candidate has a recruit `onboarding_specialist_id` at **delivery** time.
- **LO receives**: **no invitation e-mail** at SENT (MOSO called with `send_invite:false`; outbox `invite_email_state = HANDED_OFF`).
  Next contact = the 1-1 booked by the specialist (Google invite only if the LO address is `bao.trinh+a3009f@loanfactory.com` on staging),
  optional reminder e-mails (§3.8), and **after 1-1 Done** packs' existing `pre_onboarding_done` e-mail ("register, pay and sign").
  Done carries `agreement_flow:"RECRUIT_V2"` so packs builds the e-sign agreement only when the LO submits the profile.
- **No specialist** (none eligible) → falls back to the normal invitation e-mail (logged WARN).
- **Specialist sees**: bell `ONBOARDING_ASSIGNED` (fresh pick, or `handoff:true` per offer for an existing specialist); the candidate in
  their Today `onboarding_items` (task `BOOK_1ON1` → `UPCOMING` → `MEETING_TODAY` → `MARK_DONE`) and in the ONBOARDING queue
  (`GET /checklist/departments/ONBOARDING/queue`).
- **Recruiter (requester) sees**: offer SENT, candidate S5, My invites stage INVITED_1ON1_PENDING ("My hand-offs"); no "e-mail not sent"
  warning; resend refused with the hand-off 409; `resend_eligible=false`.
- Hand-off withdrawn → bell `INVITE_HANDOFF_WITHDRAWN` to owner + specialist, reason `SPECIALIST_CLEARED` (MOSO refused the specialist later;
  resend then e-mails), `FELL_BACK_TO_EMAIL` (refused on the invite itself; the retry e-mails), `NOT_DELIVERED` (dead letter).
- Known open packs bugs accepted by Bao when turning it on (fd3201ec): **agentflow-90vkj** (billable Inkless envelope regenerate can be
  looped; staging Inkless = PROD billable account) and **agentflow-gglqk** (V2 row completed via the keyless e-mail-dedupe submit gets
  **no agreement envelope**, sign step dead; reordered state lists force a regenerate). Also requires packs #3615 live on staging MOSO
  (merge note said "merge only after" — UNCONFIRMED that it is live).

### 3.7 1-1 meeting (ONB_PREMEETING item)
- Schedule `PUT /checklist-items/{id}/onboarding-meeting/schedule` body `{starts_at, minutes 5..240, link?, colleague_user_ids? (≤10)}`.
  Checks: item not ONB_PREMEETING → 400 `"Only the ONB_PREMEETING item can schedule the 1-1 meeting, not X"`; status not OPEN/BLOCKED →
  400 `"The 1-1 can only be (re)scheduled while the item is OPEN or BLOCKED, not X"`; no assignee → 409 `"Pick a specialist first"`;
  no `CHECKLIST_ITEM_MANAGE_ONBOARDING` → 403; **caller ≠ assigned specialist → 403 `"Only <id>, this item's assigned specialist, may schedule its 1-1 — reassign it via change-specialist first"`** (no manager override);
  link must be https (`"link must be an https:// link, got: …"`); bad colleague → 400 `"colleague_user_ids: not an active internal recruit user (staff role, internal e-mail domain): [...]"`.
  `DELETE` same gates, clears the slot (keeps colleagues), deletes the Google event.
- Google event (flag ON): created after commit AS the scheduler if they have Connect Google; title `"LoanFactory onboarding 1-1: <LO name>"`,
  Meet link written into `meeting_link` (a pasted link is never overwritten), private, LO guest only if allowlisted, colleagues always invited.
  A different specialist rescheduling patches the same event as its original organizer. Not connected → no event (`calendar_event` null; template link flow).
  `calendar_event {state: PENDING|SCHEDULED|LINK_PENDING|FAILED, failure_code: CALENDAR_*}` on queue rows and Today. Known gap
  **agentflow-a6pq1**: rows stuck PENDING/LINK_PENDING are only fixed by the next schedule/clear.
- Recruiter's own "Meet 1-1" next step (D213/D214): call outcome INTERESTED + `next_step_kind=MEET_ONE_ON_ONE` with a time
  (`next_step_at`) + optional `meet_minutes` 5..480 (else 400 `"meet_minutes must be between 5 and 480, got: N"`) + `colleague_user_ids`
  (absent = the onboarding specialist is suggested). If the recruiter is connected: Google event + Meet as the recruiter. NO_ANSWER/NEUTRAL/Save&invite keep the meeting; a different next step / NOT_INTERESTED / follow-up done deletes the event.
- Mark Done `PATCH /checklist-items/{id}` `{status: DONE, meeting_date, lo_type, employment_type?, reason?}` — any ONBOARDING holder (not only the assignee).
  Required for ONB_PREMEETING Done on staging: `meeting_date` (today or past, business TZ) and `lo_type` ∈ `OUTSIDE|INDEPENDENT|CORPORATE|MORTGAGE_ADVISOR`;
  `employment_type` ∈ `full_time|part_time|contract|outside_sales_person` (INDEPENDENT ⇔ contract; MORTGAGE_ADVISOR either).
  Messages: `"meeting_date is required when marking the 1-1 pre-onboarding meeting DONE"`, `"meeting_date cannot be in the future"`,
  `"lo_type is required when marking the 1-1 pre-onboarding meeting DONE"`, NA/BLOCKED without reason → `"A reason is required when setting NA — …"`
  (these are IllegalArgumentException → likely **HTTP 500**, UNCONFIRMED); `"Unknown lo_type: …"`, `"lo_type INDEPENDENT goes with employment_type contract, and only with it (MORTGAGE_ADVISOR may take either)"` (400).
  Legal name is NOT required. First DONE enqueues ONBOARDING_MEETING writeback (`pre_onboarding_done`), which can wait with
  `WAIT_SPECIALIST | WAIT_LO_EMAIL | WAIT_W2_FLAG`. Done does **not** move the stage and does **not** delete the Google event.
  MOSO reporting the meeting done auto-closes the item (reason `"Marked in MOSO"`).
- Resend a dead-lettered Done: `POST /checklist-items/{id}/onboarding-meeting/resend` (409s listed in source `OnboardingMeetingResendServiceImpl.java:73-112`).
- Change specialist `PUT /candidates/{id}/onboarding-specialist {user_id}` (`ONBOARDING_SPECIALIST_ASSIGN` = ONBOARDING, MANAGER):
  400 `"user X is not an active ONBOARDING-role recruit user with an e-mail on file"`; 409 `"The 1-1 meeting is already reached in MOSO and a specialist is already stored there — change it directly in MOSO instead"`.
  Picker: `GET /onboarding/specialists`.
- Meet attendance: **OFF** on staging (no auto proposal/no-show bell).

### 3.8 Reminder e-mails to the LO before the 1-1
Offsets T-2d / T-1d / T-2h from the 1-1 start, sent AS the specialist through packs, only for slots booked after V204 (`meeting_planned_at`),
only if the offset was not already past at booking time, within 30 min after due. Guards (skip codes): `ITEM_CLOSED, MEETING_CLEARED,
MEETING_MOVED, MEETING_STARTED, NOT_IN_WINDOW, BEFORE_BOOKING, CANDIDATE_INACTIVE, NOT_LINKED, NO_EMAIL, SUPPRESSED, RECIPIENT_NOT_ALLOWED, NO_SPECIALIST`.
DRY_RUN = row in table `onboarding_meeting_reminders` with `status='DRY_RUN'` and the rendered text, nothing sent. **No API exposes it** —
only DB/logs. Live staging gate values UNCONFIRMED (see §1.1).

### 3.9 Agreement send from Recruit
`GET /candidates/{id}/agreement` (`CANDIDATE_READ`), `POST /candidates/{id}/agreement/send {expect: LINK_AGAIN|UPDATED_AGREEMENT, expected_recipient}`
(`AGREEMENT_SEND` = ONBOARDING + ADMIN). Refusals are 409 with a raw body `{reason_code, message}`:
`AGREEMENT_FEATURE_OFF, AGREEMENT_MOSO_NOT_CONFIGURED, AGREEMENT_NOT_LINKED, AGREEMENT_NOT_FOR_CLASS ("Corporate and Mortgage advisor loan officers do not sign this agreement"), AGREEMENT_SUPPRESSED, AGREEMENT_ACTOR_NO_EMAIL, AGREEMENT_RECIPIENT_UNKNOWN, AGREEMENT_RECIPIENT_MISMATCH, AGREEMENT_RECIPIENT_NOT_ALLOWED ("This environment only sends the agreement to approved test recipients"), AGREEMENT_COOLDOWN (+retry_after; 10 min), AGREEMENT_SEND_PENDING`.
The allowlist is checked against **MOSO's** recipient address (dry run), not recruit's `candidates.email`. GET shows
`action_available: LINK_AGAIN|UPDATED_AGREEMENT|NONE` and `refusal.reason_code`. Success → timeline `"Requested the e-sign signing link to be e-mailed again (attempt N)."`.

### 3.10 Send to HR `GET/POST /candidates/{id}/hr-handoff`
- POST needs `CANDIDATE_HR_HANDOFF` (ONBOARDING + ADMIN only; **managers and recruiters cannot**). Once per candidate ever.
- Blocking `missing` codes: `stage:not_joined` (must be exactly S6), `status:archived` (not ACTIVE), `offer:not_signed_and_paid`,
  `first_name`/`first_name:invalid`, `last_name`/`:invalid`, `email`/`:invalid`, `nmls_id`/`:invalid` (`[1-9][0-9]{3,11}`),
  `lo_type`/`:invalid`, `employment_type`/`:invalid` (incl. `intern`), `lo_type:employment_type_mismatch`, `already_sent`.
  Warnings (non-blocking): `phone:missing`, `phone:invalid`, `phone:landline`, `mailing_address:missing`, `legal_name_unconfirmed`.
- Errors: 409 `"Send to HR is switched off"`, 409 `"Already sent to HR"`, 400 `"Not ready to send to HR: [codes]"`.
- Effect: `handed_off_at` set; RECRUIT_HIRED POSTed to ai-hr-be `/internal/v1/recruit/hires` (`delivery: pending|delivered|failed`).

### 3.11 HR → recruit return (ks99 state) and S7
- Pub/Sub `associate.onboarded` → writes `candidates.account_id` once (+ SYSTEM activity, omni cast re-push). Nothing else.
- **S7 is manual only** (transition endpoint, or MOSO legacy `joined`). D172: S7 needs HR account + HR completed + Licensing completed +
  ONB_SETUP_CALL; HR does not publish the completion events yet (agentflow-ks99 OPEN). HR_* checklist items stay manual and non-mandatory.
- Admin replay: `POST /admin/hr-onboard/reconcile {platform_user_id}` (SETTINGS_MANAGE = ADMIN), 403 `"Only an administrator can reconcile an HR onboard"`.

---

## 4. Roles and permission matrix

### 4.1 Seeded role → permissions (migrations V003…V210; editable at runtime in /permissions — staging may differ, UNCONFIRMED)
| Role (code) | Permissions |
|---|---|
| ADMIN | `*` (everything, incl. SETTINGS_MANAGE, RBAC_MANAGE, IMPORT_RUN, SEQUENCE_*, REFERRAL_ATTRIBUTION_OVERRIDE, CHECKLIST_*_IT) |
| MANAGER ("Recruiting Manager") | CANDIDATE_READ/CREATE/UPDATE/CLAIM/TRANSITION/TRANSFER/ARCHIVE/MERGE, ACTIVITY_READ/LOG, SUPPRESSION_MANAGE, OFFER_READ/REQUEST/**APPROVE**, TEMPLATE_CREATE/APPROVE, REPORT_TEAM, AUDIT_VIEW, LABEL_MANAGE, REFERRAL_ATTRIBUTION_READ, CHECKLIST_READ, SYNC_TRACE_READ, ONBOARDING_SPECIALIST_ASSIGN, CANDIDATE_LEGAL_NAME_CONFIRM, REFERRAL_ADMIN_VIEW |
| RECRUITER | CANDIDATE_READ/CREATE/UPDATE/CLAIM/TRANSITION/ARCHIVE, ACTIVITY_READ/LOG, SUPPRESSION_MANAGE, OFFER_READ/REQUEST, TEMPLATE_CREATE, CHECKLIST_READ, CANDIDATE_LEGAL_NAME_CONFIRM |
| LO_SUPPORT ("Kho HOT"), OFFICER_RECRUITER ("Kho COLD") | same as RECRUITER minus CANDIDATE_LEGAL_NAME_CONFIRM |
| HEADHUNTER (row scope ORIGIN_SELF), TEAM_LEAD (ORIGIN_TEAM) | CANDIDATE_READ/UPDATE/CLAIM/TRANSITION/ARCHIVE, ACTIVITY_READ/LOG, OFFER_READ/REQUEST, TEMPLATE_CREATE, CHECKLIST_READ, CANDIDATE_LEGAL_NAME_CONFIRM; plus route allowlist (§4.3) |
| ONBOARDING ("Onboarding Specialist") | CANDIDATE_READ/UPDATE, ACTIVITY_READ, OFFER_READ, CANDIDATE_OVERRIDE_GATE, CHECKLIST_READ, CHECKLIST_TEMPLATE_MANAGE_ONBOARDING, CHECKLIST_ITEM_MANAGE_ONBOARDING, SYNC_TRACE_READ, CANDIDATE_HR_HANDOFF, SPONSORSHIP_ACCESS_RECORD, ONBOARDING_SPECIALIST_ASSIGN, CANDIDATE_LEGAL_NAME_CONFIRM, AGREEMENT_SEND |
| HR | CANDIDATE_READ, ACTIVITY_READ, OFFER_READ, CHECKLIST_READ, CHECKLIST_TEMPLATE_MANAGE_HR, CHECKLIST_ITEM_MANAGE_HR |
| LICENSING | CANDIDATE_READ, ACTIVITY_READ (**no OFFER_READ**), CHECKLIST_READ, CHECKLIST_TEMPLATE/ITEM_MANAGE_LICENSING, LICENSING_RULE_MANAGE, SPONSORSHIP_MANAGE, SPONSORSHIP_ACCESS_RECORD |
| ACCOUNTING | CANDIDATE_READ, ACTIVITY_READ, OFFER_READ, CHECKLIST_READ, CHECKLIST_TEMPLATE/ITEM_MANAGE_ACCOUNTING |
| IT | **no role exists** (IT checklist items only closable by ADMIN) |

A grant (`rbac_grants`) = `role_codes[]` + `overrides_add[]` + `overrides_block[]` + `email`. E.g. "SETTINGS_MANAGE override" = a
MANAGER grant with `overrides_add: ["SETTINGS_MANAGE"]`. The grant **email** matters: it is the From of the MOSO invite and must exist
for onboarding specialists (round robin, reminders, colleagues). Unknown user (no grant) → 403 on everything.

### 4.2 Action matrix (Y = allowed; "own" = only on leads they own; staging RBAC enforce = true)
| Action (endpoint) | Gate | RECRUITER / LO_SUPPORT / OFFICER_REC | MANAGER | ONBOARDING | HR | LICENSING | ACCOUNTING | HEADHUNTER/TL | ADMIN |
|---|---|---|---|---|---|---|---|---|---|
| Read candidates, Today, Hot/Cold, reports (own numbers) | CANDIDATE_READ | Y | Y | Y | Y | Y | Y | scoped | Y |
| Claim `POST /candidates/{id}/claim`, batch-claim | CANDIDATE_CLAIM | Y | Y | – | – | – | – | claim only unowned in read scope; no batch | Y |
| Call result `POST /call-outcome` | ACTIVITY_LOG + owner or REPORT_TEAM (`"Only the owner or a manager/admin records outcomes — claim or transfer first"`) | own | Y | – | – | – | – | own | Y |
| Log activity / notes | ACTIVITY_LOG | Y | Y | – | – | – | – | own | Y |
| Invite `POST /candidates/{id}/offers` | OFFER_REQUEST + owner or OFFER_APPROVE | own | Y (any lead) | – | – | – | – | own | Y |
| Approve / waive / fee-paid / signed / send | OFFER_APPROVE (+ program refusals) | – | Y | – | – | – | – | – | Y |
| Decline | OFFER_REQUEST + requester/owner/approver | own/requested | Y | – | – | – | – | own (route allowlisted? decline is NOT in the allowlist → 403) | Y |
| Resend invite | requester or OFFER_APPROVE | requested | Y | – | – | – | – | – (not allowlisted) | Y |
| Remind approver / onboarding (My invites) | OFFER_REQUEST + requester | Y | Y | – | – | – | – | Y | Y |
| Remind claimed-idle / ready-to-join | REPORT_TEAM | – | Y | – | – | – | – | – | Y |
| Hand off own lead / release own lead (`/transfer`) | owner | own | Y | – | – | – | – | – (not allowlisted) | Y |
| Reassign someone else's lead (take back) | CANDIDATE_TRANSFER; target must hold CANDIDATE_CLAIM | – | Y | – | – | – | – | – | Y |
| Archive (bulk) / revive DORMANT | CANDIDATE_ARCHIVE (+TRANSFER for others' leads) | own | Y | – | – | – | – | revive own only | Y |
| Manual stage move | CANDIDATE_TRANSITION | Y | Y | – (no TRANSITION; override gate only matters with it) | – | – | – | own | Y |
| Stage override (skip requirements) | + CANDIDATE_OVERRIDE_GATE | – | – | (needs TRANSITION too → effectively ADMIN or a grant override) | – | – | – | – | Y |
| Merge duplicates | CANDIDATE_MERGE | – | Y | – | – | – | – | – | Y |
| Change onboarding specialist | ONBOARDING_SPECIALIST_ASSIGN | – | Y | Y | – | – | – | – | Y |
| Schedule / clear 1-1 | CHECKLIST_ITEM_MANAGE_ONBOARDING + assigned specialist | – | – | assignee | – | – | – | – | assignee only |
| 1-1 Done / close ONBOARDING items | CHECKLIST_ITEM_MANAGE_ONBOARDING | – | – | Y | – | – | – | – | Y |
| Close dept checklist items | CHECKLIST_ITEM_MANAGE_<dept> | – | – | ONB | HR | LIC | ACCT | – | Y (incl. IT) |
| Edit checklist templates | CHECKLIST_TEMPLATE_MANAGE_<dept> | – | – | ONB | HR | LIC | ACCT | – | Y |
| Sponsorship actions | SPONSORSHIP_MANAGE (all) / ACCESS_RECORD (access granted only) | – | – | access only | – | Y | – | – | Y |
| Licensing state rules | LICENSING_RULE_MANAGE | – | – | – | – | Y | – | – | Y |
| Agreement send | AGREEMENT_SEND | – | – | Y | – | – | – | – | Y |
| Send to HR | CANDIDATE_HR_HANDOFF | – | – | Y | – | – | – | – | Y |
| Legal name confirm | CANDIDATE_LEGAL_NAME_CONFIRM | RECRUITER only | Y | Y | – | – | – | own | Y |
| Suppressions registry | SUPPRESSION_MANAGE | Y | Y | – | – | – | – | – | Y |
| Templates: create/submit; approve/reject/retire TEAM | TEMPLATE_CREATE; TEMPLATE_APPROVE | create | both | – | – | – | – | create | both |
| Labels catalog edit (tagging = CANDIDATE_UPDATE) | LABEL_MANAGE | – | Y | – | – | – | – | – | Y |
| Team reports, Exceptions, claimed-idle | REPORT_TEAM | – | Y | – | – | – | – | – | Y |
| Audit `GET /admin/audit-events` | AUDIT_VIEW | – | Y | – | – | – | – | – | Y |
| Sync trace `GET /candidates/{id}/sync-trace` | SYNC_TRACE_READ | – | Y | Y | – | – | – | – | Y |
| Referral attribution read / override | REFERRAL_ATTRIBUTION_READ / _OVERRIDE | – | read | – | – | – | – | – | both |
| Referrals admin view (dark: 404 while `referrals.enabled=false`) | REFERRAL_ADMIN_VIEW | – | Y | – | – | – | – | – | Y |
| Settings, zoom links, HR reconcile, cast backfill | SETTINGS_MANAGE | – | – | – | – | – | – | – | Y |
| Permissions `/admin/rbac/*` (except `/me`), program members, headhunter catch-up | RBAC_MANAGE | – | – (program `/exceptions` also allowed with CANDIDATE_TRANSFER) | – | – | – | – | – | Y |
| Imports, backfills, unmatched webhooks | IMPORT_RUN | – | – | – | – | – | – | – | Y |
| Sequences | SEQUENCE_READ/MANAGE | – | – | – | – | – | – | – | Y |
| Follow/unfollow, @mention notes | owner / OB specialist / manager add people; self-follow manager only | own | Y | if assigned | – | – | – | own | Y |
| Join omni conversation as manager | REPORT_TEAM | – | Y | – | – | – | – | – | Y |
| Connect Google | any grant + @loanfactory.com Google account | Y | Y | Y | Y | Y | Y | Y | Y |

### 4.3 HEADHUNTER / TEAM_LEAD specifics
- Interceptor: any route not on `ScopedRouteAllowlist` → 403 `"This page is not available to your role"`; a candidate outside scope → 404 `"Candidate not found"`.
  READ = owned + collected via an ADMIN-CONFIRMED program link (team for TEAM_LEAD); WRITE = owned only.
- Not allowlisted (so 403): transfer/release, batch-claim, bulk ops, **offer decline**, **resend-invite**, claimed-idle, exceptions, KPI,
  reports, dedup, admin, department queues. Allowlisted: see `headhunter/web/ScopedRouteAllowlist.java:31-114` (Today, My invites, Hot/Cold,
  candidate drawer routes incl. offers POST, invite-status, follow-ups, followers, notes, checklist-items read, legal-name confirm, revive, Google connect).
- PUT on own lead: only firstName, lastName, phone, companyName, state, licensedStates, sponsorStates, preferredLanguages, mailingAddress,
  loType, employmentType; else 403 `"Your role cannot change <fields>"`.
- Non-owner reads are redacted (D195): notes, drafts, archive reason, waive reason, comp details, decline reason etc. blanked; only CALL/SMS/EMAIL/MEETING activities.
- Auto-own and program sync are OFF; links are made by ADMIN at `/admin/program-members/{mosoKey}/link`.

---

## 5. API for automated testing

### 5.1 Auth on staging
- Browser → `https://recruit.viet18.com` → SSO at `https://account.viet18.com/login?app=RECRUIT` → access token (JWT) kept in
  localStorage `recruit-fe-auth-storage`. FE calls `https://gateway.viet18.com/recruit-svc/api/v1/...` with `Authorization: Bearer <JWT>`.
- api-gateway-v2 validates the JWT, **strips any client X-User-***, injects `X-User-ID` (central user UUID), `X-User-Identifiers`
  (e-mails), `X-User-Authorities`. recruit-be reads only `X-User-ID` (tera-core `ServicesUtils`). Authorization = the app's own `rbac_grants`.
  Missing X-User-ID → 401 (D178) on most routes, 403 on `require(false)` routes.
- **Test script options**:
  1. Through the gateway: log in as each test user in a browser, copy the access token from localStorage
     (`recruit-fe-auth-storage` → tokens), call `https://gateway.viet18.com/recruit-svc/api/v1/<path>` with `Authorization: Bearer`.
     Refresh via `POST /auth-svc/public/api/v1/auth/token/refresh` (UNCONFIRMED body shape). Spoofing X-User-ID through the gateway is impossible.
  2. In-cluster (needs kubectl on `gke_lenderrate-master_us-central1_moso-kube`, ns `recruit-be`): call
     `http://recruit-be.recruit-be.svc.cluster.local:8090/api/v1/...` with header `X-User-ID: <central user uuid>` — no token needed
     (docs/SELF-TEST-STAGING.md §7; pod has only busybox wget; use a temporary curl pod). This creates a pod in the cluster, so it is a staging change; ask first.
- Base path `/api/v1`; JSON is **snake_case**; errors are wrapped `{payload, error:{messages…}, response_date}` (agreement 409s are a raw `{reason_code, message}`).
- Seeded staging grant user ids (V029/V030): ADMIN `a0aa8a66-dedc-4dc5-8954-80522c632fd9`; RECRUITER `bc47b6e5-f552-4e6b-ad54-f0b10e39f4e4`;
  RECRUITER+MANAGER `33396e4b-4c31-4366-8711-b90e008b6fb8`; HR `7029ad42-4fdb-4627-ad7d-30c8e948ecfe`;
  LICENSING `9a65092b-131a-43a8-9d64-2bf72ae21cfd`; ONBOARDING `f3607fe4-14a5-4eb5-822e-a622dc7172a5`; ACCOUNTING `98d05c09-fa63-494f-8276-f08c8dc27f21`.
  Their e-mails are not in the repo; grants may have changed since (check `GET /admin/rbac/grants` as ADMIN).
- Internal ticks: `POST /api/v1/<name>/internal/tick` with header `x-service-key: <key from recruit-svc-secret>` (not for testers).

### 5.2 Endpoint list (method, path, gate)
| Method | Path | Gate | Handler |
|---|---|---|---|
| GET | `/api/v1/candidates/{id}/agreement` | CANDIDATE_READ | AgreementController.status |
| POST | `/api/v1/candidates/{id}/agreement/send` | AGREEMENT_SEND | AgreementController.send |
| GET | `/api/v1/admin/audit-events` | AUDIT_VIEW | AuditController.list |
| GET | `/api/v1/calendar/guest-policy` | CANDIDATE_READ | CalendarPolicyController.guestPolicy |
| POST | `/api/v1/admin/candidates/auto-stage/backfill` | IMPORT_RUN | AutoStageBackfillController.backfill |
| POST | `/api/v1/candidates` | 403 always (native create off) | CandidateController.create |
| GET | `/api/v1/candidates` | CANDIDATE_READ | CandidateController.list |
| GET | `/api/v1/candidates/{id}` | CANDIDATE_READ | CandidateController.get |
| PUT | `/api/v1/candidates/{id}` | CANDIDATE_UPDATE | CandidateController.update |
| POST | `/api/v1/candidates/{id}/claim` | CANDIDATE_CLAIM | CandidateController.claim |
| POST | `/api/v1/candidates/batch-claim` | CANDIDATE_CLAIM | CandidateController.batchClaim |
| POST | `/api/v1/candidates/{id}/transfer` | owner, else CANDIDATE_TRANSFER; target needs CANDIDATE_CLAIM | CandidateController.transfer |
| POST | `/api/v1/candidates/bulk-transfer` | CANDIDATE_READ + per row owner/CANDIDATE_TRANSFER | CandidateController.bulkTransfer |
| POST | `/api/v1/candidates/bulk-archive` | CANDIDATE_ARCHIVE (+TRANSFER for others) | CandidateController.bulkArchive |
| POST | `/api/v1/candidates/{id}/transition` | CANDIDATE_TRANSITION (+OVERRIDE_GATE) | CandidateController.transition |
| GET | `/api/v1/candidates/{id}/stage-history` | CANDIDATE_READ | CandidateController.stageHistory |
| POST | `/api/v1/candidates/{id}/activities` | ACTIVITY_LOG | CandidateController.logActivity |
| POST | `/api/v1/candidates/{id}/call-outcome` | ACTIVITY_LOG + owner/REPORT_TEAM (+OFFER_REQUEST if send_invite) | CandidateController.callOutcome |
| GET | `/api/v1/candidates/{id}/suppressions` | CANDIDATE_READ | CandidateController.suppressionMatches |
| GET | `/api/v1/candidates/{id}/contact-route` | ACTIVITY_LOG | CandidateController.contactRoute |
| GET | `/api/v1/candidates/{id}/auto-stage-hold` | CANDIDATE_READ | CandidateController.autoStageHold |
| GET | `/api/v1/candidates/{id}/activities` | ACTIVITY_READ | CandidateController.listActivities |
| POST | `/api/v1/candidates/{id}/conversation/ensure-cast` | ACTIVITY_READ | CandidateController.ensureConversationCast |
| POST | `/api/v1/candidates/{id}/revive` | CANDIDATE_ARCHIVE | CandidateController.revive |
| GET | `/api/v1/candidates/{id}/follow-ups` | CANDIDATE_READ + owner/REPORT_TEAM | CandidateFollowUpController.list |
| POST | `/api/v1/candidates/{id}/follow-ups` | ACTIVITY_LOG | CandidateFollowUpController.create |
| PATCH | `/api/v1/candidates/{id}/follow-ups/{fid}` | ACTIVITY_LOG | CandidateFollowUpController.patch |
| POST | `/api/v1/candidates/{id}/follow-ups/{fid}/done` | ACTIVITY_LOG | CandidateFollowUpController.done |
| POST | `/api/v1/candidates/{id}/legal-name/confirm` | CANDIDATE_LEGAL_NAME_CONFIRM | LegalNameController.confirm |
| GET | `/api/v1/candidates/{id}/events/subscribe` | CANDIDATE_READ (UNCONFIRMED); 503 if Redis unset | CandidateEventsController.subscribe |
| POST | `/api/v1/admin/checklists/backfill` | IMPORT_RUN | ChecklistBackfillController.backfill |
| GET | `/api/v1/candidates/{candidateId}/checklist-items` | CHECKLIST_READ | ChecklistController.listByCandidate |
| GET | `/api/v1/checklist/departments/{department}/items` | CHECKLIST_READ | ChecklistController.listOpenByDepartment |
| GET | `/api/v1/checklist/departments/{department}/queue` | CHECKLIST_READ | ChecklistController.queueByDepartment |
| GET | `/api/v1/checklist/departments/{department}/candidates` | CHECKLIST_READ | ChecklistController.candidatesWithOpenWork |
| PATCH | `/api/v1/checklist-items/{id}` | CHECKLIST_ITEM_MANAGE_<item dept> | ChecklistController.changeStatus |
| PUT | `/api/v1/checklist-items/{id}/onboarding-meeting/schedule` | CHECKLIST_ITEM_MANAGE_ONBOARDING + assigned specialist | ChecklistController.scheduleOnboardingMeeting |
| DELETE | `/api/v1/checklist-items/{id}/onboarding-meeting/schedule` | same | ChecklistController.clearOnboardingMeeting |
| GET | `/api/v1/admin/checklist/templates` | CHECKLIST_READ | ChecklistTemplateAdminController.list |
| GET | `/api/v1/admin/checklist/templates/{id}/impact` | CHECKLIST_READ (UNCONFIRMED) | ChecklistTemplateAdminController.impact |
| POST | `/api/v1/admin/checklist/templates` | CHECKLIST_TEMPLATE_MANAGE_<dept> | ChecklistTemplateAdminController.create |
| PUT | `/api/v1/admin/checklist/templates/{id}` | CHECKLIST_TEMPLATE_MANAGE_<dept> | ChecklistTemplateAdminController.update |
| DELETE | `/api/v1/admin/checklist/templates/{id}` | CHECKLIST_TEMPLATE_MANAGE_<dept> | ChecklistTemplateAdminController.delete |
| GET | `/api/v1/config/candidate-view` | CANDIDATE_READ | CandidateViewController.candidateView |
| POST | `/api/v1/candidates/{candidateId}/conversation/join` | ACTIVITY_READ; joining as manager needs REPORT_TEAM | ConversationAccessController.join |
| GET | `/api/v1/candidates/{candidateId}/conversation/participants` | ACTIVITY_READ | ConversationAccessController.? |
| POST | `/api/v1/candidates/{candidateId}/conversation/leave` | ACTIVITY_READ | ConversationAccessController.leaveMyself |
| DELETE | `/api/v1/candidates/{candidateId}/conversation/participants/{userId}` | REPORT_TEAM (UNCONFIRMED) | ConversationAccessController.leave |
| GET | `/api/v1/today` | CANDIDATE_READ | DashboardController.today |
| GET | `/api/v1/today/handed-to-me` | CANDIDATE_READ | DashboardController.handedToMe |
| GET | `/api/v1/kpi/pipeline` | CANDIDATE_READ | DashboardController.pipelineKpi |
| GET | `/api/v1/duplicates` | CANDIDATE_READ | DedupController.duplicates |
| POST | `/api/v1/duplicates/merge` | CANDIDATE_MERGE | DedupController.merge |
| GET | `/api/v1/candidates/{candidateId}/followers` | CANDIDATE_READ | CandidateFollowerController.roster |
| POST | `/api/v1/candidates/{candidateId}/followers` | CANDIDATE_READ + owner/specialist/manager rule | CandidateFollowerController.follow |
| DELETE | `/api/v1/candidates/{candidateId}/followers/me` | any | CandidateFollowerController.unfollowMyself |
| DELETE | `/api/v1/candidates/{candidateId}/followers/{userId}` | owner or manager | CandidateFollowerController.remove |
| POST | `/api/v1/candidates/{candidateId}/notes` | ACTIVITY_LOG | CandidateFollowerController.addNote |
| POST | `/api/v1/admin/omni/followers/reconcile` | IMPORT_RUN | FollowerReconcileController.reconcile |
| GET | `/api/v1/me/google/connect-url` | any grant (flag) | GoogleConnectController.connectUrl |
| POST | `/api/v1/me/google/connect` | any grant | GoogleConnectController.connect |
| GET | `/api/v1/me/google/status` | any grant | GoogleConnectController.status |
| DELETE | `/api/v1/me/google` | any grant | GoogleConnectController.disconnect |
| POST | `/api/v1/meet-attendance/internal/tick` | x-service-key | MeetAttendanceInternalController.tick |
| POST | `/api/v1/admin/headhunter/catch-up/{userId}` | RBAC_MANAGE | HeadhunterCatchUpController.catchUp |
| GET | `/api/v1/admin/program-members/pending` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| GET | `/api/v1/admin/program-members/pending/{mosoKey}/candidates` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| GET | `/api/v1/admin/program-members/exceptions` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| POST | `/api/v1/admin/program-members/{mosoKey}/link` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| POST | `/api/v1/admin/program-members/{mosoKey}/reject` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| POST | `/api/v1/admin/program-members/{mosoKey}/unlink` | RBAC_MANAGE (/exceptions: or CANDIDATE_TRANSFER) | ProgramMemberAdminController.? |
| POST | `/api/v1/program-sync/internal/tick` | x-service-key | ProgramSyncInternalController.? |
| GET | `/public/api/v1/comm/host/subjects/{subject-type}/{id}/active` | public, access token (omni) | HostSubjectsController.active |
| GET | `/public/api/v1/comm/host/subjects/{subject-type}/resolve` | public, access token | HostSubjectsController.resolve |
| GET | `/public/api/v1/comm/host/sender-identity` | public, access token | HostSubjectsController.senderIdentity |
| POST | `/api/v1/hot-idle-release/internal/tick` | x-service-key | HotIdleReleaseInternalController.tick |
| GET | `/api/v1/candidates/{id}/hr-handoff` | CANDIDATE_READ | HrHandoffController.state |
| POST | `/api/v1/candidates/{id}/hr-handoff` | CANDIDATE_HR_HANDOFF | HrHandoffController.send |
| POST | `/api/v1/hr-handoff/internal/tick` | x-service-key | HrHandoffInternalController.tick |
| POST | `/api/v1/admin/hr-onboard/reconcile` | SETTINGS_MANAGE | HrOnboardReconcileController.reconcile |
| GET | `/api/v1/exceptions/ready-to-join` | REPORT_TEAM | ExceptionsController.readyToJoin |
| POST | `/api/v1/exceptions/ready-to-join/{candidateId}/remind` | REPORT_TEAM | ExceptionsController.remindReadyToJoin |
| GET | `/api/v1/inbox/hot` | CANDIDATE_READ | InboxController.hot |
| GET | `/api/v1/inbox/hot/counts` | CANDIDATE_READ | InboxController.hotCounts |
| GET | `/api/v1/inbox/hot/claimed-idle` | REPORT_TEAM | InboxController.claimedIdle |
| POST | `/api/v1/inbox/hot/claimed-idle/{candidateId}/remind` | REPORT_TEAM | InboxController.remind |
| GET | `/api/v1/inbox/cold` | CANDIDATE_READ | InboxController.cold |
| GET | `/api/v1/labels` | CANDIDATE_READ | LabelController.catalog |
| POST | `/api/v1/labels` | CANDIDATE_UPDATE | LabelController.create |
| PUT | `/api/v1/labels/{id}` | LABEL_MANAGE | LabelController.update |
| DELETE | `/api/v1/labels/{id}` | LABEL_MANAGE | LabelController.delete |
| GET | `/api/v1/candidates/{candidateId}/labels` | CANDIDATE_READ | LabelController.forCandidate |
| GET | `/api/v1/candidate-labels` | CANDIDATE_READ | LabelController.forCandidates |
| POST | `/api/v1/candidates/{candidateId}/labels` | CANDIDATE_UPDATE | LabelController.attach |
| DELETE | `/api/v1/candidates/{candidateId}/labels/{labelId}` | CANDIDATE_UPDATE | LabelController.detach |
| GET | `/api/v1/admin/licensing/state-rules` | LICENSING_RULE_MANAGE | LicensingStateRuleAdminController.list |
| POST | `/api/v1/admin/licensing/state-rules` | LICENSING_RULE_MANAGE | LicensingStateRuleAdminController.create |
| PUT | `/api/v1/admin/licensing/state-rules/{id}` | LICENSING_RULE_MANAGE | LicensingStateRuleAdminController.update |
| DELETE | `/api/v1/admin/licensing/state-rules/{id}` | LICENSING_RULE_MANAGE | LicensingStateRuleAdminController.delete |
| POST | `/api/v1/admin/sponsorships/backfill` | IMPORT_RUN | SponsorshipBackfillController.backfill |
| GET | `/api/v1/sponsorships` | CHECKLIST_READ | SponsorshipController.list |
| GET | `/api/v1/candidates/{candidateId}/sponsorships` | CHECKLIST_READ | SponsorshipController.forCandidate |
| POST | `/api/v1/candidates/{candidateId}/sponsorships/actions` | SPONSORSHIP_MANAGE / SPONSORSHIP_ACCESS_RECORD | SponsorshipController.act |
| POST | `/api/v1/admin/import/moso` | IMPORT_RUN | MosoImportController.importMoso |
| POST | `/public/v1/webhook/{service-name}/listener` | public, x-api-key (moso only) | PublicWebhookController.listenWebhook |
| GET | `/api/v1/notifications` | self | NotificationController.page |
| GET | `/api/v1/notifications/unread-count` | self | NotificationController.unreadCount |
| POST | `/api/v1/notifications/{id}/read` | self | NotificationController.markRead |
| POST | `/api/v1/notifications/read-all` | self | NotificationController.markAllRead |
| POST | `/api/v1/platform-inbox/internal/tick` | x-service-key | PlatformInboxInternalController.tick |
| GET | `/api/v1/offers/mine` | OFFER_REQUEST | MyInvitesController.mine |
| GET | `/api/v1/offers/mine/unseen-count` | OFFER_REQUEST | MyInvitesController.unseenCount |
| POST | `/api/v1/offers/{offerId}/seen` | OFFER_REQUEST | MyInvitesController.seen |
| POST | `/api/v1/offers/{offerId}/remind-approver` | OFFER_REQUEST + requester | MyInvitesController.remindApprover |
| POST | `/api/v1/offers/{offerId}/remind-onboarding` | OFFER_REQUEST + requester | MyInvitesController.remindOnboarding |
| POST | `/api/v1/candidates/{candidateId}/offers` | OFFER_REQUEST + owner or OFFER_APPROVE | OfferController.request |
| GET | `/api/v1/candidates/{candidateId}/offers` | OFFER_READ | OfferController.listByCandidate |
| GET | `/api/v1/candidates/{candidateId}/invite-status` | OFFER_READ | OfferController.inviteStatus |
| POST | `/api/v1/offers/{offerId}/resend-invite` | requester or OFFER_APPROVE | OfferController.resendInvite |
| GET | `/api/v1/offers/pending-approval` | OFFER_APPROVE | OfferController.pendingApproval |
| POST | `/api/v1/offers/{offerId}/approve` | OFFER_APPROVE | OfferController.approve |
| POST | `/api/v1/offers/{offerId}/decline` | OFFER_REQUEST + requester/owner/OFFER_APPROVE | OfferController.decline |
| POST | `/api/v1/offers/{offerId}/send` | OFFER_APPROVE | OfferController.send |
| POST | `/api/v1/offers/{offerId}/signed` | OFFER_APPROVE | OfferController.markSigned |
| POST | `/api/v1/offers/{offerId}/fee-paid` | OFFER_APPROVE | OfferController.markFeePaid |
| POST | `/api/v1/offers/{offerId}/waive-fee` | OFFER_APPROVE | OfferController.waiveFee |
| POST | `/api/v1/admin/omni/subject-alias/backfill` | IMPORT_RUN / x-service-key | OmniSubjectAliasController.? |
| POST | `/api/v1/omni/subject-alias/internal/tick` | IMPORT_RUN / x-service-key | OmniSubjectAliasController.? |
| POST | `/api/v1/admin/omni/cast-backfill/onboarding-specialists` | SETTINGS_MANAGE | OmniCastBackfillController.backfillOnboardingSpecialists |
| POST | `/api/v1/omni/cast-repush/internal/tick` | x-service-key | OmniCastRepushController.? |
| POST | `/api/v1/checklist-items/{id}/onboarding-meeting/resend` | CHECKLIST_ITEM_MANAGE_ONBOARDING | OnboardingMeetingController.resend |
| GET | `/api/v1/onboarding/specialists` | ONBOARDING_SPECIALIST_ASSIGN | OnboardingSpecialistController.specialists |
| PUT | `/api/v1/candidates/{id}/onboarding-specialist` | ONBOARDING_SPECIALIST_ASSIGN | OnboardingSpecialistController.changeSpecialist |
| POST | `/api/v1/onboarding-reminders/internal/tick` | x-service-key | OnboardingReminderInternalController.tick |
| GET | `/api/v1/packs-writeback/failures` | ACTIVITY_LOG | PacksWritebackFailureController.undelivered |
| POST | `/api/v1/packs-writeback/internal/tick` | x-service-key | PacksWritebackInternalController.tick |
| GET | `/api/v1/me/nav-context` | any | MeController.navContext |
| GET | `/api/v1/admin/rbac/roles` | RBAC_MANAGE | RbacAdminController.listRoles |
| GET | `/api/v1/admin/rbac/directory` | RBAC_MANAGE | RbacAdminController.directory |
| GET | `/api/v1/admin/rbac/grants` | RBAC_MANAGE | RbacAdminController.listGrants |
| PUT | `/api/v1/admin/rbac/grants/{userId}` | RBAC_MANAGE | RbacAdminController.upsertGrant |
| POST | `/api/v1/admin/rbac/grants/bulk` | RBAC_MANAGE | RbacAdminController.bulkGrant |
| DELETE | `/api/v1/admin/rbac/grants/{userId}` | RBAC_MANAGE | RbacAdminController.deleteGrant |
| GET | `/api/v1/admin/rbac/grants/{userId}/history` | RBAC_MANAGE | RbacAdminController.grantHistory |
| GET | `/api/v1/admin/rbac/me` | any (own permissions) | RbacAdminController.myPermissions |
| GET | `/api/v1/users` | CANDIDATE_READ | UserDirectoryController.list |
| GET | `/api/v1/users/names` | CANDIDATE_READ, 60/min | UserNamesController.? |
| POST | `/api/v1/referral-attribution/{candidateId}/override` | REFERRAL_ATTRIBUTION_OVERRIDE | ReferralAttributionController.override |
| GET | `/api/v1/referral-attribution/{candidateId}` | REFERRAL_ATTRIBUTION_READ | ReferralAttributionController.view |
| GET | `/api/v1/referrals/mine` | any (404 while referrals.enabled=false) | ReferralViewController.mine |
| GET | `/api/v1/referrals` | REFERRAL_ADMIN_VIEW (404 while off) | ReferralViewController.admin |
| GET | `/api/v1/referrals/export.csv` | REFERRAL_ADMIN_VIEW (404 while off) | ReferralViewController.exportCsv |
| GET | `/public/api/v1/register-status` | public, rate-limited | RegisterStatusController.registerStatus |
| GET | `/api/v1/kpi/trends` | CANDIDATE_READ (team with REPORT_TEAM) | KpiTrendController.trends |
| GET | `/api/v1/reports/recruiters` | CANDIDATE_READ (team with REPORT_TEAM) | ReportController.recruiters |
| GET | `/api/v1/reports/pivot` | CANDIDATE_READ (team with REPORT_TEAM) | ReportController.pivot |
| GET | `/api/v1/saved-filters` | CANDIDATE_READ | SavedFilterController.list |
| POST | `/api/v1/saved-filters` | CANDIDATE_READ | SavedFilterController.create |
| PUT | `/api/v1/saved-filters/{id}` | CANDIDATE_READ | SavedFilterController.update |
| DELETE | `/api/v1/saved-filters/{id}` | CANDIDATE_READ | SavedFilterController.delete |
| POST | `/api/v1/candidates/{candidateId}/sequences/{sequenceId}/enroll` | SEQUENCE_MANAGE | SequenceEnrollmentController.enroll |
| POST | `/api/v1/sequence-enrollments/{enrollmentId}/stop` | SEQUENCE_MANAGE | SequenceEnrollmentController.stop |
| GET | `/api/v1/candidates/{candidateId}/sequence-enrollments` | SEQUENCE_READ | SequenceEnrollmentController.listForCandidate |
| POST | `/api/v1/sequences/internal/tick` | x-service-key | SequenceInternalController.tick |
| GET | `/api/v1/admin/settings` | SETTINGS_MANAGE | SettingsController.list |
| GET | `/api/v1/admin/settings/{key}/history` | SETTINGS_MANAGE | SettingsController.history |
| GET | `/api/v1/admin/settings/business-hours/holidays` | SETTINGS_MANAGE | SettingsController.holidays |
| PUT | `/api/v1/admin/settings/{key}` | SETTINGS_MANAGE | SettingsController.put |
| POST | `/api/v1/suppressions` | SUPPRESSION_MANAGE | SuppressionController.create |
| GET | `/api/v1/suppressions` | SUPPRESSION_MANAGE | SuppressionController.list |
| DELETE | `/api/v1/suppressions/{id}` | SUPPRESSION_MANAGE | SuppressionController.delete |
| GET | `/api/v1/candidates/{id}/sync-trace` | SYNC_TRACE_READ | SyncTraceController.getTrace |
| GET | `/api/v1/templates` | CANDIDATE_READ | TemplateController.listActive |
| GET | `/api/v1/templates/manage` | TEMPLATE_CREATE | TemplateController.manage |
| POST | `/api/v1/templates` | TEMPLATE_CREATE | TemplateController.create |
| PUT | `/api/v1/templates/{id}` | TEMPLATE_CREATE | TemplateController.update |
| POST | `/api/v1/templates/{id}/submit` | TEMPLATE_CREATE | TemplateController.submit |
| POST | `/api/v1/templates/{id}/approve` | TEMPLATE_APPROVE | TemplateController.approve |
| POST | `/api/v1/templates/{id}/reject` | TEMPLATE_APPROVE | TemplateController.reject |
| POST | `/api/v1/templates/{id}/retire` | TEMPLATE_CREATE (+APPROVE for TEAM) | TemplateController.retire |
| POST | `/api/v1/user-service-sync/internal/tick` | x-service-key | UserServiceSyncInternalController.tick |
| GET | `/api/v1/admin/webhook-events/unmatched` | IMPORT_RUN | UnmatchedWebhookAdminController.status |
| POST | `/api/v1/admin/webhook-events/unmatched/purge` | IMPORT_RUN | UnmatchedWebhookAdminController.purge |
| GET | `/api/v1/webinars` | ACTIVITY_LOG | WebinarController.upcoming |
| GET | `/api/v1/me/zoom-link` | any (UNCONFIRMED) | MyZoomLinkController.status |
| GET | `/api/v1/admin/zoom-links` | SETTINGS_MANAGE | RecruiterZoomLinkController.list |
| GET | `/api/v1/admin/zoom-links/{userId}` | SETTINGS_MANAGE | RecruiterZoomLinkController.get |
| PUT | `/api/v1/admin/zoom-links/{userId}` | SETTINGS_MANAGE | RecruiterZoomLinkController.put |
| DELETE | `/api/v1/admin/zoom-links/{userId}` | SETTINGS_MANAGE | RecruiterZoomLinkController.delete |

Notes: "x-service-key" routes are cron-service internal ticks (key in the secret). `/public/**` routes skip the gateway user check.
HEADHUNTER/TEAM_LEAD additionally hit the route allowlist (§4.3). zoom-link "me" and event-stream gates
are from a quick read; marked UNCONFIRMED where not verified line by line.

---

## 6. Known broken / dark / TODO on staging (decisions D160–D214, beads)

Dark or OFF on staging (testers will NOT see these work):
- Hot idle auto-release (`hot.idle_release_enabled=false`); only the warning/clock and `HOT_CLAIM_WARN` show (D125/D131/D138).
- Headhunter auto-own + catch-up (`headhunter.auto_own_enabled=false`, D196/D197); program roster sync (`program_sync.mode=OFF`, D202).
- My referrals / admin Referrals (`referrals.enabled=false` → 404 "Referrals are not enabled"; nav-context `referrals_enabled:false`) (D174).
- Platform-inbox copy of the bell (`RECRUIT_PLATFORM_INBOX_ENABLED` unset, D188): only recruit's own bell.
- Meet attendance (D212): flag unset; `connect-url?grant=meet` → 404 `GOOGLE_CONNECT_GRANT_NOT_AVAILABLE`.
- Native candidate create (D165): "Add lead" refused; all LOs via MOSO sign-up.
- Auto-S7 (D172 / **agentflow-ks99** OPEN): HR does not publish completion events; S7 manual.
- Sequences auto-send (`sequence.auto_send_enabled=false`); sequences routes ADMIN only.
- Reminder e-mails: seeds DRY_RUN/[]; live staging state UNCONFIRMED (V212 says one real e-mail reached Bao).
- Offer EXPIRED: never written. Signed/fee-paid buttons are manual stubs until document-esign/payment webhooks.

Turned ON recently (test focus):
- 06/10 #561 onboarding v2 hand-off (D207) — with open packs bugs **agentflow-90vkj** (billable envelope regenerate loop) and
  **agentflow-gglqk** (keyless dedupe submit → no agreement envelope, sign step dead). Needs packs #3615 on staging MOSO (UNCONFIRMED live).
- 05/10 #553 Connect Google (D206) — @loanfactory.com Google accounts only; @viet18.com → 403 `GOOGLE_CONNECT_DOMAIN_NOT_ALLOWED`.
- 05/10 #557 Calendar events + Meet (D208/D211/D213/D214) — LO guest allowlist `bao.trinh+a3009f@loanfactory.com`; colleagues get real invites.
  Known gaps: **agentflow-a6pq1** (PENDING/LINK_PENDING rows never recovered automatically); no UI for FAILED/LINK_PENDING per D208 (FE may have added since, UNCONFIRMED);
  Done does not delete the 1-1 event; colleagues not editable on a reschedule of the recruiter Meet 1-1 (PATCH takes none).
- 05/10 #559/#562 invite and decline restricted to owner/requester/manager (D209/D210).
- 02/10 #523 follower cast role (D191).
- 30/09 #499 agreement send (D159/D180) with exact allowlist.

Other known issues / caveats:
- Done-validation errors (`meeting_date`, `lo_type`, NA/BLOCKED reason) are `IllegalArgumentException` → likely **HTTP 500** instead of 400 (UNCONFIRMED; D117 notes it).
- Staging data: HOT/Exceptions nearly empty (agentflow-q0k9); 7.2k real viet18 LOs — invite e-mails have **no recruit-side allowlist**.
- Two pods; settings cache 30 s per pod (D166): after an admin settings change wait ≥ 30 s.
- Business clock is Pacific (D199): "today", due dates and My-invites date filters roll over at midnight PT (= 14:00/15:00 Vietnam).
- 2026-10-12 (Columbus Day) is a business holiday in the SLA clock.
- `sla.no_claim_escalate_minutes` has no backend effect.
- Hand-off fallback: candidate with no eligible ONBOARDING user (role + grant e-mail) → plain invite e-mail is sent.
- Program member `/link` refuses accounts with unknown central `created_date` (CREATION_TIME_UNKNOWN, D202/#548).
- D183: a user id with no grant e-mail shows a blank name, never the UUID.
