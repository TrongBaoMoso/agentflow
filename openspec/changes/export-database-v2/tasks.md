# Tasks: Export Database V2 Visual Redesign

Feature branch: `feature/export-database-v2` (branch from `production`, merge to `master`) — to be created by DevOps before Phase 2 begins.

Task branches: one per task, named `agent/<bead-id>-<short-desc>`, branched from and merged back into `feature/export-database-v2`.

Task labels use the format `- [ ] N.M [backend|frontend|fullstack] [opus|sonnet|haiku] Description`.

---

## Phase 1 — BLOCKING DESIGN GATE

**All Phase 2 tasks are blocked until user approval of a chosen mockup variant is recorded in `proposal.md` under the "Chosen Variant" section.**

- [ ] 1.1 [frontend] [sonnet] Build `design-a.html` mockup — baseline variant.
  - Path: `lf-iq/mockups/export-database-v2/design-a.html`
  - Single-file self-contained HTML. Include Inter font + Tabler icons from CDN. Inline CSS vars matching v2 token ramp (see `design.md` → Design tokens). Small inline JS only for tab switching and demo state (no network calls).
  - Contents (baseline — closest to current 3-tab UX + small UX wins):
    - PrivatePageTourHeader clone (48px orange icon + title + subtitle)
    - 3 tabs with counts (engagement-v2 pattern) — "Filter & Export", "Export History 24", "Do Not Call List 7"
    - **Filter & Export tab demo state**: sticky toolbar with Reset button; 3 filter cards (Location / Mortgage / Advanced) using the same field layout as v1; applied-filter chips row; quota meter in top-right of filter card; sticky Download CTA showing "Download 2,481 records".
    - **Export History tab demo state**: card list with 4 sample rows covering every expires bucket (fresh / soon / urgent / expired) + one `user_ids: ['*']` "All users" row + one `user_ids.length = 3` "3 users" row + offset pagination strip at the bottom.
    - **Do Not Call List tab demo state**: phone-search input + 5 sample rows + "Load more" button. Admin-only banner at the top reading "Admin-only tab".
  - Acceptance: file opens in Chrome and renders all 3 tabs on click-to-switch (inline JS), no console errors, uses only CDN assets + inline CSS, Inter font loads, all v2 tokens from `design.md` present.

- [ ] 1.2 [frontend] [sonnet] Build `design-b.html` mockup — richer variant.
  - Path: `lf-iq/mockups/export-database-v2/design-b.html`
  - Builds on design-a plus:
    - **Saved presets** strip above the filter cards — horizontal scrollable list of preset chips ("Conventional 30yr CA", "FHA refi AZ", etc.) with a `+ Save current as preset` button on the right. (Visual only — backend is out of scope; label the chips as "Preview — not persisted yet".)
    - **Expiring-download warning banner** above the history card list — amber gradient banner: "2 exports expire in the next 24 hours" with a "Show expiring first" sort toggle.
    - **Enhanced history card** — taller row (2 visual tiers): tier 1 = export type + record count + user chip + expires pill; tier 2 = created_by avatar + time ago + download count + primary/secondary action buttons (`Load filters`, `Download again`). Hover state raises shadow.
    - **Preview-before-export** modal trigger — a `Preview first 10` button next to the Download CTA opens a modal with a 10-row table preview (mocked data). Labeled "Preview — not wired yet".
  - Acceptance: same as 1.1 plus the three new sections (presets, warning banner, enhanced history) visible; preview modal opens and closes; all labels clearly mark preview-only features.

- [ ] 1.3 [frontend] [sonnet] Build `design-c.html` mockup — dashboard-led stretch variant.
  - Path: `lf-iq/mockups/export-database-v2/design-c.html`
  - Top-level shift — trades the 3-tab flow for a dashboard layout. **Stretch goal — only build if time remains after 1.1 and 1.2.**
  - Contents:
    - **Top KPI strip** (4 cards): "Exports this month", "Rows exported", "Expiring soon", "DNC numbers". Matches engagement-v2 kpi-card style (with sparkline line-charts using SVG).
    - **Workspace-style filter builder** replacing the 3 filter cards — a single tall card on the left with a tree-style filter list ("Location > CA", "Rate > 5.5% – 7.0%", etc.) and a `+` button to add criteria. To the right, a live-updating estimate panel.
    - **Timeline-style history** below the workspace — vertical timeline with icons (blue dot = created, orange dot = downloaded, red dot = expired) instead of separate rows.
    - **DNC sidebar panel** on the right, collapsible.
  - Acceptance: file opens in Chrome, renders 4 KPI cards + workspace + timeline + sidebar without layout break at 1280px. Label the page header "Dashboard layout — stretch mockup". If 1.1 and 1.2 are complete and time is tight, this task may be skipped and the variant set goes forward with only A + B.

- [ ] 1.4 [frontend] [haiku] Write `lf-iq/mockups/export-database-v2/README.md` comparing variants.
  - Content structure:
    - One-paragraph summary of each variant (purpose, trade-offs, scope implications).
    - Side-by-side comparison table: rows = features (tabs, chips, quota, expires-pill, saved-presets, preview, KPI strip, timeline history, DNC sidebar), columns = A / B / C, cells = ✓ / — / "(preview only)".
    - "How to view": `open design-a.html` (or drag into browser). No build step.
    - "How to decide": bullet guidance — "Pick A if…", "Pick B if…", "Pick C if…".
    - "After picking": user adds `## Chosen Variant` block to `openspec/changes/export-database-v2/proposal.md` with their pick.
  - Acceptance: README renders in any markdown viewer; all 3 (or 2, if C is skipped) HTML files are linked; comparison table covers at least 8 rows.

- [ ] 1.5 [frontend] [haiku] Await user approval, record chosen variant.
  - Blocked on: 1.1, 1.2, 1.4 (1.3 optional).
  - The user reviews the 2–3 mockups, picks one, and the chosen variant is stamped into `proposal.md` under the `## Chosen Variant` section (Variant, Approved-by, Date, optional Notes).
  - Acceptance: `proposal.md` contains a non-empty `## Chosen Variant` block. Phase 2 tasks unblock the moment this file is committed to the feature branch.

---

## Phase 2 — IMPLEMENTATION

**All Phase 2 tasks are blocked until 1.5 completes. Task dependencies within Phase 2 are listed per task.**

### 2.A Scaffolding & shared primitives

- [ ] 2.1 [frontend] [sonnet] Scaffold the route folder.
  - Blocked on: 1.5.
  - Files to create:
    - `src/app/[locale]/(private)/export-database-v2/layout.tsx` — mirror v1 (`AuthProvider` + `PrivateLayout`).
    - `src/app/[locale]/(private)/export-database-v2/page.tsx` — `RouteGuard requiredRoles={['ADMIN', 'LOAN_OFFICER']}` wrapping `<ExportDatabaseV2 />`.
    - `src/app/[locale]/(private)/export-database-v2/_components/ExportDatabaseV2/index.tsx` — empty shell that just renders `PrivatePageTourHeader` with the V2 title/subtitle i18n keys.
    - Add `EXPORT_DATABASE_V2: '/export-database-v2'` to `src/shared/constants/routes.ts` (placed under the `// V2` section already present at line 27).
  - Acceptance: `npm run dev`, visit `/export-database-v2`, page renders the v2 header (no tabs yet). `npm run build` passes.

- [ ] 2.2 [frontend] [opus] Add admin-atom gate at the page root.
  - Blocked on: 2.1.
  - In `ExportDatabaseV2/index.tsx`: `const adminOnly = useAtomValue(isAdminState)` imported from `@jotai/atom/authState`; `if (!adminOnly) return null`.
  - Add a menu-item entry (if `src/shared/utils/menuItems.ts` has a v2 section) guarded by the same atom.
  - Acceptance: log in as LOAN_OFFICER (non-admin), visit `/export-database-v2` → page returns `null` (empty content area, RouteGuard does not redirect because LO is in allowed roles). Log in as ADMIN → page renders. Document the atom source in a code comment pointing to `DesktopHeader/index.tsx:35`.

- [ ] 2.3 [frontend] [sonnet] Audit and create missing shared v2 primitives.
  - Blocked on: 2.1.
  - For each primitive listed below, first grep `src/shared/components` and the referral-partners-v2 / release-notes-v2 / bulk-import-homeowner-v2 folders for an existing implementation. Reuse if found; else create under `src/shared/components/<Name>/index.tsx`.
  - Components:
    - `PrivatePageTourHeader` — **already exists**, no work.
    - `TabBarWithCounts` — props: `tabs: { value: string; label: string; count?: number }[]`, `value`, `onChange`, `adminOnly?: boolean` per tab.
    - `StickyToolbarV2` — wrapper with `sticky top-0 z-30 bg-white shadow-sm rounded-md`; renders children in a `flex flex-wrap items-end gap-2 px-4 py-3` row.
    - `StatusPillV2` — props: `color: 'green'|'amber'|'red'|'blue'|'purple'|'gray'`, `icon?: ReactNode`, `children`. Renders the v2 pill shape from `design.md`.
    - `EmptyStateV2` — props: `icon`, `title`, `subtitle?`, `action?`. Centered layout per `design.md` → Empty / loading / error states.
    - `ErrorStateV2` — props: `error`, `onRetry`.
  - Acceptance: each new component ≤200 lines, TypeScript strict, has a basic Jest test covering default render + one prop variant, no `Stack/Group/Text/Title` from Mantine (use Tailwind per `feedback_mantine_tailwind_rules`).

- [ ] 2.4 [frontend] [sonnet] Implement the tab shell with tabs-with-count pattern.
  - Blocked on: 2.2, 2.3.
  - In `ExportDatabaseV2/index.tsx`: render `<PrivatePageTourHeader>` + `<TabBarWithCounts>` + conditional rendering per tab. Wire `activeTab` state. For now, each tab renders a placeholder `EmptyStateV2` with "Coming soon".
  - Counts wiring: history tab reads from `useExportHistoryQuery`'s `page.totalElements` (placeholder `undefined` when not yet fetched); DNC reads from `useDncInfiniteQuery`'s first page's `page.totalElements`.
  - Acceptance: 3 tabs click-through correctly; active-tab styling matches v2; counts render as `—` when data not yet loaded; admin gate still enforced.

### 2.B Filter & Export tab

- [ ] 2.5 [frontend] [opus] Extract filter form hook and port v1 logic (with multi-select schema upgrades).
  - Blocked on: 2.4.
  - Create `FilterAndExportTab/useExportForm.ts` — lifts the `useForm`, `filterSchema`, `buildRequestBody`, `handleEstimate`, `handleDownload`, `onSubmit`, `onDownload`, `handleResetFilters`, `loadFiltersFromHistory` from v1's `ExportDatabase/index.tsx`, **with the following schema/type upgrades required by the approved Variant A + multi-select tweaks**:
    - `advanced.occupancy_group: string` → `advanced.occupancy_groups: string[]` (joi: `array.items(string).allow(null)`, default `[]`).
    - `advanced.age_group: string` → `advanced.age_groups: string[]` (joi: `array.items(string).allow(null)`, default `[]`).
    - `advanced.loan_terms: string[]` — already multi, keep.
    - `advanced.months_since_mortgage_opened_from/to: number` — keep numeric range.
    - `location.state: string | null` → `location.states: string[]` (multi-select).
    - `location.county: string | null` → `location.counties: string[]` (multi-select).
    - `location.city: string | null` → `location.cities: string[]` (multi-select).
    - `mortgage.loan_types: string[]` — already multi, keep.
    - `buildRequestBody` — map new array fields; include each array only when `length > 0`. Send as arrays; if the backend currently only accepts singular values, flag this in the PR description so backend can be adjusted in a follow-up change — DO NOT silently change request shape per field.
    - `loadFiltersFromHistory` — remains a no-op beyond setting `export_type`, because the persisted history filters only contain `{ export_type, user_ids }` (see proposal §3 + §Source of Truth). Preserve v1's info-banner behavior.
  - Expose `form`, `estimateData`, `loading`, and the three handlers. File stays ≤500 lines (ESLint max-lines).
  - Acceptance:
    - Unit test: stubbed `useExportForm` with `act()` calls to `onSubmit` with invalid input surfaces the same validation errors as v1 (e.g., location required when all three location arrays are empty, interest rate required).
    - Unit test: `advanced.age_groups = ['18-24', '25-34']` ends up as an array in the request body.
    - Unit test: clearing all multi-selects leaves the corresponding keys absent from the request body.
    - No regressions vs v1 for fields that remain single (interest rate, loan amount, months-since-mortgage-opened range).

- [ ] 2.6 [frontend] [sonnet] Build the 3 filter cards (Location / Mortgage / Advanced) with multi-select upgrades.
  - Blocked on: 2.5.
  - `FilterAndExportTab/index.tsx` — renders 3 cards using the v2 card style (white surface, `rounded-[12px]`, `border`, `shadow-xs`, `p-5`). Each card has the orange 32×32 icon + title + optional subtitle + body.
  - Reuse existing field components: `GGMapInputField`, `SelectField`, `TextInputField`, `NumberInputField`, `MultiSelectField`, `SegmentedControl`. Do NOT re-implement.
  - **Multi-select upgrades (per approved Variant A tweaks in proposal.md §Chosen Variant):**
    - Location card — `state`, `county`, `city` each render as `MultiSelectField` bound to `location.states/counties/cities` (array form state). Mantine's `MultiSelect` already renders selected values as removable pills; no new primitive is needed.
    - Mortgage card — `loan_types` stays `MultiSelectField` (unchanged).
    - Advanced card — `loan_terms` `MultiSelectField` (unchanged); `occupancy_groups` and `age_groups` BOTH switch from `SelectField` to `MultiSelectField`; `months_since_mortgage_opened_from/to` stays as the existing `NumberInputField` range.
    - Each `MultiSelectField` must set `searchable`, `clearable`, `hidePickedOptions`, and render a `"Select all"` + `"Clear all"` affordance (two small text buttons just above the field, wired to `form.setValue(path, allOptionValues)` and `form.setValue(path, [])` respectively).
    - Keyboard accessibility: Mantine `MultiSelect` handles this natively — verify arrow keys, Enter to toggle, Backspace to remove last chip.
    - Any change to a multi-select must also clear `estimateData` (call the shared `invalidateEstimate()` helper exposed from task 2.5) so the Download CTA re-disables.
  - Reuse existing i18n keys from `ExportDatabase.*` for field labels where they already exist (state, county, city, interest rate, loan term, occupancy, age group). Add new `ExportDatabaseV2.select_all_shortcut` / `clear_all_shortcut` keys for the new affordances.
  - Responsive: Grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.
  - Mockup reference: `lf-iq/mockups/export-database-v2/design-a.html` lines ~1229–1394 (filter card region).
  - Acceptance:
    - All 7 multi-select controls render as chip-tokenized inputs with working Select all / Clear all.
    - Changing any multi-select value calls `invalidateEstimate()` and disables the Download CTA.
    - `occupancy_groups` and `age_groups` appear in the outbound request as arrays.
    - Visual shell matches referral-partners-v2 card shape.
    - Smoke test against dev backend succeeds for a simple CA-only FHA query.
    - Build passes. No ESLint errors. File <500 lines.

- [ ] 2.7 [frontend] [sonnet] Build `AppliedFilterChips` component (multi-value aware).
  - Blocked on: 2.5, 2.6.
  - File: `FilterAndExportTab/AppliedFilterChips.tsx`.
  - Input: the current form values + the resolved `estimateData`.
  - Chip rendering rules:
    - Single-value field (e.g., `interest_rate_from`) → one chip per non-empty value. Clicking `×` → `form.setValue(path, null | '')` and `invalidateEstimate()`.
    - Multi-value field (arrays: `location.states/counties/cities`, `mortgage.loan_types`, `advanced.loan_terms/occupancy_groups/age_groups`) → render ONE chip per array **element** with the pattern `"{FieldLabel}: {element}"` (e.g., `"State: CA"`, `"State: TX"`, `"Age group: 25-34"`). Clicking `×` on a per-element chip removes only that element from the array (`form.setValue(path, current.filter(v => v !== element))`) and invalidates the estimate.
    - Add a second "Clear {FieldLabel}" affordance per multi-value group (small outlined button at the end of the row for that group) that clears the whole array.
    - Numeric range field (e.g., `interest_rate_from`/`interest_rate_to`) → render a single combined chip `"Rate: 5.5%–7.0%"` when either bound is set; clicking `×` clears both.
  - Chip labels: compose existing field-label keys from `ExportDatabase.*` with short value renderers. Add only the `ExportDatabaseV2.chips_clear_field_button` key if needed.
  - Unit tests (minimum):
    - Render one chip per element for a 3-element multi-select.
    - Clicking a single-element chip removes only that element from the array.
    - Clicking "Clear {field}" clears the entire array.
    - `estimateData` cleared after any chip removal.

- [ ] 2.8 [frontend] [sonnet] Build `QuotaMeter` component.
  - Blocked on: 2.5.
  - File: `FilterAndExportTab/QuotaMeter.tsx`.
  - Props: `remaining: number | null`, `max: number | null`. Null-safe: if either is null → skeleton.
  - Color stops per `design.md`: green >50%, amber 10–50%, red <10%. Width `160px`, height `6px`.
  - Unit test: render at 60% / 30% / 5% remaining → bar has the expected Tailwind class; render with `remaining = null` → renders skeleton only.

- [ ] 2.9 [frontend] [sonnet] Build `StickyDownloadCTA` component.
  - Blocked on: 2.5.
  - File: `FilterAndExportTab/StickyDownloadCTA.tsx`.
  - Props: `estimateData | null`, `onDownload`, `isDownloading`.
  - Three render branches:
    - `estimateData == null` → "Run filter to see estimate" (disabled).
    - `estimateData.can_export === false` → "Cannot export" (disabled, tooltip from `error_message`).
    - else → `Download {count.toLocaleString()} records` (enabled).
  - `bottom-0 sticky z-20 bg-gradient-to-t from-[#fafafa] to-transparent` wrapper.
  - Null-safe: `estimateData?.estimated_record_count ?? 0`.
  - Unit test: all three branches render expected label; disabled when appropriate.

- [ ] 2.10 [frontend] [sonnet] Wire Filter & Export tab end-to-end + info banner.
  - Blocked on: 2.6, 2.7, 2.8, 2.9.
  - Compose: `StickyToolbarV2` (Reset button + QuotaMeter on the right) + 3 filter cards + AppliedFilterChips + Estimate card (v1 style kept, just re-wrapped with v2 tokens) + StickyDownloadCTA.
  - Add the dismissible "Load filters" info banner at the top of the tab — controlled by local state `showLoadFiltersBanner`; shown when navigating in from the history tab's "Load filters" action.
  - Acceptance: submit flow + download flow work exactly like v1 (smoke-tested against dev backend); chip removal + quota meter reactive; banner appears and dismisses; form is never mutated by the banner action.

### 2.C Export History tab

- [ ] 2.11 [frontend] [sonnet] Build `useExportHistoryQuery` hook.
  - Blocked on: 2.3.
  - File: `ExportHistoryTab/useExportHistoryQuery.ts`.
  - Wraps TanStack React Query `useQuery` around `getPropertiesExportHistory(page, size)`. Query key: `['export-history', { page, size }]`. Returns `{ rows, page, isLoading, error, refetch }`.
  - Expose a `setPage(n)` helper. Expose `invalidateExportHistory()` for post-download refresh.
  - Unit test: mock the API, assert cached page 0 → navigate to page 1 triggers new fetch; `invalidate` refetches.

- [ ] 2.12 [frontend] [sonnet] Build `ExpiresCountdownPill` component.
  - Blocked on: 2.3.
  - File: `ExportHistoryTab/ExpiresCountdownPill.tsx`.
  - Uses the `bucketFor(expiresAtMs, nowMs)` helper defined in `design.md`. Renders `StatusPillV2` with the bucket's color + icon + date-fns `formatDistanceToNow` label. Null-safe: undefined timestamp renders the expired pill with "Expired".
  - Unit test: 4 bucket branches + null branch, using `jest.useFakeTimers()` to freeze `Date.now()`.

- [ ] 2.13 [frontend] [sonnet] Build `UserScopeChip` component.
  - Blocked on: 2.3.
  - File: `ExportHistoryTab/UserScopeChip.tsx`.
  - Props: `filters: ExportHistoryRow['filters']`. Branches:
    - `filters?.user_ids?.[0] === '*'` → purple "All users"
    - `filters?.user_ids?.length > 0` → blue "{n} user(s)" (next-intl plural)
    - else → gray "Unknown scope"
  - Null-safe throughout.
  - Unit test: 4 branches including `filters = null` and `user_ids = undefined`.

- [ ] 2.14 [frontend] [sonnet] Build `HistoryRow` component.
  - Blocked on: 2.11, 2.12, 2.13.
  - File: `ExportHistoryTab/HistoryRow.tsx`.
  - Layout per `design.md`: v2 card row, left-group = export_type pill + record_count chip + UserScopeChip + ExpiresCountdownPill + DownloadCountBadge + downloaded-at relative time; right-group = two actions ("Load filters", "Download again").
  - Null-safe: every numeric uses `?? 0`, every date uses `formatDistanceToNow(new Date(ms))` with try/catch for malformed timestamps.
  - Props: `row: ExportHistoryRow`, `onLoadFilters(row)`, `onDownloadAgain(token)`. "Download again" disabled when bucket === `expired`.
  - Unit test: renders all pills for a fresh fixture row; "Download again" disabled for an expired row; clicking actions calls the correct props.

- [ ] 2.15 [frontend] [sonnet] Build the History tab shell: card list + offset pagination + empty/loading/error + expiring-soon banner.
  - Blocked on: 2.11, 2.14.
  - File: `ExportHistoryTab/index.tsx`.
  - Sticky toolbar with "Refresh" button (calls `refetch()`) and a right-aligned `{totalElements} exports` label.
  - Card list of `HistoryRow` components; below the list, a v2 page selector (`< 1 2 3 … > `) wired to `setPage`.
  - Expiring-soon banner: `rows.filter(r => bucketFor(r.expires_at?.timestamp) === 'urgent').length > 0` → show banner.
  - `isLoading` → `LoaderLFIQ`. `error` → `ErrorStateV2` with retry. Empty → `EmptyStateV2`.
  - "Download again" handler: call `exportReexportByToken(token)` → `saveAs(blob, filename)` → invalidate query so `download_count` updates.
  - "Load filters" handler: `setActiveTab('filter')` in the root; set `showLoadFiltersBanner = true`. Do not mutate form state.
  - Acceptance: render with fixture data showing all 4 expiry buckets; pagination cycles; empty state shows when payload is empty.

### 2.D Do Not Call List tab

- [ ] 2.16 [frontend] [sonnet] Build `useDncInfiniteQuery` hook (with kind multi-filter).
  - Blocked on: 2.3.
  - File: `DoNotCallListTab/useDncInfiniteQuery.ts`.
  - Wraps React Query `useInfiniteQuery` around `getDoNotCallList({ pageSize, search, currentCursor, kinds })`. Query key: `['dnc-list', { search, kinds }]`. `getNextPageParam = last => last.page.lastPage ? undefined : last.page.nextCursor`.
  - **`kinds: string[]`** — new optional array filter. If the existing `getDoNotCallList` api does not yet support a `kind` filter parameter, client-filter the flattened `rows` output by `kinds.includes(row.kind)` when `kinds.length > 0` (document this as a known limitation in the PR; opens follow-up for backend support). Prefer server-side filter when available.
  - Exposes `rows` (flattened across pages, post-filter), `page` (last page's metadata), `hasNextPage`, `fetchNextPage`, `isFetchingNextPage`, `isLoading`, `refetch`, `search`, `setSearch`, `kinds`, `setKinds`.
  - Debounced search: wrap `search` with `useDebouncedValue` (Mantine) or custom `useDebounce` at 500ms before putting into the key. `kinds` does not need debouncing.
  - Unit tests:
    - Mock API with 2 pages; initial load → page 1; `fetchNextPage` → appends page 2; setting `search` resets.
    - Setting `kinds = ['CallOptOut']` narrows the visible rows (client-filter path).

- [ ] 2.17 [frontend] [sonnet] Build `DNCRow` component.
  - Blocked on: 2.3.
  - File: `DoNotCallListTab/DNCRow.tsx`.
  - Layout: icon circle (`IconPhoneOff`) + phone number (monospace) + kind badge + "Added / Updated" relative time.
  - Props: `row: DoNotCallRow`.
  - Null-safe: `created` and `updated` are epoch-ms strings; `parseInt(row.created, 10)` guarded against NaN → "Unknown date" fallback.
  - Unit test: fresh row renders all fields; malformed `created` falls back to "Unknown date".

- [ ] 2.18 [frontend] [sonnet] Build the DNC tab shell: search + kind multi-filter + infinite list + admin gate.
  - Blocked on: 2.16, 2.17.
  - File: `DoNotCallListTab/index.tsx`.
  - Admin check at top: `const adminOnly = useAtomValue(isAdminState); if (!adminOnly) return null`.
  - Sticky toolbar:
    - left: phone-search `TextInput` (debounced, 500ms).
    - center: **Kind multi-select** — `MultiSelectField`-style chip group. Options: enum values of `kind` (e.g., `['CallOptOut']` plus any others in use). Binds to `kinds` from `useDncInfiniteQuery`. Chip tokens visible. "Select all" / "Clear all" shortcuts above the control.
    - right: `{totalElements} numbers` label.
  - Card list of `DNCRow`; below, a "Load more" button wired to `fetchNextPage` (disabled when `!hasNextPage`).
  - States: loading / empty / error use the shared v2 primitives.
  - Acceptance: with fixture data renders 10 rows + Load more; `fetchNextPage` appends another 10; search input debounces + resets list; toggling kind filter narrows rows immediately (no extra click).

### 2.E Integration, i18n, polish

- [ ] 2.19 [frontend] [haiku] Add i18n keys to `en.json` and `vi.json`.
  - Blocked on: 2.4 (for the tab labels), 2.10 (filter), 2.15 (history), 2.18 (DNC).
  - New namespace `ExportDatabaseV2` in both `src/messages/en.json` and `src/messages/vi.json`, per the key list in `design.md`.
  - Vietnamese translations are the BA's responsibility to deliver (can be AI-assisted draft; user reviews). Each key must be present in both files — key-parity is a hard gate.
  - Acceptance: no raw key strings render in either locale; `npm run build` succeeds.

- [ ] 2.20 [frontend] [haiku] Responsive polish.
  - Blocked on: 2.10, 2.15, 2.18.
  - Manual check at viewport widths: 320, 480, 768, 1024, 1440. Apply Tailwind responsive prefixes per `design.md` → Responsive (filter grid columns: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`; history row tier switch; DNC row stack). Fix any horizontal overflow.
  - Acceptance: no horizontal scroll at any tested width; tap targets ≥44px at ≤768px.

- [ ] 2.21 [frontend] [sonnet] Accessibility audit.
  - Blocked on: 2.10, 2.15, 2.18.
  - Tab through the page: focus ring visible on every interactive element; tab order is logical; `role="tablist"` + arrow-key nav works on the tab bar; icon-only buttons (chip close, DNC search clear, refresh) have `aria-label`.
  - Run axe-core (via `npm run lint:a11y` if present, or manual DevTools) — zero serious violations.
  - Acceptance: axe-core clean; keyboard-only navigation reaches every control; screen reader announces tab name + count.

- [ ] 2.22 [frontend] [sonnet] Unit tests — coverage sweep.
  - Blocked on: 2.7, 2.8, 2.9, 2.12, 2.13, 2.14, 2.17.
  - Ensure every new component/hook has a Jest test. Coverage ≥80% on changed files. Tests listed in `design.md` → Testing Strategy are the minimum set:
    - ExpiresCountdownPill (4 buckets + null)
    - UserScopeChip (4 branches)
    - ExportDatabaseV2 admin gate (render/hide)
    - QuotaMeter (3 color stops + skeleton)
    - AppliedFilterChips (render + remove)
    - useExportHistoryQuery (paginate + invalidate)
    - useDncInfiniteQuery (append + search reset)
    - FilterAndExportTab banner (appear + dismiss)
  - Acceptance: `npm test -- --coverage` reports ≥80% lines/branches for every new file.

- [ ] 2.23 [frontend] [sonnet] Build & smoke test.
  - Blocked on: every other Phase 2 task.
  - Run `npm run lint:fix`, `npm run build`, `npm run dev`. Manually smoke-test: run an estimate, download CSV, re-download from history, load filters (see banner), switch locale to vi, log in as non-admin (blank page), log in as admin (full page).
  - Acceptance: build passes, no ESLint errors, no console errors in the browser during smoke test, all file sizes <500 lines (ESLint `max-lines` rule).
