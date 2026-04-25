#!/usr/bin/env bash

################################################################################
# AIVO Setup Script
# Consolidated setup for development and production environments
################################################################################

set -e

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

# Subcommand: env - Create .env files from templates
cmd_env() {
  print_header "AIVO Environment Setup"

  # Check if central .env.base exists in .env/ folder
  ENV_BASE="$PROJECT_ROOT/.env/.env.base"
  if [ ! -f "$ENV_BASE" ]; then
    print_error "Central .env/.env.base file not found!"
    print_info "Please create .env/.env.base from the template first."
    exit 1
  fi

  # Function to extract section from .env file and write to target
  extract_section() {
    local target=$1
    local start_pattern=$2
    local end_pattern=$3
    local in_section=0
    local section_name=""

    # Create or truncate target file
    > "$target"

    while IFS= read -r line; do
      # Check if we're entering the section
      if [[ "$line" == *"$start_pattern"* ]] && [ $in_section -eq 0 ]; then
        in_section=1
        section_name="$start_pattern"
        # Generate descriptive header
        echo "# ============================================================================" > "$target"
        echo "# $(echo "$section_name" | sed 's/[=]/ /g' | tr -s ' ' | xargs)" >> "$target"
        echo "# Auto-generated from $ENV_BASE" >> "$target"
        echo "# For full documentation, see: $ENV_BASE" >> "$target"
        echo "# ============================================================================" >> "$target"
        echo "" >> "$target"
        continue
      fi

      # Check if we're exiting the section
      if [ $in_section -eq 1 ] && [[ "$line" == *"$end_pattern"* ]]; then
        break
      fi

      # Write lines if we're in the section
      if [ $in_section -eq 1 ] && [[ -n "$line" ]] && [[ ! "$line" =~ ^[[:space:]]*# ]]; then
        echo "$line" >> "$target"
      fi
    done < "$ENV_BASE"

    if [ -s "$target" ]; then
      print_success "Created $target from central .env"
    else
      print_warning "No variables extracted for $target"
    fi
  }

  # Extract sections for each app
  extract_section "$PROJECT_ROOT/apps/api/.env" "CLOUDFLARE WORKERS API" "WEB APP - NEXT.JS"
  extract_section "$PROJECT_ROOT/apps/web/.env.local" "WEB APP - NEXT.JS" "MOBILE APP - EXPO"
  extract_section "$PROJECT_ROOT/apps/mobile/.env" "MOBILE APP - EXPO" "EOF_MARKER"

  # Also copy .env/.env.base to .env/.env.example for reference (remove secrets first)
  if [ ! -f "$PROJECT_ROOT/.env/.env.example" ]; then
    sed 's/=.*$/=your_value_here/' "$ENV_BASE" > "$PROJECT_ROOT/.env/.env.example"
    print_success "Created .env/.env.example from $ENV_BASE"
  fi

  print_header "Required Setup Steps"
  echo "1. Verify AUTH_SECRET in apps/api/.env:"
  echo -e "   ${CYAN}openssl rand -base64 32${NC}"
  echo "   (Should match AUTH_SECRET in your .env)"
  echo ""
  echo "2. Set up OAuth providers (Client IDs):"
  echo -e "   ${CYAN}Google:${NC} https://console.cloud.google.com/apis/credentials"
  echo -e "   ${CYAN}Facebook:${NC} https://developers.facebook.com/apps"
  echo "   Update these variables in all .env files:"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - FACEBOOK_APP_ID"
  echo ""

  print_success "Environment files created!"
}

# Subcommand: validate - Validate environment configuration
cmd_validate() {
  print_header "AIVO Environment Validation"

  cd "$PROJECT_ROOT"

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
    (
      cd "$PROJECT_ROOT/apps/api"

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
    )
  else
    print_info "Wrangler CLI not installed - skipping Cloudflare secret check"
  fi
  echo ""

  # Check wrangler.toml configuration
  echo "Checking Cloudflare configuration..."
  if [ -f "$PROJECT_ROOT/apps/api/wrangler.toml" ]; then
    if grep -q "database_id = \"[^\"]\+\"" "$PROJECT_ROOT/apps/api/wrangler.toml"; then
      print_success "D1 database_id configured"
    else
      print_warning "D1 database_id not set in wrangler.toml"
      ((warnings++))
    fi

    if grep -q "bucket_name = \"[^\"]\+\"" "$PROJECT_ROOT/apps/api/wrangler.toml"; then
      print_success "R2 bucket configured"
    else
      print_warning "R2 bucket not configured in wrangler.toml"
      ((warnings++))
    fi

    kv_count=$(grep -c '\[\[kv_namespaces\]\]' "$PROJECT_ROOT/apps/api/wrangler.toml" 2>/dev/null || echo 0)
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
  print_header "Validation Summary"
  if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Environment is ready for development.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run ./scripts/setup.sh dev to complete local setup"
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
    echo "Run ./scripts/setup.sh env to create missing configuration files."
    exit 1
  fi
}

# Subcommand: dev - Local development setup
cmd_dev() {
  print_header "AIVO Local Development Setup"

  print_info "Installing dependencies..."
  pnpm install

  print_info "Building WASM module..."
  pnpm run build:wasm

  print_info "Setting up local database..."
  (
    cd "$PROJECT_ROOT/packages/db"
    if pnpm run migrate:local; then
      print_success "Database ready"
    else
      echo ""
      print_info "Creating new local database..."
      wrangler d1 database create aivo-db --local || true
      pnpm run migrate:local
    fi
  )

  cd "$PROJECT_ROOT"

  print_header "Development Services"
  echo "To start the development environment, run these commands in separate terminals:"
  echo ""
  echo " Terminal 1 - API (Cloudflare Workers Dev):"
  echo "   cd apps/api"
  echo "   pnpm exec wrangler dev --local"
  echo ""
  echo " Terminal 2 - Web (Next.js):"
  echo "   cd apps/web"
  echo "   pnpm run dev"
  echo ""
  echo " Terminal 3 - Mobile (Expo):"
  echo "   cd apps/mobile"
  echo "   pnpm exec expo start"
  echo ""
  echo "Or use tmux to run all at once:"
  echo "   ./scripts/dev.sh"
  echo ""

  print_success "Local development setup complete!"
}

# Subcommand: secrets - Generate secure secrets
cmd_secrets() {
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
}

# Subcommand: all - Run full setup
cmd_all() {
  print_header "AIVO Full Setup"
  print_info "This will run: env -> validate -> dev"
  echo ""

  cmd_env
  echo ""
  read -p "Continue to validation? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cmd_validate
  else
    print_info "Skipping validation"
  fi

  echo ""
  read -p "Continue to development setup? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cmd_dev
  else
    print_info "Skipping development setup"
  fi

  print_header "Setup Complete"
  print_success "All setup steps finished!"
  echo ""
  print_info "Next: Run ./scripts/dev.sh to start development"
}

# Subcommand: help - Show usage
cmd_help() {
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  env        Create .env files from templates"
  echo "  validate   Validate environment configuration"
  echo "  dev        Set up local development (deps, DB, WASM)"
  echo "  secrets    Generate secure secrets"
  echo "  all        Run full setup (env -> validate -> dev)"
  echo "  help       Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 env         # Create .env files only"
  echo "  $0 all         # Complete setup flow"
  echo "  $0 dev         # Only local dev setup"
  echo ""
  echo "For backwards compatibility, you can still use:"
  echo "  ./scripts/setup-env.sh"
  echo "  ./scripts/validate-env.sh"
  echo "  ./scripts/setup-dev.sh"
}

# Main - dispatch to subcommand
main() {
  cd "$PROJECT_ROOT"

  case "${1:-help}" in
    env)
      cmd_env
      ;;
    validate|val)
      cmd_validate
      ;;
    dev)
      cmd_dev
      ;;
    secrets|secret)
      cmd_secrets
      ;;
    all)
      cmd_all
      ;;
    help|-h|--help|"")
      cmd_help
      ;;
    *)
      print_error "Unknown command: $1"
      echo ""
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
