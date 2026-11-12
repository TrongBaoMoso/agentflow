# RESUME — Templates redesign + email kit (bead agentflow-cwlrr)

Paused 11/11 ~13:50 VN (Bao shut the Mac down to go home). Session 0d517c34. Read this first, then `bd show agentflow-cwlrr`.

## Where things are
- Everything is on **STAGING**, prod flags OFF (see bead notes "MORNING STATE" + "Bao review round").
- Mockup: https://claude.ai/artifact/QVHCAdWQfVJdjBUkMuEuct · Email gallery: https://claude.ai/artifact/XPP1VKcmuLTucuaY2vSDpo (v3 EN/VI with full journey, published 13:15).
- Merged: recruit-be #985 #990 #992 #993 #996 · recruit-fe #758 #760 #764 #767 #768 #769 · lf-homepage #2741 then REVERTED by #2742 (Bao: keep the register page as it was).

## Open work at pause (Bao asks, 11/11 ~11:30)
1. **DONE 14:40** — #1002 merged 337760b0, on staging (1f52b520), verify-textsig pass, Nurture 1–4 + Webinar follow-up re-captured, gallery v5 published 15:00 (agreement-link dropped). **Nurture signature — was PR OPEN (13:39).** recruit-be PR #1002 (branch agent/agentflow-cwlrr-textsig, head e0b90f846 after update-branch; CI was green on 476c3043f). When kit_v2 is on, Nurture 1–4 + scheduled Send info end with the owning recruiter's kit signature; preview/test-send with the caller's; "Best," kept, name/title/"Reply to this email" lines dropped; flag off unchanged. On resume:
   - `gh pr view 1002 --repo LoanFactory-Inc/recruit-be` → if not merged, check CI / rebase again and merge.
   - Promote the merge sha: `gh workflow run promote-staging.yml --repo LoanFactory-Inc/recruit-be -f sha=<merge sha>`, wait for cd-staging, confirm the pod runs it.
   - Verify: `node docs/handoff/templates-redesign-1111/verify-textsig.js` → each tpl-nurture-1..4: sigAv=1, sigHead=1, best=1, reply=0, braces=0 (before the fix sigAv=0).
   - Then step 3 below (re-send Nurture 1–4 + "Webinar follow-up (demo)", re-capture, rebuild gallery v4).
2. **DONE 13:15** — gallery v3 published (EN default, VI toggle, FLOWS.json + JOURNEY.en/vi.md from mail-flows2; gaps marked 'not clear in the code'). Original ask: **Gallery must be much more detailed + EN/VI toggle (EN default)** so Bao can send it to his team: per email — who receives / who sends, who does what action where (screen + button) to trigger it, exact timing (immediately / N days before / batch cadence), when it is NOT sent, how many emails the same action sends, every button: where it goes, what happens there, which email comes next; plus a whole-journey section.
   - Research agent `mail-flows` writes `emails/FLOWS.json` (bilingual {en,vi} fields) + `emails/JOURNEY.en.md` / `JOURNEY.vi.md` from the code. It hit a usage limit; check whether those files exist. If missing/partial, re-run the research (brief: the fields above; sources recruit-be LoanOfficerMail.java javadoc, LoanOfficerMailSender, webinar/**, onboarding/**, onboardingportal/**, offer/**, nurture/**, migrations for timing settings; recruit-fe for screens/buttons; lf-homepage register-loan-officer for what the LO does after clicking).
   - Builder ready: scratchpad `tpl/build_gallery2.py` (bilingual, reads FLOWS.json + JOURNEY.*.md, EN default, remembers choice). Scratchpad is under /private/tmp/claude-501/-Users-apple-Projects-agentflow/0d517c34-b92c-4fcb-9514-ab801a301d85/scratchpad/tpl — /private/tmp is wiped on reboot, so a copy of the scripts lives in `docs/handoff/templates-redesign-1111/tools/` (copied at pause).
3. After 1: re-send the 4 Nurture test mails (and the GENERAL "Webinar follow-up (demo)") with `tools/sendall.js`, re-capture with `tools/shootall.py` + `tools/gmailshot.js` (Chrome CDP 9345 must be running and logged in to bao.trinh@loanfactory.com Gmail; after a reboot Bao may need to start that Chrome again: `open -na "Google Chrome" --args --user-data-dir=$HOME/.claude-gmail-profile --remote-debugging-port=9345`), rebuild with `build_gallery2.py`, republish to the SAME gallery URL (read it first: Artifact action read; overwrite_unread for files published by another account).
   - gmailshot notes: search by subject; Gmail groups repeated test-sends into one thread and hides the repeated body behind "•••" — the script expands the newest message; for the two emails sharing a subject (follow-up / follow-up-attended) shootall passes the message index.
   - After sending, reset `templates.test_send_per_hour` to 20 (`tools/reset.js`).
4. Still open for Bao (not ours to do overnight): approve prod flags; AI write blocked (moso-router in other cluster); Send info sends not linked to template (no history); unsaved new template previews in plain layout.

## Rules that still apply
Prod flags stay OFF until Bao says. RAM gate before every browser/build. Reply to Bao in Vietnamese, everyday words.

## 11/11 15:00 Bao answers
- agreement-link: REMOVE (never sent). Agent retire-agreement-link: BE PR archives row via migration + drops enum → staging.
- Webinar 1-month drip: already ON on staging since 10/11 (enabled=true, after_1_month=P1M). Request came from Victoria's team (MOSO ticket 16/07), not Brayan.
- test_send_per_hour reset to 20.

## PAUSE 11/11 17:58 VN (session 0d517c34) — READ THIS FIRST ON RESUME
Background agents die on shutdown. All in-flight jobs are PRs on GitHub. To resume, check each PR, then do merge → staging → check.

Done since 14:00:
- Prod: the 6 template flags are ON since 15:11, with Bao's OK. Prod lo_mail is DRY_RUN, so no real LO mail goes out.
- #1004: the agreement-link template is archived, checked on staging.
- Gallery v6 (plain language) is published at XPP1VKcmuLTucuaY2vSDpo.
- Webinar drip-1m is already ON on staging.

In flight (all staging only, Bao approved):

1. **recruit-be #1012 (V395)**
   - Change: the invite reminder lists PAY before SIGN. The contact lines with Lisbeth / (669) 306-6244 (fee-paid) and Victoria / (714) 591-8143 (10 webinar mails) are removed. They become "Questions? Reply to this email or write to recruiting@loanfactory.com."
   - State: rebased to a2ff1fbbc. Local tests pass; CI is re-running.
   - Next:
     - Squash-merge. If it is behind, rebase and regenerate docs/SCHEMA.md on PG16.
     - Run promote-staging.
     - Run `node tools/checks/check-1012.js`. It previews the order, scans the ACTIVE templates for the banned strings, and test-sends 3 mails to bao.trinh+manager@.

2. **recruit-be #1013 + recruit-fe #781**
   - Change: Send info records template_id, and it shows in the Templates send history.
   - State: FE CI is green. BE auto-merge was armed.
   - Next:
     - Merge FE, then promote both to staging.
     - Do a real Send info (send now, email) with template 698b9cc2-323d-434e-80e2-244f2c5363dc to a bao.trinh+ lead.
     - Check GET /templates/698b9cc2-323d-434e-80e2-244f2c5363dc/sends.
     - Take shots: shots/sendinfo-history-{before,after}-1440.png.

3. **recruit-be #1014 (V398), kit signature v2**
   - Change:
     - A real avatar (round, 48px), else the ORANGE LF mark. recruit-fe #782 is merged and lf-mark-orange-144.png is live.
     - Adds CalDRE and the office address.
     - Shows NO website and NO social links.
     - The webinar registered and referrer mails come from the recruiting team when there is no owner. The flag RECRUIT_FEATURES_WEBINAR_TEAM_SENDER is already true in the staging values.
   - Next:
     - Merge and promote.
     - Test-send tpl-lo-invite from an account WITH an avatar, and from +manager (logo). If no account has an avatar, ask Bao; do not upload a photo.
     - Run gmailshot → shots/sig-v2-{avatar,logo}-{d,m}.png.
     - Watch the signature-order assertion in LoanOfficerMailTemplatesIT:309.

4. **Gallery v7 (clickable real flows)**
   - State: just started. Nothing is committed; check emails/CLICKS.json and tools/ for partial work.
   - Brief:
     - For each email with a CTA, create a staging test LO named `Gallery <Case>` with address bao.trinh+gal-<case>@. Drive the REAL flow, not a test-send.
     - Take the real hrefs from Gmail (CDP 9345).
     - Shoot each landing page at 1440 and 390, with a plain caption naming the form and step.
     - In build_gallery2.py, make each CTA clickable (target=_blank). Add the landing shot and a "live staging link" note.
     - Capture only after jobs 1–3 are on staging, then publish to XPP1VKcmuLTucuaY2vSDpo.

Migration numbers held by other open PRs: V393, V396, V397, V399. Re-check before merging.

After a reboot, Chrome CDP 9345 (Gmail plus the recruit.loanfactory.com prod login) may need relaunching:
`open -na "Google Chrome" --args --user-data-dir=$HOME/.claude-gmail-profile --remote-debugging-port=9345`

Bao was told at 17:42: about 60% done, ETA 21–22h. He has no decisions pending. The only possible ask: which staging account with a real avatar to use.

**18:05 update:** all agents stopped before shutdown. #1014 MERGED 7f319b3d (18:00) and promote-staging triggered 18:05 (run 43008375788): on resume confirm "Deploy staging (GKE)" succeeded, then do the #1014 Gmail check (step 3 Next). #1012 #1013 fe #781 still OPEN.

## 12/11 ~01:00 VN state (session 0d517c34)
ON STAGING + verified:
- #1012: pay before sign; no Lisbeth/Victoria (30/30 clean).
- #1014 + #1016: signature v2 (shots/sig-v2-avatar-*, sig-v2-logo-*).
- #1019: 1-1 reminders come from OB → owner → team (flag onb-reminder-sender, staging only; prod still uses packs MEETING_REMINDER).
- #1013 + fe#781: Send info history (real UI E2E PASS).
- #1020 + fe#786: new-template preview uses the real renderer.
- #1023: new preview uses the sample sender. Merged 84887534; deploy was pending at 01:00.

Gallery v7 is BUILT locally (tools/gallery/index.html, 121 images, 20 live staging buttons, 21 landing shots, emails/CLICKS.json) but NOT PUBLISHED. The Artifact publish to XPP1VKcmuLTucuaY2vSDpo failed 4 times (ECONNRESET/timeout, network).
- On resume: list scope files, then publish the html + files in 2 batches (click/real first, then tpl/ui).

DO NOT COMMIT (public repo, live staging links): emails/CLICKS.json, tools/gallery/index.html, tools/land/*.json, tools/gmail/real/*-links.json.

Staging leftovers:
- "Gallery test (ignore)" webinar series on Bao's Google. Cancel it when the links are no longer needed.
- Gallery* test leads.
- 3 sandbox fees paid.
- Live links expire around 13/11 14:30 UTC, when the day-2 reminders regenerate them.

Bugs found by the gallery agent (not fixed; tell Bao):
- The agreement-updated email lands on step 5 (NMLS), not the agreement step.
- Agreement emails go to Gmail Spam.
- The sign-only reminder opens step 3.
- The Meet link needs a Google sign-in.

## PAUSE 12/11 ~02:15 (session 0d517c34) — ALL WORK DONE, only waiting on Bao

Everything Bao asked for is on STAGING and verified (#1012 #1013 #1014 #1016 #1019 #1020 #1023 #1024, fe #781 #782 #786).
#1024 5e2c4ddb: new-template preview says Alex Sample in From / signature / footer. No agent is running.

On resume, do NOT start new work. Just re-ask Bao (in Vietnamese, plain words) the open decisions:
1. Fix the 3 bugs found while clicking the gallery? (a) agreement-updated "Review and sign" opens step 5 (NMLS) with step 4 shown done; (b) sign-only reminder opens step 3; (c) agreement mails land in Gmail Spam (SPF/DKIM — needs Khải).
2. Cancel the "Gallery test (ignore)" webinar series on Bao's Google Calendar after 13/11 (live gallery links expire ~13/11 14:30 UTC)?
3. AI write for templates still waits for a recruit-be → moso-router route (Khải or Đạt).
Minor, not fixed: editor preview shows unrelated fallback content on 401 (expired session).
Prod: rides Tài's next push; #1019 flag and webinar-team-sender flag stay absent in prod.
Later cleanup: worktrees recruit-be-worktrees/{v398-no-md5,reminder-step-order,sendinfo-template-history,...}, recruit-fe-worktrees/sendinfo-template-history, scratchpad af-push2.
Gallery: https://claude.ai/artifact/XPP1VKcmuLTucuaY2vSDpo (never commit CLICKS.json / gallery index.html).

## PAUSE 12/11 afternoon (session 0d517c34)
Bao 12/11: (1+2) fix the step routing for ALL steps and email links on /register-loan-officer AND /join (lf-homepage + lo-homepage); (3) Spam SKIP; (4) cancel the 'Gallery test (ignore)' webinar series AFTER 21:30 VN 13/11; (5) AI write = bead agentflow-3tjvv; preview 401 -> fix.
- DONE: preview 401 = recruit-fe #809 3ae44349, on staging, shots/preview-401-{before,after}-1440.png.
- IN PROGRESS: agent signup-step-routing was told to pause. On resume: look for open PRs/branches in lf-homepage, lo-homepage and recruit-be, the worktrees, shots/step-routing-*, and the Gallery Step test leads on staging. Then brief a new agent with the same scope to finish it on staging, with before/after shots.
- After that: one artifact with before/after shots of both fixes for Bao.
