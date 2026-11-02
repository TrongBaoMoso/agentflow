# Text first on Call again: build spec (bead agentflow-t4699)

Bao gave the GO on 02/11. Mockup v31: https://claude.ai/artifact/6RTG8qnybihtRhHyU4oqLr
(recruiter view; Log result C1–C5; Today rows).

Scope for this round: code + local preview. Push only after Bao has looked locally.
The omni PR is the exception: Bao asked for it and will hand it to Khải for review.

## Product rules (decided with Bao)

1. **Log result.** Path: Interested → Next step "Call again".
   - A card "Text <first name> before the call" sits under When/Time. It holds a checkbox, a Template (SMS templates), a Sends line and a Message.
   - Ticked by default: yes (Bao 02/11), unless blocked (opted out, no phone). Template starts on the first SMS template and Message is that template rendered, so the default state is sendable. No SMS template: Message stays empty and save is blocked while ticked.
2. **Send time.**
   - With a call time: 1 h before the call.
   - Without a call time: 08:00 in the LO's local time on the call day.
   - The send must fall inside the LO window 08:00–21:00 local. If "1 h before" is earlier than 08:00, send at 08:00 when that is still before the call.
   - If the computed time has already passed but the call has not, send at the next tick.
3. **Blocked.**
   - LO opted out of SMS → the checkbox is disabled. Red line: "<First> replied STOP on <date>, so Recruit cannot text <him/them>." Use the LO name, never a pronoun guess; FE copy: "…so Recruit cannot text <First>."
   - No phone → "<First> has no phone number on file, so Recruit cannot text <First>."
4. **Cancel before sending.** The pending text is cancelled when any of these happens after it was created:
   - the LO gets in touch (inbound SMS, email or call);
   - the recruiter texts the LO themselves;
   - the LO opts out;
   - the Call again follow-up is no longer open (result logged, moved or closed).
   The LO never gets two texts.
5. **D278 change (Bao):**
   - A text the SYSTEM sent (a Text-first text, or any scheduled text Recruit sent itself) does NOT close Call again or any other follow-up.
   - A text or email the recruiter sends keeps the old D278 rule: it closes due suggestions, Call again included.
6. **Send now.** It sends the pending text immediately, through the same guards except the time.
7. **Failure.**
   - A Text-first text that omni reports DELIVERY_FAILED is marked FAILED with omni's failure_code and failure_reason.
   - The Call again stays open. Do NOT open a Send info follow-up (that is the Send-info D347 path, not this one).
8. **Gates.**
   - Rides the existing `recruit.features.scheduled-send-info` and the setting `scheduled_send_info.sms_enabled`, the `delivery_mode` (DRY_RUN → record DRY_RUN, send nothing) and the `allowed_sms_numbers` allowlist.
   - Add `recruit.features.call-text-first` (default false). Turn it on in staging values only. Prod stays off.

## Today rows (FE), Call again rows only

"Today" is the business day (BusinessZone, America/Los_Angeles).

**Row tint = what the LO did today** (`lo_contact_today` / `sms_stop_today_at`):
- green: SMS or email; or a call with call_result ANSWERED.
- amber: a call with call_result MISSED, or a call whose result is unknown (null).
- red: STOP today.
- none: nothing.
- An overdue row gets no special tint.

**Note lines.** Show ONE event, priority: missed call → STOP today → text failed → answered call → latest SMS/email.
- `"<First> called you at 12:40 PM · missed"` (amber ink). When unknown: `"<First> called you at 12:40 PM"`.
- Answered: the title becomes "Log the result" + `"<First> called you at 11:30 AM · talked 4 min"` (green ink).
- SMS: bubble, head `"<First> texted back · 10:15 AM"`, body = preview (omit the body line when preview is null).
- Email: head `"<First> emailed you · 11:02 AM"`, body = subject (or preview).
- STOP today: `"<First> replied STOP to your 9:00 AM text."` (red; the time is the text_first sent_at if any, otherwise `"<First> replied STOP."`).
- Failed: `"Your 8:00 AM text to <First> did not go through"` (red, dotted underline). A tooltip carries the reason: omni failure_reason if present, else the existing `not_delivered_reason_*` copy.
- Sent, no reply: `"You texted <First> at 10:00 AM · no reply yet"`.
- Pending: `"Text to <First> scheduled for 1:00 PM"` + an inline secondary "Send now" button (28px).
- Recruiter note (follow_up.note): a note icon + muted "Your note:" + the text. Not italic.

**Other changes:**
- Remove the D270 Reply button everywhere on the Today row.
- No "cancelled because…" lines. A cancelled text shows nothing.

## API contract (BE ⇄ FE), snake_case JSON

`POST /api/v1/candidates/{id}/call-outcome` adds:
```json
"text_first": { "body": "string ≤320", "template_id": "string|null" }
```
- Only with attitude INTERESTED + next_step_kind CALL_NEXT. Otherwise 400.
- 4xx error codes: `TEXT_FIRST_DISABLED`, `TEXT_FIRST_OPTED_OUT`, `TEXT_FIRST_NO_PHONE`, `TEXT_FIRST_TOO_LONG`, `TEXT_FIRST_UNFILLED`.
- Validate before any remote write.

The candidate detail (`GET /api/v1/candidates/{id}`) adds:
```json
"sms_opted_out": true|false,
"sms_opted_out_at": "ISO|null",
"sms_time_zone": "America/Los_Angeles|null",
"text_first_enabled": true|false
```
- `sms_time_zone` is the LO's zone. Use the first one from RecipientQuietHours.zonesOf; null when unknown.
- `text_first_enabled` is all gates on.

Each Today item (`GET /api/v1/today`) adds:
```json
"text_first": null | {
  "follow_up_id": "…",
  "status": "PENDING|SENT|CANCELLED|FAILED|DRY_RUN|SKIPPED",
  "send_at": "ISO", "sent_at": "ISO|null",
  "failure_code": "string|null", "failure_reason": "string|null",
  "cancel_reason": "LO_CONTACT|RECRUITER_TEXT|OPTED_OUT|FOLLOW_UP_CLOSED|null"
},
"lo_contact_today": null | {
  "channel": "SMS|EMAIL|CALL", "at": "ISO",
  "preview": "string|null", "subject": "string|null",
  "call_result": "ANSWERED|MISSED|null", "call_seconds": 0
},
"sms_stop_today_at": "ISO|null"
```
- `text_first` is the newest text-first for the row's open CALL_NEXT follow-up.
- `lo_contact_today` is the latest INBOUND activity in today's business day.

Item A (Bao, 02/11): the D270 "replied, unanswered" rows say HOW the LO replied. Same reply as `replied_at` (any day), added to each Today item:
```json
"reply_channel": "SMS|EMAIL|CALL|null", "reply_preview": "string|null", "reply_subject": "string|null",
"reply_call_result": "ANSWERED|MISSED|null", "reply_call_seconds": 0
```
- Omitted from the JSON when null. Read from the persisted inbound fields (omni optional keys `preview`, `subject`, `call_result`, `call_duration_seconds`).
- `reply_snippet` now falls back to `reply_preview`, then `reply_subject`, so older FE keeps working.

Send now: `POST /api/v1/candidates/{id}/text-first/send-now` with body `{ "follow_up_id": "…" }`.
- Returns 200 with the `text_first` object above.
- Returns 409 `TEXT_FIRST_NOT_PENDING` when it is not pending.

## omni-service (PR for Khải)

The inbound-reply event published to recruit is extended, additively and schema-compatibly. The new optional fields:
- `preview`: the first 140 chars of an SMS body, or of an email's plain text;
- `subject`: email only;
- `call_result`: `ANSWERED` | `MISSED` for a CALL (a voicemail counts as MISSED);
- `call_duration_seconds`: for an answered call.

The recruit-be consumer reads them null-safe, so either side can ship first.
