# Tasks: Admin Dashboard V2 UI

Feature branch: `feature/admin-dashboard-v2-ui` (DevOps creates from `production`)
Target repo: `lf-iq`
All tasks are FE-only.

---

## 1. Port dashboard-v2 visual components into admin dashboard-v2

- [ ] 1.1 [frontend] [sonnet] **Copy** (not import) visual components from private dashboard-v2 into admin dashboard-v2
  - **Rule (per design.md §AD-6)**: NO cross-route-group imports. Each file below is physically duplicated under `(admin)/...`. Admin code MUST NOT contain any import path that traverses into `(private)`.
  - **Files to copy** (source → destination, all destinations are NEW):
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerCard/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/HomeOwnerCard/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/RealtorCard/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/RealtorCard/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerLineChart/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/HomeOwnerLineChart/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/RealtorLineChart/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/RealtorLineChart/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/HomeOwnerReportBarChart/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/HomeOwnerReportBarChart/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/TrackingBarChart/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/TrackingBarChart/index.tsx`
    - `lf-iq/src/app/[locale]/(private)/dashboard-v2/_components/ActivityOverviewSection/index.tsx` → `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/ActivityOverviewSection/index.tsx`
  - **Post-copy fixups per file**:
    - Rewrite relative imports so no path resolves into `(private)`. Use `@shared/...`, `@apis/...`, `@constants/...`, `@utils/...`, `@hooks/...`, `@jotai/...`, or sibling files inside the admin dashboard-v2 tree.
    - Keep component names identical (so admin Dashboard orchestrator imports read `./_components/<Name>`).
    - If a copied file imports another dashboard-v2 visual (e.g., a shared card helper), that helper MUST also be copied — do not reach back into `(private)`.
  - **Acceptance criteria**:
    - Each copied file compiles standalone (`npx tsc --noEmit` on the admin folder passes).
    - `grep -r "(private)" lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/` returns zero matches.
    - No behavioral change vs the private sibling — rendering the same props produces the same output.
  - **Test expectations**: No test required for this task individually; the smoke test in task 6 covers rendering.
  - **Dependencies**: none.

- [ ] 1.2 [frontend] [sonnet] Create v2-styled admin-only cards (`LoanOfficerCard`, `PlanCard`) and chart (`LoanOfficerLineChart`)
  - **Files to touch** (all NEW):
    - `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/LoanOfficerCard/index.tsx`
    - `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/PlanCard/index.tsx`
    - `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/LoanOfficerLineChart/index.tsx`
  - **Visual language to apply** (match dashboard-v2 siblings in `(private)/dashboard-v2/_components/`):
    - Mantine `Card` shell — no top gradient stripes. `radius="md"`, `withBorder` per private siblings.
    - Header row: colored icon box (`w-9 h-9 rounded-lg bg-<color>-50 text-<color>-600`) + uppercase `tracking-wider` caption.
    - `Divider` between header and body.
    - Primary value: `text-2xl font-bold`.
    - Secondary internal/external split: same pattern as `(private)/dashboard-v2/RealtorCard` — horizontal row of sub-values with small labels.
    - Color tokens: `LoanOfficerCard` uses blue (`bg-blue-50 text-blue-600`), `PlanCard` uses orange (`bg-orange-50 text-orange-600`). Adjust if existing v2 siblings conflict — the implementer should cross-reference the private dashboard-v2 color scheme and pick non-colliding hues.
  - **Props contract**: identical to the v1 admin versions at `(admin)/admin/dashboard/_components/LoanOfficerCard|PlanCard|LoanOfficerLineChart/index.tsx`. Copy the prop interfaces verbatim.
  - **Acceptance criteria**:
    - Component renders without error when passed empty arrays (`[]`) and when passed null-ish items.
    - All user-facing strings go through `useTranslations()` — zero hardcoded English.
    - No `Stack`, `Group`, `Text`, `Title` imports from `@mantine/core` in any of these files.
    - All data field access uses optional chaining / fallback.
  - **Test expectations**: covered by task 6 smoke tests.
  - **Dependencies**: task 1.1 (to study visual patterns of the dashboard-v2 siblings before copying).

---

## 2. Wire admin data sources into the v2 Dashboard orchestrator

- [ ] 2.1 [frontend] [sonnet] Create `(admin)/admin/dashboard-v2/_components/Dashboard/index.tsx`
  - **Files to touch** (NEW): `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/Dashboard/index.tsx`
  - **What to build**: A single component that is the v2 port of the current `admin/dashboard/page.tsx`. Structure:
    1. Copy the full orchestration logic (state, effects, fetch helpers `fetchStatisticsForTypeCards` / `fetchStatisticsForTypeCharts`, `PERIOD_OPTIONS`, `handlePeriodTypeChange`) from `admin/dashboard/page.tsx` lines ~96-395.
    2. Keep the data types: `PeriodType`, `GroupFilter`, `LoadingState`, `StatisticsDataCharts`, `CHART_TYPE`, `CARDS_TYPE`.
    3. Replace the JSX (lines ~396-559) with the v2 layout pulled from `(private)/dashboard-v2/_components/Dashboard/index.tsx` lines ~370-560, adapted for admin widgets:
       - Page header: reuse `PrivatePageTourHeader` (or create an `AdminPageHeader` equivalent if no private tour makes sense for admin — decision: use a plain `<div>` with an icon + title + subtitle, no tour wrapper, since admin doesn't have a tour system).
       - Summary card grid (4 cards): `LoanOfficerCard`, `RealtorCard`, `HomeOwnerCard`, `PlanCard` — imported from task 1.
       - `ActivityOverviewSection` wrapper around the toolbar + charts grid. Import from the LOCAL admin copy created in task 1.1 (`./ActivityOverviewSection`). Per AD-6 / task 1.1, **no cross-route-group imports** — admin must not reach into `(private)/dashboard-v2/...`.
       - Sticky toolbar: period Select + conditional MonthPickerInput/YearPickerInput + SegmentedControl for `internal/external`. Copy JSX from private dashboard-v2.
       - Charts grid: 3 line charts (LO + Realtor + HO) in top row (`md: 4, 4, 4`) + 2 bar charts (HO Report + Tracking) in bottom row (`md: 6, 6`).
    4. `getStatistics` filter unchanged: `targetUser eq "ALL" and <period> and groupName eq "<type>"`.
    5. `default export` the component.
  - **Acceptance criteria**:
    - File is a default-exported React function component.
    - `npm run build` compiles the file with no TS errors.
    - Component accepts no props (self-contained orchestrator).
    - Every array read from `statisticsDataCards[KEY]` / `statisticsDataCharts[KEY]` has `|| []` fallback or guarded access.
    - No `console.log` statements.
    - No `Stack`, `Group`, `Text`, `Title` from Mantine.
    - File under 800 lines (split helper functions into a `_helpers.ts` if needed — the same helpers from v1 can be extracted to `(admin)/admin/dashboard-v2/_components/Dashboard/helpers.ts` if both v1 and v2 end up wanting them — but do NOT touch v1 in this task).
  - **Test expectations**: covered by task 6.
  - **Dependencies**: task 1.1, 1.2.

---

## 3. Rewrite admin dashboard page to use `withUIVersion`

- [ ] 3.1 [frontend] [sonnet] Extract current admin dashboard v1 logic into its own Dashboard component
  - **Files to touch**:
    - NEW: `lf-iq/src/app/[locale]/(admin)/admin/dashboard/_components/Dashboard/index.tsx`
    - MODIFY: `lf-iq/src/app/[locale]/(admin)/admin/dashboard/page.tsx`
  - **What to do**:
    1. Move the entire current contents of `page.tsx` (lines 1-560 — the full `DashboardPage` function and its helpers) into `_components/Dashboard/index.tsx`. Change the default export name to `Dashboard` (was `DashboardPage`).
    2. Adjust imports: the component's relative imports (`./_components/HomeOwnerCard`, etc.) change to `../HomeOwnerCard`, `../LoanOfficerCard`, etc.
    3. Rewrite `page.tsx` to:
       ```tsx
       'use client'

       import { withUIVersion } from '@shared/components/withUIVersion'

       const Dashboard = withUIVersion(
         () => import('./_components/Dashboard'),
         () => import('../dashboard-v2/_components/Dashboard')
       )

       const AdminDashboardPage = () => {
         return <Dashboard />
       }

       export default AdminDashboardPage
       ```
    4. If the current `page.tsx` has any route guards or wrappers that this rewrite strips away, preserve them — wrap `<Dashboard />` accordingly. (Review current `page.tsx` before rewriting; the admin section already relies on layout-level guards.)
  - **Acceptance criteria**:
    - `npm run build` passes.
    - With `uiVersionAtom === 'v1'` (default), `/admin/dashboard` renders exactly the same DOM as before this change (manual QA check — take before/after screenshots in task 6).
    - With `uiVersionAtom === 'v2'`, `/admin/dashboard` renders the task 2.1 component.
    - No import-path warnings.
  - **Test expectations**: task 6 includes a `withUIVersion` switch test.
  - **Dependencies**: task 2.1.

---

## 4. Add UI-version toggle to admin header

- [ ] 4.1 [frontend] [haiku] Add UI-version toggle to `AdminHeader/DesktopHeader`
  - **Files to touch**: `lf-iq/src/shared/layout/AdminLayout/components/AdminHeader/DesktopHeader/index.tsx`
  - **What to do**: Insert the `<Tooltip> + <ActionIcon>` toggle snippet from design.md §4.1 inside the right-side `<Group gap="md">`, before `<UserGuide />`. Add the imports: `useAtom` from `jotai`, `Tooltip`, `ActionIcon` from `@mantine/core`, `IconSparkles`, `IconLayoutDashboard` from `@tabler/icons-react`, `uiVersionAtom` from `@jotai/atom/uiVersionState`.
  - **Acceptance criteria**:
    - Toggle visible on admin desktop header (width ≥ md breakpoint).
    - Click flips `uiVersionAtom` and persists to localStorage (verify via DevTools > Application > Local Storage → key `lfiq-ui-version`).
    - Tooltip shows the correct i18n label depending on current state (`switch_to_classic_ui` when v2 active, `try_new_ui` when v1 active).
    - No lint errors.
  - **Test expectations**: task 6.
  - **Dependencies**: none (task 3.1 is not required for the toggle to work — the private dashboard already respects the atom).

- [ ] 4.2 [frontend] [haiku] Add UI-version toggle to `AdminHeader/MobileHeader`
  - **Files to touch**: `lf-iq/src/shared/layout/AdminLayout/components/AdminHeader/MobileHeader/index.tsx`
  - **What to do**: Insert the toggle inside the drawer "Utility Section" (around line 300). Use the mobile variant from design.md §4.2 (larger `size="xl"`, `radius="xl"`, caption paragraph). Use `t('Action.classic_ui_label')` / `t('Action.new_ui_label')` for the caption (the existing PrivateHeader/MobileHeader hardcodes these — do NOT follow that bad pattern).
  - **Acceptance criteria**:
    - Toggle visible in the admin mobile drawer (width < md).
    - Click inside the drawer flips `uiVersionAtom`.
    - Caption uses i18n, not hardcoded English.
    - No lint errors.
  - **Test expectations**: task 6.
  - **Dependencies**: task 5 (i18n keys must exist first — coordinate ordering with the Tech Lead; alternatively, land task 5 before task 4.2).

- [ ] 4.3 [frontend] [haiku] (OPTIONAL) Extract `src/shared/components/UIVersionToggle/index.tsx` if duplication > 20 lines
  - **Files to touch** (if extracting):
    - NEW: `lf-iq/src/shared/components/UIVersionToggle/index.tsx`
    - MODIFY: `AdminHeader/DesktopHeader/index.tsx`, `AdminHeader/MobileHeader/index.tsx`, `PrivateHeader/DesktopHeader/index.tsx`, `PrivateHeader/MobileHeader/index.tsx`
  - **Decision criteria**: After tasks 4.1 + 4.2 are implemented, compare the toggle markup across the four header files. If removing it to a shared component deletes ≥20 lines across the four files combined, extract. Otherwise skip this task. Decision left to the DEV agent / Tech Lead at implementation time.
  - **Props contract** (if extracting): `{ variant: 'desktop' | 'mobile' }`. Desktop = compact `ActionIcon` only. Mobile = `ActionIcon` + caption paragraph. Internally reads `uiVersionAtom` and `useTranslations()`. Caption uses `Action.classic_ui_label` / `Action.new_ui_label` (see task 5.1). Note: `src/shared/...` is route-group agnostic (AD-6), so the shared component can be imported from both `(admin)` and `(private)` headers.
  - **Acceptance criteria**:
    - All four header files updated to use the shared component.
    - Behavior identical to pre-extraction (toggle works, captions localize, icon flips).
    - Reduces total LOC.
  - **Test expectations**: test the shared component in task 6.
  - **Dependencies**: tasks 4.1, 4.2, 4.4, 5.1.

- [ ] 4.4 [frontend] [haiku] Fix hardcoded `'Classic UI'` / `'New UI'` caption in `PrivateHeader/MobileHeader`
  - **Why in this feature**: The admin mobile header toggle (task 4.2) uses the same two i18n keys (`Action.classic_ui_label` / `Action.new_ui_label`). The existing private mobile header hardcodes them in English — shipping admin with i18n keys while leaving private hardcoded would be inconsistent and would re-introduce the i18n rule violation flagged in `feedback_i18n_rules.md`. Fix both headers in lockstep.
  - **Files to touch**:
    - MODIFY: `lf-iq/src/shared/layout/PrivateLayout/components/PrivateHeader/MobileHeader/index.tsx` (line ~467 — the `{uiVersion === 'v2' ? 'Classic UI' : 'New UI'}` literal)
    - READ-ONLY (no changes): `lf-iq/src/shared/layout/PrivateLayout/components/PrivateHeader/DesktopHeader/index.tsx` — already uses i18n tooltip keys (`Action.switch_to_classic_ui` / `Action.try_new_ui`), no hardcoded caption exists there. Verify before skipping.
  - **What to do**:
    1. Replace the inline string ternary with `{uiVersion === 'v2' ? t('Action.classic_ui_label') : t('Action.new_ui_label')}`.
    2. Ensure `useTranslations()` is already invoked in the file and covers the `Action` namespace (likely via a scoped `const t = useTranslations()` call — if it's scoped to a different namespace, widen or add a second `const tAction = useTranslations('Action')` call).
    3. Do NOT restructure the surrounding markup — keep the `<p className="text-xs font-bold text-center" style={{ color: 'hsl(215, 15%, 60%)' }}>` wrapper and the `uiVersion` atom wiring exactly as they are. This is an i18n fix, nothing else.
  - **Acceptance criteria**:
    - `grep -n "'Classic UI'\|'New UI'\|\"Classic UI\"\|\"New UI\"" lf-iq/src/` returns zero matches in any `.tsx`/`.ts` file under `lf-iq/src/shared/layout/`.
    - Switching app locale to `vi`, `es`, `zh`, `ko`, `ar`, `he` shows the localized caption instead of English on the mobile drawer toggle (verified manually or via the smoke test in task 6.1).
    - No behavioral regression — click still flips the atom, caption still centered under the icon.
    - No lint errors.
  - **Test expectations**: include one assertion in the smoke test (task 6.1) that asserts `t('Action.classic_ui_label')` is invoked when `uiVersion === 'v2'` in the private mobile header. Lightweight — does not require a full header render test.
  - **Dependencies**: task 5.1 (the two new i18n keys must exist across all 7 locale files before this task lands, otherwise next-intl build check fails). Ordering: 5.1 → 4.4 → (4.2 can run in parallel with 4.4 since they touch different files).

---

## 5. i18n keys

- [ ] 5.1 [frontend] [haiku] Add i18n keys to all 7 locale files
  - **Files to touch**:
    - `lf-iq/src/messages/ar.json`
    - `lf-iq/src/messages/en.json`
    - `lf-iq/src/messages/es.json`
    - `lf-iq/src/messages/he.json`
    - `lf-iq/src/messages/ko.json`
    - `lf-iq/src/messages/vi.json`
    - `lf-iq/src/messages/zh.json`
  - **Keys to add**:
    - Under `"AdminDashboardPage"` namespace: `"activity_overview_subtitle"` — short description under the Activity Overview heading. English: `"Monitor all user activity, homeowner reports, and platform-wide metrics."` For other locales, reuse the translation of `Dashboard.activity_overview_subtitle` that already exists in each file as a starting point and adjust wording to reflect admin/platform scope.
    - Under `"Action"` namespace: `"classic_ui_label"` (English: `"Classic UI"`) and `"new_ui_label"` (English: `"New UI"`).
      - **Consumers**: admin mobile header toggle caption (task 4.2) AND private mobile header toggle caption (task 4.4, replacing the hardcoded English). If 4.3 extraction lands, the shared `UIVersionToggle` reads them once.
  - **Acceptance criteria**:
    - Keys present in all 7 locale files with semantically correct translations (not English placeholders in non-English files).
    - snake_case keys under CamelCase namespaces (consistent with existing file conventions).
    - `npm run build` passes — next-intl does a build-time check on key parity across locales.
    - No existing keys renamed or removed.
  - **Test expectations**: n/a (the smoke test in task 6 confirms the keys resolve at runtime).
  - **Dependencies**: none.

---

## 6. Tests

- [ ] 6.1 [frontend] [sonnet] Jest smoke tests for admin dashboard v2 Dashboard component
  - **Files to touch** (all NEW):
    - `lf-iq/src/app/[locale]/(admin)/admin/dashboard-v2/_components/Dashboard/__tests__/Dashboard.test.tsx`
    - `lf-iq/src/shared/components/__tests__/withUIVersion.test.tsx` — unless this already exists; check before creating.
  - **What to test**:
    1. `Dashboard` renders without crashing when `getStatistics` resolves with empty payload (`{ payload: [] }`).
    2. `Dashboard` renders without crashing when `getStatistics` resolves with `null`-ish fields in some payload items (test null-safety).
    3. `Dashboard` renders card values when payload contains realistic aggregates.
    4. `withUIVersion` HOC renders V1 when atom === `'v1'` and V2 when atom === `'v2'` (using Jotai test provider).
    5. (optional if task 4.3 done) `UIVersionToggle` click flips atom and re-renders with the opposite icon.
  - **Mocks needed**: `@apis/private-api.getStatistics`, `useTranslations`, `useLocale`, `useHydratedUserData`. Use Jotai's `Provider` to inject a controlled atom value.
  - **Acceptance criteria**:
    - All tests pass (`npm run test`).
    - No snapshot tests — prefer behavioral assertions (label text, presence of key testids).
    - Tests run in under 5 seconds combined.
  - **Test expectations**: self-referential — this is the test task.
  - **Dependencies**: tasks 2.1, 3.1, 4.1 (optional 4.3).

- [ ] 6.2 [frontend] [haiku] Visual / regression sanity check
  - **What to do**: Manual check (no code change). Run `npm run dev`, log in as an admin, take a screenshot of `/admin/dashboard` with `uiVersion === 'v1'` — confirm it matches the pre-change screenshot (no regression). Switch to v2 via the new toggle, take a second screenshot — confirm visual parity with `(private)/dashboard-v2` look-and-feel (cards, sticky toolbar, Activity Overview section) and presence of all 4 summary cards + 3 line charts + 2 bar charts.
  - **Acceptance criteria**:
    - v1 screenshot identical to pre-change (no regression).
    - v2 screenshot shows new visual language + full admin widget set.
    - Toggle works from admin header in both desktop and mobile viewports.
  - **Artefacts**: attach both screenshots to the PR description.
  - **Dependencies**: all prior tasks.

---

## Task ordering summary

```
1.1 → 1.2 → 2.1 → 3.1 ─────────────────┐
                                       ├→ 6.1 → 6.2
5.1 → 4.1 ────────────────────────────┤
   └→ 4.2 ───────────────────────────┤
   └→ 4.4 (fixes private hdr hardcode)┤
                                       │
            4.3 (optional, after 4.1+4.2+4.4+5.1)
```

Strict constraints:
- Tasks 1.1 → 1.2 → 2.1 → 3.1 are sequential (same file tree, each depends on the previous).
- Task 5.1 MUST land before 4.2 and 4.4 (both depend on the new i18n keys).
- Task 4.3 (optional) runs last in the header track — after 4.1, 4.2, 4.4 are all merged.
- Track A (1.x / 2.1 / 3.1) and Track B (5.1 / 4.x) are independent — can run in parallel by different DEV agents.
