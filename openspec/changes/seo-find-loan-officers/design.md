# Design: SEO Improvements for Find Loan Officers & Mortgage Expert Pages

## Architecture Overview

All changes are within the `lf-homepage` Next.js 14 app. The SEO logic is split between:
- **Server components** (page.tsx files) -- `generateMetadata()` for meta tags + canonical, page body for H1/H2, `<Script>` for JSON-LD
- **Utility modules** (`_utils/`) -- reusable SEO copy builders, schema generators, FAQ builders
- **Client components** (`Filters/index.tsx`) -- filter UI with dynamic option disabling
- **App-level files** (`robots.ts`, `sitemap/route.ts`) -- crawl control

No new routes are created. No database schema changes. All work is frontend (Next.js SSR).

---

## A. Listing Page Dynamic H1/H2

### Current State
- H1 is not explicitly rendered as an `<h1>` tag in the listing section; the `LoanOfficerSection` component handles display but headings are not dynamically driven by filters.
- `listingSeo.ts` (`computeHubListingSeo`, `buildListingMetadataFromParts`) already computes dynamic Title and Description for meta tags.

### Design

**1. Create `buildListingH1` and `buildListingH2` functions in `listingSeo.ts`**

H1 logic (single filter):
- No filters: `Find a Mortgage Loan Officer`
- State only: `Top Mortgage Loan Officers in {State}`
- City+State: `Top Mortgage Loan Officers in {City}, {State_Abbrev}`
- Language only: `{Language} Speaking Mortgage Loan Officers`
- Specialty only: `Top Loan Officers Specializing in {Loan_Type}`

H1 logic (multi-filter, IF/ELSE):
- Language + Specialty + State: `{Language} Speaking {Loan_Type} Experts in {State}`
- State + Specialty (no language): `Top {Loan_Type} Loan Officers in {State}`
- Language + Specialty (no state): `{Language} Speaking {Loan_Type} Experts Nationwide`
- State + Language (no specialty): `{Language} Speaking Loan Officers in {State}`

H2 arrays per page type:
- Default hub: `["Search by State", "Top Rated Loan Officers", "Why Choose Loan Factory?"]`
- State: `["Featured {State} Loan Officers", "Why Choose a Loan Factory Expert in {State}?"]`
- City: `["Featured {State} Loan Officers", "Why Choose a Loan Factory Expert in {City}, {State}?"]`
- Language: `["Top {Language} Speaking Mortgage Experts", "The Benefits of a {Language} Speaking Loan Officer", "Start Your Home Loan Application Today"]`
- Specialty: `["Experts in {Loan_Type}", "Is a {Loan_Type} Right for You?", "Connect with a {Loan_Type} Specialist"]`
- Multi-filter: `["Your Matched Experts", "Expand Your Search"]`

**2. Pass H1/H2 from page.tsx to `LoanOfficerSection` as props**

Each listing page.tsx calls the new builder functions and passes results as props. The `LoanOfficerSection` component renders the `<h1>` and `<h2>` tags.

Files modified:
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/listingSeo.ts`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/index.tsx` (accept & render H1/H2 props)

---

## B. Zero-Results Fallback & noindex

### Current State
- Fallback logic already exists in all page.tsx files: when `primaryTotal === 0`, the code fetches state-only or national LOs.
- `robots: { index: false, follow: true }` is already set when both primary and fallback totals are 0.

### Design

**1. Smart fallback message** -- Add a `fallbackMessage` prop to `LoanOfficerSection`. When `isFallbackListing && primaryFilterHadNoResults`:
- Show banner: "We couldn't find an exact match for your search, but here are some top experts in {State} who can help."
- Show "Clear All Filters" button and "View All {State} Loan Officers" link.

**2. Dynamic noindex when primary results = 0 but fallback has results** -- Currently only noindex when both are 0. Per spec, any zero-result primary filter should also get noindex (the fallback content is not unique). Update the robots metadata condition in `generateMetadata`:
```
robots: primaryTotal === 0 ? { index: false, follow: true } : undefined
```

Files modified:
- All listing page.tsx files (metadata robots condition)
- `LoanOfficerSection/index.tsx` (fallback banner UI)

---

## C. Dynamic Filter Disabling

### Current State
- `Filters/index.tsx` renders language select with all options always enabled.
- No count-based disabling.

### Design

**Approach**: When a state filter is active, fetch available language/specialty counts for that state from the API (or derive from already-fetched data). Disable options with 0 results or show `(0)` suffix.

This requires either:
- A new API endpoint that returns facet counts (preferred but may be backend work)
- Client-side: after filtering by state, check if each language option returns results (expensive)

**Pragmatic approach for now**: When `primaryFilterHadNoResults` is true for a specific combination, the zero-results banner and "Clear Filters" button address the UX concern. Full facet-count disabling is deferred unless a facet-count API exists.

If the current API can return facet counts, add them. Otherwise, mark this as a future enhancement and focus on the zero-results UX.

---

## D. Canonical Tags

### Current State
- Hub `page.tsx` already computes canonical: state+extra filters -> state base URL; language-only -> language base URL.
- Sub-route pages (`[state]/page.tsx`, etc.) set self-referencing canonical.
- Pagination canonical behavior is not explicitly handled (defaults to `./`).

### Design

**1. Multi-filter canonical priority** (State > Language > Specialty):
- If state is present in filters: canonical = `/find-loan-officers/{state}` (strip all query params)
- Else if language is present: canonical = `/find-loan-officers/language/{lang-slug}`
- Else if specialty is present: canonical = `/find-loan-officers/specialty/{specialty-slug}`
- Else: self-referencing

This logic already partially exists in the hub `page.tsx`. Extend it to cover all sub-route pages when they receive extra query param filters.

**2. Pagination canonical = self**:
- When `?page=N` is present, canonical must include the page param: `canonical = baseStaticUrl + "?page=" + N`
- Never strip the page param from canonical.

**3. Domain normalization**:
- All canonical URLs must use `https://www.loanfactory.com` prefix, no trailing slash.
- The `getBaseUrl()` helper already strips trailing slash. Verify `NEXT_PUBLIC_BASE_URL` env var includes `https://www.`.

Files modified:
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/page.tsx` (hub canonical logic)
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx`
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`

---

## E. Pagination Security

### Current State
- No pagination cap exists in the UI or server-side.
- Pagination is handled client-side in `LoanOfficerSection`.

### Design

**1. UI cap**: Pagination component shows max 3 page buttons. Hide "Next" / "..." after page 3.

**2. Server-side cap**: In all listing page.tsx files, if `searchParams?.page` is a number > 3, return a 302 redirect to page 1 (same filters, `page=1`), or render a "Use Search" message instead of results.

**3. Search results noindex**: If `searchParams` contains `search`, `keyword`, or `name` keys, add `<meta name="robots" content="noindex, nofollow">` via the metadata robots field.

Files modified:
- All listing page.tsx files (page > 3 redirect logic, search noindex)
- `LoanOfficerSection` pagination sub-component (UI cap at 3)

---

## F. Dynamic XML Sitemap for Loan Officers

### Current State
- `sitemap/route.ts` uses a `?sub=` pattern for sitemap index. No LO-specific sitemap exists.
- Static routes include `/find-loan-officers` but not individual LO profile URLs.

### Design

**1. Add `loan-officers` sub-sitemap**:
- New function `getLoanOfficerProfileRoutes()` in `sitemap/sitemap-scopes/` that fetches all active LOs and maps them to `/mortgage-expert/{slug}` URLs.
- Register `?sub=loan-officers` in the sitemap index and the switch statement in `sitemap/route.ts`.

**2. Also add listing sub-pages** to the sitemap: `/find-loan-officers/{state}` for each state, `/find-loan-officers/language/{lang}` for each language, `/find-loan-officers/specialty/{specialty}` for each specialty.

Files modified:
- `lf-homepage/src/app/sitemap/route.ts` (add `loan-officers` case and sitemap index entry)
- `lf-homepage/src/app/sitemap/sitemap-scopes/` (new `getLoanOfficerRoutes.ts` or add to existing)

---

## G. robots.txt Updates

### Current State
- `robots.ts` has basic disallow rules. No search/filter param blocking. No LO sitemap reference.

### Design

Add to disallow array:
```
'/find-loan-officers?*search=',
'/find-loan-officers?*keyword=',
'/find-loan-officers?*name='
```

Add LO sitemap to the sitemap declaration (array of sitemaps if Next.js supports it, or append to existing).

Files modified:
- `lf-homepage/src/app/robots.ts`

---

## H. Detail Page FAQ Re-enable

### Current State
- `loanOfficerProfileFaq.ts` has Q2 (loan types) commented out.
- Q1 (states), Q3 (contact), Q4 (languages, conditional) are active.
- Hash-based deterministic variation selection (`hashPick`) is already implemented.

### Design

**1. Uncomment Q2** in `buildLoanOfficerProfileFaq()`. The question and 3 variations are already written.

**2. Verify hash indices**: Q1 uses `hashPick(nmls, 1, 3)`, Q2 should use `hashPick(nmls, 2, 3)`, Q3 uses `hashPick(nmls, 3, 3)`, Q4 uses `hashPick(nmls, 4, 2)`. All correct as written.

**3. Verify exact match**: The same `faqItems` array is passed to both the visible `FAQSection` component and the `buildLoanOfficerProfileJsonLd` schema builder, ensuring HTML display matches JSON-LD exactly.

Files modified:
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/loanOfficerProfileFaq.ts`

---

## I. Schema Sanitization

### Current State
- `buildLoanOfficerProfileJsonLd` in `loanOfficerProfileSchema.ts` uses `data.full_name` directly. No explicit sanitization of HTML tags or whitespace.

### Design

**1. Add `sanitizeForJsonLd(text: string): string`** utility that:
- Strips HTML tags (`<p>`, `<br>`, etc.)
- Trims whitespace
- Collapses multiple spaces

**2. Apply to**: `data.full_name`, bio text (if used in schema), FAQ answer text before insertion into JSON-LD.

Files modified:
- `lf-homepage/src/app/[locale]/(public)/find-loan-officers/_utils/loanOfficerProfileSchema.ts`

---

## Conventions

- Follow existing patterns: `cache()` for deduped fetches, `getBaseUrl()` helper, `buildMortgageExpertSlug()` for URL generation.
- All SEO copy in English (meta tags are not translated via next-intl).
- JSON-LD rendered via `<Script type="application/ld+json">` in server components.
- TypeScript strict: `npx tsc --noEmit` must pass.
- Existing pre-commit hook: ESLint + Prettier + stylelint + build.
