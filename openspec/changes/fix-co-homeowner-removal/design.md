# Design: Fix Co-Homeowner Removal Not Cascading to Related Users

## Architecture Decision

**Decision:** Filter homeowner users from `related_user_keys` on the frontend during form population in edit mode. No backend changes.

**Rationale:** The backend's behavior is correct by design: `related_user_keys` is intended for LO/Realtor keys only, while homeowner associations are derived from the `customers` list via `processCustomersForUpdate()`. The bug is that the frontend incorrectly includes homeowner keys in `related_user_keys` when loading the edit form. Fixing the frontend to respect the intended API contract resolves the issue.

**Alternatives considered:**

1. **Backend filter: strip HOME_OWNER users from `related_user_keys` resolution.** Not pursued because the user has confirmed no Java code changes for this ticket. The backend behavior is considered fixed/correct.

2. **Sync `related_user_keys` with `customers` on every customer add/remove in the form.** Rejected because: overengineered -- homeowner keys should never be in `related_user_keys` in the first place. Filtering at population time is simpler and prevents the problem at its source.

3. **Strip `related_user_keys` entirely from the edit payload and let the backend reconstruct.** Rejected because: `related_user_keys` legitimately carries LO/Realtor keys that the backend needs. Stripping it would break LO/Realtor associations.

## Module Changes

### Frontend: `lf-iq`

#### File: `src/app/[locale]/(private)/homeowners/_components/ReportForm/index.tsx`

**Location:** `fetchReportDetail()` form reset (line ~115-116)

Filter `related_user_keys` to exclude homeowner profiles when populating the form. The `related_users` response includes `current_profile` on each user object.

```typescript
// Current (lines 115-116):
related_user_keys:
  (data.related_users || []).map((user: any) => user.key).filter((key: any) => key != null) || []

// Fixed:
related_user_keys:
  (data.related_users || [])
    .filter((user: any) => user.current_profile !== 'HOME_OWNER')
    .map((user: any) => user.key)
    .filter((key: any) => key != null) || []
```

#### File: `src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/index.tsx`

**Location:** Same `fetchReportDetail()` pattern (line ~112-113)

Apply the identical filter. This is a duplicate component for the v2 homeowners UI.

```typescript
// Current (lines 112-113):
related_user_keys:
  (data.related_users || []).map((user: any) => user.key).filter((key: any) => key != null) || []

// Fixed:
related_user_keys:
  (data.related_users || [])
    .filter((user: any) => user.current_profile !== 'HOME_OWNER')
    .map((user: any) => user.key)
    .filter((key: any) => key != null) || []
```

### Why only the ReportForm edit population?

The form submission path (`Contact/index.tsx` > `createReportBody()`) uses `...dataForm` spread which includes `related_user_keys` from the form state. By fixing the initial population, the form state never contains homeowner keys, so the submission payload is clean.

Other code paths that set `related_user_keys` (e.g., `Property/index.tsx` for referral partner selection, `useHomeownerActions.ts` for quick-action referral changes) explicitly construct key arrays and are not affected by this bug.

## Data Flow (After Fix)

### Edit Report with Co-Homeowner Removal

```
1. FE loads report -> related_users includes [LO, Realtor, HO1, HO2]
2. FE filters: related_user_keys = [LO_key, Realtor_key] (homeowners excluded)
3. User removes HO2 from customers list in form
4. FE submits: { customers: [HO1_data], related_user_keys: [LO_key, Realtor_key] }
5. BE resolveRelatedUsers() -> resolves LO + Realtor from keys
6. BE populateReport() -> clear relatedUsers, addAll(LO, Realtor)
7. BE processCustomersForUpdate() -> adds homeowner User for HO1 only
8. Result: report_2_user has: LO, Realtor, HO1 (HO2 is gone)
```

### Edit Report with Co-Homeowner Addition

```
1. FE loads report -> related_user_keys = [LO_key, Realtor_key]
2. User adds new co-homeowner email to customers list
3. FE submits: { customers: [HO1_data, new_HO2_data], related_user_keys: [LO_key, Realtor_key] }
4. BE resolveRelatedUsers() -> resolves LO + Realtor
5. BE populateReport() -> clear relatedUsers, addAll(LO, Realtor)
6. BE processCustomersForUpdate() -> creates/links homeowner Users for both customer emails
7. Result: report_2_user has: LO, Realtor, HO1, new_HO2
```

## Conventions (lf-iq)

- Next.js 14 App Router + TypeScript + Mantine 7 + Jotai
- Forms via react-hook-form + Joi validation
- API calls in `src/apis/private-api.ts`
- i18n via next-intl (en, vi)
- Pre-commit hook: husky + lint-staged (ESLint + Prettier + stylelint)
- Build verification: `npm run build` must pass

## Risk Assessment

- **Very low risk**: The change is a single `.filter()` addition in two files, applied at form population time only.
- **No backend changes**: Zero risk of breaking backend contracts.
- **No schema changes**: The `report_2_user` table is unchanged.
- **Self-healing**: Existing reports with stale associations will be corrected when next edited through the fixed form.
- **Backward compatible**: If an older frontend version sends homeowner keys, the backend still works (it adds them, which is the existing behavior). The fix just ensures the frontend stops sending stale keys.
