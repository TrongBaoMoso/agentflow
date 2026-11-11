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
