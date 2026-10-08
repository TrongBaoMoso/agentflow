# B1: who can send or approve offers in PRODUCTION recruit, and can MOSO act as them?

Date: 2026-10-09. All reads were read-only: no code, config, data or settings were changed.

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
| Miley Dau | miley.dau@loanfactory.com | ONBOARDING | no offers (has AGREEMENT_SEND) | yes | yes | no | Not an offer actor. Agreement send / reminders work only if her Admin has `is_onboarding_specialist` and she is the row's specialist (not probed) |
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
