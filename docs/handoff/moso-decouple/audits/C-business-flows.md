# Auditor C — Recruit → MOSO dependencies, traced by business flow + runtime config

## 1. Header: what was read

| Repo | Ref read | Notes |
|---|---|---|
| recruit-be | `8c064b0d` (pinned) | all paths below are `src/main/java/com/loanfactory/recruit/...` unless shown otherwise |
| recruit-fe | `0b353055` (pinned) | traced by a read-only helper; findings merged in §2.Z and the master table |
| packs | `origin/master` = `a27b8ccd99c`; release `origin/3.64.1` = `c413802c8f1` | `loan/src/main/java/com/mvu/loan/server/...` |
| moso-notifier | `origin/master` = `c8f56ed7` | now "notifier-be" (README), still the MOSO notification service |
| omni-service | `origin/master` = `d59d267` | |
| moso-aid | `origin/master` = `17aa1e7` | |
| moso, base, moso-configuration | `origin/master` (looked up, no recruit-facing code found in them) | |

Method: business flow → recruit-fe click → recruit-be controller → service → every outbound call / inbound feed / data source, then followed into the MOSO repo to confirm the other side. Runtime status from `src/main/resources/application.yml` defaults + `helm-chart/config/{staging,production}/values.yaml` + Flyway seeds of `recruit_settings`.

**Status legend**
- **PROD-live** — the code path runs in production per repo config.
- **staging-only** — env flag set to true only in `helm-chart/config/staging/values.yaml`; production values.yaml has no entry, so the `application.yml` default (`false`) applies.
- **flag-off** — off in both environments per repo config, or gated by a runtime `recruit_settings` row whose seed is off.
- **dead code** — wired to a no-op, or no route reaches it.

**Config caveat that applies to every status below.** Both clusters also load `envFrom: secretRef recruit-svc-secret` (`helm-chart/templates/deployment.yaml:46-48`). Staging's copy is rebuilt from Secret Manager. Production's copy is hand-made (`BOOTSTRAP.md:22-28`). Neither copy is in the repo. Any key in that Secret could override a flag, so "staging-only/flag-off" means "per the repo". `recruit_settings` rows can also be edited at runtime (`/api/v1/admin/settings`). Seed values are not proof of today's production values.

**Key config anchors (recruit-be `application.yml` @8c064b0d)**
- `moso.webhook.api-key` ← `MOSO_WEBHOOK_API_KEY` :944 (secret)
- `recruit.recruit-api.base-url` ← `RECRUIT_API_BASE_URL` :580; `api-key` ← `RECRUIT_API_KEY` :584 (secret)
- `recruit.webinar.base-url` :630, `namespace` default `5716104026521600` :631
- `recruit.program-sync.moso-aid-base-url` :923, `moso-aid-roster-key` :924 (secret), `moso-app-id` :930, `moso-namespace` :931
- `core.notification-service.event-topic` default `NOTIFICATION_EVENT_TOPIC` :162, `template-topic` `CREATE_TEMPLATE_TOPIC` :163
- `recruit.mail-status.topic` default `STATUS_MAIL_TOPIC` :326
- `recruit.omni.base-url` :235, `internal-api-key` :236 (secret), `outbound-sent-topic` `omni-outbound-sent` :267, `tenant-id` `LOAN_FACTORY` :275
- feature flags :367-549. Every one defaults to `false` except `moso-signed-reconcile` (`true`, :549) and `omni.inbound-reply-enabled` (`true`, :234).

**Production env (values.yaml @8c064b0d) that touches MOSO:** `RECRUIT_API_BASE_URL=https://www.loanfactory.com/api/recruit/v1` (:56-57), `RECRUIT_WEBINAR_BASE_URL=https://www.loanfactory.com/api/webplus/v1` (:58-59), `RECRUIT_OMNI_BASE_URL=http://omni-service.omni-prod...:8080` (:28-29), `RECRUIT_OMNI_INBOUND_REPLY_ENABLED=true`, `RECRUIT_OMNI_OUTBOUND_SENT_SUBSCRIPTION=omni-outbound-sent.recruit-be`, `RECRUIT_OMNI_FOLLOWER_ROLE_ENABLED=true`, `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL` and `RECRUIT_MOSO_SIGNED_RECONCILE_ACTOR_EMAIL` = the IT department's MOSO Admin (:52-55), `RECRUIT_PROGRAM_SYNC_MOSO_APP_ID=s~lender-rate`, `..._NAMESPACE=5716104026521600` (:88-91), `RECRUIT_FEATURES_ONBOARDING_REMINDERS=true` (:86-87), `PUBSUB_PROVIDER=google` (:24-25), project `lender-rate` (:22-23).
**Not set in production (so default false):** `RECRUIT_FEATURES_PACKS_WRITEBACK`, `_ONBOARDING_WRITEBACK`, `_ONBOARDING_V2_HANDOFF`, `_ONBOARDING_HIRE_CLASSIFICATION`, `_ONBOARDING_LEGAL_NAME`, `_AGREEMENT_SEND`, `_NURTURE_DRIP`, `_SCHEDULED_SEND_INFO`, `_WEBINAR_SIGNALS`, `_OMNI_REPLY_ADDRESS`, `_MAIL_STATUS_INTAKE`, `_GOOGLE_CALENDAR_EVENTS`, `_MEET_ATTENDANCE`, `RECRUIT_PLATFORM_INBOX_ENABLED`, `RECRUIT_OMNI_MEET_CALLS_ENABLED`, `_NATIVE_CANDIDATE_CREATE`, `_USER_SERVICE_SYNC`. All of these except the last two are set `true` on staging (staging values.yaml :71-148).

---

## 2. Flow by flow

### 2.A Loan Officer intake — realtime MOSO push (the only way a new candidate is created)

Path: MOSO `LORecruiting` save → packs type watcher → GAE task → `POST https://gateway.loanfactory.com/recruit-svc/public/v1/webhook/moso/listener` → recruit-be `PublicWebhookController` → `MosoWebhookHandler` → `MosoWebhookSyncService` → `MosoRowUpsertService`.

- **C-001 MOSO realtime LORecruiting push (inbound webhook).** packs `type_watcher/RecruitLORecruitingWatchers.java:35` → `SyncLORecruitingToRecruitHandler.checkAndSync` (60 s memcache debounce, `QueueType.MCP` task) → `op/SendLORecruitingToRecruitOp.java:54-55` (hard-coded prod/staging gateway URLs, header `x-api-key` = MOSO SystemProp `recruit_webhook_api_key` :49/:95-97). This is present on both packs master and 3.64.1. recruit side: `moso/controller/PublicWebhookController.java:47-61` (fail-closed key check) → `moso/MosoWebhookHandler.java:72-150` (persist-first to `webhook_events`, dedup by `__key` + content hash). Category: **Data-read (inbound feed)**. Status: **PROD-live** (code + prod gateway URL in packs; key in `recruit-svc-secret`). If MOSO disappears, no new Loan Officer enters Recruit, and no field changes, stage moves, signatures, STOP opt-outs or webinar registrations arrive. Size **L**.
- **C-002 Native candidate creation is disabled, so MOSO is the only door.** `candidate/NativeCandidateCreateFlag.java:7-24` (`recruit.features.native-candidate-create`, default false, unset in both values files). `candidate/facade/impl/CandidateFacadeImpl.java:128` refuses `POST /candidates` with `MOSO_ONLY_MESSAGE` ("New Loan Officers come in from the Loan Factory…", NativeCandidateCreateFlag.java:18). `ModexSyncServiceImpl` may only enrich. Category: **Data-write gate / Implicit**. Status: **PROD-live** (the refusal is live). If MOSO disappears, Recruit has no way to add a Loan Officer until this flag is flipped and tested. Size **M** (the flag exists; the rest of the app assumes `legacy_key`).
- **C-003 Field mapping of the MOSO row (`MosoRowMapper`, 1,832 lines).** The fields read include `__key`, first/last/legal names, email, phone, `nmls`, `originator_nmls`, `company_name`, `company_nmls`, `nmls_status`, `currently_licensed`, `sponsor_states`, `active_license_items`, `applied_for_sponsorship`, `nmls_sponsor_first_day/last_day`, `home_state`, address and mailing address, `experience`, `total_closed_loan`, `total_volume`, `avg_rating`, `total_reviews`, `target_compensation`, `preferred_languages`, `lo_labels`, `status`, `out_source_status`, `recruiting_type`, `recruiter` (owner), `referred_by`/`referrer_*`, `source`/`referred_source`/`referred_section`, `is_from_fb_ad`, `register_for_webinar`/`webinar`/`is_attended`/`duration`/`last_registration_at`, `waive_startup_fee(_reason)`, `paid_startup_fee`, `lo_agreement_signed`, `completed_detail_form`, `is_corporate_loan_officer`, `onboarding_meeting_status`, `onboarding_specialist`, `hr_status`, `terminate_date`/`terminate_reason_detail`, the `lead_origin*` stamp, `note`, `avatar`/`bio`/`website`/social links (`moso/MosoRowMapper.java`, e.g. :49-52, :136, :319, :656-696, :958-1080, :1315-1357, :1529-1530, :1604-1608, :1728-1763). Category: **Data-read**. Status: **PROD-live**. If MOSO disappears, every profile, licensing, production and fee field stops updating. Size **L**.
- **C-004 Stage, offer and fee state derived from MOSO.** `moso/service/impl/MosoRowUpsertServiceImpl.java` creates the candidate (:228), updates it (:307), records stage history with SYSTEM/MOSO source (:1160), materializes offers from MOSO fee/invite/signed flags (`materializeOffer` :1363), heals SENT→SIGNED (`healSignedFromMoso` :610), maps owner (`applyImportedOwner` :1210), and writes genesis referral attribution (:1270). `moso/JoinPageFeeWaiver.java` handles the fee-waiver quirk of the /join page. Category: **Data-read + Implicit**. Status: **PROD-live**. Size **L**.
- **C-005 STOP / opt-out suppression arriving through the push.** packs `SendLORecruitingToRecruitOp.isStopArchived` scans archived rows' notes for the STOP marker (packs master `SendLORecruitingToRecruitOp.java:~115-140`). recruit `MosoRowUpsertServiceImpl.createSuppressions` :1446. Category: **Data-read (compliance)**. Status: **PROD-live**. If MOSO disappears, a STOP sent to MOSO's SMS automation no longer reaches Recruit. Size **M**.
- **C-006 Merge and dedup keyed on MOSO keys.** `mergedLogOnly` :525 and `resolveSurvivor` :543. `dedup/service/impl/DedupServiceImpl.java` (21 MOSO references) carries `legacy_key`s of merged losers. Category: **Implicit-identity**. Status: **PROD-live**. Size **S**.
- **C-007 Sync trace and the "MOSO sync" Exceptions inbox.** `synctrace/service/impl/SyncTraceServiceImpl.java` shows webhook events and packs writebacks per candidate. `inbox/service/impl/MosoSyncExceptionsServiceImpl.java` and `MosoSyncHandledServiceImpl` list SIGNED_WITHOUT_SENT, CLOSED_OFFER_EXISTS, SIGNED_HEAL_BLOCKED and FEE_DISAGREEMENT between Recruit and MOSO (`inbox/controller/ExceptionsController.java`, table `moso_sync_handled`). Category: **Data-read / UI**. Status: **PROD-live** (no flag). If MOSO disappears, this part of the feature becomes moot; the other Exceptions tabs are local. Size **S**.

### 2.B Bulk Loan Officer migration / Cold pool stock

- **C-008 One-shot MOSO export → import.** `scripts/moso-migration-runner.py:1-30, :77` calls MOSO `POST {www.viet18.com|www.loanfactory.com}/exec/ExportLORecruitingForMigrationOp` with a MOSO **admin cookie session** (`EXPORT_COOKIE`/JSESSIONID + `user` header, :63-70), for the kinds `lo_recruiting`, `black_list`, `sms_opt_out`, `email_opt_out` and `call_opt_out` (:41-43). It then POSTs the rows to recruit `POST /api/v1/admin/import/moso` (`moso/controller/MosoImportController.java:18`) and `/moso/profile-fields` (:28). The packs op exists on master and 3.64.1 (`loan/.../op/ExportLORecruitingForMigrationOp.java`). `ownerMap` translates MOSO recruiter keys to central account ids (`moso/model/request/MosoImportRequest.java`). Category: **Data-read (bulk import) + Auth (MOSO admin session)**. Status: **PROD-live as a capability**; it is run by hand. The Cold pool, the blacklist and the SMS/email/call opt-out ledgers are seeded from it. If MOSO disappears, the Cold stock can no longer be re-imported or reconciled, and the opt-out ledgers lose their source of truth. Size **L** (106k RLO + 23k ILO per the script docstring :28-29).
- **C-009 MOSO opt-out ledgers as compliance source.** The kinds above (`MosoImportRequest.Kind` BLACK_LIST, SMS_OPT_OUT, EMAIL_OPT_OUT, CALL_OPT_OUT). Category: **Data-read (compliance)**. Status: **PROD-live** (one-time plus reruns). Size **M**.

### 2.C Login / session / users / roles

- **C-010 Identity = the central platform (api-gateway-v2 / user-service / auth-service), NOT MOSO — BORDERLINE.** recruit-be keys every user on the central `user_id` that api-gateway-v2 injects as `X-User-ID` (`rbac/entity/RbacGrantEntity.java:38-42`). The directory comes from `{CENTRAL_GATEWAY_BASE_URL}/user-svc/api/v1/users/all` (`rbac/directory/CentralDirectoryClient.java:50, :54, :88`); prod `CENTRAL_GATEWAY_BASE_URL=https://gateway.loanfactory.com` (values.yaml :40-41). Category: **Auth / Users&Roles**. BORDERLINE: these services are not in the MOSO repo list, but they share MOSO's GKE cluster and the gateway host. Status: **PROD-live**. Size **L** if counted.
- **C-011 Every write that MOSO performs needs a MOSO Admin acting as the recruiter.** `recruitapi/ActorEmailResolver.java` maps the central id to the email on the RBAC grant. packs RecruitAPI then resolves that email to a **MOSO Admin** ("Admin key, then email, then company_email, then credential", packs `docs/RECRUIT-API.md`) and refuses actors without the MOSO **RECRUITING** permission (`RecruitApiClient.java:103` `MOSO_ACTOR_LACKS_RECRUITING`; packs RecruitAPI :892-902). Recruiters, managers and OB staff must therefore exist as active MOSO Admins with the right permissions. Category: **Users&Roles**. Status: **PROD-live** for the reads (referral view, agreement dry run, signed reconcile all use the prod MOSO Admin `it.dept@…`). Writes are staging-only (see 2.F). Size **M**.
- **C-012 Onboarding specialists = MOSO `Admin.is_onboarding_specialist`.** `onboarding/service/impl/OnboardingSpecialistAssignmentServiceImpl.java` javadoc: "MOSO is the authority on who is a valid Admin.is_onboarding_specialist". A packs refusal is stamped on `rbac_grants.moso_specialist_refused_at` (`RbacGrantEntity.java:77-81`), with a hold from setting `onboarding.moso_refusal_hold_hours` (seed 24). `RecruitApiClient.java:122` `MOSO_ACTOR_NOT_ONBOARDING_SPECIALIST`. Category: **Users&Roles**. Status: affects only packs writes → **staging-only**. The round-robin pick itself is local. Size **S**.
- **C-013 Referrer and headhunter identity = MOSO Admin keyName.** `referralview/identity/ReferrerIdentityServiceImpl.java:28` resolves people via packs `referrers/resolve` and stores `referrer_identity.moso_admin_key`. `headhunter/program/MosoAdminKey.java` decodes App Engine websafe keys pinned to app `s~lender-rate` / namespace `5716104026521600`. Category: **Implicit-identity**. Status: **PROD-live** (referrals view; settings-gated, see C-030). Size **M**.

### 2.D Hot leads / inbox / Pipeline / Today / KPIs / Reports (reads of local tables)

- **C-014 Every row on these screens originates from MOSO data.** Hot, Cold, Pipeline, Today and the KPIs read recruit's own Postgres. That data exists because of C-001 and C-008: `last_registration_at` drives hand-raise, MOSO stages S2–S5, and owner, source and labels come from MOSO. `headhunter/autoown/HeadhunterAutoOwner.java:39, :126` runs only on the MOSO webhook create path. `report/service/impl/KpiTrendServiceImpl.java:41` is sourced from the packs origin stamp. `dashboard/WaitingOnLoPolicy.java:60-74` reads `moso_onboarding_meeting_status` and `packs_writeback_outbox`. `dashboard/OnboardingTodayReader.java:110-111` reads packs writeback flags. Category: **Implicit (data provenance)**. Status: **PROD-live**. If MOSO disappears, the screens keep working on frozen data. Size **M**.

### 2.E LO detail / profile edits (sync back to MOSO)

- **C-015 Profile write-back `POST /candidate/sync`.** `packswriteback/PacksWritebackEnqueuer.java:249` (`enqueueIfEligible`) → outbox `packs_writeback_outbox` → `packswriteback/service/impl/PacksWritebackTickServiceImpl.java:1824` → `recruitapi/RecruitApiClient.java:352-356`. packs `RecruitAPI.java:324` (`candidate/sync`, suppresses the echo push). This also carries `lo_type` (:391) and the experience class for MOSO's commission plan (:417; setting `packs.writeback.experience_enabled` seed false; `packswriteback/backfill/ExperienceBackfillController.java`). Category: **Data-write**. Status: **staging-only** (`RECRUIT_FEATURES_PACKS_WRITEBACK` true at staging values :71-72, absent in prod). Prod values.yaml :174-181 comment: "0 rows in packs_writeback_outbox on 06/10". If MOSO disappears, staging edits stop reaching the LOS. In prod, Recruit edits already never reach MOSO, and the next MOSO push can overwrite them (field-ownership rules in `moso/MosoSyncFieldAllowlist.java`). Size **M**.
- **C-016 Relay infrastructure.** The tick runs whenever `RecruitApiClient#isConfigured()` is true (`PacksWritebackTickServiceImpl.java:135`; it is true in prod because base URL and key are both set). The cron job is registered only when `PACKS_WRITEBACK_INTERNAL_API_KEY` is set (`packswriteback/cron/PacksWritebackTickCronRegistrar.java`). A failure desk exists at `/api/v1/packs-writeback/failures`. Category: **Data-write infra**. Status: armed in prod but has no rows (C-015). Size **S**.

### 2.F Offer / invite / Prepare offer / approvals / My invites

- **C-017 An Offer requires a MOSO record.** `offer/service/impl/OfferServiceImpl.java:168` (request) and `:676` (send) call `requireMosoRecord` (D165): no `legacy_key` → 400 "can't be invited yet because they haven't signed up on the Loan Factory website" (:620-624). `candidate/MosoLink.java:9`. Category: **Implicit-identity / gate**. Status: **PROD-live**. If MOSO disappears, no candidate can be offered. Size **M**.
- **C-018 The invite email is sent BY MOSO.** `OfferServiceImpl.java:742` → `PacksWritebackEnqueuer.enqueueInvite` (:305) → tick :1653-1655/:1757 → `RecruitApiClient.invite` (:260-305) → packs `RecruitAPI.java:524` `candidate/invite`. packs then queues `EmailTemplateOp` with template `email/interested_loan_officer_invitation_email` (packs RecruitAPI :34, :164, :660), sent **from the recruiter's MOSO identity**. Category: **Email + Data-write**. Status: **staging-only**. Production has no packs-writeback flag, so `transitionToSent` marks SENT locally and enqueues nothing: **in production, Recruit sends no invite email at all** (repo evidence: values.yaml :174-181). If MOSO disappears, staging invites stop. Prod needs a new email path before cut-over anyway. Size **L**.
- **C-019 The hand-off variant (`send_invite:false`, `reset_stale_meeting`, onboarding specialist) and invite resend.** `offer/service/impl/InviteDeliveryResolver.java`, `InviteResendServiceImpl.java`, `InviteStatusServiceImpl.java`, flag `onboarding-v2-handoff`. Category: **Data-write**. Status: **staging-only**. Size **M**.
- **C-020 The /register-loan-officer pay gate asks Recruit, keyed by the MOSO key.** `registerstatus/controller/RegisterStatusController.java:51` and its `/register-status?key=` handler (`/public/api/v1/register-status`). Its javadoc says lf/lo-homepage's `/register-loan-officer?key=<websafe key>` (MOSO's `getRegisterLOProcessInfo` flow) asks it. Category: **Implicit-identity / Other**. Status: **PROD-live**. If MOSO disappears, the LO registration and payment page that MOSO serves goes with it. Size **S** on the Recruit side.

### 2.G Contracts / agreement / Inkless e-sign

- **C-021 Agreement status read = MOSO dry run.** `agreement/controller/AgreementController.java:47` (GET) → `agreement/service/impl/AgreementStatusServiceImpl.java:112` → `RecruitApiClient.agreementDryRun` (:687-695) → packs `RecruitAPI.java:1634` `candidate/agreement`. Category: **E-sign/Contract (read)**. Status: **flag-off in prod** (`AgreementSendGate.isFeatureEnabled` = `recruit.features.agreement-send`, unset in prod; values.yaml :156-162). **staging-only**. Size **M**.
- **C-022 Agreement send = MOSO builds and sends the Inkless envelope.** `AgreementController.java:57` → `AgreementSendServiceImpl.java:93-229` → `PacksWritebackEnqueuer.enqueueAgreementSend` (:494) → tick :1795 → `RecruitApiClient.agreementSend` (:716-733) → packs `candidate/agreement/send` (:1926). The Inkless envelope and email live in packs (`EnsureSigningSessionsRegisterInterestedLoanOfficer`, `InklessProcessInterestedLoanOfficerCompletedOp`, packs RecruitAPI :64, :512-516). The recipient policy is ALLOWLIST on staging (values :91-92) and ANY in prod (values :50-51, but the feature is off). Category: **E-sign/Contract + Email**. Status: **staging-only**. Size **L** (there is no non-MOSO e-sign path; `docs/INTEGRATIONS.md` lists document-esign as "❌ not connected").
- **C-023 Signature detection.** (a) It arrives in the push (`lo_agreement_signed`, `paid_and_signed`, `paid_startup_fee`; C-003/C-004). (b) The scheduled pull is `moso/reconcile/MosoSignedReconcileTickService.java` (uses the `candidate/agreement` dry run as the IT MOSO Admin). The flag defaults **true** (`MosoSignedReconcileConfiguration.java:36`; application.yml :549), but the cron registers **only if** `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY` is set (`MosoSignedReconcileTickCronRegistrar.java:47-49`). That key is in neither BOOTSTRAP secret list → the cron is probably not registered. Category: **E-sign/Contract (read)**. Status: push = **PROD-live**; pull = **PROD-armed, cron unverified**. If MOSO disappears, Recruit never learns that a Loan Officer signed or paid, so offers never reach SIGNED and auto-stage never fires. Size **L**.

### 2.H Onboarding hand-off (OB), 1-1 meeting, reminders, legal name, W-2/1099

- **C-024 1-1 meeting done → MOSO `candidate/onboardingMeeting`.** `PacksWritebackEnqueuer.enqueueOnboardingMeeting` (:347) → tick :1702-1711 → `RecruitApiClient.onboardingMeeting` (:476-566). This includes `legal_given_name/legal_last_name` (`candidate/controller/LegalNameController.java`, flag `onboarding-legal-name`), `is_corporate_loan_officer` (`candidate/HireClassificationWriter.java`, flag `onboarding-hire-classification`) and `agreement_flow:"RECRUIT_V2"`. In MOSO this call builds the e-sign envelope and the pre-onboarding email (packs RecruitAPI :736-849). Category: **Data-write + E-sign trigger**. Status: **staging-only** (four flags, all staging values :81-88). Size **L**.
- **C-025 MOSO meeting status read back.** `moso_onboarding_meeting_status`, `onboarding_specialist`, `completed_detail_form` arrive from the push. `onboarding/StaleMeetingReset.java`, `OnboardingMeetingReachedDecorator.java`, `OnboardingMeetingResendServiceImpl.java` and `checklist/service/impl/OnboardingActionNeededSelector.java` all reason on them. Category: **Data-read**. Status: **PROD-live**. Size **M**.
- **C-026 Onboarding 1-1 reminder emails are sent by MOSO.** `onboarding/reminder/service/impl/OnboardingReminderTickServiceImpl.java:27-90` claims a ledger row plus a packs outbox row → `RecruitApiClient.meetingReminder` (:794-805) → packs `candidate/meetingReminder` (:1971), which sends the mail. Status: prod flag **ON** (values :86-87), but setting `onboarding.reminder.delivery_mode` seed `DRY_RUN`, `allowed_emails=[]`, and the recipient policy defaults to ALLOWLIST. Nothing is sent in prod per the repo (values :260-265). **staging-only in effect**. Category: **Email**. Size **M**.
- **C-027 Timezone coupling.** packs hard-codes `America/Los_Angeles` for the 1-1 (packs RecruitAPI :168). recruit warns at boot if `business_hours.timezone` differs (`onboarding/MeetingZoneStartupCheck.java`). Category: **Implicit / Config**. Status: **PROD-live** (warning only). Size **S**.

### 2.I Webinars and attendance

- **C-028 Webinar list = MOSO WebPlus.** `webinar/WebinarController.java:32-35` → `webinar/WebinarClient.java:152-190` → `GET {RECRUIT_WEBINAR_BASE_URL}/{ns}/getNextWebinars?type=loan_officer_recruiting`. It is unauthenticated and uses namespace `5716104026521600` = MOSO's LOAN_FACTORY Datastore namespace. packs `WebPlusAPI.java:285, :1492-1493`. Also used by `candidate/SourceDetailDecorator.java:233-235` (the webinar date on lists) and `nurture/NurtureTemplateVariables.java:99` (`{{webinar}}` token). `webinar/PacksWebinarTime.java` treats the time as a Pacific wall clock. Category: **Data-read**. Status: **PROD-live** (values :58-59). If MOSO disappears, there is no session picker and no webinar date, and the nurture token stays unresolved. Size **M**.
- **C-029 Registering a candidate for a webinar = MOSO.** Call outcome WEBINAR → `PacksWritebackEnqueuer.enqueueWebinarRegistration` (:561-573) → tick :1636 → packs `candidate/registerWebinar` (:405), which also emails `email/webinar_registration_send_manually` (packs RecruitAPI :165, :428). The picker for that write uses `RecruitApiClient.upcomingWebinars` → packs `GET /webinars` (:178-200). That route exists on packs **master :270 but NOT on 3.64.1**. Category: **Data-write + Email**. Status: **staging-only** (packs-writeback). Size **M**.
- **C-059 Attendance and registration signals come from the MOSO push.** `is_attended`, `duration`, `webinar`, `last_registration_at` (`MosoRowMapper.java:319, :496-500, :1357`). `webinar/signal/WebinarSignal.java` (D277) is behind flag `webinar-signals`. Category: **Data-read**. Status: mapping **PROD-live**; signals **staging-only**. MOSO's own webinar job (Zoom attendance) is the source of `is_attended`. Size **M**.

### 2.J Referrals / Ambassador / My referrals / admin Referrals

- **C-030 Referral ownership and bonus state = packs.** `referralview/client/RecruitApiReferralOwnershipClient.java:34, :41, :76, :91` → packs `referrers/resolve` (:1180) and `referrals/byOwner` (:1238), as the IT MOSO Admin (prod values :52-53). Gated by setting `referrals.enabled` (seed `false`, runtime value not in repo); `referrals.packs_cache_seconds` 60. `referralview/service/ReferralPacksFetcher.java:34`. Category: **Data-read**. Status: **PROD-live when `referrals.enabled` is on** (base URL and actor are configured in prod). If MOSO disappears, My referrals / admin Referrals lose ownership, milestones and bonus status. Size **M**.
- **C-031 Referral attribution from the push.** `referred_by`, `referrer_internal_associate`, `added_by_referrer(_label)`, `referrer_name/phone` (`MosoRowMapper.java:85, :1389-1396`) → `recordGenesisAttribution` (`MosoRowUpsertServiceImpl.java:1270`). Category: **Data-read**. Status: **PROD-live**. Size **M**.

### 2.K Headhunter / LO Recruiter Program / /join landing

- **C-032 Program roster = moso-aid.** `headhunter/program/MosoAidRosterClient.java:40` → `GET {RECRUIT_MOSO_AID_BASE_URL}/api/lo-programs/recruit/members?program_id=` with `x-service-key` (moso-aid `src/routes/index.js:335-337`, `src/controller/lo-program-team.js:40`, `RECRUIT_INBOUND_SERVICE_KEY`). The tick is `ProgramSyncService` / `ProgramSyncTickCronRegistrar`. Setting `program_sync.mode` seed **OFF** (`V208__program_sync.sql:182`). Category: **Users&Roles (role grants follow MOSO program membership)**. Status: **flag-off** (seed OFF; prod base URL and key are set per values :267-273 comment). Size **M**.
- **C-033 Program member link confirmation = packs `referrers/resolve`.** `headhunter/program/ProgramMemberLinkService.java:83` checks whether a member's company email is this MOSO Admin. Live at deploy, not gated by `program_sync.mode` (V208 :9). Category: **Users&Roles**. Status: **PROD-live** (admin action). Size **S**.
- **C-034 /join and /recruit pages → origin stamp in MOSO.** The member's page is on lf/lo-homepage and registers into MOSO (packs). packs stamps `lead_origin`, `lead_origin_owner_key`, `..._match`, `..._at`, `..._email`, `..._slug`, `..._reject` (`moso/OriginStampValues.java` RAW_KEYS). Recruit uses the stamp for headhunter auto-own (`HeadhunterAutoOwner.java:39, :126`), the fee-waiver rule (`JoinPageFeeWaiver.java`) and KPI trend (`KpiTrendServiceImpl.java:41`). Category: **Data-read / Implicit**. Status: **PROD-live**. If MOSO disappears, /join leads stop and headhunter ownership loses its basis. Size **M**.

### 2.L Email — automatic (Nurture drip, scheduled Send info), status feedback, bell copy

- **C-035 Nurture drip email = moso-notifier v2.** `nurture/drip/NurtureDripTickServiceImpl.java:36, :77` publishes through tera-core `NotificationEventPublisher` to `NOTIFICATION_EVENT_TOPIC` (application.yml :162). The type is declared on `CREATE_TEMPLATE_TOPIC` (`nurture/drip/NurtureMailDeclarer.java:29`, `NurtureMailCatalog.java:11`, `NurtureMailEvents.java`). moso-notifier consumes both topics (`notification/handler/NotificationEventMessageHandler.java:44`, `template/handler/CreateTemplateMessageHandler.java:29`) and sends via SendGrid (`webhook/handler/SendGridWebhookHandler.java`). Category: **Email**. Status: **staging-only** (`RECRUIT_FEATURES_NURTURE_DRIP`, staging :95-96; settings `nurture.drip.enabled` false and `delivery_mode` DRY_RUN seeds). Size **M**.
- **C-036 Scheduled "Send info" email = moso-notifier v2.** `nurture/scheduled/ScheduledSendTickServiceImpl.java:50-53`, `ScheduledInfoMailDeclarer.java:28`. Category: **Email**. Status: **staging-only** (staging :97-98). Size **S**.
- **C-037 Mail delivery status = moso-notifier `STATUS_MAIL_TOPIC`.** `mailstatus/MailStatusMessageHandler.java:34` subscribes `SVC_STATUS_MAIL_RECRUIT_SUBSCRIPTION` (staging :105-106). The topic is published by moso-notifier `SendGridWebhookHandler.java:69, :224` in "moso's exact shape". Hard bounces and complaints write suppressions (`mailstatus/EmailSuppressionWriter.java`). Category: **Email (feedback)**. Status: **staging-only** (`mail-status-intake`). Size **S**.
- **C-038 Platform inbox (one bell across apps) = moso-notifier IN_APP.** `notification/platform/PlatformInboxTickService.java:27-38` with catalog declared on moso-notifier. moso-notifier has `link-hosts recruit.loanfactory.com` in prod config (`application-production.yml:36`). Category: **Notification**. Status: **staging-only** (`RECRUIT_PLATFORM_INBOX_ENABLED`, staging :145-148). The Recruit bell itself is local (`notification/service/impl/NotificationServiceImpl.java`) → PROD-live without MOSO. Size **S**.
- **C-039 Unsubscribe link for automatic mail.** It is local (`nurture/unsubscribe/UnsubscribeController.java`, `/public/api/v1/unsubscribe/{token}`), reached through the gateway. Its public base URL is `gateway.viet18.com/recruit-svc` on staging (:107-108). It is listed because the email that carries it is sent by moso-notifier. Status: **staging-only**. Size **S**.

### 2.M Email / SMS / calls by a person (Omni conversation)

- **C-040 Omni conversation = omni-service (in the MOSO list).** recruit pushes the "cast" (who sits on the conversation) via `PUT /api/v1/subjects/LO_CANDIDATE/{id}/cast` (`omni/OmniCastPushClient.java:70`). It mirrors outgoing calls (`omni/OmniCallMirrorClient.java:56-58`), checks outbound before a hot-idle release (`omni/OmniOutboundReadClient.java:42`; setting `hot.idle_release_omni_check` true), aliases a subject on merge (`OmniCastPushClient.java:72` `/api/v1/internal/comm/subject-alias`) and writes activity notes (`omni/ActivityOmniMessageWriter.java`). omni routes are confirmed in omni-service `internal/casthttp/handler.go:133` and `internal/callshttp/handler.go:60-61`. Category: **Data-write / Infra**. Status: **PROD-live** (prod values :28-35; omni prod values `LO_CANDIDATE` adopter since 2026-10-07 at omni `helm-chart/config/production/values.yaml:366-385`). If omni disappears, the LO conversation timeline, recruiter-composed email/SMS, call logging and "Last contacted" all break. Size **L**.
- **C-041 Omni → recruit host-subject SPI.** `hostsubjects/controller/HostSubjectsController.java:52-85` (`/public/api/v1/comm/host/subjects/{type}/{id}/active`, `/resolve`, `/sender-identity`), token `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN`. omni's `HOST_SUBJECTS_BASE_URL_LO_CANDIDATE` points at recruit-be (omni prod values :383). Category: **Other (reverse API)**. Status: **PROD-live**. Size **S**.
- **C-042 Omni Pub/Sub feeds.** `omni-inbound-reply` → `omni/inbound/OmniInboundMessageHandler.java:86-91` (a reply or STOP stops the cadence, puts the LO on Today, and opt-out → `InboundOptOutSuppressionWriter`). `omni-outbound-sent` → `omni/outbound/OmniOutboundMessageHandler.java` (last-contacted, delivery failed). Category: **Data-read**. Status: **PROD-live** (prod values :32-35). Size **M**.
- **C-043 Omni outbound transports.** Email goes through **moso-notifier v2** (omni `cmd/server/main.go:707-724`). SMS goes through zoom-go (`main.go` "SMS: POSTs to zoom-go's send API"). So a recruiter's manual email depends on moso-notifier one level down. Category: **Email / SMS**. Status: **PROD-live** (omni prod comm dispatch on; omni README). Size **L** (inherited).
- **C-044 Omni reply address for automatic mail.** `omni/OmniReplyAddressClient.java:50` (`/reply-address`); staging domain `reply.viet18.com` (:121-122). Category: **Email**. Status: **staging-only**. Size **S**.
- **C-045 Meet calls into Omni.** `omni/MeetCallOmniClient.java:74`. Category: **Data-write**. Status: **staging-only** (`RECRUIT_OMNI_MEET_CALLS_ENABLED`, staging :129-132). Size **S**.
- **C-046 Live conversation stream.** omni publishes LO_CANDIDATE changes on shared Redis Sentinel `redis-sentinel.redis-cluster.svc.cluster.local:26379` → `candidateevents/service/impl/CandidateEventsSubscriber.java:21` → SSE `/api/v1/candidates/{id}/events`. Category: **Infra**. Status: **PROD-live** (prod values :82-85). Size **S**.

### 2.N Infra / config / secrets shared with MOSO

- **C-047 Runs in MOSO's GCP projects and GKE clusters.** Production: project `lender-rate`, cluster `moso-gke` (`.github/workflows/cd-production.yml:52-53, :75-76`). Staging: `lenderrate-master`, `moso-kube` (`cd-staging.yml:42-43, :65-66`). Category: **Infra**. Status: **PROD-live**. Size **L** (a re-home is a platform project).
- **C-048 Image registry `us-central1-docker.pkg.dev/lender-rate/moso-svc-repo/...`** (prod values :7; cd-production :52). Category: **Infra**. Status: **PROD-live**. Size **S**.
- **C-049 Workload identity in prod.** `recruit-be-runtime@lender-rate` (values :5). The comment says the binding still uses the shared **`moso-svc@lender-rate`** GSA, with container.admin (values comment block :34-38). Category: **Infra / Security**. Status: **PROD-live**, to be verified in-pod. Size **S**.
- **C-050 Pub/Sub in `lender-rate`** (HR topics, omni topics, `CRON_JOB_REGISTRATION`, `SEARCH_INDEX_SYNC_TOPIC`), with a project-level `pubsub.editor` grant (values comment). Category: **Infra**. Status: **PROD-live**. Size **M**.
- **C-051 MOSO-side secrets that Recruit holds the other half of.** `MOSO_WEBHOOK_API_KEY` ↔ packs SystemProp `recruit_webhook_api_key`. `RECRUIT_API_KEY` ↔ packs SystemProp `recruit_api_key` (packs RecruitAPI :147), also the AES-GCM key for the `x-company-email` actor header (`recruitapi/RecruitApiActorHeader.java`). `RECRUIT_MOSO_AID_ROSTER_KEY` ↔ moso-aid `RECRUIT_INBOUND_SERVICE_KEY`. `RECRUIT_OMNI_INTERNAL_API_KEY` and `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN` ↔ omni-service-secret. All are in `recruit-svc-secret`; secret names are listed at `BOOTSTRAP.md:33-55` (no values read). Category: **Config&Secrets**. Status: **PROD-live**. Size **S** each.
- **C-052 Google OAuth client for "Connect Google" / Calendar / Meet lives in MOSO's GCP project.** Prod client id prefix `444859640964` (values :46-47; comment ":142-143 ACCOUNT APP's production Google OAuth client (project lender-rate)"). The same project number appears in the moso repo root file `client_secret_444859640964-…json` (file name only, not opened). Category: **Config&Secrets / Infra**. Status: Connect = **PROD-live**; Calendar events and Meet attendance = **staging-only**. Size **S**.
- **C-053 Cron scheduling via cron-service-go over Pub/Sub `CRON_JOB_REGISTRATION`** (tera-core `CronService`, `core.cron-service.base-domain` :166). This covers every tick: packs writeback, signed reconcile, program sync, reminders, drip and others. BORDERLINE: cron-service-go is not in the MOSO list but runs on the same clusters. Status: **PROD-live**. Size **S**.
- **C-054 tera-core library** (`com.loanfactory.service-conventions` plugin, `tera-core-spring-boot-starter` from `maven.pkg.github.com/LoanFactory-Inc/tera-core`; `settings.gradle.kts`). It provides the webhook facade, Pub/Sub, notification v2 publisher and cron client. BORDERLINE: a TERA library, not MOSO, but it is the transport for C-035..C-038. Category: **Library**. Size **S**.
- **C-055 Shared Redis Sentinel cluster** (C-046) and **recruit's Postgres**. `DB_HOST` is a secret, location unknown (BORDERLINE: likely Cloud SQL in `lender-rate`; not provable from the repo). Category: **Infra**. Size **S**.

### 2.O Users provisioning / user-service / HR (non-MOSO, recorded for coverage)

- **C-056 user-service names and licences — BORDERLINE.** `omni/UserServiceNameClient.java:38` and `postjoined/hrupdate/UserServiceLicenseClient.java:38` call `{RECRUIT_USER_SERVICE_BASE_URL}/api/v1/users/` (prod :94-95). `postjoined/reconcile/PostJoinedReconciler.java:29` notes "a licence edited in MOSO reaches user-service without any HR event": the post-Joined licence ticks therefore read data that MOSO may feed into user-service. Category: **Implicit / Users&Roles**. Status: **PROD-live**. Size **S**.
- (user-service identity sync, `userservicesync/`: flag `user-service-sync` is unset everywhere and the client is `NoOpUserServiceSyncClient.java` → dead code, NOT a MOSO dependency; listed in §4.)
- **C-058 HR hand-off fires on MOSO-driven S6.** `hrhandoff/HrAutoHandoff.java:31, :46, :110`: each MOSO push re-runs the check. In prod the 69 S6 rows were "all moved by the MOSO sync" (values :207-209). Category: **Implicit**. Status: hand-off publish **PROD-live** (manual button), auto-send staging-only. Size **S**.


### 2.P recruit-fe (helper trace at `0b353055`; spot-checked `InviteModal/index.tsx:229`, `LoAvatar.tsx:24`, `cd-production.yml:81-82`; full notes in `C-fe-notes.md` in this folder)

The browser never calls a MOSO host for data. Every API call goes to `NEXT_PUBLIC_API_URL` (prod `https://gateway.loanfactory.com`, `cd-production.yml:62`) → `/recruit-svc` (recruit-be) or `/omni-svc` (omni-service). recruit-be does all MOSO/packs work. FE touchpoints:

- **C-F01 FE runs in MOSO's GCP project and cluster.** `helm-chart/config/production/values.yaml:5,8` (GSA `recruit-fe-runtime@lender-rate`, image `lender-rate/moso-svc-repo`). `cd-production.yml:48-49, :81-82` (`lender-rate`, `moso-gke`). Staging: `lenderrate-master`, `moso-kube`. **Infra**, PROD-live, **M**.
- **C-F02 Ingress, static IP and managed certificate in `lender-rate`; DNS in the loanfactory.com / viet18.com zones** (`helm-chart/ingress/ingress-prod.yaml:2-18`). **Infra**, BORDERLINE, PROD-live, **S**.
- **C-F03 `@loanfactory-inc` npm packages from Artifact Registry `lender-rate/tera-platform-npm`** (`.npmrc:12`, `Dockerfile:10`, `cd-production.yml:58,61`). **Library/Infra**, BORDERLINE (a TERA store inside MOSO GCP), PROD-live, **S**.
- **C-F04 Login = Account portal + auth-service tokens, NOT MOSO.** `LoginContent.tsx:58` → `shared/utils/accountLogin.ts:12-31`; `auth/callback/CallbackContent.tsx:26-48` → `POST /auth-svc/public/api/v1/auth/token/exchange`; refresh in `apis/apiClient.ts:21-43`. **Auth**, BORDERLINE, PROD-live, **L** if counted.
- **C-F05 Shared parent-domain session-hint cookie.** `NEXT_PUBLIC_SESSION_HINT_DOMAIN=.loanfactory.com` (`cd-production.yml:64`; `shared/utils/sessionHint.ts:19-63`). The `lf_session` cookie lives on the same parent domain as `www` (MOSO GAE). **Config**, BORDERLINE, **S**.
- **C-F06 Omni SDK in the browser.** `@loanfactory-inc/omni-core` / `omni-react` 0.4.50 (`package.json`; `shared/omni/omniGateway.ts:13,24`; 23 files). They call `/omni-svc/api/v1/subjects/LO_CANDIDATE/...` with the user's bearer, behind `NEXT_PUBLIC_OMNI_INBOX_BUBBLE_ENABLED=true` in both envs (`cd-production.yml:65-66`). **Library + Data-read/write (omni-service)**, PROD-live, **L** (the whole conversation UI).
- **C-F07 `/welcome` links to `www.loanfactory.com` (prod) / `www.viet18.com` pages**: `/ambassador-program`, `/refer/refer-a-loan-officer`, `/loan-officer`, terms and privacy (`app/[locale]/(landing)/_lib/landingLinks.ts:9-17`). These are lf-homepage pages on the shared `www` host. **UI link**, BORDERLINE, PROD-live, **S**.
- **C-F08 The LO avatar image is fetched by the browser straight from the MOSO-supplied URL** (`shared/components/CandidateDrawer/LoAvatar.tsx:22-24`, `mosoProfile.ts:16-19`). **Data-read (direct)**, PROD-live, **S**.
- **C-F09 FE half of the invite gate: no `legacy_key` → invite blocked** (`shared/components/InviteModal/index.tsx:229`, `messages/en/invite.json:118`). **Implicit-identity**, PROD-live, **S**.
- **C-F10 Duplicate merge: the row holding the MOSO record always survives** (`app/[locale]/(private)/duplicates/_utils/survivorPick.ts:6-7,28`). **Implicit-identity**, PROD-live, **S**.
- **C-F11 `acct-*` owner ids = migrated MOSO user ids, shown with names built from the id** (`shared/utils/userDirectory.ts:7,66-67`). **Implicit-identity**, PROD-live (data), **S**.
- **C-F12 Operational reliance on the MOSO admin UI.** About 150 UI strings send staff into MOSO: "In MOSO, set Loan officer type… then use 'Re-generate e-sign documents and send email'" (`messages/en/candidateEdit.json:47-49`), "A MOSO admin needs to set their branch" and "RECRUITING permission" (`agreement.json:13-94`), "give them the Recruiting label in MOSO" (`workQueue.json:61-102`), and "Signed in MOSO, needs a decision" (`exceptions.json:64-114`). **Other (process / UI text)**, PROD-live, **M**: the processes themselves still run in MOSO admin.
- **C-F13 Public app launcher tiles come from `/engagement-svc/public/applications` + `/auth-svc/public/api/v1/applications/origins`** (`(landing)/_lib/publicApps.ts:16-17,98`). These can list MOSO apps. **UI link**, BORDERLINE (data-driven), **S**.
- FE views of BE touchpoints are not counted again. These are agreement (C-021/022), MOSO-sync Exceptions (C-007), Sync trace (C-007), onboarding write-back on `/work` (C-024), referrals "MOSO check" (C-030), webinars (C-028), legal name from MOSO (C-024/C-003), MOSO profile mirror (C-003), "Add lead" switch (C-002), `IMPORT_RUN` permission (C-008) and program-member MOSO keys (C-032/C-033).

---

## 3. Master table (deduplicated)

Status: P = PROD-live · S = staging-only · F = flag-off/setting-off · D = dead code · B = BORDERLINE (not in the MOSO repo list, or provenance not provable).

| ID | Flow | What (MOSO side ← recruit caller) | Category | Status | Size |
|---|---|---|---|---|---|
| C-001 | Intake | packs `SendLORecruitingToRecruitOp` push → `PublicWebhookController:47` / `MosoWebhookHandler:72` | Data-read | P | L |
| C-002 | Intake | `native-candidate-create` off → MOSO is the only way in (`CandidateFacadeImpl:128`) | Other (gate) | P | M |
| C-003 | Intake | MOSO LORecruiting field set mapped by `MosoRowMapper` (profile, NMLS, licences, production, fee, webinar, onboarding) | Data-read | P | L |
| C-004 | Intake | Stage, offer, fee and signed state + owner + genesis attribution from push (`MosoRowUpsertServiceImpl`) | Data-read | P | L |
| C-005 | Intake | STOP opt-out via push (`isStopArchived` → `createSuppressions:1446`) | Data-read | P | M |
| C-006 | Intake/Dedup | merge and survivor logic keyed on `legacy_key` | Implicit-identity | P | S |
| C-007 | Exceptions/Sync trace | MOSO-sync exceptions + per-candidate sync trace | Data-read | P | S |
| C-008 | Cold pool / migration | `/exec/ExportLORecruitingForMigrationOp` (MOSO admin cookie) → `/admin/import/moso` | Data-read (+Auth) | P (manual) | L |
| C-009 | Suppression | MOSO blacklist + SMS/email/call opt-out ledgers imported | Data-read | P (manual) | M |
| C-010 | Login/RBAC | central `X-User-ID`, user-svc directory via gateway | Auth | P, B | L |
| C-011 | All MOSO writes | actor must be an active MOSO Admin with RECRUITING (`x-company-email`) | Users&Roles | P (reads) / S (writes) | M |
| C-012 | OB assignment | MOSO `Admin.is_onboarding_specialist` authority; refusal hold | Users&Roles | S | S |
| C-013 | Referrals/Headhunter | MOSO Admin keyName as referrer identity (`moso_admin_key`, `MosoAdminKey`) | Implicit-identity | P | M |
| C-014 | Hot/Cold/Pipeline/Today/KPI | screens read local data whose origin is the MOSO feed | Other (provenance) | P | M |
| C-015 | LO detail edit | `candidate/sync` profile, lo_type and experience write-back | Data-write | S | M |
| C-016 | Write-back relay | outbox tick armed in prod (`isConfigured`), cron needs `PACKS_WRITEBACK_INTERNAL_API_KEY` | Data-write | P-armed, empty | S |
| C-017 | Offer | `requireMosoRecord` at request and send (`OfferServiceImpl:168, :676`) | Implicit-identity | P | M |
| C-018 | Offer/invite | `candidate/invite` → MOSO sends invitation email from the recruiter | Email | S (prod sends nothing) | L |
| C-019 | Offer hand-off/resend | `send_invite:false`, reset stale meeting, resend | Data-write | S | M |
| C-020 | /register-loan-officer pay gate | `/public/api/v1/register-status?key=<MOSO key>` | Implicit-identity | P | S |
| C-021 | Agreement | `candidate/agreement` dry run (status card) | E-sign/Contract | S | M |
| C-022 | Agreement | `candidate/agreement/send` → MOSO Inkless envelope + email | E-sign/Contract | S | L |
| C-023 | Agreement | signed/paid detection: push (P) + `MosoSignedReconcile` pull (flag true, cron key unverified) | E-sign/Contract | P | L |
| C-024 | OB 1-1 | `candidate/onboardingMeeting` (+legal name, W-2/1099, RECRUIT_V2) → MOSO builds the envelope | Data-write | S | L |
| C-025 | OB / Today | MOSO meeting status, specialist, detail-form flags read back | Data-read | P | M |
| C-026 | OB reminders | `candidate/meetingReminder` → MOSO sends the email | Email | flag on in P, DRY_RUN seed → effectively S | M |
| C-027 | OB timezone | packs hard-coded America/Los_Angeles vs `business_hours.timezone` | Other (config) | P | S |
| C-028 | Webinars | WebPlus `getNextWebinars` (ns 5716104026521600) | Data-read | P | M |
| C-029 | Webinars | `candidate/registerWebinar` (+ MOSO email); `GET /webinars` only on packs master | Data-write | S | M |
| C-059 | Webinars | attendance/registration from push; `webinar-signals` | Data-read | P mapping / S signals | M |
| C-030 | Referrals | packs `referrers/resolve`, `referrals/byOwner` (bonus/ownership) | Data-read | P if `referrals.enabled` | M |
| C-031 | Referrals | referrer fields in push → genesis attribution | Data-read | P | M |
| C-032 | Headhunter program | moso-aid roster `/api/lo-programs/recruit/members` | Users&Roles | F (`program_sync.mode` OFF seed) | M |
| C-033 | Headhunter program | link confirm via packs `referrers/resolve` | Users&Roles | P | S |
| C-034 | /join, /recruit pages | packs origin stamp → auto-own, fee waiver, KPI | Data-read | P | M |
| C-035 | Nurture drip email | moso-notifier v2 `NOTIFICATION_EVENT_TOPIC` / `CREATE_TEMPLATE_TOPIC` | Email | S | M |
| C-036 | Scheduled Send info | moso-notifier v2 | Email | S | S |
| C-037 | Mail status | moso-notifier `STATUS_MAIL_TOPIC` → suppressions | Email | S | S |
| C-038 | Bell (platform inbox) | moso-notifier IN_APP copy | Notification | S | S |
| C-039 | Unsubscribe | link inside moso-notifier-sent mail | Other | S | S |
| C-040 | Omni conversation | omni-service cast, call mirror, outbound read, subject alias, activity notes | Data-write | P | L |
| C-041 | Omni host SPI | omni → recruit `/public/api/v1/comm/host/**` | Other | P | S |
| C-042 | Omni feeds | `omni-inbound-reply`, `omni-outbound-sent` Pub/Sub | Data-read | P | M |
| C-043 | Manual email/SMS | omni email via moso-notifier v2 (SMS via zoom-go, not MOSO) | Email | P | L |
| C-044 | Auto-mail Reply-To | omni `/reply-address` | Email | S | S |
| C-045 | Meet calls | omni `MeetCallOmniClient` | Data-write | S | S |
| C-046 | Live stream | omni → shared Redis Sentinel → SSE | Infra | P | S |
| C-047 | Hosting | prod `lender-rate`/`moso-gke`, staging `lenderrate-master`/`moso-kube` | Infra | P | L |
| C-048 | Hosting | image registry `lender-rate/moso-svc-repo` | Infra | P | S |
| C-049 | Hosting | prod workload identity still bound to shared `moso-svc@lender-rate` (per values comment) | Infra | P | S |
| C-050 | Hosting | Pub/Sub topics and subscriptions in `lender-rate` | Infra | P | M |
| C-051 | Secrets | shared keys with packs SystemProps, moso-aid, omni (`recruit-svc-secret`) | Config&Secrets | P | S |
| C-052 | Google connect | OAuth client in MOSO project `lender-rate` (client 444859640964-…) | Config&Secrets | P (connect) / S (calendar, meet) | S |
| C-053 | All ticks | cron-service-go via Pub/Sub `CRON_JOB_REGISTRATION` | Scheduling | P, B | S |
| C-054 | Build | tera-core starter/plugin (webhook, Pub/Sub, notifier v2, cron) | Library | P, B | S |
| C-055 | Data | recruit Postgres host (secret) and shared Redis | Infra | P, B | S |
| C-056 | Post-Joined licences | user-service `/api/v1/users/`; licences may be fed by MOSO | Users&Roles | P, B | S |
| C-058 | HR hand-off | MOSO-driven S6 triggers the hand-off check | Other (implicit) | P (manual send) | S |
| C-F01 | FE hosting | `lender-rate`/`moso-gke`/`moso-svc-repo` | Infra | P | M |
| C-F02 | FE ingress | static IP, cert, DNS zones | Infra | P, B | S |
| C-F03 | FE build | npm registry `tera-platform-npm` inside MOSO GCP projects | Library | P, B | S |
| C-F04 | FE login | account portal + auth-service tokens | Auth | P, B | L |
| C-F05 | FE session | `.loanfactory.com` parent-domain cookie shared with `www` | Config&Secrets | P, B | S |
| C-F06 | FE conversations | omni-core/omni-react → `/omni-svc` | Library | P | L |
| C-F07 | /welcome | links to `www.loanfactory.com` pages | UI link | P, B | S |
| C-F08 | LO avatar | browser loads MOSO-hosted image URL | Data-read | P | S |
| C-F09 | Invite modal | `legacy_key` gate | Implicit-identity | P | S |
| C-F10 | Duplicates | MOSO-record row survives | Implicit-identity | P | S |
| C-F11 | Owners | `acct-*` migrated MOSO user ids | Implicit-identity | P | S |
| C-F12 | Ops copy | staff told to act in MOSO admin (LO type, re-generate e-sign, branch, RECRUITING label) | Other | P | M |
| C-F13 | App launcher | catalog may list MOSO apps | UI link | P, B | S |

**Counts by category (71 items; 11 of them BORDERLINE):** Data-read 15 · Data-write 7 · Email 7 · Implicit-identity 7 · Other 7 · Infra 8 · Users&Roles 5 · E-sign/Contract 3 · Config&Secrets 3 · Library 3 · Auth 2 (both B) · UI link 2 (both B) · Notification 1 · Scheduling 1 (B) · SMS 0 (SMS goes through zoom-go, which is not MOSO).
**By status:** PROD-live 49 (11 of them BORDERLINE) · mixed PROD/staging 3 (C-011, C-052, C-059) · staging-only 16 (including C-018 "prod sends nothing" and C-026 "DRY_RUN") · flag/setting-off 1 (C-032) · setting-gated 1 (C-030) · armed but empty 1 (C-016).

---

## 4. Flows checked with ZERO MOSO dependency (coverage proof)

Counts are of recruit-be files with any `moso|packs|legacy_key` token, from `git grep -liE` at 8c064b0d. A package absent from that list has 0 matching files.

| Flow | Evidence |
|---|---|
| Modex CSV import, NMLS export, Modex snapshot, "loans since" figures | `modex/*`. Modex is an external vendor. `ModexWebhookHandler` has no reachable route (its javadoc, D165). `modex/csv/LoansSinceCalculator.java` computes from uploaded CSVs. The 5–6 "moso" hits are only the legacy_key match and the native-create gate. |
| Follow-ups / reminders (followup-be gRPC + HTTP) | `followup/*`: 0 MOSO files. Targets are `followup-be.followup-prod` (prod values :74-81). |
| Sequences engine | `sequence/service/impl/NoOpSequenceSenderImpl.java:21` is the only `SequenceSender`, so it is dead for sending. Its 2 hits are javadoc. |
| HR hand-off, HR onboard, HR licence/onboarding updates | ai-hr-be HTTP `{RECRUIT_HR_HANDOFF_BASE_URL}` and Pub/Sub `HR_ASSOCIATE_ONBOARD` / `HR_ASSOCIATE_UPDATE` (application.yml :315-348). The only MOSO coupling is the trigger (C-058). |
| user-service identity sync | `userservicesync/NoOpUserServiceSyncClient.java`. Flag `user-service-sync` is unset everywhere → dead code. |
| Templates, saved filters, labels admin, zoom-links, calendar guest policy, audit, suppression admin, RBAC admin, settings/business hours, reports math | `template`, `savedfilter`, `label`, `zoomlink`: 0 files. `audit`, `suppression`, `report`: 1 javadoc hit each. `settings`: 2 hits (generic). All read and write recruit Postgres only. (The `lo_labels` *values* and the suppression *source ledgers* come from MOSO; see C-003 and C-009.) |
| Recruit bell / notifications | `notification/service/impl/NotificationServiceImpl.java` uses the local table. Only the platform-inbox copy (C-038) touches moso-notifier. |
| Unsubscribe endpoint itself | `nurture/unsubscribe/*`, local HMAC token. |
| Google Connect / Calendar / Meet API calls | `google/*` → Google APIs directly. Only the OAuth client's project is MOSO's (C-052). |
| Click-to-call | `zoomphonecall:` deeplink + zoom-go via omni. Not MOSO (`docs/INTEGRATIONS.md` row is consistent with the code: no zoom client in recruit-be). |
| Hot idle release | `hotidlerelease/*`: local plus an omni outbound check (C-040). No packs. |
| Licensing state rules admin | `licensing/controller/LicensingStateRuleAdminController.java`: local rules. The licence *data* (sponsor_states, active_license_items) comes from MOSO (C-003). |
| Feedback | No recruit-be controller. No FE call to a MOSO host found by the FE trace. |
| Auth / login | No MOSO token, cookie or session in FE or BE (C-010 / C-F04 are central TERA, BORDERLINE). |

## 5. Claimed in docs, NOT found in code (or contradicted by code)

1. `.understand-anything/knowledge-graph.json:14488` (recruit-be) says that for `PublicWebhookController` "an empty property accepts everything". Code `moso/controller/PublicWebhookController.java:52` **rejects every request when the key is blank** (fail-closed).
2. `sequence/controller/SequenceInternalController.java` javadoc (~:44-48) says "`PUBSUB_PROVIDER` is set nowhere in deploy/", so cron registration is dropped. Contradicted: `PUBSUB_PROVIDER=google` in prod values :24-25 and staging :29-30.
3. `docs/INTEGRATIONS.md` lists "moso-notifier (email / push) — Pub/Sub `SEND_MAIL_TOPIC` / `NOTIFICATION_TOPIC`". No code publishes either v1 topic. The code uses only v2 `NOTIFICATION_EVENT_TOPIC` / `CREATE_TEMPLATE_TOPIC` (application.yml :162-163).
4. `docs/INTEGRATIONS.md`: a document-esign subscriber (`EsignEnvelopeCompletedEvent`) and `POST /api/v1/esign/generate-and-send`. Neither exists in recruit-be code (the doc also marks them ❌). E-sign is MOSO/Inkless only.
5. `docs/INTEGRATIONS.md`: Calendly webhook. Not in code (doc ❌).
6. packs `docs/RECRUIT-API.md` "Status: implemented on the feat/recruit-api branch, not yet deployed". Stale: RecruitAPI is on packs master and 3.64.1 (except `GET webinars`, master only).
7. `sequence/service/SequenceSender.java` javadoc mentions a moso-notifier `SEND_MAIL_TOPIC` transport. Not wired (`NoOpSequenceSenderImpl`).
8. Production-state claims that exist only as comments or measurements in `helm-chart/config/production/values.yaml` cannot be re-proved from code: "0 rows in packs_writeback_outbox on 06/10" (:177-178), "69 ACTIVE S6 rows … moved by the MOSO sync" (:207), "prod still uses the shared moso-svc GSA" (:34-38), and onboarding.reminder settings DRY_RUN in prod (:260-265).

## 6. Open questions

1. **Production `recruit-svc-secret` is hand-made and not in the repo.** Does it carry any `RECRUIT_FEATURES_*` override, `PACKS_WRITEBACK_INTERNAL_API_KEY`, or `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY`? The last decides whether the signed-agreement pull (C-023) is scheduled at all. It is in neither BOOTSTRAP secret list.
2. **Production `recruit_settings` live values** (not in the repo): `referrals.enabled` (seed false), `program_sync.mode` (seed OFF), `onboarding.reminder.delivery_mode` (seed DRY_RUN), `nurture.drip.*`, `packs.writeback.experience_enabled`.
3. **With packs-writeback off in production, how do real Loan Officers get invited today?** Recruit marks the offer SENT and sends nothing (C-018). Presumably recruiters still press "send invite" in MOSO admin. This needs confirming with the business.
4. **Which packs build serves production: master or 3.64.1?** `GET /api/recruit/v1/webinars` (used by the webinar-registration picker, `RecruitApiClient.java:178-200`) exists only on master (`RecruitAPI.java:270`).
5. Does MOSO write Loan Officer licences into user-service (C-056; `PostJoinedReconciler.java:29` implies it)? I could not find the writer in packs within this scope.
6. Where does recruit's Postgres live (`DB_HOST` is secret only)? If it is Cloud SQL in `lender-rate`, that is another MOSO-project dependency.
7. Scope decision for the lead: should auth-service, account-fe, user-service, api-gateway-v2, cron-service-go, zoom-go and the shared Redis count as "MOSO"? They are not in the MOSO repo list, but they run on MOSO's clusters and projects. All are marked BORDERLINE here.
8. moso, base and moso-configuration: I found no recruit-facing code in them. packs (the `loan` module) is the MOSO GAE app's Recruit surface. I did not trace whether `base`/`moso` provide the `/exec/` op runner, Endpoints servlet or `EmailTemplateOp` transport underneath packs. If they do, they are transitive dependencies of C-008, C-018, C-022, C-026 and C-029.

