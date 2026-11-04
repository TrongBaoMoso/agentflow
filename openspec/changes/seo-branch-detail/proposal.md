# Proposal: SEO Branch Detail Page Overhaul

## Problem Statement

Branch detail pages on lf-homepage lack critical local SEO signals needed to rank in geographic mortgage searches and surface in AI-powered search results (Google SGE, ChatGPT, Perplexity).

Current deficiencies:

1. **URLs are name-based, not geographic** -- `/branches/houston-727787009` gives no state-level signal to crawlers. A competitor URL like `/branches/tx-houston-727787009` immediately communicates geography.
2. **No MortgageBroker structured data** -- The page emits a generic `WebPage` + `ItemList` JSON-LD schema instead of `MortgageBroker`, which is the schema Google uses for local business rich results in the mortgage vertical.
3. **Heading hierarchy is generic** -- The H1 is just the city name (`Houston`). It should be `Loan Factory -- Your Local Mortgage Broker in Houston, TX` to match long-tail search intent ("mortgage broker in Houston TX").
4. **Meta description is not optimized** -- The current description is adequate but does not follow the marketing-approved template designed for maximum SERP click-through.
5. **No FAQ section** -- No FAQ content exists, missing an opportunity for FAQ rich snippets and answering common borrower questions that AI search engines prioritize.
6. **Image alt text is generic** -- Branch images do not include city/state context, reducing image search visibility.

## Proposed Solution

A frontend-only SEO overhaul of the branch detail page in `lf-homepage` covering:

1. **Geographic URL slugs** -- Change slug format from `{name}-{id}` to `{state_lowercase}-{city_lowercase}-{id}` (e.g., `tx-houston-727787009`). Add 301 redirects from old slugs in middleware.
2. **MortgageBroker JSON-LD** -- Replace the generic `WebPage` schema with a `MortgageBroker` schema including address, telephone, opening hours, image, and geo coordinates.
3. **FAQPage JSON-LD + Accordion** -- Add 4 default FAQ questions with city/state/phone placeholders, rendered as a Mantine Accordion. Emit a companion `FAQPage` JSON-LD schema for rich snippet eligibility.
4. **Heading restructure** -- H1 becomes the marketing-approved title template. H2s for "Meet Our {City} Loan Officers", "What Our Clients Say", "Frequently Asked Questions". H3s for branch info items.
5. **Meta description template** -- Apply the marketing-approved 150-160 character template with city/state interpolation.
6. **Image alt text** -- Add city/state context to branch avatar alt text across the detail page.
7. **Sitemap update** -- Generate sitemap URLs with the new geographic slug format.

## Impact

- **Local search rankings**: Geographic URL slugs + MortgageBroker schema target "mortgage broker in [city] [state]" queries directly.
- **SERP CTR**: Optimized meta descriptions and FAQ rich snippets increase click-through from search results.
- **AI search visibility**: Structured FAQ content and schema markup help AI search engines extract and cite LoanFactory branch information.
- **Zero SEO regression**: 301 redirects preserve existing link equity from old URLs.

## Scope

### In scope

- Branch detail page (`[branch_id]/page.tsx`) -- headings, schema, meta, FAQ section
- BranchCard component -- slug generation update
- Middleware -- 301 redirect from old slug format to new geographic format
- Sitemap -- URL slug format update
- Translation files -- new keys for FAQ and updated headings (all 5 locales, English text as fallback)
- Image alt text updates on branch detail page

### Out of scope

- CMS custom-FAQ override (Phase 2 -- documented for follow-up)
- Translations beyond English placeholder text (marketing will provide copy later)
- Backend API changes (all data needed is already available)
- Branch listing page redesign (only slug link generation changes)
- Pure geographic slugs without ID suffix (ID is needed for reliable data lookup)
- ComplaintSection i18n (separate effort, not SEO-critical)

## Success Criteria

1. Branch detail page at `/branches/tx-houston-727787009` renders correctly with all new SEO elements.
2. Old URL `/branches/houston-727787009` returns a 301 redirect to the new geographic URL.
3. Google Rich Results Test validates both `MortgageBroker` and `FAQPage` JSON-LD schemas.
4. H1 matches template: "Loan Factory -- Your Local Mortgage Broker in {City}, {State}".
5. Meta description is 150-160 characters with city/state interpolation.
6. FAQ accordion renders 4 questions with resolved city/state/phone values.
7. Sitemap contains new geographic slug URLs.
8. All 5 locale files contain the new translation keys.
9. No build errors, all existing tests pass.

## Feature Branch

`feature/seo-branch-detail` from `production` (lf-homepage repo)

## Dependencies

- No backend changes required.
- `branch.state` field (e.g., "TX") is already available from the API response.
- `branch.name` field serves as the city name (e.g., "Houston").
- `company.open` / `company.close` fields provide opening hours for schema.

## Risks

- **Branch names that are not city names**: A small number of branches may have non-city names. The slug and heading will still work but may be less SEO-optimal. This is acceptable for Phase 1; a city override field could be added in Phase 2.
- **Old slug bookmarks**: 301 redirects handle this. Redirect matching must account for the name-based slug format used by both BranchCard and sitemap.
