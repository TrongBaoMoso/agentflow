# Recruit E2E Lab — handoff (session 073e4aab, night 07→08/10/2026)

Artifact (new test sheet, EN/VI, per-tester results): https://claude.ai/artifact/1Dd5PETDRZLEHiZMe4ANzt
Old sheet (kept for 06/10 history): https://claude.ai/artifact/KXZ1EhJKuVRir7L5ExY7pj

## Source & tools (scratchpad of session 073e4aab — copy out if needed)
- Sheet source: `<scratchpad>/sheet/` — head.html, prelude.js, data_common.js, data_los.js (generated), data_bugs.js, cases_1..4.js, static.js, app.js; `./build.sh` → recruit-e2e-lab.html; publish same path.
- Seeding: `<scratchpad>/seed/` — seed.py (registerLoanOfficer / registerWebinar / submitReferALoanOfficer / moso-aid lo-events, no captcha server-side), prep.js (claim/outcome/offer/1-1 via recruit API), paysign.js (PayPal sandbox + in-page signing), hr_create.js (HR app create associate as chauchau), postjoin.js (ticks + setup call), selftest.js, ui_check.js, sweep.js (responsive sweep).
- DB results: collection `results` doc `<uid>__<step>`; Claude writes uid `claude`. `runs`, `locks/settings`.

## Data
- LO emails `bao.trinh+t08<id>@loanfactory.com`, NMLS 99318xx, phone (714) 555-18xx. 66 seeded (+6 manual rows D2 D3 E2 E3 E4 H5 not created). Z1..Z6 = Claude self-test LOs (Z1 reached S7 Onboarded end-to-end).
- Onboarding round-robin includes bao.trinh+onb-test@viet18.com (not in accounts file, no password).

## Findings — beads: F-1 agentflow-ze4kn, F-2 agentflow-eu4up
- F-1 Refer-a-LO page LOs land at S5 with SENT offer by super.admin, no owner/specialist, still in Hot leads.
- F-2 decline API accepts 3-char reason (UI blocks <4).
- F-3 third onboarding account @viet18.com gets assignments.
- l06om reproduced (NMLS missing in HR associate).

## Update 08/10 ~02:00 (session 073e4aab)
- Sheet v4 published: 30 cases / 263 steps (RT, A–I, W, X, Y, OM, J–V, AA, UX), 98 LO rows, sections Status / Accounts / LOs / Bugs / Omni coverage / How-tos.
- Claude results in db: 87 docs (uid `claude`). versions tracked in `<scratchpad>/seed/versions.json` (needed for if_version on update).
- Claude LO sets: Z1..Z6 (API), C* (CA1, CB1-5, CF1-5, CH1-2, CI1, CJ1, CK1, CL1, CN1, CR1), GM1/GM2 on mail.tm (`seed/mailtm.json` has tokens; receive-only).
- Verified live: SMS two-way with manhadmin + Zoom 1464 (Bao replied 01:01), Google Meet event for QA Anewe (meet ddk-hgix-xyb), MOSO "Complete These Initial Steps" reaches mail.tm ~20 min after 1-1 Done, Missing for HR (last_name digit) + auto send after fix, omni email to mail.tm NOT delivered (omni #349).
- Temporary pod `e2e-curl-hold` in ns recruit-be (staging) created 08/10 01:20 for X-User-ID calls; sleeps 3h then exits — delete if still there.
- New beads: ze4kn, eu4up, vm9tm, hhdec, iapo3, bnqmf, 6bcjk, 00lkw, x1l9i (Omni logging feature), ymuty (Team-only mirrored as LO contact?), y8fbi (Onboarding cannot message LO).
- accounts file: manhadmin row added (email is a markdown link — auth.js strips it).
- Still to automate: manager approve/decline/remind/take back via UI, onboarding schedule/ticks via UI (CN1 needs HR create), G5 team-only email check (navigation timed out once).

## Final state 08/10 ~04:40
- Sheet v7: https://claude.ai/artifact/1Dd5PETDRZLEHiZMe4ANzt — source copied to `sheet/` here (build: `./build.sh` then publish recruit-e2e-lab.html with the Artifact tool to the same URL). Scripts in `scripts/` (credentials are read at runtime from the local accounts file; tokens/state/mail.tm secrets NOT copied).
- Claude results: 93 db docs. F-5 WITHDRAWN (Claude's own duplicate phone/NMLS data; auto-own skips dup phone by design; bead hhdec closed). Claude LO Z2–Z6, CB5 renumbered to 99319 61–66 / 555-1961..66.
- New finding F-10 (agentflow-hh46z) Team only email to staff outside the cast points to the external tab.
- Temp pod e2e-curl-hold deleted.
- Left for Bao: OM5/G5 manual check, email reply from trinhvutrongbao@gmail.com, Grant Meet access (attendance), all his own steps.

## RESUME POINT 08/10 ~13:55 VN (Bao shut the laptop to go to the office)
**Resume:** `cd ~/Projects/agentflow && claude --resume` → pick session 073e4aab ("recruit E2E lab"). If the scratchpad under `/private/tmp/...` is gone (macOS wipes /tmp on reboot), use the persistent copy:
`~/Projects/agentflow/.worktrees/_designs/e2e-lab-scratch/` (local only, git-ignored; holds `seed/` scripts + `state_*.json` login sessions + `r4.json` LO ids + `seeded.json`, and `sheet/` source). `seed/node_modules` was NOT copied → run `npm i playwright` in `seed/` (or reuse the global one) before running scripts. Every browser/job goes through `~/.claude/bin/ram-gate acquire chrome <label>`.

**Progress:** 220 / 263 steps have a Claude result (~84%). Sheet v10 published (same URL). Settings lock `locks/settings` is released (uid "").

**Round-4 Claude LOs (`seed/r4.json`, emails bao.trinh+t08q<N>@loanfactory.com, NMLS 99319 71–88, phone 555-1971..88):** q1 Claudeflow (S5, 1-1 scheduled Oct 9 8PM PT, specialist onb-test@lf), q2 Claudeunclaimed (assigned to recruiter via H2), q3 Claudehandui + q4/q5 Claudebulka/b (handed to manhadmin), q6 Claudecallui (unclaimed — for Y1–Y3 Zoom), q7 Claudeindie (1099, 1-1 Done), q8 Claudecorp, q9 Claudeadvisor, q10 Claudeswitch (W-2→1099), q11 Claudeprod (offer sent), q12 Claudeladder (NOT on Today — F9 still open), q13 Claudemention (offer 7/4), q14 Claudeboard (Engaged, call logged w/o result), q15 Claudeformv0 (web form), q18 Claudesponsorcancel (TX+AR+NE after Cancel).

**Waiting on the system:** q7/q8/q10 ONBOARDING_MEETING write-back parked WAIT_SPECIALIST behind the manager's 401 ONBOARDING_SPECIALIST rows (F-13, agentflow-m4eyx) — releases after attempt 8 → then run `node paysign.js q7,q10` (C1S: page should say Independent Loan Officer (1099)). CK1 Claudebadcard is Joined + HR associate created (M1–M5 done).

**Account change made 08/10 12:40 (Bao asked):** `bao.trinh+onb-test@viet18.com` revoked (it was created 28/09 at Bao's request "vì là staging", has no mailbox). 9 pre-1-1 LOs moved to `bao.trinh+onb-test@loanfactory.com` via admin PUT; 7 post-1-1 LOs (QA Aone, Etoe Hirea, Lmissing, Claudeself, Anewc, AnewM, Welcome Neg) still name @viet18 (MOSO locks) — act on them as onb-test with "do it anyway". Onboarding round robin now = bao.trinh@loanfactory.com (Google login, Claude cannot sign in) + bao.trinh+onb-test@loanfactory.com.

**New findings this round:** F-12 agentflow-c75mf (Send info templates = onboarding reminders, {{vars}} sent unfilled) · F-13 agentflow-m4eyx (specialist change 401 → meeting write-back delayed) · F-14 (half-signed agreement resets to 0/5 on reopen — question for Bao) · F-15 agentflow-y6x6s (raw "invalid_email") · D3b question (Cancel on SC/AR/NE keeps the states; code only stores confirm_sponsorship=false).
Withdrawn: "HR accepts duplicate work email" — HR does block it (M3 pass).

**Still open (~43 steps):**
- Claude can still do: E6b (rename banner lives in the Quick view drawer — RegistrationNameHint), F9 (find a Today-listed lead; ladder key `followup.no_answer_retry_days`, restore [3,5,10,30]), H11/H12 (Unclaimed→Exceptions minutes is a UI setting), R2 (nurture LO has no Log result entry outside Today — check), S8 templates submit/approve, OM6, B12 (Remind on Claudeofferd did not toast — retest, make sure the click is in its own row), W9 (retest what HH sees), J2/J3, RT4/A23 (needs a Joined LO whose specialist is onb-test), C1S, E5 (lopage form lacks website buttons), W5/E7 (/join is a webinar page, not the LO form), RT11 bubble, RT12 v1 full walk, U1 (= F-9), V1–V6 (V1 confirmed hot.idle_release_enabled=false).
- Needs Bao: Zoom calls (Y1–Y3, OM9), LO SMS reply (Y12), inbox checks (A11, J7, G2 reply), H8 (after ~23:20 VN 08/10), H10 (after ~23:20 VN 09/10), decisions on D3b and F-14.
- Do NOT use the claude.ai Gmail connector (it is trung.thach's mailbox).

## Update 08/10 ~16:00 VN (resumed after reboot)
- Scratch now lives at `~/Projects/agentflow/.worktrees/_designs/e2e-lab-scratch/` (`/tmp` copy was wiped). `npm i playwright` + `npx playwright install chromium-headless-shell` done in `seed/`.
- Progress: 255 / 263 Claude results (~97%). Sheet v11 published.
- Done this round: C1S/C4 (1099 page + "Independent Contractor W-9" in HR), A23 + RT4 (Claudeindie Onboarded via "HR and Licensing are done — book the setup call"), S8 (draft → in review → manager approve), J2/J3, B12 (confirm dialog "Send reminder"), F9 (ladder [1] → "No more automatic retries"), H11/H12 (Unclaimed after 1 min), Y1–Y3, Y8, UX4, X9, E5, RT12, V2/V6, W9.
- New beads: agentflow-cjvtz (F-17 call on someone else's lead: no warning, overwrites pending call), agentflow-fp7bb (F-18 v1 "Check your answers" scrolls sideways at 375). F-16 (1099 agreement asks LO for effective date + notice address) = question for Bao. Withdrawn: recruiter sees Approve on templates (it is disabled — fine).
- Blocked for automation: /join, after-party, webinar forms have reCAPTCHA (W5/E7 manual).
- Bao-only left: A11, J7, G2, Y12, OM9 (+RT11 bubble once an LO messages), H8 (after ~23:20 VN 08/10), H10 (after ~23:20 VN 09/10); Y8 check on 09/10 that the scheduled info for QA Claudeofferb was NOT auto-sent.
- D4 DONE: QA Claudetwostate (t08q20, TX+FL) HR draft has 2 licence rows (TX, FL). Claude now at 256/263; the 7 left are Bao-only (A11, J7, G2, Y12, OM9, H8, H10).

## RESUME POINT 08/10 ~17:45 VN (Bao going home)
- Resume: `cd ~/Projects/agentflow && claude --resume` → session 073e4aab. Scratch: `~/Projects/agentflow/.worktrees/_designs/e2e-lab-scratch/` (playwright installed in seed/). Nothing running in the background.
- Accounts file rewritten 08/10 17:30: one table of 7 accounts with "name shown in recruit" (QA Test Recruiter = bao.trinh+recruiter, …); backup `.bak-20261008`.
- Bao did by hand 08/10 and Claude recorded: A11, Y12, RT11, Y9 pass · OM9 fail (agentflow-rpzrj) · W5 pass · H7, E6b, S9 pass · W4 skip (idle release off) · E7 must be redone with fresh emails (t08e71 after-party, t08e72 webinar, refer form t08ref1 with referrer bao.trinh+recruiter) — Claude's mistake used t08x1/t08x2 (QA Xproduction/Xfreeze; names restored, X1 self-reported now $5M/6).
- Bao decisions 08/10: D3b → agentflow-paup6; F-14 accept; F-16 later → agentflow-yq94b; R2 → agentflow-msh1b. New beads: agentflow-u0pmv ("Hot pool" → "Hot leads"), agentflow-nu8dn (audit "Someone" on revoked grant), agentflow-rpzrj (Omni call recording/From/Calling…/no Log result).
- Waiting on Bao: C6, L4 (Send to HR block on Overview, QA Claudeofferb), OM5, OM6 (detailed steps given in chat), G2, E7 redo, refer form, decision on "HH will be on the call" copy ({first} = inviter first name).
- Timed: bead agentflow-57pqi (J7 ~22:05 VN 08/10, H8 after 23:20 VN 08/10, Y8 after 14:05 VN 09/10, J7 part 2 ~15:05, H10 after 23:20 VN 09/10). Session-only cron reminders exist but die if the session closes.

## RESUME POINT 08/10 ~18:10 VN (Bao going home)
- C6 pass (calendar disables future days). L4 skip: "HR will ask for one" lives in the Send to HR block that only exists from S6 → redo on a Joined LO; restore QA Claudeofferb phone to (714) 555-1878 (Bao set it to 123).
- NEW P1 agentflow-8r58m: QA Claudeswitch (W-2 → 1099 at the 1-1) signed in MOSO (lo_agreement_signed=true) but recruit keeps offer SENT, LO stuck at S5. Control Claudeindie went SIGNED/S6.
- agentflow-m4eyx raised to P1: an INVITE sent by the MANAGER account dead-lettered (401 x8) for QA Claudeofferb → LO never emailed; banner "The invite did not reach MOSO" shows correctly.
- Next for Claude on resume: re-check Claudeswitch after a MOSO re-send; L4 on a Joined LO; G2/OM5/OM6/E7/refer as Bao reports screenshots; timed steps per agentflow-57pqi.

## 08/10 ~19:00 VN — staging signing switched to Inkless
- From ~18:30 VN the LO "Click Here to Sign Documents" tab opens **Inkless** (demo document, "0 of 5 Completed", I Accept → START → SIGN fields → "Create your signature / Set Signature" → FINISH → "Complete Signing"). The old in-page signer (#click-here-to-sign) used by paysign.js no longer applies. Use `seed/inkless.js <loId>` (mouse clicks on the SIGN boxes; sidebar NEXT/FINISH at x=1304,y=105). Pay still via paysign.js (mode "pay").
- OM5 pass, OM6 fail → agentflow-pp4j5 (Omni chat has no @mention picker). L4 being redone on QA Claudeflow (phone 123 before Joined; restore to (714) 555-1971 after).

## RESUME POINT 09/10 ~00:10 VN — "fix all and ship prod" night (session 073e4aab)
Shipped to PRODUCTION (each: >=2 agent reviewers, lf-homepage + omni also a Repo Owner agent; staging re-tested; prod re-measured):
- recruit-be b00920f9: #599 (vm9tm API refuses negatives, eu4up decline reason >=4 chars, nu8dn audit keeps revoked person's email V236, cjvtz non-owner Call now), #601 (m4eyx unknown-actor fallback behind switch `recruit.packs-writeback.retry-unknown-actor-as-system`, staging on / prod off; superseded specialist rows stop holding the meeting; V237, D235), #605 (j06ji Team-only Omni email is not candidate contact; D238), #606 (pp4j5 Omni cast carries teammate display names from user-service; V238 backfill + cast-repush cron registered on prod 16:39Z; D237; follow-up agentflow-ld7ef).
- recruit-fe: #414 (msh1b, c75mf, y6x6s, u0pmv, 00lkw, bvywe, iapo3, 6bcjk, cjvtz/vm9tm/nu8dn UI, remind cooldown) on prod 5829d94e. #419 (vm9tm UI: -1 kept + "Enter 0 or more", Save disabled) on staging 028784a3 -> prod after X3 retest.
- lf-homepage 0a2d4ba (#2642 -> promote #2643): paup6 + fp7bb; prod widths 16/16.
- omni-service #548 (outbound event + internal read carry `side`) merged, STAGING b5b545d only. Production = release team / Khai (heads-up in PR). Topic DARK in prod.
Process facts learned: recruit-be/fe `staging` is now promoter-only -> `gh workflow run promote-staging.yml -f sha=<master sha>`; omni-service same (workflow id 371743900); prod recruit still `git push origin <staging sha>:refs/heads/production`.
Test results tonight (link updated): OM5 pass (gate correct; +tag addresses collide by design), OM6 pass after #606, H8 pass (Today wait is gold by design, banner red), j06ji verified, retest batch 11/14 (vm9tm UI -> #419).
Open for Bao: bead agentflow-7dx4u (answered/instructed, not yet confirmed) + agentflow-57pqi (Y8 >14:05 09/10, J7 day-1 ~15:05, H10 >23:20, J7 2h screenshot, G2). Open question: do all prod MANAGERs who send/approve offers have an active MOSO account?
Staging test data left: manhadmin follower of QA Claudereminder; candidate QA Om5mailtm (mail.tm qa-om5-17c2dde7@maxxspace.com, creds in e2e-lab-scratch/om5-mailtm.json); 2 pre-fix team-email rows mirrored as contact (d8171d98, 864588c3).

## RESUME POINT 09/10 ~08:40 VN — overnight batch shipped; paused for Bao's commute (session 073e4aab)
Resume: `cd ~/Projects/agentflow && claude --resume` → session 073e4aab ("recruit E2E lab"). Then `bd show agentflow-7dx4u` (everything waiting on Bao) and read this section.

SHIPPED TO PRODUCTION overnight (each: 2+ reviewers → staging test → prod):
- recruit-be 0c515c2a: #608 ze4kn (referral LO = new lead; V240 repaired 59 prod LOs, audit table offers_v240_audit; 11 ACTIVE + 56 non-ACTIVE left on purpose → decision bead agentflow-nkgt7), #609 rpzrj BE (Omni-panel call arms Log result), #610 ld7ef (names retry row), #611 y8fbi BE (assigned onboarding specialist can message own LO), #607 (other session, V241 business hours). Flyway now v241.
- recruit-fe e0a48689: #421 (header search finds LOs bnqmf, Team-only copy hh46z, approval overdue RED H8), #422 rpzrj FE, #423 y8fbi FE.
- Staging verified for all of the above (t4 agent: ze4kn/y8fbi/rpzrj/ld7ef PASS; t421 PASS).

IN PROGRESS — resume here:
- agentflow-8r58m: recruit-be PR #612 (scheduled MOSO signed reconcile, D246). Both reviewers REQUEST_CHANGES. Fixes are half-done in worktree /Users/apple/Projects/recruit-be-worktrees/8r58m as LOCAL commit 3a0ce2ec "WIP … do not push as-is" on top of 76805025 (the PR head). To continue: `git reset --soft HEAD~1` there, finish + test, then amend into ONE commit and force-with-lease push. Required fixes (from reviews): (1) PESSIMISTIC_WRITE lock on the offer in healSignedFromMoso before SENT check + concurrent IT; (2) prefer configured RECRUITING actor (actor-email = it.dept@loanfactory.com in prod values) with specialist fallback / retry on REFUSED/unknown-actor; (3) visibility: effective-state boot line, disabled-tick WARN, last-tick metric, WARN signedInMoso>healed, malformed dry-run body counted, WARN noActor; (4) per-offer last-checked + oldest-first rotation (migration V242 if needed; master highest is V241), outsideWindow count; (5) consecutiveSystemic not reset by non-systemic, RuntimeException counts; (6) overlap guard. Then re-run java-reviewer + silent-failure-hunter, merge, promote staging (`gh workflow run promote-staging.yml -f sha=<master sha>`), set RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY on staging, test, prod (key + actor-email needed in prod secret/values — ops).
- QA Claudeswitch already unstuck on STAGING via admin import (SIGNED, S6).

WAITING ON BAO (bead agentflow-7dx4u):
- SECURITY agentflow-1ebmq P0: rotate Mailgun API key (plaintext in prod App Engine logs).
- crfc1 proposal (docs/handoff/recruit-e2e-lab/crfc1-email-spam-proposal.md): spam is staging-only.
- B1 audit (b1-prod-managers-moso-audit.md): Brayan + Seth lack MOSO RECRUITING.
- l06om root cause in ai-hr-be (HR team) — patch proposal in bead.
- agentflow-nkgt7 decision; G2 part 2 (Bao replies to email); omni-service #548 prod + tera-components #314 review → Khai; rpzrj omni/zoom findings → Khai.
TIMED (session crons DIE on shutdown — redo by hand or re-create after resume): Y8 after 14:05 VN 09/10 (Claude may run it), H10 after 23:20 VN 09/10 (Claude may run it). See bead agentflow-57pqi.

## 09/10 ~11:30 VN — 8r58m shipped
- recruit-be #612 (scheduled MOSO signed-agreement reconcile, D246, V242) on PRODUCTION cf12f0d3 after 3 review rounds (java + silent-failure APPROVE). Staging: key deposited (SM secret recruit-be-recruit-moso-signed-reconcile-internal-api-key + merge-patched into recruit-svc-secret), cron every 20 min, first tick 04:20Z checked 19 / failed 0. Prod: inert until ops sets RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY (boot log "cron NOT registered (key unset)"); prod dry run as it.dept@ returned 200.
- Follow-ups: agentflow-exs2h (BOOTSTRAP.md rebuild drops 3 keys; prod key), agentflow-ioidi (pre-existing request() vs push offer-creation deadlock risk). All recruit E2E bug beads from the overnight batch are now closed except those waiting on others (see agentflow-7dx4u).
