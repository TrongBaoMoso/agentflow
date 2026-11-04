# Proposal: LF-IQ Private UI Redesign

## Feature Branch

`feature/lf-iq-private-ui-redesign` (to be created from `master` in the lf-iq repo)

## Problem Statement

The LF-IQ private area has two interconnected usability problems:

1. **Sidebar wastes screen space.** The left sidebar is fixed at 300px with no way to collapse it. The `PrivateLeftMenuBar` component has `isCollapsed`/`onToggle` props but they are never wired up. On typical laptop screens (1366-1440px), the sidebar consumes ~22% of horizontal space, squeezing the homeowners content area.

2. **Homeowners page is a monolith.** `ReportPage/index.tsx` is 1,829 lines containing the instruction banner, action buttons, filters, homeowner cards, expandable report tables, and 20+ handler functions. The instruction banner is always visible with no way to dismiss it. Filters and actions are separated by the homeowner count section, creating a disjointed layout. The file violates the project's 500-line `max-lines` ESLint rule (currently suppressed with `eslint-disable max-lines`).

## Who Is Affected

- **Loan Officers / Realtors / Admins** who use the private area daily to manage homeowners. They lose usable content width to the permanently expanded sidebar and must scroll past the instruction banner every time.

## Proposed Solution

### A. Collapsible Sidebar (PrivateLayout)

Replace the fixed 300px sidebar with a collapsible rail-based sidebar:

- **Default state:** Icons-only rail (~64px wide)
- **Hover on icon:** Tooltip shows menu item name
- **Expand button:** A floating toggle button expands the sidebar to full width (icons + text labels), sliding over or pushing the content area
- **Close:** Clicking the toggle or clicking outside returns to the icons-only rail
- **Hover-to-peek:** Hovering on the collapsed rail for ~300ms reveals the full sidebar as a floating overlay, which closes when the mouse leaves
- **Persistence:** Sidebar expanded/collapsed state saved to `localStorage` so it survives page reloads

### B. Homeowners Page Reorganization

Keep it as a single page but reorganize the layout:

- **Dismissable instruction banner:** The orange CTA card can be permanently dismissed (stored in `localStorage`). Once dismissed, it never reappears for that user/browser.
- **Sticky toolbar:** Combine action buttons and filter controls into a single sticky toolbar that remains visible when scrolling. Contains: search input, date range picker, source report multi-select, login status multi-select, action menu button, bulk import button, send-a-report button, refresh, clear filters.
- **Homeowner count + PlanInfo:** Displayed between the toolbar and the card list.
- **Cards as main content:** Homeowner cards with expandable report tables remain the primary content below the toolbar.

### C. Component Decomposition

Break the 1,829-line `ReportPage` into focused, testable sub-components (each under 500 lines) to comply with the ESLint `max-lines` rule and improve maintainability.

## Scope

### In Scope

- Collapsible sidebar with icon-only rail, hover tooltips, expand toggle, hover-to-peek, localStorage persistence
- Smooth 300ms CSS transitions for sidebar expand/collapse
- `LinksGroup` component update for collapsed/icon-only mode
- Homeowners page: dismissable instruction banner with localStorage persistence
- Homeowners page: sticky toolbar combining actions and filters
- Homeowners page: component extraction to sub-components (each under 500 lines)
- Replace Mantine `Box`, `Stack`, `Text`, `Divider` in `PrivateLeftMenuBar` with Tailwind classes (per project rules)
- Replace Mantine `Group`, `Box`, `Text`, `Collapse`, `ThemeIcon` in `LinksGroup` with Tailwind equivalents
- All user-visible strings via `useTranslations()` (English + Vietnamese)

### Out of Scope

- Mobile sidebar behavior changes (keep current Mantine `mobileOpened` behavior)
- Changing the homeowners data fetching logic or API calls
- Redesigning the homeowner card layout or report table columns
- Adding new features to the homeowners page
- Changes to AdminLayout, PublicLayout, or other layouts
- Backend changes

## Success Criteria

1. Sidebar defaults to ~64px icon-only rail on desktop
2. Hovering an icon shows a tooltip with the menu name
3. Toggle button expands sidebar to full width with icons + text; another click collapses
4. Hovering on the collapsed rail for 300ms reveals a floating full sidebar
5. Sidebar state persists in localStorage across page reloads
6. Instruction banner can be dismissed permanently (localStorage)
7. Actions and filters are combined in a single sticky toolbar
8. No single file exceeds 500 lines (ESLint `max-lines` satisfied without disable comments)
9. All Mantine layout components (`Stack`, `Group`, `Text`, `Box`, `Divider`) replaced with Tailwind classes in touched files
10. `npm run build` passes with zero errors
11. All strings use `useTranslations()`, no hardcoded text
