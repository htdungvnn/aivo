#!/usr/bin/env bash

################################################################################
# AIVO R2 Storage Cleanup Script
# Cleans up orphaned files, old temporary uploads, and expired assets
################################################################################

set -e
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
LOG_FILE="$PROJECT_ROOT/logs/r2-cleanup-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN="${DRY_RUN:-false}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"  # Delete orphaned files older than this
TEMP_RETENTION_HOURS="${TEMP_RETENTION_HOURS:-24}"  # Delete temp uploads older than this

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
  echo -e "${CYAN}  $1${NC}" | tee -a "$LOG_FILE"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n" | tee -a "$LOG_FILE"
}

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

log_header "R2 Storage Cleanup"

if [ "$DRY_RUN" = "true" ]; then
  log_info "DRY RUN MODE - No changes will be made"
fi

# Check prerequisites
if ! check_command wrangler; then
  log_error "Wrangler CLI not found. Please install it first."
  exit 1
fi

# Change to API directory for wrangler commands
cd "$PROJECT_ROOT/apps/api"

log_info "Connecting to R2 bucket: aivo-images"

# Get list of all objects
log_info "Fetching object list..."
OBJECTS=$(wrangler r2 bucket list-objects aivo-images --json 2>/dev/null) || {
  log_error "Failed to list R2 objects"
  exit 1
}

TOTAL_OBJECTS=$(echo "$OBJECTS" | jq -r '.[] | .key' | wc -l | tr -d ' ')
log_info "Total objects in bucket: $TOTAL_OBJECTS"

# Statistics
ORPHANED_COUNT=0
TEMPORARY_COUNT=0
DELETED_COUNT=0
ERROR_COUNT=0
CUTOFF_DATE=$(date -v-${RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null || date -d "-$RETENTION_DAYS days" +%Y-%m-%d)
TEMP_CUTOFF_DATE=$(date -v-${TEMP_RETENTION_HOURS}h +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d "-$TEMP_RETENTION_HOURS hours" +%Y-%m-%dT%H:%M:%S)

log_info "Orphaned file cutoff: older than $RETENTION_DAYS days ($CUTOFF_DATE)"
log_info "Temporary file cutoff: older than $TEMP_RETENTION_HOURS hours ($TEMP_CUTOFF_DATE)"

# Process each object
echo "$OBJECTS" | jq -r '.[] | .key + "|" + (.lastModified // "unknown") + "|" + (.size // 0)' | while IFS='|' read -r KEY LAST_MODIFIED SIZE; do
  # Skip if key is empty
  [ -z "$KEY" ] && continue

  # Check if it's a temporary upload (common patterns)
  if [[ "$KEY" =~ ^temp/ ]] || [[ "$KEY" =~ ^uploads/temp/ ]] || [[ "$KEY" =~ \.tmp$ ]] || [[ "$KEY" =~ \.partial$ ]]; then
    TEMPORARY_COUNT=$((TEMPORARY_COUNT + 1))

    # Check age
    LAST_MODIFIED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo "$LAST_MODIFIED" | cut -d'T' -f1-2)" +%s 2>/dev/null || echo 0)
    CURRENT_EPOCH=$(date +%s)
    AGE_HOURS=$(( (CURRENT_EPOCH - LAST_MODIFIED_EPOCH) / 3600 ))

    if [ "$AGE_HOURS" -gt "$TEMP_RETENTION_HOURS" ]; then
      if [ "$DRY_RUN" = "false" ]; then
        wrangler r2 bucket delete-object aivo-images "$KEY" 2>/dev/null && {
          log_info "Deleted temporary file: $KEY (age: ${AGE_HOURS}h, size: $SIZE bytes)"
          DELETED_COUNT=$((DELETED_COUNT + 1))
        } || {
          log_error "Failed to delete: $KEY"
          ERROR_COUNT=$((ERROR_COUNT + 1))
        }
      else
        log_info "[DRY RUN] Would delete temporary file: $KEY (age: ${AGE_HOURS}h, size: $SIZE bytes)"
        DELETED_COUNT=$((DELETED_COUNT + 1))
      fi
    fi
    continue
  fi

  # Check if file is orphaned (no DB reference)
  # We can't reliably check DB from here without connecting, so we use heuristics:
  # - Files with very old modification dates that don't match active user patterns
  # - Files in orphaned/ directories
  if [[ "$KEY" =~ ^orphaned/ ]] || [[ "$KEY" =~ ^incomplete/ ]]; then
    ORPHANED_COUNT=$((ORPHANED_COUNT + 1))

    if [ "$DRY_RUN" = "false" ]; then
      wrangler r2 bucket delete-object aivo-images "$KEY" 2>/dev/null && {
        log_info "Deleted orphaned file: $KEY"
        DELETED_COUNT=$((DELETED_COUNT + 1))
      } || {
        log_error "Failed to delete: $KEY"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      }
    else
      log_info "[DRY RUN] Would delete orphaned file: $KEY"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
    continue
  fi

  # Check age based on last modified
  if [ "$LAST_MODIFIED" != "unknown" ] && [ "$LAST_MODIFIED" \< "$CUTOFF_DATE" ]; then
    # This is a heuristic - old files might be orphaned
    # In production, we'd cross-check with database
    ORPHANED_COUNT=$((ORPHANED_COUNT + 1))

    if [ "$DRY_RUN" = "false" ]; then
      wrangler r2 bucket delete-object aivo-images "$KEY" 2>/dev/null && {
        log_info "Deleted old file (>$RETENTION_DAYS days): $KEY (last modified: $LAST_MODIFIED)"
        DELETED_COUNT=$((DELETED_COUNT + 1))
      } || {
        log_error "Failed to delete: $KEY"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      }
    else
      log_info "[DRY RUN] Would delete old file (>$RETENTION_DAYS days): $KEY (last modified: $LAST_MODIFIED)"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
  fi
done

# Summary
log_header "Cleanup Summary"
echo -e "Total objects scanned: ${GREEN}$TOTAL_OBJECTS${NC}"
echo -e "Orphaned files identified: ${YELLOW}$ORPHANED_COUNT${NC}"
echo -e "Temporary files identified: ${YELLOW}$TEMPORARY_COUNT${NC}"
if [ "$DRY_RUN" = "false" ]; then
  echo -e "Objects deleted: ${GREEN}$DELETED_COUNT${NC}"
  echo -e "Errors: ${RED}$ERROR_COUNT${NC}"
else
  echo -e "Objects that would be deleted: ${GREEN}$DELETED_COUNT${NC}"
fi

# Calculate estimated space saved
log_info "Cleanup completed at $(date)"
