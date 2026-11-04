# Design: users-v2-redesign

## Design Tokens

All mockups and the React implementation use the following tokens. These are aligned with the v2 system already shipped on `dashboard-v2`, `homeowners-v2`, and sibling pages.

### Color palette (light mode only)

| Token | Hex | Purpose |
|-------|-----|---------|
| `brand-50` | `#FFF7ED` | Soft orange surface (hover tint, subtle highlight) |
| `brand-100` | `#FFEDD5` | Badge background (active user, pill fills) |
| `brand-500` | `#F97316` | LF primary brand orange (CTA, active states, accent) |
| `brand-600` | `#EA580C` | CTA hover |
| `brand-700` | `#C2410C` | CTA active / pressed |
| `ink-900` | `#0F172A` | Primary text / headings |
| `ink-700` | `#334155` | Secondary text |
| `ink-500` | `#64748B` | Tertiary text / metadata |
| `ink-300` | `#CBD5E1` | Borders, dividers |
| `ink-100` | `#F1F5F9` | Surface background / muted cards |
| `ink-50` | `#F8FAFC` | Page background |
| `white` | `#FFFFFF` | Card surface |
| `success-500` | `#10B981` | Active status, positive deltas |
| `success-100` | `#D1FAE5` | Active status badge bg |
| `warning-500` | `#F59E0B` | Pending / attention |
| `warning-100` | `#FEF3C7` | Warning badge bg |
| `danger-500` | `#EF4444` | Deactivate / delete destructive |
| `danger-100` | `#FEE2E2` | Danger badge bg |
| `info-500` | `#3B82F6` | Informational chips |
| `info-100` | `#DBEAFE` | Info badge bg |

### Source badge palette (granular)

| Source | Background | Text |
|--------|-----------|------|
| Self Signup | `#DBEAFE` (info-100) | `#1D4ED8` |
| Invited | `#FFEDD5` (brand-100) | `#C2410C` |
| Imported | `#E0E7FF` | `#4338CA` |
| Seed Data | `#F3E8FF` | `#7E22CE` |
| Other | `#F1F5F9` (ink-100) | `#334155` (ink-700) |

### Shadow tokens

| Token | Value |
|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.04)` |
| `shadow-sm` | `0 2px 6px rgba(15, 23, 42, 0.06)` |
| `shadow-md` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `shadow-lg` | `0 16px 40px rgba(15, 23, 42, 0.10)` |
| `radius-card` | `16px` |
| `radius-chip` | `9999px` |
| `radius-input` | `10px` |

### Typography

- Font family: `Inter` (Google Fonts, weights 400/500/600/700/800).
- Page title: 28px / 700 / `ink-900`.
- Card title: 16px / 600 / `ink-900`.
- Body: 14px / 500 / `ink-700`.
- Metadata / caption: 12px / 500 / `ink-500`.
- Numbers in stat cards: 32px / 700 / `ink-900`.

## Phase 1 — Mockup Variants (Approval Gate)

We produce 3 standalone HTML mockups side-by-side so the user can pick exactly one visual direction before any React code is written.

Locations:

- `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-a/index.html` — **Dashboard-v2 style**: balanced cards on a light surface, subtle shadows, horizontal stat row, soft surfaces with generous padding. Matches the existing `dashboard-v2` surface treatment.
- `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-b/index.html` — **Bento editorial**: asymmetric grid with layered cards of varying heights, larger hero stat, accent orange splash, magazine-style hierarchy. Grid-breaking layout for stat cards; uniform grid for user cards.
- `/Users/apple/Projects/agentflow/lf-iq/mockups/users-v2/variant-d/index.html` — **Swiss minimal**: tight grid, hairline dividers, monochrome with orange accent only on actions and active states, Inter with precise vertical rhythm, almost no shadows.

Each mockup contains the **full-page state** (≈ 800 lines):

1. Top filter bar with search, role tabs (All / LO / Realtor / HO), source dropdown, status dropdown, loginStatus dropdown, date_range_created_at picker, view toggle (card ⇄ list).
2. 7 stat cards: Total Users, Active, Inactive, LO count, Realtor count, HO count, New This Month (mock numbers).
3. Card grid with realistic mix: 3 LO cards + 2 Realtor cards + 3 HO cards, each showing role-appropriate fields including `active_user_badge` (shown on users with `login_count ≥ 2`) and granular source badges.
4. Row list section rendering the same 8 users in compact rows (avatar, name, role chip, status, source badge, last_login, report_count, login_count, action menu).
5. Drawer detail open state for one LO user (docked right, showing profile tab content: personal email, full licensed states list, LF/personal/company domain URLs, audit log preview, action buttons Login As / Edit / Reassign LO / Delete).
6. Bulk action bar in "3 selected" state with Export CSV / Export Excel / Deactivate / Delete / Send invite (HO) buttons.
7. Pagination footer: Prev / page numbers / Next / jump-to-page input / "Showing 1–30 of 847".

Constraints:

- Tailwind via CDN (`https://cdn.tailwindcss.com`).
- Inter via Google Fonts.
- Inline mock data (no network calls).
- Single file per variant, ~800 lines.
- Light mode only.
- No JS frameworks; optional vanilla JS for drawer / toggle interaction if required.

**GATE**: The user reviews all three variants and picks exactly one winner. Only the winning variant proceeds to Phase 2. The losing variants remain in `mockups/users-v2/` for archive but are not implemented.

## Phase 2 — React Implementation

Begin only after the user approves the winning mockup variant.

### Route and folder structure

```
lf-iq/src/app/[locale]/(admin)/admin/users-v2/
  page.tsx                           # route entry + admin guard
  _components/
    UserListV2Page.tsx               # top-level container, wires everything
    UserStatCardsV2.tsx              # 7 stat cards
    UserFilterBarV2.tsx              # search + role tabs + dropdowns + date range
    UserViewToggleV2.tsx             # card ⇄ list toggle
    UserCardV2.tsx                   # role-aware card (LO / Realtor / HO via prop)
    UserRowV2.tsx                    # row layout for list view
    UserDetailDrawerV2.tsx           # Mantine Drawer — profile / audit / actions tabs
    UserBulkActionBarV2.tsx          # multi-select actions
    UserPaginationV2.tsx             # server-side pagination + jump-to-page
```

All `_components/` files must stay under 500 lines. If a file approaches the limit, extract field-renderer sub-components (e.g. `UserCardV2/fields/LoFields.tsx`).

### State

New Jotai atoms colocated with `_components/UserListV2Page.tsx` (or in `src/atoms/userV2.ts` if the project already groups atoms there):

- `userV2ViewModeAtom`: `atomWithStorage<'card' | 'list'>('userV2ViewMode', 'card')` — persists user's view preference across sessions.
- `userV2SelectedIdsAtom`: `atom<Set<string>>(new Set())` — bulk selection set, cleared on filter change.
- `userV2DrawerStateAtom`: `atom<{ open: boolean; userId: string | null; tab: 'profile' | 'audit' | 'actions' }>` — drawer open state.

Reuse existing filter / search / pagination atoms from the current `/admin/users` implementation where they exist. If current implementation uses local `useState`, create new atoms scoped to the v2 page so the v2 route does not interfere with v1.

### API integration

- Reuse existing TanStack Query hooks: `useGetUsersByFilter`, `useGetStatisticsSnapshot`.
- No new endpoints are introduced in this change.
- Bulk actions:
  - Deactivate / Delete: use existing per-user status update and delete endpoints, called in a `Promise.all` from the UI layer. If a BE batch endpoint exists, prefer it and file a ticket otherwise.
  - Export CSV: client-side, encode currently selected rows (or current page if selection empty) into CSV and trigger a browser download.
  - Export Excel: client-side via `xlsx` if already in `lf-iq/package.json`; otherwise file a follow-up ticket to add it and ship CSV first.
  - Send invite (HO only): check for existing invite endpoint. If missing, mark as follow-up ticket and keep the button disabled with a tooltip explaining the gap.

### i18n plan

- Namespace: `AdminUsersV2`.
- Key casing: `snake_case` (project convention).
- Locale files: `src/messages/{en,vi,es,ko,ar,zh,he}.json` — all 7 must be updated in the same commit to keep key structures identical.
- English is the source-of-truth. Non-English locales receive the English string as a placeholder. A follow-up translation ticket is filed when the change is merged.
- Every string rendered in the new components must go through `useTranslations('AdminUsersV2')`. No hard-coded strings.

### Field plan (final)

**LO card (v2)**

Card: avatar, `full_name`, `status_badge`, granular `source_badge`, `company_email`, NMLS id, `last_login_time`, stats triplet (report_count / homeowner_count / login_count), `licensed_states_count` badge, `active_user_badge` (when `login_count ≥ 2`).

Drawer: all card fields plus `personal_email`, full `licensed_states` list, `lf_company_domain_url`, `lf_personal_domain_url`, `company_domain_url`, audit log, actions (Login As / Edit / Reassign LO / Delete).

**Realtor card (v2)**

Same shape as LO but without NMLS. Includes `realtor_working_with_lo` link to the associated LO.

**HomeOwner card (v2)**

Card: avatar, `full_name`, `status_badge`, color-coded `source_badge`, email, `last_login_time`, stats pair (report_count / login_count), `ho_working_with_lo`, `invited_by`.

Drawer: all card fields plus audit log, actions (Login As / Edit / Delete / Send invite).

**Row list (all roles)**

Avatar, name, role chip, status, source_badge, last_login, report_count, login_count, ActionMenu (opens drawer tab `actions`).

### Bulk actions

| Action | Behavior |
|--------|----------|
| Export CSV | Client-side; encode current selection (or current page if no selection) to CSV, trigger download. |
| Export Excel | Client-side via `xlsx` lib if already a dependency; otherwise follow-up ticket. |
| Deactivate | Confirmation modal → `Promise.all` per-user status update → invalidate query → clear selection. |
| Delete | Confirmation modal with typed-to-confirm pattern → `Promise.all` per-user delete → invalidate query → clear selection. |
| Send invite (HO) | Visible only when selection is all-HO; calls invite endpoint if it exists, otherwise disabled with tooltip. |

### Filters

- Search (by name / email, debounced 300ms).
- Role tabs: All, Loan Officer, Realtor, HomeOwner.
- Source dropdown: Self Signup, Invited, Imported, Seed Data, Other.
- Status dropdown: Active, Inactive.
- LoginStatus dropdown: Ever logged in, Never logged in.
- NEW `date_range_created_at`: Mantine DateRangePickerInput, sends `created_at_from` and `created_at_to` to BE.

All filters are reflected in URL search params so the page state is shareable.

### Sort

- Options: name (A-Z, Z-A), created_at (newest/oldest), last_login_time (recent/oldest), login_count (high/low), report_count (high/low), status.
- Default: `loginCount,desc`.
- Sort is reflected in URL as `?sort=loginCount,desc`.

### Pagination

- Server-side, 30 items per page.
- Controls: Prev, page numbers with ellipsis, Next, jump-to-page input, "Showing X–Y of Z" summary.
- Page reflected in URL as `?page=3`.

## Architectural Decisions

### ADR-1: New route `/admin/users-v2` instead of in-place replacement

**Context**: Existing `/admin/users` is referenced from admin nav and other pages.
**Decision**: Ship `users-v2` as a new route alongside the existing one, gated by the UI version toggle already in the project.
**Alternatives**: In-place replacement — risky, no rollback path; feature flag on same route — couples two component trees in one file.
**Consequences**: Duplicated route during transition; explicit deprecation of `/admin/users` is a separate future change.

### ADR-2: Drawer vs Modal for detail view

**Context**: Current page uses a modal, which obscures the list and blocks multi-tasking.
**Decision**: Use Mantine `Drawer` anchored to the right, width ~520px, with internal tabs (Profile / Audit / Actions).
**Alternatives**: Side panel split layout (too heavy), modal (current, rejected).
**Consequences**: Admin keeps list context visible; drawer can be dismissed by outside click or Esc.

### ADR-3: Role-aware `UserCardV2` via prop, not three components

**Context**: Current implementation has three separate card components with duplicated layout.
**Decision**: One `UserCardV2` with `role: 'LO' | 'Realtor' | 'HO'` prop that renders role-appropriate fields via a small switch inside the field section. Shared layout (avatar, name, status, actions) stays outside the switch.
**Alternatives**: Three components (current, duplicated); render-prop pattern (overkill for this scope).
**Consequences**: One file to maintain; role-specific field changes are localized to a single switch block.

### ADR-4: Client-side CSV, follow-up for Excel

**Context**: Excel export requires a binary library (`xlsx`) which may not be in the project.
**Decision**: Ship CSV in the main change (zero-dependency), and file a follow-up ticket to add `xlsx` and Excel export.
**Alternatives**: Block the change on Excel (blocks delivery); ship Excel client-side with a new dep in this change (expands scope).
**Consequences**: Admins get CSV immediately; Excel follows in a separate small change.

### ADR-5: URL as state for filters / sort / pagination

**Context**: Sharing a filtered view is a common admin workflow.
**Decision**: All filter, sort, and pagination state reflects in URL search params (`role`, `source`, `status`, `loginStatus`, `created_at_from`, `created_at_to`, `sort`, `page`). View mode (`card`/`list`) persists via `atomWithStorage` instead (user preference, not a shareable concern).
**Alternatives**: Pure local state (not shareable); server-driven sessions (overkill).
**Consequences**: Admins can paste a URL and reproduce a filtered view; no server-side state.

## Rules Checklist (enforced in implementation)

- [ ] No Mantine `Stack`, `Group`, `Text`, `Title` in any new component. Use Tailwind utilities + native HTML (`div`, `span`, `p`, `h1`–`h6`) instead.
- [ ] No inline `style={{}}`. All styling via Tailwind classes or Mantine props that map to the design tokens.
- [ ] All user-visible strings go through `useTranslations('AdminUsersV2')`. No hardcoded text.
- [ ] Optional chaining and fallback defaults everywhere external data is touched (`user?.full_name ?? t('unknown_user')`).
- [ ] No `any`. Use `unknown` with narrowing for external data; proper types for internal state.
- [ ] No `console.log` in production code. Use a debug helper behind `process.env.NODE_ENV !== 'production'` if needed.
- [ ] Aim for components under 500 lines. Split into sub-components when approaching the limit.
- [ ] All 7 locale files updated in the same commit with identical key structures.
