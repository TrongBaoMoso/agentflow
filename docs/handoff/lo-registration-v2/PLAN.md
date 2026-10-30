# LO Registration v2 (Matt's wireframes) — plan

Status: PLAN ONLY, no code. Written 2026-10-28 by session 8658d500 for Bao.
Source: Matt Moghaddam, "LO Registration v2 · Dev Handoff" (27/10) + 5 wireframes, in this folder
(`handoff.pdf`, `1---Flow-and-decision-tree.png` … `5---Screen-4-Confirmation.png`). Clickable version:
claude.ai artifact `PkW4uQg5jzCbmZu3KCxxJd` (Matt's; not read yet — needs Bao's OK to open).
Phuong asked Victoria (28/10 14:22) to confirm the new form and flow before work starts.

## 1. What Matt wants (summary)

One 3-step form on one page, no entry pop-up, no "Before You Begin" page (~25 inputs → ~11):

| Step | URL (Matt) | Fields |
|---|---|---|
| 1 About you | `/join` | first*, last*, email*, mobile*, how heard* (LF Loan Officer referred me / Social / Google / Job posting / Webinar or event / Other), which LF Loan Officer referred you* (typeahead, if referral), SMS consent (unchecked) |
| 2 License details | `/join/license` | fit check* (NMLS ID; each state Active or Approved-Inactive; 1 closed loan every 6 months), NMLS ID*, sponsor states* (chips, A–Z by name), CA license type* if CA (DFPI MLO / DRE-endorsed MLO), mortgage website* Yes/No → URL(s) |
| 3 Book your call | `/join/book` | scheduler on onboarding calendars; "have a specialist call me" → callback task → confirmation |
| Confirmation | `/join/booked` | call time, specialist, mobile, Add to calendar, Reschedule, TERA video + 3 videos + YouTube link |

Step 1 Continue saves the lead and alerts a recruiter. Stalled after Step 1 for [X hours] → alert a recruiter.
Removed from the form → intro call / agreement: legal name, citizenship, addresses, not-exclusive checkbox,
W-2 vs 1099, comp targets, languages, website-approval ack, referrer phone/Zelle, final accuracy checkbox.
After the call (outside the form): $100 fee → agreement + HR details → grant NMLS access → sponsor + setup.
History API URLs per step, slide transitions, resume `/join/license` and `/join/book` for a saved lead.

## 2. What exists today (measured 28/10 on remote base branches)

- **Current form** (lf `register-loan-officer`, `-v1`, `-v2`; `/recruit/[slug]` reuses v1; lo-homepage has its own
  copy at `/<slug>/register-loan-officer`): Before You Begin gate → Basic info → Pay → Review/Sign → NMLS access.
  First save only after all of Basic info; then full reload to `?key=`. No entry pop-up modal exists.
- **Backend**: packs `registerLoanOfficer` (no key → `RegisterInterestedLoanOfficer`, reuses latest "interested" row by
  email). `LORecruiting.beforeCreated` needs only name/email/phone (NMLS format check only). Webinar sign-up and
  Refer-a-LO already create leads with just those → a Step-1-only lead works TODAY with no packs change.
  Key-only partial updates work (website gate sends `{key, website fields}`). Packs rejects unknown fields (400).
- **Push to Recruit**: every save → 60 s debounce → recruit-be webhook. Source derived from flags (D54): a typed
  referrer never makes it REFERRAL; confirmed referrer does (D265 upgrades late).
- **Field mapping**: how heard = `referred_source` (exists); sponsor states = `sponsor_states` (exists, mapped);
  CA license = `has_dre_endorsed` (DFPI=false, DRE=true — already used by the form, no packs change);
  websites = `has_mortgage_website` + `mortgage_website_urls` (exist; recruit-be maps `website` only);
  SMS consent = `is_consent_checkbox` (exists; NOT mapped in recruit-be); fit check = no field.
- **Not existing anywhere**: LO self-booking / free-busy (recruit has staff-side Google Calendar + Meet only;
  packs has a legacy Calendly webhook servlet, D151 moved away from Calendly), callback task from a public form,
  "new Hot sign-up" bell kind, stalled-after-step-1 rule, NMLS lookup/prefill (needs a new public endpoint + a data
  source whose terms allow it), safe LO name-search for a typeahead.
- **Security flag**: packs `getAdmins` is anonymous and returns ~16 MB incl. personal email/phone/permissions —
  must not be used from a public page (the current form already builds its LO list server-side from it).

## 3. Conflicts to decide (Bao)

1. **URL `/join`**: lf-homepage `/join/[slug]` = each recruiter's page; lo-homepage `/<site>/join` = each Loan
   Officer's recruiting page (live on lo master). Static `/join/license|book|booked` would shadow any recruiter whose
   slug is `license`/`book`/`booked` and mix two different pages under one path.
   **Recommendation:** keep the URL every link already uses — `/register-loan-officer` (+ `/license`, `/book`,
   `/booked` sub-paths). Ads, recruiter `/recruit/<slug>` redirects, Loan Officer sites
   (`/<site>/register-loan-officer`) and "Ready to join" buttons keep working with no link changes.
2. **"Which Loan Officer referred you?" typeahead vs the 07/09 rule** (applicants may not pick a Loan Officer;
   a typed name never earns REFERRAL credit, D54/D169).
   **Recommendation:** if the visitor came through a referral/recruiter/Loan Officer-site link, the referrer is
   locked and the question is hidden (as today). Otherwise show the typeahead, but store the pick as a *claimed*
   referrer that a recruiter confirms in Recruit (late confirmation already upgrades to REFERRAL, D265). Needs a
   safe name-search endpoint (moso-aid, public fields only) — not `getAdmins`.
3. **Scheduler**: nothing exists for a Loan Officer to book onboarding time.
   **Recommendation:** Phase 1 ships Step 3 as "We'll call you" (preferred time window + callback request that
   creates a call task in Recruit) — no external tool; Phase 3 adds real booking on the onboarding team's Google
   calendars (recruit-be already holds the Google Calendar integration). Alternative if the team already has a
   Calendly account: embed it in Phase 1 (fastest, but D151 moved away from Calendly).
4. **Fields removed from the form are still needed later** (agreement, $100 fee, NMLS access use them).
   **Recommendation:** after the intro call, onboarding sends the existing `?key=` link; it opens the remaining
   steps (details → $100 → agreement → NMLS access) pre-filled from Step 1–2. Nothing is lost; HR flow unchanged.
5. **Victoria's confirmation** of the new form/flow (Phuong asked 28/10) — wait for it before Phase 1 merges.

## 4. Phases

- **P1 — form (lf-homepage + lo-homepage)**: new 3-step UI per wireframes on `/register-loan-officer` (+ sub-paths,
  pushState, slide, slim hero, stepper, resume by key); Step 1 = first save (existing endpoint, minimal payload);
  Step 2 = key-only update; Step 3 per decision 3; confirmation page; same attribution/lead_origin behaviour as
  today (locked referral, `/recruit/<slug>`, Loan Officer sites); fix Matt's bug list (SMS unchecked, phone + last
  name required, states sorted by name, prefill sponsor states from licensed states). Port to lo-homepage. 5 locales.
  Old form kept at `/register-loan-officer-old` for comparison (same pattern as `/loan-officer-old`).
- **P2 — recruit-be**: map SMS consent, website URLs, CA license (`has_dre_endorsed`), other-reason; "new Hot
  sign-up" bell kind; stalled-after-Step-1 tick ([X hours]) → `CALL_NEXT` next step + alert; callback request →
  next step for the owner/queue.
- **P3 — later**: native booking on onboarding calendars (free-busy + self-booking), NMLS prefill (data source +
  rate-limited public endpoint), LO name-search endpoint in moso-aid, restrict packs `getAdmins`.

## 5. Placeholders Matt left open
[X HOURS] for stalled follow-up; call length; TERA walkthrough + 2 videos + YouTube URL; confirm hero proof points
(240+ wholesale lenders, 2,600+ loan officers) with marketing.

## 6. Decisions by Bao (28/10)

### URL map (confirmed)
| Today | Content | After |
|---|---|---|
| `/register-loan-officer` | old form | **kept as is** (compare) |
| — | Matt's new form | **`/join`** → `/join/license` → `/join/book` → `/join/booked` |
| lf `/join/<slug>` | recruiter landing (invitation, bio, video, webinar, FAQ) | **`/recruit/<slug>`** |
| lf `/recruit/<slug>` | hero + old form (redundant) | **removed** |
| lo `/<site>/join` | Loan Officer recruiting landing (bio, video…) | **`/<site>/recruit`** |
| — | new form on a Loan Officer site | **`/<site>/join`** (credits the site owner, as today) |

- No `?r=` in shared links. The recruiter shares `/recruit/<slug>`; its "Ready to join" button carries the referrer to `/join` internally. Bare `/join` = no referrer → referral question (claimed referrer, confirmed in Recruit; 07/09 rule kept).
- Bio/video editors stay (lo `/lo-setting` "Recruiting page", lf `/manage-join-page`, moso-aid `/api/join-page` + recruiter-profile): they serve the landing that moves to `/recruit`.
- Old `/join/<slug>` and `/recruit/<slug>` links are dropped, NO redirects. Measured 28/10 on production:
  Cloud Run lf-homepage requests 30 days → only team traffic (seth-august 23+28 human hits over 3–5 days, mattmo 3+12,
  phuong-nguyen 1+1, the rest test slugs 404); MOSO prod Datastore `LORecruiting.lead_origin` JOIN_SLUG = 0,
  RECRUIT_SLUG = 0 (positive control REFER_LO_PAGE = 1, so the query works).
- Follow-ups: rename the lead-origin stamps' meaning (JOIN_SLUG/RECRUIT_SLUG are tied to paths in packs/recruit-be),
  moso-aid/lf `site_slug` redirect targets, lo map-urls/RELEASE_PAGES, recruit-be docs §4.3.

### Booking (Step 3) — keeps the CLAIM model (no auto-assign)
- Recruit today: new lead → Hot leads, first recruiter to Claim owns it (D55, D66); auto-own only for LO Recruiter
  Program members' own pages (D196). The intro call is the recruiter's, NOT onboarding's (Matt's wireframe said
  onboarding specialist — to be told).
- Slots: only times when ≥1 recruiter is free on Google Calendar (business hours); capacity per slot = free
  recruiters; full slots disappear; concurrent booking of the last seat → "pick another time". Calendly dropped (D151, Bao 28/10).
- Booked lead lands in Hot leads with a "Call booked Tue 10:00" badge + bell to recruiters; whoever claims takes the
  call; the Google Calendar + Meet event is created on the claimer's calendar at claim; LO gets the confirmation.
- From a recruiter's landing (`/recruit/<slug>`): only that recruiter's free times; lead goes to them (D196 path).
- **Claim deadline for a booked lead = min(normal SLA deadline, booked time − 30 min)** — reuses the existing SLA
  alerts (no new alert type). Scenarios it fixes (Bao 28/10): booked 10:00 at 9:00 with a 4 h REFERRAL SLA (deadline
  would be 13:00); booked in the evening for 8:00 next morning (business-hours clock paused); WEBINAR 24 h SLA.
- After claim: Today item + calendar event; reminder 15 min before. Not logged 15 min after the booked time →
  existing CALL_NO_RESULT urgent (covers claimer sick/busy).
- "None of these times work" → normal Hot lead (claim + SLA as today).

### More decisions (Bao, 28/10 night)
- **No [X hours] stalled-sign-up timer.** A Step-1 save already creates a Hot lead with its normal SLA (recruiters +
  managers alerted). Add only a badge "Sign-up not finished" on the lead (Step 2 / booking not done) so the recruiter
  knows to help them finish. Phase 2 drops the stalled-after-Step-1 tick.
- **Intro call length = 30 minutes.** Slots every 30 min (9:00, 9:30, …), 30-min Google Calendar event, "30 min" on the
  booking screen and the confirmation email.
- **Hero numbers come from live data** (same `findLenders` / `countLoanOfficers` used by the Loan Officer page) —
  nothing for Matt to confirm.
- **Videos:** ask Matt only whether he has specific videos; otherwise use the existing "Loan Factory explained" video +
  the LF YouTube channel link.

### Matt's reply (28/10 night, New Landing Page chat)
- Bao sent the message without the referral item (item 3 held back pending Phuong/Thuan on the company-page rule).
- **Wording:** pages say "onboarding specialist" for the person who takes the intro call — Loan Officers tend to dislike
  "recruiters". It is a LABEL only: inside Recruit the slots are still the recruiters' calendars and the claim model is
  unchanged. Booking screen, confirmation page and emails show "onboarding specialist" + the caller's name.
- **Videos:** use "Loan Factory Explained" now; add 3 thumbnails under the main video that open YouTube; the main
  video (and the 3) must be easy to swap later without a code change → store the 4 YouTube links in an editable setting.

### Referral question — still OPEN (Bao 28/10)
Matt's design: "How did you hear?" → "A Loan Factory LO referred me" → typeahead of active Loan Officers, credited as
referral ("We'll make sure they get credit"), on ANY page including the company site. This conflicts with the rule agreed
with Phuong: company site = company lead; a Loan Officer's own page / a recruiter's page = credited to them.
Options weighed: (1) strict rule, no question; (2) Matt's auto-credit (risk: anyone types a friend's name → wrong payout);
(3) optional question recorded as a CLAIM, credited only after confirmation (recruiter on the intro call and/or the named
Loan Officer), first-come via link or "Refer a Loan Officer"; (4) rely on "Refer a Loan Officer" beforehand.
Recommendation 3+4; Bao to check with Phuong/Thuan before answering Matt.

### Referrer picker improvements (Bao 28/10, applies whichever referral rule is chosen)
How the existing pickers work (lf `after-party-event` `ReferredFields.tsx`): a searchable Mantine Select — typing only
FILTERS the list (case-insensitive substring), the user must pick a real Loan Officer, and the form sends that person's
company email; free text is never saved, so a typo cannot credit the wrong person (it just finds nothing). Real risks:
picking the wrong person with the same name, or giving up when nothing matches. For the new form's picker:
1. **Easier search:** match every typed word separately ("Mat Mogh" → Matt Moghaddam), and also match email and NMLS.
2. **No wrong pick between same names:** each option shows photo + full name + state + NMLS.
(Needs a safe Loan Officer search endpoint returning only public fields — not packs `getAdmins`.)
Measured 28/10 on MOSO prod Datastore (kind Admin, ns 5716104026521600; name fields are arrays [Original, lowercase]):
2,724 active Loan Officers (active, no terminate_date, LO, not broker). Exact same first+last name: 7 groups, 15 people
(largest group 3) — all 15 have an NMLS and a state, so photo + name + state + NMLS tells them apart. Same first name +
same last initial: 174 groups / 394 people; most common last name shared by 91 people → per-word search matters.

### DECISION (Bao 28/10 night): candidates may pick their referring Loan Officer on COMPANY pages again
- Reverses the 07/09 rule for the "Loan Officer referred me" path: on company pages the candidate searches and PICKS a
  Loan Officer; the pick is TRUSTED and credited (sends the Loan Officer's company email → packs resolves it to the
  `referred_lo` FK, which Recruit already treats as a confirmed referrer → REFERRAL, D54/D169 unchanged because it is a
  pick from the roster, not free text). A recruiter MAY double-check on the call; not required.
- Evidence that drove it: after-party's picker (the one place that still allows it) shows "David Tran" ×2 and
  "Trang Nguyen" ×3 with no way to tell them apart (Bao's screenshots 28/10); prod has 7 such name groups / 15 people.
- So every Loan Officer picker shows photo + name + state + NMLS and searches per word (+ email/NMLS).
- Links still lock the referrer (Loan Officer site, recruiter page, `?ref=`) and hide the question.

## 7. Decisions 29–30/10 (Victoria meeting 29/10 + Bao 30/10)

Sources: New Landing Page chat 29/10 (Victoria, Matt, Chi Tran), meeting transcript
`docs/transcripts/lf-homepage/2026-10-29_register-loan-officer-new-flow-victoria-pham.md`, Bao 30/10.
Mockup (brand colours/fonts, Matt's layout): claude.ai artifact `92Yarua4tCB9TwhQontgn7`.

### Flow
- Steps 1 About you → 2 License details → 3 Next step → 4 Details for your agreement → Review → Pay $100 → Sign → NMLS access.
  The stepper shows only 1-2-3 up front (Matt: don't overwhelm); 4+ appear only when reached.
- **Step 3 has two paths** (Victoria): "Book a 30-min intro call" or "I'm ready to join" (already spoke with our team).
  Shown as two choice cards at the top of Step 3 (Bao 30/10: the skip must be easy to see). No word "recruiter" anywhere.
- **Pay/sign stay locked until the onboarding specialist sets `onboarding_meeting_status = pre_onboarding_done`
  ("option Y", Bao 30/10).** Ready-to-join path: Step 4 saved → "our team will review and email you a link to sign and pay".
  Victoria filters candidates and does not want anyone paying before approval. The gate already exists in lf
  (`startupFeeGates.ts`), no change needed.
- **Opening a link with `?key=`** goes to the FIRST step that still misses a required field (checked in order 1 → 2 → 4);
  missing fields are highlighted. Step 3 is skipped once `pre_onboarding_done` is set. Completed steps show ✓ and stay
  editable. (Bao 30/10: "almost complete" is still incomplete → open that step.)
- Loan Officers fill everything themselves; staff never type it for them (Victoria: past lawsuit threat after a staff typo).
  Matt agreed two calls are fine.

### Booking (replaces the 28/10 "real free-busy booking" design)
- Victoria: the team is large and uses personal Calendly links, so no calendar sync. The Loan Officer picks **up to 3
  two-hour windows** (9–11, 11–1, 1–3, 3–5) on business days, from a month calendar (Matt's layout), plus an
  **"Any time works, call me ASAP"** option. No suggested times (Victoria rejected pre-suggesting).
- Windows are shown in the Loan Officer's own time zone (auto-detected, changeable); stored in UTC.
- Matt's "None of these times work? Have an onboarding specialist call me" link is dropped (redundant with ASAP).
- Recruit: the lead shows the chosen windows; the specialist confirms one → Recruit creates the Google Calendar event
  with Meet (code exists on recruit-be production, `google/calendar/*`, not yet enabled for real users — bead 61yi6).
  No Calendly. Freebusy / slot capacity / claim-deadline rules from 28/10 §6 "Booking" are no longer needed for Phase 1.

### Step 4 "Details for your agreement" (counted 30/10 on lf origin/master)
Live form = 48 inputs (32 seen by a typical applicant, 20 always required). Matt keeps 12 of them in Steps 1–2.
Remaining = 14 questions (22 boxes), matching Victoria's "~14":
- Required: legal first/last name (prefill from name), citizenship, home address (street/zip/city; Apt optional),
  mailing address (default "same as home" ticked), licensed states (prefill from sponsor states), main target comp,
  correspondent target comp, website-approval tick, final accuracy tick (moved to Review).
- Read-only: W-2/1099 (set by the specialist on the call; packs `protectMeetingClassification`).
- Optional (no marker): alias first name, not-exclusive checkbox, preferred languages, social links.
- Move to Step 2: SC/AR/NE sponsorship confirmation, Indiana license type (they decide whether we can sponsor).
- Drop (as Matt): referrer name/phone/Zelle fields.
- Required fields carry a small "Required" chip; optional fields carry nothing; checkboxes (disclaimer, acks) carry no chip.
- Conflicts to fix in code: SMS consent is must-be-true on every step today (Matt: unticked/optional);
  phone and last name are optional today (Matt: required).

### Review screen instead of Matt's "attestation email"
- End of Step 4: grouped summary with Edit per group; fields set by our team (W-2/1099, legal name if entered by staff)
  marked "Set by our team" with a "This is wrong" link; existing `is_acknowledgment_checkbox` tick here. Then pay → Inkless
  sign (the agreement prints the same data; the signature is the attestation).
- After signing: a receipt email with the summary and a link back to the form — informational, no action required.
- Staff edits to address/NMLS/type after review already rebuild the Inkless envelope (packs `LORecruiting.java:1270`),
  so the Loan Officer re-signs and sees the change.

### Name lock
- First/last name `readOnly={key}` (BasicInfoForm 445/458, PersonalInfoPart 125/132) came from PR #136 (11/2024, no reason
  given). packs saves first/last on a keyed save; the agreement uses the legal name. → make first/last editable, FE only.
- Keep email locked: dedupe key for key-less re-registration, blacklist check, Inkless signer email (not rebuilt on change).

### Special requests (Thuan ticket via Phuong)
- Step 4 group "Special requests": one request per row, "+ Add a request", example quick-add chips (Team name, Powered by,
  Coaching waiver, Fee waiver) that start a row; free text per row. Disclaimer checkbox with Thuan's exact sentence,
  required when ≥1 row, stored with a tamper-proof timestamp (copy `mortgage_website_approval_ack(_at)`).
- packs: new LORecruiting fields + push to recruit. Recruit side tracked in bead agentflow-oxwsb.
- Brand guide p.12: team names need Marketing approval and must not read as another entity/DBA → show next to team-name rows.

### Sources measured 30/10 (MOSO prod, 24,601 inbound LORecruiting rows)
| Entry point | Leads | Joined | Join rate | Share of joins (12 mo) |
|---|---|---|---|---|
| Staff-created (manual/CSV) | 10,654 | 1,504 | 14% | 35% |
| Webinar sign-up | 6,143 | 1,456 | 24% | 28% |
| Register form direct | 1,482 | 896 | 60% | 24% |
| Refer-a-Loan-Officer page | 2,503 | 467 | 19% | 12% |
| Ads / events | 503 | 27 | ~5% | ~1% |
~76% of joiners start elsewhere with only name/email/phone/NMLS → the keyed link + first-missing-step rule matters.
96% of joiners end up on the register form (fee + agreement live there).

### Brand (Brand Guidelines 2022, Bao 30/10)
Web fonts Montserrat (headings) + Lato (body) — lf loads Montserrat only today; orange #F36F23, black, white, grays
#EFEFEF/#DBDBDB/#999999/#323232; max 3 type sizes; sentence case body. Matt's wireframe keeps a good layout but uses a
darker rust orange, warm near-black, cream/peach backgrounds, an Inter-like font, ~7 type sizes and the abbreviation "LO".
Build with brand tokens; black text on orange buttons (white on #F36F23 is ~3:1).

## 8. Mockup decisions (Bao 30/10 afternoon)

Full-flow mockup (every control interactive, scenarios switchable): claude.ai artifact `92Yarua4tCB9TwhQontgn7`.
Copy rule: Matt's wireframes/handoff first; never add a field Matt doesn't have; screens Matt didn't design use the plain
rewritten copy shown in the mockup (Bao chose it over the old form's verbatim labels).

- **Layout:** the page sits inside the site's global header/footer (no own logo bar). Step 1 = Matt's full dark hero
  (eyebrow, headline, 3 stats with orange rules); Steps 2–3 = slim dark strip; after the call = "Welcome back, <name>".
- **Step bar:** before the call only 3 steps (About you · License details · Book your call). From Step 4 on, all 7:
  ✓About you · ✓License details · ✓Intro call · 4 Application · 5 Review · 6 Pay & sign · 7 NMLS access.
- **Step 1:** all fields required (Matt: "All fields required"). "How did you hear" options per Matt; "Other" has NO
  extra text box. Referral picker on company pages: search input ("Search by first name, last name, email or NMLS"),
  per-word match on name/email/NMLS; options and the picked card show avatar + full name + NMLS · email; × clears.
  On a Loan Officer's own page (e.g. `/mattmoghaddam/join`) the question is hidden and a read-only "Referred by" card
  (avatar, name, NMLS, email) is shown.
- **Step 2:** sponsor states multi-select ("Add" placeholder only while empty). Conditional blocks (hard-coded in lf and
  lo today, 4 copies: `@constants/state` + inline CA/IN/SC-AR-NE + `ALWAYS_CORPORATE_STATES`):
  CA DFPI → "Do you also have a California DRE real estate license?" (Yes → DRE number/type);
  CA DRE → "Do you want to practice real estate with Loan Factory too?" + DRE number/type; IN → license type;
  SC/AR/NE → sponsorship confirmation. Website Yes → repeatable URL rows ("+ Add another website").
  Website-approval tick lives here, always shown and required.
- **Step 3:** title "Would you like a quick call first?"; cards "Yes, book a 30-min call" / "No, I'm ready to join ·
  I already spoke with your team". Calendar month view + 4 two-hour windows, up to 3; "Any time works for me" hides the
  calendar (no chip, no "ASAP"). No time-zone line (device time zone stored silently). No onboarding-specialist column.
  Matt's "None of these times work…" link dropped.
- **Call requested (/join/booked):** centred, Matt's confirmation layout: ✓, "You're all set, <name>!", one sentence with
  the mobile number, chosen windows as chips; main video + 3 thumbnails + YouTube button. No "Add to calendar" /
  "Change times" (time not confirmed yet), no mini step list.
- **Step 4 "Finish your application"** (6 groups): Personal details (legal first/last, alias first name — packs only has
  `alias_first_name`, citizenship, preferred languages full width) · Address (street 2/3 + apt 1/3, ZIP 1/3 + city 2/3,
  "Mailing address is the same" toggles the mailing rows) · Licensing (licensed states, not-exclusive tick) ·
  Compensation (main/correspondent dropdowns 0.5–2.5% step 0.125; employment type shown 3 ways: set on the call →
  read-only line "Set on your call"; forced by state → "Required in <state>"; free → two cards 1099 / W-2 with
  "We'll confirm this with you before your agreement") · Online presence (Yes/No, rows of platform select ~160px +
  URL) · Special requests (rows + disclaimer). Required fields carry a "Required" chip; optional nothing; ticks no chip.
- **W-2/1099 is not a free choice** (state law decides; Montana/Indiana require W-2, HUD requires W-2 for FHA lenders):
  keep today's rules (10 always-W-2 states, CA DFPI / IN no-SOS → W-2) and the call lock.
- **Review:** 7 groups with Edit; values as label-over-value tiles; each website and each social link listed;
  "Set by our team · This is wrong" under legal name / employment type (both can be entered by staff).
- **Waiting for review / Done:** centred, info as two small tiles (email, questions).
