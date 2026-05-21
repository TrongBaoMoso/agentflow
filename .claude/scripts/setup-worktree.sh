#!/usr/bin/env bash
# setup-worktree.sh — Create an isolated git worktree for agent work.
#
# Why: when an agent runs `npm run build` in the main checkout while the user
# has `npm run dev` running, both processes fight over `.next/` and webpack
# chunks disappear (`Cannot find module './vendor-chunks/...'`). Each worktree
# has its own `.next/` + `node_modules/`, so dev and build never collide.
#
# Usage:
#   setup-worktree.sh <target-repo> <task-id> <short-desc> <feature-branch>
#
# Example:
#   setup-worktree.sh lf-iq beads-42 homeowner-filter feature/admin-dashboard-v2-ui
#
# Result:
#   <agentflow>/worktrees/<task-id>-<short-desc>/  (new git worktree)
#   node_modules cloned via APFS clonefile (near-instant, copy-on-write)
#   .env* files symlinked from main checkout

set -euo pipefail

TARGET_REPO="${1:?target repo required, e.g. lf-iq}"
TASK_ID="${2:?task id required, e.g. beads-42}"
SHORT_DESC="${3:?short description required, e.g. homeowner-filter}"
FEATURE_BRANCH="${4:?feature branch required, e.g. feature/foo}"

AGENTFLOW_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_PATH="${AGENTFLOW_ROOT}/${TARGET_REPO}"
WORKTREE_ROOT="${AGENTFLOW_ROOT}/worktrees"
WORKTREE_PATH="${WORKTREE_ROOT}/${TARGET_REPO}-${TASK_ID}-${SHORT_DESC}"
BRANCH_NAME="agent/${TASK_ID}-${SHORT_DESC}"

if [ ! -d "${REPO_PATH}/.git" ] && [ ! -f "${REPO_PATH}/.git" ]; then
  echo "ERROR: ${REPO_PATH} is not a git repo" >&2
  exit 1
fi

mkdir -p "${WORKTREE_ROOT}"

cd "${REPO_PATH}"

# Ensure feature branch exists and is up-to-date with production
git fetch origin --quiet
if ! git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"; then
  echo "ERROR: feature branch '${FEATURE_BRANCH}' does not exist locally" >&2
  exit 1
fi

# Create the worktree off the feature branch
echo "→ Creating worktree at ${WORKTREE_PATH}"
git worktree add "${WORKTREE_PATH}" -b "${BRANCH_NAME}" "${FEATURE_BRANCH}"

# Clone node_modules via APFS clonefile (near-instant, copy-on-write)
if [ -d "${REPO_PATH}/node_modules" ]; then
  echo "→ Cloning node_modules (APFS clonefile)"
  # `cp -c` uses clonefile(2) on APFS — near-instant, no extra disk usage
  # until files are modified. Fall back to `cp -R` on non-APFS.
  cp -Rc "${REPO_PATH}/node_modules" "${WORKTREE_PATH}/node_modules" 2>/dev/null \
    || cp -R "${REPO_PATH}/node_modules" "${WORKTREE_PATH}/node_modules"
fi

# Symlink .env files (they're gitignored; agent needs them for build)
for envfile in .env .env.local .env.development .env.production; do
  if [ -f "${REPO_PATH}/${envfile}" ] && [ ! -e "${WORKTREE_PATH}/${envfile}" ]; then
    ln -s "${REPO_PATH}/${envfile}" "${WORKTREE_PATH}/${envfile}"
  fi
done

echo ""
echo "Worktree ready:"
echo "  path:   ${WORKTREE_PATH}"
echo "  branch: ${BRANCH_NAME}"
echo "  base:   ${FEATURE_BRANCH}"
echo ""
echo "Next steps:"
echo "  cd ${WORKTREE_PATH}"
echo "  # run all npm commands HERE, never in ${REPO_PATH}"
