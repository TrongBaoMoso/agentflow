---
name: "LO: Refresh Understand Graph"
description: "Refresh the lo-homepage understand-anything knowledge graph against latest master, commit it, and open the master + release PRs. Self-contained runbook."
category: Workflow
tags: [lo-homepage, understand-anything, knowledge-graph, worktree, refresh]
---

# LO Homepage — Refresh Understand-Anything Graph

**Argument**: `$ARGUMENTS` — optional. `full` forces a full rebuild; `incremental` (default) refreshes only changed batches; a base branch name (e.g. `produciton-v2`) overrides the analysis base (default `master`).

Refreshes `.understand-anything/` (knowledge-graph.json, fingerprints.json, meta.json) for **lo-homepage** so its code map reflects current `master`. The graph was first built 2026-07-09 (PRs #637/#638); its `config.json` has NO `autoUpdate`, so it goes stale silently and must be refreshed manually with this command.

Repo: `github.com/LoanFactory-Inc/lo-homepage`. Local: `/Users/apple/Projects/agentflow/lo-homepage`. Branch workflow: base `produciton-v2` (sic), feature→master + feature→release (release PR left OPEN), promotion to produciton-v2 is manual.

## Why branch off `master`, not `produciton-v2`

The graph must analyze the code that HAS the latest changes. New work lands on `master` first (release/produciton-v2 lag behind). Branching off `produciton-v2` would analyze a stale tree and miss recent features. **Always branch the refresh off `origin/master`** (override only if the user explicitly asks).

## Procedure

### 1. Scope the delta (decide incremental vs full)
```bash
cd /Users/apple/Projects/agentflow/lo-homepage && git fetch origin --quiet
BASE=$(git show origin/master:.understand-anything/meta.json | sed -n 's/.*"gitCommitHash": "\([a-f0-9]*\)".*/\1/p')
# count in-scope changed files since the graph baseline
git diff --name-only "$BASE" origin/master -- 'src/**/*.ts' 'src/**/*.tsx' | wc -l
```
- If the changed fraction is **≳ 60% of ~1071 files → `--full`** (incremental re-analyzes whole batches containing any changed file, so it pulls in nearly everything anyway).
- Otherwise **incremental** (the normal case for a routine refresh).

### 2. Worktree off latest master + commit env
Worktrees MUST live under `agentflow/.worktrees/` (nested inside the repo breaks eslint). Fresh worktree needs a build env because husky pre-commit runs a full `npm run build` and `--no-verify` is globally blocked.
```bash
git worktree add /Users/apple/Projects/agentflow/.worktrees/lo-understand -b chore/understand-graph-refresh-<YYYYMMDD> origin/master
cd /Users/apple/Projects/agentflow/.worktrees/lo-understand
# package.json is identical master↔produciton-v2 → symlink is safe (verify with diff if unsure)
ln -sfn /Users/apple/Projects/agentflow/lo-homepage/node_modules node_modules
cp /Users/apple/Projects/agentflow/lo-homepage/.env .env
cp /Users/apple/Projects/agentflow/lo-homepage/next-env.d.ts next-env.d.ts
```

### 3. Run the analysis
Invoke the **`understand-anything:understand`** skill with `PROJECT_ROOT` = this worktree, in the chosen mode. Dispatch file-analyzers 5-concurrent via the **Agent tool** (NOT Workflow, unless the user opts in). `.understandignore` is nearly empty → broad scope (whole `src/`). Follow the skill; honor these hard-won gotchas:

- **Carryover fragment (incremental)**: name it **`batch-9999.json`**, NOT `batch-existing.json` — `merge-batch-graphs.py` only accepts `batch-<N>.json`/`batch-<N>-part-<K>.json` and SILENTLY DROPS other names (you'd lose every untouched node + import edge). Prune: drop existing nodes whose `filePath` ∈ (re-analyzed batch files ∪ git-changed incl. deleted); keep carryover edges only where the SOURCE node survives.
- **Per-analyzer input slices**: name them `bin-<N>.json` (outside the `batch-*` glob) so the merge ignores them cleanly.
- **architecture-analyzer may write `layers.json` twice** (fuller version, then a disruptive ~10-layer "consolidation"). Run a background md5 watcher; if two snapshots appear, keep the FULLER one (more layers) for continuity. Baseline had 14 layers.
- **fingerprints**: Phase 7 must regenerate `fingerprints.json` (`build-fingerprints.mjs`) BEFORE writing meta.json, else every future commit escalates to FULL_UPDATE.
- **meta.json**: after Phase 7, VERIFY `gitCommitHash === git rev-parse HEAD` (a `node -e` env-var-after-script bug silently leaves it stale — Edit by hand if so). Update `analyzedFiles` + `lastAnalyzedAt`.
- A file-analyzer may drop a `scratchpad/` dir at the worktree root → `rm -rf scratchpad` before commit.

### 4. Commit + push + PRs
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lo-understand
git add .understand-anything/          # ONLY the 3 graph files (+ config/meta)
git commit -m "chore: refresh understand-anything knowledge graph"   # husky runs full build; do NOT use --no-verify (blocked)
git push -u origin chore/understand-graph-refresh-<YYYYMMDD>
gh pr create --repo LoanFactory-Inc/lo-homepage --base master  --head chore/understand-graph-refresh-<YYYYMMDD> --title "chore: refresh understand-anything graph" --body "..."
gh pr create --repo LoanFactory-Inc/lo-homepage --base release --head chore/understand-graph-refresh-<YYYYMMDD> --title "chore: refresh understand-anything graph [release]" --body "..."
```
Merge the **master** PR (`gh pr merge <n> --merge`); leave the **release** PR OPEN (it will look "dirty" with unrelated master-ahead commits — that is expected; promotion to release/produciton-v2 is manual). Do NOT touch `produciton-v2`.

### 5. Cleanup
```bash
cd /Users/apple/Projects/agentflow/.worktrees/lo-understand && rm -f .env node_modules next-env.d.ts   # don't leave secrets/symlink
git -C /Users/apple/Projects/agentflow/lo-homepage worktree remove --force /Users/apple/Projects/agentflow/.worktrees/lo-understand
```

## Optional: stop the staleness
To make the graph auto-refresh on every commit/merge instead of needing this command, set `.understand-anything/config.json` to include `"autoUpdate": true` (plugin PostToolUse hook fires on `git commit|merge|rebase|cherry-pick` in a repo whose config has it). Trade-off: every commit then force-triggers an incremental update with no confirmation. Ask the user before enabling.
