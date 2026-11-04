# Proposal: Find Loan Officers SEO & Performance Overhaul

## Feature branch

`feature/lf-homepage-find-loan-officers` (to be created from `production` in `lf-homepage` repo)

## Problem statement

The `/find-loan-officers` directory section of lf-homepage has several SEO and performance gaps that hurt organic search rankings, page speed, and conversion rates:

1. **No sitemap coverage for sub-routes.** Only the hub `/find-loan-officers` page is in the sitemap. The 50 state pages, city pages, language pages, specialty pages, and label pages are invisible to search engines via sitemap discovery.
2. **No BreadcrumbList structured data.** Google cannot build breadcrumb trails in SERPs for any find-loan-officers page.
3. **Missing `generateStaticParams` on all dynamic routes.** Every sub-route (state, city, language, specialty, labels) is fully dynamic -- none are pre-rendered at build time, causing slow TTFB on first visit and higher server load.
4. **LoanOfficerCard images use Mantine `<Image>` (via SeoImage) instead of Next.js `<Image>`.** This means no automatic WebP/AVIF conversion, no srcset, no priority loading for above-the-fold cards, and larger payloads.
5. **WhyChooseLoanFactory is a client component that does not need to be.** It uses `useTranslations()` but has no interactivity, adding unnecessary JS to the bundle.
6. **Duplicated fallback logic across 6 page files.** The fallback cascade (primary -> state-only -> national) is copy-pasted across page.tsx, [state]/page.tsx, [city]/page.tsx, language/page.tsx, specialty/page.tsx, and labels/page.tsx. This is a maintenance burden and source of inconsistency.
7. **LoanOfficerSection client-side `document.title` mutation.** The component manually overwrites `document.title` and meta tags via DOM manipulation (lines 238-298 in LoanOfficerSection), which is unnecessary since server-rendered `generateMetadata` already sets these. This causes flicker and duplicated logic.
8. **No internal cross-linking between listing pages.** State pages do not link to their cities; language pages do not link to states. This weakens internal link equity.

## Proposed solution

A multi-part improvement targeting structured data, image performance, SSG/ISR, code deduplication, and internal linking:

1. **Expand sitemap** with a new `find-loan-officers` sub-sitemap covering all state, language, and specialty routes.
2. **Add BreadcrumbList JSON-LD** to all find-loan-officers pages (hub, state, city, language, specialty, labels).
3. **Add `generateStaticParams`** to state and specialty routes for build-time pre-rendering; use ISR `revalidate` on city/language/labels routes.
4. **Switch LoanOfficerCard avatar to Next.js `<Image>`** with proper `sizes`, `width`/`height`, and priority for first 3 cards.
5. **Convert WhyChooseLoanFactory to a server component** (remove `'use client'`, pass translated strings as props).
6. **Extract shared fallback logic** into a single utility function used by all 6 page files.
7. **Remove client-side document.title mutation** from LoanOfficerSection -- rely on server-rendered metadata only.
8. **Add internal cross-links** (state listing links to top cities; hub page links to all states).

## Scope

### In scope
- All files under `src/app/[locale]/(public)/find-loan-officers/`
- `src/shared/components/LoanOfficerCard/index.tsx`
- `src/shared/components/SeoImage/index.tsx` (may need minor update)
- `src/app/sitemap/route.ts` and `src/app/sitemap/sitemap-scopes/`
- `next.config.mjs` (image remote patterns update if needed)

### Out of scope
- `/mortgage-expert/` detail pages (separate change)
- API backend changes
- Non-English locale-specific SEO (i18n hreflang tags)
- Google Search Console configuration
- Other sections of lf-homepage

## Success criteria

1. All state, language, and specialty listing pages appear in the sitemap XML.
2. Google Rich Results Test validates BreadcrumbList on all sub-routes.
3. Lighthouse Performance score improves by 5+ points on the listing hub page (measured via LCP improvement from Next.js Image).
4. `generateStaticParams` pre-renders at least all 50 state pages at build time.
5. WhyChooseLoanFactory JS bundle contribution drops to zero (server component).
6. Fallback cascade logic exists in exactly one place, used by all 6 route files.
7. No client-side `document.title` mutation in LoanOfficerSection.
8. State pages include links to their top cities; hub page includes links to all states.
