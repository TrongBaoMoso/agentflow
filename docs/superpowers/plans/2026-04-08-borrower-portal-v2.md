# LF Borrower Portal v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modernized borrower portal (`lf-borrower-portal-v2`) reusing v1 core logic with tera-fe architecture patterns, redesigned UI/UX for all 9 page groups, and AI-ready hook interfaces.

**Architecture:** New Next.js 15.5 project using tera-fe's proven patterns (Zustand 5, Zod 4, Axios + TanStack Query, DirtyFormProvider, useServerForm). V1 API logic, types, and constants are ported as-is. UI is entirely new. Auth uses hybrid cookie (tokens) + Zustand (profile) approach.

**Tech Stack:** Next.js 15.5, React 19, Mantine 8.3, Zustand 5, TanStack Query 5.90, React Hook Form 7.71, Zod 4.3, Axios 1.13, next-intl 4.8, Tailwind 3.4, Jest 30, Playwright 1.58

**Spec:** `docs/superpowers/specs/2026-04-08-borrower-portal-v2-design.md`

**Source projects:**
- V1 (port logic): `/Users/apple/Projects/agentflow/lf-borrower-portal/`
- Tera-fe (copy patterns): `/Users/apple/Projects/agentflow/tera-fe/`

---

## Epic 1: Project Setup + Core Infrastructure (Week 1-2)

### Task 1.1: Scaffold Next.js project

**Files:**
- Create: `lf-borrower-portal-v2/package.json`
- Create: `lf-borrower-portal-v2/next.config.mjs`
- Create: `lf-borrower-portal-v2/tsconfig.json`
- Create: `lf-borrower-portal-v2/tailwind.config.ts`
- Create: `lf-borrower-portal-v2/postcss.config.cjs`
- Create: `lf-borrower-portal-v2/.eslintrc.cjs`
- Create: `lf-borrower-portal-v2/jest.config.cjs`
- Create: `lf-borrower-portal-v2/jest.setup.ts`
- Create: `lf-borrower-portal-v2/.env.example`

- [ ] **Step 1:** Run `npx create-next-app@latest lf-borrower-portal-v2 --typescript --tailwind --eslint --app --src-dir --no-import-alias` in `/Users/apple/Projects/agentflow/`
- [ ] **Step 2:** Install core dependencies:
```bash
cd lf-borrower-portal-v2
npm install @mantine/core@8 @mantine/hooks@8 @mantine/form@8 @mantine/dates@8 @mantine/notifications@8 @mantine/modals@8 @mantine/charts@8 @mantine/carousel@8 @mantine/dropzone@8 @mantine/tiptap@8
npm install zustand @tanstack/react-query axios
npm install react-hook-form @hookform/resolvers zod
npm install next-intl @tabler/icons-react
npm install dayjs lodash classnames js-cookie
npm install @ebay/nice-modal-react recharts
npm install @vis.gl/react-google-maps @googlemaps/js-api-loader
npm install react-imask date-fns jsonwebtoken
npm install -D @types/lodash @types/js-cookie @types/jsonwebtoken
npm install -D jest @types/jest ts-jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D postcss-preset-mantine
npm install -D husky lint-staged stylelint stylelint-config-standard prettier
```
- [ ] **Step 3:** Configure `tsconfig.json` path aliases matching tera-fe pattern. Reference: `tera-fe/tsconfig.json`. Paths: `@apis/*`, `@store/*`, `@hooks/*`, `@fields/*`, `@components/*`, `@providers/*`, `@constants/*`, `@shared/types/*`, `@utils/*`, `@configs/*`, `@i18n/*`, `@actions/*`, `@styles/*`, `@public/*`
- [ ] **Step 4:** Configure `next.config.mjs`. Reference: `tera-fe/next.config.mjs`. Set output `standalone`, enable Mantine package optimization, configure image domains (`storage.googleapis.com`, `lh3.googleusercontent.com`), add API rewrites for dev proxy if needed
- [ ] **Step 5:** Configure `tailwind.config.ts` with Mantine preset. Reference: `tera-fe/tailwind.config.ts`
- [ ] **Step 6:** Configure `jest.config.cjs` with module name mapper for path aliases and next-intl mock. Reference: `tera-fe/jest.config.cjs`
- [ ] **Step 7:** Create `.env.example` with all v1 env vars:
```
NEXT_PUBLIC_ENV=
NEXT_PUBLIC_MOSO_API_URL=
NEXT_PUBLIC_MOSO_WEB_URL=
NEXT_PUBLIC_AID_API_URL=
NEXT_PUBLIC_LFIQ_API_URL=
NEXT_PUBLIC_ASSET_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_LFIQ_API_KEY=
NEXT_PUBLIC_CLIENT_ID=
NEXT_PUBLIC_CLIENT_SECRET=
```
- [ ] **Step 8:** Configure husky + lint-staged. Run `npx husky init`. Create `.lintstagedrc` matching tera-fe pattern (ESLint fix → Prettier → stylelint). Create `.prettierrc` and `.stylelintrc.json` referencing tera-fe configs
- [ ] **Step 9:** Create `playwright.config.ts` referencing tera-fe pattern: `testDir: './e2e'`, `baseURL: 'http://localhost:3000'`, chromium project
- [ ] **Step 10:** Verify: `npm run build` succeeds. Commit: `feat: scaffold lf-borrower-portal-v2 project`

---

### Task 1.2: Port v1 types and constants

**Files:**
- Create: `src/shared/types/response-types.ts` — copy from `lf-borrower-portal/src/shared/types/response-types.ts`
- Create: `src/shared/types/quote.ts` — copy from `lf-borrower-portal/src/shared/types/quote.ts`
- Create: `src/shared/types/moso-types.ts` — copy from `lf-borrower-portal/src/apis/moso-types.ts`
- Create: `src/shared/types/1003-form.ts` — copy from `lf-borrower-portal/src/shared/types/1003-form.ts`
- Create: `src/shared/types/request-types.ts` — copy from `lf-borrower-portal/src/shared/types/request-types.ts`
- Create: `src/shared/types/user.ts` — copy from `lf-borrower-portal/src/shared/types/user.ts`
- Create: `src/shared/types/loan-officer.ts` — copy from `lf-borrower-portal/src/shared/types/loan-officer.ts`
- Create: `src/shared/types/common.ts` — copy from `lf-borrower-portal/src/shared/types/common.ts`
- Create: `src/shared/types/api-base.ts` — copy from `lf-borrower-portal/src/shared/types/api-base.ts`
- Create: `src/shared/types/field.ts` — copy from `lf-borrower-portal/src/shared/types/field.ts`
- Create: `src/shared/types/social.ts` — copy from `lf-borrower-portal/src/shared/types/social.ts`
- Create: `src/shared/constants/routes.ts` — port from `lf-borrower-portal/src/shared/constants/routes.ts`, update route names (`/application` not `/1003-form`, `/documents` not `/my-todo`, `/rates` not `/quote`, `/settings` not `/profile`)
- Create: `src/shared/constants/loan.ts` — merge from v1: `loan-types.ts` + `loan-purposes.ts` + `loan-programs-non-qm.ts` + `loan-channel.ts` + `loan-document-type-non-qm.ts` + `tier-type.ts`
- Create: `src/shared/constants/quote.ts` — merge from v1: `quote.ts` + `quote-form-type.ts` + `rate-quote.ts` + `lender-rate-sheet.ts`
- Create: `src/shared/constants/form-options.ts` — merge from v1: `citizenships.ts` + `marital-statuses.ts` + `property-types.ts` + `credit-events.ts` + `cash-reserves.ts`
- Create: `src/shared/constants/notification.ts` — merge from v1: `notification-method.ts` + `notification-email.ts` + `lock-period.ts`
- Create: `src/shared/constants/date-time.ts` — port from v1, add locale-aware date format map
- Create: `src/shared/constants/common.ts` — merge from v1: `layout-size.ts` + `image-url.ts` + `local-storage-keys.ts` + `common.ts`. Add `AUTO_SAVE_INTERVAL_MS = 30000`
- Create: `src/shared/constants/application-form.ts` — port from v1 `1003-form.ts` (1004 lines: form keys, property keys, lot size keys, occupancy keys, option mappings used in application steps 1-5)

- [ ] **Step 1:** Create `src/shared/types/` directory. Copy all 10 type files from v1 `src/shared/types/`. Copy `moso-types.ts` from v1 `src/apis/moso-types.ts`
- [ ] **Step 2:** Fix any import paths in copied type files (update to v2 path aliases)
- [ ] **Step 3:** Create `src/shared/constants/` directory. Create each of the 7 consolidated constant files by merging v1 sources as specified above
- [ ] **Step 4:** Update `routes.ts` with new v2 route names
- [ ] **Step 5:** Add locale-aware date formats to `date-time.ts`:
```typescript
export const DATE_FORMATS: Record<string, string> = {
  en: 'MM/DD/YYYY',
  vi: 'DD/MM/YYYY',
  es: 'DD/MM/YYYY',
  zh: 'YYYY/MM/DD',
  he: 'DD/MM/YYYY',
}
```
- [ ] **Step 6:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port v1 types and constants`

---

### Task 1.3: Port v1 server actions, middleware, and i18n

**Files:**
- Create: `src/actions/cookies.ts` — copy from `lf-borrower-portal/src/actions/cookies.ts`
- Create: `src/actions/token.ts` — copy from `lf-borrower-portal/src/actions/token.ts`
- Create: `src/middleware.ts` — copy from `lf-borrower-portal/src/middleware.ts`
- Create: `src/i18n/routing.ts` — copy from `lf-borrower-portal/src/i18n/routing.ts`
- Create: `src/i18n/request.ts` — copy from `lf-borrower-portal/src/i18n/request.ts`
- Create: `src/messages/en.json` — copy from `lf-borrower-portal/src/messages/en.json`
- Create: `src/messages/vi.json`, `es.json`, `zh.json`, `he.json` — copy from v1

- [ ] **Step 1:** Copy `src/actions/` files from v1. Fix import paths to use v2 aliases
- [ ] **Step 2:** Copy `src/middleware.ts` from v1. Update PUBLIC_ROUTES to use v2 route constants. Fix import paths
- [ ] **Step 3:** Copy `src/i18n/` files from v1. Update to next-intl 4.8 API if needed (check tera-fe reference)
- [ ] **Step 4:** Copy all 5 message JSON files from v1 `src/messages/`
- [ ] **Step 5:** Create `src/__mocks__/next-intl.ts` from tera-fe for Jest
- [ ] **Step 6:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port auth actions, middleware, and i18n`

---

### Task 1.4: Setup Axios apiClient + TanStack Query infrastructure

**Files:**
- Create: `src/apis/apiClient.ts` — adapt from `tera-fe/src/apis/apiClient.ts`
- Create: `src/apis/react-query/useApiQuery.ts` — copy from `tera-fe/src/apis/react-query/useApiQuery.ts`
- Create: `src/apis/react-query/useApiMutation.ts` — copy from `tera-fe/src/apis/react-query/useApiMutation.ts`
- Create: `src/apis/react-query/processStateInHook.ts` — copy from `tera-fe/src/apis/react-query/processStateInHook.ts`
- Create: `src/apis/react-query/useUploadMutation.ts` — NEW: custom hook for file upload with progress + cancel
- Test: `src/apis/react-query/__tests__/useApiQuery.test.ts`

- [ ] **Step 1:** Copy `apiClient.ts` from tera-fe. Adapt the request interceptor: instead of reading `useAuthStore.getState().accessToken`, read token from the `AuthTokenProvider` context (implemented in Task 1.6). For now, add a `setAuthToken(token: string)` module-level setter that the provider will call
- [ ] **Step 2:** Copy `useApiQuery.ts`, `useApiMutation.ts`, `processStateInHook.ts` from tera-fe `src/apis/react-query/`
- [ ] **Step 3:** Create `useUploadMutation.ts` — wraps Axios with `onUploadProgress` and `AbortController`:
```typescript
// Returns { upload, progress, cancel, isUploading, error }
// upload(file, config) → Promise<T>
// progress: number (0-100)
// cancel() → aborts current upload
```
- [ ] **Step 4:** Write test for `useApiQuery` (copy from tera-fe `__tests__/` and adapt)
- [ ] **Step 5:** Verify: tests pass. Commit: `feat: setup Axios apiClient and TanStack Query hooks`

---

### Task 1.5: Setup Zustand stores

**Files:**
- Create: `src/store/useAuthStore.ts` — profile + preferences (NOT tokens)
- Create: `src/store/useApplicationStore.ts` — active borrower, tab state
- Create: `src/store/useQuoteStore.ts` — quote config, rates, compare list
- Create: `src/store/useDirtyFormRegistry.ts` — copy from `tera-fe/src/store/useDirtyFormRegistry.ts`
- Create: `src/store/useUIStore.ts` — sidebar, theme preferences
- Test: `src/store/__tests__/useAuthStore.test.ts`
- Test: `src/store/__tests__/useQuoteStore.test.ts`

- [ ] **Step 1:** Write test for `useAuthStore`: set profile, get profile, clear profile, persist survives create
- [ ] **Step 2:** Implement `useAuthStore` with Zustand persist middleware (localStorage). Fields: `user`, `setUser`, `clearUser`. NO tokens (tokens stay in cookies)
- [ ] **Step 3:** Run test, verify pass
- [ ] **Step 4:** Implement `useApplicationStore`: `activeBorrowerId`, `activeMainTab`, `activeBorrowerTab`, `isCreatingProspect`, `pendingNavigation`, setters, `reset()`
- [ ] **Step 5:** Write test for `useQuoteStore`: setQMRates, getGroupedByLogo selector, getBestPrice selector, addToCompare (max 3), clearCompare
- [ ] **Step 6:** Implement `useQuoteStore` with rate data, compare list, and derived selectors (port grouping logic from v1 `src/jotai/atom/quote/quoteData.ts`)
- [ ] **Step 7:** Run test, verify pass
- [ ] **Step 8:** Copy `useDirtyFormRegistry.ts` from tera-fe
- [ ] **Step 9:** Implement `useUIStore`: sidebar collapsed state, theme preference. Persisted
- [ ] **Step 10:** Verify all tests pass. Commit: `feat: setup Zustand stores`

---

### Task 1.6: Setup providers and root layout

**Files:**
- Create: `src/shared/providers/MasterProvider/index.tsx` — adapt from tera-fe
- Create: `src/shared/providers/AppProvider/index.tsx` — adapt from tera-fe
- Create: `src/shared/providers/ThemeProvider/index.tsx` — adapt from tera-fe
- Create: `src/shared/providers/AuthTokenProvider/index.tsx` — NEW: cookie → Axios bridge
- Create: `src/configs/theme/themeConfigs.ts` — adapt from tera-fe
- Create: `src/configs/theme/themeConfigVariables.ts` — adapt from tera-fe
- Create: `src/shared/utils/common.ts` — port from v1
- Create: `src/shared/utils/format.ts` — port from v1
- Create: `src/shared/utils/mappingValueOption.ts` — port from v1 (imported 26+ times by constants)
- Create: `src/shared/utils/schemaUtils.ts` — copy from tera-fe
- Create: `src/shared/utils/apiUtils.ts` — port from v1
- Create: `src/app/[locale]/layout.tsx` — root layout with providers
- Create: `src/app/[locale]/page.tsx` — redirect to /apply
- Create: `src/app/[locale]/[...rest]/page.tsx` — 404 catch-all

- [ ] **Step 1:** Copy theme configs from tera-fe. Adjust colors/brand if borrower portal differs from tera-fe
- [ ] **Step 2:** Copy `ThemeProvider` from tera-fe. Register Mantine CSS imports (core, notifications, dates, dropzone, carousel, charts, tiptap)
- [ ] **Step 3:** Copy `AppProvider` from tera-fe (QueryClientProvider + dayjs config)
- [ ] **Step 4:** Create `AuthTokenProvider`: server component reads `at` cookie via `getCookie('at')`, passes to client component via context. Client component calls `apiClient.setAuthToken(token)` on mount
- [ ] **Step 5:** Create `MasterProvider`: composes AuthTokenProvider → AppProvider → ThemeProvider
- [ ] **Step 6:** Port utility files from v1 (`common.ts`, `format.ts`, `apiUtils.ts`, `mappingValueOption.ts`). Copy `schemaUtils.ts` from tera-fe. Note: `mappingValueOption.ts` is imported 26+ times by the consolidated constant files — must be ported for build to succeed
- [ ] **Step 7:** Create root `layout.tsx`: fonts (Montserrat), `<MasterProvider>`, metadata. Reference: tera-fe `src/app/[locale]/layout.tsx`
- [ ] **Step 8:** Create `page.tsx` (redirect to `/apply`) and `[...rest]/page.tsx` (404)
- [ ] **Step 9:** Verify: `npm run dev` boots without errors. Commit: `feat: setup providers and root layout`

---

### Task 1.7: Port v1 hooks

**Files:**
- Create: `src/hooks/useServerForm.ts` — copy from tera-fe
- Create: `src/hooks/useServerSync.ts` — copy from tera-fe
- Create: `src/hooks/useAutoSaveOnNavigate.ts` — copy from tera-fe
- Create: `src/hooks/useUnsavedChangesGuard.ts` — copy from tera-fe
- Create: `src/hooks/useGooglePlacesAutocomplete.ts` — copy from tera-fe
- Create: `src/hooks/useToast.tsx` — port from v1, adapt for Mantine 8
- Create: `src/hooks/useZipCode.tsx` — port from v1
- Create: `src/hooks/useActiveProspect.ts` — port from v1, refactor Jotai → Zustand
- Create: `src/hooks/useModal.tsx` — port from v1

- [ ] **Step 1:** Copy tera-fe hooks: `useServerForm.ts`, `useServerSync.ts`, `useAutoSaveOnNavigate.ts`, `useUnsavedChangesGuard.ts`, `useGooglePlacesAutocomplete.ts`. Fix import paths
- [ ] **Step 2:** Port `useToast.tsx` from v1. Update icon imports from `@tabler/icons-react` 3.36. Verify Mantine 8 notification API compatibility
- [ ] **Step 3:** Port `useZipCode.tsx` from v1 as-is (pure logic, no UI coupling)
- [ ] **Step 4:** Port `useActiveProspect.ts` from v1. Replace `useAtom(borrowerLoansState)` with TanStack Query (`useGetBorrowerLoans`). Replace `useSetAtom(activeProspectKeyState)` with `useApplicationStore`. Keep business logic functions (`checkActiveProspect`, `checkActiveLoan`) unchanged
- [ ] **Step 5:** Port `useModal.tsx` from v1
- [ ] **Step 6:** Port `useCountries.ts` from v1. Replace `useAtom(countriesState)` with TanStack Query (useApiQuery wrapping a countries fetch). Used in BorrowerInfo address fields and AssetsLiabilities owned property forms
- [ ] **Step 7:** Port `useLoInfo.ts` from v1. Replace Jotai atom with `useApiQuery` wrapping `getLoInfo` API. Used in PrivateShell header, application form, and LoanOfficers tab (imported 13+ times in v1)
- [ ] **Step 8:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port hooks from tera-fe and v1`

---

## Epic 2: Shared UI Components (Week 2-3)

### Task 2.1: Port tera-fe field components

**Files:**
- Create: `src/shared/fields/TextInputField/` — copy from tera-fe
- Create: `src/shared/fields/SelectField/` — copy from tera-fe
- Create: 22 more field component directories from tera-fe
- Create: `src/shared/fields/useDirtyIndicatorStyle.ts` — copy from tera-fe
- Create: `src/shared/fields/useFieldDefault.ts` — copy from tera-fe

- [ ] **Step 1:** Copy all 24 field component directories from `tera-fe/src/shared/fields/` to `src/shared/fields/`
- [ ] **Step 2:** Copy `useDirtyIndicatorStyle.ts` and `useFieldDefault.ts`
- [ ] **Step 3:** Fix all import paths to use v2 aliases (`@fields/`, `@hooks/`, `@shared/types/`, etc.)
- [ ] **Step 4:** Verify: `npx tsc --noEmit` passes
- [ ] **Step 5:** Copy field tests from tera-fe `__tests__/` directories if they exist. Run tests
- [ ] **Step 6:** Commit: `feat: port 24 field components from tera-fe`

---

### Task 2.2: Port tera-fe shared components

**Files:**
- Create: `src/shared/components/PrivateShell/` — copy from tera-fe, adapt sidebar nav
- Create: `src/shared/components/DataTable/` — copy from tera-fe
- Create: `src/shared/components/dirty-form/` — copy from tera-fe (DirtyFormProvider, AlertBar, FooterBar)
- Create: `src/shared/components/CollapsibleFormSection/` — copy from tera-fe
- Create: `src/shared/components/SectionCard.tsx` — copy from tera-fe
- Create: `src/shared/components/ConfirmationDialog.tsx` — copy from tera-fe
- Create: `src/shared/components/UnsavedChangesDialog.tsx` — copy from tera-fe
- Create: `src/shared/components/FormSaveFooter/` — copy from tera-fe
- Create: `src/shared/components/ErrorBoundary.tsx` — copy from tera-fe

- [ ] **Step 1:** Copy `dirty-form/` directory from tera-fe (DirtyFormProvider, AlertBar, FooterBar, DirtyField, DirtyStateSync). Fix imports
- [ ] **Step 2:** Copy `PrivateShell/` from tera-fe. Adapt sidebar navigation items for borrower portal routes: Dashboard, Apply, Documents, Rates, Rate Alerts, Settings. Remove tera-fe-specific items (Prospects, Loans)
- [ ] **Step 3:** Copy remaining shared components: DataTable, CollapsibleFormSection, SectionCard, ConfirmationDialog, UnsavedChangesDialog, FormSaveFooter, ErrorBoundary. Fix imports
- [ ] **Step 4:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port shared components from tera-fe`

---

### Task 2.3: Build new shared components

**Files:**
- Create: `src/shared/components/PublicLayout/index.tsx`
- Create: `src/shared/components/SkeletonPage.tsx`
- Create: `src/shared/components/EmptyState.tsx`
- Create: `src/shared/components/AIBadge.tsx`
- Create: `src/shared/components/NextActionCard.tsx`
- Create: `src/shared/components/TooltipLabel/index.tsx`
- Create: `src/shared/components/TooltipLabel/glossary.ts`

- [ ] **Step 1:** Build `PublicLayout`: minimal centered card layout with logo + locale switcher. No sidebar, no auth. Used for `/login` and `/auth/callback`
- [ ] **Step 2:** Build `SkeletonPage` with variants: `dashboard` (3 card skeletons + stat bar), `form` (stepper + 5 input skeletons), `table` (header + 5 row skeletons), `cards` (3x2 card grid skeletons). Uses Mantine `Skeleton` component
- [ ] **Step 3:** Build `EmptyState`: icon + title + description + CTA button. Props: `icon`, `title`, `description`, `actionLabel`, `actionHref`
- [ ] **Step 4:** Build `AIBadge`: small badge showing "AI" with tooltip. Variants: `suggestion` (blue, "AI suggests: {value}"), `filled` (green, "AI filled from {source}"), `processing` (yellow, spinner). Props: `variant`, `label`, `onAccept?`, `onDismiss?`
- [ ] **Step 5:** Build `NextActionCard`: card with icon + title + description + link button. Used in dashboard for "Upload W-2", "Complete step 3", etc.
- [ ] **Step 6:** Build `TooltipLabel`: wraps a form label with an info icon that shows a tooltip with the mortgage term definition. `glossary.ts` contains definitions for: LTV, DTI, APR, ARM, QM, PMI, UFMIP, escrow, closing costs, pre-approval, underwriting
- [ ] **Step 7:** Commit: `feat: build new shared components (SkeletonPage, EmptyState, AIBadge, TooltipLabel)`

---

### Task 2.4: Build login and auth callback pages

**Files:**
- Create: `src/app/[locale]/(public)/layout.tsx` — wraps with PublicLayout
- Create: `src/app/[locale]/(public)/login/page.tsx`
- Create: `src/app/[locale]/(public)/auth/callback/page.tsx` — port from v1

- [ ] **Step 1:** Create `(public)/layout.tsx`: wraps children with `PublicLayout`
- [ ] **Step 2:** Build login page: LoanFactory logo, 3 value propositions ("Track your loan 24/7", "Upload documents easily", "See real-time rates"), "Login" button that constructs OAuth2 URL (port logic from v1 `login/page.tsx`), "Contact your LO" link at bottom
- [ ] **Step 3:** Port `auth/callback/page.tsx` from v1. Same logic: extract code from URL → `getToken(code)` → store cookies → redirect to `/dashboard` (was `/transaction` in v1)
- [ ] **Step 4:** Verify: login page renders, OAuth redirect URL is correct. Commit: `feat: build login and auth callback pages`

---

### Task 2.5: Build private layout shell

**Files:**
- Create: `src/app/[locale]/(private)/layout.tsx`

- [ ] **Step 1:** Create `(private)/layout.tsx`: wraps with `PrivateShell` (auth guard + AppShell). Server component checks `at` cookie — if missing, redirect to `/login`. If present, render `PrivateShell` with sidebar nav + header
- [ ] **Step 2:** Build chat widget in PrivateShell: port from v1 `MantineAppShell.tsx` lines 35-126. Fixed bottom-right position, unread count badge (polls `getUnreadConversationCount` every 2 minutes), glow animation when unread > 1, click → redirect to OAuth chat flow. Uses `chat.api.ts` from Task 3.1
- [ ] **Step 3:** Verify: accessing `/dashboard` without auth redirects to `/login`. With auth, shows AppShell layout with chat widget
- [ ] **Step 4:** Commit: `feat: build private layout with PrivateShell and chat widget`

---

## Epic 3: Port API Layer (Week 3)

### Task 3.1: Port borrower-svc APIs

**Files:**
- Create: `src/apis/borrower-svc/loan.api.ts`
- Create: `src/apis/borrower-svc/document.api.ts`
- Create: `src/apis/borrower-svc/workflow.api.ts`
- Create: `src/apis/borrower-svc/credit.api.ts`
- Create: `src/apis/borrower-svc/esign.api.ts`
- Create: `src/apis/borrower-svc/alert.api.ts`
- Create: `src/apis/borrower-svc/ai.api.ts`
- Create: `src/apis/borrower-svc/profile.api.ts`
- Create: `src/apis/borrower-svc/chat.api.ts`

- [ ] **Step 1:** Create `loan.api.ts`: port from v1 `private-api.ts` functions: `getListBorrowerLoan`, `getBorrowerLoanById`, `saveLoan`, `checkExistTransaction`. Wrap each in `useApiQuery`/`useApiMutation`. Export co-located `LOAN_QUERY_KEYS`
- [ ] **Step 2:** Create `document.api.ts`: port `getSupportDocumentList`, `getBorrowerTodos`, `uploadSupportFile` (use `useUploadMutation` for progress), `uploadMultiLoansSupportFile` (use `useUploadMutation`)
- [ ] **Step 3:** Create `workflow.api.ts`: port `getBorrowerLoanWorkflow`, `getBorrowerLoanHistory`, `getCDLoanWorkflow`
- [ ] **Step 4:** Create `credit.api.ts`: port `getCreditData`, `pullCreditReport`
- [ ] **Step 5:** Create `esign.api.ts`: port `checkAllowESign`, `getSigningSession`, `updateSigningSession`, `updateSigningHistory`
- [ ] **Step 6:** Create `alert.api.ts`: port `getMyAlerts`, `getAlerts`, `getMyRateAlertHistory`, `createAlert`, `updateAlert`, `deleteAlert`
- [ ] **Step 7:** Create `ai.api.ts`: port `uploadDocsFileToAIValidation` (use `useUploadMutation`), `getResultAIValidation`, `clearResultAIValidation`, `mapUploadedDocAIToTodo`, `feedBackAIValidation`, `getDataFromMosoAIOp`
- [ ] **Step 8:** Create `profile.api.ts`: port `getUserInfo`, `getListProfile`, `updateBorrowerInfo`, `updateBorrowerPassword`, `updateBorrowerEmail`, `updateBorrowerAvatar`, `updateBorrowerSSN`, `getUserSecurityOp`, `initSecretUserDataOp`, `update2StepAuthentication`, `userSendVerificationCode`, `userVerifyOTPCode`, `getUserQRCode`, `getAuditLoginLog`, `logout`
- [ ] **Step 9:** Create `chat.api.ts`: port `getUnreadConversationCount`
- [ ] **Step 10:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port borrower-svc API layer`

---

### Task 3.2: Port public-svc APIs

**Files:**
- Create: `src/apis/public-svc/quote.api.ts`
- Create: `src/apis/public-svc/config.api.ts`
- Create: `src/apis/public-svc/geo.api.ts`
- Create: `src/apis/public-svc/company.api.ts`
- Create: `src/apis/public-svc/external.api.ts`

- [ ] **Step 1:** Create `quote.api.ts`: port `getQMRates`, `getNonQMRates`, `shareQuote`, `copyLinkQuoteForm`, `questionQuote`, `generatePayment`, `generateClosingCostsFee`
- [ ] **Step 2:** Create `config.api.ts`: port `getQuoteConfiguration`, `getLoanTerms`, `getMediaTypes`, `getCountyLimit`, `getStatusModule`, `getLoanConfiguration`, `checkDiscountEligibility`, `getCorporateDiscountConfiguration`, `getLendersLicensedInStateOp`, `detectCensusTractForPurchaseLoanOp`
- [ ] **Step 3:** Create `geo.api.ts`: port `getZipCode`, `fetchLoanOfficers`, `fetchCompanyLoanStatistic`, `findOp`. Port `searchPropertyAddress` from v1 `otherApi.ts`
- [ ] **Step 4:** Create `company.api.ts`: port `fetchInfoCompany`
- [ ] **Step 5:** Create `external.api.ts`: port `getVisaTypes` (CDN fetch) and `getLoInfo` from v1 `otherApi.ts`
- [ ] **Step 6:** Verify: `npx tsc --noEmit` passes. Commit: `feat: port public-svc API layer`

---

## Epic 4: Page Implementation (Week 3-6)

### Task 4.1: Dashboard page

**Files:**
- Create: `src/app/[locale]/(private)/dashboard/page.tsx`
- Create: `src/app/[locale]/(private)/dashboard/_components/LoanCard.tsx`
- Create: `src/app/[locale]/(private)/dashboard/_components/NextActionBanner.tsx`
- Create: `src/app/[locale]/(private)/dashboard/_components/QuickStats.tsx`

- [ ] **Step 1:** Build `QuickStats`: 3-column stat bar (active loans count, closed loans count, total loan amount). Uses `useGetBorrowerLoans` query. Mantine `SimpleGrid` with `Paper` cards
- [ ] **Step 2:** Build `LoanCard`: displays loan purpose icon, property address, status badge, progress bar (% based on workflow steps completed), next action chip, "days since update", click → navigate to `/workflow?key=`. Uses Mantine `Card`
- [ ] **Step 3:** Build `NextActionBanner`: fetches `getBorrowerTodos()`, counts items with status "needs upload". Shows "You have X items to complete" with links. Mantine `Alert` component with warning color
- [ ] **Step 4:** Build dashboard `page.tsx`: SkeletonPage while loading → NextActionBanner + QuickStats + search input + LoanCard list + "New Application" button. EmptyState when no loans
- [ ] **Step 5:** Commit: `feat: build dashboard page`

---

### Task 4.2: Apply page

**Files:**
- Create: `src/app/[locale]/(private)/apply/page.tsx`
- Create: `src/app/[locale]/(private)/apply/_components/PurposeSelector.tsx`
- Create: `src/app/[locale]/(private)/apply/_components/MethodSelector.tsx`
- Create: `src/app/[locale]/(private)/apply/_components/AIUploadZone.tsx`

- [ ] **Step 1:** Build `PurposeSelector`: 3 cards (Purchase, Refinance, Cash-Out). On select → animate sub-options via Mantine `Collapse`. Purchase: Pre-approval / Accepted offer. Refinance: Lower rate / Cash out
- [ ] **Step 2:** Build `MethodSelector`: 3 cards (AI Assisted, Manual, Copy Previous — conditional). Copy Previous only shown if user has closed loans (from `useActiveProspect`)
- [ ] **Step 3:** Build `AIUploadZone`: DropZone component + file list with status (waiting/uploading/success/failed) + terms checkbox. Port upload logic from v1 `AIMethod.tsx`. Uses `useUploadMutation` for progress
- [ ] **Step 4:** Build `page.tsx`: single page with progressive disclosure. State machine: purpose → subPurpose → method → (if AI: upload zone) → "Start Application" button. Button calls `saveLoan` API → redirect to `/application?key={newKey}`
- [ ] **Step 5:** Commit: `feat: build apply page with progressive disclosure`

---

### Task 4.3: Application form — scaffold + stepper

**Files:**
- Create: `src/app/[locale]/(private)/application/page.tsx`
- Create: `src/app/[locale]/(private)/application/_components/ApplicationStepper.tsx`
- Create: `src/app/[locale]/(private)/application/_components/AutoSaveIndicator.tsx`
- Create: `src/app/[locale]/(private)/application/_components/AIFilledBadge.tsx`

- [ ] **Step 1:** Build `ApplicationStepper`: Mantine `Stepper` horizontal, 5 steps. Props: `activeStep`, `stepStatuses: ('complete' | 'error' | 'pending')[]`. Mobile: show only current step label + progress bar. Desktop: full labels
- [ ] **Step 2:** Build `AutoSaveIndicator`: shows "Saved" (green check) / "Saving..." (spinner) / "Unsaved changes" (yellow dot). Reads from `useDirtyFormRegistry`
- [ ] **Step 3:** Build `AIFilledBadge`: small inline badge next to a field label. Shows "AI" with source tooltip. Wraps `AIBadge` with field-specific context
- [ ] **Step 4:** Build `page.tsx` scaffold: reads `?key=` param, fetches loan via `useGetBorrowerLoan(key)`. Renders header (loan purpose + address), tab bar (Application | Rate Alert | LO Contacts), stepper, step content area (placeholder), AutoSaveIndicator
- [ ] **Step 5:** Commit: `feat: scaffold application form with stepper`

---

### Task 4.4: Application Step 1 — Property & Loan

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/PropertyInfo/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/PropertyInfo/schema.ts`

- [ ] **Step 1:** Create Zod schema in `schema.ts`: address (required), city (required), state (required), zip (5 digits), county (optional), propertyType (required), occupancy (required), homeValue (optional number), numberOfUnits (optional, default 1), loanAmount (required, min 10000), loanType (required), loanPurpose (required auto-filled from apply selection)
- [ ] **Step 2:** Build `index.tsx`: `FormProvider` + `DirtyFormProvider` + `useServerForm` wrapping 2 `CollapsibleFormSection`s: "Property Information" (AddressAutocompleteField, SelectField for property type/occupancy, NumberInputField for home value) and "Loan Details" (NumberInputField for loan amount, SelectField for loan type, auto-filled loan purpose). `FormSaveFooter` with Next button
- [ ] **Step 3:** Wire `useServerForm` to `saveLoan` mutation for auto-save. Wire `useZipCode` for county auto-fill
- [ ] **Step 4:** Commit: `feat: build application step 1 — Property & Loan`

---

### Task 4.5: Application Step 2 — Borrower Info

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/BorrowerInfo/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/BorrowerInfo/schema.ts`

- [ ] **Step 1:** Create Zod schema: firstName (required), middleName (optional), lastName (required), dob (required date), phone (required), email (required email), citizenship (required, default "US Citizen"). Address fields: street, city, state, zip. Previous addresses array (optional)
- [ ] **Step 2:** Build component: multi-borrower tabs (tab per borrower + "Add borrower" button). Per borrower: contact info section + current address (AddressFieldGroup) + previous addresses (CollapsibleFormSection, add/remove). NO SSN in this step
- [ ] **Step 3:** Wire to `useServerForm` + `DirtyFormProvider`. Smart default: citizenship = "US Citizen"
- [ ] **Step 4:** Commit: `feat: build application step 2 — Borrower Info`

---

### Task 4.6: Application Step 3 — Employment

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/Employment/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/Employment/schema.ts`

- [ ] **Step 1:** Create Zod schema: per borrower, array of employments. Each: status (required), employerName (conditional), jobTitle (conditional), yearsEmployed (conditional), monthlyIncome (conditional), employerPhone (conditional), employerAddress (conditional)
- [ ] **Step 2:** Build component: section per borrower (labeled). CrudCardStack pattern for multiple employments. SelectField for status → conditional fields based on status (Employed, Self-employed, Student, Retired, Unemployed)
- [ ] **Step 3:** Wire to `useServerForm` + auto-save. Add `BusinessAutocompleteField` for employer name (from tera-fe)
- [ ] **Step 4:** Commit: `feat: build application step 3 — Employment`

---

### Task 4.7: Application Step 4 — Finances (Assets + Liabilities + SSN)

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/AssetsLiabilities/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/AssetsLiabilities/schema.ts`
- Create: `src/app/[locale]/(private)/application/_sections/AssetsLiabilities/_components/ESignModal.tsx`

- [ ] **Step 1:** Create Zod schema: assets array (type, value, monthlyIncome), ssn (conditional), creditAuthorized (boolean)
- [ ] **Step 2:** Build Assets section: CrudCardStack for non-real-estate assets + properties owned. SelectField for type, NumberInputField for values
- [ ] **Step 3:** Build Liabilities section: SSN input (InputMaskField) + "Authorize Credit" button. On authorize → ESignModal → `pullCreditReport` API. After credit pull, display liabilities from credit report. Fallback: "Enter manually" link for manual liability entry
- [ ] **Step 4:** Build `ESignModal`: port e-sign flow from v1. `checkAllowESign` → `getSigningSession` → iframe/redirect → `updateSigningHistory`
- [ ] **Step 5:** Wire to `useServerForm`. SSN positioned here (step 4) — user has invested time by now
- [ ] **Step 6:** Commit: `feat: build application step 4 — Finances with SSN and credit`

---

### Task 4.8: Application Step 5 — Review & Submit

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/ReviewSubmit/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/ReviewSubmit/schema.ts`

- [ ] **Step 1:** Build Documents section: inline UploadZone + document requirement list. Port from v1 `getBorrowerTodos` → display as cards with status badges
- [ ] **Step 2:** Build Demographics section: CollapsibleFormSection (collapsed by default, badge "Optional"). Ethnicity, Race, Gender selects
- [ ] **Step 3:** Build Review Summary: read-only display of all form data. Property, Loan, Borrower(s), Employment. Each section has "Edit" link → navigates to corresponding step
- [ ] **Step 4:** Build Submit button: validates all 5 steps, shows validation issues if any, calls `saveLoan` with final status
- [ ] **Step 5:** Commit: `feat: build application step 5 — Review & Submit`

---

### Task 4.9: Application tabs — Rate Alert + Loan Officers

**Files:**
- Create: `src/app/[locale]/(private)/application/_sections/RateAlert/index.tsx`
- Create: `src/app/[locale]/(private)/application/_sections/LoanOfficers/index.tsx`

- [ ] **Step 1:** Port Rate Alert section from v1. Modal form for creating/viewing rate alerts for this loan
- [ ] **Step 2:** Port Loan Officers section from v1. Display assigned LO contact info (phone, email, address). Quick call/email buttons
- [ ] **Step 3:** Commit: `feat: build application Rate Alert and LO tabs`

---

### Task 4.10: Documents page

**Files:**
- Create: `src/app/[locale]/(private)/documents/page.tsx`
- Create: `src/app/[locale]/(private)/documents/_components/DocumentCard.tsx`
- Create: `src/app/[locale]/(private)/documents/_components/UploadZone.tsx`
- Create: `src/app/[locale]/(private)/documents/_components/AIValidationBadge.tsx`
- Create: `src/app/[locale]/(private)/documents/_components/UrgencyIndicator.tsx`

- [ ] **Step 1:** Build `UrgencyIndicator`: badge with "Urgent" (red) / "Normal" (gray). Based on document metadata
- [ ] **Step 2:** Build `AIValidationBadge`: shows "AI Cleared" (green), "Review Required" (red), "Processing" (blue spinner). Port AI validation display from v1 My Todo
- [ ] **Step 3:** Build `UploadZone`: inline drag-and-drop per document card. Uses `useUploadMutation` with progress bar. Port from v1 `ButtonUpload` but as drop zone instead of button
- [ ] **Step 4:** Build `DocumentCard`: description + UrgencyIndicator + UploadZone + uploaded files list + AIValidationBadge. Mantine Card component
- [ ] **Step 5:** Build `page.tsx`: fetch `getBorrowerTodos()`. Group documents by status: "Needs Upload" / "AI Processing" / "Completed". Render DocumentCard list per group. SkeletonPage while loading
- [ ] **Step 6:** Commit: `feat: build documents page with card layout and status groups`

---

### Task 4.11: Workflow page

**Files:**
- Create: `src/app/[locale]/(private)/workflow/page.tsx`
- Create: `src/app/[locale]/(private)/workflow/_components/MilestoneTimeline.tsx`
- Create: `src/app/[locale]/(private)/workflow/_components/LoanDetailCard.tsx`
- Create: `src/app/[locale]/(private)/workflow/_components/StatusSummary.tsx`

- [ ] **Step 1:** Build `MilestoneTimeline`: Mantine `Timeline` component. Port milestone data from v1 `getBorrowerLoanWorkflow`. Parent/child task grouping. Completed steps get green icons, active = blue, pending = gray
- [ ] **Step 2:** Build `LoanDetailCard`: read-only display of loan details. Port from v1 workflow Loan Details tab
- [ ] **Step 3:** Build `StatusSummary`: AI-ready placeholder. Phase 1: template-based message from `task_pattern`. "Your application is in underwriting. This typically takes 2-3 business days."
- [ ] **Step 4:** Build `page.tsx`: tabs (Loan Status | Loan Details | Rate Alert | LO Contacts). Loan Status = StatusSummary + MilestoneTimeline. Other tabs reuse components from application form
- [ ] **Step 5:** Commit: `feat: build workflow page with milestone timeline`

---

### Task 4.12: Rates pages (QM + Non-QM)

**Files:**
- Create: `src/app/[locale]/(private)/rates/page.tsx`
- Create: `src/app/[locale]/(private)/rates/qm/page.tsx`
- Create: `src/app/[locale]/(private)/rates/non-qm/page.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/QuickQuoteForm.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/DetailedQuoteForm.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/RateTable.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/RateCard.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/CompareDrawer.tsx`
- Create: `src/app/[locale]/(private)/rates/_components/ShareQuoteModal.tsx`

- [ ] **Step 1:** Build `QuickQuoteForm`: 3 fields (zip, loan amount, credit score dropdown) + "Get Rates" button. Calls `getQMRates` or `getNonQMRates` with minimal params
- [ ] **Step 2:** Build `DetailedQuoteForm`: full form (port from v1 quote form). Hidden by default, shown via "Advanced options" toggle. All v1 fields: property type, occupancy, loan type, lock period, etc.
- [ ] **Step 3:** Build `RateTable`: port v1 rate display (grouped by interest rate, expandable rows). Add checkbox per rate row for compare feature. Highlight best rate row
- [ ] **Step 4:** Build `RateCard`: mobile-friendly card version of rate row
- [ ] **Step 5:** Build `CompareDrawer`: Mantine Drawer, shows side-by-side comparison of 2-3 selected rates. Columns: Rate, APR, Monthly Payment, Total Interest, Closing Cost. Uses `useQuoteStore.compareList`
- [ ] **Step 6:** Build `ShareQuoteModal`: port from v1 (recipient name, emails, phone, share link)
- [ ] **Step 7:** Build `rates/page.tsx`: redirects to `/rates/qm`. Build `qm/page.tsx` and `non-qm/page.tsx`: tab navigation + QuickQuoteForm (default) + results + compare button
- [ ] **Step 8:** Commit: `feat: build rates pages with quick quote and compare`

---

### Task 4.13: Rate Alerts page

**Files:**
- Create: `src/app/[locale]/(private)/rate-alerts/page.tsx`
- Create: `src/app/[locale]/(private)/rate-alerts/_components/AlertCard.tsx`
- Create: `src/app/[locale]/(private)/rate-alerts/_components/CreateAlertModal.tsx`
- Create: `src/app/[locale]/(private)/rate-alerts/_components/AlertHistoryModal.tsx`

- [ ] **Step 1:** Build `AlertCard`: port from v1. Target rate, target vs current cost, loan details, frequency, notification method. Action buttons: Delete / View Live Rates / Request Update
- [ ] **Step 2:** Build `CreateAlertModal` and `AlertHistoryModal`: port from v1
- [ ] **Step 3:** Build `page.tsx`: "My Rate Alerts" title + "Create New" button + Grid of AlertCards. EmptyState when no alerts. SkeletonPage while loading
- [ ] **Step 4:** Commit: `feat: build rate alerts page`

---

### Task 4.14: Settings page

**Files:**
- Create: `src/app/[locale]/(private)/settings/page.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/ProfileForm.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/ChangeEmailForm.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/ChangePasswordForm.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/TwoFactorSetup.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/AuditLog.tsx`
- Create: `src/app/[locale]/(private)/settings/_components/NotificationPreferences.tsx`

- [ ] **Step 1:** Build `ProfileForm`: avatar upload + phone field (editable) + name fields (read-only) + email (read-only with "Change" link) + password (masked with "Change" link). Uses `useServerForm` + `DirtyFormProvider` for auto-save
- [ ] **Step 2:** Build `ChangeEmailForm` and `ChangePasswordForm`: port from v1 with Zod validation
- [ ] **Step 3:** Build `TwoFactorSetup`: port from v1. Toggle switch + method selection (Phone/Email/Authenticator) + QR code display + verification modal
- [ ] **Step 4:** Build `AuditLog`: DataTable with login history. Port from v1
- [ ] **Step 5:** Build `NotificationPreferences`: NEW. Checkboxes for notification types (loan status changes, document requests, rate alerts, chat messages) x methods (email, SMS, push)
- [ ] **Step 6:** Build `page.tsx`: 3 tabs (Profile | Security | Notifications). Tab content renders corresponding components
- [ ] **Step 7:** Commit: `feat: build settings page with 3 tabs`

---

## Epic 5: AI Hooks + Polish (Week 6-8)

### Task 5.1: Implement AI hook interfaces

**Files:**
- Create: `src/hooks/ai/types.ts`
- Create: `src/hooks/ai/useAISuggestion.ts`
- Create: `src/hooks/ai/useAIDocumentProcessor.ts`
- Create: `src/hooks/ai/useAIFormPrefill.ts`
- Create: `src/hooks/ai/useAIValidation.ts`
- Create: `src/hooks/ai/useAIStatusSummary.ts`
- Test: `src/hooks/ai/__tests__/useAISuggestion.test.ts`
- Test: `src/hooks/ai/__tests__/useAIValidation.test.ts`

- [ ] **Step 1:** Create `types.ts`: shared AI types (`AISuggestion<T>`, `ProcessedDocument`, `PrefillField`, `ValidationIssue`, `StatusSummary`)
- [ ] **Step 2:** Write test for `useAISuggestion`: mock fetchSuggestion → returns suggestion → accept() applies to form → dismiss() hides
- [ ] **Step 3:** Implement `useAISuggestion`: generic hook with `enabled` flag, debounced trigger, loading state
- [ ] **Step 4:** Run test, verify pass
- [ ] **Step 5:** Implement `useAIDocumentProcessor`: wraps v1 APIs (`uploadDocsFileToAIValidation`, `getResultAIValidation`, `getDataFromMosoAIOp`). Returns `processedDocs`, `uploadAndProcess`, `acceptAll`/`acceptOne`/`rejectOne`
- [ ] **Step 6:** Implement `useAIFormPrefill`: reads from `getDataFromMosoAIOp` response, maps to form field paths, provides `applyAll`/`applyOne`/`getFieldSource`
- [ ] **Step 7:** Write test for `useAIValidation`: test county limit check, LTV calculation, DTI estimate
- [ ] **Step 8:** Implement `useAIValidation`: client-side rules using existing APIs (`getCountyLimit`). Returns `issues[]` with severity and suggestions
- [ ] **Step 9:** Run test, verify pass
- [ ] **Step 10:** Implement `useAIStatusSummary`: template mapping from `task_pattern` to pre-written messages. Returns `summary` with headline, detail, nextAction, estimatedDays
- [ ] **Step 11:** Commit: `feat: implement AI hook interfaces with Phase 1 fallbacks`

---

### Task 5.2: Wire AI hooks to pages

**Files:**
- Modify: `src/app/[locale]/(private)/application/_sections/PropertyInfo/index.tsx` — add useAISuggestion for home value
- Modify: `src/app/[locale]/(private)/application/_sections/ReviewSubmit/index.tsx` — add useAIValidation before submit
- Modify: `src/app/[locale]/(private)/application/page.tsx` — add useAIFormPrefill after AI upload
- Modify: `src/app/[locale]/(private)/workflow/_components/StatusSummary.tsx` — use useAIStatusSummary
- Modify: `src/app/[locale]/(private)/apply/_components/AIUploadZone.tsx` — use useAIDocumentProcessor

- [ ] **Step 1:** Wire `useAISuggestion` to PropertyInfo step: when address is filled, suggest home value from LFIQ property search. Show AIBadge next to home value field
- [ ] **Step 2:** Wire `useAIFormPrefill` to application page: after AI document upload completes, show "AI found data for X fields. Apply all?" preview. On confirm, apply to all steps
- [ ] **Step 3:** Wire `useAIValidation` to ReviewSubmit: before submit, validate county limits, LTV, DTI. Show issues list with severity badges
- [ ] **Step 4:** Wire `useAIStatusSummary` to StatusSummary component in workflow page
- [ ] **Step 5:** Wire `useAIDocumentProcessor` to AIUploadZone in apply page
- [ ] **Step 6:** Commit: `feat: wire AI hooks to application and workflow pages`

---

### Task 5.3: Responsive testing and polish

- [ ] **Step 1:** Test all pages at mobile breakpoint (< 768px). Fix any layout issues with Mantine responsive props
- [ ] **Step 2:** Verify ApplicationStepper shows correctly on mobile (current step only + progress bar)
- [ ] **Step 3:** Verify PrivateShell sidebar collapses on mobile
- [ ] **Step 4:** Verify DocumentCard UploadZone works on mobile
- [ ] **Step 5:** Verify QuickQuoteForm is usable on mobile
- [ ] **Step 6:** Add TooltipLabel to mortgage terms across all pages: LTV, DTI, APR, ARM, PMI in application form; closing costs in rates
- [ ] **Step 7:** Commit: `feat: responsive polish and tooltip glossary`

---

### Task 5.4: Unit tests for stores, hooks, utils

- [ ] **Step 1:** Write tests for `useAuthStore`: set/clear profile, persistence
- [ ] **Step 2:** Write tests for `useQuoteStore`: setRates, groupByLogo selector, bestPrice selector, addToCompare max 3
- [ ] **Step 3:** Write tests for `useActiveProspect`: mock API, verify active prospect detection logic
- [ ] **Step 4:** Write tests for utils: `common.ts` (cleanObjectDeep, currencyFormat, formatTimeAgo), `format.ts` (formatNumber), `schemaUtils.ts` (requiredString, optionalNumber)
- [ ] **Step 5:** Write tests for `useUploadMutation`: mock Axios, verify progress callback, verify cancel
- [ ] **Step 6:** Run full test suite: `npm test -- --coverage`. Verify coverage meets targets (stores 80%, hooks 70%, utils 90%)
- [ ] **Step 7:** Commit: `test: unit tests for stores, hooks, and utils`

---

### Task 5.5: i18n updates for new UI strings

- [ ] **Step 1:** Audit all new components for hardcoded English strings
- [ ] **Step 2:** Extract strings to `en.json` message file. Organize by page: `dashboard.*`, `apply.*`, `application.*`, `documents.*`, `workflow.*`, `rates.*`, `settings.*`, `common.*`
- [ ] **Step 3:** Create translation entries in `vi.json`, `es.json`, `zh.json`, `he.json` (placeholder translations or machine-translated — to be reviewed by translators)
- [ ] **Step 4:** Verify: all pages render without missing translation warnings
- [ ] **Step 5:** Commit: `feat: i18n strings for all v2 pages`

---

### Task 5.6: Playwright E2E tests

**Files:**
- Create: `e2e/login.spec.ts`
- Create: `e2e/apply.spec.ts`
- Create: `e2e/application.spec.ts`
- Create: `e2e/documents.spec.ts`
- Create: `e2e/rates.spec.ts`

- [ ] **Step 1:** Write `login.spec.ts`: navigate to `/dashboard` → redirected to `/login` → verify login page renders value propositions + login button → verify OAuth URL structure
- [ ] **Step 2:** Write `apply.spec.ts`: navigate to `/apply` → select Purchase → select Pre-approval → select Manual → click Start → verify redirect to `/application?key=`
- [ ] **Step 3:** Write `application.spec.ts`: navigate to `/application?key=test` → verify 5-step stepper renders → fill step 1 fields → verify auto-save indicator → navigate through steps → verify review summary in step 5
- [ ] **Step 4:** Write `documents.spec.ts`: navigate to `/documents` → verify status groups render → upload a file → verify progress indicator → verify status change
- [ ] **Step 5:** Write `rates.spec.ts`: navigate to `/rates/qm` → fill quick quote (3 fields) → submit → verify results table renders → select 2 rates → open compare drawer → verify comparison data
- [ ] **Step 6:** Run: `npx playwright test`. Fix any failures
- [ ] **Step 7:** Commit: `test: E2E tests for 5 critical flows`

---

### Task 5.7: Docker setup

**Files:**
- Create: `Dockerfile`
- Create: `Dockerfile.production`
- Create: `.dockerignore`

- [ ] **Step 1:** Create `Dockerfile` for development: Node 22 alpine, copy package files, install deps, copy source, expose port 3000. Reference: `tera-fe/Dockerfile`
- [ ] **Step 2:** Create `Dockerfile.production` multi-stage build: install → build (standalone) → production (node:22-alpine, copy standalone output only). Reference: `tera-fe/Dockerfile`
- [ ] **Step 3:** Create `.dockerignore`: node_modules, .next, .git, e2e, *.md, .env
- [ ] **Step 4:** Verify: `docker build -f Dockerfile.production -t borrower-portal-v2 .` succeeds
- [ ] **Step 5:** Commit: `feat: Docker setup for development and production`

---

### Task 5.8: Final build verification

- [ ] **Step 1:** Run `npm run build` — must succeed with 0 errors
- [ ] **Step 2:** Run `npx tsc --noEmit` — must pass
- [ ] **Step 3:** Run `npm run lint` — must pass
- [ ] **Step 4:** Run `npm test` — all tests pass, coverage meets targets
- [ ] **Step 5:** Manual smoke test: login → dashboard → apply → fill application (5 steps) → view documents → view workflow → check rates → view settings
- [ ] **Step 6:** Commit any remaining fixes. Final commit: `feat: lf-borrower-portal-v2 complete`
