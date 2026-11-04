# Tasks: SEO Improvements for Find Loan Officers & Mortgage Expert Pages

## 1. Listing Page H1/H2 Dynamic Logic

- [ ] 1.1 Add `buildListingH1()` and `buildListingH2Array()` to `listingSeo.ts`
  - File: `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/listingSeo.ts`
  - Implement H1 formula with IF/ELSE for all filter combinations:
    - No filters: "Find a Mortgage Loan Officer"
    - State only: "Top Mortgage Loan Officers in {State}"
    - City+State: "Top Mortgage Loan Officers in {City}, {StateAbbrev}"
    - Language only: "{Language} Speaking Mortgage Loan Officers"
    - Specialty only: "Top Loan Officers Specializing in {Loan_Type}"
    - Lang+Spec+State: "{Language} Speaking {Loan_Type} Experts in {State}"
    - State+Spec (no lang): "Top {Loan_Type} Loan Officers in {State}"
    - Lang+Spec (no state): "{Language} Speaking {Loan_Type} Experts Nationwide"
    - State+Lang (no spec): "{Language} Speaking Loan Officers in {State}"
  - Implement H2 arrays per page type (see design.md section A for full list)
  - Gracefully skip missing parts (no double spaces or trailing commas)
  - Accept same `TListingSeoParts` input type as existing metadata builders
  - Acceptance: Function returns correct H1 string and H2 array for all filter combos; no `undefined` or empty segments in output

- [ ] 1.2 Pass H1/H2 from listing page.tsx files to `LoanOfficerSection` and render
  - Files:
    - `lf-homepage/src/app/[locale]/(public)/find-loan-officers/page.tsx`
    - `lf-homepage/src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
    - `lf-homepage/src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx`
    - `lf-homepage/src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx`
    - `lf-homepage/src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`
  - Each page.tsx calls `buildListingH1()` and `buildListingH2Array()` with its filter context
  - Pass `h1` and `h2Items` as new props to `<LoanOfficerSection>`
  - File: `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/index.tsx`
    - Add `h1: string` and `h2Items: string[]` to props interface
    - Render `<h1>` above the listing and `<h2>` tags at appropriate section boundaries
  - Acceptance: Browser "View Page Source" shows a single `<h1>` per listing page reflecting active filters; H2 tags present in correct sections; `npx tsc --noEmit` passes

## 2. Zero-Results Fallback UX

- [ ] 2.1 Add fallback banner and action buttons to `LoanOfficerSection`
  - File: `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/index.tsx`
  - When `isFallbackListing && primaryFilterHadNoResults`:
    - Display banner: "We couldn't find an exact match for your search, but here are some top experts in {State} who can help." (use state name if available, otherwise "nationwide")
    - Show "Clear All Filters" button (calls existing `resetFilter` logic)
    - Show "View All {State} Loan Officers" link pointing to `/find-loan-officers/{state}`
  - Acceptance: With a filter combo that returns 0 primary results, the banner appears above fallback LO cards; buttons are functional

- [ ] 2.2 Update `noindex` condition for zero primary results with fallback
  - Files: All 5 listing page.tsx files (see task 1.2 file list)
  - Change robots metadata: `primaryTotal === 0 ? { index: false, follow: true } : undefined`
  - Previously only set noindex when both primary AND fallback were 0
  - Acceptance: Any listing page with 0 primary results returns `<meta name="robots" content="noindex, follow">` in the HTML head, even if fallback LOs are displayed

## 3. Canonical Tag Improvements

- [ ] 3.1 Unify multi-filter canonical logic across all listing pages
  - Files: All 5 listing page.tsx files
  - Canonical priority when query params are present: State base > Language base > Specialty base
  - If on `/find-loan-officers/[state]?language=X&specialty=Y`: canonical = `/find-loan-officers/{state}` (strip query params)
  - If on `/find-loan-officers/language/[lang]?specialty=Y`: canonical = `/find-loan-officers/language/{lang}`
  - If on `/find-loan-officers/specialty/[spec]?language=X`: canonical = `/find-loan-officers/specialty/{spec}`
  - Hub page already implements this partially; verify and align all sub-routes
  - All canonicals must use `https://www.loanfactory.com` prefix, no trailing slash
  - Acceptance: On any multi-filter page, viewing `<link rel="canonical">` in page source shows the correct static base URL

- [ ] 3.2 Pagination canonical = self (include page param)
  - Files: All listing page.tsx `generateMetadata()` functions
  - When `searchParams?.page` is present and valid (1-3), canonical URL must include `?page=N`
  - Example: `/find-loan-officers/texas?page=2` -> canonical = `https://www.loanfactory.com/find-loan-officers/texas?page=2`
  - Never strip the page param from canonical
  - Acceptance: Page 2 of any listing has self-referencing canonical including `?page=2`

## 4. Pagination Security

- [ ] 4.1 Cap pagination at 3 pages (server-side redirect)
  - Files: All 5 listing page.tsx files
  - At the top of each page component (before data fetching), check `searchParams?.page`:
    - If page > 3: use `redirect()` from `next/navigation` to redirect to same URL with `?page=1` (302)
    - If page < 1: redirect to page 1
  - Acceptance: Requesting `?page=4` returns HTTP 302 to `?page=1`; requesting `?page=0` also redirects

- [ ] 4.2 Cap pagination UI at 3 pages
  - File: Pagination component within `LoanOfficerSection` (find the pagination sub-component)
  - Max visible page buttons = 3
  - Hide "Next" button and "..." ellipsis after page 3
  - Acceptance: UI shows [1] [2] [3] only, no way to navigate past page 3 via UI

- [ ] 4.3 Add `noindex, nofollow` for search query pages
  - Files: All 5 listing page.tsx `generateMetadata()` functions
  - If `searchParams` contains keys `search`, `keyword`, or `name`: set `robots: { index: false, follow: false }`
  - This takes precedence over the zero-results noindex logic
  - Acceptance: `/find-loan-officers?search=thuan` returns `<meta name="robots" content="noindex, nofollow">`

## 5. Dynamic XML Sitemap for Loan Officers

- [ ] 5.1 Create `getLoanOfficerRoutes()` sitemap scope
  - File: `lf-homepage/src/app/sitemap/sitemap-scopes/` (new file or add to existing)
  - Fetch all active LOs from API (use `fetchLoanOfficers` or equivalent bulk endpoint)
  - Map each LO to: `{ url: "https://www.loanfactory.com/mortgage-expert/{slug}", lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 }`
  - Use `buildMortgageExpertSlug(fullName, nmls)` for slug generation
  - Also include listing sub-pages:
    - `/find-loan-officers/{state}` for each US state
    - `/find-loan-officers/language/{lang}` for each supported language
    - `/find-loan-officers/specialty/{specialty}` for each loan type
  - Acceptance: Function returns a valid `MetadataRoute.Sitemap` array with 3,000+ LO profile entries + listing sub-pages

- [ ] 5.2 Register LO sitemap in sitemap index and route handler
  - File: `lf-homepage/src/app/sitemap/route.ts`
  - Add `{ url: "${baseUrl}/sitemap.xml?sub=loan-officers", lastModified: new Date() }` to the sitemap index array
  - Add `case 'loan-officers':` to the switch statement, calling `getLoanOfficerRoutes()`
  - Import the new scope function
  - Acceptance: `GET /sitemap.xml` index includes `loan-officers` sub-sitemap; `GET /sitemap.xml?sub=loan-officers` returns valid XML with all LO URLs

## 6. robots.txt Updates

- [ ] 6.1 Add disallow rules and LO sitemap to robots.ts
  - File: `lf-homepage/src/app/robots.ts`
  - Add to disallow array:
    - `/find-loan-officers?*search=`
    - `/find-loan-officers?*keyword=`
    - `/find-loan-officers?*name=`
  - Update sitemap to include LO sitemap URL: `${baseUrl}/sitemap.xml?sub=loan-officers`
  - If `sitemap` field only supports a single string, change to return the sitemap index URL (which already contains all sub-sitemaps): `${baseUrl}/sitemap.xml`
  - Acceptance: `GET /robots.txt` contains the disallow rules for search params and references the sitemap

## 7. Detail Page FAQ & Schema Improvements

- [ ] 7.1 Re-enable FAQ Q2 (loan types specialization)
  - File: `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/loanOfficerProfileFaq.ts`
  - Uncomment Q2 block (lines ~61-66): question "What types of home loans does {LO_Name} specialize in?" with 3 variations
  - Uncomment the `{ question: q2, answer: q2Vars[hashPick(nmls, 2, 3)]! }` entry in the items array
  - Final FAQ order: Q1 (states), Q2 (loan types), Q3 (contact), Q4 (languages, conditional)
  - Acceptance: Detail page renders 3 FAQ items for LOs with only English; 4 items for LOs with non-English languages; Q2 about loan types is visible; JSON-LD FAQPage schema has matching questions

- [ ] 7.2 Add `sanitizeForJsonLd()` and apply to schema builder
  - File: `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/loanOfficerProfileSchema.ts`
  - Create function: strip HTML tags, trim whitespace, collapse multiple spaces
  - Apply to `data.full_name` in the `mortgageBroker.name` field
  - Apply to any bio text if it appears in schema (currently bio is not in schema, but defensively sanitize `name`)
  - Acceptance: LO names with accidental HTML or extra whitespace are clean in JSON-LD output

## 8. TypeScript & Lint Verification

- [ ] 8.1 Verify `npx tsc --noEmit` passes and pre-commit checks pass
  - Run `npx tsc --noEmit` in `lf-homepage/`
  - Run `npx eslint --max-warnings 0` on all modified files
  - Fix any type errors or lint issues introduced by the above tasks
  - Acceptance: Zero TypeScript errors, zero ESLint errors on modified files
