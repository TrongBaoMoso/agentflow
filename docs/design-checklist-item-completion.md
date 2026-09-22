# Design — checklist item completion (the missing write path)

**Status:** proposal, awaiting one business decision · **Date:** 2026-09-22
**Measured against:** `recruit-be` `origin/master` @ `a689126`

## Problem

`checklist_items` can be created but never finished. `ChecklistItemService` exposes three
methods, all reads. The only two writers set `status = OPEN`
(`ChecklistGeneratorImpl:52`, `LicensingItemGeneratorImpl:105`).

`CandidateServiceImpl:747` defines "100% onboarded" as *every mandatory checklist item
DONE/NA*. Nothing can become DONE, so **S6→S7 is unreachable through the API**, and the
onboarding pipeline that HR (06/08) and Onboarding (17/08) both organise their work around
has no terminal state.

## What already exists — nothing here needs inventing

| Piece | State |
|---|---|
| `checklist_items.status` | `OPEN, IN_PROGRESS, DONE, BLOCKED, NA` — all five defined |
| `completed_by`, `completed_at`, `assignee_id` | columns exist, nothing writes them |
| `ChecklistController` | 3 GET endpoints, no writes |
| Per-department permission pattern | `CHECKLIST_TEMPLATE_MANAGE_{HR,LICENSING,ONBOARDING,ACCOUNTING}` — an exact precedent to copy |
| Seeded roles | `ADMIN, MANAGER, RECRUITER, OFFICER_RECRUITER, LO_SUPPORT, ONBOARDING, LICENSING, ACCOUNTING, PRE_LEDGER` — note: **no `HR` role is seeded** |

## The decision

`Department` is *"a label on WORK, not on PEOPLE — the app has no table of staff"* (D77/D79).
So "HR marks HR's work done" has to be expressed through permissions.

**Option A — strict (per-department).** Four new permissions
`CHECKLIST_ITEM_COMPLETE_{HR,LICENSING,ONBOARDING,ACCOUNTING}`, each granted to its role.
Plus `CHECKLIST_ITEM_COMPLETE_ANY` for ADMIN/MANAGER, mirroring the existing
`CANDIDATE_OVERRIDE_GATE` escape hatch.

**Option B — loose (single).** One `CHECKLIST_ITEM_COMPLETE`; anyone holding it completes any
department's item.

## Recommendation: **Option A (strict)**

Four reasons, the last one decisive.

1. **The precedent is already in the codebase.** `CHECKLIST_TEMPLATE_MANAGE_*` is the same
   shape for the same table. Option A copies a pattern; Option B introduces a second,
   inconsistent one.
2. **`department` is the only thing the table models.** A global permission discards the one
   distinction the column exists to carry.
3. **The downstream rules need it.** The 100% gate is *HR complete + sponsorship approved +
   `setup call`* — three gates owned by three departments. Yến's T1–T10 are all
   department-addressed. Under Option B you can record *that* an item was completed but not
   meaningfully *by which department*, so those rules become unimplementable later without a
   schema change.
4. **The reversibility is asymmetric — this is the decisive point.**
   - Strict → loose later = grant all four permissions to everyone. One seed row. Free.
   - Loose → strict later = you must reconstruct who-completed-what for rows already written.
     `completed_by` gives you a user, but with no staff table there is no way to derive their
     department retroactively. **That data is unrecoverable.**

   Choose the option you can undo.

### Why "we can rebuild from scratch" does not change this

Being pre-release with read-only users and disposable staging data lowers the *cost of being
wrong* — it does not change *which option is right*. It does two useful things: the Flyway
checksum trap is no longer a reason to hesitate, and Option A's extra work (4 enum values +
one seed migration, perhaps 30 lines) stops being worth avoiding. It argues **for** A, not
against it.

## REVISED SCOPE — after adversarial review, 2026-09-23

Two independent reviewers (domain + security) verified the design against the code. Both
reached **"proceed with changes"**. Their corrections are folded in below. Five claims in the
original design were false; they are listed at the end.

### Dropped entirely

**Auto-advance S6→S7 on completion.** Three independent reasons, each sufficient:
1. **Wrong mechanism.** The gate is not a trigger to recompute — it is a guard evaluated inside
   `transition()` (`CandidateServiceImpl:747-770`). Nothing is stored to recompute.
2. **Privilege escalation.** `transition()` has no permission check; `CANDIDATE_TRANSITION` is
   enforced only in the facade (`CandidateFacadeImpl:185-193`). An HR user ticking the last item
   would move the stage and fire `generateOnFullyOnboarded` without holding that permission.
3. **It would not even boot.** `CandidateServiceImpl:111` already injects `ChecklistItemService`.
   Calling back the other way is a circular dependency, and `allow-circular-references` is not
   set — Spring fails at startup.

Completion writes the item and nothing else. The S6→S7 move stays a human action.
Optional follow-up: a read-only "readiness" endpoint so a UI can show what still blocks.

### Final scope

1. **`RecruitPermission`** — add **5** values, not 4: `CHECKLIST_ITEM_COMPLETE_{HR,LICENSING,
   ONBOARDING,ACCOUNTING,IT}`. `IT` is required: `Department` has five values and the
   per-department helper is an exhaustive switch that will not compile without it
   (`RecruitPermission:151`, `:161-168`). Leave `IT` unseeded, following the
   `CHECKLIST_TEMPLATE_MANAGE_IT` precedent.
2. **Migration `V097`** (not V096 — `V096__packs_writeback_actor_email.sql` is taken by the
   unmerged `origin/feat/recruit-api-client`; a duplicate version merges cleanly and then the
   service will not boot). It must:
   - seed the 5 permissions, grant each to its matching role;
   - **also grant `CHECKLIST_READ`** to HR / LICENSING / ONBOARDING / ACCOUNTING / MANAGER — it
     is currently granted to **no role at all**, and `RECRUIT_RBAC_ENFORCE=true` on both staging
     and production, so without this every department gets 403 on reads and completion is a
     blind write;
   - **not** grant anything to `ADMIN` — it holds `["*"]` and `hasPermission` honours the
     wildcard (`AccessControlServiceImpl:57-60`), so an ADMIN grant is a no-op;
   - replace the stale `V035` hollow-table COMMENT for `checklist_items` (never edit `V035` —
     Flyway checksum).
   - regenerate `docs/SCHEMA.md` — `SchemaDocFreshnessTest` fails CI for any new migration.
3. **`checklist_item_history` table**, written on **every** status change. There is no column for
   an NA reason (`V001:177-193`) and no generic audit table — the audit stream is a fixed union
   of history tables (`AuditEventRow:13-22`). Without this, `reopen` silently overwrites
   `completed_by`/`completed_at` and the NA reason has nowhere to live. Add it to
   `AuditServiceImpl`.
4. **One endpoint, not three.** `PATCH /checklist-items/{id}` taking `{status, reason}` and
   covering all five statuses. Simpler than `complete`/`markNotApplicable`/`reopen`, and it
   makes `BLOCKED` reachable — `BLOCKED` counts as open, so a department must be able to say
   "stuck" rather than being forced to choose DONE or nothing.
5. **Reason required for `NA` and `BLOCKED`.** Both change what the gate sees without the work
   being done.
6. **Gate with `hasPermission` + an explicit 403**, never `require()` — `require()` passes
   whenever `recruit.rbac.enforce` is false, and false is the default
   (`application.yml:147`). House pattern to copy: `ChecklistTemplateFacadeImpl:71-78`.
7. **Cross-service work goes in the facade**, not the service (see the circular dependency above).
8. **Conditional update** on the status write — two users completing the same item otherwise
   race on `completed_by`, last write wins.

### Deliberately NOT in scope

- `assignee_id` stays NULL. Its only reader is `CandidateCastAssembler:257-270` (the omni
  conversation cast); writing it would bypass the cast push.
- Reopen must never demote a stage. A manual S7→S6 is legal and safe today — regeneration is
  idempotent and the HR handoff is memo-guarded (`HrHandoffEnqueuer:89-96`) — but this bead does
  not touch stages at all.
- The frontend screen.
- Any notification (recruit-be has no message transport).
- **Auditing template edits.** A wider bypass than NA already exists and is unaudited:
  a department can set its own template `mandatory=false` or `active=false`
  (`UpdateChecklistTemplateRequest:36,50`), and the gate reads the *current* flag
  (`CandidateServiceImpl:756-767`), so one edit drops that item for every candidate. Template
  edits are not in the audit stream. Filed separately — the NA rule here does not close it.

### Claims in the original design that were false

| Claim | Truth |
|---|---|
| "No `HR` role is seeded" | It is — `V003:13`, and `V067:142` already grants it `CHECKLIST_TEMPLATE_MANAGE_HR`. My grep used `'[A-Z_]{3,}'`, which excludes a two-character code |
| "`PRE_LEDGER` is a role" | It is a grant-history reason (`V033:36`, `GrantChangeReason:13`) |
| "The precedent has 4 values" | It has 5, including IT (`RecruitPermission:151`) |
| "S6→S7 is unreachable" | Every template is `mandatory=FALSE`, so the gate blocks nothing and S7 is reachable today |
| "Grant all four to ADMIN/MANAGER, mirroring `CANDIDATE_OVERRIDE_GATE`" | That permission is seeded to ONBOARDING, not ADMIN/MANAGER (`V042:27-30`); and the ADMIN grant is a no-op |

### For the BA, not for this bead

The business definition of 100% onboarded — HR complete + sponsorship + `setup call` — **cannot
be expressed by this gate**. `ONB_SETUP_CALL` is an `ON_100_ONBOARDED` template (`V067:132`),
created *after* S7, while the gate reads only `ON_ENTER_S6` and `PER_SPONSOR_STATE`
(`:760-766`). The third gate sits downstream of the thing it gates.

---

## Original scope (superseded — kept for the record)

## Scope if A is approved

**Backend**
1. `RecruitPermission` — add 5 values (4 per-department + `_ANY`).
2. Migration — seed the 5 permissions; grant each department permission to its matching role,
   `_ANY` to ADMIN and MANAGER. **Open question:** no `HR` role is seeded today — either add
   one, or confirm HR staff sign in under `ADMIN`.
3. `ChecklistItemService` — add `complete(itemId, actor)`, `markNotApplicable(itemId, actor)`,
   `reopen(itemId, actor)`. Each sets `status`, `completed_by`, `completed_at`.
4. `ChecklistController` — `PATCH /checklist-items/{id}` gated on the department of the item
   being written, not on a global permission.
5. Recompute the 100%-onboarded gate on completion — `CandidateServiceImpl:747` already reads
   it; the write path must trigger the re-evaluation, and `generateOnFullyOnboarded` on S6→S7.
6. Audit — completion is a status change on someone else's work; it belongs in the existing
   audit trail.

**Not in scope:** the FE screen (separate, follows), and any notification on completion
(blocked — recruit-be has no message transport at all).

## Risks

- **Triggering S6→S7 automatically on the last item** is a state transition with side effects
  (`generateOnFullyOnboarded` creates the next department's items). It must be idempotent, and
  it must not fire from a `reopen` → `complete` cycle twice.
- **`NA` is not `DONE`.** The gate counts DONE/NA as satisfied; making `NA` freely settable
  gives every department a one-click bypass of its own gate. Suggest `NA` requires `_ANY`.
- **No `HR` role exists.** If HR staff currently sign in as ADMIN, granting
  `CHECKLIST_ITEM_COMPLETE_HR` to ADMIN silently gives it to everyone with ADMIN.

## The one question to answer

> **May one department complete another department's checklist item?**
> Recommendation: **no** — except ADMIN/MANAGER via `_ANY`.

Nothing in the transcripts answers this directly. Yến describes HR checking and marking its own
work (43:21). Miley describes onboarding having *no visibility* into HR/licensing progress and
chasing them by email (1:26:10) — which implies departments own their own ticks, but that is
inference, not testimony. Confirm with Miley or Yến; it is a ten-second question.
