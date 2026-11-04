---
name: "LFH: Refresh Understand Graph"
description: "Refresh the lf-homepage understand-anything knowledge graph against latest master, commit it, and open the master + release PRs. Self-contained runbook."
category: Workflow
tags: [lf-homepage, understand-anything, knowledge-graph, worktree, refresh]
---

# LF Homepage — Refresh Understand-Anything Graph

**Argument**: `$ARGUMENTS` — optional. `full` forces a full rebuild; `incremental` (default) refreshes only changed batches; a base branch name (e.g. `production`) overrides the analysis base (default `master`).

Refreshes `.understand-anything/` (knowledge-graph.json, fingerprints.json, meta.json) for **lf-homepage** so its code map reflects current `master`.

Repo: `github.com/LoanFactory-Inc/lf-homepage` (moved from `mosoteam`; redirect still works). Local: `/Users/apple/Projects/agentflow/lf-homepage`. Branch workflow: base `production`, feature→master + feature→release (both auto-merge), release→production PR left OPEN (user promotes manually).

> **NOTE — autoUpdate is inert here.** lf-homepage's `config.json` has `"autoUpdate": true`, but the plugin hooks resolve `.understand-anything/config.json` relative to the Claude session root (`agentflow`, which has no graph), so they never fire for this nested repo. The graph does NOT self-refresh — that's why this command exists. Run it manually whenever you want the graph current.

## Why branch off `master`, not `production`

The graph must analyze the code that HAS the latest changes. Work lands on `master` first; `production` lags behind. Branching off `production` would analyze a stale tree and miss recent features (and lf-homepage branch-from-production conflicts hard — see the education-compliance divergence). **Always branch the refresh off `origin/master`** (override only if the user explicitly asks).

## Procedure

### 1. Scope the delta (decide incremental vs full)
```bash
cd /Users/apple/Projects/agentflow/lf-homepage && git fetch origin --quiet
BASE=$(git show origin/master:.understand-anything/meta.json | sed -n 's/.*"gitCommitHash": "\([a-f0-9]*\)".*/\1/p')
git diff --name-only "$BASE" origin/master -- 'src/**/*.ts' 'src/**/*.tsx' | wc -l   # in-scope changed files
```
lf-homepage's `.understandignore` is nearly empty → **broad scope = whole `src/` (~1214 files)**. If the changed fraction is **≳ 60%** of that → `--full` (incremental re-analyzes whole batches containing any changed file, so it pulls in nearly everything anyway); otherwise incremental. Last full rebuild = 45 batches → ~2224 nodes / ~5484 edges / 12 layers / 14 tour steps.

### 2. Worktree off latest master + commit env
Worktrees MUST live under `agentflow/.worktrees/` (nested inside the repo breaks eslint). Husky pre-commit runs a full `npm run build` and `--no-verify` is globally blocked, so the worktree needs a build env.
```bash
git worktree add /Users/apple/Projects/agentflow/.worktrees/lfh-understand -b chore/understand-graph-refresh-<YYYYMMDD> origin/master
cd /Users/apple/Projects/agentflow/.worktrees/lfh-understand
# verify package.json is identical master↔production before symlinking node_modules
ln -sfn /Users/apple/Projects/agentflow/lf-homepage/node_modules node_modules
cp /Users/apple/Projects/agentflow/lf-homepage/.env .env
cp /Users/apple/Projects/agentflow/lf-homepage/next-env.d.ts next-env.d.ts
```
⚠️ Do NOT run `npm run build` while a `next dev` server is serving the same `.next` — it throws missing vendor-chunk errors; stop the dev server first.

### 3. Run the analysis
Invoke the **`understand-anything:understand`** skill with `PROJECT_ROOT` = this worktree, in the chosen mode. **Set `UNDERSTAND_NO_WORKTREE_REDIRECT=1`** (else the skill redirects output back to the main checkout, which is on stale master). Dispatch file-analyzers 5-concurrent via the **Agent tool** (NOT Workflow, unless the user opts in). Honor these hard-won gotchas:

- **Carryover fragment (incremental)**: name it **`batch-9999.json`**, NOT `batch-existing.json` — `merge-batch-graphs.py` only accepts `batch-<N>.json`/`batch-<N>-part-<K>.json` and SILENTLY DROPS other names. Prune: drop existing nodes whose `filePath` ∈ (re-analyzed batch files ∪ git-changed incl. deleted); keep carryover edges only where the SOURCE node survives.
- **Per-analyzer input slices**: name them `bin-<N>.json` (outside the `batch-*` glob) so the merge ignores them cleanly.
- **Dropped edges at merge** are usually API-barrel `calls` (loanfactoryApi/testApi/otherApi/format.ts/fullName.ts) — assemble-reviewer repoints them to the `file:` node.
- **architecture-analyzer may write `layers.json` twice** (fuller, then a disruptive consolidation). Run a background md5 watcher; keep the FULLER version. Preserve the previous 12 layers.
- **fingerprints**: Phase 7 must regenerate `fingerprints.json` (`build-fingerprints.mjs`) BEFORE writing meta.json, else future commits escalate to FULL_UPDATE.
- **meta.json**: after Phase 7, VERIFY `gitCommitHash === git rev-parse HEAD`. ⚠️ A `node -e` with `VAR=$x` placed AFTER the script string is argv, not env → `process.env.VAR` is undefined (silently nulls gitCommitHash) — always `export VAR` on its own line first.
- **knowledge-graph.json**: write it pretty-printed (`JSON.stringify(g, null, 2) + "\n"`) — the committed baseline is 2-space; a compact write makes a 70k-line delete diff.
- A file-analyzer may drop a `scratchpad/` dir at the worktree root → `rm -rf scratchpad` before commit.

### 4. Commit + push + PRs
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfh-understand
git add .understand-anything/knowledge-graph.json .understand-anything/fingerprints.json .understand-anything/meta.json
git commit -m "chore: refresh understand-anything knowledge graph"   # husky full build; NEVER --no-verify (blocked)
git push -u origin chore/understand-graph-refresh-<YYYYMMDD>
gh pr create --repo LoanFactory-Inc/lf-homepage --base master  --head chore/understand-graph-refresh-<YYYYMMDD> --title "chore: refresh understand-anything graph" --body "..."
gh pr create --repo LoanFactory-Inc/lf-homepage --base release --head chore/understand-graph-refresh-<YYYYMMDD> --title "chore: refresh understand-anything graph [release]" --body "..."
```
Merge the **master** PR (`gh pr merge <n> --merge`); the **release** PR auto-merges. Do NOT create/merge a release→production PR (user promotes manually). Only the 3 graph JSON files should appear in the diff.

### 5. Cleanup
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lfh-understand && rm -f .env node_modules next-env.d.ts
git -C /Users/apple/Projects/agentflow/lf-homepage worktree remove --force /Users/apple/Projects/agentflow/.worktrees/lfh-understand
```
