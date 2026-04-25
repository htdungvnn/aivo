#!/usr/bin/env bash

################################################################################
# AIVO Secret Generator
# Generates secure secrets for development and production
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}→ $1${NC}"
}

cd "$PROJECT_ROOT"

print_header "AIVO Secret Generator"

echo "This script generates secure secrets for your AIVO deployment."
echo ""

# Generate AUTH_SECRET
echo "Generating AUTH_SECRET..."
auth_secret=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo ""
echo -e "${GREEN}Generated AUTH_SECRET:${NC}"
echo "$auth_secret"
echo ""
echo "Add this to:"
echo "  - apps/api/.env (as AUTH_SECRET)"
echo "  - Cloudflare: wrangler secret put AUTH_SECRET"
echo ""

# Generate JWT secret alternative
echo "Generating JWT_SECRET (alternative)..."
jwt_secret=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
echo ""
echo -e "${GREEN}Generated JWT_SECRET:${NC}"
echo "$jwt_secret"
echo ""
echo "Use this if you need a separate JWT signing key."
echo ""

# Generate API key for internal services
echo "Generating INTERNAL_API_KEY..."
api_key=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")
echo ""
echo -e "${GREEN}Generated INTERNAL_API_KEY:${NC}"
echo "$api_key"
echo ""
echo "Use for service-to-service authentication if needed."
echo ""

print_header "Next Steps"

echo "1. Add secrets to your environment files:"
echo ""
echo "   apps/api/.env:"
echo "   AUTH_SECRET=$auth_secret"
echo ""
echo "2. Set Cloudflare secrets:"
echo "   cd apps/api"
echo "   wrangler secret put AUTH_SECRET"
echo "   wrangler secret put INTERNAL_API_KEY  # if using"
echo ""
echo "3. For production, store these securely:"
echo "   - Use a secrets manager (1Password, Vault, etc.)"
echo "   - Never commit .env files to git"
echo "   - Rotate secrets periodically"
echo ""

print_success "Secret generation complete!"
