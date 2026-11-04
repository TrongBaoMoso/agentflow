# Proposal: Saved Filters (per-user, dynamic, metadata-driven) for Admin list pages

## Problem

Admin users open the same list pages (`admin/users`, `admin/reports`) many times a day and
re-select the exact same combination of filters, sort, search, page size, and view mode every
single time. There is no way to save a frequently used filter combination, and there is no
"default view" that applies automatically on page open. This is repetitive, slow, and error
prone (a forgotten filter shows the wrong data).

There is no existing "saved view / preset / favorite" concept anywhere in `lf-iq` or
`lfiq-backend` — this is net new.

## Proposed Solution

Add a **generic, per-user, server-persisted "Saved Filters"** mechanism:

- Each admin user can **save** the current filter combination on a list page as a **named preset**.
- Users can **list**, **apply**, **rename**, **edit captured values**, and **delete** presets.
- A user can mark **one** preset per page as the **default** ("favorite"). The default
  **auto-applies** when the user opens that page — but only when the URL carries no explicit
  filters, so shared/deep-linked URLs are never clobbered. Setting a new default clears the old one.
- A preset captures **filter + sort + search + pageSize + viewMode**. The full canonical query
  string (`url`) is the source of truth for "apply"; `pageSize` and `viewMode` also live in a
  flexible `metadata` map so the frontend can add new captured keys later **without a schema change**.

The mechanism is **dynamic**: a page opts in by passing a `target` key to a reusable hook
`useSavedFilters(target)` and dropping in a reusable `SavedFiltersMenu` component. No
per-page reimplementation, and adopting a third page needs **no backend change**.

Storage is a new per-user `saved_filters` table in `lfiq-backend` (NOT localStorage), so
presets persist across browser and device and are isolated per real admin user.

### v1 wiring (two pages)

- **`admin/users`** — already uses the canonical URL-as-source filter pattern ("Pattern A",
  see `useUserFilterUrl.ts`). Just attach the menu.
- **`admin/reports`** — currently uses local `useState` (`ReportsToolbarState`). As part of this
  work, **migrate its toolbar to URL-as-source** (new `useReportsFilterUrl` hook mirroring
  `useUserFilterUrl`) before attaching the menu, so applying a preset writes back into the URL.

## Scope

### In scope

**Backend (`lfiq-backend`)** — new `savedfilter` module mirroring the `releasenote` module:
- `SavedFilterEntity` (extends `AbstractAuditableEntity`), service (interface + impl),
  facade (interface + impl), controller, request DTOs, `SavedFilterConfiguration`.
- Register `SavedFilterConfiguration` in `BaseAutoConfiguration`.
- Endpoints under `/v1/saved-filters` (all scoped to current real user):
  - `GET` (list by target — `?target=` and/or `@SearchEntity` `?filter=target eq "REPORT"`)
  - `POST` (create)
  - `PATCH /{id}` (rename + update captured values + toggle `is_default`)
  - `DELETE /{id}`
- Enforce single default per `(user_id, target)` atomically.
- Enforce ownership on every read/write (a user can only see/modify their own presets).

**Frontend (`lf-iq`)**:
- Reusable hook `useSavedFilters(target)` — TanStack Query list + create/update/delete/setDefault
  mutations with cache invalidation and toast feedback.
- Reusable `SavedFiltersMenu` component (Mantine `Menu`/`ActionIcon` + a Save/Rename `Modal`).
- Apply preset by writing its `url` / `metadata` (view_mode, page_size) back into the URL via the
  page's Pattern A setter.
- Auto-apply default on page open when the URL carries no explicit filters.
- Wire into Users (attach) and Reports (migrate to URL-as-source first, then attach).
- API functions in `src/apis/private-api.ts`.
- `SavedFilters` i18n namespace in all 7 locale files.

### Out of scope

- Sharing presets between users / team presets.
- Pages other than Users and Reports (they opt in later via the generic hook/component).
- Migrating non-target admin pages to URL-as-source beyond Reports.

## Success Criteria

1. An admin can save the current `filter + sort + search + pageSize + viewMode` on **Users** and on
   **Reports** as a named preset, see it listed, **apply** it (URL updates and the list re-queries),
   **rename** it, and **delete** it.
2. Marking a preset as **default** makes it **auto-apply** on next page open; only one default
   exists per `(user, target)`; setting a new default clears the old.
3. Presets **persist across browser/device** (server-side) and are **isolated per real admin user**
   (login-as / sub-account safe — keyed to the real user, not the impersonated account).
4. The **Reports** toolbar is **URL-driven** after the change; existing **Users** behavior is unchanged.
5. A second/third page can adopt presets by calling `useSavedFilters(target)` + dropping in
   `SavedFiltersMenu`, with **no backend change** (new `metadata` keys allowed).
6. Backend: per-user ownership enforced; snake_case JSON; response envelope intact; `./gradlew build`
   passes. Frontend: `npx tsc --noEmit` clean; Mantine / Tailwind / i18n / `pageSize` conventions
   followed.

## Feature Branch

`feature/saved-filters` (to be created by DevOps from the appropriate base branch).

> Note: `lf-iq` and `lfiq-backend` are separate git repos with their own branch workflows
> (lf-iq base `production`, lfiq-backend base `develop`). DevOps creates a `feature/saved-filters`
> branch in **each** repo following that repo's workflow.
