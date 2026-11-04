# Bao decisions, 02/10 night (zq861 Headhunter)
(Recorded here because bead agentflow-zq861.10 notes hit the Dolt field-size limit.)

1. Run end-to-end till morning, staging; PR7 = no new page: HH does Vic/Brayan's work; reuse Hot leads / Today / candidates / My invites with row scope; HH/TEAM_LEAD get the recruiter nav via nav-context; "Collected by me / my team" filter as URL state (/hot?collected=me) so a dedicated page later is just a route/menu link. TERA patterns, no mockup.
2. /join fee fix: production approved. Orchestrator: only the lf-homepage /join change goes to production (pinned-SHA PR, after staging verify + lf-homepage Repo Owner); recruit-be stays staging (a recruit-be prod promotion carries everything; #322 process).
3. Brainstorm: HH = recruiter flow (training, OB join after LO join, HR fields) + credit (bonus) on onboarded LOs; Vic/Brayan may also become HH. Credit follows the origin stamp (program member at the time).
4. Change #520/D194 → follow-up PR "PR3d": (a) manager review forced only when the LEAD is program-collected (collecting origin stamp), not for every invite by a program-role holder; (b) drop the 403 "program role + OFFER_APPROVE can't request": a manager+HH may request; another manager approves (no-self-approval stays).

5. (supersedes #520 forced review and item 4a) Invite approval: HH works like a regular recruiter under D64 — LO qualifies (refined) → invite sends without approval; not qualified → request manager approval. The approval card still shows the program reasons when review happens. Self-approval stays blocked; a manager+HH may approve another member's program invite. (Units/loans are locked for scoped actors, so an HH can't inflate D64 inputs.)
6. PR6 binding: user-service has a public register API that can create a "verified" account with any email (Bao: legacy, skip the fix), so recruit must NOT auto-bind on the login email. Interim: a recruit admin (RBAC_MANAGE holder, e.g. the person who manages Permissions today) confirms each new program member ↔ recruit account link once in recruit's admin screen; after that the sync grants/updates/revokes roles automatically. Auto-bind only once auth-service can mark verified (IdP) identifiers.

## Orchestrator calls made while Bao slept (flag in the morning report)
- PR3d: program offers auto-send only when units12mo is Modex-verified; self-reported figures → manager review (LOANS_UNVERIFIED). Behind setting program_invite.require_verified_loans (seed TRUE). Since Modex isn't connected yet, every HH invite waits for a manager until Bao flips it to FALSE (pure D64 like recruiters). Reason: bonus incentive to inflate self-reported loan counts (security review).
- PR3d: an approver with a credit interest (own collected lead, or the collector's team lead) can't approve (403); reciprocal approvals between two manager+HHs allowed but reported.
- PR6: only admin-confirmed links count for Headhunter scope/auto-own/credit; lazy SSO links serve the referrals view only (bead agentflow-rsnyo). referrals.enabled must stay off in production until then.

## Shipped overnight 02→03/10
- recruit-be #529 (/join fee fix, V205/D200) merged b194294e + staging.
- lf-homepage #2606 (/join stops sending waive_startup_fee) merged 490ed230 → staging; real /join E2E on staging PASSED (lead S0, +hh auto-owned).
- lf-homepage #2608 PRODUCTION promotion (only 490ed230) merged 1912760d (Bao approved). Onboarding team: accepted /join leads now get the pay link in the daily onboarding email.
- lf-homepage #2607 (team-lead picker) merged 4918538d → staging only (prod gated until 048o).
- In review / owed controls: recruit-be #530 (join-fee test follow-ups), #531 (PR3d).

## Bao, morning 03/10 (answers to the overnight calls)
- (1) HH = regular recruiter: qualified LO → invite sends; not qualified → manager approval. → program_invite.require_verified_loans OFF (staging set false; recruit-be #533 changes the default, V208/D203). Frozen review kept for audit.
- (2) TEAM_LEAD with approval rights may approve/waive for their team's leads like a normal manager; only self-approval stays blocked. → interim TEAM_LEAD refusal removed in #533.
- (3) Daily onboarding email: /join leads are now treated exactly like a recruiter's lead (pay link after the 1-1 unless a manager approved a waiver). Nothing special for the onboarding team.

## Status 03/10 midday
- Shipped staging: recruit-be #531 (PR3d), #533 (recruiter parity, team leads may approve; Bao 03/10). #530 merged (tests).
- PR6 recruit-be #532 (program sync + admin-confirmed links): REQUEST_CHANGES from both reviewers. Blocker: key-space mix-up (moso-aid roster key is the websafe key; packs stamps use the keyName). Fix: decode websafe → keyName server-side + packs resolve check at /link; plus ~12 items (lead release order, exception list, catch-up after link, stale drawer, grant race, per-member savepoint, count guard contract, approval-time bootstrap, identifier change, team-lead edge, auto-own conflicts, locks vs HTTP).
- Open for Bao: central RECRUIT login role for linked members (recruit has no credential to assign it; admin assigns by hand until platform provides one).
- RAM is the bottleneck for local Testcontainers controls; CI is the IT gate.

## Orchestrator call 03/10 night (per Bao's "HH = recruiter on own leads")
- recruit-be #545: HEADHUNTER/TEAM_LEAD get CHECKLIST_READ + CANDIDATE_LEGAL_NAME_CONFIRM (V210), and CANDIDATE_ARCHIVE / SUPPRESSION_MANAGE only for per-candidate routes checkable against owned rows; CANDIDATE_CREATE stays off (D201).

## 05/10 — zq861 Headhunter DONE ON STAGING (orchestrator agentflow-cd)
Final browser re-check PASSED on staging (recruit-be 5d8890db, recruit-fe b15d543c).
Merged + on staging after the last summary: recruit-be #545 (drawer routes, V210/D205), #548 (created_date envelope, fail-closed dates), #550 (lazy candidates + background recheck, V211); recruit-fe #347 (HH UI), #359, #361.
Open for Bao (decisions, not blockers):
- program_sync.mode is DRY_RUN on staging; switch to APPLY when you want roles granted/revoked automatically (+hh's link is confirmed; its HEADHUNTER grant is still hand-made).
- Production rollout of the recruit app (all of the above) needs: the #322 recruit-be promotion process, 048o fixed, packs #3590 released, packs system actor + MOSO app/namespace pins on prod, a DRY_RUN first-tick review, referrals.enabled kept off until lazy links are demoted.
Follow-up beads (small, not urgent): zq861.17-.27 (DB protection for provisions/ledger, shared rate limiter, audit 403s, SCHEMA regen, linked-members view, FE nits, scoped-allowlist diff in CI).
