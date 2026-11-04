# Design: Redesign Dashboard V2 Chart Components

## References

- **Approved mockup (authoritative visual target):** `openspec/changes/redesign-dashboard-v2-charts/mockup.html`
- **Related mockup (visual grammar source):** `lf-iq/mockups/dashboard-v2/design.html`
- **Target repo conventions:** `lf-iq/CLAUDE.md` (Next.js 14, Mantine 7.17, Tailwind 3.4, Jotai, next-intl, Jest 29)
- **Rules (enforced):**
  - No `Stack/Group/Text/Title` from Mantine — use Tailwind `div`/`span` primitives with utility classes.
  - All user-visible text via `useTranslations()` from `next-intl`. Keys live in `lf-iq/src/messages/{en,vi}.json` under the `Dashboard` namespace using `snake_case`.
  - Null-safe everywhere — use optional chaining, `?? []`, `?? 0`.
  - `max-lines: 500` ESLint rule per file; `no-console: error`; `consistent-type-imports: error`.

## Architecture Overview

Two new shared helpers and one section wrapper absorb the repeated markup. Each chart component keeps its existing data-transform logic; only the render tree changes.

```
_components/
├── ChartLegend/                        (NEW — shared)
│   └── index.tsx
├── ChartFooterToggle/                  (NEW — shared)
│   └── index.tsx
├── ActivityOverviewSection/            (NEW — section wrapper)
│   └── index.tsx
├── DashboardCard/                      (UNCHANGED — still used)
├── HomeOwnerLineChart/index.tsx        (REFACTORED)
├── HomeOwnerReportBarChart/index.tsx   (REFACTORED)
├── RealtorLineChart/index.tsx          (REFACTORED)
├── TrackingBarChart/index.tsx          (REFACTORED)
└── Dashboard/index.tsx                 (EDIT — wrap in ActivityOverviewSection)
```

## Shared Components

### `ChartLegend`

Compact horizontal legend that replaces Mantine Charts' default `withLegend`.

**Props:**

```typescript
interface ChartLegendSeries {
  name: string       // series key (matches Recharts series.name)
  color: string      // Mantine colour token like 'blue.6' or a hex
  label: string      // already-translated display label
}

interface ChartLegendProps {
  series: ChartLegendSeries[]
  className?: string
}
```

**Render:**

```tsx
<ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className ?? ''}`}>
  {series.map((s) => (
    <li key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
      <span
        aria-hidden
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: resolveMantineColor(s.color) }}
      />
      <span className="truncate">{s.label}</span>
    </li>
  ))}
</ul>
```

- Use a `<ul>` / `<li>` for semantics (each legend item is a discrete list entry).
- `resolveMantineColor` helper reads the Mantine theme via `useMantineTheme()` so that `'blue.6'` resolves to the same colour Recharts will draw. Fallback: return the input string if it already looks like a CSS colour.
- Wraps gracefully when there are many series (4+ in HomeOwner line chart).
- Dark mode: label text swaps via `dark:text-gray-400`; the coloured swatch keeps its brand colour in both themes.

### `ChartFooterToggle`

Footer strip with a top divider, used to host the "Show / Hide zero-value statuses" toggle.

**Props:**

```typescript
interface ChartFooterToggleProps {
  isExpanded: boolean
  onToggle: () => void
  expandedLabel: string   // e.g. t('Dashboard.hide_zero_value_statuses')
  collapsedLabel: string  // e.g. t('Dashboard.show_zero_value_statuses')
}
```

**Render:**

```tsx
<div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
  >
    <span>{isExpanded ? expandedLabel : collapsedLabel}</span>
    {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
  </button>
</div>
```

- Uses a native `<button>` — NOT Mantine `<Button>` — to keep the footer strip lightweight and consistent with the summary-card pattern in `HomeOwnerReportsCard`.
- Exposes only presentation; parent owns the `isExpanded` state.
- `mt-3 pt-2.5 border-t` gives the divider + breathing room from the chart above.

### `ActivityOverviewSection`

Section wrapper for the period-picker toolbar + chart grid.

**Props:**

```typescript
interface ActivityOverviewSectionProps {
  title: string                // t('Dashboard.title') → "Activity Overview"
  subtitle?: string            // optional, e.g. "Your loan factory activity overview"
  toolbar: ReactNode           // existing period picker + group filter
  children: ReactNode          // the chart Grid
  dataTour?: string
}
```

**Render:**

```tsx
<section className="px-6 pb-6" aria-labelledby="activity-overview-heading" data-tour={dataTour}>
  <div className="flex items-baseline gap-2 mb-3 px-1">
    <h2 id="activity-overview-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100">
      {title}
    </h2>
    {subtitle && (
      <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
    )}
  </div>
  {toolbar}
  {children}
</section>
```

- Semantic `<section>` with `aria-labelledby`.
- Subtitle (if provided) reuses the muted tone used by the page header subtitle.
- Does NOT move or re-implement the sticky period toolbar — it just hosts it as a slot.

## Chart Component Refactor Pattern

All four chart components follow the same template. Below is the canonical pattern using `HomeOwnerLineChart` as the example; the other three diverge only in the data transform and the Recharts props.

### Title rendering

The existing `DashboardCard` takes a plain `title: string`. To get the "title + muted suffix" look without changing `DashboardCard`'s API, pass a pre-composed JSX node as the title, OR extend `DashboardCard` to also accept `ReactNode`.

**Decision:** extend `DashboardCard`'s `title` prop to `string | ReactNode`. This is a minimal, backwards-compatible change (all existing callers still pass strings, which still render correctly). The chart components then pass a JSX fragment:

```tsx
<span className="flex items-baseline gap-1.5">
  <span className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
    {t('Dashboard.homeowner_statistics_base')}
  </span>
  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
    ({t(`Date.${periodType.toLowerCase()}`)})
  </span>
</span>
```

- `text-sm md:text-base` is smaller than the current `text-base md:text-lg` used in `DashboardCard`'s string path. The JSX node overrides the default size.
- The suffix uses `text-gray-400` in light mode and `text-gray-500` in dark mode to stay muted in both themes.
- This approach requires splitting the existing ICU-formatted i18n strings like `"{periodType} New Homeowners"` into a base + separate period token. Add new keys:
  - `Dashboard.homeowner_statistics_base` → `"New Homeowners"` (en) / `"Chủ nhà mới"` (vi)
  - `Dashboard.report_statistics_base` → `"New Reports"` / `"Báo cáo mới"`
  - `Dashboard.referral_partner_statistics_base` → `"New Agents"` / `"Đại lý mới"`
  - `Dashboard.tracking_statistics_base` → `"New Trackings"` / `"Theo dõi mới"`
  - The existing period keys `Date.daily`, `Date.monthly`, `Date.yearly` already exist and are used.

### Body layout

```tsx
<DashboardCard ... title={<titleNode />}>
  {/* Compact legend above chart */}
  {!loadingState?.loading && displayedSeries.length > 0 && (
    <ChartLegend series={displayedSeries} className="mb-3" />
  )}

  {loadingState?.loading ? (
    <div className="flex items-center justify-center h-[260px]">
      <LoaderLFIQ />
    </div>
  ) : (
    <LineChart
      h={260}
      data={chartData}
      dataKey="period"
      series={displayedSeries}
      curveType="linear"
      withLegend={false}
      withDots={false}
      withTooltip
      gridAxis="x"
      lineProps={{ strokeWidth: 2 }}
    />
  )}

  {hasZeroOnlyStatuses && (
    <ChartFooterToggle
      isExpanded={showZeroValueStatuses}
      onToggle={() => setShowZeroValueStatuses((v) => !v)}
      expandedLabel={t('Dashboard.hide_zero_value_statuses')}
      collapsedLabel={t('Dashboard.show_zero_value_statuses')}
    />
  )}
</DashboardCard>
```

- `withLegend={false}` disables Mantine's built-in legend; the custom `ChartLegend` above renders in its place.
- `withDots={false}` (change **c**) for line charts.
- `h={260}` replaces the previous `h={300}` (change **g**). Loader height also becomes `h-[260px]`.
- Bar charts use `BarChart` with `radius={2}` (change **d**) on `<Bar>` elements. In Mantine Charts `@mantine/charts` 7.17, pass `barProps={{ radius: [2, 2, 0, 0] }}` (top-left, top-right, bottom-right, bottom-left) so only the top corners are rounded — matches the mockup.
- The toggle moves out of `DashboardCard`'s `trailing` prop entirely — pass `trailing={null}` (change **e**).

### Dark mode theming for Recharts / Mantine Charts

`@mantine/charts` wraps Recharts. Mantine 7 exposes `useMantineColorScheme()` which returns `'light' | 'dark' | 'auto'`. Use it to derive chart colours:

```typescript
import { useMantineColorScheme, useMantineTheme } from '@mantine/core'

function useChartTheme() {
  const { colorScheme } = useMantineColorScheme()
  const theme = useMantineTheme()
  const isDark = colorScheme === 'dark'

  return {
    textColor: isDark ? theme.colors.gray[4] : theme.colors.gray[7],
    gridColor: isDark ? theme.colors.dark[4] : theme.colors.gray[2],
    tooltipBg: isDark ? theme.colors.dark[6] : theme.white,
    tooltipBorder: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
    tooltipText: isDark ? theme.colors.gray[1] : theme.colors.gray[9]
  }
}
```

Apply to each chart:

```tsx
const chartTheme = useChartTheme()

<LineChart
  ...
  xAxisProps={{ tick: { fill: chartTheme.textColor, fontSize: 11 } }}
  yAxisProps={{ tick: { fill: chartTheme.textColor, fontSize: 11 } }}
  gridProps={{ stroke: chartTheme.gridColor }}
  tooltipProps={{
    contentStyle: {
      backgroundColor: chartTheme.tooltipBg,
      border: `1px solid ${chartTheme.tooltipBorder}`,
      borderRadius: 6,
      color: chartTheme.tooltipText,
      fontSize: 12
    }
  }}
/>
```

- `@mantine/charts` 7.17 forwards `xAxisProps`, `yAxisProps`, `gridProps`, and `tooltipProps` to the underlying Recharts primitives. Verify API exists for the installed version before implementing — if a prop is missing, fall back to CSS overrides via `[data-mantine-color-scheme='dark'] .recharts-...` selectors in a scoped `<style>` or a `.module.css` file alongside the component.
- Extract `useChartTheme` to `lf-iq/src/app/[locale]/(private)/dashboard-v2/_hooks/useChartTheme.ts` since all 4 charts consume it.

### Card chrome dark mode

`DashboardCard` currently hard-codes `border-gray-100` and white default Mantine Card background. Update it to support dark mode:

- `border-b border-gray-100 dark:border-gray-800` on the header divider.
- Let Mantine Card inherit dark-mode surface via its theme (Mantine 7 handles this automatically when `theme.colorScheme` flips).
- Header text: `text-gray-900 dark:text-gray-100`.
- Subtitle: `text-gray-500 dark:text-gray-400`.

This is the ONLY edit to `DashboardCard` outside the `title` prop widening. No API change beyond `title: string → string | ReactNode`.

## Data Flow

Unchanged. The existing `chartData` / `displayedSeries` / `hasZeroOnlyStatuses` memos stay as-is. The refactor is purely presentational; no state moves out of the chart components, and the parent `Dashboard/index.tsx` keeps its current fetch + filter logic.

## Error Handling

No new error paths. Loading state continues to render `LoaderLFIQ` inside a fixed-height box. Empty `chartData` arrays result in an empty chart area (Mantine Charts handles this gracefully). The compact legend render guards on `displayedSeries.length > 0` so we never render an empty `<ul>`.

## Files to Touch

**New:**

- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartLegend/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ChartFooterToggle/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ActivityOverviewSection/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_hooks/useChartTheme.ts`
- Snapshot test files co-located with each component: `__tests__/index.test.tsx` (Jest + `@testing-library/react`).

**Edited:**

- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/DashboardCard/index.tsx` — widen `title` to `string | ReactNode`; add `dark:` variants on header text/divider.
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerLineChart/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerReportBarChart/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/RealtorLineChart/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/TrackingBarChart/index.tsx`
- `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/Dashboard/index.tsx` — wrap toolbar + chart Grid in `ActivityOverviewSection`.
- `lf-iq/src/messages/en.json` — add new `Dashboard.*_statistics_base` keys.
- `lf-iq/src/messages/vi.json` — add same keys in Vietnamese.

## i18n Keys

All under the `Dashboard` namespace in `lf-iq/src/messages/{en,vi}.json`. Only the 4 `_base` keys are new. Existing keys (`homeowner_statistics`, `report_statistics`, etc.) stay so other consumers are unaffected.

| Key | en | vi |
|---|---|---|
| `Dashboard.homeowner_statistics_base` | `New Homeowners` | `Chủ nhà mới` |
| `Dashboard.report_statistics_base` | `New Reports` | `Báo cáo mới` |
| `Dashboard.referral_partner_statistics_base` | `New Agents` | `Đại lý mới` |
| `Dashboard.tracking_statistics_base` | `New Trackings` | `Theo dõi mới` |

Reuse existing: `Dashboard.title`, `Dashboard.show_zero_value_statuses`, `Dashboard.hide_zero_value_statuses`, `Date.daily`, `Date.monthly`, `Date.yearly`.

Optional (only if a subtitle is desired under the Activity Overview heading):

| Key | en | vi |
|---|---|---|
| `Dashboard.activity_overview_subtitle` | `Your loan factory activity overview` | `Tổng quan hoạt động của bạn` |

## Test Strategy

lf-iq uses **Jest 29 + ts-jest** (see `lf-iq/package.json` — `npm test`). No Playwright / visual regression setup exists in-repo.

**Approach:** Jest snapshot tests using `@testing-library/react` renderer. Each test renders the component with a representative `data` array, asserts:

1. The card title renders both the base phrase and the period suffix.
2. The compact `<ul>` legend renders one `<li>` per displayed series with the correct label.
3. `withDots={false}` is passed (line charts) or `barProps.radius` is passed (bar charts) — assert via snapshot or by inspecting the rendered `@mantine/charts` wrapper.
4. When `hasZeroOnlyStatuses` is true, the footer toggle button appears with the correct label.
5. Clicking the footer toggle flips `isExpanded` and updates the button label / icon.
6. Chart body height equals `h-[260px]`.

**What snapshots do NOT cover:** actual Recharts rendering (jsdom doesn't render SVG reliably) and the dark-mode theming. For dark mode, add a small render-check test that sets `colorScheme: 'dark'` via Mantine provider and asserts the header classes contain `dark:text-gray-100`.

Acceptance for each task: `npm test` green, `npm run build` green (TypeScript + Next.js build), and manual preview against the mockup.

## Architecture Decisions

**ADR-1: Shared helpers vs inline per-chart markup.**
Chose shared `ChartLegend` + `ChartFooterToggle` because all 4 charts need the same markup. Inline duplication would be four nearly-identical 20-line blocks, drifting over time. Shared helpers have a stable presentational API with no runtime coupling to the charts' data shape.

**ADR-2: Widen `DashboardCard` title to `ReactNode` instead of a new `titleSuffix` prop.**
Adding `titleSuffix` would work but forces `DashboardCard` to know about the "title + muted suffix" composition. Widening `title` keeps the composition in the caller, which is the right side of the boundary — the card only needs to render whatever is passed.

**ADR-3: Theme hook extraction.**
Pull `useChartTheme` into `_hooks/useChartTheme.ts` rather than duplicating 5-line hook bodies. All 4 charts need identical theme tokens, and the hook is the natural seam for future dark-mode refinements.

**ADR-4: No new dependency for colour resolution.**
`@mantine/core` 7.17 already exposes `useMantineTheme()`. Resolving `'blue.6'` → hex via `theme.colors.blue[6]` is a two-line helper. Adding something like `mantine-color-resolver` (doesn't exist) is unnecessary.

**ADR-5: Snapshot tests over visual regression.**
Visual regression would need Playwright + screenshot infra which lf-iq doesn't have. Jest snapshots + the mockup as the visual spec give good-enough coverage for a presentational refactor without adopting a new tool mid-task.
