# Loan Officer join page on their own site — HANDOFF

Session 8658d500 (paused 2026-10-16 ~17:45 +07, Bao went home). Decisions: recruit-be D268/D269
(docs/REFERRAL-AND-RECRUITING-LOGIC.md §4.1–4.3). Bao: "cứ làm đi" (build it, no message to Matt/Vic).

## Goal
Every Loan Officer gets one recruiting page on their own site: `loanfactory.com/<Admin.url>/join`
(also on custom domain `/join`). Same UI/UX as lf `/join/[slug]`, LO site header/footer, no program badge.
Dedicated headhunters (not Loan Officers) keep lf `/join/[slug]`.
Recruiting bio/video are SEPARATE from the loan bio/video in lo-setting (moso-aid `recruiterprofiles`).

## State (all LOCAL commits, nothing pushed)
| Phase | Repo / worktree | Branch | Commit | Status |
|---|---|---|---|---|
| A | moso-aid `_worktrees/moso-aid-lo-join` (from origin/master) | feat/lo-join-page-profile | 875f897 | Done. 99 tests pass; negative control (old recruiter-only gate) fails exactly the 2 new LO tests. |
| B | lo-homepage `_worktrees/lo-join-page` (from origin/produciton-v2) | feature/lo-join-page | 3e2c49081 | Agent "lo-join-port" committed; its final report may not have arrived. NOT yet reviewed by lead: re-run tsc/jest, read the diff, check attribution + routing yourself. |
| C | lf-homepage `_worktrees/lfh-join-redirect` (from origin/master) | feat/join-redirect-lo-site | 889bf2ac | Done. 8 tests, tsc 0, build passes. |

### A — moso-aid
- `recruiters.js`: one getAdmins pull → `{recruiters, loanOfficers}`. `isActiveLoanOfficer` = employed page owner + is_loan_originator + key + url.
  Recruiter rows get `site_slug` (lowercased Admin.url) when also an active LO with a site.
  New: `listLoanOfficers`, `isActiveLoanOfficerKey`, `isJoinPageOwnerKey`.
- `recruiter-profile.js`: write gate = recruiter OR LO with site. New `getJoinPage(key)`.
- Route `GET /api/join-page?key=` (OPEN): `{bio?, video_url?, section_position?}` for active LO with site, else 404.

### B — lo-homepage (brief given to agent)
Port HeroSection/ScrollCta, RecruiterCard+BioBlock, VideoSection, RegisterSection+SessionPicker, ApplyCtaBand,
Highlights, FAQ + utils + scoped CSS + RecruiterJoinPage i18n (all locales).
Owner from `x-lo-key` → getLOInfo. Overlay from moso-aid `/api/join-page` (any failure → empty overlay:
house video `hRZL6xSsxGk`, no bio). Webinar sign-up credits the site owner. "Ready to join" →
`/<slug>/register-loan-officer` via the existing Join-now referral mechanism (buildJoinNowUrl).
Register route in RELEASE_PAGES/middleware/sitemap like other pages. noindex.

### C — lf-homepage
`src/shared/utils/loSitePage.ts` `loSitePagePath(recruiter, page)`; `/join/[slug]` → `/<site>/join`,
`/recruit/[slug]` → `/<site>/register-loan-officer` when `site_slug` is set.

## Open questions for Bao (asked, NOT answered yet)
1. Editor location: my recommendation = keep lf `/manage-join-page` (real login via x-moso-user-id),
   open it to every Loan Officer (proxy authz must use the SAME shared helper as the page — no inline
   check drift), and add an "Edit my join page" button on lo-homepage `/lo-setting`.
   Reason: lo-homepage `/lo-setting` has NO real auth (only `?loKey=` in URL).
2. Empty bio: hide the block (my recommendation, Thuan "fewer words") or show default text?

## Next steps after resume
1. Check Phase B worktree (agent result), review it yourself (agents never trust each other).
2. Local preview for Bao: run moso-aid branch locally (or rely on degrade) + lo-homepage `next dev`
   with `?internalLoKey=<key>&internalBasePath=<slug>` (ram-gate first). Show `/<slug>/join`.
3. After Bao answers Q1: implement editor change (lf manage-join-page + proxy authz for LOs; lo-setting button).
4. Then PRs + 2 reviewers + Repo Owner → staging. Rollout ORDER: moso-aid master → lo-homepage master →
   lf redirect last (else 404). Production ONLY with Bao's explicit approval.

## Gotchas hit this session
- ram-gate `jest` kind asks 3000MB and was DENIED; small suites run fine with `acquire 1000 ... --runInBand`.
- lf worktree: lockfile is gitignored and main checkout's is stale → use `npm install` (not ci);
  copy `.env` (gitignored) and `next-env.d.ts`, or the pre-commit build fails on /health/backend.
- moso-aid branch flow: feature → master (staging auto-deploy) → pro (prod).

Bead: see `bd list | grep "join page on own site"`.
