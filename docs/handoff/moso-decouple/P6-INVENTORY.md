# P6 inventory: what still ties Recruit to old MOSO, and the moso-off switch

Bead: `agentflow-0gwad.7` (P6 preparation). Written 08/11/2026.

**Code read:** recruit-be `origin/master` at `e9272009c`, plus `4813d924e`. recruit-fe `origin/master` at `2c42f854`.

**Old MOSO** means three things (HANDOFF.md §2):
- packs + the moso GAE app (`www.loanfactory.com/api/*`, staging `www.viet18.com/api/*`);
- MOSO Datastore;
- moso-aid.

Out of scope: omni, notifier, cron-service-go, tera-core, gateway, auth-service SSO, user-service, zoom-go, ai-hr-be, Google, PayPal.

**How this was measured:**
- Each touchpoint was read in code (`git grep` / `git show`).
- Flag values come from `helm-chart/config/{staging,production}/values.yaml`. "absent" means the code default applies.
- No DB settings were read. Rows that depend on a DB setting say "not measured".
- recruit-be holds **no MOSO Datastore client** (`MosoImportExclusions.java:15-16`). Its Datastore reads happen outside recruit-be: the migration runner and `dsq_prod.sh`. So no Datastore row appears below.

## 0. The headline

| | Count |
|---|---|
| Backend touchpoints (rows with a status) | **44**, plus 3 rows that are archive or one-off |
| … replaced, live on staging | **15** |
| … replaced, code exists but dark | **2** |
| … **blockers** (no Recruit replacement yet) | **27** |
| Frontend message keys that name MOSO | **124** (122 distinct texts), in 10 groups |
| Frontend links that open a MOSO page | **0** |

**Independence on staging: 15 / 44 = 34%.**

Formula: **Replaced-on ÷ (Replaced-on + Replaced-dark + Blocker)**, over the backend rows in §1.
- Each row is one place where recruit-be talks to, waits on or relies on old MOSO.
- Rows marked n/a are excluded from both sides: Cold import (done), the stored "previous MOSO recruiter" name, and the sync-trace views (UI to delete in P6).
- Only backend rows count. The frontend strings follow the backend: each string disappears when its backend path does, so counting them would double-count.

**Production independence is lower: about 0%.**
- Almost every replacement flag is absent in production.
- Production still creates every lead from the MOSO push.
- It still sends invites, agreements and reminders through packs.

By group:

| Group | Rows | Replaced-on | Replaced-dark | Blocker | n/a |
|---|---|---|---|---|---|
| Outbound write (packs outbox) | 10 | 3 | 2 | 5 | 0 |
| Outbound read | 6 | 1 | 0 | 5 | 0 |
| Inbound push / MOSO-sourced data | 9 | 4 | 0 | 4 | 1 |
| Cron | 5 | 0 | 0 | 5 | 0 |
| Gate or rule | 5 | 3 | 0 | 2 | 0 |
| Secret / config | 7 | 2 | 0 | 5 | 0 |
| Data shown | 5 | 2 | 0 | 1 | 2 |
| **Total** | **47** | **15** | **2** | **27** | **3** |

Blockers by the phase that owes them:

| Owed by | Rows |
|---|---|
| P4 S4/S5: e-sign through document-esign, signed state (the MOSO agreement, its dry run, its reconcile, its welcome) | BE-03, BE-06, BE-15, BE-18 (signature half), BE-27, BE-34 |
| P4: D292 hand-off bell for MOSO-linked Loan Officers | BE-02 |
| P5: referral bonus state, referrer identity, Ambassador totals, referrer role, digest | BE-11, BE-12, BE-21, BE-23, BE-29, BE-30 |
| P5: moso-aid (LO Recruiter Program roster and member link) | BE-14, BE-28, BE-41 |
| **No phase owns it yet:** a recruiter's Zoom texting identity is their MOSO Admin key | BE-13, BE-42 |
| **No phase owns it yet:** the "next webinar" token and list dates still read the packs picker, even with Recruit webinars on | BE-45 |
| P6 itself: bridges that only exist to keep MOSO in sync, deleted at the cut | BE-04, BE-05, BE-22, BE-26, BE-35, BE-36, BE-39, BE-40 |

## 1. Backend inventory

Paths are under `src/main/java/com/loanfactory/recruit/`. Columns:
- **stg / prod**: the flag values.
- **Off today**: what happens when the client is not configured. The moso-off switch reuses this path.
- **Status**: Replaced-on, Replaced-dark or Blocker.

### 1a. Outbound write: `RecruitApiClient` through the packs outbox

| id | Call site and trigger | Business effect | Gate (default) | stg / prod | Replacement or phase | Status |
|---|---|---|---|---|---|---|
| BE-01 | `recruitapi/RecruitApiClient.java` invite (POST `/candidate/invite`). Called from the relay tick, from `PacksWritebackEnqueuer#enqueueInvite`, and from `OfferServiceImpl` (send) / `InviteResendServiceImpl` | Tells MOSO the Loan Officer is invited. MOSO mails the invite unless Recruit does (D331 record-only) | `packs-writeback` (false); `lo-mail-invite` (false) | true / true; lo-mail-invite true / absent | D331 Recruit invite mail (P2); D399 portal link | Replaced-on |
| BE-02 | invite, specialist kind. Called from `OnboardingSpecialistAssignmentServiceImpl:596` | Tells MOSO the onboarding specialist. The D292 "handed to you" bell rings only when MOSO accepts | packs-writeback + onboarding-writeback | true,true / true,true | Not needed for no-MOSO leads (D399 rings at send). MOSO-linked leads: owed by P4 | Blocker |
| BE-03 | onboardingMeeting. Called from `ChecklistItemServiceImpl:641` (1-1 Done) | MOSO builds and sends the agreement (W-2/1099, legal name) plus `pre_onboarding_done` | onboarding-writeback, -hire-classification, -legal-name, -v2-handoff | all true / all true | P4 S4/S5 e-sign | Blocker |
| BE-04 | sync. Called from `CandidateServiceImpl:281`, `HireClassificationWriter:97`, `ChecklistItemServiceImpl:645`, `ExperienceBackfillService:152` | Pushes company, sponsor states, lo_type and experience level to MOSO | packs-writeback; hire-classification; setting `packs.writeback.experience_enabled` | true / true; setting not measured | Bridge, delete in P6 | Blocker |
| BE-05 | sync (identity) and emailAvailable, from `packswriteback/identity/MosoFieldSync` | D303: name, phone, NMLS and e-mail fixes go to MOSO; e-mail checked for "taken" first | identity-writeback, identity-writeback-email | true,true / true,true | Bridge, delete in P6 | Blocker |
| BE-06 | agreementSend. Called from `AgreementSendServiceImpl:189` | A Recruit click sends MOSO's e-sign agreement | `agreement-send` AND hire-classification | true / absent | P4 S4/S5 | Blocker |
| BE-07 | meetingReminder. Called from `JdbcOnboardingReminderLedger:116` and `OnboardingReminderTickServiceImpl` | 1-1 reminder mail sent by packs | onboarding-reminders; `lo-mail-reminders`; setting delivery_mode (not measured) | true,true / true,absent | D329 Recruit sends the reminder | Replaced-on |
| BE-08 | portalState. Called from `OfferServiceImpl:862/887` and `OnboardingTokenService:101` | D376: marks the row as Recruit-portal and mirrors paid/signed | `portal-moso-mirror` | "false" / absent | Bridge, delete in P6 | Replaced-dark |
| BE-09 | registerWebinar (plus GET `/webinars`). Called from `FollowUpServiceImpl:800` (only when webinar-schedule is off) | Registers the Loan Officer for a MOSO webinar; MOSO mails the confirmation | packs-writeback; `webinar-schedule` off | Recruit sessions on staging / MOSO path in prod | D359–D361, D392 own webinars; D330 mail | Replaced-on |
| BE-10 | portalUnmark, from `packswriteback/controller/PortalUnmarkController` | Admin undoes the D376 mark | SETTINGS_MANAGE | n/a | Bridge, delete in P6 | Replaced-dark |

### 1b. Outbound read

| id | Call site and trigger | Business effect | Gate | Off today | Replacement or phase | Status |
|---|---|---|---|---|---|---|
| BE-11 | `read /referrals/byOwner`, via `referralview/client/RecruitApiReferralOwnershipClient:137`, for My referrals, admin Referrals and CSV export | MOSO is the source of referrals and bonus state | setting `referrals.enabled` (not measured) | 503 `REFERRALS_UNAVAILABLE` | P5 referral bonus | Blocker |
| BE-12 | `read /referrers/resolve`, from `ReferrerIdentityServiceImpl:55`, `MosoLoanOfficerCheck` (D374), `DefaultReferralLinks:80` | Maps a person to their MOSO Admin key; "is a Loan Officer"; site domain | same | 503; the Loan Officer check falls back to roles; the link falls back to the /join slug | P5 | Blocker |
| BE-13 | `read /referrers/resolve`, from `zoomlink/ZoomLinkAutoLinkService:146/239` | D358: a recruiter's Zoom texting identity is their MOSO Admin key | `zoom-link-autolink` | caught, retried; new staff get no SMS identity | **No phase owns it.** zoom-go `los_user_id` is the old-LOS key | Blocker |
| BE-14 | `read resolve`, from `ProgramMemberLinkService:306` | D202: checks that a Program member's e-mail is that MOSO Admin | system actor | 503 "MOSO is unavailable" | P5 moso-aid | Blocker |
| BE-15 | agreementDryRun, from `AgreementStatusServiceImpl:112`, `AgreementSendServiceImpl:229`, `MosoSignedReconcileTickService:319` | Agreement status card; pre-send check | agreement-send | status carries a reason, no throw | P4 S4/S5 | Blocker |
| BE-16 | `webinar/WebinarClient:152-171` (packs webplus getNextWebinars), from the picker, `SourceDetailDecorator`, `WebinarFollowUps`, `NurtureTemplateVariables`, `WebinarConfirmationMail` | MOSO webinar picker, list dates, session dating | `RECRUIT_WEBINAR_BASE_URL` | UNAVAILABLE, never throws | Picker replaced by D392 `CallWebinarPick` (webinar-schedule) | Replaced-on |

### 1c. Inbound push and MOSO-sourced data

| id | Site | Business effect | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-17 | `moso/controller/PublicWebhookController:92`, then `MosoWebhookHandler` and `MosoRowUpsertServiceImpl` | **Creates and updates every production lead** | `MOSO_WEBHOOK_API_KEY` | secret / secret | D356 lead intake (stg true / prod absent); D382/D393 Add lead. P3 forms, FB ads and Calendly still owed | Replaced-on |
| BE-18 | `MosoRowUpsertServiceImpl:745-751,1567`; `ExceptionsController:70-109` (D287) | Fee paid / agreement signed in MOSO moves the Recruit offer | — | — | Fee: D375 PayPal (stg on / prod absent). Signature: P4 S5 | Blocker |
| BE-19 | `MosoRowUpsertServiceImpl:556`, then `WebinarSignalCloser` | D277: a MOSO webinar registration or attendance closes follow-ups | `webinar-signals` | true / true | D359–D365 own sessions + Meet attendance | Replaced-on |
| BE-20 | `MosoOwnerSync:135/170` | D310: the S5–S7 owner follows MOSO's recruiter | `moso-owner-sync` | true / true | Native claim/transfer, D338 auto-assign | Replaced-on |
| BE-21 | `MosoRowUpsertServiceImpl:362/500/1497` | Referrer and program credit taken from MOSO fields | — | — | Intake carries referredBy (D339); bonus state owed by P5 | Blocker |
| BE-22 | `MosoRowUpsertServiceImpl:540/1173` (`afterMosoPush`), meeting auto-close; `moso_onboarding_specialist` read in `OnboardingSpecialistAssignmentServiceImpl:504-507,610` | MOSO echoes that unfreeze D303 fields; the MOSO_FIELD_CHANGED bell | — | — | Goes with BE-04/05 (P6) | Blocker |
| BE-23 | `ReferralActivityTotalsController:73`, then `ReferralTotalsPacksReader:82` (called by moso-aid) | Ambassador Activity totals, read from packs | `RECRUIT_REFERRALS_INTERNAL_API_KEY` | secret / secret | P5 | Blocker |
| BE-24 | `registerstatus/controller/RegisterStatusController:68` | Pay gate for MOSO's `/register-loan-officer?key=` page (called by lf/lo-homepage) | public | live | D368 P4 S1/S2 portal (stg on / prod absent) | Replaced-on |
| BE-25 | `moso/controller/MosoImportController` | Cold import from an uploaded export (no network call) | IMPORT_RUN | — | Done once, prod 31/10 | n/a |

### 1d. Cron

| id | Registrar / tick | Effect | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-26 | `PacksWritebackTickCronRegistrar:53`, `PacksWritebackTickServiceImpl#tickOnce` | Delivers BE-01..BE-09 | `PACKS_WRITEBACK_INTERNAL_API_KEY` | secret / secret | Carries the blockers above | Blocker |
| BE-27 | `MosoSignedReconcileTickCronRegistrar:47`, `MosoSignedReconcileTickService` | D246: polls MOSO for signed agreements every 20 min | `moso-signed-reconcile` (true) | true / true | P4 S5 (DE COMPLETED event); keep for in-flight Loan Officers | Blocker |
| BE-28 | `ProgramSyncTickCronRegistrar:36`, `ProgramSyncService`, then `MosoAidRosterClient:88` | D202: Recruiter Program roster from moso-aid | setting `program_sync.mode` (not measured) | — | P5 moso-aid | Blocker |
| BE-29 | `ReferralNoticeCronRegistrar:44`, `ReferralNoticeTickServiceImpl` | D317: referrer digest mail (reads packs referrals) | `referrals-notify` | true / absent | P5 | Blocker |
| BE-30 | `ReferrerRoleSweep:79-109` on the RBAC reconcile tick | D326: grants REFERRER from packs referrals | `referrer-role` | true / true | P5 | Blocker |

### 1e. Gates and rules

| id | Site | Rule | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-31 | `candidate/MosoRecordRequiredFlag` (`OfferServiceImpl:172/745`, `InviteResendServiceImpl:134`, `FollowUpServiceImpl:568`) | A lead with no MOSO record cannot be invited | `moso-record-required` (true); `portal-join-link` | "false",true / absent,absent | D382 + D399 | Replaced-on |
| BE-32 | `MosoLink.isLinked` in offer, resend, delivery, dedup | `legacy_key` picks the packs path or the portal path | — | — | D399 / D382 | Replaced-on |
| BE-33 | `OnboardingSpecialistAssignmentServiceImpl:119/133` | D370: auto-pick only specialists MOSO knows | `ob-auto-pick-moso-known` | "false" / absent | D397 | Replaced-on |
| BE-34 | `onboarding/mail/WelcomeMail:76-80` | Welcome is skipped as SENT_BY_MOSO when the 1-1 write-back is on and the Loan Officer has a MOSO record | write-back flags | on / on | Tied to BE-03 / P4 | Blocker |
| BE-35 | `RecruitApiClient` actor header | Every call acts as a MOSO Admin holding RECRUITING (A-019) | — | — | Goes away in P6 | Blocker |

### 1f. Secrets and config (key names only)

| id | Keys | stg / prod | Used by | Status |
|---|---|---|---|---|
| BE-36 | `RECRUIT_API_BASE_URL` (values), `RECRUIT_API_KEY` (secret) | viet18 / loanfactory `/api/recruit/v1` | everything in 1a/1b | Blocker |
| BE-37 | `RECRUIT_WEBINAR_BASE_URL` (+ namespace, type) | viet18 / loanfactory webplus | BE-16 | Replaced-on |
| BE-38 | `MOSO_WEBHOOK_API_KEY` | both | BE-17 | Replaced-on |
| BE-39 | `RECRUIT_API_FALLBACK_ACTOR_EMAIL`, `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL`, `RECRUIT_MOSO_SIGNED_RECONCILE_ACTOR_EMAIL`, `RECRUIT_PACKS_WRITEBACK_RETRY_UNKNOWN_ACTOR_AS_SYSTEM` | set / partly set | BE-35 | Blocker |
| BE-40 | `PACKS_WRITEBACK_INTERNAL_API_KEY`, `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY`, `RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY` | all three / first two | BE-26/27/29 | Blocker |
| BE-41 | `RECRUIT_MOSO_AID_BASE_URL`, `RECRUIT_MOSO_AID_ROSTER_KEY`, `RECRUIT_PROGRAM_SYNC_INTERNAL_API_KEY`, `RECRUIT_PROGRAM_SYNC_MOSO_APP_ID/NAMESPACE`, `RECRUIT_REFERRALS_INTERNAL_API_KEY` | both | BE-28 / BE-23 | Blocker |
| BE-42 | `RECRUIT_ZOOM_LINK_AUTOLINK_MOSO_APP_ID/NAMESPACE` | both | BE-13 | Blocker |

### 1g. Data shown

| id | Site | What users see | Replacement | Status |
|---|---|---|---|---|
| BE-43 | `template/lomail/MosoApplyLinks` (invite, welcome, invite reminder) | Mail links to MOSO's `/apply_loan_officer?key=` | D399 portal link (no-MOSO leads); under moso-off, everyone | Replaced-on |
| BE-44 | `moso/MosoRowMapper:1070-1166` (`MosoProfileFields`) | Profile fields mirrored from MOSO | D368/D372 portal profile save | Replaced-on |
| BE-45 | `NurtureTemplateVariables:90-106`, `SourceDetailDecorator:225-245` | "Next webinar" token and list dates still read the packs picker | none | Blocker |
| BE-46 | `PreviousMosoRecruiterName` | Previous recruiter (stored, no call) | archive data | n/a |
| BE-47 | Sync trace, failure desk, field-sync views, Exceptions moso-sync, My invites reason codes | MOSO sync views | P6 removal | n/a |

## 2. Frontend inventory (recruit-fe `2c42f854`)

- **No link opens a MOSO page.** There is no `href` to MOSO admin, `apply_loan_officer` or moso-aid.
- **No inline English copy names MOSO.** Every inline `'…MOSO…'` literal is an enum or reason code.
- The only remote MOSO asset is the Loan Officer photo (`CandidateDrawer/LoAvatar.tsx:22`).

**124 English message keys name MOSO.** The `vi` files mirror them one for one.

| Group | Keys | Where (`src/messages/en/`) | Recruit replacement in the UI |
|---|---|---|---|
| A. Exceptions "Signed in MOSO" desk | 13 | `exceptions.json` 13–111 | None; the section only reconciles MOSO. Delete in P6 |
| B. Sync trace | 19 | `syncTrace.json`, `drawer.json:262` | None needed; a MOSO debugging view. Delete in P6 |
| C. Invite / offer delivery | 24 | `invite.json`, `invites.json`, `notifications.json:77` | Partly: the Recruit mail path and D382/D399 |
| D. Onboarding 1-1 write-back | 24 | `workQueue.json`, `settings.json:196` | Partly: `writeback_enabled=false` makes it a Recruit checklist item (what moso-off does) |
| E. Agreement / e-sign (MOSO Inkless) | 26 | `agreement.json`, `candidateEdit.json:42-44` | None; owed by P4 S4/S5 |
| F. Profile MOSO facts, legal name | 10 | `drawer.json`, `notifications.json:69-70` | Read-only imported fields; archive |
| G. Zoom identity | 4 | `connections.json:71-74`, `conversation.json:97` | Yes: native Connect Zoom (zoom-go OAuth) |
| H. Referrals | 1 | `referrals.json:78` (possibly orphaned) | No (P5) |
| I. Permissions | 2 | `permissions.json:40,47` | n/a (migration grant) |
| J. Audit | 1 | `audit.json:53` | n/a |

About 100 more keys sit on MOSO data without naming MOSO: the `moso_*` keys in `exceptions`, `drawer`, `notifications`, `candidateEdit` and `callWorkspace`.

Screens that work only on MOSO data:
- Exceptions moso-sync
- the drawer Sync tab
- the D303 field-sync notes
- the agreement card
- the 1-1 "Send again"
- the W-2/1099 warnings
- the invite gate
- the source chip from MOSO labels
- the duplicates survivor pick
- My referrals / All referrals
- Program members (hidden)

All are fed by the backend rows above, so each disappears or degrades with its backend row.

## 3. The moso-off switch (D414, recruit-be #909)

**`recruit.features.moso-off`.** Default false. Staging entry `RECRUIT_FEATURES_MOSO_OFF: "false"`. Production has no entry.

When ON:

| Touchpoint | Behaviour when ON | Rows |
|---|---|---|
| `RecruitApiClient` | `isConfigured()` is false; `send()` refuses `NOT_SENT` before any socket. Every existing "not configured" path applies: relay tick and reconcile idle (counted), Agreement send NOT_CONFIGURED, referrals 503, Zoom auto-link skips, email check empty | BE-01..15, 26, 27 |
| `PacksWritebackEnqueuer` | Disarmed. No row of any kind is queued, so there is no stale backlog when reverting. Every "MOSO write-back on?" answers false, so the 1-1, the invite (no D207 hand-off) and the welcome take Recruit's own paths | BE-01..09, 34 |
| `IdentityWritebackFlags` | D303 off; fields are Recruit's own | BE-05, 22 |
| `WebinarClient` | UNAVAILABLE | BE-16, 45 |
| `MosoAidRosterClient` | NOT_CONFIGURED; the program sync changes nothing | BE-28 |
| `PublicWebhookController` | Key checked, then 200 and the body dropped (nothing stored) | BE-17..22 |
| `MosoRecordRequiredFlag` | No MOSO record required (an invite still needs Recruit's portal link to be live) | BE-31 |
| `PortalJoinLinks` / `MosoApplyLinks` | Every Loan Officer gets the portal link; a MOSO URL is never printed. With no portal link the mail is refused, never sent with a dead link | BE-43 |
| `PortalUnmarkController` | 409 `MOSO_OFF` | BE-10 |

**Measuring it:**
- Every skip logs `moso_off_skip target=<packs|moso|moso-aid|moso-push> op=<…>`.
- Each skip also adds to `recruit.moso_off.skipped{target,op}`.
- `GET /api/v1/admin/moso-off` (SETTINGS_MANAGE) returns `{moso_off, skipped_since_pod_start}` for the pod that answers.

**Not faked:** every blocker in §0 stays a blocker. Under the switch it degrades to its existing "unavailable" or "not configured" answer:
- referrals show "temporarily unavailable" (503);
- the agreement card says MOSO e-sign is not available;
- the moso-aid roster does not sync;
- new recruiters get no Zoom texting identity from MOSO;
- the next-webinar token is empty.

**Known gaps in the switch:**
- `enqueueIdentityWriteback`, `enqueueAgreementSend` and `enqueueMeetingReminder` have no guard of their own. They rely on their callers' gates, which all answer "off" under the switch (`IdentityWritebackFlags`, `isConfigured()`). A future caller must keep that.
- The referrals 503 says "REFERRALS_UNAVAILABLE", not "MOSO is off". The frontend may match that exact text, so it was left alone.

## 4. Runbook: flip moso-off on STAGING (after the demo, from Wed 11/11 VN)

Do not flip before the Victoria demo ends (Tue 10/11 22:00 VN). **Never in production.**

### 4.1 Before the flip (baseline, 10 minutes)
1. Write down the pending outbox, because rows queued before the flip stay PENDING:
   - `bash ~/.cache/claude-recruit/pgq_stg.sh recruit "select payload_kind, status, count(*) from packs_writeback_outbox group by 1,2 order by 1,2"`
   - Also note the newest `webhook_events` row time: `select provider, max(created_date) from webhook_events group by 1`.
   - **Baseline measured 08/11 ~17:00 VN:** INVITE 4 PENDING, 17 DEAD_LETTER, 109 SENT, 1 SKIPPED; ONBOARDING_MEETING 54 SENT, 4 DEAD_LETTER; ONBOARDING_SPECIALIST 29 SENT, 10 DEAD_LETTER; PROFILE_WRITEBACK 26 SENT, 13 DEAD_LETTER, 14 SKIPPED; WEBINAR_REGISTRATION 7 SENT, 3 DEAD_LETTER; MEETING_REMINDER 6 SENT, 1 SKIPPED; AGREEMENT_SEND 2 SENT. Re-measure on the day: the 4 PENDING INVITE rows are the ones that would flush when reverting.
2. Error baseline for the last 24 hours (Cloud Logging, recruit-be staging, severity>=ERROR): count by logger.
3. Confirm the admin endpoint answers `moso_off:false`:
   - `curl -sS -H "Authorization: Bearer $(cat ~/.cache/claude-recruit/preview/stg_3370.token)" https://gateway.viet18.com/recruit-svc/api/v1/admin/moso-off`

### 4.2 Flip
1. In recruit-be, open a PR that changes `RECRUIT_FEATURES_MOSO_OFF` to `"true"` in `helm-chart/config/staging/values.yaml` only.
2. Squash-merge it on green, then promote: `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<sha>`.
3. Check the env on each pod:
   - `kubectl --context gke_lender-rate_us-central1_moso-gke -n recruit-be get deploy recruit-be -o jsonpath='{..env[?(@.name=="RECRUIT_FEATURES_MOSO_OFF")].value}'`
   - Use the staging context your notes give (`lenderrate-master`). Read flags only.
4. The startup log must show `recruit.features.moso-off is ON`.

### 4.3 Measure (first 2 hours, then again after 24 hours)

| What | How | Expected |
|---|---|---|
| Skips by target | `GET /admin/moso-off` on each pod; Cloud Logging `moso_off_skip` | Grows for `packs relay tick`, `packs signed reconcile tick`, `moso-push listener`; no other `packs …` op unless a user hit a blocker |
| No MOSO traffic | Cloud Logging: no `Packs writeback … delivered`, no `RecruitApiClient` HTTP errors | 0 |
| No new outbox rows | the outbox query again | Counts unchanged |
| No new MOSO pushes stored | `select provider, max(created_date) from webhook_events group by 1` | The MOSO provider's max is unchanged since the flip |
| New ERRORs | severity>=ERROR vs the baseline | No new logger; any new one is a bug in the switch (file a child of 0gwad.7) |
| Invite a test lead with a MOSO record (`bao.trinh+<tag>@loanfactory.com` only, not a +stg demo lead) | UI: Pipeline → lead → Invite | Offer SENT; Recruit invite mail with the `?invite=` portal link; no packs INVITE row |
| 1-1 Done on that lead | Today / Onboarding | Checklist item done, no "Sync pending"; Recruit welcome mail with the portal link; **no agreement** (blocker BE-03) |
| Add lead / lead intake | Pipeline → Add lead; /join on lf staging | Lead created in Recruit |
| Webinar | Call outcome → Webinar | Recruit sessions (D392) are listed; the next-webinar token in nurture mail is empty (BE-45) |
| Screens expected to degrade (blockers, not regressions) | My referrals / All referrals; agreement card; Settings → Program members; Zoom auto-link for a new recruiter | 503 "temporarily unavailable"; "agreement not available"; roster unchanged; no auto-link |

Record the numbers in this file under a new heading "Staging flip <date>".

### 4.4 Revert (one value, about 10 minutes)
1. PR `RECRUIT_FEATURES_MOSO_OFF: "false"`, merge, promote, and check the env as in 4.2.
2. Rows queued **before** the flip deliver again: the relay resumes. Look at the 4.1 list first. If an INVITE or MEETING_REMINDER row is older than a day, mark it SKIPPED by hand rather than mailing late (ask first).
3. **MOSO pushes received while ON are lost:** the listener answered 200, so packs will not resend. A row MOSO changed during the window updates on its next MOSO save. If the window was long, run the MOSO reconcile or import for the leads touched in that window before trusting their MOSO-sourced fields.
4. Writes skipped while ON (identity fixes, lo_type, experience, specialist) are **not** replayed. MOSO keeps its older values for those leads until the next edit. That is acceptable on staging.

## 5. Questions for Bao (each with a recommendation)

1. **Zoom texting identity (BE-13/42).** It is keyed by the MOSO Admin key, and no phase owns it. **Recommendation:** add it to P5 as "Zoom identity from zoom-go OAuth only". Native Connect Zoom already exists, so moso-off just stops auto-linking new recruiters.
2. **Next-webinar token (BE-45).** **Recommendation:** a small P3b follow-up that reads Recruit's own schedule.
3. **Flip date.** **Recommendation:** Wed 11/11 morning VN, as the team lead proposed, for 24 hours, then decide whether staging stays MOSO-off. The agreement (P4 S4/S5) is the one flow staging loses while it is on.
