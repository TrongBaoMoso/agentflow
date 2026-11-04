# Design: Fix Find Loan Officers Page (Batch 1)

## Bug 1: Sitemap double-slash

### Root cause

Three sitemap files declare a base URL constant with a trailing-slash fallback:

| File | Line | Current code |
|------|------|-------------|
| `src/app/sitemap/route.ts` | 23 | `const baseUrl = process.env.NEXT_PUBLIC_MOSO_WEB_URL \|\| 'https://www.loanfactory.com/'` |
| `src/app/sitemap/sitemap-scopes.ts` | 21 | `const BASE_URL = process.env.NEXT_PUBLIC_MOSO_WEB_URL \|\| 'https://www.loanfactory.com/'` |

All downstream URL construction uses template literals like `` `${baseUrl}/sitemap.xml` ``, which produces `https://...run.app//sitemap.xml` when the env var (or fallback) ends with `/`.

The file `src/app/sitemap/sitemap-scopes/getLoanOfficerRoutes.ts:11` already solves this correctly:
```ts
const BASE_URL = (process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com').replace(/\/$/, '')
```

### Fix approach

Apply the same `.replace(/\/$/, '')` normalization at the assignment site in both affected files. This ensures any trailing slash is stripped regardless of whether it comes from the env var or the hardcoded fallback.

### Files to modify

1. **`src/app/sitemap/route.ts:23`**
   - Before: `const baseUrl = process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com/'`
   - After: `const baseUrl = (process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com').replace(/\/$/, '')`

2. **`src/app/sitemap/sitemap-scopes.ts:21`**
   - Before: `const BASE_URL = process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com/'`
   - After: `const BASE_URL = (process.env.NEXT_PUBLIC_MOSO_WEB_URL || 'https://www.loanfactory.com').replace(/\/$/, '')`

3. **Audit**: `src/app/sitemap/sitemap-scopes/getLoanOfficerRoutes.ts:11` -- already correct, no change needed.

### Verification

- Locally set `NEXT_PUBLIC_MOSO_WEB_URL=https://example.run.app/` (with trailing slash)
- Fetch `http://localhost:3000/sitemap.xml` and all sub-sitemaps
- Confirm zero occurrences of `//` in any `<loc>` element (after the protocol `https://`)

---

## Bug 2: LO counter always shows global count on sub-route pages

### Root cause

The `LoanOfficerSection` component (line 327-329) displays:
- When `hasAnyFilter` is true: `t('FindLoanOfficersPage.results_count', { count: totalLoanOfficer })` where `totalLoanOfficer` = `initFirstTotal`
- When `hasAnyFilter` is false: `t('FindLoanOfficersPage.default_title', { numberOfLOs: maxTotal })` where `maxTotal` = `totalLoanOfficersResp.count` (global)

The `maxTotal` prop is sourced from `countLoanOfficers()`, which calls `LoanOfficerCountOp` with no parameters and returns a single company-wide count. This value is passed as `maxTotal` to `LoanOfficerSection` from every page variant.

The problem manifests when `hasAnyFilter` evaluates to `false` on filtered pages. Examining the `hasAnyFilter` computation (lines 274-281), it checks `queryParams.state`, `queryParams.city`, `queryParams.county_name`, `queryParams.preferred_languages[0]`, `queryParams.licensed_states[0]`, and `queryParams.labels[0]`. While on state pages `queryParams.state` is set, if the URL path state is processed differently or if `preferred_languages` and `labels` both contain empty strings `['']`, some code paths may still fall through to showing `maxTotal`. More importantly, even when `hasAnyFilter` works correctly and shows `results_count`, the `maxTotal` prop remains misleadingly global -- if any future code path or edge case uses it, it will show the wrong number.

### Fix approach: Option A (minimal, no new API calls)

Instead of passing the global `totalLoanOfficersResp.count` as `maxTotal` on sub-route pages, pass `initFirstTotal` (the already-computed filtered count). The global `countLoanOfficers()` result is only meaningful on the national hub page (`find-loan-officers/page.tsx`) where no path-based filters are active.

**Rationale for Option A over Option B** (extending `countLoanOfficers()` to accept state):
- `initFirstTotal` already contains the correct per-filter total from the `fetchLoanOfficers` response (`loanOfficerResp.l`)
- No additional API call is needed -- zero latency impact
- No backend changes required
- Simpler diff, lower risk

### Files to modify

All sub-route page files that pass `maxTotal={totalLoanOfficersResp.count}` to `LoanOfficerSection`:

1. **`src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx:266`**
   - Before: `maxTotal={totalLoanOfficersResp.count}`
   - After: `maxTotal={initFirstTotal}`

2. **`src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx:297`**
   - Before: `maxTotal={totalLoanOfficersResp.count}`
   - After: `maxTotal={initFirstTotal}`

3. **`src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx:331`**
   - Before: `maxTotal={totalLoanOfficersResp.count}`
   - After: `maxTotal={initFirstTotal}`

4. **`src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx:286`**
   - Before: `maxTotal={totalLoanOfficersResp.count}`
   - After: `maxTotal={initFirstTotal}`

5. **`src/app/[locale]/(public)/find-loan-officers/labels/[label]/page.tsx:256`**
   - Before: `maxTotal={totalLoanOfficersResp.count}`
   - After: `maxTotal={initFirstTotal}`

**National hub page** (`find-loan-officers/page.tsx:326`) keeps `maxTotal={totalLoanOfficersResp.count}` -- this is the one page where the global count is semantically correct.

### Additional cleanup: Remove unnecessary `countLoanOfficers()` calls on sub-route pages

Since the sub-route pages no longer need `totalLoanOfficersResp.count`, the `countLoanOfficers()` call can be removed from their `Promise.all` arrays. This eliminates an unnecessary API call per page load on state, city, language, specialty, and labels pages.

Files affected (remove `countLoanOfficers()` from the parallel fetch):

1. `src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx` -- lines 52-55 (`loadStateListing`)
2. `src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx` -- equivalent location
3. `src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx` -- equivalent location
4. `src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx` -- equivalent location
5. `src/app/[locale]/(public)/find-loan-officers/labels/[label]/page.tsx` -- equivalent location

### Verification

- Visit `/find-loan-officers/california` -- note the LO count displayed
- Visit `/find-loan-officers/texas` -- count should differ from California
- Visit `/find-loan-officers/florida` -- count should differ from both
- Visit `/find-loan-officers` (national hub, no filters) -- should still show the global count
- Apply a filter (language, specialty) on a state page -- `results_count` should show the filtered total

---

## Conventions

- **ESLint**: No semicolons, no trailing commas, max-lines 500, no `console`
- **i18n**: No changes to translation keys -- reuse existing `FindLoanOfficersPage.default_title` and `FindLoanOfficersPage.results_count`
- **Dependencies**: No new packages
- **Branch**: From `production` per `lf-homepage` convention

## Test plan

### Unit tests

1. **Sitemap baseUrl normalization**: Test that the `baseUrl` constant strips trailing slashes from both the env var and hardcoded fallback. Verify that generated URLs contain no double slashes after the protocol.

2. **maxTotal prop correctness**: Test that sub-route page components pass `initFirstTotal` (not the global count) as `maxTotal` to `LoanOfficerSection`.

### Manual regression

1. **Sitemap**: Set `NEXT_PUBLIC_MOSO_WEB_URL` to a URL with trailing slash, fetch `/sitemap.xml` and all sub-sitemaps, grep for `//` (excluding `https://`)
2. **LO counter**: Visit at least 3 state pages (CA, TX, FL) and verify they show distinct LO counts
3. **National hub**: Visit `/find-loan-officers` with no filters and confirm global count still displays
4. **Fallback path**: Visit a state+language combo that returns 0 results, verify fallback logic still works and count reflects fallback data
