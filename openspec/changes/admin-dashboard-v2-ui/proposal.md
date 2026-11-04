# Proposal: Admin Dashboard V2 UI

## Problem / Motivation

The `(private)/dashboard-v2` route (shipped under `lf-iq-private-ui-redesign` / `dashboard-v2-redesign`) introduced a refined visual language for loan officer / realtor / homeowner users — sticky toolbar, Activity Overview section wrapper, redesigned summary cards, cohesive chart card shells, and a UI-version toggle (`uiVersionAtom`) so admins can opt into the new UI before the official release.

The admin route `(admin)/admin/dashboard` still uses the legacy v1 visuals (Mantine `Grid` with heavy `Divider`, plain `<h3>` heading, full-width SegmentedControl, no sticky toolbar, no section wrapper). When an admin flips the UI toggle to v2, only the private dashboard switches — the admin dashboard stays on v1, which is jarring and undermines the point of the toggle.

Admin dashboard has widgets private does not have: `LoanOfficerCard`, `LoanOfficerLineChart`, `PlanCard` — these must be preserved (data is not duplicated anywhere else).

## Proposed Solution

Create an admin dashboard v2 that is a **visual** port of `(private)/dashboard-v2` applied to the admin dashboard's widget set. No data logic changes, no backend changes, no widget additions or removals beyond preserving what admin v1 already shows.

- New folder: `src/app/[locale]/(admin)/admin/dashboard-v2/_components/Dashboard/index.tsx` (component only — no `page.tsx`, mirroring the private pattern).
- Rewrite `src/app/[locale]/(admin)/admin/dashboard/page.tsx` to use `withUIVersion(importV1, importV2)`, exactly like `(private)/dashboard/page.tsx`.
- Add the UI-version toggle to admin header (`AdminHeader/DesktopHeader` + `AdminHeader/MobileHeader`), mirroring the mechanic already in `PrivateHeader`. Reuse the shared `uiVersionAtom` — both headers write to the same persisted atom so toggling in one place flips everything.
- Admin v2 composition: four summary cards (`LoanOfficerCard`, `RealtorCard`, `HomeOwnerCard`, `PlanCard`) + three line charts (`LoanOfficerLineChart`, `RealtorLineChart`, `HomeOwnerLineChart`) + two bar charts (`HomeOwnerReportBarChart`, `TrackingBarChart`). Wrapped with `ActivityOverviewSection` and the sticky filter toolbar from dashboard-v2.
- Admin-only widgets that do not exist in private dashboard-v2 (`LoanOfficerCard`, `LoanOfficerLineChart`, `PlanCard`) get the same visual language treatment as their dashboard-v2 siblings — colored icon box, divider, `text-2xl font-bold` value, uppercase `tracking-wider` label, Mantine `Card` shell without gradient stripes — applied during task 1.

## Scope

### In scope (FE-only)
- Create `(admin)/admin/dashboard-v2/_components/Dashboard/index.tsx` with the v2 layout/visual wrapping the existing admin dashboard widgets.
- Port/restyle admin-only widgets (`LoanOfficerCard`, `PlanCard`, `LoanOfficerLineChart`) into the v2 visual language.
- Rewrite `(admin)/admin/dashboard/page.tsx` to use `withUIVersion`.
- Extend `AdminHeader/DesktopHeader` and `AdminHeader/MobileHeader` with the UI-version toggle (same atom, same tooltip keys).
- Extend `AdminDashboardPage` i18n namespace with any new keys needed for admin v2 (toolbar labels, subtitle, any admin-only card captions). Apply to all 7 locale files: `ar, en, es, he, ko, vi, zh`.
- Jest smoke tests for the v2 component and the `withUIVersion` wiring.

### Out of scope
- Any backend change (`getStatistics` and filter DSL unchanged).
- Any change to admin dashboard v1 page behavior or visuals.
- Adding / removing / renaming admin-only widgets (no `HomeOwnerReports` card in admin v2 — user explicitly opted out).
- Adding new admin-only metrics.
- Changing `uiVersionAtom` default or storage key.
- Changing menu/sidebar/route constants.
- Extracting a shared `UIVersionToggle` component is a nice-to-have; if it saves ≥20 lines of duplicated markup, do it under `src/shared/components/UIVersionToggle/`. Otherwise copy the mechanic inline (decision left to the implementer at task 4).

### Architectural constraints (strict)
- **No cross-route-group imports** — `(admin)` code MUST NOT import from `(private)` and vice-versa. Shared components live under `src/shared/...`. Any dashboard-v2 visual component needed by admin must be **copied** into `(admin)/admin/dashboard-v2/_components/`, not imported from `(private)/dashboard-v2/_components/`. See design.md §AD-6.

## Success Criteria

1. Admin user with `uiVersion === 'v2'` navigating to `/admin/dashboard` sees the dashboard-v2 visual language (sticky toolbar, `ActivityOverviewSection`, redesigned cards/charts) applied to the full admin widget set (LO + Realtor + HomeOwner + Plan cards + 3 line charts + 2 bar charts).
2. Admin user with `uiVersion === 'v1'` (default) navigating to `/admin/dashboard` sees exactly the current v1 experience — zero regression.
3. Toggling the UI version from the admin header (desktop or mobile) updates `uiVersionAtom`, persists across reload, and flips both `/admin/dashboard` and `/dashboard` views.
4. Admin dashboard v2 fetches the same `getStatistics` calls as v1 with `targetUser eq "ALL"` and the same group types (`PLAN`, `INTERNAL_LOAN_OFFICER`, `EXTERNAL_LOAN_OFFICER`, `INTERNAL_REALTOR`, `EXTERNAL_REALTOR`, `INTERNAL_HOME_OWNER`, `EXTERNAL_HOME_OWNER`, `REPORT`, `TRACKING`). No new groups, no removed groups.
5. `npm run build` passes. `npm run lint` passes. Jest tests pass. No hardcoded user-facing strings — every label goes through `useTranslations()`.
6. No use of forbidden Mantine components (`Stack`, `Group`, `Text`, `Title`) in new admin v2 code — Tailwind classes instead (per `feedback_mantine_tailwind_rules.md`).
7. All data reads from `getStatistics` payload use optional chaining / fallback defaults (per `feedback_null_checks.md`).

## Feature Branch

`feature/admin-dashboard-v2-ui` (to be created by DevOps from `production`, per `feedback_lf_iq_base_branch.md`).
