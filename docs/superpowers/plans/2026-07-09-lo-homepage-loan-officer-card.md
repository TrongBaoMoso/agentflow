# Loan Officer Card (lo-homepage homepage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, dismissible floating Loan Officer card with a single "Start My Application" CTA to the lo-homepage homepage — docked to the right edge on wide screens, a bottom-center bar below `xl`.

**Architecture:** One client component `LoanOfficerCard` using `position: fixed` (no portal — the homepage has no rail column like lf-iq). It receives `loInfo` and `basePathLO` as props from the existing server component `HomePage` (both already fetched there), renders two Tailwind-responsive layouts (vertical card ≥ `xl`, horizontal bar < `xl`), and remembers dismissal in `sessionStorage`.

**Tech Stack:** Next.js 14 App Router, React 18, Mantine 7 (`Avatar`, `ActionIcon`), Tailwind CSS, next-intl 3, `@tabler/icons-react`.

## Global Constraints

- Reference source: `lf-iq/src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx` (visual language only; do NOT copy its portal/IntersectionObserver logic).
- Mantine/Tailwind rules: NO `Stack`/`Group`/`Text`/`Title`; use plain `<p>`/`<div>`. NEVER a raw `<button>` — use Mantine `ActionIcon` for the close control. Prefer Tailwind classes over `style={{}}`.
- i18n: reuse existing keys only — CTA = `Common.start_my_application`, close aria-label = `Common.close`. Do NOT add new keys. Locales in repo: en, es, he, vi, zh (`src/messages/*.json`).
- Breakpoints (from `tailwind.config.ts` → `screens`, which OVERRIDES Tailwind defaults): `xs` 576, `sm` 768, `md` 992, `lg` 1200, `xl` **1408**, `xxl` 1456. No `2xl`. The 480px cutoff uses arbitrary variant `max-[480px]:`.
- Brand orange = `hsl(25 95% 53%)` ≈ `#F8730A`.
- CTA destination = `convertPathToLOPage(ROUTES.APPLY, basePathLO)` from `@constants/routes` (same as the header button). `ROUTES.APPLY` = `/apply`.
- Data type: `ILOInfo` (`@apis/moso-types`). Fields used: `avatar`, `first_name`, `last_name`, `title`, `originator_nmls`.
- Avatar URL via `formatBlobImage(loInfo.avatar)` (`@utils/format`), fallback `IMAGES.DEFAULT_AVATAR` (`@constants/image-url`, top-level key = `/images/user-circle.svg`).
- Immutability: no mutation of `loInfo`/props.
- No test runner exists in this repo (no jest config, no `test` script). Verification gate = `npm run lint` + `npm run build` + visual preview at breakpoints. Do NOT scaffold a test harness for this change.
- Path aliases: `@components` → `src/shared/components`, `@constants` → `src/shared/constants`, `@utils` → `src/shared/utils`, `@apis` → `src/apis`.

---

### Task 1: Create the `LoanOfficerCard` component

**Files:**
- Create: `src/app/[locale]/(public)/(home)/_sections/LoanOfficerCard/index.tsx`

**Interfaces:**
- Consumes: `ILOInfo` from `@apis/moso-types`; `convertPathToLOPage`, `ROUTES` from `@constants/routes`; `formatBlobImage` from `@utils/format`; `IMAGES` from `@constants/image-url`; `SeoLink` from `@components/SeoLink`.
- Produces: `default export LoanOfficerCard` with props `{ loInfo?: ILOInfo | null; basePathLO?: string }`. Consumed by Task 2.

- [ ] **Step 1: Create the component file**

Create `src/app/[locale]/(public)/(home)/_sections/LoanOfficerCard/index.tsx` with exactly:

```tsx
'use client'

import { ActionIcon, Avatar } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { IMAGES } from '@constants/image-url'
import { ROUTES, convertPathToLOPage } from '@constants/routes'

import SeoLink from '@components/SeoLink'

import type { ILOInfo } from '@apis/moso-types'

import { formatBlobImage } from '@utils/format'

const SESSION_DISMISS_KEY = 'lo_card_dismissed'

const CARD_SURFACE =
  'bg-[linear-gradient(180deg,rgba(38,42,49,0.97),rgba(28,31,37,0.94))] border border-[rgba(248,115,10,0.38)] shadow-[0_12px_40px_rgba(8,10,14,0.5)]'
const CTA_CLASS =
  'block text-center text-white font-medium no-underline rounded-full bg-[linear-gradient(135deg,#F8730A,#FF9E2C)] shadow-[0_6px_18px_rgba(248,115,10,0.4)] hover:opacity-90 transition-opacity'

interface LoanOfficerCardProps {
  loInfo?: ILOInfo | null
  basePathLO?: string
}

const LoanOfficerCard = ({ loInfo, basePathLO }: LoanOfficerCardProps) => {
  const tCommon = useTranslations('Common')
  // Start hidden to avoid a flash before sessionStorage is read on mount.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true')
  }, [])

  if (!loInfo || dismissed) return null

  const name = `${loInfo.first_name ?? ''} ${loInfo.last_name ?? ''}`.trim()
  if (!name) return null

  const subLine = loInfo.originator_nmls ? `${loInfo.title} · NMLS ${loInfo.originator_nmls}` : loInfo.title
  const applyHref = convertPathToLOPage(ROUTES.APPLY, basePathLO)
  const avatarSrc = formatBlobImage(loInfo.avatar) || IMAGES.DEFAULT_AVATAR
  const ctaLabel = tCommon('start_my_application')

  const handleClose = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <>
      {/* ≥ xl (1408px): vertical card docked flush to the right edge, vertically centered */}
      <div
        className={`fixed right-0 top-1/2 z-40 hidden w-[206px] -translate-y-1/2 rounded-l-2xl px-4 pb-5 pt-6 text-center print:hidden xl:block ${CARD_SURFACE}`}
      >
        <ActionIcon
          onClick={handleClose}
          aria-label={tCommon('close')}
          variant="transparent"
          size="sm"
          className="!absolute right-2 top-2 text-gray-300 hover:text-white"
        >
          <IconX size={16} />
        </ActionIcon>
        <Avatar
          src={avatarSrc}
          alt={name}
          size={72}
          radius={999}
          className="mx-auto rounded-full border-[3px] border-[rgba(248,115,10,0.5)]"
        />
        <p className="mt-3 text-base font-medium text-[#f4f6f9]">{name}</p>
        <p className="mt-1 text-xs text-[#F8912E]">{subLine}</p>
        <SeoLink href={applyHref} title={ctaLabel} className={`mt-4 px-3 py-3 text-sm ${CTA_CLASS}`}>
          {ctaLabel}
        </SeoLink>
      </div>

      {/* < xl: horizontal bar docked bottom-center; text block hidden below 480px */}
      <div
        className={`fixed bottom-4 left-1/2 z-40 flex w-[min(90%,510px)] -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 print:hidden xl:hidden ${CARD_SURFACE}`}
      >
        <Avatar
          src={avatarSrc}
          alt={name}
          size={50}
          radius={999}
          className="shrink-0 rounded-full border-[3px] border-[rgba(248,115,10,0.5)]"
        />
        <div className="min-w-0 flex-1 text-left max-[480px]:hidden">
          <p className="truncate text-[15px] font-medium text-[#f4f6f9]">{name}</p>
          <p className="mt-0.5 truncate text-xs text-[#F8912E]">{subLine}</p>
        </div>
        <SeoLink href={applyHref} title={ctaLabel} className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm ${CTA_CLASS}`}>
          {ctaLabel}
        </SeoLink>
        <ActionIcon
          onClick={handleClose}
          aria-label={tCommon('close')}
          variant="transparent"
          size="sm"
          className="shrink-0 text-gray-300 hover:text-white"
        >
          <IconX size={16} />
        </ActionIcon>
      </div>
    </>
  )
}

export default LoanOfficerCard
```

- [ ] **Step 2: Lint the new file**

Run: `cd lo-homepage && npx eslint "src/app/[locale]/(public)/(home)/_sections/LoanOfficerCard/index.tsx"`
Expected: no errors. (If `SeoLink`'s className/href typing complains, keep the props as shown — `SeoLink` already accepts `href`, `title`, `className`, `children` as used across `_sections`.)

- [ ] **Step 3: Verify `Common.close` and `Common.start_my_application` resolve in every locale**

Run: `cd lo-homepage && node -e "for (const l of ['en','es','he','vi','zh']){const m=require('./src/messages/'+l+'.json'); if(!m.Common||!m.Common.close||!m.Common.start_my_application){console.error('MISSING in '+l); process.exit(1)} } console.log('all locales OK')"`
Expected: `all locales OK`. If any locale is missing `Common.close`, add `"close": "<translation>"` under that locale's `Common` object (translate appropriately) and re-run.

- [ ] **Step 4: Commit**

```bash
cd lo-homepage
git add "src/app/[locale]/(public)/(home)/_sections/LoanOfficerCard/index.tsx"
git commit -m "feat: add Loan Officer card to homepage (identity + Start My Application CTA)"
```

---

### Task 2: Render the card from `HomePage`

**Files:**
- Modify: `src/app/[locale]/(public)/(home)/_sections/HomePage/index.tsx`

**Interfaces:**
- Consumes: `LoanOfficerCard` (default export) from Task 1; existing local vars `loInfo` and `basePathLO` already present in `HomePage`.

- [ ] **Step 1: Add the import**

In `src/app/[locale]/(public)/(home)/_sections/HomePage/index.tsx`, add alongside the other section imports (e.g. next to `import UserProfile from '../UserProfile'`):

```tsx
import LoanOfficerCard from '../LoanOfficerCard'
```

- [ ] **Step 2: Render the card inside the returned fragment**

In the final `return ( <> ... </> )`, add the card as the last child of the fragment, immediately before the closing `</>`:

```tsx
      <div className="flex flex-col gap-36 mb-36">
        {finalSections.map((section) => (
          <div key={section.id}>
            {section.id === '__lowest_rate_campaign__' ? (
              <div className="container mx-auto">
                <LowestRateCampaignBanner loInfo={loInfo} basePathLO={basePathLO} className="pt-10 max-w-2xl mx-auto" />
              </div>
            ) : (
              sectionComponents[section.id]
            )}
          </div>
        ))}
      </div>
      <LoanOfficerCard loInfo={loInfo} basePathLO={basePathLO} />
    </>
```

- [ ] **Step 3: Build to verify types and compilation**

Run: `cd lo-homepage && npm run build`
Expected: build completes with no TypeScript or ESLint errors. (Note: the homepage returns `null` without an `x-lo-key` header, so a green build is the compile-time gate; runtime visual checks happen in Task 3 on preview.)

- [ ] **Step 4: Commit**

```bash
cd lo-homepage
git add "src/app/[locale]/(public)/(home)/_sections/HomePage/index.tsx"
git commit -m "feat: render Loan Officer card on homepage"
```

---

### Task 3: Visual + interaction verification on preview

**Files:** none (verification only).

Local `next dev` of the homepage requires the LO middleware to inject `x-lo-key` (the page renders `null` otherwise), and per prior notes lo-homepage PublicLayout pages can 500 in local dev. So verify on a real LO preview URL (e.g. a `suongloanofficer`-style deploy / staging) rather than plain localhost.

- [ ] **Step 1: Wide layout (≥ 1408px)**

Open the LO homepage at viewport width ≥ 1408px. Confirm: a dark card with orange border is docked flush to the right edge, vertically centered, left corners rounded / right edge flat, and it does NOT overlap the centered Mortgage Rates form. Card shows avatar, `${first_name} ${last_name}`, `${title} · NMLS ${originator_nmls}`, and the orange "Start My Application" button.

- [ ] **Step 2: Below xl (e.g. 1200px and 768px)**

Resize below 1408px. Confirm the card becomes a horizontal bar docked bottom-center (avatar + name/NMLS + CTA + X), max-width ~510px, no horizontal overflow.

- [ ] **Step 3: Mobile (< 480px, e.g. 375px)**

Resize to 375px. Confirm the bottom bar hides the name/NMLS text block, leaving avatar + "Start My Application" + X, with no overflow.

- [ ] **Step 4: CTA + close behavior**

Click "Start My Application" → navigates to the LO apply page (`/apply` under the LO base path). Reload, click X → card disappears; reload the page → card stays hidden (sessionStorage). Open a fresh tab/session → card reappears.

- [ ] **Step 5: Screenshot the three breakpoints and share with the user for sign-off.**

---

## Notes for the implementer

- The card intentionally uses `position: fixed` (not lf-iq's `createPortal` into a rail) because the homepage layout has no dedicated right column.
- `z-40` keeps the card below the site header (`z-50`) and NiceModal overlays.
- Do not add the dual-state "ask your LO" form — out of scope for this homepage card.
