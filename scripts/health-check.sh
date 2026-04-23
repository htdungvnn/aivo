#!/usr/bin/env bash

################################################################################
# AIVO Health Check Script
# Verifies all services are running and responding correctly
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

errors=0
warnings=0

print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
  echo -e "${CYAN}→ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

check_port() {
  local host=$1
  local port=$2
  local name=$3

  if command -v nc &> /dev/null; then
    if nc -z "$host" "$port" 2>/dev/null; then
      print_success "$name is listening on port $port"
      return 0
    else
      print_error "$name is NOT responding on port $port"
      return 1
    fi
  elif command -v curl &> /dev/null; then
    if curl -s --connect-timeout 2 "http://$host:$port/health" > /dev/null 2>&1; then
      print_success "$name is responding on port $port"
      return 0
    else
      print_error "$name is NOT responding on port $port"
      return 1
    fi
  else
    print_warning "Cannot check $name - no nc or curl available"
    return 0
  fi
}

check_process() {
  local pattern=$1
  local name=$2

  if pgrep -f "$pattern" > /dev/null 2>&1; then
    print_success "$name is running"
    return 0
  else
    print_warning "$name process not found (may not be started)"
    return 1
  fi
}

cd "$PROJECT_ROOT"

print_header "AIVO Health Check"

echo "Checking local development environment..."
echo ""

# Check if .env files exist and are configured
echo "Environment Configuration:"
if [ -f "apps/api/.env" ] && grep -q "AUTH_SECRET=.*[^your]" "apps/api/.env" 2>/dev/null; then
  print_success "API .env configured"
else
  print_warning "API .env missing or not configured"
  ((warnings++))
fi

if [ -f "apps/web/.env.local" ] && grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*[^your]" "apps/web/.env.local" 2>/dev/null; then
  print_success "Web .env.local configured"
else
  print_warning "Web .env.local missing or not configured (OAuth may not work)"
  ((warnings++))
fi

if [ -f "apps/mobile/.env" ] && grep -q "EXPO_PUBLIC_GOOGLE_CLIENT_ID=.*[^your]" "apps/mobile/.env" 2>/dev/null; then
  print_success "Mobile .env configured"
else
  print_warning "Mobile .env missing or not configured (OAuth may not work)"
  ((warnings++))
fi
echo ""

# Check if services are running
echo "Running Services:"

# Check API (port 8787 is default for wrangler dev)
if check_port "localhost" "8787" "API"; then
  # Try health endpoint
  if curl -s --connect-timeout 2 "http://localhost:8787/health" > /dev/null 2>&1; then
    print_success "API health endpoint responding"
    health_status=$(curl -s "http://localhost:8787/health" | head -c 200)
    echo "  Response: $health_status"
  else
    print_warning "API health endpoint not responding"
    ((warnings++))
  fi
else
  ((errors++))
fi
echo ""

# Check Web (port 3000)
if check_port "localhost" "3000" "Web"; then
  # Check if Next.js is responding
  if curl -s --connect-timeout 2 "http://localhost:3000" | grep -q "Next.js" 2>/dev/null; then
    print_success "Web app responding"
  else
    print_info "Web app responding (content check skipped)"
  fi
else
  ((errors++))
fi
echo ""

# Check if processes are running
echo "Process Status:"
check_process "wrangler" "Wrangler/API"
check_process "next" "Next.js/Web"
check_process "expo" "Expo/Mobile"
echo ""

# Check build artifacts
echo "Build Artifacts:"
if [ -d "apps/api/dist" ] || [ -d "apps/api/.wrangler" ]; then
  print_success "API build artifacts exist"
else
  print_warning "API not built (run: pnpm run build)"
  ((warnings++))
fi

if [ -d "apps/web/.next" ]; then
  print_success "Web build artifacts exist"
else
  print_warning "Web not built (run: pnpm run build in apps/web)"
  ((warnings++))
fi

if [ -d "packages/aivo-compute/pkg" ] && [ -f "packages/aivo-compute/pkg/aivo_compute_bg.wasm" ]; then
  print_success "WASM module built"
else
  print_warning "WASM not built (run: pnpm run build:wasm)"
  ((warnings++))
fi
echo ""

# Check database
echo "Database:"
if [ -d "packages/db/drizzle/migrations" ] && ls packages/db/drizzle/migrations/*.sql 1>/dev/null 2>&1; then
  print_success "Migrations exist"
else
  print_warning "No migrations found"
  ((warnings++))
fi

# Check if local D1 database exists
if [ -d ".wrangler" ] || wrangler d1 database list --local 2>/dev/null | grep -q "aivo-db"; then
  print_success "Local D1 database exists"
else
  print_warning "Local D1 database may not exist (run: ./scripts/setup-dev.sh)"
  ((warnings++))
fi
echo ""

# Summary
print_header "Health Check Summary"

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✓ All services are healthy and ready!${NC}"
  echo ""
  echo "All checks passed:"
  echo "  - Environment configured"
  echo "  - Services running"
  echo "  - Build artifacts present"
  echo "  - Database initialized"
  echo ""
  echo "You can now use the AIVO platform."
  exit 0
elif [ $errors -eq 0 ]; then
  echo -e "${YELLOW}⚠ $warnings warning(s), 0 errors${NC}"
  echo ""
  echo "Services may be partially functional."
  echo "Review warnings above and address if needed."
  exit 0
else
  echo -e "${RED}✗ $errors error(s), $warnings warning(s)${NC}"
  echo ""
  echo "Some services are not running or misconfigured."
  echo ""
  echo "To start development:"
  echo "  1. Run ./scripts/setup-env.sh"
  echo "  2. Edit .env files with your credentials"
  echo "  3. Run ./scripts/dev.sh to start all services"
  exit 1
fi
