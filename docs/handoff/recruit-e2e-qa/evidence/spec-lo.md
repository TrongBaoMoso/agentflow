# Spec: the loan officer side and external systems on STAGING, as of 2026-10-06 (~11:30 +07)

Read-only analysis. All repos were fetched today and read from origin refs:
- recruit-be origin/staging = origin/master = 8b958c02 (#568)
- recruit-fe origin/staging = origin/master = 1fc5521b (#373)
- lf-homepage origin/master = b4b69b51
- packs origin/master tip a073a2b2b18, plus #3629 2aea6d42 merged at 04:29Z
- ai-hr-be / ai-hr-fe: origin/staging = origin/master (8b1a11ed / 16491d1b)

Anything marked **UNCONFIRMED** was not measured.

---

## 0. Blockers to know before an end-to-end run today

1. **P0 agentflow-zo816: resuming with `?key=` is BROKEN on staging right now.**
   - Probe at 04:29:53Z: `execute/GetOp` with a fake LORecruiting key returned **400** "Kind LORecruiting is not available through this endpoint". The Branch control returned 204.
   - The fix has 2 halves, and neither serves staging yet:
     - packs **#3629** (new anonymous `getRegisterLoanOfficer?key=`) MERGED to master at 04:29:43Z (2aea6d42), but it is not deployed: the new endpoint returns **404** on staging.
     - lf-homepage **#2621** (moves `getRegisterLOProcessInfo` to the new endpoint, head c3e1e283) is still **OPEN**.
   - lo-homepage's register page calls the same GetOp (`src/apis/loanfactoryApi.ts:787`). I found no lo-homepage switch PR (UNCONFIRMED).
   - **Impact:** any flow that reopens the loan officer's link fails, as do the `pre_onboarding_done` e-mail link and returning to Pay/Sign after the 1-1. A first-time registration with no key still works.
   - **Wait for all three:**
     1. packs install/deploy, after which the 404 becomes 400 "Registration not found";
     2. #2621 merged plus its staging Cloud Build;
     3. a re-probe.
2. **Staging e-mail delivery is unreliable.**
   - omni-service **issue #349** (it is an issue, not a PR): the staging SendGrid subuser has no IPs. Still broken on 03/10. The fix is account-side (assign the production shared IP) and no code PR exists.
   - Staging MOSO's company e-mail is `@test.com`, so `BaseEmailService.isTestEmail` writes an EmailHistory row and sends nothing for some MOSO mails (the A25 cause, see section 5).
   - Mail that DID arrive recently came through mg.viet18.com: the reminder (02/10) and the Calendar "Updated invitation" (05/10).
3. **packs GAE staging:**
   - default = `b` 100% (built 2026-10-06T03:29:30Z), `a` (05/10 03:45Z) idle as rollback.
   - #3627 (90vkj/gglqk) and #3628 (website fields) merged before `b` was built and are **very likely live**. The exact commit in `b` is UNCONFIRMED; NIGHT-PLAN notes that a SWAT "Rerun install" had rebuilt an old commit bbe3599 into `b`, so check which build is current.
   - #3629 (zo816) is NOT live.

---

## 1. Loan officer registration

### 1.1 www.viet18.com/register-loan-officer (lf-homepage master b4b69b51)

Steps are in `src/shared/utils/registerLoanOfficerSteps.ts`:
- "Before You Begin" acknowledgment
- Basic info
- Pay fee (skipped when `waive_startup_fee`)
- Review and Sign agreement
- Grant NMLS access

**Basic info**
- Fields: name, optional legal name, email, phone, citizenship, home and mailing address, NMLS, licensed and sponsor states, Loan Officer type (W-2 Outside / 1099 etc.), compensation, social links, "Are you referred…", and the confirm tick.
- **New: website disclosure** (lf-homepage **#2618**, merged 682bdaf7 at 04:19Z; packs **#3628** 076f5e9d), `BasicInfoForm/MortgageWebsiteDisclosure.tsx`:
  - a required Yes/No, "Do you currently have a website or landing page that promotes mortgages?" (Social media profiles are listed separately below);
  - on Yes, at least 1 https URL;
  - a required checkbox: "I agree to obtain Loan Factory's approval before creating any new website…". The server stamps the ack time once.
- **New: later-step gate** (`LaterStepWebsiteGate.tsx`; `registerLoanOfficerMortgageWebsite.ts:91`):
  - A loan officer who passed Basic info before the question existed gets the card "One more question before you continue" at the top of Pay/Sign/NMLS, with "Save and continue".
  - Until it is answered, those steps are hidden and the stepper is disabled.
  - The gate re-reads data via `getRegisterLOProcessInfo`, so it is **also blocked by zo816** on resume.
- **#2619 copy fixes** (b8fee266):
  - "Returning Loan Officer";
  - the sponsorship warning wording;
  - locked-fee copy: **"You're done for now. We will call you soon. After the call, we will give you access to the following steps."**
  - The old test plan (docs/qa, A1) still quotes the previous wording.

### 1.2 /register-loan-officer-v1 (lf-homepage #2620, b4b69b51)

- Same view (`variant="v1"`), same backend and `?key`, noindex, linked from nowhere until Bao approves a switch.
- Basic info is split into 4 parts: Personal information → License & states → Compensation & online presence (disclosure here) → Referral & confirm. It saves once after part 4; save-per-part is deferred to agentflow-uii15.
- Mailing "same as home" is pre-checked for new applicants.
- SC/AR/NE Confirm is required only when a **sponsor** state is AR/NE/SC; Cancel removes those states.
- CA DRE number is asked only when CA is sponsored.
- Status: bead agentflow-tdqcv is IN_PROGRESS, due Fri 09/10. moso#1756 (admin display of the new fields) is deferred, so the answers are not visible in the MOSO admin LO Recruiting view yet.

### 1.3 lo-homepage /<lo-slug>/register-loan-officer (e.g. /1099v1testcase/register-loan-officer)

- A **separate copy** of the form (`lo-homepage/src/app/[locale]/(public)/register-loan-officer/`) on origin/master bfb858c6, not a link to lf-homepage.
- It has **NO website disclosure and NO later-step gate**, and still shows the OLD locked-fee copy ("…we will email you a link to pay the {amount} fee and sign").
- It is hit by zo816 as well.

### 1.4 Pay and Review & Sign, before and after the 1-1

`DEFER_STARTUP_FEE_UNTIL_APPROVED = true` (`src/shared/constants/registerLoanOfficer.ts:12`). "Approved" means `onboarding_meeting_status ∈ {pre_onboarding_done, setup_done}` (`registerLoanOfficerStartupFee.ts:43`). The onboarding specialist sets it by clicking Done in recruit, through packs `RecruitAPI.onboardingMeeting`.

| State | Pay step | Review and Sign |
|---|---|---|
| Before the 1-1 | No PayPal button; shows "You're done for now…" | "You can sign after your call with us…". The link is never rendered |
| After the 1-1, unpaid | PayPal button, $100 `ilo_startup_fee` | "Please pay the startup fee first" plus Go to payment |
| After the 1-1, paid or waived | — | "Click to sign document" opens `url_signing_sessions` in a new tab |
| Paid but meeting no longer approved | — | `sign_locked_awaiting_meeting` |

Legacy note: about 173 production loan officers paid before their 1-1 under the old flow (memory `project_lo_paid_before_1on1_legacy_rows`).

### 1.5 Signing: Inkless vs in-page

- Controlled by the MOSO global setting `DisclosureSetting.use_inkless`, changed only in viet18 MOSO admin at `/settings/inkless-esign-settings`. A raw Datastore write does not stick (memcache).
  - `true`: an Inkless envelope is created; completion arrives by webhook/poll and sets `lo_agreement_signed`.
  - `false`: MOSO in-page signing ("CLICK HERE TO SIGN" tabs, about 5 documents). Recruit's "Send agreement" answers `AGREEMENT_UNSUPPORTED`.
- **Staging value = false**, last read 30/09 14:43Z/14:59Z (`.worktrees/_designs/onb-e2e-qa-log.md:208`). No flip recorded since; today's value is UNCONFIRMED.
- It is kept false because staging uses the **PRODUCTION Inkless credential**, so a staging envelope would be billed (agentflow-a7d35).
- Expect in-page signing on staging.

### 1.6 PayPal sandbox

- The Pay step uses the PayPal button. packs verifies the order and sets `paid_startup_fee`; recruit shows PAID within about 1 minute.
- Guest-checkout card tips (memory `reference_recruit_stranger_to_employee_e2e.md`):
  - the usual test cards (4111…, 4012888888881881, 4032039317984658, 5555…) are refused;
  - a Luhn-valid number with prefix **403203** plus 9 digits works, with exp 12/30 and CVV 123;
  - the cardholder name must be letters only.
- The sandbox client id is UNCONFIRMED.

---

## 2. Onboarding v2 hand-off (staging ON) and the external touches

### 2.1 Flags in recruit-be `helm-chart/config/staging/values.yaml` (origin/staging 8b958c02)

| Env | Staging | Production |
|---|---|---|
| RECRUIT_FEATURES_PACKS_WRITEBACK / ONBOARDING_WRITEBACK | true | writeback off |
| **RECRUIT_FEATURES_ONBOARDING_V2_HANDOFF** | **true** (#561 fd3201ec, 05/10 23:17 +07; guard test #563) | dark |
| ONBOARDING_HIRE_CLASSIFICATION (W-2/1099 at Done, jltr4) | true | dark |
| ONBOARDING_LEGAL_NAME | true | dark |
| AGREEMENT_SEND (44qoq) | true | dark |
| RECRUIT_AGREEMENT_SEND_ALLOWED_EMAILS | `bao.trinh+onb-welcome1`, `+onb-welcome2`, `+agree1`, `+agree2`, `+agree3` @loanfactory.com | n/a |
| ONBOARDING_REMINDERS (3dci6) | true | absent (dark) |
| GOOGLE_CONNECT / GOOGLE_CALENDAR_EVENTS (f5ycp) | true / true | off |
| RECRUIT_CALENDAR_GUEST_POLICY | ALLOWLIST | ANY |
| **RECRUIT_CALENDAR_GUEST_ALLOWLIST** | **`bao.trinh+a3009f@loanfactory.com` only** | n/a |
| RECRUIT_CALENDAR_INTERNAL_DOMAINS (colleagues bypass the allowlist) | loanfactory.com, viet18.com | loanfactory.com |
| RECRUIT_API_FALLBACK_ACTOR_EMAIL | manhadmin@viet18.com, so every staging packs mail signs as "Manh Admin" | blank |
| RECRUIT_FEATURES_HR_HANDOFF_PUBLISH | true | n/a |
| RECRUIT_FEATURES_MEET_ATTENDANCE (#564) | OFF | n/a |

### 2.2 What the loan officer receives after an offer is approved (D207, recruit-be #554 8eeb6c38; packs #3615 83dc9214 + #3627)

- **If the candidate has a recruit onboarding specialist (OB):**
  - **No invite e-mail to the loan officer.** packs gets `send_invite:false`; `invite_email_state = HANDED_OFF`; the offer goes to SENT and the candidate to S5 (unchanged).
  - The OB gets the bell `ONBOARDING_ASSIGNED`: a fresh pick, or the per-offer `announceHandoff` for an existing OB.
  - The OB contacts the loan officer and books the 1-1. The loan officer's only touch before the call is the Google Calendar/Meet invite. **On staging that invite reaches only `bao.trinh+a3009f`**; any other loan officer address gets no invite.
  - The sidebar shows "My hand-offs" instead of "My invites" (FE reads `config/candidate-view.onboarding_v2_handoff`).
- **If the candidate has no OB (fail-safe):** the old invite e-mail (MOSO template `interested_loan_officer_invitation_email`, which still sells the webinar) goes out.
  - It can fail when the requesting recruiter's MOSO Admin has no branch (aen3f). Use manhadmin or a recruiter with a branch.
- **Withdrawn hand-off:** if the OB is cleared, MOSO refuses, or the hand-off dead-letters, the bell `INVITE_HANDOFF_WITHDRAWN` fires (`HANDOFF_NO_SPECIALIST` / `FELL_BACK_TO_EMAIL` / `NOT_DELIVERED`), and the invite becomes resendable as an e-mail.
- **After the OB clicks Done** (with the W-2/1099 pick):
  - packs sets `pre_onboarding_done` and sends the EXISTING MOSO template `pre_onboarding_done` ("Loan Factory Onboarding: Complete These Initial Steps") with the `/apply_loan_officer?key=` link. lf-homepage #2609 deep-links to the first unfinished step.
  - With `agreement_flow: RECRUIT_V2`, packs builds the agreement at the first profile submit, not at Done (#3615/#3627).
  - The e-mail link needs `?key=` resume, so it is **broken until zo816 ships**.
- **Known open risks Bao accepted:** agentflow-90vkj (Inkless regenerate cooldown) and agentflow-gglqk (keyless dedupe submit gets no envelope). Their fix is #3627, likely live (see 0.3).
- **A website arrival with the same e-mail and no key** may still queue the `webinar_registration` mail (bead edge case; guard not built).

### 2.3 Reminders before the 1-1 (agentflow-3dci6, D198; be #526 + #551, packs #3603 3be07e86)

- Sent at T-2d, T-1d and T-2h before the 1-1 start. Only 1-1s booked after V204 qualify, and an offset already past at booking time is skipped.
- E-mail only, no SMS. The time is in the business zone with PDT/PST, and the mail includes the Meet link.
- Templates `tpl-onb-1on1-reminder-2d|1d|2h` (TEAM templates, editable). Sent by packs `meetingReminder` from the OB.
- **Staging runtime state** (set 02/10, `.worktrees/_designs/NIGHT-PLAN-2026-10-02.md:116,189`):
  - `recruit_settings onboarding.reminder.delivery_mode = "SEND"` and `allowed_emails = ["bao.trinh+a3009f@loanfactory.com"]`. The values comment still says DRY_RUN/empty; the DB row overrides it.
  - The tick key exists in recruit-svc-secret.
  - LIVE PASS 02/10: the T-2h mail reached a3009f via mg.viet18.com; the negative control a3009m was refused with `RECIPIENT_NOT_ALLOWED`.
- **Any other loan officer address gets no reminder** (ledger SKIPPED). The Confirm/Reschedule link (phase 2) and SMS are not built.

### 2.4 Google Calendar/Meet invite (agentflow-f5ycp, D206/D208/D211/D213/D214)

- Live on staging:
  - Connect Google (be #552, fe #342/#362)
  - OB 1-1 event plus Meet as the connected OB (be #555/#556, fe #369/#371)
  - colleague picker (be #560, fe #378; Bao LIVE PASS 06/10)
  - the recruiter's Call result "Meet 1-1" via the API (be #566/#567/#568 meet_minutes, fe #382/#383; deployed 06/10 ~10:00 +07, **awaiting Bao's retest**)
- **Loan officer guest allowlist = exactly `bao.trinh+a3009f@loanfactory.com`.**
- Colleagues on loanfactory.com/viet18.com bypass the allowlist.
- Organiser constraint: the id_token e-mail must equal the recruit SSO e-mail, so only **bao.trinh@loanfactory.com** (RECRUITER + ONBOARDING on staging) can be the connected organiser; `+tag` logins cannot connect.
- Not built or off:
  - attendance auto-propose (flag OFF; needs Khai: Meet API + scope);
  - recovery for PENDING events (a6pq1);
  - lvm39 and jxab3 open.
- The HR app's own "Connect Google Calendar" fails on staging (HR-side bug, not reported).

### 2.5 Sending the agreement from Recruit (agentflow-44qoq, P1 OPEN)

- All code merged and live on staging:
  - packs #3579/#3588/#3592/#3593
  - recruit-be #467/#490/#499/#502/#504
  - recruit-fe #259/#286/#295/#297
- Staging E2E 7/7 PASS (30/09).
- Permission AGREEMENT_SEND = ONBOARDING + ADMIN. The sender is the candidate's OB. It refuses once anything is signed.
- **Allowlist:** `bao.trinh+onb-welcome1`, `+onb-welcome2`, `+agree1`, `+agree2`, `+agree3` @loanfactory.com.
- With `use_inkless=false` (staging), Send answers `AGREEMENT_UNSUPPORTED`, so the real LINK_AGAIN/UPDATED_AGREEMENT mails are untested.
- Production gate: jq8se. Follow-ups: 393k1, axgnr, hzwiq, m2k1f, bxmri, ckree, 4izsc, x8jxa, 74p9s.
- Do not use a specialist with no branch as the actor.

---

## 3. HR app side (ai-hr-be / ai-hr-fe)

- **Staging now deploys from `origin/staging`, not `dev`** (ai-hr-be #894 added cd-staging, #929 retired `dev`; namespace `hr-dev`). The memory note saying "HR staging = dev" is outdated.
- **Recruit "Send to HR":**
  - recruit-fe `SendToHr` calls `POST /api/v1/candidates/{id}/hr-handoff` (recruit-be HrHandoffController).
  - Outbox then `POST /internal/v1/recruit/hires` (ai-hr-be `internal/api/recruitintake.go:16`), which creates an employee **draft** (source=recruit).
  - The button needs S6 (Joined). The 0h41a transition fix is on staging (be #485/#491/#497).
- **HR "Create associate"** (ai-hr-be #958 3374c7f4, 05/10, on staging):
  - reuses a picked account or registers one in user-service, then deletes the draft;
  - a `packs_push` row runs packs `register.InviteAdminsOp` (`packsPushEnabled: true`).
- **Welcome / "Activate Your Account" e-mail:**
  - It is sent by **packs/MOSO**, not HR: event "Member Created", template `invite_member_succeeded`, subject "Welcome to ${company.name}, ${root.full_name}! Let's Get Started!". The activation link appears only when a token exists.
  - On staging MOSO the company e-mail is `@test.com`, so it is **recorded in MOSO Email History but never sent** (agentflow-zq861.7, closed 01/10).
  - On staging, check MOSO Email History, not the inbox.
  - UNCONFIRMED: since #958 registers the user-service account first, `InviteAdminsOp` may treat the person as existing, which would mean no token and no "Activate" link.
- **HR's own mails on staging** are redirected to `hung.cao@loanfactory.com` with a "[to x]" subject prefix (`notifierRedirectTo`, #933).
- **HR → recruit (live since 30/09):**
  - topic `HR_ASSOCIATE_ONBOARD`, subscription `HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_STAGING`;
  - the recruit-be `hronboard` handler sets the candidate's `account_id` plus a SYSTEM activity (about 7 s);
  - backfill: `POST /api/v1/admin/hr-onboard/reconcile`.
  - HR publishes **no** HR-completed or Licensing-completed milestone, so **S7 stays manual** (ks99).

---

## 4. Bead and bug status today

| Bead | Status | Where / note | On staging? |
|---|---|---|---|
| aen3f (invite fails: recruiter's MOSO Admin has no branch) | OPEN, mitigated | packs #3587 0ba45e30 (`email_queued:false`, not a 500); be #498 + fe #293 ("email not sent" + resend). Still open: `UpdateMemberOp.java:127` cannot give a branchless Admin a branch. Production packs not hotfixed | Yes (mitigation). **Workaround:** request as a recruiter with a branch (manhadmin) |
| ks99 (HR → recruit milestones, S7) | OPEN, P1 | Blocked on HR publishing milestones (owner Hưng); only `associate.onboarded` exists | S7 manual |
| qn3cx (HR-created Admin not linked to LORecruiting; hr_status stays not_initiated) | DEFERRED (Bao 29/09) | Recruit gets "account created" from HR instead | n/a |
| rvzx (removed candidate messages unreadable) | OPEN; code fixed | omni #357 5d1a1ba6 (`REMOVED_READERS_LO_CANDIDATE`); an admin off the cast needs itb7 (deferred) | Yes |
| mtwd (bounced SMS shown "Sent") | IN_PROGRESS but effectively fixed | tera-fe #593 / omni-react #90, in 0.4.18 (pinned by recruit-fe). Failure reason needs omni `dispatch_error` | Yes |
| wapn (bad numbers retried 8x) | OPEN, mostly fixed | omni #287 23ac2397, be #322 normalisation, 0.4.18 display | Yes |
| 144v (inbound SMS from an unknown number stuck in triage) | OPEN | omni `loCandidateStaffGrant` is empty; needs an owner decision | Not fixed |
| jblm (internal line-to-line SMS events lost, zoom-go) | OPEN | No PR found (UNCONFIRMED). Affects two-way tests on staging. **Don't test SMS between two internal lines** | Not fixed |
| 2jrpw (signing page always says 1099) | CLOSED | lf-homepage #2586 0d5980d2; also on lf production; lo-homepage #853/#854 | Yes (+ production) |
| 0h41a (no way to move a claimed candidate to S6) | CLOSED | be #485 bbc1a565, #491 6a8949df, #497 4a8170b4 (auto-stage SENT → S5, SIGNED+PAID → S6) | Yes; not production |
| omni #349 (an issue, not a PR) | OPEN | Staging SendGrid subuser has no IPs, so staging omni e-mail is deferred. Fix = account-side IP assignment | Not fixed |
| rvqv (deferred-fee gate never opens for recruit-invited loan officers) | OPEN, likely superseded | packs `onboardingMeeting` now sets `pre_onboarding_done`, the gate lf reads. The bead was not updated (UNCONFIRMED) | Probably works |
| tfei (P0: count of people contacted despite MOSO opt-out) | OPEN, not started | No measurement found | — |
| zo816 (P0, `?key` resume) | OPEN | packs #3629 merged 04:29Z, NOT deployed; lf #2621 OPEN; lo-homepage no PR | **BROKEN** |
| 5t57m / gbto (production only: follow-ups dead) | OPEN, deferred (Bao 02/10) | recruit-be production has `RECRUIT_FOLLOWUP_SERVER_ENABLED=false`; followup-be never deployed to production | Staging OK; production broken |
| 44qoq (send agreement from recruit) | OPEN P1, code live | See 2.5 | Yes (allowlist) |
| jltr4 (W-2/1099 at the 1-1) | OPEN; feature live on staging | be #458/#459, fe #250/#251, packs #3576/#3577; production packs 3.63.1 lacks it | Yes |

---

## 5. The 30/09 tester FAILs

- **A18** (QA Aone a597f885…, chose Independent 1099, paid and signed, recruit not updated): **explained and fixed.**
  - Cause: a packs bug. After the W-2 → 1099 switch, a stale unsigned W-2 signing session stopped packs from setting `lo_agreement_signed`. Recruit reads that field whatever the type (`MosoRowMapper.java:728`).
  - Fix: packs **#3596** 6d83a1f3965 (agentflow-zq861.5, closed): drops the stale session, completes on the required documents only, and adds admin `RecheckLOAgreementCompletionOp`. Also packs **#3602** 0b13e478d5: the public form can no longer overwrite the W-2/1099 choice (0vfb3).
  - Deployed to staging 02/10; QA Aone was repaired by hand.
  - **Not re-run live** (W-2 → 1099 → sign). The "Signing Complete" mail claim is UNCONFIRMED. A look-alike is agentflow-393k1 (a manual Signed shows Done when MOSO says unsigned).
- **A20** (QA Anew 38ac135a…, no Licensing item in Department work): **expected behaviour.**
  - recruit-fe **#309** aa52d0cc (merged 01/10, on staging and production) keeps only ONBOARDING and ACCOUNTING in the Department work queues; HR and Licensing are read-only in the drawer.
  - Bead zq861.3 (closed) says to update test step A20. The Licensing S7 signal is meant to come from HR (ks99).
- **A25** (no Welcome / "Activate Your Account" e-mail): **explained and closed, not a code bug** (zq861.7). See section 3: staging MOSO `@test.com` means the mail is recorded but not sent. Check MOSO Email History.
- **A7 comments** (Exceptions badge count, offers card contrast, redundant text, Waiting always 0m): all fixed by recruit-fe **#310** 12c74962 (zq861.6). The 0m happened because `waiting_hours` was floored; the page now counts from `requested_at`. Follow-ups, all on staging:
  - be #512 + fe #314: approvals on Today;
  - be #519 + fe #331: badge counts endpoint (vygjl).
- **A8S** ("candidate still on /today after S5"): fixed by recruit-be **#512** 84c2026f (`WaitingOnLoPolicy`, V181) + recruit-fe **#314** / **#330** cfff5de1 (zq861.4).
  - S5 candidates now live in "My invites" / "My hand-offs".
  - They return to Today only after the 1-1 with a reason (partly done after 2 days, stalled after 7).
  - On staging.

---

## 6. Test data hygiene: loan officer e-mail tags already used on staging

Found in docs/qa, docs/handoff, `.worktrees/_designs/*` and beads. The private accounts file was not read, so more may exist.

- **Staff / role logins** (don't reuse as loan officers):
  - `bao.trinh+recruiter`, `+manager`, `+onb-test` (OB), `+hh` (Headhunter), `+tag`
  - Bao's real `bao.trinh@loanfactory.com` (RECRUITER + ONBOARDING)
  - manhadmin@viet18.com (stays RECRUITER; staging packs fallback actor)
- **Allowlisted loan officer addresses** (the only ones that receive the respective mail):
  - `+a3009f`: Calendar guest and reminders. Currently candidate 73fd9c9c "QA Anewe" with an event on 06/10, 3 PM VN.
  - `+onb-welcome1`, `+onb-welcome2`, `+agree1`, `+agree2`, `+agree3`: agreement send.
- **Loan officer tags already used:**
  - `a0930`, `a0930b`, `a3009`, `a3009b`, `a3009c`, `a3009d`, `a3009e`, `a3009f`, `a3009l` (QA AnewL 5338d33d, owner bao.trinh@, OB onb-test), `a3009o`, `a3009m` (negative control)
  - `alan20930`
  - `b10930`, `b20930`, `b30930`, `b40930`, `b4w0930`, `b50930`, `b60930`, `b90930`, `b100930`, `b110930`
  - `c10930`, `c20930`, `c30930`, `c40930`, `c1099a`
  - `d10930`–`d40930`, `e2e0930`, `e30930`, `e40930`
  - `f10930`–`f50930`, `f90930`
  - `h110930`, `h20930`, `h30930`, `h40930`
  - `hhlead1`, `hhlead2`, `hhlead4`, `hhlead5`, `hotbadge0210`
  - `i0930`, `j0930`, `join0930a`, `join0930b`, `k0930`, `l0930`, `p0930`
  - `lo1`, `extlo`, `x`, and the `tdqcv-<timestamp>` probe family
- **Suggested convention** (from docs/qa/recruit-lo-to-employee-test-plan-vi.md:33):
  - use `<you>+e2e1006<case>@loanfactory.com` (date 1006 is unused) and a fresh random 7-digit NMLS (`99` + 5 digits);
  - if the run needs the Calendar invite or reminders to arrive, use the allowlisted `+a3009f` (or ask to add a new exact alias to the allowlist / `onboarding.reminder.allowed_emails` first).

---

## 7. Recommended order for today's end-to-end run

1. Wait for zo816: packs #3629 deployed (`getRegisterLoanOfficer` returns 400 "Registration not found" instead of 404) and lf #2621 merged and deployed. Without it, any return to the loan officer's link fails.
2. Use lf-homepage `/register-loan-officer` (not lo-homepage, which lacks the disclosure). Answer the website question.
3. In recruit, make sure the candidate has an OB, which makes it a hand-off with no e-mail to the loan officer. To exercise the old e-mail path, use a candidate with no OB and a recruiter with a branch.
4. OB books the 1-1 as bao.trinh@ (Google-connected). Only `+a3009f` receives the invite and reminders.
5. Done (W-2/1099). The loan officer gets `pre_onboarding_done` (delivery may be unreliable, see 0.2). Then Pay (PayPal sandbox, 403203… card) → in-page sign (`use_inkless=false`) → recruit SIGNED+PAID → S6 automatically.
6. Send to HR → HR creates the associate → check **MOSO Email History** for `invite_member_succeeded` → recruit `account_id` link via Pub/Sub. S7 is manual.
