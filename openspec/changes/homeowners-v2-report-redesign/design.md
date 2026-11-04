# Design: Homeowners V2 Report Create/Update Redesign

## Architecture Overview

### New File Tree

```
homeowners-v2/
├── _components/
│   └── ReportForm/
│       ├── index.tsx                    (MODIFY — rewire imports to new sections)
│       └── sections/
│           ├── AddressSearch.tsx         (NEW — ~250 lines)
│           ├── PropertyDetails.tsx       (NEW — ~500 lines)
│           ├── ContactInfo.tsx           (NEW — ~400 lines)
│           └── PropertyDetailsCards/
│               ├── HomeValueCard.tsx     (NEW — ~120 lines)
│               ├── MortgageCard.tsx      (NEW — ~180 lines)
│               ├── PropertyInfoCard.tsx  (NEW — ~120 lines)
│               ├── CreditRatingCard.tsx  (NEW — ~80 lines)
│               └── AgentCard.tsx         (NEW — ~150 lines)
├── _utils/
│   ├── schema.ts                        (KEEP — no changes needed)
│   ├── helpers.ts                       (KEEP — no changes needed)
│   └── loanTypeDefaults.ts             (NEW — smart defaults map)
```

### Component Hierarchy

```
ReportForm (index.tsx)
├── FormProvider (react-hook-form)
├── StepIndicator (existing stepper UI — unchanged)
├── Step 0: AddressSearch
│   ├── GGMapInputField
│   ├── TextInputField (zip_code)
│   ├── TextInputField (subpremise)
│   ├── Button (Look Up Address)
│   └── RadioSelectModal (multi-result)
├── Step 1: PropertyDetails
│   ├── PropertyImage (existing SeoImage)
│   ├── HomeValueCard
│   │   ├── NumberInputField (adjust_avm_value)
│   │   └── Display (adjust_estimated_equity)
│   ├── MortgageCard (primary only)
│   │   ├── SelectField (loan_type_code) → triggers smart defaults
│   │   ├── DateInputField (loan_date)
│   │   ├── NumberInputField (loan_amount)
│   │   ├── NumberInputField (interest_rate) + rate hint badge
│   │   ├── SelectField (loan_term)
│   │   ├── NumberInputField (monthly_payment) — read-only calculated
│   │   └── NumberInputField (loan_balance) — read-only calculated
│   ├── PropertyInfoCard
│   │   ├── NumberInputField (living_square_feet)
│   │   ├── NumberInputField (bedrooms)
│   │   ├── NumberInputField (total_bathrooms)
│   │   ├── Display (year_built)
│   │   └── Display (sale_recording_date, sale_amount)
│   ├── CreditRatingCard
│   │   └── SelectField (owner.credit_rating)
│   ├── AgentCard
│   │   └── ReferralPartnerSelectField (existing shared component)
│   └── Buttons (Preview, Continue)
└── Step 2: ContactInfo
    ├── HomeownerCards[] (useFieldArray)
    │   ├── TextInputField (email) + verify-on-blur
    │   ├── InputMaskField (phone)
    │   ├── TextInputField (first_name)
    │   └── TextInputField (last_name)
    ├── AddCoBorrowerPrompt (dashed-border card)
    └── Buttons (Preview Email, Preview Report, Submit)
```

---

## Step 1: AddressSearch

### What changes from v1 AddressForm

| Aspect | v1 (AddressForm) | v2 (AddressSearch) |
|--------|-------------------|--------------------|
| Manual entry detection | `isSelectedAddressFromGoogleMap` state + `lastGGValue` comparison (lines 52, 62-65, 192-197) | Removed entirely |
| `street_number` in API body | Conditionally included when `isSelectedAddressFromGoogleMap` is true (line 78) | Always included — Google is the only input method |
| Manual Entry UI toggle | Exists as dead code path | Removed |
| Clear handler | Resets `isSelectedAddressFromGoogleMap` and `lastGGValue` | Simplified — only resets form fields |

### Implementation Details

- Copy the core structure from v1 `AddressForm` but strip:
  - `isSelectedAddressFromGoogleMap` state variable
  - `lastGGValue` state variable
  - The `useEffect` that watches `streetAddress` to detect manual edits (lines 60-65)
  - The conditional `body.street_number` assignment (lines 77-79)
  - The `isSelectedAddressFromGoogleMap`/`lastGGValue` resets in `handleAddressChange` and `handleClearAddress`
- Always include `street_number` in the search body (user always enters via Google autocomplete).
- Keep: `GGMapInputField`, `handleAddressChange` address parsing, `searchProperty` API call, multi-result `Radio.Group` with `ScrollArea`, auto-continue on single result.
- Props: `{ isLoading?: boolean; onContinue?: () => void }`

---

## Step 2: PropertyDetails

### Compact Layout Strategy

The v1 Property section uses an 800+ line monolith with carousel for mortgages, multiple edit/save/cancel state machines, and spread-out cards. The v2 redesign consolidates this into:

**Two-column grid** (desktop), single-column (mobile):

```
┌─────────────────────────┬─────────────────────────┐
│   Property Image        │   Home Value Card        │
│   (AspectRatio)         │   - AVM Value (editable) │
│                         │   - Est. Equity (display) │
├─────────────────────────┴─────────────────────────┤
│   Primary Mortgage Card (full-width)               │
│   ┌──────────┬──────────┬──────────┬──────────┐   │
│   │Loan Type │Loan Date │Amount    │Rate + hint│   │
│   ├──────────┼──────────┼──────────┼──────────┤   │
│   │Term      │Monthly   │Balance   │Purpose   │   │
│   └──────────┴──────────┴──────────┴──────────┘   │
├─────────────────────────┬─────────────────────────┤
│   Property Info Card    │   Credit & Agent Card    │
│   - Sq Ft, Beds, Baths  │   - Credit Rating        │
│   - Year Built           │   - Referral Partner     │
│   - Sale Date, Amount    │                          │
└─────────────────────────┴─────────────────────────┘
```

### Primary Mortgage Only

- On component mount, find the mortgage in `position_mortgages` where `primary === true`. Store its index.
- If no primary exists, use index 0 (backward compat with data that has a single mortgage without the flag).
- All form field paths use `position_mortgages.{primaryIndex}.field_name`.
- No `useFieldArray` for mortgages — just direct field access to the single primary mortgage.
- Remove: `Carousel`, `AddLoanModal`, `handleAddLoan`, `handleDeleteMortgage`, `IconTrash` per-mortgage, "Add Loan" button.

### Smart Defaults

New utility file: `homeowners-v2/_utils/loanTypeDefaults.ts`

```typescript
type LoanTypeDefault = {
  term?: string         // value from LOAN_TERM options
  rateRange?: string    // display hint, e.g., "6.5% - 7.5%"
}

const LOAN_TYPE_DEFAULTS: Record<string, LoanTypeDefault> = {
  Conventional:            { term: '30', rateRange: '6.5% - 7.5%' },
  Conventional_HomeReady:  { term: '30', rateRange: '6.5% - 7.5%' },
  HomePossible:            { term: '30', rateRange: '6.5% - 7.5%' },
  FHA:                     { term: '30', rateRange: '6.0% - 7.0%' },
  VA:                      { term: '30', rateRange: '5.5% - 6.5%' },
  FHA_Streamline:          { term: '30', rateRange: '5.5% - 6.5%' },
  USDA:                    { term: '30', rateRange: '6.0% - 7.0%' },
  Jumbo:                   { term: '30', rateRange: '7.0% - 8.0%' },
  HELOC:                   { term: '15' },
  // Types without defaults: Non_QM, Commercial, etc. — user fills manually
}

export function getLoanTypeDefaults(loanTypeCode: string | null): LoanTypeDefault | null
```

**Behavior:**
- When `loan_type_code` changes in the `SelectField`:
  1. Look up defaults for the new code.
  2. If `loan_term` is currently empty/null, auto-fill it.
  3. If a `rateRange` exists, show a small `Badge` below the interest rate field: "Typical: 6.5% - 7.5%". This is a hint only — does not auto-fill rate.
- If the user has already entered a term, do not overwrite it.

### Edit/Save/Cancel Sections

The v1 Property uses inline edit mode toggling (click Edit, fields become editable, Save/Cancel buttons appear). Carry this pattern forward for:
- Home Value card (existing `handleSaveHomeValue` logic with `calculateAvmAndEstEquity`)
- Property Info card (existing `handleSavePropertyDetails` logic with `updateHomeEstimate`)
- Credit Rating card
- Agent/Referral Partner card

The mortgage card is always editable in create mode. In edit mode, the existing `handleStartEditMortgage` / `handleCancelMortgage` / `handleMortgageFieldBlur` pattern is preserved for recalculation on blur.

### API Calls (unchanged)

- `calculateAvmAndEstEquity` — on home value save and on primary mortgage field blur
- `updateHomeEstimate` — on property details save (sq ft, beds, baths changes)
- `getQuoteConfiguration` — on mount (existing)
- `previewReport` — on Preview button click
- `getReferralPartners` — auto-realtor-by-state logic (existing)
- `setDefaultRealtor` — set default referral partner (existing)

---

## Step 3: ContactInfo

### What changes from v1 Contact

| Aspect | v1 (Contact) | v2 (ContactInfo) |
|--------|--------------|-------------------|
| Add co-borrower button | Small `Button variant="light"` with `IconPlus` in a flex row | Full-width dashed-border Card with centered plus icon and descriptive text |
| Layout | Unchanged | Same grid layout per homeowner card |
| Email verification | Unchanged | Same verify-on-blur flow |
| Submit / Preview | Unchanged | Same buttons and logic |

### Add Co-Borrower Prompt Design

```tsx
{/* Replace the small button with a visually prominent prompt */}
<Card
  withBorder
  radius="md"
  className="w-full border-dashed border-2 border-gray-300 hover:border-orange-400
             cursor-pointer transition-colors py-6"
  onClick={appendCoBorrower}
>
  <div className="flex flex-col items-center gap-2 text-gray-500">
    <IconUserPlus size={32} />
    <p className="text-base font-medium">{t('HomeOwner.co_homeowners_add')}</p>
    <p className="text-sm">{t('HomeOwner.co_homeowners_description')}</p>
  </div>
</Card>
```

### Email Verification (preserved as-is)

- `verifiedCoBorrowerEmails` state: `Record<string, string>` mapping fieldId to verified email
- On blur: call `validateUserEmail('co-homeowners', { emails: [email] })`
- On valid: auto-fill `first_name`, `last_name`, `phone` from response
- On invalid: show error alert inside the homeowner card
- On verified: show green "Email verified" alert

---

## State Management

### React Hook Form (existing — no changes to form shape)

The `ReportForm` parent continues to own the `useForm` instance with `joiResolver(reportSchema)`. All section components consume the form via `useFormContext()`.

### Local component state per section

Each section manages its own UI state (loading, errors, edit modes). No global state changes needed.

### Jotai (existing — no changes)

`quoteConfigState` atom is set from `getQuoteConfiguration` in PropertyDetails, same as v1.

---

## Conventions

- Mantine 7.x components: `Card`, `Grid`, `Button`, `Alert`, `Radio`, `ScrollArea`, `Badge`, `ActionIcon`
- Tailwind CSS for layout and spacing (no `style={{}}` objects, no Mantine `Stack`/`Group`/`Text`/`Title`)
- Custom field components: `GGMapInputField`, `TextInputField`, `NumberInputField`, `SelectField`, `DateInputField`, `InputMaskField`
- i18n: all user-facing strings via `useTranslations()`, keys from existing namespaces (`Label.*`, `Action.*`, `HomeOwner.*`, `Error.*`, `Noun.*`, `Placeholder.*`)
- No new API endpoints required
- No `console.log` in production code
