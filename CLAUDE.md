# Ally Specs — Agent Instructions

## Project Overview

This is the **agentflow** repository — an AI agent orchestration system developed by Moso (dev@moso.com). It contains:

- `agent-room/` — Agent Room web app (FastAPI backend + React/Vite frontend monorepo). The primary deliverable: a real-time multi-agent UI that bridges Claude CLI processes.
- `lf-homepage/` — LoanFactory (LF) public marketing website (Next.js 14 + Mantine). Separate git repo, tracked here as an untracked directory.
- `lf-borrower-portal/` — LoanFactory Borrower Portal (Next.js 15 + React 19 + Mantine 7). Separate git repo for the borrower-facing authenticated app.
- `lo-homepage/` — Loan Officer (LO) Homepage (Next.js 14 + Mantine 7). Separate git repo for the LO-facing public site.
- `lf-iq/` — LF-IQ platform (Next.js 14 + Mantine 7 + Jotai). Separate git repo; paired with `lfiq-backend` (Java/Spring Boot).

> Note: CLAUDE.md previously referenced `ally-backend-platform/`, `ally-backend-tenant/`, `ally-frontend-platform/`, `ally-frontend-tenant/` sub-projects. These do **not** exist in this repo. The actual code repos are the `agent-room/` monorepo and the LoanFactory front-end sites listed above.

## Architecture

```
User: "I want feature X"
         ↓
   ┌──────────┐  ask questions   ┌──────────┐  create Beads   ┌──────────┐
   │    BA    │ ───────────────▶ │ DEV Lead │ ──────────────▶ │ DEV x N  │
   │ (specs)  │  create specs    │ (beads)  │  epics + deps   │ (code)   │
   └──────────┘                  └──────────┘                 └──────────┘
                                                                   ↓
                                                              ┌──────────┐
                                                              │ TESTER   │
                                                              │(validate)│
                                                              └──────────┘
                                                                   ↓
                                                              Report to User
```

## Tech Stack

### agent-room/backend/

| Item | Detail |
|------|--------|
| Language | Python 3.11+ |
| Framework | FastAPI 0.100+ with async/await |
| ASGI server | Uvicorn (with standard extras) |
| Config | pydantic-settings 2.0+ |
| WebSockets | websockets 11.0+ (native FastAPI WS) |
| Architecture | In-memory only — no database, no persistence across restarts |
| Key services | AgentManager, SessionManager, CLIBridge, ChatService, BeadsClient, CostTracker, DiffService, TimelineService, PermissionService |
| Claude integration | Spawns `claude` CLI processes via stdin/stdout `--output-format stream-json --input-format stream-json` |
| Beads integration | BeadsClient proxies `bd` CLI commands for task data |
| API | REST endpoints under `/api/` + WebSocket at `/ws` |
| CORS | Allows `http://localhost:5173` (Vite dev server) |
| Entry point | `uvicorn app.main:app --reload` on port 8000 |

### agent-room/frontend/

| Item | Detail |
|------|--------|
| Language | TypeScript 5.5 |
| Framework | React 18.3 |
| Build tool | Vite 5.4 |
| Styling | Tailwind CSS 3.4 |
| State management | Zustand 4.5 (stores: agentStore, chatStore, logStore, sessionStore, uiStore) |
| Charts | Recharts 2.12 |
| Markdown | react-markdown 10 + remark-gfm |
| Diff viewer | react-diff-viewer-continued 3.4 |
| Icons | lucide-react 0.441 |
| UI panels | Room (isometric 3D), Chat, Dashboard (Kanban), Cost tracker, Diff viewer, Timeline |
| Entry point | `npm run dev` on port 5173 |
| TypeScript check | `npx tsc --noEmit` must exit 0 |

### lf-homepage/

| Item | Detail |
|------|--------|
| Language | TypeScript 5 |
| Framework | Next.js 14.2.13 (App Router, standalone output) |
| React | React 18 |
| UI Library | Mantine 7.13 (primary) + Tailwind CSS 3.4.13 (utility) |
| i18n | next-intl 3.20 — 5 locales: en (default), es, vi, zh, he. No locale prefix in URLs. |
| Server state | TanStack React Query 5.56 |
| Client state | Recoil 0.7.7 |
| Forms | react-hook-form 7.53 + joi 17.13 validation |
| Rich text | Tiptap 2.9 (9 extensions) |
| Tables | TanStack React Table 8.20 |
| Charts | Mantine Charts + Recharts |
| Icons | Tabler Icons React 3.17 |
| Modals | @ebay/nice-modal-react 1.2 |
| Maps | @vis.gl/react-google-maps 1.3 |
| Flow diagrams | @xyflow/react 12.4 |
| Payments | @paypal/react-paypal-js 8.7 |
| Date utils | date-fns 4.1 + dayjs 1.11 |
| Node requirement | Node 20.14.0, npm 10.7.0 |
| Pre-commit hook | husky + lint-staged (ESLint fix → Prettier → stylelint) + `npm run build` |
| Deployment | Docker (Dockerfile + Dockerfile.production), Next.js standalone |
| Product | LoanFactory public marketing site (US fintech mortgage) |
| Git repo | Separate repo: `github.com/mosoteam/lf-homepage` — branch FROM `production`, merge INTO `master` |

### lf-borrower-portal/

| Item | Detail |
|------|--------|
| Language | TypeScript 5 (strict mode) |
| Framework | Next.js 15.3.0 (App Router, standalone output) |
| React | React 19 |
| UI Library | Mantine 7.13 (primary) + Tailwind CSS 3.4.13 (utility) |
| i18n | next-intl 4.0 |
| Client state | Jotai 2.12 |
| Forms | react-hook-form 7.53 + joi 17.13 + @hookform/resolvers |
| Rich text | Tiptap 2.9 (9 extensions) |
| Charts | Mantine Charts + Recharts |
| Icons | Tabler Icons React 3.17 |
| Modals | @ebay/nice-modal-react 1.2 |
| Maps | @vis.gl/react-google-maps 1.3 |
| Payments | @paypal/react-paypal-js 8.7 |
| Date utils | date-fns 4.1 + dayjs 1.11 |
| Node requirement | Node 20.14.0 |
| Pre-commit hook | husky + lint-staged (ESLint + Prettier + stylelint) |
| Deployment | Docker (Dockerfile + Dockerfile.prod), Next.js standalone |
| Product | LoanFactory Borrower Portal — authenticated borrower-facing app |
| Git repo | Separate repo: `github.com/mosoteam/lf-borrower-portal` — branch workflow unknown (check repo) |
| Route groups | `(private)/` — authenticated borrower routes; `(public)/` — login/auth |

### lo-homepage/

| Item | Detail |
|------|--------|
| Language | TypeScript 5 (strict: false) |
| Framework | Next.js 14.2.13 (App Router, standalone output) |
| React | React 18 |
| UI Library | Mantine 7.13 (primary) + Tailwind CSS 3.4.13 (utility) |
| i18n | next-intl 3.20 |
| Client state | Recoil 0.7.7 |
| Forms | react-hook-form 7.53 + joi 17.13 |
| Rich text | Tiptap 2.9 (9 extensions) |
| Charts | Mantine Charts + Recharts |
| Icons | Tabler Icons React 3.17 |
| Maps | @vis.gl/react-google-maps 1.3 |
| Date utils | date-fns 4.1 + dayjs 1.11 |
| Node requirement | Node 20.14.0, npm 10.7.0 |
| Pre-commit hook | husky + lint-staged (ESLint + Prettier + stylelint) |
| Deployment | Docker (Dockerfile + Dockerfile.production), Next.js standalone |
| Product | Loan Officer (LO) Homepage — public LO-facing marketing site |
| Git repo | Separate repo: `github.com/LoanFactory-Inc/lo-homepage` — branch workflow unknown (check repo) |
| Route groups | `(private)/` — authenticated LO area; `(public)/` — public pages |

### lf-iq/

| Item | Detail |
|------|--------|
| Language | TypeScript 5 (strict mode) |
| Framework | Next.js 14.2.13 (App Router, standalone output) |
| Package name | `vn-ui-homepage` |
| React | React 18 |
| UI Library | Mantine 7.17 (primary) + Tailwind CSS 3.4.17 (utility) |
| i18n | next-intl 3.20 (English + Vietnamese) |
| Server state | TanStack React Query 5.90 |
| Client state | Jotai 2.12 |
| Forms | react-hook-form 7.53 + joi 17.13 |
| Rich text | Tiptap 2.9 |
| Charts | Recharts 2.15 + Mantine Charts |
| Icons | Tabler Icons React 3.34 |
| Tables | mantine-react-table 2.0-beta |
| Testing | Jest 29 + ts-jest (run: `npm test`) |
| Node requirement | Node 20.14.0, npm 10.7.0 |
| Pre-commit hook | husky + lint-staged (ESLint + Prettier + stylelint) |
| Deployment | Docker (Dockerfile + Dockerfile.production), Next.js standalone |
| Product | LF-IQ platform (admin dashboard + loan officer / realtor / homeowner features) |
| Backend | `lfiq-backend` (Java 21 / Spring Boot) on port 8080; env var: `NEXT_PUBLIC_API_URL` |
| API contract | `ApiBaseResponse<T>` envelope, `PageableResponse<T>` pagination, IDs are UUIDs, JSON fields snake_case |
| Git repo | Separate repo: `github.com/LoanFactory-Inc/lf-iq` — base branch appears to be `master`; `production` also exists |
| Route groups | `(admin)/admin/` — admin-only; `(private)/` — authenticated users; `(public)/` — public pages |

## Quick Start

```
/opsx:feature
```

One command runs the full pipeline:
1. **BA** — asks you questions, creates OpenSpec specs
2. **DEV Lead** — converts specs into Beads (epics + tasks + dependencies)
3. **DEV Agents** — implement tasks one at a time (one branch per task)
4. **TESTER** — validates all work against specs
5. **DEVOPS** — creates PR, pushes Beads state
6. **Report** — shows results for your review

## Subagents

Defined in `.claude/agents/`:

| Agent | File | Role | Model |
|-------|------|------|-------|
| `ba` | `ba.md` | Gather requirements, create specs | Opus |
| `dev-lead` | `dev-lead.md` | Sync specs → Beads, label tasks, dispatch to dev-be/dev-fe | Sonnet |
| `dev-be` | `dev-be.md` | Backend tasks (Python/FastAPI) | Sonnet |
| `dev-fe` | `dev-fe.md` | Frontend tasks (React/Vite) | Sonnet |
| `tester` | `tester.md` | Validate completed work | Sonnet |
| `devops` | `devops.md` | Pull Beads context, create PRs, push Beads state | Sonnet |

You can also invoke agents individually:
- `@ba analyze this feature idea`
- `@dev-lead sync specs and dispatch tasks`
- `@dev-be work on backend tasks`
- `@dev-fe work on frontend tasks`
- `@tester validate the completed branches`

## Commands

| Command | Purpose |
|---------|---------|
| `/opsx:feature` | Full pipeline: BA → DEV Lead → DEV → TESTER |
| `/opsx:explore` | Think through ideas before planning |
| `/opsx:propose` | Create specs only (manual BA) |
| `/opsx:sync` | Create Beads only (manual DEV Lead) |
| `/opsx:status` | View combined progress |
| `/opsx:archive` | Archive completed change |

## How It Works

- **OpenSpec** = planning artifacts (proposal, design, tasks) created by BA
- **Beads** = long memory + coordination layer, persists across agent sessions
- **Subagents** read/write Beads only — task descriptions are self-contained

## Rules

- Beads is the source of truth for task status
- Task descriptions in Beads must be self-contained (DEV agents don't read OpenSpec)
- One branch per task: `agent/<bead-id>-<short-desc>`
- One commit per task: `feat: <title> [<bead-id>]`
- Never work on blocked tasks — `bd ready` ensures this
- If blocked: `bd update <id> --status blocked --reason "why"`
- Always push before closing a task

## Beads Commands

```bash
bd ready                          # Unblocked tasks
bd show <id>                      # Task details
bd update <id> --claim            # Claim a task
bd close <id> --reason "Done"     # Complete a task
bd graph --all                    # Dependency graph
bd list                           # All tasks
```


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
