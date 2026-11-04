# Tasks: Redesign Dashboard V2 Chart Components

**Repo:** `lf-iq`
**Feature branch:** `feature/redesign-dashboard-v2-charts` (from `production`)
**Mockup:** `openspec/changes/redesign-dashboard-v2-charts/mockup.html`

All tasks live in the `lf-iq` repo. Each task creates its own `agent/<bead-id>-<short-desc>` branch off the feature branch, runs `npm run build` and `npm test` before closing, and merges back into the feature branch.

---

## Phase 1 — Pilot: Redesign `HomeOwnerLineChart`

Phase 1 validates the shared-helpers pattern end-to-end on the most complex chart. Tasks 1.1 and 1.2 can run in parallel; 1.3 depends on both; 1.4 depends on 1.3 (needs to know exactly which keys the refactor consumes); 1.5 depends on 1.3.

### 1.1 [frontend] [sonnet] Create shared `ChartLegend` component

**Affected files:**
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartLegend/index.tsx`
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartLegend/__tests__/index.test.tsx`

**Description:**
Implement the compact horizontal legend described in `design.md` → "Shared Components → `ChartLegend`". Semantic `<ul>`/`<li>`, colour swatch resolved from Mantine theme via `useMantineTheme()`, Tailwind classes only (no Mantine `Stack/Group/Text`), dark-mode variants included.

**Acceptance criteria:**
- Component exports a default `ChartLegend` and the `ChartLegendSeries` / `ChartLegendProps` types.
- Renders one `<li>` per series with a 2×2 rounded swatch and the provided label.
- Resolves Mantine colour tokens like `'blue.6'` to hex via `useMantineTheme()`; passes through raw CSS colours unchanged.
- Returns `null` when `series` is empty (no empty `<ul>` in DOM).
- Snapshot test with 3 series passes; clicking nothing (passive component) has no interactive state to assert.
- `npm run build` and `npm test` green; file ≤ 120 lines.

---

### 1.2 [frontend] [haiku] Create shared `ChartFooterToggle` component

**Affected files:**
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartFooterToggle/index.tsx`
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartFooterToggle/__tests__/index.test.tsx`

**Description:**
Implement the footer strip described in `design.md` → "Shared Components → `ChartFooterToggle`". Thin top divider (`border-t` + `pt-2.5`), native `<button>` (NOT Mantine `<Button>`), `IconChevronUp` / `IconChevronDown` from `@tabler/icons-react`, dark-mode variants.

**Acceptance criteria:**
- Props exactly match the design: `isExpanded`, `onToggle`, `expandedLabel`, `collapsedLabel`.
- Button is keyboard-focusable (native `<button type="button">`).
- Snapshot test verifies both collapsed + expanded render, and that `onToggle` fires on click (`fireEvent.click`).
- Dark-mode classes (`dark:text-gray-400`, `dark:border-gray-800`, etc.) present on the correct elements.
- `npm run build` and `npm test` green; file ≤ 80 lines.

---

### 1.3 [frontend] [opus] Refactor `HomeOwnerLineChart` to new design

**Depends on:** 1.1, 1.2

**Affected files:**
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerLineChart/index.tsx`
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/DashboardCard/index.tsx` — widen `title` prop to `string | ReactNode`; add `dark:` variants on header text, divider, subtitle.
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_hooks/useChartTheme.ts`

**Description:**
Apply all 7 visual changes (a–g) from `design.md` to `HomeOwnerLineChart`:
- **a** — Replace the `title` string prop value with a JSX node: base phrase `text-sm md:text-base font-semibold` + muted suffix `text-xs font-normal text-gray-400 dark:text-gray-500`. Use new i18n key `Dashboard.homeowner_statistics_base` (added in task 1.4).
- **b** — Render `<ChartLegend series={displayedSeries} className="mb-3" />` above the chart body. Pass `withLegend={false}` to `<LineChart>`.
- **c** — Pass `withDots={false}` to `<LineChart>`.
- **e** — Replace the `trailing={toggleButton}` pattern with `<ChartFooterToggle>` rendered as a sibling below the chart (still inside `DashboardCard` body). Remove the `toggleButton` JSX block entirely. Pass `trailing={null}` to `DashboardCard`.
- **g** — Change `h={300}` → `h={260}` on `<LineChart>`; change the loader box to `h-[260px]`.
- Dark mode: create `_hooks/useChartTheme.ts` with the `useChartTheme` hook from `design.md`. Apply `xAxisProps` / `yAxisProps` / `gridProps` / `tooltipProps` on `<LineChart>` using the theme tokens. Verify the installed `@mantine/charts@7.17` forwards these props — if any prop is missing, fall back to CSS overrides in a co-located `.module.css`.
- Also edit `DashboardCard`: `title: string` → `title: string | ReactNode`; wrap the render so that if `title` is a string it keeps the existing `<h3>` markup, otherwise it renders the node inside the same slot. Add `dark:text-gray-100` / `dark:text-gray-400` / `dark:border-gray-800` on header elements.

**Acceptance criteria:**
- Visual parity with the mockup at desktop breakpoint (≥768px) in light mode — smaller title, muted period suffix, compact legend above chart, no dots on lines, 260px height, footer toggle strip.
- In dark mode (`<html class="dark">` or Mantine `colorScheme: 'dark'`), axis labels, gridlines, tooltip, card chrome render with dark tokens; no white tooltip background on dark card.
- "Show / Hide zero-value statuses" toggle still works: clicking adds/removes zero-value series from chart AND from the compact legend.
- Group filter behaviour (`combined | internal | external`) unchanged.
- Loading state renders `LoaderLFIQ` centred inside a `h-[260px]` box.
- No Mantine `Stack/Group/Text/Title` used in changed files.
- `DashboardCard`'s string-title callers (e.g. other dashboard cards) still render identically — manual regression check.
- `npm run build` passes (TypeScript + Next.js production build).
- `npx tsc --noEmit` passes.

---

### 1.4 [frontend] [haiku] Add i18n keys for HomeOwnerLineChart title split

**Depends on:** 1.3

**Affected files:**
- EDIT: `lf-iq/src/messages/en.json`
- EDIT: `lf-iq/src/messages/vi.json`

**Description:**
Add one new key in each locale for the base phrase (the muted `({period})` suffix is rendered from existing `Date.daily|monthly|yearly` keys, not from these new keys):

- `Dashboard.homeowner_statistics_base` → `"New Homeowners"` (en) / `"Chủ nhà mới"` (vi)

Keep the existing `Dashboard.homeowner_statistics` key unchanged — it's still referenced by other surfaces.

**Acceptance criteria:**
- Both keys present in both files under the `Dashboard` namespace.
- JSON files still valid (lint: `npm run lint` passes; no trailing comma / duplicate keys).
- `snake_case` key naming.
- `useTranslations()` call in `HomeOwnerLineChart` resolves the new key without a console warning.

---

### 1.5 [frontend] [sonnet] Add Jest snapshot tests for `HomeOwnerLineChart`

**Depends on:** 1.3

**Affected files:**
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerLineChart/__tests__/index.test.tsx`

**Description:**
Render `HomeOwnerLineChart` with representative fixture data for `internalHomeOwnerData` + `externalHomeOwnerData`. Wrap in `NextIntlClientProvider` + `MantineProvider` for the test render. Assert:

1. Title text includes both the base phrase ("New Homeowners") and the muted period suffix.
2. Compact legend renders one `<li>` per non-zero series.
3. `withDots={false}` is reflected (snapshot or inspect `@mantine/charts` wrapper props).
4. `hasZeroOnlyStatuses === true` path renders the footer toggle with the "Show zero-value statuses" label.
5. Clicking the footer toggle flips the label to "Hide zero-value statuses" and reveals the zero-value series in the legend.
6. Loader renders inside a `h-[260px]` container when `loadingState.loading === true`.
7. Dark-mode render (wrap in `<MantineProvider defaultColorScheme="dark">`) includes `dark:text-gray-100` class on the title.

**Acceptance criteria:**
- `npm test -- HomeOwnerLineChart` green on first clean run.
- Snapshot file committed.
- No `act()` warnings in test output.
- Coverage of this component ≥ 80% (unit + interaction paths above).

---

## Phase 2 — Rollout to remaining 3 charts

**Depends on:** Phase 1 approval (user + tech-lead review of the pilot). Tasks 2.1, 2.2, 2.3 can run in parallel once Phase 1 is approved. 2.4 depends on 2.1 + 2.2 + 2.3. 2.5 depends on 2.4.

### 2.1 [frontend] [sonnet] Refactor `HomeOwnerReportBarChart`

**Depends on:** Phase 1 approval

**Affected files:**
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerReportBarChart/index.tsx`

**Description:**
Apply the same pattern as task 1.3, adapted for a bar chart:
- **a** — JSX title with muted `(period)` suffix, using new key `Dashboard.report_statistics_base`.
- **b** — `<ChartLegend>` above body; `withLegend={false}` on `<BarChart>`.
- **d** — Rounded bar tops: pass `barProps={{ radius: [2, 2, 0, 0] }}` to `<BarChart>`. Verify against `@mantine/charts@7.17` API — if `barProps` doesn't accept `radius`, use the Recharts `<Bar radius={[2,2,0,0]} />` pattern per Mantine's docs for that version.
- **e** — Footer toggle strip via `<ChartFooterToggle>`; `trailing={null}` on `DashboardCard`.
- **g** — `h={260}` + loader `h-[260px]`.
- Dark mode via `useChartTheme` hook from Phase 1.
- Do NOT alter the `chartData` memo or `SERIES_CONFIG` constant.

**Acceptance criteria:**
- Matches mockup at desktop; rounded bar tops visible.
- All interactions preserved (toggle, empty state).
- Dark-mode axis / grid / tooltip render correctly.
- `npm run build` + `npx tsc --noEmit` green.

---

### 2.2 [frontend] [sonnet] Refactor `RealtorLineChart`

**Depends on:** Phase 1 approval

**Affected files:**
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/RealtorLineChart/index.tsx`

**Description:**
Same pattern as 1.3, applied to `RealtorLineChart`:
- **a** — title uses new key `Dashboard.referral_partner_statistics_base`.
- **b, c, e, g** — identical to 1.3.
- Dark mode via `useChartTheme`.
- `groupFilter` handling unchanged.

**Acceptance criteria:**
- Visual parity with mockup.
- Toggle + group-filter behaviour unchanged.
- `npm run build` + `npx tsc --noEmit` green.

---

### 2.3 [frontend] [sonnet] Refactor `TrackingBarChart`

**Depends on:** Phase 1 approval

**Affected files:**
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/TrackingBarChart/index.tsx`

**Description:**
Same pattern as 2.1, applied to `TrackingBarChart`:
- **a** — title uses new key `Dashboard.tracking_statistics_base`.
- **b, d, e, g** — identical to 2.1.
- Dark mode via `useChartTheme`.
- 6-series legend must wrap gracefully on narrow cards — verify the `ChartLegend` `flex-wrap` behaviour keeps it readable.

**Acceptance criteria:**
- Visual parity with mockup.
- 6-series legend wraps to a second row on narrower widths without breaking layout.
- `npm run build` + `npx tsc --noEmit` green.

---

### 2.4 [frontend] [haiku] Add i18n keys for remaining 3 charts

**Depends on:** 2.1, 2.2, 2.3

**Affected files:**
- EDIT: `lf-iq/src/messages/en.json`
- EDIT: `lf-iq/src/messages/vi.json`

**Description:**
Add the three remaining `_base` keys in both locales:

| Key | en | vi |
|---|---|---|
| `Dashboard.report_statistics_base` | `New Reports` | `Báo cáo mới` |
| `Dashboard.referral_partner_statistics_base` | `New Agents` | `Đại lý mới` |
| `Dashboard.tracking_statistics_base` | `New Trackings` | `Theo dõi mới` |

Keep the existing `Dashboard.report_statistics`, `Dashboard.referral_partner_statistics`, `Dashboard.tracking_statistics` keys unchanged.

**Acceptance criteria:**
- All 3 keys present in both locale files.
- JSON valid, `snake_case`.
- `npm run lint` green.

---

### 2.5 [frontend] [sonnet] Add Jest snapshot tests for remaining 3 charts

**Depends on:** 2.4

**Affected files:**
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerReportBarChart/__tests__/index.test.tsx`
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/RealtorLineChart/__tests__/index.test.tsx`
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/TrackingBarChart/__tests__/index.test.tsx`

**Description:**
Replicate the Phase 1 snapshot + interaction pattern from task 1.5 for each of the remaining 3 charts, adjusted for their respective fixture shapes:
- `HomeOwnerReportBarChart` — fixture covers ACTIVE / INACTIVE / AWAITING_SEND / FAILED / PROCESSING types; assert `barProps.radius` present.
- `RealtorLineChart` — fixture covers INTERNAL + EXTERNAL realtor data, both `ACTIVE` + `PENDING`; assert `withDots={false}` and group-filter paths (`combined`, `internal`, `external`).
- `TrackingBarChart` — fixture covers all 6 tracking types; assert the legend wraps to 2 rows at narrow widths (can assert the `<ul>` has `flex-wrap` class in snapshot).

**Acceptance criteria:**
- `npm test` green.
- Coverage for all 3 components ≥ 80%.
- No flaky tests (run `npm test` 3 times; all pass).

---

## Phase 3 — Activity Overview wrapper

**Depends on:** Phase 1 approval. Does NOT depend on Phase 2 — this is a pure layout/section change and can run in parallel with Phase 2 rollout.

### 3.1 [frontend] [haiku] Create `ActivityOverviewSection` component

**Depends on:** Phase 1 approval

**Affected files:**
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ActivityOverviewSection/index.tsx`
- NEW: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ActivityOverviewSection/__tests__/index.test.tsx`

**Description:**
Implement the section wrapper per `design.md` → "Shared Components → `ActivityOverviewSection`". Semantic `<section aria-labelledby>` with `<h2>` header, optional subtitle, `toolbar` slot, `children` slot. Dark-mode tokens on the heading.

**Acceptance criteria:**
- Props match the design: `title`, `subtitle?`, `toolbar`, `children`, `dataTour?`.
- Renders semantic `<section>` with correct `aria-labelledby` wiring.
- Snapshot test verifies structure with and without subtitle.
- `npm run build` + `npm test` green; file ≤ 60 lines.

---

### 3.2 [frontend] [sonnet] Wire `ActivityOverviewSection` into `Dashboard/index.tsx`

**Depends on:** 3.1

**Affected files:**
- EDIT: `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/Dashboard/index.tsx`

**Description:**
Wrap the existing sticky period-toolbar `<div>` + the chart `<Grid>` in a single `<ActivityOverviewSection>`:

- Pass `title={t('Dashboard.title')}` (reuses existing key → "Activity Overview").
- Pass `subtitle={t('Dashboard.activity_overview_subtitle')}` (added in task 3.3).
- Pass the existing sticky toolbar JSX as `toolbar`.
- Pass the existing chart `<Grid>` as `children`.
- Keep the existing page header (`PrivatePageTourHeader`) and the summary-cards `<Grid>` outside the section.
- Preserve the existing `data-tour="dashboard-period-and-date"` on the sticky toolbar and add `dataTour="dashboard-activity-overview"` on the section.

**Acceptance criteria:**
- Visual: section header renders above the period toolbar; toolbar stays sticky (no regression in sticky behaviour).
- All 4 charts still render correctly in the same grid positions.
- Product tour (`data-tour` attributes) still reachable — no removed tour targets.
- `npm run build` + `npx tsc --noEmit` green.
- File still under the 500-line ESLint `max-lines` limit (it currently has `/* eslint-disable max-lines */` — leave the disable in place).

---

### 3.3 [frontend] [haiku] Add i18n key for Activity Overview subtitle

**Depends on:** 3.2

**Affected files:**
- EDIT: `lf-iq/src/messages/en.json`
- EDIT: `lf-iq/src/messages/vi.json`

**Description:**
Add one new key in both locales:

- `Dashboard.activity_overview_subtitle` → `"Your loan factory activity overview"` (en) / `"Tổng quan hoạt động của bạn"` (vi)

**Acceptance criteria:**
- Key present in both locale files under `Dashboard` namespace.
- JSON valid, `snake_case`.
- Used by `Dashboard/index.tsx` (task 3.2) — no unused-key warning.
- `npm run lint` green.

---

## Dependency Graph Summary

```
Phase 1 (pilot):
  1.1  ─┐
  1.2  ─┼─▶ 1.3 ─┬─▶ 1.4
                 └─▶ 1.5

Phase 2 (blocked on Phase 1 approval):
  2.1 ─┐
  2.2 ─┼─▶ 2.4 ─▶ 2.5
  2.3 ─┘

Phase 3 (blocked on Phase 1 approval, parallel to Phase 2):
  3.1 ─▶ 3.2 ─▶ 3.3
```
