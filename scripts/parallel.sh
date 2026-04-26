#!/usr/bin/env bash
# Quick parallel runner for lint, build, test
# Runs all three tasks in parallel and shows combined output
# Best for CI-like behavior or when you want to see all output together

set -e

# Run all three in parallel and wait for all to complete
pnpm lint & \
pnpm build & \
pnpm test & \
wait
