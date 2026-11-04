# Tasks: Dashboard V2 Redesign

## 1. Foundation

- [ ] 1.1 Create `dashboard-v2/page.tsx` + `layout.tsx` (copy from v1)
- [ ] 1.2 Add `DASHBOARD_V2` to `routes.ts`
- [ ] 1.3 Create shared `DashboardCard` wrapper component

## 2. Summary Cards (parallel)

- [ ] 2.1 Redesign HomeOwnerReportsCard (orange icon + IconReport)
- [ ] 2.2 Redesign HomeOwnerCard (blue icon + IconUser)
- [ ] 2.3 Redesign RealtorCard (violet icon + IconUserCheck)
- [ ] 2.4 Redesign TrackingCard (rose icon + IconActivity)

## 3. Chart Cards (parallel — wrap existing chart internals in new Card shell)

- [ ] 3.1 HomeOwnerReportBarChart — wrap in DashboardCard
- [ ] 3.2 HomeOwnerLineChart — wrap in DashboardCard
- [ ] 3.3 RealtorLineChart — wrap in DashboardCard
- [ ] 3.4 TrackingBarChart — wrap in DashboardCard

## 4. KPI Row

- [ ] 4.1 Create `DashboardKpiRow` — 4 KPI cards (Reports total / Homeowners total / Realtors total / Tracking total)

## 5. Orchestrator

- [ ] 5.1 Create `Dashboard` orchestrator (copy all logic from v1, wire new cards/charts, inject KPI row)

## 6. Verification

- [ ] 6.1 `npx tsc --noEmit` — zero errors
- [ ] 6.2 `npx eslint` — zero errors
- [ ] 6.3 `npm run build` — pass
