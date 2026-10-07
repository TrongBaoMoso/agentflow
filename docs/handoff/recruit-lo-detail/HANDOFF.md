# Recruit: LO detail (TERA quick view + profile) and Today naming — handoff

Paused by Bao on 2026-10-07 at about 17:00 ICT. Session `7950a7aa-e458-49be-8cbc-a93f36c5fc33`.
Talk to Bao in Vietnamese. Repo artifacts in English.

## Shipped

| PR | What | master | staging | production |
|---|---|---|---|---|
| recruit-fe #399 (agentflow-zd5ut, closed) | Row click opens a TERA quick view (`CandidateDrawer/QuickView.tsx`, still `?c=`). "Open full profile" goes to the new page `/candidates/[id]` (`CandidateDrawer/CandidateProfile.tsx` + `CandidateHero.tsx`), with sections `?section=` and Back `?from=`. Replaces the 360 drawer. Hovering the LO name no longer underlines it. | c8946c61 | yes | **yes**: production = c8946c61, cd-production run 37572028300 success, both serve `candidates/[id]/page-833f702a` |
| recruit-fe #400 (agentflow-kbwn6, closed) | Menu/title `Today` became **My work today** (vi "Việc hôm nay của tôi"). Tiles became "To contact today" / **Never contacted** ("Chưa từng liên hệ"). Copy naming the page follows. | 957382ec | yes (run 37591797647) | **no**: Bao has not said go |
| recruit-fe #406 (agentflow-dobcf, closed) | (1) The tile subtracts `waiting_on_lo_count`. It read 34 over 25 rows because 9 people waiting on payment or signing were counted. (2) No "Another day" group: a `future` bucket is filed under "Later today", because the BE picks rows on the company day (America/Los_Angeles). (3) The tile is now **To contact** (vi "Cần liên hệ"). | ef471c82 | yes (run 37616041222, verified 'To contact', no 'Another day') | **no** — Bao's go |

Before/after screenshots of #399: https://claude.ai/artifact/CN5cfKF1Y6GACAGAk6aKdk

## 07/10 19:15: everything is on PRODUCTION (ef471c82, cd-production run 37618927574 success; carried #392 #402 #404 #406; #400 was already there). Only open item: wait for Bao's next feedback. recruit-be production = staging = 2b1a6e64 (pushed by imkhai 12:15Z, run 37619680195 success), which includes #584, so the #402 preview now matches prod BE.

## (Done) FIRST thing on resume

```bash
gh pr view 406 -R LoanFactory-Inc/recruit-fe --json state,mergeStateStatus,mergeCommit
```
- **OPEN + checks green:** `gh pr merge 406 --squash --subject "fix: Today tile counts the rows on the page, and the page shows one day only (agentflow-dobcf) (#406)"`. If the state is BEHIND, run `gh pr update-branch 406` first and wait for CI.
- **MERGED:** check `git log origin/staging..origin/master`. If #406 is not on staging yet, run `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-fe -f sha=<merge sha>`, then watch `cd-staging.yml` to success.
- **Verify on staging:** `curl -s https://recruit.viet18.com/today | grep -o "To contact\|Never contacted\|My work today"`.
- **Then:** `bd close agentflow-dobcf`. Remove the worktree `_worktrees/recruit-fe-today2` and the remote branch `fix/today-counts-oneday`.
- **Production for #400 and #406:** only when Bao says so. The process is: a Repo Owner agent reviews `origin/production..origin/staging`, then `git push origin origin/staging:refs/heads/production`, then watch `cd-production.yml`, then check that prod serves the same chunk.

## Decisions Bao made on 07/10 (do not re-ask)

- LO detail follows the TERA/HR pattern (quick view, then a full profile page), not a drawer. Memory: `feedback_recruit_lo_detail_is_tera_profile_not_drawer`.
- The Today page is **today's work only**: no future, and overdue stays as work owed today. A viewer in Vietnam seeing a time shifted by the timezone is acceptable.
- Title is **My work today**. Tiles are **To contact** and **Never contacted**.
- Meanings, as explained to Bao and verified in code:
  - **To contact**: LOs the recruiter owns that are due today or overdue, plus those with no follow-up set, nurture waking today, and manager pins. Excludes people scheduled for a later day and people waiting on payment or signing.
  - **Never contacted**: the part of To contact with `last_outbound_at` null. Nobody at LF ever logged an outbound call, text or email. Inbound does not count. After a reassign, if the previous owner already contacted the LO, they are not counted.
- Option (b), showing the timezone hint in every scheduling picker for viewers outside California, was **not** chosen. Bao: "I don't know which is better." Leave it unless he asks.

## Open threads and notes

- Bao said "Còn tiếp" (more feedback coming). Wait for his next items.
- Seen on staging: "QA DeferFeeMobile" appears twice on Today (same NMLS 7654321), so it is a duplicate record. It belongs on the Duplicates screen. Not acted on.
- Production recruit-be lacks recruit-be #576 and #580, so on prod "My invites" history and the call-result retry plan run degraded (Repo Owner note, 07/10).
- Pre-existing warning on master and on the old drawer: a React duplicate key `cand-1` on the candidate panel. Seen with fixture data, not caused by #399.
- RAM is tight. Run jest through `~/.claude/bin/ram-gate acquire 1000|1500 <label>` with `--runInBand --runTestsByPath` and a file list. A path containing `[locale]` passed as a pattern matches nothing.
- Screenshot harness, for re-shooting before/after: `scratchpad/qvshots/shoot.mjs` in session 7950a7aa. It is fixture-backed Playwright, with `timestamp` in epoch seconds. It may be gone after a reboot. Rebuild the same way if needed.
