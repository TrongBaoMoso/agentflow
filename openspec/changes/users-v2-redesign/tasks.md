# Tasks: users-v2-redesign

Ordered, self-contained implementation tasks. Each task contains all the context a DEV agent needs — no need to read `proposal.md` or `design.md`.

Task status legend: `[ ]` pending, `[x]` done.

Model legend: `[opus]` complex design/multi-module, `[sonnet]` standard, `[haiku]` trivial.

---

## 1. Mockup Phase (Approval Gate)

- [ ] 1.1 [frontend] [sonnet] **[GATE]** Create 3 HTML mockup variants for the users-v2 page

  **Goal**: Produce three distinct visual directions (Dashboard-v2, Bento editorial, Swiss minimal) as standalone HTML files so the user can pick exactly one winner before React implementation starts.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-a/index.html`
  - `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-b/index.html`
  - `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-d/index.html`

  **Each file must render the full-page state (~800 lines)**:
  1. Top filter bar: search input, role tabs (All / Loan Officer / Realtor / HomeOwner), source dropdown, status dropdown, loginStatus dropdown, date_range_created_at picker, view toggle (card ⇄ list).
  2. 7 stat cards: Total Users, Active, Inactive, LO, Realtor, HomeOwner, New This Month (use mock numbers).
  3. Card grid: 3 LO + 2 Realtor + 3 HO (8 total) with role-appropriate fields; include `active_user_badge` on any user with `login_count >= 2` and granular source badges (Self Signup / Invited / Imported / Seed Data / Other).
  4. Row list section: same 8 users rendered as compact rows (avatar, name, role chip, status, source badge, last_login, report_count, login_count, action menu trigger).
  5. Drawer open state: anchored right, showing one LO user's profile detail (personal_email, full licensed_states list, lf_company_domain_url, lf_personal_domain_url, company_domain_url, audit log preview, action buttons: Login As / Edit / Reassign LO / Delete).
  6. Bulk action bar in "3 selected" state with: Export CSV, Export Excel, Deactivate, Delete, Send invite (HO).
  7. Pagination footer: Prev / page numbers / Next / jump-to-page input / "Showing 1–30 of 847".

  **Variant direction**:
  - **variant-a (Dashboard-v2 style)**: Balanced cards on a light surface, subtle shadows, horizontal stat row, generous padding. Match `dashboard-v2` surface treatment.
  - **variant-b (Bento editorial)**: Asymmetric grid for stat cards with varying heights, larger hero stat, accent orange splash, magazine-style hierarchy. User cards use a uniform grid.
  - **variant-d (Swiss minimal)**: Tight grid, hairline dividers, monochrome with orange only on actions and active states, Inter with precise vertical rhythm, almost no shadows.

  **Palette (all variants)**:
  - Brand: `brand-50 #FFF7ED`, `brand-100 #FFEDD5`, `brand-500 #F97316`, `brand-600 #EA580C`, `brand-700 #C2410C`
  - Ink: `ink-900 #0F172A`, `ink-700 #334155`, `ink-500 #64748B`, `ink-300 #CBD5E1`, `ink-100 #F1F5F9`, `ink-50 #F8FAFC`
  - Success: `success-500 #10B981`, `success-100 #D1FAE5`
  - Warning: `warning-500 #F59E0B`, `warning-100 #FEF3C7`
  - Danger: `danger-500 #EF4444`, `danger-100 #FEE2E2`
  - Info: `info-500 #3B82F6`, `info-100 #DBEAFE`
  - Source badges: Self Signup `#DBEAFE / #1D4ED8`, Invited `#FFEDD5 / #C2410C`, Imported `#E0E7FF / #4338CA`, Seed Data `#F3E8FF / #7E22CE`, Other `#F1F5F9 / #334155`

  **Shadows**: `shadow-xs 0 1px 2px rgba(15,23,42,0.04)`, `shadow-sm 0 2px 6px rgba(15,23,42,0.06)`, `shadow-md 0 8px 24px rgba(15,23,42,0.08)`, `shadow-lg 0 16px 40px rgba(15,23,42,0.10)`. Radii: card `16px`, chip `9999px`, input `10px`.

  **Typography**: Inter from Google Fonts (weights 400/500/600/700/800). Page title 28/700, card title 16/600, body 14/500, caption 12/500, stat number 32/700. All text color `ink-900` or `ink-700` unless noted.

  **Tech constraints**:
  - Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
  - Inter via Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`.
  - Inline mock data only — no network calls.
  - Single file per variant, ~800 lines.
  - Light mode only.
  - Vanilla JS allowed for drawer open/close and view toggle interaction if needed.

  **Acceptance criteria**:
  - [ ] All 3 files exist at the paths above.
  - [ ] Each file opens in a browser and renders the full-page state without errors.
  - [ ] Each variant is visibly distinct in layout and rhythm (not just color swaps).
  - [ ] All 7 sections (filter bar, stat cards, card grid, row list, drawer, bulk bar, pagination) are present in every variant.
  - [ ] Drawer open state is visible by default (so the user can evaluate it without clicking).
  - [ ] Bulk action bar visible by default in "3 selected" state.
  - [ ] User approves exactly one variant before any Phase 2 task starts.

  **Dependencies**: none. This is Task 1.

  **Blocks**: Tasks 2–12.

---

## 2. i18n Skeleton

- [ ] 2.1 [frontend] [haiku] Add `AdminUsersV2` namespace keys to all 7 locale files

  **Goal**: Create the i18n key structure up-front so component tasks can reference keys without hunting for locations.

  **Files (modify)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/en.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/vi.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/es.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/ko.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/ar.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/zh.json`
  - `/Users/apple/Projects/agentflow/lf-iq/src/messages/he.json`

  **Key list (under `AdminUsersV2` namespace, snake_case)**:

  ```
  page_title: "Users"
  page_subtitle: "Manage loan officers, realtors, and homeowners"

  filter_search_placeholder: "Search by name or email"
  filter_role_all: "All"
  filter_role_lo: "Loan Officer"
  filter_role_realtor: "Realtor"
  filter_role_ho: "HomeOwner"
  filter_source_label: "Source"
  filter_source_self_signup: "Self Signup"
  filter_source_invited: "Invited"
  filter_source_imported: "Imported"
  filter_source_seed_data: "Seed Data"
  filter_source_other: "Other"
  filter_status_label: "Status"
  filter_status_active: "Active"
  filter_status_inactive: "Inactive"
  filter_login_status_label: "Login"
  filter_login_status_ever: "Ever logged in"
  filter_login_status_never: "Never logged in"
  filter_date_range_label: "Created at"
  filter_date_range_from: "From"
  filter_date_range_to: "To"
  filter_clear: "Clear filters"

  view_toggle_card: "Card view"
  view_toggle_list: "List view"

  sort_label: "Sort by"
  sort_name_asc: "Name A–Z"
  sort_name_desc: "Name Z–A"
  sort_created_at_desc: "Newest"
  sort_created_at_asc: "Oldest"
  sort_last_login_desc: "Most recent login"
  sort_last_login_asc: "Least recent login"
  sort_login_count_desc: "Most logins"
  sort_login_count_asc: "Fewest logins"
  sort_report_count_desc: "Most reports"
  sort_report_count_asc: "Fewest reports"
  sort_status: "Status"

  stat_total_users: "Total Users"
  stat_active: "Active"
  stat_inactive: "Inactive"
  stat_lo: "Loan Officers"
  stat_realtor: "Realtors"
  stat_ho: "HomeOwners"
  stat_new_this_month: "New This Month"

  badge_active_user: "Active user"
  badge_licensed_states: "{count} states"
  badge_status_active: "Active"
  badge_status_inactive: "Inactive"

  card_label_nmls: "NMLS"
  card_label_reports: "Reports"
  card_label_homeowners: "Homeowners"
  card_label_logins: "Logins"
  card_label_last_login: "Last login"
  card_label_last_login_never: "Never"
  card_label_working_with_lo: "Working with"
  card_label_invited_by: "Invited by"

  drawer_tab_profile: "Profile"
  drawer_tab_audit: "Audit"
  drawer_tab_actions: "Actions"
  drawer_label_personal_email: "Personal email"
  drawer_label_company_email: "Company email"
  drawer_label_licensed_states: "Licensed states"
  drawer_label_lf_company_domain: "LF company domain"
  drawer_label_lf_personal_domain: "LF personal domain"
  drawer_label_company_domain: "Company domain"
  drawer_label_audit_log: "Audit log"
  drawer_action_login_as: "Login As"
  drawer_action_edit: "Edit"
  drawer_action_reassign_lo: "Reassign LO"
  drawer_action_delete: "Delete"
  drawer_action_send_invite: "Send invite"
  drawer_close: "Close"

  bulk_selected_count: "{count} selected"
  bulk_clear_selection: "Clear selection"
  bulk_export_csv: "Export CSV"
  bulk_export_excel: "Export Excel"
  bulk_deactivate: "Deactivate"
  bulk_delete: "Delete"
  bulk_send_invite: "Send invite"
  bulk_confirm_deactivate_title: "Deactivate {count} users?"
  bulk_confirm_deactivate_body: "These users will not be able to log in until reactivated."
  bulk_confirm_delete_title: "Delete {count} users?"
  bulk_confirm_delete_body: "This action cannot be undone. Type DELETE to confirm."
  bulk_confirm_cancel: "Cancel"
  bulk_confirm_ok: "Confirm"

  pagination_prev: "Previous"
  pagination_next: "Next"
  pagination_showing: "Showing {from}–{to} of {total}"
  pagination_jump_to: "Go to page"

  empty_title: "No users match these filters"
  empty_body: "Try clearing filters or widening the date range."

  error_title: "Something went wrong"
  error_body: "We could not load users. Please try again."
  error_retry: "Retry"

  unknown_user: "Unknown user"
  ```

  **Acceptance criteria**:
  - [ ] All 7 locale files contain the `AdminUsersV2` namespace with every key above.
  - [ ] Key structures are identical across files (no missing keys in any language).
  - [ ] English file uses the strings above verbatim.
  - [ ] Non-English files use the English string as a placeholder (translation is out of scope for this change).
  - [ ] A follow-up ticket is filed titled "Translate AdminUsersV2 namespace for 6 non-English locales".
  - [ ] `npm run build` still succeeds after the changes.

  **Dependencies**: 1.1.

---

## 3. Route Skeleton

- [ ] 3.1 [frontend] [sonnet] Create the `users-v2` route with admin guard

  **Goal**: Ship a new route `/admin/users-v2` that renders an empty `UserListV2Page` container gated by the existing admin auth guard pattern.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/page.tsx`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserListV2Page.tsx`

  **Instructions**:
  - Read `lf-iq/src/app/[locale]/(admin)/admin/users/page.tsx` to understand the existing admin guard pattern and metadata setup. Mirror that exactly.
  - `page.tsx` should set the route metadata (use `AdminUsersV2.page_title` via the server-side `getTranslations` helper) and render `<UserListV2Page />`.
  - `UserListV2Page.tsx` is a client component (`'use client'`) that for now renders a single `<main>` with the page title and a placeholder body. It will be filled in by later tasks.

  **Acceptance criteria**:
  - [ ] Visiting `/admin/users-v2` as an admin user renders the placeholder page without errors.
  - [ ] Visiting as a non-admin user is redirected or blocked by the same guard used on `/admin/users`.
  - [ ] Page title uses `t('page_title')` from the `AdminUsersV2` namespace.
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title` used.
  - [ ] No inline `style={{}}`.
  - [ ] `npm run build` passes.

  **Dependencies**: 1.1, 2.1.

---

## 4. Stat Cards

- [ ] 4.1 [frontend] [sonnet] Implement `UserStatCardsV2` with click-to-filter wiring

  **Goal**: Render the 7 stat cards (Total, Active, Inactive, LO, Realtor, HO, New This Month) at the top of the page. Clicking a stat card applies the corresponding filter.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserStatCardsV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — mount `<UserStatCardsV2 />` at the top.

  **Instructions**:
  - Call `useGetStatisticsSnapshot()` (existing hook; grep `lf-iq/src/hooks` or similar to locate).
  - Render 7 cards laid out per the approved mockup variant.
  - Each card: label via `t('stat_*')`, number from snapshot data, optional delta/trend if available.
  - Clicking a role card (LO / Realtor / HO) sets the role filter atom.
  - Clicking Active / Inactive sets the status filter atom.
  - Clicking New This Month sets `date_range_created_at` to the current month.
  - Use Tailwind utilities for layout, `brand-500` for the active-card accent, ink scale for text.
  - Use optional chaining on all snapshot fields (`snapshot?.active_count ?? 0`).

  **Acceptance criteria**:
  - [ ] 7 cards render with live data from `useGetStatisticsSnapshot`.
  - [ ] Clicking a card applies the matching filter and the card shows an active visual state.
  - [ ] Loading and error states are handled (skeleton on load, retry button on error).
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 3.1.

---

## 5. Filter Bar

- [ ] 5.1 [frontend] [sonnet] Implement `UserFilterBarV2` with all 6 filters

  **Goal**: Render search + role tabs + source dropdown + status dropdown + loginStatus dropdown + new date_range_created_at picker + sort dropdown + view toggle.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserFilterBarV2.tsx`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserViewToggleV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — mount `<UserFilterBarV2 />` below the stat cards.

  **Instructions**:
  - Reflect all filter state in URL search params (`role`, `source`, `status`, `loginStatus`, `created_at_from`, `created_at_to`, `sort`, `page`).
  - Search input debounced at 300ms using a small custom hook or `useDebouncedValue` from Mantine hooks.
  - Role tabs: All / LO / Realtor / HO, using `brand-500` underline for the active tab.
  - Source / Status / LoginStatus: Mantine `Select` with tokens styled via Tailwind wrapper.
  - Date range: Mantine `DatePickerInput` with `type="range"` from `@mantine/dates`. Sends `created_at_from` (YYYY-MM-DD) and `created_at_to` (YYYY-MM-DD) to the query.
  - Sort dropdown options matching `sort_*` keys; default `loginCount,desc`.
  - View toggle (`UserViewToggleV2`): two-button segmented control bound to `userV2ViewModeAtom`.
  - Clear filters button resets all params except sort/page.
  - Use optional chaining on every URL param read (`searchParams?.get('role') ?? undefined`).

  **Acceptance criteria**:
  - [ ] All filters update URL search params and trigger a refetch.
  - [ ] Copying the URL and opening in a new tab reproduces the filter state.
  - [ ] Search debounced; no request on every keystroke.
  - [ ] Date range picker renders in the approved variant style.
  - [ ] View toggle persists across sessions (atomWithStorage).
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 3.1, 4.1.

---

## 6. User Card and Row

- [ ] 6.1 [frontend] [opus] Implement `UserCardV2` and `UserRowV2` (role-aware)

  **Goal**: Build one role-aware card component and one row component that render LO / Realtor / HO variants via a `role` prop. Wire them to the data returned by `useGetUsersByFilter`.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserCardV2.tsx`
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserRowV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — conditionally render card grid or row list based on `userV2ViewModeAtom`; include a checkbox column/header for multi-select wired to `userV2SelectedIdsAtom`.

  **Field plan**:

  LO card:
  - avatar, full_name, status_badge, source_badge (granular), company_email, NMLS, last_login_time, stats triplet (report_count / homeowner_count / login_count), licensed_states_count badge, active_user_badge (login_count >= 2).

  Realtor card:
  - Same as LO minus NMLS, plus `realtor_working_with_lo`.

  HO card:
  - avatar, full_name, status_badge, source_badge (color-coded), email, last_login_time, stats pair (report_count / login_count), `ho_working_with_lo`, `invited_by`.

  Row (all roles):
  - checkbox, avatar, name, role chip, status, source_badge, last_login, report_count, login_count, ActionMenu.

  **Instructions**:
  - Card component signature: `UserCardV2({ user, role, selected, onSelectChange, onOpenDrawer })`.
  - Keep shared layout (header with avatar + name + status, footer with actions) outside the role switch.
  - Role-specific fields live in a single switch block inside the card body.
  - Show `active_user_badge` whenever `user?.login_count ?? 0 >= 2`.
  - Show `licensed_states_count` badge for LO; clicking the badge opens the drawer on the Profile tab.
  - Clicking the card body opens the drawer. Clicking the checkbox toggles selection.
  - Use fallback defaults for every rendered field (`user?.full_name ?? t('unknown_user')`, `user?.last_login_time ? formatRelative(…) : t('card_label_last_login_never')`).
  - Use Tabler Icons for role and action icons.
  - Use Tailwind classes sized to match the approved variant.
  - `UserRowV2` signature: `UserRowV2({ user, selected, onSelectChange, onOpenDrawer })`. Infer role from `user.role`.

  **Acceptance criteria**:
  - [ ] LO / Realtor / HO cards each render their correct field set.
  - [ ] Row view renders the compact row for any role.
  - [ ] Active user badge appears for users with `login_count >= 2`.
  - [ ] Source badges use the granular palette from the design tokens.
  - [ ] Checkbox selection wires to `userV2SelectedIdsAtom`.
  - [ ] Clicking card/row body opens the drawer.
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] Component file stays under 500 lines (split field renderers if needed).
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 3.1, 4.1, 5.1.

---

## 7. Detail Drawer

- [ ] 7.1 [frontend] [opus] Implement `UserDetailDrawerV2` with tabs and actions

  **Goal**: A Mantine `Drawer` anchored right with three tabs (Profile / Audit / Actions). Actions include Login As, Edit, Reassign LO (LO only), Delete, Send invite (HO only).

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserDetailDrawerV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — mount `<UserDetailDrawerV2 />` and wire open/close to `userV2DrawerStateAtom`.

  **Instructions**:
  - Drawer width ~520px, position right, closeOnClickOutside, closeOnEscape.
  - Tabs: Profile, Audit, Actions — controlled by `userV2DrawerStateAtom.tab`.
  - Profile tab shows:
    - LO: card fields + personal_email, full `licensed_states` list (chip grid), `lf_company_domain_url`, `lf_personal_domain_url`, `company_domain_url`.
    - Realtor: card fields + personal_email, `realtor_working_with_lo` (LO name + link).
    - HO: card fields + email, `ho_working_with_lo`, `invited_by`.
  - Audit tab shows an audit log list (reuse existing audit log component / API if present; otherwise display "No audit data available").
  - Actions tab shows 4–5 buttons wired to existing endpoints:
    - Login As → existing `loginAs` endpoint; on success open a new tab with the user's session.
    - Edit → navigates to the existing edit page or opens an existing edit modal.
    - Reassign LO (LO only) → opens existing reassign flow if available; otherwise follow-up ticket.
    - Delete → opens confirmation modal (typed-to-confirm), calls delete endpoint, invalidates query, closes drawer.
    - Send invite (HO only) → calls invite endpoint if it exists, otherwise disabled with tooltip referencing the follow-up ticket.
  - Every external field uses optional chaining with fallback defaults.

  **Acceptance criteria**:
  - [ ] Drawer opens when a card/row is clicked, closes on Esc or outside click.
  - [ ] Correct fields render per role on the Profile tab.
  - [ ] Action buttons trigger existing endpoints and show success/error feedback.
  - [ ] Delete shows typed-to-confirm modal before firing.
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 6.1.

---

## 8. Bulk Action Bar

- [ ] 8.1 [frontend] [opus] Implement `UserBulkActionBarV2` with 5 actions

  **Goal**: A floating action bar that appears when `userV2SelectedIdsAtom` has 1+ ids. Actions: Export CSV, Export Excel, Deactivate, Delete, Send invite (HO only).

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserBulkActionBarV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — mount `<UserBulkActionBarV2 />` at the page level.

  **Instructions**:
  - Bar appears fixed at the bottom of the viewport when selection is non-empty.
  - Shows "{count} selected" with a clear-selection button.
  - Export CSV: client-side; encode the selected users (pull from current page data) to CSV and trigger a download. Columns: id, name, email, role, status, source, last_login, login_count, report_count, created_at.
  - Export Excel: check if `xlsx` is in `lf-iq/package.json`. If yes, implement; if no, disable the button with a tooltip and file a follow-up ticket.
  - Deactivate: open confirmation modal (`bulk_confirm_deactivate_*` keys); on confirm, call `Promise.all` of per-user status update; invalidate query; clear selection; show toast summary.
  - Delete: open typed-to-confirm modal (`bulk_confirm_delete_*` keys, type "DELETE"); on confirm, `Promise.all` per-user delete; invalidate query; clear selection; show toast summary.
  - Send invite: only shown when selection is all-HO. If invite endpoint missing, disable with tooltip pointing to follow-up ticket.
  - Use optional chaining on selection state (`selectedIds?.size ?? 0`).

  **Acceptance criteria**:
  - [ ] Bar appears/disappears based on selection state.
  - [ ] CSV download works client-side; file opens correctly in a spreadsheet app.
  - [ ] Deactivate and Delete apply to all selected, show progress/toast, clear selection on success.
  - [ ] Send invite button visibility rule enforced (all-HO selection only).
  - [ ] Excel button either works or is disabled with a clear tooltip and linked ticket.
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 6.1, 7.1.

---

## 9. Pagination

- [ ] 9.1 [frontend] [sonnet] Wire server-side pagination with 30/page and jump-to-page

  **Goal**: Implement page navigation controls reflecting page state in the URL.

  **Files (create)**:
  - `/Users/apple/Projects/agentflow/lf-iq/src/app/[locale]/(admin)/admin/users-v2/_components/UserPaginationV2.tsx`

  **Files (modify)**:
  - `UserListV2Page.tsx` — pass `page` from URL to `useGetUsersByFilter`, mount `<UserPaginationV2 />` at the footer.

  **Instructions**:
  - Page size fixed at 30.
  - Request params: `?page=<n>&size=30&sort=<sort>`.
  - Controls: Prev, page numbers with ellipsis for gaps, Next, jump-to-page input.
  - Summary text: `pagination_showing` key ("Showing {from}–{to} of {total}").
  - Jump-to-page: numeric input, clamps to `[1, pages]` on submit.
  - Use optional chaining on query result (`data?.total ?? 0`, `data?.items?.length ?? 0`).

  **Acceptance criteria**:
  - [ ] Paging changes the URL `page` param and refetches.
  - [ ] Jump-to-page works and clamps out-of-range input.
  - [ ] Summary numbers are accurate.
  - [ ] No Mantine `Stack`/`Group`/`Text`/`Title`, no inline styles.
  - [ ] All strings via `useTranslations('AdminUsersV2')`.
  - [ ] `npm run lint` and `npm run build` clean.

  **Dependencies**: 5.1, 6.1.

---

## 10. Integration and Polish

- [ ] 10.1 [frontend] [sonnet] Integration testing of full click-through flows

  **Goal**: Verify the full page works end-to-end and matches the approved mockup.

  **Checks**:
  - [ ] Page loads, stat cards fetch, user list fetches.
  - [ ] Filters (search, role tabs, source, status, loginStatus, date range) all update the list.
  - [ ] Sort options all work; default is loginCount,desc.
  - [ ] Card ⇄ list view toggle works and persists.
  - [ ] Clicking card/row opens drawer with correct role-specific fields.
  - [ ] Drawer close via Esc, outside click, and close button all work.
  - [ ] Bulk select + Export CSV downloads file.
  - [ ] Bulk Deactivate and Delete both show confirmation modal, execute, and clear selection.
  - [ ] Pagination controls and jump-to-page work.
  - [ ] URL search params faithfully represent page state (copy URL → new tab → same view).
  - [ ] All 7 locales load without missing-key warnings.
  - [ ] `active_user_badge` shows only when `login_count >= 2`.
  - [ ] Source badges use granular colors per design tokens.
  - [ ] Visual match with the approved mockup variant (spot-check each section).

  **Dependencies**: 4.1, 5.1, 6.1, 7.1, 8.1, 9.1.

- [ ] 10.2 [frontend] [haiku] Final build and lint verification

  **Goal**: Ensure the change is merge-ready.

  **Checks**:
  - [ ] `cd lf-iq && npm run lint` exits 0.
  - [ ] `cd lf-iq && npm run build` exits 0.
  - [ ] No `console.log`, no inline `style={{}}`, no Mantine `Stack`/`Group`/`Text`/`Title` in `users-v2/` directory (grep to confirm).
  - [ ] All 7 locale files have identical `AdminUsersV2` key structure (run a small script or manual diff).
  - [ ] No `any` in `users-v2/` code (use `unknown` with narrowing for external data).

  **Dependencies**: 10.1.
