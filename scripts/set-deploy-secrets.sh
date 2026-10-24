#!/usr/bin/env bash
# Set the GitHub Actions secrets required by the Deploy workflow.
#
# Required on the fine-grained PAT used for GitHub access:
#   Actions: Read and write   (to create repository secrets)
#
# Run once. Both secrets are set on the htdungvnn/aivo repository.

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

# Cloudflare account id for the "htdung-aivo" account.
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-fb243e7d5e9d8f9abe092940eac52539}"

echo "==> Setting CLOUDFLARE_ACCOUNT_ID"
gh variable set CLOUDFLARE_ACCOUNT_ID \
  --repo htdungvnn/aivo \
  --body "$CLOUDFLARE_ACCOUNT_ID"

echo "==> Setting CLOUDFLARE_API_TOKEN"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo htdungvnn/aivo
else
  echo "    CLOUDFLARE_API_TOKEN is not set in this shell." >&2
  echo "    Export it and re-run:" >&2
  echo "      export CLOUDFLARE_API_TOKEN=cfut_..." >&2
  exit 1
fi

echo
echo "==> Done. Variables and secrets:"
gh variable list --repo htdungvnn/aivo
gh secret list --repo htdungvnn/aivo

echo
echo "==> Trigger a deploy to verify:"
echo "    gh workflow run deploy.yml --repo htdungvnn/aivo"
