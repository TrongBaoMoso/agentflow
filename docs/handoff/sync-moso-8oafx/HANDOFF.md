# HANDOFF: agentflow-8oafx (D303) - recruiter fixes of name/phone/NMLS/email reach MOSO

Away window night 21->22/10 (memory feedback_away_window_2122_8oafx_sync.md): recruit-be/fe -> STAGING only, no prod. packs PR only.
Design: `bd show agentflow-8oafx` notes "PROPOSAL CONFIRMED".

## State (update as you go)
| Piece | Where | Status |
|---|---|---|
| recruit-be | PR #704, branch feature/identity-writeback-8oafx, worktree recruit-be-worktrees/identity-8oafx | pushed; unit suite green (5747); CI IdentityWritebackIT failed once on the specialist MOSO_FIELD_CHANGED bell (owner got it, specialist 0); diagnostic commit 79c33e85 pushed, read the CI message |
| packs master | PR #3721, branch feat/recruit-identity-sync-8oafx, worktree _worktrees/packs-identity-8oafx | open, not merged (Khai). 322 RecruitApi*/V2 tests green locally |
| packs 3.64.1 | PR #3722, branch hf/3.64.1-recruit-identity-sync-8oafx, worktree _worktrees/packs-identity-8oafx-3641 | open, not merged. 294 green (base 3.64.1 installed locally) |
| recruit-fe | worktree recruit-fe-worktrees/identity-8oafx, branch feature/identity-writeback-8oafx | code written, NOT committed yet; jest 620 green on Bell/Drawer/EditModal suites |
| reviews | - | not done (the overnight lead is a fork and cannot spawn reviewer agents) |
| staging | - | not promoted |

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
