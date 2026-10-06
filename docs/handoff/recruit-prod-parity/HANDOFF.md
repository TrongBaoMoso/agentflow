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
