# Rules for dev agents dispatched by the recruit E2E Q&A session (06/10)

- Repos: /Users/apple/Projects/agentflow/recruit-be (Java/Spring Boot, squash-only, master strict) and /Users/apple/Projects/agentflow/recruit-fe (Next.js + TERA/Mantine).
- Start: `git fetch origin`; read the beads (`bd show agentflow-<id>`) and their comments; search prior PRs/branches for the same work (`gh pr list -R LoanFactory-Inc/<repo> --state all --search <keyword>`) before coding.
- Read decisions in recruit-be docs/DECISIONS.md. Add a new D-number entry when you change behaviour.
- Worktrees: create your own under `<repo>/_wt/<bead>` from origin/master. Never symlink node_modules; copy it or run a fresh `npm ci`. Never touch another agent's worktree.
- Machine: before gradle / jest / tsc on the whole repo / any browser, run `tok=$(~/.claude/bin/ram-gate acquire <gradle|gradle-it|jest|chrome> <label> --wait 1800)`. A non-zero exit means DENIED: wait, never run anyway. Release the token when done. Never run 2 gradle builds in the same directory.
- FULL FLOW (no speed mode):
  1. TDD: write the test first and see it fail.
  2. Run targeted unit tests and the relevant ITs (Testcontainers) for BE. For FE run targeted jest (`--runTestsByPath`), `npx tsc --noEmit`, eslint on changed files and the i18n guards (localeParity, translationKeysResolve). Strings go in en + vi.
  3. One negative control per guard/branch you add: break it, see the matching test go red, restore it, and check the diff is clean.
  4. Check jest output for "Cannot log after tests are done": CI fails on it. Mock any new hook/API call in the existing suites that render it.
  5. Flyway: pick the next free V number after `git fetch` and also check open PRs for numbers in use. Update the schema doc if SchemaDocFreshnessTest requires it.
- Commits:
  - Message `<type>: <summary> (agentflow-<id>)`, ending with: Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  - Push the branch `agent/agentflow-<id>-<short>`.
  - Open a PR to master with a test plan. End the PR body with: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
- Do NOT merge, do NOT promote, do NOT touch production. Reply with the PR URL(s), head SHA, test evidence and the negative-control results.
- Never print /Users/apple/Projects/agentflow/.worktrees/_designs/staging-test-accounts.local.md. If you need a staging login, read one row/column with awk inside the script only.
