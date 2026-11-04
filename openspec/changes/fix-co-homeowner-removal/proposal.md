# Proposal: Fix Co-Homeowner Removal Not Cascading to Related Users

## Problem Statement

When a Loan Officer or Realtor edits a homeowner report and removes a co-homeowner from the customers list:
- The "Who's on This Loan" section updates correctly (co-homeowner removed from display).
- **BUT** the report still appears in the removed co-homeowner's report list.

This means the removed co-homeowner can still see and access the report they were removed from, which is incorrect from a data integrity and user experience perspective.

## Root Cause Analysis

The bug is in the **frontend form data population** in `lf-iq`.

In `lf-iq/src/app/[locale]/(private)/homeowners/_components/ReportForm/index.tsx` (lines 115-116), when the edit form loads, `related_user_keys` is populated from ALL `related_users` -- including homeowner Users:

```typescript
related_user_keys:
  (data.related_users || []).map((user: any) => user.key).filter((key: any) => key != null) || []
```

When a co-homeowner is removed from the `customers` array in the form, their key remains in `related_user_keys` because this field is not synchronized with customer changes. When the form submits, the stale homeowner key is sent to the backend via `related_user_keys` in the request body (confirmed: `deleteReportFields` strips `related_users` but NOT `related_user_keys`).

The backend's existing behavior (by design, not a bug) resolves all keys in `related_user_keys` and adds them to the `report_2_user` join table. It then also adds homeowner users derived from the `customers` list. The net result: the removed co-homeowner's key in `related_user_keys` causes the backend to re-associate them with the report, even though they were removed from `customers`.

**The same issue exists in `homeowners-v2/_components/ReportForm/index.tsx` (line 112-113).**

The backend behavior is fixed and will NOT be changed for this ticket. The frontend must stop sending stale homeowner keys.

## Proposed Solution

**Frontend-only fix in `lf-iq`.**

When populating the form during edit mode, filter `related_user_keys` to exclude `HOME_OWNER` profile users. The `related_users` response includes `current_profile` on each user object, so this filter is straightforward.

This ensures:
- `related_user_keys` only contains LO/Realtor keys (which is the intended contract).
- When a co-homeowner is removed from `customers`, no stale homeowner key is sent back.
- The backend derives homeowner associations exclusively from the `customers` list (its existing, correct behavior).

**Note on existing stale data:** Reports with stale `report_2_user` rows from prior edits will be corrected automatically the next time those reports are edited and saved through the fixed form.

## Scope

### In scope
- Frontend: Filter `related_user_keys` to exclude homeowner profiles during form edit population (both `homeowners` and `homeowners-v2` ReportForm components)
- Frontend unit/component test to verify correct payload construction
- QA regression test plan

### Out of scope
- Backend changes (backend behavior is correct and unchanged)
- Data migration to clean up existing stale `report_2_user` rows
- Changes to the report creation flow (only edit/update is affected)
- Changes to the `report_2_user` table schema
- Changes to the `useHomeownerActions` hook (which has a separate code path for referral partner changes and explicitly manages keys)

## Success Criteria

1. When a co-homeowner is removed from a report during edit, the report no longer appears in that co-homeowner's report list after save.
2. The report still appears in the remaining co-homeowners' report lists.
3. The LO and Realtor associations are unaffected.
4. Creating a report with co-homeowners still works correctly.
5. Adding a new co-homeowner during edit still works correctly.

## Feature Branch

`fixbug/fix-co-homeowner-removal` -- created from `production`, merged into `master` (LF convention) for `lf-iq`
