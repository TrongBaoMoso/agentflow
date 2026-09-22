# LO Recruiting / Onboarding — Inventory of Everything Written Down

> **Scope.** Everything *written down* about the LoanFactory Loan Officer recruiting + onboarding
> system, **excluding** the four large transcripts in `docs/transcripts/*.md` (other agents own those).
> Sources mined: `agentflow/docs/*`, `agentflow/docs/mockups/*`, the Beads tracker (`bd`),
> Claude memory files in `~/.claude/projects/-Users-apple-Projects-agentflow/memory/`,
> `agentflow/openspec/`, and in-repo markdown in `recruit-be`, `recruit-fe`, `omni-service`,
> `ai-hr-be`, `document-esign`, `tera-docs`.
>
> **Reading rule.** Everything here is a **CLAIM made by a document**, not a verified fact about the
> code. No code was read to confirm any of it. Where a source asserts something about the code, it is
> recorded as a claim with its citation and date. An old document is evidence of *intent*, not of
> *current state* — see §F.
>
> Compiled 2026-09-22.

---

## A. Promised / designed features

Grouped by area. Every row cites a file path (+ section/line where useful), a bead id, or a memory
filename. "Claimed state" is what the source itself says.

### A.1 Core pipeline / lifecycle

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A1 | **Single unified pipeline** — one candidate record, one lifecycle, stage instead of two separate "kho" (Recruited LO ↔ Interested LO) | `docs/lo-recruiting-redesign-direction.md` §2 P0-1, §4.1; `docs/lo-recruiting-e2e-flow.md` §0 | Designed (architecture direction) | 2026-08-03 / 2026-08-05 |
| A2 | **8-stage journey S0–S7** (Intake → New → Contacted → Engaged → Verified → Offer → Onboarding → Active) with per-stage SLA and exit gates | `docs/lo-recruiting-e2e-flow.md` §2 | Designed | 2026-08-05 |
| A3 | Alternative **5-stage lifecycle + detached milestones** (Sourced/Contacting/Engaged/Onboarding/Active LO) — note this **conflicts** with A2, see §E | `docs/lo-recruiting-redesign-direction.md` §4.2 | Designed | 2026-08-03 |
| A4 | **Stage vs milestone separation** — stage is human-decided, milestone is machine-recorded (paid / signed / NMLS sponsored / HR completed / meeting done) | `docs/lo-recruiting-redesign-direction.md` §2 P0-4 | Designed | 2026-08-03 |
| A5 | **Candidate core API** (CRUD, search, claim, stage transition with `stage_requirements`, activity feed) | bead `agentflow-v1jv` (epic, IN_PROGRESS); `recruit-be/docs/BACKLOG.md` §3 "V1 — backend" | Sprint 1 shipped 18/08 (5 PRs); epic still in progress | 2026-08-18 |
| A6 | **Nurture branch with wake-date = a real task** (not a snooze flag) | `docs/lo-recruiting-e2e-flow.md` §2 "Nhánh Nurture"; `redesign-direction.md` P1-5 | Designed; partially shipped — D121 (19/09) added `followup.nurture_default_days`=30, V088 | 2026-08-05 / 2026-09-19 |
| A7 | **Do-not-contact / suppression honoured at intake from every source** (TCPA STOP) | `docs/lo-recruiting-e2e-flow.md` §8.3; `recruit-be/docs/DECISIONS.md` D18 | Designed; `suppression_list` table exists (D18); suppression check claimed shipped (23 files) per `BACKLOG.md` rà 02/09 | 2026-08-05 |

### A.2 Intake / sources / identity

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A8 | **Six intake sources unified** — Modex synced list, self-apply, Facebook Lead Ads, referral from existing LO, webinar/event, CSV import | `docs/lo-recruiting-e2e-flow.md` §1; `lo-recruiting-feature-review.en.md` §11 | Designed | 2026-08-05 |
| A9 | **Identity resolution NMLS → email → phone**, with Review-Similar queue for ambiguous matches | `docs/lo-recruiting-e2e-flow.md` §1 | Designed | 2026-08-05 |
| A10 | **Dedup as a process, not a constraint** — `merged_into_id` + `candidate_merges`, never auto-merge | `lo-recruiting-e2e-flow.md` §9.10.2; `recruit-be/docs/DECISIONS.md` D17, D60 | D60 decided 25/08: detect + human merge; `/duplicates` route exists per `BACKLOG.md` FE rà 02/09 | 2026-08-25 |
| A11 | **HOT / COLD inbox split** — HOT = lead raised their own hand (webinar/self-apply/referral/FB/event), COLD = imported stock | `recruit-be/docs/DECISIONS.md` D46, D54, D59; bead `agentflow-jip5` | 🟡 in progress — bead says **4/5 HOT channels still have no producer**; staging is 100% `source=IMPORT` | 2026-08-26 → 2026-09-03 |
| A12 | **`import_batches` + per-import report (matched / unmatched / ambiguous)** instead of silent 10-minute jobs | `lo-recruiting-e2e-flow.md` §9.10.7, §8.7; `redesign-direction.md` P0-17 item 7 | Designed | 2026-08-05 |
| A13 | **Realtime MOSO → recruit ingest via packs watcher + webhook `x-api-key`** | `recruit-be/docs/STATUS.md` row 1; D71–D75, D98; `MOSO-REALTIME-INGEST.md` | 🟢 claimed LIVE on staging **and prod** (93 requests all 200 measured 18/09); bead `u7wl` closed 18/09 | 2026-09-18 |
| A14 | **Automatic webinar attendance import** (Google Meet REST `conferenceRecords.participants`) | `recruit-be/docs/BACKLOG.md` §3 (R6 / Q27 / Q48); D40 | Q48 verified 12/08 (Workspace tier supports it) → feasible; **not built** | 2026-08-12 |

### A.3 Verification / Modex / offer pricing

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A15 | **"Verify with Modex" one-click enrichment** via list-sync webhook, monthly refresh, snapshot with `source + as_of` | `docs/lo-recruiting-redesign-direction.md` P0-17 "Hướng app mới"; `e2e-flow.md` §3 S3/S4 | Designed; blocked on Modex contract (4 questions to Victoria) | 2026-07-31 → 2026-08-05 |
| A16 | **Verification card + 90-day freshness gate before an offer can be created** | `e2e-flow.md` §2 S4; §5 event table | Designed | 2026-08-05 |
| A17 | **Comp band suggestion from production tier** (newly licensed / <10 / 10–50 / 50+ / high producer) | `redesign-direction.md` §9.6; `e2e-flow.md` §2 S4; D15 | Explicitly a **NEW proposal** — old system has nothing. Not built; `comp_bands` is an **empty shell table** (V035 hollow-table warning) | 2026-08-04 |
| A18 | **Offer freezes its evidence** — `offers.comp_details` JSONB embeds `{volume, units, source, as_of}` at submit-for-approval | `recruit-be/docs/DECISIONS.md` D37 (12/08); Q30 in `BACKLOG.md` §1b | Decided (option a) | 2026-08-12 |
| A19 | **Modex monthly-diff signals** ("LO changed employer", "volume +40%") auto-generating re-engage tasks | `e2e-flow.md` §2 Nurture; §9.9 dependency map | Designed; **no fallback** if Modex contract fails; listed as V2 in `BACKLOG.md` | 2026-08-05 |
| A20 | **Modex pull (active)** | `recruit-be/docs/STATUS.md` row "Modex (pull chủ động)" | ⚪ **not started** — receiver push exists with mock payload only; no credential | 2026-09-10 |

### A.4 Offer / Invite to Join / e-sign

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A21 | **"Invite to Join" button** — the close action in recruit app (`POST /candidates/{id}/invite`), 8 work items, PA-1 shape | `docs/lo-recruiting-invite-to-join-design.md` (whole doc, §7 "Tám mảnh"); epic bead `agentflow-f1gi` | Designed 15/09; sub-beads `bnop`(1/8)✓ `gery`(0b)✓ `id33`(3/8)✓ `mdfp`(4/8)✓ `ot7w`(2/8)✓ closed; `hj93`(8/8 SLA) still OPEN | 2026-09-15 → 2026-09-18 |
| A22 | **Auto-approve rule D64** — AUTO only when `loans_since_2022 ≥ 5 AND units_12mo ≥ 2`; everything else, incl. NULL, → REVIEW (fail-closed) | `lo-recruiting-invite-to-join-design.md` §5; D64, D120; `STATUS.md` offer row | ✅ claimed done 17/09, extended 18/09 (AUTO now also auto-SENDs). **Missing**: the 24h decision window + reminder | 2026-08-26 → 2026-09-18 |
| A23 | **Waived $100 startup fee ⇒ always REVIEW** (D-I7), fee as an independent axis (`fee_status` PENDING/PAID/**WAIVED**) | `lo-recruiting-invite-to-join-design.md` D-I1/D-I7; `e2e-flow.md` §9.10 "3 chỉnh" | Designed; PR-A2 (waive intent) on branch `feat/waive-intent-send-lock`, **PR #366 not merged** per bead `f1gi` NOTES | 2026-09-15 → 2026-09-18 |
| A24 | **"Tiến trình gia nhập" progress card** — V1 cut down to 3 real milestones (invited / paid-or-waived / signed) | `lo-recruiting-invite-to-join-design.md` §8 | Designed; 2 of 5 original milestones dropped for lack of a data source | 2026-09-15 |
| A25 | **packs writeback (`SaveLORecruitingFromRecruitOp`)** carrying `waive_startup_fee`, `status=invited_to_join`, triggering the invitation email | `lo-recruiting-invite-to-join-design.md` §7 item 4; D98/D120/§6 R09; bead `agentflow-p1qm` | 🌓 "ship dark": outbox V084 `payload_kind='INVITE'` built; **both switches OFF**; op live on packs staging (measured 21/09) but ApiKey user lacks `Permission.RECRUITING` | 2026-09-18 → 2026-09-21 |
| A26 | **e-sign → offer auto-flips to SIGNED** (replace the manual button) | bead `agentflow-m1nv` (P1, open); `reference_moso_lo_signing_and_fee_source.md` | Memory claims MOSO path already works: Inkless webhook → `lo_agreement_signed`, PayPal → `paid_startup_fee`, and recruit-be consumes both via `MosoRowMapper`; "Hướng A" (mirror MOSO flags) preferred over document-esign | 2026-09-19 |
| A27 | **document-esign `RECRUITING` service type** (PR #21) | `recruit-be/docs/BACKLOG.md` V1.1 "E-sign"; bead `agentflow-zmg1` | 🔴 **BLOCKER** — PR open since 12/08, approved then 14 review comments, 9 marked `[correctness/CONFIRMED]`, **0 answered**, branch unchanged for 3 weeks | 2026-09-03 |
| A28 | **Separation of duties on offer approval** (approver ≠ requester) | `lo-recruiting-invite-to-join-design.md` §9 "Mới, chưa ai bắt"; bead `agentflow-bax0` | Identified, bead filed, not built | 2026-09-15 |

### A.5 Onboarding (S6) and HR handoff

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A29 | **4-department parallel onboarding checklist** (Licensing / HR / Onboarding Specialist / Accounting) with per-task SLA and blocked-reason display | `e2e-flow.md` §2 S6; `redesign-direction.md` §4.3 "Onboarding Board" | Framework + engine claimed done 13/09 (`checklist_templates` V067, `ChecklistGeneratorImpl`, V066–V068) but **seeded dark**: `mandatory=false` everywhere, departments have not confirmed the catalogue | 2026-09-13 |
| A30 | **State-by-state licensing / sponsorship rules** (SC 75mi, WI/WY 100mi, NJ 2.5h drive, NE/RI in-state, GA/MT/OH/OR/PA confirm step, CA DRE / IN SOS auto-attribute) | `e2e-flow.md` §8.2; `recruit-be/docs/SPEC-SPONSORSHIP-QUEUE.md`; D76 | Engine + gate claimed done 13/09 (`LicensingItemGeneratorImpl`, V066/V068) but gate **OFF** (`licensing.sponsorship_gate_enabled=false`); CA/IN auto-apply inert (no `lo_type` column) | 2026-09-13 |
| A31 | **Sponsorship queue for Licensing** (`sponsorships` table, per-candidate per-state) | bead `agentflow-lems`; `STATUS.md` row | 🔴 blocked — waiting for 7/18 hollow V001 tables to be filled | 2026-09-10 |
| A32 | **recruit → HR handoff (RECRUIT_HIRED publish)** — push at S5→S6, HR creates DRAFT employee, link back `candidates.account_id` | bead `agentflow-8pqy` (IN_PROGRESS); D116, §6 R07; `STATUS.md` "P3" row | 🌓 recruit-be publish side MERGED 17/09 (#352) but **dark**: flag off + topic blank. ai-hr-be inbound subscriber **not built** (other team). Link-back not built. Topic + IAM = DevOps | 2026-09-17 |
| A33 | **HR → recruit feed** (subscribe `HR_ASSOCIATE_*`) | bead `agentflow-g12o` (P2, open) | Not started; HR already runs 4 `HR_ASSOCIATE_*` topics in the same 2 projects (`8pqy` notes, 17/09) | 2026-09-17 |
| A34 | **recruit → user-service identity sync** | `STATUS.md` "NEW: recruit → user-service" row | 🌓 pre-wired, **DARK** — `NoOpUserServiceSyncClient` logs "would PATCH", 0 network calls; needs Tai's credential + transport decision | 2026-09-10 |
| A35 | **"100% onboarded" as a derived gate**, not a dropdown | `lo-recruiting-meeting-prep-victoria.md` §4 claim 1; `e2e-flow.md` §8.1 | Claimed as the heaviest audit finding: production has **2,603** records at that status while the hard gate is only Paid + Signed. `FEEDBACK/README.md` warns there are **FIVE sources with FIVE different answers** for this gate | 2026-08-05 / 2026-09-04 |
| A36 | **LFIQ Onboarding API** (OnboardingStatus enum, `OnboardingWorkflowState` JSONB, entity, migration, service, facade, controller, config, tests) | `openspec/changes/lfiq-onboarding-api/`; beads `agentflow-a90(.1–.4)`, `agentflow-1ot(.1–.3)`, `agentflow-pzg(.1–.2)`, `agentflow-1yo(.2)` | All OPEN, none started. **Note:** this is the *lf-iq* onboarding tour, a different product from LO recruiting onboarding | — |

### A.6 Communications (call / SMS / email / omni)

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A37 | **Click-to-call over Zoom Phone**, with periodic health-check of the mapping | `e2e-flow.md` §2 S2, §9.3; D12, D39 | `STATUS.md`/`BACKLOG.md` claim only a **place to store it** exists (`ActivityEntity` + 2 migrations); FE deep-links `zoomphonecall:` and logs, no server-side send | 2026-09-02 |
| A38 | **Call-outcome wizard** (2 questions: attitude + next step) with 4/5 next-step branches | D50, D51, D121, D122; `project_recruit_call_outcome_next_steps.md` | Shipped + being extended: PR1 modal UX (#194) and PR2 Meet 1-1 (#385/#196) **MERGED**; webinar picker #193 MERGED 21/09; Send-info PR3a (#199) + PR3b (#388/#201) MERGED 22/09 | 2026-09-22 |
| A39 | **Webinar invite from the Call-result modal, end-to-end** | `reference_recruit_webinar_end_to_end.md`; bead `agentflow-zm4k` | Memory claims **proven end-to-end on staging 22/09** via Khải's new `RecruitAPI` (`/api/recruit/v1/*`, packs#3550 + moso#1741): real email + Google Calendar invite delivered, sender = recruiter. **But recruit-be has zero calls to the new API (grep=0)** — it still targets the old `execute/` path | 2026-09-22 |
| A40 | **recruit ↔ omni conversation** (thread per candidate, cast push, call mirror, inbound reply) | `project_recruit_omni_conversation.md`; `recruit-be/docs/OMNI-STATUS-2026-08-25.md`; D100–D103, D109, D112; beads `agentflow-9qps`, `o2ee` | Verified on staging; **entirely dark on production** (`RECRUIT_OMNI_BASE_URL` + internal key + host_subjects absent on prod) | 2026-09-21 |
| A41 | **Sequence / cadence engine** (silence tiers 1/5/7/30 days, auto-send on tiers 1 & 5) | D56, D63; bead `agentflow-jqpu`; `COMM-STACK-RESEARCH.md` §3 | 🔴 **GATE before go-live** — PRs #253/#254 exist but 2 HIGH + 3 MEDIUM findings must close before prod-route / auto-send flip / real sender. Sender = NoOp, auto_send off, cron inert | 2026-09-10 |
| A42 | **Stop-on-reply** (candidate replies → cadence stops) | D112; bead `agentflow-lmb5`; `recruit-attribution-sequence-critique.md` §C1 | Critique (06/09) says stop-on-reply *"is gated on a signal no machine produces"* — P0. Later: `recordInbound` writer built (#332), `OmniInboundMessageHandler` is its **first caller**, Pub/Sub topic live, 5 IAM grants applied 14/09 | 2026-09-06 → 2026-09-14 |
| A43 | **Template lifecycle** DRAFT → IN_REVIEW → ACTIVE → RETIRED, PERSONAL vs TEAM scope | D26, D57 | Claimed shipped 26/08 (V022, `/templates`, be #109/#110 + fe #72/#73). Missing: the SEQUENCE runner | 2026-08-26 |
| A44 | **Inbound email routing for candidates** via `inbound-email-service` + Reply-To containing a system address | D28; `BACKLOG.md` §3 "Email một đường duy nhất"; beads `agentflow-8lxv`, `g9rc` | Not done: bead `8lxv` says reply-in routes by **sender address, not by token**, and recruit-be cannot resolve the UUID routing key; `g9rc` says the `cand` mapping exists on staging but the Workspace routing rule `^cand-.*` is missing (and the whole prod set) | 2026-09-xx |
| A45 | **Conversations hub / unified timeline across channels**, team-level view, reply from the list | D29; `BACKLOG.md` §3 (R15/R17/Q44); bead `agentflow-ehl6`, `agentflow-gg2w` | Designed; `ehl6` epic (compose-on-read) approved 11/09, three phases, phase 3 blocked on omni | 2026-09-11 |
| A46 | **Comms KPIs** (SMS/day, total call minutes per recruiter, 3 axes × 3 periods) | D30; `BACKLOG.md` §3 (R16/Q45) | Designed; data claimed available from `ZoomCallLog` | 2026-08-10 |

### A.7 Attribution / referral / bonus

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A47 | **First-touch attribution rule** — the first recruiter to touch owns the credit; empty recruiter FK = COMPANY LEAD, not "unowned" | memory `lo-recruiting-attribution-first-touch` (bd memories); `lo-recruiter-landing-pages-brief.md` Appendix E (Phuong, 31/08); bead `agentflow-ikp5` | Rule decided by Phuong Nguyen 31/08; the doc explicitly records that one of the author's own recommendations was **withdrawn** as a consequence (E.3) | 2026-08-31 |
| A48 | **Attribution ledger + recording redesign** (source contract, surrogate minted at landing, slug→alias table, `referrals` table reshaped on PROGRAM+ROLE axes) | beads `agentflow-3sad` (A), `rikq` (C), `dvdl` (D), `qbup` (E), `5jka`, `p7ya`; `recruit-attribution-sequence-critique.md` | 🔴 blocked epic `ikp5`. Ledger V050 built + tested but **nothing populates it from ingest** (`MosoRowMapper` discards the referrer identity) per `project_recruit_fe_is_deployed_app.md` | 2026-09-05 → 2026-09-07 |
| A49 | **Referral bonus payout engine** — 60-day maturity, two-sided eligibility, idempotency flag, Cash (auto Check request) vs RSU (HR-only manual), visible queue instead of the Saturday cron | `e2e-flow.md` §8.4; `redesign-direction.md` §3 item 4; `BACKLOG.md` V1.1 | **Not built.** `project_recruit_prod_gaps.md` (20/09): *"Bonus payout engine: CHƯA build (quyết định phòng ban đã xong, chỉ còn code)"* | 2026-09-20 |
| A50 | **Genesis attribution backfill for legacy candidates** (V081, one `COMPANY_LEAD` row per event-less candidate) | `STATUS.md` D7 row; §6 R08 | ✅ staging done (7249/7249 on 17/09); **prod NOT run** — waiting on Bao because it is a money decision | 2026-09-17 |
| A51 | **Ambassador + LO Recruiter programs move into recruit app scope** | bd memory `ambassador-recruiter-program-scope` (Bao 31/08); bead `agentflow-ikp5`, `dve0` | Scope decision; `dve0` still waiting on Thuan to answer 15 questions | 2026-08-31 |
| A52 | **Ambassador connections threshold = sum across all ALLY channels** (website excluded) | `project_ambassador_connections_rule.md` | Decided by Bao 15/09 | 2026-09-15 |
| A53 | **Ambassador marketing budget is a reimbursement**, LO fronts the cost and submits invoices monthly | `project_ambassador_marketing_budget_is_reimbursement.md` | Confirmed 22/09 by the "[Recruiting] Ambassador" PDF | 2026-09-22 |
| A54 | **Ambassador standing bridge to ALLY + 10-event email flow** | bead `agentflow-nktr` (P2, open) | Open | — |

### A.8 Recruiter landing pages `/join/<slug>`

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A55 | **Per-recruiter landing page** with two form modes (light lead form / full 4-step stepper with $100) | `docs/lo-recruiter-landing-pages-brief.md` (1098 lines + appendices A–E); epic bead `agentflow-7mj7` | Design chốt; **~80% of the mechanism claimed to already exist and run on production** in lf-homepage (§0 table) | 2026-08-31 |
| A56 | Slug = local-part of `company_email` with `.`→`-`; attribution via `referred_source='recruiter'` + `referred_by=<company_email>`; **no new mapping table** | bead `agentflow-7mj7` DESIGN; brief Appendix C.3 | Decided — supersedes the brief's own §3 which proposed building a `recruiter_pages` registry (see §E) | 2026-08-31 |
| A57 | URL shape `/join/<slug>` + `/join/<slug>/apply` (explicitly **not** `/apply/<slug>`, because lf-homepage already owns `/apply` for borrowers and `RELEASE_PAGES['/apply']=false`) | bead `agentflow-7mj7` DESIGN | Decided | 2026-08-31 |
| A58 | 4-round test plan for `/join` (staging link life → attribution lock → UI/UX at 4 viewports + keyboard/screen-reader → real end-to-end send before distributing the link → post-production round) | `docs/lo-recruiter-join-test-plan.md` | Written, gating: *"BẮT BUỘC trước khi phát link"* | 2026-08-31 |
| A59 | Phased roadmap: Phase 0 file-based registry → Phase 1 registry in moso-aid → Phase 2 HR-issued account ids → Phase 3 recruit-be consumes labels (pre-assign owner, 1h first-touch SLA, per-page dashboard) | `lo-recruiter-landing-pages-brief.md` §10 | Designed | 2026-08-31 |
| A60 | Per-page funnel measurement from Phase 0 (views → started → submitted → admitted) | `lo-recruiter-landing-pages-brief.md` §10 "Đo lường" | Designed | 2026-08-31 |
| A61 | **⚠ `/join/<slug>` repurposed** — as of 09/09 it is the **weekly webinar registration form**, not a lead-capture form | `project_lfh_join_webinar_form.md` (shipped PR #2420/#2421) | Shipped; contradicts A55/A59 — see §E | 2026-09-09 |

### A.9 Work management / UX

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A62 | **Today / My Work as the default screen** (replaces follow-up snooze flag) | `redesign-direction.md` P1-5, §4.3; `e2e-flow.md` §3 | Route `today` exists per `BACKLOG.md` FE rà 02/09; D66 (Today empty ⇒ hand out work via `POST /candidates/batch-claim`) | 2026-08-26 |
| A63 | **Four pipeline views — Kanban / Table / Focus / Funnel**, view state in the URL, admin default per role + user override + favourites | `e2e-flow.md` §9.4, §9.7; D11, D33 | Designed. `BACKLOG.md` FE: **Kanban and Funnel have no route yet**; `today/focus` exists but the doc itself is unsure whether it is the intended "Focus mode" | 2026-09-02 |
| A64 | **Role-based workspaces / two-dimensional lens (row-level + field-level)** | `redesign-direction.md` P0-2; `e2e-flow.md` §9.5 | Designed; RBAC matrix §4 covers only the task axis — field-level explicitly still to be specified | 2026-08-05 |
| A65 | **LO 360 drawer** — profile + timeline + milestones + tasks + documents + verification card | `redesign-direction.md` §4.3 | **No route yet** (`BACKLOG.md` FE); Track A (mockup approval) applies | 2026-09-02 |
| A66 | **Settings screen** (SLA policies, comp bands, default view per role, capacity ceiling tiers 2–3) | `BACKLOG.md` FE; D47 | **No route yet**; BE side shipped (V007 `recruit_settings` + `SettingsService` + admin endpoints) | 2026-09-02 |
| A67 | **Saved filters + label taxonomy + URL-as-source for every list** | D65; `BACKLOG.md` (R3/R11); bead `agentflow-hgps` | Claimed shipped 26/08 (V024 saved-filters be#117/118 fe#80/81; V027 labels be#123/124 fe#84/85) | 2026-08-26 |
| A68 | **Exceptions screen as a lens over the HOT queue** (not a second queue) | D61 | Shipped (route exists); missing piece = **auto-ping Omni on escalation** | 2026-09-02 |
| A69 | **Reports: live per-recruiter clocks + pivot (recruiter × month) with drill-down** | D62; `BACKLOG.md` (R5/R9.1) | Claimed shipped 26/08 (be #112/#113 + fe #74/#75); pivot cell semantics still open (Q35) | 2026-08-26 |
| A70 | **Audit screen** = unified stream over 4 ledgers, gated by `AUDIT_VIEW`; MANAGER + ADMIN only | D38; `BACKLOG.md` (R20) | Claimed shipped 26/08 (be #119/#120 + fe #82/#83) | 2026-08-26 |
| A71 | **Permissions screen** ported from LoaL (4-state matrix, bulk assign, central user picker) | D87, D88, D92 | Route `permissions` exists; bead `agentflow-505y` says the screen's UI/UX is out of line with the rest of recruit-fe | 2026-08-27 |
| A72 | **Recruiter can edit LO profile in recruit app + 3-way sync (recruit ↔ legacy ↔ HR)** | bead `agentflow-lkyg` (P1, "GẤP", Bao 14/09) | BE `PUT /candidates/{id}` exists; **recruit-fe has no edit form at all** (`CandidateDrawer:49` "Read-only in V1"); 3-way sync architecture not designed yet | 2026-09-14 |
| A73 | **Design system for recruit-fe** — MIX v6, Public Sans, orange accent `#ea580c`, cream `#faf9f7`, 60px header + nav-only sidebar | `project_recruiting_fe_design_system.md`; mockup `docs/mockups/lo-recruiting-today-redesigns/06-mix.html` | Chốt 21/08 after 5 review rounds; ported to recruit-fe PR #4/#5. **Not yet ported**: `useModal`, 28 tera-fe field components | 2026-08-21 |
| A74 | **Mobile-usable recruiter surface / Call Queue mobile-first** | `redesign-direction.md` P2-15, §4.3 | Designed only | 2026-08-03 |
| A75 | **AI assist** — draft outreach, weekly digest, call-recording summary into the timeline | `redesign-direction.md` §4 (V2); `e2e-flow.md` §9.3; `BACKLOG.md` V2 | V2, not started | 2026-08-05 |

### A.10 Platform / operating rules promised as features

| # | Feature | Source | Claimed state | Date |
|---|---|---|---|---|
| A76 | **SLA engine driven by `sla_policies` + escalation** | `e2e-flow.md` §9.2; D10, D55, D104, D111 | `BACKLOG.md` (rà 02/09): table `sla_policies` exists in V001 + V035 only, **no class reads it**. HOT uses a *different* mechanism (`sla.first_touch_hours_by_source`). D111 (11/09) claims business-hours clock is now code; **holiday calendar still empty** | 2026-09-11 |
| A77 | **Routing / assignment engine** (pull at the funnel head, least-load push later, capacity cap, business hours, SLA reassign) | `BACKLOG.md` §3 (R8, Q34) | `routing_rules` table exists, **no class reads it** — "engine đổ việc theo luật" not built | 2026-09-02 |
| A78 | **Everything operational is dynamic config** (`recruit_settings`, `licensing_state_rules`) — hardcoded constants are a reject-on-review offence | `feedback_lo_recruiting_product_principles.md`; D24; `recruit-be/CLAUDE.md` rule #9 | Policy in force; BE done, **Admin settings UI not built** | 2026-08-12 |
| A79 | **Integration health-checks with alerts** (Calendly token, Modex webhook, Zoom mapping) | `BACKLOG.md` §3 (G-16) | Not built | 2026-08-10 |
| A80 | **Audit outbox → Pub/Sub → platform `audit-log-service`** | D08; `e2e-flow.md` §9.10.4 | Optional for launch; `audit_outbox` measured **0 rows** (so `/audit` composes at request time instead) — bead `agentflow-mnoz` | 2026-08-26 |

### A.11 Mockups that exist (what they depict)

| Path | Depicts | Source note |
|---|---|---|
| `docs/mockups/lo-recruiting-mockup.html` | Kanban pipeline, recruiter view (v1) | `e2e-flow.md` §9.4 |
| `docs/mockups/lo-recruiting-views.html` | Table / Focus / Funnel views | `e2e-flow.md` §9.4 (05/08) |
| `docs/mockups/lo-recruiting-roles.html` | 6 role screens (Manager / HR / Licensing / Onboarding / Accounting / Referring LO) with a "lens" banner per role | `e2e-flow.md` §9.5 |
| `docs/mockups/lo-recruiting-admin.html` | Admin/Settings detail (a *second* source of settings truth — see §E) | `BACKLOG.md` §4 |
| `docs/mockups/lo-recruiting-app/` | Clickable prototype v4, 17 candidates, cross-department demo chain, empty/error simulators | `e2e-flow.md` §9.7; bd memory `lo-recruiting-mockups` |
| `docs/mockups/lo-recruiting-app-v5/` | Prototype v5 — adds views-comms, views-growth, views-admin2, story.html | filesystem |
| `docs/mockups/lo-recruiting-today-redesigns/` | 9 competing design systems (01-homepage … 09-callcenter) + `06-mix.html` = the chosen one, + `DESIGN-SYSTEMS.md` + `UX-SPEC.md` | `project_recruiting_fe_design_system.md` |
| `docs/mockups/lo-recruiting-invite-v1/` | Invite-to-Join modal v1 (+ `invite-v1-full.png`) | filesystem |
| `docs/mockups/lo-recruiting-outcome-v2/` | Call-outcome wizard v2 (D51) | filesystem |
| `docs/mockups/lo-recruiting-permissions/` | Permissions matrix screen | filesystem |
| `docs/mockups/lo-recruiting-pipeline/`, `lo-recruiting-kho/`, `lo-recruiting-conversation/` | Pipeline, HOT/COLD stock, conversation history screens | filesystem |
| `docs/mockups/lo-recruiter-join/` | `join-slug.html` (approved for epic `7mj7`) + `join-condensed-v3.html` / `-en.html` | bead `agentflow-7mj7` |
| `docs/mockups/lo-programs/`, `lo-programs-v4/`, `lo-programs-v7/` | LO Programs / Ambassador / Recruiter public program pages incl. `admin-ambassador.html`, `admin-recruiter.html`, `concepts.html` | filesystem |

---

## B. Known bugs and blockers already recorded

### B.1 Security (highest severity as written)

| Id | Claim | Source |
|---|---|---|
| B1 | `GetOp`/`getAdmins` on packs returns **2,997 admins with keys + permissions to an anonymous caller** — "the master key to impersonate a real admin" | bead `agentflow-ahkx` (P0) |
| B2 | `getLOInfo/{key}` returns a **raw dump of 539 properties of any Admin, anonymously** — incl. SSN, birthday, phone, `soft_pull_credit_password`, company credentials | bead `agentflow-qgzr` (P0) |
| B3 | `execute/GetOp` returns **188 fields anonymously incl. SSN and 4 salary/bonus fields** — and it is a **live path** that cannot be closed, only filtered | bead `agentflow-yth5` (P0) |
| B4 | Same root cause reaches `LORecruiting`: anonymous, any origin, sequential enumeration of the entire candidate list — names/email/phone/NMLS **plus `url_signing_sessions` = live signing links** | `docs/lo-recruiting-invite-to-join-design.md` §9 |
| B5 | `document-esign` `EsignEnvelopeController` has **no permission check at all** — read other people's envelope + fill-data + audit trail, and **cancel** them | bead `agentflow-snyp` (P1) |
| B6 | document-esign PR #21 as written "only works when the caller is NOT authenticated" — 9 CONFIRMED correctness defects, unanswered | `recruit-be/docs/BACKLOG.md` V1.1; bead `agentflow-zmg1` |
| B7 | `packs` referral ops: 14/15 ops in `op/referral` declare **empty `@RequiresPermissions`** = no role check; 3 admin-console referral ops ungated so any logged-in user can send company email/SMS invitations | beads `agentflow-l9w1`, `agentflow-1sh5`; `reference_packs_requirespermissions_empty.md` |
| B8 | omni + recruit-be `/public` routes **bypass gateway auth and every rate-limit tier** — unbounded offline-speed guessing of `COMM_HOOKS_ACCESS_TOKEN` | bead `agentflow-vdu3` |
| B9 | recruit-be prod pod uses the **shared GSA `moso-svc@lender-rate`** holding `container.admin` + `clusterAdmin` + `storage.admin` + `pubsub.admin` ⇒ RCE in recruit-be = cluster takeover. Staging separated 09/09, **prod not** | `reference_recruit_prod_release_state.md` |
| B10 | `AIAPI.executeOp` has no op-name allowlist and **no rate limit**, and the op is not idempotent ⇒ N calls = N emails to the same candidate, and `waive_startup_fee` can be set directly at packs, bypassing D-I7 | `lo-recruiting-invite-to-join-design.md` §9 |
| B11 | A transient 503 locks an **empty permission set** into a 5-minute cache with no self-heal; and a single failed read of `/admin/rbac/me` **opens all 19 permission gates** (fail-open) | beads `agentflow-sung`, `xlav`, `85fz` |

### B.2 Data-loss / correctness

| Id | Claim | Source |
|---|---|---|
| B12 | `offers` has **no unique constraint**, and dedup merge bulk-re-keys all of the loser's offers blindly ⇒ survivor ends with 2 offers ⇒ every webhook throws `NonUniqueResult` ⇒ 500 ⇒ packs retries forever ⇒ **record frozen permanently**, and the candidate can never be invited again. *"Bug này tồn tại HÔM NAY"* | `lo-recruiting-invite-to-join-design.md` §6 B2; beads `agentflow-wm1a`, `gija` |
| B13 | `OfferService` is a hard-assert state machine; the webhook carries a **target state**, not a transition — so either it throws (rolling back the whole `@Transactional` event and **permanently losing every profile change in that payload**, repeated **daily** by `UpdateUnresponsiveILOsCronOp`) or it self-approves offers Victoria never saw | `lo-recruiting-invite-to-join-design.md` §6 B1 |
| B14 | `RequestOfferRequest.compBandId` is `@NotBlank` while `comp_bands` is an **empty shell table** ⇒ the endpoint cannot be called at all | `lo-recruiting-invite-to-join-design.md` §6 B3; bead `agentflow-gery` (closed) |
| B15 | **Migration `V047` duplicate number = P0 landmine**; `V048/V049` sit below an already-applied `V050` | `docs/recruit-attribution-sequence-critique.md` §A1, §A2 |
| B16 | `event_id` has no minting rule ⇒ the dedup path (A) blocks nothing | `recruit-attribution-sequence-critique.md` §B1 |
| B17 | `TRANSFER` / `CLAIM` are inert — **a wrong first row is unfixable** (heaviest design flaw in the critique) | `recruit-attribution-sequence-critique.md` §B2 |
| B18 | Stop-on-reply is gated on a signal **no machine produces** — P0 | `recruit-attribution-sequence-critique.md` §C1 |
| B19 | `SequenceEnrollmentServiceImpl`'s "race-safe backstop" is **dead code** — no flush, so the catch never runs | bead `agentflow-9gdj` |
| B20 | Contact log records **the click, not the send**: 51/51 CALL/SMS/EMAIL rows have no content; the "candidate replied so stop reminding" branch is **dead code** (INBOUND: 4 read sites, 0 write sites) | bead `agentflow-yfzq` |
| B21 | `INTERNAL` flag on activities is **written in 9 places and never read** — internal notes are exposed to everyone | bead `agentflow-wzcz` |
| B22 | 2 of 3 candidate-creation paths write **no genesis event** ⇒ GET returns 500; V081 only patched the old population | bead `agentflow-6amw` |
| B23 | Import has **no within-batch dedup** — one person produced 19 rows in a single batch; 39% of stock is in duplicate-email groups and nobody has ever merged | bead `agentflow-9kcx` |
| B24 | Logging one call outcome **discharges a newer unlogged call** to the same candidate (single-slot `pending_call_at`) | bead `agentflow-edgk` |
| B25 | Call result + Follow-ups panel create **duplicate follow-ups** (2 OPEN rows) | bead `agentflow-pn9i` |
| B26 | `materializeOffer` looks up offers by `candidate_id` **without filtering status** ⇒ silently picks the wrong row | bead `agentflow-wm1a` |
| B27 | Existing-ILO race: recruiter FK is preserved correctly (first-touch) but **3 descriptive fields get overwritten** (wrong) | bead `agentflow-y60m`; `lo-recruiter-join-test-plan.md` §3.4 (test case C exists to expose it) |
| B28 | packs 3.63.1 prod: `SyncLORecruitingToRecruitHandler` places the anti-duplicate flag **before** `addTask`, so if `addTask` throws it **swallows every save for that row for 60s, silently, on the bonus-accounting write path** | bead `agentflow-71hs` |
| B29 | `ModexCandidateMapper.asInteger/asBigDecimal` swallow `NumberFormatException` with no log — malformed numeric fields silently dropped | bead `agentflow-pkju` |
| B30 | `CandidatePhoneNormalizationBackfillStep` is a singleton `@Component` with mutable instance fields — concurrent triggers corrupt each other | bead `agentflow-xh7b` |

### B.3 Compliance (TCPA / suppression)

| Id | Claim | Source |
|---|---|---|
| B31 | **Prod migration BLOCKED** — opt-out under-suppression: `SMSOptOut` not migrated and ILO STOP was reverted | bead `agentflow-i2px` (P0, in progress) |
| B32 | MOSO suppression does **not** propagate in realtime to recruit — TCPA exposure not yet measured | bead `agentflow-tfei` (P0) |
| B33 | **Webinar registration email passes through no suppression gate at all** — two separate beads for two adjacent doors | beads `agentflow-ct7o`, `agentflow-eiqn` |
| B34 | An invite can be SKIPPED forever because suppression never becomes resend-eligible even after the block is lifted | bead `agentflow-a0o7` |
| B35 | `STOPALL` is missing from one of the two opt-out keyword lists (packs TwilioHook vs omni) | bead `agentflow-ypg5` |

### B.4 omni / messaging

| Id | Claim | Source |
|---|---|---|
| B36 | **Any recruiter on the cast can read the candidate's messages, and nobody can read them back** (one-way loss) | bead `agentflow-rvzx` |
| B37 | omni SMS: a permanent send failure (zoom-go E.164 reject) is retried 8× then bounced, but the composer shows "Sent"/"Sending" and never surfaces the bounce | beads `agentflow-wapn`, `mtwd` |
| B38 | **Inbound SMS misroutes to LOAN** because the company shares one number — outbound was wired 09–10 (#281) and works; this is *not* "not wired yet" | `reference_recruit_omni_sms_wired_but_inbound_misroutes.md`; bead `agentflow-144v` |
| B39 | omni PARK tie-break sends a 1v1 candidate-vs-loan collision into the **LOAN** triage queue and drops the candidate fan-out | bead `agentflow-jsk4` |
| B40 | `LO_CANDIDATE` has no `owner_service` binding — and binding is only a misconfiguration guard; the hole closes only when the legacy key is withdrawn | bead `agentflow-k581`; `ask-khai-legacy-key-2026-09-10.md` |
| B41 | omni cast writes succeed **without recording who wrote** — this blocks safely withdrawing the legacy key | bead `agentflow-val0` |
| B42 | omni deployment.yaml lacks `checksum/config`+`secret` annotations ⇒ a config/secret change does not roll the pod ⇒ **token rotation silently fails** | bead `agentflow-jq1v` |
| B43 | recruit outbound SMS is sent from a **shared Zoom account** (Owner Account-Test/zoom_api) rather than each recruiter's own line | bead `agentflow-o2jq` |
| B44 | omni-prod returned 503 on 15/09 (`unread-counts`, `threads`) while recruit-svc on the same gateway/token returned 200 ⇒ omni-prod was down, not auth. **`project_recruit_omni_conversation.md` marks this OBSOLETE — omni prod alive since 21/09** | `reference_recruit_prod_release_state.md` vs `project_recruit_omni_conversation.md` |

### B.5 Timezone / clock

| Id | Claim | Source |
|---|---|---|
| B45 | recruit-fe Today shows the date in UTC while labelling the time GMT+7 on the same screen ⇒ "today" is off by one day | bead `agentflow-5a9t` |
| B46 | `/today` bucket-0 sorts by cross-day instant — deviates from D51 ③ and nobody had noticed | bead `agentflow-4o34` |
| B47 | 4 `ZoneId.systemDefault()` call sites must read a business timezone from settings | bead `agentflow-6o47` |
| B48 | next-intl has no `timeZone` configured — `format.dateTime` renders in the server runtime zone (UTC) | bead `agentflow-7gl0` |

### B.6 Old-system defects recorded for the rebuild

| Id | Claim | Source |
|---|---|---|
| B49 | Stats panel skew of **~8 days** is a constant in code: statistic op cache TTL = 691,200s | `e2e-flow.md` §8.6; `redesign-direction.md` §1 |
| B50 | The search box is a **label picker** — picking a suggestion filters by `?labels=` and returns "No results", so users create duplicates | `lo-recruiting-feature-review.en.md` §10 item 6; `meeting-prep-victoria.md` §4 claim 3 |
| B51 | **Every role with LO Recruiting can open General Settings**, including the Calendly personal access token tab | `lo-recruiting-feature-review.en.md` §10 item 1; `redesign-direction.md` P1-10 (staging 6/7, production 7/7) |
| B52 | Impersonation swaps the whole browser session with **no "back to admin"** | `lo-recruiting-feature-review.en.md` §10 item 3 |
| B53 | Staging **sends real external email** — testing on a record with a real address risks spamming a real person | `lo-recruiting-feature-review.en.md` §10 item 4 |
| B54 | ILO import always reports **"0 records"** even on success (counter passed by value) | `e2e-flow.md` §8.7 item 3 |
| B55 | The Export button is commented out in code while the server op is still alive — "a feature that exists and doesn't" | `e2e-flow.md` §8.7 item 4 |
| B56 | **5-required-field wall**: editing one field on an existing RLO record forces all 5 fields the system itself created empty, errors revealed one at a time ⇒ the technical reason nobody repairs old data (106,145 records, 102,715 unclaimed) | `meeting-prep-victoria.md` §4 claim 2 |
| B57 | The "Obtained from Modex" tab is **not an integration** — it is a dead CSV import from 24/01/2024 on both staging and production, containing inactive LOs and placeholder contacts | `redesign-direction.md` P0-17 |
| B58 | On a production stats panel, `Claimed + Not claimed = 102,726` vs `Total 106,145` — a **3,419 discrepancy on the same panel** | `meeting-prep-victoria.md` §5 |

### B.7 Process / deployment blockers

| Id | Claim | Source |
|---|---|---|
| B59 | recruit followup-be bridge is **not connected to production** — the entire follow-up/reminder feature is dark on prod | bead `agentflow-gbto`; `project_recruit_prod_gaps.md`; meeting reminder bead `agentflow-vcvs` |
| B60 | recruit-be has **no packs ApiKey** ⇒ the webinar registration write path is dark in every environment | bead `agentflow-qk1t`; `reference_packs_staging_key_selfserve_op_not_deployed.md` |
| B61 | recruit-be CI runs `test integrationTest`; `./gradlew test` alone skips ITs ⇒ green locally, red in CI | `reference_recruit_be_ci_runs_integrationtest.md` |
| B62 | recruit-be CI runs AspectJ `compileJava` on **stale bytecode** ⇒ a regression can ship green | bead `agentflow-iuuv` |
| B63 | A new migration without regenerating `docs/SCHEMA.md` turns CI red (`SchemaDocFreshnessTest`) | `reference_recruit_be_schema_doc_freshness.md` |
| B64 | `helm upgrade` in CI lacks `--wait`, so green CI **does not prove the pod rolled**; and two parallel deploys fight over the Helm lock | beads `agentflow-42e5`, `w85v` |
| B65 | Approving an `lo_recruiter` application does **not** grant a landing page — the role in MOSO decides, contrary to what Bao decided on 11/09 | bead `agentflow-e4kf` |
| B66 | A recruiter has **no menu path to `/manage-join-page`** in MOSO — they must type the URL | bead `agentflow-ugns` |
| B67 | 503s on `/follow-ups` come from **two** mechanisms: recurring Postgres-side coldness and a one-time 4–30s first-execution cost paid only by a new pod's first burst | bead `agentflow-a9gs` |

---

## C. Open beads (recruiting / onboarding related)

All rows are from `bd list --limit 0` run in `/Users/apple/Projects/agentflow` on 2026-09-22.
Status legend: `open` = ○, `in_progress` = ◐. (The `●` in the raw listing marks priority, not blocked.)
Area is inferred from the title text.

### P0

| id | title | status | area | one-line scope |
|---|---|---|---|---|
| agentflow-ahkx | getAdmins returns 2,997 admins + keys to an anonymous caller | open | BE/packs | close the anonymous admin-enumeration door |
| agentflow-qgzr | `getLOInfo/{key}` dumps 539 properties of any Admin anonymously | open | BE/packs | stop PII dump incl. SSN/credentials |
| agentflow-yth5 | `execute/GetOp` returns 188 fields anonymously incl. SSN + salary | open | BE/packs | filter a live path that cannot be closed |
| agentflow-i2px | prod migration BLOCKED: opt-out under-suppression (TCPA) | **in_progress** | BE/data | migrate `SMSOptOut`, restore ILO STOP |
| agentflow-tfei | measure TCPA exposure: MOSO suppression not realtime to recruit | open | BE/integration | quantify the gap |
| agentflow-f760 | runbook + real preconditions for the MOSO suppression bulk import on prod | open | ops | make the import safe to run |

### P1

| id | title | status | area | one-line scope |
|---|---|---|---|---|
| agentflow-f1gi | **Invite to Join epic** — the close button (V1 / PA-1) | open | FE+BE | 8 pieces; `hj93` still open |
| agentflow-7mj7 | **EPIC `/join/<slug>`** per-recruiter LO recruiting page | open | FE (lf-homepage) | two form modes + attribution |
| agentflow-egzn | lf-homepage route `/join/[slug]` + `/join/[slug]/apply` | **in_progress** | FE | the two-mode form itself |
| agentflow-lkyg | **URGENT**: recruiter edits LO info + 3-way sync (recruit ↔ legacy ↔ HR) | open | FE+BE+arch | FE edit form (A) + sync architecture (B) |
| agentflow-p1qm | lkyg P2: recruit→packs writeback (outbox + echo-fence, dark) | open | BE+packs | `SaveLORecruitingFromRecruitOp` on 3.62.1 |
| agentflow-ikp5 | bonus-attribution contract: ambassador + LO recruiter → recruit app | open | BE/arch | freeze the data contract before the move |
| agentflow-3sad | ikp5/A SOURCE-CONTRACT: payload emitter, surrogate at landing, slug→alias | open | BE | versioned alias table, superseded never deleted |
| agentflow-rikq | ikp5/C RECORDING: reshape `referrals` in 3 places | open | BE/data | add PROGRAM+ROLE axes, de-anchor `referring_lo_id` |
| agentflow-dvdl | ikp5/D RECORDING: first-touch projection service with tests, then wire `MosoRowMapper` | open | BE | bring the referrer identity through, last |
| agentflow-qbup | ikp5/E PAYOUT (gated on 2 departmental decisions) | open | BE | active-referrer filter, 60d maturity, 2-sided eligibility |
| agentflow-p7ya | LEAD adjudication — bonus attribution contract (child of ikp5) | open | design | do not overwrite ikp5 |
| agentflow-5jka | LEAD critique: attribution recording (6 holes) + sequence engine (6 holes) + V048/V049 | open | design | the critique itself |
| agentflow-eov0 | LEAD dispatch plan 09/09: ready vs blocked, 3 blocked groups | open | planning | backlog triage |
| agentflow-jqpu | GATE before sequence-engine go-live (#253/#254) | open | BE | close 2 HIGH + 3 MEDIUM before prod-route/auto-send |
| agentflow-m1nv | e-sign → offer auto-flip to SIGNED | open | BE | replace the manual button, half of the Joined gate |
| agentflow-zmg1 | **BLOCKER** E-sign recruit: document-esign#21 opens 7 holes, 2 are security | open | BE/other repo | answer the 14 review comments |
| agentflow-snyp | document-esign `EsignEnvelopeController` has no authorization | open | BE/other repo | read + cancel other people's envelopes |
| agentflow-gbto | recruit followup-be **not connected to production** | open | infra | whole follow-up feature dark on prod |
| agentflow-vcvs | remind Bao Monday 21/09: meeting with Huy about wiring followup-be to prod | open | ops | scheduling |
| agentflow-o2ee | recruit prod: omni not wired — conversation fully dark on production | open | infra | base-url, internal key, host_subjects |
| agentflow-9qps | recruit↔omni: verified on staging, dark on production — measure gap + ordering | open | infra | the ordered plan |
| agentflow-k581 | omni `LO_CANDIDATE` has no `owner_service` binding | open | BE/omni | binding is a guard; the hole needs the legacy key withdrawn |
| agentflow-rvzx | any recruiter on the cast can read candidate messages, nobody can read back | open | BE/omni | visibility + retrievability |
| agentflow-wapn | omni SMS permanent failure retried 8× then bounced, UI still says "Sent" | open | FE+BE | surface the bounce |
| agentflow-o2jq | outbound SMS sent from a shared Zoom account, not the recruiter's line | open | infra | OAuth-connect the recruiting line |
| agentflow-qk1t | recruit-be has no packs ApiKey: webinar registration write path dark everywhere | open | infra | issue the key with `Permission.RECRUITING` |
| agentflow-ct7o | webinar registration email passes no suppression gate | open | BE | TCPA |
| agentflow-eiqn | the webinar signup path sends mail with no suppression gate (adjacent door) | open | BE | TCPA |
| agentflow-ujk2 | omni outbound SMS gate: refuse compose/reply to a suppressed number | open | BE/omni | owner-approved design |
| agentflow-k0ed | recovery path for a lost opt-out publish (reconciliation read of `comm_suppression`) | open | BE | shape proposal, not approved |
| agentflow-15q3 | suppression check belongs in a packs op (covers every caller) | open | packs | not recruit-only |
| agentflow-1sh5 | packs: 3 referral admin-console ops ungated | open | packs | any logged-in user can mail/SMS as the company |
| agentflow-l9w1 | packs: 14/15 `op/referral` ops declare empty `@RequiresPermissions` | open | packs | needs author intent before testing |
| agentflow-t9h4 | packs: translate referrer FK → `central_account_id` on export | open | packs | so genesis credits the recruiter, not COMPANY_LEAD |
| agentflow-e4kf | approving an `lo_recruiter` application does not grant a landing page | open | BE/MOSO | contradicts Bao's 11/09 decision |
| agentflow-wm1a | `materializeOffer` picks the wrong offer row (no status filter), silently | open | BE | correctness |
| agentflow-wzcz | `INTERNAL` on activity written in 9 places, never read | open | BE+FE | internal notes leak |
| agentflow-yfzq | contact log records the click, not the send; INBOUND branch is dead code | open | BE | 51/51 rows with no content |
| agentflow-imqn | hand-raise channel read from sticky flags, not from the raise (FB returners get 24h not 1h) | open | BE | SLA correctness |
| agentflow-jip5 | HOT stock — 4/5 channels still lack a producer + 3 ops tasks before prod | **in_progress** | BE | HOT is empty by definition today |
| agentflow-v1jv | EPIC recruiting-be Candidate core API (Phase 1) | **in_progress** | BE | transfer/coverage, nurture, checklist S6, referrals, settings, field masks |
| agentflow-a90 (+.1–.4) | LFIQ Onboarding API — Foundation (enum, JSONB POJO, entity, migration) | open | BE (lf-iq) | different product |
| agentflow-dve0 | Ambassador + LO Recruiter round 2 — waiting on Thuan's 15 answers | open | product | blocked on a person |
| agentflow-x9sh | imkhai: withdraw the borrowed omni-deploy key + grant `pubsub.publisher` to recruit-be@ | open | infra | 0 bindings today |
| agentflow-0tpc | packs two-branch drift (master 384 commits unshipped, 3.62.1 79 hotfixes not via PR) | open | packs/ops | triage measured 09/09 |

### P2 (recruiting/onboarding subset)

| id | title | status | area |
|---|---|---|---|
| agentflow-ehl6 | EPIC recruit timeline unification: compose-on-read + Call Result in Conversation modal | open | FE+BE |
| agentflow-gg2w | Conversation History page for the Recruiter Manager (Victoria) | **in_progress** | FE |
| agentflow-8pqy | recruit-be ↔ ai-hr-be ripe-LO → HR account-creation handoff | **in_progress** | BE cross-service |
| agentflow-g12o | recruit-be ← HR: subscribe the `HR_ASSOCIATE_*` feed | open | BE |
| agentflow-2jga | rebuild recruit reporting — count OUTCOMES, not sends (Bao: tear it down) | open | BE+FE |
| agentflow-zifc | `/today` should show only work that is DUE (reverses D50) | open | BE+FE |
| agentflow-ibh8 / agentflow-pks7 / agentflow-maif | "Send documents" / "Send info" card = email template containing a public-page link | open | FE+BE |
| agentflow-sf5r | automatic SMS for invitations — BLOCKED until inbound routing + per-number consent | open | BE |
| agentflow-hj93 | invite 8/8: 24h SLA on `PENDING_APPROVAL` + reminder, no auto-approve | open | BE |
| agentflow-bax0 | `OfferServiceImpl.approve()` does not check approver ≠ requester | open | BE |
| agentflow-uxzg | `reconcileFromLegacy` money conflicts only logged — should be queryable | open | BE |
| agentflow-rzcq | `PUT /candidates/{id}` ignores ownership — anyone can redirect someone else's contact channel | open | BE |
| agentflow-9kcx | import has no within-batch dedup; 39% of stock is in duplicate-email groups | open | BE |
| agentflow-j2ji | dedup materialize group-by-on-read will not survive 106k production rows | open | BE |
| agentflow-q0k9 | staging lacks data to test HOT / Exceptions / SLA (5,274 of 5,277 S0 rows are IMPORT) | open | data |
| agentflow-qxf7 | recruiter on vacation: owned leads vanish from HOT and Exceptions; clock not paused per person | open | BE |
| agentflow-rhfr | FB ads re-raise: an existing person is invisible to HOT from the very first submission | open | BE/packs |
| agentflow-ojek | only `RegisterInterestedLoanOfficer` stamps the hand-raise clock — every other channel leaves existing people out of HOT | open | packs |
| agentflow-avqr | ask packs for event id + event time on LORecruiting — the only way to tell a real hand-raise from a MOSO save | open | packs |
| agentflow-y60m | existing ILO: recruiter FK preserved (right) but 3 descriptive fields overwritten (wrong) | open | BE |
| agentflow-144v | recruit/omni cast-only kills triage — SMS from a candidate's own number can never route | open | BE/omni |
| agentflow-8lxv | candidate email reply-in routes by sender address, not by token | open | BE |
| agentflow-g9rc | `cand` mapping created on staging; Workspace routing rule `^cand-.*` still missing (+ all of prod) | open | infra |
| agentflow-jblm | zoom-go: internal line→line SMS dedup merges sent+received; direction to omni is non-deterministic | open | infra |
| agentflow-jsk4 | omni PARK tie-break sends candidate-vs-loan collisions to LOAN triage | open | omni |
| agentflow-val0 | omni cast write success does not record who wrote it | open | omni |
| agentflow-vdu3 | omni + recruit-be `/public` routes bypass gateway auth and rate limits | open | security |
| agentflow-jq1v | omni deployment lacks config/secret checksum annotations ⇒ token rotation silently fails | open | infra |
| agentflow-mtwd | omni-react composer shows "Sent" for a bounced SMS (shared package, tera-fe owner) | **in_progress** | FE |
| agentflow-0926 | Phase 2 (D110 hole): an elevated actor off-cast cannot author a note on omni | open | BE/omni |
| agentflow-ybbv | Q60 omni triage: nobody can open the queue; 3 options reduce to one decision | open | product |
| agentflow-6wwx | full terrain of the owner-only follow-up wall — 3 blocking layers + 3 to clarify | open | BE |
| agentflow-pn9i | Call result + Follow-ups panel create duplicate follow-ups | open | BE |
| agentflow-q3vr | `CandidateDrawer:339` says "no follow-up" when the read fails | open | FE |
| agentflow-yu5q | add `error.type FOLLOWUP_NOT_CONFIGURED` so FE can tell "off" from "down" | open | BE |
| agentflow-8yfo / agentflow-eoqn | 14 screens check `.error` but ignore `http_code` — 503/502 read as "no data" | open | FE |
| agentflow-85fz | one failed `/admin/rbac/me` read opens all 19 permission gates, silently | **in_progress** | FE |
| agentflow-sung / agentflow-xlav | a transient 503 caches an empty permission set for 5 minutes with no recovery | open | FE |
| agentflow-pddw | `CentralDirectoryClient` throws 401 for a server programming error; FE reads it as logout | open | BE |
| agentflow-ltt8 | `preferred_languages` returns the ordinal enum instead of the language name (11/12 prod recruiters) | open | BE |
| agentflow-atdc | leave-then-late-join race leaves a grant nobody revokes | open | BE |
| agentflow-zlkj | SSO recruit-fe: only remaining defect is the missing http→https ingress redirect (also on PROD) | open | infra |
| agentflow-glly | seed `app_code=RECRUIT` into the auth-service app catalogue | open | infra |
| agentflow-d2c4 | consolidate staging recruit into one namespace `recruit-stg` + prepare recruit-prod | open | infra |
| agentflow-ioc6 | branch protection: master closed on both repos; `production` still `strict=false` | open | ops |
| agentflow-7voh | alert/metric on the webhook listener's 401 rate (catch silent key-rotation drop) | open | BE |
| agentflow-90ok | multi-source provenance for `CallOptOut` — the label records only one source | open | BE |
| agentflow-vg1c | rename `SuppressionType.STOP_SMS` — it is per-channel opt-out, not SMS-only | open | BE |
| agentflow-c1kk | packs-writeback outbox backlog observability before go-live | open | BE |
| agentflow-71hs | packs 3.63.1 PROD: `SyncLORecruitingToRecruitHandler` swallows saves for 60s silently | open | packs |
| agentflow-b66u | Ambassador apply modal chip "you currently have N referrals" — threshold exists, the count does not | open | FE |
| agentflow-nktr | Ambassador standing bridge to ALLY + 10-event email flow | open | BE |
| agentflow-ld4y | `POST /lo-programs/applications` is public and lets a caller name ANY `user.key` with ANY email | open | security |
| agentflow-ugns | recruiter has no MOSO menu entry to `/manage-join-page` | open | FE/MOSO |
| agentflow-ld0x | lf-homepage `.lop .num` card rule from join v3 leaks into the admin queue | open | FE |
| agentflow-qm75 | D7 hardening: `ADMIN_OVERRIDE` note enforced at only 1 call site | open | BE |
| agentflow-ovws | recruit-fe test reconciling `PERMISSION_GROUPS` with the BE `RecruitPermission` enum | open | FE |
| agentflow-505y | `/permissions` UI/UX out of line with the rest of recruit-fe | open | FE |
| agentflow-pn2k | rotate the PAT and remove the token from the git remote URL in both repos | open | security/ops |
| agentflow-qgsd | revert staging `recruiter_zoom_link` for manhadmin after omni SMS testing | open | ops |

### P3 / P4 (recruiting subset, abbreviated)

`agentflow-475w` (show "who opened this conversation"), `agentflow-4o34` (/today bucket-0 cross-day sort),
`agentflow-6amw` (2/3 candidate-creation paths write no genesis event → 500), `agentflow-edgk`
(one call outcome discharges a newer one), `agentflow-eey3` (single `/transfer` has the same
getById-before-permission oracle as bulkTransfer), `agentflow-ejg2` (Audit screen cannot tell
"not recorded" from "nothing happened"), `agentflow-gija` (dedup merge does not catch
`DataIntegrityViolationException` on bulk offer re-key), `agentflow-je1n` (3 permissions + 1 role in
no grant), `agentflow-jlkw` (verify async-then-navigate `sms:`/`zoomphonecall:`/`mailto:` in a real
browser), `agentflow-jx36` (checklist API follow-ups), `agentflow-me3i` (`created_date` invariant on
`referral_attribution_events`), `agentflow-mnoz` (turn on the tera audit outbox — no event has ever
left the app), `agentflow-nlwe` (merged-key push → suggest missing fields), `agentflow-pkju`
(`ModexCandidateMapper` swallows `NumberFormatException`), `agentflow-q1z1` (missing `X-User-ID`
returns 500 on 9 endpoints), `agentflow-rbfo` (`OfferApprovalRule` broken setting → 500 instead of
graceful REVIEW), `agentflow-rle9` (null anchors → NPE in `hot()`), `agentflow-sa6n` (unbounded
page/size → 500), `agentflow-spus` (6 orphan javadoc blocks), `agentflow-tdh2` (rename
recruiting-be → recruit-be in omni-service), `agentflow-tit0` (GOTCHAS bead codes), `agentflow-u919`
(unit-test `TodayClient.onSendInfo`), `agentflow-w8eq` (stale `V080` reference), `agentflow-7jev`
(Meet 1-1 full auto-calendar — future), `agentflow-b9pc` (ask Duyen/Seth: how does a recruiter hire
from **outside** the company?), `agentflow-4qbo`, `agentflow-4iug` (observer-grant safety net,
design blocked on prod — cron inert), `agentflow-lyi3`, `agentflow-gfg8`, `agentflow-m5o1`,
`agentflow-gnoz`, `agentflow-3iah` (SYSTEM rows on the omni timeline — blocked), plus the LFIQ
Onboarding API sub-beads `agentflow-1ot(.1–.3)`, `agentflow-pzg(.1–.2)`, `agentflow-1yo.2`.

**Counts:** `bd list --limit 0` reports **404 issues total (368 open, 34 in progress)** across all
projects. The recruiting/onboarding-related subset captured above is **~150 beads**.

---

## D. Recorded decisions and constraints

### D.1 Branch workflow and deploy

| Constraint | Source |
|---|---|
| **recruit-be / recruit-fe: two-tier.** `master` **IS** the staging environment; merging a PR **IS** a deploy. `production` is prod. `release`, the `staging` pointer branch, `-rel` branches, twin cherry-picks and the `staging-drift` job are all **deleted**. | `project_recruiting_branch_workflow.md`; D97 |
| Every feature = **one PR into `master`**, self-merged, only when green. `ci.yaml` on `pull_request` is the **only** fence. | `project_recruiting_branch_workflow.md` |
| **Feature flags are mandatory** — promoting master→production is all-or-nothing. | `project_recruiting_branch_workflow.md` |
| Branch protection ON for all 4 branches since 07/09: required check = `Tests`, no required review (to preserve self-merge), force-push and delete blocked, conversation resolution required, `enforce_admins=true`, `strict=true` on `master` only. | `project_recruiting_branch_workflow.md` |
| Rollback is no longer cheap — revert commit + merge a revert PR, or pin the old `master-<sha>` image. **Never force-push `master` backwards.** | `project_recruiting_branch_workflow.md` |
| **packs**: code is born on `master` (staging) first, then a narrow port to the prod branch. The prod branch **rolls with the release** (3.62.1 → 3.63.1); a hotfix must merge in parallel to master + hotfix branch. | `reference_packs_master_before_3621.md`; `reference_packs_prod_branch_rolls_hotfix_needs_master.md` |
| **lf-homepage** (since 22/09): branch from `master`, PR into `master` (deploys STAGING), then PR `master` → `production`. The `release` branch was deleted (tag `archive/release-2026-09-22`). | project `CLAUDE.md`; `project_lf_homepage_branch_workflow.md` |
| lf-homepage + moso-aid **auto-deploy staging** via a Cloud Build trigger on `master` that lives outside the repo. | `reference_lfh_mosoaid_staging_autodeploy.md` |
| Before reading/diagnosing any repo: `git fetch` first and read the latest base branch. A local checkout is often many commits behind. | project `CLAUDE.md` Rules |

### D.2 Merge authority

| Constraint | Source |
|---|---|
| **Rule 1** — never report "blocked waiting for someone to issue a key/account" before double-checking whether you can self-serve. Staging is near full-permission: you can mint keys, create accounts, set SystemProps, trigger SWAT. | `feedback_recruit_merge_authority.md` (Bao 13/09, restated 15, 17, 21, 22/09) |
| **Rule 2** — every recruit-be / recruit-fe PR: **you may merge**. (22/09 restatement drops the 2-reviewer precondition for recruit; the 15/09 version kept it.) | `feedback_recruit_merge_authority.md` |
| **Rule 3** — PRs in other repos (packs, moso-aid, tera-*, omni-service, lf-*, document-esign, api-gateway-v2) may be merged **only if** (a) no blast radius on other apps in the ecosystem, (b) not a fix-here-break-there, (c) a "Repo Owner" agent for that repo has reviewed and agreed. | `feedback_recruit_merge_authority.md` |
| **Rule 4** — ≥2 independent reviewers per side, on **every** PR including FE; extended 21/09 from "PR" to "every SOLUTION/DESIGN" — ≥2 agents must debate and **agree** before implementing. | `feedback_recruit_merge_authority.md` |
| **No agent trusts another agent.** A subagent's output is **data, not truth** — pull the code and read the file yourself. | `feedback_recruit_merge_authority.md`; MEMORY.md index |
| **packs**: even after two independent review rounds, **only open a PR** — Bao sends it to the owner and merges. (Partly superseded: Rule 3 now allows merging packs PRs that satisfy all three conditions.) | `feedback_packs_pr_only_no_merge.md` vs `feedback_recruit_merge_authority.md` — see §E |
| Production merges: `feedback_production_merge_authority.md` (per MEMORY.md, Bao 22/09) allows self-merging production **after a Repo Owner agent approves**, replacing the older "wait for Bao to click" rule; must re-measure after deploy so the image tag = the SHA. | MEMORY.md index |

### D.3 Architecture and platform

| Constraint | Source |
|---|---|
| **D01** — recruiting is a **separate app inside the Tera+ ecosystem**, not a module in the old monolith and not a standalone app. Four reasons: S7 hands off internally, licensing rules need Tera branch data, company stack reality, and today's pain is the God-entity not the shared app. | `DECISIONS.md` D01; `redesign-direction.md` §6 |
| **D02/D03/D05** — repos `recruit-be` + `recruit-fe`; BE = Java 21 + Spring Boot via `com.loanfactory.service-conventions` + tera-core; FE = Next.js 15 + Mantine 8 copied from `account-fe` (explicitly **not** React+Vite). | `DECISIONS.md` D02, D03, D05 |
| **D04** — Flyway owns the schema from day 1, `ddl-auto=validate`. A new field without a migration fails at boot **on purpose**. | `DECISIONS.md` D04 |
| **D06** — GKE + Helm + GitHub Actions; **no Cloud Run** (moso-aid is a historical exception, do not copy). | `DECISIONS.md` D06 |
| **D07** — central SSO answers "who are you"; **RBAC belongs to the app** (`rbac_roles` + `rbac_grants`). Never read authority from the token. | `DECISIONS.md` D07 |
| **D93** — business schedules run on the platform cron service; `@Scheduled`/`@EnableScheduling` are **banned** in recruit-be, with a test enforcing it. | `DECISIONS.md` D93 |
| **D98 / §6 R01** — keep the HTTP webhook + `x-api-key` for packs → recruit-be; do **not** move to Pub/Sub now (Tai proposed Pub/Sub 08/09; both sides and the reversal condition are recorded). | `DECISIONS.md` D98, §6 R01 |
| **D112 / R05** — the reverse direction (`omni-inbound-reply`) **does** use Pub/Sub, and this does **not** reverse R01/D98. | `DECISIONS.md` D112, §6 R05 |
| **D113** — `PUBSUB_PROVIDER=google` and `ENABLED_CLOUD=true` are **one switch, not two**; credentials are Workload Identity, never a key file. Staging CrashLoopBackOff'd on exactly this pair. | `DECISIONS.md` D113; §6 R06 |
| **Init any new project by reading `tera-docs/infrastructure` first** — Khải's 11/09 ruling; it is the platform law (gateway, CI/CD, database, cost). | `project_tera_docs_infrastructure_rules.md` |
| **D49** — the app code is `RECRUIT`; staging `recruit.viet18.com`, prod `recruit.loanfactory.com`; JWT authority is `RECRUIT#<...>`. | `DECISIONS.md` D49 |
| Prod namespace decision (03/09, Khải): stop one-namespace-per-service. Prod = `recruit-prod` in project `lender-rate`; staging consolidates to `recruit-stg` in `lenderrate-master`. **Reality differs** — prod actually runs in `recruit-be` / `recruit-fe-prod`. | `project_recruiting_staging_infra.md` |

### D.4 Product rules

| Constraint | Source |
|---|---|
| Four product principles: **more automation/AI, fewer statuses, fewer steps, everything dynamic**. Proposing a new enum/status or a new manual step is a **red flag** requiring justification. | `feedback_lo_recruiting_product_principles.md` (Bao 12/08) |
| **D16 — two tracks.** Track A (design): mockup → department approval → *then* code that screen. Track B (foundation): scaffold, schema, webhook, service. | `DECISIONS.md` D16 |
| **D22 — one team's feedback never becomes a `remove` in code.** "We don't use this" ⇒ hide by role/stage and flag it, so the later-stage team can still object. | `DECISIONS.md` D22; `FEEDBACK/README.md` |
| **D24 — every operational number is time-effective dynamic config**; a PR that adds an operational constant to code is rejected (CLAUDE.md hard rule #9). | `DECISIONS.md` D24 |
| **D60 — never auto-merge duplicates**; detect + a human clicks merge. | `DECISIONS.md` D60 |
| **D25 — automated sending identity = owner-first → head-of-department → BLOCK + warn.** Never send from an anonymous company identity. | `DECISIONS.md` D25 |
| **D-I2 / D-I3 — keep the legacy business order**: form → pay $100 → 1-1 meeting → sign. The $100 is a filter protecting the Onboarding specialist's calendar (542 meetings produced 71 joins). recruit only **closes**; the LO fills/pays/signs on lf-homepage, which already onboarded 2,601 people. | `lo-recruiting-invite-to-join-design.md` §4 |
| **D-I5/D-I6** — one endpoint, rule evaluated **server-side**; the recruiter never holds `OFFER_APPROVE` and may only move in the **more cautious** direction. | `lo-recruiting-invite-to-join-design.md` §4 |
| **D118 (17/09)** — production volume masking is **removed**; every role sees exact `career_production` / `self_reported_volume`. This **reverses D31**. Code still masks (`EXACT_PRODUCTION_ROLES = Set.of("ADMIN")`) — that is **code debt**, not the desired state. | `project_recruit_production_no_mask.md`; `DECISIONS.md` D118, D119 |
| **D79 — `MANAGER` is global scope in V1; do not build `staff_teams`** (there is exactly one real manager, Victoria). | `DECISIONS.md` D79 |
| **D77 — HR + Accounting get NO seat in V1**; work reaches them by link / omni / another app. | `DECISIONS.md` D77 |
| **D110 (11/09)** — reverses the 04/09 owner-only follow-up rule: elevated actors (owner **or** `REPORT_TEAM`) may **view and edit** anyone's follow-ups, including unowned candidates. | `DECISIONS.md` §4, D110 |
| **D40 / Q48** — Google Workspace tier **does** support attendance tracking, so automated webinar attendance is feasible. | `DECISIONS.md` D40 |
| **MOSO legacy is left alone**: do **not** add auth to an open MOSO endpoint. If a MOSO API returns data unauthenticated, accept the issue, do not "patch" it. | `feedback_moso_legacy_leave_unauth_alone.md` (17/09) |
| Reading a single LO's numbers from MOSO over `execute/GetOp` needs **no key** and Bao/Huy accept this. | `reference_moso_readonly_via_executeop_keyless.md` |
| **Design mockup is required before any UI code.** | `feedback_design_mockup_required.md` |
| Beads is the source of truth for task status; no TodoWrite / markdown TODO lists; `bd remember` instead of MEMORY.md files. | project `CLAUDE.md`; `bd prime` |
| One branch per task `agent/<bead-id>-<short-desc>`, one commit per task `feat: <title> [<bead-id>]`. | project `CLAUDE.md` |
| Work is not complete until `git push` succeeds — mandatory session-close protocol. | project `CLAUDE.md` |
| Artifacts written to a repo / GitHub must be in **English**; user-facing conversation in Vietnamese. | MEMORY.md index (`feedback_write_artifacts_in_english`) |

### D.5 Environment facts that constrain shipping

| Fact | Source |
|---|---|
| **Production runs RBAC + gateway only**; almost every integration is still dark and not promoted. | `project_recruit_prod_gaps.md` (20/09) |
| `RECRUIT_RBAC_ENFORCE=true` on prod since 07/09; 7 people granted 15/09 (victoria=MANAGER, seth/brayan=RECRUITER, dave=HR, dung=LICENSING, miley=ONBOARDING, rosaline=ACCOUNTING). | `reference_recruit_prod_release_state.md` |
| **0 of the 7 granted people had ever logged in** as of the 16/09 audit. | `reference_recruit_prod_audit_0916.md` |
| Prod secret has **only 6 keys** (`DB_*` + `MOSO_WEBHOOK_API_KEY`); `PUBSUB_PROVIDER=none`, no omni base-url/key, no host-subjects token, no follow-up config, no Redis sentinel. | `reference_recruit_prod_release_state.md` |
| Every prod `candidate.owner_id` is NULL ⇒ nobody has done real work on prod. | `reference_recruit_prod_release_state.md` |
| The prod DB time column is `created_date`, **not** `created_at`; the app pod has no psql. | `reference_recruit_prod_release_state.md` |
| Real screen paths: `/today` `/today/focus` `/inbox/hot` `/inbox/cold` `/pipeline` `/exceptions` `/reports` `/templates` `/duplicates` `/dormant` `/audit` `/settings` `/permissions` (`/cold` does not exist). | `reference_recruit_prod_release_state.md` |
| 7 of 18 V001 tables are **hollow shells**: `checklist_items`, `sponsorships`, `referrals`, `sla_policies`, `comp_bands`, `routing_rules`, `licensing_state_rules`. Deleting them deletes the `COMMENT ON TABLE` evidence of the backlog item. | `recruit-be/docs/STATUS.md`; `BACKLOG.md` "DÂY NEO" |
| packs staging: an ApiKey is **self-serve** (Datastore `lenderrate-master` is readable); the URL **must include the namespace** or every op 404s; the remaining blocker is that the key's user must hold `Permission.RECRUITING` in that namespace (staging `5716104026521600` currently has 0 such users). | `reference_packs_staging_key_selfserve_op_not_deployed.md` |
| packs staging GAE redeploy is **self-serve via SWAT** (x.moso.com, build type=deploy). | `reference_packs_staging_deploy_selfserve_via_swat.md` |
| packs `execute/{op}` needs a **subpackage-qualified** op name; "Could not find class" means a wrong name, not "not deployed". | `reference_packs_op_name_subpackage_qualified.md` |
| `PACKS_API_BASE_URL` must be `<origin>/api/ai/v1`, not the bare origin (bare → GAE default handler, GET-only → POST 405). | `reference_packs_api_base_url_needs_api_ai_v1.md` |
| The new `RecruitAPI` requires the actor to be an **active MOSO Admin holding `Permission.RECRUITING` in that environment**, within a **5-minute** time window — otherwise 401 fails the whole action. A recruit RECRUITER/MANAGER role does **not** imply MOSO permission; nothing syncs the two. | `reference_recruit_webinar_end_to_end.md` (22/09) |
| Sending mail through MOSO does **not** require creating a Template entity — `blank_email_with_signature` renders a caller-supplied body. | `reference_moso_blank_email_caller_supplies_body.md` |
| `Bean.keyName()` ≠ `key()`: for `Admin` the raw name **is the email**; FKs store keyName while callers outside packs hold the key ⇒ mixing them returns empty **silently**. | `reference_moso_keyname_vs_key.md` |
| recruit-be genesis wiring: the `referrer` FK from packs is an **email** (LORecruiter keyName) and must be translated to central **before** `resolveOrMint`; `owner` is translated via `ownerMap`, the referrer is **not**. | `reference_recruit_genesis_referrer_namespace.md` |
| `registerWebinar` and `registerLoanOfficer` run the **same** op (`RegisterInterestedLoanOfficer`) — changing the endpoint does not create a second pipeline and does not break dedupe/attribution. | `reference_registerwebinar_same_op.md` |
| packs ↔ HR is a **live, echo-safe two-way sync** on `ai-hr-be` `origin/master`; local checkouts run ~1000 commits behind and miss it. | `reference_packs_hr_live_twoway_sync.md` |
| Ally app tokens are **not** interchangeable with lf-iq / LOL tokens; the official exchange is `POST /api/posts/v1/auth/sso/token`. lf/lo-homepage have **no real auth** — `x-moso-user-id` presence is not authentication. | `reference_ally_recruiting_integration.md` |
| moso-aid + lf-homepage keep secrets **in plaintext** in the Cloud Run env revision — anyone with project Viewer can read them. | `reference_moso_cloudrun_secrets_plaintext.md`; bead `agentflow-o75w` |
| `@loanfactory-inc/omni-*` live on GitHub Packages; the default `gh` token has no `read:packages`, and recruit-fe CI runs `npm ci` ⇒ the token is mandatory. `omni-core` and `omni-react` must be published in **lockstep** at the same version. | `reference_recruit_omni_npm_token.md`; `reference_tera_fe_omni_publish_lockstep.md` |

---

## E. Contradictions between documents

| # | Source A | Source B | The disagreement |
|---|---|---|---|
| E1 | `lo-recruiting-e2e-flow.md` §0/§2 — **8 stages S0–S7** | `lo-recruiting-redesign-direction.md` §4.2 — **5 stages** (Sourced / Contacting / Engaged / Onboarding / Active LO) + detached milestones | Two lifecycles two days apart, never reconciled in writing. The code (per `STATUS.md` / beads) talks in S0–S7. |
| E2 | `e2e-flow.md` §4 RBAC table: *"Soạn & gửi offer, e-sign → Recruiter ❌, HR ✅"* | `lo-recruiting-invite-to-join-design.md` **D-I10**: *"Recruiter là người bấm nút ① — đảo một hàng RBAC của e2e-flow… Đây là thay đổi có ý thức, không phải bỏ sót"* | Explicit, acknowledged reversal. The invite design wins (15/09). |
| E3 | `lo-recruiting-invite-to-join-design.md` **D-I1**: fee is an **independent axis** | same doc **D-I7**: waiving the fee **always** forces REVIEW | The doc names the tension itself in §12: *"D-I1 ↔ D-I7 … Nếu sau này thấy vướng, D-I7 là cái nhường."* |
| E4 | `lo-recruiter-landing-pages-brief.md` §3 — build a `recruiter_pages` slug registry | same doc **Appendix A** (31/08): *"§3 của brief này (tự dựng sổ đăng ký slug) là THỪA. Hệ cũ đã có sẵn toàn bộ vòng đời slug"*; bead `agentflow-7mj7`: *"slug = local-part của company_email … Không đẻ bảng mapping"* | The brief's own appendix retracts its body. The bead records the final decision. |
| E5 | `lo-recruiter-landing-pages-brief.md` / bead `7mj7` — `/join/<slug>` is a **recruiter lead-capture landing page** | `project_lfh_join_webinar_form.md` (09/09): *"`/join/<slug>` của lf-homepage giờ là form đăng ký webinar hằng tuần (không phải form thu lead)"*, shipped PR #2420/#2421 | The URL was repurposed. Anyone reading only the August brief will build the wrong thing. |
| E6 | `join-slug-attribution-contract.md` — the document repeatedly **corrects itself**: §"ĐÍNH CHÍNH PHẠM VI TRƯỚC ĐÃ — route này CHƯA LIVE", "Lượt 2 — ⚠️ TRƯỚC HẾT: TÔI ĐÍNH CHÍNH CHÍNH TÔI", "Lượt 5 — ĐÍNH CHÍNH của tôi về điều kiện hoãn" | itself | A 5-round self-debate. Only the **last** round of each thread is safe to quote; earlier rounds are explicitly marked wrong by the author. |
| E7 | `lo-recruiting-invite-to-join-design.md` §11 records Version 1 claiming *"?key= is inherited, not newly created"* | §9 of Version 2: *"sai: hôm nay recruit chưa phát tán key nào; thiết kế này bắt đầu chủ động email nó ra ngoài"* — plus the real hole is an IDOR that needs no key at all | Version 1 of the same document is retained as a list of 9 errors precisely so they are not repeated. |
| E8 | packs comment *"receiver's check is not live yet"* and `recruit-be/docs/MOSO-REALTIME-INGEST.md:60` | `lo-recruiting-invite-to-join-design.md` §9: both are **obsolete** — `x-api-key` on the webhook is LIVE and fail-closed (`PublicWebhookController:40-47, 86-90`), and D114 (14/09) confirms the fail-closed change | In-repo docs assert an outdated security posture. |
| E9 | `V053:5-6` comment: *"ADMIN/MANAGER/HR/... keep the exact value"* | code `CandidateProductionVisibility:77`: `EXACT_PRODUCTION_ROLES = Set.of("ADMIN")` | `project_recruit_production_no_mask.md` flags this directly: *"mâu thuẫn với code. Ai đọc comment đó sẽ kết luận ngược."* |
| E10 | `feedback_packs_pr_only_no_merge.md` (22/09): packs = **only open a PR**, never merge | `feedback_recruit_merge_authority.md` (22/09) Rule 3: other repos including packs **may** be merged if all three conditions hold — and it says so explicitly: *"⇒ feedback_packs_pr_only_no_merge KHÔNG còn tuyệt đối"* | Same-day, same-author, opposite defaults. Rule 3 is the later/broader statement. |
| E11 | `feedback_recruit_merge_authority.md` 15/09 section: recruit PRs merge **after 2-reviewer consensus** | same file, 22/09 update "Luật 2": recruit PRs **self-merge, no 2 reviewers needed** | The 22/09 restatement relaxes the earlier rule inside the same memory file. |
| E12 | `project_recruiting_staging_infra.md`: prod namespace decided (03/09) as **`recruit-prod`** in `lender-rate` | same file, later paragraph: *"PROD LIVE 03/09/2026 tối: BE chạy trong ns `recruit-be`, FE trong ns `recruit-fe-prod` (KHÔNG phải `recruit-prod` như quyết định ban đầu)"* | Decision vs. reality, recorded in the same memory. |
| E13 | `reference_recruit_prod_release_state.md` (15/09): **omni-svc production is 503/dead** | `project_recruit_omni_conversation.md` (22/09): *"⚠️ prod 503 ĐÃ LỖI THỜI, omni prod SỐNG từ 21/09"* | Superseded. |
| E14 | `reference_recruit_prod_sync_not_deployed.md` (15/09): recruit-be sync dead on prod MOSO; fix = narrow port to 3.62.1 | MEMORY.md index marks it *"LỖI THỜI 15/09"*; `STATUS.md` says the watcher reached prod via 3.63.1 on 14/09 and PR #3486 into 3.62.1 was **rightly closed unmerged** because 3.62.1 is abandoned | The whole 3.62.1 port plan was invalidated by the 3.63.1 release. |
| E15 | `reference_recruit_fe_staging_not_release.md`: deploy = fast-forward push to the `staging` branch | itself, header: *"HET HIEU LUC 07/09/2026 chieu"*; `project_recruiting_branch_workflow.md` | Self-marked expired. |
| E16 | `docs/lo-recruiting-invite-to-join-design.md` §11 row: *"joined = (PAID or WAIVED) AND SIGNED — luật cũ"* | same row's correction: **three sources, three rules** — packs `paid_and_signed` has **no WAIVED**; auto-set `joined` = `nmls sponsored ∧ hr completed ∧ meeting setup_done`; `SELF-TEST §4.3` differs again. `FEEDBACK/README.md` raises it to **FIVE sources, five answers** | The most dangerous contradiction in the corpus — the README says finding one of five and coding to it is "the worst kind of wrong, because there is no way to know you were wrong". |
| E17 | `recruit-be/docs/BACKLOG.md` V1 backend rà: *"dòng cũ ghi 'chưa có middleware/annotation nào đọc nó', **sai từ lâu**"* (RBAC enforcement) | the earlier version of the same file | A backlog line asserted a gap that had been closed long before; caught only by a machine-checkable audit on 02/09. |
| E18 | `docs/lo-recruiting-meeting-prep-victoria.md` §7 lists three **wrong** narration lines already recorded in the as-is video (`s0_4`, `s3_1`, `s4_6`) | the video itself (`final/lo-recruiting-role-walkthrough.mp4`) | The 24:04 staging cut is known to contain a false claim ("all 7 roles can open config") and the backlog asks for it to be deleted or suffixed `-SUPERSEDED`. |
| E19 | `docs/lo-recruiter-landing-pages-brief.md` Appendix E: *"một khuyến nghị của tôi bị rút"* — recommendation (b) was **wrong** and withdrawn before coding, after Phuong fixed first-touch | the body of the same brief | Another intra-document retraction. |
| E20 | `recruit-be/docs/DECISIONS.md` §4 records seven formal reversals: audit_log → tera-core audit; Vite → Next; central RBAC → app RBAC; D06 branches → D97; D80 role expiry **withdrawn**; D52 BLOCKED-archive guard → D107; D103 mirror ordering → D109; 04/09 owner-only follow-ups → D110 | earlier decisions | These are all superseded-by-design; quoting the older ID is a trap. |

---

## F. Staleness warnings

Flagged so nobody later treats these as current state.

| Document | Why it is stale / risky | Evidence |
|---|---|---|
| `docs/lo-recruiting-feature-review.md` / `.en.md` (27/07 – 31/07) | Describes the **old GWT system as-is**. Every "current state" statement is about the legacy app, not about recruit-be/recruit-fe. Appendix A lists test records left on staging. | file mtime; doc header |
| `docs/lo-recruiting-redesign-direction.md` (03/08) | Pre-code direction document. Its 5-stage lifecycle (§4.2) is superseded by S0–S7. Its §5 open questions are mostly closed in `DECISIONS.md`. Names repos `recruiting-be/-fe`, since renamed. | E1; `project_recruiting_staging_infra.md` rename 24/08 |
| `docs/lo-recruiting-e2e-flow.md` (05/08) | §9.8 proposes a stack "chờ Tai/anh Thuận gật" — long since decided (D03/D05/D06). §9.7 references the v4 prototype; v5 exists. Repo names `recruiting-be/-fe` are stale. RBAC row on offer sending is reversed by D-I10. | E2; D02 |
| `docs/lo-recruiter-landing-pages-brief.md` (31/08) | Its §3 is retracted by its own Appendix A; its `/join/<slug>` purpose was changed on 09/09 to a webinar form; Phase 0's file-based registry was replaced by `GET /api/recruiters` in moso-aid (bead `agentflow-527g`, closed). | E4, E5 |
| `docs/lo-recruiter-join-test-plan.md` (31/08) | Written for the lead-capture `/join`, which no longer exists in that form. Round 1 assumes "after merging into `master`" under the **old** lf-homepage release model (branch `release`), deleted 22/09. | E5; `project_lf_homepage_branch_workflow.md` |
| `docs/join-slug-attribution-contract.md` (05/09) | A 5-round self-correcting debate. Rounds 1–4 contain statements the author explicitly retracts in rounds 2, 5. Opens with a scope correction: *"route này CHƯA LIVE"*. | E6 |
| `docs/recruit-attribution-sequence-critique.md` (06/09) | Findings A1/A2 (V047 duplicate, V048/V049 ordering) were being fixed around 07/09 — `project_recruit_fe_is_deployed_app.md` says *"V048/V049 renumbered (blocker 'migration collision #215' đã HẾT, đừng nhắc lại)"*. C1 (stop-on-reply has no producer) was later addressed by `recordInbound` + `OmniInboundMessageHandler` (14/09). | `project_recruit_fe_is_deployed_app.md`; `STATUS.md` |
| `docs/lo-recruiting-meeting-prep-victoria.md` (05/08) | Pre-meeting prep; its own §7 admits three narration lines are wrong and that the counters have since changed (33 → 0). The production numbers quoted are 05/08 snapshots. | E18 |
| `docs/lo-recruiting-invite-to-join-design.md` (15/09) | Newest and most reliable of the design docs, **but**: §7 item 4 says the packs op is "VẮNG trên 3.63.1" — 22/09 memory says Khải replaced the whole path with a new `RecruitAPI` at `/api/recruit/v1/*`, and recruit-be has not been pointed at it yet. | `reference_recruit_webinar_end_to_end.md` (22/09) |
| `recruit-be/docs/MOSO-REALTIME-INGEST.md` | Line 60 asserts the receiver's key check is not live — **obsolete**, it is live and fail-closed (D114). | E8 |
| `recruit-be/docs/OMNI-STATUS-2026-08-25.md` | Dated in the filename; C1–C9 blockers partly resolved since (outbound wired 09–10, Pub/Sub IAM granted 14/09, omni prod alive 21/09). | `STATUS.md`; `project_recruit_omni_conversation.md` |
| `recruit-be/docs/FEEDBACK/03-hr.md` | README flags it: *"bằng chứng 23 ngày tuổi, có trước các quyết định cuối 08"*, and explicit attribution to Yen Vu appears **exactly once in 5,215 characters** — the rest is the author's hypothesis. | `FEEDBACK/README.md` |
| `recruit-be/docs/FEEDBACK/04-licensing.md`, `05-project-owner.md` | Same warning: "bản CỨU HỘ" reconstructed on 04/09 from session transcripts, not minutes. Only explicitly-attributed sentences count as departmental input. | `FEEDBACK/README.md` |
| "Accounting and Training have never met with us" | `FEEDBACK/README.md` bounds the claim itself: the probe covered **3 of 315** session files (936 MB of 11 GB), and a meeting never pasted into a session is invisible to any probe. | `FEEDBACK/README.md` |
| `recruit-be/docs/STATUS.md` | Self-declares its own decay rule: *"Một dòng không được cập nhật 2 tuần là một dòng đang nói dối"*; seeded 10/09, so rows not touched since ~24/09 should be distrusted. It also states **"BEADS THẮNG"** when it disagrees with `bd show`. | `STATUS.md` header |
| `recruit-be/docs/BACKLOG.md` | Bucket B ("waiting on a department / a person / docs owed") was deliberately **not** audited on 02/09 — those lines may be long done. Only bucket A was machine-verified. | `BACKLOG.md` §0 |
| `reference_recruit_prod_sync_not_deployed.md` | Marked obsolete in MEMORY.md as of 15/09. | MEMORY.md index |
| `reference_recruit_fe_staging_not_release.md` | Self-marked expired 07/09. | file header |
| `reference_recruit_prod_release_state.md` omni section | The 503 finding is superseded (omni prod alive since 21/09). | E13 |
| `feedback_recruiting_repos_self_merge_only.md` (20/08) | Superseded/widened by `feedback_recruit_merge_authority.md` Rule 3. | E10 |
| `reference_recruit_staging_deploy.md` (25/08) | Describes `deploy = push origin/release:staging` — a flow deleted on 07/09. | `project_recruiting_branch_workflow.md` |
| `docs/mockups/lo-recruiting-app/` (v4) | Superseded by `lo-recruiting-app-v5/` for demos; the v4 `data.js` still contains the `vol`/`units` fields and an AI greeting line that R22 asked to be changed to `loansSince2022`. | `BACKLOG.md` §3 "Sửa prototype theo R22" |
| `docs/mockups/lo-recruiting-admin.html` | A **second, more detailed** source of Settings truth competing with the prototype's Settings tab; `BACKLOG.md` §4 lists reconciling them as an outstanding debt. | `BACKLOG.md` §4 |
| Any doc naming the repos `recruiting-be` / `recruiting-fe` | Renamed to `recruit-be` / `recruit-fe` on 24/08 (bead `agentflow-8l11` closed). omni-service still contains 35 stale references (bead `agentflow-tdh2`). | `project_recruiting_staging_infra.md` |

---

## G. Ten promised features I suspect were never built

Ranked by how confidently the written record says "designed, not delivered".

1. **Referral bonus payout engine** (60-day maturity, two-sided eligibility, Cash Check auto-request vs RSU manual, visible Accounting queue). `project_recruit_prod_gaps.md` 20/09 states flatly: *"Bonus payout engine: CHƯA build"*. The `referrals` table is one of the 7 hollow shells. — A49
2. **Comp band engine / offer pricing suggestion.** `comp_bands` is an empty shell (V035 hollow-table warning); `RequestOfferRequest.compBandId` is `@NotBlank` against that empty table, which by itself made the offer endpoint uncallable (bead `gery`). D15 says the concept did not exist in the old system either. — A17
3. **Routing / assignment engine.** `routing_rules` appears only in `V001__init.sql` and `V035__hollow_table_warnings.sql`; `BACKLOG.md` (machine-audited 02/09) says **no class reads it**. — A77
4. **SLA policy engine + escalation.** Same signature: `sla_policies` exists in V001 + V035 only, no reader. The HOT clock uses a *different* mechanism, and the backlog explicitly leaves "keep two paths or collapse into `sla_policies`" undecided. — A76
5. **Modex "verify with one click" enrichment + monthly-refresh signals.** `STATUS.md` marks Modex pull ⚪ **not started**; the receiver only ever saw a mock payload; the account has no active export connection and −1 seats. Every production record still says "Check Modex". — A15, A19, A20
6. **Automatic webinar attendance import** (Google Meet `conferenceRecords.participants`). Feasibility verified 12/08 (D40/Q48) — and then nothing. It remains a bullet in `BACKLOG.md` §3 with no bead id and no PR. — A14
7. **Kanban and Funnel pipeline views.** Both are core to D11's four-view model; `BACKLOG.md` FE audit on 02/09 says neither has a route, both gated behind Track A mockup approval that never happened. **LO 360** and **Settings** screens are in the same bucket. — A63, A65, A66
8. **recruit-fe candidate edit form** (and with it the whole 3-way sync `lkyg` asked for as URGENT on 14/09). BE `PUT /candidates/{id}` exists; `CandidateDrawer:49` still says *"Read-only in V1"*. — A72
9. **HR handoff actually reaching HR.** recruit-be's publish side merged 17/09 but ships dark (flag off, topic blank); the `ai-hr-be` inbound subscriber and the `account_id` link-back **do not exist on either side** (bead `8pqy`: *"HANDOFF-research confirmed it does NOT exist on either side"*). So `candidates.account_id` is NULL on every row and no candidate has ever become a real LO through the app. — A32
10. **Sequence/cadence auto-send** — the machine that actually sends tier-1/tier-5 messages. Sender is a NoOp, `auto_send` is off, the cron is inert, and bead `jqpu` holds it behind 2 HIGH + 3 MEDIUM findings. Closely paired with **stop-on-reply**, which the 06/09 critique called *"gated on a signal no machine produces"*. — A41, A42

**Honourable mentions** (strong evidence, slightly less certain): the **integration health-check + alerting** (A79) has no bead at all; **`audit_outbox` → audit-log-service** (A80) measured 0 rows so nothing has ever left the app (bead `mnoz`); the **capacity-ceiling tiers 2–3** (D47) wait on the unbuilt Settings screen; **Focus mode** exists as a route but `BACKLOG.md` itself cannot confirm it is the V2 feature of the same name.

---

## Appendix: sources consulted

**agentflow/docs** — `lo-recruiting-e2e-flow.md`, `lo-recruiting-feature-review.md` + `.en.md`,
`lo-recruiting-redesign-direction.md`, `lo-recruiting-invite-to-join-design.md`,
`lo-recruiter-landing-pages-brief.md`, `lo-recruiter-join-test-plan.md`,
`lo-recruiting-meeting-prep-victoria.md`, `recruit-attribution-sequence-critique.md`,
`join-slug-attribution-contract.md`, `join-apply-lockedreferral-reply-c9.md`,
`join-slug-status-reply-c9.md`, `ask-khai-2026-09-10-evening.md`, `ask-khai-2026-09-11-phase0.md`,
`ask-khai-legacy-key-2026-09-10.md`, `ask-khai-omni-recruit-2026-09-10.md`,
`ambassador-recruiter-round2-analysis.md`, `lo-programs-*` (ambassador definition, CEO reply drafts
v1–v3, round-3/4 replies), `moso-17007-afterparty-referred-source-mapping.md`, `mockups/` (18 dirs/files).

**Beads** — `bd list --limit 0` (404 issues), `bd show` on `f1gi`, `7mj7`, `lkyg`, `8pqy`, `ikp5`,
`v1jv`, `jip5`, `ehl6`; `bd memories recruit|onboarding`.

**Memory** (`~/.claude/projects/-Users-apple-Projects-agentflow/memory/`) — `MEMORY.md` index plus
~85 files matching recruit / omni / packs / moso / HR / onboarding / tera / zoom / esign / webinar /
ambassador; read in full: `project_recruit_prod_gaps`, `project_recruiting_branch_workflow`,
`feedback_recruit_merge_authority`, `project_recruit_fe_is_deployed_app`,
`reference_recruit_prod_release_state`, `feedback_lo_recruiting_product_principles`,
`project_recruiting_fe_design_system`, `project_recruiting_staging_infra`,
`project_recruit_production_no_mask`, `reference_ally_recruiting_integration`,
`reference_recruit_webinar_end_to_end`, `project_recruit_call_outcome_next_steps`.

**openspec** — 31 change dirs; only `lfiq-onboarding-api` is onboarding-related (and it is lf-iq, a
different product).

**Repo markdown** — `recruit-be/docs/` (STATUS, DECISIONS §1–§6, BACKLOG, GOTCHAS headings,
FEEDBACK/README, INTEGRATIONS, MOSO-REALTIME-INGEST, SPEC-SPONSORSHIP-QUEUE, BRIEF-VICTORIA,
CEO-FEEDBACK-2026-08-14, MOCKUP-AUDIT, SELF-TEST, PRODUCTION-CUTOVER, MIGRATION-SPEC,
COMM-STACK-RESEARCH — titles/structure at minimum), `recruit-be/CLAUDE.md`, `DEPLOY.md`,
`recruit-fe/{README,DEPLOY,CLAUDE}.md`, `omni-service/{README,WIRE_COMPAT,CONFORMANCE,CI}.md` +
`qa/`, `ai-hr-be/docs/RECRUITING_API.md` and siblings, `document-esign/` docs,
`tera-docs/` (platform rules per `project_tera_docs_infrastructure_rules.md`).
