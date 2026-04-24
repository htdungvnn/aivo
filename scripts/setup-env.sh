#!/usr/bin/env bash

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

cd "$PROJECT_ROOT"

print_header "AIVO Environment Setup"

# Check if central .env.base exists in .env/ folder
ENV_BASE=".env/.env.base"
if [ ! -f "$ENV_BASE" ]; then
  print_error "Central .env/.env.base file not found!"
  print_info "Please create .env/.env.base from the template first."
  exit 1
fi

# Function to extract section from .env file and write to target
extract_section() {
  local target=$1
  local start_pattern=$2  # Pattern that marks the beginning of section
  local end_pattern=$3    # Pattern that marks the end of section
  local in_section=0

  # Create or truncate target file
  > "$target"

  while IFS= read -r line; do
    # Check if we're entering the section
    if [[ "$line" == *"$start_pattern"* ]] && [ $in_section -eq 0 ]; then
      in_section=1
      echo "# Auto-generated from $ENV_BASE - $(date)" > "$target"
      echo "" >> "$target"
      continue
    fi

    # Check if we're exiting the section (next section header or end marker)
    if [ $in_section -eq 1 ] && [[ "$line" == *"$end_pattern"* ]]; then
      break
    fi

    # Write lines if we're in the section
    # Skip empty lines and comment lines (starting with #)
    if [ $in_section -eq 1 ] && [[ -n "$line" ]] && [[ ! "$line" =~ ^[[:space:]]*# ]]; then
      # Extract only the variable assignment (remove any leading/trailing whitespace)
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
# API: from "CLOUDFLARE WORKERS API" to "WEB APP - NEXT.JS"
extract_section "apps/api/.env" "CLOUDFLARE WORKERS API" "WEB APP - NEXT.JS"
# Web: from "WEB APP - NEXT.JS" to "MOBILE APP - EXPO"
extract_section "apps/web/.env.local" "WEB APP - NEXT.JS" "MOBILE APP - EXPO"
# Mobile: from "MOBILE APP - EXPO" to end of file (no end pattern, so it will capture everything until end)
extract_section "apps/mobile/.env" "MOBILE APP - EXPO" "EOF_MARKER"

# Also copy .env/.env.base to .env/.env.example for reference (remove secrets first)
if [ ! -f ".env/.env.example" ]; then
  # Create example file by removing secret values
  sed 's/=.*$/=your_value_here/' "$ENV_BASE" > ".env/.env.example"
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

print_header "Production Deployment (Cloudflare)"
echo "Set secrets for Cloudflare Workers:"
echo "   cd apps/api"
echo "   wrangler secret put AUTH_SECRET"
echo ""
echo "Set environment variables in Cloudflare Dashboard:"
echo "   - GOOGLE_CLIENT_ID"
echo "   - FACEBOOK_APP_ID"
echo "   - OPENAI_API_KEY (optional)"
echo "   - GEMINI_API_KEY (optional)"

print_header "Quick Start"
echo "API: cd apps/api && pnpmx wrangler dev"
echo "Web: cd apps/web && pnpm run dev"
echo "Mobile: cd apps/mobile && pnpmx expo start"
print_success "Environment setup complete!"

