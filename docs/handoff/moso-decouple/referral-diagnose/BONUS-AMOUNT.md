# How MOSO decides the LO-referral bonus amount ($0 / $200 / $500 / $1000+)

Measured 09/11/2026, MOSO PROD Datastore (lender-rate, read only, counts only) + `moso` and `packs` `origin/master`.
Context: Recruit D420 (recruit-be `docs/DECISIONS.md`) pays a flat `referral.bonus_state.amount` = $500 for every
REFERRAL row; Bao 08/11: "$500 for REFERRAL only, 60 days after joining, forfeit on early leave".

## 1. The short answer

The amount is **not a fixed price**. It depends on **how many loans the referred LO closed in the 12 months
before joining LF** (`Admin.closed_loan_past_12_months_before_join`, typed by staff at onboarding), and the
formula has changed **four times**. Most of the $200 checks come from the oldest formula, where an LO with
**0 closed loans** got $200. Today an LO with 0 or 1 closed loans gets **$0**, 2-11 loans get **$500**, 12+ loans
get **$1000 per 12 loans**.

## 2. Where the amount comes from (code)

- `moso` `CreateLoanOfficerReferralSpecialRequest` (daily cron): for an Admin with `lo_joined_date` more than
  60 days ago, `referral_eligible`, still `active`, `refer_cash_bonus_info > 0`, and a referrer (`referred_lo`)
  who is `active` and `referral_qualified`, it creates a `Check` (status Requested, type Manually,
  `is_automatically_created`) owned by the referrer, `requested = Admin.refer_cash_bonus_info`. Runs once per
  LO (`requested_last_12_months_refer_bonus`). Referrer not qualified -> `REFERRER_NOT_QUALIFIED`, no check.
- `packs` `Admin.java` (save hook) computes `refer_cash_bonus_info` whenever the referral fields or the closed-loan
  count change, until the bonus is requested. Eligibility at conversion (lead -> Admin): referrer must be
  `referral_qualified`; not eligible if converted 120+ days after the lead was created, same phone as the referrer
  (spouses), or brokerage; LO Recruiter Program credit = no LO-referral bonus (D268/D340).
- There is no settings value for the amount. `AppreciationSetting.lo_refer_bonus_policy` (the policy text shown
  on the check) is empty in PROD.

### Formula history (n = closed loans in the 12 months before join)

| Era | Dates (commit) | Referred by an LF LO (`has_referred_lo`) | Referred by an outside LO (`has_referred_outside_lo`) |
|---|---|---|---|
| A | 2024-08-14 -> 2025-10-28 (moso `LoanUtils.referralBonus`) | n=0 **$200**; 1-4 $500; 5-9 $1000; 10-19 $2000; 20-34 $3000; 35-49 $4000; 50+ $5000 | (no such type) |
| B | 2025-10-19/31 -> 2026-03-16 (packs MOSO-14542) | n=0 **$200**; 1-11 $500; 12+ floor(n/12) x $1000 (cap $10k at 120+, $20k at 240+) | n<5 $200; 5+ $500 |
| C | 2026-03-17 -> 2026-05-10 (MOSO-15765) | n=0 **$0**; 1-11 $500; 12+ floor(n/12) x $1000 | n=0 $0; 1-4 $200; 5+ $500 |
| D | 2026-05-11 -> now (MOSO-16289) | n<2 **$0**; 2-11 **$500**; 12+ floor(n/12) x $1000 | n=0 $0; 1-4 $200; 5+ $500 |

Since 2026-04-02 (MOSO-16045) the amount is **stored** when the inputs change, not recomputed. An LO whose
value was stored under an older era keeps it, which is why a few $200 checks still appear in eras C/D.
Since 2026-06-18 the cron skips amount = $0 (before that, 17 checks of $0 were created and rejected).
RSU method: n<12 = 0 RSU, else floor(n/12) x 1000 RSU (10 Admins chose RSU).

**Outside-LO referrals never get an automatic check:** they have no `referred_lo` (0 of 85 have one), and the
cron owns the check by `referred_lo`. Their $200/$500 is shown in MOSO but paid by hand, if at all.

## 3. PROD measurements (counts only)

Automatic referral checks (reason starts "Loan officer referral bonus."): **305**, first 2025-01-11, last 2026-10-24.
(The 280/77 split in the brief probably also counted hand-made checks: 435 more Manually checks mention a referral.)

| Amount | Count | | Era | $0 | $200 | $500 | $1000+ |
|---|---|---|---|---|---|---|---|
| $0 | 17 | | A | 0 | 128 | 25 | 25 |
| $200 | 189 | | B | 0 | 28 | 5 | 1 |
| $500 | 58 | | C | 6 | 20 | 3 | 3 |
| $1000-$5000 | 41 | | D | 11 | 13 | 25 | 12 |

Amount vs the closed-loan count written on the check: n=0 -> $200 (180) or $0 (17); n=1 -> $500 (20); n=2-4 -> $500;
n=5-9 -> $1000 (era A) or $500 (later); 10+ -> $1000-$5000. This matches the formulas above exactly.

Since the $0 fix (2026-06-18): $500 x22, $1000 x7, $2000 x1, $4000 x1, $200 x1 (stale), $0 x1.
Status: 179 Paid, 125 Rejected (Rejected includes all 17 of the $0 ones).
Referrer's LO type on the check (`owner_lo_type`): INDEPENDENT 204, OUTSIDE (W2) 97; both types get both amounts.

Referred Admins with `has_referred` = 1113 (LF-LO referral 1027, outside-LO referral 85, other 1).
**Eligible LF-LO referrals who joined since 2026-05 (150), by n:** n<2 = **98**, 2-11 = 22, 12+ = 16, unknown = 14.

## 4. When it is $200, when it is $500 (stories)

- **$200 (old rule, before 17/03/2026):** Lan (an LF LO) refers Minh, a new LO with 0 closed loans last year.
  Minh joins 01/02/2026; on 02/04/2026 (day 60, both still active, Lan qualified) MOSO creates a $200 check for Lan.
  Under today's rule Minh's referral earns **$0**.
- **$500 (today):** Lan refers Hoa, who closed 6 loans in the 12 months before joining. Day 60 -> a $500 check.
- **$1000+ (today):** Hoa closed 30 loans -> floor(30/12) = 2 -> **$2000**.
- **Outside referrer:** Tuan (not at LF) refers Hoa (6 loans): MOSO shows $500 but no automatic check is created.

## 5. Is Recruit D420 ($500 flat) wrong?

Yes, compared with what MOSO does today, for two groups:

1. **Low-production referrals (n<2): MOSO pays $0, Recruit says $500.** This is the biggest group: 98 of 150
   eligible referrals since 05/2026 (about 2 in 3). Recruit would show/pay money MOSO does not.
2. **High-production referrals (n>=12): MOSO pays $1000-$5000+, Recruit says $500.** 16 of 150; the referrer is
   underpaid by Recruit.

Only the 2-11 loans group (22 of 150) matches. The 60-day clock, "the referred LO must still be active", and
the "no bonus with the LO Recruiter Program" rules already match D420. D420 has no 120-day window, spouse or
brokerage check, and does not check that the referrer is still active and `referral_qualified` (MOSO checks all).

If Bao's 08/11 "$500" was meant as a **new, simpler policy**, then D420 is right by design, but it is a policy
change (more money for 0-1 loan LOs, less for big producers) and Finance/Khai must know, and the D420
shadow will flag every n<2 and n>=12 row as an AMOUNT disagreement.

## 6. Recommendation for Recruit

1. **Ask Bao one question (plain words):** "MOSO today pays $0 if the new LO closed fewer than 2 loans in the
   year before joining, $500 for 2-11 loans, $1000 per 12 loans above that. Do we keep that, or switch to $500 for
   everyone?" Until answered, do not use D420's amount for any payout.
2. **If keep MOSO (recommended, it is what Accounting pays now):** replace the flat `referral.bonus_state.amount`
   with a tier function `amount(n)`: n<2 -> NOT_ELIGIBLE (reason `LOW_PRODUCTION`, $0); 2-11 -> $500;
   12+ -> floor(n/12) x $1000; keep the tiers in settings, not code. Input n = closed loans in the 12 months
   before the joined date, **frozen at JOINED** (Recruit has `units12mo` from MOSO, but it moves; snapshot it,
   and read MOSO's `closed_loan_past_12_months_before_join` in the shadow until Recruit owns the number).
   n unknown -> UNDETERMINED, never a guess.
3. Add the missing MOSO gates to `ReferralBonusRules` (referrer `referral_qualified`, 120-day lead->convert window,
   spouse/brokerage are staff-set reasons -> read them, do not re-derive).
4. Outside-LO referrers: keep NOT_ELIGIBLE for automatic payout (MOSO never auto-pays them); if Bao wants them
   paid, the MOSO tier is n=0 $0, 1-4 $200, 5+ $500.
