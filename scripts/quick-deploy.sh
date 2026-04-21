#!/usr/bin/env bash

################################################################################
# AIVO Quick Deploy Script
# Fast deployment for development/staging environments
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  AIVO Quick Deploy${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd "$PROJECT_ROOT"

echo "1/5 Installing dependencies..."
pnpm install

echo ""
echo "2/5 Building WASM module..."
pnpm run build:wasm

echo ""
echo "3/5 Building API..."
cd apps/api
pnpm run build

echo ""
echo "4/5 Applying database migrations..."
cd "$PROJECT_ROOT/packages/db"
pnpm run migrate:remote

echo ""
echo "5/5 Deploying API..."
cd "$PROJECT_ROOT/apps/api"
pnpm run deploy

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Deploy web app: cd apps/web && vercel --prod"
echo "  - Check API: curl https://api.aivo.yourdomain.com/health"
echo "  - View logs: cd apps/api && wrangler tail"
