# HANDOFF — Modex data + experience level + OB/Log-result UI (session 20/10/2026)

Paused 20/10 evening because Bao shut the machine down. Resume: open Claude Code in `/Users/apple/Projects/agentflow`, run `/resume` and pick this session, or start a new session and say "đọc docs/handoff/modex-experience-2010/HANDOFF.md rồi làm tiếp". Background agents of the old session are gone after a reboot — re-dispatch from the "OPEN" list below.

Bead: `agentflow-s4wpp` (experience → MOSO), `agentflow-k6d0z` (Modex). Memory: `project_modex_loans_before_first_touch.md`, `feedback_packs_experience_merge_authority.md`.

## DONE (merged + on STAGING unless noted)

| What | PR | State |
|---|---|---|
| Offer form restyle (HR modal look, no NMLS gate, no hint lines, fee tiles) | recruit-fe #550 | staging `98c1dcb2` |
| Program-invite identity: NMLS null→value is not a change (D298) | recruit-be #698 | staging |
| Modex CSV import API (D299) | recruit-be #699 | staging `8eb06eee` |
| MODEX_IMPORT permission, NMLS export, Modex status (D300) | recruit-be #700 | staging `45bc789f` |
| /modex page (download NMLS list → export from Modex → upload, check, import) | recruit-fe #552 | staging `1edec68f` |
| Modex snapshot with history (D301, all free CSV columns, employer-change flag) | recruit-be #701 | staging `3774b039` |
| packs: recruit may write `experience` (rank-based upgrade-only) | packs #3719 (master `9d06720f98`), #3720 (3.64.1 `e3f3f98093`) | MERGED (Bao "merge đi"); NOT deployed — Khải deploys MOSO (SWAT) |

Production: none of the above pushed to production (Bao decides prod).

## OPEN — resume here

1. **recruit-be #702** (branch `feat/experience-level-handoff`, worktree `recruit-be-worktrees/experience-level`, D302, V264). Experience level computed in recruit (Newly_licensed / New=Inexperienced / Experienced / Team_lead=High producer ≥30 loans/12mo), decided snapshot at the 1-1 Mark done, sent to MOSO via packs write-back behind flag `packs.writeback.experience_enabled` (default OFF), upgrade-only, since-2021 fallback, backfill endpoint. Reviewers' round-2 items were being fixed when paused (A: 1 accept typed figures in D302, 2 zeros→INEXPERIENCED, 3 Newly_licensed mirror must not pin, 4 backfill re-decides UNKNOWN, 5 parse the real packs response incl. `unchanged` and `skipped_reasons` "kept …", 6 paginate backfill + wording, 7 retire `pipeline.big_producer_loans_12mo_min`, LOW stale text/merge keeps higher; B: actor attribution + figure sources on the decision, FE reads big-producer min from /config/candidate-view, backfill SETTINGS_MANAGE only + range cap, stale comment). Check the last pushed sha and what is done (see "WIP at pause" below), finish, CI green, re-review by 2 reviewers, merge, promote staging.
2. **recruit-fe #554** (branch `feat/ob-hire-modal-experience`, worktree `recruit-fe-worktrees/ob-hire-modal`). OB "Mark the 1-1 meeting done" modal (W-2/1099 tiles, display-only Experience card: chip on header + 2 stat blocks), on-behalf popover ("{name}'s task" · Cancel / Do anyway), Log result Send info (mockup C with Bao's changes: Next step unchanged → when-row [Send now | Schedule for later] + Send on + Time on one row → composer box with [Email | SMS] + Template toolbar). Review fixes in progress at pause: primary label only "Send email/SMS" when there is a body (empty → old save label), "Schedule email" for email, scheduled SMS = "Remind me to text" + "Remind at"; popover focus return + anchor to the clicked element + data-mantine-stop-propagation + close on scroll; readExperience year nullable; SMS time shown regardless of auto flag; dead code; vi "Huỷ". Finish, push, re-review, merge, promote staging. Mockups: `mockup-nextstep/` in this folder (Bao chose C with changes).
3. **After Khải deploys packs#3720 to MOSO prod**: smoke test on MOSO staging (upgrade applied, downgrade skipped, bad value → 200 + error), then (with #702 on prod) turn on `packs.writeback.experience_enabled`, run `POST /api/v1/admin/packs-writeback/experience-backfill?since=<recruit #702 deploy date>&dryRun=true`, then real run. Ask Bao whether to message Khải.
4. **Next feature (Bao approved direction)**: experience-level chip on Hot / Cold / Pipeline rows, filter by level, Reports by the 4 levels (Vic 17/08 asked for 4 levels, not 2). Not started.
5. **Modex/MMI**: no MMI account found on the machine (MMI = Mobility Market Intelligence, login https://mmi.run/l/login). Comparing Modex vs MMI on the 5 sample LOs needs an MMI login from Vic/Miley. Modex auto-sync (option A) needs Modex staff (Thuận). Question list for Modex/MMI not yet drafted (offered).

## Key facts learned today (keep)

- Vic's experience rule (17/08 transcript, Vic is Vietnamese living in the US): EXPERIENCED = >5 (we use ≥5) loans closed since 2022 AND ≥2 in the last 12 months → auto-pass; else Vic reviews. Contract: 1099 100% / W2 90% experienced; 80% / 70% inexperienced.
- MOSO `LORecruiting.Experience`: `New` (shown "Inexperienced"), `Experienced`, `Team_lead` (shown **"High producer"**), `Newly_licensed`. Account creation maps Experienced/Team_lead → experienced plan; recruit never sent it before → experienced hires paid the inexperienced plan (bug s4wpp).
- PROD measurement 20/10 (read-only psql pod): High producer (Team_lead) 53 LOs, min 22, median 60 loans/12mo; Experienced 312, median 4, p90 21; ≥30 keeps 52/53 HP. 98/312 MOSO-Experienced have <2 loans in 12 months. `loans_since_anchor` is empty on prod.
- Modex: CSV export 1 timeframe per file, cap 1,000 rows/month (≈230/month used historically), ~2.1KB/row; integrations only by Modex staff; Cloudflare blocks automation. NMLS Consumer Access ToS forbids scraping and soliciting.
- Read-only prod SQL recipe: temp pod `postgres:16-alpine` in ns `recruit-be` with envFrom `recruit-svc-secret`, `SET default_transaction_read_only=on`, delete after (context `gke_lender-rate_us-central1_moso-gke`).

## WIP at pause
(filled in below when the agents report their pushed shas)

**recruit-fe #554 — WIP pushed `d6413785`.** Full jest after the push: 7085/7089 pass; 3 known env failures (sessionEnded SDK, followUp vi label) + **1 real failure: the new focus-return test in `src/shared/components/OnBehalfConfirm/__tests__/OnBehalfConfirm.test.tsx`** (A2 not confirmed — read the error, fix test or code). eslint/tsc clean, OutcomeSection.tsx 797 lines. Everything else (A1, A3–A8, B1–B3, SMS reminder time) has passing tests. Coded: label logic via `sendInfoSaveKey` (WizardParts.tsx), SMS "Remind me to text"/"Remind at", SMS time regardless of auto flag, popover focus return + anchor follows the clicked element (callers pass it) + data-mantine-stop-propagation, nullable loans_since_year, autoSendWhen removed (formatSendDay/Clock kept — still used), vi "Huỷ", doc comment. NOT verified: full jest after the last edits (an earlier run had many OutcomeSection failures), eslint (OutcomeSection.tsx was 805 lines > 800 limit), prettier, tsc. Next: run them in the worktree, fix, push, then final re-review by the 2 reviewers.

**recruit-be #702 — pushed `490d5cfa`, CI green (incl. Integration tests), NOT merged.** All round-2 review items (A 1–7 + LOW, B a–e) done per the implementer: zeros → INEXPERIENCED; Newly_licensed mirror no longer pins; backfill re-decides UNKNOWN, paged 200, SETTINGS_MANAGE only, since ≤ 60 days; client parses the real packs response (applied / unchanged / skipped_reasons "kept …" = delivered, anything else refusal); actor + figure sources recorded; retired key `pipeline.big_producer_loans_12mo_min`; merge keeps the higher rank. Known gap: a packs "kept" is INFO-logged, not on the failure desk. Next: send head `490d5cfa` to 2 reviewers for a final READ-ONLY confirm, then merge + promote staging (flag stays OFF).

## Resume checklist (in order)
1. #554: fix the OnBehalfConfirm focus-return test (or code), re-run touched suites, push; final confirm by 2 reviewers; merge; `gh workflow run promote-staging.yml -f sha=<master sha>` (recruit-fe); check `cd-staging.yml` success.
2. #702: final confirm by 2 reviewers on `490d5cfa`; merge (squash, subject "... (D302) (#702)"); promote recruit-be staging.
3. Ask Bao whether to message Khải to deploy packs 3.64.1 (`e3f3f98093`); then the smoke test + flag + backfill (OPEN item 3).
4. Next feature: experience chip/filter/reports on rows (OPEN item 4).

## Progress after resume (20/10 night)
- recruit-be #702 MERGED (`8c064b0d`, includes upgrade-only decide() + reason sentences) and on STAGING (cd-staging success). Flag `packs.writeback.experience_enabled` OFF.
- recruit-fe #554: real bug found — controlled Popover never called onClose, so Escape/outside click did nothing; fixed via onChange (`7caa6dd5`), OnBehalfConfirm 9/9, CI green. Final 2-reviewer confirm running.
- Side effect: a mis-targeted promote ran recruit-fe promote-staging with master tip `93323d15` → put another session's merged #553 (Follow-ups modal spacing) on staging early. Nothing of #554 went out.
- recruit-fe #554 MERGED (`8f5774a1`) and on STAGING. Last fixes: scheduled email = "Remind me to email" / "Remind at" while auto-send is off (only "Schedule email" when the BE reports auto-send). Verified on staging with the role-onb account: Mark done modal shows real `experience_level` from be #702 (QA Tenadsupport: Experienced, 6 since 2022, 3 in 12 months).
- Deferred review follow-ups (#554): M1 rename "Save & open message" for an empty send-now; M2 behavioural test of Escape with a real Drawer host; L1 check the when-row at 320px; make OnBehalfConfirm `anchor` required (drop window.event fallback); OutcomeSection.tsx at 797/800 lines — extract before the next change.
- NEXT: Khải deploys packs 3.64.1 → smoke test → flag on → backfill (OPEN 3); experience chip/filter/reports on rows (OPEN 4).

## MMI hands-on check (20/10 ~22:30, read-only, Victoria's account via Brayan's 2FA code)
- Login: https://mmi.run/l/login → new.mmi.run (DataCenter). 2FA SMS to Brayan's Zoom phone; after the first code MMI sets `device_trust` (7 days), so re-login in the same browser needs only the password. Session was dropped once server-side after a few minutes (cookie still present) — likely one session per account (unconfirmed, asked Brayan).
- No Settings / Integrations / API page for this user. `https://api.mmi.io` answers `{"message":"MMI One API"}` (API exists, no public docs). Vic: MMI sent the company API material before; Tera stopped ("too much work"); Brayan asked for it.
- Profile per NMLS (`/nmls/<id>`): tier, industry tenure, company tenure, active licenses, 14-month and 7-month units/volume, YTD units/volume, purchase/refi split, product mix, agent relationships, brokered breakdown (lenders), work phone + work email (no credits). License History tab: every state license with start/end dates (→ newly licensed). Transaction History: every loan with date, lender, address (3,563 all-time for Guarino), so "since 2022" is countable from it but there is no date-range filter (only 14 Months / YTD / All Time). No 12-month figure (14 and 7 months). No previous-employer list.
- Units, Modex (export 19/10) vs MMI (20/10): YTD Guarino 1555 vs 1482, Standish 1920 vs 1849, Hense 1501 vs 1521, Miller 1143 vs 1208, Ireland 1167 vs 1180 (within ±6%). Modex 1 Year vs MMI 14 months: 1742/1914, 2047/1970, 1852/2117, 1260/1360, 1385/1658.

## MMI follow-up plan (agreed with Bao 20/10 night)
- Brayan OK'd using MMI 9 AM–9 PM Vietnam (7 PM–7 AM PT); MMI allows ONE session per account (newest login kicks the other — confirmed by Brayan).
- Research kit (persistent, chmod 700): `~/.mmi-research/` — `profile/` (Chrome profile with `device_trust`, no 2FA until ~27/10), `mmi_browser.js` (headed Chrome, CDP 9334: `node mmi_browser.js ~/.mmi-research/profile`), `login.js` (password from macOS Keychain item `mmi-recruit-research` / `victoria.pham@loanfactory.com`, never printed), `logout.js`, `peek.js`, `four.js`. Run node from `~/.mmi-research` (node_modules there; playwright 1.57).
- Do NOT use page.goto on in-app pages after login (one goto to `/` coincided with the first logout); click in-page.
- The email Vic forwarded (PDF `~/Downloads/Loan Factory Mail - Fwd_ MMI Automatization for LOs experience in pipeline.pdf`, Jan 2025): no MMI API docs. Khải only reviewed the **Bonzo** CRM API ("did not check the MMI APIs yet"); Thuận's last question "What about MMI? what type of API do they have? can we ask them?" was never answered. Brayan's manual method: MMI → Mortgage → LO search by NMLS → TRANSACTIONS tab (14 months) count 12 months; HISTORIC tab for older. Thuận: Modex had a webhook giving the 12-month number.
- Tomorrow-morning checklist (after 9:00 VN): 1) find Settings/Account/API/Integrations (account menu, Tools, Dashboards bi.mmi.io, CRM Push config); 2) Transactions + Historic tabs → can 12 months and since-2022 be counted from per-transaction dates; 3) compare 3–5 SMALL Loan Officers (2–10 loans/yr) with Modex; 4) find Terms of Service in-app; 5) what CRM Push sends + whether a custom webhook URL can be set; 6) logout. Human pace, no bulk scraping.
- Offered (not yet done): email to MMI asking for API (NMLS lookup returning per-transaction dates, license history, limits, price, terms for recruiting) + message asking Brayan for the MMI account manager's name.

## MMI research 21/10 morning (read-only, Victoria's account, session already open)
- **Webhooks exist in-app**: Settings (account menu) → Integrations → Webhooks. "CRM Push URL" is ALREADY set to a Bonzo URL (`app.getbonzo.com/api/w…`) — Vic's live config, do NOT change / do NOT "Send Test Push". Second field "Lender Push URL" empty. Bonzo first-party connect button. Connections = CRM Email Push (empty).
- **Webhook payload (public doc)**: support.mmi.io article 29728386897682 "Partner Integration: Webhook Payloads". Loan Officer payload: nmls, names, company, email/personal_email, branch address/state, `lo_ytd_volume`, `lo_ytd_transactions`, `lo_rolling_volume`, `lo_rolling_transactions` (rolling = 14 months). NO 12-month count, NO since-2022 count, NO license history. Push fires on user action (Push to CRM, Leaderboard bulk export ≤50, Dynamic List auto-sync weekly 7AM MT). Retries on non-2xx; signature via shared secret header.
- Help Center is public Zendesk: `https://support.mmi.io/api/v2/help_center/articles/search.json?query=...` — readable without the MMI session.
- **Quick Lists (Mortgage → Loan Officers)**: Transaction Timeframe = Rolling 12 Months / YTD / Year over Year / **Custom start-end date**. Column "Filtered Units" = units in that window. Verified: Custom 2022-01-01→2026-10-21 works (Hense 12M 1,909 → since-2022 3,495; Guarino since-2022 3,09x). So BOTH Vic numbers (≥5 since 2022, ≥2 in 12 months) are available in MMI's UI. Filters also: Industry Tenure, Licenses, Role, State, Filtered Units Produced min/max. Export to CSV = selected rows; FAQ says mass export is not a feature (Prospect List 25 at a time).
- Dynamic Lists (Workspace → My Contacts): none exist on Vic's account; can auto-sync weekly to the CRM Push URL — but payload has only YTD/14-month fields.
- `api.mmi.io` = "MMI One API", no public docs; release notes mention "API-to-UI data mismatch" fixes → an internal/partner API exists. Must ask MMI.
- Conclusion: webhook alone does NOT give Vic's rule. Options: (a) ask MMI for the partner API (NMLS lookup with filtered units by date range + license history); (b) ask MMI to add 12-month + since-2022 unit counts to the LO webhook payload; (c) manual: recruiter checks Quick List / profile per LO.

## MMI 21/10 late morning
- Bao: MMI login OK until 6 PM VN (US team off-hours); session stays with us.
- 2 independent researchers (help center 111 articles + public web, no login): no self-serve MMI API; api.mmi.io has only `/` and `/health`, docs paths 404. Webhook payload also has work_email/work_phone/job_title/branch_nmls but no 12-month, no custom-range, no license fields. Dynamic Lists sync daily/weekly/monthly (newer article 35043407569682). Dynamic List "Export List" downloads a file — columns/row limit undocumented (to test in-app). ICE Loan Officer Insights = paid non-MMI alternative with API.
- Profile URL `/nmls/<id>/transaction-history`: every transaction with date (paged, back to at least 2020) → 12-month and since-2022 countable per Loan Officer. `/license-history`: regulator/state/type/start/end; EMPTY for bank (federally registered) Loan Officers.
- Small Loan Officer sample (Quick List Rolling 12M, Filtered Units 2–10; all happened to be bank/small lenders): 1655819 Armendarez (3 tx total, all 2026), 2264922 Fried (61 tx), 2014703 Keegan, 1607360 Ledet (26 tx since 2020, 2 in 12M), 695840 DeJean (33 tx since 06/2022, 7 in 12M). Modex side NOT done — needs a Modex export of these NMLS (Modex sample only has the 5 big producers). Next sample should be non-bank (state-licensed) Loan Officers.

## MMI 21/10 ~10:00 — real webhook payload + Dynamic List test
- Captured a REAL CRM push (Loan Officer 1655819) by pointing CRM Push URL to a local catcher via ngrok for ~8 min, then restored the original Bonzo URL (backup `~/.mmi-research/crm_push_url.backup`, verified identical after re-opening the page). Sample: `mmi-crm-push-payload-sample.json`.
  - Sender: `GuzzleHttp/7` (PHP), plain JSON POST, NO signature header, delivered ~2 min after the click ("Loan Officer pushed to CRM").
  - Fields: type, mmi_user, id/nmls_id, conmls (company NMLS), branch_nmls, names, company, job_title, profile/fastfacts URL, google, linkedin, email/work_email/phone/work_phone, branch address/state/zip, `ytd_volume`, `ytd_transactions`, `sum_fourteen`, `count_fourteen`, notes, misc1–6. → Only YTD + 14-month; NO 12-month, NO since-2022, NO licenses. (Field names differ from the help-center doc.)
  - "Send Test Push" never arrived at the catcher (no request in ngrok log).
- CRM Push History rows have a per-contact Sync Frequency (Never/Weekly/Monthly/Quarterly/Annually) → MMI can re-push a contact on a schedule (still same fields). Vic's history: realtor ("Agent Crypt") pushes to Bonzo on 10/4/2025, nothing newer.
- Dynamic List test (list "ZZ TEST LF research - safe to delete", deleted after): Custom start date did NOT persist on save (start reset to today); with Filtered Units filter or even 12M only the list showed 0 rows; without filters it shows "Total Rows: 1,000" (looks capped). No "Export List" button in the current UI ("Save As" = copy/rename prompt). → Dynamic List is not a usable bulk-export path today.
- Browser kit: launcher crashed once on a JS dialog (Playwright auto-dismiss race) — mmi_browser.js now ignores that error.

## Bonzo check 21/10 ~11:45 (read-only, Bao logged in as miley.dau@loanfactory.com; victoria.pham has no Bonzo subscription — lands on Billing)
- Bonzo org "Loan Factory": 1/1 seat (Miley Dau, team lead, MMI Seat = NO), last login 20/10/2026.
- Bonzo Settings → Webhooks: the URL in Vic's MMI CRM Push URL = Bonzo webhook "MMI / MMI" owned by Miley, created 29/09/2024, Success/Failed last 7d = 0/0. Two more: "MMI/MMI" 16/09/2024, "Data Center / Refinder" 28/07/2026.
- People: 25k+ prospects, latest Loan Officers in campaign "1000 FHA" created 12/08/2026, Source = CSV (imported, not MMI push). Prospect has a "Recruit" tab (NMLS #, LO transactions, volume, state licenses…) — empty for CSV imports.
- Bonzo is actively used by Miley for mass email/SMS to Loan Officers; the MMI → Bonzo push path is unused (last MMI push 10/04/2025, realtors).
- MMI profile "Export Summary/Export CSV" = one-row summary only (name, NMLS, company, 14m/7m volume, YTD volume+units, purchase/refi %, tier).

## MMI → Recruit ON STAGING (21/10 ~16:40) — bead agentflow-q571r
- recruit-be #707 (ebde09c5, **D305**, V266) + recruit-fe #557 (306e996c) merged + promoted to staging (`gh workflow run promote-staging.yml -f sha=<master sha>`; merging master does NOT deploy).
- Route: `POST https://gateway.viet18.com/recruit-svc/public/v1/integrations/mmi/push/<token>`; staging token only in macOS Keychain `recruit-mmi-push-token-staging` (account recruit-be); Secret Manager `recruit-be-recruit-mmi-push-token` v2 (bao.trinh can create, not read). Log exclusion `recruit-mmi-push-token` on lenderrate-master `_Default` sink (tera-docs #757 open).
- Verified on staging: wrong token 404; Lender payload 200 `ignored_type`; Hot/Cold/profile 200; MMI URL absent from logs (control present); UI: Hot column "PRODUCTION · LAST 14 MO" (option C: MMI chip on top, Loans / Volume), Cold "PRODUCTION" left-aligned, profile MMI card, NMLS links → new.mmi.run.
- NEXT: (1) Bao sends the message to Vic + Miley (Bonzo webhook "MMI" in Miley's Bonzo, 0 deliveries/7d, Bonzo contacts come from CSV) → on OK, set Vic's MMI CRM Push URL to the staging route, push 1–2 Loan Officers, check card/lists/timeline. (2) Production: hand-made secret in lender-rate recruit-svc-secret + same log exclusion in lender-rate + `RECRUIT_FEATURES_MMI_PUSH=true` in production values, then promote — only when Bao says go. (3) MMI email (API / extra fields) not sent — Bao: use current resources first.

## PAUSE 21/10 ~17:00 (Bao going home) — how to resume
- Resume: open Claude Code in /Users/apple/Projects/agentflow → `/resume` this session, or new session: "đọc docs/handoff/modex-experience-2010/HANDOFF.md mục MMI rồi làm tiếp".
- State: MMI push is ON STAGING (be #707, fe #557). Nothing running locally (preview servers stopped, Chrome closed). Helper agents of this session are gone after restart — not needed.
- Waiting on Bao: send the two drafts in `MESSAGES-VIC-MILEY-2110.md` (reply to Vic + main message). Then wait for Vic/Miley.
- When Vic/Miley say OK: open MMI kit (`cd ~/.mmi-research && node mmi_browser.js ~/.mmi-research/profile`, ram-gate chrome first; MMI allowed while US team is off), back up current CRM Push URL (`node hookurl.js save <new file>` — keep the old backup `crm_push_url.backup`), set it to `https://gateway.viet18.com/recruit-svc/public/v1/integrations/mmi/push/<token from Keychain recruit-mmi-push-token-staging>`, push 1–2 Loan Officers that exist on staging (match by NMLS), verify profile card + Hot/Cold cells + timeline, then decide prod.
- Production go-live (only on Bao's word): hand-made `RECRUIT_MMI_PUSH_TOKEN` in lender-rate `recruit-svc-secret`, same `_Default` log exclusion in lender-rate, `RECRUIT_FEATURES_MMI_PUSH=true` in production values, promote staging→production; then point MMI at the production URL.
- Open: tera-docs PR #757 review; Q: Bonzo forward (only if Vic/Miley want it); MMI email (API/extra fields) parked by Bao.

## PAUSE 21/10 — resume point
State: nothing running in background (no agents, Chrome closed, no dev servers). All PRs of this session merged + on staging (be #698–#702, fe #550 #552 #554); prod handled by the prod-pusher session (agentflow-48), answer given (all 9 safe; Big producer threshold now 30).

**Item 8 — experience level on rows / filter / Reports (approved direction, NOT started in code):**
- Mockup (3 screens + phone) saved in `mockup-experience/` here (index.html + PNGs). Shown to Bao; waiting for approval + 2 answers: (a) level-count strip on Hot/Cold too or only Pipeline? (b) Reports split by lead source as well, or by recruiter only?
- Mockup error to fix when coding: "Newly licensed · 1 loan since 2022" is wrong — loans > 0 → Inexperienced.
- CORRECTION given to Bao: BE is NOT done for this. `experience_level` is only on single-candidate detail. Needed BE: level on list payloads (Hot/Cold/Pipeline), filter by level (computed, not stored → SQL expression or stored column), Reports endpoint counting Joined/Onboarded by level (use the decided snapshot from #702 where present). Then FE per mockup.
- Prod reality: ~750 LOs have MOSO figures (closed_loans_since_2021 + units_12mo) → classifiable; ~400 → "No figures".
- Finding (MOSO 3.64.1 code): MOSO never auto-classifies. Recruiters pick the level by hand in the ILO list column "Experience / 12 months loans" (`LORecruitingListView.java:811-840`), which opens an "Enter value from MODEX" popup to type figures; a "Check Modex" link opens Modex by NMLS. Facebook-ad leads self-declare (`SaveILOFacebookAdOp.java:305`: yes → Experienced, else New). Explains 98/312 "Experienced" with <2 loans in 12 months. Proposal pending Bao: show recruit's computed level as primary + a small marker when MOSO's hand-picked level differs.

**MMI:** another session shipped "MMI push → Recruit" to staging on 21/10 (be #707 D305, fe #557) — check its memory/HANDOFF (`project_mmi_push_staging_2110.md`) before doing more MMI work here, to avoid overlap. This session's MMI plan (checklist above) still valid for the API question; offered drafts (email to MMI about API; ask Brayan for the MMI account manager) not yet sent.

**Still waiting on Bao:** message Khải to deploy packs 3.64.1 `e3f3f98093` (then smoke test → flag `packs.writeback.experience_enabled` on → backfill); grant MODEX_IMPORT to Vic?; #554 deferred review follow-ups.

## Vic's answer (26/10, Google Chat Brayan+Victoria)
- Without the 12-month count, loans since 2022, the transaction list and licence history the MMI push is "not very helpful".
- Bonzo is no longer used (Thuận moved everyone to our own CRM) → replacing the CRM Push URL is fine.
- More MMI seats ≈ $120/month each → not worth it; 1 seat is enough.
- Consequence: the webhook-only path (D305, staging) does not meet Vic's need. Those four items exist in MMI's UI (Transaction History / License History tabs) but only an API (paid, Thuận decides) can deliver them automatically. Do NOT promote D305 to production until Bao decides.

## CLOSE-OUT AUDIT 29/10 (measured, session a8ef2df9 closed)
- PRs: fe #550 #552 #554 #557, be #698 #699 #700 #701 #702 #707 all MERGED and on STAGING; NONE on production (origin/production recruit-fe e80f45b8 / recruit-be dc2b54ec, both 20/10; prod flyway max = V260, staging V296). packs #3719 (master) + #3720 (3.64.1) merged.
- Staging DB (read-only): packs.writeback.experience_enabled=false; experience.high_producer_loans_12mo_min=30; modex.loans_since_year=2022; MODEX_IMPORT only on ADMIN role, 0 user grants; candidate_modex_snapshot 0 rows; candidate_mmi_snapshot 0 rows; 3 decided experience snapshots (test data); 0 experience write-back rows. Helm: RECRUIT_FEATURES_MMI_PUSH in staging values only (absent in production).
- MOSO prod App Engine default version `c` created 28/10 from 3.64.1, which has contained e3f3f98093 since 20/10 → packs experience guard is PROBABLY live on MOSO prod (inferred, not verified by a call).
- Open items left for later sessions: (1) prod promotion of the 10 PRs (Bao + prod pusher; D305 MMI push code is harmless with the flag absent, but Vic 26/10 says the push is not useful); (2) bead agentflow-s4wpp: after #702 is on prod → smoke test MOSO → flag on → backfill; (3) item 8 experience chip/filter/Reports — mockup `mockup-experience/`, BE work needed first, waiting Bao; (4) bead agentflow-q571r (MMI): decide API (paid, Thuận) vs drop D305; tera-docs #757 open; (5) bead agentflow-k6d0z (Modex auto-sync needs Thuận/Modex); (6) #554 follow-ups not done (empty send-now label "Save & open message", OnBehalfConfirm window.event fallback, OutcomeSection.tsx 797/800, Escape-in-Drawer test, 320px check).
- Local: 9 worktrees of this session removed (all clean, pushed, merged). Still on disk: `~/.mmi-research` (Chrome profile with Victoria's MMI session; device_trust expired ~27/10) + Keychain items `mmi-recruit-research` (Victoria's MMI password) and `recruit-mmi-push-token-staging` — delete when MMI work is over.

## UPDATE 29/10 ~10:30 — production release changed the picture (re-measured)
- All 10 PRs (fe #550 #552 #554 #557, be #698–#702 #707) are now on PRODUCTION (release be 9869ec37 / fe c72bfec0, 29/10). Prod flyway max = V296.
- Prod DB (read-only): packs.writeback.experience_enabled=false, experience.high_producer_loans_12mo_min=30, modex.loans_since_year=2022, 0 MODEX_IMPORT user grants, 0 Modex/MMI snapshots, 0 decided experience snapshots, 0 Modex exports. RECRUIT_FEATURES_MMI_PUSH absent from production values → MMI push off on prod.
- Visible on prod now: Offer form restyle, /modex page (admins), OB Mark-done modal with experience card, on-behalf popover, Send info redesign, "Big producer" label now needs ≥30 loans in 12 months.
- Next for s4wpp (needs Bao's go — money): smoke test MOSO (upgrade applied / downgrade kept / bad value error) → set packs.writeback.experience_enabled=true on prod → backfill dry run `POST /api/v1/admin/packs-writeback/experience-backfill?since=2026-10-29&dryRun=true` → real run.
- VERIFIED 29/10 (zero-impact): MOSO prod App Engine `default` version `c` (100% traffic, created 28/10) ships `WEB-INF/lib/loan-3.64.1-SNAPSHOT.jar` (GCS `staging.lender-rate.appspot.com/fe14b487e8…`); its `RecruitAPI.class` + `RecruitAPI$SyncPlan.class` contain "recruit cannot lower experience", "all fields skipped", "skipped_reasons", "experience must be one of" → packs #3720 IS live on MOSO prod. No API call made.
- Bao 29/10: KEEP `~/.mmi-research` and the Keychain items `mmi-recruit-research`, `recruit-mmi-push-token-staging`.

## CLOSE-OUT 29/10 — MMI session 933b4c0a (measured)
- be #707 (D305) + fe #557 are on PRODUCTION (be 9869ec37, fe c72bfec0). `RECRUIT_FEATURES_MMI_PUSH` is only in staging values, so the push route is OFF on prod.
- LIVE on prod with no flag (fe #557): every NMLS link (Hot leads, /today) opens `new.mmi.run/nmls/<id>` instead of NMLS Consumer Access. LF has ONE MMI seat (Victoria), so other recruiters land on the MMI login. Decide: keep, or revert `src/shared/utils/nmlsLookupUrl.ts` to the NMLS Consumer Access URL.
- Vic's MMI CRM Push URL: last set back to Miley's Bonzo URL on 21/10 (verified then). Not checked since; staging `candidate_mmi_snapshot` = 0 rows on 29/10, so nothing was ever pushed to Recruit.
- tera-docs #757 (staging log exclusion) still OPEN, no review.
- MOSO prod Datastore re-measured 29/10: kind `Modex` latest `updated` 2026-07-15 (2 rows), 2026-06-16, 2025-12-16; `ModexReport` latest 2025-06-16. So the Modex → MOSO list sync (`ModexHook`, carries `performance_12_months_count` only) stopped after mid-July 2026 and was sparse before.
- UNANSWERED proposal to Bao (26/10, "reduce Modex manual steps"): (1) ask Modex (via Thuận) to re-enable list sync pointed at Recruit + yearly units + what the 1,000-row cap counts; (2) Recruit keeps past-year units from earlier imports so "since 2022" = stored years + current year → monthly run needs 2 files (1 Year + YTD) instead of 6; (3) NMLS export split into "new, needs yearly files" vs "refresh only". Nothing coded.
- 29/10 07:19 UTC (Bao "bật"): PROD `packs.writeback.experience_enabled` = true via `PUT /api/v1/admin/settings/...` from Bao's admin session (fetch inside the logged-in tab, gateway.loanfactory.com). Backfill dry runs since 2026-10-29 and 2026-08-31: scanned 0. Positive control (prod DB): `checklist_items` has NO ONB_PREMEETING rows at all → no 1-1 has ever been marked done in recruit prod; the send fires only once onboarding runs in recruit prod (see bead agentflow-61yi6 hand-off flags). Nothing to backfill today.
- Mockup published (private): https://claude.ai/artifact/SFDAcNqB5pqGN9rDzUZhd7 (Lena Fischer row fixed to Inexperienced).
- 320px check (staging, Log result → Send info): page has no horizontal scroll; `.rec-sendrow` overflows by 7px (scrollWidth 279 vs 272) — the [Send now | Schedule for later] switch touches the right edge. Small CSS follow-up.
- MMI → PRODUCTION prep (Bao 29/10 "cứ làm flow hiện tại"): recruit-be #762 (prod values RECRUIT_FEATURES_MMI_PUSH=true + secret-keys.txt RECRUIT_MMI_PUSH_TOKEN=recruit-be-recruit-mmi-push-token; deploy fails closed if the secret is missing) and tera-docs #886 (lender-rate log exclusion, stacked on #757). NOT merged, nothing applied in GCP. Go-live order: (1) create secret `recruit-be-recruit-mmi-push-token` in lender-rate + Keychain copy `recruit-mmi-push-token-production` (commands in #762/#886; nothing printed); (2) log exclusion `recruit-mmi-push-token` on lender-rate `_Default`; (3) merge #762 → release team promotes staging→production; (4) set Victoria's MMI CRM Push URL to `https://gateway.loanfactory.com/recruit-svc/public/v1/integrations/mmi/push/<token>` (keep backup; MMI needs Brayan's 2FA code again — device_trust expired), push 1 Loan Officer, verify card/cells/timeline + log check. Then update docs/secrets/SECRETS-INVENTORY.md line 74. Worktrees: recruit-be-worktrees/mmi-prod, tera-docs-worktrees-mmi.

## 29/10 afternoon — Bao's decisions + actions
- Item 8 APPROVED (count strip on Pipeline + Cold, filter on Hot/Cold/Pipeline, Reports by recruiter AND by source toggle). Bao: UI must match existing pages (Today, Hot leads, Pipeline) — font sizes, colours, buttons, filters; the mockup only fixes the content. BE in progress (worktree recruit-be-worktrees/experience-lists); FE after BE, local preview first.
- MMI → prod: log exclusion `recruit-mmi-push-token` CREATED on lender-rate `_Default` (enabled, 29/10, by bao.trinh). tera-docs #757 + #886 MERGED. Secret `recruit-be-recruit-mmi-push-token` NOT created: bao.trinh lacks secretmanager create on lender-rate (IAM_PERMISSION_DENIED) → ask Thanh/DevOps (created the other 25 prod secrets 27/10). DO NOT merge/promote recruit-be #762 before the secret exists (prod secret-sync fails closed → whole prod release blocked). MMI URL switch: tonight after 23:00 VN with Brayan's 2FA code.
- FE polish in progress (worktree recruit-fe-worktrees/sendinfo-polish, local only): Send-now message required, OnBehalfConfirm anchor required, Escape-in-Drawer test, 320px switch overflow.

## RESUME POINT — PAUSE 29/10 ~18:10 (Bao shut the machine down; session a8ef2df9)

Measure first (`git fetch`, `gh pr view`); do not trust this list blindly.

**Done 29/10 afternoon**
- recruit-be #765 merged (b38af58a): fixed master test `OnboardingV2HandoffFlagDefaultTest` broken by #703.
- recruit-be #762 merged (0d63d20d) = MMI push ON in prod. Staging AND production deployed at 0d63d20d (cd-production success incl. secret sync → Thanh's accessor grant works).
- Prod secret `recruit-be-recruit-mmi-push-token` (lender-rate): Thanh created it, we set v1 (piped from Keychain, never printed).
- Probe: real token + non-JSON body → 400; wrong token → 404. **The 400 error body echoes the request path incl. the token** (error envelope `error.path`). My probe printed ~9 leading chars of v1 → **rotated**: v2 added; Keychain `recruit-mmi-push-token-production` (account recruit-be) holds v2. `secret-sync.yml --ref production` run 40860201269 SUCCESS and restarted pods; v2 probe → 400 (live). v1 still enabled in Secret Manager (only Thanh/Đạt can disable; harmless, sync reads latest).
- Bead created: MMI push stores raw body in webhook_events (store knownKeysOnly) — non-blocking security note.

**TODO on resume, in order**
1. File a bead + fix: error envelope `path` echoes the token for `/public/v1/integrations/mmi/push/**` (and check whether the 400 is logged with the path; prod log exclusion covers jsonPayload.path/textPayload/url). Mask the path for that route.
2. #764 (scheduled SMS auto-send, D342, `scheduled_send_info.sms_enabled` false everywhere): 2 reviewers APPROVED at 41de8b5e, branch updated, auto-merge enabled. After merge: `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<master sha>`, check cd-staging. FE still to do (label "Schedule SMS", time label, status chip, new reason codes). Go-live prereqs: 10DLC test SMS on staging, omni COMM_QUESTIONS_ENABLED prod, allowlist — bead agentflow-236t9.16.
3. #763 (item 8 BE, now **D343**, head 0f756458, CI green): needs 2 independent reviewers → squash-merge → promote staging. API: rows carry `experience_level`; filter `experience=`; `GET /candidates/experience-counts`, `GET /inbox/cold/experience-counts`; `GET /reports/experience?from&to&by=recruiter|source`.
4. Item 8 FE (recruit-fe): must MATCH Today / Hot leads / Pipeline (font size, colors, buttons, filters) — Bao's note on the mockup (artifact SFDAcNqB5pqGN9rDzUZhd7). Local preview for Bao BEFORE push.
5. After 23:00 VN (Bao pings Brayan for MMI 2FA): set Victoria's MMI CRM Push URL to `https://gateway.loanfactory.com/recruit-svc/public/v1/integrations/mmi/push/<Keychain recruit-mmi-push-token-production>` (back up old URL), push 1 Loan Officer, verify card/cells/timeline and logs hide the path. Update docs/secrets/SECRETS-INVENTORY.md (~line 74) + BOOTSTRAP.md MMI note (v2, rotated 29/10).
6. Small: dead i18n key `save_SEND_INFO` (recruit-fe en/vi outcome.json:111); OutcomeSection split later ("nào báo rồi làm"); memory line: experience prod flag is ON since 29/10 07:19 UTC.

Worktrees on disk: `recruit-be-worktrees/fix-handoff-test` (merged, removable), `recruit-be-worktrees/experience-lists` (#763), `recruit-be-worktrees/scheduled-sms` (#764).

## UPDATE 29/10 ~22:05 (resumed evening)

- recruit-be **production = staging = 434d0ab6** (cd-production success): #763 (item 8 BE, D343), #764 (scheduled SMS auto-send, D342, `scheduled_send_info.sms_enabled` false), #768 (docs, other session), #769 (MMI token masked in error envelopes/logs, bead agentflow-7xj77 closed).
- Prod probe 22:03: real token + non-JSON → 400, token NOT in body, path masked `.../push/***`; wrong token → 404.
- Item 8 FE (bead agentflow-2dyj6): built in `recruit-fe-worktrees/experience-ui`, branch `feat/experience-level-lists`, commits e163b7c6 + 982c1945, **NOT pushed** — local preview for Bao at http://localhost:3061 (read-only proxy :8199 to staging; PIDs next 92676, proxy 14954; ram-gate next-dev token 1793282667-92085-5019). Screenshots `ui-preview/`. Waiting Bao's look. Open points for Bao: "No loan figures yet" dominates staging; dropped "N loans since 2022" from Pipeline rows; no period selector on the report yet; Kanban/card views lack picker+strip; the Next dev "1 Issue" badge to check before PR.
- Still TODO: FE for #764 (Schedule SMS label/status/reason codes); MMI URL switch after 23:00 with Brayan's 2FA (token = Keychain `recruit-mmi-push-token-production`, v2).

## 29/10 ~23:20 — MMI CRM Push URL switched to production

- Bao logged into Victoria's MMI (2FA via Brayan). MMI moved to **new.mmi.run** (login = email + password on one page; webhooks page `/settings/user/webhooks`; LO profile `/nmls/<id>`; push menu = paper-plane icon top right).
- CRM Push URL was the Bonzo webhook (= `~/.mmi-research/crm_push_url.backup`, verified equal) → now `https://gateway.loanfactory.com/recruit-svc/public/v1/integrations/mmi/push/<Keychain recruit-mmi-push-token-production>`; re-read after reload = equal.
- **Test push NOT done** (session logged out first). Bao: test tomorrow morning. Plan: push NMLS 1040852 (Matthew Laird, prod candidate 7b533401-…, S0, no figures) → check `webhook_events` provider MMI row, candidate figures + timeline on prod (read-only pod: scratchpad `ro.sh`). Rollback = `node hookurl.js restore crm_push_url.backup`.
- Item 8 FE preview restarted on http://localhost:3061 (next dev + proxy :8199), still not pushed, waiting Bao.

## Night 29→30/10 (away window: to STAGING, not prod)

- MMI 7-day device trust CONFIRMED: login with password only, no 2FA (~23:50). Logged out right after (Vic's team shares the seat). Test push of NMLS 1040852 = morning.
- recruit-fe **#618 merged (74446db7) → STAGING** (cd-staging success): item 8 UI redone to the mockup (dot pills strip on Pipeline+Cold, colored level chips + "N loans since 2022", Experience picker, Reports Experience tab + Period picker). 2 reviewers approved. Staging check 320/1440: no horizontal scroll, chips render (`ui-preview/stg-pipeline-*.png`). Prod waits for Bao. Local preview (:3061 + demo proxy) can be stopped.
- recruit-fe **#619** (scheduled SMS FE, flag off): reviewer A approve, B requested changes (manual Send shown on OMNI_NO_ANSWER = double-text risk; explicit config false must win over cache; loading label) — agent fixing.

## Morning report 30/10 (night work done, measured)

- recruit-fe STAGING = 5aa5a746: #618 item 8 UI (redo to mockup) · #619 scheduled SMS UI (flag off; no manual Send / composer locked on OMNI_NO_ANSWER) · #621 follow-ups (shadow tokens, midnight-safe period). Each had 2 reviewers.
- recruit-be PROD = STAGING = 434d0ab6 (#763 #764 #768 #769).
- Prod for recruit-fe #618/#619/#621: waits for Bao.
- MMI: device trust works (no 2FA). Morning TODO: log in (password only), push NMLS 1040852, verify on prod, log out at once (Vic's team shares the seat).
- Leftovers: delete branch `shots/scheduled-sms-autosend` after attaching images to PR #619 in the browser; `save_SEND_INFO` key is NOT dead (eager `save_${kind}` lookup in OutcomeSection) — keep.
- Worktrees all removed; local preview stopped; no ram-gate tokens held.

## RESUME POINT — PAUSE 30/10 morning (Bao going to the office; session a8ef2df9)

State measured at pause:
- recruit-be prod = staging = `434d0ab6` (MMI push ON, token v2, error path masked).
- recruit-fe staging = `5aa5a746` (#618 item 8 UI, #619 scheduled SMS FE, #621 follow-ups). Prod NOT pushed — waits for Bao's staging review.
- No MMI browser running, no dev server, no worktree, no ram-gate token held. MMI is logged out.

Next, in order:
1. MMI test push — only when Bao says Vic's team is not using MMI. Log in with password only (Keychain `mmi-recruit-research`, device trust, no 2FA), push NMLS 1040852 (Matthew Laird, prod candidate `7b533401-…`), log out at once. Verify on prod with `ro.sh` (webhook_events provider MMI, candidate figures, timeline). Rollback: `node ~/.mmi-research/hookurl.js restore crm_push_url.backup`.
2. Then update docs/secrets/SECRETS-INVENTORY.md + BOOTSTRAP.md MMI note (token v2, rotated 29/10).
3. Bao reviews staging (/pipeline, /inbox/cold, /inbox/hot, /reports?tab=experience) → on OK push recruit-fe staging → prod.
4. Delete branch `shots/scheduled-sms-autosend` after Bao drags the images into PR #619.
5. Open beads: agentflow-2dyj6 (item 8 prod), agentflow-236t9.16 (SMS go-live prereqs), MMI raw-body bead, agentflow-q571r.

## 30/10 ~10:30 — MMI test push DONE on production
- Logged in with password only (device trust, no 2FA). The login is now two steps (email → Continue → password → Sign In); `~/.mmi-research/login2.js` handles it. The push button on the new site is the "CRM Quick Push" icon on `/nmls/<id>`, then "Confirm Push" (uses 1 of 2500 monthly exports).
- Pushed NMLS 1040852 (Matthew Laird) at 03:28 UTC. Logged out immediately (verified "LOGGED OUT"), browser closed, ram-gate released.
- Prod measured: webhook_events `crm.push.mortgage` PROCESSED (no error); candidate `7b533401…` units_12mo 40→41 source MOSO→MMI_14MO, career_production ∅→10,133,482, office phone filled (change log stores no phone value by design); loans_since_anchor untouched (MOSO's 143 is higher — rule: never lower); timeline SYSTEM "Production updated from MMI · 41 loans / 14 months · pushed by victoria.pham@…".
- Docs: SECRETS-INVENTORY row → live; recruit-be BOOTSTRAP PR #773 (auto-merge).
- Remaining: recruit-fe prod (#618/#619/#621) waits for Bao's staging review; branch `shots/scheduled-sms-autosend` after images go into PR #619.

## RESUME POINT — PAUSE 30/10 evening (Bao going home; session a8ef2df9)

State measured at pause (audit done this afternoon, all read-only):
- recruit-fe: staging `85702d2f` is 20 commits ahead of prod `c72bfec0`. This session's 4: #607 #618 #619 #621; the other 16 belong to other sessions (#612 #616 #620 pair with BE #767 #772 #771).
- recruit-be: prod `434d0ab6`; staging `03a162f1` (+4 from other sessions: #767 #770 #771 #772); master `8198aa5c` (#773 docs).
- Flyway: staging V301, prod V298. `scheduled_send_info.sms_enabled=false` and `allowed_sms_numbers=[]` on both envs (empty list = no SMS to anyone). `packs.writeback.experience_enabled` prod = true, but no 1-1 marked done on prod yet → nothing written back.
- MMI logged out. No browser, dev server, worktree or ram-gate token held.

Waiting on Bao (4 questions asked in chat, unanswered):
1. After staging review (/pipeline, /inbox/cold, /inbox/hot, /reports?tab=experience, Log result → Send info), push recruit-be staging → prod FIRST, then recruit-fe staging → prod (all 20 commits).
2. NMLS links open new.mmi.run (one MMI seat) — keep or revert `src/shared/utils/nmlsLookupUrl.ts`?
3. Turn on `scheduled_send_info.sms_enabled` on STAGING with allowlist = Bao's phone only, to preview the flag-on SMS UI? (needs Bao's number)
4. Delete branch `shots/scheduled-sms-autosend` once Bao has seen the PR #619 images.
Also open: 26/10 Modex manual-steps proposal unanswered; beads 2dyj6, 236t9.16, q571r, s4wpp, k6d0z, d2uzb.

On resume: re-measure branch heads before acting (other sessions may promote), then ask the 4 questions again.


## UPDATE 30/10 19:49 — recruit-fe released to production (measured)

Khai fast-forwarded recruit-fe staging -> production: production = staging = `46ebc4e3` (Deploy production run 41057239836 green, release issue #606 closed). It carries fe #602–#621, #623, #625–#628 (platform SDK 0.4.82). `scheduled_send_sms` is seeded false on production.

recruit-be is NOT released yet: production...staging is ahead 6 (#767 #770 #771 #772 #773 #774). The FE falls back safely without them (checked on origin/production), so those features stay dark on production until recruit-be ships. Tracked in bd agentflow-9syty.

## AUDIT 30/10 ~20:30 (resumed evening, measured)
- Ancestry: be #763 #764 #769 and fe #607 #618 #619 #621 are all in `production`. be #773 (docs) is staging-only, inside the 6 tracked by agentflow-9syty.
- Prod DB: 1 MMI webhook event ever (the 03:28 UTC test, PROCESSED); `scheduled_send_info_sends` 0 rows; `sms_enabled=false`, allowlist `[]`; `packs.writeback.experience_enabled` latest row true; `packs_writeback_outbox` empty; no ONB_PREMEETING checklist template on prod at all → write-back has nothing to send; Modex snapshots/exports 0; flyway V298 (staging V301).
- Prod NMLS links still open `new.mmi.run/nmls/<id>` (decision pending).
- Bead agentflow-2dyj6 closed (item 8 on prod). Still open: 236t9.16, q571r, s4wpp, k6d0z, d2uzb, 9syty (BE prod release).

## 30/10 evening (~23:10) — recruit-be released + Bao's answers
- recruit-be production = staging = `65b464f8` (#767 #770 #771 #772 #773 #774), pushed by this session after GO from 8658d500 (#772 owner); checks for 8658d500 all pass (V299–V301 ok, referral.program_* false, new tables 0 rows, 0 ERROR lines). bd agentflow-9syty closed.
- Item 8 eyeballed on PROD with Bao's login (1440 + 320, no horizontal scroll): Pipeline strip HP 47 / Exp 114 / Inexp 170 / Newly 123 / No figures 215; Cold HP 31 / Exp 66 / Inexp 74 / Newly 42 / No figures 89; Reports Experience Joined 26 / Onboarded 30. Chips read "N loans since 2021" on prod (MOSO fallback, no 2022 anchor yet) — by design.
- Bao decisions: KEEP NMLS links → MMI; MMI API waits for Thuận (bd agentflow-n7bec reminder); experience write-back depends on users (no offer ever sent through Recruit prod: all 941 offers created by super.admin = MOSO copies → no ONB_PREMEETING item → nothing to send).
- SMS go-live on prod needs 4 things, not 3: 10DLC (Twilio owner), omni COMM_QUESTIONS_ENABLED (needs topic `omni-question-events` in lender-rate — absent — + omni prod values + omni release by Khải), recruit `RECRUIT_FEATURES_SCHEDULED_SEND_INFO` on prod (absent by design = email auto-send also off, Bao 18/10), allowlist/ANY. Asked Bao whether to start topic + omni PR now.
- Waiting on Bao: phone number + staging admin login to preview scheduled SMS on staging (allowlist = only that number); whether to code Modex proposal parts 2–3.

## 30/10 ~23:30 — scheduled SMS proven on staging; omni prod flag merged
- STAGING (left ON on purpose): `scheduled_send_info.sms_enabled=true`, `allowed_sms_numbers=["+14085381464"]` (Bao's Zoom number only), set from chauchau's admin session 16:18 UTC. Flag-on UI seen: "Schedule SMS", "Time (optional)", 8am–9pm hint.
- Scheduled SMS on QA candidate ba96a139 (TRINH BAO #1, CA) for 23:30 VN → ledger `scheduled_send_info_sends` SENT 16:30:00 UTC with omni message ref (delivery status not back yet when checked). To turn off: PUT both settings back (false / []).
- omni-service #659 MERGED (27e83a3e): production values COMM_QUESTIONS_ENABLED + OMNI_QUESTION_EVENTS_TOPIC; 2 reviewers approved; promoted to omni staging. Production release + topic `omni-question-events` in lender-rate = Khải (draft message given to Bao; bao.trinh has only pubsub.viewer).
- Modex proposal parts 2–3: NOT built (Bao: API with Modex/MMI is the future). One combined question for Thuận — bd agentflow-n7bec.
