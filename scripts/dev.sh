#!/usr/bin/env bash

################################################################################
# AIVO Development Runner Script
# Starts all development services using tmux
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}→ $1${NC}"
}

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
  echo "Error: tmux is not installed"
  echo "Install with: brew install tmux (macOS) or apt-get install tmux (Linux)"
  exit 1
fi

SESSION_NAME="aivo-dev"

print_header "AIVO Development Environment"

# Kill existing session if it exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  print_info "Killing existing tmux session..."
  tmux kill-session -t "$SESSION_NAME"
fi

cd "$PROJECT_ROOT"

print_info "Creating tmux session..."

# Create new session with first window
tmux new-session -d -s "$SESSION_NAME" -n "api"

# API window
tmux send-keys -t "$SESSION_NAME:0" "cd apps/api" C-m
tmux send-keys -t "$SESSION_NAME:0" "pnpm exec wrangler dev --local" C-m

# Create web window
tmux new-window -t "$SESSION_NAME" -n "web"
tmux send-keys -t "$SESSION_NAME:1" "cd apps/web" C-m
tmux send-keys -t "$SESSION_NAME:1" "pnpm run dev" C-m

# Create mobile window
tmux new-window -t "$SESSION_NAME" -n "mobile"
tmux send-keys -t "$SESSION_NAME:2" "cd apps/mobile" C-m
tmux send-keys -t "$SESSION_NAME:2" "pnpm exec expo start" C-m

# Create logs window
tmux new-window -t "$SESSION_NAME" -n "logs"
tmux send-keys -t "$SESSION_NAME:3" "cd apps/api" C-m
tmux send-keys -t "$SESSION_NAME:3" "echo 'API logs will appear here. Press Ctrl+B then D to detach.'" C-m
tmux send-keys -t "$SESSION_NAME:3" "pnpm exec wrangler tail" C-m

# Layout: horizontal split for api and vertical split for others
tmux select-layout -t "$SESSION_NAME:0" even-horizontal
tmux select-layout -t "$SESSION_NAME" tiled

print_success "Development environment started!"
echo ""
echo "To attach to the session:"
echo "  tmux attach -t $SESSION_NAME"
echo ""
echo "Within tmux:"
echo "  - Switch windows: Ctrl+B then 0,1,2,3"
echo "  - Split panes: Ctrl+B % (vertical) or Ctrl+B \" (horizontal)"
echo "  - Detach: Ctrl+B then D"
echo "  - Kill session: tmux kill-session -t $SESSION_NAME"
echo ""
echo "Services:"
echo "  API:   http://localhost:8787"
echo "  Web:   http://localhost:3000"
echo "  Mobile: Expo dev tools on port 8081"
echo ""
