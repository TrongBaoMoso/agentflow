# agentflow-ahgee — /api/lo-setting 500s from MOSO 502 bursts

## Measured on production 03/11 (before fix)
- moso-aid `/api/lo-setting`: 182 × 500 in 24 h (~1 in 1,000; 15 of 15,067 in 2 h), all `MOSO API error (502)`, fast (17–70 ms), in bursts of 5–6/min.
- 38 of 71 (12 h) coincided ±3 s with a 5xx page on lo-homepage-v2 (LO sites) → visitors/crawlers saw error pages.

## Fix — moso-aid #209 (master 9aab895) → STAGING rev moso-aid-00198-sfw (03/11)
- Retry 502/503/504/network twice (150 ms, 450 ms); then serve that key's last good GetOp answer (≤ 1 h, LRU 5000, per instance, copy). 400/404 still 404; 401/403/429 not retried/masked; key URL-encoded, never logged.
- Tests 14 new (5 RED on old code), full suite 1053/1053. code-reviewer + security-reviewer APPROVE.
- Staging smoke: real staging LO (patricklotest) 60/60 × 200, unknown key 404, LO page 200. A MOSO outage cannot be forced on staging — covered by unit tests.

## Production: PROMOTED 03/11 (Bao "ok đưa đi") — moso-aid #210 → pro 5c2846d → rev **moso-aid-00125-pfx** (100%), live from ~2026-11-03T08:20:30Z.
Smoke right after: Suong lo-setting 30/30 × 200, unknown key 404, join-page 200, suongloanofficer.com /, /join, /loan-officer 200, no ERROR logs.
Baseline before (24 h): 174 × 500, 0 stale served. Bao ran check-prod.sh 300 before deploy: A 300×200, B 300×200.
Expected after prod: part C 500s drop sharply, "served the last good copy" > 0.

## Separate finding (not this bead)
lo-homepage-v2 prod answered 1,208 × 5xx in 24 h, mostly `/mentorships` 500 (144 in 12 h) and `sitemap.xml` 504 — unrelated to lo-setting.
