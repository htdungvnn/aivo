#!/bin/bash
# ============================================
# AIVO - Cloudflare Infrastructure Setup Script
# ============================================
# This script creates all required Cloudflare resources:
# - D1 Databases
# - KV Namespaces
# - R2 Buckets
# - Queues
# - JWT Keys
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if CLOUDFLARE_API_TOKEN is set
check_auth() {
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        if grep -q "^CLOUDFLARE_API_TOKEN=$" "$ENV_FILE" 2>/dev/null || [ ! -f "$ENV_FILE" ]; then
            log_error "CLOUDFLARE_API_TOKEN not set!"
            echo ""
            echo "Please set your Cloudflare API token:"
            echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
            echo "2. Create a new API token with these permissions:"
            echo "   - Account > Workers Scripts (Edit)"
            echo "   - Account > D1 (Edit)"
            echo "   - Account > KV Namespaces (Edit)"
            echo "   - Account > R2 (Edit)"
            echo "   - Account > Workers Queues (Edit)"
            echo ""
            echo "3. Export the token:"
            echo "   export CLOUDFLARE_API_TOKEN=cfut_xxxxx"
            echo "   export CLOUDFLARE_ACCOUNT_ID=312b98fff6f54aa11ae59cb06d30015a"
            echo ""
            echo "4. Or add it to .env file"
            exit 1
        fi
    fi
    
    # Load from .env if available
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    log_success "Cloudflare authentication configured"
}

# ============================================
# Generate JWT Keys
# ============================================
generate_jwt_keys() {
    log_info "Generating JWT EC P-256 key pair..."
    
    PRIVATE_KEY_FILE="$PROJECT_ROOT/temp_private.pem"
    PUBLIC_KEY_FILE="$PROJECT_ROOT/temp_public.pem"
    
    # Generate keys
    openssl ecparam -name prime256v1 -genkey -noout -out "$PRIVATE_KEY_FILE"
    openssl ec -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE"
    
    # Convert to base64
    PRIVATE_KEY_B64=$(cat "$PRIVATE_KEY_FILE" | base64 | tr -d '\n')
    PUBLIC_KEY_B64=$(cat "$PUBLIC_KEY_FILE" | base64 | tr -d '\n')
    
    # Clean up temp files
    rm -f "$PRIVATE_KEY_FILE" "$PUBLIC_KEY_FILE"
    
    # Update .env file
    if [ -f "$ENV_FILE" ]; then
        sed -i '' "s/^AUTH_JWT_PRIVATE_KEY=.*/AUTH_JWT_PRIVATE_KEY=$PRIVATE_KEY_B64/" "$ENV_FILE"
        sed -i '' "s/^AUTH_JWT_PUBLIC_KEY=.*/AUTH_JWT_PUBLIC_KEY=$PUBLIC_KEY_B64/" "$ENV_FILE"
    fi
    
    log_success "JWT keys generated and saved to .env"
}

# ============================================
# Create D1 Databases
# ============================================
create_d1_databases() {
    log_info "Creating D1 databases..."
    
    # Auth D1
    log_info "Creating aivo-auth-db..."
    AUTH_D1_OUTPUT=$(cd "$PROJECT_ROOT/apps/services/auth" && npx wrangler d1 create aivo-auth-db --json 2>/dev/null)
    AUTH_D1_ID=$(echo "$AUTH_D1_OUTPUT" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$AUTH_D1_ID" ]; then
        log_success "Auth D1 created: $AUTH_D1_ID"
    else
        log_warning "Auth D1 may already exist or failed"
        AUTH_D1_ID="<AUTH_D1_DATABASE_ID>"
    fi
    
    # Nutrition D1
    log_info "Creating aivo-nutrition-db..."
    NUTRITION_D1_OUTPUT=$(cd "$PROJECT_ROOT/apps/services/nutrition" && npx wrangler d1 create aivo-nutrition-db --json 2>/dev/null)
    NUTRITION_D1_ID=$(echo "$NUTRITION_D1_OUTPUT" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$NUTRITION_D1_ID" ]; then
        log_success "Nutrition D1 created: $NUTRITION_D1_ID"
    else
        log_warning "Nutrition D1 may already exist or failed"
        NUTRITION_D1_ID="<NUTRITION_D1_DATABASE_ID>"
    fi
    
    # Coach D1
    log_info "Creating aivo-coach-db..."
    COACH_D1_OUTPUT=$(cd "$PROJECT_ROOT/apps/services/coach" && npx wrangler d1 create aivo-coach-db --json 2>/dev/null)
    COACH_D1_ID=$(echo "$COACH_D1_OUTPUT" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$COACH_D1_ID" ]; then
        log_success "Coach D1 created: $COACH_D1_ID"
    else
        log_warning "Coach D1 may already exist or failed"
        COACH_D1_ID="<COACH_D1_DATABASE_ID>"
    fi
    
    # Health D1
    log_info "Creating aivo-health-db..."
    HEALTH_D1_OUTPUT=$(cd "$PROJECT_ROOT/apps/services/health" && npx wrangler d1 create aivo-health-db --json 2>/dev/null)
    HEALTH_D1_ID=$(echo "$HEALTH_D1_OUTPUT" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$HEALTH_D1_ID" ]; then
        log_success "Health D1 created: $HEALTH_D1_ID"
    else
        log_warning "Health D1 may already exist or failed"
        HEALTH_D1_ID="<HEALTH_D1_DATABASE_ID>"
    fi
    
    echo ""
    echo "=== D1 DATABASE IDS ==="
    echo "AUTH_D1_DATABASE_ID=$AUTH_D1_ID"
    echo "NUTRITION_D1_DATABASE_ID=$NUTRITION_D1_ID"
    echo "COACH_D1_DATABASE_ID=$COACH_D1_ID"
    echo "HEALTH_D1_DATABASE_ID=$HEALTH_D1_ID"
    echo "========================"
}

# ============================================
# Create KV Namespaces
# ============================================
create_kv_namespaces() {
    log_info "Creating KV namespaces..."
    
    # OAuth State KV
    log_info "Creating oauth_state KV..."
    OAUTH_KV_OUTPUT=$(npx wrangler kv namespace create oauth_state --json 2>/dev/null)
    OAUTH_KV_ID=$(echo "$OAUTH_KV_OUTPUT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$OAUTH_KV_ID" ]; then
        log_success "OAuth State KV created: $OAUTH_KV_ID"
    else
        log_warning "OAuth State KV may already exist"
        OAUTH_KV_ID="<OAUTH_STATE_KV_ID>"
    fi
    
    echo ""
    echo "=== KV NAMESPACE IDS ==="
    echo "OAUTH_STATE_KV_ID=$OAUTH_KV_ID"
    echo "=========================="
}

# ============================================
# Create R2 Buckets
# ============================================
create_r2_buckets() {
    log_info "Creating R2 buckets..."
    
    # Meal Images Bucket
    log_info "Creating aivo-meal-images bucket..."
    npx wrangler r2 bucket create aivo-meal-images 2>/dev/null || log_warning "Meal images bucket may already exist"
    log_success "aivo-meal-images bucket ready"
    
    # Health Reports Bucket
    log_info "Creating aivo-health-reports bucket..."
    npx wrangler r2 bucket create aivo-health-reports 2>/dev/null || log_warning "Health reports bucket may already exist"
    log_success "aivo-health-reports bucket ready"
    
    echo ""
    echo "=== R2 BUCKET NAMES ==="
    echo "MEAL_IMAGES_BUCKET=aivo-meal-images"
    echo "HEALTH_REPORTS_BUCKET=aivo-health-reports"
    echo "========================"
}

# ============================================
# Create Queues
# ============================================
create_queues() {
    log_info "Creating Queues..."
    
    # Health Service Queues
    log_info "Creating aivo-health-queue..."
    npx wrangler queues create aivo-health-queue 2>/dev/null || log_warning "Health queue may already exist"
    log_success "aivo-health-queue ready"
    
    log_info "Creating aivo-health-report-queue..."
    npx wrangler queues create aivo-health-report-queue 2>/dev/null || log_warning "Health report queue may already exist"
    log_success "aivo-health-report-queue ready"
    
    log_info "Creating aivo-health-report-deliver-queue..."
    npx wrangler queues create aivo-health-report-deliver-queue 2>/dev/null || log_warning "Health report deliver queue may already exist"
    log_success "aivo-health-report-deliver-queue ready"
    
    # DLQ
    log_info "Creating aivo-health-report-dlq..."
    npx wrangler queues create aivo-health-report-dlq 2>/dev/null || log_warning "DLQ may already exist"
    log_success "aivo-health-report-dlq ready"
    
    # Nutrition Queue
    log_info "Creating aivo-nutrition-queue..."
    npx wrangler queues create aivo-nutrition-queue 2>/dev/null || log_warning "Nutrition queue may already exist"
    log_success "aivo-nutrition-queue ready"
    
    # Coach Queue
    log_info "Creating aivo-planning-queue..."
    npx wrangler queues create aivo-planning-queue 2>/dev/null || log_warning "Planning queue may already exist"
    log_success "aivo-planning-queue ready"
    
    # Mail Queues
    log_info "Creating aivo-email-queue..."
    npx wrangler queues create aivo-email-queue 2>/dev/null || log_warning "Email queue may already exist"
    log_success "aivo-email-queue ready"
    
    log_info "Creating aivo-email-dlq..."
    npx wrangler queues create aivo-email-dlq 2>/dev/null || log_warning "Email DLQ may already exist"
    log_success "aivo-email-dlq ready"
    
    echo ""
    echo "=== QUEUE NAMES ==="
    echo "- aivo-health-queue"
    echo "- aivo-health-report-queue"
    echo "- aivo-health-report-deliver-queue"
    echo "- aivo-health-report-dlq"
    echo "- aivo-nutrition-queue"
    echo "- aivo-planning-queue"
    echo "- aivo-email-queue"
    echo "- aivo-email-dlq"
    echo "===================="
}

# ============================================
# Update wrangler.jsonc files with IDs
# ============================================
update_wrangler_configs() {
    log_info "Updating wrangler.jsonc configuration files..."
    
    # Auth wrangler.jsonc
    sed -i '' "s/<AUTH_D1_DATABASE_ID>/$AUTH_D1_ID/g" "$PROJECT_ROOT/apps/services/auth/wrangler.jsonc"
    sed -i '' "s/<OAUTH_STATE_KV_ID>/$OAUTH_KV_ID/g" "$PROJECT_ROOT/apps/services/auth/wrangler.jsonc"
    log_success "Updated auth/wrangler.jsonc"
    
    log_success "Wrangler configurations updated"
}

# ============================================
# List existing infrastructure
# ============================================
list_infrastructure() {
    log_info "Listing existing Cloudflare infrastructure..."
    
    echo ""
    echo "=== D1 DATABASES ==="
    npx wrangler d1 list 2>/dev/null || echo "Unable to list D1 databases"
    
    echo ""
    echo "=== KV NAMESPACES ==="
    npx wrangler kv namespace list 2>/dev/null || echo "Unable to list KV namespaces"
    
    echo ""
    echo "=== R2 BUCKETS ==="
    npx wrangler r2 bucket list 2>/dev/null || echo "Unable to list R2 buckets"
    
    echo ""
    echo "=== QUEUES ==="
    npx wrangler queues list 2>/dev/null || echo "Unable to list queues"
}

# ============================================
# Show current status
# ============================================
show_status() {
    log_info "Current infrastructure status based on wrangler.jsonc files:"
    
    echo ""
    echo "=== D1 DATABASE REQUIREMENTS ==="
    echo "Auth:        $(grep -o 'database_id": "[^"]*"' "$PROJECT_ROOT/apps/services/auth/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Nutrition:   $(grep -o 'database_id": "[^"]*"' "$PROJECT_ROOT/apps/services/nutrition/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Coach:       $(grep -o 'database_id": "[^"]*"' "$PROJECT_ROOT/apps/services/coach/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Health:      $(grep -o 'database_id": "[^"]*"' "$PROJECT_ROOT/apps/services/health/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    
    echo ""
    echo "=== KV NAMESPACE REQUIREMENTS ==="
    echo "OAuth State: $(grep -o 'id": "[^"]*"' "$PROJECT_ROOT/apps/services/auth/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Rate Limit:  $(grep -o 'id": "[^"]*"' "$PROJECT_ROOT/apps/services/gateway/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Analytics:   $(grep -o 'id": "[^"]*"' "$PROJECT_ROOT/apps/services/gateway/wrangler.jsonc" | tail -1 | cut -d'"' -f3)"
    
    echo ""
    echo "=== R2 BUCKET REQUIREMENTS ==="
    echo "Meal Images:    $(grep -o 'bucket_name": "[^"]*"' "$PROJECT_ROOT/apps/services/nutrition/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    echo "Health Reports: $(grep -o 'bucket_name": "[^"]*"' "$PROJECT_ROOT/apps/services/health/wrangler.jsonc" | head -1 | cut -d'"' -f3)"
    
    echo ""
    echo "=== QUEUE REQUIREMENTS ==="
    echo "Health queues:"
    grep -o 'queue": "[^"]*"' "$PROJECT_ROOT/apps/services/health/wrangler.jsonc" | sort -u | sed 's/queue": "//g' | sed 's/"//g'
    echo "Nutrition queues:"
    grep -o 'queue": "[^"]*"' "$PROJECT_ROOT/apps/services/nutrition/wrangler.jsonc" | sort -u | sed 's/queue": "//g' | sed 's/"//g'
    echo "Coach queues:"
    grep -o 'queue": "[^"]*"' "$PROJECT_ROOT/apps/services/coach/wrangler.jsonc" | sort -u | sed 's/queue": "//g' | sed 's/"//g'
    echo "Mail queues:"
    grep -o 'queue": "[^"]*"' "$PROJECT_ROOT/apps/services/mail/wrangler.jsonc" | sort -u | sed 's/queue": "//g' | sed 's/"//g'
}

# ============================================
# Main
# ============================================
main() {
    echo ""
    echo "============================================"
    echo "  AIVO Cloudflare Infrastructure Setup"
    echo "============================================"
    echo ""
    
    # Parse arguments
    COMMAND=${1:-status}
    
    case $COMMAND in
        status)
            check_auth
            show_status
            ;;
        list)
            check_auth
            list_infrastructure
            ;;
        keys)
            check_auth
            generate_jwt_keys
            ;;
        d1)
            check_auth
            create_d1_databases
            ;;
        kv)
            check_auth
            create_kv_namespaces
            ;;
        r2)
            check_auth
            create_r2_buckets
            ;;
        queues)
            check_auth
            create_queues
            ;;
        all)
            check_auth
            generate_jwt_keys
            create_d1_databases
            create_kv_namespaces
            create_r2_buckets
            create_queues
            update_wrangler_configs
            log_success "All infrastructure created!"
            ;;
        help|--help|-h)
            echo "Usage: ./scripts/setup-infra.sh [command]"
            echo ""
            echo "Commands:"
            echo "  status   - Show current infrastructure requirements"
            echo "  list     - List existing Cloudflare resources"
            echo "  keys     - Generate JWT key pair"
            echo "  d1       - Create D1 databases"
            echo "  kv       - Create KV namespaces"
            echo "  r2       - Create R2 buckets"
            echo "  queues   - Create Queues"
            echo "  all      - Create all infrastructure (keys, d1, kv, r2, queues)"
            echo "  help     - Show this help message"
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo "Run './scripts/setup-infra.sh help' for usage"
            exit 1
            ;;
    esac
}

main "$@"
