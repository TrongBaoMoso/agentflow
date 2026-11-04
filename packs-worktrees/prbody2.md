## Why

Bao decided on 23/10 (option a): a Loan Officer who is **approved into the LO Recruiter Program** but does **not** carry the HR "recruiter" flag must earn **recruiter** credit for sign-ups through their own site. Accounting still pays the program from MOSO (it moves to Recruit later). Bao also decided (23/10, later): **never set `is_recruiter` / `is_out_sourcing_recruiter` on members** (those are MOSO staff roles), so the credit reports are widened instead.

lo-homepage #911 and moso-aid #195 already make every form on an approved member's site send `referred_source=recruiter`, `referred_by=<owner company email>`, `lead_origin=JOIN_SLUG|RECRUIT_SLUG` + `lead_origin_slug`. `LORecruiting.beforeCreated` used to downgrade a non-HR-flagged referrer to `loan_officer` + `referred_lo`.

## What changes

1. **Credit at sign-up** (`LORecruiting.beforeCreated` + new `LoRecruiterProgramStanding`). Two independent proofs, both required: the server-resolved slug stamp (`SLUG_SERVER_RESOLVED`, owner == this Admin) AND moso-aid's public `GET <moso_aid_base_url>/join-page?key=<websafe Admin key>` returning `data.recruiter_slug` equal to the stamp slug. Stored exactly like an HR-flagged recruiter's lead: `referred_source=recruiter`, `recruiter=<owner keyName>`, no `referred_lo`. Evaluated only at first touch, so existing leads are never re-credited.
2. **Lookup hardening.** https only (+`/api` suffix check), no redirects, 16 KB body cap, ~2.8 s total with one retry on timeout/5xx, 60 s per-owner cache (answers only, never failures), lazy client, logs carry a hash of the Admin (never the login e-mail), "not configured" warns once. Three outcomes, not two: a failed lookup logs `recruiter-standing-lookup-failed admin_id=<hash> reason=...`, keeps today's `loan_officer` credit and adds the lead label `Warning: recruiter credit not verified (program lookup failed)` so it can be found and corrected; a clear "no" (200 without slug, or 404 logged at info) gets no label.
3. **Credit reports widened (flags untouched).** An active Loan Officer that leads are credited to (`recruiter=<their key>`) now counts in the two reports that drive recruiter credit/pay.
4. **Staff automation kept off a member's lead.** See the inventory.

## Inventory: who reads the HR flags, and what changed

| Consumer | Reads | Drives | Change |
|---|---|---|---|
| `GenerateMonthlyReferILORecruiterCronOp` (`ilo_refer_by_recruiter`) | `is_recruiter` / `is_out_sourcing_recruiter` | pay/credit | **widened**: Loan Officers with credited leads in the month get a row (no leads, no row) |
| `UpdateReferrerLoanOfficerReport` (`referrer_lo_detail`) | same flags | pay/credit | **widened**: same rule |
| `GenerateRecruiterPerformanceReportOp` (`recruiter` PerformanceReport) | `role.isAnyRecruiter()` | staff dashboard workload (new/invited counts) | none |
| `PerformanceReportUtils.isRoleActive` / `StatisticProcessor` role caches / `UpdateRecruitedLoanOfficerSummaryStatistics` | flags | staff statistics and caches | none |
| `RecruitAPI.mayActOnLoRecruiting` | flags | actor authorization = staff capability | none (members must not gain it) |
| `AdminUtils.activeRecruiters`, `FindRecruiterLiveOp`, AssignOwners pickers | role | staff pickers | none (members stay out) |
| `ReferralByOwner` (Recruit read) | stamp / `referred_by`, not flags | Recruit "program" chip | none, already works |

Not covered by this repo: Accounting's own tooling and Recruit. If anything there filters on the HR flags it needs the same widening.

## Side effects of `recruiter=<member>`

| Site | What would happen | Action |
|---|---|---|
| `ILOAutomaticAssignOwnerOp` (queued after every create) | the staff round-robin **overwrites** `recruiter` with an outside recruiter, erasing the credit | **fixed**: skipped when the lead's recruiter is not a staff recruiter (no turn burned); staff leads unchanged |
| `LoanOps.createDefaultFollowUpForLORecruiting` | would assign the default follow-up task to the member (only when a signed-in user saves) | **fixed**: no `$recruiter` recipient for a non-staff recruiter |
| `CheckAdminHasActiveTransactions` | only runs for flagged staff; a member is never checked | none needed |
| `AssignOwnersOp.assignRecruiterOwner` | staff-initiated (BRANCH/HR permission) bulk reassignment of an offboarded Admin's active leads | none: deliberate staff action, grants the member nothing |
| `owners_of_lo` | includes the member, which feeds owner-scoped statistics only | none (no screens, flags untouched) |
| `ilo_return` e-mail (`LORecruiting.beforeSave`) | the template is stored in the datastore and was not inspected | **open question for Khai/Bao**: confirm it is fine for a member |

## Before / after (sign-up)

| Case | Before | After |
|---|---|---|
| HR-flagged recruiter, valid stamp | recruiter credit | unchanged, no moso-aid call |
| Approved member, no HR flag, valid stamp | `loan_officer` + `referred_lo` | `recruiter` + `recruiter=<owner>`, stamp unchanged |
| Non-member, forged stamp / no stamp / wrong slug | `loan_officer` | `loan_officer` |
| moso-aid down / 5xx / bad body / URL unset | `loan_officer` | `loan_officer`; failure is logged and labelled (URL unset: feature off, one warning) |
| Existing lead, owner approved later | first touch kept | first touch kept |

## Tests

- `LoRecruiterProgramCreditPersistenceTest` (28, real `registerWebinar` -> `beforeCreated` -> local datastore; moso-aid is a real local HTTP server): all cases above plus retry, cache and TTL, redirects, oversized body, URL validation, labels.
- `RecruiterProgramMemberReportsTest` (11): both reports, member gets no flag, round-robin and follow-up guards, staff behaviour unchanged.
- Related suites green: LeadOriginStamp(Persistence)Test, ReferralEntryTypeTest, RecruitApiOnboardingTest, SaveLORecruitingFromRecruitOpTest, ReferralReadOpsTest, RecruitApiActorGateE2ETest, RecruitApiInviteUpdateTest. 226 tests, 0 failures.
- Negative controls: breaking the stamp check / slug match / fail-safe returns turned 7 red; breaking retry / cache / redirect / body cap / label turned 11 red; removing the report widening and both automation guards turned 5 red.

## Deploy notes

- **New config: system property `moso_aid_base_url`** = moso-aid's `/api` root, https, per environment: packs staging -> `https://moso-aid-233682574497.us-central1.run.app/api`; packs production -> `https://moso-aid-444859640964.us-central1.run.app/api`. **Unset (or malformed) = feature off**: behaviour exactly as today, one warning in the log. No secret.
- One outbound call (<= ~2.8 s) only on first-touch sign-ups claiming recruiter credit through a stamped, server-resolved non-HR Loan Officer; cached 60 s per owner.
- The report and automation changes need no config and are inert until some lead has `recruiter=<non-staff LO>`.
- Safe to deploy before or after lo-homepage #911 and moso-aid #195 (until #195 members read as non-members and fall back to today's behaviour).
- **Branches:** master and 3.64.1 have diverged and MOSO prod runs 3.64.1. This PR targets `master`; an independent twin (same commits, cherry-picked clean) targets `3.64.1`: TWIN_URL. Not stacked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
