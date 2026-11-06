# P4 S2 on staging: wiring + end-to-end run (06/11/2026)

Bead `agentflow-0gwad.5.5`. The S2 adapter is [P4-S2.md](../P4-S2.md) (lf-homepage #2702, merged as `7d74a7a15`).
This folder is the staging proof. **No secret values are in this folder or in any log.**

## Result

The `?t=` portal works end to end on staging: lf-homepage → `/webplus-api/onboarding/*` → recruit-be. It reads the profile, saves it to Recruit and reloads it, and shows the fee step failing closed. The `?key=` (packs) path is unchanged.

The run found one real bug: every `?t=` save of a fresh profile answered 400. It was fixed in recruit-be #885 (below).

## What was wired

| Where | What | Status |
|---|---|---|
| Secret Manager `lenderrate-master` | `recruit-be-recruit-onboarding-portal-api-keys` v1 = `lf-homepage:<64 hex>` | added |
| recruit-be | `helm-chart/config/staging/secret-keys.txt` += `RECRUIT_ONBOARDING_PORTAL_API_KEYS` | #883, `4ccf7d6d1`, on staging |
| recruit-be k8s (`recruit-be` ns) | `recruit-svc-secret` has the key name `RECRUIT_ONBOARDING_PORTAL_API_KEYS` (35 keys) | yes (names checked only) |
| lf-homepage staging Cloud Run `lf-homepage-master` (lenderrate-master) | `RECRUIT_ONBOARDING_PORTAL=true`, `RECRUIT_ONBOARDING_PORTAL_URL=https://gateway.viet18.com/recruit-svc/public/api/v1/onboarding`, `RECRUIT_ONBOARDING_PORTAL_API_KEY` (plain env, same mechanism as `RECRUIT_INTAKE_API_KEY`) | set with `--update-env-vars`; 7 → 10 vars; revision `lf-homepage-master-01603-cxl`, image tag `7d74a7a15` |
| recruit-be `bool()` fix | a blank yes/no reads as not answered | #885, `b769bc108`, on staging |

The PayPal client-secret line is **not** in `secret-keys.txt`: that secret has no version yet, and the sync would stop the rollout.

### Gotcha: a secret-only change does not roll the pod

The deploy of #883 wrote the new key into `recruit-svc-secret` at 08:29:40Z. The pod kept running, because it was started at 08:22:53Z by the previous deploy:
- the image digest and pod template were unchanged, so Helm had nothing to roll;
- the chart has no secret-checksum annotation;
- `envFrom` is read only at container start.

The fix was `kubectl rollout restart deploy/recruit-be` on staging. Afterwards the pod had the env name, and a keyed call with an unknown token answered 404 instead of 401. **Any future secret-only PR needs the same restart, or a checksum annotation in the chart.**

## Bug found: blank yes/no answers (recruit-be #885)

- lf-homepage's `registerFormValues.ts` maps every null answer to `''`, and `buildSavePayload` sends it back as is.
- Eight yes/no fields do this when the loan officer leaves them alone: `brokerage`, `has_dre_endorsed`, `has_sos_licensed`, `has_dre_real_estate`, `practice_real_estate`, `confirm_sponsorship`, `has_mortgage_website`, `referrer_have_zelle_account`.
- recruit-be's `OnboardingProfileInput.bool` accepted only true, false or null. It answered 400 `brokerage must be true or false`, which lf mapped to 400.
- packs accepts `''`. The fix reads a blank text as null, the same rule `text`/`decimal` already follow. Test: `OnboardingProfileInputTest.blankBooleanIsNotAnswered`, RED before the fix and GREEN after.

### Review of #885 (independent, after merge)

The lead asked for a review before merge, but that message arrived after #885 was merged, so the review was done after the merge. A java-reviewer agent was given only the diff. It found 0 CRITICAL and 0 HIGH.
- **MEDIUM:** a blank answer is applied as "clear the stored value", not "leave as is". This is the same as an explicit `null`, which behaved this way before the PR.
  - Checked against lf: the page only sends `''` for a field whose stored value is null. Yes/no answers load as true/false, and only null becomes `''` (`registerFormValues.ts`). `give_nmls_access` is always true or false (`registerFormValues.ts:54`), and `completed_detail_form` is always `true` (`buildSavePayload.ts:21`).
  - So no stored answer is lost. No follow-up fix.
- **Guards:** traced and intact — the 1-1 lock on `is_corporate_loan_officer`, the `has_mortgage_website` keep-stored rule, and the approval-ack stamp.
- **LOW, not done:** `bool` does not trim `"true "`, and a few extra test cases could be added.

## E2E re-run after #885 (09:35-09:39Z, staging `b769bc108`)

The lead asked for a full re-run after the promote.
- **Staging outage:** shared Postgres (`postgres/postgresql-0`) was evicted and rescheduled around 09:30Z. For about 90 seconds the gateway answered 503 and the DB refused connections. It recovered on its own. It is unrelated to this work.
- **New links:** both links were minted again, which rotated their tokens. The earlier links are dead.

| Run | Result |
|---|---|
| Save, 1440 (`t08ch1`) | The profile reloaded from Recruit: the form showed alias `E2E`, `US Citizen` and `100 Test Street`, as written by the first run (`desktop-2-basic-info.png`). Alias changed to `E2E-RERUN`. `save` 200 (reCAPTCHA `success:true`), and the DB `alias_first_name` is now `E2E-RERUN` (`last_modified_date` 09:38:28Z) |
| Pay, 1440 + 375 (`t10af1`) | Fee step shows "Payment isn't available right now…" and 0 PayPal frames at both widths |
| `?key=`, 1440 + 375 | One packs `getRegisterLoanOfficer` 200 per width, 0 portal calls, no "Key is not exist" |

The screenshots and `calls.json` in this folder are from this re-run.

## E2E runs (first pass)

- Browser: headless Chromium (Playwright), driven by a script that read the links from 0600 files, which were deleted afterwards.
- Screenshots: viewport only, not full page.
- Popups: the video teaser was hidden. The cookie notice shows on some shots.
- `calls.json`: the network log for every run (portal action + status, packs call + status, reCAPTCHA result). It holds no URLs with tokens.

| Run | Lead (staging) | What happened |
|---|---|---|
| A: save, 1440 | `bao.trinh+t08ch1`, candidate `17b78bae-…`, offer `7a70ee84-…` (SENT, fee PENDING, 1-1 not done) | `profile` / `fee-config` / `page-texts` 200. Step 2 filled; reCAPTCHA `success:true`; `save` **200**. Recruit then has a new `onboarding_profiles` row: street `100 Test Street`, zip `77002`, city `Houston`, alias `E2E`, citizenship `us_citizen`, `has_mortgage_website=false`, `rocket_target_compensation=2.000`, ack `true`, and `brokerage` null (left blank). The fee step stays locked ("AFTER YOUR CALL", no button and no notice), which is correct before the 1-1 |
| B: pay, 1440 then 375 | `bao.trinh+t10af1`, candidate `283dabaf-…`, offer `a97e4bf2-…` (SENT, fee PENDING, `pre_onboarding_done`) | Intro shows the post-call copy and "PAYMENT DUE" (Recruit's meeting status). Step 2 saved (200, row written). Fee step shows **"Payment isn't available right now…"** (`#register-lo-paying-unavailable`) and 0 PayPal frames. That is the correct fail-closed state, because recruit-be staging has no PayPal client id yet (S0b). The 375 run re-opened the link and landed straight on the fee step: the saved state reloads from Recruit |
| C: `?key=`, 1440 + 375 | `bao.trinh+joinv2f0611` (MOSO legacy key) | Load only, no save. One packs `getRegisterLoanOfficer` 200 per width, **0 portal calls**, no "Key is not exist" |

**Links:** both links were minted through `POST /api/v1/offers/{id}/onboarding-link` with the staging admin token. Neither offer had a token before.
- Both links are still live (they expire 2027-02-04), but they are stored nowhere: the files are deleted.
- To kill them, mint again on the same offer (that rotates the token) or revoke the offer.

| File | Shows |
|---|---|
| `desktop-1-intro.png` | Run A intro (pre-call copy) |
| `desktop-2-basic-info.png` | Run A step 2 loaded from Recruit (identity fields read-only) |
| `desktop-3-after-save.png` | Run A after save: on step 3, locked "AFTER YOUR CALL" |
| `desktop-pay-1-intro.png`, `mobile-pay-1-intro.png` | Run B intro, post-call copy, at 1440 and 375 |
| `desktop-pay-2-fee-step.png`, `mobile-pay-2-fee-step.png` | Run B fee step with the "payment unavailable" notice |
| `desktop-key-link.png`, `mobile-key-link.png` | Run C, the `?key=` page loading from packs |

Not tested: a live PayPal payment (no sandbox app yet, S0b/S3) and the sign step (S4/S5 not built).

## Production: prepared, not deployed

- **Secret:** Secret Manager `lender-rate` `recruit-be-recruit-onboarding-portal-api-keys` **v1 added** = `lf-homepage:<separate 64-hex key>`.
  - This account cannot read it back. That is expected.
- **recruit-be draft PR #884** adds the same line to `helm-chart/config/production/secret-keys.txt`.
  - It rides the next prod release. Merge it in the same release that turns the portal on.
  - With the flag absent in prod, it changes nothing visible.
- **lf-homepage prod (`lf-homepage` in `lender-rate`): not touched.** At go-live, set these with `--update-env-vars` only:
  - `RECRUIT_ONBOARDING_PORTAL=true`;
  - `RECRUIT_ONBOARDING_PORTAL_URL=https://<prod gateway>/recruit-svc/public/api/v1/onboarding`;
  - `RECRUIT_ONBOARDING_PORTAL_API_KEY` = the part after `lf-homepage:` in the prod secret above.
  - That secret is the only place the prod key exists. Read it at go-live, by someone with accessor rights (DevOps), and pipe it straight into the update.
- **Also needed after the next prod release:** the same `kubectl rollout restart` as on staging, if the secret line ships without an image change.
