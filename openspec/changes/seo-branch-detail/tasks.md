# Tasks: SEO Branch Detail Page Overhaul

**Target repo:** lf-homepage
**Feature branch:** `feature/seo-branch-detail` (from `production`)

---

## 1. Slug Utility and Link Generation

Foundation task -- all other tasks depend on or relate to this slug format.

- [ ] 1.1 [frontend] [haiku] Create `formatBranchSlug` utility and update BranchCard links

  **Description:**
  1. In `src/shared/utils/format.ts`, add a new exported function `formatBranchSlug(state: string, name: string, id: string | number): string` that produces `{state_lowercase}-{formatSlugName(name)}-{id}` (e.g., `tx-houston-727787009`).
  2. In `src/app/[locale]/(public)/branches/_sections/BranchCard.tsx`, update the `LinkDetailsWrapper` component to call `formatBranchSlug(branch.state, branch.name, branch.id)` instead of `formatSlugName(branchName) + '-' + branchId`.
  3. Update the `SeoImage` alt text in `BranchCard.tsx` from the hardcoded `\`${branch.name} Image\`` to a descriptive alt: `\`Loan Factory mortgage broker office in ${branch.name}, ${branch.state}\``. (Note: this is in a client component that does not use server-side translations, so a template literal is acceptable here. The i18n version will be addressed if BranchCard is refactored to use translations.)

  **Files affected:**
  - `src/shared/utils/format.ts` -- add function
  - `src/app/[locale]/(public)/branches/_sections/BranchCard.tsx` -- update slug generation and alt text

  **Acceptance criteria:**
  - `formatBranchSlug('TX', 'Houston', '727787009')` returns `'tx-houston-727787009'`
  - `formatBranchSlug('CA', 'San Jose', '123')` returns `'ca-san-jose-123'`
  - `formatBranchSlug('NY', 'New York', '456')` returns `'ny-new-york-456'`
  - BranchCard links point to `/branches/tx-houston-{id}` format
  - BranchCard image alt includes city and state
  - Build passes (`npm run build`)

  **Dependencies:** None

---

## 2. Middleware Redirect

- [ ] 2.1 [frontend] [sonnet] Add 301 redirect in middleware for old branch slugs

  **Description:**
  1. In `src/middleware.ts`, add a new function `tryBranchSlugRedirect(request: NextRequest): NextResponse | null`.
  2. The function should:
     - Match pathnames like `/{optional-locale}/branches/{slug}` where `{slug}` is not empty.
     - Extract the branch ID from the slug (last segment after the final hyphen: `slug.split('-').slice(-1)[0]`).
     - Check if the slug already starts with a 2-letter state prefix pattern (regex: `/^[a-z]{2}-/`). If yes, return `null` (no redirect needed).
     - If the slug does NOT start with a state prefix (old format like `houston-727787009`):
       - Fetch the branch data by ID using a direct `fetch` call to `${process.env.NEXT_PUBLIC_MOSO_API_URL}/api/webplus/v1/loanfactory/getBranchLocationInfo?id=${branchId}` (do NOT import `fetchBranchById` -- middleware runs in Edge runtime).
       - If fetch fails or branch not found, return `null` (let the page handle 404).
       - Build the new geographic slug using the same logic as `formatBranchSlug`: `${branch.state.toLowerCase()}-${formatSlugName(branch.name)}-${branch.id}`.
       - Import `formatSlugName` from `@utils/format` (pure function, Edge-compatible).
       - Return `NextResponse.redirect(newUrl, { status: 301 })`.
  3. Call `tryBranchSlugRedirect(request)` in the main `middleware` function, after the `tryFindLoanOfficersRedirect` call and before the i18n routing.

  **Files affected:**
  - `src/middleware.ts` -- add `tryBranchSlugRedirect` function and call it

  **Acceptance criteria:**
  - Request to `/branches/houston-727787009` returns 301 redirect to `/branches/tx-houston-727787009`
  - Request to `/branches/tx-houston-727787009` passes through without redirect
  - Request to `/branches/invalid-999` does not crash (returns null, page handles 404)
  - Request to `/es/branches/houston-727787009` redirects to `/es/branches/tx-houston-727787009` (locale preserved)
  - Build passes (`npm run build`)

  **Dependencies:** Task 1.1 (needs `formatSlugName` to remain in `format.ts`; does NOT need `formatBranchSlug` since it inlines the logic to avoid importing the full utility)

---

## 3. Heading Restructure and Meta Description

- [ ] 3.1 [frontend] [sonnet] Restructure headings (H1/H2/H3) and update meta description

  **Description:**
  1. In `src/app/[locale]/(public)/branches/[branch_id]/page.tsx`, update `generateMetadata`:
     - Title: `t('BranchPage.page_title', { city: branch.name, state: branch.state })` -- resolves to "Loan Factory -- Your Local Mortgage Broker in Houston, TX".
     - Description: `t('BranchPage.meta_description', { city: branch.name, state: branch.state })` -- resolves to the marketing-approved 155-char template.
     - OpenGraph description: same as meta description.
  2. Update the page component heading hierarchy:
     - `<h1>`: Change from `{branch.name}` to `{t('BranchPage.page_title', { city: branch.name, state: branch.state })}`.
     - Demote "Office hours" from `<h2>` to `<h3>`.
     - Demote "State Licenses" from `<h2>` to `<h3>`.
     - Change the Google Reviews heading from `<h2>{t('BranchPage.google_reviews')}</h2>` to `<h2>{t('BranchPage.what_our_clients_say')}</h2>`.
     - The LoanOfficers section heading: Ensure LoanOfficers component renders its heading as `<h2>` using the new key `BranchPage.meet_our_loan_officers` with `{ city: branch.name }`. (Check `LoanOfficers.tsx` to see how the heading is rendered and update accordingly -- may need to pass `city` as a prop.)
  3. Note: The `generateMetadata` function uses `getTranslations` from `next-intl/server`. It needs the locale param. Check how other pages handle this -- the `params` object should include `locale`.

  **Files affected:**
  - `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` -- metadata + headings
  - `src/app/[locale]/(public)/branches/[branch_id]/_sections/LoanOfficers.tsx` -- may need city prop for heading (check current implementation)

  **Acceptance criteria:**
  - H1 reads "Loan Factory -- Your Local Mortgage Broker in Houston, TX" (for Houston branch)
  - `<meta name="description">` contains city and state, is 150-160 characters
  - OpenGraph description matches meta description
  - "Office hours" and "State Licenses" are `<h3>` elements
  - Google Reviews section heading is "What Our Clients Say"
  - Loan Officers section heading is "Meet Our Houston Loan Officers"
  - No `<h2>` appears before `<h1>` in DOM order
  - Build passes (`npm run build`)

  **Dependencies:** Task 4.1 (translation keys must exist first)

---

## 4. Translation Keys

- [ ] 4.1 [frontend] [haiku] Add FAQ and SEO translation keys to all 5 locale files

  **Description:**
  Add the following keys to the `BranchPage` namespace in all 5 locale files (`en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`). Use English text as fallback in all non-English files (marketing will provide translations later).

  New keys to add:
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

  Add these keys inside the existing `"BranchPage": { ... }` object, after the last existing key. Do NOT remove or modify any existing keys.

  **Files affected:**
  - `src/messages/en.json`
  - `src/messages/es.json`
  - `src/messages/vi.json`
  - `src/messages/zh.json`
  - `src/messages/he.json`

  **Acceptance criteria:**
  - All 5 locale files contain all 13 new keys in the `BranchPage` namespace
  - Existing keys in `BranchPage` are unchanged
  - All placeholder syntax uses ICU format: `{city}`, `{state}`, `{phone}`
  - JSON is valid (no trailing commas, proper escaping)
  - Build passes (`npm run build`)

  **Dependencies:** None

---

## 5. MortgageBroker JSON-LD Schema

- [ ] 5.1 [frontend] [sonnet] Replace WebPage schema with MortgageBroker JSON-LD

  **Description:**
  1. In `src/app/[locale]/(public)/branches/[branch_id]/page.tsx`, replace the `generateSchema` function with `generateMortgageBrokerSchema(branch, company, canonicalUrl)`.
  2. The function should return a JSON-LD object with `@type: 'MortgageBroker'` including:
     - `name`: `"Loan Factory - {branch.name}, {branch.state}"`
     - `image`: `branch.avatar` (omit if falsy)
     - `url`: canonical URL (construct from `NEXT_PUBLIC_MOSO_WEB_URL` + `/branches/` + new geographic slug)
     - `telephone`: `branch.phone` (omit if falsy)
     - `address`: `PostalAddress` with `streetAddress` (branch.full_address), `addressLocality` (branch.name), `addressRegion` (branch.state), `addressCountry` ("US")
     - `geo`: `GeoCoordinates` with lat/lng (omit if either is falsy)
     - `openingHoursSpecification`: Monday-Friday with `company.open` and `company.close` formatted as HH:00
  3. Filter out any fields with `undefined` values to produce clean JSON-LD.
  4. Update the `<Script>` tag to use the new schema.

  **Files affected:**
  - `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` -- replace schema generator

  **Acceptance criteria:**
  - JSON-LD `@type` is `"MortgageBroker"` (not `"WebPage"`)
  - Schema includes address with `addressLocality` and `addressRegion`
  - Schema includes `telephone` when branch has a phone number
  - Schema includes `geo` when branch has lat/lng
  - Schema includes `openingHoursSpecification` with weekday hours
  - Google Rich Results Test validates the schema without errors
  - Build passes (`npm run build`)

  **Dependencies:** Task 1.1 (needs `formatBranchSlug` for canonical URL)

---

## 6. FAQ Section Component and FAQPage Schema

- [ ] 6.1 [frontend] [sonnet] Create FAQSection component with Mantine Accordion and FAQPage JSON-LD

  **Description:**
  1. Create new file `src/app/[locale]/(public)/branches/[branch_id]/_sections/FAQSection.tsx`:
     - Client component (`'use client'`)
     - Props: `faqs: Array<{ question: string; answer: string }>`
     - Renders a Mantine `Accordion` (from `@mantine/core`) with each FAQ as an `Accordion.Item`
     - Each item: `Accordion.Control` shows the question, `Accordion.Panel` shows the answer
     - Style: use Tailwind for spacing, Mantine Accordion defaults for expand/collapse behavior
     - Keep the component under 80 lines
  2. In `src/app/[locale]/(public)/branches/[branch_id]/page.tsx`:
     - Add a `generateFAQSchema(faqs)` function that returns `FAQPage` JSON-LD with `@type: 'FAQPage'` and `mainEntity` array of `Question` + `Answer` pairs.
     - Resolve all 4 FAQ question/answer pairs using `t('BranchPage.faq_q1', { city, state })` etc.
     - Build an array of `{ question, answer }` objects.
     - Render a second `<Script>` tag with the FAQPage JSON-LD.
     - Render `<h2>{t('BranchPage.faq_heading')}</h2>` followed by `<FAQSection faqs={faqItems} />` after the LoanOfficers section.

  **Files affected:**
  - `src/app/[locale]/(public)/branches/[branch_id]/_sections/FAQSection.tsx` -- new file
  - `src/app/[locale]/(public)/branches/[branch_id]/page.tsx` -- add FAQ schema + render FAQ section

  **Acceptance criteria:**
  - FAQ accordion renders 4 questions with city/state/phone interpolated
  - Accordion items expand/collapse on click
  - FAQPage JSON-LD is present in page source with 4 Question entries
  - FAQ questions in JSON-LD have resolved city/state values (not placeholders)
  - Google Rich Results Test validates the FAQPage schema
  - Component file is under 80 lines
  - Build passes (`npm run build`)

  **Dependencies:** Task 4.1 (translation keys), Task 3.1 (heading structure -- to know where FAQ section goes in the layout)

---

## 7. Sitemap Update

- [ ] 7.1 [frontend] [haiku] Update sitemap to use geographic branch slugs

  **Description:**
  1. In `src/app/sitemap/sitemap-scopes.ts`, update the `getBranchesRoutes` function:
     - Import `formatBranchSlug` from `@utils/format`.
     - Replace `const branchSlug = \`${formatSlugName(branch.name)}-${branch.id}\`` with `const branchSlug = formatBranchSlug(branch.state, branch.name, branch.id)`.
  2. Verify that `branch.state` is available in the data returned by `fetchBranchesLocationInfo`. The `BranchLocation` type includes `state: string`.

  **Files affected:**
  - `src/app/sitemap/sitemap-scopes.ts` -- update `getBranchesRoutes`

  **Acceptance criteria:**
  - Sitemap branch URLs use format `/branches/tx-houston-{id}` (not `/branches/houston-{id}`)
  - All branch entries in sitemap have the geographic slug format
  - Build passes (`npm run build`)

  **Dependencies:** Task 1.1 (`formatBranchSlug` utility)

---

## Task Dependency Graph

```
Task 1.1 (slug utility)     Task 4.1 (translation keys)
    │                              │
    ├──────────┐                   │
    │          │                   │
    v          v                   v
Task 2.1   Task 5.1           Task 3.1 (headings)
(redirect)  (schema)              │
    │          │                   │
    │          │                   v
    │          │              Task 6.1 (FAQ)
    │          │
    v          │
Task 7.1      │
(sitemap)     │
```

**Recommended execution order:**
1. Tasks 1.1 and 4.1 in parallel (no dependencies)
2. Tasks 2.1, 3.1, 5.1, 7.1 in parallel (depend on 1.1 and/or 4.1)
3. Task 6.1 last (depends on 3.1 and 4.1)
