# Design: Export Database V2 Visual Redesign

## V2 Design Language Summary

This redesign adopts the **hybrid v2 base (Option C)** confirmed by the BA: Inter typography, `#fafafa` canvas, Tabler icon set, and the token ramp used by the newest v2 surfaces — referral-partners-v2, bulk-import-homeowner-v2, release-notes-v2 — plus engagement-v2's tabs-with-count pattern.

### Design tokens (CSS vars — lifted verbatim from `mockups/referral-partners-v2/mockup.html` and `mockups/release-notes-v2/mockup.html`)

```css
:root {
  /* Brand / accents */
  --accent: #f36f20;
  --accent-light: #fff4ed;
  --accent-hover: #e05e12;

  /* Surfaces */
  --bg: #fafafa;
  --surface: #ffffff;
  --border: #e5e7eb;
  --border-light: #f0f0f0;

  /* Text */
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;

  /* Semantic — status pills */
  --green: #10b981;  --green-bg: #ecfdf5;  --green-text: #065f46;  --green-border: #a7f3d0;
  --yellow: #f59e0b; --yellow-bg: #fffbeb; --yellow-text: #92400e; --yellow-border: #fde68a;
  --red: #ef4444;    --red-bg: #fef2f2;    --red-text: #991b1b;    --red-border: #fecaca;
  --blue: #3b82f6;   --blue-bg: #eff6ff;   --blue-text: #1e40af;   --blue-border: #bfdbfe;
  --purple: #8b5cf6; --purple-bg: #f5f3ff; --purple-text: #5b21b6; --purple-border: #ddd6fe;
  --orange-bg: #fff7ed; --orange-text: #c2410c; --orange-border: #fed7aa;

  /* Radii */
  --radius-sm: 6px;   /* small pills / badges */
  --radius-md: 8px;   /* inputs / buttons / toolbar */
  --radius-lg: 12px;  /* cards / page header icon */

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);

  /* Motion */
  --transition: 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

Because lf-iq is Tailwind-first (per `feedback_mantine_tailwind_rules`), these CSS vars live in the mockups but in production code they map to Tailwind classes (e.g. `bg-[#fafafa]`, `rounded-[12px]`, `shadow-sm`, etc.), matching how referral-partners-v2 shipped. No `style={{}}` for visual tokens.

### Typography

- **Family**: Inter (already loaded via Next.js font optimization — no extra font work).
- **Scale**:
  - Page title: `text-[24px] font-extrabold tracking-[-0.02em]` (800 weight).
  - Section title: `text-xl font-semibold` (20px / 600).
  - Body: `text-sm` (14px).
  - Meta / micro: `text-xs` (12px), `text-[11px]` for uppercase labels.
- **Uppercase labels**: section dividers use `text-[12px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af]` (matches release-notes-v2 `.section-title`).

### Page header pattern (matches `PrivatePageTourHeader` v2 style)

```
┌──────────────────────────────────────────────┐
│  [orange icon 48x48]  Page Title 24/800      │
│                       Subtitle 14/400 gray   │
└──────────────────────────────────────────────┘
```

- Icon: `48px × 48px`, `rounded-[12px]`, `bg-[#f36f20]`, `shadow: 0 4px 12px rgba(243,111,32,0.3)`, `IconDatabaseExport` (Tabler) `size=22` white.
- Title: `IconDatabaseExport`.
- Keep the existing `PrivatePageTourHeader` shared component (used across all v2 surfaces); no new component needed.

### Toolbar pattern (sticky)

```
┌──────────────────────────────────────────────────────┐
│  [Reset filters]           [search] [refresh] [...] │  (sticky top-0, shadow-sm, rounded-md)
└──────────────────────────────────────────────────────┘
```

- Height `48px`, `bg-white`, `shadow-sm`, `rounded-md`, `sticky top-0 z-30`.
- Inner padding `12px 16px`, `flex flex-wrap items-end gap-2`.
- Left slot (`toolbar-actions`): primary actions, `w-full sm:w-auto flex flex-wrap items-end gap-2`.
- Right slot (`toolbar-filters`): `ml-auto flex flex-wrap items-center justify-end gap-2`.

### Tabs with counts (engagement-v2 pattern)

```
┌─────────────────────────────────────────────────────────────┐
│  Filter & Export   │  Export History ⌊24⌉  │  Do Not Call List ⌊7⌉ │
│  ─────────────────                                          │
└─────────────────────────────────────────────────────────────┘
```

- Container: `border-b-2 border-[#e5e7eb] flex gap-0 mb-6`.
- Tab: `py-[10px] px-[20px] text-[13px] font-semibold text-[#6b7280] cursor-pointer border-b-2 border-transparent -mb-[2px] transition-all`.
- Active: `text-[#f36f20] border-b-[#f36f20]`.
- Count pill: `text-[10px] font-semibold px-[6px] py-[1px] rounded-[10px] bg-[#f1f5f9] text-[#6b7280] ml-[6px]`.
- Active-tab count pill: `bg-[#fff4ed] text-[#f36f20]`.

### Card patterns

- **Filter card** (per section: Location / Mortgage / Advanced): `bg-white border border-[#e5e7eb] rounded-[12px] p-5 shadow-xs`. Section header: orange 32px rounded-xl icon + 20/600 title + optional subtitle.
- **History row / DNC row**: `bg-white border border-[#e5e7eb] rounded-[12px] py-4 px-5 transition-all duration-200 hover:border-[#d1d5db] hover:shadow-sm`. No expand (unlike homeowners-v2).

### Status pill colors (export-history-specific)

Used for the `expires_at` countdown — compute once per render:

```ts
type ExpiryBucket = 'fresh' | 'soon' | 'urgent' | 'expired'

const bucketFor = (expiresAtMs: number | undefined, nowMs = Date.now()): ExpiryBucket => {
  if (!expiresAtMs) return 'expired'       // null/undefined = treat as expired
  const deltaMs = expiresAtMs - nowMs
  if (deltaMs <= 0) return 'expired'
  const dayMs = 24 * 60 * 60 * 1000
  if (deltaMs <= dayMs) return 'urgent'    // ≤24h → red
  if (deltaMs <= 7 * dayMs) return 'soon'  // ≤7d  → amber
  return 'fresh'                            // >7d → green
}
```

Pill classnames:

| Bucket   | Tailwind                                                                      |
|----------|-------------------------------------------------------------------------------|
| fresh    | `bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]`                         |
| soon     | `bg-[#fffbeb] text-[#92400e] border border-[#fde68a]`                         |
| urgent   | `bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]`                         |
| expired  | `bg-white text-[#9ca3af] border border-[#e5e7eb] line-through`                |

Icon: Tabler `IconClock` (fresh/soon), `IconAlertCircle` (urgent), `IconBan` (expired).

Label: rendered via date-fns `formatDistanceToNow(new Date(ms), { addSuffix: true })`, fallback "Expires soon" when delta is positive but `<1m`. For expired rows, label is simply the word "Expired" in the active locale.

### User-count chip

- When `filters?.user_ids?.[0] === '*'` → chip: `All users` (purple — `bg-[#f5f3ff] text-[#5b21b6] border border-[#ddd6fe]`).
- Else → `${n} user` (1) or `${n} users` (>1), using `filters?.user_ids?.length ?? 0` (blue pill — `bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]`).
- Null-safe fallback (both `filters` and `user_ids` missing): "Unknown scope" in neutral gray pill.

### Applied-filter chips

- One chip per non-empty form field after a successful estimate, rendered between the Filter card stack and the Estimate/Download CTA.
- Shape: `inline-flex items-center gap-[6px] py-[4px] pl-[12px] pr-[8px] rounded-full bg-[#fff4ed] text-[#c2410c] border border-[#fed7aa] text-[12px] font-semibold`.
- Close button: `IconX` size=12, button `w-[18px] h-[18px] rounded-full hover:bg-white/60`.
- Removing a chip clears the corresponding field via `setValue(path, null | '')` on the react-hook-form instance **and** clears `estimateData` so the "Download CSV" CTA re-disables (new estimate required).

### Monthly quota meter

- Placement: top-right corner of the Filter card's header row.
- Visual:
  ```
  Monthly usage
  ██████████░░░░░░░░░░░  48 / 200
  ```
- Track: `h-[6px] rounded-full bg-[#f1f5f9] w-[160px]`.
- Fill: same height, `rounded-full`, color by remaining %:
  - `>50%` remaining → `bg-[#10b981]` (green)
  - `10–50%` remaining → `bg-[#f59e0b]` (amber)
  - `<10%` remaining → `bg-[#ef4444]` (red)
- Values come from `estimateData?.remaining_monthly_limit` / `estimateData?.max_export_monthly`; when `estimateData === null`, show skeleton (`bg-[#e5e7eb] animate-pulse`) not the number.
- Null-safe: `(estimateData?.remaining_monthly_limit ?? 0) / (estimateData?.max_export_monthly ?? 1)` (guard div-by-zero).

### Sticky "Download CSV" CTA

- Placement: bottom of the Filter & Export tab, `sticky bottom-0 z-20 bg-gradient-to-t from-[#fafafa] to-transparent pt-6 pb-4` so it floats above scroll content without occluding form validation errors.
- Button: `h-[44px] px-6 rounded-[8px] bg-[#f36f20] hover:bg-[#e05e12] text-white font-semibold text-[14px] inline-flex items-center gap-[8px]` — `IconDownload size=18` + label.
- Label:
  - `estimateData === null` → "Run filter to see estimate" (disabled)
  - `estimateData.can_export === false` → "Cannot export" (disabled, tooltip with reason)
  - `estimateData.can_export === true` → `Download {estimateData.estimated_record_count.toLocaleString()} records`

### Empty / loading / error states

- `EmptyStateV2`: center-aligned, `py-16`, 48px Tabler icon in accent-light circle, 16/600 title, 14/gray subtitle, optional CTA button.
- `ErrorStateV2`: same layout as EmptyStateV2 but `IconAlertTriangle` in red-bg circle; subtitle is the error message; CTA is "Retry".
- Loading: reuse existing `LoaderLFIQ` component (already used across v1/v2).

## Per-tab IA & States

### Filter & Export tab

```
[Toolbar — sticky]
  [Reset filters]                          [   Quota meter      ]

[Location card]                   (form section 1)
  Segmented: State/County/City | ZIP
  Fields: Google Places, State, County, City (or ZIP only)

[Mortgage card]                   (form section 2)
  Interest rate from/to
  Loan amount from/to
  Loan types (multi-select)

[Advanced card — collapsible]     (form section 3)
  Months since mortgage opened from/to
  Loan terms (multi-select)
  Occupancy
  Age group

[Applied chips]                   (rendered after first estimate)
  [ State: CA × ] [ Rate: 5.5–7.0% × ] [ Loan: FHA, VA × ] ...

[Estimate card]                   (rendered when estimateData !== null)
  can_export=true  → green banner + "Max per request: X"
  can_export=false → red banner + error_message

[Sticky Download CTA]
  [ Run filter to see estimate ]  (null)
  [ Download 2,481 records    ]   (can_export=true)
```

States:
- **Initial**: form empty, no estimate, quota meter shows skeleton.
- **Filter clicked (valid)**: spinner on Filter button, quota meter refreshes, estimate card appears.
- **Filter clicked (invalid)**: form validation errors inline (react-hook-form path-based messages), no API call.
- **Download clicked**: CTA spinner, disabled; on success toast "Download successful"; on failure toast error from `extractErrorMessage`.

### Export History tab

```
[Toolbar — sticky]
  [Refresh]                                [ {totalElements} exports ]

[Card list]
  ┌──────────────────────────────────────────────────────────────────┐
  │ [HOMEOWNER pill]  482 records  [All users]  [1 download]         │
  │ Expires in 12 days (green) · Created 2h ago · by user@email      │
  │                            [Load filters]   [Download again]      │
  └──────────────────────────────────────────────────────────────────┘
  ...

[Pagination: < 1 2 3 … 8 > ]                                  (offset)

[Empty state]  "No exports yet — run your first filter"
[Loading]      LoaderLFIQ
[Error]        ErrorStateV2 + retry
```

"Load filters" behavior: switches to Filter & Export tab; since server-persisted filters are slim (just `export_type` + `user_ids`), displays an info banner at the top of the Filter tab: `"This export record only stores the export type. Filter criteria from previous exports are not saved — please configure filters manually."` Banner dismissible; dismissal not persisted.

### Do Not Call List tab (admin-only)

```
[Toolbar — sticky]
  [Phone search (debounced 500ms)]         [ {totalElements} numbers ]

[Card list]
  ┌──────────────────────────────────────────────────────────────────┐
  │ 📵  +1 (555) 123-4567       [ CallOptOut ]                       │
  │     Added 3 days ago · Updated 3 days ago                        │
  └──────────────────────────────────────────────────────────────────┘
  ...

[Load more]   (cursor pagination — append, no page numbers)

[Empty state]  "No phone numbers in Do Not Call list"
[Loading]      LoaderLFIQ
[Error]        ErrorStateV2 + retry
```

Gating: the tab header renders `null` when `!adminOnly` (belt-and-suspenders on top of the page-level gate).

## Interaction Flows

### 1. Download flow

```
User fills form → clicks [Filter]
  ↓
POST /export/estimate
  ↓
estimateData set → chips rendered → CTA enabled (if can_export)
  ↓
User clicks [Download X records]
  ↓
POST /export (Accept: text/csv)
  ↓
Blob → saveAs(`database_export_YYYY-MM-DD.csv`)
  ↓
Toast "Download successful"
  ↓
(Optional) Invalidate history query — refresh history tab count
```

### 2. Re-download flow (history tab)

```
User clicks [Download again] on a row (not expired)
  ↓
GET /export/reexport/{token} (Accept: text/csv)
  ↓
Blob → saveAs(...)
  ↓
Toast + refresh history tab so download_count increments
```

### 3. Expiring-soon awareness

- No active notification; expiry is passive via the countdown pill color.
- On tab mount, scan rows and if any are in the `urgent` bucket (≤24h), show a single banner above the card list: `"{n} export{s} expire in the next 24 hours"` with a subtle amber-to-red gradient.

### 4. Load filters flow

```
User clicks [Load filters] on a history row
  ↓
setActiveTab('filter')
  ↓
Show dismissible info banner at top of Filter tab:
  "This export record only stores the export type. Filter criteria from
   previous exports are not saved — please configure filters manually."
  ↓
(Form is NOT modified — honest behavior; prevents false confidence.)
```

### 5. Chip removal

```
User clicks [×] on an applied-filter chip
  ↓
form.setValue(chip.path, chip.emptyValue)
  ↓
setEstimateData(null)    // estimate is now stale
  ↓
CTA reverts to "Run filter to see estimate" (disabled)
```

## Accessibility

- **Keyboard nav on tabs**: left/right arrows switch tabs, Home/End jump to first/last. `role="tablist"`, each tab `role="tab"` + `aria-selected`, panels `role="tabpanel"` + `aria-labelledby`.
- **Focus rings**: 2px orange outline (`outline-[#f36f20]`) on every focusable element; `focus-visible` only.
- **Icon-only buttons** carry `aria-label` (e.g., chip close, DNC search clear).
- **Color is never the only signal**: the expires pill also carries a text label ("Expires in 12 days") and an icon; users with color-vision deficiencies can distinguish buckets.
- **Reduced motion**: toolbar/chip transitions use `transition-all duration-200`; wrap animations in `motion-safe:` prefix (Tailwind) so users with `prefers-reduced-motion` get instant state changes.
- **Semantic HTML**: `<nav>` for tabs, `<section>` per filter card, `<button>` not `<div onClick>` for all interactive elements.
- **Target sizes**: minimum 44×44px for all interactive controls on touch viewports (tab items, Load-more button, chip close — chip close enlarges hit area beyond its 18px visual with padding).

## Responsive

Breakpoints (Tailwind defaults):
- `<480px` (xs): card rows stack vertically — `export_type pill / record count / user chip / expires pill` each on its own row. Actions wrap to a second row. Filter grid goes to 1 column. Toolbar collapses reset button to icon-only.
- `480–768px` (sm–md): filter grid is 2 columns; card rows are 2-line (row 1 = pills, row 2 = actions).
- `≥768px` (md+): filter grid is 3 columns (as v1); card rows are single-line with right-aligned actions; toolbar is a single row.

## i18n Key Plan

New namespace `ExportDatabaseV2` in `src/messages/{en,vi}.json`. Keys are `snake_case`, namespace is `CamelCase`, matching `feedback_i18n_rules`.

Minimum key set (draft — expanded as tasks land):

```
ExportDatabaseV2.page_title                      → "Export Database"
ExportDatabaseV2.page_subtitle                   → "Filter, export and manage your homeowner data exports."

ExportDatabaseV2.tab_filter_and_export           → "Filter & Export"
ExportDatabaseV2.tab_export_history              → "Export History"
ExportDatabaseV2.tab_do_not_call_list            → "Do Not Call List"

ExportDatabaseV2.quota_label                     → "Monthly usage"
ExportDatabaseV2.quota_value                     → "{used} / {max}"
ExportDatabaseV2.chips_title                     → "Applied filters"
ExportDatabaseV2.download_run_filter_first       → "Run filter to see estimate"
ExportDatabaseV2.download_cannot_export          → "Cannot export"
ExportDatabaseV2.download_count_records          → "Download {count} records"

ExportDatabaseV2.history_record_count_label      → "{count} records"
ExportDatabaseV2.history_user_chip_all           → "All users"
ExportDatabaseV2.history_user_chip_count         → "{count, plural, one {# user} other {# users}}"
ExportDatabaseV2.history_user_chip_unknown       → "Unknown scope"
ExportDatabaseV2.history_expires_relative        → "Expires {relative}"
ExportDatabaseV2.history_expired                 → "Expired"
ExportDatabaseV2.history_downloaded_never        → "Never downloaded"
ExportDatabaseV2.history_downloaded_relative     → "Downloaded {relative}"
ExportDatabaseV2.history_download_count          → "{count, plural, one {# download} other {# downloads}}"
ExportDatabaseV2.history_action_load_filters     → "Load filters"
ExportDatabaseV2.history_action_download_again   → "Download again"
ExportDatabaseV2.history_empty_title             → "No exports yet"
ExportDatabaseV2.history_empty_subtitle          → "Run your first filter to create an export."
ExportDatabaseV2.history_expiring_soon_banner    → "{count, plural, one {# export expires in the next 24 hours} other {# exports expire in the next 24 hours}}"
ExportDatabaseV2.load_filters_banner             → "This export record only stores the export type. Filter criteria from previous exports are not saved — please configure filters manually."

ExportDatabaseV2.dnc_search_placeholder          → "Search phone number"
ExportDatabaseV2.dnc_empty_title                 → "No numbers on the Do Not Call list"
ExportDatabaseV2.dnc_empty_subtitle              → "Homeowners who opt out will appear here."
ExportDatabaseV2.dnc_load_more                   → "Load more"
ExportDatabaseV2.dnc_kind_call_opt_out           → "Call opt-out"

ExportDatabaseV2.error_retry                     → "Retry"
ExportDatabaseV2.error_loading                   → "Something went wrong while loading."
```

Reuse existing keys from `ExportDatabase.*` for filter form labels (Location, Mortgage, Advanced section titles, state/county/city, etc.) — **no duplication**. The new `ExportDatabaseV2` namespace only covers v2-specific UI strings (tabs, chips, quota, history card, DNC card, banners).

Both `en.json` and `vi.json` must land the same key set. Run a script (or manual diff) before merge to confirm key parity.

## Data Contracts (reference)

### Export History (offset pagination)

```ts
interface ExportHistoryRow {
  id: string
  token: string
  record_count: number | null
  export_type: string                    // e.g. "HOMEOWNER"
  filters: {
    export_type?: string
    user_ids?: string[]                  // "*" = all
  } | null
  expires_at: { timestamp: number; formatted: string } | null
  downloaded_at: { timestamp: number; formatted: string } | null
  download_count: number | null
  created_date: { timestamp: number; formatted: string }
  created_by: string
  last_modified_date: { timestamp: number; formatted: string }
  last_modified_by: string
}

interface PageMetaOffset {
  totalElements: number
  pageSize: number
  currentPage: number
  totalPages: number
}

interface ExportHistoryResponse {
  payload: ExportHistoryRow[]
  page: PageMetaOffset
}
```

Fetch signature already exists — `getPropertiesExportHistory(page = 0, size = 20)` in `src/apis/private-api.ts:320`. Add a query-key under React Query: `['export-history', { page, size }]`.

### Do Not Call List (cursor pagination)

```ts
interface DoNotCallRow {
  phone: string         // already formatted
  created: string       // epoch ms as string
  updated: string
  kind: 'CallOptOut' | string
  key: string           // cursor key (opaque)
}

interface PageMetaCursor {
  totalElements: number
  pageSize: number
  currentCursor: string | null
  nextCursor: string | null
  firstPage: boolean
  lastPage: boolean
}

interface DoNotCallResponse {
  payload: DoNotCallRow[]
  page: PageMetaCursor
}
```

Fetch signature already exists — `getDoNotCallList(params)` in `src/apis/private-api.ts:922`. Params: `{ pageSize, search, currentCursor }`. Query key: `['dnc-list', { search }]` + infinite-query pages.

### Estimate & Download

Unchanged from v1:
- `exportEstimate(body)` → `PropertiesEstimate` (`can_export`, `estimated_record_count`, `max_export_per_request`, `remaining_monthly_limit`, `max_export_monthly`, `error_message?`).
- `exportData(body)` → CSV text → `Blob` → `file-saver.saveAs`.
- `exportReexportByToken(token)` → CSV text → `Blob` → `saveAs`.

## Admin Gate Wiring

**Reference**: `src/shared/layout/PrivateLayout/components/PrivateHeader/DesktopHeader/index.tsx:35` — `const adminOnly = useAtomValue(isAdminState)`. Import from `@jotai/atom/authState`.

### Where to guard

1. **Page root** (`src/app/[locale]/(private)/export-database-v2/_components/ExportDatabaseV2/index.tsx`):
   ```tsx
   const adminOnly = useAtomValue(isAdminState)
   if (!adminOnly) return null
   // … rest of component
   ```
   Render-null is preferred over a redirect because the `RouteGuard` wrapper already handles the role-level redirect for non-admin / non-LO users. The atom check is the stricter, render-time gate the user specifically requested.

2. **DNC tab component** (`_components/DoNotCallListTab/index.tsx`): repeat the check at the tab component entry — belt-and-suspenders in case a future refactor exposes the tab elsewhere.

3. **Navigation menu entry** (`src/shared/utils/menuItems.ts` if the item exists there for v2 too): wrap the menu item with the same atom check so non-admins do not see the nav link. If a menu entry for v2 doesn't exist yet, add one conditionally rendered.

### Why atom-based (not just role-string)

- The existing `RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}` is a router-level gate — good for redirects, weaker for per-component rendering decisions (its internals may mount children briefly before redirecting).
- `isAdminState` is a jotai derived atom that reads from `rolesState` and yields a stable boolean, consistent with how `DesktopHeader` gates the v2 UI toggle. Using the same atom ensures a user who is an admin *and* an LO doesn't get treated differently between the header and the page.

## Architecture / File Layout

```
src/app/[locale]/(private)/export-database-v2/
├── layout.tsx                              (AuthProvider + PrivateLayout, same as v1)
├── page.tsx                                (RouteGuard + ExportDatabaseV2)
└── _components/
    ├── ExportDatabaseV2/
    │   ├── index.tsx                       (root shell; admin-gate; tabs-with-count; form provider)
    │   └── useExportForm.ts                (extracted form state + handlers — reuse logic from v1 verbatim)
    ├── FilterAndExportTab/
    │   ├── index.tsx                       (filter cards + chips + estimate + sticky CTA)
    │   ├── AppliedFilterChips.tsx
    │   ├── QuotaMeter.tsx
    │   └── StickyDownloadCTA.tsx
    ├── ExportHistoryTab/
    │   ├── index.tsx                       (card list + offset pagination)
    │   ├── HistoryRow.tsx
    │   ├── ExpiresCountdownPill.tsx
    │   ├── UserScopeChip.tsx
    │   └── useExportHistoryQuery.ts        (React Query hook)
    └── DoNotCallListTab/
        ├── index.tsx                       (card list + cursor pagination; admin-gated)
        ├── DNCRow.tsx
        └── useDncInfiniteQuery.ts          (React Query useInfiniteQuery)

src/shared/components/                      (only add if missing; see Existing-vs-New section)
├── PageHeaderV2/                           (likely already exists as PrivatePageTourHeader — reuse)
├── TabBarWithCounts/
├── StickyToolbarV2/
├── StatusPillV2/
├── EmptyStateV2/
└── ErrorStateV2/
```

### Existing-vs-New primitives

Before scaffolding, the dev must grep for existing v2 primitives:

```bash
grep -r "PrivatePageTourHeader\|TabBarWithCounts\|StatusPillV2\|EmptyStateV2" src/shared/components
```

- `PrivatePageTourHeader` — **reuse** (already used in v1 export-database and all v2 surfaces).
- `LoaderLFIQ` — **reuse**.
- `TabBarWithCounts`, `StickyToolbarV2`, `StatusPillV2`, `EmptyStateV2`, `ErrorStateV2` — if not present, create as small focused components (≤200 lines each), colocated under `src/shared/components/` so other v2 tabs can adopt them.

## Architecture Decisions (ADR-style)

### ADR-1 — Separate route (`/export-database-v2`), not a version switcher on `/export-database`

**Context**: v2 needs to ship and be testable without destabilizing the working v1.

**Decision**: Ship v2 at a fresh route `/export-database-v2`. Do not wrap `/export-database/page.tsx` with `withUIVersion`.

**Alternatives**:
- (a) `withUIVersion` HOC on v1 page → lower discoverability, couples v1 maintenance to v2 shipping.
- (b) Delete v1 → too destructive; no fallback during stabilization.

**Rationale**: This matches how referral-partners-v2 and release-notes-v2 were shipped. Once v2 is validated in production, a follow-up change adds the switcher.

### ADR-2 — Jotai atom gate on top of existing `RouteGuard`

**Context**: User explicitly requested `useAtomValue(isAdminState)` gating, consistent with `DesktopHeader`.

**Decision**: Keep `RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}` at the route boundary (matches v1); add an additional `useAtomValue(isAdminState)` gate inside the root component and the DNC tab.

**Alternatives**:
- (a) Replace `RouteGuard` with atom-only gate → loses router-level redirect for LO users.
- (b) Atom-only gate, remove role guard → DNC tab would be the only admin-only piece; inconsistent with rest of page.

**Rationale**: Two-layer defense — the role guard handles routing (redirects), the atom handles rendering (returns `null`). The user asked specifically for the atom gate; we also keep the existing guard so behavior for LO users who navigate directly to the URL remains as-is (they get the existing RouteGuard redirect). The atom gate simply ensures the v2 surface never flashes during guard evaluation.

### ADR-3 — Honest "Load filters" behavior given the slim persisted filters

**Context**: The export history API persists only `export_type` + `user_ids` in `filters`. V1 UI pretends to restore a full filter set by reading from a body that doesn't come from the server.

**Decision**: "Load filters" switches to the Filter tab and shows a dismissible info banner explaining the server doesn't persist full filter criteria. The form is NOT mutated.

**Alternatives**:
- (a) Keep v1's behavior (restore from localStorage or last-submitted body) → reintroduces phantom behavior; a user on a second device gets no restoration; violates source-of-truth.
- (b) Backend change to persist full filter JSON → out of scope.

**Rationale**: YAGNI + honesty. The banner sets correct expectations; if the user wants full filter persistence, that's a follow-up proposal with backend work.

### ADR-4 — Cursor vs offset pagination — two different models in one page

**Context**: History is offset-paginated (`currentPage`, `totalPages`), DNC is cursor-paginated (`currentCursor`, `nextCursor`).

**Decision**: Build two separate hooks (`useExportHistoryQuery` with page state + `useDncInfiniteQuery` with cursor state). Do not attempt a unified abstraction.

**Alternatives**:
- (a) Unified pagination abstraction → leaky abstraction; the two shapes disagree on `page`, `totalPages` vs `lastPage`, and UI (page numbers vs load-more).
- (b) Force DNC into offset pagination client-side → breaks when page sizes diverge; server is the source of truth.

**Rationale**: Two simple hooks > one complicated one. UI components are the same shape (`LoaderLFIQ`, card row, empty state); only the "next page" mechanism differs.

### ADR-5 — React Query for server state (introduces it to this page if absent)

**Context**: V1 uses `useState` + manual `useEffect` for history fetching. lf-iq already has `@tanstack/react-query` (5.90) installed and used on other surfaces.

**Decision**: Use React Query for both history (`useQuery`) and DNC (`useInfiniteQuery`). Keeps cache coherent, makes "refresh after download" a single `invalidateQueries` call, and gets loading/error states for free.

**Rationale**: Aligns with `feedback_patterns.md` — server state goes in React Query, not client state. No net-new dependency.

## Testing Strategy

### Unit tests (Jest + @testing-library/react — already in lf-iq)

- `ExpiresCountdownPill.test.tsx` — 4 cases (fresh/soon/urgent/expired) + null-input case. Mock `Date.now()`.
- `UserScopeChip.test.tsx` — 4 cases: `['*']`, `['id1']`, `['id1','id2']`, `undefined`.
- `ExportDatabaseV2.admin-gate.test.tsx` — renders nothing when `isAdminState` is false; renders when true. Mock jotai with `@jotai/testing` or test-Provider hydration.
- `QuotaMeter.test.tsx` — color-stop branches at 55%, 30%, 5% remaining + skeleton when `estimateData === null`.
- `AppliedFilterChips.test.tsx` — renders one chip per non-empty field; clicking `×` calls `setValue` and clears `estimateData`.
- `useExportHistoryQuery.test.ts` — pagination state transitions (next/prev page).
- `useDncInfiniteQuery.test.ts` — `fetchNextPage` appends rows; `lastPage === true` disables "Load more".
- `FilterAndExportTab.load-filters-banner.test.tsx` — banner renders after `loadFiltersFromHistory`; dismiss button hides it.

Coverage target: ≥80% for each file touched (global rule from `common/testing.md`).

### Manual QA checklist (per tester.md / QA agent)

- Build passes: `npm run build`.
- Non-admin account visits `/export-database-v2` → sees `null` (blank) or route guard redirect.
- Admin account visits → sees 3 tabs with counts.
- Expires pill renders correct color at each boundary (test with clock-skewed fixture data).
- `filters.user_ids === ['*']` row shows "All users" chip.
- Cursor pagination on DNC: click "Load more" N times, rows append, no duplicates.
- `Load filters` banner appears on Filter tab and is dismissible.
- i18n: toggle to vi locale, every visible string renders (no raw key strings).
- Responsive: 320, 480, 768, 1024, 1440 — no horizontal overflow.
- A11y: tab through every interactive control; focus rings visible; VoiceOver/NVDA reads tab names + counts.

## Rollout Plan

1. **Phase 1 — Mockups (BLOCKING GATE)**: Build 2–3 mockup variants under `lf-iq/mockups/export-database-v2/`. User picks one. Chosen variant stamped in `proposal.md`.
2. **Phase 2 — Implementation**: Tech Lead dispatches tasks per `tasks.md`. One agent can own each tab in parallel since the root shell is built first.
3. **Phase 3 — Release**: Merge into `feature/export-database-v2` → PR to `master` (lf-iq default merge target). No switcher on `/export-database` yet; `/export-database-v2` is the access route.
4. **Phase 4 — Follow-up (out of scope here)**: Add `withUIVersion` switcher on `/export-database` once usage validates v2.

## Out-of-Scope Confirmations

- Saved filter presets (requires backend work).
- Preview-before-export (product has not committed to the endpoint).
- Top-level KPI dashboard (mockup design-c explores the idea but it is a stretch visual only).
- Unifying offset + cursor pagination into a shared abstraction (see ADR-4).
- Migrating v1 users automatically (separate change).
