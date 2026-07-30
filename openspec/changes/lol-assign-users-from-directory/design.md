# Design: LOL — Assign users from the LoanFactory directory

## Architecture (one BE read-endpoint + one FE picker; write path already exists)

```
Permissions tab                     moso-aid                         central (via LF_GATEWAY_URL)
──────────────                      ────────                         ────────────────────────────
[Add user] ─► CentralUserPickerModal
   GET /life-of-a-loan/admin/central-users?search=&page=&size=
                        └─ requireLolAdmin
                        └─ forward bearer ─► GET /user-svc/api/v1/users/all?...  ─► Page<User>
                        └─ lookup grants (LOLRbacUserGrant.find({_id:{$in: pageUserIds}}))
                        └─ normalize + annotate ─► { users:[…lolGrant], page:{…} }
select user ─► UserDetailDrawer (existing)
   GET  /admin/users/:id/grant   (existing; empty default if no grant)
   PUT  /admin/users/:id/grant   (existing; upsert = materialize)
```

The **write path is unchanged** — `getUserGrant` already returns an empty default for a
never-granted id, and `putUserGrant` already upserts. This change adds **only the directory
read + the FE entry point** that feeds an id into that existing flow.

## Backend — `GET /life-of-a-loan/admin/central-users`

- **Route:** registered in `moso-aid/src/routes/index.js` alongside the other
  `/life-of-a-loan/admin/*` routes, gated by `requireLolAdmin`.
- **Query params (pass-through to central):** `search` (free-text name/email), `page`, `size`.
  Mirror exactly what LF-IQ's working `AssignRoleModal` sends to its own `/users`; confirm the
  tera-core `@SearchEntity` free-text `search=` contract against `user-svc` during
  implementation (fall back to the `filter=` DSL if `search=` is not honoured).
- **Central call:** reuse the `lol-actor.js` pattern —
  `fetch(`${gatewayUrl()}/user-svc/api/v1/users/all?…`, { headers: { Authorization: Bearer <caller token> }, signal: AbortSignal.timeout(5000) })`.
  `gatewayUrl()` = `process.env.LF_GATEWAY_URL`.
- **Annotate with existing LOL grant:** after receiving the page, one Mongo query
  `LOLRbacUserGrant.find({ _id: { $in: pageUserIds } })` → attach `lolGrant` to each user.
- **Normalize** Spring `Page<User>` → the LOL FE shape:
  ```jsonc
  {
    "success": true,
    "data": {
      "users": [{
        "userId": "<central id>",
        "name": "Nicole Dang",
        "email": "nicole@…",
        "companyEmail": "nicole@loanfactory.com",
        "avatar": "…",
        "nmls": "…",
        "lolGrant": { "roles": ["EDITOR"], "overrideCount": 0 } // or null if not in LOL
      }],
      "page": { "totalElements": 87823, "pageSize": 30, "pageIndex": 0, "totalPages": 2928 }
    }
  }
  ```
- **Error handling:** central timeout/5xx → `500` with a clear message; the modal surfaces it
  with a retry and does **not** break the rest of the Permissions tab.
- **Risk/assumption to verify on staging:** central `/users/all` authorizes a **LOL-admin's
  forwarded bearer** (Tài: "any app can read the user list"). If it requires a service token,
  add an env-configured token — this does not change the architecture.

## Frontend — Permissions tab picker

- **Entry point:** an **"Add user"** button in the Permissions tab header (near the existing
  user list), matching LF-IQ's "Assign user" affordance.
- **`CentralUserPickerModal`:** debounced search (~500ms), pagination (`pageSize` naming per repo
  convention), loader + empty/error states. Each row shows **avatar · name · company_email · nmls**
  and, when `lolGrant` is present, a badge **"In LOL · <role>"** (the disambiguator that answers
  the "another admin searches an already-granted Nicole" case).
- **Selection:** clicking a row opens the **existing `UserDetailDrawer`** for that `userId`.
  - Never-granted user → drawer loads the empty default (VIEWER role defaults per the redesign),
    admin ticks capabilities, Save → `PUT .../grant` upserts (materialize).
  - Already-in-LOL user → drawer loads the current grant (roles pre-checked), so the admin edits
    on top of the real state — no accidental wipe, full visibility.
- **After Save:** refresh the Permissions tab list so the newly-granted user appears as a normal
  row.
- **i18n:** all new strings via the existing i18n layer, added to all locales.

## Data model

- **No new collection.** Reuse `lifeofloan_rbac_user_grants`, keyed by central `userId`, written
  only on assign (existing upsert). Full unassign leaves an **empty** doc (roles/overrides `[]`),
  not a delete.
- **Store key + LOL-owned data only**; enrich name/avatar/company_email/nmls **live** from
  central at render (existing `enrichGrant`) → no drift, nothing to sync.

## Testing

- **BE (moso-aid, vitest/jest as in repo):**
  - normalize: Spring `Page<User>` → FE shape; empty/edge pages.
  - annotate: mix of users with/without grants → correct `lolGrant` (incl. `overrideCount`).
  - central failure (timeout/5xx) → graceful `500`, no throw leaking.
  - route gated by `requireLolAdmin` (unauth → rejected).
- **FE (life-of-a-loan, vitest):**
  - modal: search debounce, pagination, loading/empty/error.
  - row badge renders for `lolGrant` present vs null.
  - selecting a row opens the drawer with the correct `userId`; Save calls `PUT .../grant`.

## Rollout

- BE + FE independent PRs (lol GitLab-flow: base `main` → auto `master`/staging → manual
  `production`; moso-aid `master` → `pro`). Verify the central `/users/all` auth assumption on
  staging before prod.
- Independent of lol#76 (VIEWER `/config` gate).
