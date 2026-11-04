# Tasks: LF-IQ Homeowners Visual Redesign

## 1. Foundation -- Page Layout and Simple Components

These tasks have no dependencies on each other and can be done in parallel.

- [ ] 1.1 [frontend] [haiku] Restyle ReportPage container spacing

  **File:** `src/app/[locale]/(private)/homeowners/_components/ReportPage/index.tsx`

  **Changes:**
  - Change outer container from `p-8` to `p-6`
  - Change inner `flex flex-col gap-7` to `flex flex-col gap-4`

  **Acceptance criteria:**
  - Page has 24px padding on all sides
  - Sections have 16px vertical gap
  - `npm run build` passes
  - No functional changes to component behavior

- [ ] 1.2 [frontend] [haiku] Restyle InstructionBanner

  **File:** `src/app/[locale]/(private)/homeowners/_components/InstructionBanner/index.tsx`

  **Changes:**
  - Replace Mantine `Card` with a plain `<div>`
  - Remove `Card` import from `@mantine/core`, add `IconBulb` import from `@tabler/icons-react`
  - Container classes: `bg-orange-50 border border-[#fde0c8] rounded-xl py-3.5 px-5 flex items-center gap-3 relative w-full md:w-2/3 mx-auto`
  - Add `<IconBulb size={20} className="text-orange-500 shrink-0" />` before the text
  - Text `<p>` classes: `text-[13px] text-amber-900 leading-relaxed flex-1 pr-6`
  - Keep existing `ActionIcon` close button (position unchanged: `absolute top-2 right-2`)
  - Keep existing dismiss logic and localStorage

  **Acceptance criteria:**
  - Banner shows bulb icon on left, text in center, close button on right
  - Background is light orange with subtle orange border
  - Text is 13px amber-900
  - Dismiss still works (persisted in localStorage)
  - No Mantine `Card` in the component
  - `npm run build` passes

- [ ] 1.3 [frontend] [haiku] Restyle HomeownerStats

  **File:** `src/app/[locale]/(private)/homeowners/_components/HomeownerStats/index.tsx`

  **Changes:**
  - Container: change to `flex items-center justify-between mb-4`
  - Left side: `flex items-baseline gap-2`
    - Count: `<span className="text-[32px] font-extrabold text-gray-900 tracking-tight leading-none">{formatNumber(total)}</span>`
    - Label: `<span className="text-sm font-medium text-gray-500">{t('Noun.homeowners')}</span>`
    - Note: swap order so count appears first, label second (matching mockup: "247 Homeowners")
  - Right side: `<div className="flex items-center"><PlanInfo /></div>` (unchanged)

  **Acceptance criteria:**
  - Large bold count (32px, extrabold) followed by "Homeowners" label
  - PlanInfo stays on the right
  - `npm run build` passes

- [ ] 1.4 [frontend] [sonnet] Restyle HomeownerCardList container

  **File:** `src/app/[locale]/(private)/homeowners/_components/HomeownerCardList/index.tsx`

  **Changes:**
  - Card list gap: `flex flex-col gap-1.5` (from `gap-3`)
  - Select-all row: `flex items-center gap-2 py-1 pl-1 text-[13px] text-gray-500` (from `px-1`)
  - Empty state: `flex items-center justify-center py-20` with `text-sm text-gray-400` (from `h-full`, `text-gray-500`)
  - Pagination wrapper: unchanged

  **Acceptance criteria:**
  - Cards have 6px gap between them
  - Select-all row has 13px text in gray-500
  - Empty state is vertically centered with more padding
  - `npm run build` passes

## 2. Toolbar Restyle

- [ ] 2.1 [frontend] [sonnet] Restyle HomeownersToolbar

  **File:** `src/app/[locale]/(private)/homeowners/_components/HomeownersToolbar/index.tsx`

  **Changes:**
  - Remove the outer `<div className="sticky top-[80px] z-30 bg-white shadow-sm">`
  - Replace with single container: `<div className="bg-white border border-gray-200 rounded-xl py-3 px-4 flex flex-wrap items-center gap-2 mb-4 sticky top-[56px] z-30 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">`
  - All `TextInput`: add `radius="lg"` and `classNames={{ input: 'text-[13px] h-9' }}`
  - `DatePickerInput`: add `radius="lg"` and `classNames={{ input: 'text-[13px] h-9' }}`
  - Both `MultiSelect`: add `radius="lg"` and `classNames={{ input: 'text-[13px] min-h-[36px]' }}`
  - Clear button: change to `variant="subtle" color="gray"` with `className="text-[13px] font-medium"`
  - Refresh button: add `color="gray"` and `className="text-[13px] font-medium"`
  - Add divider `<div className="w-px h-6 bg-gray-200 mx-1" />` before Actions dropdown
  - Actions dropdown trigger: add `color="gray"` and `className="text-[13px] font-medium"`
  - Add divider `<div className="w-px h-6 bg-gray-200 mx-1" />` after Actions dropdown
  - Bulk Import button: add `color="gray"` and `className="text-[13px] font-medium"`
  - Send a Report button: change to `className="bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-medium"` with `color="orange"`
  - Keep all existing props, handlers, disabled states

  **Acceptance criteria:**
  - Toolbar is a bordered rounded container, not a flat sticky bar
  - Sticky at top-[56px] (below header)
  - All inputs are 36px height with 13px text
  - Dividers separate filter section from actions section
  - Send a Report is orange primary CTA
  - All filter/action behavior works identically
  - `npm run build` passes

## 3. Card Restyle

Depends on task 1.4 (HomeownerCardList must have correct gap).

- [ ] 3.1 [frontend] [opus] Restyle HomeownerCard collapsed state

  **File:** `src/app/[locale]/(private)/homeowners/_components/HomeownerCard/index.tsx`

  **Changes -- Structure:**
  - Replace Mantine `Card` with `<div>`
  - Remove `Card` and `Avatar` imports from `@mantine/core`
  - Remove `Badge` import (replace with custom pill spans)
  - Add new icon imports: `IconCircleCheck`, `IconClock`, `IconMailForward`, `IconFileText`, `IconFileOff`, `IconChevronDown` from `@tabler/icons-react`
  - Remove `FLAGS` and `getLanguageFlagUrl` usage for the avatar -- but keep them for the inline language chip

  **Changes -- Layout:**
  - Outer container classes based on state:
    - Base: `bg-white border border-gray-200 rounded-xl py-4 px-5 transition-all duration-200`
    - Has reports: `cursor-pointer hover:border-gray-300 hover:shadow-sm`
    - No reports: `bg-gray-50 cursor-default`
    - Expanded: `border-orange-500 shadow-md ring-1 ring-orange-500`
  - Inner grid: `grid grid-cols-[28px_1fr_auto] gap-4 items-center`
    - Col 1: Checkbox (keep Mantine `Checkbox`)
    - Col 2: `grid grid-cols-[240px_1fr] gap-4 items-center`
      - Identity (240px):
        - Name: `<p className="text-sm font-semibold text-gray-900 tracking-tight truncate">`
        - Remove `.toUpperCase()` call
        - Email: `<p className="text-xs text-gray-400 truncate">`
      - Meta (1fr): `<div className="flex items-center gap-3 flex-wrap">`
        - Status pill: `<span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold tracking-wide border {colorClasses}">`
          - Active: `bg-emerald-50 text-emerald-800 border-emerald-200` + `<IconCircleCheck size={12} />`
          - Pending / Invitation Sent Not Viewed: `bg-amber-50 text-amber-800 border-amber-200` + `<IconClock size={12} />`
          - Invitation Sent Viewed: `bg-blue-50 text-blue-800 border-blue-200` + `<IconMailForward size={12} />`
        - Report count: `<div className="flex items-center gap-1.5 text-xs text-gray-500">`
          - Has reports: `<IconFileText size={14} className="text-gray-400" />` + `<span className="font-semibold text-gray-900">{count}</span>` + ` reports` (translated)
          - Zero reports: `<IconFileOff size={14} className="text-red-500" />` + `<span className="font-medium text-red-500">0 reports</span>` (translated)
        - Language chip: `<span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">` + `<img src={flagUrl} className="w-[18px] h-[13px] rounded-sm object-cover" />` + language code
          - Keep the `Menu` for language selection -- clicking the chip opens the dropdown
        - Source badge: `<span className="inline-flex items-center py-0.5 px-2 rounded text-[11px] font-semibold tracking-wide {sourceClasses}">`
          - LF / LoanFactory: `bg-blue-100 text-blue-800`
          - LFIQ / LoanFactoryIQ: `bg-orange-50 text-orange-700`
    - Col 3: `<IconChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-orange-500' : ''}`} />`
      - Only show chevron when `hasReports`

  **Changes -- Removed elements:**
  - Mantine `Avatar` (no avatar)
  - "Last viewed" text (moved to expanded table only)
  - "Language" label text (just flag chip)
  - "Source report" label text (just source badge)
  - Mantine `Badge` component (custom pills)
  - The `getStatusBadgeColor` utility call (inline pill classes instead)

  **Acceptance criteria:**
  - Card shows: [checkbox] [name/email (240px)] [status pill | report count | flag chip | source badge] [chevron]
  - No avatar displayed
  - Name is mixed case (no uppercase)
  - Status uses colored pill with icon
  - Report count shows number prominently
  - Language shows flag + code inline
  - Source shows colored badge (LF = blue, LFIQ = orange)
  - Hover: border darkens, subtle shadow appears
  - No-reports cards: gray background, no hover effect, no chevron
  - Expanded: orange border with ring, chevron rotated
  - Language menu still works
  - `npm run build` passes

- [ ] 3.2 [frontend] [sonnet] Restyle HomeownerCard expanded state

  **File:** `src/app/[locale]/(private)/homeowners/_components/HomeownerCard/index.tsx`

  **Depends on:** 3.1 (collapsed state must be done first, since this is the same file)

  **Changes:**
  - Replace `<hr className="my-2 border-gray-200" />` with `<div className="mt-4 pt-4 border-t border-gray-100">`
  - Add section title before InfiniteScrollTable: `<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">{t('HomeOwner.properties_and_reports')}</p>`
  - The InfiniteScrollTable itself stays as-is (column cell restyling is in task 4.1)
  - Add new i18n key `HomeOwner.properties_and_reports` to English and Vietnamese message files (if not blocking, can use fallback text)

  **Acceptance criteria:**
  - Expanded section has a light gray-100 top border with 16px spacing
  - Section title "Properties & Reports" appears in uppercase, 12px, gray-400
  - InfiniteScrollTable renders below the title
  - `npm run build` passes

## 4. Table Column Restyle

Depends on task 3.2 (expanded state structure must be in place).

- [ ] 4.1 [frontend] [opus] Restyle ReportColumnsConfig cell renderers

  **File:** `src/app/[locale]/(private)/homeowners/_components/ReportColumnsConfig.tsx`

  **Changes for each column Cell renderer:**

  **`summary` column:**
  - Address text: `text-[13px] font-medium text-gray-500 truncate cursor-pointer hover:text-orange-500` (from `text-16 text-gray-500`)
  - Created date badge: replace Mantine `Badge` with `<span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] px-2 py-0.5">`
  - Tag badge: replace `getStatusBadgeColor(tag)` with `<span className="inline-flex items-center bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] px-2 py-0.5">`
  - Rate alert badge: replace with `<span className="inline-flex items-center bg-orange-50 text-orange-600 border border-orange-200 rounded-full text-[10px] px-2 py-0.5">`
  - Remove Mantine `Badge` usage in this column

  **`url` column:**
  - View report button: keep `SeoLinkButton` but update: `className="h-7 px-2.5 rounded-md text-xs font-medium"` with `variant="outline" color="orange" size="xs"`
  - Copy icon container: `w-4 h-4` (unchanged)

  **`mortgage_info` column:**
  - Container: `flex gap-4` (from `flex flex-col`)
  - Each item: `<span className="text-xs text-gray-500">` with value `<span className="font-semibold text-gray-900">`
  - Layout change: items side-by-side (horizontal) instead of stacked

  **`statistics` column:**
  - Replace Mantine `Grid` with `<div className="flex items-center gap-4 cursor-pointer">`
  - Each stat: `<span className="flex items-center gap-1 text-xs text-gray-500">` with icon (size 14, `text-gray-400`) + label + `<span className="font-semibold text-gray-900">{count}</span>`
  - Remove: `group-hover:scale-105`, `group-hover:underline`, large `text-lg font-bold` colored numbers
  - Remove: inner `<Tooltip>` wrappers per stat (keep the outer click handler)
  - Remove Mantine `Grid` and `Grid.Col` imports

  **`status` column:**
  - Replace Mantine `Badge` with inline pill:
    - Active: `<span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-semibold px-2 py-0.5">`
    - Pending: same pattern with `bg-amber-50 text-amber-800 border-amber-200`
    - Failed: same pattern with `bg-red-50 text-red-800 border-red-200`
  - Keep `Tooltip` for failed status messages

  **`actions` column:**
  - Wrap delete icon in: `<div className="flex items-center gap-1 text-red-500 border border-red-200 rounded-md p-1 hover:bg-red-50 cursor-pointer">`
  - Keep `Popover` confirmation dialog

  **Acceptance criteria:**
  - All table cells use compact text (12-13px)
  - No Mantine `Badge` or `Grid` components in column renderers
  - Engagement stats are inline horizontal, not a 3-column grid
  - Mortgage info is inline horizontal, not stacked
  - Status uses colored pill badges matching card-level design
  - All click handlers (view report, copy, delete, statistics) still work
  - `npm run build` passes

## 5. i18n Keys

- [ ] 5.1 [frontend] [haiku] Add new i18n key for expanded section title

  **Files (all 7 locale files):**
  - `src/messages/en.json`
  - `src/messages/vi.json`
  - `src/messages/es.json`
  - `src/messages/zh.json`
  - `src/messages/he.json`
  - `src/messages/ar.json`
  - `src/messages/ko.json`

  **Changes:**
  - Add key inside `"HomeOwner"` namespace: `"properties_and_reports": "Properties & Reports"`
  - Translate for each locale:
    - en: `"Properties & Reports"`
    - vi: `"Bat dong san & Bao cao"`
    - es: `"Propiedades e Informes"`
    - zh: `"房产与报告"`
    - he: `"נכסים ודוחות"`
    - ar: `"العقارات والتقارير"`
    - ko: `"부동산 및 보고서"`

  **Acceptance criteria:**
  - Key exists in all 7 language files under the `HomeOwner` namespace
  - `t('HomeOwner.properties_and_reports')` resolves without fallback warning
  - `npm run build` passes

## 6. Final Verification

Depends on all previous tasks.

- [ ] 6.1 [frontend] [sonnet] Integration verification and cleanup

  **All component files in scope.**

  **Checks:**
  - Run `npm run build` -- must pass with zero errors
  - Run `npm run lint` -- must pass
  - Verify no remaining `style={{}}` in changed files
  - Verify no Mantine `Stack`, `Group`, `Text`, `Title` in changed files
  - Verify no hardcoded English strings (all via `useTranslations()`)
  - Verify optional chaining on all data access (`homeowner?.`, `data?.`, etc.)
  - Verify no unused imports after refactoring
  - Spot-check: component renders without crash when data is empty/null

  **Acceptance criteria:**
  - `npm run build` exits 0
  - `npm run lint` exits 0 (or no new violations)
  - All project rules are followed
  - Visual output matches Style A mockup
