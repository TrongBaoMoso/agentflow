# LO Recruiting — Current Features Review

> **Purpose:** A review of the current state of the LO Recruiting module on the existing system (surveyed on staging viet18.com), in response to Thuận's email "Recruiting and Onboarding for Tera+": *"review the current features and share them with Victoria/Benjamin."*
>
> **Method:** Three hands-on passes on staging — (1) walked every page/tab, (2) clicked every CTA/option for real, created real records, and ran a full end-to-end flow recruiting one LO from Add → 100% onboarded, (3) logged in as 6 accounts with different roles to build the permission matrix. Every behavior in this document was **verified by real interaction**, not inferred from the UI.
>
> **Author:** Bao Trinh — 07/2026
>
> *(Vietnamese version: [lo-recruiting-feature-review.md](lo-recruiting-feature-review.md))*

---

## 1. Module overview

LO Recruiting is a CRM module for recruiting Loan Officers, living inside the internal system (GWT / Google App Engine). The **LO RECRUITING** menu (distinct from the RECRUITING menu — a generic HR hiring module: Jobs/Candidates/Interview questions) has 5 pages:

| Page | Route | Role |
|---|---|---|
| My Loan Officer referrals | `/loan_officer_referrals` | An LO refers other LOs, tracks referral rewards |
| Admin - Loan Officer referrals | (via menu) | Admin manages + approves referrals |
| Interested Loan Officers (ILO) | `/lo_recruiting/{Mine\|company}` | Main pipeline: LOs already "interested" → onboarding |
| Recruited Loan Officers (RLO) | `/recruited_loan_officers/{Mine\|Company\|Pending approvals}` | Top-of-funnel lead store (cold list) |
| Loan Officers Obtained from Modex | `/modex_data` | Store of purchased Modex data, staged before merge |

Configuration page: **General Settings** `/lo_recruiting_config` (5 tabs). Dashboard: **Summary - Recruiting** (`/company_dashboard/loan_officers_report/Summary - Recruiting`).

### End-to-end flow (actually run end-to-end)

```
[Lead source] → Recruited LO (cold) → contact (Call/SMS/Email)
    → Recruiter sets status "Want to join" (manual label, not required)
    → Action "Invite Loan officer to join <company>" (available at any status)
    → moves to Interested LO (badge "Converted from recruited LO", status "Invited to join")
    → Pay $100 startup fee → status AUTO-FLIPS to "Onboarding"   ← auto-transition, verified live
    → Sign LO Agreement (e-sign) → eligible for "100% onboarded"
    → Action "Create new account" → CREATE NEW ASSOCIATES form (W-2/W-9, classification, branch/team)
    → LO becomes an official associate, starts originating
```

**The "100% onboarded" gate:** the hard conditions are only **Paid + Signed** (the fee can be waived). NMLS sponsored / HR completed / 1-1 meeting done are only conditions for **auto**-join — an admin can still manually set "100% onboarded" once the 2 hard conditions are met.

---

## 2. LO sources (data sources) — all 6

1. **Modex** (purchased data, includes NMLS + production data) — synced into `/modex_data`, reviewed then merged.
2. **CSV import** — bulk Action → Import (csv), pre-assigns Channel/Status/Priority/Recruiter for the whole file, has a "Default template CSV".
3. **Facebook Lead Ads** — dedicated config tab, connects Facebook Pages directly ("Loan Factory - Mortgage Jobs & Careers"...), leads flow straight into the pipeline.
4. **Self-apply** — a visitor registers to become an LO → **Pending approvals** tab (badge "Added by LO"), admin clicks **Approve** → moves into the Company tab of Recruited LO.
5. **Landing page + Webinar** (`/loan-officer`) — webinar registration → becomes an ILO, with an email automation chain (section 6).
6. **Referral** — a current LO refers someone (section 7).

There is also a secondary funnel: **Invite LO to join Marketplace** — invite the LO to use Moso Marketplace for free first (the account is pre-created, the LO just sets a password), a "light recruit" to nurture.

---

## 3. Recruited Loan Officers (top of funnel) — CTA detail

### Page structure
- **3 tabs:** Mine / Company / Pending approvals. Stats panel at the top (each number is a drill-down link), 3 view modes: **bar chart / text / hidden**.
- **16-column table:** Started date, Updated, Full name (+badges/labels/follow-up), Social media, Friendship, Status/Priority, Call, Text, Note, Action, Loan officer channel, Experience/12-month loans, NMLS/States to sponsor, Registered webinar/Recorded link, Recruiter, My profile (Claimed/Not claimed — whether the LO has claimed their Marketplace profile).

### Status (10): Not touched → Initiate contact → Message sent → Dialogue → Invited to join → Interested but thinking → Want to join / Archived / Archived - Wrong information / Block display
### Priority (5): Highest / High / Medium / Low / Lowest
### Channel (3): Wholesale LO / Retail LO / Broker-Owner
### Experience (4): Newly Licensed / Inexperienced / Experienced / High producer

### Toolbar
| CTA | Behavior (tested) |
|---|---|
| **Add** | Full-page create form; required fields (Licensed states, States to sponsor, Career Production, Mailing address, Preferred languages) are **not marked with \*** and only reveal one error at a time on each submit (poor UX). Has per-state logic (CA DRE, Indiana...), Modex info, Google address autocomplete. |
| **Delete** | Deletes selected records (toolbar shows the count: "Delete 1"). |
| **Assign recruiter** | Modal to pick a Recruiter + checkbox "Overwrite the current recruiter"; unchecked = only assigns to records without an owner. |
| **Action → Import (csv)** | Preset Channel/Status/Priority/Recruiter + upload + Default template CSV. |
| **Action → Email all** | SEND EMAIL page: mass-send per the **current filter** (To = `${root.email_name}`, from `drive@…`), Reply-To, rich editor, **Create mailing list Yes/No**, **Email campaign name** to track in email history. = an email-blast engine with campaign tracking. |
| **Action → Create contact list** | NEW DYNAMIC LIST page: a **dynamic** contact list ("recipients determined in real-time when emails are sent") by criteria (Active, Social media, Recruiter, Channel, Friendship, Claimed profile, Experience, Language, Licensed states) + **Export (csv)**. |
| **Action → Update data using Modex** | Modal to pick fields to re-sync (Basic: Email/Phones/Company name-url-nmls/Social links; Mortgage: #loans 12mo, volume 12mo, transaction history, years in business) + Update Range (date/channel/status/recruiter/social/friendship); **no range selected = update ALL**; lookup by NMLS; confirms "~10 minutes", runs in background. |
| **Follow-ups overdue** | A filter (not a page) — filters records with an overdue follow-up flag. |
| **Brokers/Companies** | CRUD modal for **broker company master data** (Name/Website/NMLS/Address), the source for an LO's Company field. |
| **Company information** | One rich-text note **shared company-wide** (everyone sees/edits it). |

### Per-row
| CTA | Behavior (tested) |
|---|---|
| **Call** | Does NOT dial immediately — opens a modal with a sales **call script** (Technology/Support/Compensation: 250bps, 100% commission − $595 − $500, $300/referee loan) + a "Call via my Zoom Phone" button (deep-links the Zoom app). The Call counter counts from the **Zoom log**, not from the click. |
| **Zoom SMS** | Sends SMS via the **user's own Zoom API**. If the user has no Zoom Phone mapping → error "Failed to send Zoom SMS: User not found" (terse, no guidance). |
| **Note 💬** | = **Conversation history**: rich-text, **Pin/Unpin**, **Save + Email** to send the note to departments (HR/Licensing/Compliance/Onboarding…) + additional recipients. **Verified email lands in a real inbox** (staging sends REAL external email — be careful on records with real emails). |
| **Social media badge** | UPDATE SOCIAL LINKS modal + **"Copy Name And NMLS #"** button (to go search the profile); "Has social media" Yes/No; Yes → a repeater of links (recommends personal FB, Fan Page, LinkedIn, Google Business Profile, Zillow, Yelp, TikTok) → badge "Checked and has social links". |
| **Friendship** | Social-connection tracking: Not friend / Friend requested / Cannot make friend request / Friend. |
| **Status** | Click the status label → opens a **CHANGE STATUS** modal (dropdown of 10 statuses + optional Note + Submit). Verified live: dropdown is Not touched → Initiate contact → Message sent → Dialogue → Invited to join → Interested but thinking → Want to join → Archived → Archived - Wrong information → Block display. |
| **Priority / Channel / Experience** | Changed inline via a dropdown right in the table (Priority: Highest/High/Medium/Low/Lowest). |
| **Row Action (7 items)** | Assign recruiter, Audit log (field-level old→new + user + timestamp), Conversation history, Add or remove a follow-up flag, Register for a webinar, Invite Loan officer to join <company>, **Invite LO to join Marketplace**. |
| **Follow-up flag** | = a snooze + notification engine: pick a wake-up date (validated to the future); on wake it sends System notification/Email/Text to owners; has a separate **Flag history**. A flagged record is "hidden from the pipeline until wake up". |
| **Invite … to join company** | Modal explicitly states *"will be moved to the Interested Loan Officers pipeline"*; requires picking a **Referral source** (Word of Mouth / Search and AI / Social Media / Events and Job Boards / Direct Invite / Other, with a cascading Detail); toggles **Waive $100 fee** + **Send invitation email**; the template states "$100 non-refundable startup fee… cover NMLS sponsorship fees up to 3 states". |
| **Invite LO to join Marketplace** | Email composer (template `outside_loan_officer_invitation`, subject "Welcome to Moso Marketplace - Activate Your Free Account!"): the account is **pre-created**, the LO clicks to set a password; flow Preview → Send → toast "Emails are being sent". |

### Pending approvals tab
- System description: *"captures all requests from visitors who would like to be our loan officer"*.
- The row Action replaces "Invite … to join company" with **Approve** → confirm → the record moves into the **Company** tab. Has an on-demand per-row **Check Modex** link.

### Filters
Search box (Name/Email/Phone/Company) + Active/Inactive + Social media + **More** (Additional filters modal): Channel, Licensed states, Preferred language, Friendship, Profile, Experience, Personal address state.

---

## 4. Interested Loan Officers (main pipeline) — CTA detail

### On-page description (verbatim summary)
An LO registers for the webinar from the landing page → the system emails a confirmation + webinar details → 1 day after the webinar, an email asks whether they want to join → if they join, **HR is notified to begin onboarding** → "Call each loan officer for an interview, update the status, add notes after each call. HR will create a profile once the associate pays the start-up fee and signs the LO agreement."

### Stats funnel (each number drills down): Total, New, 1-1 Onboarding meeting completed but HR not initiated, Invited but not onboarding, Paid but not signed, Onboarding, NMLS sponsored but HR onboarding, 100% onboarded, HR completed but NMLS not sponsored, Paid startup fee, Agreement signed.

### ILO Status (8): New / Invited to join / Onboarding (`interviewed_and_accepted`) / Hiatus / No response / Denied by company / Denied by LO / 100% onboarded (`joined`)
- **Auto-transition verified live:** set Startup fee = Paid → status auto-flips to **Onboarding**.
- **100% onboarded** can be set manually as soon as Paid + Signed (no NMLS/HR/meeting required — those only drive auto-join).

### Toolbar
- **Add and invite loan officer** (create + invite directly into the ILO pipeline)
- **Action (bulk, 9 items):** Import multiple interested loan officers / Create contact list / **Assign owners** (Onboarding specialist + Recruiter, each with "Overwrite current", validates "No row is selected") / Register for a webinar / Update data using Modex / Email all / **Export (csv)** / **Template settings** / **Import "Attendance tracking"** (pick a webinar + attendance CSV + template → updates the Attended? column)
- **General Settings** (section 6) — **Follow-ups overdue**
- **Delete** (only shown for company-wide roles: Admin/HR/Accounting)

### Row Action (11 items, admin)
Assign owner / Audit log / Invite loan officer / **Invite 1-1 meeting** (email inviting them to book via **Calendly**) / **Create new account** (CREATE NEW ASSOCIATES form: W-2/W-9/Outside Salesperson, classification Outside–Independent–Corporate LO, probation, branch/team/manager, company email) / Conversation history / Add or remove a follow-up flag / Register for a webinar / **Re-generate e-sign documents and send email** / **Loan referral** (toggle Yes/No → badge) / **Create an Incident** (a service-desk incident tied to the LO: Department, type "Employee's mistake", owner, committer, severity).

### ILO edit form (notable points)
Beyond basic info: **payout via Zelle**, compensation targets, per-status templates… (details in pass 1). Columns show NMLS status/License status/HR status, Status/Startup fee/Agreement, 1-1 Onboarding meeting.

### Template settings (per-status communication)
A store of **Email / SMS / Call script** templates for each ILO status (8 statuses), with variables: `${Server.getCompany().name}`, `${root.first_name}`, `${Server.currentUser().full_name}`… — this is the content source for the Call modal + the email automations.

---

## 5. Loan Officers Obtained from Modex (`/modex_data`)

- A staging store of purchased Modex data: each record has a **Synced** badge, Status **Existing** (a matching record already exists) / **Review Similar** (suspected duplicate, needs review).
- **Sync Status** (syncs state), search by Name/Email/NMLS.
- **View** → MODEX INFORMATION modal: company + Company NMLS, tenure (Current Job / Financial Services History), contacts, 7 social links, **12-month PERFORMANCE (Total Volume / Total Count)**, **TRANSACTION SUMMARY** (mix of Construction/Home equity/Purchase/Refinance/Other %) → very strong recruiting-pitch data for the recruiter.
- **Update** → **COMBINED LOAN OFFICER RECORDS** modal (list of records matching NMLS/email, source "Recruiting LO", pick a **Select** target) → field-picker modal (same as Update-using-Modex) → confirm *"~10 minutes"* → "Data is updating in background" → the Recruited record gets enriched (verified: the record received full social links + production data after the job).

---

## 6. General Settings (`/lo_recruiting_config`) — 5 tabs

1. **Webinar**: toggle **"Offer webinar to interested loan officers?"** (currently OFF on staging) + describes the **6-email automation** chain: (1) confirmation after registration with join instructions, (2) reminder 2 days before, (3) reminder 1 day before, (4) reminder 2 hours before, (5) 1 day after the webinar → email inviting them to join the company, (6) 1 month later → follow-up. Each email has a template-edit link.
2. **Landing Page's Settings**: content of the `/loan-officer` landing page (banner + ~11 YouTube videos).
3. **1-1 Meeting using Calendly**: company booking URL + **personal access token** (⚠️ an individual's token currently sits in config).
4. **ILO Owner Assignment Methods Settings**: enable/disable **auto-assign** of owners (Recruiter / Onboarding specialist / Support) — this explains why new records get an owner who isn't the creator.
5. **Facebook Ads**: toggle + connect Facebook Pages, "capture leads directly into your Lead pipeline".

---

## 7. Referral program (My referrals + Admin referrals)

- **Policy (verbatim from the policy modal):** a referral is **NOT eligible** if: (1) the LO joins more than 120 days after the referral, (2) the LO already registered for a webinar before being referred, (3) the LO previously joined Loan Factory, (4) they are the spouse of the referrer, (5) the LO belongs to a broker / is not exclusive.
- **Payout:** eligible **60 days after 100% onboarded** → a **Saturday** cron generates a special commission request → the **Commission Team** approves → ~**75 days** total from onboarding to payment. The edit form has a **Zelle** payout option.
- Admin referrals: management + approval table; My referrals: an LO tracks their own referrals.

---

## 8. "Summary - Recruiting" dashboard

- `/company_dashboard/loan_officers_report/Summary - Recruiting`.
- **Run Update**: confirms "re-sync this Dashboard… few minutes" → a background job recomputes the numbers (the dashboard is NOT realtime).
- **RECRUITERS** table: a per-recruiter funnel; **every number is a drill-down link** that opens the correspondingly filtered ILO/RLO list.

---

## 9. Permission matrix by role (verified by logging in as 6 real accounts)

| Permission | Admin | HR | Licensing | Recruiter (Out+In) | Recruiter (In only) | Onboarding | Accounting |
|---|---|---|---|---|---|---|---|
| LO RECRUITING menu | 5 items (incl. referrals) | Interested + Modex | **none** | Interested + Recruited + Modex | Interested + Recruited + Modex | Interested + Modex | Interested + Modex |
| Recruited LO | Mine + Company + Pending | ❌ | ❌ | Mine + Pending (**only records they own**; no Add/Delete/Assign; bulk only "Update Modex"; row has all 7 items) | Mine + Pending (like Out) | ❌ | ❌ |
| Interested LO | Mine + Company | **Company-wide** + Delete + General Settings | ❌ | Mine + Company | **Mine only** | Mine only | **Company-wide** + Delete + General Settings |
| ILO bulk Action | 9 | 8 (no Export csv) | — | 8 | 8 | 8 | **9 (has Export csv)** |
| ILO row Action | 11 | 10 (no Create an Incident) | — | 10 | 10 | 10 | 10 |
| General Settings | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Modex page | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Associates | full (9 actions, incl. **Login** impersonation) | view + 4 actions | — | ❌ | ❌ | ❌ | (not checked) |

**Notes on the permission design:**
- Recruited LO (top of funnel) is the "turf" of Recruiter + Admin; recruiters are limited by **ownership** (Mine only) — an "SDR only touches their own leads" model.
- ILO is the central page every role operates on, same UI but different scope: recruiters see Mine, HR/Accounting see company-wide + Delete.
- Licensing is entirely outside the module (works via HR docs / Associates at a later stage).
- Every operating role can click **"Create new account"** on ILO (not just HR) — worth revisiting on rebuild.
- **An inside-only recruiter has no Company tab on ILO, but a recruiter who also has the Outside role does** — the In/Out boundary is inconsistent.

---

## 10. Issues / risks to address when rebuilding on Tera+

**Permissions & security**
1. ⚠️ **Every role with LO Recruiting can open General Settings** — including the Calendly tab (holding a personal access token) and the webinar-automation toggle. Recruiters should not be able to edit company config.
2. HR/Accounting have a **Delete** button on company-wide ILO.
3. **Impersonation ("Login")**: swaps the session for the whole browser, with no "Back to admin" — the only exit is logout + re-login.
4. Staging **sends real external email** (received in an external inbox) — any test action on a record with a real email risks spamming a real person.

**Data & performance**
5. The Recruited LO stats panel is **cached/stale** (observed ~8-day skew); the dashboard requires a manual Run Update — not realtime.
6. When you pick a search suggestion, the search box filters by **`?labels=`** instead of full-text → easily returns "No results" and misleads; newly created records index slowly (Datastore eventual consistency).
7. The Modex update job takes "~10 minutes" with no progress/notification on completion.

**UX**
8. The Add form doesn't mark required fields; errors reveal **one field at a time** across multiple submits.
9. The Change Status modal breaks if the page filter changes mid-way (toast "technical difficulty" but it actually saved — the message is wrong).
10. Call/SMS require per-user Zoom Phone mapping; the "User not found" error has no remediation guidance.
11. The 16+ column table scrolls horizontally, old GWT UI, many-step operations — exactly why a rebuild is warranted.
12. Wrong routes (`/interested_loan_officers`, `/admin_loan_officer_referrals`) **silently redirect** elsewhere instead of returning 404/permission errors.

---

## 11. Mapping to the 5 areas in Thuận's email

| Email area | Current state | Note for Tera+ |
|---|---|---|
| **1. LO lists** | 6 sources (Modex/CSV/FB Ads/self-apply/webinar/referral) + Modex dedup + dynamic contact list + campaign email engine | Keep all sources; standardize dedup + full-text search |
| **2. Webinar page** | `/loan-officer` landing + webinar registration + 6-email automation + attendance import | Toggle currently OFF on staging; the email chain is an asset worth porting as-is |
| **3. Follow up** | Follow-up flag (snooze + wake notification + history), per-status Email/SMS/Call templates, Zoom SMS/Call, Calendly 1-1, campaign tracking | Upgrade: notify on job completion, a follow-up dashboard |
| **4. Onboarding process** | ILO status machine + auto-transitions (Paid→Onboarding), Paid+Signed gate, e-sign, Create Associates account, HR/Licensing/NMLS checklist | Clarify the auto vs manual boundary; tighten Create-account permissions |
| **5. Trainings** | Not in this module yet (separate My Training Academy) | Benjamin's part: just-in-time training, milestone-triggered videos in Tera+ |

**Open question from the CEO to settle:** *"Will it be a separate application or part of Tera+?"* — the module is tightly coupled to the old GWT system (session, Associates, service desk, commission). If split out, we must define APIs for: identity/roles, Associates/HR, commission (referral payout), notification, e-sign, and the Zoom/Calendly/Facebook/Modex integrations.

---

## Appendix A — Test records left on staging (safe to delete)

- **BaoTest Staging** (ILO, 100% onboarded, Paid, Signed, Loan referral=Yes; temp-mail email) — the record used to run the end-to-end flow.
- **Mom Test RLO** (Recruited/Mine): Friendship=Friend requested, Social=Checked+LinkedIn, Priority=High, Channel=Retail LO; one Marketplace invite email sent (to test5142@test.com); 2 test notes (1 pinned, 1 emailed).
- **David** (Pending approvals) → Approved, now in the Company tab.
- **Daphni Hagen** (Modex) → ran an Update merge (background job) — the record was enriched.
- The dashboard had Run Update clicked once.

## Appendix B — Role accounts used to test permissions

HR: Ken Customer · Licensing: Chu Con Gi Nua Testcase · Outside+Inside Recruiter: Luis Testcase 635211 · Inside Recruiter: Nocha Hien · Onboarding Specialist: Maria Testcase · Accounting: Admin Request. (Impersonation via Associates → Action → Login; only admin has this ability.)
