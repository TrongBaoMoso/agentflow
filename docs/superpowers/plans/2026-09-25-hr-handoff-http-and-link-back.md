# HR handoff over HTTP + link-back — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** recruit-be delivers `RECRUIT_HIRED` to HR's `POST /internal/v1/recruit/hires` over HTTP (not Pub/Sub), sends `sponsorships`, and fills `candidates.account_id` from HR's receipt (`already_employee`) and from `associate.onboarded`.

**Architecture:** the existing outbox + tick stays; `PubSubService.publish` is replaced by a new `HrIntakeClient` (java.net.http, like `OmniCastPushClient`); the receipt is stored on the outbox row. A new `HrAssociateOnboardedHandler` (like `OmniOutboundMessageHandler`) reads the person back from HR (`GET /internal/v1/associates/{uid}`) and links via one `CandidateAccountLinker` (only-if-null + omni cast re-push).

**Tech Stack:** Java 21, Spring Boot, tera-core (`EntityService`, `AbstractMessageHandler`), Flyway, JUnit 5 + Mockito + AssertJ, `com.sun.net.httpserver.HttpServer` for HTTP stubs (pattern: `WebinarClientTest`).

**Spec:** `docs/superpowers/specs/2026-09-25-hr-handoff-http-and-link-back-design.md` (reviewed; Bao approved scope "ok làm đi", 2026-09-25).

## Global Constraints

- Repo recruit-be only. Branch `agent/agentflow-8pqy-hr-http` from `origin/master`; ONE PR into `master`. Merge only with CI green + 2 independent reviewers. Merging does NOT deploy staging (since 2026-09-25): staging deploy = fast-forward push of master to `staging` (Task 6, controller only).
- HR endpoint: `POST {hr-base-url}/internal/v1/recruit/hires`, headers `Content-Type: application/json`, `x-service-name: recruit-be`, and **no** `Authorization`, `X-User-ID`, `X-Dev-User-ID`, `X-HR-Act-As`, `x-internal-api-key` (a credential on this hop is a 403).
- Receipt: `{"payload": {"draft_id", "result", "dropped": [...], "platform_user_id"?}}`; `result` ∈ `created` (201) | `updated` | `existing_draft` | `already_employee` (200).
- Status mapping: 2xx → `SENT`; 400 → `DEAD_LETTER` immediately; 403 → `DEAD_LETTER` immediately; 5xx / timeout / IO → retry with the existing backoff, max 8.
- Timeouts: connect **2000 ms**, response **5000 ms**.
- `recruit.hr-handoff.internal-api-key` is KEPT (recruit's own tick endpoint auth). Only `recruit.hr-handoff.topic` is removed.
- `candidates.account_id` is written ONLY when null; a different existing value is logged (`HR link conflict`) and left alone; every successful write is followed by `CandidateCastPush.pushIfAlreadyCast(candidateId)`.
- Subscriber: `recruit.hr-handoff.onboarded-topic` (default `HR_ASSOCIATE_ONBOARD`) + `recruit.hr-handoff.onboarded-subscription` (default blank = no bean). Ack only after success; unknown uid (404) or no `recruit-be` source → ack; 5xx/timeout → nack.
- Flyway: next free version at commit time, checking `origin/master` AND open PRs (V124 or later on 2026-09-25); regenerate `docs/SCHEMA.md` (Docker).
- Production helm values are NOT changed.

## Review Focus

1. HR returns 201 with a receipt missing `draft_id` (unexpected shape) — expected: row still `SENT` (HR accepted), receipt fields left null, a warn log; never a retry loop (Task 2 test).
2. `already_employee` with no `platform_user_id` (HR knows the person but has no account) — expected: `SENT`, no link, no cast push (Task 4 test).
3. `associate.onboarded` for someone recruit never sent — expected: ack, no DB write (Task 5 test).
4. Same candidate linked twice with the same id (duplicate delivery) — expected: no second write, no second cast push (Task 4 test).
5. Candidate already linked to a DIFFERENT id — expected: left alone + conflict log (Task 4 test).

---

Setup (controller): `git worktree add -b agent/agentflow-8pqy-hr-http ../../recruit-be-worktrees/8pqy-hr-http origin/master` from `/Users/apple/Projects/agentflow/recruit-be`.

### Task 1: Outbox receipt columns

**Files:** Create `src/main/resources/db/migration/V<next>__hr_handoff_outbox_receipt.sql`; Modify `src/main/java/com/loanfactory/recruit/hrhandoff/entity/HrHandoffOutboxEntity.java`; Modify `docs/SCHEMA.md` (regenerated).

**Produces:** `HrHandoffOutboxEntity#hrDraftId: String`, `#hrResult: String`, `#hrDropped: List<String>` (jsonb) with getters/setters.

- [ ] Step 1: Migration:
```sql
-- agentflow-8pqy: HR's receipt for a delivered RECRUIT_HIRED (POST /internal/v1/recruit/hires).
ALTER TABLE hr_handoff_outbox ADD COLUMN hr_draft_id TEXT;
ALTER TABLE hr_handoff_outbox ADD COLUMN hr_result TEXT;
ALTER TABLE hr_handoff_outbox ADD COLUMN hr_dropped JSONB;
COMMENT ON COLUMN hr_handoff_outbox.hr_draft_id IS 'ai-hr-be employee_draft id from the receipt (agentflow-8pqy).';
COMMENT ON COLUMN hr_handoff_outbox.hr_result IS 'created | updated | existing_draft | already_employee (agentflow-8pqy).';
COMMENT ON COLUMN hr_handoff_outbox.hr_dropped IS 'Fields HR could not use, as HR named them (agentflow-8pqy).';
```
- [ ] Step 2: Entity fields (follow the existing jsonb field style in the repo, e.g. `CandidateEntity.licensedStates` with `@JdbcTypeCode(SqlTypes.JSON)`):
```java
    /** HR's draft id from the receipt (agentflow-8pqy). */
    @Column(name = "hr_draft_id")
    private String hrDraftId;

    /** created | updated | existing_draft | already_employee. */
    @Column(name = "hr_result")
    private String hrResult;

    /** Fields HR could not use, as HR named them ("phone", "mailing_address.country", ...). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "hr_dropped", columnDefinition = "jsonb")
    private List<String> hrDropped;
```
- [ ] Step 3: Regenerate `docs/SCHEMA.md` (Docker: `docker run -d --name schemagen-8pqy -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -p 5477:5432 postgres:15`, wait `pg_isready`, `SCHEMA_DB_HOST=localhost SCHEMA_DB_PORT=5477 SCHEMA_DB_USER=postgres SCHEMA_DB_PASSWORD=postgres PGPASSWORD=postgres python3 scripts/gen-schema-doc.py`, `docker rm -f schemagen-8pqy`).
- [ ] Step 4: `./gradlew test --tests 'com.loanfactory.recruit.SchemaDocFreshnessTest' -q` PASS; `./gradlew integrationTest --tests '*HrHandoffOutboxIT*' -q` PASS (Flyway applies it on real Postgres).
- [ ] Step 5: Commit `feat: hr_handoff_outbox stores HR's receipt (draft id, result, dropped) [agentflow-8pqy]`.

### Task 2: `HrIntakeClient` + tick over HTTP

**Files:** Create `src/main/java/com/loanfactory/recruit/hrhandoff/client/HrIntakeClient.java`, `HrIntakeReceipt.java` (record), `HrIntakeException.java`; Modify `HrHandoffProperties.java`, `HrHandoffConfiguration.java`, `service/impl/HrHandoffTickServiceImpl.java`, `model/HrHandoffStatus.java` (javadoc), `src/main/resources/application.yml`; Test `src/test/java/com/loanfactory/recruit/hrhandoff/client/HrIntakeClientTest.java`, update `HrHandoffTickServiceImplTest.java`.

**Consumes:** Task 1 entity fields.
**Produces:** `HrIntakeClient#isConfigured(): boolean`, `HrIntakeClient#submit(Map<String,Object> payload): HrIntakeReceipt`; `record HrIntakeReceipt(int status, String draftId, String result, List<String> dropped, String platformUserId)`; `HrIntakeException(String message, int status, boolean retryable)` extends RuntimeException, `isRetryable()`, `status()`. Properties: `hrBaseUrl` (""), `connectTimeoutMs` (2000), `responseTimeoutMs` (5000), `onboardedTopic` ("HR_ASSOCIATE_ONBOARD"), `onboardedSubscription` (""); `topic` removed.

- [ ] Step 1: `HrIntakeClientTest` (pattern `WebinarClientTest`: `HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0)`) — cases:
  - 201 `{"payload":{"draft_id":"d1","result":"created","dropped":["phone"]}}` → receipt status 201, draftId d1, result created, dropped [phone], platformUserId null.
  - 200 `already_employee` with `platform_user_id` "u1" → receipt carries u1.
  - request asserts: method POST, path `/internal/v1/recruit/hires`, `Content-Type: application/json`, `x-service-name: recruit-be`, and **none** of `Authorization`, `X-User-ID`, `x-internal-api-key` headers present; body is the JSON of the map.
  - 400 → `HrIntakeException` retryable=false, status 400; 403 → retryable=false; 500 → retryable=true; server that sleeps past the response timeout (set timeout 200 ms in the test) → retryable=true.
  - 201 with body `{}` → receipt with nulls (no exception).
- [ ] Step 2: RED.
- [ ] Step 3: Implement the client mirroring `OmniCastPushClient` (HttpClient with `connectTimeout`, `Redirect.NEVER`, per-request `timeout`, ObjectMapper for body and receipt; parse `payload` node leniently — missing fields → null, `dropped` absent → empty list). Register in `HrHandoffConfiguration` as a `@Bean HrIntakeClient hrIntakeClient(HrHandoffProperties, ObjectMapper)`.
- [ ] Step 4: Tick: replace the `topic` gate with `if (!hrIntakeClient.isConfigured()) { log.info("HR handoff tick skipped: recruit.hr-handoff.hr-base-url is not configured"); return HrHandoffTickResult.EMPTY; }`; in `processOne` call `hrIntakeClient.submit(payload)`, on success set status SENT, `hrDraftId`, `hrResult`, `hrDropped`, clear `lastError`, log dropped fields at warn when non-empty; catch `HrIntakeException` with `!isRetryable()` → DEAD_LETTER immediately (attempts+1, lastError includes status), else existing retry path. Remove `PubSubService` dependency. Update `HrHandoffTickServiceImplTest` mocks accordingly and add: non-retryable → DEAD_LETTER on first attempt; retryable → PENDING with backoff; unconfigured → EMPTY and no claim.
- [ ] Step 5: `application.yml` under `recruit.hr-handoff`: remove `topic`; add `hr-base-url: ${RECRUIT_HR_HANDOFF_HR_BASE_URL:}`, `connect-timeout-ms: ${RECRUIT_HR_HANDOFF_CONNECT_TIMEOUT_MS:2000}`, `response-timeout-ms: ${RECRUIT_HR_HANDOFF_RESPONSE_TIMEOUT_MS:5000}`, `onboarded-topic: ${RECRUIT_HR_HANDOFF_ONBOARDED_TOPIC:HR_ASSOCIATE_ONBOARD}`, `onboarded-subscription: ${RECRUIT_HR_HANDOFF_ONBOARDED_SUBSCRIPTION:}`; keep `internal-api-key` and `tick`. Fix comments that mention the topic/Pub/Sub delivery. grep for other `getTopic()` / `RECRUIT_HR_HANDOFF_TOPIC` users (helm, docs) and update them.
- [ ] Step 6: GREEN; negative control (make 400 retryable → the DEAD_LETTER test fails); full `./gradlew test -q`; commit `feat: RECRUIT_HIRED goes to HR over HTTP (POST /internal/v1/recruit/hires), receipt stored [agentflow-8pqy]`.

### Task 3: `sponsorships` in the payload

**Files:** Modify `HrHandoffPayloadResolver.java`; Test `HrHandoffPayloadResolverTest.java`.

- [ ] Step 1: Tests: candidate with SponsorshipEntity rows (TX SPONSORED at 2026-09-10T16:00:00Z, CA REQUESTED, AZ SPONSORED with null sponsoredAt) → payload `sponsorships` = `[{"state":"TX","status":"SPONSORED","sponsored_at":"2026-09-10T16:00:00Z"}]`; no SPONSORED rows → key absent. Stub `entityService.getAllBy(eq(SponsorshipEntity.class), any(Specification.class), any(Pageable.class))` the same way the resolver's offer lookup is stubbed.
- [ ] Step 2: RED. Step 3: implement (query by candidate id + status SPONSORED, filter sponsoredAt != null, map to `LinkedHashMap` state/status/sponsored_at ISO string, `putIfAny`-style omit when empty). Update the javadoc payload list.
- [ ] Step 4: GREEN; negative control (drop the sponsoredAt filter → AZ appears → test fails); commit `feat: RECRUIT_HIRED carries the states LF actually sponsored [agentflow-8pqy]`.

### Task 4: `CandidateAccountLinker` + receipt link

**Files:** Create `src/main/java/com/loanfactory/recruit/hrhandoff/CandidateAccountLinker.java`; Modify `HrHandoffTickServiceImpl.java`; Tests `CandidateAccountLinkerTest.java`, tick test additions.

**Produces:** `enum LinkOutcome { LINKED, ALREADY_LINKED, CONFLICT, NO_CANDIDATE }`; `LinkOutcome CandidateAccountLinker#link(String candidateId, String platformUserId)` (@Component, @Transactional(propagation = REQUIRED)).

- [ ] Step 1: Tests: null account → set + `candidateCastPush.pushIfAlreadyCast(id)` once → LINKED; same id already → ALREADY_LINKED, no save, no push; different id → CONFLICT, no save, no push, warn log `HR link conflict`; unknown candidate → NO_CANDIDATE; blank platformUserId → IllegalArgumentException. Tick: receipt `already_employee` + platform_user_id → linker called with (row.candidateId, uid); `already_employee` without uid → linker not called; `created` → linker not called.
- [ ] Step 2: RED. Step 3: implement (load via `entityService.getById(id, CandidateEntity.class)`, compare, `setAccountId`, `entityService.save`, then push). Read `CandidateEntity` account_id javadoc and `CandidateCastPush.pushIfAlreadyCast` javadoc first; follow `DedupServiceImpl`'s fill-if-null semantics. The cast push must not throw into the tick (check how other callers guard it; if it can throw, catch + log).
- [ ] Step 4: GREEN; negative controls (remove the null check → CONFLICT test fails; remove the push → LINKED test fails); commit `feat: link candidates.account_id from HR's already_employee receipt [agentflow-8pqy]`.

### Task 5: `associate.onboarded` subscriber

**Files:** Create `src/main/java/com/loanfactory/recruit/hrhandoff/onboarded/HrAssociateOnboardedHandler.java`, `HrAssociateOnboardedConfiguration.java`, `HrOnboardedSubscriptionCondition.java`, `HrAssociateClient.java` (GET `/internal/v1/associates/{uid}`, same HTTP rules and timeouts as `HrIntakeClient`, returns `List<Source>` where `record Source(String system, String kind, String key)`; 404 → empty list; 5xx/timeout → `HrIntakeException` retryable); Tests `HrAssociateClientTest.java`, `HrAssociateOnboardedHandlerTest.java`.

**Consumes:** `CandidateAccountLinker#link` (Task 4); properties `hrBaseUrl`, `onboardedTopic`, `onboardedSubscription` (Task 2).

- [ ] Step 1: Tests (handler, mirroring `OmniOutboundMessageHandler` tests if present — search `OmniOutboundMessageHandlerTest`): message `{"event":"associate.onboarded","event_id":"931","platform_user_id":"u1",...}` + client returns `[Source("recruit-be","candidate","c1"), Source("odoo","employee","x")]` → linker.link("c1","u1") only, then ack; no recruit source → no link, ack; client 404 (empty) → ack; client retryable failure → nack, no ack; malformed JSON → ack-drop (poison) with a warn; missing platform_user_id → ack-drop. Client test: path `/internal/v1/associates/u1`, no credential headers, parses `payload.sources`.
- [ ] Step 2: RED. Step 3: implement mirroring `OmniOutboundMessageHandler` (override `handleMessage`, ack only after success, `nack()` on retryable) and `OmniOutboundConfiguration` (fail boot if subscription set but topic blank). Condition reads `recruit.hr-handoff.onboarded-subscription`.
- [ ] Step 4: GREEN; negative control (ack before link → the retryable test that expects nack fails); full `./gradlew test -q` + compile ITs; commit `feat: link candidates.account_id when HR announces associate.onboarded [agentflow-8pqy]`.

### Task 6: Docs + staging values, then switch-on (controller)

**Files (implementer):** `helm-chart/config/staging/values.yaml` (replace the dark-ship comment block with env entries `RECRUIT_FEATURES_HR_HANDOFF_PUBLISH: "true"`, `RECRUIT_HR_HANDOFF_HR_BASE_URL: "http://ai-hr-backend.hr-dev.svc.cluster.local:8312"`, `RECRUIT_HR_HANDOFF_ONBOARDED_SUBSCRIPTION: "HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT"` — follow the file's `- name:/value:` style); `docs/INTEGRATIONS.md`, `docs/STATUS.md` rows for the handoff (HTTP transport, receipt, link-back); a new `docs/DECISIONS.md` entry (next free D-number — check master AND open PRs) recording: transport HTTP per HR §9, link-back via `sources`, only-if-null, internal-api-key kept.

- [ ] Step 1: implementer edits + commit `chore: switch the HR handoff on for staging (HTTP to hr-dev, ONBOARD subscription) [agentflow-8pqy]`.
- [ ] Step 2 (controller, after PR merge): add `RECRUIT_HR_HANDOFF_INTERNAL_API_KEY` (random 48 hex) to staging `recruit-svc-secret`; create `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT` on topic `HR_ASSOCIATE_ONBOARD` in `lenderrate-master` (`--ack-deadline 60 --expiration-period never`) and grant the recruit-be workload SA `roles/pubsub.subscriber` on it; FF-push master → `staging`; confirm pod healthy, cron job registered (log line), handler subscribed.
- [ ] Step 3 (controller): end-to-end on staging with one test candidate — set 1-1 outcome, satisfy readiness, `POST /candidates/{id}/hr-handoff`; within one tick the outbox row is `SENT` with `hr_draft_id`; confirm the draft in HR staging (`GET` HR draft via HR staging UI or DB, read-only); report.
