# Webinar B4 follow-ups: recording link (FE) and referrer mail (BE)

Beads: `agentflow-0gwad.4.8` (recording link field) and `agentflow-0gwad.4.9` (referrer mail). STAGING only, production untouched.
Ids only below, no PII.

## What shipped

| | PR | Merge commit | Staging |
|---|---|---|---|
| recruit-be: referrer mail (D386, V328, R83) | LoanFactory-Inc/recruit-be#861 | `0b59ec877` | promoted run 41910074941, cd-staging 41910114444 success; Flyway V328 `success=t` (20:56 UTC 04/11) |
| recruit-fe: recording link field (uses D369 route) | LoanFactory-Inc/recruit-fe#696 | `94dc5255` | on `staging` (cd-staging 41911877598 for `3bafde30`, which contains it) |

### recruit-be #861 (D386)
- MOSO's `email_referrer_when_ILO_attend_webinar`, copy verbatim (`tpl-lo-webinar-referrer-attended`; source moso-configuration `backups/Template/email_referrer_when_ILO_attend_webinar.*`, the GLOBAL Datastore template).
- Trigger: a webinar tick step right after the attendance step. A REGISTERED person of a HELD session read ATTENDED, within `webinar.referrer_mail.max_age_hours` (72).
- Who: `legacy_ref.referrer` (the confirmed referrer, MOSO FK) AND `legacy_ref.refer_loan_officer_email_me = true`. The opt-in is now mirrored by `MosoRowMapper` from the push (packs pushes all properties, so no packs change). A snapshot without the key (pushed before D386) waits for the next push.
- Addressed to the referrer (`LoanOfficerMailRequest.about`): the allowlist and the suppression (`SuppressionService#firstBlockingForEmail`) are applied to the referrer's address. Reply-To goes to the sender, and no activity line is written on the LO.
- Once per (session, referred LO): `webinar_reminder` kind `REFERRER` plus ledger key `webinar-referrer:<session>:<candidate>`.
- Gates: flag `recruit.features.webinar-referrer-mail` (staging values only) and setting `webinar.referrer_mail.enabled` (seeded false; set TRUE on staging 05/11 ~04:05 VN by this agent).
- Review (independent code-reviewer agent): 0 CRITICAL, 0 HIGH. Fixed: an absent opt-in now waits instead of being a final skip; an unreadable duplicate key waits; a kind-length guard test. CI then caught a D165 arch guard (no stand-in `CandidateEntity`) and Flyway placeholder syntax in comments; both were fixed.

### recruit-fe #696
- The session detail page `/webinar-schedule/sessions/<id>`, HELD sessions only, in the header right after the meeting link: `Recording <link> [copy] [Edit]`, or `Add link`. It is read-only without WEBINAR_SCHEDULE_MANAGE. The dialog has Save / Cancel / Remove link.
- Client check = the BE's MeetingUrls rule. A 400 shows the BE text; 403, 404 and other errors get their own i18n copy (en + vi).
- Review (independent typescript-reviewer agent): 0 CRITICAL, 0 HIGH. The MEDIUM items (i18n errors, validate on blur, strict https rule, load-failure state) and the LOW items (teraBtn, aria-label) are fixed in `17bbef4b`.

## Screenshots (Playwright, light, no fullPage)
- BEFORE (staging, before #696): `before-past-1440.png`, `before-past-375.png`, `before-session-1440.png`, `before-session-375.png` (session `8905f2d0`).
- AFTER (staging, after deploy): `after-session-empty-1440.png` (no link yet), `after-session-1440.png`, `after-session-375.png` (link set, session `869362b2`), `after-past-1440.png`, `after-past-375.png` (unchanged by design).
- Local AFTER (before deploy, mocked recording route): `after-local-*.png`.

## Staging E2E

### 4.8: recording link (measured 05/11 ~04:10 VN)
- Set through the UI on HELD session `869362b2-8871-4a87-848e-fef8cca6b416`: Add link, then Save, toast "Recording link saved."
- Read back via `GET /api/v1/admin/webinar-sessions/869362b2.../recording`: 200, `recording_url` = the test link.
- DB `webinar_session.recording_url` = the same, `last_modified_date` 2026-11-04 21:10:58 UTC.
- **Day-after mail picks it up (tick 22:00 UTC 04/11, `lo_mail.delivery_mode` SEND).** For session `869362b2`, ledger `8a6928aa` (candidate `aec96bcc`, `tpl-lo-webinar-follow-up-attended`, SENT) and ledger `5a4d3227` (candidate `f0757c39`, `tpl-lo-webinar-follow-up-missed`, SENT) both contain the recording link and WATCH THE WEBINAR RECORDING.
- Negative control in the same tick: session `8905f2d0` has no recording. Its COMMON mails (ledgers `021a905d`, `10c302e8`) have no recording button.
- The tick log was `webinar follow-up: Outcome[sent=4, ..., waiting=2]`. The two waiting rows are LO `07001ba1`, refused by the allowlist (expected).
- Bead 4.8 closed.

### 4.9: referrer mail (partly measured)
- Deploy, flag env `RECRUIT_FEATURES_WEBINAR_REFERRER_MAIL=true`, V328, the two settings and the template are verified (see above). `webinar.referrer_mail.enabled` was set to true on staging through `PUT /api/v1/admin/settings/...`.
- **The trigger was measured** at the 22:00 UTC tick: `webinar referrer mail: Outcome[sent=0, dryRun=0, skipped=0, failed=0, waiting=1]`.
  - The one person is candidate `aec96bcc` (crm4), ATTENDED on `869362b2` at 06:00 UTC 04/11, inside the 72 h window.
  - That candidate has a confirmed referrer in `legacy_ref`, but it is a `@viet18.com` address, outside the allowlist. The snapshot was pushed before D386, so it does not carry `refer_loan_officer_email_me`. The person therefore WAITS (`OPT_IN_UNKNOWN`) with no row and no mail, as designed.
  - `lo_mail_sends` has 0 `WEBINAR_REFERRER` rows. crm3 (`f0757c39`, NO_SHOW) is correctly not listed.
- **Delivery NOT measured yet.** It needs a Loan Officer who:
  1. has a confirmed referrer `bao.trinh+…@loanfactory.com` with "email me" ticked in MOSO staging (so the push carries `referrer` and `refer_loan_officer_email_me=true`);
  2. is registered to a Recruit session;
  3. is read ATTENDED by the Meet attendance read (someone joins the Meet as that person).

  Recruit has no admin endpoint to mark attendance, and the staging DB helper is read-only. A real Meet join (Bao, or a guest named with the LO's e-mail) is the only path. No held session has an unread attendance left: `2306517f` and `8905f2d0` are at max attempts.
- **Runbook for the delivery check.**
  1. In MOSO staging, refer a test LO from a referrer account that is an active Admin (e.g. `bao.trinh+lo-referrer`), with "email me" ticked.
  2. Wait for the push, then check that `legacy_ref` has both keys.
  3. Register the LO to the next session (`7d30491c`, 06/11 21:00 UTC) with `POST /api/v1/admin/webinar-sessions/{id}/registrations`.
  4. Join the Meet as a guest named with the LO's e-mail.
  5. After the attendance read (about 30 min after the end) and the next tick, expect a `lo_mail_sends` row of kind `WEBINAR_REFERRER`, key `webinar-referrer:7d30491c…:<cand>`, recipient = the referrer, SENT, plus a `webinar_reminder` row of kind `REFERRER`.
- Bead 4.9 stays open until that delivery is measured.

## Open questions for Bao
- From for the referrer mail is the onboarding specialist, else the owner, else the host. MOSO sends nothing when the LO has no specialist (R83 mechanism 3). Keep Recruit's fallback?
- When the push never carried a referrer name, the greeting reads "Dear," (MOSO always had `recruiter_name`). OK, or use the referrer's Recruit profile name once an e-mail-to-user lookup exists?
- The recording field shows on HELD sessions only (it is for the day-after mail). Should it also be settable on upcoming sessions?
