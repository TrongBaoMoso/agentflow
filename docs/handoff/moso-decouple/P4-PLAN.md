# P4 plan: the Loan Officer onboarding portal off MOSO (profile, fee, agreement)

Bead `agentflow-0gwad.5` (epic `agentflow-0gwad`). Research and plan only: no code, no PR, no service changed.
Written 04/11/2026 by session `460363a7`.

**Sources.** Every repo was fetched first, and every reference below is on the latest base branch:
- lf-homepage `origin/master` b218f411. Prod branch `production`.
- packs `origin/master` 863828a0.
- moso `origin/master` 1ef9ddf2.
- recruit-be `origin/master` 8fd15b83. Prod is cea1f014.
- document-esign `origin/master` 8a70963. Prod is 06a6643.
- lo-homepage `origin/produciton-v2`.

**Production measurement.** Read-only GQL against MOSO Datastore `lender-rate`, ns `5716104026521600`, using Bao's ADC (`datastore.viewer`). Only non-PII fields were kept: booleans, dates, document types. Scripts and outputs are in the session scratchpad `p4m/`.

**Bao's fixed decisions (23/10), which this plan follows:**
- The portal stays on lf-homepage, and its API points to recruit-be.
- Keep Inkless and the current agreement content through document-esign's existing 1099/W-2 templates. There is no legal re-review: a person compares the new PDF with the MOSO PDF.
- Keep PayPal: the same amount, the same waiver rules and the same PayPal account. Port packs `checkPayPalTransaction`.
- We write the document-esign and accounting PRs, and Khai reviews them.

---

## 0. Facts that size the work (production, measured 04/11)

| What | Number |
|---|---|
| `LORecruiting` rows | 131,385 |
| Paid the start-up fee (all time) | 4,858. 4,500 have a PayPal order id; ~358 were marked by staff or by old code |
| Fee waived (all time) | 93. 49 carry a staff reason; 2 are both paid and waived |
| Agreement signed (all time) | 4,814. 49 are signed with neither paid nor waived |
| **Paid in the last 90 days** (rows whose 1-1 `meeting_date` is on or after 06/08) | **209**, of which **208 signed**. **0 waived** |
| Paid LOs by meeting month: Apr / May / Jun / Jul / Aug / Sep / Oct | 127 / 122 / 117 / 75 / 100 / 57 / 61. That is **~60–120 a month, about 2–4 a working day** |
| Rows touched in the last 90 days (`updated` ≥ 06/08) | 555 paid, 8 waived (3 with a reason). This is an upper bound |
| **Inkless ILO agreement envelopes created in the last 90 days** | **342**: 269 completed, 32 expired, 41 still open |
| Document mix of those 342 envelopes | 1099 only 200 · W-2 only 81 · W-2 + CA compliance 51 · 1099 + exclusive agent 9 · 1099 + CA 1 |
| Signed in 90d by type | W-2 74 · 1099 134. CA sponsor without DRE 34 · 1099 licensed in VA/MS 5 |
| PayPal config (`MeetingAndAppointmentConfiguration/1`) | `ilo_startup_fee=100`, `ilo__enable_paypal=true`. Client id and secret present (values not read) |
| Inkless credentials used by packs | Datastore `DisclosureSetting.inkless_token` / `inkless_external_id` (present, not read) |

What these numbers mean for the plan:
- **Waivers are nearly extinct.** There were none among the last 90 days' payers, and only 93 ever. The waiver path must keep working, but it is a small path.
- **The money path is real.** About $6–12k a month, roughly 2–4 payments a working day.
- **The agreement path is about 110 envelopes a month.** Every combination of the four required documents occurs, so the required-documents rule must be ported exactly.
- Recruit production has no users yet. In Recruit prod, `agreement-send`, `packs-writeback` and `onboarding-v2-handoff` are absent or off. So every Loan Officer above went through MOSO only.

Caveats:
- `meeting_date` is the best available proxy for "when they paid". MOSO stores no paid-at date.
- Composite indexes are missing, so the 90-day counts come from pulling the ~5k flagged rows and filtering them locally.

---

## 1. Today's flow, step by step

Two front doors open the same MOSO record (`LORecruiting`, keyed by the App Engine websafe key):
- **lf-homepage `/register-loan-officer?key=<websafe key>`** is the real portal. All its calls go to packs WebPlus (`NEXT_PUBLIC_MOSO_API_URL`, `src/apis/loanfactoryApi.ts:806-884`).
- **`/apply_loan_officer?key=`** is the link in every MOSO email. On www.loanfactory.com, lf-homepage's middleware rewrites it to `/register-loan-officer` (`src/shared/constants/map-urls.ts:59,225`). The old GWT form `moso:…/interested_loan_officer/ApplyLoanOfficerForm.java` remains only as a fallback on the MOSO host.
- lo-homepage `produciton-v2` carries a twin of the page, with the same packs calls (`loanfactoryApi.ts:785-866`).

The page variants (`register-loan-officer`, `-v1`, `-v2`) share `RegisterLoanOfficerForms/useRegisterLoanOfficerFlow.ts`. There are four steps (`src/shared/utils/registerLoanOfficerSteps.ts`, 0.25 progress each): **Basic info → Pay fee → Review & sign → Grant NMLS access**. The rule (Bao 29/09) is: profile → 1-1 call → pay → sign.

| # | Step | Page / component | packs endpoint (WebPlus `{ns}/…`) | Data it touches (`LORecruiting`) | Side effects in MOSO |
|---|---|---|---|---|---|
| 1 | Open the link (invite, welcome or reminder email) | `useRegisterLoanOfficerFlow.initRegisterForm` | `POST getRegisterLoanOfficer?key=` (`WebPlusAPI.java:1803`). This is a whitelisted read, because the row also carries the SSN (`RegisterLoanOfficerProfile.fields()`). It falls back to `execute/GetOp?key=` | ~60 whitelisted fields: identity, address, licensing, preferences, referral, website disclosure, `complete_percentage`, `onboarding_meeting_status`, `paid_startup_fee`, `waive_startup_fee`, `lo_agreement_signed`, and `url_signing_sessions` only when `isSigningLinkServable` holds | none |
| 1b | Page texts and config | `AppProvider`, `PayingOneTime` | `loadTemplateOp` with `lo_recruiting_onboarding_process`, `lo_recruiting_startup_fee_desc` and `lo_recruiting_done_thanks`. `execute/GetOp?id=1&kind=MeetingAndAppointmentConfiguration` returns the fee amount, the enable flag and the PayPal client id | MOSO Datastore `Template` and config | none |
| 2 | Fill in or edit the profile (Basic info, then Save & Next) | `BasicInfoForm*`, `buildSavePayload.ts`, with reCAPTCHA | `POST registerLoanOfficer` (`WebPlusAPI.java:2617`). With no key it runs `RegisterInterestedLoanOfficer` (a new lead; P3 dual-posts it). With a key it runs `SaveOp` | The whole profile (§ `RegisterLoanOfficerRequest`, `moso-types.ts:1484`). Server guards: strip meeting status, fee/agreement fields and credit fields; legal names are fill-only; W-2/1099 is locked after the 1-1; first-touch attribution; website-disclosure validation | `LORecruiting.beforeSave` / `afterSave`: status, owners, Modex sync, the recruit push to recruit-be |
| 3 | 1-1 onboarding call (staff) | — (Recruit: onboarding specialist Mark done → `ONBOARDING_MEETING` write-back, or MOSO staff) | RecruitAPI / MOSO staff op | `onboarding_meeting_status = pre_onboarding_done` (or later `setup_done`) | Sends the **`pre_onboarding_done` email**, which deep-links `/apply_loan_officer?key=…&selectTab=Review and Sign agreement`. **`afterSave.ensureIloESignDocumentsForOfficer` builds the Inkless envelope** |
| 4 | Pay the $100 fee | `PayingOneTime/index.tsx`. `@paypal/react-paypal-js` captures the order in the browser. It is locked until step 3 (`startupFeeGates.ts`, `DEFER_STARTUP_FEE_UNTIL_APPROVED=true`) and fails closed when the config is unloaded | `POST saveLoanOfficerPaidStartupFee {key, paypal_order_id}` (`WebPlusAPI.java:2739`), which runs `InterestedLoanOfficerPaidStartupFee` | packs gets an OAuth token with the Datastore client id and secret, then calls `GET api-m.paypal.com/v2/checkout/orders/{id}`. It requires `status=COMPLETED`, **`update_time` less than 60 s ago**, USD, and value = `ilo_startup_fee` (default 100). It refuses an order id already stored on any row, then sets `paid_startup_fee=true` and `paypal_order_id`. Sandbox endpoint off prod | `afterSave`: emails `email/paid_startup_fee_by_ilo` and `email/paid_startup_fee_successfully`; notifies the LOA; sets `status = interviewed_and_accepted`; escalation-desk tickets (`ILO_ONBOARDING_STATUS_ONBOARDING_FEE_PAID` and others); an `ILO_ARCHIVED_BUT_STARTUP_PAYMENT_PROCESSED` ticket if the row was archived |
| 4w | Waiver (instead of paying) | — | Not public: `registerLoanOfficer` strips it. A waiver is set by MOSO staff, or by RecruitAPI from a Recruit offer (`waive_fee` + reason asked on request, granted by a manager on approve; D337 asks for a reason when the manager keeps the fee) | `waive_startup_fee`, `waive_startup_fee_reason`. `afterSave` writes a Note "Reason to waive start up fee: …". Global switch: `ilo__enable_paypal=false` turns the fee off for everyone | The /join page's own automatic waiver (no reason) is ignored by Recruit (D200 / V205 `JoinPageFeeWaiver`) |
| 5 | Get the signing link | `useSigningLinkAfterCall.ts`: up to 3 asks, 5 s apart | `POST registerSigningAgreement {key}` (`WebPlusAPI.java:2708`). It is refused before step 3. The link is returned only when the fee is settled | `EnsureSigningSessionsRegisterInterestedLoanOfficer`: a per-LO memcache lock (240 s), `computeRequiredDocs` (`:936`), fill data from same-named LO fields (`createListFillData`), MOSO PDF forms (`GenerateFormOp`), tags, merge, then **Inkless `fillAndSendWithBytes`** (one envelope "ILO Agreements – <name>", signer 1 = the LO, redirect `/apply_loan_officer?key=`, Inkless's own completion email off). Reuse, regenerate (cancel + resend) and cooldown rules; `InklessEnvelopeLog` | `url_signing_sessions` and the signing sessions are stored. The `require_ilo_esign_documents` email is sent when staff or Recruit ask (D159) |
| 6 | Sign | `ReviewAndSignAgreement`: `window.open(url_signing_sessions)` on Inkless | Inkless → `exec/pdf_form.InklessWebhookOp`, with `InklessPollStatusCronOp` as a sweep | `InklessProcessInterestedLoanOfficerCompletedOp`: signed files (public-read) go to `lo_agreement` / `lo_agreements`, then `lo_agreement_signed=true` | Email `inkless_signing_completed_ilo`; LOA notified; status accepted; background-check email when the sponsor states hit OR/GA/KY (`ILO_completes_background_check`); escalation tickets; push to Recruit, which mirrors SIGNED (D230 auto-heal) plus the D246 20-min signed reconcile |
| 7 | Grant NMLS access | Step 3 of the page | `registerLoanOfficer` (keyed) | `give_nmls_access` | Licensing works from MOSO |
| 8 | Reminders while unfinished | — | `DailyCheckOnboardingILOsCronOp` (rows `interviewed_and_accepted`) | — | `email/daily_onboarding_update` with `/apply_loan_officer?key=` links for pay and sign |

**The required-documents rule** (`computeRequiredDocs`):
- W-2 if `is_corporate_loan_officer`, else 1099.
- Plus `ca_compliance_statement` if CA is in `sponsor_states` and `has_dre_endorsed` is false.
- Plus `exclusive_agent_agreement` if 1099 and `states` contains VA or MS (`LICENSED_CONFIRMATION_STATES`).
- A document already signed under the legacy names `ilo_1099_agreement` / `olo_w2_agreement` counts as signed.

---

## 2. What recruit-be already has vs what is missing

**Already in recruit-be** (`origin/master`):

| Area | What exists | Where |
|---|---|---|
| Offer and money model | `offers` with `status` (… SENT, SIGNED), `fee_status` PENDING/PAID/WAIVED, `agreement_status` NOT_SENT/SENT/SIGNED; ledger `offer_history` (FEE_PAID, FEE_WAIVED, SIGNED…) | `offer/model/*`, `OfferEntity`, V001/V046 |
| Waiver rules | Waive asked on request (`waive_fee` + reason, which forces review), granted by a manager on approve (`keep_fee=false`) or `approve_now`; D337 reason to keep; D200 /join-page waiver ignored (V205); "paid wins over waived" (D230) | `OfferServiceImpl.request/approve`, `JoinPageFeeWaiver` |
| State changes | `markSigned`, `markFeePaid`, `waiveFee`, with state guards and the D167 auto-stage. **No HTTP route (D248)**: they are kept for "an authenticated e-sign or payment webhook" | `OfferService.java:17-87` |
| MOSO mirror (to keep for in-flight) | `reconcileFromLegacy` (D230), the scheduled signed reconcile (D246, V242), Exceptions "Signed in MOSO" actions (D287) | `offer/…`, `exceptions/…` |
| Agreement send through packs | D159 `AGREEMENT_SEND` outbox kind, `GET/POST /candidates/{id}/agreement` (dry run, LINK_AGAIN / UPDATED_AGREEMENT). Flag off in prod | `agreement/*`, V158 |
| Fee amount | Setting `onboarding.startup_fee_amount` = 100 (V294) | `template/lomail/send/StartupFee.java` |
| Own mails (P2) | Sender = the recruiter or specialist, through notifier v2; invite and welcome (D331), whose `join_url` is still the **temporary MOSO `/apply_loan_officer?key=` link** | `template/lomail/*`, `offer/mail/InviteMail`, `onboarding/mail/WelcomeMail` |
| 1-1 and specialist | Specialist round robin, the 1-1 schedule (Calendar + Meet), Mark done, `onboarding_meeting_reached`, the D207 hand-off | `onboarding/*`, `checklist/*` |
| Public route pattern | `/public/api/v1/**` exempt from the gateway Bearer check. Examples: `register-status` (key = bearer, rate limiter, no existence oracle, `no-store`), lead intake (D356, server-held key, lf-homepage calls it server-side), webinar ICS, unsubscribe | `registerstatus/*`, `intake/*` |
| Own identity | D314: Recruit's candidate id is the identity, and `legacy_key` is optional behind `moso-record-required` | P1 |
| Profile columns | names and legal names, email, phone, NMLS, state, `licensed_states`, `sponsor_states`, `mailing_address`, `preferred_languages`, `social_links`, `target_compensation`, `is_corporate_loan_officer`, `lo_type`, `employment_type`, `completed_detail_form`, `detail_extras` (jsonb) | `CandidateEntity` |
| HR hand-off | `POST ai-hr-be /internal/v1/recruit/hires` (live; manual "Send to HR" in prod), the HR onboard listener | `hronboard/*` |

**Missing:**
1. **A portal credential that is not the MOSO key.** Recruit needs an opaque onboarding token per offer: random, stored hashed, revocable, expiring, and rotated on resend.
2. **A public portal API** that answers the page's contract: read the profile, save the profile, fee config, record payment, get the signing link, state. It must carry packs' guards: strip fee/sign/meeting fields, fill-only legal names, W-2/1099 locked after the 1-1, attribution first-touch, the website disclosure, reCAPTCHA, rate limit.
3. **Profile fields Recruit does not store yet:**
   - full street, street2, zip, county and city, plus the same-as-mailing flag
   - citizenship, alias first name
   - `brokerage`
   - the CA DRE block (`has_dre_endorsed`, `has_sos_licensed`, `ca_dre_license(_type)`, `has_dre_real_estate`, `practice_real_estate`), `confirm_sponsorship`
   - `rocket_target_compensation`
   - the mortgage-website disclosure (with its ack timestamp)
   - the referrer's Zelle and payment answers
   - `give_nmls_access`, `complete_percentage`

   Some of these may fit `detail_extras`. The PDF fill (full_name, full_address, nmls) needs several of them.
4. **The three page texts** (`lo_recruiting_onboarding_process`, `…startup_fee_desc`, `…done_thanks`) as Recruit `message_templates`.
5. **PayPal server-side verification** in recruit-be, plus a payment ledger (unique order id), plus credentials in Secret Manager (prod plus a sandbox for staging).
6. **An e-sign orchestration:**
   - the required-documents port
   - DE fill-data mapping per template
   - envelope create, reuse and supersede
   - a COMPLETED-event handler → `markSigned`
   - storing the signed file ids
   - signing link → portal
7. **document-esign:** a RECRUIT caller, a non-delegated `ServiceType`, a bucket, a non-loan signer path (the slot planner calls tera-be/LOS `getBorrowers`), and the `LO_AGREEMENT` (docs) vs `ILO_AGREEMENT` (code) fix. Re-checked on DE master 8a70963: still none of these. The caller `TERA` is now named `LOS`.
8. **Mails that packs sends today and Recruit does not:**
   - paid confirmations (to the LO and the LOA)
   - signing completed (with the document list)
   - the background-check mail (OR/GA/KY)
   - the daily onboarding reminder
   - the "your agreement is ready" mail (`require_ilo_esign_documents`)
9. **MOSO side effects with no Recruit owner yet:**
   - `status` → `interviewed_and_accepted`
   - escalation-desk tickets (fee paid, pre-meeting + fee + signed, NMLS n/a…)
   - the Modex status sync
   - LOA update emails
10. **The HR hand-off does not carry the signed agreement.** HR's onboarding template has a `us_lo_agreement` document key, but Recruit sends no file to HR.

---

## 3. Proposed slices

Rules for every slice:
- Each slice ships to **staging behind a flag** that defaults to off everywhere.
- Ascending Flyway V numbers only. Check against prod's highest before any promote.
- Two reviewers on recruit-be PRs, as usual.
- Only offers created after the flag is turned on use the new path ("new offers only"). LOs already holding a MOSO link finish in MOSO, with D230/D246 kept alive until their offers close.

| # | Slice | Repo | Flag | Depends on | Review / merge | Size |
|---|---|---|---|---|---|---|
| **S0** | **Prerequisites, no code.** (a) Answers to §5. (b) PayPal: the same app's client id and secret copied from Datastore into GCP Secret Manager for recruit-be prod, plus a **sandbox** app for staging. Khai or DevOps does this; we never handle the values. (c) Confirm whether DE's `esign_settings` Inkless tenant is the same account as packs' `DisclosureSetting` (billing, branding). (d) Name the person who compares the PDFs | — | — | — | Bao, Khai | S |
| **S1** | **Onboarding token + public portal read/save.** Table `onboarding_tokens` (offer_id, candidate_id, sha-256 of the token, expires_at, revoked_at; rotated on resend, revoked on decline or merge). `GET /public/api/v1/onboarding/{token}` returns the same field names as `RegisterLoanOfficerResponse`, so the page needs no mapping. `PUT …/{token}/profile` ports packs' guards. `GET …/fee-config` returns amount, enabled and the public client id. Same hardening as `register-status`: rate limit, identical shape for unknown tokens, `no-store`, no token in logs. Called server-side by lf-homepage route handlers with a server-held key (the D356 pattern). Columns for the missing profile fields (§2.3). The 3 page texts become TEAM `message_templates` | recruit-be | `recruit.features.onboarding-portal` | P1 (own key, D314) | recruit-be reviewers | M |
| **S2** | **lf-homepage adapter.** `?t=<token>` → recruit-be through `app/api/onboarding/*` route handlers. `?key=` is unchanged and goes to packs (in-flight and self-applied rows). The UI, steps and gates stay as they are; only the data source changes. The tracking ids stay. lo-homepage twin: only if §5 Q8 says so | lf-homepage (base `master` → staging; then `master` → `production`) | env `RECRUIT_ONBOARDING_PORTAL` (server) | S1 | lf-homepage reviewers; Bao for prod | M |
| **S3** | **Fee: PayPal verify + ledger.** Port `checkPayPalTransaction`: client-credentials token, `GET /v2/checkout/orders/{id}`, COMPLETED, USD, amount = `onboarding.startup_fee_amount`, sandbox off prod. Table `fee_payments` with a unique `paypal_order_id`, amount, capture id, verified_at and raw status (no payer PII). Then the existing `markFeePaid` (the "authenticated payment" D248 reserved it for). Add a setting `onboarding.startup_fee_enabled`, mirroring `ilo__enable_paypal` and failing closed like the page. Waiver rules: unchanged (S0 copies them already). `POST /public/api/v1/onboarding/{token}/fee/paypal {order_id}` is idempotent | recruit-be | same flag + `onboarding.fee.paypal_verify` | S1, S0b | recruit-be reviewers; Khai for the secret wiring | M |
| **S4** | **document-esign: RECRUIT caller.** `internal.callers.RECRUIT` → `[RECRUIT]`. A new `ServiceType.RECRUIT`, not app-delegated, so the internal e-sign door serves it. A bucket. A signer path for non-loan types that skips the LOS borrower and loan-officer lookups (`SignerSlotPlanner`). The `ILO_AGREEMENT` docs fix. A per-signer `redirectUrl` (the client DTO already has it). `ILO_AGREEMENT` events on `ESIGN_ENVELOPE_COMPLETED_TOPIC` | document-esign | DE config (caller entry) | S0c | **Khai reviews and merges** | S–M |
| **S5** | **Agreement through DE.** Port `computeRequiredDocs`, legacy-signed equivalence included. Map Recruit fields → each DE template's `inputs.json` (full_name, full_address, nmls, current_date, associate_initials, 1099 `text_1/text_2/fill_date`: confirm what each means against the MOSO PDF). Create the envelope when the sign step unlocks (1-1 done AND fee settled, the same rule as `isSigningLinkServable`) with `idempotencyKey = offer + doc set`, and `supersedesEnvelopeId` when W-2/1099, states or legal name change. Subscribe to COMPLETED (filter `source=ILO_AGREEMENT`, `serviceType=RECRUIT`) → `markSigned` + store `signed_file_ids`. The portal's "get signing link" becomes `GET …/{token}/signing-link`. **Gate before prod ON: one PDF of each of the 6 combinations seen in prod (§0), compared side by side with MOSO's by the person named in S0d** | recruit-be | `recruit.features.esign-de` | S4, S1, S3 | recruit-be reviewers; Khai (DE contract) | M–L |
| **S6** | **Mails with the new link.** Invite and welcome `join_url` → `…/register-loan-officer?t=`. Recruit sends what packs sent for these rows: the "agreement ready" mail, paid confirmation (LO + specialist), signing completed (with document list), the OR/GA/KY background-check mail, and the daily unfinished reminder (or the existing reminder engine). Each is a TEAM template, From = the specialist (D328) | recruit-be | per-mail flags under `lo-mail-*` | S1 (S5 for the sign mails), P2 live | recruit-be reviewers | M |
| **S7** | **MOSO stops acting on Recruit-portal rows.** A small packs PR: rows stamped `agreement_flow=RECRUIT_V3` (or a new marker) get no packs envelope from `afterSave`, no `pre_onboarding_done` or daily reminder, and no paid/agreement mails. Plus a **thin mirror** of `paid_startup_fee` / `lo_agreement_signed` (+ `paypal_order_id`) back to packs, so that the MOSO consumers that still read them keep working until P5/P6: the status move, escalation desk, Modex sync, HR/Licensing staff views, the LO Recruiter Program standing. This is a new write kind on the existing outbox, so it **needs Bao's OK** (see Q2) | packs + recruit-be | `recruit.features.portal-moso-mirror` | S3, S5 | Khai reviews and deploys packs | S–M |
| **S8** | **HR hand-off = the single "joined" path.** The `recruit.hired.v1` payload gains W-2/1099, the experience class and the signed agreement file reference(s), so HR's `us_lo_agreement` document is filled from DMS. Accounting switches on `COMMISSION_PLANS_FROM_HR` in prod | recruit-be, ai-hr-be, accounting | existing HR hand-off flags | S5 | ai-hr-be owner; Khai (accounting) | M |
| **S9** | **Staging E2E and go-live.** Run end to end on staging with bao.trinh+ accounts: PayPal sandbox, the DE staging Inkless (packs warns its staging Inkless account is the billable prod one, so cap test envelopes). Then prod: turn the flags on for new offers only, measure the first 10 LOs against MOSO (paid, signed, files, mails), and keep D230/D246 alive for in-flight. P6 later removes the packs path, the mirror and `?key=` | all | — | S1–S8 | Bao go per flag | S |

**Order:** S0 → S1 → (S2 ∥ S3 ∥ S4) → S5 → (S6 ∥ S7) → S8 → S9.
- S1 to S3 already give a working "profile + pay on Recruit" on staging.
- E-sign waits on Khai's review of S4.
- Rough effort: ~2 weeks of build plus review latency on S4/S7/S8, which matches the earlier P4 estimate.

### Risks

1. **A payment captured but not recorded.** The capture happens in the browser and the server checks afterwards. packs refuses an order whose `update_time` is more than **60 s** old, so a slow network or a retry leaves a paid LO marked unpaid. Port the check exactly (Bao: same rules), but add:
   - an idempotent retry from the page
   - an alert on "captured, not recorded"
   - a way for a manager to accept a verified order id

   Loosening the 60 s rule is Q3.
2. **Double envelopes or double billing.** Inkless bills per envelope. Use one idempotency key per offer and doc set, supersede instead of resend, and never build an envelope for a `?key=` (MOSO) row.
3. **Two systems sending to the same LO.** Without S7, MOSO keeps sending `pre_onboarding_done` and the daily reminder with MOSO links, and builds its own envelope when the 1-1 is written back. **S7 must be on before any prod LO gets a token link.**
4. **Lost MOSO side effects.** Status, escalation tickets, Modex sync, LOA mails and the background-check mail are invisible today but someone relies on them. Either mirror them (S7) or replace them (S6), one by one, each one listed.
5. **Agreement text parity.** The DE 1099/W-2 are 22-page HTML rebuilds of MOSO's PDF forms. The legacy `ilo_1099`/`olo_w2` rebuilds are partial (3/10 and 4/11 pages), so they must never be sent, only treated as "already signed".
6. **The token is a bearer secret in an email.** It opens address and licensing PII (no SSN; the portal never shows it). Mitigations: hash it at rest, expire it, rotate it on resend, rate-limit, no existence oracle, server-side calls only.
7. **In-flight LOs.** At go-live there are ~40 open envelopes and SENT offers in MOSO. They keep `?key=` and finish in MOSO.
8. **lo-homepage twin and the old GWT form.** These are paths we might forget. Measure their traffic before deciding (Q8).

---

## 4. Before vs after: one example

*Example LO (fictional): Maria, a 1099 Loan Officer licensed in VA and TX, with CA sponsorship and no DRE endorsement. Her required documents are 1099 + exclusive agent + CA compliance.*

**Before (today):**
1. Her recruiter's offer is approved in Recruit, and MOSO emails her `/apply_loan_officer?key=ahNz…`.
2. She opens it on loanfactory.com: lf-homepage rewrites it to `/register-loan-officer`, and every click goes to packs.
3. She fills in her profile and books the 1-1.
4. The specialist marks the 1-1 done. MOSO emails her "Review and sign" and quietly builds an Inkless envelope from MOSO's PDF forms.
5. She pays $100 with PayPal. packs checks the order within 60 s and flips `paid_startup_fee`. MOSO emails her and the LOA.
6. The page asks packs for the link. She signs three documents on Inkless, and Inkless sends her back to `/apply_loan_officer`.
7. packs stores the files in MOSO, flips `lo_agreement_signed`, emails her, and pushes the row to Recruit. Recruit then *mirrors* PAID and SIGNED (and the 20-min reconcile catches a missed push).
8. Recruit shows "Joined", and the onboarding specialist sends her to HR.

**After (P4 on):**
1. The approved offer creates an onboarding token. Recruit emails her (From: her onboarding specialist) `loanfactory.com/register-loan-officer?t=…`.
2. The same page and the same steps, but the page's server talks to recruit-be.
3. Her profile is saved on her Recruit record. The 1-1 is done in Recruit.
4. She pays $100 with the same PayPal button and the same PayPal account. **recruit-be** verifies the order and writes `fee_payments` + FEE_PAID.
5. Recruit asks document-esign for one Inkless envelope with `1099_agreement_form_finalized + exclusive_agent_agreement + ca_compliance_statement`, filled from her Recruit data.
6. She signs. document-esign's COMPLETED event marks the offer SIGNED and keeps the signed PDFs in DMS. Recruit emails her the confirmation, and the Send to HR payload carries the agreement.
7. MOSO receives only the thin "paid / signed" mirror until P6, and sends her nothing.

For Maria nothing changes: the same page, the same $100, the same documents.

---

## 5. Open questions

For Bao:
1. **Token link lifetime.** Does it live until the offer closes, or N days with a "send me a new link"? Can one person hold two live links, after a resend?
2. **Thin mirror of paid/signed back to packs (S7).** This is a new write kind, against the 23/10 "no new write kinds" rule. Do we allow it until P6, or must each MOSO side effect be replaced first? Which of those effects are still used: escalation-desk tickets, `status`, Modex sync, LOA mails?
3. **The 60-second PayPal freshness rule.** Keep it exactly (parity), or drop it in favour of the "order id unique + amount + payee" checks plus a captured-not-recorded alert? The LO sees no difference either way.
4. **Who compares the PDFs** (S5 gate), and is one PDF of each of the 6 document combinations enough?
5. **Self-applied LOs** (no invite yet) keep the packs `?key=` flow until they are invited. OK?
6. **Accounting.** packs records the fee nowhere but Datastore today. Is the `fee_payments` ledger in Recruit enough, or must each payment also reach accounting-be? Epic text says "recorded in accounting".

For Khai:
7. **Inkless tenant.** Is DE's `esign_settings` the same Inkless account as packs' `DisclosureSetting`? Is there a non-billable staging Inkless for DE?
8. **lo-homepage `/register-loan-officer`.** Does it get real traffic, so it needs the same adapter, or can it redirect to lf-homepage?
9. **DE design.** For the RECRUIT type: a new `ServiceType` plus a non-loan signer path (preferred), or another shape you would rather review?
10. **PayPal credentials.** Will you or DevOps copy the existing client id and secret into Secret Manager for recruit-be (prod), and create a sandbox app for staging?
11. **Packs PR (S7).** Is a per-row marker (`agreement_flow=RECRUIT_V3`) acceptable for skipping `afterSave` envelopes and mails?
