# Recruit coordinator session — HANDOFF (PAUSED 02/10/2026 ~18:40 +07)

Read this first when Bao resumes this session. Detailed timeline: `LOG-2026-10-02.md` (same folder).

## Role of this session
- Started as **Q&A only** on the recruit app (no implementing). It turned into the **coordinator**: Bao relays
  decisions here, this session dispatches implementation to peer sessions and verifies their results.
- Session names change on every restart. Find a peer's current name with ListAgents, or by mapping its
  transcript id via `~/.claude/sessions/<pid>.json` (`sessionId` → `name`).
  - Implementer (was agentflow-26, then **agentflow-35**): transcript `25db5702-f496-4c75-bb2d-c7a1668b8e0f`.
    State file: `.worktrees/_designs/NIGHT-PLAN-2026-10-02.md` (latest "PAUSED …" section at the bottom).
  - zq861 orchestrator (was agentflow-6b, then **agentflow-93**): transcript `ac40b799-b5c3-4aef-96fe-d561762d5380`.
    State file: `docs/handoff/zq861/HANDOFF.md` ("STATUS 02/10 ~18:30").
  - This coordinator (was agentflow-c9, then **agentflow-eb**): transcript `da8b791d-588f-4f2a-8e5e-b0bb7d09903d`.
- File split agreed: implementer owns Today/onboarding (TodayClient, OnboardingTodayReader, OnboardingSection,
  reminders, Google). zq861 owns followers + Headhunter. Ping each other before touching shared points
  (ApproverTodayReader, ActivityServiceImpl, bells, nav, omni cast). D/V numbers: take the next free at merge time.

## Rules Bao set (still in force)
- Staging only, never production (no prod deploy/config/datastore). Merge master + promote staging after 2 reviewers.
- Other teams' repos (packs, lf-homepage, omni, moso-aid): PR + Repo Owner agent review (packs merge under rule B3).
- Google: build behind a flag OFF; never request/change Google permissions ourselves.
- ram-gate before Chrome/builds/tests. Inkless staging = PROD account (billable): never trigger real envelopes.

## Done and verified on staging (02/10)
- e3g3a.1 timezone (be #528, fe #341): VN 07:00 → 00:00Z; NEUTRAL has no time field (clicked through).
- wvggz "1-1 today" pill (fe #332), viid9 role stat row (fe #336), emfg5 copy (fe #337), fe #338 test clock pin.
- 0vfb3 W-2/1099 protection: packs #3602 + lf-homepage #2596.
- 3dci6 LO 1-1 reminders: packs #3603 + be #526. Live SEND on staging to allowlist `bao.trinh+a3009f` only:
  email DELIVERED to the inbox (5:20 PM VN). Negative control (a3009m) refused RECIPIENT_NOT_ALLOWED.
- f5ycp groundwork be #521. omni #484 (otel vuln GO-2026-6505 fix) + omni #483 (Meet-in-omni, flag OFF) on omni staging.
- packs staging: SWAT Rerun "install packs/loan" deployed IN PLACE into version `a` (no traffic switch needed);
  proof = `POST www.viet18.com/api/recruit/v1/candidate/meetingReminder` → 401 (route exists) vs made-up path 404.

## Open / next
1. 3dci6 copy follow-up PR (call length as its own sentence; paragraphs; Meet link on its own line), then close 3dci6.
2. f5ycp Google connect (any recruit role, not only OB): reuse the account app OAuth client.
   - Staging client `233682574497-43u7pebmves4675fsqng0i5kfgroeetv` (lenderrate-master). Khai added redirect
     `https://recruit.viet18.com/integrations/google/callback` and CONFIRMED sharing the secret.
   - Secret copied (staging): moso-kube, ns recruit-be, `recruit-svc-secret` key `GOOGLE_OAUTH_CLIENT_SECRET`
     (copy of auth-svc-secret GOOGLE_CLIENT_SECRET; if auth-service rotates it, recruit must be updated).
   - Bao still owes Khai the answer to "Em set nó ở đâu" (text drafted in chat: the location above).
   - To build: D193 update (reuse + any-role) → BE connect-url/connect/status/disconnect → FE Settings → Connections.
   - Still needed from Khai later: meetings.space.* scopes on the consent screen, Pub/Sub topic + publisher for
     meet-api-event-push@system.gserviceaccount.com, prod client `444859640964-np1c…` (lender-rate) redirect + secret.
3. 7mwf0 Option C (flag OFF): uncommitted worktrees recruit-be-optc / packs-optc. Inspect `git diff` before reuse
   (negative controls were mid-run). Post-1-1 email DRAFT is waiting for Bao's approval
   (`.worktrees/_designs/7mwf0-post-1on1-email-draft.md`); recommended: $100 from settings, no Vietnamese version.
   D200 collides with zq861's /join fee fix (V205/D200): whoever merges second renumbers.
4. bjmk0 recruit-side feed waits on f5ycp (Meet attendance needs the Google connect + Pub/Sub).
5. Not started / deferred: m08j8 Nurture nurturing (DO NOT implement until Bao says), 78fkg packs security (deferred
   by Bao), production promotion of anything.

## Khai's Google secret setup (Slack 02/10 17:52) — TODO on resume
- Client ID 233682574497-43u7pebmves4675fsqng0i5kfgroeetv.apps.googleusercontent.com; redirect
  https://recruit.viet18.com/integrations/google/callback.
- Secret: k8s `recruit-svc-secret` (ns recruit-be), key `GOOGLE_OAUTH_CLIENT_SECRET`.
- SOURCE OF TRUTH (Khai created it): Secret Manager `lenderrate-master / recruit-be-google-oauth-client-secret`.
- Khai asks: ADD this mapping to recruit-be BOOTSTRAP.md so a cluster rebuild keeps it. Also verify the GSM value's
  sha256 matches the k8s key (never print it), and fix the f5ycp bead/INTEGRATIONS note: the source is now this GSM
  secret, not "a copy of auth-svc-secret".

## Implementer state at pause (agentflow-35 report, 02/10 evening; full detail in NIGHT-PLAN "PAUSED 02/10 evening")
- 3dci6 copy follow-up NOT started. Root cause of the one-line body: packs renders the plain-text body as HTML.
- Option C recruit-be: committed locally, unreviewed, needs D/V renumber after zq861's /join fee fix.
- Option C packs: 6 uncommitted files, MAY contain a negative-control mutation — inspect `git diff` first.
- f5ycp: FE PR #342 open, unreviewed (auto-merge off); BE 7 uncommitted files, no PR yet.
- Option C email finding: reuse MOSO's existing `pre_onboarding_done` template (≈ same copy, sent from MOSO by the
  specialist) instead of a new one; lf-homepage deep link needs a small fix (alerts and skips steps when the profile
  is empty). NOT decided by Bao, not built.

## Staging test data left behind
- Candidates e8acecc6 (2 CALL_NEXT), ff1ae945 (NURTURE), 73fd9c9c / 4e5a413d (reminder test 1-1 slots).
- 3dci6 staging settings: delivery_mode=SEND, allowed_emails=["bao.trinh+a3009f@loanfactory.com"].
- zq861: bao.trinh+hh@ HEADHUNTER, headhunter.auto_own_enabled=true (staging).

## How to resume
1. ListAgents → find the implementer and the zq861 orchestrator (names will have changed).
2. Read the two state files above, then tell both sessions "RESUME (Bao)", and re-arm a ~28 min heartbeat Monitor.
3. Report to Bao in Vietnamese; ask him in Vietnamese (AskUserQuestion too).

## STATE 05/10 ~07:50 (PAUSED: Bao shutting down the machine)
Session names after the next restart WILL change. Map transcript id -> name via ~/.claude/sessions/*.json:
- implementer transcript 25db5702… (was 26 → 35 → agentflow-29); its state file: .worktrees/_designs/NIGHT-PLAN-2026-10-02.md,
  last section "PAUSED 05/10 morning (machine shutdown)".
- zq861 transcript ac40b799… (was 6b → 93 → agentflow-cd); state: docs/handoff/zq861/HANDOFF.md ("PAUSED 05/10 morning").
- this coordinator transcript da8b791d… (was c9 → eb → agentflow-77).
DONE on staging since 04/10 night: zq861 Headhunter COMPLETE (cd: be #550, fe #361 + earlier; E2E PASS);
be #551 reminder copy (V212); lfh #2609 Option C deep link; be #552 (V213/D206) + fe #342 + be #553 + fe #362 = Connect Google
LIVE on staging, flag ON, verified by Bao himself (connect + disconnect as bao.trinh@; date fix + friendly copy shipped).
Staging state added: bao.trinh@loanfactory.com has RECRUITER (RBAC API, staging only); secrets RECRUIT_GOOGLE_TOKEN_KEYRING,
RECRUIT_GOOGLE_OAUTH_STATE_KEY; Disconnect = forget our token only (no Google revoke, shared client with HR).
IN PROGRESS (flag OFF): f5ycp create Calendar event + Meet via calendar.events; Option C recruit-be (committed locally, unreviewed)
+ packs (WIP); then bjmk0 recruit-side feed (needs Khai's Meet scopes + Pub/Sub).
WAITING ON BAO: prod release decision (prep doc .worktrees/_designs/recruit-prod-release-prep-2026-10-04.md: BE first then FE,
accept behaviour changes, who runs the omni 0.4.15 walk/updates issue #322). Nurture m08j8 still DO NOT implement.
WAITING ON KHAI: GSM recruit-be-google-oauth-client-secret fingerprint vs k8s (or secretAccessor); meetings.space.* scopes +
Pub/Sub topic for meet-api-event-push@system.gserviceaccount.com; prod client redirect + secret later.
RESUME: (1) ListAgents + sessions json to get names; (2) read the two state files; (3) send RESUME to both; (4) re-arm a
heartbeat (Bash run_in_background sleep 900; Monitor sleeps kept expiring early); (5) report to Bao in Vietnamese.
- Both peers PERSISTED (05/10 ~08:00). Implementer WIP commits (local only, NOT pushed): recruit-be-gevents 4e9ddf0c
  (create event + Meet), packs-optc 8a926846825 (⚠️ may still hold a negative-control mutation at RecruitAPI ~:1622),
  recruit-be-optc 42f1fe3e (needs D/R renumber). On resume first check the cd-staging run for recruit-be 3d9cdec3
  (be #553 promote) succeeded.
- zq861 open decisions for Bao: docs/handoff/zq861/bao-decisions-0210-night.md (program_sync APPLY, production gates).

## Names as of 05/10 ~08:40
coordinator = agentflow-0f (da8b791d) · implementer = agentflow-9d (25db5702) · zq861 = agentflow-2e (ac40b799, DONE on staging)

## STATE 05/10 evening (PAUSED: Bao going home)
Names then: coordinator agentflow-0f (da8b791d) · implementer agentflow-9d (25db5702) · zq861 agentflow-2e (ac40b799, DONE on staging).
Implementer state file: .worktrees/_designs/NIGHT-PLAN-2026-10-02.md section "PAUSED 05/10 evening".
DONE + verified on staging today (by Bao himself):
- Calendar event + Meet via API (be #555) and in-place booking/reschedule (be #556, fe #369; be #557 durable flag): event created,
  moved on reschedule (no duplicate), LO got "Updated invitation", Join Meet works. Calendar events ON on staging.
- Option C recruit half be #554 + packs #3615 merged; packs v3.64.0 prod release (Khai) INCLUDES #3602/#3603/#3615 (dormant
  except #3602 W-2 guard, which is live on prod). Option C flag stays OFF until P1 beads agentflow-90vkj + agentflow-gglqk land.
- qsg2z "less text" epic (agentflow-15's priority): fe #363/#364/#365 on staging. fe #371 merged.
- GSM recruit-be-google-oauth-client-secret v2 = k8s value (bao has versions.add only). No more asks to Khai on it.
Approved by Bao, NOT built yet (WIP local commits, not pushed):
- packs-regen e94c18c8ba0 (90vkj/gglqk fix; was mid negative-control: check diff) → PR → Repo Owner → SWAT → then Option C flag ON on staging.
- recruit-be-colleagues c9350293: guest picker (LO auto read-only; "Add colleagues", owner recruiter pre-suggested; internal
  bypass allowlist) → FE → then B: Call result "Meet 1-1" via Calendar API when connected (fallback B+ + connect nudge).
  OutcomeModal/messages: message agentflow-15 before merging (qsg2z rule).
- recruit-be-attend 15d59187: attendance poll after slot+15m on cron tick (NO Pub/Sub), incremental meetings.space.readonly
  scope (ask Khai only if Google refuses), PROPOSE Done / probable no-show.
- Bugs reported by Bao 05/10: guest copy says "Not added" though LO invited; reschedule modal still shows editable link +
  "Save and create event"; Today row shows UTC (8:00 AM) instead of viewer time for a 15:00 VN slot. (fe #371 may cover some:
  verify.)
WAITING ON BAO: prod release decision (prep doc), program_sync DRY_RUN → APPLY (2e asked to produce the would-grant/revoke
table; check if it arrived), m08j8 Nurture (DO NOT implement).
Packs staging: last Rerun state unknown after Khai's 3.65.0 chain — check `gcloud app versions list --project lenderrate-master
--service default` and that www.viet18.com POST /api/recruit/v1/candidate/meetingReminder → 401.

## SPEED MODE (Bao, 05/10 night; TEMPORARY, 5 days past deadline) — relayed by implementer (now agentflow-fb, was 9d)
Local: targeted unit tests only (ITs/full suites on CI only, still merge-blocking); 1 negative control per main fix;
2 reviewers per PR unchanged (+Repo Owner for non-recruit repos); defer side features (write them down, never drop);
every PR body lists what was skipped. Unchanged: ram-gate, staging only, push before claiming fixed, org push
discipline, flags OFF until verified. Revert to full flow when Bao says "quay lại flow cũ" / "full flow".
Source: memory feedback_speed_mode_vs_full_flow.md, `bd memories speed-mode`. Implementer name now: agentflow-fb.

## Names as of 05/10 21:45
coordinator = agentflow-b3 (da8b791d) · implementer = agentflow-fb (25db5702) · zq861 = agentflow-c1 (ac40b799, DONE)
Since evening: fe #374-#378 merged (#378 Colleagues picker), be #559 + #560 open; packs regen (90vkj/gglqk) PR not opened; packs staging still 10:45 deploy.

## 06/10: Option C hand-off is ON in STAGING (Bao "option B", via agentflow-a4 / recruit-be #561 fd3201ec); packs staging traffic = b (has #3615). Known risks accepted: 90vkj, gglqk (fix in progress by agentflow-fb packs-regen -> then SWAT install + traffic switch, fb drives, ping a4 first).

## CLOSED by Bao 06/10 00:40 — final state (coordinator agentflow-b3)
Implementer agentflow-fb (25db5702) continues ALONE and reports directly to Bao; its state file is NIGHT-PLAN-2026-10-02.md.
Verified at close: packs staging traffic b=1.0 (16:44 build with #3615), a=0.0 (10:45, old); www.viet18.com
POST /candidate/meetingReminder -> 401 (route live); recruit-fe last promote 007b84db success; Option C ON in staging (#561).
Done on staging: TZ fix, 1-1 pill, role stats, copy, W-2/1099, LO reminders (inbox-verified), Connect Google, Calendar
event+Meet, in-place booking/reschedule, Add colleagues (#560/#378), Bao's 3 UI bugs (fe #371), Option C hand-off.
Open: packs #3627 (90vkj/gglqk; staff exempt per option (a); PRIVATE_OPS legacy hardening REVERTED/deferred — needs Bao,
default leave alone) -> merge after 2 approvals + targeted suites -> SWAT install once -> switch traffic to new version
(ping agentflow-a4 first; rollback --splits b=1).
Deferred (speed mode): attendance poll (WIP), Call-result Meet 1-1 via API. Bao to live-test "Add colleagues".
Waiting on Bao: prod release (prep doc), program_sync APPLY (DRY_RUN table from zq861 session), Nurture m08j8, PRIVATE_OPS.
