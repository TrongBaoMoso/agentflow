# Recruit E2E test + Q&A session: handoff (paused 2026-10-06, Bao going home)

Session id `f22e0d83-d7a4-4e93-b528-b87074499b1b` (peer name `agentflow-73`). Working dir `/Users/apple/Projects/agentflow`.
Resume: `claude --resume f22e0d83-d7a4-4e93-b528-b87074499b1b`. If that session is gone, start a new one and read this file first.
Talk to Bao in Vietnamese. **This session is Q&A only:** find bugs and propose fixes, file beads. Another session implements.

## What this session is
Bao asked for a full end-to-end test of the recruit app on STAGING (all roles, cases and accounts), plus:
- automated tests by Claude;
- a step-by-step manual test guide;
- the % that is testable now.

Bao is now testing by hand and sends questions/issues in batches. Answer each one from origin/master code, with evidence. Propose fixes as beads.

## Artifacts
- **Test sheet (shared, org):** https://claude.ai/artifact/KXZ1EhJKuVRir7L5ExY7pj, version 19, rewritten 06/10 for the new flow.
  - Source: `.worktrees/_designs/test-sheet-src/v3-1006/` (build command in BUILD.txt).
  - Ticks go to db collection `checks_v3`. The 30/09 ticks stay in `checks`. The run log is in `runs`, which holds 2 Claude rows from 06/10.
  - Before republishing, read the live version (Bao may have ticked or annotated).
- **Stage-bar references (private):** https://claude.ai/artifact/NaYFpmLmyvFSZJiCWUseoT. Source: `evidence/stage-bar-refs.html`.
- `evidence/`:
  - `spec-be.md`: flags, lifecycle, permission matrix, endpoints.
  - `spec-fe.md`: exact UI labels per screen.
  - `spec-lo.md`: LO side, MOSO, HR, allowlists.
  - `qa-13.md`: answers to Bao's 13 questions, with file:line.
  - `journey-report.md`, `smoke-report.md`: the automated runs.

## Results so far (06/10)
- **Testable on staging: 96% (187/195 steps).** The other 8 steps are features dark on staging (case U).
- **Automated full journey PASS:** LO QA Autoa, `bao.trinh+auto1006a`, candidate `73472350-d093-411c-aaa8-370d2394bfae`.
  - Chain: register → claim → Log result → Interested → Prepare offer 6/3 → Send to onboarding (auto-approve) → S5 → OB auto-assigned → Done W-2 → pay (PayPal sandbox) → sign → S6 → Send to HR → HR associate (`chauchau.inc@gmail.com` has HR + recruit ADMIN) → "HR created the employee account".
- **zo816 (P0, registration broken)** was fixed by agentflow-50 and re-tested PASS at 12:25.
- **Smoke, 5 accounts × ~26 pages:** permissions OK.
- **Beads filed from tests:**
  - l06om: HR associate missing NMLS. Most important.
  - 1as20: checklist renders 5–6× in the OB drawer.
  - pwgfh: OB gets 403 on unseen-count.
  - 2rv5v: "Never contacted" shows after Interested.
  - h15ur: the 1-1 date defaults to Pacific time.
  - nytkk: "Sent to HR" shows UTC.
  - xslxk: Department work capped at 200, no search.
  - 8ecq0: HR TX licence list + name order.
- **Open question for Bao:** the HR TX licence list has no individual MLO licence. The agent picked "Mortgage Company License".

## Bao's 13 questions (answered 06/10; fix beads filed)
- tqguk: hand-off copy (approve buttons, toasts, bell, Offer card "Invited", "My hand-offs").
- zzaij: stage bar.
- z05ny: the Offer modal should predict the 5/2 rule.
- gfc3l: My invites one row per candidate.
- fd2y8: show the waive reason and requester on the approval row.
- 7h4fw: BE `fee-paid` accepts a pending offer (real hole) + product question on withdraw.
- tdxg6: manager one-step approve.
- xslxk comment: Department work search.

## NEXT on resume: Bao's follow-ups (sent just before pausing; not started)
1. **Stage bar:** Bao does NOT like the horizontal bar. He wants **circles** (stepper). Research UI/UX on the internet: stepper/pipeline patterns in CRMs and ATS such as HubSpot, Pipedrive, Salesforce Path, Greenhouse, Lever, Workable, Linear, Stripe onboarding. Then show him options (mockup artifact). Note: TERA StageRail (tera-fe `shared/components/workflow/RecordDrawer/StageRail.tsx:79`) is already circle-based. Update bead zzaij.
2. **Approve button copy:** Bao wants it SHORT and simple, easy to understand. "Approve & hand to onboarding" is too long. Propose short labels (e.g. "Approve", "Approve · waive $100", "Approve · keep fee", toast "Approved · {name} → onboarding") and get his pick. Update tqguk.
3. **Offer card + My hand-offs:** Bao said "làm đi" (do it) for the "My invites" → "My hand-offs" rename. He asks whether "Handed to onboarding · {time} · {OB name}" is too long; propose shorter (e.g. step label "Handed off", detail "{OB first name} · {time}"). Hand implementation to a dev session via bead tqguk; it is not done in this session.
4. **Department work vs Exceptions:** Bao finds Department work unclear. A Recruiter can also view OB's work? Should it change, and how? Clarify role-by-role what each screen is for (manager Exceptions vs department queue). Propose a clear model, e.g. merge OB-lead functions into an "Onboarding" manager view, or restrict the read scope. Check who has CHECKLIST_READ (the menu shows Department work only to MANAGER/ONBOARDING/ACCOUNTING; the URL is open to anyone with CHECKLIST_READ).
5. **(also 4b) Can one OB see every other OB's LOs?** Verify. Today "Your onboarding" = own only. Department work = whole department. Drawer read = CANDIDATE_READ (all?). Answer with evidence.
6. **"Why is the OB assigned only after approval?"** Bao did not understand the explanation. Re-explain simply with an example timeline. Give a recommendation: keep it as is, or show "will go to <next OB>" on the approval row, or pre-assign at request but only send to MOSO at SENT. Bao said **more questions are coming**.

## Resumed 06/10 evening: all 6 follow-ups answered
- **Choices page (Bao to pick "1A, 2A, 3A"):** https://claude.ai/artifact/QvHANRRLhHXb6d7tk4PWP5. Source: `evidence/recruit-ui-choices.html`. Research: `evidence/stepper-research.md`.
  - Q1 stepper: A (numbered circles + labels; dots on phone, recommended), B (dots), C (3 phases).
  - Q2 approve buttons: [Approve] / [Approve · charge $100] [Approve · waive $100], toast "Approved · {LO} → {OB}".
  - Q3 Offer card: "Handed off" + "{OB} · {date}".
- **"My hand-offs": DONE on staging.** recruit-fe #385 (247da501) went through 2 reviewers + delta review and green CI, then promote-staging. Verified on staging as recruiter.
- **Q4/Q5:** see `evidence/q45.md`.
  - An OB can SEE and ACT on other OBs' LOs. Only scheduling is assignee-only.
  - Recruiters can open /work by URL.
  - There is no OB-lead role.
  - Bead **gquqq** = option A: rename, Assigned-to column + Mine filter, URL guard.
  - **Bao must decide:** should OBs see but not act on each other's LOs, or not see them at all (ONBOARDING_LEAD role)?
- **Q6:** re-explained with a timeline. Recommendation: keep assigning at SENT, and show the OB name in the approve toast and the Offer card.
- **Still waiting on Bao:** his picks on the choices page; the Q5 decision; the HR TX licence answer; Q13 (does a self-approved waive need a second approver?); Q11/12 (withdraw offer?). More questions are coming.

## Rules for this session
- ram-gate before any Chromium/dev server.
- Never print `.worktrees/_designs/staging-test-accounts.local.md`; use awk on one row/column inside the login script only.
- Staging only.
- Production untouched.
- Do not switch staging GAE packs default back to `a`.

## 06/10 night: Bao approved, 5 dev streams dispatched (background agents of this session; rules in DEV-RULES.md)
- **Bao's decisions:**
  - stepper A;
  - short approve copy;
  - Offer card "Handed off";
  - manager self-approve in one step, with a waive needing NO second approver;
  - no Withdraw request;
  - Department work option A;
  - My invites one row per LO;
  - waive reason + note shown to the approver;
  - B9 and B13 removed from the sheet (sheet v20, 193 steps).
- **Streams.** Each one: BE PR + FE PR → then 2 reviewers → CI → squash → promote-staging, done by this session.
  1. tqguk (remaining copy + Offer card channel) + fd2y8 (waive reason / requester / note)
  2. z05ny (Offer modal predicts the 5/2 rule) + tdxg6 (manager one-step approve) + 7h4fw (fee-paid needs SENT/SIGNED)
  3. gfc3l (My invites one row per LO + history)
  4. zzaij (circle stepper, FE only)
  5. gquqq + xslxk (Department work queue: Assigned to, Mine filter, search, total, route guard)
- **If the machine restarts:** the agents die. Check open PRs (`gh pr list -R LoanFactory-Inc/recruit-be` / `recruit-fe`, search the bead ids) and worktrees `<repo>/_wt/<bead>`, then re-dispatch whatever has no PR.
- **Open question for Bao:** where does the "Onboarding lead" sit relative to the Recruit Manager (answered with a recommendation 06/10 night)?
