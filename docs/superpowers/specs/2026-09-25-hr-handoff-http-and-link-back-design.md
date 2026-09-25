# HR handoff over HTTP + link-back — design

- **Date:** 2026-09-25
- **Owner:** Bao Trinh (approved scope 2026-09-25: "ok làm đi")
- **Beads:** agentflow-8pqy (parent), follows agentflow-dkt0 (Send to HR, shipped dark)
- **Repos:** recruit-be only
- **Status:** revised after two reviews (HR side: APPROVE; recruit side: APPROVE-WITH-CHANGES)

## 1. What changed on the HR side (verified 2026-09-25)

Hùng built the receiving side; it is live on HR **staging** (`hr-dev`, image `dev-48c3738f`, ai-hr-be
`origin/dev` #799 + #801) and **not yet on HR production** (`dev` is not merged to `master`).
Contract: `tera-docs/hr/HR_INTERNAL_API_DOCS.md` §9 (origin/master 1145392).

- `POST http://ai-hr-backend.hr-{dev,prod}.svc.cluster.local:8312/internal/v1/recruit/hires`,
  in-cluster, **no credential** (sending `Authorization`/`X-User-ID` is a 403), header
  `x-service-name: recruit-be`. Body = our `recruit.hired.v1`.
- Receipt `{payload: {draft_id, result, dropped[], platform_user_id?}}`; `result` ∈ `created` (201),
  `updated` / `existing_draft` / `already_employee` (200). `400` only for a non-object body or a
  non-uuid `source_key`. `5xx` = transient. Idempotent on `source_key`.
- New optional field **`sponsorships`**: `[{state, status, sponsored_at}]`, only `SPONSORED` used.
- **Return path:** when HR submits the draft, `associate.onboarded` fires on `HR_ASSOCIATE_ONBOARD`;
  `GET /internal/v1/associates/{platform_user_id}` returns `sources: [{system:"recruit-be",
  kind:"candidate", key:<our source_key>}]`. `platform_user_id` is the central user id — exactly what
  `candidates.account_id` is meant to hold (measured 2026-09-25).

Recruit today still **publishes to Pub/Sub** (`HrHandoffTickServiceImpl:99`) and has **no** link-back.

## 2. Scope

In: (A) relay transport Pub/Sub → HTTP; (B) `sponsorships` in the payload; (C) link-back from the
receipt (`already_employee`) and from `associate.onboarded`; (D) staging switch-on and an end-to-end
check against HR staging. Out: HR production (waits on Hùng's `dev`→`master`); ROLE/UPDATE/
DEACTIVE topics (recruit only needs to know the account exists); blacklist (agentflow-9hba).

## 3. Design

### A. Relay over HTTP
- New `HrIntakeClient` (same shape as `OmniCastPushClient`: `java.net.http.HttpClient`, no
  redirects), `POST {base-url}/internal/v1/recruit/hires` with `Content-Type: application/json`,
  `x-service-name: recruit-be`, **no credential header**. Timeouts are explicit and short because the
  call runs inside the tick's `FOR UPDATE SKIP LOCKED` transaction (up to 50 rows sequentially):
  **connect 2 s, response 5 s** (`recruit.hr-handoff.connect-timeout-ms` / `response-timeout-ms`).
- Config `recruit.hr-handoff.hr-base-url` (`RECRUIT_HR_HANDOFF_HR_BASE_URL`), default blank. The
  delivery gate becomes "base url set" instead of "topic set"; **only `topic` is removed**.
  `recruit.hr-handoff.internal-api-key` stays: it is NOT a credential to HR — it is the
  `x-service-key` cron-service presents to call recruit's OWN `POST /api/v1/hr-handoff/internal/tick`
  (`HrHandoffInternalController`), and `HrHandoffTickCronRegistrar` refuses to register the job when
  it is blank. **It is absent from staging's `recruit-svc-secret` today (measured 2026-09-25)**, so the
  tick has never been scheduled there; switch-on (D) must add it.
- Status mapping in `HrHandoffTickServiceImpl.processOne`:
  - 2xx → row `SENT`; store `hr_draft_id`, `hr_result`, and `hr_dropped` (jsonb) on the outbox row
    so a person can see what HR could not use.
  - 400 → `DEAD_LETTER` at once (retrying an identical body cannot help); log the body.
  - 403 → `DEAD_LETTER` at once (a credential leaked onto the hop — a config bug).
  - 5xx / timeout / connection error → existing retry + backoff, 8 attempts.
- `HrHandoffStatus.SENT` javadoc changes from "published" to "HR answered 2xx".

### B. `sponsorships`
`HrHandoffPayloadResolver` adds `sponsorships` from `SponsorshipEntity` rows of the candidate with
status `SPONSORED` and a non-null `sponsored_at`: `[{state, status:"SPONSORED", sponsored_at}]`,
omitted when none. (HR ignores other statuses; sending only what it uses keeps the wire honest.)

### C. Link-back → `candidates.account_id`
- **From the receipt:** `result = already_employee` with a `platform_user_id` → set
  `candidates.account_id` in the same transaction as marking the row `SENT` (only if currently null).
- **From the event:** a new `HrAssociateOnboardedHandler` (same shape as `OmniOutboundMessageHandler`:
  overrides `handleMessage` so it acks only after the DB write — the tera-core base acks BEFORE
  handling; bean gated by a hand-written `Condition` like `OmniOutboundSubscriptionCondition`, since
  the yml default is `""`), configured by BOTH `recruit.hr-handoff.onboarded-topic` (default
  `HR_ASSOCIATE_ONBOARD`) and `recruit.hr-handoff.onboarded-subscription`, on our own subscription
  `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT` (per environment, `--ack-deadline 60
  --expiration-period never`, as `pub-sub-associate.md` requires). For each message:
  1. parse `platform_user_id`; dedupe on `event_id` is unnecessary because the write is idempotent
     (setting the same id twice is a no-op);
  2. `GET {hr-base-url}/internal/v1/associates/{platform_user_id}` (no credential);
  3. for each `sources[]` entry with `system = recruit-be` and `kind = candidate`, set that
     candidate's `account_id` to `platform_user_id` **only if null** (never overwrite; a different
     existing value is logged as a conflict and left alone);
  4. ack only after success; a 404 / no recruit source → ack and ignore (most onboards are not ours);
     5xx / timeout → nack for redelivery.
- **After every `account_id` write (both paths) call `CandidateCastPush.pushIfAlreadyCast(candidateId)`**
  so omni's `principal_id` for the candidate party is refreshed; without it the cast stays stale and
  the fix is silently defeated. The write itself goes through one small service method
  (`linkAccount(candidateId, platformUserId)`), the second writer of `account_id` after
  `DedupServiceImpl`'s fill — same only-if-null semantics.
- **Why only-if-null:** `account_id` feeds omni's `principal_id` for the candidate party; overwriting
  a correct value with a wrong one fails the Loan Officer closed on their own recruiting record.

### D. Switch-on (staging only)
- Create subscription `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT` in `lenderrate-master` with the
  recruit-be service account as subscriber (staging is self-serve).
- Add `RECRUIT_HR_HANDOFF_INTERNAL_API_KEY` (a fresh random value) to staging `recruit-svc-secret`
  (a plain Secret, keys added by hand like `PACKS_WRITEBACK_INTERNAL_API_KEY`), so the tick cron
  registers.
- `helm-chart/config/staging/values.yaml`: `RECRUIT_FEATURES_HR_HANDOFF_PUBLISH=true`,
  `RECRUIT_HR_HANDOFF_HR_BASE_URL=http://ai-hr-backend.hr-dev.svc.cluster.local:8312`,
  `RECRUIT_HR_HANDOFF_ONBOARDED_SUBSCRIPTION=HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT`.
  Production values untouched.
- Deploy = fast-forward push `master` → `staging` (flow since 2026-09-25).
- End-to-end check on staging: pick one test candidate, fill the 1-1 outcome, press Send to HR,
  confirm the outbox row turns `SENT` with a `draft_id`, confirm the draft exists in HR staging; if an
  HR staging user can submit it, confirm `account_id` is filled.

## 4. Data
Migration: `hr_handoff_outbox` gains `hr_draft_id TEXT`, `hr_result TEXT`, `hr_dropped JSONB`.
Regenerate `docs/SCHEMA.md`. Use the next free Flyway number at commit time (check `origin/master`
AND open PRs): on 2026-09-25 master tops at V120 and open PRs hold V121–V123, so **V124** or later.

## 5. Risks
- **HR production not ready:** production stays dark until HR merges `dev`→`master`; our flag stays
  off in production values.
- **A wrong account link:** guarded by only-if-null + conflict log; the id comes from HR's own record.
- **Subscription IAM:** if a project Editor cannot bind the subscriber role (`pub-sub-associate.md`
  warns), ask DevOps — after double-checking self-serve (Rule #1).
- **`already_employee` via NMLS match** may link a candidate to a former employee's account — that is
  the same human (NMLS is personal), which is the point.

## 6. Testing
Unit: client status mapping (201/200/400/403/5xx/timeout), tick outcomes + stored receipt, payload
`sponsorships`, handler (ours / not ours / conflict / 5xx nack). Integration: outbox columns + a
WireMock-style stub of HR (or MockWebServer) through the tick. Negative controls per rule. Staging
end-to-end as in D.

## 7. Review log
Two reviews 2026-09-25. HR side (ai-hr-be origin/dev, docs §9): APPROVE — endpoint, envelope,
201/200/400, `sponsorships`, already_employee by email then NMLS, `sources` written into
`external_identity_map` on submit, staging image `dev-48c3738f` carries the intake. Recruit side:
APPROVE-WITH-CHANGES, all four folded in — keep `internal-api-key` (recruit's own tick auth); add the
topic property the subscriber pattern requires; re-push the omni cast after linking; explicit short
timeouts. Plus measured: the tick key is missing on staging.
