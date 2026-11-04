# Design: Admin Dashboard V2 UI

## 1. Architecture Decisions

### AD-1: Mirror the `(private)/dashboard-v2` folder pattern
- **Decision**: Create `src/app/[locale]/(admin)/admin/dashboard-v2/_components/Dashboard/index.tsx`. No `page.tsx` in the `dashboard-v2` admin folder. `admin/dashboard/page.tsx` dynamically imports both v1 and v2 Dashboard components via `withUIVersion`.
- **Why**: Matches the exact shape already shipped for private (`(private)/dashboard-v2/_components/Dashboard/index.tsx` + `(private)/dashboard/page.tsx` using `withUIVersion`). Keeps cognitive load low for the next dev and reuses the existing HOC with zero modification.
- **Alternatives considered**: (a) new admin route `/admin/dashboard-v2` — rejected, doesn't match private pattern and requires menu/route-constant churn that is out of scope. (b) inline both layouts in a single file with an if/else — rejected, violates KISS at file boundaries and makes lazy-loading the v2 bundle harder.

### AD-2: Reuse `uiVersionAtom` unchanged
- **Decision**: Admin header toggle writes to the same `uiVersionAtom` from `@jotai/atom/uiVersionState` with the same `'lfiq-ui-version'` localStorage key.
- **Why**: A single toggle for the whole app is the user's stated expectation (Q4 answer: "toggle UI version vào admin header"). Splitting into an admin-scoped atom would let admins have v1 on one route and v2 on another — confusing and explicitly not what the user asked for.

### AD-3: Admin v2 reuses v1 data-fetching logic verbatim
- **Decision**: The new `admin/dashboard-v2/_components/Dashboard/index.tsx` copies the orchestration logic (`fetchStatisticsForTypeCards`, `fetchStatisticsForTypeCharts`, all the state, all the `useEffect` wiring) from `admin/dashboard/page.tsx`. Only the JSX / visual layout is replaced with dashboard-v2 patterns.
- **Why**: User explicitly said v2 is a visual port (Q1: "Superset — giữ toàn bộ widget admin đang có ... chỉ áp dụng phong cách visual"). Touching data logic risks regression on a code path that works today.
- **Tradeoff**: Temporary duplication between v1 and v2 orchestrator code. Acceptable because v1 is frozen once toggle is live — it only exists to preserve zero-regression fallback. Once the product team decides to retire v1, the duplicated logic is deleted with v1.

### AD-4: Admin-only widgets adopt v2 visual language via styling edits (not new components)
- **Decision**: `LoanOfficerCard`, `PlanCard`, `LoanOfficerLineChart` in the `admin/dashboard-v2/_components/` folder get the v2 visual treatment (colored icon box, divider, uppercase tracking-wider labels, text-2xl font-bold value, Mantine `Card` shell). These are copies of the v1 admin components, visually retouched — not wholly new components.
- **Why**: Matches the explicit user instruction (Q6: "DEV agents áp dụng visual language của mockup private cho widget admin-only"). Keeps data contracts/props identical so wiring from the orchestrator is trivial.
- **Alternatives considered**: Ask the user for a mockup (Q6 option a) — rejected per the user's answer.

### AD-5: Shared `UIVersionToggle` extraction is optional
- **Decision**: If the duplicated toggle markup (tooltip + `ActionIcon` + tabler icon switch) exceeds ~20 lines across AdminHeader desktop, AdminHeader mobile, PrivateHeader desktop, PrivateHeader mobile, extract `src/shared/components/UIVersionToggle/index.tsx` and refactor all four call sites. Otherwise copy the mechanic inline.
- **Why**: DRY is a judgement call — four instances of a ~12-line block is borderline. Leave the call to the implementer; both outcomes are defensible.
- **If extracted**: Location is `src/shared/components/...` (the shared bucket is route-group agnostic — see AD-6). Props = `{ size?: 'sm' | 'md' | 'lg'; iconSize?: number; variant?: 'desktop' | 'mobile' }`. Component internally reads `uiVersionAtom`, renders the tooltip + `ActionIcon` + icon. No props for label — labels come from `t('Action.switch_to_classic_ui')` / `t('Action.try_new_ui')` (keys already exist in all locale files). For the mobile caption, component also reads `t('Action.classic_ui_label')` / `t('Action.new_ui_label')` (added in task 5.1).

### AD-6: No cross-route-group imports (strict)
- **Decision**: Code under `src/app/[locale]/(admin)/...` MUST NOT import from `src/app/[locale]/(private)/...` and vice-versa. Any visual or logic component needed by both route groups must either (a) live under `src/shared/...`, or (b) be physically copied into each consuming route group.
- **Why**: Route groups in Next.js App Router represent distinct user experiences with different layouts, auth scopes, and product owners. Cross-group coupling (e.g., admin importing `(private)/dashboard-v2/_components/HomeOwnerCard`) creates surprising blast-radius: a styling tweak meant for private homeowners silently ships to admin dashboards. It also breaks the mental model that "this directory is self-contained" — future maintainers cannot refactor `(private)` without grepping every `(admin)` file, and vice-versa. User explicitly required this constraint after reviewing the draft design.
- **Applies to this feature**: All six private dashboard-v2 components listed in the task 1.1 file list (`HomeOwnerCard`, `RealtorCard`, `HomeOwnerLineChart`, `RealtorLineChart`, `HomeOwnerReportBarChart`, `TrackingBarChart`) — **copy** the full file contents into `(admin)/admin/dashboard-v2/_components/<Name>/index.tsx`. `ActivityOverviewSection` — copy into `(admin)/admin/dashboard-v2/_components/ActivityOverviewSection/index.tsx` rather than cross-importing.
- **Tradeoff accepted**: Admin v2 will not automatically inherit future edits to the `(private)` dashboard-v2 components. This is deliberate — admin and private visual language can diverge if product decisions warrant. If unified evolution is later required, elevate the component to `src/shared/components/...` in a separate refactor change.
- **Alternatives considered**: (a) cross-import with a lint rule allow-list — rejected, adds magic exceptions and makes the rule softer than "strict". (b) immediately move all shared visuals to `src/shared/components/...` in this change — rejected, widens scope beyond admin dashboard v2 and requires re-testing private dashboard-v2.

## 2. Component Mapping

| Private dashboard-v2 component | Admin dashboard-v2 treatment |
|---|---|
| `ActivityOverviewSection` | **Copy** the file contents into `(admin)/admin/dashboard-v2/_components/ActivityOverviewSection/index.tsx`. Per AD-6, do NOT cross-import from `(private)`. |
| Sticky toolbar markup (period select + month/year picker + SegmentedControl) | **Copy inline** into the admin `Dashboard/index.tsx` — same JSX structure, same Tailwind classes (`sticky top-[80px] z-30 bg-white dark:bg-gray-900 shadow-sm rounded-md`). Admin version keeps the `internal/external` SegmentedControl (already present in v1). |
| `HomeOwnerCard`, `RealtorCard`, `HomeOwnerLineChart`, `RealtorLineChart`, `HomeOwnerReportBarChart`, `TrackingBarChart` | **Copy** each file verbatim from `(private)/dashboard-v2/_components/<Name>/index.tsx` into `(admin)/admin/dashboard-v2/_components/<Name>/index.tsx`. Per AD-6, no cross-route-group imports. These components' props are admin-compatible (already accept `internal*Data` / `external*Data` arrays). |
| No equivalent in private (admin-only) | `LoanOfficerCard`, `LoanOfficerLineChart`, `PlanCard` — visual language applied per AD-4. |
| `HomeOwnerReportsCard` | **Not included** — user explicitly opted out (Q2 = No). |
| `TrackingCard` | **Not included in admin v2** — admin v1 does not show a TrackingCard (only the bar chart), and user said "superset of admin widgets", not "include private-only widgets". |

## 3. Data Source

Identical to admin dashboard v1. No API changes.

```
GET getStatistics with filter:
  targetUser eq "ALL"
    and period gte "2025" and periodType eq "YEARLY"   // for cards
    and groupName eq "<type>"

Where <type> is one of:
  PLAN, EXTERNAL_LOAN_OFFICER, INTERNAL_LOAN_OFFICER,
  EXTERNAL_HOME_OWNER, INTERNAL_HOME_OWNER,
  EXTERNAL_REALTOR, INTERNAL_REALTOR,
  REPORT, TRACKING
```

Period filter for charts follows the same `Daily | Monthly | Yearly` logic from v1 (`getPeriodFilter`). The admin dashboard v1 uses `currentProfile` as a gate in the effects that set `filterCards` / `filterCharts` — v2 keeps the same gate. No behavioral difference.

**Null-safety rules (per `feedback_null_checks.md`):**
- Every array destructured out of `statisticsDataCards[KEY]` / `statisticsDataCharts[KEY]` must default to `[]` (pattern already present in v1: `statisticsDataCards.INTERNAL_LOAN_OFFICER || []`).
- Any direct field access on a payload item (`item.type`, `item.value`, `item.reference_ids`) must use optional chaining or guarded access.
- `userProfile?.current_profile`, `userProfile?.username`, `getDefaultLoanOfficer(userProfile)?.key` already follow this pattern — preserve.

## 4. UI Version Switch

### 4.1 Admin header desktop toggle

File: `src/shared/layout/AdminLayout/components/AdminHeader/DesktopHeader/index.tsx`

Insert the toggle inside the right-side `<Group gap="md">` (around line 67, before `<UserGuide />`):

```tsx
// Imports to add:
import { IconSparkles, IconLayoutDashboard } from '@tabler/icons-react'
import { useAtom } from 'jotai'
import { Tooltip, ActionIcon } from '@mantine/core'
import { uiVersionAtom } from '@jotai/atom/uiVersionState'

// Inside the component body:
const [uiVersion, setUiVersion] = useAtom(uiVersionAtom)

// In JSX, inside the right-side Group:
<Tooltip
  label={uiVersion === 'v2' ? t('Action.switch_to_classic_ui') : t('Action.try_new_ui')}
  position="bottom"
>
  <ActionIcon
    variant={uiVersion === 'v2' ? 'filled' : 'default'}
    color={uiVersion === 'v2' ? 'violet' : 'gray'}
    size="lg"
    radius="md"
    onClick={() => setUiVersion((prev) => (prev === 'v2' ? 'v1' : 'v2'))}
  >
    {uiVersion === 'v2' ? <IconSparkles size={18} /> : <IconLayoutDashboard size={18} />}
  </ActionIcon>
</Tooltip>
```

No `adminOnly` guard in admin header — by definition, everyone viewing the admin header is already scoped through route protection. (Private header uses `adminOnly` because that route is seen by non-admins too.)

### 4.2 Admin header mobile toggle

File: `src/shared/layout/AdminLayout/components/AdminHeader/MobileHeader/index.tsx`

Insert the toggle inside the drawer "Utility Section" (around line 300, next to `UserGuide` and `ThemeToggle`):

```tsx
// Same imports as desktop variant
const [uiVersion, setUiVersion] = useAtom(uiVersionAtom)

// In the utility section markup:
<div className="flex flex-col items-center gap-2">
  <Tooltip
    label={uiVersion === 'v2' ? t('Action.switch_to_classic_ui') : t('Action.try_new_ui')}
    position="bottom"
  >
    <ActionIcon
      variant={uiVersion === 'v2' ? 'filled' : 'default'}
      color={uiVersion === 'v2' ? 'violet' : 'gray'}
      size="xl"
      radius="xl"
      onClick={() => setUiVersion((prev) => (prev === 'v2' ? 'v1' : 'v2'))}
    >
      {uiVersion === 'v2' ? <IconSparkles size={20} /> : <IconLayoutDashboard size={20} />}
    </ActionIcon>
  </Tooltip>
  <p className="text-xs font-bold text-center" style={{ color: 'hsl(215, 15%, 60%)' }}>
    {uiVersion === 'v2' ? t('Action.classic_ui_label') : t('Action.new_ui_label')}
  </p>
</div>
```

The caption `Classic UI` / `New UI` is currently hardcoded at `PrivateLayout/components/PrivateHeader/MobileHeader/index.tsx:467` — this feature also FIXES that hardcode (see task 4.4). Admin mobile header uses the same two i18n keys (`Action.classic_ui_label` / `Action.new_ui_label`), keeping both mobile headers in sync. If extraction happens (AD-5), the shared component owns the lookup for both call sites.

## 5. Routing

File: `src/app/[locale]/(admin)/admin/dashboard/page.tsx`

Current content (559 lines of inline v1 logic) moves to `admin/dashboard/_components/Dashboard/index.tsx` (new file — mirrors the private pattern where `dashboard/_components/Dashboard/index.tsx` holds v1).

Replacement `page.tsx`:

```tsx
'use client'

import RouteGuard from '@shared/components/RouteGuard'
import { withUIVersion } from '@shared/components/withUIVersion'

const Dashboard = withUIVersion(
  () => import('./_components/Dashboard'),
  () => import('../dashboard-v2/_components/Dashboard')
)

const AdminDashboardPage = () => {
  return (
    <RouteGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <Dashboard />
    </RouteGuard>
  )
}

export default AdminDashboardPage
```

**Required roles**: Verify in the codebase what the admin dashboard currently requires before picking `['ADMIN', 'SUPER_ADMIN']`. The current admin page has no `RouteGuard` wrapper (it relies on the `(admin)` segment layout). If that's the case, do **not** add `RouteGuard` here — preserve behavior. The snippet above is illustrative; the implementer must match whatever protection `page.tsx` currently has (or had before the rewrite).

## 6. File Layout

```
src/app/[locale]/(admin)/admin/
├── dashboard/
│   ├── page.tsx                     (REWRITE — withUIVersion shell)
│   └── _components/
│       ├── Dashboard/
│       │   └── index.tsx            (NEW — v1 logic moved here from page.tsx)
│       ├── HomeOwnerCard/           (existing, unchanged)
│       ├── HomeOwnerLineChart/      (existing, unchanged)
│       ├── HomeOwnerReportBarChart/ (existing, unchanged)
│       ├── HomeOwnerReportsCard/    (existing, unused by v2 — keep for v1)
│       ├── LoanOfficerCard/         (existing, unchanged — used by v1)
│       ├── LoanOfficerLineChart/    (existing, unchanged — used by v1)
│       ├── PlanCard/                (existing, unchanged — used by v1)
│       ├── PlanLineChart/           (existing, unchanged)
│       ├── RealtorCard/             (existing, unchanged)
│       ├── RealtorLineChart/        (existing, unchanged)
│       └── TrackingBarChart/        (existing, unchanged)
│
└── dashboard-v2/
    └── _components/
        ├── Dashboard/
        │   └── index.tsx            (NEW — v2 orchestrator)
        ├── LoanOfficerCard/
        │   └── index.tsx            (NEW — v2 visual, admin-only)
        ├── LoanOfficerLineChart/
        │   └── index.tsx            (NEW — v2 visual, admin-only)
        ├── PlanCard/
        │   └── index.tsx            (NEW — v2 visual, admin-only)
        ├── HomeOwnerCard/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        ├── RealtorCard/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        ├── HomeOwnerLineChart/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        ├── RealtorLineChart/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        ├── HomeOwnerReportBarChart/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        └── TrackingBarChart/
            └── index.tsx            (NEW — copy from (private)/dashboard-v2)
```

**Note on copies vs cross-imports**: Per **AD-6**, cross-route-group imports are prohibited. Every private dashboard-v2 component listed above MUST be copied into `(admin)/admin/dashboard-v2/_components/<Name>/index.tsx`. No `import ... from '../../(private)/...'` statements are allowed in admin code. If a future feature needs the component shared across route groups, elevate it to `src/shared/components/...` in a separate change — do not introduce the cross-import shortcut here.

Also add to the file layout above:
```
└── dashboard-v2/
    └── _components/
        ├── ActivityOverviewSection/
        │   └── index.tsx            (NEW — copy from (private)/dashboard-v2)
        ├── ...
```

## 7. i18n

### 7.1 Extend `AdminDashboardPage` namespace

Existing keys (preserve): `internal_description`, `external_description`, `title`, `welcome`, `user_management`, `manage_users_roles_permissions`, `system_settings`, `manage_system_settings`, `manage_plans`, `manage_roles_and_permissions`, `configure_system_wide_settings`.

Add the following keys:
- `activity_overview_subtitle` — subtitle under the Activity Overview section header. Parallel to `Dashboard.activity_overview_subtitle` already used by private dashboard-v2.

### 7.2 Extend `Action` namespace

Add:
- `classic_ui_label` — short label shown under the toggle on mobile. English: `"Classic UI"`.
- `new_ui_label` — short label shown under the toggle on mobile. English: `"New UI"`.

Existing keys **already present in all 7 locales** (verified — used by private header): `Action.switch_to_classic_ui`, `Action.try_new_ui`. Do NOT re-add.

### 7.3 Apply to all 7 locale files

`ar.json, en.json, es.json, he.json, ko.json, vi.json, zh.json` — each file gets both the new `AdminDashboardPage.activity_overview_subtitle` entry and the two `Action.classic_ui_label` / `Action.new_ui_label` entries. Snake_case keys under CamelCase namespace (per `feedback_i18n_rules.md`).

For non-English locales, reuse the equivalent private-dashboard subtitle already present in `Dashboard.activity_overview_subtitle` of each file — same phrasing is appropriate.

## 8. Theming / Styling Rules

- **No Mantine layout primitives**: no `<Stack>`, `<Group>`, `<Text>`, `<Title>`. Use `<div className="flex flex-col gap-*">`, `<div className="flex items-center gap-*">`, `<p className="text-* font-*">`, `<h1..h6 className="...">` instead. Mantine components that are not banned (`Card`, `Grid`, `Select`, `SegmentedControl`, `Button`, `ActionIcon`, `Tooltip`, `MonthPickerInput`, `YearPickerInput`, `Divider`) are fine.
- **Dark mode**: toolbar uses `bg-white dark:bg-gray-900`. Cards follow the Mantine theme-aware styling used in private dashboard-v2.
- **Tailwind over inline style**: Prefer Tailwind utility classes over `style={{}}`. Inline `style` is acceptable where a CSS variable reference (`hsl(...)`) matches existing project patterns (the mobile drawer styling does this heavily; preserve for the toggle caption).

## 9. Testing Strategy

Covered in `tasks.md` task 6. Summary:

- **Smoke tests** (Jest + @testing-library/react): render `admin/dashboard-v2/_components/Dashboard` with mocked `getStatistics` returning empty/null payload — assert no crash, assert placeholders/empty states render. Render with realistic payload — assert card values and chart rendering happen. Tests mock `useTranslations` / `useLocale` and the Jotai atom.
- **`withUIVersion` switch test**: set `uiVersionAtom` to `'v1'` → v1 component renders. Set to `'v2'` → v2 renders.
- **Toggle test**: render admin header desktop/mobile, click the toggle, assert atom value flips.
- **Build gate**: `npm run build` passes end-to-end (enforced by pre-commit).
- **Lint gate**: `npm run lint` passes with no warnings in new files.

## 10. Rollout / Risk

- Default `uiVersionAtom` stays `'v1'`. Only admins who have already opted into v2 via the private header will see admin v2 immediately after deploy. This scopes blast radius naturally.
- If a regression appears in admin v2, revert by flipping back to v1 via the toggle — no code deploy needed for end-user recovery.
- v1 code path is untouched; worst-case rollback is deleting `admin/dashboard-v2/` and reverting `admin/dashboard/page.tsx`.
