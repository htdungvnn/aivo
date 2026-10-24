#!/usr/bin/env bash
# Push the current branch to GitHub.
#
# The GitHub token in .cursor/mcp.json needs **Contents: Read and write**
# on the htdungvnn/aivo repository for this to work.
#
# Fine-grained PAT setup:
#   https://github.com/settings/personal-access-tokens/new
#   - Repository access: select "htdungvnn/aivo"
#   - Permissions -> Repository permissions:
#       Contents:  Read and write   <- required to push code
#       Actions:   Read and write   <- required to set deploy secrets
#       Workflows: Read and write   <- required to update workflow files

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

command -v gh >/dev/null 2>&1 || {
  echo "gh CLI not found. Install from https://cli.github.com/ and re-run." >&2
  exit 1
}

export GH_TOKEN="$(python3 -c "
import json
print(json.load(open('$REPO_DIR/.cursor/mcp.json'))['mcpServers']['github']['headers']['Authorization'].split(' ',1)[1])
")"

cd "$REPO_DIR"

BRANCH="$(git branch --show-current)"

echo "==> Verifying token can write to the repository"
# Probe on a throwaway branch so verification never adds commits to main.
PROBE_BRANCH="_write-probe"
PROBE_REF="refs/heads/$PROBE_BRANCH"
gh api "repos/htdungvnn/aivo/git/refs" --method POST \
  -f ref="$PROBE_REF" \
  -f sha="$(gh api repos/htdungvnn/aivo/git/ref/heads/main --jq '.object.sha')" >/dev/null
gh api "repos/htdungvnn/aivo/contents/.write-probe" --method PUT \
  -f message="chore: verify write access" \
  -f branch="$PROBE_BRANCH" \
  -f content="$(printf '# probe\n' | base64)" >/dev/null
PROBE_SHA="$(gh api "repos/htdungvnn/aivo/contents/.write-probe?ref=$PROBE_BRANCH" --jq '.sha')"
# `gh api` only sends DELETE body fields via --input, not via -f.
printf '{"message":"chore: remove write probe","sha":"%s","branch":"%s"}' \
  "$PROBE_SHA" "$PROBE_BRANCH" \
  | gh api "repos/htdungvnn/aivo/contents/.write-probe" --method DELETE --input - >/dev/null
gh api "repos/htdungvnn/aivo/git/refs/heads/$PROBE_BRANCH" --method DELETE >/dev/null
echo "    OK"

echo "==> Pushing $BRANCH"
git push -u origin "$BRANCH"

echo
echo "==> Setting Cloudflare deploy secrets"
echo "    Run scripts/set-deploy-secrets.sh for that (needs Actions: write)."
