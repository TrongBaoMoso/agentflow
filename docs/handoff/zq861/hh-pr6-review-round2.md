# PR6 #532 review round 2 (03/10): security + architect, both REQUEST_CHANGES. Batch into one push.

## Key space (BLOCKER, both reviewers)
The moso-aid roster moso_key is the WEBSAFE datastore key (e.g. "ahNzfmxlbmRlcnJhdGUtbWFzdGVycicLEgVBZG1pbiIcYmFvLnRyaW5oK2hoQGxvYW5mYWN0b3J5LmNvbQyiARA1NzE2MTA0MDI2NTIxNjAw"); packs stamps candidates.origin_owner_key with the Admin keyName (raw login email, e.g. "bao.trinh+hh@loanfactory.com"); staging referrer_identity for that user already holds the keyName. PR6 writes the websafe key into referrer_identity.moso_admin_key and program_members.admin_key_name and joins teamKeys on moso_key → a confirmed member never matches their stamped leads. Also the upsert OVERWRITES the user's lazy keyName row with the websafe key (breaks /referrals/mine: findKey ignores link_source), and lazyLinksOn / conflict cleanup compare across spaces.
Fix: decode the websafe key server-side to the keyName (legacy App Engine Reference, base64url no padding: protobuf `6a <len> "s~<app>" 72 <len> [0b 12 <len> <Kind> 22 <len> <name> 0c] a2 01 <len> "<namespace>"`, varint lengths); refuse anything that is not exactly one path element of Kind "Admin" with a string name. Store the keyName in referrer_identity.moso_admin_key and program_members.admin_key_name; teamKeys, lazyLinksOn and conflict cleanup all compare keyNames. At /link also verify packs referrers/resolve(company_email) reason=ok and resolved key == keyName, else refuse; refuse the link if an existing lazy row for that user has a DIFFERENT keyName. Unit test vector above. IT fixtures: roster key ≠ origin_owner_key (e.g. "ws-hh-1" style websafe vs "hh1@x" keyName) — better a real-shaped websafe key; negative control storing the websafe key → red.

## Security
2. first_approved_seen_at = enable time for everyone already approved → squatters created before pass. Members first seen on the BOOTSTRAP tick = approval time unknown → /link requires override_reason.
3. Identifier change: look the bound account up by user id; else "directory non-empty but the bound account absent from matches" = IDENTIFIERS_CHANGED; document staleness + alert policy until the tick has a directory credential.
4. TEAM_LEAD_INVALID must not abort the tick: drop that edge + alert; abort only on integrity guards.
5. Auto-own conflict check counts only conflicts involving the CONFIRMED user.
6. No external HTTP while holding DB locks: directory/packs first, then lock + re-verify; one directory answer per /pending call.
7. removed_by_hand_at: CLEAR on an explicit relink; document in D202.
8. (same as architect 3) manager exception list; hashed ids in logs.
Hardening → follow-up beads only: DB-level protection program_role_provisions / rbac_grant_history; per-pod rate limits; audit 403s; ProgramInviteReview javadoc (TEAM_LEAD + unscoped approving role).

## Architect
2. Revoke/unlink order: release leads FIRST, then applyProgramRoles, then delete the now-empty grant row in the same tx (an empty grant counts as a live owner in CandidateSlices.unowned()).
3. Manager exception list for held-advanced / non-ORIGIN_OWN leads must EXIST: persist and surface it (Exceptions screen data or a list a manager reads) + a metric; logs carry hashed ids only.
4. Catch-up after link is registered inside an afterCommit callback → never runs; call requestAfterCommit inside the transaction; IT with a hand-held HEADHUNTER.
5. Stale Permissions drawer: expected-roles / version on UpsertGrantRequest so a stale admin save cannot drop a sync-added role and mark it removed-by-hand.
6. First-ever grant race: pg_advisory_xact_lock(hashtext(user_id)) in both the admin PUT and the sync.
7. Per-member savepoint in the tick (or name the hashed failing member).
8. Approved-count guard: moso-aid counts.approved counts any person with an approved row, vs resolved status; a person with an approved row + a newer non-approved row must not make every tick COUNT_MISMATCH. Confirm against moso-aid code (moso-aid master: src/services/lo-program-team.js listRecruitMembers) and pin with a contract test.

## Central role (orchestrator item 1, researched 03/10)
recruit-be CAN grant the central role on staging itself: auth-service `GET http://auth-service.auth-service.svc.cluster.local:8081/api/v1/admin/rbac/roles/by-code?app_code=RECRUIT&code=HEADHUNTER` then `POST .../api/v1/admin/rbac/accounts/{userId}/roles` {"role_ids":[...]} (additive; path = user_id). AdminAuthorizationFilter (auth-service AdminAuthorizationFilter.java:98-115) demands ACCOUNT#ADMIN only when X-User-Authorities is present, i.e. on gateway traffic; a cluster-internal call with NO Authorization and NO X-User-Authorities header passes (tera-be ThirdPartyAuthServiceImpl.java:226-245 and ai-hr-be internal/platformrbac/admin.go:243 already do this). Implement it: new property recruit.central-roles.auth-service-url (helm staging value = the cluster URL; a .chart-lint-allow entry like the other east-west URLs), never forward a user's headers, call it after the /link commits (and on revoke remove? NO: only add on link; removal stays manual, document), failures logged + surfaced as central_role_needed=true on the /link response and the pending list. Caveat in D202: this relies on the network being the trust boundary (the filter calls it "not the end state"); if auth-service later requires an X-Api-Key, it breaks; NetworkPolicy reachability from ns recruit-be unverified (check with a read-only probe after deploy). The roles to add: HEADHUNTER or TEAM_LEAD (by code, app RECRUIT) matching the reconciled recruit role.

## Central role — orchestrator conditions (03/10, binding)
(a) Behind its own setting program_sync.central_role_grant_enabled, seeded FALSE (in V208; validated boolean). Staging is switched on only after the reviewers pass it. PRODUCTION stays manual until the platform team gives recruit a proper credential (a `recruit:` SERVICE_KEYS entry in api-gateway-v2) — say so in D202.
(b) Additive only: exactly the app RECRUIT role mapped from the member's level (HEADHUNTER or TEAM_LEAD), called once after /link commits. A failure sets central_role_needed (on the /link response and the pending list); never retried in a loop.
(c) Never send X-User-Authorities, Authorization or any forwarded user identity; one audit row per call (who/what/outcome, ids only).
(d) Removal stays manual and documented: a revoked member keeps the central login but holds no recruit roles, so recruit fails closed.
