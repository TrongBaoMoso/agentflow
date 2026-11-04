# Proposal: Admin Feedbacks V2 Redesign

## Problem Statement

The admin Feedbacks management page at `/admin/feedbacks` (in `lf-iq`) is the last v1-only admin surface left in the product. While every other admin page (`dashboard-v2`, `users-v2`, `homeowners-v2`, `admin-reports-v2`, `referral-partners-v2`, `release-notes-v2`, `email-templates-v2`, `conversation-history-v2`) has been redesigned into the unified v2 visual language (Tailwind-first cards, sticky toolbars, stat strips, rounded-12 surfaces, orange-primary CTAs, drawer-based detail surfaces), the Feedbacks page still ships its v1 monolithic layout:

- **Single 710-line `page.tsx` file** mixing data fetching, URL sync, statistics, filters, toolbar, table columns, login-as flow, and rendering — violating the codebase 800-line cap and well below the v2 "many small focused files" convention.
- **Legacy modal-based detail** (`FeedbackDetailModal` used via `useModal()`) — center-screen modal instead of the v2 right-drawer pattern adopted for every other detail surface.
- **Inline stat strip, filters, and table markup** with no shared `*StatStrip`, `*Toolbar`, `*Table`, `*StatusMenu` extractions — making any change require editing the full page.
- **Inconsistent visual language** with the rest of the admin area: plain `Paper` stat cards, ad-hoc spacing, no v2 tokens, no reusable components.
- **No inline row-level status change** — to change feedback status, the admin must open the modal, pick a new status, and close; that is 3 clicks for a single-field update that happens dozens of times per day on the support desk.

## Proposed Solution

Reorganize `/admin/feedbacks` into the **v2 architecture** by mirroring the exact structure that `admin/reports/_v2` uses:

1. **Phase 0 — HTML mockups (hard gate):** Produce browser-renderable HTML mockups covering the list, the detail drawer, the inline row status menu, and the in-drawer comment thread. User must approve before any Phase 1 code starts.
2. **Phase 1 — Reorganize to v2 folder layout:** Split the 710-line `page.tsx` into `_v1/` preservation + new `_v2/` scaffolding. Wire `withUIVersion()` on `page.tsx` so `uiVersionAtom === 'v2'` renders the v2 tree and `'v1'` keeps today's page untouched.
3. **Phase 2 — List screen:** Extract `FeedbacksStatStrip` (8 clickable stat cards — Total, New, In Progress, Need More Info, Resolved, Rejected, Duplicated, Closed), `FeedbacksToolbar` (search + 3 Selects + Clear/Refresh), `FeedbacksTable` (MRT columns preserved verbatim + **new inline row status menu** for quick status changes), and `FeedbacksPage` orchestrator. Extract data-fetch hooks (`useFeedbacksQuery`, `useFeedbackStatistics`, `useFeedbackStatusUpdate`). URL-sync filters via `useUrlParams`.
4. **Phase 3 — Detail drawer:** Replace `FeedbackDetailModal` with a right-side Mantine `Drawer` (720–800px wide on desktop, full height). Break the detail body into `FeedbackDetailHeader`, `FeedbackSummaryCard`, `FeedbackMetadataCard`, `FeedbackCommentThread`, `FeedbackStatusMenu` (same `updateFeedbackStatus` call as the row menu). Comment thread and body use internal scroll — header/footer stay fixed inside the drawer.
5. **Phase 4 — i18n + polish:** Move any hardcoded English strings under a new `AdminFeedbacksV2.*` namespace in all 7 locale files, plus a a11y pass (keyboard focus trap in drawer, ESC to close, ARIA labels on icon-only buttons).

The v2 surface matches every other `*-v2` admin page in density, tokens, spacing, and interaction patterns. No new backend endpoints are required — v2 reuses the existing `getFeedbacks`, `getStatisticsSnapshot('FEEDBACK')`, `updateFeedbackStatus`, `addFeedbackComment` APIs unchanged.

## Scope

### In Scope (Frontend — primary)

- **Phase 0 — Mockup hard gate:** `lf-iq/mockups/feedbacks-v2/` HTML + README covering list, stat strip, filters, inline row status menu, right-drawer detail, in-drawer status menu, comment thread, empty states, and mobile responsive (horizontal scroll on stat strip).
- **Phase 1 — Folder reorg:** Move `page.tsx` into `_v1/FeedbacksPage/index.tsx`. Create `_v2/FeedbacksPage/`, `_v2/FeedbackDetailDrawer/`, `_v2/_components/`, `_v2/_hooks/`. Wire `withUIVersion()` on `page.tsx`.
- **Phase 2 — List screen:** `FeedbacksStatStrip` (8 clickable filter cards, horizontal scroll on mobile), `FeedbacksToolbar` (search + status/type/priority selects + clear/refresh), `FeedbacksTable` (columns verbatim from v1 + **inline row status menu** triggered from a status badge-cum-menu in the Status column), `useFeedbacksQuery`, `useFeedbackStatistics`, `useFeedbackStatusUpdate` hooks, URL-synced filters.
- **Phase 3 — Detail drawer:** Right-side Mantine `Drawer`, **720–800px wide on desktop, 100vw on mobile, full height**, with internal scroll for body + comment thread. Contains `FeedbackDetailHeader` (title + type icon + status pill + action buttons), `FeedbackSummaryCard` (owner, account type, priority, dates), `FeedbackMetadataCard` (page_url with login-as + redirect, browser, device), `FeedbackCommentThread` (existing comments + add-new textarea), `FeedbackStatusMenu` (same `updateFeedbackStatus` call as row menu, emits the same invalidation).
- **Phase 4 — i18n + a11y:** All new/moved strings under `AdminFeedbacksV2.*` namespace (snake_case) in all 7 locale files (`en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`, `ko.json`, `ar.json`). Keyboard focus trap in drawer, ESC closes drawer, ARIA labels on icon-only buttons, color-contrast sanity on status pills, `prefers-reduced-motion` honored on drawer slide-in.
- **v1 preservation:** Users on `uiVersionAtom === 'v1'` see the unchanged 710-line page.

### In Scope (Backend)

None. All APIs (`getFeedbacks`, `getStatisticsSnapshot('FEEDBACK')`, `updateFeedbackStatus`, `addFeedbackComment`, `loginAs`) exist and are reused as-is.

### Out of Scope

- Changing the v1 feedbacks page (stays as-is for v1 users).
- New statistics, new filter dimensions, new columns (feature parity only — v2 is a visual + architectural rewrite, not a feature add).
- Bulk actions (no bulk status change / bulk delete in v1; not added here).
- Feedback reply-via-email / notification to the submitting user (not a v1 feature).
- Backend changes — no new endpoints, no schema changes, no new BE fields.
- Unit / E2E test coverage beyond a QC sanity pass (separate QC iteration).
- A separate URL (`/admin/feedbacks-v2`). Follows project convention: version toggle at the existing URL.
- Feature flags / role gating beyond the existing `uiVersionAtom` toggle and admin route guard.

## Success Criteria

1. HTML mockups at `lf-iq/mockups/feedbacks-v2/` reviewed and approved by user **before** any FE code is written.
2. `/admin/feedbacks` renders v2 when `uiVersionAtom === 'v2'` and the unchanged v1 page when `'v1'`.
3. All v1 behaviors work identically in v2: search with debounce + clear, status/type/priority select filters, click-to-filter on stat cards, refresh, URL-sync of filter state, pagination, login-as + redirect flow, view details, add comment, change status, empty / error / loading states.
4. Stat strip shows all 8 clickable cards (Total, New, In Progress, Need More Info, Resolved, Rejected, Duplicated, Closed). Desktop: all visible and clickable. Mobile: horizontal scroll.
5. Detail drawer opens from the right, occupies 720–800px on desktop (`≥1024px`), is full-width on mobile, full-height, with internal scroll on body + comment thread.
6. **Inline row status menu** lets admin change status from the table row (click status pill → menu opens → pick new status → calls `updateFeedbackStatus` → refetches list + stats). Click propagation is blocked so the row click still opens the drawer when the click lands outside the menu.
7. **In-drawer status menu** offers the same `updateFeedbackStatus` action with the same refetch side effects (list + stats + detail).
8. Visual parity with `admin-reports-v2` list density, `homeowners-v2` drawer/card tokens, and `dashboard-v2` stat strip style.
9. All new strings under `AdminFeedbacksV2.*` namespace in all 7 locale files. No hardcoded English in v2 components.
10. a11y: drawer traps focus, ESC closes, icon-only buttons have `aria-label`, status pills meet WCAG AA contrast.
11. No regression in v1 page.
12. TypeScript strict passes (`npx tsc --noEmit` exits 0) and `npm run build` passes.

## Open-Question Resolutions (all 12)

| # | Question | Final Answer |
|---|----------|--------------|
| **Q1** | Stat strip: keep all 8 cards as clickable filters? | **A — keep all 8 clickable on desktop; horizontal scroll on mobile.** |
| **Q2** | Detail surface: modal vs drawer vs full page? | **B — right drawer, 720–800px on desktop, 100vw on mobile, full height, internal scroll on body + comment thread.** |
| **Q3** | Status change UX: row menu, drawer menu, or both? | **B — both inline row menu AND in-drawer menu. Both call `updateFeedbackStatus` and refetch list + stats + detail on success.** |
| Q4 | Base branch? | `production` (per `lf-iq` convention — see `feedback_lf_iq_base_branch.md`). Default used. |
| Q5 | URL strategy for v2? | Keep `/admin/feedbacks`. Toggle via `withUIVersion()` and `uiVersionAtom`. No `/admin/feedbacks-v2` route. Default used (matches every other `*-v2` redesign in this repo). |
| Q6 | Folder naming inside the route? | `_v1/FeedbacksPage/`, `_v2/FeedbacksPage/`, `_v2/FeedbackDetailDrawer/`, `_v2/_components/`, `_v2/_hooks/`. Default used (mirrors `admin/reports/`). |
| Q7 | Bulk actions? | None in v1 → none in v2. Default used (out of scope). |
| Q8 | Inline row edit of fields other than status (priority, type)? | **Status only.** Priority and type are not inline-editable in v1; not added here. Default used. |
| Q9 | Comment thread rendering: markdown, plain text, or HTML? | **Match v1 rendering exactly** — v1 renders comments as plain text with line breaks preserved; v2 keeps the same. `dangerouslySetInnerHTML` used only on the existing `feedback.description` field (already safe per backend). Default used. |
| Q10 | Login-as + redirect flow in the drawer? | Yes — same flow as v1: clickable page_url in a row OR in the drawer metadata card; on click, calls `loginAs`, saves cookies, redirects to the page URL. Default used (feature parity). |
| Q11 | i18n namespace for v2 strings? | `AdminFeedbacksV2.*` with snake_case keys. Default used (matches every other `*-v2` namespace). |
| Q12 | Testing? | QC sanity pass only — no unit or E2E tests in this change. Separate QC iteration handles coverage. Default used. |

## Feature Branch

`feature/admin-feedbacks-v2` (to be created from `production` in the `lf-iq` repo, per project convention).
