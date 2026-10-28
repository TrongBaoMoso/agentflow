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
