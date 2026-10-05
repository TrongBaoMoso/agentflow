# SSN + logging hotfix (lf-homepage / lo-homepage) — CLOSED 2026-10-05 ~19:45 VN

Source report: ~/Desktop/lf-homepage-ssn-and-logging-2026-10-05.md (from Tan Thanh). Beads agentflow-qu3b8 (SSN) and agentflow-98wxu (404/logs/500s): both CLOSED.

## Live on production (measured)
- lf SSN #2612/#2613 (image 9edaf8ce): SSN key count 0 on /, /find-loan-officers, /teams, /branches, a branch page, a /mortgage-expert page (was 1/1/1/1/2/2).
- lo SSN #864/#865/#866 (4f5eb3b8): 0 on an LO site's /, /about-us, /contact-us, /texas-disclosures, /branches/<slug> (was 1 each, 2 on branch).
- lf cleanup #2614/#2615 (0e69d6a5) and lo cleanup #867/#868/#869 (413b81ab): stale ids 404 instead of 500; unreleased pages bare 404 (also /vi/); /health/backend, sitemap, robots, favicon, _next still 200; one JSON log line per backend error (4xx WARNING, 5xx ERROR). lo 500s 7.1% -> 0.4%.
- All hotfix worktrees and temp files removed.

## Open
- agentflow-kglwq (P1, packs, NOT ours): production findLenders returns 0 lenders since 07:33Z, right after App Engine default version c (packs 3.64.1, 07:26Z). /our-lenders and every lender page empty/404 on www and LO sites. Needs Bao to hand to the packs owner.
- Follow-ups: agentflow-lzumx (browser fetches still pull full records), agentflow-tmwrf (over-shared props, no SSN), agentflow-k3ywl (/mentorships 500).
- Thanh not yet replied to (draft in the session).
