# Log result note → Omni Team-only chat (bead agentflow-g9tn5)

## RESUME POINT — paused 26/10 ~17:30 (Bao going home)

**Where we are:** BE code done + 2 reviewers passed; Bao saw the 1-line version locally and asked to split
outcome vs note → chose **2 lines + icon** (`📞 Call result: Interested` / note). 2-line version is committed
locally, tests green, **NOT yet shown to Bao locally, NOT pushed, no PR**.

**Next steps (in order):**
1. Restart local preview (below), let Bao log a result with a note on QA Tenfcall and look at Team only.
2. Bao OK → push branch, open PR into recruit-be `master`, wait for `Tests`, self-merge, `gh workflow run promote-staging.yml`,
   confirm `Deploy staging (GKE)` succeeded, then verify on recruit.viet18.com with the REAL BE (log a result with a
   note on QA Tenfcall → Team only shows the 2-line chat; Candidate & parties does NOT).
3. Update `docs/INTEGRATIONS.md` (rule #14: new outbound call omni POST …/messages) + `docs/STATUS.md` in the same PR.
4. **NO production** without Bao.

## Decisions (Bao 26/10)
- Message carries the outcome; posted only when a note was typed; as the acting user; normal unread badge for the cast.
- New notes only, no backfill.
- Format: line 1 `📞 Call result: <Interested|Neutral|No answer|Not interested>`, line 2 the note (omni renders plain text, pre-wrap; no markdown).

## Code
- Worktree: `recruit-be-worktrees/note-to-omni-team`, branch `feat/note-to-omni-team-g9tn5`, commits
  `881c028e` (feature) + `77c8ac61` (2-line format), base origin/master `d4088734`.
- New `omni/CandidateNoteMirror.java`, `omni/model/request/OmniTeamChatRequest.java`; `OmniCallMirrorClient.postTeamChat`;
  bean in `OmniCastConfiguration`; `CallAttitude.label()`; hook `FollowUpServiceImpl.mirrorNoteToOmni` (once, after the branch switch in recordOutcome).
- Request: `POST {omni}/api/v1/subjects/LO_CANDIDATE/{id}/messages` body `{"side":"INTERNAL","body":"…"}`, user identity headers
  (like CandidateCallMirror), after commit behind the cast push. Best effort: WARN on failure, never fails the save.
- Build quirk: stale tera-core in ~/.m2 breaks compile (`NotificationPriority`); run gradle with
  `--offline -Dmaven.repo.local=<empty dir>`. Always via `ram-gate acquire gradle`.
- Tests: FollowUpServiceImplTest 160, CandidateNoteMirrorTest 9, OmniCallMirrorClientTest 21 — all green 26/10.
  Jackson escapes 📞 as `📞` on the wire (valid JSON; the client test pins that).

## Reviews (both: nothing blocking)
- java-reviewer: MEDIUM — first note on a never-cast candidate now triggers the cast push (intended); off-cast actor
  (admin / manager without grant / non-owner) → omni 400, WARN, note not in omni; tests mock CandidateCastPush so rollback
  ordering is unproven by test.
- omni contract review: CONFIRMED body accepted, Team-only (confined/external callers never see INTERNAL), unread for
  other internal cast members, no outbound send, no mirror-back duplicate NOTE, no missing header.
  Tell Bao: admin / manager-without-grant notes will NOT reach omni (product call if that matters).

## Local preview recipe (no BE: proxy plays the omni post for real, outcome NOT saved in recruit)
- FE worktree `recruit-fe-worktrees/note-omni-preview` (detached origin/master, own node_modules,
  `.env.local` has `NEXT_PUBLIC_DEV_USER_ID=d8186688-77d4-454d-a649-a1bdf8842bb6` = bao.trinh+recruiter).
- Token: `node ~/.cache/claude-recruit/preview/freshtok.js docs/handoff/recruit-e2e-lab/scripts bao.trinh+recruiter@loanfactory.com ~/.cache/claude-recruit/preview/stg_3320.token` (ram-gate chrome).
- `ram-gate acquire next-dev` → `./node_modules/.bin/next dev -p 3311` in the FE worktree;
  `node ~/.cache/claude-recruit/preview/front_note.js stg_3320.token 3320` (from that dir).
- Open http://localhost:3320/today?ws=896152ca-a035-4613-b3ea-e9215e5f1ec4 (QA Tenfcall; recruiter d8186688 is RECRUITER on its omni cast).
- If "You can't record a result": `localStorage.removeItem('recruit-dev-user')`.
- Stop: kill by PID (NOT `pkill -f front_note.js` inside a compound command — it killed the gradle run once).
- Staging omni already holds one test chat on QA Tenfcall from the 1-line version ("Call result · Interested — Test Note append Omni").
