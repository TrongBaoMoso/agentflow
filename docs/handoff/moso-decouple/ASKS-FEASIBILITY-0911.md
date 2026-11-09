# Can we do the Khai / Tai / DevOps asks ourselves? (09/11)

Research only. Nothing was merged, deployed or changed in another team's system. Code was read on the
latest `origin` default branch after a fetch (omni-service `f7b5d27`, accounting-be `236e3e88`,
recruit-be `5b84e7474`, packs / moso / base / user-service `origin/master` of 09/11). MOSO PROD
Datastore and IAM were read only. Counts only: no secret values, no hashes, no names.

This repository is public. Two findings (items C and D) are security issues in other repos. Here
they are described only as far as is needed to decide who acts. The exact details went to Bao
privately, not into git.

| Item | Verdict |
|---|---|
| A. omni SMS opt-out push | **We can write it (PR) and put it on staging.** Khai must answer the 3 contract questions and release it to production |
| B. Referral bonus payout | **Must ask the accounting-be team.** No existing API pays a non-loan bonus |
| C. Meta app secret in packs | **We can write the packs PR.** A Meta app admin must rotate the secret. A MOSO/GCP admin must store the new value |
| D. user-service `ref_keys` | **Our reading is not enough.** We found no direct self-write, but there is one indirect path. We can write the fix PR. Tai must review and deploy it and answer 2 runtime questions |
| E. moso-aid intake key | **We can do it with no grant:** rotate all 3 intake keys together, as on 02/11. The `_EXTRA` secret route would need a platform admin's IAM grant |

## A. omni SMS opt-out push (P5-PLAN "API ask for Khai")

**What exists (omni-service `origin/master`):**
- `comm_suppression` has `provenance HOST_PUSHED | OMNI_LEARNED` (V02).
- Lift columns `lifted_at / lifted_by / lift_reason / zoom_number` came in V39.
- The unique key is `uq_comm_suppression (tenant_id, identifier_type, identifier_value, suppression_type)` (V03:109). Provenance is not part of it, so a phone can't hold both a HOST_PUSHED and an OMNI_LEARNED STOP_SMS row. The planned `already_learned` answer covers this.
- No column holds a host reference (`host_ref`).
- `db/query/comm_suppression.sql` has 2 read queries only.
- The only writer is `internal/suppression/recorder.go`, which writes OMNI_LEARNED. `LiftStop` deliberately skips HOST_PUSHED rows (recorder.go:136-140).
- The internal surface is `cmd/server/main.go:1449`, mounted behind `auth.RequireInternalKeySet`.
- The nearest template is `internal/optstatushttp` (handler 157 lines, tests 178 lines). It is mounted at main.go:1492 and serves owner-service keys only.

**Size of the change: medium, about 800-1,000 lines with tests.**
- `V44__comm_suppression_host_ref.sql`: a nullable `host_ref` column plus a unique index on `(tenant_id, host_ref)` where it is not null. Expand-only.
- 3-4 sqlc queries:
  - upsert HOST_PUSHED, which never touches an OMNI_LEARNED row;
  - lift by `host_ref` and owner;
  - list active pushed rows with a cursor.
- A new handler package modelled on `optstatushttp`, about 250 lines, with E.164 normalisation and the same owner-service check.
- About 3 lines in `main.go`, unit tests, one `internal/itest` case, and a `WIRE_COMPAT.md` row.

**How omni ships** (`CLAUDE.md:31-37` and the repo rulesets read 09/11):
- `master` has no ruleset or protection. Our account has push access, and Bao merged #659/#663/#665/#672/#674 himself.
- Staging: any writer runs `promote-staging.yml`. Only the `lf-promoter` App may update the `staging` branch.
- **Production: only the team `release-omni-service` (imkhai) and `platform-release` can push `production`.**

**Auth:**
- The routes go under `RequireInternalKeySet`, with an owner-service check like `sms-opt-status`. No new key is needed.
- recruit-be already calls omni with its scoped key.
  - `OmniSmsOptStatusClient` (`suppression/reconcile/`) sends `RECRUIT_OMNI_INTERNAL_API_KEY` + `X-Service-Name`.
  - `application.yml:383` reads it as `recruit.omni.internal-api-key`.
  - The same key and base URL are used by `OmniHostSmsClient` and `OmniOutboundReadClient`.
- Recruit's push client is a small sibling of `OmniSmsOptStatusClient`.

**Still Khai's call:**
- the 3 questions in P5-PLAN (BLACKLIST too? which tenant? candidate id on the row?);
- the production release.

Since the contract is his, the PR should go to him as a proposal, not be merged on our own.

## B. Referral bonus payout

**How MOSO does it today:**
- moso `src/main/java/com/lenderrate/server/op/cron/CreateLoanOfficerReferralSpecialRequest.java` runs every Saturday 01:00 (`AppCronConfig.java:430`).
- For a referred LO 60+ days after joining (eligible, active, `refer_cash_bonus_info > 0`, qualified referrer), it creates one Datastore **`Check`** with:
  - `check_type = Manually`;
  - `status = Requested`;
  - `owner` = the referrer;
  - `requested` = the bonus amount;
  - `is_automatically_created = true`;
  - a reason starting with "Loan officer referral bonus".
- It also sets `cash_bonus_requested` on the referred Admin. packs `ReferralCheckJoin.java` documents the same join.

**Status lifecycle:** `CommissionRequestStatus` = Requested → Pending (shown as "Pending Approval") / Action_need → Approved → Paid, or Rejected.
- `approver`, `payer`, `approved_date`, `pay_date` and `total_paid` are tracked fields on `Check` (`Check.java:127-242`).
- A status change fires `Check status changed`, which emails the officer.

**MOSO PROD, measured 09/11** (`Check` with `check_type = Manually`, 2,192 rows; referral = reason carries the marker):

| | All time (2024-11 → now) | Last 12 months (since 2025-11-09) |
|---|---|---|
| Referral bonus Checks | 490 (486 automatically created) | **127** |
| Paid | 303 | 73 |
| Rejected | 187 | 54 |
| Open (Requested / Pending / Approved) | 0 | 0 |

- By year: 2024 = 174, 2025 = 193, 2026 = 123.
- The amount is not always $500. The `requested` field is 200 on 280 checks, 300 on 62, 500 on 77, and between 1,000 and 5,000 on 50.
- Last 12 months: 38,105 paid in total, with a median of 5 days from creation to payment.

**Who marks it paid (`payer`), last 12 months, by the actor's MOSO title:**
- Commission Team: 31
- Commission Processor: 23
- Accountant: 11
- Internal Accountant: 6
- Accountant/Commission Support: 2

All are in the `accounting.dept` / commission-team groups.

**Who approved it, last 12 months:**
- Commission Processor: 42
- Accounting Manager: 22
- Commission Team: 9
- none: 54, which are all the rejected ones

Over all time, 8 distinct payers and 5 distinct approvers. So it is the **Accounting / Commission team** in MOSO's Commission requests screen.

**accounting-be** (read at `master` `236e3e88`):
- Nothing pays a person who has no loan.
  - `POST /tickets` (`src/tickets/tickets.controller.ts:238`) is a signed-in employee's expense request: `reimburse` / `vendor` only, a receipt is required, paid via bank-file runs.
  - `POST /internal/commission/los/requests` (`commission-los-intake.controller.ts:202`) is an LO commission request, but it is tied to a reported loan (404 otherwise).
  - `/ramp-accounts/:userId[/set-up]` creates or reads an LO's Ramp vendor and pays nothing.
- Accounting deliberately leaves MOSO's manual special requests (bonuses) in MOSO (`src/tera-services/legacy-los/legacy-los-checks.ts:57-65`).
- Internal routes need only `X-Service-Name` (`jwt-auth.guard.ts:62-68`). The real gate is the per-environment `networkPolicy.serviceCallers` (`helm-chart/config/*/values.yaml`). recruit-be is not on it.
- recruit-be has no accounting client.

**Missing (accounting-team code):**
1. An internal route, for example `POST /internal/commission/special-requests`, taking the payee user, the amount, the reason and an idempotency `source_ref`. It goes through accounting's approval, then a Ramp bill to the LO's `_LO_` vendor.
2. recruit-be added to `serviceCallers` for each environment.

Our account has push access to accounting-be, but this moves money and changes their approval flow, so it is theirs to build or approve. Until then, the only no-code path is MOSO's Check, as today.

Recruit's read-only payout CSV (#932, D435) stays the hand-off.

## C. Meta (Facebook) app secret hard-coded in packs

**Where it lives:**
- `packs loan/src/main/java/com/mvu/loan/server/op/loan/LoanOps.java:3785-3787`: `getFaceBookAppSecret()` = `Server.getSystemProperty("facebook_app_secret", <hard-coded default>)`.
- The same block hard-codes defaults for the webhook verify token (`:3793`) and the lead key (`:3797`). The app id (`:3782`) is public and fine.
- The secret is used as `client_secret` in `facebook_lead/UpdateFBUserTokenOp.java:50,109`.
- System properties are the `SystemProp` kind, in the **default namespace** of MOSO's Datastore (`lender-rate`). It is defined in `base core/.../shared/entity/SystemProp.java:16`, readable and writable only with MOSO `Permission.SYSTEM`.
- Measured 09/11, existence only: a `facebook_app_secret` SystemProp entity exists in PROD. The verify-token and lead-key properties do not exist in PROD, so their hard-coded defaults are what runs.
- Comparing the stored secret with the code was done without printing either value. The result is in Bao's private note, not here. In short: **rotate it.**

**`VerifyWebHookFBOp`** (`server/op/misc/VerifyWebHookFBOp.java`):
- It is `@IgnoreXSRF @RequiresPermissions` with an empty list, so it needs no login.
- It checks only `hub.verify_token` on the GET handshake. **Lead POSTs carry no signature check.**
- It logs the full payload (`:45-46`) and the Graph URL with the page access token (`:122`).
- A neighbouring op has a related issue. It is described privately and belongs in the same PR.

**The packs PR (we can write it; about 300-400 lines with tests):**
1. **Remove the defaults:**
   - Remove the three hard-coded defaults in `LoanOps.java:3785-3799`.
   - When a property is missing, fail closed: log an error and refuse the operation, with no fallback.
   - In the same change, Bao or an admin stores the verify token and lead key as SystemProps, since PROD has none today.
2. **Verify `X-Hub-Signature-256`:**
   - `HMAC-SHA256(app_secret, raw body)` in lowercase hex after `sha256=`, compared in constant time.
   - It needs the raw request body, which an `Op` doesn't see. So follow `zoom/ZoomWebhookServlet.java` (238 lines, HmacSHA256 on the raw body).
   - Add a `FacebookWebhookServlet` that verifies, then calls the existing op logic. Point the subscription `callback_url` in `UpdateFBUserTokenOp.java:122` at it.
   - Refuse with 401 when the secret is blank or the signature is wrong.
3. Stop logging the payload and the token-bearing URL.
4. Fix the neighbouring op (private note).

**Shipping:** our account has push access to packs and Bao merged 15 of its last 40 PRs. Production goes through the SWAT "Deploy Hot Fix" button, which Vinh or Khai press.

**Rotation (not us):**
- **A Meta app admin** of app `2844160349190580` must reset the app secret in the Meta developer console. After the reset, the old value stops working at once.
- **Someone who can write MOSO `SystemProp`** must store the new value at the same moment. That is a MOSO user with `Permission.SYSTEM` (the System properties screen), or a GCP principal with Datastore write on `lender-rate`.
- Bao's account can't do this. Its roles on `lender-rate` include `roles/datastore.viewer` only for Datastore. `testIamPermissions` returns `datastore.entities.get/list`, with no update or create.
- Datastore write is held by `roles/owner` (6 users), `roles/editor` (6 users + group `dev_leads@`) and one service account with `datastore.user`.
- Order: deploy the PR first (signature check, no defaults), then rotate and store together. The PR only needs the property to exist.

## D. user-service `ref_keys` (MOSO Admin key)

Read on `origin/master` (Java/Spring), plus api-gateway-v2, account-fe and an org-wide code search.

| # | Write path | Caller / auth | Can an end user reach it? |
|---|---|---|---|
| 1 | `POST /public/api/v1/users/register`: `PublicUserController.java:28-31` → `UserServiceImpl.java:368-373` (the body's `key` becomes `ref_keys=[key]`) | Services; `@AlwaysAuthorized`. `AccountAuthorizationInterceptor.java:121-143` refuses any request carrying the gateway marker `X-Gateway-Version`, which the gateway always sets (`proxy.go:322`) | No |
| 2 | `PATCH /api/v1/users/{id}/lf-identity`: `PrivateUserController.java:359-363` → `UserFacadeImpl.java:507-508` | recruit-be / tera-be LF sync; same guard as #1 | No |
| 3 | `PATCH /api/v1/users/me` (`:272-275`) and `PATCH /{id}` (`:346-349`), with `UpdateUserRequest` | `/me` = role USER | Yes, but `updateUser` copies fields one by one and never touches `key` or `ref_keys`. There is no mass assignment |
| 4 | `UserFacadeImpl.linkUpstreamKey` (`:338-361`) → `UserServiceImpl.java:319-322` | `LFUserSyncService.java:105-120` (MOSO Pub/Sub sync), `RegistrationUserHandler.java:95-100` | **Indirectly**, see below |
| 5 | `SyncUserService.java:144` via `POST /api/v1/lf-users/sync` (writes `key` only) | Ops; `@AlwaysAuthorized` | No |
| 6 | `scripts/users-ref-keys-index.sql`, `users-ref-keys-backfill.sql` | Manual DBA run | No |

- account-fe never sends `ref_keys`.
- api-gateway-v2 forwards all of `/user-svc/*` with no allowlist, so the interceptor is the only gate.
- Other repos only read `refKeys`.

**Verdict: there is no direct self-write.** There is an indirect one:
- the sync's "key missed, link the row found by email" fallback (#4) matches on an email field that the user can edit through #3 without proof;
- under a condition we can't measure, it can link a MOSO key the user doesn't own.

The exact steps are in Bao's private note. We can write the fix PR, about 50-150 lines with tests:
- `PATCH /me` stops setting that field directly (the proof flow already exists);
- the sync fallback links by the verified primary email only, or refuses and alerts.

The repo is Tai's: he authored or merged 19 of the last 30 merged PRs. Our account has push access, but this is auth code in his service.

**So asking Tai is still needed.** Tai should get the fix PR to review and deploy, plus 2 runtime questions:
1. Are any MOSO admin keys still unlinked in user-service prod?
2. Is user-service reachable other than through the gateway (ingress or NetworkPolicy), and is `DOWNSTREAM_AUTH_KEY` set?

## E. The moso-aid intake key on recruit-be staging

**Facts (metadata only, 09/11, `lenderrate-master`):**
- `recruit-be-recruit-lead-intake-api-keys`:
  - v3 is enabled (02/11 15:36); v1 and v2 are disabled;
  - its only IAM binding is `secretAccessor` for `recruit-be-deploy@`.
- Bao's account:
  - on that secret: `versions.add`, `secrets.get`, `getIamPolicy`. **No `versions.access`, no `setIamPolicy`**;
  - project-wide: `secretmanager.secrets.create` and `versions.add`, but **no `secrets.setIamPolicy`**.
- `moso-aid-recruit-lead-intake-api-key` v1 was created 09/11 03:32 and is already set on moso-aid staging.
- `lf-homepage-recruit-intake-api-key` and `lo-homepage-recruit-intake-api-key` are each at v3, created 02/11 15:36 together with recruit-be's v3. Bao can add versions to all three.
- recruit-be staging `secret-sync.yml` is a `workflow_dispatch` from `staging`. The environment has a branch policy only and no reviewers, so any writer can run it.

**Clean path, no grant and no read: rotate all three keys together.** This is exactly what we did on 02/11, when v2 was retired.
1. Generate three new keys (`openssl rand -hex 24` or longer, never echoed): one for lf-homepage, one for lo-homepage, one for moso-aid.
2. Add one new version to each of the three site secrets, and one new version `lf-homepage:<k1>,lo-homepage:<k2>,moso-aid:<k3>` to `recruit-be-recruit-lead-intake-api-keys`.
3. Set each site's staging env from its own secret. **Cloud Run: `--update-env-vars` only, never `--env-vars-file`.**
4. Run recruit-be `secret-sync.yml` on `staging`, then disable the old versions.

During the few minutes of rollover, an intake post may get 401. That is safe by design: packs stays the primary post, and the MOSO push creates or links the candidate (`docs/INTEGRATIONS.md`, intake row).

**The `RECRUIT_LEAD_INTAKE_API_KEYS_EXTRA` alternative works in code but needs an admin:**
- `application.yml:265` would become `${RECRUIT_LEAD_INTAKE_API_KEYS:},${RECRUIT_LEAD_INTAKE_API_KEYS_EXTRA:}`. `SiteApiKeyRing` skips blank entries.
- Add a `secret-keys.txt` line.
- Bao can create the new secret, but **can't grant `recruit-be-deploy@` `secretAccessor`** on it.
- That grant needs the one `roles/secretmanager.admin` user or a project owner (6 users). Per recruit-be `docs/secret-sync.md:19`, platform-admin also creates new source secrets.
- So this is a second ask. Rotation avoids it.

**Done 09/11 14:28-14:47Z (session 460363a7, agentflow-0gwad.4.14):** rotated as above. New versions lf v4, lo v4, moso-aid v2, recruit-be list v4; old ones disabled. lf, lo and an after-party RSVP all landed in Recruit (the RSVP as `EVENT_RSVP`, client `moso-aid`); unkeyed POST 401. Details: [`p3-intake-staging/OTHER-SOURCES.md`](p3-intake-staging/OTHER-SOURCES.md).
