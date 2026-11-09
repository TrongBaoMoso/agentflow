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
