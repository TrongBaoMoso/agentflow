# HANDOFF — Referrals: one page (agentflow-3mjma, night 04→05/11)

Bao asleep, authorized end-to-end to STAGING, production OFF. Decision record: recruit-be `docs/DECISIONS.md` **D388**
(builds on D268, D269.1, D269.2, D374).

## Resume point

DONE to STAGING (2026-11-04 ~20:45Z = 05/11 03:45 VN). Nothing in flight. Next: Bao reviews `review.html` (parent session publishes it);
then decide prod (be #830 + #863 and fe #698 must go together; both settings stay OFF on prod until Bao says).
Open bug: `agentflow-2odq5` (program catch-up does not persist on staging, so old rows show the "not confirmed" fallback).

## What was decided (Bao, final)

1. One page. LO → own rows ("My referrals"). Manager/Admin → "Referrals", scope switch Mine / All Loan Officers,
   default All. `/referrals` redirects to `/my-referrals?scope=all`.
2. "Entry page" → "Program" from the D269.1 snapshot; fallback = the sign-up page's program, marked "not confirmed".
3. Referral rows keep Eligible from / MOSO check / Amount; LO Recruiter Program rows show only the Qualifying chip.
4. D374 (#830) merged in the same batch.

## PRs

| Repo | PR | What | State |
|---|---|---|---|
| recruit-be | #830 | D374 audience (LO / Manager / Admin) | merged `e1e54de82`, staging (cd-staging 41900391870) |
| recruit-be | #863 | D388: All scope takes the list kit, qualifying filter, CSV program columns | merged `0b1b189b2`, staging (cd-staging 41906531014) |
| recruit-fe | #698 | one page, scope switch, Program/Qualifying, redirect, menu by role | merged `595a2701`, staging (cd-staging 41908036775) |

Reviews: #830 had two APPROVE reviews from its own session (PR comments). #863: correctness APPROVE (findings fixed),
security APPROVE. #698: correctness + security/UX REQUEST CHANGES → all fixed in `b239624d` (weight 500, scope switch
resets referrer/sort, strict Mine for admins, dead code), checked by the lead before merge.
Decision number: **D388** (D386 was taken by open PR #861 mid-run and renumbered in both repos).

## Staging settings flipped (staging only)

| Key | Before | After | Row id | When |
|---|---|---|---|---|
| `referral.program_snapshot_enabled` | false | true | 365b494d-5240-4970-9c77-a9e20b685ce0 | 2026-11-04T19:24:13Z |
| `referral.program_qualification_enabled` | false | true | 4cf99bf3-858d-4297-ac37-0fdc763710cb | 2026-11-04T19:24:14Z |

Done as `bao.trinh+admin@loanfactory.com` (ADMIN, central id e1987874) through the gateway:
`PUT https://gateway.viet18.com/recruit-svc/api/v1/admin/settings/<key>` with body `{"value": true}`.

**Undo:** the same PUT with `{"value": false}` (settings are versioned; a new row supersedes). Script:
`scripts/settings.js referral.program_snapshot_enabled=false referral.program_qualification_enabled=false`
(run with `NODE_PATH=~/.mmi-research/node_modules`, behind `ram-gate acquire chrome`).

## State

- Screenshots: `before/` (staging before any change) and `after/` (after deploy), 1440 and 375. Manager = `victoria.pham+stg`
  (`bao.trinh+manager` is RECRUITER only on staging since 05/11). Scripts: `scripts/` (run with
  `NODE_PATH=~/.mmi-research/node_modules`, behind `ram-gate acquire chrome`).
- E2E evidence: `after/d374-api-after-830.txt`, `after/api-e2e.txt`, `after/extra-log.txt`, `after/extra2-log.txt`,
  `after/manager-export-sample.csv`.
- Test data created on staging (both via the public join pages, webinar Wed Nov 18 seat, fictional 555 phones):
  `bao.trinh+refmerge-prog@loanfactory.com` (QA Mergeprog, HH page `/join/bao-trinhhh`, candidate 44841c96, program
  LO_RECRUITER_PROGRAM, qualifying UNKNOWN) and `bao.trinh+refmerge-ref@loanfactory.com` (QA Mergeref, LO page
  `/loreferrertest/join`, candidate b9307a3b, program PENDING).
- Not covered on staging: the Mine / All switch itself (no test account is both a Loan Officer and Manager/Admin); covered by
  FE unit tests.
- Known limits: All scope with "All time" → gateway 503 after ~5 s (packs read of every owner); the All scope defaults to this
  year and shows a "show this year" error on 503. Program catch-up: `agentflow-2odq5`.

## REDESIGN 06/11 (Bao approved mockup-0611: A1 + B2, B3 as a view; decision D394)

**Resume point:** DONE to STAGING 06/11. Nothing in flight. Next: Bao reviews `redesign-0611/review.html` (parent publishes);
prod = one batch with be #830 + #863 + #876 and fe #698 + #712 + #715 (FF of `production`, release team, Bao's go).

| Repo | PR | What | Merge | Staging run |
|---|---|---|---|---|
| recruit-be | #876 | D394: All scope = Loan Officer referrals only (drop LRP snapshot, or undecided/PENDING snapshot + PROGRAM page; drop every HEADHUNTER referrer via `rbac_grants.email` or `referrer_identity`); `totals_by_referrer.last_referred_on`; /mine unchanged | `d906f1cd2` | cd-staging 42099469676 |
| recruit-fe | #712 | KPI strip (replaces tabs on All), Top referrers, B2 Referrer column, Group by referrer (`group=referrer`, localStorage), no Program/Qualifying on All, em dash, sticky header, pinned Loan officer column | `ed20f5ca` | cd-staging 42099492959 |
| recruit-fe | #715 | fix found on staging: count cells stacked (UnstyledButton), Top referrers at 375 | `bc60631a` | cd-staging 42104661442 |

D-number: D392 was taken by open #874/#875 (now D393 on master), so this is **D394**.
Reviews: correctness + security/UX reviewers, no CRITICAL/HIGH; MEDIUMs fixed before merge (single All read after the stored
grouping, focus to the list after a Top referrers pick, Reset ignores Program/Qualifying on All, header re-sync), D394 names the
intentionally unfiltered internal paths (Ambassador totals, notice digests).

**E2E on staging (API, since 2026-01-01):** Manager + Admin 97 → 71 rows (24 program + 2 Headhunter REFERRAL rows gone; HH had 18),
CSV 97 → 71, no HH key in totals_by_referrer / referrer_options, search "QA Tentrefer" 1 → 0, referrers 20 → 19,
`last_referred_on` present; LO (lo-referrer) /mine 4 → 4; Recruiter and Headhunter on /referrals 403. Evidence:
`redesign-0611/{before,after}/api-e2e-*.json`, screenshots `redesign-0611/{before,after}/*.png`, scripts `redesign-0611/scripts/`
(run with `NODE_PATH=~/.mmi-research/node_modules`, behind `ram-gate acquire chrome`).

Open for Bao: TEAM_LEAD not treated as Headhunter; a Headhunter with neither grant e-mail = key nor identity link would still show;
"Paid this year" sums the paid bonus of people referred in the date range; Top referrers on 375 may scroll its Bonus pending column inside the card.
