#!/bin/bash
for i in $(seq 1 140); do
  ok=1
  for s in recruit-be-recruit-zoomgo-api-key recruit-be-recruit-zoomgo-company-id; do
    gcloud secrets get-iam-policy $s --project lenderrate-master --format='value(bindings.members)' 2>/dev/null | grep -q recruit-be-deploy || ok=0
  done
  [ $ok = 1 ] && { echo "GRANTED $(date)"; exit 0; }
  sleep 300
done
echo "TIMEOUT $(date)"
