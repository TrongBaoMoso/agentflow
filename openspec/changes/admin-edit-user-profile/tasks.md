# Tasks: Admin Edit User Profile

## 1. Foundation: Types, Validation, and API

- [ ] 1.1 Create TypeScript interfaces for edit user request bodies

  **File**: `lf-iq/src/shared/types/edit-user-types.ts` (new)

  Create interfaces matching the backend request DTOs from the txt schema files:
  - `EditUserBaseRequest` — email, first_name, last_name, phone, avatar, date_of_birth, gender, settings
  - `HomeOwnerProfilePayload` — type, ho_working_with_lo_key, ho_worked_with_realtor_keys, ho_invited_by_key
  - `LoanOfficerProfilePayload` — type, company_email, company_phone, nmls, licensed_states, has_real_estate_license, re_company, re_company_address, re_company_licenses, re_licenses, default_realtor_by_state, company_domain_url, personal_domain_url, lf_company_domain_url, lf_personal_domain_url, closed_loans_per_month, closed_loans_per_quarter, closed_loans_per_year
  - `RealtorProfilePayload` — type, licensed_states, licenses, realtor_working_with_lo_key, organization, realtor_worked_with_lo_keys
  - `EditUserRequest` — extends EditUserBaseRequest with `profile: HomeOwnerProfilePayload | LoanOfficerProfilePayload | RealtorProfilePayload`
  - `LicenseInfo` — { state: string; number: string }

  **Acceptance criteria**:
  - All interfaces match the JSON shapes in `cases.txt`, `BaseUserRequest.txt`, `HomeOwner.txt`, `LoanOfficer.txt`, `Realtor.txt`
  - Gender is typed as `'MALE' | 'FEMALE' | 'UNKNOWN'`
  - Profile type discriminator is `'HOME_OWNER' | 'LOAN_OFFICER' | 'REALTOR'`
  - `npm run build` passes

- [ ] 1.2 Create Joi validation schemas for edit user forms

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/validation.ts` (new)

  Create validation schemas using the project's `@utils/joiShorthandTypes` pattern:
  - `baseUserSchema` — validates email (required), first_name (required), last_name (required), phone (optional), avatar (optional), date_of_birth (optional), gender (optional, valid values)
  - `homeOwnerProfileSchema` — validates HOME_OWNER profile fields
  - `loanOfficerProfileSchema` — validates LOAN_OFFICER profile fields (nmls uses existing `nmls` shorthand from joiShorthandTypes if applicable)
  - `realtorProfileSchema` — validates REALTOR profile fields
  - `getEditUserSchema(profileType: string)` — returns combined base + profile schema for the given type

  **Acceptance criteria**:
  - Uses `joiResolver` compatible schemas (same pattern as `UpdateCronJobModal`)
  - email, first_name, last_name are required; all other fields optional
  - Profile type field is auto-set (not user-editable)
  - `npm run build` passes

## 2. Core: EditUserDrawer Component

- [ ] 2.1 Create the EditUserDrawer main component

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/index.tsx` (new)

  Build the main Drawer component:
  - Uses Mantine `Drawer` component, position="right", size="lg"
  - Title follows `HomeownerDetailPanel` pattern: avatar initials circle + user full name + email
  - Props: `opened: boolean`, `onClose: () => void`, `user: any | null`, `activeTab: string`, `onSuccess: () => void`
  - Uses `react-hook-form` with `FormProvider`, resolver from `validation.ts`
  - On open (`useEffect` when `opened && user`): reset form with `buildDefaultValues(user)` helper
  - Base fields section: email (TextInputField), first_name (TextInputField), last_name (TextInputField), phone (TextInputField), date_of_birth (DateInputField), gender (SelectField with MALE/FEMALE/UNKNOWN options), avatar (TextInputField)
  - Conditionally renders profile fields component based on `user.current_profile`:
    - `HOME_OWNER` -> `HomeOwnerProfileFields`
    - `LOAN_OFFICER` -> `LoanOfficerProfileFields`
    - `REALTOR` -> `RealtorProfileFields`
  - Submit handler: calls `editUser(user.id, formData)` from `@apis/private-api`
  - Loading state during submission (button shows loading spinner)
  - Error state: shows Mantine `Alert` with error message (same as UpdateCronJobModal)
  - On success: calls `notifySuccess()` via `useToast`, calls `onSuccess()`, calls `onClose()`
  - Footer: Cancel button (calls onClose) + Save button (type="submit")
  - Uses `useTranslations()` for all labels

  **Acceptance criteria**:
  - Drawer opens from right side, size "lg"
  - Title shows user avatar initials, name, and email
  - Form pre-populates with user's current data when opened
  - Base fields render correctly with proper labels
  - Correct profile fields component renders based on activeTab/current_profile
  - Submit calls `editUser` with properly shaped request body matching `cases.txt`
  - Success flow: toast notification, drawer closes, parent refreshes
  - Error flow: error Alert displayed inside Drawer
  - Cancel button closes Drawer without saving
  - `npm run build` passes

- [ ] 2.2 Create HomeOwnerProfileFields component

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/HomeOwnerProfileFields.tsx` (new)

  Profile-specific form fields for HOME_OWNER users:
  - `profile.ho_working_with_lo_key` — TextInputField (user key string)
  - `profile.ho_worked_with_realtor_keys` — TagsInputField (array of user key strings)
  - `profile.ho_invited_by_key` — TextInputField (user key string)
  - All fields are optional
  - Hidden field: `profile.type` = "HOME_OWNER" (set in defaultValues, not rendered)
  - Uses Grid layout (Mantine Grid) for consistent spacing
  - Uses `useTranslations()` for labels

  **Acceptance criteria**:
  - All three HOME_OWNER profile fields render
  - Field names are prefixed with `profile.` for nested form structure
  - TagsInputField works for array-type fields
  - `npm run build` passes

- [ ] 2.3 Create LoanOfficerProfileFields component

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/LoanOfficerProfileFields.tsx` (new)

  Profile-specific form fields for LOAN_OFFICER users:
  - `profile.company_email` — TextInputField
  - `profile.company_phone` — TextInputField
  - `profile.nmls` — TextInputField
  - `profile.licensed_states` — TagsInputField (array of state codes like "CA", "NY")
  - `profile.has_real_estate_license` — SwitchField (boolean)
  - `profile.re_company` — TextInputField
  - `profile.re_company_address` — TextInputField
  - `profile.company_domain_url` — TextInputField
  - `profile.personal_domain_url` — TextInputField
  - `profile.lf_company_domain_url` — TextInputField
  - `profile.lf_personal_domain_url` — TextInputField
  - `profile.closed_loans_per_month` — NumberInputField
  - `profile.closed_loans_per_quarter` — NumberInputField
  - `profile.closed_loans_per_year` — NumberInputField
  - NOTE: `re_company_licenses`, `re_licenses`, and `default_realtor_by_state` are complex nested structures. For the initial implementation, these are omitted from the form (they remain unchanged on submit by not including them in the payload, or they are sent as-is from the original user data). If needed, they can be added in a follow-up.
  - Hidden field: `profile.type` = "LOAN_OFFICER"
  - Uses Grid layout with 2-column rows where appropriate

  **Acceptance criteria**:
  - All main LOAN_OFFICER fields render (14 fields)
  - `re_company_licenses`, `re_licenses`, `default_realtor_by_state` are preserved from original data (not editable in this version)
  - Field names prefixed with `profile.`
  - Number fields use NumberInputField
  - Boolean field uses SwitchField
  - `npm run build` passes

- [ ] 2.4 Create RealtorProfileFields component

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/EditUserDrawer/RealtorProfileFields.tsx` (new)

  Profile-specific form fields for REALTOR users:
  - `profile.licensed_states` — TagsInputField (array of state codes)
  - `profile.organization` — TextInputField
  - `profile.realtor_working_with_lo_key` — TextInputField (user key)
  - `profile.realtor_worked_with_lo_keys` — TagsInputField (array of user keys)
  - NOTE: `profile.licenses` (array of {state, number}) is a complex structure. For the initial implementation, it is preserved from original data (not editable). Can be added later.
  - Hidden field: `profile.type` = "REALTOR"
  - Uses Grid layout

  **Acceptance criteria**:
  - All main REALTOR fields render (4 fields)
  - `licenses` array preserved from original data
  - Field names prefixed with `profile.`
  - `npm run build` passes

## 3. Integration: Wire Up Edit Action

- [ ] 3.1 Add "Edit Profile" menu item to ActionMenu with external_key guard

  **File**: `lf-iq/src/app/[locale]/(admin)/admin/users/_components/ActionMenu/index.tsx` (modify)

  Changes:
  - Add new prop: `onEditProfile: () => void` (callback when Edit is clicked)
  - Add new prop: `profileType: string` (to know which tab: HOME_OWNER, LOAN_OFFICER, REALTOR)
  - The `isExternal` prop already exists on ActionMenu
  - Add a new `Menu.Item` for "Edit Profile" with `IconEdit` icon:
    - For HOME_OWNER: always show the Edit menu item
    - For LOAN_OFFICER: only show when `!isExternal` (i.e., `external_key` is null)
    - For REALTOR: only show when `!isExternal` (i.e., `external_key` is null)
  - Place the Edit menu item after "Login as" and before "Audit Logs"
  - Use existing i18n key `Action.edit_profile`
  - Import `IconEdit` from `@tabler/icons-react`

  **Acceptance criteria**:
  - "Edit Profile" appears in ActionMenu for all HOME_OWNER users
  - "Edit Profile" appears for LOAN_OFFICER and REALTOR only when `external_key` is null
  - "Edit Profile" does NOT appear for external LOAN_OFFICER and REALTOR users
  - Clicking "Edit Profile" calls the `onEditProfile` callback
  - `npm run build` passes

- [ ] 3.2 Wire up EditUserDrawer in the user cards and page

  **Files to modify**:
  - `lf-iq/src/app/[locale]/(admin)/admin/users/page.tsx`
  - `lf-iq/src/app/[locale]/(admin)/admin/users/_components/HomeownerCard/index.tsx`
  - `lf-iq/src/app/[locale]/(admin)/admin/users/_components/LoanOfficerCard/index.tsx`
  - `lf-iq/src/app/[locale]/(admin)/admin/users/_components/RealtorCard/index.tsx`

  Changes to `page.tsx`:
  - Add state: `const [editDrawerUser, setEditDrawerUser] = useState<any | null>(null)`
  - Render `EditUserDrawer` at the bottom of the page component:
    ```tsx
    <EditUserDrawer
      opened={!!editDrawerUser}
      onClose={() => setEditDrawerUser(null)}
      user={editDrawerUser}
      activeTab={activeTab}
      onSuccess={handleRefresh}
    />
    ```
  - Pass `onEditUser={setEditDrawerUser}` to each card component
  - Import `EditUserDrawer`

  Changes to each card component (HomeownerCard, LoanOfficerCard, RealtorCard):
  - Add prop: `onEditUser: (user: any) => void`
  - Pass to ActionMenu: `onEditProfile={() => onEditUser(user)}`
  - For LoanOfficerCard: already passes `isExternal` implicitly via `user.external_key` badge logic. Need to pass `isExternal={!!user.external_key}` to ActionMenu (LoanOfficerCard does NOT currently pass `isExternal`; RealtorCard already does).
  - Pass `profileType={activeTab}` to ActionMenu

  **Acceptance criteria**:
  - Clicking "Edit Profile" in any card's ActionMenu opens the EditUserDrawer with that user's data
  - Drawer closes when Cancel is clicked or X is clicked
  - After successful save, the user list refreshes (handleRefresh called)
  - The `isExternal` prop is correctly passed for LoanOfficerCard (was missing)
  - All three card types (HomeownerCard, LoanOfficerCard, RealtorCard) support edit
  - `npm run build` passes

## 4. Polish: i18n and Edge Cases

- [ ] 4.1 Add i18n translation keys for edit user form labels

  **Files**: `lf-iq/src/messages/en.json` and `lf-iq/src/messages/vi.json` (modify)

  Add translation keys under appropriate sections:
  - `AdminUsersPage.edit_user_title`: "Edit User Profile"
  - `Label.company_email`: "Company Email"
  - `Label.company_phone`: "Company Phone"
  - `Label.nmls`: "NMLS"
  - `Label.has_real_estate_license`: "Has Real Estate License"
  - `Label.re_company`: "RE Company"
  - `Label.re_company_address`: "RE Company Address"
  - `Label.company_domain_url`: "Company Domain URL"
  - `Label.personal_domain_url`: "Personal Domain URL"
  - `Label.lf_company_domain_url`: "LF Company Domain URL"
  - `Label.lf_personal_domain_url`: "LF Personal Domain URL"
  - `Label.closed_loans_per_month`: "Closed Loans / Month"
  - `Label.closed_loans_per_quarter`: "Closed Loans / Quarter"
  - `Label.closed_loans_per_year`: "Closed Loans / Year"
  - `Label.organization`: "Organization"
  - `Label.working_with_lo_key`: "Working with LO Key"
  - `Label.worked_with_realtor_keys`: "Worked with Realtor Keys"
  - `Label.invited_by_key`: "Invited By Key"
  - `Label.worked_with_lo_keys`: "Worked with LO Keys"
  - `Label.avatar_url`: "Avatar URL"
  - `Label.date_of_birth`: "Date of Birth"
  - `Label.gender`: "Gender"
  - `Notification.update_successfully` with `{type}` (check if already exists)
  - `Notification.update_failed` with `{type}` (check if already exists)

  NOTE: Check which keys already exist before adding. Many `Label.*` keys may already be defined. Only add missing ones.

  **Acceptance criteria**:
  - All form labels use i18n keys (no hardcoded English strings in components)
  - English translations are accurate
  - Vietnamese translations are provided (can be placeholder translations if unclear)
  - `npm run build` passes
  - No missing translation warnings in console
