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

## recruit-be — production (`lender-rate`, cluster `moso-gke`)

Created by hand, once (BOOTSTRAP "Create it (production)"). Not inventoried here yet — list with the
commands above before assuming anything is missing.

## Pub/Sub (owner: Khải / DevOps)

| Subscription | Env | Status |
|---|---|---|
| HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT | production | EXISTS (Khải 07/10; set `RECRUIT_HR_ONBOARD_SUBSCRIPTION` to it; DLQ topic `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_DLQ` + `.monitor`). Do not create a `_PROD` variant. |
| HR_ASSOCIATE_DEACTIVE_SUBSCRIBE_RECRUIT_STAGING | staging | NOT created — needed by recruit-be #723 (HR offboard). Ask DevOps. |
