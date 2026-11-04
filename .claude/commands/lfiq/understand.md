---
name: "LFIQ: Refresh Understand Graph"
description: "Refresh the lf-iq understand-anything knowledge graph against latest master, commit it, and open the single master PR (lf-iq has no release branch). Self-contained runbook."
category: Workflow
tags: [lf-iq, understand-anything, knowledge-graph, worktree, refresh]
---

# LF-IQ — Refresh Understand-Anything Graph

**Argument**: `$ARGUMENTS` — optional. `full` forces a full rebuild; `incremental` (default) refreshes only changed batches; a base branch name (e.g. `production`) overrides the analysis base (default `master`).

Refreshes `.understand-anything/` (knowledge-graph.json, fingerprints.json, meta.json) for **lf-iq** (frontend `vn-ui-homepage`; the paired `lfiq-backend` is a separate repo and out of scope here) so its code map reflects current `master`.

Repo: `github.com/LoanFactory-Inc/lf-iq`. Local: `/Users/apple/Projects/agentflow/lf-iq`. Branch workflow: base `production`; **PR feature→master (auto-merge), then master→production (auto). NO release branch → a SINGLE feature→master PR** (unlike lf-homepage/lo-homepage which also open a release PR).

> **NOTE — autoUpdate is inert here.** lf-iq's `config.json` has `"autoUpdate": true`, but the plugin hooks resolve `.understand-anything/config.json` relative to the Claude session root (`agentflow`, no graph), so they never fire for this nested repo. The graph does NOT self-refresh — run this command manually when you want it current.

## Why branch off `master`, not `production`

The graph must analyze the tree that HAS the latest changes. lf-iq work lands on `master` first (production lags — sometimes far). Branch the refresh off **`origin/master`** so the graph captures everything merged (override only if the user explicitly wants the cheaper, staler production delta).

## Scope is admin + shared ONLY

lf-iq's `.understandignore` deliberately scopes to the **admin area + shared** and EXCLUDES `(private)/`, `(public)/`, `src/app/api/`, `src/messages/`, `src/styles/`, `mockups`, `docs`, tests, `tera-docs`, `openspec`. **Preserve `.understandignore` as-is on rebuild** unless the user wants broader coverage. In-scope ≈ **700 files**; a full rebuild ≈ 28–30 batches → ~1500 nodes / ~3900 edges / 16 layers / 14 tour steps.

## Procedure

### 1. Scope the delta (decide incremental vs full)
```bash
cd /Users/apple/Projects/agentflow/lf-iq && git fetch origin --quiet
BASE=$(git show origin/master:.understand-anything/meta.json | sed -n 's/.*"gitCommitHash": "\([a-f0-9]*\)".*/\1/p')
git diff --name-only "$BASE" origin/master | wc -l
```
If the changed fraction is **≳ 60%** of the ~700 in-scope files → `--full`; otherwise incremental. (Incremental re-analyzes whole batches containing any changed file, so a thin-but-spread change set still pulls in ~45–60% — full is cleaner past that.)

### 2. Worktree off latest master + commit env
Worktrees MUST live under `agentflow/.worktrees/`. Husky pre-commit runs `npm run prepush` (lint-staged) **and `npm run build`**; `--no-verify` is globally blocked.
```bash
git worktree add /Users/apple/Projects/agentflow/.worktrees/lfiq-understand -b chore/understand-graph-refresh-<YYYYMMDD> origin/master
cd /Users/apple/Projects/agentflow/.worktrees/lfiq-understand
ln -sfn /Users/apple/Projects/agentflow/lf-iq/node_modules node_modules
cp /Users/apple/Projects/agentflow/lf-iq/.env .env
cp /Users/apple/Projects/agentflow/lf-iq/next-env.d.ts next-env.d.ts   # REQUIRED — else a bogus tsc image-import error
```
⚠️ lf-iq worktree gotchas: the `next-env.d.ts` copy is mandatory. A symlinked `node_modules` can leak a **stray nested `lf-iq/`** dir during build → `rm -rf lf-iq` before commit if it appears. If the build hits the known pre-existing SSG-manifest `ENOENT`, `HUSKY=0` skips the hook cleanly (that is NOT the blocked `--no-verify` flag) — but prefer a clean build with the env set up above.

### 3. Run the analysis
Invoke the **`understand-anything:understand`** skill with `PROJECT_ROOT` = this worktree, chosen mode, and **`UNDERSTAND_NO_WORKTREE_REDIRECT=1`** (else output redirects to the main checkout). Dispatch file-analyzers 5-concurrent via the **Agent tool** (NOT Workflow, unless the user opts in). Honor these gotchas:

- **Carryover fragment (incremental)**: name it **`batch-9999.json`**, NOT `batch-existing.json` (merge script silently drops other names). Prune: drop existing nodes whose `filePath` ∈ (re-analyzed ∪ git-changed); keep carryover edges only where the SOURCE node survives.
- **Per-analyzer input slices**: `bin-<N>.json` (outside the `batch-*` glob).
- **Dropped edges at merge**: API barrels `private-api.ts`/`public-api.ts` + `format.ts`/date/menu helpers — assemble-reviewer repoints `calls` to the `file:` node and recreates referenced-but-unemitted helper nodes.
- **Scanner limitation**: the importMap under-counts path-alias imports, so a few genuinely-imported type/constant files land as orphan nodes — assemble-reviewer flags them but by contract won't add grep-derived edges. Acceptable.
- **architecture-analyzer writes `layers.json` twice** (17-layer, then a ~10-layer "consolidation"). Run a background md5 watcher and KEEP the fuller (16–17 layer) version for continuity; ignore the consolidated overwrite.
- **fingerprints**: regenerate `fingerprints.json` BEFORE meta.json (else FULL_UPDATE escalation).
- **meta.json**: verify `gitCommitHash === HEAD`. ⚠️ `node -e` with `VAR=$x` AFTER the script string = argv not env → `process.env.VAR` undefined; `export VAR` first.
- **knowledge-graph.json**: write pretty-printed (`JSON.stringify(g, null, 2) + "\n"`) to match the 2-space baseline and keep the diff sane.
- `rm -rf scratchpad` at the worktree root if a file-analyzer dropped one.

### 4. Commit + push + single master PR
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfiq-understand
git add .understand-anything/knowledge-graph.json .understand-anything/fingerprints.json .understand-anything/meta.json
git commit -m "chore: refresh understand-anything knowledge graph"   # husky lint-staged + full build; NEVER --no-verify
git push -u origin chore/understand-graph-refresh-<YYYYMMDD>
```
⚠️ **lf-iq pre-push hook auto-rebases the branch onto `origin/master`, runs build + full Jest, and CANCELS the first push** ("Chạy lại: git push"). Just run `git push` again; after the rebase you'll likely need `git push --force-with-lease` (plain push is rejected). Then:
```bash
gh pr create --repo LoanFactory-Inc/lf-iq --base master --head chore/understand-graph-refresh-<YYYYMMDD> --title "chore: refresh understand-anything graph" --body "..."
```
Merge it (`gh pr merge <n> --merge`); master→production auto-merges. **No release PR** (lf-iq has no release branch). Only the 3 graph JSON files in the diff.

### 5. Cleanup
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfiq-understand && rm -f .env node_modules next-env.d.ts && rm -rf lf-iq scratchpad
git -C /Users/apple/Projects/agentflow/lf-iq worktree remove --force /Users/apple/Projects/agentflow/.worktrees/lfiq-understand
```
