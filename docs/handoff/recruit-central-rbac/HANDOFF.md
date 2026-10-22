# HANDOFF — Recruit roles/permissions move to central auth-service

Session paused 22/10/2026 ~18:00 (Bao going home). Bead: `agentflow-y89cf` (P1),
`agentflow-5ryt2` (tera-core routes with no check, P1, not started).
Read with: `PLAN.md` (the approved plan), `permissions.md` and `endpoints.tsv` (the endpoint
inventory), all in this folder.

## RESUME POINT — do these in order

1. **Ask Bao one question about PR #714** before merging it. The removed override skipped EVERY
   blocker on a stage move, not only missing fields. Without it, nobody (ADMIN included) can:
   - manually move a loan officer to S7 while the setup call is not DONE or mandatory checklist
     items are open;
   - skip S6 to go straight to S7.

   The override was used 0 times on staging and production. Bao answers OK, or wants an admin
   escape kept.
2. **Ask Bao a second question:** the 16 `licensing_state_rules` rows are still read by
   `LicensingItemGeneratorImpl` (the S6 licensing checklist fan-out) and `ChecklistImpactCounter`.
   Bao said "Recruit has nothing to do with licensing", so propose removing that fan-out too, in a
   separate PR (P2, together with dropping the LICENSING role).
3. **PR #714 merge.** https://github.com/LoanFactory-Inc/recruit-be/pull/714 (P1 cleanup,
   branch `refactor/rbac-p1-cleanup`, worktree `recruit-be-worktrees/rbac-p1-cleanup`, V267,
   D308).
   - CI all green on 22/10: Tests, Integration tests, guards.
   - NOT merged and NOT reviewed by a second reviewer yet.
   - Per Bao's rules: 2 reviewers + green CI, then merge to master (= staging deploy). Re-check
     that V267 is still free on origin/master before merging.
4. **Update `PLAN.md` with Tai's answer (Slack 22/10 17:34–17:39), which REPLACES the section
   "Integration answers".**
   - Role assignment flow:
     - HR publishes Pub/Sub topics: `HR_ASSOCIATE_ONBOARD` (role_codes), `HR_ASSOCIATE_ROLE`
       (event `associate.role_changed`, payload platform_user_id, occurred_at, add[], remove[],
       role_codes[]), `HR_ASSOCIATE_UPDATE` (no roles), `HR_ASSOCIATE_DEACTIVE` (left the
       company).
     - **Each app subscribes**, maps HR job-role codes to its own role codes, and itself calls
       auth-service `assignRolesToAccount` / `removeAccountRole`, then processes its own profile.
   - Reference implementation: tera-be `user/employee/listener/HrAssociateEventHandler.java`
     (ack only after success, nack to redeliver) and `user/employee/mapper/HrRoleCodeMapper.java`
     (explicit table; unknown codes dropped and logged).
   - Catalog push: the existing RBAC API (`/admin/rbac/roles/setup`). Old data: a SQL datafix
     script. ADD/BLOCK permission changes: no event; read live.
5. **Mapping to propose to Bao.** HR canonical codes were read from HR staging DB `hr-dev`
   (`canonical_role`, 67 codes):

   | HR code | Recruit role | Note |
   |---|---|---|
   | RECRUITER | RECRUITER | direct |
   | ONBOARDING_SPECIALIST | ONBOARDING | direct |
   | (none) | MANAGER (Recruiting Manager) | HR `MANAGER` is generic across departments; needs a new HR code (e.g. RECRUITING_MANAGER) or is granted by hand in IAM |
   | (none) | LO_SUPPORT | same: new HR code or IAM by hand |
   | (none) | ADMIN | IAM by hand (like TERA's DEVELOPER decision) |
   | — | HEADHUNTER, TEAM_LEAD | NOT from HR: recruit-be assigns these in auth-service itself when a loan officer joins / leaves the LO Recruiter Program |
   | INSIDE_RECRUITER, OUTSIDE_RECRUITER | ignore | inactive in HR |
   | HR `TEAM_LEADER` | do not map | a generic team lead, not the program's TEAM_LEAD |

   Also map `HR_ASSOCIATE_DEACTIVE` to removing every RECRUIT role.
6. **Dependency:** recruit-be production runs with Pub/Sub OFF (`PUBSUB_PROVIDER=none`). The HR
   events need it ON in production; that is an ops change to put in the plan.
7. Then continue the phases in `PLAN.md`: P2 (drop 4 roles), P3 (format-2 catalog + coverage test),
   P4 (central source + HR event consumer + reconcile), P5 (recruit-fe read-only), P6 (production).

## Done this session (22/10)

- Root cause found: auth-service #176 sets `APP_ACCESS_ENFORCE="*"` on staging; `/authorize`
  refuses RECRUIT without a central `account_role` (`AppLookups.heldRoleCodes`).
- Staging central RBAC (with an admin@tera token Bao pasted; expires, ask again):
  - Created roles HEADHUNTER, TEAM_LEAD and LO_SUPPORT.
  - Added 19 `account_role` rows, so every `rbac_grants` holder has the matching central role.
  - manhadmin: removed MANAGER, keeping RECRUITER.
  - Removed the RECRUIT roles of 29 accounts that never signed in (bulk-created 03/09).
- **Chi's 7 test accounts** (`chi.tran+recruiter/manager/onboarding/hh/teamlead/losupport/admin`):
  - Accounts created by session agentflow-05; central roles granted by this session.
  - All 7 real logins passed.
  - Credentials, plain text for Chi: `.worktrees/_designs/staging-test-accounts-chi.txt`
    (chmod 600, never print it).
- Decisions by Bao (22/10), recorded in the bead:
  - Drop roles HR, LICENSING, ACCOUNTING and OFFICER_RECRUITER.
  - Fine-grained permissions.
  - Duplicates list owned by MERGE.
  - Remove "move despite missing fields" and both S6 requirements.
  - Bulk release of own leads = scope SELF.
  - Remove licensing rules and sponsorship writes.
  - manhadmin = RECRUITER.
- Facts measured to answer Bao:
  - **Duplicates on production:** 22 NMLS groups and 26 email groups, from a loan officer raising
    a hand twice via two channels, or a recruiter adding by hand. MOSO rows are matched by MOSO
    row key, not by email/NMLS.
  - **No-answer ladder:** 3 / 5 / 10 / 30 days, then a Nurture call 3 months later. The lead stays
    with its owner and is never auto-archived.
  - **Stage gates:** S6 Joined = signed + paid (automatic).

## Tools and gotchas for the next session

- **Read-only DB access:** a temporary `postgres:18-alpine` pod with `envFrom` the service secret.
  `kubectl wait` often times out, but the logs are still there.
  - recruit staging context: `gke_lenderrate-master_us-central1_moso-kube`, ns `recruit-be`,
    secret `recruit-svc-secret`.
  - recruit production context: `gke_lender-rate_us-central1_moso-gke`.
  - auth staging: ns `auth-service`, secret `auth-svc-secret`, db `auth_db`.
  - HR staging: ns `hr-dev`, secret `ai-hr-backend-secret` + configmap `ai-hr-backend-config`.
- **gcloud:** if it asks to re-auth, Bao runs `! gcloud auth login`.
- **Admin API:** needs Bao's admin@tera ACCESS token, not the refresh one. Refreshing rotates and
  revokes Bao's own session.
- **Endpoints used:**
  - `POST /auth-svc/api/v1/admin/rbac/account-roles/search` (filter operator `in`, `values`)
  - `POST|DELETE /admin/rbac/accounts/{userId}/roles[/{roleId}]`
  - `POST /admin/accounts/lookup`
  - `POST /admin/rbac/roles/setup`
- **Staging central RECRUIT role ids:**
  - ADMIN `6a9c5e3b-af56-46cb-8984-4975d353d4ff`
  - MANAGER `428d9251-37bc-49a5-8afe-1391cb6fe96d`
  - RECRUITER `ea500c95-3e03-467a-9597-31ccd074facb`
  - ONBOARDING `543f5f1c-6d28-4a9e-aa57-7ebaa065001a`
  - HEADHUNTER `ea1b9436-976a-4403-a31e-eb90f16b055c`
  - TEAM_LEAD `fcf7180b-794e-43d6-a1fd-3d2906ab01a9`
  - LO_SUPPORT `6c4a3e63-bbfb-4b2f-be08-2f462a13be44`
  - HR `640f08a2-45d4-4c9d-92f8-40100b5186cf`
  - LICENSING `df5ff0a1-d372-4d10-b270-a27e1ca7a590`
  - ACCOUNTING `2d95b4cb-fe37-4b60-9edc-7542028c9dc8`

## OPEN ISSUE from session agentflow-68 (22/10 evening) — Loan Officer referrers lose My referrals

Read before finishing PLAN.md and before APP_ACCESS_ENFORCE reaches production.

- My referrals (`GET /referrals/mine`) needs NO recruit role by design: any signed-in person sees the people THEY
  referred (verified e-mail match). The recruit-fe menu shows the entry to a person with no recruit role at all
  ("noGrant" → only My referrals). Its main users are plain Loan Officers who refer other Loan Officers.
- With `APP_ACCESS_ENFORCE` on, `/authorize` refuses RECRUIT to anyone without a central RECRUIT role, so those Loan
  Officers are stopped at sign-in, never reach the page, and see no Recruit icon in the launcher. Already true on
  staging; on production (referrals.enabled ON since 16/10) they would lose access the day enforcement ships.
- PLAN.md keeps 7 roles and none covers a plain referrer (HEADHUNTER/TEAM_LEAD are for LO Recruiter Program members).
- Options shown to Bao (not decided yet):
  1. (recommended) A minimal role, e.g. `REFERRER`, granting only My referrals; recruit-be assigns it in auth-service
     when a person gets their first referral (same mechanism as HEADHUNTER/TEAM_LEAD), removes it when none remain.
  2. Give that role to every Loan Officer (e.g. from the HR app at onboarding) — simpler, but everyone sees the icon.
  3. Move My referrals into an app Loan Officers already open — no auth change, larger work.
- Bao's question that raised it: "LO chắc chắn không có role recruiter — có ảnh hưởng gì không?"

## UPDATE 22/10 evening (session agentflow-99, e19da9e9)

- **PR #714 merged** (squash 0eaf0dea, V267, D308) and **promoted to staging** (cd-staging success, pod started
  14:49Z). Production not promoted.
- **Who in Recruit prod is already a LoanFactory loan officer.** Measured against MOSO prod Datastore (Bao has
  READ, granted by Khai 09/10; project `lender-rate`, ns `5716104026521600`, kind `Admin`).
  - **MOSO loan officers:** 6,277 Admin entities in MOSO. 4,905 of them are loan officers (`is_loan_originator`
    or `lo_type` set), and 2,714 of those are currently active (active and no `terminate_date`).
  - **Hot/Cold pool on Recruit prod:** 408 rows (unowned, ACTIVE, S0-S5). Of these, 2 are CURRENT LF loan
    officers and 5 are former ones.
  - **Rows outside the pool that are current LF loan officers:**
    - 66 rows at S6 ACTIVE (Joined, but already working);
    - 110 rows at S7 ACTIVE, which is correct;
    - 6 rows at S5 ARCHIVED that are in fact working at LF.
  - **Rows outside the pool that are former LF loan officers:** 3 rows at S7 ACTIVE.
  - **Cold import risk:** MOSO `LORecruiting`, the source of the deferred Cold import (~131k rows), holds 3,960
    rows that belong to 2,682 CURRENT LF loan officers (matched by NMLS or email). An unfiltered Cold import
    would put almost every current LF loan officer into Cold.
  - Evidence files (contain emails, chmod 700, never commit): `~/.cache/claude-recruit/lfcheck/` (`admins.json`,
    `cands.csv`, `matches.json`, `lorecruiting_ids.json`, scripts `pull_admins.py`).
- Read-only DB runner kept at `~/.cache/claude-recruit/rbac/rro.sh <stg|prod> <file.sql>` (the scratchpad is wiped
  between sessions).

### CORRECTION 22/10 night: "working at LF" needs a join date

`Admin.active=true` only means a MOSO account exists, and onboarding hires get one early. The correct
classification uses the join date:
- **WORKING** = active, `lo_joined_date` set, and no `terminate_date` (2,644);
- **ONBOARDING_ACCOUNT** = active with no join date (70);
- **LEFT** = `terminate_date` set (2,191).

With this definition:
- **The 66 S6 rows are ONBOARDING_ACCOUNT**, so S6 is correct and no action is needed. MOSO itself says
  `interviewed_and_accepted` ("Onboarding") for them.
- **The pool holds 0 WORKING loan officers.** 2 rows are duplicates of S6 rows, and 5 are former LF loan
  officers.
- **Cold import risk:** MOSO LORecruiting holds 3,869 rows for 2,615 WORKING loan officers.

Step A list for Bao: `~/.cache/claude-recruit/lfcheck/step_A_list.csv`, 11 rows:
- **A1:** 4 rows to archive, because the person left LoanFactory.
- **A2:** 5 archived or closed rows of people working at LF. Reopen 4 as S7; 1 already has a live S7 twin
  and stays archived.
- **A3:** 2 pool rows to merge into their S6 twin.
