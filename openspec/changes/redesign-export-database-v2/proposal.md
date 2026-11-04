# Proposal: Redesign Export Database v2 (UI-only)

## Why

The current `/export-database` page in `lf-iq` works functionally but its layout and visual polish lag behind the approved v2 mockup. Key gaps:

- Filter cards, toolbar and CTA row are stacked vertically on desktop — wastes screen real estate; the mockup uses a 2-column layout (filters left, estimate + actions pinned right).
- No sticky toolbar; user must scroll back up to change tabs or hit "Reset".
- Applied filters are not surfaced as removable chips — users cannot see at a glance which filters are active, and cannot clear a single filter without opening the corresponding card.
- Estimate card and download button float loosely at the bottom; the mockup pins them as a sticky right-rail on desktop and as a bottom CTA on mobile.
- History and Do-Not-Call tabs use prev/next pagination and a minimal toolbar; mockup specifies numbered pagination and a richer toolbar with search + total count.
- No indication that a previously-calculated estimate is stale after a filter is removed via chip X — user can hit Download with an outdated count.

The backend APIs, data model, and validation semantics are already correct and do **not** need changes. This change refreshes the UI only, matching the approved v2 mockup, and addresses the usability gaps above.

## What Changes

1. **Two-column responsive layout** — mobile/tablet stay single-column; at `md:` (768px) and up, Filter tab renders as 2 columns: filters on the left, estimate card + download CTA as a sticky right sidebar.
2. **Sticky toolbar** — a white card beneath the page header that holds tabs (left) + contextual actions like Reset (right). Sticky on scroll.
3. **Applied-filter chips** — a chip row between toolbar and filter cards shows each active filter with an X. Removing a chip clears that filter, and marks the estimate card as "stale — click Filter to update".
4. **Filter button with validation + loading** — the primary CTA on the Filter tab is a "Filter" button (always enabled) that runs the v1 Joi validation schema. Invalid → shows errors inline. Valid → calls `exportEstimate` with loading state; on success, auto-scrolls to the estimate card on mobile.
5. **Restyled filter cards** — Location, Mortgage, Advanced cards updated to mockup visuals: tinted headers, consistent spacing, icon treatment.
6. **Estimate card with "Est. delivery time"** — green/red tinted card; adds a delivery-time row alongside record count, max/request, and remaining monthly limit.
7. **Sticky download CTA** — Reset + Download CSV pinned to the bottom of the right-column (desktop) or bottom of page (mobile).
8. **History tab upgrades** — richer toolbar (refresh + total count), numbered pagination (replaces prev/next), restyled history row cards with pill clusters.
9. **Do-Not-Call tab upgrades** — search + total count header, hide the MultiSelect when ≤1 option, drop "showing X of Y" text, restyled row cards with pills, dashed-border "Load more" button with hover state.
10. **i18n keys** — add new keys under `ExportDatabaseV2.*` namespace to all 7 locale files (`ar, en, es, he, ko, vi, zh`).

## Scope

**In scope:**
- UI-only changes inside `lf-iq/src/app/[locale]/(private)/export-database/`
- New components under a new folder `_components/ExportDatabaseV2/` (so v1 remains intact during rollout)
- i18n additions to `lf-iq/src/messages/*.json`
- One new hook for mobile auto-scroll

**Out of scope:**
- No changes to backend APIs (`exportEstimate`, `exportData`, `getPropertiesExportHistory`, Do-Not-Call endpoints)
- No changes to request/response DTOs or `PropertiesEstimate` / `PropertiesExportHistory` types
- No routing changes (same URL `/export-database`)
- No new validation rules — reuse exact Joi schema from v1
- No new field types; reuse existing `@fields/*` wrappers
- No authentication/permission changes

## Success Criteria

- Visual parity with approved v2 mockup at mobile (375px), tablet (768px), desktop (1280px+) breakpoints.
- Filter button correctly shows Joi validation errors inline when required fields are missing, and shows a loading spinner during the estimate call.
- Removing a chip clears the underlying form field and flips the estimate card into a "stale" visual state; Download CSV button disables while stale.
- On mobile only, the page auto-scrolls to the estimate card after a successful estimate.
- All 7 locales (`ar, en, es, he, ko, vi, zh`) have complete `ExportDatabaseV2.*` translations — no missing-key warnings in console.
- Existing APIs unchanged; network calls in DevTools match v1 request/response shapes.
- `npm run build` passes; ESLint clean; no TypeScript errors.

## Feature Branch

`feature/redesign-export-database-v2` (to be created by DevOps from base branch `production` per lf-iq convention)
