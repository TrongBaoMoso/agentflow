# Design: Admin Reports V2 Redesign + Save-Without-Resend

Target repo: `lf-iq`
Feature branch: `feature/admin-reports-v2-redesign` (from `production`)
Primary surface: frontend. Backend is verification-only (no schema or endpoint changes).

---

## 1. Architecture Decisions

### 1.1 Route and Version Switching

- URL stays `/admin/reports`. No new URL, no new route group.
- `src/app/[locale]/(admin)/admin/reports/page.tsx` becomes a thin orchestrator that calls `withUIVersion(importV1, importV2)`, exactly like `admin/dashboard/page.tsx` and `admin/users/page.tsx` already do.
- `importV1` lazy-loads the **existing** monolithic component (moved verbatim into `./_v1/ReportsPage/index.tsx`).
- `importV2` lazy-loads the new `./_v2/ReportsPage/index.tsx`.
- `withUIVersion()` reads `uiVersionAtom` from `@jotai/atom/uiVersionState`; components do NOT read the atom directly.
- Both bundles are dynamically imported via `next/dynamic` so only the active version ships to the browser.

**Why**: matches the established pattern; avoids manual branching inside components; keeps v1 unchanged as fallback.

### 1.2 Detail-View Routing Within V2

The existing `admin/reports/page.tsx` is list-only today. V2 needs a detail + edit flow. Two options were considered:

| Option | Pros | Cons |
|---|---|---|
| **A. Sub-route `/admin/reports/[id]`** | Clean URLs, back-button works, shareable links | New route file, more wiring |
| B. Modal / slide-over for detail + edit | Lives inside the list page, no new route | URL state lost on refresh, harder to open external link, conflicts with existing audit-log / tracking-detail modals |

**Decision: Option A.** New route file at `src/app/[locale]/(admin)/admin/reports/[id]/page.tsx`, also using `withUIVersion()`. V1 side of the `[id]` route just redirects back to `/admin/reports` (there is no v1 detail page today); v2 side renders the detail component. This keeps URL-shareable deep-links and is consistent with homeowners-v2's detail flow.

### 1.3 Edit Scope Mapping

Per adopted defaults (Proposal §Applied Decisions):

| Card | Admin V2 Mode |
|---|---|
| ContactInfo (first_name, last_name, email, phone) | **editable** |
| PropertyInfoCard (address, beds, baths, sqft, year_built, lot_size) | **editable** (subset mirrored from homeowners-v2 edit form) |
| HomeValueCard | read-only |
| MortgageCard | read-only |
| CreditRatingCard | read-only |
| AgentCard | read-only |

Each editable card owns its own Edit / Save / Cancel state independently (matches the homeowners-v2 card-level edit pattern). A card in edit mode shows both save buttons in its footer:

```
[ Cancel ]                     [ Save Only ]  [ Save & Resend ]
                                   gray           orange (primary)
```

**Both buttons are ALWAYS visible**, regardless of whether the report has SEND_MAIL history. This is a deliberate simplification from an earlier design that hid `[Save & Resend]` on never-sent reports — the user-facing intent is clearer when the admin always sees both options and chooses explicitly. The `[Save Only]` label (formerly `[Save]`) was chosen to make the no-notification intent unambiguous at a glance.

### 1.4 Save API Contract

FE helper (already parameterized):

```ts
// src/apis/private-api.ts:68
export const updateReport = async (id: string, body: any, notification?: string) => {
  return apiPrivate.PATCH(`${PREFIX_LFIQ}/reports/${id}${notification ? `?notification=${notification}` : ''}`, { body })
}
```

- `[Save Only]` → `updateReport(id, body)` → PATCH request shape **TBD (pending Phase 7.0 verification)**: either no `notification` param at all, OR explicit `?notification=NULL`. dev-be must report which shape BE accepts before Phase 4 starts.
- `[Save & Resend]` → `updateReport(id, body, 'ALL')` → PATCH with `?notification=ALL`.

**Open decision — Save-Only request shape** (resolved by Phase 7.0):

| Option | URL | Body |
|---|---|---|
| A | `PATCH /reports/{id}` (no param) | body only |
| B | `PATCH /reports/{id}?notification=NULL` | body only |
| C | Both work identically | body only |

Blocks Phase 4. See tasks.md §7.0 for the verification protocol.

BE behavior (to be verified, not modified):

- `ReportController.java:65` routes PATCH to `ReportFacadeImpl.updateReport`. Phase 7.0 inspects whether `notification` is `@RequestParam` (required) or `@RequestParam(required=false)`.
- `ReportFacadeImpl.java:125`: when `notificationType` is null, the notification branch is skipped — no email, no device push, no tracking side effect.
- Audit-log entry is written unconditionally on any PATCH.

### 1.5 Post-Send Edit Indicator (FE-Derived)

No new BE field. The FE derives "edited after send" as:

```ts
const firstSendEvent = report.calculate_actions
  ?.find((a) => a.event === 'SEND_MAIL')
const firstSendTimestamp = firstSendEvent?.first_occurred_at   // if present
  ?? firstSendEvent?.created_at                                // fallback
  ?? null
const lastModified = report.last_modified_date?.timestamp ?? null

const wasEditedAfterSend =
  firstSendTimestamp != null
  && lastModified != null
  && lastModified > firstSendTimestamp
```

**Data-shape verification task** (Phase 7): confirm the actual field names returned by `getReports()` for the first-send timestamp. If neither `first_occurred_at` nor `created_at` is present on calculate_actions entries, use the `tracking-detail` endpoint (already proxied by the list's tracking modal) to fetch individual SEND_MAIL events. Fallback strategy: if no timestamp is available on calculate_actions, only show the badge when `last_modified_date` differs from `created_date` AND the report has `sendMailCount > 0` (weaker signal, but safe).

Badge UX:
- List: small rounded badge after the modified-date badge, text `t('AdminReportsV2.edited_after_send')`, color amber, tooltip `t('AdminReportsV2.edited_on', { date })`.
- Detail header: same badge next to the report title.

### 1.6 Folder Structure

```
src/app/[locale]/(admin)/admin/reports/
├── page.tsx                              # thin wrapper, calls withUIVersion()
├── [id]/
│   └── page.tsx                          # thin wrapper, calls withUIVersion()
├── _v1/
│   └── ReportsPage/
│       └── index.tsx                     # verbatim copy of current page.tsx logic
└── _v2/
    ├── ReportsPage/
    │   └── index.tsx                     # v2 list orchestrator
    ├── ReportDetailPage/
    │   └── index.tsx                     # v2 detail + edit orchestrator
    ├── _components/
    │   ├── ReportsHeader.tsx             # title + subtitle block
    │   ├── ReportsStatStrip.tsx          # dashboard-v2 style stat cards
    │   ├── ReportsToolbar.tsx            # search + date range + status/source filter + refresh + clear
    │   ├── ReportsBulkBar.tsx            # shows when rows selected (status change menu + delete)
    │   ├── ReportsTable.tsx              # GeneralTable wrapper with v2 columns
    │   ├── ReportRowSummary.tsx          # property thumbnail + name + email + address + date badges + post-send-edit badge
    │   ├── ReportStatusMenu.tsx          # single-row status change menu (v2 styling)
    │   ├── DetailHeader.tsx              # title + status pill + post-send-edit badge + back button
    │   ├── ContactInfoCard.tsx           # editable; Edit/Save/Cancel + two save buttons
    │   ├── PropertyInfoEditableCard.tsx  # editable; Edit/Save/Cancel + two save buttons
    │   ├── PropertyDetailsReadOnly/      # clones of homeowners-v2 read-only cards
    │   │   ├── HomeValueCard.tsx
    │   │   ├── MortgageCard.tsx
    │   │   ├── CreditRatingCard.tsx
    │   │   └── AgentCard.tsx
    │   └── SaveWithResendButtons.tsx     # shared [Save] + [Save & Resend] component
    └── _hooks/
        ├── useReportsQuery.ts            # list fetch + filter state (URL-synced)
        ├── useReportStatistics.ts        # stat strip data
        ├── useReportDetail.ts            # single-report fetch
        ├── useReportEdit.ts              # edit state (which card in edit mode) + submit handler
        └── useEditedAfterSend.ts         # FE derivation helper
```

### 1.7 State Management

| Concern | Tool |
|---|---|
| Filter / pagination state (list page) | `useUrlParams` (existing) — mirror v1 behavior |
| Row selection (bulk ops) | local `useState` in ReportsPage |
| Stat snapshot | local `useState` in `useReportStatistics` |
| Detail / edit state | local `useState` in `useReportEdit` per card |
| Form state | `react-hook-form` + `joi` (existing pattern — do **not** introduce Zod/Yup) |
| UI version | existing `uiVersionAtom` (Jotai) — read only via `withUIVersion()` |
| Modals (audit log, tracking detail, bulk delete confirm) | existing `useModal` hook |

### 1.8 Data Fetching

- List: `getReports({ pageSize, currentPage, search, filter })` — same call as v1.
- Statistics: `getStatisticsSnapshot('REPORT')` — same call as v1.
- Detail: reuse the same `getReports` call with `filter=id eq "<id>"` **OR** introduce `getReport(id)` if a single-report endpoint already exists. Phase 1 task includes a probe: check `private-api.ts` for an existing `getReport(id)` helper; if none, use the filtered list call.
- Update: `updateReport(id, body, notification?)` — existing helper.
- Bulk ops: `deleteReports(ids)` and `updateReportsStatus(ids, status)` — same calls as v1.

---

## 2. Visual Language Tokens

Match homeowners-v2 + dashboard-v2 exactly. No new tokens. Reuse existing Tailwind classes.

| Element | Token |
|---|---|
| Card border | `border border-[#e5e7eb] rounded-[12px]` |
| Card bg | `bg-white` |
| Card padding | `p-[20px]` |
| Section title | `text-[16px] font-semibold text-[#111827]` |
| Field label | `text-[12px] text-[#6b7280] uppercase tracking-wide` |
| Field value | `text-[14px] text-[#111827]` |
| Primary CTA | orange-600 filled (`bg-[#ea580c] hover:bg-[#c2410c] text-white`) |
| Secondary CTA | gray border (`border border-[#d1d5db] text-[#374151] bg-white hover:bg-[#f9fafb]`) |
| Danger CTA | red-600 filled |
| Status pill ACTIVE | green |
| Status pill INACTIVE / UNSUBSCRIBED | gray |
| Status pill PROCESSING | blue |
| Status pill AWAITING_SEND | yellow |
| Status pill FAILED | red (with tooltip) |
| Status pill SPAM | orange |
| Edited-after-send badge | amber border + amber text |

All layout/spacing via Tailwind classes. **No `style={{}}` inline objects.** **No Mantine `Stack`, `Group`, `Text`, `Title`.** Use `<div>`, `<p>`, `<h1/h2/h3>` with Tailwind.

---

## 3. Data Flow

### 3.1 List screen

```
page.tsx (withUIVersion)
  └─ _v2/ReportsPage
       ├─ useReportsQuery()   ── getReports()          ── setState(data, total)
       ├─ useReportStatistics()── getStatisticsSnapshot('REPORT')
       ├─ ReportsHeader
       ├─ ReportsStatStrip    ── onClick → setFilter → refetch
       ├─ ReportsToolbar      ── debounced search, date range, status/source, clear, refresh
       ├─ ReportsBulkBar (conditional)  ── bulk status / delete
       └─ ReportsTable
            └─ ReportRowSummary  ── post-send-edit badge (derived via useEditedAfterSend)
            └─ ReportStatusMenu  ── single-row status change
            └─ row-click → router.push(`/admin/reports/${id}`)
```

### 3.2 Detail + edit screen

```
[id]/page.tsx (withUIVersion)
  └─ _v2/ReportDetailPage
       ├─ useReportDetail(id)
       ├─ DetailHeader (title, status pill, post-send-edit badge, back button)
       ├─ ContactInfoCard           ── editable
       ├─ PropertyInfoEditableCard  ── editable
       ├─ HomeValueCard             ── read-only
       ├─ MortgageCard              ── read-only
       ├─ CreditRatingCard          ── read-only
       └─ AgentCard                 ── read-only
```

### 3.3 Edit submit flow (ContactInfoCard or PropertyInfoEditableCard)

```
user clicks [Edit]
  → card enters edit mode (react-hook-form form reset with current values)
user edits fields
user clicks [Cancel]        → form reset, exit edit mode
user clicks [Save Only]     → validate (joi) → updateReport(id, body, <shape-from-7.0>) → on success: toast "Saved", exit edit mode, refetch detail
user clicks [Save & Resend] → validate (joi) → updateReport(id, body, 'ALL')            → on success: toast "Saved and notification sent", exit edit mode, refetch detail
  → on error: extractErrorMessage → notifyError; stay in edit mode
```

**Both buttons are always rendered** in the edit-mode footer — there is no conditional hiding based on send history.

**Request shape for `[Save Only]` is a decision point** — locked in by Phase 7.0. The `updateReport` helper call may use (a) no second argument, or (b) an explicit `'NULL'` argument that produces `?notification=NULL`. FE implementation in Phase 4 must wait for 7.0's answer.

Loading state on both buttons independently (so user sees which action is running). Both buttons disabled while either is loading.

---

## 4. Conventions to Follow

- **Immutability**: state updates via new objects, never mutation.
- **Null guards**: every report field touched must be null-safe. `owner`, `customer`, `metadata`, `property_images`, `calculate_actions`, `last_modified_date`, `created_date` may all be null or partially populated.
- **No `style={{}}`** — Tailwind classes only for layout/spacing.
- **No Mantine `Stack` / `Group` / `Text` / `Title`** — use native elements + Tailwind. `Button`, `Select`, `TextInput`, `DatePickerInput`, `Modal`, `Menu`, `Popover`, `Tooltip`, `Paper`, `Badge`, `Divider` from Mantine are fine.
- **Forms**: `react-hook-form` + `joi` resolver. Do not introduce Zod/Yup.
- **i18n**: every user-visible string uses `useTranslations()`. New keys go in the `AdminReportsV2.*` namespace with `snake_case` key names, added to all 7 locale files: `en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`, `ko.json`, `ar.json`.
- **File size**: each component file <400 lines, hard cap 800. Each hook file <200 lines.
- **HOC usage**: call `withUIVersion()` exactly — do not conditionally branch inside page components.
- **Lazy loading**: `withUIVersion()` already uses `next/dynamic` — no additional action needed, but the v2 bundle should not import v1 code and vice versa.
- **Keep v1 untouched**: moving v1 code into `_v1/ReportsPage/index.tsx` is allowed, but its logic must not change. Adjust relative imports if paths break after the move.

---

## 5. Key Technical Risks

| Risk | Mitigation |
|---|---|
| Moving v1 into `_v1/` folder breaks imports | Phase 1 includes a build-green gate after the move |
| SEND_MAIL timestamp not available on `calculate_actions` | Phase 5 first probes data shape; fallback to weaker signal documented in §1.5 |
| `getReport(id)` helper may not exist | Phase 1 probe decides between single-fetch vs filtered-list |
| FE codes wrong Save-Only request shape and BE rejects the call | Phase 7.0 hard-blocks Phase 4 — dev-be answers the request-shape question before FE coding begins |
| `notification=null` path has an unexpected side effect on BE | Phase 7 dev-be verification task confirms status/tracking/notifications before shipping |
| Audit log not written on notification-less save | Phase 7 dev-be verification covers this explicitly |
| `[Save & Resend]` re-triggers even when body unchanged | FE always sends full body regardless; BE decides — verification task confirms BE does not dedupe |
| V1 and V2 bundles accidentally share state | `withUIVersion()` isolates — no global state beyond `uiVersionAtom` |

---

## 6. Phase Gates

1. **Phase 0 → Phase 1**: user approval of `mockups/reports-v2/` HTML — **hard gate**. No FE code starts before approval.
2. **Phase 1 → Phase 2**: build green after v1 relocation to `_v1/` and `withUIVersion()` wiring.
3. **Phase 7.0 → Phase 4**: dev-be MUST report the definitive `[Save Only]` request shape (no param vs `?notification=NULL` vs both) before FE edit-flow coding begins. Phase 7.0 runs in parallel with Phase 1–3; Phase 4 cannot start until 7.0's answer is posted.
4. **Phase 4 → Phase 5**: end-to-end edit save verified in dev environment for both Save Only and Save & Resend paths.
5. **Phase 7 (remaining) → Phase 8**: dev-be verification report filed confirming no side effects on notification-less save.
6. **Phase 8 → Merge**: TypeScript strict passes, `npm run build` green, mockup-parity visual review passes, QC checklist passes.

---

## 7. Out-of-Design

- Statistics strip in v2 shows the same 11 metrics as v1 (total, active, inactive, awaiting_send, processing, failed, spam, unsubscribed, imported, created, rate_alert). No new metrics.
- No new filters. No new columns. Column set is: Summary | Report Link | Statistics | Status | Actions (exactly matches v1).
- Bulk ops unchanged: status change menu + delete only. No new bulk actions.
- Tracking-detail modal and audit-log modal are reused from v1 unchanged (they are already styled acceptably and used across admin surfaces). If visual parity demands it, they can be restyled in a follow-up change, not this one.
