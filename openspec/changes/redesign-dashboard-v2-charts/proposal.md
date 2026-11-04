# Proposal: Redesign Dashboard V2 Chart Components

## Feature Branch

`feature/redesign-dashboard-v2-charts` (to be created by DevOps from `production` in the `lf-iq` repo).

## Problem

The four chart cards on the LF-IQ Dashboard V2 page use a different visual grammar than the summary cards directly above them:

- Chart card titles are large and repeat the period (`Monthly New Homeowners`) at full emphasis, which dominates the page and visually competes with the summary-card headings.
- The Mantine Charts legend sits at the top of the chart area in its default style — inconsistent with the subdued status legend used on summary cards (tiny coloured dot + label + count).
- Line charts render heavy dots on every data point; bar charts render squared corners. Together they feel denser than the summary cards, which use rounded pills, soft dots, and generous whitespace.
- The "Show / Hide zero-value statuses" toggle is rendered in the card header's trailing slot. On a chart card the header is already carrying title + icon, so the toggle reads as visual noise attached to the title row.
- Chart height (`h=300`) is taller than the reference mockup, which uses `h=260` to match the vertical rhythm of summary cards in the same row.
- There is no dedicated "Activity Overview" section wrapper — the period picker toolbar and the 4 chart cards share the same page area but are not visually tied together as one section.
- None of the chart internals (axis colours, gridlines, tooltip background) are theme-aware. When dark mode ships, the charts will keep rendering light-mode axis labels and white tooltip backgrounds against a dark card.

User validated the redesign via the HTML mockup at `openspec/changes/redesign-dashboard-v2-charts/mockup.html` (and the related reference at `lf-iq/mockups/dashboard-v2/design.html`).

## Proposed Solution

Redesign the four chart components in `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/` to share the summary-card grammar. The seven visual changes (a–g) approved by the user:

a. **Smaller chart title** — base size (not `text-lg`) with normal weight; the `(Monthly)` / `(Daily)` / `(Yearly)` suffix renders in a muted secondary colour.

b. **Custom compact legend** — replace the default Mantine Charts legend with a horizontal row of `swatch dot + label` entries (matching the summary-card status list), rendered above the chart body inside the card's body padding.

c. **No dots on lines** — `withDots={false}` on all line charts; rely on the line + tooltip interaction for readability.

d. **Rounded bar corners** — `radius={2}` on all bar charts for a softer edge consistent with the card's rounded border.

e. **Toggle moved to footer strip** — the "Show / Hide zero-value statuses" toggle moves out of the header's trailing slot and into a footer strip directly below a thin divider, styled identically to the summary-card footer toggle (see `HomeOwnerReportsCard`).

f. **"Activity Overview" wrapper** — the 4 chart cards and the existing period-picker toolbar wrap inside a labelled "Activity Overview" section (section header rendered once, above the toolbar).

g. **Chart height `h-[260px]`** — reduce chart body height from 300px to 260px to match the mockup's vertical rhythm.

In addition, all chart components become **dark-mode ready** using Tailwind `dark:` variants for card chrome and Mantine's `useMantineColorScheme` / CSS variables for Recharts axis, grid, and tooltip.

Roll out in three phases:

- **Phase 1 (Pilot)** — redesign `HomeOwnerLineChart` end-to-end. It is the most complex of the four (two groups × two statuses, footer toggle logic, compact legend with up to 4 entries), so if it works cleanly the pattern generalises.
- **Phase 2 (Rollout)** — apply the same pattern to `HomeOwnerReportBarChart`, `RealtorLineChart`, and `TrackingBarChart`. Blocked by Phase 1 approval.
- **Phase 3 (Section wrapper)** — add the `ActivityOverviewSection` wrapper around the period toolbar + chart grid in `Dashboard/index.tsx`. Can start in parallel with Phase 2 after Phase 1 is approved (no runtime coupling, only layout markup changes).

## Scope

**In scope:**

- Visual redesign of 4 chart components: `HomeOwnerLineChart`, `HomeOwnerReportBarChart`, `RealtorLineChart`, `TrackingBarChart`.
- All 7 visual changes (a–g).
- Dark-mode theming for the chart cards and Recharts/Mantine Charts internals.
- Two shared helper components: `ChartLegend` and `ChartFooterToggle` to avoid duplicating compact-legend + toggle-strip markup across 4 charts.
- `ActivityOverviewSection` wrapper component + integration in `Dashboard/index.tsx`.
- i18n keys — use existing Dashboard keys where possible; add new keys only for the few strings that are genuinely new (legend group labels if needed, activity overview subtitle). Add to both `en.json` and `vi.json`.
- Jest snapshot tests for each refactored chart component (lf-iq uses Jest 29).

**Out of scope:**

- No changes to data-fetching logic, filters, or the SegmentedControl / period picker in `Dashboard/index.tsx` (aside from wrapping them in `ActivityOverviewSection`).
- No changes to summary cards (`HomeOwnerCard`, `HomeOwnerReportsCard`, `RealtorCard`, `TrackingCard`) — they are already the visual reference.
- No changes to `DashboardCard`'s API or header markup — the header stays as-is; only the trailing slot and body change usage.
- No new dependencies — use only Recharts 2.15, `@mantine/charts` 7.17, `@mantine/core` 7.17, Tailwind 3.4, Jotai, `next-intl` 3.20, and `@tabler/icons-react` already in `lf-iq/package.json`.
- No change to the chart types (Line stays Line, Bar stays Bar) or to the underlying data shape.
- No dark-mode toggle UI — this change makes the charts dark-mode *ready* but does not ship a toggle. The `dark:` class is applied by whatever mechanism the app later wires up.
- No E2E tests — visual regression is covered by snapshot tests plus manual preview against the mockup.

## Success Criteria

1. The 4 chart cards visually match the mockup (`openspec/changes/redesign-dashboard-v2-charts/mockup.html`) in light mode at desktop breakpoints (≥768px).
2. Each chart card carries all 7 visual changes (a–g) — verified by inspection checklist in the task acceptance criteria.
3. In dark mode (`.dark` class on `<html>`), chart card chrome, axis labels, gridlines, and tooltip background render with appropriate dark-mode tokens — no hard-coded white backgrounds or black text inside the chart.
4. The "Show / Hide zero-value statuses" toggle continues to work (clicking it adds/removes zero-value series from the chart and the compact legend) after moving to the footer strip.
5. `npm run build` passes (zero TypeScript errors, zero ESLint errors).
6. `npm test` passes — snapshot tests exist for all 4 refactored chart components and the 2 shared helpers.
7. All user-visible strings are sourced via `useTranslations()` — no hard-coded text. New keys exist in both `en.json` and `vi.json`.
8. No regression in the existing toggle-state behaviour, group filter behaviour, or loading-state rendering.
