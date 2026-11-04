# Design: LFIQ Onboarding Workflow API

## Architecture Overview

```
OnboardingWorkflowController (/api/v1/onboarding-workflow)
  |-- GET  /me  --> OnboardingWorkflowFacade.getOrCreateForCurrentUser()
  |-- PATCH /me --> OnboardingWorkflowFacade.updateForCurrentUser(request)
        |
OnboardingWorkflowFacade (orchestration, auth context)
  |-- SecurityUtils.getCurrentUserId(true)  --> get user ID from JWT
  |-- OnboardingWorkflowService (business logic)
        |-- EntityService (tera-core CRUD)
              |-- JPA / Hibernate --> onboarding_workflows table
```

The module is fully self-contained. It has no imports from the `user` package and references users only by their UUID string.

## Module Structure

### New Files

All files under `lfiq-backend/src/main/java/com/loanfactory/lfiq/onboarding/`:

| File | Purpose |
|------|---------|
| `OnboardingConfiguration.java` | Bean registration (Configuration class with `@Bean` methods) |
| `controller/OnboardingWorkflowController.java` | REST controller at `/v1/onboarding-workflow` |
| `entity/OnboardingWorkflowEntity.java` | JPA entity extending `AbstractAuditableEntity` |
| `entity/OnboardingWorkflowState.java` | JSONB-mapped POJO for the `state` column |
| `entity/OnboardingStatus.java` | Enum: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED` |
| `facade/OnboardingWorkflowFacade.java` | Facade interface |
| `facade/impl/OnboardingWorkflowFacadeImpl.java` | Facade implementation |
| `service/OnboardingWorkflowService.java` | Service interface |
| `service/impl/OnboardingWorkflowServiceImpl.java` | Service implementation |
| `model/request/UpdateOnboardingStateRequest.java` | PATCH request body |

### New SQL Migration

| File | Purpose |
|------|---------|
| `lfiq-backend/src/main/resources/migration/create_onboarding_workflows_table.sql` | DDL for the new table |

### Modified Files

| File | Change |
|------|--------|
| `lfiq-backend/src/main/java/com/loanfactory/lfiq/BaseAutoConfiguration.java` | Add `OnboardingConfiguration.class` to `@Import` list |

## Entity Design

### `OnboardingWorkflowEntity`

```java
@Entity
@Table(
    name = "onboarding_workflows",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_onboarding_user_id",
        columnNames = {"user_id"}
    ),
    indexes = {
        @Index(name = "idx_onboarding_user_id", columnList = "user_id")
    }
)
public class OnboardingWorkflowEntity extends AbstractAuditableEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private OnboardingWorkflowState state;
}
```

Key decisions:
- Extends `com.loanfactory.core.base.entity.AbstractAuditableEntity` (same as `User`, `FeedbackEntity`, etc.)
- UUID PK, `created_by`, `created_date`, `last_modified_by`, `last_modified_date` inherited from base
- `user_id` is a `String` (UUID), NOT a FK to the `users` table -- intentional decoupling
- Unique constraint on `user_id` ensures one onboarding record per user
- JSONB `state` column holds all onboarding progress as a flexible structure

### `OnboardingWorkflowState` (JSONB POJO)

```java
public class OnboardingWorkflowState implements Serializable {

    private OnboardingStatus status;       // NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    private Integer currentStep;           // 0-based step index
    private String currentPage;            // page identifier (e.g., "profile_setup")
    private Set<Integer> completedSteps;   // set of completed step indices
    private Set<Integer> skippedSteps;     // set of skipped step indices
    private Map<String, Boolean> pageTours; // page_id -> tour_completed
}
```

Lombok annotations: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@SuperBuilder`, `@FieldNameConstants`.

Default state (for auto-creation):
```json
{
  "status": "NOT_STARTED",
  "current_step": 0,
  "current_page": null,
  "completed_steps": [],
  "skipped_steps": [],
  "page_tours": {}
}
```

### `OnboardingStatus` Enum

```java
public enum OnboardingStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED,
    SKIPPED
}
```

## SQL Migration

File: `lfiq-backend/src/main/resources/migration/create_onboarding_workflows_table.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS onboarding_workflows (
    id              VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         VARCHAR(36)  NOT NULL,
    state           JSONB        NOT NULL DEFAULT '{
        "status": "NOT_STARTED",
        "current_step": 0,
        "current_page": null,
        "completed_steps": [],
        "skipped_steps": [],
        "page_tours": {}
    }'::jsonb,
    created_by      VARCHAR(255),
    created_date    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_onboarding_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_workflows (user_id);

COMMIT;
```

Note: The project does not use Flyway auto-migration. This script is run manually against each environment. Hibernate `ddl-auto` may auto-create the table in dev, but the migration script is the authoritative DDL.

## API Design

### `GET /api/v1/onboarding-workflow/me`

Returns the current user's onboarding state. If no record exists, auto-creates one with default state.

**Request**: No body. Auth required (JWT).

**Response** (200 OK, wrapped by tera-core `Response<T>` envelope):
```json
{
  "payload": {
    "id": "uuid",
    "user_id": "uuid",
    "state": {
      "status": "NOT_STARTED",
      "current_step": 0,
      "current_page": null,
      "completed_steps": [],
      "skipped_steps": [],
      "page_tours": {}
    },
    "created_by": "uuid",
    "created_date": "2026-04-10T10:00:00Z",
    "last_modified_by": "uuid",
    "last_modified_date": "2026-04-10T10:00:00Z"
  },
  "error": null,
  "response_date": "2026-04-10T10:00:00Z",
  "http_code": 200
}
```

**Behavior**:
1. Extract user ID from `SecurityUtils.getCurrentUserId(true)` (throws 401 if not authenticated)
2. Query `onboarding_workflows` by `user_id`
3. If found, return it
4. If not found, create a new record with default state, save, and return it

### `PATCH /api/v1/onboarding-workflow/me`

Updates the current user's onboarding state via partial merge.

**Request body** (`UpdateOnboardingStateRequest`):
```json
{
  "status": "IN_PROGRESS",
  "current_step": 2,
  "current_page": "profile_setup",
  "completed_steps": [0, 1],
  "skipped_steps": [],
  "page_tours": {
    "dashboard": true
  }
}
```

All fields are optional. Only provided fields are merged into the existing state.

**Response** (200 OK):
Same shape as GET -- returns the full updated `OnboardingWorkflowEntity`.

**Behavior**:
1. Extract user ID from `SecurityUtils.getCurrentUserId(true)`
2. Get or create the onboarding record (same logic as GET)
3. Merge non-null request fields into the existing `state` JSONB:
   - If `status` is provided, overwrite `state.status`
   - If `current_step` is provided, overwrite `state.current_step`
   - If `current_page` is provided, overwrite `state.current_page`
   - If `completed_steps` is provided, overwrite `state.completed_steps` (replace, not union)
   - If `skipped_steps` is provided, overwrite `state.skipped_steps` (replace, not union)
   - If `page_tours` is provided, **merge** into existing `state.page_tours` (additive)
4. Save and return the updated entity

**Merge rationale for `page_tours`**: Page tours accumulate over time (user sees dashboard tour, then later sees report tour). Merging prevents the frontend from needing to send the entire map every time. All other fields are simple overwrites because the frontend tracks the full state for those.

### Error Responses

| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Not authenticated | 401 | `AuthenticationException` (tera-core) |
| Invalid request body | 400 | `BadRequestException` (tera-core) |
| Invalid status enum value | 400 | `BadRequestException` |

All errors are auto-handled by tera-core's `BaseExceptionHandler`.

## Service Layer Design

### `OnboardingWorkflowService` (interface)

```java
public interface OnboardingWorkflowService {
    OnboardingWorkflowEntity getOrCreateByUserId(String userId);
    OnboardingWorkflowEntity updateState(String userId, UpdateOnboardingStateRequest request);
}
```

### `OnboardingWorkflowServiceImpl`

Dependencies (injected via constructor):
- `EntityService` (from tera-core) -- all CRUD operations

**`getOrCreateByUserId(userId)`**:
1. Build a JPA `Specification` for `userId` equals
2. Call `entityService.getBy(OnboardingWorkflowEntity.class, spec)`
3. If result is present, return it
4. Otherwise, create new entity with default state, call `entityService.save()`, return saved entity

**`updateState(userId, request)`**:
1. Call `getOrCreateByUserId(userId)` to ensure the record exists
2. Get the current `OnboardingWorkflowState` from the entity
3. Merge non-null fields from the request into the state:
   - `status`: overwrite if non-null
   - `currentStep`: overwrite if non-null
   - `currentPage`: overwrite if non-null
   - `completedSteps`: overwrite if non-null
   - `skippedSteps`: overwrite if non-null
   - `pageTours`: merge map entries if non-null (putAll)
4. Set the updated state on the entity
5. Call `entityService.save()` and return

### `OnboardingWorkflowFacade` (interface)

```java
public interface OnboardingWorkflowFacade {
    OnboardingWorkflowEntity getOrCreateForCurrentUser();
    OnboardingWorkflowEntity updateForCurrentUser(UpdateOnboardingStateRequest request);
}
```

### `OnboardingWorkflowFacadeImpl`

Dependencies:
- `OnboardingWorkflowService`

Both methods extract the user ID from `SecurityUtils.getCurrentUserId(true)` and delegate to the service.

## Request Model

### `UpdateOnboardingStateRequest`

```java
@Getter
@Setter
@NoArgsConstructor
@SuperBuilder
public class UpdateOnboardingStateRequest {
    @JsonProperty("status")
    private OnboardingStatus status;

    @JsonProperty("current_step")
    private Integer currentStep;

    @JsonProperty("current_page")
    private String currentPage;

    @JsonProperty("completed_steps")
    private Set<Integer> completedSteps;

    @JsonProperty("skipped_steps")
    private Set<Integer> skippedSteps;

    @JsonProperty("page_tours")
    private Map<String, Boolean> pageTours;
}
```

All fields nullable -- only non-null fields are merged.

## Configuration

### `OnboardingConfiguration`

```java
public class OnboardingConfiguration {

    @Bean
    public OnboardingWorkflowService onboardingWorkflowService(
            final EntityService entityService) {
        return new OnboardingWorkflowServiceImpl(entityService);
    }

    @Bean
    public OnboardingWorkflowFacade onboardingWorkflowFacade(
            final OnboardingWorkflowService onboardingWorkflowService) {
        return new OnboardingWorkflowFacadeImpl(onboardingWorkflowService);
    }
}
```

### `BaseAutoConfiguration` Change

Add to the `@Import` annotation:
```java
@Import({
    // ... existing imports ...
    OnboardingConfiguration.class
})
```

## Conventions Followed

| Convention | How applied |
|------------|-------------|
| Bean registration via `@Bean` in Configuration class | `OnboardingConfiguration` -- NO `@Component/@Service/@Repository` |
| Controller -> Facade -> Service layering | `OnboardingWorkflowController` -> `OnboardingWorkflowFacade` -> `OnboardingWorkflowService` |
| `EntityService` for data access | No custom JPA repositories; all queries via `entityService.getBy()` / `entityService.save()` |
| Entity extends `AbstractAuditableEntity` | `OnboardingWorkflowEntity extends AbstractAuditableEntity` from tera-core |
| JSONB via `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"` | `state` field on `OnboardingWorkflowEntity` |
| Response envelope auto-wrapped by `BaseResponseHandler` | Controller returns raw entity; tera-core wraps in `Response<T>` |
| JSON snake_case | `@JsonProperty` annotations on all fields |
| Lombok | `@Getter`, `@Setter`, `@SuperBuilder`, `@NoArgsConstructor`, `@FieldNameConstants`, `@RequiredArgsConstructor`, `@Slf4j` |
| Auth via `SecurityUtils.getCurrentUserId(true)` | User ID from JWT context, no User entity dependency |
| Exceptions from tera-core | `BadRequestException`, `AuthenticationException` |
| Manual SQL migration | `src/main/resources/migration/create_onboarding_workflows_table.sql` |
| Controller `@RequestMapping` pattern | `/v1/onboarding-workflow` (matches existing `/v1/users`, `/v1/reports`, etc.) |
