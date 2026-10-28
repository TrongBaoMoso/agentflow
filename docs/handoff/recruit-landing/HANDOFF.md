# Recruit landing page: HANDOFF

Paused 2026-10-15 ~17:45 (Bao shut the machine down). Session d11ae72d-de7f-4ddd-a20e-7e14eb5cdab9, named "Landing page Ambassador program".

## FINAL STATE (16/10 ~00:45 VN): SHIPPED

- **recruit-fe #487** is on PRODUCTION (290f0d5c).
  - Landing at recruit.loanfactory.com/.
  - Recruit header lockup.
  - A zero-grant Loan Officer gets My referrals only.
  - Verified in a real browser: landing, 9-dot with 14 apps incl. CRM, Sign in → account SSO.
- **recruit-be #648** (rsnyo: findKey skips REVOKED) is on PRODUCTION (747b9130).
  - Bao kept LAZY_SSO self-links and accepted the residual risk.
  - Follow-ups are in a P3 bead ("rsnyo follow-ups").
- **Production `referrals.enabled`:**
  - It was on for about 3.5 min by mistake on 15/10 (16:05:45Z–16:09:19Z); there was no exposure, see the rsnyo bead comment.
  - Back on at 17:38:21Z, after the fix reached production.
- **lf-homepage #2671** (Recruit card) is on STAGING ONLY. Bao: never production.
  - Code gate: `APP_NODES` shows the card only when `NEXT_PUBLIC_ENV` is `staging` or `development`.
  - Production /loan-officer is verified at 4+4 cards.
- **Spec:** updated as built (D8, D9, sign-in link, catalogue source).
- **Plan executed inline.** Ledger: `.superpowers/sdd/2026-10-15-recruit-landing/progress.md` (gitignored).
- **Deferred minors:**
  - keyframe names not rl-prefixed;
  - light overscroll band;
  - the gate and menu disagree when has_referrals=false or a person has roles but no grants;
  - the hex regex {3,8} is loose.

**16/10 follow-up (recruit-fe #489, on production):**
- The launcher puts each icon on a light tile (as in Ally/CRM/MOSO), so dark icons are visible.
- It falls back to `{origin}/favicon.ico` when the catalogue has no icon, so Nova shows.
- The tab and app name are "Loan Factory Recruit" (was "LF Recruit").
- Luna shows a letter because its favicon is unreachable, the same as in the other apps.
- A real Loan Officer, Armando, tested on production: he landed on My referrals with an empty state, as expected.

## CLOSE-OUT AUDIT 28/10 (measured, session closed)

**Shipped, verified on origin:**
- recruit-fe #487 (290f0d5c) and #489 (bacae1de) are on production.
- recruit-be #648 (747b9130) is on production.
- lf-homepage #2671 (e3ad06d5) is on master/staging only.
  - Since the 22/10 revert the card shows only on www.viet18.com/loan-officer-old.
  - Production /loan-officer and /loan-officer-old show no card.
- The recruit landing is live on prod and staging, titled "Loan Factory Recruit".
- Prod `referrals.enabled` is true (since 15/10 17:38:21Z).
- Prod `referrer_identity` has 5 LAZY_SSO rows.
- Beads ztjoj and rsnyo are closed. No stray pods and no worktrees remain.

**Open, nothing blocked:**
- Bead agentflow-w6d5v (P3, rsnyo follow-ups) is not started.
  - Unlink revokes only ADMIN_CONFIRMED rows.
  - The presence and packs caches are not invalidated on unlink.
- A zero-grant Loan Officer with 0 referrals gets an empty menu. The cause is `recruitNav.tsx` `myReferralsOn` requiring `has_referrals !== false`; the gate still lands them on /my-referrals. This needs Bao's decision.
- Deferred minors are unchanged: keyframes not rl-prefixed, hex regex {3,8}, light overscroll band, Luna favicon.
- These merged remote branches still exist (safe to delete):
  - recruit-fe feat/recruit-landing
  - recruit-fe fix/landing-launcher-icons
  - recruit-be fix/rsnyo-revoked-link
  - lf-homepage feat/loan-officer-recruit-card

## UPDATE 28/10 afternoon (after the close-out audit)

- **Shipped to STAGING:** recruit-fe #601 (c72bfec0). It was reviewed by 2 reviewers, and staging was checked live.
  - A no-role Loan Officer always sees My referrals in the menu. The staff rule is unchanged.
  - Landing keyframes now use the `rl-` prefix.
  - The landing has no light overscroll band.
  - The hex check is strict.
- **Not shipped:** Luna's icon, which needs a fix on Luna's side.
- **Beads:** w6d5v is merged into agentflow-ouror and closed. Its fix will be done when the Program members tab comes back. That tab is hidden on staging and its Unlink has never been used on prod.
- **Branches:** the 4 merged remote branches are deleted.
- **Prod promote (Bao: go if nothing reaches real Loan Officers automatically):**
  - 3 independent audits all came back SAFE.
  - It is blocked on the Secret Manager confirmation in recruit-be PR #756; I commented there.
  - Bead **agentflow-g9j11** has the details and the order of steps.
  - Gateway `APP_ACCESS_ENFORCE` is still off on prod.

## RESUME POINT (historical)

**Done**
- The design is approved and the spec is committed (`dbc6594`).
- Spec: `docs/superpowers/specs/2026-10-15-recruit-landing-design.md`.
- Mockup v5: mid-dark with animation. The file is `docs/superpowers/specs/assets/2026-10-15-recruit-landing-mockup.html`, and the artifact is https://claude.ai/artifact/VLaTVjLpLYdBdkdJSzQtWW.

**Update 15/10 evening:** the plan is written at `docs/superpowers/plans/2026-10-15-recruit-landing.md`, and its stylesheet is at `docs/superpowers/plans/assets/2026-10-15-recruit-landing.css`.

**Next step**
1. Bao reviews the plan and chooses how to execute it: subagent-driven or native.
2. Then follow the plan from Task A0.
3. Do not write product code before Bao approves the plan.
4. Bao must see both pages on a local run before anything is pushed.

## Decisions already taken (do not ask again)

- The landing is at the root `recruit.loanfactory.com/`.
  - `lf_app` cookie → `/today`, as today.
  - Signed out (with or without `lf_session`) → middleware **rewrite** to the landing route.
- The name is "Loan Factory Recruit". The card title is "Referrals and bonuses".
- Loan Officers can sign in. Sign in uses `buildAccountLoginUrl(origin, '/my-referrals')`.
- /loan-officer gets a 9th card at the end of the left column, so the columns are 5 left and 4 right.
- The landing is always **mid-dark** (warm charcoal, not black). Bao rejected the black version as "dark quá lố".
- Animation is wanted, as in mockup v5. Everything is off under prefers-reduced-motion.
- No Technology Advisor block. Internal apps skip it (Phuong, #tera-plus 28/09).
- No "60 days" claim and no dollar amounts (bead agentflow-lklmx).

## Code facts gathered (so the plan can be written without re-reading)

### recruit-fe (origin/master; base master)

**Next.js and libraries**
- Next 15.5.12, next-intl 4.8.2, Mantine 8, jest 30 (next/jest, jsdom).
- Locales are `en` and `vi`, with `localePrefix: 'never'`.

**`src/middleware.ts`**
- `if (pathname === '/') return Response.redirect(rootDestination(request), 307)`.
- `rootDestination`:
  - `lf_app` cookie, `isDevIdentityEnabled()` or `!isSsoConfigured()` → `${publicOrigin}/today`;
  - otherwise → `buildAccountLoginUrl(origin)`.
- `rewriteUndecodable` shows the rewrite pattern: `NextResponse.rewrite(url, { request: { headers } })`, with `X-NEXT-INTL-LOCALE` set from `localeFor(request, firstSegment)`.

**`src/__tests__/middlewareRootRouting.test.ts`**
- Helpers: `loadMiddleware({account, devUser})`, `requestWith(path, cookies)`, `locationOf(response)`.
- `ORIGIN` is https://recruit.viet18.com and `INTERNAL` is https://0.0.0.0:3000.
- These cases must change to expect the landing rewrite:
  - "hands a signed-out visitor to the portal directly";
  - "treats a platform-only session (lf_session) as signed out".

**`src/shared/utils/accountLogin.ts`**
- `buildAccountLoginUrl(origin, next?)`.
- The `safeNext` guard and `SSO_CALLBACK_PATH = '/auth/callback'`.

**Layouts**
- `src/app/[locale]/layout.tsx` is the root html. It has `ColorSchemeScript defaultColorScheme="auto"`, Public_Sans `--font-app`, `NextIntlClientProvider`, `MasterProvider` and `AppProvider`.
- `src/app/[locale]/(public)/layout.tsx` wraps everything in `PublicShell` (the login card). The landing must be a SIBLING group: `src/app/[locale]/(landing)/welcome/page.tsx`.

**Messages and tests**
- Messages live in `src/messages/{en,vi}/*.json` and are spread in `src/messages/{en,vi}/index.ts`. Add `landing.json` with a `Landing` namespace.
- `src/messages/__tests__/localeParity.test.ts` enforces key parity.
- The component test pattern is in `my-referrals/_components/__tests__/ReferralCard.test.tsx`: it mocks next-intl `useTranslations` to return the key, and renders inside `MantineProvider`.

**APIs and assets**
- The API base is `process.env.NEXT_PUBLIC_API_URL`. The browser already calls `/auth-svc` there directly.
- The public app catalogue is auth-service `GET /auth-svc/public/api/v1/applications` (`PublicApplicationController`). It returns `{ payload: [{ app_code, name, description, color, icon_url, url }] }`. CRM serves the same data at `crm.loanfactory.com/api/engagement/public/applications`.
- The SDK `AppLauncher` (platform-react 0.4.37) needs a signed-in session. Build a small local `PublicAppLauncher` instead. Use a plain popover panel, because a Mantine portal would follow the app color scheme, not the forced-dark landing.
- The Recruit icon is `src/app/icon.svg`, served at `/icon.svg`. It has a blue→violet gradient.

### lf-homepage (origin/master; branch from master, PR into master)

**`src/app/[locale]/(public)/loan-officer/`**
- `_data/apps.ts`: `APP_NODES` (8 nodes) and `AppIconKey`.
- `_data/links.ts`: `LinkMap.apps`, with STAGING (viet18) and PRODUCTION entries.
- `_components/AppIcon.tsx`: a `Record<AppIconKey, ReactNode>` of SVG paths.
- `_components/SoftwareSection.tsx`: `const half = APP_NODES.length / 2`, then `slice(0, half)` and `slice(half)`. With 9 nodes that gives 4 left and 5 right, so it must become `Math.ceil`.
- Tests in `_data/__tests__/`:
  - `links.test.ts` uses `loadLinks(env)` with `jest.isolateModules`;
  - `messages.test.ts` checks that every APP_NODES id has a purpose and the same number of features as en, across the 5 locales.

**Messages**
- `src/messages/{en,es,vi,zh,he}.json`, at the key `LoanOfficerV1Page.software.apps.<id>.{title,purpose,features[]}`.

## Open risks to measure before PR A ships

- Production recruit-be: is the `referrals.enabled` flag on?
- Can a plain Loan Officer (no recruit role) complete SSO into recruit and load `/my-referrals`? (Bao says yes.)
- The public catalogue's RECRUIT entry has a wrong description ("Hire faster…"), `icon_url` null and color #15803D. File a bead for the platform owner.

## Screenshot tooling note

- The Playwright MCP browser was held by another session.
- Screenshots were taken with a scratchpad playwright@1.55.0 and the headless shell at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`, always behind `~/.claude/bin/ram-gate acquire chrome`.
- The scratchpad lives in /private/tmp and is wiped on reboot. Reinstall it if needed.
