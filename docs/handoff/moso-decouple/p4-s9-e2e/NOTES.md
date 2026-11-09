# P4 S9: one repeatable staging E2E for a Recruit-only Loan Officer (no MOSO record)

Bead `agentflow-0gwad.5` (P4). STAGING ONLY. Every address the run creates is `bao.trinh+…@loanfactory.com`; no SMS; no
production setting is read or written. **No token, secret or PII is in this folder:** the admin bearer is read from a
file, the portal link lives in a `0600` file inside the run folder and is deleted at the end, and the results print only
ids, statuses and shapes (`?invite=<43 chars>`).

This is the regression check for the one-go production switch: run it before and after flipping the P4 flags.

## The journey and what each step asserts

| # | Step | Asserted through |
|---|---|---|
| 0 | Preflight | `GET /config/candidate-view`: admin token valid, `invite_needs_moso_record=false` |
| 1a/1b | (fallback only, `--lower-captcha`) reCAPTCHA min score 0, then back to 0.5 | `gcloud run services update lf-homepage-master --update-env-vars` + read-back; times logged. The default run uses the staging captcha bypass instead (below) |
| 1 | Public REFER form on `www.viet18.com/refer/refer-a-loan-officer`, headed Chrome, lead e-mail `bao.trinh+p3only-s9<tag>@` (the lf staging canary `RECRUIT_INTAKE_RECRUIT_ONLY=bao.trinh+p3only*@loanfactory.com`) | network: `recruit-intake` **201**, `moso_post:false`, **0** packs `submitReferALoanOfficer` calls |
| 2 | Lead exists with no MOSO record | DB: exactly 1 row for the e-mail, `legacy_key` null, `intake_client` set |
| 3 | Claim | API: `owner_id` = the admin, stage `S1` |
| 4 | Production figures + NMLS (`offer-figures-required`) | API `PUT /candidates/{id}` 200 |
| 5 | Offer requested with `approve_now` | API: 201, offer `SENT`, fee `PENDING`, specialist assigned, lead `S5` (hand-off; no invite mail on staging, D207/D354) |
| 6 | 1-1 scheduled on behalf (slot two hours ago, no meeting link, no colleagues) | API 200 |
| 7 | 1-1 DONE (`INDEPENDENT`/`contract`, today in `America/Los_Angeles`, D402) | API 200; DB `lo_mail_sends` `WELCOME` **SENT** whose stored body carries `register-loan-officer?invite=REDACTED` |
| 8 | Staff portal link | API `POST /offers/{id}/onboarding-link`: `?invite=` + 43 chars and `profile` answers 200 (it rotates the welcome's link by the S1 rule; minted again if a late mail rotated it) |
| 9 | Portal profile save | lf proxy `POST <lf Cloud Run>/webplus-api/onboarding/save` 200, read back via `profile`; a desktop shot of the portal |
| 10 | Start-up fee | headed Chrome on the portal link, PayPal guest card with PayPal's documented **sandbox** test Visa `4012 8888 8888 1881` (no real card): `fee-paypal` 200 `PAID`; DB `offers.fee_status=PAID`, a `fee_payments` row `PAID` with a capture id |
| 11 | Paid mails (D404) | DB `lo_mail_sends` kind `FEE_PAID`: the LO's `tpl-lo-fee-paid` **SENT**; no staff copy SENT to a non-test address (the staging allowlist refuses real staff) |
| 12 | Sign step | lf proxy `signing-link`: **404 = BLOCKED** while `recruit.features.esign-de` is off (expected today). When it answers 200 `READY`, the run opens the Inkless page in Chrome and waits (`--sign-wait-min`, default 20) for `SIGNED` |
| 13 | Joined | API: stage `S6` (D167 auto-stage after signed + paid) |
| 14 | Automatic Send to HR, HR hired | API `GET /candidates/{id}/hr-handoff` `delivery=delivered` within 12 min (cron every 5 min); DB `hr_handoff_outbox` `SENT`. HR's own answer is the recruit-be log line `HR handoff delivered: result=…` |
| 15 | Archive | API `POST /candidates/bulk-archive` 200; DB status `ARCHIVED` and **0** live portal links (D401) |

The run prints one PASS / FAIL / BLOCKED / SKIP table and writes `run-<tag>/results.txt`, `results.json`,
`state.json` and the shots.

## How to run

```bash
cd docs/handoff/moso-decouple/p4-s9-e2e
tok=$(~/.claude/bin/ram-gate acquire chrome s9-e2e --wait 900) && \
( cd ~/.cache/claude-recruit/preview && NODE_PATH=/Users/apple/.npm/_npx/e41f203b7505f1fb/node_modules \
    node alltokens.js /Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts . | grep '^3370' ) && \
NODE_PATH=/Users/apple/.npm/_npx/e41f203b7505f1fb/node_modules node s9-e2e.js; \
~/.claude/bin/ram-gate release $tok
```

- **Prerequisites:** gcloud logged in as Bao (GKE context `gke_lenderrate-master_us-central1_moso-kube` for the
  read-only DB pod `~/.cache/claude-recruit/pgq_stg.sh`, and Cloud Run for `--lower-captcha`); the admin token file
  `~/.cache/claude-recruit/preview/stg_3370.token` (expires after about an hour: refresh first, as above); Google Chrome
  installed (PayPal refuses the headless card popup; the inline card form works only in headed Chrome).
- **reCAPTCHA (staging test bypass, the default):** automated Chrome scores 0 on reCAPTCHA v3, so the site route
  refuses a scripted lead at the normal 0.5. lf-homepage #2736 / lo-homepage #944 (merged into `master` 09/11) add
  `RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS`: for a matching e-mail the route accepts any score, but the token must still
  verify. It works only in a staging build (`NEXT_PUBLIC_ENV=staging`); a production build ignores it (tested), and each
  bypass logs a count only. **One-time setup after Bao's gcloud login** (the run's lead e-mail matches it):
  ```bash
  gcloud run services update lf-homepage-master --project lenderrate-master --region us-central1 \
    --update-env-vars='RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS=bao.trinh+p3only-s9*@loanfactory.com'
  ```
  (`--update-env-vars` only, never `--set-env-vars`, which wipes the other variables.) Check the log line
  `recruit-intake captcha score bypass (staging test allowlist) count=N` after a run.
- **`--lower-captcha` (fallback):** if the bypass is not deployed or set, this lowers `RECRUIT_INTAKE_MIN_SCORE` on
  `lf-homepage-master` to 0 for the form step only and restores 0.5 in a `finally`, reading both values back.
- **When esign-de is on (after S4/S5):** `node s9-e2e.js --lower-captcha --keep` runs to the signing page and keeps the
  lead; sign it in the opened Chrome window. If the wait runs out, continue later with
  `node s9-e2e.js --resume run-<tag>/state.json` (re-mints the portal link if it was deleted), then archive with a plain
  `--resume` run (no `--keep`).
- **No gcloud session (e.g. overnight):** `node s9-e2e.js --add-lead --no-db` makes the lead with the admin "Add lead"
  instead of the form and skips the DB-only checks (mail rows, `fee_payments`, link revocation); every API, portal and
  PayPal check still runs. It is a partial check, not the regression run.
- **Exit code** is the number of FAIL rows (0 = green). BLOCKED is not a failure: it names a flag that is off on purpose.

## Safety choices

- The 1-1 is scheduled **without** a meeting link or colleagues. The on-behalf route invites the assigned specialist, and
  staging specialists are real staff: the run never asks for a Google invite to anyone but test aliases.
- The lead's e-mail matches the lf canary, so packs never receives it (no MOSO record, no MOSO mail).
- The staging Loan Officer mail allowlist (`bao.trinh+*@loanfactory.com`) is the guard for staff copies of the paid
  mail; step 11 fails if any FEE_PAID copy was SENT to a non-test address.
- Every run archives its lead (unless `--keep`), which revokes its portal links.

## Results, first runs (08/11 21:57 - 09/11 02:10 VN)

**Run A, full mode** (`--lower-captcha`, DB on), tag `dyttv`, candidate `1a8cbbc4-faad-4f9a-bf40-fa889b6a6b3e`, offer
`27e41a02-5593-44ff-94d1-51bf492a62f0`, 14:57-15:02Z:

| Step | Result | Detail |
|---|---|---|
| 0 preflight | PASS | `invite_needs_moso_record=false` |
| 1a min score 0 | PASS | lowered 14:57:18Z |
| 1 public REFER form (canary) | PASS | `recruit-intake` 201, `moso_post=false`, 0 packs calls |
| 1b min score 0.5 | PASS | restored 14:58:22Z, read back 0.5 (**64 s at 0**) |
| 2 lead, no MOSO record | PASS | 1 row, `intake_client=lf-homepage`, `legacy_key` null, S0 |
| 3 claim | PASS | owner = admin, S1 |
| 4 figures + NMLS | PASS | |
| 5 offer approve | PASS | SENT, fee PENDING, specialist auto-assigned, lead S5 |
| 6 1-1 scheduled | PASS | slot stored, no meeting link |
| 7 1-1 DONE + welcome | PASS | `WELCOME` SENT, body `?invite=REDACTED` |
| 8 portal link | PASS | `?invite=<43 chars>` |
| 9 portal profile save | PASS | save 200, read back |
| 10 PayPal fee | **FAIL** (script) | no PayPal buttons: the page stopped at "Fill Out Basic Information" because the save did not mark the detail form done |
| 11 paid mails | FAIL (follows 10) | no FEE_PAID row, nothing was paid |
| 12 sign | BLOCKED | `signing-link` 404, esign-de off |
| 13 Joined | BLOCKED | needs 12 |
| 14 Send to HR | BLOCKED | needs 13 |
| 15 archive | PASS | ARCHIVED, 0 live portal links |

**Script fixes after run A** (both are what the portal's own pages send, not product changes): the profile save now
sends `completed_detail_form: true` and `complete_percentage: 0.25` (what Basic Info's save sends), and answers the
later-step website gate (`has_mortgage_website: false`, `mortgage_website_approval_ack: true`), which otherwise
stands in front of the fee step (`10-no-paypal.png` shows it, run `xwety`).

**Run B** (`--lower-captcha`, 18:33Z) did not run past step 1: **Bao's gcloud session expired** (`gcloud auth login`
needed). The min-score update was refused by gcloud before it changed anything, so the value stayed 0.5 (last read
back 14:58:22Z); the form then got `recruit-intake` 400 (score 0 < 0.5) and no lead was made. The DB pod could not
start either.

**Run C, partial** (`--add-lead --no-db`), tag `gdpfw`, candidate `8df0080c-3c0b-4464-a564-ff720dbcfa13`, offer
`2240f884-2f52-481d-bc68-1afa6221be30`, 19:04-19:08Z: **PASS 11, FAIL 0, BLOCKED 3, SKIP 2.**

| Step | Result | Detail |
|---|---|---|
| 1 form | SKIP | `--add-lead` |
| 2-9 | PASS | as run A (no DB checks) |
| 10 PayPal fee | **PASS** | order `7YN49073Y4213880V` (sandbox): `fee-paypal` PAID, offer `fee_status` PAID |
| 11 paid mails | SKIP | no DB |
| 12-14 | BLOCKED | esign-de off |
| 15 archive | PASS | ARCHIVED |


**Run D, partial, after switching to the bypass** (`--add-lead --no-db`, 09/11 ~00:14Z), tag `vnhdg`, candidate
`83d5f4ae-2e10-4cfe-8292-498c6177fad4`, offer `725da115-436f-4e57-995b-7495f6dbc733`: **PASS 11, FAIL 0, BLOCKED 3,
SKIP 2**, PayPal sandbox order `4P023019DN285910S` PAID (`10-after-pay.png`). Two more script fixes came out of the
runs before it: a random phone outside the reused test range (an existing phone, even archived, is a 409), and a wait
for the welcome mail before minting the staff link (the welcome rotates any older link, D368), with a re-mint if a
late mail still rotates it.

**Together, A + C/D cover every step up to the signature on staging.** What is still owed:
1. **DONE 09/11** (run F 02:40Z, then run E 03:36Z). One clean full-mode run after Bao's `gcloud auth login`: set the bypass variable (above), confirm the
   lf staging revision runs `777ff9ad` or later, then the default command (form + DB + PayPal in one run, including
   step 11's FEE_PAID rows). About 6 minutes.
2. **Steps 12-14** after S4 (document-esign, Khai) and S5 (`esign-de` on in staging): `--keep`, sign in the opened
   window, then `--resume`.

All leads are ARCHIVED (`dyttv`, `xwety`, `gdpfw`, `anyup`, `vnhdg`, `jmpyh`; `zytdh` and `gjyta` never became a lead). The portal link files were
deleted by the runs.

## Shots

| File | Shows |
|---|---|
| `1-form-filled.png` | the public REFER form filled with the canary test lead (run A) |
| `1-form-submitted.png` | after submit (run A) |
| `9-portal-desktop.png` | the portal opened from the staff `?invite=` link (run C) |
| `10-no-paypal.png` | why run A stopped: the website question in front of the fee step |
| `10-fee-step.png` | the fee step with the PayPal and card buttons (run C) |
| `10-card-filled.png` | PayPal's inline card form with the documented sandbox test Visa (run C) |
| `10-after-pay.png` | after payment: the fee step shows the green check (run D) |


## Run E (09/11, esign-de ON)

Full mode (form + DB + PayPal), `--keep --sign-wait-min 1`, tag `jnerz`, candidate
`0e11ff83-a24c-4e71-bcd5-6c3d026aabfa`, offer `f65bfb4d-bff9-49a3-ac85-44eecea8caba`, 03:36-03:40Z, on document-esign
`6782ea42` (#138, Flyway V52 applied) and recruit-be `ea078bc7` (#937, pod env `RECRUIT_FEATURES_ESIGN_DE=true`).
**PASS 12, FAIL 1, BLOCKED 2, SKIP 1** (`results-run-e.txt`).

- Steps 0-11 PASS in one run (the first clean full-mode run): form via the staging captcha bypass, `recruit-intake` 201,
  0 packs calls, lead with no MOSO record, offer SENT, WELCOME SENT, PayPal sandbox order `4BP67509SU333561W` PAID,
  `fee_payments` PAID, LO `FEE_PAID` mail SENT, staff copies SKIPPED.
- **Step 12 FAIL: `signing-link` 503** ("Signing is not available right now"). The flag is on; the cause is document-esign
  staging's global admin switch `esign_settings.use_inkless = false` (`GET /internal/api/v1/esign/availability` answers
  `{"useInkless":false,"inklessConfigured":true}`), so `AgreementSigning.send` refuses before any envelope is made (Bao
  23/10: Inkless only). The four agreement templates exist (ACTIVE) and carry `enable_inkless: true`. **0
  `agreement_envelopes` rows** for the offer, nothing was sent to Inkless.
- Steps 13-14 BLOCKED (need 12); 15 SKIP (`--keep`).
- The lead is kept (ACTIVE, S5, fee PAID) for `node s9-e2e.js --resume run-jnerz/state.json` once the switch is on.
  Turning it on is a global staging change for every document-esign caller (LOS disclosures then go through paid
  Inkless), so it waits for the owner's decision.
- Not seen in recruit-be's log: the refusal leaves only the controller's generic `BaseException` line; there is no
  `esign_de.*` warning naming "Inkless is not available". Worth a log line before production.

### Run E, part 2 (09/11 03:54-04:25Z): Inkless on, second blocker in document-esign

- **`use_inkless` on staging DE**, approved by the document-esign owner (Hoàng Tuấn, Slack 09/11 10:53 VN): before
  `false` (last changed 2026-10-02T17:59:59Z), after `true` at 2026-11-09T03:54:19Z; `/availability` now answers
  `{"useInkless":true,"inklessConfigured":true}`. Call: port-forward `svc/document-esign` 18092:8092, then
  `PUT /internal/api/v1/esign/settings` with `X-Service-Source: LOS`, `X-Acting-User: system:recruit-s9-e2e-bao`, body
  `{"useInkless":true}` (camelCase: snake_case is `400 INVALID_BODY`). **Revert** = the same call with
  `{"useInkless":false}`. Left ON pending Tuấn.
- **Resume, signing-link 503 again** (03:54:28Z). document-esign: `Generate-and-send: source=ILO_AGREEMENT RECRUIT
  <offer> (1 docs)`, the RECRUIT folders were created, then `Send failed (TemplateRenderException) — released idempotency
  key`, `400 BAD_REQUEST`. **No envelope was created** (still 0 `agreement_envelopes` rows; Inkless was not called).
- **Root cause (document-esign):** for an Inkless send, `withSignatureTags(inert=true)` fills `signer_N_date` with the
  inert tag `|d1|`. `validateVariables` then checks DATE variables against `TemplateDateValue.SIGNER_ANCHOR`
  (`\\[sd]\d+\\`), which accepts only the backslash form. `1099_agreement_form_finalized` declares `signer_1_date` as a
  required DATE with no `signerNumber`. Reproduced on the internal render route (PREVIEW, test name only):
  `signer_1_date="|d1|"` gives `400 Invalid date (expected MM/DD/YYYY): signer_1_date`; `"\d1\"` gives 200. The built-in
  path (use_inkless off) prints the backslash form, which is why nobody had hit this before.
- **Wider effect:** 116 templates on DE master combine `enable_inkless: true` with a DATE `signer_N_date` that has no
  signer number (e.g. `w2_agreement_form_finalized`, `privacy_notice`, `usa_patriot_act_disclosure`, `vorm`). While
  `use_inkless` is on, every staging Inkless send of these should fail the same way.
- **Fix needed in document-esign** (owner Tuấn): `SIGNER_ANCHOR` also accepts the inert form `\|[sd]\d+\|`, with a
  test. After it is on staging, resume with `node s9-e2e.js --resume run-jnerz/state.json --keep`, sign the one
  envelope, then a plain `--resume` for steps 13-15. The lead `jnerz` is kept (ACTIVE, S5, fee PAID).
- **recruit-be #939** (merged `b5f381c0`, on staging 04:25Z): `WARN esign_de.inkless_unavailable offer=<id>
  use_inkless=<b> inkless_configured=<b>` before the Inkless refusal, with `AgreementSigningInklessTest`.

### Run E, part 3 (09/11 05:12-05:16Z): signed on document-esign's built-in path, steps 12-15 PASS

New scope (Bao + Vinh, Slack 09/11 11:08 VN): Recruit **staging** signs on document-esign's free **built-in** path;
staging DE keeps `use_inkless=false` (Inkless there bills the production account; it is turned on only for a deliberate
test, then off). Production stays Inkless-only. `use_inkless` was set back to `false` at ~04:10Z and stayed false
(read back 05:11Z).

- **recruit-be #940** (merged `c80b1889`, on staging 05:09Z): `recruit.esign-de.allow-built-in`
  (`RECRUIT_ESIGN_DE_ALLOW_BUILT_IN`), default false, `"true"` in the staging values only (`EsignDeAllowBuiltInFlagTest`
  keeps it out of production). With DE's Inkless off it sends `useInklessSend=false` and hands out DE's built-in link;
  a link read back is minted through DE's credentials route and reused for an hour (DE keeps 5 live links per signer).
  Flag off = the `esign_de.inkless_unavailable` refusal (#939), unchanged.
- **document-esign #140** (open, for Tuấn/Vinh, NOT merged): `SIGNER_ANCHOR` accepts the inert `|d1|` form; without it
  every Inkless send of 116 templates fails (Run E part 2).
- **One envelope** `19cf13dd-a032-4ae2-9442-699fd3d777af` (built-in, sent 05:12:11Z). Signed by automating tera-fe's
  signing page (`https://tera.viet18.com/esign/sign/<participant>?password=…`, no login): 4 "SIGN HERE" slots, typed
  signature, consent, "Finish and send". DE: built-in completion 05:13:43Z, signed PDF filed, COMPLETED published on
  `ESIGN_ENVELOPE_COMPLETED_TOPIC`; recruit-be's subscriber recorded it 05:13:44Z (`esign_de.offer_signed`).
- **Resume** (`--resume run-jnerz/state.json`, `results-run-e-resume.txt`): **PASS 5, FAIL 0** —
  12 signing-link `SIGNED`; 13 stage `S6`; 14 HR hand-off `delivered`, `hr_handoff_outbox` SENT, recruit-be log
  `HR handoff delivered: result=hired … status=201`; 15 ARCHIVED, 0 live portal links.
- **DB:** exactly 1 `agreement_envelopes` row, `COMPLETED`, `doc_set ["1099_agreement_form_finalized"]`,
  `signed_files [{template_code: 1099_agreement_form_finalized, signed_file_id: ebfef595-…}]`; offer `SIGNED`.
- **Signed documents** (expected for this combo: 1099, TX, no CA DRE, no VA/MS): `1099_agreement_form_finalized`,
  title "1099 Agreement Form", **22 pages** (the template's 22 printed pages). No CA statement, no exclusive agent
  agreement. Plus DE's master PDF of the envelope.

Run E, steps 0-15, has now passed on staging (0-11 in part 1, 12-15 here).

**What differs from production (built-in path, staging only):**
- The Loan Officer **does not return to `?signed=1`**: DE's built-in path ignores the per-signer `redirectUrl`; the
  page ends on tera-fe with "Thank you, your signature is recorded … Your loan officer can give you a copy … You can
  close this page." The tab title is "LOS" and the closing copy is borrower wording.
- No Inkless audit certificate (`certificate_file_id` / `inkless_signing_id` null).
- DE announces the send on `ESIGN_ENVELOPE_SENT_TOPIC` with the signing URL; tera-be's mailer handles only
  `service_type=LOAN`, so no LOS e-mail went to the Loan Officer.

**Before production:** production DE needs `use_inkless` on with its credentials, document-esign #140 (or every
Recruit agreement send fails the same way), and `RECRUIT_ESIGN_DE_ALLOW_BUILT_IN` must stay absent from production.

## Run F (09/11 02:40-02:44Z, esign-de still OFF, ran before run E)

Default command (form + DB + PayPal, no flags), tag `jmpyh`, candidate `43c696e2-741a-4dc1-91f5-884600ed2d20`, offer
`2e625132-3cb5-4e52-84b3-14a84d11dce9`. Setup right before it: `RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS=bao.trinh+p3only-s9*@loanfactory.com`
set on `lf-homepage-master` with `--update-env-vars` (revision `01627-7ck`, image `777ff9ad`, the other 11 variables
kept, `RECRUIT_INTAKE_MIN_SCORE` still 0.5). lf log 02:40:22Z: `captcha score=0 ... ok=true`, then `captcha score bypass
(staging test allowlist) count=1`. **PASS 13, FAIL 0, BLOCKED 3, SKIP 0** (`results-run-f.txt`):

| Step | Result | Detail |
|---|---|---|
| 0 preflight | PASS | `invite_needs_moso_record=false` |
| 1 public REFER form (canary, bypass) | PASS | `recruit-intake` 201, `moso_post=false`, 0 packs calls |
| 2 lead, no MOSO record (DB) | PASS | `intake_client=lf-homepage`, `legacy_key` null, S0 |
| 3 claim | PASS | owner = admin, S1 |
| 4 figures + NMLS | PASS | |
| 5 offer approve | PASS | SENT, fee PENDING, specialist assigned, lead S5 |
| 6 1-1 scheduled | PASS | no meeting link |
| 7 1-1 DONE + welcome | PASS | `WELCOME` SENT, body `?invite=REDACTED` |
| 8 portal link | PASS | `?invite=<43 chars>`, profile 200 |
| 9 portal profile save | PASS | save 200, read back, `complete_percentage` 0.25 |
| 10 PayPal sandbox fee | PASS | order `17W314786K8996507`: `fee-paypal` PAID, `offers.fee_status` PAID, `fee_payments` PAID with capture |
| 11 paid mails (D404) | PASS | LO `FEE_PAID` SENT; both staff copies SKIPPED (not sent) |
| 12 sign | BLOCKED | `signing-link` 404, esign-de was still off |
| 13 Joined | BLOCKED | needs 12 |
| 14 Send to HR | BLOCKED | needs 13 |
| 15 archive | PASS | ARCHIVED, 0 live portal links |

## Run F (Inkless after #140), 09/11 07:14-07:45Z

Approved by Bao (09/11 ~14:10 VN): one Inkless re-test now that document-esign #140 (inert `|d1|` anchor) is merged
(`e558dd48`, DE staging deploy run 42577044373 green, pod `document-esign-6c48f9f746-tltpt` Ready 07:20Z). Tag `qqmxr`,
candidate `59a7769f-73fe-433e-a2b5-97deb745e291`, offer `5049c5d7-5051-4311-9e43-1b6835e7c0e7`.

- **Steps 0-11 PASS** in full mode, stopped before the sign step (a local copy of the script with
  `--stop-before-sign`, so `signing-link` was never asked while `use_inkless` was false, which would have taken the
  built-in path). Step 10 first failed twice: PayPal's card form refused the billing last name
  ("This last name uses unsupported characters", the random tag `NineQqmxr`); the retry used the billing last name
  `Tester` and paid (sandbox order `1NN34500PV980401N`). **Script fix owed:** fill the card's billing last name with a
  fixed plain word, not the tag.
- **Inkless window, about 6 s:** `use_inkless` ON at **07:31:54.6Z**, `signing-link` asked once, OFF at
  **07:32:00.4Z** and read back `false` (again at 07:46:22Z). DE reads the global switch only at send time; Inkless
  completion comes by webhook and needs no switch. The proxy answered 503 at 07:32:00Z because the DE send took 9.5 s
  (render + Inkless upload) and the lf proxy gave up first; recruit-be still recorded the envelope at 07:32:04Z.
  **Exactly one Inkless envelope**, `bf629712-7c69-416a-8e48-f94ac46f4168` (Inkless id `a961bda7-…`); the next
  `signing-link` reused it (no availability check, no send).
- **Signed on Inkless** by automating `secure.inklesshub.com`: I Accept, START, the remembered typed signature
  ("Set Signature" once), 4 of 4 places (the dates auto-filled), "Complete Signing". Inkless redirected to
  **`www.viet18.com/register-loan-officer?signed=1`**: "Thank you for signing. We are recording your signature now…".
- **Completion:** Inkless webhook 07:43Z → DE `SENT → COMPLETED`, **audit certificate downloaded** (701,226 bytes,
  3 pages), master + certificate + signed-with-certificate + per-document files filed, COMPLETED published;
  recruit-be's subscriber recorded it 07:43:26Z (`esign_de.offer_signed`), armed the HR hand-off.
- **Resume** (`results-run-f.txt`): **PASS 5, FAIL 0**: 12 `SIGNED`; 13 `S6`; 14 HR `delivered`,
  `hr_handoff_outbox` SENT, log `HR handoff delivered: result=hired`; 15 ARCHIVED, 0 live portal links.
- **DB:** 1 `agreement_envelopes` row, `COMPLETED`, `doc_set ["1099_agreement_form_finalized"]`, `signed_files` 1
  (`bbfa4c06-…`); offer `SIGNED`.
- **Signed documents:** `1099_agreement_form_finalized`: **25 pages** = the 22 agreement pages (title and the
  initials footer on each) + 3 Inkless pages at the end, the same count as the separate 3-page certificate. (The
  built-in file in Run E part 3 was 22 pages.) No CA statement, no exclusive agent agreement (1099 + TX).
- **Seen, not blocking:** DE logged `InklessAnchorPlacer: 8 of 8 signature/date tag(s) found no rule to snap to … placed
  at their text baseline`; on the page the signature box sat on the "By" line.
- `use_inkless` is **false** on staging.
