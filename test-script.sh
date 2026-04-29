#!/bin/bash
set -e
cd /Users/htdung/Documents/aivo/packages/compute
echo "=== Node version ==="
node --version
echo "=== npm version ==="
npm --version
echo "=== wasm-pack version ==="
wasm-pack --version
echo "=== Running cargo test ==="
cargo test -- --nocapture
echo "=== Exit code: $? ==="
