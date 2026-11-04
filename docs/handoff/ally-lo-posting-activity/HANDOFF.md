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
