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

## 03/11 afternoon: Zoom link on demand (Bao: "làm theo những gì bạn đề xuất")

- Problem: `recruiter_zoom_link` is filled only by an admin PUT or the D358 batch; a new recruiter, or someone who connects Zoom in MOSO later, would silently fail to text.
- recruit-be #802: `ZoomLinkAutoLinkService.findOrLink(userId)` used by omni's `sender-identity` and by `GET /me/zoom-link`. No row → derive the MOSO Admin key from the person's company e-mail (same rule as the batch), insert, return. Never throws; miss cached 15 min, fault 1 min; serialized so two people cannot share one Admin. Same staging-only flag `recruit.features.zoom-link-autolink`.
- recruit-fe #664: Settings → Connections gets a **Zoom Phone** card (Linked to MOSO / Not linked, one sentence, no Connect button: Zoom Phone is connected in MOSO). Conversation banner copy made neutral.
- Vic changing her Zoom number needs nothing: the row stores the MOSO Admin, zoom-go resolves the current number.
- Prod: Bao chose not to run the console script; prod gets this with the next batch (flag + prod app/namespace values) when Recruit has real users. Geta / Bao: MOSO `zoom_phone_connected` empty on 03/11.
- Flaky IT filed: ReferralViewIT:255 fails 07:00–08:00 UTC after the Nov DST change.
- STAGING 03/11 ~15:25 VN: be 4c31d905 (#802) + fe d5aba8f5 (#664). Checked: bao.trinh+recruiter opens Connections → card "Not linked"; staging log `zoom-link-on-demand: user d8186688… not linked (NO_MATCH)` (no MOSO Admin for that e-mail, expected). The positive path (no row → row created) is covered by unit tests only: the saved staging sessions for +hh and manhadmin had expired, so the live delete-and-relink test was not run. Shot: shots/zoom-card-not-linked-staging-1440.png
- 03/11 16:46 VN, verified live on STAGING: HH got 403 on /me/zoom-link (row-scoped allowlist) → fixed be #804 f945c629 + fe #667 aa46e37c. Then admin (chauchau11) DELETEd +hh's row, +hh reopened Settings → Connections: card "Linked to MOSO" and DB row re-created `auto on demand: MOSO Admin bao.trinh+hh@loanfactory.com` (09:46:17Z). On-demand linking proven end to end. Note: on staging bao.trinh is RECRUITER+ONBOARDING (not ADMIN); use chauchau11 for admin calls; staging gateway is gateway.viet18.com.

## RESUME POINT — PAUSED 03/11 ~17:45 VN (Bao shutting down; session a8ef2df9 / agentflow-3d)

**Next step = PROD release of recruit-be + recruit-fe (Bao "có" 03/11; all owners OK).**
- Owners asked 03/11: lead-intake + webinar session 460363a7 OK (features dark on prod, Flyway V308/V310/V311 expand-only, verify pods + Flyway ≥ v311 after); HOT auto-assign 1070c582 OK (be 88a7bb2a3, fe b17b41d1d); Thanh (human) OK on Slack 17:27 for be #795, fe #656/#659/#660. Others: not theirs.
- Keep on prod: RECRUIT_URGENT_ENABLED untouched; RECRUIT_RBAC_SOURCE=central, RECRUIT_FEATURES_REFERRER_ROLE=true.
- State at pause: be #806 (zoom autolink ON in prod values) MERGED; fe #668 (Sends preview uses Settings hours) MERGED; be #807 (candidate detail `sms_window`) and be #808 (LA-midnight flaky ITs, agentflow-prlmb) OPEN with auto-merge on, CI was running (may need `gh pr update-branch` if BEHIND).
- To resume:
  1. `gh pr view 807 808 -R LoanFactory-Inc/recruit-be` → merged? else update-branch / wait CI.
  2. Promote: `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<master tip>` and same for recruit-fe; check `compare/staging...master` first (only ours + others already OK'd).
  3. Wait cd-staging success; quick staging check of the Sends preview (Log result, Text first ticked).
  4. Prod: `git fetch && git log origin/production..origin/staging` then `git push origin origin/staging:refs/heads/production` in recruit-be and recruit-fe (release team = TrongBaoMoso). Watch cd-production.
  5. Verify prod: pods healthy, Flyway ≥ v311, `pgq.sh` read recruiter_zoom_link (on-demand links appear as recruiters use it; 8 Zoom-connected expected over time), FE Settings → Connections card.
- Messages: Khải asked 17:23 to release omni #665 + #663 (explained #663 = preview/subject/call result on inbound-reply event for My work today). Thanh OK.
- UPDATE 03/11 ~18:00 VN (paused again): be #806 + #807 and fe #668 MERGED; promote-staging dispatched for be 79b19e25 and fe bb0cbcc3 (cd-staging was running). be #808 (test-only) still in CI, not needed for prod. Resume at step 3: confirm cd-staging success for those SHAs, then step 4 (FF production both repos) and step 5 (verify).
- **DONE 03/11 18:33 VN — PROD released:** recruit-be production 79b19e25 (was a359aff0), recruit-fe production bb0cbcc3 (was dabe4de0). cd-production success both. Verified: 2 recruit-be pods Running, 0 ERROR lines since start, Flyway at 311 (V308–V311 applied 11:31Z), env has ZOOM_LINK_AUTOLINK=true + s~lender-rate/5716104026521600, RBAC central + REFERRER_ROLE kept, URGENT flag untouched; recruit.loanfactory.com 200. recruiter_zoom_link on prod still 1 row (Brayan); the others link on demand when they first open a conversation / Settings → Connections or send. be #808 (test-only) on master, not promoted. Beads remote push fails (403: remote TRONGBAO2104/agentflow vs gh user TrongBaoMoso) — local beads fine.

## 03→04/11 night (Bao asleep, away window: Connect Zoom to STAGING, Conversations FE to PROD)

- **Conversations redesign (Bao feedback 03/11 22:45, approved on a local preview):** latest-message hierarchy (who/what bold, "missed" red, no duplicate "Result: Missed"), new **Last activity** column, sortable headers (Loan officer = lastName, Last activity = lastActivitySortKey, Stage, Status), sticky head ≥1280px, card layout (LO + Stage/Status → message + its time → People at the foot), unread card tint.
  - BE recruit-be #813 (V313 `candidates.last_activity_at` + `last_activity_sort_key`, in+out CALL/SMS/EMAIL, never backward) — PROD via agentflow-40's FF (cea1f014f, Flyway 313 ~10 s).
  - FE recruit-fe #672 #673 #674 — STAGING verified with real data; **PROD cf5fc1b2** 04/11 (~01:00 VN). First cd-production run failed on a transient `next/font` Google Fonts fetch; a fresh `gh workflow run cd-production.yml --ref production` succeeded.
- **Zoom research (Bao: "xem Tera, HR, Nova"):** Tera+ has a per-user **Connect Zoom** (tera-be `/me/zoom/status|connect-url|disconnect`, tera-fe ZoomConnectCard + `/api/zoom/callback`) over zoom-go OAuth; MOSO uses the same zoom-go authorize; Nova (callcenter) has its own Zoom app; HR has none. zoom-go refuses SMS without the sender's own OAuth token (`handlers_messagesend.go` USER_NOT_CONNECTED), so a MOSO-key link alone is NOT enough → the "Linked to MOSO" card over-claimed.
- **Connect Zoom for Recruit (in progress tonight, STAGING only, flag):** recruit-be `/me/zoom/*` (agent PR) + recruit-fe card with Connect Zoom + `/api/zoom/callback` (branch feat/zoom-connect). Needs Khải: add `https://recruit.viet18.com/api/zoom/callback` (and later prod) to zoom-go `OAUTH_ALLOWED_RETURN_URLS`. Bao tests the real Connect himself (do not use zoom_api@viet18.com).
