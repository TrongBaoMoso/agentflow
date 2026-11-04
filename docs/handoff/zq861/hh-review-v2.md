# HH design v2: combined review (architect + security), both AGREE-WITH-CHANGES
Bao decisions override reviewers: Q3 -> HH MAY re-claim after release (architect suggested no; Bao chose yes). Q1/Q4/Q5 as recorded in bead notes.

## MUST FIX before any merge
1. Read vs write scope split. Read routes use scope (owner OR collected OR team). Every non-GET route naming a candidate requires owner_id == me for scoped actors (404 otherwise); Team Lead does NOT widen writes. Covers update, transition, activities (also stops resetting another owner's contact clock via stampOutboundTouch), labels, offers request, conversation ensure-cast/join. IT: mutate an in-scope row owned by someone else -> 404.
2. Bonus-relevant fields: scoped actors cannot edit units12mo, careerProduction, loansSinceAnchor, referredSource/Section/referralChangeReason. HeadhunterInviteReview reads provenance (Modex vs edited). First-touch credit query orders by server created_date; clamp/ignore client occurredAt for human actors.
3. Multi-role escalation: "widest role wins" must not lift scope via unrelated NULL-scope roles (HR/ONBOARDING/LICENSING/ACCOUNTING). Only roles that already hold all HH permissions (RECRUITER, MANAGER, ADMIN, LO_SUPPORT, OFFICER_RECRUITER) lift it; otherwise stay scoped. Invite review keys on program membership/role code, not on "currently unrestricted" (so every HH invite still needs approval). Sync flags members who also hold an unrestricted role.
4. Fail-open on no role: anyone with a program_members binding or program_role_provisions row is scoped (empty keys) unless explicitly unrestricted.
5. moso-aid directory failure must not null emails: moso-aid returns 503 on directory failure, AND recruit keeps the old value (COALESCE). Use company_email ONLY (never the applicant-typed email); null -> no bind/no key resolution; don't silently overwrite a bound row's email; re-resolve admin_key_name when the email changes; verify the packs-resolved key equals the member's own key. Confirm SSO identifiers are verified emails only (find the producer).
6. Flyway: merge recruit-be #512 (V181-V182) first, then yours V190-V193 in order. Check D190/D191/R40 are free at merge time (#512 uses D187).

## Before program-sync is enabled anywhere
7. Partial roster guard: moso-aid sends a count; refuse ticks revoking > N or > X%; require 2 consecutive ticks before revoke; alert when the last success > ~30 min; on-demand tick hinted by moso-aid on approval changes. Document manual role removal as the emergency revoke.
8. rbac_grants lost update: SELECT ... FOR UPDATE or a narrow array update.
9. Adopt pre-existing hand-granted HEADHUNTER grants of bound approved members as provisioned on the first enabled tick; list the rest.
10. lf-homepage proxy (loAdminProxy.ts): admin identity is an unverified x-moso-user-id (agentflow-048o) -> hard prerequisite before program-sync in prod; require body.program_id === query program_id; overwrite body.actor with the authenticated actor.
11. Team lead hygiene: moso-aid clears assignments when a lead leaves the team-lead level (with history); collectorKeys requires member.teamLead(); server-side rule on who can be a member.
12. FE nav must deploy before program-sync is on (SEEDED_ROLE_CODES in recruit-fe recruitNav must include HEADHUNTER/TEAM_LEAD with audiences + EXPECTED_BY_ROLES rows). Better: nav-context returns row_scope + allowed surfaces.

## Also
13. Separate idle window setting for HH (headhunter.origin_own_idle_business_hours). Note: hot.idle_release_enabled is OFF in prod (D125/D126) -> auto-owned leads stay with the HH until then; say so in the PR.
14. "My leads" = GET /candidates (scope-filtered), not Hot.
15. Team Lead credit conflict: compare against the requester's own key only.
16. Freeze approval reasons on the REQUESTED ledger row.
17. Stamp owner can change: verify in packs whether the stamp is first-write-wins; if not keep the first in recruit and route changes to a manager. Late-arriving stamp race: measure the delay (staging+prod read-only); hold /join and /recruit arrivals out of the claimable pool for a grace period, or have packs stamp before the push.
18. Catch-up auto-own pass when a member gets bound/provisioned (unowned, never-owned rows they collected).
19. "Provisional attribution" wording in D190/javadoc; final credit stays MOSO/Accounting.
20. Backfill stamps for rows packs already stamped before V190 (read-only re-export/reconcile), and a manager bulk-transfer for genuine old /join leads.
21. Remove GET /api/v1/users from the HH allowlist (or filter it). Cap the SSE emitter lifetime. Document /referrals/mine showing self-declared referrals. Per allowlisted route with an id variable, encode the id var + a sweep that out-of-scope ids return 404. Require https for moso-aid-base-url unless cluster-local.
22. Split into PRs in this order: (1) stamp persistence V190 (no behaviour change) -> (2) roles + row_scope + interceptor read/write split V191 (dark) -> (3) invite reasons V192 + FE labels -> (4) auto-own + catch-up behind its own flag -> (5) moso-aid roster/team + lf-homepage picker -> (6) program sync V193 (flag off) -> (7) recruit-fe nav + My leads (before 6's flag flips).
