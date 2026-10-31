# Recruit "My hand-offs" (/invites) redesign — HANDOFF (paused 21/10/2026)

Bead: **agentflow-10v0e** (full decision list). Mockup (Design canvas, org-shared):
https://claude.ai/artifact/2xqHaJerZt6VPToB9X5E2Q — the approved board is **V4** (third row, left).
Other boards: Current (as-is recreation), Main (v1), Compact (option A, rejected), Ring (v3), RefHR (HR app screenshot).

## Where we stopped

Mockup v4 is in its final shape; the product owner has answered every open question below.
**Last question NOT yet answered: "approve v4 → start coding?"** Ask that first on resume.
Nothing is coded, nothing pushed in recruit-be / recruit-fe.

## Decisions (product owner, 21/10)

| Topic | Decision |
|---|---|
| Column order | Progress · Loan Officer · Status · Waiting on · To do · Waiting for · action |
| Loan Officer cell | Avatar initials + name + NMLS link — reuse `inbox/_shared/LeadWhoCell` (Hot/Cold). No city/state, no "to <specialist>" |
| Progress | Ring of **11 arcs** (Approval, 1-1, Fee, Signed, Sent to HR, HR account, HR to-do, HR docs, Licensing, Setup call, Onboarded), colour per step, **% in centre**, legend row kept, hover = per-step detail. No sub-text under the ring |
| Bypass | Auto-approved (D64, `approved_by` = SYSTEM) = **striped green** arc; manual = solid green; declined = red |
| Pre-join waiting colour | The step being waited on is orange (today's FE never paints pre-join steps orange) |
| Status column | **Keep** (option a): chip = BE stage (Waiting approval, 1-1 pending, Paying & signing, Joined, Not qualified + "by <decliner>") |
| Waiting on | Person = avatar + full name. Employees show photo (`OwnerBadge`), loan officers initials. **No "Loan Officer" chip.** HR / Licensing = team icon. Closed rows "—" |
| Who owns Book 1-1 / Meet 1-1 | **Onboarding specialist** (`OnboardingTask.BOOK_1ON1`). Current FE `waitingOn()` in `postJoinedView.ts` puts the LO there — **bug on staging today** |
| Pay fee / Sign | Waits on the loan officer; action = Open (BE only allows Remind onboarding in 1-1 pending) |
| Approvers | **Role MANAGER only** (exclude ADMIN `*`) — for Waiting on AND Remind manager. Prod today: victoria.pham@ only (admins bao.trinh@, it.dept@ excluded) |
| To do | Approve invite, Book 1-1, Meet 1-1 · <date>, Pay fee, Sign agreement, Add <field> for HR, HR to-do/HR docs, Sponsor license, Book setup call. Closed rows "—" |
| Waiting for (renamed from Since) | `TimeCell` kind elapsed (duration line + date chip, red when late) like Pipeline/Hot |
| Stat cards | Add **All** (default). **Drop Expired** (nothing in recruit ever sets EXPIRED). "Not qualified" name: rename to "Declined" still undecided |
| Hints | Remove `sort_hint` ("Waiting longest first · late ones in red"), `range_custom_hint`; propose removing `empty_body` |
| Date range | HR app `PeriodPicker` style: `‹ [📅 Last 30 days ▾] ›`, presets left + two months (see `ref-hr-period-picker.png`). Drop the "Requested ·" prefix |
| Sort / filter | Sort by Progress, Loan Officer, Waiting on, Waiting for (default: longest wait first). Filters: Waiting on, To do step, Late only |

## Work plan (when approved)

1. **recruit-be** (one PR, BE before FE):
   - `GET /offers/mine`: `stage=ALL`; sort + filter params (list is server-paged, `MyInvitesStore` ORDER BY `stage_since` is fixed today).
   - `progress.approval { at, by_name, auto }` from `offers.approved_at/approved_by` (SYSTEM = auto).
   - Approvers (role MANAGER) on WAITING_APPROVAL rows; `remindApprover` recipients = MANAGER role only (today `usersWith(OFFER_APPROVE)` includes ADMIN).
   - Waiting-on person/action per row (or leave the derivation to FE from `progress` + specialist).
2. **recruit-fe**: rewrite `invites/_components/InvitesClient` + `InviteRow`; fix `waitingOn()` owner of Book 1-1; ring component (new segmented variant, keep `ProgressRing` for the LO card); i18n en+vi.
3. Start LOCAL for the product owner before any push (memory `feedback_local_preview_before_push`).

## Measured facts (21/10)

- recruit-fe origin/master 0b353055, recruit-be origin/master 8c064b0d at the time of reading.
- `InviteStage` = WAITING_APPROVAL, INVITED_1ON1_PENDING, PAYING_SIGNING, SIGNED, DECLINED, EXPIRED; `stage` param accepts IN_PROGRESS or a stage, blank = IN_PROGRESS (`MyInvitesServiceImpl:538`).
- DECLINED only via manager Decline in the approval queue (reason required, `OfferServiceImpl.decline`).
- RBAC (read-only psql pod, staging + prod): roles with OFFER_APPROVE = MANAGER, ADMIN(`*`). Prod grants: ADMIN bao.trinh@, it.dept@; MANAGER victoria.pham@.
- Tera date range: Mantine `DatePickerInput type="range"` + presets Today/7/30/90 (`CommDateRangeFilter.tsx`); screenshot not taken — test accounts get "no access" on tera.viet18.com/communication-activity.

## Mockup sources

`mockup-src/` holds the generators (`gen_v4.py` builds V4 and imports data from `gen_ring_v2.py`). They write into
`scratchpad/artifact-files/<id>/project/`; on resume re-read the artifact files first (`Artifact read` with `path`),
set `ROOT` in `gen_ring_v2.py` to the new folder, re-run, then publish `project/V4.dc.html` to the same artifact URL.

## STATUS 22/10 — on staging

- BE: recruit-be #708 (40f66f5f), #710 (c95936dd), #711 (af4fb80e) — D306 / D307. FE: recruit-fe #559 (1acf6f92).
- Verified on recruit.viet18.com/invites as recruiter (63 rows) and onb-test (37 assigned rows, "You", conversation icon).
- Decisions added after V4 (SPEC.md amendments 1–4): per-step post-Joined owners (HR to-do = loan officer), Mark 1-1
  done, Waiting on = role + person avatar line, "Review offer", "Remind" label, no Open button, late on every open
  step (lateDays), MEET never late, specialists see their assigned LOs, setup call waits on / rings the recruiter,
  conversation icon per row, sticky header, % column widths.
- **Production: NOT promoted.** Order: recruit-be production first (FE sends stage=ALL, old BE answers 400), then
  recruit-fe. Behaviour change on prod: Remind manager reaches MANAGER role only (victoria.pham), not ADMINs.

## PAUSE 22/10 evening — RESUME POINT

**On staging:** recruit-be #708 #710 #711 #712 (multi-value step/waiting_on) #713 (unseen rows first); recruit-fe #559.
**Merged to master, NOT yet promoted to staging:** recruit-fe **#563** (round 2: grouped To do tree, multi Waiting on,
HR-style date range, compact actions, Conversation icon last on every row, decline-note tooltip, "Invite email not
sent" + compact Resend only before the 1-1 is booked, phone table scrolls sideways) — master 82fddb38.
**Open PR, CI was running at pause:** recruit-fe **#564** `fix/phone-tables-stay-tables` (tables stay tables on phones
everywhere, Table | Cards toggle on hand-offs/Hot/Cold/approval queue, one card look + hover incl. Pipeline cards/board,
Cold Claim compact). Locally verified: jest 621/622 (only pre-existing followUp.test.ts), tsc, eslint, build.

**Next steps on resume:**
1. `gh pr checks 564` → green → squash-merge → `gh workflow run promote-staging.yml -f sha=<master sha>` (this ships
   #563 + #564 together) → watch cd-staging → smoke /invites, /inbox/hot, /inbox/cold, /pipeline?view=cards at 1440+390.
2. Approved, not started — **Exceptions** (separate PR): keep the 3 sections (NO "type" column — removed earlier by
   feedback), add one page search (name/NMLS across sections), Owner filter, header sort per section, Refresh, one
   page-level Table | Cards toggle. No pagination / saved / export / bulk.
3. Proposed, NOT yet approved — list-page standard (audit result in this session): hand-offs + Reset/Refresh/Saved;
   Hot/Cold Saved (+ Cold bulk Assign like Hot, manager-only); Dormant/Audit/Work: toggle, Refresh, Reset, Saved, row
   count (Audit: search + date range); Conversations/Audit/Permissions onto the HrList kit, Permissions filters into the
   URL (rule #5). Not for Reports/Duplicates/Templates/Checklist templates/My referrals. Extras proposed: active-filter
   chips, "Clear filters" in empty state, remembered page size, column picker.
4. Production: nothing promoted. Order recruit-be first, then recruit-fe. Remind manager reaches MANAGER role only.
5. Known: Cold list overflows ~18px at 390 (pre-existing).

Worktrees: fe `recruit-fe-worktrees/handoffs-redesign` (fix/handoffs-round2, merged) and `recruit-fe-worktrees/phone-tables`
(#564); be `recruit-be-worktrees/handoffs-multi`. Local preview recipe: next dev -p 3311 in the worktree with
NEXT_PUBLIC_DEV_USER_ID=<account id> + `~/.cache/claude-recruit/preview/front_rec.js stg_<port>.token <port>`, tokens via
`~/.cache/claude-recruit/handoffs/tok.js` (3310 manager, 3320 recruiter, 3350 onb-test). All servers stopped at pause.

## RESUMED 22/10 night — #563 + #564 ON STAGING

recruit-fe #564 merged (55469ede) and promoted together with #563; cd-staging success. Smoke on recruit.viet18.com as
recruiter at 1440 and 390: /invites (table + cards), /inbox/hot, /inbox/cold, /pipeline in card view — no page errors,
no sideways overflow except Cold at 390 (+18px, pre-existing). Next: Exceptions plan (step 2 above); list-page standard
still awaits approval; production not promoted (BE first).

## NIGHT 22→23/10 (away window, staging only) — DONE

- **recruit-be #719** (15d08ff1, D313): GET /admin/audit-events takes `q` (≤100 chars, contains over event text, actor/subject ids, grant e-mails, candidate name), `from`/`to` (yyyy-MM-dd, inclusive UTC days, 1900–9999, from>to = 400). Filters run before paging. 2 reviewers (security + correctness), ITs green on PG16 locally and in CI. Known limit in D313: actor names from the central directory are not searchable (id / grant e-mail only); leading-wildcard scan, pg_trgm if it gets slow.
- **recruit-fe #566** (fd7328ce): list standard on every list page + Exceptions ("Needs attention") toolbar — search, owner filter, Reset, Refresh, Table|Cards, header sort, filtered chips, "No matches"; My hand-offs/Hot/Cold Reset+Refresh+Saved views (INVITES/HOT/COLD), Cold bulk Assign (managers, unowned rows); Dormant/Audit/Work/Conversations/Permissions on the HrList kit with Reset/Refresh/Saved/toggle/count (Permissions: no saved/toggle; filters now in the URL); Pipeline on the shared FilterReset (Reset now always shown, greyed at default); To do tree restyled (group header, count pill, 32px indent). 2 reviewers approve after one round of fixes (aae90682).
- Staging smoke as manager, 1440 + 390: 10 pages, no page errors, no sideways overflow (Cold 390 no longer overflows), Reset on every page except Permissions (manager has no access — expected). Exceptions search "Claude" 88→12 and Reset back to 88; Audit "chi tran" → 8 events server-side.
- Deferred (decided overnight, least behaviour change): Pipeline keeps its own default-preset logic; no sort control in Exceptions card view.
- Production: NOTHING promoted. Order when Bao says go: recruit-be first (#708 #710 #711 #712 #713 #719 + other sessions' BE on staging), then recruit-fe.

## 23/10 afternoon — follow-ups ON STAGING + Team queue plan (mockup v5, awaiting approval)

- **recruit-fe #571** (c351e0eb): Pipeline on the shared useDefaultPreset (first answer decides; page/pageSize not filter keys;
  apply keeps pageSize), Needs attention Cards per-section Sort select (340px), framed section headers in Cards, card footers
  right-aligned at every width (approval queue phone stacking fixed), followUp.test ICU-agnostic, TodayQueueRow test clock
  pinned (root cause: now+3h crosses the Pacific company day 21:00–24:00 PT → "no date" group, no chip). 2 reviewers, CI green.
- **recruit-be #731** (1dbc6fa6, D322): My hand-offs date range trims only CLOSED rows (declined/expired in SQL; SIGNED closed
  after derivation; archived/merged SIGNED = closed); open rows always listed and counted. 2 reviewers, ITs green.
- Staging smoke 23/10: Needs attention cards + sort select, /today-old approval cards at 390, Pipeline cards — no errors, no
  overflow. Staging data has no open invite older than 30 days, so D322 is proven by ITs only.
- Bead **agentflow-vcsjs** (P3, later): per-user column picker + remembered page size, SERVER-side prefs (Bao: no localStorage).

### Team queue (/work) — decision B (Bao 23/10), mockup v5 on artifact 2xqHaJerZt6VPToB9X5E2Q (boards V5Ob / V5Team / V5Need)
- Measured: OB onb-test /today vs /work overlap 27/28 LOs. Prod checklist: N/A only by migrations, BLOCKED = 0,
  ONB_ASSIGN_SUPPORT 94 open / 0 done (staging 185/0) → drop N/A, Blocked and Assign Support (retire migration like V222).
- Plan: OB — hide Team queue; My hand-offs row actions (Schedule 1-1 / Reschedule / Mark done / Fix details / Send again
  on MOSO sync failure). Manager — Mine | Team | Needs owner + Onboarding filter; on-behalf Mark done/Schedule (D216/D318);
  Assign OB on Needs owner rows. Then delete /work — first move its modals (ScheduleMeeting, OnboardingMeeting,
  OnboardingHireMeeting, HireExperienceCard, useScheduleMeetingActions) to shared code (Today + useSetupCallBooking import them);
  fix checklist.json copy "mark this one from the Onboarding queue". No notifications/e-mails link to /work.
- Manager in Team queue today sees ONLY onboarding work (1-1, setup call, unassigned), not recruiters' work.

## PAUSE 23/10 evening — RESUME POINT (Bao shutting down)

**On staging:** fe #559 #563 #564 #566 #571, be #708 #710 #711 #712 #713 #719 #731. Production: nothing.

**In flight (agents pushed WIP before shutdown — check `git log` of each branch):**
1. **recruit-be #738** `feat/today-setup-call-recruiter` (D329, V285): Book setup call on the RECRUITER's Today
   (requester of the latest offer, fallback specialist, shared `SetupCallOwnership`), Today decisions uncapped (cap 0).
   2 reviewers done; RBAC finding: no catalog / auth-service change needed (CHECKLIST_ITEM_MANAGE is checked in-app).
   Scope split DONE (2965054f: mayTick back to owner/specialist/admin; new maySetupCall adds the requester for booking +
   Mark done only; full gradle build green). LEFT: rebase on master (PR is "dirty": DECISIONS/STATUS/SCHEMA; renumber
   D329/V285 if taken), CI, merge, promote. FOLLOW-UP: the profile's OnboardingProgressCard shows Mark done/Undo from
   canTick, so a requester sees booking extras but no Mark done button there (Today row is fine) — needs a can_act_setup_call
   flag + FE change; do it with v5 FE.
2. **recruit-fe #576** `feat/approvals-and-pipeline-default` (worktree recruit-fe-worktrees/today-roles): approvals only on
   Today (Review rows, 14/10 decision); Needs attention has 4 cards, no approvals; /today-old DELETED (Bao OK 23/10);
   Pipeline Status multi-select default Active+Nurture (OR DSL verified on staging 6,256+43=6,299), neutral at default;
   "Showing N of M" notice (b5330021). 2 reviewers; ALL reviewer-2 items DONE in d4e761c6 (collected-by line on Today,
   ported tests, nurture hint dropped, dead code + 15 orphan keys removed). Left: full jest run, CI.
   Merge ONLY after #738 is on staging.
3. **v5 BE** `feat/handoffs-team-scope` (worktree recruit-be-worktrees/handoffs-v5): GET /offers/mine scope=MINE|TEAM|NEEDS_OWNER
   (TEAM/NEEDS_OWNER manager-only, 403 otherwise), specialist= filter, per-row action flags (can_schedule_1on1,
   can_mark_1on1_done, can_assign_specialist, can_resend_1on1_sync + checklist ids), migration retiring ONB_ASSIGN_SUPPORT
   (prod 94 open / staging 185 to NA). WIP, no PR yet.
4. **v5 FE** not started: My hand-offs row actions (OB), Mine|Team|Needs owner for Manager, hide Team queue for OB, move
   /work modals to shared code, delete /work, fix checklist.json "mark from the Onboarding queue" copy. Mockup v5 APPROVED
   23/10 (short labels: Mark done / Schedule 1-1 / Assign; full list standard), artifact 2xqHaJerZt6VPToB9X5E2Q.

**Decisions 23/10:** approvals = one shared queue (bead agentflow-edqao: a "My team" filter when a 2nd manager exists);
column picker + remembered page size = server-side prefs later (bead agentflow-vcsjs); no chip bar; Team queue to My hand-offs (B).

**Resume:** say "resume My hand-offs". Order: finish #738, merge+promote BE; finish #576, merge+promote FE; v5 BE PR;
v5 FE (local preview for Bao before push); staging. Dev servers are all stopped.

### 24/10 resume — #738 rebased
- #738 rebased on master and renumbered to **D332 / V287** (D328–D331, V284–V286 are held by open PRs p2-* and moso-record-flag). Pushed b2775c1a. Unit build green locally; ITs failed only because Docker was not running after the reboot (Testcontainers) — CI runs them. Next: CI green, merge, promote BE, then merge #576 (CI green, CLEAN) and promote FE.
- v5 BE worktree recruit-be-worktrees/handoffs-v5 has 15 UNCOMMITTED files (agent never pushed) — commit them before anything else touches that worktree.

### 24/10 — #738 and #576 ON STAGING
- recruit-be #738 merged b3a4c7b6 (D332, V289) and promoted; recruit-fe #576 merged 6d664c84 and promoted.
- Staging smoke as Manager: /today shows 7 Review rows with Qualified buttons, no "Showing N of M"; /exceptions has no
  Pending approval card; /pipeline Status reads "Active, Nurture"; /today-old 404; no page errors.
- Next: #746 (v5 BE, D334, V288) review fixes in progress (REPORT_TEAM-only gate + hiddenOwnerIds, assign flag vs
  meetingReached, perf numbers prod 833 TEAM rows / 226 SIGNED); then v5 FE.

### 24/10 evening — v5 FE #578 ON STAGING (session a2033d60, took over from c12550de)
- recruit-fe #578 merged 53e5cc22 (squash of 7 commits incl. review fixes b9f8dc8f) and promoted; Deploy staging (GKE) success.
- Review fixes: /work -> /invites redirect (next.config.mjs), placeholder rows only while paging the same scope, list re-read on Mark done / Send again error, seen-marking only on Mine, time-bomb fixture in handoffView.test.ts (at(23) passed on 23/10).
- Staging smoke (saved sessions): Manager sees Mine | Team | Needs owner (Needs owner 791 rows, Assign / Fix details buttons), OB sees no tabs and no Team queue, /work redirects to /invites for both, no page errors.
- Bao 24/10: staging first; PRODUCTION BLOCKED on bead agentflow-tylw9 (P1): show the 1-1 MOSO dead-letter reason + fix path (BE row field + FE copy), plus useHandoffActions hook test and the welcome-email-blocked banner decision.
- Production order when Bao says go: recruit-be first (#738 #746 + rest on staging), then recruit-fe.

### 24→25/10 night — agentflow-tylw9 (MOSO dead-letter reason) ON STAGING (session a2033d60, away window: staging only)
- recruit-be **#748** merged cf0f55dc (D336) and promoted; staging deploy success. GET /offers/mine rows carry
  `onboarding_sync_failure {reason_code, missing_fields, actor_name, lo_type}` for the 1-1 audience (CHECKLIST_ITEM_MANAGE,
  live stage, specialist or REPORT_TEAM) when the newest ONBOARDING_MEETING write-back is DEAD_LETTER; actor_name only for
  MOSO_ACTOR_LACKS_RECRUITING (never the e-mail); POST .../onboarding-meeting/resend now 409s for
  MOSO_HIRE_CLASSIFICATION_IGNORED and can_resend_1on1_sync is false for it; newest row = created_date DESC NULLS LAST, id DESC.
  Review caught an NPE (Map.of().get(null) for a nameless LACKS_RECRUITING row) — fixed with a RED-first unit test.
- recruit-fe **#580** merged 05c3f928 and promoted (rebuilt on #582, which owns returnPathOf + candidateProfileRoute fix target).
  Row: short red line ("Not sent to MOSO", or "MOSO ignored the W-2/1099 choice" for IGNORED) + info icon; tooltip and
  accessible description give the /work reason. Fix profile -> /candidates/<id> Profile > Licensing in edit mode (no modal,
  Bao 24/10), Back to the list. Helpers in src/shared/components/Onboarding/syncFailure.ts. useHandoffActions hook test added.
- recruit-fe **#584** merged 86169b67 and promoted (CSS): the IGNORED line overflowed into Waiting on (found in the staging
  smoke); wraps inside the column now, 14px icon with overflow visible so its ::after touch area works (Mantine's Button is
  overflow: hidden). Measured on staging: overflowing lines 1 -> 0; tap 4-5px outside the icon hits it on 3 of 4 sides.
- Final staging smoke on the real build (86169b67 FE / cf0f55dc BE), Manager + OB, 1440 and 390: field present, short line +
  tooltip, no overflow, Fix profile -> Licensing editing, Back -> /invites, no page errors, no horizontal page scroll.
- Staging smoke (saved sessions, sample failures injected in the browser only — staging has no dead-lettered 1-1): Manager and
  OB see the field, tooltip text, Fix profile lands on Licensing editing, Back returns to /invites, no page errors.
- Still open (non-blocking): Agreement.welcome_blocked* keys unused (welcome-email-blocked banner not rebuilt — Bao to decide);
  Fix profile not gated by CANDIDATE_UPDATE (same as Fix details); resend's JPA nullsLast may be ignored (created_date is
  auditing-populated).
- PRODUCTION: nothing. Order when Bao says go: recruit-be (#738 #746 #748 + rest on staging) then recruit-fe (#576 #578 #580 #584 + rest).

## CLOSE-OUT 27/10 (measured, session closed)
- Merged and on origin/staging (cd-staging green, be 208eee13 / fe 379e9054): recruit-be #708 #710 #711 #712 #713 #719 #731 #738 #746 #748; recruit-fe #559 #563 #564 #566 #571 #576 #578 #580 #584. NONE on origin/production.
- No unpushed or uncommitted code; the 9 worktrees of this work were removed (all branches merged).
- Open beads: agentflow-cbuks (promote to production, waits for Bao, BE first); agentflow-7yebt (requester cannot Mark done the setup call on the profile card; Today works); agentflow-vcsjs (column picker + page size, server-side); agentflow-edqao (approvals "My team" once there is a 2nd Manager). agentflow-10v0e closed.
- Undecided, non-blocking: welcome-email-blocked banner (Agreement.welcome_blocked* unused); Fix profile not gated by CANDIDATE_UPDATE.

## RE-AUDIT 30/10 (measured)
- All 19 PRs (be #708–#748 above, fe #559–#584 above) are on origin/production. agentflow-cbuks closed.
- agentflow-7yebt closed: fixed by recruit-fe #600 (card gate = can_tick), on production.
- Still open, deferred only: agentflow-vcsjs, agentflow-edqao. Undecided: welcome-blocked banner, Fix profile vs CANDIDATE_UPDATE.

## NIGHT 30→31/10 — welcome-blocked line (agentflow-yw9i7, D348) — STAGING, not prod
Bao 31/10 picked 1B (rebuild the /work "welcome e-mail not sent" banner as a My hand-offs row line) and 2A (Fix profile stays ungated).
- recruit-be #778 (ef520af7, D348): `GET /offers/mine` rows gain `welcome_email_blocked {status, reason, actor_name, blocked_at, send_status}`. Rule = OnboardingActionNeededSelector (newest ONBOARDING_MEETING block inside `onboarding.welcome_block_queue_days`, cleared by a later SENT AGREEMENT_SEND, never for signed/archived/blocked/merged) + one red line at a time (yields to a shown D336 sync failure, waits while the newest 1-1 write is PENDING). 2 reviewers x2 rounds, ITs 24/24 + negative controls. D347 was taken by open #775 -> renumbered D348.
- recruit-fe #632 (79a0c5e4): `WelcomeBlockedLine` under Status + the old "E-mail the signing link…" button (AGREEMENT_SEND, one read per click, same AgreementConfirmModal); sending line refreshes the list every 10 s. #635 (5091fc3e) = label line-height follow-up, ON STAGING.
- Staging: be ef520af7 deployed; fe 57a539db deployed (includes #632 + another session's #633). API verified: real `/offers/mine` carries the key (Manager + onb-test).
- Screenshots (SIMULATED block injected browser-side, real deployed UI): scratchpad wbshots/sim-*.png, 1440/390 table/cards, line + button stay inside the cell.
- NOT DONE: the real staging seed. gcloud auth expired (needs `gcloud auth login`). Seed = UPDATE packs_writeback_outbox SET welcome_email_status='unsignable_actor_no_branch', welcome_email_reason='NullPointerException' WHERE id='19faf534-bc46-4758-b81f-44203883ba9f' (QA Claudeadvisor, specialist onb-test). Undo = set both NULL.
- Measured 31/10: prod has 0 blocks and 0 1-1 write-backs (switch off), so prod cannot show the line yet.

## AUDIT 31/10 midday — welcome-blocked line verified with REAL staging data

- gcloud login done. Seed on STAGING: packs_writeback_outbox 19faf534 (LO "QA Claudeadvisor", specialist onb-test) now has welcome_email_status=unsignable_actor_no_branch. Undo: `UPDATE packs_writeback_outbox SET welcome_email_status=NULL, welcome_email_reason=NULL WHERE id='19faf534-bc46-4758-b81f-44203883ba9f';`
- Real /offers/mine (Manager + onb-test) returns welcome_email_blocked for that row; UI shows the red line + "E-mail the signing link…" at 1440/390, table/cards, inside the Status cell, no page overflow (no browser injection).
- Finding: actor_name is null because ActorDisplayNameResolverImpl drops central UUID user ids → line uses the nameless sentence. Follow-up bead agentflow-6wr0y.
- Measured: be #778, fe #632, #635 on origin/staging, NOT on origin/production. All 19 earlier PRs are on production.
- Prod pusher (session a8ef2df9) asked 31/10: answered GO technically (no flag, no data step, inert on prod: 0 blocks); final call is Bao's.
- Open: Bao reviews 2 new vi strings; yw9i7 stays in progress until prod; worktrees recruit-{be,fe}-worktrees/welcome-blocked are clean, remove after prod.
