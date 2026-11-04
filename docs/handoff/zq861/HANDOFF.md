# Handoff: epic agentflow-zq861 (recruit Flow A layout fixes, Bao 01/10/2026)

Paused 01/10/2026 ~18:10 VN because the machine is shutting down. A NEW session (any id/name) resumes from this file.

## How to resume (new session)
1. `cd /Users/apple/Projects/agentflow && bd show agentflow-zq861` (epic notes = resume map) and `bd show agentflow-zq861.N` for each child (each has a RESUME note).
2. Read `docs/handoff/zq861/RULES.md` (rules every worker agent must follow: git, review, Bao's 5 standing rules, heavy-build lock). Heavy jobs now go through `~/.claude/bin/ram-gate` (Rule #6 in RULES.md); the old lock is retired.
3. `git fetch` all repos; trust nothing below without re-checking (`gh pr view <n>`).
4. Spawn fresh worker/reviewer agents (old agent ids do not survive a restart). Give each the RULES.md path + its bead.

## Product decisions (Bao 01/10)
- Today = each role's daily work. OS Today = only candidates assigned to me. Manager approvals live on Today (Exceptions = oversight lens, link only).
- S5 waiting-on-LO leaves Today; resurfaces only post-1-1 with a reason (PARTIAL after 2d, STALLED after 7d). Legacy pre-1-1 payments never resurface.
- HR and Licensing do not work in recruit: work hidden, status read-only.
- OS bells: assigned (S5), joined (S6), 1-1 due. Recruiter bells: paid, signed. Manager bell: approval requested.
- Role-based sidebar (matrix in bead .9); Reports = MANAGER only; My referrals only for people with >=1 referral.
- Conversation: anyone following the candidate. Only Managers self-follow; only owner/OS/manager add people; only an owner/OS/manager @mention adds (others only notify).
- Headhunter (LO Recruiter Program, in-house W-2): sees/contacts only own collected leads; Team Lead sees team; Vic/Bray see all (HH leads read-only while held); auto-own + idle release; HH may re-claim after release; every HH invite needs manager approval with reasons; role auto-granted from lf-homepage program approval (moso-aid pull sync); team lead picked on that approval page; binding = SSO email == MOSO company_email; external hires need a MOSO account first.
- Pending Bao: packs #3596 F2 (allow agreement re-send when the signed main doc is not the currently required class); reply to recruit-fe issue #322 (draft `reply-322-v1.md`, not posted); who does the recruit DB backup for the production release.

## STATUS 15/10 — session review (measured, read-only)
Update 15/10 later: .25 CLOSED (regenerated with the script on postgres:16 — V208 tables match; only unrelated drift from #643 → bead agentflow-c32p1). rsnyo OWNED by session agentflow-20 (landing, d11ae72d): REVOKED exclusion now, LAZY_SSO policy = Bao. Triggers recorded in beads (labels before-prod-referrals / before-prod-apply / blocked-platform), `bd memories recruit-prod-triggers`, and memory project_recruit_prod_triggers_zq861.md.
All Headhunter code is on PRODUCTION (recruit-be prod c2bb9df1 ~ master 13862810). Prod: 0 HEADHUNTER/TEAM_LEAD grants, program_sync DRY_RUN, referrals.enabled=false, 0 origin-stamped leads -> no leftover is live on prod today.
Closed 15/10 after verification: zq861.16 (#622), wphm1 (#3679/#3680).
Open follow-ups (none in flight, nothing pushed/unmerged by this session): .12 (moot on prod: 0 stamped rows), .15, .17, .18, .19, .20, .21 (platform team), .23, .25 (likely resolved, diff when Docker is up), .26, .27, rsnyo (must be fixed BEFORE referrals turn on in prod; recruit-fe #487 adds My referrals for Loan Officers).
Before prod program_sync APPLY: land .17 + .23. Staging test state kept on purpose: +hh linked ADMIN_CONFIRMED with a hand HEADHUNTER grant; auto_own on; one staging TEAM_LEAD grant.

## STATUS 05/10 morning — PAUSED (Bao shut down the machine). zq861 Headhunter is DONE ON STAGING.
Resume point for a fresh session (orchestrator was agentflow-cd; implementer hh-role; coordinator agentflow-77):
- Final staging browser re-check PASSED 05/10 (recruit-be 5d8890db, recruit-fe b15d543c). Evidence: docs/handoff/zq861/hh-resume.md "E2E RE-CHECK 05/10", screenshots/hh-e2e3-*.
- Merged + on staging in this last stretch: recruit-be #529 #530 #531 #533 #532(PR6) #539(PR7-A) #545 #548 #550; recruit-fe #347(PR7-B) #359 #361; moso-aid #186; lf-homepage #2606 #2607; PRODUCTION: lf-homepage #2608 (/join no longer waives the fee; Bao approved).
- Staging state left on purpose: program_sync.mode = DRY_RUN; headhunter.auto_own_enabled = true; +hh (bao.trinh+hh@) linked ADMIN_CONFIRMED with a hand-made HEADHUNTER grant.
- Open for Bao (decisions): switch program_sync to APPLY; production rollout gates (recruit-be #322 promotion process, agentflow-048o, packs #3590, packs system actor + RECRUIT_PROGRAM_SYNC_MOSO_APP_ID/_NAMESPACE on prod read from a real prod key, DRY_RUN first-tick review, referrals.enabled off until lazy links demoted). See docs/handoff/zq861/bao-decisions-0210-night.md (all of Bao's decisions + orchestrator calls).
- Leftover small work: hh-role wrap-up (one local negative control for the stale refresher cap/429; bead hygiene; close finished zq861 beads) — see hh-resume.md for what was done before the pause. Follow-up beads zq861.17-.27.
- Docker Desktop is stopped. No auto-merge armed. No open zq861 PRs.
- hh-role paused cleanly (no jobs, no tokens, all 10 worktrees clean + merged → removable on resume). Wrap-up finished 05/10 after restart: stale-refresher negative controls VALID (local), beads ch9m5/.13/.14/.22/.24 closed after verification (see hh-resume.md). The production-gate list above replaces its pending "DONE ON STAGING" section.

## STATUS 02/10 ~18:30 (PAUSED by Bao, going home) — newest; read this first
Orchestrator session: id ac40b799-b5c3-4aef-96fe-d561762d5380 (named agentflow-93; coordinator = agentflow-eb; HH implementer = hh-role; other lane = agentflow-35).
- SHIPPED STAGING today: packs #3596; recruit-be #524 (PR4a auto-own), #525 (PR4b catch-up/admin/held list/cap); moso-aid #186 (PR5 roster + team leads; LO_TEAMS_WRITE_ENABLED=true staging only; RECRUIT_INBOUND_SERVICE_KEY set on moso-aid staging + recruit-svc-secret RECRUIT_MOSO_AID_ROSTER_KEY).
- STAGING E2E (recruit side) PASSED with test HH bao.trinh+hh@ (2d21fc2c): auto-own, scope 404s, redaction, HH invite → manager card, held list, admin re-run. Log: .worktrees/_designs/hh-e2e-log.md. Staging still has headhunter.auto_own_enabled=true + the +hh grant (deliberate).
- /join FEE BUG (Bao: fix BOTH sides): /join sends waive_startup_fee → recruit made S5 + IMPORTED WAIVED offer → auto-own never fires. Prod has 0 affected rows (measured). Design v2 AGREED by architect + lf-homepage owner + packs owner (SAFE TO REMOVE). recruit side implemented locally (.worktrees/recruit-be-joinfee, branch fix/join-page-fee-waiver, V205/D200, sticky candidates.moso_fee_waiver_ignored), NOT pushed; lf-homepage half next; 4 staging rows: clear MOSO waiver via app path only if side-effect free, else archive. lf-homepage must reach prod no later than recruit (Bao OK needed for any prod promotion).
- PR5 lf-homepage picker: in progress locally (picker hidden in prod until agentflow-048o).
- Remaining after that: PR6 program sync (ON in staging after merge, Bao approved; reads env RECRUIT_MOSO_AID_ROSTER_KEY; notes from #186 reviews on bead), PR7 recruit-fe nav/My leads.
- Skipped by Bao: agentflow-wphm1 (legacy packs public endpoint accepts waive_startup_fee) → P3.
- Docker Desktop still running (orchestrator holds ram-gate token, scratchpad docker.tok).
- Combined review files: hh-pr4-review.md, hh-pr5-review.md in this folder.

## STATUS 02/10 ~17:00 (PAUSED by Bao via agentflow-eb)
- Since the morning: packs #3596 deployed to staging (SWAT rerun by orchestrator after Bao's login); HH PR4a be #524 (0f27c5f9) and PR4b be #525 (4634ffaf) merged + on staging. Docker Desktop started (ram-gate token in scratchpad docker.tok).
- STAGING TEST STATE (remember to clean up or keep deliberately): new test account bao.trinh+hh@loanfactory.com (central user 2d21fc2c…, MOSO Admin + AdminBucket 21 inserted raw, moso-aid lo_recruiter application 6abf6ac07dd6abc9b619b7d6 approved), HEADHUNTER granted in recruit staging, headhunter.auto_own_enabled=TRUE on staging. Log: .worktrees/_designs/hh-e2e-log.md. Waiting on Bao: delete memcache keys active_admin_bucket_v2_21 / inactive_admin_bucket_v2_21 (ns 5716104026521600, Java String) so packs sees the Admin; then run the E2E.
- PR5 (moso-aid roster/team + lf-homepage picker): 4 reviews in, combined list docs/handoff/zq861/hh-pr5-review.md; implementation in progress locally (hh-role). Bao: outside hires re-apply logged in (no link action). Prod gates: LO_TEAMS_WRITE_ENABLED off + picker hidden in prod until agentflow-048o.
- Remaining: PR5, PR6 (program sync; Bao approved ON in staging after merge), PR7 (FE nav/My leads).

## STATUS 02/10 ~07:50 (paused by Bao) — supersedes the table below where they differ
- SHIPPED STAGING: be #511 #512 #513 #515 #516 #517 #520 #522 #523 (follower flag ON in staging only); fe #307 #309 #310 #311 #314 #315 #330 #333; packs #3596 MERGED (staging deploy waits Bao's SWAT login: Rerun latest `install packs/loan`, never packaging first).
- Followers (.8): CLOSED, verified on QA Anew (tagged test data kept). Follow-up bead zq861.16 (raw user id in FOLLOWED rows).
- Headhunter (.10/.13): PR1-PR3 merged; roles granted to NO ONE. PR4a = be #524 (auto-own, V202/D196) REQUEST_CHANGES from both reviewers: see bead .10 resume note + docs/handoff/zq861/hh-pr4-review.md. Next: PR4b (catch-up with max age, narrow admin endpoint, held-by-collector list, per-HH cap, read-scope fail-closed on shared keys), PR5 moso-aid roster/team + lf-homepage team-lead picker (rule 3: + that repo's Repo Owner agent), PR6 program sync (flag off), PR7 recruit-fe nav/My leads. Bao 02/10: HH sees only candidate-facing info on non-owned leads; future-dated clamp for everyone; build PR4-7 to staging, no grants, no prod.
- Other sessions: agentflow-26 owns viid9/3dci6/f5ycp/wvggz + fix/business-clock (pings before touching Today/bells/ActivityServiceImpl/ApproverTodayReader). #514 (platform inbox, another session) holds V197.
- Reviewers used (fresh agents needed after restart): architect + security for HH; java/typescript + repo-owner for others.

## State per item
| Bead | Item | State |
|---|---|---|
| .3 | Hide HR/Licensing | DONE, staging (fe #309) |
| .6 | Exceptions polish | DONE, staging (fe #310) |
| .7 | A25 Welcome email | CLOSED: staging suppresses @test.com sender; prod sends |
| .9 | Role sidebar | fe #307 on staging; filtering activates when be #512 lands |
| .8 step 1 | OS on omni cast | DONE, staging (be #511, fe #311, docs be #516); proven on QA Anew |
| .1/.2/.4/.11 | Today by role + bells + S5 + manager decisions | be #512 rebased on master + pushed at 9bb5053f (build + 7 ITs green, SCHEMA regen no diff; migrations V181-V184). STILL TODO: V183 COLLIDES with be #514 (V183__platform_inbox_outbox.sql vs our V183__referrals_has_any_ttl.sql); whichever merges second renumbers (ours: next free number + SCHEMA regen + fix V183/V184 mentions in D187 and STATUS); then 2 reviewers re-check, then merge. fe #314 approved by both, waits #512 |
| .8 step 2 | Followers | be #513 + fe #315, titles "[DO NOT MERGE: waits #512]"; CI unit/FE green; after #512: rebase, renumber V196/V197 + D-row, SCHEMA regen, ITs, reviewers. omni-service #476 merged, NOT promoted to omni staging (promote before flipping RECRUIT_OMNI_FOLLOWER_ROLE_ENABLED) |
| .5 | A18 packs signing | packs #3596 at b56a1854d61; both reviewers REQUEST_CHANGES (ADMIN permission on RecheckLOAgreementCompletionOp; 48 prod rows classification; F1 main-slot-only rule; F2 deadlock; F3 retire only on completion). QA Aone repaired on staging by hand |
| .10/.12 | Headhunter + backfill | Design v3 approved-with-changes (`hh-review-v2.md`). PR1 be #515: review fixes local 7e0fcdf4 (unpushed, tests pending). PR2 local, rebased. PR3-7 not started |

## Merge order on resume
#512 -> #314 -> #513/#315 -> #515 -> HH PR2..7. Promote each recruit repo to staging with `gh workflow run promote-staging.yml --ref master` (never push staging). Production: NOT this epic; see issue #322 analysis (BE first, DB backup + rollback test first).

## Environment notes
- Use `./gradlew --no-daemon` under the lock: another agent's `gradlew --stop` kills the shared daemon and everyone's builds.
- Machine has 24 GB; run at most one heavy build at a time (lock), targeted tests only, let CI run full builds (mark PR ready-for-review: draft PRs skip pr-check).
- Agents hit session limits; resume them rather than assume dead.

## HH production gates (03/10, orchestrator; none met, each needs Bao's explicit OK)
- agentflow-048o closed (a forged admin identity could otherwise approve → HEADHUNTER).
- packs #3590 (origin stamp) released to production.
- recruit-be production promotion only through the #322 process (it carries everything on staging).
- PR6 sync: first production tick in DRY_RUN and reviewed; program_sync.mode stays OFF/DRY_RUN on staging until recruit-fe sends expected_role_codes (bead agentflow-zq861.22, folded into PR7 FE).
- A packs system actor configured on production for the /link referrers/resolve check (without it every production /link answers 503).
- Production referrals.enabled stays OFF until lazy links are demoted (agentflow-rsnyo).
- moso-aid LO_TEAMS_WRITE_ENABLED off and the lf-homepage team-lead picker hidden in production until 048o.
- RECRUIT_PROGRAM_SYNC_MOSO_APP_ID and RECRUIT_PROGRAM_SYNC_MOSO_NAMESPACE set on production recruit-be (verify the values read-only first; likely s~lender-rate + 5716104026521600). Blank = the sync tick does nothing.
- Rollout checklist for the MOSO pins: read a REAL production roster key read-only (moso-aid production /api/lo-programs/recruit/members, or a production Admin websafe key) and decode its app id + namespace; set RECRUIT_PROGRAM_SYNC_MOSO_APP_ID / _NAMESPACE from that, not from memory.
