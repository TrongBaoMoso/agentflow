# Joined (S6) → 100% Onboarded (S7): signed/paid tracking, Send to HR automation, HR/Licensing return path

Research only, 07/10/2026. No code or data was changed.
Sources read: recruit-be `origin/master` 2e790d00, recruit-fe `origin/master` (includes #399 c8946c61),
ai-hr-be `origin/master` e71c0264, recruit-be `docs/DECISIONS.md` (abbreviated `DEC:<line>`),
`docs/FEEDBACK/*`, `docs/transcripts/**`, beads `agentflow-ks99`, `agentflow-qn3cx`, `agentflow-j5823`, `agentflow-pzo8`,
memory notes `reference_recruit_stranger_to_employee_e2e`, `reference_moso_lo_signing_and_fee_source`.

Labels: **FACT** = read in code/doc. **INFERENCE** = my reading. **PROPOSAL** = my design suggestion, not decided.

---

## Q1. Are "signed" and "fee paid / waived" tracked automatically?

### Short answer
**FACT: Mostly automatic, through the MOSO sync. Recruit has no e-sign or payment webhook of its own.**
The LO pays (PayPal) and signs (Inkless, or the in-page `document_signing_tabs`) on MOSO's apply form.
MOSO saves `LORecruiting`, and a packs TypeWatcher pushes the whole row to recruit. Recruit maps the flags
onto the open offer. The 29/09 staging E2E measured "recruit flips the offer to PAID/SIGNED by itself
within about 1 minute" (memory `reference_recruit_stranger_to_employee_e2e`, step 4).

### The path, step by step
| Step | Where | What |
|---|---|---|
| 1 | packs `LORecruiting` save → TypeWatcher → memcache debounce → GAE task → `POST /public/v1/webhook/moso/listener` | `MosoWebhookHandler.java:22-32`. Each event is the CURRENT STATE of one row, so a lost event heals on the next save. The event is persisted first (D71). |
| 2 | `MosoRowMapper.mapIlo` | Reads `paid_startup_fee`, `waive_startup_fee`, `lo_agreement_signed`, `paid_and_signed` (`MosoRowMapper.java:734-737`). It builds an `OfferPlan`: PAID / WAIVED / PENDING, and SIGNED or SENT (`:744-780`). |
| 3 | `MosoRowUpsertServiceImpl.materializeOffer` → `OfferServiceImpl.reconcileFromLegacy` | Moves only PENDING → PAID/WAIVED, and only SENT → SIGNED (`MosoRowUpsertServiceImpl.java:1142-1155`, `OfferServiceImpl.java:921-996`). The actor is `SYSTEM`. |
| 4 | The same reconcile | Rings the owner's bell for FEE_PAID (`OfferServiceImpl.java:942-944`) and SIGNED (`:971`). |
| 5 | D167 auto-stage | `autoAdvanceForOffer` runs after commit on every MOSO push to a worked row and after every manual mark. S6 is entered when the offer is SIGNED and the fee is PAID or WAIVED (DEC:240; `JoinedOfferCheck.java:23-31`). |
| 6 | S6 entry | `OnboardingNotices.onStageChanged` sends the specialist the bell "has joined and is now with you for onboarding" (`OnboardingNotices.java:100-113`). `generateOnEnterS6` creates the S6 checklist, including `ONB_SETUP_CALL` (D135, DEC:212). |

### Manual paths (who can do it)
- `POST /offers/{id}/signed`, `/fee-paid` and `/waive-fee` are all gated by **OFFER_APPROVE** (`OfferController.java:136-154`), plus `assertProgramMoneyDecision` for program invites (`OfferServiceImpl.java:768-783`). OFFER_APPROVE is seeded to MANAGER (`V005__offer_permissions.sql:10-13`) and to ADMIN through `*`. The controller javadoc calls them "Stub for the e-sign webhook" and "Stub for the payment webhook".
- **FACT: no recruit-fe screen calls them.** The hooks `useMarkOfferSigned`, `useMarkOfferFeePaid` and `useWaiveOfferFee` exist (`offers.api.ts:165-185`), but nothing imports them. In practice a manual "paid" or "waived" happens through MOSO's own grid dropdown (Paid/Unpaid/Waived), which then syncs.
- A waive can also be granted at approve time: the manager approves a recruiter's waive request (`OfferServiceImpl.java:317-333`, D127).
- `markSigned` requires the offer to be SENT (`OfferServiceImpl.java:623`).

### Where it shows
| Surface | What it shows | Source |
|---|---|---|
| LO quick view and full profile (#399), Overview tab | **InviteProgressCard** with the steps Invited (or Handed off) → 1-1 → "Paid the fee" or "Fee waived" → Signed. Each step has its own tick, so "paid, not signed" is visible. The fee and signature steps show state only, with no time, because the wire has booleans only. | `InviteProgressCard/index.tsx:97-130`, rendered at `CandidateDrawer/OverviewTab.tsx:254`. BE: `InviteStatusServiceImpl.java:95-97,205-208` |
| My invites / My hand-offs (D175) | One stage per offer: WAITING_APPROVAL, INVITED_1ON1_PENDING, PAYING_SIGNING, SIGNED, DECLINED. **The stage comes from `offer.status` alone.** | `MyInvitesStore.java:112-118`, `InviteStage.java` |
| Bells | "{lo} paid the invite fee" and "{lo} signed the agreement" go **to the candidate's owner (the recruiter) only, never to the actor**. On S6 entry, the specialist gets "has joined and is now with you for onboarding". | `PlatformInboxCatalog.java:103-106`, `OfferNotices.java:83-106`, `OnboardingNotices.java:111` |
| Recruiter Today | Resurface chip "Paid, not signed · N days" or "Signed, fee not paid · N days" (PARTIAL), after `today.s5_partial_resurface_days`. | `WaitingOnLoPolicy.java:33-49`; `messages/en/today.json:130-135` |
| Specialist Today, onboarding section | Only MARK_DONE, MEETING_TODAY, BOOK_1ON1 and UPCOMING. **There is no "Send to HR" or "setup call" task.** | `OnboardingTask.java`; `OnboardingSection/index.tsx:26` |
| ONBOARDING team queue | The DONE 1-1 stays listed while the write-back is syncing or the welcome mail was blocked. It drops off once the LO has signed. | `OnboardingActionNeededSelector.java:43-56,218-222` |
| Sync trace (drawer) | Raw `fee_status` and `agreement_status` chips | `SyncTraceSection/index.tsx:212-221` |

### Gaps and stuck states (FACT unless marked)
1. **My hand-offs reads `offer.status` only.** A paid-but-unsigned offer stays in PAYING_SIGNING, which is correct. A **signed-but-unpaid** offer shows as **SIGNED** and looks finished, although the LO has not joined. The list also has no stage after SIGNED: Joined, Sent to HR, Account created and Onboarded do not exist there.
2. **No bell for a waived fee.** `waiveFee` and the reconcile WAIVED branch ring no one (`OfferServiceImpl.java:654-666`, `:933-936`). The specialist hears nothing about a signature or a payment; they hear only about S6 entry.
3. **SIGNED without SENT** gets stuck. If MOSO says signed while recruit's offer is still APPROVED (for example, an INVITE that was dead-lettered), reconcile refuses and logs a `SIGNED_WITHOUT_SENT` skip (`OfferServiceImpl.java:973-981`). The candidate never reaches S6. The skip is visible only in the sync trace.
4. **PAID vs WAIVED disagreement** is left for a person to resolve (`FEE_DISAGREEMENT`, `:946-957`). It is visible in the sync trace only.
5. **The fee and signature steps carry no timestamp** on the card. The ledger does have `offer_history` times, which My invites uses (`MyInvitesStore.java:72-74`).
6. **Latency** is about 1 minute, measured on staging only (29/09). Signing and payment can arrive only if the MOSO webhook path is healthy. The legacy bug `71hs` (prod swallowing saves) is noted in memory. I did not re-measure production.

---

## Q2. Can Send to HR be automatic?

### What exists today (FACT)
- **One door, human only.** `POST /api/v1/candidates/{id}/hr-handoff` requires `CANDIDATE_HR_HANDOFF`, which is seeded to ONBOARDING (V106) (`HrHandoffController.java:30-34`). `HrHandoffEnqueuer` returns `NOT_HUMAN` for a null or SYSTEM actor (`HrHandoffEnqueuer.java:93-97`). The handoff fires **once ever**, through a compare-and-set on `handed_off_at` (`:98-126`).
- **D130** (DEC:194) **removed** the original automatic trigger (D116, which fired when S6 was entered through `transition()`) and made the button the only door. The reason given: Send to HR is "a deliberate action taken only after the 1-1 confirms W-2 vs 1099 (lo_type/employment_type) … not an automatic side effect of a stage change (confirmed by Bao 2026-09-24)". A second reason: S6 arrives mostly through the MOSO import, and an automatic trigger would fire for legacy rows.
- **The flag differs by environment.** Staging: `RECRUIT_FEATURES_HR_HANDOFF_PUBLISH=true` (`helm-chart/config/staging/values.yaml:377-378`). **Production: the flag is absent, so it is OFF** (`helm-chart/config/production/values.yaml:154-158`). The FE hides the block when `enabled=false` (`SendToHr/index.tsx:79`). **Today, nobody in production can send to HR.**

### Readiness: what blocks a send (`HrHandoffReadinessService.java:103-128`, D158 DEC:225)
**Blocking (`missing`):**
- `stage:not_joined` (the candidate must be at S6)
- `status:archived`
- `offer:not_signed_and_paid`
- `first_name` / `last_name`, which must match `ValidPersonName`
- `email`, which must be valid because it becomes the sign-in email
- `nmls_id` (`^[1-9][0-9]{3,11}$`)
- `lo_type` and `employment_type`, both set by "1-1 Done with W-2/1099"
- `lo_type:employment_type_mismatch` (contract ⇔ INDEPENDENT; MORTGAGE_ADVISOR is exempt)
- `already_sent`

The rules mirror ai-hr-be (`HrIntakeRules.java:9-131`).

**Warnings only:** `phone:missing`, `phone:invalid`, `phone:landline`, `mailing_address:missing` and `legal_name_unconfirmed` (`:136-155`). **A legal name is not required** (D158, which reverses the D155 gate). The FE turns every key into a link that opens the right edit tab (`SendToHr/index.tsx:18-36`).

### What the payload resolver needs (`HrHandoffPayloadResolver.java:246-292`)
The resolver re-reads the candidate at delivery time (the outbox holds keys only). It sends:
- `event`, `event_id` (the outbox row id), `source_system=recruit-be`, `source_kind=candidate`, `source_key=candidate id`, `contract_version=recruit.hired.v1`
- `first_name`, `last_name`, and `email` (lower-cased)
- `phone`, as E.164 or omitted
- `nmls_id`
- `legal_first_name` and `legal_last_name`, **only if CONFIRMED**
- `licensed_states`, for display only
- `sponsorships`: SPONSORED rows only. **This is usually empty at handoff time, because Licensing sponsors after HR.**
- `mailing_address` and `preferred_languages` as `{code, name}`
- `lo_type`, `employment_type` and `offer_signed_at`

### How HR receives it (FACT, ai-hr-be)
`POST /internal/v1/recruit/hires` → `IntakeRecruitHire` (`internal/api/recruitintake.go:14-55`; `internal/service/recruitintake.go:37-43`):
> "what it opens is a DRAFT that a person with employee.draft.write still has to submit".

The result is `created`, `updated`, `existing_draft` or `already_employee`, and `dropped[]` lists the fields HR could not use. Recruit only logs `dropped` at WARN (`HrHandoffClient.java:128-137`). It is not stored or shown.

In the staging E2E, HR then **typed the work email and a licence (catalogue row plus expiry) and submitted**. That created the account, `associate.onboarded` and a packs Admin (memory `reference_recruit_stranger_to_employee_e2e`, step 5). Recruit cannot supply the work email or the licence catalogue row. That is by design: a state cannot pick a catalogue row (`HrHandoffPayloadResolver.java:105-114`).

### What HR (Yến) and the company said
- **The legacy system was automatic up to the ticket.** In MOSO, when *1-1 = Pre-onboarding done + fee Paid/Waived + Signed + Status Onboarding + NMLS licensed + HR not initiated* all held, an escalation rule **auto-created a "Create account" ticket** for HR (Dave). A human then created the account (`transcripts/extract/hr-yenvu-2026-08-06.md:149-189`, Yến 1:49, 6:44, 1:06:33; `FEEDBACK/03-hr.md:112-127`). So the **draft in HR's queue is the new "ticket"**. Whether the trigger was a machine or a person was never a human-judgement question in the old system.
- **Exceptions are a human push.** Yến and Phương: some LOs get an account without meeting the conditions. Bao's decision was that an Onboarding role may click a button, give a reason and push to HR (`FEEDBACK/03-hr.md:161-171`). That was "decided but never written into DECISIONS.md".
- **The CEO wants it automatic.** Thuận, D40: "it's automated — it fires the request … and their software creates the account". D42: "everything must eventually be automated; step by step is fine" (`transcripts/extract/ceo-thuan-2026-08-13.md:665-720`).
- **HR reviews before the account exists.** HR still does a BGC first for GA, OR and KY (`hr-yenvu:191-197`). Phương: HR works in the HR system and does not come into recruit (C6, `hr-yenvu:1620-1634`).
- I found **no statement by Yến saying "I want to review before recruit sends"**. Her review happens in HR, on the draft.

### Is automation forbidden?
**FACT:** D130 plus the enqueuer's "hard constraint #1 (one door, human)" forbid it **as written**. Turning it on needs a new decision that amends D130.
**INFERENCE:** D130's own reason, that the W-2/1099 decision must come first, is already enforced by the readiness gate: `lo_type` and `employment_type` are blocking. An automatic send gated on full readiness therefore respects the reason behind D130. The second reason, MOSO-imported S6 rows, is still real. Automation must skip candidates no one in recruit worked (`legacy`/import S6, and the 67 production S6 rows in D172).

### PROPOSAL
1. **Auto-send on readiness, not on the stage.** After any write that can complete readiness, recompute and enqueue if `ready` holds and `handed_off_at` is null:
   - S6 entry (D167 auto-stage)
   - 1-1 Done with W-2/1099
   - a profile edit of name, email, NMLS or lo_type
   - a MOSO push

   The same `AutoStageTrigger`-style AFTER_COMMIT hook can do this. Use a new actor, `SYSTEM:auto-hr-handoff`, credited to the specialist like D173. Keep the CAS once-only guard.
2. **Guard rails:**
   - Only candidates whose offer was SENT by recruit (an INVITE outbox row, or a REQUESTED ledger row), so MOSO-legacy rows never auto-fire.
   - A separate flag, `recruit.features.hr-handoff-auto`, OFF by default.
   - When the flag first turns on, **no backlog wave**: a cut-off date, or a one-time list for Bao to approve.
   - D216 on-behalf-of is not needed for SYSTEM.
3. **When it is not ready:** replace the button-centred block with a **"Missing for HR: …" checklist**. It already exists as `missing` and `warnings`. Add it:
   - to Today's onboarding section as a new task `SEND_TO_HR_BLOCKED` ("Fix for HR: NMLS, W-2/1099")
   - to the profile header
   - to My hand-offs as a stage after SIGNED: `JOINED_MISSING_FOR_HR` / `SENT_TO_HR`
4. **Keep a manual button for two cases:**
   - **"Send now (exception)"** with a required reason, for the exceptions Phương described. It needs a new decision: should it bypass blocking keys that HR does not refuse?
   - **"Send again"**, only when delivery is `failed` (dead letter). Today the receipt says "no resend" (`SendToHr/index.tsx:81-90`). A true re-send of edited data needs HR's `updated` path, which already exists (`RecruitDraftUpdated`, ai-hr-be `employment/contract.go:141-143`), and a reset of `handed_off_at`. That changes D116/R07.
5. **Show HR's receipt.** Persist `result` (`created` / `existing_draft` / `already_employee`) and `dropped[]` on the outbox row. Show "HR draft created · HR still needs: work email, licence" so the specialist knows the next wait is on HR.
6. **Precondition:** production `RECRUIT_FEATURES_HR_HANDOFF_PUBLISH` must be turned on first. `agentflow-pzo8` (integration tests before the flag goes on) is still open.

---

## Q3. After HR creates the account and Licensing sponsors: tell recruit and ping the specialist?

### What HR's own work is (FACT, sources)
- **HR status ladder (legacy):** HR not initiated → (account created) HR onboarding → (to-do list verified + HR documents verified, "2 conditions") HR completed (`FEEDBACK/03-hr.md:199-210`).
- **To-do verification is by eye.** It includes external tools such as the Gmail signature, so it cannot be automated. HR clicks Clear or sends the item back (`hr-yenvu:724-800`, items 42-44, 48).
- **The headline ask:** one HR-only **"Verified" button** that fires an API so recruit flips the status (Bảo 31:10, Yến 32:49: "complete not checked → complete fires an API", `hr-yenvu:756-790`). Phương said no button is needed and HR would detect it itself (C4, `hr-yenvu:1596-1610`). **Undecided.**
- A caveat: "You can be fully onboarded even if this is incomplete" (compliance courses), so HR completed ≠ every to-do done (`03-hr.md:208-210`).
- **Decided 25/09 and 29/09:** BGC, account creation, Paylocity, to-dos, documents and licence data all live in the HR app. Recruit only receives completion (bead ks99 description and comments; memory `project_recruit_hr_app_owns_employee_work`).

### What Licensing does
- In the legacy flow, Licensing started after HR moved to "HR onboarding" (ticket, TRIGGER-2, `hr-yenvu:201-213`). They sponsored on NMLS, then set `NMLS Sponsored`.
- **TRIGGER-3:** licence sponsored but HR not done → nudge HR. **TRIGGER-4:** no reverse nudge, because the third-party NMLS cannot be pushed (`hr-yenvu:215-248`; CORRECTIONS-2026-09-23 §4).
- **Now:** Licensing works in the HR app (D172, DEC:235; `FEEDBACK/04-licensing.md:3`). ai-hr-be stores per-state `employment_license.sponsored` + `sponsored_date` (`00257_…sql`). A licence write announces `associate.updated` with category `licensing`, and peers re-read the licences (`internal/db/associate_snapshot.go:17-20,100-106`).

### D172 (DEC:235): what S7 requires
1. HR account created, which means `associate.onboarded` → `candidates.account_id`. This is a precondition only.
2. HR completed: to-do list and HR documents verified in the HR app.
3. Licensing completed: the LO is sponsored, signalled from the HR app.
4. `ONB_SETUP_CALL` done.

Items 2 and 3 must arrive as HR events ("3 milestone events or 1 'HR completed' event"). WAIVED counts as PAID. There is **no roll-back**. Visibility only: an "HR progress light" (bead `agentflow-j5823`). **Status: "Not built"**. Auto-S7 is blocked on HR (owner Hưng). Today S7 is reached by a manual `transition` or by MOSO's legacy `joined`.

### Event contract draft (bead ks99 notes, 29/09)
- Proposed topic `HR_ASSOCIATE_MILESTONE`: `{platform_user_id, employment_id, milestone: onboarding_complete|bgc|documents_complete|license, state: passed|failed|waived|pending, occurred_at, event_id}`, published through HR's `announceAssociateTx` outbox.
- The 29/09 comment names the milestones `hr_completed` and `licensing_completed`, plus optional progress statuses (`bgc_pending`).
- `bd search hr_completed` returns nothing, so there is no separate bead.
- **I found no transcript in which Hưng commits to "to-do list done" or "HR docs verified" events.** The only Hưng mentions are "devs owning the HR side" (`hr-yenvu:73,1522`) and "owner Hưng" in D172 and ks99. **Treat Hưng's commitment as unconfirmed.**

### What recruit receives today (FACT)
- **Only `associate.onboarded`.** Recruit subscribes to `HR_ASSOCIATE_ONBOARD` and nothing else (D156, DEC:224). It reads back `GET /internal/v1/associates/{uid}`, matches `sources[recruit-be/candidate]` and writes `account_id` with a compare-and-set.
- The subscriptions are configured on staging (`values.yaml:153-154`) and production (`values.yaml:163-164`).
- HR publishes four events only: onboarded, role_changed, updated and deactivated (`ai-hr-be internal/db/associate_announce.go:60-63`). **None of them is a to-do, document, BGC or onboarding-complete event.**
- HR does have an onboarding checklist with `onboarding.completed_at` and per-task status (`00009_onboarding_offboarding.sql`; `datamodel/onboarding.go`), but no announcement of it.
- `qn3cx` is parked: the HR-created Admin is not linked to MOSO `LORecruiting`, so MOSO's `hr_status` never moves either.

### Not built
- Any recruit handler for `associate.updated` (licensing) or milestones.
- Any "HR completed" or "Licensing completed" state on the candidate.
- The HR progress light (j5823).
- The auto-S7 transition.
- A bell when HR or Licensing finish.
- Retiring the manual `HR_BGC`, `HR_ONBOARDING`, `HR_DOCS` and `HR_COMPLETE` items (V067:79-86). They are still seeded and must stay non-mandatory (D172).
- A "Setup call" task on Today.

### Design brainstorm (PROPOSAL)
**Milestones to show on the profile, and on My hand-offs as a second row of steps after Signed:**

`Joined ✓ → Sent to HR ✓ (draft) → HR account created ✓ → HR to-do list ✓ → HR docs verified ✓ → Licensing sponsored ✓ → Setup call ✓ → Onboarded`

- "HR to-do" and "HR docs" may collapse into one "HR completed" if Hưng ships a single event. D172 allows either.
- Under each pending step, show **who it waits on** and the **age** ("HR · BGC pending · 4 days"). This is j5823.
- Licensing has **no** "nudge" affordance, which matches TRIGGER-4.

**When to ping the specialist:**
- **Bell "HR and Licensing are done for {lo}. Book the setup call."** It fires once, when the last of {HR completed, Licensing completed} lands and account_id is set. This replaces legacy ticket 14 and the `hr_status_changed_to_completed` mail (`FEEDBACK/02-onboarding.md:236-239`).
- **Optional earlier bell:** "Licensing done, HR still pending". This is legacy TRIGGER-3, but in legacy it went to HR, not the specialist, so it is low priority.

**When the Setup call item is created:**
- Today it is created at S6 entry with a 3-day due date, and D135 already notes it "shows early and soon overdue".
- **Proposal:** keep the item created at S6, because D135's gate logic reads only `ON_ENTER_S6` items. But give it a **"waiting on HR/Licensing" state**: BLOCKED with the reason "Waiting for HR and Licensing". Set its `due_at` when the HR+Licensing event lands. It surfaces on Today as a `BOOK_SETUP_CALL` task only then.
- The alternative is a new trigger `ON_HR_LICENSING_DONE`, which needs a template trigger change and gate changes. The BLOCKED-until-event approach is smaller.

**Auto-move to Onboarded (S7):** when account_id is set, HR completed, Licensing completed and `ONB_SETUP_CALL` is DONE (plus any item a department marks mandatory), recruit transitions to S7 as SYSTEM, credited to the specialist (D173 credit).
- No roll-back (D172).
- Following D172, make `ONB_SETUP_CALL` mandatory on staging first.
- After S7, `generateOnFullyOnboarded` creates `ONB_ASSIGN_SUPPORT` and `HR_TRAINING_KICKOFF` (D135).

**Fallback while HR has no milestone events:**
- **(a)** Recruit could derive "Licensing completed" today. It would subscribe to `associate.updated` (category `licensing`), re-read the licences, and count Licensing as done when every requested sponsor state has `sponsored=true`. INFERENCE: this is feasible with the existing HR surface, but "every requested state" is a recruit guess. D172 asks for ONE signal from Licensing.
- **(b)** A manual "HR completed" / "Licensing completed" mark in recruit, given to HR/LICENSING roles. This contradicts "HR does not come into recruit" (C6). Not recommended, except as a stop-gap.

### Open questions for Hưng and Yến
1. One `hr_completed` event, or two (`todo_completed`, `docs_verified`)? Does "HR completed" allow optional to-dos to be unfinished? (`03-hr.md:208`)
2. Who presses "Verified" in the HR app? Is it a button (Bảo, Yến) or detected automatically (Phương)?
3. Is Licensing's "completed" one explicit action in the HR app, or derived from `employment_license.sponsored` for the requested states? What if the LO asked for several states and one is pending for weeks?
4. Will HR also publish progress (`bgc_pending`, draft not yet submitted, draft age) for the light (j5823)? Can HR send back the draft id and submit status?
5. Can the HR draft carry the work email if recruit asks the LO for it (CEO D41)? Today HR types it.
6. Do exceptions (accounts created without meeting the conditions) reach recruit at all? If HR creates an associate with no recruit `sources[]`, recruit never links it.
7. For Bao: amend D130 to allow automatic send on readiness? Auto-send the production backlog of S6 candidates, or not?
