# Tasks: Homeowners V2 Report Create/Update Redesign

## 1. Foundation — Smart Defaults Utility

- [ ] 1.1 [frontend] [haiku] Create `loanTypeDefaults.ts` smart defaults utility
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_utils/loanTypeDefaults.ts`
  - Implement `LOAN_TYPE_DEFAULTS` map: `Record<string, { term?: string; rateRange?: string }>`
  - Cover all loan types from `src/shared/types/loan.ts` `LOAN_TYPE_KEYS`
  - Export `getLoanTypeDefaults(loanTypeCode: string | null): LoanTypeDefault | null`
  - Include rate ranges: Conventional ~6.5-7.5%, FHA ~6.0-7.0%, VA ~5.5-6.5%, Jumbo ~7.0-8.0%, HELOC term=15 (no rate range)
  - Types without reliable defaults (Non_QM, Commercial, private_loan, etc.) return `null`
  - **Acceptance**: Function returns correct defaults for all mapped loan types, returns null for unmapped types, zero type errors

## 2. Step 1 — AddressSearch Section

- [ ] 2.1 [frontend] [sonnet] Create `AddressSearch.tsx` section component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/AddressSearch.tsx`
  - Port from v1 `AddressForm` (`homeowners/create/_sections/AddressForm/index.tsx`)
  - **Remove** all manual-entry detection:
    - Remove `isSelectedAddressFromGoogleMap` state and all references
    - Remove `lastGGValue` state and all references
    - Remove the `useEffect` that watches `streetAddress` to detect manual edits (v1 lines 60-65)
    - Remove conditional `body.street_number` (v1 line 77-79) — always include `street_number` in search body
    - Remove `setIsSelectedAddressFromGoogleMap(false)` and `setLastGGValue('')` calls from `handleAddressChange`, `handleConfirmSelectedAddress`, and `handleClearAddress`
  - **Keep** intact:
    - `GGMapInputField` for Google autocomplete
    - `handleAddressChange` address parsing (street_name, city, state, zip from Google data)
    - `searchProperty(body)` API call
    - Multi-result radio select with `Radio.Group` + `ScrollArea`
    - Auto-continue when single result (`onContinue()`)
    - Error alert for `address_not_found`
    - Clear handler (reset address form fields)
    - Zip code and subpremise text inputs
  - Props: `{ isLoading?: boolean; onContinue?: () => void }`
  - Use `useFormContext()` for form access
  - All strings via `useTranslations()`
  - Target ~250 lines
  - **Acceptance**: Address search works via Google autocomplete only. No manual-entry code paths exist. Multi-result radio select works. Single result auto-continues. `npm run build` passes.

## 3. Step 2 — PropertyDetails Section

- [ ] 3.1 [frontend] [sonnet] Create `HomeValueCard.tsx` sub-component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetailsCards/HomeValueCard.tsx`
  - Show `property.adjust_avm_value` (editable `NumberInputField`) and `property.adjust_estimated_equity` (display only)
  - Port edit/save/cancel logic from v1 Property: `handleStartEdit('homeValue')`, `handleSaveHomeValue` (calls `calculateAvmAndEstEquity`), `handleCancel('homeValue')`
  - Props: `{ mode: 'create' | 'edit'; isEditing: boolean; isUpdating: boolean; onStartEdit: () => void; onSave: () => void; onCancel: () => void }`
  - Use `Card withBorder radius="md"` with compact padding
  - Display: AVM value with `$` prefix, estimated equity with color coding (green positive, red negative)
  - Target ~120 lines
  - **Acceptance**: Home value displays correctly in view mode, becomes editable on edit click, save triggers recalculation API, cancel restores original values.

- [ ] 3.2 [frontend] [sonnet] Create `MortgageCard.tsx` sub-component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetailsCards/MortgageCard.tsx`
  - Show only the primary mortgage fields in a 4-column grid (responsive: 2-col on mobile, 4-col on desktop)
  - Fields: `loan_type_code` (Select), `loan_date` (DateInput), `loan_amount` (Number), `interest_rate` (Number), `loan_term` (Select from `LOAN_TERM`), `monthly_payment` (Number, read-only), `loan_balance` (Number, read-only), `purpose_code` (Select)
  - **Smart defaults integration**: Watch `loan_type_code` field. On change, call `getLoanTypeDefaults()`. If term is empty, auto-fill `loan_term`. If `rateRange` exists, show a `Badge` hint below the interest rate field.
  - Port `handleMortgageFieldBlur` logic: on blur of loan_amount/loan_date/interest_rate/loan_term, call `calculateAvmAndEstEquity` to recalculate monthly_payment, loan_balance, and equity.
  - Props: `{ primaryMortgageIndex: number; mode: 'create' | 'edit'; isEditing: boolean; isUpdating: boolean; onStartEdit: () => void; onSave: () => void; onCancel: () => void }`
  - **No** carousel, add/remove buttons, or multi-mortgage UI
  - Target ~180 lines
  - **Acceptance**: Only primary mortgage is shown. Smart defaults auto-fill term when loan type changes (does not overwrite existing term). Rate hint badge appears. Blur recalculation works. No carousel or add/remove mortgage UI exists.

- [ ] 3.3 [frontend] [haiku] Create `PropertyInfoCard.tsx` sub-component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetailsCards/PropertyInfoCard.tsx`
  - Fields: `living_square_feet`, `bedrooms`, `total_bathrooms` (editable Number), `year_built`, `sale_recording_date`, `sale_amount` (display-only)
  - Port edit/save/cancel: `handleSavePropertyDetails` calls `updateHomeEstimate` API when sq ft, beds, or baths change
  - Props: `{ mode: 'create' | 'edit'; isEditing: boolean; isUpdating: boolean; onStartEdit: () => void; onSave: () => void; onCancel: () => void }`
  - Compact 2-column grid layout
  - Target ~120 lines
  - **Acceptance**: Property details display correctly, editable fields trigger AVM recalculation on save, cancel restores originals.

- [ ] 3.4 [frontend] [haiku] Create `CreditRatingCard.tsx` sub-component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetailsCards/CreditRatingCard.tsx`
  - Single `SelectField` for `owner.credit_rating` using `CREDIT_SCORE_TYPES` from `@constants/credit-types`
  - Edit/save/cancel pattern (same as other cards)
  - Props: `{ mode: 'create' | 'edit'; isEditing: boolean; onStartEdit: () => void; onSave: () => void; onCancel: () => void }`
  - Target ~80 lines
  - **Acceptance**: Credit rating can be viewed and edited. Save/cancel works.

- [ ] 3.5 [frontend] [sonnet] Create `AgentCard.tsx` sub-component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetailsCards/AgentCard.tsx`
  - Port referral partner logic from v1 Property:
    - `ReferralPartnerSelectField` component
    - `onReferralPartnerChange` handler (manages `related_user_keys` and `related_users`)
    - Auto-select realtor by state logic (from `useEffect` watching `address.state`)
    - Default realtor from profile logic
    - `displayReferralPartnerLabel()` function
  - Edit/save/cancel pattern
  - Props: `{ mode: 'create' | 'edit'; isEditing: boolean; isLoading: boolean; onStartEdit: () => void; onSave: () => void; onCancel: () => void }`
  - Target ~150 lines
  - **Acceptance**: Referral partner selection works. Auto-realtor-by-state works. Default realtor from profile applied in create mode. Edit/save/cancel works.

- [ ] 3.6 [frontend] [opus] Create `PropertyDetails.tsx` orchestrating section
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/PropertyDetails.tsx`
  - Orchestrates all sub-cards: `HomeValueCard`, `MortgageCard`, `PropertyInfoCard`, `CreditRatingCard`, `AgentCard`
  - **Layout**: Two-column grid (desktop), single-column (mobile)
    - Row 1: Property image (left) + HomeValueCard (right)
    - Row 2: MortgageCard (full width)
    - Row 3: PropertyInfoCard (left) + CreditRatingCard + AgentCard (right)
  - Manages all edit/save/cancel state machines for each section (6 boolean pairs)
  - Manages `originalValues` and `originalMortgageValues` for cancel/restore
  - Find primary mortgage index on mount: `position_mortgages.findIndex(m => m?.primary === true)` with fallback to 0
  - `onContinue` prop for step navigation
  - Fetch `quoteConfiguration` on mount (existing Jotai atom)
  - Set `related_user_keys` on mount based on `userProfile` (existing logic from v1)
  - Preview button calls `previewReport`
  - Props: `{ onContinue: () => void; mode?: 'create' | 'edit' }`
  - Target ~500 lines (complex orchestration warrants a larger file, but logic is distributed to sub-cards)
  - **Acceptance**: All sub-cards render. Primary mortgage found and displayed. Edit/save/cancel works for each section independently. Preview works. Continue navigates to step 3. Both create and edit modes work. No carousel or add/remove mortgage UI. Layout is compact (less vertical scrolling than v1).

## 4. Step 3 — ContactInfo Section

- [ ] 4.1 [frontend] [sonnet] Create `ContactInfo.tsx` section component
  - **Create**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/sections/ContactInfo.tsx`
  - Port from v1 `Contact` (`homeowners/create/_sections/Contact/index.tsx`)
  - **Change**: Replace "Add co-borrower" button with a visually prominent dashed-border Card prompt:
    - Full-width `Card withBorder` with `border-dashed border-2 border-gray-300 hover:border-orange-400`
    - Centered `IconUserPlus` (size 32) + translated label + description text
    - Entire card is clickable (`onClick={appendCoBorrower}`)
  - **Keep** intact:
    - `useFieldArray` for `customers` array
    - Email verification flow: `verifyCoBorrowerEmail` (calls `validateUserEmail('co-homeowners', ...)`)
    - `verifiedCoBorrowerEmails` state tracking
    - Auto-fill name/phone from verified email
    - Ensure default homeowner on mount (`ensuredDefaultHomeownerRef`)
    - Edit mode: seed verified emails from existing data
    - `syncPrimaryContactFromFirstCustomer` on submit
    - `createReportBody` + `createReport` / `updateReport` API calls
    - Preview report + preview email buttons
    - Report existing error handling (`isReportExistingError`)
    - Remove co-borrower (`remove(index)`) with `IconTrash` on non-first entries
  - Props: `{ mode: 'create' | 'edit'; reportId?: string }`
  - All strings via `useTranslations()`
  - Target ~400 lines
  - **Acceptance**: Homeowner cards render with email, phone, first/last name. "Add co-borrower" is a visually prominent dashed-border card. Email verification works on blur. Submit creates/updates report. Preview works. Edit mode pre-fills data.

## 5. Integration — Wire Up ReportForm

- [ ] 5.1 [frontend] [sonnet] Update `ReportForm/index.tsx` to use new v2 sections
  - **Modify**: `/lf-iq/src/app/[locale]/(private)/homeowners-v2/_components/ReportForm/index.tsx`
  - **Replace imports** (lines 16-18):
    - `import AddressForm from '../../../homeowners/create/_sections/AddressForm'` -> `import AddressSearch from './sections/AddressSearch'`
    - `import Property from '../../../homeowners/create/_sections/Property'` -> `import PropertyDetails from './sections/PropertyDetails'`
    - `import Contact from '../../../homeowners/create/_sections/Contact'` -> `import ContactInfo from './sections/ContactInfo'`
  - **Update** `steps` array:
    - Step 0: `component: AddressSearch`
    - Step 1: `component: PropertyDetails`
    - Step 2: `component: ContactInfo`
  - **Update** `renderStepContent()`:
    - Case 0: `<AddressSearch isLoading={loading.submitAddress} onContinue={nextStep} />`
    - Case 1: `<PropertyDetails onContinue={nextStep} mode={mode} />`
    - Case 2: `<ContactInfo mode={mode} reportId={reportId} />`
  - **Remove** `console.log('>>> ReportForm errors', errors)` (line 77)
  - No other changes to ReportForm — stepper UI, step navigation, form initialization, and edit-mode fetch remain the same
  - **Acceptance**: ReportForm imports zero components from `homeowners/create/_sections/`. All three steps render the new v2 sections. Create mode flows: address -> property -> contact -> submit. Edit mode flows: property (step 1) -> contact -> submit. `npm run build` passes with zero type errors.

## 6. Verification

- [ ] 6.1 [frontend] [sonnet] Full build and smoke test
  - Run `npm run build` in lf-iq — must pass with zero errors
  - Run `npm run lint` — must pass
  - Verify no imports from `homeowners/create/_sections/` remain in `homeowners-v2/` directory (grep check)
  - Verify no `console.log` statements in new files
  - Verify all new files use `useTranslations()` for strings (no hardcoded English)
  - **Acceptance**: Build passes. Lint passes. No v1 imports. No console.log. No hardcoded strings.

---

## Dependency Graph

```
1.1 (loanTypeDefaults)
 │
 ├─> 3.2 (MortgageCard — uses smart defaults)
 │
2.1 (AddressSearch) ─────────────────────────────────────┐
3.1 (HomeValueCard) ──┐                                  │
3.2 (MortgageCard)  ──┤                                  │
3.3 (PropertyInfoCard)┤                                  │
3.4 (CreditRatingCard)┼──> 3.6 (PropertyDetails) ───────>├──> 5.1 (ReportForm) ──> 6.1 (Verify)
3.5 (AgentCard) ──────┘                                  │
4.1 (ContactInfo) ───────────────────────────────────────┘
```

**Parallelizable groups:**
- Group A (parallel): 1.1, 2.1, 3.1, 3.3, 3.4, 4.1
- Group B (after 1.1): 3.2
- Group C (after 3.5): 3.5 (can run parallel with Group A but needs same form context understanding)
- Group D (after 3.1-3.5): 3.6
- Group E (after 2.1, 3.6, 4.1): 5.1
- Group F (after 5.1): 6.1
