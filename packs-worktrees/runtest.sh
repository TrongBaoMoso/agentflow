#!/bin/bash
# usage: runtest.sh <TestPattern>
cd /Users/apple/Projects/agentflow/packs-worktrees/recruiter-credit-lo-program/loan || exit 1
tok=$(~/.claude/bin/ram-gate acquire gradle packs3739 --wait 900) || { echo DENIED; exit 9; }
mvn -q test -Dtest="$1" > ../../run.log 2>&1
echo mvn_exit=$?
~/.claude/bin/ram-gate release $tok
for f in target/surefire-reports/*.txt; do grep -H -E "Tests run:" "$f" | cut -c1-220; done | grep -E "${1%%,*}" | head
grep -h "ERROR.*\.java" ../../run.log | head -5
