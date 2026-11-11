# Recruit emails: the Loan Officer's journey (from the code, recruit-be origin/master fc218308d, 11/11)

People in the story: **Jordan** = the Loan Officer, **Alex** = the recruiter, **Sam** = the onboarding specialist, **Riley** = the person who referred Jordan.
Per-email detail (who sends it, when, why it might not go, buttons, sources): `FLOWS.json`.

> Every Loan Officer email goes through one shared gate. Each one has its own feature flag. Each is sent once per key. It is skipped for an unsubscribe, a blacklist, a hard bounce, a bad address, an address not on the allowlist, or a template with an empty field. While `delivery_mode = DRY_RUN` the email is only stored, not sent. Most of these flags are **off in production** today, and MOSO still sends its own version.

## 1. First call → invite
| Step | What Alex/Jordan does | Email(s) | When |
|---|---|---|---|
| First call | Alex calls Jordan in Recruit and logs the result | none (if the result is Neutral or "No answer" runs out → see Nurture) | — |
| Invite | Alex's offer is approved and sent (the offer turns SENT) | **tpl-lo-invite** ("Join Loan Factory") | right away |
| Not finished | Jordan hasn't signed or paid | **tpl-lo-invite-reminder** ("Continue where you left off") | day 2, 5, 10 after the invite, sent only within 24 h of the due time |

No invite email goes out when a specialist already holds the lead (hand-off). With D354 on and no specialist assigned, nothing is sent either.

## 2. Webinar (optional, "Why Loan Factory", Fridays)
Two paths:
- **MOSO session**: Alex uses "Register for webinar" → once MOSO confirms → **tpl-lo-webinar-registered**. MOSO sends that session's own reminders and drips.
- **Recruit session** (flag `webinar-schedule`, off in prod): someone registers Jordan (the web form, an admin, or a recruiter):
  - **tpl-lo-webinar-session-confirmed**, right away (Join + Add to calendar)
  - **tpl-lo-webinar-session-link**: if the Meet link is created or changes later (hourly tick)
  - **tpl-lo-webinar-session-moved**: if an admin skips or cancels the session (Jordan moves to the next session in the series)
  - **tpl-lo-webinar-reminder-2d / -1d / -2h**: 2 days, 1 day and 2 hours before (hourly tick). SMS also goes at 1 day and 2 hours.
  - Attendance is read from Meet 30 minutes after the end.
  - The day after, at 14:00: **follow-up-attended** (came), **follow-up-missed** (no-show: recording + next session), or **follow-up** (attendance unknown). Each person gets exactly one.
  - If Jordan attended and was referred: **tpl-lo-webinar-referrer-attended** to Riley (within 72 h of the attendance read).
  - Drips at 14:00: **drip-1m** (1 month after, people still "interested", OFF by default), **drip-2m / drip-3m** (2 and 3 months after, people invited but silent, dormant or who declined).
- By hand: Alex can use **Send info** to send the GENERAL "Webinar follow-up (demo)" template, now or on a set date.

## 3. Onboarding 1-1
| Step | Action | Email | When |
|---|---|---|---|
| Book | Sam presses "Book 1-1" | **tpl-onb-1on1-reminder-2d / -1d / -2h** ("Join the call") | 2 days, 1 day and 2 hours before. Skipped if the call was booked after that reminder's time. Delivered through MOSO, DRY_RUN by default |
| Done | Sam presses "Mark done" | **tpl-lo-welcome** ("Start your setup": review info, pay $100, sign) | right away. Sent only when MOSO isn't sending its own welcome |

## 4. Offer → agreement → fee → onboarded
- The offer goes out with the invite (step 1).
- Staff change the details on an unsigned agreement, or press "Send new version": **tpl-lo-agreement-updated**, 15 minutes after the last save (later saves push it back).
- **tpl-lo-agreement-link**: no code ever sent it, so it was **removed from Templates** on 11/11 (Bao).
- Jordan pays the fee on the portal (lf-homepage `/register-loan-officer?invite=`) with PayPal: **tpl-lo-fee-paid** goes to Jordan, and **tpl-lo-fee-paid-staff** goes to Sam and Alex, one each. Both go right away, only for payments Recruit recorded, and not when the fee is waived.
- When Jordan has signed and paid, the invite reminders stop. Then NMLS and HR (these are not email templates).

## 5. Nurture branch (not ready now)
A Neutral call result, or the 5th "No answer" miss (the follow-up is then set 3 months out), opens a NURTURE_CALL follow-up. Then:
- **tpl-nurture-1..4**: the first one goes 4 weeks after the follow-up was created (`interval_weeks` can be 2, 3 or 4), then one every 4 weeks.
- Only in business hours, and never on or after the follow-up's due date.
- The template used the fewest times goes next, so the order is #1 → #4, then it repeats.
- It stops for good when Jordan replies, a person really calls, texts or emails Jordan, Jordan is archived, or Jordan unsubscribes.

## Example timeline
Mon 10:00 Alex calls Jordan → 10:20 offer sent → **invite**. Mon 11:00 Alex registers Jordan for the Friday 13:00 PST Recruit session → **session-confirmed**. Wed ~13:00 **reminder-2d** + **invite-reminder** (day 2). Thu ~13:00 **reminder-1d** + SMS. Fri ~11:00 **reminder-2h** + SMS. Jordan attends → around 15:00 Riley gets **referrer-attended**. Sat 14:00 **follow-up-attended**. Sat (day 5) **invite-reminder**. Mon Sam books the 1-1 for Thu 15:00 → **1on1-reminder-2d / -1d / -2h**. Thu 15:25 Mark done → **welcome**. Thu 20:10 Jordan pays → **fee-paid** + 2× **fee-paid-staff**. Jordan signs → no more reminders.

## Gaps (not clear in the code)
- 1-1 reminders: who the email is From (it goes through the packs outbox).
- Drip emails: the CTA button labels (no `B.cta` found in kit.js).
- The Nurture sweep and invite-reminder job cadence: these are cron settings, not read.
- Referrer email: whether it checks MOSO's "email me" opt-in.
- Webinar reminders: what happens when someone registers after a reminder's time has passed.
- The "Webinar follow-up (demo)" body and buttons (the content wasn't read).
