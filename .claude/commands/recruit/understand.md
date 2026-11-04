---
name: "Recruit: Refresh Understand Graph"
description: "Refresh the understand-anything knowledge graph for recruit-be and/or recruit-fe against latest master, commit, open the single master PR, self-merge. Self-contained runbook."
category: Workflow
tags: [recruit-be, recruit-fe, understand-anything, knowledge-graph, worktree, refresh]
---

# Recruit — Refresh Understand-Anything Graph

**Argument**: `$ARGUMENTS` — optional.
- `be` | `fe` | `both` — which repo. **Default `both`**, run sequentially, **two separate PRs** (two git repos ⇒ two `.understand-anything/` ⇒ two commits; there is no single combined graph, see *Why two PRs* below).
- `full` | `incremental` — `incremental` is the default when a graph exists; `full` forces a rebuild. First run on a repo with no graph is always full.
- A base branch name overrides the analysis base (default `master`).

Both repos already have a graph:

| Repo | First built | Scope | Result |
|---|---|---|---|
| `recruit-be` | 08/09/2026, PR #274 | 312 files (256 `.java` main + 54 Flyway `.sql` + 2 `.proto`) | 892 nodes / 1996 edges / 13 layers / 15 tour steps |
| `recruit-fe` | 09/09/2026, PR #140 | 179 files (`src/**/*.ts(x)` minus tests, **plus `tsconfig.json`**) | 434 nodes / 1284 edges / 13 layers / 16 tour steps |

## Why two PRs and not one graph

`recruit-be` and `recruit-fe` are separate GitHub repos. The graph lives in `.understand-anything/` **inside** the repo so it is versioned with the code it describes, so "one graph for both" has nowhere to live.

The plugin *does* ship `merge-subdomain-graphs.py`, which folds `frontend-knowledge-graph.json` + `backend-knowledge-graph.json` into one `knowledge-graph.json` — but only within **one** repo. Using it here would mean copying fe's graph into the be repo, where it would go stale independently every time fe changes and nobody would know. **Do not do this.** One command, two runs, two PRs.

## Shared rules — identical for both repos

- **Base off `origin/master`, always.** Both repos deploy staging on merge to `master`, so `master` is the tree that has the latest changes. Local checkouts run far behind (`recruit-be` was 77 commits behind on 08/09).
- **Worktree OUTSIDE the parent repo**, absolute path, e.g. `/Users/apple/Projects/recruit-<be|fe>-understand`.
  - `recruit-be/.git/hooks/pre-commit` **refuses any commit made in the shared main checkout** and tells you to make a worktree. `recruit-fe` has no such hook but its main checkout is usually parked on someone else's branch with ~9 worktrees open — never commit there either.
  - Neither repo needs `node_modules` / `npm install` in the worktree: the analysis runs the plugin's own Node scripts, and neither repo has a pre-commit build gate. **This is the one place the recruit repos are easier than `lf-iq`** — no lockfile copy, no `.env`, and no exposure to the [[reference_worktree_node_modules_symlink]] trap.
- **`UNDERSTAND_NO_WORKTREE_REDIRECT=1` is mandatory.** Without it the skill detects the worktree and redirects output to the main checkout.
- **`autoUpdate` stays `false` in `config.json`.** The plugin's commit hooks resolve `.understand-anything/config.json` relative to the Claude session root (`agentflow`, which has no graph), so they never fire for a nested repo. `true` here is inert and misleading. Refresh manually; `fingerprints.json` is what makes the next run incremental.
- **Write `fingerprints.json` BEFORE `meta.json`.** Reverse that order and auto-update sees a fresh commit hash with no fingerprints, classifies every file STRUCTURAL, and escalates to `FULL_UPDATE` forever.
- **`knowledge-graph.json` pretty-printed 2-space** (`JSON.stringify(g, null, 2) + "\n"`) to keep future diffs readable.
- **Verify `meta.json` `gitCommitHash` === the analyzed HEAD** before committing. Note `lastAnalyzedAt` is **UTC** — it will look ~7h behind local evening time; that is correct, not stale.
- **`master` has `strict=true`** ([[project_recruiting_branch_workflow]]): a PR that lands while your CI runs makes yours `not mergeable`. Then:
  1. `git diff --name-only <analyzed-sha> origin/master` — **check whether anything IN SCOPE changed.**
     - Only out-of-scope files (docs, yaml, tests) ⇒ graph content is unaffected. Rebase, force-push with lease, wait for CI, merge. (Measured on be 08/09: 5 files, all docs.)
     - **In-scope files changed ⇒ the graph is stale and must NOT be committed as-is.** Do the incremental refresh below. (Measured on fe 09/09: 19/172 in-scope files across 4 commits, including 8 new files, 1 deleted, and `middleware.ts` semantics changed — the old graph carried a node for a deleted file and a narrative contradicting current code.)
  2. `git rebase origin/master`, then `git push --force-with-lease`, then **wait for CI again** (~2-4 min).
- **Self-merge is allowed here** ([[feedback_recruiting_repos_self_merge_only]]) — recruit be/fe are the only repos where it is.
- ⚠️ **Merging to `master` deploys staging immediately** (`auto-deploy.yaml` runs `on: push`), even for a commit containing only graph JSON. Say so before merging.
- Commit all five files: `.understandignore`, `config.json`, `knowledge-graph.json`, `fingerprints.json`, `meta.json`. The ignore file **is** the scope definition — committing it is what makes the next refresh reproduce the same scope. (Precedent: `lf-iq` and `lfiq-backend` track all five.)

## Procedure

### 1. Decide full vs incremental
```bash
cd <worktree-or-repo> && git fetch origin --quiet
BASE=$(git show origin/master:.understand-anything/meta.json | sed -n 's/.*"gitCommitHash": "\([a-f0-9]*\)".*/\1/p')
git diff --name-only "$BASE" origin/master   # then filter to the repo's in-scope pattern
```
Changed in-scope fraction **≳ 60%** ⇒ `full`; otherwise incremental. Incremental re-analyzes whole batches containing any changed file, so a thin-but-spread change set still pulls in ~50%.

### 2. Worktree
```bash
git -C /Users/apple/Projects/agentflow/recruit-<be|fe> worktree add \
  /Users/apple/Projects/recruit-<be|fe>-understand -b chore/understand-graph-refresh-<YYYYMMDD> origin/master
```
Absolute target path — `git -C <repo> worktree add .worktrees/x` resolves the relative path against `-C` and nests it inside the repo.

### 3. Run the analysis
Invoke **`understand-anything:understand`** with `PROJECT_ROOT` = the worktree, the chosen mode, and `UNDERSTAND_NO_WORKTREE_REDIRECT=1`. Dispatch file-analyzers **5-concurrent via the Agent tool** (not Workflow, unless the user opts in).

**Write per-analyzer input slices to disk as `bin-<N>.json`** (outside the `batch-*` glob) and point each agent at its own file — the `batchImportData` + `neighborMap` blobs are far too large to inline in nine prompts.

**Output naming is strict:** `batch-<N>.json` or `batch-<N>-part-<k>.json`. The merge regex is `batch-(\d+)(?:-part-(\d+))?\.json`; anything else (`batch-fused-8-13.json`) is **silently dropped** with every node and edge in it. Verify each batchIndex produced a file before merging.

Also: `rm -rf scratchpad` at the worktree root if an analyzer left one, and don't trust a zsh `for i in $(seq …); do ls a b; done` coverage check — a non-matching glob aborts the test and prints false "MISSING" lines. Trust the merge script's own "Found N batch files (M logical batches)" line.

### 4. Repo-specific scope and gotchas

#### recruit-be — Java / Spring Boot
`.understandignore` keeps `src/main/java/**` + `src/main/resources/db/migration/*.sql` + `src/main/proto/**`. Excludes `src/test/` (72 files), `docs/`, `*.md`, `application*.yml`, `deploy/`, `.github/`, `scripts/`, `gradle/`, build files, `.understand-anything/`.

- ⇒ **`tested_by` is 0 graph-wide.** That is a consequence of the scope, not a gap. Delete the `src/test/` block in the ignore file if you want it.
- **Tree-sitter Java emits no `record` / `enum` into `classes`** — see [[reference_understand_java_grammar_records]] for the exact prompt block to paste into every Java file-analyzer dispatch. ~30 files affected. Without it, every permission/state enum vanishes into a bare `file:` node.
- **Layers:** technical layering as the primary axis, with five concerns carved out vertically because they are architecturally distinct here — Flyway schema, app-owned RBAC, webhook ingest, the external follow-up gRPC/REST bridge, bootstrap/wiring.
- Useful measured facts for analyzer prompts: Flyway is the single schema owner (`ddl-auto=validate`, so a mismatch is a hard boot failure); business numbers live in `recruit_settings`, never as Java constants; **there are zero Spring Data repositories in the whole service** — query composition is tera-core `EntityService` + JPA Specifications, which is why `repository/` is absent and the `*Slices` classes are the real query surface.

#### recruit-fe — Next.js 15 / TypeScript
`.understandignore` keeps `src/**/*.ts(x)` **plus `tsconfig.json`**. Excludes `__tests__/` + `*.test.*` + `*.spec.*` (42), `src/messages/**/*.json` (42 i18n catalogues — content, not code; the two `src/messages/<locale>/index.ts` barrels stay), `src/styles/global.css`, `public/`, `helm-chart/`, `.github/`, `*.md`, `Dockerfile`, and every other root config.

- 🔴 **`tsconfig.json` MUST stay in scope. Never add it back to the ignore file.** `extract-import-map.mjs` discovers TypeScript path aliases by looking for `tsconfig.json` **inside its own input list**. This repo imports almost entirely through 13 aliases (`@components/*`, `@apis/*`, `@shared/*`, `@utils/*`, `@constants/*`, `@store/*`, `@hooks/*`, `@providers/*`, `@configs/*`, `@i18n/*`, `@fields/*`, `@styles/*`, `@public/*`), so excluding it collapses the import graph **silently**: measured **75 edges / 45 files-with-imports** without it versus **506 / 126** with it. It costs one `config:` node and buys 85% of the edges. This applies to every alias-heavy TS repo — lf-homepage, lo-homepage, lf-iq, lf-borrower-portal.
- **The TypeScript extractor is hollower than the Java one** — five measured gaps, confirmed across all 9 batches. Paste them into every TS file-analyzer dispatch:
  1. **`type` / `interface`: 0 emitted, always** — there is no `types` field in the output. This is the big one: `src/shared/types/recruit.ts` (434 lines, ~40 exported types, highest fan-in in the graph at 59) comes back structurally empty. Fold substantive types into the owning file node's `summary`/`languageNotes`; leave bare `*Props` interfaces out so the graph does not inflate. The schema has no node type for a TS type alias, so do not treat missing type nodes as a defect to fill.
  2. **`export default <Identifier>`** (trailing `export default Foo` after `const Foo = () => {…}`) is not recorded — `exportCount: 0`. This is the repo's dominant component style, so instruct analyzers to emit those `exports` edges by hand after confirming in source. (`export default function` works.)
  3. **Module-private object-literal maps are invisible** (no `constants`/`variables` field); exported ones appear as bare names with no line range. Several of these maps *are* the domain rule.
  4. **`callGraph` is unreliable** — empty in some batches, noise in others. Derive `calls` from `batchImportData` + `neighborMap`.
  5. **Dynamic `import()` is invisible.** Concretely: `i18n/request.ts` loads the two `src/messages/<locale>/index.ts` barrels via `() => import(...)`, so they look orphaned but are not.
- **Layers:** technical axis, with API/server-state seam, auth/session boundary, composition root + theming, authorization-UX, i18n, and type contracts as their own layers. Keep **auth (identity)** separate from **authorization (permissions)** — they are separate systems here; central SSO is identity-only and permissions are app-owned in `recruit-be`.
- Useful measured facts for analyzer prompts: client permission checks are **UX only** (the backend answers 403 / per-row FAILED regardless, and its `recruit.rbac.enforce` can fail open); the private boundary is a **client-side `mounted` + `accessToken` gate**, not server enforcement; `apiClient` withholds the bearer from any `/public/` URL and does single-flight 401 refresh-retry; **`useApiMutation` throws on `http_code >= 400` but `useApiQuery` does not** — that asymmetry is load-bearing, it is what lets the audit screen render its own 403 from the response body; filter/sort/pagination belongs in the URL, and the backend agrees (its `saved_filters` table stores a literal URL query string in an unschematised `text` column).

### 5. Phase gotchas that bite both repos

- **`architecture-analyzer` can write `layers.json` twice** — the full version, then a coarser "consolidation" that overwrites it. Put *"write `layers.json` ONCE, decide before you write"* in the dispatch prompt **and** run a background md5 watcher so you can prove which happened. Both recruit runs wrote once (13 layers each).
- **Cross-batch `calls` edges get dropped** when the target helper sits below the target analyzer's significance filter (be: 11 edges — `CandidateSlices.notMerged`, `MosoRowMapper.legacyKey`, `FollowUpRemover.closeAllOpen`…). Tell `assemble-reviewer` to **verify each named method against source and recreate the `function` node**, not to downgrade to the `file:` node — those edges are the only structural evidence of cross-context helper reuse. Exception: a Zustand `create()(persist(...))` const is genuinely not a function, so repointing at the `file:` node is correct there.
- **The project-scanner leaks the gate-check advice into `description`** ("Note: this project has over 100 source files; consider scoping…"). Strip it — it ends up in the graph's project description.
- **The scanner also picks up `.understand-anything/` scaffolding** as project files if the ignore file does not exclude it. Both repos' ignore files now do.
- Feed analyzers domain context, but **label anything you inferred from filenames as a guess to verify**. Measured cost of not doing this: on `recruit-be` I asserted `checklist/` was a stage gate from migration filenames V041/V042 and the analyzer had to correct me — those migrations are referenced by no code and the surface is read-only. Four separate claims were corrected across the two runs.

### 6. Incremental refresh, concretely
When in-scope files changed, don't re-run everything:
```bash
# 1. reset the worktree to latest master (keep .understand-anything, it is untracked pre-commit)
git reset --hard origin/master
# 2. re-scan: the file inventory AND the import map both changed
node <SKILL_DIR>/scan-project.mjs      <WT> <D>/rescan-raw.json          # needs TWO args
node <SKILL_DIR>/extract-import-map.mjs <D>/import-map-input.json <D>/import-map-output.json
# input shape: {projectRoot, files:[{path,language,fileCategory}]}
# 3. patch scan-result.json: swap in files + importMap + totals, KEEP name/description/frameworks
# 4. batches for changed files only
node <SKILL_DIR>/compute-batches.mjs <WT> --changed-files=<WT>/.understand-anything/tmp/changed-files.txt
```
Then the carryover fragment, which has two traps:
- **Name it `batch-9999.json`, NOT `batch-existing.json`** — the merge regex only matches `batch-<digits>`, so any other name is silently dropped along with the entire unchanged graph.
- **Prune all files in the re-analyzed batches, not just the changed ones** (whole batches are re-analyzed, so their old nodes would duplicate), plus every deleted file's nodes.
- **Keep a carryover edge when its SOURCE survives, even if the target is being re-analyzed** — the analyzer for a batch only emits edges whose *source* is in that batch, so an edge from an unchanged file into a re-analyzed one is emitted by nobody. Keeping it lets it reconnect once the target node comes back under the same id; merge drops it if it genuinely doesn't. Do drop edges pointing at a **deleted** file. (Measured on fe: 186 nodes / 553 edges carried over, 108 of them pointing into re-analyzed files, 1 dropped for the deleted route.)

**Architecture and tour must always re-run in full**, even incrementally — layer assignments shift when files are added or removed, and the tour narrative can be flatly contradicted by a behaviour change. (Measured on fe: `middleware.ts` went from "does no auth" to reading a session-hint cookie and routing `/` at the edge, and `/home` was deleted — both made the previous tour wrong, not merely incomplete.) Pass the previous layer definitions in for naming consistency.

### 7. Commit, PR, merge
```bash
git add .understand-anything/.understandignore .understand-anything/config.json \
        .understand-anything/knowledge-graph.json .understand-anything/fingerprints.json \
        .understand-anything/meta.json
git commit -m "chore: refresh understand-anything knowledge graph"
git push -u origin chore/understand-graph-refresh-<YYYYMMDD>
gh pr create --repo LoanFactory-Inc/recruit-<be|fe> --base master \
  --head chore/understand-graph-refresh-<YYYYMMDD> \
  --title "chore: refresh understand-anything graph" --body "..."
```
Wait for the required `Tests` check (be ~2m30s, fe longer — its CI runs lint → `tsc --noEmit` → jest → `next build`). Then `gh pr merge <n> --merge`. **No release PR, no `-rel` twin** — those were dropped on 07/09.

Confirm the diff contains **only** `.understand-anything/` before merging, and confirm the staging deploy afterwards:
```bash
gh run list --repo LoanFactory-Inc/recruit-<be|fe> --workflow auto-deploy.yaml --limit 1
```

### 8. Cleanup
```bash
git -C /Users/apple/Projects/agentflow/recruit-<be|fe> worktree remove --force /Users/apple/Projects/recruit-<be|fe>-understand
git -C /Users/apple/Projects/agentflow/recruit-<be|fe> branch -D chore/understand-graph-refresh-<YYYYMMDD>
```
