---
name: "OPSX: PR Fix"
description: "Read PR review comments from GitHub, create fix tasks, and dispatch DEV agents to address reviewer feedback"
category: Workflow
tags: [workflow, orchestrator, pr-review, fix-loop]
---

Read GitHub PR review comments, create fix tasks via BA, and dispatch DEV agents to fix. Push updates to the feature branch so the PR auto-updates.

**Input**: `<repo-name> <PR-number>` — e.g. `tera-fe 42` or `lfiq-backend 185`

**Pipeline**

```
/opsx:pr-fix <repo> <PR#>
     |
  Read PR comments (gh api)
     |
  Parse & categorize
     |
  @ba (Mode 3: create fix tasks from PR comments)
     |
  @tech-lead (sync fix tasks to Beads)
     |
  @dev-be / @dev-fe (implement fixes)
     |
  @tech-lead (code review each fix)
     |
  @qc (verify build/lint/tests per fix)
     |
  Push to feature branch (PR auto-updates)
     |
  Report to User
```

---

## Phase 1: Read PR Comments

Parse `$ARGUMENTS` to extract `<repo>` and `<PR-number>`.

If arguments are missing or ambiguous, ask the user:
```
Which repo and PR number? Example: /opsx:pr-fix tera-fe 42
```

### 1.1 Fetch PR metadata

```bash
cd <repo>
gh pr view <PR-number> --json title,headRefName,baseRefName,state,url,body
```

Verify PR is open. If merged or closed, inform the user and stop.

### 1.2 Fetch review comments

Use `gh api` to get all review comments and review threads:

```bash
# Get PR reviews (approve/request-changes/comment)
gh api repos/{owner}/{repo}/pulls/<PR-number>/reviews --jq '.[] | select(.state != "APPROVED") | {user: .user.login, state: .state, body: .body}'

# Get inline review comments (line-level)
gh api repos/{owner}/{repo}/pulls/<PR-number>/comments --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body, created_at: .created_at}'

# Get issue-level comments (general discussion)
gh api repos/{owner}/{repo}/issues/<PR-number>/comments --jq '.[] | {user: .user.login, body: .body, created_at: .created_at}'
```

Determine `{owner}/{repo}` from the git remote:
```bash
cd <repo>
gh repo view --json nameWithOwner --jq '.nameWithOwner'
```

### 1.3 Parse and categorize

Categorize each comment into:

| Category | Signal | Action |
|----------|--------|--------|
| **REQUIRED** | "must", "fix", "change", "wrong", "bug", "broken", "incorrect", REQUEST_CHANGES review | Create fix task |
| **SUGGESTION** | "consider", "maybe", "could", "nit", "optional", "suggestion", COMMENT review | Create fix task (lower priority) |
| **QUESTION** | "why", "what", "how", "?", no code change implied | Skip (informational) |
| **RESOLVED** | Thread marked resolved, or reviewer approved after comment | Skip |

Build a structured feedback report:

```
## PR Review Feedback: <repo> #<PR-number>

PR: <title>
Branch: <head> -> <base>
URL: <pr-url>
Reviewers: <list>

### Required Changes
1. [<reviewer>] <file>:<line> — <comment summary>
2. [<reviewer>] <file>:<line> — <comment summary>

### Suggestions
1. [<reviewer>] <file>:<line> — <comment summary>

### Questions (informational only)
1. [<reviewer>] <comment summary>
```

If there are ZERO required changes and ZERO suggestions, report:
```
No actionable review comments found on PR #<number>. Nothing to fix.
```
And stop.

---

## Phase 2: BA Creates Fix Tasks (foreground)

Delegate to the `ba` subagent in **Mode 3 (Handle PR Review Feedback)**:

```
Mode: PR Review Feedback
Change: <change-name from openspec, or infer from PR title>
Repo: <repo>
Branch: <head-branch>

<paste the structured feedback report from Phase 1>
```

BA will:
- Parse the feedback report
- Create fix tasks in `tasks.md` under a new section "Fixes from PR Review"
- Each task includes: file path, line number, what to change, reviewer's comment
- NO user confirmation needed — create directly from PR comments

Wait for BA to complete. Verify new tasks exist in `tasks.md`.

---

## Phase 3: Tech Lead Syncs Fix Tasks (foreground)

Delegate to the `tech-lead` subagent:

```
Job: Sync only — read the updated tasks.md for <change-name>, create Beads tasks for the new "Fixes from PR Review" section only. Skip design review (already approved). Label and set dependencies.
```

Wait for completion. Verify:
```bash
bd ready
```

---

## Phase 4: DEV Agents Implement Fixes (parallel)

Check ready tasks:
```bash
bd ready --json
```

Launch DEV agents for each ready fix task:
- Backend tasks -> `@dev-be`
- Frontend tasks -> `@dev-fe`
- Use `isolation: "worktree"` when multiple tasks target the same repo
- Max 5 parallel agents

Each DEV agent works on the **feature branch** (the PR's head branch), creating an `agent/<id>-<desc>` worktree branch and merging back.

After all DEV agents complete, check for newly unblocked tasks:
```bash
bd ready --json
```

Repeat until all fix tasks are closed.

---

## Phase 5: Tech Lead Code Review (foreground)

For each completed fix task, delegate to `tech-lead` for code review (Job 4):

```
Job: Code Review only — review the diff for task <id> on branch agent/<id>-<desc> in <repo>.
```

- If APPROVE: proceed to QC
- If REQUEST CHANGES: DEV agent fixes, re-review (max 2 rounds)

---

## Phase 6: QC Verification (foreground)

For each Tech Lead-approved fix, delegate to `qc`:

```
Verify task <id> on branch agent/<id>-<desc> in <repo>: build, lint, tests, coverage.
```

- If PASS: task is done
- If FAIL: DEV agent fixes, re-verify (max 2 rounds)

---

## Phase 7: Merge and Push

After all fix tasks pass QC:

### 7.1 Merge fix branches into the feature branch

```bash
cd <repo>
git checkout <feature-branch>
git pull origin <feature-branch>

# Merge each fix worktree branch (bidirectional sync)
for each agent/<id>-<desc> branch:
  # Sync agent with feature
  git worktree list | grep agent/
  (cd <worktree-path> && git pull <repo-path> <feature-branch> --no-edit)
  # Merge agent into feature
  git merge agent/<id>-<desc> --no-edit
  # Clean up
  git worktree remove <worktree-path>
  git branch -d agent/<id>-<desc>
done
```

### 7.2 Ask user before pushing

```
Ready to push fixes to <feature-branch>. This will update PR #<number> automatically.

Fixed:
- <list of what was fixed>

Push now? (y/n)
```

**Only push after user confirms:**
```bash
git push origin <feature-branch>
```

---

## Phase 8: Final Report

```
## PR Fix Complete: <repo> #<PR-number>

### PR
- Title: <title>
- URL: <url>
- Branch: <head> -> <base>

### Review Comments Addressed
| # | Reviewer | File | Comment | Status |
|---|----------|------|---------|--------|
| 1 | @<user> | <file>:<line> | <summary> | Fixed |
| 2 | @<user> | <file>:<line> | <summary> | Fixed |

### Suggestions Applied
| # | Reviewer | File | Comment | Status |
|---|----------|------|---------|--------|
| 1 | @<user> | <file>:<line> | <summary> | Applied |

### Build & Test Results
| Repo | Build | Lint | Tests |
|------|-------|------|-------|
| <repo> | PASS | PASS | PASS (N/N) |

### Next Steps
- PR has been updated with fixes
- Request re-review from reviewers
- /opsx:archive <change-name> when PR is merged
```

---

## Guardrails

- NEVER push without user confirmation
- Fix tasks do NOT need user confirmation — create directly from PR comments
- Max 5 parallel DEV agents
- Max 2 re-review rounds per task before escalating to user
- If PR is merged or closed, stop immediately
- If no actionable comments found, stop and report
- Questions/informational comments are logged but not acted on
- Respect the existing feature branch — do NOT create a new branch
