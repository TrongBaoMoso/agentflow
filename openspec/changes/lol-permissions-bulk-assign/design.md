# Design: LOL Permissions — bulk assign, unassign, implicit VIEWER

Bead `agentflow-pkyp` · decided in session 2026-07-31 · see `proposal.md` for the problem.

## 1. Vocabulary

Two unrelated things in this codebase are both called "role". This document only ever means the
first:

| | |
|---|---|
| **Access role** — `lifeofloan_rbac_roles`, codes `ADMIN`/`EDITOR`/`VIEWER` | who may use the Config surface. **This document.** |
| Workflow role — `lifeofloan_roles` (`LOLRole`), a step in the loan timeline | loan-process config data. Untouched. |

Two LOL-owned collections hold user data, with different jobs:

| | `lifeofloan_rbac_user_grants` | `lifeofloan_config_users` |
|---|---|---|
| Job | authorization record — the only input to `evaluate()` | display cache + audit-actor directory |
| Written when | an admin grants (`putUserGrant`), or `reconcileGrant` re-keys | user authenticates via LOL (`ensureConfigUser`), **or** an admin merely views their row (`ensureUserProfile`, 24h TTL) |
| Losing it | access lost | harmless, rebuilds from user-service |

`GET /admin/users` enumerates the first collection — which is why the Permissions table lists
only granted users, and why growing that collection changes the table's shape.

## 2. Decisions

### D1 — `VIEWER` is the implicit default role, carrying zero permissions

```jsonc
// moso-aid/src/data/lol-rbac-setup.json
{ "code": "VIEWER", "name": "Viewer", "description": "Default — homepage only, no Config access",
  "permission_groups": [] }                                   // was: [{ CONFIG_READ }]
```
```js
// moso-aid/src/services/lol-authz.js — loadEffective()
if (!grant) return { roles: ['VIEWER'], codes: new Set() }     // was: roles: []
```

`GET /audit-logs` **is** catalogued (`LOL_AUDIT_LIST`), so a zero-permission `VIEWER` is denied
it server-side — not merely hidden in the UI. `GET /config` is uncatalogued and public, so the
homepage keeps working for everyone, logged in or not.

`hasConfigEditAccess` is **not** changed. With `VIEWER` at zero permissions, `/permissions/me`
returns `[]`, which fails closed under both the current formulation
(`some(p => p.method !== 'GET')`) and the simpler `length > 0`. Leaving it alone keeps the diff
smaller; it becomes worth revisiting only when `AUDITOR` lands (a GET-only role that *should*
open `/config`).

**Rejected — auto-granting a real `VIEWER` document on first login.** It reaches the same
mental model but forces three further changes: server-side pagination for `GET /admin/users`
(today it returns every document, unpaginated), a separate count query for the role pills, and
a default "Has access" filter so the table isn't buried under hundreds of zero-permission rows.
It also makes `rbac_user_grants` a de-facto mirror of everyone who ever logged in, which
`lol-rbac-admin.js` explicitly avoids ("LOL never mirrors the directory"). And it buys nothing
for engagement tracking: `config_users.firstSeenAt` / `lastLoginAt` already record that, with no
grant involved.

**Consequence — `VIEWER` stops being assignable.** It is the state you are in when nothing was
granted. The role dropdown offers `ADMIN` / `EDITOR`; returning someone to `VIEWER` is what
`Remove access` does.

### D2 — first-login user and revoked user are deliberately indistinguishable

Authorization-wise they are identical: no grant document → `{ roles: ['VIEWER'], codes: Set() }`
→ same `/permissions/me` response. That is the intent.

They differ only in bookkeeping, and only where it is useful:

| | never granted | revoked |
|---|---|---|
| effective codes | `[]` | `[]` |
| `roles` reported | `['VIEWER']` | `['VIEWER']` |
| row in Permissions table | no | no (filtered by `revokedAt`) |
| `config_users` doc | yes | yes |
| `audit_logs` entry | none | `action: 'delete'`, `entityType: 'grant'`, `changes: roles EDITOR → []`, actor, timestamp |

So the History tab answers "was this person ever granted?" while the authorization layer treats
both identically. Revocation takes effect on the **next request** — `invalidate(userId)` runs
after every grant write, so the 30s `getEffective` cache is not a revocation window.

### D3 — one bulk endpoint for assign / change-role / remove, `1..N` users

Four parallel `PUT`s from the browser was rejected: it produces N unrelated audit entries, N
cache invalidations, and a partial failure nobody owns. One endpoint, one write, one audit
correlation.

```
POST /api/life-of-a-loan/admin/user-grants/bulk        (requireLolAdmin)

{
  "user_ids":  ["u1", "u2", "u3"],          // 1..50, deduped, non-empty
  "action":    "ASSIGN" | "REMOVE",
  "roles":     ["EDITOR"],                  // ASSIGN only, required, validated vs LOLRbacRole ids
  "overrides": [{ "code": "...", "effect": "ADD" | "BLOCK" }]   // optional
}
```

Rules:

- `overrides` is rejected `400` when `user_ids.length > 1` — an override is per-person by
  definition, so applying one batch-wide is always a mistake.
- `roles` may not contain `VIEWER` (D1) → `400`.
- `ASSIGN` **replaces** `roles` and `overrides`, matching the existing single `PUT` semantics.
- `ASSIGN` clears `revokedAt` / `revokedBy`, so re-granting a previously revoked user works.

Response:

```jsonc
200 { "success": true,
      "data": { "updated": [GrantView], "skipped": [{ "user_id", "reason" }] } }

409 { "success": false, "error": "SELF_MODIFY" | "LAST_ADMIN",
      "details": { "user_ids": ["..."] } }
```

The existing `PUT /admin/users/:id/grant` **stays** (deployed FE depends on it, and it is the
drawer's per-user + overrides path). Guardrails therefore live in a shared service function
called by both — putting them only in the new endpoint would leave the old one as a bypass.

### D4 — `Remove access` writes a tombstone and closes every same-email identity

`reconcileGrant` is the self-healing valve for central `user_id` churn (three lockouts between
2026-07-23 and 2026-07-30): when an authenticated caller has no grant, it adopts a live grant
whose `email` matches one of the caller's token-verified emails.

That valve will re-open a revocation. Concretely:

```
1. a@lf.com holds EDITOR at user_id U1. Central re-provisions the account → new id U2.
   U1's doc is still live (supersededBy null) because a@lf.com has not logged in since.
2. An admin finds a@lf.com in the picker (which lists U2) and grants EDITOR → doc U2.
   Two live docs now share that email — the drift state that has occurred in production.
3. Admin revokes a@lf.com. A plain DELETE removes doc U2.
4. a@lf.com logs in as U2 → no grant → reconcileGrant(U2, ['a@lf.com']) finds live doc U1
   → copies EDITOR onto U2.  ← access returns with nobody acting
```

So removal must act on the **person**, not on one `user_id` — the same unit `reconcile` already
reasons about:

```js
// REMOVE, per user_id, inside the single bulkWrite
{ $set: { roles: [], overrides: [], revokedAt: now, revokedBy: actorId, updatedAt: now } }

// then, once per removed person
LOLRbacUserGrant.updateMany(
  { _id: { $ne: id }, email: <case-insensitive exact>, supersededBy: { $in: [null, ''] } },
  { $set: { supersededBy: id, supersededAt: now } }
)
```

Why a tombstone rather than `deleteOne`:

- The document still exists, so `reconcileGrant`'s own first guard —
  `if (await exists({ _id: userId })) return null` — blocks resurrection **by construction**,
  with no new condition added to that file.
- `roles: []` → zero codes → exactly "back to `VIEWER`" (D1).
- The `updateMany` also closes the path where the person is later re-provisioned to a third id
  `U3`: no live same-email doc remains for reconcile to find.
- It preserves the data for the deferred "previously EDITOR, revoked on X by Y" badge.
- Growth is bounded by the number of people actually revoked — single digits, not the thousands
  that auto-granting would add.

`GET /admin/users` gains `revokedAt: { $in: [null] }` alongside its existing `supersededBy`
filter, so a tombstoned row leaves the table.

### D5 — grants must persist the account's primary email (fixes a latent bug)

`putUserGrant` inserts with `$setOnInsert: { email: before?.email ?? '' }`, which for a brand-new
grant is `''`. **Every grant created through the picker has an empty `email`.** Two consequences,
both pre-existing:

- `reconcileGrant` matches candidates on `email`, so it can never protect a picker-created
  grant — those users are exactly the ones drift will orphan.
- D4's same-email closure would be a no-op for them.

`ASSIGN` therefore resolves the email server-side via `ensureUserProfile(id, token)` (already
present, already cached with a 24h TTL) and writes the account's **primary** email — the address
`ensureConfigUser` records from the token, and therefore the one `reconcile` compares against.
Not `companyEmail`, and not a value taken from the request body: keeping the matching key
server-derived preserves `reconcile`'s safety argument.

## 3. Backend changes (`moso-aid`)

| File | Change |
|---|---|
| `src/data/lol-rbac-setup.json` | `VIEWER.permission_groups: []` (D1) |
| `src/services/lol-authz.js` | `loadEffective`: no grant → `roles: ['VIEWER']` (D1) |
| `src/services/lol-rbac-write.js` *(new)* | `applyGrants({ actor, userIds, action, roles, overrides, token })` — validation, guardrails, `bulkWrite`, same-email closure, audit, `invalidate`. Single write path. |
| `src/controller/lol-rbac-admin.js` | `bulkUserGrants` handler → `applyGrants`; `putUserGrant` refactored to call `applyGrants` with one id; `listUsers` adds `revokedAt` filter |
| `src/validation/lol-rbac-admin.js` | `validateBulkUserGrants` — body shape, 1..50 ids, `roles` required on ASSIGN, no `VIEWER`, `overrides` only with a single id |
| `src/routes/index.js` | `router.post('/life-of-a-loan/admin/user-grants/bulk', requireLolAdmin, validateBulkUserGrants, lolRbacAdmin.bulkUserGrants)` |
| `src/models/lol-rbac.js` | `RbacUserGrantSchema` += `revokedAt: Date|null`, `revokedBy: String` |

Guardrails, evaluated in `applyGrants` **before any write**, returning `409` with the offending
ids and writing nothing:

- **`SELF_MODIFY`** — `userIds` contains `actor.id` and the operation is `REMOVE`, or an
  `ASSIGN` whose resulting roles would no longer grant `LOL_ADMIN`. An admin locking themselves
  out mid-batch is unrecoverable from the UI.
- **`LAST_ADMIN`** — count live grants (`supersededBy` null, `revokedAt` null) whose roles
  resolve to a permission set containing `LOL_ADMIN`; subtract those this operation would
  demote or revoke; require `>= 1`.

  `LAST_ADMIN` is **not reachable through normal single-admin use**, and the mockup confirmed
  it: the tab requires `LOL_ADMIN` to open, and the actor's own row is excluded from selection,
  so the actor always survives their own batch. It exists for the two cases `SELF_MODIFY`
  cannot see:

  - **Concurrent admins.** Admin A revokes B while B revokes A, in two tabs. Neither request
    touches its own actor, so `SELF_MODIFY` passes both and the admin set empties. Evaluating
    `LAST_ADMIN` server-side against live data makes the second write lose.
  - **Direct API calls** bypassing the UI, including through the older
    `PUT /admin/users/:id/grant`.

  So it is a server-side invariant, not a UI affordance — the FE should not try to predict it
  (see §4.3).

Audit: one `recordAudit` entry per affected user, all sharing one `correlationId` from
`newCorrelationId()`, so the History tab can group a batch as a single act
("added 4 users as Editor") instead of four unrelated rows. `action` is `create` / `update` /
`delete` per the existing enum, `entityType: 'grant'`.

## 4. Frontend changes (`life-of-a-loan`)

All under `src/pages/config/_components/PermissionsTab/`.

### 4.1 `CentralUserPickerModal` — multi-select

- `selectedIds: Set<string>` persists across pagination **and** across search changes, keyed by
  `userId`; the footer summarises names so a selection made three pages ago stays visible.
- Rows-per-page `10 / 25 / 50` + numbered pager, replacing prev/next only (matches the Claude
  Design footer).
- A row whose `user.lolGrant` exists and is not revoked → checkbox disabled, keeps its
  `In LOL · <role>` badge. Changing an existing grant is the drawer's job, not the picker's.
- Footer: `N selected` + name summary · `ACCESS ROLE` `Select` (`ADMIN`/`EDITOR` from
  `/admin/roles`, `VIEWER` excluded) · `Cancel` · `Add N users`.
- **Role must be chosen before `Add` enables.** Default comes from the active role pill when it
  is a real role; on the `All` pill the select opens empty with a `Select role` placeholder.
  This is what satisfies "force the admin to decide the role" *without* disabling the
  `Add user` button on the `All` tab — the button stays reachable, the modal does the asking.
- Submit → one `POST .../bulk` with `action: 'ASSIGN'`. On success: toast
  `Added 4 users as Editor`, close, refetch the list. On `409`: keep the modal open and show the
  named guardrail violation inline.

### 4.2 Table — selection + bulk bar

- New leading checkbox column on `UserRow`; header checkbox selects **all currently filtered
  rows** with an indeterminate state.
- The signed-in admin's own row: checkbox disabled with a tooltip
  (`You cannot change your own access`), mirroring the `SELF_MODIFY` guardrail.
- `BulkActionBar` *(new)* replaces the header row while a selection exists:
  `N selected` · `Change role to ▾` (`ADMIN`/`EDITOR`) · `Remove access` · `✕` clear.
  Both actions post to the same bulk endpoint.
- Selection clears after a successful mutation and on filter/search change (a stale selection
  pointing at rows you can no longer see is worse than re-ticking).

### 4.3 Drawer + confirmation

- `UserDetailDrawer` footer gains `Remove access` (red subtle) beside `Reset` / `Save changes`.
- `ConfirmRemoveDialog` *(new)*, shared by drawer and bulk bar: lists up to 5 names then
  `+N more`, and states the outcome plainly — *they return to Viewer: homepage only, no Config
  access. You can grant again at any time.*
- **`SELF_MODIFY` is prevented in the UI; `LAST_ADMIN` is only reported.** The own-row checkbox
  is disabled with a tooltip, because that state is knowable locally and permanent. The FE must
  **not** try to grey out actions on a predicted last-admin — the condition is unreachable from
  a correct single-admin session (§3) and a client-side count is stale the moment another admin
  is acting. A `409 LAST_ADMIN` is instead surfaced as a named error, selection intact, so the
  admin can retry after refreshing.

### 4.4 Conventions

- Mantine `Checkbox` (first use in this repo) and Mantine `Button` with `unstyled` +
  `classNames` for row-shaped buttons. **No bare `<button>`/`<p>`/`<h*>`** — `tailwind.config.ts`
  sets `corePlugins: { preflight: false }`, so unreset elements leak UA borders and
  `margin: 1em 0`.
- Every string via `useTranslation()` into all **7** locales
  (`en`, `vi`, `zh`, `he`, `es`, `ko`, `ar`) under the existing `Permissions.*` namespace.
- Optional chaining / null guards on every enrichment field (`name`, `avatar`, `companyEmail`,
  `nmls`, `lolGrant`) — `GET /admin/users` documents enrichment on GET only.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Select 4, one write fails mid-batch | `bulkWrite` is per-op (not a transaction); response `skipped[]` names the failures and the toast reports `3 of 4 added` — no silent partial success |
| Re-grant a revoked user | `ASSIGN` clears `revokedAt`; the row reappears |
| Revoked user logs in again | tombstone exists → `reconcileGrant` returns `null` at its first guard → stays `VIEWER` |
| Revoked user re-provisioned to a new `user_id` | same-email closure marked every old doc `supersededBy` → no candidate → stays `VIEWER` |
| Grant with empty `email` (existing rows) | D5 backfills on the next `ASSIGN`; the same-email closure is skipped when `email` is empty rather than matching `''` against everything |
| `/admin/roles` unreachable | role select falls back to the `ADMIN_ROLE_CODES` constant minus `VIEWER`; bulk bar still works |
| Admin ticks their own row via header select-all | own row is excluded from select-all, not silently included then rejected |
| Selection spans a filter change | cleared, with the count visibly resetting |

## 6. Testing

**Backend (`moso-aid`, vitest)**
- `lol-authz`: no grant → `roles: ['VIEWER']`, `codes` empty; `GET /audit-logs` DENY for
  `VIEWER`, ALLOW for `EDITOR`.
- `applyGrants`: ASSIGN 1 and N; overrides rejected with N ids; `VIEWER` rejected; `revokedAt`
  cleared on re-grant; one `correlationId` per batch; `invalidate` called per id.
- Guardrails: `SELF_MODIFY` on self-remove and on self-demote; `LAST_ADMIN` when the batch would
  empty the admin set; **both asserted to write nothing** on rejection.
- `LAST_ADMIN` concurrency: two `applyGrants` calls, A revoking B and B revoking A, neither
  touching its own actor — the second must be rejected `409` and at least one admin must survive.
- REMOVE: tombstone shape; same-email docs marked `supersededBy`; empty-email skips the closure.
- **Resurrection regression test** — the exact D4 sequence: two live same-email docs → REMOVE →
  `reconcileGrant` on next login returns `null` and the user keeps zero codes.
- `listUsers` hides tombstoned and superseded rows.

**Frontend (`life-of-a-loan`, vitest + RTL)**
- Picker: selection survives page change and search change; already-granted row not selectable;
  `Add` disabled until a role is chosen; one `POST` for four users; `409` keeps the modal open.
- Table: header select-all excludes own row; bulk bar appears/clears; own-row checkbox disabled
  with tooltip.
- Confirm dialog wording renders for 1 and for `>5` users.
- All 7 locale files contain every new key (existing i18n parity test, if present, else add).

## 7. Rollout

1. **Phase 0** — `moso-aid`: D1 (two edits) + re-run `lol-rbac-seed.js`. Count existing `VIEWER`
   grants on staging and prod first, purely to record the blast radius; nobody is using the
   audit API, so no migration is needed.
2. **Phase 1a** — `moso-aid`: schema fields, `lol-rbac-write.js`, bulk endpoint, validation,
   `listUsers` filter, guardrails, tests. Deploy before the FE.
3. **Phase 1b** — `life-of-a-loan`: picker, table selection, bulk bar, drawer, confirm dialog,
   i18n, tests. An HTML mockup is reviewed and approved before this step.

`lol-rbac-seed.js` overwrites `VIEWER.permissions` — intentional, but not automatically
reversible; the previous value is one line in git if a rollback is ever needed.

## 8. Follow-ups (bd issues, not this change)

- `AUDITOR` role = `CONFIG_READ`, plus flipping `hasConfigEditAccess` to `length > 0` so a
  GET-only role can open `/config` and see the History tab.
- "Previously `EDITOR`, revoked on `<date>` by `<admin>`" badge in the picker, read from the
  audit log.
- History tab grouping batched grant entries by `correlationId`.
- `RoleFilterPills` uses bare `<button>` under `preflight: false` — audit for UA style leaks.
