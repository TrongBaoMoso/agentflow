# R2 — Non-MOSO replacements for capability group 2: communication, onboarding, contract, identity, infra

Read-only research, 2026-10-21. All repos were `git fetch`ed and read on `origin/<default>` and, where it matters, `origin/production`. Org repos that are not cloned were read with `gh api` (read-only). No services were called and no secrets were read.

Refs used:
- recruit-be `origin/master` 8c064b0d
- moso-notifier (mn) production e979fd1f / master = production + 13
- document-esign (DE) master = production d33c68f
- ai-hr-be (HRB) production c0bbcb72 / master c44c4ba6
- auth-service production d7b1ffe
- user-service production 6460cad
- omni-service production 2049e33
- zoom-go master 67a4b73
- followup-be master 3b2ade0
- tera-docs master

Dependency IDs refer to the audits: A-xxx (code-forward), B-xxx (reverse) and C-xxx (business flows).

Supporting detail with more line references is in three helper files:
- `/private/tmp/claude-501/-Users-apple-Projects-agentflow/29578130-719f-4478-9edb-a48f868b3299/scratchpad/r2/email-templates-bell.md`
- `/private/tmp/claude-501/-Users-apple-Projects-agentflow/29578130-719f-4478-9edb-a48f868b3299/scratchpad/r2/esign-portal-payment-hr.md`
- `/private/tmp/claude-501/-Users-apple-Projects-agentflow/29578130-719f-4478-9edb-a48f868b3299/scratchpad/r2/identity-accounts-hosting.md`

---

## 0. Classification of the "borderline" services (the evidence settles it)

| Service | Verdict | Evidence |
|---|---|---|
| **moso-notifier** (prod) | **TERA platform service, not old MOSO.** In production it already runs **notifier-be** (Java 21 + tera-core + Postgres `notification_db`), cut over 2026-10-18. Owner: Khai. Its only runtime tie to MOSO is **auth for Bearer callers**: it reads the MOSO Datastore `Configuration/1.api_secret` and MOSO user entities. Sending does not touch packs. | mn@production commits `b4d331da` (#296 "notifier-be replaces moso-notifier"), `88ad6500` (#313 subscriptions released); `helm-chart/config/production/values.yaml:192-193` `cutover.productionReady: true`; `.github/workflows/cd-production.yml:105-109` (lender-rate / moso-gke / ns `moso-notifier-prod`); `auth/datastore/AuthDatastoreConfiguration.java:15-40`, `DatastoreJwtSecretProvider.java:11-26`; tera-docs `notification/README.md:7` "Owner: Khai" |
| **notification-service** (Go) | TERA strangler sidecar for notifier-be. On staging it runs inside the moso-notifier pod and has taken over steps 2–8. **It is not in production**: production values have no `sidecar`, and the repo has no `production` branch. Production waves are planned 10-26 → 11-03. Wave 5 (11-02) moves template/config writes and the seeders to Go. Removing Java is "not scheduled". It is wire-compatible, so callers change nothing. | mn@master `helm-chart/config/staging/values.yaml:52-53,180-191,236-245`; mn@master `helm-chart/values.yaml:105-106` (`sidecar.enabled: false` default); notification-service `docs/GO_CUTOVER_PLAN.md` §10, §14, §17 (via gh api) |
| **omni-service** | **TERA platform service** (Go comm hub, "extracted from the LOS"). Email goes out through notifier v2 (app TERA). SMS goes out through zoom-go. **Two MOSO residues**: the SMS sender is keyed on the old-LOS GAE key (`los_user_id`), and recruit's LO_CANDIDATE adopter is fine. | omni@production `cmd/server/main.go:706-727` (v2 email), `helm-chart/config/production/values.yaml:345` `COMM_DISPATCH_ENABLED: "true"`; zoom-go@master `db/schema/schema.sql:503,1600`, README :364-368 |
| **cron-service-go, followup-be, auth-service, user-service, document-esign, ai-hr-be, api-gateway-v2** | TERA platform. All run in the same `lender-rate`/`moso-gke` project and cluster (see §10). | per section |

The consequence for Recruit: **A-037…A-041 (moso-notifier) and A-042…A-054 (omni) are not "old MOSO" dependencies.** They are platform dependencies that Recruit should keep. The real old-MOSO pieces in this group are:
- the five packs-sent emails and their Datastore templates (A-021/023/025/027/028, B-001/004/005/008/009/041);
- Inkless in packs (A-026/027/032, B-007/008/022/043);
- `/apply_loan_officer` and PayPal (B-042, B-023, A-010);
- the MOSO Admin actor (A-019, B-014/015);
- "Create new account" and the commission plan (A-031);
- MOSO SSO as an IdP (B-110);
- user-service sync from MOSO (B-111);
- the `los_user_id` key (A-053).

---

## 1. Sending email to Loan Officers

**Today.** packs sends five emails, rendering MOSO Datastore templates and calling SendGrid **directly**. These do *not* go through moso-notifier (base@master `appengine/.../GAEEmailService.java:85,132,176`; packs `SaveLORecruitingFromRecruitOp.java:269-292`). The From address is the acting MOSO Admin, and the signature comes from the Admin's branch (B-015).

| Mail | Recruit trigger | Dependency IDs |
|---|---|---|
| Invite to join `interested_loan_officer_invitation_email` | `/candidate/invite` | A-021, B-001 |
| Webinar confirmation `webinar_registration_send_manually` | `/candidate/registerWebinar` | A-023, B-004 |
| Pre-onboarding / welcome `pre_onboarding_done` | `/candidate/onboardingMeeting` | A-025, B-005 |
| Agreement link `require_ilo_esign_documents` | `/candidate/agreement/send` | A-027, B-008 |
| 1-1 reminder `RecruitMeetingReminder` | `/candidate/meetingReminder` | A-028, B-009 |

Recruit-owned emails (nurture drip, scheduled "Send info") already go out on **notifier v2**, but they are flag-off in prod (A-037, C-035/036). MOSO's own cron also still emails `LORecruiting` rows (B-113 `ProcessLORecruitingFollowUpEDCCronOp`).

**Candidates**

| Path | What it does | Prod? | Gaps for Recruit |
|---|---|---|---|
| **notifier-be v2** (moso-notifier) | Pub/Sub `NOTIFICATION_EVENT_TOPIC` plus `CREATE_TEMPLATE_TOPIC` declarations, delivered through SendGrid. **Per-person From is supported**: the event's `actor{email,name}` becomes `Name <person@loanfactory.com>` when the domain is in the app's `allowedFromDomains`. Reply-To is taken from `email.replyTo`, then the actor, then the config (mn@production `mail/service/impl/MailServiceImpl.java:229-292`; `notification/send/EmailSender.java:64-65`). **It is the platform standard**: tera-docs `notification/NOTIFICATION_V2_PRODUCER_GUIDE.md` says "every producer … moves to NOTIFICATION_EVENT_TOPIC", and v1 is deprecated (:252-258). Users: auth-service (AUTH_SVC), ai-hr-be (HR onboarding mails, `internal/notifierv2/event.go:64-90`), tera-be, omni. | **Live** | (a) **No RECRUIT sender identity in prod.** It exists only in `application-staging.yml:41-49` ("Production does not get RECRUIT"), on both master and production. A row may have been added by hand through the admin API; check read-only first with `GET /api/v1/admin/mail/config/RECRUIT`. (b) **No signature feature**, so the signature must be rendered into the HTML. (c) Recruit's GSA needs publish rights on both topics in `lender-rate`. |
| omni email | Recruiter-composed email from the conversation. It already rides notifier v2 as app TERA. | Live | Built for human 1:1 mail, not system templates. Keep it for that. |
| auth-service mail | Only auth mails (reset, invite, OTP) through v2 | Live | Not a general sender |
| followup-be notify | Due/digest mail to the follow-up **owner** (staff), v2, app code RECRUIT supported | **Off in prod** (`NOTIFY_ENABLED: "false"`, followup-be@master `helm-chart/config/production/values.yaml:73,78`) | Staff-facing only |

**Recommendation: USE notifier-be v2 + OWN the content in Recruit. Size M overall.**
1. Add a prod RECRUIT mail_config (size S): a moso-notifier config PR copying `RECRUIT: ENGAGEMENT` plus `allowed-from-domains: loanfactory.com` into production, or an admin-API row. After Wave 5 (11-02) the same identity must also be in Go's seeder config. Owner: the notifier team (Khai). Release: the `release-moso-notifier` / `platform-release` teams push `production`.
2. For each of the five mails, add a Recruit passthrough type modelled on `RECRUIT_NURTURE_MAIL`: Recruit renders the subject and HTML, sets actor = recruiter/specialist, and sets replyTo = the omni reply address when available (size M; the plumbing exists in `nurture/drip/NurtureMailEvents.java`).
3. Keep the signature block in Recruit's template. Its data (title, phone, branch address) must come from Recruit/user-service/HR, not from the MOSO Admin branch.
4. Turn on `mail-status-intake` so bounces become suppressions. Ask the notifier team to enable `WEBHOOK_SIGNATURE_VERIFICATION_ENABLED` in prod: it is off today (mn@production values.yaml:84-86), so status events can be forged.

**Ordering.** The sender identity must be in place before any send. Each mail moves only together with the flow that creates its link: the invite and agreement mails embed `/apply_loan_officer?key=` (B-042), so they cannot leave packs until §4/§5 provide a non-MOSO link.

**Cut-over risks.**
- **Double sending:** packs sends when it receives the writeback, so a mail must stop being written back at the same moment Recruit starts sending it. Writeback is OFF in prod (lead's fact), so prod packs is not sending these on Recruit's behalf today; staging is.
- MOSO's own LORecruiting cron mails (B-113) keep running independently. Ask the packs owner to disable them for rows that Recruit owns.
- Deliverability: a recruiter's own From domain is DKIM-aligned through the app's SendGrid key. Verify on staging.

---

## 2. Email templates: ownership and editing

**Today.** The five LO mails live in MOSO Datastore `Template` entities. moso-configuration keeps backups only (B-041). Recruit's own mails already live in Recruit.

**Candidates**

| Store | What it offers | Prod? | Fit |
|---|---|---|---|
| **Recruit `message_templates`** + recruit-fe `/templates` | Types EMAIL/SMS/CALL_SCRIPT and a DRAFT→IN_REVIEW→ACTIVE→RETIRED approval lifecycle (V012). TEAM/PERSONAL scope and subject (V022). `purpose` GENERAL / NURTURE / WEBINAR / MARKETING / **ONBOARDING**, preheader and 4 Nurture seeds (V251). The 1-1 reminder texts are already V204 rows relabelled ONBOARDING (`db/migration/V251__…sql:16-30,48-60`). Tokens such as `{{first_name}}` and `{{recruiter_name}}` are filled server-side. | Live (editor) | **Best fit.** It already has an editor, variables and approval, and already holds the reminder copy. |
| notifier-be catalog | Template definition plus per-channel/language variants. A base layer comes from the producer and an edited layer from admins, with reset, render preview and an admin API (`/api/v2/templates`, mn@production `template/controller/PrivateTemplateV2Controller.java:28-66`). **No version history.** Editors exist only per app: tera-fe (TERA), ai-hr-fe `settings/mail-templates` (HR, with AI rewrite and sent-mail history), lf-iq. **There is no RECRUIT editor** and none in platform-react. | Live | Possible, but it would need a Recruit editor screen and would split ownership. Recruit's declaration today only registers the type, with no variants. |
| document-esign | No email templates (it returns signing links; the caller sends the mail, per `ESIGN_PLAN.md:26,41,52`) | — | n/a |

**Recommendation: OWN in Recruit (size S–M).** Port the four packs bodies (invite, webinar confirm, welcome/pre-onboarding, agreement link) into `message_templates` with purpose ONBOARDING/WEBINAR and Recruit tokens. Bring the original HTML over from moso-configuration `src/main/resources/backups/Template/email/*.content.htm` (B-041). The 1-1 reminder copy already exists.

**Risks.** Legal or compliance copy, in particular the agreement mail, needs owner sign-off. Do not leave two live editable copies (Datastore and Recruit): mark the Datastore templates as frozen.

---

## 3. Scheduling and reminders

**Today.** Recruit already owns the *scheduling* of everything. cron-service-go only fires Recruit's ~14 ticks: `CronService.create` → Pub/Sub `CRON_JOB_REGISTRATION` → HTTP callback to `/api/v1/*/internal/tick` (A-077, recruit-be@master `*TickCronRegistrar.java`, e.g. `onboarding/reminder/cron/OnboardingReminderTickCronRegistrar.java:72`).

The 1-1 reminder is computed in Recruit: offsets, guards, ledger claim `INSERT … ON CONFLICT DO NOTHING`, suppression at claim and at delivery. **Only the final send goes to packs** through `RecruitApiClient.meetingReminder` (`onboarding/reminder/service/impl/OnboardingReminderTickServiceImpl.java:26-41,84-91`). The code comment notes that the MOSO webinar reminder job has "no dedupe, no reschedule handling and no STOP check".

The MOSO-only scheduled pieces are the signed-reconcile sweep (A-032) and the writeback relay (A-033). Both disappear with the MOSO calls.

**Candidates**

| Service | Role | Prod? |
|---|---|---|
| **cron-service-go** | Central scheduler. Postgres SKIP LOCKED, EVENT/HTTP dispatch, sole scheduler in staging and prod. The Java cron-service is at 0 replicas and its repo is archived (cron-service-go README "Status"; `gke_lender-rate` ns `cron-service`). | **Live** |
| followup-be | Follow-up rows (type CANDIDATE among five), gRPC + REST, host push to Recruit. Due/digest mails to the owner. | Live; Recruit bridge on in prod (recruit-be prod values :234-249); notify **off** |
| notifier-be | **No scheduled/delayed send** (no send_at anywhere in mn src). The sweeper only retries. | — |

**Recommendation: OWN in Recruit (already done) + USE cron-service-go. Size S.** The only change needed is to swap the `meetingReminder` delivery from `RecruitApiClient` to a notifier-v2 passthrough send (see §1), reusing the existing ledger. Do the same for the webinar reminders if Recruit takes webinars over (group 1). Nothing is missing on the scheduling side.

**Risk.** For in-flight 1-1s, ledger keys already claimed with delivery to packs must not be resent. Switch at a tick boundary: drain the outbox `MEETING_REMINDER` rows first.

---

## 4. E-sign and contract (ILO agreement)

**Today.** packs builds the Inkless envelope (`EnsureSigningSessionsRegisterInterestedLoanOfficer`, `RebuildIloAgreementTask`) using required-docs rules. Completion is detected by `InklessWebhookOp`, `InklessProcessInterestedLoanOfficerCompletedOp` and `InklessPollStatusCronOp`. Signing state reaches Recruit through the push (`lo_agreement_signed`) plus the reconcile sweep. Related IDs: A-010, A-026, A-027, A-032, B-007, B-008, B-022, B-043. Recruit agreement-send is **off in prod** (C-021/022).

**Candidate: document-esign (DE). LIVE in prod.** The production branch equals master (d33c68f), and `cd-production.yml` last ran successfully on 2026-10-20 to `moso-gke` ns `document-esign`. Prod values have `INKLESS_CALLBACK_URL=https://gateway.loanfactory.com/documents-esign-svc/public/api/webhooks/inkless` and `ESIGN_SIGNING_BASE_URL=https://beta-los.loanfactory.com`.

What it does:
- **Templates.** Handlebars → HTML/PDF. 323 template files are synced to DB at boot. Admin CRUD/render/preview/prefill: `TemplateController.java:38-161`, `TemplateInternalController.java:62-262`.
- **Sending.** `POST /api/v1/esign/generate-and-send` (user) and `/internal/api/v1/esign/envelopes` (in-cluster, trusted by `X-Service-Source`).
- **Inkless or built-in signer.** Three gates decide: global `esign_settings.use_inkless` (DB, admin-managed), per-template `enable_inkless` and per-request `useInklessSend` (`EsignGenerateAndSendServiceImpl.java:274-292`).
- **Completion.** An open webhook triggers a re-read from Inkless, backed by a 30-minute cron sweep.
- **Events.** `ESIGN_ENVELOPE_COMPLETED_TOPIC` carries the signed file ids. `ESIGN_ENVELOPE_SENT_TOPIC` carries the signingUrl.
- **Users today.** tera-be is the only subscriber and caller (disclosures, credit auth), with tera-fe and the Tera+ borrower portal behind it. **ai-hr-be uses DE only for DMS, not e-sign.** recruit-be has only a TODO (`offer/service/impl/OfferServiceImpl.java:650` "TODO(document-esign): create the envelope here").
- **ILO agreement templates already in DE (prod):**
  - `1099_agreement_form_finalized` and `w2_agreement_form_finalized`: full 22-page rebuilds, HR_DOCUMENTS, enable_inkless.
  - `ca_compliance_statement` (TRANSACTION_DOCUMENTS).
  - `exclusive_agent_agreement`.
  - Legacy `ilo_1099_agreement` / `olo_w2_agreement`: partial rebuilds, 3 of 10 and 4 of 11 pages.
  - On every one of them the signer is the **Loan Officer only**. The CEO signature is pre-printed, so there is no countersigner.

**Gaps**
- **(a) No Recruit scope.** The `ServiceType` enum (LOAN, APPLICATION, DEPARTMENT, HUMAN_RESOURCE, LENDER, VENDOR, SYSTEM) has no RECRUIT/CANDIDATE value, and `internal.callers` has no RECRUIT entry (application.yml:199-218). HUMAN_RESOURCE is *refused* on the internal e-sign door (`EsignInternalService.java:44-47,211-215`), so Recruit cannot borrow HR's.
- **(b)** Signer roles are loan-shaped: `LOAN_OFFICER` is resolved from the tera-be loan (`SignerSlotPlanner.java:65,281`). A candidate signer role is needed.
- **(c)** Recruit needs its own subscription to COMPLETED, filtered on `source=ILO_AGREEMENT`.
- **(d)** The docs say `LO_AGREEMENT`, but the code enum is `ILO_AGREEMENT` (`esign/EsignEnum.java:20-35`), so a caller following the docs fails to deserialise.
- **(e)** A signing UI host. Either use the Inkless link, or the built-in signer page, which today sits on beta-los/tera-fe and the Tera+ borrower portal.
- **(f)** Port packs' `computeRequiredDocs` (`EnsureSigningSessions…java:936-990`):
  - 1099 vs W-2 from `is_corporate_loan_officer`;
  - add `ca_compliance_statement` when CA is in the sponsor states and there is no DRE endorsement;
  - add `exclusive_agent_agreement` when 1099 and licensed in VA/MS (`LORecruiting.java:411`);
  - treat legacy-signed documents as already signed.
- **(g)** Legal sign-off that the 22-page rebuilds match the current packs agreement text.
- **(h)** Fill data: full_name, nmls, full_address, initials, current_date and the 1099 `text_1/text_2/fill_date` (confirm their meaning).

**Recommendation: EXTEND document-esign (S–M on the DE side) + OWN orchestration in Recruit (M). Total L because of the legal check.**
- DE work: a RECRUIT caller, a non-delegated service type and bucket, a candidate signer role, and the enum/doc fix. Owner: the DE team.
- Recruit work: the required-docs port, the generate-and-send call with candidate fill data, the agreement-link email (§1), and a COMPLETED-event handler that moves the offer SENT→SIGNED. The hooks already exist in `OfferService.java:62`.

**Ordering.** DE changes → Recruit sender → identity of the signing link (Inkless vs built-in) → turn off packs Inkless for new candidates. This depends on §5: today the agreement lives inside the `/apply_loan_officer` portal.

**Cut-over risks.**
- **Loan Officers mid-onboarding** who already hold a packs Inkless envelope must finish in packs. Keep MOSO's push of `lo_agreement_signed` and the reconcile sweep (A-032) alive until every SENT offer created before the cutover is closed. Route only new offers to DE (flag per offer).
- Never send two envelopes to one Loan Officer: use DE's `supersedesEnvelopeId` / `idempotencyKey`.
- Inkless credentials and `use_inkless` sit in the DE prod DB. Confirm the account is the same Inkless tenant that packs uses (billing and templates).

---

## 5. Loan Officer registration portal and start-up fee

**Today.** The Loan Officer goes to `lf-homepage`/`lo-homepage` `/register-loan-officer?key=<legacy_key>`, a client-only page. **Every call goes to packs WebPlus**:
- `registerLoanOfficer`, `registerSigningAgreement`, `getRegisterLoanOfficer`, PayPal config, `saveLoanOfficerPaidStartupFee` (lf-homepage@master `src/apis/loanfactoryApi.ts:798-877`; lo-homepage `produciton-v2` `loanfactoryApi.ts:785-797`);
- plus the MOSO `/apply_loan_officer` page (B-042).

PayPal checkout runs in the browser. **packs verifies server-side** against `api-m.paypal.com/v2/checkout/orders/{id}`, using credentials and the fee amount from Datastore `MeetingAndAppointmentConfiguration` (`packs …/meeting/InterestedLoanOfficerPaidStartupFee.java:32-80`). Related IDs: B-023, A-010, A-067.

**Correction to A-067.** The lf-homepage call to Recruit `GET /public/api/v1/register-status` was added in 8e5953ac (09-24) and **removed in 72cef7e3 (09-29)**. Pay/sign now unlock only on `onboarding_meeting_status`, so the Recruit endpoint has **no caller** on lf-homepage or lo-homepage.

**Candidates**

| What | Fit | Prod? |
|---|---|---|
| account-fe | Login, set-password and activation only; no outsider form | Live, not a portal |
| ai-hr-fe/ai-hr-be careers portal | Anonymous form with CV upload (10 MB), rate-limited per IP (`HRB internal/api/careers.go:18-33`). There is no pre-account self-onboarding and no magic link. | Live; reusable *pattern* |
| Tera+ `Loan-Factory-Borrower-Portal` `app/esign/sign/[participantId]` | Public built-in signing page over DE | Live; reusable for the sign step |
| Recruit's own `/public/**` (gateway exemption) | Already used for register-status, unsubscribe, host-subjects | Live |
| Payments | **No non-MOSO service collects money from a non-user.** PayPal appears only in packs/base/moso, lf/lo-homepage and lf-borrower-portal. Stripe appears only in moso-real-estate-be, for logged-in agents' mailboxes. accounting-be is AP/vendor payouts, ramp syncs commission payouts, and wallet has been dormant since January. | — |

**Recommendation: NEEDS NEW (inside Recruit) — OWN.**
- Build a Recruit public onboarding surface: either recruit-fe public routes or a re-pointed lf-homepage page, backed by recruit-be `/public/api/v1/onboarding/{token}`. It covers:
  - profile completion (the fields packs `registerLoanOfficer` writes);
  - the e-sign hand-off to DE (§4);
  - the fee: port `checkPayPalTransaction` into recruit-be, with PayPal client id/secret in Secret Manager, an amount check and USD only, plus the existing waive path.
- Size **L** (the portal is M; PayPal plus the ledger plus fee reconciliation is M).
- Reusing the lf-homepage page UI and only swapping its API base from packs WebPlus to recruit-be is the cheapest option, because the UI already exists.

**Ordering.** The token must not be the MOSO websafe key. It needs a new Recruit-issued opaque token, because `legacy_key` will not exist for native candidates (A-016). Steps: portal → e-sign (§4) → fee → then change the invite/agreement emails (§1) to link to the new portal.

**Cut-over risks.**
- Loan Officers holding old `?key=` links in their inbox must still work. Keep the packs page live for legacy keys, or make lf-homepage route by key type.
- PayPal credentials are currently read from Datastore by packs. Get a separate PayPal app/credential, or the same one copied into Secret Manager (owner decision).
- A payment captured in the browser but not recorded is an existing risk. Keep server-side verification and an idempotent record on `paypal_order_id`.

---

## 6. Creating the joined Loan Officer's account, commission plan and HR hand-off

**Today.** packs "Create new account" creates the MOSO Admin and picks the commission plan from `experience` (A-031, B-003). The MOSO `UserWatcher` → Pub/Sub then creates the user-service user and the auth-service credential (copied MOSO hash), and tera-be builds the profile and roles (tera-docs `user/USER_SYNC_PIPELINE.md:5-37`). Recruit's experience writeback is dark (A-031).

**Candidates**

| Service | What it does today | Prod? |
|---|---|---|
| **ai-hr-be hire flow** | Recruit `POST /internal/v1/recruit/hires` creates an HR **draft** (`HRB internal/api/recruitintake.go:16`; migration `00271`). When an HR person submits it, HR:<br>• registers or links the **user-service account natively** (`POST /public/api/v1/users/register`, `internal/service/provision.go:342-362`);<br>• proposes the company email;<br>• pushes licences, NMLS and addresses;<br>• **creates the MOSO Admin through packs' own `InviteAdminsOp`** (`internal/packsclient/client.go:95-160`; prod `packsPushEnabled: true`, values.yaml:24-27);<br>• creates the Mortgage Education account and its welcome mail.<br>It does **not** send branch, team or commission to packs, and does **not** create Google Workspace accounts. | **Live.** Recruit manual "Send to HR" on, auto-send off (recruit-be prod values :190-212) |
| user-service | Native create API exists and is used (auth-service SSO provisioning, HR). It holds **no role and no branch**. | Live |
| google-account-service | Workspace users/groups | **Never deployed to prod**, no callers (tera-docs `infrastructure/worklog/repos/google-account-service.md:3`) |
| Commission plan | **core-accounting-be** owns the plan catalogue. **ai-hr-be** owns each person's plan pair plus the `experience_level` that chooses between them (`internal/commission/commission.go`). But prod accounting still uses a stub: `COMMISSION_PLANS_FROM_HR` is in staging values only (core-accounting-be via gh api). tera-be only copies `experience` from MOSO (V376). ramp is a payout sync to packs, not a plan owner. | Partial; not wired in prod |

**Recommendation: USE ai-hr-be as the owner of "joined → account" (already live), and EXTEND it.**
- Recruit should *not* create accounts itself.
- Steps:
  1. Turn the hand-off into the only path (auto-send once trusted).
  2. Add `experience_level`/commission class (D302) and the hire classification W-2/1099 to the `recruit.hired.v1` payload, so HR sets the commission Setting. This replaces A-031.
  3. Accounting flips `COMMISSION_PLANS_FROM_HR` in prod (accounting/HR owners).
- Size M (Recruit payload S; HR mapping S–M; accounting flag and data check M).
- MOSO Admin creation stays inside HR's `InviteAdminsOp` for as long as the rest of the company still logs into MOSO. That is not a Recruit dependency.

**Cut-over risks.**
- If both packs (via the Recruit writeback onboarding meeting / agreement V2 flow) and HR's `InviteAdminsOp` create the Admin, one Loan Officer could get **two MOSO Admins**. Before enabling auto hand-off, confirm which path creates the Admin in prod. In prod the packs writeback is off, so today it is the MOSO-side registration plus a manual "Create new account".
- Experience must be sent once, as an upgrade only, as packs does today.

---

## 7. Identity of Recruit staff

**Today.** Recruit login is **already MOSO-free for Recruit itself**: account-fe plus auth-service, gateway-injected `X-User-ID`, local RBAC `rbac_grants` (A-073, A-075, C-010). The MOSO dependencies are:
- (a) **The packs write actor.** Every write needs an active MOSO Admin with RECRUITING, or the onboarding specialist, plus a branch (A-019, B-014/015, C-011/012). The system actors are MOSO Admins too (`it.dept@…`).
- (b) Referrer and headhunter identity = MOSO Admin key (A-029, A-035/036, C-013).
- (c) Platform-wide (B-110): auth-service accepts MOSO as an IdP. account-fe silently bounces to MOSO `/sso/handoff` (`account-fe@production …/login/useMosoHandoffBounce.ts:11-26`, `cd-production.yml:88`). There is no audience pin in prod (`auth-service@production application-production.yml:105-140`), and logout calls MOSO.
- (d) user-service people are created and updated from MOSO Datastore. Passwords are copied MOSO digests (`LfCredentialApplier`; `UpdateUserHandler.java:21-30`; prod `GOOGLE_CLOUD_PROJECT: lender-rate`) (B-111).

**Candidates**
- **auth-service platform RBAC.** Per-app roles and permissions with scope ALL/ORG/TEAM/SELF (tera-docs `auth/RBAC_PERMISSION_MODEL.md`). The RECRUIT seed (`RECRUIT_ACCESS` + 7 roles) has run **only on staging; "production has never had it run at all"** (`auth/RBAC_MODEL_MIGRATION_HANDOVER.md:123-131`). There is no branch concept.
- **Recruit local RBAC** is already the enforcement point.
- auth-service's native password, reset/set-password mails and MFA (TOTP/SMS/EMAIL/QR) all exist in prod (`PublicAuthController.java:53-214`).

**Recommendation**
- **(a) disappears by design** once Recruit stops calling packs (§1, §4, §5, §6, plus group 1). Keep using Recruit RBAC. Optionally adopt the auth-service RECRUIT seed in prod later (S), but there is no need to.
- Onboarding-specialist eligibility becomes a Recruit grant, replacing `Admin.is_onboarding_specialist` (S).
- For the transition, if some writes must stay on packs longer, HR's pattern applies: a packs `/api/ai/v1` API key bound to one MOSO user that holds the needed permission (`HRB internal/packsclient/client.go:114-121`). This removes the per-recruiter MOSO Admin requirement (S on the Recruit side, plus packs config).
- (b) is a group-1 data question: keep the stored keys, use user ids for new links.
- **(c)/(d) are platform-wide and not Recruit's to fix.** To make login MOSO-free, the platform team would need to:
  - empty `NEXT_PUBLIC_MOSO_ORIGIN`;
  - remove the LOAN_FACTORY provider;
  - send set-password mails to users without a usable native password;
  - drop the single-logout call;
  - make user-service the writer for LF staff instead of MOSO `UserWatcher`.

  Recruit should list this as an external dependency, not a work item (size L, platform).

**Risks.** If MOSO SSO is removed, staff without a native password are locked out until they reset it. This is platform-wide.

---

## 8. Notifications and the bell

**Today.**
- Recruit's own bell is local (`NotificationServiceImpl`) and live in prod.
- The copy to the platform bell (notifier IN_APP) is **off in prod**: `RECRUIT_PLATFORM_INBOX_ENABLED` is absent from prod values (A-038/039, C-038).
- The platform bell itself is `@loanfactory-inc/platform-react` `NotificationBell` in `PlatformShell` (tera-components@production `packages/platform-react/src/ui/shell/PlatformHeader.tsx:12,209`). It reads the notifier inbox through user-service. It is live in tera-fe, recruit-fe, lf-iq, account-fe and ai-hr-fe (all pinned 0.4.50).
- recruit-fe shows **two bells** (`RecruitHeaderActions.tsx:14-17`).
- Prod notifier already allows `recruit.loanfactory.com` link hosts.

**Recommendation: USE notifier IN_APP + platform-react (no MOSO here). S.** This is not a MOSO dependency at all. Turning it on is a product decision; it is not needed for MOSO independence.

---

## 9. Omni pieces that still point at MOSO

| Item | Finding | Prod? | Recommendation |
|---|---|---|---|
| SMS sender identity (A-053) | zoom-go `users.los_user_id` is `NOT NULL UNIQUE`, "the immutable old-LOS key" (zoom-go@master `db/schema/schema.sql:503,1600`, README :364-368). omni `SPISenderResolver` asks the host for `zoom_los_user_id` first, then the link email, then the party email (omni@production `cmd/server/main.go:711-723`, `internal/hostsubjects/hostsubjects.go:505-520`). | Live | **EXTEND zoom-go/omni (platform owner).** Key on platform user id or email. Recruit already falls back to email in its sender-identity SPI. Size M, platform. It is only an id format, not a runtime call to MOSO; low urgency. |
| Email transport | omni → notifier v2 (PR #565, merged 10-13) | Live | Not MOSO. Keep. |
| Reply-address endpoint (A-047, B-085) | **PR #608 `feat/subject-reply-address` is OPEN**: updated 10-17, no reviews, `COMM_REPLY_ADDRESS_ENABLED` absent on master and production. Companion #609 (`author_side`) is also open. | Not live | Needed only so Recruit's automated mails thread replies into omni. Get #608 reviewed and merged (S, omni owner). Until then Recruit falls back to the recruiter as Reply-To (NurtureMailEvents already does). |
| Opt-outs | STOP from MOSO's Twilio reaches Recruit only through the push and import (B-026, A-006). omni inbound STOP is live (A-048). | — | When MOSO stops, omni is the only live STOP source, which is fine. One last suppression import from MOSO is needed at cutover (group 1). |

---

## 10. Hosting

`lender-rate` / `moso-gke` (prod) and `lenderrate-master` / `moso-kube` (staging) **are simply the company's GCP projects and clusters.** The "moso" names are historical.

Every TERA service runs there:
- auth-service, user-service, omni (`omni-prod`), moso-notifier (`moso-notifier-prod`), document-esign, ai-hr-be (`hr-prod`), cron-service-go (`cron-service`), tera-be, account-fe and recruit-be.
- Sources: tera-docs `infrastructure/README.md:3-4`; `DELIVERY_FLOW.md:272,462`; `NEW_SERVICE.md:96,117-134` (new services are told to use `lender-rate`); cron-service-go README "Operations".

MOSO's GAE app and Datastore are in the same project (`s~lender-rate`; user-service, ai-hr-be and tera-be read Datastore there).

There is **no separate platform project or cluster, and no plan or decision to move.**

**Recommendation: no move needed (size 0).** Only the MOSO-specific bits inside the project go away:
- the GCS CDN logo path `storage.googleapis.com/lender-rate/CDN/...` (A-062): copy it to a platform bucket (S);
- the shared `moso-svc` GSA binding comment (C-049): verify Recruit uses its own `recruit-be-runtime` GSA (S, security hygiene).

Pub/Sub, Artifact Registry, Redis and cron are platform resources that just live in the same project.

---

## 11. How other apps moved off packs: the reusable pattern (HR / ai-hr-be)

HR did **not** leave packs. It became the **owner of HR facts while dual-running** with packs:

1. **One-off bulk import (2026-07).**
   - `cmd/migrate-associates` (deleted in dbb35ea84 on 2026-09-22) took a packs export (`SyncAdminToMCPOp`) plus reviewed crosswalk files (`scripts/real-data/{crosswalk,hr-crosswalk}.json`).
   - It used a versioned contract `associate.v1` (`HRB internal/assocmig/contract.go:15,55`) and supported dry-run / apply / reconcile with resumable batches.
2. **Direct Datastore reads, not packs APIs**, for the ongoing data.
   - `internal/packsstore/store.go` is "HR's READ door onto packs: its Google Datastore, read directly, the way tera-be reads it". It reads only the kinds Admin, Branch and OfficeLocation, never Credential.
   - One-shot `cmd/packs-*` tools are dry-run by default and idempotent on the packs id: `packs-workplace-seed`, `packs-bonus-level`, `packs-device-verifications`, `packs-personal-ids`, `packs-real-estate`, `todo-import`.
3. **Identity crosswalk table** `external_identity_map(source_system, source_kind, source_key = legacy GAE urlsafe key, legacy_associate_id, platform_user_id, …)` (`00002_identity_person.sql:15-40`).
   - Matching is by legacy key, then work email, then sign-in email. Ambiguous matches are skipped (`internal/packs/match.go`).
   - The key encoder is byte-compatible with tera-be's `LfLegacyKeyEncoder`.
4. **Live sync in from packs.**
   - packs `TERA_UPDATE_USER_TOPIC` / `USER_REGISTERED_TOPIC` → `PacksSyncService` → re-read Datastore. "Since 2026-09-17 a packs save onboards the person".
   - The reconcile walk is off in prod.
5. **Writes out only through packs' own ops**: `InviteAdminsOp`, `UpdateMemberOp`. They use a packs `/api/ai/v1` key bound to a MOSO user holding the HR permission, never Datastore writes. Prod has `packsPushEnabled`/`packsAutoOffboard` true.
6. Files are copied into document-esign DMS (`cmd/migrate-hr-docs-to-dms`).

**What Recruit can copy**
- Recruit already has steps 1 (`/admin/import/moso`, A-004), 3 (`legacy_key`) and 4 (the webhook push, A-001).
- The two pieces worth copying:
  - (i) **Read LORecruiting from Datastore directly** as a reconcile/backfill path, instead of the packs export op over a MOSO admin cookie session (A-004 runner). It is idempotent and does not depend on packs uptime.
  - (ii) **A single service-key actor for any packs write that must remain**, instead of per-recruiter MOSO Admins (A-019).
- The lesson from HR: **"off packs" is per capability.** Become the system of record for Recruit facts, and only *notify* packs while other MOSO consumers still need the data. Do not wait for a company-wide MOSO shutdown.

---

## 12. Existing sunset / decommission plans found

- **No MOSO/packs sunset or decommission plan or decision exists** in tera-docs. The search covered sunset, decommission, strangler, retire/leave/replace/drop moso, packs migration and similar terms.
- The closest text is advice, not a plan: `tera-plus/tera-platform-advisory.md` (2026-07-03) §3.4 :120-122 ("Many services still point at the MOSO monolith… cut auth over first") and :334 (Google Identity Platform cutover).
- **Strangler programmes that are live or planned:**

  | Programme | Status |
  |---|---|
  | Mongo moso-notifier → notifier-be | Done: staging 10-17, prod 10-18 |
  | notifier-be → Go notification-service | Prod waves 10-26 → 11-03. Java removal not scheduled (GO_CUTOVER_PLAN §14, §17; tera-docs `notification/NOTIFICATION_SERVICE_MIGRATION.md`, "reconcile both", Khai 10-17) |
  | Java cron-service → cron-service-go | Done (`cron/CRON_SERVICE_GO_MIGRATION.md:53`) |
  | api-gateway v1 → v2 | Done |
  | tera-be conversations → omni | In progress |
  | packs' own notifier producer v1 → v2 | packs#3643 `NOTIFIER_V2_SEND_ENABLED` |

  None of them moves packs' direct-SendGrid recruiting mails. That is Recruit's to do.
- The "packs migration" docs (user `LF_MIGRATION_RUNBOOK.md`, tera-be `migration/`) copy data into the platform **while MOSO stays the source**.
- The tera-docs notification status tables are stale. They still say prod is Mongo and list recruit-be as v1.

---

## 13. Suggested order (this group)

1. **S, now:**
   - RECRUIT prod sender identity in notifier-be (before Wave 5, 11-02, or in both Java and Go config).
   - Turn on mail-status-intake.
   - Ask the notifier team to turn on webhook signature verification.
   - Get omni #608 reviewed.
2. **S–M:** move the 1-1 reminder and webinar-confirmation sends from packs to Recruit + notifier v2. Scheduling is already Recruit's, and these mails carry no `/apply_loan_officer` link.
3. **M:** port the 4 packs bodies into `message_templates`. Add the signature block from Recruit/user-service data.
4. **M–L, parallel:**
   - DE extension (RECRUIT caller, service type, candidate signer, enum fix) plus legal check of the templates.
   - Recruit public onboarding portal with a Recruit token, plus PayPal verification.
5. **M:** agreement via DE. New offers only; legacy envelopes are finished in packs with the push and reconcile kept alive.
6. **M:** HR hand-off as the single "joined" path, carrying the experience/commission class and W-2/1099. Accounting flips `COMMISSION_PLANS_FROM_HR` in prod.
7. Then switch the invite and welcome mails to Recruit (they link to the new portal), and retire the `RecruitApiClient` write kinds one by one. A-019 disappears with the last one.

Platform items outside Recruit's control: MOSO SSO, user-service master-ship, zoom-go `los_user_id`.

---

## 14. Open questions for humans

1. **Notifier prod RECRUIT identity:** does a hand-made `mail_config` row exist in prod? Who approves adding it (Khai)? Should From be the person (recruiter/specialist) or a "Loan Factory Recruiting" address?
2. **Signature:** the MOSO signature comes from the Admin's *branch*. What should the Recruit-sent signature contain, and from which system (HR office/branch, user-service title/phone)?
3. **E-sign:** Inkless or the free built-in signer for ILO agreements? Is DE's Inkless account the same tenant packs uses? Who on legal confirms the DE 1099/W-2 22-page rebuilds match the current agreement? Is a company countersignature required, or is pre-printed OK?
4. **document-esign owner:** will the DE team add a RECRUIT caller, service type and candidate signer role, and in which sprint?
5. **Start-up fee:** keep PayPal? Same PayPal app or a new one? Who owns the credential? Is the fee still $100 (the packs default)? Must payments also land in accounting?
6. **Portal:** should the onboarding portal live in recruit-fe (public route) or stay on lf-homepage with its API repointed?
7. **Account creation:** is HR's `InviteAdminsOp` path to be the only creator of the MOSO Admin for joined Loan Officers? Who in HR confirms drafts, and is auto-send acceptable? When will accounting turn on `COMMISSION_PLANS_FROM_HR` in prod?
8. **MOSO-side automation:** will the packs owner turn off MOSO's own LORecruiting crons and mails (B-113) for Recruit-owned rows, to avoid double contact?
9. **Platform login:** is anyone planning to retire MOSO SSO and user-service's MOSO sync? Not Recruit's to do, but it gates "MOSO fully off".
10. **Webinars:** if webinars stay in MOSO (WebPlus, group 1), the webinar confirmation mail must stay coupled to that registration. Who owns webinars after MOSO?
