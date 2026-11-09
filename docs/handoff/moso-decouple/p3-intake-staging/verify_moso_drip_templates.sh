#!/bin/bash
# Read-only: prints the MOSO prod Datastore copy (subject + sender + body) of the three webinar drip templates, so they can be
# compared with recruit-be V355/V356 (tpl-lo-webinar-drip-1m/2m/3m). The templates are keyed by NAME (no `name` property),
# and the subject is the property `title`. Needs a live `gcloud auth login --update-adc` (Bao's account).
# Usage: bash verify_moso_drip_templates.sh <out-dir>
set -euo pipefail
OUT=${1:-./moso-drip-templates}
mkdir -p "$OUT"
for n in webinar_registration_after_1_month webinar_registration_after_2_months webinar_registration_after_3_months; do
  bash ~/.cache/claude-recruit/dsq_prod.sh "SELECT * FROM Template WHERE __key__ = KEY(Template, '$n')" > "$OUT/$n.json"
  python3 - "$OUT/$n.json" "$OUT/$n" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
rows = d.get("batch", {}).get("entityResults", [])
print(sys.argv[2].rsplit("/", 1)[-1], "rows:", len(rows))
for r in rows:
    p = r["entity"]["properties"]
    val = lambda k: p[k].get("stringValue") if k in p else None
    for k in ("title", "subject", "sender", "reply_to", "from"):
        if k in p:
            print(f"  {k}: {val(k)}")
    body = val("content") or val("body") or val("html")
    if body:
        open(sys.argv[2] + ".html", "w").write(body)
        print("  body ->", sys.argv[2] + ".html", len(body), "chars")
EOF
done
