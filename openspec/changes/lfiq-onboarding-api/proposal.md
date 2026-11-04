# Proposal: LFIQ Onboarding Workflow API

## Feature Branch

`feature/lfiq-onboarding-api` (to be created from `develop` in `lfiq-backend` repo)

## Problem Statement

The LF-IQ platform has no server-side tracking for user onboarding progress. When a new user (Loan Officer, Realtor, or Home Owner) logs in for the first time, the frontend cannot determine which onboarding steps they have completed, which page tours they have seen, or whether they have skipped the onboarding flow entirely. Currently, any onboarding state is either lost on page reload or stored only in the browser, making it inconsistent across devices and sessions.

## Proposed Solution

Add a fully independent **Onboarding Workflow** module to `lfiq-backend` with:

- A new `onboarding_workflows` table storing per-user onboarding state as a JSONB payload
- A dedicated `OnboardingWorkflowController` at `/api/v1/onboarding-workflow/me`
- Self-service only: users read and update their own onboarding state (no admin endpoints)
- Zero coupling to the User entity -- the onboarding record references the user only by ID (extracted from JWT auth context)

The module can be completely removed or disabled in the future without touching the User domain.

## Scope

### In Scope

- **New entity**: `OnboardingWorkflowEntity` extending `AbstractAuditableEntity` with a JSONB `state` column
- **New table**: `onboarding_workflows` with UUID PK, `user_id` (unique, indexed), JSONB `state`, audit columns
- **New REST endpoints**:
  - `GET /api/v1/onboarding-workflow/me` -- get current user's onboarding state (auto-create if not found)
  - `PATCH /api/v1/onboarding-workflow/me` -- update current user's onboarding state (partial merge)
- **JSONB state structure**: `{ status, current_step, current_page, completed_steps, skipped_steps, page_tours }`
- **Status enum**: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`
- **Full module structure**: Configuration, Controller, Facade, Service, Entity, Request/Response models
- **SQL migration script** for manual execution (project does not use Flyway auto-migration)
- **Unit tests** for service and facade layers

### Out of Scope

- Admin endpoints for viewing/managing other users' onboarding state (deferred)
- Frontend integration (separate spec for `lf-iq` frontend)
- Notification triggers (e.g., reminding users to complete onboarding)
- Analytics/reporting on onboarding completion rates
- Onboarding content/step definitions (frontend concern)

## Success Criteria

1. `GET /api/v1/onboarding-workflow/me` returns the authenticated user's onboarding state, auto-creating a default record if none exists
2. `PATCH /api/v1/onboarding-workflow/me` merges the request body into the existing JSONB state and returns the updated record
3. The `onboarding_workflows` table has a unique constraint on `user_id` (one record per user)
4. The module has zero imports from the User module -- only references user by ID string from `SecurityUtils.getCurrentUserId(true)`
5. The module follows lfiq-backend conventions: Configuration class with `@Bean` methods, Controller -> Facade -> Service layering, `EntityService` for data access
6. Response format uses tera-core `Response<T>` envelope (auto-wrapped by `BaseResponseHandler`)
7. `./gradlew compileJava` passes with no errors
8. Unit tests cover service layer logic (auto-create on GET, merge on PATCH, status transitions)
