# Ally LO posting-activity page — HANDOFF (paused 28/10 evening)

Session: `abfb7280-5783-4e50-91ec-d72fe22848ff` (resume: `claude --resume abfb7280-5783-4e50-91ec-d72fe22848ff` from `~/Projects/agentflow`).
Status: research only. No code, no bead, no message sent to anyone.

## Who asked
- **Victoria Pham**, meeting 16/09 — `docs/transcripts/lf-homepage/2026-09-16_ambassador-lo-funding-policy.md` (~9:00–34:00, decision at 33:16 "em làm thêm một cái tab khác").
- Duyên (Ally side) later asked Dat to build the same on Ally (Slack 07/10).
- Slack Bao↔Dat: 29/09 Bao asks for an API; 12/10 Dat sends `/v1/reports/posting-activity/me/destinations`; 21/10 Dat gets admin access to staging `viet18.com/manage-lo-programs/ambassador-program`.

## What Victoria wants
A new **tab inside the existing Ambassador admin page** (`/manage-lo-programs/ambassador-program`), one row per Loan Officer, default weekly + date-range filter:
1. Posts: auto vs self-created (click → list of posts)
2. Referred into Interested LO pipeline
3. Onboarding count
4. Onboarded 100%
5. Budget: spent vs reimbursed ("càng nhiều thông tin càng tốt")
Purpose: is each LO effective; avoid "spoon feeding" with auto posts. Columns 2–4 come from the recruit app; 1 and 5 from Ally.

## Ally API findings (spec copy: `ally_openapi.json` in this folder; live: https://ally.loanfactory.com/api/posts/openapi.json, staging base https://ally.viet18.com/api/posts)
- `GET /v1/reports/posting-activity/me/destinations` (what Dat sent) = **caller's own posts only**. Good for an LO self-view, not the admin table.
- `GET /v1/reports/posting-activity` (perm AUTO_POSTS/ALL): per-user rows, counts `total, self_template, self_no_template, admin_on_behalf, auto_post` (each `{count, by_platform}`); params `period` 7d|30d|90d|180d|365d, page, limit≤100, search, template_type (incl. LO_RECRUITING), sort, order.
- `GET /v1/reports/posting-activity/{user_id}/destinations`: drill-down list (category, platform, live_at, template_name, template_type, event, caption_excerpt).
- `GET /v1/admin/ambassador/spend?period=`: month_budget_cents, committed/spent/remaining_cents, bill_approved_cents, ads_count, level_name, ads_by_channel… (+ `/spend/months`, `/spend/export`).
- Mapping: auto = `auto_post` + `admin_on_behalf`; self = `self_no_template`; `self_template` → **Victoria decides**.

## Gaps to raise with Dat (not sent yet)
1. Reports/admin endpoints are Bearer-JWT only; `x-api-key` works only on social-links, posting-readiness, auto-post-events, generative. Need service key on posting-activity + ambassador/spend for moso-aid server-to-server.
2. Fixed lookback only → need `since`/`until` (weekly default + range).
3. No ambassador-only filter.
4. Ally UUID ↔ MOSO key: currently only via email; ask for a better join field.

## Update 04/11 (Slack thread with Dat)
- Dat: "a gắn vô đi, thiếu j thì nói e thêm"; confirmed `/v1/reports/posting-activity` is the list-all API.
- Dat said "ok" to adding `x-api-key` on the report/spend endpoints — not live yet (live spec 04/11 still HTTPBearer only).
- Re-checked live spec 04/11: `period` still only 7d/30d/90d/180d/365d (response echoes since/until, input does not accept them); `ambassador/spend` is already ambassador-only and per month.
- Ambassador filter for posting-activity: not needed from Dat — intersect with spend rows.
- Email: in Ally `email` = sign-in address (may be personal), `company_email` = work address (comment in `core/services/ambassador/spend.py`); Ally also stores `central_user_id`. Bao thinks posting-activity `email` is the company one — **verify with a real call once x-api-key is live**, then ask Dat only if needed.
- 10:43 Dat said "ok" to since/until too. Waiting on Dat for both (x-api-key + since/until).

## Next steps when resuming
1. Bao confirms → draft Slack msg to Dat (4 gaps), ask Bao before sending.
2. Create bead for the "Activity" tab (Ally: posts + budget; recruit: referred/onboarding/onboarded).
3. Ask Victoria where `self_template` counts.

- Bead: agentflow-6o9sa (created 04/11).
- Recruit columns 2-4 source found 04/11: recruit-be GET /api/v1/referrals (admin) totals_by_referrer by MOSO owner_key; has since, no until; needs server-to-server access.
- Admin page: lf-homepage src/shared/components/LoPrograms/AdminConsole/index.tsx (no tabs yet).

## Build started 04/11 (Bao: "làm đi"; posts = 3 columns Automatic / From template / Written by them)
- Contract: CONTRACT.md in this folder.
- .1 recruit-be internal totals (branch agent/agentflow-6o9sa.1-referral-totals, PR only, no merge)
- .2 moso-aid /lo-programs/activity (branch agent/agentflow-6o9sa.2-activity, PR only, no merge)
- .3 lf-homepage Activity tab (branch agent/agentflow-6o9sa.3-activity-tab, LOCAL only until Bao previews)
- Open decision for Bao: onboarded semantics = cohort referred in window (default) vs onboarded during window.
- 04/11 Bao: merge + deploy allowed (read as STAGING) for all 3 repos; may create the moso-aid<->recruit-be key secret (staging). Prod: ask Bao.
- 04/11 STAGING done: #819 997472ee (503 until IAM grant), #211 6720a3e5 rev 00200, #2695 00ead8e3 rev 01588. Waiting: Khải/Đạt secretAccessor; Dat x-api-key + since/until; screenshots need Bao login.
- 04/11 14:25 screenshots (staging AFTER) published: https://claude.ai/artifact/Rbpvz7LDZb2grArvD3YvC3 — no prod BEFORE (not logged in loanfactory.com); posts modal not shootable until Ally returns counts; table needs horizontal scroll at 1440 with MOSO sidebar.
- 04/11 15:00 range picker (6o9sa.4): #2696 merged 042f4e8e, staging rev 01589; verified on staging.
- 04/11 16:20 6o9sa.5: moso-aid #212 merged 7abdef7 rev 00201, staging measured sources.referrals=not_configured. lf #2697 (table fits 1090px, CSS only) PR open, reviewed, waiting Bao re-login on viet18 to preview before merge.
- 04/11 16:35 6o9sa.5 done on staging: lf #2697 9bd2931b rev 01590 (table 1091px = box, no scroll at 1440), moso-aid #212 rev 00201 (referrals not_configured banner).

## RESUME POINT (paused 04/11 ~16:45, session abfb7280)
Resume: `cd ~/Projects/agentflow && claude --resume abfb7280-5783-4e50-91ec-d72fe22848ff`
- STAGING done & measured: 6o9sa.1-.5 all closed. Before/after artifact: https://claude.ai/artifact/Rbpvz7LDZb2grArvD3YvC3
- Nothing running; no open PRs/worktrees for this feature.
- WAITING (not ours): Dat x-api-key + since/until (posts, budget) → then call real API: email vs company_email match, zero-post users omitted?, since/until semantics, shoot posts modal.
- WAITING: Khải/Đạt grant secretAccessor on recruit-be-recruit-referrals-internal-api-key → recruit-be-deploy@; then add line to helm-chart/config/staging/secret-keys.txt, redeploy, verify gateway 200, referrals column fills.
- PROD: not touched; needs Bao go + agentflow-048o (Cloud Run public ingress / forged x-moso-user-id, DevOps) + prod secret.
- bd dolt push → 403 (account lacks write on TRONGBAO2104/agentflow).

## 04/11 evening — Ally service route measured (staging)
- Dat shipped `GET /v1/reports/service/posting-activity` (+ `/{user_id}/destinations`) with `x-api-key` + `since`/`until` (DATE only). Live prod spec: not yet.
- Measured: since/until = whole UTC days (echo `T00:00:00Z` / `T23:59:59.999999Z`, until clamped to now if in future); date-times → 422; span > 366 days → 400 "at most 366 days"; zero-post users ARE listed (all 17 staging users); list has `user.email` only (no company_email); positive control chauchau.inc@gmail.com 89 auto_post in 365d (last 2026-08-31).
- `/v1/admin/ambassador/spend` still Bearer-only → budget stays "unauthorized"; needs a service twin from Dat.
- moso-aid branch agent/agentflow-6o9sa.6-ally-service-route: switch to service path + plain-date params + exactness for UTC echo/clamp.
- PROD GATE: before moso-aid prod release, confirm prod Ally has /v1/reports/service/posting-activity (live prod spec 04/11: NOT yet).
- 04/11 18:35 6o9sa.6 DONE on staging: moso-aid #213 (service route, plain dates, UTC exactness) + #214 (match by MOSO sign-in e-mail decoded from key; 3 passes). rev 00203. UI: Aug 2026 → Chau Chau 15/15 automatic, modal lists 15. Prod Ally now also serves the service route (spec 04/11 18:30); staging ALLY key → 401 on prod (prod needs its own key). Budget still Bearer-only. Modal shows live_at in UTC clock (7:37 AM = 00:37 LA) — minor.
- 04/11 19:15 re-checked: secret IAM policy EMPTY; bao.trinh has no setIamPolicy (403). Can grant: owners (khai@loanfactory.com, khai@moso.com, thanh.t.tran@, info@moso.com), dat.vo@ (secretmanager.admin), hoa.truong@ (projectIamAdmin). Other recruit-be secrets all have accessor for recruit-be-deploy@ + versionAdder for bao.
- CORRECTION: prod moso-aid (project lender-rate, rev 00125) ALREADY has a prod ALLY_API_KEY that returns 200 on prod /v1/reports/service/posting-activity (Oct 2026: 1607 users). Spend → 401 with prod key too. No new Ally key needed for posts on prod.
- Prod checklist: (1) moso-aid master→prod release (rev 00125 has no /lo-programs/activity); (2) prod RECRUIT_API_URL + RECRUIT_REFERRALS_SERVICE_KEY on moso-aid prod + prod secret + IAM + secret-keys line in recruit-be prod; (3) lf-homepage: lift NOT_ON_PRODUCTION/activityTabAllowed only after agentflow-048o; (4) budget waits Dat.

## RESUME POINT — PAUSED 05/11 morning (session abfb7280)

State: unchanged since 04/11 evening. Staging posts live (moso-aid rev 00203); referrals wait on IAM grant
(recruit-be-recruit-referrals-internal-api-key policy still EMPTY); budget waits on Dat's x-api-key spend route
(none in staging spec at last check). Prod: nothing deployed; needs Bao go + agentflow-048o closed.

Done 05/11: drafted English status message to Victoria (Bao sends it himself; artifact Rbpvz7LDZb2grArvD3YvC3 is
private, Bao must Share). Replied "no HOLD" to session e19da9e9's recruit-be prod release (none of its commits are ours).

NEXT (proposed to Bao, waiting for his OK — do in order, no stops once approved):
1. Read-only prod measurement: match the 16 approved prod Ambassadors (MOSO prod Datastore) against prod Ally
   service posting-activity (prod moso-aid ALLY_API_KEY works) -> how many will show numbers vs "—".
2. Posts modal: show live_at in America/Los_Angeles instead of a UTC clock (lf-homepage, to staging).
3. English share-friendly artifact for Victoria (screens + how to use; no internal names/IAM talk).
4. Prepare prod PRs as DRAFTS only (moso-aid release, lf-homepage lift activityTabAllowed / NOT_ON_PRODUCTION
   once 048o closes); do not merge.
Also re-check both blockers first: `gcloud secrets get-iam-policy recruit-be-recruit-referrals-internal-api-key
--project lenderrate-master` and the staging Ally spec for a service spend route.
Open question for Victoria: is "From template" (self_template) self-posted or automatic?

## RESUME POINT — PAUSED 05/11 ~17:55 (session abfb7280)

Unblocked today and shipped to STAGING:
- Khai granted secretAccessor (staging) + created the empty PROD secret recruit-be-recruit-referrals-internal-api-key
  with accessor for recruit-be-deploy@lender-rate and versionAdder for bao (17:13, not verifiable from bao's account).
- recruit-be #866 (3a93a3ae1): staging secret-keys line RECRUIT_REFERRALS_INTERNAL_API_KEY; promoted (workflow_dispatch
  "Promote to staging") + Deploy staging OK. Measured: activity-totals no key 401, moso-aid key + owner_keys 200.
  (Without owner_keys the gateway answers 503 "Backend service is temporarily unavailable" — not a config problem.)
- Dat shipped GET /v1/admin/ambassador/service/spend (x-api-key, period=YYYY-MM, same shape; staging + prod spec).
  Staging 200: 2026-11 1 row (Lien Pham), 2026-10 3 rows (budget 50000 cents), 2026-08 0 rows.
- moso-aid #215 (bb4050d) readBudget -> service/spend; 61/61 tests; staging rev moso-aid-00204-nmv.
- bead agentflow-6o9sa.7 (open) — close after the UI check below.

NEXT on resume:
1. Bao logs in on viet18.com (staging session expired) -> open /manage-lo-programs/ambassador-program, Activity:
   check referral banner gone + Referred/Onboarding/Onboarded numbers, Budget column for Oct 2026 (Lien Pham / Chau Chau);
   screenshots into artifact Rbpvz7LDZb2grArvD3YvC3; close 6o9sa.7.
2. Then the 4 proposed items (prod read-only match of 16 Ambassadors, LA time in posts modal, English artifact for
   Victoria, draft prod PRs). Prod secret VALUE: add it only at prod release, in the same step as moso-aid prod env
   RECRUIT_REFERRALS_SERVICE_KEY (bao can add versions but not read them back).
3. Prod still needs Bao go + agentflow-048o + recruit-be prod secret-keys line.

INCIDENT 05/11 17:30: a mis-rooted `git commit -a` committed other sessions' dirty files into agentflow main and pushed
(5b2e8d1, message wrongly says recruit-be secret line). Includes 3 staging login state JSONs with live refresh tokens;
repo TrongBaoMoso/agentflow is PUBLIC. Not rewritten. Waiting on Bao: make repo private? revoke those staging
sessions? gitignore docs/handoff/recruit-e2e-lab/scripts/state_*.json?

## 06/11 00:10 — STAGING complete (session abfb7280)
- UI checked on staging (Bao logged in): Oct 2026 → referral banner gone; Chau Chau Referred 3 / Onboarding 27 / Onboarded 0;
  Budget "$0 / $0" for Chau Chau + Lien Pham, "—" for members not in Ally.
- BUG found by positive control + fixed: recruit-be keys referral owners by MOSO Admin NAME (referrer_identity.moso_admin_key =
  sign-in e-mail), moso-aid sent the websafe key → everyone 0. moso-aid #216 (3f323c9, rev moso-aid-00205-9hq) sends
  mosoAdminNameOf(key) (case kept), falls back to the key. Measured: websafe key Oct 0/0/0 vs name 3/27/0; 12 months 21/27/8.
  Full suite 1170/1170. Beads 6o9sa.7 + .8 closed.
- Artifact Rbpvz7LDZb2grArvD3YvC3 v6: status table + new Oct screenshot.
- OPEN for Bao: Budget column shows spent / APPROVED BILLS (bill_approved_cents); Lien Pham has month_budget $500 in Oct but
  shows $0 / $0. Decide: "spent / budget" (month_budget_cents, already in API) vs current.
- Prod checklist add: moso-aid prod must carry #215 + #216; prod referral secret VALUE + moso-aid prod RECRUIT_API_URL /
  RECRUIT_REFERRALS_SERVICE_KEY in one step; recruit-be prod secret-keys line; Ally prod has service/spend (spec 05/11).

## 06/11 02:40 — ON PRODUCTION (session abfb7280, Bao approved "ok lên prod" 06/11 ~01:00)
- moso-aid: prod env set first (--update-env-vars only, 17 → 19 vars: RECRUIT_API_URL=https://gateway.loanfactory.com/recruit-svc,
  RECRUIT_REFERRALS_SERVICE_KEY = same value as new prod secret recruit-be-recruit-referrals-internal-api-key v1); then
  PR #217 master → pro (only #211–#216) → rev moso-aid-00127-lvd (fbba540). Prod Ally key: service posts + spend 200.
- lf-homepage production: hotfix #2704 (cherry-picks #2695 #2696 #2697 #2703 + lift NOT_ON_PRODUCTION/activityTabAllowed for the
  two Activity reads; team routes stay refused) → rev 00760; master mirror #2705 so the next promotion keeps it.
  Loader: #2706 (LoaderLF) then #2708 (Mantine orange oval — LoaderLF gif is 1.1 MB, blank first frames); prod #2707 + #2709 → rev 00762.
- Budget cell = spent / month budget, approved bills in tooltip (#2703, Bao OK).
- Measured on PROD (IT Team login, Oct 2026): 16 Loan Officers; posts real (Matthew Fallon 145, Michael Hicks 100, Seth August 38);
  budget Seth $0 / $1,000, LO Demo $0 / $500; referrals banner "not connected yet" (expected).
- PENDING: recruit-be #872 (prod secret-keys line, merged to master 6773683f9) rides the NEXT recruit-be production FF (Bao: "để lô sau";
  prod is 19 commits behind incl. HOLD #841). After it lands: activity-totals on gateway.loanfactory.com → 200, banner disappears.
- PERF: prod Activity first load 13–14 s (Ally serves 17 pages × ~1.2 s; parallel does not help: 6 pages in 4.5 s). Cache 60 s.
  Ask Dat for an emails/user_ids filter on service/posting-activity. Not changed.
- agentflow-048o still open (accepted by Bao for this release).

## 06/11 afternoon — two review rounds, both to PROD (Bao: "lên prod luôn")
Round 1 (Bao's PDF + modal review):
- moso-aid #218 (rows carry avatar + nmls from the application snapshot), #219 (posts drill-down: platform filter + newest/oldest
  over the WHOLE list moso-aid already reads, + per-platform counts; Ally API has no sort/filter — Dat 06/11). Prod via #220 → pro,
  rev moso-aid-00128 (19 vars unchanged).
- lf #2715: PersonCell in Activity rows, group tints + dividers, modal 1,100px with person header, in-modal date/type/platform/order,
  numbered pages of 50, "Posted" date-over-time in PT, platform icons, Type only on All posts, "By admin" tag. Prod #2716 (00764).
Round 2:
- lf #2717 quick picks (this/last week, this/last month, last 7/30/90 days) inside the date popover (table + modal); platform as one
  Select with counts; Platform column only for All; sticky table header (Activity tablebox no longer clips).
- lf #2719: popover portaled — inside .lop, `.lop table {width:100%}` blew the month grid to 1,000,000px (one column visible);
  trigger is a native <button>. Prod #2722.
- Double scroll: MOSO frame is `height:88vh` from the MOSO page template (GetTemplateOp data, not packs code). Needs a template
  change (auto-height via postMessage) — shared by every webPlus page; not done.
- Dat agreed to add post URL (published posts only) + status filter to the destinations API → then add a link column.
- Staging incident 06/11 ~16:30: postgres-0 rescheduled by GKE (volume attach) → recruit 503 for ~10 min; recovered.

## RESUME POINT — PAUSED 06/11 ~18:50 (session abfb7280)
DONE today: Activity fully on PROD (posts + budget + referrals; #872 rode the 06/11 recruit release #890, prod Oct: Seth August 1/17/1).
Two review rounds on prod (moso-aid 00128; lf 00765). Victoria message drafted (Bao sends).

IN FLIGHT — Bao's third review (06/11 18:40):
1. Header radius on the 2nd header row (TOTAL cell rounded) → fixed: radius only on first row's first cell.
2. No horizontal scroll at narrow widths (sticky header made the box non-scrolling) → useFitsBox(): ResizeObserver; table fits → sticky
   header, box does not clip; too wide → class is-scrollx, box scrolls sideways (header not sticky then).
3. Level as coloured chip → `badge badge--l{rank}` (same as Applications) with the level name.
   These 3 are UNCOMMITTED in lf-homepage-worktrees/activity-polish3 (branch agent/agentflow-6o9sa.19-activity-polish3, from master).
   Next: run LoPrograms jest, commit (pre-commit build via ram-gate 3000), PR → master, check staging, cherry-pick to production hotfix
   (Bao approved prod for this polish), verify prod at a narrow window + chip colours.
4. Slow Activity API (Bao measured 11.4 s) = Ally 17 pages. moso-aid #221 (cache TTL 60 s → 10 min) MERGED to master (staging).
   Next: promote master → pro (PR like #220; check pro..master is only #221), verify prod.
Waiting on Dat: post_url (published only) + status filter for destinations → add link column (bead 6o9sa.16); emails filter (6o9sa.13).
Bao: leave the MOSO 88vh double scroll as is.
