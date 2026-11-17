# RESUME — SAFE Exam Center (paused 17/11 ~18:00 VN, session 0d4eea5a)

Beads: agentflow-cjfkz (state exams + admin settings, OPEN), agentflow-tjeb8 / bb1j5 / y0m1w (forgot password, mail kit, prod log leak — CLOSED).
Backlog: "Practice All Questions" (P3, depends on cjfkz).

## DONE (prod)
- Forgot password live on www.loanfactory.com (moso-aid pro #243, lf production #2766). Prod E2E PASS with bao.trinh+examreset@loanfactory.com.
- moso-aid prod no longer logs request bodies (#244, revision moso-aid-00136-jd2). Old entries expire by themselves (~17/12) — Bao: leave them.

## DONE (staging) — agentflow-cjfkz
- moso-aid #245 (master 94c4359), lf-homepage #2768 #2770 #2771 #2773. Staging E2E PASS (see bead notes + screenshots in this folder).
- Admin page must be opened on the run.app host (MOSO iframe); www.* domains only allow GET to /webplus-api (by design).
- Staging admin test: Chau Chau, MOSO key in .worktrees/_designs/chau_key.txt (rebuild: Admin entity key, app s~lenderrate-master, ns 5716104026521600, email chauchau.inc@gmail.com). Saves record chauchau11@loanfactory.com.

## IN FLIGHT at pause
1. lf-homepage **#2774** merged into `production` at ~10:51 UTC; Cloud Build prod was WORKING (finishes on its own).
   Interim prod state is safe: picker shows National only ("State exams are unavailable" until moso-aid has /exam/options); admin "Exam settings" tab shows "Couldn't load"; Registrants tab still works (old moso-aid ignores the x-service-key the proxy adds).
2. moso-aid **#246** (hotfix/exam-states-prod → `pro`, only #245, 1267/1267 tests) is OPEN, NOT merged.

## NEXT (in order)
1. Confirm lf prod build SUCCESS and the prod lf-homepage image contains the #2774 merge commit.
2. Merge moso-aid #246 (`gh pr merge 246 --merge`), wait for the lender-rate moso-aid build, confirm image.
3. Prod checks: anon GET /api/exam/admin/users|stats|settings → 401; /exam/options lists 47 states; national 125 all national; CA 50 all CA.
4. Prod UI E2E with bao.trinh+examreset@ (password in .worktrees/_designs/prod-creds.json NEW_PW (staging: creds.json) — scratchpad is wiped on reboot): picker State → California → Begin → 50 CA questions; submit; history labels.
   Admin settings on prod: needs a prod MARKETING user's MOSO key on the lf-homepage run.app host — read-only check (open tab, do NOT change numbers) unless Bao says otherwise.
5. Submit any in-progress test exams of the test account; close agentflow-cjfkz; tell Bao + draft a note for Leslie.

Rollback: lf `production` revert merge of #2774; moso-aid `pro` revert merge of #246 (admin routes become anonymous again, so revert both together).

## UPDATE ~11:05 UTC 17/11
- NEXT step 1 DONE: lf-homepage prod build SUCCESS, prod image contains the #2774 merge. Start from step 2 (merge moso-aid #246).

## DONE ~13:00 UTC 17/11
- moso-aid #246 merged (pro 25ef2b8), prod checks + prod UI E2E PASS, admin page read-only PASS. agentflow-cjfkz closed. Screenshots in prod/.
- Prod admin run.app host is https://lf-homepage-444859640964.us-central1.run.app (NOT the status.url agsdw2ofpq one, that returns 404).

## DONE ~17:00 UTC 17/11 (follow-ups)
- Prod: pill segmented picker (#2777), Change history table + side-by-side settings (moso-aid pro #248, lf production #2779). Report: https://claude.ai/artifact/Xhyiahq1BKcksNFNE3usFK
