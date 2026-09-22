# Recruit app — gap analysis: code vs. documents vs. transcripts

Date: 2026-09-22 · Measured against `origin/master` after `git fetch`
(recruit-be `a689126`, recruit-fe `34a7acb`, omni-service `65bb958`)

Sources: four stakeholder transcripts in this directory, six parallel extraction agents
(`extract/`), the beads tracker (404 issues, 368 open), `docs/`, and Claude memory.

---

## §0 — Verification standard used here

Every "EXISTS" line points at the place that actually **runs**, not the place that
declares. That distinction cost three wrong conclusions during this analysis:

1. `cadence.tiers` settings exist → concluded follow-up cadence works. **Wrong**: the
   only `SequenceSender` implementation is `NoOpSequenceSenderImpl`, a logging stub that
   returns success.
2. `V035__hollow_table_warnings.sql` lists 7 empty tables → quoted as current. **Wrong**:
   dated 27/08; bead `agentflow-lems` filled 4 of them and closed 30/08. The warning file
   was never updated and now misstates 4 rows.
3. `grep '@Table(name = "checklist_items")'` returned 0 → concluded table is hollow.
   **Wrong**: the code writes `@Table(name = ChecklistItemEntity.TABLE_NAME)`. A grep
   miss is not an absence proof.

Rule applied from that point on: a capability is EXISTS only with a runtime call path.
Repo documentation — including its own warning files — is treated as a **dated claim**,
never as current state.

---

## §1 — The finding that reframes everything

### recruit-be cannot send a message. Any message.

`grep -rniE "sendEmail|sendMail|MailSender|JavaMail|smtp|SendGrid|Twilio|sendSms"`
over `src/main/java` returns **2 hits, both inside comments** explaining that SendGrid
lives on moso-notifier's side. `build.gradle.kts` declares no mail dependency.
`V085__invite_status_settings.sql:14` states it plainly: *"no working email transport
in recruit-be"*.

Consequence: every "send" in the system is one of
- an outbox row that nothing delivers,
- a stub that logs "would send" and reports success (`NoOpSequenceSenderImpl`),
- or a human clicking a button to record that something happened elsewhere.

This single fact invalidates a large share of what the transcripts ask for: follow-up
automation, cadence, templates-on-send, invite emails, rejection emails, reminder
emails. The engines are built. The pipe is not connected.

**The blocker is external**, and it was already named by the CEO:

> **Thuận @ 13/08, directive #25** — do not build chat; plug in Khải's omni-channel service.

> `NoOpSequenceSenderImpl` javadoc — *"the real omni/email sender is deferred (needs
> Khải/omni, COMM-STACK-RESEARCH.md §4)"*

Same dependency, stated six weeks apart, still open. It cannot be shortened by writing
code faster.

### Production is darker than staging by configuration

`deploy/configs/values-prod.yaml` carries **9 env vars**; `values-sta.yaml` carries 18.

| Integration | staging | production |
|---|---|---|
| `RECRUIT_FOLLOWUP_*` | 4 vars | **0 — dark** |
| `PUBSUB_PROVIDER` | 1 | **0 — dark** |
| `PACKS_*` | 1 | **0 — dark** |
| `RECRUIT_WEBINAR_BASE_URL` | 1 | **0 — dark** |

With `PUBSUB_PROVIDER` unset, cron registration is dropped by the no-op publisher and
`cron-service-go` never learns the jobs exist — so every cron tick (sequence, HR handoff,
packs writeback) is inert on production. Staging's own comment documents this:
*"values-prod.yaml carries no RECRUIT_FOLLOWUP_* at all… next_follow_up_at is NULL"*.

### The onboarding pipeline has no working completion — CORRECTED 23/09

An earlier version of this section claimed **"S6→S7 is unreachable through the API"**. Two
independent reviewers both found that false, and they are right. The corrected finding is
different and arguably worse.

**What is true:** `ChecklistItemService` exposes three methods, all reads. The only two writers
set `OPEN` (`ChecklistGeneratorImpl:52`, `LicensingItemGeneratorImpl:105`). Both reviewers swept
for any other path — MOSO import, batch jobs, webhooks, tests — and found none. **Nothing
anywhere sets `DONE`.**

**What was wrong:** the gate does not therefore block. `blockingMandatoryChecklistItems`
(`CandidateServiceImpl:747-770`) only counts items whose template is `mandatory`, and
**every seeded template ships `mandatory = FALSE`** (`V067:7-14`, `:57-137`) — deliberately, as a
dark-ship split. So the gate returns empty and S6→S7 **goes through today**. Three further routes
exist: the D35 override (`:630`), the kill switch `onboarding.completion_requires_mandatory`
(`:757`), and the MOSO import writing S7 directly (`MosoRowMapper:738`).

**The real problem, stated correctly:**

> "100% onboarded" is currently reachable **vacuously**. The gate exists, reads the right
> column, and blocks nothing — so a candidate can reach S7 without any department having
> finished anything, and no department *could* finish anything even if it wanted to.

This reproduces the legacy hole the new system was built to close. The code's own comment names
that hole: *"the legacy hole: 2,603 rows marked '100% onboarded' off a free dropdown"*
(`CandidateServiceImpl:749`). The new system replaced a free dropdown with a computed gate, then
shipped the gate inert.

Closing it needs **two** changes, and they are separate decisions:
1. **A write path to `DONE`** — this bead (`agentflow-5pb2`).
2. **Flipping the right templates to `mandatory = true`** — a business decision for Yến/Miley,
   not an engineering one. Filed separately.

**A third problem, for the BA.** The business definition of 100% onboarded — HR complete +
sponsorship approved + `setup call` (§6) — **cannot be expressed by this gate at all.** The
setup-call template `ONB_SETUP_CALL` is an `ON_100_ONBOARDED` trigger (`V067:132`), meaning it is
created *after* S7, while the gate reads only `ON_ENTER_S6` and `PER_SPONSOR_STATE`
(`:760-766`). The third gate is therefore downstream of the thing it is supposed to gate. That
ordering contradiction needs a BA decision before the model can match the business.

## §2 — Gap matrix

Legend: ✅ runs · 🟡 partial (says what's missing) · ❌ absent · 🔌 built but unwired

### 2.1 Recruiting (Victoria / Brian) — mostly built

| Ask | State | Evidence |
|---|---|---|
| Manual claim of a lead | ✅ | `BatchClaimService`, `capacity.max_open_candidates` |
| Multiple labels per lead | ✅ | `label` module, V027 |
| Notes, audit log | ✅ | `audit` module, FE `/audit` |
| Message templates (EMAIL/SMS/CALL_SCRIPT) | ✅ | `TemplateType`, FE `/templates`, DRAFT→ACTIVE lifecycle |
| Click-to-call via Zoom Phone | ✅ | Zoom deep link + call history |
| Per-lead conversation view | ✅ | `/candidates/{id}/conversation`, FE per-lead omni |
| Offer approval gate before payment (BE) | ✅ | `OfferApprovalRuleImpl`, `loans_since_min=5` AND `loans_12mo_min=2`, V083 |
| Offer approval gate (UI) | ❌ | `useApproveOffer`/`useDeclineOffer`/… exist in `offers.api.ts:61-108` with **zero call sites**. `OFFER_APPROVE` gates five endpoints that have **no screen** |
| Follow-up cadence 1/5/7/30 | 🔌 | settings + engine + cron exist; sender is a stub |
| SLA first-touch clock | 🟡 | computed and rendered; `sla.no_claim_escalate_minutes` has **no consumer**. A breach is a red pixel |
| Automatic reassignment on SLA breach | ❌ | `sla_policies` (with `escalation JSONB` "who gets pinged") hollow |
| Auto-assign / round-robin / capacity | ❌ | `routing_rules` hollow — 0 entity, 0 references. Confirmed by four independent methods |
| Cross-lead inbound inbox | 🟡 | `/api/v1/inbox/*` is a **naming trap** — returns unclaimed *candidates*, not messages. FE `/conversations` lists candidates by `lastOutboundAt`, no message body, no unread state |
| Past-due follow-up filter + day-graded highlight | 🟡 | badge is a 3-way bucket, not a magnitude; filter allowlist has no due-date predicate |
| Per-recruiter production metrics | 🟡 | `RecruiterReportRow` has no loan/volume field |
| CSV export | ❌ | no CSV library on the classpath, no `Content-Disposition` anywhere |
| Webinar attendance import | ❌ | zero hits for `attendance\|attended`; **no file input exists anywhere in the FE** |
| NMLS lookup by a recruiter | 🟡 | enrichment only if Modex **pushes**; no outbound client, no base URL, no credential |
| Employment history | ❌ | not modelled |

### 2.2 Onboarding / HR / Licensing — backend built, no UI, no completion

| Ask | State | Evidence |
|---|---|---|
| Checklist items per department | 🟡 | entity + generator + controller + facade exist (11 files); **no completion path** |
| Licensing state rules | ✅ BE / ❌ FE | `LicensingStateRuleEntity`, admin CRUD shipped in #330; **0 FE files call it** |
| Sponsorships per state | ✅ BE / ❌ FE | `SponsorshipEntity`, `/admin/sponsorships`; FE has types + state constants only, no screen |
| Checklist template admin | ✅ BE / ❌ FE | `/api/v1/admin/checklist/templates`; **0 FE files** |
| Import UI | ❌ | zero `FileInput`/`Dropzone`/`type="file"` in the whole app |
| HR handoff to ai-hr-be | 🔌 | outbox + cron + PubSub publisher exist; dark on prod; `candidates.account_id` NULL on every row |
| E-signature | ❌ | one TODO at `OfferServiceImpl.java:297`; no client, no envelope id. `POST /offers/{id}/signed` is a self-described *"manual stub for the e-sign webhook"* |
| Payment / PayPal | ❌ | `POST /offers/{id}/fee-paid` is a human clicking a button; nothing collects or reconciles money |
| Onboarding step tracker UI | ❌ | only a 3-milestone card; its own comment says the rest have no backend source |
| `brand` / brand-manager routing | ❌ | grep across `src/main` finds only the English phrase "a brand-new row". Field does not exist |

### 2.3 Still-hollow tables (measured today, not from V035)

| Table | Verdict |
|---|---|
| `routing_rules` | ❌ 0 entity / 0 refs. Correct home for an **onboarding** hand-off rotation (§5 #10); **not** for recruiter lead intake |
| `sla_policies` | ❌ 0 entity / 0 refs — carries the `escalation` column |
| `comp_bands` | ❌ 0 entity / 0 refs |
| `referrals` | ❌ 0 entity / 0 refs — referral bonus payout |
| `checklist_items`, `sponsorships`, `licensing_state_rules`, `stage_requirements` | ✅ now live (`lems` closed 30/08) — **V035 is stale about these four** |

---

## §3 — CEO directives (13/08) vs. what the code does

**50 HARD directives** (revised up from 44 after the extract was rebuilt with a
Vietnamese strength-marker table: `phải`/`cần`/`đừng có`/`anh muốn` → HARD, versus
`có thể`/`chắc`/`thử`/`tùy em` → PREFERENCE, so each rating traces to the words, not the tone).
The ones that contradict current build direction matter most.

| # | Directive (Thuận, 13/08) | Code today |
|---|---|---|
| 25 | Do not build chat — integrate Khải's omni | Respected; and it is now the top blocker |
| 44 | Split HOT (inbound unassigned) and cold into two pages | ✅ `/inbox/hot` + `/inbox/cold` |
| 16 | Add a Pipeline page (everything by stage) | ✅ `/pipeline` |
| 18 | Rename "kho" → "Today" | ✅ `/today` |
| 19 | Kanban cards don't scale — use a table | ✅ table-based |
| 6 | UI in English, not Vietnamese | 🟡 both locales shipped |
| 13 | Modex fetch is a task, not a pipeline status | needs check against `CandidateStage` |
| 10 | Pull Modex **before** calling, not after | ❌ no outbound Modex client exists at all |
| 41 | Call-SLA timers admin-configurable **per team** | ❌ SLA reads global `recruit_settings`; `sla_policies` hollow |
| 38 | Auto-create the employee account on the 3-condition gate | 🔌 HR handoff built, dark on prod, `account_id` never linked back |
| 34/36 | Workload rebalance is **peer-to-peer self-serve**, not a manager function | 🟡 transfer endpoints exist; no peer-to-peer UI |
| 47 | Add a new "loan officer recruiter" role; retitle current recruiters as customer service | ⚠️ **my earlier "not seeded" was FALSE** — `OFFICER_RECRUITER` and `LO_SUPPORT` are both seeded in `V036__seed_kho_roles.sql`. What is genuinely absent is the **retitle**: D46/D86 add the new roles but state *"RECRUITER không thành legacy, không migrate ai"*. And no source says Victoria was told, which the CEO asked for |
| C4 | ILO and RLO must stay **two separate pages** | ⚠️ contradicts the merge-into-one-table design Bảo demoed |

### Timeline — corrected 2026-09-22

The Victoria transcript was initially mis-dated 2026-09-22 (the date it was pasted into the
session, not the date of the meeting). The real order, confirmed by the user and corroborated
inside the transcripts themselves:

| # | Date | Meeting |
|---|---|---|
| 1 | **2026-08-05** | Recruiting — Victoria + Brian + Benjamin |
| 2 | 2026-08-06 | HR — Yến |
| 3 | 2026-08-11 | Licensing — Ý |
| 4 | **2026-08-13** | Demo + feedback to Thuận (CEO) |
| 5 | 2026-08-17 | Onboarding — Miley + Victoria alone |

A fifth walkthrough, **Licensing (Ý), 2026-08-11**, was transcribed separately with whisper and
lands as `2026-08-11_y_licensing-walkthrough.md`. **Quality is uneven** — the 0:00–9:00
sponsorship mechanics are sentence-level quotable; ~23:00–24:00 and ~35:15–36:00 are mush and are
gist-only. Never apply one verdict to that whole file. `NMLS` never appears correctly in it
(9× NMS, 2× NUS, 1× NL, 1× NOS, zero clean) — cite NMLS from the Zoom transcripts instead.

Corroboration: on 13/08 the team states it has met Victoria+Brian, Yến and Ý, and has **not
yet** met onboarding — *"còn mấy team phía sau như onboarding… tụi em chưa có mic được với
họ"* (0:34).

**Settled 23/09 against `recruit-be/docs/FEEDBACK/`, which dates the same meetings differently**
(HR 12/08, onboarding 24/08, licensing 27/08). Those are **not meeting dates** — they are the
timestamps of Bao's retelling message for each one; the licensing file opens *"tôi đã gặp team
đó"* ("I have met that team"). The README then filed those timestamps under a column headed
"Ngày họp". Content matches point for point, so these are the same five meetings and **there are
no hidden extra ones**. Deciding evidence: on 06/08 Bảo calls the recruiting session *"tối hôm
qua"* (53:21); the CEO mockup commit `76880a9` is stamped 13/08 11:29 and titled "idea CEO 13/08";
and the 17/08 recording still shows HOT/COLD on one page, a split only decided as D46 on 22/08.

The repo's README should say the earlier dates were a reconstruction error rather than leave two
sets standing unannotated — a reconstruction's dates are the ones more likely to be wrong.

### What that ordering means — this reverses an earlier reading

An earlier draft of this document said the team kept gathering Victoria's habits for six weeks
*after* the CEO told them to stop. **That was wrong, and backwards.**

Correct reading: the Victoria walkthrough came **first** (05/08). A design was derived from it.
On **13/08** the CEO saw that design demoed and rejected its premise:

> **Thuận @ 30:49** — *"cái lỗi của em là tối ngày em cứ nghe lời chị Recruiter chị Victoria em
> build theo ý của họ là em chết ngắc rồi… chị Victoria cũng không có giỏi… chỉ làm theo quán tính"*

> **Thuận @ 1:09:35** — *"Không cái đó cũng không đúng. Anh đã nói em rồi, cái kiến thức của
> Victoria không phải lúc nào cũng đúng."*

So this is not a team ignoring its CEO. It is **discovery working as intended**: interview the
users, build a design, show it to the decision-maker, get the premise corrected.

The operative consequence is about **precedence, not blame**:

> Where the 05/08 Recruiting requirements and the 13/08 CEO directives disagree, **13/08 wins**
> — it is both later in time and first-hand, whereas the CEO's position inside the 05/08 meeting
> exists only as a second-hand relay by Phụng and Benjamin.

---

## §4 — Identity: CONFIRMED, and the auto-assign conflict resolves

**Antoine ≡ Thuận — confirmed by the user, 2026-09-22.** "Antoine" is the CEO's Western business
name, used in English-language meetings; the Vietnamese transcripts call the same person "anh
Thuận". This closes the question every "Victoria vs the CEO" entry depended on.

### C-001 (auto-assign) — reclassified type C, and resolved

Not a standing disagreement between two people. A **stale relay**, settled by date:

| Date | Source | Position |
|---|---|---|
| 05/08 | Phụng and Benjamin, **relaying** the CEO | The system should auto-assign by workload/capacity, because you cannot rely on people picking work up |
| 13/08 | **Thuận, first-hand** | *"nhân viên phải tự quản lý cái công việc của mình"* (1:10:16) · *"Tại sao phải để cho manager nhảy vô giúp?"* (1:10:44) · rejects the manager-driven workload feature outright: *"Không cái đó cũng không đúng"* (1:09:35) |

The 13/08 statement is **later and first-hand**; the 05/08 one is **earlier and second-hand**.
Both tests point the same way.

**Resolution:** the CEO's recorded position is claim-first, with peer-to-peer self-serve
reassignment and manager involvement reserved for absence. That is *closer to Victoria's
practice* than to round-robin. Victoria and the CEO were never opposed on this; the opposition
was an artefact of the relay.

**Therefore `routing_rules` should stay hollow.** Building round-robin would implement the
second-hand version and contradict the first-hand one. What the directives DO call for, and
what does not exist:

- peer-to-peer self-serve reassignment by a recruiter, no manager (CEO-D36)
- a manager absence-coverage screen — view an absent employee's queue, work it or bulk reassign (CEO-D37)
- SLA timers configurable **per team** (CEO-D43 — *not* D41, which is company-email automation) — today SLA is global `recruit_settings`, and
  `sla_policies` is hollow

> ⚠️ **Numbering collision — use the `CEO-` prefix.** `D36`, `D37` and `D41` are already taken in
> `recruit-be/docs/DECISIONS.md` by unrelated decisions (activity-feed visibility, offer comp
> snapshot, and the `block_display` migration). Three numbering schemes for the CEO's directives
> are in circulation; anyone cross-referencing a bare `D41` will land on the wrong decision.

One thing survives from 05/08 regardless: Victoria, Brian and Benjamin converged on
**SLA-triggered release when a claimed lead sees no real activity**. That is compatible with the
CEO's position — the system is not choosing an owner, it is releasing work nobody touched. It
remains unbuilt (§2.1).

## §5 — What to do, in order

Ranked by *blocking factor removed per unit of work*, not by feature size.

### Tier 0 — unblocks the most, cannot be accelerated by coding

1. **Close the Khải/omni integration.** It gates outbound email+SMS, follow-up automation,
   cadence, template-on-send, and the real Conversations surface. It is a dependency
   negotiation, not a coding task, so it must start first and in parallel with everything
   below. CEO directive #25 already authorises it.
2. **Turn production on.** Prod carries half of staging's config. Follow-ups, pubsub, packs
   and webinar are dark by omission, not by decision. Verify each intentionally, then set it.

### Tier 1 — cheap, high leverage, no new backend

3. **Checklist completion path.** Add write methods to `ChecklistItemService` (set DONE,
   `completed_by`, `assignee_id`). Without this the onboarding pipeline cannot terminate and
   the onboarding pipeline cannot terminate. (It no longer blocks S6→S7 — see §1: the gate is
   inert because every template ships `mandatory=FALSE`, so S7 is reachable *vacuously* today.
   **Shipped 23/09** as `agentflow-5pb2`, PR #392.)
4. **Offer approve/reject screen.** Six hooks already exist with zero call sites and a
   permission already gates them. This is UI-only work against a finished, tested backend —
   and it is the exact ask Brian escalated (LOs paying before approval, then needing refunds).
5. **Onboarding / HR / Licensing admin screens.** `/admin/checklist/templates`,
   `/admin/licensing/state-rules`, `/admin/sponsorships` all run with **no UI whatsoever**.
   Three departments are blocked by the thinnest possible layer.

### Tier 2 — real new work, ordered by who is blocked

6. Import UI + webinar attendance import (Brian does this by hand today; no file input
   exists anywhere in the FE).
7. Cross-lead inbound inbox — a real one. Today `/inbox` returns candidates, not messages.
   Depends on Tier 0 item 1.
8. Outbound Modex lookup (CEO directive #10 — pull before calling). No client exists.
9. CSV export (no library on the classpath).

### Tier 3 — blocked on a human decision, do not build yet

10. **Auto-assign — CORRECTED 23/09. The earlier "do not build it at all" was WRONG.**
    It is two different asks and I collapsed them.

    **For RECRUITERS — do not build round-robin.** C-001 stands (§4): the CEO's first-hand
    position is claim-first with peer-to-peer self-serve reassignment, and Victoria runs her team
    that way.

    **For ONBOARDING SPECIALISTS — permitted, with conditions. Victoria did NOT ask for it.**

    > **Victoria, 17/08 @ 55:05** — *"team chị tạm thời là có ba bạn onboarding specialist thì các
    > bạn ấy sẽ **take list lần lượt** nha. Ví dụ như Miley đầu tiên, Sarah thứ hai, rồi Liz thứ
    > ba. Thế xong rồi **vòng lặp đấy lại lặp lại**"*
    > **@ 55:19** — *"chị biết là tụi em cũng có một cái **auto assignment** như vậy đó em"*
    > **@ 55:27** — scoped: only for lists handed over by recruiting.

    > **@ 56:02** — *"chị cái này là một cái **lưu ý nhỏ** thôi. **Nếu như các em decide** là có
    > những cái automation như thế này thì khi đấy **cứ bàn luận với chị**"*

    So the accurate reading is neither of my two earlier ones. She is not requesting round-robin —
    she is saying *if* the team decides to automate, this is the rotation, and talk to her first.
    She also gives a constraint that a naive rotation would violate: at 55:53 she notes it is
    smoother for the LO **not** to have a second person pulled in when Miley is already onboarding
    them — a same-person exception, not a pure cycle. And the roster is *"tạm thời"* (for now).

    Net: `routing_rules` is the right home for an onboarding hand-off rotation, it is **not**
    forbidden, and it is **not** a committed requirement either. Build it only with her in the
    room, and only with the same-person exception.

    Also still wanted, and still absent: peer-to-peer self-serve reassignment · manager
    absence-coverage screen · per-team SLA configuration · SLA-triggered release of untouched
    claimed leads.

    **How I got it wrong, twice, in opposite directions.** First I over-generalised the CEO's
    recruiter-scoped remarks into a blanket "no auto-assign". Then, correcting that, I read 55:05
    as a request and wrote "Victoria asked for it — build it", without reading on to 56:02 where
    she frames the whole thing as conditional. Each correction overshot because I stopped reading
    at the line that proved the previous version wrong.

11. **Retitling the current recruiters** (directive #47). The roles themselves already exist —
    `OFFICER_RECRUITER` and `LO_SUPPORT` are seeded in `V036__seed_kho_roles.sql`; my earlier
    claim that they were absent was false. What has not happened is the **retitle and the
    migration of people**, which D46/D86 explicitly declined (*"RECRUITER không thành legacy,
    không migrate ai"*), and telling Victoria, which the CEO asked for. An org change, not code.
12. **`brand` / brand-manager routing** — three people held three positions on whether it
    exists in the new system at all.

### Cross-cutting defects found on the way

- `apiClient.ts:112-119` resolves HTTP failures into success-looking envelopes — the root of
  a permission fail-open class patched twice in 48 hours (`agentflow-id6d`). It will keep
  producing the same bug in every new gate.
- No feature-flag mechanism exists at all, though `recruit-fe/CLAUDE.md:121` makes one
  mandatory for the staging→production model.
- The Permissions screen collects and validates an override reason it never sends
  (`GrantDrawer.tsx:228-248` vs `PermissionsClient/index.tsx:151-160`).
- `GET /api/v1/admin/rbac/me` has no permission gate while every sibling on that controller
  calls `gate()`.
- Zero TODO/FIXME markers repo-wide in recruit-fe — provisional state is written as prose, so
  a marker scan reports this codebase as finished when a dozen surfaces are explicitly not.

---

## §6 — Addendum: the 10 compound trigger rules (HR transcript, 06/08)

The HR walkthrough yielded the thing the dev team had been asking Brian for since
mid-September: the **condition → recipient** rules that drive the whole cross-department
handoff. Ten of them (T1–T10, see `extract/hr-yenvu-2026-08-06.md`).

### What the code has instead

| Business need | Code today |
|---|---|
| T1 — Create Account on **a compound condition set** (condition 1 = `Pre-onboarding done`, Fee = Paid/Waived, Agreement = Signed, Status = Onboarding, Licensing = NMLS Licensed, HR = Not Initiated, + "Onboarding D"), **with a GA/OR/KY background-check branch** → ticket to HR | `userservicesync` exists but fires from `enqueueIfEligible(candidate, changes)` — a **profile-field-change** trigger, not a condition gate. And its client is `NoOpUserServiceSyncClient` — a third stub |
| GA / OR / KY state branch on the background check | ❌ absent. Only a flat template `ct-hr-bgc` ("Background check") in `V067__checklist_templates.sql:79`, no state branching anywhere |
| T2, T3 — status-pair nudges between HR and Licensing | ❌ no mechanism |
| T5 — 100% Onboarded = HR Complete + Sponsorship approved + **`setup call`** (term resolved 22/09, see below) | Code uses a different definition entirely: *every mandatory checklist item DONE/NA* (`CandidateServiceImpl:747`) — and nothing can become DONE (§1). The three business gates map onto no code construct |
| T7, T8 — Deny-by-LO ↔ account-deactivated, bidirectional | ❌ no mechanism |
| T9, T10 — application finished → fee/agreement auto-update; account created → welcome email | ❌ and blocked by the missing transport (§1) |
| A general condition→action rule engine | ❌ `grep -liE "ruleEngine\|automationRule\|TriggerRule\|WhenThen\|conditionSet"` → 0 files. `ChecklistTemplateTrigger` has exactly **3** hardcoded values: `ON_ENTER_S6`, `PER_SPONSOR_STATE`, `ON_100_ONBOARDED` |

**Ten business rules, three hardcoded triggers, no engine.** This is the largest
structural gap found in this analysis, and it is invisible from the recruiting side
because recruiting's own flow does not need it.

Note the CEO already asked for exactly this and it was demoed as accepted:

> **F50, Thuận @ 1:20:36** — *"em đặt cái rule để em automate công việc đúng không? Khi mà
> chuyện này xảy ra thì làm vậy dậy dậy."* (DEMOED-OK)

Whatever was demoed on 13/08, it is not in `recruit-be` on `origin/master` today.

### Three stubs, one pattern

`NoOpSequenceSenderImpl` · `NoOpUserServiceSyncClient` · `NoOpPubSubServiceImpl`.
Each reports success. Each keeps its engine's mechanics exercisable. Together they mean
**the outbound edge of this service is entirely simulated** — and every one of them is
invisible in a green test run.

### RESOLVED 22/09 — "setup coding" was never a term. The gate is `setup call`.

The HR transcript (06/08) named a third gate for 100% Onboarded that **nobody in that meeting
could define**, transcribed as `"setup coding"`. I reported it as *"a required gate with no
definition and no owner"*. It was neither.

Cross-checking the onboarding transcript (17/08) settles it. The **same spoken term** is
rendered there **15 different ways**:

```
setup call  ×2   ← clean, and therefore the true form
setup cô ×4 · setup co · setup cod · setup công
setup kh · setup c · setup m ×2 · setup th · setup xong
```

In the HR file the same word degraded into `coding` / `set up coden` / `setup c`. Two
independent recordings, one term, and the correct form survives twice in clean text.

**The third gate is `setup call`** — stage 12 of the onboarding pipeline, owned by the
onboarding specialist. Nobody in the HR meeting could define it because **HR does not own it**.
Miley defines it precisely.

The three gates of 100% Onboarded, corroborated across both transcripts:

> **Miley @ 27:55** — *"cái sponsorship được approve nè, licensing họ chỉnh nè, chỉnh hai cái
> option này nè thì lúc đấy là mới nhảy qua là 100%"*
> **Miley @ 833-841** — pressing `setup call` alone does **not** flip 100%; HR must flip theirs
> too, plus sponsorship approved.

| # | Gate | Owner |
|---|---|---|
| 1 | HR status = Complete | HR |
| 2 | Sponsorship approved | Licensing |
| 3 | **`setup call`** done | Onboarding |

On completion, a ticket fires to Support — *"khi mà nó nhảy về 100% á nó sẽ tới team là team
support"* (Miley @ 28:08). That is Yến's T6, corroborated from the onboarding side.

**Method note — refined 22/09 after a parallel session's experiment.**

A session transcribing the Licensing recording ran the same audio twice through the same model,
once with vocabulary priming that explicitly seeded the correct terms. Priming did **not** fix
the domain nouns; it changed *how* they were wrong:

| Reconstruction — **UNVERIFIED, do not quote** | unprimed | primed |
|---|---|---|
| "grant access" ⚠️ | "real estate" | "re-assess" |
| "Access Not Granted" ⚠️ | "no accept price" | "No Assets Price" |
| NMLS ✅ *(clean form attested elsewhere — see below)* | NMS / ns / NUS | NMS / NL |

> ⚠️ **The left column is reconstruction, not source.** `grant access` and `Access Granted`
> appear in **no** transcript in this directory and in **neither** whisper run. The only place
> those strings exist is this document's own prose. Nobody may cite them as requirements; they
> are a question for Ý. (They are *not* in the same class as `"Onboarding D"`, which has since been
> resolved from a second recording — no such second sample exists for these.) This warning exists because
> a plausible reconstruction written into an analysis document becomes indistinguishable from a
> sourced finding two readers later.

Priming improved sentence boundaries and punctuation a great deal, and corrupted the seeded
terms into *new* fluent English. **Priming is a readability fix, not a correctness fix**, and
the fluency of a sentence must never raise confidence in the noun inside it — fluency is
exactly what the engine preserves while destroying the term.

The corroboration rule that follows, which is stricter than "two sources agree":

> Corroboration counts only when the samples are **independent** — different recording,
> different speaker, different session. Two passes over one audio file are **one** sample.
> And corroboration is strongest when the **clean form appears in at least one sample**;
> matching corruptions prove only that the engine fails consistently (NMS survives every run
> and is wrong every time).
>
> **Corollary:** when the clean form appears in **no** sample and the corruption is stable,
> confidence goes to **zero** — not to the most plausible reconstruction. A fluent guess at
> what someone probably said is not a correction; it is a new invention that reads like one.

### The rule applied — one claim killed, one claim saved

**Saved: the GA / OR / KY background-check branch.** This rests on the HR agent decoding
`"chọt cha"` as Georgia, which under the corollary would be an unquotable reconstruction —
except that the clean form is present. `Georgia` appears **clean 3 times** in the same
transcript, and in the sentence itself the two neighbouring states survive intact:

> **Yến @ 1:05:50** — *"kiểm tra coi là họ cái lo nào mà đang sống ở **Oregon** hoặc là họ sống ở
> **chọt cha** hoặc họ sống ở **Kentucky** á thì sẽ yêu cầu họ làm **background check**"*

Three states in one list, two clean, one corrupted, and the clean form of the third attested
elsewhere in the same file. The rule is then: status → `pending background check` → create
account → `HR onboarding`; LOs outside those states skip it. **The branch is real**, and the
code has no state branching at all — only a flat `ct-hr-bgc` template
(`V067__checklist_templates.sql:79`).

**Killed, then revived: `"Onboarding D"`.** On 22/09 I put its confidence at zero — no clean form
in the file the corruption appeared in, single occurrence, carries a business rule. On 23/09 it was
**resolved**: the clean form `pre onboarding` is in *both* recordings, and the legacy enum is
`pre_onboarding_done("Pre-onboarding done")` (`LORecruiting.java:443`). The rule held; my sweep did
not — I searched one file for a term the other file spelled correctly. See §7 Q1.

`setup call` meets that bar, and was then confirmed independently: a second session grepped
Miley 17/08 without reading this write-up and found the clean form at lines 639 and 673, with
639 carrying the decisive signature — **clean and corrupted forms in adjacent sentences from the
same speaker**: *"một cái gọi là `setup call`. `Setup co` là gần cái lúc mà…"*. Truncation of a
real word, demonstrated in one breath. Recorded as **settled**.

**Engine-specific, not term-specific.** `NMLS` appears in **clean form 5 times** across two
transcripts (Recruiting 05/08 ×4, HR 06/08 ×1) — Zoom's engine gets it right, while whisper
never once did in either run. So a stable mishearing can be a property of the *engine*, not of
the term. Corollary for reading the extracts: a term that looks hopeless in one source may be
attested cleanly in another, so always sweep all four files before declaring a term unknowable.

`"Onboarding D"` looked like the opposite case — single occurrence, no clean form — and I wrote
that it was unresolvable from the transcripts. **That was wrong, and §7 Q1 now closes it.** The
clean form `pre onboarding` is present in *both* recordings, and the legacy enum
`LORecruiting.java:443` is literally `pre_onboarding_done("Pre-onboarding done")`. I had both
samples and searched only the file the corruption was in. The rule was sound; my sweep was not.

### The HR↔Licensing asymmetry — REFINED 23/09 by the licensing transcript

I recorded from the HR transcript that HR-done + licensing-pending fires **nothing**, on purpose,
because licensing is processed by an external third party:

> **Yến @ 28:43** — *"mình không có hối được do là bên một phía thứ ba nó đang process licens"*

The licensing walkthrough (11/08) shows tickets firing in **both** directions:
- **Licensing → HR**, 1:32–1:54: one license approved → Ý sets the sponsored status → departments
  receive a ticket, HR named.
- **HR → Licensing**, 8:15–9:02: HR flips to "HR onboarding" → Ý receives an email/ticket that the
  LO is ready for sponsorship. She says she gets **3–4 a day**.

**These do not contradict each other — they are different mechanisms**, and conflating them would
have produced a wrong requirement:

| Mechanism | Direction | Exists? |
|---|---|---|
| **Handoff notification** — "your turn now" | both ways | **yes, both ways** |
| **Escalation / chasing** — "you are late, hurry up" | HR→Licensing | **no** — nobody to chase, the processor is external |

So: build the handoff both ways. Do **not** build an escalation timer pointing at Licensing.
Yến's point stands, narrowed to escalation.

**Still single-source:** the external-third-party claim itself. Ý never mentions a third party,
outsourcing or an external processor in 42 minutes — a clean absence, not a contradiction, since
she was describing handoffs rather than escalation.

### Attribution still open

~~"Dave" — dev/IT team or a named person?~~ **Resolved 23/09: a named person, Dave Hoan/Hoang in
HR**, per the production screenshot quoted in `recruit-be/docs/FEEDBACK/03-hr.md`. See §7 Q3.


---

## §7 — Questions only a human can answer

These cannot be settled by reading code or transcripts. Each is cheap to ask and blocks
something concrete. Ordered by what they block.

| # | Question | Ask | Blocks |
|---|---|---|---|
| 1 | ~~Is `"Onboarding D"` a real status?~~ **RESOLVED 23/09 — it is "Pre-onboarding done".** The speaker stutters it (*"phải là onboarding D re-onbarding D"*, HR 1:06:52), and the clean form `pre onboarding` appears in **both** recordings independently — it is stage 8 of Miley's pipeline, the status that releases the contract for signature. My own corroboration rule settles it; I had both samples and failed to sweep the second file. **T1 is no longer blocked on this.** | — | nothing |
| 2 | Confirm the third gate of 100% Onboarded is `setup call` (strong inference, §6) — and that HR does not own it. | Yến or Miley | 10 seconds to confirm; closes the last doubt on the 3-gate model |
| 3 | ~~Is "Dave" the dev/IT team, or a named person?~~ **RESOLVED 23/09 — a named person, Dave Hoan/Hoang in HR**, per the production screenshot quoted in `recruit-be/docs/FEEDBACK/03-hr.md`. My "dev team" gloss was wrong; the extraction agent refused it at the time and recorded both readings, which is why it was recoverable. | — | nothing |
| 4 | Does `brand` / brand-manager routing still exist in the new system? Three people in the 06/08 room held three positions. The field does not exist in code at all. | Yến + Victoria | Whether to build it or formally drop it |
| 5 | Which statistics should stay on the pipeline header? Victoria deferred: *"I need to sit down and think about it"* (05/08 @ 4:09). | Victoria | The header/KPI block redesign |
| 6 | Has Victoria been told about directive #47 — a new "loan officer recruiter" role, and retitling current recruiters as customer service? The CEO said to tell her. | Thuận → Victoria | An org change, not a code change. Do not implement silently |
| 7 | The request to gate self-payment behind the background check. **Corrected 23/09:** Victoria states it herself — *"tụi chị **không muốn họ được trả luôn tiền**… phải qua tụi chị background check rồi này nọ thì mới được"* (ONB 39:45). It dates back to *"thời Phương Nguyễn"* and she notes Phương Nguyễn has since left (39:32). My earlier "filed by Brian, not Victoria" was wrong as a sole attribution. Still worth confirming the exact bar. | Victoria or Brian | Tier 1 item 4 (approve/reject screen) — backend is already done |

| 8 | **Is Phương Nguyễn still the project owner?** At 17/08 @ 39:32 Victoria says *"Phương Nguyễn **trước khi rời đi**"* ("before Phương Nguyễn left"). The repo routes its highest-authority open questions to chị Phương, and a chị Phương speaks on 06/08 and 13/08. | Bao | Where every unresolved product question is sent |

**Rule going forward:** any finding resting on a single English phrase transcribed from
Vietnamese audio, where no clean form appears in an independent recording, goes on this list
rather than into the backlog.


---

## §8 — Triage rule for unresolved terms

Not every unresolved transcription matters. Sort by **what the term carries**, not by how
uncertain it is:

| Class | Example | Action |
|---|---|---|
| Carries a **business rule** — a condition, threshold, status or recipient | `"Onboarding D"` — resolved from a second recording, so it never needed the human it was routed to; `"Access Granted"` still does | **Blocks implementation** until a second *independent* sample or a human settles it. Never reconstruct from one |
| Carries a **term the code must match** — an enum value, a status label | `setup call` | Must be settled before naming anything after it. Settled here |
| Carries **context only** — a passing reference that changes no behaviour | `"cting"` (a team not yet interviewed), `"breakround"`, `"bên S"` | **Leave unresolved. Do not spend time on it** |

Worked example of the third class: `"cting"` at 0:34 lists which teams had not yet been
interviewed — *"còn mấy cái team phía sau như là onboarding này **cting** kia"*. Candidates are
*accounting* (Thuận lists it among onboarding's dependencies at 1:29) and *customer service*.
The clean-form test **cannot** separate them: both appear clean in the corpus (accounting 2× in
the CEO file, 4× in Onboarding; customer service 4× and 1×). Two attested candidates, one slot.

But it decides nothing. Whichever it is, the fact already established is that **onboarding and
at least one downstream team had not been interviewed as of 13/08** — which the meeting order
confirms independently (§3). Resolving the word changes no requirement, no schema and no
priority. It stays open, and that is the correct outcome rather than a failure.

**The failure mode this rule prevents** is spending verification effort proportional to
*uncertainty* instead of to *consequence*. `"Onboarding D"` and `"cting"` looked equally uncertain;
only one of them could put a wrong condition into a production gate, and that is the one that
deserved the second sweep — which is exactly what eventually resolved it.
