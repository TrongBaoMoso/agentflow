# recruit-be #625 (D251), second review (rev-be625-b)

Head reviewed: a0c7aae0 (merge-base 75ace547 = origin/master). Read-only: I used a throwaway worktree, which I have removed. I pushed nothing and did not touch the implementer's worktree. Staging reads went through q.sh, which sets default_transaction_read_only=on and ran SELECT only.

## Verdict: APPROVE (BE). One required FE follow-up before release is turned on anywhere (F1).

The BE change does what Bao's rule asks. The stage filter is an extra AND, so it can only narrow the set. It is applied in all four places:
- the tick claim query (`findDue`)
- the per-row lock re-check (`lockStillIdle`)
- the Today deadlines (`idleDeadlines`)
- the manager and bell list (`claimedIdle` / `claimedIdleOf`), where it flows through `deadlineOf` into `release_enforced`

## Findings by severity

### F1 — MEDIUM (FE copy no longer truthful once release is ON). Not a BE blocker. Needs an FE follow-up.
When `hot.idle_release_enabled=true`, a lead at S2 or later that nobody has contacted and that is not established now gets `release_enforced=false` and `established=false`. The FE has only two ways to explain a non-enforced row: "established", or "auto-release is off". So it shows the second, and that is false:
- Exceptions `ClaimedIdleRow.tsx:97` → `contact_due_hint[_ahead]`: "Contact is due {when}. **Auto-release is off**, so the lead stays with its owner until someone acts."
- Today `IdleReleaseNote.tsx:54` tooltip → `contact_due_hint`: "... **Auto-release is off**, so the lead stays yours ..."

Today this is masked: staging has `hot.idle_release_enabled=false` (since 2026-10-12 14:21 UTC), and prod is off on purpose. It becomes a lie the moment release is switched back on.

Suggested fix, either one:
- (a) BE adds a reason, e.g. `release_blocked: "STAGE" | "ESTABLISHED" | "OFF"`, on both the claimed-idle item and the Today item.
- (b) FE derives the reason from `item.candidate.stage` (S2 or later), plus a new hint string such as "Won't be auto-released — already past New lead".

(a) is cleaner because it keeps a single source of truth. The PR body's claim that "nothing reads 'Will be released'" is true. The replacement text is the problem.

### F2 — LOW (list starvation, pre-existing, now also with release ON)
`findClaimedIdle` orders by `established, clock start` with a cap of 200 (`hot.claimed_idle_list_cap`). Rows at S2 or later that are not established can never leave the list by release now. They carry the oldest clock starts, so over time they can push fresh New-lead rows past the cap. D148 solved the same problem for established rows.

This is the same behaviour every team already has with release OFF, and staging has only 58 rows today, so it is not a blocker. A cheap hardening is `ORDER BY established, (c.stage NOT IN ('S0','S1')), …`, so the rows that are actually releasable always sort first.

### F3 — LOW / NIT
- `HotIdleReleaser.java` step-1 log says "owner/status changed or row busy". It should now also say "or moved past New lead", because that is the new skip reason (it shows up in the race test).
- In `HotIdleReleasePolicy`, the new `isReleasableStage` javadoc sits between the CLOCK_REASONS javadoc and `CLOCK_REASONS`. That leaves the "ledger reasons that start the contact clock" javadoc orphaned above the wrong member. Move the method above that comment.
- The DECISIONS row is D251 and #624 takes D250; origin/master stops at D249. There is no clash, only an ordering rebase.

## Rule checks (Bao 13/10)
- **Claimed and never touched → can be taken back.** Holds. For S0/S1 that are not worked and not established, the release path is unchanged. Under the new rule there are 46 such rows on staging that would be due.
- **Touched, even partially → not taken back.** Holds, and now also by stage. A lead moved past New lead is never released, even with no logged contact. The per-row re-check refuses a lead that moved to S2, S5 or S6 after the claim query; the race IT covers this.
- **No-answer call (D138) → not released.** Holds. `humanOutboundSince` counts any `call_outcome IS NOT NULL`, NO_ANSWER included, so the lead is "worked" and leaves the clock. The stage filter is AND'ed after that and cannot bring it back. On staging, 3 S1 rows that have only NO_ANSWER since the claim are off the list and not due, both before and after the PR.
- **D148 established.** Holds. `findDue` = `stage IN (S0,S1) AND NOT established`. The list's `enforced` = global AND releasable stage AND NOT established. On an S2 established row both reasons apply and the FE shows the established wording, which is correct.

## Staging reconstruction (read-only, 2026-10-13 ~02:30 +07)
Settings in force:
- `hot.idle_release_enabled=false`
- `pipeline.v2_stages=true`
- `hot.claim_sla_starts_at=2026-09-25T10:37Z`
- budget 4 business hours, warning 1 business hour
- sources WEB_FORM, WEBINAR, EVENT_RSVP, REFERRAL, FB_ADS
- `hot.hand_raise_stages` S0–S5, cap 200

Mirror-only and device-click contact rules gave identical counts.

I rebuilt the manager list "Claimed, not contacted yet" with the same SQL as `findClaimedIdle`. The 3-hour wall prefilter approximates the business-hours warning, and every row is already days old, so the approximation changes nothing.

| stage | established | on list | release_enforced if release ON: before → after |
|---|---|---|---|
| S1 | no | 46 | true → true |
| S1 | yes | 1 | false → false |
| S2 | yes | 1 | false → false |
| S5 | no | 3 | **true → false** |
| S6 | no | 7 | **true → false** |
| **total** | | **58** | |

- **11 claimed-idle rows are at S2 or later.** 10 of them (S5×3, S6×7, all TRANSFER or CLAIM from 10–12/10, not established) would have read "Releases in … / will be released" with release ON. After the PR they show only the contact-due SLA: Exceptions "Due in / Overdue by", Today "Contact due …", bell `warn_due`. The 11th (S2, established) already read "won't be auto-released".
- The due set with release ON drops from 56 to **46** (S1 only). None of S2, S4, S5, S6 or S7 can be taken any more.
- The worked or established rows at S4, S5, S6 and S7 (about 80) were never on the list and still are not.

## UI null handling (recruit-fe origin/master f6257b38)
- **Today:** `IdleReleaseNote` renders the release text only when `idle_release_at` is truthy. With a null it falls through to `contactDueState`, which keys on `contact_due_at` and is still set. `instructionText` only uses `idle_release_at` when `idleReleaseState === 'warn'`, and that needs a non-null `idle_release_at`, so "before {time}" never renders blank. Null never shows as "undefined".
- **Exceptions:** `claimedIdleDeadline` = `contact_due_at ?? idle_release_at`. `claimedIdleEnforced` reads the boolean `release_enforced=false` and picks the "Due in / Overdue by" labels. The row is not dropped.
- **Bell:** `HOT_CLAIM_WARN` uses `warn_release` only when `release_enforced === true`, otherwise `warn_due`. The payload is written per poll; a stale warning that was already written keeps its old flag, which is the documented "not refreshed" behaviour.
- **Peer hand-off:** the line "on a contact clock … clock starts again" keys on `contact_due_at || idle_release_at`, so it stays correct.

There is no "Releases undefined" anywhere. The only problem is the wording in F1.

## Tests I ran myself (ram-gate acquired and released for each run)
- `HotIdleReleasePolicyStageTest`: 9/9 passed.
- `NewLeadOnlyReleaseIT` 7/7, `HotIdleReleaseIT` 16/16, `HotIdleReleaseOmniRecheckIT` 12/12, `ClaimedIdleEndpointIT` 6/6: all passed on real Postgres.
- **My own negative control:** I replaced the stage predicate in `lockStillIdle` with TRUE. All 3 race cases (S2, S5, S6) failed, the other 4 passed, and I restored the file. So the per-row re-check is really tested on its own, not only through `findDue`.

## Re-review at bdc335e4 (delta a0c7aae0..bdc335e4): APPROVE
- F1 (BE half): `release_blocked_reason` (OFF / ESTABLISHED / STAGE / null) is built in one place (`deadlineOf`) and carried on the claimed-idle rows, the Today items and through `ManagerReminders`. The JSON key is snake_case. All 6 constructor call sites are updated.
- F2: the list order is now `established, NOT releasable stage, clock start`. The list-cap IT covers it.
- F3: the skip log mentions the stage, and the javadoc is back on its own field.
- bdc335e4 builds the SQL stage list from `RELEASABLE_STAGES` (sorted enum names, not user input), so it is identical to before. The rest of that commit is tests and docs.
- Tests I ran myself at bdc335e4 under ram-gate, all passed: StageTest 10, NotificationRefresher 2+8, NewLeadOnlyReleaseIT 18, ClaimedIdleEndpointIT 6, EstablishedLeadEnforcementFlagIT 4. CI is green at the same head.
- Notes (LOW, non-blocking): no IT asserts ESTABLISHED with release ON, or that ESTABLISHED wins over STAGE. For the FE PR: OFF comes first, so while release is off an established lead reads OFF, and the FE should keep using the `established` flag for that wording.
