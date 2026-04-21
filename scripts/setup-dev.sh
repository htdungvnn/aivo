#!/usr/bin/env bash

################################################################################
# AIVO Local Development Setup Script
# Sets up local development environment with all services
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

print_header "AIVO Local Development Setup"

print_info "Installing dependencies..."
pnpm install

print_info "Building WASM module..."
pnpm run build:wasm

print_info "Setting up local database..."
cd packages/db
if pnpm run migrate:local; then
  print_success "Database ready"
else
  echo ""
  print_info "Creating new local database..."
  wrangler d1 database create aivo-db --local || true
  pnpm run migrate:local
fi

cd "$PROJECT_ROOT"

print_header "Development Services"

echo "To start the development environment, run these commands in separate terminals:"
echo ""
echo " Terminal 1 - API (Cloudflare Workers Dev):"
echo "   cd apps/api"
echo "   pnpmx wrangler dev --local"
echo ""
echo " Terminal 2 - Web (Next.js):"
echo "   cd apps/web"
echo "   pnpm run dev"
echo ""
echo " Terminal 3 - Mobile (Expo):"
echo "   cd apps/mobile"
echo "   pnpmx expo start"
echo ""
echo "Or use tmux to run all at once:"
echo "   ./scripts/dev.sh"
echo ""

print_success "Setup complete!"
