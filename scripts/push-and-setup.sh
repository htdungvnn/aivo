#!/usr/bin/env bash
# Push the CI/CD setup to GitHub.
#
# The GitHub token currently in .cursor/mcp.json can create repositories and
# write Issues, but it is missing **Contents: Write**, so `git push` fails
# with 403. Fix that on the token, then run this script.
#
# Fine-grained PAT setup:
#   https://github.com/settings/personal-access-tokens/new
#   - Repository access: select "htdungvnn/aivo"
#   - Permissions -> Repository permissions:
#       Contents:  Read and write   <- required to push code
#       Actions:   Read and write   <- required to set deploy secrets
#       Workflows: Read and write   <- required to update workflow files
#   - (Metadata: Read is granted automatically)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it from https://cli.github.com/ and re-run." >&2
  exit 1
fi

export GH_TOKEN="$(python3 -c "
import json
print(json.load(open('$REPO_DIR/.cursor/mcp.json'))['mcpServers']['github']['headers']['Authorization'].split(' ',1)[1])
")"

cd "$REPO_DIR"

echo "==> Verifying token can write to the repository"
gh api repos/htdungvnn/aivo/contents/.write-probe --method PUT \
  -f message="chore: verify write access" \
  -f content="$(printf '# probe\n' | base64)" >/dev/null
gh api repos/htdungvnn/aivo/contents/.write-probe --method DELETE >/dev/null
echo "    OK"

echo "==> Pushing main"
git push -u origin main

echo "==> Setting Cloudflare deploy secrets"
# Replace the values below with your real Cloudflare credentials.
# Create an API token at https://dash.cloudflare.com/profile/api-tokens
# with the "Workers Scripts: Edit" permission.
echo "    Set these repository secrets manually if they are not already present:"
echo "      CLOUDFLARE_API_TOKEN"
echo "      CLOUDFLARE_ACCOUNT_ID"
gh secret list --repo htdungvnn/aivo

echo
echo "==> Done. CI will run on the pushed commit."
echo "    Watch it with: gh run watch --repo htdungvnn/aivo"
