# Referral diagnosis + MOSO-only import, STAGING (09/11) [agentflow-0gwad.6.7]

Counts only, no PII. Production untouched.

## 1. The 89 "different referrer" rows (diagnose.sh, 09/11 ~02:30 UTC)

- DRY_RUN: 295 packs rows -> IMPORT 170, HAS_SNAPSHOT_OTHER_REFERRER 89, HAS_SNAPSHOT_SAME_REFERRER 31, UNCONFIRMED_OWNER 5.
- The 89 by Recruit source: BACKFILL 84 (V300), RECRUIT_MIRROR 5. Packs rule: REFERRED_LO_FK 69, SLUG_SERVER_RESOLVED 12, REFERRED_BY_EMAIL 8.
- Recruit's snapshot referrer vs the referrer MOSO pushes today (`legacy_ref.referrer`): **equal in 89/89**.
- Spread: 26 distinct Recruit referrers, at most 14 rows each. This is not one seed or default owner.
- Cause: two different MOSO fields name two different people.
  - Recruit reads `LORecruiting.referrer`, a LORecruiter keyName set by EnsureLORecruiterOp. It goes through MosoRowMapper REFERRER_FK and V300's evidence view.
  - packs `referrals/byOwner` ranks `LORecruiting.referred_lo` (Admin, "Referring LO") above it and never reads `referrer`. See ReferralByOwner.ownerOf.
- So this is **not a Recruit backfill bug**: the backfill copies exactly what MOSO's `referrer` field holds now.
- It is also **not a later re-point of the same field**: Recruit's snapshot still equals the current MOSO value. The data cannot show whether `referred_lo` was edited after sign-up.
- Bao's 09/11 rule (the sign-up referrer wins) keeps Recruit's `referrer`-first choice. The 89 stay as owner_differs until Recruit serves the list.
- The md5 call in step 4 failed on staging (`could not compute MD5 hash: unsupported`). It now uses sha256.

## 2. APPLY of the MOSO-only referrals (D433)

- None of the 170 had a `legacy_ref.referrer`, so none conflicts with Recruit's rule.
- Steps:
  - `referral.packs_import.apply_enabled` set to true at 02:39:17 UTC.
  - `POST .../packs-import?mode=APPLY&id_limit=500` at 02:39:32. The gateway returned 503 (timeout), but the run finished in the app.
  - `GET .../last`: mode APPLY, packsRows 295, not truncated, inserted **170** (all PENDING / FK_CONFIRMED / PACKS_IMPORT).
  - Same outcomes as the DRY_RUN. The 5 unconfirmed rows were not imported.
- Switch set back to **false** and read back as false.
- DB after: PACKS_IMPORT/PENDING 170. All other snapshot rows unchanged (BACKFILL 177, RECRUIT_MIRROR 21).

## 3. SHADOW (admin Referrals view, owners=ALL, pod log `referral_source.shadow purpose=VIEW`)

| since | packs | recruit | only_packs | only_recruit | owner_differs | recruit_unknown |
|---|---|---|---|---|---|---|
| 2000-01-01, before | 295 | 198 | 175 | 78 | 89 | 9 |
| 2000-01-01, after | 295 | 368 | **5** | 78 | 89 | 52 |
| 2026-01-01, before | 111 | 144 | 10 | 43 | 70 | 6 |
| 2026-01-01, after | 111 | 151 | **3** | 43 | 70 | 8 |

- The money fields (entry, eligible, amount, eligible_on, joined) agree on every matched row, before and after.
- recruit_unknown rose because the imported rows are PENDING (eligibility UNDETERMINED until a packs verdict).

## Left

- 5 only_packs = the 5 unconfirmed typed-email rows (left out by decision).
- 78 only_recruit: not yet diagnosed. Next step is to check whether packs drops them because its only evidence is `referrer` (the field packs ignores).
- 89 owner_differs: a rule difference. They remain until Recruit serves the list (referrals.source=RECRUIT).
- The view's admin call with since=2000-01-01 outlasts the gateway (503). Measure from the pod log.

## 4. New referrer rule D437, built and applied on STAGING (09/11) [agentflow-0gwad.6.7]

Bao approved the rule on 09/11, after REFERRER-FIELDS.md showed that `referred_lo` is the sign-up referrer and the field the money follows:

1. `referred_lo` when it is set;
2. else the page owner the server resolved (slug);
3. else `referrer`.

When `referrer` names someone else, Recruit keeps it only as the **claimed referrer** (`claimed_referrer_key`). It is shown, never paid, and the row goes on the review list.

- Shipped in recruit-be #938, squash `2e480eca3`, promoted to staging (cd-staging success; Flyway V357 applied).
  - Flag `recruit.features.referrer-referred-lo-first`: ON in staging values, absent in production.
  - Live recorder: uses the new rule on every new snapshot.
  - V357 adds 4 nullable columns: `claimed_referrer_key`, `referrer_review`, `referrer_rederived_from`, `referrer_rederived_at`.
  - The freeze trigger lets `referrer_key` move only inside the re-derive's own transaction.
  - Setting `referral.referrer_rederive.apply_enabled` is seeded false.
- New routes:
  - `POST /api/v1/admin/referral-program/referrer-rederive?mode=DRY_RUN|APPLY` and `GET .../referrer-rederive/last` (ADMIN);
  - `GET /api/v1/admin/referral-program/referrer-review` (REFERRAL_ADMIN_VIEW).
- Independent review: 2 HIGH, both fixed before merge.
  - The RBAC catalog entries were missing.
  - Not fixed in code, documented in D437 instead: a PENDING row written under the old rule stays stuck until the re-derive runs, and the V300 catch-up still writes `referrer` first. Re-run the re-derive after either.
  - Added: the re-point UPDATE is now also guarded by program + member.

### Steps on staging (UTC)

- DRY_RUN at ~03:58 (packs rows 295): REPOINT 81, KEEP_FLAG 8, SAME_REFERRER 201, NO_SNAPSHOT 5.
  - REPOINT 81: REFERRED_LO_FK 69 (57 PENDING, 12 REFERRAL) and SLUG_SERVER_RESOLVED 12 (8 PENDING, 4 LO_RECRUITER_PROGRAM).
  - KEEP_FLAG 8: all REFERRED_BY_EMAIL.
  - NO_SNAPSHOT 5: the 5 unconfirmed rows left out by D433.
- Apply:
  - `referral.referrer_rederive.apply_enabled` set to true at 04:04:53.
  - APPLY at 04:04:54. The gateway answered 503, but `/last` shows APPLY with **repointed 81, flagged 8**.
  - The setting was set back to **false** at 04:05:11 and read back as false.
- DRY_RUN again: SAME_REFERRER 282, KEEP_FLAG 8, REPOINT 0. It is idempotent. The 8 KEEP_FLAG rows all carry `PACKS_OWNER_DIFFERS`.
- Review list: **89 rows**.
  - REFERRER_DIFFERS_FROM_REFERRED_LO 69;
  - REFERRER_DIFFERS_FROM_ORIGIN_OWNER 12;
  - PACKS_OWNER_DIFFERS 8.
  - Every moved row keeps its old key as the claim and in `referrer_rederived_from`.
- Program and decided columns are unchanged.
  - Side effect: the 4 LO Recruiter Program rows now have referrer = member. LRP rows where member equals referrer went from 4/8 to 7/8. Before, the mirror's member and the stored `referrer` had been two different people.

### SHADOW (admin Referrals view, owners=ALL, pod log)

| since | packs | recruit | only_packs | only_recruit | owner_differs |
|---|---|---|---|---|---|
| 2000-01-01, before (03:5x) | 295 | 368 | 5 | 78 | **89** |
| 2000-01-01, after (04:07) | 295 | 368 | 5 | 78 | **8** |
| 2026-01-01, before | 111 | 151 | 3 | 43 | **70** |
| 2026-01-01, after | 111 | 151 | 3 | 43 | **7** |

- The money fields (entry, eligible, amount, eligible_on) still agree on every matched row.
- The 8 that remain are the REFERRED_BY_EMAIL rows. packs owns them by the typed e-mail, Recruit by `referrer` (stale against the current `referred_by`), and there is no `referred_lo`. All 8 are on the review list as `PACKS_OWNER_DIFFERS`.

### Left

- The review list has no screen yet (API only). A front-end card under Referrals (admin) is the next step if Bao wants one.
- 78 only_recruit: still not diagnosed (section "Left" above).
- Production: code only, flag absent, V357 runs dark. Before Bao turns it on in prod, run the re-derive DRY_RUN there. Measured on PROD, about 75 rows differ.

## 5. Referrer review card on Referrals (admin), STAGING (09/11) [agentflow-0gwad.6.7]

- recruit-be #943, squash `fc2e2e9a9`, on staging: the review list also returns `referrerName`, `claimedReferrerName` and `registeredAt`. Names follow the Referrals list rule: the matching candidate's name, otherwise a name derived from the key. Checked on staging: 89 rows, all of them named and dated, and 81 carry a claimed name (the 8 PACKS_OWNER_DIFFERS rows have no stored claim).
- recruit-fe #733, squash `134de7f07`, on staging: a "Referrer review" card under Top referrers on the All Loan Officers scope. Columns: referred Loan Officer, referrer (gets the bonus), claimed referrer, reason, date. It shows five rows, then "Show all". A row click opens the candidate. Text is in en and vi.
- The card shows only when all of these hold: the build switch `NEXT_PUBLIC_REFERRER_REVIEW_ENABLED=true`, the user has REFERRAL_ADMIN_VIEW, the page is on the All scope, and the API answers 200 with rows.
- The switch is **false** in recruit-fe `cd-staging.yml` until Wed 11/11, because Vic (Manager) would see the card in the Tuesday demo. `cd-production.yml` does not pass the switch, and the Dockerfile default is false. After the deploy, the staging admin page was checked: it shows no card.
- To turn it on: set the build argument to `true` in `cd-staging.yml`, merge, and let staging redeploy.
- Before/after screenshots (1440 and 375): private artifact https://claude.ai/artifact/9j8mM8ZHfcRNVTqzy6ezJA. Script: `docs/handoff/recruit-e2e-lab/scripts/rrshots.js` (local, not committed).
