# HANDOFF: agentflow-8oafx (D303) - recruiter fixes of name/phone/NMLS/email reach MOSO

Away window night 21->22/10 (memory feedback_away_window_2122_8oafx_sync.md): recruit-be/fe -> STAGING only, no prod. packs PR only.
Design: `bd show agentflow-8oafx` notes "PROPOSAL CONFIRMED".

## State (update as you go) — 22/10 ~04:30
| Piece | Where | Status |
|---|---|---|
| recruit-be | PR #704, branch feature/identity-writeback-8oafx, worktree recruit-be-worktrees/identity-8oafx, head 9cb8745f+d660a969 | 2 review rounds addressed (be-A, be-B, be-R2); round 3 (be-R3) running; unit 5753 green; IT fixed by seeding a claimed entity (d660a969), CI rerun pending |
| packs master | PR #3721 (3 commits, head 3684294d284) | Repo Owner round 2 APPROVE; round-2 LOWs fixed; 14 identity tests green; not merged (Khai) |
| packs 3.64.1 | PR #3722 (same 3 commits) | 14 green on 3.64.1; not merged |
| recruit-fe | PR #556, head 85bd174c | 2 reviews addressed (fe-A approve, fe-B changes -> fixed); fe-R2 running; 59 suites / 690 tests green locally |
| reviews | headless `command claude -p` read-only (the lead is a fork, no Agent tool) | outputs in session scratchpad reviews/*.md |
| staging | - | not promoted yet |

Design change in round 2 (D303 point 5): no unfreeze. A fix stays in recruiter_locked_fields; after SYNCED / CHANGED_IN_MOSO only the live webhook treats it as unfrozen (MosoFieldSync#mosoOwnedAgainFieldKeys).
Follow-ups: agentflow-wzkts (packs), agentflow-swd7k (fe).

## Key facts
- packs WRITABLE_FIELDS already accepts first_name/last_name/phone/nmls (3.64.1 + master); only email is excluded (lookup key) -> recruit sends `new_email`.
- Flags: RECRUIT_FEATURES_IDENTITY_WRITEBACK (staging on in #704), RECRUIT_FEATURES_IDENTITY_WRITEBACK_EMAIL (off everywhere until packs #3721/#3722 deploy).
- D303, V265 (`candidate_moso_field_sync`), R-number none. New endpoint GET /api/v1/candidates/{id}/moso-field-sync.
- No local Docker tonight (swap nearly full): ITs run in CI only.

## Next
1. Fix IdentityWritebackIT specialist bell (read CI message from #704 run).
2. Commit + PR recruit-fe; screenshots desktop 1440 + mobile 375 of: "Not updated in MOSO" note, email 409 inline error, two bells.
3. Reviews, merge #704 then fe PR, promote staging (check origin/staging..origin/master first), staging E2E.
4. Add identity flags to bead agentflow-61yi6 and PR #703 open list.
