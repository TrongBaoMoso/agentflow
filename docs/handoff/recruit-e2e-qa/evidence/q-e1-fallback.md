# Q-E1 re-registration + Q2 hand-off fell back to e-mail (staging, read-only, 07/10)

Sources: recruit-be origin/master ee647d7f, recruit-fe origin/master c7108338, packs origin/master.
Live GETs as bao.trinh+manager (and bao.trinh+onb-test for that account's bell). Times are UTC (VN = +7).

## Q1 — E1: same email registered again as "QA AnewNEW"

### (a) Same candidate: yes
- packs `RegisterInterestedLoanOfficer.execute` (loan/.../op/recruiting/RegisterInterestedLoanOfficer.java:36-44) finds the latest `interested` LORecruiting with the same e-mail and **re-uses its key** (`input.set(key, latestOfficer.key())`). It protects only the legal names, the first-touch attribution and the meeting classification. first/last name are overwritten. It also stamps `last_registration_at = now` (line 192).
- recruit: a Pipeline search for `lastName like "Anew"` finds exactly ONE row for bao.trinh+a1006: `c0574efb` (created 06/10 07:21:12Z, S0 -> S1 CLAIM by d82c234d at 07:22 -> S5 "Invite sent" at 07:27). There is no duplicate.
- Evidence of the old name: the onboarding-specialist bell `ONBOARDING_ASSIGNED` on c0574efb at 07:27:58Z still carries the payload `candidate_name: "QA AneW"`. Today the candidate reads `first_name QA / last_name AnewNEW`.
- MosoRowUpsertServiceImpl.update -> copyMappedFields (lines 781-784): first_name/last_name follow "fill, never empty". MOSO overwrites unless the field is in `recruiter_locked_fields`, and that list is `[]` for this candidate. Only pipeline state (stage, status, archive reason, owner) is frozen by `hasNewSystemProgress`.
- Side effect worth flagging: `legal_first/last_name` = "QA"/"AnewNEW", source **PREFILL**, status UNCONFIRMED. `applyLegalName -> LegalNameFields.refreshPrefillIfNeeded` (lines 586-590) re-derived the legal name from the new first/last name. So the S5 loan officer's agreement name changed silently.

### (b) What recruit does on a re-registration
- **Detected and stamped, but only as data.** `update()` lines 276-301: `raisedAgain = handRaise && (carriesNewEventLabel || carriesNewerRegistration)`. MosoRowMapper.java:447-483 compares `last_registration_at` with the stored baseline. On staging: `legacy_ref.last_registration_at = "Tue Oct 06 09:41:27 PDT 2026"` (16:41:27Z), `last_hand_raised_at = 2026-10-06T16:42:28Z`, `last_hand_raise_source = WEB_FORM`. So the re-raise WAS recorded.
- **Nobody is told.**
  - Hot leads only list unowned candidates (`InboxServiceImpl` line 199 `.and(CandidateSlices.unowned())`). Q50(a)/V045 re-raises reach HOT only for unowned stock, and this candidate is owned by Manh Admin.
  - Today has no hand-raise reason. The resurface reasons are only `PARTIAL`/`STALLED` (WaitingOnLoPolicy).
  - The bell has no kind for this. NotificationKind has no hand-raise or re-registration kind.
  - The only UI trace is SourceChip/sourceChipView.ts:57, which shows the `last_hand_raised_at` date.
- **Timeline.** The only entry is `SYSTEM "MOSO re-sent this record"` at 16:42:28Z. It is word-for-word the same line written for every MOSO save (this candidate also got one at 07:31 and 13:05). `recordMosoResave` (lines 491-523) says this on purpose: "does NOT say the candidate raised their hand again". That javadoc was written before the `last_registration_at` clock existed. Now there IS evidence of a real event, but the activity text never uses `raisedAgain`. The name change does not appear in the timeline either.
- **Stage history.** Unchanged: MOSO_IMPORT -> CLAIM -> Invite sent. Correct, because the row is protected.
- Decisions: D73 says a repeat save is not a raise. Q50 (chosen (a), Bao 28-30/08) adds the stamp on a NEW event and the 3-day window, with `hot.hand_raise_stages` = S0-S5, but **only for HOT stock**. No decision covers "an OWNED lead raised their hand again", and none covers a name change on re-registration.

### Verdict
The stamping and the single candidate are by design. The fact that the owner and the onboarding specialist get no signal is a **gap**: the re-raise is detected (`raisedAgain`) and then thrown away for owned rows. The silent PREFILL legal-name change at S5 is a second gap, and a riskier one.

### Proposal
1. In `update()`, when `raisedAgain`:
   - write a SYSTEM activity `Registered again on <occurred_at> via <channel>` (no actor, so it does not freeze the row) in place of the generic re-save line;
   - append `name changed from "QA AneW" to "QA AnewNEW"` when first/last name changed. Diff `existing` before and after `copyMappedFields`, the same way as CandidateProfileDiff.
2. Add a new bell kind `LEAD_RAISED_AGAIN` to the owner and, when `onboarding_specialist_id` is set, to the specialist. Dedupe per candidate and `last_registration_at`.
3. Today: add a resurface reason `RAISED_AGAIN` for owned rows whose `last_hand_raised_at` is within `hot.hand_raise_window_days`, with the chip "Signed up again". HOT stays unowned-only.
4. Legal name: from S5 on (an offer was sent), do not re-derive the PREFILL legal name from a new first/last name. Alternatively, set `legal_name_moso_differs` and require the recruiter to confirm. Never create a duplicate candidate (packs already re-uses the key).

Needs a D-number and Bao's go-ahead, because it is a product rule change on top of D73/Q50.

## Q2 — "QA AnewP / QA AnewO got the invite by email because the specialist couldn't be assigned"

| candidate | id | offer SENT | INVITE writeback |
|---|---|---|---|
| QA AnewO (a1007) | b5beb0d0-410a-4514-a9a8-1243143c0c29 | 07:33:42Z | SENT, **attempts 2**, delivered 07:40:03Z (14:40 VN) |
| QA AnewP (a1008) | 58e628d4-4f2f-4119-816f-e9d8faa6f53f | 07:45:59Z | SENT, **attempts 2**, delivered 07:55:02Z (14:55 VN) |

- The bell text is `INVITE_HANDOFF_WITHDRAWN` with reason `FELL_BACK_TO_EMAIL`. Its only producer is `PacksWritebackTickServiceImpl.handleInviteSpecialistRejection` (lines 1113-1158). It fires when packs refuses the INVITE with "is not an active onboarding specialist" (`SPECIALIST_REJECTED_MARKER`, line 1079). recruit then clears `onboarding_specialist_id` and retries without a specialist, which means legacy e-mail. That is exactly the 2-attempt pattern above.
- packs `RecruitAPI.onboardingSpecialistToWrite` (RecruitAPI.java:2638-2651) refuses when `resolveActorAdmin(email)` is null or the Admin is not `is_onboarding_specialist`.
- recruit picks the specialist with least-open-queue round robin over **recruit RBAC grants with role ONBOARDING** (OnboardingSpecialistAssignmentServiceImpl). By design it does **not** check MOSO's flag; see the javadoc: "A candidate this mis-picks for is refused by packs' own 400". `GET /onboarding/specialists` returns 3 eligible people:
  - 3e228b0a = bao.trinh@loanfactory.com
  - 5867c107 = bao.trinh+onb-test@viet18.com
  - d26eb34a = bao.trinh+onb-test@loanfactory.com
- Which one was refused:
  - d26eb34a and 5867c107 are positive controls. c0574efb (d26eb34a, 07:27Z) and QA AnewM (5867c107, 01/10) were each delivered on the first attempt, and MOSO echoed the specialist.
  - d26eb34a's bell has nothing for AnewO or AnewP, so it was not their pick.
  - Every write made AS bao.trinh@loanfactory.com is refused by MOSO staging with 401 "unknown or inactive acting user":
    - ONBOARDING_SPECIALIST on AnewO, AnewP and QA Anewe (73fd9c9c), DEAD_LETTER x8;
    - ONBOARDING_MEETING on QA AnewM.
  - Both candidates now carry 3e228b0a again. It was re-picked about 08:04Z, and that write also dead-lettered with the same 401.
  - => The refused specialist was almost certainly **3e228b0a = bao.trinh@loanfactory.com, which is not an active MOSO Admin / onboarding specialist on staging.** This is an inference by elimination. The withdrawn bell's `payload.specialist_id` would prove it, but the owner's (Manh Admin) bell is not readable with the test accounts.

### Verdict
The code behaved as designed: it fell back, rang the owner, and the LO still got the invite. The cause is a **staging data/config problem**: the recruit ONBOARDING role is granted to an account that MOSO staging does not know as an onboarding specialist. It is also a **design weakness**: the round robin can keep picking someone MOSO will always refuse, so about 1 in 3 hand-offs falls back to e-mail and every later action by that person dead-letters with 401.

### Proposal
1. Staging: either make bao.trinh@loanfactory.com an active MOSO Admin with `is_onboarding_specialist=true` in the staging namespace, or remove ONBOARDING from his recruit grant. This is a staging write that needs Bao's go-ahead. Then re-hand-off AnewO and AnewP, or leave them, since the e-mail already went out.
2. Code: validate eligibility against MOSO before picking. For example, `eligibleSpecialists()` drops grants that packs refused recently (cache the "not an active onboarding specialist" or 401 result per e-mail), or `/onboarding/specialists` asks packs for its specialist list. That way the round robin never picks a dead account and the picker/Change specialist hides it. Also log the refused e-mail in the INVITE row's `last_error` (it is currently overwritten by the successful retry) so the cause stays visible in sync-trace.
