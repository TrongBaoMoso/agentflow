# My hand-offs (/invites) redesign — implementation spec (approved 21/10/2026)

Bead agentflow-10v0e. Mockup board **V4**: https://claude.ai/artifact/2xqHaJerZt6VPToB9X5E2Q
Decisions: `HANDOFF.md` (same folder). This file is the contract both repos build against.

## 1. API contract — `GET /api/v1/offers/mine` (recruit-be, additive only)

### New / changed query params

| Param | Values | Notes |
|---|---|---|
| `stage` | `ALL` (new), `IN_PROGRESS`, any `InviteStage` | `ALL` = every stage. Blank still = `IN_PROGRESS` (older FE keeps working) |
| `sort` | `WAITING` (default), `PROGRESS`, `NAME`, `WAITING_ON` | unknown → 400 |
| `dir` | `ASC`, `DESC` | default per sort: WAITING = oldest `waiting.since` first (longest wait first), others ASC |
| `waiting_on` | `MANAGER`, `SPECIALIST`, `LOAN_OFFICER`, `HR`, `LICENSING` | filter on `waiting.kind` |
| `waiting_on_user` | a user id | filter: that user is in `waiting.people` |
| `step` | `APPROVE`, `BOOK_1ON1`, `MEET_1ON1`, `PAY_FEE`, `SIGN`, `FIX_FOR_HR`, `HR_ACCOUNT`, `HR_TODO`, `HR_DOCS`, `LICENSING`, `SETUP_CALL` | filter on `waiting.step` |
| `late` | `true` | only rows with `late = true` |

Filters (`waiting_on`, `waiting_on_user`, `step`, `late`) narrow `items` and `total`. `counts` keep today's
meaning (stage cards under `from`/`to`/`q` only) so the cards do not jump when a filter is picked.
Pagination stays (`currentPage`, `pageSize`); sort/filter must apply BEFORE paging (a recruiter's own invites are
few — in-memory sort/filter of the caller's rows is acceptable; say so in the javadoc).

### New response fields

```jsonc
"counts": { ..., "all": 21 },            // sum of every stage under from/to/q
"items": [{
  ...existing fields unchanged...,
  "progress": {
    ...existing,
    "approval": { "status": "PENDING|APPROVED|AUTO|DECLINED", "at": "<instant|null>", "by": { "id": "...", "name": "..." } | null }
    // AUTO = offers.approved_by is the SYSTEM actor (D64 rule-based auto-approve); by = null then
  },
  "progress_pct": 36,                     // 0..100, done steps of the 11 below, rounded
  "waiting": {                            // null when closed: DECLINED, EXPIRED, or onboarded
    "kind": "MANAGER|SPECIALIST|LOAN_OFFICER|HR|LICENSING",
    "people": [{ "id": "...", "name": "..." }],   // MANAGER: every role-MANAGER holder; SPECIALIST: the assigned one,
                                                   // [] when none assigned; LOAN_OFFICER/HR/LICENSING: []
    "step": "APPROVE|BOOK_1ON1|MEET_1ON1|PAY_FEE|SIGN|FIX_FOR_HR|HR_ACCOUNT|HR_TODO|HR_DOCS|LICENSING|SETUP_CALL",
    "since": "<instant>",                 // when this wait began (stage_since for pre-join; joined_at / sent_to_hr_at /
                                          // both_done_at after Joined, same rules as recruit-fe postJoinedView.waitingOn)
    "meeting_at": "<instant|null>",       // MEET_1ON1 only: the booked 1-1
    "missing": ["NMLS", ...]              // FIX_FOR_HR only: hr_handoff.missing
  }
}]
```

### The 11 steps (progress_pct and the FE ring)

1 Approval · 2 1-1 · 3 Fee · 4 Signed · 5 Sent to HR · 6 HR account · 7 HR to-do · 8 HR docs · 9 Licensing ·
10 Setup call · 11 Onboarded. Approval counts done when APPROVED or AUTO. Fee done = PAID or WAIVED.
Steps 5–11 come from `progress.post_joined` exactly as recruit-fe `handoffSegments` reads them today.

### Waiting derivation (port of recruit-fe `postJoinedView.waitingOn`, with the owner FIX)

| Stage / state | kind | step |
|---|---|---|
| WAITING_APPROVAL | MANAGER | APPROVE |
| INVITED_1ON1_PENDING, 1-1 booked (scheduled_at set, not done) | SPECIALIST | MEET_1ON1 |
| INVITED_1ON1_PENDING, not booked | SPECIALIST | BOOK_1ON1 |
| PAYING_SIGNING, fee not PAID/WAIVED | LOAN_OFFICER | PAY_FEE |
| PAYING_SIGNING, fee done, not signed | LOAN_OFFICER | SIGN |
| SIGNED (joined), not sent to HR | SPECIALIST | FIX_FOR_HR |
| joined, setup call open | SPECIALIST | SETUP_CALL |
| joined, sent, post-Joined steps open | the FIRST open step's `PostJoinedStep.waitingOn()`: HR_ACCOUNT → HR, HR_TODO → LOAN_OFFICER, HR_DOCS → HR, LICENSING → LICENSING (order account, to-do, docs, licensing) | that step's key |
| onboarded / DECLINED / EXPIRED | — (`waiting = null`) | |

**Owner fix:** Book 1-1 / Meet 1-1 wait on the onboarding SPECIALIST (`OnboardingTask.BOOK_1ON1` is the
specialist's task), not the loan officer. Today's FE says the LO — that is the bug being fixed.

### Approvers = role MANAGER only

`waiting.people` for MANAGER and the recipients of `POST /offers/{id}/remind-approver` = users whose grant
`role_codes` contains `MANAGER` (exclude ADMIN `*` holders), minus the caller. Today
`accessControlService.usersWith(OFFER_APPROVE)` also reaches ADMINs (prod: bao.trinh@, it.dept@). Prod after the
change: victoria.pham@ only. Do NOT change who is ALLOWED to approve — only who is shown / reminded.

## 2. recruit-fe

Rewrite `src/app/[locale]/(private)/invites/_components/InvitesClient/*` to board V4:

- Stat cards: **All** first and default (URL `stage=ALL`), then In progress, Waiting approval, 1-1 pending,
  Paying & signing, Joined, Not qualified. **No Expired card** (keep tolerating EXPIRED rows).
- Toolbar: search · date range in the HR-app PeriodPicker style `‹ [📅 Last 30 days ▾] ›` (presets left,
  two months; no "Requested ·" prefix) · filters Waiting on / To do / Late only. **Remove** `sort_hint`,
  `range_custom_hint`, `empty_body`. Keep the colour legend row (Done, Auto (bypass), Waiting, Problem, Not started).
- Columns: **Progress** (segmented 11-arc ring, per-step colour, auto = striped/lighter green, `%` centre,
  tooltip = per-step) · **Loan Officer** (reuse `inbox/_shared/LeadWhoCell`: initials avatar, name, NMLS link) ·
  **Status** chip (stage; DECLINED adds "by <name>" from `last_decline.actor_name`) · **Waiting on**
  (person: `OwnerBadge` photo + full name; several managers → stacked photos + names, tooltip lists all;
  SPECIALIST with no person → "Not assigned"; HR / Licensing → team icon + name; loan officer → initials avatar +
  name, NO "Loan Officer" chip; closed → "—") · **To do** (Approve invite, Book 1-1, Meet 1-1 · <day>, Pay fee,
  Sign agreement, Add <fields> for HR, Create HR account (HR), Finish HR to-do (loan officer), Verify HR docs (HR), Sponsor license, Book setup call; closed → "—") ·
  **Waiting for** (`TimeCell kind="elapsed"`, tone overdue when `late`; closed rows `kind="past"`) · action.
- Sortable headers: Progress, Loan Officer, Waiting on, Waiting for (default Waiting for, longest first). Sort,
  filters, stage, range, q all live in the URL (`useInvitesFilterUrl`).
- Older BE (no `waiting` / `progress_pct` / `approval`): derive from today's fields with the SAME table above
  (fix the owner in `postJoinedView.waitingOn` too, it also feeds the onboarding card headline — check callers).
- Actions: Remind manager (APPROVE), Remind onboarding (SPECIALIST steps where BE allows: today only
  INVITED_1ON1_PENDING), Edit & resend (DECLINED with can_resend), else Open. Keep cooldown behaviour.
- i18n en + vi for every new string. Column header "Waiting for" (was Since).
- Keep the old `postJoined` flag path out: v4 is the only layout.

## 3. Process

BE first: branch from `origin/master`, IT + unit tests, PR, 2 reviewers. FE: branch from `origin/master`, tests,
then LOCAL preview for the product owner BEFORE any push (memory feedback_local_preview_before_push).

**Amendment 21/10 (lead):** post-Joined waits are per step (PostJoinedStep.waitingOn); HR to-do waits on the LOAN OFFICER. `step=HR` is replaced by HR_ACCOUNT / HR_TODO / HR_DOCS.

**Amendment 2 (product owner, 21/10 evening):** the booked 1-1 splits in two. `MEET_1ON1` only while the booked
slot is now or in the future; once the slot has passed and the 1-1 is not marked done the step is
`MARK_1ON1_DONE` (kind SPECIALIST, `meeting_at` = the booked slot) — the same rule recruit-be's Today uses for
`OnboardingTask.MARK_DONE`. To do labels: "Book 1-1" · "Meet 1-1" + day · "Mark 1-1 done" + day. The `step`
filter accepts `MARK_1ON1_DONE`. Also: the Status cell shows no older-offer history (removed 21/10).

**Amendment 3 (product owner, 21/10 evening):** the Waiting on cell is ROLE first, person second. Line 1: Manager /
Onboarding / Loan Officer / HR / Licensing (one role icon). Line 2 (muted): the single named approver for Manager
(none when several — tooltip lists them), the specialist's name or "Not assigned" for Onboarding, nothing for the
others. No stacked avatars. `sort=WAITING_ON` orders by role label, then name.
