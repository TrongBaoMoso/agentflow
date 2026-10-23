# P0 — MOSO-only data snapshot + prod settings (bead agentflow-0gwad.1)

Taken 22/10/2026 17:45–18:40 UTC (23/10 00:45–01:40 ICT). Everything here was read-only. Nothing was written to MOSO, recruit prod, staging or any repo, apart from this file and `templates/`.

This file holds COUNTS ONLY. The raw exports contain PII and live only in `~/.cache/claude-recruit/moso-snapshot-2310/` (dir `chmod 700`, files `600`) on Bao's Mac.

Code refs read: packs `origin/3.64.1` @`490e2013b25`, base @`b088858ffd`, recruit-be `origin/production` @`dc2b54ec`, moso-aid `origin/master` @`8b28f1e`, moso-configuration `origin/master` @`3485e502c2`.

## 1. Prod `recruit_settings` (read-only `BEGIN READ ONLY` via `rro.sh prod`, 17:56:54 UTC)

| Key | Value in force | Since |
|---|---|---|
| `referrals.enabled` | `true` | 2026-10-15 17:38 UTC (5 rows of history) |
| `program_sync.mode` | `"DRY_RUN"` | 2026-10-07 17:45 UTC (2 rows) |
| `onboarding.reminder.delivery_mode` | `"DRY_RUN"` | seed (1970) |
| `onboarding.reminder.allowed_emails` | count = **0** | seed |
| `headhunter.auto_own_enabled` | `false` | seed |
| `hot.idle_release_omni_check` | `true` | seed |
| `nurture.drip.enabled` | `false` | seed |
| `nurture.drip.delivery_mode` | `"DRY_RUN"` | seed |
| `packs.writeback.experience_enabled` | **no row** | — (the key exists only on recruit-be `staging`/`master`, not in `production` code) |

- No rows have a future `effective_from`.
- **`packs_writeback_outbox`: 0 rows** (no kind, no status). This matches §3 of the HANDOFF: prod write-back is off.
- Consequence: **no 1-1 meeting reminder email goes out in prod today** (`delivery_mode=DRY_RUN`, allow-list empty), and the packs send path for reminders is never reached either (outbox empty).

## 2. MOSO prod Datastore snapshot (project `lender-rate`, ns `5716104026521600`)

Method: REST `runQuery` with `gcloud auth print-access-token`, 500 per page, paged until `moreResults == NO_MORE_RESULTS` (Admin came back in ~90-row pages; no early stop). Raw Datastore entities, lossless, gzipped JSONL. Script: `export_kind.py` in the snapshot dir.

| Export (file `<name>.jsonl.gz`) | Rows | Pages | Started → finished (UTC, 22/10) | Cross-check |
|---|---|---|---|---|
| `LORecruiting` | 131,201 | 438 | 17:59:57 → 18:17:35 | = `COUNT` aggregation 131,201 |
| `Admin` | 6,278 | 70 | 17:55:44 → 17:59:57 | memory said 6,277 on 22/10 |
| `BlackListUser` | 83 | 1 | 17:45:34 → 17:45:36 | |
| `SMSOptOut` | 7,828 | 27 | 17:45:36 → 17:46:23 | |
| `OptOutRequest` (email ledger, key = lowercased email) | 51,502 | 172 | 17:46:23 → 17:50:31 | |
| `CallOptOut` — see note | 52,157 hits | 98 lookups | 18:20:39 → 18:32:45 | keyed lookup of 97,527 distinct LORecruiting phones |
| `Check` where `check_type = Manually` (referral bonus Checks live here) | 2,167 | 8 | 18:05:16 → 18:05:33 | |
| `Webinar` | 200 | 1 | 18:04:52 → 18:04:56 | |
| `WebinarConfiguration` | 0 (tenant ns) | 1 | 18:04:56 → 18:04:59 | |
| `WebinarAttendee` | not exported: `COUNT` = 0 | — | — | LO-recruiting webinar sign-ups live ON `LORecruiting` (`Webinar.java:115`) |
| moso-aid roster (§5) | 2 + 21 members | 2 calls | 18:01:28 / 18:01:38 | |

Kind names were confirmed in code: opt-outs and `BlackListUser` from packs `ExportLORecruitingForMigrationOp` (`BlackListUser.TYPE`, `SMSOptOut.TYPE`, `OptOutRequest.TYPE`, `CallOptOut.TYPE`); the referral bonus is `Check` (`ReferralCheckJoin.loadOwnerChecks`); webinars are `Webinar` (`GetNextWebinarsOp`).

**`CallOptOut` is mostly the federal Do-Not-Call registry.** A full scan was started and stopped after 155,018 rows (12 min): 154,888 had `source = null` (legacy federal rows that pre-date the `source` field, per `BackgroundImportFedDNCOp:142`) and 130 `federal_dnc`. `COUNT` timed out, so the kind holds millions of rows. `source` is unindexed, so the non-federal rows cannot be filtered. Instead I looked up every LORecruiting phone by key (the key is the phone, `"(xxx) xxx-xxxx"`): 52,157 hits, 52,102 `null` + 55 `federal_dnc`, **0 email/phone/1003/internal**. The partial scan is kept as `CallOptOut.PARTIAL.jsonl.gz`.

### Counts from the snapshot (for P5 reconciliation)

- **Opt-outs.**
  - `BlackListUser`: 83, all `active`; 33 `not_eligible_for_rehire`. The HANDOFF mismatch (ai-donotcall 53, recruit 121) now has a third number: MOSO 83.
  - `SMSOptOut`: 7,822 active of 7,828.
  - `OptOutRequest`: 51,031 `OptOut`, 471 with no type.
  - Overlap with LORecruiting: email opted out for 9,533 outbound + 2,634 interested rows. SMS opted out for 202 outbound + 524 interested rows.
- **Referral bonus.**
  - 484 `Check` rows match the structural rule in `ReferralCheckJoin` (Manually + automatically created + reason "Loan officer referral bonus"): 298 `Paid`, 186 `Rejected`.
  - Admin: 1,029 `has_referred_lo`, 80 `has_referred_outside_lo`, 977 with `referred_lo` set, 123 `cash_bonus_requested`, 4,714 `converted_from_ilo`.
- **Webinars.**
  - 200 `Webinar`, all type `loan_officer_recruiting`, from 2022 to 2026: 198 past, 2 upcoming, 191 with a recording link.
  - 14,842 `LORecruiting` rows reference a webinar. By status: 5,407 no_response, 5,295 denied_by_LO, 1,979 joined, 1,840 interviewed_and_rejected, 226 invited_to_join, 46 interviewed_and_accepted, 36 hiatus, 13 interested.

## 3. Cold import dry-run (Bao decision 1) — COUNTS ONLY, nothing imported

Script: `cold_dryrun.py`. Summary: `cold_dryrun/summary.json`. Id lists: `cold_dryrun/*.ids.txt`. Recruit prod legacy keys were read at 18:06:48 UTC (1,300 rows, all `LORecruiting` websafe keys).

**Universe.** `LORecruiting` with `recruiting_type = recruiting`, excluding `out_source_status` ∈ {archived, archived_wrong_information, block_display} and `block_display = true`. This is exactly what `MosoRowMapper.mapRlo` imports as ACTIVE (null status counts as not_touched).
- Outbound total: 106,703.
- Open outbound: **71,935**. The 13/10 figure was 71,934.

**Exclusions** (first hit wins, in this order):

| Bucket | Count |
|---|---|
| Already in recruit prod (`legacy_key` = row key) | 56 |
| Working LF loan officer (Admin `active`, `lo_joined_date` set, no `terminate_date`; match on email/company_email or originator/mortgage NMLS) | 458 |
| Not eligible for rehire (Admin flag, or `BlackListUser` flag; same email/NMLS match) | 2 |
| **Left to import** | **71,419** |

**Owner.** There are two readings. **Bao or the lead must pick one.**

- **A — recruit-be's current rule** (`MosoRowMapper`: `claimed_profile = true` AND `recruiter` FK):
  - Only 6 open rows have `claimed_profile = true`.
  - Owned: **1** (staff#03 MANAGER). Unowned: 71,418.
- **B — MOSO's assigned `recruiter` FK**, with `claimed_profile` not required. This is how MOSO itself assigns rows (`AssignOwnersOp`, `ILOAutomaticAssignOwnerOp`, CSV import, `RecruitAPI:645`).
  - Owned: **3,354**. Unowned: 68,065.
  - The unowned include 12,552 rows whose recruiter is a departed person or not on the staff list.
  - Owned per recruiter, labelled by row of `prod_grant_proposal.csv`:

    | Recruiter (CSV row) | Rows |
    |---|---|
    | staff#01 RECRUITER | 1,074 |
    | staff#02 RECRUITER+ONBOARDING | 299 |
    | staff#03 MANAGER | 1,107 |
    | staff#05 RECRUITER | 7 |
    | staff#11 RECRUITER+ONBOARDING | 766 |
    | staff#13 RECRUITER+ONBOARDING | 101 |

**Finding: `claimed_profile` is very likely NOT a recruiter claim.** In packs, `claimed_profile` only appears in `TempRestoreFIndLoanOfficerOp`, which sorts the public Find-a-Loan-Officer list with claimed profiles first. So it reads as "the loan officer claimed their public profile". MosoRowMapper's "Not claimed = claimed_profile" mapping (line 44) is probably a misreading. If B is chosen, the importer's `ownerMap` must key on `recruiter` without the `claimed_profile` gate.

Staff list: 11 people with a grant ("Đang làm", role not "KHÔNG cấp"); the VP ("Chưa cấp") is held apart and owns 0 open rows. The CSV's email column holds up to 2 addresses per person; all are matched.

Reference sizes:
- Working loan officers: 5,292 emails / 2,644 NMLS.
- No-rehire: 56 emails / 40 NMLS.

## 4. Email templates (`templates/`, PII-checked)

MOSO resolves a `Template` in the tenant namespace first, then falls back to the global namespace '' (base `db/Bundle.getFreshEntity`, copy-from-global). So the **tenant copy is what prod sends** when it exists. Lookup taken 17:57:28 UTC.

| Template (key) | Effective in prod | Subject | Repo files |
|---|---|---|---|
| `email/interested_loan_officer_invitation_email` | tenant, updated 2023-09-26 | "Invitation to join ${Server.getCompanyWithDBAInfo().name}" | `.tenant.*` + `.global.*` |
| `email/webinar_registration_send_manually` | global | "You're Registered! Why Loan Factory Every Friday" | `.global.*` |
| `require_ilo_esign_documents` | global | "Action Required: Review and E-Sign Your Loan Officer Agreement" | `.global.*` |
| `pre_onboarding_done` (welcome) | tenant, updated 2026-07-23 | "Loan Factory Onboarding: Complete These Initial Steps" | `.tenant.*` + `.global.*` |
| sub-templates `signature`, `admin_signature_generator` | `signature`: global. `admin_signature_generator`: **tenant** | — | `.global.*` only |

Each `*.meta.json` holds the subject, from/to/cc/bcc/reply_to, context variables and the full `${...}` placeholder list.

**The 1-1 meeting reminder has NO MOSO template.** `RecruitMeetingReminder.EMAIL_TAG = "email/onboarding_meeting_reminder"` is only an EmailHistory label: "nothing is looked up or rendered under this name". Recruit composes the title and body (`onboarding/reminder/ReminderEmailHtml.java`), so there is nothing to rescue.

**PII check.**
- No secrets.
- Only role mailboxes (support@, accounting@ and one recruiting role address @loanfactory.com) and the company phone appear.
- The tenant `admin_signature_generator` (20 KB) hard-codes 8 addresses and 4 phone numbers that may be personal. It was **kept in the cache dir only**, not in the repo.

**Diff vs moso-configuration `backups/Template/` (origin/master).** The backups equal the GLOBAL copies byte-for-byte (ignoring whitespace) for all 4. The tenant overrides differ:
- **Invite:** the tenant hard-codes `support@loanfactory.com`; global uses `${company.email}`.
- **Welcome (`pre_onboarding_done`):** the tenant (the one prod sends) **drops 3 lines that global/backup have**: "You may refer to the attached files…", the "Loan Factory Onboarding Process" Google Doc link and the Canva "Company Training — Loan Officer Onboarding Series" link. The rest is markup only.
- **P1(c) must port the tenant versions, not the backups.** Bao should say whether the dropped training links come back.

## 5. moso-aid Mongo (LO Recruiter Program)

- **Hosting.** moso-aid runs on **Cloud Run** `moso-aid` (project `lender-rate`, us-central1, default compute SA, image tag `72c826ff…`).
  - `MONGO_URI` is a **plain env var** on the service, not a Secret Manager ref. So are `JWT_SECRET`, `LOL_SSO_CLIENT_SECRET` and all service keys.
  - Anyone with `run.services.get` can read them. **Security finding for DevOps:** move them to Secret Manager.
  - I did not read or use any of these values.
  - Secret Manager listing is denied for Bao's identity.
- **Exported (read-only, no new credential).** Recruit's own roster read: `GET /api/lo-programs/recruit/members?program_id=…`.
  - Called from a throwaway pod in ns `recruit-be` (prod), using recruit's existing `RECRUIT_MOSO_AID_ROSTER_KEY` / `RECRUIT_MOSO_AID_BASE_URL` from `recruit-svc-secret`. This is the same pattern as `rro.sh`.
  - Output went straight to `moso-aid/roster_*.json`.
  - `lo_recruiter`: 2 keyed people, both pending, 0 approved.
  - `ambassador`: 21 keyed people (15 approved, 6 pending). Status counts: approved 15, pending 9, withdrawn 1, revoked 1, rejected 0. Keyless approved 0; 9 pending in the counts vs 6 keyed pending members, so about 3 pending applicants have no MOSO key.
- **Not exported: full applications.** That means form answers, social-profile proofs, status history, keyless applicants and teams.
  - Those routes (`/lo-programs/applications`, `/applications/export`, `/teams`) sit behind `LO_ADMIN_SERVICE_KEY`, which only the lf-homepage server holds.
  - Using that admin key, or `MONGO_URI` from the service env, would mean using someone else's credential. I did not do either.
  - **Needed:** a read-only Mongo user on the moso-aid database (collections `loprogramapplications`, `loprogramteams`, `loprogramcatalogs`, `loprogramproofs`). This comes from whoever administers that Mongo (Khai / DevOps). Alternatively, Bao OKs one run of the admin CSV export (`/lo-programs/applications/export`) from lf-homepage's server side.

## 6. STOP scan cap (`SendLORecruitingToRecruitOp.isStopArchived`)

**Confirmed in packs 3.64.1, `SendLORecruitingToRecruitOp.java:59,122-138`.**
- `STOP_NOTE_SCAN_LIMIT = 100`.
- For archived outbound rows only, it loads `Note where container = row` with `.list(100)` and **no `orderBy`**, so it reads the first 100 in key order, not the newest. It then looks for the marker `replies with "STOP" or "Unsubscribe"`.
- A STOP note past position 100 is missed, and the row reaches Recruit without `__stop_detected`, so no TCPA suppression.
- `ExportLORecruitingForMigrationOp` raised its cap to 1000. Its Javadoc says "newest-first", but its query has no `orderBy` either, so that claim is wrong.

**Measured (read-only, `COUNT ... upTo 101` per row, then a full note scan).**
- 4,516 archived outbound rows.
- **0 rows have more than 100 notes.** The maximum is 12.
- 4,157 rows carry the STOP marker; the furthest marker sits at position 8.
- Positive control: the scan finds the marker on 12 of the 40 most-noted rows.
- So the cap **drops nothing in prod today**. It is a latent bug only.

**Fix (not opened as a PR).**
1. Make `AutomaticallyUpdateLORecruitingOp` stamp an indexed boolean on the row when it archives for STOP (e.g. `stop_opted_out = true`, plus the date). `isStopArchived` and the export op then read that flag instead of scanning notes.
2. Backfill the 4,157 rows found here: id list in `stop_cap/stop_archived.ids.txt`.
3. Until then, if the scan stays, page through ALL notes with a cursor instead of `.list(100)`, and fix the "newest-first" Javadoc.
4. Better still, Recruit should treat MOSO's own STOP ledgers (`SMSOptOut`, `OptOutRequest`) as the source of truth and keep the note scan as a backup only.

## 7. Blockers and decisions needed

1. **Cold owner rule A vs B (§3).** 1 owned vs 3,354 owned. This blocks `agentflow-kzwcg`.
2. **Welcome email content (§4).** Should the training links missing from the prod tenant copy come back?
3. **moso-aid applications (§5).** This needs a read-only Mongo user from Khai/DevOps, or Bao's OK for one admin CSV export.
4. **Non-federal call opt-outs** cannot be separated in MOSO (`source` unindexed, legacy rows null). For Recruit's call ledger, treat every `CallOptOut` hit on a candidate phone as a block.
5. **Security:** move moso-aid's Cloud Run env secrets to Secret Manager (DevOps).

## 8. Files in `~/.cache/claude-recruit/moso-snapshot-2310/` (PII — never commit)

- **Exports:** `*.jsonl.gz` and `manifest.tsv` (rows, pages, timestamps per kind).
- **Templates:** `templates/` (raw lookups, including the tenant `admin_signature_generator`).
- **moso-aid:** `moso-aid/roster_{lo_recruiter,ambassador}.json`.
- **Recruit keys:** `recruit_prod_legacy_keys.csv`.
- **Cold dry-run:** `cold_dryrun/` (summary plus id lists).
- **STOP cap:** `stop_cap/` and `stop_cap_summary.json`.
- **Counts:** `ledger_counts.json`.
- **Scripts:** `export_kind.py`, `cold_dryrun.py`, `calloptout_lookup.py`, `stop_cap_measure.py`, `websafe_key.py`, `build_templates.py`.

## Bao action — moso-aid admin CSV export (approved by Bao 23/10, one read-only run)

**Why Bao has to click.**
- The only admin export path is the lf-homepage program console: `/manage-lo-programs/<slug>` → "Export CSV".
- That link calls lf-homepage's server proxy `/webplus-api/lo-admin/lo-programs/applications/export`, which adds moso-aid's `LO_ADMIN_SERVICE_KEY` and checks the viewer's MOSO permissions.
- Recruit's roster key does NOT cover it; moso-aid only accepts `RECRUIT_INBOUND_SERVICE_KEY` on `/lo-programs/recruit/members`.
- I have no admin browser session of Bao's.
- The proxy's identity check rides on an unverified `x-moso-user-id` (open item agentflow-048o). Calling it with Bao's key from a script would be exploiting that gap, not legitimate access, so I did not.
- Bao's MOSO account holds both `RECRUITING` and `MARKETING`, so both consoles open for him (`canManageLoProgram`).

**Steps** (logged in to www.loanfactory.com as bao.trinh@loanfactory.com, same browser):

1. Open https://www.loanfactory.com/manage-lo-programs/lo-recruiter-program
2. Leave every filter empty (Status = all, Level = all, search blank, no day range). This is the page's default.
3. Click **Export CSV** (top right, next to the title). The browser downloads `lo-program-lo_recruiter-applications.csv`.
4. Open https://www.loanfactory.com/manage-lo-programs/ambassador-program and repeat steps 2–3. The file is `lo-program-ambassador-applications.csv`.
5. Optional, for the full audit trail (old level rows and grandfathered standing, which the default hides):
   - Right-click **Export CSV** → Copy link address.
   - Append `&include_superseded=true&include_standing=true` and open that URL in the same tab.
   - Do this once per program. Rename the files `…-applications-audit.csv`.
6. Move the files without opening them in a shared tool:

   ```bash
   mv ~/Downloads/lo-program-*-applications*.csv ~/.cache/claude-recruit/moso-snapshot-2310/moso-aid/ && chmod 600 ~/.cache/claude-recruit/moso-snapshot-2310/moso-aid/*.csv
   ```

**What the CSV holds** (moso-aid `services/lo-program.js` `exportCSV`), one row per application, newest first:
- name, first/last name, email, NMLS, role.
- level, status (approved / pending / withdrawn / revoked / rejected), submitted_at, decided_by (last decider).
- audience totals, Ally state, social profiles.
- every form answer as its own column.

**Not in the CSV:**
- the full `status_history` (only the last decider);
- team-lead assignments (`/lo-programs/teams`, shown in the console but not exportable);
- proof screenshots.

The roster I already exported (§5) covers the current standings. If teams are needed, P5 has to read them through moso-aid, not through this export.

After Bao drops the files, I (or the lead) record row counts per program and status here, as counts only.
