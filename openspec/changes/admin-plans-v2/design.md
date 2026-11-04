# Admin Plans v2 — Design

## 1. Current state (v1 summary)

- Entry: `lf-iq/src/app/[locale]/(admin)/admin/plans/page.tsx` — ~451 LOC client component owning page state, filters, modals, and list rendering.
- Components in `lf-iq/src/app/[locale]/(admin)/admin/plans/_components/` (~12 folders, ~2,116 LOC total):
  - `ActionMenu` — kebab dropdown for plan card.
  - `ConditionCard`, `Conditions` — feature-condition list and modal-driven editor.
  - `FeatureCard`, `Features` — feature list and modal-driven editor.
  - `OverView` — overview tab content (name/description/price/status).
  - `PlanCard` — card grid item.
  - `PlanConditionModal`, `PlanFeatureModal`, `PlanModal`, `SubscribeUserModal`, `ViewPlanModal` — Mantine modals.
- Visual system: bespoke colored tile statistics, ad-hoc filter row, no sticky toolbar, fixed card grid, Mantine `Stack`/`Group`/`Text`/`Title` for layout.
- i18n keys spread across `Plan.*`, `Status.*`, `AdminPlanPage.*` namespaces.
- API: `getPlans({ search, filter, page, limit })` — filter is OData-like `active eq true and billingCycle eq "MONTHLY"`. Stats: `getStatisticsSnapshot('PLAN')`. Mutations: create/update/delete plan; create/update/delete feature; create/update/delete condition; subscribe user.

## 2. Target folder layout

```
lf-iq/src/app/[locale]/(admin)/admin/plans/
├── page.tsx                            # 14 LOC withUIVersion delegator (matches reports/page.tsx shape)
├── _v1/
│   ├── PlansPage.tsx                   # moved from current page.tsx
│   └── _components/                    # moved from current _components/
│       ├── ActionMenu/
│       ├── ConditionCard/
│       ├── Conditions/
│       ├── FeatureCard/
│       ├── Features/
│       ├── OverView/
│       ├── PlanCard/
│       ├── PlanConditionModal/
│       ├── PlanFeatureModal/
│       ├── PlanModal/
│       ├── SubscribeUserModal/
│       └── ViewPlanModal/
└── _v2/
    ├── PlansPage.tsx                   # v2 shell, composes the components below
    ├── _components/
    │   ├── PlansToolbar.tsx            # sticky search + reset + refresh + filter-toggle + view-mode segmented
    │   ├── PlansFilters.tsx            # desktop inline + mobile drawer (status, billing-cycle)
    │   ├── PlansStatStrip.tsx          # 6 × <StatCard>
    │   ├── PlansCardGrid.tsx           # v2-styled card grid
    │   ├── PlansTable.tsx              # table view
    │   ├── PlanRowSummary.tsx          # row content factored from PlansTable
    │   ├── PlanDetailDrawer.tsx        # 720px right drawer (Overview/Features/Conditions)
    │   ├── PlanFormModal.tsx           # create + edit (mode prop)
    │   ├── FeatureFormModal.tsx        # create/edit feature
    │   ├── ConditionFormModal.tsx      # create/edit feature-condition
    │   └── SubscribeUserModal.tsx      # admin assigns plan → user
    └── _hooks/
        ├── usePlanFilters.ts           # URL-synced; debounced 300ms search
        ├── usePlanStats.ts             # React Query wrapper for getStatisticsSnapshot('PLAN')
        └── useViewMode.ts              # Jotai atom + localStorage + ?view= override
```

### Top-level delegator (`page.tsx`)

Identical shape to `admin/reports/page.tsx`:

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

## 3. Component breakdown

### `_v2/PlansPage.tsx` (~140 LOC)

- **Responsibility**: top-level v2 shell. Composes `<AdminPageHeader>`, `<PlansStatStrip>`, `<PlansToolbar>`, `<PlansFilters>`, list body (grid OR table), `<Pagination>`, and modals/drawer.
- **State**: drawer open + selected plan ID (local `useState`); create/edit modal open (local); subscribe modal open (local). Filters, page, view-mode all come from hooks (URL-synced).
- **Data**: React Query — `usePlans({ search, status, billingCycle, page, limit })`, `usePlanStats()`. Mutations passed down to children.

### `_v2/_components/PlansToolbar.tsx` (~120 LOC)

- **Props**: `{ filters, onFiltersChange, onReset, onRefresh, onOpenMobileFilters, viewMode, onViewModeChange }`.
- **Responsibility**: sticky `top-20 z-20` bar containing:
  - Left: debounced search input (300ms) bound to `filters.search`.
  - Right: reset button (visible when filters dirty), refresh button (icon), mobile filter-toggle button (visible `<md`), view-mode segmented (grid icon + table icon, Tabler `IconLayoutGrid` / `IconList`).
- **A11y**: search input labelled, icon buttons carry `aria-label`, segmented toggle has `role="radiogroup"` with arrow-key nav.

### `_v2/_components/PlansFilters.tsx` (~110 LOC)

- **Props**: `{ filters, onFiltersChange, isMobileDrawerOpen, onMobileDrawerClose }`.
- **Responsibility**: status select (`All / Active / Inactive`), billing-cycle select (`All / Monthly / Annual / Custom`). Desktop renders inline; mobile renders inside Mantine `Drawer` (slide-from-right, full-height) when `isMobileDrawerOpen`.
- **State**: none — controlled by `usePlanFilters` upstream.

### `_v2/_components/PlansStatStrip.tsx` (~140 LOC)

- **Responsibility**: composes `<StatCard>` ×6 from shared `@shared/components/StatCard`. Reads `usePlanStats()` (React Query, key `['plans', 'stats']`) — endpoint `getStatisticsSnapshot('PLAN')` returns `{ TOTAL, ACTIVE, INACTIVE, BILLING_MONTHLY, BILLING_ANNUAL, BILLING_CUSTOM }`. Loading state renders 6 × `<StatCardSkeleton>`.
- **Tones (one per metric)**: `brand` Total / `success` Active / `danger` Inactive / `info` Monthly / `amber` Annual / `ink` Custom. Final palette confirmed against mockups.
- **Click handler**: applies the corresponding filter (`status='ACTIVE'`, `billingCycle='MONTHLY'`, etc.) and resets page to 0. Total tile clears all filters.
- **NO local copy** of `StatCard` or `StatCardSkeleton`.

### `_v2/_components/PlansCardGrid.tsx` (~160 LOC)

- **Props**: `{ plans, isLoading, onView, onEdit, onSubscribe, onDelete }`.
- **Responsibility**: responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`). Each card uses Tailwind only — `bg-white border border-[#E5E7EB] rounded-md shadow-[0_1px_2px_0_rgb(17_24_39_/_0.04)] p-5 hover:shadow-md transition`. Card body shows name / description / price / billing cycle / status pill / subscriber count. Kebab menu (Tabler `IconDots`) with: `View` / `Edit` / `Subscribe user` / `Delete`. Loading state renders 6 skeleton cards.

### `_v2/_components/PlansTable.tsx` + `PlanRowSummary.tsx` (~180 LOC combined)

- **Props**: `{ plans, isLoading, onView, onEdit, onSubscribe, onDelete }`.
- **Responsibility**: semantic `<table>` with sticky header. Columns: Name, Billing cycle, Price, Status, Subscribers, Actions (kebab). Sortable columns: Name, Price (sort state lifted to URL via `usePlanFilters` `sort` param — optional; if not delivered in this scope, columns render as static and the toolbar omits a sort indicator).
- **Row hover**: `hover:bg-[#FAFAFA]`.
- **Empty `<tbody>` row**: shows empty state inside table when no results.

### `_v2/_components/PlanDetailDrawer.tsx` (~220 LOC)

- **Props**: `{ planId, isOpen, onClose, onEdit, onSubscribe }`.
- **Responsibility**: Mantine `Drawer` (`position="right"` `size={720}`). Header: plan name + close button + actions ("Subscribe user", "Edit"). Body: tabs `Overview` / `Features` / `Conditions`. Adapts v1 `OverView`, `Features`, `Conditions` content but converts every Mantine `Stack`/`Group`/`Text`/`Title` to semantic HTML + Tailwind. Focus-trap on open; ESC-to-close.
- **Data**: drawer fetches `getPlanById(planId)` (React Query key `['plan', planId]`).

### `_v2/_components/PlanFormModal.tsx` (~180 LOC)

- **Props**: `{ mode: 'create' | 'edit', plan?, isOpen, onClose, onSuccess }`.
- **Responsibility**: react-hook-form + joi schema (adapted from v1 — same validation rules; reused if schema valid). Fields: name (text), description (textarea), price (number), billingCycle (select: MONTHLY/ANNUAL/CUSTOM), active (switch). On submit: `POST /plans` (create) or `PATCH /plans/{id}` (edit). Backend errors surfaced inline next to the corresponding field via `setError`. "Save" + "Cancel" actions; loading state on Save while mutation pending.

### `_v2/_components/FeatureFormModal.tsx` (~120 LOC) and `ConditionFormModal.tsx` (~120 LOC)

- Adapted from v1 `PlanFeatureModal` / `PlanConditionModal`. Same form library + schema approach as `PlanFormModal`. Visual-only rewrite — Tailwind, no Mantine layout primitives.

### `_v2/_components/SubscribeUserModal.tsx` (~120 LOC)

- **Props**: `{ planId, isOpen, onClose, onSuccess }`.
- **Responsibility**: admin selects a user (search + select), submits `POST /plans/{id}/subscribe-user`. Adapted from v1; visual rewrite to Tailwind.

### `_v2/_hooks/usePlanFilters.ts` (~80 LOC)

- **Responsibility**: read/write filter state to URL. Debounced search (300ms). Returns `{ filters, setFilters, reset, page, setPage }`. Backed by existing `useUrlParams` util used by `reports-v2`.
- **URL keys**: `search`, `status` (`ACTIVE` | `INACTIVE` | `''`), `billingCycle` (`MONTHLY` | `ANNUAL` | `CUSTOM` | `''`), `page`, `limit`.

### `_v2/_hooks/usePlanStats.ts` (~30 LOC)

- React Query wrapper for `getStatisticsSnapshot('PLAN')`. Key: `['plans', 'stats']`. Stale time 30s.

### `_v2/_hooks/useViewMode.ts` (~60 LOC)

- Jotai atom `viewModeAtom` typed `'grid' | 'table'`. Persisted to `localStorage` key `plans-v2-view-mode` via `atomWithStorage`. SSR-safe: `useEffect` syncs after mount to avoid hydration mismatch.
- Reads `?view=` query param on mount and writes through to atom if valid; subsequent changes from the toolbar update both atom and URL param.

## 4. Data flow

### Read

- `getPlans({ search, filter, page, limit })`: `filter` is OData-like — `active eq true and billingCycle eq "MONTHLY"`. Built inside `usePlanFilters` (or a small helper `buildPlansFilter(filters)`).
- React Query key: `['plans', { search, status, billingCycle, page, limit }]`. Stale time 15s.
- `getStatisticsSnapshot('PLAN')`: `['plans', 'stats']`. Stale time 30s.
- `getPlanById(id)`: `['plan', id]`. Lazy — fires only when drawer opens.

### Write

- `createPlan(payload)` — invalidates `['plans']` + `['plans', 'stats']`.
- `updatePlan(id, payload)` — invalidates `['plans']`, `['plan', id]`, `['plans', 'stats']`.
- `deletePlan(id)` — invalidates `['plans']`, `['plans', 'stats']`. NOTE: confirm exact delete-vs-archive endpoint with backend before P3-5 lands.
- `subscribeUserToPlan(id, userId)` — invalidates `['plan', id]`, `['plans']` (subscribers count).
- `createFeature(planId, payload)` / `updateFeature` / `deleteFeature` — invalidate `['plan', planId]`.
- `createCondition(planId, featureId, payload)` / `updateCondition` / `deleteCondition` — invalidate `['plan', planId]`.

### Error surfacing

- All mutations use the project's `ApiBaseResponse<T>` envelope. Field-level errors come back as `{ field, message }` and are mapped onto the form via `setError(field, { message })`. Top-level errors render in a Mantine `Alert` at the top of the form/modal.

## 5. URL schema

```
/admin/plans?search=&status=&billingCycle=&page=&limit=&view=
```

- `view` ∈ `grid | table`. Precedence on first load: URL `?view=` > localStorage > default `grid`. Once mounted, toolbar changes write through to both URL and localStorage.

## 6. View-mode toggle UX

- Segmented icon button in the toolbar — two segments: `grid` (Tabler `IconLayoutGrid`) and `table` (Tabler `IconList`).
- Rendered as `role="radiogroup"` with two `role="radio"` buttons, each carrying `aria-checked` and an `aria-label` from i18n (`AdminPlansV2.view_mode.grid` / `AdminPlansV2.view_mode.table`).
- Keyboard: `ArrowLeft` / `ArrowRight` move focus + selection; `Enter` / `Space` activates focused option.
- Visual: active segment uses `bg-white shadow-[inset_0_0_0_1px_#E5E7EB]`; inactive `text-[#6B7280] hover:text-[#111827]`.

## 7. i18n strategy

**FULL separation under `AdminPlansV2.*` — v2 components must NOT reference any v1 keys (`Plan.*`, `Status.*`, `AdminPlanPage.*`).**

### Key tree (snake_case keys, CamelCase namespace)

```
AdminPlansV2.page_title
AdminPlansV2.page_subtitle

AdminPlansV2.cta.create_plan

AdminPlansV2.stat.total
AdminPlansV2.stat.active
AdminPlansV2.stat.inactive
AdminPlansV2.stat.billing_monthly
AdminPlansV2.stat.billing_annual
AdminPlansV2.stat.billing_custom

AdminPlansV2.toolbar.search_placeholder
AdminPlansV2.toolbar.reset
AdminPlansV2.toolbar.refresh
AdminPlansV2.toolbar.filters

AdminPlansV2.view_mode.grid
AdminPlansV2.view_mode.table

AdminPlansV2.filters.status_label
AdminPlansV2.filters.billing_cycle_label

AdminPlansV2.status.active
AdminPlansV2.status.inactive
AdminPlansV2.status.all

AdminPlansV2.billing.monthly
AdminPlansV2.billing.annual
AdminPlansV2.billing.custom
AdminPlansV2.billing.all

AdminPlansV2.table.col.name
AdminPlansV2.table.col.billing
AdminPlansV2.table.col.price
AdminPlansV2.table.col.status
AdminPlansV2.table.col.subscribers
AdminPlansV2.table.col.actions

AdminPlansV2.card.subscribers_count
AdminPlansV2.card.action.view
AdminPlansV2.card.action.edit
AdminPlansV2.card.action.subscribe_user
AdminPlansV2.card.action.delete

AdminPlansV2.drawer.tab.overview
AdminPlansV2.drawer.tab.features
AdminPlansV2.drawer.tab.conditions
AdminPlansV2.drawer.action.subscribe_user
AdminPlansV2.drawer.action.edit
AdminPlansV2.drawer.action.close

AdminPlansV2.form.title_create
AdminPlansV2.form.title_edit
AdminPlansV2.form.field.name
AdminPlansV2.form.field.description
AdminPlansV2.form.field.price
AdminPlansV2.form.field.billing_cycle
AdminPlansV2.form.field.active
AdminPlansV2.form.validation.name_required
AdminPlansV2.form.validation.price_positive
AdminPlansV2.form.validation.billing_cycle_required
AdminPlansV2.form.action.save
AdminPlansV2.form.action.cancel
AdminPlansV2.form.error.generic

AdminPlansV2.subscribe.title
AdminPlansV2.subscribe.user_select_label
AdminPlansV2.subscribe.user_select_placeholder
AdminPlansV2.subscribe.submit
AdminPlansV2.subscribe.cancel
AdminPlansV2.subscribe.success_message

AdminPlansV2.feature.add
AdminPlansV2.feature.edit
AdminPlansV2.feature.delete
AdminPlansV2.feature.empty_title
AdminPlansV2.feature.empty_subtitle
AdminPlansV2.feature.field.name
AdminPlansV2.feature.field.description

AdminPlansV2.condition.add
AdminPlansV2.condition.edit
AdminPlansV2.condition.delete
AdminPlansV2.condition.empty_title
AdminPlansV2.condition.empty_subtitle
AdminPlansV2.condition.field.name
AdminPlansV2.condition.field.value
AdminPlansV2.condition.field.operator

AdminPlansV2.empty.no_plans.title
AdminPlansV2.empty.no_plans.subtitle
AdminPlansV2.empty.no_results.title
AdminPlansV2.empty.no_results.subtitle

AdminPlansV2.error.generic.title
AdminPlansV2.error.generic.subtitle
AdminPlansV2.action.retry

AdminPlansV2.confirm.delete.title
AdminPlansV2.confirm.delete.body
AdminPlansV2.confirm.delete.confirm
AdminPlansV2.confirm.delete.cancel
```

Translators receive a single JSON dump per locale + a checklist (P4-2). Use `TODO_TRANSLATE:<en value>` markers where professional translation is deferred, so we can grep + complete in a follow-up sprint.

## 8. Backend status finding (DRAFT/ARCHIVED)

The backend `Plan` entity exposes only `active: boolean`. There is no DRAFT / ARCHIVED column or workflow. The v2 status filter therefore offers `Active / Inactive / All` only. Lifecycle status is filed as a follow-up Beads issue: `needs-backend: plan-lifecycle-status` — out of scope for this change.

## 9. Visual references

- Toolbar / sticky chrome: `lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/*Toolbar*` and `lf-iq/mockups/reports-v2/01-list.html`.
- Mobile filter drawer: `lf-iq/src/app/[locale]/(admin)/admin/(homeowners-v2|users-v2)/...`.
- Stat strip composition: `lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/StatStrip*`.
- Tokens: `bg-[#FAFAFA]`, `border-[#E5E7EB] rounded-md`, `shadow-[0_1px_2px_0_rgb(17_24_39_/_0.04)]`, label `text-[11px] uppercase tracking-wider`. Mirror exactly from `lf-iq/mockups/reports-v2/`.

## 10. Accessibility plan

- Keyboard: tab order toolbar → stat strip → list body → pagination; arrow-key navigation inside view-mode segmented and on table column headers.
- ARIA: icon-only buttons carry `aria-label`; segmented toggle uses `role="radiogroup"`/`role="radio"`; drawer + modals use Mantine's built-in dialog ARIA (verify focus trap + return-focus-on-close).
- Visible focus rings on cards, table rows, and all interactive controls (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- RTL smoke for `ar` and `he` locales — flip toolbar order, drawer slide direction, and table column order; verify with `dir="rtl"` on `<html>`.
- Color-contrast check on stat tiles (especially `amber` and `info` tones).

## 11. Risk & mitigations

| Risk | Mitigation |
|---|---|
| Table render perf with many plans | Default `limit=25`, keep React Query caching on; virtualization only if real-world latency proves it necessary (out of scope this sprint). |
| Drawer focus-trap edge cases | Use Mantine `Drawer` with `trapFocus + lockScroll`; manual smoke test in P4-3. |
| View-mode SSR hydration mismatch | `atomWithStorage` reads in `useEffect`; server render uses `'grid'` default and the URL param when present. |
| localStorage quota / private mode | Wrap `atomWithStorage` access in try/catch; fall back to in-memory atom value. |
| i18n churn from full separation | Single key dump per locale + checklist; translator sign-off before P4-5 closes. |
| Backend delete-vs-archive endpoint divergence | Confirm with backend before P3-5; if delete is unsafe, swap UX wording to "Deactivate". |
| Stat-card click filter conflicts with active filters | Tile-click replaces the relevant filter and resets page; total-tile clears all. Documented in component contract. |

## 12. Rollout plan

1. Land Phase 0 mockup + sign-off.
2. Land Phase 1 reorg (non-breaking) — verify v1 toggle.
3. Land Phase 2 v2 list — feature-flag implicit through `withUIVersion` toggle.
4. Land Phase 3 v2 detail + sub-flows.
5. Land Phase 4 i18n + QA.
6. Soak in staging for one sprint; admin-team smoke test against the real `getPlans` + stats endpoints.
7. Schedule a separate change to deprecate / remove `_v1/`.
