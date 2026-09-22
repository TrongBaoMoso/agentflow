# Adversarial review — checklist item completion (5pb2), domain correctness + codebase fit

**Reviewer scope:** domain correctness and codebase fit (a separate reviewer covers security/RBAC).
**Measured against:** `recruit-be` worktree `agent/5pb2-checklist-completion` @ `a689126` (= `origin/master`).
**Inputs treated as claims, not facts:** the team-lead brief, `docs/design-checklist-item-completion.md`,
`docs/transcripts/GAP-ANALYSIS.md` §1/§6.

## Verdict

**Go ahead, with changes.** The write path itself (items 1–5) is needed and mostly fits the codebase.
**Item 6, "recompute the 100% gate on completion", must be dropped as written.** It adds automatic
stage advancement, which nothing has decided. With today's seed data it would fire on the first
tick of any item. It also brings in the idempotency, concurrency and circular-dependency problems
the brief asks about. Take item 6 out and most of axes (c) and (d) go away with it.

The premise behind the design is also stated wrong. S6→S7 is **not** unreachable today (§1). The
real gap is smaller but still real: no item can be completed, so no department can ever mark an
item `mandatory` without freezing S6→S7 for every candidate.

---

## 1. Claims found FALSE

| # | Claim | Source | Truth |
|---|---|---|---|
| F1 | "Nothing can become DONE, so **S6→S7 is unreachable through the API**" | brief; design §Problem; GAP §1 | **False.** Every seeded template is `mandatory = FALSE` (`V067__checklist_templates.sql:7-14`, and every row in `:57-137`). `blockingMandatoryChecklistItems` filters to mandatory templates only (`CandidateServiceImpl.java:760-766, 770`), so it returns empty and `transition()` to S7 goes through today. It is also reachable by D35 override (`CandidateServiceImpl.java:630`, `CandidateFacadeImpl.java:190-191`), by the kill switch `onboarding.completion_requires_mandatory` (`:757`), and by MOSO import writing `S7` directly (`MosoRowMapper.java:738`, `MosoRowUpsertServiceImpl.java:402`). It would only become unreachable once a department flips a template to mandatory. I cannot see a live DB, so an admin CRUD flip on staging/prod is **unverified**. |
| F2 | "**No `HR` role is seeded**" / the seeded-role list | design §What already exists, §Risks; brief | **False.** `role-hr` / `HR` is seeded at `V003__seed_rbac_roles.sql:13`. V067 already grants it `CHECKLIST_TEMPLATE_MANAGE_HR` (`V067:142-143`). The design's "open question: add an HR role or confirm HR signs in as ADMIN" does not exist. |
| F3 | `PRE_LEDGER` is a seeded role | brief / design role list | **False.** `PRE_LEDGER` is a `rbac_grant_history.reason` value (`V033__rbac_grant_history.sql:36,62`; `GrantChangeReason.java:13`), not a role. |
| F4 | The `CHECKLIST_TEMPLATE_MANAGE_{HR,LICENSING,ONBOARDING,ACCOUNTING}` precedent has 4 values | design §What already exists | **False.** There are **five**, including `CHECKLIST_TEMPLATE_MANAGE_IT` (`RecruitPermission.java:151`), with an exhaustive `switch` over `Department` (`:161-168`). `Department` has 5 values (`Department.java:11`). IT items are seeded (`V067:121-124`). |
| F5 | "`ChecklistController` 3 GET endpoints" / "`ChecklistItemService` 3 read methods" / only writers set OPEN at `ChecklistGeneratorImpl:52`, `LicensingItemGeneratorImpl:105` | brief | **True**, recorded for completeness (`ChecklistItemService.java:15-21`, `ChecklistGeneratorImpl.java:52`, `LicensingItemGeneratorImpl.java:105`). `MosoRowMapper` has **zero** references to checklist state (grep over `src/main/java` for `checklist_item|ChecklistItem` lists 22 files, none of them in `moso/`). No batch job, webhook or test-only writer exists. |
| F6 | Stage check is only `from != to` | brief :618-620 | **True** (`CandidateServiceImpl.java:617-620`). The only other structural check is the Joined gate, which applies to S6 only (`:635`, `:787-803`). Any stage can move to any other, including S7→S6. |
| F7 | GAP §6 / design: "100% onboarded = HR Complete + Sponsorship + setup call" is something the checklist gate can express | GAP §6 T5 | **Structurally false today.** `ONB_SETUP_CALL` is an `ON_100_ONBOARDED` template (`V067:132-133`): it is created *after* S7. The gate only reads `ON_ENTER_S6` and `PER_SPONSOR_STATE` templates (`CandidateServiceImpl.java:760-766`). So the business's third gate cannot block S7, even with `mandatory = true`. |

---

## 2. Findings

### BLOCKER

**B1 — Auto-advancing S6→S7 on completion is undecided, and with the current seed it fires on the first tick.**
- Today S6→S7 happens only through an explicit human `transition()` with `CANDIDATE_TRANSITION` (`CandidateFacadeImpl.java:186`). Q12 is settled as *"tính lúc S6→S7"*: the gate is evaluated **at the transition**, not as a trigger (`docs/DECISIONS.md:244`). Q25, the definition of the gate itself, is still `(chờ)` / pending (`DECISIONS.md:228`). Nothing decides that finishing a checklist moves the candidate.
- Every template is `mandatory = false` (`V067:7-14`), so "all mandatory items DONE/NA" is vacuously true on every S6 candidate. An auto-recompute on completion would push the candidate to S7 **on the first item anyone completes**, and fire `generateOnFullyOnboarded` (`CandidateServiceImpl.java:657-658`). That is exactly the legacy "100% onboarded while the checklist is half done" hole that Q12 was written to close (`DECISIONS.md:244`; javadoc `CandidateServiceImpl.java:747-751`).
- S7 has three gate inputs, not one: `stage_requirements` (`:624`), sponsorship (`:627`, dark), and mandatory items (`:628`). A "recompute on completion" that looks only at checklist state would bypass the other two. One that calls `transition()` would, on a blocked candidate, throw `BadRequestException` inside the completion transaction (`:630-632`). That rolls back the user's tick, so completing an item fails because an unrelated field is missing.
- **Fix:** completion writes the item and nothing else. S6→S7 stays a human transition, and it already reads the gate. If the frontend needs a "ready to move" signal, expose the blocker list read-only (for example `GET /candidates/{id}/onboarding-readiness`, returning the output of the three existing private checks). This removes the need for idempotency guards and locks on the transition.

### MAJOR

**M1 — The feature cannot be used: no department role (and not MANAGER) can read checklist items.**
All three reads are gated on `CHECKLIST_READ` (`ChecklistFacadeImpl.java:44-46`). That permission is ADMIN-only by wildcard (`RecruitPermission.java:113-122`). It is not in any role's seed (`V003:8-20`, `V036`). An HR user granted `CHECKLIST_ITEM_COMPLETE_HR` could PATCH an item but could never list items to learn its id. The migration must also grant `CHECKLIST_READ` to HR/LICENSING/ONBOARDING/ACCOUNTING/MANAGER. Otherwise the design ships a write path nobody can reach, which is rule #12's "table with no inflow" in a new form.

**M2 — Leaving out IT breaks the precedent and does not compile cleanly.**
The design copies a pattern that has 5 values (F4) and ships 4. A `checklistItemCompleteFor(Department)` helper written like `checklistTemplateManageFor` (`RecruitPermission.java:161-168`) is an exhaustive `switch` expression. It will not compile without an `IT` case, and the design gives no answer for that case. With `_ANY` dropped, IT items (`V067:121-124`) are completable by ADMIN only, not MANAGER. That contradicts the design's own "ADMIN/MANAGER can do everything". **Fix:** add `CHECKLIST_ITEM_COMPLETE_IT` and leave it unseeded, the same way `CHECKLIST_TEMPLATE_MANAGE_IT` is unseeded (`RecruitPermission.java:145-151`, `V067:150-151`). Grant it to MANAGER.

**M3 — "NA requires a reason + an audit row" has no storage, and reopen destroys the trail.**
- `checklist_items` has no reason or note column (`V001__init.sql:177-193`; entity `ChecklistItemEntity.java:42-85`).
- There is no generic audit table. The unified audit stream is a fixed union of history tables: owner, stage, setting, merge, grant, offer (`AuditEventRow.java:13-22`). "The existing audit trail" in the design does not name anything real.
- `reopen()` would null or overwrite `completed_by`/`completed_at`, so after reopen → complete the first completion (who, when, NA with what reason) is gone. That is the history the NA-accountability argument depends on.
- **Fix, either:** (a) a `checklist_item_history` table (item_id, candidate_id, from_status, to_status, actor_id, reason, occurred_at), written in the same transaction on **every** status write, not only NA, and added to `AuditServiceImpl` as a new kind. This matches the `offer_history` (V046) and `stage_history` pattern. Or (b), at minimum, an `ActivityEntity` SYSTEM/internal row per write, the same shape as `revive` (`CandidateServiceImpl.java:600-607`). (a) is the house pattern for audited state machines; (b) is cheaper, but the manager Exceptions screen cannot count it.

**M4 — Circular bean dependency if the service recomputes the gate.**
`CandidateServiceImpl` already injects `ChecklistItemService` (`CandidateServiceImpl.java:111`). If `ChecklistItemServiceImpl.complete()` injects `CandidateService` to recompute or transition, the constructor-injection cycle fails at boot. The repo does not set `allow-circular-references` (grep of `src/main/resources` + `build.gradle.kts`: 0 hits), and the codebase already breaks one cycle with `ObjectProvider<FollowUpRemover>` (`:98`). With B1 applied this goes away. If any cross-service step survives, orchestrate it in `ChecklistFacadeImpl`, not in the service.

**M5 — Migration version V096 is already taken by an unmerged branch.**
The next free number on master is V096 (highest is `V095__candidate_pending_call.sql`). But `origin/feat/recruit-api-client` (commit `99590b1`, no PR yet) already carries `V096__packs_writeback_actor_email.sql`. Two V096 files merge cleanly in git and then the service does not boot. Use **V097**, or coordinate with that branch before either merges. Also: `SchemaDocFreshnessTest` checks the `<!-- schema-doc: migrations=N highest=V### -->` marker against the migration files on disk (`SchemaDocFreshnessTest.java:40-60`). **Any** new migration, even seed-only, needs `python3 scripts/gen-schema-doc.py` and the regenerated `docs/SCHEMA.md` in the same PR, or CI goes red.

**M6 — The business's 100% gate (T5) cannot be expressed by this gate, and auto-advance would lock that in.**
See F7. `ONB_SETUP_CALL` is created *by* S7, so "setup call" can never be an S7 precondition in the current template model. This is not for 5pb2 to fix. It is a BA question: should `ONB_SETUP_CALL` move to `ON_ENTER_S6`? It must be filed before anyone builds on "complete everything → S7" as if it matched what HR and Onboarding described.

### MINOR

**m1 — Reopen after S7: say explicitly that it never changes the stage.**
The stage machine allows S7→S6 (F6). A manual demote re-runs `generateOnEnterS6`, which is idempotent per (candidate, template[, state]) (`ChecklistGeneratorImpl.java:44-47`, `LicensingItemGeneratorImpl.java:87-90`), and `enqueueOnJoin`, which is memo-guarded once per candidate (`HrHandoffEnqueuer.java:89-96`). It is recorded as an ordinary `stage_history` row (`CandidateServiceImpl.java:639-640, 818-829`). So a demote "works" today without corrupting anything, and the gate is point-in-time by Q12's design. `reopen` must not demote on its own. Put that in the method's javadoc.

**m2 — The generator's idempotency is sequential only.**
If B1 is kept against advice, note that `generateFlat` is exists-then-insert (`ChecklistGeneratorImpl.java:44-55`) with **no unique index** on `checklist_items` (`V001:195-197`; `V067:44` is non-unique). `transition()` loads the candidate with no lock (`CandidateServiceImpl.java:616`), so two concurrent S6→S7 calls both pass `:617` and both write history and items. The race exists today, but a human double-clicking is rare, while two departments finishing their last items at the same moment is common. House patterns to use: `PESSIMISTIC_WRITE` find (`OfferServiceImpl.java:264-268`) or a conditional `UPDATE … WHERE stage = 'S6'` (`CandidateServiceImpl.java:286-296`, `HrHandoffEnqueuer.java:95`). Also, re-completing an item on an S7 candidate would hit "already in stage" (`:617-619`) and roll back the tick unless it is guarded by a `stage == S6` check first.

**m3 — Two users completing the same item: last write wins on `completed_by`.**
No lock or version exists (entities have no `@Version`, `CandidateServiceImpl.java:288`). Use a conditional update (`WHERE status <> 'DONE'`) or a `PESSIMISTIC_WRITE` find, so the second caller gets a 400 instead of silently overwriting the audit.

**m4 — `assignee_id`: leaving it NULL is correct. Don't write it from `complete()`.**
Its only reader is `CandidateCastAssembler.java:257-270`: assignees of **open** items become omni cast parties (`CandidateCastRole.java:41-44`). It has zero writers today (`ActivityServiceImpl.java:294-299`). Using it for "who completed" would duplicate `completed_by`, and a later `reopen` would silently add a person to the cast with no `CandidateCastPush`. If an assign path is ever built, complete and reopen must trigger a cast push.

**m5 — BLOCKED / IN_PROGRESS: nothing depends on them yet, but the endpoint shape should allow them.**
`BLOCKED` and `IN_PROGRESS` are referenced only through `OPEN_STATUSES` (`ChecklistSlices.java:20-21`) and `isOpen()` (`ChecklistItemStatus.java:8-10`). No queue or report reads them specifically. A single `PATCH /checklist-items/{id} {status, reason}` supports all five statuses for free, instead of three bespoke verbs. Recommend accepting `BLOCKED` with a required reason (same rule as NA), since a blocked item is exactly what Onboarding says it cannot see today.

**m6 — Remove the stale "hollow table" comment.**
`V035__hollow_table_warnings.sql:15` still says `checklist_items` has "chưa có entity, chưa có reader" (no entity, no reader). V035's own header says to replace that comment in the migration that fills the table (`V035:10`). The new migration should `COMMENT ON TABLE checklist_items` with the real state. Do not edit V035 (Flyway checksum, `docs/GOTCHAS.md` §0).

**m7 — Granting to ADMIN is a no-op.** ADMIN holds `"*"` (`V003:8`, `RecruitPermission.java:153-154`). Drop it from the migration, the same way V067 does not grant ADMIN.

**m8 — Naming.** `CHECKLIST_READ`'s javadoc tells the first write path to add a `CHECKLIST_MANAGE` "alongside" it (`RecruitPermission.java:116-121`). Either follow that or update the javadoc in the same PR. Otherwise the enum documents a permission that will never exist.

**m9 — Rule #15.** `docs/STATUS.md:46` must change in the same PR. It currently cites `docs/DESIGN-LICENSING-ONBOARDING-2026-09-13.md`, which does not exist in the repo (`find` over `agentflow/`, depth 4: 0 hits). Fix that dangling link while there.

**m10 — Rule #9.** No violation as designed. If a minimum reason length gets added for NA/BLOCKED, it must be a `recruit_settings` key, not a `static final int`.

**m11 — Out of my lane, noted once.** `recruit.rbac.enforce` defaults to `false` (`application.yml:147`). Until it is on, every per-department permission in this design is advisory. The security reviewer should confirm per-environment values.

---

## 3. Recommended scope (replaces design items 1–6)

1. `RecruitPermission`: `CHECKLIST_ITEM_COMPLETE_{HR,LICENSING,ONBOARDING,ACCOUNTING,IT}` plus `checklistItemCompleteFor(Department)` (exhaustive switch).
2. Migration **V097** (coordinate with the V096 branch): grant each department's permission to its role (IT unseeded). Grant all five to MANAGER. **Grant `CHECKLIST_READ` to the four department roles + MANAGER.** Create `checklist_item_history`. Replace the V035 comment. Regenerate `docs/SCHEMA.md`.
3. `ChecklistItemService.updateStatus(itemId, toStatus, reason, actorId)`: conditional or locked write. Set `completed_by`/`completed_at` on DONE/NA and clear them on reopen. Write a history row every time. Reason is required for NA and BLOCKED. **Never touches the candidate's stage.**
4. `ChecklistFacadeImpl`: load the item, then `require(checklistItemCompleteFor(item.getDepartment()))`, then delegate. Controller: `PATCH /api/v1/checklist-items/{id}`.
5. Optional: read-only onboarding readiness (the blocker list). The S6→S7 move stays human.
6. File for BA: T5's "setup call" is created after the gate (M6); Q25 is still pending.
