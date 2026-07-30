# Tasks: LOL — Assign users from the LoanFactory directory

## Backend (moso-aid) — base `master`

- [ ] **BE-1** Add `getCentralUsers` in `src/controller/lol-rbac-admin.js`: forward
  `search/page/size` to `GET {LF_GATEWAY_URL}/user-svc/api/v1/users/all` with the caller's bearer
  (reuse the `lol-actor.js` fetch+timeout pattern). Confirm the `@SearchEntity` search param
  contract (free-text `search=` vs `filter=` DSL) against `user-svc`.
- [ ] **BE-2** Annotate: `LOLRbacUserGrant.find({ _id: { $in: pageUserIds } })` → attach
  `lolGrant { roles, overrideCount } | null` per user.
- [ ] **BE-3** Normalize Spring `Page<User>` → `{ users:[{userId,name,email,companyEmail,avatar,nmls,lolGrant}], page:{totalElements,pageSize,pageIndex,totalPages} }`.
- [ ] **BE-4** Register route `GET /life-of-a-loan/admin/central-users` in `src/routes/index.js`,
  gated by `requireLolAdmin`.
- [ ] **BE-5** Error handling: central timeout/5xx → `500` clear message, no throw leak.
- [ ] **BE-6** Tests: normalize, annotate (mixed grant/no-grant + overrideCount), central-failure,
  auth gate.

## Frontend (life-of-a-loan) — base `main`

- [ ] **FE-1** `CentralUserPickerModal`: debounced search, pagination, loader/empty/error; calls
  `GET /admin/central-users`.
- [ ] **FE-2** Row: avatar · name · company_email · nmls + "In LOL · <role>" badge when
  `lolGrant` present.
- [ ] **FE-3** "Add user" button in the Permissions tab header → opens the modal.
- [ ] **FE-4** Selecting a row opens the existing `UserDetailDrawer` for that `userId`; on Save
  (existing `PUT .../grant`) refresh the Permissions tab list.
- [ ] **FE-5** i18n strings for modal/button in all locales.
- [ ] **FE-6** Tests: search/paginate/loading/empty, badge present-vs-null, row→drawer wiring +
  Save calls `PUT .../grant`.

## Verify / follow-up

- [ ] **V-1** Staging: confirm central `/users/all` authorizes a LOL-admin's forwarded bearer.
  If it needs a service token, add an env-configured token (no architecture change).
- [ ] **V-2** Staging E2E: search a never-granted user → grant EDITOR → appears in Permissions
  list; search an already-granted user → badge shows current role, drawer pre-checked.
- [ ] **F-1 (follow-up, not this change)** Ask Tài whether `/users/all` supports app-access
  filtering (`app_code=LOL`) → adopt as the ideal directory filter if available.
- [ ] **F-2 (deferred)** Optimistic concurrency (version/`updatedAt` → 409).
- [ ] **F-3 (deferred)** Academy: extend the grant doc with `jobRole` + progress; login-provision
  + redirect-by-role.
