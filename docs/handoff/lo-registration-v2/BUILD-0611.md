# /join v2 build — overnight 06/11 (Bao approved: code to STAGING, URL swap per plan, FE first + BE PRs)

Source of truth, read in this order:
1. `docs/handoff/lo-registration-v2/mockup/join-flow.html` (mockup v19, approved by Victoria + Brayan, hero style A).
   Open it in a browser or read the HTML: every step, every label, every scenario bar ("Preview only" bars are NOT part of the page).
2. `docs/handoff/lo-registration-v2/PLAN.md` §6 URL map, §7 flow/booking/Step 4/Review/name lock/special requests,
   §8 mockup decisions, §9 review feedback 04–05/11 (latest wins over older sections).

## Scope tonight (Phase 1)

### lf-homepage (first) then lo-homepage (port)
- **New form flow** (Matt's 3 steps + our Step 4 + Review), exactly as the mockup:
  - `/join` Step 1 About you → `/join/license` Step 2 License details (incl. Employment type W-2/1099 prefilled from
    sponsor states with the state lock rules from `isAlwaysW2State` + CA/IN rules in `useLoanOfficerTypeRule`) →
    `/join/book` Step 3 two cards: "Book a 30-min intro call" (pick up to 3 two-hour windows 9–11/11–1/1–3/3–5 on
    business days from a month calendar + "Any time works, call me ASAP"; time zone auto-detected, changeable; stored
    UTC) or "I'm ready to join" → `/join/booked` confirmation ("We will contact you ASAP to confirm the time").
  - Step 4 "Finish your application" (sections 1–7 of the mockup, tech literacy is section 7, waiver chips removed)
    and Review ("Check your details", Edit per group, "Confirmed on your call" for employment type after the 1-1).
    After Review, hand off to the EXISTING pay → sign → NMLS steps (reuse the existing components / `?key=` flow;
    the `startupFeeGates.ts` gate stays: no pay before `pre_onboarding_done`).
  - Opening with `?key=` goes to the first step that still misses a required field (1 → 2 → 4); Step 3 skipped once
    `pre_onboarding_done`. pushState per step (history works), slide transitions, stepper 1-2-3 before the call, 7 after.
  - Matt's bug list: SMS consent unchecked + optional, phone + last name required, states sorted by name.
  - First/last name editable on keyed links (FE only); email stays locked.
  - Hero numbers from live data (same helpers the /loan-officer page uses).
- **URL swap (PLAN §6 URL map):**
  - lf: recruiter landing moves `/join/[slug]` → `/recruit/[slug]` (replaces today's `/recruit/[slug]` hero+old form);
    its "Ready to join" goes to `/join` carrying the referrer internally (no `?r=` in shared links). Old `/join/<slug>`
    links: no redirect (measured 28/10: no real traffic).
  - lo: Loan Officer site recruiting landing `/<site>/join` → `/<site>/recruit`; new form at `/<site>/join`
    (credits the site owner exactly as today). Update lo map-urls / RELEASE_PAGES / middleware / sitemap, the
    `/lo-setting` "Recruiting page" preview links, and any lf/moso-aid redirect target that builds `/join` URLs
    (grep `join` across lf, lo, moso-aid; list what you changed).
  - Attribution must be unchanged: same `lead_origin` / referrer / `referred_by` values as today for each entry point
    (company `/join`, recruiter landing, Loan Officer site, `?ref=`). Write a table in the PR: entry point → values
    before → values after.
  - `/register-loan-officer`, `-v1`, `-v2` stay as they are (compare).
- **wcwfu:** remove the `execute/GetOp` fallback in `getRegisterLOProcessInfo` (prod packs serves
  `getRegisterLoanOfficer`, measured 06/11: fake key → 400, bogus endpoint → 404). lf + lo.
- 5 locales (en, es, vi, zh, he) for every new string. Never write "LO" in user-visible copy; write "Loan Officer".

### Backend (separate agent)
- New data with no home yet: call windows + ASAP + time zone, special requests rows + disclaimer ack (+ timestamp,
  copy `mortgage_website_approval_ack(_at)`), tech literacy ack. Agree ONE set of field names with the FE agent
  (write them in this file under "Field contract" before coding).
- packs (LORecruiting): add fields + accept them on the public register save → **draft PR only** (Khải merges).
- recruit-be: map them (lead shows windows; special requests list; SMS consent `is_consent_checkbox` too, which is not
  mapped today) → PR, tests, merge to master = staging after 2 reviews. Must tolerate the fields being absent.

## Rules (all agents)
- Work in a worktree from the latest `origin/master` of each repo; never in the main checkout.
- ram-gate before every heavy job (jest, tsc on full repo, next build/dev, Chrome):
  `tok=$(~/.claude/bin/ram-gate acquire <jest|next-dev|chrome|MB> <label> --wait 900) || { echo DENIED; exit 1; }` …
  `~/.claude/bin/ram-gate release $tok`. DENIED = wait, never run anyway. Stop dev servers when done.
- Never `--no-verify`, never bare `git stash`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests for new logic (step routing, `?key=` resume target, field validation, attribution table cases, URL swap).
- Screenshots BEFORE (current `/join/<slug>`, `/register-loan-officer`, lo `/<site>/join`) and AFTER (every step at 1280
  and 390 wide) into `docs/handoff/lo-registration-v2/shots-0611/` (agentflow repo).
- Open PRs into `master`, do NOT merge: the coordinator merges after 2 independent reviews.
- PR body says: **do not promote master → production until Bao approves /join v2** (master now carries the URL swap).
- Do not submit forms on production. Test accounts: `bao.trinh+<tag>@loanfactory.com` on staging (www.viet18.com).

## Field contract (fixed by the coordinator 06/11; FE sends, packs stores, recruit-be reads)
All on the LORecruiting registration payload, snake_case, all optional (absent = not answered):
| field | type | meaning |
|---|---|---|
| `call_windows` | string[] | chosen windows, each `"<startISO-UTC>/<endISO-UTC>"` (2 h), max 3 |
| `call_asap` | boolean | "Any time works, call me ASAP" |
| `call_time_zone` | string | IANA zone the Loan Officer saw (e.g. `America/Chicago`) |
| `special_requests` | string[] | one request per row, trimmed, empty rows dropped, max 10 × 500 chars |
| `special_requests_ack` | boolean | the regulations disclaimer tick; packs stamps `special_requests_ack_at` (server time) when it turns true |
| `tech_literacy_ack` | boolean | "I meet this expectation"; packs stamps `tech_literacy_ack_at` |
If an existing packs field already means the same thing (check `LORecruiting` first, e.g. a ready-to-join flag),
reuse it and note it here instead of adding a new one.

### Backend status (06/11, agentflow-wcwfu) — contract implemented unchanged
Field names are exactly the table above (no renames, no reuse: packs `ready_to_join` exists and is untouched).
- packs draft PR LoanFactory-Inc/packs#3840 (Khai merges): fields on `LORecruiting`, validation in `JoinV2Preferences`
  (HTTP 400 on bad input: >3 windows, non-ISO/inverted windows (end must be after start, max 12 h), non-IANA zone,
  >10 requests or >500 chars; special requests are trimmed and empty rows dropped; duplicate windows dropped, windows
  normalised to UTC instants). `_ack_at` is server-stamped and a client value is dropped; once stamped an ack cannot be
  withdrawn (same as the mortgage-website ack). All 8 fields come back from `getRegisterLoanOfficer` for `?key=` resume.
  Not accepted on the webinar / refer-a-LO public paths. The FE may send `call_windows: []` to clear.
- recruit-be mirrors them onto the candidate (Flyway V330; columns `call_windows`, `call_asap`, `call_time_zone`,
  `special_requests`, `special_requests_ack(_at)`, `tech_literacy_ack(_at)`, `sms_consent`) and returns them on
  `GET /api/v1/candidates/{id}` snake_case; ack times are `{timestamp, formatted, zone}` like every Instant there.
  `sms_consent` = packs `is_consent_checkbox`, recorded only. Missing keys never erase; an empty list clears.
- Follow-up (not done): recruit-fe display of windows / ASAP / zone / requests / ack times.

