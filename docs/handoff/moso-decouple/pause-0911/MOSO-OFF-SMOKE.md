# moso-off smoke checklist (STAGING, after #969 is promoted)

Written 10/11 ~19:00 VN against recruit-be `origin/master` `ff029ade8`, before the flip. Staging only; prod has no
`RECRUIT_FEATURES_MOSO_OFF` entry. Mail goes only to the existing allowlist (`bao.trinh+*@loanfactory.com`); no SMS.
Do not use +stg demo leads. Do not call internal-key endpoints.

Shortcuts used below:
- `K` = `kubectl --context gke_lenderrate-master_us-central1_moso-kube -n recruit-be`
- `L` = `K logs deploy/recruit-be --since=<window>` (each pod if more than one: `K get pods`)
- `TOKEN` = `$(cat ~/.cache/claude-recruit/preview/stg_3370.token)`, API = `https://gateway.viet18.com/recruit-svc`
- DB = `bash ~/.cache/claude-recruit/pgq_stg.sh recruit "<sql>"` (read only)

## 0. Pre-scan result (what can still leave recruit-be)

| Call | Target | Under moso-off | Skip log |
|---|---|---|---|
| `RecruitApiClient` (every packs `/api/recruit/v1` op: invite, sync, onboardingMeeting, agreementDryRun/Send, meetingReminder, portalState/Unmark, registerWebinar, `read referrals/byOwner`, `read referrers/resolve`, emailAvailable) | packs / MOSO GAE | refused in the shared `send()` before a socket (NOT_SENT); `isConfigured()` false | `moso_off_skip target=packs op=<METHOD> <path>` |
| `PacksWritebackTickServiceImpl#tickOnce` | packs | tick idles, PENDING rows untouched | `moso_off_skip target=packs op=relay tick` |
| `MosoSignedReconcileTickService` | packs | tick idles | `moso_off_skip target=packs op=signed reconcile tick` |
| `PacksWritebackEnqueuer` | packs outbox | disarmed; gated callers skip, ungated ones get 409 `MOSO_OFF` | `op=enqueue <KIND>` / `op=enqueue <KIND> refused` |
| `WebinarClient#upcoming` | packs webplus | UNAVAILABLE | `moso_off_skip target=packs op=webplus getNextWebinars` |
| `MosoAidRosterClient#fetch` | moso-aid | NOT_CONFIGURED | `moso_off_skip target=moso-aid op=GET /api/lo-programs/recruit/members` |
| `PublicWebhookController` (MOSO push, inbound) | from packs | 200, body dropped | `moso_off dropped a MOSO push of N row(s)` + `target=moso-push op=listener` |
| `MosoApplyLinks` | MOSO apply URL in mail | portal link instead | `moso_off_skip target=moso op=apply_loan_officer link` |
| `MosoAidApplicationsClient#fetchPage` (D421 import, admin route only) | moso-aid | **NOT gated, intended**: moso-aid owns the program applications (Bao 10/11); it feeds `program_application_mirror`, read by the RECRUIT roster. recruit-be #975 documents it. | none |
| MOSO Datastore | — | recruit-be has no Datastore client | — |

Out of scope (not old MOSO): omni, notifier (incl. "moso-notifier" mail type), user-service, auth-service, zoom-go,
ai-hr-be, ai-donotcall, document-esign, PayPal, Google, follow-up service.

**A gap after the flip** = any of: a packs/moso-aid host in an outbound error, a `RecruitApiClient` / `Packs writeback
… delivered` line, a new outbox row, a new MOSO `webhook_events` row, a user-facing 409 `MOSO_OFF` on a main flow,
or a new ERROR logger. Record each with file:line under "Staging flip 10/11" in P6-INVENTORY.md.

## 1. Flip checks (5 min)

1. `K get deploy recruit-be -o jsonpath='{..env[?(@.name=="RECRUIT_FEATURES_MOSO_OFF")].value}'` → `true`.
2. `L | grep -m1 'recruit.features.moso-off is ON'` (WARN, once per pod at startup).
3. Also on startup: `Program roster source: RECRUIT (dry-run comparison on)`.
4. `curl -sS -H "Authorization: Bearer TOKEN" API/api/v1/admin/moso-off` → `{"moso_off":true,"skipped_since_pod_start":{…}}`.
   Within 1-2 cron periods the map gains `packs relay tick` and `packs signed reconcile tick`.
5. Baseline numbers to compare with are in the #969 PR body ("Baseline").

## 2. Main flows

Use one fresh test lead per flow, e-mail `bao.trinh+mosooff<n>@loanfactory.com`.

### 2.1 Lead → invite → onboarding
| Step | Do | Expect (UI) | Expect (log / DB) |
|---|---|---|---|
| Add lead | Pipeline → Add lead (name + e-mail) | lead created | `D356/D382: a key linked …` or plain create; no `moso_off_skip` |
| Lead intake | /join on lf staging (www.viet18.com) with a +mosooff address | lead appears in Recruit | `D356` intake lines; no packs call |
| Invite | Lead → Invite (Approve if the gate asks) | Offer SENT, no "Sync pending" | `Loan Officer mail sent: kind=INVITE…` (or the hand-off/"waits for specialist" path if no specialist), mail carries `?invite=` portal link; possibly `moso_off_skip target=packs op=enqueue INVITE`; DB: `select payload_kind,status,count(*) from packs_writeback_outbox group by 1,2` unchanged |
| Specialist | assign an onboarding specialist | "handed to you" bell for the specialist (D432 native) | `op=enqueue ONBOARDING_SPECIALIST` skip, no outbox row |
| Portal | open the `?invite=` link | portal steps, PayPal sandbox fee if shown (do not pay unless already allowed) | no `portalState` delivery; `op=enqueue PORTAL_STATE` skip is fine |
| 1-1 Done | Today / Onboarding → Done with date + W-2/1099 | item done, no "Sync pending" | `op=enqueue ONBOARDING_MEETING` skip; `welcome mail …` NOT "MOSO is told the 1-1 is done"; Recruit welcome `Loan Officer mail sent: kind=WELCOME` |
| Agreement | Signed step | Recruit e-sign (D409/D434) "Agreement sent for e-signature" for Recruit-only leads | `agreement_envelopes` new row; no packs `agreement/send` |
| Reminders | wait for the 1-1 reminder tick (or check next morning) | — | reminders via Recruit; no `MEETING_REMINDER` outbox row |

### 2.2 Referrals + My referrals
| Do | Expect |
|---|---|
| Admin → Referrals (all owners) | 200, same ~123 rows as §0g; no `referral_source.shadow` lines (source RECRUIT) |
| My referrals as a linked LO and as Bao | 200; an unlinked person may trigger `moso_off_skip target=packs op=POST …/referrers/resolve` and fall back (no 503 for linked people) |
| CSV export | downloads |
| Ambassador totals (moso-aid calls Recruit, inbound) | still answered from Recruit rows |

### 2.3 Webinar sessions + drips
| Do | Expect |
|---|---|
| Call outcome → Webinar on a test lead | Recruit sessions listed (D392); `moso_off_skip target=packs op=webplus getNextWebinars` may appear from the old picker/decorators — fine |
| Schedule tick | `webinar schedule tick: …` every period, no error |
| Drip | `webinar drip: …` lines; mails only to allowlist |
| Next-webinar token | filled from Recruit's schedule (D423), not empty |

### 2.4 Program roster tick (10-minute cron)
- `program sync tick dry_run: members=53 approved=53 linked=2 grants=0 revokes=0 suspensions=0` (mode DRY_RUN).
- Dry-run compare: `program roster source dry-run: acting=RECRUIT other=MOSO_AID unavailable (…)` plus
  `moso_off_skip target=moso-aid op=GET /api/lo-programs/recruit/members`. Expected; the acting source needs no moso-aid.
- `program_role_provisions` / `rbac_grant_history` PROGRAM_SYNC counts unchanged.

### 2.5 Bonus sweep (rides the program tick)
- `D420: bonus state sweep checked=N written=… compared=0 failed=…`: `compared` goes to 0 (packs read refused), Recruit's
  own state still recomputes. `moso_off_skip target=packs op=POST …/referrals/byOwner` per chunk is expected.
- Referrer role sweep: `referrer role sweep: …` with no ERROR.

### 2.6 MOSO push
- `select provider, max(created_date) from webhook_events group by 1`: MOSO max stays at its pre-flip value.
- If MOSO staging pushes, `moso_off dropped a MOSO push of N row(s)`.

## 3. After 2 h and after 24 h
1. `curl …/admin/moso-off`: skip map; any op beyond relay tick, signed reconcile tick, moso-push listener, webplus,
   moso-aid roster, resolve/byOwner, enqueue <KIND> → find who called it.
2. ERROR count by logger vs baseline (56 / 24 h: 54 `BaseExceptionHandler`, 2 `ConcurrentTransactionServiceImpl`).
3. Outbox counts unchanged; MOSO webhook max unchanged.
4. Write the result under "Staging flip 10/11" in P6-INVENTORY.md and update the % in §0i.

Revert: P6-INVENTORY.md §4.4 (value back to "false"; 4 PENDING INVITE rows would flush — check their age first).
