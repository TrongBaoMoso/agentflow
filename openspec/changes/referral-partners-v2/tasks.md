# Tasks: Referral Partners V2 Visual Redesign

Target repo: `lf-iq`
Feature branch: `feature/referral-partners-v2` (from `production`)
All tasks are `[frontend]` — no backend changes.

---

## 1. Foundation Setup

- [ ] 1.1 [frontend] [haiku] Set up version switching in referral-partners/page.tsx
  - Modify `src/app/[locale]/(private)/referral-partners/page.tsx`
  - Import `withUIVersion` from `@shared/components/withUIVersion`
  - Wire v1 to `() => import('./_components/ReferralPartners')` and v2 to `() => import('../referral-partners-v2/_components/ReferralPartnersPage')`
  - Keep existing `RouteGuard` with `requiredRoles={['LOAN_OFFICER', 'ADMIN']}`
  - Pass `initialStatus` and `initialSource` props through
  - Follow exact pattern from `homeowners/page.tsx` and `dashboard/page.tsx`
  - **Acceptance:** When `uiVersionAtom === 'v2'`, the v2 component lazy-loads. When `v1`, the existing component loads. `npm run build` passes.

- [ ] 1.2 [frontend] [haiku] Create referral-partners-v2 directory and placeholder ReferralPartnersPage
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/ReferralPartnersPage/index.tsx`
  - Export default component accepting `{ initialStatus?, initialSource? }` props
  - Render a placeholder `<div>Referral Partners V2</div>` so version switching works end-to-end
  - **Acceptance:** Toggling UI version to v2 shows the placeholder. Toggling back shows v1 unchanged. `npm run build` passes.

---

## 2. Core Components

- [ ] 2.1 [frontend] [sonnet] Create ReportColumnsConfig with v2-styled column definitions
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/ReportColumnsConfig.tsx`
  - Export `useReportColumns()` hook returning `MRT_ColumnDef<any>[]`
  - Column 1 "Summary": property thumbnail (from `property_images[primary=true]`, fallback `IMAGES.SYSTEMS.NO_IMAGE`), clickable title (orange, navigates to `ROUTES.EDIT_REPORT/${id}`), address summary
  - Column 2 "Status": v2 status pill (ACTIVE/UNSUBSCRIBED/INACTIVE/FAILED). FAILED shows tooltip with `message` field
  - Column 3 "Tag": v2 tag badge (CREATED = "Manual" blue, BULK_IMPORT = "Bulk Import" amber)
  - Column 4 "Report Link": "View Report" link button + copy icon with 1.5s feedback
  - Use exact Tailwind class tokens from design.md status/tag pill mappings
  - **Acceptance:** Hook returns 4 properly typed columns. Status pills match design.md color specs exactly. Copy link writes to clipboard with visual feedback. Under 200 lines.
  - **Depends on:** 1.2

- [ ] 2.2 [frontend] [sonnet] Create PartnerCard component
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/PartnerCard/index.tsx`
  - Container: exact HomeownerCard border/shadow/hover/expanded classes from design.md
  - Grid: `grid grid-cols-[28px_1fr_auto] gap-[16px] items-center`
  - Checkbox (column 1), identity + meta (column 2), chevron (column 3)
  - Identity: name `text-[14px] font-semibold text-[#111827]`, email `text-[12px] text-[#9ca3af]`
  - Meta row on md+: status pill, report count badge, source badge (LF/LFIQ)
  - Expanded section: section header label + `GeneralTable` using `reportColumns` prop
  - Props: `partner, isExpanded, isSelected, onToggleExpand, onToggleSelect, onOpenUserInfo, reportColumns`
  - **Acceptance:** Card renders with correct v2 styling. Expand/collapse toggles report table. Checkbox toggles selection. Avatar/name click calls `onOpenUserInfo`. Status pill colors match design.md. Under 350 lines.
  - **Depends on:** 2.1

- [ ] 2.3 [frontend] [sonnet] Create PartnerCardList component
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/PartnerCardList/index.tsx`
  - Follow exact HomeownerCardList pattern
  - Select-all row: `flex items-center gap-[8px] py-[4px] pb-[8px] pl-[4px] text-[13px] text-[#6b7280]`
  - Card list: `flex flex-col gap-[6px]`
  - Empty state: `flex flex-col items-center justify-center py-[80px]`
  - Pagination at bottom using shared `Pagination` component
  - Loading state: `LoaderLFIQ`
  - Props: `data, loading, expanded, selectedPartnerIds, pagination, reportColumns, onToggleExpand, onToggleSelect, onSelectAll, onOpenUserInfo, onPageChange`
  - **Acceptance:** Renders list of PartnerCards. Select-all toggles all. Empty state shows when no data. Pagination works. Loading shows spinner. Under 120 lines.
  - **Depends on:** 2.2

- [ ] 2.4 [frontend] [sonnet] Create PartnersToolbar component
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/PartnersToolbar/index.tsx`
  - Container: `sticky top-[80px] z-30 bg-white shadow-sm rounded-md`
  - Inner: `flex flex-wrap items-end gap-2 px-4 py-3`
  - Actions: Add Partner button (conditional on `!internal`), Invite Partner button, Manage Default Realtor button (conditional on LO profile)
  - Filters (collapsible on mobile): TextInput, DatePickerInput range, MultiSelect source, MultiSelect status, Clear + Refresh
  - Mobile filter toggle with count badge (exact HomeownersToolbar pattern)
  - All inputs: `radius="md" size="sm"`
  - Props: search, dateRange, currentSource, currentStatus, sourceOptions, statusOptions, filter handlers, action handlers, loading, showAddPartner, showManageRealtor
  - **Acceptance:** Toolbar is sticky at top-80px. Filters collapse on mobile behind toggle with badge count. All filter controls work. Action buttons conditionally shown. Under 300 lines.
  - **Depends on:** 1.2

---

## 3. Main Page Assembly

- [ ] 3.1 [frontend] [opus] Implement ReferralPartnersPage with full state management
  - Replace placeholder in `src/app/[locale]/(private)/referral-partners-v2/_components/ReferralPartnersPage/index.tsx`
  - Port all state management logic from v1 `ReferralPartners/index.tsx`:
    - `useState`: loading, referralPartners, pagination, search, keyword, expanded, copiedId, dateRange, currentStatus, currentSource, filter
    - `useEffect`: URL param sync, data fetching on filter/page change
    - `useCallback`: debounced search
    - Filter building: `buildFilter(dateRange, status, source)` — extract as utility or inline
    - API call: `getReferralPartners({ currentPage, pageSize, search, filter, expand: 'reports,profile' })`
  - Wire `useUrlParams` for URL state persistence
  - Wire all modal hooks: `useModal(AddPartnerModal)`, `useModal(InvitePartnerModal)`, `useModal(UserInfoModal)`, `useModal(DefaultRealtorModal)`
  - Wire `useAtom(userProfileState)` for profile-dependent actions
  - Wire `useRouteAccess` check
  - Integrate `useReportColumns()` hook
  - Render: `PrivatePageTourHeader` + instruction card + `PartnersToolbar` + `PartnerCardList`
  - Selection state: `selectedPartnerIds` array, `onToggleSelect`, `onSelectAll`
  - **Acceptance:** Full page renders with data from API. Search, filter, pagination all work. Expand/collapse cards shows report table. All three action buttons open correct modals. URL reflects current filter state. Under 500 lines. `npm run build` passes.
  - **Depends on:** 2.3, 2.4

---

## 4. Modal Redesign

- [ ] 4.1 [frontend] [sonnet] Redesign AddPartnerModal with v2 styling
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/AddPartnerModal/index.tsx`
  - Port all logic from v1 `AddReferralPartnersModal/index.tsx` (fetch unregistered partners, multi-select, invite)
  - V2 styling: Modal title `text-[20px] font-bold text-[#111827]`, description `text-[14px] text-[#6b7280]`
  - List items: `rounded-[12px] border` cards, selected state `bg-[#fff7ed] border-[#f36f20]`, hover `hover:bg-[#f9fafb]`
  - Search input: `radius="md" size="sm"` consistent with toolbar
  - Select-all checkbox row above list
  - Footer: Cancel + Preview Email + Send Invites (same actions, v2 button style)
  - **Acceptance:** Same functionality as v1 (search, select, invite). V2 visual styling on all elements. Selected items show orange highlight. Under 320 lines. `npm run build` passes.
  - **Depends on:** 1.2

- [ ] 4.2 [frontend] [sonnet] Redesign InvitePartnerModal with v2 styling
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/InvitePartnerModal/index.tsx`
  - Port all logic from v1 `InviteNewReferralPartnersModal/index.tsx` (email validation, add to list, invite)
  - V2 email input area: `bg-[#fff7ed] rounded-[12px] p-4`
  - Valid emails section: `bg-[#ecfdf5] border-[#a7f3d0] rounded-[12px]`
  - Invalid emails section: `bg-[#fef2f2] border-[#fecaca] rounded-[12px]`
  - Email chips: v2 pill pattern `rounded-full py-[4px] px-[12px] text-[12px] font-semibold border`
  - Same form validation with `joiResolver`
  - **Acceptance:** Same functionality as v1 (add emails, validate, invite). V2 visual styling. Valid/invalid sections clearly distinguished. Under 320 lines. `npm run build` passes.
  - **Depends on:** 1.2

- [ ] 4.3 [frontend] [sonnet] Redesign UserInfoModal with v2 styling
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/UserInfoModal/index.tsx`
  - Port all logic from v1 `UserInfoModal/index.tsx` (display partner info, licensed states)
  - V2 header card: avatar + name + v2 status pill + report count
  - Contact card: `rounded-[12px] border border-[#e5e7eb]` with icon rows
  - Professional info card: same border pattern, licensed states with license numbers
  - All cards: `bg-white rounded-[12px] border border-[#e5e7eb] p-4`
  - **Acceptance:** Displays same information as v1. V2 card and pill styling. Under 150 lines. `npm run build` passes.
  - **Depends on:** 1.2

- [ ] 4.4 [frontend] [opus] Redesign DefaultRealtorModal with v2 styling
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/DefaultRealtorModal/index.tsx`
  - Port all complex logic from v1 `DefaultRealtorModal/index.tsx` (state exceptions, SELF assignment, ALL/OTHER, save profile)
  - V2 Paper items: `rounded-[12px]` borders
  - Default realtor card: avatar + info + change button, v2 styling
  - State exception list: v2 border and hover patterns
  - "Not Assigned" states section: v2 gray styling
  - Add state exception flow: button grid with v2 buttons
  - Footer: Cancel + Save with v2 button styles
  - Uses v2 `SelectRealtorModal` (task 4.5)
  - **Acceptance:** Same full functionality as v1 (set default, add state exceptions, assign/unassign, save). V2 visual styling throughout. Under 500 lines. `npm run build` passes.
  - **Depends on:** 4.5

- [ ] 4.5 [frontend] [sonnet] Redesign SelectRealtorModal with v2 styling
  - Create `src/app/[locale]/(private)/referral-partners-v2/_components/SelectRealtorModal/index.tsx`
  - Port all logic from v1 `SelectRealtorModal/index.tsx` (infinite scroll search, select realtor, Jotai state)
  - V2 list items: `rounded-[12px] border border-[#e5e7eb]` cards
  - Selected/hover: `hover:bg-[#fff7ed] hover:border-[#f36f20]`
  - "Not assigned" option: gray styling with X icon
  - "Assign to me" option: orange highlight
  - Search input: v2 `radius="md"` styling
  - Infinite scroll on `ScrollArea.Autosize`
  - **Acceptance:** Same functionality as v1 (search, infinite scroll, select). V2 visual styling. Under 350 lines. `npm run build` passes.
  - **Depends on:** 1.2

---

## 5. Final Integration

- [ ] 5.1 [frontend] [sonnet] Wire all modals into ReferralPartnersPage and verify end-to-end
  - Ensure `ReferralPartnersPage` imports and renders all v2 modals (AddPartner, InvitePartner, UserInfo, DefaultRealtor with SelectRealtor)
  - Verify all modal triggers work: toolbar buttons open correct modals, card avatar click opens UserInfo
  - Verify modals receive correct props (partner data, refresh callbacks, user profile)
  - Verify after modal actions (invite, save default realtor), the partner list refreshes
  - Test full flow: load page, search, filter, expand card, view reports, copy link, open each modal
  - Run `npm run build` to verify no TypeScript errors
  - **Acceptance:** All 5 modals open and function correctly from v2 page. Data refreshes after mutations. No TypeScript errors. Full user flow works end-to-end.
  - **Depends on:** 3.1, 4.1, 4.2, 4.3, 4.4
