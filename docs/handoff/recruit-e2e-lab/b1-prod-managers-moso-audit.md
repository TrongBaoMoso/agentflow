# B1: who can send or approve offers in PRODUCTION recruit, and can MOSO act as them?

Date: 2026-10-09. All reads were read-only: no code, config, data or settings were changed.

## Re-verified 09/10 (independent re-check after Bao doubted the Brayan/Seth finding)

**Verdict: the original finding stands.** Brayan and Seth would be refused by packs as the acting user for invite and profile sync. What changed: the evidence is now direct (prod Datastore reads plus the permission code), Miley's `is_onboarding_specialist` was measured, and the other people on the LO Recruiting list were added (table 3b below).

**Why Bao's `/lo-info-check` lists look like "they have recruiting permission" but are not.** Two different permissions have similar names:
- `RECRUITING` is a core permission. It is defined at base `core/src/main/java/com/mvu/core/shared/typekey/Permission.java:28` and registered at `:60` as "Access Recruiting menu ... post jobs, manage interview questions and manage candidates", implied only by `OWNER` (and so `SUPER`). **This is the one packs RecruitAPI checks.**
- `RECRUITED_LOAN_OFFICERS` and `INTERESTED_LOAN_OFFICERS` are loan permissions. They are defined at packs `loan/.../shared/typekey/LoanPermissions.java:86-87` and registered at `:194-195` as "Access Recruited/Interested loan officers menu", implied by `OWNER`. They do **not** imply `RECRUITING`. The implication graph only runs parent to child (base `core/.../server/Permissions.java:17-47`).
- Neither Brayan's nor Seth's `permissions` list contains `RECRUITING` or `OWNER`. Bao's screenshots and the prod Datastore read agree on this.

**Exact rule in packs** (`origin/master` `92b719f42e2`, `loan/src/main/java/com/mvu/loan/server/op/api/RecruitAPI.java`):
- `authenticate()` (`:1157-1219`):
  - Checks the Bearer token, the Loan Factory namespace pin, the shared key and the sealed fresh actor header.
  - `resolveActorAdmin(email)` must return an **active** Admin, otherwise 401 "unknown or inactive acting user".
  - Then it installs `createSessionUser(admin)`. The session permissions are `Permissions.getImpliedPermissions(Admin.permissions)` (base `appengine/.../BaseServer.java:498-509`).
- `hasRecruitingPermission()` = `App.hasAnyPermission(currentUser, Permission.RECRUITING)` (`:1263-1265`).
- `isAuthorizedActor` = `RECRUITING || (allowOnboardingSpecialist && Admin.is_onboarding_specialist)` (`:1230-1234`). If it is false, `authRequest` throws 401 "acting user lacks recruiting permission" (`:1134-1147`).
- **No department, role (`is_recruiter`, `is_out_sourcing_recruiter`) or `RECRUITED_LOAN_OFFICERS` check exists anywhere in RecruitAPI** (grep "department" = 0 hits).

| Op recruit-be calls | packs gate | Who passes |
|---|---|---|
| `candidate/invite` (also carries `onboarding_specialist`) | `authRequest(req)` `:465` | RECRUITING only. Separately, the named specialist must be an active `is_onboarding_specialist` Admin (`:2639-2648`). That rule is about the *named specialist*, not the actor |
| `candidate/sync` (profile write-back) | `authRequest(req)` `:310` | RECRUITING only |
| `webinars`, `candidate/registerWebinar` | `authRequest(req)` `:268`, `:389` | RECRUITING only |
| `candidate/onboardingMeeting` | `authRequest(req, true)` `:722` | RECRUITING, or `is_onboarding_specialist` limited to own candidates (`actingSpecialistOwnsCandidate` `:1249-1255`) |
| `candidate/agreement` (dry-run/status) | `authRequest(req, true)` `:1398` and owner check `:1400` | same as above |
| `candidate/agreement/send` | `authRequest(req, true)` `:1691` | same as above (`sendAgreement(..., hasRecruitingPermission(), actor, ...)`) |
| `candidate/meetingReminder` | `authRequest(req, true)` `:1729` | same as above (`RecruitMeetingReminder.send(..., hasRecruitingPermission(), actor)`) |
| `referrers/resolve`, `referrals/byOwner` | `authenticate()` only `:985`, `:1043` | any active Admin, but without RECRUITING only about themselves ("Forbidden - you may resolve only yourself" `:993`, `:1015`) |

**Who is the actor** (recruit-be `origin/master`):
- Each outbox row carries `actor_email = ActorEmailResolver.emailOf(actorId)`, which is `rbac_grants.email` of the recruit user whose action enqueued it (`PacksWritebackEnqueuer.java:227`, `:278-585`).
- For an invite this is the requesting recruiter (D127).
- Meeting reminders act as the candidate's onboarding specialist (`OnboardingReminderGuards.java:110`).
- Agreement send acts as the clicking user (`AgreementSendServiceImpl.java:129`).

**Was the earlier probe valid?** Yes.
- `referrers/resolve` asked about *another* person returns "Forbidden - you may resolve only yourself" exactly when `hasRecruitingPermission()` is false (`:986-993`), which is the same predicate `authRequest` uses.
- The earlier audit did not use a different op with a different rule. Its only gap was that Miley's specialist flag was "not probed", and it is now measured.

### 3b. Re-verified table (prod MOSO Datastore `lender-rate` / ns `5716104026521600`, kind `Admin`, read 09/10 as bao.trinh@ via REST runQuery; prod recruit `rbac_grants` read through `rq-prod.sh`, read-only pod deleted)

- Departments: `32969207757` = `DEPARTMENT_15_LO_RECRUITING` and `33029377312` = `DEPARTMENT_14_LO_ONBOARDING` (`DepartmentSetting.java:66,70`). packs ignores both.
- All 13 Admins below are `active=true`.
- "A" = admitted as actor for invite / sync / webinars.
- "O" = admitted for onboardingMeeting / agreement / agreement send / meetingReminder.

| Person | company_email (Admin key) | MOSO RECRUITING? | is_onboarding_specialist | recruit prod grant | A (invite, sync) | O (meeting, agreement, reminder) |
|---|---|---|---|---|---|---|
| Bao Trinh | bao.trinh@ (personal gmail) | **yes** | no | ADMIN | yes | yes (any candidate) |
| IT Dept | it.dept@ (numeric id) | **yes** (+OWNER, SUPER) | no | ADMIN | yes | yes |
| Victoria Pham | victoria.pham@ | **yes** | no | MANAGER | yes | yes |
| Brayan Suarez | brayan@ (brsuarez2001@gmail.com) | **no** (has INTERESTED_/RECRUITED_LOAN_OFFICERS, LOAN_OFFICERS, CONFIG …) | no | RECRUITER | **NO**: 401 "lacks recruiting permission" | **NO** |
| Seth August | seth.august@ (sethdaugust@gmail.com) | **no** (only INTERESTED_/RECRUITED_LOAN_OFFICERS) | no (`is_out_sourcing_recruiter`=true) | RECRUITER | **NO** | **NO** |
| Miley Dau | miley.dau@ | no | **yes** | ONBOARDING | no | own candidates only |
| Sara Acosta | sara.acosta@ | no | **yes** | none | no | own candidates only |
| Lisbeth Giraldo | lisbeth.giraldo@ | **yes** | yes | none | yes | yes |
| Tommy Le | tommy.le@ | **yes** | no | none | yes | yes |
| Wegina Co | wegina@ | no | no | none | no | no |
| Matt Moghaddam | mattmo@ | no | no (`is_out_sourcing_recruiter`) | none | no | no |
| Lindsay Davis | lindsay.davis@ | no (only RECRUITED_LOAN_OFFICERS) | no | none | no | no |
| (also in dept) Phuong Nguyen | phuong.nguyen@ | yes (+OWNER) | no | none | yes | yes |
| (also in dept) Geta Smith | geta@ | no (no permissions) | no | none | no | no |

Prod state today: `packs_writeback_outbox` has 0 rows, so nothing has been refused yet. Only the 9 grants listed in section 3 exist. Sara, Lisbeth, Tommy, Wegina, Matt and Lindsay have no recruit grant, so they cannot be actors today.

**Note on fix option (a).** Granting MOSO `RECRUITING` to Brayan and Seth also opens MOSO's HR "Recruiting" menu (jobs, interview questions, candidates). The packs gate checks the HR-style permission, not the LO-recruiting one. The alternative is a packs change that also admits `RECRUITED_LOAN_OFFICERS` in `hasRecruitingPermission()`. That would admit Brayan, Seth, Miley, Sara, Wegina, Matt and Lindsay. It is a security decision for the packs Repo Owner and Bao, and it is not made here.

**Sources**
- recruit-be `origin/master` = `origin/production` `e5caa333`.
- packs `origin/master` `832b8d31fb`.
- Prod recruit DB, read through `.worktrees/_designs/tools/rq-prod.sh`. This runs a throwaway `postgres` pod with `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`, and the pod is deleted afterwards.
- Prod packs Recruit API `referrers/resolve`. This is a read-only op (`bundle.readOnly()`), called with a sealed `x-company-email` actor header. It used the prod `RECRUIT_API_KEY`, read from the k8s secret into an env var and never printed.

## 1. RBAC rule (recruit-be)

- **Request / send an invite (offer):** `OFFER_REQUEST`, and since D209 the actor must also be the candidate's current owner **or** hold `OFFER_APPROVE` (`OfferRequestPermission`).
  - When the D64 rule auto-sends, the request goes out with no approval step.
  - `approve_now` needs `OFFER_APPROVE`.
- **Approve / decline / resend for anyone, and the approval queue:** `OFFER_APPROVE` (`OfferController` `gate(OFFER_APPROVE)`, `InviteResendPermission`, `OfferDeclinePermission`). `ADMIN` = `"*"`.
- **Who MOSO acts as when the invite mail goes out (D127):** the **requesting recruiter**, not the approver. The address comes from `rbac_grants.email` (`ActorEmailResolver`).
  - If it is blank, `recruit.recruit-api.fallback-actor-email` is used.
  - In prod that fallback is blank, so the approve is refused with a 400 (`requireResolvableEmail`). This is confirmed live: the prod pod env has no `RECRUIT_API_FALLBACK_ACTOR_EMAIL`.
- `RECRUIT_RBAC_ENFORCE=true` on prod (pod env).

Prod `rbac_roles` holding offer permissions:
- `OFFER_APPROVE`: `ADMIN` (`*`) and `MANAGER`.
- `OFFER_REQUEST`: `RECRUITER`, `OFFICER_RECRUITER`, `LO_SUPPORT`, `TEAM_LEAD`, `HEADHUNTER`.
- `ONBOARDING` holds `AGREEMENT_SEND`.

## 2. MOSO rule (packs RecruitAPI)

- `authenticate()` resolves the actor through `GetAdminByEmailOp`. The lookup order is keyName, then `email`, then `company_email`, then the Credential. The Admin must be `active`; if not, packs answers **401 "unknown or inactive acting user"**.
- `authRequest()` then requires `App.hasAnyPermission(user, Permission.RECRUITING)`. This includes implied grants (OWNER implies it). If missing, packs answers **401 "acting user lacks recruiting permission"**. This applies to `candidate/invite`, `candidate/sync`, `candidate/registerWebinar` and `webinars`.
- `onboardingMeeting`, `agreement`, `agreement/send` and `meetingReminder` use `authRequest(req, true)`. They also admit an active Admin flagged `is_onboarding_specialist`, but only for that specialist's own candidates.
- **How the probe works.** `referrers/resolve` calls `authenticate()` only, then checks RECRUITING itself. Asking it about another person therefore separates three cases:
  - 401 unknown/inactive means no active Admin;
  - "Forbidden - you may resolve only yourself" means an active Admin without RECRUITING;
  - 200 `reason=ok` means an active Admin with RECRUITING.
- **Controls.** Negative control: `nobody-xyz-control@loanfactory.com` returned 401 "unknown or inactive acting user". Positive control: `it.dept@` returned 200 ok. Each person was also asked about themselves (200 ok), which proves the Admin exists and is active.

## 3. Result (prod, 2026-10-09)

The prod `rbac_grants` table has 9 rows, and every grant carries an email.

| Name (from email) | Email | Recruit role | Can send / approve offers? | MOSO Admin exists? | Active? | Has RECRUITING? | Verdict |
|---|---|---|---|---|---|---|---|
| Bao Trinh | bao.trinh@loanfactory.com | ADMIN | send + approve | yes | yes | **yes** | OK as requester, approver and mail actor |
| IT Dept | it.dept@loanfactory.com | ADMIN | send + approve | yes | yes | **yes** | OK (already the D184 referrals system actor) |
| Victoria Pham | victoria.pham@loanfactory.com | MANAGER | send + approve | yes | yes | **yes** | OK |
| Brayan | brayan@loanfactory.com | RECRUITER | send (request; own candidates) | yes | yes | **no** | **BLOCKED as mail actor.** An invite he requests is mailed as him (D127), and packs `candidate/invite` refuses with 401 "lacks recruiting permission" |
| Seth August | seth.august@loanfactory.com | RECRUITER | send (request; own candidates) | yes | yes | **no** | **BLOCKED as mail actor**, same as Brayan |
| Miley Dau | miley.dau@loanfactory.com | ONBOARDING | no offers (has AGREEMENT_SEND) | yes | yes | no | Not an offer actor. Agreement send / reminders work only for her own candidates: re-verified 09/10 that her Admin has `is_onboarding_specialist`=true |
| Dave Hoang | dave.hoang@loanfactory.com | HR | no | yes | yes | yes | n/a |
| Dung | dung@loanfactory.com | LICENSING | no | yes | yes | no | n/a |
| Rosaline Pham | rosaline.pham@loanfactory.com | ACCOUNTING | no | yes | yes | no | n/a |

Additional observations:
- The MOSO Admin key (keyName) of most of these people is a **personal Gmail address**, not their `@loanfactory.com` address. Resolution works anyway because `GetAdminByEmailOp` falls back to `company_email`. Do not compare keys with recruit emails directly.
- Prod offer state today:
  - offers: SENT 504 and SIGNED 176, all `IMPORTED` from MOSO;
  - `offer_history`: IMPORTED 680, FEE_PAID 42, SIGNED 53, **REQUESTED 0**;
  - `packs_writeback_outbox`: **0 rows**, because `RECRUIT_FEATURES_PACKS_WRITEBACK` is absent on prod.
  - So nobody has sent an invite from recruit on prod yet, and the gap above has not bitten anyone yet.

## 4. Notes: D184 and the blank fallback

- **D184.** The referrals admin view calls packs as `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL`, which is `it.dept@loanfactory.com` on prod (set 08/10, verified active + RECRUITING, and re-confirmed above). This system actor is read-only. It is deliberately **not** used for invite or reminder mail.
- **`fallback-actor-email` is blank on prod on purpose.** It would put a borrowed identity on outgoing e-mail to loan officers.
  - Consequence 1: an approve whose requester has no grant email gets a 400 and nothing is written.
  - Consequence 2: a requester whose grant email is a MOSO Admin **without RECRUITING** passes recruit's precheck (the email exists), but the write-back INVITE fails at packs with 401 "lacks recruiting permission".
  - The D235 retry-as-system-actor does not help here, for three reasons: it is only for the "unknown or inactive" 401, its switch is off on prod, and the fallback is blank anyway.
  - Recruit's precheck only checks that an email exists. It does not check MOSO active/RECRUITING, so this failure appears only at delivery time, as a dead letter.

## 5. Recommendation

Before turning on `RECRUIT_FEATURES_PACKS_WRITEBACK` on prod (or before Brayan or Seth request invites), do one of the following:
- (a) A MOSO admin grants **RECRUITING** to Brayan's and Seth's MOSO Admins. This is the simplest option and matches how they already use MOSO's recruiting screens, if they do.
- (b) Have only MANAGER/ADMIN (Victoria, Bao, IT) request invites until then.

Optional hardening (recruit-be): at request/approve time, pre-flight the mail actor with the same read-only `referrers/resolve` probe. Refuse with a clear message ("<name> is not a MOSO recruiting user, so ask an admin to grant RECRUITING") instead of dead-lettering later.
