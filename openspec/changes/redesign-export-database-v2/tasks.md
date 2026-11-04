# Tasks: Redesign Export Database v2 (UI-only)

All tasks target the **lf-iq** repository on branch `feature/redesign-export-database-v2` (base: `production`).

Each task creates files under:
```
lf-iq/src/app/[locale]/(private)/export-database/_components/ExportDatabaseV2/
```
unless otherwise specified.

Shared conventions:
- Do NOT modify `_components/ExportDatabase/` (v1) — keep it as rollback.
- Always use `useTranslations()` — no hardcoded text.
- Prefer Tailwind utility classes over Mantine layout primitives (`Stack`, `Group`, `Text`, `Title`).
- After every task: `npm run build` must pass, ESLint clean, no TypeScript errors.
- Null-safe field reads everywhere.

Task ordering: T1–T3 are foundation; T4–T11 run in parallel; T12–T14 run in parallel; T15–T18 finishing touches and wiring.

---

## 1. Foundation

- [ ] 1.1 [frontend] [sonnet] Create `ExportDatabaseV2/schema.ts`, `buildRequestBody.ts`, `chipHelpers.ts`
  - Files: `ExportDatabaseV2/schema.ts`, `ExportDatabaseV2/buildRequestBody.ts`, `ExportDatabaseV2/chipHelpers.ts`
  - `schema.ts`: export `filterSchema` — copy Joi schema verbatim from v1 `index.tsx` lines 84–123 using `@utils/joiShorthandTypes`.
  - `schema.ts`: also export `validateLocationAndMortgage(formValues, locationTab, form, t)` — the manual check block from v1 lines 397–476. Function returns `hasErrors: boolean` and sets errors on the form.
  - `buildRequestBody.ts`: export `buildRequestBody(formValues, locationTab, showAdvanced)` — copy verbatim from v1 lines 263–347. Also export `removeCountySuffix` helper.
  - `chipHelpers.ts`: export `type Chip = { key: string; label: string }`, `formValuesToChips(values, locationTab, t): Chip[]`, `removeFilterFromValues(values, chipKey): Partial<FormValues>`. Cover every filterable field: state, county, city, zip_code, interest_rate (range chip), mortgage.loan_amount (range chip), each loan_type as its own chip, advanced.months_since_mortgage_opened (range), advanced.loan_terms (each as chip), advanced.occupancy_group, advanced.age_group.
  - Acceptance: file compiles, exports typed. Unit-testable purely (no component imports).
  - Dependencies: none.

- [ ] 1.2 [frontend] [haiku] Create `useAutoScrollOnMobile` hook
  - File: `lf-iq/src/hooks/useAutoScrollOnMobile.ts`
  - Signature: `useAutoScrollOnMobile<T extends HTMLElement>(ref: RefObject<T>, trigger: unknown): void`
  - Behavior: when `trigger` truthy AND `ref.current` present AND `window.innerWidth < 768` → `ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Guard for SSR (`typeof window === 'undefined'`).
  - Acceptance: typed, SSR-safe, no-op on desktop.
  - Dependencies: none.

- [ ] 1.3 [frontend] [sonnet] Scaffold `ExportDatabaseV2/index.tsx` container shell
  - File: `ExportDatabaseV2/index.tsx`
  - Set up: `useForm<FormValues>` with `joiResolver(filterSchema)`, `FormProvider`, all `useState` hooks (`loading`, `estimateData`, `activeTab`, `locationTab`, `showAdvanced`, `historyData`, `isStale`, `wasLoadedFromHistory`).
  - Copy `FormValues` interface verbatim from v1 lines 47–79.
  - Copy `handleAddressChange`, `handleClearAddress`, `handleResetFilters`, `onSubmit`, `onDownload`, `handleEstimate`, `handleDownload`, `fetchHistory`, `loadFiltersFromHistory` from v1 — but modify: after successful estimate, set `isStale=false`; reset sets `isStale=false` + `wasLoadedFromHistory=false`.
  - Add `form.watch()` subscription: when any form field changes AND `estimateData !== null` → `setIsStale(true)`.
  - Return placeholder JSX: `<div>v2 WIP</div>` (replaced in T18).
  - Acceptance: compiles, no lint errors; all handlers wired but UI blank.
  - Dependencies: 1.1, 1.2.

---

## 2. Header, Toolbar, Tabs (parallel after 1.3)

- [ ] 2.1 [frontend] [haiku] Create `PageHeader.tsx`
  - File: `ExportDatabaseV2/PageHeader.tsx`
  - Wraps `PrivatePageTourHeader` (existing). Props: none (uses `useTranslations`).
  - Uses keys: `ExportDatabaseV2.page_title`, `ExportDatabaseV2.page_subtitle`.
  - Adds mockup spacing: `className="mb-8"`; page container uses `max-w-7xl mx-auto px-6`.
  - Keeps the orange alert card below header with `t.rich('ExportDatabase.instruction', …)` from v1 lines 597–609 (reuse existing key).
  - Acceptance: renders title + subtitle + orange instruction card; visual parity with mockup `#header`.
  - Dependencies: 1.3.

- [ ] 2.2 [frontend] [sonnet] Create `Toolbar.tsx` (sticky tab bar + action slot)
  - File: `ExportDatabaseV2/Toolbar.tsx`
  - Props: `activeTab: Tab`, `onChange: (tab: Tab) => void`, `rightSlot?: ReactNode`
  - Render: `<div className="sticky top-0 z-10 bg-white border-b">` → Mantine `<Tabs>` list on left + `rightSlot` on right using flex.
  - Tab labels: `ExportDatabaseV2.tab_filter`, `ExportDatabaseV2.tab_history`, `ExportDatabaseV2.tab_dnc`. Icons: `IconFileExport`, `IconHistory`, `IconMessage`.
  - Acceptance: sticky on scroll, tabs switch, right slot renders when provided.
  - Dependencies: 1.3.

---

## 3. Filter tab — filter cards (parallel after 1.3)

- [ ] 3.1 [frontend] [sonnet] Create `FilterCards/LocationCard.tsx`
  - File: `ExportDatabaseV2/FilterCards/LocationCard.tsx`
  - Props: `locationTab: LocationTab`, `onLocationTabChange: (t: LocationTab) => void`, `onAddressChange: (d: TGGMapData) => void`, `onClearAddress: () => void`
  - Render: restyled card (`Card withBorder shadow="md" radius="md" p="md"`) with:
    - Icon circle + title `ExportDatabaseV2.location_section` (reuse existing key `ExportDatabase.location_section`) + required asterisk
    - `<SegmentedControl>` for state/zip tabs (v1 lines 650–665)
    - State tab body: `GGMapInputField` + 3-col grid of `SelectField` (state), `TextInputField` (county), `TextInputField` (city)
    - Zip tab body: `TextInputField` zip_code
    - Error display: `{errors.location && <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>}`
  - Logic: copy field JSX from v1 lines 637–725.
  - Acceptance: visual parity with mockup `#filter-cards`; all field keys and placeholders intact.
  - Dependencies: 1.3.

- [ ] 3.2 [frontend] [sonnet] Create `FilterCards/MortgageCard.tsx`
  - File: `ExportDatabaseV2/FilterCards/MortgageCard.tsx`
  - Props: none (uses form context via `useFormContext` inside fields)
  - Render: restyled card with icon + title `ExportDatabase.mortgage_section` + required asterisk.
  - Body: Interest Rate from/to grid, Loan Amount from/to grid, Loan Types multi-select.
  - Copy field JSX from v1 lines 728–821.
  - Acceptance: visual parity; rupture-free form integration.
  - Dependencies: 1.3.

- [ ] 3.3 [frontend] [sonnet] Create `FilterCards/AdvancedCard.tsx`
  - File: `ExportDatabaseV2/FilterCards/AdvancedCard.tsx`
  - Props: `showAdvanced: boolean`, `onToggle: () => void`
  - Render: restyled collapsible card with icon + title. When collapsed, show header only; expanded shows months-since-mortgage-opened range, loan_terms, occupancy_group, age_group.
  - Copy field JSX from v1 lines 824–937.
  - Acceptance: toggle works; fields clear on reset.
  - Dependencies: 1.3.

---

## 4. Applied chips + Filter action row (parallel after 1.1, 1.3)

- [ ] 4.1 [frontend] [sonnet] Create `AppliedChips.tsx`
  - File: `ExportDatabaseV2/AppliedChips.tsx`
  - Props: `chips: Chip[]`, `onRemove: (chipKey: string) => void`
  - Render: horizontal wrap of chips (use custom `<button>` with pill styling — NOT Mantine `<Text>`). Each chip: `<button className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-sm">` + label + `<IconX size={14} />`.
  - Empty state: show muted text `ExportDatabaseV2.no_filters_applied` OR render nothing — user choice via prop `hideWhenEmpty`.
  - Accessibility: each X button has `aria-label={t('ExportDatabaseV2.chip_remove_aria', { label })}`.
  - Acceptance: removes a chip → calls `onRemove(chipKey)`; visual match to mockup `#chips`.
  - Dependencies: 1.1, 1.3.

- [ ] 4.2 [frontend] [haiku] Create `FilterActionRow.tsx`
  - File: `ExportDatabaseV2/FilterActionRow.tsx`
  - Props: `loading: boolean`, `onClick: () => void`
  - Render: single primary Mantine `<Button type="submit" loading={loading} leftSection={<IconInfoCircle size={18} />}>` with label `ExportDatabaseV2.action_filter`. ALWAYS enabled. Full width on mobile, auto on desktop.
  - Acceptance: loading state shows spinner; always enabled (clicking with empty form triggers validation errors).
  - Dependencies: 1.3.

---

## 5. Estimate + Download CTA (sequential, depends on 1.3)

- [ ] 5.1 [frontend] [sonnet] Create `EstimateCard.tsx` (with stale state + delivery time)
  - File: `ExportDatabaseV2/EstimateCard.tsx`
  - Props: `data: PropertiesEstimate | null`, `isStale: boolean`
  - Uses `forwardRef<HTMLDivElement>` so parent can pass a ref for auto-scroll.
  - Render variants:
    - `data === null` → empty/placeholder card with muted text `ExportDatabaseV2.estimate_title` + hint.
    - `isStale === true` → `bg-gray-50`, banner with `<IconRefresh />` + `t('ExportDatabaseV2.estimate_stale')` as rich text (strong on **Filter**). Stats shown at `opacity-60`.
    - `data.can_export === true` and not stale → `bg-green-50` + `<IconInfoCircle className="text-green-600" />` + `t('ExportDatabaseV2.estimate_allowed')`.
    - `data.can_export === false` → `bg-red-50` + `<IconAlertCircle className="text-red-600" />` + `t('ExportDatabaseV2.estimate_not_allowed')`.
  - Always-shown rows when `data !== null`:
    - `t('ExportDatabaseV2.estimate_records', { count })`
    - `t('ExportDatabaseV2.estimate_max_per_request', { max })`
    - `t('ExportDatabaseV2.estimate_remaining_monthly', { remaining, max })`
    - `t('ExportDatabaseV2.estimate_delivery_time')`: value = `t('ExportDatabaseV2.estimate_delivery_instant')` (static "Instant" for now — no backend field for it)
  - Error alert: if `data.error_message` → Mantine `<Alert color="red" icon={<IconAlertCircle size={16} />}>`.
  - Sticky: `md:sticky md:top-20` (below toolbar).
  - Acceptance: all three states visually match mockup `#estimate-card`; stale banner renders correctly.
  - Dependencies: 1.3.

- [ ] 5.2 [frontend] [sonnet] Create `StickyDownloadCTA.tsx`
  - File: `ExportDatabaseV2/StickyDownloadCTA.tsx`
  - Props: `canExport: boolean`, `loading: boolean`, `onDownload: () => void`, `onReset: () => void`
  - Render: two buttons — Reset (outline) and Download CSV (green, icon `<IconDownload size={18} />`).
  - Mobile layout: `fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20 flex gap-2` with safe-area padding.
  - Tablet/desktop layout: static inside right column (`md:static md:bg-transparent md:border-0 md:p-0`).
  - Download button `disabled={!canExport}`; `canExport` is the prop computed as `estimateData?.can_export && !isStale` by parent.
  - Labels: `ExportDatabaseV2.action_reset`, `ExportDatabaseV2.action_download_csv`.
  - Acceptance: mobile shows fixed bottom bar; desktop inline; disabled state correct.
  - Dependencies: 1.3.

---

## 6. Filter tab layout wrapper

- [ ] 6.1 [frontend] [sonnet] Create `FilterTabLayout.tsx` (responsive 2-col wrapper)
  - File: `ExportDatabaseV2/FilterTabLayout.tsx`
  - Props: `leftSlot: ReactNode`, `rightSlot: ReactNode`
  - Mobile (`< md`): `<div className="flex flex-col gap-6">` → left slot, then right slot.
  - Desktop (`md:+`): `<div className="grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">` → left slot in col 1, right slot in col 2 wrapped in `<aside className="md:sticky md:top-20 md:self-start">`.
  - Acceptance: verified at 375px (single col), 768px (2 col, 320px rail), 1280px (2 col, 360px rail).
  - Dependencies: 1.3.

---

## 7. History tab components (parallel after 1.3)

- [ ] 7.1 [frontend] [haiku] Create `HistoryToolbar.tsx`
  - File: `ExportDatabaseV2/HistoryToolbar.tsx`
  - Props: `totalCount: number`, `onRefresh: () => void`, `loading: boolean`
  - Render: sticky sub-toolbar below main toolbar. Left: `<Button variant="outline" leftSection={<IconRefresh />} onClick={onRefresh} loading={loading}>` with label `ExportDatabaseV2.action_refresh`. Right: pill with `t('ExportDatabaseV2.history_total_count', { count: totalCount })`.
  - Acceptance: visual match to mockup `#history`.
  - Dependencies: 1.3.

- [ ] 7.2 [frontend] [sonnet] Create `HistoryRow.tsx`
  - File: `ExportDatabaseV2/HistoryRow.tsx`
  - Props: `item: PropertiesExportHistory`, `onLoadFilters: (item: PropertiesExportHistory) => void`
  - Render: card row with date, record count, and a pill cluster summarizing the filters (state, county, loan_types, etc.). "Load filters" button on the right that calls `onLoadFilters(item)`.
  - Null-safe reads on `item.filters.*`.
  - Acceptance: matches mockup pill style; filter pills wrap gracefully.
  - Dependencies: 1.3.

- [ ] 7.3 [frontend] [sonnet] Create `NumberedPagination.tsx`
  - File: `ExportDatabaseV2/NumberedPagination.tsx`
  - Props: `totalItems: number`, `pageSize: number` (default 10), `currentPage: number`, `onPageChange: (page: number) => void`
  - Render: prev arrow, numbered buttons (1, 2, 3, …, N with ellipsis for large N), next arrow.
  - Use Mantine `<Pagination>` component — simpler than hand-rolled.
  - Labels: `ExportDatabaseV2.pagination_prev`, `ExportDatabaseV2.pagination_next`, `ExportDatabaseV2.pagination_page_label`.
  - Acceptance: client-side pagination works; ellipsis appears when `totalPages > 7`.
  - Dependencies: 1.3.

- [ ] 7.4 [frontend] [sonnet] Create `HistoryPanel.tsx`
  - File: `ExportDatabaseV2/HistoryPanel.tsx`
  - Props: `data: PropertiesExportHistory[]`, `isLoading: boolean`, `onRefresh: () => void`, `onLoadFilters: (item: PropertiesExportHistory) => void`
  - Composes `HistoryToolbar` + paginated list of `HistoryRow` + `NumberedPagination`.
  - Local `useState` for `currentPage`; `pageSize = 10`.
  - Empty state: text `ExportDatabaseV2.history_empty`.
  - Acceptance: refresh triggers `onRefresh`; pagination navigates pages without remount.
  - Dependencies: 7.1, 7.2, 7.3.

---

## 8. Do-Not-Call tab components (parallel after 1.3)

- [ ] 8.1 [frontend] [sonnet] Create `DNCToolbar.tsx`
  - File: `ExportDatabaseV2/DNCToolbar.tsx`
  - Props: `searchValue: string`, `onSearchChange: (v: string) => void`, `totalCount: number`, `filterOptions: { value: string; label: string }[]`, `selectedFilters: string[]`, `onFilterChange: (v: string[]) => void`
  - Render: sticky sub-toolbar. Left: `<TextInput>` search with `<IconSearch />` leftSection and placeholder `ExportDatabaseV2.dnc_search_placeholder`. Middle (conditional): `<MultiSelect>` — render only when `filterOptions.length > 1`. Right: pill with `t('ExportDatabaseV2.dnc_total_count', { count: totalCount })`.
  - Drop any "showing X of Y" text.
  - Acceptance: MultiSelect hidden when ≤1 option; search debounced via `useDebouncedValue` is optional — not required.
  - Dependencies: 1.3.

- [ ] 8.2 [frontend] [sonnet] Create `DNCRow.tsx`
  - File: `ExportDatabaseV2/DNCRow.tsx`
  - Props: `item: DncItem` (type already exists in v1 `DoNotCallList/index.tsx` — reuse; if not exported, export it)
  - Render: card row with status pills matching mockup (`#dnc` section).
  - Acceptance: visual parity with mockup; pills use color tokens from theme (orange/green/red).
  - Dependencies: 1.3.

- [ ] 8.3 [frontend] [haiku] Create `DNCLoadMoreButton.tsx`
  - File: `ExportDatabaseV2/DNCLoadMoreButton.tsx`
  - Props: `loading: boolean`, `onClick: () => void`, `hasMore: boolean`
  - Render: full-width button `<button className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-solid hover:border-orange-500 rounded-md transition">` with label `ExportDatabaseV2.action_load_more`. Spinner when loading. Hide when `!hasMore`.
  - Acceptance: dashed → solid border on hover; visual match.
  - Dependencies: 1.3.

- [ ] 8.4 [frontend] [sonnet] Create `DNCPanel.tsx`
  - File: `ExportDatabaseV2/DNCPanel.tsx`
  - Port the data-fetching logic from existing v1 `_components/DoNotCallList/index.tsx` (read that file first). Do NOT modify v1 DNC file.
  - Compose: `DNCToolbar` + list of `DNCRow` + `DNCLoadMoreButton`.
  - Empty state: `ExportDatabaseV2.dnc_empty`.
  - Acceptance: parity with v1 DNC behavior; new visuals match mockup.
  - Dependencies: 8.1, 8.2, 8.3.

---

## 9. "Loaded from history" banner

- [ ] 9.1 [frontend] [haiku] Create `HistoryLoadedBanner.tsx`
  - File: `ExportDatabaseV2/HistoryLoadedBanner.tsx`
  - Props: `show: boolean`, `onDismiss: () => void`
  - Render: yellow banner (`bg-yellow-50 border border-yellow-200 rounded-md p-3`) with icon, text `ExportDatabaseV2.history_loaded_banner`, and dismiss X button.
  - Acceptance: shows when `show` true; `onDismiss` hides it; styling matches mockup.
  - Dependencies: 1.3.

---

## 10. Wiring and i18n (sequential, after all above)

- [ ] 10.1 [frontend] [sonnet] Wire all v2 components into `ExportDatabaseV2/index.tsx`
  - File: `ExportDatabaseV2/index.tsx` (finalize)
  - Replace placeholder return with full JSX tree per design doc "Data Flow" diagram.
  - Create `estimateRef = useRef<HTMLDivElement>(null)` and call `useAutoScrollOnMobile(estimateRef, estimateData)`.
  - Build chips array via `formValuesToChips(form.watch(), locationTab, t)`.
  - `handleRemoveChip(chipKey)` → call `removeFilterFromValues` → `form.reset(nextValues)` or `setValue` each changed field → `setIsStale(true)`.
  - Show `<HistoryLoadedBanner>` in left column when `wasLoadedFromHistory === true`; on dismiss → `setWasLoadedFromHistory(false)`.
  - When chip removal causes estimate staleness, make sure `StickyDownloadCTA.canExport` picks it up (`estimateData?.can_export && !isStale`).
  - Acceptance: full page works end-to-end; form submit → estimate → download roundtrip identical to v1 in terms of API calls.
  - Dependencies: 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1, 7.4, 8.4, 9.1.

- [ ] 10.2 [frontend] [sonnet] Add `ExportDatabaseV2.*` i18n keys (reuse existing `ExportDatabase.*` wherever possible)
  - Files to update:
    - `lf-iq/src/messages/en.json` — human-authored values for all new keys.
    - `lf-iq/src/messages/vi.json` — human-authored Vietnamese translations for all new keys.
    - `lf-iq/src/messages/ar.json`, `es.json`, `he.json`, `ko.json`, `zh.json` — for each new key, reuse the value of the closest `ExportDatabase.*` equivalent in that locale if one exists; otherwise fall back to the English value and add a sibling `_note` key like `"history_loaded_banner_note": "TODO: translate"` so human translators can sweep later.
  - Add a new top-level `ExportDatabaseV2` object. Only add the NEW keys listed in design.md "i18n" section (stale/delivery/history-banner/pagination/dnc/chip-aria/applied-filters labels — ~20 keys, NOT 33). Do NOT duplicate keys whose concept already exists under `ExportDatabase.*` (e.g., `mortgage_section`, `location_section`, "Download CSV") — in the v2 components, call those existing keys directly.
  - Rich-text keys (`estimate_stale`) use `{strong}…{/strong}` placeholder syntax consistent with `translateRichKeys`.
  - Acceptance: no console warnings about missing keys when switching languages; JSON valid in every file; top-level `ExportDatabaseV2` present in all 7 files with the same key set.
  - Dependencies: 10.1 (keys discovered via implementation).

- [ ] 10.3 [frontend] [haiku] Wire v2 into `page.tsx` via `withUIVersion` (Option A — keep toggle)
  - File: `lf-iq/src/app/[locale]/(private)/export-database/page.tsx`
  - Update the existing `withUIVersion` call so the v2 branch loads from the new in-route component folder, not the sibling route stub:
    ```tsx
    const ExportDatabase = withUIVersion(
      () => import('./_components/ExportDatabase'),
      () => import('./_components/ExportDatabaseV2')
    )
    ```
  - Keep `RouteGuard` and the rest of `page.tsx` unchanged.
  - Leave v1 folder `_components/ExportDatabase/` untouched (rollback path).
  - Acceptance: visiting `/export-database` still works in both v1 and v2 depending on Header toggle; no other imports reference the sibling `/export-database-v2/` route.
  - Dependencies: 10.1, 10.2.

- [ ] 10.4 [frontend] [haiku] Final build + smoke check
  - Commands: `npm install && npm run lint && npm run build && npm run dev`
  - Manual smoke (with Header toggle flipped to v2):
    - Open `/export-database`; verify header, tabs, sticky toolbar.
    - Click Filter with empty form → validation errors visible.
    - Fill minimum required fields → Filter button shows loading → estimate card populates.
    - Edit a field → estimate flips to stale; Download disabled.
    - Remove a chip → that field clears; estimate stale; Download disabled.
    - Re-click Filter → estimate refreshes; Download enabled if `can_export`.
    - Switch to History tab → toolbar + numbered pagination work. Click "Load filters" on a row → returns to Filter tab, form repopulates, estimate card clears to placeholder (not stale), yellow "Loaded from history" banner shows.
    - Switch to DNC tab → search + load more work.
    - Resize window to 375px → mobile layout, Download CTA fixed at bottom, auto-scroll to estimate after success.
    - Toggle Header switch back to v1 → v1 page still renders normally (rollback verified).
    - Switch all 7 locales → no missing-key console warnings.
  - Acceptance: build passes with 0 errors; all smoke checks pass; v1 still works when Header toggle is flipped.
  - Dependencies: 10.3.

- [ ] 10.5 [frontend] [haiku] Cleanup — delete sibling stub route and close old epic tasks
  - **Delete**: the sibling route folder `lf-iq/src/app/[locale]/(private)/export-database-v2/` in its entirety (`layout.tsx`, `_components/ExportDatabase/index.tsx`, and any children). This folder was a stub placeholder for the v2 loader — the real v2 now lives as `_components/ExportDatabaseV2/` under the original route.
  - Verify: `grep -rn "export-database-v2" lf-iq/src/` returns no results (no imports point to the deleted folder).
  - **Close superseded Beads tasks**: the old epic `agentflow-lqf` ("Export Database V2 Visual Redesign") and all its open sub-tasks (22 open sub-tasks as of 2026-04-19) are superseded by this change's new epic. For each open task in `agentflow-lqf` including the epic itself, run:
    ```
    bd close <id> --reason "Superseded by epic <new-epic-id> (redesign-export-database-v2)"
    ```
    The new epic ID is provided in the task description when this task is dispatched.
  - Acceptance: sibling folder gone; `npm run build` still passes; all `agentflow-lqf*` tasks show status `closed` in `bd list`.
  - Dependencies: 10.3.

---

## Task Summary

- **27 atomic tasks** across 10 sections:
  - §1 Foundation: 3 (1.1, 1.2, 1.3)
  - §2 Header/Toolbar: 2 (2.1, 2.2)
  - §3 Filter Cards: 3 (3.1, 3.2, 3.3)
  - §4 Chips + Filter Action: 2 (4.1, 4.2)
  - §5 Estimate + Download CTA: 2 (5.1, 5.2)
  - §6 Filter Layout: 1 (6.1)
  - §7 History Tab: 4 (7.1, 7.2, 7.3, 7.4)
  - §8 DNC Tab: 4 (8.1, 8.2, 8.3, 8.4)
  - §9 History-Loaded Banner: 1 (9.1)
  - §10 Wiring + i18n + Rollout + Cleanup: 5 (10.1, 10.2, 10.3, 10.4, 10.5)
  - **Total: 27**
- All tasks are frontend-only (zero backend changes).
- Parallel-safe groups after §1: §2, §3, §4, §5, §6, §7.1–3, §8.1–3, §9 all depend only on 1.3 and can run concurrently.
- Sequential bottleneck: §1 (foundation) → parallel fan-out → 7.4 and 8.4 gate on their sub-tasks → 10.1 wiring (gates on §2–§9) → 10.2 i18n → 10.3 page toggle wiring → 10.4 smoke + 10.5 cleanup.

Model distribution:
- **haiku** (9): 1.2, 2.1, 4.2, 7.1, 8.3, 9.1, 10.3, 10.4, 10.5 — trivial files / wiring / config / cleanup.
- **sonnet** (18): all substantive component work.
- **opus** (0): none needed — architecture decisions already captured in design.md.
