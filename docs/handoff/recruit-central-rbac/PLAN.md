# Recruit roles and permissions move to the central auth-service

Bead: `agentflow-y89cf` (P1). Related: `agentflow-5ryt2` (tera-core routes with no check).
Status: PLAN, waiting for Bao's approval (22/10/2026).

## Why

auth-service #176 (20/10) turned on `APP_ACCESS_ENFORCE="*"` on staging. `/authorize` now refuses
a PRIVATE app to anyone without a central `account_role` whose `role.app_code` is that app
(`AppLookups.heldRoleCodes`). Recruit kept its grants only in recruit-be `rbac_grants`, so
people with full Recruit access were refused at sign-in (APP_ACCESS_DENIED).

Product decision (Bao after a call with Tai, 22/10): the central auth-service is the source of
truth.
- Recruit **defines** its roles and permissions and registers them with auth-service.
- People are **assigned** roles in Account → IAM by hand, or by the HR app when an employee is
  onboarded.
- Recruit only **shows** a person's roles and permissions; it no longer grants them.

LF IQ already works this way.

## Decisions taken (22/10, Bao)

| # | Decision |
|---|---|
| 1 | Roles HR, LICENSING, ACCOUNTING and OFFICER_RECRUITER are removed. Roles kept: ADMIN, MANAGER, RECRUITER, ONBOARDING, HEADHUNTER, TEAM_LEAD, LO_SUPPORT. |
| 2 | Permissions are fine-grained: one central permission per action, each owning its API routes (format 2, `tera-docs/auth/RBAC_PERMISSION_MODEL.md`). |
| 3 | Duplicates queue (`GET /duplicates`) is owned by `CANDIDATE_MERGE` (Manager, Admin). |
| 4 | "Move despite missing fields" is removed: the `override` transition path, `CANDIDATE_OVERRIDE_GATE`, and both `stage_requirements` rows (S6 `nmls_id`, S6 `sponsor_states`, inactive since V041). Moving a stage has no required fields; required data is enforced by the loan officer's form. Supersedes D35 and V041. Measured 22/10: `stage_history.override_gate = true` has 0 rows on staging and production. |
| 5 | Bulk transfer: a recruiter can release their OWN leads (scope SELF), and a manager can move anyone's leads (scope ALL). |
| 6 | Licensing state rules are removed (4 endpoints, `LICENSING_RULE_MANAGE`, 16 seed rows, no FE screen). Sponsorship write actions are removed (0 rows in `sponsorships` on both environments, no FE screen), including the manual "Loan Officer granted access" action. Recruit only reads `access_granted_at` (from the MOSO push) and the sponsored status. Licensing works in the HR app (D304). |
| 7 | manhadmin is RECRUITER only. |

## Done already (staging, 22/10)

- Created central roles HEADHUNTER, TEAM_LEAD and LO_SUPPORT (format-2 setup, `reconcile:false`).
- Added 19 central `account_role` rows, so every `rbac_grants` holder has the matching central
  role. Nothing was removed at this step.
- Granted Chi's 7 test accounts one central role each. All 7 real logins passed.
- manhadmin: removed central MANAGER, keeping RECRUITER.
- Removed the central RECRUIT roles of 29 accounts: bulk-created 03/09, never signed in, and
  holding no Recruit grant.

## Inventory

Files in this folder: `endpoints.tsv`, `permissions.md`, and the scripts that built them, read from
recruit-be `origin/master` at cb175805.

- **Endpoints:** recruit-be serves 214 endpoints across 80 controllers; tera-core adds 8 more. An
  independent count of the mapping annotations also gives 214.
- **Permissions:** 48 permission codes are referenced in code, and every one gates at least one
  endpoint.
- **27 endpoints are gated by more than one permission.** `permissions.md` §2.2 proposes an owner
  for each.
- **14 endpoints have no permission check.** They are notifications, `/me/*`, `/admin/rbac/me`,
  `/referrals/mine`, and leave/unfollow.
- **Some checks use role codes instead of permissions** (§2.7). Examples are `DEPARTMENT_ROLES` in
  `ProgramLeadVisibility`, ONBOARDING `/offers/mine`, and TEAM_LEAD `collected=TEAM`.
- **Row scope** for HEADHUNTER and TEAM_LEAD is computed by comparing permission sets in
  `rbac_roles` (`CandidateRowScopeService:233-316`).

## Target design

```
Account IAM / HR app ──assign role──▶ auth-service (account_role, overrides ADD/BLOCK)
                                           │  ▲ seed (format 2): roles, permissions, endpoints
                     ACCOUNT_ROLE_CHANGED  │  │
                                           ▼  │
recruit-be ── per request: GET /rbac/users/{actor}/permissions?app_code=RECRUIT (cached ~60 s)
          ── local read model `rbac_grants` = mirror of central roles (for OTHER people:
             pickers, owner row scope, team membership), refreshed by the event, by the actor's
             own request, and by a periodic reconcile
```

- **Permission checks.** The calling person's checks (`hasPermission`, `require`, scopes) are
  answered from **their central permission set**, which includes per-person ADD/BLOCK overrides
  and expiry. Code keeps calling `AccessControlService`, and only its source changes.
- **Other people's roles.** Questions about *other* people ("who are the recruiters", "is the
  owner a program member") read the **mirror**. The mirror is never written by a Recruit screen.
- **Scope.** Owner-or-manager rules become the permission's scope:
  - RECRUITER holds SELF.
  - MANAGER holds ALL.
  - TEAM_LEAD holds TEAM.
  - HEADHUNTER holds SELF on candidate permissions.

  Row-scope code reads the scope instead of comparing permission sets.
- **One catalog file.** `src/main/resources/rbac/recruit-rbac-catalog.json` (format 2) is the
  only definition. Boot loads it into `rbac_roles`, and the deploy pushes it to auth-service
  (`reconcile:true` only from the environment that owns it).
- **Coverage test.** A unit test enumerates every `@*Mapping` and fails if an endpoint is missing
  from the catalog, appears twice, or the catalog names a route that does not exist. This is the
  "nothing missed" guard.
- **Switch.** The flag `recruit.rbac.source = local | central` (env `RECRUIT_RBAC_SOURCE`) lets
  staging run central while production stays local until it is seeded.

## Phases (each is its own PR into master, merged only when green)

| Phase | Repo | Content |
|---|---|---|
| P1 cleanup | recruit-be | Remove the override path, `CANDIDATE_OVERRIDE_GATE` and both `stage_requirements` rows. Remove the licensing rules and sponsorship write actions. Duplicates owned by MERGE. DECISIONS entry superseding D35/V041 + comments/docs. No permission source change yet. |
| P2 roles | recruit-be | Migration dropping HR / LICENSING / ACCOUNTING / OFFICER_RECRUITER (and their grants), `DEPARTMENT_ROLES` reduced to ONBOARDING, checklist `*_MANAGE_<DEPT>` collapsed to one `CHECKLIST_*_MANAGE` held by ONBOARDING. |
| P3 catalog | recruit-be | Format-2 catalog file and the coverage test. Route splits for the conflicts that need them (`GET /candidates/unowned`, offer approve-now). The 14 unchecked endpoints are owned by baseline `RECRUIT_ACCESS`, which every role holds. |
| P4 central source | recruit-be | Central permission resolver with cache, mirror sync (event consumer + per-request refresh + reconcile job), scope-based row scope, flag `recruit.rbac.source`. Staging switches to `central`. |
| P5 screens | recruit-fe | The Permissions/Access screen becomes read-only, with a "Manage in Account IAM" link. Grant editing and the bulk grant are removed. |
| P6 production | ops | Push the catalog to production. Copy the 9 production grants to central (minus the removed roles), switch `recruit.rbac.source=central`, then ask Tai to put RECRUIT in the production enforce list. |

## Production impact

Production `rbac_grants` (22/10) holds 9 people:
- bao.trinh and it.dept (ADMIN);
- brayan and seth.august (RECRUITER);
- victoria.pham (MANAGER);
- miley.dau (ONBOARDING);
- dave.hoang (HR), dung (LICENSING) and rosaline.pham (ACCOUNTING).

The last 3 lose Recruit access when their roles are removed, which is decision 1. Production
has no central RECRUIT roles yet and the catalog has never been pushed there, so P6 must push
before any enforce.

## Integration answers (researched 22/10, no question left for Tai)

1. **Credential: none needed in-cluster.** auth-service `AdminAuthorizationFilter` refuses
   `/api/v1/**` admin routes only to requests that carry `X-User-Authorities`, which the gateway
   sets from a user token. Calls with the header ABSENT are internal and pass. tera-be,
   user-service, ai-hr-be and the account assistant reach the admin routes this way today (the
   class javadoc; `tera-docs/auth/RBAC_API_DOCS.md` integration notes).
   - recruit-be calls `http://auth-service.auth-service.svc.cluster.local:8081` directly, the same
     host the gateway uses (`api-gateway-v2/config/services*.yaml`), never through the gateway.
     This covers the catalog push (`/admin/rbac/roles/setup`), the reconcile
     (`/admin/rbac/account-roles/search`) and the runtime read (`/rbac/users/{id}/permissions`).
   - recruit-be and auth-service share a cluster on both environments.
   - The javadoc names a future `X-Api-Key` for internal callers; when that ships, recruit-be adds
     the key.
   - `RBAC_SETUP_TOPIC` is the Pub/Sub alternative for the push, but recruit production runs with
     Pub/Sub off, so HTTP is the path.
2. **Events: optional.**
   - **Not used on production.** `ACCOUNT_ROLE_CHANGED_TOPIC` is published after every role
     grant/revoke (`AccountRoleInterceptor`, `AccountRoleEventPublisher`). Its own javadoc says it
     is best-effort, "a notification, never the record", and that a listener must recover by asking
     auth-service again. Production can't use it (Pub/Sub off), so correctness rests on the
     per-request refresh and the reconcile job.
   - **Used on staging.** Staging (Pub/Sub on) subscribes only to make changes show sooner.
   - **Overrides emit nothing.** Per-person ADD/BLOCK changes publish no event; nothing in
     auth-service `origin/master` publishes on override writes. The actor's own permissions are
     read per request with a short cache, so they apply within that cache window anyway.
3. **HR app: assigns by role id picked from the live list.** ai-hr-be mounts
   `GET /rbac/apps/{app}/roles` and `POST /rbac/apps/{app}/roles/{id}/members`
   (`internal/api/rbacadmin.go`), proxied to auth-service. The id is stable because
   `/roles/setup` upserts roles by `(app_code, code)`.
   - **Rule for Recruit:** never delete and re-create a role that people hold. Renaming the
     display name is safe; changing the code or deleting the role orphans HR's assignments.
   - **Removing the four roles is safe for HR:** it is a deliberate deletion, and no HR flow
     assigns them.
