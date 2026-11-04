#!/bin/bash
# usage: runtest2.sh <worktree> <TestList>
cd /Users/apple/Projects/agentflow/packs-worktrees/$1/loan || exit 1
tok=$(~/.claude/bin/ram-gate acquire gradle packs-fix5 --wait 900) || { echo DENIED; exit 9; }
rm -rf target/surefire-reports
mvn -q test -Dtest="$2" > ../../run-$1.log 2>&1
echo mvn_exit=$?
~/.claude/bin/ram-gate release $tok
python3 - <<'P'
import glob,xml.etree.ElementTree as ET
for f in sorted(glob.glob('target/surefire-reports/TEST-*.xml')):
    r=ET.parse(f).getroot(); print(r.attrib['name'].split('.')[-1],r.attrib['tests'],'fail',r.attrib['failures'],'err',r.attrib['errors'])
    for t in r.findall('testcase'):
        if t.find('failure') is not None or t.find('error') is not None: print('  RED',t.attrib['name'])
P
echo DONE
