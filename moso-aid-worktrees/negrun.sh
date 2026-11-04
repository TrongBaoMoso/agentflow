#!/bin/bash
cd /Users/apple/Projects/agentflow/moso-aid-worktrees/packs-member-standing || exit 1
cp src/routes/index.js /tmp/idx.bak; cp src/services/lo-program-membership.js /tmp/mem.bak
python3 - <<'P'
p='src/routes/index.js'; s=open(p).read(); a="requireServiceKey('PACKS_INBOUND_SERVICE_KEY')"; assert a in s; open(p,'w').write(s.replace(a,"requireServiceKey('RECRUIT_INBOUND_SERVICE_KEY')"))
p='src/services/lo-program-membership.js'; s=open(p).read(); a="new Set(['revoked', 'withdrawn'])"; assert a in s; open(p,'w').write(s.replace(a,"new Set([])"))
P
tok=$(~/.claude/bin/ram-gate acquire jest moso-aid-neg --wait 900) || { cp /tmp/idx.bak src/routes/index.js; cp /tmp/mem.bak src/services/lo-program-membership.js; echo DENIED; exit 9; }
node --experimental-vm-modules node_modules/jest/bin/jest.js test/routes/lo-programs-packs-standing.test.js test/services/lo-program-membership.test.js 2>&1 | grep -E "Tests:|✕" | head -12
~/.claude/bin/ram-gate release $tok
cp /tmp/idx.bak src/routes/index.js; cp /tmp/mem.bak src/services/lo-program-membership.js
echo restored
