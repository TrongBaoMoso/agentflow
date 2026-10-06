# Recruit staging: smoke and permission walk (2026-10-06)

- **Target:** https://recruit.viet18.com (staging). Password login at account.viet18.com.
- **Method:** Playwright 1.x, one headless Chromium with one light-mode context per account at 1440x900, run one account at a time and gated by ram-gate.
- **Read-only:** pages were only opened and read. No Claim, Invite, Approve, settings change or permission change was made. Inside the drawer nothing was clicked except Escape to close it.
- **API probes:** only GET requests, sent with the bearer token from the app's own session. The token and passwords were never logged.
- **Raw data:** `/private/tmp/claude-501/-Users-apple-Projects-agentflow/f22e0d83-d7a4-4e93-b528-b87074499b1b/scratchpad/smoke/result_<account>.json`
- **Script:** `/private/tmp/claude-501/-Users-apple-Projects-agentflow/f22e0d83-d7a4-4e93-b528-b87074499b1b/scratchpad/smoke/smoke.js`
- **Screenshots:** `/private/tmp/claude-501/-Users-apple-Projects-agentflow/f22e0d83-d7a4-4e93-b528-b87074499b1b/scratchpad/smoke/shots/<account>/<route>.png`, plus `drawer_inbox_hot.png` and `drawer_pipeline.png` per account and `recruiter/mobile_today.png` and `recruiter/mobile_drawer.png`.

## Login

| Account | Expected role | Login | Actual role (from /admin/rbac/me) | Sign-out |
|---|---|---|---|---|
| bao.trinh+recruiter | RECRUITER | OK, no verification code | Recruiter permission set | OK, ended at account.viet18.com/login |
| bao.trinh+manager | MANAGER | OK | Manager set (AUDIT_VIEW, REFERRAL_ADMIN_VIEW, SYNC_TRACE_READ, CANDIDATE_TRANSFER, OFFER_APPROVE…) | OK, ended at account login |
| bao.trinh+onb-test | ONBOARDING | OK | Onboarding set (CHECKLIST_TEMPLATE_MANAGE_ONBOARDING, CANDIDATE_HR_HANDOFF, SYNC_TRACE_READ…). It has no CANDIDATE_CLAIM and no OFFER_REQUEST. | OK, ended at account login |
| bao.trinh+hh | HEADHUNTER | OK | Program role set (OFFER_REQUEST, CANDIDATE_CLAIM, TEMPLATE_CREATE, CHECKLIST_READ…) | OK, ended at recruit /login |
| chauchau.inc@gmail.com | unknown (expected no access) | **OK** | **ADMIN, `["*"]`** | **Not confirmed.** The sign-out control was clicked but the page stayed on /today. The context was closed anyway, so the session was discarded. |

None of the accounts was asked for a verification code.

## Account × route

How to read a cell:
- The number is the HTTP status of the page document.
- `→ /today` means the page guard sent the account back to /today.
- `⚠` lists the app's own API calls on that page that failed (status 400 or higher).
- The 403 on `/offers/mine/unseen-count` is left out of this table: it fails on every page for Onboarding (see finding F4).

| Route | recruiter | manager | onboarding | headhunter | chauchau |
|---|---|---|---|---|---|
| `/today` | 200 | 200 | 200 | 200 | 200 |
| `/today/focus` | 200 | 200 | 200 | 200 | 200 |
| `/inbox/hot` | 200 | 200 | 200 | 200 | 200 |
| `/inbox/cold` | 200 | 200 | 200 | 200 | 200 |
| `/pipeline` | 200 | 200 | 200 | 200 | 200 |
| `/invites` | 200 | 200 | 200 → /today | 200 | 200 |
| `/my-referrals` | 200 | 200 | 200 | 200 | 200 |
| `/exceptions` | 200 | 200 | 200 | 200 ⚠ 403 /reports/recruiters | 200 |
| `/reports` | 200 | 200 | 200 | 200 ⚠ 403 /reports/recruiters, 403 /kpi/trends | 200 |
| `/work` | 200 | 200 | 200 | 200 ⚠ 403 /checklist/departments/ONBOARDING/queue | 200 |
| `/sponsorships` | 200 | 200 | 200 | 200 ⚠ 403 /sponsorships | 200 |
| `/templates` | 200 | 200 | 200 → /today | 200 | 200 |
| `/duplicates` | 200 | 200 | 200 | 200 ⚠ 403 /duplicates | 200 |
| `/dormant` | 200 | 200 | 200 | 200 | 200 |
| `/conversations` | 200 | 200 | 200 | 200 | 200 |
| `/audit` | 200 → /today | 200 | 200 → /today ⚠ 429 /user-svc/api/v1/users/search, 429 /kpi/pipeline | 200 → /today | 200 |
| `/referrals` | 200 → /today | 200 | 200 → /today | 200 → /today | 200 |
| `/settings` | 200 → /today | 200 → /today | 200 → /today | 200 → /today | 200 |
| `/settings/connections` | 200 | 200 | 200 | 200 | 200 |
| `/checklist-templates` | 200 | 200 | 200 | 200 ⚠ 403 /admin/checklist/templates | 200 |
| `/licensing-rules` | 200 → /today | 200 → /today | 200 → /today | 200 → /today | 200 |
| `/permissions` | 200 → /today | 200 → /today | 200 → /today | 200 → /today | 200 |
| `/hot` | 404 | 404 | 404 | 404 | 404 |
| `/cold` | 404 | 404 | 404 | 404 | 404 |
| `/my-invites` | 404 | 404 | 404 | 404 | 404 |
| `/program-members` | 404 | 404 | 404 | 404 | 404 |

**Load time (ms, DOM + network idle)** — median per account: recruiter 3368 (max 4042 on /duplicates); manager 3381 (max 5027 on /referrals); onboarding 3398 (max 4171 on /duplicates); headhunter 3016 (max 16158 on /reports); chauchau 3435 (max 5026 on /referrals)

### Nav per role (sidebar, text → href, badge counts stripped)

- **recruiter** (RECRUITER): Today `/today` · Hot leads `/inbox/hot` · Cold list `/inbox/cold` · Pipeline `/pipeline` · My invites `/invites` · Templates `/templates` · Dormant `/dormant` · Conversations `/conversations` · Connections `/settings/connections`
- **manager** (MANAGER): Today `/today` · Hot leads `/inbox/hot` · Cold list `/inbox/cold` · Pipeline `/pipeline` · My invites `/invites` · My referrals `/my-referrals` · Exceptions `/exceptions` · Reports `/reports` · Department work `/work` · Templates `/templates` · Duplicates `/duplicates` · Dormant `/dormant` · Conversations `/conversations` · Audit `/audit` · Referrals by referrer `/referrals` · Connections `/settings/connections`
- **onboarding** (ONBOARDING): Today `/today` · Department work `/work` · Conversations `/conversations` · Checklist templates `/checklist-templates` · Connections `/settings/connections`
- **headhunter** (HEADHUNTER): Today `/today` · Hot leads `/inbox/hot` · Pipeline `/pipeline` · My invites `/invites` · My referrals `/my-referrals` · Templates `/templates` · Connections `/settings/connections`
- **chauchau** (UNKNOWN (TERA+HR)): Today `/today` · Hot leads `/inbox/hot` · Cold list `/inbox/cold` · Pipeline `/pipeline` · My invites `/invites` · My referrals `/my-referrals` · Exceptions `/exceptions` · Reports `/reports` · Department work `/work` · Sponsorships `/sponsorships` · Templates `/templates` · Duplicates `/duplicates` · Dormant `/dormant` · Conversations `/conversations` · Audit `/audit` · Referrals by referrer `/referrals` · Settings `/settings` · Checklist templates `/checklist-templates` · Licensing rules `/licensing-rules` · Permissions `/permissions` · Connections `/settings/connections`

### API GET probes (Bearer token captured from the app session, read-only GETs under `gateway.viet18.com/recruit-svc/api/v1`)

| Path | recruiter | manager | onboarding | headhunter | chauchau |
|---|---|---|---|---|---|
| `/admin/rbac/me` | 200 | 200 | 200 | 200 | 200 |
| `/admin/settings` | 403 | 403 | 403 | 403 | 200 |
| `/admin/rbac/roles` | 403 | 403 | 403 | 403 | 200 |
| `/admin/rbac/grants` | 403 | 403 | 403 | 403 | 200 |
| `/admin/audit-events?page=0&size=1` | 403 | 200 | 403 | 403 | 200 |
| `/admin/checklist/templates` | 200 | 200 | 200 | 403 | 200 |
| `/admin/licensing/state-rules` | 403 | 403 | 403 | 403 | 200 |
| `/admin/program-members/pending` | 403 | 403 | 403 | 403 | 200 |
| `/referrals?page=0&size=1` | 403 | 200 | 403 | 403 | 503 |
| `/referrals/mine?page=0&size=1` | 200 | 200 | 200 | 200 | 503 |
| `/reports/recruiters` | 200 | 200 | 200 | 403 | 200 |
| `/templates/manage` | 200 | 200 | 403 | 200 | 200 |
| `/sponsorships` | 200 | 200 | 200 | 403 | 200 |
| `/duplicates` | 200 | 200 | 200 | 403 | 200 |
| `/offers/mine` | 200 | 200 | 403 | 200 | 200 |

**/admin/rbac/me permissions**

- **recruiter**: OFFER_REQUEST, CHECKLIST_READ, CANDIDATE_CREATE, CANDIDATE_ARCHIVE, TEMPLATE_CREATE, CANDIDATE_CLAIM, CANDIDATE_TRANSITION, CANDIDATE_READ, OFFER_READ, ACTIVITY_READ, ACTIVITY_LOG, CANDIDATE_LEGAL_NAME_CONFIRM, SUPPRESSION_MANAGE, CANDIDATE_UPDATE
- **manager**: OFFER_REQUEST, CANDIDATE_CREATE, SYNC_TRACE_READ, CANDIDATE_CLAIM, CANDIDATE_READ, ONBOARDING_SPECIALIST_ASSIGN, REFERRAL_ADMIN_VIEW, CANDIDATE_LEGAL_NAME_CONFIRM, CANDIDATE_UPDATE, CANDIDATE_MERGE, CHECKLIST_READ, AUDIT_VIEW, LABEL_MANAGE, CANDIDATE_ARCHIVE, TEMPLATE_CREATE, REPORT_TEAM, CANDIDATE_TRANSFER, REFERRAL_ATTRIBUTION_READ, CANDIDATE_TRANSITION, OFFER_APPROVE, OFFER_READ, ACTIVITY_READ, ACTIVITY_LOG, SUPPRESSION_MANAGE, TEMPLATE_APPROVE
- **onboarding**: CHECKLIST_READ, CHECKLIST_TEMPLATE_MANAGE_ONBOARDING, CHECKLIST_ITEM_MANAGE_ONBOARDING, SYNC_TRACE_READ, CANDIDATE_READ, CANDIDATE_OVERRIDE_GATE, OFFER_READ, ONBOARDING_SPECIALIST_ASSIGN, ACTIVITY_READ, CANDIDATE_LEGAL_NAME_CONFIRM, CANDIDATE_HR_HANDOFF, CANDIDATE_UPDATE, SPONSORSHIP_ACCESS_RECORD, AGREEMENT_SEND
- **headhunter**: OFFER_REQUEST, CANDIDATE_CLAIM, CANDIDATE_TRANSITION, CANDIDATE_READ, CHECKLIST_READ, OFFER_READ, CANDIDATE_ARCHIVE, TEMPLATE_CREATE, ACTIVITY_READ, ACTIVITY_LOG, CANDIDATE_LEGAL_NAME_CONFIRM, CANDIDATE_UPDATE
- **chauchau**: *

### Drawer per role (first row; nothing clicked inside)

| Account | From | Candidate | Tabs | Buttons visible (header + body) |
|---|---|---|---|---|
| recruiter | `/inbox/hot` | Chowfi Toni (`228956d5-929d-497a-a12b-88913778c5fc`) | Overview, Activity, Profile | Close, Label, Call now, SMS, Email, Open conversation, All activity, Full profile |
| recruiter | `/pipeline` | QA Autoa (`73472350-d093-411c-aaa8-370d2394bfae`) | Overview, Activity, Profile | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile, Hand off |
| manager | `/inbox/hot` | Chowfi Toni (`228956d5-929d-497a-a12b-88913778c5fc`) | Overview, Activity, Profile, Sync | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile, Reassign |
| manager | `/pipeline` | QA Autoa (`73472350-d093-411c-aaa8-370d2394bfae`) | Overview, Activity, Profile, Sync | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile, Reassign |
| onboarding | `/inbox/hot` | Chowfi Toni (`228956d5-929d-497a-a12b-88913778c5fc`) | Overview, Activity, Profile, Sync | Close, Label, All activity, Full profile |
| onboarding | `/pipeline` | QA Autoa (`73472350-d093-411c-aaa8-370d2394bfae`) | Overview, Activity, Profile, Sync | Close, Label, All activity, Full profile |
| headhunter | `/inbox/hot` | not opened (0 rows) |  |  |
| headhunter | `/pipeline` | Hhlead Testfive (`a362b08c-c00d-4641-af23-ec013bb2d269`) | Overview, Activity, Profile | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile |
| chauchau | `/inbox/hot` | Chowfi Toni (`228956d5-929d-497a-a12b-88913778c5fc`) | Overview, Activity, Profile, Sync | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile, Reassign |
| chauchau | `/pipeline` | QA Autoa (`73472350-d093-411c-aaa8-370d2394bfae`) | Overview, Activity, Profile, Sync | Close, Label, Call now, SMS, Email, Open conversation, Add follow-up, All activity, Full profile, Reassign |

## Checks against the expected permission matrix

| Rule | Result | Evidence |
|---|---|---|
| Settings: Admin / SETTINGS_MANAGE only | PASS | Every non-admin account is sent from `/settings` to `/today`, and `GET /admin/settings` returns 403. Admin (chauchau) gets 200. Nobody except Admin has it in the nav. |
| Permissions: Admin only | PASS | Every non-admin account is sent to `/today`. `/admin/rbac/roles` and `/admin/rbac/grants` return 403. Admin gets 200. |
| Audit: Manager and Admin | PASS | Manager and Admin can open it and `/admin/audit-events` returns 200. Recruiter, Onboarding and Headhunter are sent to `/today` and get 403. |
| Templates: Recruiter, Manager, LO support, Admin | **MISMATCH (Headhunter)** | Headhunter has **Templates** in the nav, can open `/templates`, and `GET /templates/manage` returns **200**, because the role holds `TEMPLATE_CREATE`. Onboarding is correctly blocked: it is sent to `/today` and gets 403. |
| Checklist templates: HR, Licensing, Onboarding, Accounting, Admin | **PARTIAL** | The nav is correct: only Onboarding and Admin see it. **But Recruiter and Manager can open `/checklist-templates` by typing the URL.** They see a "View only" page and `GET /admin/checklist/templates` returns 200, because every role holds CHECKLIST_READ. The FE code says this is intended (`recruitNav.tsx`: "every role now holds that read"). Headhunter is blocked with a lock screen and a 403. HR, Licensing and Accounting were not tested: there was no account for them. Note that the FE code no longer counts the HR and Licensing grants (Bao, 01/10), which differs from the matrix. |
| Licensing rules: Licensing and Admin | PASS for the roles tested | Every non-admin account is sent to `/today` and `/admin/licensing/state-rules` returns 403. Admin gets 200. Licensing itself was not tested (no account). |
| Pipeline has no "Add lead" button for anyone | PASS | No account had an Add lead, New lead or Create candidate button on `/pipeline`. The script also flagged "New lead" for Headhunter, but the screenshot shows that is the S1 stage filter tab, not a create button. |
| Recruiter drawer has no "Sync trace" tab | PASS | Recruiter tabs are Overview, Activity and Profile. **Sync** appears for Manager, Onboarding and Admin (SYNC_TRACE_READ). Headhunter also has no Sync tab. |
| Recruiter has no "Send to HR" | PASS (Overview tab only) | No Send to HR button appears in the Recruiter drawer, and Recruiter lacks `CANDIDATE_HR_HANDOFF`. The recruiter's "Hand off" button is the peer hand-off on their own lead (D141), not Send to HR. Only the Overview tab was inspected. Send to HR did not appear for any role on the two candidates sampled. |
| Onboarding: no Invite or Offer, cannot Claim | PASS | The Onboarding drawer shows only Close, Label, All activity and Full profile. There were 0 Claim buttons on hot, cold and pipeline (Recruiter saw 3, 50 and 17). `GET /offers/mine` returns 403 and `/invites` sends the account to `/today`. |
| chauchau (TERA + HR staging) expected to have no access | **MISMATCH** | The account holds **ADMIN (`*`)** in recruit staging. It sees all 21 nav entries, including Settings, Permissions and Licensing rules, and every admin GET returns 200. |

## Other findings (most important first)

1. **F1: chauchau.inc@gmail.com is a full Recruit ADMIN on staging.** Is that intended? If the account is only meant for TERA and HR, its grant should be removed through `/permissions`. This run did not change it.
2. **F2: Headhunter has Templates (`TEMPLATE_CREATE`).** This is the matrix mismatch above. Either the seed should drop `TEMPLATE_CREATE` for HEADHUNTER, or the matrix should add Headhunter.
3. **F3: Headhunter sees different screens for the same 403 on pages hidden from its nav.**
   - `/work`, `/sponsorships` and `/checklist-templates` show a proper lock screen ("not available to your role").
   - `/reports`, `/duplicates` and `/exceptions` show a generic red "Could not load … try reloading" banner instead.
   - `/reports` took **16.2 s** to settle, probably while retrying the 403.
   - The Sponsorships lock screen says "This page needs checklist read access", but `/admin/rbac/me` shows Headhunter *holds* CHECKLIST_READ. The back end denies it by program scope, so the message is misleading.
   - Screenshots: `shots/headhunter/{work,sponsorships,checklist-templates,reports,duplicates,exceptions}.png`.
4. **F4: Onboarding sends a 403 on every page.** `GET /recruit-svc/api/v1/offers/mine/unseen-count` returns 403 and the console logs `[API Error] … FORBIDDEN` on every route and in the drawer. The "My invites" badge query still fires even though the entry is hidden and the role lacks OFFER_REQUEST. The query should be gated on the same permission or role.
5. **F5: Rate limiting on the staging gateway.** While the Onboarding walk was opening `/audit` (which then sent it to `/today`), the gateway answered **429** to `POST /user-svc/api/v1/users/search` and `GET /recruit-svc/api/v1/kpi/pipeline`. The walk loads about one page every 3 s, so a fast user could hit the same limit.
6. **F6: Admin got 503 from `GET /referrals` and `GET /referrals/mine`** on the direct probe (`page=0&size=1`). Manager got 200 for the same calls, and the Admin UI pages `/referrals` and `/my-referrals` loaded without network errors. This is one sample and may be transient, so it should be re-checked.
7. **F7: Pages hidden from the nav still open by URL, with data, for several roles.** The FE says this is by design: the nav controls visibility only and the back end is the gate.
   - **Recruiter:** `/exceptions` (with live Claim buttons), `/reports`, `/duplicates`, `/sponsorships`, `/work`, and `/checklist-templates` (view only).
   - **Onboarding:** `/inbox/hot`, `/inbox/cold`, `/pipeline`, `/exceptions`, `/reports`, `/duplicates`, `/sponsorships` and `/dormant`. It reads them but has no Claim.
   - **Headhunter:** `/inbox/cold` ("No candidates match", so scoped), `/dormant` and `/conversations`.

   If the matrix means *access* rather than *visibility*, these are mismatches.
8. **F8: Route names in the brief.** `/hot`, `/cold`, `/my-invites` and `/program-members` return a real 404 for everyone. The real routes are `/inbox/hot`, `/inbox/cold` and `/invites`. There is no program-members page: it is managed through `/permissions` and `/admin/program-members/*`.
9. **F9: The Headhunter Hot leads list is empty** (0 rows, no Claim buttons), so its drawer was sampled from Pipeline instead (candidate "Hhlead Testfive"). This fits the program scope.
10. **Mobile at 375 px (Recruiter):** `/today` has no horizontal overflow (`scrollWidth` equals `clientWidth`). The drawer, opened from `/pipeline` because the Hot list at 375 px has no table rows to click, also has no overflow and lays out correctly.
    - `shots/recruiter/mobile_today.png`
    - `shots/recruiter/mobile_drawer.png`

## Console and network errors, grouped

- `404 recruit.viet18.com/{hot,cold,my-invites,program-members}`: these routes do not exist (F8). All accounts.
- `403 /recruit-svc/api/v1/offers/mine/unseen-count`: Onboarding, on every page and in the drawer (F4).
- `403 /reports/recruiters` and `/kpi/trends`; `403 /checklist/departments/ONBOARDING/queue`; `403 /sponsorships`; `403 /duplicates`; `403 /admin/checklist/templates`: Headhunter, on the pages it reaches by URL (F3).
- `429 /user-svc/api/v1/users/search` (POST) and `429 /kpi/pipeline`: Onboarding, once (F5).
- No `pageerror` and no other console errors appeared for Recruiter, Manager or Admin on any real route.

## Not covered

- Roles with no test account: HR, Licensing, Accounting, LO support, Team lead, Officer recruiter.
- Only the Overview tab of the drawer was inspected. Activity, Profile and Sync were not opened, and no action menus were opened.
- Dark theme was not screenshotted.
