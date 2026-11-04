## Summary
Port of lf-homepage #2618 (website disclosure) and #2619 (copy fixes) to the lo-homepage `/register-loan-officer` page. Bead agentflow-tdqcv.

- Basic information step: required Yes/No "Do you currently have a website or landing page that promotes mortgages?", at least one https URL when Yes, required approval acknowledgment (new keys in 5 locales).
- Payload: `toMortgageWebsitePayload` omits unanswered keys (never null/false for unanswered, null would clear stored data in packs); the main save sends the website keys only on step 0.
- Later steps: Loan Officers who passed Basic information before the question existed get a required disclosure card on Pay fee / Sign / NMLS (stored answer not boolean or ack not true). It locks Back and the stepper, shows a captcha error, and re-reads the stored answer after save.
- Copy: locked fee step text ("...we will give you access to the following steps."), single key (`_no_amount` removed), "sponsors" missing word in `can_not_sponsored` (en), "Returning LO" -> "Returning Loan Officer" (display label only, value unchanged).

## Differences from lf-homepage
- lo's register form is an older copy (no `lockedLoanOfficerType`, no `lockedReferral`, no lead origin), so the 3-way merge dropped the `setLockedLoanOfficerType` line; everything else is identical.
- `registration_information_is_being_reviewed` is left as lo has it (lo wording differs; not in scope).
- Spanish `fee_deferred_until_approved` uses lo's informal "tu" register instead of lf's "usted".
- Reads go through lo's `getRegisterLoanOfficer` (404 fallback to GetOp, #873/#874).

## Tests
- `registerLoanOfficerMortgageWebsite.test.ts` ported: 44/44 pass (`Test Suites: 1 passed`).
- Negative control: making the mapper emit `has_mortgage_website: null` when unanswered fails 7 tests; restored.
- tsc: only the pre-existing `loading.gif` module-declaration error (resolved by `next build`); eslint + prettier clean on changed files; `npm run build` OK (also run by the husky hook).

## Not done / notes
- Needs packs 3.64.1 deployed on production before the disclosure persists (same as lf-homepage).
- Not clicked through in a browser yet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
