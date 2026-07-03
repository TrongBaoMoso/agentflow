# LFIQ Permission-based UI Gating — Design Spec

- **Date:** 2026-07-03
- **Status:** Approved by user (brainstorming session)
- **Repos:** `lf-iq` (Next.js 14 FE) + `lfiq-backend` (Java 21 / Spring Boot)
- **Author:** Bao Trinh + Claude

## 1. Goal

Gate **pages** and **actions (buttons)** in LF-IQ by the logged-in user's permissions, across the whole app — both `(admin)` and `(private)` route groups. Today the FE only checks **roles** (`requiredRoles={['ADMIN']}`, `menuItems.role`); fine-grained permissions exist in the backend but are invisible to the UI.

## 2. Decisions (locked during brainstorming)

| # | Question | Decision |
|---|----------|----------|
| 1 | Product scope | lf-iq + lfiq-backend |
| 2 | Coverage | Whole app (`(admin)` + `(private)`), rolled out incrementally |
| 3 | Assignment model | Role (group) + additive per-user direct permissions — **already exists in BE**, no schema change |
| 4 | Per-user deny/subtract | Not supported (additive only) — keep current schema |
| 5 | Permission language for UI | **Derive everything from API permissions** (`PERM:<METHOD>:<ANT_PATH>`). No new permission type, no UI codes, no `PAGE:` prefix (deferred; see §8) |
| 6 | Deny UX | Guard supports `hide` (default) and `disable` (+ tooltip) modes |
| 7 | How FE learns permissions | Extend `GET /v1/users/me` with `expand=permissions` returning the **effective set** |
| 8 | Default policy | **Fail-open**: unmapped pages/buttons behave exactly as today; BE filter remains the real enforcement |
| 9 | FE constants | None. FE never references permission `code` strings; it matches on method + URI only |

## 3. Current system (verified 2026-07-03)

### Backend (lfiq-backend)

- `Permission` entity: `code`, `name` (+ group). The **code is the whole permission**: `PERM:<METHOD>:<ANT_PATH>`, e.g. `PERM:POST:/v1/auth/password/set`, wildcards supported (`PERM:GET:/users/**`, `PERM:*:*`).
- `Role` ⟷ `Permission` many-to-many (`role_2_permissions`); `User` ⟷ `Role` (`user_2_role`); `UserPermission` = additive direct grants per user.
- `PermissionAuthorizationFilter` checks **every request** via `PermissionService.hasPermission(auth, method, uri)`.
- `PermissionServiceImpl.hasPermission()` iterates the user's authorities, skips any code not starting with `PERM:` (line 56), splits `PERM:<method>:<path>` and matches with Spring `AntPathMatcher`. ADMIN holds a global `PERM:*:*` grant.
- Full CRUD APIs + admin UI already exist for roles, permissions, groups, user-role assignment, and direct user permissions.

### Frontend (lf-iq)

- Auth state in Jotai: `userProfileState`, `rolesState`; route protection via `RouteGuard` + `useRouteAccess` (roles only); sidebar filtered by `menuItems.role` via `hasMenuAccess`.
- No permission fetching, no `usePermission` hook, no button-level gating.

## 4. Design

### 4.1 Core idea

> **Page access = permission to call the page's primary API.** A page is a view over API data; if the user cannot call `GET /v1/users`, the `/admin/users` page is useless — block it. If they can, there is no reason to block the page. Buttons gate on the exact API they invoke. FE mirrors the BE matcher on the cached effective permission set; the BE filter stays the source of truth (403).

Consequences:

- BE renames/adds permission codes → FE unaffected (FE matches method + URI, never code).
- Admin tightens/loosens access at runtime via the existing Permissions admin UI → effective immediately, no deploy.
- Page and data can never disagree (no "page visible but every call 403s" from misconfig).

### 4.2 Backend change (one item)

**`GET /v1/users/me?expand=permissions`** — following the existing `expand=roles` pattern, return the **effective permission set**:

```
effective = ⋃(permissions of each user role) ∪ direct user permissions   (dedupe by id)
```

Response DTO per item: `{ id, code, name }` (existing permission response shape). No schema change, no new endpoints, no filter change, no seed change.

Implementation notes:

- Resolve via the existing tera-core expand system (`?expand=` query param).
- Deduplicate with a `Set`; a user with many roles must not receive duplicates.
- Must honor the login-as (impersonation) token: the call already runs under the prioritized `sub_*` token, so the returned permissions are the impersonated user's automatically.

### 4.3 Frontend module — `src/shared/permissions/`

```
src/shared/permissions/
├── matcher.ts        antMatch + parseApiCode (mirrors BE AntPathMatcher semantics)
├── page-gates.ts     PAGE_GATES registry: route pattern → primary API gate
└── (components live in src/shared/components/, hook in src/hooks/ per repo convention)
```

**`matcher.ts`**

```ts
const antToRegex = (pattern: string) =>
  new RegExp('^' + pattern.split('**').map((s) => s.replace(/\*/g, '[^/]*')).join('.*') + '/?$');

export const antMatch = (pattern: string, path: string) =>
  pattern === '*' || antToRegex(pattern).test(path);

export const parseApiCode = (code: string) => {
  const m = code.match(/^PERM:([^:]+):(.+)$/);
  return m ? { method: m[1], path: m[2] } : null;
};
```

Semantics to mirror from BE: `**` = any number of segments, `*` = one segment, bare `*` pattern = match all, method `*` = any method, method comparison case-insensitive. Unit tests must pin these against known BE cases.

**`page-gates.ts`** — the only mapping in the system. Speaks **API language** (method + URI), never permission codes. It restates knowledge the page already has (its own fetch call), so it cannot drift from BE naming.

```ts
export type ApiGate = { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; uri: string };

export const PAGE_GATES: { route: string; api: ApiGate }[] = [
  { route: '/admin/users/**',   api: { method: 'GET', uri: '/v1/users' } },
  { route: '/admin/reports/**', api: { method: 'GET', uri: '/v1/reports' } },
  // a route absent from this list is fail-open (behaves as today)
];
```

**State** — `src/jotai/atom/permissionState.ts`

```ts
// null = not loaded yet OR old BE without expand support → every guard fails open
export const userPermissionsState = atom<{ id: string; code: string; name: string }[] | null>(null);
```

Populated wherever `/users/me` is fetched today by adding `expand=permissions` (roles expand already used there). If the response has no `permissions` field (BE not yet deployed), the atom stays `null` and the feature is dormant — FE can ship before BE.

**Hook** — `src/hooks/usePermissions.ts`

```ts
export const usePermissions = () => {
  const perms = useAtomValue(userPermissionsState);
  const isReady = perms !== null;

  const canCallApi = (method: string, uri: string): boolean =>
    !isReady ||
    perms.some(({ code }) => {
      const p = parseApiCode(code);
      return !!p && (p.method === '*' || p.method === method.toUpperCase()) && antMatch(p.path, uri);
    });

  const canAccessRoute = (path: string): boolean => {
    const gate = PAGE_GATES.find((g) => antMatch(g.route, path));
    return !gate || canCallApi(gate.api.method, gate.api.uri);
  };

  return { isReady, canCallApi, canAccessRoute };
};
```

All checks are synchronous in-memory scans (`Array.some` + regex). **No network call per button or per page.**

### 4.4 Guards

**`PagePermissionGuard`** — mounted **once** in the `(admin)` layout and once in the `(private)` layout (inside the existing `RouteGuard`, which keeps doing role checks):

```tsx
export const PagePermissionGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();            // next-intl: locale already stripped
  const router = useRouter();
  const { isReady, canAccessRoute } = usePermissions();
  const allowed = canAccessRoute(pathname);

  useEffect(() => {
    if (isReady && !allowed) router.replace('/access-denied');
  }, [isReady, allowed, router]);

  if (isReady && !allowed) return null;      // prevent content flash before redirect
  return <>{children}</>;
};
```

**`PermissionGuard`** — wraps buttons/sections:

```tsx
type Props = {
  api: ApiGate;
  mode?: 'hide' | 'disable';   // default 'hide'
  children: React.ReactElement;
};

export const PermissionGuard = ({ api, mode = 'hide', children }: Props) => {
  const t = useTranslations('Common');
  const { canCallApi } = usePermissions();

  if (canCallApi(api.method, api.uri)) return children;
  if (mode === 'hide') return null;
  return (
    <Tooltip label={t('no_permission_tooltip')}>
      <span className="inline-block cursor-not-allowed">
        {cloneElement(children, { disabled: true })}
      </span>
    </Tooltip>
  );
};
```

i18n: add `Common.no_permission_tooltip` to **all 7 locale files** (en, ko, vi, zh, he, es, ar), snake_case key per repo convention.

### 4.5 Sidebar

No new field on `menuItems`. Filter with the item's existing `href`:

```ts
const visibleItems = items
  .filter((item) => hasMenuAccess(item, userRole))   // existing role check
  .filter((item) => canAccessRoute(item.href));      // new permission check
```

Menu and page guard share `canAccessRoute`, so they can never disagree.

## 5. Failure & edge-case behavior

| Case | Behavior |
|------|----------|
| Route not in `PAGE_GATES` | Allowed (fail-open) — today's behavior |
| Permissions not loaded / old BE | `isReady=false` → everything allowed; feature dormant (deploy-order safe) |
| Admin revokes a permission mid-session | FE cache stale until next profile refetch; if the user clicks, BE filter returns 403 (real enforcement) and existing error toast shows |
| FE matcher diverges from BE on an edge pattern | Worst case = button shown that BE rejects with 403. The unsafe direction (FE hides, BE allows) does not exist because hiding has no security role |
| Login-as (`sub_*` token) | Permissions arrive with the same prioritized-token `/users/me` call → automatically the impersonated user's |
| Two pages sharing one primary API | Cannot be gated differently in v1 — see §8 |

## 6. Rollout

- **Phase 1 (this feature):** BE expand + FE core module + guards + `PAGE_GATES` entries for the ~10 `(admin)` v2 pages + 2–3 sample button gates on Admin Users (Delete = `hide`, Export = `disable`) + sidebar filtering.
- **Phase 2+:** add `PAGE_GATES` entries and button gates for `(private)` pages (LO/Realtor/HO) incrementally. Each addition is one registry line; fail-open makes partial coverage safe at every step.
- No new admin tooling needed: permission management stays on the existing Roles/Permissions pages.

## 7. Testing

**FE (Jest, repo standard):**

- `matcher.ts`: ant semantics pinned against BE cases — `**` multi-segment, `*` single-segment, bare `*`, method `*`, case-insensitivity, trailing-slash tolerance.
- `parseApiCode`: valid `PERM:` codes, non-`PERM:` codes rejected, paths containing `:`.
- `usePermissions`: fail-open when atom is `null`; grant/deny resolution; `canAccessRoute` with gated/ungated routes.
- `PermissionGuard`: renders children when allowed; `hide` → null; `disable` → disabled + tooltip.
- Menu filtering: role pass + permission fail → hidden.

**BE (JUnit):**

- Effective-set merge: multi-role union + direct permissions, deduped.
- `expand=permissions` present/absent behavior on `/users/me`.

**Manual/E2E:** admin user (holding `PERM:*:*`) sees everything; a restricted test role loses the gated page (redirect to `/access-denied`), its sidebar item, and gated buttons; direct-permission grant restores them without relogin… after profile refetch.

## 8. Deferred (explicitly out of scope for v1)

- **`PAGE:<route>` permission type** — needed only if two pages sharing one API must be gated differently, or if a page must be gated independently of its data. Structurally safe to add later (BE filter ignores non-`PERM:` codes), additive, no rework of v1.
- **Per-user permission subtraction (deny)** — would require a `granted Boolean` column on `user_permission` (wrapper type per team rule) and merge-priority logic.
- **Realtime permission push** (websocket/refetch-on-change) — stale-until-refetch accepted for v1.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| FE ant matcher drifts from Spring `AntPathMatcher` on exotic patterns | Unit tests pin the exact cases used in seeds; patterns in `PAGE_GATES` kept simple (`/prefix/**`) |
| A `PAGE_GATES` entry references the wrong API | Page then follows that API's permission — visible immediately in testing; fail-open means the mistake never locks the app |
| `/users/me` payload grows | Effective sets are small (tens of rows); `expand` is opt-in, other callers unaffected |
