# tdqcv v2 bold: status (07/10)

Worktree: /Users/apple/Projects/agentflow/_worktrees/rlo-v2-bold (branch feat/register-lo-v2-bold, UNCOMMITTED).
Dev server: http://localhost:3101/register-loan-officer-v2 (200, real text). PID 47768 (npm wrapper 47749). ram-gate token 1791374083-47727-11064 (next-dev, still held).

Done: route, hero, journey track (real stored status, captions, 5 clickable Your-part cards with same guards as rail, Our-part not), rail with real statuses, fee-locked, sign, NMLS, website gate, payment success, thank-you; overflow-wrap fix on the sponsor card; 5 locales.
Verification: tsc 0; eslint/prettier clean on changed ts/tsx; stylelint clean; jest 8 suites / 66 tests pass.
Shots: docs/handoff/tdqcv/v2-shots/ (hero 375/1440, full page, fee-locked via mocked API record, v1 on 3101).

Shared-file edits (additive): RegisterLoanOfficerView.tsx (hide old note for v2), RegisterLoanOfficerForms/index.tsx (v2 branches + journey facts state), BeforeYouBegin/index.tsx (isV2), PayingOneTime/index.tsx (isV2), LaterStepWebsiteGate.tsx (rlo-gate class), BasicInfoFormV1/ui/V1Frame.tsx (RailState + 'pending'), registerLoanOfficerParts.ts (v2 variant), map-urls.ts, routes.ts, apis/moso-types.ts (optional lo_agreement_signed/paid_and_signed, same as v1), messages x5.
Copied from v1 worktree identically: src/shared/utils/registerLoanOfficerJourney.ts and its test.

Not done / notes: v1 on 3101 shows the committed base look (no round-2 hero; that is uncommitted in the v1 worktree), so it cannot be pixel-compared to 3100; v1 code paths were not changed except the additive flags above. Sign/NMLS/payment-success/thank-you screens were not screenshotted (need real records). Hero 375 track/part1 only checked at the top of the page.

## Round 2 (Bao review, 07/10)
1-3 Action bar: no longer sticky; last element of the step content, pushed to the column bottom (flex column + margin-top:auto, grid stretches the column to the rail height), hint removed via CSS (.rlo-actions-hint class added to ActionBar). Mobile: long Next label wraps inside the button.
4 Yes/No and option chips: PillChoiceField wrapper has class rlo-pillfield; v2 CSS puts the label on its own line, 10px above the control.
5 Check your answers: v1 AnswerSummary.tsx + test copied identically from the v1 worktree; v2 CSS makes it one full-width column.
6 Locked fee: only fee_deferred_until_approved is shown (locked_title/locked_text keys are now unused, left in the locale files).
7 NMLS how-to: each list item text wrapped in one span.
Shared-file edits added in round 2: BasicInfoFormV1/ui/PillChoices.tsx (class), ui/ActionBar.tsx (class), parts/AnswerSummary.tsx (copied from v1, plus one extra class rlo-summary-list on the list wrapper).
Checks: tsc 0, eslint/prettier/stylelint clean, jest 8 suites / 70 tests (run with -i via ram-gate 1500MB; the 3000MB jest slot was denied by the gate).
Shots: docs/handoff/tdqcv/v2-shots/round2/ (locked, sign, nmls, basic-part1..4 at 1440 and 375, -bar = viewport at the bar with the video popup open, -full = full page).

Round 2b: removed the duplicate help boxes in the content column (fee 'Haven't heard from us', sign 'Need help' support@, NMLS 'Questions? licensing@'); gate and payment success had none. Only the rail box remains; V2Help is also rendered below the content on <=980px (rlo2-help-mobile).

Round 2c (correction): Sign (support@) and NMLS (licensing@) help boxes RESTORED; they are different teams from the rail's recruiting box. Only the fee-screen 'Haven't heard from us' box stays removed. Rail help is also shown below the content on <=980px.

Round 3: .rlo2-wrap max-width 1400px / padding 24px (hero and workspace share it); rail 320px; status badge moved under the label (.rlo2-txt) so step labels are one line at 1440 and 1920; no horizontal scroll at 375.

Round 4: video popup stacking. Cause: YoutubeWidget panel was fixed with z-index auto, so any positioned content later in the DOM (Mantine buttons are position:relative, plus the bar's backdrop-filter) painted above it. Fix: z-50 on the panel in src/shared/components/YoutubeWidget/index.tsx (same value as its toggle, the chat and cookie widgets); v2 bar drops z-index and backdrop-filter.
