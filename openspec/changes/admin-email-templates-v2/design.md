# Admin Email Templates v2 — Design

## 1. Versioning Strategy — `withUIVersion` HOC

Same pattern as `admin/reports/page.tsx`. The route file at `/admin/email-templates/page.tsx` becomes a thin delegator:

```tsx
'use client'
import { withUIVersion } from '@shared/components/withUIVersion'

const EmailTemplatesPage = withUIVersion(
  () => import('./_v1/EmailTemplatesPage'),
  () => import('./_v2/EmailTemplatesPage')
)

export default function AdminEmailTemplatesPage() {
  return <EmailTemplatesPage />
}
```

### Folder layout

```
admin/email-templates/
├─ page.tsx                            # delegator via withUIVersion
├─ _v1/
│  ├─ EmailTemplatesPage.tsx           # current page.tsx logic
│  └─ _components/                     # moved: CreateEmailTemplateModal, EditEmailTemplateModal, PreviewEmailTemplateModal
└─ _v2/
   ├─ EmailTemplatesPage.tsx
   ├─ _components/
   │  ├─ EmailTemplatesHeader.tsx
   │  ├─ EmailTemplatesStatStrip.tsx
   │  ├─ EmailTemplatesToolbar.tsx
   │  ├─ EmailTemplatesTable.tsx
   │  ├─ EditTemplateModalV2/
   │  │  ├─ index.tsx                  # modal shell + form provider
   │  │  ├─ EditorPane.tsx             # description input + EditorField content editor
   │  │  ├─ PreviewPane.tsx            # sandboxed iframe + viewport toggle
   │  │  ├─ VariablesPanel.tsx         # interactive test harness
   │  │  ├─ VariableNode.tsx           # recursive single-variable renderer
   │  │  ├─ SendTestSubModal.tsx       # recipient email capture
   │  │  └─ DirtyFormGuard.tsx
   │  ├─ CreateTemplateModalV2/
   │  │  └─ index.tsx                  # wraps EditTemplateModalV2 shell in create mode
   │  └─ PreviewTemplateModalV2/
   │     └─ index.tsx                  # read-only iframe + Variables tree
   ├─ _hooks/
   │  ├─ useEmailTemplatesList.ts      # React Query; wraps /lfiq/templates
   │  ├─ useEmailTemplateDetail.ts     # React Query; wraps /lfiq/templates/{id}
   │  ├─ useSendTestTemplate.ts        # React Query mutation; capability-gated
   │  └─ useDirtyFormGuard.ts
   ├─ _types/
   │  ├─ emailTemplate.ts              # summary/detail/arguments types
   │  └─ variableNode.ts               # recursive variable tree shape
   ├─ _utils/
   │  ├─ buildPreviewSrcdoc.ts         # merges content + test values → HTML string
   │  ├─ renderThymeleafLite.ts        # minimal Thymeleaf-like substitution for preview only
   │  └─ defaultTestValues.ts          # seed values by type for Variables panel
   └─ _atoms/
      └─ emailTemplatesAtoms.ts        # Jotai atoms if cross-component state needed
```

## 2. Component Tree (v2)

```
EmailTemplatesPage
├─ EmailTemplatesHeader                — title + subtitle + "+ Create" button
├─ EmailTemplatesStatStrip             — 4 KpiCards (Total / By scope / By language / Modified 7d)
├─ EmailTemplatesToolbar               — sticky; search + refresh
└─ EmailTemplatesTable                 — GeneralTable; pagination footer
   └─ row actions → opens EditTemplateModalV2 or PreviewTemplateModalV2

EditTemplateModalV2 (mode: edit | create)
├─ header: template_name breadcrumb + close
├─ desktop body (3 zones):
│  ├─ EditorPane                       — description TextField + EditorField (source mode)
│  ├─ PreviewPane                      — iframe (sandbox="allow-same-origin") + viewport toggle
│  └─ VariablesPanel                   — recursive VariableNode tree + test inputs
├─ mobile body (tabs): Edit | Preview | Variables
├─ DirtyFormGuard                      — blocks close/route change when form isDirty
└─ footer: Send Test (gated) · Cancel · Save

PreviewTemplateModalV2
├─ header
├─ desktop body (2 zones): PreviewPane + VariablesPanel (read-only inputs still populate preview)
└─ footer: Close
```

## 3. Interaction Model — Modal vs Route

Decision: **modal-based, no new routes**.

**Why:**
- The admin flow is very short (open → tweak → save → close). Introducing `/admin/email-templates/[id]/edit` would fragment state, require a second fetch, and complicate v1/v2 routing.
- The 3-pane editor + preview + variables surface is a single logical workspace; a modal keeps mental context of which template you came from.
- Aligns with v1 which already uses modals; opt-in toggle stays clean.

**Consequences:**
- URL does **not** reflect "edit mode" — this is acceptable for admin tooling.
- Deep-linking to a specific template in edit mode is not supported; use the list search instead.

## 4. Variables Panel — Interactive Test Harness

### Data source

From `GET /lfiq/templates/{id}`:

```ts
type TemplateArgument = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'list' | string // fallback for unknown
  description?: string
  schema?: TemplateArgument[]      // for object: nested fields
  items?: TemplateArgument          // for list: element schema (can itself be object)
}
```

### State shape (per-template, session-only, not persisted)

```ts
type VariableTestValue =
  | { kind: 'scalar'; value: string | number | boolean }
  | { kind: 'object'; fields: Record<string, VariableTestValue> }
  | { kind: 'list'; items: VariableTestValue[] } // users add/remove items

type TestValues = Record<string /* top-level arg name */, VariableTestValue>
```

Stored in local React state inside `EditTemplateModalV2`. Seeded by `defaultTestValues` (e.g. `""` for string, `0` for number, `[{ /* one item */ }]` for list).

### Data flow

```
VariablesPanel input change
    → setTestValues(new)        (immutable update via _utils/updateNested)
    → useMemo: buildPreviewSrcdoc(content, testValues)
    → iframe.srcdoc = generatedHtml
    → iframe re-renders inside its sandbox
```

`buildPreviewSrcdoc` wraps rendered HTML in a minimal document with `<base target="_blank">` to keep link navigation out of the iframe and a small reset stylesheet.

### Thymeleaf handling

Since full Thymeleaf rendering needs server-side evaluation, the preview uses a **lite client-side substitution** (`renderThymeleafLite`) that supports only:
- `[[${var}]]` and `[[${obj.field}]]` dotted access
- `th:text="${var}"` → replaces inner text
- `th:each="x : ${list}"` → simple loop (one level deep; documented limitation)

For anything more complex the preview shows a small banner: *"Preview may differ from server-rendered output. Send a test email to validate."* Users still get useful feedback for common patterns.

### Send Test reuse

When Send Test is clicked, `testValues` is JSON-serialized and submitted as `sample_args` in the (capability-gated) `POST /lfiq/templates/{id}/send-test` call along with the recipient email captured in `SendTestSubModal`.

## 5. EditorField Reuse

`src/shared/fields/EditorField/index.tsx` already supports HTML template editing (source textarea + sandboxed iframe preview internally). v2 uses it in **source mode only** for `content`. We do **not** use its built-in preview (we control the preview pane ourselves so test-value substitution happens predictably).

Rationale: consistency with the rest of lf-iq, fewer new dependencies, already battle-tested in admin forms.

## 6. Preview iframe Sandbox Policy

```tsx
<iframe
  title="Template preview"
  srcDoc={generatedHtml}
  sandbox="allow-same-origin"     // no allow-scripts — template HTML must not execute JS
  className="h-full w-full border-0"
/>
```

- `allow-same-origin` lets our minimal reset CSS apply without hitting cross-origin issues on `<base>`/data URIs.
- **No** `allow-scripts`, `allow-forms`, `allow-popups` — even if a template contains `<script>`, it will not execute.
- All URLs in preview are rewritten client-side by `buildPreviewSrcdoc` to add `target="_blank" rel="noopener"` on `<a>` tags.

## 7. Dirty-Form Guard

Uses `react-hook-form` `formState.isDirty`. A single `useDirtyFormGuard` hook subscribes to:
- Mantine `Modal` `onClose` — intercept and show `ConfirmDialog`.
- Next.js `beforeunload` via `window.addEventListener` while modal is open.

On confirm: discards and closes. On cancel: keeps modal open, focus returns to last-focused form field.

## 8. URL-Synced State

v2 list screen uses the existing `useUrlParams` hook (pattern identical to `admin/reports/_v2`):
- `?search=abc` drives the search input (debounced 300 ms).
- `?page=N&pageSize=20` drive pagination.
- Refreshing the browser restores the list state.

## 9. i18n Keys

Namespace: `AdminEmailTemplatesV2`. Keys are `snake_case`, grouped:
- `header.*` — title, subtitle, create_button
- `stats.*` — total, by_scope, by_language, modified_7d
- `toolbar.*` — search_placeholder, refresh
- `table.*` — columns.*, empty_state, row_action_edit, row_action_preview
- `edit_modal.*` — title, save, cancel, send_test, dirty_warning, description_label, content_label
- `preview.*` — desktop_viewport, mobile_viewport, thymeleaf_warning
- `variables.*` — panel_title, add_item, remove_item, apply_to_preview, type_badge_*
- `send_test.*` — modal_title, recipient_label, submit, disabled_tooltip

All keys added to every file under `lf-iq/messages/` (BA confirmed: 7 languages per CLAUDE.md feedback note — check `messages/` dir when landing).

## 10. Jotai vs Local State

- **Local `useState` / `react-hook-form`** inside the modal: form fields, testValues, viewport toggle.
- **Jotai atom** only for list-level cross-component state if needed (e.g., to sync the "just created" flash from CreateTemplateModalV2 back to the toolbar). Prefer React Query's cache invalidation first; introduce a Jotai atom only if a clear need emerges.

## 11. BE Discovery Tasks (Context for FE)

### D1. Send-test endpoint

Expected shape (if BE team implements):
```
POST /lfiq/templates/{id}/send-test
Body: { recipient: string, sample_args: Record<string, unknown> }
Returns: ApiBaseResponse<{ sent_at: string }>
```

FE behavior based on discovery outcome:
- **Endpoint exists** → enable button, wire mutation.
- **Endpoint missing** → button renders disabled with tooltip "Coming soon — backend endpoint not yet available" (i18n key `send_test.disabled_tooltip`).

No client-side fallback for actually sending mail.

### D2. Filter params on list

Current FE uses only `search`, `pageSize`, `currentPage`. Discovery asks BE to confirm whether `scope` and `language` query params are accepted. This task's outcome informs a **future** (deferred) feature — not Phase 0.

## 12. Testing Strategy

- Unit: `renderThymeleafLite`, `buildPreviewSrcdoc`, `defaultTestValues`, `useDirtyFormGuard`.
- Component: `VariablesPanel` input → state; `EditTemplateModalV2` open/close flow; dirty-form confirmation; disabled Send Test tooltip.
- List: `EmailTemplatesTable` renders 0 rows / N rows / pagination; search debounce behavior.
- i18n: Jest snapshot verifies every key used in code is present in every message file.

## 13. Non-Goals / Known Limitations

- Preview is a **lite** renderer. Complex Thymeleaf features (fragments, message expressions, conditionals beyond trivial cases) will display a warning banner and render approximate output. Users rely on Send Test for final validation.
- No accessibility regression from v1 — v2 must preserve keyboard nav (Tab through Variables inputs; Esc to close modal; Enter to save via `react-hook-form` submit).
