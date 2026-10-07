#!/bin/zsh
# usage: merge_pr.sh <repo> <pr> "<subject>"   -> waits CI+clean, squash-merges, promotes staging, waits deploy
R=LoanFactory-Inc/$1; N=$2; S="$3"
for i in $(seq 1 80); do
  st=$(gh api repos/$R/pulls/$N -q .mergeable_state 2>/dev/null)
  H=$(gh api repos/$R/pulls/$N -q .head.sha)
  c=$(gh api repos/$R/commits/$H/check-runs -q '[.check_runs[]|select(.name=="check" or .name=="Tests" or .name=="Integration tests")|.conclusion//"pending"]|join(",")')
  echo "$(date +%H:%M) $N ${H:0:8} $st [$c]"
  case "$c" in *failure*) echo "CI FAILED"; exit 2;; esac
  [ "$st" = dirty ] && d=$((d+1)) || d=0; [ "$d" -ge 3 ] && { echo DIRTY; exit 3; }
  [ "$st" = behind ] && gh pr update-branch $N -R $R >/dev/null 2>&1
  [ "$st" = clean ] && break
  sleep 45
done
[ "$st" = clean ] || { echo "NOT CLEAN"; exit 3; }
gh pr merge $N -R $R --squash --subject "$S" 2>&1 | tail -1
M=""; for k in 1 2 3 4 5 6; do sleep 5; M=$(gh pr view $N -R $R --json mergeCommit -q .mergeCommit.oid 2>/dev/null); [ -n "$M" ] && break; done; echo "merged $M"
[ -n "$M" ] || exit 4
gh workflow run promote-staging.yml -R $R >/dev/null 2>&1; sleep 25
for i in $(seq 1 40); do o=$(gh run list -R $R --workflow cd-staging.yml --limit 1 --json status,conclusion,headSha -q '.[0]|"\(.status) \(.conclusion) \(.headSha)"'); case "$o" in "completed "*"$M") echo "deploy: $o"; exit 0;; esac; sleep 30; done
echo "deploy not confirmed"; exit 5
