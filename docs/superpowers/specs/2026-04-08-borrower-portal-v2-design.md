# Design Spec: LF Borrower Portal v2

> Modernized borrower portal — reusing v1 core logic with tera-fe patterns, redesigned UI/UX, improved flows, and AI-ready architecture.

## Context

**lf-borrower-portal** (v1) is a fully functional mortgage borrower portal for LoanFactory. It handles OAuth login, 1003 loan application, document management, rate quoting, and loan workflow tracking. Built with Next.js 15 + React 19 + Mantine 7 + Jotai + Joi.

**Problems identified** (from PRODUCT_ANALYSIS.md):
- 25% drop-off at form 1003 step 2 (SSN too early, no auto-save)
- 20% drop-off at document upload (no priority, confusing layout)
- No onboarding, no dashboard, no notification center
- Apply flow: 3 separate pages for 3 simple questions
- Loading: full-page spinner instead of skeleton screens
- State: Jotai atoms scattered, no persistence, no dirty form tracking
- AI: document extraction exists but auto-fill UX is poor

**tera-fe** is the sister project (LOS frontend for loan officers) with proven patterns: Zustand 5, Zod 4, Axios + TanStack Query, useServerForm, DirtyFormProvider, 27 reusable field components.

## Decision: Approach B — "Tera-Fe Blueprint"

New project `lf-borrower-portal-v2` using tera-fe folder structure and patterns. Port v1 API logic + types + constants. Write new UI for all 9 page groups. Align tech stack across both LoanFactory frontends.

## Tech Stack

| Layer | V1 | V2 | Reason |
|-------|----|----|--------|
| Framework | Next.js 15.3 | Next.js 15.5 | Latest stable |
| React | 19 | 19 | Same |
| UI Library | Mantine 7.13 | Mantine 8.3 | Align with tera-fe |
| State (global) | Jotai 2.12 | Zustand 5.0 | Persistence, simpler API, tera-fe aligned |
| State (server) | Manual fetch + Jotai | TanStack Query 5.90 | Caching, invalidation, staleTime |
| Forms | RHF 7.53 + Joi 17 | RHF 7.71 + Zod 4.3 | Tree-shakeable (13KB vs 170KB), z.infer |
| API client | Fetch + ApiConfig class | Axios 1.13 + interceptors | Auto token refresh, tera-fe pattern |
| Styling | Mantine + Tailwind 3.4 | Mantine 8 + Tailwind 3.4 | Same split: Mantine for components, Tailwind for layout |
| i18n | next-intl 4.0 (5 locales) | next-intl 4.8 (5 locales) | Same locales, latest version |
| Icons | Tabler 3.17 | Tabler 3.36 | Latest |
| Testing | None | Jest 30 + Playwright 1.58 | Tera-fe setup |

## Project Structure

```
lf-borrower-portal-v2/
src/
  app/[locale]/
    layout.tsx                          # Root: fonts, providers, metadata
    page.tsx                            # Redirect to /apply
    [...rest]/page.tsx                  # 404 catch-all
    (public)/
      login/page.tsx
      auth/callback/page.tsx
    (private)/
      layout.tsx                        # PrivateShell (auth guard + AppShell)
      dashboard/
        page.tsx
        _components/
          LoanCard.tsx
          NextActionBanner.tsx
          QuickStats.tsx
      apply/
        page.tsx                        # 1 page, progressive disclosure
        _components/
          PurposeSelector.tsx
          MethodSelector.tsx
          AIUploadZone.tsx
      application/
        page.tsx                        # ?key= param
        _sections/
          PropertyInfo/                 # Step 1: Subject Property + Loan Details
            index.tsx
            schema.ts
          BorrowerInfo/                 # Step 2: Contact + Address
            index.tsx
            schema.ts
          Employment/                   # Step 3: Employment & Income
            index.tsx
            schema.ts
          AssetsLiabilities/            # Step 4: Assets + Credit/Liabilities
            index.tsx
            schema.ts
          ReviewSubmit/                 # Step 5: Documents + Demographics + Review
            index.tsx
            schema.ts
          RateAlert/                    # Tab 2
          LoanOfficers/                 # Tab 3
        _components/
          ApplicationStepper.tsx        # Horizontal stepper (top)
          AutoSaveIndicator.tsx
          AIFilledBadge.tsx
      documents/
        page.tsx
        _components/
          DocumentCard.tsx
          UploadZone.tsx
          AIValidationBadge.tsx
          UrgencyIndicator.tsx
      workflow/
        page.tsx
        _components/
          MilestoneTimeline.tsx
          LoanDetailCard.tsx
          StatusSummary.tsx
      rates/
        page.tsx                        # Tabs: QM / Non-QM
        qm/page.tsx
        non-qm/page.tsx
        _components/
          QuickQuoteForm.tsx
          DetailedQuoteForm.tsx
          RateTable.tsx
          RateCard.tsx
          CompareDrawer.tsx
          ShareQuoteModal.tsx
      rate-alerts/
        page.tsx
        _components/
          AlertCard.tsx
          CreateAlertModal.tsx
          AlertHistoryModal.tsx
      settings/
        page.tsx                        # Tabs: Profile | Security | Notifications
        _components/
          ProfileForm.tsx
          ChangeEmailForm.tsx
          ChangePasswordForm.tsx
          TwoFactorSetup.tsx
          AuditLog.tsx
          NotificationPreferences.tsx

  apis/
    apiClient.ts                        # Axios singleton (from tera-fe)
    borrower-svc/
      loan.api.ts
      document.api.ts
      workflow.api.ts
      credit.api.ts
      esign.api.ts
      alert.api.ts
      ai.api.ts
      profile.api.ts
    public-svc/
      quote.api.ts
      config.api.ts
      geo.api.ts
      company.api.ts
    react-query/
      useApiQuery.ts
      useApiMutation.ts
      processStateInHook.ts
      queryKeys.ts

  store/
    useAuthStore.ts                     # Token, user profile (persisted)
    useApplicationStore.ts              # Active borrower, active tab
    useQuoteStore.ts                    # Quote config, rates, compare list
    useDirtyFormRegistry.ts             # From tera-fe
    useUIStore.ts                       # Sidebar, theme (persisted)

  hooks/
    useServerForm.ts                    # From tera-fe
    useServerSync.ts                    # From tera-fe
    useAutoSaveOnNavigate.ts            # From tera-fe
    useUnsavedChangesGuard.ts           # From tera-fe
    useToast.tsx
    useZipCode.tsx
    useActiveProspect.ts
    useGooglePlacesAutocomplete.ts
    useModal.tsx
    ai/
      useAISuggestion.ts
      useAIDocumentProcessor.ts
      useAIFormPrefill.ts
      useAIValidation.ts
      useAIStatusSummary.ts
      types.ts

  shared/
    types/                              # Port 100% from v1 (10 files)
      response-types.ts
      quote.ts
      1003-form.ts
      request-types.ts
      user.ts
      loan-officer.ts
      common.ts
      api-base.ts
      field.ts
      social.ts
    constants/                          # Port from v1, consolidated
      routes.ts
      loan.ts
      quote.ts
      form-options.ts
      notification.ts
      date-time.ts
      common.ts
    fields/                             # Port from tera-fe (27 components)
      TextInputField/
      SelectField/
      NumberInputField/
      InputMaskField/
      DateField/
      AddressAutocompleteField/
      AddressFieldGroup/
      YesNoButtonField/
      DropZoneField/
      DurationField/
      useDirtyIndicatorStyle.ts
      ... (17 more)
    components/
      PrivateShell/                     # From tera-fe
      DataTable/                        # From tera-fe
      dirty-form/                       # From tera-fe
      CollapsibleFormSection/           # From tera-fe
      SectionCard.tsx                   # From tera-fe
      ConfirmationDialog.tsx            # From tera-fe
      UnsavedChangesDialog.tsx          # From tera-fe
      FormSaveFooter/                   # From tera-fe
      ErrorBoundary.tsx                 # From tera-fe
      TooltipLabel/                     # NEW: mortgage term glossary tooltips
      EmptyState.tsx                    # NEW: reusable empty state with CTA
      SkeletonPage.tsx                  # NEW: skeleton loading (replaces LoaderLF)
      NextActionCard.tsx                # NEW: action prompt card
      AIBadge.tsx                       # NEW: AI suggestion/status indicator
    providers/
      AppProvider/                      # QueryClient + dayjs
      ThemeProvider/                    # Mantine 8 + custom theme
    utils/
      common.ts
      format.ts
      schemaUtils.ts                    # Zod helpers (from tera-fe)
      apiUtils.ts

  actions/
    cookies.ts                          # Port from v1
    token.ts                            # Port from v1

  configs/
    theme/
      themeConfigs.ts                   # Mantine 8 theme
      themeConfigVariables.ts

  i18n/
    routing.ts                          # 5 locales: en, vi, es, zh, he
    request.ts

  messages/                             # Port from v1
    en.json
    vi.json
    es.json
    zh.json
    he.json

  middleware.ts                         # Port from v1 (auth + i18n)
```

## Flow Improvements

### Apply: 3 pages to 1

**Before:** 3 separate pages (Purpose → Sub-purpose → Method), 3 page loads, fake progress bar showing 30%→60%→100% before form even starts.

**After:** 1 page with progressive disclosure. User selects purpose → sub-options animate in → method options animate in → single "Start" button. Uses Mantine Collapse/Transition for animations.

### Application Form: 8 steps to 5

| V1 Step | V2 Step | Change |
|---------|---------|--------|
| 1. Subject Property | Step 1: Property & Loan | Merged with Loan Details into 1 form |
| 2. Loan Details | (merged above) | |
| 3. Borrower Contact | Step 2: Borrower Info | Contact + Address + Relationship merged |
| 4. Borrower Relationship | (merged above) | SSN removed from this step |
| 5. Employment | Step 3: Employment | Same scope, add employer autocomplete |
| 6. Assets | Step 4: Finances | Assets + Liabilities merged |
| 7. Liabilities | (merged above) | SSN + credit auth moved here (step 4) |
| 8. Demographics | Step 5: Review & Submit | Demographics = optional accordion |
| (separate) Needed Documents | (merged into step 5) | Upload inline, not separate step |

**Key changes:**
- SSN moved from step 2 to step 4 (user has invested time, trusts platform more)
- Demographics collapsed into optional section (not a mandatory step)
- Documents merged into Review step (eliminates duplicate upload locations)
- Stepper moved from LEFT sidebar to TOP horizontal bar
- Every step uses DirtyFormProvider + useServerForm for auto-save
- AutoSaveIndicator shows "Saved" / "Saving..." in form header

### Dashboard (replaces /transaction)

New dashboard with:
- NextActionBanner: "You have 3 items to complete" with links
- QuickStats: active loans, closed loans, total amount
- LoanCards with progress bar + next action chip + search/filter
- EmptyState with guided CTA when no loans exist

### Documents (replaces /my-todo)

Card layout grouped by status:
- "Needs Upload" (with urgency indicators: urgent/normal)
- "AI Processing" (with spinner)
- "Completed" (with AI Cleared badge)

Each DocumentCard has inline UploadZone (drag & drop) instead of separate upload button per row.

### Rates (replaces /quote)

Two modes:
- QuickQuoteForm: 3 fields (zip, loan amount, credit score range) for instant results
- DetailedQuoteForm: full form (opt-in via "Advanced options" toggle)

New CompareDrawer: select 2-3 rates via checkboxes → slide-out drawer with side-by-side comparison.

### Settings (replaces /profile + /password-and-security)

Single route with 3 tabs:
- Profile: name, phone, avatar (with useServerForm auto-save)
- Security: password change, 2FA setup, audit log
- Notifications (NEW): granular control over notification types and methods

### Login

Added value propositions before the login button. Context for what the portal offers. Auth callback logic unchanged.

## Architectural Decisions

### 1. Axios apiClient replaces fetch-based ApiConfig

Port tera-fe's Axios singleton with interceptors. Token injection happens once in interceptor, not per-request. 401 handling auto-refreshes via interceptor chain. All 42 API functions wrapped in TanStack Query hooks with centralized query keys.

### 2. Zustand stores replace Jotai atoms

5 stores replace 15+ atom files:

| Store | Persisted | Purpose |
|-------|-----------|---------|
| useAuthStore | Yes | Token, profile, role checks |
| useApplicationStore | No | Active borrower, active tab, pending navigation |
| useQuoteStore | No | Quote config, rate data, compare list |
| useDirtyFormRegistry | No | Global dirty form registry (tera-fe) |
| useUIStore | Yes | Sidebar state, theme, preferences |

Quote state simplified: atomFamily pattern replaced with Record<string, data> keyed by loan program. Derived computations (groupByLogo, groupByLender, bestPrice) become Zustand selectors instead of derived atoms.

### 3. Zod replaces Joi for form validation

Schemas co-located with each form section (e.g., `PropertyInfo/schema.ts`). Uses `z.infer<typeof schema>` for type-safe form values. Zod helpers (`requiredString`, `optionalNumber`) ported from tera-fe's `schemaUtils.ts`. Bundle size reduction: 170KB (Joi) to 13KB (Zod).

### 4. Skeleton screens replace full-page spinner

`<SkeletonPage variant="dashboard|form|table|cards" />` replaces `<LoaderLF />`. Mantine Skeleton components show page layout immediately while data loads. Better perceived performance.

### 5. Horizontal stepper replaces left sidebar stepper

Application form stepper moves from left sidebar (200px width, hidden on mobile) to horizontal top bar (always visible, responsive). Each step shows icon: checkmark (complete), warning (has errors), circle (pending).

### 6. Locale-aware date format

Replace hardcoded `DD/MM/YYYY` with locale map: en=`MM/DD/YYYY`, vi=`DD/MM/YYYY`, zh=`YYYY/MM/DD`, etc.

### 7. DirtyFormProvider + useServerForm for all forms

Every form section in the application uses:
- `useServerForm`: auto-syncs with server data, handles save lifecycle
- `DirtyFormProvider`: registers with global dirty form registry, shows amber dirty indicators on changed fields, sticky save/undo bar, navigation guard on unsaved changes
- `AutoSaveIndicator`: debounced save every 30 seconds

This solves v1's biggest risk: form data loss on browser crash/token expiry.

## AI-Ready Architecture

5 hook interfaces prepared in `src/hooks/ai/`. Each has: trigger condition, TypeScript interface, and Phase 1 fallback (template-based or existing API).

### useAISuggestion
Generic hook for field-level AI suggestions. Phase 1: property value suggestion from LFIQ search API, county auto-fill from zip API (already exists). Phase 2+: plug in ML model.

### useAIDocumentProcessor
Wraps existing v1 APIs (`uploadDocsFileToAIValidation`, `getResultAIValidation`, `getDataFromMosoAIOp`). Phase 1: same logic, better UX (preview extracted data before applying). Phase 2+: smarter classification.

### useAIFormPrefill
Applies AI-extracted data to form fields via RHF `setValue`. Shows `AIFilledBadge` next to each pre-filled field. Phase 1: uses `getDataFromMosoAIOp` response directly.

### useAIValidation
Client-side business rule validation before submit. Phase 1: county limit check, LTV calculation, DTI estimate. Phase 2+: ML-based approval likelihood scoring.

### useAIStatusSummary
Natural language workflow status. Phase 1: template mapping from `workflow.task_pattern` to pre-written messages. Phase 2+: LLM-generated summaries.

**Key principle:** All hooks have `enabled` flag. Frontend code stays the same when backend upgrades from template-based to AI model.

## Component Reuse Inventory

### From tera-fe (copy directly)
- 27 field components (TextInputField, SelectField, NumberInputField, etc.)
- PrivateShell (auth guard + AppShell layout)
- DirtyFormProvider + AlertBar + FooterBar (dirty form system)
- DataTable (paginated table)
- CollapsibleFormSection, SectionCard, ConfirmationDialog
- FormSaveFooter, ErrorBoundary, UnsavedChangesDialog
- useServerForm, useServerSync, useAutoSaveOnNavigate
- useUnsavedChangesGuard, useGooglePlacesAutocomplete
- apiClient.ts, useApiQuery.ts, useApiMutation.ts
- schemaUtils.ts (Zod helpers)
- themeConfigs.ts (Mantine 8 theme)

### From v1 (port as-is)
- 10 type definition files (1,500+ lines)
- 26 constant files (consolidated to 7)
- middleware.ts (auth + i18n)
- actions/cookies.ts, actions/token.ts
- 5 locale message files
- 42 API function bodies (rewrapped in Axios + TanStack Query)

### New components
- SkeletonPage (skeleton loading variants)
- EmptyState (reusable empty state with icon + message + CTA)
- AIBadge (AI suggestion/filled indicator)
- NextActionCard (action prompt for dashboard)
- TooltipLabel (mortgage term glossary tooltips)
- AutoSaveIndicator ("Saved" / "Saving..." badge)
- QuickQuoteForm (3-field simplified quote)
- CompareDrawer (side-by-side rate comparison)
- UrgencyIndicator (document deadline priority)
- StatusSummary (AI-ready workflow summary)
- ApplicationStepper (horizontal top stepper)
- PurposeSelector, MethodSelector (apply flow progressive disclosure)

## Migration Guide: V1 to V2

### Phase 1: Setup + Core (Week 1-2)
1. `create-next-app` with Next.js 15.5 + TypeScript
2. Install dependencies (Mantine 8, Zustand 5, TanStack Query 5, Zod 4, Axios, next-intl 4.8)
3. Copy tera-fe infrastructure: apiClient, react-query hooks, providers, theme
4. Port v1: types/, constants/ (consolidate), actions/, middleware.ts, i18n/, messages/
5. Setup Zustand stores (useAuthStore, useUIStore)
6. Configure tsconfig paths, tailwind, jest, eslint

### Phase 2: Shared UI (Week 2-3)
7. Copy tera-fe field components (27 fields)
8. Copy tera-fe shared components (PrivateShell, dirty-form, DataTable, etc.)
9. Build new shared components (SkeletonPage, EmptyState, AIBadge, TooltipLabel)
10. Setup layout: PrivateShell + sidebar nav + header
11. Build login page + auth callback

### Phase 3: Page Implementation (Week 3-6)
12. Port API functions to domain-based files (borrower-svc/, public-svc/)
13. Build dashboard (NextActionBanner, QuickStats, LoanCard)
14. Build apply page (progressive disclosure, AI upload zone)
15. Build application form (5 steps with DirtyFormProvider + useServerForm)
16. Build documents page (card layout, grouped by status)
17. Build workflow page (milestone timeline, status summary)
18. Build rates pages (QuickQuoteForm + DetailedQuoteForm + CompareDrawer)
19. Build rate-alerts page
20. Build settings page (3 tabs)

### Phase 4: Polish + AI Hooks (Week 6-8)
21. Implement AI hook interfaces (useAISuggestion, useAIDocumentProcessor, etc.)
22. Wire AI hooks to existing v1 APIs (Phase 1 fallbacks)
23. Add AutoSaveIndicator to all forms
24. Add TooltipLabel to mortgage terms across app
25. Responsive testing (mobile breakpoints)
26. i18n: update all 5 locale files for new UI strings
27. Jest unit tests for stores, hooks, utils
28. Playwright e2e tests for critical flows (login, apply, application form)

## Execution Phases Summary

| Phase | Duration | Scope | Output |
|-------|----------|-------|--------|
| 1. Setup + Core | 2 weeks | Infrastructure, ports, stores | App boots, auth works |
| 2. Shared UI | 1-2 weeks | Fields, components, layout | Design system ready |
| 3. Pages | 3-4 weeks | All 9 page groups | Feature complete |
| 4. Polish + AI | 2 weeks | AI hooks, auto-save, tests | Production ready |

**Total: 8-10 weeks estimated.**
