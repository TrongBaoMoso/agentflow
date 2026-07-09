# Loan Officer Card — lo-homepage homepage

**Date:** 2026-07-09
**Repo:** `lo-homepage` (Next.js 14 + Mantine 7 + Tailwind, base branch `produciton-v2`)
**Origin:** Follow-up to Jeremy McDonald's suggestion (email thread "Re: Christina Brown") to
raise the visibility of the LO's apply CTA and reduce misrouted applications. Visual reference:
lf-iq `RefinanceLoanOfficerCard`
(`lf-iq/src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx`).

## Goal

Add a persistent, floating **Loan Officer card** on the LO homepage (`suongloanofficer.com`, the
`(public)/(home)` route) that surfaces the LO's identity and a single **"Start My Application"**
CTA, so borrowers apply through the LO's page instead of the corporate site.

## Non-goals

- No dual-state "ask your LO a question" form (that is lf-iq-specific; homepage has no refinance
  section to track).
- No redesign of the existing hero / Mortgage Rates form.
- No change to the header "Start My Application" button.

## Component

`LoanOfficerCard` — a **client** component rendered from the homepage. Unlike lf-iq (which portals
into a layout rail column), this uses `position: fixed` because the homepage has no third rail
column.

### Content (single state — identity + one CTA)

- Circular avatar, orange ring. Source: `loInfo.avatar` via `formatBlobImage` (fallback to a
  default avatar image / `ti-user` placeholder when empty).
- Name: `${first_name} ${last_name}`.
- Sub-line: `${title} · NMLS ${originator_nmls}` (orange). Omit the `· NMLS …` part when
  `originator_nmls` is empty.
- One CTA: **"Start My Application"** (orange gradient), href =
  `convertPathToLOPage(ROUTES.APPLY, basePathLO)` — the same destination as the header button.
- A **close (X)** button.

### Data source

`ILOInfo` (see `lo-homepage/src/apis/moso-types.ts`) via the recoil atom `loInfoState`
(`src/recoil/atom/loConfig.ts`), the same source `UserProfile` already reads on the homepage.
Fields used: `avatar`, `first_name`, `last_name`, `title`, `originator_nmls`.
`basePathLO` for the apply href comes from the LO base path already threaded through the homepage
(header `x-base-path`); pass it into the card as a prop from the server component, or reuse the
same helper the header uses.

Guard: render nothing when `loInfo` is missing.

### Visual (reuse lf-iq language)

- Card background: `linear-gradient(180deg, rgba(38,42,49,0.97), rgba(28,31,37,0.94))`.
- Border: `1px solid rgba(248,115,10,0.38)`; card radius `16px`; deep shadow.
- Orange accent = `hsl(25 95% 53%)` (matches lf-iq and Loan Factory brand orange).
- Avatar 72px (vertical) / 50px (bar) / 38px (mobile), 3px orange ring.
- CTA gradient `linear-gradient(135deg, hsl(25 95% 53%), hsl(35 100% 58%))`, pill radius, white
  text, weight 500.

## Responsive behavior (Tailwind breakpoints)

**Breakpoint values in this repo** (`tailwind.config.ts` → `screens` is overridden by the Mantine
theme, NOT Tailwind defaults): `xs` 576px, `sm` 768px, `md` 992px, `lg` 1200px, `xl` **1408px**,
`xxl` 1456px. There is no `2xl` and no 640px `sm`. The 480px cutoff below has no matching stop, so
it uses the arbitrary variant `max-[480px]:`.

| Breakpoint | Layout | Position |
|---|---|---|
| `≥ xl` (1408px) | **Vertical card** (~206–220px wide) | Fixed flush to the **right edge** (`right-0`), vertically centered (`top-1/2 -translate-y-1/2`). Left corners rounded, right edge flat (docked-tab look) so it hugs the viewport edge and does not cover the centered main content. Shown with `hidden xl:flex`. |
| `< xl` | **Horizontal bar** (avatar + name/NMLS + CTA + X), max-width ~510px | Fixed bottom-center (`left-1/2 -translate-x-1/2 bottom-4`). Shown with `flex xl:hidden`. |
| `< 480px` (`max-[480px]:`) | Same bottom bar but **name/NMLS text block hidden** → avatar + CTA + X only | Fixed bottom-center. |

Rationale for flush-right at `xl`: at ≥ 1408px the homepage main content is centered with side
whitespace; docking the card to the right gutter keeps it off the Mortgage Rates form. Below `xl`
that whitespace disappears, so the card moves to a bottom bar.

## Close behavior

- Clicking **X** hides the card.
- Persistence: **session only** — store a flag in `sessionStorage` (e.g. `lo_card_dismissed`).
  Card stays hidden for the rest of the browser session; a new tab / next visit shows it again.
- On mount, read `sessionStorage` before first paint to avoid a flash of the card when already
  dismissed.

## Technical notes

- `position: fixed`; `z-index` above page body but below the site header and any modal/overlay.
- Hide on print (`print:hidden`).
- Respect existing i18n: CTA label reuses `Common.start_my_application`; add any new keys
  (e.g. close button aria-label) across all lo-homepage locale files.
- Compositor-friendly only (transform/opacity) if any enter animation is added; none required for v1.
- File location: `src/app/[locale]/(public)/(home)/_sections/LoanOfficerCard/index.tsx`
  (co-located with the other homepage sections), rendered from
  `_sections/HomePage/index.tsx`.

## Acceptance criteria

1. On `≥ xl`, a vertical dark card is docked to the right edge, vertically centered, not overlapping
   the Mortgage Rates form.
2. On `< xl`, the card is a horizontal bar docked bottom-center.
3. On `< 480px`, the bar shows only avatar + "Start My Application" + X (no NMLS line).
4. Card shows real LO name, title, NMLS, and avatar from `loInfo`; renders nothing when `loInfo`
   is absent.
5. CTA navigates to the LO apply page (same as the header button).
6. Clicking X hides the card; it stays hidden for the session and reappears in a new session.
7. No layout shift or horizontal overflow at 320 / 375 / 768 / 1024 / 1280 / 1440 / 1920.
