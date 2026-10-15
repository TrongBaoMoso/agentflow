# Loan Factory Recruit: public landing page + /loan-officer card

Date: 2026-10-15 · Owner: Bao · Session: d11ae72d ("Landing page Ambassador program")
Approved mockup (v5): https://claude.ai/artifact/VLaTVjLpLYdBdkdJSzQtWW · file: `docs/superpowers/specs/assets/2026-10-15-recruit-landing-mockup.html`

## 1. Why

- Thuan wants every app in the ecosystem to have a public, signed-out landing page (#tera-plus, Phuong 25/09 and 28/09). Examples: crm.loanfactory.com, ally.loanfactory.com, loanfactoryiq.com, moso.com. Every landing page also needs the 9-dot app launcher (Phuong 29/09 and 01/10).
- The recruit app is an internal tool. Loan Officers still use one part of it: `/my-referrals`, where they see the people they referred, each person's stage, the days left to their bonus, and the bonus payment steps. Because of that, recruit gets a landing page, and /loan-officer gets a card for it in the "AI mortgage platform" section, like the other apps.
- Internal apps skip the Technology Advisor list and the sign-up form (Phuong, #tera-plus 28/09). Recruit has neither.

## 2. Decisions (Bao, 15/10)

| # | Decision |
|---|---|
| D1 | The landing lives at the root of the app, `recruit.loanfactory.com/` (staging `recruit.viet18.com/`), like Ally, CRM and IQ. |
| D2 | The root depends on the session. A visitor with the app session cookie `lf_app` still goes straight to `/today`, as today. A visitor without it sees the landing instead of being sent to the account portal. |
| D3 | App name **Loan Factory Recruit**. Card title **Referrals and bonuses**. |
| D4 | Loan Officers can sign in. The main button is **Sign in**. It uses the existing SSO hand-off and returns to `/my-referrals`. |
| D5 | /loan-officer gets a 9th card at the end of the left column (5 left, 4 right). |
| D6 | The page is always mid-dark (warm charcoal), whatever the visitor's system theme. It is not black. |
| D7 | Motion, as in the mockup: the hero plays once on load, and each feature row plays once as it scrolls in. Nothing moves when the visitor prefers reduced motion. |
| D8 | Content shows only what `/my-referrals` really does. There is no "60 days" claim and no dollar amount, because the payout timing is still open (bead `agentflow-lklmx`). Amounts live on the program pages. |

## 3. What gets built

### 3.1 recruit-fe: the landing page (PR A)

**Routing**
- `src/middleware.ts` `rootDestination` keeps its two existing branches: an `lf_app` session goes to `/today`, and so does a dev-persona build or a build without SSO.
- The third branch changes. A signed-out visitor with SSO configured used to get a 307 to the account portal. Now the middleware **rewrites** `/` to the landing route, so the address bar keeps `/`. The rewrite sets the locale header the same way `rewriteUndecodable` does.
- The landing route is `src/app/[locale]/(landing)/welcome/page.tsx`, a route group beside `(public)` and `(private)`. A group nested inside `(public)` would still inherit `(public)/layout.tsx` and its `PublicShell` (the centered login card). The route is also reachable directly at `/welcome` for previews and QA.
- `/login` is unchanged. It still hands the visitor straight to the portal for deep links and expired sessions.

**Sign in**
- Every "Sign in" button links to `buildAccountLoginUrl(origin, '/my-referrals')`. The callback already honours `next` (`safeNext` guards against open redirects).
- Signed-in internal staff never see the landing, because D2 sends them to `/today`.

**Sections** (copy as in the mockup, en + vi in `src/messages/{en,vi}/landing.json`)
1. Header: Recruit icon (`/icon.svg`), "Loan Factory **Recruit**", anchors (Your referrals · Bonus · Ambassador Program), the 9-dot launcher, and a Sign in pill. The anchors hide below 960px.
2. Hero:
   - Tag "For Loan Officers who refer Loan Officers".
   - Headline "Refer a Loan Officer. **See when you get paid.**", with the second sentence in orange.
   - One-line lede.
   - Two buttons: Sign in, and See how it works (scrolls to #track).
   - Three chips.
   - On the right, an example referral card with two floating badges.
3. Feature rows, alternating sides. Each row has an eyebrow, a headline, one line of text, three ticks, and an example panel built from the real `/my-referrals` vocabulary:
   - Your referrals: a list with stage pills and a stage filter.
   - Your bonus: requested → approved → paid steps.
   - Your numbers: the five totals.
4. Ambassador band: "Refer more with the Ambassador Program." Button to `{lf-homepage}/ambassador-program`. That is `www.loanfactory.com` on production and `www.viet18.com` on staging, chosen by `NEXT_PUBLIC_ENV`.
5. Footer: © Loan Factory, and a link back to `/loan-officer` on the same lf-homepage origin.

Every example panel carries a visible "Example" chip, and its names and numbers are fixed sample data. The page makes no API call for referral data.

**9-dot launcher**
- The SDK's `AppLauncher` (platform-react 0.4.37) needs a signed-in platform session, so it cannot run here. Instead, recruit-fe gets a small `PublicAppLauncher`.
- It reads the public catalogue `GET {NEXT_PUBLIC_API_URL}/auth-svc/public/api/v1/applications`. That is the same auth-service `PublicApplicationController` data CRM shows signed out.
- It renders the same 3-column tile grid, with the title "Loan Factory apps", in a Mantine `Popover`.
- Each tile is an `<a href={app.url}>`. When `icon_url` is null, the tile shows a letter mark in `app.color`.
- Error and loading states:
  - While loading, the popover shows a skeleton grid.
  - On failure it shows "Couldn't load the apps. Try again." with a retry button.
  - The waffle button itself always renders.

**Theme and motion**
- The landing pins its own dark token set on the page root, scoped to the `(landing)` layout. It never reads the app's color-scheme toggle, and it sets `color-scheme: dark`.
- Fonts are Montserrat (display) and Public Sans (body) through `next/font/google`, loaded only in the landing layout.
- Motion is CSS keyframes on `transform` and `opacity`, all inside `@media (prefers-reduced-motion: no-preference)`.
  - One `IntersectionObserver` adds `.in` to each feature row once.
  - A `requestAnimationFrame` counter runs the hero countdown (30→23) and the totals (0→n).
  - The hero badge cycles through three example events every 3.6 s.
  - Content is complete at rest. No element waits at `opacity: 0` for an observer that may never fire.

**SEO and meta**
- The page has a title ("Loan Factory Recruit"), a description and an Open Graph image (the hero card).
- `robots` allows `/` and `/welcome` only. The rest of the app stays noindex as today.

### 3.2 lf-homepage: the /loan-officer card (PR B)

| File | Change |
|---|---|
| `_data/apps.ts` | Add the node `{ id: 'referrals', icon: 'referrals', appName: 'Loan Factory Recruit', href: APP_LINKS.recruit }` as the **5th** item, so it ends the left column. Add `'referrals'` to `AppIconKey`. |
| `_data/links.ts` | Add `recruit` to `LinkMap.apps`. Staging is `https://recruit.viet18.com/` and production is `https://recruit.loanfactory.com/`. |
| `_components/AppIcon.tsx` | Add a `referrals` icon: an outline person with a plus sign, matching the stroke style of the other icons. |
| `_components/SoftwareSection.tsx` | Split the columns with `Math.ceil(APP_NODES.length / 2)`, so 9 nodes become 5 left and 4 right. Re-check the dotted connector lines and the mobile stack order. |
| `src/messages/{en,es,vi,zh,he}.json` | Add `LoanOfficerV1Page.software.apps.referrals`: title "Referrals and bonuses", purpose "Track every Loan Officer you refer.", features "Stage of each referral", "Days until your bonus", "Bonus payment status" and "Ambassador Program". Each locale gets its own translation. |
| `_data/__tests__/links.test.ts` | Test that production points to recruit.loanfactory.com and staging points to recruit.viet18.com. |

lf-homepage branches from `master` and opens its PR into `master`. Promotion to `production` is a separate PR (repo workflow since 22/09).

## 4. Order and dependencies

1. **PR A (recruit-fe)** goes first. It is merged to staging, the landing is checked on recruit.viet18.com, and then it is promoted to production.
2. **PR B (lf-homepage)** can be built in parallel. It should reach production only after PR A is live on production. Otherwise "Learn more" would open the account portal instead of a landing page.

## 5. Testing

recruit-fe (jest):
- `middlewareRootRouting.test.ts`:
  - The existing four cases keep passing.
  - The signed-out case now expects a **rewrite** to the landing (an `x-middleware-rewrite` header ending in `/welcome`, with the locale set) and no 307 to the portal.
  - Negative control: with `lf_app` present the result is still a redirect to `/today`.
- `PublicAppLauncher` tests:
  - It renders tiles from a mocked catalogue.
  - It renders a letter mark when `icon_url` is null.
  - It shows the retry state on failure.
  - Every tile is a real link.
- The landing renders in both locales. Key parity is covered by the existing `localeParity` and `translationKeysResolve` tests.
- Every Sign in href ends with `next=%2Fmy-referrals`.

lf-homepage (jest):
- `links.test.ts` gets the new entries.
- `messages.test.ts` checks that the 5 locales contain the new keys.
- A unit test checks the 5/4 split.

Manual and visual checks (with ram-gate, one Chromium):
- The landing at 320, 768, 1024 and 1440 px has no horizontal overflow.
- With reduced motion on, the page is complete and still.
- Signed out, `/` shows the landing.
- Signed in, `/` goes to `/today`.
- Sign in, then the portal, then the page comes back on `/my-referrals`.
- /loan-officer at 1440 and 375 px shows the card in the left column, and the mobile stack keeps it in place.
- Bao reviews both pages on a local run **before** anything is pushed (local-preview rule).

## 6. Risks and open points

- **Can a Loan Officer actually open `/my-referrals` on production?** Bao says yes (D4). The plan still measures it before PR A ships:
  - the `referrals.enabled` flag on production recruit-be;
  - whether a plain Loan Officer account without a recruit role can complete SSO into recruit and load `/my-referrals`.
  If either fails, the landing still ships, but that gap is reported to Bao before the /loan-officer card goes live.
- The public catalogue's RECRUIT entry is wrong: its description is "Hire faster — post roles…", it has no icon, and its color is green. That is auth-service data, not code. The plan files a bead to ask the platform owner to set the right name, description, icon (`https://recruit.loanfactory.com/icon.svg`) and color. The landing does not depend on it.
- Staff whose session has expired now see the landing first. They need one extra click on Sign in. This was accepted in D2.

## 7. Out of scope

- Technology Advisor list and sign-up (internal app).
- Any change to `/my-referrals` itself.
- Moving `PublicAppLauncher` into tera-components. That is a follow-up bead once a second app needs a signed-out launcher in React.
