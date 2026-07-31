# LOL Permissions — bulk assign / unassign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin grant a role to several people in one pass, change roles in bulk, and revoke access — with `VIEWER` becoming the zero-permission state every ungranted user is already in.

**Architecture:** `moso-aid` gains one write service (`applyGrants`) behind one new endpoint that serves assign / change-role / remove for 1..N users, with guardrails evaluated before any write and revocation implemented as a tombstone so `reconcileGrant` cannot undo it. `life-of-a-loan` turns the existing single-select picker into a multi-select batch, adds row selection + a bulk action bar to the table, and a `Remove access` path in the drawer.

**Tech Stack:** moso-aid — Node 22, Express, Mongoose, Jest + mongodb-memory-server, express-validator. life-of-a-loan — React 18, TypeScript, Vite, Mantine 7 + Tailwind, react-i18next, Vitest + React Testing Library.

## Global Constraints

- Read `openspec/changes/lol-permissions-bulk-assign/design.md` first — decisions D1–D5 are binding. Approved mockup: `life-of-a-loan/docs/mockups/config-permissions-bulk-assign.html`.
- Request/response bodies are **camelCase** (`userIds`, `revokedAt`) — matching every other LOL endpoint in moso-aid, NOT lfiq-backend's snake_case.
- Bead `agentflow-pkyp`. One branch per task: `agent/agentflow-pkyp-<short-desc>`. Commit subject ends with `[agentflow-pkyp]`.
- **moso-aid** base branch: `master`. **life-of-a-loan** base branch: `main` (GitLab Flow: feature→main, main→master auto, master→production manual — never open a production PR).
- Both local checkouts are behind origin. `git fetch` and base every worktree on `origin/<base>`, never on a stale local ref. Worktrees live at `agentflow/.worktrees/<name>` — never nested inside a repo (duplicate eslint plugin resolution fails).
- A worktree for the FE already exists at `agentflow/.worktrees/loal-pkyp` on `agent/agentflow-pkyp-mockup` (based on `origin/main`); it needs `npm install` and a copied `.env` before `npm run dev`.
- `life-of-a-loan` uses **7 locales**: `en`, `vi`, `zh`, `he`, `es`, `ko`, `ar` in `src/locales/<code>.json`. Every new string goes in all 7 under the existing `Permissions` namespace. Interpolation is i18next `{{name}}` style.
- `tailwind.config.ts` sets `corePlugins: { preflight: false }` — never emit a bare `<button>`, `<p>`, or `<h*>`; use Mantine `Button` (`unstyled` + `classNames` for row-shaped controls) and Mantine typography or explicitly-styled `<span>`s.
- No `console.log`. No `any`. Exported functions get explicit types. Immutable updates only (spread, never mutate props/state objects).
- Quality gates before every push: moso-aid `npm run lint && npm test`; life-of-a-loan `npm run lint && npx tsc --noEmit && npm test`.

---

## File Structure

**moso-aid**

| Path | Responsibility |
|---|---|
| `src/data/lol-rbac-setup.json` | `VIEWER` seed loses `CONFIG_READ` (D1) |
| `src/services/lol-authz.js` | `DEFAULT_ROLE_CODE`; no grant → `roles: ['VIEWER']` (D1) |
| `src/models/lol-rbac.js` | grant schema += `revokedAt`, `revokedBy` (D4) |
| `src/services/lol-rbac-write.js` **(new)** | `applyGrants()` — the single grant write path: guardrails, `bulkWrite`, same-email closure, audit, cache invalidation |
| `src/controller/lol-rbac-admin.js` | `bulkUserGrants` handler; `putUserGrant` delegates to `applyGrants`; `listUsers` hides tombstones |
| `src/validation/lol-rbac-admin.js` | `validateBulkUserGrants` |
| `src/routes/index.js` | `POST /life-of-a-loan/admin/user-grants/bulk` |

**life-of-a-loan**

| Path | Responsibility |
|---|---|
| `src/shared/types/admin-rbac.ts` | bulk request/response types; `ASSIGNABLE_ROLE_CODES` |
| `src/apis/admin-rbac.api.ts` | `bulkUserGrants()` |
| `.../PermissionsTab/CentralUserPickerModal/index.tsx` | multi-select + role-in-footer + `Add N users` |
| `.../CentralUserPickerModal/CentralUserRow.tsx` | checkbox; disabled when already granted |
| `.../CentralUserPickerModal/PickerPager.tsx` **(new)** | rows-per-page `10/25/50` + capped numbered pager |
| `.../PermissionsTab/BulkActionBar.tsx` **(new)** | `N selected` · change role · remove access · clear |
| `.../PermissionsTab/ConfirmRemoveDialog.tsx` **(new)** | shared confirm for drawer + bulk |
| `.../PermissionsTab/UserRow.tsx` | leading checkbox; own row disabled |
| `.../PermissionsTab/index.tsx` | selection state, bulk mutations, wiring |
| `.../PermissionsTab/UserDetailDrawer/index.tsx` | `Remove access` in the footer |
| `src/locales/*.json` | 7 locales |
| `src/locales/locales.parity.test.ts` **(new)** | every locale has the same key set |

---

# PART A — moso-aid

Worktree setup (once, before Task 1):

```bash
cd /Users/apple/Projects/agentflow/moso-aid && git fetch origin
git worktree add -b agent/agentflow-pkyp-be /Users/apple/Projects/agentflow/.worktrees/moso-aid-pkyp origin/master
cd /Users/apple/Projects/agentflow/.worktrees/moso-aid-pkyp && npm install
```

---

### Task 1: `VIEWER` becomes the zero-permission implicit default

**Files:**
- Modify: `src/services/lol-authz.js` (`loadEffective`, ~line 43)
- Modify: `src/data/lol-rbac-setup.json` (the `VIEWER` role entry)
- Test: `test/services/lol-authz.test.js` (modify one existing test, add two)

**Interfaces:**
- Consumes: nothing.
- Produces: `DEFAULT_ROLE_CODE` (`'VIEWER'`) exported from `src/services/lol-authz.js`. Task 3 imports it to reject `VIEWER` in `ASSIGN`.

> **Do NOT change the `VIEWER` fixture in this test file's `beforeEach`.** It creates `VIEWER` with `permissions: ['LOL_AUDIT_LIST']`, and the existing `'ADD override grants a code not held by any role'` test asserts `codes.has('LOL_AUDIT_LIST')` for a `VIEWER` grant. The fixture is arbitrary role data; the seed file is what D1 changes. Emptying the fixture breaks an unrelated test.

- [ ] **Step 1: Update the existing no-grant test to the new expectation**

In `test/services/lol-authz.test.js`, replace the existing test:

```js
  test('user with no grant document gets an empty effective set (least privilege)', async () => {
    const effective = await getEffective('no-grant-user')
    expect(effective.roles).toEqual([])
    expect(effective.codes.size).toBe(0)
  })
```

with:

```js
  // D1: VIEWER is the implicit default role — reported so every user "is" a
  // VIEWER, but carrying zero codes, so least privilege is unchanged. A
  // revoked user (tombstone, roles: []) lands on the same zero-code state.
  test('user with no grant document is an implicit VIEWER with zero permissions', async () => {
    const effective = await getEffective('no-grant-user')
    expect(effective.roles).toEqual(['VIEWER'])
    expect(effective.codes.size).toBe(0)
  })

  test('a VIEWER carrying no role permissions is denied the catalogued audit route', async () => {
    await LOLRbacRole.findByIdAndUpdate('VIEWER', { permissions: [] })
    await LOLRbacUserGrant.create({ _id: 'u-plain-viewer', roles: ['VIEWER'] })
    invalidateAll()
    await expect(evaluate('u-plain-viewer', 'GET', '/api/life-of-a-loan/audit-logs')).resolves.toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- test/services/lol-authz.test.js
```
Expected: FAIL — `expect(effective.roles).toEqual(['VIEWER'])` receives `[]`.

- [ ] **Step 3: Make `VIEWER` the implicit default in `loadEffective`**

In `src/services/lol-authz.js`, above `const CACHE_TTL_MS`:

```js
/**
 * The access role every user implicitly holds. It is seeded with NO permission
 * groups (src/data/lol-rbac-setup.json), so reporting it costs nothing: a user
 * with no grant document still resolves to an empty code set and cannot open
 * /config. It exists so "every user starts as a VIEWER" is true of the API
 * without writing a grant document per login — see design.md D1. Because of
 * that, VIEWER is never assignable; returning someone to it is what
 * `applyGrants` REMOVE does.
 */
export const DEFAULT_ROLE_CODE = 'VIEWER'
```

Then in `loadEffective`, replace:

```js
  if (!grant) return { roles: [], codes: new Set() }
```
with:
```js
  if (!grant) return { roles: [DEFAULT_ROLE_CODE], codes: new Set() }
```

Also update the `getEffective` doc comment: replace
`A user with no grant document gets an empty set (least privilege — no`
with
`A user with no grant document resolves to the implicit default role with an
 * empty code set (least privilege — no`.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- test/services/lol-authz.test.js
```
Expected: PASS, all tests in the file.

- [ ] **Step 5: Strip `CONFIG_READ` from the `VIEWER` seed**

In `src/data/lol-rbac-setup.json`, replace the `VIEWER` entry:

```json
    { "code": "VIEWER", "name": "Viewer", "description": "Read-only Config access", "is_default": false, "permission_groups": [
      { "permission_group_code": "CONFIG_READ", "scope": "ALL" }
    ] }
```
with:
```json
    { "code": "VIEWER", "name": "Viewer", "description": "Default — homepage only, no Config access", "is_default": false, "permission_groups": [] }
```

`CONFIG_READ` / `LOL_AUDIT_LIST` stays in the catalog and stays held by `ADMIN` and `EDITOR`, so the History tab is unaffected for them.

- [ ] **Step 6: Add a test pinning the seed's `VIEWER` to zero groups**

Create `test/data/lol-rbac-setup.test.js`:

```js
import { readFileSync } from 'node:fs'

// D1: the seeded VIEWER must carry no permission groups. If someone re-adds
// CONFIG_READ here, a VIEWER regains GET /audit-logs via a raw API call while
// still being bounced out of /config by hasConfigEditAccess — the dead-role
// state this change removed.
const setup = JSON.parse(readFileSync(new URL('../../src/data/lol-rbac-setup.json', import.meta.url), 'utf8'))

describe('lol-rbac-setup.json', () => {
  test('VIEWER grants no permission groups', () => {
    const viewer = setup.roles.find((r) => r.code === 'VIEWER')
    expect(viewer).toBeDefined()
    expect(viewer.permission_groups).toEqual([])
  })

  test('ADMIN and EDITOR still include CONFIG_READ so the History tab keeps working', () => {
    for (const code of ['ADMIN', 'EDITOR']) {
      const role = setup.roles.find((r) => r.code === code)
      expect(role.permission_groups.map((g) => g.permission_group_code)).toContain('CONFIG_READ')
    }
  })
})
```

- [ ] **Step 7: Run the full suite**

```bash
npm run lint && npm test
```
Expected: lint clean; all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/lol-authz.js src/data/lol-rbac-setup.json test/services/lol-authz.test.js test/data/lol-rbac-setup.test.js
git commit -m "feat(lol): make VIEWER the zero-permission implicit default role [agentflow-pkyp]"
```

---

### Task 2: Grant schema gains `revokedAt` / `revokedBy`, and `listUsers` hides tombstones

**Files:**
- Modify: `src/models/lol-rbac.js` (`RbacUserGrantSchema`)
- Modify: `src/controller/lol-rbac-admin.js` (`listUsers`)
- Test: `test/controller/lol-rbac-admin.test.js` (add one test to the existing `listUsers` describe)

**Interfaces:**
- Consumes: nothing.
- Produces: grant documents may carry `revokedAt: Date | null` and `revokedBy: string`. Task 4 writes them; Task 3's `LAST_ADMIN` count excludes them.

- [ ] **Step 1: Write the failing test**

In `test/controller/lol-rbac-admin.test.js`, inside `describe('listUsers', ...)`:

```js
  // D4: a revoked grant is a tombstone — kept so reconcileGrant cannot re-adopt
  // an old same-email grant onto the user, but never shown as a member.
  test('excludes revoked (tombstoned) grants', async () => {
    await LOLRbacUserGrant.create({ _id: 'u-live', email: 'live@lf.com', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({
      _id: 'u-gone',
      email: 'gone@lf.com',
      roles: [],
      revokedAt: new Date(),
      revokedBy: 'admin-1'
    })
    const res = mockRes()
    await lolRbacAdmin.listUsers({ headers: {} }, res)
    const { users } = res.json.mock.calls[0][0].data
    expect(users.map((u) => u.userId)).toEqual(['u-live'])
  })
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- test/controller/lol-rbac-admin.test.js -t 'excludes revoked'
```
Expected: FAIL — received `['u-gone', 'u-live']` (order by `updatedAt` desc may vary; the point is `u-gone` is present).

- [ ] **Step 3: Add the schema fields**

In `src/models/lol-rbac.js`, inside `RbacUserGrantSchema`, after the `supersededAt` field:

```js
  // Revocation tombstone (design.md D4). `roles: []` already means "no access",
  // but the DOCUMENT must survive: reconcileGrant's first guard is
  // `exists({ _id: userId })`, so keeping it is what stops a stale same-email
  // grant being re-adopted onto this user on their next login. Hidden from
  // admin lists; cleared by the next ASSIGN.
  revokedAt: { type: Date, default: null },
  revokedBy: { type: String, default: '' }
```

- [ ] **Step 4: Filter tombstones out of `listUsers`**

In `src/controller/lol-rbac-admin.js`, in `listUsers`, replace:

```js
  const grants = await LOLRbacUserGrant.find({ supersededBy: { $in: [null, ''] } })
```
with:
```js
  // `revokedAt: null` matches documents where the field is absent OR null, so
  // pre-existing grants written before D4 are unaffected.
  const grants = await LOLRbacUserGrant.find({ supersededBy: { $in: [null, ''] }, revokedAt: null })
```

Extend that function's leading comment with:

```js
// Revoked grants are excluded too: they are tombstones kept only to block
// reconcile-on-miss from resurrecting access (design.md D4), not memberships.
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- test/controller/lol-rbac-admin.test.js
```
Expected: PASS, whole file.

- [ ] **Step 6: Commit**

```bash
git add src/models/lol-rbac.js src/controller/lol-rbac-admin.js test/controller/lol-rbac-admin.test.js
git commit -m "feat(lol): add grant revocation tombstone fields, hide them from the member list [agentflow-pkyp]"
```

---

### Task 3: `applyGrants` — the single write path, `ASSIGN` + guardrails

**Files:**
- Create: `src/services/lol-rbac-write.js`
- Test: `test/services/lol-rbac-write.test.js`

**Interfaces:**
- Consumes: `DEFAULT_ROLE_CODE` from `src/services/lol-authz.js` (Task 1); `revokedAt`/`revokedBy` on the grant schema (Task 2).
- Produces:
  - `class GrantWriteError extends Error` with `.code: 'SELF_MODIFY' | 'LAST_ADMIN' | 'VIEWER_NOT_ASSIGNABLE' | 'OVERRIDES_REQUIRE_SINGLE_USER'` and `.userIds: string[]`.
  - `applyGrants({ actorId, userIds, action, roles = [], overrides = [], token = null }): Promise<{ updated: GrantView[], skipped: { userId: string, reason: string }[] }>` where `GrantView` is `{ userId, email, roles, overrides, updatedAt }`. Tasks 4 and 5 both build on this signature.

- [ ] **Step 1: Write the failing tests**

Create `test/services/lol-rbac-write.test.js`:

```js
import { LOLAuditLog } from '../../src/models/life-of-a-loan-audit.js'
import { LOLRbacRole, LOLRbacUserGrant } from '../../src/models/lol-rbac.js'
import { getEffective, invalidateAll } from '../../src/services/lol-authz.js'
import { applyGrants, GrantWriteError } from '../../src/services/lol-rbac-write.js'

// Real models against the shared MongoMemoryServer (test/setup.js), same
// convention as test/services/lol-authz.test.js.

const ACTOR = 'admin-actor'

beforeEach(async () => {
  invalidateAll()
  await LOLRbacRole.create({ _id: 'ADMIN', name: 'Admin', permissions: ['LOL_AUDIT_LIST', 'LOL_ADMIN'] })
  await LOLRbacRole.create({ _id: 'EDITOR', name: 'Editor', permissions: ['LOL_AUDIT_LIST'] })
  await LOLRbacRole.create({ _id: 'VIEWER', name: 'Viewer', permissions: [] })
  // The acting admin always holds a live ADMIN grant — the Permissions tab is
  // gated on LOL_ADMIN, so this is the only state the endpoint runs in.
  await LOLRbacUserGrant.create({ _id: ACTOR, email: 'actor@lf.com', roles: ['ADMIN'] })
})

describe('applyGrants ASSIGN', () => {
  test('grants one role to several users in a single call', async () => {
    const result = await applyGrants({
      actorId: ACTOR,
      userIds: ['u1', 'u2', 'u3'],
      action: 'ASSIGN',
      roles: ['EDITOR']
    })
    expect(result.updated.map((g) => g.userId).sort()).toEqual(['u1', 'u2', 'u3'])
    expect(result.skipped).toEqual([])
    const docs = await LOLRbacUserGrant.find({ _id: { $in: ['u1', 'u2', 'u3'] } }).lean()
    expect(docs).toHaveLength(3)
    for (const doc of docs) expect(doc.roles).toEqual(['EDITOR'])
  })

  test('replaces roles on an existing grant', async () => {
    await LOLRbacUserGrant.create({ _id: 'u1', email: 'u1@lf.com', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'ASSIGN', roles: ['ADMIN'] })
    const doc = await LOLRbacUserGrant.findById('u1').lean()
    expect(doc.roles).toEqual(['ADMIN'])
  })

  test('writes one audit entry per user, all sharing one correlationId', async () => {
    await applyGrants({ actorId: ACTOR, userIds: ['u1', 'u2'], action: 'ASSIGN', roles: ['EDITOR'] })
    const logs = await LOLAuditLog.find({ entityType: 'grant' }).lean()
    expect(logs).toHaveLength(2)
    expect(new Set(logs.map((l) => l.correlationId)).size).toBe(1)
    expect(logs.every((l) => l.actor.id === ACTOR)).toBe(true)
  })

  test('takes effect immediately — the authz cache is invalidated per user', async () => {
    await getEffective('u1') // prime the cache with the pre-grant (empty) set
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'ASSIGN', roles: ['EDITOR'] })
    const effective = await getEffective('u1')
    expect(effective.codes.has('LOL_AUDIT_LIST')).toBe(true)
  })

  test('rejects VIEWER as an assignable role and writes nothing', async () => {
    await expect(
      applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'ASSIGN', roles: ['VIEWER'] })
    ).rejects.toMatchObject({ code: 'VIEWER_NOT_ASSIGNABLE' })
    expect(await LOLRbacUserGrant.findById('u1').lean()).toBeNull()
  })

  test('rejects overrides for a multi-user batch and writes nothing', async () => {
    await expect(
      applyGrants({
        actorId: ACTOR,
        userIds: ['u1', 'u2'],
        action: 'ASSIGN',
        roles: ['EDITOR'],
        overrides: [{ code: 'LOL_ADMIN', effect: 'ADD' }]
      })
    ).rejects.toMatchObject({ code: 'OVERRIDES_REQUIRE_SINGLE_USER' })
    expect(await LOLRbacUserGrant.countDocuments({ _id: { $in: ['u1', 'u2'] } })).toBe(0)
  })

  test('accepts overrides for a single user', async () => {
    await applyGrants({
      actorId: ACTOR,
      userIds: ['u1'],
      action: 'ASSIGN',
      roles: ['EDITOR'],
      overrides: [{ code: 'LOL_ADMIN', effect: 'ADD' }]
    })
    const doc = await LOLRbacUserGrant.findById('u1').lean()
    expect(doc.overrides).toMatchObject([{ code: 'LOL_ADMIN', effect: 'ADD' }])
  })
})

describe('applyGrants guardrails', () => {
  test('SELF_MODIFY: the actor cannot demote themselves out of LOL_ADMIN', async () => {
    await expect(
      applyGrants({ actorId: ACTOR, userIds: [ACTOR], action: 'ASSIGN', roles: ['EDITOR'] })
    ).rejects.toMatchObject({ code: 'SELF_MODIFY', userIds: [ACTOR] })
    const doc = await LOLRbacUserGrant.findById(ACTOR).lean()
    expect(doc.roles).toEqual(['ADMIN'])
  })

  test('SELF_MODIFY: the actor may still re-assign themselves an admin role', async () => {
    await expect(
      applyGrants({ actorId: ACTOR, userIds: [ACTOR], action: 'ASSIGN', roles: ['ADMIN'] })
    ).resolves.toMatchObject({ skipped: [] })
  })

  test('LAST_ADMIN: cannot demote the final admin (concurrent-admin race)', async () => {
    // Simulates admin B's request arriving after admin A already lost ADMIN:
    // neither request touches its own actor, so SELF_MODIFY passes both.
    await LOLRbacUserGrant.create({ _id: 'other-admin', email: 'other@lf.com', roles: ['ADMIN'] })
    await LOLRbacUserGrant.findByIdAndUpdate(ACTOR, { roles: ['EDITOR'] })
    invalidateAll()
    await expect(
      applyGrants({ actorId: ACTOR, userIds: ['other-admin'], action: 'ASSIGN', roles: ['EDITOR'] })
    ).rejects.toMatchObject({ code: 'LAST_ADMIN' })
    const doc = await LOLRbacUserGrant.findById('other-admin').lean()
    expect(doc.roles).toEqual(['ADMIN'])
  })

  test('GrantWriteError carries a machine-readable code', () => {
    const error = new GrantWriteError('LAST_ADMIN', ['x'])
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('LAST_ADMIN')
    expect(error.userIds).toEqual(['x'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- test/services/lol-rbac-write.test.js
```
Expected: FAIL — `Cannot find module '../../src/services/lol-rbac-write.js'`.

- [ ] **Step 3: Implement `applyGrants` (ASSIGN path + guardrails)**

Create `src/services/lol-rbac-write.js`:

```js
import { LOLRbacRole, LOLRbacUserGrant } from '../models/lol-rbac.js'
import { ensureUserProfile } from './lol-actor.js'
import { newCorrelationId, diffFields, recordAudit } from './lol-audit.js'
import { DEFAULT_ROLE_CODE, invalidate } from './lol-authz.js'

// ── The single grant write path ──────────────────────────────────────────────
// Every grant mutation — the bulk endpoint AND the older per-user
// PUT /admin/users/:id/grant — goes through `applyGrants`, so the guardrails
// below cannot be bypassed by picking the other endpoint (design.md D3).
//
// One call = one bulkWrite + one audit correlationId, so the History tab can
// show "added 4 users as Editor" as a single act instead of four unrelated rows.

/** The catalog permission that means "may administer LOL access". */
const ADMIN_PERMISSION = 'LOL_ADMIN'

export class GrantWriteError extends Error {
  /**
   * @param {'SELF_MODIFY'|'LAST_ADMIN'|'VIEWER_NOT_ASSIGNABLE'|'OVERRIDES_REQUIRE_SINGLE_USER'} code
   * @param {string[]} userIds the offending ids, echoed to the client
   */
  constructor(code, userIds = []) {
    super(code)
    this.name = 'GrantWriteError'
    this.code = code
    this.userIds = userIds
  }
}

const grantView = (doc) => ({
  userId: doc._id,
  email: doc.email ?? '',
  roles: doc.roles ?? [],
  overrides: doc.overrides ?? [],
  updatedAt: doc.updatedAt ?? null
})

/** Role codes whose permission set contains LOL_ADMIN. */
const adminRoleCodes = async () => {
  const roles = await LOLRbacRole.find({ permissions: ADMIN_PERMISSION }).select('_id').lean()
  return new Set(roles.map((r) => r._id))
}

const grantsAdmin = (roles, adminRoles) => (roles ?? []).some((code) => adminRoles.has(code))

/**
 * Reject the whole operation when it would lock administration out. Runs
 * BEFORE any write, so a rejected call leaves Mongo untouched.
 */
const assertAllowed = async ({ actorId, userIds, action, roles, adminRoles }) => {
  const resultGrantsAdmin = action === 'ASSIGN' && grantsAdmin(roles, adminRoles)

  // SELF_MODIFY — the actor removing or demoting themselves is unrecoverable
  // from the UI, so it is refused outright rather than warned about.
  if (userIds.includes(actorId) && !resultGrantsAdmin) {
    throw new GrantWriteError('SELF_MODIFY', [actorId])
  }

  // LAST_ADMIN — unreachable from a correct single-admin session (the tab needs
  // LOL_ADMIN and the UI excludes the actor's own row), so this exists for two
  // cases SELF_MODIFY cannot see: two admins revoking each other concurrently,
  // and direct API calls. Counted against live data on every request.
  const liveAdmins = await LOLRbacUserGrant.find({
    roles: { $in: [...adminRoles] },
    supersededBy: { $in: [null, ''] },
    revokedAt: null
  })
    .select('_id')
    .lean()
  const affected = new Set(userIds)
  const remaining = liveAdmins.filter((doc) => !affected.has(doc._id)).length
  const added = resultGrantsAdmin ? userIds.length : 0
  if (remaining + added < 1) {
    throw new GrantWriteError('LAST_ADMIN', userIds)
  }
}

/**
 * Resolve the account's PRIMARY email so the grant document carries the key
 * `reconcileGrant` matches on (design.md D5). Grants created through the picker
 * previously stored '' — which silently opted them out of drift self-healing.
 * Never throws: display/matching metadata must not fail an authorization write.
 */
const resolveEmail = async (userId, token, existingEmail) => {
  if (!token) return existingEmail ?? ''
  const profile = await ensureUserProfile(userId, token).catch(() => null)
  return profile?.email || existingEmail || ''
}

/**
 * Apply one grant operation to 1..N users.
 *
 * @param {object} args
 * @param {string} args.actorId          the admin performing the change
 * @param {string[]} args.userIds        target central user ids (1..N)
 * @param {'ASSIGN'|'REMOVE'} args.action
 * @param {string[]} [args.roles]        ASSIGN: role codes to set (replaces)
 * @param {Array<{code: string, effect: 'ADD'|'BLOCK'}>} [args.overrides]
 * @param {string|null} [args.token]     caller bearer, for email resolution
 * @returns {Promise<{updated: object[], skipped: {userId: string, reason: string}[]}>}
 */
export const applyGrants = async ({ actorId, userIds, action, roles = [], overrides = [], token = null }) => {
  const ids = [...new Set(userIds)]

  if (action === 'ASSIGN' && roles.includes(DEFAULT_ROLE_CODE)) {
    throw new GrantWriteError('VIEWER_NOT_ASSIGNABLE', ids)
  }
  if (overrides.length > 0 && ids.length > 1) {
    throw new GrantWriteError('OVERRIDES_REQUIRE_SINGLE_USER', ids)
  }

  const adminRoles = await adminRoleCodes()
  await assertAllowed({ actorId, userIds: ids, action, roles, adminRoles })

  const before = await LOLRbacUserGrant.find({ _id: { $in: ids } }).lean()
  const beforeById = new Map(before.map((doc) => [doc._id, doc]))
  const now = new Date()
  const correlationId = newCorrelationId()

  const operations = []
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const email = await resolveEmail(id, token, beforeById.get(id)?.email)
    operations.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            email,
            roles,
            overrides,
            revokedAt: null,
            revokedBy: '',
            updatedAt: now,
            updatedBy: actorId
          }
        },
        upsert: true
      }
    })
  }

  await LOLRbacUserGrant.bulkWrite(operations)

  const after = await LOLRbacUserGrant.find({ _id: { $in: ids } }).lean()
  for (const doc of after) {
    const previous = beforeById.get(doc._id)
    // eslint-disable-next-line no-await-in-loop
    await recordAudit({
      actor: { id: actorId },
      action: previous ? 'update' : 'create',
      entityType: 'grant',
      entityId: doc._id,
      entityLabel: doc.email || doc._id,
      changes: diffFields(
        { roles: previous?.roles ?? [], overrides: previous?.overrides ?? [] },
        { roles: doc.roles ?? [], overrides: doc.overrides ?? [] }
      ),
      correlationId
    })
    invalidate(doc._id)
  }

  const writtenIds = new Set(after.map((doc) => doc._id))
  return {
    updated: after.map(grantView),
    skipped: ids.filter((id) => !writtenIds.has(id)).map((id) => ({ userId: id, reason: 'WRITE_FAILED' }))
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- test/services/lol-rbac-write.test.js
```
Expected: PASS, all 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/lol-rbac-write.js test/services/lol-rbac-write.test.js
git commit -m "feat(lol): add applyGrants — single grant write path with self/last-admin guardrails [agentflow-pkyp]"
```

---

### Task 4: `applyGrants` `REMOVE` — tombstone + same-email closure

**Files:**
- Modify: `src/services/lol-rbac-write.js` (`applyGrants`)
- Test: `test/services/lol-rbac-write.test.js` (add a `describe`)

**Interfaces:**
- Consumes: `applyGrants` from Task 3.
- Produces: `action: 'REMOVE'` behaviour. Task 5's endpoint exposes it; the FE calls it for both bulk and single removal.

- [ ] **Step 1: Write the failing tests**

Append to `test/services/lol-rbac-write.test.js`:

```js
describe('applyGrants REMOVE', () => {
  test('tombstones the grant: roles cleared, revokedAt/revokedBy set, document kept', async () => {
    await LOLRbacUserGrant.create({
      _id: 'u1',
      email: 'u1@lf.com',
      roles: ['EDITOR'],
      overrides: [{ code: 'LOL_ADMIN', effect: 'ADD' }]
    })
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'REMOVE' })
    const doc = await LOLRbacUserGrant.findById('u1').lean()
    expect(doc).not.toBeNull()
    expect(doc.roles).toEqual([])
    expect(doc.overrides).toEqual([])
    expect(doc.revokedAt).toBeInstanceOf(Date)
    expect(doc.revokedBy).toBe(ACTOR)
  })

  test('a revoked user has zero effective permissions and is an implicit VIEWER', async () => {
    await LOLRbacUserGrant.create({ _id: 'u1', email: 'u1@lf.com', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'REMOVE' })
    const effective = await getEffective('u1')
    expect(effective.codes.size).toBe(0)
  })

  test('marks every other live same-email grant superseded', async () => {
    // The production drift state: one person, two live grant docs on two
    // central user_ids (design.md D4).
    await LOLRbacUserGrant.create({ _id: 'old-id', email: 'a@lf.com', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({ _id: 'new-id', email: 'A@LF.COM', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['new-id'], action: 'REMOVE' })
    const old = await LOLRbacUserGrant.findById('old-id').lean()
    expect(old.supersededBy).toBe('new-id')
    expect(old.supersededAt).toBeInstanceOf(Date)
  })

  test('skips the same-email closure when the grant has no email', async () => {
    await LOLRbacUserGrant.create({ _id: 'no-mail', email: '', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({ _id: 'unrelated', email: '', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['no-mail'], action: 'REMOVE' })
    const unrelated = await LOLRbacUserGrant.findById('unrelated').lean()
    expect(unrelated.supersededBy).toBeNull()
  })

  test('removes several users in one call and audits each under one correlationId', async () => {
    await LOLRbacUserGrant.create({ _id: 'u1', email: 'u1@lf.com', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({ _id: 'u2', email: 'u2@lf.com', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['u1', 'u2'], action: 'REMOVE' })
    const logs = await LOLAuditLog.find({ entityType: 'grant', action: 'delete' }).lean()
    expect(logs.map((l) => l.entityId).sort()).toEqual(['u1', 'u2'])
    expect(new Set(logs.map((l) => l.correlationId)).size).toBe(1)
  })

  test('SELF_MODIFY: the actor cannot remove their own access', async () => {
    await expect(applyGrants({ actorId: ACTOR, userIds: [ACTOR], action: 'REMOVE' })).rejects.toMatchObject({
      code: 'SELF_MODIFY'
    })
    const doc = await LOLRbacUserGrant.findById(ACTOR).lean()
    expect(doc.roles).toEqual(['ADMIN'])
    expect(doc.revokedAt).toBeNull()
  })

  test('a re-grant after removal clears the tombstone', async () => {
    await LOLRbacUserGrant.create({ _id: 'u1', email: 'u1@lf.com', roles: ['EDITOR'] })
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'REMOVE' })
    await applyGrants({ actorId: ACTOR, userIds: ['u1'], action: 'ASSIGN', roles: ['EDITOR'] })
    const doc = await LOLRbacUserGrant.findById('u1').lean()
    expect(doc.revokedAt).toBeNull()
    expect(doc.revokedBy).toBe('')
    expect(doc.roles).toEqual(['EDITOR'])
  })
})

describe('revocation survives reconcile-on-miss', () => {
  // The regression this whole tombstone design exists for (design.md D4): a
  // plain delete would let reconcileGrant copy an old same-email grant back
  // onto the user on their very next login.
  test('a revoked user who logs in again does not regain their old grant', async () => {
    const { reconcileGrant } = await import('../../src/services/lol-grant-reconcile.js')
    await LOLRbacUserGrant.create({ _id: 'old-id', email: 'a@lf.com', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({ _id: 'new-id', email: 'a@lf.com', roles: ['EDITOR'] })

    await applyGrants({ actorId: ACTOR, userIds: ['new-id'], action: 'REMOVE' })
    invalidateAll()

    const migrated = await reconcileGrant('new-id', ['a@lf.com'])
    expect(migrated).toBeNull()
    const effective = await getEffective('new-id')
    expect(effective.codes.size).toBe(0)
    expect(effective.roles).toEqual([])
  })

  test('and not after being re-provisioned onto a third user_id either', async () => {
    const { reconcileGrant } = await import('../../src/services/lol-grant-reconcile.js')
    await LOLRbacUserGrant.create({ _id: 'old-id', email: 'a@lf.com', roles: ['EDITOR'] })
    await LOLRbacUserGrant.create({ _id: 'new-id', email: 'a@lf.com', roles: ['EDITOR'] })

    await applyGrants({ actorId: ACTOR, userIds: ['new-id'], action: 'REMOVE' })
    invalidateAll()

    // Central re-provisions the account again → a third id with no grant.
    const migrated = await reconcileGrant('third-id', ['a@lf.com'])
    expect(migrated).toBeNull()
  })
})
```

> Note on the first regression test: a tombstoned doc has `roles: []`, so `getEffective('new-id')` finds a document and returns `roles: []` — NOT the implicit `['VIEWER']` of Task 1, which only applies when no document exists. Both resolve to zero codes, which is what authorization cares about; the assertion above pins the actual behaviour rather than the mental model.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- test/services/lol-rbac-write.test.js -t 'REMOVE'
```
Expected: FAIL — `doc.revokedAt` is `null` (the ASSIGN branch runs for every action).

- [ ] **Step 3: Implement the REMOVE branch**

In `src/services/lol-rbac-write.js`, add above `applyGrants`:

```js
/** Case-insensitive exact matcher, mirroring lol-grant-reconcile.js. */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Close every OTHER live grant carrying this person's email, so reconcile-on-miss
 * has no candidate to re-adopt — including after a later re-provisioning onto a
 * third user_id (design.md D4). No-op when the email is unknown: matching '' would
 * sweep in every other email-less grant.
 */
const closeSameEmailGrants = async (userId, email, now) => {
  if (!email) return
  await LOLRbacUserGrant.updateMany(
    {
      _id: { $ne: userId },
      email: new RegExp(`^${escapeRegExp(email)}$`, 'i'),
      supersededBy: { $in: [null, ''] }
    },
    { $set: { supersededBy: userId, supersededAt: now } }
  )
}
```

In `applyGrants`, replace the operation-building loop with an action-aware version:

```js
  const operations = []
  for (const id of ids) {
    if (action === 'REMOVE') {
      operations.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              roles: [],
              overrides: [],
              revokedAt: now,
              revokedBy: actorId,
              updatedAt: now,
              updatedBy: actorId
            }
          },
          upsert: true
        }
      })
      continue
    }
    // eslint-disable-next-line no-await-in-loop
    const email = await resolveEmail(id, token, beforeById.get(id)?.email)
    operations.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            email,
            roles,
            overrides,
            revokedAt: null,
            revokedBy: '',
            updatedAt: now,
            updatedBy: actorId
          }
        },
        upsert: true
      }
    })
  }

  await LOLRbacUserGrant.bulkWrite(operations)

  if (action === 'REMOVE') {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await closeSameEmailGrants(id, beforeById.get(id)?.email, now)
    }
  }
```

Then make the audit `action` reflect removal — replace:

```js
      action: previous ? 'update' : 'create',
```
with:
```js
      action: action === 'REMOVE' ? 'delete' : previous ? 'update' : 'create',
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- test/services/lol-rbac-write.test.js
```
Expected: PASS, all tests including both reconcile regressions.

- [ ] **Step 5: Run the whole suite — the reconcile tests must still pass**

```bash
npm run lint && npm test
```
Expected: lint clean; `test/services/lol-grant-reconcile.test.js` unchanged and green (nothing in that file was modified).

- [ ] **Step 6: Commit**

```bash
git add src/services/lol-rbac-write.js test/services/lol-rbac-write.test.js
git commit -m "feat(lol): implement grant removal as a tombstone that closes same-email identities [agentflow-pkyp]"
```

---

### Task 5: Bulk endpoint — validation, route, and `putUserGrant` delegation

**Files:**
- Modify: `src/validation/lol-rbac-admin.js` (add `validateBulkUserGrants`)
- Modify: `src/controller/lol-rbac-admin.js` (add `bulkUserGrants`, rewrite `putUserGrant`, export both)
- Modify: `src/routes/index.js` (one route, after the existing grant PUT)
- Test: `test/controller/lol-rbac-admin.test.js` (two new `describe`s)

**Interfaces:**
- Consumes: `applyGrants`, `GrantWriteError` (Tasks 3–4).
- Produces: `POST /api/life-of-a-loan/admin/user-grants/bulk`, body `{ userIds, action, roles?, overrides? }`, responding `200 { success, data: { updated, skipped } }` or `409 { success: false, error, details: { userIds } }`. Task 6 types this on the FE.

- [ ] **Step 1: Write the failing tests**

Append to `test/controller/lol-rbac-admin.test.js`:

```js
describe('bulkUserGrants', () => {
  const actorReq = (body) => ({ body, params: {}, headers: {}, socket: {}, user: { id: 'admin-actor' } })

  beforeEach(async () => {
    await LOLRbacUserGrant.create({ _id: 'admin-actor', email: 'actor@lf.com', roles: ['ADMIN'] })
  })

  test('ASSIGN grants one role to several users in a single request', async () => {
    const res = mockRes()
    await lolRbacAdmin.bulkUserGrants(
      actorReq({ userIds: ['u1', 'u2'], action: 'ASSIGN', roles: ['EDITOR'] }),
      res
    )
    const { updated, skipped } = res.json.mock.calls[0][0].data
    expect(updated.map((g) => g.userId).sort()).toEqual(['u1', 'u2'])
    expect(skipped).toEqual([])
  })

  test('REMOVE tombstones the users so they leave the member list', async () => {
    await LOLRbacUserGrant.create({ _id: 'u1', email: 'u1@lf.com', roles: ['EDITOR'] })
    const res = mockRes()
    await lolRbacAdmin.bulkUserGrants(actorReq({ userIds: ['u1'], action: 'REMOVE' }), res)
    expect(res.json.mock.calls[0][0].success).toBe(true)

    const listRes = mockRes()
    await lolRbacAdmin.listUsers({ headers: {} }, listRes)
    const { users } = listRes.json.mock.calls[0][0].data
    expect(users.map((u) => u.userId)).not.toContain('u1')
  })

  test('a guardrail violation answers 409 with the offending ids and writes nothing', async () => {
    const res = mockRes()
    await lolRbacAdmin.bulkUserGrants(
      actorReq({ userIds: ['admin-actor'], action: 'REMOVE' }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      error: 'SELF_MODIFY',
      details: { userIds: ['admin-actor'] }
    })
    const doc = await LOLRbacUserGrant.findById('admin-actor').lean()
    expect(doc.roles).toEqual(['ADMIN'])
  })
})

describe('validateBulkUserGrants', () => {
  test('rejects an empty userIds array', async () => {
    const req = { body: { userIds: [], action: 'ASSIGN', roles: ['EDITOR'] } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(false)
  })

  test('rejects an unknown action', async () => {
    const req = { body: { userIds: ['u1'], action: 'NOPE' } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(false)
  })

  test('rejects ASSIGN without roles', async () => {
    const req = { body: { userIds: ['u1'], action: 'ASSIGN' } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(false)
  })

  test('rejects an unknown role code', async () => {
    const req = { body: { userIds: ['u1'], action: 'ASSIGN', roles: ['WIZARD'] } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(false)
  })

  test('rejects more than 50 ids', async () => {
    const req = {
      body: { userIds: Array.from({ length: 51 }, (_, i) => `u${i}`), action: 'ASSIGN', roles: ['EDITOR'] }
    }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(false)
  })

  test('accepts a valid ASSIGN body', async () => {
    const req = { body: { userIds: ['u1', 'u2'], action: 'ASSIGN', roles: ['EDITOR'] } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(true)
  })

  test('accepts a valid REMOVE body with no roles', async () => {
    const req = { body: { userIds: ['u1'], action: 'REMOVE' } }
    const { nextCalled } = await runValidators(validateBulkUserGrants, req)
    expect(nextCalled).toBe(true)
  })
})
```

Extend the file's existing import of validators:

```js
import { validateBulkUserGrants, validatePutUserGrant } from '../../src/validation/lol-rbac-admin.js'
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- test/controller/lol-rbac-admin.test.js
```
Expected: FAIL — `validateBulkUserGrants` is not exported; `lolRbacAdmin.bulkUserGrants` is not a function.

- [ ] **Step 3: Add the validator**

In `src/validation/lol-rbac-admin.js`, after `validatePutUserGrant`:

```js
// POST /admin/user-grants/bulk body: { userIds, action, roles?, overrides? }.
// `action` decides whether `roles` is required, so the roles checks below are
// scoped with .if() rather than .optional() — express-validator's .optional()
// does not skip an explicit null (only undefined), which would let
// `{ roles: null }` through to the service.
export const validateBulkUserGrants = [
  body('userIds').isArray({ min: 1, max: 50 }).withMessage('userIds must be an array of 1 to 50 ids'),
  body('userIds.*').isString().withMessage('each userId must be a string').bail().trim().notEmpty(),
  body('action').isIn(['ASSIGN', 'REMOVE']).withMessage('action must be ASSIGN or REMOVE'),
  body('roles')
    .if(body('action').equals('ASSIGN'))
    .isArray({ min: 1 })
    .withMessage('roles is required for ASSIGN'),
  body('roles.*').if(body('action').equals('ASSIGN')).isString().withMessage('each role must be a string'),
  body('roles')
    .if(body('action').equals('ASSIGN'))
    .custom(async (roles = []) => {
      const known = await knownRoleCodes()
      const unknown = roles.filter((code) => !known.has(code))
      if (unknown.length) throw new Error(`Unknown role code(s): ${unknown.join(', ')}`)
      return true
    }),
  body('overrides').optional({ values: 'null' }).isArray().withMessage('overrides must be an array'),
  body('overrides.*.code').isString().withMessage('override code must be a string'),
  body('overrides.*.effect').isIn(['ADD', 'BLOCK']).withMessage('override effect must be ADD or BLOCK'),
  body('overrides')
    .optional({ values: 'null' })
    .custom(async (overrides = []) => {
      const known = await knownPermissionCodes()
      const unknown = overrides.filter((o) => !known.has(o.code))
      if (unknown.length) throw new Error(`Unknown permission code(s): ${unknown.map((o) => o.code).join(', ')}`)
      return true
    }),
  handleValidationErrors
]
```

- [ ] **Step 4: Add the handler and route `putUserGrant` through the same service**

In `src/controller/lol-rbac-admin.js`, add to the imports:

```js
import { applyGrants, GrantWriteError } from '../services/lol-rbac-write.js'
```

Replace the whole `putUserGrant` body with a delegation, and add `bulkUserGrants` next to it:

```js
// Translate a guardrail rejection into a 409 the FE can name. Any other error
// keeps falling through to `handle`'s 500.
const asGrantWriteResponse = (error, res) => {
  if (!(error instanceof GrantWriteError)) throw error
  res.status(409).json({ success: false, error: error.code, details: { userIds: error.userIds } })
}

// PUT /admin/users/:id/grant — the per-user path used by the Permissions
// drawer (roles + this person's overrides). Delegates to applyGrants so the
// SELF_MODIFY / LAST_ADMIN guardrails cannot be bypassed by choosing this
// endpoint over the bulk one (design.md D3).
const putUserGrant = handle(async (req, res) => {
  try {
    const { updated } = await applyGrants({
      actorId: req.user.id,
      userIds: [req.params.id],
      action: 'ASSIGN',
      roles: req.body.roles ?? [],
      overrides: req.body.overrides ?? [],
      token: bearerToken(req)
    })
    res.json({ success: true, data: updated[0] })
  } catch (error) {
    asGrantWriteResponse(error, res)
  }
})

// POST /admin/user-grants/bulk — one endpoint for assign / change-role /
// remove, 1..N users (design.md D3). One bulkWrite, one audit correlationId.
const bulkUserGrants = handle(async (req, res) => {
  try {
    const data = await applyGrants({
      actorId: req.user.id,
      userIds: req.body.userIds,
      action: req.body.action,
      roles: req.body.roles ?? [],
      overrides: req.body.overrides ?? [],
      token: bearerToken(req)
    })
    res.json({ success: true, data })
  } catch (error) {
    asGrantWriteResponse(error, res)
  }
})
```

Add `bulkUserGrants` to the module's default export object alongside `putUserGrant`.

> `auditCtx` and `diffFields` may now be unused in this controller — check and remove any import that lint flags, but leave `auditCtx` if other handlers still use it.

- [ ] **Step 5: Register the route**

In `src/routes/index.js`, immediately after the existing grant PUT line:

```js
  router.post(
    '/life-of-a-loan/admin/user-grants/bulk',
    requireLolAdmin,
    validateBulkUserGrants,
    lolRbacAdmin.bulkUserGrants
  )
```

and extend that file's validator import:

```js
import { validateBulkUserGrants, validateGrantIdParam, validatePutUserGrant } from '../validation/lol-rbac-admin.js'
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test -- test/controller/lol-rbac-admin.test.js
```
Expected: PASS. If pre-existing `putUserGrant` tests now fail because they call it without `req.user`, give those requests a `user: { id: 'admin-actor' }` and a live `ADMIN` grant for that id — the delegation makes an actor mandatory, which is intended.

- [ ] **Step 7: Full gates, then push and open the PR**

```bash
npm run lint && npm test
git push -u origin agent/agentflow-pkyp-be
gh pr create --base master --head agent/agentflow-pkyp-be \
  --title "feat(lol): implicit VIEWER, bulk grant endpoint, tombstone revocation [agentflow-pkyp]" \
  --body "Implements openspec/changes/lol-permissions-bulk-assign design.md D1-D5. See that doc for rationale."
```

- [ ] **Step 8: Commit**

```bash
git add src/validation/lol-rbac-admin.js src/controller/lol-rbac-admin.js src/routes/index.js test/controller/lol-rbac-admin.test.js
git commit -m "feat(lol): add POST /admin/user-grants/bulk, route PUT grant through applyGrants [agentflow-pkyp]"
```

---

# PART B — life-of-a-loan

Use the existing worktree; it is already based on `origin/main`:

```bash
cd /Users/apple/Projects/agentflow/.worktrees/loal-pkyp
npm install && cp /Users/apple/Projects/agentflow/life-of-a-loan/.env .env
```

**Do not start Part B until the moso-aid PR is merged and deployed** — the picker's `Add N users` has no endpoint to call before then.

---

### Task 6: Types + API client for the bulk endpoint

**Files:**
- Modify: `src/shared/types/admin-rbac.ts`
- Modify: `src/apis/admin-rbac.api.ts`
- Test: `src/apis/admin-rbac.api.test.ts` (add a `describe`)

**Interfaces:**
- Consumes: the endpoint from Task 5.
- Produces, imported by Tasks 7–9:
  - `ASSIGNABLE_ROLE_CODES: AdminRoleCode[]` — `['ADMIN', 'EDITOR']`
  - `AdminGrantBulkAction = 'ASSIGN' | 'REMOVE'`
  - `AdminGrantBulkInput { userIds: string[]; action: AdminGrantBulkAction; roles?: string[]; overrides?: AdminOverride[] }`
  - `AdminGrantBulkResult { updated: AdminUserGrant[]; skipped: { userId: string; reason: string }[] }`
  - `bulkUserGrants(body: AdminGrantBulkInput): Promise<AdminGrantBulkResult>`

- [ ] **Step 1: Write the failing test**

In `src/apis/admin-rbac.api.test.ts`, following the file's existing mocking style for `http`:

```ts
describe('bulkUserGrants', () => {
  it('posts the batch to the single bulk endpoint', async () => {
    await bulkUserGrants({ userIds: ['u1', 'u2'], action: 'ASSIGN', roles: ['EDITOR'] });
    expect(http.POST).toHaveBeenCalledWith('/admin/user-grants/bulk', {
      body: { userIds: ['u1', 'u2'], action: 'ASSIGN', roles: ['EDITOR'] },
    });
  });

  it('defaults updated/skipped to empty arrays when the response omits them', async () => {
    vi.mocked(http.POST).mockResolvedValueOnce(undefined as never);
    await expect(bulkUserGrants({ userIds: ['u1'], action: 'REMOVE' })).resolves.toEqual({
      updated: [],
      skipped: [],
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/apis/admin-rbac.api.test.ts
```
Expected: FAIL — `bulkUserGrants` is not exported.

- [ ] **Step 3: Add the types**

In `src/shared/types/admin-rbac.ts`, after `ADMIN_ROLE_CODES`:

```ts
/**
 * Roles an admin can actually hand out. `VIEWER` is deliberately absent: it is
 * the implicit state of every user with no grant (moso-aid's
 * `DEFAULT_ROLE_CODE`, design.md D1) and the backend rejects it with
 * `VIEWER_NOT_ASSIGNABLE`. Returning someone to `VIEWER` is what
 * `Remove access` does.
 */
export const ASSIGNABLE_ROLE_CODES: AdminRoleCode[] = ['ADMIN', 'EDITOR'];
```

And at the end of the file:

```ts
export type AdminGrantBulkAction = 'ASSIGN' | 'REMOVE';

/**
 * `POST /admin/user-grants/bulk` body — one endpoint for assign, change-role
 * and remove, for 1..N users (design.md D3). `roles` is required for `ASSIGN`
 * and ignored for `REMOVE`. `overrides` is only accepted for a single-user
 * batch (an override is per-person by definition) — the backend answers 400
 * otherwise.
 */
export interface AdminGrantBulkInput {
  userIds: string[];
  action: AdminGrantBulkAction;
  roles?: string[];
  overrides?: AdminOverride[];
}

export interface AdminGrantBulkSkip {
  userId: string;
  reason: string;
}

export interface AdminGrantBulkResult {
  updated: AdminUserGrant[];
  skipped: AdminGrantBulkSkip[];
}

/** Guardrail codes returned as `error` on a 409 (design.md §3). */
export type AdminGrantGuardrail = 'SELF_MODIFY' | 'LAST_ADMIN';
```

- [ ] **Step 4: Add the API function**

In `src/apis/admin-rbac.api.ts`, extend the type import with `AdminGrantBulkInput, AdminGrantBulkResult` and append:

```ts
// POST /admin/user-grants/bulk — assign / change-role / remove for 1..N users
// in a single write (agentflow-pkyp, design.md D3). Replaces fanning N parallel
// PUTs out of the browser: one audit correlationId, one cache invalidation
// pass, and guardrails that can reject the batch before anything is written.
export const bulkUserGrants = (body: AdminGrantBulkInput): Promise<AdminGrantBulkResult> =>
  http.POST<AdminGrantBulkResult>('/admin/user-grants/bulk', { body }).then((r) => ({
    updated: r?.updated ?? [],
    skipped: r?.skipped ?? [],
  }));
```

- [ ] **Step 5: Run tests and typecheck**

```bash
npm test -- src/apis/admin-rbac.api.test.ts && npx tsc --noEmit
```
Expected: PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/admin-rbac.ts src/apis/admin-rbac.api.ts src/apis/admin-rbac.api.test.ts
git commit -m "feat(lol): add bulk user-grants API client and types [agentflow-pkyp]"
```

---

### Task 7: Add-user modal becomes multi-select

**Files:**
- Modify: `src/pages/config/_components/PermissionsTab/CentralUserPickerModal/index.tsx`
- Modify: `src/pages/config/_components/PermissionsTab/CentralUserPickerModal/CentralUserRow.tsx`
- Modify: `src/pages/config/_components/PermissionsTab/index.tsx` (swap `onSelect` for `onAdded`)
- Test: `src/pages/config/_components/PermissionsTab/CentralUserPickerModal/CentralUserPickerModal.test.tsx`

**Interfaces:**
- Consumes: `bulkUserGrants`, `ASSIGNABLE_ROLE_CODES` (Task 6); existing `getCentralUsers`.
- Produces: `<CentralUserPickerModal onClose defaultRole roles onAdded />` where `onAdded: (count: number, roleCode: string) => void`. The parent no longer receives a `CentralUser` and no longer opens the drawer after picking.

- [ ] **Step 1: Write the failing tests**

Add to `CentralUserPickerModal.test.tsx` (keep the file's existing mock of `@/apis/admin-rbac.api`, extending it with `bulkUserGrants`):

```tsx
  it('keeps a selection made on page 1 after paging to page 2', async () => {
    const user = userEvent.setup();
    renderPicker();
    await screen.findByText('Alpha One');

    await user.click(screen.getByRole('checkbox', { name: /Alpha One/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Beta Two');

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('disables Add until a role is chosen', async () => {
    const user = userEvent.setup();
    renderPicker();
    await screen.findByText('Alpha One');

    await user.click(screen.getByRole('checkbox', { name: /Alpha One/i }));
    expect(screen.getByRole('button', { name: /Add 1 user/i })).toBeDisabled();

    await user.click(screen.getByLabelText(/access role/i));
    await user.click(await screen.findByRole('option', { name: 'Editor' }));
    expect(screen.getByRole('button', { name: /Add 1 user/i })).toBeEnabled();
  });

  it('does not let an already-granted user be selected', async () => {
    renderPicker();
    await screen.findByText('Granted Gary');
    expect(screen.getByRole('checkbox', { name: /Granted Gary/i })).toBeDisabled();
  });

  it('adds every selected user in ONE request', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    renderPicker({ onAdded });
    await screen.findByText('Alpha One');

    await user.click(screen.getByRole('checkbox', { name: /Alpha One/i }));
    await user.click(screen.getByRole('checkbox', { name: /Charlie Three/i }));
    await user.click(screen.getByLabelText(/access role/i));
    await user.click(await screen.findByRole('option', { name: 'Editor' }));
    await user.click(screen.getByRole('button', { name: /Add 2 users/i }));

    await waitFor(() => expect(bulkUserGrants).toHaveBeenCalledTimes(1));
    expect(bulkUserGrants).toHaveBeenCalledWith({
      userIds: ['central-1', 'central-3'],
      action: 'ASSIGN',
      roles: ['EDITOR'],
    });
    expect(onAdded).toHaveBeenCalledWith(2, 'EDITOR');
  });

  it('keeps the modal open and names the guardrail when the server answers 409', async () => {
    const user = userEvent.setup();
    vi.mocked(bulkUserGrants).mockRejectedValueOnce(new Error('LAST_ADMIN'));
    renderPicker();
    await screen.findByText('Alpha One');

    await user.click(screen.getByRole('checkbox', { name: /Alpha One/i }));
    await user.click(screen.getByLabelText(/access role/i));
    await user.click(await screen.findByRole('option', { name: 'Editor' }));
    await user.click(screen.getByRole('button', { name: /Add 1 user/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/LAST_ADMIN/);
    expect(screen.getByRole('button', { name: /Add 1 user/i })).toBeInTheDocument();
  });

  it('pre-selects the role the table is filtered by', async () => {
    renderPicker({ defaultRole: 'ADMIN' });
    await screen.findByText('Alpha One');
    expect(screen.getByLabelText(/access role/i)).toHaveValue('Admin');
  });
```

Add this fixture + helper at the top of the file:

```tsx
const ROLES: AdminRole[] = [
  { code: 'ADMIN', name: 'Admin', permissions: [] },
  { code: 'EDITOR', name: 'Editor', permissions: [] },
  { code: 'VIEWER', name: 'Viewer', permissions: [] },
];

const PAGES: Record<number, CentralUser[]> = {
  0: [
    { userId: 'central-1', name: 'Alpha One', companyEmail: 'alpha@lf.com', lolGrant: null },
    { userId: 'central-3', name: 'Charlie Three', companyEmail: 'charlie@lf.com', lolGrant: null },
    {
      userId: 'central-4',
      name: 'Granted Gary',
      companyEmail: 'gary@lf.com',
      lolGrant: { roles: ['ADMIN'], overrideCount: 0 },
    },
  ],
  1: [{ userId: 'central-2', name: 'Beta Two', companyEmail: 'beta@lf.com', lolGrant: null }],
};

const renderPicker = (props: Partial<ComponentProps<typeof CentralUserPickerModal>> = {}) => {
  getCentralUsers.mockImplementation(async ({ page = 0, pageSize = 10 }) => ({
    users: PAGES[page] ?? [],
    page: { totalElements: 4, pageSize, pageIndex: page, totalPages: 2 },
  }));
  return renderWithProviders(
    <CentralUserPickerModal
      roles={ROLES}
      defaultRole={null}
      onClose={vi.fn()}
      onAdded={vi.fn()}
      {...props}
    />,
  );
};
```

`VIEWER` is present in `ROLES` on purpose: the role `Select` must filter it out via `ASSIGNABLE_ROLE_CODES`, so a test that only ever saw `ADMIN`/`EDITOR` would not catch a regression there. Add a case for it:

```tsx
  it('never offers VIEWER as an assignable role', async () => {
    const user = userEvent.setup();
    renderPicker();
    await screen.findByText('Alpha One');
    await user.click(screen.getByLabelText(/access role/i));
    expect(await screen.findByRole('option', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Viewer' })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/pages/config/_components/PermissionsTab/CentralUserPickerModal
```
Expected: FAIL — no checkboxes rendered, no `ACCESS ROLE` control.

- [ ] **Step 3: Add the checkbox to the row**

In `CentralUserRow.tsx`, change the props and wrap the row so the checkbox drives selection:

```tsx
interface CentralUserRowProps {
  user: CentralUser;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}
```

Replace the `Button unstyled` root with a Mantine `Checkbox` plus a label-shaped row. Keep the existing avatar / name / nmls / `In LOL` badge markup verbatim, and drop the `IconChevronRight` (the row no longer navigates):

```tsx
  return (
    <div
      className={`flex w-full items-center gap-3 border-b border-line-5 px-4 py-3 transition-colors last:border-b-0 ${
        disabled ? 'cursor-not-allowed bg-band opacity-60' : 'cursor-pointer hover:bg-accent-wash'
      } ${selected ? 'bg-accent-wash' : ''}`}
      onClick={disabled ? undefined : onToggle}
    >
      <Checkbox
        checked={selected}
        disabled={disabled}
        onChange={disabled ? undefined : onToggle}
        aria-label={displayName}
        color="orange"
        className="flex-none"
        onClick={(e) => e.stopPropagation()}
      />
      {/* …existing avatar / name / email / nmls / lolGrant badge markup, unchanged… */}
    </div>
  );
```

- [ ] **Step 4: Make the modal multi-select**

In `CentralUserPickerModal/index.tsx`:

```tsx
interface CentralUserPickerModalProps {
  onClose: () => void;
  /** Role catalog from `/admin/roles`; falls back to ASSIGNABLE_ROLE_CODES. */
  roles: AdminRole[];
  /** Active role pill, pre-selected in the footer. `null` on the All pill. */
  defaultRole: string | null;
  onAdded: (count: number, roleCode: string) => void;
}
```

State:

```tsx
  // Keyed by userId, NOT by row index — a selection must survive paging and a
  // new search, so the footer can still name someone picked three pages ago.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNames, setSelectedNames] = useState<Map<string, string>>(new Map());
  const [role, setRole] = useState<string>(defaultRole ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggle = useCallback((picked: CentralUser) => {
    const label = getDisplayName(picked);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(picked.userId)) next.delete(picked.userId);
      else next.add(picked.userId);
      return next;
    });
    setSelectedNames((prev) => {
      const next = new Map(prev);
      if (next.has(picked.userId)) next.delete(picked.userId);
      else next.set(picked.userId, label);
      return next;
    });
  }, []);
```

Rows become:

```tsx
          users.map((candidate) => (
            <CentralUserRow
              key={candidate.userId}
              user={candidate}
              selected={selectedIds.has(candidate.userId)}
              disabled={candidate.lolGrant !== null}
              onToggle={() => toggle(candidate)}
            />
          ))
```

Submit:

```tsx
  const handleAdd = async () => {
    const userIds = [...selectedIds];
    if (userIds.length === 0 || !role) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await bulkUserGrants({ userIds, action: 'ASSIGN', roles: [role] });
      onAdded(userIds.length, role);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('Permissions.picker_add_error'));
    } finally {
      setSubmitting(false);
    }
  };
```

Footer, below the existing pager:

```tsx
      {submitError && (
        <Alert role="alert" color="red" variant="light" className="mt-3" icon={<IconAlertTriangle size={16} />}>
          {t('Permissions.picker_add_failed', { reason: submitError })}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.45] text-muted-2">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {selectedIds.size > 0
              ? t('Permissions.picker_n_selected', { count: selectedIds.size })
              : t('Permissions.picker_none_selected')}
          </span>
          <span className="block truncate">{summary}</span>
        </span>
        <Select
          label={undefined}
          aria-label={t('Permissions.access_role_label')}
          placeholder={t('Permissions.picker_select_role')}
          data={roleOptions}
          value={role || null}
          onChange={(value) => setRole(value ?? '')}
          allowDeselect={false}
          radius="md"
          className="w-[150px]"
        />
        <Button variant="default" radius="xl" onClick={onClose} disabled={submitting}>
          {t('Config.action_cancel')}
        </Button>
        <Button
          color="orange"
          radius="xl"
          loading={submitting}
          disabled={selectedIds.size === 0 || !role}
          onClick={handleAdd}
        >
          {t('Permissions.picker_add_n', { count: selectedIds.size })}
        </Button>
      </div>
```

with, above the return:

```tsx
  const roleOptions =
    roles.length > 0
      ? roles.filter((r) => ASSIGNABLE_ROLE_CODES.includes(r.code as AdminRoleCode)).map((r) => ({ value: r.code, label: r.name }))
      : ASSIGNABLE_ROLE_CODES.map((code) => ({ value: code, label: t(`Permissions.role_${code.toLowerCase()}`) }));

  const names = [...selectedNames.values()];
  const summary =
    names.length === 0
      ? t('Permissions.picker_pick_hint')
      : names.length <= 2
        ? names.join(', ')
        : t('Permissions.picker_names_more', { names: names.slice(0, 2).join(', '), count: names.length - 2 });
```

Also change the modal title key to `Permissions.picker_title_plural` ("Add users").

- [ ] **Step 5: Rewire the parent**

In `PermissionsTab/index.tsx`, delete `pickedUser`, `handlePickUser`, and the `centralUserToAdminUserGrant` import if it becomes unused, then render:

```tsx
      {pickerOpen && (
        <CentralUserPickerModal
          roles={roles}
          defaultRole={roleFilter === ROLE_FILTER_ALL ? null : roleFilter}
          onClose={() => setPickerOpen(false)}
          onAdded={(count, roleCode) => {
            setPickerOpen(false);
            loadUsers();
            showToast(t('Permissions.toast_added', { count, role: roleLabel(roleCode) }));
          }}
        />
      )}
```

Reuse the drawer's existing `SaveToast` component for `showToast`; lift it to the tab if it is currently drawer-local.

`selectedUser` simplifies to `users.find((u) => u.userId === selectedUserId) ?? null`.

- [ ] **Step 6: Run tests, lint, typecheck**

```bash
npm test -- src/pages/config/_components/PermissionsTab && npm run lint && npx tsc --noEmit
```
Expected: PASS. The pre-existing `PermissionsTab.central-picker.test.tsx` asserts the OLD behaviour (picking a user opens the drawer and calls `putUserGrant`) — rewrite those cases to the new contract in this task; do not leave them skipped.

- [ ] **Step 7: Commit**

```bash
git add src/pages/config/_components/PermissionsTab
git commit -m "feat(lol): multi-select Add-users modal with one role per batch [agentflow-pkyp]"
```

---

### Task 7B: Picker pagination — rows-per-page and a numbered pager

design.md §4.1 requires `10 / 25 / 50` rows-per-page plus a numbered pager, replacing the
current prev/next-only footer. Split from Task 7 so multi-select can be reviewed and merged
even if the pager needs another pass.

**Files:**
- Modify: `src/pages/config/_components/PermissionsTab/CentralUserPickerModal/index.tsx`
- Create: `src/pages/config/_components/PermissionsTab/CentralUserPickerModal/PickerPager.tsx`
- Test: `.../CentralUserPickerModal/PickerPager.test.tsx`

**Interfaces:**
- Consumes: the modal's `pageIndex` / `setPageIndex` state (Task 7).
- Produces: `<PickerPager pageIndex={number} pageSize={number} totalElements={number} totalPages={number} onPageChange={(i: number) => void} onPageSizeChange={(n: number) => void} />`.

- [ ] **Step 1: Write the failing test**

Create `PickerPager.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { PickerPager } from './PickerPager';

const render = (props = {}) =>
  renderWithProviders(
    <PickerPager
      pageIndex={0}
      pageSize={10}
      totalElements={26}
      totalPages={3}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      {...props}
    />,
  );

describe('PickerPager', () => {
  it('reports the visible range against the total', () => {
    render();
    expect(screen.getByText('1–10 of 26')).toBeInTheDocument();
  });

  it('reports a partial final page correctly', () => {
    render({ pageIndex: 2 });
    expect(screen.getByText('21–26 of 26')).toBeInTheDocument();
  });

  it('renders one button per page and marks the current one', () => {
    render({ pageIndex: 1 });
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
  });

  it('disables prev on the first page and next on the last', () => {
    render({ pageIndex: 0 });
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('changing rows-per-page reports the new size', async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    render({ onPageSizeChange });
    await user.click(screen.getByLabelText(/rows/i));
    await user.click(await screen.findByRole('option', { name: '25' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('shows nothing but the range when there is a single page', () => {
    render({ totalPages: 1, totalElements: 4 });
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/pages/config/_components/PermissionsTab/CentralUserPickerModal/PickerPager.test.tsx
```
Expected: FAIL — module `./PickerPager` not found.

- [ ] **Step 3: Create `PickerPager.tsx`**

```tsx
// Footer pager for the Add-users modal (agentflow-pkyp, design.md §4.1). The
// directory is ~87k people, so paging is server-side: this component is pure
// presentation over the `page` meta returned by GET /admin/central-users.
import { useTranslation } from 'react-i18next';
import { Button, Select } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const PAGE_SIZES = [10, 25, 50];

interface PickerPagerProps {
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PickerPager({
  pageIndex,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PickerPagerProps) {
  const { t } = useTranslation();
  const first = totalElements === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, totalElements);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Select
        aria-label={t('Permissions.picker_rows_per_page')}
        data={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        value={String(pageSize)}
        onChange={(value) => value && onPageSizeChange(Number(value))}
        allowDeselect={false}
        size="xs"
        radius="md"
        className="w-[76px]"
      />
      <span className="text-[12.5px] tabular-nums text-muted-2">
        {t('Permissions.picker_range', { first, last, total: totalElements })}
      </span>

      {totalPages > 1 && (
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="default"
            radius="md"
            size="xs"
            aria-label={t('Permissions.picker_prev_page')}
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <IconChevronLeft size={14} />
          </Button>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              variant={index === pageIndex ? 'filled' : 'default'}
              color={index === pageIndex ? 'orange' : undefined}
              radius="md"
              size="xs"
              aria-current={index === pageIndex ? 'page' : undefined}
              onClick={() => onPageChange(index)}
              classNames={{ root: 'min-w-[30px] px-[7px] font-mono tabular-nums' }}
            >
              {index + 1}
            </Button>
          ))}
          <Button
            variant="default"
            radius="md"
            size="xs"
            aria-label={t('Permissions.picker_next_page')}
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default PickerPager;
```

> With 87k directory rows and `pageSize: 10`, `totalPages` is ~8,700 — rendering one button per page would emit thousands of nodes. Cap it: render at most 7 numbered buttons around `pageIndex` (first, last, current ±2, with `…` spacers as disabled buttons). Add a test asserting `totalPages: 900` renders no more than 9 buttons before implementing the cap.

- [ ] **Step 4: Swap the pager into the modal**

In `CentralUserPickerModal/index.tsx`, replace `const PAGE_SIZE = 10;` with state:

```tsx
  const [pageSize, setPageSize] = useState(10);
```

Pass `pageSize` into `getCentralUsers({ search: debouncedSearch, page: pageIndex, pageSize })`, add `pageSize` to that effect's dependency array, and reset to the first page when it changes (same reasoning as the existing search reset):

```tsx
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, pageSize]);
```

Then replace the whole existing prev/next block with:

```tsx
      {!loading && !error && pageInfo && (
        <PickerPager
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalElements={pageInfo.totalElements}
          totalPages={pageInfo.totalPages}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
      )}
```

- [ ] **Step 5: Run tests, lint, typecheck**

```bash
npm test -- src/pages/config/_components/PermissionsTab && npm run lint && npx tsc --noEmit
```
Expected: PASS. Task 7's `'keeps a selection made on page 1 after paging to page 2'` still passes — it targets the `next` button by accessible name, which `PickerPager` preserves.

- [ ] **Step 6: Commit**

```bash
git add src/pages/config/_components/PermissionsTab/CentralUserPickerModal
git commit -m "feat(lol): add rows-per-page and a numbered pager to the Add-users modal [agentflow-pkyp]"
```

---

### Task 8: Table row selection + bulk action bar

**Files:**
- Create: `src/pages/config/_components/PermissionsTab/BulkActionBar.tsx`
- Modify: `src/pages/config/_components/PermissionsTab/UserRow.tsx`
- Modify: `src/pages/config/_components/PermissionsTab/index.tsx`
- Test: `src/pages/config/_components/PermissionsTab/PermissionsTab.bulk.test.tsx` (new)

**Interfaces:**
- Consumes: `bulkUserGrants`, `AdminGrantBulkInput`, `ASSIGNABLE_ROLE_CODES` (Task 6); `useAuth()` for the signed-in user's id; `showToast` (lifted out of the drawer in Task 7 Step 5); `getDisplayName` from `./permission-helpers`.
- Produces:
  - `<BulkActionBar count={number} names={string[]} roles={AdminRole[]} busy={boolean} onChangeRole={(roleCode: string) => void} onRemove={() => void} onClear={() => void} />`
  - `USER_ROW_COLS` gains a leading `34px` track (every consumer of that constant must be re-checked — the table header uses it too)
  - `<UserRow … selectable={boolean} checked={boolean} onToggle={() => void} />`
  - `runBulk(input: AdminGrantBulkInput, toastMessage: string): Promise<boolean>` — Task 9 branches on the returned boolean.
  - `removeTargets: AdminUserGrant[]` state, set by `onRemove`; Task 9 renders the dialog from it.

- [ ] **Step 1: Write the failing tests**

Create `PermissionsTab.bulk.test.tsx` mocking `@/apis/admin-rbac.api` and `@/shared/auth/AuthContext` so `useAuth()` returns `{ user: { id: 'u-me' }, permissions: null, permissionsLoaded: true }`, with `listUserGrants` returning `u-me` (ADMIN), `u2` (ADMIN), `u3` (EDITOR):

```tsx
  it('shows no bulk bar until a row is ticked', async () => {
    renderTab();
    await screen.findByText('Chau Tran');
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('never lets the signed-in admin select their own row', async () => {
    renderTab();
    await screen.findByText('Bao Trinh');
    expect(screen.getByRole('checkbox', { name: /Bao Trinh/i })).toBeDisabled();
  });

  it('select-all ticks every filtered row except the actor', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('Chau Tran');
    await user.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('changes the role of every selected user in one request', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('Chau Tran');
    await user.click(screen.getByRole('checkbox', { name: /Chau Tran/i }));
    await user.click(screen.getByLabelText(/change role to/i));
    await user.click(await screen.findByRole('option', { name: 'Admin' }));

    await waitFor(() => expect(bulkUserGrants).toHaveBeenCalledTimes(1));
    expect(bulkUserGrants).toHaveBeenCalledWith({ userIds: ['u3'], action: 'ASSIGN', roles: ['ADMIN'] });
  });

  it('clears the selection when the role filter changes', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('Chau Tran');
    await user.click(screen.getByRole('checkbox', { name: /Chau Tran/i }));
    await user.click(screen.getByRole('radio', { name: /Admin/i }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('surfaces a 409 guardrail without losing the selection', async () => {
    const user = userEvent.setup();
    vi.mocked(bulkUserGrants).mockRejectedValueOnce(new Error('LAST_ADMIN'));
    renderTab();
    await screen.findByText('Chau Tran');
    await user.click(screen.getByRole('checkbox', { name: /Chau Tran/i }));
    await user.click(screen.getByLabelText(/change role to/i));
    await user.click(await screen.findByRole('option', { name: 'Admin' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/LAST_ADMIN/);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/pages/config/_components/PermissionsTab/PermissionsTab.bulk.test.tsx
```
Expected: FAIL — no checkboxes exist.

- [ ] **Step 3: Create `BulkActionBar.tsx`**

```tsx
// Contextual bulk bar for the Permissions table (agentflow-pkyp, design.md
// §4.2). Replaces the table's header row while a selection exists, mirroring
// lf-iq's role UsersTab: the destructive action is only reachable once rows are
// explicitly chosen. Both actions post to the SAME bulk endpoint as the
// Add-users modal — assign, change-role and remove are one server operation.
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, Select } from '@mantine/core';
import type { AdminRole, AdminRoleCode } from '@/shared/types/admin-rbac';
import { ASSIGNABLE_ROLE_CODES } from '@/shared/types/admin-rbac';

interface BulkActionBarProps {
  count: number;
  names: string[];
  roles: AdminRole[];
  busy: boolean;
  onChangeRole: (roleCode: string) => void;
  onRemove: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, names, roles, busy, onChangeRole, onRemove, onClear }: BulkActionBarProps) {
  const { t } = useTranslation();

  const roleOptions =
    roles.length > 0
      ? roles
          .filter((r) => ASSIGNABLE_ROLE_CODES.includes(r.code as AdminRoleCode))
          .map((r) => ({ value: r.code, label: r.name }))
      : ASSIGNABLE_ROLE_CODES.map((code) => ({
          value: code,
          label: t(`Permissions.role_${code.toLowerCase()}`),
        }));

  const summary =
    names.length <= 3
      ? names.join(', ')
      : t('Permissions.bulk_names_more', { names: names.slice(0, 3).join(', '), count: names.length - 3 });

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-accent-line bg-accent-tint px-[22px] py-2.5">
      <span className="text-[13px] font-bold text-accent-ink">
        {t('Permissions.bulk_n_selected', { count })}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{summary}</span>
      <Select
        aria-label={t('Permissions.bulk_change_role_to')}
        placeholder={t('Permissions.bulk_change_role_to')}
        data={roleOptions}
        value={null}
        onChange={(value) => value && onChangeRole(value)}
        disabled={busy}
        radius="md"
        size="xs"
        className="w-[150px]"
      />
      <Button color="red" variant="outline" radius="xl" size="xs" disabled={busy} onClick={onRemove}>
        {t('Permissions.bulk_remove_access')}
      </Button>
      <CloseButton aria-label={t('Permissions.bulk_clear_selection')} onClick={onClear} disabled={busy} />
    </div>
  );
}

export default BulkActionBar;
```

- [ ] **Step 4: Add the checkbox column to `UserRow.tsx`**

Change `USER_ROW_COLS` to prepend a `34px` track, add props `selectable: boolean`, `checked: boolean`, `onToggle: () => void`, and render as the first grid cell:

```tsx
      {selectable ? (
        <Checkbox
          checked={checked}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={displayName}
          color="orange"
          className="flex-none"
        />
      ) : (
        <Tooltip label={t('Permissions.bulk_cannot_select_self')} withArrow>
          <span className="inline-flex">
            <Checkbox checked={false} disabled aria-label={displayName} className="flex-none" />
          </span>
        </Tooltip>
      )}
```

- [ ] **Step 5: Wire selection into `PermissionsTab/index.tsx`**

```tsx
  const { user: actor } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // A selection pointing at rows the admin can no longer see is worse than
  // re-ticking, so any change of what is on screen drops it.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [roleFilter, q]);

  const selectableRows = useMemo(
    () => filteredUsers.filter((u) => u.userId !== actor?.id),
    [filteredUsers, actor?.id],
  );
  const allSelected = selectableRows.length > 0 && selectableRows.every((u) => selectedIds.has(u.userId));
  const someSelected = selectableRows.some((u) => selectedIds.has(u.userId)) && !allSelected;

  const toggleRow = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableRows.map((u) => u.userId)));
  }, [allSelected, selectableRows]);

  // Returns whether the write succeeded. Callers MUST branch on it: the
  // confirm dialog stays open on a 409 so the admin sees which guardrail
  // rejected them, with the selection intact.
  const runBulk = useCallback(
    async (input: AdminGrantBulkInput, toastMessage: string): Promise<boolean> => {
      setBulkBusy(true);
      setBulkError(null);
      try {
        await bulkUserGrants(input);
        setSelectedIds(new Set());
        loadUsers();
        showToast(toastMessage);
        return true;
      } catch (e) {
        setBulkError(e instanceof Error ? e.message : t('Permissions.bulk_failed_generic'));
        return false;
      } finally {
        setBulkBusy(false);
      }
    },
    [loadUsers, showToast, t],
  );
```

Render the bulk bar in place of the header row, and the select-all checkbox otherwise — inside `<TableCard>`, replacing the existing header `<div>`:

```tsx
          {selectedIds.size > 0 ? (
            <BulkActionBar
              count={selectedIds.size}
              names={filteredUsers.filter((u) => selectedIds.has(u.userId)).map(getDisplayName)}
              roles={roles}
              busy={bulkBusy}
              onChangeRole={(roleCode) =>
                void runBulk(
                  { userIds: [...selectedIds], action: 'ASSIGN', roles: [roleCode] },
                  t('Permissions.toast_role_changed', { count: selectedIds.size, role: roleLabel(roleCode) }),
                )
              }
              onRemove={() => setRemoveTargets(filteredUsers.filter((u) => selectedIds.has(u.userId)))}
              onClear={() => setSelectedIds(new Set())}
            />
          ) : (
            <div
              className="grid items-center gap-4 border-b border-line bg-band px-[22px] py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-3"
              style={{ gridTemplateColumns: USER_ROW_COLS }}
            >
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
                disabled={selectableRows.length === 0}
                aria-label={t('Permissions.bulk_select_all')}
                color="orange"
                className="flex-none"
              />
              <span>{t('Permissions.col_member')}</span>
              <span>{t('Permissions.col_access_role')}</span>
              <span>{t('Permissions.col_overrides')}</span>
              <span className="text-right">{t('Permissions.col_effective')}</span>
              <span />
            </div>
          )}
```

and above the table, the guardrail surface:

```tsx
      {bulkError && (
        <Alert role="alert" color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
          {t('Permissions.bulk_failed', { reason: bulkError })}
        </Alert>
      )}
```

Each `<UserRow>` gains:

```tsx
                selectable={u.userId !== actor?.id}
                checked={selectedIds.has(u.userId)}
                onToggle={() => toggleRow(u.userId)}
```

`roleLabel` is a local helper: `const roleLabel = (code: string) => roles.find((r) => r.code === code)?.name ?? code;`

Render `<BulkActionBar …/>` in place of the header `<div>` when `selectedIds.size > 0`, put the select-all `Checkbox` (with `indeterminate={someSelected}`, `aria-label={t('Permissions.bulk_select_all')}`) in the header's first cell otherwise, and show `bulkError` in an `Alert role="alert"` above the table.

- [ ] **Step 6: Run tests, lint, typecheck**

```bash
npm test -- src/pages/config/_components/PermissionsTab && npm run lint && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/config/_components/PermissionsTab
git commit -m "feat(lol): add row selection and a bulk action bar to the Permissions table [agentflow-pkyp]"
```

---

### Task 9: `Remove access` — confirm dialog + drawer entry point

**Files:**
- Create: `src/pages/config/_components/PermissionsTab/ConfirmRemoveDialog.tsx`
- Modify: `src/pages/config/_components/PermissionsTab/index.tsx` (bulk `onRemove` opens it)
- Modify: `src/pages/config/_components/PermissionsTab/UserDetailDrawer/index.tsx` (footer button)
- Test: `src/pages/config/_components/PermissionsTab/ConfirmRemoveDialog.test.tsx` (new); extend `PermissionsTab.bulk.test.tsx`

**Interfaces:**
- Consumes: `runBulk` and `removeTargets` (Task 8); `AvatarBadge`, `getDisplayName`, `getSecondaryEmail` from the existing `PermissionsTab` helpers.
- Produces: `<ConfirmRemoveDialog opened={boolean} users={AdminUserGrant[]} busy={boolean} error={string | null} onCancel={() => void} onConfirm={() => void} />`. Shared verbatim by the drawer and the bulk bar — do not fork it. Also adds `onRequestRemove: () => void` to `UserDetailDrawerProps`.

- [ ] **Step 1: Write the failing tests**

`ConfirmRemoveDialog.test.tsx`:

```tsx
  it('names each affected user for a small batch', () => {
    renderDialog({ users: [USER_A, USER_B] });
    expect(screen.getByText('Chau Tran')).toBeInTheDocument();
    expect(screen.getByText('Luis Pham')).toBeInTheDocument();
  });

  it('caps the list at five and counts the rest', () => {
    renderDialog({ users: SEVEN_USERS });
    expect(screen.getAllByTestId('confirm-remove-user')).toHaveLength(5);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('states that access returns to Viewer', () => {
    renderDialog({ users: [USER_A] });
    expect(screen.getByText(/Viewer/)).toBeInTheDocument();
  });

  it('confirm is disabled while the request is in flight', () => {
    renderDialog({ users: [USER_A], busy: true });
    expect(screen.getByRole('button', { name: /remove access/i })).toBeDisabled();
  });
```

Extend `PermissionsTab.bulk.test.tsx`:

```tsx
  it('removes every selected user in one REMOVE request after confirming', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('Chau Tran');
    await user.click(screen.getByRole('checkbox', { name: /Chau Tran/i }));
    await user.click(screen.getByRole('button', { name: /remove access/i }));
    await user.click(await screen.findByRole('button', { name: /^remove access$/i }));

    await waitFor(() => expect(bulkUserGrants).toHaveBeenCalledTimes(1));
    expect(bulkUserGrants).toHaveBeenCalledWith({ userIds: ['u3'], action: 'REMOVE' });
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/pages/config/_components/PermissionsTab
```
Expected: FAIL — module `./ConfirmRemoveDialog` not found.

- [ ] **Step 3: Create `ConfirmRemoveDialog.tsx`**

```tsx
// Shared confirmation for revoking access (agentflow-pkyp, design.md §4.3),
// used by BOTH the drawer (one user) and the bulk bar (many). It states the
// OUTCOME rather than the mechanism: the person returns to Viewer — homepage
// only, no /config — which is exactly the state of a user who was never
// granted anything (design.md D1/D2).
import { useTranslation } from 'react-i18next';
import { Alert, Button, Modal } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { AdminUserGrant } from '@/shared/types/admin-rbac';
import { AvatarBadge } from './AvatarBadge';
import { getDisplayName, getSecondaryEmail } from './permission-helpers';

const MAX_LISTED = 5;

interface ConfirmRemoveDialogProps {
  opened: boolean;
  users: AdminUserGrant[];
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmRemoveDialog({
  opened,
  users,
  busy,
  error,
  onCancel,
  onConfirm,
}: ConfirmRemoveDialogProps) {
  const { t } = useTranslation();
  const listed = users.slice(0, MAX_LISTED);
  const remaining = users.length - listed.length;

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      centered
      radius="lg"
      title={
        users.length > 1
          ? t('Permissions.remove_confirm_title_many', { count: users.length })
          : t('Permissions.remove_confirm_title')
      }
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
    >
      <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-band p-3.5">
        {listed.map((u) => (
          <div key={u.userId} data-testid="confirm-remove-user" className="flex items-center gap-2.5">
            <AvatarBadge seed={u.userId} name={u.name} avatar={u.avatar} fallbackText={getSecondaryEmail(u)} size={26} />
            <span className="truncate text-[13px] font-semibold text-ink">{getDisplayName(u)}</span>
            <span className="truncate text-[12px] text-muted-2">{getSecondaryEmail(u)}</span>
          </div>
        ))}
        {remaining > 0 && (
          <span className="text-[12.5px] text-muted-2">{t('Permissions.remove_confirm_more', { count: remaining })}</span>
        )}
      </div>

      <p className="mt-3.5 text-[13px] leading-[1.6] text-muted">{t('Permissions.remove_confirm_body')}</p>

      {error && (
        <Alert role="alert" color="red" variant="light" className="mt-3" icon={<IconAlertTriangle size={16} />}>
          {t('Permissions.bulk_failed', { reason: error })}
        </Alert>
      )}

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="default" radius="xl" onClick={onCancel} disabled={busy}>
          {t('Config.action_cancel')}
        </Button>
        <Button color="red" radius="xl" loading={busy} disabled={busy} onClick={onConfirm}>
          {t('Permissions.bulk_remove_access')}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmRemoveDialog;
```

- [ ] **Step 4: Wire it to the bulk bar and the drawer**

In `PermissionsTab/index.tsx`:

```tsx
  const [removeTargets, setRemoveTargets] = useState<AdminUserGrant[]>([]);

  // Closes the dialog ONLY on success. A 409 guardrail leaves it open with
  // `bulkError` rendered inside, so the admin sees which rule rejected them
  // instead of the dialog vanishing and the table looking unchanged.
  const confirmRemove = useCallback(async () => {
    const userIds = removeTargets.map((u) => u.userId);
    const ok = await runBulk(
      { userIds, action: 'REMOVE' },
      t('Permissions.toast_removed', { count: userIds.length }),
    );
    if (ok) setRemoveTargets([]);
  }, [removeTargets, runBulk, t]);
```

Render it next to the drawer:

```tsx
      <ConfirmRemoveDialog
        opened={removeTargets.length > 0}
        users={removeTargets}
        busy={bulkBusy}
        error={bulkError}
        onCancel={() => {
          setRemoveTargets([]);
          setBulkError(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
```

`BulkActionBar`'s `onRemove` already sets `removeTargets` from `selectedIds` (Task 8). The drawer's entry point closes the drawer first, so the confirm is the only thing on screen:

```tsx
        onRequestRemove={() => {
          const target = selectedUser;
          handleCloseDrawer();
          if (target) setRemoveTargets([target]);
        }}
```

In `UserDetailDrawer/index.tsx`, add `onRequestRemove: () => void` to the props and place, at the far left of the existing footer:

```tsx
        <Button variant="subtle" color="red" radius="xl" size="sm" onClick={onRequestRemove}>
          {t('Permissions.bulk_remove_access')}
        </Button>
```

- [ ] **Step 5: Run tests, lint, typecheck**

```bash
npm test -- src/pages/config/_components/PermissionsTab && npm run lint && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/config/_components/PermissionsTab
git commit -m "feat(lol): add Remove access with a shared confirmation dialog [agentflow-pkyp]"
```

---

### Task 10: i18n across 7 locales + a parity test

**Files:**
- Modify: `src/locales/en.json`, `vi.json`, `zh.json`, `he.json`, `es.json`, `ko.json`, `ar.json`
- Create: `src/locales/locales.parity.test.ts`

**Interfaces:**
- Consumes: every `t('Permissions.*')` key introduced in Tasks 7–9.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing parity test**

Create `src/locales/locales.parity.test.ts`:

```ts
// Every locale must expose the same key set. A missing key silently renders the
// raw key path to a user in that language, which is invisible in English-only
// review — this test is the only thing that catches it.
import { describe, expect, it } from 'vitest';
import ar from './ar.json';
import en from './en.json';
import es from './es.json';
import he from './he.json';
import ko from './ko.json';
import vi from './vi.json';
import zh from './zh.json';

const flatten = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key))
    : [prefix];

const LOCALES = { vi, zh, he, es, ko, ar };

describe('locale parity', () => {
  const englishKeys = flatten(en).sort();

  it.each(Object.keys(LOCALES))('%s has exactly the English key set', (code) => {
    const keys = flatten(LOCALES[code as keyof typeof LOCALES]).sort();
    expect(keys.filter((k) => !englishKeys.includes(k))).toEqual([]);
    expect(englishKeys.filter((k) => !keys.includes(k))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — it may already fail on pre-existing drift**

```bash
npm test -- src/locales/locales.parity.test.ts
```
If it reports keys missing from non-English locales that this change did not add, fix that drift here too — that is a real bug, not scope creep.

- [ ] **Step 3: Add the English keys**

In `src/locales/en.json` under `Permissions`:

```json
    "picker_title_plural": "Add users",
    "picker_desc": "Grant Loan Factory users access to Life-of-a-Loan configuration.",
    "picker_select_role": "Select role…",
    "picker_n_selected": "{{count}} selected",
    "picker_none_selected": "No one selected",
    "picker_pick_hint": "Tick people in the list, choose a role, then Add.",
    "picker_names_more": "{{names}} +{{count}} more",
    "picker_add_n": "Add {{count}} users",
    "picker_add_n_one": "Add {{count}} user",
    "picker_add_error": "Could not add these users.",
    "picker_add_failed": "Could not add these users: {{reason}}",
    "picker_rows_per_page": "Rows per page",
    "picker_range": "{{first}}–{{last}} of {{total}}",
    "bulk_n_selected": "{{count}} selected",
    "bulk_names_more": "{{names}} +{{count}} more",
    "bulk_change_role_to": "Change role to",
    "bulk_remove_access": "Remove access",
    "bulk_clear_selection": "Clear selection",
    "bulk_select_all": "Select all",
    "bulk_cannot_select_self": "You cannot change your own access",
    "bulk_failed": "That did not go through: {{reason}}",
    "bulk_failed_generic": "That did not go through.",
    "remove_confirm_title": "Remove access",
    "remove_confirm_title_many": "Remove access — {{count}} people",
    "remove_confirm_more": "+{{count}} more",
    "remove_confirm_body": "They return to Viewer: homepage only, no Config access. This takes effect on their next request, and you can grant again at any time.",
    "toast_added": "Added {{count}} users as {{role}}",
    "toast_added_one": "Added {{count}} user as {{role}}",
    "toast_removed": "Removed access for {{count}} users — back to Viewer",
    "toast_removed_one": "Removed access for {{count}} user — back to Viewer",
    "toast_role_changed": "Changed {{count}} users to {{role}}",
    "toast_role_changed_one": "Changed {{count}} user to {{role}}"
```

> i18next resolves `_one` suffixes for `count: 1` automatically when the base key exists — keep both forms for every counted string.

- [ ] **Step 4: Translate into the other six locales**

Add the same keys to `vi.json`, `zh.json`, `he.json`, `es.json`, `ko.json`, `ar.json`, translated, keeping every `{{placeholder}}` intact and unchanged. Match each file's existing tone. Vietnamese reference:

```json
    "picker_title_plural": "Thêm người dùng",
    "picker_select_role": "Chọn quyền…",
    "picker_n_selected": "Đã chọn {{count}}",
    "picker_none_selected": "Chưa chọn ai",
    "picker_pick_hint": "Tick người trong danh sách, chọn quyền, rồi bấm Thêm.",
    "bulk_remove_access": "Thu hồi quyền",
    "bulk_cannot_select_self": "Bạn không thể thay đổi quyền của chính mình",
    "remove_confirm_body": "Họ sẽ quay về Viewer: chỉ xem được trang chủ, không vào được Cấu hình. Có hiệu lực ngay ở request kế tiếp, và bạn có thể cấp lại bất cứ lúc nào.",
    "toast_removed": "Đã thu hồi quyền của {{count}} người — quay về Viewer"
```

- [ ] **Step 5: Run everything**

```bash
npm test && npm run lint && npx tsc --noEmit && npm run build
```
Expected: all PASS, build succeeds.

- [ ] **Step 6: Commit, push, open the PR**

```bash
git add src/locales
git commit -m "feat(lol): translate bulk assign / remove access strings into 7 locales [agentflow-pkyp]"
git push -u origin agent/agentflow-pkyp-fe
gh pr create --base main --head agent/agentflow-pkyp-fe \
  --title "feat: bulk assign, bulk role change, and Remove access in Permissions [agentflow-pkyp]" \
  --body "Implements openspec/changes/lol-permissions-bulk-assign design.md §4 against docs/mockups/config-permissions-bulk-assign.html. Requires the moso-aid bulk endpoint to be deployed."
```

---

## Verification after both PRs are deployed

- [ ] Open `/config` → Permissions on staging as an admin.
- [ ] `Add user` → tick 3 people across two pages → choose `Editor` → `Add 3 users`. Confirm **one** `POST /admin/user-grants/bulk` in the network tab, and that the History tab groups the three entries under one correlation.
- [ ] Tick two rows → `Change role to → Admin`. Confirm one request.
- [ ] Tick one row → `Remove access` → confirm. The row leaves the table; that user's `/config` 403s on their next request and the homepage still loads for them.
- [ ] Confirm your own row's checkbox is disabled with the tooltip.
- [ ] Re-add a removed user: they reappear with the new role (tombstone cleared).
- [ ] Log in as the removed user: they get the homepage only, and stay that way after a second login (reconcile did not resurrect the grant).
