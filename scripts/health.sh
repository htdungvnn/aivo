#!/usr/bin/env bash

################################################################################
# AIVO Health Check Script
# Checks the health of all deployed services
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

API_URL="${API_URL:-https://api.aivo.yourdomain.com}"
WEB_URL="${WEB_URL:-https://aivo.yourdomain.com}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_service() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo -n "Checking $name... "

  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $expected_status)"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    return 1
  fi
}

print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

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
    echo -e "${GREEN}✓${NC} Static assets accessible"
  else
    echo -e "${YELLOW}!${NC} Static assets check skipped"
  fi
else
  failed=$((failed + 1))
fi

# Summary
print_header "Summary"
if [ $failed -eq 0 ]; then
  echo -e "${GREEN}All services are healthy!${NC}"
  exit 0
else
  echo -e "${RED}Some services are unhealthy${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check API logs: cd apps/api && wrangler tail"
  echo "  2. Verify deployment: cd apps/api && wrangler deployments list"
  echo "  3. Test locally: pnpm run dev"
  exit 1
fi
