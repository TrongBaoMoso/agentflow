# Design: LF-IQ Private UI Redesign

## Architecture Overview

This change touches two areas: the shared `PrivateLayout` (sidebar + AppShell) and the `/homeowners` page. No backend changes. No new dependencies.

```
PrivateLayout (MantineAppShell)
  +-- PrivateHeader (unchanged)
  +-- PrivateLeftMenuBar (redesigned: collapsible rail + expand)
  |     +-- SidebarToggle (new: expand/collapse button)
  |     +-- LinksGroup (updated: icon-only mode + tooltip)
  +-- AppShell.Main
       +-- HomeownersPage
             +-- InstructionBanner (extracted: dismissable)
             +-- HomeownersToolbar (extracted: sticky, actions + filters)
             +-- HomeownerStats (extracted: count + PlanInfo)
             +-- HomeownerCardList (extracted: cards + pagination)
                   +-- HomeownerCard (extracted: single card)
                   +-- ReportTable (existing InfiniteScrollTable wrapper)
```

## 1. Collapsible Sidebar

### 1.1 State Management

Create a new Jotai atom for sidebar state with localStorage sync:

**New file: `src/jotai/atom/sidebarState.ts`**

```typescript
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Persisted preference: whether user last had sidebar expanded
export const sidebarExpandedAtom = atomWithStorage('lfiq-sidebar-expanded', false)

// Transient state: whether hover-to-peek is active (not persisted)
export const sidebarPeekingAtom = atom(false)

// Derived: sidebar should show full content if expanded OR peeking
export const sidebarShowFullAtom = atom(
  (get) => get(sidebarExpandedAtom) || get(sidebarPeekingAtom)
)
```

Using `atomWithStorage` from `jotai/utils` (already available in jotai 2.12) provides automatic localStorage sync without custom effects.

### 1.2 Layout Constants

**Modified file: `src/shared/constants/layout-size.ts`**

Add sidebar width constants:

```typescript
export const SIDEBAR = {
  COLLAPSED_WIDTH: 64,   // Icon-only rail
  EXPANDED_WIDTH: 280,   // Full sidebar with labels
  TRANSITION_MS: 300,    // Animation duration
}
```

### 1.3 MantineAppShell Changes

**Modified file: `src/shared/layout/PrivateLayout/MantineAppShell.tsx`**

Current state: `desktopOpened` is hardcoded to `true`, navbar width is hardcoded to `300`.

Changes:
- Read `sidebarExpandedAtom` and `sidebarPeekingAtom` via Jotai
- Set `AppShell.navbar.width` dynamically: `SIDEBAR.COLLAPSED_WIDTH` when collapsed, `SIDEBAR.EXPANDED_WIDTH` when expanded
- The navbar always renders (never `collapsed.desktop: true`) -- it just changes width
- Add CSS transition on the navbar width change: `transition: width 300ms ease`
- When peeking (hover), the navbar expands as a floating overlay (using `position: absolute` + `z-index`) so it does not push content

**Behavior matrix:**

| State | Navbar width | Navbar position | Content margin-left |
|-------|-------------|-----------------|---------------------|
| Collapsed (default) | 64px | static | 64px |
| Expanded (toggle) | 280px | static | 280px |
| Peeking (hover) | 280px | absolute, z-50 | 64px (unchanged) |

### 1.4 PrivateLeftMenuBar Redesign

**Modified file: `src/shared/layout/PrivateLayout/components/PrivateLeftMenuBar/index.tsx`**

Current violations to fix:
- Uses `Box`, `Stack`, `Text`, `Divider` from Mantine -- replace with Tailwind `<div>`, `<p>`, `<hr>`
- Uses `style={{ height: '100%', display: 'flex', flexDirection: 'column' }}` -- replace with `className="h-full flex flex-col"`

New behavior:
- Read `sidebarShowFullAtom` to determine if showing labels or icons only
- Toggle button at the top: uses a Tabler icon (e.g., `IconLayoutSidebarLeftCollapse` / `IconLayoutSidebarLeftExpand`)
- When collapsed: each menu item shows only its icon, centered in the 64px rail
- When expanded: icon + label text, same as current layout

Hover-to-peek logic:
- `onMouseEnter` on the sidebar container starts a 300ms timer, then sets `sidebarPeekingAtom = true`
- `onMouseLeave` immediately sets `sidebarPeekingAtom = false` and cancels the timer
- This only activates when `sidebarExpandedAtom` is false (collapsed state)

### 1.5 LinksGroup Update

**Modified file: `src/shared/components/LinksGroup/LinksGroup.tsx`**

Current violations to fix:
- Uses `Group`, `Box`, `Collapse`, `ThemeIcon`, `Text`, `UnstyledButton` from Mantine
- Replace with Tailwind `<button>`, `<div>`, `<span>`, `<p>` elements

New prop: `isCollapsed: boolean`

When `isCollapsed`:
- Render only the icon (centered, 40x40 hit target)
- Wrap with Mantine `Tooltip` (Tooltip is acceptable -- it is not a layout component)
- Hide label text and sub-links entirely
- No collapse/expand of sub-menus

When not collapsed:
- Same as current behavior but with Tailwind classes replacing Mantine components

### 1.6 Animation Strategy

Use CSS transitions exclusively (no framer-motion dependency):

```css
/* Sidebar width transition */
transition: width 300ms ease;

/* Content area margin transition */
transition: margin-left 300ms ease;

/* Menu item label fade */
transition: opacity 200ms ease;
```

For the hover-to-peek overlay, the sidebar gets `position: absolute` and slides in from the left with `transform: translateX()` transition.

## 2. Homeowners Page Reorganization

### 2.1 Component Decomposition Plan

The 1,829-line `ReportPage/index.tsx` will be split into:

| New Component | Approx Lines | Responsibility |
|--------------|-------------|----------------|
| `ReportPage/index.tsx` | ~150 | Orchestrator: state, data fetching, passes props down |
| `_components/InstructionBanner/index.tsx` | ~50 | Dismissable orange CTA card |
| `_components/HomeownersToolbar/index.tsx` | ~200 | Sticky bar: search, filters, action buttons |
| `_components/HomeownerStats/index.tsx` | ~40 | Count display + PlanInfo widget |
| `_components/HomeownerCardList/index.tsx` | ~100 | Map over homeowners, select-all checkbox, pagination |
| `_components/HomeownerCard/index.tsx` | ~200 | Single homeowner card with expand/collapse |
| `_components/ReportColumnsConfig.tsx` | ~250 | `reportColumns` useMemo extracted to a custom hook |
| `_hooks/useHomeownerFilters.ts` | ~150 | All filter state + handlers (source, login status, date, search) |
| `_hooks/useHomeownerActions.ts` | ~150 | Bulk delete, export, email, CRUD handlers |

The `_hooks/` directory is new, colocated with the homeowners feature:
`src/app/[locale]/(private)/homeowners/_hooks/`

### 2.2 Dismissable Instruction Banner

**New file: `src/app/[locale]/(private)/homeowners/_components/InstructionBanner/index.tsx`**

- Reads `localStorage` key `lfiq-instruction-banner-dismissed`
- If `true`, renders nothing
- Otherwise renders the orange card with a close button (X icon, top-right)
- On close: sets localStorage to `true`, hides the banner
- Uses `useTranslations()` for all text

### 2.3 Sticky Toolbar

**New file: `src/app/[locale]/(private)/homeowners/_components/HomeownersToolbar/index.tsx`**

Layout: single horizontal bar that sticks below the header when scrolling.

```
+---------------------------------------------------------------------+
| [Search___________] [Date range] [Source v] [Status v] | [Clear] [Refresh] [Actions v] [Bulk Import] [Send Report] |
+---------------------------------------------------------------------+
```

Implementation:
- `position: sticky; top: 80px` (HEADER.HEIGHT from layout-size constants)
- `z-index: 30` to float above cards
- Background: white with subtle bottom shadow when stuck
- Receives filter state + handlers as props from parent
- All filter controls (TextInput, DatePickerInput, MultiSelect) and action buttons in one row
- Responsive: wraps to multiple rows on smaller screens using `flex-wrap`

### 2.4 State Lifting Strategy

The parent `ReportPage/index.tsx` remains the state owner. It:
1. Calls `useHomeownerFilters()` to get all filter state + handlers
2. Calls `useHomeownerActions()` to get action handlers (delete, export, email)
3. Manages `data`, `loading`, `pagination`, `expanded`, `selectedHomeownerIds`
4. Passes relevant slices to child components via props

No React Context is needed -- the component tree is shallow (3 levels max).

### 2.5 i18n

No new translation keys needed for the sidebar (menu labels already exist). New keys needed:

- `HomeOwner.dismiss_instructions` -- tooltip for the close button on the instruction banner

Add to both English and Vietnamese message files.

## 3. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/jotai/atom/sidebarState.ts` | Sidebar Jotai atoms |
| `src/app/[locale]/(private)/homeowners/_components/InstructionBanner/index.tsx` | Dismissable banner |
| `src/app/[locale]/(private)/homeowners/_components/HomeownersToolbar/index.tsx` | Sticky toolbar |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerStats/index.tsx` | Count + PlanInfo |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerCardList/index.tsx` | Card list + pagination |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerCard/index.tsx` | Single card component |
| `src/app/[locale]/(private)/homeowners/_components/ReportColumnsConfig.tsx` | Report table columns hook |
| `src/app/[locale]/(private)/homeowners/_hooks/useHomeownerFilters.ts` | Filter state + handlers |
| `src/app/[locale]/(private)/homeowners/_hooks/useHomeownerActions.ts` | Action handlers |

### Modified Files

| File | Changes |
|------|---------|
| `src/shared/constants/layout-size.ts` | Add SIDEBAR constants |
| `src/shared/layout/PrivateLayout/MantineAppShell.tsx` | Dynamic navbar width, transitions |
| `src/shared/layout/PrivateLayout/components/PrivateLeftMenuBar/index.tsx` | Collapsible rail, replace Mantine with Tailwind |
| `src/shared/components/LinksGroup/LinksGroup.tsx` | Icon-only mode, replace Mantine with Tailwind |
| `src/app/[locale]/(private)/homeowners/_components/ReportPage/index.tsx` | Refactored to orchestrator (~150 lines) |
| i18n message files (en, vi) | Add `dismiss_instructions` key |

## 4. Conventions

- All new components use `'use client'` directive (they use hooks)
- All user-facing text via `useTranslations()` -- no hardcoded strings
- No Mantine layout components (`Stack`, `Group`, `Text`, `Title`, `Box`, `Divider`) -- use Tailwind
- No `style={{}}` -- use Tailwind classes
- Null/undefined safety: optional chaining and fallback defaults everywhere
- Each file under 500 lines (ESLint `max-lines` rule)
- Tabler Icons from `@tabler/icons-react`
