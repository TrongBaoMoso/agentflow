# Recruit Today Q&A session: handoff (paused 2026-10-05 evening)

Session id: `d06429f5-ac41-4244-a58d-d1d1455d108c`, working directory `/Users/apple/Projects/agentflow`.
Resume with `claude --resume d06429f5-ac41-4244-a58d-d1d1455d108c`. If that session is gone, start a new session and read this file.

## What the session is
A Q&A walk-through of the recruiter **Today** page (recruit.viet18.com/today), from the point of view of a new end user. For every element the user asks about, the session explains its meaning **and every variant it can take**. Answers go in Vietnamese, read from `origin/master` code of recruit-fe / recruit-be, and are measured on staging **and** production with read-only queries. When the user wants something changed, the session:

1. makes a before/after mockup artifact;
2. files a bead;
3. dispatches a background dev agent;
4. gets 2 independent reviewers;
5. merges once CI is green;
6. runs `gh workflow run promote-staging.yml`.

## Done
- **agentflow-srqi6**: the lead source became a light chip next to the name, and an event chip shows the **event date** (parsed from the MOSO label) instead of the sign-up date. It applies on every surface.
  - recruit-fe PR #372 was squash-merged as `058e86f` and is live on staging.
  - Bead left open, waiting for the user's visual check of the dark theme and the 375px layout.
  - Production has not been promoted.
  - Mockup: https://claude.ai/artifact/5BYshRyxcf8KQ8XuV5fchi (source: `today-source-chip.html` in this folder).

## Next: waiting for the user's "OK, dispatch"
- **agentflow-n5m2f**: Today 4-column row and highlight card layout. **All decisions are recorded in the bead** (`bd show agentflow-n5m2f`). Do not dispatch before the user says OK.
  - Mockup v3: https://claude.ai/artifact/TM5XZThb8hVWrji2wCq4Eu (source: `today-row-layout.html` in this folder; republish from that file to keep the URL only from this session, otherwise pass the URL).

## Facts measured on 05/10 (read-only)
- `candidates.state` is empty for 100% of working leads (prod 0/291, staging 0/222). `licensed_states` is the real data. Prod distribution: 0 states 30%, 1 state 57%, 2-3 states 9%, 4+ states 4% (max 48).
- `last_hand_raised_at` moves on a re-raise while `source` stays the same. Rows where the re-raise channel differs from the source: prod 0, staging 1 (a cold IMPORT row).
- `followUp.test.ts` fails with "Th 5" vs "Thứ 5". This is pre-existing (local ICU) and fails on master too.

## Topics already explained to the user
1. "Call again · no answer Sep 22": the no-answer retry ladder is 3/5/10/30 days.
2. Who lands on the highlight card: `items[0]` of the BE rank in `DashboardServiceImpl.rankDue`.
3. The source line, RSVP, and sign-up date vs event date.
4. The contact line, which is email only today.
5. The whole LO-info block and its variants: avatar, name, unread badge, subtitle, NMLS, idle release, resurface chip.

## Process rules for this session
- Before any heavy job, acquire a slot with `~/.claude/bin/ram-gate`.
- Do not push to `staging` directly; use `promote-staging.yml`.
- recruit PRs may be self-merged after 2 reviewers agree and CI is green.
- Never show real phone numbers in an artifact.

## Update 06/10 (resumed, user away 3-4h, told to work autonomously; production stays untouched)
- agentflow-n5m2f: user OK given; dev agent `n5m2f-dev` dispatched (branch agent/agentflow-n5m2f-today-layout, worktree recruit-fe/_wt/n5m2f). Next: 2 reviewers -> CI -> squash merge -> promote-staging -> screenshot check.
- srqi6 staging check done with a headless login script (scratchpad shoot.cjs, password read inside the script via awk, never printed): Today light/dark/375 OK, no horizontal overflow.
- Found agentflow-x83k2 (bug): amber chip ~2.3:1 contrast in dark on Pipeline/inbox; event chip truncated in Pipeline Source column (92px). Dev agent `x83k2-dev` dispatched (branch fix/agentflow-x83k2-source-chip-dark).
- 06/10 later: #375 merged 410d3f1 and live on staging (2 reviewers, CI green). Screenshot check OK except 3 polish items -> n5m2f-dev making PR from fix/agentflow-n5m2f-polish. #376 (x83k2) waiting on its review-fix commit. Screenshot script: scratchpad shoot2.cjs (EMAIL env; recruiter account has Today rows, manager account has none).
- 06/10 end of autonomous block: #377 (polish) merged ca5cbeb, #376 (x83k2 dark chip + Pipeline truncation) merged b053f4a; both live on staging via deploy run 37323526147 and checked by screenshot+getComputedStyle. x83k2 closed. srqi6 + n5m2f stay open for the user's own staging look. Not verifiable with test data: unread badge on Omni, NMLS · states line, "+N". SPEED MODE (Bao 05/10 night, relayed by agentflow-fb): targeted unit tests only locally, 1 negative control per fix, still 2 reviewers, list skipped checks in PR bodies.
- 06/10 evening: agentflow-yluqw (Call result Ready card + Offer modal) merged recruit-fe #379 007b84d, live on staging. Hand-off flag ON in staging: recruit-be #561 fd3201ec; staging MOSO GAE default switched a -> b (#3615) with Bao's OK — do NOT switch back without pinging agentflow-b3 (recruit coordinator) and agentflow-fb (owns the packs 90vkj/gglqk fix + next SWAT deploy). Open ideas not yet asked to build: sidebar "My invites" -> "My hand-offs"; stale application.yml comment about the flag being absent from staging values.
- 06/10 CLOSE: final check OK — fe #372/#375/#376/#377/#379 + be #561 MERGED; recruit-fe staging = master 007b84d (success); recruit-be staging = fd3201e with RECRUIT_FEATURES_ONBOARDING_V2_HANDOFF=true; GAE default b=1.0; all session worktrees + local branches removed; no background agents or ram-gate tokens held. Waiting on Bao only: staging look for srqi6/n5m2f/yluqw, "My hand-offs", production. Deferred: agentflow-1cb5i.
