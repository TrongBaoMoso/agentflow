# Proposal: Admin SafeExamCenter Results

## Overview

Add an admin-facing page in `lf-homepage` that lists all SafeExamCenter exam registrants together with each user's three most recent exam attempts. The page is backed by a new aggregation endpoint in `moso-aid` that joins the `ExamUser` and `Exam` collections.

Audience: internal admins (gated via the same `x-moso-user-id` cookie/header pattern as the existing `manage-event` admin page).

## Motivation

Today there is no way for admins to see who has registered for the SafeExamCenter assessment, what option they picked (`exam_plan`), or how recent attempts performed. Support requests currently require manual Mongo queries. A read-only admin list lets ops teams:

- Verify registrations after marketing campaigns.
- Spot users who registered but never attempted an exam (`last_3_results = []`).
- Triage failed/expired attempts quickly by inspecting per-attempt detail without leaving the browser.
- Reuse the existing detail endpoint (`GET /api/exam/:exam_id/result`) for drill-down without building a new one.

## Scope

### In scope

**Backend (`moso-aid`, base branch `pro`):**
- New endpoint `GET /api/exam/admin/users?page=1&limit=20&search=<name|email>`.
- Mongo aggregation: `ExamUser` `$lookup` → `Exam` (sort `submitted_at` desc, limit 3 per user).
- Search by name or email (case-insensitive regex).
- Pagination envelope (`page`, `limit`, `total`, `totalPages`) inside the standard `ApiResponse<T>` shape so the existing FE `requestPaginated` helper works.
- Sort users by `last_exam_at` desc, users with no attempts go to the end (null last).
- `express-validator` on query params (`page>=1`, `limit 1..100`, `search` optional trimmed string).
- Index audit: ensure `Exam.user_id + submitted_at` compound index exists; add migration/comment if missing.

**Frontend (`lf-homepage`, base branch `production`):**
- New route `src/app/[locale]/(private)/manage-safeexamcenter/page.tsx` with `x-moso-user-id` gate (mirror the `manage-event` pattern).
- Client component `ManageSafeExamCenterClient.tsx` rendering a Mantine `Table` with columns: Name, Email, Closest option (`exam_plan` label), Last 3 attempts.
- Reusable `ExamResultBadge` (status colour + score + date + tooltip).
- `ExamResultDetailModal` using `@ebay/nice-modal-react`, fetched via `GET /api/exam/:exam_id/result`.
- `mosoAidApi.ts` additions: `getAdminExamUsers({ page, limit, search })` and `getExamResultById(examId)` (if not already present).
- Toolbar: search input (500 ms debounce), refresh button. Pagination 20/page.
- Loading UX: dim the data area (`opacity-60` + `aria-busy`) AND disable toolbar controls (`disabled={loading}`) — both at once, per project rule.
- i18n keys under `ManageSafeExamCenter` namespace, added for all 5 locales (en, es, vi, zh, he).
- `exam_plan` enum label map: `within_1_week`, `next_2_4_weeks`, `next_4_8_weeks`, `more_than_8_weeks`.

### Out of scope (v1)

- CSV export.
- Date range filter (only name/email search + pagination in v1).
- Mutating endpoints (no delete, no edit).
- Backend auth/authorization beyond the FE gate (deferred — see Risks).
- Showing attempts older than the most recent three.
- Per-attempt remediation flows.

## Success Criteria

1. An admin with a valid `x-moso-user-id` can open `/manage-safeexamcenter`, see a paginated table of registrants, and search by name/email with results returning within the same latency envelope as `manage-event`.
2. Each row shows the user's `exam_plan` (translated) and up to three result badges; users with zero attempts render `—` rather than crashing.
3. Clicking any result badge opens a Mantine modal with the full `Exam` payload from the existing detail endpoint.
4. Sorting honours `last_exam_at desc` with null users (registered, never attempted) at the bottom.
5. Loading and refresh actions dim the data area and lock toolbar controls simultaneously.
6. All FE strings are localized in 5 locales; no hardcoded text in JSX.
7. `mosoAidApi.ts`, controller, service, and aggregation are each under 500 lines and pass repo lint (ESLint + Prettier + stylelint for FE; existing lint for BE).
8. No backend regressions: existing `/api/exam/...` endpoints continue to pass their current tests.

## Branches

| Repo | Base branch | Feature branch |
|------|-------------|----------------|
| `moso-aid` | `pro` | `feature/admin-exam-results` |
| `lf-homepage` | `production` | `feature/admin-safeexamcenter-results` (PR'd to `master` + `release`; `release → production` PR created but NOT merged) |

## Risks

### R1. Admin endpoint has no backend authentication (HIGH)

`GET /api/exam/admin/users` will be reachable by anyone who knows the URL. The FE gates via `x-moso-user-id` cookie, but the BE itself does not verify the caller.

- **Why we accept it for v1:** matches the precedent set by `manage-event` admin endpoints in `moso-aid`, keeps scope tight, and the endpoint is read-only with PII already exposed elsewhere in the admin surface.
- **Mitigation path if abused:** add an env-driven allowlist middleware (e.g. `ADMIN_ALLOWED_USER_IDS` checked against `x-moso-user-id`), or move behind the same auth middleware used for any future authenticated admin routes. Track follow-up issue if/when needed.

### R2. Aggregation cost on large `Exam` collection (MEDIUM)

The `$lookup` + per-user sort/limit could be slow once `Exam` grows. Mitigations baked into the design:

- Compound index `(user_id, submitted_at DESC)` on `Exam`.
- Hard cap on `limit` (max 100).
- Pagination on `ExamUser` (outer collection) keeps the lookup bounded per page.

### R3. `exam_plan` field assumption (LOW)

Spec assumes `exam_plan` is stored once on `ExamUser` at register-time and never changes. If product later allows updating it, the table shows a stale value — but no data loss occurs. The display layer can be swapped to read from the latest `Exam` doc later without breaking the API contract.

### R4. i18n key drift (LOW)

Five locales must stay in sync. Mitigation: add all keys in the same commit per repo convention; rely on existing build-time check (if any) plus reviewer eyeballing the JSON diff.
