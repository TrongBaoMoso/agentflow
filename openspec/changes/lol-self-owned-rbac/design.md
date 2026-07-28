# Design: LOL self-owned RBAC

## 1. Authorization architecture (the shape)

```
                 ┌─────────────────────────────┐
  SSO token ───▶ │ identity resolution (central │ ── userId ──┐
  (from central) │  = IdP; token → userId only) │             │
                 └─────────────────────────────┘             ▼
                                                   ┌───────────────────────────┐
                                                   │  lol-authz (LOCAL PDP)     │
   request (method, path) ─────────────────────▶   │  evaluate(userId,          │
                                                   │           method, path)    │
                                                   │  = catalog ∩ effective set │
                                                   └──────────┬────────────────┘
                                                              │ reads
                                        ┌─────────────────────┴───────────────────┐
                                        ▼                                          ▼
                          lifeofloan_rbac_user_grants              lifeofloan_rbac_roles
                          (roles[] + overrides[ADD|BLOCK])         (roleCode → permCode[])
                                        └──────── permission catalog (lol-rbac-setup.json, code) ┘
```

**Rule:** `authorities` in the token is **ignored** for authorization. Central is IdP only.
Exactly one authZ source of truth = Mongo (+ the static catalog).

## 2. Data model (Mongo, mongoose — mirror `life-of-a-loan-audit.js`)

New file `moso-aid/src/models/lol-rbac.js`.

```js
// Access role: ADMIN / EDITOR / VIEWER (NOT the loan-process "role" config entity)
const RbacRoleSchema = new mongoose.Schema({
  _id: { type: String },                 // role code, e.g. "ADMIN"
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [] },  // permission codes from the catalog
  isSystem: { type: Boolean, default: true },     // seeded roles are protected from delete
  updatedAt: { type: Date, default: Date.now },
})

const OverrideSchema = new mongoose.Schema(
  { code: { type: String, required: true }, effect: { type: String, enum: ['ADD', 'BLOCK'], required: true } },
  { _id: false },
)

// Per-user grant: what THIS account gets in LOL
const RbacUserGrantSchema = new mongoose.Schema({
  _id: { type: String },                 // central userId
  email: { type: String, default: '' },  // denormalized for admin list display
  roles: { type: [String], default: [] },       // role codes (array → multi-role supported)
  overrides: { type: [OverrideSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: '' },
})

export const LOLRbacRole = mongoose.model('lifeofloan_rbac_roles', RbacRoleSchema)
export const LOLRbacUserGrant = mongoose.model('lifeofloan_rbac_user_grants', RbacUserGrantSchema)
```

Permission **catalog** is NOT a collection — it stays as `lol-rbac-setup.json` (already maps
`{method, path, code}` per route). The route path in the catalog is the ant-pattern used for
matching (`{id}` → single segment wildcard).

## 3. Effective-set + evaluation algorithm

`moso-aid/src/services/lol-authz.js`:

```
getEffective(userId):
  grant = LOLRbacUserGrant.findById(userId)          // null → no config access
  if !grant: return { codes: Set(), roles: [] }
  codes = union( role.permissions for role in grant.roles )   // from LOLRbacRole
  for ov in grant.overrides:
     if ov.effect == 'ADD':   codes.add(ov.code)
     if ov.effect == 'BLOCK': codes.delete(ov.code)
  return { codes, roles: grant.roles }
  // cached in-memory keyed by userId, TTL ~30s; invalidated on any grant write

evaluate(userId, method, path):
  { codes } = getEffective(userId)
  required = catalog.lookup(method, path)   // ant-match method+path → permission code(s)
  if required is null: return ALLOW         // uncatalogued route = not RBAC-gated (e.g. public)
  return required ⊆ codes ? ALLOW : DENY
```

**PDP boundary:** `evaluate()` is the ONLY place a permission decision is made. To later adopt a
policy engine, replace the body of `evaluate()`/`getEffective()` with an engine call — callers
(middleware) and the catalog contract stay identical. Document this at the top of the file.

Admin marker: a dedicated catalog permission (e.g. `LOL_ADMIN` mapped to `/life-of-a-loan/admin/*`)
identifies who can use the Permissions tab. `requireLolAdmin` = `evaluate(userId, method, path)`
on the admin routes; no separate role hard-code.

## 4. Middleware rework (`lol-config-auth.js`)

```
lolConfigAuth(req):
  token = bearer(req) or 401
  userId = resolveIdentity(token)      // central introspection/decode → userId ONLY
                                        // (reuse existing resolveActor plumbing but drop the
                                        //  authorities/role logic; keep AUTH_UNAVAILABLE→503)
  if LOL_RBAC_ENFORCE == false:
     // legacy behaviour during migration: any resolvable LOL identity passes
     req.user = { id: userId }; return next()
  decision = lolAuthz.evaluate(userId, req.method, req.baseUrl+req.path)
  decision == ALLOW ? (req.user = { id: userId }, next()) : 403 { error: 'Forbidden' }
```

`lolIdentityAuth` (identity-only, for `/permissions/me`) = the resolve-identity step without the
`evaluate` gate.

## 5. Endpoints

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/life-of-a-loan/permissions/me` | identity | caller effective set (`{roles, codes}`) for FE |
| GET | `/life-of-a-loan/admin/permission-groups` | admin | catalog groups for the editor UI |
| GET | `/life-of-a-loan/admin/users` | admin | users + their grants (list) |
| GET | `/life-of-a-loan/admin/users/:id/grant` | admin | one user's role(s) + overrides |
| PUT | `/life-of-a-loan/admin/users/:id/grant` | admin | replace role(s) + overrides (single write) |

All admin writes: validate against catalog (unknown code/role → 400), audit into
`lifeofloan_audit_logs`, invalidate the authz cache for that userId. These **replace** the
central proxies in `lol-rbac.js`.

## 6. Frontend (`life-of-a-loan`)

- `src/apis/rbac.api.ts` — typed client for the 5 endpoints (reuse `apis/client.ts`).
- `src/shared/auth/usePermissions.ts` — loads `/permissions/me` once (context/atom), exposes
  `canCallApi(method, uri)` + `canAccessRoute(path)`. **Fail-safe**: while loading → treat as
  no-permission for destructive controls (do NOT fail-open like LFIQ's current hook).
- `src/shared/auth/PermissionGuard.tsx` — `<PermissionGuard api={{method,uri}}>…</PermissionGuard>`
  hides or disables children when `!canCallApi`.
- `/config` Permissions tab (`src/pages/config/_components/PermissionsTab/`) — user table + drawer
  editor (role Select + per-permission ADD/BLOCK toggles grouped by catalog group), save diff.
- Gate delete buttons in `RolesTable` / `TasksTable` with `PermissionGuard`.

## 7. Cutover sequence (zero mid-flight lockout)

1. Ship models + seed + `lol-authz` + reworked middleware + endpoints + FE, **flag OFF**.
2. Run idempotent seed: create ADMIN/EDITOR/VIEWER roles; grant the **12 users** their role
   (ADMIN for thuan/jesica/katarina per prior decision; role for the rest — confirm final map).
3. Verify with 1–2 accounts against `/permissions/me` and the Permissions tab (flag still OFF).
4. Flip `LOL_RBAC_ENFORCE` **ON** in prod. Watch audit + 403 rate.
5. Remove central proxy code (`rbac/validate`, `admin/rbac/*`, `rbac/users/*/permissions`) and
   `LOL_RBAC_ADMIN_TOKEN`. Close/supersede `agentflow-lxst`.
6. Rollback at any point = flip flag OFF.

## 8. Open questions (confirm before/with implementation)

1. **Default role**: should an authenticated LOL user with no grant get an implicit **VIEWER**
   (read-only `/config`), or **no** `/config` access at all? (Recommendation: no access by
   default; VIEWER only when explicitly granted — least privilege.)
2. **Final 12-user role map**: ADMIN = thuan.nguyen, jesica.endo, katarina; the other 9 =
   EDITOR (+ direct-grant delete-task if desired) vs VIEWER? Need the confirmed assignment.
3. **`BLOCK` override**: keep it (stronger than LFIQ) or ship ADD-only first (simpler)?
   (Recommendation: model supports both; UI can expose ADD-only in v1.)
4. **Identity resolution source**: confirm the cheapest reliable token→userId path that does not
   depend on the token's `authorities` (introspection endpoint vs verified JWT decode).
