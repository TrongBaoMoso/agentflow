# recruit-fe UI map for staging QA

Source: `origin/master` @ 1fc5521b (= staging), read-only. Citations are `file:line` relative to the recruit-fe repo root. Anything not proven from code is marked UNCONFIRMED.

## Read this first: what changed since the 29-30/09 QA sheet

- **The pending-call box has two texts, depending on where you are.**
  - Drawer: "Your call {when} has no result yet" (`src/messages/en/drawer.json:105`). Only the person who made the call sees it.
  - Today, Hot and Cold strip: "Call to {name} logged at {time} — no result yet" (`src/messages/en/outcome.json:76`).
  - Both have a "Log result" button.
- **"Invite to join" is now "Offer".**
  - The drawer header button is "Prepare offer" (`invite.json:3`). It only shows at stage S6.
  - In Call result, the Interested outcome shows a "Ready to join?" card with one button, "Yes, prepare offer". This card is not limited to S6.
  - The Today ready strip button is "Prepare offer" (`outcome.json:96`).
- **Staging has no "Send invite →" button.** The BE hand-off flag is on, so the offer modal shows "Send to onboarding →". "Request approval →" appears for a fee waive, a missing loan number, or a HEADHUNTER/TEAM_LEAD user. See Part D.
- **Approvals moved from Exceptions to Today**, under "Waiting on your decision". The buttons are:
  - "Approve & send"
  - "Approve, keep $100 fee & send" and "Approve, waive $100 & send" (waive rows only)
  - "Decline", which needs a reason of at least 4 characters
  - Exceptions now only links there.
- **"Take back" exists only on Exceptions**, on "Claimed, not contacted yet" rows. "Remind" is on Exceptions and My invites. Neither is in the drawer.
- **The drawer has 4 tabs:** Overview, Activity, Profile, and Sync (Sync needs a permission).
  - Checklist, Team, Send to HR and Offer progress are sections inside Overview.
  - Licensing is a group inside Profile.
  - Hand off and Reassign sit next to the owner in Key facts, not in the header.
- **"Send to HR" sends on one click, with no confirm step.** It shows only at S6, and only for users with the `CANDIDATE_HR_HANDOFF` permission.
- **Program members has no menu item.** It is a tab in Permissions (`/permissions?tab=program-members`) and needs `RBAC_MANAGE`.
- **Department work only lets you pick Onboarding or Accounting.** "Schedule 1-1" is visible only to the row's own assigned specialist.
- **Role and feature gates only hide menu items.** Typing a URL still opens the page. Only a missing permission redirects, silently, to `/today`.
- **Staging FE flags that are on in staging and off in production:**
  - `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED`
  - `NEXT_PUBLIC_OMNI_INBOX_BUBBLE_ENABLED`
  - Details are in Part D, section 8.

## Contents
- Part A: sidebar per role, Today, Hot leads, Cold list, Pipeline, Exceptions (sections), My invites, My referrals, Referrals, Program members, Reports
- Part B: Duplicates, Dormant, Conversations, Department work (1-1 meetings), Sponsorships, Templates, Audit, Settings + Connections, Checklist templates, Licensing rules, Permissions, Send to HR, drawer checklist
- Part C: candidate drawer, Call result modal, Hand off / Reassign
- Part D: Offer modal, Exceptions and approval actions, My invites actions, feature flags with staging values

---

# Part A — Sidebar per role + core screens (recruit-fe origin/master 1fc5521b)

Paths below are relative to `src/`. `P` = `app/[locale]/(private)`. Message keys are `Namespace.key` from `messages/en/*.json`.
Note: the `crumb` keys in hot/cold/pipeline/exceptions/reports JSON are NOT rendered anywhere (grep finds no `t('crumb')` caller) — ignore them in QA.

---

## 1. Shell, sidebar, header

### 1.1 Shell
- Frame = `PlatformShell` from `@loanfactory-inc/platform-react` (TERA platform shell): app name **"Recruit"** (`Layout.brand_product`), home link → `/today` (`P/_components/RecruitShell.tsx:122-130`).
- Not signed in (SSO mode) → redirect to `/login?next=<path>`; shows a dots loader meanwhile (`RecruitShell.tsx:82-103`).
- If `/admin/rbac/me` fails: red alert **"Could not load your permissions"** / "recruit-be did not answer /admin/rbac/me, so every gated action on this page is hidden until it recovers. Refresh, or contact an admin if this persists." (`RecruitShell.tsx:131-135`, `layout.json:45-46`).
- Floating Omni inbox bubble + global conversation host on every private page (`RecruitShell.tsx:141-142`).

### 1.2 Header actions
- Recruit's own **notification bell** (recruit-be feed; rows open the candidate drawer), placed before the platform's language / color-scheme / platform bell / app launcher ("Discovery") / profile card (`P/_components/RecruitHeaderActions.tsx:12-45`). So the header shows TWO bells (recruit + platform inbox).
- "Dev persona" select only when `NEXT_PUBLIC_DEV_USER_ID` is set — never on a deployed build (`RecruitHeaderActions.tsx:19-41`).
- Profile popup strings: "Your account", "Hi, {name}!", "Manage account", "Linked apps" (`layout.json:36-44`).

### 1.3 Menu groups and entries
Two groups: **"Frequent"** and **"Configuration"** (`layout.json:9-10`, `recruitNav.tsx:363-366`); an empty group is hidden.

Visibility rule per entry = feature flag AND role audience AND `permission` AND `anyOf` (`recruitNav.tsx:346-355`).
- Role audience comes from `GET /recruit-svc/api/v1/me/nav-context` → `{role_codes, referrals_enabled, has_referrals}` (`apis/recruit/navContext.api.ts:11-61`), cached 5 min (a failed read isn't cached).
  - While loading: role-gated entries stay HIDDEN (unless the user holds `*`). If the read fails or 404s: fail open, so role-gated entries show (`recruitNav.tsx:128-139`).
  - ADMIN (or `*`) sees every role-gated entry. Roles: ADMIN, MANAGER, RECRUITER, LO_SUPPORT, OFFICER_RECRUITER, ONBOARDING, ACCOUNTING, HR, LICENSING, HEADHUNTER, TEAM_LEAD. HR and LICENSING have no role-gated entry (`recruitNav.tsx:89-104`).
- Permission gate: `hasPermission` fails open while permissions load.

| # | Label (exact) | Route | Group | Gate (`recruitNav.tsx`) | Badge |
|---|---|---|---|---|---|
| 1 | **Today** | `/today` | Frequent | everyone (L153) | `today_owed` = decisions + 1-1s owed. Fetched only for OFFER_APPROVE holders or ONBOARDING/ADMIN (L333-336) |
| 2 | **Hot leads** | `/inbox/hot` | Frequent | roles RECRUITER, LO_SUPPORT, MANAGER, HEADHUNTER, TEAM_LEAD (L111, L155-162) | unowned HOT count (`hot_leads`), only for CANDIDATE_CLAIM or REPORT_TEAM holders (`useHotNavCounts.ts:38-58`) |
| 3 | **Cold list** | `/inbox/cold` | Frequent | roles RECRUITER, OFFICER_RECRUITER, MANAGER (L112) — NOT LO_SUPPORT, NOT program roles | — |
| 4 | **Pipeline** | `/pipeline` | Frequent | RECRUITER, LO_SUPPORT, OFFICER_RECRUITER, MANAGER, HEADHUNTER, TEAM_LEAD (L113) | — |
| 5 | **My invites** | `/invites` | Frequent | perm `OFFER_REQUEST` + same roles as Pipeline (L177-184) | unseen invite updates |
| 6 | **My referrals** | `/my-referrals` | Frequent | feature: nav-context `referrals_enabled` && `has_referrals !== false` (null = show). Fallback probe of `/referrals/mine` if nav-context is unavailable (L189, L322-325) | — |
| 7 | **Exceptions** | `/exceptions` | Frequent | role MANAGER only (L191-197) | HOT leads past first-touch SLA (`exceptions_past_sla`), REPORT_TEAM only |
| 8 | **Reports** | `/reports` | Frequent | role MANAGER only (L200) | — |
| 9 | **Department work** | `/work` | Frequent | perm `CHECKLIST_READ` + roles MANAGER, ONBOARDING, ACCOUNTING (L204-210) | — |
| 10 | **Sponsorships** | `/sponsorships` | Frequent | perm `CHECKLIST_READ` + ADMIN only (L214-220) | — |
| 11 | **Templates** | `/templates` | Configuration | perm `TEMPLATE_CREATE` (L228) | — |
| 12 | **Duplicates** | `/duplicates` | Configuration | role MANAGER (L229-234) | — |
| 13 | **Dormant** | `/dormant` | Configuration | roles RECRUITER, LO_SUPPORT, OFFICER_RECRUITER, MANAGER (L115, L239) | — |
| 14 | **Conversations** | `/conversations` | Configuration | roles RECRUITER, LO_SUPPORT, OFFICER_RECRUITER, MANAGER, ONBOARDING (L118, L243-248) | — |
| 15 | **Audit** | `/audit` | Configuration | perm `AUDIT_VIEW` (L250) | — |
| 16 | **Referrals by referrer** | `/referrals` | Configuration | perm `REFERRAL_ADMIN_VIEW` + feature `referrals_enabled` (L253-259) | — |
| 17 | **Settings** | `/settings` | Configuration | perm `SETTINGS_MANAGE` (effectively ADMIN only) (L263) | — |
| 18 | **Checklist templates** | `/checklist-templates` | Configuration | perm `CHECKLIST_READ` AND any `CHECKLIST_TEMPLATE_MANAGE_<dept>` except HR/LICENSING (ONBOARDING/ACCOUNTING; ADMIN via `*`) (L142-144, L268-274) | — |
| 19 | **Licensing rules** | `/licensing-rules` | Configuration | perm `LICENSING_RULE_MANAGE` + ADMIN only (L277-283) | — |
| 20 | **Permissions** | `/permissions` | Configuration | perm `RBAC_MANAGE` (L286) | — |
| 21 | **Connections** | `/settings/connections` | Configuration | feature `google_connect` only: Google-connection status read is not 404. No role or permission gate (L291-296) | — |

There is no separate "Program members" menu entry. It is a tab inside Permissions (§2.10).

### 1.4 Expected menu per role (derived from the table above; seeded grants are UNCONFIRMED — check the BE RBAC seed)
- **ADMIN**: everything (role gates pass). Referrals and Connections still depend on the BE flags.
- **MANAGER**: Today, Hot leads, Cold list, Pipeline, My invites (if OFFER_REQUEST), Exceptions, Reports, Department work (has CHECKLIST_READ), Duplicates, Dormant, Conversations, Audit (if AUDIT_VIEW), Referrals by referrer (REFERRAL_ADMIN_VIEW + flag), Templates (if TEMPLATE_CREATE), Connections (flag). Not shown: Sponsorships, Licensing rules, Settings, Permissions (unless granted).
- **RECRUITER**: Today, Hot leads, Cold list, Pipeline, My invites, Dormant, Conversations (+ My referrals / Templates / Connections when their conditions hold).
- **LO_SUPPORT**: like RECRUITER but no Cold list.
- **OFFICER_RECRUITER**: like RECRUITER but no Hot leads.
- **HEADHUNTER / TEAM_LEAD** (program members, row-scoped): Today, Hot leads, Pipeline, My invites (+ My referrals / Connections). No Cold list, Dormant, Conversations, Reports or manager screens (`recruitNav.tsx:74-81`).
- **ONBOARDING**: Today, Department work, Conversations, Checklist templates (if it holds a manage grant), Connections.
- **ACCOUNTING**: Today, Department work, Checklist templates (manage grant), Connections.
- **HR / LICENSING**: Today only (+ Connections / My referrals by flag).

### 1.5 Guarded routes (typed URL / bookmark)
- `PermissionRouteGuard` checks only the `permission` of the most specific matching menu entry. Sub-routes inherit the parent's permission; `/settings/connections` uses its own row, so it has no permission (`P/_components/routeGuard.ts:14-25`).
- While permissions load: dots loader. If the permission is missing: `router.replace('/today')` — a silent redirect with no message (`P/_components/PermissionRouteGuard.tsx:37-55`).
- **Role and feature gates do NOT close the URL.** Example: a RECRUITER typing `/exceptions` or `/reports` still opens the page (visibility only, `recruitNav.tsx:65-69`), and the BE decides what data comes back.

---

## 2. Screens

### 2.1 Today — `/today`
Main file: `P/today/_components/TodayClient/index.tsx`.

**Header**
- Title "Today".
- **"Focus mode"** button → `/today/focus` (L404-414).
- **"Select"** / **"Cancel selection"** button: only when hand-off is allowed (`scoped === false`, i.e. not HEADHUNTER/TEAM_LEAD) and the queue has rows (L125, L415-424).

**Stat row (role-aware, `todayStatGroups.ts:33-48`; render L433-489)**
- Decisions card: **"Decisions waiting"** (gold). Shown to OFFER_APPROVE holders, or when the BE sent decisions. Click scrolls to `#decisions`.
- Onboarding cards: **"1-1 today"**, **"1-1 to book"**, **"1-1 to close"**. Shown to the ONBOARDING role or when onboarding items exist.
- Recruiter cards:
  - **"To do today"** → filter `?f=all`.
  - **"Not contacted yet"** (red) → `?f=untouched`.
  - Shown to CANDIDATE_CLAIM holders, anyone owning leads, or as the fallback when no other group shows.

**Sections, top to bottom**
1. **"Waiting on your decision"** (`Today.decisions_title`): the offer approval queue (`ApprovalQueueSection` from exceptions — buttons "Approve & send" / "Approve, waive $100 & send" / "Approve, keep $100 fee & send" / "Decline"; fork covering offers has details) (L501-510).
2. Link "{n} leads are past their SLA → Exceptions" when the team has overdue leads (L511-517).
3. **"Your onboarding"** — hint "Assigned to you" (`OnboardingSection/index.tsx:205-207`). Row action by task:
   - MARK_DONE → **"Mark done"**.
   - MEETING_TODAY → **"Join Meet"** (or **"Join"**) + **"Reschedule"**.
   - BOOK_1ON1 → **"Book the 1-1"**.
   - UPCOMING → Join + "Reschedule".
   - Without write rights → **"Open"**.
   - Meeting line formats: "{when} · {minutes} min", "No 1-1 booked yet", "Meet link coming".
   - Calendar failure: "Couldn't create the Google event — add a link yourself".
   - "Show all ({count})" / "Show fewer" (`OnboardingSection/index.tsx:109-251`).
4. Red error "Could not load your queue" if `/today` fails (L521-525).
5. Empty states (own queue):
   - Owns nobody, unscoped → **hand-out card** "Nobody on your list yet" / "Your queue is empty and {stock} candidates in the Cold list have no recruiter. …" with buttons **"Claim the next {count}"** and **"Browse the Cold list"**. Without a grant: "Your account has no recruiting grant yet, so claiming is off. …" Toasts: "{ok} candidates are yours — your queue is ready" / partial / ceiling ("You are holding {owned} of {ceiling} — the cap is reached…") / "Nothing left to hand over: …" / "Could not claim a batch" (`TodayHandout.tsx:34-97`).
   - Owns nobody, scoped (program member) → "Nobody to work on yet" / "Leads that sign up through your program page come to you here. You can also claim a hot lead you can see." (L551-564).
   - Owns people, none due → **"Today is done"** / "Everyone you own is either handled or scheduled for another day." or "{n} of yours are scheduled for another day" (L566-572).
   - Capped → warning "Showing the {shown} most urgent due today (today.queue_cap) — more are due and not on this page".
6. **Manager reminders strip**: "Your manager is waiting on {n} lead(s)"; line "{manager} asked you to contact {lo} now"; button **"Open"** (`ManagerRemindersStrip.tsx:37-62`).
7. **"Handed to you recently"**: "From {from} · {when}" / "From {from}, moved by {by} · {when}". Program members see "Handed to you · {when}" with no giver name (`HandedToYouSection.tsx:61-79`).
8. **Hero card "Next up"**:
   - Hero contact buttons ("Call now" / "Send text" / "Send email" depending on the primary channel).
   - **"Log result"**.
   - If no contact data: **"Add contact details"** (`TodayHero.tsx:109-190`, `contact.json:18-20`).
9. **Ready-to-join strip** (yellow): "{name} is ready to join · interested on the call {when} — offer not sent yet", button **"Prepare offer"**. The button is shown only when `canInvite` (OFFER_REQUEST and owner, or OFFER_APPROVE) (`ReadyToJoinStrip.tsx:44-62`, `outcome.json:94-97`).
10. **Pending-call strip(s)**: **"Call to {name} logged at {time} — no result yet"** + button **"Log result"** (`PendingOutcomeStrip.tsx:48-58`, `outcome.json:76-77`). (The old QA text "Your call … has no result yet" no longer exists.) The outcome wizard auto-opens on tab refocus after a call (`today/_hooks/usePendingOutcome.ts:16, 173`).
11. **Queue groups**, as section cards with counts:
    - "Overdue", "Within the hour", "Later today", "Another day", "No follow-up set", "Back to them today" (L300-345).
    - Fallback empty: "That is the list" / "Everything else is handled or scheduled."
    - Footer: "{n} invited loan officers are waiting on payment or signing → My invites" (link) and "All times: {tz}".

**4-column queue row** (`TodayColumnHeads.tsx:21-24`, `TodayQueueRow.tsx:195-364`)
- Columns: **Loan officer | Contact | Next step | (actions)**.
- Loan officer: avatar, name, source chip, resurface chip, then company + NMLS · states.
- Contact: plain email/phone text (not links).
- Next step:
  - Follow-up pill + "+N" + one instruction sentence. Examples: "Call before {time} or this lead goes back to the team", "Call again · no answer {date}", "No reply for # days", "No phone on file", "Contact now · due {when}", "Back to the pool {when} if nobody contacts them".
  - With no follow-up: dashed **"+ Add follow-up"** (needs ACTIVITY_LOG).
  - Meet/Zoom line; **"Send"** button when a send-info draft is scheduled.
- Actions:
  - Icon buttons Call / SMS / Email (tooltips "Call", "SMS", "Email"; disabled hints "No phone on file — email first, or log the result to mark Wrong information" / "No email on file — call or text first, …").
  - "Row actions" (⋯) menu:
    - **"Copy phone"**.
    - **"I already did this outside the app"** (if a follow-up is open; toast "Follow-up done — pick the next step" then opens the wizard) or **"Log result"** (no follow-up).
    - **"Manage follow-ups"**.
    - **"Hand off to a colleague…"** (unscoped and the row is mine).
- Selection mode: checkboxes, then a bottom bar "{n} selected" · **"Hand off {n} to a colleague…"** · **"Clear"** (L662-669).

### 2.2 Focus mode — `/today/focus` (`P/today/_components/FocusClient/index.tsx`)
- Back link **"Today"**, title **"Focus mode"**, progress "{done} handled · {left} left"; one candidate per screen; URL `?c=<id>` (L128, L297-306).
- Facts: "Loans since {year}", "State".
- Remind later: **"In 1 hour"**, **"This evening 5:00pm"**, **"Tomorrow 9:00am"**.
  - Disabled hints: "No follow-up to reschedule yet" / "It's already past 5pm today".
  - Toasts: "Follow-up rescheduled" / "Could not reschedule the follow-up".
- **"+ New follow-up"**, **"All follow-ups…"**.
- Navigation: **"Prev"** / **"Next"** (hint "Tip: press ← or → to switch person"), **"Skip"**, **"Log result"** (L439-536).
- Done state: "Queue clear 🎉" / "All {n} people handled this session — …".

### 2.3 Hot leads — `/inbox/hot` (`P/inbox/hot/_components/HotClient/index.tsx`, `HotRow.tsx`)
- Title "Hot leads".
- Stats: **"Waiting"**, **"Overdue"** (L131-141).
- Cap warning: "Showing the {shown} most urgent of {total} waiting (hot.queue_cap) — claim these first".
- Table columns: **Candidate | Source | Waiting | First-touch due | (action)** (L161-164).
  - Due cell texts: "Due in {time}", "Due soon · {time}", "Overdue {time}", "by {at}", "was due {at}". Tooltip "First-touch target: {hours} business hours" (and source/default/after-hours variants) (`hot.json:10-40`).
  - Candidate meta: "Phone on file" / "No phone", "Email on file" / "No email", "Last contacted {date}".
- Row action: **"Claim"** (needs CANDIDATE_CLAIM) (`HotRow.tsx:90-93`).
  - Toast "Claimed {name}"; error "Claim failed — someone may have beaten you to it".
- **Claim keeps the row in place** (`inbox/_shared/useClaimInPlace.ts:40-58`):
  - The row stays at its position with an orange chip **"Yours"**.
  - Claim is replaced by Call / SMS / Email icons + **"Log result"** (`inbox/_shared/ClaimedRowActions.tsx:41-53`).
  - The row is released once an outcome is saved (anywhere) or the page is left/reloaded.
  - Without ACTIVITY_LOG the row just leaves as before.
- Same pending-call strip ("Call to {name} logged at {time} — no result yet" / "Log result") above the table. The wizard auto-opens on refocus ONLY for rows claimed on this page (`inbox/_shared/useClaimOutcome.tsx:26-31`; strips/panels at HotClient L128/L207).
- Empty: **"Inbox zero — nothing waiting"** / "Every hand-raised lead has been claimed. New ones land here by themselves."
- Error: "Could not load the HOT inbox".

### 2.4 Cold list — `/inbox/cold` (`P/inbox/cold/_components/ColdClient/index.tsx`, `ColdRow.tsx`)
- Stats: **"Unclaimed"**, **"You hold"** (L135-142).
- Toolbar:
  - Search placeholder "Name, NMLS, company…".
  - Toggle button **"Has NMLS"**.
  - Page size select "{n} / page".
  - Params are in the URL (`cold/_hooks/useColdFilterUrl.ts`).
- Columns: **Candidate | Source | (action)**. Action **"Claim"**, with the same claim-in-place "Yours" + Call/SMS/Email + "Log result" behaviour as Hot.
- Pager: "{from}–{to} of {total} unowned candidates" + hint "newest import first — the default sort is config, never a hidden-field ranking".
- Empty: **"No candidates match"** / "Loosen a filter or clear the search."
- Error: "Could not load candidates".

### 2.5 Pipeline — `/pipeline` (`P/pipeline/_components/PipelineClient/index.tsx`)
**Header and toolbar**
- Title **"Pipeline"**; pill **"Your candidates"** for scoped program members (L375-377).
- **"Add lead"** only if CANDIDATE_CREATE AND the BE view-config has `native_candidate_create === true` (L112, L383).
- View toggle (table/board/cards; aria "Switch between table, board and card view"; options "Table view" / "Board view" / "Card view"), URL `?view=`, default `table`. Refresh icon "Refresh".
- Stage tabs: **"All"** + S0..S7 with hint "{stage} · reached {n} · dropped {n} · nurture {n}". No stage counts for scoped users.
  - Stage names: S0 "Unclaimed", S1 "New lead", S2 "Engaged", S3 "Verified", S4 "Meeting", S5 "Offer", S6 "Joined", S7 "Onboarded" (`today.json:10-17`).
- "Who collected the lead" segmented control — program members only: **"All" / "Collected by me" / "My team"**; "My team" only for TEAM_LEAD (L341-346, L419-427).
- Filters (all in the URL):
  - Search "Name, NMLS, company…".
  - Status select: "All statuses" / "ACTIVE — alive" / "NURTURE — parked" / "ARCHIVED — dropped" / "BLOCKED"; default ACTIVE (`usePipelineFilterUrl.ts:47-56`).
  - **"More filters"** popover (label "Filters · {n}", clear "Clear source, label and sort") holding Source ("All sources"), "Filter by label" ("All labels") and Sort: "Newest first" (default) / "Least recently touched first" / "Follow-up soonest first".
  - Toggle **"No owner yet"**.
  - Saved-filters menu.

**Table view**
- Columns: [checkbox "Select every row on this page"] **Candidate | Source | Stage | Status | Last touch | Follow-up | Owner | (menu)** (L571-590).
  - Last touch shows "today" / "# days ago" / "never".
  - Owner "— unowned" plus a **"Claim"** button. Toast: "Claimed {name} — they're on your Today now".
  - Status chips: Active / Nurture / Archived / Blocked / Dormant.
- Row menu ("Row actions"): **"Copy email"**, **"Copy phone"**, plus "Move to stage" → "Move to {S# · name}" when CANDIDATE_TRANSITION is held (`CandidateRowMenu.tsx:42-72`).
- Bulk bar (on selection) "{n} selected" (`PipelineBulkBar.tsx:58-126`):
  - **"Assign owner"** → "Hand these to…". Tooltip without the grant: "Needs CANDIDATE_TRANSFER unless every selected row is already yours". Hidden for scoped users (`showOwnershipActions`).
  - **"Export CSV"**.
  - **"Archive…"** (CANDIDATE_ARCHIVE). Modal "Archive {n} candidates", "Reason (optional)", placeholder "e.g. Not licensed in any target state", buttons **"Archive {n} rows"** / **"Cancel"**.
  - **"Clear"**.
  - Toasts: "{n} candidates now owned by {name}", "{n} candidates archived", "{n} rows skipped — already in that state", "{n} rows did not complete: {reason}", "Bulk action failed — nothing was changed", "Exported {n} rows — volume/units are never in the file".
- Pager "{from}–{to} of {total} candidates".

**Board (Kanban) view** (`PipelineBoard/index.tsx:36-109`, `BoardColumn.tsx:94-156`)
- Columns S0..S7, each loading separately. Fold/unfold: "Fold {title}" / "Show {title} ({count})".
- Drag-drop between stages only with CANDIDATE_TRANSITION. Cards in S0 are not draggable and S0 is not a drop target.
  - Drop zone "Drop here". Toasts "Moved {name} to {stage}" / "Could not move this candidate".
- Empty column "No candidates"; error "Could not load this column" + **"Retry"**; **"Show more ({n} left)"**.
- Card shows last touch, owner or "— unowned" + **"Claim"**.

**Cards view** (`PipelineCards/PipelineCard.tsx:57-140`)
- Card with checkbox, Source, Owner, Stage, Last touch, Follow-up, **"Claim"**; click "Open {name}".

**Empty and error states**
- "No candidates match" / "Loosen a filter or clear the search."
- With a collected filter: "Nobody here yet" / "No lead matches this filter. Leads that sign up through the program pages show up here."
- Unlinked program account: "Your program account isn't linked yet" / "An admin links it after checking with you. Until then, this filter shows nobody."
- Team lead without a team: "You have no team yet" / "No program member is on your team yet, so this shows only your own leads." (L528-548, L572-575).
- Error: "Could not load the inventory".

### 2.6 Exceptions — `/exceptions` (manager; `P/exceptions/_components/ExceptionsClient/index.tsx`)
**Stats**
- **"Overdue"**, **"Unclaimed"**, **"Claimed, not contacted"** (REPORT_TEAM), **"Unowned"**, **"Owned"**, **"Pending approval"** (OFFER_APPROVE; red if any offer SLA is breached) (L217-265).
- Cap warning: "The HOT queue is capped — clear these alarms and the rest surface."

**Offers waiting for approval are no longer listed here.** Only a link shows: **"{n} offers wait on your decision → Today"** → `/today#decisions` (L276-282, `exceptions.json:82`).

**Sections, in order**
1. **"Past their SLA"**, then **"Unclaimed after {minutes} min"**.
   - Columns: Candidate | Source | Waiting | First-touch due | actions.
   - Actions: **"Claim"** and **"Assign"** menu ("Assign to"; tooltip without the grant "Assigning needs the CANDIDATE_TRANSFER grant (manager tier)").
   - Toasts: "Claimed {name} — they're on your Today now", "Assigned {name} — cleared from Exceptions and Hot leads", "Assign failed" (`ExceptionRow.tsx:65-79`, `AssignMenu.tsx:33-47`, index L131-158, L287-288).
2. **"Claimed, not contacted yet"** (REPORT_TEAM; hidden on 403/404).
   - Columns: Candidate | Owner | Claimed | Contact deadline.
   - Sub-texts: "Releases in {time}" / "Releasing now" / "Due in {time}" / "Overdue by {time}"; tags "assigned by a manager", "already in conversation".
   - Actions: **"Remind"** (popover with "Note for {name} (optional)", **"Send reminder"**, "Cancel"; inline "Your lead" / "Reminded · again {when}"), **"Take back"** (confirm "Take this lead back?" → "Take back"), and Assign.
   - Toasts: "Reminded {owner} to contact {name}", "{name} is back in the Hot pool", conflict/cooldown texts (`ClaimedIdleSection/*`, `exceptions.json:31-69`).
3. **"Ready to join, invite not sent"**.
   - Subtitle "Shows after {n} days" + link **"Change in Settings"**.
   - Columns: Candidate | Recruiter | Interested since | Waiting | Call note.
   - Action **"Remind {name}"**; disabled reason "Can't remind right now — this is your own candidate, or a reminder went out recently".
   - Truncation: "Showing {shown} of {total} — the rest are past the list cap" (`ReadyToJoinSection/index.tsx:92-119`, `ReadyToJoinRow.tsx:65-83`).

**Empty and error states**
- All clear (only when every section is 0 and the offers queue is 0): **"No alarms — every hot lead is on time"** / "Leads land here only when their first-touch SLA is blown or nobody claims them in time." + "The Cold list is a different question: {count} people still have nobody on them." (L337-355).
- Errors: "Could not load the HOT queue"; "Could not load the claimed-but-not-contacted list — try reloading."; "Couldn't load the ready-to-join list — try reloading the page."

### 2.7 My invites — `/invites` (`P/invites/_components/InvitesClient/index.tsx`, `InviteRow.tsx`)
- Title **"My invites"**.
- Clickable status cards (aria "Filter by status"): **"In progress"** (default), "Waiting approval", "1-1 pending", "Paying & signing", "Signed", "Declined", "Expired". A dot means "has new updates".
  - Hidden updates line: "{n} updates in other statuses" + **"Show"** (L289-313).
- Filters (URL params `stage`, `range`, `from`, `to`, `q`, `currentPage`, `pageSize`):
  - Search "Search name or NMLS".
  - "Requested" range: "Last 7 days" / **"Last 30 days" (default)** / "This quarter" / "All time" / "Custom…" (From/To, "Pick both dates to apply the range.").
  - Sort hint "Waiting longest first · late ones in red".
  - Page size default 25 (`_hooks/useInvitesFilterUrl.ts:27-46`, `_utils/dateRange.ts:6`).
- Columns: **Candidate | Status | Progress | Waiting | With | (action)**.
  - Statuses: "Waiting approval", "Invited · 1-1 pending", "Paying & signing", "Signed", "Declined", "Expired"; NEW tag on unseen rows.
  - Progress: "Now: manager approval" / "Now: 1-1 meeting" / "Now: pay & sign" / "All steps done" / "Stopped at approval" / "Never finished"; detail lines such as "Fee paid / Fee waived / Fee not paid yet", "Signed {when}", "1-1 {when}".
  - With: "Waiting on a manager" / "Onboarding: {name}" / "Onboarding: not assigned yet".
- Row action (`_utils/inviteView.ts:58-66`):
  - WAITING_APPROVAL → **"Remind manager"**.
  - DECLINED → **"Edit & resend"**.
  - INVITED_1ON1_PENDING and late with a specialist → **"Remind onboarding"**.
  - Otherwise **"Open"**.
  - A resend-invite control replaces these when the delivery can be resent (`InviteRow.tsx:126, 180-215`).
  - Toasts: "Reminded the managers about {name}", "Reminded {who} about {name}", "Already reminded — you can remind again a little later", "Only the lead's owner or a manager can invite." (resend blocked).
- Empty: **"No invites in this status"** / "Try another status card or a wider date range."
- BE without the endpoint: "My invites isn't available yet" / "This server hasn't been updated for My invites. …"

### 2.8 My referrals — `/my-referrals` (`P/my-referrals/_components/MyReferralsClient/index.tsx`)
- Title "My referrals"; description "Since {date}" / "This period".
- Stats: **Referred, In progress, Onboarded, Bonus pending, Bonus paid** ("some not yet determined" / "Unavailable") (`ReferralStats.tsx:19-58`).
- Filters (`shared/components/ReferralFilters`):
  - Entry page chips: "All ({n})", "Program · /join /recruit ({n})", "Referral · /refer-a-loan-officer ({n})".
  - Bonus: "Any status" / "Not yet eligible" / "Waiting for day 60" / "Check requested" / "Paid" / "Not yet determined".
  - **"Stalled only"**, "Since" date, **"Clear filters"**.
- Cards per referred person:
  - Stage, status ("Stalled · no recent touch", "Onboarded", "Not continuing", "In progress").
  - Milestones: Referred, First recruiter touch, Offer sent, Agreement signed, Fee paid or waived, HR account created, HR completed, Licensing sponsorship done, Setup call, Onboarded ("Not yet" / "Not tracked").
  - Bonus block (day-60 countdown, MOSO check steps Requested / Commission approved / Paid).
  - Masked card "New referral — pending review".
- Footnote: "Amounts and dates come from MOSO/Accounting. You only see progress milestones, never call notes, reasons or production numbers."
- Empty and error states:
  - "No referrals yet" / "People you refer to LoanFactory show up here with their progress."
  - Filtered: "No referrals match these filters" / "Clear a filter to see more."
  - Unlinked: "Your account isn't linked to a referral profile yet".
  - Flag off: "Referrals aren't available yet".
  - Source down: "Referral data is temporarily unavailable" + "Try again".

### 2.9 Referrals by referrer — `/referrals` (`P/referrals/_components/ReferralsAdminClient/index.tsx`)
- Title **"Referrals by referrer"**; same filters plus **Referrer** ("All referrers ({n})").
- Button **"Export CSV"** (tooltip "Every row that matches the current filters, not just this page").
  - Toasts: "Export downloaded", "More referrals match than one export can carry. …", "Referral data is temporarily unavailable, so nothing was exported. …", "The export failed. Try again."
- Table grouped by referrer, with group header "{n} referred · X onboarded · Y bonus pending · Z paid".
  - Columns: **Referred person | Entry page | Stage | Recruiter | Joined / onboarded | Eligible from | MOSO check | Amount | (Open)** (L30-37, `AdminReferralRow.tsx:46-78`).
- No permission: "You don't have access to this view" / "Referrals by referrer is for managers and admins."
- Flag off: "Referrals aren't available yet".

### 2.10 Program members — `/permissions?tab=program-members` (tab inside Permissions)
- Tabs: Grants (always) and **"Program members"** (only RBAC_MANAGE, once permissions are known) (`P/permissions/_components/permissionsTabs.ts:1-11`).
- Intro text: "LO Recruiter Program members who need a recruit account linked, or who were suspended. Nothing links on its own: check each person outside the app, then link them."
- Columns: **Member | State | Approved | Matching accounts**.
  - State: "Waiting to link" / "Suspended".
  - Expand "Show matching accounts for {name}".
- Actions:
  - **"Link"** / **"Link again"**. Modal "Link {name}": "Recruit account", checkbox "I checked with this person outside the app that this account is theirs", optional "Why link it anyway", "Reason" (min-length message "Write at least {n} characters."), submit **"Link account"**.
  - **"Reject"** (modal "Reject the match for {name}", submit "Reject").
  - **"Unlink"** — suspended members only.
- Toasts: "{name} is linked." / "{name} is linked. Roles added: {roles}." / "The match for {name} was rejected." / "{name} is unlinked. N leads went back to the pool."
- Empty: "Nobody is waiting" / "Every approved program member is linked."
- Directory down: "The company directory is not answering" (Link/Reject off).
- Source: `permissions.json:99-165`, `P/permissions/_components/ProgramMembers/*`. Details belong to the Permissions fork.

### 2.11 Reports — `/reports` (`P/reports/_components/ReportsClient/index.tsx`)
- Title "Reports"; description "Last {days} days".
- Tabs (`?tab=`): **"Activity"** (default) / **"By month created"** (L54-57, L113-114).
- Button **"Export CSV"** (hint "Downloads the table above as it is now — one row per recruiter; …").
- A recruiter without REPORT_TEAM sees the tag **"Your numbers"** and only their own row (L42, L129). The menu entry is MANAGER-only, but the URL opens for anyone.

**Activity tab**
- Stats: **Open, Touches, Avg first touch (h), Neglected**.
- Table: **Recruiter | Holding | Touches today | Touches {d}d | Stage moves | First touch avg | Quiet ≥{warn}d | Quiet ≥{danger}d ⚠**. Tooltip "Averaged over {count} first touches — small samples swing hard".
- Card **"Unclaimed age — candidates nobody is working"**: "Median wait", "Worst 10% wait", "Untouched > {days}d" (`UnclaimedAgeCard.tsx`).

**By month created tab**
- "Holdings by month created" pivot with a "Window total" column. Click a cell (hint "Click for the names behind this number") to open a modal "{name} — created {month}".
- Empty: "No owned candidates in this window".

**Empty and error states**
- "No numbers yet" / "Rows appear as soon as someone owns a candidate or logs an outbound touch."
- Error: "Could not load the report".

---

# Part B: care-taking screens, Department work, Send to HR (recruit-fe origin/master 1fc5521b)

Paths are relative to `src/`. `P/` = `app/[locale]/(private)/`. `msg/` = `messages/en/`.
The JSON key comes first, then the exact English string. "UNCONFIRMED" marks a guess that the code does not settle.

Sidebar gating for these screens, from `P/_components/recruitNav.tsx:200-297`. The Layout labels are in `msg/layout.json:9-54`.

| Label | Route | Gate |
|---|---|---|
| Department work | `/work` | permission `CHECKLIST_READ` + role in `DEPT_WORK` = MANAGER, ONBOARDING, ACCOUNTING (`recruitNav.tsx:117,204-210`) |
| Sponsorships | `/sponsorships` | `CHECKLIST_READ` + ADMIN only in the menu (`:215-220`). The route still opens for anyone the backend lets in. |
| Templates | `/templates` | `TEMPLATE_CREATE` (`:228`) |
| Duplicates | `/duplicates` | role MANAGER_ONLY (`:229-234`) |
| Dormant | `/dormant` | roles = recruiter group + MANAGER (`:115,239`) |
| Conversations | `/conversations` | roles = recruiter group + MANAGER + ONBOARDING (`:118,243-248`) |
| Audit | `/audit` | `AUDIT_VIEW` (`:250`) |
| Settings | `/settings` | `SETTINGS_MANAGE`. Seeded to no role, so in practice ADMIN only, through `*` (`:260-263`). |
| Checklist templates | `/checklist-templates` | `CHECKLIST_READ` + any one `CHECKLIST_TEMPLATE_MANAGE_<dept>` (`:268-274`) |
| Licensing rules | `/licensing-rules` | `LICENSING_RULE_MANAGE` + ADMIN only (`:277-283`) |
| Permissions | `/permissions` | `RBAC_MANAGE` (`:286`) |
| Connections | `/settings/connections` | No permission or role gate. Feature `google_connect`: the entry is hidden when `/me/google` status answers 404 (`:288-296`, `:326-327`). |

Route guard: the nav entry with the most specific `href` decides the required permission. So `/settings/connections` does NOT need `SETTINGS_MANAGE` (`P/_components/routeGuard.ts:14-24`).

---

## 1. Department work (`/work`)

File: `P/work/_components/WorkQueueClient/index.tsx`. Strings: `msg/workQueue.json`.

### Layout
- **Page title:** "Department work" (`index.tsx:304-306`).
- **Department switch:** a SegmentedControl with only **Onboarding | Accounting** (`QUEUE_DEPARTMENTS = ['ONBOARDING','ACCOUNTING']`, `apis/recruit/checklist.api.ts:23`). HR, Licensing and IT are not in the switch.
- **Default department:** the first one whose `CHECKLIST_ITEM_MANAGE_<DEPT>` the user holds. Admin (`*`) and read-only users land on Onboarding (`workQueue.ts:160-170`). The URL keeps `?dept=`, `?f=` (filter) and `?tpl=1on1`.
- **"1-1 meetings" toggle** (`tpl_1on1_toggle`, `index.tsx:312-324`):
  - Shows only on Onboarding.
  - Narrows the list on the server to template `ONB_PREMEETING` (`checklist.api.ts:189`).
  - Once loaded it shows a count badge, or "200+" when the list is at the cap.
  - Switching department removes `tpl`.
- **Stat cards** (clickable filters, `WorkStatCards.tsx:29-54`): "Open", "Overdue", "Due today", "Blocked" (`stat_*`, json:9-12).
- **Table columns:** "Candidate", "Task", "Due", "Status" (json:13-16).
  - The candidate cell shows stage · state · `NMLS <id>`. Clicking it opens the candidate drawer (`index.tsx:425-440`).
- **Due cell values:**
  - "Due today" or "Due today · late"
  - "Tomorrow"
  - "{n} day(s) late"
  - a short date
  - "—"
  - Overdue rows are styled gold and carry the tooltip "Past due — this is the reminder" (json:26,52-55; `index.tsx:497-503`).
- **Status chip:** "Open" / "In progress" / "Blocked" / "Done" / "Not applicable". It is overridden on Onboarding rows (`workQueue.ts:132-150`):
  - "Needs owner" (amber) when the item is not done and has no specialist.
  - "Not sent" (red) when Done and the write-back is DEAD_LETTER.
  - "Syncing" (amber) when Done and the write-back is PENDING.
  - The two Done overrides apply only while `writeback_enabled` is on (`index.tsx:392-393`).

### Banners and notices
- **Read-only:** "You can see {dept}'s work, but only {dept} can close it." Shown when the user lacks `CHECKLIST_ITEM_MANAGE_<dept>` (json:27; `index.tsx:348-352`).
- **At 200 rows:** "Showing the first 200, oldest due first. There may be more." On Onboarding with the toggle off it adds: "… — turn on the "1-1 meetings" filter above to narrow to just those." (json:58-59; `index.tsx:358-364`).
- **Error:** "Could not load the work list" / "The list did not come back. Reload the page; if it keeps failing, the service is the place to look." (json:48-49).
- **Access denied (403):** "You cannot see department work" / "This screen needs the CHECKLIST_READ grant." (json:50-51).
- **Empty:** "Nothing open" / "{dept} has no open work right now. New tasks appear here by themselves when a candidate reaches onboarding."
- **Filter empty:** "Nothing in this filter" / "Pick another card above to see the rest." (json:44-47).

### Row actions (generic, for users with the manage grant and a row that is not Done; `index.tsx:533-596`)
- **"Done"** marks the item done in one click. When the onboarding write-back is on, the button reads **"Done…"** and opens a modal (see 1.3).
- **"Blocked…"** opens a reason modal. On a blocked row the button is **"Unblock"** instead, which moves the item back to Open.
- **"N/A…"** opens a reason modal.
- **Reason modal** (`ReasonModal.tsx:36-55`; json:34-43):

  | | Blocked | N/A |
  |---|---|---|
  | Title | "Blocked" | "Not applicable" |
  | Field label | "Why" | "Why" |
  | Description | "Everyone waiting on this reads this line instead of e-mailing you." | "Counts as finished for onboarding, so say why it does not apply." |
  | Placeholder | "e.g. waiting on SC, filed 09/15" | "e.g. lives in Texas, GA background check does not apply" |
  | Confirm button | "Mark blocked" | "Mark not applicable" |

  - The confirm button stays disabled until the reason has at least **4 characters** after trimming (`ReasonModal.tsx:15,30`). There is no error text; the button simply stays disabled.
  - Cancel button: "Cancel".
- **Success toasts:** "Done: {title}" / "Reopened: {title}" / "Marked blocked: {title}" / "Marked not applicable: {title}".
- **Error toast:** the backend message, or "Could not update this task" (json:28-33; `index.tsx:178-189`).

### 1.1 1-1 meetings (`ONB_PREMEETING` row): scheduling
Each Onboarding row carries an `onboarding_meeting` block. What the Task cell shows (`index.tsx:447-495`):
- **Specialist line** (shown even with the write-back off):
  - "Specialist: {name}", or
  - "No specialist yet." in amber.
- **Meeting state** (`plannedMeetingState`, `workQueue.ts:270-281`):
  - Not scheduled: "Not scheduled yet".
  - Planned or time passed: **"Planned {when}"**. The time is always formatted in America/Los_Angeles, e.g. "Thu, Oct 2 · 10:00 AM–10:30 AM PDT" (`workQueue.ts:283+`). After it come `+N colleague(s)` and buttons (`PlannedMeetingLine.tsx:59-105`):
    - **"Join Meet"** when the link is meet.google.com; otherwise **"Join"** (opens the link).
    - **"Open in Google Calendar"**: only when no live API event exists (template mode).
    - **"Copy Meet link"**. Toast "Meet link copied", or on failure "Could not copy — copy it yourself".
    - A warning icon with tooltip "Not a recognized Meet/Zoom/Teams link" for an unknown host.
    - "Meet link coming" while the API event is PENDING or LINK_PENDING.
    - "Couldn't create the Google event — add a link yourself" (red) when the API event FAILED.
  - Time passed: "Meeting time has passed. Did it happen?"
  - Closed with a future invite: "Remember to cancel the invite in Google Calendar." (json:111-112).
- **No specialist on an open row:** the action cell shows **"Pick a specialist first"** (`index.tsx:522-532`).
  - It is a button only when the user has `ONBOARDING_SPECIALIST_ASSIGN` AND the write-back is on. Otherwise it is plain text.
  - The button opens a modal (`AssignSpecialistModal.tsx:56-79`; json:96-101):
    - Title "Assign the onboarding specialist"
    - Select "Specialist", placeholder "Pick a specialist" (or "Loading…")
    - When nobody is available: "No ONBOARDING-role user is available to assign"
    - Buttons "Cancel" and "Assign"
  - Success toast: "Specialist assigned: {name}". Note: `{name}` is filled with the **candidate's** name, not the specialist's (`useAssignSpecialistActions.ts:49`). This looks like a copy bug.
- **"Schedule 1-1" / "Reschedule"** (`index.tsx:537-549`):
  - Shown only to a user who has the manage grant AND is the row's assigned specialist (`canScheduleMeeting`, `workQueue.ts:221-225`).
  - "Schedule 1-1" when not scheduled (primary button). "Reschedule" when planned or the time has passed.
  - Button emphasis: when not scheduled, Schedule is primary and Done… is secondary. When the time has passed, Done… is primary.
- **Schedule modal** (`ScheduleMeetingModal.tsx:170-292`):
  - Title "Schedule the 1-1", or "Reschedule the 1-1" when a slot already exists. It shows the candidate name and the item title.
  - **Google calendar mode** (`CalendarMode/calendarMode.ts:22-37`):
    - `api`: the backend events flag is on AND the user is connected.
    - `connect`: not connected, or `reconnect` when the connection broke.
    - `template`: the flag is off or the feature returns 404.
    - `error`: the status read failed.
  - **Connect banner** (`CalendarConnectBanner.tsx`; json:149-157):
    - Not connected: "Google is not connected, so this 1-1 is saved here and you create the event and Meet link in Google Calendar yourself." with button **"Connect Google"**.
    - Broken connection: "Your Google connection stopped working, so this 1-1 is saved here and you create the event and Meet link in Google Calendar yourself." with button **"Reconnect"** (red).
    - While waiting on the popup: "Stop waiting".
    - Errors: "Allow pop-ups for this site, then try again." / "Google was not connected."
    - Status error alert: "Couldn't check your Google connection. Try again." with button "Try again".
  - **Fields:**
    - "Date": a native date input.
    - Start time Select, labelled "Start time (your time zone: {zone})", or "Time" when the zone is unknown. The options are **30-minute slots** from 00:00 to 23:30 (`timeSlots.ts:2-10`) and the field is required.
    - Under the time: "Company time (Los Angeles): {when}".
    - "Length" with description "Default from Settings." Options are "15 minutes", "30 minutes", "45 minutes", "60 minutes", plus the current value if it is something else (`meetingLength.ts:2`).
      - The default comes from the backend `default_minutes`, falling back to 30 (`workQueue.ts:208`).
      - There is no UI in `/settings` to change this default. UNCONFIRMED where it is configured.
    - "Guest": read-only text. It is the loan officer's e-mail, or one of the messages below (`guestCopy.ts`; json:122-128).
  - **Guest messages by case:**

    | Case | Template mode | API mode |
    |---|---|---|
    | Not allowed | "Not added — add a guest yourself in Google Calendar if you need one." | "Not invited. Only the event is created on your calendar; no invite goes out." |
    | No e-mail | "This loan officer has no e-mail on file." | "This loan officer has no e-mail on file, so only the event is created; no invite goes out." |
    | Checking | "Checking whether the loan officer will be invited…" | same |
    | Check failed | "Couldn't check whether the loan officer will be invited." | same |

  - **"Colleagues"** (API mode only, `ColleaguePicker.tsx:30-37`):
    - Multi-select, hint "They get a Google Calendar invite.", placeholder "Search by name or e-mail".
    - "No one found" when nothing matches.
    - Maximum **10** colleagues (`colleagues.ts:17`). Suggested colleagues are pre-filled.
    - When the directory fails to load: "Couldn't load colleagues. Those already added stay."
    - When the backend rejects one: a red alert "Some colleagues can't be invited. Remove them and try again." The modal stays open (`useScheduleMeetingActions.ts:89-92`).
  - **Meeting link:**
    - Template mode: input "Meeting link (optional)", description "Paste the Google Meet link after you save the event in Google.", placeholder "https://meet.google.com/…". Validation: "Has to start with https://".
    - API mode: the server-made link shows read-only as "Meeting link" (only when one exists).
  - **Template mode only:** a "Next" box listing three steps (json:141-144):
    1. "Google Calendar opens with this filled in, under your account."
    2. "Check that Google Meet is added, then save in Google. Google e-mails the invitation."
    3. "This row shows the planned time. If you move it in Google, change it here too."
  - **Confirm button** (disabled until date, time, valid link and calendar mode are all ready, and the guest check is not pending):

    | Mode | Guest case | Label | Success toast |
    |---|---|---|---|
    | Template | any | "Save & open Google Calendar" | "Saved — opening Google Calendar…", then a new tab opens with a pre-filled Google Calendar event |
    | API | guest will be invited | "Save and send invite" | "Saved. Google is creating the event and Meet link." (no tab opens) |
    | API | no guest | "Save and create event" | same as above |
    | API | guest check pending or failed | "Save" | same as above |

    Sources: `guestCopy.ts:25-30`, `useScheduleMeetingActions.ts:77-86`.

### 1.2 Write-back state on a Done 1-1 row (only when `writeback_enabled`; `index.tsx:457-471, 597-626`)
- **PENDING:** "Sending to MOSO…" or "Sending to MOSO — {detail}". The detail is one of `pending_WAIT_*` (json:183-190), for example:
  - "waiting for the 1-1 meeting to reach MOSO first"
  - "waiting for an onboarding specialist to be assigned and reach MOSO"
  - "waiting for the recruiter to confirm the loan officer's legal name in Profile"
  - "waiting for the loan officer to finish the registration form"
  - "waiting for licensed and sponsor states"
  - "waiting for W-2 / 1099 to be set in MOSO for this loan officer"
- **DEAD_LETTER, generic:** "MOSO did not accept it — missing: {fields}. Fix it, then send again."
  - Field names include "W-2/1099 choice", "Sponsor states", "Licensed states", "Legal first name", "Legal last name", "Street address", "City", "Address state", "ZIP code", "NMLS number".
  - Each name is followed by "fix in Recruit" or "fix in MOSO" (json:66-80).
  - Buttons: **"Open profile"** (opens the drawer edit modal on the licensing tab; only when a field can be fixed in Recruit) and **"Send again"** (toast "Sent again").
- **DEAD_LETTER, hire codes** (`workQueue.ts:386-396`; json:178-182):

  | Code | Message | Open profile | Send again |
  |---|---|---|---|
  | HIRE_CLASSIFICATION_MISSING | "MOSO still needs W-2/1099. Pick it on the candidate's profile, then send again." | yes | yes |
  | HIRE_CLASSIFICATION_MOSO_OWNED | "MOSO won't record the meeting without W-2 or 1099, and Recruit doesn't send one for Corporate or Mortgage advisor. Onboarding is still deciding how these are handled." | no | no |
  | MOSO_HIRE_CLASSIFICATION_UNSUPPORTED | "MOSO still needs W-2/1099. MOSO's version can't take W-2/1099 yet. Ask the MOSO team, then send again." | no | yes |
  | MOSO_HIRE_CLASSIFICATION_IGNORED | "MOSO recorded the meeting but ignored the W-2/1099 choice, so the agreement may be the wrong one. In MOSO, set Loan officer type to {choice}, then use "Re-generate e-sign documents and send email"." | no | no |

  - The hire-code buttons also require `hire_classification_enabled`.
- **Welcome e-mail banner** (Done row with `welcome_email_blocked`; `WelcomeEmailBanner.tsx:101-161`; `msg/agreement.json:4,55-61`):
  - Message: "The onboarding e-mail was not sent: the person who marked the 1-1 done has no branch in MOSO, so MOSO couldn't sign it. A MOSO admin needs to set their branch."
  - Optional second line: "MOSO said: {reason}".
  - Button **"E-mail the signing link…"** (needs `AGREEMENT_SEND`) opens the agreement confirm modal.
  - Once the link is sent, the banner is replaced by "Sending the signing link…" / "Signing link sent {time}".

### 1.3 "Done…" on a 1-1 row (write-back on)
Which modal opens depends on `hire_classification_enabled` (`index.tsx:223-230, 653-692`).

**A. With hire classification on: `OnboardingHireMeetingModal.tsx`**
- Title "Mark the 1-1 meeting done". Sub-line "{title} · Specialist: {name}".
- No specialist: warning "No specialist is assigned yet — MOSO will not have an owner for this loan officer until you assign one from this screen."
- **"Meeting date"** (date picker, max = today in the meeting's zone):
  - Default description: "The day you met the loan officer. Today by default."
  - When a slot was scheduled: "{day}, as scheduled. Change it if the 1-1 was on another day."
  - When the scheduled day is still in the future: "Scheduled for {day}, which hasn't come yet, so today is filled in. Change it if the 1-1 was on another day."
  - Future date error: "The meeting has to have happened already. Pick today or an earlier day."
- **"W-2 or 1099?"**, a required radio group (json:169-173):
  - "W-2 · Outside loan officer"
  - "1099 · Independent loan officer"
  - "Corporate"
  - "Mortgage advisor"
  - It is pre-selected only from the candidate's `lo_type`. The registration value is only a hint: "MOSO has {choice} from the registration form. Confirm it with the loan officer."
- After choosing W-2 or 1099, a warning: "MOSO builds the agreement from this choice when it records the meeting. Changing it later won't update that agreement by itself."
- After choosing Corporate or Mortgage advisor, a note (`meeting_hire_manual_note`): "Corporate and Mortgage advisor staff don't sign … Recruit sends no W-2/1099 for {type} … This row will say so."
- Buttons: "Cancel" and **"Mark done"**.
  - "Mark done" is disabled until a type is picked. The hint under it reads "Pick W-2, 1099, Corporate or Mortgage advisor first."
  - Success toast: "Done: {title}".

**B. With hire classification off: `OnboardingMeetingModal.tsx:76-137`**
- Same title and date field.
- Description when the date comes from a schedule: "From Google Calendar."
- Note when the date was clamped: "Scheduled for {day}. The date can't be in the future."
- Box "After you save":
  - "Recruit sends this to MOSO."
  - "This row shows "Sent to MOSO" once it is delivered."
- Confirm button **"Mark meeting done"**.

**C. With the write-back off:** the button reads plain "Done" and completes in one click (`index.tsx:229`).

### 1.4 The same items in the candidate drawer: "Onboarding checklist"
File: `shared/components/CandidateChecklist`. Strings: `msg/checklist.json`, `msg/checklistReason.json`.

**Placement:** in the drawer Overview tab, passed as the `checklist` slot (`CandidateDrawer/index.tsx:310-322`).

**Heading:** "Onboarding checklist". Progress line:
- "{done} of {total} tasks done" (accessible label); the visible label is "tasks done".
- "· {n} ruled out" when some items are N/A.
- "{depts} still open".

**Department groups:** HR, Licensing, Onboarding, Accounting, IT (`checklist.ts:8`). Each group shows "{n} open" or "nothing open", plus one tag:
- "you can move these": the user holds that department's manage grant.
- "{dept} moves these": another department owns them.
- "HR is tracked outside this app" / "Licensing is tracked outside this app": HR and Licensing are always read-only (`checklist.ts:14`; `index.tsx:226-231`).

**Empty and error states:**
- Before S6: "No checklist yet — the onboarding 1-1 appears when the offer is sent, and the remaining tasks when the candidate reaches S6."
- No items at all: "No checklist items were generated for this candidate."
- "{depts} tasks are created when the candidate reaches S6." / "No {depts} work applies to this candidate."
- 403: "You do not have access to this candidate's checklist."
- Load error: "Could not load the checklist. Close and reopen this candidate to try again."

**Row** (`ChecklistRow.tsx:77-145`):
- Status chip.
- "due {date}", "{n} day(s) late", "done {date} · {name}".
- Buttons "Done", "Block" (or "Unblock"), "N/A". A closed row has "Reopen".
- **The 1-1 item (`ONB_PREMEETING`) is special:**
  - "Done" is disabled, with the hint "Done needs the meeting date — mark this one from the Onboarding queue."
  - Once done: "Marked done from the Onboarding queue. It can't be reopened from this panel." No Reopen button.

**Reason modal** (`ChecklistReasonModal`; min 4 characters):

| | Block | N/A |
|---|---|---|
| Title | "Block this task" | "Mark not applicable" |
| Field label | "Reason" | "Reason" |
| Description | "What is it waiting on? Stored in this item's audit trail." | "Stored in this item's audit trail." |
| Confirm button | "Block" | "Mark N/A" |

**Toasts:** "Updated “{title}”" / "Could not update that task." (or the backend message).

---

## 2. Send to HR (candidate drawer)
File: `shared/components/SendToHr/index.tsx`. Strings: `msg/drawer.json:54-84`.

**Visibility.** The block renders only when all of these hold:
- the user has `CANDIDATE_HR_HANDOFF`,
- the candidate stage is `S6`, and
- `GET hr-handoff` returns `enabled: true` (`index.tsx:60-67`).

It is also hidden when the drawer is read-only (`!canWrite`) and the candidate has not been sent yet (`:82`; `CandidateDrawer/index.tsx:326-337`). It sits in the Overview tab.

**Already sent:**
- Green alert "Sent to HR · {when}", or red "Sending to HR failed. Ask an admin to check the handoff."
- Under it: "Changes made after sending are not sent to HR again." There is no resend button (`:69-78`).

**Not sent yet:**
- Green button **"Send to HR"**, disabled while `!ready` or while a send is pending (`:124-150`).
- **Blockers:** a list under the button (`missing[]`). Items with a fix path are underlined links that open the profile edit modal on the right tab (`FIX_TAB`, `:17-35`). Exact strings:
  - "The candidate is not in Joined yet"
  - "The candidate is archived"
  - "The offer is not signed and paid (or waived) yet"
  - "First name is missing" / "Last name is missing" / "Personal email is missing" / "NMLS number is missing"
  - "1-1 outcome: loan officer type is missing" / "1-1 outcome: employment type is missing"
  - "First name can only contain letters, spaces and ' . - . Fix it in Profile" (and the same for Last name)
  - "Personal email is not valid. Check it for typos"
  - "NMLS number is not valid. Use 4–12 digits, not starting with 0"
  - "Loan officer type is not one HR accepts. Pick it again in Licensing"
  - "Employment type is not one HR accepts. Pick it again in Licensing"
  - "Loan officer type and employment type don't match: 1099 (Independent) goes with Contract. Fix one in Licensing"
  - Fallback: "Another detail is missing. Check the Profile tab"
- **Warnings:** under the title "Good to fix (won't block)":
  - "Legal name is not confirmed. HR will ask for it". The link version adds "(see Profile)" and switches the drawer to the Profile tab with focus on the legal name.
  - "Phone number is missing. HR will ask for one"
  - "Phone number is not a valid number. HR will ask for one"
  - "Phone number is a landline. HR needs a mobile number, so it will be left out"
  - "Mailing address is missing. HR will ask for it"
  - Fallback: "Another detail is worth checking. Check the Profile tab"
- **No confirm modal:** one click sends.
- **Toasts:** "Sent to HR" / "Could not send to HR. Check what is missing and try again."

---

## 3. Duplicates (`/duplicates`)
Files: `P/duplicates/_components/DuplicatesClient/*`. Strings: `msg/dedup.json`.

**Shown:**
- Stat cards "Same NMLS" and "Same email".
- When the list is truncated: "Showing {shown} groups — NMLS and email matches have separate limits, so clearing one kind loads more of that kind."
- One card per group. The header is "NMLS {value}" or the email, followed by "{count} rows".
- Columns: Keep (radio), Candidate, Stage, Owner ("unowned" when empty), Created, Last touch ("today", "{n} days ago", or "never").

**Merge:**
- Hint text: "The kept row wins every field it has; the others only fill its gaps. Their history moves over — nothing is deleted."
- The merge is two steps, without a modal (`DuplicateGroupCard.tsx:171-189`):
  1. Click **"Merge {count} into selected"**.
  2. The button turns red and reads **"Confirm merge"**, with a "Cancel" button next to it.
- Without `CANDIDATE_MERGE` the button is disabled, with the tooltip "Merging needs the CANDIDATE_MERGE grant (manager tier)".
- Toasts:
  - "Merged {ok} rows into {name}"
  - "Merged {ok}, failed {failed} — the queue has been refreshed"
  - "Merge failed — reload and try again"

**Empty:** "No duplicates found" / "New groups appear here whenever two rows share an NMLS or email."

**Error:** "Could not load duplicates" / "The queue endpoint answered with an error — try reloading."

## 4. Dormant (`/dormant`)
Files: `P/dormant/_components/DormantClient/*`. Strings: `msg/dormant.json`.

**Shown:**
- Search box, placeholder "Name, NMLS, company…".
- Sort: "Newest first" or "Longest silent first".
- Page size: "25 / page", "50 / page", "100 / page" (`useDormantFilterUrl.ts:18-20`).
- Columns: Candidate, Source, Stage, Last touch, Owner ("— unowned" when empty).
- Pager: "{from}–{to} of {total} candidates".
- Clicking a row opens the drawer.

**Action:** **"Revive"**, shown only with `CANDIDATE_ARCHIVE` (`DormantClient/index.tsx:52`; `DormantRow.tsx:73-82`). There is no confirm step.
- Toast "Revived {name} — back to ACTIVE".
- Error toast "Revive failed — they may no longer be dormant".

**Empty:** "Nobody is parked" / "No candidate is currently DORMANT."

**403:** "Candidate read access needed" / "Ask an admin for a recruiting grant — this list needs CANDIDATE_READ."

## 5. Conversations (`/conversations`)
Files: `P/conversations/_components/ConversationsClient/*`. Strings: `msg/conversations.json`, `msg/conversation.json`.

**List:**
- Search, placeholder "Search by name, email or phone".
- Sort: "Most recent" or "Newest candidate".
- Page size: 25, 50, 100.
- Each row shows the owner badge (or "Unowned"), "{days}d ago", and a button **"Open"** (`ConversationRow.tsx:49-57`).

**Empty:** "No conversations yet" / "A conversation appears here once somebody on the team has messaged or called the candidate."

**403:** "You do not have access to this list."

**Error:** "Could not load the list. The backend log has the reason."

**"Open"** launches `ConversationModal` (the omni panel):
- Users with `REPORT_TEAM` (managers) join as an observer and see the notice "You are viewing as an observer. Your name shows in the participant list. Closing this panel removes you again." (`ConversationsClient/index.tsx:61,142-150`; conversation.json:89).
- Tabs: **"Team only"** and **"Candidate & parties"**.
  - Team only sub-line: "Only your team can see this. The candidate never does."
  - Candidate & parties sub-line: "External — reaches the candidate & outside parties".
- Channels: Email, SMS, Call, chat.
- Messages you may see:
  - "No SMS-capable contact on this candidate. SMS needs a mobile number with an active SMS pairing."
  - "The candidate’s number is on file but is not confirmed as a cell number. Texts only go to cell numbers."
  - "The candidate has no phone number on file. Add it in Personal details with Phone type set to Cell to send a text."
  - "You don't have a Zoom account linked, so texting and calling from here will fail. Email still works. Ask an admin to link your Zoom account."
  - "Texting is off in this panel. {reason} Team chat still works."
  - "Email is off in this panel. {reason} Team chat still works."
- Before sending outside: "This message leaves the company by {channel} and reaches {names}. …"
- Never-contacted candidate: "No conversation yet" / "This candidate has never been contacted … Call, text or email them from the row — the first outbound message opens the conversation.", button "Got it".
- Open failure: "Couldn't open the conversation" with button "Try again".

The omni widget internals (composer buttons) live in a shared omni library and were not traced here. UNCONFIRMED exact composer labels.

## 6. Sponsorships (`/sponsorships`, ADMIN-only in the menu)
Files: `P/sponsorships/*`. Strings: `msg/sponsorships.json`.

**List:**
- Search, placeholder "Name, NMLS # or state".
- Bucket chips "{label} · {n}": "Ready for you", "Waiting on Loan Officer", "Waiting on state", "From MOSO", "Done", "All".
- Columns: Loan Officer, Stage ("S6 Onboarding" or "S7 Active"), NMLS access ("Granted {date}", "Access removed {date}", "Not recorded"), States (status pills), Waiting longest ("{state} · {n} days", "usually {min}–{max} days"), Recruiter.
- The row's primary button is one of: "Loan Officer granted access", "Check on NMLS", "Record NMLS request", "Record the state's answer", "Open".

**Banners:**
- Gate off: "Sponsorship doesn't block S6 → S7 today — the sponsorship gate is off. …"
- Gate on: "Sponsorship blocks S6 → S7 — the sponsorship gate is on. …"
- Waiting on Loan Officer bucket: "Recruit does not remind these Loan Officers" / "Last reminder sent: never. …"
- From MOSO bucket: "These came from MOSO" / "… press "NMLS shows the same" or record what you see."

**Permissions** (`SponsorshipsClient/index.tsx:49-54`):
- Writing state verbs needs `SPONSORSHIP_MANAGE`.
- Recording NMLS access needs `SPONSORSHIP_MANAGE` or `SPONSORSHIP_ACCESS_RECORD`.
- Without manage, a state card reads "Licensing updates this. You'll see it change here."

**Drawer:**
- Sub-line "NMLS {nmls} · recruiter {recruiter}".
- Access card with button "Loan Officer granted access".
- Batch request "Record NMLS request ({states})" opens a checklist titled "I requested sponsorship on NMLS for:" with button "Save — mark {states} requested". Validation: "Tick at least one state".
- Per-state verbs depend on the state's status (`_utils/sponsorships.ts:193-211`):

  | State status | Verbs |
  |---|---|
  | From MOSO | "NMLS shows the same", "No — NMLS shows something else…" |
  | NONE | "Requested and already approved" |
  | REQUESTED | "State approved", "State asked for more", "Rejected / blocked" |
  | IN_PROGRESS | "State approved", "Rejected / blocked" |
  | BLOCKED | "I requested it again" |
  | SPONSORED | "Removed for this state" |
  | WITHDRAWN | "Rejoined — I requested again" |

- **Approve form:**
  - Title "Record the approval for {state}".
  - "Sponsored on", hint "The date NMLS shows."
  - Checkbox "I checked it on NMLS, not only the email".
  - Button "Save — mark {state} sponsored".
- **Needs-items / block notes:**
  - "What does the state need?" (e.g. "2.5-hour state course")
  - "Why is it blocked?"
  - Hint "Onboarding and the recruiter see this note."
- **Remove access** ("Loan Officer removed access…"):
  - Body: "Every state becomes "Access removed". …"
  - Checkbox "Send the removal email to the Loan Officer (CC HR and Onboarding)", hint "Recruit can't send email yet — send it from your mailbox and CC HR and Onboarding."
  - Button "Mark access removed".
- **"Copy for the NMLS form"** panel: copy buttons for Legal name, NMLS ID, Title = "Loan Officer", Location type = "Main Office". Toast "{label} copied."
- **Conflict (409):** "{state} was already marked {status}" / "{who} changed it at {when}. Your change wasn't saved. The card now shows the latest."
- **Toasts** (json:161-166):
  - "{name}: requested on NMLS. Onboarding sees it on the candidate."
  - "{name}: NMLS access recorded."
  - "{name}: access removed. No email sent — send it from your mailbox."
  - "{name} · {state}: {status}. Onboarding sees it on the candidate."
  - The confirmed and corrected variants.
  - Failure: "Couldn't save. Nothing was changed."

**Empty states:**
- "No sponsorships recorded yet" (no MOSO import yet)
- "Nothing here" / "No Loan Officer matches this filter."
- 403: "You can't see sponsorships"

## 7. Templates (`/templates`)
Files: `P/templates/_components/TemplatesClient/*`. Strings: `msg/tplmanage.json`.

**Sections:**
- "Team templates", hint "reviewed lifecycle — only ACTIVE ones can ever be auto-sent".
- "My templates", hint "your own voice — no approval, visible only to you, sent by hand".
- Columns: Name, Type, Stage ("any"), Status.

**Header button:** **"New template"**.

**Row actions** (`TemplatesClient/index.tsx:105-185`):
- **"Edit"**: needs `TEMPLATE_CREATE`, the template must not be RETIRED, and an ACTIVE team template additionally needs `TEMPLATE_APPROVE`.
- **"Submit for review"**: team template in DRAFT.
- **"Approve"** and **"Reject"**: team template IN_REVIEW. Disabled without `TEMPLATE_APPROVE`, with the tooltip "Publishing needs the TEMPLATE_APPROVE grant (managers)".
- **"Retire"**: an ACTIVE template that is personal, or any ACTIVE template for an approver.

**Modal** ("New template" or "Edit template"):
- SCOPE: "Personal" or "Team", with hints:
  - "Personal: live immediately, only you see and send it — automation never touches it."
  - "Team: starts as a draft; a manager approves it before anyone (or the machine) sends it."
- Fields: Type (CALL_SCRIPT, EMAIL, SMS), Stage, Name, Email subject, Body.
- Body hint: "'{{first_name}}' and '{{recruiter_name}}' are filled in at send time."
- Save is enabled only when Name and Body are non-empty (`TemplateModal.tsx:49`).
- Create button: **"Create — live now"** (personal) or **"Create draft"** (team). Edit button: "Save".

**Toasts:**
- "Template created" / "Template saved"
- ""{name}" sent for review" / ""{name}" is now ACTIVE" / ""{name}" sent back to draft" / ""{name}" retired"
- Failure: "That didn't work — reload and try again"

**Empty:** "Nothing here yet" / "Create a template — call scripts, emails and SMS all live here as editable config."

## 8. Audit (`/audit`)
Files: `P/audit/_components/AuditClient/index.tsx`. Strings: `msg/audit.json`.

**Header:** "Events" count card.

**Filters:**
- Event type: "All events", "Owner changes", "Stage moves", "Setting edits", "Merges", "Permission changes", "Offer events", "Conversation access granted", "Conversation access revoked", "Checklist template edits", "Sponsorship changes".
- Actor: "All actors", or a person.
- Page size: 25, 50, 100.

**Button:** **"Export CSV"**, tooltip "Current page, raw ledger fields — ids, not display names" (`index.tsx:216-256`).

**Columns:** When, Event, What happened, By ("system" for automatic events), Candidate (with an "Open" link).

**Offer event labels:** "Offer requested", "Offer approved", "Offer declined", "Offer sent", "Agreement signed", "Startup fee paid", "Startup fee waived", "Imported from the legacy system".

**Notices and states:**
- Truncated: "Showing {shown} of {total} events — page through or narrow the filters".
- Empty: "No events match" / "Loosen the filters — …".
- 403: "Manager / Admin only" / "The org-wide audit stream needs the AUDIT_VIEW grant. …".

## 9. Settings (`/settings`, needs `SETTINGS_MANAGE`)
File: `P/settings/_components/SettingsClient/index.tsx`. Strings: `msg/settings.json`.

**Access:**
- 403: "You cannot change settings" / "Editing operational config needs the SETTINGS_MANAGE grant."
- Every input is disabled without the grant (`index.tsx:123`).

**Sections, in render order:**

1. **"Hot leads — first-touch deadline"**, hint "how fast someone must pick up a lead that just raised a hand":
   - "Deadline by lead source": per-source hours; placeholder "general".
   - "General deadline": 1–720 business hours.
   - "Deadline for leads that arrive after hours": 1–720.
   - "Unclaimed → Exceptions after": 1–1440 minutes.
   - "Claimed but not contacted → back to the pool after": switch "Return idle claimed leads automatically" + 1–720 business hours.
   - "Warn before returning": 0–168.
   - "Grace after the deadline": 0–1440 minutes.
   - "Phone-app contact": switch "Count texts and emails sent from the phone app as contact".
   - "Contact clock starts at": a date-time. Invalid input shows "Pick a valid date and time". A future date shows the paused notice "The contact SLA is paused until {when} — …".
   - "Longest "Claimed, not contacted yet" list": 1–1000 rows.
   - **"Ready to join, invite not sent"**: 1–90 days. Description: "How many days a candidate who said yes on a call can wait for their invite before it shows on the manager's Exceptions page."
   - "Holidays":
     - "National holidays (repeat every year)": the US federal list with "next: {date}".
     - "Company extra days off": picker "Add a date". Unsaved state shows "Unsaved changes".
     - "Upcoming days off".
2. **"Follow-up"**:
   - "No-answer retry ladder": buttons "Add a rung", "Remove this rung", "Save ladder". Preview lines "{ord} no answer → {when}" and "{ord} — automation stops".
   - "Default follow-up distance": a select of 1, 2, 3, 4, 5, 7, 10 or 14 days.
   - "Neutral — default re-contact distance": days.
3. **"Reminders & notifications"** (`NotificationSettingsSection.tsx:20-24`). Hidden on a backend without these keys.
   - "Remind cooldown": 0–1440 minutes.
   - "How long a Remind stays pinned": 1–168 hours.
   - "Bell refresh interval": 15–600 seconds.
   - "Notifications per page": 1–100.
   - "Keep notifications for": 1–365 days.
4. **"Neglect colouring"**:
   - "Amber after (days)" and "Red after (days)".
   - Error: "Red must come after amber".
5. **"Offers"**:
   - "Review deadline for an offer waiting on approval": 1–720 hours.

**Feedback on every field:**
- "Changed by {who} on {when}", or "Never changed — still the value the app shipped with."
- Range error: "Between {min} and {max}".
- Toasts: "Setting saved" / "Could not save this setting".

Some rows render only when the backend returns that key. UNCONFIRMED exactly which ones hide on staging.

## 10. Settings > Connections (`/settings/connections`)
Files: `P/settings/connections/_components/ConnectionsClient/*`. Strings: `msg/connections.json`.

**Header:** title "Connections", description "Outside accounts you have connected to your own Recruit profile."

**States:**
- Loading: a skeleton.
- Feature off (the status read returns 404 or "disabled"): "Not available yet" / "Connecting a Google account is not switched on in Recruit yet." (`index.tsx:52-58`).
- User without a Recruit role: "No Recruit access yet" / "Your account has no Recruit role yet, so you can't connect Google here. Ask a manager to give you access."
- Status error: "Could not load your Google connection." with button "Try again".

**Google card (not connected):**
- Chip "Not connected".
- Pitch: "Connect your own Google account. Recruit will use it later to put the meetings you book on your Google Calendar. …"
- Button **"Connect Google"**. This is a full-page redirect to Google. If it cannot start: "Could not start the Google sign-in. Try again in a moment."

**Google card (connected):**
- Chip "Connected".
- Rows "Google account", "Connected on", "Access". Scope chips can read "Sign in with Google", "Email address", "Name and photo", "Calendar", "Calendar events", "Calendar (view only)".
- Button **"Disconnect"** opens a modal:
  - Title "Disconnect Google?"
  - Body "Disconnect removes {email} from LoanFactory Recruit. …"
  - Buttons "Cancel" and "Disconnect".
  - Toast "Google disconnected." On failure, inline text: "Google could not be disconnected. It is still connected."

**Callback page `/integrations/google/callback`** (`GoogleCallbackClient.tsx:40-89`):
- Shows "Finishing the Google connection…", then always redirects back to `/settings/connections`.
- Success toast: "Google connected as {email}." or "Google connected."
- Error toasts:
  - "You did not allow access at Google, so nothing was connected."
  - "Google stopped the connection. Start again from Connections."
  - "Google did not send back what Recruit needs. …"
  - "Google is taking too long to answer. …"
  - "Google could not be connected just now. …"
- Backend error codes map to `error_*` texts (json:43-59). Key ones:
  - "Only a loanfactory.com Google account can be connected. …"
  - "Use the Google account that matches your Recruit login ({email})."
  - "You did not allow Recruit to use your calendar. Connect again and tick the calendar box on Google's screen."
  - "That Google account is already connected to another Recruit user. …"
- The same connect flow runs inline, in a popup, from the Schedule 1-1 modal banner (see 1.1) and from the Call result Meet 1-1 step (covered elsewhere).

## 11. Checklist templates (`/checklist-templates`)
Files: `P/checklist-templates/_components/ChecklistTemplatesClient/*`. Strings: `msg/checklistTemplates.json`.

**Tabs:** the departments whose `CHECKLIST_TEMPLATE_MANAGE_<dept>` the user holds. Admin sees all five: HR, Licensing, Onboarding, Accounting, IT (`checklistTemplates.ts:39-49`). The URL keeps `?dept=`.

**Gate banner** at the top, one of:
- Gate switched off in Settings: "The checklist gate is switched off in Settings".
- No mandatory items: "The checklist part of the 100% gate is off: no template is mandatory".
- Otherwise: "The 100% gate checks {n} checklist item(s)", followed by the list.

**Department section:**
- Heading "{dept} checklist", with "{items} items · {mandatory} mandatory · {active} active" and "Changes apply at once — no deploy".
- Groups:
  - "Before 100% onboarded", hint "Created when a candidate enters S6 — or, where marked, when their offer is sent. Mandatory ones block S7."
  - "After 100% onboarded".
- Columns: #, Item, Due, Mandatory (switch), Active (switch), Last change.
- Row tags: "created when the offer is sent", "one item per sponsor state · {rule}", "Blocks the 100% gate", "After the gate".

**Flipping a switch** opens a confirm dialog with a live impact count:
- Titles: "Make "{title}" mandatory?" / "Make "{title}" optional?" / "Turn off "{title}"?" / "Turn "{title}" back on?"
- Buttons: "Make mandatory", "Make optional", "Turn off", "Turn on", "Cancel".
- Impact lines include "{n} candidate(s) hold this item open right now. They can't move to S7 until {dept} marks it Done or N/A."
- Toasts: "Saved — "{title}" is now mandatory." (and the optional, active and off variants).
- Failure: ""{title}" didn't change" / "The change didn't save: {reason} The switch has been put back."

**"Edit" modal** ("Edit checklist item"):
- Fields:
  - Title (required, under 255 characters)
  - Description
  - Due in (days), required, 0–365
  - Position
  - Created when (locked)
  - Code (locked)
- Errors: "Title is required.", "Keep the title under 255 characters.", "Due date is required.", "Use a whole number of days from 0 to 365.", "Use a whole number."
- Toast: "Saved — "{title}" updated. Items candidates already have are unchanged."

**"Add item"** (only for a department the user can manage):
- Modal "New {dept} checklist item".
- Trigger radio:
  - "Created when the candidate enters S6"
  - "Created when the offer is sent"
  - "Created when the candidate reaches S7"
- Code is suggested from the title. Errors: "Code is required." / "Keep the code to {max} characters or fewer." / "Another item already uses this code. Pick a different one."
- Note: "New items start optional and active. …"
- Toast: "Added "{title}". Candidates who reach its step from now on get it."
- Failure: "The item wasn't added".

**Other states:**
- No manage grant: "View only" / "Each department's leads edit their own items. …"
- Footnote link "See who changed checklist templates" (needs `AUDIT_VIEW`, `index.tsx:98`).

## 12. Licensing rules (`/licensing-rules`, ADMIN-only in the menu, needs `LICENSING_RULE_MANAGE`)
Files: `P/licensing-rules/_components/LicensingRulesClient/*`. Strings: `msg/licensingRules.json`.

**List:**
- Section "State rules", hint "{rules} active rules across {states} states — these generate the licensing checklist for each sponsorship state".
- Columns: State, Rule type, What it requires, Active (switch).
- Summary text examples: "Corporate branch licensed in this state within {n} miles", "A {n}-hour course before sponsorship", "No endorsement → Licensing gets a to-do to set corporate loan officer".

**Buttons:** "New rule", "Edit", "Delete".

**Rule modal** ("New state rule" or "Edit {state} rule"):
- State and Rule type are locked on edit, with the hint "State and rule type cannot change on an existing rule — …".
- Types: "Distance limit", "Course required", "Branch required", "Confirmation required", "Auto-attribute (no endorsement)".
- Type-specific fields:
  - "Measured in": Miles or Drive hours.
  - "Radius in miles" / "Drive time in hours" / "Course length in hours".
  - "What must be confirmed".
  - "Apply automatically".
- Common fields: "Notes", "Active".
- Buttons: "Add rule" / "Save". Disabled until state and type-specific fields are complete; no message is shown (`RuleModal.tsx:57,199`).

**Delete confirm:**
- Title "Delete this {state} rule?" with body text.
- Buttons "Turn off instead" and "Delete".

**Toasts:** "Rule added for {state}", "Rule saved", "{state} rule turned on", "{state} rule turned off", "{state} rule deleted", "Could not save the rule".

**403:** "You cannot edit licensing rules" / "This screen needs the LICENSING_RULE_MANAGE grant."

## 13. Permissions (`/permissions`, needs `RBAC_MANAGE`)
Files: `P/permissions/_components/*`. Strings: `msg/permissions.json`.

**Tabs:** "Access" and "Program members" (`?tab=program-members`; `PermissionsPageClient.tsx:33-44`).

### Access tab
- Search "Search name, email or id…", role filter "All roles", count "{n} people", button **"Give access to someone"**.
- Columns: PERSON, ROLES, INDIVIDUAL CHANGES, CAN TAKE WORK?, LAST CHANGED, plus "Edit".
- **Bulk bar:** "{n} people", "Pick a role…", "Apply role", "Revoke access" (browser confirm "Revoke access for {n} people?"), "Clear".
  - Toast "{n} updated." Skips are listed as "{name} skipped — that is your own row / they are the last person who can manage access / they had no access to begin with".
- **Grant drawer:**
  - "Roles" (multi).
  - "Danger zone" with "Grant ADMIN" (browser confirm on `admin_confirm`).
  - "Permissions" catalog with states "from role", "added", "blocked", "off".
  - "Reason (required)": at least **8** characters; error "A few more words, please — this is what the next person reads." (`GrantDrawer.tsx:26,112,264`).
  - Buttons "Save", "Reset", "Cancel", and "Revoke all access" (browser confirm). On your own row the revoke is replaced by "You cannot revoke your own access from here".
  - Toasts: "Access updated." / "That did not go through." / "Access revoked."
  - Stale edit: "Nothing was saved: this person's access changed while you were editing … Open the person again and redo your change."
- **Add modal** ("Give access to someone"):
  - Searches the central company directory.
  - People who already have access are marked "already here · {roles}".
  - Button "Give access".
  - Directory down: "The company directory is unreachable right now, so this list would be wrong rather than empty." with "Try again".
- **Without `RBAC_MANAGE`:** "You are viewing this without RBAC_MANAGE, so every editor is disabled. …"

### Program members tab
- Explanation: "LO Recruiter Program members who need a recruit account linked, or who were suspended. …"
- Columns: Member, State ("Waiting to link" or "Suspended"), Approved, Matching accounts.
- Row actions: "Link" / "Link again", "Reject", "Unlink" (Unlink only for suspended members).
- **Link modal:**
  - "Recruit account" picker.
  - Checkbox "I checked with this person outside the app that this account is theirs".
  - Extra reason field "Why link it anyway" when the account was created after approval or the approval time is unknown. Validation "Write at least {n} characters."
  - Submit "Link account".
- **Toasts:**
  - "{name} is linked." / "{name} is linked. Roles added: {roles}."
  - "The match for {name} was rejected."
  - "{name} is unlinked. N leads went back to the pool."
- **Empty:** "Nobody is waiting" / "Every approved program member is linked."
- **Directory down:** "The company directory is not answering" — Link and Reject are off; Unlink still works.

---

### Notes and possible issues for the tester
- The Department work switch shows only Onboarding and Accounting. HR and Licensing items are visible only in the drawer checklist, marked "tracked outside this app".
- "Schedule 1-1" appears **only** for the row's own specialist. A manager or another Onboarding user sees the planned line plus Done…/Blocked…/N/A… but no Schedule button.
- The "Specialist assigned: {name}" toast interpolates the candidate's name (`useAssignSpecialistActions.ts:49`). This looks like a bug.
- The meeting length description says "Default from Settings.", but `/settings` has no meeting-length field. UNCONFIRMED where the default is configured.
- Whether staging runs in API mode or template mode depends on backend flags (`calendarEventsEnabled`, `writeback_enabled`, `hire_classification_enabled`) returned at runtime, not on FE env vars. UNCONFIRMED staging values.

---

# Part C: Candidate drawer and Call result modal (recruit-fe origin/master 1fc5521b)

Paths are relative to `src/`. "msg drawer.json:N" means `src/messages/en/drawer.json` line N, under the namespace `Drawer`.
Permission codes (`useCan('X')`) come from `/me/permissions`. Note that `useCan` fails OPEN while the grant is still loading (comment at CandidateDrawer/index.tsx:138-141).

---

## 3. Candidate drawer (the "360" drawer)

### 3.0 Opening, URL and shell
- The drawer is driven by the URL: `?c=<candidateId>` opens it, and `?dtab=activity|profile|sync` picks the tab. Overview is the default and drops `dtab` from the URL (hooks/useCandidateDrawer.ts:14,29-31,105-113).
- Opening another candidate drops `dtab`. Closing drops `c`, `pm` and `etab` (the Edit-modal params) (useCandidateDrawer.ts:81-91).
- Drawer width is `min(680px, 100%)`, and it opens on the right (CandidateDrawer/index.tsx:58,256).
- While loading, the header says **"Loading…"** (msg drawer.json:3).
- If the BE returns 404/403 on GET /candidates/{id}, you get a grey alert titled **"Lead not available"** with the body **"This lead is not available to you. It may belong to someone else or no longer exist."** (index.tsx:116,281-285; drawer.json:6-7).
- If the request fails (network error or 5xx), you get a red alert: **"Could not load this candidate."** (index.tsx:118-121,287-291; drawer.json:5).
- If the candidate has no name, it shows **"(no name)"** (drawer.json:4).
- The close button's aria-label is **"Close"**.

### 3.1 Key gates computed in the drawer (index.tsx)
| Variable | Rule | Line |
|---|---|---|
| `isOwner` | `candidate.owner_id === myUserId` | 122 |
| `rowScope.scoped` | true for HEADHUNTER / TEAM_LEAD, and for anyone while roles are still loading | 99-100 |
| `canWrite` | `canWriteLead(scoped, owner_id, me)`: an unscoped user can always write; a row-scoped user can write only on leads they own | 125 |
| `canAct` | `useCan('ACTIVITY_LOG')` | 81 |
| `isElevated` | `useCan('REPORT_TEAM')` (manager/admin) | 129 |
| `canSeeFollowUps` | candidate loaded AND (`isOwner` OR `isElevated`) | 131 |
| `followUpAccess` | `hidden` if neither ACTIVITY_LOG nor REPORT_TEAM (read-only HR/Licensing/Onboarding/Accounting roles); `visible` if the user can see follow-ups and the call did not 403; otherwise `owner-only` | 189-193 |
| `canInvite` | `useInviteAllowed(candidate)`, see 3.3 | 111 |
| `canSeeSyncTrace` | not row-scoped AND permissions loaded AND has `SYNC_TRACE_READ` (fail-CLOSED) | 144 |
| `canTransferAny` | `useCan('CANDIDATE_TRANSFER')` | 96 |

### 3.2 Header (pinned) (CandidateDrawer/DrawerHeader.tsx)
1. **Who row**
   - Avatar with initials, then the name as an `<h2>`, then a source chip for hot sources (DrawerHeader.tsx:81-93).
   - Subtitle: `NMLS <id> · <company> · <state>`. If none of these exist, it shows the email; if there is no email either, it shows "—" (68-70,88).
   - Cold sources (IMPORT/MANUAL/MODEX/OTHER) get no chip. Instead the text reads **"Source: {source}"**, with the source code humanized (drawer.json:126; DrawerHeader.tsx:89-91).
2. **Chips row**
   - An orange stage chip, using the `Today.stage_*` labels: S0 "Unclaimed", S1 "New lead", S2 "Engaged", S3 "Verified", S4 "Meeting", S5 "Offer", S6 "Joined", S7 "Onboarded" (today.json:10-17).
   - A status chip, shown only when the status is not ACTIVE: **"Nurture"** (amber), **"Archived"** (grey), **"Blocked"** (red), **"Dormant"** (blue) (drawer.json:99-102; DrawerHeader.tsx:27-32,98-100).
   - The labels picker `LabelPicker compact`, which is read-only when `!canWrite` (101). Its strings: "No labels", "Add", placeholder "Label name — spaces are fine", chip "Label" (labels.json).
3. **Pipeline bar**
   - Seven segments, S1..S7 (S0 lights none).
   - Text: **"S{n} · {stage label} · step {n} of 7"** and then **"Next: {next stage}"** (drawer.json:103-104; DrawerHeader.tsx:104-123).
4. **Action row**: shown only when `!readOnly`, i.e. `canWrite` (DrawerHeader.tsx:125-130; index.tsx:269). It uses `ContactButtons variant="hero"` with the default primary channel CALL (shared/components/ContactButtons/index.tsx:271-352). The row is hidden entirely if the user lacks `ACTIVITY_LOG` (ContactButtons:136).
   - **"Call now"** is the filled primary button with a phone icon (contact.json:18). It is disabled when there is no phone, with hover text **"No phone on file — email first, or log the result to mark Wrong information"** (contact.json:21).
     - Clicking it first POSTs a CALL activity. Only on success does it open `zoomphonecall:<phone>`. A refusal (TCPA/opt-out 400) shows a red toast and opens no dialer (ContactButtons:195-218).
     - Possible toasts (contact.json:11-15):
       - "Logged the call"
       - "Logged the call — interact = assign: they're yours now, S0→S1, on your Today"
       - "Logged, but {owner} already owns this candidate — coordinate before touching again" (red)
       - "Logged, auto-claim skipped: {reason}"
       - "Could not log the touch"
     - **From the drawer, Call does NOT open the Call result wizard.** The drawer passes no `onLogged`, and only Today/Focus/Hot/Cold do (grep: TodayHero.tsx:153, TodayQueueRow.tsx:316, FocusClient:397, ClaimedRowActions.tsx:46). Instead the server marks a pending call, and the next time the drawer renders the red "no result yet" box appears (3.4). UNCONFIRMED whether the drawer refetches immediately; ContactButtons invalidates all `['recruit']` queries (ContactButtons/index.tsx:210), which should refresh `useCandidate`.
   - **SMS** icon (aria/tooltip "SMS") and **Email** icon (aria/tooltip "Email") (contact.json:4-5).
     - With the flag `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED === 'true'` (utils/contactRoute.ts:114), the icon first asks `contact-route`:
       - Blocked: a red toast, one of "This person opted out of texts." / "On the do-not-contact list." / "This person can't be contacted on this channel.", optionally with **"Reason:"**.
       - Check failed: **"Couldn't check whether this person can be contacted, so nothing was opened. Try again."**
       - Route `OMNI_COMPOSER`: the in-app conversation modal opens on the Candidate side with SMS/Email preselected, and nothing is logged.
       - Route `DEVICE`: the touch is logged, then `sms:` / `mailto:` opens (ContactButtons:226-255; contact.json:24-35).
     - With the flag off, the icon logs the touch and then opens the device app.
     - Without an email, the Email icon is disabled with **"No email on file — call or text first, or log the result to mark Wrong information"**.
   - **Conversation button**: a tinted two-bubble icon after a vertical divider. Tooltip/aria: **"Open conversation"**, plus an unread count badge (ConversationButton/index.tsx:72-83; conversation.json:3). It opens the in-app SMS/Email conversation history modal.
   - **"Prepare offer"** (this replaces the old "Invite to join"; msg `Invite.drawer_button`, invite.json:3). It is a green light button, shown only when ALL of the following hold (index.tsx:245-250):
     - `candidate.stage === 'S6'` ("Joined"). In code, the button does not exist below S6 (comment index.tsx:84-85; tests CandidateDrawer.inviteGate.test.tsx:153-211 all use S6).
     - `canInvite` (see 3.3).
     - `canWrite`.
     - It opens the Offer modal (`InviteModal`, index.tsx:431).
5. **Tabs** (role=tablist, aria "Candidate sections") (index.tsx:222-231; drawer.json:95-97,85-86):
   - **Overview**.
   - **Activity**, with a count badge equal to the number of open follow-ups (only when `followUpAccess === 'visible'` and the count is above 0).
   - **Profile**.
   - **Sync**, only if `canSeeSyncTrace` (SYNC_TRACE_READ, not row-scoped). A `?dtab=sync` link opened without the grant falls back to Overview (212).
   - There is **no separate "Licensing", "Checklist" or "Team" tab**. Licensing is a group in Profile and a tab in the Edit modal; the checklist and team are sections in Overview. The old QA sheet's tab list is out of date.

### 3.3 Offer/Invite visibility (hooks/useInviteAllowed.ts, hooks/useCanInvite.ts)
- `canInviteCandidate` (useCanInvite.ts:20-24):
  - It needs `OFFER_REQUEST`.
  - If the user also has `OFFER_APPROVE` (manager), it is true for ANY lead.
  - Otherwise it is true only when the viewer owns the lead.
- `useInviteAllowed` (useInviteAllowed.ts:21-37):
  - If the user has `OFFER_READ`, it waits for the invite-status call and returns false while that loads.
  - It returns false when an offer is open (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `SIGNED`).
  - If the BE returns `can_request_offer` (boolean), that value wins.
  - Otherwise it falls back to `canInviteCandidate`.
  - After a DECLINED offer, the button comes back (test at inviteGate.test.tsx:198).

### 3.4 Overview tab, in order (OverviewTab.tsx:162-272)
1. **Attention block** (AttentionBlock.tsx). These are coloured rows (red/blue) and the block is absent when there are none.
   - **Red "pending call"** (AttentionBlock.tsx:96-109). It shows only when `candidate.pending_call_at` is set AND `pending_call_actor_id === me`, so ONLY the person who called sees it.
     - Title: **"Your call {when} has no result yet"** (drawer.json:105), where `{when}` is a relative label such as "today 3:15 PM" (formatFollowUpLabel).
     - Detail: **"Log how it went so the next step gets scheduled."** (drawer.json:106).
     - Button: **"Log result"** (drawer.json:107). It shows only if the user has `ACTIVITY_LOG` and `canWrite`, and it opens the Follow-ups panel in outcome mode, i.e. the Call result modal (section 4) (index.tsx:307,252).
   - **Red "Marked as blocked"** (status BLOCKED), with the detail "Check why before reaching out. Calls, texts and emails are still checked against the opt-out list when you try." (drawer.json:108-109).
   - Offer-related rows (OFFER_READ only):
     - Red **"Declined by {actor}: {reason}"** (actor falls back to "a manager").
     - Red **"Offer approval is overdue"** with the detail "Still waiting for a manager past the approval deadline. It stays pending and managers are reminded; it is never approved automatically."
     - Invite email delivery problem rows, with a **Resend** control when `canWrite` (ResendInviteControl).
     - Blue **"Offer is waiting for manager approval"** (invite.json:110-114; AttentionBlock.tsx:121-178).
   - Blue **"Legal name not confirmed"**, when the legal name is unconfirmed and the offer state calls for a nudge (184-191).
   - Blue auto-stage hold **"Not advancing automatically"**, with details such as "Will move to {stage} next." / "To reach {target}, fill in: {fields}." / "Moved back to {downgraded_to} by {name} on {date}. It moves on again after {events}." (drawer.json:178-186).
   - Agreement rows (out of date / blocked / failed / not-class), with an agreement action button when `canWrite` (216-272).
   - Blue **"Back from Nurture"** or "Nurture ended {date}" when the nurture wake date has passed (274-281; outcome.json:78,99).
2. **Send to HR** (SendToHr/index.tsx). It shows only when the user has `CANDIDATE_HR_HANDOFF` AND `stage === 'S6'` AND the BE state is `enabled` (line 67).
   - If it was already sent: **"Sent to HR · {when}"** plus **"Changes made after sending are not sent to HR again."**, or on failure **"Sending to HR failed. Ask an admin to check the handoff."** (69-80; drawer.json:55-57).
   - If read-only, nothing more is shown (82).
   - Otherwise the green button **"Send to HR"** appears, disabled while `!state.ready`. Below it is a list of missing items. Each item is clickable when it maps to an Edit-modal tab or to Profile → Legal name.
   - Then the list **"Good to fix (won't block)"** with warnings.
   - Toasts: **"Sent to HR"** / **"Could not send to HR. Check what is missing and try again."**
   - Missing-item texts: drawer.json:60-76. Warning texts: drawer.json:77-84. (Fork B covers onboarding; the strings are listed there as well.)
3. **Next step** section. It is hidden when `followUpAccess === 'hidden'` (OverviewTab.tsx:167-227).
   - Header **"Next step"**, plus **"+ Add follow-up"** when the list is visible and `canAct` (where `canAct` = ACTIVITY_LOG AND canWrite).
   - If `owner-only`: **"Follow-ups are visible to the owner or a manager."**
   - If nothing is scheduled: **"Nothing is scheduled for this candidate."**
   - Otherwise it shows the soonest follow-up: a kind label ("Call" / "Send info" / "Webinar" / "Meet 1-1" / "Retry call"), a due badge and the note.
   - Buttons: **"Done"**, which completes the follow-up and toasts **"Follow-up done — pick the next step"** (outcome.json:59,71), and **"Manage"**, which opens the follow-ups list panel. If there is more than one, **"+{n} more scheduled"** jumps to Activity.
4. **Onboarding checklist** (CandidateChecklist).
   - Heading **"Onboarding checklist"**.
   - Before S6: **"No checklist yet — the onboarding 1-1 appears when the offer is sent, and the remaining tasks when the candidate reaches S6."**
   - Row actions: **"Done" / "Block" / "N/A" / "Reopen" / "Unblock"**.
   - The 1-1 row cannot be done here: **"Done needs the meeting date — mark this one from the Onboarding queue."** (checklist.json:3-42).
5. **Team on this candidate** (CandidateTeam.tsx). It is hidden if the followers call fails or returns 400 or more (77).
   - Header button **"Follow"**, shown when `canWrite` and `self_action === 'FOLLOW'`.
   - Header button **"Unfollow"**, shown when `canWrite`, `self_action === 'UNFOLLOW'` and the user is not row-scoped (90-113).
   - **"You are on this candidate's team."**, shown when following and `self_action` is NONE.
   - Groups, in order: "Recruiter", "Onboarding specialist", "Departments" (tag HR/Licensing/Onboarding/Accounting/IT), "Managers", "Followers" (tag "Mentioned"/"Added"/"Following") (drawer.json:192-204).
   - Remove (x) is available per member when `removable` (aria "Remove {name}").
   - Add-a-colleague select, shown when `canWrite` AND `can_add_followers`: placeholder **"Add a colleague to this candidate"**, empty text **"Nobody found"**.
   - On a lead the viewer reads but does not own: **"No team members are shown for this lead."**
   - Error toast: **"Couldn't update following. Try again."**
6. **Last touch**: **"We last reached out {when}"**, or the red chip **"Never contacted"** with "No call, text or email from us yet.". The link **"All activity"** goes to the Activity tab (OverviewTab.tsx:233-252).
7. **Offer progress card** (InviteProgressCard). It shows only with OFFER_READ and an existing `offer_id`.
   - Title **"Offer"**, with an info tooltip.
   - Steps: **"Invited"** (date / "Pending" / "Sending again" / "Email not sent" / "Not delivered to MOSO" / "Email unconfirmed" / "Specialist removed"), **"1-1 done"** ("Done"/"Not yet"), **"Paid the fee"** or **"Fee waived"** ("Paid"/"Not paid yet"/"Done"), **"Signed"** ("Done"/"Not signed yet") (invite.json:50-66,115-117).
8. **Key facts**, with the link **"Full profile"**.
   - **Owner**: name badge, or "Unowned". The **Hand off** or **Reassign** button sits here (see 3.7).
   - **Phone** and **Email** ("Not on file" when missing).
   - Optional rows: **Referred by**; **Production volume** and **Loans closed** (both tagged "self-reported"); career production; units in 12 months; loans since {anchor} "as of {date}"; **Licensed in** (OverviewTab.tsx:86-160).

### 3.5 Activity tab (ActivityTab.tsx)
- **Internal note** composer (NoteComposer.tsx). It shows when `canWrite` AND (ACTIVITY_LOG OR on the candidate's team) (ActivityTab.tsx:78-80).
  - Placeholder **"Write a note for the team. Type @ to mention someone."**
  - Hint **"Only your team sees this. People you mention get a notification."**
  - Button **"Add note"**, disabled when the note is empty.
  - Toasts: **"Note added"** / **"Couldn't add the note. Try again."** / info **"{names} got a notification but were not added to the team. Someone on the team can add them."** (drawer.json:205-217).
- **Follow-ups** list (same gating as Next step): Done/Manage/"Add follow-up", and a collapsible **"Earlier follow-ups"** ("None have been cleared yet." / "{n} cleared follow-ups").
- **Contact history** timeline (TimelineSection):
  - Filters **All / Messages / System & stage**.
  - Empty: **"Nothing logged yet — the first call, SMS or email shows up here."** Filter empty: **"Nothing matches this filter."** Error: **"Could not load the contact history."**
  - Link **"View the full audit log"** when the user has `AUDIT_VIEW`.
  - Hand-off rows: "Handed from {from} to {to}", "Assigned to {to}", "{manager} took this lead back from {owner}", "Returned to the pool automatically — no contact logged before the deadline" (drawer.json:14-41,89-94).

### 3.6 Profile tab (ProfileTab.tsx)
- **Legal name** block (LegalNameBlock), with a status of Missing / Unconfirmed / Confirmed.
  - The **"Confirm"** / **"Checked with the LO — confirm"** button needs `CANDIDATE_LEGAL_NAME_CONFIRM` AND `canWrite` (index.tsx:376).
  - Toast **"Legal name confirmed"**.
  - Validation: "This field is required" / "This name is too long" / "Only letters, spaces, apostrophes, periods and hyphens are allowed, starting with a letter" (drawer.json:156-177).
- Read-only groups: **Identity**, **Licensing** (NMLS, licensed states, sponsor states, loan officer type, employment type), **Company & production**, **Referral**, **Mailing** (ProfileTab.tsx:70-141).
- Each group has a button **"Edit"**, which needs `CANDIDATE_UPDATE` AND `canWrite`; otherwise it is labelled **"View"**. The button opens CandidateEditModal on that tab (`?pm=…&etab=…`) (ProfileTab.tsx:157-160).
- Edit modal tabs: Identity, Licensing, Company, Production, Referral, Mailing, History. Buttons Cancel/Save. Toasts "Profile updated." / "Could not save these changes." (candidateEdit.json:6-16).
- **"Note from MOSO"** appears as a collapsible section when there is a MOSO note.

### 3.7 Hand off / Reassign (index.tsx:233-243; PeerHandoff/*)
- Location: next to the owner in Key facts. The button is NOT in the header.
- If the user is row-scoped (or roles are still loading), no button is shown.
- If the user is the owner: **"Hand off"**, mode `handoff`, with no permission needed.
- Otherwise, if permissions are loaded and the user has `CANDIDATE_TRANSFER`: **"Reassign"**, mode `reassign`.
- Otherwise no button is shown.
- Remind / Take back are NOT in the drawer. They live in Exceptions → ClaimedIdleSection (RemindButton.tsx, TakeBackModal.tsx); see the other part.

**Dialog** (PeerHandoffDialog.tsx; peerHandoff.json):
- Title: **"Hand off {name}"** / **"Hand off {n} leads"** / **"Reassign {name}"** / **"Reassign {n} leads"**.
- Search box **"Search colleagues"**.
- Handoff lists colleagues in two groups, **"Same role as you"** and **"Other teams"**. Reassign shows one flat list.
- Who is offered (peerHandoff.ts:43-57):
  - Only users with `can_own`.
  - Handoff excludes yourself and MANAGER/ADMIN.
  - Reassign of one lead excludes its current owner.
- States: "Loading your colleagues…"; "Couldn't load your colleagues" / "Nothing was handed off. Try again in a moment." + "Try again"; "No colleague can take leads right now" / "Only people who can own candidates are listed. Ask your manager to add someone."; "No colleague matches “{q}”."
- **"Why"** is a REQUIRED reason chip.
  - Handoff hint "(your colleague and the whole team see this on the shared history)". Chips: "Too much on my plate today" / "Better fit for them (language / state)" / "I'm out tomorrow" / "Other".
  - Reassign hint "(the new owner, the previous owner and the whole team see this on the shared history)". Chips: "Too much on the owner’s plate today" / "Better fit for the new owner (language / state)" / "The owner is out tomorrow" / "Other".
- Optional note: placeholder "Anything they should know — e.g. “Prefers text, call after 3pm CT”", max 500 characters, with an `n/500` counter after 80% (HAND_OFF_NOTE_MAX=500, candidates.api.ts:259).
- Info lines:
  - "Open follow-ups stay on the lead. The shared history shows the hand-off."
  - For hot leads: "{names} is a hot lead on a contact clock. After the hand-off the clock starts again for {to}."
  - For S0 leads: "Unclaimed leads move to S1 when handed off."
  - Handoff only: "Once it's {name}'s, you can't take it back yourself — ask them or a manager."
- Held back: if you called the lead and did not log the result, a warning appears, **"Record the call first"** / "You called {names} and haven't recorded the outcome. After the hand-off only the new owner can record it, and your reminder disappears. Record it first." That lead is not sent.
- Buttons: **"Cancel"**, and the submit button. The submit button reads **"Choose a colleague"** (disabled) until someone is picked, then **"Hand off to {name}"** / **"Reassign to {name}"**. It is enabled only when a person and a reason are picked and something is sendable (PeerHandoffDialog.tsx:108,275-276).
- Toasts (usePeerHandoffSubmit.ts:71-134):
  - Success: "{lead} is now {name}'s. {first} sees it under “Handed to you recently”. Changed your mind? Ask {first} to hand it back." (reassign: "{lead} is now {name}'s.").
  - Owner changed: "{lead} wasn't handed off" / "The owner changed while you were choosing. Now: {owner}. Nothing else was changed."
  - Generic failure: "Something went wrong and nothing was changed. Try again in a moment."
  - Bulk: "{ok} of {total} handed to {name}", plus skipped: "{n} lead was already {name}'s."
- API: one lead → `POST /candidates/{id}/transfer`; several → `POST /candidates/bulk-transfer` (candidates.api.ts:268-298).

### 3.8 Sync tab (SyncTraceSection)
- Only SYNC_TRACE_READ (admin-type) users see it.
- Strings: "No MOSO link" / "This candidate was created directly in Recruit and has never been touched by MOSO. There is nothing to trace.", "MOSO feed last event:", "Packs writeback ON/OFF", and the error "Could not load the sync trace. Try again in a moment." (syncTrace.json:3-13).

### 3.9 Read-only viewing (`canWrite` false)
This applies to a row-scoped HEADHUNTER/TEAM_LEAD on a lead they do not own (D205). They get:
- no contact buttons, no "Prepare offer", and no label editing;
- no "Log result", no note composer, no follow/add colleague, and no Send to HR button (only the sent state);
- Edit becomes "View" (index.tsx:123-126, 269, 306, 324, 330, 374-376).

---

## 4. Call result modal (FollowUpsPanel in outcome mode + OutcomeSection)

### 4.0 How it opens
- **Today / Focus / Hot / Cold rows**:
  - Clicking Call (**"Call now"** on the Today hero, the phone icon on rows) logs the call and *arms* a pending outcome. It never opens the wizard on the click (today/_hooks/usePendingOutcome.ts:43-47).
  - The wizard opens automatically when the browser tab regains focus at least 15 s after the call (`REFOCUS_GUARD_MS = 15_000`, :31). On Hot/Cold it auto-opens only for rows claimed and still kept on that page (inbox/_shared/useClaimOutcome.tsx:62-66).
  - The pending strip reads **"Call to {name} logged at {time} — no result yet"** with the button **"Log result"** (outcome.json:76-77; PendingOutcomeStrip.tsx:48-58).
  - Hot/Cold claimed rows also have a permanent **"Log result"** button (ClaimedRowActions.tsx:48-52), shown with ACTIVITY_LOG.
- **Drawer**: the red attention row **"Your call {when} has no result yet"** → **"Log result"** (3.4).
- The modal is a `RecModal` 880px wide (FollowUpsPanel/index.tsx:415).
  - Title: avatar + candidate name, with "NMLS {id} · company…" as the description (CallResultHeader.tsx:26-34).
  - Below the wizard the panel still lists the follow-ups: "To do today" / "Upcoming" / "Follow-up history".
  - The list can fail to load without blocking the wizard: "Could not load this candidate's follow-ups. Try again — if it persists, check recruit-be." (followups.json:7).

### 4.1 Step 1: "How did it go?" (OutcomeSection.tsx:473-479; OutcomeChoices.tsx:47-92)
There are four radio cards, in this order:
- **Interested** (thumbs up)
- **Neutral**
- **No answer**
- **Not interested** (archive icon)

(outcome.json:4-8)

Changing the attitude clears the next step, months, wake date and reason (OutcomeSection.tsx:240-245). It also clears date and time (234-237).

The **Note** section is always shown AFTER the branch: title **"Note"**, placeholder **"Add a note"** (outcome.json:3,83; OutcomeSection.tsx:757-780). It is optional except for Not interested + Other.

The sticky footer has one Save button. Its label depends on the branch (WizardParts.tsx:60-66). It is disabled until `canSave` (OutcomeSection.tsx:278-291,783-793). There is **no Cancel button in the footer**; you close with the modal's X (UNCONFIRMED: RecModal may render its own close; outcome.json has a "cancel" key that this component does not use).

The footer's left slot holds **"+ Add another follow-up"**. It shows when the user has ACTIVITY_LOG, the list loaded and no form is open (FollowUpsPanel/index.tsx:455; OutcomeSection.tsx:465-469). It opens the "New follow-up" form below. While that form has unsaved typing, "Yes, prepare offer" is disabled (see 4.2).

Network/BE error toast: the error message, or **"Could not save the outcome"** (outcome.json:60; OutcomeSection.tsx:407-414).

### 4.2 Interested
1. **"Ready to join?" card** (green, handshake icon), with **one button: "Yes, prepare offer →"** (outcome.json:100-101; OutcomeSection.tsx:481-509).
   - Under it is a divider: **"or plan the next step"** (outcome.json:102).
   - Shown only when `onInvite` is wired. In the drawer, that means `canInvite && canWrite` (index.tsx:397-404). On Today and Hot/Cold it means `useInviteAllowed(candidate)` (TodayClient/index.tsx:699; useClaimOutcome.tsx:94-101).
   - So the card is hidden for a non-owner recruiter and whenever an offer is already open (3.3).
   - Unlike the drawer header button, **the card is NOT gated on stage S6**.
   - Disabled while the follow-up form below is dirty. Its tooltip then reads **"Save or discard the follow-up you're typing first"** (outcome.json:98).
   - Click → `POST /candidates/{id}/call-outcome` with `{attitude: INTERESTED, note, send_invite: true}` and no next step (OutcomeSection.tsx:293-310; candidates.api.ts:495-497). On success:
     - toast **"Saved"** (outcome.json:93);
     - the wizard closes;
     - **the Offer modal (InviteModal) opens** (index.tsx:399-402).
   - On error, nothing opens.
2. **"Next step"** radio row (required for the footer Save; there is no default):
   - **Call again**
   - **Send info**
   - **Webinar**
   - **Meet 1-1**
   
   (outcome.json:9-13; OutcomeSection.tsx:519-545)

| Next step | Fields | Required for Save | Save label | Payload (beyond attitude + note) | Toast |
|---|---|---|---|---|---|
| **Call again** (`CALL_NEXT`) | **"When"** (date, red asterisk) + **"Time"** (native time input, optional) | the date (no default; qsg2z.2) | **"Schedule call again"** | `next_step_kind=CALL_NEXT`, `next_step_due_date`, `next_step_time`, `next_step_at` | **"Next step saved"** |
| **Send info** (`SEND_INFO`) | Segmented **"Send now" / "Schedule for later"**. Schedule adds **"Send on"** (date*). **"Send via"** Email/SMS. **"Template"** select (placeholder "Pick a template to prefill"; if empty, a disabled field with the hint "No templates yet — write your message below"). **"Subject"** (email only). **"Message"** (textarea) | Send now: nothing extra. Schedule: the date AND a non-empty Message | **"Save & open message"** | Now: kind only. Then, if the Message is non-empty, the conversation modal opens pre-filled (Candidate side). Schedule: `next_step_due_date` + `send_info_draft {channel, subject, body}` | **"Next step saved"** |
| **Webinar** (`WEBINAR`) | **"Which webinar?"** select (placeholder "Select a session" / "Loading sessions…"). There is no date/time | nothing (a session is optional) | **"Save webinar reminder"** | `webinar_id` if one was picked | **"Next step saved"** |
| **Meet 1-1** (`MEET_ONE_ON_ONE`) | **"When"** (date*) + time-slot select (see 4.2a) + calendar fields | the date. In Google API mode also the time. Blocked while the calendar status or guest check is loading | API mode: **"Save and send invite"** / **"Save and create event"** / **"Save"**. Otherwise **"Schedule 1-1"** | `next_step_due_date/time/at`. Non-API mode: `meet_location`. API mode: `colleague_user_ids`, `meet_minutes` | **"Next step saved"** |

Webinar states (OutcomeSection.tsx:553-586):
- Upstream unavailable: the warning "Could not load the session list — your save still works. Try again, or save without a session: that only sets your own reminder to invite them, it does not register them." with the button **"Try again"**.
- No sessions: "No upcoming recruiting webinars yet — you can still save this to remind yourself to invite them." (outcome.json:14-19).

Send info details: the template seeds subject/body, substituting first_name and last_name. Switching channel clears the picked template (OutcomeSection.tsx:203-211,637-642). Send-now with an empty Message just saves a reminder and opens nothing (396-404).

Before a next step is picked, the Save label reads **"Save call result"** (disabled) (outcome.json:52).

#### 4.2a Meet 1-1 with Google (useMeetCalendar.ts, MeetCalendarFields.tsx, CalendarMode/*)
- Mode comes from `GET /recruit-svc/api/v1/me/google/status` (useCalendarMode.ts:23; calendarMode.ts:22-37):
  - 404 → `template` (the feature is off in the BE);
  - `calendarEventsEnabled` false → `template`;
  - connected → `api`;
  - otherwise `connect` or `reconnect`;
  - errors → `error`.
- **Time field**: a `TimeSlotSelect` with **30-minute slots** from 00:00 to 23:30 (`SLOT_MINUTES = 30`, timeSlots.ts:2-10).
  - Label: **"Start time (your time zone: {zone})"**, or "Time" when the zone is unknown (workQueue.json:116-117).
  - Required (asterisk) only in API mode. Until a time is picked, the hint **"Pick a time to create the Google event with a Meet link"** shows, and Save stays disabled (OutcomeSection.tsx:421-456; outcome.json:29; useMeetCalendar.ts:127,155).
- **connect / reconnect mode**:
  - Banner **"Connect Google in Settings → Connections to create the Meet automatically."** / **"Your Google connection stopped working. Reconnect it to create the Meet automatically."**, with the button **"Connect Google"** / **"Reconnect"**.
  - While waiting, the button **"Stop waiting"** shows. A blocked pop-up shows "Allow pop-ups for this site, then try again."; a failed connect shows "Google was not connected." (outcome.json:23-24; workQueue.json:151-155).
  - The free-text field **"Meeting link or location"** (placeholder "https://meet.google.com/… or an address") is shown, along with the button **"Open in Google Calendar"** (GoogleCalendarTemplateButton) (MeetCalendarFields.tsx:145-155; OutcomeSection.tsx:711-718).
- **template mode** (Google feature off): the same link/location field plus "Open in Google Calendar". Save label **"Schedule 1-1"**.
- **error mode**: the red alert "Couldn't check your Google connection. Try again." with the button **"Try again"**.
- **api mode** (connected; recruit-be creates the Google event and Meet), fields per MeetCalendarFields.tsx:92-143:
  - **"Length"** select: **"Settings default"** (default), **"15 minutes" / "30 minutes" / "45 minutes" / "60 minutes"** (meetingLength.ts:2; outcome.json:33; workQueue.json:119-121). It is sent as `meet_minutes` only when not the default.
  - **"Guest"** fact, which shows one of:
    - the loan officer's email (they will be invited);
    - "Checking whether the loan officer will be invited…";
    - "Couldn't check whether the loan officer will be invited.";
    - "This loan officer has no e-mail on file, so only the event is created; no invite goes out.";
    - "Not invited. Only the event is created on your calendar; no invite goes out."
    
    (workQueue.json:122-128)
  - **"Colleagues"** picker: hint "They get a Google Calendar invite.", placeholder "Search by name or e-mail", empty "No one found", max 10 (colleagues.ts:17).
    - It is pre-filled with the suggested onboarding specialist (or the current Meet colleagues on a re-book), and these can be removed.
    - If the BE rejects them: the red alert **"Some colleagues can't be invited. Remove them and try again."** In this case there is no toast and the modal stays open (OutcomeSection.tsx:408-411; workQueue.json:134).
  - The link is not editable. The text reads **"Google creates the Meet link"**, or **"Previous link, replaced when you save"** followed by the old link.
  - If an old non-Meet location or typed text exists, a warning also shows: **"This location will be replaced by a Google Meet link."** (outcome.json:30-32).
  - Save label (guestCopy.ts:25-30):
    - **"Save and send invite"** when the guest will be invited;
    - **"Save and create event"** when there is no guest;
    - **"Save"** while the guest check is pending or failed.
  - Later the Today card shows "Join Meet" / "Meet link coming" / "Couldn't create the Google event" (outcome.json:25-28).

### 4.3 Neutral
- Section **"When should they come back?"** (required asterisk), with month radio buttons **"In 1 month" / "In 2 months" / "In 3 months" / "In 6 months" / "In 12 months"** (`NEUTRAL_MONTH_CHOICES = [1,2,3,6,12]`, monthPicks.ts:4; outcome.json:81,103). There is no default.
- After a pick, the resolved wake date shows with a clock icon, e.g. "Mon, Apr 5, 2027". It uses the same day of the month, clamped to the end of the month (monthPicks.ts:12-38).
- Save is enabled once a month is picked. Its label is **"Move to Nurture"**.
- Payload: `nurture_until = <yyyy-MM-dd>`.
- Toast **"Moved to Nurture until {date}"**, using the date from the BE response, or **"Moved to Nurture"** (outcome.json:56-57,90; OutcomeSection.tsx:361-370).

### 4.4 No answer
- No extra fields; only the note. Save is always enabled. Its label is **"Save — schedule retry"** (outcome.json:91).
- The BE creates a retry follow-up. The FE then reads it and toasts **"Retry call scheduled for {Weekday, date}"**, or **"Retry call scheduled"** (OutcomeSection.tsx:378-387; outcome.json:54,79).

### 4.5 Not interested
- Section **"Why?"** (required asterisk), with these radio buttons:
  - **Not interested**
  - **Signed elsewhere**
  - **Wrong information**
  - **Asked to stop contact**
  - **Other**
  
  (OutcomeChoices.tsx:95-124; outcome.json:47-51,82,104)
  
  Clicking the picked reason again un-picks it (118).
- **Required** (Bao 06/10): Save is disabled until a reason is picked. **With "Other", the Note is also required.** A red * then appears on "Note", the textarea gets `required`, and Save stays disabled until the note has text (OutcomeSection.tsx:288-290,763-777).
- There is no inline error text; the gate is the disabled button only.
- Save is a red/danger button with an archive icon, labelled **"Archive candidate"** (outcome.json:92; WizardParts.tsx:57).
- Payload: `archive_reason` = the English reason string (e.g. "Signed elsewhere", "Other"). The note is sent as well.
- Toast **"Archived"** (outcome.json:58).

### 4.6 After save
- All `['recruit']` queries are refetched (Today ranking, drawer, lists).
- The pending-call strip and the red drawer box clear.
- The panel closes, unless a follow-up form below has unsaved typing (`keepOpen`). In that case the wizard retires and the panel stays (FollowUpsPanel/index.tsx:440-445; CandidateDrawer/index.tsx:410-412).
- On Hot/Cold, saving an outcome drops the kept "Yours" row (useClaimOutcome.tsx:49-60).

### 4.7 "New follow-up" form in the same panel (FollowUpsPanel/index.tsx:486-568; followups.json)
- Title **"New follow-up"** or **"Edit follow-up"**.
- Fields:
  - **"Kind"**: Call again / Send info / Webinar / Meet 1-1.
  - **"Follow up on"** (date) + **"Time"**, with the description "Pick the date and the time. It counts as past due once that moment passes.".
  - **"What are you following up on?"** (placeholder "e.g. Chase the Q3 referral we discussed").
- Live preview: **"Reminds you {when}"**.
- Validation error for a past moment: **"That moment has already passed. Pick a time still to come."**
- Buttons **"Cancel"** and **"Save follow-up"**.
- Row actions: **"Clear"**, **"Edit"**, and **"Remind later"**. Remind later offers "In a few hours" ({n} hours), "End of day", "Tomorrow morning", "Next business day", "Next week", "Choose another day".
- Toasts: "Follow-up added" / "Follow-up updated" / "Follow-up cleared" / "Could not save the follow-up" / "Could not clear the follow-up".

---

## Notes / UNCONFIRMED
- Old QA sheet item "Interested → 🤝 Invite to join": this is now the "Ready to join?" card with **"Yes, prepare offer"**. The drawer header button is **"Prepare offer"**, and only at S6.
- "Today ready strip" strings exist ("{name} is ready to join" / "interested on the call {when} — offer not sent yet" / "Prepare offer", outcome.json:94-97), but they are not used in the drawer. The other part covers them.
- Remind / Take back are not drawer actions (Exceptions only).
- `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED` changes SMS/Email behaviour. Its staging value is covered in the feature-flag part (UNCONFIRMED here).

---

# Part D: Offer modal, Exceptions and approvals, My invites actions, feature flags

Source: recruit-fe `origin/master` @ 1fc5521b (the staging build). Paths are relative to the repo root.
`P` = `src/app/[locale]/(private)`. "en:" points at `src/messages/en/<file>.json:<line>`.
Anything marked **UNCONFIRMED** was inferred and not read directly from code or config.

---

## 5. Offer modal (formerly "Invite to join")

Component: `src/shared/components/InviteModal/index.tsx`. Strings are in the `Invite` namespace, en: `invite.json`.
It calls `POST /candidates/{id}/offers` (`useRequestOffer`, index.tsx:111). It never calls approve, send or waive.

### 5.1 Where it opens, and who can open it

| Entry point | Label | Visible when | Cite |
|---|---|---|---|
| Candidate drawer header button | **"Prepare offer"** (`drawer_button`, en: invite.json:3) | `candidate.stage === 'S6'` AND `useInviteAllowed(candidate)` AND `canWrite` | `src/shared/components/CandidateDrawer/index.tsx:244-250` |
| Call result → Interested → card **"Ready to join?"** (`ready_question`, en: outcome.json:100) | button **"Yes, prepare offer"** (`ready_prepare_offer`, en: outcome.json:101) | `attitude === 'INTERESTED'` AND the host passed `onInvite`. Hosts pass it only when invite is allowed: drawer `canInvite && canWrite` (CandidateDrawer/index.tsx:397-404); Hot/Cold `canInvite` (`P/inbox/_shared/useClaimOutcome.tsx:50,92`); Today (`P/today/_components/TodayClient/index.tsx:136,699`); Focus (`FocusClient/index.tsx:118,559`) | `src/shared/components/FollowUpsPanel/OutcomeSection.tsx:276,482-502` |
| Today strip "Ready to join, offer not sent" (`ready_region`) | row text "**{name} is ready to join** · interested on the call {when} — offer not sent yet", button **"Prepare offer"** (`ready_send`, en: outcome.json:94-97) | `canSendInvite(candidate)` = `useCanInvite()` (owner or manager) | `P/today/_components/TodayClient/ReadyToJoinStrip.tsx:58-63`; TodayClient/index.tsx:99,606-610 |
| My invites, Declined row | **"Edit & resend"** reopens the same modal | stage `DECLINED`; blocked with toast "Only the lead's owner or a manager can invite." (`resend_blocked`) if the viewer is no longer owner or manager | `P/invites/_components/InvitesClient/index.tsx:204-221,424`; InviteRow.tsx:198-207 |

Clicking "Yes, prepare offer" first saves the call result with `sendInvite: true`, shows the toast **"Saved"** (`done_invite`, en: outcome.json:93), and then opens the Offer modal (OutcomeSection.tsx:293-311). The button is ignored while the follow-up form below it is dirty (`followUpFormDirty`, line 294).

**Who may invite.** This comes from `canInviteCandidate`, `src/hooks/useCanInvite.ts:20-24`:
- The viewer needs `OFFER_REQUEST`. Without it, no invite at all.
- A holder of `OFFER_APPROVE` (manager) can invite on any lead, including an unowned one.
- Otherwise the viewer must be the lead's current owner.
- Permissions fail open while they load.

**Hidden while an offer is already open.** This comes from `resolveInviteAllowed`, `src/hooks/useInviteAllowed.ts:21-36`:
- When the latest offer status is one of `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT` or `SIGNED`, there is no Invite button.
- A `DECLINED` offer can be invited again.
- Otherwise the BE flag `can_request_offer` from `invite-status` decides.
- While `invite-status` is loading, the button is hidden.
- With no `OFFER_READ`, or on a failed or old BE, it falls back to the owner-or-manager rule.

### 5.2 Modal layout (top to bottom)

- **Title:** "Offer — {name}" (`modal_title`, en: invite.json:4), with the candidate email as the subtitle (index.tsx:291-293). When there is no name, "(no name)".
- **Red alert when there is no MOSO record** (no `legacy_key`): "{name} can't be invited yet because they haven't signed up on the Loan Factory website. Ask them to sign up, then send the invite again." (`no_moso_record`, en:118; index.tsx:296-300). The send button is locked.
- **Section "NMLS"** (en:6; index.tsx:302-333):
  - If there is an NMLS: "✓ NMLS {id} — on file", plus a faint line "synced with Modex production" or "not yet synced with Modex".
  - If NMLS is missing, a warning in bold: "**NMLS missing from the profile** Add an NMLS number on the candidate's profile before sending the offer — the send button stays locked until then." (en:10-11).
    - For a normal user, a link button **"Update NMLS in the profile"** (en:12). It opens the candidate edit modal on the Licensing tab via `?c=…&edit=1&tab=licensing`. From `/today/focus` it navigates to `/today` (index.tsx:179-187).
    - For a program member (HEADHUNTER / TEAM_LEAD) the text is "Ask a manager to add the NMLS ID." (en:120).
- **Section "The two numbers"** (en:13; index.tsx:335-356):
  - "Loans since {year}" (the year comes from BE config `loans_since_year`) and "Loans in the last 12 months".
  - A number already on file shows read-only, for example "12 loans".
  - A missing number shows an inline NumberInput with placeholder "e.g. 12" (min 0). It is saved via `PUT candidate` before the offer request (index.tsx:236-262). If that save fails, the toast is "Could not save the number" (`toast_number_save_failed`).
  - For program members, or while role codes are still loading, a missing number shows "—" read-only and is not editable (index.tsx:94,338).
- **Section "Startup fee"** (en:20; index.tsx:358-387): a SegmentedControl with **"Charge $100"** (default) | **"Waive + reason"**.
  - Note: the `fee_charge_desc` and `fee_waive_desc` strings exist in the json but are NOT rendered.
  - With Waive selected, a Select labelled **"Waive reason"** appears. Its options (en:26-29) are:
    - "Top producer — priority close"
    - "Strategic partner — management-level agreement"
    - "Promotional program"
    - "Other — specify…"
  - With "Other" selected, a Textarea appears with placeholder "Explain why the fee is waived…". It must be non-blank after trimming.
- **Section "Email preview"**: shown ONLY when the onboarding hand-off flag is OFF (index.tsx:395-414).
  - Fields: To = candidate email, From = "LoanFactory Recruiting", subject "Invitation to join LoanFactory".
  - Body for Charge: "Hi {name}, following up on our conversation — please complete your profile. After your call with us, you will pay the $100 startup fee and sign."
  - Body for Waive: "Hi {name}, please complete your profile. After your call with us, you will sign. The startup fee is waived."
  - While the flag is loading, a skeleton shows instead. If the flag read fails, the section is hidden.
  - **STAGING: the hand-off flag is ON (see §8.2), so on staging the email preview is NOT shown.**
- **Footer note.** It appears when the request is known to need review: a warning "**Will need manager approval**".
  - A program member also gets " This invite goes to a manager for review before it is sent."
  - Waive also gets " Waiving the fee always needs a manager's approval." (index.tsx:417-430).
- **Buttons:** "Cancel" and the submit button with a → icon (index.tsx:432-445).

### 5.3 Submit label

Logic at index.tsx:164,189-197:

```
knownReview = programMember || feeChoice === 'WAIVE' || missingNumber   // missing loans-since OR 12-mo (after inline input)
label = knownReview            ? "Request approval"     (submit_review)
      : handoff flag ON        ? "Send to onboarding"   (submit_handoff)
      : handoff flag OFF       ? "Send invite"          (submit_generic)
      : flag loading/failed    ? "Send offer"           (submit_unsure)
```

- "Request approval" is styled as a soft amber warning button. The others are primary (index.tsx:437).
- **On staging** (hand-off ON), a non-waive offer with both numbers present, sent by a non-program user, shows **"Send to onboarding →"**. The old QA sheet's "Send invite →" will NOT appear on staging.
- The FE never predicts AUTO-approval from the thresholds. Even "Send to onboarding" can come back as pending; the BE `Offer.status` decides (comment at index.tsx:63-72).

### 5.4 Validation and disabled state

- The submit button is disabled when `!canSubmit || rolesLoading`. `canSubmit = hasMosoRecord && hasNmls && waiveOk` (index.tsx:161,439).
  - `waiveOk` means Charge, or Waive with a reason chosen. For "Other" the reason text must be non-blank.
  - There are no inline error messages. The button just stays disabled.
- Missing loan numbers do NOT block. They force the "Request approval" path.

### 5.5 Toasts after submit

From index.tsx:207-221:
- When the response status is not `SENT`: **"Sent for manager approval."** (`toast_pending`)
- When `SENT` and the hand-off is ON: **"Sent to onboarding — {name}"** (`toast_handoff`)
- When `SENT` and the hand-off is OFF: **"Invite sent — {name} can complete their profile now."** (`toast_sent`)
- On error: the BE message, or **"Could not send"**.

### 5.6 After send: drawer Overview card "Offer"

Component: `src/shared/components/InviteProgressCard/index.tsx`, mounted at `CandidateDrawer/OverviewTab.tsx:254`.

- **Visible when:** the viewer has `OFFER_READ` and an `offer_id` exists (lines 46-54).
- **Heading:** "Offer", with an ⓘ tooltip: "Invited means MOSO has the invite and is sending the email. … Times are when our system recorded the event (within about a minute)." (`progress_info`).
- **Steps, left to right** (lines 81-114):
  1. **"Invited"**. Detail is the time, or "Done" / "Pending". When there is a problem, a warning icon and one of: "Sending again", "Email not sent", "Specialist removed", "Not delivered to MOSO", "Email unconfirmed".
  2. **"1-1 done"**. Detail "Done" / "Not yet". This step only shows when the candidate carries `onboarding_meeting_reached` as a boolean.
  3. **"Paid the fee"**, or **"Fee waived"** when waived. Detail "Paid" / "Done" / "Not paid yet".
  4. **"Signed"**. Detail "Done" / "Not signed yet".
- **Below the steps:** the e-sign agreement status line (`AgreementStatusLine`). Its buttons include "E-mail the signing link…", "E-mail signing link again…", "Send updated agreement…", "Try again" and "Review" (en: agreement.json:3-7).
- **Drawer Attention block** for an offer (`src/shared/components/CandidateDrawer/AttentionBlock.tsx:120-175`):
  - Pending: blue "Offer is waiting for manager approval".
  - Overdue: red "Offer approval is overdue" + "Still waiting for a manager past the approval deadline. It stays pending and managers are reminded; it is never approved automatically."
  - Declined: red "Declined by {actor}: {reason}" (the actor falls back to "a manager").
  - Email problem: one of the `delivery_*` sentences (en: invite.json:67-84), plus a **"Resend invite"** button.
- **Resend invite** (`InviteProgressCard/ResendInviteControl.tsx`):
  - Shown only when the BE `can_resend === true` AND the viewer has `OFFER_REQUEST` or `OFFER_APPROVE` (lines 29-33).
  - Confirm dialog "Send the invitation email again?" with "{name} will get the invitation email again, sent from {sender}." and a possible-duplicate warning.
  - Buttons: "Cancel" / "Send again". When it may duplicate, the button is "Send it again anyway".
  - Toasts: "Queued. It goes out in a few minutes." / "Could not resend the invite".

---

## 6. Exceptions page (`/exceptions`) and manager approvals

Client: `P/exceptions/_components/ExceptionsClient/index.tsx`. Strings: `Exceptions` (en: exceptions.json) and `Approvals` (en: approvals.json).

### 6.1 IMPORTANT change since the 29-30/09 QA sheet

**"Offers waiting for your approval" is NO LONGER a section on Exceptions.**
- Exceptions now shows only a link for `OFFER_APPROVE` holders with items: "**{n} offer waits / offers wait on your decision → Today**" (`approvals_on_today_link`, en:82). It points to `/today#decisions` (ExceptionsClient:277-283).
- The approval table itself renders on **Today** under the heading **"Waiting on your decision"** (`Today.decisions_title`, en: today.json:107), anchor `#decisions` (`P/today/_components/TodayClient/index.tsx:500-509`).
- The default title "Offers waiting for your approval" (`Approvals.section_title`) is now only a fallback and is not used by Today.

### 6.2 Header and stat cards (ExceptionsClient:204-267)

- **Page title:** `Layout.nav_exceptions`.
- **Stat cards:**
  - "Overdue" (red)
  - "Unclaimed" (orange)
  - "Claimed, not contacted": only with `REPORT_TEAM` and when the endpoint exists
  - "Unowned" (red; bad when > 0)
  - "Owned" (green)
  - "Pending approval": only with `OFFER_APPROVE`; marked bad when any offer is past its SLA
- **Alerts:**
  - Error: "Could not load the HOT queue" / "This screen reads the same queue as Hot leads — try reloading."
  - Truncated: "The HOT queue is capped — clear these alarms and the rest surface."

### 6.3 Sections, in render order

1. **"Past their SLA"** (`section_overdue`) and 2. **"Unclaimed after {minutes} min"** (`section_stalled`)
   - Columns: Candidate | Source | Waiting | First-touch due | actions (ExceptionsClient:165-200).
   - Row actions (`ExceptionsClient/ExceptionRow.tsx:72-88`):
     - **"Claim"**: requires `CANDIDATE_CLAIM`.
       - Success toast: "Claimed {name} — they're on your Today now".
       - Failure toast: the BE message, or "Claim failed — someone may have beaten you to it". A 409 refreshes the list.
     - **"Assign"**: a menu (`_components/AssignMenu.tsx`).
       - Disabled without `CANDIDATE_TRANSFER`, with hover text "Assigning needs the CANDIDATE_TRANSFER grant (manager tier)".
       - Dropdown: a hot-contact warning, then the label "Assign to", then the people (`can_own` users), each with role codes.
       - Success toast: "Assigned {name} — cleared from Exceptions and Hot leads".
       - Failure toast: the per-row BE message, or "Assign failed" (ExceptionsClient:148-161).
3. **"Claimed, not contacted yet"** (`section_claimed_idle`): requires `REPORT_TEAM`. 403 and 404 are hidden silently.
   - Columns: Candidate | Owner | Claimed | Contact deadline.
   - Row notes:
     - "assigned by a manager"
     - "already in conversation"
     - "Releases in {time}" / "Releasing now" when auto-release is enforced
     - Otherwise "Due in {time}" / "Overdue by {time}"
     - Hover hints `idle_release_hint` / `contact_due_hint*`
   - Actions (`ClaimedIdleSection/ClaimedIdleRow.tsx:184-210`):
     - **"Remind"**:
       - Only shown when the notifications service is available (`ClaimedIdleSection/index.tsx:72`).
       - Popover with a textarea labelled "Note for {owner} (optional)", placeholder "e.g. They asked for a call before noon", and buttons "Cancel" / **"Send reminder"** (`RemindButton.tsx:48-78`).
       - Disabled on your own lead ("This is your own lead — you can't remind yourself"; inline "Your lead").
       - Disabled in cooldown ("Already reminded — you can remind again {when}"; inline "Reminded · again {when}").
       - Toasts:
         - "Reminded {owner} to contact {name}"
         - 409: "Couldn't remind about {name} — it was just reminded, contacted, or changed hands. The list is refreshed." or "Nothing to remind — contacted, reassigned, or no longer hot"
         - 404: "Reminders aren't available on this server yet."
         - Otherwise: "Couldn't send the reminder"
     - **"Take back"**:
       - Requires `CANDIDATE_TRANSFER`. When disabled, the hover text is "Only managers can take a lead back."
       - Confirm modal "Take this lead back?" with body "{name} goes back to the Hot pool and {owner} no longer owns it. Anyone can claim it from there." Buttons "Cancel" / **"Take back"** (`TakeBackModal.tsx:22-31`).
       - Toasts: "{name} is back in the Hot pool" / "Couldn't take the lead back" (`ClaimedIdleSection/index.tsx:120-130`).
     - **"Assign"**: the same menu as above, excluding the current owner.
   - Load error alert: "Could not load the claimed-but-not-contacted list — try reloading."
4. **"Ready to join, invite not sent"** (`section_ready_to_join`): requires `REPORT_TEAM` (`ReadyToJoinSection/index.tsx:92-120`).
   - Count chip, plus the hint "Shows after {n} day(s)". With `SETTINGS_MANAGE`, also a link " · Change in Settings" to `/settings`.
   - Columns: Candidate | Recruiter | Interested since | Waiting ("{n} days") | Call note.
   - Truncation note: "Showing {shown} of {total} — the rest are past the list cap".
   - Row action: **"Remind {recruiterFirstName}"** (`remind_recruiter`). It uses the same popover, "Send reminder".
     - Disabled when `can_remind === false`, with hover text "Can't remind right now — this is your own candidate, or a reminder went out recently" (`ReadyToJoinRow.tsx:78-84`).
     - Toasts: success "Reminded {owner} to contact {name}"; 409 "The invite may already have gone out, or this was just reminded. The list is refreshed." (or the cooldown / not-on-clock text); 404 "Reminders aren't available on this server yet."
   - Load error alert: "Couldn't load the ready-to-join list — try reloading the page."
   - There is no Invite button on Exceptions. A manager opens the candidate row (drawer) and uses "Prepare offer" there.
5. **Empty state.** Shown only when every list above is empty AND there are no pending approvals.
   - Title: "No alarms — every hot lead is on time".
   - Body: "Leads land here only when their first-touch SLA is blown or nobody claims them in time." When there are unowned leads, it adds " The Cold list is a different question: {count} people still have nobody on them." (ExceptionsClient:333-359).

### 6.4 Approval table (on Today, "Waiting on your decision")

Component: `P/exceptions/_components/ApprovalQueueSection/index.tsx`, rendered by TodayClient:500-509.

- **Shown when:** the viewer has `OFFER_APPROVE`, permissions are loaded, and there is at least one item.
- **Header:** the title plus a count chip. Truncation note: "Showing the oldest {shown} of {total}."
- **Columns:** Candidate (name, plus "NMLS {id} · {state}"; click opens the drawer) | Why it needs you | Waiting | actions.
- **"Why it needs you" chips** (en: approvals.json:8-13,31-39):
  - Rule reasons:
    - "Manual approval mode"
    - "No loans-since-{year} figure recorded"
    - "No last-12-month figure recorded"
    - "Below loans-since-{year} minimum"
    - "Below last-12-month minimum"
    - "Fee waiver requested" (amber)
  - Program reasons:
    - "Requested by a program member"
    - "Came through a program page"
    - "Loan count not verified yet"
    - "Below {threshold} loans in 12 months: will not count toward the program bonus"
    - "Credit question: …"
  - A red chip "Fee already paid" when applicable.
  - A line "Collected through {name}'s page".
  - For program offers, one of "The numbers alone meet the approval rule." / "…do not meet…" / "The approval rule was not checked for this invite."
  - A line "Since {year}: {since} · last 12 months: {recent}". A missing value shows as "not recorded" or "not recorded (needs {min})".
- **Waiting:** a humane duration, red once past the SLA.
- **Buttons** (index.tsx:282-340):
  - Non-waive row: **"Approve & send"**.
  - Waive row: two buttons.
    - **"Approve, keep $100 fee & send"**: primary, filled, listed first.
    - **"Approve, waive $100 & send"**: light amber with a warning icon.
  - Every row: **"Decline"**.
  - When `approval_refusal` is set, both Approve buttons are disabled and a visible line explains why:
    - "You can't approve this: you requested this invite."
    - "…the lead came through your own program page."
    - "You can't approve invites with your current role."
    - "…your program account isn't linked. Ask an admin to link it."
    - Generic: "You can't approve this one. Another manager has to decide."
- **Approve toasts:**
  - "Approved and sent to {name}"
  - Keep-fee variant: "Approved and sent to {name} — $100 fee kept, waive not applied"
  - Error: the BE message, or "Could not update this offer". The list refreshes.
- **Decline modal:**
  - Title "Decline this offer".
  - When the fee is already paid, a red alert: "This loan officer already paid the fee. Declining means the fee must be refunded — the reason will record it."
  - Textarea "Reason (kept in the offer history)". **The Decline button stays disabled until the trimmed reason has at least 4 characters** (`DECLINE_REASON_MIN = 4`, index.tsx:36).
  - When paid, the FE appends " [fee paid – refund owed]" to the reason (`approvalReasons.ts:18-22`).
  - Buttons: "Cancel" / **"Decline"** (red).
  - Toast: "Declined: {name}".

---

## 6b. My invites (`/invites`) row actions

Code: `P/invites/_components/InvitesClient/{index.tsx,InviteRow.tsx}` and `_utils/inviteView.ts`. Strings: en: invites.json.

- **Status cards** (index.tsx:68-87): "In progress" (default) · "Waiting approval" · "1-1 pending" · "Paying & signing" · "Signed" · "Declined" · "Expired". A dot means "has new updates".
- **Filters:**
  - Search: "Search name or NMLS".
  - "Requested" range: Last 7 days / Last 30 days / This quarter / All time / Custom… (hint "Pick both dates to apply the range.").
  - Sort hint: "Waiting longest first · late ones in red".
- **Columns:** Candidate | Status | Progress | Waiting | With.
- **The one action per row** (`actionFor`, inviteView.ts:58-65; InviteRow.tsx:180-218):
  - `WAITING_APPROVAL` → **"Remind manager"**: the popover with "Send reminder".
    - Disabled with "Already reminded — you can remind again a little later" when `can_remind_approver === false`.
    - Toast: "Reminded the managers about {name}".
  - `INVITED_1ON1_PENDING` AND late AND a specialist name is known → **"Remind onboarding"**.
    - Toast: "Reminded {who} about {name}".
  - `DECLINED` → **"Edit & resend"**: reopens the Offer modal.
    - Blocked toast: "Only the lead's owner or a manager can invite."
    - Load failure toast: "Couldn't open the invite for this candidate — try again."
  - Anything else → **"Open"**: opens the drawer.
  - When the invite email failed and can be resent, **"Resend invite"** replaces the action (InviteRow.tsx:126,209-211).
- **Remind error toasts:**
  - 404: "Reminders aren't available on this server yet."
  - 409: "Couldn't remind — it was just reminded or its status changed. The list is refreshed."
  - Otherwise: "Couldn't send the reminder"
- **There is NO "Take back" on My invites.** Take back exists only on the Exceptions "Claimed, not contacted yet" rows.
- **Empty and error states:**
  - Empty: "No invites in this status" / "Try another status card or a wider date range."
  - Error: "Couldn't load your invites".
  - Unavailable BE: "My invites isn't available yet".
  - Hidden-updates banner: "{n} update(s) in other statuses" plus a "Show" button.

---

## 8. Feature flags

### 8.1 Build-time `NEXT_PUBLIC_*`

Baked at Docker build: Dockerfile:33-51, `.github/workflows/cd-staging.yml:27-31`, `cd-production.yml:38-42`.

| Flag | What it gates in the UI | STAGING | PRODUCTION |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Gateway base for every API call (`src/apis/apiClient.ts:12`) | `https://gateway.viet18.com` | `https://gateway.loanfactory.com` |
| `NEXT_PUBLIC_ACCOUNT_URL` | SSO mode on. Login redirects to the Account portal; Sign out; Account links (`src/shared/utils/accountLogin.ts:12`, `src/hooks/useAccountUrl.ts:26`, `RecruitShell.tsx:39`). When unset, /login shows "Central SSO isn't configured…" (en: home.json:6) | `https://account.viet18.com` | `https://account.loanfactory.com` |
| `NEXT_PUBLIC_SESSION_HINT_DOMAIN` | Cookie domain of the session hint (`src/shared/utils/sessionHint.ts:28`) | `.viet18.com` | `.loanfactory.com` |
| `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED` | **SMS / Email TCPA gate.** ON: every SMS/Email click first calls the contact-route check. Failure toast "Couldn't check whether this person can be contacted, so nothing was opened. Try again."; blocked shows a block reason; the `OMNI_COMPOSER` route opens the in-app composer instead of the device. The conversation panel only offers channels that pass (`src/shared/components/ContactButtons/index.tsx:226-251`, `ConversationModal/index.tsx:158-175`, `src/shared/utils/contactRoute.ts:114`). OFF: logs and opens the device sms:/mailto: directly | `true` | empty (OFF) |
| `NEXT_PUBLIC_OMNI_INBOX_BUBBLE_ENABLED` | Floating Omni inbox bubble, bottom-right on every private page. It lists candidate conversations waiting on you; a row opens the ConversationModal. Also needs `CANDIDATE_READ` and a signed-in user (`src/shared/components/CandidateInboxBubble/index.tsx:121-142`, `src/shared/utils/omniInboxBubble.ts:10`) | `true` | `false` |
| `NEXT_PUBLIC_DEV_USER_ID` | Dev persona switcher in the header plus the X-User-ID impersonation (`src/shared/utils/devIdentity.ts:23`, `RecruitHeaderActions.tsx:19`) | not set (OFF) | not set |
| `NEXT_PUBLIC_SSO_AUTHORIZE_URL` | Mentioned only in README.md:27,50. No code reads it. Stale doc | n/a | n/a |

`helm-chart/config/staging/values.yaml` carries no `NEXT_PUBLIC_*`. The server-side `RECRUIT_BE_PROXY` (next.config.mjs:47) is a dev proxy only.

### 8.2 Runtime flags read from the BE that shape the FE

The BE values come from recruit-be `origin/master` `helm-chart/config/staging/values.yaml` and `application.yml:296-420`. The production values file sets none of these, so production runs on the defaults (all `false`).

| BE flag → FE field | FE effect | STAGING |
|---|---|---|
| `recruit.features.onboarding-v2-handoff` → `GET /config/candidate-view` `onboarding_v2_handoff` | Offer modal: submit label **"Send to onboarding"** instead of "Send invite"; email preview hidden; toast "Sent to onboarding — {name}" (InviteModal/index.tsx:101-109,189-197,395) | **true** (values.yaml:310-311, "turned on 06/10 by Bao") |
| `recruit.features.native-candidate-create` → candidate-view `native_candidate_create` | Pipeline "create lead" control, together with `CANDIDATE_CREATE` (`P/pipeline/_components/PipelineClient/index.tsx:112`) | not set → **false** (hidden) |
| `recruit.features.google-calendar-events` → Google status `calendar_events_enabled` | 1-1 booking mode (`src/shared/components/CalendarMode/calendarMode.ts:22-36`): `api` (BE creates the Google event and Meet) when connected; `connect` / `reconnect` banner when not; `template` when the flag is off or the endpoint is 404 | **true** (values.yaml:395). Guest policy ALLOWLIST = `bao.trinh+a3009f@loanfactory.com` only (values.yaml:397-400). Other invitees are presumably not added to the event (**UNCONFIRMED**) |
| `recruit.features.google-connect` | Settings > Connections "Connect Google" works (FE treats a 404 as disabled) | **true** (values.yaml:390) |
| `onboarding-writeback` → work row `onboarding_meeting.writeback_enabled` | Department work / Today onboarding "Done…" opens the meeting-date modal (`P/work/_components/WorkQueueClient/index.tsx:224,392`; `P/today/_components/OnboardingSection/useOnboardingActions.tsx:118`) | **true** (values.yaml:302) |
| `onboarding-hire-classification` → `hire_classification_enabled` | The Done… modal becomes the W-2/1099 hire-classification variant (`OnboardingHireMeetingModal.tsx:37`, WorkQueueClient:225,404) | **true** (values.yaml:319) |
| `agreement-send` | E-sign agreement buttons in the Offer card. When off, the reason text is "Sending the e-sign agreement from Recruit is switched off." Recipients are allow-listed on staging (`RECRUIT_AGREEMENT_SEND_ALLOWED_EMAILS` = 5 bao.trinh+… aliases); others get "This environment only sends the agreement to approved test recipients." (en: agreement.json:84,86) | **true** (values.yaml:339-345) |
| `onboarding-legal-name`, `onboarding-reminders`, `hr-handoff-publish`, `packs-writeback` | BE-side only (legal-name writeback, reminders, HR hand-off publish, MOSO writeback). Visible indirectly: Sync trace chip "writeback on/off" (`CandidateDrawer/SyncTraceSection/index.tsx:158`), Send to HR | all **true** on staging |
| `meet-attendance` | **UNCONFIRMED** FE use | not set → false |
| Setting `referrals.enabled` → `GET /me/nav-context` `referrals_enabled`, `has_referrals` | Sidebar: Referrals shows when `referrals_enabled`; My referrals when `referrals_enabled && has_referrals !== false` (`P/_components/recruitNav.tsx:324-325`; `src/apis/recruit/navContext.api.ts:12-33`). A missing field reads as false | An admin Settings value, not in helm. Staging value **UNCONFIRMED** |
| nav-context `role_codes` (HEADHUNTER / TEAM_LEAD = "program member") | Offer modal: figures read-only, always "Request approval", NMLS text "Ask a manager…" (InviteModal/index.tsx:34,90-95) | per user |
| Checklist templates / Sponsorships `gate_enabled` | Gate on/off footer text (`SponsorshipsClient/index.tsx:214`, `ChecklistTemplatesClient/index.tsx:92`) | data-driven |

There is also a code constant, `AUTO_OPEN_ONLY_FOR_KEPT_ROWS`, in `P/inbox/_shared/useClaimOutcome.tsx`. When true, the Hot/Cold pending-call auto-open of the Call result only happens for rows kept in place after Claim. Its value was not checked (**UNCONFIRMED**).
