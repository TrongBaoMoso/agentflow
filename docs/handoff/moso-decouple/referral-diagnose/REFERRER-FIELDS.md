# Which MOSO referrer field is real: `referrer` or `referred_lo`? (09/11)

Read-only research. Code: packs `origin/master` 45c09d1bd10, moso `origin/master` 02b6cf3594, recruit-be `origin/master`.
Data: MOSO PROD Datastore (lender-rate, ns 5716104026521600), read on 09/11. **Counts only**: no names, e-mails or keys.
Nothing on staging or production was changed.

## Short answer

- **`referred_lo` is the referrer from sign-up, and the money follows it.** packs sets it once, when a Loan Officer referrer is first attached. Later edits never move it. The $500 LO-referral bonus Check goes to the person in it.
- **`referrer` is the latest typed referrer e-mail, not the sign-up one.** It is a copy of `referred_by` (the "Referrer's email" box). packs points it again every time someone edits `referred_by`. It can be anyone: an LO, a recruiter, or an outside person. No bonus logic reads it.
- The 09/11 rule "the sign-up referrer wins" assumed `referrer` was the sign-up value. The code shows the opposite: for an LO referral, **the sign-up referrer is `referred_lo`**.
- Recommendation: Recruit uses `referred_lo` when it is set. It falls back to `referrer` only when `referred_lo` is empty (recruiter, outside or non-LO referrers). When they differ, Recruit keeps `referrer` as the "edited / current claim" and marks the row for review. Bao needs to confirm this before it ships, because it reverses the 09/11 choice.

## 1. The three fields

| Field | Type / label | What it holds | Source |
|---|---|---|---|
| `referred_by` | e-mail, "Referrer's email", tracked | whatever was typed or picked as the referrer | `HasReferInfo.java:14` |
| `referrer` | FK to `LORecruiter`, label "Recruiter name", **not indexed, not tracked** | the keyName of a LORecruiter row, and that keyName **is the `referred_by` e-mail** | `LORecruiting.java:154`, `EnsureLORecruiterOp.java:57,79` |
| `referred_lo` | FK to `Admin`, label "Referring LO", indexed, tracked | an Admin keyName (the login e-mail, or a numeric id) | `LORecruiting.java:163` |

## 2. Where each field is SET (packs unless marked moso)

### `referrer` (always derived from `referred_by`, by `EnsureLORecruiterOp`)

- `EnsureLORecruiterOp.java:29-30,57,79`: `LORecruiter` is ensured with key = `referred_by`, then `ilo.referrer = recruiter.keyName()`. It requires `referred_by`, so with no `referred_by` nothing is written.
- It is queued by:
  - public / staff registration: `RegisterInterestedLoanOfficer.java:84`;
  - the "refer a Loan Officer" form: `SaveLORecruiterOp.java:111`;
  - Recruit's invite API: `RecruitAPI.java:701-702,3093`;
  - **every later edit of `referred_by` on an existing row: `LORecruiting.java:1143-1148` (afterSave, when the old value was not empty). This is the re-point.**
- The sign-up link (`?ref=` / slug) does not write it directly. The page sends the owner's e-mail as `referred_by` (`LeadOriginStamp.java:192-201` checks that slug against `referred_by`), and the hooks above derive `referrer` from that.
- Ally: `CreateILOFromAllyPayloadOp.java:204` sets `referred_by` = the ambassador, so `referrer` follows through the same hook.
- Staff edit in MOSO admin (moso `LORecruitingEditView.java:638-646,679-684`) edits `referred_by` with the LO / recruiter picker or the free e-mail box. `referrer` then follows through `LORecruiting.java:1143`.
- CSV import (`ParseFileCsvRecruitedLoanOfficersOp.java:70-72`) only touches `referred_by`.

### `referred_lo` (server-decided, first touch)

- At create, from `referred_by`, only when that e-mail is an active **Loan Officer** Admin and the source is not "recruiter": `LORecruiting.java:759-778`. A recruiter referrer goes to `recruiter` instead.
- At create, the program check: `LORecruiting.java:802` -> `LoRecruiterProgramStanding.java:410-424` (CSV import / signed-in LO's own lead).
- First referrer attached by an edit, **only if `referred_lo` is still empty** and the referrer is an approved program member: `LORecruiting.java:854-857` -> `LoRecruiterProgramStanding.java:439-454`. The code comment says: "an edit never creates a referral bonus link".
- The nightly reconcile, again only when it is empty: `ReconcileLoRecruiterProgramCreditCronOp.java:110-113,156-158`. The comment says: "a staff re-point of the link is never credit".
- Ally: `CreateILOFromAllyPayloadOp.java:239` (the ambassador Admin, the same person as `referred_by`).
- "Refer a Loan Officer" form: `SaveLORecruiterOp.java:57` copies it at create only.
- Cleared when a staff recruiter credits himself (self-credit hold): `LoRecruiterProgramStanding.java:495`.
- **Never accepted from a public body**: `WebPlusAPI.java:2679-2689` (`stripCreditFields`).
- **No path re-points it when `referred_by` is edited later.** The `isChanged(referred_by)` block that sets it is in `beforeCreated` only. The MOSO staff form has no input for it.

## 3. Where each field is READ

### `referred_lo` (money and the LO-facing lists)

- **At conversion to Admin**, it is copied to `Admin.referred_lo`. `referred_by` is used only when it is empty: `Admin.java:2012-2027`.
- The $500 / $1000 cash bonus is computed from `Admin.has_referred_lo`: `Admin.java:2147-2160`.
- **The bonus Check is created with `owner = Admin.referred_lo`**: moso `CreateLoanOfficerReferralSpecialRequest.java:31-49`. The packs join for it is `ReferralCheckJoin.java:18-33`.
- Marking it paid sets `Admin.paid_referral_bonus`: `Check.java:419-433`.
- Referral program per funded loan: `GenerateMonthlyLoanOfficerReferralBonusReportCronOp.java:54`.
- The LO's referral report: `UpdateReferralLoanOfficerReport.java:52,61`.
- moso "My referrals" for an LO filters `referred_lo = me`: `LoanOfficerReferralsView.java:115-120`. The summary report also uses it: `LoanOfficersSummaryReport.java:62,76`.
- Export label "Referring LO's full name/email/phone": `ExportReferralsOp.java:67-69`.
- packs `referrals/byOwner` ranks it first: `ReferralByOwner.java:37,159`.

### `referrer` (outside-referrer bookkeeping, e-mails)

- MOSO "Referrers" page (outside referrers only, `referrer_is_internal_loan_officers = false`): `LORecruitingsView.java:70,83-88,126-132`.
  - Its "Request referral bonus" button (`LORecruitingsView.java:207-211` -> `ReferralBonusRequestOp.java:26-36`) is a staff-typed Zelle Check that names the ILO. It is not keyed by `referrer`.
- "Your referral attended / joined" e-mails go to the `referrer` address: `LORecruiting.java:1484-1505`.
- Recruit reads it as the confirmed referrer: recruit-be `MosoRowMapper.java:101` (REFERRER_FK).
- **No bonus, Check, report or eligibility code reads `referrer`.**

## 4. PROD measurement (counts only)

`referrer` is not indexed, so the scan covered every LORecruiting row with `referred_by` or `referred_lo` set (union 5,517 of 131,436) and read both fields by batch lookup. `referrer` is only ever written from `referred_by`, so the only rows this misses are rows whose `referred_by` was cleared later and that never had `referred_lo`.

| | rows |
|---|---|
| LORecruiting total | 131,436 |
| `referred_by` set | 5,381 |
| `referred_lo` set | 3,079 |
| `referrer` set | 4,079 |
| both `referrer` and `referred_lo` | 1,925 |
| - same person | 1,850 |
| - **different people** | **75** |
| `referrer` only | 2,154 (source "recruiter" 1,329; LO 450; others 268) |
| `referred_lo` only | 1,154 |

"Same person" means the `referrer` e-mail equals the Admin's company / login e-mail or keyName, or `LORecruiter.associate` is that Admin.

What the values look like:

- `referrer`: always an e-mail (4,079 / 4,079).
- `referred_lo`: an Admin keyName. 2,779 look like a login e-mail, 292 are numeric, 8 other.
- `referrer` vs the current `referred_by`:
  - equal in 3,825;
  - **different in 163**;
  - still set while `referred_by` is empty in 91.

  So even as "the latest referrer", `referrer` is stale in about 6% of rows.

### The 75 both-and-different rows

- The current `referred_by`:
  - equals `referrer` in **57**: `referred_by` was edited after sign-up, `referrer` followed, `referred_lo` stayed;
  - equals `referred_lo` in 2 (`referrer` is the stale one);
  - is a third value in 10;
  - is empty in 6.
- The `referred_lo` Admin is a Loan Officer in 73 (active in 43). The `referrer` maps to an Admin in 57 (internal LO in 52); 18 are outside or unknown e-mails.
- Created: 2023 3, 2024 45, 2025 14, 2026 13. Status `joined` 25. Program credit 0. Outside-referrer bonus requested 0.
- **Converted to Admin: 49.** `Admin.referred_lo`:
  - equals ILO `referred_lo` in **39**;
  - equals ILO `referrer` in 1;
  - matches neither in 2;
  - is empty in 7.
- **Rows with a bonus requested or paid (`cash_bonus_requested` 6, `paid_referral_bonus > 0` 10): the money went to the `referred_lo` person in 12, to the `referrer` person in 1, and to neither in 2.**
  - In 8 of those 12, the current `referred_by` / `referrer` names someone else. Money was paid to `referred_lo` while MOSO's "Referrer's email" showed another person.

For comparison, of the 1,850 same-person rows, 515 converted and 474 carry the same `Admin.referred_lo`.

Rows with only `referrer` (2,154): 514 converted, and 265 of those got an `Admin.referred_lo` through the conversion fallback on `referred_by` (`Admin.java:2016`), not from `referrer`. 49 were paid. Rows with only `referred_lo` (1,154): 190 converted, 0 paid or requested.

### Audit trail

The `History` kind has **no rows** under any of the 75 ILOs, and `AuditLog` has no container. So the data cannot date which field changed. The evidence for "which one moves" comes from the code (section 2) and the 57 rows where `referrer` equals the current `referred_by`. Both point the same way: `referrer` / `referred_by` were edited, and `referred_lo` kept its first value.

## 5. Conclusion and recommendation

- **Who brought the LO in (sign-up, first touch):** `referred_lo`, for every LO referral. packs sets it from the sign-up referrer and deliberately never moves it on an edit (anti-fraud: "an edit never creates a referral bonus link").
- **Who the money follows today:** `referred_lo`. It is copied to `Admin.referred_lo`, and the bonus Check is created with that owner. Measured on PROD: 12 of 15 paid or requested diverging rows went to `referred_lo`, and 1 to `referrer`.
- **What `referrer` is:** the latest value of the typed referrer e-mail, re-pointed on every edit, and sometimes stale. It is the only field that can name a recruiter or an outside (non-LO) referrer, and MOSO uses it for the outside-referrer page and the referrer notification e-mails.

**Recruit rule (recommended):**

1. Use `referred_lo` when it is set (resolve the Admin).
2. Otherwise, use the server-resolved origin owner (`SLUG_SERVER_RESOLVED`).
3. Otherwise, use `referrer` (recruiter, outside or non-LO referrers).
4. When `referrer` and `referred_lo` name different people, keep `referrer` as an "edited referrer / claim" field for display and audit. Never use it for money, and show the row in a review list. A staff edit may be a real correction, but packs does not pay on it either.

**Effect on the 89 staging rows** (`NOTES.md` section 1; packs rule split REFERRED_LO_FK 69, SLUG_SERVER_RESOLVED 12, REFERRED_BY_EMAIL 8):

- 69 + 12 = **81 switch to packs' person**, so `owner_differs` falls to about 8.
- The 8 REFERRED_BY_EMAIL rows have no `referred_lo`, so step 3 keeps Recruit's `referrer`. They stay different because `referrer` there is stale against the current `referred_by`, which is the same 4-6% drift measured on PROD. They go to the review list (like the 5 unconfirmed typed-email rows already left out).
- On PROD the same rule would move the 75 diverging rows. 49 of them have converted, and 39 already carry the matching `Admin.referred_lo`, so Recruit would agree with what MOSO paid.

Before shipping, this needs Bao's confirmation, because it reverses the 09/11 "keep `referrer`-first" choice. That choice rested on `referrer` being the sign-up value, and it is not.
