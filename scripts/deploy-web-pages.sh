#!/usr/bin/env bash

################################################################################
# AIVO Web Deployment Script for Cloudflare Pages
# Deploys the Next.js web application to Cloudflare Pages
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

cd "$PROJECT_ROOT"

print_header "AIVO Web Deployment to Cloudflare Pages"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v wrangler &> /dev/null; then
  print_error "Wrangler CLI not found. Install with: npm install -g wrangler"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  print_error "pnpm not found. Install with: npm install -g pnpm"
  exit 1
fi

print_success "Prerequisites met"
echo ""

# Check if logged in to Cloudflare
print_info "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
  print_error "Not logged in to Cloudflare. Run: wrangler login"
  exit 1
fi

print_success "Logged in to Cloudflare"
echo ""

# Build the web application
print_header "Building Web Application"

print_info "Installing dependencies..."
cd "$PROJECT_ROOT/apps/web"
pnpm install

print_info "Building for Cloudflare Pages..."
pnpm run build:pages

# Check build output
if [ ! -d "$PROJECT_ROOT/apps/web/.next/standalone" ]; then
  print_error "Build output not found! Build may have failed."
  exit 1
fi

print_success "Build completed successfully"
echo ""

# Deploy to Cloudflare Pages
print_header "Deploying to Cloudflare Pages"

# Check if project already exists
PROJECT_NAME="aivo-web"

print_info "Deploying to Cloudflare Pages..."
echo ""

# Deploy using wrangler pages deploy
if wrangler pages deploy "$PROJECT_ROOT/apps/web" --project-name "$PROJECT_NAME"; then
  print_success "Deployment successful!"
  echo ""
  print_info "Your site will be available at:"
  echo "  https://$PROJECT_NAME.pages.dev"
  echo ""
  print_info "To use a custom domain:"
  echo "  1. Go to Cloudflare Dashboard → Pages → $PROJECT_NAME"
  echo "  2. Add your domain under 'Custom domains'"
  echo "  3. Update DNS if using external domain"
else
  print_error "Deployment failed"
  exit 1
fi

print_header "Deployment Complete"
print_success "Web application deployed to Cloudflare Pages"
echo ""
print_info "Next steps:"
echo "  1. Configure custom domain in Cloudflare Dashboard"
echo "  2. Update NEXT_PUBLIC_API_URL in .env.production"
echo "  3. Update OAuth redirect URIs with your production domain"
echo "  4. Deploy API to Cloudflare Workers"
echo ""
