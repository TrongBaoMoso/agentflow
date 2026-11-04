# Design: LF-IQ Homeowners Visual Redesign

## Architecture Overview

This change is purely visual. No new files, no new components, no new hooks, no backend changes. Every existing component keeps its current props interface and behavior. Only Tailwind classes and minor JSX structure (e.g., wrapping elements for layout) change.

```
ReportPage (page-level padding adjustment)
  +-- InstructionBanner (visual restyle)
  +-- HomeownersToolbar (visual restyle)
  +-- HomeownerStats (visual restyle)
  +-- HomeownerCardList (list container + select-all restyle)
        +-- HomeownerCard (collapsed + expanded visual restyle)
              +-- InfiniteScrollTable (column cell styling via ReportColumnsConfig)
```

## Design System: Style A -- Modern Data Dashboard

### Color Palette

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Accent | `#f36f20` | `text-orange-500`, `bg-orange-500`, `border-orange-500` | CTAs, active states, expanded card border |
| Accent Light | `#fff4ed` | `bg-orange-50` | Accent backgrounds (banner, hover) |
| Accent Hover | `#e05e12` | `hover:bg-orange-600` | Button hover |
| Background | `#fafafa` | `bg-gray-50` | Page background |
| Surface | `#ffffff` | `bg-white` | Cards, toolbar |
| Border | `#e5e7eb` | `border-gray-200` | Default borders |
| Border Light | `#f0f0f0` | `border-gray-100` | Expanded section dividers |
| Text Primary | `#111827` | `text-gray-900` | Headings, names, values |
| Text Secondary | `#6b7280` | `text-gray-500` | Labels, descriptions |
| Text Tertiary | `#9ca3af` | `text-gray-400` | Placeholders, icons |
| Green | `#10b981` | -- | Active status pill |
| Green BG | `#ecfdf5` | `bg-emerald-50` | Active pill background |
| Green Border | `#a7f3d0` | `border-emerald-200` | Active pill border |
| Yellow | `#f59e0b` | -- | Pending status pill |
| Yellow BG | `#fffbeb` | `bg-amber-50` | Pending pill background |
| Yellow Border | `#fde68a` | `border-amber-200` | Pending pill border |
| Blue | `#3b82f6` | -- | Invitation Sent pill |
| Blue BG | `#eff6ff` | `bg-blue-50` | Invitation pill background |
| Blue Border | `#bfdbfe` | `border-blue-200` | Invitation pill border |
| Red | `#ef4444` | `text-red-500` | No-reports indicator, delete |
| Purple | `#8b5cf6` | -- | Plan badge |
| Purple BG | `#f5f3ff` | `bg-violet-50` | Plan badge background |

### Typography Scale

All text uses the project's existing Inter font (loaded by the app).

| Element | Size | Weight | Tailwind Classes |
|---------|------|--------|------------------|
| Stats Count | 32px | 800 | `text-[32px] font-extrabold tracking-tight leading-none` |
| Stats Label | 14px | 500 | `text-sm font-medium text-gray-500` |
| Card Name | 14px | 600 | `text-sm font-semibold text-gray-900 tracking-tight` |
| Card Email | 12px | 400 | `text-xs text-gray-400` |
| Pill Text | 11px | 600 | `text-[11px] font-semibold tracking-wide` |
| Meta Text | 12px | 400 | `text-xs text-gray-500` |
| Meta Count | 12px | 600 | `text-xs font-semibold text-gray-900` |
| Toolbar Input | 13px | 400 | `text-[13px]` |
| Toolbar Button | 13px | 500 | `text-[13px] font-medium` |
| Table Header | 11px | 600 | `text-[11px] font-semibold uppercase tracking-widest text-gray-400` |
| Table Cell | 13px | 400 | `text-[13px] text-gray-900` |
| Banner Text | 13px | 400 | `text-[13px]` |
| Section Title | 12px | 600 | `text-xs font-semibold uppercase tracking-widest text-gray-400` |

### Spacing System

| Context | Value | Tailwind |
|---------|-------|----------|
| Page padding | 24px | `p-6` |
| Section gaps | 16px | `gap-4` |
| Card padding | 16px 20px | `py-4 px-5` |
| Card list gap | 6px | `gap-1.5` |
| Toolbar padding | 12px 16px | `py-3 px-4` |
| Toolbar item gap | 8px | `gap-2` |
| Card inner gap | 16px | `gap-4` |
| Meta pill gap | 12px | `gap-3` |
| Banner padding | 14px 20px | `py-3.5 px-5` |
| Stats bottom margin | 16px | `mb-4` |

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Cards | 12px | `rounded-xl` |
| Toolbar | 12px | `rounded-xl` |
| Banner | 12px | `rounded-xl` |
| Inputs | 8px | `rounded-lg` |
| Buttons | 8px | `rounded-lg` |
| Pills | 100px (full) | `rounded-full` |
| Checkboxes | 4px | `rounded` |
| Source badges | 4px | `rounded` |

### Shadow System

| State | Tailwind |
|-------|----------|
| Card default | none (border only) |
| Card hover | `hover:shadow-sm` |
| Card expanded | `shadow-md` + accent border ring |
| Toolbar | `shadow-xs` (via `shadow-[0_1px_2px_rgba(0,0,0,0.04)]`) |

---

## Component Specifications

### 1. InstructionBanner (`InstructionBanner/index.tsx`)

**Current:** Mantine `Card` with `withBorder`, `shadow="xs"`, `bg-orange-50 border-orange-200`.

**New design:**
- Remove Mantine `Card` component. Replace with a plain `<div>`.
- Container: `bg-orange-50 border border-[#fde0c8] rounded-xl py-3.5 px-5 flex items-center gap-3 relative w-full md:w-2/3 mx-auto`
- Add a left icon: `<IconBulb size={20} className="text-orange-500 shrink-0" />`
- Text: `text-[13px] text-amber-900 leading-relaxed flex-1 pr-6`
- Close button: keep existing `ActionIcon` but style: `absolute top-2 right-2`, using `variant="subtle"` with `color="gray"` and `radius="xl"` (unchanged)
- Remove Mantine `Card` import, add Tabler `IconBulb` import

**Key Tailwind classes:**
```
Container: bg-orange-50 border border-[#fde0c8] rounded-xl py-3.5 px-5 flex items-center gap-3 relative w-full md:w-2/3 mx-auto mb-5
Icon: text-orange-500 shrink-0
Text: text-[13px] text-amber-900 leading-relaxed flex-1 pr-6
```

### 2. HomeownerStats (`HomeownerStats/index.tsx`)

**Current:** `text-lg font-semibold text-gray-500` for label, `text-4xl font-bold text-gray-900` for count. PlanInfo on the right.

**New design:**
- Container: `flex items-center justify-between mb-4`
- Left side: `flex items-baseline gap-2`
  - Count: `text-[32px] font-extrabold text-gray-900 tracking-tight leading-none`
  - Label: `text-sm font-medium text-gray-500`
- Right side: PlanInfo (unchanged -- the PlanInfo component has its own styling and is out of scope)

**Key Tailwind classes:**
```
Container: flex items-center justify-between mb-4
Left: flex items-baseline gap-2
Count: text-[32px] font-extrabold text-gray-900 tracking-tight leading-none
Label: text-sm font-medium text-gray-500
```

### 3. HomeownersToolbar (`HomeownersToolbar/index.tsx`)

**Current:** `sticky top-[80px] z-30 bg-white shadow-sm` with `flex flex-wrap items-end gap-2 px-4 py-3`.

**New design:**
- Outer container: `bg-white border border-gray-200 rounded-xl py-3 px-4 flex flex-wrap items-center gap-2 mb-4 sticky top-[56px] z-30 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
- Remove the extra wrapper `<div>` that had `shadow-sm` -- the toolbar itself is now the bordered card
- All `TextInput`/`MultiSelect`/`DatePickerInput`: add `radius="lg"` (8px), keep existing width classes
- Add `classNames={{ input: 'text-[13px] h-9 border-gray-200 focus:border-orange-500' }}` to inputs for consistent sizing
- Clear button: ghost style -- `variant="subtle" color="gray"` with `className="text-[13px] font-medium"`
- Refresh button: outlined -- keep `variant="outline"` but add `color="gray"` and `className="text-[13px] font-medium border-gray-200 hover:bg-gray-50"`
- Add a `<div className="w-px h-6 bg-gray-200 mx-1" />` divider between Refresh and Actions dropdown
- Actions dropdown button: `variant="outline" color="gray" className="text-[13px] font-medium border-gray-200"`
- Bulk Import button: `variant="outline" color="gray" className="text-[13px] font-medium border-gray-200 hover:bg-gray-50"`
- Send a Report button: `className="bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-medium border-orange-500"` (primary CTA)
- Spacer: `<div className="flex-1" />` (already exists)
- Add another `<div className="w-px h-6 bg-gray-200 mx-1" />` divider between Actions dropdown and Bulk Import

**Key layout:**
```
[Search] [DateRange] [SourceFilter] [StatusFilter] [Clear] [Refresh] | [spacer] | [Actions v] | [Bulk Import] [Send a Report (primary)]
```

### 4. HomeownerCard (`HomeownerCard/index.tsx`)

**Current:** Mantine `Card` with `withBorder`, `shadow="xs"`, `grid grid-cols-12`. Avatar column. Hover: `hover:shadow-lg hover:border-orange-300 hover:bg-orange-50 hover:scale-[1.01]`.

**New design -- Collapsed State:**

Replace Mantine `Card` with plain `<div>`.

- Container: `bg-white border border-gray-200 rounded-xl py-4 px-5 transition-all duration-200`
  - Has reports: `cursor-pointer hover:border-gray-300 hover:shadow-sm`
  - No reports: `bg-gray-50 cursor-default` (no hover effect)
  - Expanded: `border-orange-500 shadow-md ring-1 ring-orange-500`
- Layout: `grid grid-cols-[28px_1fr_auto] gap-4 items-center`
  - Column 1 (28px): Checkbox -- keep Mantine `Checkbox` (allowed component), add `className="accent-orange-500"`
  - Column 2 (1fr): `grid grid-cols-[240px_1fr] gap-4 items-center`
    - Left (240px): Identity block
      - Name: `text-sm font-semibold text-gray-900 tracking-tight truncate` (NO `.toUpperCase()` -- mixed case per mockup)
      - Email: `text-xs text-gray-400 truncate`
    - Right (1fr): Meta pills in a flex row `flex items-center gap-3 flex-wrap`
      - Status pill: `inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold tracking-wide border`
        - Active: `bg-emerald-50 text-emerald-800 border-emerald-200` + `IconCircleCheck` size 12
        - Pending: `bg-amber-50 text-amber-800 border-amber-200` + `IconClock` size 12
        - Invitation Sent (viewed): `bg-blue-50 text-blue-800 border-blue-200` + `IconMailForward` size 12
        - Invitation Sent (not viewed): `bg-blue-50 text-blue-800 border-blue-200` + `IconMailForward` size 12
      - Report count: `flex items-center gap-1.5 text-xs text-gray-500` with icon `IconFileText` size 14 + `<span className="font-semibold text-gray-900">{count}</span> reports`
        - Zero reports: `text-red-500` with `IconFileOff` size 14
      - Language chip: `inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium` with flag `<img>` (18x13, rounded-sm) + language code
      - Source badge: `inline-flex items-center py-0.5 px-2 rounded text-[11px] font-semibold tracking-wide`
        - LF: `bg-blue-100 text-blue-800`
        - LFIQ: `bg-orange-50 text-orange-700`
  - Column 3 (auto): Expand chevron `<IconChevronDown size={18} className="text-gray-400 transition-transform duration-200" />`, rotated 180 degrees when expanded + accent color

**Remove from current card:**
- Mantine `Avatar` component (no avatars per requirement)
- `.toUpperCase()` on name
- `hover:scale-[1.01]` (too aggressive)
- `hover:bg-orange-50` on the whole card (only border/shadow change on hover)
- Mantine `Badge` components -- replace with custom pill `<span>` elements
- The 12-column grid -- replace with the 3-column grid described above
- "Last viewed" row inside card -- remove from collapsed state (engagement stats are in the expanded table)
- Language label text ("Language") -- just show the flag chip inline with other pills
- Source report label text -- just show the source badge inline

**New design -- Expanded State:**

- Divider: `mt-4 pt-4 border-t border-gray-100` (replaces `<hr>`)
- Section title: `<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">` with text from `t('HomeOwner.properties_and_reports')` (new i18n key -- fallback: "Properties & Reports")
- The `InfiniteScrollTable` remains as-is structurally, but column cells are restyled via `ReportColumnsConfig.tsx`

### 5. HomeownerCardList (`HomeownerCardList/index.tsx`)

**Current:** `flex flex-col gap-3`. Select-all has `flex items-center gap-2 px-1`.

**New design:**
- Card list gap: `flex flex-col gap-1.5` (tighter, 6px)
- Select-all row: `flex items-center gap-2 py-1 pl-1 text-[13px] text-gray-500` -- keep Mantine `Checkbox`
- Empty state: `flex items-center justify-center py-20 text-sm text-gray-400`
- Pagination: unchanged (the `Pagination` component is shared and out of scope)

### 6. ReportColumnsConfig (`ReportColumnsConfig.tsx`)

This file defines columns for the expanded `InfiniteScrollTable`. Each column's `Cell` renderer needs visual updates.

**Column: `summary` (Property)**
- Property image: keep `SeoImage`, add `rounded-lg` class
- Address: `text-[13px] font-medium text-gray-500 truncate cursor-pointer hover:text-orange-500`
- Date badge: `bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] px-2 py-0.5`
- Tag badge: replace `getStatusBadgeColor(tag)` usage with inline pill:
  - CREATED: `bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] px-2 py-0.5`
  - Bulk Import: same gray pill style
- Rate alert badge: `bg-orange-50 text-orange-600 border border-orange-200 rounded-full text-[10px] px-2 py-0.5`

**Column: `url` (Report Link)**
- View button: `h-7 px-2.5 rounded-md text-xs font-medium text-orange-500 border border-orange-500 hover:bg-orange-50 inline-flex items-center gap-1`
- Copy icon: keep `IconCopy`/`IconCheck`, size 14, `text-orange-500`

**Column: `mortgage_info`**
- Layout: `flex gap-4`
- Each item: `text-xs text-gray-500` with value `font-semibold text-gray-900`

**Column: `statistics` (Engagement)**
- Replace Mantine `Grid` with a flex row: `flex items-center gap-4`
- Each stat: `flex items-center gap-1 text-xs text-gray-500`
  - Icon: size 14, `text-gray-400`
  - Label text
  - Value: `font-semibold text-gray-900`
- Remove `group-hover:scale-105` and `group-hover:underline` -- too aggressive for the clean style
- Remove large `text-lg font-bold` colored numbers -- use compact `text-xs` inline format

**Column: `status`**
- Replace Mantine `Badge` with inline pill matching card-level pill styles (but smaller, 10px font)
- Active: `bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-semibold px-2 py-0.5`
- Pending: `bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-semibold px-2 py-0.5`
- Failed: `bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-semibold px-2 py-0.5`

**Column: `actions`**
- Delete icon: `text-red-500 border border-red-200 rounded-md p-1 hover:bg-red-50 cursor-pointer` (wrap in a small button-like container)
- Popover: keep Mantine `Popover` behavior

### 7. ReportPage (`ReportPage/index.tsx`)

**Current:** `p-8` with `flex flex-col gap-7`.

**New design:**
- Container: `p-6` (24px padding, down from 32px)
- Inner: `flex flex-col gap-4` (16px gap, down from 28px, since individual components now control their own bottom margins)

---

## Interaction States

### Card Hover (collapsed, has reports)
- Border: `border-gray-200` -> `border-gray-300`
- Shadow: none -> `shadow-sm`
- Cursor: `cursor-pointer`
- Transition: `transition-all duration-200`

### Card Expanded
- Border: `border-orange-500`
- Ring: `ring-1 ring-orange-500`
- Shadow: `shadow-md`
- Chevron: `rotate-180 text-orange-500`

### Card No Reports
- Background: `bg-gray-50`
- Cursor: `cursor-default`
- Hover: no visual change

### Toolbar Input Focus
- Border: `border-gray-200` -> `border-orange-500` (via `focus:border-orange-500`)

### Primary Button (Send a Report)
- Default: `bg-orange-500 text-white`
- Hover: `bg-orange-600`

### Ghost Button (Clear, Refresh)
- Default: transparent border
- Hover: `bg-gray-50`

---

## Transition Specifications

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Card border/shadow | all | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` via `transition-all duration-200` |
| Chevron rotation | transform | 200ms | same |
| Input focus border | border-color | 200ms | same |
| Button hover | all | 200ms | same |
| Table row hover bg | background | 150ms | ease |

---

## Conventions

Per lf-iq CLAUDE.md and project rules:

1. **No Mantine layout components** -- No `Stack`, `Group`, `Text`, `Title`. Use `<div>`, `<p>`, `<span>` with Tailwind.
2. **No `style={{}}`** -- All styling via Tailwind classes.
3. **Translations** -- All user-visible text via `useTranslations()`. One new i18n key needed: `HomeOwner.properties_and_reports` (English: "Properties & Reports", Vietnamese: TBD).
4. **Null safety** -- Optional chaining (`?.`) on all data access. Fallback defaults for missing values.
5. **Mantine components allowed** -- `Checkbox`, `Menu`, `Tooltip`, `Popover`, `TextInput`, `MultiSelect`, `DatePickerInput`, `Button`, `ActionIcon`, `Badge` (in table columns where replacement is complex). Avoid `Card`, `Avatar`, `Grid` in favor of native HTML + Tailwind.
6. **No new dependencies.**

---

## Files Changed

| File | Change Type |
|------|-------------|
| `src/app/[locale]/(private)/homeowners/_components/InstructionBanner/index.tsx` | Visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerStats/index.tsx` | Visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/HomeownersToolbar/index.tsx` | Visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerCard/index.tsx` | Major visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/HomeownerCardList/index.tsx` | Visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/ReportColumnsConfig.tsx` | Column cell visual restyle |
| `src/app/[locale]/(private)/homeowners/_components/ReportPage/index.tsx` | Spacing adjustment |

No new files. No deleted files. No backend changes.
