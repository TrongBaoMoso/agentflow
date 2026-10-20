# HANDOFF: agentflow-8oafx (D303) - recruiter fixes of name/phone/NMLS/email reach MOSO

Away window night 21->22/10 (memory feedback_away_window_2122_8oafx_sync.md): recruit-be/fe -> STAGING only, no prod. packs PR only.
Design: `bd show agentflow-8oafx` notes "PROPOSAL CONFIRMED".

## State — 22/10 ~04:00: DONE TO STAGING
| Piece | Status |
|---|---|
| recruit-be #704 | MERGED 33c0221f, on staging (cd-staging green). identity-writeback ON on staging, e-mail OFF |
| recruit-fe #556 | MERGED 216bb90e, on staging |
| packs #3721 (master), #3722 (3.64.1) | open, Repo Owner APPROVE, NOT merged (Khai). Needed only for the e-mail half |
| staging E2E | live: fix -> SYNCED -> register page pre-fills it; LO change back -> CHANGED_IN_MOSO + bell; clear -> REJECTED note. E-mail 409 shown from a staged 409 |
| production | nothing. Flags listed in agentflow-61yi6 |

Design change in round 2 (D303 point 5): no unfreeze. A fix stays in recruiter_locked_fields; after SYNCED / CHANGED_IN_MOSO only the live webhook treats it as unfrozen (MosoFieldSync#mosoOwnedAgainFieldKeys).
Follow-ups: agentflow-wzkts (packs), agentflow-swd7k (fe).

## Key facts
- packs WRITABLE_FIELDS already accepts first_name/last_name/phone/nmls (3.64.1 + master); only email is excluded (lookup key) -> recruit sends `new_email`.
- Flags: RECRUIT_FEATURES_IDENTITY_WRITEBACK (staging on in #704), RECRUIT_FEATURES_IDENTITY_WRITEBACK_EMAIL (off everywhere until packs #3721/#3722 deploy).
- D303, V265 (`candidate_moso_field_sync`), R-number none. New endpoint GET /api/v1/candidates/{id}/moso-field-sync.
- No local Docker tonight (swap nearly full): ITs run in CI only.

## Next (for Bao / Khai)
1. Bao: look at the screenshots (session scratchpad e2e/shots/D303-*.png) and staging.
2. Khai: merge/deploy packs #3721 + #3722; then turn RECRUIT_FEATURES_IDENTITY_WRITEBACK_EMAIL on on staging and test the e-mail half live.
3. Production: with the hand-off go-live (PR #703, agentflow-61yi6).
