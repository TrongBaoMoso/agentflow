## Summary
Port of lf-homepage #2620 + #2626 to lo-homepage. Bead agentflow-tdqcv. **Depends on PR-1 (#876 for master, #877 for release): merge those first.** This PR's branch contains the PR-1 commit until then, so its diff shows both.

- New route `/register-loan-officer-v1`: noindex, not linked anywhere, enabled via `RELEASE_PAGES` (lo's middleware gates released pages per main path segment on staging/production; works under LO base paths and custom domains the same as the live page). Old `/register-loan-officer` page unchanged in behavior.
- Basic information in four short parts with the approved step-rail UI, single save after part 4, sponsorship Confirm only for a SC/AR/NE sponsor state (Cancel removes them), mailing address pre-checked for new applicants (with the prefill fix), CA DRE number only when CA is a sponsor state, compensation help collapse, website disclosure card in v1 style, later-step gate in v1 style.
- Server view extracted to `RegisterLoanOfficerView` (page.tsx keeps lo's `generateMetadata`); both routes share it.
- `jest.config.js`: alias mapper copied from lf-homepage (needed to mock by alias in component tests).

## Differences from lf-homepage (lo-specific behavior kept)
- Referral: lo forces `referred_source` to the Loan Officer option and defaults `referred_by` to the site owner (company email via `loInfoState`); both selects stay disabled. v1 prefill hook and ReferralPart follow that, not lf's lockedReferral logic.
- Licensing link in the CA/IN note uses `convertPathToLOPage(..., basePathLO)`.
- Not ported because lo has no such feature: `lockedLoanOfficerType` (1-1 lock), `lockedReferral`, lead origin, `registerLoanOfficerType`. The state-rule test was reduced to the rules lo has.
- lf's team-lead picker / ambassador / other master changes are not part of this.

## Tests
- Full jest: 17 suites, 194 tests pass. New/ported: BasicInfoFormV1Parts (13, incl. new lo test: referral forced to site owner and disabled), BasicInfoFormV1LoanOfficerType (2), registerLoanOfficerParts, registerLoanOfficerMortgageWebsite.
- Negative control: removing the mailing-prefill fix in `useBasicInfoUrlPrefill` fails the "starts with same as home checked" test; restored.
- tsc (only the pre-existing loading.gif declaration error), eslint, prettier clean; `npm run build` passed (husky hook); all i18n keys used by v1 exist in en.json; 5 locales added.
- Visual: next dev with the staging test LO (`?internalLoKey=...&internalBasePath=mama`): v1 renders the Before You Begin gate and part 1 (step rail, part list, cards, sticky action bar) at 1440 and 375. Parts 2-4 were NOT screenshotted or compared against the mockup (covered by jest only).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
