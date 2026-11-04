# Tasks: Admin Reports V2 Redesign + Save-Without-Resend

Target repo: `lf-iq`
Feature branch: `feature/admin-reports-v2-redesign` (from `production`)
Most tasks are `[frontend]`. One BE verification task (Phase 7) is `[backend]`.

> **Hard gate:** Phase 0 must be user-approved before any Phase 1 code begins. Dev Lead should not create Phase 1+ Beads until the mockup is signed off.

> **SYNC STATUS (2026-04-22):** Phase 0 synced to Beads as `agentflow-1rm` (epic) + `agentflow-1rm.1` (task). Phases 1-8 are NOT yet synced — pending user approval of mockups from Phase 0. Dev Lead: sync Phases 1-8 only after user posts mockup approval.

---

## 0. Mockup Gate (user approval required before any code)

- [ ] 0.1 [frontend] [sonnet] Create `mockups/reports-v2/` folder with HTML mockup + README
  - Create `lf-iq/mockups/reports-v2/README.md` describing the mockup set, the mapping to `_v2/` components, and what each HTML file shows
  - Create `lf-iq/mockups/reports-v2/01-list.html` — list screen: header, stat strip (11 stat cards matching v1 metrics), toolbar (search, date range, status select, source select, clear, refresh), table rows using v2 card density, one row showing post-send-edit badge, bulk bar appearing with 2 selected rows, single-row status menu opened on one row
  - Create `lf-iq/mockups/reports-v2/02-detail-view.html` — detail screen in view mode: DetailHeader with title + status pill + edited-after-send badge + back button, ContactInfoCard (view state with Edit button), PropertyInfoCard (view state with Edit button), HomeValueCard / MortgageCard / CreditRatingCard / AgentCard read-only clones matching homeowners-v2
  - Create `lf-iq/mockups/reports-v2/03-contact-edit.html` — ContactInfoCard in edit mode with first_name / last_name / email / phone inputs, validation error example on email, footer showing `[Cancel]` (gray) + `[Save Only]` (gray) + `[Save & Resend]` (orange primary)
  - Create `lf-iq/mockups/reports-v2/04-property-edit.html` — PropertyInfoEditableCard in edit mode with address / beds / baths / sqft / year_built / lot_size, same save-button footer ( `[Cancel]` + `[Save Only]` + `[Save & Resend]` )
  - Create `lf-iq/mockups/reports-v2/05-both-buttons-always-visible.html` — reinforces that **both save buttons are always visible regardless of send history**. Show the same ContactInfoCard edit mode footer on a report that was **never sent** (no `SEND_MAIL` event): footer still displays `[Cancel]` + `[Save Only]` + `[Save & Resend]` (identical to 03/04); detail header has no edited-after-send badge. Annotate with a callout bubble: "Both buttons ALWAYS visible — the admin chooses whether to notify, regardless of whether the report has been sent before."
  - Create `lf-iq/mockups/reports-v2/06-post-send-edit-indicator.html` — list row and detail header both showing the amber "Edited after send" badge with hover tooltip "Edited on Apr 15, 2026"
  - Use inline CSS that mirrors the design.md token table exactly (orange-600 primary, rounded-12, border tokens). Use Tailwind CDN or handwritten CSS — either is fine for the mockup, as long as it matches visually.
  - Include in README a cross-reference table: "Mockup file → v2 component filename → acceptance criteria number"
  - **Acceptance:** 6 HTML files + README render in a browser cleanly, visual parity with homeowners-v2 + dashboard-v2 confirmed, all 6 screens cover success-criteria numbers 2-7 from proposal.md
  - **HARD GATE:** User must review and approve these mockups before any Phase 1 task is claimed. Dev Lead: do not unblock Phase 1 Beads until user posts approval.

---

## 1. Foundation Setup

- [ ] 1.1 [frontend] [haiku] Relocate existing v1 ReportsPage into `_v1/` folder
  - Move `src/app/[locale]/(admin)/admin/reports/page.tsx` body into `src/app/[locale]/(admin)/admin/reports/_v1/ReportsPage/index.tsx` verbatim (do NOT change logic)
  - Adjust relative imports as needed (the path to `homeowners/_components/Modal/ConfirmBulkDelete` and `homeowners/_components/Modal/TrackingDetailModal` will go one level deeper)
  - Leave `page.tsx` as an empty shell (will be rewritten in 1.3)
  - **Acceptance:** `_v1/ReportsPage/index.tsx` exports a default component identical in behavior to the old `page.tsx`. `npm run build` green. No runtime regressions when the shell re-exports `_v1` directly as an interim step.
  - **Depends on:** 0.1 (user approval of mockups)

- [ ] 1.2 [frontend] [haiku] Create v2 scaffolding folder + placeholder ReportsPage
  - Create `src/app/[locale]/(admin)/admin/reports/_v2/ReportsPage/index.tsx` exporting a default component that renders a placeholder `<div className="p-8">Reports V2 — scaffolding</div>`
  - Create `src/app/[locale]/(admin)/admin/reports/_v2/ReportDetailPage/index.tsx` exporting a default component that renders a placeholder `<div className="p-8">Report Detail V2 — scaffolding</div>`
  - Create empty `_v2/_components/` and `_v2/_hooks/` folders with `.gitkeep` placeholders
  - **Acceptance:** Files exist, TypeScript compiles, no runtime errors.
  - **Depends on:** 1.1

- [ ] 1.3 [frontend] [haiku] Wire `withUIVersion()` on the list route
  - Rewrite `src/app/[locale]/(admin)/admin/reports/page.tsx` to use `withUIVersion()` pattern exactly matching `admin/dashboard/page.tsx` and `admin/users/page.tsx`
  - `importV1` = `() => import('./_v1/ReportsPage')`
  - `importV2` = `() => import('./_v2/ReportsPage')`
  - Keep any existing `RouteGuard` / admin-role check wrapper
  - Export default the `withUIVersion()` result
  - **Acceptance:** Toggling `uiVersionAtom === 'v2'` shows the placeholder; `'v1'` shows the preserved v1 page. `npm run build` green. No regressions on v1.
  - **Depends on:** 1.2

- [ ] 1.4 [frontend] [haiku] Add `[id]` detail route with `withUIVersion()` wrapping
  - Create `src/app/[locale]/(admin)/admin/reports/[id]/page.tsx`
  - V1 import: tiny component that redirects back to `/admin/reports` (there is no v1 detail page today) — use `useRouter().replace()` in an effect, render null while redirecting
  - V2 import: `() => import('../_v2/ReportDetailPage')`
  - Wrap with `withUIVersion()`
  - Pass the `id` param through to v2 component via Next.js page props (`params: { id }`)
  - Keep admin role guard
  - **Acceptance:** `/admin/reports/<anyid>` in v1 mode redirects to `/admin/reports`. In v2 mode it renders the placeholder detail component with `id` prop.
  - **Depends on:** 1.2

- [ ] 1.5 [frontend] [haiku] Probe for existing `getReport(id)` helper
  - Read `src/apis/private-api.ts` and grep for a single-report-by-id helper
  - If found: document the name and signature in a code comment at the top of `_v2/_hooks/useReportDetail.ts` (to be created in Phase 3)
  - If not found: document in the comment that `useReportDetail` will call `getReports({ filter: 'id eq "<id>"', pageSize: 1, currentPage: 0 })` and extract `payload[0]`
  - Create `_v2/_hooks/useReportDetail.ts` as a stub that returns `{ report: null, loading: false, refetch: noop }` for now — real implementation in Phase 3
  - **Acceptance:** Decision documented in code comment; stub hook compiles.
  - **Depends on:** 1.2

---

## 2. List Screen V2

- [ ] 2.1 [frontend] [sonnet] Create `useReportsQuery` hook
  - Create `_v2/_hooks/useReportsQuery.ts`
  - Own: pagination state, search keyword, status filter, source filter, date range filter, URL-sync (via existing `useUrlParams`)
  - Expose: `{ data, total, loading, search, keyword, onSearchChange, onClearSearch, currentStatus, currentSource, dateRange, onStatusChange, onSourceChange, onDateRangeChange, onResetFilter, pagination, onPaginationChange, onRefresh }`
  - Behavior identical to v1 list state logic (debounced search at 500ms, URL-sync on state change, buildFilter helper for OData-style filter string — copy the existing `buildFilter` function into a shared util or inline in the hook)
  - Call `getReports()` whenever page/pageSize/keyword/filter changes
  - **Acceptance:** Hook returns the full state surface; behavior matches v1 (search debounce, filter composition, URL param sync). Under 250 lines.
  - **Depends on:** 1.3

- [ ] 2.2 [frontend] [sonnet] Create `useReportStatistics` hook
  - Create `_v2/_hooks/useReportStatistics.ts`
  - Fetch `getStatisticsSnapshot('REPORT')` on mount and expose `{ statistics, refresh }` with the same 11 keys as v1 (total, statusActive, statusInactive, statusAwaitingSend, statusProcessing, statusFailed, statusSpam, statusUnsubscribed, tagImported, tagCreated, rateAlert)
  - Handle error path with `notifyError` + `t('Notification.fetch_failed', { type: t('Noun.statistics') })`
  - **Acceptance:** Hook returns populated statistics on mount; exposes `refresh()` for refetch. Under 100 lines.
  - **Depends on:** 1.3

- [ ] 2.3 [frontend] [sonnet] Create `ReportsHeader` component
  - Create `_v2/_components/ReportsHeader.tsx`
  - Render: orange icon tile (IconReport), title `t('AdminReportsV2.title')`, subtitle `t('AdminReportsV2.subtitle')`
  - Tailwind classes only — match mockup file `01-list.html`
  - **Acceptance:** Renders per mockup. Under 60 lines.
  - **Depends on:** 0.1

- [ ] 2.4 [frontend] [sonnet] Create `ReportsStatStrip` component
  - Create `_v2/_components/ReportsStatStrip.tsx`
  - Render 11 stat cards matching the v1 stat cards with v2 styling from `dashboard-v2` stat cards (mirror visual treatment — do NOT copy v1's `Paper` components)
  - Props: `statistics`, `onTotalClick`, `onStatusClick(status)`, `onSourceClick(source)`
  - Click behavior matches v1: clicking a status card resets source and sets status; clicking a source card resets status and sets source
  - Use Tailwind-only styling — rounded-12 borders, per-status color tints matching design.md §2
  - **Acceptance:** All 11 stat cards render with correct click handlers. Visual parity with dashboard-v2 stat card pattern. Under 250 lines.
  - **Depends on:** 2.2

- [ ] 2.5 [frontend] [sonnet] Create `ReportsToolbar` component
  - Create `_v2/_components/ReportsToolbar.tsx`
  - Render: search input (with clear icon), date range picker, status Select, source Select, clear-filters button (conditional), refresh button
  - Props match `useReportsQuery` return shape
  - Layout: flex column on mobile, flex row on desktop; right-aligned filter group
  - **Acceptance:** All controls functional; clear button appears only when any filter is active. Under 200 lines.
  - **Depends on:** 2.1

- [ ] 2.6 [frontend] [sonnet] Create `ReportsBulkBar` component
  - Create `_v2/_components/ReportsBulkBar.tsx`
  - Visible only when `selectedRowsData.length > 0`
  - Renders: "Update Status ({n})" menu button (with status options matching v1 `CHANGEABLE_STATUSES`) + "Delete ({n})" red button
  - Props: `selectedCount`, `onBulkStatusChange(status)`, `onBulkDelete`
  - **Acceptance:** Appears/disappears correctly; invokes callbacks. Under 100 lines.
  - **Depends on:** 2.1

- [ ] 2.7 [frontend] [sonnet] Create `useEditedAfterSend` hook + shared badge
  - Create `_v2/_hooks/useEditedAfterSend.ts` returning `(report) => { wasEditedAfterSend: boolean, editedAtMs: number | null }`
  - Logic per design.md §1.5: find first `SEND_MAIL` in `calculate_actions`, compare timestamps safely with null guards; if no send timestamp available, fallback to `sendMailCount > 0 && last_modified_date !== created_date`
  - Create `_v2/_components/EditedAfterSendBadge.tsx` — amber badge with tooltip `t('AdminReportsV2.edited_on', { date })` and text `t('AdminReportsV2.edited_after_send')`
  - **Acceptance:** Hook handles null/missing fields without throwing. Badge renders only when `wasEditedAfterSend === true`. Under 100 lines each.
  - **Depends on:** 1.3

- [ ] 2.8 [frontend] [sonnet] Create `ReportRowSummary` component
  - Create `_v2/_components/ReportRowSummary.tsx`
  - Render for one row: property thumbnail (or `IMAGES.SYSTEMS.NO_IMAGE` fallback), full name (if owner.first_name + last_name present), email (if customer.email present), address (formatted via `concatFullAddress`), modified-date badge, created-date badge, source tag badge, rate-alert badge (if `metadata?.rate_alert_id`), **post-send-edit badge** (from `EditedAfterSendBadge`)
  - Null-guard every field — owner, customer, metadata, property_images, last_modified_date, created_date may all be null
  - **Acceptance:** Renders cleanly for reports with missing fields. Matches mockup `01-list.html` row. Under 200 lines.
  - **Depends on:** 2.7

- [ ] 2.9 [frontend] [sonnet] Create `ReportStatusMenu` component
  - Create `_v2/_components/ReportStatusMenu.tsx`
  - Single-row status change menu (badge + chevron that opens a menu with CHANGEABLE_STATUSES options)
  - FAILED status shows tooltip with `message` if present
  - Props: `status`, `message`, `onChange(newStatus)`
  - **Acceptance:** Behavior matches v1 single-row status menu; v2 styling; disabled-on-current-status. Under 150 lines.
  - **Depends on:** 2.1

- [ ] 2.10 [frontend] [sonnet] Create `ReportsTable` component
  - Create `_v2/_components/ReportsTable.tsx`
  - Wrap `GeneralTable` (mantine-react-table) with v2 columns: Summary (uses `ReportRowSummary`), Report Link (view + copy), Statistics (click → opens tracking-detail modal, same as v1), Status (uses `ReportStatusMenu`), Actions (audit-log icon + delete popover)
  - Row click (on anywhere but actions/status/link columns) navigates to `/admin/reports/${id}` — this is the new behavior enabling detail view
  - Reuse existing `AuditLogModal`, `TrackingDetailModal`, `ConfirmBulkDelete` via `useModal`
  - Props: full query + handlers from `useReportsQuery`, bulk handlers, delete handlers
  - **Acceptance:** All column behaviors match v1 plus new row-click navigation. Under 400 lines.
  - **Depends on:** 2.7, 2.8, 2.9

- [ ] 2.11 [frontend] [sonnet] Compose `_v2/ReportsPage/index.tsx`
  - Replace placeholder with full composition: `ReportsHeader` → `ReportsStatStrip` → `ReportsBulkBar` (if rows selected) → `ReportsToolbar` → `ReportsTable`
  - Wire `useReportsQuery` + `useReportStatistics` + row selection state + bulk operation handlers (reuse v1's `handleBulkDelete`, `handleBulkStatusChange`, `handleConfirmStatusChange` logic; port into this file or into a small helper)
  - Status-change confirmation modal matches v1 behavior
  - **Acceptance:** Full v1 feature parity in v2 visual language. All filters, search, date-range, bulk ops, audit logs, tracking detail work. Under 400 lines.
  - **Depends on:** 2.3, 2.4, 2.5, 2.6, 2.10

---

## 3. Detail Screen V2 (Read-Only)

- [ ] 3.1 [frontend] [sonnet] Implement `useReportDetail(id)` hook
  - Replace stub from 1.5 with real implementation per the decision documented in that task
  - Return `{ report, loading, error, refetch }`
  - Null-safe; sets `error` if report not found
  - **Acceptance:** Fetches a single report; exposes `refetch()`. Under 100 lines.
  - **Depends on:** 1.5

- [ ] 3.2 [frontend] [sonnet] Create `DetailHeader` component
  - Create `_v2/_components/DetailHeader.tsx`
  - Render: back button (→ `/admin/reports`), title (formatted address), status pill, `EditedAfterSendBadge` (if applicable), created-date + modified-date small-text
  - **Acceptance:** Renders per mockup `02-detail-view.html`. Under 120 lines.
  - **Depends on:** 2.7

- [ ] 3.3 [frontend] [sonnet] Clone read-only `HomeValueCard`, `MortgageCard`, `CreditRatingCard`, `AgentCard` from homeowners-v2
  - Path source: `src/app/[locale]/(private)/homeowners-v2/_components/PropertyDetailsCards/{HomeValueCard,MortgageCard,CreditRatingCard,AgentCard}.tsx`
  - Copy into `_v2/_components/PropertyDetailsReadOnly/*.tsx` — **view-mode only**, no edit affordances
  - Remove any edit buttons / edit state; keep the visual presentation identical
  - Null-guard every field access (homeowners-v2 versions may already do this — verify)
  - **Acceptance:** 4 read-only cards render with homeowners-v2 visual parity. No edit UI visible. Under 300 lines per file.
  - **Depends on:** 1.2

- [ ] 3.4 [frontend] [sonnet] Compose detail view-mode layout
  - Update `_v2/ReportDetailPage/index.tsx` to render `DetailHeader` + view-mode `ContactInfoCard` (placeholder for now — real editable version in Phase 4) + view-mode `PropertyInfoCard` (placeholder) + the 4 read-only cards from 3.3
  - Loading state: `LoaderLFIQ`
  - Error state: simple message + back button
  - **Acceptance:** Full detail layout matches mockup `02-detail-view.html`. Under 200 lines.
  - **Depends on:** 3.1, 3.2, 3.3

---

## 4. Edit Flow (Contact + Property Detail)

> **Blocked by Phase 7.0.** FE edit-flow coding cannot start until dev-be posts the definitive `[Save Only]` request shape (no `notification` param vs explicit `?notification=NULL`). Every task in this phase uses the shape from 7.0. Dev Lead: do not dispatch Phase 4 Beads until 7.0 is closed.

- [ ] 4.1 [frontend] [sonnet] Create `SaveWithResendButtons` shared component
  - Create `_v2/_components/SaveWithResendButtons.tsx`
  - Renders a footer row: `[Cancel]` (secondary gray) + `[Save Only]` (secondary gray) + `[Save & Resend]` (primary orange)
  - **Both `[Save Only]` and `[Save & Resend]` are ALWAYS rendered**, regardless of send history. There is no `wasEverSent` prop. There is no conditional hiding.
  - Props: `onCancel`, `onSaveOnly`, `onSaveAndResend`, `saving: 'none' | 'save-only' | 'save-and-resend'`, `disabled`
  - Label strings come from i18n: `t('AdminReportsV2.cancel')`, `t('AdminReportsV2.save_only')`, `t('AdminReportsV2.save_and_resend')`
  - Disable all buttons when either save is in-flight; show loading spinner on the active button
  - **Acceptance:** Button states behave per spec; matches mockups `03-contact-edit.html`, `04-property-edit.html`, and `05-both-buttons-always-visible.html`. Both save buttons always visible in every scenario. Under 100 lines.
  - **Depends on:** 0.1, 7.0

- [ ] 4.2 [frontend] [sonnet] Create `useReportEdit` hook
  - Create `_v2/_hooks/useReportEdit.ts`
  - Tracks: which card is in edit mode (`'contact' | 'property' | null`), saving state, submit handler
  - Expose: `{ editingCard, startEdit(card), cancelEdit(), submitEdit(body, withResend: boolean), saving }`
  - `submitEdit(body, withResend)` branches on `withResend`:
    - `withResend === true` → `updateReport(id, body, 'ALL')` → PATCH `?notification=ALL`
    - `withResend === false` → `updateReport(id, body, <shape-from-7.0>)` — the exact second argument (e.g. `undefined` for "no param" OR `'NULL'` for explicit `?notification=NULL`) is dictated by the definitive answer posted in Phase 7.0. Read 7.0's verification report and implement accordingly.
  - On success: `notifySuccess` with appropriate message (`t('AdminReportsV2.save_success')` for Save Only, `t('AdminReportsV2.save_and_resend_success')` for Save & Resend), exit edit mode, call `refetch()` from the detail hook
  - On error: `notifyError(extractErrorMessage(e, fallbackMessage))`, stay in edit mode
  - Do **not** derive or use a `wasEverSent` flag for gating buttons — both save buttons are always visible. The SEND_MAIL signal is only used by `useEditedAfterSend` for the post-send-edit badge.
  - **Acceptance:** Hook coordinates edit state across multiple cards (only one card in edit mode at a time). Second argument to `updateReport` for Save Only matches Phase 7.0's answer exactly. Under 150 lines.
  - **Depends on:** 2.7, 3.1, 7.0

- [ ] 4.3 [frontend] [sonnet] Create `ContactInfoCard` (editable)
  - Create `_v2/_components/ContactInfoCard.tsx`
  - View mode: labels + values for first_name, last_name, email, phone; Edit button top-right
  - Edit mode: `react-hook-form` form with four inputs (first_name, last_name, email, phone); joi validation (email format, phone format, non-empty name); on submit call `useReportEdit.submitEdit(body, withResend)` with a body shaped per the `updateReport` contract (verify shape by reading v1's `createReport` body pattern — the body should include the owner / customer substructure that BE expects; investigate and document in code comments)
  - Renders `SaveWithResendButtons` in footer (edit mode only) — **both `[Save Only]` and `[Save & Resend]` always visible**
  - Null-guard every displayed value
  - **Acceptance:** Card toggles view/edit modes; form validation works; both save buttons always visible; each calls the correct API path (Save Only uses the request shape from Phase 7.0). Matches mockup `03-contact-edit.html`. Under 300 lines.
  - **Depends on:** 4.1, 4.2, 7.0

- [ ] 4.4 [frontend] [sonnet] Create `PropertyInfoEditableCard`
  - Create `_v2/_components/PropertyInfoEditableCard.tsx`
  - View mode: clone visuals from homeowners-v2 `PropertyInfoCard`; add Edit button top-right
  - Edit mode: `react-hook-form` form with the editable subset from homeowners-v2 edit pattern (address fields: street, city, state, zip; beds, baths, sqft, year_built, lot_size). Mirror field list + validation from homeowners-v2's edit form — **do not** invent a new schema
  - Renders `SaveWithResendButtons` in footer (edit mode only) — **both `[Save Only]` and `[Save & Resend]` always visible**
  - **Acceptance:** Card toggles view/edit; fields match homeowners-v2 editable subset; both save buttons always visible; each calls the correct API path (Save Only uses the request shape from Phase 7.0). Matches mockup `04-property-edit.html`. Under 400 lines.
  - **Depends on:** 4.1, 4.2, 7.0

- [ ] 4.5 [frontend] [sonnet] Integrate editable cards into `ReportDetailPage`
  - Replace the view-mode placeholders from 3.4 with real `ContactInfoCard` and `PropertyInfoEditableCard`
  - Pass `editingCard`, `startEdit`, `cancelEdit`, `submitEdit`, `saving`, `refetch` through (do NOT pass any `wasEverSent` prop — both save buttons are always visible)
  - After successful save: `refetch()` the detail → DetailHeader's post-send-edit badge appears if applicable
  - **Acceptance:** End-to-end edit flow works: click Edit → change field → `[Save Only]` → toast → card returns to view mode with new value → edited-after-send badge appears on DetailHeader if applicable. `[Save & Resend]` path works identically plus fires notification. **Both buttons appear in every edit session**, including on reports with no SEND_MAIL history.
  - **Depends on:** 4.3, 4.4

---

## 5. Post-Send Edit Indicator on List

- [ ] 5.1 [frontend] [haiku] Verify badge rendering on list rows
  - Already wired in 2.8 via `ReportRowSummary` + `EditedAfterSendBadge`
  - Manual verification: seed (or request from dev) two reports — one sent + edited, one sent + unedited — confirm badge appears only on the edited-after-send row
  - If data shape for SEND_MAIL timestamp differs from the assumed shape in `useEditedAfterSend`, fix the hook and re-verify
  - **Acceptance:** Badge appears only on rows where `last_modified_date > first SEND_MAIL timestamp`. Fallback signal works when per-event timestamp unavailable.
  - **Depends on:** 2.11

- [ ] 5.2 [frontend] [haiku] Verify badge rendering on DetailHeader
  - Already wired in 3.2 + 4.5; manual verification in dev environment
  - **Acceptance:** Badge appears on detail header when applicable; disappears when editing a report that was never sent.
  - **Depends on:** 4.5

---

## 6. i18n (All 7 Locales)

- [ ] 6.1 [frontend] [haiku] Add `AdminReportsV2.*` namespace to `en.json`
  - Keys to add (snake_case values, English strings):
    - `title` — "Reports Management"
    - `subtitle` — "Manage, review, and correct homeowner reports"
    - `total_reports` — "Total Reports"
    - `edit_contact` — "Edit Contact"
    - `edit_property_details` — "Edit Property Details"
    - `save_only` — "Save Only"
    - `save_and_resend` — "Save & Resend"
    - `cancel` — "Cancel"
    - `edited_after_send` — "Edited after send"
    - `edited_on` — "Edited on {date}"
    - `save_success` — "Changes saved"
    - `save_and_resend_success` — "Changes saved and notification sent"
    - `save_failed` — "Failed to save changes"
    - `no_reports_found` — "No reports found"
    - `back_to_reports` — "Back to Reports"
    - `contact_info` — "Contact Info"
    - `property_info` — "Property Info"
    - `home_value` — "Home Value"
    - `mortgage` — "Mortgage"
    - `credit_rating` — "Credit Rating"
    - `agent` — "Agent"
    - `first_name` — "First Name"
    - `last_name` — "Last Name"
    - `email` — "Email"
    - `phone` — "Phone"
    - `validation_email_invalid` — "Please enter a valid email"
    - `validation_phone_invalid` — "Please enter a valid phone number"
    - `validation_required` — "This field is required"
  - Confirm `snake_case` keys in `CamelCase` namespace per project i18n rules
  - **Acceptance:** `en.json` updated with the `AdminReportsV2` block; JSON is valid; no key collisions.
  - **Depends on:** 4.5

- [ ] 6.2 [frontend] [haiku] Add translations to `es.json`, `vi.json`, `zh.json`, `he.json`, `ko.json`, `ar.json`
  - Translate every key added in 6.1 for all 6 remaining locales
  - Use the existing entries in each file as style references (capitalization, punctuation conventions per locale)
  - **Acceptance:** All 6 locale files contain the full `AdminReportsV2` namespace; all JSON files valid; `npm run build` green.
  - **Depends on:** 6.1

- [ ] 6.3 [frontend] [haiku] Grep for hardcoded strings in `_v2/` folder
  - Run `grep -rnE '>"[A-Z]' src/app/\[locale\]/\(admin\)/admin/reports/_v2/ ; grep -rnE "placeholder='[A-Z]" src/app/\[locale\]/\(admin\)/admin/reports/_v2/`
  - Ensure every user-visible string goes through `useTranslations()`
  - Exceptions (e.g. date formatting strings, URL slugs, API filter keys) must be comment-documented
  - **Acceptance:** No hardcoded UI text; every string wrapped in `t(...)`.
  - **Depends on:** 6.2

---

## 7. Backend Verification (No Code Changes)

> **7.0 is a hard gate for Phase 4.** Dev-be MUST post the definitive answer before any Phase 4 FE code begins. 7.1 and 7.2 continue existing verification work; all of Phase 7 can run in parallel with Phases 1–3, but 7.0 specifically blocks Phase 4.

- [ ] 7.0 [backend] [sonnet] Confirm Save-Only request shape (BLOCKS Phase 4 and all other Phase 7 subtasks)
  - **Question to answer definitively:** When FE clicks `[Save Only]`, which request shape does the backend accept / expect?
    - **Option A:** No `notification` param at all → URL: `PATCH /reports/{id}` (body only)
    - **Option B:** Explicit `?notification=NULL` → URL: `PATCH /reports/{id}?notification=NULL`
    - **Option C:** Both work identically
  - **Protocol (execute in order):**
    1. Read `lfiq-backend/.../ReportController.java:65` — inspect the `@PatchMapping` signature. Is `notification` a required `@RequestParam` or `@RequestParam(required=false)`? Is there a default value? Record the exact annotation and type in the verification report.
    2. Read `lfiq-backend/.../ReportFacadeImpl.java:125` — trace how the facade branches on `notificationType`. Specifically: what happens when `notificationType == null` vs when the string literal `"NULL"` is passed vs when the enum value is missing? Does any code path convert the string `"NULL"` to a null reference or to an enum?
    3. If possible, test both request shapes against a local instance:
       - `curl -X PATCH http://localhost:8080/reports/{id} -d '{...}'` (Option A)
       - `curl -X PATCH 'http://localhost:8080/reports/{id}?notification=NULL' -d '{...}'` (Option B)
       Record HTTP status and observable side effects for each.
    4. If local testing is not possible, reason from the code and state the reasoning explicitly.
  - **Output — post as Beads comment on this task:**
    - **Definitive answer:** Option A / B / C
    - **Recommended FE call:** exact `updateReport(id, body, <value>)` signature (e.g. `updateReport(id, body)` with no third arg, OR `updateReport(id, body, 'NULL')`)
    - **Evidence:** file paths + line numbers + annotation text + curl output (if tested)
    - **Gotchas:** any case where the wrong shape produces a silent 200 but skips the audit log, or produces a 400, or fires notifications unexpectedly
  - **Acceptance:** Verification report posted with definitive answer + evidence. FE and design.md can now commit to exactly one request shape. This unblocks Phase 4.
  - **Depends on:** none (runs in parallel with Phase 1–3)
  - **BLOCKS:** 4.1, 4.2, 4.3, 4.4, 7.1, 7.2

- [ ] 7.1 [backend] [sonnet] Verify `PATCH /reports/{reportId}` (Save-Only shape from 7.0) has no side effects
  - Using the exact request shape confirmed in 7.0 (Option A, B, or C), verify that calling `PATCH /reports/{reportId}` without triggering notifications:
  - Confirm the facade skips **all** of:
    - (a) No status flip — status field is **not** implicitly changed when the body does not include a new `status` value
    - (b) Email send — not fired
    - (c) Device push — not fired
    - (d) SMS send — not fired
    - (e) Tracking counter increment (SEND_MAIL event append) — not fired
  - Confirm that an **audit-log entry IS still written** for the edit (the audit-log write should be outside the notification branch)
  - If any assertion fails, file a bug with specific file/line and suggest the minimal fix (do not implement the fix in this change — file it as a separate BE task)
  - Produce a short written verification report in this Beads comment: one line per checked item with PASS/FAIL + evidence file/line
  - **Acceptance:** All 5 side-effect categories verified PASS or bugs filed with specifics. Audit-log verified PASS. Report posted on this Beads item.
  - **Depends on:** 7.0

- [ ] 7.2 [backend] [haiku] Verify behavior with `?notification=ALL`
  - Confirm the existing send-all path fires email + device + SMS and appends a SEND_MAIL event to tracking
  - Confirm the PATCH body update is committed **before** notifications fire (so that the notification content reflects the new data, not the old data)
  - **Acceptance:** Behavior confirmed; one-line PASS/FAIL report with evidence file/line.
  - **Depends on:** 7.0, 7.1

---

## 8. QC / Tests / Build Gate

- [ ] 8.1 [frontend] [haiku] TypeScript strict pass
  - Run `npx tsc --noEmit` at repo root
  - Fix any type errors introduced by the change
  - **Acceptance:** `tsc --noEmit` exits 0.
  - **Depends on:** 4.5, 6.2

- [ ] 8.2 [frontend] [haiku] `npm run build` gate
  - Run `npm run build`
  - Fix any build errors (including ESLint / stylelint failures caught by the pre-commit hook config)
  - **Acceptance:** `npm run build` exits 0.
  - **Depends on:** 8.1

- [ ] 8.3 [frontend] [sonnet] V1 regression sanity pass
  - Manually verify v1 `/admin/reports` page still works end-to-end (flip `uiVersionAtom` to `'v1'` and exercise every control: search, filters, bulk ops, audit-log modal, tracking-detail modal, copy link, pagination)
  - Pay special attention to imports that may have broken when v1 moved into `_v1/` (e.g. relative paths to `homeowners/_components/Modal/*`)
  - **Acceptance:** Zero v1 regressions.
  - **Depends on:** 1.1, 8.2

- [ ] 8.4 [frontend] [sonnet] V2 list parity pass
  - Flip `uiVersionAtom` to `'v2'`. Exercise every control and verify 1:1 feature parity with v1: search, date-range, status filter, source filter, status stat-card click, source stat-card click, bulk status change (single + bulk), bulk delete, single-row status menu, copy link, audit-log modal, tracking-detail modal, pagination, URL-param sync
  - **Acceptance:** Every v1 feature works in v2. No behavioral regressions.
  - **Depends on:** 2.11, 8.2

- [ ] 8.5 [frontend] [sonnet] V2 edit flow end-to-end pass
  - Exercise: view detail → edit Contact → change email to invalid → see validation error → fix → `[Save Only]` → verify no email received, tracking counters unchanged, audit-log entry written, detail refetched with new email. Repeat with `[Save & Resend]` → verify email received, tracking counter incremented.
  - Exercise same flow on Property Detail.
  - **Verify both save buttons are visible in EVERY edit session**, including on reports with no SEND_MAIL history (the old "hide Save & Resend when never sent" behavior must NOT exist).
  - Verify "Edited after send" badge appears on list + detail after a save that occurs post-first-send.
  - Verify `[Save Only]` sends the exact request shape confirmed in Phase 7.0 (inspect browser DevTools Network tab to confirm the URL matches Option A/B/C).
  - **Acceptance:** End-to-end Save Only + Save & Resend work correctly for both editable cards. Both buttons visible in every edit session. Post-send-edit indicator appears/disappears correctly. Request shape matches 7.0's definitive answer.
  - **Depends on:** 4.5, 5.1, 5.2, 7.1

- [ ] 8.6 [frontend] [sonnet] Visual mockup-parity review
  - Side-by-side compare: each mockup HTML vs the rendered v2 UI. Flag any deviations (spacing, color, typography, layout)
  - Fix deviations in code (not mockups)
  - **Acceptance:** V2 visually matches mockups and homeowners-v2 + dashboard-v2 reference surfaces.
  - **Depends on:** 4.5, 0.1

---

## Dispatch Notes for Dev Lead

- **Phase 0 is a hard gate** — Dev Lead must not create Beads for Phase 1+ until the user approves the mockups from Phase 0.
- **Phase 7.0 is a hard gate for Phase 4** — dev-be MUST post the definitive Save-Only request shape (Option A / B / C) before any Phase 4 Bead can be dispatched. 7.0 runs in parallel with Phases 1–3.
- Phase 7.1 and 7.2 (remaining BE verification) can run in parallel with Phases 2–4 (FE list + edit work) once 7.0 is closed.
- Phase 6 (i18n) should run in parallel with Phase 8 (QC) but 6.1 must land before 8.1 (TypeScript needs the keys to exist).
- Each `[sonnet]` task is a typical single-commit DEV branch. `[haiku]` tasks are small scaffolding / verification tasks.
- Every task branch is `agent/<bead-id>-<short-desc>`, branched FROM and merged INTO `feature/admin-reports-v2-redesign`.

### Updated Dependency Graph (key cross-phase edges)

```
0.1 (mockup approval) ──▶ 1.1 ──▶ 1.2 ──▶ 1.3 ──▶ 2.* ──▶ 3.* ───┐
                                                                   ▼
7.0 (BE Save-Only shape) ──────────────────────────────────▶ 4.1 ──▶ 4.2 ──▶ 4.3 / 4.4 ──▶ 4.5 ──▶ 5.* ──▶ 8.5
                          └─▶ 7.1 ──▶ 7.2 ──▶ 8.5
6.1 ──▶ 6.2 ──▶ 6.3 ──▶ 8.1 ──▶ 8.2 ──▶ 8.3 / 8.4 / 8.6
```
