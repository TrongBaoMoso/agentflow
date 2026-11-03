# CEO feedback (Terra Plus 26/10) + HOT auto-assign — HANDOFF

Session 1070c582. Epic `agentflow-b4hpa`. Source: recruit-be `docs/CEO-FEEDBACK-2026-10-26.md`.

## RESUME POINT — PAUSED 03/11 evening (Bao shut the Mac down)

Nothing running: no agents, no dev servers, no ram-gate tokens held.

### Done and live (measured 03/11)
- recruit-be #758 (CEO doc) + #759 (D338 HOT auto-assign) on PROD since 29/10. `hot.auto_assign_enabled=false` on staging and prod; prod cron registered.
- recruit-fe #666 (bell "được tự động giao") + recruit-be #803 (b4hpa.1: skip leads every eligible recruiter owned; ITs for lock wait / 4 concurrent ticks / starvation) merged + STAGING; agentflow-3d was FF-ing staging→prod 03/11 (I replied OK for both).
- g1xag closed (Thanh #656/#795). cy17o left open = Thanh's next slice (manager/performance tools).
- v7rzy inventory: `v7rzy-manual-steps.md` here (45 steps; ~29% prod, ~67% if every switch on).

### LOCAL ONLY, NOT PUSHED (waiting for Bao's OK on the screenshots)
Bao's rule: UI shown locally first. Screenshots: `preview-0311/` here (A = Settings, B = feedback over popups, C = phone menu).
1. recruit-fe worktree `recruit-fe-worktrees/settings-auto-assign`, branch `feat/settings-hot-auto-assign` (6d25ce29, f9fd17a1): Settings block "Tự giao lead HOT chưa ai nhận" (switch, wait 15, max age 18, per-minute 10, pool shown). After the shots: label → "Tuổi tối đa", spacing above pool line (not re-shot). node_modules = symlink to p5-iam-readonly (stale SDK, 3 message suites fail locally for that reason only; settings suites pass).
2. recruit-fe worktree `recruit-fe-worktrees/feedback-zindex`, branch `fix/feedback-above-modals` (da5cb54b, 835fb0a9): `RecruitFeedback` placement zIndex 400 (`FEEDBACK_LAYER`), phone navbar z 403, phone `.rec-modal-foot` padding-right 88px (bubble covered "Mở hồ sơ đầy đủ" at 375). Fresh node_modules (npm ci 03/11). agentflow-7z536.
On Bao OK: push both, open 2 PRs, 2 reviewers + CI, merge, promote staging, re-shoot on staging.

### Waiting for Bao's answers (asked 03/11 evening)
1. Message to Khải (draft in the session reply; asks): review+merge moso-notifier #350 (RECRUIT mail config prod, open since 22/10, requested imkhai) + deploy notifier prod; create 3 prod secrets in lender-rate (`recruit-be-recruit-unsubscribe-hmac-secret`, `recruit-be-recruit-nurture-drip-internal-api-key`, `recruit-be-recruit-referrals-notify-internal-api-key`) with secretAccessor for the prod deploy SA. Draft only — Bao sends it himself (never type into Slack).
2. Meet attendance: (a) keep (D212 never auto-Done), (b) auto no-show only, (c) repeat bell when Meet says joined and nobody clicked Done. Note: the only real auto-Done is D4 (MOSO record says reached).
3. Invite reminders: wave 1 staff bells (auto INVITE_REMIND after 2 days, D354 repeat every 4 business hours, failed invite email bell, 1-1 not booked after 3 days); wave 2 LO email day 2/5/10 for not signed / not paid (staging, flag, bao.trinh+ only; prod after email go-live). Bao already said "tự nhắc đi"; needs OK on the plan + cadence.
4. Auto "No answer" from Zoom: Recruit must read omni's call_outcome/duration (omni #605 already sends it; prod needs Khải to set COMM_OUTBOUND_INCLUDES_CALLS). Proposed: MISSED → auto NO_ANSWER; VOICEMAIL / NOT_REPORTED → pre-fill only. AI summary (part B) blocked: Zoom data → our AI needs an executed contract (data register, owner Khải) + an omni read route.

### Answers already given (do not re-ask)
- Auto-assign: prod stays OFF (Bao 03/11). Staging trial only if needed.
- Separate tick secret: should, not urgent; before prod ON; blocked on secretAccessor grant (bd 0gwad.4.2). Both the auto-assign and the webinar-schedule (D359) ticks borrow the idle-release key.
- HR auto-send (D231): built; staging ON; prod OFF by Bao 08/10 until prod opens to users.
- Leaked password (agents printed it twice 03/11): staging `bao.trinh+onb-test@loanfactory.com` — suggest rotating.
