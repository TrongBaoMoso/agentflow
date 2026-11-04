# Tasks: Saved Filters

Branch: `feature/saved-filters` (created by DevOps in **both** `lf-iq` and `lfiq-backend`).
All task branches: `agent/<bead-id>-<short-desc>`, created from and merged into `feature/saved-filters`
within the respective repo.

Reference files (read before implementing):
- Backend CRUD template: `lfiq-backend/src/main/java/com/loanfactory/lfiq/releasenote/**`
- Config registration: `lfiq-backend/src/main/java/com/loanfactory/lfiq/BaseAutoConfiguration.java`
- JSONB pattern: `lfiq-backend/src/main/java/com/loanfactory/lfiq/user/entity/User.java` (`settingValues`)
- User id (login-as safe): `SecurityUtils.getCurrentUserId(true)`
- FE Pattern A reference: `lf-iq/src/app/[locale]/(admin)/admin/users/_v2/_hooks/useUserFilterUrl.ts`
- Reports page to migrate: `lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/ReportsPage/index.tsx`
- Reports filter builders: `lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_hooks/useReportsQuery.filters.ts`

---

## 1. Backend — saved-filters module (`lfiq-backend`)

- [ ] 1.1 **Create `SavedFilterEntity`** at
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/savedfilter/entity/SavedFilterEntity.java`.
  Extends `AbstractAuditableEntity`. `@Entity @Table(name = "saved_filters", indexes = { idx on
  user_id, idx on (user_id, target) })`, `@Getter @Setter @SuperBuilder @NoArgsConstructor
  @FieldNameConstants`. Fields: `userId` (String), `target` (String), `name` (String, `nullable=false`),
  `filter`, `sort`, `search` (String, nullable), `url` (`@Column(columnDefinition="TEXT")`),
  `metadata` (`Map<String,Object>` with `@Column(columnDefinition="jsonb") @JdbcTypeCode(SqlTypes.JSON)
  @Builder.Default = new HashMap<>()`), `isDefault` (`boolean`, `@Builder.Default = false`,
  `@JsonProperty("is_default")`). Add `equals`/`hashCode` delegating to `super`.
  **AC**: `./gradlew compileJava` passes; table `saved_filters` is created on app start with snake_case
  columns; JSON serializes snake_case.

- [ ] 1.2 **Create request DTOs** in
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/savedfilter/model/request/`.
  `CreateSavedFilterRequest extends AbstractRequest`: `@NotBlank target`, `@NotBlank name`, `filter`,
  `sort`, `search`, `@NotBlank url`, `Map<String,Object> metadata` (`@Builder.Default`), `boolean
  isDefault` (`@JsonProperty("is_default")`). `UpdateSavedFilterRequest extends AbstractRequest`: all
  nullable — `name`, `filter`, `sort`, `search`, `url`, `Map<String,Object> metadata`, `Boolean
  isDefault` (`@JsonProperty("is_default")`); `target`/`user_id` not present.
  **AC**: compiles; `@JsonProperty` snake_case names match the entity; `@Valid` rejects blank
  `target`/`name`/`url` on create.

- [ ] 1.3 **Create `SavedFilterService` interface + `SavedFilterServiceImpl`** in
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/savedfilter/service/`. Constructor-inject
  `EntityService`. Methods: `create(CreateSavedFilterRequest)`, `update(String id,
  UpdateSavedFilterRequest)`, `delete(String id)`, `getOwnedById(String id)`,
  `listByCurrentUser(String target, Pageable, Specification<SavedFilterEntity> searchSpec)`.
  Use `SecurityUtils.getCurrentUserId(true)` for the owner. `getOwnedById` throws
  `ResourceNotFoundException` when missing OR not owned (no existence leak). Apply provided scalar
  fields on update only when non-null.
  **AC**: compiles; create stamps `userId` from `SecurityUtils`; update/delete reject another user's
  preset with `ResourceNotFoundException`.

- [ ] 1.4 **Implement single-default invariant** in `SavedFilterServiceImpl`. Add private
  `clearDefault(userId, target)` that loads all `is_default=true` rows for `(user_id, target)`, sets
  them false, and `entityService.saveAll(...)`. On `create` (when `isDefault` true) and on `update`
  (when `isDefault == TRUE`) call `clearDefault` before setting this preset's `isDefault=true`; on
  `update` with `isDefault == FALSE` set false; `null` = no change. Make set-default atomic
  (`@Transactional` on the service method, or `ConcurrentTransactionService` if the codebase requires).
  **AC**: after setting a new default, exactly one preset per `(user, target)` has `is_default=true`;
  unit test proves the prior default is cleared in the same call.

- [ ] 1.5 **Implement user-scoped list** in `SavedFilterServiceImpl.listByCurrentUser`. Compose a
  `Specification` = `user_id eq currentUserId` AND (`target eq target` when provided) AND (the
  `@SearchEntity` spec when provided), then `entityService.getAllBy(SavedFilterEntity.class, spec,
  pageable)`. Default ordering `is_default desc, name asc` when pageable has no sort. The mandatory
  `user_id` predicate must always be ANDed so a crafted `?filter` cannot read another user's presets.
  **AC**: unit test — a `?filter=user_id eq "<otherUser>"` style spec still returns only the current
  user's presets.

- [ ] 1.6 **Create `SavedFilterFacade` interface + `SavedFilterFacadeImpl`** in
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/savedfilter/facade/`. Thin delegation to the
  service (mirror `ReleaseNoteFacadeImpl`). Methods for create / list / update / delete.
  **AC**: compiles; facade exposes the four operations the controller needs.

- [ ] 1.7 **Create `SavedFilterController`** at
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/savedfilter/controller/SavedFilterController.java`,
  `@RequestMapping("/v1/saved-filters")`. `POST` (`@Valid CreateSavedFilterRequest` → 201),
  `GET` (`@SearchEntity(target = SavedFilterEntity.class)`, optional `@RequestParam(required=false)
  String target`, `Pageable` → `Page<SavedFilterEntity>`), `PATCH /{id}` (`@Valid
  UpdateSavedFilterRequest` → 200), `DELETE /{id}` (→ 204). Return plain entities / `Page<T>` (envelope
  applied by `BaseResponseHandler`).
  **AC**: endpoints reachable; `GET` returns the `PageableResponse` envelope; `POST` returns the
  created entity in the `payload` envelope with snake_case fields.

- [ ] 1.8 **Create `SavedFilterConfiguration` and register it** in `BaseAutoConfiguration`.
  `SavedFilterConfiguration` declares `@Bean savedFilterService(EntityService)` and
  `@Bean savedFilterFacade(SavedFilterService)`. Add the import and `SavedFilterConfiguration.class`
  to the `@Import({...})` list in
  `lfiq-backend/src/main/java/com/loanfactory/lfiq/BaseAutoConfiguration.java`.
  **AC**: `./gradlew bootRun` starts; beans wire; `/v1/saved-filters` responds.

- [ ] 1.9 **Backend tests** under
  `lfiq-backend/src/test/java/com/loanfactory/lfiq/test/savedfilter/`. JUnit5 + Mockito service tests:
  create stamps user + toggles default; update enforces single default; ownership enforced on
  read/update/delete; list scoping ignores hostile `?filter`. Mirror `springboot-tdd` style.
  **AC**: `./gradlew test` passes; new tests cover the invariants above.

---

## 2. Frontend — API + reusable hook/component (`lf-iq`)

- [ ] 2.1 **Add `SavedFilter` types + API functions** to `lf-iq/src/apis/private-api.ts` (through the
  existing private client — never call `ApiConfig` directly). Define `SavedFilter` (snake_case:
  `id`, `user_id`, `target`, `name`, `filter?`, `sort?`, `search?`, `url`, `metadata: Record<string,
  unknown>`, `is_default`, audit fields; ID is `string`) plus `CreateSavedFilterBody` /
  `UpdateSavedFilterBody`. Functions: `listSavedFilters(target)`, `createSavedFilter(body)`,
  `updateSavedFilter(id, body)`, `deleteSavedFilter(id)`. Unwrap `ApiBaseResponse` /
  `PageableResponse` per repo convention.
  **AC**: `npx tsc --noEmit` clean; functions hit `GET/POST/PATCH/DELETE /v1/saved-filters`.

- [ ] 2.2 **Create reusable hook `useSavedFilters(target)`** at
  `lf-iq/src/shared/hooks/useSavedFilters.ts`. `useQuery({ queryKey: ['saved-filters', target,
  userId], queryFn: () => listSavedFilters(target) })` where `userId = useUserProfile().id` (real
  admin id, login-as safe). Mutations via `useMutation` + `queryClient.invalidateQueries(['saved-
  filters', target, userId])`: `createPreset`, `updatePreset(id, patch)`, `deletePreset(id)`,
  `setDefault(id)` (wraps `updatePreset(id, { is_default: true })`). Each mutation calls
  `notifySuccess`/`notifyError` from `useToast()`. Return `{ presets, defaultPreset, isLoading,
  createPreset, updatePreset, deletePreset, setDefault }`.
  **AC**: `npx tsc --noEmit` clean; cache invalidates after each mutation; cache keyed by real user id.

- [ ] 2.3 **Add `SavedFilters` i18n namespace to all 7 locale files**
  (`lf-iq/src/messages/{en,vi,zh,es,he,ar,ko}.json`). PascalCase namespace `SavedFilters`, snake_case
  keys per design.md (`menu_title`, `save_current`, `name_label`, `name_placeholder`,
  `set_as_default`, `default_badge`, `apply`, `rename`, `update_to_current`, `delete`,
  `delete_confirm`, `empty_state`, `saved_success`, `updated_success`, `deleted_success`,
  `default_set_success`, `error_generic`). Use real translations where known; English placeholder
  otherwise (consistent with repo practice).
  **AC**: all 7 files contain the `SavedFilters` namespace with identical key sets; `npm run build`
  does not report missing-message errors for used keys.

- [ ] 2.4 **Create reusable `SavedFiltersMenu` component** at
  `lf-iq/src/shared/components/SavedFiltersMenu/index.tsx`. Props: `target`, `captureCurrent()`,
  `onApply(preset)`, `loading?`. Mantine only (`Menu`, `ActionIcon`, `Modal`, `Button`, `TextInput`,
  `Checkbox`); NO `Stack`/`Group`/`Text`/`Title`; NO raw `<button>`; Tailwind for layout. Uses
  `useSavedFilters(target)`. Renders: "Save current filters…" (Modal: name + "set as default"),
  preset list (default pinned with filled star), per-row actions Apply / Set-as-default (star) /
  Rename (Modal) / "Update to current filters" / Delete (confirm). Empty state from
  `SavedFilters.empty_state`. While loading/mutating, dim list (`opacity-60` + `aria-busy`) and
  disable controls. All copy via `useTranslations('SavedFilters')`.
  **AC**: `npx tsc --noEmit` + `npm run lint` clean; create/apply/rename/update/delete/set-default all
  invoke the right hook method; rename and "update to current filters" are distinct actions.

---

## 3. Frontend — wire Users page (`lf-iq`, target `USER`)

- [ ] 3.1 **Wire `SavedFiltersMenu` into the Users page** (`admin/users/_v2`). Add
  `useSavedFilters('USER')` context via the menu. Implement `captureCurrent()` building `url` from
  `serializeFilterValuesToSearchParams(values)` plus `view_mode`/`page_size` params, `metadata = {
  view_mode, page_size }`, and `filter`/`sort`/`search` from current `values`. Implement `onApply`
  that parses `preset.url` + `metadata` and calls the existing `setValues` (and page-size / view-mode
  setters, promoting them into the URL). Render the menu in the toolbar slot (mirror `viewModeSlot`)
  or `AdminPageHeader.actions`. Do NOT duplicate filter state into `useState`/Jotai.
  **AC**: save → list shows preset; apply → URL updates and list re-queries; existing Users filtering
  unchanged when no preset used; `npx tsc --noEmit` clean.

- [ ] 3.2 **Add auto-apply-default on Users mount.** On mount, if `defaultPreset` exists for `USER`
  AND the URL carries no explicit filters (compare against `DEFAULT_USER_FILTER_VALUES` / empty
  params), call `onApply(defaultPreset)` once (ref-guarded). If URL already has filters, do nothing.
  **AC**: opening `/admin/users` with no query applies the default; opening a shared filtered URL does
  NOT override it; auto-apply fires at most once per mount.

---

## 4. Frontend — migrate + wire Reports page (`lf-iq`, target `REPORT`)

- [ ] 4.1 **Create `useReportsFilterUrl` hook** at
  `lf-iq/src/app/[locale]/(admin)/admin/reports/_v2/_hooks/useReportsFilterUrl.ts`, mirroring
  `useUserFilterUrl`. Whitelisted parse of `status`, `source`, `dateFrom`, `dateTo`, `sort`,
  `search`, `page`, `pageSize`, `viewMode` from `URLSearchParams` (reuse `ReportFilterValues` /
  `ReportSort` from `useReportsQuery.filters.ts`; items-per-page field MUST be named `pageSize`).
  `serialize…` omits defaults (defaults from `DEFAULT_REPORTS_TOOLBAR_STATE`). Return `{ values,
  setValues }` using `router.replace(..., { scroll: false })`.
  **AC**: `npx tsc --noEmit` clean; parse/serialize round-trip preserves non-default values and omits
  defaults.

- [ ] 4.2 **Refactor `ReportsPage/index.tsx` to URL-as-source.** Replace `useState` for `toolbar`,
  `pagination.pageSize`, and `viewMode` with reads from `useReportsFilterUrl().values`; route all
  filter/sort/page/pageSize/viewMode changes through `setValues`. Keep ephemeral UI state
  (`selectedIds`, `copiedId`, `popoverOpened`, `updatingStatusId`, `deleting`) in local `useState`.
  `useReportsQuery` continues to consume `filter`/`sort`/`page`/`pageSize` derived from `values`.
  **AC**: Reports list behaves as before but filters now live in the URL (shareable, back-button
  friendly); `useReportsQuery.test.ts` still passes; `npx tsc --noEmit` clean.

- [ ] 4.3 **Wire `SavedFiltersMenu` into Reports + auto-apply default.** Add the menu with
  `target='REPORT'`. `captureCurrent()` builds `url` from the reports serializer + `metadata = {
  view_mode, page_size }`; `onApply` parses `preset.url`/`metadata` and calls `setValues`. Add
  auto-apply-default on mount with the empty-URL guard (mirror task 3.2). Render in the toolbar slot
  (mirror `viewModeSlot`) or `AdminPageHeader.actions`.
  **AC**: save/apply/rename/update/delete/set-default all work on Reports; default auto-applies on
  open when URL has no filters; `npx tsc --noEmit` clean.

- [ ] 4.4 **Frontend unit tests.** Add tests for `useReportsFilterUrl` parse/serialize round-trip; a
  test that `onApply` writes the expected URL for a given preset; a test that auto-apply does NOT fire
  when the URL already carries filters. Keep `useReportsQuery.test.ts` green.
  **AC**: `npm test` passes; new tests cover the URL round-trip and auto-apply guard.

---

## 5. Verification

- [ ] 5.1 **Backend gate**: `./gradlew build` (compile + tests) passes; manual smoke of
  `POST/GET/PATCH/DELETE /v1/saved-filters` confirms per-user scoping and single-default invariant.
  **AC**: build green; two different users cannot see each other's presets.

- [ ] 5.2 **Frontend gate**: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
  Manual smoke on Users and Reports: save, apply (URL updates + list re-queries), rename, update,
  delete, set-default, auto-apply default on open, shared-link not overridden.
  **AC**: all gates green; Mantine/Tailwind/i18n/`pageSize` conventions satisfied; Reports toolbar is
  URL-driven; Users behavior unchanged.
