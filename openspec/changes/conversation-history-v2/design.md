# Design — Conversation History V2 (lf-iq)

**Change**: `conversation-history-v2`
**Repo**: `lf-iq`
**Base branch**: `production`

## 1. Architecture Overview

The v2 surface follows the same architecture already in use in `admin/reports/_v2` and `admin/users-v2`:

```
admin/conversation-history/
├── page.tsx                       ← thin wrapper, uses withUIVersion HOC
├── _components/                   ← LEGACY v1-only components (unchanged)
│   └── ConversationHistoryDetailModal/
├── _v1/
│   └── ConversationHistoryPage/
│       └── index.tsx              ← current monolithic page moved here verbatim
└── _v2/
    ├── ConversationHistoryPage/
    │   └── index.tsx              ← composes the v2 surface
    ├── _atoms/
    │   ├── viewModeAtom.ts
    │   └── drawerAtom.ts
    ├── _hooks/
    │   ├── useConversationHistoryV2.ts
    │   ├── useConversationStatisticsV2.ts
    │   └── useConversationFiltersUrl.ts
    └── _components/
        ├── ConversationHistoryToolbar/index.tsx
        ├── ConversationHistoryStatStrip/index.tsx
        ├── ConversationHistoryViewToggleV2/index.tsx
        ├── ConversationHistoryGridV2/index.tsx
        ├── ConversationHistoryRowV2/index.tsx
        ├── ConversationHistoryCardV2/index.tsx
        ├── ConversationHistoryEmptyState/index.tsx
        ├── ConversationHistorySkeleton/index.tsx
        └── ConversationHistoryDetailDrawerV2/index.tsx
```

### Reference implementations (follow these patterns byte-for-byte where sensible)

| v2 concern | Reference in existing code |
|---|---|
| HOC wiring on `page.tsx` | `admin/reports/page.tsx` |
| Sticky toolbar + mobile collapse + active filter badge | `admin/reports/_v2/_components/ReportsToolbar/index.tsx` |
| Stat strip (clickable cards) | `admin/reports/_v2/_components/ReportsStatStrip/index.tsx` |
| Table/card hybrid with view toggle | `admin/users-v2/_components/UserGridV2.tsx` + `UserRowV2.tsx` + `UserCardV2.tsx` + `UserViewToggleV2.tsx` |
| Side drawer detail | `admin/users-v2/_components/UserDetailDrawerV2/index.tsx` |
| TanStack Query data hooks | `admin/reports/_v2/_hooks/useReportsQuery.ts`, `useReportStatistics.ts` |

## 2. Key Architecture Decisions

### 2.1 Versioning via `withUIVersion` HOC (already in project)

`page.tsx` becomes:

```tsx
'use client'
import { withUIVersion } from '@shared/components/withUIVersion'

const ConversationHistoryPage = withUIVersion(
  () => import('./_v1/ConversationHistoryPage'),
  () => import('./_v2/ConversationHistoryPage')
)

export default function AdminConversationHistoryPage() {
  return <ConversationHistoryPage />
}
```

Both bundles are lazy-loaded via `next/dynamic` — only the active version ships to the browser. The global `uiVersionAtom` (`v1` | `v2`) drives which renders.

### 2.2 State split — URL vs. Jotai vs. TanStack Query

| State | Where it lives | Why |
|---|---|---|
| Filters: `channel`, `type`, `status`, `search`, `page`, `pageSize` | URL search params | Shareable, back-button friendly, matches v2 convention |
| View mode (`table` \| `card`) | Jotai atom (`viewModeAtom`) + `localStorage` via `atomWithStorage` for session persistence | Non-shareable UI preference |
| Drawer open + selectedId | Jotai atom (`drawerAtom`) | Ephemeral, shouldn't pollute URL |
| Data (conversations + statistics) | TanStack React Query | Already in use repo-wide; built-in refetch/invalidate |

Why not persist view mode in URL? It's a personal preference, not a filter; users should not share a "card view" URL that fights desktop users' preferences.

### 2.3 Responsive default view

The initial value of `viewModeAtom` is computed lazily:

- If the stored atom value is `'auto'` or unset → on mount, read `window.matchMedia('(min-width: 768px)').matches`. Resolve to `'table'` (true) or `'card'` (false).
- Once the user explicitly toggles, persist their choice. Don't "fight" them on subsequent viewport changes.

### 2.4 URL filter hook

`useConversationFiltersUrl.ts` exposes:

```ts
type FiltersState = {
  channel: 'ALL' | 'DEVICE' | 'EMAIL' | 'SMS'
  type: 'ALL' | '<NotificationType enum>'
  status: 'ALL' | '<NotificationStatus enum>'
  search: string
  page: number            // 0-indexed, matches v1 pageInfo.currentPage
  pageSize: number        // default 20
}

function useConversationFiltersUrl(): {
  filters: FiltersState
  setFilters: (patch: Partial<FiltersState>) => void
  resetFilters: () => void
  filterExpression: string    // server-side filter string (reused from v1 buildFilter)
}
```

Implementation:
- Uses `useSearchParams()` + `useRouter()` + `usePathname()` from `next/navigation`.
- `setFilters({ search: '...' })` does `router.replace(pathname + '?' + params.toString(), { scroll: false })` — `replace` rather than `push` to avoid spamming browser history on every keystroke (search is debounced).
- Changes to `search`, `channel`, `type`, or `status` reset `page` to `0`.

### 2.5 Data hook contract

```ts
// useConversationHistoryV2.ts
function useConversationHistoryV2(params: {
  page: number
  pageSize: number
  search?: string
  filter?: string   // server-side filter expression
  sort?: string     // default 'createdDate,desc'
}): {
  data: { conversations: ConversationHistory[]; totalElements: number; totalPages: number } | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  refetch: () => Promise<unknown>
}
```

- Uses TanStack `useQuery` with `queryKey: ['conversation-history-v2', page, pageSize, search, filter, sort]`.
- Calls `getConversationHistory` from `@apis/private-api` (unchanged).
- `placeholderData: keepPreviousData` for smooth pagination.
- Transforms the raw response into the shape above.

```ts
// useConversationStatisticsV2.ts
function useConversationStatisticsV2(): {
  data: { total: number; sent: number; opened: number; ... } | undefined
  isLoading: boolean
  refetch: () => Promise<unknown>
}
```

- Calls `getStatisticsSnapshot('CONVERSATION')` (unchanged).
- Transforms `metrics[]` array (same mapping logic as v1).
- `queryKey: ['conversation-history-v2', 'statistics']`.

### 2.6 Filter-building function

Reuse the v1 concept as a small pure helper in `_v2/_hooks/useConversationHistoryV2.ts` (or colocate as `buildConversationFilter`):

```ts
function buildConversationFilter(
  channel: ChannelFilter,
  type: NotificationTypeFilter,
  status: NotificationStatusFilter
): string { /* same filter expression as v1 page lines 42-58 */ }
```

### 2.7 Drawer vs. Modal

- V1 keeps its existing modal (`_components/ConversationHistoryDetailModal/`) — do NOT modify.
- V2 uses a new `ConversationHistoryDetailDrawerV2` (Mantine `Drawer`), opened from a Jotai atom `drawerAtom = { open: boolean, conversationId: string | null }`.
- Drawer width: `size="md"` (Mantine ~480px) on desktop, `size="100%"` below md via Mantine's responsive `size` or a Tailwind-conditional prop.
- Position: `position="right"`.
- Content is structurally the same fields as the v1 modal — the Detail Drawer task includes porting the existing modal body into a drawer-friendly layout.

### 2.8 i18n approach

- New namespace: `ConversationHistoryPageV2`.
- Keys are `snake_case` inside `CamelCase` namespace (project convention).
- Categories:
  - `header_*` — page title, subtitle
  - `stat_*` — stat card labels
  - `filter_*` — filter placeholders/labels/actions
  - `view_*` — view toggle labels
  - `row_*` / `card_*` — labels surfaced in list rows and cards
  - `empty_*` — empty state message + reset action
  - `error_*` — error state message + retry action
  - `drawer_*` — drawer title, field labels, close action
  - `action_*` — generic actions (view, refresh, reset)
  - `channel_*` / `type_*` / `status_*` labels local to v2 (OK to reuse existing `Status.*` / `ConversationHistoryPage.*` keys where identical to avoid duplication — list them in tasks.md per key)
- All 7 locale files (`en`, `vi`, `zh`, `ko`, `he`, `es`, `ar`) must receive the same key set. Non-en locales MAY initially fall back to English text while translations are pending, but all keys must be present to avoid `next-intl` runtime errors.

### 2.9 Styling rules

- No `Stack`, `Group`, `Text`, `Title` from `@mantine/core` anywhere in `_v2/`. Use `div` + Tailwind, `span` + Tailwind, `h1/h2/h3` + Tailwind.
- Interactive Mantine components are OK where they add real value: `Button`, `Select`, `TextInput`, `Drawer`, `Badge`, `Paper`, `ThemeIcon`, `Tooltip`, `SegmentedControl`, `Skeleton`.
- No inline `style={{}}` — spacing/color/layout all via Tailwind classes. Exceptions: Mantine component `styles` prop only when a Tailwind class is not expressive enough (e.g. overriding an internal Mantine slot).

### 2.10 Accessibility

- Toolbar controls have labels (`aria-label` on icon-only buttons, `label` prop on `Select` via visually-hidden span where the label is elided for space).
- View toggle uses `role="radiogroup"` (Mantine `SegmentedControl` provides this).
- Stat cards are `button` elements (not `div` with `onClick`) so they're keyboard-accessible; ENTER and SPACE toggle. `aria-pressed` reflects active state.
- Drawer traps focus (Mantine default); ESC closes.
- Skeletons use `aria-busy="true"` + `aria-live="polite"` on the list container.
- Table has `<caption>` (visually hidden) sourced from `ConversationHistoryPageV2.table_caption`.

## 3. Data Flow

```
URL ?channel=EMAIL&status=SENT&page=2
  ↓
useConversationFiltersUrl → filters
  ↓                            ↓
  filterExpression = buildConversationFilter(channel, type, status)
  ↓
useConversationHistoryV2(page, pageSize, search, filter, sort)
  ↓
TanStack Query → getConversationHistory(...) → { conversations, totalElements }
  ↓
ConversationHistoryPage
  ├─ StatStrip (useConversationStatisticsV2)
  ├─ Toolbar (filters controlled, onChange → setFilters)
  ├─ ViewToggle (viewModeAtom)
  ├─ Grid
  │   ├─ view=table  → map rows → <ConversationHistoryRowV2 onClick={openDrawer(id)} />
  │   └─ view=card   → map items → <ConversationHistoryCardV2 onClick={openDrawer(id)} />
  └─ DetailDrawer (drawerAtom, fetches detail on open)
```

Pagination: a thin `<Pagination>` component (Mantine `Pagination` + `Select` for page size) at the bottom of `Grid`. Mirror `admin/users-v2/_components/UserPaginationV2.tsx`.

## 4. Error, Loading, Empty

| State | Render |
|---|---|
| Loading (initial) | Skeleton — table view: 8 skeleton rows; card view: 6 skeleton cards |
| Loading (refetch while showing stale) | `keepPreviousData` shows stale list; toolbar refresh icon spins |
| Empty | Center-aligned: icon + `ConversationHistoryPageV2.empty_title` + `empty_hint` + "Reset filters" button |
| Error | `notifyError` toast + inline retry: "Failed to load. [Retry]" button that calls `refetch()` |

## 5. Rollout

1. HTML mockup approved by user.
2. Merge folder restructure + HOC wiring (v1 keeps working).
3. Merge v2 components, hooks, page — but `uiVersionAtom` default stays `v1` in production.
4. QA/manual smoke on staging with `uiVersion` toggled to `v2`.
5. Flip default to `v2` in a follow-up PR.
6. After a stabilization window, a separate change can remove `_v1/` and the HOC wrapper. NOT part of this change.

## 6. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Moving v1 file breaks imports | Grep repo for `admin/conversation-history` imports before the move. Only `page.tsx` is externally referenced (via the file-system route); internal imports use relative paths. |
| URL param state loops with debounced search | `useRouter().replace` + `scroll: false` + a ref-tracked "last applied" value to prevent re-triggering on its own change. Pattern mirrored from `ReportsToolbar` keyword debounce. |
| Large enum list (notification types) floods the filter `Select` | Same list as v1 — 12 values. Keep as-is; accept the height. |
| i18n drift — missing keys in non-en locales | Task 6.1 includes a verification step: `grep -L "ConversationHistoryPageV2" src/messages/*.json` must return empty. |
| Drawer width on short viewports feels cramped | `size="100%"` below md via a responsive size helper; confirmed in mockup. |

## 7. Conventions this change follows

- Feature-folder organization (each component in its own folder with `index.tsx`).
- Files under 800 lines, components under 400 lines. `ConversationHistoryPage/index.tsx` should stay under ~250 lines — if it grows, extract handlers into the hooks folder.
- Named exports for components, default export for page entrypoints (matches reports/_v2 convention).
- No magic numbers — `SEARCH_DEBOUNCE_MS = 300`, `DEFAULT_PAGE_SIZE = 20`, `DRAWER_WIDTH_DESKTOP = 'md'` as module constants.
- Null-guarded — every `conversation.extra_attributes?.foo` access uses optional chaining. Every date render checks `created_date?.formatted` before calling `formatDate`.
