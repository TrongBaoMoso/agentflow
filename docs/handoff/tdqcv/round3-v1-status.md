# tdqcv v1 register UI: round 3 status (paused, uncommitted)

Worktree: /Users/apple/Projects/agentflow/_worktrees/rlo-v1-round2 (branch feat/register-lo-v1-round2).
Committed and pushed earlier: a66decdc (PR #2627, draft). Everything from round 1, 2 and 3 is UNCOMMITTED in the worktree.

## Done (code complete, not seen in a browser: dev server on 3100 was down)
- Clickable "Your part" hero cards 1-5 (real buttons, same guards as left stepper, aria-disabled otherwise).
- Real-done statuses for hero track AND v1 left stepper via one pure function getJourneyStatuses / getJourneyCaption.
- Captions in 5 locales (V1Hero.status_*).
- Checks: tsc passes (exit 0); eslint, prettier, stylelint clean; jest 8 register suites, 74 tests pass.

## Half-done / unverified
- Nothing visual verified for round 3 (server down). After restart: touch src/messages/*.json if raw V1Hero.* keys show.
- Signed status depends on lo_agreement_signed / paid_and_signed being returned by getRegisterLoanOfficer. Unconfirmed; if absent, Sign never shows done.

## Data fields used
- Fill out: complete_percentage >= STEP_MENU[1].minProcess
- Call: onboarding_meeting_status in (pre_onboarding_done, setup_done) via isApprovedForStartupFee
- Pay: paid_startup_fee, or no fee (waive_startup_fee / config off via isStartupFeeRequired)
- Sign: lo_agreement_signed || paid_and_signed (optional fields added to RegisterLoanOfficerResponse in moso-types.ts)
- NMLS: saved give_nmls_access === true (from load response, and after successful save)

## Files touched (round 3, uncommitted; plus rounds 1-2 edits)
- src/shared/utils/registerLoanOfficerJourney.ts
- src/apis/moso-types.ts
- src/messages/{en,es,vi,zh,he}.json
- RegisterLoanOfficerForms/index.tsx, V1Hero/index.tsx, BasicInfoFormV1/ui/V1Frame.tsx, BasicInfoFormV1/ui/v1.css
- RegisterLoanOfficerForms/BasicInfoFormV1/index.tsx, parts/AnswerSummary.tsx (round 1)
- RegisterLoanOfficerView.tsx (round 2)
- __tests__/V1Hero.test.tsx, registerLoanOfficerJourney.test.ts, AnswerSummary.test.tsx

## Round 4 (v1 action bar vs video popup)
- Action bar is no longer sticky: `.rlo-actions` is position:relative, `ActionBar` uses `mt-auto`; the content column chain (variant wrapper in RegisterLoanOfficerForms/index.tsx, BasicInfoFormV1 root, BeforeYouBeginV1 root) is `flex flex-1 flex-col`, so the bar sits at the bottom of the column (matches the stepper height on short steps). Site video widget untouched.
- Files: RegisterLoanOfficerForms/index.tsx, BasicInfoFormV1/index.tsx, BasicInfoFormV1/ui/ActionBar.tsx, BasicInfoFormV1/ui/v1.css, BeforeYouBegin/BeforeYouBeginV1.tsx.
- Shots: docs/handoff/tdqcv/v1-shots/round4/ (gate-bar, basic-part1, short-step at 1440 and 375). Basic info part 4 NOT captured (parts are locked until reached; needs a fully valid form walk). At 1440, if the applicant scrolls so the bar sits at the very bottom-right of the viewport it still passes under the video popup (fixed widget); at the end of the page the footer follows, so it can always be scrolled clear.
