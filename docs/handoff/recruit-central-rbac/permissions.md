# recruit-be permission inventory for the auth-service format-2 migration

Source: recruit-be `origin/master` @ `cb175805` (read via `git archive`, nothing checked out). Rules: tera-docs
`auth/RBAC_PERMISSION_MODEL.md` @ `ceb99bf` (§2: a permission owns >= 1 endpoint; an endpoint belongs to exactly one
permission; §5: no owning endpoint = deny).

Files next to this one:

| File | What |
|---|---|
| `endpoints.tsv` | 222 rows: 214 recruit-be routes + 8 tera-core library routes, one per `METHOD path`, classified |
| `enumerate_endpoints.py` | mechanical enumeration of every `@*Mapping` + call-graph trace (depth 4) of permission references -> `raw_endpoints.tsv`, `raw_trace.tsv`, `per_controller.txt` |
| `build_catalog.py` | the hand classification; asserts every enumerated route is classified and nothing extra is |
| `simulate_role_seeds.py` | replays the `rbac_roles` migrations -> `role_seeds_from_migrations.tsv` (role counts match the staging read of 22/10 exactly: MANAGER 25, RECRUITER 14, ONBOARDING 14, HEADHUNTER 12, TEAM_LEAD 12, LO_SUPPORT 13, OFFICER_RECRUITER 13, HR 6, LICENSING 8, ACCOUNTING 6) |
| `analyze.py`, `render_permissions.py` | the counts and the per-permission section below |
| `all_perm_refs.tsv`, `fe_refs.txt` | every `RecruitPermission.X` reference in recruit-be; recruit-fe non-test files per code |

## 0. How recruit-be decides today (what the catalog has to reproduce)

- **Two kinds of check.** `AccessControlService.require(...)` (marked `S` in `endpoints.tsv`) fails open when
  `recruit.rbac.enforce=false`; `hasPermission(...)` + throw (marked `H`) never does. Helm sets
  `RECRUIT_RBAC_ENFORCE=true` on staging and production, so both are real 403s there today.
- **Checks live in handlers, facades and services**, not in a path table. There is no aspect / annotation /
  path-to-permission map. The only request-level authorization is `CandidateRowScopeInterceptor` (on `/api/v1/**`):
  - a row-scoped actor (HEADHUNTER = `ORIGIN_SELF`, TEAM_LEAD = `ORIGIN_TEAM`, or a current program member with no
    lifting role) may call only the 76 routes in `ScopedRouteAllowlist` (403 otherwise), and every candidate the URL
    names is checked against the read/write/claim scope (404). `row_scope_applies` in `endpoints.tsv`: `Y` = on the
    allowlist, `N(403 scoped)` = refused to scoped actors, `n/a` = public/internal.
  - for unrestricted actors it hides program-member leads (D283) on any route naming a candidate; REPORT_TEAM
    holders see everything (`ProgramLeadVisibility:92`).
  - row scope is resolved from `rbac_roles.row_scope` AND from comparing role permission SETS ("a role lifts the
    restriction if its permissions contain all the restricted role's", `CandidateRowScopeService:233-316`). Moving
    permissions out of `rbac_roles` breaks this unless the role table (or an equivalent) stays readable by recruit-be.
    (The `CANDIDATE_LEGAL_NAME_CONFIRM` javadoc still calls `row_scope` "a documented dead column" — stale.)
- `ScopedQueryGuard` and `OriginFieldQueryGuard` refuse some `filter/sort/search` values (400); not permissions.
- `UnkeyedWebhookRouteBlocker` answers 404 to tera-core's `/v1/webhook/**`.

## 1. Counts

| | Count |
|---|---|
| Controllers in recruit-be (`@RestController`) | 80 (+2 `@RestControllerAdvice`, no routes) |
| recruit-be endpoints (`METHOD path`) | **214** (independent `rg` count of method-level mapping annotations = 214; no multi-path or multi-method mappings exist) |
| tera-core library endpoints component-scanned into recruit-be | 8 (`/v1/webhook` blocked -> 7 live) |
| Gated by >= 1 RecruitPermission | 177 |
| of which gated by > 1 distinct permission (AND / OR / data-selected) | **27** |
| of which single permission gate + shaping permission(s) | 17 |
| Authenticated, NO permission check (recruit-be) | **14** |
| Authenticated, NO permission check (tera-core library) | **7** |
| PUBLIC (`/public/**`, own secret/token) | 8 |
| INTERNAL cron ticks (service key header) | 15 |
| On the row-scope allowlist (HH/TL may call) | 76 |
| `RecruitPermission` enum values | 48 — all 48 referenced in code; none unused |
| Codes held by some role on staging | 40 |
| Codes reachable only through ADMIN `*` | 8 (+ MODEX_IMPORT, seeded on ADMIN only) |

Per-controller counts: `per_controller.txt`.

## 2. Flags

### 2.1 Authenticated endpoints with no permission check (format 2 = deny by default -> each needs an owner)

| Endpoint | What it is | Proposal |
|---|---|---|
| `GET /api/v1/notifications`, `GET .../unread-count`, `POST .../{id}/read`, `POST .../read-all` | caller's own notifications | one baseline permission every Recruit role holds, e.g. `RECRUIT_SELF_SERVICE` ("Use Recruit: my notifications, my settings") |
| `GET /api/v1/me/nav-context`, `GET /api/v1/admin/rbac/me` | caller's own roles / effective permissions (the second sits under `/admin` but is self-service) | same baseline permission (and consider moving `/admin/rbac/me` out of `/admin`, it is probably replaced by auth-service's `GET /rbac/users/{id}/permissions`) |
| `GET /api/v1/me/zoom-link`, `GET\|POST\|DELETE /api/v1/me/google*` (4) | caller's own Zoom / Google connection (Google requires >= 1 role code) | baseline permission |
| `GET /api/v1/referrals/mine` | caller's own referrals (by verified e-mail) | baseline permission (also used by referrers who may hold no recruiting role — check who calls it before choosing) |
| `DELETE /api/v1/candidates/{candidateId}/followers/me`, `POST .../conversation/leave` | leave a candidate you follow / a conversation you joined; deliberately ungated so a de-roled user can still leave | baseline permission, or the permission that put them there (`CANDIDATE_READ`) — note the deliberate "works after losing the role" property is lost either way |
| tera-core `POST /api/v1/batch/run`, `POST /api/v1/search/re-index`, `POST /api/v1/search/clear-index`, `GET\|POST /api/v1/file-storage*` (4) | library routes, no check at all; `batch/run` runs recruit batch handlers (e.g. `CANDIDATE_PHONE_NORMALIZATION_BACKFILL`) | give `batch/run` + `search/*` to `IMPORT_RUN` (admin data jobs); file-storage to whatever feature uploads files (none found in recruit-be code — if unused, leave unowned = denied) |

### 2.2 Endpoints gated by more than one permission (27) — breaks "one endpoint = one permission"

Holder sets below are from the role seeds; "equivalent today" means every seeded role that holds one also holds
the other, so picking one owner changes nothing for role-based users (per-user ADD/BLOCK overrides could still differ).

| # | Endpoint | Today | Proposed owner | Resolution for the rest |
|---|---|---|---|---|
| 1 | `GET /api/v1/candidates` | READ AND [`?unowned=true`] (CLAIM OR REPORT_TEAM); without the param the same check only narrows rows | `CANDIDATE_READ` | a query param cannot select a permission: split the lead stock to its own route (e.g. `GET /api/v1/candidates/unowned`, owner `CANDIDATE_CLAIM`). REPORT_TEAM holders (MANAGER) all hold CLAIM, so OR(CLAIM, REPORT_TEAM) == CLAIM today. The no-param narrowing stays in-app (or becomes a scope) |
| 2 | `GET /api/v1/inbox/hot` | READ AND (CLAIM OR REPORT_TEAM) | `CANDIDATE_CLAIM` | equivalent today; drop the READ check (every CLAIM holder holds READ) |
| 3 | `GET /api/v1/inbox/cold` | same | `CANDIDATE_CLAIM` | same |
| 4 | `GET /api/v1/duplicates` | READ AND (CLAIM OR REPORT_TEAM) | `CANDIDATE_CLAIM`, or `CANDIDATE_MERGE` if only managers should see the queue (the only FE caller is the MANAGER /duplicates screen) | product call |
| 5 | `POST /api/v1/candidates/{id}/transition` | TRANSITION AND [`override=true`] OVERRIDE_GATE | `CANDIDATE_TRANSITION` | split `POST .../transition/override` -> `CANDIDATE_OVERRIDE_GATE` (otherwise OVERRIDE_GATE owns no endpoint). **Note:** OVERRIDE_GATE's only seeded role, ONBOARDING, does not hold CANDIDATE_TRANSITION, so ONBOARDING is refused before the override check is reached — the permission is usable only by ADMIN today. With the split the override route stands alone; decide whether it should still require TRANSITION |
| 6 | `POST /api/v1/candidates/bulk-transfer` | READ AND per-row [not owner] TRANSFER | `CANDIDATE_TRANSFER` | today a recruiter may bulk-release their OWN rows without TRANSFER; owning the route by TRANSFER removes that unless granted. Alternative: owner `CANDIDATE_CLAIM` with scope SELF (own rows) vs ALL (manager) |
| 7 | `POST /api/v1/candidates/bulk-archive` | ARCHIVE AND per-row [other's row] TRANSFER | `CANDIDATE_ARCHIVE` | model "other people's rows" as scope: ARCHIVE at SELF for recruiters, ALL for managers; the app reads the scope from `/rbac/check` instead of asking for TRANSFER |
| 8 | `POST /api/v1/candidates/{id}/call-outcome` | ACTIVITY_LOG AND [`sendInvite`] OFFER_REQUEST AND (owner OR REPORT_TEAM) | `ACTIVITY_LOG` | OFFER_REQUEST holders == ACTIVITY_LOG holders today; the "Save & invite" follow-up POST /offers is gated anyway -> drop the pre-flight. owner-or-REPORT_TEAM -> scope SELF/ALL |
| 9 | `POST /api/v1/candidates/{id}/conversation/ensure-cast` | ACTIVITY_READ AND (on cast OR REPORT_TEAM) | `ACTIVITY_READ` | cast membership is row-level; keep in-app (like tera-be `@ResourceAccess`), REPORT_TEAM -> scope |
| 10 | `GET /api/v1/candidates/{id}/follow-ups` | READ AND (owner OR REPORT_TEAM) | `CANDIDATE_READ` | owner-or-REPORT_TEAM -> scope SELF vs ALL, enforced in-app from the returned scope |
| 11-13 | `POST .../follow-ups`, `PATCH .../follow-ups/{fid}`, `POST .../follow-ups/{fid}/done` | ACTIVITY_LOG AND (owner OR REPORT_TEAM) | `ACTIVITY_LOG` | same |
| 14 | `POST /api/v1/candidates/{candidateId}/followers` | READ AND (cast owner/specialist/manager OR REPORT_TEAM); self-follow needs REPORT_TEAM | `CANDIDATE_READ` (or a new `CANDIDATE_FOLLOWERS_MANAGE`) | cast rule stays in-app |
| 15 | `PATCH /api/v1/checklist-items/{id}` | CHECKLIST_ITEM_MANAGE_<department of the row> — 5 permissions chosen by data | one `CHECKLIST_ITEM_MANAGE` | department-on-row stays an in-app check. After HR/LICENSING/ACCOUNTING go, only ONBOARDING holds a department variant -> collapse to one permission granted to ONBOARDING |
| 16-18 | `POST\|PUT\|DELETE /api/v1/admin/checklist/templates[/{id}]` | CHECKLIST_TEMPLATE_MANAGE_<department> — 5 permissions chosen by data | one `CHECKLIST_TEMPLATE_MANAGE` | same as #15 |
| 19-20 | `POST /api/v1/exceptions/moso-sync/{offerId}/follow-signed`, `.../accept-paid` | REPORT_TEAM AND OFFER_APPROVE | `OFFER_APPROVE` | both MANAGER-only today -> equivalent |
| 21-23 | `POST /api/v1/admin/import/modex-csv`, `GET /api/v1/admin/modex/nmls-export`, `GET .../modex/status` | MODEX_IMPORT OR IMPORT_RUN | `MODEX_IMPORT` | IMPORT_RUN is ADMIN-`*`-only and ADMIN carries MODEX_IMPORT explicitly -> equivalent |
| 24 | `POST /api/v1/candidates/{candidateId}/offers` | OFFER_REQUEST AND (owner OR OFFER_APPROVE) AND [`approveNow`] OFFER_APPROVE | `OFFER_REQUEST` | owner-or-approver -> scope (SELF recruiter, ALL manager); approve-now -> own route (`POST .../offers/approve-now`, owner `OFFER_APPROVE`) or keep in-app |
| 25 | `POST /api/v1/offers/{offerId}/decline` | OFFER_REQUEST AND (owner OR requester OR OFFER_APPROVE) | `OFFER_REQUEST` | ownership in-app / scope |
| 26 | `GET /api/v1/admin/program-members/exceptions` | RBAC_MANAGE OR CANDIDATE_TRANSFER | `CANDIDATE_TRANSFER` | RBAC_MANAGE is ADMIN-only -> equivalent |
| 27 | `POST /api/v1/candidates/{candidateId}/sponsorships/actions` | SPONSORSHIP_MANAGE OR (`action=RECORD_ACCESS` AND SPONSORSHIP_ACCESS_RECORD) | `SPONSORSHIP_MANAGE` | split `POST .../sponsorships/access` -> `SPONSORSHIP_ACCESS_RECORD` (otherwise it owns nothing). After LICENSING goes, SPONSORSHIP_MANAGE is ADMIN-only |

### 2.3 Single permission, but with a non-permission alternative (ownership / role code)

These pass the route-level check model only if the ownership half moves to in-app checks or to scope:

| Endpoint | Today |
|---|---|
| `POST /api/v1/candidates/{id}/transfer` | owner hands off with NO permission; CANDIDATE_TRANSFER only for someone else's lead |
| `GET /api/v1/candidates/{id}/contact-route` | ACTIVITY_LOG OR caller is the assigned onboarding specialist |
| `POST /api/v1/offers/{offerId}/resend-invite` | requester OR OFFER_APPROVE (no route-level permission) |
| `PUT\|DELETE /api/v1/candidates/{id}/onboarding-progress/{step}` | owner OR onboarding specialist OR RBAC_MANAGE — RBAC_MANAGE used as an "is admin" proxy |
| `DELETE /api/v1/candidates/{candidateId}/followers/{userId}` | self OR owner OR REPORT_TEAM |
| `POST /api/v1/candidates/{candidateId}/notes` | ACTIVITY_LOG OR on the candidate's cast |
| `GET /api/v1/offers/mine`, `GET /api/v1/offers/mine/unseen-count` | OFFER_REQUEST OR **role** ONBOARDING (role-code gate) |

For each: owner = the named permission, grant it to the roles that reach the route through the alternative
(e.g. ONBOARDING gets the owner of `/offers/mine`), and keep the row rule in-app.

### 2.4 Shaping-only uses (the permission changes the answer, not access)

No permission is shaping-only: every one of the 48 is a gate somewhere. The shaping uses that a route-level check
cannot express (they need `GET /rbac/users/{id}/permissions` or the returned `scope` inside recruit-be):

- `REPORT_TEAM` (14 endpoints): team-wide vs own on `/today`, `/kpi/*`, `/reports/*`, `/inbox/hot/counts`; follow-up
  visibility mask on every candidate-returning list/get (`CandidateFollowUpVisibility:103`); program-lead hiding
  (`ProgramLeadVisibility:92`); elevated outbound stamp (`ActivityServiceImpl:506`); follower flags. Natural fit
  for format-2 **scope** (`SELF` vs `TEAM`/`ALL`) on the read permissions.
- `CANDIDATE_CLAIM`: auto-claim on `POST /activities`; held-by-collector block on `/inbox/hot`; lead-stock narrowing
  on `GET /candidates`; evaluated on OTHER users in `GET /api/v1/users` (canOwn), transfer target, program unlink.
- `OFFER_APPROVE`: approval block on `/today`; may-request/may-resend flags on `invite-status`; notification
  addressing (`usersWith(OFFER_APPROVE)`).
- `TEMPLATE_APPROVE` on `PUT /templates/{id}` and `POST /templates/{id}/retire`; `AUDIT_VIEW` (raw error text) on
  `GET /sync-trace`; `AGREEMENT_SEND` (may-send flag) on `GET /agreement`; `RBAC_MANAGE` (may-tick flag) on
  `GET /onboarding-progress`.
- Checks on users other than the caller (not caller authorization; need a "does user X hold P" lookup after
  migration): transfer target CLAIM, follower/mention target READ + cast roles, `/users` canOwn, RBAC last-admin
  lockout guard, notification recipients (`usersWith` OFFER_APPROVE, CANDIDATE_LEGAL_NAME_CONFIRM, MANAGER role).

### 2.5 Permissions that would own no endpoint once each route has one owner

`CANDIDATE_OVERRIDE_GATE`, `SPONSORSHIP_ACCESS_RECORD` (need their own route — §2.2 #5, #27);
`CHECKLIST_ITEM_MANAGE_{HR,LICENSING,ACCOUNTING,IT}` and `CHECKLIST_TEMPLATE_MANAGE_{HR,LICENSING,ONBOARDING,ACCOUNTING,IT}`
(only reach data-selected shared routes — collapse, §2.2 #15-18). `CANDIDATE_TRANSITION`, `MODEX_IMPORT`,
`SPONSORSHIP_MANAGE` and `CHECKLIST_ITEM_MANAGE_ONBOARDING` own routes once the proposals above are applied
(`CHECKLIST_ITEM_MANAGE_ONBOARDING` already solely owns the 3 onboarding-meeting routes).

### 2.6 Odd owners worth renaming/re-homing while the catalog is written

- `SETTINGS_MANAGE` gates 4 data jobs (experience backfill, hr-onboard reconcile, nurture migrate, omni cast backfill)
  besides settings + zoom links; `IMPORT_RUN` gates the other 7 data jobs. Consider one `ADMIN_DATA_JOBS`.
- `RBAC_MANAGE` gates program-member admin, headhunter catch-up and (as an admin proxy) onboarding-progress ticks.
- Reads riding on MANAGE: `GET /admin/licensing/state-rules` (LICENSING_RULE_MANAGE), `GET /suppressions`
  (SUPPRESSION_MANAGE). Catalog reads on unrelated permissions: `GET /webinars` (ACTIVITY_LOG), `GET /templates`,
  `GET /labels`, `GET /calendar/guest-policy`, `GET /config/candidate-view`, saved filters (all CANDIDATE_READ).
  `POST /labels` (create catalog label) rides on CANDIDATE_UPDATE by design (R11).

### 2.7 Role-code checks (authorization by role, not permission) — must survive the move

| Where | Role(s) | Effect |
|---|---|---|
| `MyInvitesController:126` | ONBOARDING | alternative gate on `/offers/mine*` |
| `CollectedFilter:66` | TEAM_LEAD | `GET /candidates?collected=TEAM` 400 otherwise |
| `HeadhunterCatchUpController:65`, `HeadhunterAutoOwner:224`, `ProgramInviteReview:88`, `ActivityServiceImpl:154` | HEADHUNTER, TEAM_LEAD | target validation, program-offer marking, occurred_at rules |
| `ProgramLeadVisibility:105/132`, `CandidateRowScopeInterceptor.isDepartmentWork` | ONBOARDING, **HR, LICENSING, ACCOUNTING** | department users may act on program leads from the queues — the removed roles are hard-coded here |
| `MyInvitesServiceImpl:212` | MANAGER | approver addressing |
| `CandidateCastAssembler:483` | `followers.cast_eligible_roles` setting | who may follow |
| `GoogleConnectService:284` | any role | "is a recruit user" |
| `CandidateRowScopeService:233-316` | `rbac_roles.row_scope` + permission sets | the HH/TL row scope |

### 2.8 Permissions held only by ADMIN

- **Today** (ADMIN `*`, no other role): `RBAC_MANAGE`, `IMPORT_RUN`, `SETTINGS_MANAGE`, `REFERRAL_ATTRIBUTION_OVERRIDE`,
  `SEQUENCE_READ`, `SEQUENCE_MANAGE`, `CHECKLIST_TEMPLATE_MANAGE_IT`, `CHECKLIST_ITEM_MANAGE_IT` (8 codes absent from the
  40-code staging list), plus `MODEX_IMPORT` (explicitly on ADMIN only, V261).
- **After removing HR, LICENSING, ACCOUNTING, OFFICER_RECRUITER**, these also become ADMIN-only:
  `LICENSING_RULE_MANAGE`, `SPONSORSHIP_MANAGE`, `CHECKLIST_TEMPLATE_MANAGE_HR`, `CHECKLIST_TEMPLATE_MANAGE_LICENSING`,
  `CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING`, `CHECKLIST_ITEM_MANAGE_HR`, `CHECKLIST_ITEM_MANAGE_LICENSING`,
  `CHECKLIST_ITEM_MANAGE_ACCOUNTING` (8 more -> 17 ADMIN-only codes). OFFICER_RECRUITER's 13 codes are all held by
  RECRUITER / LO_SUPPORT, so removing it strands nothing. `SPONSORSHIP_ACCESS_RECORD` stays with ONBOARDING;
  `OFFER_READ` stays with the recruiter roles.
- Live grants still holding the removed role codes, and per-user `overrides_add/block`, were not read (no DB access
  from here) — check `rbac_grants` before deleting the roles.

### 2.9 Not traced / limits

- The trace follows field-typed calls, same-class calls and static helpers to depth 4. Calls through lambdas,
  generic `Function`s or beans fetched dynamically are not followed; every endpoint's handler was then read by hand
  for the final classification, but a permission check deeper than 4 levels inside a service could still be missed.
  The 13 permission references the trace did not reach were each inspected (all comments, other-user checks or the
  REPORT_TEAM follow-up mask) — none is a missed gate.
- tera-core routes come from `~/.m2/.../tera-core-spring-boot-starter-0.0.1-SNAPSHOT.jar` (built 2026-10-08); the jar
  resolved at recruit-be build time may differ. `@ComponentScan("com.loanfactory.core")` is unconditional and
  recruit-be has no exclude filter, so they are registered; recruit-be comments confirm `POST /api/v1/batch/run` is live.
- Paths are as recruit-be sees them. The gateway exposes them as `/recruit-svc/...`; which form `/rbac/check` will
  receive (and whether `/public/**` and the `*/internal/tick` routes bypass the gateway check) needs confirming in
  api-gateway-v2 before the seed is written.
- Role permission sets come from replaying migrations; counts match the staging read but the sets were not diffed
  item by item against the database. Grants created at runtime via `/permissions` are not covered.
- recruit-fe counts are from the local `origin/master` ref (`1acf6f92`), not freshly fetched; dynamic code building
  (e.g. `CHECKLIST_ITEM_MANAGE_${dept}`) would not show in them.

## 3. Per permission

### CANDIDATE_READ

- Roles (besides ADMIN `*`): ACCOUNTING, HEADHUNTER, HR, LICENSING, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, ONBOARDING, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 33 endpoint(s):
  - `GET /api/v1/candidates/{id}/agreement`
  - `GET /api/v1/calendar/guest-policy`
  - `GET /api/v1/candidates/{id}`
  - `GET /api/v1/candidates/{id}/stage-history`
  - `GET /api/v1/candidates/{id}/suppressions`
  - `GET /api/v1/candidates/{id}/auto-stage-hold`
  - `GET /api/v1/candidates/{id}/events/subscribe`
  - `GET /api/v1/candidates/{candidateId}/followers`
  - `GET /api/v1/config/candidate-view`
  - `GET /api/v1/today`
  - `GET /api/v1/today/handed-to-me`
  - `GET /api/v1/kpi/pipeline`
  - `GET /api/v1/candidates/{id}/hr-handoff`
  - `GET /api/v1/inbox/hot/counts`
  - `GET /api/v1/kpi/trends`
  - `GET /api/v1/labels`
  - `GET /api/v1/candidates/{candidateId}/labels`
  - `GET /api/v1/candidate-labels`
  - `GET /api/v1/candidates/{id}/modex`
  - `GET /api/v1/candidates/modex-summary`
  - `GET /api/v1/candidates/{id}/moso-field-sync`
  - `GET /api/v1/candidates/{id}/onboarding-progress`
  - `GET /api/v1/candidates/{id}/onboarding-progress/hr-checklist`
  - `GET /api/v1/candidates/{id}/onboarding-progress/licences`
  - `GET /api/v1/reports/recruiters`
  - `GET /api/v1/reports/pivot`
  - `GET /api/v1/saved-filters`
  - `POST /api/v1/saved-filters`
  - `PUT /api/v1/saved-filters/{id}`
  - `DELETE /api/v1/saved-filters/{id}`
  - `GET /api/v1/templates`
  - `GET /api/v1/users`
  - `GET /api/v1/users/names`
- Shares the gate with other permissions on 7 endpoint(s):
  - `GET /api/v1/candidates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `POST /api/v1/candidates/bulk-transfer` - gate `CANDIDATE_READ|CANDIDATE_TRANSFER`
  - `GET /api/v1/candidates/{id}/follow-ups` - gate `CANDIDATE_READ|REPORT_TEAM`
  - `POST /api/v1/candidates/{candidateId}/followers` - gate `CANDIDATE_READ|REPORT_TEAM`
  - `GET /api/v1/duplicates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/inbox/hot` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/inbox/cold` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
- Shaping on 1 endpoint(s): `POST /api/v1/candidates/{candidateId}/notes`
- Code references (37): agreement/controller/AgreementController.java:50, calendar/controller/CalendarPolicyController.java:29, candidate/facade/impl/CandidateFacadeImpl.java:163, candidate/facade/impl/CandidateFacadeImpl.java:194, candidate/facade/impl/CandidateFacadeImpl.java:250, candidate/facade/impl/CandidateFacadeImpl.java:344, candidate/facade/impl/CandidateFacadeImpl.java:414, candidate/facade/impl/CandidateFacadeImpl.java:428, candidate/facade/impl/CandidateFacadeImpl.java:488, candidate/facade/impl/CandidateFollowUpFacadeImpl.java:34, config/controller/CandidateViewController.java:54, dashboard/controller/DashboardController.java:31, dashboard/controller/DashboardController.java:42, dashboard/controller/DashboardController.java:55, dedup/controller/DedupController.java:40, follower/facade/impl/CandidateFollowerFacadeImpl.java:40, follower/facade/impl/CandidateFollowerFacadeImpl.java:48, follower/facade/impl/CandidateFollowerFacadeImpl.java:76, hrhandoff/controller/HrHandoffController.java:26, inbox/controller/InboxController.java:130, inbox/controller/InboxController.java:58, inbox/controller/InboxController.java:77, label/controller/LabelController.java:59, label/controller/LabelController.java:84, label/controller/LabelController.java:94, modex/service/ModexSnapshotService.java:104, omni/CandidateCastAssembler.java:482, postjoined/controller/PostJoinedProgressController.java:46, postjoined/controller/PostJoinedProgressController.java:53, postjoined/controller/PostJoinedProgressController.java:60, rbac/controller/UserDirectoryController.java:46, rbac/names/UserNamesController.java:63, report/controller/KpiTrendController.java:29, report/controller/ReportController.java:31, report/controller/ReportController.java:40, savedfilter/controller/SavedFilterController.java:62, template/controller/TemplateController.java:49
- recruit-fe non-test files referencing it: 19

### CANDIDATE_CREATE

- Roles (besides ADMIN `*`): LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: LO_SUPPORT, MANAGER, RECRUITER
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/candidates`
- Code references (1): candidate/facade/impl/CandidateFacadeImpl.java:139
- recruit-fe non-test files referencing it: 4

### CANDIDATE_UPDATE

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, ONBOARDING, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 4 endpoint(s):
  - `PUT /api/v1/candidates/{id}`
  - `POST /api/v1/labels`
  - `POST /api/v1/candidates/{candidateId}/labels`
  - `DELETE /api/v1/candidates/{candidateId}/labels/{labelId}`
- Code references (4): candidate/facade/impl/CandidateFacadeImpl.java:145, label/controller/LabelController.java:101, label/controller/LabelController.java:108, label/controller/LabelController.java:65
- recruit-fe non-test files referencing it: 10

### CANDIDATE_CLAIM

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 2 endpoint(s):
  - `POST /api/v1/candidates/{id}/claim`
  - `POST /api/v1/candidates/batch-claim`
- Shares the gate with other permissions on 4 endpoint(s):
  - `GET /api/v1/candidates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/duplicates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/inbox/hot` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/inbox/cold` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
- Shaping on 4 endpoint(s): `GET /api/v1/candidates`, `POST /api/v1/candidates/{id}/activities`, `GET /api/v1/inbox/hot`, `GET /api/v1/inbox/hot/counts`
- Code references (14): candidate/facade/impl/CandidateFacadeImpl.java:217, candidate/facade/impl/CandidateFacadeImpl.java:221, candidate/facade/impl/CandidateFacadeImpl.java:277, candidate/facade/impl/CandidateFacadeImpl.java:286, candidate/facade/impl/CandidateFacadeImpl.java:318, candidate/facade/impl/CandidateFacadeImpl.java:444, candidate/SourceDetailDecorator.java:139, dedup/controller/DedupController.java:43, headhunter/autoown/HeadhunterAutoOwner.java:225, headhunter/autoown/HeldByCollectorReader.java:63, headhunter/program/ProgramLeadRelease.java:95, inbox/controller/InboxController.java:137, inbox/service/impl/HotCountsServiceImpl.java:82, rbac/controller/UserDirectoryController.java:65
- recruit-fe non-test files referencing it: 18

### CANDIDATE_TRANSFER

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/transfer`
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/candidates/bulk-transfer` - gate `CANDIDATE_READ|CANDIDATE_TRANSFER`
  - `POST /api/v1/candidates/bulk-archive` - gate `CANDIDATE_ARCHIVE|CANDIDATE_TRANSFER`
  - `GET /api/v1/admin/program-members/exceptions` - gate `RBAC_MANAGE|CANDIDATE_TRANSFER`
- Code references (5): candidate/facade/impl/CandidateFacadeImpl.java:297, candidate/facade/impl/CandidateFacadeImpl.java:361, candidate/facade/impl/CandidateFacadeImpl.java:372, candidate/facade/impl/CandidateFacadeImpl.java:392, headhunter/program/ProgramMemberAdminController.java:85
- recruit-fe non-test files referencing it: 13

### CANDIDATE_ARCHIVE

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/revive`
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/bulk-archive` - gate `CANDIDATE_ARCHIVE|CANDIDATE_TRANSFER`
- Code references (3): candidate/facade/impl/CandidateFacadeImpl.java:383, candidate/facade/impl/CandidateFacadeImpl.java:544, candidate/service/impl/CandidateServiceImpl.java:1011
- recruit-fe non-test files referencing it: 6

### CANDIDATE_MERGE

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/duplicates/merge`
- Code references (1): dedup/controller/DedupController.java:63
- recruit-fe non-test files referencing it: 6

### CANDIDATE_TRANSITION

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/transition` - gate `CANDIDATE_TRANSITION|CANDIDATE_OVERRIDE_GATE`
- Code references (1): candidate/facade/impl/CandidateFacadeImpl.java:402
- recruit-fe non-test files referencing it: 4

### ACTIVITY_READ

- Roles (besides ADMIN `*`): ACCOUNTING, HEADHUNTER, HR, LICENSING, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, ONBOARDING, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 2 endpoint(s):
  - `GET /api/v1/candidates/{id}/activities`
  - `GET /api/v1/candidates/{candidateId}/conversation/participants`
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/conversation/ensure-cast` - gate `ACTIVITY_READ|REPORT_TEAM`
- Code references (3): candidate/facade/impl/CandidateFacadeImpl.java:476, candidate/facade/impl/CandidateFacadeImpl.java:565, conversation/facade/impl/ConversationAccessFacadeImpl.java:77
- recruit-fe non-test files referencing it: 2

### ACTIVITY_LOG

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 5 endpoint(s):
  - `POST /api/v1/candidates/{id}/activities`
  - `GET /api/v1/candidates/{id}/contact-route`
  - `POST /api/v1/candidates/{candidateId}/notes`
  - `GET /api/v1/packs-writeback/failures`
  - `GET /api/v1/webinars`
- Shares the gate with other permissions on 4 endpoint(s):
  - `POST /api/v1/candidates/{id}/call-outcome` - gate `ACTIVITY_LOG|OFFER_REQUEST|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/follow-ups` - gate `ACTIVITY_LOG|REPORT_TEAM`
  - `PATCH /api/v1/candidates/{id}/follow-ups/{fid}` - gate `ACTIVITY_LOG|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/follow-ups/{fid}/done` - gate `ACTIVITY_LOG|REPORT_TEAM`
- Code references (10): candidate/facade/impl/CandidateFacadeImpl.java:438, candidate/facade/impl/CandidateFacadeImpl.java:457, candidate/facade/impl/CandidateFacadeImpl.java:516, candidate/facade/impl/CandidateFacadeImpl.java:519, candidate/facade/impl/CandidateFollowUpFacadeImpl.java:44, candidate/facade/impl/CandidateFollowUpFacadeImpl.java:52, candidate/facade/impl/CandidateFollowUpFacadeImpl.java:59, follower/facade/impl/CandidateFollowerFacadeImpl.java:72, packswriteback/controller/PacksWritebackFailureController.java:53, webinar/WebinarController.java:34
- recruit-fe non-test files referencing it: 18

### SUPPRESSION_MANAGE

- Roles (besides ADMIN `*`): LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: LO_SUPPORT, MANAGER, RECRUITER
- Sole gate on 3 endpoint(s):
  - `POST /api/v1/suppressions`
  - `GET /api/v1/suppressions`
  - `DELETE /api/v1/suppressions/{id}`
- Code references (1): suppression/controller/SuppressionController.java:56
- recruit-fe non-test files referencing it: 1

### OFFER_READ

- Roles (besides ADMIN `*`): ACCOUNTING, HEADHUNTER, HR, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, ONBOARDING, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 2 endpoint(s):
  - `GET /api/v1/candidates/{candidateId}/offers`
  - `GET /api/v1/candidates/{candidateId}/invite-status`
- Code references (2): offer/controller/OfferController.java:72, offer/controller/OfferController.java:84
- recruit-fe non-test files referencing it: 5

### OFFER_REQUEST

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 5 endpoint(s):
  - `GET /api/v1/offers/mine`
  - `GET /api/v1/offers/mine/unseen-count`
  - `POST /api/v1/offers/{offerId}/seen`
  - `POST /api/v1/offers/{offerId}/remind-approver`
  - `POST /api/v1/offers/{offerId}/remind-onboarding`
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/candidates/{id}/call-outcome` - gate `ACTIVITY_LOG|OFFER_REQUEST|REPORT_TEAM`
  - `POST /api/v1/candidates/{candidateId}/offers` - gate `OFFER_REQUEST|OFFER_APPROVE`
  - `POST /api/v1/offers/{offerId}/decline` - gate `OFFER_REQUEST|OFFER_APPROVE`
- Code references (5): candidate/facade/impl/CandidateFacadeImpl.java:461, offer/controller/MyInvitesController.java:125, offer/controller/MyInvitesController.java:136, offer/controller/OfferController.java:132, offer/controller/OfferController.java:60
- recruit-fe non-test files referencing it: 9

### OFFER_APPROVE

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 3 endpoint(s):
  - `POST /api/v1/offers/{offerId}/resend-invite`
  - `GET /api/v1/offers/pending-approval`
  - `POST /api/v1/offers/{offerId}/approve`
- Shares the gate with other permissions on 4 endpoint(s):
  - `POST /api/v1/exceptions/moso-sync/{offerId}/follow-signed` - gate `REPORT_TEAM|OFFER_APPROVE`
  - `POST /api/v1/exceptions/moso-sync/{offerId}/accept-paid` - gate `REPORT_TEAM|OFFER_APPROVE`
  - `POST /api/v1/candidates/{candidateId}/offers` - gate `OFFER_REQUEST|OFFER_APPROVE`
  - `POST /api/v1/offers/{offerId}/decline` - gate `OFFER_REQUEST|OFFER_APPROVE`
- Shaping on 2 endpoint(s): `GET /api/v1/today`, `GET /api/v1/candidates/{candidateId}/invite-status`
- Code references (11): dashboard/ApproverTodayReader.java:86, inbox/controller/ExceptionsController.java:101, inbox/controller/ExceptionsController.java:88, moso/ReRegistrationRecorder.java:141, offer/controller/OfferController.java:110, offer/controller/OfferController.java:123, offer/service/impl/InviteResendPermission.java:29, offer/service/impl/MyInvitesServiceImpl.java:213, offer/service/impl/OfferNotices.java:83, offer/service/impl/OfferRequestPermission.java:43, offer/service/impl/OfferServiceImpl.java:174
- recruit-fe non-test files referencing it: 17

### RBAC_MANAGE

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 15 endpoint(s):
  - `POST /api/v1/admin/headhunter/catch-up/{userId}`
  - `PUT /api/v1/candidates/{id}/onboarding-progress/{step}`
  - `DELETE /api/v1/candidates/{id}/onboarding-progress/{step}`
  - `GET /api/v1/admin/program-members/pending`
  - `GET /api/v1/admin/program-members/pending/{mosoKey}/candidates`
  - `POST /api/v1/admin/program-members/{mosoKey}/link`
  - `POST /api/v1/admin/program-members/{mosoKey}/reject`
  - `POST /api/v1/admin/program-members/{mosoKey}/unlink`
  - `GET /api/v1/admin/rbac/roles`
  - `GET /api/v1/admin/rbac/directory`
  - `GET /api/v1/admin/rbac/grants`
  - `PUT /api/v1/admin/rbac/grants/{userId}`
  - `POST /api/v1/admin/rbac/grants/bulk`
  - `DELETE /api/v1/admin/rbac/grants/{userId}`
  - `GET /api/v1/admin/rbac/grants/{userId}/history`
- Shares the gate with other permissions on 1 endpoint(s):
  - `GET /api/v1/admin/program-members/exceptions` - gate `RBAC_MANAGE|CANDIDATE_TRANSFER`
- Shaping on 1 endpoint(s): `GET /api/v1/candidates/{id}/onboarding-progress`
- Code references (11): headhunter/autoown/HeadhunterCatchUpController.java:57, headhunter/program/ProgramMemberAdminController.java:111, headhunter/program/ProgramMemberAdminController.java:77, headhunter/program/ProgramMemberAdminController.java:85, postjoined/PostJoinedProgressService.java:416, rbac/controller/RbacAdminController.java:124, rbac/service/impl/RbacAdminServiceImpl.java:330, rbac/service/impl/RbacAdminServiceImpl.java:336, rbac/service/impl/RbacAdminServiceImpl.java:557, rbac/service/impl/RbacAdminServiceImpl.java:566, rbac/service/impl/RbacAdminServiceImpl.java:579
- recruit-fe non-test files referencing it: 9

### REPORT_TEAM

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 11 endpoint(s):
  - `DELETE /api/v1/candidates/{candidateId}/followers/{userId}`
  - `POST /api/v1/candidates/{candidateId}/conversation/join`
  - `DELETE /api/v1/candidates/{candidateId}/conversation/participants/{userId}`
  - `GET /api/v1/exceptions/counts`
  - `GET /api/v1/exceptions/moso-sync`
  - `POST /api/v1/exceptions/moso-sync/{offerId}/handled`
  - `GET /api/v1/exceptions/ready-to-join`
  - `POST /api/v1/exceptions/ready-to-join/{candidateId}/remind`
  - `GET /api/v1/inbox/hot/claimed-idle`
  - `POST /api/v1/inbox/hot/claimed-idle/{candidateId}/remind`
  - `POST /api/v1/onboarding/specialists/{userId}/clear-hold`
- Shares the gate with other permissions on 13 endpoint(s):
  - `GET /api/v1/candidates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/call-outcome` - gate `ACTIVITY_LOG|OFFER_REQUEST|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/conversation/ensure-cast` - gate `ACTIVITY_READ|REPORT_TEAM`
  - `GET /api/v1/candidates/{id}/follow-ups` - gate `CANDIDATE_READ|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/follow-ups` - gate `ACTIVITY_LOG|REPORT_TEAM`
  - `PATCH /api/v1/candidates/{id}/follow-ups/{fid}` - gate `ACTIVITY_LOG|REPORT_TEAM`
  - `POST /api/v1/candidates/{id}/follow-ups/{fid}/done` - gate `ACTIVITY_LOG|REPORT_TEAM`
  - `POST /api/v1/candidates/{candidateId}/followers` - gate `CANDIDATE_READ|REPORT_TEAM`
  - `GET /api/v1/duplicates` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `POST /api/v1/exceptions/moso-sync/{offerId}/follow-signed` - gate `REPORT_TEAM|OFFER_APPROVE`
  - `POST /api/v1/exceptions/moso-sync/{offerId}/accept-paid` - gate `REPORT_TEAM|OFFER_APPROVE`
  - `GET /api/v1/inbox/hot` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
  - `GET /api/v1/inbox/cold` - gate `CANDIDATE_READ|CANDIDATE_CLAIM|REPORT_TEAM`
- Shaping on 14 endpoint(s): `GET /api/v1/candidates`, `GET /api/v1/candidates/{id}`, `POST /api/v1/candidates/{id}/activities`, `GET /api/v1/candidates/{candidateId}/followers`, `POST /api/v1/candidates/{candidateId}/notes`, `GET /api/v1/today`, `GET /api/v1/kpi/pipeline`, `GET /api/v1/duplicates`, `GET /api/v1/inbox/hot`, `GET /api/v1/inbox/hot/counts`, `GET /api/v1/kpi/trends`, `GET /api/v1/packs-writeback/failures`, `GET /api/v1/reports/recruiters`, `GET /api/v1/reports/pivot`
- Code references (30): candidate/CandidateFollowUpVisibility.java:103, candidate/facade/impl/CandidateFacadeImpl.java:217, candidate/facade/impl/CandidateFacadeImpl.java:221, candidate/service/impl/ActivityServiceImpl.java:506, candidate/service/impl/FollowUpServiceImpl.java:1515, conversation/facade/impl/ConversationAccessFacadeImpl.java:82, dashboard/ApproverTodayReader.java:93, dashboard/service/impl/DashboardServiceImpl.java:599, dedup/controller/DedupController.java:43, follower/service/impl/CandidateFollowerServiceImpl.java:308, headhunter/autoown/HeldByCollectorReader.java:64, headhunter/scope/ProgramLeadVisibility.java:92, inbox/controller/ExceptionsController.java:100, inbox/controller/ExceptionsController.java:114, inbox/controller/ExceptionsController.java:146, inbox/controller/ExceptionsController.java:162, inbox/controller/ExceptionsController.java:59, inbox/controller/ExceptionsController.java:73, inbox/controller/ExceptionsController.java:87, inbox/controller/InboxController.java:110, inbox/controller/InboxController.java:137, inbox/controller/InboxController.java:91, inbox/service/impl/HotCountsServiceImpl.java:58, inbox/service/impl/HotCountsServiceImpl.java:83, omni/CandidateCastAssembler.java:391, onboarding/controller/OnboardingSpecialistController.java:65, onboarding/controller/OnboardingSpecialistController.java:67, report/controller/KpiTrendController.java:31, report/controller/ReportController.java:33, report/controller/ReportController.java:42
- recruit-fe non-test files referencing it: 25

### TEMPLATE_CREATE

- Roles (besides ADMIN `*`): HEADHUNTER, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, RECRUITER, TEAM_LEAD
- Sole gate on 5 endpoint(s):
  - `GET /api/v1/templates/manage`
  - `POST /api/v1/templates`
  - `PUT /api/v1/templates/{id}`
  - `POST /api/v1/templates/{id}/submit`
  - `POST /api/v1/templates/{id}/retire`
- Code references (5): template/controller/TemplateController.java:107, template/controller/TemplateController.java:61, template/controller/TemplateController.java:68, template/controller/TemplateController.java:76, template/controller/TemplateController.java:86
- recruit-fe non-test files referencing it: 5

### TEMPLATE_APPROVE

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 2 endpoint(s):
  - `POST /api/v1/templates/{id}/approve`
  - `POST /api/v1/templates/{id}/reject`
- Shaping on 2 endpoint(s): `PUT /api/v1/templates/{id}`, `POST /api/v1/templates/{id}/retire`
- Code references (4): template/controller/TemplateController.java:100, template/controller/TemplateController.java:109, template/controller/TemplateController.java:80, template/controller/TemplateController.java:93
- recruit-fe non-test files referencing it: 4

### IMPORT_RUN

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 9 endpoint(s):
  - `POST /api/v1/admin/candidates/auto-stage/backfill`
  - `POST /api/v1/admin/checklists/backfill`
  - `POST /api/v1/admin/omni/followers/reconcile`
  - `POST /api/v1/admin/import/moso`
  - `POST /api/v1/admin/import/moso/profile-fields`
  - `POST /api/v1/admin/omni/subject-alias/backfill`
  - `POST /api/v1/admin/sponsorships/backfill`
  - `GET /api/v1/admin/webhook-events/unmatched`
  - `POST /api/v1/admin/webhook-events/unmatched/purge`
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/import/modex-csv` - gate `MODEX_IMPORT|IMPORT_RUN`
  - `GET /api/v1/admin/modex/nmls-export` - gate `MODEX_IMPORT|IMPORT_RUN`
  - `GET /api/v1/admin/modex/status` - gate `MODEX_IMPORT|IMPORT_RUN`
- Code references (10): candidate/controller/AutoStageBackfillController.java:34, checklist/controller/ChecklistBackfillController.java:46, follower/controller/FollowerReconcileController.java:37, licensing/controller/SponsorshipBackfillController.java:34, modex/controller/ModexImportGate.java:22, moso/controller/MosoImportController.java:35, moso/controller/MosoImportController.java:45, omni/alias/controller/OmniSubjectAliasController.java:67, webhook/controller/UnmatchedWebhookAdminController.java:32, webhook/controller/UnmatchedWebhookAdminController.java:38
- recruit-fe non-test files referencing it: 6

### MODEX_IMPORT

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/import/modex-csv` - gate `MODEX_IMPORT|IMPORT_RUN`
  - `GET /api/v1/admin/modex/nmls-export` - gate `MODEX_IMPORT|IMPORT_RUN`
  - `GET /api/v1/admin/modex/status` - gate `MODEX_IMPORT|IMPORT_RUN`
- Code references (1): modex/controller/ModexImportGate.java:21
- recruit-fe non-test files referencing it: 5

### AUDIT_VIEW

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 1 endpoint(s):
  - `GET /api/v1/admin/audit-events`
- Shaping on 1 endpoint(s): `GET /api/v1/candidates/{id}/sync-trace`
- Code references (2): audit/controller/AuditController.java:37, synctrace/service/impl/SyncTraceServiceImpl.java:95
- recruit-fe non-test files referencing it: 15

### REFERRAL_ATTRIBUTION_READ

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 1 endpoint(s):
  - `GET /api/v1/referral-attribution/{candidateId}`
- Code references (1): referral/controller/ReferralAttributionController.java:52
- recruit-fe non-test files referencing it: 0

### REFERRAL_ATTRIBUTION_OVERRIDE

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/referral-attribution/{candidateId}/override`
- Code references (1): referral/controller/ReferralAttributionController.java:45
- recruit-fe non-test files referencing it: 0

### LABEL_MANAGE

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 2 endpoint(s):
  - `PUT /api/v1/labels/{id}`
  - `DELETE /api/v1/labels/{id}`
- Code references (2): label/controller/LabelController.java:72, label/controller/LabelController.java:78
- recruit-fe non-test files referencing it: 1

### SETTINGS_MANAGE

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 12 endpoint(s):
  - `POST /api/v1/admin/packs-writeback/experience-backfill`
  - `POST /api/v1/admin/hr-onboard/reconcile`
  - `POST /api/v1/admin/nurture/migrate`
  - `POST /api/v1/admin/omni/cast-backfill/onboarding-specialists`
  - `GET /api/v1/admin/zoom-links`
  - `GET /api/v1/admin/zoom-links/{userId}`
  - `PUT /api/v1/admin/zoom-links/{userId}`
  - `DELETE /api/v1/admin/zoom-links/{userId}`
  - `GET /api/v1/admin/settings`
  - `GET /api/v1/admin/settings/{key}/history`
  - `GET /api/v1/admin/settings/business-hours/holidays`
  - `PUT /api/v1/admin/settings/{key}`
- Code references (6): hronboard/controller/HrOnboardReconcileController.java:64, nurture/NurtureMigrationController.java:29, omni/controller/OmniCastBackfillController.java:50, packswriteback/backfill/ExperienceBackfillController.java:40, settings/controller/SettingsController.java:114, zoomlink/controller/RecruiterZoomLinkController.java:79
- recruit-fe non-test files referencing it: 16

### CANDIDATE_OVERRIDE_GATE

- Roles (besides ADMIN `*`): ONBOARDING
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/transition` - gate `CANDIDATE_TRANSITION|CANDIDATE_OVERRIDE_GATE`
- Code references (2): candidate/facade/impl/CandidateFacadeImpl.java:407, candidate/service/impl/CandidateServiceImpl.java:1067
- recruit-fe non-test files referencing it: 2

### SEQUENCE_READ

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 1 endpoint(s):
  - `GET /api/v1/candidates/{candidateId}/sequence-enrollments`
- Code references (1): sequence/controller/SequenceEnrollmentController.java:51
- recruit-fe non-test files referencing it: 0

### SEQUENCE_MANAGE

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 2 endpoint(s):
  - `POST /api/v1/candidates/{candidateId}/sequences/{sequenceId}/enroll`
  - `POST /api/v1/sequence-enrollments/{enrollmentId}/stop`
- Code references (2): sequence/controller/SequenceEnrollmentController.java:38, sequence/controller/SequenceEnrollmentController.java:45
- recruit-fe non-test files referencing it: 0

### CANDIDATE_HR_HANDOFF

- Roles (besides ADMIN `*`): ONBOARDING
- Sole gate on 2 endpoint(s):
  - `POST /api/v1/candidates/{id}/hr-handoff`
  - `POST /api/v1/candidates/{id}/hr-handoff/resend`
- Code references (2): hrhandoff/controller/HrHandoffController.java:33, hrhandoff/controller/HrHandoffController.java:40
- recruit-fe non-test files referencing it: 1

### CHECKLIST_READ

- Roles (besides ADMIN `*`): ACCOUNTING, HEADHUNTER, HR, LICENSING, LO_SUPPORT, MANAGER, OFFICER_RECRUITER, ONBOARDING, RECRUITER, TEAM_LEAD  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: HEADHUNTER, LO_SUPPORT, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 8 endpoint(s):
  - `GET /api/v1/candidates/{candidateId}/checklist-items`
  - `GET /api/v1/checklist/departments/{department}/items`
  - `GET /api/v1/checklist/departments/{department}/queue`
  - `GET /api/v1/checklist/departments/{department}/candidates`
  - `GET /api/v1/admin/checklist/templates`
  - `GET /api/v1/admin/checklist/templates/{id}/impact`
  - `GET /api/v1/sponsorships`
  - `GET /api/v1/candidates/{candidateId}/sponsorships`
- Code references (3): checklist/facade/impl/ChecklistFacadeImpl.java:194, checklist/facade/impl/ChecklistTemplateFacadeImpl.java:83, licensing/facade/impl/SponsorshipFacadeImpl.java:76
- recruit-fe non-test files referencing it: 9

### LICENSING_RULE_MANAGE

- Roles (besides ADMIN `*`): LICENSING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 4 endpoint(s):
  - `GET /api/v1/admin/licensing/state-rules`
  - `POST /api/v1/admin/licensing/state-rules`
  - `PUT /api/v1/admin/licensing/state-rules/{id}`
  - `DELETE /api/v1/admin/licensing/state-rules/{id}`
- Code references (2): licensing/facade/impl/LicensingStateRuleFacadeImpl.java:57, licensing/facade/impl/LicensingStateRuleFacadeImpl.java:62
- recruit-fe non-test files referencing it: 0

### CHECKLIST_TEMPLATE_MANAGE_HR

- Roles (besides ADMIN `*`): HR  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/checklist/templates` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `PUT /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `DELETE /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_TEMPLATE_MANAGE_LICENSING

- Roles (besides ADMIN `*`): LICENSING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/checklist/templates` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `PUT /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `DELETE /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_TEMPLATE_MANAGE_ONBOARDING

- Roles (besides ADMIN `*`): ONBOARDING
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/checklist/templates` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `PUT /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `DELETE /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING

- Roles (besides ADMIN `*`): ACCOUNTING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/checklist/templates` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `PUT /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `DELETE /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_TEMPLATE_MANAGE_IT

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 3 endpoint(s):
  - `POST /api/v1/admin/checklist/templates` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `PUT /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
  - `DELETE /api/v1/admin/checklist/templates/{id}` - gate `CHECKLIST_TEMPLATE_MANAGE_HR|CHECKLIST_TEMPLATE_MANAGE_LICENSING|CHECKLIST_TEMPLATE_MANAGE_ONBOARDING|CHECKLIST_TEMPLATE_MANAGE_ACCOUNTING|CHECKLIST_TEMPLATE_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_ITEM_MANAGE_HR

- Roles (besides ADMIN `*`): HR  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `PATCH /api/v1/checklist-items/{id}` - gate `CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_ITEM_MANAGE_LICENSING

- Roles (besides ADMIN `*`): LICENSING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `PATCH /api/v1/checklist-items/{id}` - gate `CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_ITEM_MANAGE_ONBOARDING

- Roles (besides ADMIN `*`): ONBOARDING
- Sole gate on 3 endpoint(s):
  - `PUT /api/v1/checklist-items/{id}/onboarding-meeting/schedule`
  - `DELETE /api/v1/checklist-items/{id}/onboarding-meeting/schedule`
  - `POST /api/v1/checklist-items/{id}/onboarding-meeting/resend`
- Shares the gate with other permissions on 1 endpoint(s):
  - `PATCH /api/v1/checklist-items/{id}` - gate `CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT`
- Code references (4): checklist/facade/impl/ChecklistFacadeImpl.java:341, checklist/facade/impl/ChecklistFacadeImpl.java:343, onboarding/controller/OnboardingMeetingController.java:33, onboarding/controller/OnboardingMeetingController.java:35
- recruit-fe non-test files referencing it: 2

### CHECKLIST_ITEM_MANAGE_ACCOUNTING

- Roles (besides ADMIN `*`): ACCOUNTING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `PATCH /api/v1/checklist-items/{id}` - gate `CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### CHECKLIST_ITEM_MANAGE_IT

- Roles (besides ADMIN `*`): none - ADMIN wildcard only
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `PATCH /api/v1/checklist-items/{id}` - gate `CHECKLIST_ITEM_MANAGE_HR|CHECKLIST_ITEM_MANAGE_LICENSING|CHECKLIST_ITEM_MANAGE_ONBOARDING|CHECKLIST_ITEM_MANAGE_ACCOUNTING|CHECKLIST_ITEM_MANAGE_IT`
- Code references (0): 
- recruit-fe non-test files referencing it: 0

### SYNC_TRACE_READ

- Roles (besides ADMIN `*`): MANAGER, ONBOARDING
- Sole gate on 1 endpoint(s):
  - `GET /api/v1/candidates/{id}/sync-trace`
- Code references (1): synctrace/controller/SyncTraceController.java:48
- recruit-fe non-test files referencing it: 5

### SPONSORSHIP_MANAGE

- Roles (besides ADMIN `*`): LICENSING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: **ADMIN only**
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/{candidateId}/sponsorships/actions` - gate `SPONSORSHIP_MANAGE|SPONSORSHIP_ACCESS_RECORD`
- Code references (2): licensing/facade/impl/SponsorshipFacadeImpl.java:81, licensing/facade/impl/SponsorshipFacadeImpl.java:89
- recruit-fe non-test files referencing it: 0

### SPONSORSHIP_ACCESS_RECORD

- Roles (besides ADMIN `*`): LICENSING, ONBOARDING  
  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: ONBOARDING
- Sole gate on 0 endpoint(s): none
- Shares the gate with other permissions on 1 endpoint(s):
  - `POST /api/v1/candidates/{candidateId}/sponsorships/actions` - gate `SPONSORSHIP_MANAGE|SPONSORSHIP_ACCESS_RECORD`
- Code references (2): licensing/facade/impl/SponsorshipFacadeImpl.java:85, licensing/facade/impl/SponsorshipFacadeImpl.java:89
- recruit-fe non-test files referencing it: 0

### ONBOARDING_SPECIALIST_ASSIGN

- Roles (besides ADMIN `*`): MANAGER, ONBOARDING
- Sole gate on 2 endpoint(s):
  - `GET /api/v1/onboarding/specialists`
  - `PUT /api/v1/candidates/{id}/onboarding-specialist`
- Code references (2): onboarding/controller/OnboardingSpecialistController.java:84, onboarding/controller/OnboardingSpecialistController.java:86
- recruit-fe non-test files referencing it: 3

### CANDIDATE_LEGAL_NAME_CONFIRM

- Roles (besides ADMIN `*`): HEADHUNTER, MANAGER, ONBOARDING, RECRUITER, TEAM_LEAD
- Sole gate on 2 endpoint(s):
  - `POST /api/v1/candidates/{id}/legal-name/confirm`
  - `POST /api/v1/candidates/{id}/legal-name/registration`
- Code references (3): candidate/controller/LegalNameController.java:64, candidate/controller/LegalNameController.java:66, moso/ReRegistrationRecorder.java:142
- recruit-fe non-test files referencing it: 10

### AGREEMENT_SEND

- Roles (besides ADMIN `*`): ONBOARDING
- Sole gate on 1 endpoint(s):
  - `POST /api/v1/candidates/{id}/agreement/send`
- Shaping on 1 endpoint(s): `GET /api/v1/candidates/{id}/agreement`
- Code references (3): agreement/controller/AgreementController.java:54, agreement/controller/AgreementController.java:61, agreement/controller/AgreementController.java:63
- recruit-fe non-test files referencing it: 7

### REFERRAL_ADMIN_VIEW

- Roles (besides ADMIN `*`): MANAGER
- Sole gate on 2 endpoint(s):
  - `GET /api/v1/referrals`
  - `GET /api/v1/referrals/export.csv`
- Code references (2): referralview/facade/ReferralViewFacade.java:113, referralview/facade/ReferralViewFacade.java:115
- recruit-fe non-test files referencing it: 4

