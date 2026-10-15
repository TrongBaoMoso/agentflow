# Loan Factory Recruit Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-out visitor at `recruit.loanfactory.com/` sees a mid-dark, animated landing page for Loan Factory Recruit. The /loan-officer "AI mortgage platform" section gets a 9th card, "Referrals and bonuses", that links to it.

**Architecture:**
- **recruit-fe (PR A):**
  - The middleware rewrites `/` to a new `(landing)` route group when the visitor has no `lf_app` session.
  - The page is mostly server components (copy from `next-intl/server`).
  - Two small client islands: a public 9-dot launcher that reads auth-service's public app catalogue, and a motion controller.
  - Styles are one prefixed stylesheet (`rl-*`) ported from the approved mockup.
- **lf-homepage (PR B):** adds one app node, its link, its icon and copy in 5 locales, and changes the column split to 5/4.

**Tech Stack:**
- recruit-fe: Next 15.5 App Router, next-intl 4.8, Mantine 8 (only through the existing root providers), jest 30 + Testing Library.
- lf-homepage: Next 14.2, next-intl 3.20, jest 29.

**Spec:** `docs/superpowers/specs/2026-10-15-recruit-landing-design.md`. Approved mockup: `docs/superpowers/specs/assets/2026-10-15-recruit-landing-mockup.html` (artifact VLaTVjLpLYdBdkdJSzQtWW). Stylesheet to port: `docs/superpowers/plans/assets/2026-10-15-recruit-landing.css`.

## Global Constraints

- Copy rules:
  - App name "Loan Factory Recruit". Card title "Referrals and bonuses".
  - Never write "LO". Always write "Loan Officer".
  - Plain words, no slogans.
- No "60 days" claim and no dollar amounts anywhere (bead agentflow-lklmx).
- No Technology Advisor block.
- Theme and motion:
  - The landing is always mid-dark (tokens on `.rl-root`). It never follows the app color-scheme toggle.
  - Motion uses `transform` and `opacity` only, all inside `@media (prefers-reduced-motion: no-preference)`. JS motion does nothing when `matchMedia('(prefers-reduced-motion: reduce)').matches`.
  - Content is complete at rest. No element waits at opacity 0 for an observer.
- Sign in href is exactly `/login?next=%2Fmy-referrals`. This is a deviation from spec 3.1: `/login` already handles signed-in, SSO and dev modes and forwards `next`, so the landing reuses it. Task A7 updates the spec.
- recruit-fe locales: `en`, `vi`. lf-homepage locales: `en`, `es`, `vi`, `zh`, `he`.
- Branches:
  - recruit-fe: `feat/recruit-landing` cut from fresh `origin/master`, PR into `master`. Staging goes through `gh workflow run promote-staging.yml -f sha=<master sha>`. Production is `git push origin origin/staging:refs/heads/production` (fast-forward only).
  - lf-homepage: `feat/loan-officer-recruit-card` cut from fresh `origin/master`, PR into `master`. Production is a separate `master → production` PR.
- Heavy jobs (`next dev`, `next build`, a full jest run, Chromium) go through `~/.claude/bin/ram-gate acquire <kind> <label> --wait 900` and `release`.
- Work in a git worktree, never in the shared checkout.
- Bao must see both pages on a local run **before** any push (memory rule "local preview before push").
- File limits: recruit-fe has no hard cap, but keep files under 400 lines. lf-homepage ESLint caps files at 500 lines.
- lf-homepage style: no semicolons, no trailing commas, `import type` for type-only imports.

## Review Focus

1. **A catalogue entry with a non-https or missing `url`.** It must be dropped, never rendered as a link. This guards against `javascript:` URLs. Pinned in Task A3.
2. **An app tile whose `icon_url` image fails to load.** It must fall back to the letter mark, not a broken image. Pinned in Task A3.
3. **A visitor with only `lf_session`** (signed in to another Loan Factory app). They must see the landing, not be silently sent through SSO into the staff `/today` screen. Pinned in Task A1.
4. **`/` with a query string** (`/?utm_source=lf`). The rewrite must keep the query. Pinned in Task A1.
5. **A Vietnamese visitor** (Accept-Language `vi`). The rewrite must target `/vi/welcome`, and every landing key must exist in `vi`. Pinned in Tasks A1 and A2.

---

## PR A: recruit-fe

### Task A0: Worktree, bead, baseline

**Files:** none (setup)

- [ ] **Step 1: Create the bead and the worktree**

```bash
cd ~/Projects/agentflow
bd create --title="Recruit public landing page + /loan-officer card" --type=feature --priority=2 \
  --description="Spec docs/superpowers/specs/2026-10-15-recruit-landing-design.md, plan docs/superpowers/plans/2026-10-15-recruit-landing.md. PR A recruit-fe landing, PR B lf-homepage card."
cd ~/Projects/agentflow/recruit-fe
git fetch origin
git worktree add _wt/landing -b feat/recruit-landing origin/master
cd _wt/landing && npm ci
```

- [ ] **Step 2: Baseline tests are green before any change**

```bash
tok=$(~/.claude/bin/ram-gate acquire jest landing-baseline --wait 900)
npx jest src/__tests__/middlewareRootRouting.test.ts src/messages/__tests__ 2>&1 | grep -E "Tests:|Test Suites:"
~/.claude/bin/ram-gate release $tok
```

Expected: every suite passes. Write the counts down. They are the baseline for Task A6.

### Task A1: Middleware sends signed-out visitors to the landing

**Files:**
- Modify: `src/shared/constants/routes.ts` (`PUBLIC_ROUTES`)
- Modify: `src/middleware.ts` (`rootDestination`, and the `/` branch in `middleware`)
- Test: `src/__tests__/middlewareRootRouting.test.ts`

**Interfaces:**
- Produces: `PUBLIC_ROUTES.WELCOME = '/welcome'`. A signed-out `GET /` returns a `NextResponse.rewrite` to `/<locale>/welcome`, with the `X-NEXT-INTL-LOCALE` request header set.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/middlewareRootRouting.test.ts`:
- Add a helper below `locationOf`.
- Replace the two tests "hands a signed-out visitor to the portal directly…" and "treats a platform-only session as signed out here…".
- Add three new tests.

```ts
const rewriteOf = (response: unknown): string =>
  (response instanceof Response ? response.headers.get('x-middleware-rewrite') : null) ?? ''

  it('shows a signed-out visitor the landing page instead of the portal', () => {
    const response = loadMiddleware({ account: ACCOUNT })(requestWith('/', {}))

    expect(locationOf(response)).toBe('')
    expect(new URL(rewriteOf(response)).pathname).toBe('/en/welcome')
  })

  it('shows the landing to a visitor signed in only to another Loan Factory app', () => {
    const response = loadMiddleware({ account: ACCOUNT })(requestWith('/', { lf_session: '1' }))

    expect(locationOf(response)).toBe('')
    expect(new URL(rewriteOf(response)).pathname).toBe('/en/welcome')
  })

  it('serves the landing in Vietnamese to a Vietnamese browser', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- same module registry as the middleware
    const { NextRequest } = require('next/server')
    const request = new NextRequest(`${INTERNAL}/`, {
      headers: { host: 'recruit.viet18.com', 'x-forwarded-proto': 'https', 'accept-language': 'vi-VN,vi;q=0.9' }
    })

    const response = loadMiddleware({ account: ACCOUNT })(request)

    expect(new URL(rewriteOf(response)).pathname).toBe('/vi/welcome')
  })

  it('keeps the query string when it rewrites to the landing', () => {
    const response = loadMiddleware({ account: ACCOUNT })(requestWith('/?utm_source=lf', {}))

    expect(new URL(rewriteOf(response)).searchParams.get('utm_source')).toBe('lf')
  })

  it('still sends an app session straight to /today, never to the landing', () => {
    const response = loadMiddleware({ account: ACCOUNT })(requestWith('/', { lf_app: '1', lf_session: '1' }))

    expect(locationOf(response)).toBe(`${ORIGIN}/today`)
    expect(rewriteOf(response)).toBe('')
  })
```

The existing tests "sends an app session…", "stays inside the app when the build has no portal…", "never hands off in a dev-persona build…" and "leaves /health alone" stay unchanged.

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx jest --runTestsByPath src/__tests__/middlewareRootRouting.test.ts`

Expected: the 4 new landing tests FAIL, because the location is the portal URL and there is no rewrite header. "still sends an app session…" passes.

- [ ] **Step 3: Implement**

In `src/shared/constants/routes.ts`:

```ts
export const PUBLIC_ROUTES = {
  LOGIN: '/login',
  /** The signed-out landing page. `/` rewrites here when this app has no session (see middleware). */
  WELCOME: '/welcome'
}
```

In `src/middleware.ts`:
- Change the import to `import { PRIVATE_ROUTES, PUBLIC_ROUTES } from './shared/constants/routes'`.
- Change `import { buildAccountLoginUrl, isSsoConfigured } …` to `import { isSsoConfigured } from './shared/utils/accountLogin'`.
- Replace the `rootDestination` function and its doc comment with:

```ts
/**
 * What `/` shows, decided at the edge so the visitor sees ONE navigation.
 *
 *   this app signed in (lf_app)  -> /today, it can render
 *   dev-persona / no ACCOUNT_URL -> /today as before; there is no gate to hand off to
 *   anyone else                  -> the public landing page, rewritten in place so the address
 *                                   bar keeps `/`. A Loan Officer arriving from /loan-officer
 *                                   reads what the app is first; its Sign in button goes through
 *                                   /login, which owns the SSO hand-off.
 *
 * A platform-only session (`lf_session`) is not this app: it still sees the landing.
 * The session itself lives in localStorage, invisible at the edge, which is why the `lf_app`
 * cookie hint exists at all (see @utils/sessionHint).
 */
const opensApp = (request: NextRequest): boolean =>
  Boolean(request.cookies.get('lf_app')) || isDevIdentityEnabled() || !isSsoConfigured()

/** The landing at `/`, in the reader's locale. Same header next-intl would have set (see rewriteUndecodable). */
const rewriteToLanding = (request: NextRequest): Response => {
  const locale = localeFor(request, '')
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${PUBLIC_ROUTES.WELCOME}`
  const headers = new Headers(request.headers)
  headers.set(LOCALE_HEADER, locale)
  return NextResponse.rewrite(url, { request: { headers } })
}
```

`localeFor` and `LOCALE_HEADER` are declared below `rootDestination` today. Move the new functions so they sit **after** `localeFor`. `const` arrow functions are not hoisted.

Then replace the `/` branch inside `middleware`:

```ts
  if (pathname === '/') {
    // The PUBLIC origin, not `request.url`: that one is the internal listener, and a Location
    // header pointing at 0.0.0.0:3000 is a dead end in a browser.
    if (opensApp(request)) return Response.redirect(`${publicOrigin(request)}${PRIVATE_ROUTES.TODAY}`, 307)
    return rewriteToLanding(request)
  }
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx jest --runTestsByPath src/__tests__/middlewareRootRouting.test.ts src/__tests__/middlewareMatcher.test.ts src/__tests__/middlewareUndecodablePath.test.ts`

Expected: all pass.

- [ ] **Step 5: Negative control (memory rule: after every fix, break it on purpose)**

Temporarily change `opensApp` to `() => true`. The 4 landing tests must FAIL. Revert.

Then temporarily remove `url.search` handling by setting `url.search = ''` in `rewriteToLanding`. The query-string test must FAIL. Revert.

- [ ] **Step 6: Commit**

```bash
git add src/shared/constants/routes.ts src/middleware.ts src/__tests__/middlewareRootRouting.test.ts
git commit -m "feat(landing): signed-out visitors at / see the landing page instead of the portal"
```

### Task A2: Landing copy (en + vi)

**Files:**
- Create: `src/messages/en/landing.json`
- Create: `src/messages/vi/landing.json`
- Modify: `src/messages/en/index.ts`, `src/messages/vi/index.ts` (import, then spread `...landing` after `...home`)
- Test: the existing `src/messages/__tests__/localeParity.test.ts` and `translationKeysResolve.test.ts`

**Interfaces:**
- Produces: namespace `Landing` with exactly the keys below. Later tasks call `getTranslations('Landing')` and `useTranslations('Landing')` with these keys only.

- [ ] **Step 1: Write `src/messages/en/landing.json`**

```json
{
  "Landing": {
    "meta_title": "Loan Factory Recruit",
    "meta_description": "See every Loan Officer you referred, their stage, and when your bonus is paid.",
    "brand_suffix": "Recruit",
    "nav_aria": "Main navigation",
    "nav_referrals": "Your referrals",
    "nav_bonus": "Bonus",
    "nav_ambassador": "Ambassador Program",
    "sign_in": "Sign in",
    "apps_button": "Loan Factory apps",
    "apps_title": "Loan Factory apps",
    "apps_all": "All apps",
    "apps_error": "Couldn't load the apps.",
    "apps_retry": "Try again",
    "example": "Example",
    "hero_tag": "For Loan Officers who refer Loan Officers",
    "hero_title_a": "Refer a Loan Officer.",
    "hero_title_b": "See when you get paid.",
    "hero_lede": "Every person you referred, their stage, and your bonus. In one place.",
    "hero_how": "See how it works",
    "chip_live": "Live stage updates",
    "chip_countdown": "Bonus countdown",
    "chip_free": "Free for every Loan Officer",
    "example_aria": "Example referral",
    "referred_on": "Referred {date}",
    "referred_licensed": "Referred {date} · Licensed {states}",
    "onboarded_on": "Onboarded {date}",
    "stage_referred": "Referred",
    "stage_licensing": "Licensing",
    "stage_licensed": "Licensed",
    "stage_onboarding": "Onboarding",
    "stage_onboarded": "Onboarded",
    "in_progress": "In progress",
    "days_to_bonus": "days to your bonus",
    "eligible_on": "Eligible on {date}",
    "event_licensed": "Licensed in {states}",
    "event_today": "Today",
    "event_new_referral": "New referral",
    "event_bonus_requested": "Bonus requested",
    "event_bonus_approved": "Bonus approved",
    "features_aria": "Features",
    "r1_eyebrow": "Your referrals",
    "r1_title": "Know where every referral stands.",
    "r1_text": "No more asking the recruiter. Each person's stage updates on its own.",
    "r1_tick1": "Referred, licensed, onboarded, with dates",
    "r1_tick2": "Licensed states for each person",
    "r1_tick3": "Filter by stage",
    "my_referrals": "My referrals",
    "filter_all": "All {count}",
    "filter_in_progress": "In progress {count}",
    "filter_onboarded": "Onboarded {count}",
    "r2_eyebrow": "Your bonus",
    "r2_title": "See the day your bonus is due.",
    "r2_text": "A countdown for each person, then every payment step.",
    "r2_tick1": "Days left and the eligible date",
    "r2_tick2": "Requested, approved, paid",
    "r2_tick3": "The date of each step",
    "bonus_card": "{name} · bonus",
    "bonus_reached": "Bonus reached",
    "eligible_since": "Eligible since {date}",
    "step_requested": "Requested",
    "step_approved": "Approved",
    "step_paid": "Paid",
    "step_waiting": "Waiting",
    "r3_eyebrow": "Your numbers",
    "r3_title": "All your referrals at a glance.",
    "r3_text": "Five numbers that show how your referrals are doing.",
    "r3_tick1": "Referred and in progress",
    "r3_tick2": "Onboarded",
    "r3_tick3": "Bonus pending and paid",
    "this_year": "This year",
    "stat_referred": "Referred",
    "stat_in_progress": "In progress",
    "stat_onboarded": "Onboarded",
    "stat_bonus_pending": "Bonus pending",
    "stat_bonus_paid": "Bonus paid",
    "amb_title": "Refer more with the Ambassador Program.",
    "amb_text": "Loan Factory pays you back for the ads you run to bring in Loan Officers.",
    "amb_cta": "See the program",
    "footer_copyright": "© Loan Factory",
    "footer_back": "loanfactory.com/loan-officer"
  }
}
```

- [ ] **Step 2: Write `src/messages/vi/landing.json`** (same keys)

```json
{
  "Landing": {
    "meta_title": "Loan Factory Recruit",
    "meta_description": "Xem mọi Loan Officer bạn đã giới thiệu, họ đang ở bước nào và khi nào bạn nhận thưởng.",
    "brand_suffix": "Recruit",
    "nav_aria": "Điều hướng chính",
    "nav_referrals": "Người bạn giới thiệu",
    "nav_bonus": "Tiền thưởng",
    "nav_ambassador": "Chương trình Ambassador",
    "sign_in": "Đăng nhập",
    "apps_button": "Các ứng dụng Loan Factory",
    "apps_title": "Các ứng dụng Loan Factory",
    "apps_all": "Tất cả ứng dụng",
    "apps_error": "Không tải được danh sách ứng dụng.",
    "apps_retry": "Thử lại",
    "example": "Ví dụ",
    "hero_tag": "Dành cho Loan Officer giới thiệu Loan Officer",
    "hero_title_a": "Giới thiệu một Loan Officer.",
    "hero_title_b": "Biết khi nào bạn nhận thưởng.",
    "hero_lede": "Mọi người bạn đã giới thiệu, họ đang ở bước nào và tiền thưởng của bạn. Ở cùng một chỗ.",
    "hero_how": "Xem cách hoạt động",
    "chip_live": "Cập nhật bước theo thời gian thực",
    "chip_countdown": "Đếm ngược tới tiền thưởng",
    "chip_free": "Miễn phí cho mọi Loan Officer",
    "example_aria": "Ví dụ một người được giới thiệu",
    "referred_on": "Giới thiệu {date}",
    "referred_licensed": "Giới thiệu {date} · Có license {states}",
    "onboarded_on": "Onboard xong {date}",
    "stage_referred": "Đã giới thiệu",
    "stage_licensing": "Đang lấy license",
    "stage_licensed": "Có license",
    "stage_onboarding": "Đang onboard",
    "stage_onboarded": "Đã onboard",
    "in_progress": "Đang làm",
    "days_to_bonus": "ngày nữa tới tiền thưởng",
    "eligible_on": "Đủ điều kiện ngày {date}",
    "event_licensed": "Có license ở {states}",
    "event_today": "Hôm nay",
    "event_new_referral": "Người được giới thiệu mới",
    "event_bonus_requested": "Đã gửi yêu cầu thưởng",
    "event_bonus_approved": "Đã duyệt thưởng",
    "features_aria": "Tính năng",
    "r1_eyebrow": "Người bạn giới thiệu",
    "r1_title": "Biết từng người đang ở đâu.",
    "r1_text": "Không cần hỏi recruiter nữa. Bước của mỗi người tự cập nhật.",
    "r1_tick1": "Đã giới thiệu, có license, đã onboard, kèm ngày",
    "r1_tick2": "Các bang có license của từng người",
    "r1_tick3": "Lọc theo bước",
    "my_referrals": "Người tôi giới thiệu",
    "filter_all": "Tất cả {count}",
    "filter_in_progress": "Đang làm {count}",
    "filter_onboarded": "Đã onboard {count}",
    "r2_eyebrow": "Tiền thưởng",
    "r2_title": "Biết ngày bạn được nhận thưởng.",
    "r2_text": "Đếm ngược cho từng người, rồi từng bước chi trả.",
    "r2_tick1": "Số ngày còn lại và ngày đủ điều kiện",
    "r2_tick2": "Đã yêu cầu, đã duyệt, đã trả",
    "r2_tick3": "Ngày của từng bước",
    "bonus_card": "{name} · tiền thưởng",
    "bonus_reached": "Đã đủ điều kiện nhận thưởng",
    "eligible_since": "Đủ điều kiện từ {date}",
    "step_requested": "Đã yêu cầu",
    "step_approved": "Đã duyệt",
    "step_paid": "Đã trả",
    "step_waiting": "Đang chờ",
    "r3_eyebrow": "Con số của bạn",
    "r3_title": "Nhìn một lần thấy hết.",
    "r3_text": "Năm con số cho biết những người bạn giới thiệu đang thế nào.",
    "r3_tick1": "Đã giới thiệu và đang làm",
    "r3_tick2": "Đã onboard",
    "r3_tick3": "Thưởng đang chờ và đã trả",
    "this_year": "Năm nay",
    "stat_referred": "Đã giới thiệu",
    "stat_in_progress": "Đang làm",
    "stat_onboarded": "Đã onboard",
    "stat_bonus_pending": "Thưởng đang chờ",
    "stat_bonus_paid": "Thưởng đã trả",
    "amb_title": "Giới thiệu nhiều hơn với chương trình Ambassador.",
    "amb_text": "Loan Factory hoàn tiền quảng cáo bạn chạy để mời thêm Loan Officer.",
    "amb_cta": "Xem chương trình",
    "footer_copyright": "© Loan Factory",
    "footer_back": "loanfactory.com/loan-officer"
  }
}
```

- [ ] **Step 3: Register the namespace**

In both `src/messages/en/index.ts` and `src/messages/vi/index.ts`:
- Add `import landing from './landing.json'` in alphabetical order (after `labels`).
- Add `...landing,` directly after `...home,` in the exported object.

- [ ] **Step 4: Run the message tests**

Run: `npx jest --runTestsByPath src/messages/__tests__/localeParity.test.ts src/messages/__tests__/translationKeysResolve.test.ts`

Expected: PASS. Negative control: delete `"amb_cta"` from `vi/landing.json`, and `localeParity` must FAIL. Restore it.

- [ ] **Step 5: Commit**

```bash
git add src/messages/en/landing.json src/messages/vi/landing.json src/messages/en/index.ts src/messages/vi/index.ts
git commit -m "feat(landing): en + vi copy for the public landing page"
```

### Task A3: Public app catalogue and the 9-dot launcher

**Files:**
- Create: `src/app/[locale]/(landing)/_lib/publicApps.ts`
- Create: `src/app/[locale]/(landing)/_components/PublicAppLauncher.tsx`
- Test: `src/app/[locale]/(landing)/_lib/__tests__/publicApps.test.ts`
- Test: `src/app/[locale]/(landing)/_components/__tests__/PublicAppLauncher.test.tsx`

**Interfaces:**
- Produces:
  - `type PublicApp = { appCode: string; name: string; color: string | null; iconUrl: string | null; url: string }`
  - `parsePublicApps(body: unknown): PublicApp[]`
  - `fetchPublicApps(fetchImpl?: typeof fetch): Promise<PublicApp[]>`
  - `<PublicAppLauncher />`, a default export with no props. It uses `useTranslations('Landing')`.

- [ ] **Step 1: Write the failing parser tests**

`src/app/[locale]/(landing)/_lib/__tests__/publicApps.test.ts`:

```ts
import { fetchPublicApps, parsePublicApps } from '../publicApps'

const entry = (over: Record<string, unknown> = {}) => ({
  app_code: 'CRM',
  name: 'CRM',
  description: 'x',
  color: '#123456',
  icon_url: 'https://crm.loanfactory.com/icon.png',
  url: 'https://crm.loanfactory.com/',
  ...over
})

describe('parsePublicApps', () => {
  it('maps the auth-service envelope and sorts by name', () => {
    const apps = parsePublicApps({ payload: [entry({ app_code: 'ZED', name: 'Zed' }), entry()] })

    expect(apps.map((a) => a.name)).toEqual(['CRM', 'Zed'])
    expect(apps[0]).toEqual({
      appCode: 'CRM',
      name: 'CRM',
      color: '#123456',
      iconUrl: 'https://crm.loanfactory.com/icon.png',
      url: 'https://crm.loanfactory.com/'
    })
  })

  it('drops entries whose url is missing, not https, or a script', () => {
    const apps = parsePublicApps({
      payload: [
        entry({ name: 'NoUrl', url: null }),
        entry({ name: 'Http', url: 'http://x.loanfactory.com/' }),
        entry({ name: 'Js', url: 'javascript:alert(1)' }),
        entry({ name: 'Ok' })
      ]
    })

    expect(apps.map((a) => a.name)).toEqual(['Ok'])
  })

  it('keeps an app with no icon and no color, and ignores a non-https icon', () => {
    const [app] = parsePublicApps({ payload: [entry({ icon_url: 'http://insecure/x.png', color: null })] })

    expect(app.iconUrl).toBeNull()
    expect(app.color).toBeNull()
  })

  it('returns an empty list for anything that is not the envelope', () => {
    expect(parsePublicApps(null)).toEqual([])
    expect(parsePublicApps({ payload: 'nope' })).toEqual([])
  })
})

describe('fetchPublicApps', () => {
  it('throws on a non-2xx answer so the launcher can offer a retry', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch

    await expect(fetchPublicApps(fetchImpl)).rejects.toThrow('503')
  })

  it('calls the public catalogue on the gateway', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ payload: [entry()] }) }) as unknown as typeof fetch

    await fetchPublicApps(fetchImpl)

    expect((fetchImpl as jest.Mock).mock.calls[0][0]).toMatch(/\/auth-svc\/public\/api\/v1\/applications$/)
  })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_lib/__tests__/publicApps.test.ts"`

Expected: FAIL, "Cannot find module '../publicApps'".

- [ ] **Step 3: Implement `publicApps.ts`**

```ts
/**
 * The apps a signed-out visitor can see in the 9-dot launcher: auth-service's public catalogue
 * (PublicApplicationController, the same list crm.loanfactory.com shows signed out). The SDK
 * AppLauncher needs a signed-in platform session, so the landing page reads this instead.
 */
export type PublicApp = {
  appCode: string
  name: string
  color: string | null
  iconUrl: string | null
  url: string
}

const PATH = '/auth-svc/public/api/v1/applications'

/** Only https links leave this page; anything else (a missing url, http, javascript:) is dropped. */
const httpsOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

export const parsePublicApps = (body: unknown): PublicApp[] => {
  const payload = (body as { payload?: unknown } | null)?.payload
  if (!Array.isArray(payload)) return []

  return payload
    .map((raw): PublicApp | null => {
      const item = raw as Record<string, unknown>
      const name = textOrNull(item.name)
      const url = httpsOrNull(item.url)
      if (!name || !url) return null
      return {
        appCode: textOrNull(item.app_code) ?? name,
        name,
        color: textOrNull(item.color),
        iconUrl: httpsOrNull(item.icon_url),
        url
      }
    })
    .filter((app): app is PublicApp => app !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const fetchPublicApps = async (fetchImpl: typeof fetch = fetch): Promise<PublicApp[]> => {
  const response = await fetchImpl(`${process.env.NEXT_PUBLIC_API_URL || ''}${PATH}`, {
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) throw new Error(`Public app catalogue answered ${response.status}`)
  return parsePublicApps(await response.json())
}
```

- [ ] **Step 4: Run the parser tests and see them pass**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_lib/__tests__/publicApps.test.ts"`

Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing launcher tests**

`src/app/[locale]/(landing)/_components/__tests__/PublicAppLauncher.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import PublicAppLauncher from '../PublicAppLauncher'
import { fetchPublicApps } from '../../_lib/publicApps'

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
jest.mock('../../_lib/publicApps', () => ({ fetchPublicApps: jest.fn() }))

const mocked = fetchPublicApps as jest.Mock

const APPS = [
  { appCode: 'ALLY', name: 'Ally', color: '#F36F25', iconUrl: 'https://ally.loanfactory.com/i.png', url: 'https://ally.loanfactory.com' },
  { appCode: 'RECRUIT', name: 'Recruit', color: '#15803D', iconUrl: null, url: 'https://recruit.loanfactory.com/' }
]

describe('PublicAppLauncher', () => {
  beforeEach(() => mocked.mockReset())

  it('loads the catalogue on first open and renders every app as a real link', async () => {
    mocked.mockResolvedValue(APPS)
    render(<PublicAppLauncher />)

    fireEvent.click(screen.getByRole('button', { name: 'apps_button' }))

    const ally = await screen.findByRole('link', { name: /Ally/ })
    expect(ally).toHaveAttribute('href', 'https://ally.loanfactory.com')
    expect(screen.getByRole('link', { name: /Recruit/ })).toHaveAttribute('href', 'https://recruit.loanfactory.com/')
    expect(mocked).toHaveBeenCalledTimes(1)
  })

  it('shows a letter mark when an app has no icon', async () => {
    mocked.mockResolvedValue(APPS)
    render(<PublicAppLauncher />)
    fireEvent.click(screen.getByRole('button', { name: 'apps_button' }))

    const recruit = await screen.findByRole('link', { name: /Recruit/ })
    expect(recruit.querySelector('img')).toBeNull()
    expect(recruit).toHaveTextContent('R')
  })

  it('falls back to the letter mark when an icon fails to load', async () => {
    mocked.mockResolvedValue(APPS)
    render(<PublicAppLauncher />)
    fireEvent.click(screen.getByRole('button', { name: 'apps_button' }))

    const ally = await screen.findByRole('link', { name: /Ally/ })
    fireEvent.error(ally.querySelector('img') as HTMLImageElement)

    await waitFor(() => expect(ally.querySelector('img')).toBeNull())
    expect(ally).toHaveTextContent('A')
  })

  it('offers a retry when the catalogue fails, and the retry loads it', async () => {
    mocked.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(APPS)
    render(<PublicAppLauncher />)
    fireEvent.click(screen.getByRole('button', { name: 'apps_button' }))

    fireEvent.click(await screen.findByRole('button', { name: 'apps_retry' }))

    expect(await screen.findByRole('link', { name: /Ally/ })).toBeInTheDocument()
  })

  it('closes on Escape and gives focus back to the button', async () => {
    mocked.mockResolvedValue(APPS)
    render(<PublicAppLauncher />)
    const button = screen.getByRole('button', { name: 'apps_button' })
    fireEvent.click(button)
    await screen.findByRole('link', { name: /Ally/ })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('link', { name: /Ally/ })).toBeNull()
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 6: Run them and see them fail**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_components/__tests__/PublicAppLauncher.test.tsx"`

Expected: FAIL, "Cannot find module '../PublicAppLauncher'".

- [ ] **Step 7: Implement `PublicAppLauncher.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { fetchPublicApps, type PublicApp } from '../_lib/publicApps'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const SKELETON_TILES = 6

/** One tile: the app's icon, or its first letter on its brand color when there is no usable icon. */
const AppTile = ({ app }: { app: PublicApp }) => {
  const [iconFailed, setIconFailed] = useState(false)
  const showIcon = Boolean(app.iconUrl) && !iconFailed

  return (
    <li>
      <a className="rl-launcher-tile" href={app.url}>
        <span className="rl-launcher-mark" style={{ background: showIcon ? 'transparent' : app.color ?? 'var(--accent)' }}>
          {showIcon ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote icons from many app domains
            <img src={app.iconUrl as string} alt="" width={32} height={32} onError={() => setIconFailed(true)} />
          ) : (
            app.name.charAt(0).toUpperCase()
          )}
        </span>
        {app.name}
      </a>
    </li>
  )
}

/**
 * The signed-out 9-dot launcher (#tera-plus: every landing page has one). A plain positioned panel
 * rather than a Mantine popover: a portal would follow the app color scheme, not this forced-dark page.
 * The catalogue loads on first open only, so the landing makes no API call until someone asks.
 */
const PublicAppLauncher = () => {
  const t = useTranslations('Landing')
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [apps, setApps] = useState<PublicApp[]>([])

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setApps(await fetchPublicApps())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, close])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && status === 'idle') void load()
  }

  return (
    <div className="rl-launcher" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="rl-waffle"
        aria-label={t('apps_button')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </button>

      {open && (
        <div className="rl-launcher-panel" id={panelId} role="dialog" aria-label={t('apps_title')}>
          <div className="rl-launcher-title">{t('apps_title')}</div>
          <div className="rl-launcher-label">{t('apps_all')}</div>

          {status === 'error' && (
            <div className="rl-launcher-state">
              <span>{t('apps_error')}</span>
              <button type="button" className="rl-pill-btn rl-ghost rl-sm" onClick={() => void load()}>
                {t('apps_retry')}
              </button>
            </div>
          )}

          {status === 'loading' && (
            <ul className="rl-launcher-grid" aria-busy="true">
              {Array.from({ length: SKELETON_TILES }, (_, i) => (
                <li key={i} className="rl-launcher-skeleton" />
              ))}
            </ul>
          )}

          {status === 'ready' && (
            <ul className="rl-launcher-grid">
              {apps.map((app) => (
                <AppTile key={app.appCode} app={app} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default PublicAppLauncher
```

- [ ] **Step 8: Run the launcher tests and see them pass**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_components/__tests__/PublicAppLauncher.test.tsx" "src/app/[locale]/(landing)/_lib/__tests__/publicApps.test.ts"`

Expected: PASS (11 tests). Negative control: make `httpsOrNull` return `value` unchanged, and the "drops entries…" test must FAIL. Revert.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(landing)/_lib" "src/app/[locale]/(landing)/_components/PublicAppLauncher.tsx" "src/app/[locale]/(landing)/_components/__tests__/PublicAppLauncher.test.tsx"
git commit -m "feat(landing): signed-out 9-dot launcher from the public app catalogue"
```

### Task A4: Landing links and the motion controller

**Files:**
- Create: `src/app/[locale]/(landing)/_lib/landingLinks.ts`
- Create: `src/app/[locale]/(landing)/_components/LandingMotion.tsx`
- Test: `src/app/[locale]/(landing)/_lib/__tests__/landingLinks.test.ts`
- Test: `src/app/[locale]/(landing)/_components/__tests__/LandingMotion.test.tsx`

**Interfaces:**
- Produces:
  - `SIGN_IN_HREF = '/login?next=%2Fmy-referrals'`
  - `lfHomeOrigin(host: string | null): 'https://www.viet18.com' | 'https://www.loanfactory.com'`
  - `<LandingMotion events={[title, subtitle][]} />`, a client component that renders `null`. It drives these DOM hooks:
    - `[data-rl-countdown]`: its text is the target, and the attribute is the start value.
    - `[data-rl-count]` inside a `.rl-row`.
    - `.rl-row`, which gets class `rl-in` once.
    - `[data-rl-cycle]`, the badge whose `b` and `span` text cycle through `events`.

- [ ] **Step 1: Write the failing link tests**

```ts
import { SIGN_IN_HREF, lfHomeOrigin } from '../landingLinks'

describe('landing links', () => {
  it('signs in through /login and comes back on My referrals', () => {
    expect(SIGN_IN_HREF).toBe('/login?next=%2Fmy-referrals')
  })

  it('points staging hosts at the staging homepage and everything else at production', () => {
    expect(lfHomeOrigin('recruit.viet18.com')).toBe('https://www.viet18.com')
    expect(lfHomeOrigin('recruit.loanfactory.com')).toBe('https://www.loanfactory.com')
    expect(lfHomeOrigin('localhost:3000')).toBe('https://www.loanfactory.com')
    expect(lfHomeOrigin(null)).toBe('https://www.loanfactory.com')
  })
})
```

- [ ] **Step 2: Run it and see it fail**, then implement `landingLinks.ts`:

```ts
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '@constants/routes'

/** /login owns every sign-in mode (signed in already, SSO, dev persona) and forwards `next`. */
export const SIGN_IN_HREF = `${PUBLIC_ROUTES.LOGIN}?next=${encodeURIComponent(PRIVATE_ROUTES.MY_REFERRALS)}`

const STAGING_HOME = 'https://www.viet18.com'
const PRODUCTION_HOME = 'https://www.loanfactory.com'

/**
 * The Loan Factory homepage that matches this deployment, so staging never sends a visitor to
 * production pages. recruit-fe has no build variable for it, and the host already says which one.
 */
export const lfHomeOrigin = (host: string | null): typeof STAGING_HOME | typeof PRODUCTION_HOME =>
  host?.split(':')[0].endsWith('viet18.com') ? STAGING_HOME : PRODUCTION_HOME
```

Run `npx jest --runTestsByPath "src/app/[locale]/(landing)/_lib/__tests__/landingLinks.test.ts"`. Expected: PASS.

- [ ] **Step 3: Write the failing motion tests**

```tsx
import { act, render } from '@testing-library/react'

import LandingMotion from '../LandingMotion'

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
}

let observed: { callback: IntersectionObserverCallback; targets: Element[] }
beforeEach(() => {
  observed = { callback: () => undefined, targets: [] }
  ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = jest.fn((callback) => {
    observed.callback = callback
    return { observe: (el: Element) => observed.targets.push(el), unobserve: jest.fn(), disconnect: jest.fn() }
  })
  document.body.innerHTML = `
    <b data-rl-countdown="30">23</b>
    <div data-rl-cycle><b>Licensed in TX, CA</b><span>Today</span></div>
    <div class="rl-row"><b data-rl-count="6">6</b></div>`
})

describe('LandingMotion', () => {
  it('changes nothing when the visitor prefers reduced motion', () => {
    setReducedMotion(true)
    render(<LandingMotion events={[['A', 'a'], ['B', 'b']]} />)

    expect(observed.targets).toHaveLength(0)
    expect(document.querySelector('[data-rl-countdown]')?.textContent).toBe('23')
  })

  it('marks a row once it scrolls in, and leaves every number at its real value', async () => {
    jest.useFakeTimers()
    setReducedMotion(false)
    render(<LandingMotion events={[['A', 'a'], ['B', 'b']]} />)
    const row = document.querySelector('.rl-row') as Element

    act(() => observed.callback([{ isIntersecting: true, target: row } as IntersectionObserverEntry], {} as IntersectionObserver))
    await act(async () => {
      jest.advanceTimersByTime(4000)
    })

    expect(row.classList.contains('rl-in')).toBe(true)
    expect(document.querySelector('[data-rl-count]')?.textContent).toBe('6')
    expect(document.querySelector('[data-rl-countdown]')?.textContent).toBe('23')
    jest.useRealTimers()
  })

  it('cycles the badge to the next example event', async () => {
    jest.useFakeTimers()
    setReducedMotion(false)
    render(<LandingMotion events={[['A', 'a'], ['B', 'b']]} />)

    await act(async () => {
      jest.advanceTimersByTime(3600 + 400)
    })

    expect(document.querySelector('[data-rl-cycle] b')?.textContent).toBe('B')
    jest.useRealTimers()
  })
})
```

jsdom has no `requestAnimationFrame` timing. Add this at the top of the test file:

```ts
beforeAll(() => {
  window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number
})
```

Fake timers advance both `setTimeout` and `performance.now()` (jest modern timers).

- [ ] **Step 4: Run them and see them fail**, then implement `LandingMotion.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

const COUNT_MS = 900
const COUNTDOWN_MS = 1400
const COUNTDOWN_DELAY_MS = 900
const CYCLE_MS = 3600
const SWAP_MS = 300
const ROW_THRESHOLD = 0.35

/** Eases `el`'s text from `from` to its real value `to`. It always ends on `to`, so the page is right at rest. */
const runNumber = (el: Element, from: number, to: number, ms: number, delay: number): void => {
  const start = performance.now() + delay
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / ms))
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * The landing's only JS motion. Everything it touches is already rendered with its final value;
 * this replays it. Nothing happens for a reader who prefers reduced motion.
 */
const LandingMotion = ({ events }: { events: [string, string][] }) => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    document.querySelectorAll('[data-rl-countdown]').forEach((el) => {
      runNumber(el, Number(el.getAttribute('data-rl-countdown')), Number(el.textContent), COUNTDOWN_MS, COUNTDOWN_DELAY_MS)
    })

    const badge = document.querySelector('[data-rl-cycle]')
    let index = 0
    const timer = window.setInterval(() => {
      if (!badge || events.length < 2) return
      badge.classList.add('rl-swap')
      window.setTimeout(() => {
        index = (index + 1) % events.length
        const [title, subtitle] = events[index]
        const b = badge.querySelector('b')
        const span = badge.querySelector('span')
        if (b) b.textContent = title
        if (span) span.textContent = subtitle
        badge.classList.remove('rl-swap')
      }, SWAP_MS)
    }, CYCLE_MS)

    if (!('IntersectionObserver' in window)) return () => window.clearInterval(timer)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('rl-in')
          entry.target.querySelectorAll('[data-rl-count]').forEach((el) => {
            runNumber(el, 0, Number(el.getAttribute('data-rl-count')), COUNT_MS, 150)
          })
          observer.unobserve(entry.target)
        })
      },
      { threshold: ROW_THRESHOLD }
    )
    document.querySelectorAll('.rl-row').forEach((row) => observer.observe(row))

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [events])

  return null
}

export default LandingMotion
```

Note: in Task A5, `data-rl-cycle` sits on the badge itself (`.rl-float.rl-f1`), which is what the `.rl-swap` CSS targets. Its `b` and its inner `div.rl-msg > span` are the first `b` and `span` inside it, so the selectors above find them.

- [ ] **Step 5: Run both test files and see them pass**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_lib/__tests__/landingLinks.test.ts" "src/app/[locale]/(landing)/_components/__tests__/LandingMotion.test.tsx"`

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(landing)/_lib/landingLinks.ts" "src/app/[locale]/(landing)/_lib/__tests__/landingLinks.test.ts" "src/app/[locale]/(landing)/_components/LandingMotion.tsx" "src/app/[locale]/(landing)/_components/__tests__/LandingMotion.test.tsx"
git commit -m "feat(landing): sign-in and homepage links, and the reduced-motion-aware motion controller"
```

### Task A5: The landing page itself

**Files:**
- Create: `src/app/[locale]/(landing)/landing.css` (verbatim copy of `docs/superpowers/plans/assets/2026-10-15-recruit-landing.css`: the hero title is `h1`, row and band titles are `h2`)
- Create: `src/app/[locale]/(landing)/layout.tsx`
- Create: `src/app/[locale]/(landing)/welcome/page.tsx`
- Create: `src/app/[locale]/(landing)/_components/LandingHeader.tsx`
- Create: `src/app/[locale]/(landing)/_components/LandingHero.tsx`
- Create: `src/app/[locale]/(landing)/_components/FeatureRows.tsx`
- Create: `src/app/[locale]/(landing)/_components/AmbassadorBand.tsx`
- Create: `src/app/[locale]/(landing)/_lib/sample.ts`
- Test: `src/app/[locale]/(landing)/_components/__tests__/LandingSections.test.tsx`

**Interfaces:**
- Consumes:
  - `SIGN_IN_HREF` and `lfHomeOrigin` (A4);
  - `<PublicAppLauncher />` (A3);
  - `<LandingMotion events />` (A4);
  - the `Landing` keys (A2).
- Produces: route `/welcome`, which is also what `/` renders signed out after A1.

- [ ] **Step 1: Copy the stylesheet**

```bash
cp ~/Projects/agentflow/docs/superpowers/plans/assets/2026-10-15-recruit-landing.css "src/app/[locale]/(landing)/landing.css"
```

- [ ] **Step 2: Write the sample data (`_lib/sample.ts`)**

```ts
/**
 * Fixed example data for the landing's product panels. Every panel that shows it carries an
 * "Example" chip. These are not real people, and the page makes no referral API call.
 */
export const SAMPLE_DATES = {
  referred: '2026-08-04',
  licensed: '2026-10-15',
  eligible: '2026-11-07',
  anReferred: '2026-09-12',
  mariaOnboarded: '2026-08-30',
  davidReferred: '2026-10-09',
  mariaEligible: '2026-10-29',
  requested: '2026-10-30',
  approved: '2026-11-03'
} as const

export const SAMPLE_STATES = 'TX, CA'
export const SAMPLE_DAYS_LEFT = 23
export const SAMPLE_COUNTDOWN_FROM = 30
export const SAMPLE_TOTALS = { referred: 6, inProgress: 3, onboarded: 2, bonusPending: 1, bonusPaid: 1 } as const
```

- [ ] **Step 3: Write the failing section tests**

```tsx
import { render, screen, within } from '@testing-library/react'

import AmbassadorBand from '../AmbassadorBand'
import FeatureRows from '../FeatureRows'
import LandingHeader from '../LandingHeader'
import LandingHero from '../LandingHero'

jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  getFormatter: async () => ({ dateTime: (d: Date) => d.toISOString().slice(0, 10) })
}))
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
jest.mock('../PublicAppLauncher', () => () => <button type="button">apps_button</button>)

const renderAsync = async (node: Promise<JSX.Element>) => render(await node)

describe('landing sections', () => {
  it('every Sign in goes through /login back to My referrals', async () => {
    await renderAsync(LandingHeader())
    await renderAsync(LandingHero())

    const links = screen.getAllByRole('link', { name: /sign_in/ })
    expect(links.length).toBeGreaterThanOrEqual(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/login?next=%2Fmy-referrals'))
  })

  it('marks every product panel as an example', async () => {
    await renderAsync(LandingHero())
    await renderAsync(FeatureRows())

    expect(screen.getAllByText('example').length).toBe(4)
  })

  it('never states a payout period or an amount', async () => {
    const { container } = await renderAsync(FeatureRows())

    expect(container.textContent).not.toMatch(/60|\$/)
  })

  it('sends the Ambassador button to the matching homepage', async () => {
    await renderAsync(AmbassadorBand({ home: 'https://www.viet18.com' }))

    expect(screen.getByRole('link', { name: /amb_cta/ })).toHaveAttribute('href', 'https://www.viet18.com/ambassador-program')
  })

  it('keeps the real totals in the markup, so the page is right without motion', async () => {
    await renderAsync(FeatureRows())

    const stats = screen.getByTestId('rl-stats')
    expect(within(stats).getByText('6')).toHaveAttribute('data-rl-count', '6')
  })
})
```

- [ ] **Step 4: Run it and see it fail** (modules missing), then implement the components.

`_components/LandingHeader.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'

import PublicAppLauncher from './PublicAppLauncher'
import { SIGN_IN_HREF } from '../_lib/landingLinks'

const LandingHeader = async () => {
  const t = await getTranslations('Landing')

  return (
    <nav className="rl-nav" aria-label={t('nav_aria')}>
      <div className="rl-wrap">
        <a className="rl-brand" href="#top">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app's own static icon */}
          <img src="/icon.svg" alt="" width={30} height={30} />
          Loan Factory <span>{t('brand_suffix')}</span>
        </a>
        <div className="rl-nav-links">
          <a href="#track">{t('nav_referrals')}</a>
          <a href="#bonus">{t('nav_bonus')}</a>
          <a href="#amb">{t('nav_ambassador')}</a>
        </div>
        <div className="rl-nav-right">
          <PublicAppLauncher />
          <a className="rl-pill-btn rl-primary rl-sm" href={SIGN_IN_HREF}>
            {t('sign_in')}
          </a>
        </div>
      </div>
    </nav>
  )
}

export default LandingHeader
```

`_components/LandingHero.tsx`:

```tsx
import { getFormatter, getTranslations } from 'next-intl/server'

import { SIGN_IN_HREF } from '../_lib/landingLinks'
import { SAMPLE_COUNTDOWN_FROM, SAMPLE_DATES, SAMPLE_DAYS_LEFT, SAMPLE_STATES } from '../_lib/sample'

const SHORT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }

const LandingHero = async () => {
  const t = await getTranslations('Landing')
  const format = await getFormatter()
  const day = (iso: string) => format.dateTime(new Date(`${iso}T00:00:00Z`), SHORT)

  return (
    <section className="rl-hero" id="top" aria-labelledby="rl-hero-h">
      <div className="rl-wrap">
        <div className="rl-hero-copy">
          <span className="rl-tag">{t('hero_tag')}</span>
          <h1 id="rl-hero-h">
            {t('hero_title_a')} <em>{t('hero_title_b')}</em>
          </h1>
          <p className="rl-lede">{t('hero_lede')}</p>
          <div className="rl-cta-row">
            <a className="rl-pill-btn rl-primary" href={SIGN_IN_HREF}>
              {t('sign_in')} →
            </a>
            <a className="rl-pill-btn rl-ghost" href="#track">
              {t('hero_how')}
            </a>
          </div>
          <div className="rl-chips">
            {(['chip_live', 'chip_countdown', 'chip_free'] as const).map((key) => (
              <span key={key} className="rl-chip">
                <b aria-hidden="true">●</b> {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div className="rl-stage" aria-label={t('example_aria')}>
          <div className="rl-float rl-f1" data-rl-cycle aria-live="off">
            <span className="rl-dot" />
            <div className="rl-msg">
              <b>{t('event_licensed', { states: SAMPLE_STATES })}</b>
              <span>{t('event_today')}</span>
            </div>
          </div>
          <div className="rl-ref">
            <div className="rl-ref-top">
              <div className="rl-avatar">JL</div>
              <div className="rl-who">
                <b>Jordan Lee</b>
                <span>
                  {t('referred_on', { date: day(SAMPLE_DATES.referred) })} · <span className="rl-ex">{t('example')}</span>
                </span>
              </div>
              <span className="rl-status rl-s-onb">{t('stage_onboarding')}</span>
            </div>
            <div className="rl-track">
              <div className="rl-on">
                <i />
                <b>{t('stage_referred')}</b>
                <span>{day(SAMPLE_DATES.referred)}</span>
              </div>
              <div className="rl-on">
                <i />
                <b>{t('stage_licensed')}</b>
                <span>{day(SAMPLE_DATES.licensed)}</span>
              </div>
              <div className="rl-cur">
                <i />
                <b>{t('stage_onboarded')}</b>
                <span>{t('in_progress')}</span>
              </div>
            </div>
            <div className="rl-bonus">
              <div className="rl-big" data-rl-countdown={SAMPLE_COUNTDOWN_FROM}>
                {SAMPLE_DAYS_LEFT}
              </div>
              <p>
                <b>{t('days_to_bonus')}</b>
                {t('eligible_on', { date: day(SAMPLE_DATES.eligible) })}
              </p>
            </div>
          </div>
          <div className="rl-float rl-f2">
            <span className="rl-dot" />
            <div>
              <b>{t('event_bonus_approved')}</b>
              <span>Maria Gomez</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
```

`_components/FeatureRows.tsx`:

```tsx
import { getFormatter, getTranslations } from 'next-intl/server'

import { SAMPLE_DATES, SAMPLE_STATES, SAMPLE_TOTALS } from '../_lib/sample'

const SHORT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }

type Translate = Awaited<ReturnType<typeof getTranslations<'Landing'>>>

const RowCopy = ({ t, n }: { t: Translate; n: 1 | 2 | 3 }) => (
  <div className="rl-row-copy">
    <span className="rl-eyebrow">{t(`r${n}_eyebrow`)}</span>
    <h2>{t(`r${n}_title`)}</h2>
    <p>{t(`r${n}_text`)}</p>
    <ul className="rl-ticks">
      <li>{t(`r${n}_tick1`)}</li>
      <li>{t(`r${n}_tick2`)}</li>
      <li>{t(`r${n}_tick3`)}</li>
    </ul>
  </div>
)

const FeatureRows = async () => {
  const t = await getTranslations('Landing')
  const format = await getFormatter()
  const day = (iso: string) => format.dateTime(new Date(`${iso}T00:00:00Z`), SHORT)

  const people = [
    { initials: 'JL', tone: '', name: 'Jordan Lee', sub: t('referred_licensed', { date: day(SAMPLE_DATES.referred), states: SAMPLE_STATES }), status: 'rl-s-onb', label: t('stage_onboarding') },
    { initials: 'AN', tone: 'rl-o', name: 'An Nguyen', sub: t('referred_on', { date: day(SAMPLE_DATES.anReferred) }), status: 'rl-s-lic', label: t('stage_licensing') },
    { initials: 'MG', tone: 'rl-g', name: 'Maria Gomez', sub: t('onboarded_on', { date: day(SAMPLE_DATES.mariaOnboarded) }), status: 'rl-s-done', label: t('stage_onboarded') },
    { initials: 'DP', tone: '', name: 'David Park', sub: t('referred_on', { date: day(SAMPLE_DATES.davidReferred) }), status: 'rl-s-new', label: t('stage_referred') }
  ]

  const stats = [
    { key: 'stat_referred', value: SAMPLE_TOTALS.referred, tone: '' },
    { key: 'stat_in_progress', value: SAMPLE_TOTALS.inProgress, tone: '' },
    { key: 'stat_onboarded', value: SAMPLE_TOTALS.onboarded, tone: 'rl-ok' },
    { key: 'stat_bonus_pending', value: SAMPLE_TOTALS.bonusPending, tone: 'rl-hl' },
    { key: 'stat_bonus_paid', value: SAMPLE_TOTALS.bonusPaid, tone: 'rl-ok' }
  ] as const

  return (
    <section className="rl-rows" aria-label={t('features_aria')}>
      <div className="rl-wrap">
        <div className="rl-row" id="track">
          <RowCopy t={t} n={1} />
          <div className="rl-panel">
            <div className="rl-card">
              <div className="rl-card-h">
                <b>{t('my_referrals')}</b>
                <span className="rl-ex">{t('example')}</span>
              </div>
              <div className="rl-filter">
                <span className="rl-on">{t('filter_all', { count: SAMPLE_TOTALS.referred })}</span>
                <span>{t('filter_in_progress', { count: SAMPLE_TOTALS.inProgress })}</span>
                <span>{t('filter_onboarded', { count: SAMPLE_TOTALS.onboarded })}</span>
              </div>
              <ul className="rl-list">
                {people.map((p) => (
                  <li key={p.name}>
                    <div className={`rl-avatar ${p.tone}`}>{p.initials}</div>
                    <div>
                      <b>{p.name}</b>
                      <small>{p.sub}</small>
                    </div>
                    <span className={`rl-status ${p.status}`}>{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rl-row rl-flip" id="bonus">
          <RowCopy t={t} n={2} />
          <div className="rl-panel">
            <div className="rl-card">
              <div className="rl-card-h">
                <b>{t('bonus_card', { name: 'Maria Gomez' })}</b>
                <span className="rl-ex">{t('example')}</span>
              </div>
              <div className="rl-count-row">
                <div className="rl-big rl-big-ok" aria-hidden="true">
                  ✓
                </div>
                <p>
                  <b>{t('bonus_reached')}</b>
                  {t('eligible_since', { date: day(SAMPLE_DATES.mariaEligible) })}
                </p>
              </div>
              <div className="rl-steps">
                <div className="rl-step rl-done">
                  <i>✓</i>
                  <b>{t('step_requested')}</b>
                  <span>{day(SAMPLE_DATES.requested)}</span>
                </div>
                <div className="rl-step rl-done">
                  <i>✓</i>
                  <b>{t('step_approved')}</b>
                  <span>{day(SAMPLE_DATES.approved)}</span>
                </div>
                <div className="rl-step rl-cur">
                  <i>3</i>
                  <b>{t('step_paid')}</b>
                  <span>{t('step_waiting')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rl-row">
          <RowCopy t={t} n={3} />
          <div className="rl-panel">
            <div className="rl-card">
              <div className="rl-card-h">
                <b>{t('this_year')}</b>
                <span className="rl-ex">{t('example')}</span>
              </div>
              <div className="rl-stats" data-testid="rl-stats">
                {stats.map((s) => (
                  <div key={s.key} className={s.tone}>
                    <b data-rl-count={s.value}>{s.value}</b>
                    <span>{t(s.key)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeatureRows
```

`_components/AmbassadorBand.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'

const AmbassadorBand = async ({ home }: { home: string }) => {
  const t = await getTranslations('Landing')

  return (
    <section className="rl-amb" id="amb" aria-labelledby="rl-amb-h">
      <div className="rl-wrap">
        <div className="rl-amb-card">
          <div>
            <h2 id="rl-amb-h">{t('amb_title')}</h2>
            <p>{t('amb_text')}</p>
          </div>
          <a className="rl-pill-btn" href={`${home}/ambassador-program`}>
            {t('amb_cta')} →
          </a>
        </div>
      </div>
    </section>
  )
}

export default AmbassadorBand
```

- [ ] **Step 5: Layout and page**

`src/app/[locale]/(landing)/layout.tsx`:

```tsx
import { Montserrat } from 'next/font/google'

import type { ReactNode } from 'react'

import './landing.css'

// Display face for the landing only (the app keeps Public Sans). 'vietnamese' for the vi locale.
const display = Montserrat({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-landing-display',
  display: 'swap'
})

/** The landing commits to one mid-dark look; .rl-root carries its own tokens (see landing.css). */
const LandingLayout = ({ children }: { children: ReactNode }) => (
  <div className={`rl-root ${display.variable}`}>{children}</div>
)

export default LandingLayout
```

`src/app/[locale]/(landing)/welcome/page.tsx`:

```tsx
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import type { Metadata } from 'next'

import AmbassadorBand from '../_components/AmbassadorBand'
import FeatureRows from '../_components/FeatureRows'
import LandingHeader from '../_components/LandingHeader'
import LandingHero from '../_components/LandingHero'
import LandingMotion from '../_components/LandingMotion'
import { lfHomeOrigin } from '../_lib/landingLinks'
import { SAMPLE_STATES } from '../_lib/sample'

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('Landing')
  return { title: t('meta_title'), description: t('meta_description'), robots: { index: true, follow: true } }
}

const WelcomePage = async () => {
  const t = await getTranslations('Landing')
  const headerList = await headers()
  const home = lfHomeOrigin(headerList.get('x-forwarded-host') ?? headerList.get('host'))
  const events: [string, string][] = [
    [t('event_licensed', { states: SAMPLE_STATES }), t('event_today')],
    [t('event_new_referral'), 'David Park'],
    [t('event_bonus_requested'), 'Maria Gomez']
  ]

  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <FeatureRows />
        <AmbassadorBand home={home} />
      </main>
      <footer className="rl-foot">
        <div className="rl-wrap">
          <span>{t('footer_copyright')}</span>
          <a href={`${home}/loan-officer`}>{t('footer_back')}</a>
        </div>
      </footer>
      <LandingMotion events={events} />
    </>
  )
}

export default WelcomePage
```

- [ ] **Step 6: Run the section tests and see them pass**

Run: `npx jest --runTestsByPath "src/app/[locale]/(landing)/_components/__tests__/LandingSections.test.tsx"`

Expected: PASS (5 tests). Negative control: change one `SIGN_IN_HREF` use in `LandingHero` to `'/login'`, and the first test must FAIL. Revert.

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/[locale]/(landing)" src/middleware.ts`

Expected: exit 0 for both. If `getTranslations<'Landing'>` typing does not resolve in this next-intl setup, type `Translate` as `(key: string, values?: Record<string, string | number>) => string`.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(landing)"
git commit -m "feat(landing): Loan Factory Recruit landing page (hero, three feature rows, Ambassador band)"
```

### Task A6: Full suite, local preview for Bao, visual checks

**Files:** none new, unless the checks below find a defect.

- [ ] **Step 1: Full jest and build**

```bash
tok=$(~/.claude/bin/ram-gate acquire jest landing-full --wait 900)
npx jest 2>&1 | grep -E "Tests:|Test Suites:"
~/.claude/bin/ram-gate release $tok
tok=$(~/.claude/bin/ram-gate acquire next-dev landing-build --wait 900)
npm run build 2>&1 | tail -15
~/.claude/bin/ram-gate release $tok
```

Expected: the suite count equals the A0 baseline plus the 5 new suites, with 0 failures. The build succeeds, and its route list shows `/[locale]/welcome`.

- [ ] **Step 2: Run locally in SSO-on mode so `/` shows the landing**

`/` only rewrites when SSO is configured. Run the dev server with `NEXT_PUBLIC_ACCOUNT_URL=https://account.viet18.com` and `NEXT_PUBLIC_API_URL=https://gateway.viet18.com` (both public staging values, listed in `.env.example`):

```bash
tok=$(~/.claude/bin/ram-gate acquire next-dev landing-preview --wait 900)
NEXT_PUBLIC_ACCOUNT_URL=https://account.viet18.com NEXT_PUBLIC_API_URL=https://gateway.viet18.com PORT=3107 npm run dev
```

- [ ] **Step 3: Screenshots (one Chromium, one context per width)**

Check `http://localhost:3107/` at 320, 768, 1024 and 1440 px, and once with `reducedMotion: 'reduce'`:
- `document.documentElement.scrollWidth === innerWidth` at every width (no horizontal overflow);
- the 9-dot opens and lists apps from staging (CORS from localhost may block it; if so, check this on staging in A7 instead);
- the page is complete with reduced motion.

Compare each screenshot side by side with the mockup (memory rule "compare mockup side by side").

- [ ] **Step 4: Ask Bao to look at `http://localhost:3107/`** and the vi version (switch the browser language, or set the `NEXT_LOCALE` cookie to `vi`). **Stop here until he approves.** Fix what he asks for, re-run Step 1, and commit.

- [ ] **Step 5: Stop the dev server and release the gate token.**

### Task A7: Review, merge, staging, production checks

- [ ] **Step 1: Push and open the PR.** Body: summary, screenshots, test plan, and the spec and plan paths.

```bash
git push -u origin feat/recruit-landing
gh pr create --repo LoanFactory-Inc/recruit-fe --base master --head feat/recruit-landing \
  --title "feat(landing): public landing page for Loan Factory Recruit" --body-file /tmp/landing-pr.md
```

- [ ] **Step 2: Two independent reviewers** (`code-reviewer` and `typescript-reviewer` agents). Each pulls the branch itself (memory: no agent trusts another). Fix every CRITICAL and HIGH finding, push, and get re-review until both approve.

- [ ] **Step 3: Merge, then promote to staging**

```bash
gh pr merge <n> --repo LoanFactory-Inc/recruit-fe --squash
sha=$(git ls-remote https://github.com/LoanFactory-Inc/recruit-fe refs/heads/master | cut -f1)
gh workflow run promote-staging.yml --repo LoanFactory-Inc/recruit-fe -f sha=$sha
gh run list --repo LoanFactory-Inc/recruit-fe --workflow cd-staging.yml --limit 3
```

Wait until the cd-staging run for `$sha` is green.

- [ ] **Step 4: Staging checks, in a fresh browser context with no cookies**
- `https://recruit.viet18.com/` shows the landing, and the address bar stays `/`.
- The 9-dot lists the apps, and Recruit is among them.
- Sign in, then the account portal, then the page comes back on `/my-referrals`.
- With an `lf_app` session, `/` goes to `/today`.
- Reduced motion keeps the page complete and still.

- [ ] **Step 5: Measure the spec section 6 risks on production** before promoting:
- recruit-be production config: is `referrals.enabled` on?
- Can a plain Loan Officer account (no recruit role, test account `bao.trinh+<tag>@loanfactory.com`) complete SSO into recruit and load `/my-referrals`? Use staging if production has no such account, and say which one was measured.

Report both results to Bao. If either fails, production still gets the landing, but PR B waits.

- [ ] **Step 6: Promote to production** (fast-forward):

```bash
git push origin origin/staging:refs/heads/production
```

Then measure `gh run list --workflow cd-production.yml`, and load `https://recruit.loanfactory.com/` in a cookie-less context.

- [ ] **Step 7: File a bead for the catalogue data, and update the spec.**
- Bead text: "auth-service public catalogue RECRUIT: description says 'Hire faster — post roles…', icon_url null, color #15803D. Set name 'Loan Factory Recruit', a Loan Officer referral description, icon https://recruit.loanfactory.com/icon.svg. Owner: platform."
- In the spec, edit section 3.1 "Sign in" to say the button links to `/login?next=%2Fmy-referrals`. Commit the spec change in agentflow.

---

## PR B: lf-homepage

### Task B0: Worktree

- [ ] **Step 1**

```bash
cd ~/Projects/agentflow/lf-homepage && git fetch origin
git worktree add _wt/recruit-card -b feat/loan-officer-recruit-card origin/master
cd _wt/recruit-card && npm ci
```

`npm ci` is required. A cloned `node_modules` skips the husky hooks (memory: reference_worktree_husky_hooks_silently_skipped).

### Task B1: The Recruit app node, its link, icon and 5/4 split

**Files:**
- Modify: `src/app/[locale]/(public)/loan-officer/_data/apps.ts`
- Modify: `src/app/[locale]/(public)/loan-officer/_data/links.ts`
- Modify: `src/app/[locale]/(public)/loan-officer/_components/AppIcon.tsx`
- Modify: `src/app/[locale]/(public)/loan-officer/_components/SoftwareSection.tsx:60`
- Create: `src/app/[locale]/(public)/loan-officer/_data/splitColumns.ts`
- Test: `src/app/[locale]/(public)/loan-officer/_data/__tests__/links.test.ts`
- Test: `src/app/[locale]/(public)/loan-officer/_data/__tests__/splitColumns.test.ts`

**Interfaces:**
- Produces:
  - `APP_LINKS.recruit: string`
  - `AppIconKey` gains `'referrals'`
  - node id `'referrals'` at index 4 of `APP_NODES`
  - `splitColumns<T>(items: T[]): [T[], T[]]`

- [ ] **Step 1: Write the failing tests**

Add to `links.test.ts`:
- in "sends production visitors…": `expect(APP_LINKS.recruit).toBe('https://recruit.loanfactory.com/')`
- in "keeps staging visitors…": `expect(APP_LINKS.recruit).toBe('https://recruit.viet18.com/')`
- in "has no link…": `expect(hasLandingLink(APP_LINKS.recruit)).toBe(true)`

Create `splitColumns.test.ts`:

```ts
import { APP_NODES } from '../apps'
import { splitColumns } from '../splitColumns'

describe('splitColumns', () => {
  it('puts the extra card on the left when the count is odd', () => {
    const [left, right] = splitColumns([1, 2, 3, 4, 5, 6, 7, 8, 9])

    expect(left).toEqual([1, 2, 3, 4, 5])
    expect(right).toEqual([6, 7, 8, 9])
  })

  it('splits an even count in half', () => {
    expect(splitColumns([1, 2, 3, 4])).toEqual([[1, 2], [3, 4]])
  })

  it('ends the left column with Loan Factory Recruit', () => {
    const [left] = splitColumns(APP_NODES)

    expect(left[left.length - 1].appName).toBe('Loan Factory Recruit')
  })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx jest --runTestsByPath "src/app/[locale]/(public)/loan-officer/_data/__tests__/links.test.ts" "src/app/[locale]/(public)/loan-officer/_data/__tests__/splitColumns.test.ts"`

Expected: FAIL. `APP_LINKS.recruit` is undefined, and `splitColumns` is missing.

- [ ] **Step 3: Implement**

`links.ts`:
- In the `LinkMap.apps` key union, add `| 'recruit'` after `'mosoRealEstate'`.
- In `STAGING.apps`, add `recruit: 'https://recruit.viet18.com/'`.
- In `PRODUCTION.apps`, add `recruit: 'https://recruit.loanfactory.com/'`.

`apps.ts`:
- Change the type to `export type AppIconKey = 'marketing' | 'crm' | 'processing' | 'lenders' | 'referrals' | 'funding' | 'mobile' | 'iq' | 'realEstate'`.
- Update the comment above `APP_NODES` to: `/** The tools around the Loan Officer. The first five sit on the left, the last four on the right (see splitColumns). */`.
- Insert the node after the `lenders` node:

```ts
  { id: 'referrals', icon: 'referrals', appName: 'Loan Factory Recruit', href: APP_LINKS.recruit },
```

`_data/splitColumns.ts`:

```ts
/** Left and right columns around the Loan Officer. An odd count puts the extra card on the left. */
export const splitColumns = <T>(items: readonly T[]): [T[], T[]] => {
  const cut = Math.ceil(items.length / 2)

  return [items.slice(0, cut), items.slice(cut)]
}
```

`SoftwareSection.tsx`:
- Import it with `import { splitColumns } from '../_data/splitColumns'`.
- Replace `const half = APP_NODES.length / 2` with `const [leftNodes, rightNodes] = splitColumns(APP_NODES)`.
- Use `leftNodes.map(...)` and `rightNodes.map(...)` in place of the two `slice` calls.

`AppIcon.tsx`: add after `lenders`:

```tsx
  referrals: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M18 8v6M15 11h6" />
    </>
  ),
```

- [ ] **Step 4: Run the tests and see them pass**

Same command as Step 2. Expected: PASS. Negative control: change `Math.ceil` to `Math.floor`, and the odd-count test must FAIL. Revert.

The existing test "leaves exactly LOS, Marketplace, LUNA+… without a link" must still pass unchanged, because Recruit has a link.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(public)/loan-officer"
git commit -m "feat(loan-officer): Loan Factory Recruit card in the AI mortgage platform section"
```

### Task B2: Card copy in 5 locales

**Files:**
- Modify: `src/messages/en.json`, `es.json`, `vi.json`, `zh.json`, `he.json`, at `LoanOfficerV1Page.software.apps`. Insert `"referrals"` after `"lenders"`.
- Test: `src/app/[locale]/(public)/loan-officer/_data/__tests__/messages.test.ts` already loops over `APP_NODES`, so it fails until all 5 locales have the key.

- [ ] **Step 1: Run the messages test and see it fail**

Run: `npx jest --runTestsByPath "src/app/[locale]/(public)/loan-officer/_data/__tests__/messages.test.ts"`

Expected: FAIL. `apps.referrals.purpose` is undefined in every locale.

- [ ] **Step 2: Add the copy.** Keep each file's existing formatting (lf-homepage messages use one key per line; memory: reference_lfh_vs_lo_messages_json_format). Edit the JSON by hand. Do not round-trip it through `json.dump`.

en:
```json
      "referrals": {
        "title": "Referrals and bonuses",
        "purpose": "Track every Loan Officer you refer.",
        "features": ["Stage of each referral", "Days until your bonus", "Bonus payment status", "Ambassador Program"]
      },
```
es:
```json
      "referrals": {
        "title": "Referidos y bonos",
        "purpose": "Sigue a cada Loan Officer que refieres.",
        "features": ["Etapa de cada referido", "Días hasta tu bono", "Estado del pago del bono", "Programa de Embajadores"]
      },
```
vi:
```json
      "referrals": {
        "title": "Giới thiệu và tiền thưởng",
        "purpose": "Theo dõi mọi Loan Officer bạn giới thiệu.",
        "features": ["Bước của từng người", "Số ngày tới tiền thưởng", "Tình trạng chi thưởng", "Chương trình Ambassador"]
      },
```
zh:
```json
      "referrals": {
        "title": "推荐与奖金",
        "purpose": "跟踪你推荐的每一位 Loan Officer。",
        "features": ["每位推荐人的阶段", "距离奖金的天数", "奖金发放状态", "大使计划"]
      },
```
he:
```json
      "referrals": {
        "title": "הפניות ובונוסים",
        "purpose": "עקבו אחרי כל Loan Officer שהפניתם.",
        "features": ["השלב של כל הפניה", "ימים עד הבונוס", "סטטוס תשלום הבונוס", "תוכנית השגרירים"]
      },
```

Match the array layout already used for `features` in each file. If a file puts one item per line, do the same.

- [ ] **Step 3: Run the tests and see them pass**

Run: `npx jest --runTestsByPath "src/app/[locale]/(public)/loan-officer/_data/__tests__/messages.test.ts" "src/app/[locale]/(public)/loan-officer/_data/__tests__/links.test.ts" "src/app/[locale]/(public)/loan-officer/_data/__tests__/splitColumns.test.ts"`

Expected: PASS. Negative control: remove one feature from `he.json`, and the test must FAIL. Restore it.

- [ ] **Step 4: Commit**

```bash
git add src/messages/en.json src/messages/es.json src/messages/vi.json src/messages/zh.json src/messages/he.json
git commit -m "feat(loan-officer): Recruit card copy in all five locales"
```

### Task B3: Local preview, PR, staging, production

- [ ] **Step 1: Build and run locally** (the pre-commit hook also runs `npm run build`):

```bash
tok=$(~/.claude/bin/ram-gate acquire next-dev recruit-card --wait 900)
PORT=3108 npm run dev
```

At 1440, 1024, 768 and 375 px, check `http://localhost:3108/loan-officer#software`:
- 5 cards left and 4 right on desktop;
- a dashed connector reaches the new card;
- the mobile stack shows the card after Marketplace;
- "Learn more" opens `https://recruit.viet18.com/` in a new tab;
- also check `he` (RTL) at 1440.

Ask Bao to look **before pushing**. Stop the server and release the token.

- [ ] **Step 2: PR into master.** Two reviewers plus the Repo Owner agent, then merge. Staging deploys from `master`. Check `https://www.viet18.com/loan-officer`.

- [ ] **Step 3: Production.** Only after PR A is live on production (A7 Step 6) and the A7 Step 5 risks were reported. Open a `master → production` PR pinned to the merged sha (memory: pin the commit, never the moving branch). Merge it, then check `https://www.loanfactory.com/loan-officer`.

- [ ] **Step 4: Close out.**
- Close the bead with the PR links.
- Update `docs/handoff/recruit-landing/HANDOFF.md` with the final state.
- Commit and push agentflow.
