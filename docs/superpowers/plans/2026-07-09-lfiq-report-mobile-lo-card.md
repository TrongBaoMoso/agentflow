# lf-iq Report — mobile LO card + compact rate action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the lf-iq homeowner report, show `RefinanceLoanOfficerCard` on small screens (`< md`) as a bottom-left card that collapses to a "Your LO" FAB on scroll, and turn the "Check Today's Rate" floating trigger into a compact icon button on the right edge — desktop unchanged.

**Architecture:** `RefinanceLoanOfficerCard` keeps its desktop `createPortal` into `#refinance-lo-rail` for `≥ xl` and gains a second `fixed md:hidden` render branch for `< md` that reuses the same data + `inRefinanceBand` observer (so the Refinance-NOW / ask-LO body still swaps), plus a lo-homepage-style collapse-to-FAB with a shared `lastScrollY` ref. `RateCheckModal`'s `FloatingTriggerButton` becomes icon-only below `md`.

**Tech Stack:** Next.js 14, React 18, Mantine 7 (`UnstyledButton`, `ActionIcon`, `Button`, `Textarea`), Tailwind, next-intl 3, `@tabler/icons-react`.

## Global Constraints

- Breakpoints (lf-iq `tailwind.config.ts`): `md` = 992px, `xl` = 1408px. New floating mobile behavior applies at `< md` only (`md:hidden`). `≥ md` sidebar rate button and `≥ xl` rail LO card are behavior-unchanged.
- Mantine/Tailwind: no `Stack`/`Group`/`Text`/`Title`; no raw `<button>` (use `UnstyledButton` for the FAB, `ActionIcon` for the collapse chevron). This file is already heavily inline-styled for the dark card; reuse the shared `SURFACE` style object for the brand gradient/border/shadow and use Tailwind for layout/positioning/transitions.
- Brand orange `hsl(25 95% 53%)`; dark card surface `linear-gradient(180deg, hsla(220,14%,18%,0.92), hsla(220,14%,14%,0.85))`, border `1px solid hsla(25,95%,53%,0.30)`, shadow `0 12px 40px hsla(220,30%,4%,0.45)`, `backdrop-filter: blur(12px)`.
- Reuse the existing IntersectionObserver, `handleSendQuestion`, `applyHref`, and `body` (Refinance link / ask form) — do NOT duplicate that logic; render the shared `body` in both branches.
- Collapse logic (identical to shipped lo-homepage): scroll down (`window.scrollY` rising, `> 24`) → collapse; `<= 8` → expand; tap FAB → expand (reset `lastScrollY`); tap `⌄` → collapse. `lastScrollY` is a `useRef`.
- i18n: lf-iq has 7 locales (ar, en, es, he, ko, vi, zh). Add `your_lo` + `minimize` under the existing `ReportRefinance` namespace. Rate icon reuses `RateCheckModal.floating_button_aria`.
- Motion on transform/opacity only; `print:hidden`; `z-40`.
- Run `npm run build` after changes (lf-iq gate). No new unit tests (repo's report UI is not unit-tested; Jest runs on pre-push).

---

### Task 1: `RefinanceLoanOfficerCard` — add mobile branch + i18n

**Files:**
- Modify (replace full contents): `src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx`
- Modify: `src/messages/{ar,en,es,he,ko,vi,zh}.json` (add 2 keys under `ReportRefinance`)

**Interfaces:**
- Produces: unchanged public API — `default export RefinanceLoanOfficerCard`, named export `LO_CARD_RAIL_ID`. Props unchanged (`loanOfficer`, `applyHref`, `ownerName`, `sectionId`).

- [ ] **Step 1: Replace the component file with the new version**

Replace the ENTIRE contents of `src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx` with:

```tsx
import { ActionIcon, Button, Textarea, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconSend } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { RelatedUser } from '@shared/types/report'

import { IMAGES } from '@constants/image-url'
import SeoImage from '@shared/components/SeoImage'
import SeoLink from '@shared/components/SeoLink'
import { trackUsageClick } from '@shared/usage' // [usage-tracking]

import { sendEmailToUsers } from '@apis/private-api'

import useToast from '@hooks/useToast'

import { extractErrorMessage } from '@utils/errorUtils'

/** Width of the desktop rail card. */
const CARD_WIDTH = 220
/** Default id of the Refinance section the card tracks to swap its CTA. */
const DEFAULT_SECTION_ID = 'refinance'
/** Template rendered by moso-notifier for the "ask your LO" quick question. */
const HO_QUESTION_TEMPLATE_KEY = 'ho_question_template'
/** Conversation-history "Type" for this custom send (surfaces as extra_attributes.action). */
const HO_QUESTION_ACTION = 'HOMEOWNER_QUESTION'
/**
 * Id of the page-level right rail (rendered in page.tsx). The rail is `hidden xl:block`, so the
 * portaled desktop card is only visible at xl+. The mobile branch below is separate (`md:hidden`).
 */
export const LO_CARD_RAIL_ID = 'refinance-lo-rail'

/** Shared dark surface (brand gradient/border/shadow) reused by the desktop card, mobile card, and FAB. */
const SURFACE = {
  background: 'linear-gradient(180deg, hsla(220, 14%, 18%, 0.92), hsla(220, 14%, 14%, 0.85))',
  border: '1px solid hsla(25, 95%, 53%, 0.30)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 12px 40px hsla(220, 30%, 4%, 0.45)'
} as const

interface RefinanceLoanOfficerCardProps {
  loanOfficer?: RelatedUser
  /** Destination for the "Refinance NOW" CTA — the Loan Officer's apply page. */
  applyHref: string
  /** Homeowner's display name — used as a template param in the question email. */
  ownerName?: string
  /** Id of the section the card tracks to swap between its two CTAs. */
  sectionId?: string
}

/**
 * Loan Officer card. On xl+ it portals into the right rail (#refinance-lo-rail) and sticks at the
 * vertical center. On < md it renders as a fixed bottom-left card that collapses to a "Your LO"
 * FAB on scroll-down (tap to expand). Both share the same identity + body, and the body swaps
 * between a "Refinance NOW" CTA (in the Refinance section) and an "ask your LO" form elsewhere.
 */
const RefinanceLoanOfficerCard = ({
  loanOfficer,
  applyHref,
  ownerName,
  sectionId = DEFAULT_SECTION_ID
}: RefinanceLoanOfficerCardProps) => {
  const t = useTranslations()
  const { notifySuccess, notifyError } = useToast()

  const [inRefinanceBand, setInRefinanceBand] = useState(false)
  const [railEl, setRailEl] = useState<HTMLElement | null>(null)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  // Mobile (< md): whether the card is collapsed into the FAB.
  const [collapsed, setCollapsed] = useState(false)
  // Shared last scrollY so a manual expand can't be undone by the next scroll tick.
  const lastScrollY = useRef(0)

  const name = useMemo(() => {
    if (!loanOfficer) return ''
    return `${loanOfficer.first_name ?? ''} ${loanOfficer.last_name ?? ''}`.trim()
  }, [loanOfficer])

  const loEmail = loanOfficer?.company_email ?? loanOfficer?.email ?? ''

  useEffect(() => {
    setRailEl(document.getElementById(LO_CARD_RAIL_ID))
  }, [])

  useEffect(() => {
    const section = document.getElementById(sectionId)
    if (!section) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setInRefinanceBand(entry.isIntersecting)),
      { threshold: 0, rootMargin: '-60% 0px -35% 0px' }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [sectionId])

  // Mobile collapse-on-scroll. Harmless at xl+ (the desktop card lives in the rail, not the FAB).
  useEffect(() => {
    lastScrollY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastScrollY.current && y > 24) setCollapsed(true)
      else if (y <= 8) setCollapsed(false)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSendQuestion = async () => {
    const trimmed = question.trim()
    if (!trimmed) {
      notifyError(t('Notification.question_required'))
      return
    }
    if (!loEmail) {
      notifyError(t('Notification.question_send_failed'))
      return
    }

    setSending(true)
    try {
      await sendEmailToUsers({
        recipients: [{ email: loEmail, name: name || undefined }],
        subject: t('ReportRefinance.ask_lo_email_subject'),
        template_key: HO_QUESTION_TEMPLATE_KEY,
        params: {
          action: HO_QUESTION_ACTION,
          loName: name,
          question: trimmed,
          ownerName: ownerName ?? ''
        }
      })
      notifySuccess(t('Notification.question_sent_successfully'))
      setQuestion('')
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error, t('Notification.question_send_failed')))
    } finally {
      setSending(false)
    }
  }

  const handleExpand = () => {
    lastScrollY.current = window.scrollY
    setCollapsed(false)
  }

  if (!loanOfficer || !name) return null

  const nmlsLabel = loanOfficer.nmls ? `${loanOfficer.title} · NMLS ${loanOfficer.nmls}` : loanOfficer.title
  const avatarSrc = loanOfficer.avatar || IMAGES.USERS.DEFAULT_AVATAR

  // Shared body: Refinance CTA in the refinance band, else the ask-LO form. Reused by both branches.
  const body = inRefinanceBand ? (
    <SeoLink
      href={applyHref}
      isExternal
      title={t('ReportRefinance.refinance_now')}
      data-engagement-action="btn_refinance_now"
      onClick={() => trackUsageClick('report_cta_refinance_now', { sync: true })} // [usage-tracking]
      className="flex items-center justify-center gap-2 mt-4 font-bold uppercase"
      style={{
        padding: '12px 14px',
        borderRadius: 999,
        fontSize: 14,
        letterSpacing: 0.5,
        color: '#fff',
        textDecoration: 'none',
        background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(35, 100%, 58%))',
        boxShadow: '0 6px 20px hsla(25, 95%, 53%, 0.35)'
      }}
    >
      {t('ReportRefinance.refinance_now')}
    </SeoLink>
  ) : (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-xs font-semibold" style={{ color: 'hsl(210, 20%, 90%)' }}>
        {t('ReportRefinance.ask_lo_title')}
      </p>
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.currentTarget.value)}
        placeholder={t('ReportRefinance.ask_lo_placeholder')}
        autosize
        minRows={3}
        maxRows={5}
        disabled={sending}
        data-engagement-action="ask_lo_question"
        styles={{
          input: {
            background: 'hsla(220, 14%, 12%, 0.7)',
            border: '1px solid hsla(220, 12%, 30%, 0.6)',
            color: 'hsl(210, 20%, 92%)',
            fontSize: 13
          }
        }}
      />
      <Button
        onClick={handleSendQuestion}
        loading={sending}
        disabled={!question.trim() || !loEmail}
        leftSection={<IconSend size={15} stroke={1.8} />}
        radius="xl"
        fullWidth
        styles={{
          root: {
            background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(35, 100%, 58%))',
            color: '#fff',
            fontWeight: 700,
            height: 38,
            border: 'none'
          }
        }}
      >
        {t('ReportRefinance.ask_lo_send')}
      </Button>
    </div>
  )

  // Desktop rail card (xl+), portaled into #refinance-lo-rail.
  const desktopCard = (
    <div className="flex justify-start" style={{ position: 'sticky', top: '50vh', transform: 'translateY(-50%)' }}>
      <div style={{ width: CARD_WIDTH, padding: '22px 18px', textAlign: 'center', borderRadius: 16, ...SURFACE }}>
        <div
          style={{
            width: 76,
            height: 76,
            margin: '0 auto',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid hsla(25, 95%, 53%, 0.40)',
            boxShadow: '0 0 20px hsla(25, 95%, 53%, 0.12)'
          }}
        >
          <SeoImage src={avatarSrc} alt={name} className="w-full h-full object-cover" />
        </div>
        <p className="text-base font-bold mt-3" style={{ color: 'hsl(210, 20%, 97%)' }}>
          {name}
        </p>
        <p className="text-xs mt-1" style={{ color: 'hsl(25, 95%, 53%)' }}>
          {nmlsLabel}
        </p>
        {body}
      </div>
    </div>
  )

  return (
    <>
      {railEl && createPortal(desktopCard, railEl)}

      {/* Mobile (< md): floating card bottom-left; collapses to a FAB on scroll-down. */}
      <div className="md:hidden">
        <div
          className={`fixed bottom-3 left-3 z-40 w-[min(84%,320px)] rounded-2xl p-3 transition-all duration-300 ease-out print:hidden ${
            collapsed ? 'pointer-events-none translate-y-[180%] opacity-0' : 'translate-y-0 opacity-100'
          }`}
          style={SURFACE}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid hsla(25, 95%, 53%, 0.45)'
              }}
            >
              <SeoImage src={avatarSrc} alt={name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold" style={{ color: 'hsl(210, 20%, 97%)' }}>
                {name}
              </p>
              <p className="truncate text-[11px]" style={{ color: 'hsl(25, 95%, 53%)' }}>
                {nmlsLabel}
              </p>
            </div>
            <ActionIcon
              onClick={() => setCollapsed(true)}
              aria-label={t('ReportRefinance.minimize')}
              variant="transparent"
              size="sm"
              className="shrink-0"
              style={{ color: 'hsl(210, 16%, 75%)' }}
            >
              <IconChevronDown size={16} />
            </ActionIcon>
          </div>
          {body}
        </div>

        <UnstyledButton
          onClick={handleExpand}
          aria-label={t('ReportRefinance.your_lo')}
          className={`fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 transition-all duration-300 ease-out print:hidden ${
            collapsed ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[180%] opacity-0'
          }`}
          style={SURFACE}
        >
          <div
            style={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid hsla(25, 95%, 53%, 0.45)'
            }}
          >
            <SeoImage src={avatarSrc} alt={name} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'hsl(25, 95%, 53%)' }}>
            {t('ReportRefinance.your_lo')}
          </span>
          <IconChevronUp size={15} style={{ color: 'hsl(210, 16%, 75%)' }} />
        </UnstyledButton>
      </div>
    </>
  )
}

export default RefinanceLoanOfficerCard
```

- [ ] **Step 2: Add the two i18n keys under `ReportRefinance` in all 7 locales**

In each of `src/messages/{en,vi,es,zh,ko,he,ar}.json`, add `your_lo` and `minimize` inside the existing `"ReportRefinance"` object (valid JSON, mind commas), with these values:

- en: `"your_lo": "Your LO"`, `"minimize": "Minimize"`
- vi: `"your_lo": "LO của bạn"`, `"minimize": "Thu gọn"`
- es: `"your_lo": "Tu LO"`, `"minimize": "Minimizar"`
- zh: `"your_lo": "您的贷款专员"`, `"minimize": "最小化"`
- ko: `"your_lo": "담당 대출 상담사"`, `"minimize": "최소화"`
- he: `"your_lo": "היועץ שלך"`, `"minimize": "מזעור"`
- ar: `"your_lo": "مسؤول القرض"`, `"minimize": "تصغير"`

- [ ] **Step 3: Verify i18n keys resolve in all 7 locales**

Run:
```
cd /Users/apple/Projects/agentflow/lf-iq && node -e "for (const l of ['ar','en','es','he','ko','vi','zh']){const m=require('./src/messages/'+l+'.json'); if(!m.ReportRefinance||!m.ReportRefinance.your_lo||!m.ReportRefinance.minimize){console.error('MISSING in '+l);process.exit(1)}} console.log('i18n OK')"
```
Expected: `i18n OK`.

- [ ] **Step 4: Lint the component**

Run: `cd /Users/apple/Projects/agentflow/lf-iq && npx eslint "src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx"`
Expected: exit 0 (run with `--fix` if prettier reflows; keep the result).

- [ ] **Step 5: Build**

Run: `cd /Users/apple/Projects/agentflow/lf-iq && npm run build`
Expected: exit 0, no TS/ESLint errors.

- [ ] **Step 6: Commit**

```bash
cd <worktree>
git add "src/app/[locale]/(private)/[id]/_components/RefinanceLoanOfficerCard/index.tsx" src/messages/en.json src/messages/vi.json src/messages/es.json src/messages/zh.json src/messages/ko.json src/messages/he.json src/messages/ar.json
git commit -m "feat: show Refinance LO card on mobile (collapse-to-FAB) on homeowner report"
```

---

### Task 2: `RateCheckModal` — compact icon-only rate trigger on mobile

**Files:**
- Modify: `src/app/[locale]/(private)/[id]/_sections/RateCheckModal/index.tsx` (the `FloatingTriggerButton` JSX only)

**Interfaces:**
- Consumes: nothing new. The `label`/`ariaLabel` props already exist.

- [ ] **Step 1: Make the floating trigger icon-only below `md`**

In `FloatingTriggerButton`, replace this block:

```tsx
  const button = (
    <UnstyledButton
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={!isDataReady || undefined}
      data-engagement-action="floating_open"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:static md:translate-x-0 md:w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-semibold shadow-2xl transition-transform disabled:opacity-70 disabled:cursor-not-allowed enabled:hover:scale-105"
      style={{ background: 'hsl(25, 95%, 53%)' }}
    >
      {isDisabled ? (
        <IconRefresh size={20} stroke={2} className="animate-spin" />
      ) : (
        <IconTrendingUp size={20} stroke={2} />
      )}
      <span className="text-sm">{label}</span>
    </UnstyledButton>
  )
```

with:

```tsx
  const button = (
    <UnstyledButton
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={!isDataReady || undefined}
      data-engagement-action="floating_open"
      className="fixed bottom-[70px] right-3 z-40 h-12 w-12 rounded-full md:static md:right-auto md:h-auto md:w-full md:rounded-2xl flex items-center justify-center gap-2.5 md:px-6 md:py-3.5 text-white font-semibold shadow-2xl transition-transform disabled:opacity-70 disabled:cursor-not-allowed enabled:hover:scale-105"
      style={{ background: 'hsl(25, 95%, 53%)' }}
    >
      {isDisabled ? (
        <IconRefresh size={20} stroke={2} className="animate-spin" />
      ) : (
        <IconTrendingUp size={20} stroke={2} />
      )}
      <span className="hidden md:inline text-sm">{label}</span>
    </UnstyledButton>
  )
```

Rationale: below `md` the trigger is a 48px round icon pinned bottom-right at `bottom-[70px]` (sits above the external chat bubble at bottom-right); the text label is hidden (`hidden md:inline`), so the accessible name comes from `aria-label` + the existing `Tooltip`. At `md+` it reverts to the full-width sidebar pill exactly as before.

- [ ] **Step 2: Lint**

Run: `cd /Users/apple/Projects/agentflow/lf-iq && npx eslint "src/app/[locale]/(private)/[id]/_sections/RateCheckModal/index.tsx"`
Expected: exit 0.

- [ ] **Step 3: Build**

Run: `cd /Users/apple/Projects/agentflow/lf-iq && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd <worktree>
git add "src/app/[locale]/(private)/[id]/_sections/RateCheckModal/index.tsx"
git commit -m "feat: compact icon-only rate trigger on mobile report"
```

---

### Task 3: Visual + interaction verification on preview

**Files:** none.

The homeowner report needs auth + a valid report id + lfiq-backend, so it can't be exercised in a trivial local preview. Verify on a running lf-iq (dev with a real report, or a preview/staging report URL) at mobile widths.

- [ ] **Step 1: `< md` (e.g. 375 / 430 / 768)** — the LO card shows bottom-left, expanded by default; its body swaps Refinance-NOW ↔ ask-LO form when the Refinance section scrolls into the tracking band (same as desktop).
- [ ] **Step 2: Scroll** — scrolling down collapses the LO card into a "Your LO" FAB (bottom-left); scrolling to the top / tapping the FAB expands it; a stray scroll right after a manual tap does not re-collapse it.
- [ ] **Step 3: Rate trigger** — it is a round icon button on the right (`bottom-[70px]`), no two-line wrap, above the chat bubble; does not overlap the LO card/FAB. Tapping opens the rate modal.
- [ ] **Step 4: `≥ md` / `≥ xl`** — the sidebar rate pill (with label) and the right-rail LO card are unchanged.
- [ ] **Step 5: Screenshot the mobile states and share for sign-off.**

---

## Notes for the implementer
- Do not change `ReportHero`'s "Your Loan Officer" contact card — out of scope.
- The chat bubble is an external widget (not in report code); just avoid overlapping it (rate icon at `bottom-[70px]` right, LO on the left).
- Both branches render the shared `body`, so the ask-LO Textarea exists twice in the DOM but only one branch is visible per breakpoint (desktop rail `hidden xl:block`; mobile `md:hidden`) — they never both show.
