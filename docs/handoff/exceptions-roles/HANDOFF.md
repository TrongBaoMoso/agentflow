# Exceptions page by role: handoff (paused 19/10/2026 ~17:25 VN)

Session 439986cd (Bao). Recruit UI/UX session that grew into access + Exceptions cleanup. Bao paused to shut down the machine; resume from here.

## Bao's decisions in this session (19/10)
- /exceptions, /reports, /duplicates: MANAGER + ADMIN only, URL closed too (not just the menu).
- Hot/Cold list API: CANDIDATE_CLAIM or REPORT_TEAM (Onboarding/HR/Licensing/Accounting lose it).
- Exceptions "Past their SLA" + "Unclaimed after N min" = exact duplicate of Hot leads (measured 57/57) → removed; Hot leads gets Assign next to Claim + bulk Assign (Pipeline picker) for Manager/Admin. No mockup needed.
- "Ready to join, invite not sent": stays on Exceptions (recommendation accepted implicitly; Bao asked for a recommendation).
- "Signed in MOSO, needs a decision": row actions approved. The two "signed" reasons RECORD MOSO's state, NO e-mail ("Mark signed (as in MOSO)"); "Accept paid (as in MOSO)"; "Create new offer" via InviteModal; "Mark handled" with reason, manager NAME in the timeline line; never auto-hide by time.
- Exceptions menu badge: keep, fed by new BE /exceptions/counts.
- Archived Loan Officers who raise their hand stay in Hot leads (Q50 intent).
- BE prod push: OK to ship up to #681 including #682 (w9fk4 HR checklist read API).

## Done
| What | PR | Staging | Production |
|---|---|---|---|
| URL guard /exceptions /reports /duplicates | fe #531 | ✅ measured 12 accounts | ✅ (came with another session's 08:11 push) |
| Hot/Cold API gate (D282) | be #681 | ✅ measured (OB/HR/Acct 403) | ✅ 8ecd19ee, pod digest = build |
| /exceptions/counts (D286) | be #684 | ✅ manager total 76, recruiter 403 | ❌ not yet |
| Hot Assign + bulk, Exceptions trimmed, compact claimed-idle table | fe #534 (7bdfb433) | ✅ measured: manager 25/25 Assign+checkbox, recruiter none, no overflow 1280/1440 | ❌ not yet |

Beads: agentflow-jzk05 closed. Follow-ups: agentflow-wuv9s (/candidates?unowned=true still lists for CANDIDATE_READ-only roles), agentflow-eqh8p (/exceptions/counts overdueCount loads rows in memory).

## In flight (resume here)
1. **be #685** feat/moso-sync-actions (D287, V259 moso_sync_handled): follow-signed / accept-paid / handled with required `expected_last_seen` (409 STALE), reason = newest signed skip. Both reviewers APPROVE at 4bc781dd. CI ITs failed 4 tests (fixture: program_invite.require_verified_loans OFF; no onboarding specialist). Test-only fix pushed 42158bf0 (only MosoSyncActionsIT, no assertion changed). → check `gh pr checks 685 -R LoanFactory-Inc/recruit-be`; if green: merge squash, `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<merge sha>`, verify on staging.
2. **fe feat/exceptions-badge-moso-actions** (agent fe-hot-assign, worktree _worktrees/recruit-fe-moso-actions): Exceptions badge from /exceptions/counts + MOSO row actions (spec in this file's decisions). Status at pause: see "Agent state at pause" below. Needs: 2 reviewers, my screenshot measure at 1280/1440 (no overflow), staging after be #685 is on staging.
3. **Production** for #684, #534, #685 + FE badge/MOSO: ASK Bao before pushing (touches real users). Prod = FF push of staging; check `git log origin/production..origin/staging` for other sessions' commits first (w9fk4 FE #525 was staging-only per its away window).

## Open questions for Bao (not answered yet)
- Fix MOSO sync stamping "hand raised" on first sight of a row that already has history (`MosoRowMapper.mapHandRaise`, sets lastHandRaisedAt before `isFreshHandRaise` returns). Prod example: William Bryan / William Robinson / William Franklin / Troy Miller ×2 created by super.admin 16/10, ARCHIVED S5, sat in Hot leads 3 days with no activity.
- Add an "Archived"/"Nurture" chip on Hot leads rows (today no status chip at all).

## Artifacts
- Exceptions by role screenshots: https://claude.ai/artifact/4kbNNX5JUjNoUDahsNx7fC
- Exceptions rules + timelines + proposals: https://claude.ai/artifact/MRUPQDKJWp52QXBARNgHvM

## How to re-check locally (staging data)
Tokens: docs/handoff/recruit-e2e-lab/scripts/auth.js login(). Preview: worktree _worktrees/recruit-fe-hot-assign-preview (detached), `.env.local` copied from recruit-fe-1owir, `npx next dev -p 3511` + `~/.cache/claude-recruit/preview/front_rec.js` with 3311→3511 and an uncaughtException guard (proxy dies on ECONNRESET otherwise). Playwright from ~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright. Always ram-gate.

## Gotchas met
- GitHub Actions org budget ran out once (job "not started because an Actions budget is preventing further use"); re-run worked later.
- Local Docker hung (10 stuck `docker ps`); do NOT restart it (Bao's containers) — BE ITs only in CI.
- DECISIONS numbers collide with other sessions' open PRs: CI guard catches it; re-check before PR.

## Agent state at pause
- **be #685**: last sha 42158bf06e7bc9e5d06a8f6c2341c43fcc0fd51a, nothing uncommitted (worktree _worktrees/recruit-be-moso-actions). CI run 39236551652 was pending at pause. If MosoSyncActionsIT still fails: read logs via `gh api repos/LoanFactory-Inc/recruit-be/actions/jobs/<id>/logs`. S6 credit = OWNER like the automatic heal (one-word change to NONE if Bao wants).
- **fe #535** https://github.com/LoanFactory-Inc/recruit-fe/pull/535 (feat/exceptions-badge-moso-actions): badge from /exceptions/counts (REPORT_TEAM, polls poll_after_seconds, hides 0/403/404) + MOSO row actions (confirm modals, OFFER_APPROVE gate, InviteModal `noApproveNow`, handled modal, STALE/NOT_ON_LIST toasts). 23 new tests, tsc/eslint clean, NOT reviewed, NOT run against real BE or a browser. To do: 2 reviewers; after be #685 on staging check the 409 code location (`conflictCode` in useMosoSyncActions.ts reads error_payload.code); measure MOSO table at 1280/1440 (long labels); then merge + promote staging.


## UPDATE 19/10 evening (after resume)
- be #685 merged fd99407f (3 IT fixture fixes: 42158bf0, 9c0d07f5, d140370b — no assertion loosened) → STAGING ✅ (moso-sync item has last_seen with Z; counts total 76).
- fe #535 merged d72a30aa (reviewed twice; labels "Record signature"/"Record payment", InviteModal warning, 403/400 mapped) → STAGING ✅.
- fe #536 merged 55004050 (owner cell wraps; claimed-idle table 0px overflow at 1280/1440) → STAGING ✅. Measured on staging: badge "Exceptions 76", recruiter has no Exceptions link.
- PRODUCTION: NOT pushed. Both repos are under Bao's prod freeze (pipeline-scope-1910 HANDOFF): staging also carries be #677 (V258), fe #525 (w9fk4, staging-only per its window), #532, #533. Needs Bao's call.

## UPDATE 19/10 night
- fe #538 (Archived/Nurture chip on Hot) merged f06e7214 → STAGING; measured with a patched Hot response: chip 18px, no row growth, no overflow 1440 light / 375 dark.
- be #687 (D288: first-sight MOSO row with history maps like an import — IMPORT source, no hand-raise stamp; v2 stock arm closed) merged b64c9126 → STAGING. pipeline.v2_stages is TRUE on prod and staging.
- be #688 (D289: admin-typed new row = MANUAL, no stamp, Cold; a real signal wins; later registration within hot.hand_raise_window_days stamps with min(now, clock); late referrer on a recent unstamped MANUAL row upgrades to REFERRAL) merged 2bdf6f80 → STAGING. Prod: 1011 rows have no registration baseline; only clocks inside the 3-day window can stamp.
- PRODUCTION still frozen (Bao). Staging-not-prod now also includes #538, #687, #688.

## NOTE 19/10 late
- Session agentflow-5d reports Bao unfroze PRODUCTION for recruit-be + recruit-fe and that agentflow-5d does the FF push (incl. fe #525). This session does NOT push prod; after their deploy, verify prod (Hot Assign, Exceptions badge/MOSO actions, chip, URL guards) if Bao asks.

## DONE — PRODUCTION 19/10 (pushed by session agentflow-5d, verified here)
- recruit-be production 98fe3a4f contains #684 #685 #687 #688 (deploy success; flyway V258, V259 success on prod).
- recruit-fe production 6df12752 contains #534 #535 #536 #538 (deploy success).
- Not measured with prod accounts (no prod test logins); staging measurements stand.

## DONE 19/10 late: PRODUCTION verified by this session
- Pushed by agentflow-5d (Bao unfroze prod). recruit-be production = 98fe3a4f, recruit-fe production = 6df12752; both cd-production runs success (be 14:43Z, fe 14:50Z).
- Every commit of this work is an ancestor of origin/production: be 8ecd19ee (#681), 32219ddc (#684), fd99407f (#685), b64c9126 (#687), 2bdf6f80 (#688); fe 9144f344 (#531), 7bdfb433 (#534), d72a30aa (#535), 55004050 (#536), f06e7214 (#538).
- recruit-be prod pods 2/2 run sha256:aeea52df…, the digest the production build and deploy jobs both log.
- Not checked in a prod browser (no prod test accounts in this session).

## UPDATE 19/10 late night
- fe #542 merged b14e9cde → STAGING (verified manager: picker has no HOT note, scroller 338/338 no horizontal scroll, detail line "Role · Role", bulk bar directly above the table). Prod not pushed yet.
- fe #542 → PRODUCTION b14e9cde (Bao approved 19/10 ~23:40), deploy result in cd-production run.
