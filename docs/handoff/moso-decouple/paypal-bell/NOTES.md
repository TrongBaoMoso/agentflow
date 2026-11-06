# PayPal fee "captured but not recorded" URGENT bell (D395)

Bead: `agentflow-0gwad.5.3` · recruit-be PR #877 · squash merge `f11cdcd6795fc36d6925df316941f3e775507dad` (06/11/2026)
Status: **on STAGING only**. Production: the flag is absent there, so the bell is off, and the whole PayPal fee route is off too (D375).

## What it does

When a Loan Officer pays the onboarding start-up fee with PayPal and PayPal shows the order AND the capture as
COMPLETED, but Recruit refuses to record it, the money has been taken and nothing in Recruit is marked paid. Recruit
refuses on FEE_ALREADY_SETTLED, OFFER_NOT_PAYABLE, or a reference/amount mismatch on a captured order.
D375 already counted this case in `onboarding_fee_paypal_captured_not_recorded_total` and logged an ERROR. D395 adds a
bell that people who can act will actually see:

- `FeeCapturedBell#raise` writes one `urgent_notifications` row per recipient: kind `FEE_CAPTURED_NOT_RECORDED`,
  key `fee:<PayPal order id>:<recipient>`. The unique (kind, key, recipient) index means at most one bell per PayPal
  order per person, however many retries happen.
- Recipients: every Admin, found through a grant that names ADMIN (the wildcard does not count), plus the lead's
  onboarding specialist (`candidates.onboarding_specialist_id`). Each person is listed once.
- Not rung when the same order id or capture id already PAID a fee on any invite. That is a replay of money that was
  recorded, not money left unrecorded.
- The existing `UrgentSweepService` tick publishes it as URGENT with template `RECRUIT_URGENT_FEE_CAPTURED`
  (en + vi): "PayPal fee not recorded: {lo}" / "PayPal captured {amount} (order {order}) but Recruit did not record
  it. {fee_reason} Record it by hand or refund it."
- If the same order is later recorded PAID, the bell resolves on its own (`UrgentStore#feeNowRecorded`, the fix from
  the review).
- Never throws. A failed Admin lookup still tells the OB, and a failed insert is logged. The Loan Officer's answer is
  unchanged (the generic rejection).
- Flag `recruit.features.onboarding-fee-captured-bell` (env `RECRUIT_FEATURES_ONBOARDING_FEE_CAPTURED_BELL`):
  staging `true`, production absent (off). No migration.

## Product decisions (Bao, product owner, approved 06/11/2026 via the lead): DECIDED

1. **The bell shows the amount, the PayPal order id and the reason.** This is an R1 exception, like the D346 field
   kinds: a person has to find the payment in PayPal. It carries no payer data, no token and no PayPal body, and only
   Admins and the lead's OB receive it.
2. **It clears itself after 14 days** (`recruit.urgent.max-age`) if nobody records or refunds the payment. Recruit has
   no record of refunds or hand settlements, so age is the only way it can end. After that, the metric and the ERROR
   log line are the only record left.
3. **Recipients are fixed when the bell is raised.** A later change of Admins or of the lead's OB does not move bells
   that already exist.

## How it was verified

- Independent code review: 0 CRITICAL, 1 HIGH (a bell stayed up after the same order was later PAID). Fixed in the PR.
- Local tests, re-run after the final rebase onto master `e33bcd19b`: `PlatformInboxCatalogTest` 33,
  `FeeCapturedBellTest` 7, `UrgentSweepServiceTest` 38, all green. Earlier runs also passed `OnboardingFeePaypalIT` 20,
  `UrgentSweepIT` 13 and `PlatformInboxIT` 22.
- CI on head `979fe9aca` was all green (Tests, Integration tests, decision-number guard, pr-check).
- Staging (context `gke_lenderrate-master_us-central1_moso-kube`, ns `recruit-be`), 06/11 ~12:01 UTC:
  - "Deploy staging (GKE)" run 42213388008 succeeded on `f11cdcd67`, and pod `recruit-be-7cb74687fd-w5fdc` rolled
    out and is 1/1 Ready.
  - `RECRUIT_FEATURES_ONBOARDING_FEE_CAPTURED_BELL=true` in the pod.
  - The boot log says "declared the RECRUIT template catalog (60 templates, en + vi)". The previous pod said 59,
    because master's b4hpa.6 had already added templates, so the "44 to 45" in older notes is out of date. The +1 is
    `RECRUIT_URGENT_FEE_CAPTURED`.
  - No ERROR during boot. The only ERROR lines appeared after startup and are user requests refused for their role
    ("This page is not available to your role"), which have nothing to do with this change.
- Not done: a full end-to-end test with a real captured PayPal sandbox order. That needs PayPal sandbox credentials
  and the portal API key on staging (Khai/DevOps), and until they exist the fee route answers 503.

## Cloud Monitoring alerts: NOT applied on staging

Neither D375 fee policy (`onboarding-fee-paypal.yaml`, `onboarding-fee-captured-not-recorded.yaml`) is live on staging.
No workflow applies them. Applying them is a manual step, documented in recruit-be `deploy/alerts/README.md`:

```
ONLY="onboarding-fee-paypal.yaml onboarding-fee-captured-not-recorded.yaml" DRY_RUN=1 ./deploy/alerts/apply.sh
ONLY="onboarding-fee-paypal.yaml onboarding-fee-captured-not-recorded.yaml" ./deploy/alerts/apply.sh
```

Until someone runs those commands, this bell is the only notice a person gets.

## Left

- Production: the bell turns on only when the fee route goes live in production. The flag has to be added to the
  production values at that point.
- Apply the two fee alert policies (manual, see above).
- Refund/dispute recheck: follow-up bead `agentflow-0gwad.5.4`.
