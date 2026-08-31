#!/bin/bash
# ============================================
# AIVO - Development Startup Script
# ============================================
# Starts all services for local development:
# - Gateway (port 4000)
# - Auth Service (port 3001)
# - Nutrition Service (port 3002)
# - Coach Service (port 3003)
# - Health Service (port 3004)
# - Mail Service (port 3005)
# - Web App (port 3000)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/apps/services"

# Service ports
declare -A PORTS=(
    ["gateway"]=4000
    ["auth"]=3001
    ["nutrition"]=3002
    ["coach"]=3003
    ["health"]=3004
    ["mail"]=3005
    ["web"]=3000
)

# PIDs storage
declare -A PIDS

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

log_service() {
    echo -e "${CYAN}[$1]${NC} $2"
}

# Cleanup function
cleanup() {
    log_warning "Shutting down services..."
    
    for service in "${!PIDS[@]}"; do
        if [ -n "${PIDS[$service]}" ] && kill -0 "${PIDS[$service]}" 2>/dev/null; then
            log_info "Stopping $service (PID: ${PIDS[$service]})"
            kill "${PIDS[$service]}" 2>/dev/null || true
        fi
    done
    
    log_success "All services stopped"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_warning "Please edit .env and add your Cloudflare API token"
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi
    
    # Load environment variables
    set -a
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
    
    # Check if JWT keys are set
    if [ -z "$AUTH_JWT_PRIVATE_KEY" ] || [ "$AUTH_JWT_PRIVATE_KEY" == "<generate-with-openssl>" ]; then
        log_warning "JWT keys not set. Run './scripts/setup-infra.sh keys' to generate them"
    fi
    
    log_success "Prerequisites check complete"
}

# Start a service
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    local is_worker=$4  # true/false
    
    log_service "$service_name" "Starting on port $port..."
    
    cd "$service_dir"
    
    if [ "$is_worker" = "true" ]; then
        # Start as Cloudflare Worker
        npx wrangler dev --port "$port" &
    else
        # Start as regular Node.js server
        pnpm dev &
    fi
    
    PIDS[$service_name]=$!
    cd - > /dev/null
    
    log_service "$service_name" "Started (PID: ${PIDS[$service_name]})"
}

# Check if port is in use
check_port() {
    local port=$1
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    log_service "$service_name" "Waiting for service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" >/dev/null 2>&1 || curl -s "http://localhost:$port/" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_warning "$service_name may not be ready yet"
    return 1
}

# Print status table
print_status() {
    echo ""
    echo "============================================"
    echo "  AIVO Services Status"
    echo "============================================"
    echo ""
    printf "%-15s %-10s %-15s\n" "Service" "Port" "Status"
    echo "--------------------------------------------"
    
    for service in "${!PORTS[@]}"; do
        local port=${PORTS[$service]}
        if check_port $port; then
            printf "%-15s %-10s ${GREEN}%-15s${NC}\n" "$service" "$port" "Running"
        else
            printf "%-15s %-10s ${YELLOW}%-15s${NC}\n" "$service" "$port" "Stopped"
        fi
    done
    
    echo ""
}

# Print URLs
print_urls() {
    echo ""
    echo "============================================"
    echo "  Service URLs"
    echo "============================================"
    echo ""
    echo "  Web App:       http://localhost:${PORTS[web]}"
    echo "  Gateway:       http://localhost:${PORTS[gateway]}"
    echo "  Auth Service:  http://localhost:${PORTS[auth]}"
    echo "  Nutrition:     http://localhost:${PORTS[nutrition]}"
    echo "  Coach Service: http://localhost:${PORTS[coach]}"
    echo "  Health:        http://localhost:${PORTS[health]}"
    echo "  Mail Service:  http://localhost:${PORTS[mail]}"
    echo ""
    echo "  Swagger Docs:"
    echo "    Auth:        http://localhost:${PORTS[auth]}/swagger"
    echo "    Nutrition:   http://localhost:${PORTS[nutrition]}/swagger"
    echo "    Coach:       http://localhost:${PORTS[coach]}/swagger"
    echo "    Health:      http://localhost:${PORTS[health]}/swagger"
    echo ""
}

# Main function
main() {
    echo ""
    echo "============================================"
    echo "  AIVO Development Environment Startup"
    echo "============================================"
    echo ""
    
    check_prerequisites
    
    # Parse arguments
    SERVICE=${1:-all}
    
    case $SERVICE in
        all)
            log_info "Starting all services..."
            
            # Start services in order (workers first, then web)
            start_service "gateway" "$SERVICES_DIR/gateway" ${PORTS[gateway]} true
            sleep 2
            
            start_service "auth" "$SERVICES_DIR/auth" ${PORTS[auth]} true
            sleep 2
            
            start_service "nutrition" "$SERVICES_DIR/nutrition" ${PORTS[nutrition]} true
            start_service "coach" "$SERVICES_DIR/coach" ${PORTS[coach]} true
            start_service "health" "$SERVICES_DIR/health" ${PORTS[health]} true
            start_service "mail" "$SERVICES_DIR/mail" ${PORTS[mail]} true
            sleep 5
            
            start_service "web" "$PROJECT_ROOT/apps/web" ${PORTS[web]} false
            
            print_status
            print_urls
            
            log_info "All services starting..."
            log_info "Press Ctrl+C to stop all services"
            echo ""
            
            # Wait for any background job
            while true; do
                sleep 1
            done
            ;;
        
        gateway|auth|nutrition|coach|health|mail)
            start_service "$SERVICE" "$SERVICES_DIR/$SERVICE" ${PORTS[$SERVICE]} true
            wait_for_service "$SERVICE" ${PORTS[$SERVICE]}
            ;;
        
        web)
            start_service "web" "$PROJECT_ROOT/apps/web" ${PORTS[web]} false
            ;;
        
        status)
            print_status
            ;;
        
        help|--help|-h)
            echo "Usage: ./scripts/dev.sh [service]"
            echo ""
            echo "Services:"
            echo "  all       - Start all services (default)"
            echo "  gateway   - Start API Gateway only"
            echo "  auth      - Start Auth Service only"
            echo "  nutrition - Start Nutrition Service only"
            echo "  coach     - Start Coach Service only"
            echo "  health    - Start Health Service only"
            echo "  mail      - Start Mail Service only"
            echo "  web       - Start Web App only"
            echo "  status    - Show service status"
            echo "  help      - Show this help message"
            ;;
        
        *)
            log_error "Unknown service: $SERVICE"
            echo "Run './scripts/dev.sh help' for usage"
            exit 1
            ;;
    esac
}

main "$@"
