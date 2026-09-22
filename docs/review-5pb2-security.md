# Security / authz / audit review — checklist item completion (5pb2)

**Reviewer scope:** authorization, security, audit. Domain correctness is reviewed separately.
**Measured against:** `recruit-be` worktree `agent/5pb2-checklist-completion` = `origin/master @ a689126`.
**Inputs treated as claims:** the team-lead brief, `docs/design-checklist-item-completion.md`.
All paths below are relative to `src/main/java/com/loanfactory/recruit/` unless they start with
`src/`, `docs/`, `deploy/` or `CLAUDE.md`.

**Verdict: proceed WITH CHANGES.** The core shape (per-department permission resolved from the
loaded row, `hasPermission` + manual 403) is sound and already exists in the codebase. But
four premises in the brief/design are false, and two gaps would ship a feature that is either
unusable or that leaves an unaudited bypass larger than the one it guards against.

---

## 1. Claims found FALSE

| # | Claim | Reality | Evidence |
|---|---|---|---|
| F1 | "No `HR` role is seeded; HR staff may sign in as ADMIN" | An `HR` role has existed since V003, a real tester holds it, and V067 already grants it `CHECKLIST_TEMPLATE_MANAGE_HR`. | `src/main/resources/db/migration/V003__seed_rbac_roles.sql:13`; `V030__seed_cutover_grants.sql:29-31` (Ken Customer → `["HR"]`); `V067__checklist_templates.sql:142-143`; `V036__seed_kho_roles.sql:40-41` (table comment lists 9 roles, HR included) |
| F2 | Seeded roles include `PRE_LEDGER` | `PRE_LEDGER` is a `rbac_grant_history.reason` value, not a role. | `V033__rbac_grant_history.sql:36`; `rbac/model/GrantChangeReason.java:13`; design doc line 25 |
| F3 | "Loose is one bulk grant away, no deploy" | Only half true. Grants are runtime-editable and audited (see V1 below), but **role permissions are not**: there is no endpoint that writes `rbac_roles.permissions` (only `GET /roles`). The bulk endpoint assigns *role codes only* and explicitly refuses overrides. So "everyone may complete everything" without a deploy means either (a) giving people the ADMIN role (`*`) — a massive over-grant — or (b) one `PUT /grants/{userId}` per person with `overridesAdd` of all the permissions. Changing what a *role* carries needs a Flyway migration = a deploy. | `rbac/controller/RbacAdminController.java:44-48` (roles: read-only), `:76-94`; `rbac/model/request/BulkGrantRequest.java:23-25` ("Overrides are deliberately NOT accepted … A bulk run never creates one"); `rbac/service/impl/RbacAdminServiceImpl.java:341-344` |
| F4 | `_ANY` would "mirror the existing `CANDIDATE_OVERRIDE_GATE` escape hatch" for ADMIN/MANAGER (design doc l.35) | `CANDIDATE_OVERRIDE_GATE` is seeded to **ONBOARDING**, not ADMIN/MANAGER. It isn't an ADMIN/MANAGER escape hatch at all. | `V042__candidate_override_gate.sql:27-30`; `rbac/model/RecruitPermission.java:87-91` |
| F5 | (design doc, not the brief) "S6→S7 is unreachable through the API" | Every seeded template has `mandatory = FALSE`, and the gate only counts mandatory items. So today the checklist blocks nothing, and S6→S7 goes through as long as the sponsorship gate passes. (Domain issue; noted because it changes how urgent the bypass analysis below is.) | `V067__checklist_templates.sql:54-55` (column order) + every row, e.g. `:79-86`; `candidate/service/impl/CandidateServiceImpl.java:756-779` |

Claims I checked and found **TRUE**. They're listed so nobody re-checks them:

- `rbac_grants` is runtime-editable (`PUT /grants/{userId}`, `POST /grants/bulk`, `DELETE`), and every write adds a `rbac_grant_history` row in the same `@Transactional` method, which the audit stream reads. Evidence: `RbacAdminServiceImpl.java:72-123`, `:126-147`, `:311`; `audit/service/impl/AuditServiceImpl.java:103`.
- `PublicWebhookController` *used to* fail open on a blank key. It is now fail-closed (`apiKey.isBlank() || !apiKey.equals(key)` → 401) with a loud boot warning. Evidence: `moso/controller/PublicWebhookController.java:36-43` (history), `:81-94`.
- `GET /admin/rbac/me` has no gate while its siblings do. It is **not** a vulnerability: it returns only the caller's own effective permissions, keyed on the gateway `X-User-ID`, and it needs a present actor (`getCurrentUserId(true)`). Evidence: `RbacAdminController.java:117-121`.
- `ensure-cast` mutates behind a read permission (`require(ACTIVITY_READ)`). The *real* gate is one layer down: an owner-or-`REPORT_TEAM` check through `hasPermission`, done after a 404-first load. This isn't a live hole, but it is the house pattern this design should copy (see A). Evidence: `candidate/facade/impl/CandidateFacadeImpl.java:257-263`; `candidate/service/impl/ActivityServiceImpl.java:263-270`, `:303-317`.
- `Department` has 5 values, including IT. Evidence: `checklist/model/Department.java:11`.

---

## 2. Findings

### BLOCKER

**B1. Departments cannot read the items they would be allowed to complete. `CHECKLIST_READ` is seeded to no role.**
`CHECKLIST_READ` is "ADMIN-only via the `*` wildcard" (`rbac/model/RecruitPermission.java:113-122`). No migration grants it: `grep CHECKLIST_READ src/main/resources/db/migration` finds nothing. Every checklist read goes through `require(CHECKLIST_READ)` (`checklist/facade/impl/ChecklistFacadeImpl.java:44-46`). On staging and production `recruit.rbac.enforce=true` (`deploy/configs/values-sta.yaml:141-142`, `values-prod.yaml:87-88`), so HR/LICENSING/ONBOARDING/ACCOUNTING/MANAGER get a 403 on `GET /candidates/{id}/checklist-items` and on their own department queue.
Consequence: as designed, a holder of `CHECKLIST_ITEM_COMPLETE_HR` either (a) can't use the feature, because the UI can't list the items, or (b) completes items by id without being able to see them. That is a blind write, and the brief's own question ("does the caller need `CHECKLIST_READ` first?") can't be answered "yes" today without making the feature useless.
**Fix:** the same migration must seed `CHECKLIST_READ` to every role that gets a `COMPLETE_*` permission. The `PATCH` should also demand `CHECKLIST_READ` via `hasPermission` (not `require`) before the department check, so no path lets someone write what they can't read.

### MAJOR

**M1. Every write gate must use `hasPermission` + a manual 403, never `require()`. `require()` fails open.**
`require()` only denies when `enforce` is true. The default is `false` (`rbac/service/impl/AccessControlServiceImpl.java:31-32`, `:62-73`; `src/main/resources/application.yml:147`). The house rule written after two incidents says: *read gates may fail open during cutover; write gates and data-leaving-the-server gates use `hasPermission` + a manual 403* (`docs/GOTCHAS.md:405-409`). The direct precedent does exactly that (`checklist/facade/impl/ChecklistTemplateFacadeImpl.java:71-78`).
**Answer to (b), the missing-seed failure mode.** The PDP matches permissions as strings: `effective.contains(permission.name())` (`AccessControlServiceImpl.java:56-60`). If the enum value exists but no role carries the string (migration ran, seed didn't, or the seed has a typo), then:
- `hasPermission` → `false` → **denies (fail-closed)** everywhere;
- `require` → **allows** wherever `enforce=false` (local, any new environment, any env that loses the variable).
So the design is fail-closed **only if** it uses `hasPermission`. The brief doesn't say which one it uses, so it has to be written into the design as a requirement.

**M2. Auto-advancing S6→S7 from a `PATCH` would let a department perform a stage transition it has no permission for.**
Design item 6 says to "recompute the gate on completion". But the gate isn't stored anywhere to recompute: it is evaluated inside `transition()` (`candidate/service/impl/CandidateServiceImpl.java:614-660`, `:628`). The only way to make completion "trigger" S6→S7 is for the `PATCH` path to call `candidateService.transition(...)` itself. That service is permission-free. The gates live in the facade (`candidate/facade/impl/CandidateFacadeImpl.java:185-193`: `CANDIDATE_TRANSITION`, plus `CANDIDATE_OVERRIDE_GATE`). HR/LICENSING/ACCOUNTING roles hold neither (`V003__seed_rbac_roles.sql:13-18`). An HR user ticking the last item would therefore move the candidate's stage, write `stage_history` under their actor id, and fire `generateOnFullyOnboarded` (`CandidateServiceImpl.java:658`), which creates *other* departments' work. That is an authority escalation, even if it is intended.
**Fix, pick one explicitly:** (a) completion never transitions. It only makes the next `transition` call succeed, and a human with `CANDIDATE_TRANSITION` moves the stage. This is my recommendation: it's the smallest attack surface and it reuses the existing gate. (b) The system transitions under a *system actor* (`system:checklist-complete` or similar), recorded as such, with a row lock on the candidate for idempotency. Don't let it run under the department user's id.

**M3. The NA "bypass" is the front door. The back door is wider and completely unaudited: departments can demote their own mandatory templates.**
`CHECKLIST_TEMPLATE_MANAGE_<dept>` (already seeded to HR/LICENSING/ONBOARDING/ACCOUNTING, `V067:142-149`) lets a department set `mandatory=false` or `active=false` on its own templates (`checklist/model/request/UpdateChecklistTemplateRequest.java:36`, `:50`). The gate reads the **current** `mandatory` flag (`CandidateServiceImpl.java:756-767`), so one template edit removes that item from the 100% gate for **every** candidate at once, with no reason. `checklist_templates` changes aren't in the audit UNION either: the audit stream reads seven ledgers, and none of them is a template history (`audit/service/impl/AuditServiceImpl.java:82-115`).
There is also already a *reasoned, audited* bypass. `CANDIDATE_OVERRIDE_GATE` (ONBOARDING) skips `checklist:` blockers (`CandidateServiceImpl.java:628-632`) and records the skipped list in `stage_history.overridden_fields` (`V042:20-24`), which the audit stream reads (`AuditServiceImpl.java:91`).
So "reason + audit on NA" is proportionate, but it isn't a control while the template-demotion path is open. **Fix:** out of scope to redesign here, but file a bead: template edits need a history ledger in the audit UNION, and flipping `mandatory` true→false needs a reason. In this design, treat NA's reason+audit as necessary but *not sufficient*, and say so.

**M4. NA/complete/reopen audit must be an explicit ledger plus a new UNION branch. Nothing captures it automatically.**
The audit stream is a request-time UNION over hand-written ledgers (`V025__audit_view_permission.sql:4-9`; `AuditServiceImpl.java:30-45`, `:82-115`). It isn't JPA auditing. `AbstractAuditableEntity` keeps only the *last* modifier, which gets overwritten. So the design must add a `checklist_item_history` table (from/to status, actor, reason, occurred_at). It must write that row in the **same** `@Transactional` service method as the status update, following `upsertGrant` (`RbacAdminServiceImpl.java:72-123`) and `transition` (`CandidateServiceImpl.java:613-649`, `recordHistory` before `save`, inside one transaction). And it must add a `CHECKLIST` branch to `EVENTS_SQL` and `EVENT_TYPES`. Without the UNION branch the audit row exists, but no API can read it. That answers (e): "an accountability control nobody can read".
**Who can read it:** `AUDIT_VIEW` = MANAGER + ADMIN (`V025:11-12`; the `*` covers ADMIN), gated by `hasPermission` (`audit/controller/AuditController.java:36-40`). Departments can't read each other's NA reasons. MANAGER can, and a superior reviewing is the right direction for an accountability control. So readership is fine **once the UNION branch exists**.

**M5. IT is left out, and the choice of `_ANY` versus four explicit grants decides whether IT items (and any future department) fail closed or get silently uncompletable.**
IT items are generated today (`V067__checklist_templates.sql:121-124`, `ON_ENTER_S6`, active). The precedent includes IT: `CHECKLIST_TEMPLATE_MANAGE_IT` is unseeded, and ADMIN gets it via the wildcard (`RecruitPermission.java:145-151`, `V067:150-151`).
- With **4** permissions, the mapping `switch (department)` can't compile exhaustively without a `default` (compare `RecruitPermission.java:160-169`). An implementer will add a `default`, and whatever it returns decides IT's fate. `default -> throw` → nobody, **ADMIN included**, can complete IT items (uncompletable). `default -> something` → some unrelated permission governs IT (wrong, and possibly fail-open).
- With **5** (add `CHECKLIST_ITEM_COMPLETE_IT`, unseeded) and an exhaustive `switch` with **no `default`**, a future 6th `Department` breaks the build until someone chooses its permission. That's fail-closed at compile time, which is the best available outcome.
**Is "4 grants to ADMIN/MANAGER" ≡ `_ANY`?** For ADMIN, the question is moot: ADMIN holds `*` (`V003:8`, `RecruitPermission.java:153-154`, `AccessControlServiceImpl.java:58`). Seeding explicit rows onto ADMIN does nothing, and the design should say so rather than list it as a step. For MANAGER, it is **not** equivalent. MANAGER would get the four named departments and not IT, and not any future department. That's fail-closed, which I consider acceptable, even preferable to an `_ANY` that silently covers departments nobody has decided about. Dropping `_ANY` is fine. Omitting IT is a bug.

### MINOR

**m1. Existence/department oracle on 403-after-load.** The precedent loads and then authorizes, and its 403 message names the department (`ChecklistTemplateFacadeImpl.java:54-57`, `:75-76`: "ask an admin for a HR grant"). For items, that tells a caller who can't read an id that it exists and whose it is. The house pattern elsewhere is 404 first, then 403 (`ActivityServiceImpl.java:265-269`). With B1's `CHECKLIST_READ` check placed *before* the load, the oracle only reaches people who can read items anyway. Low value, but put the read check first and keep the department name out of the message.

**m2. `reopen` attack surface.** Authorize each verb separately against the **loaded** `department`, never against anything in the body. The item's `department` is not writable through this PATCH, so there is no re-scoping TOCTOU like the one the template facade guards against. Traced: complete/NA/reopen on item X each require `COMPLETE_<X.department>`. Nothing a department does to its own items changes another department's item, so there's no cross-department escalation, **provided M2 is resolved as (a)**. Under M2(b), a reopen→complete cycle could re-fire `generateOnFullyOnboarded`. `reopen` is needed: NA and DONE must be reversible or mistakes become permanent. Add optimistic locking or `SELECT … FOR UPDATE` on the item so concurrent complete/reopen races can't both write.

**m3. Enum/DB drift (c).** Role permissions in `rbac_roles.permissions` are **not validated** anywhere. The PDP string-matches (`AccessControlServiceImpl.java:48`, `:58-59`), so a misspelled seed grants nothing, silently (fail-closed under `hasPermission`, fail-open under `require`, M1). Per-user overrides **are** validated against the enum (`RbacAdminServiceImpl.java:45-48`, `:234-244`). Reverse drift: if an enum value is later removed while some user's `overrides_add` still names it, that user's next full-replace `PUT` returns 400 until the stale string is dropped. That's annoying but not a security issue. **Fix for this slice:** the migration should be idempotent in the V067 style (`NOT permissions @> …`, `V067:142-149`), and a test should assert that each seeded role's effective permissions contain the new strings. That catches the silent-typo case.

**m4. MANAGER blast radius (h).** ADMIN is already omnipotent (`*`), so granting it anything is moot. MANAGER is a *recruiting* manager (`V003:9-10`). Giving it `COMPLETE_HR` means a recruiting manager can mark "Background check" (`V067:79`) DONE. That is a compliance item, and it can now be closed by someone outside the owning department. That's a business decision, not a bug, but it belongs in the one open question to Miley/Yến next to "may one department complete another's". Note that MANAGER doesn't hold `CHECKLIST_READ` today either (B1).

**m5. Pre-existing, noted and not caused by this design.** RBAC admin writes gate with `require(RBAC_MANAGE)` (`RbacAdminController.java:123-125`). With `enforce=false` (the local default) anyone can grant themselves ADMIN, in breach of the rule in `docs/GOTCHAS.md:405-409`. Staging and production are `true`. File separately.

---

## 3. Required changes before implementation

1. Seed `CHECKLIST_READ` to every role that gets a completion permission (B1). The PATCH checks `CHECKLIST_READ` first, via `hasPermission`.
2. Every write gate uses `hasPermission` + a manual `AuthenticationException(FORBIDDEN)`. No `require()` (M1).
3. Five permissions, not four: add `CHECKLIST_ITEM_COMPLETE_IT`, unseeded (ADMIN via `*`). Use an exhaustive `switch` with no `default` (M5). Drop the "grant all to ADMIN" step, because it's a no-op.
4. Completion does **not** transition the candidate (M2a). If auto-advance is kept, it runs under a named system actor with a candidate row lock, and that choice is written down.
5. Add a `checklist_item_history` ledger. Write it in the same transaction as the status change, and add it to the `AuditServiceImpl` UNION (M4). Require a non-blank reason for NA and for reopen.
6. File a bead for the unaudited template-demotion bypass (M3). The design should state that NA's control is partial until that bead lands.
7. Correct the design doc: the HR role exists, `PRE_LEDGER` is not a role, `CANDIDATE_OVERRIDE_GATE` is ONBOARDING's, and "loose" needs per-user overrides or a migration, not a bulk grant (F1–F4).

The strict-over-loose argument survives F3 in weakened form. Loosening is still possible without a deploy (per-user overrides, audited in `rbac_grant_history`), just not "one bulk grant". The asymmetric-reversibility argument doesn't depend on F3 at all. So keeping the policy out of `recruit_settings` is still right.
