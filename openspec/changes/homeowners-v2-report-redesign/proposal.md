# Proposal: Homeowners V2 Report Create/Update Redesign

## Problem Statement

The homeowners-v2 report creation wizard (`ReportForm`) currently imports all three section components (`AddressForm`, `Property`, `Contact`) directly from the v1 homeowners module. This creates:

1. **Tight coupling** — v2 cannot evolve independently of v1. Any v1 change risks breaking v2.
2. **Dead UI weight** — v1 sections carry features that v2 does not need: manual address entry fallback, multi-mortgage carousel with add/remove, and hard-to-find co-borrower actions.
3. **Poor data density** — the Property step spreads fields across carousel slides and oversized cards, requiring excessive scrolling.
4. **No smart defaults** — users manually fill loan term and rate even when the loan type strongly implies them (e.g., "Conventional 30yr" implies term=30).

## Proposed Solution

Create **new** section components inside `homeowners-v2/_components/ReportForm/sections/` that replace the v1 imports with a redesigned, self-contained implementation:

### Step 1 — AddressSearch (replaces AddressForm)
- Google Maps autocomplete only. Remove all manual-entry detection logic (`isSelectedAddressFromGoogleMap`, `lastGGValue`, conditional `street_number` in request body).
- Keep: autocomplete search, property API lookup, multi-result radio modal, auto-continue on single result.

### Step 2 — PropertyDetails (replaces Property)
- Show only the primary mortgage inline (where `primary === true`). No carousel, no add/remove mortgage UI, no `AddLoanModal`.
- Consolidate property info, home value, mortgage, and credit rating into a compact layout that reduces vertical scrolling.
- Smart defaults: when `loan_type_code` changes, auto-fill `loan_term` and suggest a rate range based on a lookup map.

### Step 3 — ContactInfo (replaces Contact)
- Make "Add co-borrower" button visually prominent (full-width outlined card with dashed border and plus icon, instead of small light button).
- Keep email verification flow (validateUserEmail on blur, auto-fill names/phone on valid, verified badge).
- Keep preview/submit actions as-is.

## Scope

### In scope
- New section components in `homeowners-v2/_components/ReportForm/sections/`
- Update `ReportForm/index.tsx` to import from new sections instead of v1
- Smart defaults utility (`loanTypeDefaults.ts`) in `homeowners-v2/_utils/`
- Compact layout for PropertyDetails

### Out of scope
- Changes to v1 homeowners module (no modifications to `homeowners/create/_sections/`)
- Changes to API endpoints or backend logic
- Changes to the validation schema (`_utils/schema.ts`) beyond what is needed for single-mortgage simplification
- Changes to the homeowner list page (`ReportPage`, `ReportColumnsConfig`, `HomeownerCard`, etc.)

## Success Criteria

1. `ReportForm` imports zero components from `homeowners/create/_sections/`
2. Address step has no manual-entry code paths
3. Property step shows exactly one mortgage (the primary), no carousel
4. Changing loan type auto-fills term; rate hint is displayed
5. "Add co-borrower" button is visually distinct and easy to find
6. Existing email verification flow works unchanged
7. Create and edit modes both function correctly
8. `npm run build` passes with zero type errors

## Feature Branch

`feature/homeowners-v2-report-redesign` (to be created from `production` by DevOps)
