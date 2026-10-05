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
1. **agentflow-ttxvi recruit-be PR** (agent `ttxvi-be`, worktree `_worktrees/recruit-be-ttxvi`, branch `fix/offer-request-owner-only-ttxvi`): 403 on `POST /candidates/{id}/offers` unless actor is the owner or holds OFFER_APPROVE; ITs + negative control + DECISIONS row. Was PAUSED for the P0 hotfix (agentflow-9c, agentflow-qu3b8) before running gradle. State: see `bd show agentflow-ttxvi` notes (WIP commit, local only). Next: wait for agentflow-9c "done" message (or check `~/.claude/bin/ram-gate status`), finish ITs, push, open PR, 2 reviewers (java-reviewer + security-reviewer), CI, merge (squash; recruit-be master strict), push staging per recruit-be flow (check tera-docs DELIVERY_FLOW.md).
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
