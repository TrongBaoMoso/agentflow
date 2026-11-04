# Tasks: Fix Find Loan Officers Page (Batch 1)

## 1. Sitemap trailing-slash normalization

- [ ] 1.1 [frontend] [haiku] Fix baseUrl trailing-slash in sitemap route.ts
  - File: `src/app/sitemap/route.ts:23`
  - Change: `const baseUrl = process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com/'`
    to: `const baseUrl = (process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com').replace(/\/$/, '')`
  - Acceptance: `baseUrl` never ends with `/`. All `<loc>` URLs in generated sitemap XML contain no double slashes after the protocol.

- [ ] 1.2 [frontend] [haiku] Fix BASE_URL trailing-slash in sitemap-scopes.ts
  - File: `src/app/sitemap/sitemap-scopes.ts:21`
  - Change: `const BASE_URL = process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com/'`
    to: `const BASE_URL = (process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com').replace(/\/$/, '')`
  - Acceptance: `BASE_URL` never ends with `/`. All URLs built from `BASE_URL` in this file have no double slashes.

- [ ] 1.3 [frontend] [haiku] Audit remaining sitemap scope files for trailing-slash safety
  - Verify `src/app/sitemap/sitemap-scopes/getLoanOfficerRoutes.ts:11` already applies `.replace(/\/$/, '')` (no change needed)
  - Search for any other files under `src/app/sitemap/` that construct URLs from a base URL constant; apply the same fix if found
  - Acceptance: All sitemap-related files use a trailing-slash-safe base URL.

## 2. LO counter fix on sub-route pages

- [ ] 2.1 [frontend] [sonnet] Fix maxTotal on state page to use state-filtered count
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
  - Change `maxTotal={totalLoanOfficersResp.count}` (line 266) to `maxTotal={initFirstTotal}`
  - Remove `countLoanOfficers()` from the `Promise.all` in `loadStateListing` (line 52-55) since `totalLoanOfficersResp` is no longer needed
  - Remove the `totalLoanOfficersResp` destructured variable
  - Acceptance: `/find-loan-officers/california` displays the state-filtered LO count, not the global count. Build compiles with no type errors.

- [ ] 2.2 [frontend] [sonnet] Fix maxTotal on city page to use city-filtered count
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx`
  - Change `maxTotal={totalLoanOfficersResp.count}` (line 297) to `maxTotal={initFirstTotal}`
  - Remove `countLoanOfficers()` from the parallel fetch since it is no longer consumed
  - Remove the `totalLoanOfficersResp` destructured variable
  - Acceptance: City pages show the city+state-scoped LO count. Build compiles with no type errors.

- [ ] 2.3 [frontend] [haiku] Fix maxTotal on language page
  - File: `src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx`
  - Change `maxTotal={totalLoanOfficersResp.count}` (line 331) to `maxTotal={initFirstTotal}`
  - Remove `countLoanOfficers()` from the parallel fetch
  - Remove the `totalLoanOfficersResp` destructured variable
  - Acceptance: Language listing pages show the language-filtered LO count. Build compiles.

- [ ] 2.4 [frontend] [haiku] Fix maxTotal on specialty page
  - File: `src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`
  - Change `maxTotal={totalLoanOfficersResp.count}` (line 286) to `maxTotal={initFirstTotal}`
  - Remove `countLoanOfficers()` from the parallel fetch
  - Remove the `totalLoanOfficersResp` destructured variable
  - Acceptance: Specialty listing pages show the specialty-filtered LO count. Build compiles.

- [ ] 2.5 [frontend] [haiku] Fix maxTotal on labels page
  - File: `src/app/[locale]/(public)/find-loan-officers/labels/[label]/page.tsx`
  - Change `maxTotal={totalLoanOfficersResp.count}` (line 256) to `maxTotal={initFirstTotal}`
  - Remove `countLoanOfficers()` from the parallel fetch
  - Remove the `totalLoanOfficersResp` destructured variable
  - Acceptance: Labels listing pages show the label-filtered LO count. Build compiles.

## 3. Tests

- [ ] 3.1 [frontend] [sonnet] Unit tests for sitemap baseUrl normalization
  - Create test file: `src/app/sitemap/__tests__/baseUrl.test.ts`
  - Test cases:
    - Env var with trailing slash produces URLs without double slashes
    - Env var without trailing slash produces correct URLs
    - Hardcoded fallback (no env var) produces correct URLs
    - Multiple consecutive trailing slashes are stripped
  - Mock `process.env.NEXT_PUBLIC_MOSO_WEB_URL` for each case
  - Acceptance: All test cases pass. Tests verify the core normalization logic.

- [ ] 3.2 [frontend] [sonnet] Unit tests for maxTotal prop correctness on sub-route pages
  - Create test file: `src/app/[locale]/(public)/find-loan-officers/__tests__/maxTotal.test.ts`
  - Test cases:
    - State page passes `initFirstTotal` (not global count) as `maxTotal`
    - National hub page passes `totalLoanOfficersResp.count` as `maxTotal`
    - When `initFirstTotal` differs from global count, the rendered subtitle reflects `initFirstTotal` on state pages
  - Mock `fetchLoanOfficers` to return distinct `l` values per state; mock `countLoanOfficers` to return a different global count
  - Acceptance: Tests prove that state pages use the filtered count and the hub uses the global count.

## 4. Smoke test (optional)

- [ ] 4.1 [frontend] [sonnet] Playwright smoke test for LO counter on state pages
  - Create test file: `e2e/find-loan-officers-counter.spec.ts` (or equivalent Playwright location)
  - Test: Visit `/find-loan-officers/california`, `/find-loan-officers/texas`, `/find-loan-officers/florida`
  - Assert: The subtitle paragraph (`p.text-18`) contains a number, and at least 2 of the 3 states show different numbers
  - Assert: Visit `/find-loan-officers` (no state) and verify the subtitle uses the `default_title` pattern
  - Acceptance: Playwright test passes locally against the dev server. Marked optional -- implement if Playwright is already configured in the project.
