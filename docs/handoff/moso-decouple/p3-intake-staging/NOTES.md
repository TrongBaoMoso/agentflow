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
