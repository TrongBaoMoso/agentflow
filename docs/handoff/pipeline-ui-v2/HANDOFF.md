# Pipeline UI v2 — handoff (overnight 18→19/10/2026)

Mockup approved by Bao: https://claude.ai/artifact/XJAtE1LQvKZcS6jdVjumbG (copy: `index.html` here, repo copy `recruit-fe/docs/mockups/pipeline-v2/`).
Beads epic: `agentflow-4k8xs`.

## Shipped to PRODUCTION (recruit-fe)

| PR | What | Prod commit |
|---|---|---|
| #517 | Candidate cell = avatar/name/NMLS link (like Hot); Candidate col fixed, Source flexible; blue verified badge (shared LeadSourceCell → Hot/Cold/Exceptions/Dormant too); Stage = 6 segments (option A); Status labels Active/Nurture/Archived/Blocked; Today Loan officer col 220px | 304a53bd |
| #516 | Row ⋯ menu = Change stage New lead/Engaged/Offer only + note (no copy email/phone); "Not contacted" amber chip for owned + never touched; Claim in place like Hot (Yours + Call/SMS/Email/Conversation + Log result strip as a 2nd row); Tera-style bulk bar with reasons | 11e5603b |
| #518 | HR-style SOLID stage tabs; Not started (S0) tab; folded Not started strip on Board; header sort (Last touch, Follow-up) like Hot; More filters removed → Source + Label inline; Reset filters in bar + empty state; Sort select in cards/board | f7bfa1b0 |
| #519 | Compact filter selects (one row at 1440), one-line Not contacted chip (Last touch 124), board scroll | 9f16c990 |
| #521 | Board no longer scrolls the page (position: relative on the scroller; sr-only spans escaped) | 303d1550 |
| #522 | Not started strip count "5K" fits | a0a7e345 |

Final widths at 1440 (table wrapper 1108px): check 44, Candidate 184, Source flex (≥116), Stage 120, Status 108, Last touch 124, Follow-up 156, Owner 120, actions 136.
Every PR: 2 independent reviewers APPROVE + CI green + staging screenshots before prod. Screens: scratchpad `pw/verify/{pr1,pr3,pr2c}`.

| #520 | "Owner left · name" + Claim for a lead whose owner has no grant row; "No owner yet" sends `unowned=true` (table + board); drawer offers Claim for such a lead | 6456556c |

Production serves the same `/pipeline` page chunk as staging (`page-48020216a9ab4e8b.js`, checked 19/10 ~05:30).

## Shipped to PRODUCTION (recruit-be)
- #672 (1712afab): `owner_active` (true/false/null) on candidate DTOs; `GET /candidates?unowned=true` = no owner OR owner without an `rbac_grants` row; Claim accepts such a lead (CAS re-checks in SQL; live owner 400, lost race 409); scoped Headhunter/Team lead can claim one inside their collected scope; the departed owner's open follow-ups move to the claimer. This also fixes a live Hot/Cold bug: Claim on these rows used to return 400 "already owned".
- Verified on staging via API: `owner_active` present; `unowned=true` 7174 vs 7535 rows. Staging has NO departed-owner rows today, so the claim path itself is covered only by `OrphanedOwnerSliceIT` (negative control in CI: 4 ITs went red with the fix reverted, temp PR #673 closed).
- The production deploy also carried #670 (test-only) and #671 (docs), and the build picks up tera-core #60 (error bodies no longer carry stackTrace/classException) — true for any recruit-be deploy from now on.

## Side actions
- recruit-be #670 (Triet's test-only PR for tera-core #60 error bodies) merged to unblock recruit-be CI; comment left on the PR.

## Known / not done
- Batch claim ("claim next N") and auto-claim on a logged activity still require owner_id IS NULL (follow-up bead under agentflow-4k8xs).
- At 1280 the Pipeline table scrolls inside its own box (~160px) — pre-existing, page itself does not scroll.
- Nurture/Archived leads that raise a hand again show on Hot but not in Pipeline's default (Status = Active) — by design, agreed with Bao.
- Board fires one `stage eq S0` read while the six-stage flag loads (agentflow-4k8xs.6, P3).
- Batch claim / auto-claim-on-activity on departed-owner rows (agentflow-4k8xs.5, P3).
