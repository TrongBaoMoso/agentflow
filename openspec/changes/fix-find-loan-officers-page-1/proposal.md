# Proposal: Fix Find Loan Officers Page (Batch 1)

## Feature branch

`fixbug/fix-find-loan-officers-page-1` (to be created from `production` in `lf-homepage` repo)

## Problem statement

Two user-reported bugs on the `/find-loan-officers` section of lf-homepage:

### Bug 1: Sitemap URLs contain double slashes

When the `NEXT_PUBLIC_MOSO_WEB_URL` environment variable ends with a trailing slash (common in Cloud Run deployments), all sitemap URLs are generated with a double slash, e.g. `https://...run.app//sitemap.xml`. This breaks sitemap validation and degrades SEO crawling.

The root cause is that the `baseUrl` constant in `src/app/sitemap/route.ts` and `src/app/sitemap/sitemap-scopes.ts` uses a fallback value with a trailing slash (`'https://www.loanfactory.com/'`), and downstream template literals prepend another `/` (e.g. `` `${baseUrl}/sitemap.xml` ``). The sister file `sitemap-scopes/getLoanOfficerRoutes.ts` already applies `.replace(/\/$/, '')` correctly, but `route.ts` and `sitemap-scopes.ts` do not.

**Affected pages**: Every URL in every sitemap sub-document when served behind a proxy with a trailing-slash base URL.

### Bug 2: LO counter on state pages always shows "100 mortgage loan officers"

On state-scoped pages such as `/find-loan-officers/california`, `/find-loan-officers/texas`, and `/find-loan-officers/florida`, the subtitle always displays "100 mortgage loan officers" regardless of the actual number of loan officers licensed in that state.

The root cause is that the display component (`LoanOfficerSection`) uses `maxTotal` (sourced from the global `countLoanOfficers()` API, which returns a single company-wide count) for the no-filter subtitle. On the national hub page this is correct, but on state pages the subtitle should reflect the state-filtered count (`initFirstTotal`), which is already available as a prop.

The same pattern affects all sub-route pages (`[state]/[city]`, `language/[language]`, `specialty/[specialty]`, `labels/[label]`) -- they all pass the global `totalLoanOfficersResp.count` as `maxTotal`.

**Affected pages**: `/find-loan-officers/[state]`, `/find-loan-officers/[state]/[city]`, `/find-loan-officers/language/[language]`, `/find-loan-officers/specialty/[specialty]`, `/find-loan-officers/labels/[label]`.

## Proposed solution

### Bug 1 fix

Strip trailing slash from `baseUrl`/`BASE_URL` at the point of assignment in all sitemap files, using the same `.replace(/\/$/, '')` pattern that `getLoanOfficerRoutes.ts` already uses. This is a one-line fix per file with zero risk of side effects.

### Bug 2 fix

On sub-route pages (state, city, language, specialty, labels), use `initFirstTotal` (the filtered count already computed server-side) as the `maxTotal` prop instead of `totalLoanOfficersResp.count`. Reserve the global `countLoanOfficers()` count exclusively for the national hub page where no filters are active. This avoids adding any new API calls -- the correct data is already available.

## Scope

### In scope

- Fix trailing-slash normalization in sitemap `route.ts` and `sitemap-scopes.ts`
- Audit all sitemap scope files for the same pattern
- Fix `maxTotal` prop on all sub-route pages to use state/filter-scoped count
- Unit tests for the trailing-slash fix
- Unit tests for the `maxTotal` prop logic

### Out of scope

- Changing the `countLoanOfficers()` backend API to accept filter parameters
- Changing i18n translation keys
- Adding new dependencies
- Sitemap structural changes (already well-structured from prior work)

## Success criteria

1. Fetching `/sitemap.xml` through a Cloud Run proxy with trailing-slash base URL produces no double slashes in any `<loc>` element
2. `/find-loan-officers/california` shows a count different from `/find-loan-officers/texas` (assuming these states have different LO counts)
3. `/find-loan-officers` (national hub, no filters) continues to show the global LO count
4. All existing unit tests pass; no build regressions
