## Why (Bao, 24-25/10: redesign)

1. **Credit does not depend on the channel.** Once a Loan Officer (Anna) is approved into the LO Recruiter Program, every lead whose referrer is Anna earns her program credit, whatever the entry: her own site, /join, /loan-officer, the lf `/join/<slug>` link, a staff member adding the lead on the Interested tab with "referred by Anna", a CSV import, or anyone typing her e-mail into a public form. /join is one tool among these.
2. **Membership is judged when the referrer is attached to the lead**, not at pay time. A member revoked later keeps credit on leads she already has; a lead referred before approval is a Referral.
3. **A non-member Loan Officer as referrer is a Referral**, as today.

Replaces the earlier version of this PR (the per-lead `/join-page` call, credit stored in `recruiter`, slug-stamp requirement). Earlier approvals no longer apply.

## Design

- **`recruiter` stays the staff handler** (round-robin, follow-ups, `ilo_return`), exactly as today. The two guards I had added in `ILOAutomaticAssignOwnerOp` and `LoanOps` are **reverted** (this PR's net diff does not touch them).
- **Credit = the existing referral link `referred_lo = <member>` + a server-set marker** `lo_recruiter_program_credit` (indexed), plus `lo_recruiter_program_member` (the credited member's key) and `lo_recruiter_program_credit_at`. The marker is **valid only while `referred_lo` still equals the credited member** (`LoRecruiterProgramStanding.isCredit`, the one definition used everywhere).
- **One decision point, in MOSO** (`LoRecruiterProgramStanding`): called from `LORecruiting.beforeCreated` (every create path: public forms, staff SaveOp / Interested-tab invite, CSV, direct creates) and from `beforeSave` when a referrer is first set on an existing lead (first touch wins: a lead that already had a referrer is never re-judged). Referrer resolution is the same as today's referral block (first active Admin with that company e-mail, typed then lower-case). The `JOIN_SLUG`/`RECRUIT_SLUG` stamp is **no longer required**; it stays as analytics only.
- **Membership source: a cached member list, not a per-lead call.** New moso-aid endpoint (**moso-aid #196**, dependency) `GET /api/lo-programs/standing/members?program_id=lo_recruiter` returns approved spells `{user_key, approved_at, ended_at}`, so "was X a member at time T" is answered locally. packs caches the list, refreshes about every 5 minutes (30 s back-off after a failed refresh), and keeps the last good copy when a refresh fails. Hardening: https only (+ `/api` suffix check), service key header, no redirects, 1 MB body cap, short timeouts, key and login e-mail never logged.
- **Never had a copy** (moso-aid unreachable since boot): the lead keeps today's Referral link, is flagged `lo_recruiter_program_unverified` with who/when, and the **nightly reconcile** `cron.ReconcileLoRecruiterProgramCreditCronOp` settles it using the list **at the referral time**: member then -> marker (and, for a referrer attached by an edit, the link); not a member then -> flag cleared, stays a Referral. Idempotent; leaves the flag while there is still no list.
- **Anti-forgery.** The marker fields are part of the origin stamp, so every public body has them stripped (create and keyed update, and from public responses); a public `referred_lo` is stripped on `registerWebinar`, `registerLoanOfficer` and `submitReferALoanOfficer`. A forged body gets no credit (tested), and a re-pointed `referred_lo` invalidates the marker.
- **Pay reports** (`GenerateMonthlyReferILORecruiterCronOp`, `UpdateReferrerLoanOfficerReport`): a program member is counted from the leads whose marker is valid via `referred_lo` (monthly cron reads the month's marked leads once with an equality query on the indexed marker, no composite index); staff recruiters stay exactly as today (counted by `recruiter=`). No HR flag is ever set on a member.
- **CSV import** (`ParseFileCsvRecruitedLoanOfficersOp`, `IMPORT_FIELDS`): new optional column **"Referred by (email)"**, same rule as every channel; blank = no referrer; an e-mail that is no active Admin imports the row **with no referrer** and the row is listed in the result (`unmatched_referrers`). Recruited (CSV) leads now get the referral link for a Loan Officer referrer (the rule "plain Loan Officer = Referral").
- **Recruit read** (`ReferralByOwner`, RecruitAPI `referrals/byOwner`): each row now carries `lo_recruiter_program_credit` and `entry_type` is `PROGRAM` from the marker (stamp-based chip unchanged otherwise).

## Review round 3 (security and correctness)

- **Server-only credit fields (M1).** `lo_recruiter_program_credit`, `_member`, `_credit_at` and `_unverified` cannot be changed by any update: `LORecruiting.beforeSave` rolls back a client, LO or staff change to them (SaveOp, bundle edit, keyed public update), unless the server itself marked that bean (`LoRecruiterProgramStanding.confirm`, the reconcile cron). Creates are covered by the stamp strip plus `resolveOnCreate`.
- **`recruiter` is stripped from public bodies again (M2)** (create and keyed update, `registerWebinar`, `registerLoanOfficer`, `submitReferALoanOfficer`); staff and internal saves still set it.
- **Stale cache.** A "not a member" answer from a copy older than 60 s forces one refresh before deciding; a copy older than 1 h is no evidence (UNVERIFIED, flagged, settled nightly at the referral time). Fresh copy: lock-free read. Stale copy: served while exactly one thread refreshes (stale-while-revalidate); only the very first load waits (existing 2-3 s caps).
- **Nightly reconcile also re-checks the last 48 h** of referral leads (referral link, no credit) whose referrer has any membership spell, at the lead's creation time, to catch an approval that landed in the cache window. Idempotent.
- **Signed-in Loan Officer adding her own lead** with no list loaded is now flagged unverified (it was silently a plain lead).
- **Dual role.** A staff recruiter (HR flags) who is also an approved member keeps staff handling and never gets the program marker (create and later edit).
- **Lenient list parsing.** A malformed spell is skipped and counted in a `recruiter-program-members-malformed-spells` WARN instead of rejecting the list; body cap 4 MB; repeated refresh failures log `recruiter-program-members-refresh-failing consecutive=N` (alert on it).
- **LO-referral bonus vs reconcile.** The Admin conversion guard now also skips the referral bonus link **while a lead is unverified**. If reconcile then settles it as NOT credited and the lead was already converted, the bonus link was never written: reconcile logs `recruiter-program-reconcile-referral-bonus-held ... review the LO-referral bonus manually` for Accounting (chosen over re-running the Admin conversion logic).
- Monthly cron recomputes the credited leads once per run; the CSV import now logs row numbers, never row contents.
- **CSV "Referred by (email)" links a Referral for a plain Loan Officer even when the feature is off** (no moso-aid configuration). That is intended (Bao: any channel; a plain Loan Officer is a Referral). Only the program marker needs the configuration.

## Pay findings (please read, Accounting / Bao)

- **No double LO-referral bonus (a guard I added).** `Admin.beforeCreated` (conversion of a lead to an Admin) copies `referred_lo` onto the new Admin and starts the **LO-referral bonus** for the referrer. With credit stored as `referred_lo`, a program lead would have paid Anna BOTH program credit and the referral bonus (D268: one program only). The conversion block now skips a lead that carries valid program credit. Tested both ways: credited lead -> no bonus link; plain referral -> bonus link as before. **Confirm this is what Accounting wants.**
- **Who appears where in the reports.** A credited lead is on the **member's** row (`referred_lo`) and, if staff hold it, on its **staff handler's** row (`recruiter=`, as every lead assigned to a handler today). Both counts exist; nothing in packs pays from them (no payout code reads these reports), so Accounting decides. Proposed reading: the member is paid program credit; the handler's count is workload, as today.
- A member revoked later keeps her rows for leads credited while approved (Bao confirmed). Leads created before this deploys are not back-filled.

## Before / after

| Case | Before | After |
|---|---|---|
| Public form / own site / /join with Anna's e-mail | `loan_officer` + `referred_lo`, or recruiter credit only with HR flag | `referred_lo=Anna` + marker (program credit), no stamp needed |
| Staff adds lead "referred by Anna" (SaveOp, Interested tab, direct create) | referral | program credit |
| CSV row with Anna / a plain Loan Officer / blank / unknown e-mail | no referrer column | credit / Referral / none / imported with no referrer and listed |
| Referrer set on an existing lead later | nothing | member -> credit; plain Loan Officer unchanged; existing referrer never re-judged |
| Anna approved after the lead was referred | referral | referral |
| Anna revoked after the lead was referred | referral | credit kept |
| Plain Loan Officer as referrer | Referral | Referral |
| HR-flagged recruiter as referrer | recruiter credit | unchanged |
| moso-aid unreachable and never loaded | n/a | Referral link + `unverified`, settled nightly at the referral time |
| Public body with the marker / `referred_lo` | stored | stripped |
| Staff handler (`recruiter`) of a credited lead | round-robin | round-robin (unchanged) |
| LO-referral bonus on a credited lead's conversion | started | not started |

## Tests

`LoRecruiterProgramCreditTest` (60, real `WebPlusAPI` / `beforeCreated` / `beforeSave` / CSV op / Admin conversion / `ReferralByOwner` against the local datastore; moso-aid is a real local HTTP server serving the member list): every channel; member-at-time (approved later, revoked later, revoked before, spells); cache, failed refresh keeps the last copy, back-off; unverified and every reconcile outcome incl. idempotence; forgery on create and keyed update; marker validity; later edits and first touch (incl. an earlier non-Loan-Officer referrer); reports; no double referral bonus; Recruit read; config validation. Related suites also green: LeadOriginStamp(Persistence)Test, ReferralEntryTypeTest, RecruitApiOnboardingTest, SaveLORecruitingFromRecruitOpTest, ReferralReadOpsTest, RecruitApiActorGateE2ETest, RecruitApiInviteUpdateTest, PublicRegisterFeeFieldsTest, RegisterInterestedLoanOfficerLegalNameGuardTest, MeetingClassificationGuardTest: **276 tests, 0 failures** on both branches.

Negative controls (each mutation turned its tests red, then reverted; round 3: update guard removed, public `recruiter` strip removed, forced refresh removed, max age removed, unverified self-added lead, dual-role check, unverified bonus hold, single-flight lock, lenient parsing, recent re-check): marker validity without the `referred_lo` check; membership ignoring time; public `referred_lo` strip removed; marker fields removed from the stripped stamp; reconcile using "now" instead of the referral time; the Admin conversion guard removed; unknown CSV e-mail kept; Recruit marker disabled; first-touch check removed (needs a referrer with no link); the monthly report's member branch removed.

## Deploy / config

- **Merge/deploy order:** moso-aid #196 first (needs the new secret), then this. Safe before it: with the properties unset the feature is **off** and behaviour is as before (one warning in the log).
- **System properties (per environment):** `moso_aid_base_url` = moso-aid `/api` root (https, ending `/api`; staging `https://moso-aid-233682574497.us-central1.run.app/api`, production `https://moso-aid-444859640964.us-central1.run.app/api`) and **`moso_aid_packs_service_key`** = the value of moso-aid's new `PACKS_INBOUND_SERVICE_KEY`.
- **Schedule** the nightly reconcile: op `cron.ReconcileLoRecruiterProgramCreditCronOp`.
- New indexed fields (`lo_recruiter_program_credit`, `lo_recruiter_program_unverified`) are new properties on `LORecruiting`; no migration. No composite index is required by the new queries.
- **Branches:** master and 3.64.1 have diverged and MOSO prod runs 3.64.1. This PR targets `master`; an independent twin (same commits) targets `3.64.1`: https://github.com/LoanFactory-Inc/packs/pull/3740. Not stacked.

## Recruit (not changed here)

recruit-be reads `referrals/byOwner`. Nothing breaks: `entry_type` becomes `PROGRAM` for credited leads. Follow-up recommended there: show Program vs Referral from `lo_recruiter_program_credit` (and stop inferring it from `lead_origin`), and store the three new fields that `SendLORecruitingToRecruitOp` now forwards verbatim.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
