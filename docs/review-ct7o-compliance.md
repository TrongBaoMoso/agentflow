# Review ct7o: is the compliance side complete? (webinar registration suppression gate)

**Reviewer scope:** whether the fix closes the hole, and which similar doors are still open. Correctness and blast radius belong to the other reviewer.
**Code read:** recruit-be `agent/ct7o-webinar-suppression-gate` (= origin/master `288eb81`) · packs `origin/master` `10c01a2db62` · base `origin/master` · recruit-fe `origin/master` `34a7acb`. All paths below are recruit-be unless a repo is named.
**Date:** 2026-09-23

---

## 0. Verdict

**Implement with changes.** The proposal's delivery-time half is right and follows the precedent. The enqueue-time half, **written as proposed (a throwing `assertOutboundAllowed` placed next to the enqueue), is a BLOCKER**. It fires after two remote writes that cannot be undone, and it makes a recruiter unable to record a call that really happened. The fix is also necessary but not sufficient: after it lands, the Google Calendar invite still has no gate on the packs side, and on production the suppression ledger is still nearly empty (bulk import never run). Omni's EMAIL and CALL channels have no gate at all. Required changes are in §6.

Urgency changes too. The whole webinar path is **dark in every environment today**, so live exposure is zero. Treat this as a precondition for turning on `RECRUIT_FEATURES_PACKS_WRITEBACK`, not as an active leak (§3.3).

---

## 1. Claims in the brief/bead found FALSE or stale

| # | Claim | Finding | Evidence |
|---|---|---|---|
| F1 | "this path consults **no suppression state at either end**" | **Partly false.** packs' mail transport drops any recipient whose address has an `OptOutRequest` row (email opt-out *or* hard bounce) at send time. So the *webinar mail* is already gated for **packs-side email opt-outs**. It is **not** gated for: BLACKLIST (`BlackListUser`), suppressions that exist only in recruit, or the **calendar invite** (§2.2). | base `core/.../BaseEmailService.java:89-91` (calls `removeTestEmails` on to/cc/bcc), `:161-172` (`bundle.exists(OptOutRequest.TYPE, email.toLowerCase())` → remove); packs `ExportLORecruitingForMigrationOp.java` javadoc ("`BaseEmailService` skips sending to any email for which a row exists") |
| F2 | bead ct7o: "`resolveWebinar()` has a comment saying 'No eligibility re-check, unlike resolveInvite'" | **Stale.** `resolveWebinar` **does** re-check eligibility now (ARCHIVED/BLOCKED/DORMANT). The stale wording lives in **`PacksWritebackKind`** javadoc and in the packs op comment. Both now contradict the resolver and should be corrected in the same PR. | `PacksWritebackPayloadResolver.java:217-242` vs `PacksWritebackKind.java:32-37`; packs `SaveLORecruitingFromRecruitOp.java:216-217` |
| F3 | bead ct7o: call site at "`FollowUpServiceImpl:302`" | Line drift. The call is at **:335**. | `FollowUpServiceImpl.java:333-335` |
| F4 | brief §4: "Check `BlacklistPredicateParityIT` … that pins this [PII rule]" | **False.** That IT proves the BatchClaim JPQL and `CandidateSlices` Criteria blacklist predicates agree. It says nothing about PII. The PII pin is **`OfferInviteSuppressionIT`**. Also, `SuppressionServiceImpl#blocks` is **not** covered by the parity IT, so it is a third copy of the blacklist rule that nothing parity-tests. | `BlacklistPredicateParityIT.java` class javadoc; `OfferInviteSuppressionIT.java:240-242` (`.doesNotContain(email).doesNotContain("Terminated for cause")`) |
| F5 | brief: the resolver "checks ARCHIVED / BLOCKED / DORMANT" (implying status covers part of this) | True as written, but **BLOCKED is never written** by anything, so that branch is dead code. ARCHIVED/DORMANT cannot get in at enqueue either (`ownedWorkingCandidate` rejects them). They only catch a status change *after* enqueue. None of the status checks give any suppression coverage. | `FollowUpServiceImpl.java:734-750` (agentflow-81rt note), `HostSubjectsServiceImpl.java:35-38` |

Everything else in the brief checked out: the single enqueue call site, `WEBINAR_EMAIL_TEMPLATE`, the calendar chain, and the #383 precedent.

---

## 2. Does the fix close it? Tracing from the click to the inbox

### 2.1 The path

1. Recruiter submits `/call-outcome` INTERESTED + WEBINAR + `webinarId` → `FollowUpServiceImpl#recordOutcome:141`
2. `autoClearOnCallLogged(candidate)` (`:150`) → **remote** `closeDueMatching` on followup-be, synchronous (`FollowUpAutoClear.java:56`), best-effort
3. `interested()` → **remote** `client.create(...)` next-step follow-up (`:310-311`)
4. local writes → `candidate.setStatus(ACTIVE)` (`:315`) → **`enqueueWebinarRegistration`** (`:333-335`). No-op if the flag is off, the webinar id is blank, or there is no `legacy_key` (`PacksWritebackEnqueuer.java:175-199`)
5. SYSTEM timeline line: `"…, registered for webinar X"` (`:349-350`)
6. Relay tick → `PacksWritebackPayloadResolver#resolveWebinar:231`: survivor → status check → legacy_key → `{key, webinar}`
7. packs `SaveLORecruitingFromRecruitOp#execute`: webinar exists, is the right type, is in the future, email present (`:206-234`) → sets `LORecruiting.webinar` (`:244`) → `save()` → `LORecruiting.afterSave` adds the email to `Webinar.guests` → **`SyncWebinarsCalendarOp`** upserts the Google event with the attendee (`SyncWebinarsCalendarOp.java:50-62`)
8. `if (registeredForWebinar && isNot(ready_to_join))` → queues `EmailTemplateOp("webinar_registration")` (`:288-294`) → `BaseEmailService` drops `OptOutRequest` addresses (base `:89-91,166`)

### 2.2 Points where a suppressed person can still be contacted

| # | Point | Gate today | After proposal |
|---|---|---|---|
| P1 | Webinar confirmation mail (step 8) | packs `OptOutRequest` only | + recruit ledger (BLACKLIST, recruit-side EMAIL rows) ✅ |
| P2 | **Google Calendar invite** (step 7): a separate message, sent by Google to the same address, which packs' mail layer never sees | **none on either side**: `SyncWebinarsCalendarOp` does no opt-out lookup; the `ready_to_join` gate (`:288`) guards only the mail, and the op's own comment says "The registration itself still happens; only the mail is suppressed" (`:287`) | ✅ closed **only because recruit refuses the whole registration**. recruit is the **only** control for P2. |
| P3 | Suppression arriving **after** packs accepted the row | none | **still open.** Nothing un-registers: the guest entry stays, and later webinar edits re-sync the event to all guests. recruit has no un-register path. Residual risk, MINOR, record it. |
| P4 | Opt-out recorded in packs after cut-over but not yet in recruit (agentflow-tfei: MOSO suppression does not stream to recruit) | P1: packs `OptOutRequest` catches it. **P2: nobody** | **P2 still open** for exactly this population. The correct fix is in packs: refuse the webinar registration when `OptOutRequest`/`BlackListUser` matches `LORecruiting.email`. That is a packs PR (not self-merge). |

**Answers to the specific questions:**
- **Does packs apply a gate?** Only for mail, and only against its own `OptOutRequest` (F1). No BLACKLIST check, and no gate on the calendar leg. recruit carries **all** of the duty for BLACKLIST and for the calendar invite.
- **Is the calendar invite a separate contact?** Yes: a Google-sent invitation to the same address, produced by the save itself rather than by `EmailTemplateOp`. Gating EMAIL in recruit stops it only because recruit refuses to send the registration at all. That is the correct design; any partial gate ("register but suppress mail") would reopen P2.
- **Does the STOP list distinguish channels?** Yes. `SuppressionType` = `STOP_SMS | BLACKLIST` (`SuppressionType.java:7-9`). `STOP_SMS` carries a `channel` of SMS/CALL/EMAIL (`SuppressionChannel.java:6-7`). `blocks()` = BLACKLIST blocks every channel until `rehire_after`; STOP_SMS blocks **only its own channel** (`SuppressionServiceImpl.java:139-144`). So **an SMS STOP does not block EMAIL**, which is pinned for invites by `OfferInviteSuppressionIT.java:154` (`smsOnlyOptOut_doesNotBlockTheEmailInvite`).
- **Should an SMS STOP block the webinar mail?** Legally no: TCPA scopes SMS, and CAN-SPAM is honoured through the email opt-out. Asking EMAIL is correct and consistent with #383. **However**, the same human act gets two different outcomes depending on when it arrived:
  - a legacy STOP reply imported from MOSO writes **both** an SMS row and an EMAIL row (`MosoRowMapper.java:1134-1146`, called at `:698-701`)
  - a live inbound STOP via omni writes **SMS only** (`InboundOptOutSuppressionWriter.java:138-143`)

  So a pre-cut-over STOP-er gets no webinar mail and a post-cut-over STOP-er does. That is a policy inconsistency, not this PR's bug. Open a DECISIONS §6 item (MINOR).

---

## 3. Is the ledger even populated?

### 3.1 Writers of `suppression_list` (all go through `SuppressionServiceImpl#create`)

| Writer | What it writes | Runs where |
|---|---|---|
| `MosoImportServiceImpl:87-116` (`POST /admin/import/moso`, kinds BLACK_LIST / SMS_OPT_OUT / EMAIL_OPT_OUT / CALL_OPT_OUT) | BLACKLIST; STOP_SMS+SMS; STOP_SMS+**EMAIL**; STOP_SMS+CALL | **Manual, rows carried in the request body.** **Never run on production** (`import_batches` empty, `docs/DECISIONS.md:1113-1118`). Staging has 6 old batches (agentflow-f760) |
| `MosoRowUpsertServiceImpl:119/202/221→766` (LO_RECRUITING rows, via import or realtime webhook) | legacy `__stop_detected` → SMS + EMAIL rows | wherever MOSO row ingest runs |
| `InboundOptOutSuppressionWriter:138` (omni inbound STOP) | STOP_SMS+SMS only | depends on omni inbound being live |
| `SuppressionController:39` (admin) | anything | manual |

### 3.2 Measured state
Production 21/09: phone STOP_SMS/SMS rows exist (44 on the positive-control query); distinct channels are {SMS, EMAIL}; bulk import never run (`DECISIONS.md:1113-1118`).

### 3.3 Do tfei / f760 change the value of this fix?
**Yes, they change its reach, not whether it is needed.**
- On **prod**, until f760 runs, the recruit EMAIL gate blocks only the few rows that came in through row ingest or an admin. packs' `OptOutRequest` check is actually the **more complete** gate for the *mail* today. What recruit's gate adds right away: **BLACKLIST** (which packs never checks for this mail) and the **calendar invite** for anyone in recruit's ledger.
- **tfei** (no realtime MOSO suppression feed) means recruit's ledger decays after any one-off import. That leaves P4/P2 open no matter what this PR does. Only a packs-side check (§2.2 P4) or a realtime feed closes it.
- **Current exposure is zero:** `recruit.features.packs-writeback: ${RECRUIT_FEATURES_PACKS_WRITEBACK:false}` (`application.yml:218`), which is not set in `deploy/configs/values-prod.yaml` and deliberately not set on staging (`values-sta.yaml:204-215`: `PACKS_API_KEY` is also missing). `enqueueWebinarRegistration` returns false when the flag is off (`PacksWritebackEnqueuer.java:176-178`).

⇒ **Recommendation:** record in `docs/STATUS.md` (and in a comment beside the flag in `values-prod.yaml`) that the production packs-writeback flag must not be turned on before **f760 has run** and **ct7o has merged**. Otherwise the gate goes live against an empty table.

---

## 4. PII

- **How `resolveInvite` avoids PII:** it uses the non-throwing `firstBlocking` and builds the skip reason from `resolved.getId()` + `getSuppressionType()` only (`PacksWritebackPayloadResolver.java:186-196`). That string is persisted to `packs_writeback_outbox.last_error` and logged at INFO (`PacksWritebackTickServiceImpl.java:100-103`). The pin is `OfferInviteSuppressionIT.java:240-242`.
- **Proposal step 2 (`firstBlocking` in the resolver):** safe **if** the reason is built the same way. **Required:** add a webinar twin of `suppressedAfterEnqueue_deliveryRefuses` with the same `doesNotContain(email)` / `doesNotContain(reason)` assertions against `last_error`.
- **Proposal step 1 (`assertOutboundAllowed`) does leak:** its exception message includes `match.getIdentifierValue()` and `match.getReason()` (`SuppressionServiceImpl.java:39-43`). This is existing precedent (ActivityServiceImpl, OfferServiceImpl), where the text goes to the recruiter in the 400 body. I could not verify here whether tera-core's `BaseExceptionHandler` also logs the message (source jar not in the gradle cache). For the webinar path, §5 recommends not throwing at all, which also removes this leak.
- **A sibling that leaks at rest today:** `SequenceEnrollmentTickProcessorImpl.java:233-236` catches that same exception and does `failExecution(execution, suppressed.getMessage())`, which runs `execution.setError(error)` (`:308-311`). That puts **the identifier value and the free-text reason into the sequence execution row.** It is dark today (sender is `NoOpSequenceSenderImpl`), but it is exactly the pattern the bead forbids. MINOR, open a bead.

---

## 5. What a refused registration looks like to a human

The honest answer today is **nothing visible**:
- **Delivery-time skip:** the only traces are `packs_writeback_outbox.last_error` and an INFO log line. Nothing surfaces WEBINAR rows. `InviteStatusServiceImpl` reads only INVITE-kind outbox rows (class javadoc), and there is no webinar equivalent.
- **The timeline actively lies after a delivery-time skip.** The SYSTEM line "registered for webinar X" is written at *enqueue* (`FollowUpServiceImpl.java:349-350`). If the resolver then skips (a suppression, or the status checks that already exist), the permanent timeline still says "registered". The enqueuer's own javadoc calls this out as the thing to avoid ("would put a permanent, false record on the audit trail", `PacksWritebackEnqueuer.java:169-173`). The delivery-time gate adds a new route into that falsehood. It already exists for the status skips and for dead-letters.
- **Audit:** `AuditServiceImpl` UNIONs 8 branches over 7 ledgers (owner, stage, settings, merges, rbac grants, offer_history, conversation grants ×2, `AuditServiceImpl.java:~59-88`). It has no suppression-refusal branch and no outbox branch. Even the #383 invite refusal is **log-only** (`OfferServiceImpl.java:340-343`) with no ledger row.

**Minimum for this PR (see §6 C3/C4):**
1. Refusal at enqueue → a SYSTEM timeline line that is visible in the moment: "Webinar registration NOT sent: outbound EMAIL suppressed (BLACKLIST|STOP_SMS)". TYPE only, no identifier. Plus a response field so the FE can tell the recruiter right away.
2. Refusal at delivery → append a SYSTEM activity "Webinar registration for X withdrawn at delivery: EMAIL suppressed (TYPE)" so the timeline corrects itself. Alternatively, move the claim out of the enqueue line into a status the resolver owns.

Anything larger (an audit branch for refusals) is a separate bead.

---

## 6. Findings, ranked

### BLOCKER
**B1: If the enqueue gate throws where the proposal puts it, it fires after irreversible remote writes, and it refuses to record a call that happened.**
`assertOutboundAllowed` next to `:335` runs **after**:
- `autoClearOnCallLogged`, which closes followup-be reminders synchronously (`FollowUpServiceImpl.java:150`, `FollowUpAutoClear.java:56`)
- `client.create(...)`, which creates the next-step follow-up (`:310-311`)

The 400 rolls back the local transaction but leaves an orphaned remote follow-up plus closed reminders. That is exactly the hazard the method's own comment warns about at `:284-290`. Separately, throwing means the recruiter **cannot record INTERESTED** for an email-suppressed person who just said yes on the phone. The CALL happened; only the *registration* is forbidden.

The invite precedent throws because there the send *is* the whole action. Here the send is a side effect of recording an outcome.

**Change:** do **not** throw. In `interested()`, when `kind == WEBINAR && webinarId` is present, call `firstBlocking(candidate, EMAIL)`:
- if present: skip the enqueue, log `candidate id + TYPE`, and write the refusal into the SYSTEM line (§5)
- otherwise: enqueue

`webinarRegistered` then stays truthful, and there are no remote-write ordering problems.

### MAJOR
- **M1: calendar invite (P2/P4) is only as good as recruit's ledger.** File a **packs** bead/PR: `SaveLORecruitingFromRecruitOp` refuses `webinar` when `OptOutRequest(email)` or `BlackListUser` matches. This is the only defence for opt-outs that never reach recruit (tfei).
- **M2: omni EMAIL and CALL channels have no suppression gate in recruit.** The cast carries `sms_capable` only (`CandidateCastAssembler.java:239-245`). The candidate email is always pushed (`:215-217`). There is no `email_capable`/`call_capable`, and omni has no STOP (`docs/OMNI-STATUS-2026-08-25.md` C4). recruit-fe turns `channels: { email: true, sms: true, call: true }` on, including a ContextPanel quick-call that "dials immediately, with no confirm step" (recruit-fe `src/shared/omni/candidateSectionConfig.tsx:230-255`). An EMAIL-opted-out or BLACKLISTed person can be emailed, and a CALL-opted-out person (federal DNC once f760 imports it) can be dialled, from inside the conversation. This is out of this PR's scope but is **the biggest open door**. Needs a bead: omni capability flags for email/call, or a host-SPI pre-send check.
- **M3: the flag flip on prod must wait for f760** (§3.3). Record it in STATUS and in a values-prod comment.

### MINOR
- **m1:** Delivery-time skip leaves "registered for webinar X" on the timeline (§5). Fix in this PR (C4) or bead it.
- **m2:** Stale javadoc in `PacksWritebackKind.java:32-37` ("resolver does NOT re-check eligibility"). Correct it in this PR. The packs op comment at `:216-217` needs the same fix in a packs PR.
- **m3:** Sequence engine persists the identifier and reason into the execution row (`SequenceEnrollmentTickProcessorImpl.java:235` → `:310`). Dark today. Bead it.
- **m4:** STOP→EMAIL behaves differently for legacy imports and live inbound STOPs (§2.2). Open DECISIONS §6.
- **m5:** P3: a suppression that arrives after delivery never un-registers the person. Document it as residual risk.
- **m6:** `SuppressionServiceImpl#blocks` is a third blacklist rule outside `BlacklistPredicateParityIT` (F4).

### Required changes to the proposal (for "implement with changes")
- **C1.** Enqueue: non-throwing `firstBlocking(candidate, EMAIL)`, gated to `kind == WEBINAR && webinarId` present. Skip the enqueue, **no exception** (B1).
- **C2.** Delivery: as proposed. Place `firstBlocking(resolved, EMAIL)` after the status check and before the legacy_key check. Reason text = `candidate id + TYPE` only, mirroring `resolveInvite:192-195`.
- **C3.** Refusal is visible: a SYSTEM timeline line with TYPE only, plus a response flag for the FE.
- **C4.** A delivery-time refusal appends a correcting SYSTEM activity (or the enqueue line stops claiming "registered").
- **C5.** Tests. Port `OfferInviteSuppressionIT` to webinar:
  - blacklisted → refused
  - EMAIL opt-out → refused
  - **SMS-only opt-out → still registers**
  - lapsed blacklist → registers
  - suppressed after enqueue → delivery refuses **with the `last_error` PII assertions**
  - merged into a suppressed survivor → refuses

  Plus a unit test showing a suppressed INTERESTED+WEBINAR **still records the outcome** and that `client.create` behaviour is unchanged.
- **C6.** Update `PacksWritebackKind` javadoc. Add a `docs/STATUS.md` line (rule #15) and a `docs/INTEGRATIONS.md` note on the packs-writeback row that WEBINAR is now suppression-gated at both points (rule #14).

---

## 7. Sibling-door inventory: every outbound-causing path in recruit-be

| # | Path | Causes contact? | Status | Evidence |
|---|---|---|---|---|
| 1 | `PacksWritebackKind.PROFILE_WRITEBACK` / `enqueueIfEligible` | No: writes company_name / sponsor_states / states only; the packs op sends nothing for these | **N-A** | `PacksWritebackFieldMapping.java:33-35`; packs op `:169-180` (no send on these fields) |
| 2 | `PacksWritebackKind.INVITE` / `enqueueInvite` | Yes: invitation email | **GATED** at both ends | `OfferServiceImpl.java:340-344`; `PacksWritebackPayloadResolver.java:186-196`; `OfferInviteSuppressionIT` |
| 3 | `PacksWritebackKind.WEBINAR_REGISTRATION` / `enqueueWebinarRegistration` | Yes: mail + **Google Calendar invite** | **UNGATED** in recruit (packs gates only the mail, only `OptOutRequest`) → this PR | `FollowUpServiceImpl.java:333-335`; `PacksWritebackPayloadResolver.java:231-256`; packs op `:197-294` |
| 4 | Sequence engine (`SequenceEnrollmentTickProcessorImpl` via `SequenceTickServiceImpl`) | Would, but sender is a no-op; SMS steps are blocked outright (no quiet-hours gate) | **GATED** (per send, every channel), dark. PII-at-rest defect m3 | `SequenceEnrollmentTickProcessorImpl.java:224-237`; `NoOpSequenceSenderImpl.java:21` |
| 5 | `ActivityServiceImpl#log` OUTBOUND | Records a touch (and triggers the omni call mirror and cast push) | **GATED** before save and before mirror/push | `ActivityServiceImpl.java:116-121`, `:175-187` |
| 6 | Other `ActivityEntity` writers | `ActivityServiceImpl:359` is INBOUND; FollowUpServiceImpl writes NOTE/SYSTEM only (`:763-795`). No other `setDirection` writer | **N-A** | `grep setDirection(` → only `ActivityServiceImpl:125,359` |
| 7 | `recordOutcome` (Focus "Log result") | Records a CALL outcome without going through `ActivityServiceImpl#log`, so a do-not-CALL person can have a call recorded. It is a record, not a cause | **N-A** for causing contact (worth knowing: it bypasses the CALL gate on the logging side) | `FollowUpServiceImpl.java:141-178`, comment at `:143-146` |
| 8 | Omni cast push (`CandidateCastAssembler`) | Grants omni the ability to contact | SMS **GATED** via `sms_capable`; **EMAIL and CALL UNGATED** (M2) | `CandidateCastAssembler.java:215-219,239-245` |
| 9 | Omni call mirror (`OmniCallMirrorClient`) | No: mirrors a call already made; below the gate in #5 | **N-A** (covered by #5) | `ActivityServiceImpl.java:178-186` |
| 10 | Omni composer (recruit-fe → omni directly) | Yes: EMAIL / SMS / CALL | SMS via cast flag; **EMAIL and CALL UNGATED** (M2) | recruit-fe `candidateSectionConfig.tsx:230-255` |
| 11 | `SEND_INFO` scheduled draft (`next_step_send_draft`, V094) | No automatic send: stored for the FE to prefill an omni conversation; there is no consumer in recruit-be | **N-A** in BE (the eventual send is #10) | `V094__send_info_draft.sql:1-25`; `grep NextStepSendDraft` → entity + FollowUpServiceImpl only |
| 12 | Follow-up bridge (followup-be create / patch / close) | No: internal reminders for recruiters | **N-A** | `FollowUpServiceImpl.java:310-311` |
| 13 | `UserServiceSyncEnqueuer` | No: identity sync; client is `NoOpUserServiceSyncClient` | **N-A** | `UserServiceSyncEnqueuer.java` class javadoc |
| 14 | `HrHandoffEnqueuer` | Not a recruiting contact: a post-hire handoff to ai-hr-be (only after the S6 join gate) | **N-A** (downstream ai-hr-be onboarding mail is an employment relationship, outside recruiting TCPA/CAN-SPAM scope; note it, don't gate it) | `HrHandoffEnqueuer.java` class javadoc |
| 15 | `WebinarClient` | No: reads the session list | **N-A** | `webinar/WebinarClient.java` |

**Summary:** 2 GATED (INVITE, sequence), 1 GATED-on-record (activity log), **1 UNGATED that this PR closes (webinar)**, **2 UNGATED that stay open (omni EMAIL, omni CALL)**, plus the packs-side calendar leg, which is gated only by whatever is in recruit's ledger.
