# Identity, accounts, hosting: how Recruit depends on MOSO (read-only research, 2026-10-21)

Refs fetched 2026-10-21. "prod" means the repo's `origin/production` branch, which is what deploys to production. auth-service prod = `d7b1ffe` (2026-10-20). user-service prod = `6460cad`. ai-hr-be prod = `c0bbcb72`. omni-service prod = `2049e33`. zoom-go has no production branch, so `origin/master@67a4b73` is used. tera-docs = `origin/master`.

## TL;DR

- **Login works without MOSO today, at least technically.** auth-service has its own password store (Jasypt/BCrypt hash on `account`), its own reset, set-password and invite flows, and MFA (TOTP, SMS, Email, QR). It also has Google and Apple sign-in. MOSO is still involved in three places:
  1. MOSO is a live identity provider. account-fe silently bounces to MOSO `/sso/handoff`, and auth-service redeems the MOSO RS256 id_token.
  2. The passwords that Loan Factory people type are copied MOSO digests. user-service reads them from MOSO's `Credential` entity.
  3. MOSO gets a best-effort single-logout call on sign-out.
- **The real lock-in is account creation and the identity data, not login.** user-service is documented as the identity "single source of truth", but every LF person is created and updated from MOSO's Datastore. This happens through MOSO `UserWatcher` → Pub/Sub, plus a direct Datastore read. NMLS and licences come from MOSO or HR. Roles, branch, experience and coach live in MOSO and are copied into tera-be.
- **For a hired LO, HR (ai-hr-be) already owns the non-MOSO path, and it is live in prod:**
  1. recruit `POST /internal/v1/recruit/hires` creates an HR draft.
  2. An HR person confirms the hire in the wizard.
  3. user-service registers the platform account natively.
  4. HR pushes `InviteAdminsOp` into packs, which creates the MOSO Admin.
- **Commission plans:** core-accounting-be owns the plan catalogue. HR owns the person→plan pair (via experience level). Production accounting still uses a stub (`COMMISSION_PLANS_FROM_HR` is unset in prod).
- **There is no MOSO sunset decision anywhere in tera-docs.** The only "exit" text is an advisory dated 2026-07-03, plus individual strangler programmes (notifier, omni).
- **Hosting:** `lender-rate` is the company's single production GCP project. It holds both MOSO's GAE/Datastore and the TERA GKE cluster `moso-gke`. Staging is `lenderrate-master`/`moso-kube`. There is no separate platform project and no migration plan.

---

## 1. Login (auth-service + account-fe)

### Identity providers configured in prod (all live)

`auth-service@production:src/main/resources/application-production.yml:105-140`

| iss | type | verifier | notes |
|---|---|---|---|
| `https://account.loanfactory.com` | BASE | `BaseVerifier` (HS256, auth-service's own tokens) | Its own issuer. |
| `https://www.loanfactory.com` | LOAN_FACTORY (= MOSO) | `OidcJwksVerifier` (RS256 against `<iss>/.well-known/jwks.json`) | `audiences:` is deliberately left empty in prod, with comment lines 113-118. |
| `https://accounts.google.com` | GOOGLE | `GoogleCodeExchanger` + `GoogleIdTokenVerifier` | Code flow (web popup) plus token flow. |
| `https://appleid.apple.com` | APPLE | `AppleIdTokenVerifier` | iOS bundle `com.loanfactory.consumers` only. |

- The enum is `BASE, LOAN_FACTORY, GOOGLE, APPLE` (`BaseProperties.java:215-216`).
- The verifier switch is at `AuthConfiguration.java:287-297`.
- `OidcJwksVerifier.java:30-50` documents it as "the legacy MOSO LOS".

### How each login works

**Password ("BASE")**
- `POST /public/api/v1/auth/login` → `AuthFacadeImpl.login` → `authService.login(username, password, product)` (`PublicAuthController.java:25`, `AuthFacadeImpl.java:106-107`).
- The hash lives on `Account.passwordHash` with `passwordType` BASIC (Jasypt) or BCRYPT (`Account.java:53,93`; `PasswordHandler.java:20,71-98`).
- For LF people this hash is a copy of MOSO's Jasypt digest. user-service's `LfCredentialApplier` reads MOSO's `Credential` entity at registration. See `tera-docs:user/USER_SYNC_PIPELINE.md:66-80` and the user-service `LfCredentialApplier` class doc.
- So a person's account-fe password equals their MOSO password at sync time. After that the two are independent: auth-service has its own set/reset.

**"Loan Factory" (MOSO)**
- There is no "Loan Factory" button. When the login form would show, account-fe redirects once to `NEXT_PUBLIC_MOSO_ORIGIN + /sso/handoff`. Evidence:
  - `account-fe@production:src/app/[locale]/(public)/login/useMosoHandoffBounce.ts:11-26`
  - `LoginContent.tsx:128-139`
  - Prod origin `https://www.loanfactory.com` is set in `.github/workflows/cd-production.yml:88`.
- If MOSO has a session, it returns the browser with `#token=<MOSO id_token>`. `useProviderTokenLogin` posts that token to `/public/api/v1/auth/sso`.
- `AuthFacadeImpl.sso` then runs three steps (`AuthFacadeImpl.java:111-130`, `272-321`):
  1. Verify the token.
  2. `resolveOrProvision`: match by sub; otherwise by verified email; otherwise `userService.registerUser`.
  3. Mint auth-service tokens.
- MOSO-minted 2-day tokens from other MOSO apps are also accepted, because there is no audience pin (`tera-docs:auth/SINGLE_LOGOUT.md:113-133`).

**Google**
- account-fe `GoogleSignInButton.tsx` → `/public/api/v1/auth/sso` with `provider=GOOGLE` and a `code`. It goes through the same resolve-or-provision path, which requires `email_verified`.

**Logout**
- `AuthFacadeImpl.logout` revokes the central session, then calls `MosoLogoutNotifier.notifyLogout`. That call is `POST <moso>/internal/sso/logout?sub=…`, best-effort with a 3 s timeout (`AuthFacadeImpl.java:446-479`; `application-production.yml:141-148`; `tera-docs:auth/SINGLE_LOGOUT.md:15-48`).
- In the other direction, MOSO calls `/internal/api/v1/sessions/revoke-by-subject` (`SINGLE_LOGOUT.md:53-89`).

### Native capabilities that already exist (prod)

`PublicAuthController.java` provides:
- password set: `/password/set` :79
- reset-password mail: `/mail/reset-password` :91
- forgot-password mail: `/mail/forgot-password` :97
- set-password / self-registration mail: :168
- signup OTP: :186-214
- sign-in links: `/link-sign-in` :53

The MFA methods are `TOTP, SMS, EMAIL, QR_CODE` (`model/MfaMethod.java`). Authenticator enrollment needs an MFA secret key and is disabled with a warning if the key is blank (`application.yml:147`). Account-level `mfaSetting.enabled` is reported in the security summary (`AuthFacadeImpl.java:591-608`).

### What would have to change so login does not depend on MOSO

1. Remove the LOAN_FACTORY provider and the account-fe MOSO bounce. Concretely: set `NEXT_PUBLIC_MOSO_ORIGIN` empty in account-fe, which `useMosoHandoffBounce.ts:11-13` documents as "disables the bounce", and drop the `www.loanfactory.com` provider entry.
2. Make sure every LF person has an auth-service password, or uses Google sign-in. People who only ever signed in via MOSO SSO, or whose copied digest is stale, need a reset-password or set-password mail. That path exists (`/mail/reset-password`, `/mail/set-password`).
3. Keep the MOSO single-logout only while MOSO itself is still in use. A blank `moso.logout.secret` disables it (`application-production.yml:141-144`).
4. Note that recruit itself already logs in through account-fe/auth-service, not MOSO OAuth (`recruit-be@master:docs/AUTH-BRIDGE.md`). **So recruit's login is not the MOSO dependency. The packs write actor is.**

### Docs or plans to drop MOSO SSO

- There is no decision record. `tera-docs:tera-plus/tera-platform-advisory.md` (dated 2026-07-03, by imkhai) says the following, but it is advice and has no plan behind it:
  - §3.4 ":120-122": "Many services still point at the MOSO monolith (`MOSO_URL`, SSO issuer, JWKS)… The SSO issuer dependency is the most important one to plan… cut auth over first."
  - Line :334: "Google Identity Platform cutover (retire HS256 entirely and the monolith SSO dependency)".
- `auth/SINGLE_LOGOUT.md` (2026-08-26) treats MOSO as a permanent provider and lists hardening, not removal.

## 2. user-service: creation, source of truth, RBAC

### How users get created (prod)

**(a) Pushed from MOSO (main path)**
- MOSO's `packs/loan/.../type_watcher/UserWatcher.java` publishes `REGISTRATION_USER_TOPIC`, `UPDATE_USER_TOPIC`, `UPDATE_EMAIL_USER_TOPIC` and `TERA_UPDATE_USER_TOPIC`. user-service creates the user plus the auth-service account and credentials, then announces `USER_REGISTERED_TOPIC`. tera-be consumes that to build its profile and roles (`tera-docs:user/USER_SYNC_PIPELINE.md:5-12,27-37,49-61`).
- `UPDATE_USER` is treated as a notification only. user-service re-reads the record from MOSO's Datastore by GAE key (`user-service@production:.../thirdparty/loanfactory/handler/UpdateUserHandler.java:21-30,57`; `service/LFUserFetcher.java:43-60`).
- The Datastore project is `GOOGLE_CLOUD_PROJECT: lender-rate` (`helm-chart/config/production/values.yaml:38`).

**(b) Pulled / bulk from MOSO**
- `POST /api/v1/lf-users/sync?kind=` and `/sync-password` (`SyncUserController.java:14-29`) use `SyncUserService`, which reads Datastore directly.

**(c) Pushed from LFIQ**
- lfiq-backend `User3rdInterceptorV2` publishes to the same topics (`USER_SYNC_PIPELINE.md:9-10`).

**(d) Native API create**
- `POST /public/api/v1/users/register` (`PublicUserController.java:16-24`). Used by:
  - auth-service's SSO first-login and invite provisioning (`AuthFacadeImpl.java:313,1132`)
  - **ai-hr-be's hire wizard** (`ai-hr-be@production:internal/service/provision.go:342-362`). This call registers an ACTIVE, verified account with `source=<HR app code>` and `PLATFORM_DEFAULT_PASSWORD` (:48, :334, :350).
- **The native create API exists and is used in prod.**

**(e) google-account-service**
- This service is not a user-service creator, and it does not run in prod (§3).

### Source-of-truth fields

- Name, email, phone, company email/phone, legal name, DOB, gender, `active`→status: copied from MOSO `Admin` on every save (`LFUser2UserPopulator.java:29-74`).
- NMLS (`mortgage_nmls`) and licences (`LfLicenseParser`) also come from MOSO (`LFUser2UserPopulator.java:117-118`). HR can write NMLS and licences too, through `PUT /api/v1/internal/users/{nmls,licenses}` (`User.java:230-237`; `tera-docs:user/USER_API_DOCS.md:1424-1428`).
- `title` and `office_address` are written by HR (`User.java:239-253`).
- user-service holds **no role and no branch**. `authorities` is `@Transient`, filled from auth-service (`User.java:421`).
- Roles for TERA come from MOSO `Admin` properties: tera-be has `LfAdminRoleSync` implementations (`LfCloRoleSync`, `LfMortgageAdvisorRoleSync`, `LfDisclosureSpecialistRoleSync`) that run on every Admin save.
- Experience level, coach and ranking are copied from MOSO `Admin.experience`, `default_corporate_coach` and `ranking` (`tera-be@production:src/main/resources/db/migration/V376__lo_experience_level_and_coach.sql:1-9`; `LfCoachingSyncImpl` class doc).
- Branch: MOSO is the original source. HR has its own `branch` catalogue, seeded once from packs `Branch` (`ai-hr-be@production:cmd/packs-workplace-seed/main.go` header; `internal/workplace/workplace.go`).

### Plan to make user-service the master

- `tera-docs:user/USER_API_DOCS.md:1419-1423` says: "Identity centralization (platform, P1-P7) — user-service is the single source of truth for person identity… Other services read identity from here."
- In practice MOSO still writes it (via `UserWatcher`). I found no plan to stop MOSO publishing, or to make user-service the writer for LF staff.

### Platform RBAC recruit could use instead of MOSO Admin RECRUITING + branch

- auth-service has per-app roles and permissions:
  - tables: `role`, `account_role`, `rbac_permission`, `rbac_endpoint`, `rbac_role_permission`, `rbac_account_permission`
  - scope: `ALL > ORGANIZATION > TEAM > SELF`
  - adopted 2026-09-22 (`tera-docs:auth/RBAC_PERMISSION_MODEL.md:1-4,20-50`)
  - code: `auth-service@production:src/main/java/com/loanfactory/auth/authorization/**`
- The gateway passes `X-User-Authorities` downstream (`recruit-be@master:docs/AUTH-BRIDGE.md`).
- For app `RECRUIT`, a format-2 seed (one permission `RECRUIT_ACCESS`, seven roles) is applied on staging. **"production has never had it run at all"** (`tera-docs:auth/RBAC_MODEL_MIGRATION_HANDOVER.md:123-131`).
- recruit's real enforcement is its local `rbac_grants` table.
- auth-service has **no branch concept** (no `branch` field in its entities).
- **None of this authorizes writes inside packs.** packs checks its own `Permission.RECRUITING` / `HR` / `BRANCH` on a MOSO user. So central RBAC can replace recruit's internal authorization, but not the packs write gate. The only alternative pattern found is HR's: a packs `/api/ai/v1` api-key whose linked MOSO user holds a permission (`ai-hr-be@production:internal/packsclient/client.go:114-121`).

## 3. New joined LO account creation and commission plan

### Where accounts are created today

**packs "Create new account"**
- Creates the MOSO Admin. `UserWatcher` then fans out to user-service (register) and tera-be (profile and roles), as in §2.

**ai-hr-be (PROD-LIVE)**
- recruit hands the hire over at `POST /internal/v1/recruit/hires`, which creates an `employee_draft` with `source='recruit'`. "A person in HR still confirms it in the wizard; nothing here creates an employment." (`ai-hr-be@production:internal/api/recruitintake.go:16`; `internal/db/migrations/00271_a_recruit_hire_arrives_as_a_draft.sql:1-5`).
- On confirmation, HR:
  1. Registers the platform account in user-service (`internal/service/provision.go:342-362`).
  2. **Pushes the person into packs through `execute/register.InviteAdminsOp`**. This is packs's own invite: credential, invite mail, and watchers.
- What the invite sends: email, names, phone, title, company_email and an Admin **Role display name** (`internal/packsclient/client.go:1-12,95-160`).
- What it does not send: `branch`, `team`, `active` and commission. These are deliberately off the update payload (:162-170).
- Prod values: `packsApiBaseUrl: https://www.loanfactory.com/api/ai/v1`, `packsPushEnabled: true`, `packsAutoOffboard: true` (`helm-chart/config/production/values.yaml:24-27`; wiring at `wiring_packs.go:54-62`).
- HR also reads packs Datastore directly (`packsDatastoreProject: lender-rate`, `:94-95`).

**google-account-service (NOT live in prod)**
- Admin SDK Directory: Workspace users and groups, multi-tenant OAuth clients (`gh api repos/LoanFactory-Inc/google-account-service/readme`).
- `tera-docs:infrastructure/worklog/repos/google-account-service.md:3` says: "Staging on the standard; production never deployed"; the prod namespace in `moso-gke` is empty, and nobody has committed since 2026-09-14.
- Org-wide `gh search code "ga-svc"` finds only gateway route config and docs, so it has **no callers**.

### Commission plan, compensation and experience: non-MOSO owners

**core-accounting-be owns the plan catalogue**
- Plan formula, fees and payout (`ai-hr-be@production:internal/accountingclient/client.go` header: "the system that OWNS the commission plans"; `tera-docs:accounting/commission/commission-calculation.md`).
- Plan selection for a loan works in this order (`commission-calculation.md:108-117`):
  1. body `planId`
  2. ask HR for the person's plan as of the funded date
  3. otherwise 400
- **Production uses a stub.** `COMMISSION_PLANS_FROM_HR` is present in `core-accounting-be@production:helm-chart/config/staging/values.yaml:89-90` and absent from `config/production/values.yaml`. Checked via `gh api`.

**ai-hr-be owns the person's commission "Setting"**
- The pair of plans plus the `experience_level` that chooses between them (`internal/commission/commission.go` header).
- "The loan platform picks the plan, counts the funded loans and decides when somebody becomes experienced" (same file).
- Plan ids are mixed: `commission.go` still describes the plan as a packs `CommissionPlan` reference, while the accounting client uses UUIDs. The transition is not finished.

**tera-be is not an owner**
- It copies `experience` from MOSO (V376 above).

**ramp-los-sync**
- Its "LOS" is packs `RampAPI.java` (`gh api repos/LoanFactory-Inc/ramp/contents/README.md:20-24,436`). It also posts to accounting at `/internal/commission/los/ramp-payments` (accounting prod values :45).
- So ramp is a payment-status sync, not a plan owner.

**Net**
- The experience-to-plan choice at "Create new account" is still MOSO's in prod.
- The pieces that could replace it (an HR Setting fed by recruit's experience class, and the accounting catalogue) exist, but are not wired in production.

## 4. Omni pieces pointing at MOSO

**zoom-go `users.los_user_id`** (`zoom-go@master:db/schema/schema.sql:503,1600`)
- The column is `NOT NULL UNIQUE` and is "the immutable old-LOS key" (`README.md:364-368`).
- It is upserted on Zoom connect (`internal/server/auth_callback.go:332-339`, `auth_authorize.go:80-109`).
- `messages/send` resolves the sender by `fromUserId` against `los_user_id`, or by `fromEmail`.

**omni `SPISenderResolver`** (`omni-service@production:cmd/server/main.go:711-723`; `internal/outbox/seams.go:31-42`; `internal/hostsubjects/hostsubjects.go:505-520`)
- Asks the host (tera-be) for `user_zoom_link.zoom_los_user_id` first, then the link email, then falls back to the cast party email.
- It is live wherever the host SPI is configured.
- The sender identity therefore depends on the old-LOS (MOSO GAE) key through tera-be's `user_zoom_link`.

**Omni email transport**
- moso-notifier v2 over Pub/Sub (`main.go:667-686`; PR #565 "every omni mail on moso-notifier v2", merged 2026-10-13).
- Despite its name, moso-notifier is a TERA GKE service (namespaces `moso-notifier-prod`/`-sta`), not the GAE monolith.
- It is being strangled by `notification-service` (Go), which "runs nowhere" since 2026-10-17 (`tera-docs:infrastructure/worklog/README.md:284`).

**Reply-address endpoint**
- PR **#608 `feat/subject-reply-address` → master is OPEN**, updated 2026-10-17, with no reviews and no review decision. It adds `GET /api/v1/internal/subjects/{type}/{id}/reply-address`, dark behind `COMM_REPLY_ADDRESS_ENABLED`, staging values on.
- The branch is 1 commit ahead of master (`2370999`).
- `COMM_REPLY_ADDRESS_ENABLED` appears on neither `origin/master` nor `origin/production`. **Not merged, not live.**
- Companion PR #609 (`author_side` on inbound-reply) is also OPEN.
- Purpose, from the PR body: recruit's Nurture and "Send info" mails stay on moso-notifier, and only the replies thread into omni (Bao 17/10).

## 5. Hosting

`tera-docs:infrastructure/README.md:3-4`:
- **PROD** = project `lender-rate`, GKE `moso-gke` (context `gke_lender-rate_us-central1_moso-gke`)
- **staging** = `lenderrate-master` / `moso-kube`

Supporting evidence:
- Prod images are in `lender-rate/moso-svc-repo`, and Secret Manager is split by project (`DELIVERY_FLOW.md:272,462`).
- `NEW_SERVICE.md:96,117-134` uses `lender-rate` for new services' WIF deploy SAs.

**MOSO GAE/Datastore is in the same project `lender-rate`:**
- user-service `GOOGLE_CLOUD_PROJECT: lender-rate` (Datastore)
- ai-hr-be `packsDatastoreProject: lender-rate`
- tera-be values comment "this project's Datastore (lender-rate)" (`tera-be@production:helm-chart/config/production/values.yaml:328`)

Per-service prod placement (prod helm values / worklogs):

| service | prod namespace | identity / project |
|---|---|---|
| auth-service | `auth-service` | `moso-gke` |
| user-service | `user-service` | `moso-gke`, `lender-rate` |
| omni-service | `omni-prod` | `moso-svc@lender-rate` |
| moso-notifier (+ notification-service sidecar, dark) | `moso-notifier-prod` | `moso-gke` |
| document-esign | `document-esign` | `moso-gke` (promoted 2026-09-29, worklog) |
| ai-hr-be | `hr-prod` | `ai-hr-be-runtime@lender-rate` |
| cron-service-go | `cron-service` | `gke_lender-rate_us-central1_moso-gke`, SA `moso-svc` (`cron/CRON_SERVICE_GO_MIGRATION.md:16-19`) |
| tera-be | `tera-be` | `moso-svc@lender-rate` |
| recruit-be | `recruit-be` | `recruit-be-runtime@lender-rate` |
| account-fe | `account-fe-prod` | `moso-gke` |

**Conclusion:**
- `lender-rate` / `moso-gke` is simply the company's main production project and cluster.
- The "moso" names are historical. MOSO GAE and every TERA service share the project.
- I found no separate platform project or cluster, no plan to move off `lender-rate`, and no decision record about leaving the MOSO projects.

## 6. MOSO sunset / decommission

I grepped `tera-docs@origin/master` with `sunset|decommission|strangler|retire moso|off packs|leave moso|replace moso|drop moso|moso monolith|packs migration|identity platform`. **No MOSO/packs sunset plan or decision exists.**

The hits are either other decommissions or partial strangler programmes:

**Other decommissions**
- api-gateway v1 (done 2026-06-10)
- Java cron-service (`cron/CRON_SERVICE_GO_MIGRATION.md:53`)

**Partial strangler programmes**
- notification-service as a strangler of moso-notifier, currently dark (`infrastructure/worklog/repos/notification-service.md:3`).
- omni-service taking conversations from tera-be (`omni-channel/*`).
- The advisory's "monolith exit ramp" (`tera-plus/tera-platform-advisory.md:120-122,334`). Advice only: "inventory every endpoint… cut auth over first".

**Packs "migration" docs are migrations into the platform while MOSO stays the source:**
- `user/LF_MIGRATION_RUNBOOK.md:107-153`: user-service licences and NMLS from MOSO; "each MOSO save publishes UPDATE_USER".
- tera-be `migration/` package: `MigrateLfAdminBatchHandler`, `SYNC_LF_*` backfills.

## Implications for Recruit (short)

1. **Login:** already MOSO-free for recruit. The leftover MOSO coupling is platform-wide: the IdP bounce and the copied passwords.
2. **Writes to packs:** this is the true blocker. Every packs op checks a MOSO user's packs permission. Options visible in code:
   - (a) HR's api-key pattern (`/api/ai/v1` with a linked MOSO user holding a permission).
   - (b) Route the "create LO account" step through the existing HR hand-off. That is already live and already creates the MOSO Admin via `InviteAdminsOp`. It does not yet carry branch, plan or experience.
3. **Commission and experience:** to take this off packs "Create new account", the experience-to-plan choice would need to go into HR's commission Setting, and accounting prod would need `COMMISSION_PLANS_FROM_HR` on. Neither is done in prod. tera-be and packs still read experience from MOSO.
4. **Omni:** the SMS sender still keys on the old-LOS id. The reply-address route recruit needs is PR #608, open and unreviewed.
