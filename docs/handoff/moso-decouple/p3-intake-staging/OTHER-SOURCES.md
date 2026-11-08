# P3: Loan Officer lead sources other than the lf/lo forms

Bead `agentflow-0gwad.4`. Measured and built on 08/11/2026.

- This is item 3 of P3, the lead sources that still reach only MOSO.
- The full inventory is in [`../LEAD-SOURCES.md`](../LEAD-SOURCES.md), sources S1–S12, measured on 04/11.

## How it was measured

- **Code:** read on the origin default branches.
  - `master` for packs, moso, moso-aid and recruit-be.
  - packs paths below are relative to `loan/src/main/java/com/mvu/loan/`.
- **Data:** MOSO production Datastore (`lender-rate`, namespace `5716104026521600`), read-only.
  - Only non-PII properties were extracted (flags, dates, enums), and only counts are reported.
  - Some properties are not indexed (`last_registration_event`, `lo_labels`). Those were counted on the rows created since 2026-04-01, which is 3,881 rows pulled.

## S5: Facebook lead ads (ILO forms)

### Where the code lives

**Webhook:** `/exec/misc.VerifyWebHookFBOp`, in `server/op/misc/VerifyWebHookFBOp.java`.

- On a GET it compares `hub.verify_token` and echoes `hub.challenge`.
- **It does not check `X-Hub-Signature-256`.** Any POST shaped like a leadgen event is accepted, and the lead is then fetched from Meta. That fetch limits the damage, because a fake `leadgen_id` will not resolve.
- It reads the first change only, then fetches `GET /{ver}/{leadgen_id}?fields=field_data,adset_name,created_time` with the page token.
- It routes on `ILOFacebookLeadForm.lead_form_category`:
  - `ilo_form` → `server/op/referral/SaveILOFacebookAdOp`;
  - `lf_lead_form` → the borrower path.

**Backup cron:** `server/op/cron/RetrieveILOFromFBAdCronJob`.

- It is scheduled in the **moso** repo, not packs: `AppCronConfig.java:556-558` and `cron.xml:614-616`, every 2 h (America/Los_Angeles).
- It pulls `/{formId}/leads` for every active `ILOFacebookLeadForm`, created in the last 3 h.

**How a lead is mapped:**

- Rows are matched by email only.
- A lead whose license answer is missing or "no" is skipped.
- An existing row gets `is_from_fb_ad=true`, the label `Facebook_ads`, and `last_registration_event=Facebook_ads`.
- A new row also gets `referred_source=facebook`.

### Where the configuration is stored (names only)

| What | Where |
|---|---|
| Meta app id | system property `facebook_app_id`, read in `LoanOps.java:3780-3798` |
| Meta app secret | system property `facebook_app_secret`, read in `LoanOps.java:3780-3798` |
| Graph API version | system property `facebook_graph_version`, default `v14.0` |
| Webhook verify token | system property `facebook_lead_token` |
| Lead key | system property `facebook_lead_key` |
| User access token | Datastore kind `ILOFacebookConfig`, id 1, field `facebook_user_access_token` |
| Page token | not stored: derived on every run via `GET /{pageId}?fields=access_token` |
| ILO forms | Datastore kind `ILOFacebookLeadForm`, key = Meta form id |

- **Security finding (packs):**
  - `LoanOps.java:3781-3798` has the real values of the app id, the app secret, the verify token and the lead key committed as hard-coded fallback defaults. They were not printed here.
  - DevOps should rotate the app secret and the verify token, and remove the defaults.
- **When the token expires:**
  - `getFaceBookPageAccessToken` logs an ERROR (`token likely expired/invalid`) and returns null.
  - The cron then skips the form silently, and the webhook throws.
  - No field records the last success or the last error.

### Is it working on production?

**`LORecruiting.is_from_fb_ad = true`:** 427 rows in total. By the month the row was created:

| Month | 2025-10 | 2025-11 | 2025-12 | 2026-01 | 2026-02 | 2026-03 | 2026-04 | 2026-05 | 2026-06 to 2026-09 | 2026-10 | 2026-11 (1–7) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rows | 35 | 36 | 36 | 40 | 29 | 30 | 55 | 49 | **0** | 7 | 4 |

- The last flagged new row before the gap was created on **2026-05-26**.
- The next one came on **2026-10-29**: 7 rows that day.
- Then 2 rows on 03/11, 1 on 04/11 and 1 on 07/11.
- `last_registration_event=Facebook_ads` was stamped on 12 rows in November (among the recent rows), so existing Loan Officers are flagged again too.

**`ILOFacebookLeadForm`:** 59 forms, all `active`.

- 13 are `ilo_form`. The last two new ILO forms were registered on 2026-05-25.
- 45 are `lf_lead_form`. Two new borrower forms appeared on **2026-10-29 07:02 UTC**, the same day the ILO flow came back.

**`ILOFacebookConfig`** (the user token holder) has `created` 2025-07-04 and `updated` null, so it cannot tell us when the token was refreshed.

**Reading (Q1):**

- The flow was dead from about 27/05 to 28/10 (5 months) and has worked since 29/10.
- The cron's first pull window is only 3 h, so the leads from the gap were not backfilled.
- Two causes fit the data:
  - the page/user token was invalid and was refreshed on 29/10;
  - or no ILO ads ran from June to October.
- On 29/10 new borrower forms registered through the webhook at the same time. That points to the Meta connection being fixed that day (token or subscription), not to a new campaign.
- Only the Meta Ads Manager history can tell the two causes apart.

### Recruit side

- `CandidateSource.FB_ADS` exists, and the MOSO push already classifies `is_from_fb_ad` rows as FB_ADS.
- **No `FB_LEAD` receiver was built.** A leadgen webhook carries only `leadgen_id`, form id and page id, never the answers. To create a lead, the receiver must call the Graph API with a page token. So it cannot do anything useful, or be tested end to end, without the Meta app secret (for the signature) and a page token. Both belong to the Meta console owner.
- The receiver is small once those exist. The design is below.

## S7: events and after-party RSVPs (built)

### Today

- lf-homepage `after-party-event` posts to moso-aid `POST /api/lo-events` (`src/routes/index.js:277`). That route is public and validated by `validateSubmitLOEvent`.
- moso-aid stores the RSVP in Mongo `lo_events`.
- In the background (`handleSubmitConfirmation`), moso-aid checks whether the person is an internal Loan Officer, by the company name or the MOSO `Admin` lookup.
  - An external Loan Officer is registered through packs `registerLoanOfficer` with `lo_labels=[event name]`, a three-line note (company, volume, loans closed), and `total_volume` / `total_closed_loan`.
  - packs is called without auth through `API_CRAWL`.

### Measured

Among the rows created since April, by `last_registration_event`:

- **Houston after-party (03/11):** 54 rows.
  - 33 RSVPs in November and 21 in October.
  - 50 rows were created the same day as their RSVP and 4 are older rows that RSVPed again.
  - Re-RSVPs of rows created before April cannot be counted, because the property is not indexed.
- **Pasadena (17/11):** 3 rows so far.
- moso-aid's Mongo `lo_events` holds the full RSVP list. It was not read; there is no access from here.

### Built

**recruit-be [#905](https://github.com/LoanFactory-Inc/recruit-be/pull/905)**

- Squash-merged as `c9316e023`, decision D410, no migration.
- **Endpoint:** `POST /public/api/v1/intake/lo-lead` accepts `kind: EVENT` with `event: {name, company, production_volume, total_loan_closed}`.
- **Switch:** `recruit.features.lead-intake-event` (`RECRUIT_FEATURES_LEAD_INTAKE_EVENT`). It is on in the staging values and absent from production. With the switch off, EVENT gets the old unknown-kind 400.
- **A new person** becomes an EVENT_RSVP lead with `self_reported_company/volume/closed_loans`. The row is mapped exactly the way moso-aid's packs call is.
  - An intake-only flag `intake_event_rsvp` makes the source EVENT_RSVP even when the event name matches none of the `source.event_rsvp.label_patterns`.
- **A re-RSVP of an existing lead** is a duplicate. It records one "Registered again … via event RSVP" plus the owner's bell.
  - The event label is added to `legacy_ref.lo_labels`, so the MOSO push of the same RSVP does not ring a second time. `LeadIntakeIT#eventReRsvpRingsOnce` covers this.
- **One line changed in `LeadIntakeService#recordHandRaise`.** The parent's P3 work owns that file and was told.
- **Review:** an independent reviewer found one HIGH, a huge-scale BigDecimal (`1E-999999999`) that could exhaust memory. It is fixed: scale ≤ 10, rounded to cents. Two MEDIUMs were fixed as well: the switch-off refusal now happens before validation, and the snapshot assertion was added.

**moso-aid [#226](https://github.com/LoanFactory-Inc/moso-aid/pull/226)**

- Opened only, not merged or deployed (another team's repo).
- After the packs call, it posts the same RSVP to the Recruit intake as kind EVENT.
- It runs only when `RECRUIT_EVENT_INTAKE_ENABLED=true` and `RECRUIT_API_URL` and `RECRUIT_LEAD_INTAKE_API_KEY` are both set; it is off by default.
- It never throws, times out after 8 s, and logs the status only.
- Internal Loan Officers are skipped.
- Review MEDIUMs fixed: a `.catch` on the chain, and the response body is now released.

### Staging proof (what could and could not be shown)

| What | Result |
|---|---|
| Unit and IT tests in CI (green on #905) | `LeadIntakeIT#eventCreates` (new RSVP, EVENT_RSVP, company and figures, label stored) and `#eventReRsvpRingsOnce` (one ring, snapshot label, the push does not ring again) pass against real Postgres and the real MOSO webhook. |
| Staging promote and deploy | `promote-staging` run 42467453149 fast-forwarded `staging` to `c9316e023`; `Deploy staging (GKE)` run 42467471595 succeeded. The new recruit-be pod started 2026-11-08 09:36Z with `RECRUIT_FEATURES_LEAD_INTAKE=true` and `RECRUIT_FEATURES_LEAD_INTAKE_EVENT=true` (names checked, no values read). An unkeyed `POST /recruit-svc/public/api/v1/intake/lo-lead` answers 401, so the route is live. Staging DB: the intake has created 8 leads so far (4 REFERRAL, 2 WEB_FORM, 2 WEBINAR) and no EVENT_RSVP yet, as expected without a moso-aid key. |
| A real staging post | **Not done.** The intake keys on staging are named `lf-homepage` and `lo-homepage`, and their values cannot be read from here. moso-aid has no key yet. A real RSVP from staging needs the DevOps step below. |

## Calendly (`InterestedLoanOfficerCalendlyWebHookServlet`)

**What it does:**

- Route `integration/api/calendly_web_hook/ilo` (moso `web.xml`).
- It checks the HMAC of `Calendly-Webhook-Signature`. The key is in Datastore `MeetingAndAppointmentConfiguration.ilo_calendly_signing_key`; the API token is in `ilo_calendly_token`.
- It finds the newest `LORecruiting` row with the invitee's email.
- `invitee.created` sets `appointment_time` and `appointment_date` (Pacific time). `invitee.canceled` clears them.
- It never creates a row.

**Measured:**

- 277 rows have an `appointment_date`.
- The newest is **April 2024**. By month: 2023-03 had 68; 2024-04 had 4; nothing after that.
- None of the 3,881 rows created since April 2026 has one.

**Reading:** the Calendly booking is dead. It has not fired in 2.5 years.

**Recruit equivalent:** Recruit already has its own 1-1 and onboarding meeting scheduling (V145 and the webinar/Meet work in P3b). It does not read Calendly, and it does not need to.

**Recommendation:** no port. Retire the endpoint with MOSO. If Bao wants Calendly again, it should be a Recruit feature: a Calendly webhook that writes a Recruit meeting.

## S6: Ally `createILO`

- Route `POST /api/ai/v1/{ns}/createILO` (`AIAPI.java:1403`), authenticated by `x-api-key` against Datastore kind `ApiKey`.
- It requires `event=recruit_lead.created` and `answers[]`. Other fields: `provider_ids.platform`, `ally.owner_email` (mapped to `referred_by`), `ally.program` (mapped to the label `Ally_<program>`), and `event_id` for idempotency.
- It creates nothing in 12 months: 0 rows carry an `Ally_*` label.
- **Recommendation:** do not port. If Ally ever launches lead ads, point it at the Recruit intake. That would be a new `FB_LEAD`/`AD_LEAD` kind, with `platform` and `ambassador_email`, reusing the D356 keys.

## S9 / S11: staff-typed entry and CSV import

**Add lead:**

- Recruit's "Add lead" is `POST /api/v1/candidates`. It exists behind `recruit.features.native-candidate-create`.
- Staging has it on (D382) and production has it off (D165).
- The D384 duplicate guard is in place.

**Interested-LO CSV import:**

- recruit-be has **no "interested LO" CSV import**. The only multipart import is Modex CSV (`ModexCsvImportController`), and Modex never creates a candidate while native create is off.
- MOSO's import (`ParseFileCsvILOsOp`) reads 6 columns: First Name, Last Name, Email, Phone, NMLS, Lo Labels. It applies one `referred_source` per file and skips existing interested rows.
- It also has a bug: the success count is always 0.

**Volume:** 1,929 rows in 12 months (Indeed 1,056, Rocket 466, other 407), plus 171 customer-service rows. This is the largest source not on a form.

**Recommendation:** next P3 step:

1. Turn on native create for recruiters on production, once Bao flips the P1a set.
2. Add `POST /api/v1/admin/import/interested-csv` with the same 6 columns plus a channel per file (Indeed / Rocket / CS / other).
   - It should use `DuplicateLeadGuard` and the D356 duplicate rule, so an existing lead is a hand-raise, not a skip.
   - It should store the channel as a label and a source.
   - This was not built today. It is a recruiter-facing UI plus an admin decision on the channel list (Q2), so it is not an overnight change. It is filed as a child bead.

## FB_LEAD receiver: design, for when the credentials exist

1. **Verify (GET):** `GET /public/api/v1/intake/meta/leadgen?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…` compares the token in constant time with `RECRUIT_META_VERIFY_TOKEN` and echoes the challenge.
2. **Receive (POST):** the same path.
   - Check `X-Hub-Signature-256` as the HMAC-SHA256 of the raw body with `RECRUIT_META_APP_SECRET`. Refuse with 401 otherwise.
   - Answer 200 fast.
   - For each `entry[].changes[]` with `field=leadgen`, enqueue `{leadgen_id, form_id, page_id, ad_id}`.
3. **Worker:**
   - Dedupe on `leadgen_id`, with a unique column or table.
   - Fetch `GET /v21.0/{leadgen_id}?fields=field_data,created_time,ad_id,form_id` with a page token from `RECRUIT_META_PAGE_TOKEN` (a never-expiring System User token).
   - Map the answers as `SaveILOFacebookAdOp.parseData` does (EN/ES/VI questions), including the "no license = skip" rule.
   - Hand the lead to `LeadIntakeService` as kind `FB_LEAD`, with `is_from_fb_ad=true` and the label `Facebook_ads`. Source FB_ADS; a duplicate counts as a hand-raise.
4. **Backup pull:** every 2 h, `/{form_id}/leads?filtering=[time_created > last_success]`. The pull starts from the last success, not a fixed 3 h, so an outage self-heals. Store a `last_success_at` per form.
5. **Health:** a gauge for the time since the last lead and an alert after N days. This is the gap that hid the June–October outage.
6. **Rollout:** Recruit subscribes the page alongside MOSO (dual), reconciles counts for 2 weeks, then MOSO's subscription is removed.

## What Bao / DevOps must do (exact)

| # | Who | What |
|---|---|---|
| 1 | DevOps (Khải / Đạt) | **Staging, RSVP dual-post:** add a key for moso-aid to the staging secret `recruit-be-recruit-lead-intake-api-keys` (mapped to env `RECRUIT_LEAD_INTAKE_API_KEYS` in recruit-be `helm-chart/config/staging/secret-keys.txt`). Append `,moso-aid:<32+ random chars>`; the existing `lf-homepage` / `lo-homepage` entries stay. Restart recruit-be staging. |
| 2 | moso-aid owner (after merging #226) | On moso-aid **staging** set `RECRUIT_LEAD_INTAKE_API_KEY=<the same key>` and `RECRUIT_EVENT_INTAKE_ENABLED=true` (`RECRUIT_API_URL` is already set for Ambassador Activity). On Cloud Run use `gcloud run services update … --update-env-vars` only, never `--set-env-vars` / `--env-vars-file`. Then make one test RSVP from staging with a `bao.trinh+evt@loanfactory.com` address. |
| 3 | DevOps (security) | packs `LoanOps.java:3781-3798`: the Meta app secret and the verify token are committed as fallback defaults. Rotate the app secret in the Meta app console (Settings → Basic → App secret → Reset), update the `facebook_app_secret` system property, and remove the hard-coded defaults. Also add an `X-Hub-Signature-256` check to `VerifyWebHookFBOp`. |
| 4 | Bao + the Meta page owner (marketing) | **Q1:** check Ads Manager for whether ILO lead ads ran from June to October 2026. If they ran, leads were lost; download them from Meta (Lead Center / form "Download leads", kept 90 days only) and hand them to recruiters. |
| 5 | Meta app admin + DevOps (for FB_LEAD, later) | (a) Business Manager → System Users: create one with access to the LF page and the Meta app, and generate a never-expiring token with `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` (and `ads_management` if the forms are read per ad). (b) Store it in secret `recruit-be-recruit-meta-page-token`, and the app secret in `recruit-be-recruit-meta-app-secret`. Choose a verify token and store it in `recruit-be-recruit-meta-verify-token`. (c) Meta app → Webhooks → Page → field `leadgen`: add the callback `https://gateway.viet18.com/recruit-svc/public/api/v1/intake/meta/leadgen` (staging) with the verify token. (d) Page → Settings → Leads access: allow the app (CRM access). (e) `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen` with the page token. |
| 6 | Bao | Calendly: confirm it can be retired (no booking since April 2024). |

## Open questions and recommendations

- **Q1 (FB gap):**
  - Recommendation: do step 4.
  - Build `FB_LEAD` only after step 5, and include the "time since last lead" alert. The silent 5-month gap is the real lesson.
- **Q2 (Indeed / Rocket lists):**
  - Recommendation: one Recruit "interested LO" CSV import, with a channel chosen per file.
  - No Indeed API (none exists for job applicants without a paid ATS integration).
  - Ask the recruiters for one sample export.
- **Q3 (Ally createILO):** retire. It made 0 rows in 12 months.
- **Q4 (MOSO public pages):** retire with MOSO. Not measured further.
- **Q5 (events):**
  - Recommendation: moso-aid keeps `lo_events` (approval workflow, emails) and dual-posts to Recruit (built).
  - Moving the RSVP fully into Recruit is not worth it while the approve/reject flow and the emails live in moso-aid.
  - When MOSO is switched off, moso-aid simply drops its packs call.
- **Q6 (the April 2026 outbound file):** out of scope here (Cold import, `agentflow-kzwcg`).
- **Q7 (customer-service intake):**
  - Recommendation: CS staff use Recruit "Add lead" with a fixed `Customer service` channel once native create is on.
  - There is no CS tool that writes leads today.
