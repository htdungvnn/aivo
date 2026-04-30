#!/usr/bin/env bash

################################################################################
# AIVO API Smoke Tests
# Runs critical endpoint tests against a deployed API instance
################################################################################

set -e
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
API_URL="${API_URL:-http://localhost:8787}"
TIMEOUT="${TIMEOUT:-10}"  # seconds per request
VERBOSE="${VERBOSE:-false}"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Test result tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test a single endpoint
test_endpoint() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local body="${4:-}"
  local content_type="${5:-application/json}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$VERBOSE" = "true" ]; then
    log_info "Testing: $method $path"
  fi

  # Build curl command
  local curl_cmd="curl -s -w '\n%{http_code}' -X $method -H 'Content-Type: $content_type'"
  if [ -n "$body" ]; then
    curl_cmd="$curl_cmd -d '$body'"
  fi
  curl_cmd="$curl_cmd --max-time $TIMEOUT '$API_URL$path'"

  # Execute request
  local response
  response=$(eval "$curl_cmd" 2>/dev/null || echo "000\n")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "$method $path -> $http_code"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log_error "$method $path -> Expected $expected_status, got $http_code"
    if [ "$VERBOSE" = "true" ] && [ -n "$body" ]; then
      echo "  Response: $body" >&2
    fi
    return 1
  fi
}

# Wait for API to be ready
wait_for_api() {
  log_info "Waiting for API to be ready at $API_URL/health..."

  local max_attempts=30
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if curl -s -f --max-time 5 "$API_URL/health" > /dev/null 2>&1; then
      log_success "API is ready!"
      return 0
    fi

    log_info "Attempt $attempt/$max_attempts: API not ready, waiting 2s..."
    sleep 2
    attempt=$((attempt + 1))
  done

  log_error "API failed to become ready after $max_attempts attempts"
  return 1
}

# Main test suite
main() {
  log_header "AIVO API Smoke Tests"
  log_info "Target: $API_URL"
  log_info "Timeout: ${TIMEOUT}s per request"

  # Wait for API
  if ! wait_for_api; then
    log_error "Smoke tests aborted: API not ready"
    exit 1
  fi

  log_header "Running Critical Endpoint Tests"

  # 1. Health check
  test_endpoint "GET" "/health" "200"

  # 2. API root/info
  test_endpoint "GET" "/" "200" || test_endpoint "GET" "/api" "200"

  # 3. Swagger docs (if enabled) - in production with auth it returns 404 for unauthenticated
  if [ "$API_URL" != "http://localhost:8787" ]; then
    # Swagger might be disabled/protected in production - expect 404 or 200
    if test_endpoint "GET" "/docs" "200" || test_endpoint "GET" "/docs" "404"; then
      log_success "Swagger docs accessibility check passed (200 or 404)"
    else
      log_warning "Swagger docs not accessible (unexpected response)"
    fi
  else
    test_endpoint "GET" "/docs" "200" || log_warning "Swagger docs not accessible (may be disabled)"
  fi

  # 4. Auth endpoint (without valid token - should return 401 Unauthorized, or 503 if provider not configured)

  # Google OAuth
  local google_status
  google_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"token":"test-token"}' "$API_URL/api/auth/google")
  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$google_status" = "401" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "POST /api/auth/google -> 401"
  elif [ "$google_status" = "503" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "POST /api/auth/google -> 503 (not configured - acceptable)"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log_error "POST /api/auth/google -> Expected 401 or 503, got $google_status"
  fi

  # Facebook OAuth
  local facebook_status
  facebook_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"token":"test-token"}' "$API_URL/api/auth/facebook")
  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$facebook_status" = "401" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "POST /api/auth/facebook -> 401"
  elif [ "$facebook_status" = "503" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "POST /api/auth/facebook -> 503 (not configured - acceptable)"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log_error "POST /api/auth/facebook -> Expected 401 or 503, got $facebook_status"
  fi

  # 5. Users endpoint (without auth - should return 401)
  test_endpoint "GET" "/api/users/me" "401"

  # 6. Test database connectivity via health check details
  log_info "Checking health response for database status..."
  local health_response
  health_response=$(curl -s --max-time $TIMEOUT "$API_URL/health")
  if echo "$health_response" | grep -q '"database"'; then
    log_success "Health response includes database status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "Health response missing database status"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # 7. Check KV caches
  if echo "$health_response" | grep -q '"caches"'; then
    log_success "Health response includes cache status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "Health response missing cache status"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # 8. Check R2 storage
  if echo "$health_response" | grep -q '"storage"'; then
    log_success "Health response includes storage status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "Health response missing storage status"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Summary
  log_header "Smoke Test Summary"
  echo -e "Tests run: ${CYAN}$TESTS_RUN${NC}"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

  if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All smoke tests passed!"
    return 0
  else
    log_error "Some smoke tests failed"
    return 1
  fi
}

# Run main
main "$@"
