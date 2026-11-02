# Text first on Call again: handoff (bead agentflow-t4699)

Session a8ef2df9. Spec: `SPEC.md` in this folder. Mockup: https://claude.ai/artifact/6RTG8qnybihtRhHyU4oqLr (v32; the board "Today — LO replied rows (A)" is item A).

## 02/11 evening (resumed): Bao away, "end to end, do not stop", STAGING only

- **Bao's answers:**
  - System texts do NOT count as a person's contact (bead agentflow-3c2vc). This is done in recruit-be #793.
  - Real test SMS only to +14085381464.
- **Staging E2E done 02/11 ~17:27 VN:**
  - Test LO "TRINH VU TRONG BAO" (07001ba1, phone = Bao's Zoom) was transferred to bao.trinh+recruiter (d8186688) by the manager account.
  - Call outcome posted via API: Interested → Call again at now+8h with `text_first`. Result: `call_text_first` PENDING, send_at = call − 1h.
  - Today row showed "Text to … scheduled for …", a Send now button and "Your note: …".
  - Clicking Send now in the UI gave SENT 10:27:17Z with message_ref stored. The omni mirror came back as an OUTBOUND SMS by the recruiter, and **the Call again stayed open** (D278 amendment verified). The row then read "You texted … at 5:27 PM · no reply yet".
- **Found on staging:** an LO with no state got `sms_time_zone` null, so the card showed the send time in the viewer's zone (9:00 PM VN) while the sender uses LA. Fixed in #793: the field now returns the business zone.
- **recruit-be #793** (review follow-ups + 3c2vc + zone fix): CI and review in progress. Next: merge, then promote to staging.

## RESUME POINT: PAUSED 02/11 ~16:30 VN (Bao shut the machine down)

### Done

- **omni-service #663**
  - Adds optional `preview`, `subject`, `call_result`, `call_duration_seconds` to the inbound-reply event.
  - Squash-merged to master as 4a808af at Bao's request.
  - NOT on staging or prod. Khải promotes it.
  - Khải was asked in the PR to decide whether content may go on the event (#177 rule). If he says no, revert `preview`/`subject` before any promotion.
- **recruit-be #792**
  - Merged as master 0836cfff. Promote-staging dispatched; origin/staging = 0836cfff.
  - cd-staging run 41419108432 = success (confirmed 02/11 after the pause note).
  - Decision D355, migration V307 (renumbered from D354/V306 after #788–#791 took them).
  - Flag `RECRUIT_FEATURES_CALL_TEXT_FIRST` is "true" in staging values only.
- **recruit-fe #655**
  - Merged as master dabe4de0. origin/staging = dabe4de0, cd-staging run 41419154294 = success.

### Not done (in order)

1. **Check on staging** (both deploys succeeded) (recruit.viet18.com, recruiter account):
   - the Log result card "Text <First> before the call";
   - the Today rows;
   - the reply rows "Reply to <First>".
   - Without omni #663 on staging there is no preview text and no answered/missed: bubbles show only the head, calls show without "· missed".
   - Real sends only go to the allowlist (+14085381464).
2. **BE review follow-ups, local only, NOT pushed:**
   - Location: worktree `recruit-be-worktrees/text-first`, branch `fix/call-text-first-review`, WIP commit d8c51ad4 (untested).
   - Fixes:
     - (a) isSystemText also covers a just-timed-out send (FAILED OMNI_NO_ANSWER);
     - (b) RECRUITER_TEXT_SQL and ScheduledSendGuards.ENGAGEMENT_SQL get the in-flight exclusion (new SystemTextSql.java);
     - (c) a missing candidate closes the row instead of poisoning the sweep.
   - Next: rebase onto origin/master, finish the tests and run the focused tests plus `./gradlew test` under ram-gate, push, open PR "fix: text-first review follow-ups …", merge after CI, promote staging.
3. **Waiting on Bao:**
   - bead **agentflow-3c2vc**: should a system-sent text still count as human contact for the Nurture drip guard, Hot idle release, RaisedAgainToday and ProgramInviteReview?
   - bead **agentflow-ex16t**: Conversations page redesign (item B). Mockup first, after Text first.
4. **Not prod.** Prod needs Bao's SMS go-live decision (the scheduled-send flag also turns on auto email, so propose splitting the flag) plus omni #663 promoted.

### Decisions Bao made this session (02/11)

- Text-first checkbox is ticked by default.
- **D278 amendment:** a text the system sent never closes Call again. A text or email the recruiter sends keeps the old rule (closes it).
- The LO's own reply brings the lead back to Today (D270, unchanged).
- Item A (reply rows say how the LO replied, "Reply to <First>") was in scope this round. Item B (Conversations) is a separate job.
- Failure reason lives in a tooltip on "Your 8:00 AM text to X did not go through".
- Omni PRs are self-merged to master. Only promotion to staging/prod waits for Khải.

### Local preview recipe (if Bao wants another look)

- Proxy with demo overlay: `~/.cache/claude-recruit/preview/front_tf.js`.
- Commands:
  - `DEV_OWNER=acct-brayan node front_tf.js stg_3320.token 3320 3311`
  - `NEXT_PUBLIC_TERA_DESIGN=true npx next dev -p 3311` in the FE worktree. Use webpack, not turbopack: turbopack cannot resolve design-2026-caps.css in a worktree.
- Refresh the token: `onetoken.js` with `NODE_PATH=.worktrees/_designs/e2e-lab-scratch/seed/node_modules`.
- URL: http://localhost:3320/en/today
