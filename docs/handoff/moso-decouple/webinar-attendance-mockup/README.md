# Webinar attendance mockup (local only, not pushed)

Shows how "who attended the webinar and for how long" will appear once Recruit reads the Google Meet participants of a
session after it ends. The BE does not exist yet. Every screen is the REAL recruit-fe screen (real components, real
i18n, real role view) driven by mocked API answers through Playwright route interception against a local `next dev`.

- Code: branch `mockup/webinar-attendance`, worktree `recruit-fe-worktrees/webinar-attendance-mockup`. Local, never pushed.
  It sits on origin/master plus the holidays-card removal (PR #671), so the page shows no Holidays card.
- Mock data: `scripts/data.mjs`. Session Fri 06/11 "Why Loan Factory". Anna Lee attended 52 min, Ben Carter registered
  but absent, Chris Diaz attended 9 min (left early). Browser clock fixed to Mon 09/11 so the session is in the past.
- Look: the 2026 design. Dev server run with `NEXT_PUBLIC_TERA_DESIGN=true`, the flag staging builds with (`.github/workflows/cd-staging.yml`).
  The new pieces needed no change under 2026 tokens (state tints, ink, weight 500, pill chip).
- Re-run: `scripts/*.mjs` (needs `playwright-core`, `CHROME`, dev server on :3917 started with `TZ=America/Los_Angeles`).

## Screens

### 1. Session page (replaces the drawer): `1-session-default-1440.png`, `1-session-noshow-1440.png`, `1-session-cards-1440.png`, `1-session-pager-1440.png`, and `-375` of default, no-show and cards
- Route `/webinar-schedule/sessions/[id]`, opened from the Webinar schedule by clicking the session row or its Registered count.
  The registrants drawer is no longer used by the page (`RegistrantsDrawer.tsx` is back to its master version, unused).
- Rendered as: Manager (WEBINAR_SCHEDULE_READ + MANAGE). The header's dev persona label still reads "Brayan - Recruiter"; that is the dev switcher, not the role the page used.
- Mock: 63 registrants, a 90-minute session, 18 attended (4 under 45 min = left early), 45 no-show, 25 per page (3 pages). Left early = under 50% of the session length, applied by the FE in `registrantsList.ts`.
- New files: `webinar-schedule/sessions/[id]/page.tsx`, `webinar-schedule/_components/SessionRegistrantsClient/` (`index.tsx`, `registrantsList.ts`, `RegistrantRow.tsx`, `RegistrantCard.tsx`, `AttendanceChip.tsx`, `SortHeader.tsx`, `sessionRegistrants.css`).
  Modified: `WebinarScheduleClient/index.tsx` and `SessionsTable.tsx` (the row and the count navigate), `apis/recruit/webinarSchedule.api.ts` (registrant fields: NMLS, owner, registered at, attendance).
- Real components mirrored (the Pipeline's list kit, imported, not copied): `TeraListPage`, `ListSurface`, `ListPager` (`@components/TeraList`, teraList.css); `FilterBar`, `FilterSearch`, `FilterSelect`, `FilterReset`, `FilterRefresh`, `Notice` (`@components/HrList`);
  `PhoneFilters` (phone filter sheet); `ListViewToggle` + `useCardView` (Table | Cards); `SavedFiltersMenu` + `useDefaultPreset` (target `WEBINAR_SESSION`); `usePipelineSearch` (debounced search into the URL);
  `LeadWhoCell` (avatar, name, NMLS), `OwnerBadge`, `StatusChip`, `MeetingLink`, `EmptyState`, `CandidateDrawer` (row click); `pipelineCards.css` for the card grid; the Pipeline's sort header markup (`rec-sort-btn`).
- URL state: `q`, `attendance`, `owner`, `sort`, `page`, `pageSize`, `view` (hard rule #5). Search, sort and paging run in the page because the registrations route returns the whole session (about 175 people at most).
- Columns: Loan officer, Email, Owner, Registered at, Attendance, Minutes. Whole row tinted by state (green `#eef7f0`, amber `#fdf4e3`, red `#fff5f5`); the 2026 design forces the card surface with `!important`, so the card tint outranks it in `sessionRegistrants.css`.
- At 375 the table scrolls sideways like the Pipeline's does; Cards is the phone-friendly view.
- NEW strings (WebinarSchedule namespace, en + vi): "Name, email or NMLS…", "Attendance", "Owner", "All", "Attended", "Left early", "No-show", "Not read yet", "All owners", "Unowned", "Registered at", "Name", "Minutes attended", column titles
  "Loan officer / Email / Owner / Registered at / Attendance / Minutes", chips "Attended · 52m", "Left early · 9m", "No-show", "Not read yet", and "{n} registered · {n} attended · {n} no-show".
- EXISTING strings reused: "Back" (Drawer.cp_back), "Sort", "No candidates match" + "Loosen a filter or clear the search." (Pipeline), "Refresh", "Reset filters", "Rows per page", "Page 1 of 3 · 63 total", the Table/Cards labels (TeraList), the status chip words (Held, ...), the Meet link and its copy button.
- Limit: the saved-filter menu works against `/saved-filters` with target `WEBINAR_SESSION`; the mock answers an empty list.

### 2. Webinar marker on Loan Officer rows: `2-pipeline-1440.png`, `2-hot-1440.png`
- Rendered as: Recruiter. Pipeline (Mine) and Hot leads. Both use the shared `LeadSourceCell`, so Cold, Dormant and the cards get it too.
- Real file modified: `app/[locale]/(private)/inbox/_shared/LeadSourceCell.tsx` (+ `shared/utils/sourceDetail.ts` and `shared/types/sourceDetail.ts` for the new fields).
- What exists today: the "Webinar" source chip plus a plain sub-line "Webinar session: Nov 6". There is NO registered/attended chip variant today,
  so none could be reused. The new chip is the existing `StatusChip` pill (green, red, amber tones) and REPLACES the plain sub-line when attendance is known.
  The sub-line stays as is when attendance is not known yet.
- NEW: "Attended Nov 6 · 52m" (green), "Attended Nov 6 · 9m" (amber), "No-show Nov 6" (red).
- EXISTING: "Webinar" source chip, every other column.
- Date format: the screen's own short format ("Nov 6" in en, as the old sub-line). Your example "06/11" would need a different formatter. Say if you want dd/MM.
- Also shown: Chris (9 min, amber) next to Anna and Ben.

### 3. Loan Officer profile timeline (Contact history): `3-timeline-anna-1440.png`, `3-timeline-ben-1440.png`, `3-timeline-anna-375.png`, `3-timeline-ben-375.png`
- Rendered as: Recruiter, full profile `/candidates/<id>?section=activity`.
- Real file modified: none. The event is a normal SYSTEM activity row with a `summary`, rendered by the existing `CandidateDrawer/ActivityRow.tsx`
  (same as "Call outcome ... due 26/08" lines, which also use dd/MM). The BE would write the row; the FE needs no change.
- NEW strings (BE-written summaries, not i18n keys): "Attended webinar Why Loan Factory · Fri 06/11 · 52 min", "Missed webinar Why Loan Factory · Fri 06/11".
- EXISTING: the whole profile, "Contact history", filters, day header, row layout, SYSTEM icon and actor.
- Limit: SYSTEM rows are the quietest tone, so attended and missed look the same here (no green or red). A tint on these two rows would be new FE work.

### 4. Today: `4-today-1440.png`
- Rendered as: Recruiter (Anna's owner).
- Real files modified: `today/_components/TodayClient/LeadReason.tsx` (the row's reason cell, where Today already draws its chips: replied, nurture, scheduled send, opted out)
  and the new shared `inbox/_shared/WebinarAttendanceChip.tsx`, which `LeadSourceCell.tsx` (screen 2) now uses too. So it is literally the same chip as the Pipeline's.
- The invented note is gone. The row keeps the existing "Webinar follow-up" title and, under it, the chip "Attended Nov 6 · 52m" (green). The chip shows on a WEBINAR follow-up row whose person has a known attendance.
- NEW strings: none (the chip's text is the one from screen 2).
- EXISTING: "Today" section, "Webinar follow-up", table columns, due chip.

## Wire fields the mock assumes (proposal, not agreed with the BE)
- Registrations list row: `attendance: ATTENDED | NO_SHOW`, `attended_minutes`, `nmls_id`, `owner_id`, `registered_at`. The FE derives "left early" (under 50% of the session length). Screen 2's `source_detail.webinar.attendance` still carries `LEFT_EARLY` from the BE; the two should agree once the BE exists.
- Candidate `source_detail.webinar`: `attendance`, `attended_minutes` next to the existing `starts_at`.
- Missing means "not read yet", never a no-show.
- Screen 3: an ordinary SYSTEM activity. Screen 4: an ordinary WEBINAR follow-up whose candidate carries the same `source_detail.webinar` fields.
- Open point: screen 2's amber chip reads "Attended Nov 6 · 9m" (as first asked) while the session page says "Left early · 9m". Say which wording you want in both places.
