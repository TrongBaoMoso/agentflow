#!/bin/bash
# Usage: nc.sh <group> <from> <to>   (one control at a time: gate, mutate, test, restore)
S=/private/tmp/claude-501/-Users-apple-Projects-agentflow/a50f3619-2b8f-47f8-9f0c-b8d0e6887344/scratchpad
R=/Users/apple/Projects/agentflow/.worktrees/recruit-be-hh-pr6
g=$1; from=$2; to=$3
for i in $(seq "$from" "$to"); do
  IFS=$'\t' read -r task filt < <(python3 "$S/nc.py" meta "$g" "$i")
  kind=gradle; [ "$task" = integrationTest ] && kind=gradle-it
  T=$(~/.claude/bin/ram-gate acquire "$kind" pr6-nc --wait 900) || { echo "control $g $i | DENIED" | tee -a "$S/nc-results.txt"; continue; }
  if python3 "$S/nc.py" apply "$g" "$i" >/dev/null; then
    rm -f "$R"/build/test-results/"$task"/*.xml
    (cd "$R" && ./gradlew --no-daemon -q "$task" --tests "$filt" >/dev/null 2>&1)
    python3 "$S/nc.py" report "$g" "$i"
  else
    echo "control $g $i | MUTATION NOT FOUND" | tee -a "$S/nc-results.txt"
  fi
  git -C "$R" checkout -- src
  ~/.claude/bin/ram-gate release "$T"
done
git -C "$R" status --porcelain src | wc -l | xargs echo "dirty files:"
