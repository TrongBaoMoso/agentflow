# Design: Find Loan Officers SEO & Performance Overhaul

## Architecture overview

This change modifies 6 existing page files, 2 shared components, the sitemap route, and introduces 2 new shared utilities. No new pages or routes are created. The changes are backward-compatible -- URLs and user-facing behavior remain identical.

```
find-loan-officers/
  _utils/
    listingSeo.ts          (existing -- no changes)
    listingFallback.ts     (NEW -- shared fallback cascade)
    breadcrumb.ts          (NEW -- BreadcrumbList builder)
    ...
  _sections/
    LoanOfficerSection/
      index.tsx            (MODIFY -- remove document.title mutation)
    WhyChooseLoanFactory/
      index.tsx            (MODIFY -- convert to server component)
    StateCrossLinks/
      index.tsx            (NEW -- internal cross-links component)
  page.tsx                 (MODIFY -- use shared fallback, add breadcrumb, add cross-links)
  [state]/page.tsx         (MODIFY -- add generateStaticParams, breadcrumb, cross-links)
  [state]/[city]/page.tsx  (MODIFY -- use shared fallback, add breadcrumb, ISR)
  language/[language]/...  (MODIFY -- use shared fallback, add breadcrumb, ISR)
  specialty/[specialty]/.. (MODIFY -- add generateStaticParams, breadcrumb)
  labels/[label]/...       (MODIFY -- use shared fallback, add breadcrumb, ISR)

shared/components/
  LoanOfficerCard/index.tsx  (MODIFY -- Next.js Image for avatar)

app/sitemap/
  route.ts                   (MODIFY -- add find-loan-officers sub-sitemap)
  sitemap-scopes/index.ts    (MODIFY -- export new scope function)
```

---

## 1. Shared fallback cascade utility

**File:** `src/app/[locale]/(public)/find-loan-officers/_utils/listingFallback.ts`

Currently, every page file (page.tsx, [state], [city], language, specialty, labels) contains ~30-50 lines of duplicated fallback logic: try primary query -> if 0 results, try broader query -> if still 0, try national. This is extracted into a single function.

**Interface:**
```typescript
type TFallbackResult = {
  dataLO: ILoanOfficer[]
  displayResp: TLoanOfficerResponse
  isFallbackListing: boolean
  listFetchQuery?: TLoanOfficerQuery
  initFirstTotal: number
}

export async function resolveListingWithFallback(
  primaryResp: TLoanOfficerResponse,
  primaryQuery: TLoanOfficerQuery,
  broaderQueries: TLoanOfficerQuery[],  // ordered from most-specific to least-specific
  totalCount: number
): Promise<TFallbackResult>
```

**Logic:** If `primaryResp.l === 0`, iterate through `broaderQueries` in order, fetching each until one returns results. If none do, fall back to `LOAN_OFFICER_QUERY_DEFAULT` (national). Return the winning result alongside metadata flags.

Each page file will construct its own `broaderQueries` array (specific to its context), then call this shared function. This preserves the nuanced cascade order per route while eliminating the duplicated fetch-and-check boilerplate.

---

## 2. BreadcrumbList structured data

**File:** `src/app/[locale]/(public)/find-loan-officers/_utils/breadcrumb.ts`

Generates a BreadcrumbList JSON-LD object. Each page injects this alongside the existing CollectionPage schema.

**Breadcrumb trails by route:**

| Route | Trail |
|-------|-------|
| `/find-loan-officers` | Home > Find Loan Officers |
| `/find-loan-officers/CA` | Home > Find Loan Officers > California |
| `/find-loan-officers/CA/Los_Angeles` | Home > Find Loan Officers > California > Los Angeles |
| `/find-loan-officers/language/spanish` | Home > Find Loan Officers > Spanish Speaking |
| `/find-loan-officers/specialty/fha` | Home > Find Loan Officers > FHA Loans |
| `/find-loan-officers/labels/VA_Loan` | Home > Find Loan Officers > VA Loan |

**Interface:**
```typescript
type TBreadcrumbItem = { name: string; url: string }

export function buildBreadcrumbJsonLd(
  baseUrl: string,
  crumbs: TBreadcrumbItem[]
): object  // BreadcrumbList schema.org object
```

Each page file constructs its `crumbs` array and calls this function. The result is injected via `<Script type="application/ld+json">` alongside the existing CollectionPage schema (combined into a single `@graph` array or as a separate `<Script>` tag).

**Decision:** Use a separate `<Script>` tag for BreadcrumbList rather than merging into the existing CollectionPage schema. This is simpler and both are valid per Google's documentation.

---

## 3. generateStaticParams and ISR

**State route** (`[state]/page.tsx`):
- Add `generateStaticParams` that returns all 50 US states (from `STATES` constant).
- This pre-renders `/find-loan-officers/CA`, `/find-loan-officers/TX`, etc. at build time.
- Dynamic params remain enabled for any state codes not in the list (graceful fallback).

**Specialty route** (`specialty/[specialty]/page.tsx`):
- Add `generateStaticParams` from the known specialty slug list.

**City, language, labels routes:**
- Do NOT add `generateStaticParams` (too many combinations, or data-dependent).
- Instead, add `export const revalidate = 3600` (1 hour ISR) so pages are cached after first visit.

**Hub page** (`page.tsx`):
- Already server-rendered. No change needed for rendering strategy.

---

## 4. Next.js Image for LoanOfficerCard avatar

**File:** `src/shared/components/LoanOfficerCard/index.tsx`

Replace the `<SeoImage>` for the officer avatar with Next.js `<Image>`:

```tsx
import Image from 'next/image'

<Image
  src={formatBlobImage(data.avatar) || IMAGES.DEFAULT_AVATAR}
  alt={t('Common.avatarAlt', { avatar: data.full_name })}
  width={100}
  height={100}
  sizes="(max-width: 768px) 80px, 100px"
  className="rounded-lg w-full h-auto"
  priority={isPriority}  // true for first 3 cards
/>
```

**Props change:** Add `isPriority?: boolean` to `TLoanOfficerCardProps`. The parent `LoanOfficerList` passes `isPriority={index < 3}` for the first 3 cards (above the fold).

**next.config.mjs update:** The `images.domains` config is deprecated in Next 14. Keep existing `domains` but also add `remotePatterns` for `storage.googleapis.com` to enable future migration. The avatar images are already from `storage.googleapis.com` which is in the existing domains list, so no new domain is needed.

**Fallback handling:** Use the `onError` approach with a state variable to swap to `IMAGES.DEFAULT_AVATAR` on load failure, since Next.js `<Image>` does not support `fallbackSrc`.

---

## 5. WhyChooseLoanFactory as server component

**File:** `src/app/[locale]/(public)/find-loan-officers/_sections/WhyChooseLoanFactory/index.tsx`

Current state: Marked `'use client'` only because it uses `useTranslations()`. It has zero interactivity (no state, no event handlers, no effects).

**Change:**
1. Remove `'use client'` directive.
2. Change from `useTranslations()` hook to server-side `getTranslations()` from `next-intl/server`.
3. Make the component `async`.
4. The Mantine components (`Card`, `SimpleGrid`, `ThemeIcon`) and Tabler icons are already tree-shakeable and work in server components.
5. The `SeoLinkButton` component inside may need to remain client-side. If so, extract just that button into a tiny client wrapper, keeping the bulk of WhyChooseLoanFactory as a server component.

**Verification needed at implementation time:** Check whether `SeoLinkButton` uses any client-only hooks. If it does, wrap only that call in a client boundary. If not, the entire component becomes a server component.

---

## 6. Remove client-side document.title mutation

**File:** `src/app/[locale]/(public)/find-loan-officers/_sections/LoanOfficerSection/index.tsx`

Lines 238-298 contain a `useEffect` that parses the pathname, recomputes metadata, and manually sets `document.title`, `meta[name="description"]`, and `meta[property="og:description"]` via DOM manipulation.

**Why this exists:** When the user changes filters, `window.history.pushState` updates the URL without a full navigation. The server-rendered metadata becomes stale.

**Decision:** Remove this `useEffect` entirely. The metadata from `generateMetadata` (server-side) is the authoritative source. When users filter client-side, the URL changes via pushState but crawlers see the server-rendered version. The client-side title mutation is unnecessary for SEO (crawlers don't execute it) and causes brief flicker for users.

Also remove the client-side `generateMetadata` helper function (lines 53-136) which duplicates the server-side SEO logic.

---

## 7. Sitemap expansion

**File:** `src/app/sitemap/route.ts`

Add a new sub-sitemap `find-loan-officers` in the sitemap index:

```typescript
{
  url: `${baseUrl}/sitemap.xml?sub=find-loan-officers`,
  lastModified: new Date()
}
```

**New scope function** in `src/app/sitemap/sitemap-scopes/`:

```typescript
export async function getFindLoanOfficersRoutes(): Promise<MetadataRoute.Sitemap> {
  // 1. Hub page (already in static routes, skip here)
  // 2. All 50 state pages: /find-loan-officers/{state}
  // 3. All language pages: /find-loan-officers/language/{slug}
  // 4. All specialty pages: /find-loan-officers/specialty/{slug}
  // No city or label pages in sitemap (too many, discovered via internal links)
}
```

State URLs use the state ID (e.g., `CA`, `TX`). Language URLs use the SEO slug from `languageKeyToSeoSlug`. Specialty URLs use slugs from the specialty slug mapping.

Priority: state pages 0.8, language pages 0.7, specialty pages 0.7.

---

## 8. Internal cross-links

**New component:** `src/app/[locale]/(public)/find-loan-officers/_sections/StateCrossLinks/index.tsx`

A server component that renders a grid of internal links.

**On the hub page** (`/find-loan-officers`):
- Section titled "Find Loan Officers by State" with links to all 50 state pages.
- Section titled "Find Loan Officers by Language" with links to all language pages.
- Rendered below WhyChooseLoanFactory.

**On state pages** (`/find-loan-officers/CA`):
- Section titled "Top Cities in {State}" with links to the top cities for that state.
- City data: Can derive from API response (officers in the current state listing have city info), or use a static list of major cities per state.
- Decision: Use a static curated list of top 10 cities per state (data file). This avoids an extra API call and ensures consistency.

**On city pages:**
- Link back to the parent state page and to the hub.

**Implementation:** Use `SeoLink` for all cross-links (already the pattern in the codebase). The component is a simple server component with no client-side JS.

---

## Conventions to follow

- Use `cache()` from React for deduplicating server-side fetches (existing pattern).
- Use `Script` from `next/script` for JSON-LD injection (existing pattern).
- Use `SeoLink` and `SeoLinkButton` for all navigational links (existing pattern).
- Use `buildMortgageExpertSlug` for LO detail URLs (existing pattern).
- Use `@constants/state` STATES array for state data (existing pattern).
- Translation keys under `FindLoanOfficersPage.*` namespace (existing pattern).
- Follow existing file organization: `_utils/` for pure functions, `_sections/` for components.
- Keep `'use client'` only on components that genuinely need browser APIs or React hooks.

---

## Risk / trade-offs

| Decision | Trade-off |
|----------|-----------|
| Static pre-render 50 state pages | Increases build time by ~30-60s. Acceptable for the SEO benefit. |
| Remove document.title mutation | Client-side URL changes via pushState will show stale browser tab title. Users rarely notice tab titles. SEO unaffected. |
| Static city list vs. API-driven | Requires manual maintenance of top cities per state. Avoids API dependency and extra latency. |
| ISR 1-hour revalidation for city/language/labels | Pages may show slightly stale officer data for up to 1 hour. Acceptable given officers change infrequently. |
