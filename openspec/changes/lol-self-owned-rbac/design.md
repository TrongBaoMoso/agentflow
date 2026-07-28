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

### 1a. Clean-cut principle (NO coexistence with the old central path)

The (a) code MUST NOT depend on, import, or run alongside the abandoned (b) central-RBAC code.
There is **no transition period where both enforcement paths exist**:

- Phase 1 is **purely additive** (new files only: `lol-rbac.js` models, `lol-catalog.js`,
  `lol-authz.js`, seed). It imports nothing from `src/services/lol-rbac.js` (the central proxy).
- **Phase 2 is a REPLACEMENT, not a layer.** In the same change that wires local `evaluate()`
  into `lol-config-auth.js`, it **deletes** the central-RBAC code paths that Phase 2a merged
  (`src/services/lol-rbac.js` → `rbac/validate`, `rbac/users/*/permissions`, `admin/rbac/*`) and
  removes the `LOL_RBAC_ADMIN_TOKEN` dependency. After Phase 2, `lol-config-auth.js` has exactly
  two branches — flag OFF = legacy "any resolvable LOL identity" (no central call), flag ON =
  local `evaluate()` — and **neither branch calls central for authorization**.
- The admin Direct-Permissions endpoints are built **local-only** (Phase 2), never as central
  proxies. The unmerged central-proxy PRs (moso-aid#84 BE / the central wiring in lol#42 FE) are
  **not merged**; #84 is closed, and lol#42's UI is reused only after its API client is
  re-pointed at the local endpoints.

Net: at no commit on `master` do the central and local authorization paths both exist.

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

## 8. Design decisions (CONFIRMED 2026-07-28)

1. **Default role — RESOLVED: no `/config` access without a grant** (least privilege). A user
   with no `lifeofloan_rbac_user_grants` doc gets an empty effective set → `/config` denied.
   VIEWER is granted only explicitly. (The public loan-timeline Viewer is unaffected — it is
   unauthenticated.)
2. **12-user role map — RESOLVED:**
   - **ADMIN** (full incl. delete + Permissions tab): `thuan.nguyen`, `jesica.endo`, `katarina`.
   - **EDITOR + direct-grant `LOL_TASK_DELETE`** for the other **9**: base EDITOR (create/update,
     no delete) **plus** an `ADD` override on `LOL_TASK_DELETE` so they can delete tasks but not
     roles. Each of the 9 remains individually tunable later via the Permissions tab.
   - Seed encodes exactly this (roles + the 9 ADD overrides).
3. **`BLOCK` override — RESOLVED: model supports ADD + BLOCK; v1 UI exposes ADD only.** Schema +
   `getEffective` implement both effects now; the Permissions tab v1 renders ADD toggles only.
   Enabling BLOCK later needs no schema change.
4. **Identity resolution — implementer's call (not user-facing):** use the cheapest reliable
   token→userId path that does **not** read the token's `authorities` claim (verified JWT decode
   preferred; introspection fallback). Decide in Phase 2.1.
