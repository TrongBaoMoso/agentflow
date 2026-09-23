# Hire handoff completeness — recruit fills its own part before Joined

- **Date:** 2026-09-24
- **Owner:** Bao Trinh
- **Beads:** agentflow-dkt0 (1-1 gate + W-2/1099), parent agentflow-8pqy (recruit → HR hire handoff)
- **Repos:** recruit-be, recruit-fe (no change to ai-hr-be in this spec)
- **Status:** revised after two independent reviews (both APPROVE-WITH-CHANGES), for Bao's review

## 1. Problem

When a Loan Officer reaches **Joined**, recruit sends a `RECRUIT_HIRED` payload that becomes an
HR draft (contract: https://claude.ai/artifact/WU8fTVxCPcXhRDySf127rS). The HR person then fills
the rest in the Add employee wizard and clicks Create account.

Two things recruit owns are missing, so an HR person who never spoke to the candidate has to
chase them:

1. **The W-2 / 1099 decision is captured nowhere.** It is made at the 1-1 onboarding meeting
   (business order: form → $100 fee → 1-1 → contract → sign), but recruit's Joined gate checks only
   *signed* + *fee paid or waived* (`CandidateServiceImpl.assertJoinedGate`, line 898). Neither
   recruit nor MOSO's `LORecruiting` stores the outcome. HR **requires** `employmentType` to submit
   (`employment/hire.go` `requiredFields`), so every draft stalls on a question HR cannot answer.
2. **Contact data recruit could hold is missing.** On recruit production (2026-09-24, read-only),
   of 59 unmerged `S6` candidates, **31 have no mailing address**. All 31 also have
   `completed_detail_form` and `is_corporate_loan_officer` empty — the three fields added together
   in recruit-be #363 (2026-09-18). So these rows were imported before #363 and **never
   re-imported**; the data exists in MOSO (measured 2026-09-17 on MOSO production: 97% of joined
   rows carry a personal address). All 31 have a `legacy_key`. These 31 are already hired, so they
   only prove the gap; the rows that matter are the not-yet-Joined ones with the same symptom
   (counted in step A).

**Principle (Bao, 2026-09-24):** whoever works with the candidate fills everything recruit can
know. HR fills only what only HR can (work email, entity, placement, start date, contract,
probation, payroll).

## 2. Scope

In: (A) re-import the rows that predate #363; (B) record the 1-1 outcome (loan-officer type +
employment type) and send it; (C) require recruit's fields before Joined.

Out: ai-hr-be API and return path (Hùng, tracked on agentflow-8pqy); blacklist exchange
(agentflow-9hba); importing MOSO's `onboarding_meeting_status` history.

## 3. Design

### A. Re-import candidates imported before #363

- A one-off backfill re-pulls every candidate whose `legacy_key` is set and whose three #363
  fields are all null, through the **existing** MOSO upsert path (`MosoRowUpsertServiceImpl`), so
  every existing rule applies unchanged (re-import freeze, recruiter-locked fields, mailing-address
  resolution in `MosoRowMapper.mailingAddress`).
- **Who it helps:** candidates **not yet Joined** (S1–S5). The handoff fires only on a human
  `transition()` into S6 (`CandidateServiceImpl` ~760), so re-importing a row that is already S6
  creates no HR draft — those people were hired before this feature and HR already has them.
- **How, with no new code in packs:** rows arrive through `/admin/import/moso`, fed by
  `scripts/moso-migration-runner.py` from `ExportLORecruitingForMigrationOp` (cursor + batch only,
  no per-key filter). Run the runner with `--dump-only`, filter the dump to the target
  `legacy_key`s, import only those. (The MOSO webhook is a separate path and is not used.)
- **The existing rules are weaker than they sound:** only fields a recruiter has *locked*
  (V070) are protected; any other profile field takes MOSO's value, and a row with no human
  progress also takes MOSO's stage/status/owner. So the **dry-run diffs every field** and is
  reviewed before the real import, not just counted.
- Output: per-field counts before / after on production (read-only measurement).

### B. The 1-1 outcome: loan-officer type + employment type

HR needs **two** answers, not one: `lo_type` and `employmentType` (required at submit). Only
`INDEPENDENT` fixes the second (`INDEPENDENT` ⟺ `contract`, `jobrole/losubtype.go`);
`CORPORATE`/`OUTSIDE` still leave a choice. So recruit records both.

- New nullable candidate column **`lo_type`**, values exactly the four MOSO (`LoanOfficerType`)
  and ai-hr-be (`jobrole.go:131 validLoType`) both use:

  | value | shown as | tax |
  |---|---|---|
  | `CORPORATE` | Corporate loan officer | W-2 |
  | `OUTSIDE` | Outside loan officer | W-2 |
  | `INDEPENDENT` | Independent loan officer | 1099 |
  | `MORTGAGE_ADVISOR` | Mortgage advisor | not tied to a tax status by either system |

- New nullable column **`employment_type`**, HR's values: `full_time`, `part_time`, `contract`,
  `outside_sales_person` (MOSO's `AssociateType`: employee W-2 full/part time, contractor W-9,
  outside salesperson W-2). `intern` is not offered.
- **One picker, not two.** The profile shows the combinations that occur, each saving both
  columns; "Other" opens the two fields separately:

  | option shown | lo_type | employment_type |
  |---|---|---|
  | Corporate — W-2 employee, full time | `CORPORATE` | `full_time` |
  | Corporate — W-2 employee, part time | `CORPORATE` | `part_time` |
  | Outside — W-2 outside salesperson | `OUTSIDE` | `outside_sales_person` |
  | Independent — 1099 contractor | `INDEPENDENT` | `contract` |

  (MOSO's own pairing: `INDEPENDENT`+`contractor`, `OUTSIDE`+`outside_sales_person`,
  `Admin.java` ~3622/3664.) Recruit refuses `INDEPENDENT` with anything but `contract`, and
  `contract` with anything but `INDEPENDENT` — the same rule HR enforces, so HR never gets a pair
  it would reject.

- **Where it is set:** a "1-1 outcome" field on the candidate profile. There is no "1-1 done"
  form today — a `MEETING` activity is a generic log, and the call-outcome modal only *schedules*
  the 1-1 — so building one is not needed; Joined simply requires the field (C).
- **Who may set it:** the existing `CANDIDATE_UPDATE` for now. Bao believes Onboarding runs the
  1-1 — **unconfirmed**; a dedicated gate is added only once that is confirmed.
- **Audit + lock:** reuse the existing `candidate_change_log` (V071) through new
  `CandidateProfileField` entries, and make both fields lockable so a MOSO re-import never
  overwrites them.
- **Handoff payload:** `RECRUIT_HIRED` gains `lo_type` and `employment_type` (a decision, not a
  hint). The `is_corporate_loan_officer` hint added in #403 is removed — it was a stand-in for
  this. Still pre-consumer (no HR reader exists), so `recruit.hired.v1` stays.

### C. Required before Joined

Use the existing `stage_requirements` mechanism (V041 seeded two `S6` rows, inactive; D35
override with a mandatory reason already exists). Requirements for `S6`:

| field | already in `CandidateFieldRegistry` |
|---|---|
| `first_name`, `last_name`, `email`, `phone`, `nmls_id`, `mailing_address` | yes |
| `lo_type` | add |
| `employment_type` | add |

- **Validity is new code.** Today "filled" means only non-null / non-blank / non-empty
  (`CandidateFieldRegistry.hasValue`): `{country: US}` counts as an address and any text counts as
  a phone. Add a per-field check: `phone` must normalize to E.164, `mailing_address` must be more
  than a bare country. A failing field is reported as `phone:invalid` / `mailing_address:invalid`,
  not as missing, so a recruiter looking at a filled phone is told why.
- `sponsor_states` (V041 row) stays as seeded — not part of this spec.
- **Rollout, not a flip:** (1) ship the rows **inactive**; (2) run A; (3) count how many `S5`
  candidates would be blocked, per field, on production; (4) Bao activates once the numbers are
  acceptable. The D35 override (reason required, recorded) remains the escape hatch — but only
  `ONBOARDING` and `ADMIN` hold it (V042), so a blocked recruiter must ask them.

## 4. What HR still fills

Work email, entity, placement (department/team), start date, job title, signed contract type and
end, probation, role configuration beyond `lo_type`, identifiers, payroll. `employmentType` is
**pre-filled** from recruit and only confirmed.

## 5. Risks

- **Blocking recruiters:** activating C before A leaves 31+ candidates unable to reach Joined.
  Mitigation: order A → count → activate; override kept.
- **Wrong person sets `lo_type`:** if Onboarding does not run the 1-1, the permission is on the
  wrong role. Mitigation: confirm before seeding; one-row change.
- **Re-import side effects:** re-running the upsert on old rows could overwrite recruiter edits.
  Mitigation: it goes through the existing freeze/lock rules only; dry-run count first.
- **`MORTGAGE_ADVISOR`:** accepted by HR but exempt from its pairing rule; offered only under
  "Other".
- **HR may change `lo_type` later:** a W-2-only state licence makes HR coerce an unset or
  `INDEPENDENT` subtype to `OUTSIDE` (`jobrole.go` `W2CoercesSubtype`). Recruit's value is the
  1-1 decision at hire time; HR's licence rules can still override it afterwards. Worth telling
  Onboarding so the 1-1 considers the licence states.

## 6. Testing

- Unit: gate refuses Joined without `lo_type` / `employment_type` / valid phone / real address
  when rows are active, allows with override + reason; invalid pairs refused; payload carries
  both fields and no longer `is_corporate_loan_officer`.
- Negative controls: removing each new check turns a test red.
- Integration: `stage_requirements` rows read from Postgres; backfill dry-run against a seeded row.
- Production (read-only) counts before and after A, and the blocked-if-activated count for C.

## 7. Review log

Two independent reviewers (recruit code; HR + MOSO), 2026-09-24. Changes made:
`employment_type` added (only `INDEPENDENT` determines it); "1-1 done form" replaced by a profile
field (no such form exists); validity check marked as new code (`hasValue` is null/blank only);
re-import scoped to not-yet-Joined rows (S6 rows produce no draft) and dry-run must diff every
field; audit/lock reuse V071 + `CandidateProfileField`; permission `CANDIDATE_UPDATE` until the 1-1
owner is confirmed; Licensing `AUTO_ATTRIBUTE` side effect dropped (YAGNI); HR licence coercion
added to risks. Rejected after checking origin/master: "HR does not accept `MORTGAGE_ADVISOR`"
(it does, `jobrole.go:131`; the reviewer read a stale tree).
