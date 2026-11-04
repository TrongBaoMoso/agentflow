# Shared rules for every worker (read fully before starting)
Workspace: /Users/apple/Projects/agentflow. Memory notes (read the ones relevant to your repo): /Users/apple/.claude/projects/-Users-apple-Projects-agentflow/memory/ (index MEMORY.md). Repo docs: recruit-be/docs/DECISIONS.md, GOTCHAS.md; tera-docs/infrastructure/DELIVERY_FLOW.md.
Epic bead: agentflow-zq861 (bd show agentflow-zq861.N). Update your bead with notes; never close it, the orchestrator closes.

Git:
- `git -C <repo> fetch origin` first. Create a NEW worktree from origin/<base>: `git -C /Users/apple/Projects/agentflow/<repo> worktree add /Users/apple/Projects/agentflow/.worktrees/<repo>-<slug> -b feature/<slug> origin/<base>`. Never work in the shared checkout. Never `cd` relative then `git add -A`; always `git -C <abs path> add <explicit files>`.
- Commit messages via heredoc (`git commit -F - <<'EOF'`), NO backticks inside double-quoted shell strings (they execute). Format `feat: <title> [agentflow-zq861.N]` and end with:
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HgVm9e37pmGDBeKvcdMEm3
- PR body ends with: 🤖 Generated with [Claude Code](https://claude.com/claude-code)  then a blank line and https://claude.ai/code/session_01HgVm9e37pmGDBeKvcdMEm3
- Push your branch and open the PR (`gh pr create`). DO NOT MERGE and DO NOT promote to staging. The orchestrator reviews and merges.
- Code, comments, PR text in ENGLISH.

Quality:
- TDD where practical. Run the repo's real checks before pushing: recruit-be `./gradlew build` AND relevant `integrationTest` (never two gradle runs in the same dir); recruit-fe `npm run lint && npx tsc --noEmit && npx jest <related>`; other repos per their README/CI.
- After each fix, do a negative control: break the line you just fixed, confirm a test goes red, restore.
- Never rewrite an existing test just to make new code pass unless the behaviour change is the requested one; say so explicitly in the PR.
- Feature flags/settings for operational numbers (recruit_settings), never hardcode.
- Flyway (recruit-be): current max on master V178, V179 is taken by open PR #510. Use ONLY the version numbers assigned to you.
- Don't print secrets / k8s secrets / env values / the staging-test-accounts file.

Report back (final message, under 400 words): PR URLs, what changed, test evidence (commands + pass counts), negative controls done, open questions, and any API contract you exposed (exact JSON field names).

## recruit-fe design rules (from redesign session agentflow-b7, 01/10)
- Base on origin/master (>= f7fc748). Read recruit-fe CLAUDE.md section "Design system (TERA...)" first. Specs: /Users/apple/Projects/agentflow/.worktrees/_designs/tera-hr-ui-spec.md and recruit-ui-inventory.md.
- Pages start with PageHead from @components/TeraList. Lists: TeraListPage/PhaseTabs/ListToolbar/ListSurface/ListPager + @components/MoreFiltersPopover (Pipeline is the reference). Stat cards @components/StatCard; chips @components/StatusChip; stage @components/StageProgress. Primary CTA = teraBtn helpers; otherwise Mantine with SEMANTIC colours only (primary/success/warning/danger/info/gray). Never raw red/orange/green/blue/teal/violet.
- Tokens from @loanfactory-inc/platform-react theme.css (--lf-*) + src/configs/theme/teraThemeAdditions.ts. Do not edit TeraPeople/people.css; additions go in teraPeople.recruit.css.
- Keep recruit's own NotificationBell (platform inbox is blocked).
- Install deps: printf '//us-central1-npm.pkg.dev/lenderrate-master/tera-platform-npm/:_authToken=%s\n' "$(gcloud auth print-access-token)" > /tmp/ar.npmrc && npm ci --userconfig /tmp/ar.npmrc  (never symlink node_modules between worktrees).
- `npm run lint` must exit 0 (CI skips lint; check $? yourself). Copy text: plain, no slogans. i18n: en + vi message files.
- Production is BLOCKED; never touch production branches.

## Bao's standing rules (01/10, apply to everyone)
1. Before declaring anything BLOCKED on someone granting a key/account/permission: double-check yourself. Staging is nearly full-permission; you can usually create the key/account yourself on staging.
2. Recruit app PRs (recruit-be, recruit-fe): the orchestrator may merge.
3. Other repos' PRs may be merged only if: no impact on other ecosystem apps in use, not a fix-here-break-there, and a "Repo Owner" reviewer agent for THAT repo checked it deeply against the repo's own conventions.
4. No agent/session trusts another. Always verify yourself: pull latest, read the code, research. Slow and sure beats fast. Every solution needs at least 2 reviewer agents to debate and agree before implementing/merging.
5. Measurements: measure staging (viet18.com) AND production (loanfactory.com) — staging data is often fake. Production measurements are READ-ONLY.

## Memory: one heavy build at a time (01/10, machine is 24 GB and swapping)
Any gradle / maven / full jest / next build / tsc on a big repo must hold the shared lock:
  L=/tmp/agentflow-heavy.lock
  until mkdir "$L" 2>/dev/null; do sleep 30; done; trap 'rmdir "$L"' EXIT; <your build command>; rmdir "$L"; trap - EXIT
Run it in ONE shell command so the lock is always released. Prefer targeted tests (-Dtest= / --tests / jest <path>) over full suites. Maven: MAVEN_OPTS=-Xmx1536m. Jest: --maxWorkers=2. Stop gradle daemons you started when done (./gradlew --stop).

## Lock v2 (13:40): self-healing when a holder gets killed
Use this instead of the v1 loop (a killed holder left a stale lock for 20+ min):
  L=/tmp/agentflow-heavy.lock
  until mkdir "$L" 2>/dev/null; do p=$(cat "$L/pid" 2>/dev/null); if [ -n "$p" ] && ! kill -0 "$p" 2>/dev/null; then rm -rf "$L"; fi; sleep 20; done; echo $$ > "$L/pid"; trap 'rm -rf "$L"' EXIT; <build>; rm -rf "$L"; trap - EXIT

## Rule #6 (Bao 01/10 night) — RAM gate REPLACES the heavy-build lock
The machine has 24 GB and has crashed from RAM exhaustion. Before ANY heavy job (Chrome/Playwright, next dev, gradle, gradle integrationTest, full jest, next build, maven) you MUST take a slot:
  T=$(~/.claude/bin/ram-gate acquire <chrome|next-dev|gradle|gradle-it|jest|MB> <label> --wait 900) || { echo DENIED; exit 1; }
  ... run the job ...
  ~/.claude/bin/ram-gate release "$T"
Do it in ONE shell command with a trap so release always runs: trap '~/.claude/bin/ram-gate release "$T"' EXIT. If DENIED, wait and retry later; never start the job anyway. Before running things in parallel, ask `ram-gate slots <kind>` and use min(wanted, slots); ask again before each batch. Prefer ONE Chrome with several contexts. Stop dev servers as soon as you are done measuring. Only kill your own processes. Maven/packs: use the MB form (e.g. 2500). Gradle: ./gradlew --no-daemon. The old /tmp/agentflow-heavy.lock is retired.
Pass this rule to every sub-agent you give a browser/build/test job.

## Docker (02/10)
Docker Desktop was started by the orchestrator (agentflow-93) on Bao's go, holding ram-gate token in scratchpad docker.tok (2500 MB). Testcontainers ITs can run locally again. Still take a gradle-it slot per run. Do NOT stop Docker yourself; tell the orchestrator when you no longer need it.

## Rule #7 (Bao 03/10): no CI/notification spam on org repos
The TrongBaoMoso account was once removed from the LoanFactory-Inc org for spam. Every agent:
- runs negative controls LOCALLY (jest/gradle via ram-gate) when a slot is granted;
- if CI must be used: at most ONE draft PR per round (combine independent controls, or push sequentially and wait), correct conventional PR title from the start, close + delete the branch immediately after;
- never pushes / opens PRs in rapid succession: batch changes, squash, then push.

## SPEED MODE (Bao 05/10 night, TEMPORARY — 5 days past deadline)
Until Bao says "quay lại flow cũ" / "full flow": locally run only targeted unit tests for what changed (ITs on CI only, still a merge gate); ONE negative control per main fix; still 2 reviewers per PR (+ Repo Owner for non-recruit repos); defer side features (write them down as deferred, never drop); every PR body lists what was skipped. Unchanged: ram-gate, staging only, push before claiming a fix, org push discipline, flags OFF until verified. See memory feedback_speed_mode_vs_full_flow.md / `bd memories speed-mode`.
