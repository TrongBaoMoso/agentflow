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
- Connect Zoom PRs: recruit-be #815 (D364, `/me/zoom/status|connect-url|disconnect`, flag `RECRUIT_FEATURES_ZOOM_CONNECT` staging only), recruit-fe #677 (card + `/api/zoom/callback`). Staging Secret Manager entries `recruit-be-recruit-zoomgo-api-key` / `-company-id` CREATED 04/11 but EMPTY (Bao's account cannot read Tera's `los-be-zoomgo-*` values — PERMISSION_DENIED, not bypassed). They are NOT in secret-keys.txt yet; until then `/me/zoom/*` answers 503 and the card shows the old link status.
- **Message for Khải (draft, Bao sends):**
  > Anh Khải ơi, Recruit em làm nút "Connect Zoom" giống Tera+ (chép đúng tera-be /me/zoom/* + tera-fe callback). Em nhờ anh 2 việc trên STAGING:
  > 1. Thêm `https://recruit.viet18.com/api/zoom/callback` vào `OAUTH_ALLOWED_RETURN_URLS` của zoom-go staging.
  > 2. Cấp cho recruit-be API key zoom-go (giống los-be-zoomgo-api-key) + company id: em đã tạo sẵn 2 secret rỗng `recruit-be-recruit-zoomgo-api-key` và `recruit-be-recruit-zoomgo-company-id` trong lenderrate-master, anh thêm version (hoặc cho em quyền đọc los-be-zoomgo-*). Prod để sau khi staging test xong.
- **04/11 ~01:40 VN, Connect Zoom on STAGING:** recruit-be c3f04bdbd (#815, D364) + recruit-fe ec04e91de (#677). Verified on staging: `RECRUIT_FEATURES_ZOOM_CONNECT=true` + zoom-go URLs set; `/me/zoom/status` → 503 `ZOOM_CONNECT_NOT_CONFIGURED` (no API key / company id yet) → the card falls back to the old link card (bao.trinh+recruiter: "Not linked", expected); `/api/zoom/callback?success=true&token=…` → 302 `/settings/connections?zoom=connected` (token not echoed); zoom-go authorize reachable (400 without params). Security review of both PRs: no CRITICAL/HIGH/MEDIUM.
  - **To turn it on:** Khải adds versions to `recruit-be-recruit-zoomgo-api-key` / `-company-id` (lenderrate-master) + the return URL to zoom-go `OAUTH_ALLOWED_RETURN_URLS`; then add the two lines back to recruit-be `helm-chart/config/staging/secret-keys.txt` (`RECRUIT_ZOOMGO_API_KEY=recruit-be-recruit-zoomgo-api-key`, `RECRUIT_ZOOMGO_COMPANY_ID=recruit-be-recruit-zoomgo-company-id`), promote, and Bao clicks Connect Zoom himself. Prod: not touched.

## Re-check (measured, after the 04/11 pause)

- recruit-be production = cea1f014f (Flyway 313; prod: 2 of 104,412 candidates have last_activity_at, recruiter_zoom_link still 1 row). staging = 8fd15b831 (has #815 c3f04bdbd).
- recruit-fe production = cf5fc1b2 (Conversations), staging = 536fae6e (has #677 ec04e91d + other sessions' #676 #678 #679 #675 #671).
- Secret Manager `recruit-be-recruit-zoomgo-api-key` / `-company-id` (lenderrate-master): still NO versions → Connect Zoom still waiting on Khải.
- omni #663 (4a808af) and #665 (a7f0e89a) are now on omni STAGING, not production.
- Live: staging `/api/zoom/callback` 302 → /settings/connections; prod 404 (FE #677 not on prod, expected).
- Khải message now covers staging AND production (prod: recruit.loanfactory.com/api/zoom/callback on zoom-go prod allowlist; secrets in project lender-rate, which Bao cannot list).

## Khải's review of omni #663 + #665 (03/11 18:14 + 19:03) — follow-up PR owed by Bao

Both PRs are merged and on omni STAGING; Khải wants ONE follow-up PR before omni goes to production. Bead `agentflow-tf2zb` (omni side), `agentflow-jmstt` (recruit-be side).

What it means for Recruit:
- **Bug that reaches Recruit (#663):** an off-file sender (unknown SMS number, unknown or DMARC-failed email to the LO's reply alias) is published as `author_side: EXTERNAL` with no author. recruit-be drops only `INTERNAL`, so a stranger's mail can count as "the LO replied" (stops cadence, Today/Hot "replied, unanswered", stores the stranger's preview). Omni fix: require `AuthorPartyID != nil` (+ ideally the subject's principal, `confiningEdge`). recruit-be defence: `agentflow-jmstt` (measure first that real LO replies carry `author_party_id`).
- **call_result values differ:** event (#663) = `ANSWERED`/`MISSED`; `/comm/latest` (#665) = raw `CONNECTED`/`MISSED`/`VOICEMAIL`/`NOT_REPORTED`. recruit-be `ActivityServiceImpl.setInboundDetails` keeps ONLY `ANSWERED`/`MISSED`; recruit-fe `conversations/_utils/latestLine.ts` reads the raw values. So **do not rename either side** — document the mapping in omni README (CONNECTED→ANSWERED, MISSED/VOICEMAIL→MISSED, NOT_REPORTED→absent). If omni ever aligns, recruit-be must accept `CONNECTED` first.
- **Duration (#665):** `call_duration_seconds` is ring time for missed calls. FE already shows "missed" first, but a `NOT_REPORTED` call with ring time would read "talked Ns". Omni fix: duration only for `CONNECTED`.
- **Content decision (#177 rule):** Khải must say yes/no to `preview`/`subject` on the event before omni prod. If no: revert both; recruit-be fetches text by `omni_message_id` (Today quote + Conversations bubble lose text until then).
- Omni-only items (no Recruit change): README wording on when `call_result` is present, move the confinement filter before the LATERAL, add a conformance fixture for `/comm/latest`.
- **04/11: follow-up done as omni #672, MERGED to master `51ef80a2`** (CI green: build/lint, itest, wire conformance, QA freshness exempt for O-09). NOT on omni staging yet: promote with `gh workflow run promote-staging.yml` in omni-service. Still open: Khải's yes/no on preview/subject (#177 rule). Point 2 was done as wording plus the nil-author gate, with no role lookup. Recruit side (`agentflow-jmstt`) is not done; since omni #295 an unverified sender is exactly the row with no `author_party_id`, which is the positive control for gating in recruit-be.
- **04/11: omni #672 is on omni STAGING** (pod on `51ef80a2`, 0 restarts, no error logs). Measured on the omni staging DB for `agentflow-jmstt`: 34 LO_CANDIDATE inbound EXTERNAL rows have an author and 1 does not. That one is an SMS from Bao's test number (..1464), routed `PAIR_RECENT`: omni's SMS ladder writes a pair hit with no matching party on the cast as off-file, with no author. So a missing `author_party_id` can also be a REAL reply from the number we texted. **A blanket drop in recruit-be would lose genuine LO replies: do not ship it.** Bao and Khải need to choose: omni adds a routed_by/verified hint to the event, or recruit records such a row without the "replied" signals.
- **04/11, option (a) on STAGING:** omni #674 `sender_match` (`PARTY` / `RECENT_PAIR` / `UNVERIFIED`, with `preview` also on `RECENT_PAIR`) is merged as `99f5fc82` and on omni staging. recruit-be #818 (D366, R73) is merged as `4df3aaec` and on recruit staging: it ack-drops `UNVERIFIED` as `unverified-sender` and maps `CONNECTED`/`VOICEMAIL`. Not yet tested live with a text from an unknown number. Production needs Khải to promote omni (#663, #665, #672, #674), then a recruit go-live.

## READY FOR PROD (04/11, session 41ef9f46 closed — the prod pusher does not need to ask this session)

- **recruit-be #818 (`4df3aaec`, D366):** on staging, ready. Safe to ship BEFORE omni: an event without `sender_match` (current omni prod) is handled exactly as before. Rides the next recruit-be FF of staging to production. #817 (docs only, other session) went to staging with it.
- **omni #663, #665, #672, #674:** on omni staging, ready on our side. Only Khải promotes omni prod (release-omni-service). Before that he owes two answers, asked on omni #663 (issuecomment-6625090158): (1) `preview`/`subject` on the event at all (#177 rule); (2) on `RECENT_PAIR` rows. A "no" on (1) means a revert PR in omni; a "no" on (2) is one line in `replyContent` (`internal/inbound/replynotify.go`). Neither needs a recruit-be change.
- Not done: a live text from an unknown number on staging (needs a second phone). Unit tests cover it.

## PAUSED 04/11 ~10:00 VN (session a8ef2df9)

- Bao sent Khải the Connect Zoom message for staging AND prod (Slack 9:07). Suggested correction (to send): omni #663/#665 must NOT go to prod before omni #672 is on staging and Khải answers yes/no on preview/subject.
- GO given to agentflow-bc (9d6e7072) to carry #815 in its recruit-be prod FF: prod has no zoom-connect flag/secrets, so /me/zoom/* stays 404 there.
- Resume: ask Bao whether Khải replied → if staging secrets have versions (`gcloud secrets versions list recruit-be-recruit-zoomgo-api-key --project lenderrate-master`), add the two secret-keys lines, promote staging, Bao clicks Connect Zoom.

## 04/11 evening (Bao: end to end; prod waits for Bao's own staging click)

- Khải: staging secrets have versions (10:40Z), zoom-go #179 merged (staging configmap now allows recruit.viet18.com/api/zoom/callback), prod values given (= ours).
- recruit-be **#840** (DRAFT): staging secret-keys lines. BLOCKED: `recruit-be-deploy@lenderrate-master` has NO secretAccessor on the two zoomgo secrets (get-iam-policy empty; Bao cannot setIamPolicy). Poller in session scratchpad `wait_grant.sh`. When granted: ready + merge #840, promote, check `/me/zoom/status` 200, Bao clicks Connect.
- recruit-be **#844** (DRAFT): production flag + zoom-prod URLs + secret-keys + chart-lint line; ZoomConnectFlagTest 3/3. Merge only after Bao's staging click works (Bao's choice 04/11). recruit-fe #677 also needs to reach production.
- recruit-be prod is 88973c020 (agentflow-47 release) and carries #815 with the flag off (verified).
- moso-notifier #350 (not this session's): blocked by the required `wave-freeze` check, not by Khải's review. Khải must comment on notification-service#232 naming moso-notifier#350; then add `Wave freeze approved: <comment URL>` on its own line in #350's body.

## 04/11 ~21:00 VN: waiting on Khai overnight (session a8ef2df9)
- #846 (another session) already put the prod zoom-go addresses + secret names on master, flag off. #844 was rebased onto it and now only sets `RECRUIT_FEATURES_ZOOM_CONNECT=true` plus the test change (commit 65da5f51f, CI green, still draft).
- Bao sent Khai (in the 09:07 Connect Zoom DM thread) the secretAccessor ask for recruit-be-deploy@ on both zoomgo secrets, for staging AND prod. If prod lacks it, the next recruit-be prod release stops at secret sync because #846 lists the names.
- Measured 21:00: staging grant still missing; #840 is still draft.
- moso-notifier #350 belongs to session 460363a7. Bao asked Khai whether to keep the existing prod RECRUIT mail_config row and close #350, or approve on notification-service#232.

## Full audit 04/11 ~21:50 VN (measured, session a8ef2df9)
- In PRODUCTION: recruit-be #698–#702 #707 #762–#764 #769 #773 #775 #792 #793 #796 #799 #800 #802 #804 #806–#808 #813 #815 #818; recruit-fe #550 #552 #554 #557 #607 #618 #619 #621 #630 #655 #657 #661 #662 #664 #667 #668 #672–#674; omni #659.
- STAGING only: recruit-be #846 (other session), recruit-fe #677 (Connect Zoom page), omni #663 #665 #672 #674. Open drafts: recruit-be #840, #844.
- Prod flags: text-first, scheduled-send-info, zoom-connect absent (off); zoom-link-autolink and MMI push on. Prod sms_enabled=false, allowlist []. Staging sms_enabled=true, allowlist [+14085381464] (left on for tests).
- Prod DB: Flyway 320; recruiter_zoom_link 1 row; 1 MMI webhook ever (our 30/10 test, so Vic's team has not pushed since); scheduled sends 0.
- Topic omni-question-events now exists in lender-rate and omni prod has #659: bead pgziz closed. ex16t closed (Conversations on prod).
- Staging zoomgo secretAccessor grant still missing at 21:50.

## 04/11 ~22:30 VN: Bao "bật SMS thật trên prod nếu không có gì tự gửi cho LO" (session a8ef2df9)
- Checked origin/production: no autonomous sender opens. Text first and scheduled Send info start from a recruiter; nurture drip (flag absent) and webinar reminder texts (settings false) stay off by their own switches.
- recruit-be **#851** (DRAFT): prod flags SCHEDULED_SEND_INFO + CALL_TEXT_FIRST + ALLOW_ANY_RECIPIENT + unsubscribe base URL, secret-keys drip key + unsubscribe HMAC. Prod recruit-svc-secret has neither key today (26 keys, names only), so: Khai creates both in lender-rate + secretAccessor for recruit-be-deploy@, then merge, release, then admin settings (delivery_mode SEND, recipient_policy ANY, sms_enabled true). Senders also need Connect Zoom on prod (#844 + fe #677).
- Bao: keep staging SMS (1464 only). Deleted recruit-fe branch shots/scheduled-sms-autosend.

## RESUME POINT: PAUSED 05/11 ~07:40 VN (Bao shut the Mac down; session a8ef2df9)
State, measured just before the pause:
- recruit-be **#856** (agentflow-4d) MERGED 01:24. It took the zoom-go secret names out of production `secret-keys.txt`.
- recruit-be **#844** (DRAFT, branch `chore/zoom-connect-production`, worktree `_worktrees/rbe-zoom-prod`) is rebased on top of #856 (head 9ebd08b38). It now carries the prod flag AND puts both secret-name lines back; `ZoomConnectFlagTest` requires both on production (3/3 locally, CI green). The PR body lists 4 conditions to meet before merging: Bao's staging click; Khai confirms recruit-be-deploy@lender-rate can read both secrets; zoom-go #179 prod return URL; fe #677 on prod.
- recruit-be **#840** (DRAFT, staging secret lines) waits on secretAccessor for recruit-be-deploy@lenderrate-master on both zoomgo secrets. Last check: still missing.
- recruit-be **#851** (DRAFT, prod SMS go-live) waits on Khai: create the drip key + unsubscribe HMAC secrets in lender-rate and grant access.
- Stopped before the pause: grant poller and Slack follow-up cron (both are session-only). Copies are in `docs/handoff/text-first/resume-0511/`: `wait_grant.sh`, and `khai_watch.json` (DM D08J9K3NVND last_seen_ts + threads).

On resume:
1. Re-read the Bao<->Khai DM (read only) after `last_seen_ts` and report any new Khai messages, with draft replies in Bao's style.
2. Run `bash docs/handoff/text-first/resume-0511/wait_grant.sh` in the background.
3. Re-create the Mon-Fri cron (`17,47 8-20 * * 1-5`) that reads the DM.
4. Once the staging grant exists: mark #840 ready, merge, check commits in staging...master, promote, check `/me/zoom/status`, then Bao clicks Connect Zoom.

## 05/11 ~09:30 VN: Khải decided on omni #663 (read from Bao's mail; omni comment 04/11 17:50Z)

- **Keep `preview`/`subject` on the inbound-reply event. No revert.** recruit-be already stores the text (V307), so a fetch by `omni_message_id` is not needed. #177 (audit archive content) is closed and does not apply here.
- **RECENT_PAIR keeps its content** (as #674 shipped). recruit-be counts it as the LO replying (D366).
- Bead `agentflow-tf2zb` closed. **Conditions before the omni PRODUCTION release (#663 #665 #672 #674)**, epic `agentflow-vk8qv`:
  1. `.1` recruit-be: null `inbound_preview`/`inbound_subject` and the call fields when a candidate is erased. Measured 05/11: no erasure path in recruit-be touches `activities`. Khải also wants a recruit-be GitHub issue linked on omni #663 (ask Bao before posting).
  2. `.4` No log sink and no BigQuery export on `omni-inbound-reply` and `omni-inbound-reply.dlq`.
  3. `.2` No payload in logs: `OmniInboundMessageHandler.java:207` logs `poison.getMessage()`. With Jackson 2.19.2 the source snippet is off by default, but messages like `Unrecognized token 'xyz'` still quote payload text, so log the exception class only.
  4. Scope stays as is: 140 runes, omitempty, LO_CANDIDATE only, never on outbound-sent or audit events. A new subject type needs its own decision.
  5. `.3` RECENT_PAIR is not time-bounded (a recycled number can match): recruit-fe labels such a reply "from an unverified number"; recruit-be never saves that number onto the candidate from the event alone. Measured 05/11: the handler writes no phone today, and `sender_match` is not stored, so the FE cannot label it yet.
- Effect: omni prod (and so Text first + the Conversations latest-message column on prod) now waits on these recruit-side items, not on a Khải answer.

## 05/11 ~14:30 VN (session a8ef2df9, measured)
- #851 was in conflict with master after #856. Rebased: production secret-keys keeps only the drip key and the unsubscribe HMAC lines; the zoom-go lines stay in #844. Head 8e3d93e20, CI green, CLEAN, still DRAFT.
- zoom-go #179 also changed `helm-chart/config/prod/values.yaml`. The `prod` branch allowlist contains https://recruit.loanfactory.com/api/zoom/callback, and the prod pipeline succeeded 04/11 10:58Z. #844 condition 3 is done. The live configmap could not be read (forbidden).
- Bao re-pinged Khai in the Connect Zoom thread (14:21) and sent the #851 prod secrets ask as a new DM (14:24, ts 1793863466.508029). No Khai reply yet.
- Still open: recruit-fe #677 must reach production (fe staging is 25 commits ahead of prod) before #844.

## 05/11 ~15:30 VN: omni is on PRODUCTION; Khải's conditions are now due
- omni-service production = `8e00e89c` (its owner released it 05/11 08:05Z, from notification-service#232). It carries #663, #665, #672 and #674. So preview/subject/call_result/sender_match now reach recruit prod.
- recruit-be prod `ead26bf7f` already has #818 (it ack-drops UNVERIFIED senders, D366).
- Bao approved directly, then this was posted: recruit-be issue **#864** (the 4 conditions) and a link comment on omni #663. Epic `agentflow-vk8qv` raised to P0. Recruit prod has no real users yet (Bao 03/11), so the exposure is small, but `.1` erasure and `.2` poison log should go first.

## 05/11 ~17:30 VN (session a8ef2df9, measured)
- Khai granted the zoomgo secretAccessor on staging (~16:00) and confirmed prod in Slack (16:17). He also created the prod SMS secrets (15:54).
- #840 merged (7af1fbd65) and promoted. The staging deploy's first build hung and was cancelled; the re-run succeeded at 09:50Z. The staging pod has the flag true and both zoomgo env vars set (presence checked only).
- recruit-fe production was fast-forwarded to ec04e91de: #677 ONLY, the first commit after the old prod, so no other session's PR was included. The prod deploy succeeded. With the BE flag off, /me/zoom answers 404 and the card shows the old link status.
- Bao's staging Connect click with Zoom `manhadmin@viet18.com` failed (`?zoom=error`). zoom-go log: `duplicate key users_los_user_id_key`. That Zoom user is already bound to another los_user_id in zoom-go staging. The "re-point" UPDATE collides with the placeholder row that authorize created for Bao's Recruit id. Nothing was changed for the existing owner. Next: Bao retries with his OWN Zoom (Google/SSO bao.trinh@), in an incognito window if needed. Possible zoom-go follow-up for Khai: a clear "already linked to another user" error.
- #844 ticked: prod grant (Khai 16:17) and zoom-go prod allowlist. Still open: Bao's staging click. fe #677 is on prod now.
- #851 gained the condition "#864 items 1+2 on production" (omni prod 8e00e89c already carries #663/#665/#672/#674). Bao assigned #864 items 1+2 to agentflow-19. Prod SMS secrets ticked.

## RESUME POINT: PAUSED 05/11 ~18:00 VN (Bao going home; session a8ef2df9)
Measured just before the pause:
- **Connect Zoom (D364).**
  - Staging works end to end except the click: #840 merged + promoted, pod has flag + zoomgo env. fe #677 is on PRODUCTION (fe prod ec04e91de).
  - #844 (DRAFT, prod flag + zoomgo secret names) has 3/4 conditions ticked. Remaining: Bao's own staging click.
  - Bao's first click used Zoom `manhadmin@viet18.com` and failed: zoom-go `duplicate key users_los_user_id_key`, because that Zoom user is already bound to another los_user_id. Next: Bao retries with his OWN Zoom (Google/SSO bao.trinh@, incognito). Bao said "thôi kệ đi" about something, so ask him whether he still wants to test before assuming.
  - After the click works: rebase #844, ready, merge, then a recruit-be prod FF. Ask other PR owners first: staging is ahead of prod with other sessions' commits, and HOLD #841 (memory project_meet_repeat_bell_prod_hold_0511) applies.
- **#851** (DRAFT, prod SMS go-live): secrets ticked (Khai 15:54). Waits on #864 items 1+2 on production, assigned by Bao to session agentflow-19.
- **d2uzb** (Bao said do it): recruit-be **#867** open, branch `fix/mmi-push-store-known-keys`, worktree `_worktrees/rbe-mmi-known-keys`. Local mmi unit 109/109, MmiPush ITs 17/17. CI had 2 checks pending at pause. Resume: when green, `gh pr merge 867 --squash`, check `staging...master` for other sessions' commits, `gh workflow run promote-staging.yml -f sha=<master sha>`, watch "Deploy staging (GKE)". The first build today hung for 40 min and was cancelled; a `--failed` re-run of the run worked. Then close bd agentflow-d2uzb.
- **Slack follow-up** (Bao↔Khai DM, read only, Mon–Fri): stopped for the pause. State is in `resume-0511/khai_watch.json` (last_seen_ts 1793873591.691849). Re-create the cron `17,47 8-20 * * 1-5` on resume.
- **gcloud:** Bao re-logged at ~17:10 (`gcloud auth login --update-adc`). If kubectl fails with reauth, ask him to run it again.

## RESUME POINT: PAUSED 05/11 ~17:30 VN (session 989dd1c5 / agentflow-19, Bao shut the Mac down)

Work: recruit-be #864 items 1-2 (epic `agentflow-vk8qv`, P0), assigned to this session by Bao via agentflow-3d.
- Code DONE, LOCAL ONLY: worktree `recruit-be-worktrees/vk8qv-inbound-erasure`, branch `agent/agentflow-vk8qv-inbound-erasure`, commit `211aca0ed` (on origin/master 7af1fbd65). NOT pushed, no PR.
  - `.1`: `InboundContentErasure` + `POST /api/v1/admin/candidates/{candidateId}/inbound-content/erase` (IMPORT_RUN; catalog updated) nulls inbound_preview/inbound_subject/call_result/call_duration_seconds for one candidate, keeps opt_out, writes an internal SYSTEM audit activity.
  - `.2`: poison log = exception class + line/column (`poisonSummary`). RED shown (2/4 leaked with the old line).
  - Shared test helper `testsupport/CapturedLog` (log4j2). docs/STATUS.md row added.
  - Tests green: unit (PoisonLog 5, handler 26, controller 2, RbacCatalogCoverage 22) + `./gradlew integrationTest` (InboundContentErasureIT 3, RbacCatalogRoleParityIT 6). ITs run under `integrationTest`, not `test`.
- java-reviewer done. Fixed: audit row, javadoc, catalog indent, test gaps. Merge-loser concern void (merge re-keys activities).
- **Waiting on Bao (2 questions):** (1) also clear `activities.body/summary` on INBOUND rows (recruiter manual log / MOSO import)? Recommendation: NO, scope = omni content only, documented in Javadoc. (2) "ok staging" → push, PR into master, merge when CI green, `gh workflow run promote-staging.yml`. Prod waits on Bao.
- When `.1`+`.2` reach PRODUCTION: tell agentflow-3d (session a8ef2df9), whose #851 (prod SMS go-live) is blocked on them.
- Already done today: recruit-be issue #864 + link comment on omni #663 (Bao OK); sessions 3d/ba/25/af informed about #350 and #663.
