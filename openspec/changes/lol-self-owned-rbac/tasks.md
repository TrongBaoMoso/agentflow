# Tasks: LOL self-owned RBAC

Branches (DevOps creates in **both** repos):
- `moso-aid`: `feat/lol-self-owned-rbac` (base `master`)
- `life-of-a-loan`: `feat/lol-self-owned-rbac` (base `main`)

Task branches: `agent/<bead-id>-<short-desc>`, from and into the feature branch in the
respective repo. One commit per task: `feat: <title> [<bead-id>]`.

Reference files (read before implementing):
- Model convention: `moso-aid/src/models/life-of-a-loan-audit.js`
- Permission catalog: `moso-aid/src/data/lol-rbac-setup.json`
- Current middleware to rework: `moso-aid/src/middleware/lol-config-auth.js`, `src/services/lol-actor.js`
- Central proxy to remove: `moso-aid/src/services/lol-rbac.js`, `src/controller/lol-permissions.js`
- Routes: `moso-aid/src/routes/index.js`
- Seed pattern: `agent/lol-admin-seed` (idempotent initialdata) — `src/scripts/lol-admin-*`
- FE config surface: `life-of-a-loan/src/pages/config/**`, `src/apis/client.ts`, `src/shared/auth/**`
- FE model to port: LFIQ `PermissionGuard`, `usePermissions`, `DirectPermissionsTab`

---

## Phase 0 — Design gate

- [ ] 0.1 Confirm the 4 open questions in `design.md` §8 (default role, 12-user role map,
  BLOCK-in-v1, identity-resolution source). **Blocks all backend enforcement tasks.**

## Phase 1 — Backend model + local authz (`moso-aid`)

- [ ] 1.1 **Models** `src/models/lol-rbac.js`: `LOLRbacRole` (`lifeofloan_rbac_roles`) +
  `LOLRbacUserGrant` (`lifeofloan_rbac_user_grants`) per design §2. **AC**: models load, indexes
  on `_id`; naming `rbac_*` (no collision with loan-process role).
- [ ] 1.2 **Catalog loader + ant-matcher** `src/services/lol-catalog.js`: load
  `lol-rbac-setup.json`, expose `lookup(method, path) → code[]|null` with `{id}` wildcard match.
  Unit tests for match/no-match. Add an `LOL_ADMIN` catalog perm mapped to `/life-of-a-loan/admin/*`.
- [ ] 1.3 **Authz service** `src/services/lol-authz.js`: `getEffective(userId)` (role ∪ ADD −
  BLOCK) + `evaluate(userId, method, path)` + 30s TTL cache + `invalidate(userId)`. Header comment
  marks the **PDP boundary** (engine-swap point). Unit tests for union/ADD/BLOCK/deny/allow-uncatalogued.
- [ ] 1.4 (depends 1.1) **Seed** `src/scripts/lol-rbac-seed.js`: idempotent create of
  ADMIN/EDITOR/VIEWER roles from `lol-rbac-setup.json`; idempotent grant for the 12 users
  (map from 0.1). Re-runnable. **AC**: second run makes no changes.

## Phase 2 — Backend middleware + endpoints (`moso-aid`)

- [ ] 2.1 (depends 1.3) **Rework `lol-config-auth.js`**: resolve **identity only** (userId),
  drop authorities-based role logic; `LOL_RBAC_ENFORCE` OFF → legacy any-identity pass, ON →
  `lolAuthz.evaluate`. Add `lolIdentityAuth`. Keep 401/503 mapping. Update existing tests.
- [ ] 2.2 (depends 1.3, 2.1) **`GET /permissions/me`** controller + route (identity-gated),
  returns `{roles, codes}`.
- [ ] 2.3 (depends 1.1, 1.3) **Local admin endpoints** `src/controller/lol-rbac-admin.js` +
  routes: `GET /admin/permission-groups`, `GET /admin/users`, `GET /admin/users/:id/grant`,
  `PUT /admin/users/:id/grant`. Validate vs catalog (400 on unknown), audit into
  `lifeofloan_audit_logs` (`entityType:'grant'`), invalidate authz cache. Gated by `requireLolAdmin`
  (= `evaluate` on admin path). **Replaces** central proxies.
- [ ] 2.4 (depends 2.3) **Validation** `src/validation/lol-rbac-admin.js` for the PUT grant body
  (`roles[]`, `overrides[{code,effect}]`).

## Phase 3 — Frontend (`life-of-a-loan`)

- [ ] 3.1 **API client** `src/apis/rbac.api.ts`: `getMyPermissions`, `getPermissionGroups`,
  `listUserGrants`, `getUserGrant`, `putUserGrant`. Types for effective set + grant.
- [ ] 3.2 (depends 3.1) **`usePermissions` + `PermissionGuard`** in `src/shared/auth/`:
  load `/permissions/me` into context/atom; `canCallApi(method, uri)`, `canAccessRoute`;
  guard component hides/disables children. **Fail-safe** (no perm while loading).
- [ ] 3.3 (depends 3.2) **Gate destructive controls**: wrap delete in `RolesTable`/`TasksTable`
  with `PermissionGuard` (`DELETE /life-of-a-loan/roles|tasks/{id}`).
- [ ] 3.4 (depends 3.1, 3.2) **Permissions tab** `src/pages/config/_components/PermissionsTab/`:
  user table + drawer editor (role Select + ADD/BLOCK toggles grouped by catalog group), save
  diff via `putUserGrant`. Tab + its route gated on the admin permission. i18n all locales.

## Phase 4 — Migration, cutover, cleanup

- [ ] 4.1 (depends 1.4, all Phase 2/3) **Seed prod 12 users**, verify 1–2 accounts against
  `/permissions/me` + Permissions tab with `LOL_RBAC_ENFORCE` **OFF**.
- [ ] 4.2 (depends 4.1) **Flip `LOL_RBAC_ENFORCE` ON** in prod; monitor audit + 403 rate; verify
  the "Edit role → Access token is required" error is gone.
- [ ] 4.3 (depends 4.2) **Remove central proxy**: delete `rbac/validate`, `admin/rbac/*`,
  `rbac/users/*/permissions` calls in `src/services/lol-rbac.js` + `src/controller/lol-permissions.js`
  + the `LOL_RBAC_ADMIN_TOKEN` env dependency. Update tests.
- [ ] 4.4 (depends 4.3) **Supersede beads** `agentflow-lxst` (central enforcement) and the
  central portions of `agentflow-akjk` / `agentflow-baxv`; update their status/notes.

## Test plan

- BE unit: catalog matcher, effective-set (union/ADD/BLOCK), evaluate (allow/deny/uncatalogued),
  seed idempotency, admin-write validation + cache invalidation.
- BE integration: middleware ON/OFF flag behaviour; admin endpoints CRUD + audit rows; 403 on
  insufficient permission; `/permissions/me` shape.
- FE: `PermissionGuard` shows/hides by effective set; Permissions tab save round-trips a grant
  and the target account's `/permissions/me` reflects the change on next load.
- Manual prod smoke (flag OFF then ON): 1 ADMIN + 1 restricted account.
