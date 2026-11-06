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
| Pay with sandbox money | **NOT DONE: no sandbox buyer login.** See "Blocker" |
| Server-side check with the real sandbox creds | **PASS**. The page's uncaptured order `2LY07278L1178423J` was posted to `fee-paypal` (through lf-homepage staging → recruit-be). recruit-be authenticated with PayPal and read the order as `CREATED`, $100.00. It answered `REJECTED` / `NOT_COMPLETED`, `paid_startup_fee:false` |
| Replay of the same order id | **PASS (idempotent)**. A second identical post gave the same answer. There is still **1** `fee_payments` row (`6be6eb28-150c-4f75-a9f0-8cd689627e55`, outcome `REJECTED`, `order_status=CREATED`, `attempts=2`). The offer stays `SENT` / fee `PENDING`, and no bell fired, which is correct because nothing was captured |

### Blocker: a sandbox buyer (personal) account

- PayPal's **guest card** path does not finish on this sandbox app. Tried with:
  - country US;
  - a generated Luhn-valid test Visa;
  - a US billing address;
  - an `example.com` email.
- **Headless:** the "Debit or Credit Card" popup accepts the form. On "Pay Now", PayPal redirects to `/signin` ("Email or mobile number / Sign Up") and the order stays `CREATED`.
- **Headed Chrome:** the card form opens inline instead of in a popup. It was not pursued.
- PayPal has no public REST API that creates sandbox buyer accounts. They come from the developer dashboard.

**What is needed:** someone with access to the developer.paypal.com account that owns this sandbox app creates a **sandbox Personal account** (Testing Tools → Sandbox Accounts → Create account → Personal, US). That is presumably MOSO's (Khai), or Bao if the app is in Bao's dashboard.
- Pass its email and password to the session over a private channel. Never commit them.
- The run then takes about 5 minutes:
  1. re-mint the t10af1 link;
  2. on the fee step, PayPal → log in with the sandbox buyer → pay;
  3. expect `fee_payments` outcome `RECORDED` with a capture id, offer fee PAID, and the page moving to step 4.
  4. Then replay the order id: expect no second row and no double record.

## Screenshots

| File | Shows |
|---|---|
| `desktop-1-fee-step-paypal-button.png` | 1440: fee step with the PayPal + card buttons (was "Payment isn't available") |
| `mobile-1-fee-step-paypal-button.png` | 375: the same |
| `desktop-2-guest-card-form.png` | the sandbox guest card popup |
| `desktop-3-guest-card-redirects-to-signin.png` | after "Pay Now": PayPal asks for a login, so the guest path is closed |

## Housekeeping

- The t10af1 link used for this run was **re-minted afterwards** (its token rotated). The new link was stored nowhere, so mint again to test.
- Temp files holding the client id, secret, OAuth token and link were deleted.
- Leftover uncaptured sandbox orders `08E809559P306272J` and `2LY07278L1178423J` expire on PayPal's side. They hold no money.
