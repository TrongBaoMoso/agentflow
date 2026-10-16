# Audit — Call result choices vs the Today page (17/10)

Read from origin/master: recruit-be `5afd936d`, recruit-fe `0dbb0db9`, followup-be `3b2ade0`. Code-only audit (no runtime test).

## Ground rules
- Today = date/status filter only. A row is listed when it is owned, not merged, ACTIVE in S1–S5 (or NURTURE with
  wake day reached) AND (`next_follow_up_at` is NULL or before tomorrow, or nurture wake reached)
  (`CandidateSlices.java:116,221-225,273-279`, `DashboardServiceImpl.java:194-198,452-498`).
- **A reply never puts a row on Today.** `recordInbound` writes an INBOUND activity, resets `no_answer_streak`, stops
  sequences (`ActivityServiceImpl.java:514-560,828-846`). No reply notification kind exists.
- Group (FE `todayTasks.ts:109-120`): nurture woken → Today; follow-up wakeup ≤ now → Overdue, else Today; no follow-up →
  contact deadline (Overdue/Today) else "Nothing scheduled".
- Every lead row has one button "Log result" + Call/SMS/Email icons (`TodayQueueRow.tsx:143-159`).

## Interested (a next step is mandatory)
| Next step | Appears | Row shows | Leaves when |
|---|---|---|---|
| Call again, day D + time | From 00:00 PT on D: Today until the time, Overdue after | "Call back" | Call click (auto-clears due CALL_NEXT → "no result yet" box), result logged, Clear, Remind later, archive, stage ≥ S6 |
| Call again, date only | From 00:00 PT on D, **Overdue all day** (stored at midnight) | "Call back" | same |
| Send info, send now | Message sent now, but a SEND_INFO follow-up due tomorrow is still created → shows tomorrow as "Send the info you promised" (phantom) | same | Clear |
| Send info, schedule later | On that day (Overdue). **Nothing auto-sends**; draft only, Send button only in Focus mode | "Send the info you promised" | Clear / a send once due |
| Webinar | Two follow-ups: working day before (reminder) and after (feedback call) | "Webinar follow-up" | Clear, new webinar save, recruiter-logged MEETING |
| Meet 1-1 | Meeting day (Today before time, Overdue after) | "Meet 1-on-1" | done/closed |
| Add another follow-up | Row shows the EARLIEST open one + "+N" | earliest task | no open follow-up before tomorrow |
| Yes, prepare offer | Not in list; green "Ready to join" box | "Prepare offer" | offer requested |

**LO replies (Email/SMS) before D:** row does NOT appear before D; the call stays; on D it shows "Call back" (the
"replied" line is hidden because an open follow-up outranks it). Reply visible only via Conversation unread counts.

## Neutral (Move to Nurture)
- Month pick 1/2/3/6/12 required in FE (14-day default only via API).
- Before wake day: not on Today at all (not even counted in `total_owned`).
- From wake day: group Today every day until a new result; "Call back after nurture".
- No answer on a woken row keeps NURTURE.
- Reply before wake day: invisible on Today.

## No answer
- Retry ladder 3/5/10/30 days (business days): "Call again · no answer {date}".
- After the 5th miss there is no new retry. The row stays forever in "Nothing scheduled" as "Try another way". No auto-archive.
- A reply resets the streak; the open retry stays.

## Not interested
- ARCHIVED, all open follow-ups closed, out of Today immediately.
- A later reply is recorded but does not revive the LO. A new result is refused.

## Other events
- Clear → "Nothing scheduled", "Set a next step".
- Remind later/reschedule → hidden until the new day.
- Reassign → moves to the new owner.
- Idle auto-release only for un-established S0/S1 HOT claims (flag OFF).
- Stage ≥ S6 → onboarding section only.
- SMS STOP / blacklist → **still on Today** (Hot/Cold hide them).

## "Replied" row today
Only when ACTIVE, cadence stage, NO open follow-up, last inbound > last outbound:
- line "They replied N days ago · reminders paused";
- task "Reply to them", button "Log result";
- no badge, no unread number on the row.

## Gaps
1. Reply before the due date never reaches Today (Call again, Nurture, any future follow-up).
2. Replied line hidden behind any open follow-up and NURTURE.
3. NURTURE not in `total_owned` but counted in the hold cap.
4. Date-only follow-ups red (Overdue) from midnight.
5. Send now leaves a phantom "Send the info you promised" for tomorrow.
6. Scheduled Send info never sends itself.
7. No answer on a woken nurture row keeps NURTURE.
8. A Call click closes the due call before any result is logged.
9. Exhausted no-answer LOs stay forever.
10. The earliest open follow-up masks newer ones.
11. D121's 14-day default is unreachable from the UI.
12. D50/D122 text is stale.
13. Blacklisted/STOP LOs stay on Today.
14. BE business-hours timezone vs FE hard-coded LA.
15. Webinar attendance / LO-booked meeting never close follow-ups.
16. Chat channels other than SMS/EMAIL/CALL are dropped (unverified).
17. `today.queue_cap` production value unverified.
