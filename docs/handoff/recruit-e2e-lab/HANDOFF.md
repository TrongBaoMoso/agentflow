# Recruit E2E Lab — handoff (session 073e4aab, night 07→08/10/2026)

Artifact (new test sheet, EN/VI, per-tester results): https://claude.ai/artifact/1Dd5PETDRZLEHiZMe4ANzt
Old sheet (kept for 06/10 history): https://claude.ai/artifact/KXZ1EhJKuVRir7L5ExY7pj

## Source & tools (scratchpad of session 073e4aab — copy out if needed)
- Sheet source: `<scratchpad>/sheet/` — head.html, prelude.js, data_common.js, data_los.js (generated), data_bugs.js, cases_1..4.js, static.js, app.js; `./build.sh` → recruit-e2e-lab.html; publish same path.
- Seeding: `<scratchpad>/seed/` — seed.py (registerLoanOfficer / registerWebinar / submitReferALoanOfficer / moso-aid lo-events, no captcha server-side), prep.js (claim/outcome/offer/1-1 via recruit API), paysign.js (PayPal sandbox + in-page signing), hr_create.js (HR app create associate as chauchau), postjoin.js (ticks + setup call), selftest.js, ui_check.js, sweep.js (responsive sweep).
- DB results: collection `results` doc `<uid>__<step>`; Claude writes uid `claude`. `runs`, `locks/settings`.

## Data
- LO emails `bao.trinh+t08<id>@loanfactory.com`, NMLS 99318xx, phone (714) 555-18xx. 66 seeded (+6 manual rows D2 D3 E2 E3 E4 H5 not created). Z1..Z6 = Claude self-test LOs (Z1 reached S7 Onboarded end-to-end).
- Onboarding round-robin includes bao.trinh+onb-test@viet18.com (not in accounts file, no password).

## Findings — beads: F-1 agentflow-ze4kn, F-2 agentflow-eu4up
- F-1 Refer-a-LO page LOs land at S5 with SENT offer by super.admin, no owner/specialist, still in Hot leads.
- F-2 decline API accepts 3-char reason (UI blocks <4).
- F-3 third onboarding account @viet18.com gets assignments.
- l06om reproduced (NMLS missing in HR associate).

## Update 08/10 ~02:00 (session 073e4aab)
- Sheet v4 published: 30 cases / 263 steps (RT, A–I, W, X, Y, OM, J–V, AA, UX), 98 LO rows, sections Status / Accounts / LOs / Bugs / Omni coverage / How-tos.
- Claude results in db: 87 docs (uid `claude`). versions tracked in `<scratchpad>/seed/versions.json` (needed for if_version on update).
- Claude LO sets: Z1..Z6 (API), C* (CA1, CB1-5, CF1-5, CH1-2, CI1, CJ1, CK1, CL1, CN1, CR1), GM1/GM2 on mail.tm (`seed/mailtm.json` has tokens; receive-only).
- Verified live: SMS two-way with manhadmin + Zoom 1464 (Bao replied 01:01), Google Meet event for QA Anewe (meet ddk-hgix-xyb), MOSO "Complete These Initial Steps" reaches mail.tm ~20 min after 1-1 Done, Missing for HR (last_name digit) + auto send after fix, omni email to mail.tm NOT delivered (omni #349).
- Temporary pod `e2e-curl-hold` in ns recruit-be (staging) created 08/10 01:20 for X-User-ID calls; sleeps 3h then exits — delete if still there.
- New beads: ze4kn, eu4up, vm9tm, hhdec, iapo3, bnqmf, 6bcjk, 00lkw, x1l9i (Omni logging feature), ymuty (Team-only mirrored as LO contact?), y8fbi (Onboarding cannot message LO).
- accounts file: manhadmin row added (email is a markdown link — auth.js strips it).
- Still to automate: manager approve/decline/remind/take back via UI, onboarding schedule/ticks via UI (CN1 needs HR create), G5 team-only email check (navigation timed out once).

## Final state 08/10 ~04:40
- Sheet v7: https://claude.ai/artifact/1Dd5PETDRZLEHiZMe4ANzt — source copied to `sheet/` here (build: `./build.sh` then publish recruit-e2e-lab.html with the Artifact tool to the same URL). Scripts in `scripts/` (credentials are read at runtime from the local accounts file; tokens/state/mail.tm secrets NOT copied).
- Claude results: 93 db docs. F-5 WITHDRAWN (Claude's own duplicate phone/NMLS data; auto-own skips dup phone by design; bead hhdec closed). Claude LO Z2–Z6, CB5 renumbered to 99319 61–66 / 555-1961..66.
- New finding F-10 (agentflow-hh46z) Team only email to staff outside the cast points to the external tab.
- Temp pod e2e-curl-hold deleted.
- Left for Bao: OM5/G5 manual check, email reply from trinhvutrongbao@gmail.com, Grant Meet access (attendance), all his own steps.
