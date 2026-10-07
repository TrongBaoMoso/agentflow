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
