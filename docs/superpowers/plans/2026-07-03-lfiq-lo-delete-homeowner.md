# LFIQ — LO Delete Homeowner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Loan Officer delete their own homeowner account from `/homeowners`, with the button gated by the existing permission system and the backend hardened so a LO can only delete homeowners they own.

**Architecture:** Two repos. **BE (lfiq-backend)** adds a caller-ownership guard to `UserServiceImpl.deleteUser` (ADMIN unchanged; LOAN_OFFICER may only delete a HOME_OWNER whose `hoWorkingWithLoanOfficer == currentUser`). **FE (lf-iq)** adds a row Delete action on `HomeownerCard`, wrapped in the existing `PermissionGuard` (hide mode) and additionally gated by homeowner `source`, opening a self-contained `ConfirmDeleteHomeownerDialog` that reuses LO-available endpoints (`deleteUser`, and `deleteReports` for the `REPORT_EXIST` two-step). The LO delete permission itself is granted by an admin via the Access Control UI — no seed change.

**Tech Stack:** BE = Java 21 / Spring Boot 3 / JUnit 5 + Mockito. FE = Next.js 14 / React 18 / TypeScript / Mantine 7 / Tailwind / next-intl / Jest.

## Global Constraints

- **No FE permission-code constants.** Gate via `PermissionGuard api={{ method, uri }}` only — never hardcode/enumerate permission code strings. (Matches the shipped permission feature.)
- **Fail-open invariant (FE):** when `permissions` is absent/null the guard grants access — do not change this. The Delete button relies on `PermissionGuard` returning `null` (hide) when the LO lacks the permission.
- **No seed-file change.** Do NOT edit `role-2-permission.json`. The `PERM:DELETE:/v1/users/*` grant to LOAN_OFFICER is an admin Access Control action.
- **BE new entity fields must be wrapper types** — N/A here (no new fields), but do not introduce primitives.
- **BE house style:** criteria/`entityService` patterns; `BadRequestException(code, message, Map.of(...))` for domain errors; `@Slf4j`/`LOGGER` logging. Mirror the existing `getHomeOwners`/`getRealtors` ownership idiom.
- **i18n:** any new key added to **all 7 locales** (`en, ko, vi, zh, he, es, ar`), snake_case key under a CamelCase namespace. Reuse existing keys wherever they already cover the copy.
- **Roles:** LOAN_OFFICER only. Do not add Realtor delete.
- **Ordering guard runs before the `REPORT_EXIST` check** so an unauthorized caller never learns whether the target has reports.
- **Branch workflows:** lfiq-backend base `develop`, PR → develop, assignee `taipham0901`. lf-iq base `production`, PR feature→master (auto), then master→production sync PR.
- **Worktrees** live under `agentflow/.worktrees/` (never inside a repo). Fresh lf-iq worktree needs `npm install`, `.env` copy, and `next-env.d.ts` copy.

---

## Task 1: BE — ownership guard in `deleteUser` + tests

**Repo:** lfiq-backend (worktree `agentflow/.worktrees/lfiq-backend-lo-delete`, branch `feat/lo-delete-homeowner-ownership` from `origin/develop`).

**Files:**
- Modify: `src/main/java/com/loanfactory/lfiq/user/service/impl/UserServiceImpl.java` (method `deleteUser`, ~line 809)
- Modify: `src/test/java/com/loanfactory/lfiq/test/user/service/impl/UserServiceImplTest.java` (nested class `DeleteUser`, ~line 116-212)

**Interfaces:**
- Consumes: `getCurrentUser()` (instance method → `SecurityUtils.getCurrentUser()`), `User.getCurrentProfile()`, `User.getProfile(HomeOwnerProfile.class)`, `HomeOwnerProfile.getHoWorkingWithLoanOfficer()`, `ProfileType.{ADMIN,LOAN_OFFICER,HOME_OWNER}`, `BadRequestException(code, message, Map)`.
- Produces: hardened `void deleteUser(String userId)` — throws `BadRequestException("USER_DELETE_FORBIDDEN", …)` when a non-admin caller is not an owning LO.

- [ ] **Step 1: Rewrite the `DeleteUser` nested test class to the new contract (write failing tests)**

Open `UserServiceImplTest.java`. Add these imports near the existing ones (if not already present):

```java
import com.loanfactory.lfiq.utils.SecurityUtils;
import com.loanfactory.lfiq.user.entity.profile.HomeOwnerProfile;
```

Replace the entire `@Nested class DeleteUser { … }` block (from `// ==================== deleteUser ====================` through the closing brace of the nested class) with:

```java
    // ==================== deleteUser ====================

    @Nested
    class DeleteUser {

        private User adminUser;
        private User ownedHomeOwner;

        private void stubNativeQueries() {
            Query mockQuery = mock(Query.class);
            when(mockQuery.setParameter(anyInt(), any())).thenReturn(mockQuery);
            when(mockQuery.executeUpdate()).thenReturn(0);
            when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        }

        @BeforeEach
        void setUpCallers() {
            adminUser = User.builder().currentProfile(ProfileType.ADMIN).build();
            adminUser.setId("admin-id");

            // A HOME_OWNER owned by loanOfficerUser (id "lo-id-1", from outer setUp)
            ownedHomeOwner = User.builder().currentProfile(ProfileType.HOME_OWNER).build();
            ownedHomeOwner.setId("owned-ho-id");
            ownedHomeOwner.setReports(new HashSet<>());
            ownedHomeOwner.setProfile(
                    HomeOwnerProfile.builder().hoWorkingWithLoanOfficer(loanOfficerUser).build());
        }

        // ---- ADMIN path: unchanged behaviour, ownership not enforced ----

        @Test
        void deleteUser_admin_homeOwner_noNativeQueries() {
            testUser.setReports(new HashSet<>());
            testUser.setCurrentProfile(ProfileType.HOME_OWNER);
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(testUser);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(adminUser);
                userService.deleteUser("user-id-1");
            }

            verify(entityManager, never()).createNativeQuery(anyString());
            verify(entityService).deleteBy(eq(ReleaseNoteView.class), any(Specification.class));
            verify(entityService).deleteBy(eq(ExportHistory.class), any(Specification.class));
            verify(entityService).deleteBy(eq(PlanUsage.class), any(Specification.class));
            verify(entityService).delete(testUser);
        }

        @Test
        void deleteUser_admin_loanOfficer_executesNativeQueries() {
            loanOfficerUser.setReports(new HashSet<>());
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(loanOfficerUser);
            stubNativeQueries();

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(adminUser);
                userService.deleteUser("lo-id-1");
            }

            verify(entityManager, times(3)).createNativeQuery(anyString());
            verify(entityService).delete(loanOfficerUser);
        }

        @Test
        void deleteUser_admin_realtor_executesNativeQueries() {
            User realtorUser = User.builder()
                    .username("realtor@example.com")
                    .currentProfile(ProfileType.REALTOR)
                    .build();
            realtorUser.setId("realtor-id");
            realtorUser.setReports(new HashSet<>());
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(realtorUser);
            stubNativeQueries();

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(adminUser);
                userService.deleteUser("realtor-id");
            }

            verify(entityManager, times(2)).createNativeQuery(anyString());
            verify(entityService).delete(realtorUser);
        }

        @Test
        void deleteUser_admin_nullProfile_throwsBadRequest() {
            testUser.setCurrentProfile(null);
            testUser.setReports(new HashSet<>());
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(testUser);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(adminUser);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("user-id-1"));
            }
        }

        @Test
        void deleteUser_userNotFound_throwsResourceNotFound() {
            // Not-found check fires before the ownership guard, so getCurrentUser is never read.
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(null);

            assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser("nonexistent"));
        }

        @Test
        void deleteUser_admin_userHasReports_throwsBadRequest() {
            ReportEntity report = mock(ReportEntity.class);
            testUser.setCurrentProfile(ProfileType.HOME_OWNER);
            testUser.setReports(Set.of(report));
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(testUser);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(adminUser);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("user-id-1"));
            }
        }

        // ---- LOAN_OFFICER path: ownership enforced ----

        @Test
        void deleteUser_lo_ownedHomeOwner_succeeds() {
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(ownedHomeOwner);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(loanOfficerUser);
                userService.deleteUser("owned-ho-id");
            }

            verify(entityService).delete(ownedHomeOwner);
        }

        @Test
        void deleteUser_lo_notOwnedHomeOwner_throwsBadRequest() {
            User otherLo = User.builder().currentProfile(ProfileType.LOAN_OFFICER).build();
            otherLo.setId("other-lo-id");
            User foreignHo = User.builder().currentProfile(ProfileType.HOME_OWNER).build();
            foreignHo.setId("foreign-ho-id");
            foreignHo.setReports(new HashSet<>());
            foreignHo.setProfile(HomeOwnerProfile.builder().hoWorkingWithLoanOfficer(otherLo).build());
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(foreignHo);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(loanOfficerUser);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("foreign-ho-id"));
            }
            verify(entityService, never()).delete(any(User.class));
        }

        @Test
        void deleteUser_lo_nonHomeOwnerTarget_throwsBadRequest() {
            User targetLo = User.builder().currentProfile(ProfileType.LOAN_OFFICER).build();
            targetLo.setId("target-lo-id");
            targetLo.setReports(new HashSet<>());
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(targetLo);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(loanOfficerUser);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("target-lo-id"));
            }
            verify(entityService, never()).delete(any(User.class));
        }

        @Test
        void deleteUser_nonAdminNonLoCaller_throwsBadRequest() {
            User realtorCaller = User.builder().currentProfile(ProfileType.REALTOR).build();
            realtorCaller.setId("realtor-caller-id");
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(ownedHomeOwner);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(realtorCaller);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("owned-ho-id"));
            }
            verify(entityService, never()).delete(any(User.class));
        }

        @Test
        void deleteUser_lo_ownedHomeOwnerWithReports_throwsReportExist() {
            ReportEntity report = mock(ReportEntity.class);
            ownedHomeOwner.setReports(Set.of(report));
            when(entityService.getOneBy(eq(User.class), any(Specification.class))).thenReturn(ownedHomeOwner);

            try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
                su.when(SecurityUtils::getCurrentUser).thenReturn(loanOfficerUser);
                assertThrows(BadRequestException.class, () -> userService.deleteUser("owned-ho-id"));
            }
            verify(entityService, never()).delete(any(User.class));
        }
    }
```

- [ ] **Step 2: Run the tests — verify they fail**

Run: `./gradlew test --tests "com.loanfactory.lfiq.test.user.service.impl.UserServiceImplTest"`
Expected: FAIL — the new LO tests (`deleteUser_lo_notOwnedHomeOwner_throwsBadRequest`, `deleteUser_nonAdminNonLoCaller_throwsBadRequest`, etc.) fail because `deleteUser` does not yet read the caller or throw; the owned-success test may pass incidentally, the forbidden ones will not throw.

- [ ] **Step 3: Add the ownership guard to `deleteUser`**

In `UserServiceImpl.java`, `deleteUser(final String userId)`, insert the guard immediately **after** the not-found check and **before** the `getCurrentProfile()` null check. The method top currently reads:

```java
    public void deleteUser(final String userId) {
        final User user = getUserById(userId);
        if (Objects.isNull(user)) {
            throw new ResourceNotFoundException("User [%s] not found".formatted(userId), Map.of("id", userId));
        }

        if (Objects.isNull(user.getCurrentProfile())) {
```

Insert between the not-found `}` and the `if (Objects.isNull(user.getCurrentProfile()))` line:

```java
        // Ownership guard: ADMIN may delete anyone; a LOAN_OFFICER may delete only a
        // HOME_OWNER they own (hoWorkingWithLoanOfficer == caller). Any other caller is
        // forbidden. Runs before the report check so an unauthorized caller learns nothing
        // about the target. Mirrors the ownership idiom in getHomeOwners()/getRealtors().
        final User currentUser = getCurrentUser();
        if (Objects.isNull(currentUser)) {
            throw new BadRequestException("USER_DELETE_FORBIDDEN", "Current user is not logged in",
                    Map.of("user_id", userId));
        }
        if (ProfileType.ADMIN != currentUser.getCurrentProfile()) {
            if (ProfileType.LOAN_OFFICER != currentUser.getCurrentProfile()) {
                throw new BadRequestException("USER_DELETE_FORBIDDEN",
                        "You are not allowed to delete this user", Map.of("user_id", userId));
            }
            if (ProfileType.HOME_OWNER != user.getCurrentProfile()) {
                throw new BadRequestException("USER_DELETE_FORBIDDEN",
                        "Loan Officers can only delete their own homeowners", Map.of("user_id", userId));
            }
            final HomeOwnerProfile hoProfile = user.getProfile(HomeOwnerProfile.class);
            final User owningLo = hoProfile.getHoWorkingWithLoanOfficer();
            if (Objects.isNull(owningLo) || !Objects.equals(owningLo.getId(), currentUser.getId())) {
                throw new BadRequestException("USER_DELETE_FORBIDDEN",
                        "Loan Officers can only delete their own homeowners", Map.of("user_id", userId));
            }
        }

```

`HomeOwnerProfile` is already imported (line 29). `ProfileType`, `BadRequestException`, `Objects`, `Map` are already in scope.

- [ ] **Step 4: Run the tests — verify they pass**

Run: `./gradlew test --tests "com.loanfactory.lfiq.test.user.service.impl.UserServiceImplTest"`
Expected: PASS — all `DeleteUser` tests green (ADMIN unchanged, LO ownership enforced).

- [ ] **Step 5: Compile check**

Run: `./gradlew compileJava compileTestJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/loanfactory/lfiq/user/service/impl/UserServiceImpl.java src/test/java/com/loanfactory/lfiq/test/user/service/impl/UserServiceImplTest.java
git commit -m "feat: scope deleteUser to owner — LO can delete only own homeowners [agentflow-v8fp]"
```

---

## Task 2: BE — open PR to develop

**Repo:** lfiq-backend. Depends on Task 1.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/lo-delete-homeowner-ownership
```

- [ ] **Step 2: Create the PR (assignee taipham0901)**

```bash
gh pr create --repo LoanFactory-Inc/lfiq-backend --base develop \
  --head feat/lo-delete-homeowner-ownership --assignee taipham0901 \
  --title "feat: scope user deletion to owner (LO can delete only own homeowners) [agentflow-v8fp]" \
  --body "$(cat <<'EOF'
## What
`UserServiceImpl.deleteUser` now enforces caller ownership:
- ADMIN: unchanged — may delete any user.
- LOAN_OFFICER: may delete only a HOME_OWNER whose `hoWorkingWithLoanOfficer` is the caller.
- Any other caller: `BadRequestException("USER_DELETE_FORBIDDEN")`.

Guard runs before the `REPORT_EXIST` check so an unauthorized caller learns nothing about the target. Mirrors the ownership idiom already used by `getHomeOwners()`/`getRealtors()`.

## Why
FE is adding a delete-homeowner action to the LO `/homeowners` view. The `DELETE /v1/users/{id}` endpoint had no ownership scoping — safe only because previously just ADMIN (`PERM:*:*`) could reach it. Once `PERM:DELETE:/v1/users/*` is granted to the LOAN_OFFICER role (via Access Control), this guard prevents a LO from deleting accounts they don't own.

## Rollout ordering
Merge + deploy this BEFORE granting `PERM:DELETE:/v1/users/*` to LOAN_OFFICER in Access Control.

## Tests
`UserServiceImplTest.DeleteUser` — ADMIN paths (unchanged), LO owned-success, LO not-owned/ non-HO-target/ non-LO-caller forbidden, owned-with-reports → REPORT_EXIST. Run: `./gradlew test --tests "*UserServiceImplTest"`.

## Follow-up (not in this PR)
`deleteReports`/`deleteReportsByUser` are not ownership-scoped for LO callers — flagged for a separate review.
EOF
)"
```

- [ ] **Step 3: Report the PR URL** in the task report.

---

## Task 3: FE — shared deletable-source constant + predicate

**Repo:** lf-iq (worktree `agentflow/.worktrees/lfiq-lo-delete`, branch `feat/lo-delete-homeowner` from `origin/production`).

**Files:**
- Create: `src/shared/permissions/deletable-sources.ts`
- Create: `src/shared/permissions/deletable-sources.test.ts`
- Modify: `src/app/[locale]/(admin)/admin/users/_v2/_components/UserCardActionMenu/index.tsx` (line 48 local const → import shared; line ~190 use predicate)

**Interfaces:**
- Produces: `DELETABLE_HOMEOWNER_SOURCES: readonly string[]`; `isDeletableHomeownerSource(source: string | null | undefined): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/permissions/deletable-sources.test.ts`:

```ts
import { DELETABLE_HOMEOWNER_SOURCES, isDeletableHomeownerSource } from './deletable-sources'

describe('deletable-sources', () => {
  it('lists exactly the three deletable homeowner sources', () => {
    expect([...DELETABLE_HOMEOWNER_SOURCES].sort()).toEqual(['BULK_IMPORT', 'MANUAL_CREATION', 'RATE_ALERT'])
  })

  it('returns true for a deletable source', () => {
    expect(isDeletableHomeownerSource('MANUAL_CREATION')).toBe(true)
    expect(isDeletableHomeownerSource('BULK_IMPORT')).toBe(true)
    expect(isDeletableHomeownerSource('RATE_ALERT')).toBe(true)
  })

  it('returns false for a non-deletable source', () => {
    expect(isDeletableHomeownerSource('LFIQ')).toBe(false)
    expect(isDeletableHomeownerSource('LF')).toBe(false)
    expect(isDeletableHomeownerSource('SELF_SIGNUP')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isDeletableHomeownerSource(null)).toBe(false)
    expect(isDeletableHomeownerSource(undefined)).toBe(false)
    expect(isDeletableHomeownerSource('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/permissions/deletable-sources.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

Create `src/shared/permissions/deletable-sources.ts`:

```ts
/**
 * Homeowner account sources that may be deleted from the admin Users page and the
 * Loan Officer /homeowners view. Homeowners from any other source (self-signup,
 * invited, LF-synced, seed data, …) are managed elsewhere and are not deletable here.
 * Single source of truth for both surfaces.
 */
export const DELETABLE_HOMEOWNER_SOURCES: readonly string[] = ['MANUAL_CREATION', 'BULK_IMPORT', 'RATE_ALERT']

export const isDeletableHomeownerSource = (source: string | null | undefined): boolean =>
  DELETABLE_HOMEOWNER_SOURCES.includes(source ?? '')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/permissions/deletable-sources.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Point admin menu at the shared constant (DRY)**

In `src/app/[locale]/(admin)/admin/users/_v2/_components/UserCardActionMenu/index.tsx`:

Delete the local constant (line 48):

```ts
const DELETABLE_HOMEOWNER_SOURCES: readonly string[] = ['MANUAL_CREATION', 'BULK_IMPORT', 'RATE_ALERT']
```

Add an import alongside the other `@shared` imports (near the `PermissionGuard` import, ~line 21):

```ts
import { isDeletableHomeownerSource } from '@shared/permissions/deletable-sources'
```

Change the `canDelete` computation (~line 189-191) from:

```ts
  const canDelete =
    (role === 'HOME_OWNER' && DELETABLE_HOMEOWNER_SOURCES.includes(user.source ?? '')) ||
    ((role === 'LOAN_OFFICER' || role === 'REALTOR') && !isExternalLoOrRealtor)
```

to:

```ts
  const canDelete =
    (role === 'HOME_OWNER' && isDeletableHomeownerSource(user.source)) ||
    ((role === 'LOAN_OFFICER' || role === 'REALTOR') && !isExternalLoOrRealtor)
```

- [ ] **Step 6: Type-check + admin test smoke**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/shared/permissions/deletable-sources.ts src/shared/permissions/deletable-sources.test.ts "src/app/[locale]/(admin)/admin/users/_v2/_components/UserCardActionMenu/index.tsx"
git commit -m "refactor: extract DELETABLE_HOMEOWNER_SOURCES to shared module [agentflow-v8fp]"
```

---

## Task 4: FE — i18n key for type-to-confirm

**Repo:** lf-iq. The dialog reuses existing `Confirmation.*`, `Action.*`, `Notification.*`, `Noun.*` keys and needs exactly one new key.

**Files:**
- Modify: `src/messages/en.json`, `vi.json`, `zh.json`, `ko.json`, `es.json`, `he.json`, `ar.json` — add `delete_homeowner_type_label` under the `Confirmation` namespace.

- [ ] **Step 1: Add the key to all 7 locales**

Add `"delete_homeowner_type_label"` inside the `"Confirmation"` object of each file, with these values:

- `en.json`: `"delete_homeowner_type_label": "Type {literal} to confirm"`
- `vi.json`: `"delete_homeowner_type_label": "Nhập {literal} để xác nhận"`
- `zh.json`: `"delete_homeowner_type_label": "输入 {literal} 以确认"`
- `ko.json`: `"delete_homeowner_type_label": "{literal}을(를) 입력하여 확인"`
- `es.json`: `"delete_homeowner_type_label": "Escribe {literal} para confirmar"`
- `he.json`: `"delete_homeowner_type_label": "הקלד {literal} לאישור"`
- `ar.json`: `"delete_homeowner_type_label": "اكتب {literal} للتأكيد"`

- [ ] **Step 2: Verify JSON validity**

Run: `node -e "['en','vi','zh','ko','es','he','ar'].forEach(l=>{const o=require('./src/messages/'+l+'.json'); if(!o.Confirmation.delete_homeowner_type_label) throw new Error('missing in '+l); }); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/messages/en.json src/messages/vi.json src/messages/zh.json src/messages/ko.json src/messages/es.json src/messages/he.json src/messages/ar.json
git commit -m "i18n: add Confirmation.delete_homeowner_type_label to 7 locales [agentflow-v8fp]"
```

---

## Task 5: FE — `ConfirmDeleteHomeownerDialog`

**Repo:** lf-iq. Depends on Task 4 (i18n key).

**Files:**
- Create: `src/app/[locale]/(private)/homeowners/_v2/_components/Modal/ConfirmDeleteHomeownerDialog.tsx`

**Interfaces:**
- Consumes: `deleteUser(id: string)`, `deleteReports(ids: string[])` from `@apis/private-api`; `Confirmation.delete_user_confirm` / `delete_user_report_exist_title` / `delete_user_report_exist_message` / `delete_user_report_deleted_title` / `delete_user_report_deleted_message` / `bulk_delete_subtitle` / `delete_homeowner_type_label`; `Action.*`, `Notification.*`, `Noun.*`.
- Produces: `ConfirmDeleteHomeownerDialog` default export with props `{ opened: boolean; homeowner: any | null; onClose: () => void; onSuccess: () => void }`.

- [ ] **Step 1: Create the component**

Create `src/app/[locale]/(private)/homeowners/_v2/_components/Modal/ConfirmDeleteHomeownerDialog.tsx`:

```tsx
'use client'

import { Modal } from '@mantine/core'
import { IconAlertTriangle, IconArrowRight, IconCircleCheck, IconFileX, IconTrash, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import React, { useEffect, useMemo, useState } from 'react'

import { deleteReports, deleteUser } from '@apis/private-api'

import useToast from '@hooks/useToast'

import { extractErrorMessage } from '@utils/errorUtils'

/**
 * Single-homeowner delete confirmation for the Loan Officer /homeowners view.
 *
 * Mirrors the admin ConfirmDeleteUserDialog UX but uses LO-available endpoints:
 * the REPORT_EXIST branch deletes reports by id via `deleteReports(ids)` (LO has
 * PERM:DELETE:/v1/reports) instead of the admin-only /v1/reports/user/{id}.
 *
 * Flow:
 *   1. confirm_delete  — type DELETE to confirm; calls deleteUser(id).
 *   2. report_exist    — reached on REPORT_EXIST; offers to delete the homeowner's
 *                        reports via deleteReports(reportIds).
 *   3. report_deleted  — reports purged; re-run deleteUser(id).
 */

const CONFIRM_DELETE_LITERAL = 'DELETE'

type Step = 'confirm_delete' | 'report_exist' | 'report_deleted'

export interface ConfirmDeleteHomeownerDialogProps {
  opened: boolean
  homeowner: any | null
  onClose: () => void
  onSuccess: () => void
}

const ConfirmDeleteHomeownerDialog: React.FC<ConfirmDeleteHomeownerDialogProps> = ({
  opened,
  homeowner,
  onClose,
  onSuccess
}) => {
  const tConfirm = useTranslations('Confirmation')
  const tAction = useTranslations('Action')
  const tNotif = useTranslations('Notification')
  const tNoun = useTranslations('Noun')
  const { notifySuccess, notifyError } = useToast()

  const [step, setStep] = useState<Step>('confirm_delete')
  const [loading, setLoading] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')

  const homeownerId: string = homeowner?.id ?? ''
  const homeownerName: string = useMemo(
    () => `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || (homeowner?.email ?? ''),
    [homeowner]
  )
  const reportIds: string[] = useMemo(
    () => (Array.isArray(homeowner?.reports) ? homeowner.reports.map((r: any) => r?.id).filter(Boolean) : []),
    [homeowner]
  )

  // Reset every time the modal opens so stale state from a previous target never leaks.
  useEffect(() => {
    if (opened) {
      setStep('confirm_delete')
      setConfirmInput('')
      setLoading(false)
    }
  }, [opened])

  const phraseValid = confirmInput.trim().toUpperCase() === CONFIRM_DELETE_LITERAL
  const canConfirmStep1 = phraseValid && !loading

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  const handleDeleteHomeowner = async () => {
    if (!homeownerId) return
    try {
      setLoading(true)
      await deleteUser(homeownerId)
      notifySuccess(tNotif('delete_successfully', { type: tNoun('homeowner') }))
      onSuccess()
      onClose()
    } catch (error: unknown) {
      const errorContext =
        (error as { error?: { context?: string }; context?: string } | null | undefined)?.error?.context ??
        (error as { context?: string } | null | undefined)?.context
      if (errorContext === 'REPORT_EXIST') {
        setStep('report_exist')
      } else {
        notifyError(extractErrorMessage(error, tNotif('delete_failed', { type: tNoun('homeowner') })))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReports = async () => {
    if (reportIds.length === 0) {
      notifyError(tNotif('delete_failed', { type: tNoun('reports') }))
      return
    }
    try {
      setLoading(true)
      await deleteReports(reportIds)
      notifySuccess(tNotif('delete_successfully', { type: tNoun('reports') }))
      setStep('report_deleted')
    } catch (error) {
      notifyError(extractErrorMessage(error, tNotif('delete_failed', { type: tNoun('reports') })))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton={false}
      centered
      padding={0}
      radius="lg"
      size={480}
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
    >
      {/* Step 1: Confirm delete */}
      {step === 'confirm_delete' && (
        <div>
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] dark:border-gray-700 px-6 pt-5 pb-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]">
              <IconTrash size={22} stroke={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-bold leading-snug tracking-tight text-[#111827] dark:text-gray-100">
                {tAction('confirm_delete')}
              </div>
              <div className="mt-1 text-[13px] text-[#6B7280] dark:text-gray-400">
                {tConfirm('delete_user_confirm', { name: homeownerName })}
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-4">
            <div className="mb-4 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-gray-400">
                {tNoun('homeowner')}
              </div>
              <div
                className="mt-0.5 truncate text-sm font-semibold text-[#111827] dark:text-gray-100"
                title={homeownerName}
              >
                {homeownerName}
              </div>
            </div>

            <label
              htmlFor="homeowner-delete-confirm-input"
              className="mb-1.5 block text-[12px] font-semibold text-[#374151] dark:text-gray-300"
            >
              {tConfirm('delete_homeowner_type_label', { literal: CONFIRM_DELETE_LITERAL })}
            </label>
            <input
              id="homeowner-delete-confirm-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              placeholder={CONFIRM_DELETE_LITERAL}
              className="w-full rounded-lg border border-[#E5E7EB] dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-[#111827] dark:text-gray-100 placeholder:text-[#9CA3AF] dark:placeholder-gray-500 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 disabled:cursor-not-allowed disabled:bg-[#F9FAFB] dark:disabled:bg-gray-700"
            />
            <p className="mt-1.5 text-[11px] text-[#6B7280] dark:text-gray-400">{tConfirm('bulk_delete_subtitle')}</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 rounded-b-lg border-t border-[#E5E7EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-[#374151] dark:text-gray-300 transition hover:bg-[#F3F4F6] dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconX size={14} />
              {tAction('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteHomeowner}
              disabled={!canConfirmStep1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:border-[#FCA5A5] disabled:bg-[#FCA5A5]"
            >
              <IconTrash size={14} />
              {tAction('delete')}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Homeowner has reports — offer to delete them */}
      {step === 'report_exist' && (
        <div>
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] dark:border-gray-700 px-6 pt-5 pb-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]">
              <IconAlertTriangle size={22} stroke={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-bold leading-snug tracking-tight text-[#111827] dark:text-gray-100">
                {tConfirm('delete_user_report_exist_title')}
              </div>
              <div className="mt-1 truncate text-[13px] text-[#6B7280] dark:text-gray-400" title={homeownerName}>
                {homeownerName}
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-4">
            <p className="text-sm leading-relaxed text-[#111827] dark:text-gray-100">
              {tConfirm('delete_user_report_exist_message', { name: homeownerName })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 rounded-b-lg border-t border-[#E5E7EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-[#374151] dark:text-gray-300 transition hover:bg-[#F3F4F6] dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconX size={14} />
              {tAction('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteReports}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D97706] bg-[#D97706] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#B45309] disabled:cursor-not-allowed disabled:border-[#FCD34D] disabled:bg-[#FCD34D]"
            >
              <IconFileX size={14} />
              {tAction('confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Reports deleted — proceed to delete homeowner */}
      {step === 'report_deleted' && (
        <div>
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] dark:border-gray-700 px-6 pt-5 pb-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]">
              <IconCircleCheck size={22} stroke={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-bold leading-snug tracking-tight text-[#111827] dark:text-gray-100">
                {tConfirm('delete_user_report_deleted_title')}
              </div>
              <div className="mt-1 truncate text-[13px] text-[#6B7280] dark:text-gray-400" title={homeownerName}>
                {homeownerName}
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-4">
            <p className="text-sm leading-relaxed text-[#111827] dark:text-gray-100">
              {tConfirm('delete_user_report_deleted_message', { name: homeownerName })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 rounded-b-lg border-t border-[#E5E7EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-gray-800 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-[#374151] dark:text-gray-300 transition hover:bg-[#F3F4F6] dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconX size={14} />
              {tAction('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteHomeowner}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:border-[#FCA5A5] disabled:bg-[#FCA5A5]"
            >
              <IconTrash size={14} />
              {tAction('delete')}
              {!loading && <IconArrowRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default ConfirmDeleteHomeownerDialog
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (If `Modal` import path or `useToast`/`extractErrorMessage` paths differ, match the admin `ConfirmDeleteUserDialog` imports exactly — they are the reference.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(private)/homeowners/_v2/_components/Modal/ConfirmDeleteHomeownerDialog.tsx"
git commit -m "feat: ConfirmDeleteHomeownerDialog for LO homeowners view [agentflow-v8fp]"
```

---

## Task 6: FE — wire Delete into card → list → page

**Repo:** lf-iq. Depends on Task 3 (predicate) + Task 5 (dialog).

**Files:**
- Modify: `src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCard/index.tsx` (props + action button)
- Modify: `src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCardList/index.tsx` (thread `onRequestDelete`)
- Modify: `src/app/[locale]/(private)/homeowners/_v2/_components/ReportPage/index.tsx` (delete state + render dialog + refetch)

**Interfaces:**
- Consumes: `isDeletableHomeownerSource` (Task 3); `ConfirmDeleteHomeownerDialog` (Task 5); `PermissionGuard` (`@shared/components/PermissionGuard`); `fetchReports` (ReportPage list refetch).
- Produces: `HomeownerCardProps.onRequestDelete?: (homeowner: any) => void`; `HomeownerCardListProps.onRequestDelete?: (homeowner: any) => void`.

- [ ] **Step 1: Add the Delete action to `HomeownerCard`**

In `HomeownerCard/index.tsx`:

Add imports (top, with the other `@tabler/icons-react` and shared imports):

```tsx
import { IconTrash } from '@tabler/icons-react'
import PermissionGuard from '@shared/components/PermissionGuard'
import { isDeletableHomeownerSource } from '@shared/permissions/deletable-sources'
```

(Note: `IconTrash` — add it to the existing `@tabler/icons-react` import list rather than a duplicate import line.)

Extend `HomeownerCardProps` (after `onLanguageChange`):

```tsx
  onLanguageChange: (homeowner: any, language: TLocale) => void
  updatingLanguageId: string | null
  onRequestDelete?: (homeowner: any) => void
```

Add `onRequestDelete` to the destructured props in `export default function HomeownerCard({ … })`:

```tsx
  onLanguageChange,
  updatingLanguageId,
  onRequestDelete
}: HomeownerCardProps) {
```

In the row action area — immediately before the chevron `<span>` block (the comment `{/* Chevron — always reserve column slot … */}`), insert the Delete button, gated by both permission and source:

```tsx
        {onRequestDelete && isDeletableHomeownerSource(homeowner.source) && (
          <PermissionGuard api={{ method: 'DELETE', uri: `/v1/users/${homeowner.id}` }}>
            <button
              type="button"
              aria-label={t('Action.delete')}
              title={t('Action.delete')}
              onClick={(e) => {
                e.stopPropagation()
                onRequestDelete(homeowner)
              }}
              className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-[#9ca3af] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-gray-800 transition-colors"
            >
              <IconTrash size={18} />
            </button>
          </PermissionGuard>
        )}

```

- [ ] **Step 2: Thread `onRequestDelete` through `HomeownerCardList`**

In `HomeownerCardList/index.tsx`:

Add to `HomeownerCardListProps` (after `onLanguageChange`):

```tsx
  onLanguageChange: (homeowner: any, language: string) => void
  onRequestDelete?: (homeowner: any) => void
```

Add `onRequestDelete` to the destructured params of `export default function HomeownerCardList({ … })` (after `onLanguageChange`):

```tsx
  onLanguageChange,
  onRequestDelete,
```

Pass it to `<HomeownerCard>` (in the `.map`, after `updatingLanguageId={updatingLanguageId}`):

```tsx
            updatingLanguageId={updatingLanguageId}
            onRequestDelete={onRequestDelete}
```

- [ ] **Step 3: Add delete state + dialog + refetch in `ReportPage`**

In `ReportPage/index.tsx`:

Add the import (with the other component imports, near `HomeownerCardList`):

```tsx
import ConfirmDeleteHomeownerDialog from '../Modal/ConfirmDeleteHomeownerDialog'
```

Add local state near the other `useState` hooks (e.g. next to `engagementUserId`):

```tsx
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
```

Pass `onRequestDelete` to `<HomeownerCardList>` (alongside `onLanguageChange`):

```tsx
          onRequestDelete={(homeowner) => setDeleteTarget(homeowner)}
```

Render the dialog next to the existing `<HomeownerDetailPanel>` (just before it or after it, inside the same parent):

```tsx
      <ConfirmDeleteHomeownerDialog
        opened={deleteTarget !== null}
        homeowner={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          setDeleteTarget(null)
          fetchReports(pagination.pageSize, 0, filterQueryParams, values.keyword)
        }}
      />
```

Note: `fetchReports`, `pagination`, `filterQueryParams`, and `values.keyword` are already defined in `ReportPage` (used when constructing `useHomeownerActions`). If the exact variable name for the filter query differs, use the same expression this file passes to the `useHomeownerActions` hook as `filter.queryParams` / `keyword` (see the hook call args). The goal is to refetch the homeowners list with the current page/filter so the deleted row disappears.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Lint the changed files**

Run: `npx eslint "src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCard/index.tsx" "src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCardList/index.tsx" "src/app/[locale]/(private)/homeowners/_v2/_components/ReportPage/index.tsx"`
Expected: no errors.

- [ ] **Step 6: Run the FE unit suite (no regressions)**

Run: `npx jest src/shared/permissions`
Expected: PASS (matcher, logic, deletable-sources tests).

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCard/index.tsx" "src/app/[locale]/(private)/homeowners/_v2/_components/HomeownerCardList/index.tsx" "src/app/[locale]/(private)/homeowners/_v2/_components/ReportPage/index.tsx"
git commit -m "feat: LO delete-homeowner action on /homeowners (permission + source gated) [agentflow-v8fp]"
```

---

## Task 7: FE — open PR(s)

**Repo:** lf-iq. Depends on Tasks 3-6.

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/lo-delete-homeowner
```

- [ ] **Step 2: Create feature → master PR**

```bash
gh pr create --repo LoanFactory-Inc/lf-iq --base master --head feat/lo-delete-homeowner \
  --title "feat: LO delete homeowner on /homeowners (permission + source gated) [agentflow-v8fp]" \
  --body "$(cat <<'EOF'
## What
Adds a Delete action to each homeowner row in the Loan Officer /homeowners view.

- Gated by the existing permission system: `PermissionGuard api={{ method: 'DELETE', uri: '/v1/users/{id}' }}` (hide mode) — invisible until the LO's role is granted `PERM:DELETE:/v1/users/*` via Access Control.
- Additionally gated by homeowner `source` (MANUAL_CREATION / BULK_IMPORT / RATE_ALERT) — extracted to `@shared/permissions/deletable-sources` and reused by the admin Users menu (DRY).
- `ConfirmDeleteHomeownerDialog`: type-DELETE confirm → `deleteUser(id)`; on `REPORT_EXIST` → offer to delete the homeowner's reports via `deleteReports(ids)` (LO-permitted) → re-delete.
- New i18n key `Confirmation.delete_homeowner_type_label` in all 7 locales; all other copy reuses existing keys.

## Depends on
Backend ownership guard (lfiq-backend) must be deployed, and an admin must grant `PERM:DELETE:/v1/users/*` to LOAN_OFFICER in Access Control, before the button does anything. FE ships safely regardless of order (button stays hidden without the permission).

## Test plan
- [ ] `npx jest src/shared/permissions` green
- [ ] `npx tsc --noEmit` clean
- [ ] Staging: LO with permission sees Delete on deletable-source rows only; delete own homeowner works; REPORT_EXIST two-step works; LO cannot delete a non-owned account (BE 403).
EOF
)"
```

- [ ] **Step 3: Create master → production sync PR (left for user to merge)**

```bash
gh pr create --repo LoanFactory-Inc/lf-iq --base production --head master \
  --title "sync: master → production (LO delete homeowner) [agentflow-v8fp]" \
  --body "Sync PR carrying the LO delete-homeowner feature to production. Merge after the feature→master PR merges and BE ownership guard is deployed + LO permission granted." || echo "master→production PR may already exist; skip"
```

- [ ] **Step 4: Report both PR URLs** in the task report.

---

## Self-Review

**1. Spec coverage:**
- §4.1 ownership guard → Task 1 ✅ (ADMIN unchanged, LO owns HO, else forbidden, guard before report check).
- §4.2 tests → Task 1 Step 1 ✅ (owned/not-owned/non-HO-target/non-LO-caller/admin/report-exist).
- §4.3 no seed change → Global Constraints + Task list has no seed edit ✅.
- §5.1 shared source constant → Task 3 ✅ (+ admin refactor to reuse).
- §5.2 row delete on HomeownerCard, PermissionGuard hide + source gate → Task 6 Step 1 ✅.
- §5.3 container wiring + refetch → Task 6 Step 3 ✅.
- §5.4 dialog with REPORT_EXIST two-step via deleteReports → Task 5 ✅.
- §5.5 i18n 7 locales → Task 4 ✅ (one new key, rest reused).
- §5.6 tests → Task 3 test ✅ (pure predicate; dialog/wiring covered by tsc/lint/manual per repo depth).
- §6 rollout ordering → captured in both PR bodies + Global Constraints ✅.

**2. Placeholder scan:** No TBD/TODO. Every code step shows full code. The only soft spot is Task 6 Step 3's note about the exact filter-query variable name — mitigated by pointing at the existing `useHomeownerActions` call args in the same file. Acceptable (the reviewer/implementer reads that call).

**3. Type consistency:** `onRequestDelete: (homeowner: any) => void` consistent across card/list/page. `ConfirmDeleteHomeownerDialogProps` = `{ opened, homeowner, onClose, onSuccess }` matches the render in Task 6. `isDeletableHomeownerSource(source)` signature matches usages. BE `deleteUser` signature unchanged. Guard uses only in-scope imports.
