# Proposal: SEO Improvements for Find Loan Officers & Mortgage Expert Pages

## Problem Statement

The `lf-homepage` site has a Loan Officer directory (`/find-loan-officers`) and detail pages (`/mortgage-expert/[slug]`) that need comprehensive SEO hardening. Several critical gaps exist:

1. **Listing pages** lack dynamic H1/H2 tags that reflect active filters, leading to poor user signal and missed keyword targeting (e.g., "Vietnamese Speaking FHA Loan Experts in Texas").
2. **Multi-filter pages** generate query-param URLs without canonical tags pointing to the highest-priority static base, diluting crawl budget.
3. **Zero-results pages** display empty content without fallback messaging, smart suggestions, or `noindex` directives -- harming both UX and SEO quality signals.
4. **Pagination is unbounded** -- scrapers can walk page 4, 5, ... N to harvest the full 3,000+ LO directory. No pagination cap or XML sitemap exists to compensate.
5. **Detail page FAQ** is missing Q2 (loan types specialization) -- it is commented out in the current code. The spec requires all 4 FAQ questions.
6. **Search result pages** (`?search=`, `?keyword=`) are not blocked from indexing, wasting crawl budget.
7. **robots.txt** does not declare disallow rules for search/filter query params or reference a dedicated LO sitemap.
8. **Dynamic filtering UX** does not disable filter options that would yield zero results (e.g., Vietnamese in Wyoming when no LOs match).

## Proposed Solution

Implement the full SEO spec across four work areas:

**A. Listing Page SEO** -- Dynamic H1/H2/Title/Description based on active filters (state, city, language, specialty, multi-filter combos). Smart fallback for zero-results with noindex. "Clear All Filters" / "View All {State} Loan Officers" buttons on zero-result state.

**B. Detail Page SEO** -- Re-enable FAQ Q2 (loan types). Ensure all 4 FAQ questions use deterministic spintax (hash-based, not random). Verify MortgageBroker + FAQPage schema is SSR-rendered and sanitized. Confirm 301 redirect from legacy `/find-loan-officers/detail/[key]` to `/mortgage-expert/[slug]`.

**C. Canonical & Crawl Control** -- Self-referencing canonicals on static pages. Multi-filter pages canonical to highest-priority static URL (State > Language > Specialty). Pagination canonical = self (never point page 2 to page 1). Standardize `https://www.` prefix, no trailing slash.

**D. Pagination Security & Sitemap** -- Cap pagination at 3 pages in UI and API. Page 4+ returns 302 redirect to page 1 or "Use Search" message. Create dynamic XML sitemap (`sitemap-loan-officers.xml`) listing all 3,000+ LO profile URLs. Add robots.txt disallow rules for search params. Add `noindex, nofollow` to search result pages.

## Scope

### In Scope
- All listing routes: `/find-loan-officers`, `/find-loan-officers/[state]`, `/find-loan-officers/[state]/[city]`, `/find-loan-officers/language/[language]`, `/find-loan-officers/specialty/[specialty]`
- Hub page with query-param filters (`?language=`, `?specialty=`, `?licensed_states=`)
- Detail route: `/mortgage-expert/[slug]`
- Legacy redirect: `/find-loan-officers/detail/[key]`
- `robots.ts`, `sitemap/route.ts`
- Filter UI component: `LoanOfficerSection/Filters/index.tsx`
- SEO utility files: `listingSeo.ts`, `loanOfficerProfileMeta.ts`, `loanOfficerProfileSchema.ts`, `loanOfficerProfileFaq.ts`

### Out of Scope
- API payload security (stripping email/phone from API responses) -- requires backend changes outside lf-homepage
- Rate limiting / WAF configuration (Cloudflare-level, not app code)
- Google Search Console submission
- Review/testimonial integration (Zillow, Trustpilot)
- Calendly / booking system integration
- CRM form integration

## Success Criteria

1. Every listing page renders a contextually accurate H1 reflecting active filters
2. Multi-filter query-param pages have canonical tags pointing to the highest-priority static base URL
3. Zero-results pages show fallback LOs with a smart message and `noindex` meta tag
4. Pagination UI shows max 3 pages; page 4+ requests are handled gracefully
5. Dynamic XML sitemap at `/sitemap.xml?sub=loan-officers` lists all active LO profile URLs
6. robots.txt includes disallow rules for search/filter query params and declares the LO sitemap
7. Search result pages have `noindex, nofollow`
8. FAQ Q2 (loan types) is re-enabled on detail pages
9. All JSON-LD schema is present in server-rendered HTML (View Page Source)
10. `npx tsc --noEmit` passes with zero errors

## Feature Branch

`feature/seo-find-loan-officers` (to be created from `production` branch in `lf-homepage` repo)
