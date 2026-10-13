# What a loan officer candidate receives: email, SMS and calendar invites (inventory, 13/10/2026)

Read-only research. Code read on the latest origin after `git fetch` on 13/10:
recruit-be `origin/master` a49261c9 (and `origin/production` 5706ae4e for the helm values), recruit-fe `origin/master` 6837ad17,
packs `origin/master` 40afc65e7dc, moso `origin/master` 174252787c, moso-configuration `origin/master` a1eb932618,
omni-service `origin/master` c6c9ce1 / `origin/production` a771443, followup-be 3b2ade0, ai-hr-be 089f384c,
lf-homepage 3bfcfedc, lo-homepage f70b1ac6d.

Path short-hands: `P/` = `packs/loan/src/main/java/com/mvu/loan/`, `M/` = `moso/src/main/java/com/lenderrate/`,
`RB/` = `recruit-be/src/main/java/com/loanfactory/recruit/`, `T/<key>` = `moso-configuration/src/main/resources/backups/Template/<key>.json` (subject source).

"Live" columns: recruit flags come from `helm-chart/config/{staging,production}/values.yaml`, with `application.yml` defaults when absent.
MOSO templates live in the datastore; the moso-configuration copy is the default and may differ per namespace.
Caveat: MOSO production was rolled back to packs 3.64.1, so packs master features such as `RECRUIT_V2` / hand-off handling may not be on prod MOSO (memory note `project_recruit_prod_parity_handoff`). I did not check that.

---

## 0. Short answers

1. **Only Omni messages appear in the recruit Omni conversation.** That means the recruiter's composer email/SMS, "Send info → Save & send", and the LO's replies.
   - Every automatic mail (MOSO/packs, Inkless, Google Calendar, ai-hr-be) is sent outside omni-service, so **none of them appears in the Omni conversation**.
   - Some of them leave an internal SYSTEM line in recruit's own Activity timeline, which is a separate panel (`recruit-fe src/shared/components/CandidateDrawer/TimelineSection.tsx`). Others leave nothing at all.
   - The Omni panel is omni-react's `<ConversationSection>`, which reads omni-service directly (`recruit-fe src/shared/components/ConversationModal/index.tsx:555-556`). recruit-be never posts an email or SMS into a conversation.
2. **Production Omni email is broken today.** The Omni composer email currently never leaves in production.
   - omni prod sends with v1 role `LO`, and prod moso-notifier has no `LO` mail config, so it throws `MailConfigNotFoundException` (13/10 02:58:43Z, `docs/handoff/recruit-e2e-lab/HANDOFF.md:255-256`).
   - The UI still shows "Sent".
   - The fix (`EmailAppCode` = `TERA`, omni-service `internal/outbox/config.go:172-177`, #565 / 437dcae) is on omni master but **not an ancestor of `origin/production`** (verified with `git merge-base --is-ancestor`).
   - Bao 13/10: skip the prod fix for now.
3. **The invite e-mail was replaced by a hand-off, not removed.** It is replaced by a hand-off **only on staging, and only when a recruit onboarding specialist exists**. Production does not send it from recruit at all. Section 1 has the evidence.

---

## 1. Is the "Invite" e-mail gone?

**Verdict:** not gone. The template and the send code still exist in packs and in the legacy MOSO desk. What changed:

| Where | What happens to the invite e-mail | Evidence |
|---|---|---|
| **recruit, staging** | Replaced by a hand-off **when the candidate has a recruit onboarding specialist** (`send_invite_email=false`). With **no specialist it falls back to the old e-mail** (fail-safe, by design). | `RB/packswriteback/PacksWritebackPayloadResolver.java:514` `final boolean handoff = packsWritebackEnqueuer.isOnboardingV2HandoffEnabled() && handoffTargetExists(resolved);` and `:518` `payload.put(SEND_INVITE_EMAIL_PROPERTY, !handoff);`. `PacksWritebackEnqueuer.java:215-216` needs packs-writeback, onboarding-writeback and v2-handoff all on. Staging values `:332-333` `RECRUIT_FEATURES_ONBOARDING_V2_HANDOFF "true"` ("STAGING ONLY, turned on 06/10 … Production stays off"). |
| **recruit, production** | recruit sends **no** invite to MOSO at all: `RECRUIT_FEATURES_PACKS_WRITEBACK` is absent, so it is `false` (default `application.yml:334`). An offer reaching SENT on prod writes nothing to MOSO and e-mails nobody. | Prod `values.yaml:174-180`: "Every write through it goes via the packs-writeback outbox, which stays empty while RECRUIT_FEATURES_PACKS_WRITEBACK is absent here (0 rows in packs_writeback_outbox on 06/10), so this URL writes nothing." |
| **packs (MOSO API)** | Sends the invite unless the caller says `send_invite:false`. **packs never skips it on its own because a specialist exists.** The specialist is only validated and stored. | `P/server/op/api/RecruitAPI.java:525` `boolean sendInvite = in.get("send_invite", BooleanType.instance(), true);` and `:585-589` `if (sendInvite) { … emailNotQueuedReason(EMAIL_TEMPLATE_INVITE, …) }`. Older path: `P/server/op/recruiting/SaveLORecruitingFromRecruitOp.java:249` `sendInviteEmail = input.is(send_invite_email) && !alreadyInvited`. |
| **Legacy MOSO desk (still live on prod)** | A recruiter on the old LO Recruiting desk can still send it by hand. | `M/client/view/interested_loan_officer/LORecruitingInvitationView.java:108` `sendEmailButton(…)`, `:158` `EmailHistory.template … "email/interested_loan_officer_invitation_email"` |
| **recruit-fe** | The invite (offer) UI still exists: "Send invite" (`messages/en/invite.json:44`), the Today "ready to join" strip, Resend invite. When the flag is on, the list reads "My hand-offs" instead of "My invites" (D207 (7)). | `recruit-fe src/app/[locale]/(private)/today/_components/TodayClient/ReadyToJoinStrip.tsx`, `src/apis/recruit/offers.api.ts:84` `useResendInvite` |

DECISIONS.md (recruit-be `docs/DECISIONS.md`):
- **D207 (02/10):** *"Onboarding v2 hand-off ("Option C"): the invite is no longer an e-mail, it is a hand-off to the onboarding specialist … Dark … default OFF in EVERY environment."*
  - *"`resolveInvite` marks the payload `send_invite_email=false` when the flag is on AND the candidate has recruit's own `onboarding_specialist_id` … **Fail-safe, not silence**: flag on but no specialist id (MOSO's mirror of a specialist does not count …) = today's invite e-mail, logged."*
  - *"(9) No new MOSO template key (Bao 04/10): the one e-mail after the 1-1 is packs' EXISTING `pre_onboarding_done` template."*
- **R41:** *"Bao chose Option C (no invite e-mail at all) on 02/10."* Rejected C' ("flag on and no specialist = send nothing"), because the LO would read "Invited" with no e-mail and no human.
- **D207 (10b) fallback:** if MOSO refuses the specialist on the hand-off INVITE, *"the retry e-mails"*. So a hand-off can still turn into an e-mail on staging.
- Staging flag history: D207 shipped dark, and the staging values turned it on on 06/10. Production stays off.

**Answer to "sent by MOSO only when there is no onboarding specialist?"** On **staging**, yes in effect. recruit asks MOSO for the e-mail only when there is no recruit specialist, or when MOSO refused the specialist. The decision is recruit-be's, not MOSO's. On **production**, recruit never asks, so the only invite e-mails are the ones a recruiter sends by hand from the legacy MOSO desk.

---

## 2. Inventory by lifecycle stage

Legend for "In Omni": **yes** = an Omni conversation message; **no** = not in Omni (the Activity column says whether recruit's timeline gets a line).

### 2.1 Registration (website, before recruit is involved)

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| R1 | Email | `webinar_registration`: "${company} Webinar Registration Confirmation" (T/) | Public webinar sign-up: lf-homepage `/loan-officer`, `/join/[slug]` → `POST …/webplus/v1/…/registerWebinar` (`lf-homepage src/apis/loanfactoryApi.ts:601`, lo `:576`). Also `registerLoanOfficer` without a key (`:798`). | `P/server/op/recruiting/RegisterInterestedLoanOfficer.java:73-75` (from `WebPlusAPI.java:1499/1510, 2527/2537`). Skipped if `ready_to_join` or the row is RECRUIT_V2. | Recruiting | no; no Activity line | prod + staging (MOSO) |
| R2 | Calendar invite | Google Calendar webinar event; the LO is added as a guest, `sendUpdates=all` | Any write of `LORecruiting.webinar` (public sign-up, desk, recruit writeback) | `P/shared/entity/LORecruiting.java:1060-1064` → `Webinar.guests` → `P/server/op/recruiting/SyncWebinarsCalendarOp.java:51-62` → `GoogleCalendar.java:114-124`. Only when `Webinar.author` is set. Rescheduling does not remove the old invite. | Recruiting | no | prod + staging |
| R3 | Email | `email/refer_a_loan_officer`: "Thank you for referring ${officer} …" | Refer-a-LO form → `submitReferALoanOfficer` (lf `loanfactoryApi.ts:779`) | `P/server/op/referral/SaveLORecruiterOp.java:117-122`: `Template.to, Colls.asList(recruiterEmail, officer.get(LORecruiting.email))`, so it goes to the referrer **and the LO** (verified). | Recruiting | no | prod + staging |
| R4 | Email (drip) | `ilo_campaign/campaigns_interested_loan_officers_day_{3,10,24}`: "Grow Faster, Work Smarter and Earn More — with Loan Factory", … | 3, 10 and 24 days after an LORecruiting row is created, while `responded:false` | Config only: `moso-configuration …/backups/Query/interested_loan_officers.json` (`event_types: after_created`, `offsets [3,10,24]`). The engine is the generic MOSO campaign/newsletter ops (INFERRED). Whether it is active in the prod datastore: **unknown**. | Recruiting | no | unknown |
| R5 | Email | `vip_afterparty_confirmation` / `_approved` / `_denied` | After-party / summit forms → `POST {AID}/api/lo-events` (lf `otherApi.ts:128`) | moso-aid `src/services/event.js:256-273` via MOSO webplus `sendEmail` (from the Explore agent, not re-verified) | System / events | no | prod |

### 2.2 Recruiting / engaged (recruit Today, calls, follow-ups)

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| E1 | Email | Recruiter's own email (`OMNI_DIRECT_MAIL`, passthrough subject/body) | Recruiter presses Send in the Omni composer | omni-service `internal/outbox/notifier.go:46`, `dispatch.go` → moso-notifier v2 → SendGrid. Reply-To `<token>@reply.loanfactory.com` | Recruiting | **yes** (Omni message; also mirrored as an OUTBOUND row in Activity: `RB/…/OmniOutboundMessageHandler.java:126-133`) | staging yes; **prod: accepted but not delivered** (Section 0.2) |
| E2 | SMS | Recruiter's own text | Omni composer, SMS tab | omni-service `internal/outbox/smssender.go:164` → zoom-go `/messages/send`, from the sender's Zoom number | Recruiting | **yes** | prod + staging |
| E3 | Email/SMS | "Send info → Save & send" (call result) | Recruiter on the Call result | recruit-fe `src/shared/omni/sendInfoNow.ts:14-26`: the browser posts the composer payload to omni with the recruiter's token ("the message lands in the conversation timeline, because it IS a conversation message") | Recruiting | **yes** | same as E1/E2 |
| E4 | Email/SMS (inbound) | The LO's replies | LO replies to E1/E2 | omni `internal/inbound/service.go:424` (email), `sms.go:44` (SMS) → recruit `RB/…/OmniInboundMessageHandler.java:143` | — | **yes** | prod + staging |
| E5 | — | "Save & invite" | Call outcome INTERESTED with no next step | `RB/candidate/service/impl/FollowUpServiceImpl.java:196, 514-525`. **Sends nothing.** It only arms the "invite not sent yet" strip. | Recruiting | no mail; SYSTEM line in Activity | — |
| E6 | — | Sequences / cadence | — | `RB/sequence/service/impl/NoOpSequenceSenderImpl.java:25` `"SequenceSender STUB — would send …"`. **Sends nothing.** | — | — | stub everywhere |
| E7 | — | Follow-ups, incl. the D253 webinar reminder/feedback pair | Recruiter tasks in followup-be | followup-be mails **staff only** (`internal/notify/message.go:38-43`). Prod `NOTIFY_ENABLED: "false"` (`helm-chart/config/production/values.yaml:73`). | — | nothing to the LO | — |
| E8 | Email | `email/webinar_registration_send_manually`: "You're Registered! Why Loan Factory Every Friday" | recruit Call outcome next step WEBINAR → WEBINAR_REGISTRATION writeback → packs `candidate/registerWebinar` (or `webinar_registration` via the save path). Also legacy desk "register for webinar" (`P/server/op/user/RegisterWebinarForILOsOp.java:45-50`). | `P/server/op/api/RecruitAPI.java:165, 405-410`; recruit `RB/…/FollowUpServiceImpl.java:650-652` | Recruiting | no; outcome line ", registered for webinar X" in Activity | recruit path: **staging only** (packs-writeback off on prod); desk: prod |
| E9 | Calendar invite | Webinar Google Calendar event | Same as R2, caused by E8 | Same as R2 | Recruiting | no | as E8 |
| E10 | Email ×4 | `webinar_notify_before_2_days`, `_before_1_day`, `_before_2_hours`: "Reminder: … Loan Officer Webinar starts in 2 days / tomorrow / begins in 2 hours" | Daily cron over `loan_officer_recruiting` webinars | `M/server/op/cron/SendEmailToWebinarAttendeeCronOp.java:34-44` (moso repo, not packs) | Recruiting | no | prod + staging (cron) |
| E11 | Email ×2 | `webinar_registration_after_1_day`, `_after_1_month`: "Joining ${company}" | Same cron, 1 day / 1 month after the webinar (the 1-month one only to status `interested`) | `M/…/SendEmailToWebinarAttendeeCronOp.java:46-51` | Recruiting | no | prod + staging |
| E12 | Email | Desk status templates `ilo_default_template_setting/<status>_email` | Recruiter sends by hand from the legacy desk | `P/server/op/loan/GetDefaultILOTemplateByWebinarStatusOp.java:25-32` (pre-fill) | Recruiting | no | prod (legacy desk) |

### 2.3 Offer / invite

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| O1 | Email | `email/interested_loan_officer_invitation_email`: "Invitation to join ${company}". From/Reply-To = the recruiter. Link = apply-loan-officer page. | (a) recruit offer → SENT, or Resend, with **no hand-off** (Section 1); (b) legacy desk "Invite" | (a) `RB/offer/…/OfferServiceImpl.java:739`, `InviteResendServiceImpl.java:120` → packs `P/server/op/api/RecruitAPI.java:585-589`; (b) `M/…/LORecruitingInvitationView.java:108,158` | Recruiting | no. Activity: SYSTEM line only on resend / system actor / not-queued / dead letter (`InviteResendServiceImpl:152`, `PacksWritebackTickServiceImpl:431-471`); a normal first send writes **no** line | recruit path: **staging only, and only with no specialist**; desk: **prod** |
| O2 | — | Hand-off instead of e-mail (staging) | Same, with a specialist | `PacksWritebackPayloadResolver.java:514-518`; the specialist gets the in-app bell `ONBOARDING_ASSIGNED` | Onboarding | nothing to the LO | staging only |

### 2.4 Onboarding 1-1 (specialist)

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| N1 | Calendar invite | Google Calendar event for the 1-1 (Meet link); the LO is a guest | Specialist plans the 1-1 slot | `RB/…/ChecklistFacadeImpl.java:271/280` → `OnboardingMeetingCalendarSync`; guest check `CalendarMeetingSync.java:394-398`; `GoogleCalendarClient.java:44-75` (`sendUpdates`) | Onboarding | no. Activity: "Planned/Re-planned the 1-1…" (`ChecklistItemServiceImpl.java:666`) | staging: on, guests limited to an ALLOWLIST of 4 `bao.trinh+` addresses (values `:423, :431-438`); **prod: off** (no `RECRUIT_FEATURES_GOOGLE_CALENDAR_EVENTS`) |
| N2 | Calendar invite | Recruiter MEET_ONE_ON_ONE event | Follow-up of kind Meet 1-1 | `RB/…/FollowUpServiceImpl.java:283/472/700` → `FollowUpMeetingCalendarSync` | Recruiting | no | same gate as N1 |
| N3 | Calendar invite (manual) | "Add to Google Calendar" template link, pre-filled with the LO's address | User clicks and saves in their own calendar; Google sends the invite (INFERRED) | recruit-fe `GoogleCalendarTemplateButton.tsx`, `ScheduleMeetingModal.tsx:137-141` | Recruiting/Onboarding | no | prod guest policy `ANY` (`:140`); staging ALLOWLIST |
| N4 | Email | `email/onboarding_meeting_reminder` (body rendered by recruit-be), from the specialist | Reminder ticks before the 1-1 | recruit `OnboardingReminderTickServiceImpl.tickOnce` → packs `candidate/meetingReminder` (`P/server/op/api/RecruitMeetingReminder.java:85, 111-112`) | Onboarding | no; **no Activity line either** | flag on in both, but `onboarding.reminder.delivery_mode = DRY_RUN` (V204 seed; values comments) → **nothing sent** in either (DB setting not re-read live) |
| N5 | Email | `email/daily_onboarding_update`: "${company} Daily Onboarding Update - ${ilo}" (cc the specialist) | Daily, for `interviewed_and_accepted` rows with open to-dos | `P/server/op/cron/DailyCheckOnboardingILOsCronOp.java:67` | Onboarding | no | prod + staging (MOSO cron) |
| N6 | Email | `pre_onboarding_done`: **"Loan Factory Onboarding: Complete These Initial Steps"** | 1-1 marked Done (`onboarding_meeting_status → pre_onboarding_done`), from the MOSO desk or recruit's ONBOARDING_MEETING writeback | `P/shared/entity/LORecruiting.java:1086-1092` (afterSave; comment: "a RECRUIT_V2 row gets this same e-mail; it is the 'complete your registration' mail of Option C"); recruit `RB/…/ChecklistItemServiceImpl.java:621` | Onboarding | no; no Activity line on success | recruit path: **staging only** (onboarding-writeback off on prod); desk Done: prod |
| N7 | — | ONBOARDING_SPECIALIST writeback | Specialist assigned | `/candidate/invite` with `send_invite` hard-coded false (Kind javadoc: "queues no e-mail") | — | nothing to the LO | staging |
| N8 | Calendar invite (INFERRED) | Calendly 1-1 booking; template `invite_one_one_meeting` "[${company}] 1-1 Calendly meeting" exists | Calendly link in the MOSO LO-recruiting config | `M/…/LORecruitingConfigView.java:319` (Calendly setting). **No sender for `invite_one_one_meeting` found on packs master.** | Onboarding | no | unknown |

### 2.5 Pay / sign

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| S1 | Email | `require_ilo_esign_documents`: "Action Required: Review and E-Sign Your Loan Officer Agreement", from the specialist | (a) MOSO admin "Re-generate e-sign documents and send email" (needs a specialist); (b) recruit "Send agreement" → packs `candidate/agreement/send` (LINK_AGAIN); (c) agreement rebuild (UPDATED_AGREEMENT) | `P/server/op/recruiting/EnsureSigningSessionsRegisterInterestedLoanOfficer.java:403-410`; `RecruitAPI.java:2196-2253`; `RebuildIloAgreementTask.java:244-251`; recruit `RB/agreement/service/impl/AgreementSendServiceImpl.java:189` | Onboarding | no. Activity: "Requested the updated e-sign agreement to be sent (attempt n)." + outcome | recruit button: **staging only, allowlisted to `bao.trinh+`** (values `:361-366`); prod off. MOSO admin path: prod |
| S2 | — | Inkless's own invite / completion mails | — | **Suppressed.** `EnsureSigningSessions…java:830-833` `fillAndSendWithBytes(…, true, false); // suppress Inkless completion email — MOSO sends inkless_signing_completed_ilo`. `SignDocumentWithInkLess.java:570`: "embedded … without Inkless sending emails (we send our own)" | — | — | — |
| S3 | Email | `inkless_signing_completed_ilo`: "[Signing Complete] Loan officer agreement[ and CA Compliance Statement]", from `onboarding_dept_email` | All Inkless sessions completed (webhook or poll cron) | `P/server/op/recruiting/InklessProcessInterestedLoanOfficerCompletedOp.java:172-189` | Onboarding | no. recruit bell `AGREEMENT_SIGNED` is staff-only. | prod + staging |
| S4 | Email (+PDF) | `view_signed_agreement`, legacy non-Inkless signing | Legacy signing complete | `P/server/op/pdf_form/GenerateSignedDocumentOp.java:375-395` | Onboarding | no | legacy |
| S5 | Email | `email/paid_startup_fee_successfully`: "Your Payment Has Been Successfully Received" | `paid_startup_fee → true` after a PayPal order check (`WebPlusAPI.saveLoanOfficerPaidStartupFee`) | `P/shared/entity/LORecruiting.java:1079-1083`; `P/server/op/meeting/InterestedLoanOfficerPaidStartupFee.java:38-45` | Accounting | no. Bell `FEE_PAID` is staff-only. | prod + staging |
| S6 | Email (3rd party) | PayPal's own payment receipt | LO pays the start-up fee with PayPal | PayPal (outside our code; INFERRED) | Accounting | no | prod |
| S7 | Email | `ILO_completes_background_check`: "Loan Factory Background Check Requirement for OR, GA, and KY" | `interviewed_and_accepted` + fee paid + agreement signed + a sponsor state in the background-check list | `P/shared/entity/LORecruiting.java:1099-1115` | Licensing | no | prod + staging |

### 2.6 Joined / HR (post-hire)

| # | Channel | Name / subject | Trigger | Sending system (file:line) | Dept | In Omni? | Live |
|---|---|---|---|---|---|---|---|
| J1 | Email | `email/lender_credential_guide`: "Lender Credentials Guide - ${name}", to the **new company e-mail**, from HR | LORecruiting status → `joined` and a linked Admin exists | `P/shared/entity/LORecruiting.java:1067-1074` (`sendEmailWhenILOJoinedCompany`), template call at ~`:1436-1439` | HR | no | prod + staging |
| J2 | Email | `loan_officer_fully_onboarded`: "[Do not reply] Next Steps After Onboarding: How to Get Support" | Admin `is_pending_loan_officer → false` | `P/shared/entity/Admin.java:2670-2675` | Onboarding / System | no | prod + staging |
| J3 | Email | `email/notify_referrer_ILOstatus`: "${company} Onboarding Progress Update - ${ilo}", to the referrer **and the LO** (T/ `to: [ilo.referred_by, ilo.email]`) | Row archived (`active → false`) and it has a referrer | `P/shared/entity/LORecruiting.java:1330-1353` | Recruiting | no | prod + staging |
| J4 | Email | `email/ilo_access_removal`: "NMLS Access Removed by LO …" | Manual op | `P/server/op/recruiting/SendEmailNotificationAccessRemovalOp.java:19` | Licensing | no | manual |
| J5 | Email | `ME_ACCOUNT_CREATED`: "Your Mortgage-Education Account Has Been Created!" (contains the default password), to the hire's ME login | HR hire that enrolls an ME account (after recruit "Send to HR" → ai-hr-be `/internal/v1/recruit/hires`) | ai-hr-be `internal/notifier/catalogue.go:33, 324`; send in `internal/action/me_account.go` (agent cites `:339/:459`), via moso-notifier v2 app `HR` | HR | no | prod (ai-hr-be push/writes on per the Explore agent; recruit Send to HR: prod manual button, auto-send off at `values :211`) |
| J6 | Email | `ME_ACCOUNT_UPDATED`: "Your Mortgage-Education Account Has Been Updated!"; `ME_LOGIN_EMAIL_CHANGED`: "Your Mortgage-Education login email has changed" | ME account changes | ai-hr-be `catalogue.go:271, 339` | HR | no | prod |
| J7 | Email | `TODO_REMINDER` / `HRDOC_REMINDER`: weekly "to-dos due" / "papers missing/expiring" | HR sweeps for employees who owe items; may include a newly hired LO (INFERRED) | ai-hr-be `catalogue.go:28-30, 204, 239` | HR | no | prod |
| J8 | SMS | `post_onboarding_ss_welcome_sms`, `post_onboarding_not_completed_monday_sms` / `_reminder_sms`, `gbp_*_sms` (to `company_phone`, via Zoom) | Post-hire support follow-up | `P/shared/entity/Admin.java:3872-3880`; `P/server/op/cron/OnboardedLOFollowUpCronOp.java:130-189` (`SendLoanOfficerSupportViaZoomSMSOp`) | Onboarding / Support | no (partly possible, see the SMS section) | prod + staging |

Internal-only MOSO mails, which never reach the LO, for completeness: `onboarding_interested_loan_officer` (to the specialist, `LORecruiting.java:840-843`), `email/paid_startup_fee_by_ilo`, `ilo_return`, `hr_status_changed_to_completed`, `email_referrer_when_ILO_attend_webinar` / `_onboarded`, `ilo_automatic_assign_owner`, `ilo_completed_esign`.
All 24 recruit `NotificationKind`s are in-app bells for staff. The platform-inbox mirror sets EMAIL/SMS/PUSH OFF (`RB/…/PlatformInboxCatalog.java:246-250`) and is itself off by default. recruit-be has no mail client of its own.

---

## 3. SMS, separately

| # | SMS | Sender / path | To | In Omni? | Live |
|---|---|---|---|---|---|
| X1 | Recruiter's text from the Omni composer / Send info | omni `smssender.go:164` → zoom-go, sender's Zoom number | LO | **yes** | prod + staging |
| X2 | `webinar_sms_notify_before_1_day`, `webinar_sms_notify_before_2_hours` (webinar reminders) | `M/server/op/cron/SendEmailToWebinarAttendeeCronOp.java:39,44` → `M/server/op/SendWebinarAttendeeSMSOp.java:31-32, 102` → `SendZoomSMSOp` (QueueType ZOOM), **from the department's Zoom phone**; skipped when the LO has no phone or no From number (`:58, :81`) | LO (`LORecruiting.phone`) | **no**. Partly possible: omni's outbound-echo can file a Zoom text sent outside omni onto a subject, but only if an `{LO phone, our number}` SMS pair already exists (`omni internal/inbound/outbound_echo.go`, otherwise IGNORED). Not verified for the department number. | prod + staging |
| X3 | Manual desk SMS (LO Recruiting desk), pre-filled from `ilo_default_template_setting/<status>` | `P/server/op/zoom/SendZoomSMSListOp.java:56-74` → `SendZoomSMSOp`; `P/server/op/loan/TransformILODefaultSMSTemplateOp.java:22-42` | LO (INFERRED: the desk uses it for candidates) | no (same echo caveat as X2) | prod (legacy desk) |
| X4 | Post-hire SS welcome / not-completed / GBP SMS (J8) | `SendLoanOfficerSupportViaZoomSMSOp` | hired LO's `company_phone` | no (same caveat) | prod + staging |
| — | None from recruit-be, followup-be, moso-notifier as a producer, ai-hr-be or ai-hr-service | — | — | — | — |

Twilio exists only for inbound STOP / opt-out (`P/server/op/TwilioHook.java:32-49`; an omni Twilio hook is mounted only when `TWILIO_AUTH_TOKEN` is set). A STOP to an Omni text is written to `comm_suppression` (omni `optout.go`).

---

## 4. What is missing from the Omni conversation (for the gap list)

Every automatic message the LO gets is invisible in Omni. These are the most important ones by stage:
1. **Registration:** R1 webinar confirmation, R2 webinar calendar invite.
2. **Engaged:** E10 / E11 webinar reminders and post-webinar mails, X2 webinar reminder SMS.
3. **Offer:** O1 invite e-mail. Even on staging, the normal first send writes no Activity line.
4. **Onboarding:** N6 "Complete These Initial Steps", N5 daily onboarding update, N1 1-1 calendar invite.
5. **Pay/sign:** S1 e-sign request, S3 signing complete, S5 payment received, S7 background check.
6. **Joined:** J1 credential guide, J2 next steps, J5 ME account created.

Today, a recruiter looking at the conversation sees only what a person typed in Omni. On production, even the e-mails among those currently do not reach the LO (Section 0.2).

## 5. Open points / not verified

- Live DB values were not read: `onboarding.reminder.delivery_mode`, and whether the R4 drip campaign is active in the prod datastore.
- Packs code was read on master; prod MOSO runs an older rolled-back build (3.64.1), so the RECRUIT_V2 skip in R1 and the comment in N6 may not be on prod.
- J5 line numbers inside `me_account.go` and the ai-hr-be prod flags come from an Explore agent and were not re-read.
- N8: whether Calendly sends 1-1 invites in practice.
- Whether user-service mails the hire on account registration (ai-hr-be `hire_module.go:109`).
