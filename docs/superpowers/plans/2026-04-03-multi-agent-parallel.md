# Multi-Agent Parallel Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow multiple dev agents (dev-be, dev-fe) to run simultaneously as independent Claude CLI processes, each visible in the isometric room UI with their own state.

**Architecture:** Each parallel agent gets a unique runtime ID (e.g., `dev-fe-2`, `dev-be-2`), its own Claude process, and its own web session slot. The backend emits `agent_registered`/`agent_unregistered` WS events so the frontend dynamically adds/removes agents from the room. Agent colors and names are derived from the base type.

**Tech Stack:** Python 3.11 / FastAPI / asyncio (backend), TypeScript 5 / React 18 / Zustand / Vite (frontend)

---

## File Map

### Backend (modify)
- `agent-room/backend/app/models/agent.py` — add `PARALLEL_AGENT_BASES`, helper `make_parallel_config()`
- `agent-room/backend/app/services/agent_manager.py` — add `register_agent()`, remove hardcoded init
- `agent-room/backend/app/services/cli_bridge.py` — add `spawn_parallel_agent()`, dynamic `_valid_agents` per session

### Frontend (modify)
- `agent-room/frontend/src/types/index.ts` — `AgentId = string`, add `BaseAgentId`, add `agent_registered`/`agent_unregistered` WS events
- `agent-room/frontend/src/lib/constants.ts` — `AGENT_COLORS/NAMES/ICONS` become functions deriving from base type
- `agent-room/frontend/src/lib/isometric.ts` — dynamic position computation for N agents
- `agent-room/frontend/src/stores/agentStore.ts` — add `registerAgent()`, `unregisterAgent()`, dynamic map
- `agent-room/frontend/src/hooks/useWebSocket.ts` — handle `agent_registered`/`agent_unregistered` events
- `agent-room/frontend/src/components/room/IsometricRoom.tsx` — get agent IDs from store (not hardcoded)

---

## Task 1: Backend — Dynamic agent registry

**Files:**
- Modify: `agent-room/backend/app/models/agent.py`
- Modify: `agent-room/backend/app/services/agent_manager.py`

- [ ] **Step 1: Add `PARALLEL_AGENT_BASES` and `make_parallel_config()` to models/agent.py**

```python
# Agents that can be spawned in parallel (multiple instances)
PARALLEL_AGENT_BASES = {"dev-be", "dev-fe"}

def make_parallel_config(base_id: str, instance: int) -> AgentConfig:
    """Create a config for a parallel agent instance, e.g. dev-fe-2."""
    base = AGENT_CONFIGS[base_id]
    agent_id = f"{base_id}-{instance}"
    return AgentConfig(
        id=agent_id,
        name=f"{base.name} #{instance}",
        model=base.model,
        system_prompt=base.system_prompt,
        auto_approve_tools=base.auto_approve_tools,
        color=base.color,
        desk_position=(0, 0),  # Frontend computes position dynamically
    )
```

- [ ] **Step 2: Add `register_agent()` and `unregister_agent()` to AgentManager**

```python
async def register_agent(self, session_id: str, agent_id: str) -> None:
    """Dynamically register a new parallel agent for this session."""
    if session_id not in self._states:
        self._init_session(session_id)
    self._states[session_id][agent_id] = {'state': 'idle', 'detail': None}
    await self._event_bus.publish(session_id, {
        'type': 'agent_registered',
        'agent': agent_id,
    })

async def unregister_agent(self, session_id: str, agent_id: str) -> None:
    """Remove a parallel agent when its task completes."""
    if session_id in self._states:
        self._states[session_id].pop(agent_id, None)
    await self._event_bus.publish(session_id, {
        'type': 'agent_unregistered',
        'agent': agent_id,
    })
```

- [ ] **Step 3: Start backend, verify no import errors**
```bash
cd agent-room/backend
uvicorn app.main:app --reload
# Expected: starts on port 8000 with no errors
curl http://localhost:8000/api/health
# Expected: {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 4: Commit**
```bash
git add agent-room/backend/app/models/agent.py agent-room/backend/app/services/agent_manager.py
git commit -m "feat: dynamic agent registry with register/unregister support"
```

---

## Task 2: Backend — Parallel Claude process spawning

**Files:**
- Modify: `agent-room/backend/app/services/cli_bridge.py`

- [ ] **Step 1: Add per-session valid agents tracking and `spawn_parallel_agent()`**

In `CLIBridge.__init__`, add:
```python
# Per-session set of valid agent IDs (extends _VALID_AGENTS with parallel instances)
self._session_agents: Dict[str, set] = {}
```

Add method after `start_agent()`:
```python
async def spawn_parallel_agent(
    self, session_id: str, base_agent_id: str, task_description: str
) -> str:
    """Spawn an independent Claude process for a parallel agent instance.

    Returns the unique agent_id assigned (e.g. 'dev-fe-2').
    """
    from app.models.agent import PARALLEL_AGENT_BASES, make_parallel_config, AGENT_CONFIGS

    if base_agent_id not in PARALLEL_AGENT_BASES:
        raise ValueError(f"{base_agent_id} is not a parallelizable agent")

    # Assign instance number (find next free slot)
    if session_id not in self._session_agents:
        self._session_agents[session_id] = set(self._VALID_AGENTS)

    instance = 2
    while f"{base_agent_id}-{instance}" in self._session_agents[session_id]:
        instance += 1

    agent_id = f"{base_agent_id}-{instance}"
    self._session_agents[session_id].add(agent_id)

    # Register agent in manager (emits agent_registered WS event)
    await self._agent_manager.register_agent(session_id, agent_id)

    # Build command for this parallel agent
    base_config = AGENT_CONFIGS[base_agent_id]
    claude_session_id = str(uuid.uuid4())

    cmd = [
        settings.CLAUDE_CLI_PATH,
        "--print",
        "--output-format", "stream-json",
        "--verbose",
        "--permission-mode", "bypassPermissions",
        "--session-id", claude_session_id,
        task_description,
    ]

    logger.info("Spawning parallel agent %s [session=%s]", agent_id, session_id[:8])
    await self._agent_manager.set_state(session_id, agent_id, "working", task_description[:80])

    # Spawn and read in background (non-blocking)
    asyncio.create_task(
        self._run_parallel_agent(session_id, agent_id, cmd)
    )

    return agent_id

async def _run_parallel_agent(self, session_id: str, agent_id: str, cmd: list) -> None:
    """Run a parallel agent process to completion, then unregister it."""
    try:
        handle = await self._pool.spawn(cmd, cwd=settings.ALLY_SPECS_DIR)
        await self._read_stdout_for_agent(session_id, handle, agent_id)
    except Exception:
        logger.exception("Parallel agent %s failed [session=%s]", agent_id, session_id[:8])
        await self._agent_manager.set_state(session_id, agent_id, "error")
    finally:
        # Clean up
        if session_id in self._session_agents:
            self._session_agents[session_id].discard(agent_id)
        await self._agent_manager.unregister_agent(session_id, agent_id)

async def _read_stdout_for_agent(
    self, session_id: str, handle: ProcessHandle, agent_id: str
) -> None:
    """Like _read_stdout but locked to a specific agent_id (no auto-detection)."""
    try:
        async for line in handle.read_stdout():
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            await self._handle_event(session_id, event, agent_id)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Error reading parallel agent %s stdout", agent_id)
    finally:
        try:
            await handle.process.wait()
        except Exception:
            pass
        await self._agent_manager.set_state(session_id, agent_id, "idle")
```

- [ ] **Step 2: Update `_set_all_agents_idle` to use per-session agents**

```python
async def _set_all_agents_idle(self, session_id: str) -> None:
    """Set core agents to idle (not parallel ones — they manage their own state)."""
    for agent_id in self._VALID_AGENTS:  # only core 6, not parallel instances
        await self._agent_manager.set_state(session_id, agent_id, "idle")
```

- [ ] **Step 3: Verify backend still starts cleanly**
```bash
cd agent-room/backend && uvicorn app.main:app --reload
# Expected: no import errors, health check passes
```

- [ ] **Step 4: Commit**
```bash
git add agent-room/backend/app/services/cli_bridge.py
git commit -m "feat: spawn_parallel_agent() for concurrent dev agent processes"
```

---

## Task 3: Backend — REST endpoint to trigger parallel agent

**Files:**
- Modify: `agent-room/backend/app/routers/agents.py` (or nearest router file)

- [ ] **Step 1: Find the agents router**
```bash
ls agent-room/backend/app/routers/
```

- [ ] **Step 2: Add POST endpoint `spawn-parallel`**

```python
@router.post("/{session_id}/agents/spawn-parallel")
async def spawn_parallel_agent(
    session_id: str,
    request: Request,
    body: dict,
):
    """Spawn a parallel agent instance for a task.

    Body: {"base_agent": "dev-fe", "task": "Implement X feature"}
    Returns: {"agent_id": "dev-fe-2"}
    """
    cli_bridge = request.app.state.cli_bridge
    base_agent = body.get("base_agent")
    task = body.get("task", "")

    if not base_agent or not task:
        raise HTTPException(400, "base_agent and task are required")

    agent_id = await cli_bridge.spawn_parallel_agent(session_id, base_agent, task)
    return {"agent_id": agent_id}
```

- [ ] **Step 3: Test endpoint manually**
```bash
curl -X POST http://localhost:8000/api/sessions/<id>/agents/spawn-parallel \
  -H "Content-Type: application/json" \
  -d '{"base_agent": "dev-fe", "task": "Test parallel task"}'
# Expected: {"agent_id": "dev-fe-2"}
```

- [ ] **Step 4: Commit**
```bash
git add agent-room/backend/app/routers/
git commit -m "feat: POST endpoint to spawn parallel agent instances"
```

---

## Task 4: Frontend — Dynamic AgentId type + WS events

**Files:**
- Modify: `agent-room/frontend/src/types/index.ts`

- [ ] **Step 1: Update `AgentId` and add new WS event types**

```typescript
// Keep BaseAgentId for places that need the core 6
export type BaseAgentId = 'ba' | 'dev-lead' | 'dev-be' | 'dev-fe' | 'tester' | 'devops';

// AgentId is now any string (supports dynamic parallel agents like dev-fe-2)
export type AgentId = string;

// Helper: extract base type from a parallel agent ID
// 'dev-fe-2' → 'dev-fe', 'ba' → 'ba'
export function getBaseAgentId(id: AgentId): BaseAgentId {
  const base = id.replace(/-\d+$/, '') as BaseAgentId;
  const BASES: BaseAgentId[] = ['ba', 'dev-lead', 'dev-be', 'dev-fe', 'tester', 'devops'];
  return BASES.includes(base) ? base : 'dev-fe';
}
```

- [ ] **Step 2: Add `agent_registered` and `agent_unregistered` to `WSEvent` union**

```typescript
| {
    type: 'agent_registered';
    agent: AgentId;
  }
| {
    type: 'agent_unregistered';
    agent: AgentId;
  }
```

- [ ] **Step 3: TypeScript check**
```bash
cd agent-room/frontend && npx tsc --noEmit
# Fix any errors from AgentId becoming string (Record<AgentId,...> → Record<string,...>)
```

- [ ] **Step 4: Commit**
```bash
git add agent-room/frontend/src/types/index.ts
git commit -m "feat: AgentId becomes dynamic string, add agent_registered WS events"
```

---

## Task 5: Frontend — Dynamic constants (color/name/icon)

**Files:**
- Modify: `agent-room/frontend/src/lib/constants.ts`

- [ ] **Step 1: Replace Record lookups with getter functions**

```typescript
import type { BaseAgentId } from '../types'
import { getBaseAgentId } from '../types'

const BASE_COLORS: Record<BaseAgentId, string> = {
  'ba': '#3B82F6',
  'dev-lead': '#8B5CF6',
  'dev-be': '#10B981',
  'dev-fe': '#06B6D4',
  'tester': '#F59E0B',
  'devops': '#EF4444',
}

const BASE_NAMES: Record<BaseAgentId, string> = {
  'ba': 'BA',
  'dev-lead': 'Dev Lead',
  'dev-be': 'Dev BE',
  'dev-fe': 'Dev FE',
  'tester': 'Tester',
  'devops': 'DevOps',
}

const BASE_ICONS: Record<BaseAgentId, string> = {
  'ba': 'FileText',
  'dev-lead': 'GitBranch',
  'dev-be': 'Code2',
  'dev-fe': 'Palette',
  'tester': 'TestTube',
  'devops': 'Server',
}

// Use these functions instead of AGENT_COLORS[id] etc.
export function getAgentColor(id: string): string {
  return BASE_COLORS[getBaseAgentId(id)] ?? '#6B7280'
}

export function getAgentName(id: string): string {
  const base = BASE_NAMES[getBaseAgentId(id)] ?? id
  const match = id.match(/-(\d+)$/)
  return match ? `${base} #${match[1]}` : base
}

export function getAgentIcon(id: string): string {
  return BASE_ICONS[getBaseAgentId(id)] ?? 'Bot'
}

// Keep legacy exports for backward compat (components using AGENT_COLORS[id])
export const AGENT_COLORS = BASE_COLORS
export const AGENT_NAMES = BASE_NAMES
export const AGENT_ICONS = BASE_ICONS
```

- [ ] **Step 2: Update all usages of `AGENT_COLORS[agentId]` → `getAgentColor(agentId)`**

Find all usages:
```bash
cd agent-room/frontend && grep -rn "AGENT_COLORS\[" src/
```

Update each one to use `getAgentColor()`.

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add agent-room/frontend/src/lib/constants.ts agent-room/frontend/src/
git commit -m "feat: agent color/name/icon derived dynamically from base type"
```

---

## Task 6: Frontend — Dynamic isometric positions

**Files:**
- Modify: `agent-room/frontend/src/lib/isometric.ts`

- [ ] **Step 1: Make `agentToScreenPos` accept any agent ID (compute on the fly)**

Replace the hardcoded `AGENT_POSITIONS` with a dynamic function:

```typescript
const BASE_AGENT_IDS: BaseAgentId[] = ['ba', 'dev-lead', 'dev-be', 'dev-fe', 'tester', 'devops']
const CENTER_X = 8
const CENTER_Y = 5
const RADIUS = 4

// Compute tile position for any agent ID (including parallel instances)
export function getAgentTilePos(agentId: string): { x: number; y: number } {
  // Core agents: fixed positions on the circle
  const coreIndex = BASE_AGENT_IDS.indexOf(agentId as BaseAgentId)
  if (coreIndex !== -1) {
    const angle = (coreIndex / BASE_AGENT_IDS.length) * 2 * Math.PI - Math.PI / 2
    const deskX = CENTER_X + RADIUS * Math.cos(angle)
    const deskY = CENTER_Y + RADIUS * Math.sin(angle)
    const offsetX = Math.cos(angle) * 0.8
    const offsetY = Math.sin(angle) * 0.8
    return { x: Math.round(deskX + offsetX), y: Math.round(deskY + offsetY) }
  }

  // Parallel agents: scatter on outer ring (radius 6)
  // Use a hash of the agent ID for a stable position
  const hash = agentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const angle = (hash % 360) * (Math.PI / 180)
  return {
    x: Math.round(CENTER_X + 6 * Math.cos(angle)),
    y: Math.round(CENTER_Y + 6 * Math.sin(angle)),
  }
}

// Updated agentToScreenPos uses dynamic lookup
export function agentToScreenPos(agentId: string, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
  const tilePos = getAgentTilePos(agentId)
  const { isoX, isoY } = cartToIso(tilePos.x, tilePos.y)
  const offset = getRoomOffset(canvasWidth, canvasHeight)
  return { x: offset.x + isoX, y: offset.y + isoY }
}
```

- [ ] **Step 2: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add agent-room/frontend/src/lib/isometric.ts
git commit -m "feat: dynamic isometric positions for parallel agent instances"
```

---

## Task 7: Frontend — Dynamic agent store

**Files:**
- Modify: `agent-room/frontend/src/stores/agentStore.ts`

- [ ] **Step 1: Add `registerAgent` and `unregisterAgent` actions**

```typescript
import { create } from 'zustand';
import type { AgentId, AgentState, BaseAgentId } from '../types';

interface AgentEntry {
  state: AgentState;
  detail?: string;
}

interface AgentStoreState {
  agents: Record<AgentId, AgentEntry>;
  setState: (agentId: AgentId, state: AgentState, detail?: string) => void;
  getAgent: (agentId: AgentId) => AgentEntry;
  registerAgent: (agentId: AgentId) => void;
  unregisterAgent: (agentId: AgentId) => void;
  getAgentIds: () => AgentId[];
}

const CORE_AGENT_IDS: BaseAgentId[] = ['ba', 'dev-lead', 'dev-be', 'dev-fe', 'tester', 'devops'];

const initialAgents: Record<AgentId, AgentEntry> = Object.fromEntries(
  CORE_AGENT_IDS.map(id => [id, { state: 'idle' as AgentState }])
);

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  agents: initialAgents,

  setState: (agentId, state, detail) => {
    set(prev => ({
      agents: { ...prev.agents, [agentId]: { state, detail } },
    }));
  },

  getAgent: (agentId) => get().agents[agentId] ?? { state: 'idle' },

  registerAgent: (agentId) => {
    set(prev => ({
      agents: { ...prev.agents, [agentId]: { state: 'idle' } },
    }));
  },

  unregisterAgent: (agentId) => {
    set(prev => {
      const next = { ...prev.agents };
      delete next[agentId];
      return { agents: next };
    });
  },

  getAgentIds: () => Object.keys(get().agents),
}));
```

- [ ] **Step 2: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add agent-room/frontend/src/stores/agentStore.ts
git commit -m "feat: dynamic agent store with register/unregister actions"
```

---

## Task 8: Frontend — Handle WS events + update IsometricRoom

**Files:**
- Modify: `agent-room/frontend/src/hooks/useWebSocket.ts`
- Modify: `agent-room/frontend/src/components/room/IsometricRoom.tsx`

- [ ] **Step 1: Handle `agent_registered`/`agent_unregistered` in useWebSocket**

Find the switch/if block that handles WS events, add:
```typescript
case 'agent_registered': {
  agentStore.getState().registerAgent(event.agent);
  break;
}
case 'agent_unregistered': {
  agentStore.getState().unregisterAgent(event.agent);
  break;
}
```

- [ ] **Step 2: Update IsometricRoom — get agent IDs from store**

Replace line 72 in `IsometricRoom.tsx`:
```typescript
// Before:
const agentIds: AgentId[] = ['ba', 'dev-lead', 'dev-be', 'dev-fe', 'tester', 'devops']

// After:
const agentIds = useAgentStore(s => s.getAgentIds())
```

Also update all `AGENT_COLORS[agentId]` → `getAgentColor(agentId)` and `AGENT_NAMES[agentId]` → `getAgentName(agentId)`.

- [ ] **Step 3: TypeScript check + build**
```bash
cd agent-room/frontend
npx tsc --noEmit    # must exit 0
npm run build       # must exit 0
```

- [ ] **Step 4: Smoke test**
```bash
# Terminal 1
cd agent-room/backend && uvicorn app.main:app --reload

# Terminal 2
cd agent-room/frontend && npm run dev

# Browser: open http://localhost:5173
# Verify: 6 core agents visible in isometric room, no console errors
```

- [ ] **Step 5: Test parallel spawn via API**
```bash
# Get a session ID from the UI, then:
curl -X POST http://localhost:8000/api/sessions/<SESSION_ID>/agents/spawn-parallel \
  -H "Content-Type: application/json" \
  -d '{"base_agent": "dev-fe", "task": "echo Hello from parallel agent"}'

# Expected in browser: a 7th agent character appears in the room
```

- [ ] **Step 6: Commit**
```bash
git add agent-room/frontend/src/hooks/useWebSocket.ts \
        agent-room/frontend/src/components/room/IsometricRoom.tsx
git commit -m "feat: isometric room renders dynamic parallel agents from store"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `backend/models/agent.py` | `PARALLEL_AGENT_BASES` + `make_parallel_config()` |
| `backend/services/agent_manager.py` | `register_agent()`, `unregister_agent()` |
| `backend/services/cli_bridge.py` | `spawn_parallel_agent()`, `_run_parallel_agent()`, `_read_stdout_for_agent()` |
| `backend/routers/agents.py` | `POST /{session_id}/agents/spawn-parallel` |
| `frontend/types/index.ts` | `AgentId = string`, `BaseAgentId`, `getBaseAgentId()`, new WS events |
| `frontend/lib/constants.ts` | `getAgentColor()`, `getAgentName()`, `getAgentIcon()` functions |
| `frontend/lib/isometric.ts` | `getAgentTilePos()` dynamic for N agents |
| `frontend/stores/agentStore.ts` | `registerAgent()`, `unregisterAgent()`, `getAgentIds()` |
| `frontend/hooks/useWebSocket.ts` | Handle `agent_registered`/`agent_unregistered` |
| `frontend/components/room/IsometricRoom.tsx` | Agent IDs from store, not hardcoded |
