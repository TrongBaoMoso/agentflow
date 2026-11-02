# /join to production via a per-key join-page lookup — RESUME POINT (paused 02/11 ~16:45 +07, session bb6ab172)

## Bao's decisions (02/11)
- Make moso-aid `GET /api/join-page` work "like /api/lo-setting" (per-key MOSO GetOp), do NOT wait for Khải's MOSO_ADMINS_API_KEY.
- Ship `/join` to production (lo-homepage #926 into `produciton-v2`, then lf-homepage #2693 into `production`).
- Turn the /lo-setting recruiting editor ON on prod, accepting HIGH-1 (save trusts the loKey; same trust model as the existing lo-setting save).

## Why (measured 02/11)
- Prod `/api/join-page?key=<Suong Nguyen>` = 404 while `/api/lo-setting` same key = 200. Cause: anonymous getAdmins has 0 keyed rows of 2,948 (12 recruiters, 0 keyed) since packs#3761.
- Anonymous MOSO GetOp (`https://www.loanfactory.com/api/webplus/v1/5716104026521600/execute/GetOp?key=`) returns the full row (176 fields, key echoed, active / is_loan_originator / url / company_email / recruiter flags); unknown key = 400.
- `suongloanofficer.com/join` today redirects to the home page because lo-homepage prod has no /join code (#926 is DRAFT).
- Prod moso-aid env: no MOSO_ADMINS_API_KEY, no JOIN_PAGE_READ_KEY, LO_RECRUITER_PAGE_REQUIRES_APPROVAL unset (gate OFF), RECRUITER_PROFILE_SERVICE_KEY set (plain env). lo-homepage-v2 prod: none of RECRUITER_PROFILE_SERVICE_KEY / JOIN_PAGE_READ_KEY.

## Done
- moso-aid PR **#207** (branch `agent/join-page-per-key-lookup`, head c3d84fc, worktree scratchpad/joinpage): `src/services/recruiters.js` falls back to GetOp per key ONLY when the directory has no keyed row at all; same rules; recruiter page matched by work email; in-flight dedupe; failures remembered 15 s; oldest evicted past 5,000. Full suite 70/1038 green. Read-only probe against prod MOSO: Suong → isActiveLoanOfficerKey true, isJoinPageOwnerKey true; unknown → false.
- 2 reviews on the first commit (code-reviewer APPROVE, security APPROVE-with-precondition). Review fixes are in commits e062e21 + c3d84fc (NOT yet re-reviewed).
- Security precondition: the #201 rate limit must be on `pro` with or before #207 (per-key GetOp = public 1:1 upstream amplification).
- Bead: see `bd show` of the bead created at pause.

## NEXT (in order)
1. Re-review #207 (the two new commits) with 2 reviewers; update the PR body (gate-ON key-less case not covered; prod gate is OFF); merge to master.
2. Generate JOIN_PAGE_READ_KEY (random, e.g. `openssl rand -hex 32`), store in Keychain + record in docs/secrets/SECRETS-INVENTORY.md (name only, never the value). Set it with `--update-env-vars` ONLY (never --set-env-vars/--env-vars-file) on Cloud Run `moso-aid` and `lo-homepage-v2` (project lender-rate, us-central1).
3. Set RECRUITER_PROFILE_SERVICE_KEY on `lo-homepage-v2` = moso-aid prod's value (copy without printing), `--update-env-vars` only.
4. Promote moso-aid master → pro (now carries #201 #202 #203 #207; #202 without MOSO_ADMINS_API_KEY falls back to the public read = today's behaviour + a startup warning). Old pro-only branch `release/pro-join-page-per-key` (worktree scratchpad/joinpage-pro) was a first cherry-pick of #207 only — discard it.
5. Verify prod: `/api/join-page?key=<Suong>` = 200; `/api/lo-setting` still 200; no new 5xx.
6. Mark lo-homepage #926 ready, merge into `produciton-v2`, wait for Cloud Build (lender-rate), verify `https://www.suongloanofficer.com/join` = real /join page, /loan-officer + register still 200. No test sign-up on prod.
7. Mark lf #2693 ready, merge into `production`, verify lf `/join/<slug>` behaviour.
8. Bead for a real auth on the recruiting editor AND the lo-setting save (HIGH-1, both trust the loKey).
9. Follow-ups: encode loKey in moso-aid `lo-setting.js:55`; prod `/api/lo-setting` 500s since 03/10 = bd agentflow-ahgee.

## Context already finished this session (do not redo)
- moso-aid #200 (+ #205 warn log) live on pro (#204, #206; rev moso-aid-00122-b2r); Tài told on #200. user-service prod is `mode=shadow`.
