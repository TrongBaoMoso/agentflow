# Proposal: Dashboard V2 Redesign

## Problem
The existing `/dashboard` page uses legacy card styling (top gradient stripes, heavy colored backgrounds) that does NOT match the refined homeowners-v2 aesthetic shipped recently. We need a new `dashboard-v2` that mirrors the homeowners-v2 design language so the app feels cohesive end-to-end.

## Solution
Create `dashboard-v2` as a parallel route under `/dashboard-v2`. Keep 100% of the logic/data-fetching from v1, only redesign the UI to match homeowners-v2 patterns:

- Cards with colored icon boxes (w-9 h-9 rounded-lg bg-{color}-50 text-{color}-600)
- Divider between header and body
- Larger bold values (text-2xl font-bold)
- Uppercase labels with tracking-wider
- KPI row at the top for at-a-glance totals
- Clean Mantine `Card` wrapper (no gradient stripes)
- Responsive 2-column / 4-column grids

## Scope

### In scope
- New folder: `src/app/[locale]/(private)/dashboard-v2/`
- Copy Dashboard orchestrator logic (period selector, API calls, state)
- Redesigned summary cards: HomeOwnerReportsCard, HomeOwnerCard, RealtorCard, TrackingCard
- Wrapped chart cards (reuse existing Recharts internals, new Card shell): HomeOwnerReportBarChart, HomeOwnerLineChart, RealtorLineChart, TrackingBarChart
- New component: `DashboardCard` (shared v2 wrapper)
- New component: `DashboardKpiRow` (4 KPI cards at top)
- New route constant `DASHBOARD_V2` in `routes.ts`

### Out of scope
- Changes to v1 `/dashboard` page (untouched)
- Changes to API endpoints
- New data/widgets not in v1
- Menu/sidebar updates (user navigates via URL)

## Feature Branch
`feature/dashboard-v2-redesign`
