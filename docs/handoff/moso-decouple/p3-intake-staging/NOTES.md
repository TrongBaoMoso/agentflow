# P3 "Recruit primary" lead intake on staging (08/11/2026)

Bead `agentflow-0gwad.4.1` (parent `agentflow-0gwad.4`). recruit-be decision **D422**. Staging only; production untouched.

## What changed

The lf-homepage and lo-homepage Loan Officer forms now post to Recruit FIRST and to packs (MOSO) second.

- **Sites** (lf-homepage #2731, merge `8bcc6ae2`; lo-homepage #942, merge `cd752176`; both into `master` = staging):
  - `isRecruitIntakePrimaryOn()`: `NEXT_PUBLIC_RECRUIT_INTAKE_PRIMARY=true` or a staging build. Production builds pass neither.
  - Every form (register, `/join`, `/recruit/<slug>` picker, webinar card, Get in touch, Refer-a-LO) awaits
    `useRecruitIntake().first(lead)` (at most 7 s) before its packs call. Recruit creates the lead with its own key
    (no `moso_key`); the MOSO push that follows links to it by e-mail.
  - One Recruit post per submission. If Recruit did not confirm (timeout, error, route off), packs is still called and
    the MOSO push brings the lead to Recruit as before. There is no second post, so no duplicate.
  - The server route `/webplus-api/recruit-intake` now answers `moso_post`. It is `false` only for kind `REFER`, only when
    Recruit CREATED the lead (not a duplicate), and only when the new server env `RECRUIT_INTAKE_RECRUIT_ONLY` covers the
    e-mail (`off` default, `all`, or a comma list of e-mail globs). The Refer-a-LO page then skips packs.
  - On Refer-a-LO, a packs failure after Recruit took the referral is not shown as a failure.
- **Still on MOSO, deliberately:** webinar sign-ups (the dropdown lists MOSO webinars; P3b step 2 moves it to Recruit
  sessions) and the register / `/join` steps after the first save (they continue on the packs `?key=`).
- **recruit-be** (#912, squash `56040587`, promoted, staging deploy success, Flyway V346): in this order packs' registration clock is later than the intake's, so for a returning Loan
  Officer the D356 baseline alone would ring a second "Registered again". V346 adds `candidates.intake_raised_at`; a
  duplicate post stamps it (it does not slide inside the tolerance) and `LeadIntakeLinker#isSameSubmission` treats a push
  within `lead_intake.same_submission_tolerance_minutes` of it as the same submission.

## Staging env (Cloud Run, `--update-env-vars` only)

| Service | Var | Value | Note |
|---|---|---|---|
| lf-homepage-master, lo-homepage-master | `RECRUIT_INTAKE_RECRUIT_ONLY` | `bao.trinh+p3only*@loanfactory.com` | canary, kept; only these test addresses skip packs |
| same | `RECRUIT_INTAKE_MIN_SCORE` | `0` from 10:29Z to 13:34Z (E2E), then back to `0.5` (read back) | headless and headed automated Chrome scored **0** today, so every intake post got 400 at 0.5 |

## Measured before the change (today's dual mode)

- Staging DB, last 7 days: 66 form-type rows (WEB_FORM 41, REFERRAL 22, WEBINAR 3) came only through the MOSO push, all
  `bao.trinh+` test leads (`joinv2*`, `vicdemo*`, `selfho*`, `loref-*`, `d397a`). 8 rows ever came through the intake.
  The automated browsers that made them score 0 on reCAPTCHA, which is enough to explain the gap (see below).
- `bao.trinh+p3before1` (headless) and `+p3before2` (headed Chrome) on `www.viet18.com/refer/refer-a-loan-officer`.
  The order was: site captcha 200, then packs `submitReferALoanOfficer` 200 (3.4 s), then `recruit-intake` **400**.
  The lf log line was `recruit-intake captcha score=0 action=recruit_intake ok=false`. Each lead has 1 row, made by the
  MOSO push only. Shot: `before-1-refer-dual.png`.
- lo-homepage `/register-loan-officer`, `/refer/refer-a-loan-officer`, `/join` and `/loan-officer` all answer 200 on
  `tainguyen.viet18.com` (the earlier 404 was on the run.app host).

## E2E after (10:30-10:48Z, min score 0)

| Lead | Page | Network order | DB |
|---|---|---|---|
| `p3only1` (canary) | lf `www.viet18.com/refer/refer-a-loan-officer` | captcha 200, `recruit-intake` **201**, **no packs call** | 1 row, REFERRAL, `intake_client` lf-homepage, **no `legacy_key`** |
| `p3prim1` | lf refer | captcha 200, `recruit-intake` 201 (+0.5 s), then packs `submitReferALoanOfficer` 200 (+3.6 s) | 1 row, keyed by the MOSO push within about 1 min (linked, no twin) |
| `p3prim2` | lf `www.viet18.com/recruit/bao-trinhhh` (headhunter slug, webinar "Soonest") | captcha 200, `recruit-intake` 201, then packs `registerWebinar` 200 | 1 row, owned by the headhunter (D196 slug owner), S1, keyed after the push |
| `p3only2` (canary) | lo `tainguyen.viet18.com/refer/refer-a-loan-officer` | `recruit-intake` (lo run.app) 201, no packs call | 1 row, `intake_client` lo-homepage, no key |
| `p3prim3` | lo refer | `recruit-intake` 201, then packs 200 | 1 row, keyed after the push |

Shots: `after-1-lf-refer-recruit-only.png`, `after-2-lf-refer-primary.png`, `after-3-lf-recruit-slug-primary.png`,
`after-4-lo-refer-recruit-only.png`, `after-5-lo-refer-primary.png`. There is no visible UI change: the pages look the same.

**A Recruit-only lead from a form goes all the way through the invite.** Lead `p3only1` (`b4c94049-9d52-4f58-b613-01bf51898c7a`):

- It was claimed, and the 3 production figures were set.
- `POST /candidates/{id}/offers` with `approve_now` gave **201**. Offer `5a4838c7-09c9-4416-9bc9-4fcca30cf46d` is **SENT**.
- The lead moved to S5 and was handed off to the auto-picked onboarding specialist.
- It has **0** packs write-back rows.
- The staff portal link has the shape `https://www.viet18.com/register-loan-officer?invite=<43 chars>`. The value was not kept.
- On staging the hand-off means no invite mail is sent. The portal link goes out in the welcome mail after the 1-1, as P4 S6 measured.

**A returning Loan Officer rings once (after recruit-be #912 was deployed).** At 13:29Z, `p3prim2` (keyed, existing) submitted the `/recruit/bao-trinhhh` form again:

- `recruit-intake` answered **200** (a duplicate), then packs `registerWebinar` answered 200.
- `intake_raised_at` is 13:29:32Z, and the MOSO push carried a packs clock of 13:29:33Z. Before the fix that push would have rung a second time.
- The timeline holds exactly **1** "Registered again" line, and the lead still has 1 row.
- Shot: `after-6-lf-returning-lead-primary.png`.

**Cleanup.** `p3prim2` was archived too. `p3only1`, `p3prim1`, `p3only2`, `p3prim3`, `p3before1` and `p3before2` were archived with `POST /candidates/bulk-archive`. The archive also revokes the portal token.

# Round 2 (08/11/2026 evening): webinar sign-ups on Recruit sessions (D425) and Recruit-only register / join (D426)

Staging only. Production is untouched: every flag below is absent from production values.

## What changed

- **recruit-be #917, squash `74c2e06a`.** It was promoted, the staging deploy succeeded, Flyway reached V351, and the pod env shows `LEAD_INTAKE_WEBINAR=true` and `PORTAL_PRE_OFFER=true`.
  - **D425:** `GET /public/api/v1/intake/webinar-sessions` lists the upcoming Recruit sessions. It is keyed and read server-side, and uses packs' time format.
    - An intake post that carries `webinar_session_id` seats the lead in that session. The seat is taken AFTER the lead commits, in its own transaction, with source `FORM`.
    - A refused seat never loses the lead.
  - **D426:** a NEW `REGISTER` / `JOIN` lead whose post asked for it gets a pre-offer portal link (`portal_url`, `onboarding_tokens.offer_id` NULL).
    - The link opens the profile read and save only.
    - `fee/paypal` and `signing-link` answer 409. `fee-config` gives the public config with no PayPal binding.
    - It lives at most 3 days.
    - It stops for good at any open offer, a MOSO link, a later registration of the same person, or the invite's own link.
    - Phone and NMLS are locked until the invite.
- **Sites: lf-homepage #2734 (merge `dc953fe8`) and lo-homepage #943 (merge `9a3cb09b`).**
  - **The webinar list:** `fetchNextWebinars` returns Recruit sessions as `recruit:<id>` options. It does so only when the server env `RECRUIT_WEBINAR_SESSIONS=true` AND the Recruit-first gate is on. Any failure, or an empty list, falls back to MOSO.
  - **A `recruit:` pick:**
    - Recruit seats the person.
    - packs gets the person WITHOUT a webinar (`registerLoanOfficer`). Under the Recruit-only canary, packs gets nothing.
    - The form's error shows when Recruit did not seat the person.
  - **Register and /join:** under the canary, the route itself asks for the portal link, never the browser. The page then goes to `www.viet18.com/register-loan-officer?invite=` instead of packs' `?key=`. lo-homepage sends its visitors to the lf portal.
    - Route and browser share one URL check: https, a portal host, the exact path, and an `invite` parameter.

## Why a pre-offer link and not an offer at registration

The portal's fee and signing hang on an offer. Creating one at registration would skip three things:

- the recruiter's qualification;
- the approval rules (D64);
- the onboarding specialist hand-off.

A profile-only link keeps all three. It matches the page's own hold: the fee step says "AFTER YOUR CALL", and the meeting status stays not reached for a lead nobody invited. One flag turns it off.

The security review raised that an unverified e-mail could squat a record. Two guards answer it:

- a link is only made for a NEWLY created lead;
- it dies as soon as anyone else registers that e-mail, a MOSO record links, or an offer exists.

## Staging env (Cloud Run, `--update-env-vars` / `--remove-env-vars` only)

| Var | Value | When |
|---|---|---|
| `RECRUIT_INTAKE_MIN_SCORE` | 0 | 15:14Z to 15:22Z (E2E), then 0.5, read back |
| `RECRUIT_WEBINAR_SESSIONS` | true | 15:14Z to 15:22Z only, then REMOVED (the sign-up forms show MOSO sessions again; see question 1) |
| `RECRUIT_INTAKE_RECRUIT_ONLY` | `bao.trinh+p3only*@loanfactory.com` | unchanged (canary) |

## E2E (15:14-15:22Z)

| Case | Network | DB |
|---|---|---|
| BEFORE: `/recruit/bao-trinhhh` dropdown | MOSO sessions (Wed 18/11, 16/12 at 12:00 AM) | shot `d425-before-1-recruit-slug-moso-sessions.png` |
| AFTER: same page | Recruit sessions: Fridays 1:00 PM, 13/11 to 18/12, with 27/11 (Thanksgiving) skipped | shot `d425-after-1-recruit-slug-recruit-sessions.png` |
| `p3web1` picks a Recruit session (outside the canary) | `recruit-intake` 201, then packs **`registerLoanOfficer`** (not `registerWebinar`) | 1 row; seat `FORM` REGISTERED for 13/11 21:00Z; Recruit confirmation mail `WEBINAR_SESSION` SENT; the MOSO push linked the key afterwards |
| `p3onlyweb1` picks a Recruit session (canary) | `recruit-intake` 201, **no packs call** | 1 row, no key; seat `FORM`; confirmation mail SENT |
| BEFORE: `/join` with a canary e-mail (`p3onlyjoinb1`) | packs `registerLoanOfficer`, then `/join/license?key=<moso key>` | shot `d426-before-1-join-continues-on-moso-key.png` |
| lf `/join` (`p3onlyjoin1`, `p3onlyjoin3`) | `recruit-intake` 201, **no packs call**, then **`register-loan-officer?invite=`**; the portal's profile, fee-config and page-texts answer 200 | 1 row, no key, 1 live pre-offer link, 0 packs rows; step 2 is prefilled with the lead's name and e-mail. Shots `d426-after-1-…`, `d426-after-3-portal-basic-info-prefilled.png` |
| lo `/join` on `tainguyen.viet18.com` (`p3onlyjoin2`) | lo `recruit-intake` 201, no packs call, then `www.viet18.com/register-loan-officer?invite=` | as above, `intake_client` lo-homepage. Shot `d426-after-2-…` |
| Invite of a portal-registered lead (`p3onlyjoin1`) | claim + figures + offer `approve_now` gave 201 SENT (hand-off); then a staff offer link | the pre-offer link is **ROTATED (revoked)**, and the offer link is the only live one |

**Not covered here:** the lo `/loan-officer` webinar card. Its long form was not automated. It uses the same helper as lf, and jest covers it.

**Cleanup:**
- The two Recruit seats were cancelled.
- All `p3*` round-2 leads were archived: `p3web1`, `p3onlyweb1`, `p3onlyjoin1`, `p3onlyjoin2`, `p3onlyjoin3` and `p3onlyjoinb1`.
- The archive also revokes their portal links.

## Known gaps / follow-ups

- **MOSO's own 1/2/3-month webinar drips:** they do not start for a Recruit-session sign-up. That is P3b step 3.
- **A Recruit-session sign-up that Recruit does not answer in 7 s shows the form error.** packs still holds the person. A retry is a duplicate that answers `webinar_registered: true` for the same session.
- **The canary matches the e-mail the visitor typed.** Do not set `RECRUIT_INTAKE_RECRUIT_ONLY=all` in production before e-mail verification. The pre-offer link is the reason.
- **lo-homepage has no portal page of its own.** Its visitors finish on www.viet18.com.
