# lf-iq Homeowner Report — mobile Loan Officer card + compact rate action

**Date:** 2026-07-09
**Repo:** `lf-iq` (Next.js 14 + Mantine 7 + Tailwind), homeowner report route `[locale]/(private)/[id]`
**Related:** mirrors the mobile pattern built for `lo-homepage` LoanOfficerCard (collapse-to-FAB).

## Problem

On the homeowner report:
1. `RefinanceLoanOfficerCard` (the Refinance-NOW CTA / ask-your-LO card) renders only into the
   desktop right rail (`#refinance-lo-rail`, `hidden xl:block`), so it **disappears on mobile**.
2. The `RateCheckModal` floating trigger ("Check Today's Rate") on mobile is a wide bottom-center
   pill that **wraps to two lines** and eats space (see user screenshots).

(The `ReportHero` "Your Loan Officer" contact card — CALL/EMAIL — is a separate element and is out
of scope; it stays as-is.)

## Breakpoints (lf-iq `tailwind.config.ts`, Mantine theme)

`md` = 992px, `xl` = 1408px. The report layout is: `< md` single column; `md`–`xl` left sidebar
(250px, holds the rate button) + report, **no** LO rail; `≥ xl` adds the right rail with the LO card.

**Scope of this change = `< md` (phones / small screens)** — matching where the rate trigger already
floats and the user's screenshots. The `md`–`xl` and `≥ xl` layouts are **unchanged**.

## Goal

At `< md`, show the LO card as a floating element (bottom-left) that collapses to a FAB on scroll,
and turn the rate trigger into a compact icon button on the right edge above the chat bubble —
without any two floating elements overlapping.

## Design

### A. `RefinanceLoanOfficerCard` — add a mobile (`< md`) rendering

Keep the existing desktop behavior exactly: it still `createPortal`s into `#refinance-lo-rail` for
`≥ xl`. Add a **second render branch** (NOT portaled — `fixed`, `md:hidden`) for small screens. Both
branches reuse the same data (`loanOfficer`, `applyHref`, `ownerName`) and the same
`inRefinanceBand` IntersectionObserver already in the component, so the body still swaps between the
**Refinance NOW** CTA and the **ask-your-LO** form (Textarea + Send) exactly as on desktop.

Mobile layout & behavior (ported from lo-homepage):
- **Expanded (default):** dark card (same surface/orange as the existing card) docked bottom-left:
  `fixed left-3 bottom-3 z-40`, width `w-[min(84%,320px)]`, inset from the right so it clears the
  right-edge icons. Row 1: avatar + name + `title · NMLS` + a collapse chevron (`⌄`, Mantine
  `ActionIcon`). Below: the current-state body (Refinance NOW link, or the ask-LO Textarea + Send).
- **Collapsed:** a FAB `fixed left-3 bottom-3 z-40` — same dark surface — avatar + "Your LO" +
  up-chevron (Mantine `UnstyledButton`).
- **Collapse logic:** scroll down (`window.scrollY` increasing, `> 24`) → collapse; scroll to top
  (`<= 8`) → expand; tap FAB → expand; tap `⌄` → collapse. Use a `lastScrollY` `useRef` shared with
  the expand handler (reset on manual expand so a stray scroll tick can't immediately re-collapse) —
  the exact pattern shipped in lo-homepage.
- Motion on `transform`/`opacity` only; `print:hidden`; `z-40`.

Guard: the mobile branch renders nothing when `loanOfficer`/name is missing (same as today).

### B. `RateCheckModal` FloatingTriggerButton — compact icon on mobile

Keep the desktop sidebar button unchanged (`md:static md:w-full` full-width pill with label). Change
only the `< md` floating form:
- Render as an **icon-only round button** (`IconTrendingUp`, `IconRefresh` spin while refreshing):
  `fixed right-3 bottom-[70px] z-40 md:static` … a ~46px circle, orange `hsl(25 95% 53%)`, so it
  sits on the right edge **above the external chat bubble** (bottom-right, ~bottom-3).
- The text label becomes `hidden md:inline` (shown only in the desktop sidebar button); on mobile the
  accessible name comes from the existing `aria-label` (`RateCheckModal.floating_button_aria`), plus
  a Mantine `Tooltip`.
- Preserve the disabled/loading state and `data-engagement-action="floating_open"`.

### C. Coexistence (no overlap)

`< md` bottom edge: **left** = LO card / FAB; **right column** = rate icon (top) stacked above the
external chat bubble (bottom-right). The expanded LO card is width-capped and left-anchored, leaving
the right clear. Nothing overlaps in either expanded or collapsed state.

## i18n

lf-iq has 7 locales: ar, en, es, he, ko, vi, zh. Add two keys under the existing `ReportRefinance`
namespace (used by this card): `your_lo` (FAB label, e.g. "Your LO") and `minimize` (collapse
`aria-label`). The rate icon reuses the existing `RateCheckModal.floating_button_aria`.

## Constraints

- Mantine/Tailwind: no `Stack`/`Group`/`Text`/`Title`; no raw `<button>` (use `ActionIcon` /
  `UnstyledButton`); Tailwind over `style={{}}` (runtime-measured values excepted).
- Desktop (`≥ md` sidebar rate button; `≥ xl` rail LO card) must be byte-for-byte behavior-unchanged.
- Reuse the existing IntersectionObserver / data / apply-href logic; do not duplicate it.

## Acceptance criteria

1. `< md`: the LO card shows bottom-left, expanded by default, and swaps Refinance-NOW ↔ ask-LO form
   with scroll exactly like desktop.
2. `< md`: scrolling down collapses the card to a "Your LO" FAB; scrolling to top / tapping expands
   it; a stray scroll right after a manual tap does not re-collapse it.
3. `< md`: the rate trigger is an icon-only round button on the right, above the chat bubble; no
   two-line wrap; it never overlaps the LO card/FAB or the chat bubble.
4. `≥ md` sidebar rate button and `≥ xl` rail LO card are unchanged.
5. New i18n keys present in all 7 locales; `ReportRefinance.your_lo` / `.minimize` resolve.
6. No horizontal overflow / layout shift at 320 / 375 / 768 / 991px.
