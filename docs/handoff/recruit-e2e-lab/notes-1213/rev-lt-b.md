# rev-lt-b — D255 second review (recruit-fe #446 a7cac3fc focus; recruit-be #627 5907b51e read for contract)

## Verdicts
- recruit-fe #446: APPROVE (no CRITICAL/HIGH). Two MEDIUM/LOW copy/process notes below.
- recruit-be #627: APPROVE on the parts that touch FE contract (read only, BE suites not run by me).

## Verification done
- 8 affected FE suites via --runTestsByPath: 8/8 passed, 194 tests (hireClassification, schema, LicensingTab, CandidateEditModal.agreementPrompt, OnboardingHireMeetingModal.realCatalog, WorkQueueClient.hireClassification, hireI18nKeyCoverage, workQueue).
- Caveat: `npm ci` failed (npm registry auth), so I ran in a throwaway worktree with node_modules copied from another worktree. tsc showed 2 errors only in src/shared/omni (`fileSharing`), files this PR does not touch: caused by my borrowed node_modules (omni package version), not by the PR. Do not count tsc as verified.
- CI at review time: mergeStateStatus BLOCKED, `pr-check / check` had no conclusion yet (pending). Wait for it before merge.
- Worktree and temp refs removed.

## Answers to the questions
1. Accidental legacy save onto a candidate that never had one? No. Select offers only W-2/1099 unless the STORED value is legacy, and then only that one (loTypeOptionsFor). Schema refuses a legacy value that differs from original.lo_type (path lo_type, 'lo_type_not_selectable'); BE requireSelectable refuses the same (new value, or the other legacy value). Done modal: two radios, legacy seeds nothing (selectableOrNull), Confirm disabled until a pick, so lo_type sent is always OUTSIDE/INDEPENDENT.
2. Unrelated edit on a legacy candidate saves? Yes. FE: form lo_type == original, patch omits it (schema.ts:178 only sets patch.lo_type on change); BE: equal-to-current legacy and null both pass. Tested on both sides (employment_type-only edit, re-sent unchanged).
3. FE schema vs BE refusal: aligned, so no raw 400 in the normal path. The error is rendered translated (LicensingTab error={t(message)}). Only mismatch: FE compares to the form-load snapshot, BE to the live row; a stale form after someone else changed lo_type could still 400. Edge, LOW, ignore.
4. MOSO_OWNED "Send again" safe? Yes. recruit-be resolves the payload from the fresh candidate; Corporate/Advisor never produce is_corporate_loan_officer, so a legacy value is never sent. If the user presses Send again without fixing the profile, the row simply dead-letters again with the same MOSO_OWNED message (harmless noise, no wrong data). After the profile is changed to W-2/1099 the resend carries the real value.
5. Copy: plain and truthful, with notes below.

## Findings (ranked)
MEDIUM-1 (copy, product call): `meeting_hire_legacy_note` (en+vi) says "For a Corporate hire, pick W-2". lotype_research.md shows Corporate is a MOSO Admin-level type with no agreement; telling staff to pick W-2 freezes a W-2 agreement for them. It matches the BE error text ("A Corporate hire is picked as what the loan officer signs (W-2)") so it is consistent, but it is a policy statement the implementer chose, not something Bao/Onboarding confirmed (research Q-2/B2 still open). Suggest Bao confirms, or soften to "Pick what they sign: W-2 or 1099." (drop the Corporate sentence).
LOW-1: `sync_hire_moso_owned` says "Recruit doesn't send one for Corporate or Mortgage advisor" which is accurate but tells the user nothing new once they follow the next sentence; fine. Consider dropping the first clause to keep it simple (Bao likes simple copy). The Open profile + Send again buttons show for every MOSO_OWNED row even if the candidate was already fixed; harmless.
LOW-2: `lo_type_legacy_hint` "Staff set Corporate on the MOSO Admin." is true per research (no onboarding path produces it). en/vi parity checked; vi reads fine ("loại cũ").
LOW-3: Tests that used to cover Corporate-switch warning now pin only the absence of the option; `hireEditWarningVariant` still handles legacy values (kept deliberately, unit-tested). Acceptable.
LOW-4: Drawer (ProfileTab) still renders `lo_type_${value}` for all four, all keys exist in en+vi (coverage test). Fine.

## Not verified
- BE #627 tests not run. Live behaviour in a browser not exercised.
