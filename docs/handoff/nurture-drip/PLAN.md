# Nurture redesign — plan (epic agentflow-236t9)

Owner decision 17/10 (Bao): Neutral is a long "call again". The LO must not forget the recruiter while parked, so the
app keeps in touch automatically. Channel (Email | SMS) and interval (2 | 3 | 4 weeks) are admin settings.

## Today (origin/master 5afd936d / fe 0dbb0db9)
- Neutral → `status=NURTURE` + `nurture_until` (D50/D121), no follow-up row; Today shows the LO only on/after the date
  (`DashboardServiceImpl` nurture arm); Pipeline default `status=ACTIVE` hides it.
- No drip exists: D56 cadence was never coded; `SequenceSender` is a no-op; cadence 1/5 is display-only.
- Templates have no tag/category; variables are `{{name}}` (`TemplateRenderer`).

## Proposed model (new decision D270, amends D50/D56/D121)
1. **One source for the date.** Neutral creates a follow-up `kind=NURTURE_CALL` (followup-be `kind` is free text) due on the
   wake date. Reschedule/Clear work like any follow-up and it shows in To do and Follow-up history.
   `nurture_until` stops being written; the Today nurture arm is removed (the follow-up surfaces it).
2. **Status NURTURE is kept as a label**, cleared when the NURTURE_CALL follow-up is done/cleared or any other outcome is
   logged. Keeping the status avoids touching the ACTIVE-only gates (`CandidateServiceImpl:1093/1105/1131/1299`).
   Pipeline default filter becomes **ACTIVE + NURTURE** ("In progress"), with the amber Nurture chip on the row.
3. **Keep-in-touch drip** while NURTURE_CALL is open:
   - Settings (admin, `SETTINGS_MANAGE`): `nurture.drip.enabled` (bool), `nurture.drip.channel` (`EMAIL|SMS`, default EMAIL),
     `nurture.drip.interval_weeks` (2|3|4, default 4).
   - First touch one interval after Neutral; never on/after the due date; business days/hours (`business_hours`).
   - Content: Templates with the new **Nurture** flag (TEAM, approved), matching the channel; rotate in order, never repeat
     until all used. New variable `{{next_webinar}}` (nearest upcoming session from `/webinars`, "Wed, Nov 18 · 12:00 AM PT");
     if no webinar, a template using it is skipped.
   - Sent as the recruiter (D101 From/Reply-To), logged as an activity "Nurture touch (auto)".
   - Stops for good on: LO reply (inbound), recruiter call/outbound, follow-up done/rescheduled-to-now, STOP/suppression,
     archive. Guards re-checked each attempt (`SuppressionService`).
   - Engine: cron-service tick + ledger claim + outbox, copied from `OnboardingReminderTickServiceImpl` (D198 precedent).
   - SMS: goes through omni with STOP handling + quiet hours; if the SMS path is not ready, the SMS option is shown
     disabled with "coming soon" (Email works first).
4. **Migration:** every candidate `NURTURE` with `nurture_until` → create NURTURE_CALL follow-up on that date; dateless
   ones → default days (`followup.nurture_default_days`). No messages sent for migrated rows until the next interval.
5. **Flag** `recruit.features.nurture-drip` — staging ON, production absent until Bao says.

## LO replies before the date (Bao 17/10)
Today (origin/master) a NURTURE LO who replies before `nurture_until` does NOT appear on Today (the list arm is
`status=NURTURE and nurtureUntil <= today`). New rule: an inbound Email/SMS reply during nurture stops the drip, ends the
nurture (status ACTIVE) and puts the LO on the recruiter's Today now as a "Replied" task; the open NURTURE_CALL is
closed with reason REPLIED (kept in history). The recruiter then logs a fresh result.

## Work split
- BE-1 D270 + NURTURE_CALL kind + neutral() rewrite + Today/Pipeline counts + migration (IT).
- BE-2 settings keys + validators + template `nurture` flag + `{{next_webinar}}`.
- BE-3 drip tick (ledger/outbox, stop rules, guards) + email; SMS behind readiness check.
- FE-1 Settings block, Templates "Use for Nurture" toggle, Neutral copy, Pipeline default + chip, Follow-up row label.

## Open for Bao
- Pipeline default "In progress" = Active + Nurture (recommended) vs a separate "Nurture" tab.
- Drip off by default on production until templates exist (recommended).
