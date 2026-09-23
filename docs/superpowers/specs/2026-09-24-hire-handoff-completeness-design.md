# Hire handoff completeness — a "Send to HR" action, filled by whoever ran the 1-1

- **Date:** 2026-09-24 (rev 3)
- **Owner:** Bao Trinh
- **Beads:** agentflow-dkt0, parent agentflow-8pqy (recruit → HR hire handoff); related agentflow-tg34
- **Repos:** recruit-be, recruit-fe (no change to ai-hr-be in this spec)
- **Status:** rev 3 — trigger changed to an explicit action (Bao chose option B, 2026-09-24)

## 1. Problem

The `RECRUIT_HIRED` handoff (contract: https://claude.ai/artifact/WU8fTVxCPcXhRDySf127rS) was
wired to fire when a person moves a candidate into `S6` (Joined) through
`CandidateServiceImpl.transition()`. Three facts, verified on `origin/master` 2026-09-24:

1. **Nothing in recruit-fe calls the transition endpoint.** No screen moves a stage.
2. **Candidates become `S6` through the MOSO import.** The Loan Officer signs (Inkless) and pays
   (PayPal) in MOSO; `MosoRowMapper.mapIlo` sets `S6` directly for `interviewed_and_accepted`, a
   running HR/NMLS process, or `paid_and_signed` (~lines 753–761). The handoff never runs on that
   path, by design (so a legacy re-import cannot fire thousands of events).
3. **The W-2 / 1099 decision is captured nowhere** — made at the 1-1 onboarding meeting, stored in
   neither recruit nor MOSO's `LORecruiting`. ai-hr-be requires `employmentType` at submit.

And contact data recruit could hold is missing: on recruit production (2026-09-24, read-only), 31
of 59 `S6` candidates have no mailing address, and all 31 also lack the other two fields added by
recruit-be #363 — they were imported before #363 and never re-imported. MOSO holds the data
(97% of joined rows carry an address, measured 2026-09-17).

So, as built, the handoff would send nobody, and if it did send, HR would have to chase the
candidate for the W-2/1099 answer and the address.

**Principle (Bao, 2026-09-24):** whoever works with the candidate completes everything recruit can
know, then hands over. HR fills only what only HR can.

## 2. Decision

Decouple the handoff from the stage move. The candidate reaches `S6` however it does today (MOSO).
A person — Onboarding, who runs the 1-1 (**Bao's belief, unconfirmed**) — completes the profile
and clicks **Send to HR**. The button works only when the profile is complete.

## 3. Scope

In: (A) re-import pre-#363 rows; (B) the 1-1 outcome fields; (C) the Send to HR action with a
readiness check; (D) the payload carries the outcome.

Out: ai-hr-be API and return path (Hùng, agentflow-8pqy); blacklist exchange (agentflow-9hba);
the Invite button stage (agentflow-tg34); importing MOSO's meeting history.

## 4. Design

### A. Re-import candidates imported before #363

- Target: candidates with a `legacy_key` whose `completed_detail_form`, `is_corporate_loan_officer`
  and `mailing_address` are all null — `S6` first (they can now be sent), then the rest.
- **Excluded:** any target row with a human entry in `candidate_change_log`. Only fields a
  recruiter locked (V070) survive a re-import; unlocked edits would be overwritten by MOSO.
  Skipping edited rows removes that risk instead of reviewing it row by row.
- **How, no packs change:** `scripts/moso-migration-runner.py --dump-only` against the MOSO export
  (`ExportLORecruitingForMigrationOp`, cursor only), a new small filter script keeps only the
  target `legacy_key`s (`__key`) of kind `lo_recruiting`, then `--from-dir` imports the filtered
  dump through `/api/v1/admin/import/moso`.
- **Production writes are gated:** the production run is executed only after Bao approves the
  target list and the snapshot. Before it, a read-only snapshot of the target rows' profile
  columns is saved; after it, a per-field before/after report is produced from the snapshot.

### B. The 1-1 outcome: loan-officer type + employment type

HR needs two answers: `lo_type` and `employmentType`. Only `INDEPENDENT` fixes the second
(`INDEPENDENT` ⟺ `contract`, ai-hr-be `jobrole/losubtype.go`).

- New nullable candidate columns, stored as strings:
  - **`lo_type`** — `CORPORATE`, `OUTSIDE`, `INDEPENDENT`, `MORTGAGE_ADVISOR` (the values of MOSO
    `LoanOfficerType` and ai-hr-be `jobrole.go:131 validLoType`).
  - **`employment_type`** — `full_time`, `part_time`, `contract`, `outside_sales_person`
    (ai-hr-be values; MOSO `AssociateType`: employee W-2 full/part time, contractor W-9, outside
    salesperson W-2).
- **Pair rule, enforced on save:** `INDEPENDENT` ⟺ `contract` (both directions) — the rule ai-hr-be
  enforces, so HR never receives a pair it would reject. Setting one field without the other is
  allowed (the readiness check asks for both).
- **UI:** one "1-1 outcome" picker on the candidate profile's Licensing tab, saving both columns:

  | option | lo_type | employment_type |
  |---|---|---|
  | Corporate — W-2 employee, full time | `CORPORATE` | `full_time` |
  | Corporate — W-2 employee, part time | `CORPORATE` | `part_time` |
  | Outside — W-2 outside salesperson | `OUTSIDE` | `outside_sales_person` |
  | Independent — 1099 contractor | `INDEPENDENT` | `contract` |
  | Other… | two separate selects | |

- **Edit permission:** the existing candidate update permission (whoever can edit the profile).
- **Audit:** two new `CandidateProfileField` entries (`lo_type`, `employment_type`, not PII, not
  MOSO-owned — MOSO never writes them, so no lock is needed), recorded in `candidate_change_log`
  (V071) by the existing diff.

### C. Send to HR

- **Endpoint:** `GET /candidates/{id}/hr-handoff` → readiness; `POST /candidates/{id}/hr-handoff`
  → send. Response for both:
  `{ "enabled": bool, "ready": bool, "missing": [..], "handed_off_at": ts|null }`.
- **Allowed when all hold** (`missing` lists each failure by key):
  - `stage` is `S6` → `stage:not_joined`
  - a SIGNED offer with the fee PAID or WAIVED (the existing Joined gate) → `offer:not_signed_and_paid`
  - `first_name`, `last_name`, `email`, `nmls_id` present → `first_name` …
  - `phone` normalizes to E.164 → `phone:missing` / `phone:invalid`
  - `mailing_address` has at least one of line1/city/zip (not a bare country) → `mailing_address:missing`
  - `lo_type` and `employment_type` present → `lo_type`, `employment_type`
  - not already sent (`handed_off_at` null) → `already_sent`
  - the feature flag on → `enabled=false`, POST answers 409
- **POST** with `ready=false` answers **400** with the same body. With `ready=true` it enqueues
  through the existing `HrHandoffEnqueuer` (atomic `handed_off_at` compare-and-set, outbox, relay,
  8 retries) and returns the new state. A lost race answers **409** `already_sent`.
- **Permission:** new `CANDIDATE_HR_HANDOFF`, seeded to `ONBOARDING` (ADMIN holds `*`). A
  dedicated permission here because it is an ACTION with an external effect; the seed is one row
  if Onboarding is not the owner.
- **One door:** `transition()` no longer enqueues. The handoff happens only through this action.
- **UI:** in the candidate drawer, for `S6` candidates and users holding the permission, when
  `enabled`: a "Send to HR" button. Not ready → disabled, with the missing items listed in plain
  words and a link to the tab that fixes each. Sent → "Sent to HR · <date time>".

### D. Payload

`RECRUIT_HIRED` gains `lo_type` and `employment_type`. The `is_corporate_loan_officer` hint from
#403 is removed (a stand-in for this). Pre-consumer, so `recruit.hired.v1` stays.

## 5. What HR still fills

Work email, entity, placement, start date, job title, signed contract type and end, probation,
role configuration beyond `lo_type`, identifiers, payroll. `employmentType` arrives pre-filled.

## 6. Risks

- **Wrong owner:** if Onboarding does not run the 1-1, the permission is on the wrong role — one
  seed row; confirm with Onboarding.
- **People already in HR:** a candidate hired long ago and already onboarded in HR can be sent
  again; the HR API is asked to answer `already_employee` (contract page) rather than create a
  second person.
- **HR may change `lo_type` later:** a W-2-only state licence makes HR coerce an unset or
  `INDEPENDENT` subtype to `OUTSIDE` (`jobrole.go` `W2CoercesSubtype`) — tell Onboarding the 1-1
  should consider licence states.
- **Re-import:** limited to rows no human edited, snapshot before, report after, production run
  approved by Bao.
- **Flag off = invisible button:** until HR's API exists, the button is hidden, so the fields can
  ship and be filled ahead of go-live.

## 7. Testing

- Unit: each readiness rule, both directions of the pair rule, POST 400/409/200, enqueuer called
  once, `transition()` into `S6` no longer enqueues, payload has both fields and not
  `is_corporate_loan_officer`; FE picker maps both columns, button states (hidden / disabled with
  reasons / sent).
- Negative controls: removing each rule turns a test red.
- Integration: V-migration columns + permission seed against Postgres; endpoint through the
  controller with RBAC.
- Production (read-only): readiness counts across current `S6` before and after A.

## 8. Review log

Rev 2 — two independent reviews (recruit code; HR + MOSO): added `employment_type`; no "1-1 done"
form exists; validity is new code; re-import risk; reuse V071; YAGNI on the Licensing rule.
Rejected: "HR does not accept `MORTGAGE_ADVISOR`" (it does, `jobrole.go:131`).
Rev 3 — planning found the handoff was wired to a transition nothing calls while `S6` arrives
from MOSO; Bao chose an explicit Send to HR action (option B).
