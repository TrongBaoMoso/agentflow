# Recruit UI learns the HR app — plan (16/10, bead agentflow-9mazq)

## Why
Bao 16/10: Recruit "looks old, ugly, inconsistent"; the HR app (hr.viet18.com, repo `ai-hr-fe`) is
"clean, modern, friendly". Recruit should learn from HR.

## Findings
- HR app = `ai-hr-fe` (Mantine 8 + Tailwind 4 + platform-react 0.4.39). Its look comes from its OWN kit:
  `components/calendar/*` (DatePicker, TimeSelect, DateTimePicker, DateRangePicker), `components/tera/*`
  (DataTable, FilterBar, PageTabs, DetailLayout, StatusPill, EmptyState…), the dropdown contract in
  `components/tera/KIT.md` + `app/tera.css`, and theme additions in `lib/theme.ts`.
- `tera-components` only ships the shell (header, nav, search, PageHeader, SectionCard, theme tokens);
  no pickers, no dropdown kit.
- Recruit (`recruit-fe`) is on the same Mantine 8 + SDK, but used ~20 native `<input type=date|time>`
  and stock dropdowns, with per-screen styling.

## Decisions (Bao)
- Speed first: COPY the HR kit into recruit-fe now; move it into tera-components later.
- Date/time defaults (replaces 05/10 qsg2z.2 "empty, must pick"; prefill is VISIBLE and editable):

| Where | Default |
|---|---|
| Call result → Meet 1-1; Schedule-the-1-1 modal | today + next half hour inside business hours, else 09:00 next business day |
| Call result → Call again | 09:00 next business day (same as New follow-up) |
| Call result → Send info → Schedule for later | next business day |
| Follow-up panel New/Edit; Onboarding "Done…" date | already defaulted, keep |
| Invites → Custom range | prefilled with the current window |
| Neutral months, Settings (hours/holidays/claim SLA), Referral "Since", Webinar | no default |

- Authority for the away window: merge to STAGING after 2 reviewers + CI + screenshots; NOT production.

## PRs (recruit-fe)
1. `agent/9mazq-hr-kit-inputs` — HR dropdown theme + pickers; replaces every native date/time input; defaults above.
2. `agent/9mazq-profile-blocks` — candidate profile tab sections → HR detail blocks.
3. `agent/9mazq-list-pages` — list pages consistent (page frame, scope pills, filter bar, stat cards, notices, row buttons, tables, pills, empty states).

Out of scope: CallWorkspace/** internals (other session, already HR-styled), landing, tera-components, HR app.
Screenshots: `docs/handoff/recruit-ui-hr/shots/`.
