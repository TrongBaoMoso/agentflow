# Tasks: Admin Feedbacks V2 Redesign

Target repo: `lf-iq`
Feature branch: `feature/admin-feedbacks-v2` (from `production`)
All tasks are `[frontend]`. No backend work.

> **Hard gate:** Phase 0 must be user-approved before any Phase 1 code begins. Dev Lead must not create Phase 1+ Beads until the mockup is signed off.
>
> **Dependency order:** Phase 0 → Phase 1 → Phase 2 → Phase 3. Phase 4 runs in parallel alongside Phases 2 and 3 (each component lands with its i18n keys already added).

---

## 0. Mockup Gate (user approval required before any code)

- [ ] 0.1 [frontend] Create `lf-iq/mockups/feedbacks-v2/` with HTML mockups + README
  - **Files:**
    - `lf-iq/mockups/feedbacks-v2/README.md`
    - `lf-iq/mockups/feedbacks-v2/01-list.html`
    - `lf-iq/mockups/feedbacks-v2/02-list-mobile.html`
    - `lf-iq/mockups/feedbacks-v2/03-inline-row-status-menu.html`
    - `lf-iq/mockups/feedbacks-v2/04-detail-drawer.html`
    - `lf-iq/mockups/feedbacks-v2/05-in-drawer-status-menu.html`
    - `lf-iq/mockups/feedbacks-v2/06-comment-thread.html`
    - `lf-iq/mockups/feedbacks-v2/07-empty-and-loading.html`
  - **Coverage:**
    - `01-list.html`: header + 8 clickable stat cards, toolbar (search + status/type/priority + clear + refresh), table rows with status badges, pagination bar
    - `02-list-mobile.html`: same list at 375px width; stat strip has horizontal scroll; toolbar stacks vertically
    - `03-inline-row-status-menu.html`: status badge in one row opened as a menu showing `NEW / IN_PROGRESS / NEED_MORE_INFO / RESOLVED / CLOSED / REJECTED / DUPLICATED`
    - `04-detail-drawer.html`: 1440px desktop; drawer is 760px wide, right-aligned, full height; shows DetailHeader + SummaryCard + MetadataCard (with `page_url` login-as link) + CommentThread
    - `05-in-drawer-status-menu.html`: same drawer with the in-drawer status menu opened from the DetailHeader
    - `06-comment-thread.html`: 3 existing comments + "Add comment" textarea + "Post" button
    - `07-empty-and-loading.html`: two panels — (a) empty-filter-result state with illustration + copy, (b) loading skeleton for the list
  - **README cross-reference table:** `Mockup file → v2 component filename → acceptance criteria number (1–12)`
  - **Styling:** inline CSS or Tailwind CDN; use the `admin-reports-v2` token set — `orange-600` primary, `rounded-12`, border tokens, status pill colors from existing `getStatusBadgeColor` mapping.
  - **Acceptance:** 7 HTML files + README render cleanly in Chrome; visual parity with `admin/reports/_v2` confirmed by eye; all 7 files cover proposal success-criteria #2–#10.
  - **HARD GATE:** User must review and approve. Dev Lead: do not unblock any Phase 1 Beads until user posts approval.
  - **Labels:** `frontend`
  - **Depends on:** (nothing — this is the entry task)

---

## 1. Foundation Setup (reorganize + wire withUIVersion)

- [ ] 1.1 [frontend] Relocate existing v1 page into `_v1/FeedbacksPage/`
  - **Target files:**
    - move `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/page.tsx` body → new `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v1/FeedbacksPage/index.tsx` verbatim (no logic change)
    - move `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_components/FeedbackDetailModal/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v1/FeedbacksPage/_components/FeedbackDetailModal/index.tsx`
    - fix relative imports inside the moved files
  - **Acceptance:**
    - `_v1/FeedbacksPage/index.tsx` is a default export identical in runtime behavior to the old `page.tsx`
    - `FeedbackDetailModal` still opens via `useModal()` from the moved v1 page
    - `npm run build` passes; `npx tsc --noEmit` exits 0
    - No behavior change visible in the browser when the shell re-exports `_v1` directly as an interim step
  - **Labels:** `frontend`
  - **Depends on:** 0.1 (user approval of mockups)
  - **Reference:** `admin/reports/_v1/ReportsPage/index.tsx` is the parallel pattern used in `admin-reports-v2-redesign`

- [ ] 1.2 [frontend] Create empty v2 scaffolding (placeholders)
  - **Target files:**
    - create `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/FeedbacksPage/index.tsx` with a placeholder default export returning `<div className="p-8">Feedbacks V2 — scaffolding</div>`
    - create `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/FeedbackDetailDrawer/index.tsx` with a placeholder default export returning `null`
    - create empty folders `_v2/_components/` and `_v2/_hooks/` with `.gitkeep`
  - **Acceptance:** files exist; TypeScript compiles; no runtime errors.
  - **Labels:** `frontend`
  - **Depends on:** 1.1
  - **Reference:** `admin/reports/_v2/ReportsPage/index.tsx` scaffolding step from `admin-reports-v2-redesign/tasks.md` §1.2

- [ ] 1.3 [frontend] Wire `withUIVersion()` on `/admin/feedbacks` route
  - **Target file:** rewrite `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/page.tsx` to use the `withUIVersion()` pattern exactly as in `admin/dashboard/page.tsx` and `admin/reports/page.tsx`:
    - `importV1: () => import('./_v1/FeedbacksPage')`
    - `importV2: () => import('./_v2/FeedbacksPage')`
    - Preserve any existing `RouteGuard` / admin-role wrapper
    - Default-export the `withUIVersion()` result
  - **Acceptance:**
    - `uiVersionAtom === 'v2'` renders the placeholder v2 page
    - `uiVersionAtom === 'v1'` renders the preserved v1 page unchanged
    - `npm run build` passes; `npx tsc --noEmit` exits 0
    - No regressions on v1 route (search, filters, statistics, modal detail all work exactly as before)
  - **Labels:** `frontend`
  - **Depends on:** 1.2
  - **Reference:** `admin/reports/page.tsx` for exact `withUIVersion()` shape

---

## 2. List Screen (v2)

- [ ] 2.1 [frontend] Extract data hooks for the list
  - **Target files:**
    - `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_hooks/useFeedbacksQuery.ts`
    - `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_hooks/useFeedbackStatistics.ts`
    - `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_hooks/useFeedbackStatusUpdate.ts`
  - **Behavior:**
    - `useFeedbacksQuery({ filter, page, pageSize, search })` → wraps `getFeedbacks` with TanStack Query, query key `['feedbacks', { filter, page, pageSize, search }]`. Exports `{ data, isLoading, isError, refetch, totalElements, totalPages }`.
    - `useFeedbackStatistics()` → wraps `getStatisticsSnapshot('FEEDBACK')`, query key `['feedback-statistics']`. Exports 8 metrics (total, new, in_progress, need_more_info, resolved, rejected, duplicated, closed).
    - `useFeedbackStatusUpdate()` → TanStack Query `useMutation({ mutationFn: ({ id, status }) => updateFeedbackStatus(id, status), onSuccess: () => invalidate ['feedbacks'], ['feedback-statistics'], ['feedback', id] })`. Shows toast on success / error via `useToast`.
    - Include a pure helper `buildFilter(status, type, priority)` inside `useFeedbacksQuery.ts` copied verbatim from v1.
  - **Acceptance:** hooks compile; unit smoke in devtools (open/close the v2 placeholder + fire each hook via a temporary button) returns the same shape as v1's inline fetch.
  - **Labels:** `frontend`
  - **Depends on:** 1.3
  - **Reference:** `admin/reports/_v2/_hooks/useReportsQuery.ts`, `useReportStatistics.ts` for shape

- [ ] 2.2 [frontend] Build `FeedbacksStatStrip` (8 clickable cards)
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbacksStatStrip/index.tsx`
  - **Behavior:**
    - Renders 8 `<Paper>` / `<div>` cards: Total, New, In Progress, Need More Info, Resolved, Rejected, Duplicated, Closed (same ordering/colors as v1).
    - Each card accepts `{ activeStatus, onClick(status) }`. Clicking a card calls `onClick` and is visually `aria-pressed` when that status matches the current filter.
    - Desktop (`≥lg`): cards use `flex-1` layout, all visible.
    - Mobile: parent has `overflow-x-auto` scroll; each card has `min-w-[140px]`.
    - All labels come from existing i18n keys (`Status.new`, `Status.in_progress`, etc.) plus `AdminFeedbacksV2.total_feedbacks` for the Total card.
  - **Acceptance:** visual parity with mockup `01-list.html` and `02-list-mobile.html`; keyboard Tab cycles through cards; `aria-pressed` reflects active filter.
  - **Labels:** `frontend`
  - **Depends on:** 2.1
  - **Reference:** `admin/reports/_v2/_components/ReportsStatStrip/index.tsx`

- [ ] 2.3 [frontend] Build `FeedbacksToolbar` (search + selects + clear + refresh)
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbacksToolbar/index.tsx`
  - **Behavior:**
    - `TextInput` search with 500ms debounce, `IconSearch` leftSection, clear (`IconX`) rightSection when non-empty.
    - Three `Select`s: status / type / priority — options match v1 exactly.
    - Clear-filters button visible only when any filter is active.
    - Refresh button always visible — calls `refetchList()` and `refetchStats()` via props.
    - All labels use existing keys (`Label.search`, `Label.status`, `Label.feedback_type`, `Label.feedback_priority`, `Action.refresh`, `Action.clear`, `Placeholder.search`).
    - Props: `{ search, onSearchChange, status, type, priority, onStatusChange, onTypeChange, onPriorityChange, onClear, onRefresh, loading }`
  - **Acceptance:** matches mockup `01-list.html` toolbar row; search debounce behaves identically to v1; disabled-when-loading state works.
  - **Labels:** `frontend`
  - **Depends on:** 2.1
  - **Reference:** `admin/reports/_v2/_components/ReportsToolbar/index.tsx`

- [ ] 2.4 [frontend] Build `FeedbackStatusMenu` (shared row + drawer menu)
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbackStatusMenu/index.tsx`
  - **Behavior:**
    - Mantine `<Menu>` with a `<Menu.Target>` slot (caller supplies the target, e.g. a status Badge or a "Change status" button in the drawer).
    - `<Menu.Dropdown>` lists all 7 statuses: `NEW / IN_PROGRESS / NEED_MORE_INFO / RESOLVED / CLOSED / REJECTED / DUPLICATED`. Current status is disabled + marked active.
    - Each item, on click: calls `useFeedbackStatusUpdate.mutate({ id: feedbackId, status: newStatus })`.
    - Emits `onStatusChanged?` callback after the mutation resolves (for detail drawer to re-sync).
    - Props: `{ feedbackId, currentStatus, onStatusChanged?, children }` — `children` is rendered inside `<Menu.Target>` so callers can wrap a Badge or a button.
  - **Acceptance:**
    - In isolation (a storybook-style sandbox page, or a temp route), picking a new status calls the mutation and a toast appears on success.
    - `event.stopPropagation()` is applied on the target wrapper so parent row clicks don't fire.
    - Keyboard: Arrow keys move between items, Enter selects, Esc closes (Mantine default).
    - `aria-label` on the menu trigger (key: `AdminFeedbacksV2.row_status_menu_aria` or `AdminFeedbacksV2.change_status` depending on caller).
  - **Labels:** `frontend`
  - **Depends on:** 2.1
  - **Reference:** `admin/reports/_v2/_components/ReportStatusMenu/index.tsx`

- [ ] 2.5 [frontend] Build `FeedbacksTable` with inline row status menu
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbacksTable/index.tsx`
  - **Behavior:**
    - Uses existing `@shared/components/GeneralTable` + Mantine React Table columns (MRT_ColumnDef).
    - **Columns preserved verbatim from v1:** id, type, owner, account_type/title, title+description, url (with login-as + redirect), priority, status, comments_count, created_date.
    - **NEW:** the **Status** column renders the status Badge wrapped by `<FeedbackStatusMenu feedbackId={row.original.id} currentStatus={row.original.status}>`. Clicking the badge opens the menu; clicking the row anywhere outside the badge opens the detail drawer.
    - `event.stopPropagation()` on the Menu.Target wrapper to block the row click.
    - `onRowClick` prop opens the detail drawer with the clicked feedback id.
    - Props: `{ rows, isLoading, pagination, onPaginationChange, rowCount, onRowClick, onLoginAs }`
  - **Acceptance:**
    - All v1 columns render with visual parity to mockup `01-list.html`
    - Clicking a row (not on the status badge) fires `onRowClick(row)` → drawer opens
    - Clicking the status badge opens the inline menu, does **not** open the drawer, and picks from the 7 statuses (mockup `03-inline-row-status-menu.html`)
    - Picking a new status calls the mutation; on success the list + stats refetch automatically (via the mutation's `onSuccess` invalidations)
    - Login-as + redirect flow in the URL column behaves identically to v1
  - **Labels:** `frontend`
  - **Depends on:** 2.2, 2.3, 2.4
  - **Reference:** `admin/reports/_v2/_components/ReportsTable/index.tsx` for column structure + row click handling; v1 `page.tsx` lines 352–525 for the column definitions to port

- [ ] 2.6 [frontend] Wire `FeedbacksPage` orchestrator
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/FeedbacksPage/index.tsx`
  - **Behavior:**
    - Top-level page component: header (icon + title + subtitle), `FeedbacksStatStrip`, `FeedbacksToolbar`, `FeedbacksTable`.
    - Holds filter state + URL sync (`useUrlParams` — same keys as v1: `search`, `status`, `type`, `priority`, `page`).
    - Mounts `useFeedbacksQuery` + `useFeedbackStatistics`.
    - Opens the `FeedbackDetailDrawer` via local state `{ openId: string | null }`; clicking a row sets it, closing clears it.
    - Passes a shared `refetchAll = () => { refetchList(); refetchStats(); }` to toolbar and drawer.
  - **Acceptance:**
    - Feature parity with v1 list behaviors per proposal success criterion #3
    - URL params round-trip on refresh (paste URL with filters → state restores)
    - Visual parity with mockup `01-list.html`
    - `npx tsc --noEmit` exits 0; `npm run build` passes
  - **Labels:** `frontend`
  - **Depends on:** 2.2, 2.3, 2.5

---

## 3. Detail Drawer (v2)

- [ ] 3.1 [frontend] Add `useFeedbackDetail` hook
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_hooks/useFeedbackDetail.ts`
  - **Behavior:**
    - `useFeedbackDetail(feedbackId: string | null)` returns the single feedback detail + comments via TanStack Query, keyed `['feedback', feedbackId]`. Disabled when `feedbackId === null`.
    - Reuses whatever existing API call the v1 `FeedbackDetailModal` uses (port it over — no new endpoints).
  - **Acceptance:** hook returns `{ feedback, isLoading, isError, refetch }` identical to v1 modal data shape.
  - **Labels:** `frontend`
  - **Depends on:** 2.1
  - **Reference:** `admin/reports/_v2/_hooks/useReportDetail.ts`, v1 `FeedbackDetailModal` for the API call used today

- [ ] 3.2 [frontend] Build `FeedbackDetailHeader`
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbackDetailHeader/index.tsx`
  - **Behavior:**
    - Fixed (non-scrolling) top bar inside the drawer.
    - Left: feedback type icon + title + created-date timestamp.
    - Right: `<FeedbackStatusMenu feedbackId currentStatus>` rendered with a button target (label: "Change status"), and a close-X button (`aria-label` from `AdminFeedbacksV2.close_drawer`).
  - **Acceptance:** matches mockup `04-detail-drawer.html` header; in-drawer status menu works (mockup `05-in-drawer-status-menu.html`).
  - **Labels:** `frontend`
  - **Depends on:** 2.4, 3.1

- [ ] 3.3 [frontend] Build `FeedbackSummaryCard`
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbackSummaryCard/index.tsx`
  - **Behavior:**
    - Read-only card showing: owner (avatar + full_name + username), account type (owner.title), priority badge, created_date formatted + time-ago.
    - Reuse `getStatusBadgeColor`, `getStatusLabel`, `formatDate`, `formatTimeAgo`.
  - **Acceptance:** matches mockup `04-detail-drawer.html` summary card.
  - **Labels:** `frontend`
  - **Depends on:** 3.1

- [ ] 3.4 [frontend] Build `FeedbackMetadataCard` (includes login-as)
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbackMetadataCard/index.tsx`
  - **Behavior:**
    - Read-only card showing: `feedback.metadata.page_url` (clickable login-as-and-redirect link — same flow as v1), browser, device, any other raw metadata keys.
    - Login-as flow ports verbatim from v1 `page.tsx` `handleLoginAsAndRedirect` (addSubTokenCookie, loginAs, redirect via `router.push(pageUrl)`).
  - **Acceptance:** page_url click initiates login-as + redirect flow identical to v1; other metadata keys render as a small key/value list.
  - **Labels:** `frontend`
  - **Depends on:** 3.1

- [ ] 3.5 [frontend] Build `FeedbackCommentThread`
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/_components/FeedbackCommentThread/index.tsx`
  - **Behavior:**
    - Lists existing comments (author avatar + name + timestamp + body rendered as plain text with `white-space: pre-wrap`). No markdown, no HTML — same as v1.
    - "Add comment" textarea + "Post" button at the bottom. Posting calls `addFeedbackComment(id, body)` and invalidates `['feedback', id]`.
  - **Acceptance:** matches mockup `06-comment-thread.html`; posting a comment clears the textarea and appends the new comment after refetch; error toast on failure.
  - **Labels:** `frontend`
  - **Depends on:** 3.1

- [ ] 3.6 [frontend] Wire `FeedbackDetailDrawer` (right-side, 720–800px)
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/FeedbackDetailDrawer/index.tsx`
  - **Behavior:**
    - Mantine `<Drawer position="right" size={mdAndUp ? 760 : '100%'} padding={0} lockScroll trapFocus returnFocus withCloseButton={false}>`
    - Full-height flex column: `FeedbackDetailHeader` fixed at top, internal scroll region containing `FeedbackSummaryCard` + `FeedbackMetadataCard` + `FeedbackCommentThread`.
    - Reads data via `useFeedbackDetail(openId)`; shows skeleton while loading, error state on failure.
    - Props: `{ openId: string | null, onClose: () => void }`
  - **Acceptance:**
    - On desktop (`md: 768+`) drawer is 760px wide, right-aligned, full height (matches mockup `04-detail-drawer.html`)
    - On mobile (<768) drawer takes 100vw (same mockup, mobile view)
    - ESC closes; clicking overlay closes; focus traps inside while open; focus returns to the originating row on close
    - In-drawer status change (via `FeedbackStatusMenu` inside the header) refetches list + stats + detail — the drawer stays open and shows the new status
  - **Labels:** `frontend`
  - **Depends on:** 3.2, 3.3, 3.4, 3.5

- [ ] 3.7 [frontend] Retire v1 modal from v2 path
  - **Target file:** `lf-iq/src/app/[locale]/(admin)/admin/feedbacks/_v2/FeedbacksPage/index.tsx`
  - **Behavior:**
    - Replace any placeholder modal reference in the v2 orchestrator with the `FeedbackDetailDrawer`.
    - Clicking a row sets `openId`; closing the drawer sets `openId = null`.
  - **Acceptance:** v2 never renders the v1 modal component. v1 path still uses the modal unchanged.
  - **Labels:** `frontend`
  - **Depends on:** 2.6, 3.6

---

## 4. i18n + Polish (runs alongside Phases 2 & 3)

- [ ] 4.1 [frontend] Add `AdminFeedbacksV2.*` namespace to all 7 locale files
  - **Target files:**
    - `lf-iq/messages/en.json`
    - `lf-iq/messages/es.json`
    - `lf-iq/messages/vi.json`
    - `lf-iq/messages/zh.json`
    - `lf-iq/messages/he.json`
    - `lf-iq/messages/ko.json`
    - `lf-iq/messages/ar.json`
  - **Behavior:**
    - Add a new top-level `AdminFeedbacksV2` namespace with at minimum: `total_feedbacks`, `drawer_title`, `change_status`, `row_status_menu_aria`, `close_drawer`, `comment_placeholder`, `post_comment`, `empty_title`, `empty_description`, `login_as_and_redirect_tooltip`.
    - All 7 files contain identical keys; English in `en.json`, best translation in the others (if a translator is not available, place the English placeholder + a `// TODO_TRANSLATE` comment key inside that locale so QC can flag).
  - **Acceptance:**
    - Every v2 component references only `useTranslations()` — `grep -rn '[A-Z][a-z]+ [a-z]' _v2/` finds no hardcoded UI English inside JSX text
    - All 7 locale files have matching key sets (diff by key count)
    - Switching locale in the app flips every v2 string
  - **Labels:** `frontend`
  - **Depends on:** 1.3 (can land in parallel with any Phase 2 / Phase 3 task)

- [ ] 4.2 [frontend] a11y pass across v2 components
  - **Target files:** each `_v2/_components/*` file + `FeedbackDetailDrawer/index.tsx` + `FeedbacksPage/index.tsx`
  - **Behavior:**
    - Icon-only buttons (refresh, clear, close X, login-as) get `aria-label` from new i18n keys
    - Stat strip cards get `role="button"` + `aria-pressed` reflecting current filter
    - Status pills acting as Menu targets get `role="button"` + `aria-haspopup="menu"`
    - Drawer respects `trapFocus`, `returnFocus`, `lockScroll` (Mantine props)
    - `prefers-reduced-motion` respected on drawer slide (Mantine default — verify with devtools emulation)
    - Color-contrast sanity check on status pills against their backgrounds via devtools / Lighthouse
  - **Acceptance:**
    - Keyboard-only flow: Tab → stat card → filter applies; Tab → search → debounce works; Tab → row → Enter opens drawer; inside drawer Tab → Arrow keys → Esc closes, focus returns
    - Lighthouse a11y score on `/admin/feedbacks` v2 ≥ 95
  - **Labels:** `frontend`
  - **Depends on:** 2.6, 3.6

- [ ] 4.3 [frontend] Final build + type-check + visual sanity
  - **Behavior:**
    - `npx tsc --noEmit` exits 0
    - `npm run build` passes
    - Open `/admin/feedbacks` in dev mode with `uiVersionAtom === 'v2'` and verify against proposal success criteria #2–#11 (v1 unchanged, v2 feature parity + inline row menu + drawer menu + 720–800px drawer + mobile scroll + i18n).
    - Open `/admin/feedbacks` with `uiVersionAtom === 'v1'` and verify the old page is unchanged.
  - **Acceptance:** checklist signed off; ready for QC handoff.
  - **Labels:** `frontend`
  - **Depends on:** 3.7, 4.1, 4.2

---

## Summary

| Phase | Tasks | Blocking | Parallelizable |
|-------|-------|----------|----------------|
| 0. Mockup | 1 (0.1) | blocks everything downstream | — |
| 1. Foundation | 3 (1.1–1.3) | blocks Phase 2 | sequential within phase |
| 2. List | 6 (2.1–2.6) | blocks Phase 3 | 2.2 / 2.3 / 2.4 can run in parallel after 2.1 |
| 3. Drawer | 7 (3.1–3.7) | — | 3.2 / 3.3 / 3.4 / 3.5 can run in parallel after 3.1 |
| 4. i18n + polish | 3 (4.1–4.3) | — | runs alongside Phases 2 and 3 |

**Total: 20 tasks.**
