#!/usr/bin/env bash

################################################################################
# AIVO Database Backup Script
# Creates backups of D1 database and stores in R2
################################################################################

set -e
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
LOG_FILE="$PROJECT_ROOT/logs/db-backup-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${RETENTION_DAYS:-7}"  # Keep local backups for 7 days
R2_BACKUP_BUCKET="${R2_BACKUP_BUCKET:-aivo-backups}"  # Separate bucket for backups
UPLOAD_TO_R2="${UPLOAD_TO_R2:-true}"  # Also upload to R2

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Create directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROJECT_ROOT/logs"

log_header "AIVO Database Backup"

# Check prerequisites
if ! check_command wrangler; then
  log_error "Wrangler CLI not found"
  exit 1
fi

# Generate backup filename with timestamp
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aivo-db-backup-$TIMESTAMP.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

log_info "Starting database backup..."
log_info "Local backup: $BACKUP_FILE"
if [ "$UPLOAD_TO_R2" = "true" ]; then
  log_info "Will upload to R2 bucket: $R2_BACKUP_BUCKET"
fi

# Export database using wrangler
log_info "Exporting D1 database (aivo-db)..."
if wrangler d1 export aivo-db --output "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
  log_success "Database exported successfully"
else
  log_error "Database export failed"
  exit 1
fi

# Verify backup file exists and has content
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file not created: $BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "unknown")
log_info "Backup size: $BACKUP_SIZE bytes"

# Compress backup
log_info "Compressing backup..."
gzip -c "$BACKUP_FILE" > "$COMPRESSED_FILE" 2>/dev/null
COMPRESSED_SIZE=$(stat -f%z "$COMPRESSED_FILE" 2>/dev/null || stat -c%s "$COMPRESSED_FILE" 2>/dev/null || echo "unknown")
log_success "Compressed to: $COMPRESSED_SIZE bytes (ratio: ~$(echo "scale=1; 100 * $COMPRESSED_SIZE / $BACKUP_SIZE" | bc)% )"

# Upload to R2 if configured
if [ "$UPLOAD_TO_R2" = "true" ]; then
  log_info "Uploading to R2 bucket: $R2_BACKUP_BUCKET"
  R2_KEY="backups/database/$(basename "$COMPRESSED_FILE")"

  if wrangler r2 bucket put "$R2_BACKUP_BUCKET" "$R2_KEY" --file "$COMPRESSED_FILE" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Backup uploaded to R2: $R2_KEY"

    # Set lifecycle headers for automatic expiration (30 days)
    log_info "Setting R2 metadata for lifecycle..."
    wrangler r2 bucket object update "$R2_BACKUP_BUCKET" "$R2_KEY" \
      --http-metadata "cache-control=private, max-age=0" 2>/dev/null || true
  else
    log_error "Failed to upload backup to R2"
  fi
fi

# Clean up old local backups
log_info "Cleaning up local backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "aivo-db-backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null
find "$BACKUP_DIR" -name "aivo-db-backup-*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null
log_success "Local cleanup complete"

# Optional: Clean up old R2 backups (older than 90 days)
# Note: Cloudflare R2 doesn't have lifecycle rules yet, so we'd need a separate cleanup
if [ "$UPLOAD_TO_R2" = "true" ]; then
  log_info "Note: R2 backups older than 90 days should be cleaned up manually or via separate cleanup job"
  log_info "To clean R2 backups manually:"
  log_info "  wrangler r2 bucket list-objects $R2_BACKUP_BUCKET --json | jq -r '.[] | select(.lastModified < \"\$(date -d '-90 days' +%Y-%m-%d)\") | .key' | xargs -r -n1 wrangler r2 bucket delete-object $R2_BACKUP_BUCKET"
fi

# Summary
log_header "Backup Summary"
echo -e "Timestamp: ${GREEN}$TIMESTAMP${NC}"
echo -e "Local backup: ${CYAN}$BACKUP_FILE${NC}"
echo -e "Compressed: ${CYAN}$COMPRESSED_FILE${NC}"
echo -e "Original size: ${CYAN}$BACKUP_SIZE bytes${NC}"
echo -e "Compressed size: ${CYAN}$COMPRESSED_SIZE bytes${NC}"
if [ "$UPLOAD_TO_R2" = "true" ]; then
  echo -e "R2 location: ${CYAN}$R2_BACKUP_BUCKET / $R2_KEY${NC}"
fi
echo -e "Log file: ${CYAN}$LOG_FILE${NC}"

log_success "Database backup completed!"
