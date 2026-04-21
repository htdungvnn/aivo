#!/usr/bin/env bash

################################################################################
# AIVO Database Migration Script
# Handles database migrations for D1
################################################################################

set -e
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/migration-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

main() {
  log_info "AIVO Database Migration"
  log_info "Project root: $PROJECT_ROOT"

  # Generate migrations from schema changes
  log_info "Generating migrations from schema..."
  cd "$PROJECT_ROOT/packages/db"

  if pnpmx drizzle-kit generate; then
    log_success "Migrations generated"
  else
    log_error "Failed to generate migrations"
    exit 1
  fi

  # List generated migrations
  echo ""
  log_info "Generated migrations:"
  ls -la drizzle/migrations/ 2>/dev/null || echo "No migration files found"

  # Ask if user wants to apply migrations
  echo ""
  read -p "Apply migrations now? (y/N): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Determine environment
    if [ "${1:-}" = "--remote" ] || [ "$ENVIRONMENT" = "production" ]; then
      log_info "Applying migrations to remote (production) database..."
      if pnpm run migrate:remote; then
        log_success "Remote migrations applied"
      else
        log_error "Failed to apply remote migrations"
        exit 1
      fi
    else
      log_info "Applying migrations to local database..."
      if pnpm run migrate:local; then
        log_success "Local migrations applied"
      else
        log_error "Failed to apply local migrations"
        exit 1
      fi
    fi
  else
    log_info "Skipping migration application"
    log_info "To apply later:"
    echo "  Local:  cd packages/db && pnpm run migrate:local"
    echo "  Remote: cd packages/db && pnpm run migrate:remote"
  fi

  log_success "Migration script completed!"
  echo "Log: $LOG_FILE"
}

main "$@"
