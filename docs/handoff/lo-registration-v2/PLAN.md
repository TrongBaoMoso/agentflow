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
