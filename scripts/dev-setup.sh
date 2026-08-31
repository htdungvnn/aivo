#!/bin/bash
# ============================================
# AIVO Development Setup Script
# ============================================
# This script helps set up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AIVO Development Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js$(node --version)${NC}"

if ! command_exists pnpm; then
    echo -e "${RED}✗ pnpm is not installed${NC}"
    echo "  Install with: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✓ pnpm$(pnpm --version)${NC}"

if ! command_exists wrangler; then
    echo -e "${YELLOW}⚠ wrangler is not installed (required for Cloudflare Workers)${NC}"
    echo "  Install with: pnpm add -g wrangler"
fi

echo ""

# Generate JWT keys if they don't exist
echo -e "${YELLOW}Setting up JWT keys...${NC}"

if [ ! -f ".env.development" ] || ! grep -q "AUTH_JWT_PRIVATE_KEY=<generate" .env.development 2>/dev/null; then
    echo -e "${GREEN}✓ JWT keys already configured${NC}"
else
    echo -e "${YELLOW}⚠ JWT keys not configured in .env.development${NC}"
    echo "  Please generate keys with:"
    echo "    openssl ecparam -genkey -name prime256v1 -noout -out /tmp/private.pem"
    echo "    openssl ec -in /tmp/private.pem -pubout -out /tmp/public.pem"
    echo "    cat /tmp/private.pem | base64"
    echo "    cat /tmp/public.pem | base64"
fi

echo ""

# Copy env files if they don't exist
echo -e "${YELLOW}Checking environment files...${NC}"

# Auth service
if [ ! -f "apps/services/auth/.env" ]; then
    if [ -f "apps/services/auth/.env.development" ]; then
        cp apps/services/auth/.env.development apps/services/auth/.env
        echo -e "${GREEN}✓ Created apps/services/auth/.env from .env.development${NC}"
    fi
fi

echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Available commands:${NC}"
echo ""
echo -e "  ${BLUE}Start all services:${NC}"
echo "    pnpm dev:all"
echo ""
echo -e "  ${BLUE}Start individual services:${NC}"
echo "    pnpm dev:web          # Next.js web app (http://localhost:3000)"
echo "    pnpm dev:mobile       # Expo mobile app"
echo "    pnpm dev:auth         # Auth service (http://localhost:3001)"
echo "    pnpm dev:nutrition    # Nutrition service (http://localhost:3002)"
echo "    pnpm dev:coach        # Coach service (http://localhost:3003)"
echo "    pnpm dev:health       # Health service (http://localhost:3004)"
echo "    pnpm dev:mail         # Mail service (http://localhost:3005)"
echo "    pnpm dev:gateway      # API Gateway (http://localhost:4000)"
echo ""
echo -e "  ${BLUE}Service ports:${NC}"
echo "    Web:      3000"
echo "    Auth:     3001"
echo "    Nutrition: 3002"
echo "    Coach:    3003"
echo "    Health:   3004"
echo "    Mail:     3005"
echo "    Gateway:  4000"
echo ""
