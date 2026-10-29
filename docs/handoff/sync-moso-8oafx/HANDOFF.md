# HANDOFF: agentflow-8oafx (D303) - recruiter fixes of name/phone/NMLS/email reach MOSO

Away window night 21->22/10 (memory feedback_away_window_2122_8oafx_sync.md): recruit-be/fe -> STAGING only, no prod. packs PR only.
Design: `bd show agentflow-8oafx` notes "PROPOSAL CONFIRMED".

## CLOSE-OUT — 29/10 (session 6b7abf95 closed by Bao), all measured
- Code: be #704/#706, fe #556 are in origin/production (29/10 release). packs #3722 is live on MOSO prod (GAE c, 28/10; `POST /api/recruit/v1/candidate/emailAvailable` 401 vs bogus path 404).
- Flags: live staging deployment has all 7 ON; live prod deployment has none of them set (all default false).
- Draft PR #703 still open, merges cleanly into master. The only thing left before hand-off works on prod: merge #703 + add RECRUIT_FEATURES_IDENTITY_WRITEBACK(_EMAIL) to prod values. Trigger = first real user on prod (still none on 29/10: every offer/activity by super.admin). Bead agentflow-61yi6.
- Beads closed: uuy7w, 8oafx. Still open (fix later): r0g2q (copy still on lf master+production), l21zt, ax9hm, wzkts, swd7k.
- Still unanswered by Bao: questions 3a/3b below; W3 test LO (bao.trinh+e2e22w3, NMLS empty, REJECTED row) still on staging.
- Not measurable by Bao's account: whether PACKS_WRITEBACK_INTERNAL_API_KEY was rotated (no secretmanager.versions.list) - ask Khai.
- Worktrees identity-8oafx (be, fe) and staging-email-flag removed; prod-handoff-flags kept for #703.

## RESUME POINT — 21/10 ~12:00 +07 (Bao paused the session to go home)
Whole session (6b7abf95) in one place. Nothing is running in the background; nothing is half-pushed.

Done:
- agentflow-uuy7w: prod readiness of the D207 hand-off measured (tenant, key, actors, packs V2 in the prod jar GAE f, one specialist miley.dau); staging E2E W1 (webinar LO -> hand-off -> 1-1 -> pre_onboarding_done e-mail -> link opens Basic information while the profile is empty, Pay once submitted -> pay -> sign) and W2 (recruiter edits did not reach MOSO -> became 8oafx).
- agentflow-8oafx (D303): name/phone/NMLS/e-mail sync live on staging (this file, below).
- recruit-be draft PR #703: five hand-off flags for production (PACKS_WRITEBACK, ONBOARDING_WRITEBACK, ONBOARDING_V2_HANDOFF, ONBOARDING_HIRE_CLASSIFICATION, ONBOARDING_LEGAL_NAME). NOT merged. Technically unblocked now.
- agentflow-61yi6: go-live reminder, every flag ON on staging / OFF on prod (incl. the two identity flags). Remind Bao when prod gets real users.

Bao's decisions so far: 8oafx before the hand-off go-live (done to staging); one specialist (Miley) OK; D137 order not formally decided but approve -> 1-1 -> fill -> pay -> sign is fine; register-page copy fix not required before go-live.

Open (waiting on people):
1. Khai: release packs 3.64.1 (#3722, f461ba4775e) to production.
2. Bao: go-live decision -> merge #703, promote recruit staging -> production, add the identity flags to prod values (follow agentflow-61yi6).
3. Bao, questions from the overnight report still unanswered: (a) a save that re-sends the same value does not re-freeze the field after CHANGED_IN_MOSO, OK? (b) add a muted "Changed in MOSO after your fix" note under the field (agentflow-swd7k)? (c) W3 staging LO left with NMLS cleared for viewing the REJECTED note, clean up after.
4. Screenshots: the overnight D303-* shots were lost with the scratchpad; only D303-email-{a-regform,b-409,c-signed}-{desktop,mobile}.png exist (session scratchpad e2e/shots). Retake the bell + "Not updated in MOSO" shots if Bao asks (W3 data still on staging).

Follow-up beads (fix later, Bao 21/10): agentflow-r0g2q (register page still says "We will call you"), agentflow-l21zt (Mark done accepted before the 1-1 start), agentflow-ax9hm (after pay+sign a plain ?key link shows "Payment successful", complete_percentage stuck at 0.25), agentflow-wzkts (packs e-mail case/lock helper), agentflow-swd7k (fe note in edit mode + CHANGED_IN_MOSO note). Minor: case c wording differs between BE ("Ask HR") and FE ("changed by HR").

Security note: during the 20/10 measurement a loose filter printed the prod value of PACKS_WRITEBACK_INTERNAL_API_KEY into the session transcript (not sent anywhere). Bao/Khai to decide on rotation.

## State — 21/10 ~11:30 +07: E-MAIL HALF LIVE ON STAGING
| Piece | Status |
|---|---|
| packs #3721 (master) / #3722 (3.64.1) | MERGED by Bao's go (c76be35f477 / f461ba4775e). master deployed to viet18 via SWAT Rerun of install packs/loan (GAE b 2026-10-21T03:51:37Z). 3.64.1 NOT released to prod (Khai) |
| recruit-be #706 | MERGED 6dccbc26, on staging: RECRUIT_FEATURES_IDENTITY_WRITEBACK_EMAIL on (staging only) |
| live E2E | a) e-mail fix SYNCED -> MOSO + register form show it; b) taken e-mail -> 409 inline, nothing saved; c) signed LO -> REJECTED AFTER_SIGNING note; d) phone-only still SYNCED. All PASS (details in bd notes agentflow-8oafx) |
| production | still nothing; both identity flags in agentflow-61yi6; needs #3722 released first |

Test data left on staging: W1 bao.trinh+e2e21w1 now reads e2e21w1b in recruit while MOSO keeps e2e21w1 (the refused case, by design).

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

## Next
See RESUME POINT above (items 1-4). Steps 1-2 of the old list (merge packs, turn e-mail on on staging, live test) are done.
