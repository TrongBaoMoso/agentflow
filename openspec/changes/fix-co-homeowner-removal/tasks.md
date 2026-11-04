# Tasks: Fix Co-Homeowner Removal Not Cascading to Related Users

## 1. Frontend: Filter Homeowner Keys from Form Population

- [ ] 1.1 [frontend] [haiku] Filter HOME_OWNER profiles from `related_user_keys` in ReportForm edit mode (homeowners)
  - **File:** `lf-iq/src/app/[locale]/(private)/homeowners/_components/ReportForm/index.tsx`
  - **Location:** `fetchReportDetail()` form reset (line ~115-116)
  - **Change:** Add `.filter((user: any) => user.current_profile !== 'HOME_OWNER')` before `.map((user: any) => user.key)` when populating `related_user_keys`
  - **Acceptance criteria:**
    - When loading a report for edit, `related_user_keys` form field contains only LO/Realtor keys, not homeowner keys
    - The report edit form still works correctly (can save, add/remove co-homeowners)
    - `npm run build` passes

- [ ] 1.2 [frontend] [haiku] Apply the same filter in ReportForm edit mode (homeowners-v2)
  - **File:** `lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/index.tsx`
  - **Location:** `fetchReportDetail()` form reset (line ~112-113)
  - **Change:** Same `.filter()` as task 1.1
  - **Acceptance criteria:**
    - Same as task 1.1 but for the v2 component
    - `npm run build` passes

## 2. Frontend: Unit Test

- [ ] 2.1 [frontend] [sonnet] Add unit test verifying co-homeowner removal produces clean payload
  - **File:** Create test at `lf-iq/src/app/[locale]/(private)/homeowners/_components/ReportForm/__tests__/related-user-keys-filter.test.ts` (or colocated test file per project conventions)
  - **Test scenarios:**
    1. Given `related_users` contains [LO, Realtor, HomeOwner1, HomeOwner2], when populating the form, `related_user_keys` should contain only [LO_key, Realtor_key] -- no homeowner keys.
    2. Given `related_users` contains only [LO, Realtor] (no homeowners), `related_user_keys` should be [LO_key, Realtor_key] -- unchanged behavior.
    3. Given `related_users` is empty or null, `related_user_keys` should be an empty array -- no crash.
    4. Given a user with null `current_profile`, their key should still be included (conservative: only exclude explicit HOME_OWNER).
  - **Acceptance criteria:**
    - All test cases pass
    - `npm test` passes
    - Tests cover the filter logic extracted or tested in isolation

## 3. QA Regression Test

- [ ] 3.1 [fullstack] [sonnet] Manual regression test: co-homeowner removal flow
  - **Test plan:**
    1. Create a report with primary homeowner + one co-homeowner. Verify both homeowners see the report in their report lists.
    2. Edit the report: remove the co-homeowner from the customers list. Save.
    3. Verify the report NO LONGER appears in the removed co-homeowner's report list.
    4. Verify the report STILL appears in the primary homeowner's report list.
    5. Verify the LO and Realtor associations are unchanged.
    6. Edit the report again: add a new co-homeowner. Save.
    7. Verify the new co-homeowner sees the report in their report list.
    8. Verify previously removed co-homeowner still does NOT see the report.
  - **Acceptance criteria:** All 8 verification steps pass
