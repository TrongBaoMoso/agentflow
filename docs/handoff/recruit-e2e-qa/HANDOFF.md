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
- 06/10 night, more decisions from Bao:
  - **No Onboarding lead role** for now. Instead, a confirm when an onboarding specialist acts on another specialist's LO (bead d9csj, added to stream 5).
  - **Onboarding's job is 4 steps:** book the 1-1, mark the 1-1 Done with W-2/1099, Send to HR, schedule the setup call.
  - The placeholder templates ONB_ACCOUNT and ONB_TRAINING get retired through a migration (bead lnnnz, **stream 6**).
- **Progress 06/10 late night:**
  - **zzaij stepper:** #388 MERGED (45649c00), on staging and verified.
  - **Stream 5:** be #575 + fe #390 are in review fixes.
  - **Stream 3:** be #576 + fe #389 are in review fixes.
  - **Streams 1, 2, 6:** still building.
  - **Central numbering:**

    | PR / stream | Flyway | Decisions |
    |---|---|---|
    | #575 | V221 | D215, D216 |
    | #576 | — | D217 |
    | lnnnz | V222 | D218 |
    | stream 1 | V223 | D219–D220 |
    | stream 2 | V224 | D221–D223 |

  - **Merge order:** BE before FE.

## OVERNIGHT 07/10 (Bao asleep, said: "làm end-to-end tới sáng, không stop")

**Bao's answers before sleeping:**
- Email log: Bao chose a separate recruit screen, then PAUSED it (07/10 night). Do NOT dispatch stream 10.
- LIC_* per-state checklist items: turn them OFF (stream 11, bead wirt9, V227/D229).
- Production: "recruit has no employee users yet → promote production if OK". Plan:
  - Promote CODE only, by pointer push `git push origin origin/staging:production` (TrongBaoMoso = release-recruit-be), after staging is verified.
  - **Do NOT flip prod flags** that touch real LOs or MOSO prod (writeback, reminders SEND, agreement send, calendar invites, HR publish). Prod-parity session d96850c0 owns those, and they need Bao's explicit OK.
- New product decisions: pick the safest option, write the reason in the bead and the morning report, and stop only for real people / prod data.

**Done tonight:**
- Staging MOSO Admin for bao.trinh@loanfactory.com created as an active OB specialist (raw Datastore insert, labels, branch=1; no memcache flush needed). Verified with "Send again" on QA AnewM.
- Separate finding: bao.trinh+manager@ also has no MOSO Admin on staging, so its writes get 401. Not fixed.
- Retry ladder weekend days: kept the BE behaviour (calendar days). Ask Bao in the morning whether retries should move to Monday (change `CandidateNoAnswerLadder.retryPlan`).

**Numbering:**

| Stream / PR | Decision | Flyway |
|---|---|---|
| #575 | D215, D216 | V221 |
| #576 | D217 | |
| lnnnz | D218 | V222 |
| #577 | D219, D220 | V223 |
| #578 | D221–D223 | V224 |
| #580 | D224 | |
| d9csj | (in #575) | |
| #579 | D226 | |
| stream 9 (24pp0 + kzn7n) | D227, D228 | V226 |
| stream 11 | D229 | V227 |
| stream 10 (email log) | D230+ | V228+ |

**Merge queue:** `scratchpad/merge_pr.sh <repo> <pr> "<subject>"` waits for CI + clean, squash-merges, then runs promote-staging and waits for the deploy. Order: BE before FE; #577/#391 before the #578/#392 rebase.

## STOPPED 07/10 ~02:00 at Bao's request (weekly usage ~84%, stop before 90%)
All dev agents were stopped. Merge queue also stopped (Bao: "tạm pause"). Check #576 / #389 state before resuming. State of each PR, so the next session can finish it:

| Stream | Bead(s) | PRs | State | Next step |
|---|---|---|---|---|
| 1 | tqguk + fd2y8 | be #577, fe #391 | fe #391 pushed (`dd98814`); be #577 fixes committed locally in `recruit-be/_wt/<stream1>`, NOT pushed (an item-4 negative control was being re-run) | finish and push #577, delta review, merge #577 then #391 |
| 2 | z05ny + tdxg6 + 7h4fw | be #578 `d8a5989`, fe #392 `45d3930` | phase 1 pushed | after #577/#391 merge: rebase, drop the `@Transient` field, reuse #577's response view and helpers, hide the note when approveNow |
| 3 | gfc3l | be #576 (rebased by coordinator, `881e6195`), fe #389 | merge queue running | verify on staging: QA Bsix shows one row |
| 6 | lnnnz | be #581 `df07d55` | 2 APPROVEs | add the ledger idempotency assert, re-run negative controls on the final file, rebase after #576 (D218 above D217, regenerate SCHEMA.md), merge |
| 7 | wczzn + ydn7k | be #580 `0f8d055`, fe #394 `d20c516` | reviews REQUEST_CHANGES (list sent to the agent; fixes possibly partly done in its worktree) | redo the fixes, see the review notes in this file's history / bead comments |
| 8 | jnso3 | be #579, fe #393 | **MERGED + staging** | — |
| 9 | 24pp0 + kzn7n | none yet | agent stopped mid-implementation (worktree may hold WIP) | restart |
| 11 | wirt9 | none yet (V227/D229) | agent stopped while running tests | restart |
| 10 | email log 09dt7 | — | PAUSED by Bao | — |

- Production promote NOT done yet. Bao OK'd a code-only promote once staging is verified.
- Morning question for Bao: should no-answer retries landing on Sat/Sun move to Monday? (`CandidateNoAnswerLadder.retryPlan`)

## Local WIP left on disk at shutdown (07/10 ~02:10). Worktrees persist; scratchpad does NOT
- `recruit-be/_wt/tqguk` (#577): 1 local commit, unpushed; 3 dirty files. **WARNING:** the dirty `InviteStatusServiceImpl.java` may still be the deliberately broken negative control (DECLINED filter removed). Run `git diff`, restore it with `git checkout -- <file>`, then push.
- `recruit-be/_wt/gfc3l`: shows 3 unpushed commits, but they are STALE. The coordinator force-pushed a squashed rebase (`881e6195`) to the PR branch. **Do NOT push from this worktree.**
- `recruit-be/_wt/24pp0` (stream 9): 1 local commit, unpushed (a hold on the S5+ re-registration name). `recruit-fe/_wt/kzn7n`: 17 dirty files (FE WIP for stream 9).
- `recruit-be/_wt/wirt9` (stream 11): 6 dirty files (migration WIP).
- `recruit-be/_wt/lnnnz` (#581): 1 dirty file (probably the IT assertion being added).
- `recruit-fe/_wt/wczzn` (#394): 2 unpushed commits + 13 dirty files (review fixes in progress). `recruit-be/_wt/wczzn` (#580) head `dce41442` is pushed? Check it with `git log @{u}..`.
- `recruit-fe/_wt/zzaij`: 3 dirty files. #388 is already merged, so these are probably the follow-ups; check before deleting.
- `merge_pr.sh` is saved in this folder (the scratchpad copy is lost on reboot).

## RESUMED 07/10 09:05 (after reboot); state at ~11:30
Merged and on staging today:

| PR | Change |
|---|---|
| #576 / #389 | My hand-offs shows one row per LO. Verified: QA Bsix has 1 row with "Declined 2× before". |
| #581 | Retire ONB_ACCOUNT / ONB_TRAINING (V222) |
| #580 / #394 | Call result refuses past moments; retry days and month dates shown inline |

#577 IT failure root cause: a bare `jdbcTemplate.update` on an autoCommit=false pool gets rolled back. Fixed by wrapping it in `inTransaction` (bd2412dd). Negative control: red as expected. Local IT: 8/8 green.

Merge queue running (shell, sequential): #582 (LIC_* retire, V227) → #577 → #391 → #395 (retry-day arrow chain, Bao 07/10) → #396 (Send info sends directly, bead 6mhuu).

In review:
- #583 / #398 (stream 9: re-registration hold + bell + Today chip, D227, V226)

Waiting:
- Stream 2 (#578 / #392) waits for #577 + #391, then rebase. The previous agent was stopped; start a new one from DEV-RULES and its phase-2 list (in the "STOPPED 07/10" table above).
- Follow-ups filed: pg4l8 (omni idempotency key), 3r9rh (notifier drops 'deferred'), 09dt7 (email log screen, PAUSED).
- Production promote: not done yet. Bao OK'd a code-only promote after staging is verified.
- Open question for Bao: should weekend retry days move to Monday?

## 07/10 afternoon: Bao "làm end-to-end, không stop"
**Decisions:**
- 6-stage plan APPROVED in full (https://claude.ai/artifact/KMp1MzN27kJezCDdEgHSgE). Bead y0ynz, stream 16, D234, V232+.
- Big producer label uses its OWN settings (default 5/2).
- Production: "tự làm hết". After verifying on staging: promote code, create the associate.updated subscription with a DLQ like the onboard one, and turn on Send to HR plus pipeline.v2_stages in production.
- Weekend no-answer retries move to Monday. Bead fllrw, stream 17.
- Auto Send to HR: no "Send now" exception. Missing BLOCKING fields → bell + Today to the OB AND the recruiter owner. Optional fields don't block.
- Manual ticks of HR to-do / HR docs / Licensing: recruiter owner or OB.
- Licensing auto-tick = every applied state is sponsored (read from HR lo-licenses on the associate.updated "licensing" category).
- UI COPY RULE: no hints or explanations in the UI, fewest plain words (added to DEV-RULES).

**Mockup approved:** https://claude.ai/artifact/PWaJrrBpWfsrutNSRDLkep (EN/VI toggle).

**Streams running:**

| Stream | Work | Bead | Numbers |
|---|---|---|---|
| 2 | #578 / #392 BE IT | — | — |
| 13 | pay/sign fixes | efprc | D230 |
| 14 | auto Send to HR | lkw2w | D231 |
| 15 | post-Joined progress | lpshc | D232/D233, V231 |
| 16 | 6 stages | y0ynz | D234, V232+ |
| 17 | weekend → Monday | fllrw | D236 if needed |

**Merged today:** #576 #389 #581 #580 #394 #582 #577 #391 #395 #396 #583 #398.
