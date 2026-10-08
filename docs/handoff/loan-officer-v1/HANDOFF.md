# /loan-officer-v1 — handoff (from session f7ed6648 to agentflow-cc, 08/10/2026)

Ownership of `/loan-officer-v[n]` moves to the register-loan-officer session (agentflow-cc). This file is self-contained.

## 1. What it is

- lf-homepage route `src/app/[locale]/(public)/loan-officer-v1/` (Next.js 14, Mantine 7, next-intl en/es/vi/zh/he). A **noindex preview** of the new Loan Officer recruiting page. The old `/loan-officer` is **not replaced** yet. Bao: replace it only when everyone signs off (then: drop noindex, move route).
- Live: https://www.loanfactory.com/loan-officer-v1 · staging https://lf-homepage-master-233682574497.us-central1.run.app/loan-officer-v1
- CSS: `src/styles/loan-officer-v1.css` + `loan-officer-v1-sections.css`. i18n namespace `LoanOfficerV1Page`. Constants: `_data/claims.ts` (fees, $963, $100 sign-up, 1.5 h, years 20+…), `_data/links.ts` (staging viet18 vs production loanfactory.com by `NEXT_PUBLIC_ENV`), `_data/videos.ts`.
- Mockups/artifacts:
  - Phuong's approved final UI: https://claude.ai/artifact/5zsvJNw811fsadFq4nCU8P (copy at `lf-homepage/docs/mockups/loan-officer-v1-final.html`).
  - Design ideas artifact (tabs Option A v3, Option B, **Option A v4 · Brayan feedback**): https://claude.ai/artifact/5CSBxiRchKkn3QVWKjVcEH. Source `lf-homepage/docs/mockups/loan-officer-ai-first.html`; v4 tab built by `docs/mockups/_lo-assets/build_v4.py` → `optc-v4.html` (A v3/B kept byte-identical).
- Memory: `project_lfh_loan_officer_redesign.md` (full decision log), `reference_nextfont_google_flake.md`, `reference_lfh_lender_count_source.md`, `feedback_plain_page_copy.md`, `feedback_spell_out_loan_officer.md`.
- Beads: `agentflow-lr5an` (umbrella, in progress), `agentflow-dm1wz` (v4 port + rounds 2–3, CLOSED), `agentflow-br2bp` (Victoria personalized referral LP, OPEN), `agentflow-wzyol` (FAQ hard-coded numbers, OPEN), `agentflow-z4vrz` (prod /our-lenders 0 lenders, OPEN bug), `agentflow-9qeo7` (register-LO form redesign, yours anyway).

### Decision history (short)
- 28/09–01/10 Phuong: Ecosystem Option A; apps by function around a Loan Officer; programs incl. Loan Officer Teams; plain short copy, "Loan Officer" never "LO".
- 02/10: final UI approved; Thuan demo; videos = 5 Thuan Nguyen interviews + Summit recap.
- 02/10 Bao: no program popups → cards link straight to landing pages (new tab); links from Chi's list.
- 03/10 Brayan + Victoria (Google Chat space "New Landing Page", `AAQAJxJ3RAw`, screenshots in `docs/transcripts/lf-homepage/2026-10-03_new-landing-page-chat/`): webinar agenda, NMLS field, eligibility pop-up, referral card, coach not "free", Compensation ($595 admin + $500 processing), No software fees ($963), 5 steps, $100 sign-up fee, Becoming a Loan Officer, FAQ, hover.
- 05/10 Phuong: NO separate "More tools" list (they are LOS / LFIQ features) and NO Feedback tool; otherwise follow Vic + Brayan. App landing pages: app owners will send URLs (out of scope). Chi: Thuan Nguyen one line, time+PT together, "Skip the webinar, register now".
- 05/10 Bao: FAQ = old page's 13 questions (no invented Q&A), inline in page style.
- 07/10 Brayan: monospace labels too small; $963 total must stand out.

## 2. Shipped (all lf-homepage; production via cherry-pick of only the v1 commits — master carries other people's work)

| Round | master PR (squash) | production PR (merge) | prod revision |
|---|---|---|---|
| Page + layout + final UI | #2593 9088861b, #2594 46492d29, #2595 777193ee | #2604 f63f7d4a | lf-homepage-00722 |
| Hero video, real quotes, YouTube modals, links | #2603 6b939304 | (in #2604) | |
| Option A v4 | #2610 697cb67d | #2611 2eab2c88 | 00725-k9k |
| Round 2: aligned step times, inline FAQ, balanced buttons, zh link fix | #2616 6ae03333 | #2617 bbd2a097 | 00728-pgm |
| Round 3: mono labels 13–14px, orange $963 band, date tiles stack ≤600px | #2628 5a8a5967 | #2629 9727b773 | 00732-ndn (image 9727b773, 100% traffic) |

Also via this session: #2605 (LO type read-only after 1-1, prod 6b53ec35). Hero video is on the CDN `gs://lender-rate/CDN/web_plus/loan-officer-v1/hero.mp4` (Bao's account can write the bucket).

Live state verified 07/10 on www at 320/520/1440: kicker 14px, total row no overflow, date tiles not clipped, no horizontal scroll, /loan-officer 200.

## 3. In progress / not done

- **No open PRs, branches or worktrees** from this session (all removed). No dev servers, no background agents, no ram-gate tokens.
- **Matt Moghaddam (Chat "New Landing Page", 08/10 12:41):** page looks great; only suggestion = shorten "How to join" from 5 steps to 3 (combine "Reply to our email" + "Onboarding call"; combine the last two steps "Sponsorship and HR" + "Welcome aboard"). **Not started.** Code: `_components/JoinSection.tsx` (`STEP_IDS`, `TIMED_STEP_IDS`), i18n `LoanOfficerV1Page.join.steps.*` (5 locales), CSS `.lov1-join` (5 columns; subgrid rows) — change to 3 columns.
- Known nit: FAQ chevron renders on the LEFT (Mantine `Accordion unstyled` ignores `chevronPosition` CSS). Left as is; fix with CSS `order` if anyone asks.
- Lender count in the webinar agenda uses `findLenders({is_approved,with_rating})` + logo filter (same as /our-lenders). **Production findLenders returns `_rows: []`**, so the line shows the no-number fallback, and /our-lenders on prod shows "0 lenders" (bead agentflow-z4vrz, backend).
- FAQ answers (shared with /loan-officer) hard-code "48 states", "200+ lenders", "nearly 7,000 reviews" (agentflow-wzyol, needs Marketing wording).
- Promised to Brayan: tell him when app owners send landing pages for CRM / LOS / LUNA+ / Marketplace (then swap URLs in `_data/links.ts`). Prod links still known-broken: `luna.loanfactory.com` (no DNS), `/loan-coordinator` (redirects to /).
- Old memory says `docs/handoff/lo-v1-messages-to-send.md` holds an unsent message to Duyen (hero photo / YouTube) — the video part is done; check if still needed.

## 4. People-dependent

- Reply to Brayan (drafted 07/10, Bao to send): "Thanks Brayan! Both are live now on https://www.loanfactory.com/loan-officer-v1: the 'You save $963 / month' total is now a bold orange band, and the small 'console' labels are bigger and easier to read. I'll let you know as soon as the app owners send their landing pages."
- Message to Victoria (drafted, Bao to send): "Hi Victoria, I understand what anh Thuan wants and I'm happy to build it soon. Can we have a quick meeting around 7–8 AM your time (Pacific)? Just ping me whenever you're available in that window. I'll be online late on my side, so any day works." (7–8 AM PDT = 21–22h Vietnam until 01/11, then 22–23h.)

### Victoria meeting — personalized referral landing page (bead agentflow-br2bp)
Request (Victoria 07/10, from Thuan): each Loan Officer's referral link should open a personalized landing page showing the benefits of joining Loan Factory, the referrer's name and info, and a form for the referee to register. "a Thuan wants it soon".

Context to say first (VI): Hiện link giới thiệu của Ambassador đã dẫn tới trang `/loan-officer` trên site riêng của từng LO (ví dụ `loanfactory.com/sethaugust/loan-officer`, lo-homepage; lf #2622/#2623). LO nào không có site riêng thì dẫn tới trang giới thiệu chung. Nghĩa là đường dẫn theo từng LO đã có, chỉ còn thiếu nội dung cá nhân hoá.

Questions (VI / EN):
1. Link nào, của ai? Link nằm ở đâu (thẻ trang Ambassador, app, email, mọi nơi)? Cho mọi Loan Officer hay chỉ Ambassador? — *Which referral link do you mean, and is it for every Loan Officer or only Ambassadors?*
2. Dùng trang nào làm nền? Lấy `/loan-officer-v1` rồi thêm thẻ người giới thiệu ở đầu trang, hay một trang riêng ngắn hơn? — *Can we reuse the new /loan-officer-v1 page and add a referrer card at the top, or do you want a separate, shorter page?*
3. Thông tin người giới thiệu hiện những gì? Ảnh, tên, chức danh, NMLS, điện thoại, email, số năm ở Loan Factory, số khoản vay, lời giới thiệu riêng? — *What should we show about the referrer: photo, name, title, NMLS, phone, email, years at Loan Factory, a personal message?*
4. Form nào? Đặt chỗ webinar thứ Sáu, đăng ký Loan Officer, hay cả hai? "Referred by" tự điền và khoá không (như `?ref`)? — *Which form should the referee use (Friday webinar, register as a Loan Officer, or both)? Should "Referred by" be filled in and locked?*
5. LO không có site riêng: dùng `loanfactory.com/loan-officer-v1?ref=<NMLS>` được không? — *For Loan Officers without their own page, is a shared link like loanfactory.com/loan-officer-v1?ref=<NMLS> OK?*
6. Ghi nhận cho ai? Nếu người đó từng được người khác giới thiệu thì tính cho ai? Thưởng giới thiệu ($10,000 / RSU) có tự gắn qua link không? — *If someone was referred before by another person, who gets the credit? Is the referral bonus tracked automatically from this link?*
7. Hạn chót, người duyệt, ngôn ngữ? — *When does anh Thuan want it? Who approves the copy and design? English only, or other languages too?*
Tip: if short on time ask 2, 3, 4 first.

## 5. Latest feedback
Matt Moghaddam 08/10 12:41 — see section 3 (5 → 3 steps). Not started.

## 6. Gotchas
- **Production promote = cherry-pick only the v1 commits** onto a branch from `origin/production`, compare `git patch-id --stable`, prove `git diff origin/production <commit>^ -- <route/css>` is empty, Repo Owner agent review, `gh pr merge --merge --match-head-commit <sha>`, then verify image tag = merge SHA, `latestReady == latestCreated`, 100% traffic. Check the prod tip right before merging.
- **next/font flake**: `Cannot read properties of null (reading '1')` in Cloud Build or locally = Google Fonts returned an extension-less URL. Re-run: staging trigger `42174edd-d959-4c20-a3bc-5d7b162e74ba` (project lenderrate-master), prod trigger `e9e6d7f4-3937-47d0-b59d-5007f0a36f90` (project lender-rate): `gcloud builds triggers run <id> --project=<p> --sha=<sha>`; check the branch tip first so you never redeploy an older sha.
- **Middleware**: every path except `/images`, `/_next`, … gets a locale prefix, so `public/videos/*` 404s. Put media under `/images` or on the CDN.
- **YouTube iframes** always draw their own play/pause overlay → hero uses a native `<video>` from the CDN (like beta.loanfactory.com).
- **Husky does not run** in a worktree whose `node_modules` was cloned with `cp -Rc` → run eslint/prettier/stylelint/tsc/`npm run build` yourself. The PreToolUse hook "block-no-verify" can false-positive on long commands that contain `git commit`; split the commit into its own Bash call.
- **ram-gate**: build needs a 3500 token; often denied when recruit jobs run. Wait, don't bypass. One Chromium with contexts; stop servers right after.
- Playwright's bundled Chromium has no H.264: use `channel: 'chrome'` to test the hero MP4.
- **Lender count**: only `findLenders` + logo filter matches /our-lenders; `fetchAllLenderLogos` and `statistic.lender_count` give other numbers.
- Google review count: staging API returns 0 → page falls back to the last prod value 21,442 (`GOOGLE_REVIEWS_FALLBACK`). Staging data is fake (38 states, 444 Loan Officers); always check production.
- zh FAQ answers end URLs with "。" → `_lib/splitLinks.ts` (URL chars only) + test.
- Mantine `Accordion unstyled`: use `classNames.content` (not `panel`) for padding, else closed items stay tall.
- Google Chat space can be read through Playwright Chrome (Bao's session, `chat.google.com/u/1/app/chat/AAQAJxJ3RAw`); the Gmail MCP connector is a borrowed mailbox — do not use it.

## RESUME POINT 2026-10-08 ~18:00 +07 (Bao paused, going home) — owner session agentflow-cc (8658d500)
Bao authorised (08/10 afternoon) shipping the whole batch to PRODUCTION after 2 reviewers + Repo Owner + browser test, INCLUDING replacing /loan-officer with the v1 page (condition: forms behave like the old /loan-officer). See memory feedback_away_window_0810_lov1_prod.md.

### Done
- #2631 How to join 3 steps: master f0cc5e5c, PRODUCTION via #2634 (09d1ac7d) — live.
- Merged to master (staging), NOT yet on production: #2632 register cleanups (54150f34), #2633 hide Learn more for LOS/Marketplace/LUNA+/Loan Coordinator + alternating section backgrounds (e44e8477), #2635 v1 becomes /loan-officer + 308 from /loan-officer-v1 + old SEO/JSON-LD + thank-you old footer + ChatNow + ?ref carried by "register now" + referrer fields optional like old form (b0ece65d), #2636 FAQ live numbers (states=license_state shared with trust block, lenders, reviews) + chevron right (2d0e31d1), #2637 referrer NAME shown locked under ?ref like old page (00b0f40b). All reviewed (2 reviewers + Repo Owner each).
- agentflow-z4vrz closed (prod /our-lenders 0 lenders = data backfill fixed it 06/10); hardening task filed for packs (show_on_public_site missing = visible).
- /loan-coordinator redirects home ON PURPOSE (Bao's PR #2300, 21/08, fee page gated to signed-in users).

### Next steps (in order)
1. Check staging serves 00b0f40b: `gcloud run services describe lf-homepage-master --project lenderrate-master --region us-central1` → traffic revision label commit-sha must be 00b0f40b (on 08/10 two builds finished out of order and staging served an older sha; fix by `gcloud builds triggers run 42174edd-d959-4c20-a3bc-5d7b162e74ba --project=lenderrate-master --sha=<master tip>`).
2. Re-smoke staging www.viet18.com/loan-officer: FAQ shows live numbers (no "nearly 7,000", no "(all except CT and NY)"), chevron on the RIGHT, FAQ states == trust block states; ?ref=1000946 shows locked "Loan Officer: Chow Fi"; /loan-officer-v1 → 308. (Earlier full smoke on b0ece65d passed SEO/redirect/links/backgrounds/webinar submit/referral/optional referrer/titles; see shots/staging-smoke/.)
3. Production promote: production tree == master@f0cc5e5c, so `git worktree add <path> -b promote/... origin/production`, `git merge --no-ff <master tip>`; if src/messages/en.json conflicts take master's version (`git checkout --theirs`), verify `git write-tree` == `<master tip>^{tree}`, commit (own Bash call), push, PR into production, merge with --match-head-commit, verify prod build + Cloud Run lf-homepage 100% on the new revision, then smoke https://www.loanfactory.com/loan-officer (title/description same as before, no noindex, webinar form, ?ref, thank-you). A stale promote worktree exists at _worktrees/lfh-promote-lo-replace (b22fac9f = master 2d0e31d1, never pushed) — delete it and redo with the new tip.
4. Tell Phuong (Bao) which apps have no landing page: LOS, Marketplace, LUNA+ (staging only), Loan Coordinator (gated on purpose). LFIQ and CRM have landing pages.
5. Open, waiting on people: Victoria meeting (bead agentflow-br2bp, questions in section 4 above); lo-homepage port of register v1 (wait for a final v1/v2 decision; Matt preferred v1).
- UPDATE 18:05: staging now serves 00b0f40b (revision lf-homepage-master-01553-td5, 100%) — step 1 of Next steps is done; start at step 2.
