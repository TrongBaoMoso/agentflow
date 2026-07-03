# LFIQ Permission-based UI Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate LF-IQ pages and buttons by the logged-in user's effective permissions, derived entirely from existing `PERM:<METHOD>:<ANT_PATH>` API permissions — no new permission types, no FE constants.

**Architecture:** BE adds one declarative `permissions` expand field on `/v1/users/me` (tera-core `@FunctionalField`, effective set = role permissions ∪ direct permissions). FE caches that list in the existing `userProfileState` Jotai atom and evaluates all checks synchronously in memory: an Ant-style matcher mirrors the BE `AntPathMatcher`, a `PAGE_GATES` registry maps admin routes to their primary API, and two guards (`PagePermissionGuard` for routes, `PermissionGuard` for buttons) plus sidebar filtering consume one `usePermissions()` hook. Everything unmapped fails open; the BE `PermissionAuthorizationFilter` stays the real enforcement.

**Tech Stack:** lfiq-backend (Java 21, Spring Boot 3, tera-core expand system, JUnit 5 + Mockito) · lf-iq (Next.js 14 App Router, TypeScript strict, Jotai, Mantine 7, next-intl, Jest 29).

**Spec:** `docs/superpowers/specs/2026-07-03-lfiq-permission-ui-gating-design.md` (repo `agentflow`, commit `5a6a398`)

## Global Constraints

- **Fail-open invariant:** `permissions === null` (not loaded / old BE) or route absent from `PAGE_GATES` ⇒ allow. Never invert this.
- **FE never references permission `code` strings** — only HTTP method + URI. No permission constants/enums anywhere.
- lfiq-backend: branch from `develop`, PR → `develop`, `gh pr create --assignee taipham0901`. New entity fields must be wrapper types (not applicable here — no entity change).
- lf-iq: branch from `origin/production`; worktree MUST live at `/Users/apple/Projects/agentflow/.worktrees/` (never inside the repo — nested worktrees break eslint). Fresh worktree needs `npm install`, `.env*` copy, and `next-env.d.ts` copy.
- lf-iq pre-push hook auto-rebases onto `origin/master` + runs build + full Jest; after it rebases, push with `git push --force-with-lease`.
- lf-iq PR flow: `feature → master` (enable auto-merge). After merge: `master → production` PR (auto-merge). No release branch.
- i18n: every new key goes into ALL 7 locale files (`en, ko, vi, zh, he, es, ar`), snake_case key names.
- Mantine only — no raw `<button>`; Tailwind classes over inline `style={{}}`.
- Task tracking via beads (`bd create` before code); no TodoWrite/markdown TODOs.
- Commit format `<type>: <description>` (no attribution footer — disabled globally in `~/.claude/settings.json`).
- Jest style in lf-iq: test **pure functions** in colocated `*.test.ts` files (no `@testing-library/react` in this repo — do not add it).

---

## Part A — lfiq-backend

### Task 1: `permissions` expand field on `/v1/users/me`

**Files:**
- Create: `src/main/java/com/loanfactory/lfiq/auth/model/response/EffectivePermissionItem.java`
- Modify: `src/main/java/com/loanfactory/lfiq/user/functional/UserFunctionalAttribute.java` (add `EntityManager` field + `permissions()` method)
- Modify: `src/main/java/com/loanfactory/lfiq/user/UserConfiguration.java` (bean method ~line 95-101: pass `EntityManager`)
- Test: `src/test/java/com/loanfactory/lfiq/test/user/functional/UserFunctionalAttributeTest.java` (update constructor call + add tests)

**Interfaces:**
- Consumes: `User.roles` (ManyToMany → `Role.permissions`), `User.directPermissions` (OneToMany `UserPermission` → `.permission`), tera-core `FunctionalAttribute<User>` / `FunctionResponse<T,R>` / `FunctionContext<T>` / `@FunctionalField`.
- Produces: JSON field `permissions: [{ "id", "code", "name" }]` on any `User` response requested with `?expand=permissions`. FE (Part B) relies on exactly these three keys.

- [ ] **Step 1: Create branch + bead**

```bash
cd /Users/apple/Projects/agentflow/lfiq-backend
git fetch origin && git checkout -b feat/users-me-permissions-expand origin/develop
cd /Users/apple/Projects/agentflow && bd create --title="BE: /users/me expand=permissions effective set" --description="Add tera-core functional field 'permissions' on User returning effective set (role perms ∪ direct perms) as {id,code,name}. Spec: docs/superpowers/specs/2026-07-03-lfiq-permission-ui-gating-design.md" --type=feature --priority=2
```

- [ ] **Step 2: Create the response DTO**

`src/main/java/com/loanfactory/lfiq/auth/model/response/EffectivePermissionItem.java` (mirrors sibling `UserDirectPermissionItem`):

```java
package com.loanfactory.lfiq.auth.model.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.loanfactory.core.base.model.response.AbstractResponse;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@SuperBuilder
@Getter
@Setter
@NoArgsConstructor
public class EffectivePermissionItem extends AbstractResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("code")
    private String code;

    @JsonProperty("name")
    private String name;
}
```

> If `AbstractResponse` lives in a different package in this repo, copy the exact `extends` + import from `UserDirectPermissionItem.java` in the same directory.

- [ ] **Step 3: Write the failing test**

Add to `UserFunctionalAttributeTest.java`. First update `setUp()` — the constructor gains an `EntityManager`:

```java
// new mock field next to the existing ones
@Mock
private EntityManager entityManager;

// setUp() becomes:
attribute = new UserFunctionalAttribute(properties, trackingService, entityService, engagementFacade, entityManager);
```

Then add the test methods (imports: `jakarta.persistence.EntityManager`, `jakarta.persistence.Tuple`, `jakarta.persistence.TypedQuery`, `com.loanfactory.lfiq.auth.model.response.EffectivePermissionItem`, plus existing test imports):

```java
@SuppressWarnings("unchecked")
private TypedQuery<Tuple> stubTupleQuery(final String queryFragment, final List<Tuple> results) {
    final TypedQuery<Tuple> query = mock(TypedQuery.class);
    when(entityManager.createQuery(contains(queryFragment), eq(Tuple.class))).thenReturn(query);
    when(query.setParameter(eq("userIds"), any())).thenReturn(query);
    when(query.getResultList()).thenReturn(results);
    return query;
}

private Tuple permissionTuple(final String userId, final String permId, final String code, final String name) {
    final Tuple tuple = mock(Tuple.class);
    when(tuple.get(0, String.class)).thenReturn(userId);
    when(tuple.get(1, String.class)).thenReturn(permId);
    when(tuple.get(2, String.class)).thenReturn(code);
    when(tuple.get(3, String.class)).thenReturn(name);
    return tuple;
}

@Test
void permissions_mergesRoleAndDirect_dedupesById_sortsByCode() {
    final User user = homeOwner("u-1", UserStatus.ACTIVE, Instant.now());
    stubTupleQuery("u.roles", List.of(
            permissionTuple("u-1", "p-1", "PERM:GET:/v1/users/**", "List users"),
            permissionTuple("u-1", "p-2", "PERM:DELETE:/v1/users/**", "Delete user")
    ));
    stubTupleQuery("u.directPermissions", List.of(
            permissionTuple("u-1", "p-1", "PERM:GET:/v1/users/**", "List users"), // duplicate of role perm
            permissionTuple("u-1", "p-3", "PERM:*:/v1/reports/**", "All reports")
    ));

    final FunctionResponse<User, List<EffectivePermissionItem>> fn = attribute.permissions();
    fn.load(FunctionContext.of(List.of(user)));
    final List<EffectivePermissionItem> result = fn.get(user);

    assertEquals(3, result.size()); // p-1 deduped
    assertEquals("PERM:*:/v1/reports/**", result.get(0).getCode()); // sorted by code
    assertEquals("PERM:DELETE:/v1/users/**", result.get(1).getCode());
    assertEquals("PERM:GET:/v1/users/**", result.get(2).getCode());
}

@Test
void permissions_userWithoutPermissions_returnsEmptyList() {
    final User user = homeOwner("u-9", UserStatus.ACTIVE, Instant.now());
    stubTupleQuery("u.roles", List.of());
    stubTupleQuery("u.directPermissions", List.of());

    final FunctionResponse<User, List<EffectivePermissionItem>> fn = attribute.permissions();
    fn.load(FunctionContext.of(List.of(user)));

    assertEquals(List.of(), fn.get(user));
}
```

> `homeOwner(...)` is the existing test fixture helper in this test class — reuse it verbatim. If a `Mockito.contains`/`eq` import is missing, add `import static org.mockito.ArgumentMatchers.*;`.

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd /Users/apple/Projects/agentflow/lfiq-backend && ./gradlew test --tests "com.loanfactory.lfiq.test.user.functional.UserFunctionalAttributeTest"
```

Expected: COMPILATION FAILURE (`UserFunctionalAttribute` has no 5-arg constructor, no `permissions()` method).

- [ ] **Step 5: Implement the functional field**

In `UserFunctionalAttribute.java` — add field + method (imports: `jakarta.persistence.EntityManager`, `jakarta.persistence.Tuple`, `com.loanfactory.lfiq.auth.model.response.EffectivePermissionItem`, `java.util.*`, `java.util.stream.Collectors`):

```java
// new final field next to the existing ones (Lombok ctor picks it up)
private final EntityManager entityManager;
```

```java
private static final String ROLE_PERMISSIONS_QUERY =
        "SELECT u.id, p.id, p.code, p.name FROM User u JOIN u.roles r JOIN r.permissions p WHERE u.id IN :userIds";
private static final String DIRECT_PERMISSIONS_QUERY =
        "SELECT u.id, p.id, p.code, p.name FROM User u JOIN u.directPermissions up JOIN up.permission p WHERE u.id IN :userIds";

@FunctionalField(requestName = "permissions", responseName = "permissions")
public FunctionResponse<User, List<EffectivePermissionItem>> permissions() {
    return new FunctionResponse<>() {

        private Map<String, List<EffectivePermissionItem>> permissionsByUserId = Collections.emptyMap();

        @Override
        public void load(final FunctionContext<User> context) {
            final List<String> userIds = context.getItems().stream()
                    .map(User::getId)
                    .filter(Objects::nonNull)
                    .toList();
            if (userIds.isEmpty()) {
                return;
            }

            // userId -> (permissionId -> item), LinkedHashMap keeps insertion until final sort
            final Map<String, Map<String, EffectivePermissionItem>> merged = new HashMap<>();
            collect(merged, ROLE_PERMISSIONS_QUERY, userIds);
            collect(merged, DIRECT_PERMISSIONS_QUERY, userIds);

            permissionsByUserId = merged.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> e.getValue().values().stream()
                                    .sorted(Comparator.comparing(EffectivePermissionItem::getCode))
                                    .toList()
                    ));
        }

        private void collect(final Map<String, Map<String, EffectivePermissionItem>> merged,
                             final String query,
                             final List<String> userIds) {
            final List<Tuple> rows = entityManager.createQuery(query, Tuple.class)
                    .setParameter("userIds", userIds)
                    .getResultList();
            for (final Tuple row : rows) {
                final String userId = row.get(0, String.class);
                final EffectivePermissionItem item = EffectivePermissionItem.builder()
                        .id(row.get(1, String.class))
                        .code(row.get(2, String.class))
                        .name(row.get(3, String.class))
                        .build();
                merged.computeIfAbsent(userId, k -> new LinkedHashMap<>()).putIfAbsent(item.getId(), item);
            }
        }

        @Override
        public List<EffectivePermissionItem> get(final User user) {
            if (user == null || user.getId() == null) {
                return List.of();
            }
            return permissionsByUserId.getOrDefault(user.getId(), List.of());
        }
    };
}
```

Update the bean in `UserConfiguration.java` (existing method at ~line 95-101):

```java
@Bean
public UserFunctionalAttribute userFunctionalAttribute(final BaseProperties properties,
                                                       final TrackingService trackingService,
                                                       final EntityService entityService,
                                                       final EngagementFacade engagementFacade,
                                                       final EntityManager entityManager) {
    return new UserFunctionalAttribute(properties, trackingService, entityService, engagementFacade, entityManager);
}
```

(add `import jakarta.persistence.EntityManager;` to `UserConfiguration.java`)

- [ ] **Step 6: Run the functional-attribute tests to verify they pass**

```bash
./gradlew test --tests "com.loanfactory.lfiq.test.user.functional.UserFunctionalAttributeTest"
```

Expected: BUILD SUCCESSFUL, all tests (existing + 2 new) PASS. If existing tests fail on the constructor, you missed the `setUp()` update in Step 3.

- [ ] **Step 7: Run the full backend test suite + compile**

```bash
./gradlew compileJava test
```

Expected: BUILD SUCCESSFUL.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/com/loanfactory/lfiq/auth/model/response/EffectivePermissionItem.java \
        src/main/java/com/loanfactory/lfiq/user/functional/UserFunctionalAttribute.java \
        src/main/java/com/loanfactory/lfiq/user/UserConfiguration.java \
        src/test/java/com/loanfactory/lfiq/test/user/functional/UserFunctionalAttributeTest.java
git commit -m "feat: add permissions expand on /users/me returning effective permission set"
```

### Task 2: Backend PR

**Files:** none (git/GitHub operations only)

**Interfaces:**
- Consumes: Task 1 commit on `feat/users-me-permissions-expand`.
- Produces: PR into `develop`. FE can ship before/after this merges — FE is dormant until this deploys.

- [ ] **Step 1: Push and open PR**

```bash
cd /Users/apple/Projects/agentflow/lfiq-backend
git push -u origin feat/users-me-permissions-expand
gh pr create --base develop --assignee taipham0901 \
  --title "feat: /users/me expand=permissions — effective permission set" \
  --body "$(cat <<'EOF'
## Summary
- New tera-core functional field `permissions` on `User` (requestName/responseName `permissions`)
- `GET /v1/users/me?expand=permissions` now returns the user's **effective** set: union of all role permissions + direct user permissions, deduped by permission id, sorted by code
- Item shape: `{ "id", "code", "name" }` (same as `UserDirectPermissionItem`)
- No schema change, no filter change, no new endpoint — declarative expand only

## Why
Frontend permission-based UI gating (pages/buttons follow `PERM:<METHOD>:<PATH>` codes). Spec: agentflow `docs/superpowers/specs/2026-07-03-lfiq-permission-ui-gating-design.md`.

## Test plan
- [x] `UserFunctionalAttributeTest.permissions_mergesRoleAndDirect_dedupesById_sortsByCode`
- [x] `UserFunctionalAttributeTest.permissions_userWithoutPermissions_returnsEmptyList`
- [x] `./gradlew test` green
- [ ] Manual on staging: `GET /v1/users/me?expand=permissions` as admin returns list incl. `PERM:*:*`
EOF
)"
```

Expected: PR URL printed. Do NOT merge yourself — Tai Pham reviews lfiq-backend PRs.

---

## Part B — lf-iq frontend

### Task 3: Worktree + branch setup

**Files:** none in-repo (environment setup)

**Interfaces:**
- Produces: working tree at `/Users/apple/Projects/agentflow/.worktrees/lfiq-permission-gating`, branch `feat/permission-ui-gating` based on `origin/production`. All Tasks 4-11 run inside this worktree.

- [ ] **Step 1: Create worktree off production**

```bash
cd /Users/apple/Projects/agentflow/lf-iq
git fetch origin
git worktree add /Users/apple/Projects/agentflow/.worktrees/lfiq-permission-gating -b feat/permission-ui-gating origin/production
```

- [ ] **Step 2: Install deps + copy env files (fresh-worktree gotchas)**

```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfiq-permission-gating
cp /Users/apple/Projects/agentflow/lf-iq/.env* . 2>/dev/null || true
cp /Users/apple/Projects/agentflow/lf-iq/next-env.d.ts . 2>/dev/null || true
npm install
```

Expected: `npm install` exits 0. (`next-env.d.ts` missing ⇒ bogus tsc image-import errors — known gotcha.)

- [ ] **Step 3: Baseline check**

```bash
npx tsc --noEmit && npx jest --silent 2>&1 | tail -3
```

Expected: tsc exit 0; existing Jest suites PASS. If baseline is broken, STOP and report — do not build on a red base.

### Task 4: Ant matcher + code parser (`matcher.ts`)

**Files:**
- Create: `src/shared/permissions/matcher.ts`
- Test: `src/shared/permissions/matcher.test.ts`

**Interfaces:**
- Produces: `antMatch(pattern: string, path: string): boolean`, `parseApiCode(code: string): { method: string; path: string } | null`. Tasks 6-7 import these.

- [ ] **Step 1: Write the failing tests**

`src/shared/permissions/matcher.test.ts`:

```typescript
import { antMatch, parseApiCode } from './matcher'

describe('antMatch', () => {
  it('matches trailing /** including the bare base path (Spring AntPathMatcher parity)', () => {
    expect(antMatch('/v1/users/**', '/v1/users')).toBe(true)
    expect(antMatch('/v1/users/**', '/v1/users/123')).toBe(true)
    expect(antMatch('/v1/users/**', '/v1/users/123/reports')).toBe(true)
    expect(antMatch('/v1/users/**', '/v1/usersX')).toBe(false)
    expect(antMatch('/v1/users/**', '/v1/reports')).toBe(false)
  })

  it('single * matches exactly one segment', () => {
    expect(antMatch('/v1/users/*', '/v1/users/123')).toBe(true)
    expect(antMatch('/v1/users/*', '/v1/users/123/reports')).toBe(false)
  })

  it('bare * matches everything', () => {
    expect(antMatch('*', '/anything/at/all')).toBe(true)
  })

  it('exact patterns tolerate a trailing slash on the path', () => {
    expect(antMatch('/admin/users', '/admin/users/')).toBe(true)
    expect(antMatch('/admin/users', '/admin/users')).toBe(true)
    expect(antMatch('/admin/users', '/admin/users/1')).toBe(false)
  })

  it('inner ** spans multiple segments', () => {
    expect(antMatch('/v1/**/summary', '/v1/engagement/users/summary')).toBe(true)
  })
})

describe('parseApiCode', () => {
  it('parses PERM:<METHOD>:<PATH>', () => {
    expect(parseApiCode('PERM:POST:/v1/auth/password/set')).toEqual({ method: 'POST', path: '/v1/auth/password/set' })
    expect(parseApiCode('PERM:*:*')).toEqual({ method: '*', path: '*' })
  })

  it('returns null for non-PERM codes', () => {
    expect(parseApiCode('SOMETHING_ELSE')).toBeNull()
    expect(parseApiCode('PERM:GET')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/shared/permissions/matcher.test.ts
```

Expected: FAIL — `Cannot find module './matcher'`.

- [ ] **Step 3: Implement `matcher.ts`**

```typescript
// Mirrors lfiq-backend PermissionServiceImpl: Spring AntPathMatcher semantics for the
// subset used by PERM codes — ** spans segments (a trailing /** also matches the bare
// base path), * matches one segment, bare '*' matches everything.
const ANY_SEGMENTS = '§ANY§'
const ONE_SEGMENT = '§ONE§'
const OPTIONAL_TAIL = '§TAIL§'

const antToRegex = (pattern: string): RegExp => {
  const source = pattern
    .replace(/\/\*\*$/, OPTIONAL_TAIL)
    .replace(/\*\*/g, ANY_SEGMENTS)
    .replace(/\*/g, ONE_SEGMENT)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(new RegExp(OPTIONAL_TAIL, 'g'), '(/.*)?')
    .replace(new RegExp(ANY_SEGMENTS, 'g'), '.*')
    .replace(new RegExp(ONE_SEGMENT, 'g'), '[^/]*')
  return new RegExp(`^${source}/?$`)
}

export const antMatch = (pattern: string, path: string): boolean => {
  if (!pattern) return false
  if (pattern === '*') return true
  return antToRegex(pattern).test(path)
}

export const parseApiCode = (code: string): { method: string; path: string } | null => {
  const match = code.match(/^PERM:([^:]+):(.+)$/)
  if (!match) return null
  return { method: match[1], path: match[2] }
}
```

> Note: `§` never appears in URL paths, so the placeholder swap is safe. `$&` in the escape replacement inserts the matched character — the placeholders themselves contain `$`? No: `§ANY§` etc. contain only `§` and letters, unaffected by the escape pass.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/shared/permissions/matcher.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/permissions/matcher.ts src/shared/permissions/matcher.test.ts
git commit -m "feat: add ant-style permission matcher mirroring backend AntPathMatcher"
```

### Task 5: Types + fetch `expand=permissions`

**Files:**
- Modify: `src/shared/types/permission-types.ts` (add `EffectivePermission`)
- Modify: `src/shared/types/user.ts` (add `permissions?` to `User`)
- Modify: `src/apis/private-api.ts:237` (`getUserProfile` expand)

**Interfaces:**
- Consumes: BE Task 1 response shape `{ id, code, name }`.
- Produces: `EffectivePermission` type; `User.permissions?: EffectivePermission[]`. The atom hydration path (`AuthProvider` → `useHydrateAtoms([userProfileState, ...])`) needs **no change** — permissions ride inside the `User` payload.

- [ ] **Step 1: Add the type**

In `src/shared/types/permission-types.ts`, append:

```typescript
// Item shape of `expand=permissions` on /users/me — the user's effective set
// (role permissions ∪ direct permissions). Only these three fields are returned.
export type EffectivePermission = Pick<Permission, 'id' | 'code' | 'name'>
```

In `src/shared/types/user.ts`, inside `interface User` after the `roles?: Role[]` field:

```typescript
  // Populated when the request is made with `expand=permissions`.
  // null/undefined (old BE or not requested) => permission gating fails open.
  permissions?: EffectivePermission[]
```

with import at top: `import type { EffectivePermission } from './permission-types'`

- [ ] **Step 2: Request the expand**

In `src/apis/private-api.ts` line ~237, change:

```typescript
export const getUserProfile = async (type?: string) => {
  const typeParam = type ? `${type}` : ''
  return apiPrivate.GET(`${PREFIX_LFIQ}/users/me?expand=profile${typeParam},userSettings,permissions`, {})
}
```

(only addition: `,permissions` — all four role variants in `AuthProvider` go through this one function)

- [ ] **Step 3: Typecheck + run existing tests**

```bash
npx tsc --noEmit && npx jest --silent 2>&1 | tail -3
```

Expected: exit 0, suites PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/permission-types.ts src/shared/types/user.ts src/apis/private-api.ts
git commit -m "feat: fetch effective permissions with user profile (expand=permissions)"
```

### Task 6: Page gates registry + pure gating logic + `usePermissions` hook

**Files:**
- Create: `src/shared/permissions/page-gates.ts`
- Create: `src/shared/permissions/logic.ts`
- Create: `src/hooks/usePermissions.ts`
- Test: `src/shared/permissions/logic.test.ts`

**Interfaces:**
- Consumes: `antMatch`, `parseApiCode` (Task 4); `EffectivePermission` (Task 5); `userProfileState` atom.
- Produces: `PAGE_GATES`, `type ApiGate = { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; uri: string }`, `canCallApiWith(perms, method, uri)`, `canAccessRouteWith(perms, gates, path)`, hook `usePermissions(): { isReady, canCallApi(method, uri), canAccessRoute(path) }`. Tasks 7-10 consume the hook.

- [ ] **Step 1: Write the failing tests**

`src/shared/permissions/logic.test.ts`:

```typescript
import type { EffectivePermission } from '@shared/types/permission-types'

import { canAccessRouteWith, canCallApiWith } from './logic'
import type { PageGate } from './page-gates'

const perm = (code: string): EffectivePermission => ({ id: code, code, name: code })

const GATES: PageGate[] = [
  { route: '/admin/users/**', api: { method: 'GET', uri: '/v1/users' } },
  { route: '/admin/reports/**', api: { method: 'GET', uri: '/v1/reports' } }
]

describe('canCallApiWith', () => {
  it('fails open when permissions are not loaded (null)', () => {
    expect(canCallApiWith(null, 'DELETE', '/v1/users/123')).toBe(true)
  })

  it('grants when a PERM code matches method + uri', () => {
    const perms = [perm('PERM:DELETE:/v1/users/**')]
    expect(canCallApiWith(perms, 'DELETE', '/v1/users/123')).toBe(true)
    expect(canCallApiWith(perms, 'delete', '/v1/users/123')).toBe(true) // case-insensitive method
  })

  it('denies when no code matches', () => {
    const perms = [perm('PERM:GET:/v1/users/**')]
    expect(canCallApiWith(perms, 'DELETE', '/v1/users/123')).toBe(false)
    expect(canCallApiWith([], 'GET', '/v1/users')).toBe(false)
  })

  it('supports wildcard method and global grant PERM:*:*', () => {
    expect(canCallApiWith([perm('PERM:*:/v1/users/**')], 'PATCH', '/v1/users/1')).toBe(true)
    expect(canCallApiWith([perm('PERM:*:*')], 'DELETE', '/v1/anything')).toBe(true)
  })

  it('ignores query strings on the checked uri', () => {
    expect(canCallApiWith([perm('PERM:GET:/v1/users/**')], 'GET', '/v1/users?page=2')).toBe(true)
  })

  it('ignores non-PERM codes', () => {
    expect(canCallApiWith([perm('ROLE_ADMIN')], 'GET', '/v1/users')).toBe(false)
  })
})

describe('canAccessRouteWith', () => {
  it('fails open for routes not in the registry', () => {
    expect(canAccessRouteWith([], GATES, '/admin/unmapped-page')).toBe(true)
    expect(canAccessRouteWith(null, GATES, '/dashboard')).toBe(true)
  })

  it('allows a gated route when the primary API is callable', () => {
    expect(canAccessRouteWith([perm('PERM:GET:/v1/users/**')], GATES, '/admin/users')).toBe(true)
    expect(canAccessRouteWith([perm('PERM:*:*')], GATES, '/admin/users/123')).toBe(true)
  })

  it('denies a gated route when the primary API is not callable', () => {
    expect(canAccessRouteWith([perm('PERM:GET:/v1/reports/**')], GATES, '/admin/users')).toBe(false)
    expect(canAccessRouteWith([], GATES, '/admin/reports')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/shared/permissions/logic.test.ts
```

Expected: FAIL — `Cannot find module './logic'`.

- [ ] **Step 3: Implement `page-gates.ts`**

```typescript
export type ApiGate = { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; uri: string }

export type PageGate = { route: string; api: ApiGate }

// Phase 1: (admin) pages, gated by the page's primary data API (the endpoint its
// main list/dashboard fetch hits — see src/apis/private-api.ts). A route absent
// from this list FAILS OPEN (works exactly as before this feature).
// Phase 2+: add (private) LO/Realtor/HO routes here incrementally.
export const PAGE_GATES: PageGate[] = [
  { route: '/admin/dashboard/**', api: { method: 'GET', uri: '/v1/statistics' } },
  { route: '/admin/users/**', api: { method: 'GET', uri: '/v1/users' } },
  { route: '/admin/reports/**', api: { method: 'GET', uri: '/v1/reports' } },
  { route: '/admin/roles/**', api: { method: 'GET', uri: '/v1/roles' } },
  { route: '/admin/permissions/**', api: { method: 'GET', uri: '/v1/permissions' } },
  { route: '/admin/plans/**', api: { method: 'GET', uri: '/v1/plans' } },
  { route: '/admin/feedbacks/**', api: { method: 'GET', uri: '/v1/feedbacks' } },
  { route: '/admin/release-notes/**', api: { method: 'GET', uri: '/v1/release-notes' } },
  { route: '/admin/cron-jobs/**', api: { method: 'GET', uri: '/v1/cron-jobs' } },
  { route: '/admin/engagement/**', api: { method: 'GET', uri: '/v1/engagement/users' } }
  // Intentionally fail-open in Phase 1 (primary API to be confirmed before gating):
  // /admin/conversation-history, /admin/email-templates, /admin/export-database,
  // /admin/file-management, /admin/failed-syncs
]
```

- [ ] **Step 4: Implement `logic.ts`**

```typescript
import type { EffectivePermission } from '@shared/types/permission-types'

import { antMatch, parseApiCode } from './matcher'
import type { PageGate } from './page-gates'

// permissions === null means "not loaded yet or backend without expand support":
// every check fails open so the feature is dormant until real data exists.
export const canCallApiWith = (
  permissions: EffectivePermission[] | null,
  method: string,
  uri: string
): boolean => {
  if (permissions === null) return true
  const cleanUri = uri.split('?')[0]
  return permissions.some(({ code }) => {
    const parsed = parseApiCode(code)
    if (!parsed) return false
    const methodMatches = parsed.method === '*' || parsed.method.toUpperCase() === method.toUpperCase()
    return methodMatches && antMatch(parsed.path, cleanUri)
  })
}

export const canAccessRouteWith = (
  permissions: EffectivePermission[] | null,
  gates: PageGate[],
  path: string
): boolean => {
  const gate = gates.find((g) => antMatch(g.route, path))
  if (!gate) return true
  return canCallApiWith(permissions, gate.api.method, gate.api.uri)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest src/shared/permissions
```

Expected: PASS (matcher + logic suites).

- [ ] **Step 6: Implement the hook (thin Jotai wrapper — pure logic already tested)**

`src/hooks/usePermissions.ts`:

```typescript
'use client'

import { useAtomValue } from 'jotai'

import { userProfileState } from '@jotai/atom/userProfileState'

import { canAccessRouteWith, canCallApiWith } from '@shared/permissions/logic'
import { PAGE_GATES } from '@shared/permissions/page-gates'

export const usePermissions = () => {
  const userProfile = useAtomValue(userProfileState)
  const permissions = userProfile?.permissions ?? null

  return {
    isReady: permissions !== null,
    canCallApi: (method: string, uri: string) => canCallApiWith(permissions, method, uri),
    canAccessRoute: (path: string) => canAccessRouteWith(permissions, PAGE_GATES, path)
  }
}
```

- [ ] **Step 7: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/shared/permissions/page-gates.ts src/shared/permissions/logic.ts src/shared/permissions/logic.test.ts src/hooks/usePermissions.ts
git commit -m "feat: add page gates registry, permission logic and usePermissions hook"
```

### Task 7: `PermissionGuard` component + i18n

**Files:**
- Create: `src/shared/components/PermissionGuard/index.tsx`
- Modify: `src/messages/en.json`, `src/messages/ko.json`, `src/messages/vi.json`, `src/messages/zh.json`, `src/messages/he.json`, `src/messages/es.json`, `src/messages/ar.json` (key `Action.no_permission`)

**Interfaces:**
- Consumes: `usePermissions` (Task 6), `ApiGate` (Task 6), Mantine `Tooltip`, next-intl `useTranslations`.
- Produces: `<PermissionGuard api={ApiGate} mode?: 'hide' | 'disable'>{singleElement}</PermissionGuard>`. Task 10 consumes it.

- [ ] **Step 1: Add the i18n key to all 7 locales**

Inside the existing `"Action"` namespace of each file (alphabetical position within the namespace):

- `en.json`: `"no_permission": "You don't have permission to perform this action"`
- `vi.json`: `"no_permission": "Bạn không có quyền thực hiện hành động này"`
- `ko.json`: `"no_permission": "이 작업을 수행할 권한이 없습니다"`
- `zh.json`: `"no_permission": "您没有权限执行此操作"`
- `es.json`: `"no_permission": "No tienes permiso para realizar esta acción"`
- `he.json`: `"no_permission": "אין לך הרשאה לבצע פעולה זו"`
- `ar.json`: `"no_permission": "ليس لديك إذن لتنفيذ هذا الإجراء"`

- [ ] **Step 2: Implement the component**

`src/shared/components/PermissionGuard/index.tsx`:

```tsx
'use client'

import { Tooltip } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { cloneElement } from 'react'
import type { ReactElement } from 'react'

import { usePermissions } from '@hooks/usePermissions'

import type { ApiGate } from '@shared/permissions/page-gates'

interface PermissionGuardProps {
  /** The API this action invokes — access is granted iff the user may call it */
  api: ApiGate
  /** 'hide' removes the child entirely; 'disable' greys it out with a tooltip */
  mode?: 'hide' | 'disable'
  children: ReactElement
}

export const PermissionGuard = ({ api, mode = 'hide', children }: PermissionGuardProps) => {
  const t = useTranslations('Action')
  const { canCallApi } = usePermissions()

  if (canCallApi(api.method, api.uri)) {
    return children
  }

  if (mode === 'hide') {
    return null
  }

  return (
    <Tooltip label={t('no_permission')} withArrow>
      <span className="inline-block cursor-not-allowed">
        {cloneElement(children, { disabled: true })}
      </span>
    </Tooltip>
  )
}

export default PermissionGuard
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/shared/components/PermissionGuard/index.tsx src/messages/*.json
git commit -m "feat: add PermissionGuard component with hide/disable modes"
```

### Task 8: `PagePermissionGuard` + mount in `(admin)` layout

**Files:**
- Create: `src/shared/components/PagePermissionGuard/index.tsx`
- Modify: `src/app/[locale]/(admin)/layout.tsx`

**Interfaces:**
- Consumes: `usePermissions` (Task 6), `ROUTES.ACCESS_DENIED` from `@constants/routes` (existing `/access-denied` page in `(public)`).
- Produces: route-level gating for every `(admin)` page listed in `PAGE_GATES`.

- [ ] **Step 1: Implement the guard**

`src/shared/components/PagePermissionGuard/index.tsx` (same navigation imports as `useRouteAccess.tsx` / the sidebars — `next/navigation`, pathnames carry no locale prefix here):

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { ROUTES } from '@constants/routes'

import { usePermissions } from '@hooks/usePermissions'

export const PagePermissionGuard = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { isReady, canAccessRoute } = usePermissions()
  const allowed = canAccessRoute(pathname)

  useEffect(() => {
    if (isReady && !allowed) {
      router.replace(ROUTES.ACCESS_DENIED)
    }
  }, [isReady, allowed, router])

  if (isReady && !allowed) {
    return null // prevent a flash of forbidden content before the redirect lands
  }

  return <>{children}</>
}

export default PagePermissionGuard
```

- [ ] **Step 2: Mount in the admin layout**

`src/app/[locale]/(admin)/layout.tsx` becomes:

```tsx
import type { ReactNode } from 'react'

import PagePermissionGuard from '@shared/components/PagePermissionGuard'
import RouteGuard from '@shared/components/RouteGuard'

import AdminLayout from '@layout/AdminLayout'

import AuthProvider from '@providers/AuthProvider'

const AdminLayoutPage = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider>
      <RouteGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
        <PagePermissionGuard>
          <AdminLayout>{children}</AdminLayout>
        </PagePermissionGuard>
      </RouteGuard>
    </AuthProvider>
  )
}

export default AdminLayoutPage
```

(match the existing import-alias style in the file; `AuthProvider` hydrates `userProfileState` above the guard, so permissions are present before the guard evaluates)

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/shared/components/PagePermissionGuard/index.tsx "src/app/[locale]/(admin)/layout.tsx"
git commit -m "feat: gate admin routes with PagePermissionGuard"
```

### Task 9: Sidebar filtering (3 call sites)

**Files:**
- Modify: `src/shared/layout/AdminLayout/components/AdminLeftMenuBar/index.tsx` (~line 74)
- Modify: `src/shared/layout/AdminLayout/components/AdminHeader/MobileHeader/index.tsx` (~line 130)
- Modify: `src/shared/layout/PrivateLayout/components/PrivateLeftMenuBar/index.tsx` (~line 78-85)

**Interfaces:**
- Consumes: `usePermissions().canAccessRoute`, `MenuItem.link` (field is named `link`, not `href`).
- Produces: sidebar/mobile menus hide items whose gated route the user cannot access. Ungated items unaffected (fail-open).

- [ ] **Step 1: AdminLeftMenuBar**

Add to the component body (it is already a client component using hooks):

```typescript
import { usePermissions } from '@hooks/usePermissions'
// inside the component:
const { canAccessRoute } = usePermissions()
```

and extend the existing line ~74:

```typescript
const items = withPinnedFilterLinks(getAdminMenuItems(tMenu), pinnedByTarget).filter((item) => canAccessRoute(item.link))
```

- [ ] **Step 2: MobileHeader**

Same pattern at line ~130:

```typescript
const { canAccessRoute } = usePermissions()
const menuItems = withPinnedFilterLinks(getAdminMenuItems(tMenu), pinnedByTarget).filter((item) => canAccessRoute(item.link))
```

- [ ] **Step 3: PrivateLeftMenuBar**

At line ~78-85, filter only the private branch (public report-page menu untouched):

```typescript
const { canAccessRoute } = usePermissions()
const menuItems = isReportPage()
  ? getPublicMenuItems(tMenu)
  : withPinnedFilterLinks(getMenuItemsForRole(effectiveRole, tMenu), pinnedByTarget).filter((item) =>
      canAccessRoute(item.link)
    )
```

- [ ] **Step 4: Typecheck + run all permission tests + commit**

```bash
npx tsc --noEmit && npx jest src/shared/permissions --silent
git add src/shared/layout/AdminLayout/components/AdminLeftMenuBar/index.tsx \
        src/shared/layout/AdminLayout/components/AdminHeader/MobileHeader/index.tsx \
        src/shared/layout/PrivateLayout/components/PrivateLeftMenuBar/index.tsx
git commit -m "feat: filter sidebar menu items by route permission"
```

### Task 10: Sample button gates on Admin Users (proves the pattern)

**Files:**
- Modify: `src/app/[locale]/(admin)/admin/users/_v2/_components/UserCardActionMenu/index.tsx` (component receives `{ user, onEdit, onAfterAction }`; `user.id` is available)

**Interfaces:**
- Consumes: `PermissionGuard` (Task 7). Delete calls `DELETE /v1/users/{id}` (`deleteUser`, private-api.ts:682); Edit calls `PATCH /v1/users/{id}` (`editUser`, private-api.ts:678).
- Produces: reference usage both modes — Delete hidden without permission, Edit disabled with tooltip.

- [ ] **Step 1: Wrap the two menu items**

Add import:

```tsx
import PermissionGuard from '@shared/components/PermissionGuard'
```

Edit item (currently `{canEdit && (<Menu.Item leftSection={<IconEdit .../>} ...>)}`) becomes:

```tsx
{canEdit && (
  <PermissionGuard api={{ method: 'PATCH', uri: `/v1/users/${user.id}` }} mode="disable">
    <Menu.Item leftSection={<IconEdit size={14} />} onClick={handleEdit}>
      {t('drawer_action_edit')}
    </Menu.Item>
  </PermissionGuard>
)}
```

Delete item (currently `{canDelete && (<><Menu.Divider /><Menu.Item color="red" .../></>)}`) becomes:

```tsx
{canDelete && (
  <>
    <Menu.Divider />
    <PermissionGuard api={{ method: 'DELETE', uri: `/v1/users/${user.id}` }}>
      <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={openDeleteDialog}>
        {t('drawer_action_delete')}
      </Menu.Item>
    </PermissionGuard>
  </>
)}
```

(the divider staying visible when Delete is hidden is acceptable — it separates the danger zone and disappears entirely when `canDelete` is false)

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/[locale]/(admin)/admin/users/_v2/_components/UserCardActionMenu/index.tsx"
git commit -m "feat: gate admin user edit/delete actions by API permission"
```

### Task 11: Full verification + push + PRs

**Files:** none (verification + git/GitHub operations)

**Interfaces:**
- Consumes: all Part B commits on `feat/permission-ui-gating`.
- Produces: green build/tests, PR `feature → master` (auto-merge), then `master → production` PR.

- [ ] **Step 1: Full local gate**

```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfiq-permission-gating
npx tsc --noEmit && npm run build && npx jest --silent 2>&1 | tail -5
```

Expected: all three green. Fix anything red before pushing.

- [ ] **Step 2: Manual smoke (dev server, admin account)**

Run `npm run dev` and verify with an admin login (admin holds `PERM:*:*`, so everything must look **unchanged**):
- `/admin/users` loads; Edit + Delete menu items present and enabled.
- Sidebar shows all admin items.
- If BE expand is not deployed yet: confirm via devtools that `users/me` has no `permissions` field and the app still behaves exactly as before (fail-open proof).

- [ ] **Step 3: Push (pre-push hook rebases + builds + tests)**

```bash
git push -u origin feat/permission-ui-gating || git push --force-with-lease -u origin feat/permission-ui-gating
```

Expected: hook runs build + Jest; if it rebased onto origin/master, the `--force-with-lease` retry is required.

- [ ] **Step 4: Create PRs per lf-iq flow**

```bash
gh pr create --base master \
  --title "feat: permission-based UI gating (pages, sidebar, action buttons)" \
  --body "$(cat <<'EOF'
## Summary
- New `src/shared/permissions/` module: Ant-style matcher mirroring backend `AntPathMatcher`, `PAGE_GATES` route→primary-API registry, pure gating logic + `usePermissions()` hook
- `getUserProfile` now requests `expand=permissions` (effective set rides inside the User payload; old BE ⇒ feature dormant, fully fail-open)
- `PagePermissionGuard` mounted in the (admin) layout — gated admin routes redirect to /access-denied when the user cannot call the page's primary API
- Sidebar (admin desktop + mobile, private) hides menu items whose route is gated and inaccessible
- `PermissionGuard` for buttons (hide | disable+tooltip) — sample gates on Admin Users Edit (disable) / Delete (hide)
- i18n: `Action.no_permission` added to all 7 locales
- Everything unmapped fails open; backend `PermissionAuthorizationFilter` remains the real enforcement (403)

Pairs with lfiq-backend PR "feat: /users/me expand=permissions". Spec: agentflow `docs/superpowers/specs/2026-07-03-lfiq-permission-ui-gating-design.md`.

## Test plan
- [x] `src/shared/permissions/matcher.test.ts` — ant semantics pinned to backend cases
- [x] `src/shared/permissions/logic.test.ts` — grant/deny/fail-open/wildcards/query-string
- [x] `npx tsc --noEmit`, `npm run build`, full Jest green
- [ ] Staging: admin unchanged; restricted role loses gated page + sidebar item + buttons
EOF
)"
gh pr merge --auto --squash
```

After the feature PR merges into master:

```bash
gh pr create --base production --head master --title "chore: release master to production" \
  --body "Includes permission-based UI gating (fail-open; dormant until lfiq-backend expand deploys)."
gh pr merge --auto --squash
```

- [ ] **Step 5: Close out**

```bash
cd /Users/apple/Projects/agentflow
# <bead-id> = the issue created in Task 1 Step 1 (find it via: bd list | grep permissions)
bd close <bead-id> --reason "BE + FE PRs created; FE fail-open pending BE deploy"
git add .beads/issues.jsonl && git commit -m "chore(beads): track LFIQ permission UI gating" -- .beads/issues.jsonl && git push
git -C lf-iq worktree remove /Users/apple/Projects/agentflow/.worktrees/lfiq-permission-gating
```

(remove the worktree only after both PRs are up; keep it if review changes are expected)

---

## Deploy-order note

Safe in any order. FE-first: `permissions` field absent ⇒ atom-derived list is `null` ⇒ everything fails open. BE-first: extra JSON field is ignored by the old FE. Full behavior activates when both are live — and because ADMIN carries `PERM:*:*` and the LO/Realtor/HO roles keep whatever API permissions they already have, **day-one behavior is identical to today** until an admin actually revokes something via the existing Roles/Permissions UI.

## Out of scope (per spec §8)

`PAGE:` permission type, per-user deny/subtract, realtime permission push, gating the five admin pages whose primary API is unconfirmed, and `(private)` route gating (Phase 2+ — add `PAGE_GATES` entries only).
