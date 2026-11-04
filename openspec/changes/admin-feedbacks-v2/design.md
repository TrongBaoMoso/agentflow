# Design: Admin Feedbacks V2 Redesign

Target repo: `lf-iq`
Target route: `/admin/feedbacks`
Feature branch: `feature/admin-feedbacks-v2` (from `production`)
Primary pattern references: `admin/reports/_v2/`, `homeowners-v2/`, `dashboard-v2/`

## Architecture Overview

The redesign does **not** change behavior, endpoints, or data shape. It re-expresses today's monolithic 710-line page into the v2 architecture already established in this codebase:

```
/admin/feedbacks
   page.tsx (withUIVersion v1|v2)
   ├── _v1/
   │    └── FeedbacksPage/index.tsx        ← today's 710-line page, moved verbatim
   └── _v2/
        ├── FeedbacksPage/
        │    └── index.tsx                  ← orchestrator (list screen)
        ├── FeedbackDetailDrawer/
        │    └── index.tsx                  ← right-side drawer, 720–800px
        ├── _components/
        │    ├── FeedbacksStatStrip/        ← 8 clickable stat cards
        │    ├── FeedbacksToolbar/          ← search + 3 selects + clear/refresh
        │    ├── FeedbacksTable/            ← MRT columns + inline row status menu
        │    ├── FeedbackStatusMenu/        ← shared menu (used in row + drawer)
        │    ├── FeedbackDetailHeader/
        │    ├── FeedbackSummaryCard/
        │    ├── FeedbackMetadataCard/      ← page_url + login-as, browser, device
        │    └── FeedbackCommentThread/
        └── _hooks/
             ├── useFeedbacksQuery.ts       ← TanStack Query; keyed on filter+page+search
             ├── useFeedbackStatistics.ts   ← TanStack Query; `getStatisticsSnapshot('FEEDBACK')`
             ├── useFeedbackDetail.ts       ← per-id detail + comments
             └── useFeedbackStatusUpdate.ts ← mutation → invalidates list + stats + detail
```

`page.tsx` wraps both via `withUIVersion()` identical to `admin/users/page.tsx` and `admin/reports/page.tsx`:

```ts
export default withUIVersion({
  importV1: () => import('./_v1/FeedbacksPage'),
  importV2: () => import('./_v2/FeedbacksPage')
})
```

V1 users see the preserved old page. V2 users see the reorganized tree. No URL change, no new route.

## Folder Layout

```
src/app/[locale]/(admin)/admin/feedbacks/
├── page.tsx                                  ← rewritten to use withUIVersion()
├── _v1/
│   └── FeedbacksPage/
│       ├── index.tsx                         ← was page.tsx (710 lines, moved verbatim)
│       └── _components/
│           └── FeedbackDetailModal/          ← existing v1 modal, moved alongside v1 page
│               └── index.tsx
└── _v2/
    ├── FeedbacksPage/
    │   └── index.tsx                         ← ~160 lines: orchestrator only
    ├── FeedbackDetailDrawer/
    │   └── index.tsx                         ← ~120 lines: drawer wrapper + composition
    ├── _components/
    │   ├── FeedbacksStatStrip/index.tsx
    │   ├── FeedbacksToolbar/index.tsx
    │   ├── FeedbacksTable/index.tsx
    │   ├── FeedbackStatusMenu/index.tsx       ← shared menu used by row + drawer
    │   ├── FeedbackDetailHeader/index.tsx
    │   ├── FeedbackSummaryCard/index.tsx
    │   ├── FeedbackMetadataCard/index.tsx
    │   └── FeedbackCommentThread/index.tsx
    └── _hooks/
        ├── useFeedbacksQuery.ts
        ├── useFeedbackStatistics.ts
        ├── useFeedbackDetail.ts
        └── useFeedbackStatusUpdate.ts
```

Every component file stays well under the 800-line cap; most land in the 80–200 line range consistent with `admin/reports/_v2/_components/*`.

## Shared-Component Usage

Prefer existing shared primitives over re-implementing:

| Purpose | Source |
|---------|--------|
| Table | `@shared/components/GeneralTable` (unchanged from v1) |
| Loader | `@shared/components/LoaderLFIQ` |
| Login-as link | Mirror the v1 `SeoLink` + `loginAs` pattern (already in v1 `page.tsx`) |
| Drawer | `@mantine/core` `<Drawer>` with `position="right"`, `size={...}` |
| Menu | `@mantine/core` `<Menu>` (for inline row + in-drawer status menus) |
| Badge / Avatar | `@mantine/core` `<Badge>`, `<Avatar>` |
| Icons | `@tabler/icons-react` |
| Date formatting | `@utils/date` `formatDate`, `formatTimeAgo` |
| Format helpers | `@utils/format` `getStatusBadgeColor`, `getStatusLabel`, `getActionColor`, `getActionIcon`, `formatNumber` |
| Error extraction | `@utils/errorUtils` `extractErrorMessage` |
| Toast | `@hooks/useToast` |
| URL sync | `@hooks/useUrlParams` |

No new shared primitives need to be added for this change.

## Data Flow

### List screen

```
FeedbacksPage
  ├── useUrlParams → read search, status, type, priority, page
  ├── useFeedbacksQuery({ filter, page, pageSize, search }) → TanStack Query
  │     → GET via getFeedbacks(params) → { payload, page }
  ├── useFeedbackStatistics() → TanStack Query
  │     → GET via getStatisticsSnapshot('FEEDBACK')
  ├── useFeedbackStatusUpdate() → mutation
  │     → on success: invalidate list + stats (+ detail if open)
  ├── renders FeedbacksStatStrip (8 clickable)
  ├── renders FeedbacksToolbar (search + status/type/priority + clear/refresh)
  └── renders FeedbacksTable (rows)
        ├── row click (outside status pill) → opens FeedbackDetailDrawer
        └── row status pill click → opens FeedbackStatusMenu (inline)
              → on select → useFeedbackStatusUpdate.mutate(...)
```

### Detail drawer

```
FeedbackDetailDrawer (open, feedbackId)
  ├── useFeedbackDetail(feedbackId) → TanStack Query
  │     → GET via existing feedback-detail API
  ├── FeedbackDetailHeader
  │     ├── title + type icon + created timestamp
  │     ├── FeedbackStatusMenu (same component as inline)
  │     └── close (X)
  ├── internal scroll region {
  │     ├── FeedbackSummaryCard       (owner, account_type, priority, created_date)
  │     ├── FeedbackMetadataCard      (page_url + login-as, browser, device, raw metadata)
  │     └── FeedbackCommentThread     (list of comments + add-new textarea)
  │  }
  └── drawer footer — sticky (action buttons if any; else empty)
```

### Filter state sync

URL-synced via `useUrlParams` identical to v1:

| URL param | State | Default |
|-----------|-------|---------|
| `search`  | search keyword (debounced 500ms)    | `''` |
| `status`  | `FeedbackStatus`                     | `'ALL'` |
| `type`    | `FeedbackType`                       | `'ALL'` |
| `priority`| `FeedbackPriority`                   | `'ALL'` |
| `page`    | `pagination.pageIndex`               | `0` |

The filter-derivation function `buildFilter(status, type, priority)` moves verbatim from v1 into a pure helper inside `useFeedbacksQuery.ts`.

## API Mapping

All endpoints already exist. No new endpoints; no schema changes.

| v1 call | v2 call | Hook |
|---------|---------|------|
| `getFeedbacks({ pageSize, currentPage, search, filter })` | same | `useFeedbacksQuery` |
| `getStatisticsSnapshot('FEEDBACK')` | same | `useFeedbackStatistics` |
| `updateFeedbackStatus(id, status)` (called from the v1 modal) | same | `useFeedbackStatusUpdate` |
| `loginAs({ type: 'USER_KEY', token })` + cookie helpers | same | called directly from `FeedbackMetadataCard` and `FeedbacksTable` row |
| `addFeedbackComment(id, body)` (called from the v1 modal) | same | called from `FeedbackCommentThread` |
| `getFeedbackDetail(id)` (currently inside modal) | same | `useFeedbackDetail` |

All mutations invalidate via TanStack Query keys:

- `['feedbacks', { filter, page, search }]` — list
- `['feedback-statistics']` — stats
- `['feedback', id]` — single detail

`useFeedbackStatusUpdate.onSuccess` invalidates **all three**, so the row menu and drawer menu behave identically.

## Decision: Status Change — BOTH Row and Drawer

The same `FeedbackStatusMenu` component is used in two places:

1. **Inline in the table row** — rendered inside `FeedbacksTable`'s Status column. The status `<Badge>` becomes a `<Menu.Target>`. Clicking the badge opens a small menu of valid status transitions. `event.stopPropagation()` blocks the row click so the drawer does **not** open when the admin clicks the badge. On select → `useFeedbackStatusUpdate.mutate({ id, status })` → invalidate all three query keys → badge re-renders with the new status.
2. **In the drawer header** — rendered inside `FeedbackDetailHeader`. Same component, same mutation, same invalidations. The drawer stays open after a successful status change and the new status reflects immediately via the re-fetched detail.

Rationale: v1 support-desk admins change status dozens of times a day; the two-click row path shaves real friction without removing the in-drawer path for admins who want to read context before changing status.

## Drawer Sizing Decision

Explicit width: **720–800px on desktop** (`≥1024px`), **100vw on mobile** (`<1024px`), **full height**.

Mantine `<Drawer>` props:

```tsx
<Drawer
  opened={opened}
  onClose={onClose}
  position="right"
  size={mdAndUp ? 760 : '100%'}
  withCloseButton={false}      // custom close X in FeedbackDetailHeader
  padding={0}
  overlayProps={{ opacity: 0.4, blur: 2 }}
  lockScroll
  trapFocus
  returnFocus
>
  <div className="flex h-full flex-col">
    <FeedbackDetailHeader ... />
    <div className="flex-1 overflow-y-auto">
      <FeedbackSummaryCard ... />
      <FeedbackMetadataCard ... />
      <FeedbackCommentThread ... />
    </div>
  </div>
</Drawer>
```

`760` chosen as the midpoint of the 720–800 range and matches `homeowners-v2` report detail drawer width.

## i18n Strategy

- New namespace: **`AdminFeedbacksV2.*`** (snake_case keys inside).
- Every string used in any v2 component is passed through `useTranslations()` — no hardcoded English.
- Keys added to **all 7 locale files**: `en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`, `ko.json`, `ar.json`.
- Re-use existing generic keys where they already exist (e.g., `Status.new`, `Status.in_progress`, `Status.resolved`, `Action.refresh`, `Action.clear`, `Placeholder.search`, `Label.search`, `Label.status`, `Label.feedback_type`, `Label.feedback_priority`, `Feedback.type_bug`, etc. — all already present in v1 and kept).
- New v2-specific keys live under `AdminFeedbacksV2.*` (examples: `AdminFeedbacksV2.drawer_title`, `AdminFeedbacksV2.comment_placeholder`, `AdminFeedbacksV2.row_status_menu_aria`, `AdminFeedbacksV2.change_status`, `AdminFeedbacksV2.empty_title`, `AdminFeedbacksV2.empty_description`).
- RTL: `he.json` and `ar.json` must not need layout flips beyond what Mantine's RTL provider already handles — verified by smoke-testing the drawer with `dir="rtl"`.

## a11y Checklist

- [ ] Drawer traps focus while open (Mantine `trapFocus`).
- [ ] ESC closes the drawer (Mantine default).
- [ ] Drawer returns focus to the triggering row on close (Mantine `returnFocus`).
- [ ] All icon-only buttons (refresh, clear, close X, login-as) have `aria-label`.
- [ ] Status pill acting as a `<Menu.Target>` has `role="button"` and `aria-haspopup="menu"`.
- [ ] Table rows are keyboard-activatable (Enter opens drawer).
- [ ] Inline status menu is keyboard-navigable (Arrow keys between items; Enter selects; Esc closes).
- [ ] Status pills meet WCAG AA contrast against their backgrounds (orange-600 on orange-50, etc. — reuse existing `getStatusBadgeColor` mapping).
- [ ] Stat strip cards, when clickable, have `role="button"` and `aria-pressed` reflecting the currently-active status filter.
- [ ] `prefers-reduced-motion` honored on the drawer slide-in (Mantine default respects it).
- [ ] On mobile, stat strip horizontal scroll container has `overflow-x: auto`; each card has `min-width: 140px` and a tab index so keyboard users can reach them.

## Token / Visual Parity

- **Primary CTA color:** `orange-600` (matches every other `*-v2` page).
- **Card radius:** `rounded-12` (12px).
- **Card border:** `border border-gray-200` (or equivalent token) with `bg-white`.
- **Stat card backgrounds:** reuse v1 color mapping (green-50, yellow-50, blue-50, etc.) but upgrade to `rounded-12` with v2 spacing.
- **Text scale:** `text-3xl font-bold` title; `text-sm text-gray-500` subtitle; `text-xs` meta — same scale as `admin/reports/_v2`.
- **Density:** table row height matches `homeowners-v2` (48–52px rows); padding `p-6` on page container.

## Non-Goals (re-emphasis)

- No bulk actions (none in v1, none added).
- No new filter dimensions (no date range, no "assignee", no "tag").
- No backend changes.
- No unit or E2E tests in this change.
- No `/admin/feedbacks-v2` URL.

## Risk Log

| Risk | Mitigation |
|------|------------|
| Drawer width break on mid-range tablets (768–1023px) | Use `md` Mantine breakpoint (768) as the switch — tablets get 100vw drawer, desktop gets 760px. Verified on mockup 02-detail-drawer. |
| TanStack Query not yet set up for this route | `lf-iq` already uses `@tanstack/react-query` (see `package.json` and other `*-v2` hooks). Reuse the existing QueryClient. |
| `updateFeedbackStatus` semantics differ between row vs drawer | Mitigated by extracting a single `useFeedbackStatusUpdate` mutation used by both sites — identical behavior by construction. |
| Login-as flow triggered from inside the drawer navigates away mid-session | Same as v1 — the `addSubTokenCookie('return_url', ...)` step before `router.push(pageUrl)` is preserved identically. |
| Comment thread rendering XSS | v1 uses `dangerouslySetInnerHTML` only on `feedback.description` (backend-sanitized). v2 keeps that boundary — comments render as plain text with `white-space: pre-wrap`. |
