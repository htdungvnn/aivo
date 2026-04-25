#!/usr/bin/env bash

################################################################################
# AIVO Environment Validation Script
# Checks that all required environment variables are set correctly
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
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

errors=0
warnings=0

check_file() {
  local file=$1
  local name=$2

  if [ -f "$file" ]; then
    print_success "$name exists"
  else
    print_error "$name not found: $file"
    ((errors++))
  fi
}

check_var_in_file() {
  local file=$1
  local var=$2
  local name=$3

  if [ -f "$file" ]; then
    if grep -q "^${var}=" "$file" && ! grep -q "^${var}=.*your" "$file" && ! grep -q "^${var}=.*example" "$file"; then
      print_success "$name is set in $file"
    else
      print_warning "$name not set or using placeholder in $file"
      ((warnings++))
    fi
  else
    print_error "Cannot check $name - file not found: $file"
    ((errors++))
  fi
}

cd "$PROJECT_ROOT"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  AIVO Environment Validation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check .env files exist
echo "Checking environment files..."
check_file "apps/api/.env" "API .env"
check_file "apps/web/.env.local" "Web .env.local"
check_file "apps/mobile/.env" "Mobile .env"
echo ""

# Check API required variables
echo "Checking API configuration..."
check_var_in_file "apps/api/.env" "AUTH_SECRET" "AUTH_SECRET"
echo ""

# Check OAuth configuration
echo "Checking OAuth configuration..."
check_var_in_file "apps/api/.env" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_ID API"
check_var_in_file "apps/api/.env" "FACEBOOK_APP_ID" "FACEBOOK_APP_ID API"
check_var_in_file "apps/web/.env.local" "NEXT_PUBLIC_GOOGLE_CLIENT_ID" "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
check_var_in_file "apps/web/.env.local" "NEXT_PUBLIC_FACEBOOK_CLIENT_ID" "NEXT_PUBLIC_FACEBOOK_CLIENT_ID"
check_var_in_file "apps/mobile/.env" "EXPO_PUBLIC_GOOGLE_CLIENT_ID" "EXPO_PUBLIC_GOOGLE_CLIENT_ID"
check_var_in_file "apps/mobile/.env" "EXPO_PUBLIC_FACEBOOK_CLIENT_ID" "EXPO_PUBLIC_FACEBOOK_CLIENT_ID"
echo ""

# Check API URLs
echo "Checking API URLs..."
check_var_in_file "apps/web/.env.local" "NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_API_URL"
check_var_in_file "apps/mobile/.env" "EXPO_PUBLIC_API_URL" "EXPO_PUBLIC_API_URL"
echo ""

# Check Cloudflare secrets (production only)
echo "Checking Cloudflare secrets (production)..."
if command -v wrangler &> /dev/null; then
  cd apps/api

  if wrangler secret list 2>/dev/null | grep -q "AUTH_SECRET"; then
    print_success "AUTH_SECRET set in Cloudflare"
  else
    print_warning "AUTH_SECRET not set in Cloudflare (run: wrangler secret put AUTH_SECRET)"
    ((warnings++))
  fi

  if wrangler secret list 2>/dev/null | grep -q "OPENAI_API_KEY"; then
    print_success "OPENAI_API_KEY set in Cloudflare"
  else
    print_info "OPENAI_API_KEY not set (optional for AI features)"
  fi

  cd "$PROJECT_ROOT"
else
  print_info "Wrangler CLI not installed - skipping Cloudflare secret check"
fi
echo ""

# Check wrangler.toml configuration
echo "Checking Cloudflare configuration..."
if [ -f "apps/api/wrangler.toml" ]; then
  if grep -q "database_id = \"[^\"]\+\"" "apps/api/wrangler.toml"; then
    print_success "D1 database_id configured"
  else
    print_warning "D1 database_id not set in wrangler.toml"
    ((warnings++))
  fi

  if grep -q "bucket_name = \"[^\"]\+\"" "apps/api/wrangler.toml"; then
    print_success "R2 bucket configured"
  else
    print_warning "R2 bucket not configured in wrangler.toml"
    ((warnings++))
  fi

  kv_count=$(grep -c '\[\[kv_namespaces\]\]' "apps/api/wrangler.toml" 2>/dev/null || echo 0)
  if [ "$kv_count" -ge 3 ]; then
    print_success "All KV namespaces configured ($kv_count)"
  else
    print_warning "Only $kv_count KV namespaces configured (need 3)"
    ((warnings++))
  fi
else
  print_error "wrangler.toml not found"
  ((errors++))
fi
echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Environment is ready for development.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run ./scripts/setup-env.sh to create missing .env files"
  echo "  2. Edit .env files with your actual credentials"
  echo "  3. Start development: ./scripts/dev.sh"
  exit 0
elif [ $errors -eq 0 ]; then
  echo -e "${YELLOW}⚠ $warnings warning(s), 0 errors${NC}"
  echo ""
  echo "Please address the warnings above before deploying to production."
  echo "Development may still work with placeholder values."
  exit 0
else
  echo -e "${RED}✗ $errors error(s), $warnings warning(s)${NC}"
  echo ""
  echo "Please fix the errors above before proceeding."
  echo "Run ./scripts/setup-env.sh to create missing configuration files."
  exit 1
fi
