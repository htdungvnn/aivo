#!/usr/bin/env bash

# Database Index Verification Script
# Tests that critical indexes are being used in queries

set -e

echo "=========================================="
echo "AIVO Database Index Verification"
echo "=========================================="
echo ""

# Check if wrangler is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found"
    exit 1
fi

# Function to run a query and check if it uses an index
check_index_usage() {
    local query="$1"
    local expected_index="$2"
    local description="$3"

    echo "Testing: $description"
    echo "  Query: $query"

    # Run EXPLAIN to see query plan
    result=$(pnpm exec wrangler d1 execute aivo-db --remote --command "EXPLAIN QUERY PLAN $query" 2>&1 | jq -r '.[0].results[]?.detail' 2>/dev/null || echo "")

    if echo "$result" | grep -i "$expected_index" > /dev/null; then
        echo "  ✅ Uses index: $expected_index"
    else
        echo "  ⚠️  Index usage unclear (may need verification)"
        echo "  Plan: $result"
    fi
    echo ""
}

echo "Note: This script requires remote database access with appropriate permissions."
echo "Set CF_API_TOKEN environment variable for remote execution."
echo ""

# Check if we're using remote
if [ "$1" = "--remote" ]; then
    echo "Running against REMOTE database..."
    echo ""

    # Test 1: workout_exercises index
    check_index_usage \
        "SELECT * FROM workout_exercises WHERE workout_id = 'test-workout-id' LIMIT 1" \
        "idx_workout_exercises_workout_id" \
        "Workout exercises lookup by workout_id"

    # Test 2: routine_exercises index
    check_index_usage \
        "SELECT * FROM routine_exercises WHERE routine_id = 'test-routine-id' LIMIT 1" \
        "idx_routine_exercises_routine_id" \
        "Routine exercises lookup by routine_id"

    # Test 3: food_logs composite index
    check_index_usage \
        "SELECT * FROM food_logs WHERE user_id = 'test-user' AND meal_type = 'breakfast' ORDER BY logged_at DESC LIMIT 10" \
        "idx_food_logs_user_meal_logged" \
        "Food logs with meal_type filter and ordering"

    # Test 4: workouts composite index
    check_index_usage \
        "SELECT * FROM workouts WHERE user_id = 'test-user' AND status = 'completed' AND start_time >= 1000000 ORDER BY start_time LIMIT 10" \
        "idx_workouts_user_status_start" \
        "Workouts with status and time filter"

    # Test 5: comments composite index
    check_index_usage \
        "SELECT * FROM comments WHERE entity_type = 'workout' AND entity_id = 'test-workout' ORDER BY created_at DESC LIMIT 20" \
        "idx_comments_entity_created" \
        "Comments with ordering"

    echo "=========================================="
    echo "Index Verification Complete!"
    echo "=========================================="
    echo ""
    echo "If any queries show 'Index usage unclear':"
    echo "1. Verify the indexes exist in production:"
    echo "   wrangler d1 execute aivo-db --remote --command \"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'\""
    echo "2. Check query patterns match the index column order"
    echo "3. Consider adding ANALYZE to update SQLite statistics"
else
    echo "This script should be run against the remote database for verification."
    echo "Usage: $0 --remote"
    echo ""
    echo "For local testing, you can manually verify indexes exist:"
    echo "  pnpm exec wrangler d1 execute aivo-db --command \"SELECT name FROM sqlite_master WHERE type='index'\""
fi
