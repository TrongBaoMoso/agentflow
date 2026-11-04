# Proposal: Admin Reports V2 Redesign + Save-Without-Resend

## Problem Statement

The admin Reports management page at `/admin/reports` (in `lf-iq`) is currently a **v1-only, view-only** surface. It allows browsing, searching, filtering, bulk status changes, bulk delete, audit-log review, and tracking inspection — but admins **cannot fix bad homeowner contact or property data on a sent report**. Today's only options are: (a) leave the typo in place, (b) delete the report and re-import / re-create it (which re-spams the homeowner and breaks tracking history), or (c) ask engineering to patch the DB.

In parallel, every other admin surface (`dashboard-v2`, `users-v2`, `homeowners-v2`, `referral-partners-v2`, `release-notes-v2`, `bulk-import-homeowner-v2`, `engagement-v2`) has been redesigned into a consistent v2 visual language (Tailwind-first cards, sticky toolbars, stat strips, rounded-12 surfaces, orange-primary CTAs). The v1 Reports page is now the odd one out, producing a jarring style break when admins navigate into it.

Two problems merge into one change:

1. **Data-quality gap** — no admin edit flow for Contact + Property Detail on a sent report.
2. **Visual-language gap** — `/admin/reports` still ships v1-only UI.

## Proposed Solution

Build an `_v2/` folder under the existing `admin/reports/` route that:

1. **Reproduces all v1 behavior** (search, date-range, status/source filters, bulk status change, bulk delete, audit logs, tracking detail) in the v2 visual language, mirroring `homeowners-v2` list density and `dashboard-v2` stat cards.
2. **Adds a Detail screen** that clones the read-only `PropertyDetailsCards` from `homeowners-v2` (PropertyInfoCard, HomeValueCard, MortgageCard, CreditRatingCard, AgentCard) plus a ContactInfo card.
3. **Adds an Edit flow** on Contact + Property Detail cards using card-level Edit / Save / Cancel (react-hook-form + joi), reusing the homeowners-v2 edit pattern.
4. **Exposes two save actions** on the edit form (both buttons ALWAYS visible, regardless of send history):
   - `[Save Only]` — calls `updateReport(id, body)` with no `notification` argument → PATCH persists without email/device/SMS side effect. Exact request shape (no `?notification=` param vs explicit `?notification=NULL`) is TBD pending Phase 7.0 dev-be verification.
   - `[Save & Resend]` — calls `updateReport(id, body, 'ALL')` → PATCH with `?notification=ALL` → persists and fires the full notification pipeline.
5. **Surfaces a "post-send edit" indicator** — a badge on list rows and detail header when `last_modified_date` is newer than the first `SEND_MAIL` tracking event.
6. **Wires version switching** via the existing `withUIVersion()` HOC on `/admin/reports/page.tsx`. URL stays `/admin/reports`; no `/admin/reports-v2` route.
7. **Produces an HTML mockup first** under `mockups/reports-v2/` that the user approves before any FE code starts.

The backend endpoint `PATCH /reports/{reportId}?notification=<EMAIL|DEVICE|SMS|ALL>` already supports notification-less saves (when the `notification` query param is omitted, the `ReportFacadeImpl` notification branch is skipped entirely). No new BE endpoints are required — only a verification task to confirm the notification-less path has no implicit side effects.

## Scope

### In Scope (Frontend — primary)

- **Phase 0 — Mockup (hard gate):** `mockups/reports-v2/` HTML + README covering list, detail, contact edit, save-vs-resend button arrangement, post-send edit indicator. Must be user-approved before any Phase 1 code.
- New folder `src/app/[locale]/(admin)/admin/reports/_v2/` containing all v2 components.
- Wire route switching via `withUIVersion()` on `src/app/[locale]/(admin)/admin/reports/page.tsx`.
- **List screen** preserves every v1 behavior: search, date-range, status filter, source filter, status/source stat cards (click-to-filter), bulk status change, bulk delete, audit-log modal, tracking-detail modal, single-row status change menu, copy report link, pagination.
- **Detail screen** read-only clone of `homeowners-v2` PropertyDetailsCards (PropertyInfoCard, HomeValueCard, MortgageCard, CreditRatingCard, AgentCard) + a ContactInfo card (cloned from homeowners-v2 ReportForm/sections/ContactInfo).
- **Edit flow:** Contact + Property Detail only (per default). Card-level Edit / Save / Cancel. Two buttons on save, **both always visible**: `[Save Only]` (no notification) and `[Save & Resend]` (notification=ALL).
- **Post-send edit indicator:** FE-derived from `last_modified_date` > first `SEND_MAIL` event. List badge + detail-header badge with tooltip "Edited on <formatted date>".
- **i18n:** new strings added under the `AdminReportsV2.*` namespace (snake_case keys) to all 7 locale files: `en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`, `ko.json`, `ar.json`.
- **v1 preservation:** existing v1 page remains untouched; users on `uiVersionAtom === 'v1'` see the unchanged page.

### In Scope (Backend — verification only)

- Verify `PATCH /reports/{reportId}` (no `notification` query param) does **not**: (a) implicitly change status, (b) increment tracking counters, (c) fire any email/device/SMS notification.
- Verify audit-log entries **are** still written for notification-less edits.
- No new BE endpoints. No BE schema changes.

### Out of Scope

- Changing the v1 admin reports page (stays as-is for v1 users).
- Editing Mortgage / Credit Rating / Agent from admin (read-only in admin).
- New statistics, new filters, new columns (v2 matches v1 feature set — visual-only change).
- Rate Alert edit flow.
- Bulk edit (edit is single-report only).
- Separate URL `/admin/reports-v2` (project convention: toggle-driven swap at existing URL).
- Unit / E2E tests beyond a QC sanity pass (separate QC iteration).
- New `last_edited_after_send_date` BE field (FE derivation chosen instead).
- Any feature flag or role gating beyond the existing v2 toggle + admin route guard.

## Success Criteria

1. HTML mockup at `mockups/reports-v2/` reviewed and approved by user **before** any FE code is written.
2. `/admin/reports` renders v2 when `uiVersionAtom === 'v2'` and the unchanged v1 page when `'v1'`.
3. All v1 behaviors work identically in v2: search, filters, date-range, bulk status change, bulk delete, audit logs, tracking detail, copy report link, single-row status change, pagination, URL-sync of filter state.
4. Visual language matches `homeowners-v2` list density / `PropertyDetailsCards` and `dashboard-v2` stat cards.
5. Admin can edit **Contact** (first_name, last_name, email, phone) and **Property Detail** (fields mirrored from PropertyInfoCard editable subset) on a single report.
6. `[Save Only]` and `[Save & Resend]` buttons are **both always visible** on edit forms, regardless of whether the report has SEND_MAIL history. `[Save Only]` persists without firing email/device/SMS; `[Save & Resend]` persists and fires notification=ALL.
7. Post-send edit badge appears on list rows and detail header when `last_modified_date` > first SEND_MAIL tracking event.
8. All new strings added under `AdminReportsV2.*` to all 7 locale files with snake_case keys.
9. Dev-be verification (Phase 7.0) answers the definitive Save-Only request shape (no `notification` param vs `?notification=NULL`) before Phase 4 FE edit code starts. Dev-be further confirms notification-less save has no side effects (status flip, tracking increments, notifications) and still writes audit-log entries.
10. No regressions in v1 page.
11. TypeScript strict passes (`npx tsc --noEmit` exits 0).
12. `npm run build` passes.

## Feature Branch

`feature/admin-reports-v2-redesign` (to be created from `production` in the `lf-iq` repo, per project convention).

## Applied Decisions (from open-question defaults)

The brief listed 5 open questions with stated defaults. Because this BA runs in non-interactive subagent mode, the defaults are adopted and documented here — user can revise during design review:

| # | Question | Decision |
|---|---|---|
| 1 | Edit scope | **Contact + Property Detail only.** Mortgage / Credit Rating / Agent remain read-only in admin. |
| 2 | Save vs Save & Resend UX | **Two side-by-side buttons, both ALWAYS visible** regardless of send history. `[Save Only]` (secondary, gray) + `[Save & Resend]` (primary, orange). |
| 3 | Resend notification type | **Always `ALL`.** No channel picker; keeps UX simple and matches current send-on-create default. |
| 4 | Post-send edit audit | **FE derivation.** Compare `last_modified_date` to earliest `SEND_MAIL` tracking event on the report; no new BE field. |
| 5 | Rollout gating | **None beyond existing v2 toggle + admin route guard.** No feature flag, no new permission. |

If any of these decisions needs to change, revise this proposal and regenerate design.md and tasks.md before DEV Lead begins work.
