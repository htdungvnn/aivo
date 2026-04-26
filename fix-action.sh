#!/usr/bin/env bash

# fix-action.sh - Automatically detect and fix CI/CD failures using Claude Code
#
# Usage: ./fix-action.sh [branch]
#   Default branch is 'main'
#
# This script:
#   1. Gets the latest workflow run for the branch
#   2. Checks if it failed
#   3. Fetches the failure logs
#   4. Uses Claude Code to analyze and suggest fixes
#   5. Applies the fixes (with user confirmation)
#   6. Commits and pushes
#   7. Waits and repeats until all checks pass

set -euo pipefail

BRANCH="${1:-main}"
MAX_ATTEMPTS=10
WAIT_TIME=30  # seconds between checks

echo "======================================"
echo "CI Auto-Fix Script"
echo "Branch: $BRANCH"
echo "Max attempts: $MAX_ATTEMPTS"
echo "======================================"

attempt=1

while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo ""
    echo "=== Attempt $attempt/$MAX_ATTEMPTS ==="

    # Get latest workflow run
    echo "Fetching latest workflow run..."
    latest_run=$(gh run list --branch "$BRANCH" --limit 1 --json status,conclusion,databaseId,displayTitle,url)

    run_id=$(echo "$latest_run" | jq -r '.[0].databaseId')
    run_status=$(echo "$latest_run" | jq -r '.[0].status')
    run_conclusion=$(echo "$latest_run" | jq -r '.[0].conclusion // "null"')
    run_title=$(echo "$latest_run" | jq -r '.[0].displayTitle')
    run_url=$(echo "$latest_run" | jq -r '.[0].url')

    echo "Run ID: $run_id"
    echo "Title: $run_title"
    echo "Status: $run_status"
    echo "Conclusion: $run_conclusion"
    echo "URL: $run_url"

    # Check if run is completed
    if [ "$run_status" != "completed" ]; then
        echo "Workflow still running (status: $run_status). Waiting ${WAIT_TIME}s..."
        sleep $WAIT_TIME
        continue
    fi

    # Check if successful
    if [ "$run_conclusion" = "success" ]; then
        echo "✅ All checks passed!"
        echo "Workflow URL: $run_url"
        exit 0
    fi

    # Run failed - analyze and fix
    echo ""
    echo "❌ Workflow failed! Analyzing errors..."

    # Get failed jobs
    failed_jobs=$(gh run view "$run_id" --log-failed --json jobs --jq '.jobs[] | select(.conclusion=="failure") | .name' 2>/dev/null || echo "")

    if [ -z "$failed_jobs" ]; then
        # Try to get any job errors
        echo "Fetching error logs..."
        gh run view "$run_id" --log-failed 2>&1 | head -200 > "/tmp/ci-failure-logs-$run_id.txt" || true
        failed_jobs="unknown"
    fi

    echo ""
    echo "Failed jobs:"
    echo "$failed_jobs"
    echo ""
    echo "Recent error logs:"
    echo "---"
    if [ -f "/tmp/ci-failure-logs-$run_id.txt" ]; then
        tail -50 "/tmp/ci-failure-logs-$run_id.txt" || true
    else
        gh run view "$run_id" --log-failed 2>&1 | tail -50 || echo "Could not fetch logs"
    fi
    echo "---"
    echo ""

    # Ask user if they want to use Claude Code to fix
    read -p "Do you want Claude Code to analyze and fix these errors? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping auto-fix. Please fix manually and push."
        exit 1
    fi

    # Prepare context for Claude
    log_file="/tmp/ci-failure-analysis-$run_id.md"
    cat > "$log_file" << EOF
# CI/CD Failure Analysis

**Workflow Run:** $run_id
**Branch:** $BRANCH
**Title:** $run_title
**URL:** $run_url
**Failed Jobs:** $failed_jobs

## Error Logs

\`\`\`
$(gh run view "$run_id" --log-failed 2>&1 | head -300 || echo "Could not fetch full logs")
\`\`\`

## Request

Please analyze the errors above and provide:
1. Root cause of the failure
2. Specific fixes needed (file paths and line numbers)
3. Commands to apply the fixes

Then apply the fixes directly to the codebase.
EOF

    echo "Starting Claude Code with failure context..."
    echo "Log file: $log_file"
    echo ""

    # Launch Claude Code with the context
    claude "$log_file" --allowedTools "Edit,Write,Bash,Read,Grep" || true

    # Check if any changes were made
    if git diff --quiet && git diff --cached --quiet; then
        echo "No changes detected. Please fix manually."
        exit 1
    fi

    # Show changes and ask for confirmation
    echo ""
    echo "Changes detected:"
    git diff --stat
    echo ""
    read -p "Commit and push these changes? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "fix: auto-fix CI failure for run $run_id

- Fix failing jobs: $failed_jobs
- Workflow: $run_title"

        echo "Pushing to remote..."
        git push origin "$BRANCH"

        echo "Pushed! Waiting for next workflow run..."
    else
        echo "Changes not committed. Exiting."
        exit 1
    fi

    attempt=$((attempt + 1))
    echo ""
    echo "Waiting ${WAIT_TIME}s before checking next run..."
    sleep $WAIT_TIME
done

echo ""
echo "=== Max attempts reached ==="
echo "Please check the workflow runs manually and fix remaining issues."
exit 1
