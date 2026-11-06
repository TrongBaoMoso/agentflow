# Webinar auto x3 — staging results (06/11/2026)

STAGING only. Production untouched (the schedule flag `recruit.features.webinar-schedule` is absent on prod; the new setting is seeded false).
Parent bead: agentflow-0gwad.4. Ids are prefixes (8 chars).

## 1. Recording link attached from Google Meet (D389, agentflow-0gwad.4.11)

- recruit-be #878, squash `057a260d2`, Flyway **V330** (staging applied 2026-11-05 20:34Z, pod log "now at version v330").
- recruit-fe #713, squash `099faffd` ("from Meet" / "từ Meet" label on the session screen), on staging.
- Promote BE run 42103384672 (success), cd-staging run 42103423447 (success), pod `recruit-be-864c44796b-q85zl` Ready, image digest `sha256:bfbb7e9f…`.
- Setting `webinar.recording.auto_attach.enabled` = true on staging (admin PUT 2026-11-05 20:35:57Z, row `1bb7567d`; undo = PUT `{"value":false}`).
- **Measured E2E (tick 2026-11-05 21:00Z):**
  - `b12c3b56` (held 05/11, 1 attended): recording attached, `recording_source = MEET`, host `drive.google.com`, `recording_auto_done_at` 21:00:00Z. Log: `webinar recording: Outcome[attached=1, waiting=2, gaveUp=0, failed=0]`. (The earlier "no recording" read was before Meet had generated the file.)
  - `2306517f`: `NO_RECORDING`, attempt 1/6, next 21:15Z. `8905f2d0`: `NO_CONFERENCE`, attempt 1/6. Both stop quietly after `webinar.attendance.max_attempts`.
  - `869362b2`: has an admin link from before V330 (source NULL, read as MANUAL), never in the work list, untouched.
- Day-after mail check still to do: `b12c3b56`'s follow-up is due 06/11 14:00 PST (22:00Z); `webinar.follow_up_mail.enabled` is true on staging, so its `lo_mail_sends` row should carry WATCH THE WEBINAR RECORDING.
- Screenshots: `recording-from-meet-1440.png`, `recording-from-meet-375.png` (link attached by the tick, "from Meet"), `recording-manual-link-1440.png`, `recording-manual-link-375.png` (admin link, no label). There is no BEFORE shot of the same session: the tick attached the link before the shot.
- Tests: `WebinarRecordingServiceTest` (12), `GoogleMeetClientTest` (recordings + truncated list), `WebinarRecordingAdminControllerTest`, `WebinarRecordingIT` (real Postgres, CI green), FE `webinarRecording.test.ts` (12).
- Review: no CRITICAL/HIGH. Fixed: never attach a shorter file when the long one has no usable link; refuse a truncated `recordings.list`; any admin change (set or clear) ends the Meet step; legacy link reads MANUAL; one-statement attempt count.

**Open questions for Bao**
1. **Drive sharing.** The file is in the organizer's Drive. Google shares a Meet recording automatically only with the organizer and the invitees inside the organizer's organization, so a Loan Officer outside loanfactory.com may get "request access" from the mail button. MOSO's link (the Calendar attachment) is the same file, so this is today's behaviour too. To fix it, either share the organizer's "Meet Recordings" folder as "anyone with the link", or give Recruit a Drive scope (a consent change, NOT done).
2. **OAuth scope:** no gap. `conferenceRecords.recordings.list` accepts `meetings.space.readonly`, which the organizer already granted for attendance.
3. **Timing:** hourly tick, so the link normally lands within 1–2 h of the end, well before the 14:00 day-after mail. It is not guaranteed if Google generates the file late or the host's Google connection is down at that time; the mail then goes without the button, as before.

## 2. A lead merge moves Recruit webinar registrations (D390, agentflow-0gwad.4.12)

- recruit-be #870, squash `1b0e027c4`, no migration (Flyway stayed 328 then). Promote 42083111307, cd-staging 42083161980, on staging (`origin/staging` contains it).
- **E2E (re-checked by id 06/11):**
  - Collision: kept lead `97eb3f13` and merged-away `5110b9ef`, session `0b5caecf`. Registration `20f20fd3` kept, `df0cf589` removed. `5110b9ef.merged_into_id = 97eb3f13`.
  - Move: kept lead `1f111e30` and merged-away `1c44ff75`, session `d4b51e9f`. Registration `6bea7928` now on `1f111e30`. `ff357a31` (`1f111e30`, session `ac4d5523`) unchanged.
  - Test registrations were cancelled afterwards. No reminder rows existed, so nothing was sent.
- Open (accepted in D390): a day-after or referrer mail run that overlaps a merge commit can send once under the old id (never twice). A FAILED send on the merged-away lead blocks that reminder for the kept lead. Two former leads on different sessions of one series stay registered on both.

## 3. A webinar picked in a call result uses Recruit sessions (D392, agentflow-0gwad.4.13)

- recruit-be #875, squash `c3ae0294`, no migration. Promote 42100880790, deploy 42100924566, pod `recruit-be-6ff79c9577-86894` at that time. No FE change: the list keeps its shape and packs' time format.
- Gate: `WebinarScheduleFlag` (`recruit.features.webinar-schedule`). With the flag OFF (prod) the behaviour is unchanged.
- **E2E (re-checked by id 06/11):** lead `1f111e30` (no MOSO record), session `6e642dbd`. Registration `1f3ca1dd` with source CALL (since cancelled). Confirmation `lo_mail_sends` `f8787a8d`, status SENT, kind WEBINAR_SESSION. No packs outbox row for the lead. Follow-ups dated Nov 12 and Nov 16 from the session.
- Screenshots: `call-pick-before-1440.png`, `call-pick-before-375.png`, `call-pick-after-1440.png`, `call-pick-after-375.png`, `call-pick-after-selected-1440.png`.
- Known gaps: Recruit's attendance read does not close the D253 feedback call. A mail that a later sender gate skips (for example the allowlist) gets no timeline note.

## Decision 06/11 (Bao): recording access by folder link sharing, no code
Recordings are auto-attached from Meet (D389), but the Drive file belongs to the organizer and is shared only inside loanfactory.com. Bao chose: the organizer shares the Drive folder "Meet Recordings" once, with "Anyone with the link can view". New recordings in that folder inherit the setting.
- Staging organizer: bao.trinh@loanfactory.com (do once).
- Production organizer (usually Brayan): do once before the webinar cut-over (rollout plan step 2).
- Caveat: if the Workspace admin blocks external link sharing, this needs IT/Khai; then fall back to a Drive scope (consent change).
Steps: drive.google.com, My Drive, folder "Meet Recordings", Share, General access: "Anyone with the link", role Viewer, Done.

## Decision 06/11 (Bao): prod webinar organizer = recruiting@loanfactory.com
This is option 1: a dedicated organizer, so its "Google Meet" Drive folder holds only webinars and can be link-shared once. It replaces the earlier plan where Brayan was the organizer.

Steps before the cut-over:
1. recruiting@ connects Google in Recruit prod.
2. The webinar series host is set to recruiting@.
3. Its "Google Meet" folder is shared as "Anyone with the link: Viewer".

Staging check (06/11): the auto-attached recording of session b12c3b56 opens anonymously after its folder was link-shared.
