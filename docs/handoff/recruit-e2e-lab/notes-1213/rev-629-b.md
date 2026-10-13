# recruit-be PR #629 — second independent review (rev-629-b)

Head reviewed: fe967900 (D253, V243). This was a read-only review: `gh pr diff`, a throwaway detached worktree (now removed), and recruit-fe `origin/master` read with `git show`. Staging was read with q.sh (SELECT only) and one GET on packs `getNextWebinars`. Nothing was pushed or committed.

## Verdict: REQUEST CHANGES

The BE logic is correct. The dates, the business zone, PDT/PST, the edge cases, the owner-scoped replace and the after-commit handling all check out, and the FE save flow works with no change. The problem is what a recruiter sees on Today. Both new follow-ups have kind WEBINAR, and the FE's headline for WEBINAR is "Invite to the webinar". So every row this PR creates reads as a contradiction (H1). Fix that before prod, either with a small FE copy PR shipped with this one or with the BE option below.

## Findings, by severity

### HIGH

**H1. Today/Focus headline contradicts both new follow-ups.** recruit-fe `today/_utils/instructionText.tsx:88` renders `instruction_follow_up_${kind}`. `outcome.json:69` maps WEBINAR to **"Invite to the webinar"**. With this PR the recruiter sees:
- Reminder day: "Invite to the webinar — Webinar on Nov 18. Remind them to join." The LO is already registered.
- Feedback day: "Invite to the webinar — Webinar was on Nov 18. Call to ask how it went." This is plainly wrong.
- The Focus queue rail uses `instructionPlainSentence`, which drops the note. There the feedback-day row reads only **"Invite to the webinar"**.

Before this PR, one post-registration row said this, and it was already a bit off. Now every dated registration gets two rows like it, and one of them is explicitly a post-session call. The PR says "No FE change", which is true for saving but not for display. Two options:
- (a) An FE copy change: give WEBINAR a neutral headline such as "Webinar follow-up", or base the sentence on the note.
- (b) In the BE, create the feedback row as CALL_NEXT ("Call back — Webinar was on … Call to ask how it went."). The cost is that the replace on re-registration would then also need to match that CALL_NEXT, for example by note prefix, which is fragile.

I recommend (a), with a one-line FE PR merged and deployed together with this one.

### MEDIUM

**M1. The "+1" tooltip is misleading on the reminder day.** `TodayQueueRow.tsx:255` builds `fu_more_tooltip` = "{n} more follow-ups ({m} today)" with m = `due_today_count`. `DashboardServiceImpl.dueTodayCount` counts every open row due before tomorrow, and that includes the primary row. On the reminder day the tooltip therefore says **"1 more follow-ups (1 today)"**, which reads as "the extra one is today" when it is really two days out. "1 more follow-ups" is also bad grammar. This was already the case before the PR, but D253 makes it the normal path for every webinar lead. The PR says it is "covered by the existing tooltip"; it is covered, but wrongly. Suggested fix: plural ICU, and either exclude the primary from m or show the next date ("+1 · Nov 19").

**M2. The replace also closes a WEBINAR follow-up the recruiter added by hand.** `CHOOSABLE_FOLLOW_UP_KINDS` (`shared/utils/followUp.ts:4`) includes WEBINAR, so "Add follow-up" in the Follow-ups panel can create one. On the next dated "Save webinar reminder", `closeOpenMatching(WEBINAR, owner, not in keep)` closes it with "Follow-up replaced: Webinar, <date>". This is probably intended: every owner WEBINAR row counts as "this registration's reminder". Still, `close` is the same endpoint as Done, the panel history will list it as closed, and the only explanation is the timeline line. Nothing on the card tells the recruiter beforehand. Confirm with Bao that this is wanted, or narrow the predicate to rows with a webinar-generated note.

**M3. A stale snapshot is read before a live one.** `webinarStart` calls `webinarClient.cachedUpcoming()` first, and that returns the last snapshot *however old* (see its javadoc). It only goes live on a miss. If packs reschedules a session, a pod whose last refresh is old builds the pair on the old date. This matters more on prod (2–3 replicas: the dropdown GET can warm pod A while the POST lands on pod B). `webinarClient.upcoming()` already returns the cached snapshot while it is within the TTL and refreshes when stale, so using it alone keeps the usual case free and stops trusting an old answer. The cost is at most one bounded read (4 s) on a stale pod.

### LOW

**L1. The pair is created even when registration did not happen.** This covers EMAIL suppressed and "registration was not queued". The timeline then says "NOT registered" while the reminder says "Remind them to join". It is arguably still useful (they can self-register), but consider a different note, or skip the reminder, when `webinarRegistered == false`.

**L2. The outcome line mixes formats.** It reads "Call outcome INTERESTED -> WEBINAR due 2026-11-17 (reminder) and 2026-11-19 (feedback call), session Nov 18": raw ISO dates next to a readable session. Case AI b (12/10) removed raw ISO from timeline lines. Use `readableDay` for both dates. No consumer parses this text: the FE `activityTimeline.ts` doesn't, and the BE only matches the `'Call outcome %'` prefix (V107).

**L3. Concurrent double submit.** Two simultaneous saves each create a pair, and each after-commit closes the other's rows, so the lead can be left with zero or one row. The FE's `inFlight` guard makes this unlikely. It is noted for completeness and does not block.

**L4. A session at local midnight prints with no time.** This is the staging case: `readableWhen` treats business-zone 00:00 as "untimed" and prints only "Nov 18". That is acceptable (nothing false is shown), but it explains why the staging note will have no time.

## The questions asked

1. **Copy and zone.** The copy is plain and correct. Formatter `h:mm a z`, Locale.US, America/Los_Angeles (staging `business_hours.timezone` confirmed). I verified with a Java run:
   - `2026-10-14T11:00--US/Pacific` → "11:00 AM PDT"
   - `2026-11-18T11:00--US/Pacific` → "11:00 AM PST"
   - `2026-11-18T14:00--US/Eastern` → "11:00 AM PST"

   DST is handled. The year is added only when it differs from the current one (`readableDay`).
2. **Today.** The earliest open row is the primary (`earliestOpen`), so the LO shows on the reminder day. After Done they move to "scheduled later" and come back on the feedback day. The tooltip is misleading (M1), and the headline is wrong (H1).
3. **Replace side effects.** It is scoped to the owner, WEBINAR only, and excludes the new pair. It runs after commit and is best-effort, and each closed row gets a "Follow-up replaced" line. It does close manually added WEBINAR rows (M2). A colleague's rows are untouched.
4. **Edge cases.**
   - Session tomorrow: the reminder day = today, so only the feedback call is created.
   - Session today: only the feedback call. In practice packs' "next webinars" may already drop a session that has started, which falls back to the old single row.
   - Date unknown: the old single follow-up, today + `default_due_days`, with no replace.
   - Re-registration: the new pair is created and the old rows are closed.

   **None of these is explained to the recruiter anywhere in the UI.** The only trace is the outcome timeline line. Optional: a one-line hint under the session dropdown, e.g. "We'll remind you the day before and the day after."
5. **FE flow unchanged.** Confirmed. `OutcomeSection.tsx:368-378` sends `nextStepDueDate`, `nextStepTime` and `nextStepAt` as `undefined` for WEBINAR, plus `webinarId`, so the BE gate (`nextStepAt == null && nextStepDueDate == null`) is reached. The save needs no FE change; only the display does (H1, M1).
6. **Staging (SELECT only).**
   - QA Tenfwebinar = `1fa53186-…a754`, owner `d8186688-…`.
   - Its activity: "Call outcome INTERESTED -> WEBINAR due 2026-10-13, registered for webinar 35412067022" (12/10 17:10Z). That is the old single row, next day, as the PR describes.
   - Live staging `getNextWebinars?type=loan_officer_recruiting` lists `35412067022 | HIEN TEST WEBINAR BEFORE 2 HOURS | 2026-11-18T00:00--US/Pacific`. The id matches exactly, and `PacksWebinarTime.parse` reads this format.
   - With V243's 1/1, the BE would build: session day Wed 2026-11-18; reminder Tue 11-17 "Webinar on Nov 18. Remind them to join."; feedback Thu 11-19 "Webinar was on Nov 18. Call to ask how it went." (Veterans Day 11-11 is not involved.)
   - V243 settings are not on staging yet, as expected before merge.

## Tests (self-run, ram-gate gradle, on fe967900)

| Test class | Passed |
|---|---|
| `FollowUpServiceWebinarFollowUpsTest` | 10/10 |
| `WebinarFollowUpDatesTest` | 10/10 |
| `FollowUpRemoverTest` | 28/28 |
| `BusinessHoursCalendarTest` | 37/37 |

0 failures, 0 errors. I did not run the ITs.
