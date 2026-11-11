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
