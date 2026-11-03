#!/usr/bin/env bash
# Check agentflow-ahgee on PRODUCTION with Suong's site, read-only (GET only, nothing is saved).
#   bash docs/handoff/lo-setting-ahgee/check-prod.sh [N]      N = requests per check (default 300)
# Part A asks moso-aid /api/lo-setting directly (no cache in front, so every request reaches MOSO).
# Part B opens suongloanofficer.com pages like a visitor (lo-homepage caches 5 min, so failures are rarer).
# Part C counts the last 24h on Cloud Logging (needs `gcloud auth login` as bao.trinh@).
set -u
N=${1:-300}
AID=https://moso-aid-agsdw2ofpq-uc.a.run.app
SITE=https://www.suongloanofficer.com

KEY=$(curl -sS "$SITE/loan-officer" | grep -oE 'ag1zf[A-Za-z0-9_-]{20,}' | sort -u | python3 -I -c "
import sys, base64
for k in sys.stdin.read().split():
    if b'suonguyen85' in base64.urlsafe_b64decode(k + '=' * (-len(k) % 4)): print(k); break")
[ -n "$KEY" ] || { echo "Could not find Suong's key on $SITE"; exit 1; }

count() { sort | uniq -c | awk '{printf "  %s x HTTP %s\n", $1, $2}'; }

echo "A) moso-aid /api/lo-setting for Suong, $N requests (~2 per second)"
for i in $(seq 1 "$N"); do curl -sS -o /dev/null -w "%{http_code}\n" "$AID/api/lo-setting?key=$KEY"; sleep 0.5; done | count

echo "B) $SITE pages as a visitor, $N requests"
PAGES=(/ /join /loan-officer /register-loan-officer /mortgage-rate-alert /commercial)
for i in $(seq 1 "$N"); do p=${PAGES[$((i % ${#PAGES[@]}))]}; curl -sS -o /dev/null -w "%{http_code}\n" "$SITE$p"; sleep 0.5; done | count

echo "C) last 24h on production (Cloud Logging)"
SINCE=$(date -u -v-24H +%FT%TZ 2>/dev/null || date -u -d '24 hours ago' +%FT%TZ)
q() { gcloud logging read "$1 AND timestamp>=\"$SINCE\"" --project lender-rate --limit 5000 --format="value(timestamp)" 2>/dev/null | wc -l | tr -d ' '; }
echo "  moso-aid /api/lo-setting 500s:      $(q 'resource.type="cloud_run_revision" AND resource.labels.service_name="moso-aid" AND httpRequest.requestUrl:"/api/lo-setting" AND httpRequest.status>=500')"
echo "  MOSO 502 retried, stale copy served: $(q 'resource.type="cloud_run_revision" AND resource.labels.service_name="moso-aid" AND textPayload:"served the last good copy"')"
echo "  LO-site pages answered 5xx:          $(q 'resource.type="cloud_run_revision" AND resource.labels.service_name="lo-homepage-v2" AND httpRequest.status>=500')"
