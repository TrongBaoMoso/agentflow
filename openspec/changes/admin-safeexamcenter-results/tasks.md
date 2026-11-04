# Tasks: Admin SafeExamCenter Results

> Each task is self-contained — DEV agents will read only their assigned task. Repeat repo/branch/path context inside each task.

---

## 1. Backend (`moso-aid`, base branch `pro`, feature branch `feature/admin-exam-results`)

### 1.1 Verify `Exam.user_id + submitted_at` compound index

**Repo:** `moso-aid` (base: `pro`)
**Files:** `src/models/Exam.js` (or equivalent Mongoose schema file)

**Goal:** Ensure the `Exam` collection has a compound index on `(user_id: 1, submitted_at: -1)` so the new admin aggregation `$lookup` is fast.

**Steps:**
1. Open the `Exam` Mongoose model file.
2. Search for any existing `schema.index({ user_id: ... })` declaration.
3. If a compound index on `(user_id, submitted_at)` (descending on `submitted_at`) already exists, leave it and add an inline comment `// Used by admin exam users aggregation (admin-safeexamcenter-results)`.
4. If it does not exist, add `ExamSchema.index({ user_id: 1, submitted_at: -1 })` near the end of the schema declaration, with the same comment.
5. Do NOT touch unrelated indexes.

**Acceptance criteria:**
- Schema file has the compound index defined (existing or new).
- Comment marker present so future maintainers see the rationale.
- App still boots locally (`npm run dev` in `moso-aid`).

---

### 1.2 Add validator for admin exam users query

**Repo:** `moso-aid` (base: `pro`)
**Files:** new file `src/validators/exam-admin.validator.js` (or co-locate in route file if the repo's convention prefers inline validators — match local precedent in `src/routes/`)

**Goal:** Validate `page`, `limit`, and `search` query params using `express-validator` consistently with other moso-aid endpoints.

**Validator rules:**
- `page` — optional int, coerced via `toInt()`, must be `>= 1`. Default handled by controller (treat missing as `1`).
- `limit` — optional int, coerced via `toInt()`, must be `1..100`. Default handled by controller (treat missing as `20`).
- `search` — optional string, `trim()`, max length `200`.

**Acceptance criteria:**
- New file exports a middleware array compatible with the project's other validators (look at any `*.validator.js` file in `src/validators/` or inline validators in `src/routes/` for the pattern).
- Invalid inputs surface as the project's existing 422 error response shape (do NOT roll a new error format).
- No semicolons / no formatting diffs beyond the new file.

---

### 1.3 Build aggregation service for admin exam users

**Repo:** `moso-aid` (base: `pro`)
**Files:** new file `src/services/exam-admin.service.js`

**Goal:** Pure data-layer function `aggregateExamUsers({ page, limit, search })` that runs the MongoDB pipeline described in `design.md` §2.3 and returns `{ items, page, limit, total, totalPages }`.

**Implementation contract:**
- Input: `{ page: number, limit: number, search?: string }` — already validated upstream; the function can trust types.
- Pipeline: see `design.md` §2.3 (lookup against `exams`, sort each user's exams by `submitted_at` desc, limit 3, add `last_exam_at`, sort users `last_exam_at` desc with `_id` tiebreaker, `$facet` for items + count).
- Use `.allowDiskUse(true)`.
- If `search` is falsy or only whitespace, omit the `$match`.
- Trim `search` before constructing the regex. Escape regex metacharacters (use a small inline `escapeRegex` helper — do not depend on lodash unless lodash is already in the repo).
- Output items shape per `design.md` §2.2.
- `totalPages` = `Math.max(1, Math.ceil(total / limit))`.

**Acceptance criteria:**
- File exports `aggregateExamUsers` (named export) and only that.
- No Express imports — pure service.
- File < 200 lines.
- Manual smoke: in a Mongo shell or via a quick repl, call with `{ page: 1, limit: 5 }` and confirm shape matches contract.

---

### 1.4 Add admin controller for exam users

**Repo:** `moso-aid` (base: `pro`)
**Files:** new file `src/controllers/exam-admin.controller.js` (preferred — keep separate from existing `exam.controller.js` since this is admin-only surface)

**Goal:** Express handler `listExamUsers(req, res, next)` that:
- Reads `page`, `limit`, `search` from `req.query` (apply defaults `page=1`, `limit=20`).
- Calls `aggregateExamUsers(...)` from §1.3.
- Wraps the result in the project's standard `ApiResponse<T>` success envelope (mirror what other moso-aid endpoints do — DO NOT invent a new envelope).
- On thrown error, passes to `next(err)` for the global error handler.

**Acceptance criteria:**
- Controller file < 100 lines.
- No business logic beyond defaults and envelope wrapping.
- Matches the export pattern of other controllers in `src/controllers/`.
- No semicolons unless that's the repo's existing style — match precedent.

---

### 1.5 Register `GET /api/exam/admin/users` route

**Repo:** `moso-aid` (base: `pro`)
**Files:** `src/routes/exam.routes.js` (or wherever existing `/api/exam/*` routes live — check the file that defines `GET /api/exam/:exam_id/result`)

**Goal:** Mount the new endpoint.

**Steps:**
1. Import the new validator (§1.2) and controller (§1.4).
2. Add: `router.get('/admin/users', examAdminValidator, validateRequest, examAdminController.listExamUsers)` (use whichever `validateRequest` shim the project already uses to convert `express-validator` results into 422 errors).
3. Ensure the route is registered BEFORE any catch-all like `GET /:exam_id/result` so `admin/users` isn't matched as an exam id.
4. Do NOT add auth middleware (deliberate — see proposal Risks R1).

**Acceptance criteria:**
- `curl 'http://localhost:<port>/api/exam/admin/users?page=1&limit=5'` returns a 200 with the documented JSON shape.
- `curl 'http://localhost:<port>/api/exam/admin/users?page=0'` returns 422.
- Existing exam routes (`/api/exam/:exam_id/result`, register, submit, etc.) still resolve correctly.

---

### 1.6 BE tests for admin exam users endpoint

**Repo:** `moso-aid` (base: `pro`)
**Files:** new test file under the repo's existing test directory (e.g. `tests/exam-admin.test.js` — match the directory convention used by other moso-aid tests; if there is no existing test suite, place under `tests/` and wire into `npm test`).

**Goal:** Cover the aggregation service AND the route at integration level.

**Test cases (minimum):**
1. Empty DB → 200, `items: []`, `total: 0`, `totalPages: 1`.
2. Seed 3 users, 2 with exams, 1 without → all three returned, no-exam user is last, `last_3_results: []` for the no-exam user.
3. Seed 1 user with 5 exams → only the 3 most recent appear in `last_3_results`, ordered desc by `submitted_at`.
4. Search by partial name (case-insensitive) → only matching users returned.
5. Search by partial email → only matching users returned.
6. Pagination: 25 users, `?page=2&limit=10` → returns users 11–20 in sort order, `total=25`, `totalPages=3`.
7. Validation: `?page=0` → 422; `?limit=500` → 422.

**Acceptance criteria:**
- All seven cases pass under `npm test`.
- Tests clean up their own seed data (or use an isolated test DB / in-memory Mongo per the repo's pattern).
- No flaky timing-based assertions.

---

### 1.7 BE smoke + lint pass

**Repo:** `moso-aid` (base: `pro`)

**Goal:** Final gate before merge.

**Steps:**
1. Run repo lint (whatever `npm run lint` is configured to do).
2. Run `npm test`.
3. Boot the app locally and hit the new endpoint with the three curl checks from §1.5 acceptance criteria.

**Acceptance criteria:**
- Lint clean.
- All tests green.
- Manual curl checks return expected shapes/codes.

---

## 2. Frontend (`lf-homepage`, base branch `production`, feature branch `feature/admin-safeexamcenter-results`)

> Workflow reminder: PR feature → `master` (auto-merge) AND feature → `release` (auto-merge); CREATE `release → production` PR but DO NOT MERGE — user merges manually. See `project_lf_homepage_branch_workflow`.

### 2.1 Add API client methods in `mosoAidApi.ts`

**Repo:** `lf-homepage` (base: `production`)
**Files:** `src/apis/mosoAidApi.ts`

**Goal:** Add typed helpers `getAdminExamUsers` and `getExamResultById` (if not present).

**Types to add (or reuse if equivalents exist):**
```ts
export type ExamPlanEnum =
  | 'within_1_week'
  | 'next_2_4_weeks'
  | 'next_4_8_weeks'
  | 'more_than_8_weeks'

export type AdminExamResult = {
  exam_id: string
  score: number
  total_correct: number
  total_questions: number
  passed: boolean
  status: string
  submitted_at: string
}

export type AdminExamUser = {
  user_id: string
  full_name: string
  email: string
  exam_plan: ExamPlanEnum | null
  last_exam_at: string | null
  last_3_results: AdminExamResult[]
}
```

**Helpers:**
- `getAdminExamUsers({ page, pageSize, search })` — calls `GET /api/exam/admin/users` using the file's existing request helper, mapping `pageSize → limit` on the wire. Return type matches the pagination envelope used elsewhere in the file (`PaginatedResponse<AdminExamUser>` or local equivalent).
- `getExamResultById(examId: string)` — calls `GET /api/exam/${examId}/result`. **If a similar helper already exists in the file (e.g. used by the borrower exam result page), REUSE IT and do NOT add a duplicate.**

**Acceptance criteria:**
- TypeScript compiles (`npx tsc --noEmit` if available, otherwise `npm run build` clean).
- No semicolons in new lines.
- File still < 500 lines after edits.
- All new types exported.

---

### 2.2 Add `useSafeExamFilterUrl` hook (URL-as-source state)

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/_components/useSafeExamFilterUrl.ts` (co-located with the route components)

**Goal:** Hook that reads/writes `page`, `pageSize`, and `search` to the URL via `useSearchParams` + `useRouter`. Pattern reference: `lf-iq`'s `useUserFilterUrl` (see memory `feedback_url_as_source_pattern`). Do NOT duplicate URL state into `useState`.

**Hook API:**
```ts
type FilterState = { page: number; pageSize: number; search: string }
type HookReturn = FilterState & {
  setSearch: (v: string) => void   // resets page to 1
  setPage: (p: number) => void
  refreshNonce: number             // increments on refresh() — passed to query key
  refresh: () => void
}
```

Defaults: `page=1`, `pageSize=20`, `search=''`. Use `pageSize` (not `limit`) — see `feedback_pagesize_naming`.

**Acceptance criteria:**
- Changing `search` updates the URL and resets `page` to 1.
- Page reload preserves filters from URL.
- `refresh()` does not mutate URL but causes the data hook (§2.3) to refetch.

---

### 2.3 Add `useSafeExamUsers` data hook

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/_components/useSafeExamUsers.ts`

**Goal:** Wrap `getAdminExamUsers` with TanStack React Query.

**Inputs:** `{ page, pageSize, search, refreshNonce }`.

**Behaviour:**
- Debounce the `search` input by 500 ms before issuing the request (use `useDebouncedValue` from `@mantine/hooks` if already in the repo; otherwise a tiny inline debounce).
- Query key: `['admin-exam-users', { page, pageSize, debouncedSearch, refreshNonce }]`.
- Return `{ data, loading, error, refetch }`.

**Acceptance criteria:**
- Typing in search triggers exactly one request 500 ms after the last keystroke.
- Changing page triggers an immediate refetch.
- `refresh()` from §2.2 forces a refetch even if other params unchanged.

---

### 2.4 Build `ExamResultBadge` component

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/_components/ExamResultBadge.tsx`

**Goal:** Render a single attempt as a click-to-open badge.

**Visual:**
- Passed (`passed === true && status === 'completed'`) → Mantine `Badge` color `green`, label `t('badge.passed', { score })`.
- Failed (`passed === false && status === 'completed'`) → Mantine `Badge` color `red`, label `t('badge.failed', { score })`.
- Expired (`status === 'expired'`) → Mantine `Badge` color `gray`, label `t('badge.expired')`.
- Other / unknown → grey neutral badge with the raw `status` (acts as safety net).

**Tooltip:** show `submitted_at` formatted with `dayjs` (e.g. `2026-05-20 14:32`).

**Click:** `NiceModal.show(ExamResultDetailModal, { examId: result.exam_id })`.

**Constraints:**
- Use Mantine `Badge` + Mantine `Tooltip`. No raw `<button>`. If clickability needs a wrapper, use Mantine `UnstyledButton` with Tailwind class names.
- No `<Stack>`, `<Group>`, `<Text>`, `<Title>` — use Tailwind layout.
- Null-safe: bail to a `—` span if `result` is falsy.
- File < 150 lines.

**Acceptance criteria:**
- All four status branches render correctly with seeded fixtures.
- Hover shows tooltip with formatted date.
- Click triggers `NiceModal.show` (mock and assert in a smoke test or manual check).

---

### 2.5 Build `ExamResultDetailModal`

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/_components/ExamResultDetailModal.tsx`

**Goal:** NiceModal-wrapped Mantine `Modal` that fetches `/api/exam/:exam_id/result` and renders the payload read-only.

**Behaviour:**
- Receives `{ examId: string }` props.
- On open, calls `getExamResultById(examId)` (from §2.1).
- While loading: Mantine `Loader` centered.
- On error: localized error message via `t('error.fetch_failed')` and a close button.
- On success: render the result fields. If the borrower-facing exam result page has a presenter/section component, REUSE it; otherwise inline-render with Tailwind layout.
- Header uses `t('modal.title')`, close button uses `t('modal.close')`.

**Constraints:**
- Wrap with `NiceModal.create`.
- No raw `<button>` for close — use Mantine `CloseButton` or `Modal`'s built-in close.
- File < 250 lines.

**Acceptance criteria:**
- Modal opens via `NiceModal.show(ExamResultDetailModal, { examId })`.
- Loading / error / success states each render correctly.
- Closing the modal cleans up state (no leaked subscriptions on re-open).

---

### 2.6 Build `ManageSafeExamCenterClient`

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/_components/ManageSafeExamCenterClient.tsx`

**Goal:** The list page itself. Mantine `Table` with 4 columns:

1. **Name** — `full_name`. Null-safe fallback `—`.
2. **Email** — `email`.
3. **Closest option** — translated `exam_plan` via `t(\`exam_plan.${user.exam_plan}\`)`; `—` if null.
4. **Last 3 attempts** — `last_3_results.map(r => <ExamResultBadge result={r} />)`; if array empty, `—`.

**Toolbar:**
- Mantine `TextInput` for search (placeholder via `t('search_placeholder')`), value bound to `search` from §2.2, on change calls `setSearch`. Locked with `disabled={loading}`.
- Mantine `ActionIcon` "Refresh" with `disabled={loading}` and on-click calls `refresh()`.

**Pagination:** Mantine `Pagination` at the bottom, `total = totalPages`, `value = page`, on-change calls `setPage`. Locked with `disabled={loading}`.

**Loading UX (BOTH required):**
- Wrap the data area in a `<div className={\`transition-opacity \${loading ? 'opacity-60' : ''}\`} aria-busy={loading}>`.
- Toolbar inputs and pagination disabled while loading.
- (Reference: `feedback_admin_v2_refresh_ux`.)

**Empty state:** When `!loading && items.length === 0` show `t('empty_state')`.

**Constraints:**
- `'use client'` at the top.
- No semicolons.
- No raw `<button>`; no `<Stack>`/`<Group>`/`<Text>`/`<Title>`.
- Tailwind for layout; no inline `style={{}}`.
- All visible strings via `useTranslations('ManageSafeExamCenter')`.
- File < 400 lines — extract helpers/sub-components if approaching the cap.

**Acceptance criteria:**
- Table renders with mocked API data (4 columns).
- Search debounce works (one request after 500 ms idle).
- Refresh button triggers a refetch and dims the table during loading.
- Pagination jumps to the requested page.
- Switching locale changes all visible strings (smoke check for 2+ locales).

---

### 2.7 Add `page.tsx` route with `x-moso-user-id` gate

**Repo:** `lf-homepage` (base: `production`)
**Files:** new file `src/app/[locale]/(private)/manage-safeexamcenter/page.tsx`

**Goal:** Server component that enforces the admin gate exactly like `manage-event` does.

**Steps:**
1. Read the existing `src/app/[locale]/(private)/manage-event/page.tsx` (or equivalent) to learn the precise gate mechanism (`cookies()` vs `headers()` vs server-side fetch).
2. Reproduce that gate 1:1 — DO NOT invent a new one. If no `x-moso-user-id` is present, `redirect('/')` (or the same redirect target `manage-event` uses).
3. Render `<ManageSafeExamCenterClient />`.
4. Add page-level metadata (title) via Next.js `generateMetadata` if `manage-event` does, otherwise skip.

**Acceptance criteria:**
- Hitting the route without the gate header/cookie redirects.
- Hitting it with the header/cookie renders the client component.
- Gate behaviour is identical to `manage-event` (no false positives/negatives).

---

### 2.8 Add i18n keys for all 5 locales

**Repo:** `lf-homepage` (base: `production`)
**Files:** all 5 locale files under `src/messages/` (`en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`)

**Goal:** Add the `ManageSafeExamCenter` namespace with the keys listed in `design.md` §3.9.

**Steps:**
1. For each locale file, add a top-level `"ManageSafeExamCenter": { ... }` block.
2. English values come from the table in `design.md` §3.9.
3. Other locales: provide translations (if you can produce confident translations) OR mirror English with a `[TODO: translate]` note in a comment-free JSON way: use English as a fallback so the UI is still usable; flag translation gaps in the PR description.
4. Ensure JSON validity (no trailing commas, no missing brackets).

**Acceptance criteria:**
- All 5 files contain the full key set.
- `npm run build` passes.
- No hardcoded English strings remain in the new FE components.

---

### 2.9 FE smoke + lint + build pass

**Repo:** `lf-homepage` (base: `production`)

**Goal:** Final gate before PRs.

**Steps:**
1. `npx tsc --noEmit` (or repo's `npm run typecheck` if defined).
2. `npm run lint`.
3. `npm run build`.
4. Manual: boot the app, sign in as an admin, hit `/manage-safeexamcenter`, exercise search, pagination, refresh, and badge click in at least 2 locales.

**Acceptance criteria:**
- All three commands exit 0.
- Manual checklist completed; screenshots attached to the PR if practical.
- No console errors in the browser during the manual run.

---

## 3. Cross-cutting

### 3.1 Open PRs and merge per workflow

**Repos:** both.

**moso-aid:**
- Open PR from `feature/admin-exam-results` → `pro`. Standard review, then merge.

**lf-homepage:**
- Open PR from `feature/admin-safeexamcenter-results` → `master` (auto-merge).
- Open PR from `feature/admin-safeexamcenter-results` → `release` (auto-merge).
- Open PR from `release` → `production` and LEAVE IT OPEN — the user merges manually.

**Acceptance criteria:**
- All three PRs exist with linked descriptions.
- The `release → production` PR is NOT merged by an agent.

---

## 4. Notes for the dev-lead

- Section 1 (BE) and Section 2 (FE) can run in parallel after §2.1 is unblocked by §1.5 being defined (the contract is locked by the design doc, so FE can start against a mock).
- §1.6 (BE tests) depends on §1.3–§1.5 being merged into the feature branch.
- §2.6 depends on §2.1, §2.2, §2.3, §2.4. §2.5 is independent of §2.6 but consumed by §2.4 at click-time.
- §2.7 depends on §2.6.
- §2.8 can be done in parallel with §2.6 once the key list is locked (it is, in `design.md` §3.9).
- §1.7 and §2.9 are the final gates per repo.

---

## Fix Tasks — Round 1

> TESTER validation found two FE runtime bugs after §2.9 gate. Both fixes target `lf-homepage` only. Branch from `agent/8c88.2.9-fe-final-gate` (which contains all FE work merged) onto a new fix branch — DEV Lead will name it (suggested: `agent/<bead-id>-fix-admin-exam-users-runtime`). Re-target PRs to `master` + `release` per the standard `lf-homepage` workflow (see `project_lf_homepage_branch_workflow`).

### FIX 1. Fix API response parser in `mosoAidApi.getAdminExamUsers`

**Repo:** `lf-homepage` (base: `production`)
**Fix branch parent:** `agent/8c88.2.9-fe-final-gate`
**Files:** `src/apis/mosoAidApi.ts` (lines 241–253 in current state — `getAdminExamUsers` function)
**Originated from:** task §2.1

**Problem (from TESTER):**
The frontend currently parses the response of `GET /api/exam/admin/users` as:
```ts
{ data: AdminExamUser[], pagination: { page, total, totalPages } }
```
But the backend (see §1.4 controller + project-standard `ApiResponse<T>` envelope) actually returns:
```ts
{ success: true, data: { items: AdminExamUser[], page: number, limit: number, total: number, totalPages: number } }
```
At runtime, `body.data` is an object — not an array — and `body.pagination` is `undefined`. The admin table renders empty / crashes.

**Required fix:**
Update `getAdminExamUsers` so that after parsing the response body it returns the shape used elsewhere in the FE (the pagination envelope already documented in §2.1). Specifically:
- Read items from `body.data.items` (array).
- Read `total` from `body.data.total`.
- Read `page` from `body.data.page`.
- Read `totalPages` from `body.data.totalPages`.
- Read `limit` from `body.data.limit` and expose it on the returned object as `pageSize` (per `feedback_pagesize_naming` — downstream consumers use `pageSize`, not `limit`).
- If `body.success === false`, throw an error using the existing error-handling pattern in this file (look at neighboring helpers — do NOT invent a new error shape).
- Null-safety: if `body.data` is missing or `body.data.items` is not an array, return `{ items: [], total: 0, page: 1, totalPages: 1, pageSize }` rather than throwing (defensive — matches `feedback_null_checks`).

**Out of scope:**
- Do NOT change the wire-level request (the `pageSize → limit` mapping on the URL stays as-is per §2.1).
- Do NOT touch unrelated helpers in this file.

**Acceptance criteria:**
- Function reads `body.data.items` (not `body.data`) for the array.
- Returned object exposes `pageSize` (mapped from `body.data.limit`), `total`, `page`, `totalPages`, `items`.
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- Manual smoke (after FIX 2 also applied): admin lands on `/manage-safeexamcenter`, sees a populated table, pagination shows the correct total.
- No console errors in the browser during the manual run.

---

### FIX 2. Remove exam-session token gate in `useSafeExamUsers`

**Repo:** `lf-homepage` (base: `production`)
**Fix branch parent:** `agent/8c88.2.9-fe-final-gate`
**Files:** `src/app/[locale]/(private)/manage-safeexamcenter/_components/useSafeExamUsers.ts` (line 40 in current state — the `enabled: !!token` clause and its `useExamAuth()` source)
**Originated from:** task §2.3

**Problem (from TESTER):**
The data hook currently does:
```ts
const { token } = useExamAuth()
// ...
useQuery({
  // ...
  enabled: !!token,
})
```
But:
- The admin endpoint `GET /api/exam/admin/users` is intentionally unauthenticated at the network layer (see proposal Risks R1 — admin gating is enforced upstream at the page level via the `x-moso-user-id` cookie/header in §2.7, NOT via the exam taker's JWT).
- `useExamAuth()` returns the SafeExamCenter **exam taker** session token. Admin users (loan officers / staff) typically do NOT have a SafeExamCenter exam session cookie — they have an admin session.
- Result: `enabled` stays `false`, no request fires, admin sees an empty page indefinitely.

**Required fix (option A — preferred):**
Remove the exam-session dependency entirely from this hook.
1. Delete the `useExamAuth()` import and call.
2. Delete the `enabled: !!token` line from the `useQuery` config (let the query run by default; it will already be gated by changes to other params and by React Query's normal lifecycle).
3. If `getAdminExamUsers` currently requires a `token` argument because of `useExamAuth` plumbing, drop that argument at the call site here. If FIX 1's signature still accepts an optional token, pass `undefined`.
4. If the API client signature in `src/apis/mosoAidApi.ts` (`getAdminExamUsers`) currently *requires* a token parameter, relax it to accept `token?: string | null` and skip attaching any `Authorization` header when token is falsy. (Coordinate with FIX 1 in the same PR — both touch related code.)

**Do NOT:**
- Do NOT keep `enabled: !!token` and silently set `token = ''` — that's a footgun. Make the absence of a token explicit at the type level.
- Do NOT add an auth header that the backend does not expect.
- Do NOT touch the page-level admin gate in §2.7 — that gate is correct and remains the source of admin authorization.

**Acceptance criteria:**
- `useSafeExamUsers` no longer imports or calls `useExamAuth`.
- The query fires on mount without requiring any SafeExamCenter exam-taker token.
- `getAdminExamUsers` is invoked with no token (or `undefined` token).
- Admin user (gated upstream by `x-moso-user-id`) lands on `/manage-safeexamcenter` and the API request fires immediately; the table populates (combined with FIX 1).
- Search + pagination + refresh still work — debounce behavior from §2.3 is preserved.
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- `npm run lint` clean.

---

### Cross-cutting for Round 1 fixes

- Both fixes should land in a SINGLE fix branch + single commit (they're related and the manual smoke check requires both).
- After fixes are pushed, open PRs per the standard `lf-homepage` workflow: `master` (auto-merge) + `release` (auto-merge) + `release → production` (LEAVE OPEN).
- TESTER will re-run validation on the merged result before declaring the change complete.
