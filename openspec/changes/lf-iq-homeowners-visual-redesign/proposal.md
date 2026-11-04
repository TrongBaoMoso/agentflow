# Proposal: LF-IQ Homeowners Visual Redesign

## Problem Statement

The current `/homeowners` page in LF-IQ has a dated, dense visual design that does not match the quality expected of a modern SaaS product:

1. **No visual hierarchy** -- Card data (name, status, report count, language, source) is laid out in a flat 12-column grid with uniform text sizes and weights, making it hard to scan quickly.
2. **Dense Mantine defaults** -- Cards use `Card` with `withBorder` and `shadow="xs"` but lack intentional spacing, border radii, or hover states that communicate interactivity.
3. **Toolbar lacks polish** -- Filter inputs and action buttons sit in a `flex-wrap` row with minimal visual grouping, no separator between filters and actions, and no search icon affordance.
4. **Stats bar is minimal** -- The homeowner count is a single `<p>` with inline font sizes rather than a designed metrics display.
5. **Instruction banner is functional but plain** -- Uses a default Mantine `Card` with background color, but lacks the icon-driven affordance and tighter spacing of a proper info banner.
6. **Expanded table is unstyled** -- The `InfiniteScrollTable` (mantine-react-table) uses library defaults with no visual customization.
7. **Status indicators are small Mantine badges** -- No pill/border treatment to create at-a-glance differentiation.

These issues reduce perceived product quality and make the homeowners page harder to use at scale (100+ homeowners).

## Proposed Solution

Apply **Style A -- Modern Data Dashboard** visual treatment across every component on the `/homeowners` page. This style is inspired by Linear, Notion, and Vercel dashboards:

- **Clean surfaces** -- White cards with 1px `#e5e7eb` borders, 12px border-radius, subtle shadows on hover
- **Typography-driven hierarchy** -- Inter font, 14px/600 for names, 12px/400 for secondary info, 32px/800 for stats count
- **Colored pill badges** -- Status (Active/Pending/Invitation Sent) and report count shown as rounded pills with background, border, and icon
- **Spacious card layout** -- Grid: checkbox | identity (name + email, 240px) | meta pills (status, report count, language flag, source badge) | expand chevron
- **Polished toolbar** -- Bordered container with 12px/16px padding, search icon in input, select dropdowns, ghost buttons for clear/refresh, divider before actions, primary CTA (Send a Report) in accent orange
- **Refined stats row** -- Large count number (32px/800) with label, plan badge on the right
- **Clean expanded table** -- Section title in uppercase 12px, table with 11px uppercase headers on gray background, hover rows, engagement stats inline, View/Delete action buttons with colored borders

**No structural/behavioral changes.** Component hierarchy, props, hooks, state management, and data flow remain identical. This is a purely visual change.

## Scope

### In Scope

- `HomeownerCard/index.tsx` -- Complete visual restyle of collapsed and expanded states
- `HomeownersToolbar/index.tsx` -- Toolbar container, input styles, button styles, layout
- `HomeownerStats/index.tsx` -- Stats display redesign
- `InstructionBanner/index.tsx` -- Banner visual treatment
- `HomeownerCardList/index.tsx` -- List container, select-all row, card gap
- `ReportColumnsConfig.tsx` -- Column cell styling (address, engagement stats, mortgage info, status, actions)
- `ReportPage/index.tsx` -- Page-level spacing adjustments if needed

### Out of Scope

- Sidebar/navigation redesign (covered by separate `lf-iq-private-ui-redesign` spec)
- Backend API changes
- New features or behavioral changes
- PlanInfo component redesign (separate concern)
- Mobile-first responsive breakpoints (existing responsive behavior preserved)
- New dependencies or packages
- i18n key changes (all existing translation keys remain)

## Success Criteria

1. All components on `/homeowners` match the Style A mockup (`style-a-modern-dashboard.html`)
2. No Mantine `Stack`, `Group`, `Text`, or `Title` components used (project rule)
3. No `style={{}}` inline styles (project rule) -- all styling via Tailwind classes
4. All user-visible text uses `useTranslations()` (project rule)
5. Null safety maintained with optional chaining throughout
6. `npm run build` passes with zero errors
7. No functional regressions -- all existing interactions (expand, select, filter, paginate, language change, export, delete) work identically

## Feature Branch

`feature/lf-iq-homeowners-visual-redesign` (to be created from `master` in the `lf-iq` repo)
