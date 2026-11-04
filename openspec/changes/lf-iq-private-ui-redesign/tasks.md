# Tasks: LF-IQ Private UI Redesign

## 1. Sidebar Foundation (State + Constants)

- [ ] 1.1 Create sidebar Jotai atoms with localStorage persistence
  - **Label:** frontend
  - **Estimate:** S
  - **Files to create:** `src/jotai/atom/sidebarState.ts`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - `sidebarExpandedAtom` uses `atomWithStorage('lfiq-sidebar-expanded', false)` from `jotai/utils`
    - `sidebarPeekingAtom` is a plain `atom(false)` (transient, not persisted)
    - `sidebarShowFullAtom` is a derived read-only atom: returns `true` if expanded OR peeking
    - File exports all three atoms
    - File is under 30 lines

- [ ] 1.2 Add sidebar layout constants
  - **Label:** frontend
  - **Estimate:** S
  - **Files to modify:** `src/shared/constants/layout-size.ts`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Export `SIDEBAR` object with: `COLLAPSED_WIDTH: 64`, `EXPANDED_WIDTH: 280`, `TRANSITION_MS: 300`
    - Existing `HEADER`, `SPACINGS`, `STICKY_TOP` exports unchanged
    - `SIDEBAR` added to the default export `LAYOUT_SIZE` object

## 2. LinksGroup Refactor

- [ ] 2.1 Replace Mantine layout components with Tailwind in LinksGroup
  - **Label:** frontend
  - **Estimate:** M
  - **Files to modify:** `src/shared/components/LinksGroup/LinksGroup.tsx`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Remove imports of `Group`, `Box`, `Collapse`, `ThemeIcon`, `Text`, `UnstyledButton` from `@mantine/core`
    - Replace with native HTML elements (`button`, `div`, `span`, `p`) styled with Tailwind classes
    - Active state styling preserved: orange left border, orange background, orange filled icon
    - Sub-links collapse/expand behavior preserved using Tailwind height transition or conditional rendering
    - Add `isCollapsed?: boolean` prop to the component interface
    - When `isCollapsed` is true: render only the icon (centered in a 40x40 hit target), wrap with Mantine `Tooltip` showing the label, hide label text and sub-links
    - When `isCollapsed` is false or undefined: render exactly as before (icon + label + sub-links)
    - `Tooltip` from Mantine is acceptable (it is not a layout component)
    - Existing behavior unchanged when `isCollapsed` is not passed
    - File under 150 lines

## 3. Sidebar Collapse Behavior

- [ ] 3.1 Redesign PrivateLeftMenuBar for collapsible rail
  - **Label:** frontend
  - **Estimate:** L
  - **Files to modify:** `src/shared/layout/PrivateLayout/components/PrivateLeftMenuBar/index.tsx`
  - **Dependencies:** 1.1, 1.2, 2.1
  - **Acceptance criteria:**
    - Remove `Box`, `Stack`, `Text`, `Divider` imports from `@mantine/core`
    - Replace with Tailwind-styled `div`, `p`, `hr` elements
    - Remove `style={{ height: '100%', display: 'flex', flexDirection: 'column' }}` -- use `className="h-full flex flex-col"`
    - Read `sidebarExpandedAtom`, `sidebarPeekingAtom`, `sidebarShowFullAtom` from Jotai
    - Toggle button at top of sidebar: uses `IconLayoutSidebarLeftCollapse` when expanded, `IconLayoutSidebarLeftExpand` when collapsed; toggles `sidebarExpandedAtom`
    - Pass `isCollapsed={!showFull}` to each `LinksGroup` component
    - Hover-to-peek: `onMouseEnter` starts a 300ms timer then sets `sidebarPeekingAtom = true`; `onMouseLeave` cancels timer and sets `sidebarPeekingAtom = false`. Only active when `sidebarExpandedAtom` is false
    - All text uses `useTranslations()` (already does)
    - File under 200 lines

- [ ] 3.2 Update MantineAppShell for dynamic sidebar width
  - **Label:** frontend
  - **Estimate:** M
  - **Files to modify:** `src/shared/layout/PrivateLayout/MantineAppShell.tsx`
  - **Dependencies:** 1.1, 1.2
  - **Acceptance criteria:**
    - Remove hardcoded `useDisclosure(true)` for `desktopOpened`
    - Read `sidebarExpandedAtom` and `sidebarPeekingAtom` from Jotai
    - Navbar width: `SIDEBAR.EXPANDED_WIDTH` when expanded, `SIDEBAR.COLLAPSED_WIDTH` when collapsed
    - When peeking: navbar width remains `SIDEBAR.COLLAPSED_WIDTH` in AppShell config (content does not shift), but the actual rendered navbar element gets `position: absolute`, `z-index: 50`, `width: SIDEBAR.EXPANDED_WIDTH`
    - Add CSS transition: `transition: width 300ms ease` on the navbar, `transition: margin-left 300ms ease` on the main content (Mantine AppShell handles this via the width prop, but may need a custom className)
    - `notShowLeftMenu` logic preserved: when on report/profile pages, navbar width is 0
    - Mobile behavior unchanged (`mobileOpened` stays as-is)
    - File under 80 lines

## 4. Homeowners Page Decomposition — Hooks

- [ ] 4.1 Extract filter logic to useHomeownerFilters hook
  - **Label:** frontend
  - **Estimate:** M
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_hooks/useHomeownerFilters.ts`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Extracts from `ReportPage`: `buildFilter` function, all filter-related state (`dateRange`, `currentStatus`, `currentSourceReport`, `currentLoginStatus`, `syncFrom`, `filter`, `search`, `keyword`), all filter handlers (`handleSourceReportStatusChange`, `handleLoginStatusChange`, `handleDateRangeChange`, `handleSearchChange`, `handleClearSearch`, `handleResetFilter`, `debouncedSearch`), source/login option memos (`sourceOptions`, `loginStatusOptions`, `defaultSourceOptions`)
    - Hook signature: `useHomeownerFilters({ initialStatus, initialSource, searchFromUrl, loginStatusFromUrl })`
    - Returns: all state values + all handlers + `filter.queryParams` for data fetching
    - All helper functions (`buildFilter`, `displayValuesToSourceReport`, `getInitialSourceReport`, etc.) stay in this file or a colocated `_utils` file
    - File under 300 lines
    - No Mantine layout components

- [ ] 4.2 Extract action handlers to useHomeownerActions hook
  - **Label:** frontend
  - **Estimate:** M
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_hooks/useHomeownerActions.ts`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Extracts from `ReportPage`: `handleConfirmDelete`, `handleConfirmBulkDelete`, `handleBulkDelete`, `handleCancelDelete`, `handleCreateReport`, `handleRowSelectionChange`, `handleToggleHomeownerSelect`, `handleSelectAllHomeowners`, `handleExportHomeowners`, `handleSendEmail`, `handleCopy`, `handleSourceReportChange`, `handleReferralPartnerChange`, `handleHomeownerLanguageChange`, `handleStatisticClick`, `handleToggleExpand`, `handleAskDelete`, `onRefresh`, `updateData`, `updateRelatedUserKeys`, `updateHomeownerLanguageInState`
    - Hook receives necessary state and setters as parameters
    - Returns: all action handler functions
    - File under 300 lines
    - No Mantine layout components

## 5. Homeowners Page Decomposition — Components

- [ ] 5.1 Create InstructionBanner component (dismissable)
  - **Label:** frontend
  - **Estimate:** S
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/InstructionBanner/index.tsx`
  - **Files to modify:** i18n message files for en + vi (add `HomeOwner.dismiss_instructions` key)
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Reads `localStorage` key `lfiq-instruction-banner-dismissed`
    - If dismissed, renders `null`
    - Otherwise renders the orange CTA card (same content as current: `t.rich('HomeOwner.instruction', ...)`)
    - Close button (X icon) in top-right corner with `Tooltip` label `t('HomeOwner.dismiss_instructions')`
    - On close: writes `'true'` to localStorage, hides banner (local state)
    - Props: `currentProfile: string` (to determine loan_officer vs agent text)
    - Uses `useTranslations()` for all text
    - File under 60 lines

- [ ] 5.2 Create HomeownersToolbar component (sticky toolbar with actions + filters)
  - **Label:** frontend
  - **Estimate:** L
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/HomeownersToolbar/index.tsx`
  - **Dependencies:** 4.1, 4.2
  - **Acceptance criteria:**
    - Single horizontal bar combining ALL filter controls and action buttons
    - Sticky positioning: `className="sticky top-[80px] z-30 bg-white shadow-sm"` (80px = HEADER.HEIGHT)
    - Contains: search TextInput, DatePickerInput, source MultiSelect, login status MultiSelect, clear filters button, refresh button, Actions dropdown menu (bulk delete, export selected/all, send email selected/all), Bulk Import button, Send a Report button
    - Receives filter state/handlers from `useHomeownerFilters` and action handlers from `useHomeownerActions` via props
    - Responsive: uses `flex flex-wrap` for smaller screens
    - File under 250 lines
    - No Mantine layout components (except form inputs: `TextInput`, `MultiSelect`, `DatePickerInput`, `Button`, `Menu`, `Tooltip` which are acceptable)

- [ ] 5.3 Create HomeownerStats component
  - **Label:** frontend
  - **Estimate:** S
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/HomeownerStats/index.tsx`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Displays homeowner count: `Homeowners: {total}` with the count in large bold text
    - Displays `PlanInfo` widget on the right side
    - Props: `total: number`
    - Uses `useTranslations()` for labels
    - File under 40 lines

- [ ] 5.4 Create HomeownerCard component
  - **Label:** frontend
  - **Estimate:** M
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/HomeownerCard/index.tsx`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Renders a single homeowner card (currently lines ~1654-1803 in ReportPage)
    - Props: `homeowner`, `isExpanded`, `isSelected`, `onToggleExpand`, `onToggleSelect`, `reportColumns`, `rowSelection`, `onRowSelectionChange`, `onLanguageChange`, `updatingLanguageId`
    - Contains: checkbox, avatar, name/email, status badge, language selector menu, source report, report count badge, expandable report table
    - When expanded: renders `<InfiniteScrollTable>` with the report columns
    - Uses Mantine `Card`, `Badge`, `Avatar`, `Menu`, `Tooltip`, `Checkbox` (acceptable -- these are UI components, not layout)
    - Uses `Grid` from Mantine for the card internal layout (acceptable for this grid use case) OR replace with Tailwind grid if straightforward
    - File under 250 lines

- [ ] 5.5 Create HomeownerCardList component
  - **Label:** frontend
  - **Estimate:** S
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/HomeownerCardList/index.tsx`
  - **Dependencies:** 5.4
  - **Acceptance criteria:**
    - Maps over `data` array and renders `HomeownerCard` for each
    - Select-all checkbox at the top
    - Empty state: "No data" message when `data.length === 0`
    - Loading state: renders `LoaderLFIQ` when loading
    - Pagination at the bottom
    - Props: `data`, `loading`, `expanded`, `selectedHomeownerIds`, `pagination`, relevant handlers
    - File under 120 lines

- [ ] 5.6 Extract report columns to a custom hook
  - **Label:** frontend
  - **Estimate:** M
  - **Files to create:** `src/app/[locale]/(private)/homeowners/_components/ReportColumnsConfig.tsx`
  - **Dependencies:** None
  - **Acceptance criteria:**
    - Export a hook `useReportColumns(deps)` that returns the `MRT_ColumnDef<any>[]` array
    - Move the entire `reportColumns` useMemo (lines ~1063-1424 from ReportPage) into this hook
    - Hook parameters: `{ t, copiedId, popoverOpened, loading, currentProfile, userProfile, updatingSourceReportId, updatingReferralPartnerId, handlers }` where handlers includes `handleSourceReportChange`, `handleReferralPartnerChange`, `handleCopy`, `handleAskDelete`, `handleConfirmDelete`, `handleCancelDelete`, `handleStatisticClick`
    - File under 300 lines

## 6. Homeowners Page Assembly

- [ ] 6.1 Refactor ReportPage as thin orchestrator
  - **Label:** frontend
  - **Estimate:** L
  - **Files to modify:** `src/app/[locale]/(private)/homeowners/_components/ReportPage/index.tsx`
  - **Dependencies:** 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
  - **Acceptance criteria:**
    - Remove the `/* eslint-disable max-lines */` comment at the top
    - Uses `useHomeownerFilters` and `useHomeownerActions` hooks for state and handlers
    - Uses `useReportColumns` hook for table column definitions
    - Renders: `InstructionBanner` > `HomeownersToolbar` > `HomeownerStats` > `HomeownerCardList`
    - Keeps `fetchReports` logic, URL param sync, and top-level state (`data`, `loading`, `pagination`, `expanded`, `selectedHomeownerIds`, `rowSelection`, `selectedRowsData`, `engagementUserId`)
    - `HomeownerDetailPanel` side panel still rendered at this level
    - File under 200 lines
    - `npm run build` passes with zero errors
    - No `eslint-disable` comments for `max-lines`

## 7. i18n and Final Verification

- [ ] 7.1 Add i18n keys and verify build
  - **Label:** frontend
  - **Estimate:** S
  - **Files to modify:** English message file, Vietnamese message file
  - **Dependencies:** 5.1
  - **Acceptance criteria:**
    - Add `"dismiss_instructions"` key under `HomeOwner` namespace in both English and Vietnamese message files
    - English: "Dismiss instructions" (or similar)
    - Vietnamese: appropriate translation
    - Run `npm run build` -- zero errors
    - Run `npm run lint` -- zero lint errors in all modified/new files
    - No hardcoded strings in any new/modified component
