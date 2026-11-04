# Setup call booking — plan (agentflow-gwj7y)

Product owner 08/10: the post-Joined "Setup call" step (D232) gets a real booking action that reuses the
"Book 1-1" flow. Mockup: `post-joined-mockup.html` section D (booked state = time + **Mark done** + **Reschedule**).

Read on `origin/master`: recruit-be `b20ff041` (#596), recruit-fe `b648d195`.

## 1. How "Book 1-1" works today (end to end)

| Layer | What |
|---|---|
| FE modal | `work/_components/WorkQueueClient/ScheduleMeetingModal.tsx`, driven by `useScheduleMeetingActions.ts`. Takes a `DepartmentQueueRow` (+ `onboarding_meeting` block). Today reuses it via `today/_components/OnboardingSection/useOnboardingActions.tsx` (`rowFromItem` builds the row from the Today item, no extra request). |
| Two modes | `useCalendarMode`: **API mode** = calendar events on for the deployment AND the viewer has connected Google. Save only PUTs the slot; recruit-be creates the event, Meet link and invite after commit. **Template mode** (not connected / flag off): Save PUTs the slot then opens a pre-filled Google Calendar template tab (`buildGoogleCalendarLink`); the person adds Meet in Google and may paste the link back. Both modes always save a slot, so booking never depends on Google. |
| API | `PUT /api/v1/checklist-items/{id}/onboarding-meeting/schedule` `{starts_at, minutes 5-240, link?, colleague_user_ids?}`; `DELETE` same path clears. `ChecklistController` → `ChecklistFacadeImpl#scheduleOnboardingMeeting` / `#clearOnboardingMeeting`. |
| Gate | `ChecklistFacadeImpl#demandScheduleMeeting`: template **must be `ONB_PREMEETING`** (else 400), item OPEN/BLOCKED, item has an assignee (else 409), actor has `CHECKLIST_ITEM_MANAGE_ONBOARDING`, actor **is** the assignee (specialist). |
| Storage | Slot on the checklist item itself: `checklist_items.meeting_starts_at / meeting_minutes / meeting_link / meeting_planned_at / meeting_colleague_user_ids` (generic columns, any template). `ChecklistItemServiceImpl#scheduleMeeting` writes them + an internal SYSTEM activity "Planned the 1-1 …". |
| Google event | `OnboardingMeetingCalendarSync` (extends `CalendarMeetingSync`), `requestAfterCommit(itemId, actor)`. Organizer = the person who books (must be connected). Rows in `calendar_meetings` (V215; V219 added `source_kind` CHECKLIST_ITEM / FOLLOW_UP). `accepts(slot)` = `ONB_PREMEETING` only; `summary` = "LoanFactory onboarding 1-1: {LO}". State PENDING / SCHEDULED / LINK_PENDING / FAILED / CANCELLED, Meet URI copied to `meeting_link`. Read back by `CalendarEventStatusReader.byItem` (template-agnostic). |
| Meet attendance (V218, D212) | `MeetAttendanceTickService#readOne` closes anything not `ONB_PREMEETING` as `ITEM_CLOSED`; auto-done is 1-1 only. |
| Flags | `recruit.features.google-calendar-events`: **staging on, production off** (production = template mode). `recruit.features.post-joined-progress`: on in both value files. |
| Reschedule / cancel | Reschedule = same PUT (patches the one event). Cancel = DELETE exists in the BE, but **no FE UI uses it** → we ship Reschedule, not Cancel. |

The "Meet 1-1" next step (V219/V220, `FollowUpMeetingCalendarSync`, followup-be) is the recruiter's pre-join
call; it is keyed on a follow-up, not a checklist item, so it is **not** the flow to reuse here.

## 2. How the setup call is stored today

- Checklist item `ONB_SETUP_CALL` (template `ct-onb-setup-call`, trigger ON_ENTER_S6, held back: `due_at` NULL until
  HR and Licensing are both done, then `PostJoinedProgressService#openSetupCall` sets it). **No assignee** (generated
  with `assigneeId = null`).
- Done = `PATCH /checklist-items/{id}` status DONE (`useSetupCallDone`), gate `CHECKLIST_ITEM_MANAGE_ONBOARDING`;
  `PostJoinedProgressService#onSetupCallFinished` then asks for the auto move to S7.
- Surfaces: progress card (`GET /candidates/{id}/onboarding-progress` → `setup_call {item_id, status, open, due_at,
  done_at, done_by}`; Mark done shown when `can_tick` = owner / onboarding specialist / RBAC_MANAGE admin), and
  Today's `BOOK_SETUP_CALL` row (`OnboardingTodayReader#setupCalls`, specialist only, carries no meeting fields).

## 3. Design

Reuse the 1-1 slot columns, endpoint, modal and Google sync for the `ONB_SETUP_CALL` item. **No migration**: every
column and the `calendar_meetings` CHECKLIST_ITEM source already fit any checklist item.

- **Who may book**: the same people who may Mark the setup call done on the card (`mayTick`: owner, onboarding
  specialist, RBAC_MANAGE admin), the post-Joined flag on, item open, HR and Licensing both done. Organizer of the
  Google event = whoever books (needs Google connected for API mode; otherwise template mode).
- **Mark done** stays the same PATCH (→ S7). The FE shows it only once a slot is booked; the BE does **not** demand a
  slot (keeps NA/admin paths and setup calls already held outside the app).
- Event title "Setup call — {LO name}"; modal heading "Book the setup call" / "Reschedule the setup call".
- No Meet-attendance auto-done, no reminder e-mails, no due-meeting bells for the setup call (1-1 only, unchanged).

### recruit-be (`agent/agentflow-gwj7y-setup-call-booking`)

| File | Change |
|---|---|
| `checklist/facade/impl/ChecklistFacadeImpl.java` | `demandScheduleMeeting` branches on template: `ONB_PREMEETING` unchanged; `ONB_SETUP_CALL` → new gate via `PostJoinedProgressService` (flag, open, both sides done, `mayTick`); any other template still 400. |
| `postjoined/PostJoinedProgressService.java` | `requireMayBookSetupCall(item, actor)`; `SetupCall` view gains the slot. |
| `postjoined/model/PostJoinedProgressResponse.java` | `SetupCall` + `plannedStartsAt, plannedMinutes, meetingLink, meetingZone, defaultMinutes, calendarEvent, colleagues, suggestedColleagueUserIds`. |
| `google/calendar/OnboardingMeetingCalendarSync.java` | `accepts` ONB_PREMEETING **or** ONB_SETUP_CALL; `summary` per template. |
| `checklist/service/impl/ChecklistItemServiceImpl.java` | Activity text says "setup call" for that template. |
| `dashboard/OnboardingTodayReader.java` (+ `OnboardingTodayItem`) | `BOOK_SETUP_CALL` rows carry `meeting_at/minutes/link/calendar_event/colleagues/suggested` (one batched `CalendarEventStatusReader` read). |
| `google/meet/JdbcMeetAttendanceStore.java` | Claim only `ONB_PREMEETING` rows, so setup-call meetings are never logged `ITEM_CLOSED`. |
| `docs/DECISIONS.md` | **D235** (next free; highest on master is D234, no open PR claims a D23x row). |
| Tests | `ChecklistFacadeImplTest` (gate matrix; the "not ONB_PREMEETING → 400" case moves to another template such as `ONB_ASSIGN_SUPPORT`, same assertion), `OnboardingMeetingScheduleEndpointIT` (setup call: book, reschedule, 403 stranger, 400 sides not done), `OnboardingMeetingCalendarEventsIT` (event made for a setup call, title), `PostJoinedProgressIT` + Today reader IT (slot fields). jdbcTemplate writes inside `TransactionTemplate`. |

### recruit-fe (`agent/agentflow-gwj7y-setup-call-booking`)

| File | Change |
|---|---|
| `shared/types/onboardingProgress.ts`, `shared/types/recruitInvites.ts` | New optional slot fields. |
| `hooks/useSetupCallBooking.tsx` (new) | Builds a `DepartmentQueueRow` (`template_code: 'ONB_SETUP_CALL'`) from the card or Today data; wraps `useScheduleMeetingActions` + `ScheduleMeetingModal`; refreshes progress + Today. |
| `ScheduleMeetingModal.tsx` | Heading + template-mode purpose keyed on `row.template_code` (setup call vs 1-1). |
| `shared/components/OnboardingProgress/OnboardingProgressCard.tsx` | Setup call step: not booked → orange **Book the setup call** (calendar icon); booked → "Oct 15, 10:00 AM PT", Meet link (when present), **Mark done** + **Reschedule**. |
| `today/_components/OnboardingSection/index.tsx` | `BOOK_SETUP_CALL`: not booked → Book; booked → time, Join (link), Mark done, Reschedule. |
| `messages/{en,vi}/*.json` | `setup_book`, `setup_reschedule`, modal heading, calendar purpose; en+vi parity, no explanatory text. |
| Tests | Card + Today jest (both states, both modes' Save path), row-builder unit test. |

## 4. Risks

1. **Production is template mode** (calendar events off): booking saves the slot and opens Google Calendar; the Meet
   link appears only if pasted. Matches the 1-1 on prod today.
2. **Gate widens beyond the 1-1's "assignee only"**: owner and admin may book the setup call too. Chosen to match who
   may Mark it done; say no if only the specialist should.
3. Organizer = booker; a later reschedule by someone else patches the same event as the original organizer (existing
   `CalendarMeetingSync` behaviour).
4. Shared code with the live 1-1 (gate, sync `accepts`, attendance claim): every 1-1 IT must stay green; negative
   control = drop the ONB_SETUP_CALL branch and the new ITs must fail.
5. Setup calls already marked done outside the app: unaffected (BE does not require a slot).
6. No cancel UI (Book 1-1 has none).
