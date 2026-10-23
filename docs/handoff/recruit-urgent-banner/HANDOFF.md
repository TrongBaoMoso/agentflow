# Recruit urgent notifications + shared banner + one bell: HANDOFF

Epic: **agentflow-3bzy5** (`bd show agentflow-3bzy5`; children .1–.5). Session paused 2026-10-23 ~16:55 ICT (machine shutdown).

## RESUME POINT (paused 23/10 ~16:55)

1. Read `bd show agentflow-3bzy5 agentflow-3bzy5.1 agentflow-3bzy5.5`. The notes carry every decision and the last status the agents appended.
2. Agents were told to stop and WIP-commit. Check what they left:
   - BE: `recruit-be/_wt/3bzy5-urgent`, branch `agent/agentflow-3bzy5.1-urgent-banner` (WIP pushed as a branch, no PR).
   - SDK: `tera-components/_wt/urgent-redesign`, branch `feat/urgent-redesign-3bzy5` (local WIP, NOT pushed).
   - FE: `recruit-fe/_wt/318-one-bell` @ `5cb2896d` and `recruit-fe/_wt/3bzy5-setting` @ `093df0ce` (local only, done, tests green).
3. Continue in this order:
   - Finish the BE (compile, tests, IT, DECISIONS D-entry, PR, 2 reviewers, CI, staging).
   - Then a LOCAL preview for Bao of #318 + the setting editor against staging.
   - Then push FE.
   - The SDK redesign: local preview in tera-components `test/live/demo` for Bao, then a PR for Tai.

## Decisions (Bao + Tai, 23/10)

**What raises an urgent.** Recruit sends URGENT platform notifications (moso-notifier v2: `priority=URGENT`, `correlationKey`, `resolutionOwner=PRODUCER`), only for:
- **APPROVAL_SLA:** an invite pending approval past `offer.approval_sla_hours`. Sent to the approvers.
- **CALL_NO_RESULT:** a call with no result by the end of the Nth next business day. N is the new setting `urgent_notifications.call_no_result_business_days`, default 1. Sent to the dialler, only while they are still the owner or elevated.

Recruiter overdue follow-ups are NOT urgent (later). "Offer approved but not sent" was dropped: approve and send happen in one transaction.

**Recipients and keys (Tai's rule).** One urgent = ONE recipient. Several people get independent urgents, each with its own `correlationKey` that includes the recipient.

**Clearing.** Recruit clears its own urgents. The 30 s platform-inbox tick calls `POST /notifier/v2/notifications/resolve`. There is no Mark done for Recruit urgents.

**Sending.** Send once: the notifier does not dedupe, so the `urgent_notifications` table does. Lookback is 14 days, so nothing older is raised. Flag `RECRUIT_URGENT_ENABLED`: staging on, prod off.

**Banner shows everything, in every app, including the current one** (Tai + anh Thuan). The "hide own app" option was dropped (bead .4 closed).

**Banner/popup redesign** (tera-components, bead .5; Tai's BE for it is done and on staging):
- Mockup: https://claude.ai/artifact/Mxv1JcWTDTHG37aTKyJoBy (copy in `mockup/project/`).
- Banner: dot + "N urgent" + Review. The per-app chips are proposed for REMOVAL: they need `/urgent/stats` on every page. Waiting for Bao's OK.
- Popup:
  - Search field on its own row. HIDDEN for now: the server has no `q`. Asked Tai at 16:47 (user-service 19d32e6, notifier d9713959).
  - App filter on its own row, scrolling horizontally.
  - FLAT list, longest waiting first. No grouping: the server pages 10 at a time by cursor.
  - Each row: pulsing dot + type tag + name; second line: app (in All only) · meta · "Xd overdue". No per-type icons.
  - A fixed-width button: "Open" (current app, primary light) or "Go to ↗" (other app, default style).
  - Mark done only for current-app manual (RECIPIENT) items, with Tai's confirm. Never from another app. No Undo.
- After it ships: a release (push to `production` in tera-components publishes), then pin PRs in ~14 adopter apps (ADOPTERS.md). Ask Bao before opening PRs in other teams' repos.

## Waiting on others

- **Khai**: a notifier service key bound to appCode RECRUIT, staging first. Recruit cannot resolve its urgents until it exists (the code skips with a WARN). The notifier owner is Khai (tera-docs `notification/README.md`).
- **For prod later**:
  - Khai: `roles/pubsub.publisher` for `recruit-be-runtime@lender-rate` on NOTIFICATION_EVENT_TOPIC + CREATE_TEMPLATE_TOPIC, and the RECRUIT prod key.
  - Tai: does the prod notifier have v2 urgent (#345)? Prod link hosts already list `recruit.loanfactory.com`.
- **Tai**: a server search param `q` on `/urgent` (optional).

## Verified facts (23/10)

- Staging one-bell is live: `RECRUIT_PLATFORM_INBOX_ENABLED=true` since 15/10, and 69 rows were PUBLISHED in the last 10 days. Prod: flag off.
- The tera-core snapshot (22/10) has `priority`, `correlationKey` and `resolutionOwner`.
- recruit-be has no notifier x-api-key.
- The staging notifier link hosts include `recruit.viet18.com`.
- Unrelated thread (moso-decouple session owns it): Khai asked to HOLD moso-notifier #350 and to fix the text in notification-service #363. Bao handed that to the owning session.
