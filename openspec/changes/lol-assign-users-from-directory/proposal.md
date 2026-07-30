# Proposal: LOL — Assign users from the LoanFactory directory (Permissions tab)

## Problem

The `/config` **Permissions** tab lets an ADMIN edit the RBAC grant (roles + ADD/BLOCK
overrides) of a user — **but only for users who already have a grant document**. The list
(`GET /life-of-a-loan/admin/users`) is backed by `LOLRbacUserGrant.find()`, i.e. it enumerates
existing grants only.

So there is **no UI to bring a brand-new LoanFactory user into LOL**. If Nicole Dang (a
processor who has never been granted anything in LOL, and may never have logged in) needs
EDITOR, an admin has no way to *find* her in the tab and grant her — she simply is not in the
list. This is the concrete pain point: **admins cannot CRUD/assign/unassign LoanFactory users
from `/config`**; today the only way to add someone is a hand-run seed/rekey script.

Note the access layer already supports granting a never-logged-in user: `PUT
/life-of-a-loan/admin/users/:id/grant` **upserts** by central `userId` (login not required).
The **only missing piece is discovery** — a way to search the central user directory and pick
someone to grant.

## Proposed Solution

Add a **central-directory picker** to the Permissions tab, mirroring LF-IQ's proven
"Assign user" modal, using the pattern Tài Phạm confirmed: **any app can read the shared user
list from `user-svc`**.

- **moso-aid proxies the central directory** with a new read endpoint that forwards to
  `GET {gateway}/user-svc/api/v1/users/all` (paginated + searchable), reusing the exact
  central-call pattern already in `lol-actor.js` (forward the caller's bearer via
  `LF_GATEWAY_URL`, 5s timeout). It **annotates each returned user with their existing LOL
  grant** so the UI can show "already in LOL · <role>".
- **Life-of-a-Loan adds an "Add user" button** on the Permissions tab → a modal that searches
  the central directory (debounced search + pagination) → selecting a user opens the **existing
  `UserDetailDrawer`** (empty/VIEWER defaults for a never-granted user) → Save calls the
  **existing** `PUT .../grant`, which materializes the grant.

**Materialize-on-demand, not mirror.** Unlike LF-IQ (which seeds/syncs ~87k users into its own
table), LOL keeps **no local copy of the directory**. A `lifeofloan_rbac_user_grants` doc is
written **only when an admin actually grants a user** (the existing upsert). The directory is
read **live** from central each time it is needed. LOL only ever stores the **key (central
`userId`) + LOL-owned data**; display fields (name / avatar / company_email / nmls) are
**enriched live** from central at render time (existing `enrichGrant`), so there is no staleness
and nothing to sync.

## Scope

**In (v1):**
- moso-aid: `GET /life-of-a-loan/admin/central-users?search=&page=&size=` (proxy + annotate).
- FE: "Add user" button + central-directory picker modal on the Permissions tab; wire selection
  into the existing grant drawer / `PUT .../grant`.
- Result rows show **name · company_email · nmls · LOL-role badge** for disambiguation.

**Out (deferred, separate change):**
- **Academy** (per-user `jobRole`, learning path, progress, login-provision, redirect-by-role).
  This proposal deliberately does not add a new collection; the existing grant doc is the seed
  a later academy change extends.
- **Optimistic concurrency** (version/`updatedAt` check → 409 on simultaneous edits of the same
  user). v1 is last-write-wins; every change is already recorded in the audit log. Low
  probability at LOL's scale (~13 admins).
- **Staff-only / app-access filtering** of the directory (see Design §"Directory scope").

## Decisions (locked with the user)

1. **Full directory + search** (not a staff-only filter): central has **no reliable
   is-staff field** (`company_email` is unreliable — several staff have none), so a filter would
   risk *hiding* legitimate staff. Search already hides the ~83k customer/partner noise behind a
   name/email query. Follow-up: **ask Tài** whether `/users/all` can filter by app-access
   (`app_code=LOL`); if yes, adopt that as the ideal filter later.
2. **Keep the grant doc on full unassign** (empty roles/overrides) rather than delete — reserved
   for future academy progress + preserves audit history.
3. **Optimistic-lock deferred** to a later phase (see Out).

## Non-goals

- No change to the RBAC model (ADMIN / EDITOR / VIEWER) or to `hasConfigEditAccess` (the VIEWER
  `/config` gate shipped separately in lol#76).
- No mirror/sync job, no bulk seed of central users.
