# R1 — Replacements for capability group 1: lead intake and Loan Officer data

Researcher R1, 21/10/2026. Read-only. No builds, no browsers, no calls to staging or production.

## 0. What was read, and how

| Source | Ref | How |
|---|---|---|
| Audits A, B, C (moso-deps/) | files of 21/10 | read |
| recruit-be | `8c064b0d` | `git show` / `git grep` |
| tera-docs | `origin/master` `6878c44` (fetched) | `git show` |
| lf-homepage | `origin/master` `e3ad06d5` (fetched) | `git grep` |
| lo-homepage | `origin/master` and `origin/produciton-v2` (fetched) | `git grep` |
| moso-aid | `origin/master` `17aa1e7` (fetched; still the tip) | `git show` |
| packs | `origin/master` | entity check only |
| ai-hr-be | `origin/master` `c44c4ba6` | `git show` |
| lfiq-backend | `origin/develop` `2eca594c1` | `git show` |
| omni-service | `origin/master` `d59d267` | `git grep` |
| callcenter ("nova") | `origin/main` `080fc46` | `git show` |
| ally-backend-platform | `origin/dev` `63d787b2` | `git grep` |
| user-service docs | tera-docs `user/USER_SYNC_PIPELINE.md` | read |
| **Not cloned locally, shallow read-only clones in my session scratchpad** | | |
| lead-be | `842b6c6` (master, 20/10) | grep |
| crm-be-go | `0c32ca5` (develop, 20/10) | grep |
| ai-donotcall | `10e9271` (master, 07/10) | grep |
| notification-service | `53a6354` (master, 20/10) | README |
| accounting-be | `be7e1e6` (20/10) | grep |
| ai-browser, ai-workflow, ai-clo-scorecard, ai-mcp-sever, marketplace-be, partner-fe | tips of 20/10 | grep |
| Org inventory | `gh repo list LoanFactory-Inc` (170 active repos) and `mosoteam` (2) | listed |
| Org-wide code search | `gh search code --owner LoanFactory-Inc` for `webinar`, `loan_officer_recruiting`, `lo_recruiting`, `LORecruiting`, `recruit-svc` | default branches only. Then the code-search rate limit ran out; the rest was grep over local or shallow clones |

Evidence format: `repo@ref:path:line`. "Live in prod" means I saw a production deploy run or prod helm values. I did not query any running system.

**Scope labels used here.** "Old MOSO" follows the lead's definition: packs, moso, base, moso-configuration, moso-aid and Datastore SystemProps/Templates. omni-service, moso-notifier/notification-service, user-service, ai-hr-be, lead-be, crm-be-go and ai-donotcall are treated as non-MOSO platform services. Audit A put omni-service on the MOSO list, so the lead should confirm that line (see Open questions).

---

## 1. One-page answer

| # | Capability | Non-MOSO service that already does it | Recommendation | Size |
|---|---|---|---|---|
| 1 | Public lead capture (Register LO, /join, Refer-a-LO, webinar sign-up, FB ads, Calendly) | **Nothing for Loan Officer recruiting.** Borrower leads have exactly this pattern already: **lead-be** `internal/intake` (7 keyed public forms + a MOSO feed) and **callcenter/nova** `docs/LEAD_INTAKE.md` ("every MOSO lead-creation path re-implemented"), including a Meta `leadgen` webhook | **OWN in Recruit**: a public keyed intake in recruit-be, a port of lead-be's design. Repoint the lf-homepage/lo-homepage forms. Run it alongside the MOSO push first | **L** |
| 2 | Lead/contact store, dedup, identity key | Recruit already owns the store and dedup. No platform person id for non-employees: the Person Directory is "design, reviewed, **not built**". user-service is canonical only for people who already have an account, and MOSO feeds it | **OWN in Recruit**: the candidate UUID becomes the key, `legacy_key` becomes optional. Link to the user-service `user_id` after hire | **M** (many call sites) |
| 3a | Closed loans / volume | Modex/MMI is already in recruit and is not MOSO | **OWN** (Modex): drop the MOSO loan fields | **S** |
| 3b | NMLS id/status, licence per state, sponsorship | **ai-hr-be** has a live NMLS company-account session and report puller (today it pulls renewal reports only). **ai-browser** has an NMLS lookup that runs a script on a developer's Mac. user-service/HR licences exist only after hire | **EXTEND ai-hr-be**: add a sponsorship/relationship report, or build a recruit-owned NMLS pull on the same client | **M** |
| 4 | Suppression / opt-out | **ai-donotcall** (live in prod): platform **blacklist** + **DNC** (phone only). **omni** `comm_suppression` (STOP_SMS learned from inbound). notifier-be/notification-service `mail_blacklist` + `notification_preference` (email; production cut-over pending). Recruit already owns its own `suppression_list` | **USE ai-donotcall** for blacklist and call; **USE omni** for SMS STOP; keep recruit's ledger as the local enforcement copy. One last MOSO import seeds the history | **M** |
| 5 | Webinars (list, register, attendance) | **Nothing outside MOSO.** An org-wide search for "webinar" hits only packs, moso-configuration, lf/lo-homepage and recruit. A MOSO webinar is a Google Calendar event with a Meet link. **Recruit already has a Google Calendar client and Meet attendance** | **OWN in Recruit**: webinars as calendar events + Meet attendance (code already present) | **M** |
| 6 | Referral / Ambassador: who referred whom, bonus state, payment | Recruit already owns a referral **attribution ledger**. Referral standing and the bonus "Check" live only in packs. **accounting-be** has payment tickets/runs but no bonus concept | **OWN** attribution + bonus state in Recruit; **EXTEND accounting-be** to pay a bonus (as a ticket), or keep paying it manually | **M–L** |
| 7 | LO Recruiter Program / Headhunter roster | moso-aid (Node + **MongoDB**, Cloud Run in MOSO projects; identity = MOSO Admin keys; reads MOSO webplus unauthenticated). **It is old MOSO by any useful test** | **OWN in Recruit** (roster + applications + approvals keyed on the central user id). Migrate the Mongo collections once | **M–L** |
| 8 | Lead origin (/join), pay-gate `register-status` | Origin is stamped by packs. The **pay-gate caller was deleted** from lf-homepage on 29/09 (`72cef7e3`); production lf-homepage reads MOSO `onboarding_meeting_status` instead | Origin: **OWN** (comes free with #1). Pay-gate: needs the payment step (PayPal) moved too, which is group-2 scope (offer/fee) | S (origin) / see group 2 |
| 9 | Cold pool stock (106k RLO + 23k ILO) | Nothing. The export op + runner + import API exist in packs and recruit. Staging was imported (7,221 rows). **Production was never bulk-imported** (377 Cold rows on 13/10) | **One-time migration** using the tools that exist, before MOSO is switched off. Needs the owner-map decision | **M** (ops) |

**Ordering constraint that matters most.** Items 1, 2 and 9 are coupled. Recruit cannot take its own leads (1) until a candidate without `legacy_key` can be invited (2). And once MOSO stops being the door, the remaining MOSO-only data (Cold stock, opt-out ledgers, referral and program history) must already have been copied (9, 4, 6, 7). See §11.

---

## 2. Capability 1 — public lead capture

### Today

- Every Loan Officer enters Recruit from a MOSO `LORecruiting` save, through the push (A-001, A-003, B-020, B-021, C-001). Native create is off (`recruit.features.native-candidate-create` default false, recruit-be@8c064b0d:src/main/resources/application.yml:373; C-002).
- The public forms post to **packs WebPlus**, not to Recruit. lf-homepage@e3ad06d5:src/apis/loanfactoryApi.ts:
  - `registerLoanOfficer` → `/api/webplus/v1/{ns}/registerLoanOfficer` (file :~803)
  - `submitReferALoanOfficer` → `/api/webplus/v1/{ns}/submitReferALoanOfficer` (:~780)
  - `registerWebinar` → `/api/webplus/v1/{ns}/registerWebinar` (:601-602)
  - `fetchNextWebinars` → `getNextWebinars?type=loan_officer_recruiting` (:591-596)
  - `/join/[slug]` page: `src/app/[locale]/(public)/join/[slug]/page.tsx:12,72` and `.../SessionPicker/index.tsx:24` (`registerLoanOfficer`, `registerWebinar`)
  - pay/sign steps also go to packs: `registerSigningAgreement`, `getRegisterLoanOfficer?key=`, `saveLoanOfficerPaidStartupFee`, `submitCorporateDiscount`
- Other MOSO-only doors (B-021): FB lead ads `SaveILOFacebookAdOp`, Calendly `InterestedLoanOfficerCalendlyWebHookServlet`, CSV uploads `ParseFileCsvILOsOp`/`ParseFileCsvDurationILOOp`, admin-typed rows (D289).
- Recruit's only public routes: the MOSO webhook, the omni host-subjects SPI and `register-status` (recruit-be@8c064b0d:.../PublicWebhookController.java:62, HostSubjectsController.java:52, RegisterStatusController.java:51). **Recruit has no public intake endpoint.**

### Candidates

| Service | What it does today | Live in prod? | Gap for LO recruiting |
|---|---|---|---|
| **lead-be** (Go) | Company **borrower** leads. `internal/intake/handler.go:39-46` mounts 7 public forms under `/api/v1/intake/{name}` with **per-caller API keys** (`INTAKE_API_KEYS`, key → caller name, :24-32,56-59), plus `POST /intake/moso`, which takes MOSO's lead feed during the transition (`internal/intake/moso.go` header: "MOSO is still where LoanFactory's leads arrive. Every new one is pushed here"). Blacklist + DNC screening on capture (`internal/compliance/`, README layout) | **Yes**: `cd-production.yml` success on 08/10 (`gh run list`) | Borrower domain, borrower schema, MOSO LeadPipelineAPI conversion. Not a home for LO candidates. **Its value is as the template**: keyed public forms, a strangler feed from MOSO, idempotent "duplicate" answers |
| **callcenter / "nova"** (Next.js) | `docs/LEAD_INTAKE.md`: "Every lead-creation path of the legacy MOSO system, re-implemented in nova" — `/api/webhooks/*` (per-route secret, includes the Meta `leadgen` envelope and `FACEBOOK_PAGE_TOKEN` fetch of `field_data`), `/api/intake/*` (INTAKE_API_KEY), officer entry | not verified | Borrower domain. **It is the precedent that this exact migration has been done once for borrowers**, Meta lead ads included |
| **ally-backend-platform** | Meta Ads `leadgen` sync for **LO's own ad campaigns** (`.changeset/ads-lead-sync-beat-task.md`: "Meta's realtime leadgen webhook ... has never fired for a real LO") | dev branch | Not recruiting intake. Reusable Graph API knowledge only |
| **crm-be-go** (engagement) | Contact lists, campaigns, newsletters. Reads `LO_RECRUITING` recipients **from MOSO** `FindNewsletterRecipientsOp` (crm-be-go@0c32ca5:internal/nlrecipient/client.go:22,35; docs spec 2026-09-30 line 126) | yes (prod helm config exists) | Not an intake. **Reverse dependency**: when MOSO stops holding LORecruiting, the company newsletter's "LO recruiting" list goes empty unless it reads Recruit instead |
| lead-qualifier | `tera-docs/lead-qualifier/AI_LEAD_QUALIFIER_EVALUATION.html` only | no code found | — |
| recruit-fe landing `/welcome` | Links out to lf-homepage (A-068) | — | No form |

### Recommendation: OWN in Recruit (L)

1. Add `POST /recruit-svc/public/api/v1/intake/{form}` to recruit-be, ported from lead-be's design: per-caller keys, an idempotent `{id, duplicate}` answer, blacklist screening on capture (ai-donotcall, §5), origin stamping (§9) and the hand-raise rules that `MosoRowUpsertServiceImpl` applies today. Forms: register-LO, refer-a-LO, webinar RSVP, /join, FB lead ad webhook, Calendly webhook, CSV upload (admin, authenticated).
2. Repoint lf-homepage and lo-homepage server actions to it (the API key stays server-side, as lead-be's keys do).
3. **Dual-run** (strangler, like lead-be's `/intake/moso`): for a while the form posts to Recruit **and** to packs, or Recruit forwards to packs. The MOSO push keeps working, so MOSO screens and the invite/agreement flows that still need a MOSO row keep working. Dedup by email/phone/NMLS already exists in recruit (`dedup/`).
4. Prerequisite: §3 (a candidate without `legacy_key` must be invitable), or the new leads are dead ends.

**Cut-over risks.** (a) Today MOSO creates the row that the invite, agreement and fee flows (group 2) need. Until those move, a lead captured only by Recruit cannot sign or pay. So the dual post must stay until group 2 is done. (b) The PayPal fee, e-sign and `getRegisterLoanOfficer?key=` steps of `/register-loan-officer` are keyed by the MOSO websafe key. (c) FB lead ads and Calendly are configured in Meta/Calendly to call MOSO URLs; changing them is a vendor-console change, and someone with access must do it. (d) crm-be-go's LO_RECRUITING newsletter list.

---

## 3. Capability 2 — lead and contact store, dedup, identity key

### Today

`legacy_key` = MOSO Datastore `__key` joins every candidate to MOSO. Without it Recruit refuses to send an offer, an invite, a resend or a webinar registration, and dedup refuses an unlinked survivor (A-016, B-030, C-006): recruit-be@8c064b0d:.../candidate/MosoLink.java, OfferServiceImpl.java:618, InviteResendServiceImpl.java:103, FollowUpServiceImpl.java:514, DedupServiceImpl.java:189.

### Candidates

| Service | What it does | Live? | Gap |
|---|---|---|---|
| **Recruit itself** | Owns `candidates` (UUID), dedup + merge (`dedup/`), omni subject alias on merge (A-043), sync trace | yes | The only problem is that the key used for every outbound action is MOSO's |
| **communication-ledger / Person Directory** | A platform-wide person id with a resolution ladder (tera-docs@6878c44:communication-ledger/PERSON_DIRECTORY_SPEC.md) | **No**: README says "Status: design, reviewed, not built. Nothing in this directory is implemented." | Not available |
| **user-service** | "The platform's canonical identity store" (tera-docs user/USER_SYNC_PIPELINE.md §Overview). Fed by **MOSO** `UserWatcher` (Admin/Client/PartnerAgent) and lfiq. `REGISTRATION_USER_TOPIC` is "the platform's single entry point for a person created upstream" | yes | Holds people with an account. A prospect LO has none until hired, and MOSO is still the upstream for LF people (B-111) |
| crm-be-go contacts | Engagement contact lists | yes | Marketing contacts, no recruiting semantics |

### Recommendation: OWN in Recruit (M)

- The recruit candidate UUID becomes the primary key for everything Recruit does. `legacy_key` becomes an optional cross-reference, used only while a flow still needs MOSO.
- Change every `MosoLink` guard so it applies only to flows that still go to MOSO. Each guard falls away when its flow moves (group 2).
- When an LO is hired, link the candidate to the user-service `user_id`. The HR hand-off (ai-hr-be `POST /internal/v1/recruit/hires`, A-080) is the natural place.
- Do not wait for the Person Directory. Nothing has been built.

**Migration.** No backfill is needed: existing rows keep `legacy_key`. Risk: code that treats "no legacy_key" as "not linked, refuse" must be found everywhere. Audit C counts 21 MOSO references in `DedupServiceImpl` alone. Test with a negative control: a native candidate must pass offer → invite → webinar end to end.

---

## 4. Capability 3 — Loan Officer master data

### Today

Loans/volume (`closed_loans_since_2021`, 12-month units/volume, ratings) and NMLS/licensing (`nmls`, `nmls_status`, `sponsor_states`, `active_license_items`, sponsor dates) come from the MOSO row (A-007, A-008, B-024, C-003). Sponsorships are seeded as `LEGACY_IMPORT` (SponsorshipBackfillServiceImpl.java:58).

### Candidates

| Service | What it does | Live? | Gap |
|---|---|---|---|
| **Modex / MMI** (vendor, already in recruit) | CSV import + `ModexWebhookHandler`; D300 adds a monthly NMLS list round-trip (recruit-be@8c064b0d:docs/DECISIONS.md:18) | yes | Covers production figures; this is where MOSO's own figures come from anyway |
| **ai-hr-be** (Go) | An NMLS State Mortgage Registry **company-account** session and report puller: ai-hr-be@c44c4ba6:wiring_nmls.go (env `NMLS_USERNAME/PASSWORD`, `NMLS_IDENTITY_URL`, `NMLS_APP_URL`), internal/nmlsclient/client.go:291 `FetchReport(reportName)`, internal/service/nmlsreport.go:50 ("an allowlist ... the ones the renewal screen knows"), :81 `PullRenewalReport`. Also an LO licence catalogue (`internal/datamodel/lolicense.go`) and per-person licences after hire | yes (HR is live; whether NMLS creds are set in prod: **not verified**) | Pulls renewal reports for **existing** employees only. NMLS company reports also include sponsorship/relationship requests, which are exactly Recruit's "applied for sponsorship" signal. This is not wired today |
| **ai-browser** `GET /lo_compliant/getNmlsData?nmls_id=` | Used by lfiq-backend `NMLSValidate` (lfiq-backend@2eca594c1:.../thirdparty/ai/service/impl/AIWorkflowServiceImpl.java:25-47). Returns name, location, "represents" | — | **Not production-grade**: it runs a shell command on a developer's Mac (ai-browser@tip:src/lib/script_action/services/lo_compliant.py:79-87: `cd /Users/thanhtran/workdir/ai-workflow/ && python3 ./run_get_nmls_data.py`). Identity only, no licence list or status |
| **user-service / HR** | Licences of hired people (A-076; user-service licences are parsed from MOSO, B-111) | yes | Post-hire only, and the user-service copy is itself MOSO-derived |
| lead-be `internal/program` | "LO Ranking", seats per state | yes | Internal LOs only, roster from MOSO `/loanOfficers` |
| callcenter `/loanOfficers` | Looks like a roster service, but it is **packs**: `CALL_CENTER_API_BASE_URL` defaults to `https://loanfactory.com/api/callcenter/v1` (callcenter@080fc46:src/lib/call-center.ts:3-4,369) | — | MOSO |

### Recommendation

- **Loans/volume: OWN via Modex (S).** Stop reading the MOSO loan fields and make Modex the only "since" source (ExperienceLevelService already has a source enum, `SinceFigureSource.java:7`).
- **NMLS status / licences / sponsorship: EXTEND ai-hr-be (M).** Add the NMLS sponsorship/relationship report to its allowlist and expose a parsed read (per NMLS id: sponsorship status, states) on an internal route. Alternative: Recruit reuses the `nmlsclient` code with its own pull. Either way there is **one** NMLS company credential, so share it rather than open a second login. Prerequisite: the HR owner agrees, and the prod NMLS credential exists.
- NMLS identity lookup for a typed NMLS number: there is no production-grade service. Use the public NMLS Consumer Access link (already in Recruit), or treat ai-browser as a prototype only.

**Migration.** One-time: copy MOSO's NMLS/sponsor fields of open candidates (the push already copied them for live rows; the Cold import copies the rest). Risk: `nmls_status` semantics differ between MOSO's 6-step enum and the NMLS report's columns, so the mapping needs a licensing person to sign it off.

---

## 5. Capability 4 — suppression / opt-out ledgers

### Today

MOSO's BlackListUser, SMSOptOut, OptOutRequest and CallOptOut reach Recruit **only by the manual export/import** (A-006, B-028, C-009). The push carries only `__stop_detected` (B-026, C-005). Recruit already holds its own `suppression_list` (recruit-be@8c064b0d:src/main/java/com/loanfactory/recruit/suppression/*; 121 BLACKLIST + 488 STOP_SMS measured on 30/08, CandidateSlices.java:64-65). Live opt-outs also arrive from omni inbound (A-048, B-086).

### Candidates

| Service | What it does | Live? | Gap |
|---|---|---|---|
| **ai-donotcall** (Python) | **Blacklist** = "people barred from Loan Factory" (email/SSN/NMLS/phone). `POST /dnc/internal/blacklist/check` with `consumer: "lo_recruiting"`; `add` via `/internal/blacklist` (ai-donotcall@10e9271:src/views/blacklist.py:27,35). **DNC** = phone numbers we must not dial (federal registry + internal), `POST /dnc/v1/check/batch`, `/dnc/internal/numbers/batch`, opt-out requests `POST /dnc/admin/opt-out` (tera-docs crm/DO_NOT_CALL.md §1, §3) | **Yes**: `Build & Deploy` on master (moso-gke / lender-rate) succeeded 07/10 (`.github/workflows/auto-deploy.yaml:190-191`, `gh run list`) | tera-docs crm/BLACKLIST.md "Who calls this": **"LO Recruiting — an LO is barred — `add` — not built"**. Already planned, so Recruit is an expected caller. Phone only for DNC; "does not stop CRM email". The doc says the one-off legacy import was **53 rows**, while Recruit holds **121** BLACKLIST rows from MOSO, so the two lists differ |
| **omni-service** | `comm_suppression` (STOP_SMS / BLACKLIST, identifiers PHONE/EMAIL/NMLS, provenance HOST_PUSHED / OMNI_LEARNED) gates outbound SMS (omni-service@d59d267:db/migration/V02__omni_channel.sql:334-363; internal/suppression/suppression.go). Learned from inbound STOP (`internal/inbound/optout_sqlc.go:60`) | yes (omni prod) | I found no host push route for HOST_PUSHED, so the import of MOSO's history into omni is not built |
| **notifier-be / notification-service** | Tables `mail_blacklist`, `notification_preference` (notification-service@53a6354:README.md "The model"); campaign mail is `mandatory:false`, so a recipient's opt-out silences it (crm-be-go README) | **Production is still the old Java on Mongo**; notifier-be cut-over pending (`cutover.productionReady: false`) | Email opt-outs per recipient; not a cross-channel ledger |
| crm-be-go | Email unsubscribe for campaigns/newsletters (`internal/edc/unsubscribe.go`, `internal/companynewsletter/unsubscribe.go`), DNC/blacklist proxy | yes | Marketing-mail scope |

### Recommendation: USE ai-donotcall + omni; keep Recruit's ledger (M)

- **Blacklist**: Recruit calls ai-donotcall `check` on intake and before an offer, and `add` when a recruiter bars an LO. That is the "LO Recruiting" row the platform doc already lists as not built.
- **Calls**: check DNC before a dial (Zoom deep link), or at least show the status.
- **SMS STOP**: omni already learns it. Recruit keeps consuming `omni-inbound-reply` (already live).
- **Email**: Recruit's ledger + notifier `mail_blacklist` (bounces, A-040).
- **One last import from MOSO** (the existing runner, kinds BLACK_LIST, SMS_OPT_OUT, EMAIL_OPT_OUT, CALL_OPT_OUT) right before MOSO intake stops, then push the BLACK_LIST rows to ai-donotcall `add` with `source=lo_recruiting`. MIGRATION-SPEC L3 warns that the STOP note scan is capped at 100 notes (recruit-be@8c064b0d:docs/MIGRATION-SPEC.md:186). Fix that before the production run.

**Risk.** TCPA: between the last import and the moment MOSO's own SMS automation stops, a STOP sent to a MOSO number lands only in MOSO. MOSO's recruiting crons (B-113, `ProcessLORecruitingFollowUpEDCCronOp`) must be switched off in the same window.

---

## 6. Capability 5 — webinars

### Today

List from packs WebPlus `getNextWebinars` (A-034, B-029, C-028). Registration via packs `/candidate/registerWebinar`, which also sends MOSO's confirmation email (A-023, B-004, C-029). Attendance (`is_attended`, `duration`) arrives in the push (A-009, C-059) and comes from MOSO's CSV upload `ParseFileCsvDurationILOOp`. The public site lists and registers through packs too (§2).

A MOSO webinar is a **Google Calendar event with an auto-generated meeting URL**, guests, a recording link and Pacific time (packs@master:loan/src/main/java/com/mvu/loan/shared/entity/Webinar.java: `auto_generate_meeting_url`, `meeting_url`, `calendar_event_id`, `guests`, `time`, `recording_link`; `SyncWebinarsCalendarOp`).

### Candidates

| Service | Finding |
|---|---|
| zoom, zoom-go | 0 files mention webinar (grep on origin/master). Zoom Phone only |
| tera-engagement-fe / crm-be-go | 0 webinar hits |
| Org-wide code search "webinar" | hits only moso-configuration, recruit-be, lf-homepage, recruit-fe, lo-homepage, packs |
| **recruit-be** | Already has `google/calendar/GoogleCalendarClient` (events, attendees, status) and `google/meet/*` (Meet REST conference records + participants → attendance, D212), on per-user Google Connect OAuth (D206) |

### Recommendation: OWN in Recruit (M)

- A `webinars` table (title, time, Meet link, host account, capacity, recording link). Create/update the Calendar event through the existing client.
- Registration adds the LO as a guest (or sends Recruit's own confirmation email through notifier, which is group-2 email scope).
- Attendance + duration from the Meet participants read that recruit-be already runs for 1-1s (`MeetAttendanceTickService`).
- A public `GET /public/api/v1/webinars` for lf/lo-homepage + `/join` (replacing `getNextWebinars`), and registration through the new intake (§2).

**Migration.** Copy future MOSO webinars once and keep their ids for registrations already made. Past attendance is already on candidates (`legacy_ref`). Risk: the webinar host's Google account must be connected in Recruit (Google Connect is per user), and Meet participant matching is by email only.

---

## 7. Capability 6 — referral / Ambassador

### Today

- Who referred whom: referral markers in the push (A-013, C-031) → Recruit's own attribution ledger (`referral/ReferralAttributionEventEntity`, `recordGenesisAttribution`, MosoRowUpsertServiceImpl.java:1270).
- "My referrals", admin Referrals and **bonus "Check" state**: live from packs `referrers/resolve` + `referrals/byOwner`, never stored (A-029, A-030, B-011, B-012, C-030).
- moso-aid reads MOSO's referral rollup `PerformanceReport[referrer_lo:<key>].total_referred_lo` for the Ambassador page (moso-aid@17aa1e7:src/services/referral-standing.js header), through MOSO's **unauthenticated** `execute` path.
- Refer-a-LO form → packs `submitReferALoanOfficer` (§2).

### Candidates

| Service | Finding | Gap |
|---|---|---|
| **Recruit** | Attribution ledger with holds, surrogate identity and admin override (recruit-be@8c064b0d:src/main/java/com/loanfactory/recruit/referral/*) | No bonus state, no payment |
| **accounting-be** (NestJS) | Expense/payment **tickets**, an approval ladder, **payment runs** (accounting-be@be7e1e6:src/tickets/*, src/payments/payment-runs.controller.ts:52-195), and a commission engine for loans (`referring_associate` on loans is a different thing). Grep for "bonus" in src/prisma: 0 | No referral-bonus concept and no service-to-service ticket creation found. It would need a small internal intake |
| lead-be | `referred_by` = **borrower** loan referral commission | Different domain |
| moso-aid | Ambassador program pages | MOSO (see §8) |
| packs `ExportReferralsOp` | MOSO | — |

### Recommendation: OWN attribution + bonus state in Recruit; EXTEND accounting-be for payment (M–L)

- Recruit already decides attribution. Add the bonus rule (eligibility: referred LO reached Joined/first loan, per the program terms) and a bonus ledger (state: earned → requested → paid).
- Payment: Recruit raises a payment ticket in accounting-be (new internal route there), or Finance pays by hand from a Recruit CSV until that exists.
- Self-view "My referrals" reads Recruit's ledger, keyed on the central user id, not on the MOSO Admin key (drop `referrers/resolve`).

**Migration.** One-time export of MOSO's referral edges + Check history (packs has `ExportReferralsOp`, B §3). Risk: a double payment if MOSO's own Check cron keeps running after Recruit starts. Switch MOSO's off at the same moment, and import paid Checks as `paid`.

---

## 8. Capability 7 — LO Recruiter Program / Headhunter roster

### Today

recruit-be's program-sync tick mirrors moso-aid `GET /api/lo-programs/recruit/members` into `program_members` and grants HEADHUNTER / TEAM_LEAD (A-035, A-036, B-060, C-032). Mode seeded OFF (`V208__program_sync.sql:182`). Member-link confirmation uses packs `referrers/resolve` (C-033).

### Is moso-aid "old MOSO"? Yes, in every way that matters

- Stack: Node/Express + **MongoDB** (moso-aid@17aa1e7:src/config/db.js:5-9), Cloud Run in `lender-rate` / `lenderrate-master` (tera-docs moso-aid/README.md "Environments"; `K_SERVICE` env).
- Its identity is MOSO: roster rows carry `moso_key` and `company_email`, and `company_email` comes from MOSO `getAdmins` (B-060; moso-aid `src/services/admin-directory.js`).
- It reads MOSO directly and unauthenticated: `src/services/recruiters.js` (the `/join/<slug>` directory from MOSO's ~16 MB associate payload), `referral-standing.js` ("reads MOSO through the same unauthenticated `execute` path"), `moso-execute.js`.
- It also hosts unrelated things (LOL RBAC, exams, events, location crawl, payoff statements), so retiring it is not Recruit's call alone.
- lf-homepage is its main client: `src/apis/loProgramsApi.ts` (catalog, me, applications, readiness, directory, proof-upload, activations) and `src/apis/loAdminProxy.ts` (admin queue, approvals; service key, moso-aid #165).

### Candidates

None outside MOSO. lead-be's `internal/program` is the borrower **Company Lead Program** (seats per state), and its roster comes from MOSO `/loanOfficers`.

### Recommendation: OWN the LO Recruiter Program in Recruit (M–L)

- Recruit owns programs, applications, approvals, members and teams, keyed on the central `user_id`/company email (Recruit's RBAC is already central-user based, A-075).
- The `/join/<slug>` directory: the slug is derived from `company_email` (moso-aid `toRecruiterSlug`), and Recruit already knows its users' emails. So Recruit can serve the recruiter directory itself.
- lf-homepage's program console (apply, approve, proof upload) moves to Recruit or to a Recruit API.
- The Ambassador standing (how many LOs someone referred) comes from Recruit's referral ledger (§7).

**Migration.** A one-time copy of moso-aid's Mongo `lo-program*` collections (applications, decisions, teams, proof blob refs) with `moso_key` → central `user_id` mapping (user-service keeps upstream keys, USER_SYNC_PIPELINE `USER_KEY_CHANGED_TOPIC`). Risk: proof files sit in moso-aid's ledger/blobstore, so a file move is needed. Ally reads Ambassador standing from moso-aid (tera-docs moso-aid/LO_PROGRAMS_ALLY_API.md), so Ally must be repointed too.

---

## 9. Capability 8 — lead origin attribution and the pay-gate

### Origin

Today packs stamps `lead_origin*` when a form arrives from `/join/<slug>` or `/recruit` (A-012, B-025, C-034). With a Recruit-owned intake (§2), the form tells Recruit the slug directly, and Recruit resolves slug → its own user (derived from `company_email`, §8). **OWN, S, comes free with §2.** Keep the fee-waiver quirk (`JoinPageFeeWaiver`) as a rule in Recruit.

### Pay-gate `register-status`

- Recruit serves `GET /public/api/v1/register-status?key=` (RegisterStatusController.java:51; A-067).
- **Finding: it has no caller on lf-homepage production.** PR #2574 added it (`3b84c44d`), and `72cef7e3` (29/09, "fix: pay and sign only after the 1-1 call", on `origin/master` and `origin/production`) deleted `src/apis/registerStatusApi.ts`, the `register-status` route and `RECRUIT_API_URL`. Pay/sign now unlock **only** on MOSO's `onboarding_meeting_status` via `getRegisterLOProcessInfo`. lo-homepage: present only on `feature/pay-gate-recruit-approved-release` (`504461c16`, 24/09), not on `master` or `produciton-v2`.
- So the pay-gate today is a **MOSO-only** check, read from the browser-facing site. Moving it off MOSO means moving the whole `/register-loan-officer` flow (registration detail form, PayPal fee, e-sign, corporate discount). That is group 2 (offer/fee/agreement), not intake.
- `register-status` in recruit-be looks like dead code. Confirm with gateway access logs before deleting.

---

## 10. Capability 9 — Cold pool stock (one-time migration)

### Facts

- Production MOSO counts: RLO 106,145 / ILO 23,602 (05/08/2026) (recruit-be@8c064b0d:scripts/moso-migration-runner.py:29). Open outbound stock 71,934 (13/10, local memory note `project_recruit_prod_cold_import_deferred.md`).
- The tooling exists: packs `ExportLORecruitingForMigrationOp` (ADMIN, kinds lo_recruiting / black_list / sms_opt_out / email_opt_out / call_opt_out) → `scripts/moso-migration-runner.py` (`--dump-only`, `--from-dir`, reconciliation `received == created + updated + errors`) → `POST /api/v1/admin/import/moso` and `/moso/profile-fields` (A-004, A-005, B-028, C-008).
- Staging was imported (7,221 rows). **Production was never bulk-imported**: production Cold = 377 rows and 1,031 candidates in total on 13/10. The owner deferred it on 13/10 (bead `agentflow-kzwcg`). The blocker is the **owner-map** (MOSO `claimed_profile` recruiter → Recruit account).
- No other export exists. lead-be's "MOSO sign-up import" (`842b6c6`, "a one-time datafix per environment") is a borrower-side precedent only.

### Recommendation: one-time migration before MOSO intake stops (M, ops)

1. Decide the owner-map (or import everything unowned into Cold).
2. Fix MIGRATION-SPEC L3 (STOP scan cap) and re-run the staging dry run.
3. `--dump-only` from production into a kept dump (this is the archive if MOSO is switched off later), then import. Re-run once at cut-over to catch rows changed since then; matching is by `__key`, so it is idempotent (MIGRATION-SPEC §1.3).
4. Keep `legacy_ref` on every row for traceability (MIGRATION-SPEC §1.1).

**Risks.** The export needs a MOSO admin cookie session (C-008), so it must run **while MOSO is still up**: this is the hard deadline of the whole programme. Imported "100% onboarded" rows are marked `trusted=false` (MIGRATION-SPEC §1.2), so no automatic referral bonus comes from them. Volume: 130k rows through the gateway; use the documented chunking.

---

## 11. Suggested order (capability group 1 only)

1. **§3 key decoupling** (native candidates can be invited, at least for flows that no longer need MOSO). Turn on `native-candidate-create` in staging with negative controls.
2. **§10 production export dump** (archive now, cheap insurance) + **§5 blacklist into ai-donotcall**.
3. **§2 Recruit public intake** + **§9 origin**, dual-posting to packs. **§6 webinars** (list + register + attendance), which the intake needs for webinar RSVP.
4. **§8 program roster** and **§7 referral bonus** ledger. Repoint lf-homepage's program console and Ally.
5. **§4 NMLS via ai-hr-be**, Modex-only production figures.
6. Cut-over: stop the dual post, switch MOSO recruiting crons off, final re-import of opt-outs and changed rows, then disable the MOSO push. This step depends on group 2 (invite, agreement, fee, onboarding) having moved, because those still need a MOSO row.

---

## 12. Existing MOSO-sunset plans and decisions found

| What | Where | What it says |
|---|---|---|
| **No platform-wide MOSO decommission plan exists** | tera-docs@6878c44 grep for sunset/decommission/retire/replace MOSO | Only individual strangler migrations. `system-architecture/SYSTEM_OVERVIEW.md:110,866` still lists MOSO as "Legacy ... still operational" |
| moso-notifier → notifier-be (Java on Postgres) + Go notification-service | notification-service@53a6354:README.md "State (2026-10-18)"; SYSTEM_OVERVIEW.md:878 | notifier-be merged 17/10 (moso-notifier #296) and runs alone on staging. **Production is still old Java on Mongo** (`cutover.productionReady: false`). Ruling R-RECONCILE-1 (Khai, 17/10): Go is the long-term owner on notifier-be's tables. "No wave has a date" |
| Borrower leads moved off MOSO's intake | lead-be README ("forked from nova", owns capture → conversion; MOSO feed via `/intake/moso`); callcenter docs/LEAD_INTAKE.md | The borrower side has already done what §2 proposes. Conversion still goes back into MOSO LeadPipelineAPI |
| Blacklist as a platform service, LO Recruiting a planned caller | tera-docs crm/BLACKLIST.md "Who calls this" | "LO Recruiting — `add` — **not built**"; legacy import done (53 rows) |
| Omni as the platform's conversation store (tera-be strangler) | tera-docs omni-channel/* | Omni is the target for conversation; prod LOS conversations are still in MOSO + Openfire (communication-ledger/README.md "four things") |
| Person Directory | tera-docs communication-ledger/* | Design, reviewed, **not built** |
| user-service as canonical identity, fed from MOSO | tera-docs user/USER_SYNC_PIPELINE.md | MOSO is still the upstream for LF people. No plan found to flip that |
| cron-service (Java → Go), api-gateway v1 → v2 | tera-docs cron/CRON_SERVICE_GO_MIGRATION.md:53; infrastructure/worklog/programmes/api-gateway-v1-decommission.md | Done or near done; examples of the decommission pattern, not MOSO |
| Recruit's own stance | recruit-be@8c064b0d:docs/MIGRATION-SPEC.md (v3, 19/08) | Recruit was designed as **MOSO-fed**: bulk import + realtime push. No Recruit decision to take its own intake was found; native create stays deliberately off |
| lf-homepage pay-gate back to MOSO-only | lf-homepage `72cef7e3` (29/09) | Owner rule of 29/09: pay/sign only after the 1-1, read from MOSO `onboarding_meeting_status` |

---

## 13. Open questions for humans

1. **Scope**: is omni-service "old MOSO"? The lead's list excludes it; audit A includes it. This report treats it as a platform service (it is the target store in tera-docs).
2. **Who owns moso-aid's future?** It hosts LO Programs, LOL RBAC, exams, events and locations. Recruit can take LO Programs, but someone has to own the rest. Is the lf-homepage team OK with moving the program console?
3. **Blacklist reconciliation**: ai-donotcall's legacy import is 53 rows, while Recruit holds 121 BLACKLIST rows from MOSO `BlackListUser`. Which list is authoritative, and who merges them?
4. **NMLS**: is the NMLS company credential configured in ai-hr-be production, and will HR let Recruit use it (or the session) for sponsorship reports?
5. **Owner-map for the Cold import** (bead `agentflow-kzwcg`): import Cold rows owned by their MOSO recruiter, or all unowned?
6. **Referral bonus**: what are the bonus rules and amounts outside MOSO, and does Finance want payment tickets in accounting-be or a monthly CSV?
7. **FB lead ads and Calendly**: who has admin access to the Meta lead form webhooks and the Calendly webhook to repoint them?
8. **register-status**: confirm from gateway logs that nothing calls `/recruit-svc/public/api/v1/register-status` since 29/09, so it can be retired.
9. **crm-be-go newsletter**: the "LO recruiting" recipient list reads MOSO `LORecruiting`. Should it read Recruit after cut-over, or be dropped?
10. Is the dual post (form → Recruit **and** packs) acceptable to the lf-homepage owners for the transition, or should Recruit forward to packs server-side?
