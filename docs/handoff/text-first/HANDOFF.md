# Text first on Call again: handoff (bead agentflow-t4699)

Session a8ef2df9. Spec: `SPEC.md` in this folder. Mockup: https://claude.ai/artifact/6RTG8qnybihtRhHyU4oqLr (v32; the board "Today — LO replied rows (A)" is item A).

## 02/11 late evening

- **recruit-be #796** (V309 message_ref index, agentflow-j1jd0): merged as 63d71b78 and on STAGING. Prod needs OK from session 460363a7 (lead intake d6ec3a25 sits before it).
- **recruit-fe #657** (conversation opens on the tab and channel of the newest unread, via omni messages/stats; spinner; 500 ms timeout; last click wins; no composer wipe): merged as 6ed7ab28 and on STAGING (cd 41468536359).
  - Prod is BLOCKED: fe #656 (Tera Assistant, "staging only") from another session sits before it on staging. Ask its owner before any FF.
- Mockup B (Conversations) v38: shared list chrome, no title icon, unread dot left of the avatar, channel icons, a Team row, the click rule. Bao is OK with the click rule. The page redesign is not coded yet (bead agentflow-ex16t).

## PRODUCTION 02/11 ~19:30 VN

- recruit-be production is a359aff0 (cd 41440648883 success). This also carries D354 #788–#791, with OK from session 460363a7. Their flag stays off.
- recruit-fe production is dabe4de0 (cd 41442191758 success). This also carries #653 and #654.
- The Text-first flag is ABSENT in prod, so the Log result card is hidden.
- Visible on prod with the flag off:
  - the Reply button is gone;
  - reply rows read "Reply to <First>" with a how-they-replied line;
  - Call again rows show "Your note:".
- Turning the flag on in prod sends real SMS to LOs. That needs Bao, the prod Zoom/10DLC sender (Khải), and omni #663 promoted.
- Staging SMS template "Text before a Call again" was created and approved as the manager account (id 84f90ee2).
- Mockup B (Conversations) was added to the artifact (v33), waiting for Bao.
- Bug agentflow-lhz67: Send now outside the LO's hours shows "You texted" while omni holds the text for quiet hours.

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
- **recruit-be #793** (review follow-ups, 3c2vc, zone fix): MERGED as a359aff0 and on STAGING (cd 41433897449 success). Staging check: `sms_time_zone` = America/Los_Angeles for the test LO.
- A message_ref index was dropped from #793 to avoid a V308/V309 race with #794 (lead intake). Tracked as bead agentflow-j1jd0, to add after #794 merges.
- **STAGING IS COMPLETE.** Left:
  - prod: Bao's SMS go-live decision, plus Khải promoting omni #663;
  - agentflow-ex16t: Conversations redesign;
  - agentflow-j1jd0: index;
  - an SMS template for the Text-first card. Staging has none for the recruiter account, so the Message box starts empty.
- The test LO 07001ba1 is still owned by bao.trinh+recruiter, with a SENT text and an open Call again.

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

## 03/11 ~11:31 VN: real SMS from Recruit PROD works (Brayan)

- Prod has NO users yet (Bao 03/11); all trials on staging. Noted in recruit-be #798 / recruit-fe #658 CLAUDE.md.
- Prod `recruiter_zoom_link` was EMPTY, so no recruiter could text from Recruit prod ("You don't have a Zoom account linked").
- zoom-go identifies a sender by `users.los_user_id` = the MOSO `Admin` urlsafe key (app `s~lender-rate`, kind Admin, name = Admin email, namespace 5716104026521600).
- Bao (ADMIN) ran `PUT https://gateway.loanfactory.com/recruit-svc/api/v1/admin/zoom-links/06ca50ef-…` with Brayan's Admin key (brsuarez2001@gmail.com) → 200 at 04:30Z.
- Test LO "Bao Test" (a328b47e) phone set to +1 408-538-1464, owner → Brayan. Brayan (Bao in incognito) sent "test 10DLC Brayan" from the conversation → arrived on the 1464 line at 11:31 from (832) 241-6541 with the 10DLC footer "Reply STOP to cancel". So: Brayan's number is in 10DLC and Recruit → Omni → zoom-go works on prod.
- MOSO: 629 Admins have `zoom_phone_connected=true`; ZoomSubscription holds each number (Vic (714) 591-8143, Brayan (832) 241-6541).
- Left: link the other recruiters (Vic …) the same way (proposal: a job that fills recruiter_zoom_link from MOSO for every Recruit user with a connected Zoom); hand "Bao Test" back to Bao.

## 03/11 afternoon (Bao away, end-to-end to STAGING)

- Conversations redesign fe #661 (10b23fc9) on STAGING, checked: 181 rows, unread next to name, full date/time, nav badge, whole-row click opens the conversation. Latest-message column falls back to our last outreach time until omni #665 is promoted.
- omni #665 `GET /api/v1/comm/latest` merged to master a7f0e89a after an independent security review (+ fix: skip legacy rows with sys_type). Promotion = Khải.
- lhz67 on STAGING: be #800 (eb18a194, 409 OUTSIDE_LO_WINDOW, `text_first.lo_window` on Today) + fe #662 (20085a6a, Send now disabled + tooltip). Verified on staging at 22:30 PT: API 409, button disabled, tooltip text right.
- Finding: the 02/11 staging Text first test is FAILED PROVIDER_REJECTED ("Zoom does not recognise the account"), because the staging test recruiter has no recruiter_zoom_link. The text never left; omni quiet hours were not the whole story.
- Prod zoom-link dry run (read-only): 13 recruiting users, 1 linked (Brayan), 11 resolve to one active MOSO Admin (9 with Zoom connected), 1 inactive (denise.stelljes). Real prod run needs Bao's ADMIN token (console PUT) since the code stays on staging.
- Zoom auto-link: recruit-be #799 (e89a4162, D358) on STAGING behind `recruit.features.zoom-link-autolink` (prod absent). Staging run: 21 examined, 8 linked (all test personas), 1 already linked, 5 no email, 7 no match. Prod real run is ready as a console snippet (11 PUTs, Bao's ADMIN token) in the session scratchpad `prod_zoomlink_console.js`; or ship #799 to prod with the prod app/namespace values and run its dry run then real run.
- The 07001ba1 staging Text first (lhz67 check) is PENDING. Its sender bao.trinh+recruiter is still NOT linked on staging (no matching MOSO Admin), so it will fail PROVIDER_REJECTED again; linked staging users are bao.trinh, bao.trinh+hh, +role-teamlead+1, chi.tran+* and manhadmin.
