# Adversarial product review — the `hr_status` plan

**Reviewer:** REV-hr-product (product decision / does-this-solve-the-problem angle)
**Date:** 2026-09-23
**Base read:** `recruit-be` @ `origin/master` = `2a7fe3d`, fetched 2026-09-23. `recruit-fe` @ `origin/master`. `tera-docs` @ `origin/master`.

**Verdict: IMPLEMENT WITH CHANGES.** The direction is right and "no seat for HR" is correct — better
supported by the HR walkthrough than by D77 itself. But two of the four steps do not do what the brief
says they do, and one of them silently disables the very mechanism it is trying to restore.

---

## 0. Claims in the brief that are FALSE

| # | Claim | Status | Citation |
|---|---|---|---|
| F1 | "by D77 nobody holds the HR role — an HR checklist item can only be closed by someone holding `CHECKLIST_ITEM_MANAGE_HR`, and nobody holds it" | **Imprecise, and the imprecision matters.** D77 removes the `rbac_grants` ROW for HR *staff*. The `HR` **role** exists and now carries the permission, and `ADMIN` holds `'["*"]'` which `AccessControlService` honours. So an **admin can close an HR item today**. The true statement is "no HR *person* can", not "nobody can" — which means an unblock path already exists for a stuck candidate. | `recruit-be:src/main/resources/db/migration/V097__checklist_item_status_write_path.sql:59-60` and `:68-70` ("ADMIN is not granted anything here: it holds `'["*"]'` and AccessControlService honours the wildcard") |
| F2 | Gap B: "`V067`'s own comment may give a deliberate reason … if the new system intentionally diverged, 'fixing' the seed re-introduces something someone removed" | **Nothing was removed.** V067 (2026-09-13) *introduced* the mis-seed while citing the source that contradicts it — see §4. This is a miscopy, not a divergence. | `V067__checklist_templates.sql`, the `ON_100_ONBOARDED` block vs `docs/EVIDENCE.md:109` |
| F3 | Implied throughout: "the plan closes Gap A" | **False.** None of the four steps writes `DONE` to any checklist item. See §1 — this is the BLOCKER. | `ChecklistItemServiceImpl.java:64`; `ChecklistFacadeImpl.java` `demandManage` |
| F4 | Gap B: "as seeded the third gate sits downstream of the thing it is supposed to gate" | **Half true, and the wrong half is emphasised.** The setup-call item gates *nothing at all* today, in either position: every seeded template ships `mandatory = FALSE`, and `ON_100_ONBOARDED` templates are not even read by the S7 gate. Its position is wrong AND its gating is absent; only the second one has a business consequence. | `V067` header lines 6-17; `CandidateServiceImpl.java:756-770` |

---

## 1. BLOCKER — persisting `hr_status` does not close Gap A, and cannot, as specified

**Answer to question 1, traced concretely.**

If recruit stores HR's status, **nothing closes the HR checklist item.** The only write path to
`checklist_items.status` is `PATCH /api/v1/checklist-items/{id}`, and it demands a logged-in human
**twice**, independently:

- `ChecklistFacadeImpl.demandManage` → `ServicesUtils.getCurrentUserId(true)` — the `true` argument
  throws rather than returning null (`recruit-be:src/main/java/com/loanfactory/recruit/checklist/facade/impl/ChecklistFacadeImpl.java`, `demandManage`);
- `ChecklistItemServiceImpl.changeStatus` → `final String actor = ServicesUtils.getCurrentUserId(true);`
  (`recruit-be:src/main/java/com/loanfactory/recruit/checklist/service/impl/ChecklistItemServiceImpl.java:64`), and that `actor` is what lands in
  `checklist_item_history.changed_by NOT NULL`.

A MOSO webhook has no current user. So all four plan steps can run to completion and **every HR
checklist item is exactly as unclosable as it was before**. What the plan actually delivers against
Gap A is one new column and one new *item-creating* trigger — it adds work to queues, it removes none.

### Is a system actor closing a department's work the right shape?

**Yes — for exactly one template, and only if it is built as a mirror rather than as an authorization.**

The distinction is load-bearing:

- `ct-hr-complete` / `HR_COMPLETE` ("HR marks its portion of onboarding complete", V067 HR block) is
  **not work performed in recruit**. It is a *restatement* of a decision HR already made in their own
  app. Mirroring a decision made elsewhere does not undermine the per-department gate `5pb2` built —
  the gate answers "who may *decide*", and here HR still decides; recruit is only writing down what
  they decided. That is the same contract `hr_handoff_outbox` already runs in the other direction.
- The other three HR templates (`HR_BGC`, `HR_ONBOARDING`, `HR_DOCS`) must **not** be closed this way.
  `docs/FEEDBACK/03-hr.md:199-211` establishes that `HR status` is a **three-rung state machine**
  (`HR not initiated → HR onboarding → HR completed`) and carries an explicit warning, quoting the
  screenshot verbatim: *"You can be fully onboarded even if this is incomplete"*, followed by
  *"Mô hình hoá `HR completed` thành 'checklist rỗng' là **sai ngay từ định nghĩa**"* — modelling
  `HR completed` as "checklist empty" is wrong **by definition**. Deriving four item closures from one
  status string would write four facts recruit does not know.

### Three conditions on the mirror, or it does undermine the gate

1. **It must not travel through `CHECKLIST_ITEM_MANAGE_HR`.** Granting a permission to a webhook turns
   the department gate into a decoration. The mirror is a separate, narrow path keyed to one
   `template_code`, and `5pb2`'s human gate stays exactly as strict as it is.
2. **The actor must be honest.** D81 (`docs/DECISIONS.md:99`) already decided this exact case:
   *"Việc đến từ người **không có account** (HR/Accounting qua link…) không được ghi actor rỗng và
   không được mạo danh một user nội bộ: ghi `actor_external = {kind, label, ref}`"*. **But
   `checklist_item_history` has no `actor_external` column** — V097's `CREATE TABLE` has only
   `changed_by VARCHAR(255) NOT NULL`. So the mirror needs either that column or a reserved sentinel
   documented in the migration. A human user id must never be minted for it.
3. **It must be visibly a mirror in the read.** Onboarding reading "HR completed this" needs to be able
   to tell "Yến clicked it here" from "HR's app said so". Otherwise the ledger D45/V097 exists to
   arbitrate answers a question with a value it cannot vouch for.

**Recommendation:** build the mirror, scope it to `HR_COMPLETE` only, behind the same dark-ship flag
discipline as `recruit.features.hr-handoff-publish`, and land it **after** the read surface exists
(§3) so its first effect is visible rather than invisible.

---

## 2. BLOCKER — re-seeding to a fourth trigger makes `mandatory` a silent no-op on that item

`CandidateServiceImpl.blockingMandatoryChecklistItems` — the entire Q12 "100% onboarded" computation —
reads **only two triggers**:

```
CandidateServiceImpl.java:761   activeByTrigger(ChecklistTemplateTrigger.ON_ENTER_S6)
CandidateServiceImpl.java:764   activeByTrigger(ChecklistTemplateTrigger.PER_SPONSOR_STATE)
```

`ON_100_ONBOARDED` is excluded — correctly, it is post-S7 work. **A new `ON_HR_COMPLETE` would be
excluded too**, because the method enumerates triggers explicitly rather than filtering by mandatory
across all of them. So after plan step 4, a department that flips `mandatory = true` on
`ONB_SETUP_CALL` via `CHECKLIST_TEMPLATE_MANAGE_ONBOARDING` gets **no effect and no error**.

That is precisely the defect V067's own header says this whole feature exists to fix:

> `V067__checklist_templates.sql:3-5` — *"Re-ports a design the old system already had right
> (AssociateTodoSetting -> AssociateToDo), whose only flaw was that its `mandatory` flag was never
> wired into a completion computation (Q12 fixes exactly that in code…)"*

And the setup call is not an optional nicety — it is **one of the three conditions for 100%** in the
business definition, stated independently by both stakeholders:

- **Miley, 33:08** (`docs/transcripts/extract/onboarding-miley-2026-08-17.md:405`) — *"It doesn't go
  straight to 100%. HR has to change this one, and this one has to change to approved, only then can it
  become 100%… plus that setup call as well."* → **33:23** *"Right. It takes three steps."*
- **Yến, 55:11** (`docs/transcripts/extract/hr-yenvu-2026-08-06.md:275`), explicitly correcting her own
  earlier two-condition statement at 22:48 — *"The condition for 100% is three things. First Completed,
  then Sponsored, plus it must have 'setup coding' too… all three statuses from three teams are needed."*
- Legacy code agrees: `LORecruiting.java:741-746`, quoted at `docs/FEEDBACK/03-hr.md:48-53` —
  `nmls_status == sponsored && hr_status == completed && onboarding_meeting_status == setup_done`
  is the **only** place in the old server that writes `joined`.

**Required change:** step 2/4 must be accompanied by adding the new trigger to
`blockingMandatoryChecklistItems`, **or** the setup call must stay on a trigger the gate already reads.
See §4 for which.

---

## 3. MAJOR — the plan does not reach Onboarding's stated pain

**Answer to question 3: it stops at least two steps short, and the last one is not a step this plan takes.**

- **`recruit-fe` has no checklist UI at all.** On `origin/master`,
  `git grep -rn "checklist-items\|/checklists" -- src` returns **nothing**; the single "checklist" hit is
  an unrelated session-local comment at
  `recruit-fe:src/app/[locale]/(private)/today/_components/FocusClient/index.tsx:57`. So even the
  `5pb2` write path shipped without a button. A persisted `hr_status` surfaces **nowhere**.
- `ChecklistController` returns `ChecklistItemEntity` rows
  (`/candidates/{id}/checklist-items`, `/checklist/departments/{d}/items`,
  `/checklist/departments/{d}/candidates`). None of them carries candidate-level HR status; a new
  `candidates.hr_status` column would need explicit addition to the candidate read as well.
- **And `hr_status` is the wrong granularity for what was asked.** Victoria's request
  (`onboarding-miley-2026-08-17.md:570`, item #94, **Victoria 1:26:10**) is: *"you need to give us, or
  figure out how, so the onboarding specialists can see **how far HR has got and which tasks they've
  done**."* `hr_status` has three values and cannot answer "which tasks". The thing that answers
  "which tasks" is `checklist_items` — which is already readable (`CHECKLIST_READ` granted to all four
  department roles + MANAGER, V097 §3) and simply has no screen.

The highest-value item in this whole area is **not** in the plan: render
`GET /candidates/{id}/checklist-items` on the candidate page. That alone answers #94. `hr_status`
answers a narrower question that nobody asked in those words.

---

## 4. MAJOR — Gap B's premise is sound (stronger than stated), but the plan's fix is not the one this repo already chose

**Which record is better evidence?** `EVIDENCE.md` wins, decisively, and it is not alone:

| Record | Says | Weight |
|---|---|---|
| `docs/EVIDENCE.md:109` | `HR Completed → ticket 14 (Setup Call)` listed **separately** from `100% onboarded → ticket 08-HR + 00-LO Support` | Read off the production Automation-configuration PDF, 12/08 |
| Miley 27:04 (`:369`) | *"When they set complete, it sends a ticket to us saying this LO needs a setup call."* | Live stakeholder, 17/08 |
| Victoria 26:08 (`:383`) + 27:28 (`:389`) | setup call is *"one more step before we can reach 100% onboarded"* | Live stakeholder |
| Yến 55:11 (`:275`) | 100% = Completed + Sponsored + setup call — three teams | Live stakeholder, 06/08 |
| Legacy code `LORecruiting.java:741-746` | `setup_done` is **inside** the `joined` gate | Running code |
| `V067` seed comment | *"Old ticket 14 — Setup Call, fired on 100% onboarded"* | One sentence, self-contradictory |

V067's `ON_100_ONBOARDED` block header reads *"old ticket 08 HR + 00 LO Support (training; assign
Support Specialist/Processor), **EVIDENCE §5**"* — it names the ticket-08/00 rule and cites the very line
that lists ticket 14 under a *different* trigger, then inserts ticket 14 into the block anyway. That is a
miscopy with a citation trail, not a considered divergence. **Gap B is real.**

**But `ON_HR_COMPLETE` is not the fix this repo had already reasoned its way to.**
`docs/FEEDBACK/02-onboarding.md:248-253` proposes, for the new app:

> *"Setup Call = **checklist item cuối của S6**, owner = Recruiting, máy TỰ mở khi các item của
> Licensing/HR/IT/Accounting xong … Confirm xong → checklist 100% → tự chuyển Active (S7) — đúng cổng hệ
> cũ đang dùng (`sponsored + hr completed + setup done`)"*
>
> and, at `:253`: *"story S7 hiện ghi 'Checklist 100% → tự chuyển Active' nhưng checklist S6 **chưa vẽ item
> Setup Call của Recruiting** — thêm vào hàng đợi sửa mockup."*

Putting the item **inside S6** keeps it on `ON_ENTER_S6` — a trigger `blockingMandatoryChecklistItems`
already reads — which fixes §2 for free and makes the item eligible to become the third gate the business
actually describes. `ON_HR_COMPLETE` changes *when the row appears*; `ON_ENTER_S6` + mandatory changes
*whether it counts*. Only the second is a business fact.

**Recommended replacement for steps 2-4:** move `ONB_SETUP_CALL` to `ON_ENTER_S6`. If "appears too early
in the queue" is a real complaint, that is a *sort/visibility* concern for the (not yet existing) UI, not
a reason to invent a fourth trigger that the completion computation cannot see. If the team still wants
`ON_HR_COMPLETE` for queue hygiene, it is acceptable **only** bundled with the
`blockingMandatoryChecklistItems` change.

---

## 5. MAJOR — "no seat for HR" is RIGHT, and the HR extract supports it better than D77 does

I went looking for work only recruit can serve. There is none in Yến's walkthrough — every artifact she
inspects lives in the HR/MOSO system:

- **Yến, 43:21** (`hr-yenvu-2026-08-06.md:967-968`) — moving an LO to Completed is *"three steps. Check the
  avatar, check the document… and check the to-dos… **all checked by eye, going into each and every
  person**."* All three are rendered in the system she is sharing, which is MOSO/HR, not recruit.
- **Yến, 44:21** (`:977`) — *"don't worry about the avatar, because when they log into the system it's
  already a required field"* — the avatar is enforced at LO first login **in that system**.
- **Yến, 41:20** (`:933`) — *"The document part is also one of the HR checklist items"* — again, theirs.
- **chị Phương, 46:30** (`:1001`) — *"this HR document has to sit on Hân's HR side… that side doesn't even
  need any button; it will read the documents itself… and change the status itself."*
- **Bảo, 47:39** (`:994`) — the intended contract, in his own words: *"just two columns: are the documents
  complete, yes/no; and are the to-dos complete, yes/no; if both are yes then change the status."*

So the brief's worry — *"if HR must visually check an avatar and documents that live in recruit, 'no seat'
may be wrong"* — does not apply: they do not live in recruit. D77 holds, D78's asymmetry (Onboarding gets a
seat because it has no other app) is consistent, and the plan does not cement a mistake here.

**One caveat worth naming to the user:** the contract Bảo described is *two booleans and a computed status*.
`hr_status` is the **output** of that computation as HR's app happens to spell it today. Consuming it is
right; treating it as ground truth about HR's checklist is not (see §1, `03-hr.md:208-211`).

---

## 6. MAJOR — sequencing: the brief's risk is backwards, and there is a different one

**The brief's worry does not materialise.** `ONB_SETUP_CALL` is seeded `department = 'ONBOARDING'` (V067),
and `ONBOARDING` holds `CHECKLIST_ITEM_MANAGE_ONBOARDING` (`V097:63-64`) on top of its D78 narrow seat.
So the setup-call item **is closable today**. Moving it earlier does not add an unclosable row to anyone's
queue; it adds a closable row to the queue of the one department that can close it. Onboarding's queue does
not get worse.

**The real sequencing risk is `hr_status` moving backwards.** `docs/FEEDBACK/03-hr.md:79` records that the
legacy auto-rule is *"edge-triggered và **không tự thu hồi**"* — it fires on the edge and never revokes, so
production already contains rows where `Status = 100% onboarded` while `hr_status ≠ HR completed`.
`ChecklistGeneratorImpl.generateFlat` is idempotent per `(candidate, template_code)` via
`ChecklistSlices.forCandidateAndTemplate`, so a `completed → onboarding → completed` bounce creates no
duplicate row — but it also will not re-open an item someone already closed, and the mirror in §1 must
decide explicitly whether a downgrade re-opens `HR_COMPLETE`. Silence here becomes a bug report later.

**Safe order:**

1. Persist `hr_status` as the **three-value enum**, not a boolean, and expose it on the candidate read.
2. Ship a checklist read surface in `recruit-fe` (§3) — this is what Onboarding actually asked for.
3. Move `ONB_SETUP_CALL` onto a trigger the S7 gate reads (§4); if a new trigger is used, extend
   `blockingMandatoryChecklistItems` **in the same commit**.
4. The `HR_COMPLETE` mirror last, flag-dark, non-human actor, with the downgrade behaviour written down.

Nothing in this order requires flipping `mandatory` — correctly deferred.

---

## 7. What this plan does NOT fix that the user will expect it to

The user has approved four mitigations and will read the result as "the checklist feature is finished".
It will not be. Specifically:

1. **HR checklist items still cannot be closed by HR.** Steps 1-4 do not touch this (§1). Today an ADMIN
   can close them; no HR person can.
2. **There is still no screen.** No checklist UI exists anywhere in `recruit-fe`. Every capability shipped
   by `5pb2` and by this plan is API-only.
3. **The S6→S7 gate still blocks nothing.** Every template is `mandatory = FALSE` (V067 header) and the
   user has explicitly decided not to flip it. `100% onboarded` therefore remains a hand-driven stage move
   — the exact legacy defect (2,603 rows off a free dropdown) that Q12 was written against.
4. **`checklist-items` does not advance the stage.** `ChecklistController.changeStatus` javadoc: *"This does
   NOT advance the candidate's stage, even when it closes the last open item. The S6 to S7 move stays an
   explicit human action."* Closing every item changes no status anywhere.
5. **The setup call still is not one of the three conditions for 100%** — and after step 4 as written, it
   becomes *impossible* to make it one without a code change (§2).
6. **Licensing progress is still invisible in the same way HR's is.** Miley's complaint names *both*
   (`:422`: *"Onboarding has no permission over HR/Licensing tasks and, today, no visibility into their
   progress"*). This plan addresses neither's visibility; `hr_status` is one string about one department.
7. **No e-sign / document verification.** `03-hr.md:6` measures it: `recruit-be` has only a stub
   (`offer/controller/OfferController.java:69`, `offer/service/impl/OfferServiceImpl.java:95`
   `TODO(document-esign)`), so "documents complete" — half of Bảo's two-column contract — has no source.

---

## 8. Alternatives the plan missed

**There is a fourth, and for the `HR_COMPLETE` fact specifically it may dominate — but it needs one
question answered first.**

- **ai-hr-be's Pub/Sub associate feed** (`tera-docs:origin/master:hr/pub-sub-associate.md`). HR already
  publishes `HR_ASSOCIATE_ONBOARD` / `_ROLE` / `_UPDATE` / `_DEACTIVE`, committed-then-published in the same
  transaction as the change, at-least-once with `event_id` dedup. recruit already talks to ai-hr-be in the
  other direction (`hr_handoff_outbox`, V079, `RECRUIT_HIRED`). Strictly more reliable than a status string
  riding a MOSO row-mirror webhook.
  **Why it is not a drop-in:** none of the four documented events is "HR onboarding complete".
  `associate.onboarded` fires when the employee record is created, which per `03-hr.md:202` corresponds to
  the **`HR onboarding`** rung, not **`HR completed`**. So the feed is the better *channel* but does not
  today carry the *fact*. **Action: ask ai-hr-be whether an `associate.*` event exists or can be added for
  the HR-complete transition before committing to the MOSO string.** If yes, build on it.
- **`hr_handoff_outbox` — not viable, correctly not chosen.** It is recruit→HR *outbound* at S6, one row per
  hire, 0 PII at rest, fires at most once ever per candidate (`HrHandoffEnqueuer` javadoc, `handedOffAt`
  guard), and is deliberately unreachable from the MOSO ingest paths. It carries nothing about HR's progress.
- **`ct-hr-complete` as a source — category error.** It is the item to be *closed*; it cannot be the signal
  that closes itself.
- **Onboarding closes HR items on their behalf — correctly rejected**, and for a reason the plan did not
  state: with no staff table there is no way to derive which department a past `completed_by` belonged to,
  so the narrowing direction is unrecoverable (`V097:55-58`). Once Onboarding is allowed to close HR rows,
  the audit trail can never be un-muddied.

---

## 9. Findings, ranked

| Rank | Finding | Where |
|---|---|---|
| **BLOCKER** | Persisting `hr_status` closes no checklist item; both write paths demand a logged-in human (`getCurrentUserId(true)`). Gap A is untouched by all four steps. | §1 |
| **BLOCKER** | A new `ON_HR_COMPLETE` trigger is invisible to `blockingMandatoryChecklistItems` (which enumerates only `ON_ENTER_S6` + `PER_SPONSOR_STATE`), so `mandatory` on the setup call becomes a silent no-op — re-creating the exact defect V067 says Q12 exists to fix. | §2 |
| MAJOR | Nothing surfaces `hr_status`: `recruit-fe` has zero checklist UI, and `hr_status` cannot answer "which tasks" — which is literally what Victoria asked for (1:26:10). | §3 |
| MAJOR | Gap B's premise is sound and better-evidenced than the brief claims (EVIDENCE + 2 interviews + legacy code vs one seed comment) — but the repo's own `02-onboarding.md:248-253` already chose a different, better fix: setup call as the last **S6** item. | §4 |
| MAJOR | Sequencing: the brief's risk does not exist (`ONB_SETUP_CALL` is `ONBOARDING`-owned and closable today); the real one is `hr_status` moving backwards, which the plan does not address. | §6 |
| MAJOR | The Pub/Sub associate feed is a fourth option the plan missed; it needs one question to HR before being ruled in or out. | §8 |
| MINOR | Step 1 must persist the **enum**, not extend the boolean: `hrRunning` collapses `onboarding` and `completed` into one bit (`MosoRowMapper.java:799-802`, used at `:517` and `:753`). The brief's "reads it into a boolean and discards it" is otherwise accurate, and "MOSO sends it on every webhook" is true — the webhook payload is the same property map `ExportLORecruitingForMigrationOp` exports (`MosoWebhookHandler` javadoc). | — |
| MINOR | `checklist_item_history` has no `actor_external` column, so D81's seatless-channel contract cannot be honoured by the mirror without a schema addition or a documented sentinel. | §1 |
| MINOR | Ownership wording drift: V067 seeds `ONB_SETUP_CALL` as `ONBOARDING`, `02-onboarding.md:250` says "owner = Recruiting". Same team post-merge (Victoria heads merged Recruiting + Onboarding-Specialist, `hr-yenvu:71`) — no action, but do not let a later change split them. | — |

---

## 10. Changes required before implementing

1. **Add a fifth step** — a mirror path that closes `HR_COMPLETE` only, scoped by `template_code`, not
   routed through `CHECKLIST_ITEM_MANAGE_HR`, with a non-human, non-empty, non-impersonating actor, and an
   explicit written decision on what a backwards `hr_status` does. Without this, Gap A is not closed and
   the plan should not be described as closing it.
2. **Replace step 4** — put `ONB_SETUP_CALL` on `ON_ENTER_S6` (preferred, per `02-onboarding.md:248-253`).
   If `ON_HR_COMPLETE` is kept, it must ship in the same commit as an extension of
   `CandidateServiceImpl.blockingMandatoryChecklistItems`.
3. **Amend step 1** — persist the three-value `hr_status`, not the existing boolean, and add it to the
   candidate read response.
4. **Add a step 0** — ask ai-hr-be whether an `associate.*` event covers the HR-complete transition (§8).
   A yes changes the source of truth for the whole feature and is cheap to ask now, expensive to retrofit.
5. **Say plainly to the user** what §7 lists — in particular that there is still no screen, and that the
   S6→S7 gate still blocks nothing by design.

The two decisions taken with the user — **no seat for HR**, and **do not flip `mandatory` yet** — are both
correct and should stand unchanged.
