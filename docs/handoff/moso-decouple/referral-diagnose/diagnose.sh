#!/usr/bin/env bash
# D429/D433 staging diagnosis: why Recruit's referral list differs from packs' (SHADOW: owner_differs, only_packs).
# Prints counts, candidate ids and HASHED referrer keys only (owner keys embed a login e-mail, D204). Read-only.
#
# Needs: gcloud auth (pgq_stg.sh reaches the staging DB through a temporary pod) and the staging admin token.
#   bash docs/handoff/moso-decouple/referral-diagnose/diagnose.sh [out-dir]
set -euo pipefail
OUT=${1:-/tmp/referral-diagnose}; mkdir -p "$OUT"
G=https://gateway.viet18.com/recruit-svc/api/v1
TOKEN_FILE=${TOKEN_FILE:-$HOME/.cache/claude-recruit/preview/stg_3370.token}
q() { bash "$HOME/.cache/claude-recruit/pgq_stg.sh" recruit "$1"; }

echo "== 1. The import DRY_RUN (D433): packs rows classified against Recruit (no write)"
# The POST outlasts the gateway timeout (503 after ~5 s) while the run finishes in the app; read the result from /last.
curl -s -o /dev/null -X POST -H "Authorization: Bearer $(cat "$TOKEN_FILE")" "$G/admin/referral-program/packs-import?mode=DRY_RUN&id_limit=500" || true
for _ in $(seq 1 40); do
  code=$(curl -s -o "$OUT/dry_run.json" -w '%{http_code}' -H "Authorization: Bearer $(cat "$TOKEN_FILE")" "$G/admin/referral-program/packs-import/last")
  [ "$code" = 200 ] && break; sleep 15
done
python3 - "$OUT/dry_run.json" "$OUT" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d = d.get("payload", d)
print("packs rows:", d.get("packsRows", d.get("packs_rows")))
for k in ("outcomes", "plannedPrograms", "otherReferrerBreakdown"):
    v = d.get(k)
    print(k, json.dumps(v, indent=1))
samples = d.get("sampleCandidateIds") or {}
for outcome, ids in samples.items():
    open(f"{sys.argv[2]}/ids_{outcome}.txt", "w").write("\n".join(ids))
    print(outcome, len(ids), "sample ids ->", f"{sys.argv[2]}/ids_{outcome}.txt")
PY

ids_sql() { [ -s "$OUT/ids_$1.txt" ] && sed "s/.*/'&'/" "$OUT/ids_$1.txt" | paste -sd, - || echo "''"; }

echo "== 2. Snapshot coverage: who has a candidate_referral_program row, by source/program/basis"
q "SELECT decision_source, program, referrer_basis, count(*) FROM candidate_referral_program GROUP BY 1,2,3 ORDER BY 4 DESC"
q "SELECT (SELECT value FROM recruit_settings WHERE setting_key='referral.program_snapshot_enabled' ORDER BY effective_from DESC LIMIT 1) AS snapshot_on,
          (SELECT min(registered_at) FROM candidate_referral_program WHERE decision_source='PACKS_MARKER') AS first_marker,
          (SELECT min(registered_at) FROM candidate_referral_program WHERE decision_source='BACKFILL') AS first_backfill"

echo "== 3. The referrals only packs has (IMPORT sample): why no snapshot was written"
q "SELECT c.source, c.referred_source IS NOT NULL AS has_referred_source, c.legacy_key IS NOT NULL AS moso_linked,
          date_trunc('month', c.created_date)::date AS created_month,
          EXISTS (SELECT 1 FROM referral_attribution_events e WHERE e.candidate_id=c.id) AS has_attribution,
          count(*)
     FROM candidates c WHERE c.id IN ($(ids_sql IMPORT))
    GROUP BY 1,2,3,4,5 ORDER BY 6 DESC"

echo "== 4. The referrer disagreements (HAS_SNAPSHOT_OTHER_REFERRER sample): what Recruit stored and from where"
q "SELECT p.decision_source, p.referrer_basis, p.program,
          date_trunc('month', p.registered_at)::date AS registered_month,
          left(encode(sha256(convert_to(lower(p.referrer_key),'UTF8')),'hex'), 10) AS recruit_referrer_hash,
          (SELECT count(*) FROM referral_attribution_events e WHERE e.candidate_id=p.candidate_id) AS attribution_events,
          (SELECT e.reason FROM referral_attribution_events e WHERE e.candidate_id=p.candidate_id ORDER BY occurred_at DESC LIMIT 1) AS last_attribution_reason,
          count(*) OVER () AS total
     FROM candidate_referral_program p WHERE p.candidate_id IN ($(ids_sql HAS_SNAPSHOT_OTHER_REFERRER))
    ORDER BY 1,2,3 LIMIT 200"
echo "   4b. Snapshot referrer vs the referrer MOSO pushes NOW (legacy_ref.referrer): equal = Recruit is stale only if packs"
echo "       owns by another rule; different = MOSO re-pointed the referral after Recruit froze the first-touch snapshot (D269.1)."
q "SELECT p.decision_source,
          CASE WHEN nullif(btrim(c.legacy_ref->>'referrer'),'') IS NULL THEN 'no_current_referrer'
               WHEN lower(btrim(c.legacy_ref->>'referrer')) = p.referrer_key THEN 'snapshot_equals_current'
               ELSE 'snapshot_differs_from_current' END AS vs_current,
          count(*)
     FROM candidate_referral_program p JOIN candidates c ON c.id=p.candidate_id
    WHERE p.candidate_id IN ($(ids_sql HAS_SNAPSHOT_OTHER_REFERRER)) GROUP BY 1,2 ORDER BY 3 DESC"
echo "   Same referrer hash on many rows = one referrer Recruit credits where packs credits someone else (likely a"
echo "   default/seed owner or a bulk test-data artifact); spread-out hashes = a real first-touch vs current-owner split."

echo "== 5. Recruit-only rows (rcid:): leads with no MOSO record that have a snapshot"
q "SELECT p.program, p.decision_source, count(*) FROM candidate_referral_program p JOIN candidates c ON c.id=p.candidate_id
    WHERE (c.legacy_key IS NULL OR c.legacy_key='') AND p.referrer_key IS NOT NULL GROUP BY 1,2 ORDER BY 3 DESC"

echo "done; outputs in $OUT"
