# Tasks — Conversation History V2 (lf-iq)

**Change**: `conversation-history-v2`
**Repo**: `/Users/apple/Projects/agentflow/lf-iq/`
**Base branch**: `production`
**Feature branch**: `feature/conversation-history-v2`

> CRITICAL: Each task below is self-contained. DEV agents do NOT read proposal.md or design.md. Task descriptions include file paths, reference files, acceptance criteria, and any context needed to implement.

> CRITICAL: **Task 1.1 (HTML mockup) is a hard blocker.** No TSX implementation task (Epics 2–7) may start until Task 1.1 is approved by the user. DEV Lead MUST enforce this dependency in Beads.

---

## Epic 1 — Design Mockup (BLOCKS EVERYTHING)

### Dependencies: none

- [ ] **1.1 Create HTML mockup at `lf-iq/mockups/conversation-history-v2/index.html`**

  Build a single self-contained static HTML page (no build step, inline `<style>` and `<script>` only, CDN Tailwind via `<script src="https://cdn.tailwindcss.com"></script>` is OK for preview purposes). The mockup is for user visual review only; it is NOT shipped in production.

  **Sections the mockup MUST include** (each labeled with an `<h2>` or anchor so the user can scroll between them):
  1. **Desktop table view — default state** — 1440px width. Shows: page header (icon + title + subtitle), stat strip (10 stat cards in a row, one highlighted as the active filter), sticky toolbar (search input, Channel/Type/Status selects, reset icon button, refresh icon button, view toggle Table | Card), table with 6 rows (columns: channel icon, title, type badge, sender, recipient, status badge, sent date, actions), pagination at bottom.
  2. **Desktop table view — sticky toolbar while scrolled** — same as above but list scrolled so the toolbar is stuck below the admin header. Shows visual separation (shadow under the sticky toolbar).
  3. **Desktop card view** — 1440px width. Same header/stats/toolbar but the list is a responsive grid of conversation cards (2–3 per row). Each card shows channel icon, title, type badge, sender → recipient, status badge, sent date, and a "View" button.
  4. **Mobile card view — 375px width** — header collapsed, stat strip horizontally scrollable, toolbar collapsed into a single "Filter" button with an active-filter count badge. Tapping the button reveals a stacked filter panel. List is a single-column stack of cards.
  5. **Detail drawer open — desktop** — drawer slides in from right (~480px wide); underlying list is dimmed. Drawer content shows: close button, title, channel/type/status badges, sender/recipient details, sent/last-modified dates, message body preview (scrollable), tracking events timeline.
  6. **Detail drawer open — mobile** — drawer is full-width, slides in from right.
  7. **Empty state** — toolbar + "No conversations match your filters" message + "Reset filters" button.
  8. **Loading skeleton — table view** — 8 skeleton rows.
  9. **Loading skeleton — card view** — 6 skeleton cards.

  **Styling constraints**:
  - Match the visual language of `admin/reports/_v2` and `admin/users-v2` (same color palette, same rounded radii, same shadow levels, same toolbar pattern).
  - No Mantine components (this is static HTML).
  - Use the existing lf-iq orange accent (`bg-orange-600` / `text-orange-600`) for the header icon badge, primary CTAs, and the "active" stat card highlight.
  - Stat card colors: Total gray, Sent blue, Opened green, Clicked cyan, Bounced orange, Dropped gray, Spam purple, Deferred yellow, Unsubscribed slate, Error red (matches v1 palette).
  - All text is English. Use real-looking sample copy (realistic titles, emails, recipient names, dates).

  **Acceptance**:
  - File exists at `/Users/apple/Projects/agentflow/lf-iq/mockups/conversation-history-v2/index.html`.
  - Opens as a static file in Chrome / Safari without errors.
  - All 9 sections above are present and visually distinct.
  - User has reviewed and approved. (Approval recorded in the Beads task close-reason.)

  **Reference files to mirror visually** (do NOT copy TSX — translate to static HTML):
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/ReportsToolbar/index.tsx`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/ReportsStatStrip/` (inspect the file)
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserCardV2.tsx`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserDetailDrawerV2/index.tsx`

---

## Epic 2 — Folder Restructure & HOC Wiring

### Dependencies: Epic 1 complete and approved

- [ ] **2.1 Move current page content to `_v1/ConversationHistoryPage/`**

  **Goal**: Extract the body of the existing page into a v1-specific folder so the HOC can target it.

  **Steps**:
  1. Create directory: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v1/ConversationHistoryPage/`
  2. Create `index.tsx` in that new folder.
  3. Move the ENTIRE current content of `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/page.tsx` into the new `_v1/ConversationHistoryPage/index.tsx` verbatim — same imports, same logic, same JSX. Export as default.
  4. Adjust relative imports in the moved file:
     - `./_components/ConversationHistoryDetailModal` → `../../_components/ConversationHistoryDetailModal`
     - Any other `./`-relative imports → add one additional `../`.
  5. Rename the component from `ConversationHistoryPage` to `ConversationHistoryPageV1` and update the default export accordingly.

  **Acceptance**:
  - New file exists at `.../_v1/ConversationHistoryPage/index.tsx` and contains ALL v1 logic.
  - `npx tsc --noEmit` passes from `/Users/apple/Projects/agentflow/lf-iq`.
  - Running the app with `uiVersion = 'v1'` renders the same page the user sees today (verified after Task 2.2).

- [ ] **2.2 Wire `page.tsx` through `withUIVersion` HOC**

  **Goal**: Replace the monolithic `page.tsx` with a thin wrapper that lazy-loads v1 or v2 based on `uiVersionAtom`.

  **Reference**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/page.tsx` — mirror this pattern exactly.

  **Steps**:
  1. Overwrite `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/page.tsx` with:

     ```tsx
     'use client'

     import { withUIVersion } from '@shared/components/withUIVersion'

     const ConversationHistoryPage = withUIVersion(
       () => import('./_v1/ConversationHistoryPage'),
       () => import('./_v2/ConversationHistoryPage')
     )

     const AdminConversationHistoryPage = () => {
       return <ConversationHistoryPage />
     }

     export default AdminConversationHistoryPage
     ```

  2. Create a placeholder `_v2/ConversationHistoryPage/index.tsx` so the import resolves:

     ```tsx
     'use client'
     export default function ConversationHistoryPageV2() {
       return <div className="p-8 text-gray-500">V2 — coming soon</div>
     }
     ```

     (Task 5.1 replaces this placeholder with the real page.)

  **Acceptance**:
  - `npx tsc --noEmit` passes.
  - Running the app with `uiVersion = 'v1'` renders the v1 surface unchanged.
  - Running the app with `uiVersion = 'v2'` renders the placeholder "V2 — coming soon" text.
  - No runtime error about dynamic import in dev or production build.

---

## Epic 3 — V2 Components

### Dependencies: Epic 2 complete

These tasks can be implemented in parallel by different DEV agents. Each component lives in its own folder under `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/_components/`.

**Global rules for every component in Epic 3**:
- NO `Stack`, `Group`, `Text`, `Title` from `@mantine/core`. Use `div` + Tailwind.
- NO inline `style={{}}` — spacing/color/layout via Tailwind classes only.
- All copy comes from `t('ConversationHistoryPageV2.<key>')`. Task 6.1 defines the key list; it's OK to reference keys before they're added — `next-intl` will log a warning but not crash, and Task 6.1 fills them in.
- Named export for the component. Default export also allowed. File is an `index.tsx` inside its own folder.

- [ ] **3.1 Build `ConversationHistoryToolbar` (sticky, filters, mobile collapse)**

  **Path**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/_components/ConversationHistoryToolbar/index.tsx`

  **Reference** (mirror byte-for-byte where it applies): `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/ReportsToolbar/index.tsx`

  **Props contract**:
  ```ts
  type ConversationToolbarFilters = {
    search: string
    channel: 'ALL' | 'DEVICE' | 'EMAIL' | 'SMS'
    type: 'ALL' | string  // NotificationType enum, full list below
    status: 'ALL' | string  // NotificationStatus enum, full list below
  }

  interface ConversationHistoryToolbarProps {
    filters: ConversationToolbarFilters
    onChange: (next: ConversationToolbarFilters) => void
    onRefresh: () => void
    onReset: () => void
    isFetching?: boolean
  }
  ```

  **Behavior**:
  - Sticky: `className="sticky top-20 z-20 ..."` (same `top-20` as ReportsToolbar).
  - Search input debounced at 300ms via a local `useState` + `useEffect` timeout (mirror ReportsToolbar lines 127–165). Clear button appears when input has value.
  - Three `Select` controls: Channel, Type, Status. Options below.
  - Active filter count badge + mobile filter toggle (button that shows/hides the filter row on `< sm`). Badge appears only when count > 0. Implementation identical to ReportsToolbar lines 76–84 and 262–281, adapted to this page's filters.
  - Icon-only `Reset filters` button (visible only when at least one filter is active or search is non-empty) and icon-only `Refresh` button (always visible). `Refresh` icon spins when `isFetching` is true.
  - On `< sm` the filter row is hidden by default; the "Filter" button expands it. On `>= sm` the filter row is always visible.
  - Changing any filter → `onChange({ ...filters, <changed field> })`. Never resets other fields.
  - Clearing search → `onChange({ ...filters, search: '' })` AND cancels any pending debounce.

  **Options** (define as `useMemo` inside the component):
  - Channel: `ALL, DEVICE, EMAIL, SMS` — labels from `t('ConversationHistoryPageV2.channel_all' | 'channel_device' | 'channel_email' | 'channel_sms')`.
  - Type: `ALL, GENERATE_REPORT, GENERATE_MONTHLY_REPORT, CLIENT_REQUEST_UPDATE_REPORT, GENERATE_ACCESS_KEY, EMAIL_VERIFICATION, EMAIL_RESET_PASSWORD, EMAIL_FORGOT_PASSWORD, INVITATION_REALTOR, INVITATION_HOMEOWNER, FEEDBACK_STATUS_CHANGED, FEEDBACK_NEW_COMMENT` — same list as v1 lines 234–262.
  - Status: `ALL, PROCESSED, OPENED, CLICKED, BOUNCED, DROPPED, SPAM, DEFERRED, UNSUBSCRIBED, ERROR, SENT` — same list as v1 lines 264–279.

  **Acceptance**:
  - Typing in search debounces 300ms before calling `onChange`.
  - Clicking Reset clears all filters and search and calls `onReset()`.
  - Clicking Refresh calls `onRefresh()`. Icon spins while `isFetching`.
  - On a ≤375px viewport, the filter row is collapsed; the "Filter" button shows the active-filter count badge.
  - Keyboard navigation works (Tab through all controls; Enter/Space activates the icon buttons).
  - No Mantine `Stack`/`Group`/`Text`/`Title`. No inline `style`.
  - File is < 400 lines.

- [ ] **3.2 Build `ConversationHistoryStatStrip` (clickable stats)**

  **Path**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/_components/ConversationHistoryStatStrip/index.tsx`

  **Reference**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_components/ReportsStatStrip/` (read file for visual spec).

  **Props contract**:
  ```ts
  interface ConversationStats {
    total: number
    sent: number
    opened: number
    clicked: number
    bounced: number
    dropped: number
    spam: number
    deferred: number
    unsubscribed: number
    error: number
    processed: number
  }

  interface ConversationHistoryStatStripProps {
    statistics?: ConversationStats
    loading?: boolean
    activeStatus: 'ALL' | string  // current NotificationStatusFilter from URL
    onStatusChange: (next: 'ALL' | string) => void
  }
  ```

  **Stat cards** (render order):
  1. Total — gray, clicking resets status to ALL (same as v1 reset behavior on the Total card)
  2. Sent — blue
  3. Opened — green
  4. Clicked — cyan
  5. Bounced — orange
  6. Dropped — gray
  7. Spam — purple
  8. Deferred — yellow
  9. Unsubscribed — slate
  10. Error — red

  Color classes mirror v1 lines 503–594 exactly (`bg-{color}-50 hover:bg-{color}-100 text-{color}-600`).

  **Behavior**:
  - Each stat card is a `<button>` element (not `<div>` with onClick). Keyboard-accessible by default.
  - `aria-pressed={activeStatus === '<card status>'}` on each card.
  - Clicking a card:
    - If `activeStatus` already equals this card's status → call `onStatusChange('ALL')` (toggle off).
    - Otherwise → call `onStatusChange('<card status>')`.
  - The "Total" card always calls `onStatusChange('ALL')` on click (never toggles).
  - Active card has a visually distinct ring: `ring-2 ring-<color>-400` + slight shadow lift.
  - While `loading`, show `Skeleton` components of the same footprint (no layout shift on load).
  - Horizontal scroll on `< md`; `flex flex-wrap gap-4` on `>= md`.
  - Value formatting: use `formatNumber` from `@utils/format`.
  - Labels from `t('ConversationHistoryPageV2.stat_<name>')`.

  **Acceptance**:
  - Rendering with `statistics={undefined}` + `loading={true}` shows 10 skeleton cards, no crash.
  - Rendering with real statistics shows the correct numbers.
  - Clicking "Sent" when `activeStatus='ALL'` → `onStatusChange('SENT')` fires.
  - Clicking "Sent" when `activeStatus='SENT'` → `onStatusChange('ALL')` fires.
  - Clicking "Total" always fires `onStatusChange('ALL')`.
  - Keyboard: Tab lands on each card; Enter/Space triggers onClick.
  - No Mantine `Stack`/`Group`/`Text`/`Title`. No inline `style`.

- [ ] **3.3 Build `ConversationHistoryCardV2`, `ConversationHistoryRowV2`, and `ConversationHistoryGridV2`**

  **Paths**:
  - `.../_v2/_components/ConversationHistoryCardV2/index.tsx`
  - `.../_v2/_components/ConversationHistoryRowV2/index.tsx`
  - `.../_v2/_components/ConversationHistoryGridV2/index.tsx`

  **Reference**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserCardV2.tsx`, `UserRowV2.tsx`, `UserGridV2.tsx`.

  **Data type**:
  ```ts
  // already exists at:
  // /Users/apple/Projects/agentflow/lf-iq/src/shared/types/conversation-history-types.ts
  import type { ConversationHistory } from '@shared/types/conversation-history-types'
  ```

  **`ConversationHistoryCardV2` props**:
  ```ts
  interface Props {
    conversation: ConversationHistory
    locale: string
    onView: (conversation: ConversationHistory) => void
  }
  ```
  **Render**:
  - Rounded border card (`rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4`).
  - Top row: channel `ThemeIcon` (from v1 `getChannelInfo` helper — reimplement or import) on left, status `Badge` on right.
  - Title (truncate single line, `text-sm font-semibold`).
  - Type `Badge` small.
  - Sender → Recipient (two lines, each `text-xs text-gray-500 truncate`). Use `→` character between.
  - Sent date (`text-xs text-gray-500`) via `formatDate(conversation.created_date?.formatted, true, locale)`.
  - "View" outline Button (full-width on mobile, `size="xs"`) → calls `onView(conversation)`.
  - ENTIRE card is clickable → calls `onView`. Keyboard: `role="button" tabIndex={0}` + Enter/Space handler.

  **`ConversationHistoryRowV2` props**: same as above, renders an `<tr>` with the same columns as v1 (channel, title, type, sender, recipient, status, sent date, last modified date, actions). Null-guarded date rendering. Row is clickable → `onView`.

  **`ConversationHistoryGridV2` props**:
  ```ts
  interface Props {
    conversations: ConversationHistory[]
    viewMode: 'table' | 'card'
    locale: string
    isLoading: boolean
    onView: (conversation: ConversationHistory) => void
  }
  ```
  - `viewMode==='table'`: render `<table>` with `<thead>` (column labels from i18n) + `<tbody>` of `ConversationHistoryRowV2`.
  - `viewMode==='card'`: render `<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">` of `ConversationHistoryCardV2`.
  - `isLoading`: render skeleton rows (table) or skeleton cards (card) — delegate to the component from Task 3.6 OR inline simple `<Skeleton />` placeholders.

  **Helper: `getChannelInfo`** — copy from v1 `page.tsx` lines 60–82 into a local helper file `_v2/_components/ConversationHistoryGridV2/channelInfo.ts` (or colocate at top of Grid file). Key differences: i18n keys go via `ConversationHistoryPageV2.channel_*` not `ConversationHistoryPage.*`.

  **Acceptance**:
  - All three components compile, `npx tsc --noEmit` passes.
  - Switching `viewMode` between `table` and `card` renders the appropriate layout with no runtime errors.
  - All date accesses are null-guarded (`conversation.created_date?.formatted` → fallback `'-'`).
  - `extra_attributes?.senderName` / `?.owner1FullName` / `?.type` all use optional chaining.
  - Clicking a row / card fires `onView(conversation)`.
  - Keyboard: Tab lands on each row/card; Enter/Space triggers onClick.
  - No Mantine `Stack`/`Group`/`Text`/`Title`. No inline `style`.

- [ ] **3.4 Build `ConversationHistoryViewToggleV2`**

  **Path**: `.../_v2/_components/ConversationHistoryViewToggleV2/index.tsx`

  **Reference**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserViewToggleV2.tsx`

  **Props**:
  ```ts
  interface Props {
    value: 'table' | 'card'
    onChange: (next: 'table' | 'card') => void
  }
  ```

  Use Mantine `SegmentedControl` with two options. Icons from `@tabler/icons-react`: `IconTable` and `IconLayoutGrid`. Labels from `t('ConversationHistoryPageV2.view_table' | 'view_card')`.

  **Acceptance**:
  - Component renders a segmented control with two options.
  - Clicking an option fires `onChange`.
  - `aria-label` set from `t('ConversationHistoryPageV2.view_toggle_label')`.
  - No Mantine `Stack`/`Group`/`Text`/`Title`.

- [ ] **3.5 Build `ConversationHistoryDetailDrawerV2`**

  **Path**: `.../_v2/_components/ConversationHistoryDetailDrawerV2/index.tsx`

  **Reference for layout & close handling**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserDetailDrawerV2/index.tsx`

  **Reference for content shape** (port this into the drawer): `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_components/ConversationHistoryDetailModal/` — read the modal body and reproduce the same information in a drawer-friendly vertical layout. Do NOT modify the modal file itself.

  **Props**:
  ```ts
  interface Props {
    opened: boolean
    conversationId: string | null
    onClose: () => void
  }
  ```

  Use Mantine `Drawer` with:
  - `position="right"`
  - `size="md"` (Mantine-default ~480px) on desktop, `size="100%"` below `md`. Implement via a small `useMediaQuery('(min-width: 48em)')` hook → size prop.
  - `title={t('ConversationHistoryPageV2.drawer_title')}`
  - `overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}`
  - `trapFocus` + `closeOnEscape` (Mantine defaults — confirm).

  **Data**: Internally fetch conversation detail when `opened && conversationId` via a `useQuery` (reuse any existing detail endpoint the v1 modal uses — read the modal file to find the API call). If no separate detail endpoint exists and the list row is the full detail, accept `conversation` directly as a prop instead and have the page pass the already-loaded row.

  **Loading**: `<Skeleton>` stubs for the fields while detail loads.
  **Error**: inline `<div>` with retry button (calls `refetch()`).

  **Acceptance**:
  - Opens from right, correct width on desktop and mobile.
  - ESC closes the drawer.
  - Close button fires `onClose()`.
  - Fields are null-guarded.
  - No Mantine `Stack`/`Group`/`Text`/`Title`. No inline `style` (Drawer's own internal styles are fine).

- [ ] **3.6 Build `ConversationHistoryEmptyState` and `ConversationHistorySkeleton`**

  **Paths**:
  - `.../_v2/_components/ConversationHistoryEmptyState/index.tsx`
  - `.../_v2/_components/ConversationHistorySkeleton/index.tsx`

  **`ConversationHistoryEmptyState` props**:
  ```ts
  interface Props {
    onReset: () => void
  }
  ```
  Renders a center-aligned block: icon (`IconMessageOff` from `@tabler/icons-react`) + `t('ConversationHistoryPageV2.empty_title')` (semibold) + `t('ConversationHistoryPageV2.empty_hint')` (gray) + outline Button `t('ConversationHistoryPageV2.action_reset_filters')` → `onReset`.

  **`ConversationHistorySkeleton` props**:
  ```ts
  interface Props {
    viewMode: 'table' | 'card'
    rows?: number  // default 8 for table, 6 for card
  }
  ```
  Renders Mantine `Skeleton` components in either a table-row layout or a card-grid layout. Used by `ConversationHistoryGridV2` when `isLoading` is true (Task 3.3 may import this).

  **Acceptance**:
  - Both components render without errors.
  - Empty state calls `onReset` when the button is clicked.
  - No Mantine `Stack`/`Group`/`Text`/`Title`. No inline `style`.

---

## Epic 4 — V2 Hooks & State

### Dependencies: Epic 2 complete (can run in parallel with Epic 3)

All hooks live under `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/_hooks/`.
All atoms live under `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/_atoms/`.

- [ ] **4.1 Build `useConversationHistoryV2` and `useConversationStatisticsV2` hooks**

  **Paths**:
  - `.../_v2/_hooks/useConversationHistoryV2.ts`
  - `.../_v2/_hooks/useConversationStatisticsV2.ts`

  **Reference**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_hooks/useReportsQuery.ts`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_hooks/useReportStatistics.ts`

  **`useConversationHistoryV2` contract**:
  ```ts
  import type { ConversationHistory } from '@shared/types/conversation-history-types'

  export function useConversationHistoryV2(params: {
    page: number        // 0-indexed
    pageSize: number
    search?: string
    filter?: string     // server-side filter expression
    sort?: string       // default 'createdDate,desc'
  }): {
    data: {
      conversations: ConversationHistory[]
      totalElements: number
      totalPages: number
    } | undefined
    isLoading: boolean
    isFetching: boolean
    isError: boolean
    refetch: () => Promise<unknown>
  }
  ```
  - Uses TanStack `useQuery` with `queryKey: ['conversation-history-v2', 'list', page, pageSize, search ?? '', filter ?? '', sort ?? 'createdDate,desc']`.
  - `queryFn` calls `getConversationHistory({ pageSize, currentPage: page, search, filter, sort })` from `@apis/private-api`.
  - Transforms response:
    ```ts
    return {
      conversations: result.payload ?? [],
      totalElements: result.page?.totalElements ?? 0,
      totalPages: result.page?.totalPages ?? 0,
    }
    ```
  - `placeholderData: keepPreviousData` (from `@tanstack/react-query`).
  - Also export a pure helper: `buildConversationFilter(channel, type, status): string` — copy the logic from v1 `page.tsx` lines 42–58 verbatim.

  **`useConversationStatisticsV2` contract**:
  ```ts
  export function useConversationStatisticsV2(): {
    data: {
      total: number; sent: number; opened: number; clicked: number;
      bounced: number; dropped: number; spam: number; deferred: number;
      unsubscribed: number; error: number; processed: number
    } | undefined
    isLoading: boolean
    refetch: () => Promise<unknown>
  }
  ```
  - Uses TanStack `useQuery` with `queryKey: ['conversation-history-v2', 'statistics']`.
  - `queryFn` calls `getStatisticsSnapshot('CONVERSATION')` and maps `result.payload.metrics[]` into the flat object (same mapping as v1 `page.tsx` lines 165–191).

  **Acceptance**:
  - Both hooks compile. `npx tsc --noEmit` passes.
  - Calling `useConversationHistoryV2` with any params returns the expected shape.
  - `buildConversationFilter('ALL','ALL','ALL')` returns `''`. `buildConversationFilter('EMAIL','ALL','SENT')` returns `'channel eq "EMAIL" and status eq "SENT"'` (verify order matches v1).

- [ ] **4.2 Define Jotai atoms: view mode + drawer state**

  **Paths**:
  - `.../_v2/_atoms/viewModeAtom.ts`
  - `.../_v2/_atoms/drawerAtom.ts`

  **`viewModeAtom.ts`**:
  ```ts
  import { atomWithStorage } from 'jotai/utils'
  export type ConversationViewMode = 'table' | 'card'
  // 'auto' initial value → page resolves to table/card based on viewport on mount
  export const conversationHistoryViewModeAtom =
    atomWithStorage<ConversationViewMode | 'auto'>('conversation-history-v2:view-mode', 'auto')
  ```

  **`drawerAtom.ts`**:
  ```ts
  import { atom } from 'jotai'
  export interface DrawerState {
    open: boolean
    conversationId: string | null
  }
  export const conversationHistoryDrawerAtom = atom<DrawerState>({
    open: false,
    conversationId: null,
  })
  ```

  **Acceptance**:
  - Both files compile.
  - `atomWithStorage` uses a unique storage key that won't collide with other atoms (prefix with `conversation-history-v2:`).

- [ ] **4.3 Build `useConversationFiltersUrl` hook (URL search params state)**

  **Path**: `.../_v2/_hooks/useConversationFiltersUrl.ts`

  **Goal**: Reflect filters + pagination in the URL query string. Shareable, back-button friendly.

  **Contract**:
  ```ts
  export interface ConversationFiltersUrlState {
    search: string
    channel: 'ALL' | 'DEVICE' | 'EMAIL' | 'SMS'
    type: 'ALL' | string
    status: 'ALL' | string
    page: number     // 0-indexed
    pageSize: number // default 20
  }

  export function useConversationFiltersUrl(): {
    filters: ConversationFiltersUrlState
    setFilters: (patch: Partial<ConversationFiltersUrlState>) => void
    resetFilters: () => void
    filterExpression: string  // from buildConversationFilter
  }
  ```

  **Implementation rules**:
  - Use `useSearchParams()`, `useRouter()`, `usePathname()` from `next/navigation`.
  - `filters` derived from `searchParams.get(...)` with defaults: `search=''`, `channel='ALL'`, `type='ALL'`, `status='ALL'`, `page=0`, `pageSize=20`.
  - `setFilters(patch)` builds a new `URLSearchParams` from current + patch, then calls `router.replace(pathname + '?' + params.toString(), { scroll: false })`. Use `replace` (not `push`) to avoid flooding history on search keystrokes.
  - When `patch` changes any of `search`, `channel`, `type`, `status` and `page` is NOT in the patch → also set `page` back to `0`.
  - When a field equals its default, REMOVE it from the URL (cleaner URLs).
  - `resetFilters()` calls `router.replace(pathname, { scroll: false })`.
  - `filterExpression` is `useMemo(() => buildConversationFilter(channel, type, status), [channel, type, status])`.

  **Acceptance**:
  - Typing in the toolbar search field updates the URL to `?search=foo`.
  - Clicking a stat card sets `?status=SENT` in the URL.
  - Reloading the page restores all filters from URL.
  - Clicking "Reset filters" clears all params and resets `page` to `0`.
  - Changing filters while on page 3 resets to page 0 (URL no longer contains `page`).

---

## Epic 5 — V2 Page Assembly

### Dependencies: Epics 3 & 4 complete

- [ ] **5.1 Build `_v2/ConversationHistoryPage/index.tsx`**

  **Path**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/conversation-history/_v2/ConversationHistoryPage/index.tsx`

  **Reference for structure**: `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/ReportsPage/index.tsx`

  **Goal**: Compose all v2 components with the hooks and atoms into the full page.

  **Render order** (top to bottom):
  1. `AdminPageHeader` — icon `IconMessage`, `title` from `t('ConversationHistoryPageV2.header_title')`, subtitle from `t('ConversationHistoryPageV2.header_subtitle')`.
  2. `ConversationHistoryStatStrip` — fed by `useConversationStatisticsV2`. `activeStatus` = `filters.status`. `onStatusChange` → `setFilters({ status: next })`.
  3. `ConversationHistoryToolbar` — fed by `filters` from `useConversationFiltersUrl`. `onChange` → `setFilters(patch)`. `onReset` → `resetFilters()` AND clear drawer. `onRefresh` → `queryClient.invalidateQueries({ queryKey: ['conversation-history-v2'] })`. `isFetching` from list query.
  4. `ConversationHistoryViewToggleV2` — right-aligned, value from `viewModeAtom` (resolved to `'table'` or `'card'` by the page's responsive resolution logic), onChange writes the atom.
  5. **Content area**:
     - If list query `isError` → inline error block: `<div>` with message + Retry button → calls `refetch()`.
     - Else if `isLoading` (initial, no data) → `ConversationHistorySkeleton viewMode={effectiveViewMode}`.
     - Else if `data.conversations.length === 0` → `ConversationHistoryEmptyState onReset={resetFilters}`.
     - Else → `ConversationHistoryGridV2` with the list + `onView` → opens drawer via `setDrawerAtom({ open: true, conversationId: conv.id })`.
  6. Pagination — Mantine `Pagination` + pageSize `Select`. Current page from `filters.page`, total pages from `data.totalPages`. Changing page → `setFilters({ page: nextPage })`. Changing page size → `setFilters({ page: 0, pageSize: next })`.
  7. `ConversationHistoryDetailDrawerV2` — `opened={drawer.open}` `conversationId={drawer.conversationId}` `onClose={() => setDrawerAtom({ open: false, conversationId: null })}`.

  **Responsive view resolution**:
  ```ts
  const [storedView] = useAtom(conversationHistoryViewModeAtom)
  const isDesktop = useMediaQuery('(min-width: 48em)')
  const effectiveView: 'table' | 'card' =
    storedView === 'auto' ? (isDesktop ? 'table' : 'card') : storedView
  ```
  When the user picks a view explicitly, store it (no longer 'auto').

  **Error handling**: On list query error, also fire `notifyError(t('ConversationHistoryPageV2.error_load_failed'))` from `useToast`. Debounce so it doesn't fire on every refetch failure — only on the transition from success → error (use `useEffect` guarded by a ref).

  **Acceptance**:
  - `npx tsc --noEmit` passes.
  - Running with `uiVersion='v2'` renders the full v2 page.
  - All 14 success criteria from the proposal are met.
  - File is < 300 lines. If it grows larger, extract handlers into the `_hooks/` folder.
  - All copy comes from `t('ConversationHistoryPageV2.*')` — grep for literal English strings in the file and replace each with an i18n key.

---

## Epic 6 — i18n

### Dependencies: Epic 2 complete (can run in parallel with Epics 3–5 and finalize before Epic 7)

- [ ] **6.1 Add `ConversationHistoryPageV2` namespace to all 7 locale files**

  **Files to modify** (add the new namespace, do NOT touch the existing `ConversationHistoryPage` namespace):
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/en.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/vi.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/zh.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/ko.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/he.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/es.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/ar.json`

  **Required keys** (under `ConversationHistoryPageV2`):

  ```json
  {
    "ConversationHistoryPageV2": {
      "header_title": "Conversation History",
      "header_subtitle": "Review all notifications sent across email, SMS, and in-app channels.",

      "stat_total": "Total",
      "stat_sent": "Sent",
      "stat_opened": "Opened",
      "stat_clicked": "Clicked",
      "stat_bounced": "Bounced",
      "stat_dropped": "Dropped",
      "stat_spam": "Spam",
      "stat_deferred": "Deferred",
      "stat_unsubscribed": "Unsubscribed",
      "stat_error": "Error",

      "filter_search_placeholder": "Search by title, sender, or recipient",
      "filter_search_label": "Search",
      "filter_channel_label": "Channel",
      "filter_type_label": "Type",
      "filter_status_label": "Status",
      "filter_reset": "Reset filters",
      "filter_refresh": "Refresh",
      "filter_mobile_toggle_show": "Filter",
      "filter_mobile_toggle_hide": "Hide filters",

      "channel_all": "All",
      "channel_device": "Device",
      "channel_email": "Email",
      "channel_sms": "SMS",

      "type_all": "All types",
      "type_generate_report": "Generate report",
      "type_generate_monthly_report": "Generate monthly report",
      "type_client_request_update_report": "Client request update report",
      "type_generate_access_key": "Generate access key",
      "type_email_verification": "Email verification",
      "type_email_reset_password": "Email reset password",
      "type_email_forgot_password": "Email forgot password",
      "type_invitation_realtor": "Invitation — realtor",
      "type_invitation_homeowner": "Invitation — homeowner",
      "type_feedback_status_changed": "Feedback status changed",
      "type_feedback_new_comment": "Feedback new comment",

      "status_all": "All statuses",
      "status_processed": "Processed",
      "status_opened": "Opened",
      "status_clicked": "Clicked",
      "status_bounced": "Bounced",
      "status_dropped": "Dropped",
      "status_spam": "Spam",
      "status_deferred": "Deferred",
      "status_unsubscribed": "Unsubscribed",
      "status_error": "Error",
      "status_sent": "Sent",

      "view_table": "Table",
      "view_card": "Card",
      "view_toggle_label": "Toggle view",

      "column_channel": "Channel",
      "column_title": "Title",
      "column_type": "Type",
      "column_sender": "Sender",
      "column_recipient": "Recipient",
      "column_status": "Status",
      "column_sent_date": "Sent date",
      "column_last_modified_date": "Last modified",
      "column_actions": "Actions",
      "table_caption": "List of sent conversations",

      "card_sender_to_recipient": "{sender} → {recipient}",

      "empty_title": "No conversations match your filters",
      "empty_hint": "Try adjusting your filters or clear them to see all conversations.",

      "error_load_failed": "Failed to load conversations. Please try again.",
      "error_retry": "Retry",

      "drawer_title": "Conversation detail",
      "drawer_close": "Close",
      "drawer_field_channel": "Channel",
      "drawer_field_type": "Type",
      "drawer_field_status": "Status",
      "drawer_field_sender": "Sender",
      "drawer_field_recipient": "Recipient",
      "drawer_field_sent_date": "Sent date",
      "drawer_field_last_modified_date": "Last modified",
      "drawer_field_subject": "Subject",
      "drawer_field_body": "Body",
      "drawer_section_events": "Events",

      "action_view": "View",
      "action_reset_filters": "Reset filters",
      "action_refresh": "Refresh",

      "pagination_page_size_label": "Rows per page"
    }
  }
  ```

  For non-English locales: provide translations where possible. If translation is pending, copy the English value verbatim — the keys MUST all exist to avoid `next-intl` missing-key warnings at runtime.

  Translation hints per locale (rough — translator can refine):
  - `vi.json`: Vietnamese translations where feasible.
  - `zh.json`: Chinese (Simplified).
  - `ko.json`: Korean.
  - `he.json`: Hebrew (RTL considerations).
  - `es.json`: Spanish.
  - `ar.json`: Arabic (RTL considerations).

  **Acceptance**:
  - Each of the 7 locale files contains the full `ConversationHistoryPageV2` namespace with every key listed above.
  - `grep -L "ConversationHistoryPageV2" src/messages/*.json` (run from `/Users/apple/Projects/agentflow/lf-iq/`) returns empty (all files include the namespace).
  - Each JSON file still parses (run `node -e "require('./src/messages/<locale>.json')"` for each).
  - No existing key under `ConversationHistoryPage` is modified or removed.

---

## Epic 7 — Quality Gates

### Dependencies: Epics 5 & 6 complete

- [ ] **7.1 Verify tsc / lint / test all pass**

  **Commands to run** (from `/Users/apple/Projects/agentflow/lf-iq/`):
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run stylelint
  npm test
  ```

  **Acceptance**:
  - Every command exits 0.
  - No new warnings introduced by files changed in this PR.
  - If any existing lint/test warning surfaces that is NOT from this PR's files, document it in the Beads task close-reason but do NOT fix in this change.

- [ ] **7.2 Manual smoke test**

  **Test matrix** (record pass/fail for each):

  1. **Toggle v1 → v2 → v1**: In the running app, flip `uiVersionAtom` between `v1` and `v2`. Both surfaces render. No console errors.
  2. **Filter URL round-trip**: Navigate to `/admin/conversation-history`. Apply search "test", channel=EMAIL, status=SENT. URL reflects all. Reload browser. State is preserved. Copy URL, open in a new tab — same filtered view.
  3. **Stat card toggle**: Click "Sent" stat card → URL gets `?status=SENT`, card highlighted. Click "Sent" again → URL param removed, card no longer highlighted. Click "Total" → all filters cleared.
  4. **Drawer open/close**: Click any row / card → drawer slides from right with correct content. Press ESC → drawer closes. Click close button → drawer closes. List scroll position is preserved.
  5. **Sticky toolbar**: Scroll the conversation list → toolbar sticks under the admin header. Stat strip does NOT stick. No layout glitches.
  6. **Mobile layout** (resize browser to 375px): Stat strip horizontally scrolls. Toolbar collapses into "Filter" button with count badge. Tapping reveals filter row. View toggle defaults to Card.
  7. **Desktop layout** (≥ 768px): View toggle defaults to Table. Switching to Card and back works; choice persists across reloads.
  8. **Refresh**: Click refresh icon → both list and stats refetch; icon spins during request.
  9. **Empty state**: Apply a search that returns no results → "No conversations match your filters" + Reset button shown. Clicking Reset clears all filters.
  10. **Error state**: (Simulate by killing the backend or using devtools to fail the request) → toast notification + inline Retry. Clicking Retry refetches.
  11. **Pagination**: Change page size, navigate pages. URL updates. State persists on reload.
  12. **Keyboard**: Tab through toolbar controls, stat cards, row/card items. All reachable. Enter/Space triggers expected action.

  **Acceptance**:
  - All 12 scenarios pass.
  - Any failures are filed as follow-up fix tasks under a new section in this tasks.md.

---

## Dependency Graph (DEV Lead must encode in Beads)

```
Epic 1 (1.1)
  └──► blocks ─► Epic 2 (2.1 → 2.2)
                    ├──► Epic 3 (3.1, 3.2, 3.3, 3.4, 3.5, 3.6 — parallel)
                    └──► Epic 4 (4.1, 4.2, 4.3 — parallel)
                              └──► Epic 5 (5.1) ─── needs Epic 3 + Epic 4
                    └──► Epic 6 (6.1) — can run in parallel with 3/4/5

Epic 5 + Epic 6
  └──► Epic 7 (7.1 → 7.2)
```
