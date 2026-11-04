# Ambassador Activity tab — cross-repo contract (bead agentflow-6o9sa)

Victoria (16/09) wants a tab in the Ambassador admin page: one row per approved Ambassador, default current week (Mon–Sun), custom date range. Decided 04/11 with Bao: posts are shown as THREE columns — Automatic / From template / Written by them — no reclassification needed.

```
lf-homepage AdminConsole (tab "Activity")
   └─ /webplus-api/lo-admin/lo-programs/activity  (existing signed admin proxy)
        └─ moso-aid GET /lo-programs/activity        (requireLoAdmin)
             ├─ Ally  GET /v1/reports/posting-activity   (x-api-key, since/until)   → posts
             ├─ Ally  GET /v1/admin/ambassador/spend     (x-api-key, period=YYYY-MM) → budget
             └─ recruit-be GET /public/api/v1/referrals/activity-totals (x-service-key) → referrals
```

Every source is SOFT: when one cannot be read, its block is `null` for every row and `sources.<name>` says why. The UI renders `null` as "—" with a tooltip, never as 0.

## 1. recruit-be (bead .1)

`GET /public/api/v1/referrals/activity-totals?owner_keys=<k1,k2,...>&from=YYYY-MM-DD&to=YYYY-MM-DD`

- Header `x-service-key` = `recruit.referrals.internal-api-key` (env `RECRUIT_REFERRALS_INTERNAL_API_KEY`). Fail CLOSED on blank config (503) / wrong key (401); constant-time compare; never log the value. Same pattern as `ReferralNoticeInternalController`.
- `owner_keys` = MOSO Admin keyNames (same as `ReferrerTotals.ownerKey`), max 500; optional (absent = all referrers).
- Window semantics (Bao decided 04/11, option B) — each count uses its OWN event date, over ALL of the referrer's referrals regardless of when they were referred:
  - `referred` = referrals whose referral date (`PacksReferralRow.created`) is in `[from, to]`.
  - `onboarded` = referrals whose onboarding COMPLETED in `[from, to]` (use the date the existing status logic treats as "onboarded"; if no such date is available, say so in the report — do not substitute another date silently).
  - `in_progress` = referrals in progress at the end of the window (current in-progress status, any referral date).
  - Days are America/Los_Angeles, both bounds inclusive; `from`/`to` optional (absent = no bound).
- Counts must be computed by the SAME rules as the admin My-referrals view (`ReferralTotals.referred / inProgress / onboarded`) — reuse the facade/assembler, do not re-derive status.
- Response (snake_case):
```json
{ "from": "2026-11-02", "to": "2026-11-08",
  "rows": [ { "owner_key": "aglz...", "referred": 5, "in_progress": 2, "onboarded": 1, "onboarded_undated": 0 } ],
  "truncated": false }
```
  `onboarded_undated` = people currently onboarded with no recorded onboarding day (any referral date): they cannot be placed in a bounded window and are never guessed, so the UI shows them separately. Callers send at most 50 `owner_keys` per call (hard cap 500). The body is wrapped in the standard `payload` envelope. Public path (reached via api-gateway-v2 at `/recruit-svc/public/api/v1/referrals/activity-totals`), `x-service-key` only: a request with `Authorization` or `X-User-ID` is refused; 429 when rate limited.
  Every requested owner key appears (zeros when none). Respect `referrals.enabled` (404 while off) like the rest of the referrals view.

## 2. moso-aid (bead .2)

`GET /lo-programs/activity?program_id=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD` — `requireLoAdmin`, validated (from ≤ to, span ≤ 366 days).

Rows = APPROVED members of the program (existing membership/application data), one per Loan Officer (MOSO user key).

Sources (each soft, each with its own timeout, run in parallel):
- **posts**: Ally `GET {ALLY_API_URL}/v1/reports/posting-activity?since=<from>&until=<to>&limit=100&page=N` with `x-api-key: ALLY_API_KEY`, all pages. Ally does NOT yet accept since/until or x-api-key on this route (Dat agreed 04/11, not shipped): on 401/403 → `sources.posts = "unauthorized"`; on 422 for since/until → retry once with `period=7d` and report the window Ally actually used (`data.period.since/until`) in `sources.posts_window`. Match Ally rows to members by lower-cased email against the member's email AND company email. Map: `automatic = auto_post + admin_on_behalf`, `template = self_template`, `own = self_no_template`, `total`. Keep `ally_user_id` for drill-down.
- **budget**: Ally `GET /v1/admin/ambassador/spend?period=<YYYY-MM of "to">` (already ambassador-only, monthly). Match by email/company_email. Fields: `month_budget_cents, spent_cents, remaining_cents, bill_approved_cents`. Report `budget_period`.
- **referrals**: recruit-be contract §1 with `RECRUIT_API_URL` + `RECRUIT_REFERRALS_SERVICE_KEY` (new env; unset → `sources.referrals = "not_configured"`, warn once).

Response:
```json
{ "from": "...", "to": "...", "budget_period": "2026-11",
  "sources": { "posts": "ok|unauthorized|unavailable|not_configured", "posts_window": {"since": "...", "until": "..."},
               "budget": "ok|...", "referrals": "ok|..." },
  "rows": [ { "user_key": "...", "name": "...", "email": "...", "level_name": "...", "level_rank": 2,
              "ally_user_id": "uuid|null",
              "posts": { "total": 7, "automatic": 3, "template": 2, "own": 2 } ,
              "referrals": { "referred": 5, "in_progress": 2, "onboarded": 1 },
              "budget": { "month_budget_cents": 50000, "spent_cents": 32000, "remaining_cents": 18000, "approved_cents": 30000 } } ] }
```
Drill-down: `GET /lo-programs/activity/posts?program_id=&ally_user_id=&from=&to=&category=&page=` → proxies Ally `/v1/reports/posting-activity/{user_id}/destinations` (same soft rules), returns `{ items: [{category, platform, live_at, template_name, caption_excerpt}], total, page }`.

**As implemented in moso-aid (bead .2, PR moso-aid#211) — additive to / refining the above:**
- Both bodies are the contract object at top level plus `"success": true`; `Cache-Control: no-store`. Errors: 400 `{success:false, error}` for validation / `INVALID PROGRAM ID` / `INVALID CATEGORY`; 404 `Not found` (drill-down `ally_user_id` not a member of the program); 429 `Too many requests` (30/min list, 120/min drill-down — effectively whole-service, all admins share lf-homepage's address); 401/503 from the admin key gate.
- `from`/`to` required, real `YYYY-MM-DD` days, `from ≤ to`, inclusive span ≤ 366 days, `from ≥ 2024-01-01`, `to ≤ today + 31 days` (not today+1: "this week" ends Sunday, "this month" ends on its last day). Any query field sent twice → 400.
- Rows also carry `company_email` and `level_id`; `email` = MOSO work e-mail when known, else the applied address. Rows sorted by name.
- **Ally window.** moso-aid sends `since`/`until` as ISO date-times covering whole America/Los_Angeles days, each with its own offset: `since=2026-10-27T00:00:00-07:00&until=2026-11-08T23:59:59-08:00`. **Needs confirming with Ally (Dat) once since/until ships.** Ally's echoed `data.period.since/until` is compared by LA day with the request; `sources.posts_window = {since, until, exact}` — `exact:false` when Ally refused since/until (422 → one retry with `period=7d`) OR answered 200 with a different window (e.g. its 30d default). Counts are kept but flagged. `null` when posts failed.
- **Matching.** Work e-mail first; an Ally record (posts or spend) claimed by one member's work e-mail is nobody else's. Applied e-mails match only when exactly one member reaches that record that way. A member Ally does not list → `posts: null`, `ally_user_id: null` (unmeasured, not 0 — whether Ally lists zero-post users is unverified). Same for budget.
- `budget.approved_cents` ← Ally `bill_approved_cents`; absent → `null`, not 0.
- **Referrals (recruit-be #819).** `GET {RECRUIT_API_URL}/public/api/v1/referrals/activity-totals?owner_keys=&from=&to=`, where `RECRUIT_API_URL` is the api-gateway-v2 base including recruit's prefix (e.g. `https://gateway.<host>/recruit-svc`); only `x-service-key` is sent (no Authorization / X-User-ID). Body read from `payload` (bare also accepted). ≤ 50 owner keys per call, ≤ 3 calls in flight. 404 (`referrals.enabled` off), 429, 503 (packs could not answer) → `sources.referrals = "unavailable"`, never zeros. `sources.referrals_truncated` = recruit's `truncated` (packs capped → counts are a floor); `null` when referrals failed. Each row's `referrals` also carries `onboarded_undated` (0 when recruit omits it). **`in_progress` is "as of today", not as of the window end.**
- Drill-down: `ally_user_id` must be the Ally record matched to an approved member of `program_id` (same matching), else 404; while the posts report is unreadable membership cannot be checked, so the answer is that soft reason and Ally is not asked. `category` exactly `automatic` | `template` | `own` (absent = Total); anything else 400. Success: `{ source:"ok", window, items:[{category, group, platform, live_at, template_name, caption_excerpt}], total, page, total_pages, truncated }` — `items` always an array. Source failure: `{ source:"unauthorized|unavailable|not_configured", items:null, total:null, ... }` (HTTP 200). Paged locally, 50/page, newest first; cached 60 s.
- Successful upstream reads are cached 60 s in a bounded LRU (200 entries); identical reads in flight are shared. Upstream fetches refuse redirects.

## 3. lf-homepage (bead .3)

- `AdminConsole` gets two tabs: **Applications** (everything that is there today, unchanged) and **Activity** — Activity only for programs with an ALLY level (same rule as `showPosting`).
- Default window = current week Monday–Sunday; quick picks This week / Last week / This month; custom date range.
- Columns: Loan Officer (name + level) · Posts: Total · Automatic · From template · Written by them · Referred · Onboarding · Onboarded · Budget (spent / approved, month shown in header).
- Clicking a post count opens a list of those posts (drill-down endpoint).
- `null` → "—" with a tooltip from `sources.*` (e.g. "Ally has not opened this report to us yet"). A banner when a whole source is unavailable.
- Through the existing signed `/webplus-api/lo-admin` proxy (check its allow-list), i18n keys in every locale, follow the existing `lo-programs-admin.css` look.
