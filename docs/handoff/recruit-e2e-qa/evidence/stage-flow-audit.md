# Stage flow audit (S0..S7), and whether S0 should exist

Read-only. Code: recruit-be `origin/master` 302dc25c (#577 already merged), recruit-fe `origin/master` c8946c61, both fetched 07/10.
Paths: BE = `src/main/java/com/loanfactory/recruit/...`, FE = `src/...`. Data: SELECT only, in a READ ONLY transaction, run from the existing recruit-be pod in each cluster. A temp class file was put in the pod's `/tmp` and deleted afterwards. No new pod was created, nothing was written to the DB, and no secret was printed.

Open PRs:
- **#578** (BE): fee "paid" is accepted only on a SENT/SIGNED offer. This narrows the S6 trigger and does not change the stage rules.
- **#583** (BE) and **#398** (FE): an S5+ re-registration holds the incoming name, and a re-registered owned lead notifies its owner and specialist (D227). These read `stage >= S5` but move no stage.
- **#396** (FE): Send info. No stage effect.

## 0. Where the current description is wrong

1. **Nothing in recruit moves a candidate to S2, S3 or S4 on its own.**
   - The only automatic writers of S2/S3 are the MOSO RLO mapping (`moso/MosoRowMapper.java:682-683`).
   - Nothing writes S4 at all.
   - Otherwise these stages come only from a person dragging a card on the Pipeline board, or using the row's "Move to stage" menu (`FE pipeline/_hooks/usePipelineBoardMove.ts:80` -> `POST /candidates/{id}/transition`, `CandidateServiceImpl.java:965-1001`).
   - Call outcomes change **status** and never stage (`FollowUpServiceImpl.java:493,565,711,937`).
   - Measured: **0** person-made stage_history rows into S2/S3/S4 on staging and on production. Only 1-2 MOSO rows were born at S2.
2. **"Unowned" does not mean S0.** Each of these leaves an owner-less lead at its current stage:
   - release (`CandidateServiceImpl.java:663`)
   - idle release (`hotidlerelease/HotIdleReleaser.java:65`, rejected rollback R12c `DECISIONS.md:1319`)
   - program release (`headhunter/program/ProgramLeadRelease.java:74`)
   - MOSO ILO import, which lands owner-less at S5/S6/S7

   Measured unowned rows past S0: staging 1,836, production 819 of 905.
3. **There is no REQUESTED offer status.**
   - Offer statuses: DRAFT / PENDING_APPROVAL / APPROVED / SENT / SIGNED / DECLINED / EXPIRED (`offer/model/OfferStatus.java`).
   - PAID / WAIVED / PENDING are `fee_status`. NOT_SENT / SENT / SIGNED are `agreement_status`. REQUESTED is only an `offer_history` event.
   - Since D124, approving sends the offer in the same step (`OfferServiceImpl.java:336`).
4. **No code sets S7 automatically from HR events.**
   - D172's auto-S7 is not built. S7 is written only by the MOSO "joined" mapping (`MosoRowMapper.java:739`) or by a person's move.
   - A person's move to S7 passes the licensing gate and the mandatory-checklist gate (`CandidateServiceImpl.java:1298,1339`).
5. **Production does not use recruit's ownership yet.** It has 0 owned candidates, 0 owner-ledger rows and 0 person-made stage moves. Every stage there is MOSO's mapping.

## 1. Per stage: how a candidate enters and leaves

The "who" column uses these actor names: PERSON, SYSTEM, MOSO, MODEX.

| Stage | Enters via (who, code) | Leaves via | Where it is shown |
|---|---|---|---|
| **S0** | <ul><li>Manual Add lead with no owner: PERSON, `CandidateServiceImpl.java:210`, history row CREATED.</li><li>Fresh MOSO hand-raise (new key, or an unworked known key): MOSO, `MosoRowMapper.java:201-220`, fresh test at `:515`.</li><li>MOSO RLO `not_touched` and every archived flavour: MOSO, `MosoRowMapper.java:685`. Also archived/wrong_info/block_display -> ARCHIVED (`:692-698`).</li><li>Modex native create (flag-gated, no history row): MODEX, `modex/service/impl/ModexSyncServiceImpl.java:47`.</li><li>A MOSO re-push demoting an unprotected row, for example S5->S0 (`MosoRowUpsertServiceImpl.java:759`). Staging: 329 rows on 31/08. Prod: 9.</li></ul> | <ul><li>To S1, only when it had no owner and the stage is S0:<ul><li>claim: PERSON, `:349`</li><li>auto-claim on a logged contact (D43): PERSON, `ActivityServiceImpl.java:306` -> `:378`</li><li>batch claim: PERSON, `:431-443`</li><li>transfer: PERSON, `:558`</li><li>headhunter origin-own (D196): SYSTEM, `:402-406`, gated `HeadhunterAutoOwner.java:239`</li></ul></li><li>MOSO push maps the row to S5/S6/S7 (unworked row). Prod: S0->S5 239 rows, S0->S6 8, median 0 days, mostly `invited_to_join` / `denied_by_LO`.</li><li>Board: an S0 card can't be dragged (`FE PipelineBoard/index.tsx:82,109`).</li></ul> | <ul><li>HOT stock arm: S0 + ACTIVE + source in `hot.sources` (`InboxServiceImpl.java:186-189`).</li><li>HOT raised arm: S0-S5 within 3 days.</li><li>Cold list query `stage eq "S0"`, owner null, ACTIVE (`FE apis/recruit/candidates.api.ts:177`).</li><li>Today "stock" KPI (`TodayClient/index.tsx:550`).</li><li>Board S0 column, read-only.</li><li>Drawer chip "Unclaimed" (`CandidateHero.tsx:140`). The stepper lights nothing.</li><li>Referrer view "In stock" (`StageLabels.java:17`).</li></ul> |
| **S1** | <ul><li>All the S0->S1 bumps above.</li><li>Add lead with an owner (`:210`).</li><li>MOSO `claimed_profile` raises the stage to at least S1 (`MosoRowMapper.java:708-712`).</li><li>Board drag (PERSON). A downgrade is allowed.</li></ul> | <ul><li>Drag.</li><li>Offer SENT -> S5 automatically.</li><li>MOSO re-map of an unprotected row.</li></ul> | Today (owned S1-S5, `DashboardServiceImpl.java:66,169`), board, stepper step 1, cadence. |
| **S2 / S3** | <ul><li>MOSO RLO `in_progress`/`message_sent` -> S2; `dialogue`/`interested_but_thinking` -> S3 (`MosoRowMapper.java:682-683`).</li><li>Board drag.</li></ul> | Drag; offer SENT -> S5. | Today, board, stepper, cadence (`cadence.enabled_stages` = S1, S2, S3, S5, both envs). |
| **S4** | Board drag only. Not in cadence (D56). | Drag; offer SENT -> S5. | Today, board. |
| **S5** | <ul><li>Offer SENT: SYSTEM, credited to the requester (`OfferServiceImpl.java:588,614` -> `CandidateServiceImpl.java:1071`, D167). Needs status ACTIVE, not merged, no person downgrade (D173 veto) and the required fields filled.</li><li>MOSO ILO import: tree lines 2, 3, 6-9, plus `invited_to_join`/`want_to_join` (`MosoRowMapper.java:684,743-794`). DORMANT for hiatus/no_response (`:790`).</li><li>Drag.</li><li>Auto-stage backfill (`AutoStageBackfillServiceImpl.java:116`). It scans S0-S5, but only rows that `hasNewSystemProgress`.</li></ul> | <ul><li>Signed + fee PAID/WAIVED -> S6 (`:1073`).</li><li>Drag.</li><li>MOSO re-map.</li></ul> | Today hides S5 rows that wait on the LO (D187, `DashboardServiceImpl.java:115`). My invites stage, board, stepper. |
| **S6** | <ul><li>Offer SIGNED and fee PAID/WAIVED, from `markSigned` / `markFeePaid` / `waiveFee` (`OfferServiceImpl.java:630,647,663`), or a MOSO reconcile on a worked row (`MosoRowUpsertServiceImpl.java:336`).</li><li>A drag is gated by `assertJoinedGate` (`CandidateServiceImpl.java:1366-1373`).</li><li>MOSO ILO lines 4-5 (`MosoRowMapper.java:756,762`).</li></ul> | <ul><li>Drag to S7 (gates D172/Q12).</li><li>MOSO joined -> S7.</li><li>MOSO demotes S6->S5 (prod: 14).</li></ul> | Onboarding Today (`OnboardingTodayReader.java:53`), checklists, Send to HR (`HrHandoffReadinessService.java:105`). Specialist notified (`OnboardingNotices.java:103`). |
| **S7** | MOSO `joined` (`MosoRowMapper.java:739`); drag with gates. | MOSO S7->S5 (prod: 16). | KPI and referral "joined" (`KpiTrendServiceImpl.java:135`). |

**Status vs stage.** The two move independently.
- ARCHIVED: archive (`CandidateServiceImpl.java:831`) or MOSO. It is excluded from the queues.
- NURTURE: call outcome "not now" (`FollowUpServiceImpl.java:711`). NURTURE skips the auto-stage move until the candidate is woken (the facade re-triggers it at `CandidateFacadeImpl.java:370`).
- DORMANT: only from MOSO hiatus/no_response. It leaves only through revive (`CandidateServiceImpl.java:947`, which re-triggers the auto-stage move at `CandidateFacadeImpl.java:434`).
- BLOCKED: nothing ever writes it.

**Offer lifecycle and the candidate's stage.**

| Offer state | Candidate stage |
|---|---|
| PENDING_APPROVAL / APPROVED | Stays where it is. A request has no stage gate: it needs only a MOSO link and status not ARCHIVED/DORMANT (`OfferServiceImpl.java:121-145`). |
| SENT (approve = send) | S5 automatically. |
| Onboarding v2 hand-off (D207, flag off everywhere): SENT and the 1-1 not done | Still S5 (`InviteStage.INVITED_1ON1_PENDING`). Marking the 1-1 Done changes only the derived invite stage to PAYING_SIGNING (`MyInvitesStore.java:115`). No stage move. |
| The LO signs and pays (or the fee is WAIVED) | S6. |
| DECLINED / EXPIRED | No move back. The candidate stays at S5. |

Staging anomaly: 321 candidates are at **S0 while holding a SENT offer** (IMPORT; demoted S5->S0 by a MOSO re-map on 31/08). A MOSO re-map rewrites the stage of an unworked row and leaves its offer untouched.

## 2. Everything that relies on S0, and what S0-removal would need

| Place | Relies on | If S0 is removed (stage NULL / "unclaimed" = owner IS NULL) |
|---|---|---|
| `V001__init.sql:44` `stage NOT NULL`, enum `CandidateStage.java:5`, FE type `shared/types/recruit.ts:11,13`, `utils/referrals.ts:12` | S0 is a stage value | Migration to nullable. Every `.ordinal()` call becomes a null risk: `CandidateServiceImpl` 489, 1085, 1154; `MosoRowMapper:710`; `ReferralAssembler:127`; `OnboardingNotices:103`; `autoAdvanceTo:1218`. |
| Create / claim / claimIfUnowned / originOwn / batch / transfer: S0->S1 bump (`CandidateServiceImpl` 210, 349, 378, 402, 431-443, 558) | The bump records "entered the pipeline" | Becomes NULL->S1. `stage_history.from_stage IS NULL` already means "born" (`V001:89`). That is ambiguous, so a separate reason or the owner ledger would be needed. |
| Hot stock arm `inStages(S0)` (`InboxServiceImpl.java:189`); `HotLeadRules.java:78-80`; `hot.hand_raise_stages` includes "S0" (V045:65, live in both envs) | Stock = S0 | Replace with `unowned` + "never worked". This also fixes the gap where released S1 leads drop out of the stock arm. |
| Cold list `stage eq "S0"` (FE `candidates.api.ts:177`) | Same | Replace with `ownerId eq null`. It currently hides 1,836 (staging) / 819 (prod) unowned rows past S0. |
| Batch claim pool (`BatchClaimServiceImpl.java:66-80`) | Already keyed on owner IS NULL, any stage | No change. This shows the code already disagrees with itself. |
| PeerHandoff "unclaimed" = S0 (FE `PeerHandoffDialog.tsx:108`) | S0 used as the ownership signal | Use owner IS NULL. |
| Board S0 column and no-drag rule (FE `PipelineBoard/index.tsx:36-38,82,109`, `BoardStageColumn.tsx:106,113`, `CandidateRowMenu.tsx:65-70`); stepper (`stageStepperModel.ts:4,42`); hero chip (`CandidateHero.tsx:140`); `stageProgress.ts:4`; Today KPI (`TodayClient:550`, `TodayHandout.tsx:15`); i18n `today.json stage_S0` | UI | Drop the column, or show "Not started"; KPI = unowned count. |
| MOSO: `not_touched` + archived flavours -> S0 (`MosoRowMapper.java:685`); fresh hand-raise -> S0 (`:216`); owned-row guard (`MosoRowUpsertServiceImpl.java:259-267`); `scripts/migration-reconcile.py:43-52` | The import needs a stage value | Map to NULL; update the reconcile script. |
| Modex create (`ModexSyncServiceImpl.java:47`) | Same | NULL. |
| `HeadhunterAutoOwner.worked()` S0/S1 (`:239`); `ProgramLeadRelease.early()` S0/S1 (`:129`) | "Not worked" = S0 or S1 | Use NULL or S1. |
| `AutoStageBackfillServiceImpl.java:116` stage list | Includes S0 | Add `stage IS NULL`. |
| Template `tpl-call-s0` "Cold intro" (`V012:37`); FE picks a template by stage (`shared/utils/callScript.ts:14-15`) | Script for S0 | Key it on NULL; the existing NULL fallback row would change meaning. |
| Cadence and Today exclude S0 (D56; `DashboardServiceImpl.java:66`; `ReportServiceImpl.java:36`) | Already excluded | No change. |
| Reports `stageMoves` counts person CLAIM S0->S1 rows (`ReportServiceImpl.java:213-229`); stage_history S0 rows (staging: 5,164 born-S0, 199 CLAIM; prod: 324 born-S0) | History | Historical rows stay. New rows would be NULL->S1. |
| Referrer label "In stock", touched = stage >= S1 (`StageLabels.java:17`, `ReferralAssembler.java:127`) | Same | NULL -> "Not started". |

## 3. Measurements (07/10, read-only SELECT)

**Candidates by stage x owner x status (not merged)**

| Stage | Staging | Production |
|---|---|---|
| S0 | unowned 5,273 ACTIVE, 10 ARCHIVED | unowned 57 ACTIVE, 29 ARCHIVED |
| S1 | owned 166 ACTIVE, 11 ARCHIVED, 2 NURTURE | none |
| S2 | unowned 2 | unowned 1 |
| S5 | owned 23 ACTIVE, 1 ARCHIVED; unowned 56 ACTIVE, 1,223 ARCHIVED, 43 NURTURE | unowned 314 ACTIVE, 172 ARCHIVED, 190 DORMANT, 10 NURTURE |
| S6 | owned 9; unowned 333 | unowned 69 |
| S7 | unowned 179 | unowned 63 |

- Owned rows at S0: 0 in both environments.
- Owner ledger: staging has CLAIM 203, TRANSFER 99, CREATE 5, ORIGIN_OWN 2, AUTO_CLAIM 2 (no RELEASE rows yet). Production has **none**.
- `hot.idle_release_enabled` is false in both.

**stage_history**
- Person-made rows into S2/S3/S4: **0** on staging and 0 on production.
- Staging person rows overall: 199 CLAIM S0->S1, 10 CREATED S0, 5 CREATED S1, 4 S5->S6, 3 S1->S5, 1 S6->S5.
- Production: every row is SYSTEM/MOSO_IMPORT.

**Data available before the first person outbound contact (D10)**
- Staging: 14 candidates have `loans_since_anchor`. 11 were never contacted and 3 were dated before the first outbound contact. `self_reported_closed_loans`: 63, of which 46 were never contacted and 17 were imported before the first contact. Only 56 candidates were ever contacted.
- Production: 0 have `loans_since_anchor`, 5 have a self-reported value (never contacted), and 0 candidates were ever contacted.

**Composition of S0 by legacy status**
- Staging: 2,691 not_touched, 2,258 none, 324 interested; 321 of these hold SENT offers.
- Production: 38 not_touched, 13 interested, 29 archived flavours, 6 none.

## 4. Is S0 needed? Options

The cases that look like they need S0:

| Case | Does it need S0? |
|---|---|
| Re-registration of an unowned, unworked lead | No. MOSO re-maps it to S0 today (`MosoRowUpsertServiceImpl` update -> `mapHandRaise`). With NULL it would re-map to NULL. |
| Re-registration of a released or worked lead | No. Its stage is kept, it returns to HOT through the raised arm (3-day window, Q50), and D227 handles the owned case. |
| Headhunter-program lead before auto-own | Momentary. It is owned and moved to S1 after commit. |
| MOSO `not_touched` and archived flavours | The column is NOT NULL, so some value is needed. That is a data-shape need, not a product need. |
| Modex-created lead | Same as above. |
| Released lead (unclaim, idle, transfer away, program) | Already not S0 today. This is the strongest proof that S0 isn't "unclaimed". |
| Cold list | Should be "owner IS NULL", not S0. |

The product owner is right that no flow needs a *stage* called S0. What the code needs is (i) a non-null value for "never in a pipeline" and (ii) an ownership test, and S0 is being used for both.

**Options**
- **(a) Keep S0 as is.** No work. The queues keep missing unowned leads past S0, and S0 keeps acting as an ownership signal in the FE.
- **(b) Stage NULL until claim.** Matches the product language best. It costs a NOT NULL migration, about 10 `.ordinal()` call sites, the MOSO mapper and reconcile script, the template key, and a `from_stage IS NULL` ambiguity in stage_history. It also doesn't fit production as it runs today: MOSO puts unowned leads straight into S5-S7 without any claim (prod S0->S5 median 0 days), so "no stage until claim" would also need a decision on whether MOSO may still set stages on unowned rows.
- **(c) Recommended: keep the stored value, demote it to "not started", and make "Unclaimed" mean `owner IS NULL` everywhere.**
  1. Change the Cold list, the HOT stock arm and PeerHandoff to use owner IS NULL plus never-worked, instead of S0.
  2. Remove the S0 board column, the S0 chip and the S0 funnel step. Show "Not started" instead.
  3. Today's stock KPI = unowned ACTIVE.
  4. Keep the S0->S1 bump on claim, so Reports still see "entered the pipeline".
  5. Optionally rename the enum later.

  This delivers the product owner's model ("a new LO has no stage until someone takes it") at FE + a few query cost, with no schema migration. It also fixes the real bug: released or MOSO-staged unowned leads are invisible in Cold/HOT. Separately, decide whether MOSO's legacy status may keep moving *unowned* rows S0->S5/S6/S7 and back (prod S7->S5 16, S6->S5 14, and staging's 321 S0 rows holding SENT offers).
