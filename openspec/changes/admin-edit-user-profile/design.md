# Design: Admin Edit User Profile

## Architecture Overview

```
ActionMenu (existing)
  |-- "Edit Profile" menu item (new) --> opens EditUserDrawer
        |
EditUserDrawer (new component)
  |-- Fetches user data via getUserById (existing API)
  |-- Renders base fields (email, name, phone, dob, gender)
  |-- Conditionally renders profile-specific form section:
  |     |-- HomeOwnerProfileFields
  |     |-- LoanOfficerProfileFields
  |     |-- RealtorProfileFields
  |-- Submits via editUser(id, body) (existing API)
  |-- On success: toast + onRefresh callback
```

## Component Structure

### New Files

| File | Purpose |
|------|---------|
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/index.tsx` | Main Drawer component with base form fields and submit logic |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/HomeOwnerProfileFields.tsx` | Home Owner profile-specific form fields |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/LoanOfficerProfileFields.tsx` | Loan Officer profile-specific form fields |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/RealtorProfileFields.tsx` | Realtor profile-specific form fields |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/validation.ts` | Joi validation schemas for base + each profile type |
| `lf-iq/src/shared/types/edit-user-types.ts` | TypeScript interfaces for edit user request bodies |

### Modified Files

| File | Change |
|------|--------|
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/ActionMenu/index.tsx` | Add "Edit Profile" menu item; conditionally hide for external REALTOR/LO users |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/HomeownerCard/index.tsx` | Pass `user` object to ActionMenu for edit capability |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/LoanOfficerCard/index.tsx` | Pass `user` object to ActionMenu for edit capability |
| `lf-iq/src/app/[locale]/(admin)/admin/users/_components/RealtorCard/index.tsx` | Pass `user` object to ActionMenu for edit capability |

## UI Design

### Drawer Layout (Right-side, size "lg")

The Drawer follows the pattern established by `HomeownerDetailPanel`:

```
+----------------------------------------------+
| [Avatar Initials]  User Full Name             |
|                    user@email.com      [X]    |
+----------------------------------------------+
|                                               |
|  --- Base Information ---                     |
|  [Email*]            [Phone]                  |
|  [First Name*]       [Last Name*]             |
|  [Date of Birth]     [Gender]                 |
|  [Avatar URL]                                 |
|                                               |
|  --- Profile Details (varies by type) ---     |
|                                               |
|  (HOME_OWNER)                                 |
|  [Working with LO Key]                        |
|  [Worked with Realtor Keys] (tags input)      |
|  [Invited By Key]                             |
|                                               |
|  (LOAN_OFFICER)                               |
|  [Company Email]     [Company Phone]          |
|  [NMLS]              [Licensed States] (tags) |
|  [Has RE License] (switch)                    |
|  [RE Company]        [RE Company Address]     |
|  [Company Domain URL]                         |
|  [Personal Domain URL]                        |
|  [LF Company Domain URL]                      |
|  [LF Personal Domain URL]                     |
|  [Closed Loans/Month] [/Quarter] [/Year]      |
|                                               |
|  (REALTOR)                                    |
|  [Licensed States] (tags)                     |
|  [Organization]                               |
|  [Working with LO Key]                        |
|  [Worked with LO Keys] (tags)                 |
|                                               |
+----------------------------------------------+
|  [Cancel]                          [Save]     |
+----------------------------------------------+
```

### Drawer Title

Same pattern as `HomeownerDetailPanel`:
- Left: Avatar circle with initials (orange background)
- Right: User full name (bold) + email (dimmed)

## Data Flow

### Opening the Drawer

1. User clicks three-dot menu on any card
2. Clicks "Edit Profile"
3. ActionMenu calls `onEditUser(user)` callback
4. Parent page sets `editingUser` state and `drawerOpened = true`
5. EditUserDrawer receives `user` prop and opens

### Loading User Data

The user data is already available from the card (passed through the list). The Drawer uses this data directly to pre-populate the form. No additional API call is needed to open the form since the card data includes the profile via `expand=profile`.

### Submitting

1. User clicks "Save"
2. Form validates via Joi schema (profile-type-aware)
3. Build request body matching `cases.txt` format:
   ```typescript
   {
     email: "...",
     first_name: "...",
     last_name: "...",
     phone: "...",
     avatar: "...",
     date_of_birth: "...",  // ISO date string YYYY-MM-DD
     gender: "MALE" | "FEMALE" | "UNKNOWN",
     profile: {
       type: "HOME_OWNER" | "LOAN_OFFICER" | "REALTOR",
       ...profileSpecificFields
     }
   }
   ```
4. Call `editUser(userId, body)` from `private-api.ts`
5. On success: show success toast, call `onRefresh()`, close Drawer
6. On error: show error Alert inside the Drawer

## State Management

No new Jotai atoms needed. The Drawer state is local to the page:

```typescript
// In page.tsx
const [editDrawerUser, setEditDrawerUser] = useState<any | null>(null)

// Open:
setEditDrawerUser(user)

// Close:
setEditDrawerUser(null)
```

The `opened` prop for the Drawer is derived: `opened={!!editDrawerUser}`

## Form Approach

Uses `react-hook-form` with `@hookform/resolvers/joi` (same pattern as `UpdateCronJobModal`):

```typescript
const form = useForm({
  resolver: joiResolver(getValidationSchema(profileType)),
  mode: 'onChange',
  defaultValues: buildDefaultValues(user)
})
```

Uses existing shared field components:
- `TextInputField` for text fields
- `SelectField` for gender dropdown
- `DateInputField` for date of birth
- `TagsInputField` for licensed_states, worked_with keys
- `SwitchField` for has_real_estate_license
- `NumberInputField` for closed loans counts

## Validation Schemas

### Base Schema (all profiles)

```typescript
const baseSchema = object.keys({
  email: email.required().label('Email'),
  first_name: string.required().label('First Name'),
  last_name: string.required().label('Last Name'),
  phone: string.allow('', null).label('Phone'),
  avatar: string.allow('', null).label('Avatar'),
  date_of_birth: string.allow('', null).label('Date of Birth'),
  gender: string.valid('MALE', 'FEMALE', 'UNKNOWN').label('Gender')
})
```

### HomeOwner Profile Schema

```typescript
const homeOwnerProfileSchema = object.keys({
  type: string.valid('HOME_OWNER').required(),
  ho_working_with_lo_key: string.allow('', null),
  ho_worked_with_realtor_keys: array.items(string).default([]),
  ho_invited_by_key: string.allow('', null)
})
```

### LoanOfficer Profile Schema

```typescript
const loanOfficerProfileSchema = object.keys({
  type: string.valid('LOAN_OFFICER').required(),
  company_email: string.allow('', null),
  company_phone: string.allow('', null),
  nmls: string.allow('', null),
  licensed_states: array.items(string).default([]),
  has_real_estate_license: boolean.default(false),
  re_company: string.allow('', null),
  re_company_address: string.allow('', null),
  re_company_licenses: array.items(object).default([]),
  re_licenses: array.items(object).default([]),
  default_realtor_by_state: object.default({}),
  company_domain_url: string.allow('', null),
  personal_domain_url: string.allow('', null),
  lf_company_domain_url: string.allow('', null),
  lf_personal_domain_url: string.allow('', null),
  closed_loans_per_month: number,
  closed_loans_per_quarter: number,
  closed_loans_per_year: number
})
```

### Realtor Profile Schema

```typescript
const realtorProfileSchema = object.keys({
  type: string.valid('REALTOR').required(),
  licensed_states: array.items(string).default([]),
  licenses: array.items(object.keys({
    state: string.required(),
    number: string.required()
  })).default([]),
  realtor_working_with_lo_key: string.allow('', null),
  organization: string.allow('', null),
  realtor_worked_with_lo_keys: array.items(string).default([])
})
```

## Access Control Rules

| Profile Type | external_key is null | external_key exists |
|-------------|---------------------|-------------------|
| HOME_OWNER | Edit allowed | Edit allowed |
| LOAN_OFFICER | Edit allowed | Edit DISABLED (hide menu item) |
| REALTOR | Edit allowed | Edit DISABLED (hide menu item) |

This is enforced in the `ActionMenu` component by conditionally rendering the "Edit Profile" menu item.

## Conventions Followed

- **File structure**: `_components/EditUserDrawer/` folder under the users route (co-located with page)
- **Form pattern**: `FormProvider` + `useForm` + `joiResolver` (matches `UpdateCronJobModal`)
- **Field components**: Reuse from `@fields/*` (TextInputField, SelectField, etc.)
- **Joi shortcuts**: Import from `@utils/joiShorthandTypes`
- **API calls**: Use existing `editUser` from `@apis/private-api`
- **Error handling**: `extractErrorMessage` from `@utils/errorUtils`
- **Toast**: `useToast` hook with `notifySuccess` / `notifyError`
- **i18n**: Use `useTranslations()` with existing keys where possible, add new keys under `Action.*` and `AdminUsersPage.*`
- **Styling**: Tailwind CSS utility classes + Mantine component props (matches existing cards/modals)
