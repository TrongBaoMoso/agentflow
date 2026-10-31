# Secrets & subscriptions inventory (names only, NEVER values)

Why this file exists: Bao's account (`bao.trinh@loanfactory.com`) can **list** secrets and **add versions**,
but **cannot read values** (`secretmanager.versions.access` is denied). An unreadable secret is NOT a
missing secret — on 07/10 we nearly re-created `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT` on production
because we could not see it; Khải confirmed it already existed with 21 messages in it.

## How to check whether something exists (metadata is readable)

```bash
# Secret Manager — staging (lenderrate-master) / production (lender-rate)
gcloud secrets list --project lenderrate-master --filter='name~recruit-be-' --format='value(name,createTime)'
gcloud secrets versions list <name> --project lenderrate-master --format='value(name,state)'
# Kubernetes secret — key present? (prints only key names)
kubectl --context gke_lenderrate-master_us-central1_moso-kube -n recruit-be get secret recruit-svc-secret \
  -o json | python3 -c 'import json,sys; print("\n".join(sorted(json.load(sys.stdin)["data"])))'
# Pub/Sub subscriptions
gcloud pubsub subscriptions list --project <project> --format='value(name)' | grep -i recruit
```

Rule: before saying "X is not created", run the matching command above. If it is denied, say "I cannot
see it", not "it does not exist", and ask the owner (Khải / DevOps).

## recruit-be — staging (`lenderrate-master`, cluster `moso-kube`, secret `recruit-svc-secret`)

Canonical env → secret mapping: `recruit-be/BOOTSTRAP.md` ("Staging: Secret Manager is the source").
Created by our sessions (date = Secret Manager createTime):

| Secret Manager name | Env var | Feature | Created |
|---|---|---|---|
| recruit-be-recruit-platform-inbox-internal-api-key | RECRUIT_PLATFORM_INBOX_INTERNAL_API_KEY | platform-inbox drain cron (D188) | 2026-10-01 |
| recruit-be-recruit-moso-aid-roster-key | RECRUIT_MOSO_AID_ROSTER_KEY | moso-aid roster read | 2026-10-02 |
| recruit-be-recruit-onboarding-reminder-internal-api-key | RECRUIT_ONBOARDING_REMINDER_… | onboarding reminder cron | 2026-10-02 |
| recruit-be-recruit-moso-aid-base-url | RECRUIT_MOSO_AID_BASE_URL | moso-aid origin | 2026-10-03 |
| recruit-be-recruit-program-sync-internal-api-key | RECRUIT_PROGRAM_SYNC_INTERNAL_API_KEY | LO Recruiter Program sync (D202) | 2026-10-03 |
| recruit-be-recruit-google-oauth-state-key / -google-token-keyring | RECRUIT_GOOGLE_* | Google Calendar/Meet connect | 2026-10-04 |
| recruit-be-recruit-moso-signed-reconcile-internal-api-key | (see code) | MOSO signed-agreement reconcile cron | 2026-10-09 — **NOT in the BOOTSTRAP rebuild table; a full rebuild would drop it** |
| recruit-be-recruit-nurture-drip-internal-api-key | RECRUIT_NURTURE_DRIP_INTERNAL_API_KEY | nurture drip cron | 2026-10-16 |
| recruit-be-recruit-unsubscribe-hmac-secret | RECRUIT_UNSUBSCRIBE_HMAC_SECRET | e-mail unsubscribe links | 2026-10-16 |
| recruit-be-recruit-post-joined-reconcile-internal-api-key | RECRUIT_POST_JOINED_RECONCILE_INTERNAL_API_KEY | post-joined reconcile cron | 2026-10-19 |
| recruit-be-recruit-mmi-push-token | RECRUIT_MMI_PUSH_TOKEN | MMI CRM push (D305); value in Keychain `recruit-mmi-push-token-staging` | 2026-10-21 |
| recruit-be-recruit-referrals-notify-internal-api-key | RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY | My referrals change e-mails cron (D317, #725); patched into recruit-svc-secret + rollout restart 23/10; cron `recruit-referral-change-emails-tick` registered | 2026-10-23 |
| recruit-be-recruit-rbac-reconcile-internal-api-key | RECRUIT_RBAC_RECONCILE_INTERNAL_API_KEY | RBAC mirror reconcile + REFERRER sweep cron (D320/D326); created by Bao's account 31/10 (version 1, random 64-hex, never printed). NOT usable yet: Bao cannot setIamPolicy, so `recruit-be-deploy@` has no secretAccessor; not in `secret-keys.txt` yet — Khai asked 31/10 | 2026-10-31 |

Older (2026-09-29, initial bootstrap): db-*, moso-webhook-api-key, packs-writeback-internal-api-key,
recruit-api-key, recruit-host-subjects-access-token, hot-idle-release, hr-handoff, omni, omni-subject-alias.

## recruit-be — production (`lender-rate`, cluster `moso-gke`, secret `recruit-svc-secret`)

What Bao's account can see on production (measured 23/10):
- Secret Manager in `lender-rate`: **list DENIED** (`secretmanager.secrets.list`). Nothing visible; ask Khải/DevOps.
- Kubernetes `recruit-svc-secret` key NAMES: **readable** (command above with context `gke_lender-rate_us-central1_moso-gke`).
- Pub/Sub in `lender-rate`: **list DENIED**. Ask Khải.

Key names present in `recruit-svc-secret` on 23/10 — staging vs production:

| Key | Staging | Production | Note |
|---|---|---|---|
| DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USERNAME | yes | yes | |
| GOOGLE_OAUTH_CLIENT_SECRET, RECRUIT_GOOGLE_OAUTH_STATE_KEY, RECRUIT_GOOGLE_TOKEN_KEYRING | yes | yes | Google Calendar/Meet |
| MOSO_WEBHOOK_API_KEY, PACKS_WRITEBACK_INTERNAL_API_KEY, RECRUIT_API_KEY | yes | yes | MOSO/packs |
| RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN | yes | yes | |
| RECRUIT_HOT_IDLE_RELEASE_INTERNAL_API_KEY | yes | yes | Hot idle-release cron |
| RECRUIT_HR_HANDOFF_INTERNAL_API_KEY | yes | yes | HR hand-off cron |
| RECRUIT_MEET_ATTENDANCE_INTERNAL_API_KEY | yes | yes | Meet attendance cron (missing from the BOOTSTRAP table too) |
| RECRUIT_MOSO_AID_BASE_URL, RECRUIT_MOSO_AID_ROSTER_KEY | yes | yes | moso-aid |
| RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY | yes | yes | signed reconcile cron (missing from the BOOTSTRAP table) |
| RECRUIT_OMNI_INTERNAL_API_KEY, RECRUIT_OMNI_SUBJECT_ALIAS_INTERNAL_API_KEY | yes | yes | Omni |
| RECRUIT_ONBOARDING_REMINDER_INTERNAL_API_KEY | yes | yes | onboarding reminders |
| RECRUIT_PLATFORM_INBOX_INTERNAL_API_KEY | yes | yes | platform inbox (D188) |
| RECRUIT_POST_JOINED_RECONCILE_INTERNAL_API_KEY | yes | yes | post-joined reconcile |
| RECRUIT_PROGRAM_SYNC_INTERNAL_API_KEY | yes | yes | LO Recruiter Program sync (D202) |
| RECRUIT_NURTURE_DRIP_INTERNAL_API_KEY | yes | **NO** | nurture drip cron — prod e-mails still off (bead agentflow-236t9.14) |
| RECRUIT_UNSUBSCRIBE_HMAC_SECRET | yes | **NO** | unsubscribe links — needed before any prod auto e-mail |
| RECRUIT_MMI_PUSH_TOKEN | yes | yes | MMI push (D305) — LIVE on prod; secret v2 added 29/10 (v1 rotated out), Keychain `recruit-mmi-push-token-production`; first Loan Officer push verified 30/10 |
| RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY | yes | **NO** | My referrals change e-mails (D317) — prod dark |

Production "NO" rows are expected today (those features are dark on prod). Each must be created by
hand before its go-live; add the row here when done.

## moso-aid — staging (Cloud Run `moso-aid`, `lenderrate-master`, us-central1)

moso-aid keeps its keys as **plain Cloud Run env vars**; from 31/10 new ones also get a Secret Manager copy (`moso-aid-*`). Names are readable with
`gcloud run services describe moso-aid --project lenderrate-master --region us-central1 --format=json`.
17 vars on 24/10 (rev 00185; 20 on 31/10, rev 00194-j95): ALLY_API_KEY, ALLY_API_URL, ALLY_INBOUND_SERVICE_KEY, API_CRAWL, ENV, IS_CRAWL,
JWT_SECRET, LF_GATEWAY_URL, LOL_RBAC_ENFORCE, LOL_SSO_CLIENT_ID, LOL_SSO_CLIENT_SECRET, LO_ADMIN_SERVICE_KEY,
LO_RECRUITER_PAGE_REQUIRES_APPROVAL, LO_TEAMS_WRITE_ENABLED, MONGO_URI, RECRUITER_PROFILE_SERVICE_KEY, RECRUIT_INBOUND_SERVICE_KEY.

| Env var | Purpose | Created |
|---|---|---|
| PACKS_INBOUND_SERVICE_KEY | packs → `GET /api/lo-programs/standing/members` (moso-aid #196, LO Recruiter Program credit). Same value must go into packs property `moso_aid_packs_service_key`. Value in Keychain `moso-aid-packs-inbound-service-key-staging`. | 2026-10-25 (rev 00187) |
| MOSO_ADMINS_API_KEY | OUTBOUND: moso-aid → MOSO AIAPI `GET /api/ai/v1/{ns}/getAdmins` as a staff login, so rows keep `key` after packs#3761 (moso-aid #202 / issue #197; without it every `/api/join-page` is 404). It is the MOSO **ApiKey** of the dedicated service Admin **`svc-moso-aid@viet18.com`** (staging Datastore ns 5716104026521600, created 31/10 by direct Datastore insert): `active=false`, no permissions, no Credential (cannot log in), only first/last name. An Admin-kind caller is enough for full rows (`ListAdminsFromCachedOp.STAFF_KINDS`). Secret Manager **`moso-aid-moso-admins-api-key`** (lenderrate-master, v1) + Keychain `moso-aid-moso-admins-api-key-staging`. | 2026-10-31 (rev 00191-h7q, 19 vars) |
| JOIN_PAGE_READ_KEY | INBOUND, read-only: lo-homepage server → `GET /api/join-page` with `x-join-page-read-key` skips the #201 rate limit and opens nothing else (moso-aid #203, lo-homepage #927). Same value on lo-homepage. Must never equal RECRUITER_PROFILE_SERVICE_KEY (startup check reports it). Secret Manager **`moso-aid-join-page-read-key`** (lenderrate-master, v1) + Keychain `join-page-read-key-staging`. Also set on Cloud Run **`lo-homepage-master`** (same value, `--update-env-vars`, rev 00378 → 3 vars). | 2026-10-31 (moso-aid rev 00194-j95, 20 vars; no startup missing/shared-key warning) |

**Never use `--env-vars-file` / `--set-env-vars` on this service — they REPLACE every var.** Use
`--update-env-vars`. Incident 25/10: a draft command with `--env-vars-file` wiped all 17 vars; the new
revision 00186 failed to start, traffic stayed on 00185 (no outage); restored from rev 00185 into rev 00187.

Production moso-aid: PACKS_INBOUND_SERVICE_KEY **created 2026-10-29** (rev moso-aid-00120-75x, `--update-env-vars`, 16 vars after, all inbound keys distinct; `/api/lo-programs/standing/members` wrong key 401 / right key 200). Value in Bao's Keychain `moso-aid-packs-inbound-service-key-production`. **Still to do (needs MOSO admin, Khải):** packs prod System Properties `moso_aid_packs_service_key` = that value and `moso_aid_base_url` = moso-aid prod `/api` root. Both unset = packs program credit stays off (no error).

## Pub/Sub

Staging (`lenderrate-master`, listable by Bao), recruit subscriptions on 23/10:
HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_STAGING (+ _DLQ.monitor), HR_ASSOCIATE_UPDATE_SUBSCRIBE_RECRUIT_STAGING (+ _DLQ.monitor),
SEARCH_INDEX_SYNC_SUBSCRIBE_RECRUIT-SVC-STAGING, SVC_STATUS_MAIL_RECRUIT_SUBSCRIPTION (+ _DLQ.monitor),
omni-inbound-reply.recruit-be, omni-outbound-sent.recruit-be, recruit-meet-events-staging-pull (+ dlq-monitor).
HR_ASSOCIATE_DEACTIVE_SUBSCRIBE_RECRUIT_STAGING (+ `_DLQ` topic + `_DLQ.monitor`) — created by Bao's account 23/10 for
recruit-be #723 (HR offboard), same settings as the UPDATE one (ack 60s, 7d retention, retry 10s–600s, DLQ after 5).
IAM bindings (recruit-be SA viewer+subscriber, Pub/Sub SA publisher on DLQ) requested from Khải — Bao's editor role cannot
set IAM. After that: set `RECRUIT_HR_OFFBOARD_SUBSCRIPTION` in staging values.

Production (`lender-rate`, NOT listable by Bao — known only from Khải):
| Subscription | Status |
|---|---|
| HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT | EXISTS (Khải 07/10, had 21 messages); set `RECRUIT_HR_ONBOARD_SUBSCRIPTION` to it; DLQ topic `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_DLQ` + `.monitor`. Do not create a `_PROD` variant. |
| omni-inbound-reply / omni-outbound-sent | did not exist on 07/10 (Khải: "PROD chưa có 2 thằng này"); Khải said he would release them — re-ask before assuming. |
| RECRUIT_URGENT_NOTIFIER_API_KEY (staging) | Added 26/10 by Bao (value from Tai, never printed) to k8s secret `recruit-svc-secret`, ns `recruit-be`, cluster moso-kube (lenderrate-master); 40 chars. Probe 26/10: notifier knows the key (403, not 401) but "not bound to application RECRUIT"; Tai must bind RECRUIT. Prod key not stored yet. Bead agentflow-3bzy5.6. |
| RECRUIT_URGENT_NOTIFIER_API_KEY (production) | Added 26/10 by Bao (value from Tai, never printed) to k8s secret `recruit-svc-secret`, ns `recruit-be`, cluster moso-gke (lender-rate); 32 chars. Probe 26/10 via https://svc.loanfactory.com/notifier/v2/notifications/resolve: 200 {"resolved":0} for appCode RECRUIT (no key: 401). Prod flag RECRUIT_URGENT_ENABLED not set (off). Bead agentflow-3bzy5.6. |
