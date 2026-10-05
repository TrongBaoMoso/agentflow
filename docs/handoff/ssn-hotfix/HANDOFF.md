# SSN + logging hotfix (lf-homepage / lo-homepage) — handoff 2026-10-05 ~18:05 VN

Source report: ~/Desktop/lf-homepage-ssn-and-logging-2026-10-05.md (from Tan Thanh). Beads: agentflow-qu3b8 (SSN, P0), agentflow-98wxu (404/logs/500s).
Bao's decisions (05/10): ship to production today; leave old Cloud Logging entries to expire (no purge); packs backend = MOSO legacy, not touched.

## DONE (measured)
- lo-homepage SSN: #864 master, #865 release, #866 produciton-v2 — LIVE prod (image 4f5eb3b8). LO site www.loanfactory.com/thessyonyenedum: SSN 1 -> 0 on /, /about-us, /contact-us, /texas-disclosures, /branches/<slug>.
- lo-homepage cleanup: #867/#868/#869 — LIVE prod (413b81ab). 500s 7.1% -> 0.4% of requests; JSON log lines: 4xx WARNING, 5xx ERROR (Cloud Logging parses severity).
- lf-homepage SSN: #2612 merged master — staging (43e4485c) SSN 0 on /, /find-loan-officers, /teams, /branches, branch page, profile page (was 1/1/1/1/2/2).
- lf-homepage SSN production: #2613 LIVE (image 9edaf8ce, revision lf-homepage-00726-lqb, 100%). Measured 18:15 VN on www: SSN 0 on /, /find-loan-officers, /teams, /branches, /branches/yuma-arizona-32976087010, /mortgage-expert/anne-nguyen-2381618 (/ measured 5x = 0; one early read during rollout hit an old instance).
- lf-homepage cleanup: #2614 merged master; staging build 19d7d4a7 SUCCESS (not yet measured).

## TODO on resume
1. ~~Confirm lf prod deploy~~ DONE. `gcloud run services describe lf-homepage --project lender-rate --region us-central1 --format='value(spec.template.spec.containers[0].image,status.latestReadyRevisionName,status.latestCreatedRevisionName,status.traffic)'` -> image tag 9edaf8ce, ready==created, 100% latest.
2. ~~Measure prod~~ DONE (presence only, never print values):
   `curl -s -A 'Mozilla/5.0' https://www.loanfactory.com/ | grep -o '\\"SSN\\"' | wc -l` -> expect 0; also /find-loan-officers, /teams, /branches, a /branches/<slug>, a /mortgage-expert/<slug> (from sitemap.xml?sub=loan-officers).
3. Reply to Thành (Slack) with the numbers. Draft: "lf + lo đã lên production: SSN trong HTML về 0 (đo trên /, find-loan-officers, teams, branches, mortgage-expert, LO site). console.log AboutMe/BranchCard đã xoá. Thêm: 404 thay vì 500 cho id cũ, log 1 dòng JSON có severity (4xx WARNING, 5xx ERROR). API packs để nguyên."
4. Measure lf staging cleanup (lf-homepage-master-233682574497.us-central1.run.app): /our-lenders/axos-bank-5994186750820352, /teams/power-up-mortgage-group-e617c025f15-565, /learn-center/article/undefined -> 404; valid lender/team 200; /health/backend 200; /zz-unreleased and /vi/zz-unreleased bare 404 (0B); /sitemap.xml 200.
5. If OK: merge #2615 (cleanup -> production), wait for build, measure on prod run.app https://lf-homepage-444859640964.us-central1.run.app (www masks status via App Engine 302).
6. Close beads qu3b8 + 98wxu with evidence; tell sessions agentflow-15, agentflow-58, agentflow-9d "done, heavy jobs OK again".
7. Cleanup: remove worktrees .worktrees/{lfh-ssn,lfh-ssn-production,lfh-logs,lfh-logs-production,lo-ssn,lo-ssn-release,lo-ssn-produciton-v2,lo-logs,lo-logs-release,lo-logs-produciton-v2} (each has a copied .env — gitignored).

## Notes
- lf-homepage Repo Owner verdict for SSN never arrived (agents lf-owner-ssn / lf-owner-ssn-fast stalled); merged on: security reviewer MERGE + identical lo change approved by lo Repo Owner and live + local/staging measurement. Bao asked to hurry.
- Follow-up beads: agentflow-lzumx (browser fetches still pull full records), agentflow-tmwrf (over-shared props, no SSN), agentflow-k3ywl (/mentorships 500).
- Thành said "cái ssn a Khải fix rùi" — at 17:50 VN lf prod HTML still had SSN (1 on /, 2 on profile), so the backend was NOT yet stripping it.
