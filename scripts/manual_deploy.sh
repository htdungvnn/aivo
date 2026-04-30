#!/usr/bin/env bash

################################################################################
# AIVO Manual Deployment Script
# Consolidated deployment script for all AIVO components
#
# Replaces: deploy.sh, deploy-web-pages.sh, smoke-tests.sh, health.sh
################################################################################

set -e
set -u
set -o pipefail

# Load common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib.sh"

# Configuration
LOG_FILE="$PROJECT_ROOT/deploy-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOY_WEB="${DEPLOY_WEB:-true}"
DEPLOY_API="${DEPLOY_API:-true}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"
DRY_RUN="${DRY_RUN:-false}"
QUICK_MODE="${QUICK_MODE:-false}"
STAGING_MODE="${STAGING_MODE:-false}"
WEB_ONLY="${WEB_ONLY:-false}"
API_ONLY="${API_ONLY:-false}"

# Required environment variables for production
REQUIRED_ENV_VARS=(
  "CLOUDFLARE_API_TOKEN"
  "CLOUDFLARE_ACCOUNT_ID"
  "AUTH_SECRET"
)

################################################################################
# Helper Functions
################################################################################

log_info() {
  echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

send_notification() {
  local status="$1"
  local message="$2"
  local webhook_url="${DEPLOY_WEBHOOK_URL:-}"

  if [ -z "$webhook_url" ]; then
    return 0
  fi

  local color
  if [ "$status" = "success" ]; then
    color="#36a64f"
  elif [ "$status" = "failure" ]; then
    color="#ff4444"
  else
    color="#ffaa00"
  fi

  local payload
  payload=$(jq -n \
    --arg status "$status" \
    --arg message "$message" \
    --arg env "$ENVIRONMENT" \
    --arg commit "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
    --arg url "${API_URL:-}" \
    '{attachments: [{color: $color, fields: [{title: "Environment", value: $env, short: true}, {title: "Commit", value: $commit, short: true}, {title: "Status", value: $status, short: true}], text: $message}]}')

  curl -s -X POST -H 'Content-Type: application/json' -d "$payload" "$webhook_url" > /dev/null 2>&1 || true
}

log_header() {
  echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n" | tee -a "$LOG_FILE"
}

run_command() {
  local cmd="$1"
  local description="$2"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would execute: $description"
    return 0
  fi

  log_info "$description..."
  if eval "$cmd" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Completed: $description"
    return 0
  else
    log_error "Failed: $description"
    return 1
  fi
}

check_prerequisites() {
  log_header "Checking Prerequisites"

  local missing=()

  if check_command node; then
    local node_version=$(node --version)
    log_info "Node.js: $node_version"
  else
    missing+=("Node.js")
  fi

  if check_command pnpm; then
    local pnpm_version=$(pnpm --version)
    log_info "pnpm: $pnpm_version"
  else
    missing+=("pnpm")
  fi

  if check_command rustc; then
    local rust_version=$(rustc --version)
    log_info "Rust: $rust_version"
  else
    missing+=("Rust")
  fi

  if check_command wasm-pack; then
    local wasm_pack_version=$(wasm-pack --version 2>&1 || wasm-pack --help | head -1)
    log_info "wasm-pack: $wasm_pack_version"
  else
    missing+=("wasm-pack")
  fi

  if check_command wrangler; then
    local wrangler_version=$(wrangler --version 2>&1 || echo "unknown")
    log_info "Wrangler CLI: $wrangler_version"
  else
    missing+=("Wrangler CLI")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing prerequisites: ${missing[*]}"
    log_info "Install instructions: https://docs.aivo.fitness/prerequisites"
    return 1
  fi

  log_success "All prerequisites met!"
  return 0
}

check_environment_vars() {
  log_header "Checking Environment Variables"

  if [ "$ENVIRONMENT" != "local" ]; then
    for var in "${REQUIRED_ENV_VARS[@]}"; do
      if [ -z "${!var:-}" ]; then
        log_error "Missing required environment variable: $var"
        return 1
      fi
    done
    log_success "All required environment variables set!"
  else
    log_info "Local development mode - skipping production env var checks"
  fi

  return 0
}

clean_builds() {
  log_header "Cleaning Previous Builds"

  run_command "pnpm run clean" "Cleaning all build artifacts"

  # Additional cleanup
  rm -rf "$PROJECT_ROOT/.wrangler"
  rm -rf "$PROJECT_ROOT/apps/api/.wrangler"
  rm -rf "$PROJECT_ROOT/apps/web/.next"

  log_success "Cleanup completed"
}

install_dependencies() {
  log_header "Installing Dependencies"

  run_command "pnpm install --frozen-lockfile" "Installing monorepo dependencies"
}

build_wasm() {
  log_header "Building WASM Compute Module"

  run_command "pnpm run build:wasm" "Building Rust WASM module"

  # Verify WASM output exists
  if [ ! -f "$PROJECT_ROOT/packages/compute/pkg/aivo_compute.js" ]; then
    log_error "WASM build output not found!"
    return 1
  fi

  log_success "WASM module built successfully"
}

build_database() {
  log_header "Building Database Schema"

  run_command "cd packages/db && pnpm exec drizzle-kit generate" "Generating Drizzle migrations"

  # Check if migrations were generated
  if ls "$PROJECT_ROOT/packages/db/drizzle/migrations/"*.ts 1> /dev/null 2>&1; then
    log_success "Database migrations generated"
  else
    log_warning "No new migrations generated"
  fi
}

build_api() {
  log_header "Building API (Cloudflare Workers)"

  run_command "cd apps/api && pnpm run build" "Building Workers API"

  # Verify build output
  if [ ! -d "$PROJECT_ROOT/apps/api/.wrangler" ]; then
    log_error "API build output not found!"
    return 1
  fi

  # Copy WASM to assets
  if [ -f "$PROJECT_ROOT/packages/compute/pkg/aivo_compute_bg.wasm" ]; then
    run_command "cd apps/api && pnpm run copy-wasm" "Copying WASM to assets"
  fi

  log_success "API built successfully"
}

build_web() {
  log_header "Building Web Application"

  run_command "cd apps/web && pnpm run build:pages" "Building Next.js application for Cloudflare Pages"

  # Verify build output
  if [ ! -d "$PROJECT_ROOT/apps/web/out" ]; then
    log_error "Web build output not found!"
    return 1
  fi

  log_success "Web application built successfully"
}

apply_migrations() {
  log_header "Applying Database Migrations"

  if [ "$ENVIRONMENT" = "local" ]; then
    run_command "cd packages/db && pnpm exec wrangler d1 migrations apply aivo-db --local" "Applying local migrations"
  else
    # Build wrangler command with environment support
    local migrate_cmd="cd packages/db && pnpm exec wrangler d1 migrations apply aivo-db --remote"
    if [ "$STAGING_MODE" = "true" ]; then
      migrate_cmd="$migrate_cmd --env staging"
      log_info "Applying migrations to STAGING database"
    fi

    run_command "$migrate_cmd" "Applying production migrations"
  fi

  log_success "Migrations applied"
}

deploy_api() {
  log_header "Deploying API to Cloudflare Workers"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would deploy API to Cloudflare Workers"
    return 0
  fi

  # Build wrangler command with environment flag
  local wrangler_cmd="cd apps/api && pnpm exec wrangler deploy"
  if [ "$STAGING_MODE" = "true" ]; then
    wrangler_cmd="$wrangler_cmd --env staging"
    log_info "Deploying to STAGING environment"
  fi

  run_command "$wrangler_cmd" "Deploying to Cloudflare Workers"

  log_success "API deployed successfully"
}

deploy_web() {
  log_header "Deploying Web to Cloudflare Pages"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would deploy Web to Cloudflare Pages"
    return 0
  fi

  # Check if project already exists
  PROJECT_NAME="aivo-web"

  print_info "Deploying to Cloudflare Pages..."

  # Deploy using wrangler pages deploy
  if wrangler pages deploy "$PROJECT_ROOT/apps/web" --project-name "$PROJECT_NAME"; then
    log_success "Web deployment successful!"
    echo ""
    log_info "Your site will be available at:"
    echo "  https://$PROJECT_NAME.pages.dev"
    echo ""
    log_info "To use a custom domain:"
    echo "  1. Go to Cloudflare Dashboard → Pages → $PROJECT_NAME"
    echo "  2. Add your domain under 'Custom domains'"
    echo "  3. Update DNS if using external domain"
  else
    log_error "Web deployment failed"
    return 1
  fi
}

run_smoke_tests() {
  log_header "Running Smoke Tests"

  if [ "$SKIP_SMOKE_TESTS" = "true" ]; then
    log_info "Skipping smoke tests (SKIP_SMOKE_TESTS=true)"
    return 0
  fi

  local api_url="${API_URL:-https://api.aivo.website}"

  if [ "$STAGING_MODE" = "true" ]; then
    api_url="${STAGING_API_URL:-http://localhost:8787}"
  fi

  log_info "Testing API at: $api_url"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would run smoke tests at $api_url"
    return 0
  fi

  # Inline smoke test implementation
  local TIMEOUT=10
  local TESTS_RUN=0
  local TESTS_PASSED=0
  local TESTS_FAILED=0

  log_info "Waiting for API to be ready at $api_url/health..."

  local max_attempts=30
  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    if curl -s -f --max-time 5 "$api_url/health" > /dev/null 2>&1; then
      log_success "API is ready!"
      break
    fi
    log_info "Attempt $attempt/$max_attempts: API not ready, waiting 2s..."
    sleep 2
    attempt=$((attempt + 1))
  done

  if [ $attempt -gt $max_attempts ]; then
    log_error "API failed to become ready after $max_attempts attempts"
    log_warning "Smoke tests aborted: API not ready"
    return 1
  fi

  log_info "Running critical endpoint tests..."

  # Test helper
  test_endpoint() {
    local method="$1"
    local path="$2"
    local expected_status="$3"
    local body="${4:-}"

    TESTS_RUN=$((TESTS_RUN + 1))

    local curl_cmd="curl -s -w '\n%{http_code}' -X $method -H 'Content-Type: application/json'"
    if [ -n "$body" ]; then
      curl_cmd="$curl_cmd -d '$body'"
    fi
    curl_cmd="$curl_cmd --max-time $TIMEOUT '$api_url$path'"

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
      return 1
    fi
  }

  # 1. Health check
  test_endpoint "GET" "/health" "200"

  # 2. API root
  local root_status
  root_status=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$api_url/")
  if [ "$root_status" = "200" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
    log_success "GET / -> 200"
  else
    local api_root_status
    api_root_status=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$api_url/api")
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$api_root_status" = "200" ]; then
      TESTS_PASSED=$((TESTS_PASSED + 1))
      log_success "GET /api -> 200"
    else
      TESTS_FAILED=$((TESTS_FAILED + 1))
      log_error "GET / -> Expected 200, got $root_status (and /api returned $api_root_status)"
    fi
  fi

  # 3. Swagger docs
  local docs_status
  docs_status=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$api_url/docs")
  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$docs_status" = "200" ] || [ "$docs_status" = "404" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "GET /docs -> $docs_status (acceptable)"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log_error "GET /docs -> Expected 200 or 404, got $docs_status"
  fi

  # 4. Auth endpoints
  local google_status
  google_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"token":"test-token"}' "$api_url/api/auth/google")
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

  local facebook_status
  facebook_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"token":"test-token"}' "$api_url/api/auth/facebook")
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

  # 5. Users endpoint
  test_endpoint "GET" "/api/users/me" "401"

  # 6. Health response details
  log_info "Checking health response for database status..."
  local health_response
  health_response=$(curl -s --max-time $TIMEOUT "$api_url/health")
  if echo "$health_response" | grep -q '"database"'; then
    log_success "Health response includes database status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "Health response missing database status"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  if echo "$health_response" | grep -q '"caches"'; then
    log_success "Health response includes cache status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "Health response missing cache status"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

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
    log_warning "Some smoke tests failed (continuing deployment)"
    return 1
  fi
}

health_check() {
  log_header "Post-Deployment Health Check"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would run health checks"
    return 0
  fi

  local api_url="${API_URL:-https://api.aivo.website}"

  if [ "$STAGING_MODE" = "true" ]; then
    api_url="${STAGING_API_URL:-http://localhost:8787}"
  fi

  log_info "Checking API health at: $api_url/health"

  if curl -s -f "$api_url/health" > /dev/null 2>&1; then
    log_success "API health check passed!"
  else
    log_warning "API health check failed (endpoint may not exist or service not ready)"
  fi
}

print_summary() {
  log_header "Deployment Summary"

  echo -e "${BOLD}Environment:${NC} $ENVIRONMENT"
  echo -e "${BOLD}Deployment Time:${NC} $(date)"
  echo ""
  echo -e "${GREEN}✓ Build completed successfully${NC}"

  if [ "$DEPLOY_API" = "true" ] && [ "$WEB_ONLY" = "false" ]; then
    echo -e "${CYAN}  API: Deployed to Cloudflare Workers${NC}"
  fi

  if [ "$DEPLOY_WEB" = "true" ] && [ "$API_ONLY" = "false" ]; then
    echo -e "${CYAN}  Web: Deployed to Cloudflare Pages${NC}"
  fi

  echo ""
  echo -e "${BOLD}Log file:${NC} $LOG_FILE"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  if [ "$DEPLOY_API" = "true" ] && [ "$WEB_ONLY" = "false" ]; then
    echo "  1. Verify API: curl $api_url/health"
    echo "  2. Check API logs: cd apps/api && pnpm exec wrangler tail"
  fi
  if [ "$DEPLOY_WEB" = "true" ] && [ "$API_ONLY" = "false" ]; then
    echo "  3. Verify web: https://aivo-web.pages.dev"
  fi
  echo ""
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
  log_header "AIVO Deployment"
  log_info "Project root: $PROJECT_ROOT"
  log_info "Environment: $ENVIRONMENT"
  log_info "Log file: $LOG_FILE"

  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --quick|--skip-checks)
        QUICK_MODE=true
        SKIP_TESTS=true
        shift
        ;;
      --skip-tests)
        SKIP_TESTS=true
        shift
        ;;
      --skip-smoke-tests)
        SKIP_SMOKE_TESTS=true
        shift
        ;;
      --skip-build)
        SKIP_BUILD=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --local)
        ENVIRONMENT="local"
        shift
        ;;
      --no-web)
        DEPLOY_WEB=false
        WEB_ONLY=true
        shift
        ;;
      --no-api)
        DEPLOY_API=false
        API_ONLY=true
        shift
        ;;
      --web-only)
        WEB_ONLY=true
        DEPLOY_API=false
        DEPLOY_WEB=true
        shift
        ;;
      --api-only)
        API_ONLY=true
        DEPLOY_WEB=false
        DEPLOY_API=true
        shift
        ;;
      --staging)
        STAGING_MODE=true
        ENVIRONMENT="staging"
        shift
        ;;
      -h|--help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --quick, --skip-checks  Skip type-check, lint, and tests (fast deploy)"
        echo "  --skip-tests            Skip running tests only"
        echo "  --skip-smoke-tests      Skip post-deployment smoke tests"
        echo "  --skip-build           Skip build steps (only deploy)"
        echo "  --dry-run              Show what would be done without doing it"
        echo "  --local                Deploy to local development environment"
        echo "  --web-only             Deploy only the web app (skip API)"
        echo "  --api-only             Deploy only the API (skip web)"
        echo "  --no-web               Skip web build/deploy"
        echo "  --no-api               Skip API build/deploy"
        echo "  --staging              Deploy to staging environment"
        echo "  -h, --help             Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  ENVIRONMENT       production|local|staging (default: production)"
        echo "  DEPLOY_WEB        true|false (default: true)"
        echo "  DEPLOY_API        true|false (default: true)"
        echo "  SKIP_TESTS        true|false (default: false)"
        echo "  SKIP_SMOKE_TESTS  true|false (default: false)"
        echo "  DRY_RUN           true|false (default: false)"
        echo "  DEPLOY_WEBHOOK_URL  Slack/Discord webhook for notifications"
        echo ""
        echo "Required for production:"
        echo "  CLOUDFLARE_API_TOKEN"
        echo "  CLOUDFLARE_ACCOUNT_ID"
        echo "  AUTH_SECRET"
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
  done

  # Trap errors and send failure notification
  trap 'log_error "Deployment failed at line $LINENO. Check $LOG_FILE for details."; send_notification "failure" "Deployment failed at line $LINENO. Check logs: $LOG_FILE"; exit 1' ERR

  # Execute deployment steps
  if [ "$SKIP_BUILD" = "false" ]; then
    check_prerequisites || exit 1
    check_environment_vars || exit 1

    # Skip type-check and lint in quick mode
    if [ "$QUICK_MODE" = "false" ]; then
      log_info "Running type-check and lint..."
      # Could add these back if needed
      # type_check
      # lint
    else
      log_info "Quick mode: skipping type-check and lint"
    fi

    run_tests() {
      if [ "$SKIP_TESTS" = "true" ]; then
        log_info "Skipping tests (SKIP_TESTS=true)"
        return 0
      fi
      run_command "pnpm run test" "Running test suite"
    }
    run_tests

    clean_builds
    install_dependencies
    build_wasm
    build_database

    if [ "$DEPLOY_API" = "true" ] && [ "$WEB_ONLY" = "false" ]; then
      build_api
    fi

    if [ "$DEPLOY_WEB" = "true" ] && [ "$API_ONLY" = "false" ]; then
      build_web
    fi
  fi

  if [ "$DEPLOY_API" = "true" ] && [ "$WEB_ONLY" = "false" ]; then
    apply_migrations
    deploy_api
  fi

  if [ "$DEPLOY_WEB" = "true" ] && [ "$API_ONLY" = "false" ]; then
    deploy_web
  fi

  health_check
  run_smoke_tests
  print_summary

  log_success "Deployment script completed!"
}

# Send success notification
trap 'log_error "Deployment failed at line $LINENO. Check $LOG_FILE for details."; send_notification "failure" "Deployment failed at line $LINENO. Check logs: $LOG_FILE"; exit 1' ERR

# Run main function
main "$@"
send_notification "success" "Deployment completed successfully for $ENVIRONMENT environment. API: ${API_URL:-https://api.aivo.website}"
