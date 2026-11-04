# Review — `hr_status` → `ON_HR_COMPLETE` plan (data correctness & mechanism)

Reviewed against `origin/master` @ `2a7fe3d4ebc7a513a0403f84522a12ab0705f7f4` (recruit-be, fetched
2026-09-23), plus `/Users/apple/Projects/agentflow/packs` working tree.

**Verdict: IMPLEMENT WITH CHANGES.** The plan's premise is correct and better-supported than the
plan itself argues. But three of its four steps are wrong in mechanism, and step 1 is probably
unnecessary. Changes are listed in §7.

---

## 1. Claims in the brief — verified

| # | Claim | Result |
|---|---|---|
| 1 | `hrRunning()` reads `str(row,"hr_status")`, returns `hr != null && !"not_initiated".equals(hr)` | **TRUE** — `MosoRowMapper.java:799-802` |
| 2 | That is the ONLY use of `hr_status` | **TRUE** — used at `:517` and `:753` only, both via `hrRunning` |
| 3 | The value is discarded, not stored | **TRUE** — `legacyRef()` (`MosoRowMapper.java:1072-1117`) enumerates its keys explicitly and `hr_status` is not among them |
| 4 | `EVIDENCE.md` records `HR Completed → ticket 14 (Setup Call)` | **TRUE** — `docs/EVIDENCE.md:109` |
| 5 | `V067` seeds `ONB_SETUP_CALL` with `ON_100_ONBOARDED` | **TRUE** — `V067__checklist_templates.sql:132` |
| 6 | Trigger enum today is the three named | **TRUE** — `ChecklistTemplateTrigger.java` |

No claim in the brief was found false. The two corrections below are to the *plan*, not the brief.

---

## 2. The `hr_status` vocabulary — FOUND

Source of truth: `packs/loan/src/main/java/com/mvu/loan/shared/entity/LORecruiting.java:513-545`,
`enum HrStatus`. Five values, matching `docs/MIGRATION-SPEC.md:21` ("`hr_status` (5 bậc)"):

| Wire value (`name()`) | UI label (`toString()`) |
|---|---|
| `not_initiated` | HR not initiated |
| `pending_bgc_or_az_docs` | Pending BGC |
| `done_bgc_or_az_docs` | Done BGC |
| `in_progress` | HR onboarding |
| **`completed`** | **HR Completed** |

**The completed value is the bare string `completed`** — not `hr_completed`, not `HR Completed`.
The wire carries `name()`, which is what `MosoRowMapper.str()` already compares against for
`not_initiated` (`:801`) and for `nmls_status` (`:805-807`). Independently corroborated by
`docs/FEEDBACK/03-hr.md:50` quoting `bean.is(hr_status, HrStatus.completed)` from the live rule.

Step 3 is therefore unblocked on vocabulary.

---

## 3. BLOCKERS

### B1 — Step 3 has no place to fire. Checklist generation is not reachable from the MOSO path.

`ChecklistGenerator` is called from exactly two sites, both inside `CandidateServiceImpl.transition()`
(`CandidateServiceImpl.java:650`, `:658`). The javadoc at `:651-655` states the rule explicitly:

> "ONLY this branch (stage == S6, gate already passed above) and ONLY here — **never from the MOSO
> ingest paths, which set stage directly and never call `transition()`**."

`MosoRowUpsertServiceImpl` writes `existing.setStage(...)` directly (`:402`) and never calls
`transition()`. So an `hr_status` transition arriving by webhook has **no path to the generator at
all**. The plan says "fire that trigger when `hr_status` transitions" without naming a call site,
and there isn't one — this is new wiring, not a one-line addition, and it deliberately crosses a
boundary the code documents as never-crossed.

This is the single largest gap in the plan.

### B2 — Migration version. The next free version is **V100**, not V098.

- `origin/master` max = **V097** (`V097__checklist_item_status_write_path.sql`).
- **V096 does not exist on master** — a real gap.
- `origin/feat/recruit-api-client` (unmerged) carries **V098** and **V099**
  (`V098__packs_writeback_actor_email.sql`, `V099__packs_writeback_mail_requested_at.sql`).
  Measured with `git ls-tree -r --name-only origin/<branch>` over all 30+ remote branches; no other
  branch carries a migration absent from master.

Note V097's own header comment says V096 was taken by that branch — it has since been **renumbered
to 098/099**, so that comment is now stale. Do not reuse the V096 gap either: it sits below
master's applied baseline and would be an out-of-order Flyway insert. **Use V100.**

A duplicate version merges cleanly in git and then the service will not boot, and neither PR's CI
can catch it (each branch is internally consistent).

### B3 — `ChecklistGeneratorImpl`'s dedupe is a TOCTOU race, and nothing backstops it.

`ChecklistGeneratorImpl.generateFlat` dedupes with `entityService.exists(...)` then `save(...)`.
`V067:44-45` creates only a **plain** index on `checklist_items.template_code` — there is **no
unique constraint** on `(candidate_id, template_code)`. Today this is latent: generation only ever
runs from a human-driven `transition()` call. Move the trigger onto the webhook path, where MOSO
resaves arrive continuously and concurrently, and two in-flight pushes both pass `exists()` and both
insert. The plan's step 3 converts a dormant race into a live one.

---

## 4. MAJOR

### M1 — `getProperties()` omits valueless properties, so `hr_status` can be ABSENT from a push.

`MosoRowUpsertServiceImpl.java:417-419` and again `:503-505`:

> "MOSO cannot express [an erase]: `getProperties()` omits any property without a value, so 'the
> recruiter cleared it' and 'this push didn't carry it' arrive identical."

Confirmed at the sender: `ExportLORecruitingForMigrationOp.java:136` builds the row as
`new LinkedHashMap<>(bean.getProperties())`, and `SendLORecruitingToRecruitOp.java:23-26` states the
webhook uses that same shape. So **webhook and import carry the identical field set** — the brief's
worry about divergent shapes is unfounded *for this field* — but "every webhook carries `hr_status`"
is false. A row whose `hr_status` was never explicitly set carries no such key.

Consequence: a persisted `hr_status` column **must** use the repo's `copyIfPresent` / "fill, never
empty" rule (`MosoRowUpsertServiceImpl.java:414-420`). An unconditional copy would wipe the stored
value on every push that omits the field — and if the trigger keys off the stored value, that is an
oscillating fire/unfire loop.

### M2 — It can go backwards, and legacy has the same bug already.

`docs/FEEDBACK/03-hr.md:79` records that the legacy `joined` rule
(`LORecruiting.java:755-760`) is **edge-triggered and does not self-revoke**: a row can reach
`100% onboarded` and then have `hr_status` demoted, leaving an inconsistent pair. The same is true
here. `completed → in_progress` is reachable (it is a hand-set dropdown).

The correct behaviour for an already-generated `ONB_SETUP_CALL` is **leave it** — checklist items
are work that was genuinely filed, and `V097`'s history ledger exists precisely so a re-open is
recorded rather than erased. But the trigger must **latch**: fire once per candidate, never re-fire
on a completed → demoted → completed cycle. `exists()` gives this incidentally; B3's race is the
only hole.

### M3 — The plan's step-4 premise is right, and provable more strongly than the plan argues.

The brief asks whether `V067`'s own comment states a reason `EVIDENCE.md` does not contradict. It
does not — and it is worse than a bare disagreement. `V067:127-129` reads:

> `-- ON_100_ONBOARDED: the next phase's work, fired once the S6->S7 gate passes — old ticket`
> `-- 08 HR + 00 LO Support (training; assign Support Specialist/Processor), EVIDENCE §5.`

The block **cites EVIDENCE §5 as its source**, and names tickets **08 and 00** — which is exactly
what `EVIDENCE.md:109` assigns to `100% onboarded`. The comment is accurate for the two rows it
describes. Then `ct-onb-setup-call` (ticket **14**) was inserted into that same block
(`V067:132`) with the description `'Old ticket 14 — Setup Call, fired on 100% onboarded.'`

So this is not two records disagreeing. It is **one record (V067) misreading the single source it
cites**: `EVIDENCE.md:109` assigns ticket 14 to `HR Completed`, in the same sentence, separated by a
`·` from the `100% onboarded` clause. Ticket 14 was swept into the wrong block.

`EVIDENCE.md` is also the better evidence independently: it is sourced to a PDF of the live legacy
Automation-configuration screen (`/escalation_desk/Company_tickets`, captured 12/08), whereas
`V067`'s line is a derived restatement with no second source.

**Step 4 is correct.** Caveat carried forward: `EVIDENCE.md:109`'s own closing note says the legacy
rule inputs are all hand-set dropdowns — so "ticket 14 fires on HR Completed" describes a rule whose
input is a human click, not a computed state. That is a product question, not a data one.

### M4 — Existing rows: three populations, all left wrong by a seed-only change.

`ChecklistTemplateService.activeByTrigger(trigger)` is read at generation time only; nothing re-reads
a template's trigger for an already-generated item (`ChecklistGeneratorImpl.generateFlat`). So
changing the seed changes **new generation only**. Three populations:

1. **Already at S7, item generated under `ON_100_ONBOARDED`** — keeps its item. Correct; leave it.
2. **Already at S6 with `hr_status = completed` today** — will never get the item. The transition
   already happened before the detector existed, and with `hr_status` unstored there is no baseline
   to compare against. These candidates are **silently skipped**. Note `hrRunning` treats
   `completed` as "running" (`:801` tests only `!= not_initiated`), so every HR-completed legacy row
   maps to **S6** (`:753`) — this population is not small.
3. **At S6, `hr_status` not yet completed** — served correctly by the new trigger.

Population 2 needs an explicit decision. A backfill is possible (`hr_status = completed` ∧ stage
∈ {S6,S7} ∧ no `ONB_SETUP_CALL` item) but would file work for people who onboarded long ago. My
recommendation: **do not backfill; state the cutover in the migration comment.** Filing a stale
"schedule setup call" task for an LO who joined last year is worse than the gap. This must be a
stated decision, not an omission.

---

## 5. MINOR

- **m1 — Column type: free string, not an enum.** MOSO owns the vocabulary and can add values
  without deploying recruit. The repo's own precedent is raw string: `legacyRef` stores
  `status`, `out_source_status`, `recruiting_type` verbatim (`MosoRowMapper.java:1074-1077`), and
  `MosoRowMapper` compares legacy vocabularies as string literals throughout (`:753`, `:801`,
  `:805-807`). An unknown value must degrade to "not completed", never throw on ingest.
- **m2 — `docs/SCHEMA.md` regeneration.** Confirmed: `docs/GOTCHAS.md:183-197` — Homebrew Postgres
  14.18 on :5432 dies at `V093`; use the `recruit-postgres` container on **:5433** (Postgres 18).
  `SchemaDocFreshnessTest` fails CI otherwise. Applies only if a column is actually added (see §6).
- **m3 — Duplicate notification.** `LORecruiting.java:757-760` already sends an email to the
  record's `onboarding_specialist` on `hr_status → completed`
  (`sendEmailWhenHrCompleted`, defined at `:1205`), corroborated by
  `docs/FEEDBACK/02-onboarding.md:238`. If the new checklist item also notifies, Onboarding gets
  told twice for the same event.

---

## 6. WHAT THE PLAN MISSED — the valuable part

### X1 — The transition-detection mechanism already exists, and step 1 is probably unnecessary.

`MosoRowUpsertServiceImpl.java:159-169` is exactly the "fire on a TRANSITION, not on a value"
pattern the brief asked me to look for:

```java
// READ THE SNAPSHOT BEFORE copyMappedFields — it replaces legacy_ref wholesale a few lines
// down. Computed after, every label would compare equal to itself ...
final Map<String, Object> storedRef = existing.getLegacyRef();
final boolean raisedAgain = handRaise
        && (MosoRowMapper.carriesNewEventLabel(row, storedRef, ...)
            || MosoRowMapper.carriesNewerRegistration(row, storedRef));
copyMappedFields(...);   // :170 — overwrites legacy_ref
```

`legacyRef` is a per-candidate JSONB snapshot of the previous MOSO payload, rebuilt wholesale on
every push (`:485`). Two detectors already ride it. Adding `"hr_status"` to the `legacyRef()` map
(`MosoRowMapper.java:1072`) gives an exact previous-value baseline with:

- **no new column**, **no migration**, **no `docs/SCHEMA.md` regeneration**, no B2 and no m2;
- the comparison point already computed, already commented, already tested;
- the debounce/idempotency problem solved for free — `prev != "completed" && incoming == "completed"`
  is true on exactly one save out of N repeats, which is precisely what the brief asked for.

Trade-off, stated honestly: `legacyRef` is JSONB and not indexed, so it cannot be filtered on
efficiently. **If** `hr_status` is wanted as a queryable candidate attribute (a dashboard filter, a
slice), a real column is the right call and B2/m1/m2 apply. **If** it is wanted only to drive the
trigger — which is all the plan states — `legacyRef` is the established pattern and step 1 should be
dropped.

Note `latchRegistrationBaseline` (`MosoRowMapper.java:430-480`) exists because one `legacyRef` key
must never move backwards. `hr_status` needs the *opposite* — it must be free to move backwards
(M2) — so it needs no latch, but the M1 absent-key case still applies: an absent `hr_status` in the
incoming row must leave the stored key untouched, or the next push reads as a fresh
`null → completed` transition and re-fires.

### X2 — recruit already has a native "HR is done" signal, and it is a better trigger.

`V067:85` seeds `ct-hr-complete` / **`HR_COMPLETE`** — *"HR completion sign-off: HR marks its
portion of onboarding complete"*, department `HR`, trigger `ON_ENTER_S6`. Since **V097** this item
is writable: `V097__checklist_item_status_write_path.sql` shipped the write path precisely because
"nothing anywhere set DONE, so the onboarding pipeline had no terminal state and Onboarding had to
chase HR and Licensing by e-mail to learn what was finished."

So the choice is not "add `ON_HR_COMPLETE` or leave `ONB_SETUP_CALL` misfiled". It is:

| Option | Trigger source | Depends on |
|---|---|---|
| A (the plan) | MOSO `hr_status → completed` | a legacy hand-set dropdown, the webhook path, B1's new wiring, B3's race |
| B | `HR_COMPLETE` checklist item → `DONE` | recruit's own write path (V097), in-process, already transactional |

**B is strictly better on mechanism** and is a truer port of the legacy intent — `EVIDENCE.md:109`'s
own verdict on the legacy rules is that "the broken point is not the rule but the INPUT: every
condition is a hand-clicked dropdown, and the 'work' produced is prose tickets instead of checklist
items with state." Option A ports the rule *and its broken input*. Option B replaces the input with
the thing recruit built to replace it.

Option B's cost: HR must actually tick the item in recruit. Per `docs/FEEDBACK/03-hr.md` Note 1,
Bao's working hypothesis (explicitly flagged as **unverified**, and the basis of D77) is that HR
lives in `hr.loanfactory.com` and does not work inside this app at all. If that holds, nobody ticks
`HR_COMPLETE` and option B never fires. **This is the real decision**, and the plan does not
acknowledge that the choice exists. It is a product question — flagging it for the other reviewer.

A defensible middle path: fire `ON_HR_COMPLETE` from **either** source (item → DONE, or
`hr_status → completed`), with the `exists()`/unique-constraint dedupe making double-fire harmless.

### X3 — The `hr_handoff_outbox` is not a usable "HR done" signal (checked, negative).

`CandidateEntity.java:532-535` and `HrHandoffEnqueuer.java:15-22`: the outbox is written **once, on
S5→S6 join**, is "set exactly once and never reset", and signals *HR handoff started*, not finished.
`HrHandoffEnqueuer.enqueueOnJoin` is called from `CandidateServiceImpl.java:656`, the S6 branch. It
is the wrong end of the process. Ruled out.

### X4 — The 100% computation has nothing usable either (checked, negative).

`CandidateServiceImpl.blockingMandatoryChecklistItems` (called `:628`) computes completion from
mandatory checklist items, and `assertJoinedGate` (`:787-803`) checks only for a SIGNED offer with
fee PAID/WAIVED. Neither reads `hr_status` or any HR-completion signal. Ruled out.

---

## 7. Verdict — implement with these exact changes

1. **Drop step 1** (new column + `MosoRowMapper` field mapping) unless `hr_status` must be
   *queryable*. Instead add `ref.put("hr_status", str(row, "hr_status"))` to `legacyRef()`
   (`MosoRowMapper.java:1072`), guarded so an absent incoming key does not clear the stored one
   (M1). If a real column is required after all, use **V100** (B2), `VARCHAR` not an enum (m1),
   `copyIfPresent` semantics (M1), and regenerate `docs/SCHEMA.md` against port **5433** (m2).
2. **Keep step 2** — add `ON_HR_COMPLETE` to `ChecklistTemplateTrigger`. Update the enum javadoc
   ("narrowed to the three triggers") and `V067`'s `trigger` column comment
   (`V067:26`) and the `COMMENT ON TABLE` text, both of which enumerate the three.
3. **Rewrite step 3.** Name the call site. If firing from MOSO, it must be new wiring in
   `MosoRowUpsertServiceImpl` alongside the `raisedAgain` block (`:166-169`), reading `storedRef`
   **before** `copyMappedFields` at `:170`, and it must be documented as a deliberate exception to
   the "never from the MOSO ingest paths" rule at `CandidateServiceImpl.java:651-655`. **Before
   writing it, settle X2** — firing off `HR_COMPLETE → DONE` instead avoids B1 and B3 entirely.
4. **Add a unique constraint** on `checklist_items (candidate_id, template_code)` in the same
   migration (B3), and handle the conflict in `generateFlat`. Required for any trigger reachable
   from the webhook path; cheap insurance either way.
5. **Keep step 4** — the re-seed is correct, and §M3 gives it a stronger basis than the plan used.
   State the no-backfill decision for population 2 (M4) in the migration comment rather than
   leaving it unaddressed.
6. **Check m3** before shipping — legacy already emails Onboarding on this exact event.

## 8. What I searched and did not find

- `grep -rn "enum HrStatus" packs moso moso-aid` → one hit (plus its `target/classes` copy). No
  second vocabulary definition anywhere in the legacy tree.
- `git grep -n "hr_status\|hrRunning\|hrStatus" origin/master` → no usage in recruit-be outside
  `MosoRowMapper` (2 call sites), its test, `scripts/migration-reconcile.py:100-101`, and prose docs.
- `git grep -n "generateOnFullyOnboarded\|generateOnEnterS6" origin/master -- src/main` → the two
  `CandidateServiceImpl` call sites only. No other caller exists.
- Migration versions enumerated across **every** remote branch via
  `git ls-tree -r --name-only origin/<branch>`, not `git branch -r` inspection.

`grep` returning nothing is not proof of absence; the above says what was searched.
