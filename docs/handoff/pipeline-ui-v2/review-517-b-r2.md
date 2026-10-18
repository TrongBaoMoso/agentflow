## Second review, round 2 (delta 2910093e..ec12ea39): APPROVE-quality, no blocking findings

I verified each finding against the new code (static read of the delta; I did not run jest or tsc, CI is the signal for those).

| Round-1 finding | Status |
|---|---|
| HIGH 1: `--info` undefined in `.tera-list` | **Fixed.** `teraList.recruit.css` now declares `.tera-list { --info: #2563eb }` and a dark override `var(--lf-blue)`. That matches what `.tera-people` resolves to (`teraPeople.css:54`; the recruit file only overrides it in dark), so the verified badge and the S2/S3 segments resolve on Pipeline, Hot, Cold and Dormant. |
| MEDIUM 2: inert `<col minWidth>` | **Fixed.** The `<col>` is plain and the pinned minWidth assertion is gone. The new test asserts `MIN_WIDTH <= WRAPPER_1440` and that Source gets at least 132px. Arithmetic checked: 44+220+120+108+92+156+120+116 = 976, 1108 - 976 = 132, so it holds exactly. |
| MEDIUM 3: dead code | **Fixed.** `useCandidateLabelsBatch`, its 4 mocks and the orphaned comment are gone. `grep` finds no remaining reference except two backend route-coverage lists, which are about the endpoint, not the hook. The `showProducer` and `contact` props are removed from `LeadCandidateCell` with no remaining callers. `ProducerBadge` is still used by `BoardCard`, so it is not orphaned. |
| LOW 5: steps variant unproven | **Fixed.** `PipelineRow.stageSteps.test.tsx` and the `PipelineCards` test mount under `PipelineViewStatic v2:true` and assert 6 segments, filled count 3 and 2, and no progressbar. Both would fail if `variant="steps"` were dropped. |
| LOW 7: key placement | **Fixed.** |
| LOW 8: JPGs | **Fixed** (5 big ones dropped, README added). |

Delta review, new changes:
- StageProgress a11y rewrite is better: segments are `aria-hidden`, the name is read once, and an `sr-only` span adds only "step n of 6" (S0 has none). The `sr-only` utility class exists and is already used elsewhere. The tests assert exactly this.
- `.rec-stage[data-stage] { min-width: 0 }` plus a pinned test is fine; specificity beats the base `.rec-stage` rule.

Remaining, all LOW, none blocking:
1. Today "Loan officer" column went from 240px to 220px (`TaskGroups.tsx`, `global.css`). The PR1 scope said ~240px. If 220 is deliberate (to match Candidate), say so in the PR description. The test and fallback are consistent either way.
2. Last touch column narrowed 98 to 92px and Stage widened 112 to 120px. The "12 days ago" fit is asserted only in a comment, and jsdom cannot prove it. A one-line screenshot of vi at 1440 in the PR would settle it.
3. The Exceptions page imports only `PageHead` from `TeraList`. I could not confirm from the grep that its rows sit under a `.tera-list` ancestor, so the new `--info` default may not reach the verified badge there. It is no worse than before this PR (the badge was a stroke icon on `currentColor`), but it is worth a glance in the browser.
4. Still open from before: the `pipelineColumns` regex `\bwidth` change is a no-op, and `stage as never` in the StageProgress test.

Verdict: no CRITICAL or HIGH issues remain. Posting as a comment (not `--approve`), with the caveat that items 2 and 3 are visual checks I could not do statically.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
