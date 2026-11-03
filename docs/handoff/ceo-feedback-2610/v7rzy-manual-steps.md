# LO Recruiting: every manual step, and the switch that would automate it (bead agentflow-v7rzy)

Measured 03/11/2026 (read-only). CEO bar (Terra Plus 26/10, CEO-FEEDBACK row #10): 80–90% of all work automated by year end.

## Sources and how each value was measured

- **Code:** `recruit-be` origin/master `4c31d905` (= origin/staging); origin/production `a359aff0`. `recruit-fe` origin/master `d5aba8f5`.
- **Env flags:** `helm-chart/config/staging/values.yaml` (master) and `helm-chart/config/production/values.yaml` on **origin/production** (what prod runs). On prod a flag that is "absent" falls back to the `application.yml` default, which is `false` for every flag below except `moso-signed-reconcile` and `moso-record-required` (`true`).
- **DB settings and counts:** `rro.sh stg|prod` against `recruit_db`. Every query ran in a `READ ONLY` transaction. Counts cover the last 30 days.
- **Caveats:** prod has **no real Recruit users yet** (Bao, 03/11). Prod rows come from the MOSO mirror (`super.admin@loanfactory.com` wrote 5,639 of 5,652 activities). So prod counts show no usage, not "nobody needs this step". Staging counts are test data (Bao and QA). They show which buttons were pressed, not real volume.
- **Not measured:** follow-ups (these live in followup-be, which I did not query), MOSO/packs-side sends, and the Omni side.

Legend: **ON / OFF** = measured value. **absent** = not in prod helm values, so the code default applies (OFF).

---

## 1. Lead in

| # | Step (who, example) | Automation that exists (flag / setting, D#) | Staging | Prod | Missing to automate | Effort |
|---|---|---|---|---|---|---|
| L1 | Create the lead record when a Loan Officer fills a web form, registers for a webinar or is referred (system) | Today MOSO creates it and Recruit mirrors it. Recruit's own intake: `RECRUIT_FEATURES_LEAD_INTAKE` (D356) | intake **ON** (helm) | intake **absent**. MOSO mirror is live: 30d new rows were WEB_FORM 207, REFERRAL 105, WEBINAR 103, EVENT_RSVP 36, FB_ADS 9 (measured, `candidates.source`) | Already automatic. Turning on Recruit's own intake is part of the MOSO decouple, not removing a manual step | S |
| L2 | Merge duplicate leads (manager/recruiter presses Merge on the Duplicates page) | None, by design: **D60** "detect + a person merges, never auto-merge" | 2 merges in 30d (SYSTEM activity "merge") | 1 | A product decision to auto-merge exact matches (same e-mail plus same NMLS), then the code | M |
| L3 | Claim a HOT lead (a recruiter presses **Claim** on Hot leads after the ping) | **D338** HOT auto-assign: `hot.auto_assign_enabled`, `hot.auto_assign_pool`, after `hot.auto_assign_after_business_minutes`=15 | `enabled=false`, `pool=[]`. Ledger 30d: **CLAIM 194** (manual) vs **AUTO_CLAIM 3** | `enabled=false`, `pool=[]`. CLAIM 2 | Fill the pool, set enabled=true (decision: Bao / Victoria, bead agentflow-4r8je) | S |
| L4 | Take back a lead the recruiter claimed but never contacted (manager presses **Take back** / Transfer) | **D125/D131/D134/D148** hot idle release: `hot.idle_release_enabled` (4 business hours) | `false` now. IDLE_RELEASE 40 in 30d (the switch was on for a while). TRANSFER 53 | `false`. TRANSFER 2 | Turn it on. Prerequisite (D134): the omni outbound consumer must be live on prod | S |
| L5 | Hand the leads of an absent or departed recruiter to someone else (manager, Transfer / bulk Assign) | Partial: **D294** makes a departed owner's leads claimable. Nothing reassigns them | — | — | An "owner left → leads go back into the rotation" job (could reuse the D338 rotation) | M |
| L6 | Set the owner of MOSO rows at S5–S7 (otherwise these rows have no owner) | `RECRUIT_FEATURES_MOSO_OWNER_SYNC` (**D310/D325**); `moso_owner_sync.block_auto_sends=true` | **ON** | **absent**. Prod has 1,240 S5 + 74 S6 + 172 S7 rows with no owner (measured) | Do a dry run first (up to 1,341 rows could be re-owned, per bead 61yi6), then turn it on. Flip `block_auto_sends` at go-live | S |
| L7 | Pull Cold leads (recruiter presses **Get leads** / batch-claim) | None, by design: **D66** "hand out work, do not auto-assign" | — | — | A product decision: auto-fill each recruiter's Today up to `today.batch_claim_size` every morning | M |
| L8 | A headhunter owns the leads from their own /join page | `headhunter.auto_own_enabled` (**D197/D202**) | `false` | `false` | Turn it on. Needs rsnyo + zq861.17/.23 first (memory: prod triggers) | S |
| L9 | Manager chases leads nobody claimed (presses **Remind** on Exceptions) | **D142** Remind is manual. D338 removes most of the cause | — | — | Covered once L3 is ON | — |

## 2. Contact

| # | Step | Automation that exists | Staging | Prod | Missing | Effort |
|---|---|---|---|---|---|---|
| C1 | First call and later calls (recruiter presses **Call**) | Human work by nature. Assisted by the call workspace (`CALL_WORKSPACE` ON both) and click-to-call | 59 outbound CALL activities in 30d | 0 | Cannot be automated. The AI could prioritise who to call (CEO #3) | — |
| C2 | **Log result** after each call (recruiter picks the outcome and the next step) | None. Only a nag: `urgent_notifications.call_no_result_business_days`=1 (**D335**). The Meet 1-1 is posted to omni as a call card (**D261**) | NOTE 57 + CALL 59 typed by people | — | Auto-log "No answer" from Zoom call-finished (duration 0 / not connected). Later, an AI summary of the call that pre-fills the outcome and next step | M (no answer) / L (AI) |
| C3 | Create the next follow-up (call again, retry after no answer, nurture wake date) | Auto-armed follow-ups (**D94**), no-answer retry ladder `[3,5,10,30]`, Neutral = one long NURTURE_CALL (**D270**) behind `RECRUIT_FEATURES_NURTURE_FOLLOWUP` | **ON** | **ON** (prod helm) | Done | — |
| C4 | Close due follow-ups when the Loan Officer was contacted | **D278** any outbound contact closes them | built | built | Done | — |
| C5 | Silence cadence: messages on day 1 and day 5, recruiter reminded to call on day 7 and day 30 (**D56**) | Sequence engine: `sequence.auto_send_enabled`; `cadence.auto_send_tiers=[1,5]` | `false`. **0 sequences, 0 enrollments** (measured) | `false`, 0 / 0 | No cadence content is seeded. STATUS.md lists a go-live gate (2 HIGH + 3 MEDIUM, bead jqpu), and reply detection is not wired (package-info). The SMS steps need a TCPA quiet-hours rule | L |
| C6 | Send the info the recruiter promised, at the promised time ("Send info") | **D273** e-mail `RECRUIT_FEATURES_SCHEDULED_SEND_INFO`. **D342** SMS: `scheduled_send_info.sms_enabled` | flag **ON**, sms `false`. 30d: 5 SENT, 6 SKIPPED, 1 FAILED | flag **absent**, sms `false` | Prod e-mail checklist (bead 236t9.14: moso-notifier prod mail config, secrets, unsubscribe URL), then turn it on | M (mostly coordination) |
| C7 | Keep-in-touch e-mails to Neutral Loan Officers every 4 weeks | **D271/D272** `RECRUIT_FEATURES_NURTURE_DRIP` + `nurture.drip.enabled`, `delivery_mode`, `recipient_policy` | flag **ON**, but `nurture.drip.enabled=false`, `DRY_RUN`, `ALLOWLIST`. 6 SENT in 30d | flag **absent**, `enabled=false`, `DRY_RUN`, `ALLOWLIST` | Same checklist 236t9.14, then DRY_RUN → SEND, then a recipient-policy decision | M |
| C8 | Text the Loan Officer before a "Call again" | **D355** `RECRUIT_FEATURES_CALL_TEXT_FIRST` (t4699) | **ON**. 1 SKIPPED in 30d | **absent** (prod release 02/11 shipped with the flag off) | Bao + Khai: Zoom sender, omni #663. Turning it on means real SMS | S |
| C9 | Get the Loan Officer's e-mail reply onto the omni conversation | **D274/D276** `RECRUIT_FEATURES_OMNI_REPLY_ADDRESS` (+ `MAIL_STATUS_INTAKE` **D275** for bounces) | **ON** | **absent** | omni #608 (reply-address route) is still open, then omni prod. Without it the switch does nothing | M (other team) |
| C10 | Webinar confirmation e-mail | Today MOSO/packs sends it. Recruit's own: `RECRUIT_FEATURES_LO_MAIL_WEBINAR` (**D330**) | **ON** | **absent** (MOSO still sends) | Automatic already. Recruit sending it is part of the decouple | — |
| C11 | Webinar reminder the day before and feedback call the day after | **D253/D277** `RECRUIT_FEATURES_WEBINAR_SIGNALS` | **ON** | **ON** | Done | — |
| C12 | Create webinar sessions (someone sets them up in MOSO) | **D359** `RECRUIT_FEATURES_WEBINAR_SCHEDULE` + `webinar.schedule.enabled` | **ON** / `true` | **absent** / setting row does not exist | Ship to prod after the P3b decouple. The SMS reminder (`webinar.sms_reminder.enabled=false`) is separate | S |
| C13 | One-off e-mails and texts from the recruiter | Templates only | EMAIL 20, SMS 12 outbound in 30d | 1 / 1 | Mostly covered by C5–C8 once they are on | — |

## 3. Offer / invite

| # | Step | Automation that exists | Staging | Prod | Missing | Effort |
|---|---|---|---|---|---|---|
| O1 | Request the invite (owner presses **Send invite** / "Save & invite" after an INTERESTED call) | None. **D209**: only the owner or a manager. **D164** shows a "ready to join, invite not sent" strip | 98 REQUESTED in 30d | 0 Recruit requests (420 IMPORTED from MOSO) | Auto-request when the outcome is INTERESTED and the Loan Officer qualifies under D64 (product decision) | M |
| O2 | Approve the invite (manager presses **Approve**) | **D64/D120** rule-based auto-approve: `offer.approval_mode=RULE_BASED`, `loans_12mo_min=2`, `loans_since_min=5` | RULE_BASED. 30d approvals: **55 automatic** (no actor) vs **29 by a manager** (measured, `offer_history`) | RULE_BASED. 0 Recruit approvals | Review whether the thresholds can widen. Fewer manual approvals means a policy change by Victoria | S (setting) |
| O3 | Approve a fee waiver (manager) | `offer.waive_requires_approval=true` | true. FEE_WAIVE_REQUESTED 18 / WAIVED 6 / DECLINED 6 | true | A waiver rule (for example auto-waive above N loans) | S/M |
| O4 | Send the invite e-mail | **D120**: auto-sent on approval. Today packs/MOSO sends it. Recruit's own: `LO_MAIL_INVITE` (**D331**), `lo_mail.delivery_mode` | flag **ON**, `delivery_mode=DRY_RUN`. 1 INVITE row SENT in 30d (not checked whether that was before DRY_RUN) | flag **absent**, DRY_RUN. MOSO sends | Automatic already. Recruit sending it waits on 236t9.14 | — |
| O5 | Resend an invite that was not paid or opened (recruiter presses **Send again**) | Hint only: `offer.invite_resend_after_days=3` makes the row "resend eligible" (`InviteStatusServiceImpl`). **D176** safe Resend | — | — | An automatic resend tick on day 3 and day 7, using the LO mail path | M |
| O6 | Chase "ready to join, invite not sent" (manager **Remind**, **D177**) | Manual Remind. Escalation after `invite.ready_to_join_escalate_days=2` | — | — | Covered by O1 auto-request | — |
| O7 | Track signed and paid | **D230/D246** `moso-signed-reconcile` (code default true) | SIGNED 29, FEE_PAID 29 | SIGNED 63, FEE_PAID 62 (mirror) | Done | — |

## 4. Onboarding

| # | Step | Automation that exists | Staging | Prod | Missing | Effort |
|---|---|---|---|---|---|---|
| N1 | Pick the onboarding specialist | **D137** round robin at offer SENT (`OnboardingSpecialistAssignmentService`). **D292** holds back a specialist MOSO refused. **D354** `INVITE_WAITS_FOR_SPECIALIST` | auto. D354 flag **ON** | auto. D354 **absent** | Done (turn D354 on with the decouple) | — |
| N2 | Book the onboarding 1-1 (specialist presses **Book 1-1** / Schedule) | None for picking the time. The event itself is automatic (N3) | — | — | A self-booking link for the Loan Officer (free/busy of the round-robin specialist) | M |
| N3 | Create the Calendar invite and Meet link | **D208** `RECRUIT_FEATURES_GOOGLE_CALENDAR_EVENTS` + `GOOGLE_CONNECT` | **ON** | **ON** (since 29/10) | Each specialist must connect Google on prod. 30d staging meetings: 3 NO_MEET_SCOPE, 1 NOT_CONNECTED | S (onboarding of people) |
| N4 | E-mail reminders to the Loan Officer before the 1-1 (48h, 24h, 2h) | **D198/D329** `RECRUIT_FEATURES_ONBOARDING_REMINDERS` (+ `LO_MAIL_REMINDERS`), `onboarding.reminder.delivery_mode`, `allowed_emails` | ON / ON, `DRY_RUN`, `allowed_emails=[]`. 6 SENT, 1 SKIPPED | ON / LO_MAIL_REMINDERS **absent**, `DRY_RUN`, `[]` | Checklist 236t9.14, then DRY_RUN → SEND | S |
| N5 | Mark the 1-1 done or no-show (specialist presses **Mark done**) | **D212** `RECRUIT_FEATURES_MEET_ATTENDANCE` reads attendance and only **proposes** | ON. Outcomes: 4 PROBABLE_NO_SHOW, 1 PROPOSE_DONE, 3 NO_CONFERENCE, 3 NO_MEET_SCOPE | ON | Auto-confirm DONE when the Loan Officer attended ≥ `attendance_min_minutes` (10), and auto no-show plus reschedule ask | S |
| N6 | Write "1-1 done" back to MOSO | **D137/D207** `ONBOARDING_WRITEBACK`, `PACKS_WRITEBACK`, `ONBOARDING_V2_HANDOFF` | ON | ON | Done | — |
| N7 | Welcome e-mail with the signing link | Today MOSO sends it. Recruit's own: `LO_MAIL_WELCOME` (**D331**), `AGREEMENT_SEND` (**D159**) | ON / ON | **absent** / **absent** (MOSO sends) | Automatic already | — |
| N8 | Book the setup call (recruiter, **D307/D256** `ONB_SETUP_CALL`) | None | — | — | The same self-booking link as N2 | M (with N2) |
| N9 | Move the stage S5 → S6 → S7 | **D167/D172/D232** auto-stage + `POST_JOINED_PROGRESS` | ON | ON | Done | — |

## 5. HR / licensing / admin

| # | Step | Automation that exists | Staging | Prod | Missing | Effort |
|---|---|---|---|---|---|---|
| H1 | **Send to HR** when the Loan Officer joins (someone presses Send to HR) | **D231** `RECRUIT_FEATURES_HR_HANDOFF_AUTO_SEND` | **true**. 30d: **21 AUTO vs 3 MANUAL** (measured, `hr_handoff_outbox.send_trigger`) | **false** (explicit). 0 rows | Ask HR, then set it to true | S |
| H2 | Tick HR docs / HR to-do / Licensing on the onboarding card (specialist) | **D258** post-joined reconcile `onboarding.progress_reconcile_enabled` + HR events | reconcile **false**. 30d ticks: **MANUAL 44 vs EVENT 9** | reconcile **true** | HR events (or a user-service read) for each step, so the manual tick goes away. Turn on the staging reconcile too | M |
| H3 | Licensing and sponsorship work | Lives in the HR app (**D304/D315**). Recruit only reads it | — | — | Not a Recruit step (left out of the %) | — |
| H4 | Give or remove a person's Recruit role when HR changes them | **D320** `RECRUIT_FEATURES_HR_ROLE_SYNC` | **ON** | **absent** | Bao: central RBAC go | S |
| H5 | Mark a hired Loan Officer as left when HR offboards them | **D311** `RECRUIT_HR_OFFBOARD_ENABLED` | **ON** | **absent** | IAM sub HR offboard (Khai) | S |
| H6 | Tell the referrer how their referral is doing | `RECRUIT_FEATURES_REFERRALS_NOTIFY` (allowlist `bao.trinh+*`) | **ON** | **absent**. `referrals.enabled=false` both | rsnyo/zq861 first, then the e-mail checklist | S |
| H7 | Fill each recruiter's Zoom sender (admin) | **D358** `RECRUIT_FEATURES_ZOOM_LINK_AUTOLINK` | **ON** | **absent** (staging-only on purpose) | Owner go | S |
| H8 | LO Recruiter Program roster to roles | **D202** `program_sync.mode` | `OFF` | `DRY_RUN` | Check the dry-run log, then set it to SEND | S |

---

## 6. How much is automated

Count of the 45 steps above (H3 left out):

| | Steps automated | % |
|---|---|---|
| **Production today** (L1, C3, C4, C10, C11, O2, O4, O7, N1, N3, N6, N7, N9) | 13 / 45 | **≈29%** |
| **If every built switch were ON** (adds L3, L4, L6, L8, L9, C6, C7, C8, C9, C12, N4, H1, H4, H5, H6, H7, H8) | 30 / 45 | **≈67%** |
| Still manual with nothing built (L2, L5, L7, C1, C2, C5, C13, O1, O3, O5, O6, N2, N5, N8, H2) | 15 / 45 | 33% |

Caveats:

- This is a count of steps, not of time or volume. Three of the 13 "automatic" prod steps (C10, O4, N7) are done by MOSO, not Recruit.
- By volume on staging, ownership is still mostly manual: over 30d there were 247 manual moves (CLAIM + TRANSFER) out of 312 owner changes, which is 79%. Onboarding ticks were 83% manual. Approvals were 35% manual. Send to HR was 12% manual (with auto-send on).
- C1 (making the call) can never be automated. Even with everything above done, the ceiling without new builds is about 67%. Reaching 80–90% needs the "nothing built yet" rows below.

## 7. Top 5 next automations (value ÷ effort)

1. **Prod automatic e-mail go-live: checklist bead 236t9.14** (moso-notifier prod mail config, prod secrets, then DRY_RUN → SEND). This one piece of coordination unlocks C6, C7, N4, H6 and the LO-mail kinds. C9 also needs omni #608. Effort M, mostly other teams (Khai, Thanh).
2. **Leads route themselves: D338 HOT auto-assign + D125 idle release** (fill `hot.auto_assign_pool`, set both enabled). This removes the biggest manual volume (CLAIM was 194 of the 312 owner changes on staging) and most of the manager Remind/Take back work. Effort S, decision by Bao/Victoria.
3. **HR switches on prod**: `HR_HANDOFF_AUTO_SEND=true` (staging already proves 21 of 24 sent automatically), `HR_ROLE_SYNC`, `HR_OFFBOARD`. Then replace the manual HR docs / to-do / Licensing ticks with HR events (H2). Effort S for the switches, M for H2.
4. **Call result without typing**: auto-log "No answer" (and its retry) from Zoom call-finished, then an AI call summary that pre-fills the outcome and next step (ties into CEO #2/#3 and the D357 assistant). Today this is the step recruiters do most often by hand. Effort M, then L.
5. **Onboarding without clicks**: auto-mark the 1-1 DONE or no-show from Meet attendance (N5, small change on top of D212). Add a Loan Officer self-booking link for the 1-1 and the setup call (N2, N8). Add an automatic invite resend on day 3/7 (O5). Effort S + M + M.

Next after those: seed the silence cadence and close the sequence gate (C5, L); decide auto-request invite for qualifying INTERESTED leads (O1); decide auto-merge on exact matches (L2).
