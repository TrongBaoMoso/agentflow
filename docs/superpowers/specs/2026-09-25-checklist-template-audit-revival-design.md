# Checklist template audit: revival design (agentflow-s62y), v3

- Status: **DESIGN v3, final.**
  - Confirm round: Reviewer B = APPROVE; Reviewer A = APPROVE once HIGH-1, MED-1 and MED-2 are in. v3 applies them and everything else from that round.
  - v1 got APPROVE-WITH-CHANGES from both independent reviewers (A: correctness, B: product). The lead resolved the points where they differed (R1–R3 below).
- **Re-verified for v3 on a fresh `git fetch`, 2026-09-25 13:33Z:**
  - recruit-be `origin/master` = `b451cf7e` (#430 merged: the migration dir now tops at V124, and D143 is used).
  - recruit-fe `origin/master` = `d6aa897`.
  - recruit-fe `origin/production` = `a850759`, which does **not** contain #229 (`git merge-base --is-ancestor d6aa897 origin/production` → false).
- This revives recruit-be PR #400 and recruit-fe PR #216 (both draft, parked 2026-09-23; see `docs/parked/checklist-template-audit.md`). Per R3 the work lands as **fresh PRs**, and those two are linked and then closed.
- **Re-verified for v2 on a fresh `git fetch`, 2026-09-25:**
  - recruit-be `origin/master` = `c8c2a4b5` (#433). The migration dir still tops at V123.
  - recruit-fe `origin/master` = `d6aa897` (#229).
  - Every `file:line` below was re-read on those commits.
  - `docs/DECISIONS.md` on master has no decision covering a template-edit ledger. D135, D136 and D140 are binding inputs and nothing below contradicts them.

---

## v3.1 (Reviewer A final check, applied by the lead 25/09)

- MED-1b: `COALESCE(r.params ->> 'when', '')` in the per-state S6 count; new fixture c6 (rule without `when`, SPONSORED, no item → counted); expected A2 count 2; new mutation row.
- LOW: fixture-only state codes; `TemplateMigrationsWriteHistoryTest` requires exactly one ledger migration. `@>` deviation accepted by A (optional: `jsonb_exists`).
- Reviewer A: APPROVE after this edit, no re-review needed. Reviewer B: APPROVE (v2 confirm round).

## v3 changes (confirm round)

| # | Source | Change | Where |
|---|---|---|---|
| 1 | A HIGH-1 | **No Flyway version or D-number is hard-coded any more.** V129 went to #431 (renumbered). The doc now says "next free version at push (V130 as of 25/09 13:33Z)" and "next free D-number at merge (D144 as of 25/09 13:33Z)". | header, §4.1, §10 |
| 2 | A MED-1 | `candidates_at_s6_without_item` on **PER_SPONSOR_STATE** now mirrors `LicensingItemGeneratorImpl#generateForCandidate` (verified on master): no sponsor states → nothing filed; one item per (state ∈ `sponsor_states`) × (active rule of the template's `rule_type`); NO_ENDORSEMENT rules skipped when the state is SPONSORED; only the first active template per `rule_type` generates. The first three are in SQL; the last is a Java pre-check (→ 0). COMMENT rewritten ("exact", with the residual named). IT A2 fixture gains an S6 candidate with empty `sponsor_states`. | §3.1, §3.2, §4.1, §7.2 |
| 3 | A MED-2 | The "catch + swallow in recorder → IT H" control was removed; it cannot turn red, because the UUID persist flushes at commit, outside `record()`. It is replaced by recorder unit test **"counter throws → no history save, exception propagates"**, whose negative control is a catch around the counter. IT H2 now states its precondition: the PUT must change a field, so a real UPDATE flushes. | §7.1, §7.2, §7.3 |
| 4 | A LOW-1 | S6 candidates get the item **only at the next checklist backfill**. `transition()` gates (`CandidateServiceImpl.java:748`) before it generates (`:783`), and MOSO never gates. "or stage move" is dropped everywhere. The COMMENT notes that the backfill includes BLOCKED candidates, which the D140 population leaves out. | §3.2, §4.1, §5.1, §8 |
| 5 | A LOW-2 / B | New FE selection order: fallback → NONE by `gate_fields_touched` → counts null ⇒ `tpl_count_not_recorded` → effect strings. The `tpl_gate_off` suffix appears only when `gate_enabled === false`. New unit case: a migration row with NONE. | §5.1, §7.4 |
| 6 | A LOW-3 | `TemplateMigrationsWriteHistoryTest` regex: case-insensitive, and it matches schema-qualified and quoted identifiers. | §4.4 |
| 7 | A optional (adopted) | Row CHECKs for app-written rows: LOOSENED ⇒ `candidates_released` NOT NULL; TIGHTENED ⇒ `candidates_newly_blocked` NOT NULL; RECODED ⇒ both. Migration rows are exempt. | §4.1 |
| 8 | Lead (FE) | PR 2 adds a `TYPE_TONE[row.event_type] ?? <default>` guard. Static check: old bundles render fine, so no staging check is needed. v2's open question 4 is closed. | §5.1, §8 |
| 9 | B | §5.1 strings replaced with **Reviewer B's exact strings**, plus the new `tpl_change`, `tpl_on`/`tpl_off` and `tpl_text_changed` keys, field-label reuse, and the assembly rule. `empty_body` and the footnote strings are kept from v2. | §5.1 |
| 10 | Lead (rollout) | FE staging deploys on push to recruit-fe `staging` (`.github/workflows/cd-staging.yml`, verified), so the FE is fast-forward pushed after the BE. The §8.5 fallback is rewritten: promote BE, **hold the recruit-fe production promote** (production `a850759` lacks #229), and bracket the window with read-only snapshots. "Hold BE below V097" is dropped. | §8 |

---

## v2 changes (what moved since v1, and why)

| # | Source | Change | Where |
|---|---|---|---|
| 1 | Lead R1 (B-M1 + A-M3) | **`ignored_because` removed.** New BE boolean **`gate_fields_touched`**. The FE tail ("new items only" vs "no effect on the 100% gate") is driven only by BE fields and is never re-derived from field names. | §3.2, §4.1, §5.1 |
| 2 | Lead R2 | The `GATING_TRIGGERS` refactor ships as **PR 0**, on its own and first: behaviour-identical, with the parity IT + exhaustive-enum test. The ledger PR depends on it. | §3.3, §8 |
| 3 | Lead R3 | **Fresh branches** `agent/agentflow-s62y-template-audit-v2` (be + fe). New PRs link #400/#216, which are then closed. No force-push; the old branches stay as evidence. | §6 |
| 4 | A-H1 | New **IT H2**: a deferred constraint trigger RAISEs on UPDATE of `checklist_templates` at commit → expect 5xx **and zero history rows**. This is the test that REQUIRES_NEW actually turns red. Mutation table updated. | §7.2, §7.3 |
| 5 | A-H2 | Backfill silently re-gates (v2 also said "later stage moves"; corrected in v3 #4: backfill only) after TIGHTENED (incl. n=0) or RECODED. New count **`candidates_at_s6_without_item`**, stored for TIGHTENED/RECODED on ON_ENTER_S6 / PER_SPONSOR_STATE (not ON_OFFER_SENT). Wording now says "at the time of the change" and that S6 candidates get the item on the next backfill or stage move. **Follow-up:** backfill runs on the audit stream (lead files the bead). | §3.2, §5.1, §9 |
| 6 | A-M1 | Migration V129 / D144. **Superseded by v3 #1: no number is hard-coded.** | §4.1, header |
| 7 | A-M2 | The v1 `impactForCode` on `ChecklistTemplateImpactServiceImpl` would have created a bean cycle: that class injects `ChecklistTemplateService` (`ChecklistTemplateImpactServiceImpl.java:82`), and the service would need the counter. The SQL moves into a new **`ChecklistImpactCounter`** (EntityManager only), used by both `impact(id)` and the recorder. | §3.1, §4.2 |
| 8 | A-M4 | Test fixes:<br>- a count-items-vs-candidates case on a PER_SPONSOR_STATE template, run as ADMIN;<br>- a DONE HR_BGC item in IT A's fixture;<br>- E and F merged into one test;<br>- tearDown restores the seeded templates and clears history. | §7.2 |
| 9 | A-L1..L4 | - "would be held at the S7 gate" wording, because override and the MOSO path skip the gate.<br>- `created_date NOT NULL DEFAULT now()`.<br>- `gate_enabled` column COMMENT about `effective_from`.<br>- #431 conflict is textual as well as structural. | §5.1, §4.1, §4.3 |
| 10 | B-H1 | Every ledger string is **past tense**, short enough for the 420px cell, and vi uses "Xong hoặc N/A". | §5.1 |
| 11 | B-H2 | Rollout rewritten: merge ≠ deploy; staging = BE deployed before FE; production = BE before or with FE, never after; why BE-first is safe (`safeText.ts`). | §8 |
| 12 | B-M2 | Footnote: a link for AUDIT_VIEW holders; the exact "Every change here is recorded…" sentence for everyone else. D38 is kept. | §5.2 |
| 13 | B-M3 | `audit.json` keys `type_CHECKLIST_TEMPLATE`, `stat_total_sub`, `empty_body` (en + vi); the `AuditEvent.template_change` type; reuse `ChecklistTemplates.dept_*`. | §5.1 |
| 14 | B-M4 | Explicit non-goals: no candidate ids; the count is not "who actually moved"; read STAGE rows after the timestamp for that. | §5.3 |
| 15 | B-L1..L3 | D-entry sentence on D08; CSV exports the raw JSON; IT K dropped. | §10, §5.1, §7.2 |
| 16 | Agreed OQs | Now decisions, not questions:<br>- record all fields with `gate_effect`;<br>- fail-closed, no `count_failed`;<br>- migrations that touch `checklist_templates` also insert a history row, with a CI check;<br>- hard gate on the next production promote;<br>- one JSON column. | §2, §4.2, §4.4, §8 |

**(v2 note, resolved in v3 #9: B's exact strings now in §5.1.)** B-H1 asks for "B's exact en/vi strings". This designer never received Reviewer B's text; the lead's message names the requirements but does not include the strings. §5.1 therefore carries **new past-tense strings written to B's stated rules** (past tense, "Xong hoặc N/A", short), merged with A's H2/L1 wording. Reviewer B should diff them against their own.

---

## 0. Why revive now: the three park conditions

| Park condition | Status 2026-09-25 | Evidence |
|---|---|---|
| 1. A template editor exists | Met on master | recruit-fe #229 (`d6aa897`) |
| 2. Items exist for MOSO arrivals | Met on master | recruit-be #425 / D136. Per the PR #432 body (staging, 25/09 09:15Z, not re-measured): 7,534 items after the backfill; HR_BGC held open by 328 candidates. |
| 3. Production promoted past V101 | Not met | Per the PR #432 body (production, 25/09 09:16Z, not re-measured): Flyway V095, 0 `checklist_items`. |

Condition 3 is now a rollout gate (§8), not a reason to wait. On production today the editor gets 403, because `CHECKLIST_READ` reaches department roles only in V097. Department roles have held `CHECKLIST_TEMPLATE_MANAGE_*` since V067, so an API-only write is possible on production today, with no record.

---

## 1. What the gate reads (from master)

`CandidateServiceImpl#blockingMandatoryChecklistItems` (`CandidateServiceImpl.java:880-916` @ `c8c2a4b5`):

1. It returns nothing unless `toStage == S7` **and** `onboarding.completion_requires_mandatory` is true (`:881`).
2. It builds a map **keyed by `code`** from templates that are active, mandatory, and whose trigger is ON_ENTER_S6, PER_SPONSOR_STATE or ON_OFFER_SENT (`:884-899`).
3. An item blocks iff its `template_code` is a key in that map and `status.isOpen()` (`:902-908`). Items are read with a per-candidate cap of 200.

```
gates(T) = T.active ∧ T.mandatory ∧ T.trigger ∈ {ON_ENTER_S6, PER_SPONSOR_STATE, ON_OFFER_SENT}
```

**Gate-relevant fields:** `mandatory`, `active`, `trigger`, `code`, plus the existence of the row.

- **Create is gate-relevant.** Items keep `template_code` after a delete or rename (no FK, V067). So a new gating template whose code matches such orphaned items re-gates them immediately.
- **A rename moves the gate two ways:** items under the old code are released, and orphans under the new code are captured.

Everything else only shapes future items, or nothing: `title`, `description`, `due_in_days`, `order_index` (copied at generation), `needs_review` (not consumed), `applies_when` (not evaluated), `rule_type` (per-state fan-out only), `department` (not patchable). The global switch is already on the stream as a `SETTING` event.

**Two routes to S7 skip this gate entirely,** so a count of "blocked" can only mean "would be held at the gate" (A-L1):
- `transition(..., override=true)` with a reason;
- the MOSO upsert path, which moves stage without calling `transition()` (D136).

---

## 2. Decision: record every effective write and classify its gate effect (agreed)

There is one history row for each create/delete and for each update that changes at least one field, and each carries a BE-computed `gate_effect` and `gate_fields_touched`. The reasons are unchanged from v1:
- the editor's shipped footnote promises "history of template changes";
- the diff must be computed anyway;
- a gate-only ledger is ambiguous on a mixed PUT;
- the noise is handled in presentation.

---

## 3. What "affects N candidates" means

### 3.1 One counter, used by the editor dialog and the ledger (A-M2)

New `checklist/service/impl/ChecklistImpactCounter` (`@Component`). It depends on `EntityManager` only, and it owns the SQL that today is `ChecklistTemplateImpactServiceImpl.IMPACT_SQL`, extended by one aggregate:

```sql
WITH pop AS (
    SELECT c.id, c.stage FROM candidates c
     WHERE c.status IN (:statuses) AND c.merged_into_id IS NULL AND c.stage <> :s7
), holders AS (
    SELECT i.candidate_id, bool_or(i.status IN (:openStatuses)) AS has_open
      FROM checklist_items i JOIN pop p ON p.id = i.candidate_id
     WHERE i.template_code = :code
     GROUP BY i.candidate_id
)
SELECT (SELECT count(*) FROM pop),
       (SELECT count(*) FROM pop WHERE stage = :s6),
       (SELECT count(*) FROM holders),
       (SELECT count(*) FROM holders WHERE has_open)
```

The "at S6 without the item" count is a **separate method with two SQL shapes**, because what the backfill would file differs by trigger (A MED-1). Both reuse the same `pop` CTE.

```sql
-- countAtS6WithoutFlatItem(:code) — ON_ENTER_S6
SELECT count(*) FROM pop p
 WHERE p.stage = :s6
   AND NOT EXISTS (SELECT 1 FROM checklist_items i WHERE i.candidate_id = p.id AND i.template_code = :code)

-- countAtS6WithoutStateItem(:code, :ruleType) — PER_SPONSOR_STATE; mirrors
-- LicensingItemGeneratorImpl#generateForCandidate/#generateOne on master:
--   null/empty sponsor_states → nothing filed (@> is NULL/false on NULL and false on [])
--   NOTE: not the jsonb `?` operator — in a JPA native query `?` is parsed as a positional parameter
--   one item per (state ∈ sponsor_states) × (active licensing_state_rules row of this rule_type for that state)
--   a params.when = NO_ENDORSEMENT rule is skipped when that state's sponsorship is SPONSORED
SELECT count(*) FROM pop p JOIN candidates c ON c.id = p.id
 WHERE p.stage = :s6
   AND EXISTS (
       SELECT 1 FROM licensing_state_rules r
        WHERE r.active AND r.rule_type = :ruleType
          AND c.sponsor_states @> jsonb_build_array(r.state)
          -- COALESCE: a rule without params.when (every V040 seed rule) must NOT be dropped;
          -- without it NOT(NULL AND TRUE) is NULL and WHERE discards the rule (Reviewer A MED-1b).
          AND NOT (COALESCE(r.params ->> 'when', '') = 'NO_ENDORSEMENT'
                   AND EXISTS (SELECT 1 FROM sponsorships s
                                WHERE s.candidate_id = c.id AND s.state = r.state AND s.status = 'SPONSORED'))
          AND NOT EXISTS (SELECT 1 FROM checklist_items i
                           WHERE i.candidate_id = c.id AND i.template_code = :code AND i.state = r.state))
```

```java
record CodeImpact(long notAtS7, long atS6, long holding, long holdingOpen) {}   // = D140's four numbers
CodeImpact countByCode(String templateCode);
long countAtS6WithoutFlatItem(String templateCode);
long countAtS6WithoutStateItem(String templateCode, LicensingRuleType ruleType);
```

**One residual of the per-state count is handled in Java, not SQL.** The generator keeps only the **first** active PER_SPONSOR_STATE template per `rule_type`. It builds a `toMap` with the merge function `(first, second) -> first`, over `activeByTrigger`, which is ordered by `order_index, code`. So if the edited template (post-edit state A) is not the first active one for its `rule_type` in that order, the backfill files nothing under its code. The recorder then stores **0** without running the SQL. This is one `activeByTrigger(PER_SPONSOR_STATE)` call, reusing the same service method and order the generator uses. It is simpler and more faithful than re-deriving the order in SQL.

- `ChecklistTemplateImpactServiceImpl#impact(id)` keeps its API and response (D140, four fields). It now does `templateService.byId(id)` and then `counter.countByCode(code)`.
- The recorder uses the counter directly. The dependency graph is service → recorder → counter, and impact service → {template service, counter}. There is no cycle.
- `GATEABLE_STATUSES` / `OPEN_ITEM_STATUSES` move with the SQL, still derived from the enums.
- The editor's parity IT (`ChecklistTemplateEditorEndpointsIT`) must stay green unchanged.

**Population wording** follows D140: "not yet at S7", as in the editor's `impact_population`.

### 3.2 The effect (pure function, BE)

`B` = state before (a create has no row: gates=false). `A` = state after (a delete has no row: gates=false). "Open holders(X)" = `countByCode(X).holdingOpen`.

| `gates(B)` | `gates(A)` | code changed | `gate_effect` | `candidates_released` | `candidates_newly_blocked` | `candidates_at_s6_without_item` |
|---|---|---|---|---|---|---|
| false | false | any | `NONE` | NULL | NULL | NULL |
| true | true | no | `NONE` | NULL | NULL | NULL |
| true | false | any | `LOOSENED` | open holders(**B.code**) | NULL | NULL |
| false | true | any | `TIGHTENED` | NULL | open holders(**A.code**) | A.trigger ON_ENTER_S6 → `countAtS6WithoutFlatItem(A.code)`; PER_SPONSOR_STATE → `countAtS6WithoutStateItem(A.code, A.ruleType)` (or 0 if not the first active template for that rule_type); otherwise NULL |
| true | true | yes | `RECODED` | open holders(**B.code**) | open holders(**A.code**) | same rule as TIGHTENED |

- **Pre-edit code for `released`** (parked fix #2). A rename + mandatory-off in one PUT counts the old code.
- **`candidates_at_s6_without_item`** (A-H2, A MED-1, A LOW-1): S6 candidates in the D140 population who, at the time of the change, lack an item that the **next checklist backfill** would file under A.code.
  - The backfill is `POST /admin/checklists/backfill` → `ChecklistBackfillServiceImpl` → `ChecklistGenerator#generateForStage`. After it runs, the item holds these candidates at the gate, with no further template edit and no further ledger row.
  - **Only the backfill does this.** A later stage move does not:
    - `transition()` runs the gate (`CandidateServiceImpl.java:748`) **before** it generates (`:783`), so the move into S7 is judged without the new item;
    - the MOSO upsert path generates (`MosoRowUpsertServiceImpl.java:219-227`) but never gates.
  - It matters most after RECODED (every S6 candidate's items carry the old code) and after TIGHTENED with n = 0.
  - ON_OFFER_SENT is excluded: `generateForStage` never generates it (only `OfferServiceImpl#transitionToSent` → `generateOnOfferSent`, `OfferServiceImpl.java:543`), so the backfill never adds it.
  - Population difference, noted in the COMMENT: the backfill also processes **BLOCKED** candidates (`ChecklistBackfillServiceImpl`: only ARCHIVED and merged are excluded). The D140 population leaves BLOCKED out, so BLOCKED S6 candidates are not in this count.
- **`gate_fields_touched`** (R1) = the row is CREATED or DELETED, **or** the UPDATE diff contains any of `mandatory, active, trigger, code`. The FE uses exactly this bit for a NONE row:
  - `true` → "Didn't change the 100% gate";
  - `false` → "New items only".
- **`gate_enabled`** is snapshotted (through `OnboardingCompletionGate.REQUIRES_MANDATORY_KEY`). `gate_effect` still describes the *rule* change when the switch is off, and the FE appends the switched-off suffix.
- Queries run only for non-NONE effects: at most two `countByCode` calls plus one S6 count per write.

### 3.3 Shared gating triggers: PR 0, first (R2)

A separate, behaviour-identical PR:

- `OnboardingCompletionGate.GATING_TRIGGERS = unmodifiable EnumSet.of(ON_ENTER_S6, PER_SPONSOR_STATE, ON_OFFER_SENT)` and `static boolean gates(ChecklistTemplateEntity)`. They live in the class that already exists "so the banner … can never describe a different switch than the one the gate obeys".
- `blockingMandatoryChecklistItems` loops over `GATING_TRIGGERS` instead of `:884-899`'s three blocks. The only behaviour difference is `Collectors.toMap`'s throw on a duplicate code, which `checklist_templates_code_uq` already makes impossible.
- Tests:
  - `OnboardingCompletionGateTest`, **exhaustive over the enum**: every `ChecklistTemplateTrigger` is in `GATING_TRIGGERS` or in an explicit `NEVER_GATES = {ON_100_ONBOARDED}`;
  - a unit test of `gates()` (active/mandatory/trigger truth table);
  - the existing gate unit tests and the D140 parity IT, unchanged.
- Negative control: drop ON_OFFER_SENT → the enum test is red.
- The ledger PR (PR 1) rebases on PR 0 after it merges.

---

## 4. Storage

### 4.1 `V<next>__checklist_template_history.sql`

**The version is the next free version at push. It was V130 as of 25/09 13:33Z** (A HIGH-1). At that time master topped at V124 (#430 merged), and the open PRs held #435 V127, #434 V128 and #431 V129 (renumbered). Numbers move under us several times a day, so this doc hard-codes none. At push, list `origin/master`'s migration dir and every open PR's files (`gh pr list` + `gh pr view --json files`), and take the lowest version above all of them. `scripts/ci/check_flyway_versions.py` fails a version below master's top or equal to an open PR's number.

```sql
CREATE TABLE checklist_template_history (
    id                             VARCHAR(255) PRIMARY KEY,
    template_id                    VARCHAR(255) NOT NULL,   -- NO FK: a DELETED row outlives the template
    department                     VARCHAR(20)  NOT NULL,
    template_code                  VARCHAR(100) NOT NULL,   -- A.code (B.code on DELETED)
    template_title                 VARCHAR(255) NOT NULL,   -- A.title (B.title on DELETED)
    action                         VARCHAR(10)  NOT NULL
        CONSTRAINT checklist_template_history_action_ck CHECK (action IN ('CREATED','UPDATED','DELETED')),
    from_values                    JSONB,                   -- NULL on CREATED; UPDATED = changed fields; DELETED = full
    to_values                      JSONB,                   -- NULL on DELETED; UPDATED = changed fields; CREATED = full
    gate_effect                    VARCHAR(10)  NOT NULL
        CONSTRAINT checklist_template_history_effect_ck CHECK (gate_effect IN ('NONE','TIGHTENED','LOOSENED','RECODED')),
    gate_fields_touched            BOOLEAN      NOT NULL,
    candidates_released            INTEGER,
    candidates_newly_blocked       INTEGER,
    candidates_at_s6_without_item  INTEGER,
    gate_enabled                   BOOLEAN,                 -- NULL only on migration-written rows (§4.4)
    changed_by                     VARCHAR(255) NOT NULL,   -- a user id, or 'migration:Vnnn'
    created_by                     VARCHAR(255),
    created_date                   TIMESTAMPTZ  NOT NULL DEFAULT now(),   -- the event time (A-L2)
    last_modified_by               VARCHAR(255),
    last_modified_date             TIMESTAMPTZ,
    CONSTRAINT checklist_template_history_none_has_no_counts_ck CHECK (gate_effect <> 'NONE' OR
        (candidates_released IS NULL AND candidates_newly_blocked IS NULL AND candidates_at_s6_without_item IS NULL)),
    CONSTRAINT checklist_template_history_none_iff_untouched_ck CHECK (gate_fields_touched OR gate_effect = 'NONE'),
    CONSTRAINT checklist_template_history_gate_enabled_ck CHECK (gate_enabled IS NOT NULL OR changed_by LIKE 'migration:%'),
    -- v3 (A optional, adopted): an app-written row with an effect must carry the counts that effect defines.
    CONSTRAINT checklist_template_history_app_counts_ck CHECK (changed_by LIKE 'migration:%' OR (
        (gate_effect <> 'LOOSENED'  OR candidates_released IS NOT NULL) AND
        (gate_effect <> 'TIGHTENED' OR candidates_newly_blocked IS NOT NULL) AND
        (gate_effect <> 'RECODED'   OR (candidates_released IS NOT NULL AND candidates_newly_blocked IS NOT NULL))))
);
CREATE INDEX checklist_template_history_template_idx   ON checklist_template_history (template_id, created_date DESC);
CREATE INDEX checklist_template_history_department_idx ON checklist_template_history (department, created_date DESC);

COMMENT ON COLUMN checklist_template_history.gate_enabled IS
  'onboarding.completion_requires_mandatory as SettingsService resolved it inside the template write''s transaction, i.e. the recruit_settings row whose effective_from was the latest at that instant. A row dated later (a scheduled flip) is not reflected. NULL only on rows a migration wrote (changed_by = ''migration:Vnnn'').';
COMMENT ON COLUMN checklist_template_history.candidates_at_s6_without_item IS
  'TIGHTENED/RECODED on ON_ENTER_S6 or PER_SPONSOR_STATE only (NULL otherwise). At write time: S6 candidates of the D140 population who lack an item the NEXT CHECKLIST BACKFILL would file under template_code; after that backfill the item holds them at the S7 gate, with no further ledger row. A stage move does not file it before the gate runs (transition() gates before it generates; MOSO never gates). ON_ENTER_S6: no item with this code. PER_SPONSOR_STATE: exact per LicensingItemGeneratorImpl (at least one state in sponsor_states with an active licensing_state_rules row of this rule_type, not skipped by NO_ENDORSEMENT+SPONSORED, and no item for that state); 0 when this template is not the first active PER_SPONSOR_STATE template for its rule_type (the generator uses only the first). Not counted: BLOCKED candidates, which the backfill does process but the D140 population excludes.';
-- + COMMENT ON TABLE / from_values / to_values / gate_effect / gate_fields_touched / candidates_* (text per §3.2)
```

- This is DDL only (no data rows). Regenerate `docs/SCHEMA.md` with `scripts/gen-schema-doc.py` in the same commit, or `SchemaDocFreshnessTest` fails.
- The `from_values`/`to_values` shape is PR #400's: snake_case, the 11 fields, and `department` in a CREATED snapshot.
- There is no `actor_external` column (D81 does not apply; every Java write passes `demandManage`).

### 4.2 Where and in what transaction (fail-closed, agreed)

The facade is the only caller of the template writes (`ChecklistTemplateFacadeImpl.java:65,72,79`). Facades are non-transactional by convention (`BulkRunner.java:15`), and the service methods are `@Transactional`. So:

- **The facade** stays the RBAC door. `demandManage` returns the actor it resolves (`:87`), and passes it down.
- **The service** signatures become `create(request, actorId)`, `update(id, request, actorId)`, `delete(id, actorId)` (the `CandidateServiceImpl#transition(id, request, actorId)` idiom). Template + history are written in the existing `@Transactional` method.
- **`ChecklistTemplateHistoryRecorder`** (`@Component`, `@Transactional(propagation = MANDATORY)`, the D136 `ChecklistItemWriter` idiom) diffs, calls the pure `ChecklistTemplateGateChange.of(...)` and the `ChecklistImpactCounter`, then INSERTs. It has **no catch**. A failed count or INSERT rolls back the template write (500). There is no `count_failed` flag (agreed).

Update, inside one transaction:
1. `entityManager.find(ChecklistTemplateEntity.class, id, PESSIMISTIC_WRITE)` (a real `SELECT … FOR UPDATE`, precedent `OfferServiceImpl`), or 404.
2. Take `before`, `gates(before)` and `codeBefore` **before** any setter.
3. Apply the patch unchanged from master.
4. Take `after`, and diff with `Objects.equals` per key.
5. An empty diff means **no row and no count**, then return. This covers the FE's always-sent `due_in_days`, and the `applies_when` re-send.
6. Compute the effect, run the counts that §3.2 requires, save the template, and record.

Create has no `before`. Delete: lock, snapshot, delete, record.

### 4.3 Audit stream

Add a branch to `AuditServiceImpl.EVENTS_SQL` (8 branches × 13 columns on master, unchanged since #400 was cut):

```sql
UNION ALL
SELECT id, 'CHECKLIST_TEMPLATE', created_date, changed_by, NULL,
       from_values::text, to_values::text, action,
       department || '/' || template_code, template_id, NULL, NULL, NULL,
       json_build_object('title', template_title, 'gate_effect', gate_effect,
                         'gate_fields_touched', gate_fields_touched,
                         'candidates_released', candidates_released,
                         'candidates_newly_blocked', candidates_newly_blocked,
                         'candidates_at_s6_without_item', candidates_at_s6_without_item,
                         'gate_enabled', gate_enabled)::text
  FROM checklist_template_history
```

- There is one 14th column, `template_change` (`NULL::text AS template_change` on branch 1, `NULL` elsewhere).
- `AuditEventRow` gains `ChecklistTemplateChangeView templateChange`, parsed in `AuditServiceImpl` with the app's `ObjectMapper`.
- `EVENT_TYPES` gains `CHECKLIST_TEMPLATE`.
- **#431 conflict (A-L4): textual and structural.**
  - #431 edits the same three places: the `EVENT_TYPES` `Set.of(...)` line, the javadoc's "(eight UNION branches)" count line, and the tail of `EVENTS_SQL` after the CONVERSATION_REVOKE branch. Whichever PR lands second gets a **git conflict** on those hunks.
  - The resolution keeps both types and both branches, fixes the count to ten branches, and adds `NULL` as the SPONSORSHIP branch's 14th column.
  - A missed `NULL` is a loud Postgres column-count error, caught by `AuditOfferBranchIT` and the new branch IT in CI's `integrationTest`. It is still spelled out in the PR body.

API row (`GET /api/v1/admin/audit-events?type=CHECKLIST_TEMPLATE`, AUDIT_VIEW):

```json
{ "event_type": "CHECKLIST_TEMPLATE", "candidate_id": null, "subject_id": "ct-hr-bgc",
  "setting_key": "HR/HR_BGC", "reason": "UPDATED",
  "detail_from": "{\"mandatory\":false}", "detail_to": "{\"mandatory\":true}",
  "template_change": { "title": "Background check", "gate_effect": "TIGHTENED", "gate_fields_touched": true,
                       "candidates_released": null, "candidates_newly_blocked": 7,
                       "candidates_at_s6_without_item": 12, "gate_enabled": true } }
```

`template_change` is `null` on every other event type.

### 4.4 Migrations that touch `checklist_templates` (agreed)

**Convention, from this ledger's migration on:** a migration that INSERTs/UPDATEs/DELETEs `checklist_templates` rows also INSERTs one `checklist_template_history` row per changed template, with:
- `changed_by = 'migration:Vnnn'` (the V029/V030/V119 stamp);
- `gate_effect` / `gate_fields_touched` set by the author;
- all counts and `gate_enabled` NULL.

The FE shows those rows as "count not recorded".

**Cheap CI check:** unit test `TemplateMigrationsWriteHistoryTest`. It FAILS unless exactly one `V<n>__checklist_template_history.sql` exists (zero would scan nothing; two make the threshold ambiguous).
- It scans `db/migration/V*.sql` on the classpath whose version is **greater than this ledger's own migration**. The threshold is read from that file's name (`V<n>__checklist_template_history.sql`), never typed as a number.
- Any file matching this pattern must also match the same pattern for `checklist_template_history` after `INSERT INTO`:

  ```
  (?i)\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:"?[a-z_][a-z0-9_]*"?\s*\.\s*)?"?checklist_templates"?(?![a-z0-9_])
  ```

  It is case-insensitive (A LOW-3), accepts an optional schema qualifier (`public.` / `"public".`) and a quoted identifier, and does not match `checklist_template_history` itself.
- Negative controls: fixture strings `update CHECKLIST_TEMPLATES …`, `UPDATE public."checklist_templates" …` and `DELETE FROM "checklist_templates"`, each without a history insert, are all flagged. `INSERT INTO checklist_template_history …` alone is not flagged.

Earlier migrations (V067, V118, V119) are history and are not retrofitted.

---

## 5. FE (recruit-fe)

Locales on master: **en, vi** only.

### 5.1 `/audit` row

- **Keep from #216:** the never-blank JSON parser, the `TYPE_TONE` entry, and the missing `type_CONVERSATION_*` labels.
- **New in PR 2:** `TYPE_TONE[row.event_type] ?? <default tone>` at the `StatusChip` call site, so an event type the bundle doesn't know yet still renders.
- **Rewrite:** the head uses `template_change.title` + `ChecklistTemplates.dept_*` (reused, not re-keyed). The tail is chosen **only** from `template_change.gate_effect`, `gate_fields_touched`, the counts and `gate_enabled`. The cell truncates at 420px (`AuditClient` `max-w-[420px] truncate`, with a `title` tooltip).

New `audit.json` keys: **Reviewer B's exact strings** (confirm round), except `empty_body`, which is kept from v2.

| key | en | vi |
|---|---|---|
| `type_CHECKLIST_TEMPLATE` | Checklist template edits | Sửa mẫu checklist |
| `stat_total_sub` (replace, append only) | owner · stage · setting · merge · permission · offer · checklist template | owner · stage · setting · merge · permission · offer · checklist template |
| `empty_body` (replace; v2 text) | Loosen the filters — every owner change, stage move, setting edit, merge, permission change, offer event and checklist template edit lands here. | Nới bộ lọc ra — mọi lần đổi người ôm, đẩy stage, sửa cấu hình, gộp hồ sơ, đổi quyền, sự kiện offer và sửa mẫu checklist đều nằm ở đây. |
| `tpl_updated` | `{dept} · "{title}": {changes}` | `{dept} · "{title}": {changes}` |
| `tpl_created` | `Created "{title}" ({dept})` | `Đã tạo "{title}" ({dept})` |
| `tpl_deleted` | `Deleted "{title}" ({dept})` | `Đã xoá "{title}" ({dept})` |
| `tpl_change` | `{field} {from} → {to}` | `{field} {from} → {to}` |
| `tpl_on` / `tpl_off` | `on` / `off` | `bật` / `tắt` |
| `tpl_text_changed` | `{field} changed` | `{field}: đã đổi` |
| `tpl_loosened` | `{n, plural, one {# candidate} other {# candidates}} had it open and no longer needed it for S7` | `{n} ứng viên đang giữ mục này mở, từ đó không còn cần nó để sang S7` |
| `tpl_loosened_zero` | `No one had it open, so no one was unblocked` | `Không ai đang giữ mục này mở, nên không gỡ chặn ai` |
| `tpl_tightened` | `{n, plural, one {# candidate} other {# candidates}} had it open and from then on needed it Done or N/A for S7` | `{n} ứng viên đang giữ mục này mở, từ đó phải Xong hoặc N/A mới sang được S7` |
| `tpl_tightened_zero` | `No one had it open, so no one was held yet` | `Không ai đang giữ mục này mở, nên chưa chặn ai` |
| `tpl_s6_later` | `{m, plural, one {# candidate} other {# candidates}} at S6 didn't have it yet and get it at the next checklist backfill` | `{m} ứng viên ở S6 chưa có mục này, sẽ nhận ở lần backfill checklist tới` |
| `tpl_recoded` | `Code changed: {released} no longer needed it (their items keep the old code); {blocked} needed it from then on` | `Đổi mã: {released} ứng viên không còn cần mục này (mục cũ giữ mã cũ); {blocked} ứng viên từ đó phải có mục này` |
| `tpl_none_gate` | `Didn't change the 100% gate` | `Không đổi cổng 100%` |
| `tpl_none_new_items` | `New items only` | `Chỉ áp dụng cho mục mới` |
| `tpl_gate_off` | `(the checklist gate was off in Settings; applies once it's back on)` | `(lúc đó cổng checklist đang tắt trong Settings; có hiệu lực khi bật lại)` |
| `tpl_count_not_recorded` | `Count not recorded (changed by a migration)` | `Không ghi số lượng (do migration đổi)` |
| `tpl_fallback` | `{key}: {changes}` | `{key}: {changes}` |

**`{changes}`** is the UPDATED diff, one `tpl_change` per changed field, joined with `", "`:
- `{field}` reuses the `ChecklistTemplates` labels: `col_mandatory`, `col_active`, `field_title`, `field_description`, `field_due`, `field_order`, `field_code`, `field_trigger`.
- Booleans render as `tpl_on` / `tpl_off`. Trigger values reuse `ChecklistTemplates.trigger_*`.
- Long text fields (`description`, `applies_when`) render as `tpl_text_changed`.
- Any other key falls back to its raw name.

**Assembly:** `head · effect[ · s6_later][ gate_off]`. `s6_later` is added when `candidates_at_s6_without_item > 0`. `gate_off` is added **only** when `gate_enabled === false`: `null` (migration rows) and `true` add nothing.

**Selection order** (a pure `templateChangeText(row, t)` in `_utils/templateChange.ts`, A LOW-2 / B):
1. `template_change == null` or an unknown `gate_effect` → `tpl_fallback`.
2. `gate_effect === 'NONE'` → head · (`gate_fields_touched` ? `tpl_none_gate` : `tpl_none_new_items`). This applies to migration rows too, since a NONE row never has counts.
3. `gate_effect !== 'NONE'` and the counts that effect defines are null → head · `tpl_count_not_recorded`. Only migration rows can reach this: the §4.1 CHECK forbids it for app rows.
4. Otherwise → head · the effect string (`tpl_loosened`, `tpl_tightened`, their `_zero` variants when n = 0, or `tpl_recoded`), then the optional parts.

B's strings say "had it open" / "needed it" (what the rule required), not "was blocked". That stays true even though override and the MOSO path skip the gate (§1).

Other FE changes:
- **Types:** `AuditEventType` gains `'CHECKLIST_TEMPLATE'` (plus the compile-total `AUDIT_EVENT_TYPE_KEYS` entry). `AuditEvent` gains `template_change: ChecklistTemplateChange | null`, with a snake_case type that mirrors §4.3.
- **CSV (B-L2):** a new `template_change` column exporting the **raw JSON text**, like `detail_from`/`detail_to`.

### 5.2 Editor footnote (B-M2)

The editor footnote's last sentence ("History of template changes will appear here once template auditing ships" / "Lịch sử thay đổi mẫu sẽ hiện ở đây khi có audit mẫu") is replaced:

- **With `AUDIT_VIEW`** (`useMyPermissions()`, already called by the editor): a link "See who changed checklist templates" / "Xem ai đã thay đổi mẫu checklist" → `/audit?type=CHECKLIST_TEMPLATE`. `parseAuditFilter` already accepts `?type=` from `AUDIT_EVENT_TYPES`.
- **Without it:** "Every change here is recorded. Managers can see who changed what under Audit." / "Mọi thay đổi ở đây đều được ghi lại. Quản lý xem ai đã đổi gì trong mục Audit."

`/audit` stays Manager + Admin (D38, `AppSidebar.tsx:88`). There is no per-template history panel.

### 5.3 Non-goals (B-M4)

- The ledger stores **no candidate ids**. The counts describe the population at write time. They are not a list of who later moved, and not a promise that anyone was actually stopped: people can still get through by override, the MOSO path, or closing the item.
- "Who actually reached S7 after this change" is answered by the STAGE rows on the same stream after the row's timestamp, not by this row.
- No approval step before a flip takes effect. No change to how the gate computes.

---

## 6. Branches and what is kept from #400 / #216 (R3)

- **PR 0** (be): `agent/agentflow-s62y-gating-triggers` → master (§3.3).
- **PR 1** (be) and **PR 2** (fe): `agent/agentflow-s62y-template-audit-v2`, fresh from `origin/master`. The PR bodies link #400 / #216. After PR 1 and PR 2 are opened, #400 / #216 are **closed with a comment pointing to them**. No force-push; the old branches stay for their evidence.

| Kept (adapted) | Rewritten | Dropped |
|---|---|---|
| entity + action enum; migration header prose; `fieldSnapshot`; diff + no-op rule; branch IT harness; `AuditServiceImplTest` fixtures; FE parser + tests harness | effect (§3.2); `ChecklistImpactCounter` (§3.1); actor from the facade; lock; `template_change` column; FE strings (§5.1) | `open_items`; `countOpenItems`; "create changes nothing"; V122 file |

---

## 7. Tests

The full suite is `./gradlew test integrationTest`. CI runs both plus the Flyway guard.

### 7.1 BE unit

`ChecklistTemplateGateChangeTest` (pure, table-driven):

1. Mandatory on (active, ON_ENTER_S6) → TIGHTENED. It asks for `newly_blocked(code)` and `countAtS6WithoutFlatItem(code)`.
2. Mandatory off → LOOSENED, `released(code)`.
3. Mandatory on while inactive → NONE, `gate_fields_touched=true`, no count.
4. Mandatory on, ON_100_ONBOARDED → NONE, touched, no count.
5. Title only → NONE, `gate_fields_touched=false`.
6. Active off on a gating row → LOOSENED. Active off on an optional row → NONE, touched.
7. Trigger ON_ENTER_S6 → ON_100_ONBOARDED (gating) → LOOSENED. ON_100_ONBOARDED → ON_OFFER_SENT (mandatory + active) → TIGHTENED, with the S6 count **NULL** (ON_OFFER_SENT is excluded).
8. Rename on a gating row → RECODED: released(**old**), newly_blocked(**new**), S6 count(**new**).
9. **Rename + mandatory off in one PUT → LOOSENED, counted with the OLD code.**
10. Rename + mandatory on → TIGHTENED, counted with the NEW code.
11. Delete gating → LOOSENED. Delete optional → NONE, touched. Create gating → TIGHTENED. Create optional → NONE, touched.
12. PER_SPONSOR_STATE uses `countAtS6WithoutStateItem(code, ruleType)`. If it is not the first active template for its `rule_type` → 0, and no SQL runs.

`ChecklistTemplateHistoryRecorderTest` (A MED-2):
- **The counter throws → the exception propagates and no history entity is saved** (`verify(entityService, never()).save(any(ChecklistTemplateHistoryEntity.class))`).
- Negative control: wrap the counter call in try/catch and record NULL counts → red.

`ChecklistTemplateServiceImplTest`:
- A no-op PUT → no history saved, no counter call.
- Title + identical `due_in_days` → diff `{title}` only, no counter call.
- Rename + mandatory → the counter is called with `"HR_BGC"`, never `"HR_BGC_V2"`, for `released`.
- `changed_by` = the `actorId` argument.
- The recorder throws → the exception propagates out of `update`.

Other unit tests:
- `ChecklistTemplateFacadeImplTest`: 403 → the service is never called; the actor is passed through.
- `ChecklistImpactCounterTest` (mocked EM): parameters bound, including `:ruleType`; open statuses equal `isOpen()`.
- `ChecklistTemplateImpactServiceImplTest`: 404 before any count; response = `CodeImpact`'s four numbers.
- `AuditServiceImplTest`: row[13] parsed into `templateChange`; null elsewhere; `CHECKLIST_TEMPLATE` accepted.
- `TemplateMigrationsWriteHistoryTest` (§4.4, including the case / quote / schema fixtures).
- PR 0's tests (§3.3).

### 7.2 BE IT (real Postgres, through the controller, `recruit.rbac.enforce=true`)

New `ChecklistTemplateAuditEndpointsIT`, harness copied from `ChecklistTemplateEditorEndpointsIT`. Callers: HR lead, LICENSING lead, ADMIN, MANAGER, no-grant.

**Setup / teardown:**
- `@BeforeAll` snapshots all `checklist_templates` rows.
- `@AfterEach` does all of the following:
  - restores the template rows exactly (delete + re-insert from the snapshot);
  - `DELETE FROM checklist_template_history`;
  - drops any test trigger / function;
  - removes the fixture candidates, items, sponsorships, licensing rules and grants.

**Fixture:**
- HR_BGC holders: OPEN, IN_PROGRESS and BLOCKED, plus **one DONE**.
- S7, ARCHIVED and merged candidates holding an open HR_BGC item; all must be excluded.
- One S6 candidate with **no** HR_BGC item.
- For the PER_SPONSOR_STATE template T_lic (its `rule_type` = R), two active R rules (states X, Y), and these S6 candidates:
  - **c1** has sponsor states [X, Y] and open items for both → a holder, counted once. It is not in the S6-without count.
  - **c2** has sponsor states [X, Y] and an item only for X → in the S6-without count (Y is missing).
  - **c3** has **empty** sponsor states (`[]`), and **c4** has NULL sponsor states → **not** counted (A MED-1).
  - **c5** has sponsor states [X]. X's rule has `params.when = NO_ENDORSEMENT`, X's sponsorship is SPONSORED, and there is no item → **not** counted.
  - **c6** has sponsor states [Y]. Y's rule has params **without** `when` (e.g. `{"miles":75}`), Y's sponsorship is SPONSORED, and there is no item → **counted**, and the backfill files it (A MED-1b).
- Fixture states use fixture-only codes (e.g. `ZX`/`ZY`): `licensing_state_rules` is UNIQUE(state, rule_type) (V039) and V040 seeds real states.

**Cases:**
- **A. Tighten + parity.**
  - Precondition: GET `/impact` for HR_BGC → `n`, which excludes the DONE holder.
  - Act: the HR lead PUTs `{mandatory:true}`.
  - Expect one history row: `changed_by` = HR lead, UPDATED, TIGHTENED, `gate_fields_touched`, `newly_blocked = n`, `at_s6_without_item` = the number of S6 candidates without HR_BGC, `gate_enabled = true`.
  - Parity: `transition(S7)` on every fixture candidate blocks exactly `n` with `checklist:HR_BGC`.
- **A2. Per-state, as ADMIN** (ADMIN because the IT department has no role, and this also covers the wildcard path).
  - Act: PUT `{mandatory:true}` on T_lic.
  - Expect `newly_blocked` counts c1 **once** (candidates, not items) and `at_s6_without_item = 2` (c2 and c6; c3, c4 and c5 are excluded).
  - Then run `POST /admin/checklists/backfill` (non-dry-run). Exactly the counted candidate (c2) gets a new item, and none of c3, c4 or c5 do. This proves the count predicts the backfill.
- **B. Rename + optional in one PUT.**
  - Act: on a mandatory HR_BGC, PUT `{code:"HR_BGC_V2", mandatory:false}`.
  - Expect LOOSENED, `released = n` (≠ 0), row `template_code = HR_BGC_V2`, and `from_values` holding both keys.
- **C. No-op re-sends.**
  - Seed `applies_when` with a nested object, a number and an array. GET it, then PUT it back verbatim → 200, 0 rows.
  - PUT every editor field unchanged → 0 rows.
- **D. Denied writes.**
  - No-grant PUT → 403, 0 rows.
  - The HR lead PUTs the LICENSING template → 403, 0 rows, template unchanged.
- **E. Delete, then recreate the same code.**
  - Delete the mandatory HR_BGC → DELETED, full `from_values`, LOOSENED, the row visible on `/audit-events`.
  - POST a new mandatory ON_ENTER_S6 template with code HR_BGC → CREATED, TIGHTENED, `newly_blocked = n` (the orphans).
- **G. No effect.** PUT `{mandatory:true}` on `HR_TRAINING_KICKOFF` (ON_100_ONBOARDED) → NONE, `gate_fields_touched = true`, all counts NULL.
- **H. Fail-closed.** A trigger RAISEs on INSERT into `checklist_template_history` → the PUT is 5xx and the template is unchanged. This proves only that a failed history write fails the edit. It is **not** the guard against a swallowed exception: the history INSERT flushes at commit, outside `record()`. That guard is the recorder unit test.
- **H2. Atomicity.**
  - Setup: `CREATE CONSTRAINT TRIGGER … AFTER UPDATE ON checklist_templates DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION it_raise()`. It fires at COMMIT, after the recorder, whatever the flush order.
  - **Precondition:** the PUT must change a field (e.g. `mandatory` false→true). A no-op PUT flushes no UPDATE, so the trigger would never fire and the test would pass vacuously. Assert the precondition by checking, before the PUT, that the value differs.
  - Expect the PUT to be 5xx, **zero** history rows, and the template unchanged.
- **I. Stream + RBAC.** MANAGER GET `/admin/audit-events?type=CHECKLIST_TEMPLATE` returns the row, with `template_change` checked value by value. The HR lead gets 403.
- **J. Gate switch off.** Setting false → TIGHTENED, `gate_enabled = false`.
- **K (concurrency): dropped** (B-L3).

`AuditChecklistTemplateBranchIT` (kept from #400) asserts all 14 fields by value. `template_change` is null on every other branch present, **including SPONSORSHIP if #431 is on master at rebase**. Also add one row per effect with that effect's counts, so the app-counts CHECK is exercised.

`SchemaDocFreshnessTest` and the Flyway guard stay green.

### 7.3 Negative controls (apply, confirm the test turns red, then revert)

| Mutation | Must fail |
|---|---|
| count `released` with the post-edit code | unit 9, IT B |
| delete the empty-diff early return | service unit, IT C |
| `gates()` ignores `active` | unit 3/6 |
| drop ON_OFFER_SENT from `GATING_TRIGGERS` | enum test (PR 0), D140 parity IT |
| recorder `REQUIRES_NEW` | **IT H2** (the history row survives the rolled-back update) |
| try/catch around the counter inside the recorder | **`ChecklistTemplateHistoryRecorderTest`** (replaces v2's "→ IT H") |
| history write before `demandManage` | IT D |
| `countByCode` counts items, not candidates | IT A2 (c1) |
| count `holding` instead of `holdingOpen` | IT A (the DONE holder) |
| per-state S6 count ignores `sponsor_states` (the old v2 NOT-EXISTS-by-code) | IT A2 (c3/c4 counted) |
| per-state S6 count drops the NO_ENDORSEMENT clause | IT A2 (c5 counted) |
| per-state S6 count drops the COALESCE on `params ->> 'when'` | IT A2 (c6 not counted) |
| per-state S6 count checks "any item under the code" instead of "per state" | IT A2 (c2 not counted) |
| drop the first-template-per-rule_type pre-check | unit 12 |
| compute the S6 count for ON_OFFER_SENT | unit 7 |
| hard-code "create → NONE" | unit 11, IT E |
| `gate_fields_touched` derived from `gate_effect` instead of the diff | unit 3/4 |
| an app row writes LOOSENED with `candidates_released = NULL` | DB CHECK → branch IT fixture / IT B |
| swap `setting_key` / `subject_id` in the branch | branch IT |
| `gate_enabled` always true | IT J |
| migration fixture without the history insert (each case / quote / schema variant) | `TemplateMigrationsWriteHistoryTest` |

### 7.4 FE

- `templateChange.test.ts`, one test per item:
  - every §5.1 key in en and vi, including the `_zero` variants, `tpl_s6_later` (plural), `tpl_count_not_recorded`, `tpl_change` / `tpl_on` / `tpl_off` / `tpl_text_changed`, and the reused `ChecklistTemplates` field and trigger labels;
  - **the selection order**, with one case each:
    - (1) `template_change` null → fallback;
    - (1) unknown `gate_effect` → fallback;
    - (2) **a migration row with NONE** → `tpl_none_*`, not "count not recorded";
    - (3) a migration row with LOOSENED and null counts → `tpl_count_not_recorded`;
    - (4) app rows for each effect;
  - `tpl_gate_off` only for `gate_enabled === false`: `null` and `true` add nothing;
  - NONE decided by `gate_fields_touched` alone. A row whose `detail_to` contains `mandatory` but has `gate_fields_touched: false` renders "New items only";
  - malformed `detail_*` → raw text;
  - the title is shown, not `DEPT/CODE`.
- `AuditClient`: an unknown event type renders the default tone (the `TYPE_TONE ?? default` guard).
- `auditCsv.test.ts`: the raw JSON column.
- Editor test: the link shows with AUDIT_VIEW, and the sentence shows without it.
- en/vi key parity.
- `tsc --noEmit`, eslint and `next build` pass.
- Negative control: map LOOSENED to the TIGHTENED sentence → red.

---

## 8. Rollout and risk

**Merge ≠ deploy.**
- **Staging, BE:** merging to recruit-be `master` deploys nothing by itself. Staging deploys when `master` is fast-forward pushed to recruit-be `staging` (the flow as of 25/09).
- **Staging, FE:** recruit-fe staging also deploys on push to recruit-fe `staging` (`.github/workflows/cd-staging.yml`: `on: push: branches: [staging]`, verified on master).
- **Production:** each repo deploys from its own `production` branch.

1. **PR 0** (gating triggers) → CI → merge → FF-push BE `staging`.
2. **PR 1** (ledger) → CI (unit + integrationTest + Flyway guard) → merge → **FF-push BE `staging` → deployed.**
   - **Verify on staging:** do a throwaway flip on a template that has holders.
     - The editor dialog's number must equal the `/audit` row's number.
     - Revert the flip. That must write a second row with the opposite effect.
   - Record the numbers and the time in the PR, labelled staging.
3. **PR 2** (FE) → merge → **FF-push FE `staging` only after step 2 is deployed.** Before that, the BE answers 400 to `type=CHECKLIST_TEMPLATE` (`EVENT_TYPES`).
4. **Production:** the BE goes before or with the FE, never after. BE-first is safe:
   - an old FE bundle renders an unknown type through `safeText` (`audit/_utils/safeText.ts`), which falls back to the raw event type;
   - `candidate_id` is null, so no "open candidate" button renders;
   - by static check, an undefined `TYPE_TONE` entry renders fine on old bundles, and PR 2 adds the `?? default` guard anyway. No staging check is needed.
5. **Hard gate:** the ledger (PR 0 + PR 1) must be on master before the next BE master→production promote. That promote takes production from V095 in one contiguous run, and it includes V097's `CHECKLIST_READ` grant.
   - **Fallback, if a production promote is urgent before the ledger is ready** (lead resolution):
     - Promote the BE.
     - **Hold the recruit-fe production promote.** recruit-fe `origin/production` = `a850759` does **not** contain #229 (checked 25/09 13:33Z), so production has no editor screen until the FE is promoted.
     - Bracket the window with read-only snapshots of `checklist_templates (code, mandatory, active, trigger, last_modified_by, last_modified_date)`: one at the BE promote and one at the ledger deploy. Name both in the ledger PR.
     - Any difference between them is an unrecorded edit made through the API, attributable only through `last_modified_by`.
   - v2's "hold the BE below V097" is dropped.

**Risks**
- **Fail-closed:** template edits return 500 while the ledger is broken. Watch 5xx on PUT after deploy.
- **Pre-ledger gap:**
  - staging has had the editor since #229 (25/09);
  - edits made before PR 1 deploys exist only as `last_modified_by/date`;
  - per the parked doc (23/09 09:17Z) and D135 (24/09), both environments had 0 template edits at those times (not re-measured);
  - mitigation: the same read-only snapshot as §8.5, taken just before PR 1 deploys, on staging and production. No fabricated history rows.
- **Silent re-gating by the checklist backfill** is made visible by `candidates_at_s6_without_item`. The backfill run itself is not on the stream yet (§9).
- **#431 conflict** (§4.3) is expected and textual, and gets resolved on rebase.
- **PR 0 touches the gate.** It is behaviour-identical and guarded by the parity IT and the enum test.
- **Gate cap:** the count reads uncapped items, while the gate reads at most 200 per candidate (D140; about 33 max today). This difference is inherited, not new.

---

## 9. Follow-ups (out of scope, filed separately)

- **Put backfill runs on the audit stream** (the lead files the bead). `POST /admin/checklists/backfill` (IMPORT_RUN, D136) turns a TIGHTENED or RECODED row's `candidates_at_s6_without_item` into held candidates, and today it leaves no ledger trace.
- A `subject_id` filter on `/admin/audit-events` for a per-template history view, only if someone asks for it (YAGNI now).

---

## 10. DECISIONS entry

Use the **next free D-number at merge. That was D144 as of 25/09 13:33Z.** At that time D139 (#431), D141 (#434) and D142 (#435) were claimed by open PRs, and D143 was merged with #430. Re-grep master and the open PRs at merge time.

The entry should cover:
- the table;
- `gate_effect`, `gate_fields_touched` and the three counts, and what each means (§3.2);
- fail-closed;
- the migration convention (§4.4);
- the production promote gate and its fallback (§8.5).

**D08 sentence (B-L1):** "A local ledger table read through the audit stream's UNION (like `checklist_item_history`, `offer_history`, `rbac_grant_history`) is consistent with D08. D08 made the local `audit_outbox` optional plumbing toward `audit-log-service`, not the only place an audit fact may live. Every existing R20 branch is already a local ledger, and relaying them later loses nothing."

---

## Open questions (v3)

v2's open questions are resolved:
1. The per-state count is now exact (A MED-1).
2. The production fallback is the lead's resolution (§8.5).
3. A nullable `gate_enabled` on migration rows stands, guarded by its CHECK. Neither reviewer objected in the confirm round.
4. `TYPE_TONE` gets the `??` guard.

None remain open from this designer.
