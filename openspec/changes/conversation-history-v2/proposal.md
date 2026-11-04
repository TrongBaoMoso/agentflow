# Proposal — Conversation History V2 Redesign (lf-iq)

**Change name**: `conversation-history-v2`
**Target repo**: `lf-iq` (`/Users/apple/Projects/agentflow/lf-iq/`)
**Base branch**: `production`
**Feature branch**: `feature/conversation-history-v2`

## Problem

The admin Conversation History page (`/[locale]/(admin)/admin/conversation-history/page.tsx`) is a legacy v1 surface:

- Monolithic single-file page (~685 lines) mixing data fetch, filter state, stat cards, table columns, and modal wiring.
- Desktop-only table via `GeneralTable` / `mantine-react-table`; no card/mobile-friendly alternative.
- Stat strip is a row of `Paper` cards rebuilt inline with hardcoded color classes.
- Filter bar is a wide non-sticky row — on scroll the user loses filter context.
- Detail view is a centered `ConversationHistoryDetailModal`, which blocks the list and feels heavy for what is largely read-only content.
- Uses Mantine `Stack`/`Center`-style wrappers and inline `style` props in places that conflict with the project's current Tailwind-first + no-Mantine-layout-primitives convention.
- Filter state lives in local `useState`, not shareable/back-button friendly.
- No visual parity with newer admin v2 surfaces (`admin/reports/_v2`, `admin/users-v2`), which already use a sticky toolbar + stat strip + card/row hybrid + side drawer detail pattern.

## Proposed Solution

Introduce a v2 of the page that mirrors the pattern already established in `admin/reports/_v2` and `admin/users-v2`:

1. **Folder restructure**: move current page content into `_v1/ConversationHistoryPage/`. Wire `page.tsx` through the `withUIVersion` HOC so users on v2 see the new surface and users on v1 see the legacy surface unchanged.
2. **V2 components** (all under `_v2/_components/`), each in its own folder:
   - `ConversationHistoryToolbar` — sticky (top-20), search + channel/type/status selects, mobile collapse with active-count badge, reset + refresh icon buttons. Mirrors `reports/_v2/_components/ReportsToolbar`.
   - `ConversationHistoryStatStrip` — clickable stat cards (Total / Sent / Opened / Clicked / Bounced / Dropped / Spam / Deferred / Unsubscribed / Error). Click toggles the status filter; click again clears.
   - `ConversationHistoryRowV2` — desktop table row.
   - `ConversationHistoryCardV2` — mobile-friendly card (channel icon, title, sender → recipient, status badge, sent date, view button).
   - `ConversationHistoryGridV2` — composes either a `<table>` of `Row`s or a stack of `Card`s based on the active view mode.
   - `ConversationHistoryViewToggleV2` — segmented control Table | Card. Default is responsive (Table on desktop ≥ md, Card below).
   - `ConversationHistoryDetailDrawerV2` — right-side Mantine `Drawer` (~480px desktop, full-width mobile). Replaces the v1 modal for v2 users. V1 keeps its modal untouched.
3. **V2 hooks & state** (under `_v2/_hooks/`):
   - `useConversationHistoryV2` — TanStack React Query wrapper over `getConversationHistory` with built-in pagination, filter, and sort; mirrors `useReportsQuery`.
   - `useConversationStatisticsV2` — TanStack React Query wrapper over `getStatisticsSnapshot('CONVERSATION')`; mirrors `useReportStatistics`.
   - Jotai atoms for ephemeral UI state: view toggle (`conversationHistoryViewModeAtom`) and drawer open/selected id (`conversationHistoryDrawerAtom`).
   - URL search params (via `useSearchParams` + `useRouter`) for shareable filter + page state: `channel`, `type`, `status`, `search`, `page`, `pageSize`.
4. **V2 page assembly** (`_v2/ConversationHistoryPage/index.tsx`) — composes header + stat strip + toolbar + view toggle + grid + drawer + pagination, with loading skeletons, empty state ("No conversations match your filters" + reset button), and inline retry error state.
5. **i18n**: add a new `ConversationHistoryPageV2` namespace to all 7 locale files (`en`, `vi`, `zh`, `ko`, `he`, `es`, `ar`). Do NOT modify existing `ConversationHistoryPage` namespace so v1 keeps working.
6. **HTML mockup first**: author a static HTML mockup at `lf-iq/mockups/conversation-history-v2/index.html` covering all primary states. User review & approval of the mockup blocks all TSX implementation.

## Scope

### In scope
- New `_v2/` folder (components, hooks, page) in `admin/conversation-history/`.
- Move v1 page body into `_v1/ConversationHistoryPage/` + wire `page.tsx` through `withUIVersion`.
- New `_v2/_atoms/` for Jotai atoms used only by this v2 surface.
- New detail drawer replacing the modal for v2 users. The v1 `ConversationHistoryDetailModal` file is NOT deleted or modified.
- New `ConversationHistoryPageV2` i18n namespace added to all 7 locale files in `src/messages/`.
- HTML mockup preview file in `lf-iq/mockups/conversation-history-v2/`.
- Quality gates: `npx tsc --noEmit`, ESLint, stylelint, Jest must all pass.

### Out of scope
- Backend / API changes. Same endpoints (`getConversationHistory`, `getStatisticsSnapshot`) are consumed.
- Bulk actions on conversations (not a v1 feature, not added in v2).
- Export / download of conversations.
- Real-time updates / websockets.
- Any behavior change of the legacy v1 page — v1 must continue to work unchanged for users on `uiVersion = 'v1'`.
- Editing conversation content (list is read-only in both v1 and v2).

## Success Criteria

1. Toggling `uiVersion` to `v2` renders the new redesigned surface; toggling to `v1` renders the legacy page unchanged.
2. On a viewport ≥ md, the Table view is selected by default; below md, the Card view is selected by default. User override via `ConversationHistoryViewToggleV2` persists for the session (Jotai atom).
3. Filters (search, channel, type, status) and pagination are reflected in the URL. Reloading the page restores state. Sharing the URL reproduces the same filtered view.
4. Clicking a stat card toggles its status filter. Clicking the same card again clears it. The currently-active stat card is visually highlighted.
5. Clicking a row or card opens the detail drawer from the right. Closing the drawer does not lose list context or scroll position.
6. The toolbar stays sticky under the admin header as the list scrolls.
7. On viewports below md, the filter row collapses into a "Filter" button with an active-filter count badge.
8. Empty state shows "No conversations match your filters" with a "Reset filters" action.
9. Loading renders skeleton rows (table view) / skeleton cards (card view). Error renders a toast + inline "Retry" that re-invalidates the TanStack Query cache.
10. `Refresh` invalidates both the list query and the statistics query.
11. All copy in `_v2/` comes from `t('ConversationHistoryPageV2.*')`. All 7 locale files contain the new namespace.
12. No Mantine layout primitives (`Stack`, `Group`, `Text`, `Title`) are used in `_v2/`. No inline `style={{}}` props — spacing/sizing via Tailwind classes.
13. `npx tsc --noEmit`, ESLint, stylelint, and Jest all pass with no new warnings introduced by this change.
14. User-approved HTML mockup at `lf-iq/mockups/conversation-history-v2/index.html` exists before any TSX implementation lands.

## Rationale

- Established v2 pattern already exists (`reports/_v2`, `users-v2`) — reuse reduces cognitive load and review effort.
- `withUIVersion` HOC already supports parallel v1/v2 via Jotai `uiVersionAtom` — no routing or flag infra work needed.
- URL-driven filter state matches recent work in admin surfaces and is a repeated ask for shareability.
- Drawer-over-modal is a consistent mobile pattern in lf-iq v2 surfaces.
- HTML mockup first is a project rule for UI redesigns and catches visual direction issues before any TSX is written.
