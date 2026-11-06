# PayPal sandbox on Recruit staging (06/11/2026)

Bead `agentflow-0gwad.5.3` (P4 S3, D375; bell D395). **No secret values are in this folder, in any log or in the PR.**

## Decision

The Recruit STAGING sandbox app is **shared with MOSO staging** (Bao 06/11). It is the same PayPal SANDBOX REST app that MOSO's `register-loan-officer?key=` flow uses.

**Production** needs the **LIVE** app of the Loan Factory PayPal account, plus `RECRUIT_ONBOARDING_PORTAL_PAYPAL_BASE_URL=https://api-m.paypal.com`. Nothing in production was touched.

## What was wired

| Where | What | Status |
|---|---|---|
| Source | MOSO staging Datastore (`lenderrate-master`, ns `5716104026521600`), kind `MeetingAndAppointmentConfiguration`, fields `ilo_paypal_client_id` / `ilo_paypal_client_secret` | read once with Bao's account into 0600 temp files; the files are deleted |
| Secret Manager `lenderrate-master` | `recruit-be-recruit-onboarding-portal-paypal-client-secret` **v1** | added (enabled) |
| recruit-be `helm-chart/config/staging/secret-keys.txt` | `+RECRUIT_ONBOARDING_PORTAL_PAYPAL_CLIENT_SECRET` | PR **#892**, squash `ded1a91ed` |
| recruit-be `helm-chart/config/staging/values.yaml` | plain env `RECRUIT_ONBOARDING_PORTAL_PAYPAL_CLIENT_ID` (public by design) and `RECRUIT_ONBOARDING_PORTAL_PAYPAL_MERCHANT_ID=8WTJ569XW3GMQ`; comment updated | same PR |
| Staging deploy | promote `ded1a91ed` → `cd-staging.yml` success; the pod rolled, because the env change altered the pod template | `recruit-svc-secret` has 36 keys incl. the new name; the pod env has all three (client id and secret length 80, checked by length only) |
| Startup WARN "onboarding-fee-paypal is ON but the PayPal check is not configured" | | **gone** (the full startup log was checked, and no PayPal warning appears) |

### Merchant id source

1. A sandbox OAuth token was taken with the shared app (client credentials). The app id is `APP-80W284485P519543T`.
2. A throwaway **uncaptured** sandbox order was created: `08E809559P306272J`, $100 USD, never captured. Its `purchase_units[0].payee` gave:
   - `merchant_id` = `8WTJ569XW3GMQ`
   - email `sb-hqfmm25067442@business.example.com` (a sandbox business account)
3. A cross-check came later. The order the **page itself** created in the E2E (`2LY07278L1178423J`) has the same payee `8WTJ569XW3GMQ`.

### Client id match

lf-homepage loads the PayPal SDK with MOSO's `ilo_paypal_client_id` (AppProvider). recruit-be's `fee-config` returns the same id, so `PortalPaypalGate` does not reload the SDK.

In the E2E, both SDK loads used the same client-id prefix. That is the value recruit-be now holds.

## E2E on staging (17:25–17:43Z, recruit-be `ded1a91ed`)

The lead was `bao.trinh+t10af1@loanfactory.com`: candidate `283dabaf-…`, offer `a97e4bf2-d15d-47c1-883b-aab23bcc084f` (SENT, fee PENDING, 1-1 done).
- The link was minted with `POST /api/v1/offers/{id}/onboarding-link` (admin token).
- Browser: headless Chromium under ram-gate, viewport screenshots only.

| Check | Result |
|---|---|
| Fee step shows the PayPal button (1440 + 375) | **PASS**. Before this change it showed "Payment isn't available right now…". It now shows the **PayPal** and **Debit or Credit Card** buttons, with `#register-lo-paying-unavailable` count 0. `profile` / `fee-config` / `page-texts` all 200 |
| Page creates a PayPal order against the shared app | **PASS**. Order `2LY07278L1178423J`, $100.00 USD, payee `8WTJ569XW3GMQ` |
| Pay with sandbox money | **PASS** (17:53Z, second pass below). Order `1DG41783PY796531B`, capture `2Y9987550U380164B` |
| Server-side check with the real sandbox creds | **PASS**. The page's uncaptured order `2LY07278L1178423J` was posted to `fee-paypal` (through lf-homepage staging → recruit-be). recruit-be authenticated with PayPal and read the order as `CREATED`, $100.00. It answered `REJECTED` / `NOT_COMPLETED`, `paid_startup_fee:false` |
| Replay of the same order id | **PASS (idempotent)**. A second identical post gave the same answer. There is still **1** `fee_payments` row (`6be6eb28-150c-4f75-a9f0-8cd689627e55`, outcome `REJECTED`, `order_status=CREATED`, `attempts=2`). The offer stays `SENT` / fee `PENDING`, and no bell fired, which is correct because nothing was captured |

### Payment: guest card, no buyer login needed (second pass, 17:45–17:55Z)

A PayPal sandbox buyer account is **not** needed. The guest "Debit or Credit Card" path works with PayPal's publicly documented sandbox test card **Visa 4012888888881881**, expiry 12/30, CVV 123, and a US billing address. No real card was used.

- **Headless Chromium:** the card button opens a `checkoutnow` popup. Both a generated card and the documented card got the same result: after "Pay Now", PayPal redirects to `/signin` and the order stays `CREATED` (`2LY07278L1178423J`, `1JY77774WS4140825`). Treat this as PayPal's bot/risk handling of headless popups, not a config problem.
- **Headed Chrome:** the card form renders **inline** (`/smart/card-fields`). Filling it and pressing "Pay $100.00" worked:

| Check | Result |
|---|---|
| PayPal capture (page side) | `POST /v2/checkout/orders/1DG41783PY796531B/capture` → 201 |
| recruit-be check (`fee-paypal`) | 200 `{"status":"PAID","paid_startup_fee":true,"paypal_order_id":"1DG41783PY796531B"}` |
| `fee_payments` | row `5a9dcb95-ec72-4e88-ac36-9e375aa082c8`: outcome `PAID`, capture `2Y9987550U380164B`, order/capture `COMPLETED`/`COMPLETED`, amount 100.00, attempts 1, verified 17:53:28Z |
| offer `a97e4bf2-…` | `SENT`, fee **`PAID`** (was `PENDING`) |
| Page | Re-opening the link (1440 + 375) shows the fee step with a green success check, and the PayPal buttons are gone (0 frames) |
| Replay of `1DG41783PY796531B` through `fee-paypal` | same 200 `PAID` answer, still **1** row for that order (attempts 1): idempotent, no double record. It did not land in "captured, not recorded", so the D395 bell was not triggered (correct) |

For a future rerun, use headed Chrome (`channel: 'chrome'`) and fill the inline `card-fields` frame by input `name`.

## Screenshots

| File | Shows |
|---|---|
| `desktop-1-fee-step-paypal-button.png` | 1440: fee step with the PayPal + card buttons (was "Payment isn't available") |
| `mobile-1-fee-step-paypal-button.png` | 375: the same |
| `desktop-2-guest-card-form.png` | the sandbox guest card popup |
| `desktop-3-guest-card-redirects-to-signin.png` | headless popup path: after "Pay Now", PayPal asks for a login |
| `desktop-4-inline-test-card-filled.png` | headed inline card form, filled with the documented sandbox test Visa |
| `desktop-5-after-pay-paid.png`, `mobile-5-after-pay-paid.png` | after payment: fee step shows the success check, at 1440 and 375 |

## Housekeeping

- The t10af1 link used for each pass was **re-minted afterwards** (its token rotated). The new link was stored nowhere, so mint again to test.
- Temp files holding the client id, secret, OAuth token and link were deleted.
- Leftover uncaptured sandbox orders `08E809559P306272J`, `2LY07278L1178423J` and `1JY77774WS4140825` expire on PayPal's side. They hold no money. The captured $100 is sandbox (fake) money.
