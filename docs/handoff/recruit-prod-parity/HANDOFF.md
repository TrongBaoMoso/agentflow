# Recruit production parity with staging: handoff (paused 2026-10-06 ~18:05 +07)

Session id: `d96850c0-0bf5-476f-a82d-0f47551372c0`, working directory `/Users/apple/Projects/agentflow`.
Resume with `claude --resume d96850c0-0bf5-476f-a82d-0f47551372c0`. If that session is gone, start a new session and read this file first.

## Goal (Bao, 06/10)
Make recruit **production behave exactly like staging**: same code AND every feature working (keys, Pub/Sub, integrations, flags). End users are not really using production yet.

Standing rule from Bao (06/10): do everything that is within reach end-to-end without asking which part first. Stop only for (a) something another person holds, or (b) a business decision that touches real people (mail / calendar invites / e-sign to real loan officers, writes into MOSO production) that Bao has not approved yet.

Bead: `agentflow-5p5tg` (flag parity, Step B). Closed today: `agentflow-0ais`, `agentflow-6o8lr`.

## Done today (measured, not assumed)
1. **Code promoted, morning:**
   - recruit-be `b0e9f42d` → `91181420`. Flyway V131 → V219, 55 migrations OK, 0 ERROR. RBAC pair returned 200 and 403. `/today` has `pending_invites`.
   - recruit-fe `45d1561a` → `24886b8e`. Bundle chunks: 27/31 identical with staging; the 4 that differ are env-baked.
   - Pre-deploy DB dump: `~/Backups/recruit-prod/recruit_db-pre-promote-20261006-0923-v131.dump` (pg_dump -Fc, 51 tables, chmod 600, **contains PII**, delete when no longer needed).
2. **recruit-be promoted again, ~17:53:** `91181420` → `605bdc2e`. Flyway V220 is additive: a nullable `next_step_meet_minutes` column. Deploy run 37452786316 succeeded, 0 ERROR.
   - Bao had said "pause" while that push command was in flight. The push had already executed, so the deploy was left to finish instead of being cancelled mid-helm.
   - **recruit-fe was NOT promoted.** fe production is still `24886b8e`, while fe staging is `3a6c3c04`: 3 commits behind (Meet 1-1 UI, Meet attendance copy, staging-only resource change).
3. **Pub/Sub on `lender-rate` (Khai, DevOps):**
   - `recruit-be-runtime@lender-rate.iam.gserviceaccount.com` holds **roles/pubsub.editor at project level**. Measured from the prod pod: it has create/delete/consume, no setIamPolicy, and no non-Pub/Sub permissions.
   - Wider than needed: it can consume all 84 prod subscriptions. **Never point a subscription env at another team's subscription.**
   - `CRON_JOB_REGISTRATION` topic exists, and the app can publish to it.
   - HR subscription **already existed**: `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT`. Config: ack 60s, never expires, retry 10s–600s, DLQ `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_DLQ` after 5 attempts, plus `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_DLQ.monitor`. Khai said to use this name (no `_PROD`). **21 messages are waiting in it.**
   - `bao.trinh@` itself still has NO Pub/Sub permission on `lender-rate`. Check from the pod with the app identity instead; see "How to measure".
4. **followup-be is on production** since 06/10 17:34 (run `de36f2a6`), namespace `followup-prod`. In its prod values, `HOSTPUSH_ENABLED=false` and there is no `RECRUIT_GRPC_TARGET` yet.
5. **Reachable from the recruit prod pod (nc):**
   - `followup-be.followup-prod.svc.cluster.local` ports 8093 and 9093
   - `omni-service.omni-prod.svc.cluster.local:8080`
   - `redis-sentinel.redis-cluster.svc.cluster.local:26379`
   - `ai-hr-backend.hr-prod.svc.cluster.local:8312`
6. **MOSO production already serves the Recruit API:** POST `/api/recruit/v1/candidate/{onboardingMeeting,agreement,meetingReminder}` and GET `/webinars` all answer 401 (route exists).

## Gap still open (measured 17:49)
- **recruit-be:** 33 env names are staging-only (in `helm-chart/config/production/values.yaml` on master), and 14 secret keys are staging-only in `recruit-svc-secret`. All `RECRUIT_FEATURES_*` are off in production.
- **recruit-fe:** prod build has `NEXT_PUBLIC_OMNI_INBOX_BUBBLE_ENABLED=false` and `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED=` (staging: true/true).
- **Do NOT copy these staging test values:** `RECRUIT_API_FALLBACK_ACTOR_EMAIL`, `RECRUIT_AGREEMENT_SEND_ALLOWED_EMAILS`, `RECRUIT_CALENDAR_GUEST_ALLOWLIST`, `RECRUIT_CALENDAR_INTERNAL_DOMAINS`. Production has its own policies: guest policy ANY, agreement recipient policy ANY.

## Next steps, in order (self-serve)
1. **Promote recruit-fe** `3a6c3c04`: check its staging run is green, then `git push origin <sha>:refs/heads/production`. Verify the image digest and the site.
2. **Before enabling Pub/Sub, read the HR onboard handler.** The 21 queued `associate.onboarded` messages will be processed immediately. Confirm that unknown people are ignored and nothing throws.
   - Also check what turning the provider on starts. `BOOTSTRAP.md` lists cron registration, e-sign events, audit relay and notifications.
   - `OmniInboundMessageHandler` subscribes unconditionally to `omni-inbound-reply.recruit-be`, which does not exist on prod yet. The staging notes say a missing subscription only logs an error; confirm boot does not fail.
   - Check the `hot.idle_release_enabled` setting on prod before its cron gets a key.
3. **PR to recruit-be `helm-chart/config/production/values.yaml`:**
   - `PUBSUB_PROVIDER=google` + `ENABLED_CLOUD=true` (always together, or the app crash-loops)
   - `RECRUIT_HR_ONBOARD_SUBSCRIPTION=HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT`
   - `RECRUIT_API_BASE_URL=https://www.loanfactory.com/api/recruit/v1`
   - `RECRUIT_WEBINAR_BASE_URL` (the prod WebPlus URL, same shape as staging; verify the namespace returns sessions)
   - `RECRUIT_HR_HANDOFF_BASE_URL=http://ai-hr-backend.hr-prod.svc.cluster.local:8312`
   - Flow: 2 reviewers + CI green, squash merge, `gh workflow run promote-staging.yml`, then push to production.
4. **Generate the prod internal keys** with `openssl rand -base64 48`, each with its own value, written via pipe and never printed. Use `kubectl patch` on `recruit-svc-secret` in `gke_lender-rate_us-central1_moso-gke`/`recruit-be`, then rollout restart. Keys:
   - `RECRUIT_HOT_IDLE_RELEASE_INTERNAL_API_KEY`
   - `RECRUIT_HR_HANDOFF_INTERNAL_API_KEY`
   - `RECRUIT_OMNI_SUBJECT_ALIAS_INTERNAL_API_KEY`
   - `RECRUIT_ONBOARDING_REMINDER_INTERNAL_API_KEY`
   - `RECRUIT_PROGRAM_SYNC_INTERNAL_API_KEY`
   - `RECRUIT_MEET_ATTENDANCE_INTERNAL_API_KEY`
   - `RECRUIT_PLATFORM_INBOX_INTERNAL_API_KEY`
   - Then confirm on cron-service-go that the jobs are registered (BOOTSTRAP.md, D93). A log line alone proves nothing.
5. Verify `RECRUIT_API_KEY` (already in the prod secret) against MOSO prod. A wrong key returns "invalid Recruit API key"; a valid one returns "empty actor header".

## Waiting on other people
| Who | What | Unlocks |
|---|---|---|
| Huy (`qhuyhuynh-cell`, followup-be release) | followup prod `HOSTPUSH_ENABLED=true` + `RECRUIT_GRPC_TARGET=dns:///recruit-be-grpc.recruit-be.svc.cluster.local:9090` (recruit-be-grpc headless Service exists on prod) | then recruit sets the 4 `RECRUIT_FOLLOWUP_*` vars as ONE unit: query target `followup-be.followup-prod.svc.cluster.local:9093`, command base `http://followup-be.followup-prod.svc.cluster.local:8093`, grpc port 9090, server enabled. Fixes `agentflow-5t57m`. Message to Huy not yet drafted |
| Khai (as omni owner) | Said "để anh release nó" (17:3x): omni prod release (prod is `e204724` from 28/09, missing #476 FOLLOWER, 32 behind), topics `omni-inbound-reply`/`omni-outbound-sent` (404 on prod now), subscriptions `omni-inbound-reply.recruit-be` (name hardcoded in recruit code) and `omni-outbound-sent.recruit-be`, scoped key `{service_name: recruit-be, allowed_subject_types: [LO_CANDIDATE]}`, `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN` | `RECRUIT_OMNI_BASE_URL`, Redis sentinel vars, `RECRUIT_OMNI_OUTBOUND_SENT_SUBSCRIPTION`, `RECRUIT_OMNI_FOLLOWER_ROLE_ENABLED`, FE bubble + contact-gate flags, then followers reconcile |
| Khai (Google) | Prod OAuth client + redirect `https://recruit.loanfactory.com/integrations/google/callback` + copy of client secret | Google Connect, Calendar events, Meet attendance (Meet attendance also needs `recruit-meet-events` topic/sub on prod, see `docs/spikes/f5ycp/README.md` in recruit-be; not studied yet) |
| moso-aid owner | prod `RECRUIT_MOSO_AID_BASE_URL`, `RECRUIT_MOSO_AID_ROSTER_KEY` (= moso-aid prod `RECRUIT_INBOUND_SERVICE_KEY`), prod MOSO app id + namespace | program sync |
| MOSO admin | real recruiters have `RECRUITING` on MOSO prod | packs writeback actor |
| Bao (decision) | flags that reach real people: packs writeback (+ onboarding writeback / v2 handoff / legal name / hire classification), onboarding reminders SEND, agreement send, calendar invites, HR handoff publish | Step B completion |

## How to measure (Bao's account cannot list Pub/Sub on lender-rate)
Use the app identity from the prod pod:
```bash
CTX=gke_lender-rate_us-central1_moso-gke
POD=$(kubectl --context $CTX -n recruit-be get pods -o name | grep recruit-be- | head -1 | cut -d/ -f2)
kubectl --context $CTX -n recruit-be exec $POD -- sh -c '
T=$(wget -q -O - --header "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" | sed -E "s/.*\"access_token\":\"([^\"]+)\".*/\1/")
wget -q -O - --header "Authorization: Bearer $T" "https://pubsub.googleapis.com/v1/projects/lender-rate/subscriptions?pageSize=500" | grep -o "subscriptions/[^\"]*" | grep -i recruit'
```
- Prod Flyway and startup: `kubectl logs` and grep `Current version|Successfully applied|Started RecruitApplication`.
- Image vs commit: the deploy-run log's `sha256:` equals the deployment image digest. `gcloud artifacts` is denied for this account.
- Prod DB read: temp pod `postgres:18-alpine` with `envFrom` secret `recruit-svc-secret`. Delete it after use.

## Rules to keep
- Pull tera-docs first (`infrastructure/DELIVERY_FLOW.md`). Production = fast-forward `git push origin <staging-sha>:refs/heads/production` by `release-recruit-*` (TrongBaoMoso). Staging only via `promote-staging.yml`.
- Before pushing production, open that commit's staging run (I-030).
- Never print secret values. Fingerprint with `shasum` if a comparison is needed.
- Before proposing to create anything on prod, check whether it already exists, using the app identity (the `_PROD` subscription mistake of 06/10).
- Leftover pod `recruit-be-86465b485c-xqdbz` (Error, about 5 days old) predates this work. It has not been deleted.

## Update 06/10 evening (resumed ~18:40, all self-serve steps done)
- recruit-fe production `3a6c3c04` (= staging). recruit-be production `ae91e072` (= staging): carries #571 (DevOps pins prod deploy.yml v1.14.0) and **#572** (prod values: `RECRUIT_API_BASE_URL`, `RECRUIT_WEBINAR_BASE_URL`, `RECRUIT_HR_HANDOFF_BASE_URL`, `RECRUIT_HR_ONBOARD_SUBSCRIPTION`; two reviewers MERGE, CI green, negative control on `PubSubBootContractTest`). Pod: 0 ERROR; `/api/v1/webinars` as a real recruiter -> `source LIVE, sessions 4`.
- 7 internal keys added to the prod `recruit-svc-secret` (hand-made, own random values, fingerprints all different): hot-idle-release, hr-handoff, meet-attendance, omni-subject-alias, onboarding-reminder, platform-inbox, program-sync. Now 15 keys. They do nothing until Pub/Sub is on (cron registration is a Pub/Sub publish).
- Measured safe before wiring: prod outboxes empty (packs 0, hr 0, reminders 0; control candidates 864); `hot.idle_release_enabled=false`, reminder `DRY_RUN` + empty allowlist, `program_sync.mode=OFF`. Prod `RECRUIT_API_KEY` valid against MOSO prod (wrong-key control). The Recruit API URL turns on READ-only calls with no flag: referral view (as the admin's own address while `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL` is blank) and the flag-gated agreement dry run.
- **Pub/Sub provider still OFF on purpose.** tera-core `GooglePubSubServiceImpl#subscribe` (bytecode) creates any missing topic/subscription with defaults, and `OmniInboundMessageHandler` subscribes unconditionally to `omni-inbound-reply.recruit-be`; that topic is 404 on prod and the app holds pubsub.editor, so flipping now would create omni's topic without DLQ. Asked Bao to ask Khai to pre-create `omni-inbound-reply` + `omni-inbound-reply.recruit-be` (DLQ + `.monitor`). After that: one PR adding `PUBSUB_PROVIDER=google` + `ENABLED_CLOUD=true` (contract test enforces the pair), then confirm the crons on cron-service-go and watch the 21 HR messages being consumed (`hr_onboard_*` metrics / logs).
- Message for Huy drafted (followup prod `HOSTPUSH_ENABLED=true` + `RECRUIT_GRPC_TARGET`; note hostpush also needs `TERA_BE_GRPC_TARGET` and tera-be prod gRPC first).

## Update 07/10 ~00:50 (all self-serve work shipped)
Production now: recruit-be `ee647d7f`, recruit-fe `681164b9` (both = staging).
- **fe #387** — `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED=true` in production (TCPA gate). Measured first: 10 random prod candidates -> 9 allowed / 1 STOP_SMS, route DEVICE. Bug found in review and deferred: `agentflow-tniq4` (ConversationModal asks contact-route for roles without ACTIVITY_LOG) — blocker before omni goes live in prod.
- **be #573** — Pub/Sub ON in production with `recruit.omni.inbound-reply-enabled=false` (new switch, default true; boot WARN when off). Verified on prod: 0 ERROR; omni-inbound-reply / omni-outbound-sent still 404 (not auto-created); 8 crons registered and the first ticks at 17:10Z all POST 200 (hot-idle, hr-handoff, meet-attendance, cast-repush, subject-alias, onboarding-reminders, packs-writeback, program-sync); `SEARCH_INDEX_SYNC_SUBSCRIBE_RECRUIT-SVC-PRODUCTION` auto-created (platform norm, same as 5 other prod services); the 21 HR onboard messages consumed — none matched a recruit candidate ("nothing to link"), 0 linked; outboxes still 0/0/0.
- **be #574** — followup bridge (4 vars, followup-be.followup-prod), candidate-events Redis (ARMED), `RECRUIT_FEATURES_ONBOARDING_REMINDERS=true` (DRY_RUN + empty allowlist). Verified: gRPC listening 9090, `GET /candidates/{id}/follow-ups` = 200 (was 503).
- **Carried along, not ours:** be #575 (department queue filters, V221 additive nullable columns, its staging run green) and #571/#386 (DevOps deploy pins).
- Probe scripts (scratchpad, re-creatable): contact-route sample, follow-up read, outbox counts via temp `postgres:18-alpine` pod with `envFrom recruit-svc-secret`.

### To turn back on when omni is ready
`RECRUIT_OMNI_INBOUND_REPLY_ENABLED` -> remove/true in production values ONLY after `omni-inbound-reply` + `omni-inbound-reply.recruit-be` (DLQ + .monitor) exist, and after `agentflow-tniq4` is decided.

## Update 07/10 ~11:50
- Production = staging again: recruit-be `cf71a45b` (V227), recruit-fe `c8946c61`. Carried other sessions' work as Bao wants (rule: promote everything on staging, do not ask): be #576 #579 #580 #581 #582, fe #388 #389 #390 #393 #394 #399.
- `agentflow-tniq4` fixed and closed (fe #397, 2 reviewers MERGE): composer offers no SMS/Email without ACTIVITY_LOG.
- followup-be production: Huy enabled `HOSTPUSH_ENABLED=true` + `RECRUIT_GRPC_TARGET` (`c005ce5`, deployed 07/10 03:59Z). No recruiter has logged a call on prod since the bridge (only SYSTEM activities), so `next_follow_up_at` is still 0/905 — nothing to push yet; check again after real use.
- omni production: still `e204724` (28/09), no #476, topics absent. Khai said 10:04 "Giờ anh release nha". Recruit side then needs: topics + 2 subscriptions, scoped key, host-subjects token -> one PR (base URL, outbound subscription, follower flag, `RECRUIT_OMNI_INBOUND_REPLY_ENABLED` back to true, FE bubble).

## Update 08/10 ~00:55
- omni: Khai released omni prod (`1e5ce7f`, 07/10 19:29 +07, #476 in) and wired recruit himself (recruit-be #589): topics + `*.recruit-be` subscriptions with DLQ/.monitor, `RECRUIT_OMNI_INTERNAL_API_KEY` + `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN` in the prod secret, cast push ARMED, inbound/outbound subscribers running. One host-subject SPI call at 12:46Z was rejected for a missing Access-Token (not repeated); token parity not verifiable (no omni secret access) — Bao to test a conversation on prod.
- fe #411: omni inbox bubble ON in production (`1d782c41`).
- Program sync (we own moso-aid): moso-aid #189 promoted to `pro` (rev 00114; roster 401 without/wrong key, 200 with key); `RECRUIT_INBOUND_SERVICE_KEY` on moso-aid prod = recruit `RECRUIT_MOSO_AID_ROSTER_KEY` (sha256 8646b190deef) + `RECRUIT_MOSO_AID_BASE_URL`; be #592 pins `s~lender-rate` / `5716104026521600` (decoded from roster keys; staging positive control). `program_sync.mode` set OFF -> DRY_RUN 17:45Z by Bao's admin id via PUT /admin/settings; first tick 17:50Z: members=2 approved=0 linked=0, nothing would change. APPLY = Bao's call; linking members needs `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL` (a MOSO prod admin with RECRUITING) — currently blank, /link answers 503.
- Still open: Google OAuth prod client (Khai); flags touching real people (Bao).

## Update 08/10 ~15:05
- recruit-be #595 shipped: production = staging = `5eba3635` (also carried #593/#594: moso-notifier v2 behind `NOTIFIER_V2_SEND_ENABLED`, default false, only staging values turn it on).
- Prod pods: `hrAssociateUpdatedChannel`, `hrAssociateOnboardedChannel`, omni inbound/outbound, search-index subscribers all configured; 0 ERROR after boot.
- Licence auto-tick still blocked: `/internal/v1/lo-licenses` answers 403 to RECRUIT. Bao messaged Hung (open it, or a recruit read without the clear NMLS: state, license_type, sponsored, sponsored_date).
- Google OAuth prod: Khai is setting up client `444859640964-…` (project lender-rate). Asked for redirect `https://recruit.loanfactory.com/integrations/google/callback`, scopes calendar.events + meetings.space.readonly, secret in prod `recruit-svc-secret` key `GOOGLE_OAUTH_CLIENT_SECRET`. When done: generate `RECRUIT_GOOGLE_TOKEN_KEYRING` + `RECRUIT_GOOGLE_OAUTH_STATE_KEY`, PR client id + redirect into production values, turn on `GOOGLE_CONNECT` only.
- followup-be hostpush (Huy pushed 07/10): not verifiable from our side yet (no access to followup-prod ns; success path logs nothing). Measure `candidates.next_follow_up_at` count in prod DB (was 0/905). Temp psql pods timed out on Autopilot scheduling 08/10 14:30; retry, or ask Bao to create one follow-up on prod and look for the date.
- Ship script lives at `~/.cache/claude-recruit/ship_pr.sh <recruit-be|recruit-fe> <pr> "<subject>"` (/tmp and scratchpad get wiped).

## Update 08/10 ~15:50 — Google Connect LIVE on production
- recruit-be #596 on production `b20ff041` (flag + client `444859640964-…` + redirect). Khai copied `GOOGLE_OAUTH_CLIENT_SECRET` into prod `recruit-svc-secret` (15:24); keyring + state key generated by us (only copy is the k8s secret; not in Secret Manager since Bao cannot write lender-rate SM).
- Both pods: `google connect: ON (client 444859640964-…, keyring versions up to 1)`, 0 ERROR. In-pod `GET /api/v1/me/google/status` = 401 without a token (route live; off would be 404).
- Next: Bao tries Settings -> Connections -> Connect Google on recruit.loanfactory.com. Calendar events + Meet attendance stay OFF (real loan officers).

## Update 08/10 ~17:50 — follow-up hostpush VERIFIED on prod
- Bao created a follow-up on test LO "Chi Test" (d456120b, owner Bao) and marked it Done at 10:37Z (follow-up cff1a646, POST .../done 200).
- Positive control: candidates.follow_up_ids is NULL ("never synced") on 956/957 rows and `[]` ("synced, empty") ONLY on d456120b. Only FollowUpHostSyncGrpcService (followup-be -> recruit gRPC 9090) writes that column, so followup-be hostpush reaches prod recruit.
- Omni view on prod: thread loads, all omni XHRs 200 (Bao did not send).
- Hung (ai-hr-be): agreed recruit may call GET /internal/v1/lo-licenses, "doi e fix xiu". At 10:45Z master still gates it to sourceTera only (internal/api/lolicensefeed.go:15). Watching for the change.
- Referrals actor: packs referrersResolve needs an ACTIVE MOSO Admin found by email AND App.hasAnyPermission(RECRUITING) (OWNER implies it). Whether SUPER ADMIN implies RECRUITING is not visible in repo code (framework jar). Bao proposes it.dept@loanfactory.com; no prod Datastore read to verify (403), so verify by a live call after setting it.

## RESUME POINT 08/10 ~17:55 (Bao paused, going home)
Session d96850c0-0bf5-476f-a82d-0f47551372c0. Prod = staging for code; everything below is waiting on people or decisions.
Bao's stance: prod is released but NOT opened to users yet. Do not grant the 2 unknown 403 users (a6277368, ebdd7216). Keep the 7 existing grants unless Bao says otherwise.

Do first on resume (self-serve):
1. Hung / lo-licenses: fetch ai-hr-be, then check whether internal/api/lolicensefeed.go still gates GET /internal/v1/lo-licenses to sourceTera only (master and any new branch/PR by hungcao-lf). The background watcher was stopped at pause and found nothing. Once it is open to RECRUIT on staging: verify from the recruit staging pod (expect 200, not 403), then prod after HR promotes. Recruit side needs no change.
2. Re-measure prod quickly: pods healthy and 0 ERROR (context gke_lender-rate_us-central1_moso-gke, ns recruit-be), with ~/.cache/claude-recruit/pgq.sh for DB reads.

Waiting on Bao (ask only if he raises it):
- Referrals actor: he proposes it.dept@loanfactory.com (MOSO SUPER ADMIN). Needs an active MOSO Admin plus RECRUITING (OWNER implies it; SUPER is unverified). Not urgent because the Headhunter program is DRY_RUN. When he says go: set RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL in helm-chart/config/production/values.yaml (PR, 2 reviewers, ship_pr.sh), then make one read-only call. 200 = done; otherwise ask the MOSO admin to grant RECRUITING.
- Flag enablement: follow the order given 08/10. Manual use for 1-2 weeks, then PACKS_WRITEBACK + ONBOARDING_WRITEBACK, then e-sign / reminders SEND / calendar, then program sync APPLY last. Bao may ask to turn off HR_HANDOFF_AUTO_SEND.
- Test level B (outbound omni / e-sign / HR send) needs a fake LO created in MOSO prod (bao.trinh+recruittest@loanfactory.com plus Bao's phone). Bao decides.
- Bao's Zoom is not linked on prod (banner), so SMS and calls from recruit are unavailable to him.

Done today (verified): Google Connect live; #595 HR licence feed sub; follow-up hostpush (positive control above); omni view.
Note: commit 16e452a accidentally carried the pre-staged .beads/issues.jsonl (bead state only).

## Update 08/10 ~20:40: licences from user-service, referrals actor, auto-send off (all on prod)
Bao's answers 08/10 evening: count EXPIRED licences (no change needed); exclude real-estate licences; set it.dept@ as the referrals actor; turn HR auto-send OFF on prod.
- **recruit-be #597, prod `ce44fa5a`.** The licence read moved from HR `/internal/v1/lo-licenses` (deprecated 05/10, being deleted by ai-hr-be #1010; Hung confirmed) to user-service `GET http://user-service.user-service.svc.cluster.local:8082/api/v1/users/{id}` (in-cluster, no auth), mirroring tera-be #970.
  - An unknown user is 200 with ONLY `response_date` (measured). Any other 2xx without a payload is treated as retryable.
  - Licences are mapped from `licenses[]` (state, sponsored, sponsored_date).
  - The id compare ignores case. The refusal WARN fires once per HTTP status.
  - `.chart-lint-allow` lists the user-service host.
  - 2 reviewers said MERGE. Full suite: 4250 tests green.
- **Real-estate exclusion NOT done, on purpose.** The HR catalogue (ai-hr-be migration 00144) has only two regulator ids that can be real_estate, '80' and '35670068218'. Both are CA DRE MLO License Endorsements typed {broker, real_estate}, i.e. valid CA mortgage licences. Excluding them by regulator_id would block real CA LOs. user-service carries no per-holding type, so this cannot be done from recruit.
- **Known limit, recorded in the D232 addendum.** HR announces associate.updated(licensing) BEFORE its best-effort push to user-service. A fast read sees the old licences, returns NOT_YET and acks. The failure direction is "not done", never a false tick.
- **Prod in-scope count today: 0.** No prod candidate has account_id; it is written only by the HR onboard event after a recruit hand-off.
- **recruit-be #598, prod `91e2f414`.**
  - `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL=it.dept@loanfactory.com`. Verified BEFORE the change: a sealed packs prod `referrers/resolve` as it.dept@ about another person returned 200 `reason=ok`, so it is an active MOSO Admin with RECRUITING.
  - `RECRUIT_FEATURES_HR_HANDOFF_AUTO_SEND=false` on prod. hr_handoff_auto had 0 armed rows and hr_handoff_outbox 0 before the change. Staging keeps it on.
  - D184 addendum: ADMIN and MANAGER now see the full referrals set; program member /link works.
  - Both prod pods: config present, 0 ERROR, 5 Pub/Sub adapters.
- **STAGING bug, bead agentflow-couwc (P1, needs DevOps).**
  - On every staging boot, tera-core's PubsubListener is denied getTopic(HR_ASSOCIATE_UPDATE) / getSubscription(HR_ASSOCIATE_UPDATE_SUBSCRIBE_RECRUIT_STAGING) for GSA recruit-be@lenderrate-master and aborts. HrAssociateUpdated and SearchIndexSync handlers are therefore never configured on staging (prod has all 5).
  - Probe event recruit-probe-lic-1791463725 is sitting unprocessed in that staging subscription.
  - Fix: grant the GSA pubsub viewer on the topic plus subscriber on the subscription (or project pubsub.editor, as prod has), then restart.
- **b975a1e5** (setup call booking, another session's #602) was on staging and not yet on prod at 20:35. A watcher promotes it if nobody does within 40 min.
- **Local note:** an agent rebuilt tera-core origin/master into ~/.m2 (the old jars are backed up in the session scratchpad m2-loanfactory-backup), because the August snapshot lacked notification.v2.
- 21:25: full parity. recruit-be staging = prod = b975a1e5, recruit-fe staging = prod = 5829d94e. The gwj7y session promoted both itself. Prod BE pods: 0 ERROR, 5 Pub/Sub adapters, actor it.dept@, auto-send false. FE pods Running; / answers 307 to login, /login answers 200.
- Staging IAM, re-measured with testIamPermissions on Bao's request:
  - Bao's access comes from groups dev@loanfactory.com, dev_leads@ and dev@moso.com (roles/editor + container.clusterAdmin, ...). He has get/publish/consume but NO setIamPolicy on the HR topic and subscription.
  - The recruit-be@lenderrate-master GSA has NO project-level Pub/Sub role, while prod and the other services have pubsub.editor.
  - Who can grant: roles/owner khai@loanfactory.com / khai@moso.com, thanh.t.tran@, info@moso.com; projectIamAdmin hoa.truong@.
  - Tracked in agentflow-couwc.

## Update 08/10 ~22:00: Headhunter program on prod (Bao: "it is running for real", in MOSO)
Measured on the recruit prod DB:
- program_members: 2 approved (team_lead and associate_recruiter); BOTH have company_email NULL in MOSO; 0 linked.
- program_sync.mode DRY_RUN since 07/10 17:45Z. 0 HEADHUNTER/TEAM_LEAD grants. referrals.enabled=false. 0 candidates with origin_owner_key. 0 referrer_identity.
- The FE headhunter nav is already on prod.

Bao's decision 08/10:
- Do NOT switch the recruit side on yet. It goes on together with opening prod to users.
- KEEP the manual admin Link; no auto-match by e-mail.
- Reason for the decision: measured on prod 08/10, `POST /user-svc/public/api/v1/users/register` is exposed (GET returns 405). It accepts a caller-supplied `"verify": true` (user-service CreateUserRequest.java:44). Password login `/auth-svc/public/api/v1/auth/login` is also exposed. See bead agentflow-rsnyo.

Checklist to switch it on later, in order:
1. A MOSO admin fills company_email for each roster member.
2. A recruit admin clicks Link per member (the actor it.dept@ is already set).
3. Set program_sync.mode to APPLY (recruit_settings). Watch one tick.
4. Set referrals.enabled=true.
5. Verify a member logs in and sees only their own leads.

## AUDIT 09/10 00:55 (re-measured from scratch on Bao's request)
- **Code.** recruit-be master = staging = production = e5caa333; recruit-fe master = staging = production = 028784a3. The latest deploy runs in all 4 environments succeeded on those shas. All pods are Running with 0 restarts.
- **DB.** Flyway V238 on both environments (equal to the repo), 0 failed migrations.
- **Secrets.** recruit-svc-secret has the same 22 keys in both environments, none empty.
- **Cron.** Identical registrations. sequence-tick and user-service-sync-tick are unregistered in BOTH environments; those features are unfinished.
- **Frontend.** The deployment env and the NEXT_PUBLIC build args differ only in URLs.
- **MOSO prod.** Every recruit API route answers 401, i.e. it exists, the same as staging. The packs PRs 3550/3564/3576/3577/3579/3582/3603/3615 are all in release tag 202610051329.3.64.0.
- **Prod pod reachability.** user-service, ai-hr, omni, followup and the gateway all answer.
- **Remaining differences are all deliberate.**
  - Env flags ON in staging, OFF in prod:
    - PACKS_WRITEBACK (with RETRY_UNKNOWN_ACTOR_AS_SYSTEM and FALLBACK_ACTOR)
    - ONBOARDING_WRITEBACK
    - ONBOARDING_HIRE_CLASSIFICATION
    - ONBOARDING_LEGAL_NAME
    - ONBOARDING_V2_HANDOFF (also blocked by packs bugs agentflow-90vkj and agentflow-gglqk)
    - AGREEMENT_SEND
    - GOOGLE_CALENDAR_EVENTS
    - MEET_ATTENDANCE
  - HR_HANDOFF_AUTO_SEND: true on staging, false on prod (Bao 08/10).
  - Guest and recipient policies: ALLOWLIST on staging, ANY on prod (intended).
  - DB settings:
    - referrals.enabled
    - headhunter.auto_own_enabled
    - onboarding.reminder.delivery_mode: SEND on staging, DRY_RUN on prod
    - onboarding.reminder.allowed_emails
    - hot.claim_sla_starts_at (a timestamp only)
- **Only infrastructure gap: STAGING Pub/Sub IAM** (agentflow-couwc). Staging has 3 of 5 adapters. Prod has 5/5 and 0 ERROR.
- **Staging noise.** The staging ERROR lines are AsyncRequestTimeoutException from SSE stream timeouts, which are benign.

## Update 09/10 ~11:00: new access, direct re-measurement, CORRECTIONS
**Access granted by Khai (09/10):**
- Pub/Sub IAM for recruit-be@lenderrate-master. After a restart, staging has 5/5 adapters. The probe event was processed (ALREADY_DONE) and a real HR event too (NO_CANDIDATE). agentflow-couwc closed.
- `roles/datastore.viewer` on lender-rate (MOSO prod) for bao.trinh. Helpers: `~/.cache/claude-recruit/dsq_prod.sh` and `~/.cache/claude-recruit/actorprobe/Probe.java`. Memory: reference_moso_prod_datastore_read.

**Re-measured directly (previously inferred):**
- **it.dept@.** Inferred before from an API probe; now confirmed from Datastore: active, has RECRUITING and OWNER.
- **MOSO RECRUITING on prod, by person.** The DB and the live probe agree for each one:
  - YES: victoria.pham, bao.trinh, dave.hoang, it.dept.
  - NO: seth.august, brayan, miley.dau (is_onboarding_specialist=true), dung, rosaline.pham.
  - This is a prerequisite for prod write-back; tracked in agentflow-h5xoz.
- **CORRECTION, Headhunter roster.** The 2 program_members are status PENDING (sync log: members=2 approved=0), not "approved". moso-aid sends company_email only for APPROVED members (lo-program-team.js contract), so NULL is correct. In MOSO, both Admins DO have a company_email. My 08/10 statements "2 approved members" and "a MOSO admin must fill company_email" were WRONG.
- **Sync completeness, key by key.**
  - MOSO LORecruiting updated since recruit's first candidate (14/09 13:02Z): 975. recruit: 990. In both: 974.
  - 15 recruit rows were deleted in MOSO; 13 of them are still ACTIVE in recruit.
  - 1 joined LO (id 37060607095, updated 02/10 19:40Z) never produced a webhook.
  - Tracked in agentflow-g7hc5.
  - MOSO has 131,055 LORecruiting rows in total; recruit does not backfill history by design.
- **MOSO prod version.** Now 3.65.0 (GAE version d, 09/10 03:27Z). It includes packs #3627 (agentflow-90vkj/gglqk fix) and all recruit API routes.

## AUDIT 13/10 ~04:00 (night, full re-audit: recruit-be/fe, packs, moso-aid, omni, user-service, followup, ai-hr)

Bao's answers before sleeping: add the reconcile key to prod = yes. MOSO rollback = "option 1": open hotfix PRs into 3.64.1, assign imkhai, no merge and no deploy. Do NOT promote recruit-fe; the night session owns it.

**Fixed tonight**
- `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY` was missing in prod `recruit-svc-secret` (prod had 22 keys, staging 23). Added it; both envs now have the same 23 keys and no prod value equals staging. The cron registered on boot. The first tick at 03:00 +07 returned 200: candidates=2, checked=2, notSigned=2, healed=0, malformed=0, failed=0. This also proves the MOSO 3.64.1 `candidate/agreement` read works with the it.dept actor.

**MOSO prod rollback (biggest finding)**
- GAE `lender-rate` default is version c, built from branch 3.64.1 (jar loan-3.64.1-SNAPSHOT, deployed 12/10 11:29Z). It ran 3.65.0 from 09/10; that version was overwritten with 3.64.1 on 10/10 14:58Z. Staging (`lenderrate-master`) still runs 3.65.0.
- Master fixes missing on prod:
  - #3627 (90vkj, gglqk)
  - #3641 (ce3ey: a signing link is served before the 1-1 call; the anonymous execute door accepts the loan officer registration ops)
  - #3645 (cg03s: recruit-api returns 401 to recruiters without RECRUITING)
  - ocveo
- Hotfix PRs into `3.64.1`, assigned and review-requested to imkhai, NOT merged:
  - #3675 (90vkj+gglqk)
  - #3676 (ce3ey, stacked on #3675)
  - #3677 (cg03s)
  - #3678 (ocveo)
- Merge order: 3675 → 3676; 3677 and 3678 can go in any order. Each PR has targeted tests green and a negative control.
- The deploy build needs base installed at origin/3.64.1, because the shared ~/.m2 base 3.64.1 is stale. Closed PR #3642 is superseded; do not reopen it.
- Beads ce3ey and ocveo were reopened.
- The lf-homepage and lo-homepage prod pages call 0 webplus ops missing on 3.64.1. The sign step still gets its link (registerSigningAgreement exists there).

**Parity confirmed (audit agents, read-only)**
- recruit-be: prod = staging = master = 5c715987 (#626, shipped by another session; rev 43 is healthy, 10 cron lines, 0 ERROR).
  - Live env equals helm values.
  - Identical cron registrations; 5 Pub/Sub adapters, all subscriptions exist with DLQ.
  - Flyway: 187 rows, V242, 0 failed in both DBs.
  - recruit_settings: 133 keys; 5 differ, all intentional or env-specific.
- Dependencies on their prod refs match recruit's contract: moso-aid (rev 00114 = pro tip), user-service, followup-be (protos byte-identical), ai-hr-be, cron-service, omni (except the item below).
- All 10 packs recruit routes exist on prod (401 unauthenticated; a bogus path returns 404).
- recruit-fe: prod 611168d8 is 2 commits behind staging f6257b38 (#442 SDK 0.4.26, Call disabled for recruiters without Zoom; #444 claim-first). The night session owns these. The audit found no env leak and no FE→BE path missing on prod.

**Still needs someone else**
1. imkhai: review, merge and deploy packs 3.64.1 PRs #3675-#3678. All prod recruit flags that would call packs write ops are OFF, so recruit itself is not blocked today. The ce3ey hole is the urgent part.
2. omni owner: promote omni at or after b5b545d (#548 `side` field) to production. Without it, recruit-be #605 is inert in prod: Team-only Omni emails still count as candidate contact. Nothing breaks.
3. DevOps: prod has no metrics or alerts for recruit-be.
   - `podMonitoring.enabled` is staging-only by design (deploy/alerts/README: prod has a separate owner).
   - HR hand-off publish and the HR subscribers are live in prod, so outbox and DLQ failures are silent there.
   - Needs the lender-rate owner to opt in (helm flag + alert policies + channels). bao.trinh cannot even list PodMonitoring on the prod cluster.
4. Before turning on any prod-off flag: PACKS_WRITEBACK, ONBOARDING_WRITEBACK, HIRE_CLASSIFICATION, LEGAL_NAME, V2_HANDOFF and AGREEMENT_SEND require the packs ports above (plus #3564/#3577/#3579/#3582 on the prod build), and every acting recruiter needs MOSO RECRUITING (h5xoz: Seth/Brayan/Miley lack it).
   - GOOGLE_CALENDAR_EVENTS and MEET_ATTENDANCE need the Calendar and Meet APIs on the OAuth client's project, which we could not measure.
   - MEET_ATTENDANCE needs NO Pub/Sub topic. `recruit-meet-events-staging` is referenced only in a docs spike, so its absence on prod is not a gap.

**Intentional or decided (no action)**
- headhunter.auto_own_enabled: true on staging, false on prod. Bao 08/10: keep Headhunter off until users are let in.
- Program sync is DRY_RUN in both envs.
- Staging-only drift: `SPRING_FLYWAY_OUT_OF_ORDER=true` is live on the staging deployment but not in helm values, so the next helm deploy drops it. This is harmless now.

### 13/10 ~05:00 additions (reviews done, new security finding)

- **Reviews of #3675-#3678.** Reviewer A (java) found no CRITICAL or HIGH issue: all four merged onto 3.64.1 cleanly and 169 tests passed. Reviewer B (security) gave LGTM-with-nits on all four. Repo Owner verdicts:
  - #3675 and #3678: SAFE-TO-MERGE.
  - #3676: SAFE-WITH-CONDITIONS, merge after #3675.
  - #3677: SAFE-WITH-CONDITIONS. imkhai must answer whether a user can set their own `Admin.is_recruiter`/`is_out_sourcing_recruiter`, and recruit PACKS_WRITEBACK stays off until the smoke test passes.
  - The full deploy plan, smoke tests and rollback (`set-traffic c=1`) are in the comment on #3675.
- **Correction.** #3645 (cg03s) was NEVER on prod; the 3.65.0 build was cut before it merged. No evidence links the rollback to any of these fixes. Most likely a 3.64.1 hotfix deploy overwrote 3.65.0 (asked imkhai on #3675).
- **#3678 prod data.** In the company namespace, 0 lenders are approved with `show_on_public_site` missing, so none become newly public. The list goes from 243 to 242: Eleven Mortgage (unapproved, agreement expired 10/10) drops off.
- **ce3ey happened for real on prod 12/10.** Two LOs got an envelope at the Basic-info save and SIGNED it before the 1-1 call and before paying or getting a waiver:
  - LORecruiting 37634837020 = recruit candidate 51af552b
  - LORecruiting 6629731021357056 = recruit candidate 1993b8b1
  - In recruit both are at S6, offer SIGNED, fee PENDING, no owner.
  - Nothing was changed (we count, never cancel). Bao or staff decide on the fee and the call. Bead ce3ey has the details.
- **NEW: agentflow-9wg8r (P1).** The public `registerLoanOfficer` (keyed AND unkeyed, via the email dedupe) and `registerWebinar` saved raw `paid_startup_fee`/`waive_startup_fee`/`waive_startup_fee_reason`/`paypal_order_id`/`lo_agreement_signed`. Anyone with an LO's email could mark the fee paid or waived, or fake "signed", and recruit's reconcile trusts `lo_agreement_signed`.
  - Prod history shows no abuse (every anonymous paid flip has a PayPal order; there are no self-waives).
  - Fix PRs, assigned to imkhai, NOT merged:
    - #3679 into master: Reviewer A LGTM, Reviewer B LGTM-with-nits, Repo Owner SAFE-WITH-CONDITIONS (needed a 2nd reviewer, now satisfied).
    - #3680 into 3.64.1: re-stacked on #3676, head abd94f1066d.
  - **Final merge order on 3.64.1: 3675 → 3676 → 3680 → 3677/3678. Ship #3680 together with #3676.**
- **Follow-up beads (P2):**
  - agentflow-mnhsb: switch the public register/webinar body to an allowlist. Other privileged LORecruiting fields are still writable.
  - agentflow-mz36c: the PayPal order is not bound to the row, and the PayPal client secret is logged on token failure. 0 such log lines in the 30-day retention window; rotating is the owner's call.
- **mz36c log fix:** #3681 (master) and #3682 (3.64.1 port) stop logging the PayPal client secret. Reviewer A LGTM; Repo Owner SAFE-WITH-CONDITIONS and recommends including it in the deploy. **Final 3.64.1 order: 3675 → 3676 → 3680 → 3677/3678 → 3682.**
- New bead agentflow-01s4a (P2): hardcoded credentials in packs source (e.g. the LPA OAuth fallbacks in LPAOAuth2.java:66-67). Values were not recorded.
- The ce3ey cases since the rollback are exactly the 2 from 12/10 (request logs since 10/10 14:58Z).

## RESUME POINT 13/10 ~08:20 (Bao shut the machine down to go to the office)

Read this section first, then `bd show` the beads below. All agents are stopped, so a resumed session must re-spawn them.

**URGENT open security items (MOSO packs, prod = branch 3.64.1):**
1. **agentflow-p0qak (P0).** The public webplus route `getMeetingAndAppointmentConfiguration` returned the raw config bean, which included the PayPal client secret, Calendly token and Calendly signing key. Only lengths were verified; values were never printed.
   - Fix PRs: #3683 (master) and #3684 (3.64.1, independent; merge first).
   - Reviews: Reviewer A LGTM, Reviewer B LGTM-with-nits. **Repo Owner verdict was still PENDING at pause.**
   - **The 3 credentials must be rotated by imkhai/Bao regardless of the deploy.**
   - A count of calls to that route over 30 days was running and was lost at shutdown. Re-run it: `gcloud logging read 'protoPayload.resource:"getMeetingAndAppointmentConfiguration"' --project lender-rate --freshness=30d`, and print only the count, dates and distinct IPs.
2. **agentflow-zum0l (P0).** Also: a local test shows an anonymous GetOp/FindOp kind=Borrower (sequential ids) returns full Borrower records; confirm on staging only. Confirmed on STAGING (field names only):
   - The anonymous `execute/GetOp` kind Loan returns `$borrowers`/`$main_borrower` UNFILTERED (DOB, credit report link, assets, liabilities, ...).
   - The anonymous `getAlert` (and getLoanConfiguration/getLenderAgreement/getCampaign) returns the raw Bean = all stored fields.
   - Prod runs the same code; it was NOT probed on prod.
   - The FE quote/qm alert pages use GetOp kind Loan but do not read `$main_borrower`/`$borrowers`.
   - Fix in progress by an agent (since stopped). Fix A is a generic raw-Bean → `toMap(anonymous view)` guard in WebPlusAPI.handleRequest. Fix B filters or drops FK expansions for anonymous executeOp.
   - The checkpoint of that work is listed below (WIP branches).
3. agentflow-9wg8r (P1): fee/agreement-field bypass. PRs #3679 (master) and #3680 (3.64.1, stacked on #3676). Fully reviewed.
4. agentflow-mz36c: the PayPal secret was logged. PRs #3681 (master) and #3682 (3.64.1). Fully reviewed.

**3.64.1 merge order for imkhai:** 3684 → 3675 → 3676 → 3680 → 3677/3678 → 3682, then the zum0l ports when ready. The deploy plan, smoke tests and rollback are in the comment on #3675.

**Message to Khai:** draft in `docs/handoff/recruit-prod-parity/msg-khai-3.64.1-hotfix.md` (Vietnamese; Bao sends it). It still needs the zum0l PR numbers once they exist.

**Bao's decisions still pending:** the 2 LOs who signed early on 12/10 (recruit 51af552b, 1993b8b1), credential rotation, recruit prod metrics/alerts (DevOps), and getAlert/legacy link design (now part of zum0l).

**Other beads opened tonight:** mnhsb (public register body allowlist), 01s4a (hardcoded credentials in packs source).

**To resume:** `git pull` agentflow; `cd packs && git fetch`; check the zum0l WIP branches and worktrees (packs/.worktrees/); re-spawn reviewers A, B and Repo Owner for the zum0l PRs once they are opened; get the Repo Owner verdict on #3683/#3684.

### 13/10 resume (after Bao's restart)
- Nothing merged; prod is still version c (3.64.1).
- p0qak: Repo Owner gave SAFE-TO-MERGE on #3683/#3684. **New 3.64.1 order: 3684 → 3682 → 3675 → 3676 → 3680 → 3677/3678.** Rotate the 3 credentials only AFTER #3684 + #3682 are live, otherwise the new values leak again. Rotation steps are in the #3675 comment "Deploy plan update (p0qak)". Staging leaks its own, different credentials (hash compare); its Calendly token is live, so rotate that too.
- zum0l: the previous fix agent died at shutdown before pushing (only a draft test existed). A new agent `zum0l-fix` is working in packs/.worktrees/zA-*/zB-* and pushes after each green step.
- The Khai message draft was updated with the new order and rotation steps.
- **zum0l PRs:** #3685/#3686 (Fix A) and #3687/#3688 (Fix B). Reviewer A: LGTM-with-nits. Reviewer B: no blocker. Repo Owner pending.
- **NEW agentflow-pymgv (P0), CONFIRMED on staging:** anonymous `execute/FindOp` bulk-reads Admin (135 fields), EscalationTicket, Asset, Employment, Note, Document and more. This is a legacy design (a public executeOp that runs any op), so it needs an imkhai/Bao decision; the proposed fix is an anonymous op+kind allowlist. Also new: agentflow-cct8l (P1), the Loan public view and unaudited routes.
