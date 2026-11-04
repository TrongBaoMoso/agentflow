# Design: SEO Branch Detail Page Overhaul

## 1. URL Slug Format

### New format

```
/branches/{state_lowercase}-{city_lowercase}-{id}
```

Examples:
- `/branches/tx-houston-727787009`
- `/branches/ca-san-jose-727787123`
- `/branches/ny-new-york-727787456`

### Slug generation utility

Create a new utility function `formatBranchSlug` in `src/shared/utils/format.ts`:

```typescript
export const formatBranchSlug = (
  state: string,   // e.g., "TX"
  name: string,    // e.g., "Houston" (city name)
  id: string | number
): string => {
  const stateSlug = state.trim().toLowerCase()           // "tx"
  const citySlug = formatSlugName(name)                   // "houston" or "san-jose"
  return `${stateSlug}-${citySlug}-${id}`                 // "tx-houston-727787009"
}
```

### ID extraction

The page already extracts the ID via `branch_id.split('-').slice(-1)[0]`. This continues to work because the ID is always the last segment after the final hyphen. No change needed in the page's ID parsing logic.

### Files affected

| File | Change |
|------|--------|
| `src/shared/utils/format.ts` | Add `formatBranchSlug` function |
| `src/app/[locale]/(public)/branches/_sections/BranchCard.tsx` | Use `formatBranchSlug(branch.state, branch.name, branch.id)` instead of `formatSlugName(branchName) + '-' + branchId` |
| `src/app/sitemap/sitemap-scopes.ts` | Use `formatBranchSlug` in `getBranchesRoutes` |
| `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` | No change to ID parsing (still works) |

### BranchCard dependency

`BranchCard` is a client component. It receives `branch` as a prop. The `branch` object must include `state`. Check that the listing page passes the full branch object. `BranchLocation` type already has `state: string`.

## 2. 301 Redirect Strategy

### Where

Add a `tryBranchSlugRedirect` function in `src/middleware.ts`, called before the i18n routing step, after the existing `tryFindLoanOfficersRedirect`.

### Logic

```
1. Match pathname: /{optional-locale}/branches/{slug}
2. Extract the ID from the slug (last segment after final hyphen)
3. Check if slug starts with a 2-letter state abbreviation pattern (e.g., "tx-")
4. If it does NOT start with a state abbreviation:
   a. This is an old-format slug (e.g., "houston-727787009")
   b. Fetch branch data by ID to get state + name
   c. Build new slug: formatBranchSlug(branch.state, branch.name, branch.id)
   d. Return 301 redirect to /branches/{new-slug}
5. If it already starts with a state abbreviation, no redirect needed
```

### Edge cases

- **Invalid ID**: If the branch fetch returns null, do not redirect -- let the page handle the 404.
- **Already-correct slug**: No redirect. The check is simple: does the slug match `^[a-z]{2}-` pattern? This is a heuristic that avoids an API call on every branch page load.
- **Locale prefix**: Strip locale prefix before matching, re-add when building redirect URL.

### Performance consideration

The redirect only fires for old-format slugs (those not matching `^[a-z]{2}-`). Once all links are updated and Google re-crawls, redirects will be rare. The API call is cached by Next.js fetch cache.

### File affected

| File | Change |
|------|--------|
| `src/middleware.ts` | Add `tryBranchSlugRedirect` function, call it after `tryFindLoanOfficersRedirect` |

### Import constraint

Middleware runs in the Edge runtime. The `fetchBranchById` function uses `fetch` internally (server-side), which is available in Edge. However, if the function imports Node.js-only modules, we may need a lightweight fetch call directly in middleware instead. Design the redirect function to use a direct `fetch` to the branch API endpoint rather than importing `fetchBranchById`.

## 3. Heading Hierarchy

### Current structure

```
h1: "{city_name}"                              (e.g., "Houston")
  h3: NMLS number
  h3: Phone
  h3: Email
  h2: "Office hours"
  h2: "State Licenses"
  h2: "Google Reviews"
```

### New structure

```
h1: "Loan Factory -- Your Local Mortgage Broker in {City}, {State}"
  h2: "Meet Our {City} Loan Officers"           (LoanOfficers section)
  h2: "What Our Clients Say"                     (Google Reviews section)
  h2: "Frequently Asked Questions"               (FAQ section -- new)
  h3: NMLS number                                (branch info items)
  h3: Phone
  h3: Email
  h3: "Office hours"                             (demoted from h2)
  h3: "State Licenses"                           (demoted from h2)
```

### H1 template

```
Loan Factory -- Your Local Mortgage Broker in {branch.name}, {branch.state}
```

Use translation key: `BranchPage.page_title` with ICU interpolation:
```json
"page_title": "Loan Factory -- Your Local Mortgage Broker in {city}, {state}"
```

### Meta description template

```
Looking for a top mortgage broker in {City}, {State}? Loan Factory offers competitive rates, fast pre-approvals, and expert guidance. Contact us today!
```

Translation key: `BranchPage.meta_description` with ICU interpolation. Length: ~155 characters with typical city/state values.

### OpenGraph description

Same as meta description.

### File affected

| File | Change |
|------|--------|
| `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` | Update `generateMetadata` and page component heading elements |

## 4. MortgageBroker JSON-LD Schema

### Replace `generateSchema` with:

```typescript
const generateMortgageBrokerSchema = (
  branch: BranchDetailData,
  company: Company,
  canonicalUrl: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'MortgageBroker',
  name: `Loan Factory - ${branch.name}, ${branch.state}`,
  image: branch.avatar || undefined,
  url: canonicalUrl,
  telephone: branch.phone || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: branch.full_address || undefined,
    addressLocality: branch.name,        // city
    addressRegion: branch.state,          // state abbreviation
    addressCountry: 'US'
  },
  geo: branch.lat && branch.lng ? {
    '@type': 'GeoCoordinates',
    latitude: branch.lat,
    longitude: branch.lng
  } : undefined,
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: `${company.open}:00`,
    closes: `${company.close}:00`
  }
})
```

### Data mapping

| Schema field | Source |
|--------------|--------|
| `name` | `"Loan Factory - " + branch.name + ", " + branch.state` |
| `image` | `branch.avatar` |
| `url` | Canonical URL of the page |
| `telephone` | `branch.phone` |
| `address.streetAddress` | `branch.full_address` |
| `address.addressLocality` | `branch.name` (city) |
| `address.addressRegion` | `branch.state` |
| `geo.latitude` | `branch.lat` |
| `geo.longitude` | `branch.lng` |
| `openingHoursSpecification.opens` | `company.open + ":00"` (e.g., "9:00") |
| `openingHoursSpecification.closes` | `company.close + ":00"` (e.g., "17:00") |

### Handling undefined fields

Use conditional spreading or filter `undefined` values to produce clean JSON-LD. Google ignores missing optional fields gracefully.

### File affected

| File | Change |
|------|--------|
| `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` | Replace `generateSchema` with `generateMortgageBrokerSchema` |

## 5. FAQ Section

### Component: `FAQSection.tsx`

New file: `src/app/[locale]/(public)/branches/[branch_id]/_sections/FAQSection.tsx`

**Architecture:**
- Server component (receives branch data as props, no client interactivity needed beyond Mantine Accordion)
- Actually, Mantine `Accordion` requires client-side state for open/close. So this should be a **client component** with `'use client'`.
- Receives `city`, `state`, `phone` as props.
- Uses `useTranslations('BranchPage')` for FAQ content.
- Renders Mantine `Accordion` with 4 items.
- Renders `FAQPage` JSON-LD schema via a `<script>` tag.

**Wait -- `<Script>` from `next/script` only works in client components or page-level server components.** Since this is a client component, use a regular `<script>` tag or pass the schema data to the parent page component for rendering. Better approach: have the FAQ section render only the Accordion UI, and generate the FAQPage JSON-LD in the parent page (server component) alongside the MortgageBroker schema.

### Revised architecture

1. **`FAQSection.tsx`** (client component) -- Renders Mantine Accordion with 4 FAQ items. Receives translated strings as props (not translation keys, since the parent is a server component that can resolve translations).
2. **`page.tsx`** (server component) -- Generates FAQPage JSON-LD and renders it via `<Script>`. Passes resolved FAQ strings to `FAQSection`.

### FAQ questions (English defaults)

| # | Question | Answer |
|---|----------|--------|
| 1 | Why should I choose a local mortgage broker in {City}, {State}? | A local broker in {City} understands the {State} housing market, has relationships with regional lenders, and can offer personalized guidance that national lenders cannot. Loan Factory's {City} team combines local expertise with access to a wide network of loan products. |
| 2 | What types of home loans are available at the {City} branch? | Our {City} branch offers conventional loans, FHA loans, VA loans, USDA loans, jumbo loans, and refinancing options. Contact us to discuss which program fits your financial situation. |
| 3 | Do you offer assistance for first-time homebuyers in {City}? | Yes. Our {City} loan officers specialize in guiding first-time buyers through every step -- from pre-approval to closing. We also help you explore down payment assistance programs available in {State}. |
| 4 | Do I need an appointment to visit the Loan Factory office in {City}? | Walk-ins are welcome during business hours, but we recommend calling {Branch_Phone} to schedule an appointment so a loan officer can give you their full attention. |

### Translation key structure

```json
{
  "BranchPage": {
    "faq_heading": "Frequently Asked Questions",
    "faq_q1": "Why should I choose a local mortgage broker in {city}, {state}?",
    "faq_a1": "A local broker in {city} understands the {state} housing market, has relationships with regional lenders, and can offer personalized guidance that national lenders cannot. Loan Factory's {city} team combines local expertise with access to a wide network of loan products.",
    "faq_q2": "What types of home loans are available at the {city} branch?",
    "faq_a2": "Our {city} branch offers conventional loans, FHA loans, VA loans, USDA loans, jumbo loans, and refinancing options. Contact us to discuss which program fits your financial situation.",
    "faq_q3": "Do you offer assistance for first-time homebuyers in {city}?",
    "faq_a3": "Yes. Our {city} loan officers specialize in guiding first-time buyers through every step -- from pre-approval to closing. We also help you explore down payment assistance programs available in {state}.",
    "faq_q4": "Do I need an appointment to visit the Loan Factory office in {city}?",
    "faq_a4": "Walk-ins are welcome during business hours, but we recommend calling {phone} to schedule an appointment so a loan officer can give you their full attention."
  }
}
```

ICU message format placeholders: `{city}`, `{state}`, `{phone}`. The parent page resolves these via `t('BranchPage.faq_q1', { city: branch.name, state: branch.state })`.

### FAQPage JSON-LD

Generated in `page.tsx` alongside MortgageBroker schema:

```typescript
const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }))
})
```

### Placement on page

The FAQ section renders after Google Reviews and before LoanOfficers, or after LoanOfficers at the bottom. Per the marketing spec, FAQ goes at the bottom of the content area:

```
[Breadcrumbs]
[H1 + Address]
[Branch Info (NMLS, phone, email, hours, licenses)]
[Branch Manager]
[Apply Now CTA]
[Google Map]
[Google Reviews]        -> h2: "What Our Clients Say"
[Loan Officers]         -> h2: "Meet Our {City} Loan Officers"
[FAQ Section]           -> h2: "Frequently Asked Questions"
```

### Files affected

| File | Change |
|------|--------|
| `src/app/[locale]/(public)/branches/[branch_id]/_sections/FAQSection.tsx` | New file -- Mantine Accordion with 4 FAQ items |
| `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` | Generate FAQPage JSON-LD, pass resolved FAQ strings to FAQSection, render FAQ section |

## 6. Translation Keys

### New keys to add

All keys go in the `BranchPage` namespace. Add to all 5 locale files (`en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`) with English text as fallback.

```json
{
  "page_title": "Loan Factory -- Your Local Mortgage Broker in {city}, {state}",
  "meta_description": "Looking for a top mortgage broker in {city}, {state}? Loan Factory offers competitive rates, fast pre-approvals, and expert guidance. Contact us today!",
  "meet_our_loan_officers": "Meet Our {city} Loan Officers",
  "what_our_clients_say": "What Our Clients Say",
  "faq_heading": "Frequently Asked Questions",
  "faq_q1": "Why should I choose a local mortgage broker in {city}, {state}?",
  "faq_a1": "A local broker in {city} understands the {state} housing market, has relationships with regional lenders, and can offer personalized guidance that national lenders cannot. Loan Factory's {city} team combines local expertise with access to a wide network of loan products.",
  "faq_q2": "What types of home loans are available at the {city} branch?",
  "faq_a2": "Our {city} branch offers conventional loans, FHA loans, VA loans, USDA loans, jumbo loans, and refinancing options. Contact us to discuss which program fits your financial situation.",
  "faq_q3": "Do you offer assistance for first-time homebuyers in {city}?",
  "faq_a3": "Yes. Our {city} loan officers specialize in guiding first-time buyers through every step -- from pre-approval to closing. We also help you explore down payment assistance programs available in {state}.",
  "faq_q4": "Do I need an appointment to visit the Loan Factory office in {city}?",
  "faq_a4": "Walk-ins are welcome during business hours, but we recommend calling {phone} to schedule an appointment so a loan officer can give you their full attention.",
  "branch_image_alt": "Loan Factory mortgage broker office in {city}, {state}"
}
```

### Existing keys to update

| Key | Current | Action |
|-----|---------|--------|
| `BranchPage.google_reviews` | "Google Reviews" | Replace usage with `what_our_clients_say` key for the h2 heading. Keep existing key for backward compatibility if used elsewhere. |
| `BranchPage.our_loan_officers` | "Our Loan Officers" | Replace usage with `meet_our_loan_officers` key for the h2 heading. |

### Files affected

| File | Change |
|------|--------|
| `src/messages/en.json` | Add new keys to BranchPage namespace |
| `src/messages/es.json` | Add new keys (English text as fallback) |
| `src/messages/vi.json` | Add new keys (English text as fallback) |
| `src/messages/zh.json` | Add new keys (English text as fallback) |
| `src/messages/he.json` | Add new keys (English text as fallback) |

## 7. Image Alt Text

### Template

```
Loan Factory mortgage broker office in {City}, {State}
```

Translation key: `BranchPage.branch_image_alt` (already defined in section 6).

### Where to apply

| Location | Current alt | New alt |
|----------|------------|---------|
| `page.tsx` branch avatar (if rendered) | N/A (no image in detail page header currently) | Use template if avatar is added |
| `BranchCard.tsx` card image | `"{branch.name} Image"` | `t('BranchPage.branch_image_alt', { city: branch.name, state: branch.state })` |
| `GoogleMapWithPin` | Map component (no img alt needed) | No change |

### Files affected

| File | Change |
|------|--------|
| `src/app/[locale]/(public)/branches/_sections/BranchCard.tsx` | Update `SeoImage` alt text |

## 8. Sitemap Update

### Current

```typescript
const branchSlug = `${formatSlugName(branch.name)}-${branch.id}`
```

### New

```typescript
const branchSlug = formatBranchSlug(branch.state, branch.name, branch.id)
```

Requires that `fetchBranchesLocationInfo` returns `state` in the branch objects. `BranchLocation` type includes `state: string`, so this field should be available.

### File affected

| File | Change |
|------|--------|
| `src/app/sitemap/sitemap-scopes.ts` | Import `formatBranchSlug`, use it in `getBranchesRoutes` |

## 9. Component Architecture Summary

```
page.tsx (server component)
├── generateMetadata()           -- title, meta desc with city/state
├── generateMortgageBrokerSchema() -- MortgageBroker JSON-LD
├── generateFAQSchema()          -- FAQPage JSON-LD
├── <Script> (MortgageBroker)
├── <Script> (FAQPage)
├── <h1> "Loan Factory -- Your Local..."
├── Branch info (h3 items)
├── ManagerCard
├── GoogleMapWithPin
├── ComplaintSection
├── <h2> "What Our Clients Say"
│   └── ReviewItem[]
├── <h2> "Meet Our {City} Loan Officers"
│   └── LoanOfficers
└── <h2> "Frequently Asked Questions"
    └── FAQSection (client component)
        └── Mantine Accordion (4 items)
```

## 10. Acceptance Criteria Summary

| Criterion | How to verify |
|-----------|---------------|
| Geographic URL renders correctly | Visit `/branches/tx-houston-727787009` |
| Old URL redirects with 301 | `curl -I /branches/houston-727787009` returns 301 to geographic URL |
| H1 matches template | Inspect DOM, verify `<h1>` text |
| Meta description matches template | View page source, check `<meta name="description">` |
| MortgageBroker schema validates | Paste page URL in Google Rich Results Test |
| FAQPage schema validates | Paste page URL in Google Rich Results Test |
| FAQ accordion renders 4 items | Visual check, verify city/state/phone interpolation |
| Sitemap uses new slugs | Check `/sitemap.xml` branch URLs |
| All 5 locale files have new keys | Grep for `faq_q1` in all locale files |
| BranchCard links use new slug | Click a branch card, verify URL format |
| Build passes | `npm run build` exits 0 |
| No existing test regressions | `npm test` exits 0 |

## 11. Conventions to Follow

Per `lf-homepage/CLAUDE.md`:

- No semicolons
- No trailing commas
- File max 500 lines (ESLint enforced)
- Use `useTranslations()` for all user-facing strings
- Use Mantine components + Tailwind utilities
- Icons from `@tabler/icons-react`
- Types from `src/apis/moso-types.ts` when available
- Imports use path aliases (`@utils/`, `@components/`, etc.)
- `import type` for type-only imports
