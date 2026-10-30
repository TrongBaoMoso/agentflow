# HANDOFF: agentflow-8oafx (D303) - recruiter fixes of name/phone/NMLS/email reach MOSO

Away window night 21->22/10 (memory feedback_away_window_2122_8oafx_sync.md): recruit-be/fe -> STAGING only, no prod. packs PR only.
Design: `bd show agentflow-8oafx` notes "PROPOSAL CONFIRMED".

## UPDATE 30/10 ~09:30 (measured)
- packs master build FIXED by Tuan himself: 16b257705f8 (29/10 19:57Z) adds CompensationResolution. Draft message to Tuan is OBSOLETE, do not send.
- Next: SWAT Rerun install packs/loan on master to put wzkts (#3807) + #3810 on MOSO staging (needs Bao login to x.moso.com + gcloud).
- recruit be/fe staging = master (be 03a162f1, fe 85702d2f), Deploy staging (GKE) success; production unchanged (be 434d0ab6, fe c72bfec0).

## MORNING REPORT — 30/10 (night 29→30 done, STAGING only)
| Item | State (measured) |
|---|---|
| r0g2q register copy after 1-1 | PROD (lf promote #2692, Cloud Run lf-homepage-00757) |
| l21zt early Mark done | STAGING: recruit-fe #610 (dialog) + #620 (button offered once booked) + recruit-be #771 (D345). Live E2E PASS (Today + My hand-offs, Cancel pressed) |
| swd7k plain refused-fix note + no edit modal | STAGING: recruit-fe #613. Live E2E PASS |
| 36f0b who-changed bell | STAGING: packs #3805/#3806 (MOSO staging GAE b), recruit-be #767 + #770, recruit-fe #612. LO case PASS end to end; STAFF case payload PASS, bell sentence untested (MOSO staging login expired) |
| wzkts packs email lock | MERGED (#3807/#3808), NOT on MOSO staging: packs master does not compile (39ded1e5c59, Tuan) — draft message above |
| Prod decisions for Bao | recruit-be #767 #770 #771 and recruit-fe #610 #612 #613 #620 are on staging only. #770 widens privacy rule R1 for these bells (phone/email values + staff name go to the shared notifier) — Bao to accept before prod. packs 3.64.1 prod = Khai. |
| Staging test data left | bao.trinh+e2e30cb1 (CHANGED_IN_MOSO, MOSO phone 3199), +e2e30cb2 (SYNCED 3122, MOSO career/lang filled), t08e1 1-1 booked 30/10 03:28 local, t08q10 setup call booked 30/10 |
| To finish | Bao logs into MOSO staging → edit cb2 phone as staff → bell "Số điện thoại của Cbtwo Echo được <name> đổi: …" |
All session worktrees removed; SWAT Chrome closed.

## NIGHT 29→30/10 (Bao asleep; STAGING only, no prod, no messages) — see memory feedback_away_window_2930_changedby_staging
Done before the night: r0g2q LIVE on lf PROD (promote PR #2692 = only #2691, Cloud Run lf-homepage-00757; first prod build failed on a transient next/font Google download, re-run of trigger e9e6d7f4 succeeded). recruit-be #767 (033e5a9c) and recruit-fe #610 (4d57fe54), #613 (8f99ba83) on STAGING. packs #3805/#3806/#3807/#3808/#3810/#3811 merged; MOSO staging still GAE b (has #3805 changed-by, NOT wzkts/#3810) because packs master does not compile.

Draft message for Bao to send in the morning (NOT sent):
> Anh/chị Tuấn ơi, packs `master` đang không build được từ commit `39ded1e5c59` (Accounting API: export compensation resolution…, 29/10 18:56). `AccountingAPI.java` (dòng 38, 462, 556) và `LoanOps` import `com.mvu.loan.server.op.loan.CompensationResolution` nhưng file đó không có trong repo — có lẽ quên add. SWAT install packs/loan trên master đang failed nên các fix khác (vd #3807 recruit new_email) chưa lên staging được. Anh/chị add giúp file đó nhé. Cảm ơn!

## RESUME POINT — 29/10 ~18:00 +07 (Bao paused to go home; session 6b7abf95)
Read this block first. Everything below it is older history.

### Done today (measured)
- recruit-be prod: hand-off + identity flags ON (#703, 20bf683f); then CALL_WORKSPACE, GOOGLE_CALENDAR_EVENTS, MEET_ATTENDANCE, WEBINAR_SIGNALS ON (#766, f0f3a3a2). Live prod pod shows all true. Later someone else promoted be to 0d63d20d (master=staging=production).
- packs #3805 (master 83eae70aa88) + #3806 (3.64.1 fef2056685b) MERGED: push carries `__changed_by {kind LOAN_OFFICER|STAFF|SYSTEM, name, email}`. master deployed to MOSO staging via SWAT Rerun (GAE b 2026-10-29T10:33Z). 3.64.1 -> prod = Khai.
- Bead ax9hm CLOSED (not reproducible: W1 pct 0.5 opens "Agreement signed").
- Bao decisions 29/10: bell for MOSO changes = INFO ONLY (no click action, no yellow card, no "It had been fixed in recruit" note, no "MOSO" wording); STAFF copy "{field} của {lo} được {name} đổi: a → b"; l21zt = confirm popup, allowed early; r0g2q copy approved; markdone UI approved; wzkts "merge đi"; swd7k item 1 = do it with new plain copy (no "in MOSO").

### Open PRs / in-flight (resume here)
| Item | Where | Next step |
|---|---|---|
| recruit-be #767 (changed_by in bell payload, D344) | branch feature/changedby-moso-field | CI was running (integration tests). 2 reviews: packs-side APPROVE; be reviewer blocking (INTEGRATIONS row) FIXED. When green: `gh pr update-branch 767` if BEHIND, merge, promote staging. Prod later with the fe change. |
| recruit-be #768 (comment-only) | auto-merge ON | nothing; merges itself when green |
| recruit-fe #610 (l21zt early Mark done confirm, incl. checklist setup call) | auto-merge ON, 2 reviews APPROVE, CI green | after it merges: `git log origin/staging..origin/master` (only promote others' commits after asking their session), `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-fe`, check cd-staging |
| lf-homepage #2691 (r0g2q post-1-1 register copy) | head a9cb040a, branch agent/r0g2q-post-1-1-register-copy, worktree _worktrees/lfh-r0g2q | ALL review items fixed (catch false, reset on mount/unmount, 5 s fallback, flow-hook test; 31 tests pass). Next: re-review by both reviewers, CI, merge to master (= staging). Prod = master->production PR, ask Bao |
| recruit-fe changed-by bell rework (head 0e9bd661, feature/changedby-bell, worktree recruit-fe-worktrees/changedby) + swd7k item 1 (f789ce1b, feature/swd7k-rejected-note-in-edit, worktree recruit-fe-worktrees/swd7k — its node_modules is a symlink to the changedby worktree: remove the symlink before deleting changedby) | local only, NOT pushed (UI) | Code done. Next: show Bao screenshots scratchpad/changedby2/ (bell info-only, edit notes); ask Bao to confirm agent-written copy for SYNC_OFF / MOSO_DOES_NOT_ACCEPT / MOSO_REFUSED / EMAIL_LOCKED_AGREEMENT_SENT / EMAIL_INVALID; re-run jest on changedby; 2 reviews; push + PR; merge after #767 is on staging. NOTE scratchpad may be wiped on reboot: re-take screenshots if missing. |
| packs #3807/#3808 (wzkts lock + helper) | heads 90e9336e7d1 (master) / c42783e3643 (3.64.1), pushed; worktrees packs-worktrees/wzkts-master, wzkts-3641 | Agent STOPPED mid-task 29/10. Done+pushed: hashed e-mail lock key, rethrow body's own exception. NOT confirmed: review item 3 (namespace of RegisterInterestedLoanOfficer lock vs RecruitAPI.sync) and the non-blocking items. Follow-up for #3805 (marker-clear test + Javadoc) was started in packs-worktrees/changedby-master on branch agent/36f0b-followup-master: 355 dirty files under loan/src, head = someone else's master commit -> INSPECT (likely a bad checkout), do not commit blindly. Next: finish item 3, re-run the second reviewer, then merge both (Bao said merge). |
| 36f0b E2E | staging | after #767 on staging: LO changes phone on www.viet18.com/register-loan-officer for a candidate with a recruit fix -> bell says "<LO> tự đổi Phone…"; staff edit in MOSO -> "<field> của <lo> được <name> đổi…" |

### Still OFF on prod by decision (bead agentflow-61yi6)
MOSO_OWNER_SYNC (dry run first; up to 1341 S5-S7 rows), HR_HANDOFF_AUTO_SEND (ask HR), AGREEMENT_SEND (not needed). Inert group needs Thanh (secrets/subscriptions), Khai (moso-notifier mail config, omni #608/#609, reply domain), Bao (central RBAC, DRY_RUN->SEND).

### Rules in force
Bao is the only prod approver; packs prod = Khai; UI must be shown locally before push; 2 reviewers before merge; ram-gate before Chrome/jest/gradle/next; test e-mails bao.trinh+tag only.

## PROD FLIP — 29/10 ~15:30 +07 (Bao: "bật prod đi")
- PR #703 merged 20bf683f with all 7 flags (5 hand-off + IDENTITY_WRITEBACK + _EMAIL); staging promoted; production FF 21d9e2e4..20bf683f; live prod deployment shows all 7 true, 2/2 pods Running.
- Pre/post checks: outbox 0 -> 0, candidate_moso_field_sync 0 -> 0, onboarding.reminder.delivery_mode DRY_RUN, five ONBOARDING grants all MOSO specialists. Two reviews: auto-trigger audit SAFE, config review APPROVE.
- From now on any Send/Approve offer, 1-1 Done or profile save on prod writes to MOSO prod (and can e-mail a real Loan Officer).
- Bao decisions: (a) re-save of same value does not re-freeze - keep; (b) no note under the field - dropped; new bead for bell click -> profile with the changed field highlighted (only from the bell), open question who-changed wording; keep W1-W3 test data; key rotation / leaked gho token: leave; beads stay local.

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
