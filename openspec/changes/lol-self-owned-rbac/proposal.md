# Proposal: LOL self-owned RBAC (Mongo-native, LFIQ-style, engine-ready)

## Problem

Life-of-a-Loan (LOL) access control was built as **Option (b): central-owned authorization**.
Every protected `/config` action, and every admin RBAC action (assign role, grant/revoke
per-user permission), is proxied at request time to the central auth-service
(`moso-aid/src/services/lol-rbac.js` → `GET/POST {gateway}/auth-svc/api/v1/(admin/)rbac/*`).

This has two concrete failures already visible in prod:

1. **The RBAC-admin path is broken in prod.** When a manager opens *Edit role* in `/config`,
   the UI returns **"Access token is required"** — the central admin RBAC call
   (`admin/rbac/*`) needs a privileged token (`LOL_RBAC_ADMIN_TOKEN`) that a normal
   `LOL#ADMIN` user's token does not satisfy. So role/permission management does not work.
   (Base config-write — edit Task/Stage — does work, because that path only checks "has any
   `LOL#` role"; the audit log confirms task edits by managers.)
2. **Architectural coupling.** LOL is trapped inside central's RBAC model + roadmap + admin
   authorization quirks, pays a network hop per protected request, and central is a runtime
   SPOF for LOL config.

Central-owned authorization (Option b) is the pattern the industry is **moving away from** for
exactly these reasons (bottleneck, coupling, per-request latency). The dominant SaaS pattern —
GitHub, Slack, Atlassian, and even each Google product (YouTube / Drive / GCP each own their own
permissions) — is **the app owns its own authorization**, with the central system acting purely
as an **identity provider (IdP)**. That is also what **LFIQ (`lfiq-backend`) already does** in
this org: central SSO proves *who you are*; `lfiq-backend`'s own DB decides *what you can do*.

## Proposed Solution

Adopt **Option (a): LOL owns its own authorization**, mirroring LFIQ, Mongo-native.

**Guiding rule (the thing that makes this clean and kills the drift risk):**
> **Central = IdP only.** The SSO token proves identity (resolve to a `userId`). LOL **stops
> reading the token's `authorities` claim for authorization** and instead computes every
> permission decision from **its own Mongo store**. Exactly one authorization source of truth.

The model, mirroring LFIQ:

- **Permission catalog** stays as code (`lol-rbac-setup.json`): the enumeration of possible
  permissions, each mapped to a route as `{method, path, code}`. It changes only when routes
  change (a code deploy), so a DB collection would add no value at our scale (KISS/YAGNI).
- **Access roles** (ADMIN / EDITOR / VIEWER) live in Mongo (`lifeofloan_rbac_roles`), seeded
  from the catalog. Each role = a set of permission codes.
  > ⚠️ These **access roles are a different concept** from the loan-process "Roles" tab in
  > `/config` (Underwriter, Loan Coordinator…). Collections are named `rbac_*` to avoid any
  > collision with the existing loan-process `role` config entity.
- **Per-user grants** live in Mongo (`lifeofloan_rbac_user_grants`): each user has assigned
  role(s) plus optional **direct-permission overrides** (`ADD` extra, `BLOCK` remove).
  This is exactly the LFIQ "Direct Permissions" tab behaviour the user wants (tick "Delete User"
  on one account → that account gains the capability), and slightly stronger than LFIQ because
  it supports `BLOCK` as well as `ADD`.
- **Effective set = (∪ role permissions) ∪ ADD − BLOCK**, computed locally from Mongo, **rebuilt
  per request** (no permissions baked into the token → a grant change takes effect on the next
  request, no re-login), with a short-TTL in-memory cache to remove the per-request cost.
- **Enforcement** is local: one PDP-style function `evaluate(userId, method, path) → allow/deny`
  used by the `lolConfigAuth` middleware. Isolating the decision in a single function keeps LOL
  **engine-ready**: if LOL later scales, the *internals* of `evaluate()` can be swapped for a
  policy engine (OPA / AWS Cedar / OpenFGA) **without re-centralizing** and without touching
  controllers.
- **Frontend** consumes `GET /life-of-a-loan/permissions/me` (effective set) and gates controls
  with a `PermissionGuard` component + `usePermissions` hook (ported from LFIQ). A `/config`
  **Permissions** tab lets an admin edit any user's role + direct overrides
  (ported from LFIQ `DirectPermissionsTab`).

### Why now (blast radius is minimal)

- Only **12 users** are assigned and **1–2 actually use** `/config`.
- The part users actually rely on (view/edit Task, Stage) keeps working — it only needs the 12
  users' roles **seeded into Mongo**.
- The RBAC-admin part (Edit role / Direct Permissions) is **already broken** in prod
  ("Access token is required") — Option (a) **fixes** it. Net positive, nothing working is lost.
- **Login/SSO is untouched** — it is independent of the authorization choice.
- Enforcement stays behind the existing `LOL_RBAC_ENFORCE` flag (default OFF) during migration;
  we **seed first, verify, then cut over**, so no one loses access mid-flight, and rollback is a
  flag flip.

## Scope

### In scope

**Backend (`moso-aid`)**
- New mongoose models `lifeofloan_rbac_roles`, `lifeofloan_rbac_user_grants`
  (file `src/models/lol-rbac.js`, mirroring `src/models/life-of-a-loan-audit.js` conventions).
- Seed: roles from `lol-rbac-setup.json`; idempotent admin/role seed for the 12 users
  (reuse the `lol-admin-seed` idempotent-initialdata pattern).
- New local authorization service `src/services/lol-authz.js`: `getEffective(userId)`,
  `evaluate(userId, method, path)`, catalog map, short-TTL cache. **PDP boundary** documented.
- Rework `src/middleware/lol-config-auth.js`: resolve **identity only** from the token
  (`userId`), then authorize via `lol-authz.evaluate`. Keep `LOL_RBAC_ENFORCE` flag semantics
  (OFF → legacy "any `LOL#` role"; ON → local fine-grained).
- Local admin endpoints under `/life-of-a-loan/admin/*` (list users+grants, get/replace a user's
  grant = role(s) + overrides, list permission groups) writing straight to Mongo — **replacing**
  the central proxies. Gated by a local `requireLolAdmin` (effective has an admin-marker
  permission).
- `GET /life-of-a-loan/permissions/me` → caller's effective set (identity-gated).
- Audit every grant change into the existing `lifeofloan_audit_logs` (`entityType: 'grant'`).
- **Remove** the central-RBAC proxy code paths in `src/services/lol-rbac.js`
  (`rbac/validate`, `admin/rbac/*`, `rbac/users/*/permissions`) and the `LOL_RBAC_ADMIN_TOKEN`
  dependency, once cutover is verified.

**Frontend (`life-of-a-loan`)**
- `src/apis/rbac.api.ts`: `getMyPermissions`, admin grant list/get/replace, permission groups.
- `src/shared/auth`: `usePermissions` hook (`canCallApi(method, uri)`, `canAccessRoute`) +
  `PermissionGuard` component (ported from LFIQ, fail-safe: hide/disable on missing perm).
- `/config` **Permissions** tab: user list + per-user editor (role select + direct ADD/BLOCK
  overrides), saving a diff via the admin endpoints. Gated on the admin permission.
- Gate destructive controls (delete role/task) with `PermissionGuard` so EDITOR/VIEWER and
  per-user-restricted accounts see the correct UI.

**Migration / cutover**
- Seed 12 users → verify with 1–2 accounts (flag OFF) → flip `LOL_RBAC_ENFORCE` ON → remove
  central proxy + `LOL_RBAC_ADMIN_TOKEN`.
- Supersede the central-based beads (`agentflow-lxst`, and the central parts of `agentflow-akjk`
  / `agentflow-baxv`).

### Out of scope

- Login / SSO flow changes (identity resolution reuses the existing token → userId path).
- Actually deploying a policy engine (OPA/Cedar/OpenFGA) — the design is **engine-ready** but a
  real engine is **YAGNI** for 12 users. Documented as the future path only.
- Per-resource / ReBAC permissions (relationship-based) — future, not now.
- The public loan-timeline Viewer surface (unauthenticated; RBAC only governs `/config`).

## Risks

- **Identity resolution still needs central** to validate/resolve the SSO token to a `userId`.
  That is unavoidable (central is the IdP) and no worse than today. Mitigation: cache the
  identity resolution briefly; fail closed on config writes, fail per existing behaviour on reads.
- **Bootstrap chicken-and-egg** (who grants the first admin): solved by the idempotent seed
  script, run at deploy.
- **Collision with loan-process "Roles"**: mitigated by `rbac_*` collection naming and explicit
  separation in code + design.
- **Default role for authenticated users** (earlier ask: "every LOL user is VIEWER"): the Viewer
  timeline is public, so RBAC only affects `/config`; a user with no grant gets **no** `/config`
  access. Confirm in design.md whether an implicit VIEWER default is desired.
