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
| RECRUIT_MMI_PUSH_TOKEN | yes | **NO** | MMI push (D305) — prod waits for Bao/Vic/Miley |
| RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY | yes | **NO** | My referrals change e-mails (D317) — prod dark |

Production "NO" rows are expected today (those features are dark on prod). Each must be created by
hand before its go-live; add the row here when done.

## Pub/Sub

Staging (`lenderrate-master`, listable by Bao), recruit subscriptions on 23/10:
HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_STAGING (+ _DLQ.monitor), HR_ASSOCIATE_UPDATE_SUBSCRIBE_RECRUIT_STAGING (+ _DLQ.monitor),
SEARCH_INDEX_SYNC_SUBSCRIBE_RECRUIT-SVC-STAGING, SVC_STATUS_MAIL_RECRUIT_SUBSCRIPTION (+ _DLQ.monitor),
omni-inbound-reply.recruit-be, omni-outbound-sent.recruit-be, recruit-meet-events-staging-pull (+ dlq-monitor).
**Missing on staging:** HR_ASSOCIATE_DEACTIVE_SUBSCRIBE_RECRUIT_STAGING (needed by recruit-be #723, HR offboard) — ask DevOps.

Production (`lender-rate`, NOT listable by Bao — known only from Khải):
| Subscription | Status |
|---|---|
| HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT | EXISTS (Khải 07/10, had 21 messages); set `RECRUIT_HR_ONBOARD_SUBSCRIPTION` to it; DLQ topic `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_DLQ` + `.monitor`. Do not create a `_PROD` variant. |
| omni-inbound-reply / omni-outbound-sent | did not exist on 07/10 (Khải: "PROD chưa có 2 thằng này"); Khải said he would release them — re-ask before assuming. |
