## Why

Bao decided on 23/10 (option a): a Loan Officer who is **approved into the LO Recruiter Program** but does **not** carry the HR "recruiter" flag must earn **recruiter** credit for sign-ups through their own site. Accounting still pays the LO Recruiter Program from MOSO (it moves to Recruit later), so the lead must be stored exactly as an HR-flagged recruiter's lead is.

lo-homepage #911 and moso-aid #195 already make every form on an approved member's site send `referred_source=recruiter`, `referred_by=<owner company email>`, `lead_origin=JOIN_SLUG|RECRUIT_SLUG` + `lead_origin_slug`. But `LORecruiting.beforeCreated` downgraded any non-HR-flagged referrer to `loan_officer` + `referred_lo`.

## What changes

In `LORecruiting.beforeCreated`, in the branch that used to downgrade (owner is a loan originator, not HR-flagged), a new check `LoRecruiterProgramStanding.creditsAsRecruiter` decides. If it says yes, set `recruiter=<owner keyName>` and keep `referred_source=recruiter` (no `referred_lo`), i.e. identical to the HR-flagged path.

**How membership is determined.** Two independent proofs, both required:
1. The origin stamp resolved on the server (`SLUG_SERVER_RESOLVED`, owner key == this Admin, origin JOIN_SLUG/RECRUIT_SLUG). Existing `LeadOriginStamp` logic, untouched.
2. moso-aid says so: `GET <moso_aid_base_url>/join-page?key=<websafe Admin key>` (existing PUBLIC read, no auth key; lo-homepage uses it to decide the stamp). `data.recruiter_slug` is present only for an approved member (or page holder) and must equal the stamp slug. The key sent is the Admin's own websafe key (`Bean.key()`, what moso-aid keys on), chosen by packs from the Admin table, never from the request.

No new moso-aid endpoint or service key was needed.

## Before / after

| Case | Before | After |
|---|---|---|
| HR-flagged recruiter, valid stamp | recruiter credit | unchanged (no moso-aid call) |
| Approved member, no HR flag, valid stamp | `loan_officer` + `referred_lo` | **`recruiter` + `recruiter=<owner>`**, stamp unchanged |
| Non-member LO, forged `referred_source=recruiter` + stamp | `loan_officer` | `loan_officer` (moso-aid says no) |
| Claim with no / mismatched slug stamp | `loan_officer` | `loan_officer`, moso-aid not even called |
| `/refer` page (REFER_LO_PAGE) | referral | unchanged |
| moso-aid down / 5xx / bad body / URL unset | `loan_officer` | `loan_officer` + warn log, lead still saves |
| Existing lead, owner approved later (or lapses) | first touch kept | first touch kept (hook runs only on create) |

D268 holds: a member never also gets `referred_lo`. Only sign-ups after approval count: standing is read per sign-up, nothing existing is re-credited.

## Tests

New `LoRecruiterProgramCreditPersistenceTest` (17 tests, real `WebPlusAPI.registerWebinar` -> real `beforeCreated` -> local datastore, moso-aid as a real local HTTP server): HR-flagged, approved member, websafe-key wire check, RECRUIT_SLUG, non-member forged stamp, 404, no stamp, mismatched slug, other-slug answer, forged owner fields, REFER_LO_PAGE, 5xx, garbage body, unreachable, URL unset, existing lead (both directions).

Related suites re-run green (193 tests): LeadOriginStamp(Persistence)Test, ReferralEntryTypeTest, RecruitApiOnboardingTest, SaveLORecruitingFromRecruitOpTest, ReferralReadOpsTest, RecruitApiActorGateE2ETest, RecruitApiInviteUpdateTest.

Negative control: with the stamp check disabled, the slug equality dropped and the fail-safe returns flipped to "member", 7 tests went red (no-stamp, mismatched slug, other-slug, forged owner fields, 5xx, unreachable, URL unset); restored, 17/17 green. Before the implementation, the 5 new-behaviour tests were red.

## Deploy notes

- **New config: system property `moso_aid_base_url`** = moso-aid's `/api` root, per environment (packs staging/master -> dev moso-aid `https://moso-aid-233682574497.us-central1.run.app/api`; packs production -> `https://moso-aid-444859640964.us-central1.run.app/api`; same URLs as in tera-docs/moso-aid/README.md). **Unset = feature off**, behaviour exactly as today. No secret/key is involved.
- Adds one outbound call (5s connect/read timeouts) only on first-touch sign-ups that claim recruiter credit through a stamped, server-resolved non-HR Loan Officer; HR recruiters and all other leads never call moso-aid.
- Safe to deploy before or after lo-homepage #911 and moso-aid #195: before them nothing sends the stamp, so nothing changes; moso-aid's `/join-page` already exists on master (it needs #195 to return `recruiter_slug` for non-HR members, until then members read as non-members and fall back to today's behaviour).
- Base is `master` (same commit as `3.64.1` at the time of writing); a 3.64.1 twin is a clean cherry-pick if Khai wants it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
