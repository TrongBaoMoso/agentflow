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

## Phase B agent report (arrived after pause, NOT yet verified by lead)
- Commit 3e2c49081 on feature/lo-join-page. Agent claims: tsc 0, 5 suites / 66 tests pass, build passes, `/[locale]/join` in route list. No browser/next dev run yet.
- Route `src/app/[locale]/(public)/join/` (layout = PublicLayout like best-price). `_lib/buildJoinOwner.ts` (getLOInfo → card), `_lib/fetchJoinOverlay.ts` (moso-aid `/api/join-page`, 3s timeout, degrade). Ported utils joinSections/recruiterFields/bioSanitize/youtube + tests, join-sections const, LoPrograms FaqSection + RevealObserver. New dep `xss`.
- CSS `src/styles/lo-join.css` (~870 lines, everything scoped under `.lop`, tokens moved from :root to .lop).
- `'/join': true` in RELEASE_PAGES + ROUTES.JOIN. i18n: 71 RecruiterJoinPage keys × 5 locales.
- Attribution: webinar SessionPicker (index.tsx:164-178) sends `referred_source: 'loan_officer'`, `referred_by` = owner company email (+ agent_email for webinar). Ready to join (page.tsx:87) = `buildJoinNowUrl({label, value: owner email}, basePathLO)` → `/<slug>/register-loan-officer`.
- Card shows email/phone only if owner `is_show_email` / `is_show_phone` === true.
- Agent's open questions (decide on resume, may need recruit-be/packs check):
  1. `referred_source` for webinar sign-ups: `loan_officer` vs `recruiter` (LO Recruiter Program auto-own)? Check D268/D269 + packs.
  2. `lead_origin` not sent (packs 400s unknown values; no slug for LO site). Decide.
  3. Report was truncated after "/api/join-page shape" — ask agent `lo-join-port` via SendMessage for the rest, or re-check fetchJoinOverlay against moso-aid `{success, data:{bio?,video_url?,section_position?}}`.

## Bao's answers (resume, 16/10 evening)
1. Editor location = lo-homepage `/lo-setting` (NOT lf /manage-join-page). MOSO Website settings embeds
   `<agent_url>lo-setting?loKey=<own key>` in an iframe for the logged-in Loan Officer (packs AgentMyPageView.java:199,
   `&admin=true` for admins). Plan: "Recruiting page" section in lo-setting (recruiting bio + recruiting video),
   saved via a new lo-homepage server route that forwards to moso-aid PUT /api/recruiter-profile with
   RECRUITER_PROFILE_SERVICE_KEY (new server env on lo-homepage Cloud Run, staging + prod). Agent "lo-join-editor"
   building it in `_worktrees/lo-join-page`. lf /manage-join-page stays for dedicated headhunters only (no LO widening).
2. Bao asked whether "The short version of how the platform works…" is the bio: NO — that is the copy beside the
   company fallback video. The bio is the "About <first name>" block inside the contact card (4 lines + Read more).
   Screenshots: `.playwright-mcp/join-1440b.png` (no bio) vs `.playwright-mcp/join-bio-1440.png` (sample bio via local
   moso-aid stub on :5099, dev server :3012 with NEXT_PUBLIC_AID_API_URL=http://localhost:5099).

3. Empty bio → HIDE the block (Bao, 16/10). Already the behavior; no default text.

## Editor built + verified locally (16/10 night)
- lo-homepage 68714c087 (agent lo-join-editor): `/lo-setting` section "Recruiting page" (Recruiting bio rich text +
  Recruiting video + link to `<site>/<url>/join`), own "Save recruiting page" button; route
  `src/app/webplus-api/join-page/route.ts` (PUT → moso-aid PUT /api/recruiter-profile with RECRUITER_PROFILE_SERVICE_KEY).
- lo-homepage c890937fb (lead fixes): call `${NEXT_PUBLIC_ASSET_URL}/webplus-api/join-page` (relative path would hit
  the lf host on loanfactory.com/<slug>), CORS + OPTIONS like the other webplus-api routes, stored-HTML cap 10,000,
  moso-aid 400 → 400. 12 route tests; negative control on CORS header fails 1 test as expected.
- moso-aid 8271a3b: bio cap is on stored HTML = 10,000 (was 2,000, which refused formatted bios under 2,000 visible).
  100 tests pass.
- E2E local: stub moso-aid on :5099 (stores PUTs, checks x-service-key, proxies the rest to staging) + dev :3012
  (NEXT_PUBLIC_AID_API_URL/ASSET_URL overridden, RECRUITER_PROFILE_SERVICE_KEY set). Saved bio+video in lo-setting →
  /join shows "About Mindie" bio and the own YouTube embed. Screenshots `.playwright-mcp/lo-setting-recruiting.png`,
  `.playwright-mcp/join-after-save.png`.
- Deploy needs: RECRUITER_PROFILE_SERVICE_KEY on lo-homepage Cloud Run (staging lo-homepage-master in lenderrate-master,
  prod lo-homepage-v2 in lender-rate), same value as moso-aid's in that environment.
