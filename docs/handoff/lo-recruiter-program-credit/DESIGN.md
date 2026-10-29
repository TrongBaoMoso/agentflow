# D340 + D268/D269 build — design (29/10)

Source: code-architect agent, read-only, recruit-be 85f30839 / recruit-fe c72bfec0 / moso-aid 3f9b3a7 / packs dcbc7743. Bead agentflow-k1obs.

## Design: D340.1 role sync, D268/D269.1 program snapshot, D269.2 qualifying recruit

I read recruit-be 85f30839, recruit-fe c72bfec0, moso-aid 3f9b3a7 and packs dcbc7743 after `git fetch`. PR #760 is merged, so D339 and D340 are now on master.

### Findings that shape the design

1. **packs already has an open PR that does the D268/D269.1 snapshot on the MOSO side.** packs #3739 (master) and #3740 (3.64.1) are "LO Recruiter Program credit by member-at-time, every channel". They depend on moso-aid #196, `GET /lo-programs/standing/members`, which is already on moso-aid master (`lo-program-membership.js`, commit 3f9b3a7). That PR stamps `lo_recruiter_program_credit`, `_member`, `_credit_at` and `_unverified` on LORecruiting. The whole bean is pushed to Recruit (`SendLORecruitingToRecruitOp.java:83-88`). packs `ReferralByOwner` also switches `entry_type` to PROGRAM from the marker.
   - Pay is decided in MOSO, so Recruit must not invent a second answer. Recruit should record packs' judgement when the push carries it, and use its own `program_members` mirror only as a fallback.
2. **The packs PR contradicts D340(2) for a dual-role person like Seth.** It says "a staff recruiter (HR flags) who is also an approved member never gets the program marker". D340(2) says the bonus follows the program for everyone, Seth included. See open question 1.
3. **Recruit has no referrer-at-registration record today.**
   - The evidence is `legacy_ref.referrer`, the confirmed FK email (`MosoRowMapper.java:203`, `SourceDetailDecorator.java:177`).
   - The other input is `origin_owner_key`, an Admin keyName (`CandidateEntity.java:1180`).
   - `program_members.admin_key_name` and `company_email` are the matching key spaces (V208 comments).
   - `ReferralAttributionEventEntity` is the referral attribution ledger, not a program record. Its realtime path can't resolve a referrer email to a central id (`MosoRowUpsertServiceImpl.java:1396-1403`).

### 1. D340.1: grant program roles only to recruiter-flagged members

**moso-aid** (ship first, additive):
- `src/services/admin-directory.js:33-49`: `fetchCompanyEmails` already reads `getAdmins`. Extend the same fetch and cache to also keep `is_recruiter || is_out_sourcing_recruiter` per key. Add `getRosterFactsByKey()` and keep `getCompanyEmailsByKey` unchanged. The flag predicate already exists as `holdsRecruiterFlag` (`recruiters.js:62`); export it or reuse it.
- `src/services/lo-program-team.js:~299`: approved members get `is_recruiter: true | false`. It is `null` when the key isn't in the active directory (no information). Non-approved members don't carry it.
- Update `test/services/lo-program-team-contract.test.js` (pins the exact shape) and `lo-program-team.test.js`.

**recruit-be:**
- `Roster.Member` (`Roster.java:50`): add `Boolean recruiterFlag`. Also update `withoutTeamLead()` (`Roster.java:55`, used at `RosterGuard.java:100`) and the parser (`MosoAidRosterClient.java:182`), where the field is optional (absent means null).
- **V297:** `ALTER TABLE program_members ADD COLUMN recruiter_flag boolean` (null means unknown). Extend `ProgramMemberStore` (`COLUMNS` at :58, `Row` at :38, `observe` at :105-120). `reconcileLinked` (`ProgramSyncService.java:403`) and the absent-member fallback (:237) both read the stored row, so the flag must be stored.
- `ProgramSyncService.decide` (:221-246). When `program_sync.require_recruiter_flag` is true:

| Flag | Effect on `desired` roles | Lead release |
|---|---|---|
| TRUE | unchanged (`roleFor`, :238) | none |
| FALSE | `Set.of()` | released like `gone` |
| null/unknown | no new grant; keep what is already provisioned | none |

  - FALSE adds a `roleDenied` field to `Decision`, with `releaseNow = gone || roleDenied` (:239). `applyOne` already releases leads before removing the role (:337-347), so no empty grant is left.
  - Unknown (null) never revokes, so a moso-aid contract skew can't mass-revoke. Cover this in `guardVolume` (:205) as well.
  - Apply the same rule in `reconcileLinked` (:404).
- **DRY_RUN logging.** `report` (:385) gains `would_deny_no_flag=[hash…]` and `flag_unknown=n`. `metrics.change("would_deny_no_recruiter_flag", n)` goes next to :191-194. An unknown flag logs a WARN once per tick, with counts and hashed ids only.
- **Today's state.** There are 0 provisions on prod, so nothing is revoked in practice. The ZERO_APPROVED guard (:171) is unaffected.
- **Setting `program_sync.require_recruiter_flag`**, default false, seeded in V297 with the V296 insert pattern into `recruit_settings`. Turn it on staging first, then prod, before `program_sync.mode=APPLY`. If the tick runs in APPLY with the flag off, log a WARN and emit a metric (no hard block).

### 2. D268/D269.1: program snapshot at registration

**V297 table `candidate_referral_program`:**
- Keys and referrer: `candidate_id` (PK), `referrer_key`, `referrer_basis` (FK_CONFIRMED | ORIGIN_OWNER | NONE).
- Decision: `program` (LO_RECRUITER_PROGRAM | REFERRAL | PENDING), `decision_source` (PACKS_MARKER | RECRUIT_MIRROR | BACKFILL).
- Evidence: `member_moso_key`, `packs_credit_at`, `registered_at`, `decided_at`.
- A trigger rejects any UPDATE of `program` once it is not PENDING. That is D269.1's "never recomputed", enforced by the database.
- **Why a table, not candidate columns:** `CandidateEntity` is already very wide. Merges need a table-level carry, as `DedupServiceImpl.java:264` does for Modex snapshots (survivor keeps its own row, otherwise takes the loser's).

**Writer:** new `referral/program/ReferralProgramRecorder#recordIfAbsent(candidate, row)`, `INSERT … ON CONFLICT DO NOTHING`, called from:
- `MosoRowUpsertServiceImpl` create, right after `recordGenesisAttribution` (:295).
- The update path when the first confirmed referrer arrives late, next to the D265 block (:390-415).
- Both calls are wrapped in try/catch, so the ingest never fails because of this.

**Decision order (pure function `ReferralProgramDecision`):**
1. If the pushed row carries a packs judgement, use it. Credit marker present gives LO_RECRUITER_PROGRAM. `_member` stamp without a marker gives REFERRAL. `_unverified` gives PENDING, resolved on a later push (packs' nightly reconcile).
2. Otherwise use the mirror. Match `lower(admin_key_name)` or `lower(company_email)` to the FK email, falling back to `origin_owner_key`. LO_RECRUITER_PROGRAM requires `status='approved'`, `absent_ticks=0` and `first_approved_seen_at IS NOT NULL`. If there is a referrer and no match, the result is REFERRAL. If there is no referrer, write no row.
3. If packs' marker and Recruit's mirror disagree, increment a metric and keep packs' answer.

The D339 company-form pick arrives as a confirmed FK, so it is covered by step 1 or 2.

**V298 backfill (data only, idempotent):**
- One row per candidate with referral evidence.
- LO_RECRUITER_PROGRAM only if a member row is approved with `first_approved_seen_at <= coalesce(sourced_at, created_date)`; everything else is REFERRAL with `decision_source='BACKFILL'`.
- Prod has 0 approved members, so every row is REFERRAL.

**Setting `referral.program_snapshot_enabled`**, default false (writer and readers).

**Reaching the UI:**
- A batch reader goes beside `JdbcReferralCandidateReader` (:24-63). It feeds `CandidateFacts` and then `ReferralAssembler` (:48,62). With the flag on, `entryType` is derived from the snapshot (`LO_RECRUITER_PROGRAM` becomes `PROGRAM`) with `entryTypeInferred=false`.
- The totals and the filter (`ReferralTotalsCalculator.java:97`, `ReferralFilter.java:23`) follow automatically.
- `AdminReferralItem` and `SourceDetail.Referral` (`SourceDetail.java:34`) get `program`.
- `MyReferralItem` (:32) gets `program` and `qualifying_status`, and `MyReferralItemAllowListTest` is updated.

### 3. D269.2: qualifying recruit (record only, no payout)

**V297 tables:**
- `candidate_program_qualification` holds the current row per candidate.
- `candidate_program_qualification_history` is append-only.
- Columns: `status` (QUALIFYING | BELOW_BAR | UNKNOWN), `loan_count`, `window_start`, `window_end`, `data_source` (MODEX | MOSO | PERSON | MMI_14MO), `verified`, `source_as_of`, `threshold`, `checked_at`, `modex_snapshot_id` (nullable, from `candidate_modex_snapshot`, V263).

**Rule** (`QualifyingRecruitEvaluator`, only for snapshot program = LO_RECRUITER_PROGRAM):
- Verified means `units_12mo_source = MODEX` (`CandidateEntity.java:435-446`, `ModexCandidateMapper.java:80-81`, and the "only verified source" comment in `ProgramInviteReview.java:100-110`).
- MODEX with a count of 12 or more gives QUALIFYING; MODEX with fewer gives BELOW_BAR.
- Any other source (MOSO, PERSON, MMI_14MO) or no figure gives UNKNOWN. The facts are still recorded, with `verified=false`.
- Window end is the Modex export day (`ModexPerformance.exportedOn`); window start is that day minus 12 months.

**Re-evaluation:**
- After the Modex write paths (`ModexCandidateMapper` and the CSV import service).
- Right after the snapshot is recorded.
- A nightly sweep over UNKNOWN rows, following the `ProgramSyncTickCronRegistrar` pattern.
- A history row is written only when status or count changes. Below-bar rows are kept, so a later pay/no-pay decision can be applied to past rows.

**Settings** (V297, dark): `referral.program_qualification_enabled=false`, `…min_loans=12`, `…window_months=12`.

### 4. recruit-fe (minimal)
- `shared/types/referrals.ts:51` and `shared/types/sourceDetail.ts`: add `program`, `qualifying_status`, and on detail the facts.
- New `shared/components/QualifyingChip` (modelled on `ReferralEntryChip`) with strings in `messages/en` and `vi`.
- Admin row (`AdminReferralRow.tsx:50`) shows the program chip and the qualifying chip.
- `LeadSourceCell.tsx` and `utils/sourceDetail.ts:37` (`referralView`) show a program line and loan count and as-of on detail only.
- My referrals shows the status chip only when `referral.program_status_visible_to_referrer` is true (default false), and never the loan count. This keeps the "no production number" rule at `MyReferralItem.java:9`.

### Tests
- **moso-aid:** the roster contract test, plus cases for flag true, false and null.
- **recruit-be unit:**
  - `ProgramSyncRulesTest`: flag matrix and the unknown-never-revokes rule.
  - `MosoAidRosterClientTest`: field present and absent.
  - `ReferralProgramDecisionTest`: packs-marker precedence, mirror, case folding, pre-approval gives REFERRAL, mirror/packs disagreement.
  - `QualifyingRecruitEvaluatorTest`.
- **recruit-be IT:**
  - `ProgramSyncTickIT`: DRY_RUN log and metrics, APPLY deny with lead release, Seth-like flagged LO keeps the role.
  - `ReferralProgramRecorderIT`: write once, late-arriving referrer, trigger blocks UPDATE, merge carry.
  - `ProgramQualificationReevalIT`: UNKNOWN to QUALIFYING after a Modex write.
  - `MyReferralItemAllowListTest` and `SourceDetailWireIT` updates.
- **recruit-fe:** component and `referralView` tests.

### Rollout
1. moso-aid (roster flag).
2. recruit-be with all flags off: V297 and V298 migrations.
3. Turn on `require_recruiter_flag` on staging, read the DRY_RUN log, then prod, then `program_sync.mode=APPLY`.
4. After packs #3739/#3740 are deployed, turn on the snapshot and the qualification flags.
5. recruit-fe last.

Migration numbers: V296 is on master and V295 belongs to open PR #741. I used V297 and V298; re-check before pushing.

### Open questions
1. **Seth and the packs marker.** packs' "dual role never gets the marker" conflicts with D340(2). Does Bao want packs changed, or should Recruit's mirror override packs for a flagged recruiter who is also an approved member?
2. **UNKNOWN versus a low self-reported count.** I treat a non-Modex figure as UNKNOWN, even when it is below 12. Is that what Bao wants?
3. **Showing BELOW_BAR to the referrer.** Is that acceptable in My referrals (flag default off)?