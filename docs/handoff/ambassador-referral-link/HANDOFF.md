# HANDOFF — Ambassador referral link → `<domain_url>/loan-officer` (paused 2026-10-06)

## Ask (Bao, 06/10)
On lf-homepage `/ambassador-program`, the hero card's "Your referral link" must be
`<LO page>/loan-officer` instead of `<LO page>/refer/refer-a-loan-officer`
(e.g. `https://www.loanfactory.com/sethaugust/loan-officer`, `https://www.suongloanofficer.com/loan-officer`).
Bao then said: review + merge to master, **and merge to production too** ("deploy production luôn").
Bao paused the session at the end of the day (06/10) — resume from "Next steps".

## Done
- Code: `src/shared/utils/loProgramStatus.ts` — new `OWN_LO_PAGE_PATH = '/loan-officer'`;
  `referralUrl = domain_url (trailing slashes stripped) + '/loan-officer'`; no domain_url → still `/refer/refer-a-loan-officer`.
  Tests: 3 cases in `src/shared/utils/__tests__/loProgramStatusStanding.test.ts` (2 RED before fix, 12/12 green after).
- `domain_url` comes from MOSO `findALoanOfficer` by NMLS (not loInfo). Measured on prod: Seth → `"https://www.loanfactory.com/sethaugust"` (absolute).
- **PR #2622 → master: MERGED** (merge commit `da26df08`, PR head `d5d18e11`). Staging deploys from master.
- Reviews (both verdict MERGE): Repo Owner agent + second reviewer. Second reviewer verified attribution:
  lo-homepage renders `/<slug>/loan-officer` and own-domain `/loan-officer`; its form sends `agent_email = loInfo.company_email` (page owner), so candidates are tied to the referring LO — at least as good as the old refer page.
- Production hotfix branch **pushed**: `hotfix/prod-ambassador-referral-loan-officer-page` = `ba6bab1d`,
  cut from `origin/production` @ `bbd2a097`, `git cherry-pick -x d5d18e11`; patch-id identical; diff = the same 2 files; jest 12/12.
  Worktree: `lf-homepage/.worktrees/referral-lo-page` (now on the hotfix branch, has node_modules + next-env.d.ts).

## Why hotfix instead of promoting master
`master` is ~24 PRs ahead of `production` (tdqcv register form, loan-officer-v1, team-lead picker "staging only until 048o", ambassador one-card #2588–2590, …). Promoting master would ship all of them. Production already has the status card + `ReferralLink`; only the URL tail differs.

## Next steps (in order)
1. In the worktree: `rm -rf .next` (stale types from the master build gave false TS2307 on register-loan-officer-v1), then
   `npx tsc --noEmit` and `npm run build` **under ram-gate** (`tok=$(~/.claude/bin/ram-gate acquire next-dev lfh-prod-hotfix-build --wait 900)` … release). Cherry-pick does not run the husky hook, and this worktree has no `.husky/_`, so hooks never run here — run checks by hand. ESLint needs `--resolve-plugins-relative-to .`.
   ⚠️ Bao interrupted exactly this build command at the pause — ask nothing, just re-run it unless Bao says otherwise.
2. `git fetch`; if `origin/production` moved, `git rebase origin/production` + `--force-with-lease`, rebuild.
3. Open PR `hotfix/prod-ambassador-referral-loan-officer-page` → `production` (`gh pr create --repo LoanFactory-Inc/lf-homepage --base production --head hotfix/prod-ambassador-referral-loan-officer-page`). Get a Repo Owner agent verdict on the PR (can reuse the master review — patch-id identical — but have it check the production tree). Wait for any running production Cloud Build to finish, then merge with **merge commit** + `--match-head-commit`.
4. After deploy (Cloud Run `lf-homepage`, project `lender-rate`): image tag = merge SHA, `latestReady == latestCreated`, 100% traffic on latest. Then check the live card (signed in as an ambassador) or at least that the bundle has `/loan-officer` referral.
5. Report to Bao with evidence.

## Open question from Bao — not answered yet
"Most LF loan officers have their own page, right? Can you measure it?" (i.e. how many fall back to the company refer page).
Attempt: `findALoanOfficer` paged list (`{"l":1000,"s":N}`, optional `"hide_from_public_website":"false"`), count rows with non-empty `domain_url` among rows with `mortgage_nmls`.
Script: session scratchpad `count_lo.py` (lost after reboot — rewrite: POST `https://www.loanfactory.com/api/webplus/v1/5716104026521600/findALoanOfficer`, decode with `errors="replace"`, `json.loads(strict=False)` — the response has bad UTF-8 and raw control chars).
Result so far: prod returned **HTTP 503** on a big page (l=3000 earlier timed out / l=1000 → 503). Retry with smaller pages (l=200) and a delay; measure prod AND staging (viet18). Report % with domain_url, split loanfactory slug vs own domain.
