# Recruit "My hand-offs" (/invites) redesign — HANDOFF (paused 21/10/2026)

Bead: **agentflow-10v0e** (full decision list). Mockup (Design canvas, org-shared):
https://claude.ai/artifact/2xqHaJerZt6VPToB9X5E2Q — the approved board is **V4** (third row, left).
Other boards: Current (as-is recreation), Main (v1), Compact (option A, rejected), Ring (v3), RefHR (HR app screenshot).

## Where we stopped

Mockup v4 is in its final shape; the product owner has answered every open question below.
**Last question NOT yet answered: "approve v4 → start coding?"** Ask that first on resume.
Nothing is coded, nothing pushed in recruit-be / recruit-fe.

## Decisions (product owner, 21/10)

| Topic | Decision |
|---|---|
| Column order | Progress · Loan Officer · Status · Waiting on · To do · Waiting for · action |
| Loan Officer cell | Avatar initials + name + NMLS link — reuse `inbox/_shared/LeadWhoCell` (Hot/Cold). No city/state, no "to <specialist>" |
| Progress | Ring of **11 arcs** (Approval, 1-1, Fee, Signed, Sent to HR, HR account, HR to-do, HR docs, Licensing, Setup call, Onboarded), colour per step, **% in centre**, legend row kept, hover = per-step detail. No sub-text under the ring |
| Bypass | Auto-approved (D64, `approved_by` = SYSTEM) = **striped green** arc; manual = solid green; declined = red |
| Pre-join waiting colour | The step being waited on is orange (today's FE never paints pre-join steps orange) |
| Status column | **Keep** (option a): chip = BE stage (Waiting approval, 1-1 pending, Paying & signing, Joined, Not qualified + "by <decliner>") |
| Waiting on | Person = avatar + full name. Employees show photo (`OwnerBadge`), loan officers initials. **No "Loan Officer" chip.** HR / Licensing = team icon. Closed rows "—" |
| Who owns Book 1-1 / Meet 1-1 | **Onboarding specialist** (`OnboardingTask.BOOK_1ON1`). Current FE `waitingOn()` in `postJoinedView.ts` puts the LO there — **bug on staging today** |
| Pay fee / Sign | Waits on the loan officer; action = Open (BE only allows Remind onboarding in 1-1 pending) |
| Approvers | **Role MANAGER only** (exclude ADMIN `*`) — for Waiting on AND Remind manager. Prod today: victoria.pham@ only (admins bao.trinh@, it.dept@ excluded) |
| To do | Approve invite, Book 1-1, Meet 1-1 · <date>, Pay fee, Sign agreement, Add <field> for HR, HR to-do/HR docs, Sponsor license, Book setup call. Closed rows "—" |
| Waiting for (renamed from Since) | `TimeCell` kind elapsed (duration line + date chip, red when late) like Pipeline/Hot |
| Stat cards | Add **All** (default). **Drop Expired** (nothing in recruit ever sets EXPIRED). "Not qualified" name: rename to "Declined" still undecided |
| Hints | Remove `sort_hint` ("Waiting longest first · late ones in red"), `range_custom_hint`; propose removing `empty_body` |
| Date range | HR app `PeriodPicker` style: `‹ [📅 Last 30 days ▾] ›`, presets left + two months (see `ref-hr-period-picker.png`). Drop the "Requested ·" prefix |
| Sort / filter | Sort by Progress, Loan Officer, Waiting on, Waiting for (default: longest wait first). Filters: Waiting on, To do step, Late only |

## Work plan (when approved)

1. **recruit-be** (one PR, BE before FE):
   - `GET /offers/mine`: `stage=ALL`; sort + filter params (list is server-paged, `MyInvitesStore` ORDER BY `stage_since` is fixed today).
   - `progress.approval { at, by_name, auto }` from `offers.approved_at/approved_by` (SYSTEM = auto).
   - Approvers (role MANAGER) on WAITING_APPROVAL rows; `remindApprover` recipients = MANAGER role only (today `usersWith(OFFER_APPROVE)` includes ADMIN).
   - Waiting-on person/action per row (or leave the derivation to FE from `progress` + specialist).
2. **recruit-fe**: rewrite `invites/_components/InvitesClient` + `InviteRow`; fix `waitingOn()` owner of Book 1-1; ring component (new segmented variant, keep `ProgressRing` for the LO card); i18n en+vi.
3. Start LOCAL for the product owner before any push (memory `feedback_local_preview_before_push`).

## Measured facts (21/10)

- recruit-fe origin/master 0b353055, recruit-be origin/master 8c064b0d at the time of reading.
- `InviteStage` = WAITING_APPROVAL, INVITED_1ON1_PENDING, PAYING_SIGNING, SIGNED, DECLINED, EXPIRED; `stage` param accepts IN_PROGRESS or a stage, blank = IN_PROGRESS (`MyInvitesServiceImpl:538`).
- DECLINED only via manager Decline in the approval queue (reason required, `OfferServiceImpl.decline`).
- RBAC (read-only psql pod, staging + prod): roles with OFFER_APPROVE = MANAGER, ADMIN(`*`). Prod grants: ADMIN bao.trinh@, it.dept@; MANAGER victoria.pham@.
- Tera date range: Mantine `DatePickerInput type="range"` + presets Today/7/30/90 (`CommDateRangeFilter.tsx`); screenshot not taken — test accounts get "no access" on tera.viet18.com/communication-activity.

## Mockup sources

`mockup-src/` holds the generators (`gen_v4.py` builds V4 and imports data from `gen_ring_v2.py`). They write into
`scratchpad/artifact-files/<id>/project/`; on resume re-read the artifact files first (`Artifact read` with `path`),
set `ROOT` in `gen_ring_v2.py` to the new folder, re-run, then publish `project/V4.dc.html` to the same artifact URL.
