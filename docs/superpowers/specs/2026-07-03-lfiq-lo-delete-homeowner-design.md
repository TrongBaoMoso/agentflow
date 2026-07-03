# LFIQ — LO Delete Homeowner (Design)

**Bead:** agentflow-v8fp
**Date:** 2026-07-03
**Repos:** `lf-iq` (FE, PR → master) · `lfiq-backend` (BE, PR → develop, assignee taipham0901)
**Builds on:** the permission UI-gating feature (`PermissionGuard`, `usePermissions`, `page-gates`) already shipped (PR #882/#883, #112).

---

## 1. Problem

The Loan Officer view at `/homeowners` lists a LO's homeowners but offers **no way to delete** a homeowner account. The Admin Users v2 page already has this (PR #874). We want the same capability in the LO-facing view.

## 2. What already exists (verified on staging DB, not just seed files)

| Component | State |
|---|---|
| `DELETE /v1/users/{id}` endpoint | ✅ exists (`UserController.deleteUser` → `UserServiceImpl.deleteUser`) |
| `DELETE /v1/reports` (bulk by `{ids}`) | ✅ exists; **LOAN_OFFICER already has** `PERM:DELETE:/v1/reports` |
| Permission row `PERM:DELETE:/v1/users/*` | ✅ exists in `permission.json` |
| `PERM:DELETE:/v1/users/*` **granted to LOAN_OFFICER role** | ❌ **NOT granted** (staging: LO has 101 perms, none delete-users; only ADMIN via `PERM:*:*`) |
| Ownership scoping in `deleteUser` | ❌ **NONE** — deletes any user by id regardless of caller |
| Homeowner list payload includes reports | ✅ `getHomeowners` expands `reports(relatedUsers(profile))` + `reportCount` → each row has `homeowner.reports[].id` and `homeowner.report_count` |
| FE permission infra (`PermissionGuard`, `usePermissions`) | ✅ shipped |

**Conclusion:** the endpoint exists, so this is *mostly* a FE feature — but two gaps remain:
1. **Permission grant** — handled by an **admin action in Access Control UI** (no code). This is the whole point of the permission feature.
2. **Ownership guard** — a genuine BE security gap that MUST be closed before the permission is granted.

## 3. Locked decisions

1. **Bulk delete:** single-only. No "delete N homeowners". Each row deletes one homeowner.
2. **`REPORT_EXIST` handling:** two-step, same UX as Admin — offer "delete reports, then delete user". Uses `DELETE /v1/reports {ids}` (LO already has the permission), NOT the admin-only `/v1/reports/user/{id}`.
3. **Roles:** **LOAN_OFFICER only.** Realtor deferred (can be enabled later via Access Control with zero code — the cross-delete risk of a Realtor removing a homeowner shared with a LO is why it's deferred).
4. **Permission grant path:** **Cách A** — admin ticks `PERM:DELETE:/v1/users/*` onto the LOAN_OFFICER role in Access Control UI. **No seed-file change.**
5. **Ownership:** **fixed in BE** (`deleteUser`) — a LO may only delete a HOME_OWNER they own.

## 4. Backend design (lfiq-backend)

### 4.1 Ownership guard in `UserServiceImpl.deleteUser`

Add a caller-scoping check at the top of `deleteUser(String userId)`, after the target is loaded:

- Resolve `currentUser` via `getCurrentUser()`.
- **ADMIN** (`currentUser.currentProfile == ADMIN`): unchanged — may delete any user.
- **LOAN_OFFICER**: the target MUST be a `HOME_OWNER` whose `HomeOwnerProfile.hoWorkingWithLoanOfficer == currentUser`. This is the exact ownership definition already used by `getHomeOwners` (LO branch). Otherwise throw `BadRequestException` (mirrors the "Only Loan Officers can access Realtors list" style in `getRealtors`).
- **Any other profile**: throw `BadRequestException` (deletion not permitted for this profile).

The existing `REPORT_EXIST` and `USER_INVALID` checks stay. Ordering: ownership guard runs **before** the report check so an unauthorized caller never learns whether the target has reports.

**Why this is safe regardless of deploy order:** the guard is dormant behavior-wise for ADMIN (unchanged) and simply hardens the LO path. It must ship **before** the permission is granted (see §6).

### 4.2 Tests (`UserServiceImplTest` or the module's existing test)

- LO deleting an owned HOME_OWNER → succeeds (reaches delete).
- LO deleting a HOME_OWNER owned by a different LO → `BadRequestException`.
- LO deleting a LOAN_OFFICER / REALTOR target → `BadRequestException`.
- ADMIN deleting any target → succeeds (unchanged).
- Owned HOME_OWNER that still has reports → `REPORT_EXIST` (guard passes, report check fires).

### 4.3 NOT in scope

- No seed change to `role-2-permission.json`.
- No change to `deleteReports` / `deleteReportsByUser` (LO already has `DELETE /v1/reports`; its own ownership scoping is a separate concern — noted as a follow-up in the PR body for Tai's awareness, not fixed here).

## 5. Frontend design (lf-iq)

### 5.1 Shared source-gating constant

Admin's `UserCardActionMenu` hardcodes `DELETABLE_HOMEOWNER_SOURCES = ['MANUAL_CREATION','BULK_IMPORT','RATE_ALERT']`. Lift this to a shared module (e.g. `src/shared/permissions/deletable-sources.ts` or an existing shared constants location) and have both admin and the new LO menu import it. A homeowner is delete-eligible only when `homeowner.source ∈ DELETABLE_HOMEOWNER_SOURCES`.

### 5.2 Row delete action on `HomeownerCard`

- Add a delete affordance in the row action area of `HomeownerCard` (near the engagement `IconActivity` icon / before the chevron slot). A small trash button or a 3-dot `Menu` with a single red **Delete** item — matching the v2 visual system.
- Wrap the affordance in `PermissionGuard api={{ method: 'DELETE', uri: \`/v1/users/${homeowner.id}\` }}` in **hide** mode. Result: invisible until the LO's role is granted `PERM:DELETE:/v1/users/*`; then it appears automatically. No FE code constants for permission strings — matches the established pattern.
- Additionally render it only when `DELETABLE_HOMEOWNER_SOURCES.includes(homeowner.source)`. (Two independent gates: permission AND source.)
- Clicking calls a new callback `onRequestDelete(homeowner)` passed down from the container.

### 5.3 Container wiring + dialog (`useHomeownerActions` / `ReportPage`)

Keep data/side-effects in the container (matches container/presentational split). In `useHomeownerActions`:

- Add delete-dialog state (target homeowner + open flag) and an `onRequestDelete(homeowner)` opener, wired through `ReportPage` to `HomeownerCard`.
- Render a new `ConfirmDeleteHomeownerDialog` (in `homeowners/_v2/_components/Modal/`).
- On success, `fetchReports(...)` / refetch the homeowners list so the row disappears.

### 5.4 `ConfirmDeleteHomeownerDialog`

New component under `homeowners/_v2/_components/Modal/`. Same visual tone/flow as Admin's `ConfirmDeleteUserDialog` but using LO-available endpoints:

- **Step `confirm_delete`**: type-to-confirm `DELETE`; on confirm → `deleteUser(homeowner.id)`.
- On `REPORT_EXIST` error → **Step `report_exist`**: "This homeowner still has N reports. Delete the reports first, then delete the account?" Confirm → `deleteReports(homeowner.reports.map(r => r.id))` (LO-permitted), then re-run `deleteUser(homeowner.id)`.
- On full success → notify + close + refetch.
- Reset state on open. Guard against double-submit with a `loading` flag.

We do **not** reuse Admin's dialog directly because its report-deletion step calls the admin-only `deleteReportsByUser('/v1/reports/user/{id}')` which LO cannot call.

### 5.5 i18n

Add any new keys (dialog title/body, report-exist copy) to **all 7 locales** (`en, ko, vi, zh, he, es, ar`), snake_case under an appropriate CamelCase namespace. Reuse existing `Confirmation`, `Action`, `Notification`, `Noun` keys wherever they already cover the copy.

### 5.6 Tests

Unit-test the pure logic (the source-gating predicate, and any pure helper for building report-id lists). Follow the repo's existing FE test depth for this area; visual/wiring is covered by the permission-gating infra already tested.

## 6. Rollout / deploy safety

- **Any deploy order is safe for the button:** if FE ships first, the button stays hidden (LO has no permission). If BE ships first, no button exists yet.
- **Ownership guard must precede the permission grant.** Sequence per environment:
  1. Merge + deploy BE ownership guard.
  2. Deploy FE.
  3. Admin grants `PERM:DELETE:/v1/users/*` to LOAN_OFFICER via Access Control → button appears for LOs immediately.
- **Staging test:** deploy the ownership-guarded BE to staging, grant the permission via Access Control, then verify with local FE → staging BE (a) button appears for an LO, (b) LO can delete an owned homeowner, (c) LO cannot delete a non-owned account via direct API (403), (d) `REPORT_EXIST` two-step works.

## 7. Out of scope / follow-ups

- Realtor delete capability (enable later via Access Control once policy is decided).
- Bulk multi-homeowner delete.
- Ownership scoping of `deleteReports` / `deleteReportsByUser` (flagged to Tai in the BE PR body).
- Seeding the LO delete permission as a default (intentionally handled via Access Control instead).
