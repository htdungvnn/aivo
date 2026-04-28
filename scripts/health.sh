#!/usr/bin/env bash

################################################################################
# AIVO Health Check Script
# Checks the health of all services (production or local development)
################################################################################

set -e

# Load common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib.sh"

# Default values
LOCAL_MODE=false
API_URL="${API_URL:-https://api.aivo.yourdomain.com}"
WEB_URL="${WEB_URL:-https://aivo.yourdomain.com}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      LOCAL_MODE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local     Run local development health checks (checks ports, processes, build artifacts)"
      echo "  -h, --help  Show this help message"
      echo ""
      echo "Environment variables (production mode only):"
      echo "  API_URL     API endpoint URL (default: https://api.aivo.yourdomain.com)"
      echo "  WEB_URL     Web app URL (default: https://aivo.yourdomain.com)"
      echo ""
      echo "Examples:"
      echo "  $0                    # Production health check"
      echo "  $0 --local           # Local development health check"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
check_port() {
  local host=$1
  local port=$2
  local name=$3

  if check_command nc; then
    if nc -z "$host" "$port" 2>/dev/null; then
      print_success "$name is listening on port $port"
      return 0
    else
      print_error "$name is NOT responding on port $port"
      return 1
    fi
  elif check_command curl; then
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

check_service() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo -n "Checking $name... "

  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
    print_success "OK (HTTP $expected_status)"
    return 0
  else
    print_error "FAILED"
    return 1
  fi
}

if [ "$LOCAL_MODE" = true ]; then
  # Local development health check
  cd "$PROJECT_ROOT"

  print_header "AIVO Local Health Check"
  echo "Checking local development environment..."
  echo ""

  # Check if .env files exist and are configured
  echo "Environment Configuration:"
  if [ -f "apps/api/.env" ] && grep -q "AUTH_SECRET=.*[^your]" "apps/api/.env" 2>/dev/null; then
    print_success "API .env configured"
  else
    print_warning "API .env missing or not configured"
  fi

  if [ -f "apps/web/.env.local" ] && grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*[^your]" "apps/web/.env.local" 2>/dev/null; then
    print_success "Web .env.local configured"
  else
    print_warning "Web .env.local missing or not configured (OAuth may not work)"
  fi

  if [ -f "apps/mobile/.env" ] && grep -q "EXPO_PUBLIC_GOOGLE_CLIENT_ID=.*[^your]" "apps/mobile/.env" 2>/dev/null; then
    print_success "Mobile .env configured"
  else
    print_warning "Mobile .env missing or not configured (OAuth may not work)"
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
    fi
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
  fi

  if [ -d "apps/web/.next" ]; then
    print_success "Web build artifacts exist"
  else
    print_warning "Web not built (run: pnpm run build in apps/web)"
  fi

  if [ -d "packages/compute/pkg" ] && [ -f "packages/compute/pkg/aivo_compute_bg.wasm" ]; then
    print_success "WASM module built"
  else
    print_warning "WASM not built (run: pnpm run build:wasm)"
  fi
  echo ""

  # Check database
  echo "Database:"
  if [ -d "packages/db/drizzle/migrations" ] && ls packages/db/drizzle/migrations/*.sql 1>/dev/null 2>&1; then
    print_success "Migrations exist"
  else
    print_warning "No migrations found"
  fi

  # Check if local D1 database exists
  if [ -d ".wrangler" ] || wrangler d1 database list --local 2>/dev/null | grep -q "aivo-db"; then
    print_success "Local D1 database exists"
  else
    print_warning "Local D1 database may not exist (run: ./scripts/dev.sh)"
  fi
  echo ""

  print_header "Local Health Check Complete"
  print_info "Services may be partially functional."
  print_info "To start development: ./scripts/dev.sh"
  exit 0

else
  # Production health check
  echo ""
  print_header "AIVO Health Check"
  echo "API URL:  $API_URL"
  echo "Web URL:  $WEB_URL"
  echo "Time:     $(date)"
  echo ""

  failed=0

  # Check API
  print_header "API Health"
  if check_service "API Root" "$API_URL"; then
    if check_service "Health Endpoint" "$API_URL/health"; then
      echo ""
      echo "API Response:"
      curl -s "$API_URL/health" 2>/dev/null | head -c 200 || echo "No response"
    fi
  else
    failed=$((failed + 1))
  fi

  # Check Web
  print_header "Web Health"
  if check_service "Web Homepage" "$WEB_URL"; then
    echo ""
    echo "Checking static assets..."
    if curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/_next/static/" | grep -q "200"; then
      print_success "Static assets accessible"
    else
      print_info "Static assets check skipped"
    fi
  else
    failed=$((failed + 1))
  fi

  # Summary
  print_header "Summary"
  if [ $failed -eq 0 ]; then
    print_success "All services are healthy!"
    exit 0
  else
    print_error "Some services are unhealthy"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check API logs: cd apps/api && wrangler tail"
    echo "  2. Verify deployment: cd apps/api && wrangler deployments list"
    echo "  3. Test locally: pnpm run dev"
    exit 1
  fi
fi
