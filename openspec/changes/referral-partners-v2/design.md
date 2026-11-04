# Design: Referral Partners V2 Visual Redesign

## Architecture Decision: Mirror homeowners-v2 Structure

The v2 implementation follows the exact component architecture established in `homeowners-v2/`. This ensures visual consistency and makes the codebase easier to navigate — developers familiar with one v2 page can immediately understand the other.

**Key decisions:**
- Tailwind-first styling (no Mantine `Stack`, `Group`, `Text`, `Title` per project conventions)
- Component decomposition: one file per concern, all under 500 lines
- Reuse existing `GeneralTable` for expanded report table (not `InfiniteScrollTable`)
- Reuse existing API hooks and data fetching patterns from v1
- Modals keep the same `useModal` + `IMantineModalState` pattern but get v2 visual treatment

## File Structure

```
src/app/[locale]/(private)/
├── referral-partners/
│   ├── page.tsx                          # MODIFY: add withUIVersion HOC
│   ├── layout.tsx                        # NO CHANGE
│   └── _components/                      # v1 components (untouched)
│       ├── ReferralPartners/index.tsx
│       ├── AddReferralPartnersModal/index.tsx
│       ├── InviteNewReferralPartnersModal/index.tsx
│       ├── UserInfoModal/index.tsx
│       ├── DefaultRealtorModal/index.tsx
│       └── SelectRealtorModal/index.tsx
│
├── referral-partners-v2/
│   └── _components/
│       ├── ReferralPartnersPage/index.tsx     # Main page orchestrator
│       ├── PartnerCard/index.tsx               # Single partner card
│       ├── PartnerCardList/index.tsx           # Card list + select-all + empty state
│       ├── PartnersToolbar/index.tsx           # Sticky toolbar + filters
│       ├── ReportColumnsConfig.tsx             # MRT column definitions for reports table
│       ├── AddPartnerModal/index.tsx           # Redesigned: add existing partner
│       ├── InvitePartnerModal/index.tsx        # Redesigned: invite by email
│       ├── UserInfoModal/index.tsx             # Redesigned: partner detail view
│       ├── DefaultRealtorModal/index.tsx       # Redesigned: manage default realtor
│       └── SelectRealtorModal/index.tsx        # Redesigned: select realtor picker
```

## Version Switching Integration

### Modified file: `referral-partners/page.tsx`

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import type { UserStatus } from '@shared/types/user'
import RouteGuard from '@shared/components/RouteGuard'
import { withUIVersion } from '@shared/components/withUIVersion'

// Matches the homeowners/page.tsx pattern exactly
interface ReferralPartnersPageProps {
  initialStatus?: UserStatus
  initialSource?: 'LF' | 'LFIQ'
}

const ReferralPartners = withUIVersion<ReferralPartnersPageProps>(
  () => import('./_components/ReferralPartners'),
  () => import('../referral-partners-v2/_components/ReferralPartnersPage')
)

export default function ReferralPartnersPage() {
  const searchParams = useSearchParams()
  const statusFromUrl = searchParams.get('status') as UserStatus | null
  const sourceFromUrl = searchParams.get('source') as 'LF' | 'LFIQ' | null

  return (
    <RouteGuard requiredRoles={['LOAN_OFFICER', 'ADMIN']}>
      <ReferralPartners
        initialStatus={statusFromUrl || undefined}
        initialSource={sourceFromUrl || undefined}
      />
    </RouteGuard>
  )
}
```

## Component Specifications

### 1. ReferralPartnersPage (Main Orchestrator)

**File:** `referral-partners-v2/_components/ReferralPartnersPage/index.tsx`
**Responsibility:** State management, data fetching, wiring child components.

- Reuse all state and data-fetching logic from v1 `ReferralPartners/index.tsx` but decomposed
- State: search, keyword, dateRange, currentStatus, currentSource, filter, pagination, expanded, loading, referralPartners, copiedId
- API: `getReferralPartners({ currentPage, pageSize, search, filter, expand: 'reports,profile' })`
- URL sync: same `useUrlParams` pattern as v1
- Renders: `PrivatePageTourHeader` + instruction banner + `PartnersToolbar` + `PartnerCardList`
- Pass `onRefresh`, `fetchReferralPartners`, modal handlers as props

**Props interface:**
```tsx
interface ReferralPartnersPageProps {
  initialStatus?: UserStatus
  initialSource?: 'LF' | 'LFIQ'
}
```

**Container layout:**
```tsx
<div className="p-8">
  <div className="flex flex-col gap-7">
    <PrivatePageTourHeader ... />
    {/* Instruction banner - same Card as v1 but styled to v2 */}
    <PartnersToolbar ... />
    <PartnerCardList ... />
  </div>
</div>
```

### 2. PartnerCard

**File:** `referral-partners-v2/_components/PartnerCard/index.tsx`
**Responsibility:** Single partner row — mirrors HomeownerCard exactly.

**Container classes (exact from HomeownerCard):**
```
Base:        bg-white border rounded-[12px] py-[16px] px-[20px] transition-all duration-200
Expanded:    border-[#f36f20] shadow-[0_0_0_1px_#f36f20,0_4px_6px_-1px_rgba(0,0,0,0.07)]
Hover:       hover:border-[#d1d5db] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer
No reports:  bg-[#ecf2f8] cursor-default border-dashed border-[#d1d5db] opacity-75
Default:     border-[#e5e7eb]
```

**Grid layout:**
```
grid grid-cols-[28px_1fr_auto] gap-[16px] items-center
```
- Column 1: Checkbox
- Column 2: Main content (identity + meta, two rows on mobile, grid on md+)
- Column 3: Chevron toggle

**Identity section (within column 2):**
```tsx
<div className="flex flex-col gap-[2px] min-w-0">
  <span className="text-[14px] font-semibold text-[#111827] tracking-[-0.01em] truncate">
    {fullName}
  </span>
  <span className="text-[12px] text-[#9ca3af] truncate">{partner.email}</span>
</div>
```

Avatar click opens `UserInfoModal`. Name displayed as `first_name + last_name` (NOT uppercased, unlike v1).

**Meta row (within column 2, on md+):**
Grid: `md:grid md:grid-cols-[160px_100px_100px_80px] md:gap-4 md:items-center`

- **Status pill:** Same styling as homeowners-v2
  - ACTIVE: `bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]` + `IconCircleCheck`
  - PENDING (displayed as INACTIVE): `bg-[#fffbeb] text-[#92400e] border-[#fde68a]` + `IconClock`
  - Plus last_login info if available

- **Report count badge:**
  - Has reports: `bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]` + `IconFileText`
  - No reports: `bg-[#fef2f2] text-[#dc2626] border-[#fecaca]` + `IconFileText`

- **Source badge:** Colors by source
  - External (LF): `bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]` label "LF"
  - Internal (LFIQ): `bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]` label "LFIQ"

- **Licensed states:** If available, show truncated text

**Chevron:**
```tsx
<span className={`flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-all duration-200 ${
  isExpanded ? 'rotate-180 text-[#f36f20]' : 'text-[#9ca3af]'
}`}>
  <IconChevronDown size={18} />
</span>
```

**Expanded section:**
```tsx
{isExpanded && (
  <div className="mt-[16px] pt-[16px] border-t border-[#f0f0f0]">
    <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af] mb-[12px] block">
      {t('Plan.reports')}
    </span>
    <GeneralTable
      columns={reportColumns}
      data={partner.reports || []}
      options={{
        enableColumnSizing: true,
        enableColumnResizing: true,
        enableBottomToolbar: false,
        enablePagination: false,
      }}
      getRowId={(row) => row.id}
    />
  </div>
)}
```

**Props interface:**
```tsx
type PartnerCardProps = {
  partner: any
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: (partner: any) => void
  onToggleSelect: (id: string) => void
  onOpenUserInfo: (partner: any) => void
  reportColumns: MRT_ColumnDef<any>[]
}
```

### 3. PartnerCardList

**File:** `referral-partners-v2/_components/PartnerCardList/index.tsx`
**Responsibility:** Renders list of PartnerCards with select-all and pagination.

**Exact pattern from HomeownerCardList:**
```tsx
{/* Select-all row */}
<div className="flex items-center gap-[8px] py-[4px] pb-[8px] pl-[4px] text-[13px] text-[#6b7280]">
  <Checkbox checked={...} indeterminate={...} onChange={onSelectAll} label={...} size="sm" />
</div>

{/* Card list */}
<div className="flex flex-col gap-[6px]">
  {data.map(partner => <PartnerCard key={partner.id} ... />)}
</div>

{/* Empty state */}
<div className="flex flex-col items-center justify-center py-[80px]">
  <p className="text-[13px] text-[#6b7280]">{t('Message.no_data')}</p>
</div>

{/* Pagination */}
<div className="w-full my-4">
  <Pagination pagination={pagination} onPaginationChange={onPageChange} showTotalRecords={true} />
</div>
```

**Props interface:**
```tsx
type PartnerCardListProps = {
  data: any[]
  loading: boolean
  expanded: Record<string, boolean>
  selectedPartnerIds: string[]
  pagination: PaginationState
  reportColumns: MRT_ColumnDef<any>[]
  onToggleExpand: (partner: any) => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onOpenUserInfo: (partner: any) => void
  onPageChange: (pagination: PaginationState) => void
}
```

### 4. PartnersToolbar

**File:** `referral-partners-v2/_components/PartnersToolbar/index.tsx`
**Responsibility:** Sticky filter bar + action buttons. Mirrors HomeownersToolbar.

**Container (exact):**
```tsx
<div className="sticky top-[80px] z-30 bg-white shadow-sm rounded-md">
  <div className="flex flex-wrap items-end gap-2 px-4 py-3">
    {/* Actions row */}
    {/* Filters row */}
  </div>
</div>
```

**Actions row:**
- "Add Partner" button (visible only when `!userProfile?.internal`)
- "Invite Partner" button (always visible)
- "Manage Default Realtor" button (visible when `userProfile?.current_profile === 'LOAN_OFFICER'`)
- Filter toggle button (mobile only, with count badge)

**Filters row (collapsible on mobile):**
```tsx
<div className={`${filtersOpen ? 'flex' : 'hidden'} sm:flex ml-auto w-full sm:w-auto flex-wrap items-center justify-end gap-2`}>
  <TextInput placeholder="Search" radius="md" size="sm" ... />
  <DatePickerInput radius="md" size="sm" type="range" ... />
  <MultiSelect data={SOURCE_OPTIONS} radius="md" size="sm" ... />
  <MultiSelect data={STATUS_OPTIONS} radius="md" size="sm" ... />
  <div className="flex items-center gap-2">
    {hasActiveFilters && <Button variant="outline" leftSection={<IconX />} ...>Clear</Button>}
    <IconRefresh ... onClick={onRefresh} />
  </div>
</div>
```

**Props interface:**
```tsx
type PartnersToolbarProps = {
  // Filter state
  search: string
  dateRange: DateRange
  currentSource: string[]
  currentStatus: string[]
  sourceOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
  // Filter handlers
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleClearSearch: () => void
  handleDateRangeChange: (value: [Date | null, Date | null]) => void
  handleSourceChange: (value: string[]) => void
  handleStatusChange: (value: string[]) => void
  handleResetFilter: () => void
  // Action handlers
  onRefresh: () => void
  onAddPartner: () => void
  onInvitePartner: () => void
  onManageDefaultRealtor: () => void
  // State
  loading: boolean
  showAddPartner: boolean
  showManageRealtor: boolean
}
```

### 5. ReportColumnsConfig

**File:** `referral-partners-v2/_components/ReportColumnsConfig.tsx`
**Responsibility:** Defines MRT column definitions for the expanded GeneralTable.

**Columns:**

1. **Summary (Property + Title)** — `size: 400`
   - Property thumbnail: `w-16 min-w-16 h-auto rounded-md` from `property_images[primary=true]`, fallback to `IMAGES.SYSTEMS.NO_IMAGE`
   - Title: clickable, `text-[14px] text-orange-600 font-semibold`, navigates to `ROUTES.EDIT_REPORT/${id}`
   - Address: `text-[12px] text-gray-500 truncate` from `summary` field

2. **Status** — `size: 140`
   - V2-styled status pill (not Mantine Badge)
   - ACTIVE: `bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]`
   - UNSUBSCRIBED: `bg-[#fffbeb] text-[#92400e] border-[#fde68a]`
   - INACTIVE: `bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]`
   - FAILED: `bg-[#fef2f2] text-[#dc2626] border-[#fecaca]` + tooltip with `message` field

3. **Tag** — `size: 120`
   - CREATED: `bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]` label "Manual"
   - BULK_IMPORT: `bg-[#fefce8] text-[#a16207] border-[#fde68a]` label "Bulk Import"

4. **Report Link** — `size: 160`
   - "View Report" link button + copy icon
   - Copy uses `navigator.clipboard.writeText` with success feedback (check icon for 1.5s)

**Export as custom hook:**
```tsx
export function useReportColumns(): MRT_ColumnDef<any>[] {
  const t = useTranslations()
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<string>('')
  // ... return useMemo(() => [...columns], [t, router, copiedId])
}
```

### 6. Modal Redesign (All Five Modals)

All modals keep the same logic and API calls but receive updated visual treatment:

**Common modal styling:**
- `size="xl"` and `radius="md"` (keep existing)
- Title: `text-[20px] font-bold text-[#111827]` (Tailwind, not Mantine Text)
- Description: `text-[14px] text-[#6b7280]`
- Body padding: consistent `p-4` or `p-6`
- Buttons: `radius="md"` consistently
- Cards/items within modals: `rounded-[12px] border` pattern
- Selected state: `bg-[#fff7ed] border-[#f36f20]` (orange-50 / orange border)
- Hover state: `hover:bg-[#f9fafb] hover:border-[#d1d5db]`

**AddPartnerModal** (`referral-partners-v2/_components/AddPartnerModal/index.tsx`):
- Same logic: fetches unregistered partners, allows multi-select, sends invites
- V2 list items: rounded-12 cards with avatar, name, email, orange selection state
- Search bar: `radius="md" size="sm"` consistent with toolbar
- Select-all checkbox row
- Footer: Cancel + Preview Email + Send Invites buttons

**InvitePartnerModal** (`referral-partners-v2/_components/InvitePartnerModal/index.tsx`):
- Same logic: email input with validation, add to list, send invites
- V2 email input area: `bg-[#fff7ed] rounded-[12px] p-4` (warmer than v1)
- Valid emails: `bg-[#ecfdf5] border-[#a7f3d0]` section
- Invalid emails: `bg-[#fef2f2] border-[#fecaca]` section
- Chip styling: use v2 pill pattern (`rounded-full py-[4px] px-[12px]`)

**UserInfoModal** (`referral-partners-v2/_components/UserInfoModal/index.tsx`):
- Same data display but v2 card styling
- Header card: avatar + name + status pill + report count
- Contact card: `rounded-[12px] border border-[#e5e7eb]` with icon rows
- Professional info card: same border pattern

**DefaultRealtorModal** (`referral-partners-v2/_components/DefaultRealtorModal/index.tsx`):
- Same complex logic (state exceptions, SELF assignment, ALL/OTHER)
- V2 Paper items: `rounded-[12px]` instead of default
- State exception cards: v2 border and hover patterns
- Same `SelectRealtorModal` integration

**SelectRealtorModal** (`referral-partners-v2/_components/SelectRealtorModal/index.tsx`):
- Same logic: infinite scroll, search, select realtor
- V2 list items: `rounded-[12px] border` with orange hover
- "Not assigned" and "Assign to me" options keep same behavior

## Data Flow

```
referral-partners/page.tsx
  └── withUIVersion (reads uiVersionAtom)
        ├── v1: ReferralPartners (existing, unchanged)
        └── v2: ReferralPartnersPage
              ├── fetches data: getReferralPartners({ expand: 'reports,profile' })
              ├── manages state: search, filters, pagination, expanded
              └── renders:
                    ├── PartnersToolbar (sticky filters + actions)
                    ├── PartnerCardList
                    │     └── PartnerCard[] (each expandable)
                    │           └── GeneralTable (expanded reports)
                    │                 └── ReportColumnsConfig (column defs)
                    └── Modals (AddPartner, InvitePartner, UserInfo, DefaultRealtor, SelectRealtor)
```

## Conventions Reference

Per lf-iq `CLAUDE.md` and project feedback:
- NO `Stack`, `Group`, `Text`, `Title` from Mantine — use Tailwind
- NO `style={{}}` — use Tailwind classes
- All user-facing text via `useTranslations()` — never hardcode
- Null-safe: always use optional chaining, null guards, fallback defaults
- Max 500 lines per file (ESLint `max-lines: 500`)
- i18n keys: reuse existing keys in `en.json` / `vi.json` — no new keys needed
- Existing API: no backend changes, reuse `getReferralPartners` from `@apis/private-api`

## Status Pill Mapping (Partner Level)

| API Status | Display Label | Pill Style |
|------------|--------------|------------|
| ACTIVE | "Active" | `bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]` |
| PENDING | "Inactive" | `bg-[#fffbeb] text-[#92400e] border-[#fde68a]` |

## Status Pill Mapping (Report Level)

| API Status | Pill Style |
|------------|------------|
| ACTIVE | `bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]` |
| UNSUBSCRIBED | `bg-[#fffbeb] text-[#92400e] border-[#fde68a]` |
| INACTIVE | `bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]` |
| FAILED | `bg-[#fef2f2] text-[#dc2626] border-[#fecaca]` + tooltip |

## Source Badge Mapping

| Source | Pill Style |
|--------|------------|
| External (LF) | `bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]` |
| Internal (LFIQ) | `bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]` |

## Tag Badge Mapping (Report Level)

| Tag | Pill Style |
|-----|------------|
| CREATED | `bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]` label "Manual" |
| BULK_IMPORT | `bg-[#fefce8] text-[#a16207] border-[#fde68a]` label "Bulk Import" |
