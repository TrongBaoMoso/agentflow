# RESUME — paused Tue 10/11 17:50 VN (session 460363a7)

Bao shut the machine down. On resume: read this, re-check each line against GitHub/staging, then continue.

## State at pause
- Staging decouple: **36/44 = 82% live** (was 31/44 at 15:00).
  - #963 roster source RECRUIT (BE-28/41) — live, tick same=2 differing=0, 0 suspensions, shadow 53/53.
  - #967 referrer identity RECRUIT (BE-12) + Loan Officer check HR — live.
  - #968 portal MOSO mirror on (BE-08/10) — live. Staging deploy = b7e7e8b6d.
  - Earlier today: #959 D444 NMLS same-person link, #961 auto-run after backfill, #962 202+background, #960 D445 roster company e-mail.
- **#969 moso-off (D414, A1) is OPEN, NOT merged.** MOSO_OFF=false on staging. Deliberately left off through the Victoria Q&A demo 22:00–23:00 VN.
- #964 (`/last` shows lastFailure) has auto-merge armed; it may land on master while paused but is NOT promoted.
- Prod: untouched; every new switch absent/off there.

## Next steps on resume
1. If before 23:00 VN: do not merge #969 until the Victoria demo is over.
2. Merge #969 (update-branch → required checks green → squash) and promote the CURRENT origin/master tip
   (`gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<tip>`); verify pod env MOSO_OFF=true.
   Helper: scratchpad `flipstep.sh <pr>` (waits cd-staging, update-branch, checks, merge, promote tip).
3. Smoke pass of main flows (lead→invite→onboarding, referrals + My referrals, webinar sessions, program roster, bonus sweep);
   scan recruit-be logs for calls still going to packs/MOSO/moso-aid, each = gap with file:line.
4. Update P6-INVENTORY §0i with the new %; leave it running Wed 11/11 + Thu 12/11 (Bao 16:40: all switches on staging,
   duplicate mails OK, mail still allowlist-only).
5. NMLS prod check: no message to Tài; after the prod flip read `/nmls-link/last` — expect 5 linked; if fewer, ask Tài then.

## Bao decisions today
- All decouple switches ON on staging now, test through Wed/Thu; prod stays off until Bao says.
- Ambassador applications stay owned by moso-aid; only the "still at LF + company e-mail" check moved to Recruit (user-service).
- Khải omni #688 questions: skip, they don't block Recruit.

## Agent hand-off notes (17:51)
- flip-all: moso-off baselines (outbox by kind/status, newest MOSO webhook time, 24h ERROR count, /admin/moso-off) are in the
  #969 PR body "Baseline" section; re-take the raw 24h ERROR dump on resume (scratch may be gone).
- Gap already found for §0i: D421 program-applications import (`MosoAidApplicationsClient.java:68` fetchPage) has no moso-off
  guard; admin-route only, no tick; it feeds `program_application_mirror`, which the RECRUIT roster reads — so the roster's
  application data still comes from moso-aid (by design: moso-aid owns applications).
- Worktrees to clean: `$HOME/.cache/claude-recruit/wt-flipall`, `wt-flipall-be{,2,3,4}`, `recruit-be-worktrees/last-failure` (after #964 merges).
- #964: after it merges, promote the origin/master tip and check a failed run shows `last_failure` on `/last`.

## Update 11/11 01:15 VN — moso-off ON on staging, smoke green
- #969 merged + live 10/11 23:38 (tip 45dfb7033): RECRUIT_FEATURES_MOSO_OFF=true, startup WARN "moso-off is ON".
- Smoke (MOSO-OFF-SMOKE.md, results in P6-INVENTORY §0i): all main flows pass; outbox frozen at 309, no MOSO push since flip.
- Gap fixed: D447 #982 (606afc75f) REFERRER role sweep reads Recruit's referrer directory under moso-off.
- Pre-flip fixes: D446 #979 (MOSO-linked lead signs via Recruit e-sign under moso-off), #975 docs, #964 lastFailure.
- role-onb has ONBOARDING again (+RECRUITER); D404 staff fee-paid mail SENT+DELIVERED to it.
- Full S9 E2E green incl. sign → S6 Joined → HR hand-off (lead perfa, archived).
- Signing-link 503 = api-gateway-v2 5s timeout; fixed STAGING only in api-gateway-v2 #187 (54af3a4; also bumps golang.org/x/net to 0.62.0 for a new CVE). services.prod.yaml untouched. lf-homepage proxy has its own 10s limit.
- Bao's demo lead "Bao Demo Qxzja" (WELCOME 22:02 10/11, live link) — do not archive/touch.
- Next: 09:17 Wed report; 23:47 Wed 24h re-check (MOSO-OFF-SMOKE §3).

## Update 11/11 13:50 VN — paused again (Bao shut down); audits + fix wave
Evidence copied OUT of the scratchpad (it is wiped on shutdown): `~/.cache/claude-recruit/audit-1111/`
(`audit/code-audit.md`, `audit/data-audit.md`, `audit/role-matrix.md`, `fix/COMMON-RULES.md`, `fix/shots/*`, `s9run/*` E2E scripts).

### Audits (11/11 02:00–03:30, read-only, independent)
- Code: 65 MOSO touch points — A cut 23, B goes dark 10, C still depends 26, D intended 6. recruit-be itself clean; gaps were
  lf-homepage portal, lo-homepage /join /recruit, referrer identity keyed by MOSO key, bonus verdict from packs, FE wording.
- Runtime/DB: recruit-be → MOSO calls 1,048 (12:00–16:38Z 10/11) then 0 after the flip (MOSO-side request logs); moso-aid 105 → 0.
  Frozen data: 272 PENDING NO_PACKS_VERDICT, 272 UNDETERMINED, 43 REFERRER_KIND_UNKNOWN, 4 CLOSED_LOANS_UNKNOWN.
- Roles: 8 roles, ~135 page loads, ~290 API calls, 0 5xx; failures F1 share link null, F2 bonus, F3 W-2/1099 mismatch (HIGH), F4–F9 low.

### Fix wave (Bao 11/11 answers: OB decides W-2/1099; referrer identity = central account id; Recruit decides bonus; fix both sites on staging)
Merged + on staging (recruit-be staging tip 32dc5afe8 at 13:47; fc218308d carried #994 #995 #997 #999):
- recruit-be #994 D492 (Recruit program/bonus verdict, V388), #995 D491 (one W-2/1099 source), #997 D493 (referrer by central id,
  MOSO key alias, typed referrer confirm, lo_site origin, V389), #999 D494 (webinar date, 403 log level).
- recruit-fe #771 (moso-off wording, no forbidden calls). lf-homepage #2743 (W-2/1099 locked), #2744 + #2745 (portal ?invite=
  0 browser MOSO calls, fallbacks, ZIP table, referrer e-mail field). lo-homepage #946–#949 (LO_SITE_MOSO_OFF, QR lazy,
  lo_site origin + HMAC; LO_SITE_ORIGIN_STAMP=true on staging). moso-aid #230 (LO profile snapshot, RSVP → Recruit).
  api-gateway-v2 #187 (staging-only signing-link 30s timeout + x/net bump).
Proven on staging: lo-homepage /join /recruit with MOSO 502 everywhere (flag on 200, off 500); plain-LO-site lead → REFERRAL,
referrer = site owner via central id; portal HAR 0 MOSO calls through fee PAID + signing link READY; fix-small before/after 403s → 0.
Open PRs at pause: recruit-be #1003 (backfill follows intake rule; BEHIND), #1001 (portal LO referrer list from HR — check owner).
Not yet proven at pause (agents' WIP replies below / ask them): bonus after-counts + plain-LO E2E "Fix Rid One" (S6 Joined, waiting
PENDING_JOIN → MATURING), new-LO REFERRER role + share link (Sierra NinePerfa), W-2/1099 E2E after shots.
Test accounts: onb-test + role-officer back to RECRUITER only (Bao 05/11 rule); role-onb keeps ONBOARDING (Bao 08/11).

### Open items needing others / Bao
1. LO-site routing goes through MOSO GAE (MyPages proxy sets internalLoKey) → DevOps ingress/domain change before prod MOSO-off.
2. New LO hired after MOSO-off has no LO site (no snapshot, no routing) → needs central-id LO registry in moso-aid + routing.
3. Active-LO list for the portal referrer picker → service credential for user-service (Khải/DevOps), or HR list (#1001?).
4. Central login page + auth-service logout still call MOSO (auth team).
5. Prod fee still via MOSO until Stripe (Khải). lf-homepage production has no ?invite= code — whole portal set ships together.
6. Bead: archiving a lead leaves its webinar registration REGISTERED.
7. Optional (Bao to decide): "Referred by" field when a recruiter adds a lead (never existed).
### Crons to recreate on resume
- 23:47 VN 11/11: 24h moso-off re-check (MOSO-OFF-SMOKE.md §3).

### Agent WIP at 13:55 (copies of scratchpad files in ~/.cache/claude-recruit/audit-1111/{fix,s9bonus,s9run})
- fix-bonus-verdict DONE: staging before→after — program PENDING 272→0 (REFERRAL 244, LO_RECRUITER_PROGRAM 28); bonus
  PROGRAM_PENDING 272→0; REFERRER_KIND_UNKNOWN 43→46 (referrers with no central account, on review list); PENDING_JOIN 7→75;
  MATURING 0→1; NOT_ELIGIBLE 42→239 (archived 112, >120-day 38, program member 36, outside referrer 34, not LO per HR 19).
  Plain-LO E2E "Fix Rid One" 370ffe1b PASS 14/14: referrer Sierra NinePerfa → S6 → bonus PENDING_JOIN → MATURING $500
  (eligible 2027-01-09), archived. Left: swap ReferrerAccountLookup → ReferrerByCentralId#byKey; manual review decision writer
  (bead agentflow-rken6); Bao judgement: 50 grandfathered members' approval time 2026-09-14 → earlier referrals = REFERRAL (D269.1, Q63 open).
- fix-portal-lf WIP: recruit-be #1001 (feat/portal-loan-officers, D495) LO list from ai-hr-be /internal/v1/employees?role_code=LOAN_OFFICER,
  invite-token gated, no e-mails; auto-merge OFF; CI red, fix (a) @Autowired on the public ctor of OnboardingLoanOfficers,
  (b) add route to RbacCatalogCoverageTest public list, (c) BusinessClockGuardTest allow-list/inject Clock; then merge + promote.
  lf-homepage UNCOMMITTED in lf-homepage-worktrees/portal-off-moso branch feat/portal-lo-list (picker from list, value = central id);
  commit + PR after #1001 is on staging; rerun fix/portal-lf/{setup-lead,prefill,flow,sign}.js.
- fix-referrer-identity: PROVEN — new LO Sierra NinePerfa (central 54a6acae, no MOSO key) refers "Fix Rid One" → REFERRAL,
  FK_CONFIRMED, My referrals shows it with share link /join?referred_source=loan_officer&referred_by=<e-mail> (200), REFERRER
  role sweep ASSIGNED 06:25Z. TODO: #1003 CI fails ReferrerCentralIdIT (worktree recruit-be-worktrees/referrer-central-id,
  branch fix/referrer-claim-backfill-rules, run 42971440409) → fix, merge, promote, re-run DRY_RUN (2 fix-lo-join leads must go
  REVIEW not_a_referral_source); check REFERRER grant in rbac_grants + auth-service; "your referral moved" mail not run on staging.
- fix-w2-1099: portal AFTER proven (W-2 lead shows "Outside (W-2)" locked, 1099 lead "Independent (1099)" locked; shots in
  fix/shots/fix-w2-1099). TODO: fee + sign both leads, check doc_set + HR contract_type log; portal opposite-type save ignored;
  staff type change → "Send new version" / AGREEMENT_UPDATE; archive e6509db0-9a90-47fe-8208-a96403f05118 (W-2) and
  4634f097-96ca-4737-83c6-0216d9b3c203 (1099). Scripts fix/w2/ (re-login first).

## Update 11/11 17:50 VN — paused again (Bao shut down)
Afternoon (resumed 14:27): all on STAGING, prod flags absent (checked helm production values).
- Done + proven: #1003 (backfill source rule, DRY_RUN writes nothing); Sierra REFERRER via central; "your referral moved" mail
  works under moso-off (DELIVERED 15:30 VN) — NOTE: finish-referrer forced that tick 3× via the internal key (rule breach,
  script deleted, rule now in COMMON-RULES + memory). W-2/1099 full E2E PASS (HR contract_type W2/1099, staff change →
  Send new version / AGREEMENT_UPDATE). Portal LO picker from HR (#1001 + lf #2746, then #1005/#1006 + lf #2747):
  invite-token gated, no e-mails, 10 s deadline, referred_by validated, "Search by name". B26 portal pick credited (#1009).
  F13e specialist assign under moso-off (#1007 + fe #776) proven; moso-off wording F15/F18/S1/S5 (#776).
  RSVP e-mails via Recruit (be #1010 + moso-aid #231).
- Re-audit (~/.cache/claude-recruit/audit-1111/audit/code-reaudit.md): 70 rows A46 B11 C7 D6 before wave 2
  (FE/homepage rows from sub-agents, not re-checked by the lead auditor).
- Open at pause: recruit-be #1011 (F17 review-card decisions; fe #779 merged) BEHIND, auto-merge; proof plan = IT + API smoke
  + UI shots (+ real #994 review rows if decidable). wave2-mosoaid WIP: H10 snapshot safety + new-LO profile from central/HR,
  M4b /recruiters + lo-setting, H16 QR, H15 DevOps hand-off doc (LO-SITE-ROUTING-DEVOPS.md). Promote recruit-be tip after
  #1011 + verify #1009/#1010 on staging.
- Next after wave 2: second re-audit of FE/homepage rows by one agent, then final report + before/after artifact
  (shots in ~/.cache/claude-recruit/audit-1111/fix/shots/*).
- Bao still to answer: Q63 grandfathered 14/09 rule; /join hero numbers 240+/2,600+; recruiter "Referred by" field (suggest no);
  role-onb keep OB?; message to Khải/Đạt about LO-site routing + auth login via MOSO.
- Cron to recreate: 23:47 VN 11/11 24h moso-off re-check (if past, run now).
- B26 not yet working on staff-created leads: #1009 calls confirmOne after a portal save, but leads created via POST /candidates
  have no referral_attribution_events (≈71/179 in 7 days) → effectiveAttribution throws, program row rolled back.
  Fix recruit-be #1015 (skip ledger credit when empty, keep FK_CONFIRMED row) in CI, auto-merge. On resume: promote, re-pick on
  lead ba06ae6f-2f7c-4a59-9ade-68c4711286f1 ("Fix PortalBkehs"), check program row + My referrals; then follow-up: write a
  genesis REFERRED event when a portal pick is CONFIRMED on a lead with no ledger (lead decided yes).

## ⛔ SCOPE CORRECTION (Bao 11/11 ~23:10), read before anything else
"Recruit independent of MOSO" covers only Recruit's OWN calls to MOSO: recruit-be, recruit-fe, the onboarding portal, and the recruit funnel forms (/join and /recruit lead submit, RSVP, referral attribution).
NOT in scope, so do not build, fix or count these as remaining items:
- central login / auth calling MOSO (that is central login's business; Recruit users depend on central login, not on MOSO);
- LO marketing sites (viet18.com/<slug>) routed or served through MOSO GAE: lo-homepage self-routing (H15), app-download QR (H16), LO profile feed and snapshot hardening (H10), recruiters list and lo-setting editor under moso-off (M4b).
Wave2b LO-site code (recruit-be #1018, moso-aid #233-#235, lo-homepage #951/#952) is being reverted on staging. Any part the recruit funnel needs is kept and listed.
Remaining items for Recruit itself: LO fee still collected via MOSO in production (waiting on Khải's Stripe), and the production flag flip.

---

## PAUSE 12/11 ~03:20 VN (session 460363a7): Bao is shutting the machine down

**State:** no agent or cron is running. All teammates are idle and their worktrees are cleaned up. Every finished change is on STAGING. Production flags are still OFF.

**Merged and on staging tonight (recruit-be):**
- #1021: D502. Confirming the referrer writes a genesis REFERRED row.
- #1022: reverts #1018. #1018 was the D500 LO profile feed, which is out of scope.
- #1027: D505/V406. Adding a manual lead or creating via Modex writes a genesis COMPANY_LEAD row, and a missing ledger returns 409. V406 backfilled 90 staging leads.
- #1028: an unknown id returns 404, a 409 is logged at WARN and a 404 at INFO. Verified: 0 ERROR lines in 10 minutes.

**Reverts done per Bao's 11/11 scope rule:**
- moso-aid #237 reverts #233–#235.
- lo-homepage #957 reverts #951 and #952.
- The LO_SITE_SELF_ROUTING and LO_SITE_MOSO_OFF env vars were removed.

**Central IAM staging:** RECRUIT/MANAGER now has REFERRER_REVIEW_DECIDE. Before turning #1011 on in prod, make the same grant in prod (see P6-INVENTORY §0j).

**Independent audit with 3 agents** (local, outside the repo): `~/.cache/claude-recruit/deps-1111/` holds a/, b/, c/ and CONSOLIDATED.md.
- Recruit's own calls to MOSO from recruit-be: 0, which is 100%.
- In-scope items cut on staging: about 38 of 51, roughly 75%.
- Flows proven end to end: 12 of 57, about 21%.
- Items still open, S1–S11:

| Item | What is still open |
|---|---|
| S1 | /join writes to MOSO when the visitor is outside the canary |
| S2 | HIGH bug: /join loses the lead when Recruit intake fails |
| S3 | Webinar form and webinar list still use MOSO |
| S4 | Portal opened without a link still calls getAdmins |
| S5 | Recruiter info comes through moso-aid←MOSO |
| S6 | Landing stats and the webinar_link token |
| S7 | Ambassador roster is a 09/11 snapshot; applications import |
| S8 | Frozen data: bonus on packs numbers (323), legacy keys (7,630) |
| S9 | 4 MOSO-only features have no replacement |
| S10 | 4 INVITE write-backs stuck since 04/11 |
| S11 | recruit-be runs in MOSO's GCP projects |

**WAITING FOR BAO** (do not start before he answers):
1. /join on staging: send every visitor straight to Recruit with no MOSO write, continue on the Recruit ?invite= portal, and fix the S2 lead-loss bug. My recommendation is to do it.
2. The 4 MOSO-only features. My recommendation: drop owner sync and the MOSO push ingest, and ask the team about CS tickets→Hot leads and cold import.

**Other open items:**
- Recheck why an admin override credit does not show in the referrer's My referrals. This was a PARTIAL result.
- Draft a message to Khải, terminal only. It covers three things: how far Stripe is for the LO fee, staging Postgres md5 unsupported, and staging Postgres restarting twice on 11/11 (15:12 and 22:40 VN).
- Write the final report and a before/after artifact with the corrected numbers above.
- Clean up test data the agents could not undo: MOSO staging records for /join leads A/D/E, HR associate "DepsC Depscmanual", and Sierra's snapshot in moso-aid Mongo.

**How to resume:** `claude --resume 460363a7-f761-459c-8a6f-1df51d1e90fb`, or read this section.

---

## PAUSE 12/11 ~15:45 VN (session 460363a7): Bao is shutting the machine down again

### Bao's decisions on 12/11
- **/join and EVERY funnel form submit goes to Recruit ONLY on staging.** Only the SUBMIT path counts; where a page loads its display data from is NOT our concern. No redirects.
- **Dropped:** MOSO owner sync and the MOSO push ingest.
- **Deferred:** CS tickets → Hot leads, and the email-to-lead intake (Rocket / recruiting@). Bead agentflow-pzdm0.
- **LO fee in prod keeps using MOSO** until Stripe is ready. No message to Khải or Ben for now.
- **Import leads:** build it (done).
- **Referrer re-point on an already-decided lead:** the credit moves to the new person; locked if the bonus is already paid or approved.
- **Add lead with a duplicate NMLS:** show a warning, open the existing lead, allow "Create anyway".
- **Assistant:** give the MANAGER role the read tools (staging flag).
- **Flow 15:** turn BOTH auto-assign and idle release on during the test window; it's staging.
- **Purge PII on staging:** yes.
- **Rule (memory + ~/.claude/rules/common/verify-before-asking.md):** verify permissions and existing state, and look for a LEGITIMATE path (company rules, no tricks), before asking anyone.

### On staging now (all verified)
| Area | PRs |
|---|---|
| Funnel forms Recruit-only | recruit-be #1030 #1044; lf-homepage #2751 #2757 #2758 #2759 #2760; lo-homepage #961 #964-#968 |
| Portal fixes | lf-homepage #2754 (NMLS access), #2756 (waived fee) |
| Referrals / genesis | #1027 #1028 #1029 |
| Import leads | be #1037, fe #802 |
| Ambassador apps without MOSO | moso-aid #239, be #1036 |
| Applications import tick | be #1045 |
| Stuck invites cancelled | be #1035 #1042 |
| PII clean-up | moso-aid #238 #240, lf-homepage #2755 |
| Assistant names the OB | be #1039 |
| packs-import 409 + seen 204 | be #1046 |

### Staging secrets and roles I set (documented process, Bao's own permissions)
- SEQUENCE_INTERNAL_API_KEY and RECRUIT_PROGRAM_APPLICATION_IMPORT_INTERNAL_API_KEY: in Secret Manager (lenderrate-master) and merge-patched into recruit-svc-secret. Not in secret-keys.txt: the deploy SA lacks accessor.
- Account IAM:
  - Bao got Recruit "Onboarding Specialist".
  - LEAD_IMPORT added to RECRUITER, MANAGER and ADMIN. Notes and undo: ~/.cache/claude-recruit/audit-1111/fix/shots/lead-import-iam-grant.txt
  - ⚠️ bao.trinh+role-officer is TEMPORARILY MANAGER-only; it was RECRUITER. Restore it after the assistant-manager proof.

### Still open
- **PRs waiting on CI / merge / promote / proof:**
  - be #1040 + fe #803 (duplicate-NMLS warning)
  - be #1041 (referrer re-point)
  - be #1048 (assistant for Manager)
- **#1045:** prove that a fresh Ambassador application arrives via the natural tick.
- **#1046:** measure the "after" calls.
- **Import leads:**
  - recheck as the Recruiter test account;
  - test with a real .xlsx;
  - small UI fixes: truncation, horizontal scroll, times shown in UTC;
  - remove the "Rocket test" label.
- **E2E run** (~/.cache/claude-recruit/e2e-1211/RESULTS.md): 44 PASS, 1 FAIL (#46, fixed by #1046, re-test), 9 BLOCKED (with reasons), and these timed checks still pending:
  - 22a, scheduled Send info (Etoe Hotlead): due after 16:20Z;
  - 15, auto-assign + idle release BOTH ON for 30 min in office hours (16:00–01:00Z), then OFF; save the before-lists;
  - 26, webinar 1-day reminder (E2E Webinar), around 21:05Z on 12/11;
  - the armed jobs were killed at pause, so re-arm them on resume.
- **Open e2e test leads to archive at the end:** E2E Webinar, Etoe Hotlead, Etoe Meet, plus the rest listed in RESULTS.md.
- **Final report and before/after artifact for Bao.**

### How to resume
`claude --resume 460363a7-f761-459c-8a6f-1df51d1e90fb`, then re-spawn agents from this list. The agents' briefs follow COMMON-RULES at ~/.cache/claude-recruit/audit-1111/fix/COMMON-RULES.md.
