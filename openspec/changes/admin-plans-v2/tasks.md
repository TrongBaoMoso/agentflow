# Admin Plans v2 — Tasks

> **Branch model**: All tasks branch from and merge into `feature/admin-plans-v2` (which is itself branched from `production`). Task branches: `agent/<bead-id>-<slug>`. One commit per task: `feat: <title> [<bead-id>]`.

> **Repo path for code**: `/Users/apple/Projects/agentflow/lf-iq/`
> **Mockups path**: `/Users/apple/Projects/agentflow/lf-iq/mockups/plans-v2/`

> **Self-contained tasks**: each task includes the context a DEV agent needs without reading proposal.md / design.md. DEV agents work directly off Beads issue descriptions.

---

## Phase 0 — Mockups (BLOCKING — no Phase 1+ task may start before P0-2 closes)

- [ ] **P0-1** [design, frontend] Build consolidated HTML mockup at `lf-iq/mockups/plans-v2/index.html`
  - **Description**: Produce a SINGLE consolidated HTML mockup file at `lf-iq/mockups/plans-v2/index.html` (plus a sibling `README.md`) covering every screen of the Admin Plans v2 redesign. Use plain HTML + Tailwind via CDN (matching the pattern of existing `lf-iq/mockups/reports-v2/`). Implement section navigation via tab buttons / anchor links inside the single file — do NOT create per-screen separate HTML files.
  - **Sections to cover** (one section per screen state):
    1. List — card view (populated)
    2. List — table view (populated)
    3. Toolbar states: idle / dirty (filters applied, reset visible) / mobile-drawer-open / view-toggle interaction
    4. Stat strip states: loading skeleton / fully populated / one tile in active-ring (filter shortcut applied) / zero state
    5. Detail drawer (right, ~720px) — Overview tab / Features tab / Conditions tab
    6. Create plan modal
    7. Edit plan modal (with inline backend error showing on price field)
    8. Feature form modal
    9. Condition form modal
    10. Subscribe-user modal
    11. Empty state (no plans)
    12. Filtered-empty state (no results)
    13. Error state
    14. Permission-denied state
  - **Design tokens (mandatory exact match to `lf-iq/mockups/reports-v2/`)**: page background `bg-[#FAFAFA]`; card border `border-[#E5E7EB]`; corner radius `rounded-md`; shadow `shadow-[0_1px_2px_0_rgb(17_24_39_/_0.04)]`; section labels `text-[11px] uppercase tracking-wider`. Reference `lf-iq/mockups/reports-v2/01-list.html` directly.
  - **Responsive breakpoints**: 320 / 768 / 1024 / 1440. Each section must be visually correct at all four widths.
  - **README.md** must include: section index with links, design rationale (palette, density, hierarchy choices), token table, any open visual questions.
  - **Acceptance criteria**:
    - File `lf-iq/mockups/plans-v2/index.html` exists and opens cleanly in a browser.
    - File `lf-iq/mockups/plans-v2/README.md` exists with section index + rationale.
    - All 14 sections present and reachable via in-page navigation.
    - All token classes (bg/border/shadow/label) match `reports-v2` mockup spelling exactly.
    - Renders without overflow at 320 / 768 / 1024 / 1440.
    - No per-screen separate HTML files committed under `mockups/plans-v2/`.
  - **Dependencies**: none.
  - **Size**: L
  - **Labels**: design, frontend, mockup, lf-iq

- [ ] **P0-2** [gate] User sign-off on mockups
  - **Description**: Present the mockup file to the user for review. Collect either an explicit approval or a list of changes. Re-iterate P0-1 until approved. No Phase 1+ task may unblock until this issue is closed with status `approved`.
  - **Acceptance criteria**:
    - User confirms approval in writing on the Beads issue or PR comment.
    - Issue closed with reason `Mockups approved`.
  - **Dependencies**: P0-1.
  - **Size**: S
  - **Labels**: gate, design

---

## Phase 1 — Folder reorg (non-breaking)

- [ ] **P1-1** [frontend] Move `admin/plans/page.tsx` into `_v1/PlansPage.tsx`
  - **Description**: Move the current file `lf-iq/src/app/[locale]/(admin)/admin/plans/page.tsx` to `lf-iq/src/app/[locale]/(admin)/admin/plans/_v1/PlansPage.tsx`. Update all relative imports inside the moved file (`./_components/...` → `./_components/...` from inside `_v1/`). Update its default export to `PlansPage` and ensure the `'use client'` directive remains the first line. Remove `page.tsx` at the original location (P1-3 replaces it).
  - **Acceptance criteria**:
    - File `lf-iq/src/app/[locale]/(admin)/admin/plans/_v1/PlansPage.tsx` exists and contains the v1 page logic byte-equivalent to before the move (modulo updated import paths).
    - `npx tsc --noEmit` passes at this commit (the temporary missing `page.tsx` is OK only if combined with P1-3 in the same PR; otherwise commit P1-1+P1-2+P1-3 together).
  - **Dependencies**: P0-2.
  - **Size**: S
  - **Labels**: frontend, lf-iq, reorg

- [ ] **P1-2** [frontend] Move `admin/plans/_components/*` into `_v1/_components/*`
  - **Description**: Move the entire `_components/` folder from `lf-iq/src/app/[locale]/(admin)/admin/plans/_components/` to `lf-iq/src/app/[locale]/(admin)/admin/plans/_v1/_components/`. The 12 sub-folders (`ActionMenu`, `ConditionCard`, `Conditions`, `FeatureCard`, `Features`, `OverView`, `PlanCard`, `PlanConditionModal`, `PlanFeatureModal`, `PlanModal`, `SubscribeUserModal`, `ViewPlanModal`) plus their internal files. Update import paths inside each moved file if any reference `../_components/...` or `./_components/...` from outside the new location. Update imports in `_v1/PlansPage.tsx` so its `./_components/...` paths resolve.
  - **Acceptance criteria**:
    - Folder `lf-iq/src/app/[locale]/(admin)/admin/plans/_v1/_components/` contains all 12 component sub-folders.
    - No references to the old `(admin)/admin/plans/_components/` path remain anywhere in the repo (`grep -r "admin/plans/_components" lf-iq/src` returns 0 hits except inside `_v1/`).
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P1-1.
  - **Size**: S
  - **Labels**: frontend, lf-iq, reorg

- [ ] **P1-3** [frontend] Install `withUIVersion` delegator at `admin/plans/page.tsx`
  - **Description**: Create a new `lf-iq/src/app/[locale]/(admin)/admin/plans/page.tsx` that mirrors `lf-iq/src/app/[locale]/(admin)/admin/reports/page.tsx` byte-for-byte in shape. Content:
    ```tsx
    'use client'

    import { withUIVersion } from '@shared/components/withUIVersion'

    const PlansPage = withUIVersion(
      () => import('./_v1/PlansPage'),
      () => import('./_v2/PlansPage')
    )

    const AdminPlansPage = () => {
      return <PlansPage />
    }

    export default AdminPlansPage
    ```
  - **Acceptance criteria**:
    - File exists with exactly the structure above.
    - `npx tsc --noEmit` passes.
    - Visiting `/admin/plans` in dev with v1 toggle shows the original UI.
  - **Dependencies**: P1-1, P1-2.
  - **Size**: S
  - **Labels**: frontend, lf-iq

- [ ] **P1-4** [frontend, test] Add `_v2/PlansPage.tsx` placeholder + smoke test v1↔v2 toggle
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/PlansPage.tsx` as a minimal placeholder that imports and re-renders `_v1/PlansPage` (until Phase 2 lands). Manually toggle v1 ↔ v2 in the admin UI version switch and verify: no remount errors in the console, both toggles render the same v1 UI, no React-key warnings, no i18n missing-key warnings. Document the smoke-test outcome in the PR description.
  - **Acceptance criteria**:
    - File `_v2/PlansPage.tsx` exists and exports a default React component.
    - Manual toggle test logged in PR description with screenshots.
    - `npx tsc --noEmit` passes.
    - `npm run lint` passes.
  - **Dependencies**: P1-3.
  - **Size**: S
  - **Labels**: frontend, lf-iq, test

---

## Phase 2 — v2 list screen

- [ ] **P2-1** [frontend] Scaffold `_v2/PlansPage.tsx`
  - **Description**: Replace the placeholder from P1-4 with the v2 shell. Compose `<AdminPageHeader title={t('AdminPlansV2.page_title')} subtitle={t('AdminPlansV2.page_subtitle')}>`, then layout placeholders for `<PlansStatStrip />`, `<PlansToolbar />`, `<PlansFilters />`, list body, `<Pagination />`. No data wiring yet — components rendered will be added in subsequent tasks. Use `bg-[#FAFAFA]` page background and matching token spacing from `_v2` reports for `<main>` shell.
  - **Acceptance criteria**:
    - `_v2/PlansPage.tsx` renders without runtime error and shows `<AdminPageHeader>` + named placeholder regions.
    - No local copy of `AdminPageHeader` — imported from `@shared/components`.
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P1-4.
  - **Size**: S
  - **Labels**: frontend, lf-iq

- [ ] **P2-2** [frontend] Build `PlansStatStrip.tsx` (6 × StatCard, no local copies)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlansStatStrip.tsx`. Compose 6 instances of `<StatCard>` from `@shared/components/StatCard` with tones `brand`, `success`, `danger`, `info`, `amber`, `ink` (in that order: Total / Active / Inactive / Monthly / Annual / Custom). Read data via `usePlanStats()` (P2-3 will land hook earlier or in same PR — co-deliver if needed). API endpoint: `getStatisticsSnapshot('PLAN')` returning `{ TOTAL, ACTIVE, INACTIVE, BILLING_MONTHLY, BILLING_ANNUAL, BILLING_CUSTOM }`. While loading, render 6 × `<StatCardSkeleton>`. Each tile is clickable: clicking applies the corresponding filter (`status='ACTIVE'`, `billingCycle='MONTHLY'`, etc.) and resets `page` to 0. Total tile clears all filters.
  - **Constraints**:
    - NO local copy of `StatCard` or `StatCardSkeleton`.
    - All labels via `t('AdminPlansV2.stat.*')`.
  - **Acceptance criteria**:
    - File exists at the path above; renders 6 tiles with the right tones.
    - `grep -r "from './StatCard'" lf-iq/src/app/\[locale\]/\(admin\)/admin/plans/_v2` returns 0 hits.
    - Click-to-filter works against the page filter state via prop callback.
    - Loading skeleton renders 6 tiles.
    - `npx tsc --noEmit` passes; `npm run lint` passes.
  - **Dependencies**: P2-1.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P2-3** [frontend] Build `usePlanFilters` hook (URL-synced, debounced 300ms)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_hooks/usePlanFilters.ts`. The hook reads/writes filter state to URL search params (`search`, `status`, `billingCycle`, `page`, `limit`). Search input is debounced 300ms before being committed to URL. Use the existing `useUrlParams` utility used by `admin/reports/_v2` (find via `grep -rn "useUrlParams" lf-iq/src/app/\[locale\]/\(admin\)/admin/reports/_v2`). Returns: `{ filters, setFilters, reset, page, setPage, limit, setLimit }`. Provide a helper `buildPlansFilter(filters)` that returns the OData-like string `getPlans` expects, e.g. `active eq true and billingCycle eq "MONTHLY"`.
  - **Acceptance criteria**:
    - Hook exists; types exported.
    - URL changes round-trip correctly (back/forward navigation works).
    - 300ms debounce on search confirmed via test or smoke.
    - `reset()` clears all filters and returns page to 0.
    - `buildPlansFilter` covered by Jest unit test (3 cases: all empty, status only, status + billing).
  - **Dependencies**: P2-1.
  - **Size**: M
  - **Labels**: frontend, lf-iq, test

- [ ] **P2-4** [frontend] Build `useViewMode` hook (Jotai + localStorage + ?view= override)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_hooks/useViewMode.ts`. Define a Jotai atom typed `'grid' | 'table'` persisted to `localStorage` key `plans-v2-view-mode` via `atomWithStorage`. On mount, read URL `?view=` param: if `grid` or `table`, write through to atom (overrides localStorage). Subsequent `setViewMode` calls update both atom (auto-persists) and URL. SSR-safe: initial render returns `'grid'` and reconciles in `useEffect` to avoid hydration mismatch. Wrap localStorage access in try/catch (private-mode safety).
  - **Acceptance criteria**:
    - Hook exists; returns `[viewMode, setViewMode]`.
    - URL param `?view=table` on first load yields `viewMode === 'table'`.
    - localStorage value persists across page reloads when no `?view=` is present.
    - Hydration mismatch warnings absent in dev console.
    - Jest unit test covers: default, URL override, localStorage round-trip, invalid `?view=` value ignored.
  - **Dependencies**: P2-1.
  - **Size**: M
  - **Labels**: frontend, lf-iq, test

- [ ] **P2-5** [frontend] Build `PlansToolbar.tsx` (sticky, search + reset + refresh + filter-toggle + view-mode segmented)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlansToolbar.tsx`. Container is `sticky top-20 z-20 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3` (mirror `reports-v2` toolbar). Layout:
    - Left: search input bound to `filters.search` (placeholder `t('AdminPlansV2.toolbar.search_placeholder')`).
    - Right: Reset button (Tabler `IconRotate`, visible only when filters dirty), Refresh button (Tabler `IconRefresh`, icon-only with `aria-label`), mobile filter-toggle button (Tabler `IconFilter`, hidden `md:hidden`), view-mode segmented (two icon buttons `IconLayoutGrid` / `IconList`, `role="radiogroup"`).
    - Segmented toggle: arrow-key nav, `aria-checked` per option. Active visual: `bg-white shadow-[inset_0_0_0_1px_#E5E7EB]`; inactive: `text-[#6B7280] hover:text-[#111827]`.
  - **Props**: `{ filters, onFiltersChange, onReset, onRefresh, onOpenMobileFilters, viewMode, onViewModeChange }`.
  - **Acceptance criteria**:
    - File exists; renders correctly at desktop and mobile widths.
    - Keyboard arrow-key nav on segmented works.
    - Reset button hidden when no filter dirty.
    - All strings via `t('AdminPlansV2.toolbar.*')` and `t('AdminPlansV2.view_mode.*')`.
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P2-3, P2-4.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P2-6** [frontend] Build `PlansFilters.tsx` (desktop inline + mobile drawer)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlansFilters.tsx`. Desktop layout: inline row with status select (`All / Active / Inactive`) and billing-cycle select (`All / Monthly / Annual / Custom`). Mobile layout: same controls inside a Mantine `Drawer` (`position="right"`, `size={320}`, slide-from-right) opened by the toolbar's filter-toggle. Controlled by `usePlanFilters` upstream — no local state.
  - **Props**: `{ filters, onFiltersChange, isMobileDrawerOpen, onMobileDrawerClose }`.
  - **Strings**: `t('AdminPlansV2.filters.*')`, `t('AdminPlansV2.status.*')`, `t('AdminPlansV2.billing.*')`.
  - **Acceptance criteria**:
    - File exists.
    - Desktop renders inline below toolbar.
    - Mobile renders inside Drawer when `isMobileDrawerOpen=true`.
    - Both selects round-trip with URL state via `usePlanFilters`.
    - Drawer pattern matches `homeowners-v2` mobile filter (verify visual against that file).
  - **Dependencies**: P2-3, P2-5.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P2-7** [frontend] Build `PlansCardGrid.tsx`
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlansCardGrid.tsx`. Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Each card is a Tailwind-only article: `bg-white border border-[#E5E7EB] rounded-md shadow-[0_1px_2px_0_rgb(17_24_39_/_0.04)] p-5 hover:shadow-md transition`. Card body sections: name (heading), description (subtle text), price + billing cycle, status pill, subscribers count. Kebab menu (Tabler `IconDots`) at top-right with items: View / Edit / Subscribe user / Delete (each calls a prop callback). Loading state: render 6 skeleton cards (use `<div>` + `animate-pulse` Tailwind, mirror `reports-v2` skeleton style).
  - **Constraints**:
    - NO Mantine `Stack` / `Group` / `Text` / `Title` for layout — Tailwind classes only.
    - All strings via `t('AdminPlansV2.card.*')` / `t('AdminPlansV2.status.*')` / `t('AdminPlansV2.billing.*')`.
  - **Props**: `{ plans, isLoading, onView, onEdit, onSubscribe, onDelete }`.
  - **Acceptance criteria**:
    - File exists; renders grid at 1/2/3 columns at the right breakpoints.
    - Kebab menu opens, items dispatch callbacks.
    - Loading state renders 6 skeleton cards.
    - No Mantine layout primitives in the file (`grep -E "Stack|Group|<Text|<Title" PlansCardGrid.tsx` returns 0).
    - `npx tsc --noEmit` + `npm run lint` pass.
  - **Dependencies**: P2-3.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P2-8** [frontend] Build `PlansTable.tsx` + `PlanRowSummary.tsx`
  - **Description**: Create `PlansTable.tsx` and `PlanRowSummary.tsx` in `_v2/_components/`. Semantic `<table>` with sticky header. Columns: Name / Billing cycle / Price / Status / Subscribers / Actions (kebab). Header row uses `text-[11px] uppercase tracking-wider`. Row hover: `hover:bg-[#FAFAFA]`. Row body via `PlanRowSummary` (one row per plan). Kebab actions identical to `PlansCardGrid`. Loading state: 5 skeleton rows. Sortable columns Name and Price are out-of-scope for this task — render plain headers; if delivering sort, lift state into URL via `usePlanFilters` (`sort` param) and document.
  - **Props (table)**: `{ plans, isLoading, onView, onEdit, onSubscribe, onDelete }`.
  - **Acceptance criteria**:
    - Files exist.
    - Table renders correctly at 1024 / 1440; horizontal scroll at <768 wrapped in `overflow-x-auto`.
    - All strings via `t('AdminPlansV2.table.col.*')`.
    - Empty `<tbody>` shows the empty-state row (delegated to P2-10 visual).
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P2-3.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P2-9** [frontend] Wire `PlansPage.tsx` end-to-end (hook composition + view-mode switching + pagination)
  - **Description**: Replace placeholders in `_v2/PlansPage.tsx` with real composition: read `usePlanFilters`, `useViewMode`, React Query `usePlans({ search, filter: buildPlansFilter(filters), page, limit })` (key `['plans', { search, status, billingCycle, page, limit }]`, stale time 15s), `usePlanStats()`. Render `<PlansStatStrip>` (clicks call `setFilters` + `setPage(0)`), `<PlansToolbar>`, `<PlansFilters>`, then either `<PlansCardGrid>` or `<PlansTable>` based on `viewMode`. Below list, render shared `<Pagination>` bound to `page` / `limit` / `total`. Pass mutation handlers (created in P3-5) as `onView` / `onEdit` / `onSubscribe` / `onDelete` callbacks — for now stub them with `console.log` until P3 lands.
  - **Acceptance criteria**:
    - `/admin/plans` with v2 toggle on renders header + stats + toolbar + filters + grid + pagination.
    - Switching view-mode toggle changes the body between grid and table without page reload.
    - URL updates as filters change.
    - Stat-tile click filters the list and resets `page=0`.
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P2-2, P2-3, P2-4, P2-5, P2-6, P2-7, P2-8.
  - **Size**: L
  - **Labels**: frontend, lf-iq

- [ ] **P2-10** [frontend] Empty / no-results / error / loading states
  - **Description**: Add the four states matching `reports-v2` visual pattern:
    - Empty (no plans at all): icon + `t('AdminPlansV2.empty.no_plans.title')` + `t('AdminPlansV2.empty.no_plans.subtitle')` + create-plan CTA.
    - No-results (filters yield no plans): icon + `t('AdminPlansV2.empty.no_results.title')` + `t('AdminPlansV2.empty.no_results.subtitle')` + Reset filters button.
    - Error: icon + `t('AdminPlansV2.error.generic.title')` + `t('AdminPlansV2.error.generic.subtitle')` + `t('AdminPlansV2.action.retry')` button (calls `refetch`).
    - Loading: skeleton grid (6 cards) or skeleton table (5 rows) per current view-mode.
  - Reuse a shared `<EmptyState>` / `<ErrorState>` if it already exists under `@shared/components/`; otherwise build a small local component `_v2/_components/PlansListEmpty.tsx` and document why a shared one was not introduced.
  - **Acceptance criteria**:
    - All four states reachable via dev: turn off backend (error), set impossible filter (no-results), fresh DB (empty), normal load (loading skeleton flashes).
    - All strings via `t('AdminPlansV2.empty.*')` / `t('AdminPlansV2.error.*')` / `t('AdminPlansV2.action.retry')`.
    - Visual matches mockup section 11/12/13 from `mockups/plans-v2/index.html`.
  - **Dependencies**: P2-9.
  - **Size**: M
  - **Labels**: frontend, lf-iq

---

## Phase 3 — v2 detail / edit / sub-flows

- [ ] **P3-1** [frontend] Build `PlanDetailDrawer.tsx` (720px right drawer, three tabs)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlanDetailDrawer.tsx`. Use Mantine `Drawer` with `position="right"`, `size={720}`, `trapFocus`, `lockScroll`. Header row: plan name + status pill + close button + actions ("Subscribe user" → opens `SubscribeUserModal`; "Edit" → opens `PlanFormModal` mode=edit). Body: tabs `Overview` / `Features` / `Conditions`. Adapt the v1 `_v1/_components/OverView`, `Features`, `Conditions` content but rewrite layout to semantic HTML + Tailwind only — replace every Mantine `Stack` / `Group` / `Text` / `Title`. Data: React Query `usePlan(planId)` (key `['plan', planId]`). Loading state: skeleton inside drawer body.
  - **Props**: `{ planId, isOpen, onClose, onEdit, onSubscribe }`.
  - **Strings**: `t('AdminPlansV2.drawer.*')`.
  - **Acceptance criteria**:
    - Drawer opens at 720px on desktop; full-width slide-from-right on mobile.
    - Tabs work; ESC closes; focus trap verified.
    - No Mantine layout primitives in the file (`grep -E "Stack|Group|<Text|<Title" PlanDetailDrawer.tsx` returns 0).
    - All visible strings via `t('AdminPlansV2.drawer.*')`.
  - **Dependencies**: P2-9, P0-2.
  - **Size**: L
  - **Labels**: frontend, lf-iq

- [ ] **P3-2** [frontend] Build `PlanFormModal.tsx` (create + edit, react-hook-form + joi)
  - **Description**: Create `lf-iq/src/app/[locale]/(admin)/admin/plans/_v2/_components/PlanFormModal.tsx`. Single component handling both `mode='create'` and `mode='edit'` (when edit, accept `plan` prop and reset form with its values). Library: `react-hook-form` + `joi` resolver. Adapt the validation schema from v1 `_v1/_components/PlanModal` if still valid. Fields: name (text), description (textarea), price (number, min 0), billingCycle (select MONTHLY/ANNUAL/CUSTOM), active (Mantine `Switch`). On submit, call `createPlan` or `updatePlan` (P3-5 wires mutations). Surface backend errors inline: map `ApiBaseResponse` `errors[]` to `setError(field, { message })`; if no field is provided, render top-level `<Alert>` with the message. "Save" button shows loading state while pending. "Cancel" closes the modal and resets the form.
  - **Props**: `{ mode: 'create' | 'edit', plan?: Plan, isOpen, onClose, onSuccess }`.
  - **Strings**: `t('AdminPlansV2.form.*')`.
  - **Acceptance criteria**:
    - File exists; both modes work.
    - Joi validation triggers correctly (test name required, price positive).
    - Backend error attached to a field shows inline; otherwise top-level alert.
    - All strings via `t('AdminPlansV2.form.*')`.
    - `npx tsc --noEmit` passes; Jest unit test for the joi schema passes (3 cases minimum: valid, missing name, negative price).
  - **Dependencies**: P3-1.
  - **Size**: L
  - **Labels**: frontend, lf-iq, test

- [ ] **P3-3** [frontend] Build `FeatureFormModal.tsx` and `ConditionFormModal.tsx`
  - **Description**: Create `_v2/_components/FeatureFormModal.tsx` and `_v2/_components/ConditionFormModal.tsx`. Adapt v1 `PlanFeatureModal` and `PlanConditionModal` to the v2 visual language (Tailwind-only, no Mantine layout primitives). react-hook-form + joi schema (adapt from v1 if valid). Feature fields: name, description. Condition fields: name, value, operator. Same backend-error surfacing approach as `PlanFormModal`.
  - **Strings**: `t('AdminPlansV2.feature.*')` / `t('AdminPlansV2.condition.*')`.
  - **Acceptance criteria**:
    - Both files exist.
    - Validation works; backend errors surface inline.
    - All strings via the documented namespaces.
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P3-1.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P3-4** [frontend] Build `SubscribeUserModal.tsx`
  - **Description**: Create `_v2/_components/SubscribeUserModal.tsx`. Admin selects a user (search + select; reuse the same user-search utility v1 uses — locate via `grep -rn "SubscribeUserModal" lf-iq/src/app/\[locale\]/\(admin\)/admin/plans/_v1`). Submit calls `subscribeUserToPlan(planId, userId)`. On success, close modal and emit `onSuccess`. On error, surface inline.
  - **Props**: `{ planId, isOpen, onClose, onSuccess }`.
  - **Strings**: `t('AdminPlansV2.subscribe.*')`.
  - **Acceptance criteria**:
    - File exists.
    - User-select control works (matches or improves on v1 UX).
    - Success path shows toast (use the project's existing toast util — locate via `grep -rn "showNotification" lf-iq/src/app/\[locale\]/\(admin\)/admin/reports/_v2`).
    - All strings via `t('AdminPlansV2.subscribe.*')`.
  - **Dependencies**: P3-1.
  - **Size**: M
  - **Labels**: frontend, lf-iq

- [ ] **P3-5** [frontend] Wire mutations + React Query invalidations
  - **Description**: Wire create/edit/delete plan, subscribe-user, feature CRUD, and condition CRUD mutations from `_v2/PlansPage.tsx` and the modals/drawer. React Query invalidations:
    - `createPlan` → invalidate `['plans']` + `['plans', 'stats']`.
    - `updatePlan(id)` → invalidate `['plans']`, `['plan', id]`, `['plans', 'stats']`.
    - `deletePlan(id)` → invalidate `['plans']`, `['plans', 'stats']`. Confirm with backend whether the existing endpoint deletes or archives; if it archives, swap UX wording to `Deactivate` and update the relevant i18n value.
    - `subscribeUserToPlan(id)` → invalidate `['plan', id]` + `['plans']`.
    - Feature CRUD → invalidate `['plan', planId]`.
    - Condition CRUD → invalidate `['plan', planId]`.
  - Add a confirmation modal for delete (Mantine `Modal` or shared `<ConfirmDialog>`) using `t('AdminPlansV2.confirm.delete.*')`.
  - **Acceptance criteria**:
    - All mutation paths reachable from UI; success / error toasts surface.
    - Invalidation keys match exactly; UI refreshes after every mutation.
    - Delete confirmation required before mutation fires.
    - `npx tsc --noEmit` passes.
  - **Dependencies**: P3-1, P3-2, P3-3, P3-4.
  - **Size**: L
  - **Labels**: frontend, lf-iq

---

## Phase 4 — i18n + polish + QA

- [ ] **P4-1** [i18n] Add full `AdminPlansV2.*` key tree to English locale file
  - **Description**: Enumerate every user-facing string in `_v2/` components and add the complete `AdminPlansV2.*` key tree (see design.md §7) to `lf-iq/messages/en.json` (or whichever path the project uses — locate via `grep -rln "AdminReportsV2" lf-iq/messages/`). Keys must be snake_case under the `AdminPlansV2` CamelCase namespace. NO reuse of v1 `Plan.*` / `Status.*` / `AdminPlanPage.*` keys from v2 components — verify via `grep -rn "Plan\\.\\|Status\\.\\|AdminPlanPage\\." lf-iq/src/app/\[locale\]/\(admin\)/admin/plans/_v2/` returns 0 hits after this task.
  - **Acceptance criteria**:
    - `en.json` contains the full key tree from design.md §7.
    - No v2 component references a key outside `AdminPlansV2.*`.
    - `npm run dev` shows zero `MISSING_MESSAGE` warnings while clicking through the v2 surface.
  - **Dependencies**: P3-5.
  - **Size**: M
  - **Labels**: i18n, frontend, lf-iq

- [ ] **P4-2** [i18n] Mirror `AdminPlansV2.*` keys into 6 other locales
  - **Description**: Add the same key tree to `ar`, `es`, `he`, `ko`, `vi`, `zh` locale files. Prefer professional translations via the team's translator; for any value not yet translated, use `TODO_TRANSLATE:<English value>` as the placeholder so we can grep + complete in a follow-up sprint. Provide a translator checklist (single Markdown file `lf-iq/mockups/plans-v2/i18n-checklist.md`) listing every new key with its English source value.
  - **Acceptance criteria**:
    - All 7 locale files contain the same `AdminPlansV2.*` key set (verify with a small Node script or jq diff).
    - Checklist file exists and is committed.
    - `npm run dev` shows zero `MISSING_MESSAGE` warnings in any locale.
  - **Dependencies**: P4-1.
  - **Size**: L
  - **Labels**: i18n, lf-iq

- [ ] **P4-3** [frontend, a11y] Accessibility pass
  - **Description**: Validate the v2 surface against the a11y plan in design.md §10.
    - Keyboard nav: tab through toolbar / stat strip / list / pagination; arrow-key nav inside view-mode segmented; arrow keys to focus table column headers (if they become interactive).
    - ARIA: every icon-only button has `aria-label`; segmented toggle uses `role="radiogroup"`; drawer + modals confirm focus trap and return-focus-on-close.
    - Visible focus rings: `focus-visible:ring-2 focus-visible:ring-offset-2` on cards, table rows, all interactive controls.
    - RTL smoke for `ar` and `he`: toolbar order flips, drawer slides from left, table column order flips. Verify by toggling `dir="rtl"` on `<html>` or switching locale.
    - Color contrast: stat tiles `amber` and `info` against the inactive label color must meet WCAG AA; fix tones if not.
  - **Acceptance criteria**:
    - No critical issues from `axe-core` browser scan on the v2 page.
    - RTL smoke logged in PR with screenshots.
    - Manual keyboard walk-through logged in PR.
  - **Dependencies**: P4-2.
  - **Size**: M
  - **Labels**: frontend, a11y, lf-iq, test

- [ ] **P4-4** [test] Visual regression smoke at 320 / 768 / 1024 / 1440
  - **Description**: Capture screenshots (Playwright preferred; manual screenshots acceptable if Playwright is not yet wired) of: v1 preserved (toggle off), v2 grid (toggle on), v2 table, drawer open with all three tabs, create modal, edit modal with backend error, empty state, no-results state, error state. Capture each at 320 / 768 / 1024 / 1440. Attach to PR description.
  - **Acceptance criteria**:
    - Screenshot bundle attached to PR (link or zipped artifact).
    - v1 visual is byte-equivalent to before this change at all four widths (verify by diffing against a baseline screenshot taken before P1-1).
    - No overflow at 320; no horizontal scroll except where intentional (`PlansTable` mobile).
  - **Dependencies**: P4-3.
  - **Size**: M
  - **Labels**: test, frontend, lf-iq

- [ ] **P4-5** [test] Lint + typecheck + Jest + pre-commit hook green
  - **Description**: Run the full quality gate end-to-end:
    - `npx tsc --noEmit` exits 0.
    - `npm run lint` exits 0.
    - `npm test` (Jest) green — ensure new unit tests from P2-3, P2-4, P3-2 pass.
    - `git add` + `git commit` triggers the husky pre-commit hook (ESLint + Prettier + stylelint) and exits 0 on every staged file in this PR.
  - **Acceptance criteria**:
    - All four checks logged in PR with command output.
    - No `// @ts-expect-error` or `// eslint-disable-next-line` introduced without inline justification comments.
  - **Dependencies**: P4-4.
  - **Size**: S
  - **Labels**: test, frontend, lf-iq
