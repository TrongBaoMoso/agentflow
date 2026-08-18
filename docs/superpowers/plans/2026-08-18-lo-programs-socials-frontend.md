# LO Programs socials — lf-homepage frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved v7 form (level cards, sticky footer), replace the two social text inputs with a compact social-profile table, make the connections question conditional, reduce the hero to one CTA, and enrich the admin listing.

**Architecture:** The form stays catalog-driven — questions render from `detail.forms`, never from hardcoded inputs. New work is three components (`LevelCardsField`, `SocialProfilesField`, admin `SocialPopover`) plus one constants module that makes every token typed instead of `string`. The ALLY-measured rows arrive on the existing `/lo-programs/me` payload, so no new client-side fetch.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, Mantine 7 + Tailwind 3, react-hook-form + joi, next-intl (5 locales), ported v7 CSS under `.lop`.

**Spec:** `docs/superpowers/specs/2026-08-18-lo-programs-socials-and-form-design.md`
**Approved mockup:** `docs/mockups/lo-ambassador-apply-v2.html` — open it and match it; it is interactive, so click through the four scenario tabs before writing code.

## Global Constraints

- Repo `lf-homepage`. Base branch **`production`**. Feature branch → PR into `master` (auto-merge), then a **separate manual PR** into the release branch.
- Worktree at `/Users/apple/Projects/agentflow/.worktrees/<name>` — outside the repo, or eslint resolves the wrong config. **Never symlink `node_modules`**: npm inside a worktree with a symlinked `node_modules` wipes the main checkout. Run a real `npm ci` and copy the gitignored lockfile.
- **There is no test runner here.** `jest` sits in devDependencies via an eslint plugin, but there is no `test` script and no jest config. Verification is `npx tsc --noEmit`, `npm run build`, and driving the page in the browser. Do not invent a test command.
- Never run `npm run build` while `next dev` is running — they clash over `.next` and corrupt it.
- `src/middleware.ts` in this checkout carries a permanent local-only edit. Never stage, commit, push or revert it.
- i18n: every string goes through `useTranslations` / `getTranslations` and lands in **all five** locales (`en`, `es`, `vi`, `zh`, `he`). Keys are snake_case.
- Mantine `Stack`/`Group`/`Text`/`Title` are not used in this codebase — compose with Tailwind and the `.lop` classes already ported from v7.
- Level ids from the backend plan: `general_participation`, `lo_ambassador`, `senior_lo_ambassador`. Ordering lives in `rank`, never in the id.
- Three items carry `[PROPOSAL]` in the mockup (social table replacing the two link fields, conditional `connections_range`, applicant self-reporting). Build them; do not ship to production before the program owner confirms.

---

### Task 1: Typed tokens and the new API shape

**Files:**
- Create: `src/shared/constants/loPrograms.ts`
- Modify: `src/apis/loProgramsApi.ts`

**Interfaces:**
- Produces:
  - `SOCIAL_NETWORKS`, `AUDIENCE_LABELS`, `SOCIAL_SOURCES`, `CONNECTIONS_RANGES` as `as const` arrays plus the matching union types `SocialNetwork`, `AudienceLabel`, `SocialSource`, `ConnectionsRange`.
  - `detectNetwork(url: string): { network: SocialNetwork; label: string | null; audienceLabel: AudienceLabel } | null`
  - `LoProgramSocialProfile`, `LoProgramAudienceSummary` types.
  - `LoProgramMine.ally_social_profiles: LoProgramSocialProfile[] | null`
  - `SubmitLoProgramApplicationRequest.social_profiles?: { url: string; audience_count: number }[]`

- [ ] **Step 1: Create the constants module**

`src/shared/constants/loPrograms.ts`:

```ts
import { SOCIAL_URL_PATTERNS } from './social-links'

/**
 * LO Programs tokens. Declared `as const` and turned into unions so a token is
 * never a bare `string` at a call site — the backend enforces the same lists via
 * mongoose `enum:`, and these two are the only places either side states them.
 */
export const SOCIAL_NETWORKS = [
  'facebook_fanpage',
  'facebook_profile',
  'google_my_business',
  'instagram',
  'linked_in',
  'tiktok',
  'twitter',
  'yelp',
  'youtube',
  'zillow',
  'others'
] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

export const AUDIENCE_LABELS = ['followers', 'friends', 'connections', 'subscribers', 'members'] as const
export type AudienceLabel = (typeof AUDIENCE_LABELS)[number]

export const SOCIAL_SOURCES = ['ally', 'moso_profile', 'self_reported'] as const
export type SocialSource = (typeof SOCIAL_SOURCES)[number]

export const CONNECTIONS_RANGES = [
  'under_500',
  '500_1000',
  '1000_2000',
  '2000_5000',
  '5000_plus'
] as const
export type ConnectionsRange = (typeof CONNECTIONS_RANGES)[number]

/**
 * What the number means for each network. A follower is not a connection is not
 * a friend, so the unit travels with the count rather than being flattened away.
 */
export const AUDIENCE_LABEL_BY_NETWORK: Record<SocialNetwork, AudienceLabel> = {
  facebook_fanpage: 'followers',
  facebook_profile: 'friends',
  google_my_business: 'followers',
  instagram: 'followers',
  linked_in: 'connections',
  tiktok: 'followers',
  twitter: 'followers',
  yelp: 'followers',
  youtube: 'subscribers',
  zillow: 'followers',
  others: 'followers'
}

/**
 * Host → network. Derived from the URL the applicant pasted, never asked:
 * a link already says which network it is, and a chosen network that disagreed
 * with its link would be one more thing for a reviewing manager to distrust.
 *
 * `SOCIAL_URL_PATTERNS` already encodes these hosts for the profile settings
 * form, so this reads them rather than restating them. moso-aid re-derives the
 * same thing server-side; this exists to label the row while the applicant types.
 */
const NETWORK_ORDER: SocialNetwork[] = [
  'linked_in',
  'facebook_fanpage',
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'yelp',
  'zillow',
  'google_my_business'
]

export const detectNetwork = (
  raw: string
): { network: SocialNetwork; label: string | null; audienceLabel: AudienceLabel } | null => {
  const value = (raw || '').trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  if (!url.hostname.includes('.')) return null

  const href = url.toString()
  const network = NETWORK_ORDER.find((candidate) => SOCIAL_URL_PATTERNS[candidate]?.test(href))

  return network
    ? { network, label: null, audienceLabel: AUDIENCE_LABEL_BY_NETWORK[network] }
    : { network: 'others', label: url.hostname, audienceLabel: 'followers' }
}
```

Note: `SOCIAL_URL_PATTERNS` matches on `^https://…`, so pass the normalised `href`, not the raw input. Check `facebook_profile` — it shares Facebook's pattern, so `facebook_fanpage` wins by order; that is correct, since a page and a profile are indistinguishable from the URL alone and `friends`/`followers` is a difference only ALLY can resolve.

- [ ] **Step 2: Add the API types**

In `src/apis/loProgramsApi.ts`, add near `LoProgramAllyReadiness`:

```ts
/**
 * One social profile on an application, or one ALLY measured for the viewer.
 * `audience_count: null` means not measured — distinct from 0, which is a
 * measurement. `source` is the provenance a reviewing manager reads; it is set
 * by moso-aid, never by the browser.
 */
export interface LoProgramSocialProfile {
  network: SocialNetwork
  label: string | null
  url: string
  audience_count: number | null
  audience_label: AudienceLabel | null
  metrics: Record<string, number>
  source: SocialSource
  captured_at: string | null
}

/** Measured and claimed stay separate figures, in every surface. */
export interface LoProgramAudienceSummary {
  measured_total: number
  claimed_total: number
  profile_count: number
  range: ConnectionsRange | null
  range_source: 'derived' | 'self_declared' | null
}
```

Import the token types from `@constants/loPrograms` (check `tsconfig.json` for the actual alias — the codebase uses `@utils`, `@apis`, `@components`, `@fields`; use whichever alias maps to `src/shared/constants`, or a relative path if none does).

Extend the existing interfaces:

```ts
export interface LoProgramMine {
  latest_application: LoProgramApplicationSummary | null
  current_level_id: string | null
  ally_readiness: LoProgramAllyReadiness | null
  /**
   * Profiles ALLY measured for this viewer. `null` is "could not ask" and must
   * render as if the question had not been asked — never as "they have none",
   * which is what `[]` means.
   */
  ally_social_profiles: LoProgramSocialProfile[] | null
}

export interface LoProgramApplication extends LoProgramApplicationSummary {
  // …existing fields…
  social_profiles: LoProgramSocialProfile[]
  audience_summary: LoProgramAudienceSummary
}

export interface SubmitLoProgramApplicationRequest {
  // …existing fields…
  /**
   * Only what the applicant typed. Network, unit, provenance and every total are
   * derived by moso-aid from the URL: sending them would only create a way to
   * put a false provenance next to a real number.
   */
  social_profiles?: { url: string; audience_count: number }[]
}
```

Also add `'social_profiles'` to `LoProgramFormField['type']`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. Errors here are import-alias problems — fix the alias, do not weaken a type.

- [ ] **Step 4: Commit**

```bash
git add src/shared/constants/loPrograms.ts src/apis/loProgramsApi.ts
git commit -m "feat(lo-programs): typed tokens + social profile API types"
```

---

### Task 2: Stop `level.key` doing two jobs

**Files:**
- Modify: `src/app/[locale]/(public)/ambassador-program/_sections/LevelsSection/index.tsx`

**Interfaces:**
- Consumes: the backend plan's level ids.
- Produces: a `LEVELS` constant whose entries carry both `levelId` (matches the catalog) and `copyKey` (matches i18n), used by Task 6's hero too.

**Why this comes before anything else:** `level.key` is currently both the i18n copy key (`levels.l2.cta`) and the catalog level id (`status.openLevelIds.includes(level.key)`, `defaultLevelId={level.key}`). Renaming the ids would silently break the level cards' apply buttons while the copy kept working — the worst kind of failure, because the page still renders.

- [ ] **Step 1: Split the two identities**

```tsx
/**
 * `levelId` matches the catalog; `copyKey` matches the i18n tree. They were one
 * field until the level ids became semantic slugs — at which point matching
 * `openLevelIds` against an i18n key would have silently hidden every apply
 * button while the marketing copy carried on rendering.
 */
const LEVELS = [
  { levelId: 'general_participation', copyKey: 'l1', rank: 1, mod: 'tier--1', requirements: 4, benefits: 2, hasTarget: false, delay: 0 },
  { levelId: 'lo_ambassador', copyKey: 'l2', rank: 2, mod: 'tier--2', requirements: 5, benefits: 4, hasTarget: true, delay: 90 },
  { levelId: 'senior_lo_ambassador', copyKey: 'l3', rank: 3, mod: 'tier--3', requirements: 5, benefits: 6, hasTarget: true, delay: 180 }
] as const
```

- [ ] **Step 2: Update every use**

Copy lookups take `copyKey`; catalog comparisons take `levelId`:

| Was | Becomes |
|---|---|
| `t(`levels.${level.key}.benefits.${i}`)` | `t(`levels.${level.copyKey}.benefits.${i}`)` |
| `level.key === 'l1' && <AllyChip …>` | `level.rank === 1 && <AllyChip …>` |
| `level.key !== 'l1' && status.openLevelIds.includes(level.key)` | `level.rank > 1 && status.openLevelIds.includes(level.levelId)` |
| `defaultLevelId={level.key}` | `defaultLevelId={level.levelId}` |
| `variant={level.key === 'l3' ? 'light' : 'primary'}` | `variant={level.rank === 3 ? 'light' : 'primary'}` |
| `t(`levels.${level.key}.cta`)`, `.target` | `copyKey` |

Prefer `rank` over an id comparison wherever the question is really "which rung is this" — the module comment already says a reordered catalog must need no change here.

- [ ] **Step 3: Verify in the browser**

Start the dev server (`preview_start` with the launch config, never `npm run dev` in a shell), open `/ambassador-program`, and confirm:
- the three tier cards still show their own copy (not all L1's);
- the apply button appears on L2/L3 for a signed-in viewer with no application;
- clicking L3's button opens the modal already on Level 3.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(public)/ambassador-program/_sections/LevelsSection/index.tsx"
git commit -m "refactor(lo-programs): separate level copy keys from catalog ids"
```

---

### Task 3: `LevelCardsField` — restore the approved cards

**Files:**
- Create: `src/shared/components/LoPrograms/LevelCardsField/index.tsx`
- Modify: `src/shared/components/LoPrograms/ApplyModal/index.tsx`

**Interfaces:**
- Consumes: react-hook-form context (the modal wraps the form in `FormProvider`).
- Produces: `<LevelCardsField name="level_id" options={{ value, title, meta }[]} label={…} hint={…} />`

**Why:** v7 already designed this — `.choices--inline > .choice` with a hidden-in-plain-sight radio, selected state via `:has(input:checked)` giving an orange border and `--orange-tint` fill ([programs.css:2483](../../lf-homepage/public/lo-programs/v7/programs.css)). The React build regressed to a plain Mantine `RadioField`. This is a restoration, not a new design.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useController, useFormContext } from 'react-hook-form'

interface LevelCardOption {
  value: string
  title: string
  meta: string
}

interface LevelCardsFieldProps {
  name: string
  label: string
  hint?: string
  options: LevelCardOption[]
}

/**
 * The level chooser as v7 drew it: a card per level, the radio kept real so
 * keyboard navigation and screen readers still work, selection shown by the
 * card rather than by a dot. Requires a `.lop` ancestor for the ported CSS.
 */
const LevelCardsField = ({ name, label, hint, options }: LevelCardsFieldProps) => {
  const { control } = useFormContext()
  const {
    field: { value, onChange, ref }
  } = useController({ name, control })

  return (
    <fieldset className="f m-0 border-0 p-0">
      <legend className="f__label mb-1.5 p-0">
        {label} <span className="f__req">*</span>
      </legend>
      <div className="choices choices--inline">
        {options.map((option, index) => (
          <label className="choice" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              ref={index === 0 ? ref : undefined}
            />
            <span>
              <span className="choice__title">{option.title}</span>
              <span className="choice__text">{option.meta}</span>
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="f__hint">{hint}</p>}
    </fieldset>
  )
}

export default LevelCardsField
```

- [ ] **Step 2: Swap it into the modal**

In `ApplyModal`, replace the `offeredLevels.length > 1 && <RadioField … />` block:

```tsx
              {offeredLevels.length > 1 && (
                <LevelCardsField
                  name="level_id"
                  label={t('form.level_question')}
                  hint={t('form.level_hint')}
                  options={offeredLevels.map((level) => ({
                    value: level.level_id,
                    title: level.name,
                    meta: level.budget_max_monthly
                      ? t('form.level_meta_budget', { budget: level.budget_max_monthly })
                      : t('form.level_meta_activation')
                  }))}
                />
              )}
```

The card now carries the level name as its title and the budget as its subtitle, which is why `form.level_option_budget` is replaced by `form.level_meta_budget` / `form.level_meta_activation`. Add all three keys in Task 9; leave the old key in place until then so nothing renders `undefined` mid-task.

- [ ] **Step 3: Verify**

`npx tsc --noEmit`, then in the browser: open the modal, click each card, confirm the orange border and tint move with the selection, and confirm Tab + arrow keys still move between levels.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/LoPrograms/LevelCardsField src/shared/components/LoPrograms/ApplyModal/index.tsx
git commit -m "feat(lo-programs): restore the v7 level cards in the apply form"
```

---

### Task 4: Modal structure and density

**Files:**
- Modify: `src/shared/components/LoPrograms/ApplyModal/index.tsx`

**Interfaces:**
- Consumes: Task 3's `LevelCardsField`.
- Produces: a modal whose Submit is always visible; a level chip when the level arrived from the caller.

- [ ] **Step 1: Move the footer out of the scroll area**

Today the whole form — including `agreement_accepted` and Submit — sits inside one scrolling `<form>`. Restructure so the form wraps three regions and only the middle one scrolls:

```tsx
        <form onSubmit={onSubmit} className="flex max-h-[90vh] min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-5 [&>*]:min-w-0">
            {/* questions */}
          </div>
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
            {/* agreement + submit */}
          </div>
        </form>
```

Three details that are load-bearing, each found by measuring rather than by looking:

- `overflow-x: hidden` is explicit because `overflow-y: auto` alone makes `overflow-x` compute to `auto`, and a table wider than the panel then clipped the right edge of every row.
- `[&>*]:min-w-0` is needed because grid/flex children default to `min-width: auto`, so a wide child stretches its own row instead of letting its own scroll container scroll — and the clipped overflow is then unreachable.
- `min-h-0` on both the form and the scroll region, or the flex child refuses to shrink and the footer is pushed off screen. This is the failure lf-iq already shipped once.

- [ ] **Step 2: Show a chip instead of re-asking**

When `defaultLevelId` named the level (the caller was a level card), the cards are noise:

```tsx
  const askedUpstream = Boolean(defaultLevelId) && offeredLevels.some((l) => l.level_id === defaultLevelId)
  const [showCards, setShowCards] = useState(!askedUpstream)
```

Render the chip when `!showCards`, with a button that sets `showCards` to `true`:

```tsx
              {!showCards && selectedLevel && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                  <span>{t('form.applying_for')}</span>
                  <b className="font-extrabold">{selectedLevel.name}</b>
                  <button
                    type="button"
                    onClick={() => setShowCards(true)}
                    className="ml-auto font-extrabold text-orange-700 underline"
                  >
                    {t('form.change_level')}
                  </button>
                </div>
              )}
```

This subsumes the existing `offeredLevels.length === 1` branch — one available level is just another case of "the level was not a question". Keep that branch's behaviour (name the level, no chooser) and delete the duplicate markup.

- [ ] **Step 3: Compact the inputs**

Pass `size="sm"` to every field (the wrappers spread `...otherProps` straight to Mantine, so no wrapper edits), and change the questions container gap from `gap-5` to `gap-4`. Widen the modal from `size={640}` to `size={720}`.

- [ ] **Step 4: Render the optional textarea plainly**

`experience` is one optional question; it gets a label and a textarea like any other. No disclosure, no "add detail" affordance — v7 shows it plainly and lets the absent asterisk say it is optional.

- [ ] **Step 5: Verify**

`npx tsc --noEmit`. Then in the browser at a 900px-tall viewport: open the modal from a Level 2 card and confirm the chip (not the cards), that Submit is visible without scrolling, and that scrolling the questions does not move the footer. Repeat at 375px wide.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/LoPrograms/ApplyModal/index.tsx
git commit -m "feat(lo-programs): sticky footer, level chip and tighter fields in the apply form"
```

---

### Task 5: `SocialProfilesField`

**Files:**
- Create: `src/shared/components/LoPrograms/SocialProfilesField/index.tsx`
- Modify: `src/shared/components/LoPrograms/ApplyModal/index.tsx`
- Modify: `src/app/[locale]/(public)/ambassador-program/page.tsx` (pass `ally_social_profiles` down)
- Modify: `src/shared/utils/loProgramStatus.ts` (carry the measured rows on the status object)

**Interfaces:**
- Consumes: Task 1's `detectNetwork`, `LoProgramSocialProfile`.
- Produces: `<SocialProfilesField name="social_profiles" measured={LoProgramSocialProfile[]} />`, writing `{ url: string; audience_count: string }[]` into form state; and `hasMeasuredCount: boolean` for Task 6.

- [ ] **Step 1: Thread the measured rows to the modal**

`ally_social_profiles` arrives on the `me` payload. Add it to `LoProgramStatus` as `measuredProfiles: LoProgramSocialProfile[]` plus `measuredUnknown: boolean` (true when the API sent `null`), set in `buildLoProgramStatus`. Keep the two apart: `null` means ALLY could not be asked, `[]` means the viewer has none, and the block says different things.

- [ ] **Step 2: Write the network icon**

Every one of the eleven tokens already has an SVG: `SocialsName` maps the token to
a key and `SOCIALS` maps that key to the asset URL, in
`src/shared/constants/image-url.ts`. So the icon is a lookup, not new artwork:

```tsx
import { SOCIALS, SocialsName } from '@constants/image-url'

import type { SocialNetwork } from '@constants/loPrograms'

/** `null` = the host was not recognised yet, which shows the neutral mark. */
const NetworkIcon = ({ network }: { network: SocialNetwork | null }) => (
  <img
    src={SOCIALS[network ? SocialsName[network] : SocialsName.others]}
    alt=""
    width={20}
    height={20}
    className="rounded"
  />
)
```

Render it the way the existing social call sites do — run `git grep -n "SOCIALS\["` and
match whichever of `next/image` or a plain `img` they use, so the asset host stays
consistent with `next.config.mjs`'s image settings.

- [ ] **Step 3: Write the component**

```tsx
'use client'

import { IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useFieldArray, useFormContext } from 'react-hook-form'

import type { LoProgramSocialProfile } from '@apis/loProgramsApi'

import { detectNetwork } from '@constants/loPrograms'

interface SocialProfilesFieldProps {
  name: string
  /** Rows ALLY measured. Read-only: a wrong link is fixed in ALLY, not here. */
  measured: LoProgramSocialProfile[]
  label: string
}

const digits = (value: string) => value.replace(/[^0-9]/g, '')

/**
 * Social profiles as a table. Measured rows are read-only and carry their own
 * provenance; the applicant's rows are plain inputs — no save step to forget and
 * no cancel to undo something never committed.
 *
 * A row is wrong only when one half is filled: a link with no number, or a
 * number with no link, is a half-answer a reviewer cannot act on. An entirely
 * empty row is not an error — it is a row they decided against, and it is
 * dropped on submit.
 *
 * The network and the unit are derived from the host rather than asked for.
 * moso-aid derives them again from the URL and ignores whatever the browser
 * sent, so a mismatch cannot put a false provenance beside a real number.
 */
const SocialProfilesField = ({ name, measured, label }: SocialProfilesFieldProps) => {
  const t = useTranslations('LoProgramsShared.socials')
  const { control, register, watch } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })
  const rows = (watch(name) || []) as { url: string; audience_count: string }[]

  const measuredTotal = measured.reduce((sum, row) => sum + (row.audience_count || 0), 0)
  const claimedTotal = rows.reduce((sum, row) => sum + Number(digits(row?.audience_count || '')) || 0, 0)

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="f__label">{label}</span>
        <span className="text-xs text-slate-600 tabular-nums">
          {/* Measured and claimed are never added together: one combined figure
              lets a self-typed number pass as a measured one. */}
          {t('totals', { measured: measuredTotal, claimed: claimedTotal })}
        </span>
      </div>

      <div className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[30px]" />
            <col />
            <col className="w-[132px]" />
            <col className="w-[56px]" />
          </colgroup>
          <tbody>
            {measured.length > 0 && (
              <tr>
                <td colSpan={4} className="bg-slate-100 px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-slate-600">
                  {t('measured_group')}
                </td>
              </tr>
            )}
            {measured.map((row) => (
              <tr key={`${row.network}-${row.url}`} className="bg-slate-100">
                <td className="px-2.5 py-1.5">
                  <NetworkIcon network={row.network} />
                </td>
                <td className="min-w-0 px-2.5 py-1.5">
                  <span className="flex items-baseline gap-1.5">
                    <b>{t(`networks.${row.network}`)}</b>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.url}
                      className="min-w-0 flex-1 truncate text-[11px] text-slate-500 hover:underline"
                    >
                      {row.url}
                    </a>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 font-extrabold tabular-nums">
                  {row.audience_count === null
                    ? <span className="text-[11px] font-bold italic text-slate-500">{t('not_measured')}</span>
                    : `${row.audience_count.toLocaleString('en-US')} ${row.audience_label ? t(`units.${row.audience_label}`) : ''}`}
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-blue-700">
                    {t('source_ally')}
                  </span>
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan={4} className="bg-slate-100 px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-slate-600">
                {t('mine_group')}
              </td>
            </tr>
            {fields.map((field, index) => {
              const row = rows[index] || { url: '', audience_count: '' }
              const hit = detectNetwork(row.url)
              const half = Boolean(row.url.trim()) !== Boolean((row.audience_count || '').trim())
              return (
                <tr key={field.id} className={half ? 'bg-red-50' : undefined}>
                  <td className="px-2.5 py-1.5">
                    {/* The icon is the feedback that the host was recognised, so
                        an unrecognised link shows the neutral mark, not nothing. */}
                    <NetworkIcon network={hit?.network ?? null} />
                  </td>
                  <td className="min-w-0 px-2.5 py-1.5">
                    <input
                      {...register(`${name}.${index}.url`)}
                      placeholder={t('url_placeholder')}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input
                      {...register(`${name}.${index}.audience_count`)}
                      inputMode="numeric"
                      placeholder={t('count_placeholder')}
                      className="w-full max-w-[96px] rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    {hit && row.audience_count && (
                      <span className="text-[11px] text-slate-600">{t(`units.${hit.audienceLabel}`)}</span>
                    )}
                    {half && (
                      <span className="block text-[10px] font-extrabold text-red-600">
                        {row.url.trim() ? t('need_count') : t('need_url')}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800">
                      {t('source_self')}
                    </span>
                    <button type="button" onClick={() => remove(index)} aria-label={t('remove')}>
                      <IconX size={14} className="text-slate-500" />
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={4} className="px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => append({ url: '', audience_count: '' })}
                  className="rounded-md border-[1.5px] border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900"
                >
                  {t('add')}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SocialProfilesField
```

Use `table-fixed` with the `<colgroup>` and `truncate` on the URL: without them a long unbreakable URL sets the table's min-content width and clips the modal's right edge.

- [ ] **Step 4: Fall back to the directory's links when ALLY is unknown**

Spec §7 A3: when `ally_social_profiles` is `null` — unreachable, timed out, key
rejected — the block still has something to show, because the MOSO profile
already holds `stored_social_links`. `buildLoProgramPrefill` extracts exactly
those today to fill `linkedin` and `other_social`, the two fields Task 5 removes;
repoint that work at the table instead of deleting it.

In `src/shared/utils/loProgramPrefill.ts`, replace the `linkedin` / `other_social`
fields on `LoProgramPrefill` with:

```ts
  /**
   * Links the directory already holds, as read-only rows for the social table.
   * No counts: the profile has never held a follower number, which is precisely
   * why ALLY was asked in the first place. Used only when ALLY could not answer —
   * measured rows are better evidence and win whenever they exist.
   */
  profileSocialLinks: { network: SocialNetwork; url: string }[]
```

built from `loInfo.stored_social_links` by running each `social_url` through
`toHttpUrl` (already in that file) and then `detectNetwork`, dropping anything
that fails to parse and skipping `google_my_business` — a map listing is not a
social profile, which is the rule the old `OTHER_SOCIAL_PRIORITY` list already
encoded.

`SocialProfilesField` then takes these as `moso_profile`-sourced rows when
`status.measuredUnknown` is true, tagged distinctly from ALLY rows: `from profile ·
not measured`. Delete `OTHER_SOCIAL_PRIORITY` and `PREFILLED_FORM_FIELD_KEYS`'
`linkedin`/`other_social` entries once nothing reads them.

- [ ] **Step 5: Validate and submit**

In `ApplyModal`'s schema builder, for a field of type `social_profiles`, validate the array with joi rather than a scalar rule:

```ts
    if (field.type === 'social_profiles') {
      keys[field.key] = array
        .items(
          object.keys({
            url: string.allow(''),
            audience_count: string.allow('')
          })
            // Both halves or neither. `object.and` is exactly this rule, and it
            // keeps the message in one place instead of per-input.
            .and('url', 'audience_count')
        )
        .max(20)
      continue
    }
```

Add `array` to the shorthand types module if it is not exported yet, following the existing pattern in `@utils/joiShorthandTypes`.

In `onSubmit`, send only complete rows, and only the two fields the backend accepts:

```ts
    const socialRows = ((values.social_profiles || []) as { url: string; audience_count: string }[])
      .map((row) => ({ url: (row.url || '').trim(), audience_count: Number(digits(row.audience_count || '')) }))
      .filter((row) => row.url && Number.isFinite(row.audience_count))
```

and pass `social_profiles: socialRows` on the request when the level's form declares the field.

- [ ] **Step 6: Verify**

`npx tsc --noEmit`, then in the browser: add a row, type only a link (Submit must refuse and the row must say which half is missing), add the number (Submit enabled), add three empty rows (Submit stays enabled and they are dropped), paste `threads.net/@x` (files as other), remove a row.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/LoPrograms/SocialProfilesField src/shared/components/LoPrograms/ApplyModal/index.tsx src/shared/utils/loProgramStatus.ts "src/app/[locale]/(public)/ambassador-program/page.tsx"
git commit -m "feat(lo-programs): social profiles table with derived networks"
```

---

### Task 6: `connections_range`, conditional

**Files:**
- Modify: `src/shared/components/LoPrograms/ApplyModal/index.tsx`

**Interfaces:**
- Consumes: Task 5's measured rows.

- [ ] **Step 1: Hide it when there is a measured count**

```tsx
  /**
   * Rows existing is not the test — a non-null count is. Rows ALLY returned but
   * could not measure (a private account) would otherwise hide the question
   * while contributing nothing, and moso-aid would then derive `under_500` from
   * a total of zero: a small audience asserted on no evidence.
   */
  const hasMeasuredCount = status?.measuredProfiles?.some((row) => row.audience_count !== null) ?? false
```

Drop `connections_range` from `visibleFields` when `hasMeasuredCount`, and keep it out of the joi schema in that branch so it cannot block submit invisibly.

- [ ] **Step 2: Raise it to required in the other branch**

The catalog stores `required: false` so the field never blocks a level that has measured data. When `!hasMeasuredCount`, the modal treats it as required — it then carries the whole signal:

```ts
      const rule = ruleFor(field)
      keys[field.key] =
        field.key === 'connections_range' && !hasMeasuredCount
          ? (rule as JoiRule & { required: () => JoiRule }).required().label(label)
          : rule.label(label)
```

- [ ] **Step 3: Verify**

In the browser, with ALLY returning measured rows: the connections select is absent. With `ally_social_profiles: []`: the select is present and blocks submit until answered.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/LoPrograms/ApplyModal/index.tsx
git commit -m "feat(lo-programs): ask for a connections range only when nothing was measured"
```

---

### Task 7: One hero CTA

**Files:**
- Modify: `src/app/[locale]/(public)/ambassador-program/_sections/HeroSection/index.tsx`
- Modify: `src/shared/utils/loProgramStatus.ts` — `primaryAction`
- Modify: `src/shared/components/LoPrograms/PrimaryCta/index.tsx`

**Interfaces:**
- Consumes: Task 2's constants, Task 3's cards.

- [ ] **Step 1: Delete the hardcoded rail**

The `RAIL` constant hardcodes `l1`/`l2`/`l3`. Remove it; the anonymous rail renders from the catalog levels the page already has, or keeps its current copy keyed by `copyKey`.

- [ ] **Step 2: Stop the ALLY switch hijacking the only button**

`primaryAction` returns `ally_enable` before `apply`, so a viewer with recruiting off is sent to ALLY and never reaches the Level 2/3 form — though `isLevelOpen` never gated those levels on ALLY. With a single hero CTA that becomes the difference between reachable and unreachable. Reorder so the form wins, and let the ALLY state be reported inside it:

```ts
export const primaryAction = (status: LoProgramStatus): LoProgramAction => {
  // Joining is still offered first: Level 1 needs nobody's approval, and the
  // page sells it as the starting point.
  if (status.allyLevelId && status.openLevelIds.includes(status.allyLevelId)) return 'join'
  // A decision outstanding means there is nothing to click: moso-aid refuses a
  // second open application.
  if (status.state === 'pending') return 'none'
  // ALLY being off is a fact about Level 1, not a bar to Levels 2 and 3. It is
  // reported on the Level 1 card inside the form; it no longer replaces the CTA.
  if (status.canApplyAny) return 'apply'
  if (status.ally === 'off' && status.allyEnableUrl) return 'ally_enable'
  if (status.ally === 'no_channel' && status.allyChannelsUrl) return 'ally_channels'
  return 'none'
}
```

Update `PrimaryCta`'s comment block — it currently explains the old priority as deliberate, and a stale comment here is worse than none.

- [ ] **Step 3: Surface the ALLY state on the Level 1 card**

Inside the modal, when the selected level is the activation level and `status.ally === 'off'`, the panel says recruiting is currently off and the footer button opens ALLY. `AllyChip` already renders this state; reuse it rather than writing new copy.

- [ ] **Step 4: Verify**

Sign in as a viewer with recruiting off in ALLY. Hero shows one `Get started`. Clicking it opens the form, not ALLY. The form offers Levels 1-3; Level 1 shows the ALLY panel and its own button; Levels 2 and 3 show the questions.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(public)/ambassador-program/_sections/HeroSection/index.tsx" src/shared/utils/loProgramStatus.ts src/shared/components/LoPrograms/PrimaryCta/index.tsx
git commit -m "feat(lo-programs): one hero CTA that always opens the form"
```

---

### Task 8: Admin listing

**Files:**
- Modify: `src/shared/components/LoPrograms/AdminConsole/ApplicationsTable.tsx`
- Create: `src/shared/components/LoPrograms/AdminConsole/SocialPopover.tsx`
- Modify: `src/shared/components/LoPrograms/AdminConsole/ApplicationDrawer.tsx`

**Interfaces:**
- Consumes: Task 1's `LoProgramSocialProfile`, `LoProgramAudienceSummary`.

- [ ] **Step 1: Columns**

Applicant (avatar, name, NMLS, email) · Applied for · Holds now · Network · Social · Submitted · Status · Actions. **No audience column** — the numbers belong next to the link they came from, where a manager is one click from verifying them; a bare total in a cell invites being read as a score.

- [ ] **Step 2: Network gains its provenance**

The column is `answers.connections_range` — the one v1 called "Reach / experience", because the same table served the recruiter program where the equivalent answer is `recruiting_experience_years`. Add a subline from `audience_summary.range_source`: `derived from ALLY` or `self-declared`. A Level 1 row has no form and so no answer; say so rather than rendering a blank that reads like a bug.

- [ ] **Step 3: Social popover**

One icon per profile, undifferentiated. Hover or keyboard focus opens a card listing every profile with its network, link, count and provenance (`ALLY · measured 18 Aug` or `LO input`).

Render it in a portal with `position: fixed`. Inside the cell it would be clipped by the table's own `overflow-x`, which is the same class of bug as the modal's clipped right edge. Mantine's `Popover` with `withinPortal` (the default) does this; use it rather than hand-rolling, and make it open on both `mouseenter` and `focus` so it is reachable without a mouse.

- [ ] **Step 4: Submitted shows both**

```tsx
                  <td className="num">
                    <span className="block">
                      {format.dateTime(new Date(row.created_at), { dateStyle: 'medium' })}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {t('table.days_ago', { days: daysSince(row.created_at) })}
                    </span>
                  </td>
```

`daysSince` belongs next to the table as a small helper. The shipped console shows only the date; v1 showed only the age; both are wanted.

- [ ] **Step 5: Drawer**

`ApplicationDrawer` shows the frozen snapshot: every row with its provenance and capture date, and the two totals as separate figures.

- [ ] **Step 6: Verify**

`npx tsc --noEmit`. In the browser at `/manage-lo-programs/ambassador-program`: no audience column, hovering the icons opens the popover clear of the table's clipping, Submitted shows both lines, and a Level 1 row reads `no form at Level 1` rather than blank.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/LoPrograms/AdminConsole
git commit -m "feat(lo-programs admin): social popover, network provenance, dual submitted"
```

---

### Task 9: Copy in all five locales

**Files:**
- Modify: `src/messages/en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`

**Interfaces:**
- Consumes: every key referenced by Tasks 3-8.

- [ ] **Step 1: Add the keys**

Under `LoProgramsShared`:

```
form.level_question, form.level_hint, form.level_meta_budget, form.level_meta_activation,
form.applying_for, form.change_level
socials.totals, socials.measured_group, socials.mine_group, socials.add, socials.remove,
socials.url_placeholder, socials.count_placeholder, socials.not_measured,
socials.need_url, socials.need_count, socials.source_ally, socials.source_self,
socials.networks.* (11 tokens), socials.units.* (5 tokens)
```

Under `form_fields`: keep `connections_range.label` and its five options; add `social_profiles.label`. Under the admin namespace: `table.days_ago`, `table.network_derived`, `table.network_self_declared`, `table.no_form_level_1`, `table.social_none`.

Remove `form.level_option_budget` and `form.level_option_activation` once nothing references them.

- [ ] **Step 2: Check for gaps**

Run: `node -e "const l=['en','es','vi','zh','he'].map(n=>[n,require('./src/messages/'+n+'.json')]);const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v).map(s=>k+'.'+s):[k]);const base=new Set(keys(l[0][1]));for(const [n,o] of l.slice(1)){const have=new Set(keys(o));const miss=[...base].filter(k=>!have.has(k)&&k.includes('LoProgram'));if(miss.length)console.log(n,miss.slice(0,20))}"`

Expected: no output. A missing key renders as the key itself in production.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0. Stop `next dev` first — they clash over `.next`.

- [ ] **Step 4: Commit and open the PRs**

```bash
git add src/messages
git commit -m "feat(lo-programs): copy for the social profiles form and admin listing"
git push -u origin <branch>
```

Then: PR into `master` (auto-merge), and a **second, separate** PR into the release branch. Two `gh pr create` calls — the release PR is merged by hand.

---

## Verification before handing over

- [ ] `npx tsc --noEmit` exits 0 and `npm run build` succeeds.
- [ ] `git grep -n "'l1'\|'l2'\|'l3'" src` returns only i18n `copyKey` uses, never a catalog comparison.
- [ ] At 375, 768 and 1440: the page body never scrolls sideways, and no modal content is clipped at its right edge.
- [ ] Submit is reachable without scrolling in the Level 2 path on a 900px-tall viewport.
- [ ] A half-filled social row blocks submit and says which half is missing; an empty row does not.
- [ ] With measured rows present, no connections question is shown, and the submitted application still records a range with `range_source: 'derived'`.
- [ ] `src/middleware.ts` is not in the diff.
