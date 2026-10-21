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
