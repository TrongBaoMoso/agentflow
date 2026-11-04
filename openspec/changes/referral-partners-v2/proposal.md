# Proposal: Referral Partners V2 Visual Redesign

## Problem Statement

The current Referral Partners page in lf-iq uses a v1 visual design that is inconsistent with the recently shipped homeowners-v2 redesign. The v1 page uses Mantine `Card`, `Grid`, `Badge`, and `Divider` components with inline styles, whereas the rest of the private area is migrating to a card-based, Tailwind-first design language with sticky toolbar, collapsible filters, and expandable card rows.

Users (Loan Officers and Admins) who have already experienced the homeowners-v2 UI encounter a jarring style break when navigating to Referral Partners. The page also has a monolithic ~810-line component that is difficult to maintain.

## Proposed Solution

Create a `referral-partners-v2/` route directory following the exact design system established by homeowners-v2:

1. **Partner cards** styled identically to `HomeownerCard` (rounded-12, expandable, checkbox selection, status pills, source badges, hover/expanded border effects).
2. **Sticky toolbar** following the `HomeownersToolbar` pattern (sticky top-80px, collapsible filters on mobile, filter count badge, same filter controls).
3. **Expanded report table** using the existing `GeneralTable` wrapper (mantine-react-table) with v2-styled columns: property thumbnail, clickable title, address, status pill, tag badge, copy-link button.
4. **Version switching** via the existing `withUIVersion` HOC on `referral-partners/page.tsx` so users can toggle between v1 and v2.
5. **Modal redesign** for all five modals to match the v2 design language (Tailwind-first, consistent spacing, rounded-12 borders, v2 button styles).

## Scope

### In Scope

- New `referral-partners-v2/_components/` directory with all v2 components
- `ReferralPartnersPage` (main orchestrator, decomposed from the 810-line monolith)
- `PartnerCard` (equivalent of HomeownerCard)
- `PartnerCardList` (equivalent of HomeownerCardList)
- `PartnersToolbar` (equivalent of HomeownersToolbar)
- `ReportColumnsConfig` (v2-styled column definitions for expanded GeneralTable)
- Redesigned modals: `AddPartnerModal`, `InvitePartnerModal`, `UserInfoModal`, `DefaultRealtorModal`, `SelectRealtorModal`
- `withUIVersion` integration in `referral-partners/page.tsx`
- i18n: reuse existing translation keys (no new backend keys)

### Out of Scope

- KPI/aggregate statistics section (pending BE API confirmation)
- Backend API changes (reuse existing `getReferralPartners` with `expand=reports,profile`)
- New API endpoints
- Changes to the v1 code (it remains as the default fallback)
- Unit/integration tests (separate QC pass)

## Success Criteria

1. When UI version is set to "v2", the Referral Partners page renders with the new design matching homeowners-v2 patterns.
2. When UI version is set to "v1" (default), the existing v1 page renders unchanged.
3. All existing functionality is preserved: search, date range filter, source filter, status filter, pagination, expand/collapse partner cards, view reports table, copy report link, open user info modal, add/invite partner, manage default realtor.
4. The main component is decomposed into focused files under 500 lines each.
5. All five modals render with v2 styling (rounded borders, Tailwind classes, consistent spacing).
6. Mobile-responsive: sticky toolbar collapses filters behind a toggle button on small screens.
7. `npm run build` passes with no TypeScript errors.

## Feature Branch

`feature/referral-partners-v2` (to be created from `production` in the lf-iq repo)
