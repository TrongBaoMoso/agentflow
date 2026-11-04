# Proposal: Admin Edit User Profile

## Feature Branch

`feature/admin-edit-user-profile` (to be created from `master` in `lf-iq` repo)

## Problem Statement

Admin users at `/admin/users` can currently **view** user profiles (via the `UserProfileModal`) but cannot **edit** them. When admins need to update user information (name, email, phone, profile-specific fields), they have no way to do so through the UI. This forces manual backend interventions or direct database edits.

## Proposed Solution

Add an **Edit Profile** Drawer (sliding panel from the right) to the admin users page. When an admin clicks "Edit" on a user card, a Mantine `Drawer` opens with a form pre-populated with the user's current data. The form fields adapt based on the user's profile type (Home Owner, Loan Officer, Realtor).

The UI pattern follows the existing `HomeownerDetailPanel` component (a right-side Drawer with user info in the title area).

## Scope

### In Scope

- **EditUserDrawer component**: Right-side Mantine Drawer with react-hook-form + joi validation
- **Three profile-specific form sections**: HomeOwner fields, LoanOfficer fields, Realtor fields
- **Common base fields**: email, first_name, last_name, phone, avatar, date_of_birth, gender
- **API integration**: Uses existing `editUser(id, body)` from `private-api.ts` which calls `PATCH /v1/users/:id`
- **Edit button in ActionMenu**: Add "Edit Profile" menu item to the existing `ActionMenu` component
- **Access control for REALTOR and LOAN_OFFICER**: Edit is only available for LFIQ-native users (`user.external_key` is null). External users (with `external_key`) cannot be edited.
- **Home Owner**: Edit is always available (no external_key restriction)
- **Form validation**: Joi schemas matching the backend `UserRequest` / profile request DTOs
- **Success feedback**: Toast notification on successful save, auto-refresh of user list
- **Error handling**: Display API error messages in the Drawer

### Out of Scope

- Creating new users
- Deleting users (already handled by `ConfirmDeleteUserModal`)
- Editing user `settings` field (key-value map -- separate admin concern)
- Avatar upload (just a URL text field for now)
- Editing user status (already handled by `StatusBadgeDropdown`)
- Editing subscriptions
- Bulk editing multiple users

## Success Criteria

1. Admin can click "Edit Profile" on any user card's action menu
2. A Drawer opens from the right, pre-populated with the user's current data
3. Form fields change based on profile type (HOME_OWNER, LOAN_OFFICER, REALTOR)
4. For REALTOR and LOAN_OFFICER tabs, "Edit Profile" only appears when `user.external_key` is null
5. Form validates input before submission using Joi
6. On submit, calls `editUser(userId, body)` with the correct request shape per `cases.txt`
7. On success: shows toast, closes Drawer, refreshes user list
8. On error: displays error message inside the Drawer
9. `npm run build` passes with zero TypeScript errors
