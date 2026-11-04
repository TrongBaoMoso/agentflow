# Design: Admin SafeExamCenter Results

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  lf-homepage  (Next.js 14, App Router, Mantine 7)           │
│                                                             │
│  app/[locale]/(private)/manage-safeexamcenter/              │
│    page.tsx                  ← server: x-moso-user-id gate  │
│      └─ ManageSafeExamCenterClient.tsx                      │
│           ├─ Mantine Table (4 columns)                      │
│           ├─ ExamResultBadge × ≤3 per row                   │
│           ├─ Toolbar: search (debounce 500ms) + refresh     │
│           └─ ExamResultDetailModal (NiceModal)              │
│                                                             │
│  apis/mosoAidApi.ts                                         │
│    ├─ getAdminExamUsers({ page, limit, search })            │
│    └─ getExamResultById(examId)  (reuse if present)         │
└─────────────────────────────────────────────────────────────┘
                          │ HTTPS (JSON, ApiResponse envelope)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  moso-aid  (Node.js 22, Express, MongoDB)                   │
│                                                             │
│  routes/exam.routes.js                                      │
│    GET /api/exam/admin/users                                │
│      → exam-admin.controller.js::listExamUsers              │
│         (express-validator middleware)                      │
│           → exam-admin.service.js::aggregateExamUsers       │
│              → Mongo aggregation pipeline                   │
│                                                             │
│  GET /api/exam/:exam_id/result  (existing — reused)         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐    ┌─────────┐
                  │  ExamUser    │    │  Exam   │
                  │  (registry)  │    │ (attempt│
                  └──────────────┘    │   log)  │
                                      └─────────┘
```

## 2. Backend Design (`moso-aid`)

### 2.1 Files

| Path | Purpose |
|------|---------|
| `src/controllers/exam-admin.controller.js` | New. Request validation, calls service, returns `ApiResponse<PaginatedAdminExamUsers>`. |
| `src/services/exam-admin.service.js` | New. Builds and runs the aggregation pipeline; pure logic, no Express imports. |
| `src/routes/exam.routes.js` | Modify. Mount `GET /admin/users` route with `express-validator` middleware. |
| `src/validators/exam-admin.validator.js` | New (or inline in route). Validates `page`, `limit`, `search`. |
| `src/models/Exam.js` | Verify only. Confirm compound index on `(user_id, submitted_at: -1)`; add if missing. |

### 2.2 Endpoint contract

`GET /api/exam/admin/users`

Query params:

| Name | Type | Default | Constraints |
|------|------|---------|-------------|
| `page` | int | `1` | `>= 1` |
| `limit` | int | `20` | `1..100` |
| `search` | string | – | optional, trimmed, max 200 chars |

Success response (HTTP 200, `ApiResponse<T>` envelope):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user_id": "65aab...",
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "exam_plan": "within_1_week",
        "last_exam_at": "2026-05-20T14:32:11.000Z",
        "last_3_results": [
          {
            "exam_id": "65bef...",
            "score": 85,
            "total_correct": 17,
            "total_questions": 20,
            "passed": true,
            "status": "completed",
            "submitted_at": "2026-05-20T14:32:11.000Z"
          }
        ]
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7
  },
  "message": null
}
```

Error responses use the existing `ApiResponse` error shape (e.g. validation → 422 with `errors` array). Endpoint does NOT require auth (see proposal Risks R1).

### 2.3 Aggregation pipeline (pseudocode)

```js
// exam-admin.service.js
async function aggregateExamUsers({ page, limit, search }) {
  const matchStage = search
    ? {
        $match: {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email:     { $regex: search, $options: 'i' } },
          ],
        },
      }
    : null

  const pipeline = [
    ...(matchStage ? [matchStage] : []),

    // Join recent exams
    {
      $lookup: {
        from: 'exams',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$user_id', '$$uid'] } } },
          { $sort: { submitted_at: -1 } },
          { $limit: 3 },
          {
            $project: {
              _id: 0,
              exam_id: '$_id',
              score: 1,
              total_correct: 1,
              total_questions: 1,
              passed: 1,
              status: 1,
              submitted_at: 1,
            },
          },
        ],
        as: 'last_3_results',
      },
    },

    // Derive last_exam_at for sort
    {
      $addFields: {
        last_exam_at: {
          $cond: [
            { $gt: [{ $size: '$last_3_results' }, 0] },
            { $arrayElemAt: ['$last_3_results.submitted_at', 0] },
            null,
          ],
        },
      },
    },

    // Sort: users with recent activity first; nulls last
    {
      $sort: {
        last_exam_at: -1,
        _id: 1, // stable tiebreaker
      },
    },

    // Project final shape
    {
      $project: {
        _id: 0,
        user_id: '$_id',
        full_name: 1,
        email: 1,
        exam_plan: 1,
        last_exam_at: 1,
        last_3_results: 1,
      },
    },

    // Facet for items + total in one round-trip
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        meta:  [{ $count: 'total' }],
      },
    },
  ]

  const [result] = await ExamUser.aggregate(pipeline).allowDiskUse(true)
  const total = result?.meta?.[0]?.total ?? 0

  return {
    items: result?.items ?? [],
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}
```

Notes:

- `$sort` after `$addFields` puts `null` last in descending sort in MongoDB (verified behaviour for `-1` direction places nulls after real values when paired with a tiebreaker; if behaviour differs in our Mongo version, add `{ $sort: { has_results: -1, last_exam_at: -1, _id: 1 } }` with `has_results = { $cond: [...] }`).
- `allowDiskUse(true)` defends against large `ExamUser` sets.
- `$facet` keeps round-trips to one but the pipeline is duplicated internally — acceptable at expected volumes; revisit if perf flags.

### 2.4 Validation

```js
// validators
[
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim().isLength({ max: 200 }),
]
```

Invalid input → 422 via existing validation error handler.

### 2.5 Index strategy

Run a one-time check (and add if missing):

```js
// On Exam model
ExamSchema.index({ user_id: 1, submitted_at: -1 })
```

If the existing `Exam` schema already defines this, no change is needed beyond a code comment in the migration task explaining why.

## 3. Frontend Design (`lf-homepage`)

### 3.1 Component tree

```
app/[locale]/(private)/manage-safeexamcenter/
├─ page.tsx                                    (server component, gate)
└─ _components/
   ├─ ManageSafeExamCenterClient.tsx           (client, owns state)
   │   ├─ <SearchInput debounce={500} />       (Mantine TextInput)
   │   ├─ <RefreshButton />                    (Mantine ActionIcon)
   │   ├─ <Table>                              (Mantine Table, 4 cols)
   │   │   └─ rows × Page
   │   │       ├─ Name cell
   │   │       ├─ Email cell
   │   │       ├─ ExamPlanLabel  (enum → i18n)
   │   │       └─ <ExamResultBadge[]> (up to 3, or "—")
   │   └─ <Pagination />                       (Mantine Pagination)
   ├─ ExamResultBadge.tsx                      (badge + tooltip; click → modal)
   └─ ExamResultDetailModal.tsx                (NiceModal, fetches detail)
```

### 3.2 Auth gate (`page.tsx`)

Mirror `manage-event` precedent:

```tsx
// pseudocode
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ManageSafeExamCenterClient from './_components/ManageSafeExamCenterClient'

export default async function Page() {
  const userId =
    cookies().get('x-moso-user-id')?.value ??
    headers().get('x-moso-user-id')

  if (!userId) {
    redirect('/')
  }

  return <ManageSafeExamCenterClient />
}
```

(If `manage-event` uses a slightly different mechanism, follow that file 1:1 — DEV must inspect and match precedent.)

### 3.3 State model

URL is the source of truth for `page`, `pageSize` (always 20 in v1 but use the canonical name), and `search` — following the `useUserFilterUrl` pattern referenced in `feedback_url_as_source_pattern`. No duplicating into `useState` + `useEffect` sync.

```tsx
// pseudocode
const { page, pageSize, search, setSearch, setPage, refresh } =
  useSafeExamFilterUrl()

const { data, loading } = useSafeExamUsers({ page, pageSize, search })
```

`pageSize` (NOT `limit`) per `feedback_pagesize_naming`. API helper translates `pageSize → limit` when calling the BE.

### 3.4 API helpers (`src/apis/mosoAidApi.ts`)

```ts
export type AdminExamResult = {
  exam_id: string
  score: number
  total_correct: number
  total_questions: number
  passed: boolean
  status: 'completed' | 'expired' | 'in_progress' | string
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

export async function getAdminExamUsers(params: {
  page: number
  pageSize: number
  search?: string
}): Promise<PaginatedResponse<AdminExamUser>> {
  return requestPaginated('/api/exam/admin/users', {
    page: params.page,
    limit: params.pageSize,
    search: params.search?.trim() || undefined,
  })
}

export async function getExamResultById(examId: string) {
  return request(`/api/exam/${examId}/result`)
}
```

### 3.5 `ExamResultBadge`

- Props: `result: AdminExamResult`.
- Visual rules:
  - `passed === true && status === 'completed'` → green badge `✓ {score}%`.
  - `passed === false && status === 'completed'` → red badge `✗ {score}%`.
  - `status === 'expired'` → grey badge `Expired`.
  - Otherwise → grey neutral (`status` raw).
- Below the badge or via tooltip: `submitted_at` formatted via `dayjs`.
- `onClick` → `NiceModal.show(ExamResultDetailModal, { examId: result.exam_id })`.
- Use Mantine `Badge` + `Tooltip` only — no raw `<button>`, no inline `style={{}}`.

### 3.6 `ExamResultDetailModal`

- Built with `@ebay/nice-modal-react`.
- On open, calls `getExamResultById(examId)` and shows loading state.
- Renders the existing detail payload (read-only). Display strategy: reuse whatever the borrower-facing exam result page already renders, if a presenter component exists; otherwise plain Mantine `Stack`-like layout built with Mantine cards (without using the `Stack` component — see Mantine rules).
- Close on backdrop or close icon.

### 3.7 Loading UX

```tsx
<div
  className={`transition-opacity ${loading ? 'opacity-60' : ''}`}
  aria-busy={loading}
>
  <Toolbar disabled={loading} />
  <Table>{/* rows */}</Table>
</div>
```

Both the dim AND the toolbar disable are required — see `feedback_admin_v2_refresh_ux`.

### 3.8 Data flow

```
URL params  ──► useSafeExamFilterUrl ──►
                          │
                          ▼
                  useSafeExamUsers ──► mosoAidApi.getAdminExamUsers
                          │                    │
                          ▼                    ▼
                  Table renders     GET /api/exam/admin/users
                          │
              click badge ▼
              NiceModal.show
                          │
                          ▼
                ExamResultDetailModal ──► mosoAidApi.getExamResultById
                                                  │
                                                  ▼
                                         GET /api/exam/:exam_id/result
```

### 3.9 i18n keys

Namespace: `ManageSafeExamCenter`. Add for `en`, `es`, `vi`, `zh`, `he`.

| Key | English value (sample) |
|-----|------------------------|
| `page_title` | "SafeExamCenter Results" |
| `search_placeholder` | "Search by name or email" |
| `refresh` | "Refresh" |
| `column_name` | "Name" |
| `column_email` | "Email" |
| `column_exam_plan` | "Closest option" |
| `column_recent_results` | "Last 3 attempts" |
| `no_results` | "—" |
| `empty_state` | "No registrants yet." |
| `loading` | "Loading…" |
| `exam_plan.within_1_week` | "Within 1 week" |
| `exam_plan.next_2_4_weeks` | "In 2–4 weeks" |
| `exam_plan.next_4_8_weeks` | "In 4–8 weeks" |
| `exam_plan.more_than_8_weeks` | "More than 8 weeks away" |
| `badge.passed` | "Passed {score}%" |
| `badge.failed` | "Failed {score}%" |
| `badge.expired` | "Expired" |
| `modal.title` | "Exam result" |
| `modal.close` | "Close" |
| `error.fetch_failed` | "Failed to load results." |

Keys are `snake_case` inside the `CamelCase` namespace per project rule.

## 4. Conventions

- **No semicolons** in `lf-homepage` files (existing style).
- **No raw HTML buttons** anywhere; Mantine `Button` / `ActionIcon` only.
- **No `<Stack>`, `<Group>`, `<Text>`, `<Title>`** — use Mantine primitives that are not on the banned list, or plain divs with Tailwind.
- **Tailwind for layout**; no inline `style={{}}`.
- **Null safety**: every `last_3_results` access uses `?.` and `?? []`.
- **File budget**: each file < 500 lines; if a file grows, split helpers into siblings.
- **Beads tracking**: each task in `tasks.md` becomes a Beads issue managed by `dev-lead`.

## 5. Testing Plan (summary, expanded in `tasks.md`)

- **BE unit/integration**: existing test runner. Add tests for the new service covering: empty result set, search hit, pagination boundary, user with zero exams, sort order with null `last_exam_at`.
- **FE component-ish smoke**: render the client component with mocked API and assert table headers + a single row's badges; assert toolbar disabled and `aria-busy` while loading.
- **Manual QA checklist** for the `tester` agent: search, paginate, refresh, modal open/close, locale switch in all 5 languages.
