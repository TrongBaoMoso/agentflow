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
2. **Neutral = Call again with a far date (Bao 17/10).** The LO stays `status=ACTIVE` (no NURTURE status for new
   Neutrals), so Pipeline needs no new filter and every ACTIVE-only gate keeps working. The amber "Nurture" chip is
   derived from the open NURTURE_CALL follow-up. Existing NURTURE rows are migrated to ACTIVE + follow-up.
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
   - SMS: shown disabled "coming soon" until the SMS path (STOP + quiet hours) is ready; Email first (Bao OK 17/10).
4. **Migration:** every candidate `NURTURE` with `nurture_until` → create NURTURE_CALL follow-up on that date; dateless
   ones → default days (`followup.nurture_default_days`). No messages sent for migrated rows until the next interval.
5. **Flag** `recruit.features.nurture-drip` — staging ON, production absent until Bao says.

## LO replies before the date (Bao 17/10, proposal)
Today a reply never surfaces a row (audit: TODAY-AUDIT.md gap 1-2). Proposal for EVERY next step: an inbound Email/SMS
puts the LO on the owner's Today now with chip "Replied · 2h ago", a one-line quote, button "Reply" (opens Conversation),
and the existing schedule shown ("Call back Jan 20"). The row leaves when the recruiter replies (outbound after the
inbound) or logs a result. During nurture the reply also stops the drip; the NURTURE_CALL stays until a new result.

## Work split
- BE-1 D270 + NURTURE_CALL kind + neutral() rewrite + Today/Pipeline counts + migration (IT).
- BE-2 settings keys + validators + template `nurture` flag + `{{next_webinar}}`.
- BE-3 drip tick (ledger/outbox, stop rules, guards) + email; SMS behind readiness check.
- FE-1 Settings block, Templates "Use for Nurture" toggle, Neutral copy, Pipeline default + chip, Follow-up row label.

## Open for Bao
- Drip off by default on production until templates exist (recommended).

## Sending path (investigated 17/10)
- Bao: every LO communication must be on the omni timeline → automatic sends go through omni, not packs.
- omni today has NO server-to-server compose: compose (`POST /api/v1/subjects/{type}/{id}/messages`) needs a user token;
  the internal-key surface has no compose and omni refuses "acting user" headers (`internal/auth/middleware.go:150,186`).
  Send info works only because the browser sends with the recruiter's token.
- Needed in omni-service (PR for Khải): internal compose route for automated sends on behalf of the subject's owner
  (recruit-be key, owner check, `automated=true` marker shown in the timeline, Reply-To alias so replies thread back),
  plus List-Unsubscribe / one-click unsubscribe, and `COMM_EMAIL_LOGO_URL` set to the LF logo (unset in both envs).
- omni bodies are plain text in omni's branded layout (no raw HTML) → templates are written as text; the logo comes from
  the omni layout.
- Same path serves the scheduled Send info auto-send (gap 5).

## Org email research (3 independent agents, 17/10)
- Standard: apps publish v2 events to moso-notifier (Pub/Sub NOTIFICATION_EVENT_TOPIC) → SendGrid. Used by ai-hr-be,
  auth-service, lfiq-backend, tera-be, followup-be, omni-service itself (OMNI_DIRECT_MAIL). notification-service (Go) is
  replacing moso-notifier in place (Khai), same contract.
- Outliers: callcenter (direct SendGrid, has its own nurture email + footer/opt-out), lf/lo-homepage + packs (legacy MOSO
  GAE SendGrid), feedback-be-go (Gmail API).
- Only omni puts mail on the omni timeline and threads replies (reply token minted inside omni, no endpoint exposes it).
  No app sends through omni server-side; omni has no internal compose, plain-text bodies only, no email unsubscribe.
- moso-notifier supports HTML templates, passthrough HTML, Reply-To, `oneClickUnsubscribeUrl` (List-Unsubscribe),
  delivery webhooks; no inbound/threading.
- Decision proposal: omni internal compose route (key-bound to recruit-be as LO_CANDIDATE owner, author = owning recruiter,
  automation_ref, bulk lane, optional sanitized HTML body or declared template, oneClickUnsubscribeUrl passthrough, email
  suppression check). recruit-be owns scheduler, templates (Purpose), unsubscribe endpoint + suppression, excludes
  automated sends from "human touch". Khai approves omni design. Fallback (direct moso-notifier like HR) fails threading.
