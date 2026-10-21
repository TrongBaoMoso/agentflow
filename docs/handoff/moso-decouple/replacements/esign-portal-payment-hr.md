# Recruit off MOSO: e-sign, LO portal, payments, HR migration (research, 2026-10-21)

All refs were read after `git fetch`. Shorthand: `DE` = document-esign@origin/master (d33c68f, the same sha as origin/production), `HRB` = ai-hr-be@origin/master (c44c4ba6; origin/production c0bbcb72 also has the files cited), `LFH` = lf-homepage@origin/master, `PK` = packs@origin/master, `RB` = recruit-be@origin/master.
"LIVE" means the code is on the repo's production branch and the prod workflow ran successfully (GitHub Actions API) or prod helm values enable it. No running service was called.

---

## 1. document-esign

### What it is (LIVE in prod)
- It is a single Spring Boot JVM with these modules: Template (Handlebars → HTML/PDF), Document Bundle, Generation, DMS (folder tree plus GCS bytes), Disclosure (per-state packages), E-sign and Audit. Source: `DE:README.md:1-30`.
- **Prod deploy:**
  - `DE:.github/workflows/cd-production.yml` deploys on a push to `production` to GKE `moso-gke`, namespace `document-esign`.
  - The last successful prod runs were 2026-10-20 (d33c68f), 10-19 and 10-13, from GH Actions API `cd-production.yml/runs`.
  - Prod values are in `DE:helm-chart/config/production/values.yaml`. They set the DB `documents_esign_db`, `ESIGN_SIGNING_BASE_URL=https://beta-los.loanfactory.com` and `INKLESS_CALLBACK_URL=https://gateway.loanfactory.com/documents-esign-svc/public/api/webhooks/inkless`, plus the HR, lender and vendor buckets.
  - The prod NetworkPolicy allow-list (api-gateway, tera-be, hr-prod, cron-service, marketplace-be) does not include recruit. The file says the policy is not enforced in prod yet ("legacy dataplane").

### E-sign mechanics
- **Inkless client.** `DE:src/main/java/com/loanfactory/platform/esign/client/InklessApiClient.java`, with `MockInklessApiClient` beside it.
  - The base URL is `https://api.inklesshub.com` (`DE:src/main/resources/application.yml:89-97`).
  - **Inkless credentials and the global `use_inkless` switch live in the DB table `esign_settings` and are managed by an admin.** The yml comment at :86-87 says so; see also `EsignSettingsController`. I did not read the prod value of `use_inkless`.
- **Three gates decide between Inkless and the free built-in signer:**
  1. global `esign_settings.use_inkless`
  2. per-template `enable_inkless`
  3. per-request `useInklessSend`

  `source=DISCLOSURE` ignores gate 2. Sources: `DE:.../esign/model/request/GenerateAndSendRequest.java` (javadoc on `useInklessSend`) and `EsignGenerateAndSendServiceImpl.java:274-292` (`resolveUseInkless`).
- **User door:** `POST /api/v1/esign/generate-and-send` (`EsignGenerateAndSendController.java:16,27`) and `/api/v1/esign/envelopes` with list, get, audit-trail, fill-data, skip and cancel (`EsignEnvelopeController.java:33-142`).
- **Internal door** (in-cluster, no key, trusted by `X-Service-Source`; `application.yml:191-218`): `/internal/api/v1/esign/envelopes` for POST send, GET, cancel, skip, `participants/{id}/credentials`, `templates?code=` and `availability` (`EsignInternalEnvelopeController.java:40-118`).
- **Request shape** (`GenerateAndSendRequest`):
  - `serviceType`, `parentId`, `source`, `documents[]` with `templateId` and per-document `fillData`, `signers[]`
  - optional `idempotencyKey`, `supersedesEnvelopeId` (cancel then resend) and `allowedSignatureSources`
  - Sources: `GenerateAndSendRequest.java`, `GenerateAndSendDocument.java:24,28`.
- **Webhook.**
  - The endpoint is `POST /public/api/webhooks/inkless`. It is unauthenticated by design and only triggers a re-read from Inkless (`EsignStatusUpdateService.refreshFromInkless`). It always answers 200 (`EsignWebhookController.java:12-49`).
  - A cron-service sweep every 30 min is the safety net (`application.yml:100-124`; `EsignPollCronRegistrar`).
- **Events (GCP Pub/Sub):**
  - `ESIGN_ENVELOPE_COMPLETED_TOPIC` (`.../model/event/EsignEnvelopeCompletedEvent.java:42`) carries envelopeId, serviceType, parentId, source, documents with `signedFileId`, signers with `signedAt`, `masterSignedFileId` and `certificateFileId`.
  - `ESIGN_ENVELOPE_SENT_TOPIC` (`EsignEnvelopeSentEvent.java:46`) carries the per-signer `signingUrl`.
  - The publisher is `EsignEventPublisherImpl.java`.
  - The **only subscriber today is tera-be**: `tera-be@origin/master:src/main/java/com/loanfactory/tera/credit/listener/EsignEnvelopeCompletedHandler.java:60-61` (`...-tera-sub`) and `EsignEnvelopeSentHandler.java:68-69`, which emails the signers. Org-wide `gh search code` for the topic finds only these two.
- **Completed files** land in DMS under the envelope's `serviceType/parentId` folder (`Generated_Documents`; `EsignGenerateAndSendServiceImpl.java:302-305`).

### Multi-tenant / app scoping
- **Per-caller scoping:**
  - `ServiceType` enum is `LOAN, APPLICATION, DEPARTMENT, HUMAN_RESOURCE, LENDER, VENDOR, SYSTEM` (`DE:.../dms/entity/DmsFolderEntity.java:107-115`). **There is no RECRUIT or CANDIDATE value.**
  - Registered internal callers (`application.yml:199-218`):
    - `HRIS` → `[HUMAN_RESOURCE]`
    - `TERA` → `[LOAN, APPLICATION]`
    - `MARKETPLACE` → `[LENDER, VENDOR]`
    - `CRON` → `[]`
  - A source not listed gets 401. **There is no RECRUIT caller.**
  - **The internal e-sign door refuses app-delegated types (HUMAN_RESOURCE, LENDER, VENDOR) even for their owner** (`EsignInternalService.java:44-47,211-215`; `dms/auth/AppDelegatedServiceTypes.java`). So HR cannot e-sign through document-esign today.
- **Template ownership:** `template.storage.owners` gives `TERA` `[TRANSACTION_DOCUMENTS]` and `HRIS` `[HR_DOCUMENTS]` (`application.yml:277-279`).
- **Generator tenant:** single tenant, `generator.tenant-key=LOAN_FACTORY` (`application.yml`, `generator:` block).
- **`source` enum** (`DE:.../esign/model/EsignEnum.java:20-35`): `DISCLOSURE, GENERATE_DOC, HR_AGREEMENT, ILO_AGREEMENT, OTHER`.
  - **Mismatch:** tera-docs `document-esign/ESIGN-API.md:644` and the DTO javadoc both say `LO_AGREEMENT`. A caller sending `LO_AGREEMENT` would fail to deserialise.
  - Nothing in DE handles `ILO_AGREEMENT` beyond the enum (`git grep ILO_AGREEMENT` finds 1 hit).

### Templates, editor and fields
- **File templates.** 323 files (template pairs) under `DE:src/main/resources/templates/`, synced into the `templates` table at boot (`template/service/TemplateFileSyncService.java`).
- **Admin CRUD** (this is the "template editor" API):
  - `/api/v1/templates`: list, get, POST, PATCH, upload, render (`TemplateController.java:38-161`)
  - internal `/internal/.../templates/{code}`: PATCH, PUT content, preview, prefill, render, generator-conditions (`TemplateInternalController.java:62-262`)
  - tera-fe consumes this through `src/apis/tera-be/template.api.ts` (gh search).
- **Signer slots.** `{{signer_N_signature}}` / `{{signer_N_date}}`. Each slot has `signer_role` `BORROWER` (default) or `LOAN_OFFICER` (`template/TEMPLATE_SERVICE.md:414`).
  - A LOAN_OFFICER slot is resolved from **tera-be's loan** (`SignerSlotPlanner.java:65,281`).
  - Borrower-surplus logic calls tera-be `getBorrowers(parentId)` (`:104`).
  - So the role model is loan-shaped. **There is no CANDIDATE or COMPANY countersigner role.**
- **Fill data.** It is per document (`fillData`), not per recipient. Loan prefill (`LoanPrefillContext`) applies only to loans.
- **ILO-relevant templates in DE (all in prod):**

  | packs required doc (`PK:.../recruiting/EnsureSigningSessionsRegisterInterestedLoanOfficer.java:936-955`) | DE template | Status |
  |---|---|---|
  | 1099 (non-corporate) `1099_agreement_form_finalized` | yes, `category HR_DOCUMENTS`, `enable_inkless=true`, 22 pages fully rebuilt (21 page-breaks) | vars: full_name, fill_date, associate_initials, text_1, text_2, current_date, signer_1 |
  | W-2 (corporate) `w2_agreement_form_finalized` | yes, HR_DOCUMENTS, 22 pages | vars: full_name, associate_initials, current_date, signer_1 |
  | `ca_compliance_statement` (CA sponsor state and no DRE endorsement) | yes, **TRANSACTION_DOCUMENTS** | vars: company_logo, full_name, nmls, signer_1 |
  | `exclusive_agent_agreement` (1099 and licensed in VA/MS: `PK:.../shared/entity/LORecruiting.java:411`) | yes, HR_DOCUMENTS, 3 pages | vars: company_logo, current_date, full_name, full_address, nmls, signer_1 |
  | legacy `ilo_1099_agreement` / `olo_w2_agreement` (old-signed equivalents) | yes, but **PARTIAL REBUILD** (3 of 10 pages / 4 of 11), `available_in_generator=false` | template description in `ilo_1099_agreement.inputs.json` |

  - On every one of these, signer slot 1 = the Loan Officer only.
  - **The company side is pre-printed (CEO signature baked into the background). No countersigner slot exists** (ilo_1099 description: "WHO SIGNS: the LOAN OFFICER … only").

### Who calls DE today
- **tera-be (prod, LIVE).** Client classes are `tera-be:src/main/java/com/loanfactory/tera/thirdparty/documentesign/service/impl/EsignInternalClientImpl.java` and `EsignSigningRelayClientImpl.java`. Uses are disclosures, credit-authorization envelopes and generate-docs. `DOCUMENT_ESIGN_URL` is set at `tera-be:helm-chart/config/production/values.yaml:149-155`.
- **tera-fe** (user door via gateway `documents-esign-svc`): `src/apis/tera-be/esign.api.ts`, `disclosure.api.ts`, `template.api.ts`, `next.config.mjs` (gh search).
- **Loan-Factory-Borrower-Portal (Tera+):** public signing page `app/esign/sign/[participantId]`. Its plan `docs/superpowers/plans/2026-10-16-esign-route-via-tera-be-frontend.md` moves it behind the tera-be relay.
- **ai-hr-be: DMS only, not e-sign.** Sources: `HRB:internal/dmsclient/client.go:1-3`, `HRB:helm-chart/config/production/values.yaml:38` (`internalUrl …document-esign…:8092`).
  - The HR catalogue has an `esign_document` template-key column (`HRB:internal/db/migrations/00205_…sql:48`), but HR sends no envelope. A grep for `esign` in HRB Go finds no client.
- **No hits:** ai-hr-fe, account-fe, user-service, lfiq-backend (origin/develop), lf-iq.
- **recruit-be: none yet.**
  - `RB:src/main/java/com/loanfactory/recruit/offer/service/impl/OfferServiceImpl.java:650` reads "TODO(document-esign): create the envelope here".
  - `recruit-fe:src/apis/recruit/offers.api.ts:165` describes "manual stub for the e-sign webhook".
  - `RB:.../offer/service/OfferService.java:62` anticipates document-esign calling back.

### What a recruit ILO agreement would need / what is missing
**Needed:**
1. **Doc selection.** Port `computeRequiredDocs`:
   - 1099 vs W-2 from `is_corporate_loan_officer`
   - `ca_compliance_statement` if sponsor states include CA and there is no DRE endorsement
   - `exclusive_agent_agreement` if 1099 and licensed in VA or MS
   - the legacy-signed equivalence (`ilo_1099_agreement` / `olo_w2_agreement`), so already-signed LOs are not re-sent (`PK:…:936-990`)
2. **Fill data from the candidate:** full_name, nmls, full_address, current_date, associate_initials, 1099 `text_1/text_2` and `fill_date` (meaning to be checked per template).
3. **Signer:** the LO only. There is no countersigner today; the CEO signature is pre-printed.

**Missing in DE:**
- (a) A `ServiceType` for recruit (e.g. `RECRUIT`/`CANDIDATE`) that is **not** app-delegated, or an internal-door exception. HUMAN_RESOURCE is refused on that door.
- (b) A `RECRUIT` entry under `internal.callers`, plus a bucket for that service type.
- (c) A signer role for a non-loan party. The slot planner is loan-shaped; ILO templates use the default BORROWER role, which works mechanically but is semantically wrong.
- (d) A recruit subscription to `ESIGN_ENVELOPE_COMPLETED_TOPIC` filtered on `source=ILO_AGREEMENT`, plus a decision on who emails the signing link. Today only tera-be emails signers, off `ESIGN_ENVELOPE_SENT_TOPIC`.
- (e) A built-in signing UI host. `ESIGN_SIGNING_BASE_URL` points to beta-los (tera-fe). The Inkless portal link is returned for Inkless envelopes.
- (f) The `LO_AGREEMENT` vs `ILO_AGREEMENT` naming fix.
- (g) Owner sign-off that the 1099/W-2 22-page rebuilds equal the legal text. The legacy ilo/olo rebuilds are explicitly partial.
- (h) An Inkless decision: the global flag and credentials are in the prod DB. The per-envelope cost argument is in `GenerateAndSendRequest` (idempotencyKey javadoc).

### tera-docs `document-esign/`
- Files: README, ESIGN_OVERVIEW, ESIGN-API, GENERATE_AND_ESIGN_INTEGRATION_GUIDE, SIGNING_UI_SPEC, TEMPLATE-API, DMS-API, DISCLOSURE-API.
- `ESIGN-API.md:146` lists `HR_AGREEMENT / LO_AGREEMENT` as "admin self-signs, in-app Inkless link" flows. **That is planned in the docs, not implemented in code.**

---

## 2. LO onboarding portal alternatives (outsider, not yet a user)

- **lf-homepage `/register-loan-officer` (LIVE; also on `origin/production`).** It is a client-only Next page; every call goes **to packs WebPlus** via `NEXT_PUBLIC_MOSO_API_URL` (`LFH:src/apis/mosoApi.ts:47`). The calls in `LFH:src/apis/loanfactoryApi.ts` are:
  - `registerLoanOfficer` → `/api/webplus/v1/{ns}/registerLoanOfficer` (:798-806)
  - `updateSigningUrl` → `registerSigningAgreement` (:808-818)
  - `getRegisterLOProcessInfo` → `getRegisterLoanOfficer?key=`, falling back to `execute/GetOp` (:820-830)
  - PayPal config → `execute/GetOp?kind=MeetingAndAppointmentConfiguration` (:864)
  - `submitPayingOneTimeSuccess` → `saveLoanOfficerPaidStartupFee` (:870-877)
  - The signing step opens the packs-built Inkless link in a new tab (`…/ReviewAndSignAgreement/index.tsx:18`).
- **The recruit `register-status` call is gone.** It was added in 8e5953ac (2026-09-24, agentflow-fnr6) and **removed in 72cef7e3 (2026-09-29, agentflow-raxp5)**: "pay/sign now unlock ONLY on onboarding_meeting_status pre_onboarding_done|setup_done". So `RB:.../registerstatus/controller/RegisterStatusController.java:68` (`GET /public/api/v1/register-status`) has **no caller** on LFH master. None of LFH master/production, lo-homepage `produciton-v2` or `release` references it.
- **lo-homepage (`produciton-v2`).** The same page and the same packs calls (`loanfactoryApi.ts:785-797`).
- **account-fe (`main`).** The account/SSO app: login, set-password, verification, auth/handoff, plus private profile/security/IAM pages. There is no form, upload, sign or pay flow for a non-user.
- **ai-hr-fe / ai-hr-be.**
  - The only anonymous surface is the **careers portal**: `HRB:internal/api/careers.go:18-33`. It offers `GET /public/careers/jobs`, `POST /public/careers/jobs/{id}/apply` with a CV of up to 10 MB, rate-limited per IP. The pages are `ai-hr-fe:app/careers/page.tsx` and `app/careers/[id]/page.tsx`. It is in production (`origin/production` has careers.go; ai-hr-be `cd-production.yml` succeeded 2026-10-20).
  - **There is no pre-account self-onboarding or magic link.** Associate onboarding (`onboarding_mine_get` / `onboarding_mine_task_set_status`) runs after the hire has a platform account and signs in.
  - Other public routes are only device webhooks, `ooo/email-decision` and the packs-todo webhook.
- **Borrower portals.**
  - `lf-borrower-portal` (mosoteam, last push 2026-09-09) has a tokenized `(public)/todos/[token]` and `verify/[token]` pattern against MOSO.
  - The newer `LoanFactory-Inc/Loan-Factory-Borrower-Portal` (Tera+) has a public **built-in signing page** `app/esign/sign/[participantId]`, backed by DE plus the tera-be relay. It is the nearest reusable "outsider signs" UI.
- **Conclusion:** no non-MOSO portal does profile + docs + sign + pay for a non-user today. The building blocks are:
  - HR careers: an anonymous form with upload and abuse limits
  - Tera+ / tera-fe built-in signing pages: a credential link per participant
  - recruit-be's own `/public/**` pattern (register-status, host-subjects)

---

## 3. Payments

- **The ILO startup fee is entirely packs.**
  - The browser runs PayPal JS checkout and captures client-side (`LFH:…/PayingOneTime/index.tsx:80-110`, `@paypal/react-paypal-js`). It then posts `paypal_order_id` to packs.
  - **packs verifies server-side.** `PK:loan/src/main/java/com/mvu/loan/server/op/meeting/InterestedLoanOfficerPaidStartupFee.java:32-80` calls `GET api-m.paypal.com/v2/checkout/orders/{id}` with the client id and secret from Datastore `MeetingAndAppointmentConfiguration` (`ilo_paypal_client_id/secret`, `ilo_startup_fee`, default 100), checks USD and the amount, then sets `paid_startup_fee` and `paypal_order_id`.
  - The WebPlus entry is `PK:.../op/api/WebPlusAPI.java:2658-2659`. Waive is done by MOSO staff or RecruitAPI (`WebPlusAPI.java:2602`).
  - recruit-be mirrors the fee state from MOSO (`RB:OfferServiceImpl.java:90-123`, D230 "paid wins over waived").
- **Org search:** `gh search code paypal` / `stripe`, capped at 100 hits.
  - **PayPal** appears only in MOSO repos (packs, base, moso, moso-configuration, ai-moso-routing), lf-homepage, lo-homepage and lf-borrower-portal. In recruit-be/fe it appears only as sync-field names, and in ai-underwriter only as bank-statement parsing.
  - **Stripe:** the only real integration is **moso-real-estate-be** `src/domains/moso_email/stripe_client.py`. It uses Stripe Checkout plus webhooks to bill **authenticated** agents for @moso.com mailboxes, and its prod helm values carry no `STRIPE` key (it may come from a secret; not verified). The other hits are CSS or docs.
- **accounting-be** (NestJS + Postgres, `README.md`) handles AP: expense and payment requests, approvals, vendor payouts, QuickBooks Online. accounting-fe is its UI. There is no inbound card or PayPal collection.
- **wallet**: React + NestJS "digital wallet" monorepo, last push 2026-01-05, dormant.
- **ramp**: a Go sync from Ramp bill-pay to LOS commission paid (outbound payouts).
- **Answer: no non-MOSO service can take a startup fee from a non-user today.** Moving it off would need a server-side PayPal verify (port of `checkPayPalTransaction`) in recruit-be, with PayPal credentials in Secret Manager, plus a public pay page.

---

## 4. HR (ai-hr-be) and packs

### How data moved
- **Phase 1: batch import (2026-07).**
  - `cmd/migrate-associates` was deleted in `dbb35ea84` (2026-09-22). Readable at `HRB dbb35ea84^:cmd/migrate-associates/main.go:27-41`: `-input` takes canonical JSON/JSONL or "MCP CSV"; flags include `-crosswalk`, dry-run/apply/reconcile and resumable batches.
  - The source was a **packs export** (`PK:loan/src/main/java/com/mvu/loan/server/op/SyncAdminToMCPOp.java`, referenced by `HRB:internal/assocmig/contract.go:15,55`) and reviewed crosswalk files `scripts/real-data/{crosswalk,hr-crosswalk}.json`.
  - The pipeline is in `HRB:internal/assocmig/` (contract `associate.v1`, `SourceRecord{source_system:"datastore", source_kind:"admin", source_key, legacy_associate_id, platform_user_id}`).
- **Phase 2: direct Datastore reads** (no packs API).
  - `HRB:internal/packsstore/store.go` header: "HR's READ door onto packs: its Google Datastore, read directly, the way tera-be reads it". It reads kinds Admin, Branch and OfficeLocation, never Credential.
  - One-shot `cmd/packs-*` tools read Datastore the same way (dry-run by default, `-apply`, idempotent on the packs id): `packs-workplace-seed`, `packs-bonus-level`, `packs-device-verifications`, `packs-personal-ids`, `packs-real-estate`, and `todo-import` ("IT READS DATASTORE, not an export").
  - Prod namespace: `HRB:helm-chart/config/production/values.yaml:94-95` (`packsDatastoreProject: lender-rate`).
- **Identity mapping.**
  - `external_identity_map(source_system, source_kind, source_key, legacy_associate_id, platform_user_id, person_id, employment_id, status…)` (`HRB:internal/db/migrations/00002_identity_person.sql:15-40`).
  - `source_key` is the **legacy App Engine urlsafe key**, encoded and decoded byte-compatibly with tera-be's `LfLegacyKeyEncoder` (`HRB:internal/packsstore/key.go`, `internal/packs/key.go`).
  - If no key matches, matching falls back to work email against `company_email`, then the sign-in address. More than one hit is ambiguous and skipped (`HRB:internal/packs/match.go`).
  - The packs Associate ID (`Admin.unique_id`) became the employee-number series (`cmd/associate-id-backfill`).
  - Branch and team mapping lives in the `packs_crosswalk` document (`00170_packs_crosswalk.sql`; app_setting since 00251).
  - The person's identity is the **user-service `platform_user_id`**.

### HR is still dual-running with packs at runtime (LIVE in prod)
- **Live sync IN.** The packs Pub/Sub pointers `TERA_UPDATE_USER_TOPIC` (a packs save) and `USER_REGISTERED_TOPIC` drive `PacksSyncService`, which reads Datastore (`HRB:internal/service/packssync.go`, `internal/packsclient/signal.go:44-48`).
  - "since 2026-09-17 a packs save onboards the person it names" (deleted `cmd/packs-strangers` header).
  - Prod config: `packsSyncPubsubProject: lender-rate` (values.yaml:25).
  - The reconcile walk is OFF (`packsReconcileInterval: "off"`, :204-206).
- **Push OUT.** HR writes to packs only through packs's app-layer ops, never storage. `HRB:internal/packsclient/client.go:1-20,145,188` calls `execute/register.InviteAdminsOp`, which creates the MOSO Admin for a new hire, and `execute/user.UpdateMemberOp`.
  - Prod sets `packsPushEnabled: true` and `packsAutoOffboard: true` (values.yaml:26-27).
  - `createEmployee` enqueues the push inside the hire tx (`HRB:internal/service/draft_hire.go:87-90,116-118`).
- **Daily imports still running in prod:** `todoImport.enabled: true` (04:00) and `packsDeviceVerifications` 06:00 VN (values.yaml:82-93).
- **HR files** are being copied from HR's bucket into DMS (`cmd/migrate-hr-docs-to-dms`, suspended CronJob; DMS import source bucket `ai-hr-pro`).

### Recruit hand-off: `POST /internal/v1/recruit/hires` (LIVE on ai-hr-be production branch)
- **Route:** `HRB:internal/api/recruitintake.go:16`. It is `internalWrite`: in-cluster, no key, and the only permitted kind of peer write (`HRB:internal/api/router.go:146`).
- **What it does** (`HRB:internal/service/recruitintake.go`, `IntakeRecruitHire`):
  - parses `recruit.hired.v1` (`source_key` = candidate UUID; names, legal names, email, phone, employment_type, mailing address, languages, NMLS)
  - looks up the platform account by email and the NMLS holders in user-service
  - creates a **DRAFT employee** (entity `us`, tz America/Los_Angeles, hire date = `occurred_at`) and returns `draft_id`, `result`, `platform_user_id` and `dropped[]`
  - **Nothing else happens until an HR person submits the draft.**
- **On submit** (`SubmitDraft` → `createEmployee`, `HRB:internal/service/draft.go:302`, `draft_hire.go:30-122`):
  - `provisionHireAccount`: picks, reuses or **registers the platform (user-service) account**, and proposes the company email (`draft_hire.go:160-200`)
  - creates the employment
  - pushes addresses, languages, licences, NMLS, offices and professions to the platform
  - leave/holiday plans and default commission
  - **enqueues the packs push** (InviteAdminsOp → MOSO Admin)
  - **enqueues the Mortgage Education account** (`meAccount`, vendor course bundles; welcome mail copied to `accountMailCC`; prod `pushEnabled/writesEnabled: "true"`, values.yaml:208-214)
- **Not part of this flow:**
  - Google Workspace: ai-hr-be has no reference to `google-account-service`.
  - E-sign: no document-esign envelope.
- **Back to recruit:** HR publishes `HR_ASSOCIATE_ONBOARD` / `UPDATE` / `ROLE` / `DEACTIVE` (tera-docs `hr/pub-sub-associate.md`).
  - recruit subscribes `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT`.
  - Recruit prod sets `RECRUIT_FEATURES_HR_HANDOFF_PUBLISH=true` (manual "Send to HR" since 07/10) and `RECRUIT_FEATURES_HR_HANDOFF_AUTO_SEND=false` (off since 08/10) (`RB:helm-chart/config/production/values.yaml:190-212`).
- **tera-docs `hr/`:** HR_INTERNAL_API_DOCS.md, hr-documents.md, pub-sub-associate.md, pub-sub-ooo.md, role.md (last change cb65bc8, 2026-10-19).

### Implication for recruit
HR did not "leave" packs. It made HR the owner of HR-only facts, while keeping:
- packs → HR live onboarding through Pub/Sub plus direct Datastore reads, keyed on the legacy urlsafe key
- HR → packs writes through packs's own ops (InviteAdminsOp / UpdateMemberOp)

The same pattern fits recruit:
- Datastore reads for `LORecruiting`. tera-be and HR already do this, and recruit has `legacy_key`.
- Writes only through packs ops until MOSO's consumers of `LORecruiting` (the Admin invite and the MOSO login) are replaced.
- MOSO Admin creation already happens downstream when HR submits the hire.
