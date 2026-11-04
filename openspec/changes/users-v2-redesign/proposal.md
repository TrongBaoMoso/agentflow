# Proposal: users-v2-redesign

## Why

The current `/admin/users` page in `lf-iq` does not align with the v2 design system that the user has already approved and shipped for other admin surfaces (`dashboard-v2`, `homeowners-v2`, `referral-partners-v2`, `engagement-v2`, `release-notes-v2`, `bulk-import-homeowner-v2`). Concretely:

- The page is composed of 3 separate card components (one per role) with duplicated layout logic, spacing, and field rendering.
- Detail view is modal-based, which makes multi-tasking (comparing two users, copy/paste from drawer to filter) awkward.
- There is no list / row view for dense scanning across large user sets.
- There are no bulk actions; admins can only operate one user at a time.
- Visual tokens (palette, shadows, typography, spacing rhythm) are outdated relative to the approved v2 system.
- Stat cards, filter bar, and pagination do not share the v2 surface treatment used on sibling pages.

## What Changes

- Add a new route `src/app/[locale]/(admin)/admin/users-v2/` that coexists with the existing `/admin/users` route behind the UI version toggle that is already implemented in the project.
- Deliver a unified `UserCardV2` that is role-aware via props (LO / Realtor / HomeOwner), replacing the three duplicated card components on the new route.
- Add a new row / list view (`UserRowV2`) with a card ⇄ list toggle for dense scanning.
- Replace the modal-based detail with a Mantine `Drawer` (`UserDetailDrawerV2`) so the admin can keep the background list visible.
- Add a multi-select bulk action bar (`UserBulkActionBarV2`) with: Export CSV, Export Excel, Deactivate, Delete, Send invite (HO only).
- Add `date_range_created_at` filter alongside the existing search / role tabs / source / status / loginStatus filters.
- Update sort set: name, created_at, last_login_time, login_count, report_count, status — default `loginCount,desc`.
- Use server-side pagination, 30 items per page, with a jump-to-page input.
- Apply v2 design tokens: LF orange brand (`#F97316`) + ink/slate scale, Inter font, standard v2 shadows and radii, light mode only.
- Support all 7 locales: en, vi, es, ko, ar, zh, he. English is source-of-truth; other locales get English placeholders with a follow-up translation ticket.
- No BE changes. The new page reuses the existing `getUsersByFilter` and `getStatisticsSnapshot` endpoints. If "Send invite (HO)" does not already have a BE endpoint, we mark it as a follow-up ticket rather than blocking this change.

Out of scope:
- No changes to BE endpoints, roles, permissions, or RBAC.
- No removal or deprecation of the existing `/admin/users` route in this change (deprecation will be a separate future change).
- No dark mode support in this change.
- No translation of non-English locales in this change; placeholders only.

## User Scenarios

1. **Filter and scan**: An admin opens `/admin/users-v2`, filters by role (LO), source (Self Signup), status (Active), and a `created_at` date range. They toggle from card view to list view to densely scan last login and login count across many users.
2. **Drill in via drawer**: The admin clicks on a user row. A right-side Drawer opens showing profile details (personal email, full licensed states, LF/personal/company domain URLs), audit log, and action buttons (Login As / Edit / Reassign LO / Delete). The user list remains visible behind the Drawer; the admin can close the Drawer and click another user without losing filter context.
3. **Bulk operations**: The admin selects 5 homeowner rows via checkboxes. The bulk action bar appears with Export CSV, Export Excel, Deactivate, Delete, Send invite. They export the 5 selected rows to Excel, then run Deactivate on the same selection with a confirmation modal.

## Success Criteria

- `/admin/users-v2` renders with v2 design tokens and matches the user-approved mockup variant.
- Card ⇄ list toggle persists per-user via `atomWithStorage`.
- Drawer detail view opens/closes without losing list state or filter context.
- Bulk selection + all 5 bulk actions work end-to-end (Send invite may be follow-up if BE endpoint missing).
- All strings use `useTranslations()` against the `AdminUsersV2` namespace; all 7 locale files contain identical key structures.
- `npm run build` and `npm run lint` pass cleanly.
- No `console.log`, no inline `style={{}}`, no Mantine `Stack`/`Group`/`Text`/`Title` in new code.

## Feature Branch

`feature/users-v2-redesign` (created from `production` by DevOps, per `lf-iq` branch workflow).
