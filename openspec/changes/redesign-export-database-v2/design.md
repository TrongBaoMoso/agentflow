# Design: Redesign Export Database v2 (UI-only)

## References

- **Canonical mockup**: `/Users/apple/Projects/agentflow/lf-iq/mockups/export-database-v2/design-final.html`
  - This file is the single source of truth for all visual decisions (layout, spacing, colors, typography, chip treatment, estimate card variants, sticky CTAs, history/DNC rows). If `design-a.html` (earlier exploration) contradicts `design-final.html` for any section, **`design-final.html` wins**.
  - Section anchors referenced in this doc map to regions in `design-final.html`: `#header`, `#toolbar`, `#chips`, `#filter-cards`, `#filter-action-row`, `#estimate-card`, `#sticky-cta`, `#history`, `#dnc`.
- **v1 reference file**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(private)/export-database/_components/ExportDatabase/index.tsx`
  - Source of Joi validation schema (lines 84–123)
  - Source of API hooks/usage (lines 36, 349–394, 496–507)
  - Source of form structure (FormValues interface, lines 47–79)
  - Source of history loader logic (lines 510–586)

## APIs and Data (unchanged)

Use the exact same API functions from `@apis/private-api`:

```ts
import { exportData, exportEstimate, getPropertiesExportHistory } from '@apis/private-api'
```

- `exportEstimate(body)` → returns `ApiBaseResponse<PropertiesEstimate>` with `.payload` containing `can_export`, `estimated_record_count`, `max_export_per_request`, `remaining_monthly_limit`, `max_export_monthly`, `error_message`.
- `exportData(body)` → returns raw CSV string; saved via `file-saver`.
- `getPropertiesExportHistory()` → returns `ApiBaseResponse<PropertiesExportHistory[]>`.
- DNC endpoints stay in the existing `DoNotCallList` component; v2 only restyles it.

Types come from `@shared/types/properties-export-types` — no changes.

Request body shape stays identical: built by `buildRequestBody(formValues)` with `export_type: 'PROPERTY'`. Copy this function verbatim into v2.

## Validation Schema (reused)

Copy the Joi schema from v1 (lines 84–123) into `_components/ExportDatabaseV2/schema.ts`:

```ts
// schema.ts
import { array, number, object, string } from '@utils/joiShorthandTypes'

export const filterSchema = object.keys({
  location: object.keys({
    zip_code: string.allow(null).allow('').label('ZIP Code'),
    state: string.allow(null).allow('').label('State'),
    county: string.allow(null).allow('').label('County'),
    city: string.allow(null).allow('').label('City'),
    address_search: string.allow(null).allow('').label('Address Search')
  }),
  mortgage: object.keys({
    interest_rate: object.keys({
      from: number.required().label('Interest Rate From'),
      to: number.required().label('Interest Rate To')
    }),
    loan_amount: object.keys({
      from: number.required().label('Loan amount From'),
      to: number.required().label('Loan amount To')
    }),
    loan_types: array.items(string).required().label('Loan Types')
  }),
  advanced: object.keys({ /* same as v1 lines 104–122 */ }).allow(null)
})
```

Plus the manual location-tab-aware validation block from v1 (lines 397–476) — reused verbatim, wrapped in a helper `validateLocationAndMortgage(formValues, locationTab, form, t)`.

## Component Breakdown

All new components live under:

```
lf-iq/src/app/[locale]/(private)/export-database/_components/ExportDatabaseV2/
```

| # | File | Purpose |
|---|------|---------|
| 1 | `index.tsx` | Container: FormProvider, state (loading/estimateData/activeTab/locationTab/showAdvanced/historyData/isStale), orchestrates submit/download/reset/chip-remove. Renders `<PageHeader />` + `<Toolbar />` + `<TabsPanel />`. |
| 2 | `PageHeader.tsx` | Title + subtitle + instructional orange alert card. Wraps v1's `PrivatePageTourHeader` untouched. Adds mockup spacing (`mb-8`, `max-w-7xl mx-auto`). |
| 3 | `Toolbar.tsx` | White card, rounded, shadow-sm. `sticky top-0 z-10`. Contains Mantine `<Tabs.List>` (left slot) and an action slot (right). On Filter tab the right slot shows `Reset`. |
| 4 | `AppliedChips.tsx` | Row of Mantine `<Chip>` / custom pill components, one per active filter. Each has an X button. Props: `filters`, `onRemove(filterKey)`. |
| 5 | `FilterCards/LocationCard.tsx` | Restyled location section (SegmentedControl + GGMapInput + state/county/city OR zip). Same fields/logic as v1 lines 637–725. |
| 6 | `FilterCards/MortgageCard.tsx` | Restyled mortgage section. Same fields/logic as v1 lines 728–821. |
| 7 | `FilterCards/AdvancedCard.tsx` | Collapsible advanced section. Same fields/logic as v1 lines 824–937. |
| 8 | `FilterActionRow.tsx` | Bottom-of-left-column row with a single "Filter" button. Props: `loading`, `onClick`. Always enabled. |
| 9 | `EstimateCard.tsx` | Right-column sticky card. Renders record count, max/request, remaining monthly, **Est. delivery time** (new row), error alert. Visual variant: `allowed | not-allowed | stale`. Props: `data`, `isStale`. |
| 10 | `StickyDownloadCTA.tsx` | Sticky Reset + Download CSV buttons at bottom of right column (desktop) or bottom of page (mobile). Disabled when `!canExport` OR `isStale`. |
| 11 | `FilterTabLayout.tsx` | Responsive grid wrapper: 1-col on `<md`, `grid-cols-[1fr_360px] gap-6` on `md:+`. Renders filter cards on left, `<EstimateCard>` + `<StickyDownloadCTA>` on right rail. |
| 12 | `HistoryPanel.tsx` | Replaces v1's `<ExportHistory>` wrapper on the history tab. Uses `HistoryToolbar`, `HistoryRow`, `NumberedPagination`. |
| 13 | `HistoryToolbar.tsx` | Sticky toolbar with Refresh button (left) + total count pill (right). |
| 14 | `HistoryRow.tsx` | Card row with filter pill cluster, date, count, download link. |
| 15 | `NumberedPagination.tsx` | Numbered page buttons (1, 2, 3, …, N) with prev/next arrows. Client-side pagination over `historyData`. Page size: 10. |
| 16 | `DNCPanel.tsx` | Replaces v1's DoNotCallList wrapper. Uses `DNCToolbar`, `DNCRow`, `DNCLoadMoreButton`. Keeps existing DNC data-fetching logic from v1 `DoNotCallList`. |
| 17 | `DNCToolbar.tsx` | Search input + total count pill. MultiSelect hidden if options list length ≤ 1. |
| 18 | `DNCRow.tsx` | Card row with status pills (mockup style). |
| 19 | `DNCLoadMoreButton.tsx` | Full-width button with dashed border; `hover:` solid border. |
| 20 | `HistoryLoadedBanner.tsx` | Yellow banner shown above filter cards when filters were loaded from history (`"Loaded from history"`). Dismissible. |
| 21 | `schema.ts` | Joi filter schema (see above). |
| 22 | `buildRequestBody.ts` | Request body builder copied from v1 lines 263–347. |
| 23 | `chipHelpers.ts` | Pure helper: `formValuesToChips(values, locationTab, t) → Chip[]` and `removeFilterFromValues(values, chipKey)`. |
| 24 | `useAutoScrollOnMobile.ts` | New hook under `src/hooks/useAutoScrollOnMobile.ts`. Takes a ref and a trigger; scrolls into view only when viewport width < 768px. |

Existing v1 file stays untouched in this change; `page.tsx` will conditionally render v2 (see Rollout).

## Data Flow

```
page.tsx
  └── ExportDatabaseV2 (index.tsx)
      ├── useForm<FormValues>({ resolver: joiResolver(filterSchema) })
      ├── state: { activeTab, locationTab, showAdvanced, loading, estimateData, historyData, isStale, wasLoadedFromHistory }
      │
      ├── <PageHeader />
      ├── <Toolbar activeTab onChange={setActiveTab} onReset={handleResetFilters} />
      │
      ├── Filter tab:
      │   <FilterTabLayout>
      │     LEFT COLUMN
      │     ├── <HistoryLoadedBanner show={wasLoadedFromHistory} />
      │     ├── <AppliedChips filters={formValuesToChips(values, ..)} onRemove={handleRemoveChip} />
      │     ├── <LocationCard />
      │     ├── <MortgageCard />
      │     ├── <AdvancedCard />
      │     └── <FilterActionRow loading={loading.estimate} onClick={onSubmitFilter} />
      │     RIGHT COLUMN
      │     ├── <EstimateCard data={estimateData} isStale={isStale} ref={estimateRef} />
      │     └── <StickyDownloadCTA
      │           canExport={estimateData?.can_export && !isStale}
      │           loading={loading.download}
      │           onDownload={onDownload}
      │           onReset={handleResetFilters}
      │         />
      │
      ├── History tab:
      │   <HistoryPanel data={historyData} onRefresh={fetchHistory} onLoadFilters={loadFiltersFromHistory} />
      │
      └── DNC tab:
          <DNCPanel />
```

**API calls** (unchanged from v1):

- `onSubmitFilter` → `validateLocationAndMortgage` → if valid: `setLoading(estimate:true)` → `exportEstimate(buildRequestBody(values))` → `setEstimateData`, `setIsStale(false)` → on success + mobile: `useAutoScrollOnMobile(estimateRef, estimateData)`.
- `onDownload` → `exportData(buildRequestBody(values))` → `saveAs(blob, filename)`.
- `fetchHistory` → `getPropertiesExportHistory()` on history tab activation.
- `loadFiltersFromHistory` → identical to v1 lines 510–586 (setValue each field, setLocationTab, setShowAdvanced, setActiveTab('filter'), set `wasLoadedFromHistory = true`).

## Breakpoint Map

Tailwind `md:` prefix = 768px. Layout rules:

| Breakpoint | Layout |
|------------|--------|
| `< 768px` (mobile) | Single column. Filter cards stack. Estimate card appears below filter cards (not sticky). Download CTA pinned to bottom of viewport via `fixed bottom-0`. Auto-scroll to estimate after successful estimate. |
| `768px – 1023px` (tablet) | 2-column grid: `grid-cols-[1fr_320px]`. Right column is sticky via `position: sticky; top: 80px`. No fixed bottom CTA — Download CSV lives inside right column. |
| `>= 1024px` (desktop) | Same 2-column grid, wider right rail: `grid-cols-[1fr_360px] gap-8`. Max content width: `max-w-7xl mx-auto`. |

Toolbar is sticky on all breakpoints: `sticky top-0 z-10 bg-white`.

## Filter Button Behavior

1. User clicks "Filter" → button becomes `loading=true` disabled state.
2. `handleSubmit` triggers Joi resolver → field-level errors render inline via `errors.*.message` in each field component.
3. Then the manual `validateLocationAndMortgage` runs (reused from v1 lines 397–476): sets errors on `location`, `mortgage.interest_rate.from/to`, `mortgage.loan_amount.from/to`, `mortgage.loan_types`.
4. If any error was set → abort early, button returns to idle state, errors stay visible.
5. If valid → call `exportEstimate` with loading spinner. On success: populate `estimateData`, set `isStale=false`, on mobile auto-scroll to `estimateRef`.
6. Button always enabled (never disabled before click) — this is by design so users who click blindly see which fields are missing.

## Stale Estimate Design

State: `isStale: boolean` in v2 container.

Triggers `isStale = true`:
- Chip X clicked (any filter removed via chip).
- User edits any form field **after** an estimate was returned (use `form.watch` subscription).

Triggers `isStale = false`:
- New successful `exportEstimate` response arrives.
- `handleResetFilters` called.
- `loadFiltersFromHistory` is called (the form is repopulated from a past export's filter set, so any previous estimate no longer matches the new values — clear both `estimateData` AND `isStale` so the user starts from a clean right-rail).

**Edge case — `loadFiltersFromHistory`**: when a user clicks "Load filters" on a history row, the form is wholesale replaced. The implementation MUST:
1. Call `setValue` / `reset` for every field (existing v1 logic, lines 510–586).
2. Set `setEstimateData(null)` so the right rail shows the empty placeholder, not a stale estimate from a completely different filter set.
3. Set `setIsStale(false)` (since there's no estimate to be stale *about*).
4. Set `setWasLoadedFromHistory(true)` so the yellow `<HistoryLoadedBanner>` appears.
5. `setActiveTab('filter')` to jump the user back to the filter tab.

Skipping step 2 would leave a misleading green/red estimate card visible against a totally different filter set — that is the UX bug the stale-state design is meant to prevent.

Visual treatment in `EstimateCard` when `isStale`:
- Card background switches to neutral (`bg-gray-50`) regardless of previous `can_export` color.
- Banner strip at top: icon `<IconRefresh />` + text `t('ExportDatabaseV2.estimate_stale')` = "Filters changed — click **Filter** to update the estimate."
- Record count + other stats rendered at `opacity-60`.
- `StickyDownloadCTA` Download button disabled while `isStale === true`.

## Auto-Scroll Behavior (mobile only)

New hook `lf-iq/src/hooks/useAutoScrollOnMobile.ts`:

```ts
import { useEffect, RefObject } from 'react'

const MOBILE_BREAKPOINT_PX = 768

export function useAutoScrollOnMobile<T extends HTMLElement>(
  ref: RefObject<T>,
  trigger: unknown
) {
  useEffect(() => {
    if (!trigger || !ref.current) return
    if (typeof window === 'undefined') return
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [trigger, ref])
}
```

Used in `index.tsx`:

```ts
const estimateRef = useRef<HTMLDivElement>(null)
useAutoScrollOnMobile(estimateRef, estimateData)
```

## i18n

**Strategy**: reuse existing `ExportDatabase.*` translations wherever the concept is unchanged. Only add NEW keys under `ExportDatabaseV2.*` for truly new UI elements (stale-estimate banner, est. delivery time, history-loaded banner, numbered pagination labels, etc.).

Rules:
1. When a v2 label maps 1:1 to an existing `ExportDatabase.*` key (e.g., "Location", "Mortgage", "Download CSV"), **re-use the existing key** from v2 components — do NOT duplicate it under `ExportDatabaseV2.*`.
2. When a label is genuinely new (e.g., `estimate_stale`, `estimate_delivery_time`, `history_loaded_banner`), add it under `ExportDatabaseV2.*`.
3. For new keys: **en.json and vi.json** get properly human-authored translations. For the remaining 5 locales (`ar, es, he, ko, zh`), reuse an equivalent translation from `ExportDatabase.*` if available; otherwise fall back to the English value with a `// TODO: translate` inline comment in the JSON (use a sibling `_note` key since JSON has no comments).
4. Existing `ExportDatabase.*` keys remain untouched so v1 keeps working during rollout.

**Locales to update** (all 7 files):

```
lf-iq/src/messages/ar.json
lf-iq/src/messages/en.json
lf-iq/src/messages/es.json
lf-iq/src/messages/he.json
lf-iq/src/messages/ko.json
lf-iq/src/messages/vi.json
lf-iq/src/messages/zh.json
```

**New keys** (under `ExportDatabaseV2` — ONLY the keys below; everything else reuses `ExportDatabase.*`):

| Key | English value |
|-----|---------------|
| `page_title` | Export Database |
| `page_subtitle` | Export a filtered list of property records |
| `tab_filter` | Filter & Export |
| `tab_history` | Export History |
| `tab_dnc` | Do-Not-Call List |
| `action_filter` | Filter |
| `action_reset` | Reset |
| `action_download_csv` | Download CSV |
| `action_refresh` | Refresh |
| `action_load_more` | Load more |
| `applied_filters` | Applied filters |
| `no_filters_applied` | No filters applied yet |
| `chip_remove_aria` | Remove {label} filter |
| `estimate_title` | Estimate |
| `estimate_allowed` | Export allowed |
| `estimate_not_allowed` | Export not allowed |
| `estimate_stale` | Filters changed — click **Filter** to update the estimate. |
| `estimate_records` | {count, number} records match |
| `estimate_max_per_request` | Max per request: {max, number} |
| `estimate_remaining_monthly` | Monthly remaining: {remaining, number} / {max, number} |
| `estimate_delivery_time` | Est. delivery time |
| `estimate_delivery_instant` | Instant |
| `history_total_count` | {count, number} exports |
| `history_loaded_banner` | Filters loaded from history. You can adjust before exporting. |
| `history_empty` | No export history yet |
| `pagination_prev` | Previous |
| `pagination_next` | Next |
| `pagination_page_label` | Page {page} |
| `dnc_search_placeholder` | Search DNC list |
| `dnc_total_count` | {count, number} entries |
| `dnc_empty` | No DNC entries |

Keys reuse the v1 keys where the text has not changed (e.g., `Label.state`, `Placeholder.zip_code`, `Action.filter`, `ExportDatabase.mortgage_section`, `ExportDatabase.location_section`) — no duplication.

## Rollout (Option A: withUIVersion toggle)

The current `page.tsx` already uses the `withUIVersion(v1Loader, v2Loader)` helper with a sibling-folder stub as the v2 branch. We **keep the toggle** and simply point the v2 loader at the new `_components/ExportDatabaseV2/` folder in the SAME route, so users can switch between v1 and v2 via the Header toggle during rollout.

Final `page.tsx` shape:

```tsx
'use client'

import RouteGuard from '@shared/components/RouteGuard'
import { withUIVersion } from '@shared/components/withUIVersion'

const ExportDatabase = withUIVersion(
  () => import('./_components/ExportDatabase'),
  () => import('./_components/ExportDatabaseV2')
)

const ExportDatabasePage = () => {
  return (
    <RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}>
      <ExportDatabase />
    </RouteGuard>
  )
}

export default ExportDatabasePage
```

**Cleanup required in the same change**:
- Delete the sibling route folder `/src/app/[locale]/(private)/export-database-v2/` entirely (stub `layout.tsx` + `_components/ExportDatabase/index.tsx` + any children). The real v2 now lives as a component folder, not a route.
- No routes change; the `/export-database-v2` URL disappears (it was only a stub).

## ADR: Keep v1 folder + keep withUIVersion toggle (Option A)

- **Context**: Users rely on the page every day. A big-bang cutover loses rollback. The codebase already has a `withUIVersion` toggle used elsewhere (referral-partners) — re-using it keeps the pattern consistent and gives users per-session v1↔v2 switching.
- **Decision**: Keep the toggle. Build v2 in `_components/ExportDatabaseV2/`, point the v2 branch of `withUIVersion` at it. Leave v1 folder `_components/ExportDatabase/` untouched. Delete the sibling stub route `/export-database-v2/`.
- **Consequences**: Small duplication cost (both folders coexist); zero risk if we need to revert (remove the v2 branch from `withUIVersion` or flip the toggle default). v1 folder deletion deferred to a follow-up change once v2 is confirmed stable.
- **Alternatives considered**: Edit v1 in-place (rejected — no rollback); env-flag feature flag (rejected — `withUIVersion` already gives the user control via Header toggle); hard cutover replacing `page.tsx` import (rejected — loses toggle).

## ADR: Reuse v1 Joi schema verbatim

- **Context**: Validation is business logic, not UI. Rewriting it would be a regression risk.
- **Decision**: Copy the schema and the manual location-tab check into v2 unchanged. Isolate them in `schema.ts` for clarity.
- **Consequences**: If backend validation rules change later, both v1 and v2 need updating — acceptable during the short coexistence window.

## ADR: Stale-state over disabled-chip removal

- **Context**: Q4 user answered "C — remove filter, show stale state".
- **Decision**: Chip X removes the filter from the form and flags the estimate as stale. User must re-click Filter to refresh. Download disabled while stale.
- **Consequences**: Matches user's mental model that chips are live controls. Prevents accidental downloads with outdated counts.

## Conventions

- Mantine 7 + Tailwind CSS utility classes; prefer Tailwind over inline `style={{}}`.
- No `<Stack>` / `<Group>` / `<Text>` / `<Title>` from Mantine for layout-only needs — use `<div className="flex ...">` and semantic HTML (`<h1>`, `<p>`).
- Always use `useTranslations()` — never hardcode strings.
- Keys in JSON files are `snake_case` under `CamelCase` namespace.
- Null-safe field reads (`values?.mortgage?.interest_rate?.from ?? null`).
- File size cap per `rules/common/coding-style.md`: <800 lines; target 200–400. The v1 file is 1019 lines — splitting into 20+ small files is intentional.
- All fields continue to use `@fields/*` wrappers (`TextInputField`, `NumberInputField`, `SelectField`, `MultiSelectField`, `GGMapInputField`).
- `ESLint max-lines: 500` in lf-iq is a soft limit; `index.tsx` v2 should stay well under by delegating to subcomponents.

## Testing

- Existing Jest tests: none for v1 `ExportDatabase`. v2 does not introduce new unit tests as part of this change (out-of-scope per "UI only").
- QA validates the feature via mockup comparison, responsive breakpoints, and flow testing.
- Visual regression via Playwright screenshots at 375/768/1280 is a follow-up.

## Dependencies

No new npm packages. All components built with:
- Mantine 7 (`Card`, `Button`, `Tabs`, `SegmentedControl`, `Chip`, `Alert`, `Grid`)
- `@tabler/icons-react` (already in use)
- Tailwind utilities
- `file-saver` (already in use)
- `@hookform/resolvers/joi`, `react-hook-form` (already in use)
- `next-intl` (already in use)
