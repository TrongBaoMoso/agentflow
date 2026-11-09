# P3b step 3: MOSO's webinar drips sent by Recruit (D431, 09/11/2026)

Bead `agentflow-0gwad.4.1`. recruit-be #924, squash `14abd611`, migration V355. It is promoted to staging and the staging deploy succeeded. Staging only: the flag and the switch are off in production.

## What MOSO does (read in moso `origin/master`)

`SendEmailToWebinarAttendeeCronOp` runs daily at 14:00 America/Los_Angeles, with the rules in `WebinarFollowUpSchedule`. On the day that is exactly `webinarDate.plusMonths(N)`, it mails every `LORecruiting` row whose `webinar` is that webinar:

- `webinar_registration_after_1_month` goes to status `interested`.
- `webinar_registration_after_2_months` and `_after_3_months` go to `no_response`, `denied_by_LO`, `hiatus` and `invited_to_join`, active rows only.

The day-after mail (`after_1_day`) and the 2-day, 1-day and 2-hour reminders were already ported to Recruit (D369, D365). With this change, all of MOSO's post-registration webinar mails exist in Recruit.

## What Recruit does now

- **When and to whom:** the same day and hour, in the series' zone, for people REGISTERED to a HELD Recruit session.
  - Only each person's LATEST registration counts.
  - Each step goes once per (session, person, step).
  - A drip is never sent late.
- **Audience, read from Recruit's own record (`WebinarDripAudience`):**
  - 1 month: ACTIVE and not yet invited.
  - 2 and 3 months: any of these:
    - an offer SENT and not signed;
    - DORMANT;
    - an ACTIVE lead whose latest offer was declined.
  - Never: a merged lead, BLOCKED, ARCHIVED, signed / S6 / S7, or NURTURE (Recruit's own nurture already mails NURTURE leads).
- **No double mails with MOSO:** anyone whose MOSO record carries a webinar (`legacy_ref.webinar`) is skipped as `MOSO_DRIPS`, because MOSO drips them already.
  - That record is only as fresh as the MOSO push.
  - Rollout rule: switch the drips on together with the Recruit-session sign-up forms (D425, `RECRUIT_WEBINAR_SESSIONS`), never before.
- **Sending:** through the lo-mail pipeline, with suppression, STOP, the allowlist, the delivery mode and the ledger.
  - New mail kind `WEBINAR_DRIP`, behind the flag `recruit.features.webinar-drip-mail`.
  - The admin switch is the setting `webinar.drip_mail.enabled`.
  - Each delay is an ISO period setting (`after_1_month` / `after_2_months` / `after_3_months`), and `OFF` turns that step off.
  - The lo-mail sender may now mail a DORMANT lead for this kind only.

## The text

- **2- and 3-month mails:** body and subject verbatim from the HTML pasted into MOSO prod on 03/11 (`~/Downloads/moso-webinar-templates`) and from the subjects recorded in bead agentflow-t9gsi. Only the tokens are mapped.
- **1-month mail:** body and subject both match MOSO prod now (see "Copy check" below). The 1-month step is still seeded OFF, but it is **ready to turn on**.

## Copy check against MOSO prod, and the 1-month subject (09/11, V356)

recruit-be #935, squash `e0b7930d`, migration V356. Promoted to staging, and the staging deploy succeeded.

**Where MOSO keeps the templates.** They are Datastore kind `Template` in the Loan Factory namespace, keyed by NAME: `KEY(Template, 'webinar_registration_after_1_month')`. The subject is the property `title`. The first version of `verify_moso_drip_templates.sh` filtered on the property `name` and got 0 rows. A positive control on `name` matched other templates, so the query worked: these three templates simply carry no `name`. The script now reads by key.

**Result of the read-only dump, compared with V355 after the token map:**

| Step | Subject | Body |
|---|---|---|
| 1 month | MOSO: "We Built Loan Factory So You Can Build Wealth - Ready to Join Us?". V355 had a placeholder. **Fixed in V356** | identical, word for word |
| 2 months | identical | identical. Only HTML entities vs literal emoji differ, and they render the same |
| 3 months | identical | identical. Same emoji-only difference |

So the subject was the only copy fix. V356 updates that one row, only while it still holds V355's placeholder, so a later admin edit is never overwritten. It changes no setting.

**Measured on staging after the deploy (read-only DB):**

- Flyway 355 and 356 both succeeded.
- `tpl-lo-webinar-drip-1m` has MOSO's subject.
- Effective settings: `enabled` false, `after_1_month` "OFF", `after_2_months` "P2M", `after_3_months` "P3M", `local_time` "14:00".

**Not changed by MOSO's copy:** the sender. MOSO's 1-month template still sends from Victoria's own address, while its 2- and 3-month templates send from recruiting@. Recruit sends all three through lo-mail with the usual sender block.

## Turning the drips on (planned: Wednesday, after the demo, together with the Recruit webinar sessions, D425)

On staging, through the settings API:

1. Set `webinar.drip_mail.after_1_month` to `"P1M"`.
2. Set `webinar.drip_mail.enabled` to `true`.

Do this together with `RECRUIT_WEBINAR_SESSIONS`, never before (the `MOSO_DRIPS` guard is only as fresh as the MOSO push). Nothing is on yet.

## Time-shifted staging test (08/11, 20:40Z → 01:05Z; settings API only, no DB write)

1. Settings changed (all read back):
   - `local_time` "00:00";
   - `after_1_month` P2D, so the 06/11 session is due on 08/11 Los Angeles time;
   - `after_2_months` P5D (the 03/11 sessions);
   - `after_3_months` P3D (the 05/11 session);
   - `enabled` true.
2. At 01:05Z all five settings went back to their seeds (`false`, "14:00", OFF, P2M, P3M), also read back.

| Person (registered, HELD session) | Expected | Timeline 20:40Z → 01:05Z |
|---|---|---|
| `bao.trinh+crm5` (06/11, ACTIVE, not invited) | 1-month drip | **one** "Email sent · Checking in after our "Why Loan Factory" webinar" at 21:00:03Z. Nothing more at the 22:00, 23:00, 00:00 and 01:00 ticks, so it went once |
| the 06/11 registrant whose MOSO record has a webinar | skipped `MOSO_DRIPS` | no mail |
| `bao.trinh+reflol9kzg` (05/11, MOSO webinar on record), 3-month day | skipped `MOSO_DRIPS` | no mail |
| `bao.trinh+crm3`, `+crm4` (03/11, ACTIVE, not invited), 2-month day | `NOT_IN_AUDIENCE` | no mail |

**Not proven on staging:** the 2- and 3-month sends to an invited or DORMANT person. Setting one up would have meant sending an offer, which hands the lead to an onboarding specialist and writes a packs INVITE for these MOSO-linked test leads. Those sends are proven in `WebinarDripIT` instead (real Postgres, real sender, DRY_RUN): subjects, bodies, audience, the `MOSO_DRIPS` skip, latest registration only, once, timing, step OFF, switch off and kind flag off.
