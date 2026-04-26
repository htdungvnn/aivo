#!/usr/bin/env bash
# Multi-tab development runner for AIVO
# Runs lint, build, and test in separate tmux tabs
# Switch tabs with arrow keys (prefix + arrow) or directly with prefix + 1/2/3

set -e

SESSION="aivo-dev"

# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create new session with first window (lint)
tmux new-session -d -s "$SESSION" -n lint

# Create second window (build)
tmux new-window -t "$SESSION:" -n build

# Create third window (test)
tmux new-window -t "$SESSION:" -n test

# Run commands in each window
# Window 0 (lint)
tmux send-keys -t "$SESSION:0" "pnpm lint" C-m

# Window 1 (build)
tmux send-keys -t "$SESSION:1" "pnpm build" C-m

# Window 2 (test)
tmux send-keys -t "$SESSION:2" "pnpm test" C-m

# Attach to session
tmux attach-session -t "$SESSION"
