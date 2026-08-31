#!/bin/bash
# ============================================
# AIVO - Development Environment Setup Script
# ============================================
# Usage:
#   ./scripts/setup-env.sh development   # Set up development environment
#   ./scripts/setup-env.sh production    # Set up production environment
#   ./scripts/setup-env.sh all           # Set up both environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate JWT keys
generate_jwt_keys() {
    print_info "Generating JWT key pair..."
    
    # Generate private key
    PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey 2>/dev/null | base64 | tr -d '\n')
    
    # Generate public key
    PUBLIC_KEY=$(echo "$PRIVATE_KEY" | base64 -d 2>/dev/null | openssl ec -pubout 2>/dev/null | base64 | tr -d '\n')
    
    echo "$PRIVATE_KEY" > "$ROOT_DIR/.jwt_private_key.tmp"
    echo "$PUBLIC_KEY" > "$ROOT_DIR/.jwt_public_key.tmp"
    
    print_success "JWT keys generated:"
    print_info "  Private key: $ROOT_DIR/.jwt_private_key.tmp"
    print_info "  Public key:  $ROOT_DIR/.jwt_public_key.tmp"
}

# Copy env files for a service
setup_service_env() {
    local service=$1
    local service_dir="$ROOT_DIR/apps/services/$service"
    
    if [ ! -d "$service_dir" ]; then
        print_warning "Service directory not found: $service_dir"
        return 1
    fi
    
    # Copy .env.example to .env.development if it exists
    if [ -f "$service_dir/.env.example" ] && [ ! -f "$service_dir/.env.development" ]; then
        cp "$service_dir/.env.example" "$service_dir/.env.development"
        print_success "Created $service/.env.development"
    fi
    
    if [ -f "$service_dir/.env.example" ] && [ ! -f "$service_dir/.env.production" ]; then
        cp "$service_dir/.env.example" "$service_dir/.env.production"
        print_success "Created $service/.env.production"
    fi
}

# Setup all services
setup_all_services() {
    local services=("auth" "nutrition" "coach" "health" "mail" "gateway")
    
    print_info "Setting up environment files for all services..."
    
    for service in "${services[@]}"; do
        setup_service_env "$service"
    done
    
    print_success "All service environment files created!"
}

# Verify Cloudflare configuration
verify_cloudflare() {
    print_info "Verifying Cloudflare configuration..."
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        print_error "CLOUDFLARE_API_TOKEN is not set"
        print_info "Get your API token from: https://dash.cloudflare.com/profile/api-tokens"
        return 1
    fi
    
    if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        print_error "CLOUDFLARE_ACCOUNT_ID is not set"
        print_info "Find your Account ID at: https://dash.cloudflare.com"
        return 1
    fi
    
    print_success "Cloudflare configuration found"
}

# Display usage
usage() {
    echo "AIVO Environment Setup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  development    Set up development environment"
    echo "  production     Set up production environment"
    echo "  all            Set up all environment files"
    echo "  keys           Generate JWT key pair"
    echo "  verify         Verify Cloudflare configuration"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 development          # Set up development"
    echo "  $0 production           # Set up production"
    echo "  $0 keys                # Generate JWT keys"
    echo "  $0 verify              # Check Cloudflare setup"
}

# Main function
main() {
    local command=${1:-help}
    
    case "$command" in
        development)
            print_info "Setting up development environment..."
            setup_all_services
            setup_service_env "web"
            generate_jwt_keys
            print_success "Development environment ready!"
            print_info "Please edit the .env.development files and add your credentials"
            ;;
        production)
            print_info "Setting up production environment..."
            setup_all_services
            setup_service_env "web"
            print_warning "Production environment files created!"
            print_info "Please review and update .env.production files with production values"
            ;;
        all)
            print_info "Setting up all environment files..."
            setup_all_services
            setup_service_env "web"
            generate_jwt_keys
            print_success "All environment files created!"
            ;;
        keys)
            generate_jwt_keys
            ;;
        verify)
            source "$ROOT_DIR/.env.development" 2>/dev/null || true
            verify_cloudflare
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

main "$@"
