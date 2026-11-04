# Admin Email Templates v2 — Proposal

## Summary

Redesign the Admin **Email Templates** page as a parallel **v2** UI that users can opt into via the existing `withUIVersion` toggle. The URL stays `/admin/email-templates`. v1 continues to render untouched; v2 offers a modern list + modal-based editor aligned with the recently shipped `admin/reports/_v2` visual language.

## Problem

- The current v1 page has a simple table with basic modals and no quick overview of the template library (no stats, no at-a-glance scope/language distribution).
- Editing happens in small modals without a live preview, so admins can't confidently see how Thymeleaf template output will render with real argument values.
- Arguments declared by the backend (`arguments[]` — including nested objects/lists) are not surfaced meaningfully to the editor; there is no test harness.
- There is no "send test email" flow — admins cannot validate a template end-to-end before shipping.

## Proposed Solution

Build a second UI version at `_v2/` next to `_v1/` and route between them via `withUIVersion` — exactly the pattern used by `admin/reports/page.tsx`.

### v2 surface

1. **List screen**
   - Header with title, subtitle, and a primary "+ Create template" button.
   - 4-card stat strip (matching `ReportsStatStrip` style): Total, By scope, By language, Modified in last 7 days.
   - Sticky toolbar: search input + refresh button only. (Scope/language filter chips deferred to a BE-discovery task.)
   - Table via `GeneralTable`: columns `template_name | scope | language | description | last_modified_date | actions`. Row actions: Edit, Preview.
   - URL-synced pagination/search via `useUrlParams`.

2. **Edit / Create / Preview — modal-based, no new routes**
   - Large Mantine modal (`size="90%"` on desktop, fullscreen on mobile).
   - 3-zone desktop layout:
     - **Left pane**: `description` input + `content` editor (reuse `shared/fields/EditorField` HTML template source mode).
     - **Right pane**: sandboxed iframe live preview rendered with test values injected from the Variables panel. Desktop/mobile viewport toggle.
     - **Right rail**: Variables panel — interactive test harness. Each declared argument gets an input (with nested expansion for object/list types and type badges). Values feed the iframe and are reused as `sample_args` for Send Test.
   - Footer actions: **Send Test email** (button + recipient-email sub-modal, disabled with tooltip if BE endpoint missing), **Cancel**, **Save** (immediate). Dirty-form warning on close/navigate.
   - Mobile: tab switcher (`Edit | Preview | Variables`) replaces the 3-pane layout.
   - **Preview modal** is a read-only version of the edit modal: iframe + Variables tree, no editing controls.

## Out of Scope

- Any backend changes beyond BE discovery tasks.
- Bulk operations (multi-select update/delete).
- Version history / audit UI for templates.
- Delete action in v2 (Create is preserved from v1; Delete is intentionally omitted).
- UI for registering new scopes or languages.
- Auto-migrating v1 users to v2 (opt-in via the existing toggle).
- Client-side fallback filtering by scope/language.

## Success Criteria

- `/admin/email-templates` still renders v1 identically for users who have not opted into v2.
- With v2 enabled, the list loads server-paginated data and reacts to search within 300 ms debounce.
- Opening the edit modal shows content in the editor and renders the first paint of the iframe preview within 500 ms of modal open (excluding network).
- Typing a variable value in the Variables panel updates the iframe preview via `srcdoc` within 200 ms.
- Saving immediately persists `content` and `description`; other fields are read-only.
- Dirty-form close / navigate raises a confirmation dialog.
- No Mantine `Stack/Group/Text/Title` in v2 code — Tailwind + semantic HTML.
- All user-facing strings come from `useTranslations('AdminEmailTemplatesV2')` and are present in all 7 language message files.
- TypeScript build (`tsc --noEmit`) passes with no errors.
- `preview iframe` uses `sandbox="allow-same-origin"` only (no `allow-scripts`).

## Feature Branch

`feature/admin-email-templates-v2` — branched from `production` (lf-iq base branch). All task branches `agent/<bead-id>-<slug>` are created from and merged into this feature branch.

## Dependencies on Other Teams

Two BE-discovery tasks (tracked in `tasks.md`) are needed from the `lfiq-backend` team:

1. Does `POST /lfiq/templates/{id}/send-test` (or equivalent) exist? If not, scope implementation cost.
2. Does `GET /lfiq/templates` accept `scope` and `language` query params today?

These unblock Send Test email (Phase 3 enable/disable decision) and the future deferred filter work.
