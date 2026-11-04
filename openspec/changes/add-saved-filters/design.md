# Design: Saved Filters

## Overview

A generic per-user preset mechanism. The backend stores presets in a dedicated `saved_filters`
table scoped to the real user id. The frontend exposes a reusable hook + menu component that any
URL-as-source list page can adopt by passing a `target` key. Applying a preset is just writing the
preset's saved query string + metadata back into the page URL (Pattern A), which re-triggers the
existing list query.

---

## Backend (`lfiq-backend`)

### Module layout (mirror `releasenote`)

```
com.loanfactory.lfiq.savedfilter/
  SavedFilterConfiguration.java                 (@Bean wiring; registered in BaseAutoConfiguration)
  entity/SavedFilterEntity.java                 (extends AbstractAuditableEntity)
  service/SavedFilterService.java               (interface)
  service/impl/SavedFilterServiceImpl.java
  facade/SavedFilterFacade.java                 (interface)
  facade/impl/SavedFilterFacadeImpl.java
  controller/SavedFilterController.java         (@RequestMapping("/v1/saved-filters"))
  model/request/CreateSavedFilterRequest.java   (extends AbstractRequest)
  model/request/UpdateSavedFilterRequest.java   (extends AbstractRequest)
```

> No Flyway — Hibernate `ddl-auto: update` auto-creates the table. No migration file needed.

### Entity: `SavedFilterEntity` (table `saved_filters`)

Extends `com.loanfactory.core.base.entity.AbstractAuditableEntity` (provides UUID `id`,
snake_case JSON via `@JsonNaming`, and audit fields `createdBy` / `createdDate` /
`lastModifiedBy` / `lastModifiedDate` auto-filled). Annotate with `@Entity`, `@Table`, `@Getter`,
`@Setter`, `@SuperBuilder`, `@NoArgsConstructor`, `@FieldNameConstants`. camelCase field →
snake_case column mapping is automatic. Do **not** add Hibernate Search `@Indexed` (presets are
not full-text searched).

| Field (Java camelCase) | Column / JSON (snake_case) | Type | Notes |
|---|---|---|---|
| `userId` | `user_id` | `String` | Owner. Stamped from `SecurityUtils.getCurrentUserId(true)`. Indexed. **Never editable.** |
| `target` | `target` | `String` | Page/section key (e.g. `REPORT`, `USER`). Indexed. What FE calls "root". Required. |
| `name` | `name` | `String` | User-given preset name. Required (`@Column(nullable = false)`). |
| `filter` | `filter` | `String` | Filter DSL value (e.g. `tag eq "hehe"`). Nullable. |
| `sort` | `sort` | `String` | Sort directive (e.g. `createdDate,desc`). Nullable. |
| `search` | `search` | `String` | Free-text search term. Nullable. |
| `url` | `url` | `String` (`columnDefinition = "TEXT"`) | Full canonical query string to apply. Source of truth for "apply". |
| `metadata` | `metadata` | `Map<String,Object>` (`jsonb`) | Dynamic FE-owned keys, e.g. `view_mode`, `page_size`. `@Column(columnDefinition = "jsonb") @JdbcTypeCode(SqlTypes.JSON)`, `@Builder.Default = new HashMap<>()`. |
| `isDefault` | `is_default` | `boolean` | The single default/favorite per `(user_id, target)`. `@Builder.Default = false`. |

Indexes (in `@Table(indexes = {...})`):
- `idx_saved_filter_user` on `user_id`
- `idx_saved_filter_user_target` on `user_id, target`

> No DB unique constraint on "one default per (user, target)" — partial unique indexes are awkward
> via Hibernate `ddl-auto`. The single-default invariant is enforced in the **service layer** inside
> a transaction (see below).

Define `@FieldNameConstants`-generated `Fields.USER_ID`, `Fields.TARGET`, `Fields.IS_DEFAULT`, etc.
for use in JPA `Specification`s. Add `equals`/`hashCode` delegating to `super` like
`ReleaseNoteEntity`.

### Request DTOs (extend `AbstractRequest`, Bean Validation)

`CreateSavedFilterRequest`:
- `@NotBlank target`
- `@NotBlank name`
- `filter`, `sort`, `search` (optional `String`)
- `@NotBlank url`
- `Map<String,Object> metadata` (`@Builder.Default = new HashMap<>()`)
- `boolean isDefault` (`@Builder.Default = false`) — `@JsonProperty("is_default")`

`UpdateSavedFilterRequest` (PATCH — all nullable; only provided fields applied):
- `name`, `filter`, `sort`, `search`, `url` (nullable `String`)
- `Map<String,Object> metadata` (nullable — when present, replaces the map)
- `Boolean isDefault` (nullable `Boolean` — when `true`, set this preset as default and unset
  others for the same `(user_id, target)`; when `false`, clear default on this preset; when `null`,
  leave unchanged)
- `target` and `user_id` are **not** updatable (ignore if sent).

All request fields use `@JsonProperty` snake_case names matching the entity.

### Controller: `SavedFilterController` (`/v1/saved-filters`)

Return plain entities / `Page<T>`; `BaseResponseHandler` wraps the envelope and pagination
automatically.

| Method | Path | Body | Returns | Status |
|---|---|---|---|---|
| `POST` | `/v1/saved-filters` | `CreateSavedFilterRequest` | `SavedFilterEntity` | 201 |
| `GET` | `/v1/saved-filters` | — (`?target=` and/or `@SearchEntity ?filter=...`, `Pageable`) | `Page<SavedFilterEntity>` | 200 |
| `PATCH` | `/v1/saved-filters/{id}` | `UpdateSavedFilterRequest` | `SavedFilterEntity` | 200 |
| `DELETE` | `/v1/saved-filters/{id}` | — | void | 204 |

- `GET` is annotated `@SearchEntity(target = SavedFilterEntity.class)` for DSL filtering, and also
  accepts an optional `@RequestParam(required = false) String target` convenience param. **Both
  paths must additionally constrain results to the current user** (see service). The list is
  ordered `is_default desc, name asc` so the default surfaces first.
- All mutations validate ownership before writing.

> `@SearchEntity` builds a `Specification` from `?filter`. The list endpoint must **AND** a
> mandatory `user_id eq currentUserId` predicate on top so a crafted `?filter` can never read
> another user's presets. Implement the user scoping in the service/facade rather than trusting the
> incoming filter (do not rely on the client to send `user_id`).

### Facade & Service

**Facade** delegates to the service (thin), mirroring `ReleaseNoteFacadeImpl`. The facade resolves
the current user id via `SecurityUtils.getCurrentUserId(true)` and passes it down (or the service
reads it directly — keep it in one place; service is fine since `releasenote` reads `SecurityUtils`
in the service).

**Service** (`SavedFilterServiceImpl`, constructor-injected `EntityService`):

- `create(request)`:
  1. `userId = SecurityUtils.getCurrentUserId(true)`.
  2. If `request.isDefault()` is true → first `clearDefault(userId, request.getTarget())`.
  3. Build entity with `userId`, `target`, `name`, `filter`, `sort`, `search`, `url`, `metadata`,
     `isDefault`; `entityService.save(entity)`.
- `listByCurrentUser(target, pageable, specFromSearchEntity)`:
  - Compose a `Specification` = `(user_id eq currentUserId)` AND (`target eq target` if provided)
    AND (the `@SearchEntity` spec if provided). `entityService.getAllBy(SavedFilterEntity.class,
    spec, pageable)` with default sort `is_default desc, name asc` applied if pageable has no sort.
- `update(id, request)`:
  1. `entity = getOwnedById(id)` (throws `ResourceNotFoundException` if missing **or** not owned —
     do not leak existence).
  2. Apply provided scalar fields (`name`, `filter`, `sort`, `search`, `url`, `metadata`).
  3. If `request.getIsDefault() == TRUE` → `clearDefault(entity.getUserId(), entity.getTarget())`
     then `entity.setIsDefault(true)`. If `FALSE` → `entity.setIsDefault(false)`. If `null` → no change.
  4. `entityService.save(entity)`.
- `delete(id)`: `entity = getOwnedById(id)`; `entityService.delete(entity)`.
- `getOwnedById(id)`: `getOneBy(spec: id eq id AND user_id eq currentUserId)`; throw
  `ResourceNotFoundException("Saved filter [%s] not found")` when null.
- `clearDefault(userId, target)`: find all entities where `user_id eq userId AND target eq target
  AND is_default eq true`, set `isDefault=false`, `entityService.saveAll(...)`. This is the
  single-default invariant; the whole `update`/`create` runs in a transaction so set-default is
  atomic (use `@Transactional` on the service method, consistent with how the codebase manages
  transactions, or `ConcurrentTransactionService` if needed — prefer the simplest correct option).

### `SavedFilterConfiguration` + registration

```java
public class SavedFilterConfiguration {
    @Bean SavedFilterService savedFilterService(EntityService es) { return new SavedFilterServiceImpl(es); }
    @Bean SavedFilterFacade savedFilterFacade(SavedFilterService s) { return new SavedFilterFacadeImpl(s); }
}
```

Add `import com.loanfactory.lfiq.savedfilter.SavedFilterConfiguration;` and
`SavedFilterConfiguration.class` to the `@Import({...})` list in
`com.loanfactory.lfiq.BaseAutoConfiguration`.

### Login-as / sub-account handling

`SecurityUtils.getCurrentUserId(true)` returns the **real authenticated user id**. The frontend
separately keys cache by the real admin id. Presets are therefore always owned by and visible to the
real admin user even when impersonating (login-as) another account. Do not key presets to the
impersonated account.

---

## Frontend (`lf-iq`)

### API layer — `src/apis/private-api.ts`

Add four functions through the existing private client (never call `ApiConfig` directly):

```ts
// snake_case payloads; backend returns ApiBaseResponse<SavedFilter> / PageableResponse<SavedFilter>
listSavedFilters(target: string): Promise<SavedFilter[]>          // GET /v1/saved-filters?target=
createSavedFilter(body: CreateSavedFilterBody): Promise<SavedFilter>   // POST
updateSavedFilter(id: string, body: UpdateSavedFilterBody): Promise<SavedFilter> // PATCH /{id}
deleteSavedFilter(id: string): Promise<void>                      // DELETE /{id}
```

Types (place in `src/shared/types/` and/or co-located): `SavedFilter` mirrors the entity with
snake_case fields (`id`, `user_id`, `target`, `name`, `filter`, `sort`, `search`, `url`,
`metadata: Record<string, unknown>`, `is_default`, audit fields). IDs are `string` (UUID).
`metadata` is typed loosely (`Record<string, unknown>`) with helper accessors for known keys
(`view_mode`, `page_size`).

### Reusable hook — `useSavedFilters(target)`

Location: `src/shared/hooks/useSavedFilters.ts` (generic, not page-specific).

- `useQuery({ queryKey: ['saved-filters', target, currentUserId], queryFn: () => listSavedFilters(target) })`
  — `currentUserId = useUserProfile().id` (real admin id, login-as safe). Key by user id so
  impersonation does not cross caches.
- Mutations (`useMutation` + `queryClient.invalidateQueries(['saved-filters', target, ...])`):
  - `createPreset({ name, url, filter, sort, search, metadata, isDefault })`
  - `updatePreset(id, patch)` — rename, edit captured values, and/or toggle default
  - `deletePreset(id)`
  - `setDefault(id)` — convenience over `updatePreset(id, { is_default: true })`
- Each mutation calls `notifySuccess` / `notifyError` from `useToast()`.
- Returns `{ presets, defaultPreset, isLoading, createPreset, updatePreset, deletePreset, setDefault }`.

The hook is **page-agnostic**: it knows nothing about how to read/write the URL. The page wires
"capture current state → preset" and "apply preset → URL" (below).

### Reusable component — `SavedFiltersMenu`

Location: `src/shared/components/SavedFiltersMenu/index.tsx`.

Props (so each page stays in control of its own filter shape):
```ts
interface SavedFiltersMenuProps {
  target: string
  /** Build the canonical preset payload from the page's *current* state. */
  captureCurrent: () => { url: string; filter?: string; sort?: string; search?: string; metadata: Record<string, unknown> }
  /** Apply a preset's saved values back into the page (writes the URL via Pattern A). */
  onApply: (preset: SavedFilter) => void
  loading?: boolean
}
```

UI (Mantine only — `Menu`, `ActionIcon`, `Modal`, `Button`, `TextInput`; **no** `Stack` / `Group` /
`Text` / `Title`; **no** raw `<button>`; custom triggers via Mantine `Button` unstyled + classNames;
Tailwind for layout):
- Trigger: an `ActionIcon`/`Button` (a star/bookmark icon from `@tabler/icons-react`).
- Menu body:
  - "Save current filters…" → opens the Save `Modal` (name `TextInput`, optional
    "Set as default" checkbox) → calls `captureCurrent()` + `createPreset(...)`.
  - List of presets: default pinned to top with a filled star; each row has Apply (click name),
    Set-as-default (star toggle → `setDefault`), Rename (opens Modal prefilled → `updatePreset(id,
    { name })`), Delete (confirm → `deletePreset`).
  - Empty state copy from i18n (`SavedFilters.empty_state`).
- While the hook is loading/mutating, dim the menu list (`opacity-60` + `aria-busy`) and disable
  action controls.

> **Rename vs edit captured values**: rename (just `name`) and "update this preset to my current
> filters" (re-`captureCurrent()` → `updatePreset(id, {...})`) are **two distinct actions** in the
> row menu: "Rename" and "Update to current filters". Both go through `updatePreset`.

### Applying a preset (Pattern A)

A preset's `url` is the canonical apply value. `onApply(preset)` (provided per page) does:
1. Parse `preset.url` into `URLSearchParams`.
2. Read `metadata.view_mode` / `metadata.page_size` and merge them into the URL params (these are
   part of the page's URL state too — see Reports migration).
3. `router.replace(`${pathname}?${params}`, { scroll: false })` — i.e. reuse the page's existing
   Pattern A setter so the list re-queries. **Never** copy preset values into `useState`/Jotai.

### Auto-apply default on page open

In each wired page, on mount:
- If a `defaultPreset` exists for the `target` **and** the current URL carries **no explicit
  filters** (the page's "is the URL empty of filters?" check — for Users, compare against
  `DEFAULT_USER_FILTER_VALUES` / empty search params; for Reports, empty filter params), then call
  `onApply(defaultPreset)` once.
- Guard with a ref so it only fires once per mount and never overrides a shared/deep link.
- If the URL already has explicit filters, do nothing (respect the incoming link).

### Wiring — Users (`admin/users`, target `USER`)

Already Pattern A via `useUserFilterUrl` (`setValues`). Add:
- `useSavedFilters('USER')`.
- `captureCurrent()` builds `url` from `serializeFilterValuesToSearchParams(values)` plus
  `view_mode` / `page_size` params; `metadata = { view_mode, page_size }`; `filter`/`sort`/`search`
  derived from current `values`.
- `onApply(preset)` parses `preset.url`/`metadata` and calls `setValues(...)` (+ sets page size /
  view mode through their existing setters, promoting them into the URL if not already).
- Render `<SavedFiltersMenu .../>` in the toolbar slot (mirror `viewModeSlot`) or
  `AdminPageHeader.actions`.
- No behavior change to existing Users filtering when no preset is used.

### Wiring — Reports (`admin/reports`, target `REPORT`) — includes URL migration

Reports currently holds `toolbar` (`ReportsToolbarState`), `pagination` (`pageSize`), and `viewMode`
in `useState`. Migrate to URL-as-source first:

1. **New hook `useReportsFilterUrl`** at
   `src/app/[locale]/(admin)/admin/reports/_v2/_hooks/useReportsFilterUrl.ts`, mirroring
   `useUserFilterUrl`:
   - Whitelisted parse of `status`, `source`, `dateFrom`, `dateTo`, `sort`, `search`, `page`,
     `pageSize`, `viewMode` from `URLSearchParams` (reuse `ReportFilterValues` / `ReportSort` from
     `useReportsQuery.filters.ts`; field for items-per-page MUST be named `pageSize`).
   - `serialize…` omits defaults (mirror the Users serializer; default values come from
     `DEFAULT_REPORTS_TOOLBAR_STATE`).
   - `useReportsFilterUrl()` returns `{ values, setValues }` using `router.replace`.
2. **Refactor `ReportsPage/index.tsx`** to read `toolbar` / `pagination.pageSize` / `viewMode` from
   `useReportsFilterUrl().values` and write changes through `setValues` instead of `setToolbar` /
   `setPagination` / `setViewMode`. Keep ephemeral UI state (`selectedIds`, `copiedId`,
   `popoverOpened`, `updatingStatusId`, `deleting`) in local `useState` — those are not filters.
   `useReportsQuery` continues to consume `filter`/`sort`/`page`/`pageSize` derived from `values`.
3. **Then attach `SavedFiltersMenu`** with `target='REPORT'`, `captureCurrent` building `url` from
   the reports serializer + `metadata = { view_mode, page_size }`, and `onApply` calling
   `setValues`. Add auto-apply-default on mount with the empty-URL guard.

Keep `useReportsQuery.test.ts` green; add a unit test for the new
`useReportsFilterUrl` parse/serialize (parallel to any existing filter tests).

### i18n — `SavedFilters` namespace (all 7 locales)

Add a `SavedFilters` PascalCase namespace with snake_case keys to **all** of
`src/messages/{en,vi,zh,es,he,ar,ko}.json`. Keys (English values shown; translate or copy English
as placeholder for non-en where translation is unknown, consistent with repo practice):

| Key | English |
|---|---|
| `menu_title` | "Saved filters" |
| `save_current` | "Save current filters" |
| `name_label` | "Preset name" |
| `name_placeholder` | "e.g. Active loan officers" |
| `set_as_default` | "Set as default" |
| `default_badge` | "Default" |
| `apply` | "Apply" |
| `rename` | "Rename" |
| `update_to_current` | "Update to current filters" |
| `delete` | "Delete" |
| `delete_confirm` | "Delete this saved filter?" |
| `empty_state` | "No saved filters yet. Save your current filters to reuse them later." |
| `saved_success` | "Filter saved" |
| `updated_success` | "Filter updated" |
| `deleted_success` | "Filter deleted" |
| `default_set_success` | "Default filter updated" |
| `error_generic` | "Something went wrong. Please try again." |

---

## Data Flow

```
Create:  user clicks "Save current filters"
  → captureCurrent() reads page state → { url, filter, sort, search, metadata }
  → createPreset() → POST /v1/saved-filters (user_id stamped server-side)
  → invalidate ['saved-filters', target, userId] → list refetch → toast

Apply:   user clicks a preset name
  → onApply(preset) → parse preset.url + metadata → router.replace(url) (Pattern A)
  → page filter hook reads new URL → list query re-runs

Set default: star toggle → updatePreset(id, { is_default: true })
  → PATCH → service clears other defaults for (user, target) in a txn → invalidate → toast

Auto-apply: page mount + defaultPreset exists + URL has no explicit filters
  → onApply(defaultPreset) once (ref-guarded)
```

## Error Handling

- **Backend**: `ResourceNotFoundException` for missing/not-owned preset (don't leak existence);
  `BadRequestException` for validation failures surfaced via `BaseExceptionHandler`. Bean Validation
  (`@NotBlank`) on `target` / `name` / `url`.
- **Frontend**: every mutation has `onError` → `notifyError(t('SavedFilters.error_generic'))`;
  list query errors render the empty/error state, never crash the page. Optional-chain all
  `metadata` reads (keys may be absent for older presets).

## Testing

- **Backend** (JUnit5 + Mockito; mirror `springboot-tdd`): service unit tests for create (default
  toggling clears prior default), update (single-default invariant, ownership), ownership enforcement
  on read/update/delete (cannot touch another user's preset), list scoping (crafted `?filter`
  cannot read others). `./gradlew build` passes.
- **Frontend**: unit tests for `useReportsFilterUrl` parse/serialize round-trip; a test that
  `onApply` writes the expected URL; auto-apply guard does not fire when URL has filters. Keep
  `useReportsQuery.test.ts` green. `npx tsc --noEmit` clean; `npm run lint` clean.
