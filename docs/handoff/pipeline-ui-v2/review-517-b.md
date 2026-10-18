## Second review (static, TypeScript/React/CSS focus): REQUEST_CHANGES

Scope read: full `origin/master...pull/517/head` diff of `src/`, plus every caller of the shared components touched. CI is green (Tests, pr-check, merge state CLEAN). I did not run jest/tsc locally (no node_modules in a fresh worktree); the findings below are from reading the cascade and call sites, and the worktree has been removed.

### HIGH

**1. `--info` is not defined in the `.tera-list` scope, so both new blue things can render wrong on Pipeline/Hot/Cold/Dormant/Exceptions.**
`--info` is declared only on `.tera-people, .tera-dialog` (`src/shared/components/TeraPeople/teraPeople.css:54`, `teraPeople.recruit.css:87`). `.tera-list` (teraList.css / teraList.recruit.css) declares `--info-soft` and `--info-ink` but not `--info`. A repo-wide grep finds no other declaration. Pipeline is rendered by `TeraListPage` (`<div className="tera-list">`), and Hot/Cold/Dormant wrap in `.tera-list bare`.
- `LeadSourceCell.tsx:80` `color="var(--info)"`: with the variable undefined, the declaration is invalid at computed-value time, so the `fill` falls back to the inherited value and the badge is not the approved blue.
- `teraPeople.recruit.css:418` `.rec-stage[data-stage='S2'], [data-stage='S3'] { --stc: var(--info) }`: `--stc` becomes guaranteed-invalid, so `.rec-stage-seg > i[data-filled] { background: var(--stc) }` computes to transparent. Engaged (S2/S3) rows would show six empty grey segments, indistinguishable from "not started" apart from the label. S1 (`--ink-mute`), S4 (`--warn`), S5 (`--acc`) and the `--ok` default are all defined in `.tera-list`, so only the middle stage breaks.
- Neither test can catch it: the LeadSourceCell test asserts only the string `fill="var(--info)"`, and jsdom has no cascade. The StageProgress tests never check colour.
- Fix: use a token that exists in both scopes (`--info-ink`, or `var(--lf-blue)`), or declare `--info` on `.tera-list`. Please confirm in a real browser on `/pipeline` with a stage-S2 row and a verified-referrer row. If an SDK global stylesheet outside `src` defines `--info`, I could not see it from this repo, and the PR should say so.

### MEDIUM

**2. `<col style={{ minWidth: 132 }} />` is inert** (`PipelineClient/index.tsx`, the colgroup). The table is `table-layout: fixed`, and browsers ignore `min-width` on `<col>`. The actual Source floor is only the table `min-width: 1106px` minus the fixed columns. The test pins the `132` literal and the arithmetic, so it reads as a guarantee that the DOM does not provide. Either drop the `<col>` minWidth and state that the floor comes from the table min-width, or keep it as documentation and say so. The 974 + 132 = 1106 arithmetic itself is correct.

**3. Dead production code left behind.** `useCandidateLabelsBatch` (`apis/recruit/labels.api.ts:46`) now has zero non-test consumers. Four Pipeline test files still mock it (`PipelineAddLead`, `collected`, `sourceFilter`, `claimAndHot`), which are stale mocks of an unused export. Remove the hook (or file a bead if the batch endpoint is still wanted) and the mocks. Also `PipelineClient/index.tsx:150-151` keeps the orphaned comment "One batch request per page of rows — chips need display names…", sitting directly above `labelOptions` and now describing nothing.

### LOW

4. `StageProgress/index.tsx`: `StageSteps` and `StageProgress` each call `useTranslations('Today')`, and `pipelineSteps(true)` is evaluated in both `StageSteps` and `stepsFilled`. Harmless, but `stepsFilled` is exported only for the test, and the test casts `stage as never`. Type the table as `[CandidateStage, number][]` instead.
5. No test proves Pipeline actually renders the steps variant. The `PipelineRow*` tests mount without a `PipelineViewProvider`, so the default is v2-off and the row silently takes the bar fallback. Add one row-level test under `PipelineViewStatic v2:true` asserting `.rec-stage-seg`. Deleting `variant="steps"` from `PipelineRow.tsx` / `PipelineCard.tsx` currently fails nothing.
6. `pipelineColumns.test.ts`: the `\bwidth` regex change is a no-op, because `minWidth` has a capital W and never matched `width`. The `/<col style=\{\{ minWidth: (\d+) \}\} \/>/` regex is Prettier-format-brittle.
7. i18n: key parity en/vi is fine (`stage_step_of`, the 4 status keys). `stage_step_of` is inserted between `stage_v2_S0` and `stage_v2_S1`, breaking the v2 key grouping. The sentence-case status keys are correct; `status_ALL` vi "Tất cả status" is unchanged.
8. 17 binary JPGs plus `docs/mockups/pipeline-v2/index.html` (~1.5 MB) are added to the app repo. This matches the "mockup lives in project repo" rule; just confirming it is intentional.

### Checked and fine
- `StageProgress` callers: Dormant and Duplicates keep the default `bar`; Pipeline row and card use `steps`; the prop is optional, so no breakage. Hooks are called before the early returns.
- `PipelineRow` `labels` prop removal: every test caller updated. `CandidateRowMenu.hideEmailCopy` is still used by `PipelineCard`, so not dead. `LeadWhoCell` props are satisfied (`yours`/`returnedBy` default).
- The contact and rowOpen tests would fail without the change (an owned row with an email now asserts no inline email, the opposite of the old assertion).
- `TaskGroups` test and the `global.css` fallback grid agree on the fixed 240px.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
