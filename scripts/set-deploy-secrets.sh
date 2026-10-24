#!/usr/bin/env bash
# Set the GitHub Actions secret required by the Deploy workflow.
#
# Required on the fine-grained PAT used for GitHub access:
#   Actions: Read and write   (to create repository secrets)
#
# The Cloudflare account id is not a credential, so it is configured as a
# workflow-level env var in .github/workflows/deploy.yml and needs no secret.
#
# The Cloudflare API token must have the "Workers Scripts: Edit" permission on
# the target account. Create one at:
#   https://dash.cloudflare.com/profile/api-tokens -> Create Token ->
#   Edit Cloudflare Workers -> Account -> Workers Scripts: Edit

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

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "CLOUDFLARE_API_TOKEN is not set in this shell." >&2
  echo "Export it and re-run:" >&2
  echo "  export CLOUDFLARE_API_TOKEN=cfut_..." >&2
  exit 1
fi

echo "==> Setting CLOUDFLARE_API_TOKEN"
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo htdungvnn/aivo

echo
echo "==> Done. Repository secrets:"
gh secret list --repo htdungvnn/aivo

echo
echo "==> Trigger a deploy to verify:"
echo "    gh workflow run deploy.yml --repo htdungvnn/aivo"
