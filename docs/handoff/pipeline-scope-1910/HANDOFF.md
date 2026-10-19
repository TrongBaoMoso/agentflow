# Recruit Pipeline scope + UI — HANDOFF (paused 19/10/2026 ~17:00 VN, machine shutdown)

Session: c75c162b-e414-4186-a39b-1fe389f3b2a0 (resume with `claude --resume`). Language with Bao: Vietnamese.

## On PRODUCTION (done)
| Repo | PR | What |
|---|---|---|
| recruit-fe | #523 | Pipeline UI v3: balanced columns, cards/board, unified TimeCell, HR archive ConfirmDialog, page icon tiles |
| recruit-fe | #524 | Actions column: Claim on one edge, no hover arrow; Status 116 / Last touch 136 |
| recruit-be | #674 (D278, V257) | Any contact closes due suggestion follow-ups (NO_ANSWER only call kinds); call result = touch. Prod backfill changed 1 row |
| recruit-be | #678 (D280) | GET /kpi/pipeline?scope=mine |
| recruit-fe | #526 | Mine/All scope pills (Recruiter/OB default Mine, Manager All), hide Owner in Mine, Mine empty state |
| recruit-fe | #527 | Board cards: days in stage chip (needs BE stage_entered_at) |
| recruit-fe | #528 | "Follow-up today" toggle with red count (fu=today) |
| recruit-fe | #529 | Pipeline menu for ONBOARDING; /pipeline closed to HR/LICENSING/ACCOUNTING-only; NoAccess -> first allowed screen |
| recruit-fe | #530 | Headhunter: no scope control; Team lead: Mine/Team; inline "Collected by me" removed |

Prod heads: recruit-fe `e507fd00`, recruit-be `a731f69d`.

## STAGING only — PROD FROZEN (Bao 19/10 ~15:30)
Staging of both repos also carries ANOTHER session's PRs: fe #525 (w9fk4 HR checklist, that session keeps it staging-only) + #533 (SDK 0.4.46); be #681 (D282 Hot/Cold need CLAIM or REPORT_TEAM) + #682 (D285 HR checklist read). Do NOT push either repo to production until Bao approves #525/#681/#682.
Waiting on staging (mine): be #677 (D279, V258 stage_entered_at; prod preview: 1143/1143 rows backfill from stage_history), fe #532 (stage-age tooltip date fix). Verified on staging: board shows "6d … In New lead since Mon, Oct 12".
When Bao unfreezes: `git push origin origin/staging:refs/heads/production` (FOREGROUND) in recruit-be first, wait cd-production, then recruit-fe; read-only check V258 in flyway_schema_history on prod.

## IN PROGRESS
**recruit-be #686 — hide leads owned by HEADHUNTER/TEAM_LEAD from plain recruiters (D283).** Branch `feat/hide-program-leads`, worktree `_worktrees/recruit-be-hh-visibility`. Bao decision 19/10: visible only to owner, owner's team lead, the lead's onboarding specialist, REPORT_TEAM (Manager/Admin); department queues + /sponsorships keep working for department roles (ONBOARDING/HR/LICENSING/ACCOUNTING) but NOT for recruiter-only users.
Both reviewers BLOCKED the first version: hiding was reads-only. Remaining fixes sent to the agent (check the branch for what landed):
- H1 every HTTP method on candidate-keyed routes ({id}, {candidateId}, {offerId} writes, {enrollmentId}, /checklist-items/{id}, query candidateId) -> 404 identical (status + body) to a missing id. Leaks today: PUT /candidates/{id} returns full record; /activities leaks ownerId/ownerName; claim 409 vs 404; transfer 403 vs 404.
- H2 PUT /candidates/{id}/onboarding-specialist must 404 a hidden lead for non-elevated callers (OB self-assign bypass).
- H3 bulk-transfer / bulk-archive / batch-claim / duplicates merge: hidden id = same per-row verdict as missing.
- M1 batch interceptor loads (no N+1); M2 member set also from program_members (D202 current members, departed); M3 OFFER_APPROVE roles; M4 SSE re-check per event.
- Dept-queue exemption only for department roles / REPORT_TEAM.
Then: 2 reviewers again (java-reviewer + security-reviewer), CI green, merge, promote STAGING, verify on staging with recruiter / hh / role-onb / manager accounts (recruiter must not see HH leads anywhere; GET /candidates/<hh lead> 404 like random UUID). Production waits for the unfreeze.

## Follow-ups (beads)
- agentflow-nl92f (P3) meetingWhen.ts: invalid meeting_zone prints raw Date (same bug as #532).
- Old P3: agentflow-4k8xs.5, .6.

## Tooling notes
- RAM: `~/.claude/bin/ram-gate acquire <kind> <label>` before chrome/next dev/jest/gradle. Docker Desktop is HUNG — do not restart (Bao's mongo); BE ITs via CI (temp PRs for negative controls, close at once).
- Staging tokens: playwright scripts in scratchpad `pw/` (tok.js, tok_rec.js, tok_hh.js, tok_tl.js) write ~/.cache/claude-recruit/preview/stg_*.token; login helper docs/handoff/recruit-e2e-lab/scripts/auth.js.
- Read-only prod/staging SQL: temp pod postgres:18-alpine + envFrom recruit-svc-secret, ns recruit-be; contexts gke_lender-rate_us-central1_moso-gke (prod), gke_lenderrate-master_us-central1_moso-kube (staging); PGOPTIONS default_transaction_read_only=on.
- UI research report: https://claude.ai/artifact/3doW8eoshm5Nxkpgdj5LS3 (patterns #2 #3 #5 done; others open).

## RESUMED 19/10 evening
- BE prod now ALSO has #681 + #682 (pushed by another session/Bao). BE staging-not-prod: #677 (mine) + #684 (other session, D286 exceptions badge). FE staging-not-prod: #525, #532, #533, #534 (#534 other session). Freeze still holds because of #684/#525/#534.
- #686 tip 2a7d4f5b (WIP write-path fixes) — CI red: HeadhunterRowScopeIT "WRITE: the HH cannot edit the figures and channel that decide program credit". New agent be-hh-visibility2 finishing + verifying all items.

## 19/10 21:00 — #686 DONE on STAGING
- Merged 78660803 (squash, after java-reviewer + security-reviewer APPROVE at 4eb5fe4b; last rounds: follower guard, getParameterValues, role cache, held-list IT). Promoted to staging, cd-staging success.
- Verified on staging with lead QA Hhsignqmz (owned by HH): recruiter + role-onb get 404 identical to a random UUID (GET, PUT, activities, claim, onboarding-specialist, transition); search excludes it for recruiter/role-onb, includes it for manager; HH sees own; /users/names hides the owner name from recruiter; UI /pipeline?scope=all&q=Hhsignqmz: recruiter no row, manager row, no 5xx. Screenshots scratchpad pw/ui686_rec.png, ui686_mgr.png.
- Accepted residuals in D283: /suppressions, owner ids on department routes, /users role list, old bells. Held-by-collector panel in Hot is now manager-only (follows Bao's rule).
- PROD still frozen: BE staging-not-prod = #677, #684, #685, #686, #687, #688; FE = #525, #532, #533, #534 (+ other session's later ones). Waiting for Bao.

## 19/10 ~21:30 — prod push handed to session agentflow-5d
Peer session agentflow-5d says Bao unfroze PROD for recruit-be + recruit-fe and it is doing the FF origin/staging -> production (incl. fe #525). This session does NOT push prod. After it reports: verify origin/production contains be 78660803 (#686), b09cbbc9 (#677) and fe 963c4c9d (#532); V258 in prod flyway_schema_history.

## 19/10 ~22:30 — fe #541 on STAGING
Headhunter Pipeline: no Owner column, no No owner yet (old ?owner=none ignored), Your candidates chip removed for all. Merged e9426806, staging verified (hh, hh ?owner=none not empty, team lead keeps Owner + No owner yet, recruiter unchanged). Screenshots scratchpad pw/stg541_*.png. PROD: staging also carries other session's #540 (Licensing) — not pushed.
- 19/10 ~23:00: fe #541 ON PRODUCTION (e9426806, image sha256:670fae0e, 4/4 pods ready). GitHub showed the run as 'waiting' after the deployment succeeded (GitHub API flaky).

## CLOSE-OUT AUDIT 19/10 ~23:20 (measured, not from memory) — SESSION CLOSED
- Both repos: production = staging = master (fe e9426806, be 98fe3a4f); nothing waiting.
- All 13 PRs of this session are ancestors of origin/production: fe #523 #524 #526 #527 #528 #529 #530 #532 #541; be #674 #677 #678 #686. Local-only pipe-balance commits verified inside #523 (TimeCell, pagerSlots, assign picker, compact cells, cards/board v2).
- Prod pods: recruit-fe 4/4 on sha256:670fae0e (#541); recruit-be 2/2. Prod flyway V257/V258/V259 success; stage_entered_at null = 0 of 1144.
- #686 on prod: 0 HEADHUNTER/TEAM_LEAD grant users and 0 leads they own (positive control staging: 2 users / 13 leads) — nothing hidden on prod yet; staging behaviour verified earlier.
- Worktrees removed: recruit-fe .worktrees/{pipe-balance,timecell,scope,hh-owner}, _worktrees/recruit-be-{anytouch,hh-visibility}. No dev server of this session running.
- Left open (backlog, not blocking): agentflow-nl92f (P3 meetingWhen raw Date), agentflow-4k8xs.5, agentflow-4k8xs.6 (P3), epic agentflow-4k8xs. Open PRs under the same GitHub user belong to other sessions (fe #542 #515 #318, be #690).

## Night 19→20/10 — P3 beads (away window, Bao: to PROD unless staging carries another session's unapproved PR)
- fe #546 (agentflow-4k8xs.6, board waits for view config + skeleton) and fe #545 (agentflow-nl92f, meeting/setup-call zone, intlZone helper): 2 reviewers each APPROVE, merged, on STAGING (verified: board reads S1,S2,S4,S5,S6,S7 only, no S0; Today no raw Date). PROD HELD: staging also carries #547 (other session's Exceptions UI, staging-only per its away window). agentflow-5d will push the whole batch after Bao approves Exceptions UI.
- be #695 (agentflow-4k8xs.5, departed-owner batch + auto claim, D294): round 1 REQUEST CHANGES from both reviewers (program members without grant treated as departed), fixes in progress. Prod measured: 0 ACTIVE departed-owner rows; prod PG 18.1, staging 18.0.
- 20/10 ~02:30: be #695 merged (9853eede) + STAGING (verified: recruiter/manager Today, Hot, Cold, unowned list 200; HH lead only in manager's held_by_collector, never in claimable lists). PROD HELD behind other session's be #694 (D295). Told agentflow-5d to include fe #545/#546 + be #695 in their prod batch. Beads nl92f / 4k8xs.5 / 4k8xs.6 stay open until production.
