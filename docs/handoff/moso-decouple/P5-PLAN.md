# P5 plan: Loan Officer data and programs off MOSO

Bead `agentflow-0gwad.6` (children `.6.1`–`.6.5`). Written 08/11/2026 from code on the latest origin bases, the staging DB and the MOSO production Datastore. Every figure here is a count. No PII was read.

Scope (HANDOFF §4 P5): (1) opt-outs and the blacklist, (2) referral bonus state, (3) LO Recruiter Program roster, applications and approvals (moso-aid), (4) NMLS status, licences and sponsorship. Loans and volume (Modex / MMI) are already off MOSO and on prod (audit E, rows #699–#773).

Hard rules that apply to everything below: staging only, new flags ON in the staging values and ABSENT in production, prod gets the code dark.

## Summary

| Area | What still reads or writes MOSO today | Built now (staging, flagged) | Waits on Bao |
|---|---|---|---|
| 1. Opt-outs | No runtime read. MOSO opt-outs arrive only through the one-off import (runner + `POST /admin/import/moso`). The MOSO push carries `__stop_detected`. The live STOP path is omni `omni-inbound-reply`, not MOSO | **.6.1** a reconcile run: ledger vs ai-donotcall vs omni, APPLY fills only what Recruit lacks (recruit-be #913, D416, V349). **.6.2** the runner's STOP note scan reads every page (recruit-be #914) | Which list is authoritative for the 53 vs ~120 blacklist gap. Whether Recruit pushes its blacklist into ai-donotcall |
| 2. Referral bonus | **Runtime read of packs** `referrals/byOwner` + MOSO Check (`RecruitApiReferralOwnershipClient`), plus `referrers/resolve` (MOSO Admin key). Bonus figures shown on My referrals come only from MOSO | **.6.3** Recruit computes its own bonus state per referred candidate and shadow-compares it with packs (recruit-be #910, D420, V340) | Payout channel (accounting-be route vs CSV to Finance). Q13 (60 days from joined or signed). When the UI switches to Recruit's state |
| 3. LO Recruiter Program | **Runtime read of moso-aid** `GET /lo-programs/recruit/members` (program-sync tick, roster key, MOSO Admin keys; 53 members mirrored on staging). Applications, approvals, teams, the program console (lf-homepage) and Ally standings live only in moso-aid Mongo | **.6.4** moso-aid read route for applications (moso-aid #225, on staging 09/11) + Recruit read-only mirror with OFF / DRY_RUN / APPLY (recruit-be #911, D421, V342) | Who takes over moso-aid's writes (approvals). When lf-homepage's console and Ally repoint to Recruit. Who owns moso-aid's other functions |
| 4. NMLS / licences / sponsorship | **Push-only**: `nmls_status`, `sponsor_states`, `active_license_items`, sponsor dates, `applied_for_sponsorship` come from the MOSO row in the push (`MosoRowMapper`). Post-hire licences already come from HR / user-service (prod) | Nothing to build without HR: ai-hr-be's NMLS puller allows only the renewals report | HR's consent to use the NMLS company session for a sponsorship report, and who builds it |

## 1. Opt-outs and the blacklist

### Current state (measured)

- Recruit's ledger `suppression_list` is already the gate for every outbound call, SMS and e-mail (`SuppressionServiceImpl#firstBlocking`). Staging rows: BLACKLIST 117 (50 e-mail, 45 NMLS, 22 phone), STOP_SMS/SMS 488, STOP_SMS/EMAIL 2.
- MOSO production Datastore (08/11): `BlackListUser` 87 (all active), `SMSOptOut` 7,849, `OptOutRequest` 51,850. A `CallOptOut` count timed out.
- MOSO data reaches Recruit only through the runner (`scripts/moso-migration-runner.py`, kinds BLACK_LIST, SMS_OPT_OUT, EMAIL_OPT_OUT, CALL_OPT_OUT). There is no runtime read.
- Live SMS STOP comes from omni (`omni-inbound-reply`, `InboundOptOutSuppressionWriter`), not from MOSO.
- ai-donotcall: `LO_RECRUITING` is on the keyless check allowlist in both staging and prod (`blacklistCheckSources`). A keyless caller matches only entries with source `lo_recruiting`. tera-docs `crm/BLACKLIST.md` says adds are made in the Blacklist console. The "LO Recruiting `add`" row is marked not built, and the legacy import was 53 rows.
- omni exposes `GET /api/v1/internal/sms-opt-status` (omni #649) to any key-resolved owner service, recruit-be included.
- MIGRATION-SPEC L3: the STOP note scan read one page of Notes, 100 in the export op and 1,000 in the runner.

### Built (decision-free)

- **.6.1, recruit-be #913 (D416, V349):** `POST /api/v1/admin/optout-reconcile/runs` (`SUPPRESSION_MANAGE`), modes REPORT and APPLY.
  - It checks every live candidate against ai-donotcall (list form, 200 per call) and omni (one phone at a time, 20 ms apart).
  - It stores counts per kind and the candidate ids per mismatch.
  - APPLY writes only `DNC_ONLY_BLACKLIST` and `OMNI_ONLY_STOP`. It never deletes, never lifts a block, and never writes to ai-donotcall or omni.
  - One run at a time across pods. A heartbeat abandons a dead run.
  - Flags: `RECRUIT_FEATURES_OPTOUT_SYNC`, `RECRUIT_OPTOUT_SYNC_APPLY_ALLOWED`, `RECRUIT_DONOTCALL_BASE_URL`, all in the staging values only.
- **.6.2, recruit-be #914:** the runner's `StopScanner` pages through every Note with the cursor. It prints the rows that needed more than one page and the STOP notes found only past page one. `--stop-marker` adds older wordings.

### Target design

1. Recruit's ledger stays the source of truth for "may we contact this person".
2. Inbound: omni STOPs keep flowing live. The reconcile run (scheduled once a decision allows, or run by hand) closes any gap from before the subscription or from a lost message.
3. Blacklist: Recruit checks ai-donotcall at intake and before an offer (P3 intake can call the same `BlacklistCheckClient`). A recruiter barring an LO becomes an `add` with `source=lo_recruiting` once the platform team agrees (see decision B).
4. Cut-over (P6): one last runner import of MOSO's four kinds right before MOSO's recruiting crons stop, with the full STOP note scan, then a REPORT run to show the delta.

### Size and remaining work

- M in total. Built now: about 70%. Left: the intake/offer check (S, part of P3), a daily schedule for the run (S, after decision A), and the final import at cut-over (ops, P6).

### Decisions for Bao

- **A. Which blacklist is authoritative for LO Recruiting?** ai-donotcall holds 53 legacy rows (source not yet confirmed as `lo_recruiting`). Recruit holds ~120 rows from MOSO `BlackListUser`.
  - **Recommendation:** Recruit's ledger is authoritative for recruiting outreach (it is the gate, and it already blocks).
  - Run the reconcile in REPORT on staging and read the `LEDGER_ONLY_BLACKLIST` count first.
  - Then have the Blacklist console owner import Recruit's BLACKLIST rows into ai-donotcall as `lo_recruiting`. That is a console or bulk `add` by the platform team, not a Recruit write.
- **B. Should Recruit write `add` to ai-donotcall when a recruiter bars an LO?**
  - **Recommendation:** yes, but only after the platform team gives Recruit a scoped service key (`BLACKLIST_CLIENTS`). The tera-docs contract now says adds go through the console, so a keyless add would be against their design.
- **C. Turn on APPLY on staging now?**
  - **Recommendation:** yes for `OMNI_ONLY_STOP`, because TCPA-wise it only adds blocks.
  - For `DNC_ONLY_BLACKLIST` it also only adds blocks, so it is safe as well. Both are already allowed on staging. Prod stays absent.

## 2. Referral bonus state

### Current state (measured)

- "Who referred whom" is already Recruit-owned: `referral_attribution_events` (7,626 on staging), `candidate_referral_program` (190, D268/D269.1) and `candidate_program_qualification` (5, D269.2).
- The **bonus** shown on My referrals / Referrals is read live from packs `referrals/byOwner` (`PacksReferralRow`: `moso_payment_path`, `referral_eligible`, `bonus_amount` = MOSO `refer_cash_bonus_info`, `bonus_eligible_on` = `lo_joined_date` + 60, and `PacksCheck` requested/approved/paid). It is never stored (D174).
- `referrers/resolve` maps a central user to a MOSO Admin key.
- The REFERRER role sweep (D326) also reads packs `byOwner`.

### Built (decision-free)

- **.6.3, recruit-be #910 (D405, V337):** `referral_bonus_state`, one row per referred candidate, computed from Recruit data.
  - Statuses: NOT_ELIGIBLE with a reason, PENDING_JOIN, MATURING, EARNED.
  - Amount and maturity days come from settings (500 / 60, clock = JOINED, mirroring MOSO).
  - Packs' verdict is stored next to Recruit's in shadow columns, with a `disagrees` flag. An admin endpoint returns counts and ids.
  - No payout columns. The UI still reads packs.

### Target design

1. Recruit's state becomes what My referrals shows once the shadow disagreement is understood. That is a recruit-fe switch behind a flag.
2. Payout is recorded in Recruit as requested → approved → paid, with the money moved by Finance (decision D).
3. `referrers/resolve` is dropped: the self view keys on the central user id.
4. Migration: a one-time import of MOSO's paid Checks (packs `ExportReferralsOp`), so nobody is paid twice. MOSO's own Check cron is switched off in the same window.

### Size

- M. Built now: the state and the shadow compare. Left: the payout record (S–M after decision D), the FE switch (S), the paid-Check import (S, ops) and dropping `referrers/resolve` (S, P6).

### Decisions for Bao

- **D. Payout channel:** a new internal route in accounting-be (payment tickets/runs exist there, but no bonus concept) or a monthly CSV to Finance.
  - **Recommendation:** start with the CSV export from Recruit's EARNED rows (zero work on the accounting side, reversible). Move to accounting-be tickets when Finance asks.
- **E and F: decided by Bao on 08/11 21:10.**
  - The 60 days start at "completed onboarding = officially an LF Loan Officer" (JOINED).
  - Leaving before day 60 forfeits the bonus.
  - $500 goes to REFERRAL only; the LO Recruiter Program pays nothing. #910 was built this way, so no change is needed.

## 3. LO Recruiter Program (moso-aid)

### Current state (measured)

- moso-aid is Node + Mongo in MOSO's GCP projects, keyed by MOSO Admin keys.
- Recruit reads only `GET /lo-programs/recruit/members` (`RECRUIT_INBOUND_SERVICE_KEY`) into `program_members`: 53 on staging. `program_sync.mode` is DRY_RUN on staging and on prod, and `require_recruiter_flag` is true on staging.
- Applications, approvals, withdraw/downgrade/promote, teams, proof uploads, readiness and the directory are served to lf-homepage through `LO_ADMIN_SERVICE_KEY` (admin) or open routes. Ally reads `/lo-programs/ally/standing(s)`. packs reads `/standing/members`.

### Built (decision-free)

- **.6.4:** moso-aid PR #225 adds a read-only `GET /lo-programs/recruit/applications` behind the existing Recruit key. **Merged 09/11** (squash `c60e01ed`, on staging in rev `moso-aid-00212-kjl`); an unkeyed call answers 401.
  - recruit-be #911 adds a client and a `program_application_mirror` with OFF / DRY_RUN / APPLY.
  - **DRY_RUN on staging, 09/11 03:31Z** (run `fb10c011`, 1 page, nothing written, `mirrored_before` 0): 60 applications fetched.
    - By status: 54 approved, 2 pending, 3 revoked, 1 withdrawn. By level: 56 associate_recruiter, 3 senior_recruiter, 1 team_lead.
    - By activation source: 50 grandfathered, 9 application, 1 upgrade.
    - 53 distinct applicant keys, 7 keyless rows, 45 with a company email.
    - Mapped to Recruit: 3 of 60 (2 users by MOSO key, 3 users by company email, 0 candidates); 57 unmapped.
    - Not APPLIED; that is Bao's call.

### Target design

1. **Read phase:** the mirror fills; Recruit shows applications next to the roster (read-only).
2. **Write phase:** approvals move to Recruit (manager approves in Recruit). moso-aid becomes read-only for the program, and lf-homepage's console and Ally call Recruit.
3. The `/join/<slug>` directory is served by Recruit from its own users' e-mails (the slug is derived from `company_email`).
4. Identity moves from MOSO Admin keys to central user ids (user-service keeps upstream keys).

### Size

- M–L. Built now: the read path. Left: approvals in Recruit (M), the lf-homepage console repoint (M, the lf team), the Ally repoint (S, the Ally team), and the identity remap (S).

### Decisions for Bao

- **G. Who owns moso-aid after the program leaves it?** It also hosts LOL RBAC, exams, events and locations.
  - **Recommendation:** Recruit takes only the LO programs. Ask Khai/Dat who keeps the rest.
- **H. When does the program console in lf-homepage move to Recruit?**
  - **Recommendation:** after the read mirror has run on staging for a week with zero mismatches. Then build approvals in Recruit behind a flag and repoint the console in one lf PR.
- **I. moso-aid PR #225:** done 09/11, merged and on staging; the DRY_RUN reads real data (counts in .6.4 above).

## 4. NMLS status, licences, sponsorship

### Current state (measured)

- From the MOSO push only, mapped by `MosoRowMapper` / `MosoProfileFields`: `nmls_status`, `active_license_items`, `applied_for_sponsorship`, `sponsor_states`, sponsor first/last day, temporary sponsor day. On staging, 641 candidates have `nmls_status` and 2,382 have `sponsor_states`.
- Post-hire licences come from HR / user-service and are on prod (audit E rows #586–#689).
- ai-hr-be (origin/master f69a3b89) has a live NMLS company-account session. Its report allowlist is the renewals report only (`nmlsAllowedReports`, `internal/service/nmlsreport.go:52`). There is no sponsorship or relationship report and no per-NMLS read route.
- An NMLS identity lookup for a typed number: only the public NMLS Consumer Access link (already in Recruit). ai-browser is a prototype.

### Target design

1. ai-hr-be adds the sponsorship/relationship report to its allowlist and exposes a parsed per-NMLS read on an internal route (HR's repo, HR's call).
2. Recruit replaces the push fields with that read, keeping the source-tagged `sponsorships` rows (`LEGACY_IMPORT` stays for history).
3. One-time copy of MOSO's NMLS fields for open candidates. The push already copied live rows, and the Cold import copied the rest.

### Size

- M, almost all on the HR side. Recruit's part is S once the route exists.

### Decisions for Bao

- **J. Ask HR** whether the NMLS company credential may be used for a sponsorship report, and who builds it.
  - **Recommendation:** Bao asks HR's lead. Until then the push fields stay (they are cut only in P6). Nothing is lost in the meantime: the values are already stored on the candidate.

## Order of work (by independence value)

1. `.6.1` opt-out reconcile and `.6.2` the STOP scan. Independent, TCPA value, built.
2. `.6.3` referral bonus state (shadow). Independent, built; payout waits on D.
3. `.6.4` program applications mirror. Read path built; moso-aid #225 on staging 09/11, DRY_RUN reads 60 applications (3 map to Recruit).
4. `.6.5` NMLS. Waits on HR (J).

## Self-checks

```bash
grep -n "OPTOUT_SYNC\|DONOTCALL" recruit-be/helm-chart/config/*/values.yaml   # staging only
bash ~/.cache/claude-recruit/pgq_stg.sh recruit "select status, mode, scanned, applied, counts from optout_reconcile_run order by started_at desc limit 3;"
bash ~/.cache/claude-recruit/pgq_stg.sh recruit "select status, count(*) from referral_bonus_state group by 1;"
bd show agentflow-0gwad.6
```

## Progress log

### 08/11 night

- **#913 opt-out reconcile:** merged 5f3f929b (V349) and promoted.
  - First REPORT on staging: 7,656 people in 2 minutes 37 seconds.
  - omni works: 229 people are opted out of SMS in Recruit but not in omni, and none the other way round.
  - ai-donotcall refused every batch with HTTP 400, because one unreadable record rejects the whole list of 200. So no blacklist answer came back.
  - #919 fixes that: a refused batch is halved until the refused people are alone, capped at max(5, a tenth of the batch). It will be re-run once merged. APPLY has not been run: nothing was applicable.
- **#914 runner STOP scan:** merged ca50c169.
- **#910 referral bonus state:** merged (D420, V340) and live on staging.
  - Rows by status: EARNED 1, MATURING 4, NOT_ELIGIBLE 11, PENDING_JOIN 7, UNDETERMINED 172. Packs disagrees on 5.
  - Bao decided on 08/11: the 60 days start at joined, leaving early forfeits the bonus, and $500 is for REFERRAL only.
- **#911 program applications mirror:** merged aabbd4f32 (D421, V350) and promoted.
  - DRY_RUN on staging (09/11, after moso-aid #225 deployed): 60 fetched, 3 mapped, nothing written.
- **#921 (D430): "is this person a Loan Officer" from HR's LOAN_OFFICER role.** It runs in SHADOW on staging next to MOSO and counts agree / disagree / hr_unknown. This is part of BE-12.
- **Handed to p4-s4s5-esign:** a Recruit-sourced referral list behind PACKS / SHADOW / RECRUIT (BE-11, BE-23, BE-29, BE-30; D429, V352).
- **New observation, Recruit vs omni opt-outs:** Recruit holds 229 SMS opt-outs that omni does not.
  - Today Recruit's own gate blocks those texts, but a text sent from omni's composer outside Recruit would not be blocked.
  - Pushing them to omni as host-pushed blocks is decision K.
- **Decision K for Bao:** should Recruit's SMS opt-outs be copied into omni, so omni also refuses those texts?
  - **Recommendation:** yes. omni supports host-pushed blocks that only the host can lift. It needs Khai to give Recruit's key that write.

### 09/11 early morning

- **Second opt-out REPORT run (after #919):** ai-donotcall still refused almost everyone (7,633 of 7,664 came back DNC_UNCHECKED).
  - Cause: it accepts only US phones, and staging holds many non-US numbers.
  - Fix #925: send only the identifiers ai-donotcall accepts. A positively non-US phone counts as CLEAN. A malformed US phone or NMLS stays unchecked.
  - Re-run after the merge.
- **#921 (D430) HR Loan Officer check:** merged 5c46e11a and promoted, running in SHADOW.
  - First samples from staging test accounts: 11 checks. 7 agree, 4 where MOSO could not tell (HR said no), 0 disagree, 0 where HR failed.
- **#920 / #926 (D429, V352) Recruit-sourced referral list,** built by p4-s4s5-esign, on staging in SHADOW.
  - packs has 295 rows, Recruit 198. 120 match, 175 are only in packs, 78 only in Recruit.
  - 89 of the 120 matches name a different referrer.
  - Bonus fields agree on every match.
  - Not ready to flip.
  - Next steps need staging DB access, which needs gcloud re-login by Bao.
- **New decisions for Bao:**
  - **L. Who counts as the referrer when MOSO and Recruit disagree (89 on staging)?** Recommendation: the person recorded at sign-up.
  - **M. Import MOSO's ~175 unrecorded referrals once before Recruit takes over the list?** Recommendation: yes.
- **Fourth opt-out REPORT run (after #925 and #929): the blacklist check works.**
  - Cause of the earlier failures, reproduced locally: the JDK client's h2c upgrade made ai-donotcall's uvicorn/httptools drop the request body.
  - Run 3b533ebb checked 7,668 people with 0 unchecked.
  - 46 people are blocked in Recruit but absent from ai-donotcall's LO Recruiting list. 229 people opted out of SMS in Recruit but not in omni. Nobody is blocked outside Recruit without Recruit knowing.
  - So APPLY has nothing to add, and the open items are decisions A, B and K.

## API ask for Khai (omni-service): let Recruit push its SMS opt-outs (decision K)

**Why.** Recruit holds 229 SMS opt-outs on staging that omni does not know about. They came from MOSO imports, recruiters, bounces and unsubscribes. omni's `comm_suppression` table already supports `provenance = HOST_PUSHED` (V02). omni's gate also refuses a text for a HOST_PUSHED row, and `optstatushttp` reports it as not liftable. But no route lets a host write such a row: every writer goes through `internal/suppression/recorder.go` and stamps `OMNI_LEARNED`. So Recruit's blocks can't reach omni, and a text sent from omni's composer outside Recruit's own gate would still go out.

**Measured on 09/11, omni origin/master.**
- `db/query/comm_suppression.sql` has only two read queries (`PhoneSmsSuppressed`, `ActiveSmsStops`).
- `recorder.go` writes only OMNI_LEARNED STOP_SMS rows.
- There is no HTTP route for writing a suppression.

**The ask: three internal routes.** They sit behind `auth.RequireInternalKeySet`, with a key-resolved owner service (recruit-be's existing scoped key), the same gate as `GET /api/v1/internal/sms-opt-status`.

1. `PUT /api/v1/internal/suppressions` upserts one host-pushed block.
   - Body: `{ "identifier_type": "PHONE" | "EMAIL" | "NMLS", "identifier_value": "+15555550100", "suppression_type": "STOP_SMS" | "BLACKLIST", "channel": "SMS" | "CALL" | "EMAIL" | null, "reason": "...", "rehire_after": "2027-01-01T00:00:00Z" | null, "host_ref": "<recruit suppression id>" }`.
   - It writes `provenance = HOST_PUSHED` and the caller's tenant, keyed by the existing `uq_comm_suppression`.
   - Idempotent: the same body twice is one row.
   - It never overwrites an OMNI_LEARNED row's provenance. If omni already learned the STOP itself, it answers `200 {"outcome": "already_learned"}`.
   - Answer: `200 {"id": "...", "outcome": "created" | "updated" | "already_learned"}`.
2. `DELETE /api/v1/internal/suppressions/{host_ref}` lifts a block the same host pushed.
   - It stamps `lifted_at`, `lifted_by = <service>` and `lift_reason`. It does not delete the row, which matches V39.
   - A host can lift only what it pushed. An OMNI_LEARNED STOP stays lifted only by the person (START), as today.
3. `GET /api/v1/internal/suppressions?provenance=HOST_PUSHED&cursor=&limit=` lists a host's own active pushed rows, so Recruit's reconcile (D416) can compare both sides.

**What Recruit does once the routes exist.** This is built dark, like D436.
- After a Recruit SMS opt-out or blacklist row commits, Recruit calls route 1.
- Removing a Recruit row calls route 2.
- The D416 reconcile gains a third mode that pushes the `LEDGER_ONLY_STOP` rows, once and after Bao says yes. Today that is 229 on staging.

**Questions for Khai.**
- Should BLACKLIST rows also go to omni? We recommend yes: one table, one gate.
- Which tenant should Recruit's key resolve to?
- Should host-pushed rows carry the Recruit candidate id, for display in omni's composer?

## Built 09/11 (after the final report)

- **#932 (D435):** monthly referral payout list CSV for Finance. Read only, staging only. `GET /api/v1/referral-bonus-state/payout-list.csv?month=YYYY-MM[&through=true]`.
- **#933 (D436):** a recruiter's blacklist is copied to ai-donotcall. Built dark. It needs the platform team to issue a write key (`BLACKLIST_CLIENTS`, consumer `lo_recruiting`, scope `write`) and Bao's yes (decision B).
- **omni push:** no contract exists, so nothing is built. The ask above is ready to send to Khai.
