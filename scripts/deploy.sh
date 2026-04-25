#!/usr/bin/env bash

################################################################################
# AIVO Monorepo Deployment Script
# Deploys the entire AIVO platform: API (Cloudflare Workers), Web (Next.js), DB migrations
################################################################################

set -e  # Exit on error
set -u  # Error on undefined variable
set -o pipefail  # Pipeline fails on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/deploy-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOY_WEB="${DEPLOY_WEB:-true}"
DEPLOY_API="${DEPLOY_API:-true}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
DRY_RUN="${DRY_RUN:-false}"

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

log_header() {
  echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n" | tee -a "$LOG_FILE"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    return 0
  else
    return 1
  fi
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

  # Check Node.js
  if check_command node; then
    local node_version=$(node --version)
    log_info "Node.js: $node_version"
  else
    missing+=("Node.js")
  fi

  # Check pnpm
  if check_command pnpm; then
    local pnpm_version=$(pnpm --version)
    log_info "pnpm: $pnpm_version"
  else
    missing+=("pnpm")
  fi

  # Check Rust (for WASM build)
  if check_command rustc; then
    local rust_version=$(rustc --version)
    log_info "Rust: $rust_version"
  else
    missing+=("Rust")
  fi

  # Check wasm-pack
  if check_command wasm-pack; then
    local wasm_pack_version=$(wasm-pack --version 2>&1 || wasm-pack --help | head -1)
    log_info "wasm-pack: $wasm_pack_version"
  else
    missing+=("wasm-pack")
  fi

  # Check wrangler
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
  if [ ! -f "$PROJECT_ROOT/packages/aivo-compute/pkg/aivo_compute.js" ]; then
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

  log_success "API built successfully"
}

build_web() {
  log_header "Building Web Application"

  run_command "cd apps/web && pnpm run build" "Building Next.js application"

  # Verify build output
  if [ ! -d "$PROJECT_ROOT/apps/web/.next/standalone" ]; then
    log_error "Web build output not found!"
    return 1
  fi

  log_success "Web application built successfully"
}

apply_migrations() {
  log_header "Applying Database Migrations"

  if [ "$ENVIRONMENT" = "local" ]; then
    run_command "cd packages/db && pnpm run migrate:local" "Applying local migrations"
  else
    run_command "cd packages/db && pnpm run migrate:remote" "Applying production migrations"
  fi

  log_success "Migrations applied"
}

deploy_api() {
  log_header "Deploying API to Cloudflare Workers"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would deploy API to Cloudflare Workers"
    return 0
  fi

  run_command "cd apps/api && pnpm run deploy" "Deploying to Cloudflare Workers"

  # Get deployment info
  if [ -f "$PROJECT_ROOT/apps/api/.wrangler/migration.json" ]; then
    log_info "Deployment completed. Check Cloudflare dashboard for details."
  fi

  log_success "API deployed successfully"
}

run_tests() {
  log_header "Running Tests"

  if [ "$SKIP_TESTS" = "true" ]; then
    log_info "Skipping tests (SKIP_TESTS=true)"
    return 0
  fi

  run_command "pnpm run test" "Running test suite"
}

type_check() {
  log_header "Type Checking"

  run_command "pnpm run type-check" "Running TypeScript type checks"
}

lint() {
  log_header "Linting"

  run_command "pnpm run lint" "Running linter"
}

health_check() {
  log_header "Post-Deployment Health Check"

  if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY RUN] Would run health checks"
    return 0
  fi

  local api_url="${API_URL:-https://api.aivo.yourdomain.com}"

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

  if [ "$DEPLOY_API" = "true" ]; then
    echo -e "${CYAN}  API: Deployed to Cloudflare Workers${NC}"
  fi

  if [ "$DEPLOY_WEB" = "true" ]; then
    echo -e "${CYAN}  Web: Built and ready for deployment${NC}"
  fi

  echo ""
  echo -e "${BOLD}Log file:${NC} $LOG_FILE"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Deploy web app: cd apps/web && pnpm run deploy"
  echo "  2. Verify API: curl $API_URL/health"
  echo "  3. Check logs: cd apps/api && pnpm exec wrangler tail"
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
      --skip-tests)
        SKIP_TESTS=true
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
        shift
        ;;
      --no-api)
        DEPLOY_API=false
        shift
        ;;
      -h|--help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --skip-tests      Skip running tests"
        echo "  --skip-build      Skip build steps (only deploy)"
        echo "  --dry-run         Show what would be done without doing it"
        echo "  --local           Deploy to local development environment"
        echo "  --no-web          Skip web build/deploy"
        echo "  --no-api          Skip API build/deploy"
        echo "  -h, --help        Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  ENVIRONMENT       production|local (default: production)"
        echo "  DEPLOY_WEB        true|false (default: true)"
        echo "  DEPLOY_API        true|false (default: true)"
        echo "  SKIP_TESTS        true|false (default: false)"
        echo "  DRY_RUN           true|false (default: false)"
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

  # Trap errors
  trap 'log_error "Deployment failed at line $LINENO. Check $LOG_FILE for details."' ERR

  # Execute deployment steps
  if [ "$SKIP_BUILD" = "false" ]; then
    check_prerequisites || exit 1
    check_environment_vars || exit 1

    type_check
    lint
    run_tests

    clean_builds
    install_dependencies
    build_wasm
    build_database

    if [ "$DEPLOY_API" = "true" ]; then
      build_api
    fi

    if [ "$DEPLOY_WEB" = "true" ]; then
      build_web
    fi
  fi

  if [ "$DEPLOY_API" = "true" ]; then
    apply_migrations
    deploy_api
  fi

  health_check
  print_summary

  log_success "Deployment script completed!"
}

# Run main function
main "$@"
