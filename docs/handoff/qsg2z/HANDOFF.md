# Handoff — recruit "less text" + invite owner rule (session agentflow-15, 05/10/2026)

Read this first on resume. Then `bd show agentflow-qsg2z` and `bd show agentflow-ttxvi` (notes carry the latest state).

## Context in one paragraph
CEO (anh Thuận) at the 05/10 demo (transcript `docs/transcripts/2026-10-05_demo-staging_company-feedback-2.md`): too much text, remove every explanation; stat cards = title + value + icon; claim must not force a jump to Today. Proposal page: https://claude.ai/artifact/8hmdK8E5Mf4aVACLBEXmQi . Bao approved everything, then a round 2 after looking at staging.

## DONE — all on recruit-fe STAGING (production NOT promoted; Bao decides production himself)
| PR | What | master sha |
|---|---|---|
| #363 | When date required; (Invite as 5th step — replaced by #368) | 1b241c6 |
| #365 | Removed explanation text: 45 stat-card subs, 17 page subtitles, Today card, call result hints | accb840 |
| #364 | Claim keeps the row in place ("Yours" + Call/SMS/Email/Log result) on Hot + Cold | 288b5e1 |
| #368 | Round 2: Interested → "Ready to join?" Ready/Not yet; Neutral month picks In 1/2/3/6/12 months (required); Not interested "Other" (note required); When/Time aligned; RadioGroup arrows; Invite form without explanations, "Goes to the onboarding specialist" only when candidate-view onboarding_v2_handoff=true | 5bf806f |
| #370 | FE hides Invite unless owner or OFFER_APPROVE (agentflow-ttxvi) | 959b0ee (staging deployed) |
Each had 2 reviewers + CI green; staging browser checks passed for #363–#368 (screens in the verify agents' scratchpads).

## IN PROGRESS
1. **agentflow-ttxvi recruit-be PR** (agent `ttxvi-be`, worktree `_worktrees/recruit-be-ttxvi`, branch `fix/offer-request-owner-only-ttxvi`): 403 on `POST /candidates/{id}/offers` unless actor is the owner or holds OFFER_APPROVE; ITs + negative control + DECISIONS row. Was PAUSED for the P0 hotfix (agentflow-9c, agentflow-qu3b8) before running gradle. State: see `bd show agentflow-ttxvi` notes (WIP commit, local only). P0 hold LIFTED (agentflow-9c said done 05/10). Next: finish ITs, push, open PR, 2 reviewers (java-reviewer + security-reviewer), CI, merge (squash; recruit-be master strict), push staging per recruit-be flow (check tera-docs DELIVERY_FLOW.md).
2. **Staging positive control for #370** (not done, needs Chromium via ram-gate): log in as the OWNER of an S6 lead → drawer shows "Invite to join"; as bao.trinh+recruiter on QA Anew (owner Manh Admin) → hidden. Risk being checked: FE "my id" (authUser.id) vs candidates.owner_id id space.
3. **Hand-off flag (D207, agentflow-7mwf0)** — owned by session **agentflow-9d**. Bao 05/10: fix agentflow-90vkj + agentflow-gglqk first, then SWAT Rerun "install packs/loan" (Bao's login), then flip RECRUIT_FEATURES_ONBOARDING_V2_HANDOFF on STAGING only. agentflow-9d will message agentflow-15 when live.

## FOLLOW-UPS (filed, not started)
- agentflow-qsg2z.4 — less-text round 3 candidates (Today "Too much today?", "Not contacted yet · make the first call", Reports blue box + "Unclaimed age" caption, Exceptions section subs, dead CSS). Needs Bao OK.
- agentflow-qsg2z.6 — small UI follow-ups (390px Not interested tile, sticky footer hides "Add another follow-up", specialist name needs BE field, BE raw ISO "No answer on 2026-10-04", month picks use browser day not D199 business day, Archive enabled without reason).
- agentflow-m08j8 — monthly nurture digest: Bao 05/10 "later"; MVP spec in notes.
- Proposed (not filed yet): audit other write actions (log call, stage change, archive) on leads owned by someone else; present the list to Bao before fixing.

## Rules that bit us today (keep)
- `bd update --notes` REPLACES notes — use `--append-notes`.
- zsh: `"origin/${H}:path"`, never `$H:path`.
- Invite belongs IN the call result (D164); the green ready-to-join strip is only a safety net (memory project_recruit_invite_is_call_result).
- Tests that mock next-intl hide missing keys — always add a real-JSON test for new keys.
- vi "Th 5" vs "Thứ 5" failure in followUp.test.ts is Node 24 ICU on this Mac; CI passes.
- recruit-fe staging = `gh workflow run promote-staging.yml` (master tip); check `git log origin/staging..origin/master` first so you know whose commits ride along.

## UPDATE 05/10 evening (after pause)
- recruit-be **PR #559** is OPEN (not merged), commit f2c34e04: `OfferRequestPermission` in `OfferController#request` → 403 "Only the lead's owner or a manager can invite this candidate" unless owner or OFFER_APPROVE; check runs before the ARCHIVED/DORMANT 400; unowned lead = manager only; adds `can_request_offer` on `GET /candidates/{id}/invite-status` payload; D209 in DECISIONS; `OfferRequestOwnerOnlyIT` 6 cases, negative control 3/6 red. Next on resume: 2 reviewers (java-reviewer + security-reviewer), CI, squash-merge, staging push per recruit-be flow; then FE can switch `canInviteCandidate` to `can_request_offer` (optional follow-up), and run the #370 staging positive control.
- Open question from the BE agent for Bao: a recruiter must now CLAIM an unowned lead before inviting it (no claim-and-invite shortcut). Ask Bao if a shortcut is wanted.
- SPEED MODE (Bao 05/10 night, relayed by agentflow-fb = ex-9d): locally only targeted unit tests; ONE negative control per main fix; still 2 reviewers per PR (+ Repo Owner for non-recruit repos); defer side features (write them down); every PR body lists what was skipped. Back to full flow when Bao says "quay lại flow cũ" / "full flow". See memory feedback_speed_mode_vs_full_flow.md.
- Hand-off flag owner session is now named **agentflow-fb** (formerly agentflow-9d).

## OVERNIGHT 05→06/10 (Bao asleep; answers given before sleeping)
- Production: NOT tonight — Bao decides in the morning. Prepare the commit list for recruit-fe + recruit-be (origin/production..origin/staging) for him.
- recruit-be #559 (D209) + #562 (D210, decline guard) merged; #562 staging deploy in progress at handoff time. Staging verify of #559 PASSED (API + UI).
- Dispatched tonight (speed mode, 2 reviewers each, staging only):
  - qsg2z-r3 → recruit-fe less-text round 3 (agentflow-qsg2z.4): Today "Too much today?", "· make the first call", Reports blue box + Unclaimed-age caption, Exceptions section subs, dead CSS.
  - qsg2z-fix6 → recruit-fe small fixes (agentflow-qsg2z.6): archive reason REQUIRED, 390px tile + footer, hide Invite when an offer is open, use can_request_offer.
  - qsg2z-isodate → recruit-be readable date in "No answer … retry 1 of 4".
