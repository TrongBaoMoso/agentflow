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
| 1a/1b | reCAPTCHA min score 0, then back to 0.5 (only with `--lower-captcha`) | `gcloud run services update lf-homepage-master --update-env-vars` + read-back; times logged |
| 1 | Public REFER form on `www.viet18.com/refer/refer-a-loan-officer`, headed Chrome, lead e-mail `bao.trinh+p3only-s9<tag>@` (the lf staging canary `RECRUIT_INTAKE_RECRUIT_ONLY=bao.trinh+p3only*@loanfactory.com`) | network: `recruit-intake` **201**, `moso_post:false`, **0** packs `submitReferALoanOfficer` calls |
| 2 | Lead exists with no MOSO record | DB: exactly 1 row for the e-mail, `legacy_key` null, `intake_client` set |
| 3 | Claim | API: `owner_id` = the admin, stage `S1` |
| 4 | Production figures + NMLS (`offer-figures-required`) | API `PUT /candidates/{id}` 200 |
| 5 | Offer requested with `approve_now` | API: 201, offer `SENT`, fee `PENDING`, specialist assigned, lead `S5` (hand-off; no invite mail on staging, D207/D354) |
| 6 | 1-1 scheduled on behalf (slot two hours ago, no meeting link, no colleagues) | API 200 |
| 7 | 1-1 DONE (`INDEPENDENT`/`contract`, today in `America/Los_Angeles`, D402) | API 200; DB `lo_mail_sends` `WELCOME` **SENT** whose stored body carries `register-loan-officer?invite=REDACTED` |
| 8 | Staff portal link | API `POST /offers/{id}/onboarding-link`: `?invite=` + 43 chars (rotates the welcome's link, by the S1 rule) |
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
NODE_PATH=/Users/apple/.npm/_npx/e41f203b7505f1fb/node_modules node s9-e2e.js --lower-captcha; \
~/.claude/bin/ram-gate release $tok
```

- **Prerequisites:** gcloud logged in as Bao (GKE context `gke_lenderrate-master_us-central1_moso-kube` for the
  read-only DB pod `~/.cache/claude-recruit/pgq_stg.sh`, and Cloud Run for `--lower-captcha`); the admin token file
  `~/.cache/claude-recruit/preview/stg_3370.token` (expires after about an hour: refresh first, as above); Google Chrome
  installed (PayPal refuses the headless card popup; the inline card form works only in headed Chrome).
- **`--lower-captcha`:** automated Chrome scores 0 on reCAPTCHA v3, so the site route refuses the lead at the normal
  0.5. The flag lowers `RECRUIT_INTAKE_MIN_SCORE` on `lf-homepage-master` to 0 for the form step only (about a minute,
  one new revision each way) and restores 0.5 in a `finally`, reading both values back. Without it, step 1 fails.
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

**Together, A + C cover every step up to the signature on staging.** What is still owed:
1. **One clean full-mode run** after Bao's `gcloud auth login` (form + DB + PayPal in one run, including step 11's
   FEE_PAID rows). Command above; about 6 minutes.
2. **Steps 12-14** after S4 (document-esign, Khai) and S5 (`esign-de` on in staging): `--keep`, sign in the opened
   window, then `--resume`.

All four leads are ARCHIVED (`dyttv`, `xwety`, `gdpfw`; `zytdh` never became a lead). The portal link files were
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

