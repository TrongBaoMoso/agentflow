# Loan Officer lead sources into MOSO (P3 inventory)

Bead `agentflow-0gwad.4` (P3 of epic `agentflow-0gwad`). Measured 04/11/2026, read-only.

This lists every way a Loan Officer lead enters MOSO (`LORecruiting`) today, so P3 can bring each one to Recruit directly.
The design for the forms already covered is `recruit-be/docs/LEAD-INTAKE.md` (D356).

## How it was measured

- **Data:**
  - Production Datastore `lender-rate`, namespace `5716104026521600`, kind `LORecruiting`, rows with `created >= 2025-11-01` (6,275 rows).
  - Only non-PII fields were pulled: flags, enums, labels.
  - Counts only. No names, emails or phones.
- **Code:** read on the origin default branches.
  - `master` for packs, moso, moso-aid, lf-homepage and recruit-be (`8fd15b831`).
  - `produciton-v2` for lo-homepage.
- **What a count means:**
  - A count is a row **created** in that month, which is the first touch.
  - packs dedupes by email, so when an existing Loan Officer registers again, packs updates the old row and nothing new is created. Those repeat registrations are **not** counted here.
  - `last_registration_at` only exists on 241 rows, from when the field shipped, so repeat registrations cannot be measured over 12 months yet.
- **How a row was classified:**
  - MOSO has no single "channel" field, so each row was given one source by the technical flags, first match wins:
    1. `added_by_referrer`;
    2. `is_from_fb_ad` or a Facebook label;
    3. an event label (`after party`, `afterparty`, `summit`, `expo`);
    4. `register_for_webinar`;
    5. the `Indeed`, `Rocket` or customer-service labels;
    6. the `referrer` foreign key;
    7. `added_by_admin`;
    8. `recruiting_type=recruiting`;
    9. otherwise, a web form with no flag.
  - This is close to `MosoRowMapper.deriveHandRaiseSource` in recruit-be. Self-reported `referred_source` is a separate axis (see the last table).

## 12-month volume by source (new rows per month)

| Source | 25-11 | 25-12 | 26-01 | 26-02 | 26-03 | 26-04 | 26-05 | 26-06 | 26-07 | 26-08 | 26-09 | 26-10 | 26-11* | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S2 Webinar sign-up form | 139 | 133 | 160 | 125 | 95 | 111 | 151 | 98 | 82 | 79 | 73 | 78 | 10 | **1,334** |
| S10 Outbound CSV import (`recruiting_type=recruiting`) | 0 | 0 | 0 | 0 | 0 | 1,162 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **1,162** |
| S9 Staff-typed / CSV, label `Indeed` | 121 | 138 | 108 | 59 | 70 | 77 | 62 | 116 | 89 | 60 | 66 | 85 | 5 | **1,056** |
| S9 Staff-typed / CSV, label `Rocket` | 38 | 49 | 43 | 57 | 43 | 17 | 32 | 27 | 30 | 37 | 31 | 59 | 3 | **466** |
| S3/S4 Refer-a-LO (`added_by_referrer`) | 91 | 58 | 29 | 22 | 23 | 42 | 64 | 27 | 25 | 35 | 27 | 15 | 0 | **458** |
| S9 Staff-typed, no channel label (`added_by_admin`) | 33 | 28 | 29 | 26 | 50 | 25 | 30 | 19 | 26 | 47 | 49 | 42 | 3 | **407** |
| S1 Register form with an LO referrer (`referrer` FK) | 43 | 36 | 47 | 45 | 37 | 16 | 12 | 15 | 6 | 29 | 49 | 56 | 0 | **391** |
| S5 Facebook lead ads | 41 | 39 | 51 | 33 | 32 | 56 | 52 | 1 | 5 | 3 | 13 | 26 | 2 | **354** |
| S1 Register / join form, no flag | 31 | 43 | 27 | 37 | 40 | 31 | 28 | 18 | 14 | 19 | 13 | 24 | 3 | **328** |
| S11 Customer-service inbound (labels `Call_in_CS`, `Live_chat`...) | 12 | 11 | 15 | 11 | 9 | 16 | 34 | 22 | 19 | 12 | 6 | 3 | 1 | **171** |
| S7 Event / after-party RSVP | 1 | 0 | 0 | 1 | 36 | 2 | 5 | 6 | 40 | 3 | 1 | 21 | 32 | **148** |
| **All** | 550 | 535 | 509 | 416 | 435 | 1,555 | 470 | 349 | 336 | 324 | 328 | 409 | 59 | **6,275** |

\* November 2026 covers 01–04/11 only.

**Notes on the volumes:**

- **S10 outbound import:** the whole 1,162 came on one day (2026-04-19), as a single file. 1,006 of those rows have an NMLS.
- **Indeed and Rocket labels:**
  - Indeed: 770 of the 1,105 Indeed-labelled rows have `added_by_admin`.
  - Rocket: 482 of 488 have `added_by_admin`.
  - So these are lists typed in or uploaded by staff, not an integration. No Indeed or Rocket integration exists in code.
- **Facebook:**
  - `is_from_fb_ad=true` is on 283 rows. The other 71 carry only a staff-added Facebook label.
  - **The flag is 0 from June to September 2026**, then it comes back with 7 in October.
  - Either the ads were paused or the webhook/cron broke. Open question Q1.
- **S3/S4 Refer-a-LO:** the 458 includes both the public Refer-a-LO page and the in-app "Invite a Loan Officer" form. Both run `SaveLORecruiterOp` and both set `added_by_referrer`.
  - `lead_origin=REFER_LO_PAGE`, which would tell them apart, has been stamped on 1 row so far, because the stamp is new.
- **S7 events:** the count is new rows only. An existing Loan Officer who RSVPs updates their old row.
  - `last_registration_event` already shows 55 rows for the Houston after-party of 03/11/2026, so the real number of RSVPs is higher.
  - The moso-aid `LOEvent` table holds the full RSVP list.
- **S6 Ally lead router:** 0 rows in 12 months (no `Ally_*` label).
- **`utm_campaign`:** only 36 rows have one.

## Source inventory

"Recruit direct" means Recruit gets the lead from the source itself, not through the MOSO push. **Every source below already reaches
Recruit indirectly**, through the packs push to `/public/v1/webhook/moso/listener`.

| # | Source | Entry point (who calls) | MOSO op / endpoint (packs, `loan/src/main/java/com/mvu/loan/`) | Fields captured | 12-month new rows | Recruit direct today? | Suggested way to Recruit |
|---|---|---|---|---|---|---|---|
| S1 | Register / Join form | lf-homepage `/register-loan-officer` (`useRegisterLoanOfficerFlow.ts`), `/recruit/<slug>`, `/join/[slug]` SessionPicker; lo-homepage `/join` | WebPlus `registerLoanOfficer` (`server/op/api/WebPlusAPI.java:2617`) → `RegisterInterestedLoanOfficer` (email dedupe, first touch wins, `last_registration_*`) | name, email, phone, NMLS, states, `referred_source`, `referred_by`, `lead_origin` (`JOIN_SLUG` / `RECRUIT_SLUG`) + slug, consent, note | 719 (328 with no flag + 391 with a referrer FK) | **Built**: intake kinds `REGISTER` / `JOIN`. Dual-post sits behind `NEXT_PUBLIC_RECRUIT_INTAKE_DUAL_POST`, staging first | Reuse `REGISTER` / `JOIN` (D356) |
| S2 | Webinar sign-up | lf-homepage + lo-homepage `/loan-officer` (WebinarFormCard, GetInTouchSection) and both `/join` pickers | WebPlus `registerWebinar` (`WebPlusAPI.java:1547`), sets `register_for_webinar`, then `RegisterInterestedLoanOfficer` | as S1 + `webinar`, `utm_campaign` | 1,334 | **Built**: `WEBINAR` / `JOIN` | Reuse `WEBINAR`; P3b own webinars |
| S3 | Refer-a-LO page | lf-homepage + lo-homepage `/refer/refer-a-loan-officer` (ambassador pages only link here) | WebPlus `submitReferALoanOfficer` (`WebPlusAPI.java:2561`) → `referral/SaveLORecruiterOp.java:55`. Forces `referred_source=outside_loan_officer`, `lead_origin=REFER_LO_PAGE`, `added_by_referrer`, `status=invited_to_join` | referred LO name, email, phone, NMLS, states; referrer name, phone, email; bonus method; `utm_campaign` | ≤458 (shared with S4) | **Built**: `REFER` | Reuse `REFER` |
| S4 | In-app "Invite a Loan Officer" (by an existing LO or a recruiter, inside MOSO) | MOSO GWT `client/view/InviteALoanOfficerForm.java:78` | RPC `referral.SaveLORecruiterOp`; `referred_source` = `loan_officer` / `recruiter` / `others` by role | as S3 | ≤458 (shared with S3) | No | Reuse `REFER` from the place LOs will use after MOSO (LO portal / tera), or a Recruit-native "invite" |
| S5 | Facebook lead ads (ILO forms) | Meta Lead Ads → MOSO webhook; 3-hourly pull cron as backup. ILO forms are kind `ILOFacebookLeadForm`, category `ilo_form` | `/exec/misc.VerifyWebHookFBOp` → `referral/SaveILOFacebookAdOp.java:239`; cron `cron/RetrieveILOFromFBAdCronJob.java:50` → `ensureILO`. Sets `is_from_fb_ad`, `referred_source=facebook`, `lo_labels+=Facebook_ads`, `last_registration_event=Facebook_ads`; skips "no NMLS" answers; existing email: flag + label only | form answers: name, email, phone, NMLS, form/page | 354 (283 flagged) | No | **New kind `FB_LEAD`**, server-to-server: Recruit subscribes to the Meta page webhook (or packs forwards the lead once), dedupe by Meta `leadgen_id`. Source `FB_ADS` already exists in `CandidateSource` |
| S6 | "Ally" lead router (Meta / Instagram / other ads per LO program) | external router, API key | `POST /api/ai/.../{ns}/createILO` (`server/op/api/AIAPI.java:1403`) → `CreateILOFromAllyPayloadOp` → `RegisterInterestedLoanOfficer`. `lo_labels=[Ally_<program>, Facebook_ads]`; an ambassador email sets `referred_by` / `referred_lo` | name, email, phone, NMLS, platform, ambassador email | **0** | No | Same new `FB_LEAD` kind with `platform` + `ambassador_email`, only if it is still wanted (Q3) |
| S7 | Event / after-party RSVP (VIP After Party, CA Mortgage Expo after-parties, LO Summit) | lf-homepage `after-party-event` RegistrationModal → moso-aid `POST /api/lo-events` (`src/routes/index.js:248`, `src/services/event.js:117`; internal LOs skipped) | WebPlus `registerLoanOfficer` with `lo_labels=[eventName]`, `referred_source*`, `referred_by` | name, email, phone, NMLS, company, `total_volume`, `total_closed_loan`, note, event name | 148 new (plus re-RSVPs of existing rows, e.g. 55 for Houston 03/11) | No (only through the push, `EVENT_RSVP` by label pattern) | **New kind `EVENT`** (`event_name`, `event_date`, company, production), posted server-side by moso-aid next to its packs call (it already holds a server key), or move the RSVP into Recruit |
| S8 | MOSO's own public pages (Apply / Register webinar) | MOSO GWT `ApplyLoanOfficerForm.java:81`, `RegisterWebinarSection.java:53` | RPC `recruiting.RegisterInterestedLoanOfficer`; with no ref the default is `events_and_job_boards` / `mortgage_trade_show` | as S1/S2 + `utm_campaign` | inside S1/S2 (no flag sets them apart) | No | Retire with MOSO, or point to the lf-homepage forms (Q4) |
| S9 | Staff typing / CSV upload of interested LOs (job posts on Indeed, Rocket lists, partner referrals, email replies) | MOSO `LORecruitingEditView.java:176`, `LORecruitingInvitationView.java:198`; "Import multiple interested loan officers" (`LORecruitingListView.java:579`) | generic `SaveOp` (`added_by_admin`, `recruiter`, `status`); `ParseFileCsvILOsOp.java:86` (one `referred_source` per file, `lo_labels`, `added_by_admin`, `added_by_label="Added by admin"`) | name, email, phone, NMLS, labels, source, recruiter | 1,929 (Indeed 1,056 + Rocket 466 + other 407) | Partly: Recruit `POST /candidates` exists, but `native-candidate-create` is OFF (D165); no generic CSV import | Turn on Recruit native create for recruiters + add an "interested LO" CSV import with channel/label per file. Not a lead-intake kind |
| S10 | Outbound sourcing CSV (`recruiting_type=recruiting`) | MOSO `RecruitedLoanOfficerImportView.java:52` | `ParseFileCsvRecruitedLoanOfficersOp.java:54` (channel, recruiter, `out_source_status`, social links) | name, contact, NMLS, company, social links | 1,162 (one file, 2026-04-19) + 5 | Yes in kind: Recruit Cold import (`/api/v1/admin/import/moso`) and Modex CSV (`/api/v1/admin/import/modex-csv`) | Use the Recruit Cold / Modex import; no intake kind |
| S11 | Customer-service inbound (call-in, live chat, email to CS) | CS staff type the row in MOSO (same views as S9), labels `Call_in_CS`, `CS`, `Live_chat`, `TalkToMe`... (about 25 spellings) | `SaveOp` (`added_by_admin`) | as S9 | 171 | No | Recruit native create with a fixed "Customer service" channel, or a CS form that posts `REGISTER` with `referred_source` set; normalise the label spellings |
| S12 | Recruit itself (recruiter invites from Recruit) | recruit-be → packs `POST /api/recruit/v1/candidate/invite` (`server/op/api/RecruitAPI.java:565`) | creates the row, `added_by_admin` + `recruiter` when the actor is a recruiter | as S9 + fee waiver | ~0 (Recruit prod has no users yet) | Recruit-originated | Becomes native create once MOSO is gone |

**Paths that update a row but never create one** (not lead sources):

- Calendly webhook `meeting/InterestedLoanOfficerCalendlyWebHookServlet.java` (appointment time).
- `registerSigningAgreement` and `saveLoanOfficerPaidStartupFee`.
- Twilio STOP / opt-out (`AutomaticallyUpdateLORecruitingOp`).
- Attendance CSV (`ParseFileCsvDurationILOOp`).
- Modex enrich (`UpdateDataUsingModexQueueOp`).
- The RecruitAPI `candidate/sync`, `registerWebinar`, `onboardingMeeting` and `agreement` endpoints.
- MOSO "approve" (`pending_approval`).

**Recruit-side direct ingestion that exists today** (recruit-be `origin/master`):

- Lead intake `POST /public/api/v1/intake/lo-lead`: kinds `REGISTER`, `WEBINAR`, `REFER`, `JOIN`. It is behind `recruit.features.lead-intake`, staging first.
- MOSO push `POST /public/v1/webhook/moso/listener`.
- MOSO import `POST /api/v1/admin/import/moso` (Cold), plus `/moso/profile-fields`.
- Modex CSV `POST /api/v1/admin/import/modex-csv`. Modex never creates a candidate while `native-candidate-create` is OFF.
- MMI push `/public/v1/integrations/mmi`.
- Manual `POST /api/v1/candidates`, OFF by flag.

**Searched for and not found:**

- No Zapier, Typeform, Gravity Forms, LinkedIn or Indeed integration writes `LORecruiting`.
- `ZapierSettings` exists, but it is for borrower leads.
- `linkedin` and `indeed` exist only as a self-reported `referred_source` or a staff label.
- lf-homepage `careers` (`submitJob`), `lo-recruiter-program` and `ambassador-program` do not create recruits.
- Nothing in tera-be, omni-service, callcenter, zoom-go, loan-factory-career-portal or loanfactory-mobile-app writes `LORecruiting`.
- Kind `TradeShowAttendee` (364 rows in 12 months, `RegisterTradeShowOp`) is LF staff registering for trade shows, not a recruiting lead. It is only read to filter Loan Officers by show.
- Kind `FacebookLead` is a per-user Facebook configuration for borrower leads, not Loan Officer leads.

## Self-reported "how did you hear about us" (`referred_source`, same 6,275 rows)

| Value | Rows | Value | Rows |
|---|---|---|---|
| (empty) | 1,246 | `partner_referral` | 290 |
| `job_posting` | 820 | `webinar` | 251 |
| `loan_officer` | 816 | `other` / `others` | 266 |
| `google` | 469 | `recruiter` | 146 |
| `indeed` | 423 | `mortgage_trade_show` | 122 |
| `email` | 406 | `linkedin` | 79 |
| `social_media` | 406 | `outside_loan_officer` | 73 |
| `facebook` | 386 | `returning_lo`, `instagram`, `friend_family`, `ai_chatbot`, `youtube`, `newsletter`, `postcard`, `mmi` | 31, 12, 12, 12, 4, 3, 1, 1 |

## Suggested order for P3

1. **S1–S3** (2,511 rows a year, 40%): already built. Finish the staging reconcile, then prod (Bao).
2. **S9 + S11** (2,100 rows, staff-entered): the biggest source not on a form. Turn on Recruit native create and add an "interested LO" CSV import. Recruiters then stop typing into MOSO.
3. **S5 Facebook** (354 rows): new `FB_LEAD` kind, server-to-server. Check first why the flag stopped from June to September.
4. **S7 events** (148+ rows, spiky: 36 in March, 40 in July, 53 in Oct–Nov): new `EVENT` kind posted by moso-aid. It must also record re-RSVPs of existing candidates, because those are most of the RSVPs.
5. **S4** (in-app invite): follows where LOs work after MOSO.
6. **S6 / S8 / S10 / S12**: retire, or they are already covered by Recruit imports.

## Open questions

- **Q1.** Facebook ILO leads: `is_from_fb_ad` was 0 from June to September 2026. Were the ads paused, or did the webhook or token break? Who owns the Meta page and app, and can Recruit get its own page subscription?
- **Q2.** Indeed and Rocket lists (1,522 rows): who uploads them (recruiters? CS?), from what export, and how often? Should Recruit take an Indeed export file directly?
- **Q3.** The Ally lead router `createILO` has created 0 rows in 12 months. Retire it, or is a launch planned?
- **Q4.** Are MOSO's own public Apply / Register-webinar pages still linked anywhere? (Rows from them cannot be told apart from the lf-homepage forms.)
- **Q5.** Events: should the RSVP move into Recruit completely (Recruit owns the event list), or should moso-aid keep `LOEvent` and dual-post?
- **Q6.** The April 2026 outbound file (1,162 rows): was it a one-off? Are those rows already in the Recruit Cold import (`agentflow-kzwcg`)?
- **Q7.** Customer-service intake: is there a CS tool (call center / chat) that should post a lead itself instead of staff typing it?
