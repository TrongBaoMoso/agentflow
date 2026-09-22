# recruit-be — Capability Inventory

**Repo:** `recruit-be` (LoanFactory Loan Officer Recruiting backend), Java 21 / Spring Boot.
**Read at:** `origin/master` = `a689126` ("Merge pull request #389 … pending-outcome"), 2026-09-22.
**Method:** read of source, migrations, Helm values and `git log`. Every non-trivial claim carries `file:line`.

> **Headline.** The domain model, the API surface and the pipeline mechanics are substantial and
> carefully built. What is *not* built is the outbound communication half: **recruit-be cannot send
> an email, an SMS or a message of any kind.** There is no mail sender, no SMS client, no template
> renderer at send time. Every "send" in this service is either a row in an outbox that nothing
> delivers in production, a log line from a stub, or a manual button a human presses to record that
> something happened elsewhere. On **production**, almost every cross-service integration is dark by
> configuration: the follow-up bridge, omni cast/call-mirror, packs writeback, the webinar read, the
> live conversation stream, HR handoff and user-service sync are all off or unconfigured.

---

## 1. Architecture map

### 1.1 Modules

One Gradle module, `rootProject.name = "recruit-be"` (`settings.gradle.kts:1`). Code is organised by
feature slice under `src/main/java/com/loanfactory/recruit/`:

| Package | What it owns |
|---|---|
| `candidate` | The hub: `CandidateEntity`, activities, stage/owner history, change log, call-outcome wizard, batch claim |
| `inbox` | HOT / COLD **unclaimed-lead queues** (not a message inbox — see §4n) |
| `dashboard` | `/today` queue, pipeline KPI cross-tab |
| `report` | Per-recruiter report, recruiter×month pivot |
| `followup` | gRPC/REST bridge to the separate `followup-be` service + denorm writer |
| `offer` | Offer request → approve → send → signed, fee status, offer ledger |
| `checklist` | Department checklist items + templates (S6/S7 onboarding work) |
| `licensing` | Per-state sponsorship, licensing state rules, sponsorship backfill |
| `label`, `savedfilter`, `settings`, `suppression`, `template` | Supporting catalogs |
| `rbac` | App-owned roles/grants/permissions + central directory client |
| `audit` | One UNION read over seven ledgers |
| `moso`, `modex`, `webhook` | Inbound ingest from the legacy systems |
| `omni`, `conversation`, `candidateevents`, `hostsubjects`, `zoomlink` | omni-service conversation integration |
| `sequence` | Cadence/auto-send engine (sender is a stub) |
| `packswriteback`, `hrhandoff`, `userservicesync` | Three transactional outboxes, all dark |
| `dedup`, `referral` | Merge duplicates; referral-attribution ledger |
| `webinar` | Read-only webinar list proxied from packs |

### 1.2 Layering

`Controller → Facade → Service → tera-core generic EntityService + *Slices (JPA Specifications)`.
There are almost no Spring Data repositories — the only `repository/` package is
`conversation/repository/ConversationGrantSlices.java`. Example:
`CandidateController` holds only `private final CandidateFacade candidateFacade`
(`candidate/controller/CandidateController.java:55`); `CandidateFacadeImpl` composes
`candidateService`, `batchClaimService`, `activityService`, `followUpService`, `accessControlService`,
`suppressionService` (`candidate/facade/impl/CandidateFacadeImpl.java:63-70`); persistence goes
through tera-core's generic `EntityService` (53 files, e.g. `modex/service/impl/ModexSyncServiceImpl.java:23`).

### 1.3 Entrypoints

- HTTP on port **8090** (`application.yml:2`); main class `RecruitApplication` importing
  `com.loanfactory.core.AutoConfiguration` (`RecruitApplication.java:8-13`).
- **gRPC** server on 9090 — inbound "follow-up host-sync" push receiver, only when
  `recruit.followup.server-enabled=true` (`application.yml:170-171`, `followup/grpc/FollowUpGrpcServerLifecycle.java`).
- **Pub/Sub subscriber** `omni-inbound-reply.recruit-be` (`omni/inbound/OmniInboundMessageHandler.java:73-86`).
- **Webhook listeners** via tera-core's `WebhookController` at `/v1/webhook/{service}/listener`,
  plus the token-gated internet-facing alias `/public/v1/webhook/{service}/listener`
  (`moso/controller/PublicWebhookController.java:59-97`).
- **SSE** stream `/api/v1/candidates/{id}/events/subscribe` (`candidateevents/controller/CandidateEventsController.java:47-56`).

### 1.4 Persistence

Postgres. **Flyway is the sole schema owner**: `ddl-auto: validate` (`application.yml:53`), so an
entity field without a migration fails boot. 96 migration files `V001`→`V095` (gap at V048/V049),
39 application tables + 2 tera-core tables, 23 foreign keys (`docs/SCHEMA.md:24-26`).

### 1.5 Deployment

GKE via Helm (`deploy/`). **Merging IS the deploy** (`DEPLOY.md:1-13`): `feature/*` → PR → `master`
(deploys staging, cluster `moso-kube`, project `lenderrate-master`) → PR → `production` (deploys prod,
cluster `moso-gke`, project `lender-rate`) (`DEPLOY.md:33-40`). Images
`…/lenderrate-master/startup-repo/…/recruit-be:staging` (`deploy/configs/values-sta.yaml:8`) and
`…/lender-rate/moso-svc-repo/…/recruit-be:production` (`deploy/configs/values-prod.yaml:8`).
Runtime `eclipse-temurin:21-jre-alpine` (`Dockerfile:1`). Staging 1 replica (1–2 HPA), prod 2 (2–3).
Rollback = revert-and-merge or manual `kubectl set image` — there is no branch pointer to move
(`DEPLOY.md:44-49`).

### 1.6 Outbound calls

Only **five** HTTP clients exist in the whole service:
`webinar/WebinarClient.java`, `packswriteback/PacksWritebackClient.java`,
`omni/OmniCallMirrorClient.java`, `omni/OmniCastPushClient.java`,
`userservicesync/NoOpUserServiceSyncClient.java` (which makes no call at all), plus
`rbac/directory/CentralDirectoryClient.java` and `followup/service/impl/FollowUpCommandClientImpl.java`
using tera-core's `HttpRequestCall`. Transports in use: REST, gRPC (followup-be), Pub/Sub
(omni inbound; HR handoff publish).

---

## 2. Domain model

### 2.1 `candidates` — `candidate/entity/CandidateEntity.java`

The hub. **Every profile field is nullable by design** — required-ness lives in `stage_requirements`
and binds only at a stage transition (`CandidateEntity.java:33-35`).

There is **no separate "Interested LO" vs "Recruited LO" entity.** One row carries the person from
first touch to joined Loan Officer; the distinction is `stage` (S0…S7) plus `status`. The legacy
MOSO "ILO" population arrives as `source = IMPORT` and is ~96.8% of the store
(`inbox/service/impl/InboxServiceImpl.java:89-91`). A candidate who joins gets `accountId` set —
but **nothing writes that column today** (`CandidateEntity.java:121-124`: *"measured 09/09: nothing
writes this column… the 'periodic job' this javadoc has always promised does not exist"*).

Key fields:

| Field | Meaning |
|---|---|
| `stage` / `status` / `source` | The three enums below. `CandidateEntity.java:49-59` |
| `ownerId` | Recruiter. **Every write goes through the ownership ledger** (`:129-131`) |
| `accountId` | Central *user_id* after S7 — currently NULL everywhere (`:91-127`) |
| `mergedIntoId` | Set on the loser of a merge (`:133-135`) |
| `email`/`emailNormalized`, `phone`/`phoneNormalized` | Identity + dedup keys |
| `nmlsId`, `companyNmls`, `licensedStates`, `sponsorStates` (jsonb) | Licensing identity |
| `careerProduction`, `units12mo` | Modex-**verified** 12-month figures (`:232-238`) |
| `selfReportedVolume`, `selfReportedClosedLoans`, `selfReportedCompany` | Parsed out of `mosoNote`, deliberately kept apart from the verified twins (`:172-194`) |
| `mosoNote` | LORecruiting `note` verbatim — the only carrier of company/volume for after-party leads (`:161-170`) |
| `referredSource` / `referredSection` | Self-reported "how did you hear about us" (`:196-202`) |
| `nurtureUntil` | NURTURE wake date; the row re-enters Today that day (`:302-304`) |
| `noAnswerStreak` | 1-based index into the `followup.no_answer_retry_days` ladder (`:306-326`) |
| `nextFollowUpAt`, `followUpIds` (jsonb) | **Denormalised from followup-be** via gRPC push. Sole source — V055 dropped the local columns. NULL everywhere the bridge is dark, i.e. all of production (`:346-387`) |
| `lastOutboundAt`, `lastOutboundSortKey` (generated) | Neglect signal; inbound replies deliberately do not move it (`:389-404`) |
| `searchKey` (generated), `labelKey` | Free-text search and label filtering without joins (`:406-427`) |
| `sourcedAt`, `lastHandRaisedAt`, `lastHandRaiseSource`, `handRaiseSortKey` (generated) | The SLA clock anchors (`:437-505`) |
| `accessGrantedAt` | When the LO granted Loan Factory access on NMLS — per-PERSON, not per-state (`:458-471`) |
| `legacyKey`, `legacyRef` (jsonb), `importBatchId` | MOSO provenance / import idempotency |
| `recruiterLockedFields` (jsonb) | **Per-field permanent freeze**: once a recruiter edits a MOSO-owned field, MOSO can never overwrite it again (`:512-526`) |
| `handedOffAt` | HR-handoff idempotency memo, set once on first human S6 (`:528-539`) |
| `pendingCallAt` / `pendingCallActorId` | The D51 "you dialled and never logged an outcome" reminder, moved from browser `sessionStorage` to the server in V095 (`:541-566`) |
| `nextStepLocation`, `nextStepSendDraft` (jsonb) | Meet-1-1 location / scheduled SEND_INFO draft — local columns *because the follow-up bridge is dark* (`:64-86`) |
| `productionBand`, `selfReportedVolumeBand`, `noAnswerRetryExhausted` | `@Transient`, computed at read |

### 2.2 Status / stage / pipeline enums — every value

**`CandidateStage`** (`candidate/model/CandidateStage.java:4-6`) — 8 values, no labels in code:
`S0, S1, S2, S3, S4, S5, S6, S7`.
Semantics come from the spec (`/Users/apple/Projects/agentflow/docs/lo-recruiting-e2e-flow.md:124-200`):
S0 = stock/unclaimed · S1 = New (claimed, not yet touched) · S2 = Contacted (one-way) ·
S3 = Engaged (two-way, qualify; exit gate = NMLS) · S4 = Verified/Evaluation (pre-offer gate) ·
S5 = Offer · S6 = Onboarding (Joined; entry gate = `signed + paid`, computed) ·
S7 = Onboarded/Active (recruiting ends).

**`CandidateStatus`** (`candidate/model/CandidateStatus.java:4-45`) — 5 values:
- `ACTIVE`
- `NURTURE` — parked with a wake date; re-enters Today on its own
- `DORMANT` — parked, no automatic contact, **no outcome recorded**; only writer today is the MOSO
  migration for legacy `hiatus`/`no_response` rows set by a cron, not by a human (`:6-33`)
- `ARCHIVED` — an outcome was recorded (denied, not interested, wrong info)
- `BLOCKED` — **reserved, no writer** (`:35-45`). The three call sites that read it were dead code
  and were removed; blacklist is enforced at the outbound gate instead.

**`CandidateSource`** (`candidate/model/CandidateSource.java:12-13`) — 9 values:
`MODEX, IMPORT, MANUAL, WEB_FORM, WEBINAR, EVENT_RSVP, REFERRAL, FB_ADS, OTHER`.
HOT vs COLD is decided by the `hot.sources` setting, never by the enum alone (`:3-5`).

**`OwnerChangeReason`** (`candidate/model/OwnerChangeReason.java`) — 7:
`CLAIM, AUTO_CLAIM, TRANSFER, IMPORT, CREATE, MERGE, RELEASE`.

**`ActivityType`** (`candidate/model/ActivityType.java:5`) — 6: `CALL, SMS, EMAIL, NOTE, MEETING, SYSTEM`.
**`ActivityDirection`** — 2: `INBOUND, OUTBOUND`.

**`CallAttitude`** (`candidate/model/CallAttitude.java:10`) — 4: `INTERESTED, NEUTRAL, NO_ANSWER, NOT_INTERESTED`.
**`FollowUpKind`** (`candidate/model/FollowUpKind.java:11`) — 5: `CALL_NEXT, SEND_INFO, WEBINAR, MEET_ONE_ON_ONE, RETRY_NO_ANSWER` (the last is system-set only).
**`ClaimOutcome`** — 3: `CLAIMED, ALREADY_OWNED, SKIPPED`. **`BulkOutcome`** — 3: `OK, SKIPPED, FAILED`.
**`ProductionBand`** (`candidate/model/ProductionBand.java:40-46`) — 5: `UNDER_500K, FROM_500K_TO_1M, FROM_1M_TO_3M, FROM_3M_TO_5M, OVER_5M`. (Masking was **removed** — see §5 recent work.)

**`OfferStatus`** (`offer/model/OfferStatus.java:9`) — 7: `DRAFT, PENDING_APPROVAL, APPROVED, SENT, SIGNED, DECLINED, EXPIRED`.
**`OfferEventType`** — 9: `REQUESTED, APPROVED, DECLINED, SENT, SIGNED, FEE_PAID, FEE_WAIVED, FEE_WAIVE_REQUESTED, IMPORTED`.
**`FeeStatus`** — 3: `PENDING, PAID, WAIVED`. **`AgreementStatus`** — 3: `NOT_SENT, SENT, SIGNED`.
**`ApprovalMode`** — 3: `RULE_BASED, RECRUITER_DECIDES, ALWAYS_REVIEW`. **`ApprovalDecision`** — 2: `AUTO, REVIEW`.

**`ChecklistItemStatus`** (`checklist/model/ChecklistItemStatus.java:5`) — 5: `OPEN, IN_PROGRESS, DONE, BLOCKED, NA`.
**`ChecklistTemplateTrigger`** — 3: `ON_ENTER_S6, PER_SPONSOR_STATE, ON_100_ONBOARDED`.
**`Department`** (`checklist/model/Department.java:10-12`) — 5: `HR, LICENSING, ONBOARDING, ACCOUNTING, IT`.
Critically: *"it is a label on WORK, not on PEOPLE. The app has no table of staff and no notion of
'which department does this user belong to'"* (`:3-8`).

**`SponsorshipStatus`** — 5: `REQUESTED, IN_PROGRESS, SPONSORED, BLOCKED, WITHDRAWN`.
**`SponsorshipSource`** — 3: `SELF_REPORTED, FEED_CONFIRMED, LEGACY_IMPORT`.
**`LicensingRuleType`** — 5: `DISTANCE_LIMIT, COURSE_REQUIRED, BRANCH_REQUIRED, CONFIRMATION_REQUIRED, AUTO_ATTRIBUTE`.

**`SequenceEnrollmentStatus`** — 3: `ENROLLED, STOPPED, COMPLETED`.
**`SequenceStopReason`** — 6: `REPLIED, BOOKED, SUPPRESSED, MANUAL, DORMANT` (+ implicit).
**`SequenceExecutionStatus`** — 4: `PENDING, SENT, SKIPPED, FAILED`.
**`SequenceEnrollmentOutcome`** — 3: `SENT, NOT_SENT, NOT_CLAIMED`.

**`TemplateType`** — 3: `CALL_SCRIPT, EMAIL, SMS`. **`TemplateStatus`** — 4: `DRAFT, IN_REVIEW, ACTIVE, RETIRED`. **`TemplateScope`** — 2: `PERSONAL, TEAM`.
**`SuppressionType`** — 2: `STOP_SMS, BLACKLIST`. **`SuppressionChannel`** — 3: `SMS, CALL, EMAIL`. **`SuppressionIdentifierType`** — 3: `PHONE, EMAIL, NMLS`.
**`LabelKind`** — 2: `USER, SYSTEM`.
**`ReferralAttributionReason`** — 6: `COMPANY_LEAD, REFERRED, CLAIM, TRANSFER, IMPORT, ADMIN_OVERRIDE`.
**`ReferralHoldState`** — 5: `HELD_BY_REFERRER, HELD_COMPANY_WORKED, HELD_WINDOW_OPEN, OPEN_IMPORT, OPEN_LAPSED`.
**`CandidateCastRole`** (`omni/CandidateCastRole.java:33-53`) — 5: `RECRUITER, HIRING_MANAGER, ONBOARDING, LICENSING` (internal), `CANDIDATE` (external).
**`HrHandoffStatus` / `PacksWritebackStatus` / `UserServiceSyncStatus`** — `PENDING, SENT, (SKIPPED,) DEAD_LETTER`.
**`PacksWritebackKind`** — 3: `PROFILE_WRITEBACK, INVITE, WEBINAR_REGISTRATION`.
**`WebhookProcessingStatus`** — 4: `RECEIVED, PROCESSED, FAILED, SKIPPED`. **`SignatureState`** — 4: `NOT_CHECKED, NOT_APPLICABLE, VALID, INVALID`.
**`GrantChangeReason`** — 3: `SET, DELETE, PRE_LEDGER`. **`DuplicateScope`** — 2: `STOCK, RECENT`.

### 2.3 Owner / assignee / role concepts

- **One owner field** on a candidate: `candidates.owner_id`, a recruiter account id.
- **`candidate_owner_history`** (`candidate/entity/OwnerHistoryEntity.java`, V011) — append-only
  ledger; every write to `owner_id` appends a row, importer included. `to_owner` nullable = released
  back to the pool (V064). Referee for "who claimed first" disputes.
- **`checklist_items.assignee_id`** (`checklist/entity/ChecklistItemEntity.java:49-51`) — nullable;
  an item can be addressed to a *department* before a person picks it up. **Nothing in the codebase
  ever sets it** (see §4t).
- **Roles are RBAC grants, not org structure.** Nine roles (§3.3): `ADMIN, MANAGER, RECRUITER, HR,
  LICENSING, ONBOARDING, ACCOUNTING, LO_SUPPORT, OFFICER_RECRUITER`. `LO_SUPPORT` (HOT queue) and
  `OFFICER_RECRUITER` (COLD queue) carry **identical permission sets** and differ only in workspace
  identity (`V036__seed_kho_roles.sql:3-18`). There is no `IT` role row — `CHECKLIST_TEMPLATE_MANAGE_IT`
  is reachable only through ADMIN's wildcard.
- `rbac_roles.row_scope` and `.field_masks` are mapped but **never read by any code path**
  (`V035__hollow_table_warnings.sql:35-40`) — per-row scoping does not exist.

### 2.4 Follow-up / task / reminder / note / label

- **Follow-ups live in a different service.** There is no local follow-up table any more — V055
  dropped `follow_up_kind`, `follow_up_due_at`, `follow_up_time`. `candidates.next_follow_up_at` and
  `follow_up_ids` are denormalised copies pushed by `followup-be` over gRPC
  (`CandidateEntity.java:346-387`).
- **Checklist items** (`checklist_items`, V001, first entity added by agentflow-lems) are the only
  local "task" table: `candidate_id, department, assignee_id, title, status, state, rule_code,
  template_code, due_at, completed_by`.
- **Reminders:** `candidates.pending_call_at` (V095) is the only true reminder held locally.
- **Notes** are `ActivityType.NOTE` rows on `activities` with `internal = true`.
- **Labels:** `labels` catalog (`name, nameKey, kind USER|SYSTEM, color, description`) + `candidate_labels`
  join table + a denormalised `candidates.label_key` projection `|a|b|` rebuilt in the same
  transaction on every attach/detach (`CandidateEntity.java:417-427`). Many-to-many, so **multiple
  user-created labels per candidate are supported**. Note: `candidate_labels` declares **no foreign
  keys** although both targets are in this database — *"Looks like an oversight rather than a
  decision"* (`docs/SCHEMA.md`, soft-reference table).

### 2.5 Audit

Seven ledgers, read through one UNION (`audit/service/impl/AuditServiceImpl.java:25-40`), event types
`OWNER, STAGE, SETTING, MERGE, GRANT, OFFER, CONVERSATION_GRANT, CONVERSATION_REVOKE`:

| Table | Entity | Contents |
|---|---|---|
| `candidate_owner_history` | `OwnerHistoryEntity` | from/to owner, reason, actor |
| `stage_history` | `StageHistoryEntity` | from/to stage, reason, actor, `override_gate`, `overridden_fields` (jsonb) |
| `candidate_change_log` | `CandidateChangeLogEntity` (V071) | one row per changed FIELD, grouped by `change_set_id`. **PII default-deny**: a PII field records only that it changed, `value_logged = false`, both value columns null (`:24-29`) |
| `recruit_settings` | `RecruitSettingEntity` | effective-dated, append-only |
| `candidate_merges` | `CandidateMergeEntity` | survivor/loser + `field_survivorship` |
| `rbac_grant_history` | `GrantHistoryEntity` | from/to roles + overrides, reason, actor |
| `offer_history` | `OfferHistoryEntity` | offer event, from/to status, reason, actor |
| `candidate_conversation_grants` | `ConversationGrantEntity` | join/leave of a conversation |

`tera.audit.enabled: false` app-wide (`application.yml:99`) — the tera-core `audit_outbox` table
exists but **nothing writes to it**.

---

## 3. API surface

No `@RequiresPermissions`, `@PreAuthorize`, `@Secured` or Spring Security filter chain exists
anywhere in this codebase. **All authorization is imperative**: controller or facade bodies call
`AccessControlService.require(...)` / `.hasPermission(...)`. There is no AOP backstop; a forgotten
call is silent.

### 3.1 Candidates — `candidate/controller/CandidateController.java` (`/api/v1/candidates`)
Gating delegated to `CandidateFacadeImpl` (`:74-257`).

| Method | Path | Permission | Purpose | Line |
|---|---|---|---|---|
| POST | `/` | `CANDIDATE_CREATE` | Create candidate (manual "Add lead") | :57 |
| GET | `/` | `CANDIDATE_READ` | List/search via tera-core filter DSL | :63 |
| GET | `/{id}` | `CANDIDATE_READ` | Get one | :70 |
| PUT | `/{id}` | `CANDIDATE_UPDATE` | Update profile (writes change log + freeze set) | :75 |
| POST | `/{id}/claim` | `CANDIDATE_CLAIM` | Take ownership | :82 |
| POST | `/batch-claim` | `CANDIDATE_CLAIM` | Claim next N (`today.batch_claim_size`, clamped by `capacity.max_open_candidates`) | :92 |
| POST | `/{id}/transfer` | `CANDIDATE_TRANSFER` (skipped if own) | Hand off | :98 |
| POST | `/bulk-transfer` | `CANDIDATE_TRANSFER` | Bulk hand-off | :108 |
| POST | `/bulk-archive` | `CANDIDATE_ARCHIVE` | Bulk archive, reason required | :114 |
| POST | `/{id}/transition` | `CANDIDATE_TRANSITION` + `CANDIDATE_OVERRIDE_GATE` when bypassing | Stage move | :120 |
| GET | `/{id}/stage-history` | `CANDIDATE_READ` | Stage history | :126 |
| POST | `/{id}/activities` | `ACTIVITY_LOG` | Log a touch (auto-claims if unowned) | :131 |
| POST | `/{id}/call-outcome` | `ACTIVITY_LOG` | The call-outcome wizard | :139 |
| GET | `/{id}/suppressions` | `CANDIDATE_READ` | Contact-block matches | :146 |
| GET | `/{id}/activities` | `ACTIVITY_READ` | Paginated activity list | :151 |
| POST | `/{id}/conversation/ensure-cast` | **read-only gate** — reuses `get(id)`'s `CANDIDATE_READ` | Bootstrap omni cast. **Flag: a read permission gating a state-mutating side effect** | :162 |
| POST | `/{id}/revive` | `CANDIDATE_ARCHIVE` | DORMANT → ACTIVE | :172 |

### 3.2 Follow-ups — `candidate/controller/CandidateFollowUpController.java` (`/api/v1/candidates/{id}/follow-ups`)
Entirely backed by `followup-be`; **503s when the bridge is unconfigured, which is every production pod.**

| Method | Path | Permission | Line |
|---|---|---|---|
| GET | `/` (`?status=`) | `CANDIDATE_READ` | :36 |
| POST | `/` | `ACTIVITY_LOG` | :42 |
| PATCH | `/{fid}` | `ACTIVITY_LOG` | :49 |
| POST | `/{fid}/done` | `ACTIVITY_LOG` | :55 |

### 3.3 Queues, dashboard, reports

| Method | Path | Permission | Purpose | File:line |
|---|---|---|---|---|
| GET | `/api/v1/inbox/hot` | `CANDIDATE_READ` | Unclaimed hand-raised leads + computed `sla_due_at` | `inbox/controller/InboxController.java:25` |
| GET | `/api/v1/inbox/cold` | `CANDIDATE_READ` | Unclaimed cold pool, paginated, size-clamped | `:38` |
| GET | `/api/v1/today` | `CANDIDATE_READ` | Caller's Today queue | `dashboard/controller/DashboardController.java:23` |
| GET | `/api/v1/kpi/pipeline` | `CANDIDATE_READ` | stage×status cross-tab, zero-filled | `:30` |
| GET | `/api/v1/reports/recruiters` | `CANDIDATE_READ` (+ `REPORT_TEAM` widens rows) | Per-recruiter KPIs | `report/controller/ReportController.java:28` |
| GET | `/api/v1/reports/pivot` | same | Recruiter × month pivot | `:37` |

### 3.4 Offers — `offer/controller/OfferController.java`

| Method | Path | Permission | Purpose | Line |
|---|---|---|---|---|
| POST | `/api/v1/candidates/{cid}/offers` | `OFFER_REQUEST` | Request offer (may auto-approve per D64 rule) | :39 |
| GET | `/api/v1/candidates/{cid}/offers` | `OFFER_READ` | List | :47 |
| GET | `/api/v1/candidates/{cid}/invite-status` | `OFFER_READ` | Invite progress + SLA breach flag | :58 |
| POST | `/api/v1/offers/{id}/approve` | `OFFER_APPROVE` | Approve (also converts a waive ASK into a real waive) | :64 |
| POST | `/api/v1/offers/{id}/decline` | `OFFER_REQUEST` | Decline | :70 |
| POST | `/api/v1/offers/{id}/send` | `OFFER_APPROVE` | APPROVED→SENT + packs INVITE outbox row | :77 |
| POST | `/api/v1/offers/{id}/signed` | `OFFER_APPROVE` | **Manual** mark-signed. Javadoc calls it a "Stub for the e-sign webhook" but it performs a full real transition (`OfferServiceImpl.java:356-364`) | :84 |
| POST | `/api/v1/offers/{id}/fee-paid` | `OFFER_APPROVE` | **Manual** mark-paid; same "Stub" mislabel (`OfferServiceImpl.java:368-376`) | :91 |
| POST | `/api/v1/offers/{id}/waive-fee` | `OFFER_APPROVE` | Waive | :97 |

### 3.5 Checklist / licensing

| Method | Path | Permission | Purpose | File:line |
|---|---|---|---|---|
| GET | `/api/v1/candidates/{cid}/checklist-items` | `CHECKLIST_READ` | Every department's work on one candidate | `checklist/controller/ChecklistController.java:36` |
| GET | `/api/v1/checklist/departments/{dept}/items` | `CHECKLIST_READ` | Department queue | `:42` |
| GET | `/api/v1/checklist/departments/{dept}/candidates` | `CHECKLIST_READ` | Candidate ids with open work (D76) | `:49` |
| GET/POST/PUT/DELETE | `/api/v1/admin/checklist/templates[/{id}]` | `CHECKLIST_READ` read; `CHECKLIST_TEMPLATE_MANAGE_<DEPT>` write | Template CRUD | `checklist/controller/ChecklistTemplateAdminController.java:33-52` |
| GET/POST/PUT/DELETE | `/api/v1/admin/licensing/state-rules[/{id}]` | `LICENSING_RULE_MANAGE` | Per-state licensing rule CRUD | `licensing/controller/LicensingStateRuleAdminController.java:33-51` |
| POST | `/api/v1/admin/sponsorships/backfill` | `IMPORT_RUN` | Sponsorship backfill intake | `licensing/controller/SponsorshipBackfillController.java:32` |

**Note the gap:** the checklist surface is **read-only for items**. There is no endpoint, service
method or code path that sets `status = DONE` or writes `completed_by` (§4t).

### 3.6 Conversation / omni

| Method | Path | Permission | Purpose | File:line |
|---|---|---|---|---|
| POST | `/api/v1/candidates/{cid}/conversation/join` | `ACTIVITY_READ` (+`REPORT_TEAM` scoping) | Manager joins a conversation | `conversation/controller/ConversationAccessController.java:38` |
| GET | `…/conversation/participants` | same | List participants | `:50` |
| POST | `…/conversation/leave` | same | Leave self | `:70` |
| DELETE | `…/conversation/participants/{userId}` | same | Remove someone | `:82` |
| GET | `/api/v1/candidates/{id}/events/subscribe` | via `CandidateFacade.get(id)` | SSE live tick. 503 when Redis sentinel unconfigured | `candidateevents/controller/CandidateEventsController.java:47` |

### 3.7 Catalogs and admin

| Method | Path | Permission | File:line |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/v1/labels[/{id}]` | `CANDIDATE_READ` / `CANDIDATE_UPDATE` / `LABEL_MANAGE` | `label/controller/LabelController.java:57-80` |
| GET/POST/DELETE | `/api/v1/candidates/{cid}/labels[/{lid}]`, `GET /api/v1/candidate-labels` | `CANDIDATE_READ` / `CANDIDATE_UPDATE` | `:82-109` |
| GET | `/api/v1/templates?type=` | `CANDIDATE_READ` | `template/controller/TemplateController.java:41` |
| GET | `/api/v1/templates/manage` | `TEMPLATE_CREATE` | `:49` |
| POST/PUT | `/api/v1/templates[/{id}]` | `TEMPLATE_CREATE` (+`TEMPLATE_APPROVE` to hot-edit) | `:56,:63` |
| POST | `/api/v1/templates/{id}/{submit,approve,reject,retire}` | `TEMPLATE_CREATE` / `TEMPLATE_APPROVE` | `:74-101` |
| GET/POST/PUT/DELETE | `/api/v1/saved-filters[/{id}]` | `CANDIDATE_READ` | `savedfilter/controller/SavedFilterController.java:38-56` |
| POST/GET/DELETE | `/api/v1/suppressions[/{id}]` | `SUPPRESSION_MANAGE` | `suppression/controller/SuppressionController.java:35-52` |
| GET/PUT | `/api/v1/admin/settings[/{key}][/history]` | `SETTINGS_MANAGE` | `settings/controller/SettingsController.java:35-53` |
| GET/PUT/DELETE | `/api/v1/admin/zoom-links[/{userId}]` | `SETTINGS_MANAGE` | `zoomlink/controller/RecruiterZoomLinkController.java:47-75` |
| GET | `/api/v1/admin/audit-events` | `AUDIT_VIEW` (`hasPermission`, real answer) | `audit/controller/AuditController.java:28` |
| GET | `/api/v1/duplicates`, POST `/api/v1/duplicates/merge` | `CANDIDATE_READ` / `CANDIDATE_MERGE` | `dedup/controller/DedupController.java:36,:57` |
| POST | `/api/v1/admin/import/moso` | `IMPORT_RUN` | `moso/controller/MosoImportController.java:29` |
| GET | `/api/v1/users` | `CANDIDATE_READ` | Owner picker (people holding a grant) | `rbac/controller/UserDirectoryController.java:33` |
| GET | `/api/v1/webinars` | `ACTIVITY_LOG` | Upcoming sessions, proxied from packs | `webinar/WebinarController.java:32` |
| POST/GET | `/api/v1/referral-attribution/{cid}[/override]` | `REFERRAL_ATTRIBUTION_OVERRIDE` / `_READ` | `referral/controller/ReferralAttributionController.java:39,:49` |
| POST | `/api/v1/candidates/{cid}/sequences/{sid}/enroll`, `/api/v1/sequence-enrollments/{id}/stop` | `SEQUENCE_MANAGE` | `sequence/controller/SequenceEnrollmentController.java:34,:42` |
| GET | `/api/v1/candidates/{cid}/sequence-enrollments` | `SEQUENCE_READ` | `:49` |

### 3.8 RBAC admin — `rbac/controller/RbacAdminController.java` (`/api/v1/admin/rbac`)
All `gate()` → `RBAC_MANAGE`, except one.

`GET /roles` (:44) · `GET /directory` (:61) · `GET /grants` (:69) · `PUT /grants/{userId}` (:76) ·
`POST /grants/bulk` (:90) · `DELETE /grants/{userId}` (:101) · `GET /grants/{userId}/history` (:111) ·
**`GET /me` (:118) — no gate at all, while every sibling calls `gate()`.** It returns only the
caller's own effective permission set, so it looks benign, but it is a genuine outlier.

### 3.9 Machine-to-machine (no user identity; shared-secret headers)

| Method | Path | Auth | Purpose | File:line |
|---|---|---|---|---|
| POST | `/public/v1/webhook/{service}/listener` | `x-api-key` == `moso.webhook.api-key`; **fail-closed on blank** | Bearer-free alias for packs/MOSO pushes | `moso/controller/PublicWebhookController.java:88` |
| POST | `/v1/webhook/{service}/listener` | tera-core `WebhookController`, in-cluster | MOSO + Modex listeners | `moso/MosoWebhookHandler.java`, `modex/ModexWebhookHandler.java` |
| GET | `/public/api/v1/comm/host/subjects/{type}/{id}/active`, `…/resolve`, `…/sender-identity` | `X-Internal-Request` + `Access-Token` == `recruit.host-subjects.access-token`; fail-closed | omni inbound-routing SPI | `hostsubjects/controller/HostSubjectsController.java:67-91` |
| POST | `/api/v1/sequences/internal/tick` | `x-service-key`; fail-closed | Sequence poller | `sequence/controller/SequenceInternalController.java:89` |
| POST | `/api/v1/packs-writeback/internal/tick` | `x-service-key`; fail-closed | packs relay | `packswriteback/controller/PacksWritebackInternalController.java:53` |
| POST | `/api/v1/hr-handoff/internal/tick` | `x-service-key`; fail-closed | HR handoff relay | `hrhandoff/controller/HrHandoffInternalController.java:53` |
| POST | `/api/v1/user-service-sync/internal/tick` | `x-service-key`; fail-closed | Identity sync relay (no-op) | `userservicesync/controller/UserServiceSyncInternalController.java:56` |

`SequenceInternalController.java:24-36` records, measured on staging 2026-09-07, that api-gateway-v2
forwards `/recruit-svc/**` wholesale with no path filter — so **any authenticated platform account**
can reach these `/internal/**` paths past the gateway. The per-endpoint shared secret is the only
real gate.

### 3.10 Endpoints that contradict their name or look half-finished

1. **`/api/v1/inbox/*` is not a message inbox.** It is the unclaimed-lead queue (HOT = hand-raised,
   COLD = everything else). No message ever appears there (`inbox/service/impl/InboxServiceImpl.java:112-230`).
2. **`POST /offers/{id}/signed` and `/fee-paid` are labeled "Stub"** in the controller javadoc
   (`OfferController.java:83,:90`) but perform full real state transitions. The "stub" is the
   *webhook* that should be calling them, not the endpoint.
3. **`POST /candidates/{id}/conversation/ensure-cast`** mutates remote state behind a read permission.
4. **`GET /api/v1/admin/rbac/me`** has no gate where all siblings do.
5. **Stale javadoc in two controllers** asserts `PublicWebhookController` "accepts every request
   while its key is unset" (`HostSubjectsController.java:36-38`, `SequenceInternalController.java:38-40`) —
   that was fixed by agentflow-8kn3 and `PublicWebhookController.java:93` now fails closed. All
   three agree in code; the comments actively lie.

---

## 4. Feature capability checklist

**Score: 10 IMPLEMENTED · 14 PARTIAL · 4 ABSENT** (28 items).

---

**a. Lead intake from a public landing page / application form — `PARTIAL`**

recruit-be has **no public application-form endpoint of its own**. The landing pages
(`/register-loan-officer`, after-party RSVP, "Refer a LO") post to MOSO/packs; packs' task-queue then
pushes rows into recruit-be at `POST /public/v1/webhook/{service}/listener`, authenticated by a shared
`x-api-key`, fail-closed on blank (`moso/controller/PublicWebhookController.java:88-97`). Those rows are
mapped and upserted by `moso/MosoWebhookHandler.java` → `moso/service/impl/MosoRowUpsertServiceImpl.java`.
A human can also type a lead in via `POST /api/v1/candidates` (`candidate/controller/CandidateController.java:57`,
`candidate/model/request/CreateCandidateRequest.java:16` — "Manual 'Add lead'").
**Missing:** any first-party form endpoint; recruit-be cannot receive an application directly, so the
whole intake path depends on MOSO/packs staying alive.

---

**b. Owner assignment — manual claim — `IMPLEMENTED`**

`POST /candidates/{id}/claim` (`candidate/controller/CandidateController.java:82-85`) →
`CandidateServiceImpl.claimIfUnowned` (`candidate/service/impl/CandidateServiceImpl.java:287`),
which is a race-safe `UPDATE … WHERE owner_id IS NULL` (no `@Version` on the entity). Losing the race
returns the real current owner, never silence. Batch: `POST /candidates/batch-claim`
(`:92`) → `BatchClaimServiceImpl`, size = `today.batch_claim_size`, clamped against
`capacity.max_open_candidates` (`candidate/service/impl/BatchClaimServiceImpl.java:100`).
Transfer with its own permission: `POST /{id}/transfer` and `/bulk-transfer` (`:98,:108`).
Every write appends to `candidate_owner_history`.

---

**c. Owner assignment — automatic (round-robin, workload-based, capacity-based) — `PARTIAL`**

What exists: **auto-claim on interaction** (D43, "interact = assign"). Logging an activity with a
direction on an unowned ACTIVE/NURTURE candidate makes the logger the owner
(`candidate/service/impl/ActivityServiceImpl.java:245`, reason `AUTO_CLAIM`,
`CandidateServiceImpl.java:281-282`). A **capacity ceiling** exists but only as a clamp on a human's
batch-claim press, not as a distribution rule (`BatchClaimServiceImpl.java:100`).

**Missing:** there is no round-robin, no least-loaded, no workload-balanced, no territory or
skill-based distribution. `grep -rniE "roundRobin|round.robin|loadBalance|leastLoaded|autoAssign|distribut"`
across `src/main` returns zero implementation hits. The `routing_rules` table exists from V001 but is
hollow — *"0 entity / 0 reader / 0 rows… the `assign_department` column does NOT prove a
department-routing layer exists"* (`V035__hollow_table_warnings.sql:26`), confirmed still zero
references in `src/main/java` today. Nothing ever assigns an owner to a lead without a human acting first.

---

**d. Per-role assignment configuration (recruiter vs onboarding vs support vs HR vs licensing) — `ABSENT`**

Searched: `routing_rules`, `RoutingRule`, `assignmentRule`, `assign_rule`, `assign_department`,
`Department` + assignment, and every `INSERT INTO recruit_settings` row across all 96 migrations for
an assignment/routing key. Nothing. `routing_rules` is hollow (above). Work is *addressed* to a
department via `checklist_items.department`, but the department queue is populated only by template
generation, and `Department`'s own javadoc states the app has **no table of staff and no notion of
which department a user belongs to** (`checklist/model/Department.java:3-8`). There is no per-role
assignment configuration of any kind.

---

**e. SLA timer / no-activity detection / automatic reassignment after N hours — `PARTIAL`**

*Timer:* real and reasonably sophisticated. `sla_due_at = businessHours(anchor + hours(source))`,
computed **at read time** on `GET /inbox/hot` (`inbox/service/impl/InboxServiceImpl.java:168-200`).
Anchor = `coalesce(last_hand_raised_at, sourced_at, created_date)` (`:372-378`). Hours come from
`sla.first_touch_hours_by_source` with fallback `sla.first_touch_hours`; an arrival outside business
hours swaps to `sla.after_hours_first_touch_hours` (`:44-60`), and the budget is spent in *business*
hours via `BusinessHoursCalendar` (V061). The response deliberately returns facts, not booleans — no
`overdue`/`breached` flag; the FE computes state (`inbox/model/response/HotItemResponse.java:14-15`).

*No-activity detection:* `candidates.last_outbound_at` (V015) + `overdue.thresholds.warn_days` /
`danger_days` surface as `neglectedWarn` / `neglectedDanger` on the recruiter report
(`report/service/impl/ReportServiceImpl.java:46`, `report/model/response/RecruiterReportRow.java:26-29`).

**Missing:** *nothing acts on any of it.* `sla.no_claim_escalate_minutes` is read in exactly two
places and both just put the number in a response body for the FE to render
(`InboxServiceImpl.java:131,:220`) — there is no consumer. There is **no reassignment path**
(`grep -rniE "reassign"` finds only comments and a referral-credit enum), **no escalation job**, and
**no notification** when a clock breaches. The `sla_policies` table (V001, with an `escalation JSONB`
column "who gets pinged, when" — `V001__init.sql:344`) is hollow: 0 entity, 0 reader, 0 rows
(`V035__hollow_table_warnings.sql:23`). A breached SLA is a red pixel and nothing more.

---

**f. What counts as "activity" on a lead — `IMPLEMENTED`**

`activities` (`candidate/entity/ActivityEntity.java`): `type ∈ {CALL, SMS, EMAIL, NOTE, MEETING, SYSTEM}`,
`direction ∈ {INBOUND, OUTBOUND}` (null for NOTE/SYSTEM), `channelRef`, `summary`, `subject`, `body`,
`internal`, `actorId`, `automationRef` (jsonb, machine identity — **null on every row today**,
`:86-106`), `occurredAt`, `omniMessageId`, `inboundOmniMessageId`.

What drives the clocks:
- An **OUTBOUND** CALL/SMS/EMAIL sets `candidates.last_outbound_at` (`ActivityServiceImpl.java:140`);
  inbound replies deliberately do not move it (`CandidateEntity.java:389-393`).
- An **INBOUND** activity resets `no_answer_streak` (`ActivityServiceImpl.java:200-204`).
- A **live** CALL (no `occurredAt` supplied) arms the pending-outcome reminder (`:161-167`).
- Any directed activity on an unowned lead auto-claims it (`:245`).
- Beyond activities: `stage_history`, `candidate_owner_history`, `candidate_change_log`,
  `offer_history`, `rbac_grant_history`, `candidate_merges`, `candidate_conversation_grants`.

---

**g. Follow-up scheduling, due dates, overdue detection — `PARTIAL` (and dark in production)**

Follow-ups are **not stored in recruit-be**. V055 dropped the local columns; the model is now
multiple open follow-ups per candidate, owned by a separate service `followup-be`, reached over gRPC
(read) and REST (write) — `candidate/controller/CandidateFollowUpController.java:22-27`.
`candidates.next_follow_up_at` and `follow_up_ids` are denormalised copies pushed back by followup-be
(`CandidateEntity.java:346-387`), and `/today` ranks and buckets on them
(`dashboard/service/impl/DashboardServiceImpl.java:147`, `TodayQueueResponse.java:38`). Due/overdue
bucketing exists (`followup/FollowUpTimes.java:45`). NURTURE wake dates are local
(`candidates.nurture_until`).

**Missing / broken in production:** the bridge is unconfigured on prod — *"no `RECRUIT_FOLLOWUP_*` on
any of the deployment's ReplicaSets, no such key in `values-prod.yaml` in any branch's history, and
no followup-be workload on that cluster"* (`followup/FollowUpAvailability.java:93-99`), and
`grep -cE 'RECRUIT_FOLLOWUP' deploy/configs/values-prod.yaml` = 0. Five call sites therefore **throw
503** in production: `listFollowUps`, `createFollowUp`, `patchFollowUp`, `closeFollowUp`,
`requireOwnedOpenFollowUp` (`FollowUpAvailability.java:13-18`). `next_follow_up_at` is NULL on every
production row and *there is no fallback behind it* (`CandidateEntity.java:352-365`). So in
production there is effectively **no follow-up scheduling at all** — which is why the newest features
(`next_step_location` V092, `next_step_send_draft` V094, `pending_call_at` V095) are deliberately
**local columns that survive the bridge being dark** (`CandidateEntity.java:64-86,:541-566`).

---

**h. Follow-up automation — scheduled send, cadence, templates — `PARTIAL`**

The engine exists end to end: `recruit_sequence` / `recruit_sequence_enrollment` /
`recruit_sequence_execution` (V051), a due-poller with per-enrollment `REQUIRES_NEW` transactions and
a fixed work-list snapshot (`sequence/service/impl/SequenceTickServiceImpl.java:14-42`), an
idempotency key per step, stop reasons (`REPLIED, BOOKED, SUPPRESSED, MANUAL, DORMANT`), and a
cron-registered tick every 15 min. The no-answer retry **ladder** is real and configurable
(`followup.no_answer_retry_days`, V074, `candidate/service/impl/FollowUpServiceImpl.java:425-432`).
The 1/5/7/30-day cadence is seeded as settings `cadence.enabled_stages=[S1,S2,S3,S5]` and
`cadence.auto_send_tiers=[1,5]` (V017, D56).

**Missing:** the sender is a **logging stub**. `NoOpSequenceSenderImpl.send()` logs
`"SequenceSender STUB — would send…"` and returns success
(`sequence/service/impl/NoOpSequenceSenderImpl.java:21-31`); its javadoc: *"the real omni/email
sender is deferred (needs Khải/omni)"*. And the whole tick is off:
`sequence.auto_send_enabled` is seeded **false** by V052 and read as the first line of every tick
(`SequenceTickServiceImpl.java:50,:73-77`). No cadence message has ever been sent.

---

**i. Email send; reply capture; notification on reply — `PARTIAL`**

**Send: ABSENT.** `grep -rni "sendEmail|sendMail|MailSender|JavaMail|smtp|SendGrid"` across
`src/main/java` returns **zero hits**. There is no mail transport in this service. `application.yml:131-133`
carries an inherited tera-core `notification-service` block, but **no Java code reads it** (verified
by grep). V085's own comment states it plainly: *"no working email transport in recruit-be to alert
on a breach anyway"* (`V085__invite_status_settings.sql:14`).

**Reply capture: IMPLEMENTED (staging only).** omni-service publishes resolved SMS/EMAIL/CALL replies
onto Pub/Sub `omni-inbound-reply`; `omni/inbound/OmniInboundMessageHandler.java:88-200` turns each
into `ActivityService.recordInbound`, idempotent on `inbound_omni_message_id` (V069 partial unique
index), and writes a `suppression_list` row when omni's `opt_out` flag says the reply was a STOP
(`:147-148`). It deliberately **processes before acking** — unlike every other handler in the org —
so a reply is never lost (`:26-34`). Dark on production: `ENABLED_CLOUD=false` in
`deploy/configs/values-prod.yaml:54-55` means Pub/Sub never starts there.

**Notification on reply: essentially ABSENT.** The only signal is an SSE tick on an already-open
per-candidate stream (`candidateevents/controller/CandidateEventsController.java:47`), which 503s
unless Redis sentinel is configured (staging only). No email, no push, no in-app notification
record, no digest. followup-be's own proto says the same about reminders:
*"followup-be still has no notifier of any kind"* (`src/main/proto/loanfactory/followup/v1/followup.proto:144-146`).

---

**j. SMS/text send and receive; inbound routing — `PARTIAL`**

**Send: ABSENT** — same finding as (i); no SMS client exists. The FE fires a device deep link
(`sms:`) and the recruiter logs the result (`ActivityServiceImpl.java:58`).

**Receive: IMPLEMENTED (staging)** — the same `omni-inbound-reply` subscriber, `channel = "SMS"` →
`ActivityType.SMS` (`OmniInboundMessageHandler.java:187`).

**Inbound routing: IMPLEMENTED as an SPI** — omni resolves which candidate a message belongs to by
calling recruit-be's host-subject endpoints (`hostsubjects/controller/HostSubjectsController.java:67-91`),
which answer "is this subject active" and "resolve this routing key". DORMANT candidates deliberately
stay "active" for inbound routing so a reply is still attributable
(`CandidateStatus.java:29-31`). Sender identity comes from `recruiter_zoom_link` (V060,
`hostsubjects/service/impl/HostSubjectsServiceImpl.java:89-93`). The config comment records that omni
has **not yet wired `host_subjects` for `LO_CANDIDATE`**, so nothing calls it yet.

---

**k. Call logging; click-to-call; Zoom Phone — `PARTIAL`**

*Logging:* full. `POST /candidates/{id}/activities` with `type=CALL`, plus the outcome wizard
`POST /candidates/{id}/call-outcome` (`CandidateController.java:131,:139`). `channelRef` is documented
as the Zoom Phone call id supplied by the caller (`ActivityEntity.java:52-54`).
*Mirror:* an outbound CALL is POSTed to omni after commit so omni's Zoom call-finished webhook has a
row to hydrate with duration/outcome/recording (`omni/CandidateCallMirror.java`,
`ActivityServiceImpl.java:175-186`, `omni_message_id` V063).
*Pending-call reminder:* server-side since V095 (`CandidateEntity.java:541-566`).

**Missing:** recruit-be **never calls the Zoom API**. Click-to-call is a browser deep link
(`zoomphonecall:`) rendered by the FE (`ActivityServiceImpl.java:58`). recruit-be only *stores and
serves* the recruiter's Zoom identity for omni to use. And `recruit.omni.base-url` is blank by
default (`application.yml:201`) and is **not set in `values-sta.yaml` or `values-prod.yaml`** — so the
mirror is dark in both environments unless injected through the k8s secret (not visible in this repo).

---

**l. Message/email TEMPLATE management — `IMPLEMENTED` (management), send-time selection N/A**

`message_templates` (V012, V022): `type ∈ {CALL_SCRIPT, EMAIL, SMS}`, `stage`, `name`, `subject`,
`body`, `status ∈ {DRAFT, IN_REVIEW, ACTIVE, RETIRED}`, `scope ∈ {PERSONAL, TEAM}`, `ownerId`.
Full CRUD plus a real approval workflow: `submit → approve/reject → retire`, split across
`TEMPLATE_CREATE` and `TEMPLATE_APPROVE` permissions
(`template/controller/TemplateController.java:41-101`). `GET /api/v1/templates?type=` returns the
ACTIVE set a caller may use — i.e. selection-at-compose-time is supported.
Caveat: since nothing sends, "selection at send time" is exercised only by the human copy/pasting,
and by `SequenceSendCommand.templateCode` which reaches the stub sender.

---

**m. Conversation / omni-channel view aggregating note+email+call+text per lead — `PARTIAL`**

The local aggregation is real: `GET /candidates/{id}/activities` returns one paginated, newest-first
feed of CALL/SMS/EMAIL/NOTE/MEETING/SYSTEM rows with direction, subject and body
(`ActivityServiceImpl.java:255-259`). Around it sit conversation participation grants
(`candidate_conversation_grants`, V088) with roles `RECRUITER/HIRING_MANAGER/ONBOARDING/LICENSING/CANDIDATE`,
manager join/leave, and an SSE live-refresh channel.

**Missing:** the richer omni panel (full message bodies, threading, the omni-react component) lives in
omni-service and depends on the cast push, which is dark (see k). Locally, an EMAIL/SMS row only has
whatever text a human typed into `body`, because nothing sends or fetches message content.

---

**n. A cross-lead inbox — all recent inbound messages across the team on one screen — `ABSENT`**

Searched: every use of `ActivityEntity.class` in a query (only two, both keyed by `candidate_id` —
`ActivityServiceImpl.java:257,:458`); `teamInbox`, `unifiedInbox`, `allInbound`, `recentInbound`,
`inbound feed`; and every controller path. There is no endpoint that lists activities, messages or
replies across candidates. **The `/api/v1/inbox/*` endpoints are a naming trap**: they return
unclaimed *candidates* (HOT hand-raised, COLD stock), not messages
(`inbox/service/impl/InboxServiceImpl.java:112-230`). An inbound reply lands on one candidate's
activity feed and is visible only by opening that candidate.

---

**o. Labels/tags on a lead; multiple user-created labels — `IMPLEMENTED`**

`labels` catalog + `candidate_labels` many-to-many (V027). `LabelKind ∈ {USER, SYSTEM}` — USER labels
are recruiter-created, SYSTEM ones are machine-owned. Full CRUD plus attach/detach of **a list** of
labels in one call (`label/controller/LabelController.java:57-109`, `attach(...)` takes a list).
`candidates.label_key` is a `|a|b|` projection rebuilt from the join table in the same transaction on
every attach/detach so the list filter can match labels without a join
(`CandidateEntity.java:417-427`). Multiple labels per candidate are the normal case.

---

**p. Notes — `IMPLEMENTED`**

`ActivityType.NOTE` with `internal = true` (team-visible, never shown to the candidate) —
`ActivityEntity.java:68-70`. Written through `POST /candidates/{id}/activities`, and automatically by
the call-outcome wizard (`FollowUpServiceImpl.saveNote`, `:763`). Notes carry no direction, so they
never auto-claim and never move the outbound clock.

---

**q. Audit log / history of changes — `IMPLEMENTED`**

See §2.5. `GET /api/v1/admin/audit-events` (`AUDIT_VIEW`, real grant answer, page capped at 200)
serves one UNION over eight branches (`audit/service/impl/AuditServiceImpl.java:25-40`). Field-level
profile auditing landed in V071/V072 with PII default-deny. Gate overrides are a real column pair
(`stage_history.override_gate`, `.overridden_fields`) precisely so "how many times was the gate
skipped, and by whom" is countable rather than string-matched (`StageHistoryEntity.java:65-85`).
One gap: tera-core's `audit_outbox` is disabled app-wide (`tera.audit.enabled: false`,
`application.yml:99`), so nothing is published outward.

---

**r. Webinar registration; attendance import/tracking — `PARTIAL`**

*List:* `GET /api/v1/webinars` proxies packs' WebPlus `getNextWebinars`, cached, and degrades to an
empty list on any failure (`webinar/WebinarClient.java:23-41`). `WebinarSource ∈ {LIVE, UNAVAILABLE}`
exists specifically so the FE never words "unavailable" as "there are none"
(`webinar/WebinarSource.java`). A wrong namespace answers 200-with-empty, which is indistinguishable
from a real empty schedule (`WebinarClient.java:31-36`).
*Registration:* choosing a `WEBINAR` next step in the outcome wizard enqueues a
`WEBINAR_REGISTRATION` packs writeback row (`FollowUpServiceImpl.java:328-335`,
`packswriteback/PacksWritebackEnqueuer.java:175-197`, V091) — **behind the
`recruit.features.packs-writeback` flag, which is false in every environment.**
`CandidateSource.WEBINAR` and `EVENT_RSVP` carry leads in from webinar sign-ups via MOSO.

**Missing:** **attendance is nowhere.** `grep -rni "attendance|attended"` across `src/main` returns
zero hits. There is no attended/no-show field, no attendance import, no post-webinar follow-up
trigger. `RECRUIT_WEBINAR_BASE_URL` is also absent from `values-prod.yaml`, so even the list is dark
in production.

---

**s. Stage/status transitions and any state machine enforcing order — `PARTIAL`**

`POST /candidates/{id}/transition` (`CandidateServiceImpl.java:614-661`) enforces **three gates**:
1. `stage_requirements` — configured required fields per target stage (`missingRequirements`, V001).
2. Licensing sponsorship per state (`blockingSponsorshipStates`, V068) — settings
   `licensing.sponsorship_gate_mode ∈ {AT_LEAST_ONE, ALL_STATES}` and `…gate_enabled`, default **off**.
3. Mandatory checklist items (`blockingMandatoryChecklistItems`) for S6→S7.
Plus `assertJoinedGate` (S6 requires `signed + paid`, computed), which is **not** override-skippable.
A human with `CANDIDATE_OVERRIDE_GATE` can bypass 1–3 with a mandatory reason, and the skip is
recorded as a real column pair, not a string prefix (`:630-643`, V042).
Side effects: entering S6 generates the department checklist and enqueues the HR handoff; S7
generates the fully-onboarded checklist (`:649-659`).

**Missing:** there is **no ordered state machine.** The only ordering check is
`if (candidate.getStage() == toStage) throw` (`:618-620`). Any stage can jump to any other stage —
S1 → S7, S6 → S0 — provided the field requirements for the target are met. `stage_requirements` also
shipped with **zero seeded rows**, so the gate blocked nothing at first
(`V035__hollow_table_warnings.sql:31`); V041 seeded S6 rows, **inactive**. Status transitions have
no machine at all: `status` is set directly by the outcome branches.

---

**t. Onboarding step tracking (licensing, HR tasks, e-sign, NMLS sponsorship) — `PARTIAL`**

*Generation:* real. `checklist_templates` (V067) per department with triggers
`ON_ENTER_S6 / PER_SPONSOR_STATE / ON_100_ONBOARDED`, `mandatory`, `due_in_days`, `applies_when`
(jsonb). `ChecklistGeneratorImpl.generateOnEnterS6` / `generateOnFullyOnboarded` create items;
`LicensingItemGeneratorImpl` creates per-state licensing items from `licensing_state_rules` (V040,
rule types `DISTANCE_LIMIT / COURSE_REQUIRED / BRANCH_REQUIRED / CONFIRMATION_REQUIRED / AUTO_ATTRIBUTE`).
`sponsorships` (per candidate × state, status `REQUESTED/IN_PROGRESS/SPONSORED/BLOCKED/WITHDRAWN`,
source `SELF_REPORTED/FEED_CONFIRMED/LEGACY_IMPORT`) plus `candidates.access_granted_at` model NMLS
sponsorship. Department queues are readable per department (D76 visibility).

**Missing — and this is the sharp edge: there is no way to complete a checklist item.**
`ChecklistItemService` declares exactly three methods, all reads: `listByCandidate`,
`listOpenByDepartment`, `candidateIdsWithOpenWork`
(`checklist/service/ChecklistItemService.java:12-22`). `ChecklistController` exposes three GETs and
nothing else (`checklist/controller/ChecklistController.java:36-54`). Grepping the whole of
`src/main/java` for `ChecklistItemStatus.DONE`, `setStatus(ChecklistItemStatus…)` or `completedBy`
yields exactly one hit — the field declaration itself (`ChecklistItemEntity.java:82`). Nothing ever
assigns `assignee_id` either. Consequence: the S6→S7 gate condition
"every mandatory item DONE/NA" can never be satisfied through the API, because items are created
`OPEN` and there is no code path that moves them. E-sign and HR tasks are checklist items, so they
inherit the same hole.

---

**u. E-signature document generation and regeneration (Inkless or other) — `ABSENT`**

Searched: `inkless`, `esign`, `e-sign`, `docusign`, `signNow`, `adobe`, `envelope`, `agreementUrl`,
`signature_url`. The only substantive hit is a TODO:
`offer/service/impl/OfferServiceImpl.java:297` — *"TODO(document-esign): create the envelope here and
store its reference; until then this…"*. There is no client, no envelope id column, no regeneration
path. `offers.agreement_status ∈ {NOT_SENT, SENT, SIGNED}` is moved by hand
(`POST /offers/{id}/signed`). `document-esign` appears elsewhere only as a *design template* other
classes say they copied (`rbac/directory/CentralDirectoryClient.java:120`).

---

**v. Payment / startup fee / PayPal; approval gate before payment — `PARTIAL`**

*Fee model:* real. `offers.fee_status ∈ {PENDING, PAID, WAIVED}`, `waived_by`, `waived_at`,
`requested_waive_fee`, `requested_waive_reason` (V086). A recruiter's waive **ask** only becomes a
real waive when an approving manager approves, stamped with the manager's id, never the recruiter's
(`OfferServiceImpl.java:202-220`). Guarded against overwriting an already PAID/WAIVED fee.
*Approval gate before a candidate can pay:* yes — an offer must be `APPROVED` before it can be `SENT`
(`OfferServiceImpl.java:266-274`), sending is gated on `OFFER_APPROVE`, the invite passes the
suppression gate first (`:291-295`), and `ApprovalMode ∈ {RULE_BASED, RECRUITER_DECIDES, ALWAYS_REVIEW}`
(V083) controls whether a request auto-approves. S6 entry requires `signed + paid`, computed.
DB-level "one open offer per candidate" (V082).

**Missing:** **no PayPal, and no payment integration of any kind.** `grep -rni paypal src/main/java`
returns only comments about webhook retry semantics
(`webhook/entity/WebhookEventEntity.java:69`, `webhook/service/WebhookDedupService.java:28,:38`).
`POST /offers/{id}/fee-paid` is a human clicking a button
(`OfferServiceImpl.java:368-376`); its javadoc calls itself a "Stub for the payment webhook — manual
until the fee flow is wired" (`OfferController.java:90`). Nothing collects money, nothing reconciles.
Also: `comp_bands` — the source of the comp-band ids the offer request accepts — is hollow;
*"measured on staging 2026-09-15: `comp_bands` has 0 rows, and of 926 offers, 0 carry a
`comp_band_id`"* (`offer/model/request/RequestOfferRequest.java:23-28`).

---

**w. Approve/reject a loan officer application — `IMPLEMENTED`**

Two distinct decisions, both real:
- *Offer approval:* `POST /offers/{id}/approve` and `/decline` (`OFFER_APPROVE` / `OFFER_REQUEST`),
  with a full `offer_history` ledger of `REQUESTED/APPROVED/DECLINED/SENT/SIGNED/FEE_*`
  (`OfferController.java:64,:70`; `OfferServiceImpl.java:194-222`).
- *Rejecting the person:* the `NOT_INTERESTED` outcome branch archives with a mandatory reason
  (`FollowUpServiceImpl.notInterested`, `:592`), and `POST /candidates/bulk-archive`
  (`CANDIDATE_ARCHIVE`) with a required reason. `archive_reason` widened by V062. Reversible via
  `POST /candidates/{id}/revive`.

---

**x. NMLS number lookup and enrichment; Modex integration — `PARTIAL`**

Modex arrives **inbound only**: `POST /v1/webhook/modex/listener`
(`modex/ModexWebhookHandler.java:20-24`) → `ModexSyncServiceImpl.upsertFromPayload`
(`modex/service/impl/ModexSyncServiceImpl.java:26-44`), matching on NMLS then email, honouring the
recruiter field-freeze. It populates `career_production` (12-month volume), `units_12mo` (12-month
closed units), `licensed_states`, `socials`, and stamps `modex_synced_at` for the "Modex · as of
{date}" badge (V002). Every payload is persisted verbatim to `webhook_events` before processing, and
a processing failure is rethrown so the sender retries (`ModexWebhookHandler.java:28-42`).

**Missing:** recruit-be **never calls Modex or NMLS**. `grep -rni "nmlsLookup|lookupNmls|verifyNmls"`
returns nothing; there is no Modex HTTP client, no base URL and no credential anywhere in
`application.yml` or the Helm values. A recruiter cannot type an NMLS number and pull a profile —
enrichment only happens if Modex happens to push. Modex is also unsigned:
*"No signature scheme yet (Modex contract pending — §9.9)"* (`ModexWebhookHandler.java:44-46`).
Employment history is not modelled at all; `loans_since_anchor` / `loans_since_as_of` are
**hand-typed at NMLS verify** because Modex only returns 12-month aggregates
(`CandidateEntity.java:204-213`).

---

**y. Statistics / dashboard / KPI aggregation; per-recruiter production metrics — `IMPLEMENTED`**

Everything is computed live, never cached (hard rule #5 — the legacy dashboard was 8 days stale).
- `GET /api/v1/kpi/pipeline` → the full 8×4 stage×status cross-tab, zero-filled, merged rows
  excluded, one `GROUP BY` (`dashboard/model/response/PipelineKpiResponse.java:8-24`). The contract
  deliberately refuses one-axis counts after a real bug shipped "1,644 at offer" of which 1,222 were
  archived rejections (D42).
- `GET /api/v1/reports/recruiters` → per recruiter: `openCandidates`, `touchesToday`,
  `touchesWindow`, `stageMovesWindow`, `avgFirstTouchMinutes` **with `firstTouchSamples`** so a
  3-sample average cannot masquerade as a 300-sample one, `neglectedWarn`, `neglectedDanger`
  (`report/model/response/RecruiterReportRow.java:13-28`).
- `GET /api/v1/reports/pivot` → recruiter × month (V023).
- `GET /api/v1/today` → the personal queue, bucketed due / not-due, neglect-first inside a bucket.
Production metrics per candidate (`career_production`, `units_12mo`) are surfaced; the role-based
masking that used to hide them was **removed** (see §5).

---

**z. CSV export and import — `ABSENT` (import exists, but not as CSV; export does not exist at all)**

Searched: `csv`, `text/csv`, `CSVWriter`, `OpenCsv`, `apache commons-csv`, `export`,
`Content-Disposition`, `attachment`. **No CSV library is on the classpath and no endpoint produces a
file.** The three `csv` string hits are all comments describing the *legacy* system's import sources
(`V001__init.sql:17,:21`, `candidate/model/CandidateSource.java:10`), and `import_batches.source`
lists `SFTP / S3 / CSV / MANUAL / MODEX` as a free-text label nothing parses.

What does exist is `POST /api/v1/admin/import/moso` (`IMPORT_RUN`), which takes a **JSON body** of
rows (`moso/model/request/MosoImportRequest.java`, kinds `LO_RECRUITING, BLACK_LIST, SMS_OPT_OUT,
EMAIL_OPT_OUT, CALL_OPT_OUT`) and is a one-time migration intake, not a user-facing importer
(`moso/service/impl/MosoImportServiceImpl.java:27` — "Import bypasses stage gates BY DESIGN").
There is no way for a recruiter to export a filtered list, and no way to bulk-import a purchased lead
list without going through MOSO.

---

**aa. Permission/RBAC model — `IMPLEMENTED` (with one structural caveat)**

*Roles* (9): `ADMIN` (wildcard `*`), `MANAGER` (~19 perms), `RECRUITER` (12), `LO_SUPPORT` (12),
`OFFICER_RECRUITER` (12), `HR`, `LICENSING`, `ONBOARDING`, `ACCOUNTING` (2–3 each) —
`V003__seed_rbac_roles.sql:7-20`, `V036__seed_kho_roles.sql:31-41`. `LO_SUPPORT` and
`OFFICER_RECRUITER` carry identical permissions and differ only by workspace. No `IT` role row exists.

*Permissions* (34 + wildcard), `rbac/model/RecruitPermission.java:10-154`:
`CANDIDATE_READ/CREATE/UPDATE/CLAIM/TRANSFER/ARCHIVE/MERGE/TRANSITION/OVERRIDE_GATE`,
`ACTIVITY_READ/LOG`, `SUPPRESSION_MANAGE`, `OFFER_READ/REQUEST/APPROVE`, `RBAC_MANAGE`, `REPORT_TEAM`,
`TEMPLATE_CREATE/APPROVE`, `IMPORT_RUN`, `AUDIT_VIEW`, `REFERRAL_ATTRIBUTION_READ/OVERRIDE`,
`LABEL_MANAGE`, `SETTINGS_MANAGE`, `SEQUENCE_READ/MANAGE`, `CHECKLIST_READ`, `LICENSING_RULE_MANAGE`,
`CHECKLIST_TEMPLATE_MANAGE_{HR,LICENSING,ONBOARDING,ACCOUNTING,IT}`, `WILDCARD = "*"`.

*Enforcement* is **real in both deployed environments** — `RECRUIT_RBAC_ENFORCE=true` in
`values-prod.yaml:87-88` and `values-sta.yaml:141-142`. The PDP is
`rbac/service/impl/AccessControlServiceImpl.java`: `effectivePermissions` unions role permissions and
applies `overrides_add` / `overrides_block` (`:34-53`); `hasPermission` is the real answer (`:55-60`);
`require` is **fail-open when `recruit.rbac.enforce=false`** — it logs `"RBAC (enforce=off) would
deny…"` and lets the request through (`:62-73`, default `false` at `application.yml:147`). Data-writing
side effects deliberately use `hasPermission` rather than `require` so they cannot fail open.
Guards on top: you cannot revoke the last person who can reach `/admin/rbac/*`
(`RbacAdminServiceImpl:167-179,:391-402`), and you cannot revoke someone still owning active
candidates (`:199-210`).

*Identity* arrives as the gateway-injected `X-User-ID` header — `ServicesUtils.getCurrentUserId()`
reads it with no verification in this service; trust is fully delegated to api-gateway-v2
(`V029__bootstrap_admin_grant.sql:14-15`).

**Caveat:** no annotation, no aspect, no filter chain. Every gate is a hand-written call, so a missed
one is invisible — and `GET /admin/rbac/me` (§3.8) is already one endpoint where the pattern was not
followed. `rbac_roles.row_scope` and `.field_masks` are mapped but never evaluated, so per-row scoping
and field masking do not exist at this layer (`V035__hollow_table_warnings.sql:35-40`).

---

**bb. Scheduled jobs / cron / Quartz — `IMPLEMENTED` (but nothing runs in-process)**

There is **no `@Scheduled`, no Quartz, no in-process timer anywhere in `src/main/java`** (verified by
repo-wide grep). Instead recruit-be registers four HTTP-triggered jobs with the platform's external Go
`cron-service` at `ApplicationReadyEvent`:

| Job | Default schedule | Endpoint | What it does | Registrar |
|---|---|---|---|---|
| `recruit-sequence-tick` | `0 0/15 * * * ?` | `POST /api/v1/sequences/internal/tick` | Claim due enrollments, attempt the next cadence step (no-op while `sequence.auto_send_enabled=false`; sender is a stub) | `sequence/cron/SequenceTickCronRegistrar.java:53,62,85` |
| `recruit-packs-writeback-tick` | `0 0/5 * * * ?` | `POST /api/v1/packs-writeback/internal/tick` | Claim `packs_writeback_outbox` rows, PATCH packs | `packswriteback/cron/PacksWritebackTickCronRegistrar.java:36,40,67` |
| `recruit-hr-handoff-tick` | `0 0/5 * * * ?` | `POST /api/v1/hr-handoff/internal/tick` | Claim `hr_handoff_outbox` rows, publish to ai-hr-be over Pub/Sub | `hrhandoff/cron/HrHandoffTickCronRegistrar.java:38,42,69` |
| `recruit-user-service-sync-tick` | `0 0/5 * * * ?` | `POST /api/v1/user-service-sync/internal/tick` | Claim `user_service_sync_outbox` rows, "deliver" via the no-op client | `userservicesync/cron/UserServiceSyncTickCronRegistrar.java:39,43,70` |

Each registrar **refuses to register at all** if its `*.internal-api-key` is blank (a keyless
registration would book a schedule whose every run 401s) — e.g. `SequenceTickCronRegistrar.java:70-76`.
Registration itself publishes to the `CRON_JOB_REGISTRATION` Pub/Sub topic, which the no-op publisher
drops unless `core.pubsub.provider=google` — true only on staging. So in production **none of these
four jobs is registered at all**, and even on staging each is inert until its feature flag is on.
One non-recurring batch also exists: `candidate/batch/CandidatePhoneNormalizationBackfillHandler.java`
(admin-triggered E.164 backfill).

---

## 5. Work in progress / half-done

### 5.1 TODO / FIXME / HACK / XXX

There are **no `FIXME`, `HACK` or `XXX` comments** in `src/main/java`. Five `TODO`s:

| File:line | Text |
|---|---|
| `offer/service/impl/OfferServiceImpl.java:297` | `TODO(document-esign): create the envelope here and store its reference; until then this` |
| `referral/service/ReferralAttributionEventService.java:17` | `TODO(ikp5/D, agentflow-dvdl): this is the eventual call site for the source-emit-contract` |
| `userservicesync/NoOpUserServiceSyncClient.java:19` | `TODO(agentflow-lkyg, follow-up bead): replace this with a real client once the above is decided` |
| `userservicesync/UserServiceSyncProperties.java:15` | `client is built (see that class's TODO)` |
| `userservicesync/UserServiceSyncClient.java:9` | `this sync is DARK end-to-end… and the TODO` |

### 5.2 Stubs

- **`sequence/service/impl/NoOpSequenceSenderImpl.java:21-31`** — logs `"SequenceSender STUB — would
  send…"`, returns `success = true` with a fake `noop:<uuid>` reference. Every cadence "send" the
  engine believes it made was a log line.
- **`userservicesync/NoOpUserServiceSyncClient.java:26-40`** — makes **zero network calls**, logs
  `"[DARK] would PATCH user-service…"`, and the caller then marks the outbox row `SENT` as though
  delivery succeeded. Blocked on "Tai's service credential + transport decision REST-vs-Pub/Sub".
- No `UnsupportedOperationException` anywhere; the ~19 `return List.of()` sites are defensive
  early-returns on blank input, not stubs.

### 5.3 Feature flags and their default state

| Key (env) | Default | Prod | Staging | Gates |
|---|---|---|---|---|
| `recruit.rbac.enforce` (`RECRUIT_RBAC_ENFORCE`) | `false` | **true** | **true** | Real 403s vs log-and-allow |
| `recruit.followup.query-target` (`RECRUIT_FOLLOWUP_QUERY_TARGET`) | blank | **absent** | set | The entire followup-be bridge |
| `recruit.followup.server-enabled` | `false` | absent | `true` | Inbound gRPC listener |
| `recruit.omni.base-url` (`RECRUIT_OMNI_BASE_URL`) | blank | **absent** | **absent** | Cast push + call mirror |
| `recruit.features.packs-writeback` | `false` | absent | absent | packs writeback enqueue |
| `recruit.packs.base-url` / `api-key` | blank | **absent** | set | packs writeback delivery |
| `recruit.features.hr-handoff-publish` | `false` | absent | absent | HR handoff enqueue |
| `recruit.hr-handoff.topic` | blank | absent | absent | HR handoff delivery |
| `recruit.features.user-service-sync` | `false` | absent | absent | Identity sync (client is a no-op regardless) |
| `recruit.webinar.base-url` | blank | **absent** | set | Webinar list |
| `recruit.candidate-events.sentinel-*` | blank | **absent** | set | SSE live conversation stream |
| `recruit.host-subjects.access-token` | blank | — | set | omni inbound-routing SPI (fail-closed) |
| `moso.webhook.api-key` | blank | set (secret) | set (secret) | Public webhook (**fail-closed**) |
| `sequence.auto_send_enabled` (DB setting, V052) | `false` | false | false | Cadence sending |
| `licensing.sponsorship_gate_enabled` (DB setting, V068) | **off** | off | off | S6→S7 sponsorship gate |
| `tera.audit.enabled` | `false` | false | false | tera-core audit outbox |
| `ENABLED_CLOUD` / `PUBSUB_PROVIDER` | — | **`false` / unset** | `true` / `google` | All Pub/Sub, incl. omni inbound + cron registration |

### 5.4 Endpoints / services that exist but are never called

- **`hostsubjects/controller/HostSubjectsController.java`** — the omni inbound-routing SPI is complete
  and token-gated, but omni has not bound `host_subjects` for `LO_CANDIDATE` yet
  (`application.yml` omni block; `docs/OMNI-STATUS-2026-08-25.md` C7). Nothing calls it.
- **The four `/internal/tick` endpoints** — registered only where Pub/Sub is on (staging), and inert
  where their feature flag is off (everywhere).
- **`sequence` enrollment endpoints** — enrollments can be created, but the tick never sends.
- **`GET /api/v1/webinars`** on production returns `UNAVAILABLE` always (no base URL).
- **The whole `follow-ups` controller** on production 503s.

### 5.5 Entities / columns with no reader or writer

- **`candidates.account_id`** — the central identity link. Only one assignment exists
  (`DedupServiceImpl` copying loser→survivor on merge); the "periodic reconciliation job" its javadoc
  has always promised **does not exist**, so the value is NULL everywhere
  (`CandidateEntity.java:121-124`).
- **`activities.automation_ref`** — the machine-actor column, NULL on every row and will stay so until
  a machine can send (`ActivityEntity.java:86-106`).
- **`checklist_items.status` beyond OPEN, `.completed_by`, `.assignee_id`** — created, never written
  (§4t).
- **`rbac_roles.row_scope`, `.field_masks`** — mapped, never evaluated (`V035:35-40`).
- **`offers.comp_band_id`** — settable, but `comp_bands` has 0 rows and 0 of 926 staging offers carry
  one (`offer/model/request/RequestOfferRequest.java:23-28`).
- **Four fully hollow tables** — `referrals`, `sla_policies`, `comp_bands`, `routing_rules`: zero
  entity, zero reader, zero rows, confirmed still true today
  (`V035__hollow_table_warnings.sql:17-28`).
- **`audit_outbox`** (tera-core) — exists, disabled app-wide.

### 5.6 Flyway migrations

96 files, `V001`→`V095`, **gap at V048/V049** (numbers burned by two branches racing on the
followup-be bridge migrations; renumbered to V054–V056 — commits `5c5f330`, `b8eef4d`).
`SchemaDocFreshnessTest` turns the build red if `docs/SCHEMA.md` is not regenerated after a migration
(`docs/SCHEMA.md:4-10`).

Full ordered list with one-line purpose:

V001 init (full v1.1 schema) · V002 Modex fields · V003 seed 7 RBAC roles · V004 SUPPRESSION_MANAGE ·
V005 offer perms · V006 MOSO import · V007 `recruit_settings` · V008 widen legacy id columns ·
V009 `today.queue_cap` · V010 CANDIDATE_TRANSFER · V011 owner history · V012 message templates ·
V013 call outcome + follow-up · V014 follow-up time + activity body · V015 `last_outbound_at` +
CANDIDATE_ARCHIVE · V016 last-outbound sort key · V017 HOT foundation + referred-source settings ·
V018 search key · V019 HOT queue cap · V020 CANDIDATE_MERGE · V021 REPORT_TEAM · V022 template scope ·
V023 pivot window · V024 saved filters · V025 AUDIT_VIEW · V026 trigram index · V027 labels ·
V028 batch claim size · V029 bootstrap admin grant · V030 six cutover grants · V031 unclaimed age ·
V032 `rbac_grants.user_id` fix · V033 grant history · V034 `last_hand_raised_at` ·
**V035 comment-only hollow-table warnings** · V036 seed LO_SUPPORT/OFFICER_RECRUITER ·
V037 grant email · V038 EVENT_RSVP label patterns · V039 sponsorship backfill columns ·
V040 seed licensing state rules · V041 seed S6 stage requirements (**inactive**) · V042 override gate ·
V043 `moso_note` self-reported · V044 self-reported company · V045 HOT hand-raise · V046 offer history ·
V047 webhook dedup key · *(V048/V049 missing)* · V050 referral attribution events ·
V051 sequence core · V052 `sequence.auto_send_enabled` (**false**) · V053 production band thresholds ·
V054 follow-up denorm · V055 drop local follow-up columns · V056 no-answer retry 3 days ·
V057 attribution constraint equivalence · V058 omni cast push memo · V059 activity automation ref ·
V060 recruiter Zoom link · V061 business-hours SLA clock · V062 widen archive reason ·
V063 activity omni message id · V064 `to_owner` nullable · V065 cold inbox settings ·
V066 licensing AUTO_ATTRIBUTE · V067 checklist templates · V068 licensing/onboarding gate settings ·
V069 inbound omni message id · V070 recruiter-locked fields · V071 candidate change log ·
V072 change-log reason · V073 packs writeback outbox · V074 no-answer retry ladder ·
V075 referral surrogate identity · V076 attribution admin override · V077 company-lead hold days ·
V078 attribution override permission · V079 HR handoff outbox · V080 override-note CHECK ·
V081 genesis attribution backfill · V082 one-open-offer constraint · V083 offer auto-approve settings ·
V084 packs INVITE kind · V085 invite status settings · V086 offer waive intent ·
V087 MOSO employment signals · V088 conversation grants · V089 user-service sync outbox ·
V090 nurture default days · V091 packs WEBINAR_REGISTRATION kind · V092 meet-1-1 location ·
V093 suppression channel in unique key · V094 send-info draft · V095 candidate pending call.

**Migrations that add schema with no code reading or writing it:**
- `V001` — `routing_rules`, `sla_policies`, `comp_bands`, `referrals` (still hollow); `audit_outbox`
  (disabled).
- `V001` — `checklist_items.assignee_id`, `.completed_by` and any status beyond `OPEN`: created, never
  written.
- `V041` — seeds S6 stage requirements **inactive**, so the gate they describe is off.
- `V059` — `activities.automation_ref`: the column exists deliberately **ahead of its writer**
  (`ActivityEntity.java:89-95`).
- `V052`, `V068`, `V083` — settings whose features are flag-off in every environment.
- `V073`, `V079`, `V089` — three outbox tables whose enqueuers are all flag-off, so all three are
  permanently empty in every environment today.

### 5.7 Recently merged work (last ~40 commits on `origin/master`)

1. **Moving UI-local state onto the server.** #389 made the "you dialled and never logged an outcome"
   reminder server state (V095) after sessionStorage lost it across tabs/machines; #388 did the same
   for a scheduled SEND_INFO draft (V094).
2. **Suppression / TCPA hardening.** #386, #384 — STOP-text handling and adding `channel` to the
   suppression unique key (V093).
3. **Meet-1-1 shipped end to end** — schema, logic, doc regen (V092).
4. **packs / webinar integration**, with repeated re-measurement against the live remote (the webinar
   namespace finding, the packs op-name qualification fix).
5. **Sequence engine correctness** — no re-send of already-sent rows after a mid-batch abort.
6. **Conversation History epic** (#370–#374) — manager visibility into recruiter conversations,
   join/leave, Today-queue integration.
7. **user-service identity sync outbox added, explicitly "(dark)"**.
8. **Offer compliance surface** — waive-fee intent, invite auto-send + SLA breach flag, and #362
   **removing production-number masking entirely** ("bỏ hẳn mask doanh số"), reversing D31: every role
   now sees the exact figure. The masking was security theatre anyway — the list filter DSL answered
   range queries straight off the masked column (`inbox/service/impl/InboxServiceImpl.java:186-189`).
9. **HR handoff payload reworked** to match ai-hr-be's real schema (adds `licensed_states`).

**Inference:** active work is (a) hardening what already exists into durable server state, (b) building
out the integration layer — which keeps landing behind flags while waiting on credentials and
decisions from other teams (omni/Khải, packs, ai-hr, Tai/user-service), and (c) the referral-attribution
and offer-compliance surface. Nobody is currently building outbound messaging.

---

## 6. Integration points

| System | Caller | Transport | Purpose | State |
|---|---|---|---|---|
| **MOSO** (live sync) | `moso/controller/PublicWebhookController.java:88` → `moso/MosoWebhookHandler.java` → `moso/service/impl/MosoRowUpsertServiceImpl.java` | REST **inbound only** — recruit-be never calls MOSO | Real-time push of legacy LO rows into `candidates`, with per-field recruiter freeze and `hasNewSystemProgress` guard | **COMPLETE & LIVE** (internet-reachable since 04/09; fail-closed on blank key) |
| **MOSO** (migration) | `moso/controller/MosoImportController.java:29` → `MosoImportServiceImpl` | REST, admin-triggered JSON chunks | One-time 106k-row legacy migration, bypasses stage gates by design | **COMPLETE** |
| **Modex** | `modex/ModexWebhookHandler.java:20` → `modex/service/impl/ModexSyncServiceImpl.java:26` | REST inbound webhook | NMLS/production enrichment upserts | **COMPLETE inbound; no outbound lookup exists.** Unsigned — signature scheme still pending |
| **packs** (writeback) | `packswriteback/PacksWritebackClient.java:37`, driven by the 5-min tick | REST (JDK HttpClient, hard timeout, no body logging) | Relay recruiter profile edits, offer INVITEs and webinar registrations back to `recruiting.SaveLORecruitingFromRecruitOp` | **DARK everywhere** — `recruit.features.packs-writeback` false and unset in both values files; op itself verified live on staging 21/09 |
| **packs** (webinar list) | `webinar/WebinarClient.java:23` | REST, unauthenticated WebPlus API | Upcoming-session dropdown | **LIVE on staging** (2 sessions measured 21/09); **DARK on production** — no base URL |
| **omni-service** (cast push, call mirror) | `omni/OmniCastPushClient.java`, `omni/OmniCallMirrorClient.java`, `omni/CandidateCastAssembler.java` | REST direct to ClusterIP, forwarding the recruiter's own gateway identity headers (no service key, by omni's adoption rule) | Mirror the conversation cast + optimistic outbound calls so omni can hydrate them from Zoom | **DARK** — `recruit.omni.base-url` blank by default and not found in either values file |
| **omni-service** (inbound replies) | `omni/inbound/OmniInboundMessageHandler.java:73` | **Pub/Sub** `omni-inbound-reply`, process-then-ack | Turn SMS/EMAIL/CALL replies into inbound activities; write STOP opt-outs | **COMPLETE on staging** (IAM granted 14/09); **DARK on production** (`ENABLED_CLOUD=false`) |
| **omni-service** (host-subject SPI) | `hostsubjects/controller/HostSubjectsController.java:67` | REST inbound under `/public`, `Access-Token` gated | Lets omni resolve candidate/sender for inbound routing | **CODE-COMPLETE, NOT YET CALLED** — omni has not bound `host_subjects` for `LO_CANDIDATE` |
| **omni-service** (live stream) | `candidateevents/…/CandidateEventsSubscriber` + SSE controller | Redis sentinel pub/sub → SSE | Refresh the conversation panel | **staging only**; 503 on prod |
| **followup-be** | `followup/service/FollowUpQueryClient.java` (gRPC read), `followup/service/impl/FollowUpCommandClientImpl.java` (REST write), `followup/grpc/FollowUpHostSyncGrpcService.java` (inbound gRPC push) | gRPC + REST | The entire follow-up / next-step model | **LIVE on staging; fully DARK on production** — five call sites 503, `next_follow_up_at` NULL everywhere |
| **cron-service** (Go) | 4 `*CronRegistrar` classes | Pub/Sub `CRON_JOB_REGISTRATION` → HTTP callbacks | Registers the four relay ticks | **Mechanics complete**; registration silently dropped wherever Pub/Sub is off (= production) |
| **ai-hr-be** | `hrhandoff/HrHandoffPayloadResolver.java`, `HrHandoffTickServiceImpl` via tera-core `PubSubService` | **Pub/Sub publish only**, keys-only outbox, re-read at delivery, fail-open | Publish `RECRUIT_HIRED` on first human S6 so HR can draft an employee | **DARK everywhere** — feature flag and topic both unset. Code path otherwise complete |
| **user-service** (central identity, Tai) | `userservicesync/NoOpUserServiceSyncClient.java:28` | **None** | Would push identity changes centrally | **STUB** — literally no network call; transport undecided |
| **central platform / auth** (company directory) | `rbac/directory/CentralDirectoryClient.java:47` | REST via api-gateway-v2, forwarding the caller's bearer | The "grant access to someone new" people picker | **COMPLETE & LIVE** in both envs; 503s loudly rather than returning a silent empty list |
| **api-gateway-v2** | implicit — every request | HTTP headers | Injects `X-User-ID`; routes `/…/public/…` past Bearer; special-cases `/events/subscribe` for SSE | **LIVE**, and the sole source of caller identity |
| **Zoom** | `zoomlink/…/RecruiterZoomLinkServiceImpl`, consumed by `hostsubjects` + `omni/CandidateCastAssembler` | none — recruit-be stores the link, never calls Zoom | Sender-identity resolution for omni | **Indirect only.** No Zoom API client exists |
| **document-esign / Inkless** | only a TODO at `offer/service/impl/OfferServiceImpl.java:297` | — | Offer agreement envelopes | **NOT BUILT** |
| **PayPal** | none | — | — | **NOT INTEGRATED** — only comments about webhook retry semantics |
| **NMLS** | none | — | `nmls_id`, `nmls_status`, sponsorship are data fields fed by MOSO/Modex | **NOT AN INTEGRATION** |
| **callcenter**, **auth-service**, **tera-be**, **Google** | none | — | — | **NOT INTEGRATED** in this service (tera-**core** is a compile-time library, not a call) |

**Blunt summary for §6:** on production, the only live integrations are the two inbound webhooks
(MOSO, Modex) and the central-gateway directory read. Everything else — follow-ups, omni, packs,
webinars, HR handoff, user-service, the live stream, all four cron ticks — is off. Staging adds
followup-be, the omni inbound subscriber, the webinar read and the SSE stream, but still has no
outbound messaging of any kind.
