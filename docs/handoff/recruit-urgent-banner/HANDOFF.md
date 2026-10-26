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


## UPDATE 23/10 ~21:30
- BE **PR #747 MERGED** (cdf1509b, D335, V292) after 2 independent reviewers APPROVE (2 rounds + final) and CI green; **on STAGING** (V292 applied). Flag `RECRUIT_URGENT_ENABLED` NOT set (dark) until Khai's RECRUIT notifier key; code also refuses to raise without a key. Follow-up bead: enable + verify on staging.
- SDK redesign built locally: `tera-components/_wt/urgent-redesign` (`feat/urgent-redesign-3bzy5`, head e3398aee), tera-docs branch `docs/urgent-redesign-3bzy5`. Banner = dot + count + Review (no chips); popup search wired to Tai's new `q` (user-service #89, notifier #360). Preview: `cd tera-components/_wt/urgent-redesign/test/live/demo && LIVE_DEMO_PORT=3140 npm run dev` -> http://127.0.0.1:3140/dev/login?as=alice, Review. Waiting for Bao's review, then Mantine 7/8/9 suites, gallery + catalogue README, PR for Tai.
- FE #318 + setting editor: still local, show Bao against staging (setting key `urgent_notifications` now exists on staging).

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
  - Search field on its own row, server-side `q` (Tai added it 23/10: user-service #89, notifier #360; total follows q, stats do not).
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

## STATE 24/10 evening — SDK redesign PRs open
- tera-components #749 (feat/urgent-redesign-3bzy5): local gates green (except pre-existing ICU chat/time test), CI green, 2 agent reviewers APPROVE. Waiting for Tai to review, merge and release (0.4.59).
- tera-docs #805 (docs/urgent-redesign-3bzy5): 2 agent reviewers APPROVE, waiting for Tai.
- Next: after release, adopter pin PRs per ADOPTERS.md (ask Bao before other teams' repos); recruit-fe #318 one bell + setting editor still local, show Bao screenshots first.

## CLOSE-OUT AUDIT 24/10 ~23:40 (measured, not from memory)
- 0.4.59 was released to tera-components production on 24/10 06:44 WITHOUT the redesign. The CHANGELOG entry moved to Unreleased (0.4.60) (e9fcddce); tera-docs #805 retargeted to 0.4.60 (fd12100); #749 body updated.
- recruit-be #747 merged (cdf1509b) and on staging (master = staging). Staging deploy env: RECRUIT_URGENT_ENABLED unset (dark), RECRUIT_URGENT_NOTIFIER_BASE_URL set, NO notifier key in recruit-svc-secret. Setting `urgent_notifications.call_no_result_business_days` validated by BE. Not on prod (by design).
- Tai's BE: user-service #87/#89, moso-notifier #358/#360 all MERGED 23/10.
- recruit-fe: `_wt/318-one-bell` (4 commits on master, behind 4) and `_wt/3bzy5-setting` @093df0ce (1 commit, behind 5) are LOCAL ONLY. Remote PR #318 still the old draft (head 8aca9b87, 14/10). Not shown to Bao yet.
- Open beads: .2 (FE editor push), .3 (#318), .5 (waiting Tai), .6 (blocked on Khai key). No Slack trace found that the Khai key request was sent.
- No dev server / ram-gate token left from this session.

## STATE 26/10 ~12:00 — staging done end to end
- Keys: Tai issued staging + prod notifier keys. Staging: Secret Manager `recruit-be-recruit-urgent-notifier-api-key` v1 + `recruit-svc-secret` (BOOTSTRAP rebuild updated in be #749). Prod: hand-made `recruit-svc-secret` (probe 200). See docs/secrets/SECRETS-INVENTORY.md.
- recruit-be #749 (staging flag on) + #751 (read `payload.resolved`, throttle grace WARN) merged and promoted. First sweep claimed=36 published=36; auto-resolve verified (QA Bnine approved 04:07:07Z, cleared 04:07:31Z).
- tera-components #749 merged by Tai, 0.4.60 released 26/10 10:31. tera-docs #805 still open (check).
- recruit-fe #588 (SDK 0.4.60), #587 (setting), #318 (one bell) merged and promoted; staging verified: one bell, new banner/popup, Recruit tags from catalogue, no Done on PRODUCER rows.
- Open: (1) production go-live of all of the above = Bao's call + Khai's Pub/Sub IAM for prod; (2) SDK 0.4.60 bumps in other teams' repos (ask Bao); (3) optional copy nit: urgent body "Open it in Recruit." is redundant inside Recruit.

## 26/10 afternoon: call-result urgent opens the Call result popup
- Bao: Open on "Log call result — <lead>" opened the quick view. Fix recruit-be #752 (merged 33d1a883, promoted, cd-staging success): `Target.CALL_RESULT` -> `/today?ws=<id>&wsTab=result`. A cold load of that address on staging opens the Log result tab (Megeh, Jing Huang checked).
- Rows published before the deploy keep `/today?c=<id>` (the notifier stores the link at publish time).
- Session worktrees removed (Bao OK). Bead .5 closed: other apps bump 0.4.60 themselves (Bao). "Open it in Recruit." body kept (shared by every Recruit row in every app's bell).

## RESUME POINT (pause 26/10 evening, Bao shuts down)
- State: everything of this session is merged and on STAGING (be #749 #751 #752, fe #318 #587 #588, SDK 0.4.60). Nothing in flight: no open PR, no worktree, no running process.
- Open only: (1) PROD go-live = Bao's decision + Khai Pub/Sub IAM for recruit-be-runtime@lender-rate (prod key already in prod recruit-svc-secret, probe 200; prod flag RECRUIT_URGENT_ENABLED unset = false). (2) Optional: re-raise the 2 old staging call urgents (Megeh, Jing Huang) so they carry the new ?ws= link (needs staging DB edit; only if Bao asks).
- Resume: `cd ~/Projects/agentflow && claude --resume 9d6e7072-d477-4c94-b77f-b141a064f645`, then read this file + `bd show agentflow-3bzy5`.

## CLOSE-OUT 26/10 night (measured)

- No open 3bzy5 PRs. be #749 #751 #752 and fe #318 #587 #588 are MERGED. be cd-staging at 33d1a883 succeeded. fe staging ef5fc7b0 contains #588.
- Prod: `RECRUIT_URGENT_ENABLED` is absent from `helm-chart/config/production/values.yaml`, so it is off.
- Removed 3 more leftover fe worktrees: `_wt/318-one-bell`, `_wt/3bzy5-setting`, `.worktrees/one-bell`. Before removing, each branch was checked to have no content missing from master.
- Epic agentflow-3bzy5 auto-closed when its last child closed. Prod go-live is now tracked in **agentflow-4m6jy**: Khai grants Pub/Sub IAM, Bao decides, then the prod flag is turned on and promoted.
