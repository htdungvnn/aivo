#!/usr/bin/env bash

set -e

# Sửa lỗi tại đây: Đã thêm dấu ngoặc kép đóng "
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${YELLOW}→ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

cd "$PROJECT_ROOT"

print_header "AIVO Environment Setup"

# Hàm helper để tạo file env từ template
setup_env_file() {
  local target=$1
  local template=$2
  if [ ! -f "$target" ]; then
    print_warning "$target not found"
    if [ -f "$template" ]; then
      cp "$template" "$target"
      print_success "Created $target from template"
    else
      print_error "Template $template not found"
    fi
  else
    print_success "$target exists"
  fi
}

# Thực hiện kiểm tra các file env
setup_env_file "apps/api/.env" "apps/api/.env.example"
setup_env_file "apps/web/.env.local" "apps/web/.env.local.example"
setup_env_file "apps/mobile/.env" "apps/mobile/.env.example"

print_header "Required Setup Steps"

# Tạo mã secret cho JWT signing
echo "1. Generate AUTH_SECRET for API (JWT signing):"
echo -e "   ${CYAN}openssl rand -base64 32${NC}"
echo "   Copy the output to apps/api/.env as AUTH_SECRET"
echo ""

echo "2. Set up OAuth providers (Client IDs - these are public, not secrets):"
echo -e "   ${CYAN}Google:${NC} https://console.cloud.google.com/apis/credentials"
echo -e "   ${CYAN}Facebook:${NC} https://developers.facebook.com/apps"
echo "   Update Client IDs in your .env files:"
echo "   - GOOGLE_CLIENT_ID (API, Web, Mobile)"
echo "   - FACEBOOK_APP_ID (API, Web, Mobile)"
echo ""

print_header "Production Deployment (Cloudflare)"
echo "Set secrets for Cloudflare Workers:"
echo "   cd apps/api"
echo "   wrangler secret put AUTH_SECRET"
echo ""
echo "Set environment variables in Cloudflare Dashboard:"
echo "   - GOOGLE_CLIENT_ID"
echo "   - FACEBOOK_APP_ID"
echo "   - OPENAI_API_KEY (optional)"

print_header "Quick Start"
echo "API: cd apps/api && pnpmx wrangler dev"
echo "Web: cd apps/web && pnpm run dev"
print_success "Environment setup complete!"
