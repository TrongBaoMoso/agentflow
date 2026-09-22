# recruit-fe — Capability Inventory

**Repo:** `recruit-fe` (LoanFactory LO Recruiting frontend, pairs with `recruit-be`)
**Snapshot:** `origin/master` @ `34a7acb` (2026-09-22 19:19 +0700), 249 commits total
**Worktree read:** `/private/tmp/.../scratchpad/wt/recruit-fe` (read-only, nothing modified)
**Size:** 397 files under `src/`, 33,094 LOC total, 22,908 LOC excluding tests

> Every claim below is anchored to `file:line` in this worktree. Where a capability is declared
> ABSENT, the exact search terms used are stated. Doc files in `agentflow/docs/` and the repo's own
> `CLAUDE.md` were read first and are **stale in several places** — the code was treated as
> authoritative and the divergences are called out in §5.

---

## 1. Architecture map

### 1.1 Framework and build

| Item | Value | Evidence |
|---|---|---|
| Framework | Next.js **15.5.12**, App Router, `output: 'standalone'` | `package.json:33`, `next.config.mjs:10` |
| React | 18.3.1 (not 19) | `package.json:36` |
| Language | TypeScript 5.9.3 | `package.json:70` |
| UI kit | Mantine **8.3.14** (`@mantine/core`, `dates`, `hooks`, `notifications`, `colors-generator`) | `package.json:14-19` |
| Utility CSS | Tailwind 3.4.17 | `package.json:69` |
| Server state | TanStack React Query 5.90 | `package.json:25` |
| Client state | Zustand 5.0.11 (auth store only) | `package.json:32`, `src/store/useAuthStore.ts` |
| Forms | react-hook-form 7.71 + zod 4.3 + `@hookform/resolvers` | `package.json:11,30,31` |
| i18n | next-intl **4.8.2**, locales `en` + `vi`, `localePrefix: 'never'` | `package.json:34`, `src/i18n/routing-config.ts:4-6` |
| Icons | `@tabler/icons-react` 3.36 | `package.json:24` |
| Conversation UI | `@loanfactory-inc/omni-core` + `omni-react` **^0.1.3** (transpiled, ESM-only) | `package.json:12-13`, `next.config.mjs:17` |
| SSE client | `@microsoft/fetch-event-source` | `package.json:22`, `src/shared/omni/useCandidateEvents.ts:4` |
| Tests | Jest 30 + Testing Library; ~90 test files | `package.json:9`, `jest.config.cjs` |
| Lint | ESLint 9 flat config, **`eslint.ignoreDuringBuilds: true`** | `next.config.mjs:29-31` |

Notably absent versus the sibling LF apps: **no Recoil/Jotai, no `@ebay/nice-modal-react`** (the repo
deliberately uses controlled Mantine `Modal`s — `src/shared/components/FollowUpsPanel/index.tsx:138-139`
records the NiceModal local-build breakage as the reason), **no charting library** (no Recharts /
Mantine Charts — Reports renders numbers and CSS bars, not charts).

### 1.2 Routing structure

App Router with one locale segment and two route groups:

```
src/app/[locale]/
├── layout.tsx
├── (public)/            → PublicShell, no auth
│   ├── login/
│   └── auth/callback/
└── (private)/           → RecruitShell (header + sidebar + PermissionRouteGuard)
    ├── today/ , today/focus/
    ├── inbox/hot/ , inbox/cold/
    ├── pipeline/
    ├── exceptions/
    ├── reports/
    ├── duplicates/
    ├── dormant/
    ├── conversations/
    ├── templates/
    ├── audit/
    ├── settings/
    ├── permissions/
    └── error.tsx
```

Route constants: `src/shared/constants/routes.ts:1-19`. **There is no `/home` route** despite
`CLAUDE.md:73` claiming one — `/` redirects straight to `/today` at the edge
(`src/middleware.ts:40-51,56-58`).

Middleware does three things: `/` → `/today` or the account-fe SSO hand-off
(`src/middleware.ts:40-58`), `/health` → JSON for k8s probes (`src/middleware.ts:60-65`), otherwise
next-intl. Its matcher deliberately excludes `api|user-svc|auth-svc|recruit-svc|_next|_vercel`
(`src/middleware.ts:70-75`) — intercepting a proxy path 404s before `rewrites()` runs.

### 1.3 Data fetching

All reads go through a thin wrapper over React Query:

- `src/apis/apiClient.ts` — a single axios instance, `baseURL = NEXT_PUBLIC_API_URL || ''`
  (`:12`). **Errors are RESOLVED, not thrown**: `handleAxiosError` returns
  `{error, response_date, http_code}` (`:112-119`), so `react-query.isError` stays **false** for a
  500/403. Every screen therefore has to read `data.error` / `data.http_code` itself — this is the
  single most consequential architectural quirk in the codebase and it has caused at least three
  documented bugs (`src/shared/components/FollowUpsPanel/index.tsx:107-129`,
  `src/apis/recruit/webinarList.ts:19-26`, `src/shared/utils/permissions.ts:24-38`).
- `src/apis/react-query/useApiQuery.ts:10-26` and `useApiMutation.ts` — add `processStateInHook`,
  which on `http_code === 401` clears tokens and pushes `/login` preserving the query string
  (`src/apis/react-query/processStateInHook.ts:14-30`).
- `src/apis/react-query/queryClient.ts:9-13` — one client per tab, **`refetchOnWindowFocus: false`**.
  (Note: `FollowUpsPanel/index.tsx:327-329` reasons about behaviour "react-query refetches on window
  focus" — that is false in this app. Harmless here, but the comment is wrong.)
- Cache invalidation is coarse by design: nearly every mutation does
  `invalidateQueries({ queryKey: ['recruit'] })` — e.g. `PipelineClient/index.tsx:176`,
  `ContactButtons/index.tsx:143`, `TodayHandout.tsx:59`.

**Pagination gotcha, enforced everywhere:** tera-core reads `currentPage` + `pageSize`; Spring's
`page`/`size` are silently ignored (200 OK, always page 1 / 10 rows) —
`src/apis/recruit/candidates.api.ts:103-106`, re-measured at `:436-438`.

**List filtering** is a tera-core `@SearchEntity` DSL string built client-side against **camelCase
entity fields**, not the snake_case JSON: `buildCandidateFilter`
(`src/apis/recruit/candidates.api.ts:73-94`). Negation is `not_eq`; `ne` and `not (...)` are
swallowed silently (`:138-141`).

### 1.4 Backend surfaces this app talks to

| Prefix | Service | How it is reached |
|---|---|---|
| `/recruit-svc/api/v1/*` | recruit-be | Same-origin. Dev: `next.config.mjs:37-44` rewrites to `RECRUIT_BE_PROXY` (default `http://localhost:8090`). Cluster: the gateway owns the route and **no rewrite is registered** (`next.config.mjs:40-42`). |
| `/auth-svc/public/api/v1/auth/*` | auth-service | Absolute against `NEXT_PUBLIC_API_URL` (`src/apis/apiClient.ts:27`). Token refresh, SLO logout. |
| `/user-svc/*` | user-service | `/me`, profiles, avatars (`src/apis/user-svc/*`). |
| `/omni-svc/*` | omni-service | Browser-direct with the recruiter's own bearer token; gateway strips the prefix (`src/shared/components/ConversationModal/index.tsx:26-35`, `src/shared/omni/candidateUnreadCounts.tsx:36-40`). **No dev rewrite exists for this prefix** — conversations cannot work against a local dev server. |
| `/recruit-svc/.../events/subscribe` | recruit-be SSE | Path must end in `/events/subscribe` or api-gateway-v2 routes it through the ordinary 5 s-timeout proxy (`src/shared/omni/useCandidateEvents.ts:19-23`). |

### 1.5 Auth handling

Two modes, switched by env:

- **SSO mode** (`NEXT_PUBLIC_ACCOUNT_URL` set). `RecruitShell` waits for mount, then redirects a
  token-less visitor to `/login?next=…` (`src/app/[locale]/(private)/_components/RecruitShell.tsx:62-66`),
  and paints a loader rather than the shell (`:77-83`). Sign-out does SLO first
  (`AppHeader.tsx:41-52`).
- **Dev-persona mode** (`NEXT_PUBLIC_DEV_USER_ID` set). `apiClient` attaches `X-User-ID`
  (`src/apis/apiClient.ts:71-74`); the header shows a persona `<Select>`
  (`AppHeader.tsx:89-100`). Never to be set in a deployed build.

Token refresh is **single-flight** (`src/apis/apiClient.ts:19-44`) and public paths never receive a
Bearer token (`:62-65`).

### 1.6 RBAC / permission gating

- Source of truth: `GET /admin/rbac/me` via `useMyPermissions` (`src/apis/recruit/users.api.ts`).
- `hasPermission()` **fails OPEN while loading** and honours the `*` wildcard
  (`src/shared/utils/permissions.ts:18-22`). `normalizeMyPermissions()` converts a *failed* envelope
  into `[]` so a 403/500 fails CLOSED rather than being mistaken for "still loading"
  (`src/shared/utils/permissions.ts:39-51`).
- `useCan(code)` is the one-line gate (`src/hooks/useCan.ts:13-17`).
- Route-level: `PermissionRouteGuard` reads the *same* `(href, permission)` table the sidebar hides
  entries with, renders a loader while unresolved, and `router.replace('/today')` on denial
  (`src/app/[locale]/(private)/_components/PermissionRouteGuard.tsx:35-60`,
  `routeGuard.ts:13-17`). Explicitly documented as UI shaping, not a security boundary (`:32-33`).
- A red banner appears if the permission read itself failed
  (`RecruitShell.tsx:98-102`, using `envelopeFailed`, not `.error`).

Permission catalogue (22 codes) is a **hand-written mirror** of the BE enum:
`src/shared/constants/permissionCatalog.ts:21-45`. `IMPORT_RUN`, `SETTINGS_MANAGE`, `RBAC_MANAGE` are
flagged as carried by no seeded role (`:55`).

### 1.7 Component conventions and design system

- Screens are `page.tsx` (server, usually `<Suspense>`) → `_components/<Name>Client/index.tsx`
  (`'use client'`), with `_hooks/` and `_utils/` siblings. Shared UI lives in
  `src/shared/components/<Name>/index.tsx`.
- Path aliases: `@components`, `@apis`, `@hooks`, `@shared`, `@utils`, `@constants`, `@store`,
  `@i18n`, `@fields` (`tsconfig.json`).
- **Design system = "MIX v6"**: `--lf-*` CSS custom properties in `src/styles/global.css:10-12`,
  page/shell classes prefixed `rec-*`. Locked by contrast tests
  (`src/styles/__tests__/darkTheme.contrast.test.ts`) and token tests (`tokens.test.ts`).
  Mantine + Tailwind read the same base colours via `src/configs/theme/themeConfigVariables.ts`.
- Primitives: `StatCard`, `SectionCard`, `StatusChip` (max one chip per column), `InitialsAvatar`,
  `EmptyState`, `OwnerBadge`, `FollowUpBadge`, `LabelChips`, `UnreadBadge`.
- **Hard rule: URL is the source of truth** for filters/sort/pagination/tabs. Each list screen has a
  `use<Screen>FilterUrl` hook with an allowlisted parser + a serializer that omits defaults
  (e.g. `pipeline/_hooks/usePipelineFilterUrl.ts:70-111`). The open 360 drawer rides along as `?c=`
  and is preserved across filter changes by `withCandidateParam`
  (`src/hooks/useCandidateDrawer.ts:33-47`).

### 1.8 i18n

29 namespace files per locale under `src/messages/{en,vi}/` (1,336 lines for `en`). Parity is
enforced by a test (`src/messages/__tests__/localeParity.test.ts`). Only **en** and **vi** —
no other locales, unlike lf-iq (7) or lf-homepage (5).

---

## 2. Route / screen inventory

Nav table (and therefore route gating) is defined once in
`src/app/[locale]/(private)/_components/AppSidebar.tsx:43-80`.

| Route | Renders | Permission gate | State |
|---|---|---|---|
| `/login` | `LoginContent` — builds the account-fe SSO URL | public | complete |
| `/auth/callback` | `CallbackContent` — code→token exchange | public | complete |
| `/` | edge redirect → `/today` or SSO hand-off (`middleware.ts:40-58`) | — | complete |
| `/health` | JSON from middleware (`middleware.ts:60-65`) | — | complete |
| `/today` | `TodayClient` — the recruiter's daily queue | none (ambient) | **complete, richest screen** |
| `/today/focus` | `FocusClient` — one candidate per screen | inherits `/today` (none) | complete |
| `/inbox/hot` | `HotClient` — unowned hand-raised leads with first-touch SLA clocks | none | complete |
| `/inbox/cold` | `ColdClient` — unowned ACTIVE S0 stock | none | complete; carries a **placeholder column** (see §6) |
| `/pipeline` | `PipelineClient` — whole inventory table | none | complete for Table view; **Kanban and Funnel buttons exist and are permanently disabled** (`PipelineClient/index.tsx:283-292`) |
| `/exceptions` | `ExceptionsClient` — manager lens over the HOT queue | none | complete |
| `/reports` | `ReportsClient` — 2 tabs (Activity, Pivot) | none (BE scopes by `REPORT_TEAM`) | complete |
| `/duplicates` | `DuplicatesClient` — merge queue | none on the page; Merge needs `CANDIDATE_MERGE` | complete |
| `/dormant` | `DormantClient` — parked stock, Revive | none; Revive needs `CANDIDATE_ARCHIVE` | complete |
| `/conversations` | `ConversationsClient` — candidates who have a conversation | none; observer join needs `REPORT_TEAM` | complete but thin (see §3.6) |
| `/templates` | `TemplatesClient` — template authoring | **`TEMPLATE_CREATE`** (`AppSidebar.tsx:60`) | complete |
| `/audit` | `AuditClient` — unified audit stream | **`AUDIT_VIEW`** (`AppSidebar.tsx:72`) | complete |
| `/settings` | `SettingsClient` — operational config | **`SETTINGS_MANAGE`** (`AppSidebar.tsx:76`) | **scaffolded — only 2 of the backend's many setting keys are editable** (see §4t) |
| `/permissions` | `PermissionsClient` — RBAC matrix + grants | **`RBAC_MANAGE`** (`AppSidebar.tsx:79`) | complete |

**Only four routes have a hard route gate** — `/templates`, `/audit`, `/settings`, `/permissions`,
all in `NAV_CONFIG` (`AppSidebar.tsx:60, 72, 76, 79`). Every `NAV_FREQUENT` route plus
`/duplicates`, `/dormant` and `/conversations` is ungated at the route level and gates individual
verbs only; the sidebar comments justify each case (e.g. `AppSidebar.tsx:61-70`).

Every private route is linked from the sidebar except `/today/focus`, which is reached from a button
on Today (`TodayClient/index.tsx:261-270`) and inherits the parent's (absent) permission via
`findRequiredPermission`'s prefix match (`routeGuard.ts:13-17`).

**Per-screen shape of the secondary lists** (filters / pagination / stats), for comparison with §3:

| Screen | Filters | URL-backed? | Page size | Stats |
|---|---|---|---|---|
| `/inbox/hot` | **none, deliberately** (`HotClient/index.tsx:32-33` — "an inbox you triage to zero, not a stock you browse") | — | none (server cap + truncation alert `:113-117`) | TEAM waiting = `payload.total`; OVERDUE computed client-side (`:95-111`) |
| `/inbox/cold` | search `q`, "has NMLS" toggle (`?nmls=has`) | yes (`useColdFilterUrl.ts:35,45`) | **default 50, [25/50/100]** (`useColdFilterUrl.ts:17,25`) | TEAM unclaimed (2nd unfiltered call); YOU holding (`ColdClient/index.tsx:44-51`) |
| `/exceptions` | none | — | none (server cap) | 4 cards: overdue, stalled, unowned, owned (`ExceptionsClient/index.tsx:157-194`) |
| `/dormant` | search `q`, sort `created`\|`touch` (default `touch`) | yes (`useDormantFilterUrl.ts:20,36-38`) | **default 50, [25/50/100]** (`:18,40`) | none — total lives in the crumb (`DormantClient/index.tsx:96`) |
| `/duplicates` | none | — | none (server `dedup.queue_cap`) | 2 cards: NMLS groups, email groups (`DuplicatesClient/index.tsx:60-75`) |
| `/conversations` | search `q`, sort `recent`\|`created` | yes (`useConversationsFilterUrl.ts:20-43`) | **default 50, [25/50/100]** | none |
| `/templates` | **none** | — | **none** (full list) | none |
| `/audit` | event type (ALL + 8), actor (ALL + directory) | yes (`useAuditFilterUrl.ts:36-47`) | **default 50, [25/50/100]** (`:19,23-28`) | 1 card: events matching filters = `payload.total` (`AuditClient/index.tsx:172-180`) |
| `/permissions` | search, role — **local `useState`, NOT in the URL** (`PermissionsClient/index.tsx:65-66`) | **no** | **none on the main table**; the Add-people modal pages at 20 (`AddPeopleModal.tsx:15`) | 1 counter: visible rows (`:250`) |
| `/reports` | tab only | yes (`?tab=`) | none (full row set) | 4 cards + the unclaimed-age card |

`/permissions` is the **only inventoried list screen that violates the repo's own URL-as-source rule**
(hard rule #5) — its search and role filters live in component state.

---

## 3. The lead pipeline screens — in depth

There are **two** screens that qualify as "the lead pipeline": `/pipeline` (the inventory table) and
`/today` (the working queue). Both are documented below, then the shared lead-detail surfaces.

### 3.1 `/pipeline` — the inventory table

Client: `src/app/[locale]/(private)/pipeline/_components/PipelineClient/index.tsx` (491 lines).

**Header block.** A breadcrumb showing the total (`t('crumb', {total: kpiData.total})`,
`:250-252`) from `GET /kpi/pipeline`, the page title, an inline fetching spinner (`:256`), and an
**Add lead** button gated on `CANDIDATE_CREATE` (`:69, :257-261`) opening `CandidateEditModal` in
create mode (`:473-478`).

**Stage strip (the KPI block).** `StageStrip.tsx:21-68` — 8 clickable boxes, one per stage S0–S7.
Each box shows:

| Element | Source |
|---|---|
| Big number = candidates **standing at this stage and ACTIVE** | `activeAtStage(kpi, stage)` → `kpi.by_stage_status[stage].ACTIVE` (`pipelineKpi.ts:8-9`) |
| "reached N" | `everReachedStage()` = sum of every status in that stage row (`pipelineKpi.ts:12-16`) |
| "dropped N" (only if > 0) | `kpi.by_stage_status[stage].ARCHIVED` (`StageStrip.tsx:34`) |
| "nurtured N" (only if > 0) | `kpi.by_stage_status[stage].NURTURE` (`StageStrip.tsx:35`) |
| Progress rail | `active / ever` as a percentage (`StageStrip.tsx:36, 60-62`) |

Clicking a box toggles `?stage=` (`StageStrip.tsx:44`). There is **no separate stat-card row** on
Pipeline — the stage strip is the whole KPI block.

**Table columns** (header at `PipelineClient/index.tsx:397-414`, cells in `PipelineRow.tsx`):

| # | Column | Data source | File:line |
|---|---|---|---|
| 1 | Select checkbox | local `selected` Set | `PipelineRow.tsx:83-90` |
| 2 | Candidate (avatar, name, subtitle, **label chips**) | `first_name`/`last_name`; subtitle = `NMLS {nmls_id} · {company_name} · {state}`, falling back to `email` | `PipelineRow.tsx:66-102` |
| 3 | Source | `candidate.source` | `PipelineRow.tsx:103-107` |
| 4 | Stage | `candidate.stage` + i18n stage name | `PipelineRow.tsx:108-112` |
| 5 | Status | `candidate.status`, toned ACTIVE/NURTURE/ARCHIVED/BLOCKED/DORMANT | `PipelineRow.tsx:20-26, 113-115` |
| 6 | Last touch | `candidate.last_outbound_at` → "N days"; **null renders a red "never"** | `PipelineRow.tsx:116-126` |
| 7 | Follow-up | `candidate.next_follow_up_at` (the BE denorm of the earliest open follow-up) via `FollowUpBadge variant="date"`; `—` when none | `PipelineRow.tsx:129-135` |
| 8 | Owner | `OwnerBadge` resolving `owner_id` through `GET /users` directory, avatar included; "unowned" otherwise | `PipelineRow.tsx:137-143` |
| 9 | Actions | Claim button + ⋯ menu | `PipelineRow.tsx:144-175` |

A commented marker at `PipelineRow.tsx:136` records that a **"Loans since 2022" column is intended
to sit here and does not exist yet** (D31 hides volume/units from the recruiter surface).

**Filters** — all top-level in one toolbar (`PipelineClient/index.tsx:277-371`); **there is no
"more filters" drawer or overflow**:

| Control | URL param | Options / default | File:line |
|---|---|---|---|
| Free-text search (350 ms debounce) | `q` | — | `:226-229, 300-307` |
| Status | `status` | ALL / ACTIVE / NURTURE / ARCHIVED / BLOCKED — **default ACTIVE** | `usePipelineFilterUrl.ts:19, 42` |
| Source | `source` | ALL / IMPORT / MODEX / WEB_FORM / WEBINAR / EVENT_RSVP / REFERRAL / FB_ADS / MANUAL / OTHER | `usePipelineFilterUrl.ts:20-31` |
| Unowned toggle | `owner=none` | off by default; renders filled-red when on | `:330-338`, `usePipelineFilterUrl.ts:86,101` |
| Label | `label` | catalog names + usage counts, `__all__` sentinel for "no filter" | `:339-347, 93-99` |
| Stage (via strip) | `stage` | null default | `StageStrip.tsx:44` |
| Sort | `sort` | `created` (default, `createdDate,desc`) / `touch` (`lastOutboundSortKey,asc`) / `followup` (`nextFollowUpAt,asc`) | `usePipelineFilterUrl.ts:33`, `candidates.api.ts:34-41` |
| Page size | `pageSize` | **25 / 50 / 100, default 50** | `usePipelineFilterUrl.ts:32, 49` |

**Saved views** (`SavedFiltersMenu`, `:295-299`): save the current canonical query string under a
name, rename, overwrite-with-current, set/clear default, delete
(`SavedFiltersMenu/index.tsx:55-95`). A default preset auto-applies **once per visit and only when
the URL carries no explicit filter param** (`PipelineClient/index.tsx:116-124`).

**Pagination.** Mantine `<Pagination>` plus an "x–y of N" line read from the response `page` block
(`:447-468`). Page resets to 1 on any non-page filter change (`usePipelineFilterUrl.ts:120-127`).

**Bulk actions** (`PipelineBulkBar.tsx`, appears once ≥1 row is ticked):

| Action | What it does | Gate | File:line |
|---|---|---|---|
| **Assign owner** | Menu of directory users filtered on `can_own` → `POST /candidates/bulk-transfer` | enabled when every selected row is already yours, **or** `CANDIDATE_TRANSFER` | `PipelineClient/index.tsx:148-149, 188-205`; `PipelineBulkBar.tsx:46-73` |
| **Export CSV** | **Client-side only** — builds the CSV from the rows already on screen, no server call | none | `PipelineClient/index.tsx:220-224`; `candidatesCsv.ts:39-72` |
| **Archive…** | Opens `BulkArchiveModal` (optional free-text reason, 500 chars) → `POST /candidates/bulk-archive` | `CANDIDATE_ARCHIVE` | `PipelineClient/index.tsx:207-218`; `BulkArchiveModal.tsx` |
| **Clear selection** | local | — | `PipelineBulkBar.tsx:98-107` |

`PipelineBulkBar.tsx:27` names the **deferred** bulk actions explicitly: *Add to nurture, Bulk SMS
(needs omni), Delete (`CANDIDATE_DELETE`)* — none of the three exist.

Bulk results are a per-row ledger (`OK`/`SKIPPED`/`FAILED`) surfaced as three grouped toasts;
FAILED transfer rows stay selected for retry, FAILED archive rows do not
(`PipelineClient/index.tsx:153-186`).

**Row action menu (⋯)** — exactly two items, both clipboard-only:
`Copy email` and `Copy phone`, each disabled when the field is null (`PipelineRow.tsx:150-174`).
There is **no per-row call/SMS/email, no conversation button, no assign, no archive** on the
Pipeline row.

**Row Claim button** — renders only on unowned rows and only with `CANDIDATE_CLAIM`
(`PipelineRow.tsx:145-149`), `POST /candidates/{id}/claim` (`candidates.api.ts:171-174`).

### 3.2 `/today` — the working queue

Client: `src/app/[locale]/(private)/today/_components/TodayClient/index.tsx` (474 lines).
One call: `GET /today` (`dashboard.api.ts:16-17`) + `GET /kpi/pipeline` (`:20-22`).

**Header stat block — four cards** (`:279-313`):

| Card | Value | Source | Clickable? |
|---|---|---|---|
| Queue | `payload.total_owned` (not `items.length`) | `:125, 284` | yes → `?f=all` |
| Untouched | count of items with no `last_outbound_at` | `:132, 293` | yes → `?f=untouched` |
| Offers | `activeAtStage(kpi,'S5')` | `:303` | no |
| Stock | `activeAtStage(kpi,'S0')` | `:310` | no |

**Hero ("Next up")** — the first queue row, rendered large with avatar, name, source chip, stage
fact, and a neglect fact that reads as either a cadence instruction, "replied N days ago", "N days
neglected", or a red "never touched" (`TodayHero.tsx:63-88`). Actions: a labelled **Call** button +
SMS/Email icons + conversation button (`ContactButtons variant="hero"`), a **Log result** button when
no follow-up is open, a `FollowUpStrip`, and a collapsible `CallScriptPanel`
(`TodayHero.tsx:91-121`).

**Queue groups.** The old tab strip was removed (D122); rows are now bucketed into five ordered
groups, each a `SectionCard` with a count, rendered only when non-empty (`:170-212`):
`Time passed` (red) · `Within the hour` (gold) · `Later today` · `Unscheduled` (red, deliberately
above "parked") · `Wake today`. Bucketing is by `follow_up.wakeup_at` through
`wakeupBucket`, with an arrived NURTURE wake winning first (`:150-158`).

Extra lines: a truncation Alert when the BE capped the queue (`:341-345`), an "N scheduled for
later" note from `payload.scheduled_later` (`:360-364`), a "carried over N" + timezone line
(`:388-392`).

**Queue row** (`TodayQueueRow.tsx`, 367 lines) — a 4-cell grid *who | context | due | actions*:

- **who**: avatar, name, **`UnreadBadge`** driven by one batched omni unread-count read for the whole
  page (`TodayClient/index.tsx:84`, `candidateUnreadCounts.tsx`), subtitle = company · state.
- **context**: source chip + `S{n} · stage name — NMLS {id}`. `TodayQueueRow.tsx:90` records again
  that volume/units are hidden and a "Loans since 2022" replacement is pending.
- **due**: two fixed lines. Line 1 = a `FollowUpBadge` (+ a bare "+N" when more than one follow-up is
  open) or a dashed **Add follow-up** pill. Line 2 = the follow-up kind + note, or the silence
  verdict — cadence-due / cadence-paused / "never touched" / "last touch N days" / **"no answer ×N —
  the retry ladder has run out"** (`:113-167`). Below that, optionally a **Meet 1-1 link/location**
  (`:274-292`) and a **Send** affordance for a scheduled SEND_INFO draft (`:293-305`).
- **actions**: `ContactButtons variant="icons"` (Call / SMS / Email / Conversation),
  `CallScriptPanel variant="popover"`, and a ⋯ menu with **Copy email, Copy phone, then (with
  `ACTIVITY_LOG`) either "Follow-up done" or "Log result", plus "Manage follow-ups"**
  (`:316-361`).

**Empty states are two different things** (`:326-334`): owning nobody renders `TodayHandout` — a
work hand-out card stating how many unowned candidates exist and a **"Claim next N"** button calling
`POST /candidates/batch-claim`, with N coming from the server's `batch_claim_size`, never hardcoded
(`TodayHandout.tsx:33-99`). A filtered-empty queue renders the ordinary "all clear".

**Pending-call strip.** Calls logged without an outcome come back from the server
(`TodayQueue.pending_outcomes`, `types/recruit.ts:68-97`) and render as strips that re-open the
outcome wizard (`TodayClient/index.tsx:101-108, 377-384`). This was moved off `sessionStorage` in the
last 3 days (commit `f0ceafe`).

### 3.3 Lead detail — the 360 drawer

`src/shared/components/CandidateDrawer/index.tsx` (452 lines), a right-side 460 px Mantine Drawer
driven by `?c=<id>` so a refresh or a pasted link reopens it (`:51-58`). It is **mounted once per
screen** on Today, Pipeline, Hot, Cold, Exceptions, Dormant, Reports, Duplicates and Audit.

Contents, top to bottom:

1. Title: avatar, name, `NMLS · company · state` subtitle (`:178-190`).
2. Button row: **Profile** (label flips to "View profile" without `CANDIDATE_UPDATE`) opening the
   edit modal on the Identity tab; and, **only at stage S6 and only with `OFFER_REQUEST`**, an
   "Invite to join" button (`:192-209`).
3. Chips: stage · status · source (`:225-233`).
4. **`LabelPicker`** — the one writable thing in the drawer (`:237`).
5. **`InviteProgressCard`** — renders nothing unless an offer exists (`:241`).
6. Facts list (`:243-299`): owner, email, phone, `referred_source`/`referred_section`, company,
   **self-reported volume** and **self-reported closed loans**, each explicitly tagged as
   self-reported (`:273-298`).
7. `moso_note` verbatim when present (`:301-311`).
8. NURTURE wake-arrived chip (`:313-318`).
9. **Follow-ups section** (`:320-424`): count, *Manage* button, one card per open follow-up (badge +
   kind + note + **Done**), an "Add follow-up" dashed button, and a collapsible **history** that is
   only fetched when expanded (`:105, 394-418`). Visible only to the owner or a `REPORT_TEAM`
   holder; otherwise a quiet note (`:98-104, 420-424`).
10. **View history** button → the edit modal's History tab (`:426-435`).

### 3.4 Lead detail — the profile modal (7 tabs)

`src/shared/components/CandidateEditModal/index.tsx`, a large modal with **URL-addressable vertical
tabs** (`?pm=1&etab=`), tab list at `tabMeta.ts:15-23`:

| Tab | Fields | File |
|---|---|---|
| Identity | first/last name, email, phone, preferred languages | `IdentityTab.tsx` |
| Licensing | `nmls_id`, licensed states, sponsor states (both multi-select over `US_STATES`) | `LicensingTab.tsx:19-35` |
| Company | company name, state | `CompanyTab.tsx` |
| Production | `career_production` ($), `units12mo`, `loans_since_anchor` + an "as of" date | `ProductionTab.tsx:36-80` |
| Referral | `referred_source`, `referred_section` + a required change reason | `ReferralTab.tsx` |
| Mailing | line1/2, city, state, zip, country | `MailingTab.tsx` |
| History | the contact timeline (see below) | `HistoryTab.tsx` |

Create mode ("Add lead") shows only 5 of these — no Referral, no History (`index.tsx:43`).
Permission model is deliberately field-level, not container-level: the modal opens for anyone who can
open the drawer; inputs render read-only and Save is hidden without `CANDIDATE_UPDATE`
(`index.tsx:68-82, 209, 263`).

**Production masking is real and visible:** when `career_production` comes back null with a
`production_band` set, the field renders as a band chip, never an editable input, so a viewer who is
not allowed to see the number cannot overwrite it with a blank (`ProductionTab.tsx:20-25, 33-54`).

### 3.5 Lead detail — Conversation history (the timeline)

`src/shared/components/CandidateDrawer/TimelineSection.tsx` — one chronological rail merging
`GET /candidates/{id}/activities` with `GET /candidates/{id}/stage-history`
(`HistoryTab.tsx:31-33`), grouped by day (`:120-138`), with a **three-chip filter: all / messages /
system** (`:19, 85-97`). Rows:

- `ActivityRow.tsx` — type chip (CALL/SMS/EMAIL/NOTE/MEETING/SYSTEM), an inbound/outbound arrow,
  clock, actor name; then title, subject, body, attachment count, and a tombstone line for erased
  content (`:56-98`).
- Message bodies for rows carrying `omni_message_id` are joined at read time from omni
  (`TimelineSection.tsx:66-73`, `messagePreviews.tsx`). **Today only OUTBOUND CALL rows ever carry
  that id** (`types/recruit.ts:149-153`).
- `StageMoveRow.tsx` for stage transitions.
- With `AUDIT_VIEW`, a "view full audit" link into `/audit` (`TimelineSection.tsx:140-144`).

### 3.6 Lead detail — the omni conversation panel

`src/shared/components/ConversationModal/index.tsx` mounts omni's `ConversationSection` in a
`min(1160px, 96vw) × min(920px, 96dvh)` modal, loaded lazily (`ConversationButton/index.tsx:19`).
It is opened from the 4th icon on a contact strip (`ContactButtons/index.tsx:197, 260`), from the
`/conversations` list, and from the Send-info hand-off.

- **Channels enabled: email ✅, sms ✅, call ✅** (`candidateSectionConfig.tsx:255`).
  **Disabled: `zoomCalls` (no Zoom-grant endpoint in recruit-be), `triage` (no unmatched inbox), and
  `tickets`** (`:174-180`).
- A candidate with no outbound touch shows `NoConversationYet` instead, with an `ensure-cast` call
  for the owner (`:163, 339-341`; `candidates.api.ts:347-358`).
- Opening someone else's conversation as a manager (`asObserver`) **joins the omni cast on open and
  leaves on close**, with an amber notice strip (`:324-328, 226-288`). A 1,100-request /429 incident
  and a grant-leak are both documented inline (`:250-253, 201-222`).
- Live updates via recruit-be SSE with exponential backoff and a staleness pill
  (`useCandidateEvents.ts:26-60`).
- **Attachment/recording downloads throw by design** — recruit-be serves no comm blob endpoints, so
  `capabilities.attachments` is off (`omniTransport.ts:45-60`).
- **A call placed inside the conversation produces no outcome prompt**: omni-react exposes no
  "call placed" callback, so `usePendingOutcome` cannot be armed from there
  (`candidateSectionConfig.tsx:244-249`).

### 3.7 Labels UI

`LabelPicker/index.tsx` — chips with an `×`, plus a **type-to-create** `Autocomplete` whose
suggestions are the shared catalog minus what the row already has and minus SYSTEM labels
(`:46-51`). **Multiple user-created labels per candidate are fully supported** — the picker attaches
one at a time with no client-side cap (`:52-64`), the cap lives on the BE and its refusal renders
inline in the BE's own words (`:61, 124`). SYSTEM labels render without a remove affordance
(`LabelChips.tsx:41`). Chips also render read-only under the name on Pipeline rows, fetched in **one
batch per page** (`PipelineClient/index.tsx:87-90`).

### 3.8 Follow-up UI: flags, due dates, overdue display, age highlighting

- `FollowUpBadge/index.tsx:26-31` — four tones: `passed` (danger, filled), `soon` (within the hour,
  primary), `later` (gray filled), `future` (outlined). Overdue also emits a visually-hidden
  "overdue" word for screen readers (`:62`).
- **Highlighting is by bucket, not by days-overdue magnitude.** `followUpTone` / `wakeupBucket`
  (`shared/utils/followUp.ts:35-58`) answer passed/today/future and within-the-hour; nothing
  computes or displays "N days overdue" for a follow-up.
- Today's row-level tone follows the same buckets (`TodayQueueRow.tsx:163-167`), and Pipeline's
  follow-up column uses `variant="date"` (`PipelineRow.tsx:131`).
- The **HOT inbox** is the one place with a real overdue *clock*: `slaState()` returns
  `{overdue, minutes, escalated}` against `sla_due_at` and `sla.no_claim_escalate_minutes`
  (`inbox/hot/_hooks/slaState.ts:13-27`), formatted as `3h 05m` (`:30-37`).
- `/exceptions` partitions that same HOT queue into **overdue** and **stalled** buckets
  (`exceptions/_utils/partitionExceptions.ts:18-33`).
- Neglect-by-silence is a separate detector: `cadenceState()` compares last outbound against
  server-supplied `cadence_tiers`, pausing entirely if the lead replied
  (`today/_hooks/cadenceState.ts:20-44`).

---

## 4. Feature capability checklist

### a. Manual claim / self-assign of a lead — **IMPLEMENTED**

Row-level Claim on unowned Pipeline rows (`PipelineRow.tsx:145-149` → `useClaimCandidate`,
`candidates.api.ts:171-174`), on Cold and Hot rows, and on Exceptions rows. Batch self-assign
("Claim next N") on an empty Today (`TodayHandout.tsx:40-67` → `POST /candidates/batch-claim`,
`candidates.api.ts:183-186`), with the size coming from the server. Implicit claim also happens on
first contact ("interact = assign", `candidates.api.ts:241-252`), and its verdict is always reported
as a toast (`ContactButtons/index.tsx:144-147`, `shared/utils/contactOutcome.ts`).

### b. Assignment settings UI (per-role automatic assignment configuration) — **ABSENT**

The Settings screen owns exactly two keys, both follow-up related
(`settings/_components/SettingsClient/index.tsx:23-24`). Searched: `assignment`, `assignment.?method`,
`round.?robin`, `auto.?assign`, `owner.?assign`, `distribution` across `src/` — no match outside the
Pipeline source enum. The only assignment mechanisms in the UI are manual (Claim, bulk Assign owner,
Exceptions' Assign menu) and the deliberately-human batch hand-out, whose comment states auto-assign
was rejected as product policy (`TodayHandout.tsx:28-31`).

### c. Overdue follow-up view / filter / visual highlight by days overdue — **PARTIAL**

Present: a dedicated **`/exceptions`** screen bucketing overdue vs stalled first-touch SLAs
(`partitionExceptions.ts:18-33`); a **"Time passed"** group on Today (`TodayClient/index.tsx:171-178`);
red `passed` tone on every follow-up badge (`FollowUpBadge/index.tsx:27`); a red "never" in
Pipeline's Last-touch column (`PipelineRow.tsx:124`); per-recruiter `neglected_warn` /
`neglected_danger` counts on Reports (`types/recruit.ts:336-337`).

Missing: **no filter for "overdue" on any list screen** — Pipeline's filter allowlist is
`stage/status/source/owner/q/label/sort/page/pageSize` (`usePipelineFilterUrl.ts:58-68`), with no
overdue or due-date predicate; and **no graduated highlight by days overdue** — the follow-up tone is
a three-way bucket, not a magnitude (`shared/utils/followUp.ts:35-58`). Only the HOT SLA surfaces a
duration, and in minutes/hours, not days (`slaState.ts:30-37`).

### d. Follow-up scheduling UI with template selection — **IMPLEMENTED**

`FollowUpsPanel/index.tsx` is a full CRUD panel: kind picker
(`CALL_NEXT / SEND_INFO / WEBINAR / MEET_ONE_ON_ONE`, `:477-485`), date + time inputs with a
past-date guard (`:489-511`), a note (2,000 chars, `:57, 516-528`), a "Reminds you Friday 9:00am"
read-back (`:530-534`), TO-DO-TODAY cards with **Clear** / **Remind later** (a submenu of +N hours,
this evening, tomorrow, next business morning — `remindLater.ts`, `:348-399`) / edit, an UPCOMING
list, a dashed "Add another", and a recessed history card (`:664-684`).

**Template selection** lives in the call-outcome wizard's SEND_INFO branch:
`useMessageTemplates(channel)` fetches ACTIVE EMAIL or SMS templates and a `<Select>` seeds subject +
body, with `{{first_name}}`-style tokens substituted client-side
(`OutcomeSection.tsx:132-148, 463-476`). An empty template list is stated as a fact, and the
recruiter can still type from scratch (`:461-464`).

There is **no DELETE** for a follow-up anywhere — recruit-be and followup-be expose none, so the UI
offers "Clear" instead of a misleading trash icon (`FollowUpsPanel/index.tsx:626-628`).

### e. Email compose UI; CC behaviour; where replies appear — **PARTIAL**

Two separate things exist and they are not the same:

1. **`mailto:` hand-off** — the Email icon logs an OUTBOUND activity then opens the OS mail client
   (`ContactButtons/index.tsx:29, 130-151`). No compose UI, no CC, and the message body never reaches
   the system.
2. **In-app compose inside omni's `ConversationSection`** — `channels.email: true`
   (`candidateSectionConfig.tsx:255`), with an auto-subject seeded from the candidate's NMLS
   (`:165-170`). Replies return to the thread through the reply-token address
   `cand-<token>.<threadKey>@reply.*` and appear in the conversation panel (`:253`) and, for rows
   carrying `omni_message_id`, in the candidate timeline (`TimelineSection.tsx:66-73`).

**CC behaviour is not controlled by this repo at all.** Searched `cc`, `Cc`, `bcc`, `recipients`,
`to_addresses` in `src/` — the only compose fields recruit-fe itself supplies are
`{segment, subject, body}` (`OutcomeSection.tsx:248-252`). Whatever CC affordance exists is inside
the omni package.

The recruit-side composer (the Send-info block) is a two-field form — subject (email only) + body —
with no attachments, no CC, and no recipient picker (`OutcomeSection.tsx:478-492`).

### f. SMS/text compose UI; template picker — **PARTIAL**

Same split. The SMS icon is an `sms:` device hand-off (`ContactButtons/index.tsx:28`). In-app SMS
sending is enabled in omni (`candidateSectionConfig.tsx:255`, with the measurement trail at
`:182-215`). The **template picker exists only in the Send-info branch of the call-outcome wizard**
(`OutcomeSection.tsx:463-476`), not on a row, not in the drawer, and not as a standalone "send SMS"
screen. `PipelineBulkBar.tsx:27` names **Bulk SMS as deferred**.

### g. Call UI — click to call, Zoom Phone, call history — **IMPLEMENTED (with a named hole)**

Click-to-call is a `zoomphonecall:` deep link (`ContactButtons/index.tsx:24-27`), fired **after** the
server accepts the activity so the TCPA suppression gate actually gates rather than merely reports
(`:103-129`). A `CallScriptPanel` sits next to every call button, resolving the ACTIVE `CALL_SCRIPT`
template for the candidate's stage with a stage-null fallback and `{{first_name}}` /
`{{recruiter_name}}` substitution (`CallScriptPanel/index.tsx:29-52`, `templates.api.ts:43-48`).
Call history is the timeline (`ActivityRow.tsx`). omni's in-panel call is on
(`candidateSectionConfig.tsx:255`).

The named hole: **a recruiter with no `recruiter_zoom_link` gets no warning** — the package's Zoom
gate is bound to `capabilities.zoomCalls`, which is `false`, so the dial silently no-ops while omni
has already written an optimistic row that the reaper later flips to `NOT_REPORTED`
(`candidateSectionConfig.tsx:216-228`). And omni's quick-call on a context-panel person row
**dials immediately with no confirm step** (`:230-236`).

### h. Template management UI (create/edit/list templates for email and SMS) — **IMPLEMENTED**

`/templates` (`templates/_components/TemplatesClient/index.tsx`, 256 lines + `TemplateModal.tsx`),
gated on `TEMPLATE_CREATE` (`AppSidebar.tsx:60`). Backing API covers all three types
`CALL_SCRIPT | EMAIL | SMS` (`templates.api.ts:12`), two scopes (`TEAM` reviewed asset,
`PERSONAL` own-voice born ACTIVE — `:17-18`), the full lifecycle
`DRAFT → IN_REVIEW → ACTIVE → RETIRED` via `submit / approve / reject / retire`
(`templates.api.ts:90-93`), create (`:79-82`) and update (`:84-87`), reading
`GET /templates/manage` (`:74-77`). The type selector offers all three
(`TemplateModal.tsx:20, 87-95`), and scope + type are editable **only on create**
(`TemplateModal.tsx:22-26, 73-97`); `subject` renders for EMAIL only (`:121`).

Caveat: the screen has **no search, no filter and no pagination** — it renders the full list. Fine
for a handful of rows, not for a grown library.

### i. Omni-channel conversation view per lead — **IMPLEMENTED**

See §3.6. Email + SMS + call in one thread, per candidate, with live SSE, an observer join/leave
protocol, unread badges on list rows, and a candidate-shaped role vocabulary
(`candidateSectionConfig.tsx:65-123`).

### j. A cross-lead inbox — all inbound messages across the team, most-recent-first — **PARTIAL / effectively ABSENT**

`/conversations` is **not a message inbox**. It is a *candidate* list: `GET /candidates` filtered by
`lastOutboundAt not_eq null` and sorted by `lastOutboundAt,desc`
(`_hooks/useConversationsFilterUrl.ts:85-97`, `candidates.api.ts:37-39, 80`). Its rows show name,
company/email/phone, status, owner and "last touch N days" — **no message preview, no inbound
content, no unread indicator, no timestamp of the last inbound**
(`ConversationsClient/ConversationRow.tsx:33-60`). The sort key is *outbound*, so the ordering is
"who we messaged most recently", not "who replied most recently".

Filters: search, sort (`recent` | `created`), page size 25/50/100 default 50
(`useConversationsFilterUrl.ts:20-43`). No owner filter, no channel filter, no unread filter.

Two further facts make the gap concrete: omni's **triage capability is explicitly off** —
`triage: false` with the comment *"recruit has no unmatched-inbox surface"*
(`candidateSectionConfig.tsx:176-177`) — and unread counts are only ever fetched for the candidate
ids already on a rendered page (`candidateUnreadCounts.tsx:72-77`), never as a global feed.
Searched: `inbox`, `unread`, `triage`, `inbound`, `feed`, `messages` across `src/`.

### k. Dashboard / statistics / KPI screens — **PARTIAL**

Present, on `/reports` (`reports/_components/ReportsClient/index.tsx`, two URL tabs `?tab=`):

- **Activity tab** — `GET /reports/recruiters`, live per request, no cache (`reports.api.ts:17-22`).
  Per-recruiter columns from `RecruiterReportRow` (`types/recruit.ts:327-338`):
  `open_candidates`, `touches_today`, `touches_window`, `stage_moves_window`,
  `avg_first_touch_minutes` + `first_touch_samples`, `neglected_warn`, `neglected_danger`.
  Header cards aggregate them, weighting average first-touch by sample count
  (`reports/_utils/teamTotals.ts:13-38`). Thresholds ship as data so labels show the numbers actually
  in force (`types/recruit.ts:40-51`). Scope: everyone sees their own row; `REPORT_TEAM` sees the
  team (`types/recruit.ts:48`).
- **Unclaimed-age card** — `unowned_total`, `owned_total`, `median_days`, `p90_days`, `alert_days`,
  `beyond_alert_count`, with a ratio bar (`UnclaimedAgeCard.tsx`, `unclaimedAge.ts:11-16`,
  `types/recruit.ts:60-68`).
- **Pivot tab** — `GET /reports/pivot`, recruiter × **month the candidate was created**, plus a
  "window total" column. A non-zero cell opens a drill-down modal querying `GET /candidates` with a
  `createdDate gte/lt` DSL filter, capped at `PIVOT_DRILL_CAP = 100` with an honest truncation
  notice (`PivotTab.tsx:88, 132-136`, `reports.api.ts:33, 41-58`). **The pivot's semantics are
  themselves provisional** — its own hint string reads *"candidates held TODAY, bucketed by when the
  row was born — dev default pending Q35"* (`messages/en/reports.json:30`, code comment
  `PivotTab.tsx:29-31`).
- Plus the Pipeline stage strip (§3.1) and Today's four stat cards (§3.2).

Missing, precisely:
- **Per-recruiter *production* metrics do not exist.** `RecruiterReportRow` has no loan count, no
  volume, no closed/funded figure (`types/recruit.ts:327-338`). Production is a per-candidate field
  and is deliberately masked from most viewers (`ProductionTab.tsx:20-25`).
- **Past-due counts by month do not exist.** The only month axis is the pivot's *creation* month
  (`types/recruit.ts:70-77`), which is a holdings snapshot, not an overdue breakdown. Past-due by
  recruiter exists only as the two-bucket `neglected_warn` / `neglected_danger` pair.
- **No charts.** No charting dependency is installed at all (`package.json`).

### l. CSV export; import (e.g. webinar attendance) — **PARTIAL**

Export: **IMPLEMENTED, client-side only, in two places.** Pipeline exports the *selected rows*
(`PipelineClient/index.tsx:220-224`) with a fixed 14-column list that deliberately excludes
production/volume (`candidatesCsv.ts:10-27`), UTF-8 BOM for Excel (`:30`). Audit exports the raw
ledger fields (`audit/_utils/auditCsv.ts`, `AuditClient/index.tsx:143-146`). Both build a Blob and
click an anchor (`candidatesCsv.ts:65-72`) — no server export endpoint is called.

Import: **ABSENT.** Searched `FileInput`, `Dropzone`, `type="file"`, `FormData`, `attendance`,
`import`, `upload` across `src/`. The only `FormData` reference is a content-type guard in the axios
interceptor (`apiClient.ts:75`). `IMPORT_RUN` exists as a permission and is described as the
**MOSO migration intake, not a lead-list import** (`permissionCatalog.ts:49-55`); nothing in the UI
ever requests it.

### m. Webinar registration and attendance UI — **PARTIAL**

A webinar **picker** exists: choosing the WEBINAR next step fetches `GET /webinars` and offers a
session `<Select>` whose id rides along on the call outcome (`OutcomeSection.tsx:126-128, 356-388`;
`webinars.api.ts:39-44`). It distinguishes three states — sessions, "none scheduled", and
"could not ask packs" with a retry button (`OutcomeSection.tsx:350-373`, `webinarList.ts:5-17`).
`WEBINAR` is also a candidate `source` value (`types/recruit.ts:24`).

Absent: any registration form, any attendee list, any attendance marking or import. Searched
`attendance`, `attendee`, `register`, `rsvp`, `enroll` in `src/` — only the `EVENT_RSVP` source enum
and the picker above.

### n. Approve/reject a loan officer before they are allowed to pay — **ABSENT in the UI**

The API hooks exist and are **never imported anywhere**: `useApproveOffer`, `useDeclineOffer`,
`useSendOffer`, `useMarkOfferSigned`, `useMarkOfferFeePaid`, `useWaiveOfferFee`, `useOffers`
(`offers.api.ts:61-108`). A repo-wide grep for each of those seven names returns matches **only in
`offers.api.ts` itself** — no component, no screen, no test. `OFFER_APPROVE` appears in the
permission catalog (`permissionCatalog.ts:37`) and in the Permissions matrix, but there is no screen
behind it.

What *does* exist is the recruiter's **request**: `InviteModal` posts
`POST /candidates/{id}/offers` (`InviteModal/index.tsx:142-161`, `offers.api.ts:39-47`) and the
returned `status` (`SENT` vs `PENDING_APPROVAL`) is the only signal of which way the server's rule
went (`:151-155`). The modal's own doc comment states it deliberately refuses to predict the AUTO
verdict because the thresholds live behind `SETTINGS_MANAGE`, which a recruiter does not hold
(`:46-55`). So: **an approval queue for a manager does not exist in this frontend.**

### o. Payment / startup fee UI — **PARTIAL**

Present: a **charge-vs-waive** segmented control on the invite, with a reason `<Select>` (Top
producer / Strategic partner / Promotional program / Other + free text) and a warning that a waive
forces REVIEW (`InviteModal/index.tsx:294-327, 25-31, 113-117`); an email preview naming the
**$100 startup fee** (`messages/en/invite.json:44-45`); and a read-only **"fee paid / waived"
milestone** on the progress card (`InviteProgressCard/index.tsx:85-93`).

Absent: any payment collection, amount entry, payment status detail, refund, or fee-marking action.
`useMarkOfferFeePaid` / `useWaiveOfferFee` are unreferenced (see n). The fee milestone is a plain
boolean with **no timestamp** — the card says so rather than fabricating one
(`InviteProgressCard/index.tsx:25-28`). Searched: `payment`, `paypal`, `stripe`, `invoice`, `charge`,
`fee` — no payment SDK is a dependency (`package.json`).

### p. NMLS / Modex enrichment display — **PARTIAL**

Displayed: `nmls_id` (row subtitles, drawer, Licensing tab), `modex_synced_at` as a
"synced / not yet synced with Modex" line on the invite (`InviteModal/index.tsx:216-225`),
`career_production` (masked to a band for most viewers), `units12mo`, and `loans_since_anchor` with
its `loans_since_as_of` date (`ProductionTab.tsx:56-80`, `types/recruit.ts:86-115`).
Self-reported volume/loans are shown separately and explicitly labelled as self-reported
(`CandidateDrawer/index.tsx:273-298`).

Absent:
- **"Production since a cutoff year" is not actually displayed as a column anywhere.** Cold's
  "Loans since 2022" column is a **placeholder** (see §6), and both Pipeline and Today carry inline
  markers saying the column is still pending (`PipelineRow.tsx:136`, `TodayQueueRow.tsx:90`).
- **Employment history: ABSENT.** No field exists on the `Candidate` type
  (`types/recruit.ts:60-179`) and no component renders one. Searched `employment`, `employer`,
  `work_history`, `job_history`, `previous_company`, `tenure`.
- No per-year loan counts, no branch/company history, no Modex refresh action.

### q. Onboarding step tracker UI (licensing, HR tasks, e-sign documents, NMLS sponsorship) — **ABSENT**

The closest thing is `InviteProgressCard` — a **three**-milestone timeline: invited → fee
paid/waived → signed (`InviteProgressCard/index.tsx:72-98`). Its own header comment states that the
mockup's "filled the profile" and "met 1-1" milestones **were cut because recruit-be has no source
for them** (`:20-28`). There is no licensing task list, no HR task list, no document checklist and no
sponsorship tracker. Searched `onboarding`, `sponsorship`, `checklist`, `task`, `step` across `src/` —
`ONBOARDING` appears only as an omni conversation role
(`candidateSectionConfig.tsx:69`), an RBAC role name in comments, and a dev persona label
(`devIdentity.ts:19`). `sponsor_states` is a licensing multi-select, not a tracker
(`LicensingTab.tsx:28-35`).

### r. E-signature document UI — **ABSENT**

One boolean, read-only: the `signed` milestone bullet on the invite progress card
(`InviteProgressCard/index.tsx:95-97`). `POST /offers/{id}/signed` is described in the API layer as a
**"manual stub for the e-sign webhook until document-esign is wired"** and is never called
(`offers.api.ts:86-93`). There is no document list, no viewer, no send-for-signature action, no
signature status detail. Searched `esign`, `e-sign`, `signature`, `docusign`, `inkless`, `agreement`,
`document` across `src/`.

### s. Audit log viewer — **IMPLEMENTED**

`/audit` (`audit/_components/AuditClient/index.tsx`, 306 lines), gated `AUDIT_VIEW`
(`AppSidebar.tsx:72`). Reads `GET /admin/audit-events` (`audit.api.ts`), unifying **eight** event
types — OWNER, STAGE, SETTING, MERGE, GRANT, OFFER, CONVERSATION_GRANT, CONVERSATION_REVOKE
(`types/recruit.ts:424-432`) — into one row shape (`:49-74`). Filters on type and actor live in the
URL (`_hooks/useAuditFilterUrl.ts`). Each row opens the 360 drawer; **Export CSV** writes the raw
ledger fields (ids, not display names — "an export is evidence") for **the current page only**
(`AuditClient/index.tsx:143-146, 202-212`, `_utils/auditCsv.ts:7-21, 29-32`). A 403 renders the
backend's own message rather than an empty table (`:62, 148-154`). The "what happened" column is
derived per event type by `whatHappened()` (`:80-127`) and wrapped in `safeText` so an unrecognised
type degrades to the raw string instead of crashing the route (`_utils/safeText.ts:24-38`).

### t. Settings screens — **PARTIAL, and much thinner than the nav implies**

`/settings` (`settings/_components/SettingsClient/index.tsx`, 182 lines) renders **one section with
exactly two controls**:

1. `followup.no_answer_retry_days` — a ladder editor (add/remove/reorder rungs, 1–365 days) with a
   calendar preview of where the rungs land (`RetryLadder.tsx:18-35`, key at `index.tsx:23`).
2. `followup.default_due_days` — a `<Select>` of 1/2/3/4/5/7/10/14 days, plus whatever value is
   actually stored so a configured-but-off-menu number is never rendered as blank
   (`index.tsx:26, 37-40, 158-172`).

Each shows who changed it and when (`index.tsx:86-97`). A 403 renders the BE's own refusal
(`:99-110`).

Against the requested list:
- **General settings — PARTIAL.** Only the two follow-up keys above. The backend clearly holds many
  more (`today.queue_cap`, `today.batch_claim_size`, `hot.sources`,
  `sla.first_touch_hours_by_source`, `sla.no_claim_escalate_minutes`, `dedup.queue_cap`,
  `modex.loans_since_year`, the cadence tiers, the production-band cutoffs — all referenced in code
  comments and payloads, e.g. `candidateUnreadCounts.tsx:52-70`, `types/recruit.ts:48-67, 41-55`) and
  **none of them is editable from this screen**.
- **Webinar settings — ABSENT.** Searched `webinar` in `src/` — only the outcome picker and the
  source enum.
- **Landing page settings — ABSENT.** Searched `landing`, `landing_page`, `page_settings`.
- **Facebook ads settings — ABSENT.** Searched `facebook`, `fb_ads`, `ads`, `campaign` — `FB_ADS`
  exists only as a candidate `source` value (`usePipelineFilterUrl.ts:28`).
- **Owner assignment method — ABSENT.** See (b).
- **Calendly / 1-1 meeting settings — ABSENT.** Searched `calendly`, `booking`, `scheduling_link`,
  `meeting_link`. What exists is a **per-candidate free-text field**: the MEET_ONE_ON_ONE branch
  takes a pasted link or place, stored as `next_step_location` and rendered on the Today card
  (`OutcomeSection.tsx:390-399`, `TodayQueueRow.tsx:274-292`). There is no configured scheduling
  integration.

**The backend keys the UI cannot reach.** The FE's own code names these `recruit_settings` keys while
offering no control for any of them: `hot.sources` (`inbox/hot/page.tsx:9`), `hot.queue_cap`
(`HotClient/index.tsx:33`), `sla.first_touch_hours_by_source` (`types/recruit.ts:280`),
`sla.no_claim_escalate_minutes` (`partitionExceptions.ts:9`), `today.queue_cap` and
`today.batch_claim_size` (`types/recruit.ts:221, 233`), the cadence tiers/stages
(`types/recruit.ts:48-53`), `followup.nurture_default_days` (`OutcomeSection.tsx:220`),
`modex.loans_since_year` (`types/recruit.ts:112`), `dedup.queue_cap` (`types/recruit.ts:129-134`).
**So Settings edits 2 of at least 11 keys the app itself knows about.**

Also missing: scheduling a change. `PUT /admin/settings/{key}` deliberately omits `effective_from`
because *"scheduling a future change has no UI yet"* (`settings.api.ts:53-58`).

Worth flagging: `candidateSectionConfig.tsx:204-207` claims an admin populated `recruiter_zoom_link`
"through the `SETTINGS_MANAGE` screen". **That screen cannot edit that key** — it only exposes the
two follow-up keys above. Either the write happened via the API directly or the comment is wrong.

### u. Role-based UI gating — **IMPLEMENTED**

Mechanism in §1.6. Concrete gates found in the code:

| Permission | What it unlocks | File:line |
|---|---|---|
| `CANDIDATE_CREATE` | Add-lead button + create-mode form | `PipelineClient/index.tsx:69, 257`; `CandidateEditModal/index.tsx:100, 155` |
| `CANDIDATE_UPDATE` | Editable profile fields, Save button, label add/remove | `CandidateEditModal/index.tsx:99, 209, 263`; `LabelPicker/index.tsx:37, 89` |
| `CANDIDATE_CLAIM` | Row Claim buttons, "Claim next N" | `PipelineRow.tsx:64, 145`; `TodayHandout.tsx:37, 81` |
| `CANDIDATE_TRANSFER` | Bulk Assign owner; Exceptions Assign | `PipelineClient/index.tsx:149` |
| `CANDIDATE_ARCHIVE` | Bulk Archive; Dormant Revive | `PipelineClient/index.tsx:150`; `candidates.api.ts:330-338` |
| `CANDIDATE_MERGE` | Duplicates Merge button | `AppSidebar.tsx:61-65` comment; `DuplicateGroupCard.tsx` |
| `ACTIVITY_LOG` | **All contact buttons**, outcome wizard, follow-up verbs, row task menu | `ContactButtons/index.tsx:95-97`; `FollowUpsPanel/index.tsx:154`; `TodayQueueRow.tsx:82, 343` |
| `OFFER_REQUEST` | "Invite to join" entry points | `CandidateDrawer/index.tsx:76, 203`; `TodayClient/index.tsx:71`; `FocusClient/index.tsx:73` |
| `OFFER_READ` | Invite progress card | `InviteProgressCard/index.tsx:33, 38` |
| `REPORT_TEAM` | Team scope on Reports; see others' follow-ups in the drawer; observer join on `/conversations` | `CandidateDrawer/index.tsx:98`; `ConversationsClient/index.tsx:58` |
| `AUDIT_VIEW` | `/audit` route + nav; "view full audit" link | `AppSidebar.tsx:72`; `TimelineSection.tsx:140` |
| `TEMPLATE_CREATE` / `TEMPLATE_APPROVE` | `/templates` route; approve/reject verbs | `AppSidebar.tsx:60`; `templates.api.ts:90-93` |
| `SETTINGS_MANAGE` | `/settings` route; the two editors | `AppSidebar.tsx:76`; `SettingsClient/index.tsx:62, 148, 162` |
| `RBAC_MANAGE` | `/permissions` route | `AppSidebar.tsx:79` |

Roles themselves are never hardcoded in the FE as gates — only permission codes. Role *names*
(`HR`, `LICENSING`, `ONBOARDING`, `ACCOUNTING`, `MANAGER`, `ADMIN`, `RECRUITER`) appear in comments
and in the omni role vocabulary (`candidateSectionConfig.tsx:65-79`), and the display of a user's
roles comes from the directory (`AppHeader.tsx:62-65`, `shared/utils/userDirectory.ts`).

---

## 5. Work in progress / half-done

### 5.1 TODO / FIXME / HACK markers — essentially none

A repo-wide grep for `TODO|FIXME|HACK|XXX:` across `src/**/*.{ts,tsx,json}` (excluding tests)
returns **four hits, none of which is a work marker**:

- `src/shared/types/auth.ts:197` — `@deprecated` on a legacy type superseded by `AppSummary`.
- `src/shared/omni/omniTransport.ts:66` — a thrown message containing "is not implemented in
  recruit-fe", which is a deliberate refusal for blob verbs, not a TODO.
- `src/messages/vi/hot.json:18` — copy saying auto-ping "will come with the Omni slice".
- `src/messages/vi/permissions.json:27` — copy about the ADMIN wildcard.

A second search for commented-out markup — `grep -rnE '^\s*(//|\{/\*)\s*<[A-Za-z]' src` — also returns
**zero**. There is no withheld JSX in this repo. The one block that reads like withheld UI is a
**prose rationale for a button that was deleted**, not the button itself: the "Gọi — tự claim"
one-click call on Hot and Cold rows, removed by Bao on 10/09, with a 14-line comment explaining why
and instructing that the underlying `call-claim` variant in `ContactButtons` must **not** be deleted
(`inbox/hot/.../HotRow.tsx:112-125`, duplicated at `inbox/cold/.../ColdRow.tsx:103-116`).

This codebase encodes unfinished work in **prose comments and disabled controls**, not markers — so
the sections below matter more than the grep.

### 5.2 Feature flags — **the mechanism does not exist**

`recruit-fe/CLAUDE.md:121` declares feature flags **mandatory** for staging-only features
("Feature chỉ-ở-staging: feature flag — BẮT BUỘC"), because `master`→`production` promotion is
all-or-nothing. In the code there is **no flag mechanism at all**. Grep for
`featureFlag|feature_flag|useFeature|isEnabled\(|/features` in `src/` returns nothing, and the only
`process.env` reads are:

| Var | Effect | File:line |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | axios baseURL; SSE base | `apiClient.ts:12`, `useCandidateEvents.ts:136` |
| `NEXT_PUBLIC_ACCOUNT_URL` | **switches SSO mode on** | `accountLogin.ts:12`, `useAccountUrl.ts:26` |
| `NEXT_PUBLIC_DEV_USER_ID` | dev persona / `X-User-ID` | `devIdentity.ts:23-26` |
| `NEXT_PUBLIC_SESSION_HINT_DOMAIN` | cookie domain to expire on sign-out | `sessionHint.ts:28` |
| `RECRUIT_BE_PROXY` | dev-only rewrite target | `next.config.mjs:41` |

So every feature merged to `master` is on for everyone, and the next `master → production` promotion
ships all of it. That is a live process risk, not a code bug.

What *does* switch behaviour, besides those env vars, is a set of **hardcoded omni capability
booleans**:

| Flag | Value | File:line |
|---|---|---|
| `omniChannel` | `true` | `candidateOmniHost.tsx:81` |
| `omniDirect` | `true` | `candidateOmniHost.tsx:98` |
| `share` | `true` (flipped 2026-08-19) | `candidateOmniHost.tsx:122` |
| `zoomCalls` | **false** — no Zoom-grant endpoint in recruit-be | `candidateOmniHost.tsx:88`, `candidateSectionConfig.tsx:176` |
| `attachments` | **false** — no host endpoint for blob bytes | `candidateOmniHost.tsx:107` |
| `triage` | **false** — no unmatched-inbox surface | `candidateSectionConfig.tsx:178` |
| `tickets` | **false** — no ticketing integration | `candidateSectionConfig.tsx:180` |
| `channels` | `{email: true, sms: true, call: true}` — SMS flipped 2026-09-12, Call flipped 2026-09-19 | `candidateSectionConfig.tsx:255` |

### 5.3 Disabled controls (structural, not loading state)

| Control | Why | File:line |
|---|---|---|
| **Pipeline "Kanban" and "Funnel" view buttons** | permanently `disabled`, wrapped in a "coming soon" tooltip; only Table is built | `PipelineClient/index.tsx:283-292` |
| **Invite "Resend" button** | rendered `disabled` *even when `resend_eligible` is true*, under a tooltip explaining it is unavailable | `InviteProgressCard/index.tsx:105-118` |
| Contact Call/SMS/Email icons | disabled when the candidate has no phone/email; a native `title` carries the reason because a Mantine Tooltip cannot fire on a disabled element | `ContactButtons/index.tsx:60-88, 158-196` |
| Bulk Assign / Archive | disabled without the grant, with the permission named in the hint | `PipelineBulkBar.tsx:46-96` |
| Copy email / Copy phone menu items | disabled when the field is null | `PipelineRow.tsx:160, 168` |
| **Login footer "Help / Privacy / Terms"** | three `<Anchor component="button" onClick={() => {}}>` — literally no-op, with the admission `{/* ponytail: placeholder links — no help/privacy/terms pages exist yet */}` | `(public)/_components/PublicShell.tsx:33-42` |
| Focus's "Remind this evening" | disabled after 17:00 — a **hardcoded 5 PM** in a codebase whose rule is "no operational number in code" | `today/_components/FocusClient/index.tsx:371` |
| GrantDrawer "Revoke" | disabled for your own row (you cannot revoke yourself) | `permissions/.../GrantDrawer.tsx:266` |

The contact-button family (`ContactButtons/index.tsx:164, 176, 189, 213, 228, 240, 252`,
`PipelineRow.tsx:160,168`, `HotRow.tsx:137,145`, `ColdRow.tsx:129,137`, `TodayQueueRow.tsx:326,334`)
is disabled for any candidate with no phone/email — which, for an imported MODEX row, is common.

### 5.4 Built-but-unreachable code

- **Six offer mutation hooks + the offer list hook are dead**: `useApproveOffer`, `useDeclineOffer`,
  `useSendOffer`, `useMarkOfferSigned`, `useMarkOfferFeePaid`, `useWaiveOfferFee`, `useOffers`
  (`offers.api.ts:61-108`). Verified by grepping each name repo-wide — matches occur only inside
  `offers.api.ts`. This is the single largest block of shipped-but-unwired capability.
- `TodayQueue.tab_counts` is still on the wire and still typed (`types/recruit.ts:34-39, 56-57`) but
  the tab strip it fed was removed in favour of the five groups (`TodayClient/index.tsx:141-149`).
- `ConversationModal`'s `else` branch for `opened === false` "has never executed once" — both call
  sites unmount instead — and is kept only for a hypothetical future caller
  (`ConversationModal/index.tsx:206-224`).
- **`useGoogleSocialLogin` and `useSsoTokenLogin`** (`apis/auth-svc/sso.api.ts:56-65`) — declared,
  typed, never imported.
- **`readAuthorities` / `hasRecruitAdmin`** (`shared/utils/authAuthorities.ts:14-32`) — a
  client-side JWT `authorities` decoder with no importer.
- **`BackButton`** (`(public)/_components/BackButton.tsx`) — not referenced anywhere in `(public)`.
- **Types with no API module behind them**, carried over from account-fe/tera-fe:
  `shared/types/mfa.ts`, `shared/types/gsi.ts`, and `SessionDevice` / `SecuritySummary` /
  `MfaVerifyRequest` / `ChangePasswordRequest` / `AppDetail` / `AppCatalogItem` / `AppAdminItem` in
  `shared/types/auth.ts:66-194`. `SessionDevice` is explicitly speculative — its comment says a
  parallel BE task *"may"* add `GET /auth-svc/api/v1/auth/me/sessions` (`auth.ts:74-91`).
- **Only 15 of the 22 catalogued permissions are ever checked in the UI.** Never referenced by
  `useCan()` or `hasPermission()`: `CANDIDATE_READ` (ambient), `CANDIDATE_TRANSITION`,
  `ACTIVITY_READ`, `SUPPRESSION_MANAGE`, **`OFFER_APPROVE`**, `IMPORT_RUN`, `LABEL_MANAGE`.
  `OFFER_APPROVE` is the significant one — it guards five backend mutations that have no UI at all.

Two further API-layer notes, both relevant to "unfinished":
- `GET /auth-svc/api/v1/auth/me/applications` is **404 on the deployed auth-service**; the app routes
  around it by reading `linked_apps` inlined on `/me` (`apis/auth-svc/me.api.ts:13-25`).
- `GET /admin/rbac/directory` returns **503 while `CENTRAL_GATEWAY_BASE_URL` is unset** — a
  deliberate dark state (`apis/recruit/rbac.api.ts:99-104`).

### 5.5 Known-incomplete behaviour documented inline

- **The observer join/leave race is narrowed, not closed**: a leave that reaches the backend before
  its join no-ops and the grant persists; closing it needs a backend change
  (`ConversationModal/index.tsx:267-272`).
- **A call placed inside the omni panel never prompts for an outcome** — no callback exists to arm
  `usePendingOutcome` (`candidateSectionConfig.tsx:244-249`).
- **`referral_change_reason` may be silently dropped**: the FE requires it, but as of 2026-09-15 the
  field was not on recruit-be `origin/master` and `FAIL_ON_UNKNOWN_PROPERTIES` is off
  (`candidates.api.ts:486-496`).
- **Bulk-archive FAILED rows are ambiguous** — `BulkItemResult` has no field distinguishing "nothing
  happened" from "archived, cleanup failed", so the UI declines to offer a retry affordance
  (`PipelineClient/index.tsx:153-174`).
- **`/pipeline` cannot filter to one owner**, which is why Today's "scheduled later" note ships
  without a link (`TodayClient/index.tsx:347-359`).
- **`REPORT_TEAM` is the wrong name** — D83 renamed it `REPORT_ALL` and that never landed
  (`permissionCatalog.ts:10-12`).
- **The audit event-type union is hand-copied from a Java enum** with no mechanical link
  (`types/recruit.ts:418-423`).
- **The Permissions screen collects an override reason, validates it (≥8 chars) and never sends it.**
  `GrantDrawer.tsx:26, 100, 228-239` requires it whenever an override exists, but `onSave` passes
  only `{roleCodes, overridesAdd, overridesBlock}` (`GrantDrawer.tsx:248`) and the caller forwards
  exactly those three to `PUT /admin/rbac/grants/{userId}` (`PermissionsClient/index.tsx:151-160`).
  The reason is dead input — an audit trail the UI asks for and then discards.
- **Per-role grant expiry is deliberately not rendered** because the backend column does not exist
  (D80, `GrantDrawer.tsx:53-56`). Honest, but it means grants are permanent until revoked by hand.
- **`OfferStatus.EXPIRED` has no writer** — no expiry job is wired (`types/offer.ts:12-17`) — and
  decline is asymmetric: the entity carries no `declined_by`/`declined_at`/`decline_reason`
  (`types/offer.ts:30-33`).
- **Hardcoded client-side operational numbers**, against the project's own "no operational number in
  code" rule: `ACTIVITY_PAGE_SIZE = 100` (`candidates.api.ts:432`), `PIVOT_DRILL_CAP = 100`
  (`reports.api.ts:33`), `MAX_BATCH_IDS = 200` (`candidateUnreadCounts.tsx:49`, whose own comment
  cites that rule), and the 5 PM cutoff in Focus (`FocusClient/index.tsx:371`).

### 5.6 Recently merged work — last ~40 commits on `origin/master` (2026-09-20 → 2026-09-22)

Three days, ~40 commits, four themes:

1. **Pending-call outcome moved from the browser to the server** (the most recent work):
   `f0ceafe` read the pending-call reminder from the server not sessionStorage; `1c50714`,
   `7c7c3eb`, `bab580e` fixed clock-comparison bugs in the dismissal; `3e7be09` parsed `called_at`
   as the `ApiInstant` the backend actually sends (it had shipped typed as `string`, producing
   "Invalid Date" on staging — `types/recruit.ts:86-96`); `ee47a7d` printed the call time in the
   viewer's zone. PRs #202–#207.
2. **"Send info" next step**: `7451da9` compose + send-now; `190504c` the schedule path
   (`agentflow-kvps`); plus `2e7e3d2` fixing the conversation modal scrolling its own header away.
   PRs #199–#201.
3. **Meet 1-1 MVP**: `2a8cc09` the meeting-link input on the outcome card; `9964a85` showing it on
   the Today row. PRs #196, #198.
4. **Webinar picker + call-result UX**: `16686ae` the picker (`agentflow-zm4k`), `d80e647` the
   three-state fix so a failure stops being reported as "no upcoming webinars", `b494801`/`d6bdd38`
   the wider modal and one-row next steps. PRs #193, #194, #197.

Also in-window: `9a435e5` "observing a conversation never ended" (the leave-on-unmount fix),
`22a4857` omni bumped 0.1.1 → 0.1.3 in lockstep with omni-react, `b9daf08`/`326a111` closing two
fail-OPEN holes in the permission gate (`agentflow-id6d`), and `c13c2ba` the manual add-lead button.

The direction of travel is unmistakable: **the call-outcome loop and omni messaging**. Nothing in the
last 40 commits touches offers/approval, onboarding, payments, settings breadth, or import.

---

## 6. Gaps visible from the UI side

1. **A rendered placeholder column.** Cold's "Loans since 2022" is explicitly a placeholder awaiting
   Modex dated transactions (`inbox/cold/_components/ColdClient/ColdRow.tsx:34`,
   `messages/en/cold.json:19`). Pipeline and Today carry matching markers saying the column is
   pending (`PipelineRow.tsx:136`, `TodayQueueRow.tsx:90`). This is the only placeholder *data* in
   the app — **no screen renders hardcoded mock rows**; every list is backed by a real endpoint.
2. **`/omni-svc` has no dev rewrite *and* is not excluded from the middleware matcher.**
   `next.config.mjs:37-44` rewrites `/recruit-svc` only, and `middleware.ts:74` excludes
   `api|user-svc|auth-svc|recruit-svc|_next|_vercel` — **not `omni-svc`**. So in local dev (empty
   `NEXT_PUBLIC_API_URL`) an `/omni-svc/...` call is same-origin, gets swallowed by next-intl and
   404s before any rewrite could run. Conversations and unread badges are gateway-only surfaces
   (`ConversationModal/index.tsx:35`, `candidateUnreadCounts.tsx:40`).
3. **Two backend endpoints are self-described stubs** and the UI treats them as absent:
   `POST /offers/{id}/signed` ("manual stub for the e-sign webhook until document-esign is wired")
   and `POST /offers/{id}/fee-paid` ("manual stub for the payment webhook until the fee flow is
   wired") — `offers.api.ts:86-102`. Neither is called.
4. **`comp_bands` is an empty table on staging**, so `compBandId` is optional and the invite sends
   only a free-text `referral_source` (`offers.api.ts:29-34`, `InviteModal/index.tsx:145-147`).
5. **The invite modal cannot show the rule verdict it was designed to show.** The auto-approve
   thresholds sit behind `SETTINGS_MANAGE`, which a recruiter does not hold, so the modal shows only
   the deterministic half (waive or a missing number ⇒ REVIEW) and leaves the rest to the returned
   status (`InviteModal/index.tsx:46-56, 116-117`).
6. **`InviteProgressCard` shows three milestones because the backend has no source for the other
   two** the mockup specified (`:20-28`), and milestones ② and ③ are plain booleans with no
   timestamp, so no date is fabricated (`:26-28`).
7. **Follow-up CRUD degrades differently from the outcome call.** `/call-outcome` records locally
   when the followup-be bridge is unconfigured; all five CRUD routes answer 503 there — described as
   the state of **production today** (`FollowUpsPanel/OutcomeSection.tsx:88-91`). The panel withholds
   the list rather than rendering an empty one, precisely for this reason
   (`FollowUpsPanel/index.tsx:107-129, 314-325`).
8. **The webinar list can come back as a bare array from a not-yet-updated backend**, which crashed
   the whole private route via the error boundary before a shape guard was added
   (`webinarList.ts:39-48`).
9. **Header chrome that does nothing**: the global search box is `aria-hidden` and visual-only until
   a spotlight lands, and the notifications bell is `aria-hidden` with no behaviour
   (`AppHeader.tsx:29-32, 77-85`).
10. **No standalone "add note" control anywhere.** `NOTE` is a valid activity type
    (`types/recruit.ts:557`) and renders in the timeline (`ActivityRow.tsx:26`), but the only way a
    recruiter writes one from recruit-fe is the note field inside the call-outcome wizard
    (`OutcomeSection.tsx:286-294`). Internal notes otherwise live inside the omni panel.
11. **`eslint.ignoreDuringBuilds: true`** (`next.config.mjs:29-31`) — lint failures cannot block a
    production build.
12. **The client fabricates envelopes the server never sent**, in three places, each deliberately and
    each documented: `useMyPermissions` synthesises `{payload: [], http_code: 0}` on a thrown error
    so every gate fails closed (`users.api.ts:89-91`); `webinarListOf` synthesises
    `{sessions: [], source: 'UNAVAILABLE'}` and tolerates a **bare array** payload from a
    not-yet-deployed backend (`webinarList.ts:31-48`); `asLadder` tolerates a bare number where an
    array is expected, to survive a pre-migration staging backend (`settings.api.ts:75-95`). All
    three are shape-skew defences against the FE and BE deploying independently — a recurring theme.
13. **`PUT /candidates/{id}` cannot blank a numeric field.** `applyProfile` applies a value only when
    non-null, so `career_production` / `units12mo` / `loans_since_anchor` can be raised or corrected
    but never cleared through this UI (`candidates.api.ts:459-466`).

---

## Summary counts

Against the 21 requested capabilities (a–u):

**IMPLEMENTED — 7**
`a` manual claim · `d` follow-up scheduling with template selection · `g` call UI (click-to-call,
Zoom Phone deep link, call scripts, call history) · `h` template management (EMAIL + SMS +
CALL_SCRIPT, full lifecycle) · `i` per-lead omni-channel conversation · `s` audit log viewer ·
`u` role-based UI gating.

**PARTIAL — 10**
`c` overdue (dedicated screen + red tones, but **no overdue filter and no day-graded highlight**) ·
`e` email compose (device hand-off + omni composer; **no CC control in this repo**) ·
`f` SMS compose (same, template picker only inside the outcome wizard) ·
`j` cross-lead inbox (**a candidate list sorted by last *outbound*, not a message feed**) ·
`k` dashboards (activity metrics yes; **no production metrics, no past-due by month, no charts**) ·
`l` CSV export yes / **import entirely absent** ·
`m` webinar picker only (**no registration, no attendance**) ·
`o` fee charge-vs-waive intent + a read-only paid/waived milestone (**no payment UI**) ·
`p` NMLS/Modex fields yes (**no employment history, and the "loans since" column is a placeholder**) ·
`t` settings (**2 of ≥11 known keys; webinar / landing-page / Facebook-ads / assignment-method /
Calendly all absent**).

**ABSENT — 4**
`b` assignment settings · `n` approve/reject before payment · `q` onboarding step tracker ·
`r` e-signature document UI.

**Final tally: IMPLEMENTED 7 · PARTIAL 10 · ABSENT 4.**

### The 10 capabilities most confidently missing from the UI

1. **Manager approve/reject of an offer before payment** — seven API hooks exist, zero call sites
   (`offers.api.ts:61-108`).
2. **Onboarding step tracker** (licensing / HR tasks / documents / NMLS sponsorship) — three
   milestones only, and the card's own comment says the rest have no backend source
   (`InviteProgressCard/index.tsx:20-28`).
3. **E-signature document UI** — one read-only boolean; the endpoint is a self-described stub
   (`offers.api.ts:86-93`).
4. **Per-role automatic assignment configuration** — no keys, no screen, and the product decision
   recorded against it (`TodayHandout.tsx:28-31`).
5. **A true cross-lead inbound inbox** — `/conversations` sorts candidates by *outbound* and shows no
   message content; omni `triage` is off (`useConversationsFilterUrl.ts:85-97`,
   `candidateSectionConfig.tsx:176-177`).
6. **Any import UI** (webinar attendance, CSV, lead lists) — nothing reads a file anywhere in `src/`.
7. **Settings breadth** — only `followup.no_answer_retry_days` and `followup.default_due_days` are
   editable; no webinar, landing-page, Facebook-ads, assignment or Calendly settings
   (`SettingsClient/index.tsx:23-24`).
8. **Per-recruiter production metrics and past-due-by-month** — neither exists in
   `RecruiterReportRow` or `PivotReport` (`types/recruit.ts:327-338, 70-84`).
9. **Employment history / dated Modex production** — no field, no column; the "loans since" column is
   still a placeholder (`ColdRow.tsx:34`).
10. **An overdue *filter* and day-graded overdue highlighting on the lead lists** — the filter
    allowlist has no due-date predicate and the badge is a three-way bucket
    (`usePipelineFilterUrl.ts:58-68`, `FollowUpBadge/index.tsx:26-31`).

Runner-up, worth naming because it is a process risk rather than a missing screen: **there is no
feature-flag mechanism at all**, despite the repo's own `CLAUDE.md:121` making one mandatory for the
two-branch staging→production model (§5.2).
