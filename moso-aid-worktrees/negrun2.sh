#!/bin/bash
cd /Users/apple/Projects/agentflow/moso-aid-worktrees/packs-member-standing || exit 1
cp src/services/lo-program-membership.js /tmp/mem2.bak
python3 - <<'P'
p='src/services/lo-program-membership.js'; s=open(p).read()
a="const members = mergeSpells("; assert a in s
s=s.replace(a,"const members = ((x) => x)(",1)
a="    open.ended_at = toIso(events[events.length - 1].at)"; assert a in s
s=s.replace(a,"    open.ended_at = null",1)
a="events[0]?.at ?? row.created_at"; assert a in s
s=s.replace(a,"row.updated_at ?? row.created_at",1)
open(p,'w').write(s)
P
tok=$(~/.claude/bin/ram-gate acquire jest moso-aid-neg2 --wait 900) || { cp /tmp/mem2.bak src/services/lo-program-membership.js; echo DENIED; exit 9; }
node --experimental-vm-modules node_modules/jest/bin/jest.js test/services/lo-program-membership.test.js 2>&1 | grep -E "Tests:|✕" | head -12
~/.claude/bin/ram-gate release $tok
cp /tmp/mem2.bak src/services/lo-program-membership.js
echo restored
