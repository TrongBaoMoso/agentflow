# Tasks: Find Loan Officers SEO & Performance Overhaul

## 1. Foundation: Shared utilities

- [ ] 1.1 Create shared fallback cascade utility
  - Create `src/app/[locale]/(public)/find-loan-officers/_utils/listingFallback.ts`
  - Export `resolveListingWithFallback()` function as specified in design.md
  - Must handle: primary response check, iterate broader queries, national fallback
  - Return type: `TFallbackResult` with `dataLO`, `displayResp`, `isFallbackListing`, `listFetchQuery`, `initFirstTotal`
  - Acceptance: Function compiles with no type errors. Logic matches the existing cascade in `page.tsx` lines 209-234.

- [ ] 1.2 Create BreadcrumbList JSON-LD builder
  - Create `src/app/[locale]/(public)/find-loan-officers/_utils/breadcrumb.ts`
  - Export `buildBreadcrumbJsonLd(baseUrl: string, crumbs: Array<{name: string, url: string}>)` returning a schema.org BreadcrumbList object
  - Output must include `@context`, `@type: "BreadcrumbList"`, and `itemListElement` array with `ListItem` entries (position, name, item URL)
  - Acceptance: Output validates against Google Rich Results Test BreadcrumbList schema.

## 2. Refactor page files to use shared fallback

- [ ] 2.1 Refactor hub page (`page.tsx`) to use `resolveListingWithFallback`
  - File: `src/app/[locale]/(public)/find-loan-officers/page.tsx`
  - Replace lines 209-234 (fallback cascade in the page component) and lines 84-101 (fallback in generateMetadata) with calls to `resolveListingWithFallback`
  - Construct `broaderQueries` array specific to hub page context (state-only -> national)
  - Add BreadcrumbList `<Script>` tag: trail is `[Home, Find Loan Officers]`
  - Acceptance: Page renders identically. No duplicated fallback logic. BreadcrumbList JSON-LD present in page source.

- [ ] 2.2 Refactor `[state]/page.tsx` to use shared fallback + add breadcrumb
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
  - Replace fallback cascade with `resolveListingWithFallback` call
  - Add BreadcrumbList: `[Home, Find Loan Officers, {State Name}]`
  - Acceptance: Page renders identically. Breadcrumb JSON-LD present.

- [ ] 2.3 Refactor `[state]/[city]/page.tsx` to use shared fallback + add breadcrumb
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/[city]/page.tsx`
  - Replace fallback cascade with `resolveListingWithFallback` call
  - Add BreadcrumbList: `[Home, Find Loan Officers, {State}, {City}]`
  - Add `export const revalidate = 3600` for ISR
  - Acceptance: Page renders identically. Breadcrumb present. ISR configured.

- [ ] 2.4 Refactor `language/[language]/page.tsx` to use shared fallback + add breadcrumb
  - File: `src/app/[locale]/(public)/find-loan-officers/language/[language]/page.tsx`
  - Replace fallback cascade (lines 225-280) with `resolveListingWithFallback` call
  - Add BreadcrumbList: `[Home, Find Loan Officers, {Language} Speaking]`
  - Add `export const revalidate = 3600`
  - Acceptance: Page renders identically. Breadcrumb present. ISR configured.

- [ ] 2.5 Refactor `specialty/[specialty]/page.tsx` to use shared fallback + add breadcrumb
  - File: `src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`
  - Replace fallback cascade with `resolveListingWithFallback` call
  - Add BreadcrumbList: `[Home, Find Loan Officers, {Specialty} Loans]`
  - Acceptance: Page renders identically. Breadcrumb present.

- [ ] 2.6 Refactor `labels/[label]/page.tsx` to use shared fallback + add breadcrumb
  - File: `src/app/[locale]/(public)/find-loan-officers/labels/[label]/page.tsx`
  - Replace fallback cascade with `resolveListingWithFallback` call
  - Add BreadcrumbList: `[Home, Find Loan Officers, {Label}]`
  - Add `export const revalidate = 3600`
  - Acceptance: Page renders identically. Breadcrumb present. ISR configured.

## 3. Static generation (generateStaticParams)

- [ ] 3.1 Add `generateStaticParams` to `[state]/page.tsx`
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
  - Import `STATES` from `@constants/state`
  - Return all state IDs (e.g., `CA`, `TX`, etc.) as params
  - Do NOT set `dynamicParams = false` (allow fallback for unexpected values)
  - Acceptance: `npm run build` pre-renders all 50 state pages. Build log shows `/find-loan-officers/CA`, `/find-loan-officers/TX`, etc.

- [ ] 3.2 Add `generateStaticParams` to `specialty/[specialty]/page.tsx`
  - File: `src/app/[locale]/(public)/find-loan-officers/specialty/[specialty]/page.tsx`
  - Import or derive the list of known specialty slugs from `_utils/specialtySlug.ts`
  - Return all specialty slugs as params
  - Acceptance: Build pre-renders all specialty pages.

## 4. Image performance

- [ ] 4.1 Switch LoanOfficerCard avatar to Next.js `<Image>`
  - File: `src/shared/components/LoanOfficerCard/index.tsx`
  - Replace `<SeoImage>` for avatar with `import Image from 'next/image'`
  - Add `isPriority?: boolean` prop to `TLoanOfficerCardProps`
  - Set `width={100}`, `height={100}`, `sizes="(max-width: 768px) 80px, 100px"`
  - Handle fallback: use `onError` to set a state variable that swaps `src` to `IMAGES.DEFAULT_AVATAR`
  - Keep `loading="lazy"` by default; when `isPriority` is true, set `priority={true}` (which implies eager loading)
  - Acceptance: Avatar images served as WebP/AVIF in supporting browsers. No layout shift (explicit width/height). First 3 cards load eagerly.

- [ ] 4.2 Pass `isPriority` from LoanOfficerList to LoanOfficerCard
  - File: `src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/LoanOfficerList/index.tsx`
  - In the `.map()` callback, pass `isPriority={index < 3}` to each `<LoanOfficerCard>`
  - Acceptance: First 3 cards have `priority` attribute on the `<img>` element.

- [ ] 4.3 Update `next.config.mjs` with `remotePatterns` for images
  - File: `next.config.mjs`
  - Add `images.remotePatterns` array alongside existing `domains`:
    ```js
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
    ```
  - Keep existing `domains` for backward compatibility
  - Acceptance: `npm run build` succeeds. Next.js Image optimization works for GCS-hosted avatars.

## 5. Component improvements

- [ ] 5.1 Convert WhyChooseLoanFactory to server component
  - File: `src/app/[locale]/(public)/find-loan-officers/_sections/WhyChooseLoanFactory/index.tsx`
  - Remove `'use client'` directive
  - Replace `useTranslations()` with `import { getTranslations } from 'next-intl/server'`
  - Make the component `async`
  - If `SeoLinkButton` requires client-side hooks, extract just the CTA button into a small client wrapper component; keep the rest server-rendered
  - Acceptance: Component renders correctly. No JS shipped for this component (verify with React DevTools or bundle analysis). Build succeeds.

- [ ] 5.2 Remove client-side document.title mutation from LoanOfficerSection
  - File: `src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/index.tsx`
  - Delete the `useEffect` block at lines 238-298 that manually sets `document.title`, `meta[name="description"]`, and `meta[property="og:description"]`
  - Delete the client-side `generateMetadata` helper function (lines 53-136) and its related constants (`PAGE_TITLE`, `PAGE_DESCRIPTION` at lines 43-45)
  - Keep the `formatText` and `formatStateForTitle` helpers only if used elsewhere; otherwise delete them too
  - Acceptance: Build succeeds. Page renders correctly. No DOM manipulation of meta tags in the client.

## 6. Sitemap expansion

- [ ] 6.1 Add find-loan-officers sub-sitemap
  - Create or update scope function in `src/app/sitemap/sitemap-scopes/`
  - Export `getFindLoanOfficersRoutes()` that returns:
    - All 50 state pages: `/find-loan-officers/{stateId}` (priority 0.8, changeFrequency 'weekly')
    - All language pages: `/find-loan-officers/language/{seoSlug}` (priority 0.7, changeFrequency 'weekly')
    - All specialty pages: `/find-loan-officers/specialty/{slug}` (priority 0.7, changeFrequency 'weekly')
  - Use `STATES` from `@constants/state` for state IDs
  - Use `LANGUAGES` from `@constants/languages` for language slugs (via `languageKeyToSeoSlug`)
  - Derive specialty slugs from the specialty mapping in `_utils/specialtySlug.ts`
  - Acceptance: Visiting `/sitemap.xml?sub=find-loan-officers` returns valid XML with all state, language, and specialty URLs.

- [ ] 6.2 Register find-loan-officers sub-sitemap in the sitemap index
  - File: `src/app/sitemap/route.ts`
  - Add `find-loan-officers` entry to the sitemap index array (around line 505)
  - Add `case 'find-loan-officers':` to the switch statement (around line 547)
  - Import and call `getFindLoanOfficersRoutes()`
  - Acceptance: `/sitemap.xml` index lists the new sub-sitemap. The sub-sitemap is fetchable and valid.

## 7. Internal cross-links

- [ ] 7.1 Create StateCrossLinks server component
  - Create `src/app/[locale]/(public)/find-loan-officers/_sections/CrossLinks/index.tsx`
  - Server component (no `'use client'`), uses `getTranslations` from `next-intl/server`
  - Renders a grid of `SeoLink` elements
  - Props: `variant: 'states' | 'cities' | 'languages'`, `stateName?: string`, `stateId?: string`
  - For `variant='states'`: render all 50 state links using `STATES` constant
  - For `variant='languages'`: render all language links using `LANGUAGES` constant and `languageKeyToSeoSlug`
  - For `variant='cities'`: render top cities for the given state (from a static data file)
  - Acceptance: Component renders a navigable grid of links. Links use correct URLs matching existing route patterns.

- [ ] 7.2 Create static top-cities-per-state data file
  - Create `src/app/[locale]/(public)/find-loan-officers/_utils/topCities.ts`
  - Export a `Record<string, string[]>` mapping state IDs to top 5-10 city names
  - Cover all 50 states with their largest/most-searched cities
  - Acceptance: Data file compiles. All state IDs from `STATES` constant have entries.

- [ ] 7.3 Integrate CrossLinks into hub page
  - File: `src/app/[locale]/(public)/find-loan-officers/page.tsx`
  - Add `<CrossLinks variant="states" />` and `<CrossLinks variant="languages" />` after `<WhyChooseLoanFactory>`
  - Acceptance: Hub page shows state links and language links sections below WhyChooseLoanFactory.

- [ ] 7.4 Integrate CrossLinks into state pages
  - File: `src/app/[locale]/(public)/find-loan-officers/[state]/page.tsx`
  - Add `<CrossLinks variant="cities" stateId={state} stateName={resolvedStateName} />` after the officer listing
  - Acceptance: State pages show top city links for that state.

## 8. Translation keys

- [ ] 8.1 Add translation keys for new UI text
  - Files: `src/messages/en.json` (and other locale files: `es.json`, `vi.json`, `zh.json`, `he.json`)
  - Add keys under `FindLoanOfficersPage`:
    - `cross_links.browse_by_state`: "Find Loan Officers by State"
    - `cross_links.browse_by_language`: "Find Loan Officers by Language"
    - `cross_links.top_cities`: "Top Cities in {state}"
    - `cross_links.view_all_in_state`: "View all loan officers in {state}"
    - `cross_links.view_language`: "Find {language} speaking loan officers"
  - Acceptance: All new keys exist in en.json. Other locale files have placeholder entries (can be translated later).
