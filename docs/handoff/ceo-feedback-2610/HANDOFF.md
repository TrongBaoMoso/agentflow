# CEO feedback (Terra Plus 26/10) + HOT auto-assign — HANDOFF

Session 1070c582. Epic `agentflow-b4hpa`. Source: recruit-be `docs/CEO-FEEDBACK-2026-10-26.md`.

## STATE 05/11 02:40 (Bao away/asleep: "làm end-to-end, không dừng"; everything STAGING, prod untouched)

Bao's answers 05/11: Meet = repeat bell (no auto-Done); invite reminders = both waves; auto "No answer" = MISSED auto-logs, voicemail/NOT_REPORTED prefill only; the 2 FE PRs = staging.

### On staging
- recruit-fe #690 (feedback bubble above popups, 7z536) + #691 (Settings switch "Tự giao lead HOT", 4r8je). Before/after page: `review-0511.html` + `before-0511/` `after-0511/` (artifact link died "not found"; republish only if Bao did not delete it on purpose).
- Invite reminders wave 1 (b4hpa.3): recruit-be #843 (D377, V323) + fe #692 — first tick rang 5 "invite still not sent" + 7 "1-1 not booked" bells.
- Invite reminders wave 2 (b4hpa.4): recruit-be #849 (D380, V325) — LO e-mail day 2/5/10; staging E2E sent 4 mails to bao.trinh+ (DELIVERED); settings back to [2,5,10].

### Finished 05/11 ~02:40 (all on STAGING, prod untouched)
- Meet repeat bell (b4hpa.2, closed): recruit-be #841 2e8329ef7 (D379, migration V327 applied 19:37Z 04/11) + fe #694 27d37c66. Setting `onboarding.meeting.attendance_repeat_after_business_hours`=2; the one older PROPOSE_DONE got stamped, so the deploy rang no burst.
- Auto "No answer" (b4hpa.5, closed): recruit-be #842 5e591884a (D378, flag staging only) + fe #693 55539ff4. No Zoom call on staging since deploy -> one real unanswered Zoom call on staging is still needed to see it live (ITs cover it).
- Found and fixed on the way: recruit-be #857 0e35dff7f = D380 query cast bug (non-numeric dedupe key broke the LO reminder tick) + the RbacCentralFlagsTest fix master needed after #852 (#854 closed as duplicate). fe #694 needed a type fix (two `repeat` declarations).
- Before/after shots for the two FE changes: `shots-0511-night/` (agent run 05/11 night).

### CLOSED 07/11 00:15 (session 1070c582) — measured
- All session work on PROD (be d5c84a8a5, fe cd389a24): #690 #691 #692 #693 #694 #722 / #803 #841 #842 #843 #849 #857 #887 #889. Prod flags for invite reminders + auto No answer absent (off); hot.auto_assign_enabled=false.
- Meet repeat (#841) prod setting = 0 since 2026-11-06 17:08Z: Bao chose OFF at 07/11 00:08 (after the release session had set it back to 2). Turn on = setting 2.
- Beads: b4hpa.1-.6 + 4r8je closed. Open, not this session's active work: 7z536 (/join page feedback button, lo-homepage), b4hpa.7 (3 rare bell kinds generic, P3), cy17o, dkcrc, v7rzy.
- Before prod ON of invite reminders / auto-assign: own tick keys (both borrow the idle-release key); invite e-mail link still MOSO register page (P4).
- Auto No answer: 0 outbound calls on staging since deploy, live path unseen (ITs cover it).
- Session worktrees removed; no agents or background jobs running.

### PAUSED 06/11 evening (session 1070c582) — nothing running
- Feedback bubble: platform-react 0.4.90 (#719) moved it into the right rail under dialogs; fixed by recruit-fe #722 (cd389a24) on STAGING, Bao confirmed with a screenshot.
- b4hpa.6 closed: recruit-be #887 (a75350152, 15 platform-inbox templates) + #889 (cbc815a12, D396: invite-waiting bell = Manager/ONBOARDING holders + owner, no admin-only) on STAGING, not prod.
- Prod HOLD on #841 LIFTED: Tai pushed prod 057a260d2 at 06/11 17:07 VN incl. Meet repeat; Bao: "để chạy luôn". Prod flyway 330, setting repeat=2. Off switch = setting 0 via admin API (not in Settings UI).
- Reply-To difference in LO mails = D274 by design (omni alias when the lead has a conversation, else recruiter).
- Open: b4hpa.7 (3 more kinds still generic in platform inbox, P3); live E2E of auto No answer needs one real unanswered Zoom call on staging.

### Measured 05/11 10:20 (resume audit)
- On production already: be #843 + #849 + #857 + #803 (code only; invite-reminder flags absent in prod values, 0 INVITE_REMINDER mails on prod), fe #666.
- Staging only: be #842, #841 (V327; prod flyway max V326); fe #690 #691 #692 #693 #694.
- Staging LO reminder mails: 6, all to bao.trinh+ (lo-mail allowlist), 4 test d0 + 2 real d5 (02:40, 03:00 VN).
- Staging staff bells since 04/11 18:00 VN: INVITE_REMIND 5, ONBOARDING_1ON1_NOT_BOOKED 7, INVITE_WAITING_FOR_SPECIALIST 77 (5 invites, 19 recipients incl. 4 admins x9). Meet repeat bells 0 (no new PROPOSE_DONE).
- GAP: RECRUIT_PLATFORM_INBOX_ENABLED=true on staging AND prod; catalog lacks INVITE_WAITING_FOR_SPECIALIST / HOT_AUTO_ASSIGNED / ONBOARDING_MEETING_ATTENDANCE -> generic "Update about {lo}" -> bead b4hpa.6 (P2).
- Test accounts now: +recruiter/+onb-test/+manager = RECRUITER only, +admin = ADMIN, +hh = HEADHUNTER (Vic demo cleanup).

### PROD HOLD (for whoever fast-forwards production next)
- recruit-be 2e8329ef7 (#841) has NO flag of its own: it rides `recruit.features.meet-attendance`, ON in production since 29/10. Stop at 5e591884a, or set prod `onboarding.meeting.attendance_repeat_after_business_hours=0` first, or get Bao's OK. Production was ead26bf7f at 02:35 05/11 (agentflow-4d confirmed).

### Before prod ON (not now)
- Own tick keys for auto-assign + invite reminders (both borrow the idle-release key; blocked on secretAccessor grant 0gwad.4.2).
- Invite e-mail link still points at the MOSO register page until P4 moves it.
- Prod e-mail needs moso-notifier #350 (wave-freeze: Khải comment on notification-service#232 naming #350) + 3 prod secrets (draft message for Khải given to Bao). **06/11:** the #350 part is done (Go notifier seeds RECRUIT in prod; #350 merged 03a42734, rides Go pin #415).

### Answers already given (do not re-ask)
- Auto-assign: prod stays OFF (Bao 03/11). Staging trial only if needed.
- Separate tick secret: should, not urgent; before prod ON; blocked on secretAccessor grant (bd 0gwad.4.2). Both the auto-assign and the webinar-schedule (D359) ticks borrow the idle-release key.
- HR auto-send (D231): built; staging ON; prod OFF by Bao 08/10 until prod opens to users.
- Leaked password (agents printed it twice 03/11): staging `bao.trinh+onb-test@loanfactory.com` — suggest rotating.

