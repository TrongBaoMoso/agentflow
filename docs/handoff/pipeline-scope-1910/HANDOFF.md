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
