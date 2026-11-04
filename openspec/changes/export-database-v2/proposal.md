# Proposal: Export Database V2 Visual Redesign

## Problem Statement

The current `/export-database` page in lf-iq is a 3-tab workspace (Filter & Export / Export History / Do Not Call List) built on v1 Mantine primitives (`Card`, `Stack`, `Grid`, `Tabs`, `SegmentedControl`, `Badge`) with inline styles and an orange-50 instruction banner. Users who have already experienced the newer v2 surfaces — homeowners-v2, referral-partners-v2, bulk-import-homeowner-v2, release-notes-v2, engagement-v2 — encounter a jarring style break when navigating here. The page also has known UX gaps that the redesign must address:

- **No expiry awareness** — `expires_at` is returned by the export history API but the UI currently hides the column entirely. Users have no idea when a re-download link will stop working.
- **No summary of applied filters** — after running an estimate, the user cannot see at a glance what filter set the CSV will contain; they have to scroll the long form.
- **Weak history card** — history rows cram 6 columns into a `mantine-react-table` with low visual hierarchy and small action buttons.
- **Inconsistent DNC tab** — the DNC list uses a raw `Mantine.Table` with a different heading style, breaking the design system.
- **No admin gating on the page shell** — the page is protected by `RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}`, but there is no jotai-atom-based gate consistent with how the v2 header toggle is gated (`useAtomValue(isAdminState)`).

Additionally, we have now confirmed against the live API responses that the **persisted `filters` object on an export history record is slim**: it contains only `export_type` and `user_ids: string[]` (with `"*"` meaning "all users"). The rich `location`/`mortgage`/`advanced` filter set the v1 history tab currently renders does **not** come back from the server. This changes the scope: the Export History tab should render what the backend actually returns, not what the form collects.

## Proposed Solution

Create an `export-database-v2/` route directory at `src/app/[locale]/(private)/export-database-v2/` that mirrors the existing 3-tab flow but rebuilds the UI on the v2 visual system (Inter typography, `#fafafa` canvas, `#f36f20` accent, Tabler icons, 12/8/6px radii, v2 shadow ramp, PrivatePageTourHeader pattern, sticky toolbar pattern, tabs-with-count, status pills).

**The scope is Option B (Mirror + small UX wins), lightly enriched — confirmed by the BA.** Everything below is chosen against what the API actually returns.

### 1. Gating (NEW — required)

- **Admin-atom gate**: the entire page (or at minimum the navigation entry + tab shell) renders only when `useAtomValue(isAdminState) === true`. Import pattern is identical to `src/shared/layout/PrivateLayout/components/PrivateHeader/DesktopHeader/index.tsx:35`:
  ```ts
  import { isAdminState } from '@jotai/atom/authState'
  const adminOnly = useAtomValue(isAdminState)
  if (!adminOnly) return null
  ```
- **Role guard**: keep the existing `RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}` wrapper at the route boundary (unchanged from v1). The admin-atom gate sits *inside* the route guard as an additional layer so that even if a LOAN_OFFICER reaches the URL directly, the v2 shell will not render for them. If product later decides that non-admin LOs should also see the v2, the single atom check is the only place to flip.

### 2. Filter & Export tab

Keep the existing filter controls verbatim (they build the CSV request body; even if the server persists only a summary, the UI still drives the export criteria). Add:

- **Sticky v2 toolbar** at the top of the tab (matches referral-partners-v2 `PartnersToolbar`): search/refresh slot on the right, reset-filters on the left.
- **Applied-filter chips summary** rendered after "Filter" is clicked: one chip per non-empty filter (`State: CA`, `Loan Types: FHA, VA`, `Rate: 5.5%–7.0%`, etc.), with an X to clear each one inline.
- **Monthly quota meter** at the top-right of the filter card: a progress bar showing `remaining_monthly_limit / max_export_monthly` with green/amber/red color stops (>50%, 10–50%, <10%).
- **Sticky "Download CSV" CTA** at the bottom-right: shows the live estimate count when an estimate exists (`Download 2,481 records`) and is disabled until `estimateData.can_export === true`.
- **Explicit empty / loading / error states** for the estimate card (v2 EmptyStateV2, LoaderLFIQ, v2 ErrorStateV2).

### 3. Export History tab

Replace the mantine-react-table with a v2 card list (same structural rhythm as referral-partners-v2 `PartnerCardList`). Each row renders:

- **`export_type` pill** (e.g. "HOMEOWNER") using v2 status-pill component.
- **User-count chip**: "All users" when `filters?.user_ids?.[0] === '*'`, otherwise `${users.length} users`. Null-safe fallback: `filters?.user_ids?.length ?? 0`.
- **`record_count` chip** (null-safe: `record_count ?? 0`).
- **`downloaded_at` relative time** ("2 hours ago" via date-fns `formatDistanceToNow`), or "Never downloaded" when `downloaded_at` is null.
- **`download_count` badge** (null-safe: `download_count ?? 0`).
- **`expires_at` countdown with urgency color**:
  - green pill (`>7d left`) — "Expires in 12 days"
  - amber pill (`≤7d left`) — "Expires in 3 days"
  - red pill (`≤24h left`) — "Expires in 4 hours"
  - gray outlined pill (expired) — "Expired"
- **Primary actions** per row:
  - "Download again" — calls `exportReexportByToken(token)`, disabled when expired.
  - "Load filters" — reloads `filters` back into the Filter & Export tab (honest behavior: we only have `export_type` + `user_ids`, so document this limitation clearly).
- **Pagination**: offset-based — `page: { totalElements, pageSize, currentPage, totalPages }` with v2 page selector.

### 4. Do Not Call List tab

Admin-only render (the `isAdminState` gate already covers this, but the tab also checks `adminOnly` before mounting).

- **Phone search** input (debounced 500ms, matches DNC v1 behavior).
- **Cursor-paginated list** — `page: { currentCursor, nextCursor, firstPage, lastPage }`. "Load more" button appends results. No page numbers.
- **Row rendering**: phone | created (relative time) | updated (relative time) | kind badge. Card-list row structure matches referral-partners-v2.
- **Empty / loading / error states**: same v2 primitives as history tab.

### 5. Tabs with counts

Tab labels show live counts (engagement-v2 pattern):

- `Filter & Export`
- `Export History <count>` — `totalElements` from history endpoint.
- `Do Not Call List <count>` — `totalElements` from DNC endpoint, admin-only.

### 6. Design system base

**Hybrid C confirmed by BA**: Inter typography / `#fafafa` background / Tabler color token set from the newest v2 mockups (referral-partners-v2, bulk-import-homeowner-v2, release-notes-v2) as the visual base, plus engagement-v2's tabs-with-count pattern.

## Source of Truth: API Shapes

**Export History** (`GET /loan-factory-iq/export/history?page=&size=` — offset pagination):
```jsonc
{
  "payload": [
    {
      "id": "…",
      "token": "…",                      // used for /export/reexport/{token}
      "record_count": 482,                // number — chip
      "export_type": "HOMEOWNER",         // string — pill
      "filters": {
        "export_type": "HOMEOWNER",
        "user_ids": ["*"]                 // "*" = all users; else array of user ids
      },
      "expires_at": { "timestamp": 0, "formatted": "…" },  // for countdown
      "downloaded_at": { "timestamp": 0, "formatted": "…" } | null,
      "download_count": 0,
      "created_date": { "timestamp": 0, "formatted": "…" },
      "created_by": "…",
      "last_modified_date": { "timestamp": 0, "formatted": "…" },
      "last_modified_by": "…"
    }
  ],
  "page": { "totalElements": 0, "pageSize": 20, "currentPage": 0, "totalPages": 0 }
}
```

**Important**: `filters` is slim — export_type + user_ids only. "Load filters" on a history row cannot re-populate location/mortgage/advanced filters because the server does not persist them. The redesign treats this honestly: "Load filters" switches to the Filter tab and surfaces a banner — `"This export used filters that are no longer stored on the server. Start a new filter configuration."` — rather than pretending to restore a filter set.

**Do Not Call List** (`GET /loan-factory/do-not-call?pageSize=&currentCursor=&search=` — cursor pagination):
```jsonc
{
  "payload": [
    { "phone": "+1…", "created": "1712…", "updated": "1712…", "kind": "CallOptOut", "key": "…" }
  ],
  "page": {
    "totalElements": 0,
    "pageSize": 10,
    "currentCursor": "…",
    "nextCursor": "…",
    "firstPage": true,
    "lastPage": false
  }
}
```

Cursor-based; use "Load more" (no page numbers).

## Scope

### In Scope

- New route folder `src/app/[locale]/(private)/export-database-v2/` with `page.tsx` + `layout.tsx`
- New `_components/` folder with: `ExportDatabaseV2` (root shell + tabs), `FilterAndExportTab`, `ExportHistoryTab`, `DoNotCallListTab`, `AppliedFilterChips`, `QuotaMeter`, `ExpiresCountdownPill`
- New v2 shared primitives (only if they don't already exist under `src/shared/components/`): `PageHeaderV2`, `TabBarWithCounts`, `StickyToolbarV2`, `StatusPillV2`, `EmptyStateV2`, `ErrorStateV2`
- Admin-atom gating (`useAtomValue(isAdminState)`) at the page root + wrapping the DNC tab
- Pagination wiring for both tabs (offset for history, cursor for DNC)
- `expires_at` countdown logic + color stops (green / amber / red / gray)
- Applied-filter chips summary + remove-chip behavior
- Monthly quota meter
- Sticky download CTA with live record count + disabled-when-not-allowed state
- Reuse existing API functions: `exportData`, `exportEstimate`, `exportReexportByToken`, `getPropertiesExportHistory`, `getDoNotCallList` — no new backend work
- i18n keys under new namespace `ExportDatabaseV2` in en.json + vi.json
- Responsive behavior: ≤768px collapses filter-grid columns; ≤480px stacks card rows
- Accessibility: keyboard nav on tabs, aria-labels on icon-only buttons, focus rings, reduced-motion friendly
- Unit tests (Jest) for: expires-pill color-stop branches, all-users chip branch, admin-gate branch, load-filters banner branch
- HTML mockup set (3 variants) for user approval before Phase 2 implementation

### Out of Scope

- Backend changes (the current APIs are sufficient; `filters` remaining slim is accepted as-is)
- Saved filter presets persisted to the server (would require backend work — design-b mockup explores the UX but implementation is out of scope)
- Preview-before-export (design-b mockup explores it, not in Phase 2 scope)
- New top-level KPI dashboard (design-c explores the idea as a stretch mockup only)
- Migration of v1 → v2 (the v1 page keeps working; v2 lives at a separate route. Version switcher on `/export-database` is NOT part of this change — see "Open Question" below)
- Re-implementing the filter form with a different state library; keep react-hook-form + joi.

### Open Question (for Tech Lead)

- Should `/export-database` gain a `withUIVersion` HOC to route admins to v2 automatically? **BA recommendation**: no — ship v2 at `/export-database-v2` first, let admins try it, then move the switcher in a follow-up change once usage validates the design. This matches how referral-partners-v2 and release-notes-v2 were shipped.

## Feature Branch

Branch to be created by DevOps **from `production`** (not `master`, per lf-iq convention):

```
feature/export-database-v2
```

All Phase 1 mockup tasks and Phase 2 implementation task branches merge into this feature branch. The feature branch ultimately opens a PR against `master` (standard lf-iq merge target).

## Success Criteria

1. `/export-database-v2` renders only when `useAtomValue(isAdminState) === true`; non-admins see nothing (null) or get redirected.
2. All 3 tabs shipped with v2 visual system + tabs-with-count pattern.
3. Export History shows expires countdown in the correct color bucket for four input cases (>7d, ≤7d, ≤24h, expired).
4. User-count chip shows "All users" when `filters.user_ids[0] === '*'`.
5. DNC tab paginates via cursor; "Load more" appends; no page numbers shown.
6. Applied-filter chips reflect the estimate's filter set; clearing a chip updates the form and invalidates the estimate.
7. Null-safe throughout: no crash when `record_count`, `download_count`, `downloaded_at`, `user_ids`, `filters` are null/undefined.
8. i18n complete: every visible string uses `useTranslations()`; keys live in `ExportDatabaseV2` namespace; en + vi updated.
9. Phase 1 gate met: 3 mockup HTML files + README exist in `lf-iq/mockups/export-database-v2/`, user has picked one variant, chosen variant is stamped in this proposal (append a "## Chosen Variant" section below) before Phase 2 begins.
10. Build passes (`npm run build`), no new type errors, no `console.log`, no ESLint errors, no file > 500 lines (lf-iq ESLint `max-lines: 500` rule).

## Chosen Variant

```
Variant: A (baseline)
Approved by: bao.trinh@loanfactory.com
Date: 2026-04-18
Reference file: file:///Users/apple/Projects/agentflow/lf-iq-worktrees/lqf.1-design-a/mockups/export-database-v2/design-a.html
```

### User-requested tweaks on top of variant A

1. **Multi-select metrics and selects.** Several filter controls that currently render as single-select must support multi-select in the v2 implementation. Audit list (Phase 2 task 2.5 must enumerate + implement these):
   - **Loan types** (Mortgage card) — already multi-select; keep multi.
   - **Loan terms** (Advanced card) — upgrade to multi-select chip group.
   - **Occupancy** (Advanced card) — upgrade to multi-select chip group.
   - **Age group** (Advanced card) — upgrade to multi-select chip group.
   - **Months since mortgage opened** (Advanced card) — keep numeric range.
   - **State / County / City** (Location card) — upgrade to multi-select with chip tokens.
   - **Export type** (History tab filter, if added) — multi-select.
   - **Kind** (DNC sidebar filter) — multi-select chip group.
   - Each multi-select must: render selected values as removable chips, emit `string[]` to form state, support "Select all" / "Clear all" shortcuts, be keyboard-accessible, and feed into estimate invalidation.
2. Otherwise, visual + interaction spec of `design-a.html` is authoritative.
3. Implementing agents must cite the mockup line range in their commit messages when diverging.
