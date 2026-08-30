# Proposal: LOL Permissions — bulk assign, unassign, implicit VIEWER

Bead: `agentflow-pkyp` · Repos: `moso-aid` (BE) + `life-of-a-loan` (FE)
Extends: `openspec/changes/lol-self-owned-rbac`, `openspec/changes/lol-assign-users-from-directory`

## Problem

The Config → Permissions tab can grant access but has three concrete gaps.

**1. Granting is one-at-a-time.** `CentralUserPickerModal` (agentflow-owu6, PR #91) is pure
discovery: pick a user → the modal closes → `UserDetailDrawer` opens → choose a role → Save.
Onboarding four people means running that five-step cycle four times. The Claude Design
redesign (`Life of a Loan - Permissions (redesign).dc.html`) improves the modal's structure —
role selector moves into the modal footer, real pagination — but is still single-select.

**2. There is no unassign.** No FE affordance and no BE endpoint. An admin can grant `ADMIN`
and then cannot take it back from the UI; the only recovery is a manual Mongo edit. For an
access-control surface this is the more dangerous half of the feature to be missing.

**3. `VIEWER` is a dead role, and "everyone is a VIEWER" isn't true.**

- `VIEWER` carries `CONFIG_READ` → `LOL_AUDIT_LIST` (`GET /audit-logs`), but
  `hasConfigEditAccess` requires at least one non-`GET` permission, so a `VIEWER` is bounced
  off `/config` by `RequireLolAccess` (deliberately, PR #78). The permission is unreachable
  through any UI — only via a raw API call with their own token.
- No role has `is_default: true`, and `loadEffective` returns `{ roles: [], codes: Set() }`
  for a user with no grant. So a first-time user is not a `VIEWER`; they are role-less. The
  intended mental model ("every user starts as VIEWER, homepage only") is not what the system
  implements.

## Proposed solution

Four changes, in this order.

**A. `VIEWER` becomes the implicit, zero-permission default role.** Strip `CONFIG_READ` from
the `VIEWER` seed, and have `loadEffective` return `roles: ['VIEWER']` when there is no grant
document. Every user then *is* a `VIEWER` — API-visibly — while `rbac_user_grants` still holds
only people an admin deliberately granted. `VIEWER` stops being assignable: it is the state you
are in when nothing was granted, so the assignable set becomes `ADMIN` / `EDITOR`.

**B. One bulk grant endpoint, `1..N` users.** `POST /admin/user-grants/bulk` with
`{ userIds, action: 'ASSIGN' | 'REMOVE', roles?, overrides? }` — a single `bulkWrite`, a
single `correlationId` for the whole batch, guardrails evaluated before any write. It serves
add-users, change-role, and remove-access, for one person or many, through one code path.

**C. Add-user modal becomes multi-select.** Checkbox selection persisting across pages and
searches, one `ACCESS ROLE` for the whole batch, `Add N users`. Already-granted rows are
disabled and badged. Role must be chosen before the primary button enables.

**D. Remove access, per-user and bulk — implemented as a tombstone.** A plain `DELETE` is not
safe here: `reconcileGrant` re-adopts any live same-email grant whenever an authenticated
caller has no grant, so a revoked user can have their old grant copied back onto them on their
next login. Removal therefore writes `{ roles: [], revokedAt, revokedBy }` and marks every
other live grant for the same person `supersededBy`, which closes that path by construction.

## Not in this change

- `AUDITOR` role (`CONFIG_READ` only). Deferred — no auditor persona exists yet. `CONFIG_READ`
  stays in the catalog, still held by `ADMIN`/`EDITOR`.
- Auto-granting a real `VIEWER` document on first login, and the server-side pagination +
  "Has access" default filter that would then be mandatory for `GET /admin/users`. Superseded
  by (A), which achieves the same mental model without growing the collection.
- "Previously EDITOR, revoked on <date> by <admin>" badge in the picker. The audit log already
  holds the data; surfacing it is a follow-up.

## Success criteria

1. An admin grants `EDITOR` to four people in one modal pass, one API call, one History entry.
2. An admin revokes access from the table (bulk) or the drawer (single); the row leaves the
   table and the user loses `/config` on their very next request.
3. A revoked user who logs in again does **not** regain their old grant.
4. An admin cannot remove or demote themselves, and cannot remove the last `ADMIN` — enforced
   server-side, not only in the UI.
5. `GET /permissions/me` reports `roles: ['VIEWER']` with zero permission codes for a user who
   has never been granted anything, and identically for a revoked user.
