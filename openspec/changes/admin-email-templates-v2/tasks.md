# Admin Email Templates v2 — Tasks

Feature branch: `feature/admin-email-templates-v2` (from `production`).
One bead per task. Each task branch: `agent/<bead-id>-<slug>` branched from `feature/admin-email-templates-v2`.

Labels:
- `frontend` — lf-iq React/Next.js work
- `backend` — lfiq-backend discovery tasks
- `blocked-by` — explicit dependency

---

## Phase 0 — Mockups (DONE this turn by BA)

- [x] 0.1 HTML mockups for list, edit modal, variables panel, preview iframe, mobile — at `/Users/apple/Projects/agentflow/lf-iq/mockups/email-templates-v2/`
  - Awaiting user approval before Phase 1 starts.

---

## Phase 1 — Folder reorg (non-breaking)

> Goal: introduce `_v1/` and `_v2/` subfolders and the `withUIVersion` delegator without changing rendered behavior for current users.

### 1.1 Move existing page into `_v1/` [frontend]

- Files: `lf-iq/src/app/[locale]/(admin)/admin/email-templates/page.tsx`, `_components/*`
- Create `_v1/EmailTemplatesPage.tsx` containing current page body (lifted from `page.tsx`).
- Move `_components/CreateEmailTemplateModal/`, `_components/EditEmailTemplateModal/`, `_components/PreviewEmailTemplateModal/` into `_v1/_components/`.
- Update imports accordingly.
- **Acceptance**: v1 page renders and behaves identically (manual smoke: list loads, Create/Edit/Preview modals open).
- **Depends on**: none.

### 1.2 Add `withUIVersion` delegator [frontend]

- File: `lf-iq/src/app/[locale]/(admin)/admin/email-templates/page.tsx`
- Body identical in shape to `admin/reports/page.tsx` — dynamic imports of `./_v1/EmailTemplatesPage` and `./_v2/EmailTemplatesPage`.
- **Acceptance**: with toggle defaulting to v1, page renders v1. Toggle to v2 renders the stub (next task). No TypeScript errors.
- **Depends on**: 1.1.

### 1.3 Stub v2 page [frontend]

- File: `lf-iq/src/app/[locale]/(admin)/admin/email-templates/_v2/EmailTemplatesPage.tsx`
- Renders a placeholder div with heading + subtitle (Tailwind only) so the version toggle is verifiable before full implementation.
- **Acceptance**: toggling to v2 shows the stub; no console errors; `tsc --noEmit` clean.
- **Depends on**: 1.2.

---

## Phase 2 — v2 list screen [frontend]

### 2.1 Types + list hook [frontend]

- Files: `_v2/_types/emailTemplate.ts`, `_v2/_hooks/useEmailTemplatesList.ts`
- Define `EmailTemplateSummary`, `EmailTemplateDetail`, `TemplateArgument` types matching `ApiBaseResponse<PageableResponse<…>>`.
- `useEmailTemplatesList({ search, page, pageSize })` — React Query wrapper around `GET /lfiq/templates`.
- Optional chaining + fallback defaults on every field read.
- **Acceptance**: unit test mocks API, verifies hook maps to typed shape and handles empty/null fields.
- **Depends on**: 1.3.

### 2.2 `EmailTemplatesHeader` component [frontend]

- File: `_v2/_components/EmailTemplatesHeader.tsx`
- Title + subtitle + primary "+ Create template" button (Tailwind; no Mantine layout primitives).
- Button click opens `CreateTemplateModalV2` (wired in Phase 3).
- **Acceptance**: renders at 320px and 1280px without overflow; `useTranslations('AdminEmailTemplatesV2')` used for all strings.
- **Depends on**: 1.3.

### 2.3 `EmailTemplatesStatStrip` component [frontend]

- File: `_v2/_components/EmailTemplatesStatStrip.tsx`
- 4 KpiCards: Total, By scope (primary scope + count), By language (primary language + count), Modified last 7 days. Visual matches `ReportsStatStrip` — 2-col on mobile / 4-col on xl.
- Data derived client-side from the current page's list result (document as a known limitation; future BE aggregation endpoint is out of scope).
- **Acceptance**: stat cards visible; numbers reflect current page totals; passes a11y (semantic headings, ARIA label on the region).
- **Depends on**: 2.1.

### 2.4 `EmailTemplatesToolbar` component [frontend]

- File: `_v2/_components/EmailTemplatesToolbar.tsx`
- Sticky (`sticky top-20`), white card with border + shadow, matching the reports toolbar.
- Contents: search input (debounced 300 ms) + icon-only refresh button. **No** scope/language filters for Phase 0.
- Uses `useUrlParams` to sync `search` to URL.
- **Acceptance**: typing into search debounces and triggers refetch; refresh button invalidates React Query cache for the list; keyboard focus visible.
- **Depends on**: 2.1.

### 2.5 `EmailTemplatesTable` component [frontend]

- File: `_v2/_components/EmailTemplatesTable.tsx`
- Uses existing `GeneralTable` wrapper.
- Columns: `template_name`, `scope`, `language`, `description` (truncated), `last_modified_date.formatted`, `actions` (Edit pencil + Preview eye).
- Pagination footer like `admin/reports/_v2`.
- Row hover state; action buttons open the respective modals (wired in Phase 3 — Phase 2 leaves them as `console.log` placeholders).
- **Acceptance**: renders sample data; empty state renders `table.empty_state` copy; pagination updates URL.
- **Depends on**: 2.1.

### 2.6 Compose v2 page [frontend]

- File: `_v2/EmailTemplatesPage.tsx`
- Compose Header + StatStrip + Toolbar + Table; pass state through.
- **Acceptance**: full page renders; URL state survives reload; works at 320px / 768px / 1280px.
- **Depends on**: 2.2, 2.3, 2.4, 2.5.

---

## Phase 3 — v2 edit / create / preview modals [frontend]

### 3.1 Detail hook + argument types [frontend]

- Files: `_v2/_hooks/useEmailTemplateDetail.ts`, `_v2/_types/variableNode.ts`
- React Query wrapper for `GET /lfiq/templates/{id}`; typed `arguments[]` tree.
- **Acceptance**: unit test verifies typed parse of nested `schema` and `items` shapes.
- **Depends on**: 2.1.

### 3.2 `defaultTestValues` + `renderThymeleafLite` + `buildPreviewSrcdoc` utils [frontend]

- Files: `_v2/_utils/defaultTestValues.ts`, `_v2/_utils/renderThymeleafLite.ts`, `_v2/_utils/buildPreviewSrcdoc.ts`
- `defaultTestValues(args)` — seed values per type.
- `renderThymeleafLite(content, values)` — handles `[[${…}]]`, `th:text`, single-level `th:each`. Returns string HTML.
- `buildPreviewSrcdoc(content, values)` — wraps render output in minimal document with reset CSS + link target rewrite.
- **Acceptance**: unit tests cover scalar / nested object / list-of-objects substitution and the warning-banner fallback for unsupported syntax.
- **Depends on**: 3.1.

### 3.3 `VariableNode` + `VariablesPanel` [frontend]

- Files: `_v2/_components/EditTemplateModalV2/VariableNode.tsx`, `VariablesPanel.tsx`
- Recursive renderer: input per scalar; expandable group for object; add/remove items for list.
- Type badges (string/number/boolean/object/list) with distinct Tailwind color classes.
- Calls parent `onChange(newValues)`.
- **Acceptance**: component test — nested 2-level object input updates top-level test-values tree immutably; list add/remove works.
- **Depends on**: 3.2.

### 3.4 `PreviewPane` [frontend]

- File: `_v2/_components/EditTemplateModalV2/PreviewPane.tsx`
- iframe with `sandbox="allow-same-origin"`, `srcDoc={buildPreviewSrcdoc(content, values)}`.
- Desktop / mobile viewport toggle chips — constrains iframe width to 390px in mobile mode.
- Thymeleaf-lite warning banner surfaces when unsupported syntax is detected.
- **Acceptance**: iframe updates within 200 ms of a typed value change (visual inspection / Playwright); no `allow-scripts` set.
- **Depends on**: 3.2.

### 3.5 `EditorPane` [frontend]

- File: `_v2/_components/EditTemplateModalV2/EditorPane.tsx`
- `description` Mantine TextInput (react-hook-form controlled) + `EditorField` (source mode) for `content`.
- Tailwind styling only for spacing/border; no Mantine layout primitives.
- **Acceptance**: typing marks form `isDirty`; submitting form fires save mutation (wired in 3.7).
- **Depends on**: 3.1.

### 3.6 `useDirtyFormGuard` + `DirtyFormGuard` [frontend]

- Files: `_v2/_hooks/useDirtyFormGuard.ts`, `_v2/_components/EditTemplateModalV2/DirtyFormGuard.tsx`
- Intercepts modal close / beforeunload when form `isDirty`. Shows confirm dialog.
- **Acceptance**: unit test simulates close with dirty form → confirm called; clean form → close proceeds.
- **Depends on**: 3.5.

### 3.7 `EditTemplateModalV2` shell [frontend]

- File: `_v2/_components/EditTemplateModalV2/index.tsx`
- Mantine `Modal` `size="90%"`; fullscreen below `sm`.
- Desktop grid: `EditorPane` | `PreviewPane` | `VariablesPanel` (3-zone).
- Mobile: Mantine `Tabs` with `Edit | Preview | Variables` segments.
- Footer buttons: Send Test (gated), Cancel, Save. Save uses `PATCH /lfiq/templates/{id}` with `{ content, description }` only — other fields untouched.
- Wires `DirtyFormGuard`.
- **Acceptance**: open → edit → save → list refetches; open → edit → close with dirty → confirm.
- **Depends on**: 3.3, 3.4, 3.5, 3.6.

### 3.8 `SendTestSubModal` + `useSendTestTemplate` [frontend]

- Files: `_v2/_components/EditTemplateModalV2/SendTestSubModal.tsx`, `_v2/_hooks/useSendTestTemplate.ts`
- Sub-modal inside edit modal — recipient email input (Joi validation: required, email shape).
- Mutation calls `POST /lfiq/templates/{id}/send-test` with `{ recipient, sample_args: testValues }`.
- **Capability gating**: reads a runtime flag `SEND_TEST_EMAIL_AVAILABLE` (from env or a BE capability probe landed in B.1). When false, Send Test button renders disabled with tooltip; sub-modal is never mounted.
- **Acceptance**: feature flag off → disabled tooltip visible; feature flag on → sub-modal opens, valid email submits successfully.
- **Depends on**: 3.7, B.1.

### 3.9 `CreateTemplateModalV2` [frontend]

- File: `_v2/_components/CreateTemplateModalV2/index.tsx`
- Wraps the `EditTemplateModalV2` shell in create mode — blank content, required `template_name`, `scope`, `language` inputs. Save uses `POST /lfiq/templates`.
- **Acceptance**: create new template → list refetches and shows it.
- **Depends on**: 3.7.

### 3.10 `PreviewTemplateModalV2` [frontend]

- File: `_v2/_components/PreviewTemplateModalV2/index.tsx`
- Read-only: 2-zone desktop (PreviewPane + VariablesPanel with still-editable test inputs but no Save / Send Test / content editor).
- Footer: single Close button.
- **Acceptance**: opens from table row Preview action; Esc closes.
- **Depends on**: 3.3, 3.4.

### 3.11 Wire modals into list page [frontend]

- File: `_v2/EmailTemplatesPage.tsx`
- Table row actions → open `EditTemplateModalV2` / `PreviewTemplateModalV2`. Header Create button → open `CreateTemplateModalV2`.
- **Acceptance**: full end-to-end flow works in dev mode.
- **Depends on**: 3.7, 3.9, 3.10.

---

## Phase 4 — i18n + polish + tests [frontend]

### 4.1 i18n keys in all locale files [frontend]

- Files: `lf-iq/messages/*.json` (or equivalent dir — BA note: confirm exact path on landing; keys ship to every file).
- Add `AdminEmailTemplatesV2.*` namespace per design §9.
- **Acceptance**: build-time i18n key check passes; missing-key lint (if present) clean.
- **Depends on**: Phase 3 complete.

### 4.2 Null-guard audit [frontend]

- Sweep every `_v2/` file for `.field` / `.arr[0]` reads on API-sourced data. Apply optional chaining + fallback defaults per lf-iq feedback rule.
- **Acceptance**: code review checklist item confirmed by lint run + manual diff review.
- **Depends on**: Phase 3 complete.

### 4.3 Unit + component tests [frontend]

- Ensure every util / hook / component from Phases 2–3 has Jest coverage per its acceptance criteria. Target ≥ 80% on `_v2/` tree.
- Minimum suites:
  - `renderThymeleafLite` (scalar, nested, list, unsupported fallback)
  - `useEmailTemplatesList` (success, error, empty)
  - `VariablesPanel` (input → immutable tree update)
  - `EditTemplateModalV2` (open → save; dirty close confirmation)
  - `SendTestSubModal` (disabled state; valid submit)
- **Acceptance**: `npm test` green; coverage report ≥ 80% on v2 tree.
- **Depends on**: Phase 3 complete.

### 4.4 Visual regression pass [frontend]

- Compare list screen against mockup `01-list.html`, edit modal against `02-edit-modal.html`, mobile against `05-mobile.html` at 320 / 768 / 1280.
- **Acceptance**: no visible drift; screenshots attached to PR.
- **Depends on**: 4.1, 4.2, 4.3.

---

## BE Discovery — parallel track [backend]

### B.1 Verify `POST /lfiq/templates/{id}/send-test` [backend]

- Owner: `dev-be` on lfiq-backend.
- Check: does the endpoint already exist? If yes, document request/response; if no, estimate implementation cost (1 story-point bucket). No implementation in this change.
- Expected request (if implemented): `{ recipient: string, sample_args: Record<string, unknown> }` → `ApiBaseResponse<{ sent_at: string }>`.
- **Acceptance**: posts a reply on this change with one of: "Exists — here is the contract" / "Not yet — rough cost N". The FE capability flag (used in 3.8) is set based on this outcome.
- **Depends on**: none — starts alongside Phase 1.

### B.2 Verify scope / language query params on `GET /lfiq/templates` [backend]

- Owner: `dev-be` on lfiq-backend.
- Check: does the endpoint accept `scope` and/or `language` query parameters today? If yes, document exact names + accepted values. If no, note it for a future change.
- **Acceptance**: written capability note attached to this change; informs a future follow-up feature. Does **not** block Phase 0–4.
- **Depends on**: none.

---

## Out-of-scope reminder

No delete action, no bulk ops, no version history UI, no scope/language registration UI, no auto-migration of v1 users, no client-side filter fallback. See `proposal.md` §Out of Scope.
