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

## STATUS 22/10 — on staging

- BE: recruit-be #708 (40f66f5f), #710 (c95936dd), #711 (af4fb80e) — D306 / D307. FE: recruit-fe #559 (1acf6f92).
- Verified on recruit.viet18.com/invites as recruiter (63 rows) and onb-test (37 assigned rows, "You", conversation icon).
- Decisions added after V4 (SPEC.md amendments 1–4): per-step post-Joined owners (HR to-do = loan officer), Mark 1-1
  done, Waiting on = role + person avatar line, "Review offer", "Remind" label, no Open button, late on every open
  step (lateDays), MEET never late, specialists see their assigned LOs, setup call waits on / rings the recruiter,
  conversation icon per row, sticky header, % column widths.
- **Production: NOT promoted.** Order: recruit-be production first (FE sends stage=ALL, old BE answers 400), then
  recruit-fe. Behaviour change on prod: Remind manager reaches MANAGER role only (victoria.pham), not ADMINs.

## PAUSE 22/10 evening — RESUME POINT

**On staging:** recruit-be #708 #710 #711 #712 (multi-value step/waiting_on) #713 (unseen rows first); recruit-fe #559.
**Merged to master, NOT yet promoted to staging:** recruit-fe **#563** (round 2: grouped To do tree, multi Waiting on,
HR-style date range, compact actions, Conversation icon last on every row, decline-note tooltip, "Invite email not
sent" + compact Resend only before the 1-1 is booked, phone table scrolls sideways) — master 82fddb38.
**Open PR, CI was running at pause:** recruit-fe **#564** `fix/phone-tables-stay-tables` (tables stay tables on phones
everywhere, Table | Cards toggle on hand-offs/Hot/Cold/approval queue, one card look + hover incl. Pipeline cards/board,
Cold Claim compact). Locally verified: jest 621/622 (only pre-existing followUp.test.ts), tsc, eslint, build.

**Next steps on resume:**
1. `gh pr checks 564` → green → squash-merge → `gh workflow run promote-staging.yml -f sha=<master sha>` (this ships
   #563 + #564 together) → watch cd-staging → smoke /invites, /inbox/hot, /inbox/cold, /pipeline?view=cards at 1440+390.
2. Approved, not started — **Exceptions** (separate PR): keep the 3 sections (NO "type" column — removed earlier by
   feedback), add one page search (name/NMLS across sections), Owner filter, header sort per section, Refresh, one
   page-level Table | Cards toggle. No pagination / saved / export / bulk.
3. Proposed, NOT yet approved — list-page standard (audit result in this session): hand-offs + Reset/Refresh/Saved;
   Hot/Cold Saved (+ Cold bulk Assign like Hot, manager-only); Dormant/Audit/Work: toggle, Refresh, Reset, Saved, row
   count (Audit: search + date range); Conversations/Audit/Permissions onto the HrList kit, Permissions filters into the
   URL (rule #5). Not for Reports/Duplicates/Templates/Checklist templates/My referrals. Extras proposed: active-filter
   chips, "Clear filters" in empty state, remembered page size, column picker.
4. Production: nothing promoted. Order recruit-be first, then recruit-fe. Remind manager reaches MANAGER role only.
5. Known: Cold list overflows ~18px at 390 (pre-existing).

Worktrees: fe `recruit-fe-worktrees/handoffs-redesign` (fix/handoffs-round2, merged) and `recruit-fe-worktrees/phone-tables`
(#564); be `recruit-be-worktrees/handoffs-multi`. Local preview recipe: next dev -p 3311 in the worktree with
NEXT_PUBLIC_DEV_USER_ID=<account id> + `~/.cache/claude-recruit/preview/front_rec.js stg_<port>.token <port>`, tokens via
`~/.cache/claude-recruit/handoffs/tok.js` (3310 manager, 3320 recruiter, 3350 onb-test). All servers stopped at pause.
