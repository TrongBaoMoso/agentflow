# Tasks: LFIQ Onboarding Workflow API

## 1. Foundation: Entity, Enum, State POJO, and SQL Migration

- [ ] 1.1 [backend] [haiku] Create `OnboardingStatus` enum

  **File**: `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/entity/OnboardingStatus.java` (new)

  Create the status enum with four values: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`.

  **Acceptance criteria**:
  - Enum has exactly four values
  - Package is `com.loanfactory.lfiq.onboarding.entity`
  - `./gradlew compileJava` passes

- [ ] 1.2 [backend] [sonnet] Create `OnboardingWorkflowState` JSONB POJO

  **File**: `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/entity/OnboardingWorkflowState.java` (new)

  Create the Serializable POJO that maps to the JSONB `state` column:
  - `status` (`OnboardingStatus`, default `NOT_STARTED`)
  - `currentStep` (`Integer`, default `0`)
  - `currentPage` (`String`, nullable)
  - `completedSteps` (`Set<Integer>`, default empty `HashSet`)
  - `skippedSteps` (`Set<Integer>`, default empty `HashSet`)
  - `pageTours` (`Map<String, Boolean>`, default empty `HashMap`)

  Annotations: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@SuperBuilder`, `@FieldNameConstants`.
  All fields annotated with `@JsonProperty` using snake_case names.
  Implement `equals()` and `hashCode()` (follow `FeedbackEntity.Metadata` pattern).
  Include a `static OnboardingWorkflowState createDefault()` factory method returning the default state.

  **Acceptance criteria**:
  - Implements `Serializable`
  - All fields have `@JsonProperty` with snake_case names (e.g., `@JsonProperty("current_step")`)
  - `@Builder.Default` on collection fields with empty defaults
  - `createDefault()` returns state with `NOT_STARTED`, step 0, empty collections
  - `./gradlew compileJava` passes

- [ ] 1.3 [backend] [sonnet] Create `OnboardingWorkflowEntity` JPA entity

  **File**: `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/entity/OnboardingWorkflowEntity.java` (new)

  Create the JPA entity:
  - Extends `com.loanfactory.core.base.entity.AbstractAuditableEntity`
  - `@Entity`, `@Table(name = "onboarding_workflows")` with unique constraint on `user_id` and index on `user_id`
  - Fields:
    - `userId` (`String`, `@Column(name = "user_id", nullable = false)`, `@JsonProperty("user_id")`)
    - `state` (`OnboardingWorkflowState`, `@Column(columnDefinition = "jsonb")`, `@JdbcTypeCode(SqlTypes.JSON)`, `@JsonProperty("state")`, `@Builder.Default` with `OnboardingWorkflowState.createDefault()`)
  - Lombok: `@Getter`, `@Setter`, `@SuperBuilder`, `@NoArgsConstructor`, `@FieldNameConstants`
  - Override `equals()` and `hashCode()` (include `userId` in comparison, follow `User` entity pattern)

  **Acceptance criteria**:
  - Table name is `onboarding_workflows`
  - Unique constraint named `uq_onboarding_user_id` on `user_id` column
  - Index named `idx_onboarding_user_id` on `user_id` column
  - `state` field uses `@JdbcTypeCode(SqlTypes.JSON)` and `columnDefinition = "jsonb"` (matches project JSONB pattern from `FeedbackEntity`, `ReportEntity`, etc.)
  - Default state is auto-initialized via `@Builder.Default`
  - `./gradlew compileJava` passes

- [ ] 1.4 [backend] [haiku] Create SQL migration script for `onboarding_workflows` table

  **File**: `lfiq-backend/src/main/resources/migration/create_onboarding_workflows_table.sql` (new)

  Create the manual migration script:
  - `CREATE TABLE IF NOT EXISTS onboarding_workflows` with columns: `id` (VARCHAR(36) PK with default `gen_random_uuid()::text`), `user_id` (VARCHAR(36) NOT NULL), `state` (JSONB NOT NULL with default), `created_by`, `created_date`, `last_modified_by`, `last_modified_date`
  - `CONSTRAINT uq_onboarding_user_id UNIQUE (user_id)`
  - `CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_workflows (user_id)`
  - Wrapped in `BEGIN; ... COMMIT;`

  **Acceptance criteria**:
  - Script is idempotent (`IF NOT EXISTS`)
  - Column types match `AbstractAuditableEntity` conventions (VARCHAR(36) for id, TIMESTAMP WITH TIME ZONE for dates)
  - Default JSONB value matches `OnboardingWorkflowState.createDefault()` output
  - Script runs without error on PostgreSQL 16

## 2. Core: Service and Facade Layers

- [ ] 2.1 [backend] [sonnet] Create `OnboardingWorkflowService` interface and implementation

  **Files**:
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/service/OnboardingWorkflowService.java` (new)
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/service/impl/OnboardingWorkflowServiceImpl.java` (new)

  Interface methods:
  - `OnboardingWorkflowEntity getOrCreateByUserId(String userId)`
  - `OnboardingWorkflowEntity updateState(String userId, UpdateOnboardingStateRequest request)`

  Implementation (`OnboardingWorkflowServiceImpl`):
  - Constructor dependency: `EntityService` (from tera-core)
  - Lombok: `@RequiredArgsConstructor`, `@Slf4j`

  **`getOrCreateByUserId(userId)`**:
  1. Build JPA `Specification<OnboardingWorkflowEntity>` where `userId` equals the parameter (use `OnboardingWorkflowEntity.Fields.USER_ID` from `@FieldNameConstants`)
  2. Call `entityService.getBy(OnboardingWorkflowEntity.class, spec)` -- returns `Optional`
  3. If present, return the entity
  4. If empty, create a new `OnboardingWorkflowEntity` with `userId` set, default `state`, and call `entityService.save(entity)` then return

  **`updateState(userId, request)`**:
  1. Call `getOrCreateByUserId(userId)` to get or create the record
  2. Get the `OnboardingWorkflowState` from the entity
  3. Merge non-null request fields:
     - `request.getStatus()` != null -> `state.setStatus(request.getStatus())`
     - `request.getCurrentStep()` != null -> `state.setCurrentStep(request.getCurrentStep())`
     - `request.getCurrentPage()` != null -> `state.setCurrentPage(request.getCurrentPage())`
     - `request.getCompletedSteps()` != null -> `state.setCompletedSteps(request.getCompletedSteps())`
     - `request.getSkippedSteps()` != null -> `state.setSkippedSteps(request.getSkippedSteps())`
     - `request.getPageTours()` != null -> `state.getPageTours().putAll(request.getPageTours())` (merge, not replace)
  4. Call `entityService.save(entity)` and return

  **Acceptance criteria**:
  - Uses `EntityService` for all data access (no custom repository)
  - `getOrCreateByUserId` is idempotent: calling it twice for the same user returns the same record
  - `updateState` merges `page_tours` additively but overwrites other fields
  - Specification uses `@FieldNameConstants` constant for type-safe field reference
  - `./gradlew compileJava` passes

- [ ] 2.2 [backend] [sonnet] Create `UpdateOnboardingStateRequest` model

  **File**: `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/model/request/UpdateOnboardingStateRequest.java` (new)

  Request body for `PATCH /me`:
  - All fields nullable (partial update semantics)
  - Fields: `status` (`OnboardingStatus`), `currentStep` (`Integer`), `currentPage` (`String`), `completedSteps` (`Set<Integer>`), `skippedSteps` (`Set<Integer>`), `pageTours` (`Map<String, Boolean>`)
  - All fields annotated with `@JsonProperty` using snake_case
  - Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@SuperBuilder`

  **Acceptance criteria**:
  - All fields are nullable (no `@NotNull` or `@NotBlank`)
  - JSON property names match the JSONB state structure (e.g., `current_step`, `page_tours`)
  - `./gradlew compileJava` passes

- [ ] 2.3 [backend] [sonnet] Create `OnboardingWorkflowFacade` interface and implementation

  **Files**:
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/facade/OnboardingWorkflowFacade.java` (new)
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/facade/impl/OnboardingWorkflowFacadeImpl.java` (new)

  Interface methods:
  - `OnboardingWorkflowEntity getOrCreateForCurrentUser()`
  - `OnboardingWorkflowEntity updateForCurrentUser(UpdateOnboardingStateRequest request)`

  Implementation (`OnboardingWorkflowFacadeImpl`):
  - Constructor dependency: `OnboardingWorkflowService`
  - Lombok: `@RequiredArgsConstructor`
  - Both methods extract user ID via `SecurityUtils.getCurrentUserId(true)` (throws 401 if not authenticated)
  - Delegate to `OnboardingWorkflowService`

  **Acceptance criteria**:
  - Uses `com.loanfactory.lfiq.utils.SecurityUtils.getCurrentUserId(true)` for auth
  - No direct `EntityService` usage in facade (delegates to service)
  - `./gradlew compileJava` passes

## 3. API: Controller and Configuration

- [ ] 3.1 [backend] [sonnet] Create `OnboardingWorkflowController`

  **File**: `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/controller/OnboardingWorkflowController.java` (new)

  REST controller:
  - `@RestController`, `@RequestMapping("/v1/onboarding-workflow")`, `@RequiredArgsConstructor`
  - Constructor dependency: `OnboardingWorkflowFacade`

  Endpoints:
  - `@GetMapping("/me")` -> `public OnboardingWorkflowEntity getMyOnboarding()` -- calls `facade.getOrCreateForCurrentUser()`
  - `@PatchMapping("/me")` -> `public OnboardingWorkflowEntity updateMyOnboarding(@Valid @RequestBody UpdateOnboardingStateRequest request)` -- calls `facade.updateForCurrentUser(request)`

  **Acceptance criteria**:
  - Base path is `/v1/onboarding-workflow` (matches existing pattern: `/v1/users`, `/v1/reports`)
  - GET `/me` returns 200 with the entity (auto-wrapped by `BaseResponseHandler`)
  - PATCH `/me` accepts a JSON body and returns 200 with the updated entity
  - Uses `@Valid` on the request body for potential future validation annotations
  - Controller is thin: no business logic, only delegates to facade
  - `./gradlew compileJava` passes

- [ ] 3.2 [backend] [sonnet] Create `OnboardingConfiguration` and register in `BaseAutoConfiguration`

  **Files**:
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/OnboardingConfiguration.java` (new)
  - `lfiq-backend/src/main/java/com/loanfactory/lfiq/BaseAutoConfiguration.java` (modify)

  `OnboardingConfiguration`:
  - Plain class (no `@Configuration` annotation -- it is imported via `@Import`)
  - Two `@Bean` methods:
    1. `onboardingWorkflowService(EntityService entityService)` -> returns `OnboardingWorkflowServiceImpl`
    2. `onboardingWorkflowFacade(OnboardingWorkflowService onboardingWorkflowService)` -> returns `OnboardingWorkflowFacadeImpl`

  `BaseAutoConfiguration` change:
  - Add `OnboardingConfiguration.class` to the `@Import({...})` list (after `StatisticsConfiguration.class`)
  - Add the import statement for `com.loanfactory.lfiq.onboarding.OnboardingConfiguration`

  **Acceptance criteria**:
  - `OnboardingConfiguration` follows the same pattern as `UserConfiguration`, `FeedbackConfiguration` -- bean factory methods, no `@Component` scanning
  - `BaseAutoConfiguration` imports `OnboardingConfiguration` in the `@Import` array
  - Application context loads successfully (beans are registered)
  - `./gradlew compileJava` passes

## 4. Quality: Unit Tests

- [ ] 4.1 [backend] [sonnet] Write unit tests for `OnboardingWorkflowServiceImpl`

  **File**: `lfiq-backend/src/test/java/com/loanfactory/lfiq/onboarding/service/OnboardingWorkflowServiceImplTest.java` (new)

  Test class using JUnit 5 + Mockito + AssertJ:
  - Mock `EntityService`
  - Test cases for `getOrCreateByUserId`:
    - Returns existing entity when found
    - Creates new entity with default state when not found
    - Auto-created entity has `NOT_STARTED` status, step 0, empty collections
  - Test cases for `updateState`:
    - Updates status field when provided
    - Updates current_step when provided
    - Updates current_page when provided
    - Replaces completed_steps when provided
    - Replaces skipped_steps when provided
    - Merges page_tours additively when provided
    - Ignores null fields (does not overwrite existing values)
    - Multiple fields updated in one call

  **Acceptance criteria**:
  - Uses `@ExtendWith(MockitoExtension.class)` pattern
  - Uses `@Mock` for `EntityService`, `@InjectMocks` or manual construction for `OnboardingWorkflowServiceImpl`
  - At least 8 test methods covering the scenarios above
  - Uses AssertJ assertions (`assertThat(...)`)
  - All tests pass: `./gradlew test --tests '*OnboardingWorkflowServiceImplTest'`

- [ ] 4.2 [backend] [sonnet] Write unit tests for `OnboardingWorkflowFacadeImpl`

  **File**: `lfiq-backend/src/test/java/com/loanfactory/lfiq/onboarding/facade/OnboardingWorkflowFacadeImplTest.java` (new)

  Test class:
  - Mock `OnboardingWorkflowService`
  - Mock static `SecurityUtils.getCurrentUserId(true)` using Mockito `mockStatic`
  - Test cases:
    - `getOrCreateForCurrentUser` extracts user ID from security context and delegates to service
    - `updateForCurrentUser` extracts user ID and delegates with the request
    - Throws `AuthenticationException` when security context has no user

  **Acceptance criteria**:
  - Uses `mockStatic(SecurityUtils.class)` pattern for static method mocking
  - Verifies that `SecurityUtils.getCurrentUserId(true)` is called
  - Verifies delegation to `OnboardingWorkflowService` with correct arguments
  - All tests pass: `./gradlew test --tests '*OnboardingWorkflowFacadeImplTest'`
