# Admin Plans v2 Redesign

## Metadata

- **Change name**: `admin-plans-v2`
- **Product**: `lf-iq` (Next.js 14.2 + Mantine 7.17 + Tailwind 3.4 + Jotai + next-intl + react-hook-form + joi)
- **Repo**: `github.com/LoanFactory-Inc/lf-iq`
- **Branch from**: `production` (NOT `master`)
- **Recommended feature branch**: `feature/admin-plans-v2`
- **Specs path**: `/Users/apple/Projects/agentflow/openspec/changes/admin-plans-v2/`
- **Mockups path**: `/Users/apple/Projects/agentflow/lf-iq/mockups/plans-v2/`
- **v1 path**: `lf-iq/src/app/[locale]/(admin)/admin/plans/`
- **v2 reference**: `lf-iq/src/app/[locale]/(admin)/admin/reports/`

## Problem

The v1 admin Plans surface at `/admin/plans` is visually inconsistent with the v2 admin family that already shipped (`reports-v2`, `users-v2`, `feedbacks-v2`, `homeowners-v2`):

- Bespoke colored stat tiles instead of the shared `StatCard` / `StatCardSkeleton` system.
- Ad-hoc filter row instead of a sticky toolbar with desktop-inline / mobile-drawer pattern.
- No view-mode toggle — only a fixed card grid, blocking scanning of long plan lists.
- Page header does not use shared `AdminPageHeader`, breaking the unified admin chrome.
- Mantine `Stack` / `Group` / `Text` / `Title` used for layout, contradicting the project's Tailwind-first rule for v2 surfaces.
- v1 strings are scattered across `Plan.*`, `Status.*`, `AdminPlanPage.*` namespaces, blocking translator hand-off and making future copy edits brittle.

This visual + structural debt blocks any future plan-management features (subscriber drill-down, plan analytics, lifecycle status, etc.) from shipping on the unified v2 foundation.

## Proposed solution

Mirror the established `admin/reports/_v2/` pattern end-to-end:

1. **Folder reorg (non-breaking)**: split `admin/plans/` into `_v1/` + `_v2/` siblings, with the top-level `page.tsx` becoming a 14-line `withUIVersion` delegator that matches `admin/reports/page.tsx` byte-for-byte in shape.
2. **v2 shell**: build new components in `_v2/_components/` reusing `StatCard`, `StatCardSkeleton`, and `AdminPageHeader` (no local copies). Sticky toolbar (search + reset + refresh + filter-toggle + view-mode segmented) matches `reports-v2`/`users-v2`. Mobile filter drawer mirrors `homeowners-v2`.
3. **HYBRID list body**: BOTH a v2-styled card grid AND a table view, switchable from a segmented toggle in the toolbar. Persisted via Jotai atom + localStorage; URL param `?view=` overrides for shareable links. Default `grid` (v1 parity).
4. **6-tile stat strip preserved**: Total / Active / Inactive / Monthly / Annual / Custom — composed from shared `StatCard`. Click-tile-to-filter shortcut preserved (resets page to 0).
5. **Detail in side drawer (~720px)** with tabs Overview / Features / Conditions; create + edit in modals. "Subscribe user" entry-point on card kebab, table-row kebab, and drawer header (admin-initiated assignment of a plan to a user — same intent as v1).
6. **FULL i18n separation**: every v2 string keyed under `AdminPlansV2.*` — NO reuse of v1 `Plan.*` / `Status.*` / `AdminPlanPage.*` keys from v2 components. All 7 locales populated (ar, en, es, he, ko, vi, zh).
7. **Visual system**: EXACT tokens copied from `lf-iq/mockups/reports-v2/` — `bg-[#FAFAFA]`, `border-[#E5E7EB] rounded-md`, `shadow-[0_1px_2px_0_rgb(17_24_39_/_0.04)]`, label `text-[11px] uppercase tracking-wider`, etc.

## Scope

### Phase 0 — Mockup gate (BLOCKING)

- Single consolidated HTML mockup at `lf-iq/mockups/plans-v2/index.html` covering ALL screens (list-card, list-table, toolbar variants, stat-strip, detail-drawer, create/edit modals, feature/condition modals, subscribe-user, empty/error/permission-denied).
- `README.md` with section index and design rationale.
- User sign-off REQUIRED before any Phase 1+ task is unblocked.

### Phase 1 — Folder reorg (non-breaking)

Move existing files into `_v1/` and install the `withUIVersion` delegator. v2 placeholder re-renders v1. No behavioural change in this phase.

### Phase 2 — v2 list screen

Build the new shell: page scaffold, stat strip, toolbar, filter (desktop inline + mobile drawer), card grid, table, view-mode hook, URL sync, pagination, empty + error + loading states.

### Phase 3 — v2 detail / edit / sub-flows

Side drawer with three tabs, create/edit modal, feature modal, condition modal, subscribe-user modal. Mutations wired with React Query invalidations and inline backend error surfacing.

### Phase 4 — i18n + polish + QA

Full `AdminPlansV2.*` key tree across all 7 locales, accessibility pass (keyboard, ARIA, focus trap, RTL), visual regression smoke at 320/768/1024/1440, lint + typecheck + Jest, pre-commit hook green.

## Out of scope

- Backend changes of any kind (the existing `getStatisticsSnapshot('PLAN')` and plan CRUD endpoints are reused as-is).
- Removing the v1 codebase. v1 remains behind `withUIVersion` for at least one sprint.
- Bulk operations on plans (multi-select, bulk activate/deactivate, etc.).
- Stripe UI / billing-provider configuration surfaces.
- Plan versioning, draft state, or lifecycle history.
- New analytics, time-series charts, or subscriber drill-down.
- Subscriber-list panel inside the plan detail drawer.
- DRAFT / ARCHIVED status — backend `Plan` entity only has `active: boolean`; lifecycle status is filed as a follow-up Beads issue (`needs-backend: plan-lifecycle-status`).

## Success criteria

1. `/admin/plans` URL is unchanged; the v1 ↔ v2 toggle (admin UI version switch) works without remount errors and v1 behaviour is byte-equivalent to before this change.
2. Zero local copies of `StatCard`, `StatCardSkeleton`, or `AdminPageHeader` inside `_v2/` (verified by import grep on `@shared/components` paths).
3. Sticky toolbar height, spacing, and shadow match `reports-v2` and `users-v2`.
4. Mobile filter drawer matches the `homeowners-v2` pattern (slide-from-right, full-height, dismissible).
5. All v1 capabilities preserved in v2: search, status filter, billing-cycle filter, URL sync, plan create, plan edit, plan view (Overview/Features/Conditions), subscribe user, refresh, reset filters.
6. Stat strip uses the same `getStatisticsSnapshot('PLAN')` endpoint as v1 — no new backend call.
7. Every user-facing string in `_v2/` resolves under the `AdminPlansV2.*` namespace; all 7 locale files (ar/en/es/he/ko/vi/zh) include the full key set.
8. View-mode default is `grid`; Jotai atom persists last choice to localStorage key `plans-v2-view-mode`; `?view=` URL param overrides.
9. Stat-card click filters the list and resets pagination to page 0.
10. No v1 regressions when toggle is set to v1.
11. `npx tsc --noEmit` exits 0; `npm run lint` exits 0; `npm test` (Jest) green; pre-commit hook (ESLint + Prettier + stylelint) passes on every staged file.
12. Mockups (`mockups/plans-v2/index.html` + `README.md`) approved by the user before any Phase 1+ task lands.

## Recommended feature branch

`feature/admin-plans-v2` — branched from `production`. All task sub-branches `agent/<bead-id>-<slug>` merge into this feature branch. Final PR: `feature/admin-plans-v2 → master` (auto), then `release → production` (ask).
