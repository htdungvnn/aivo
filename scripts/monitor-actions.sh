#!/bin/bash

# GitHub Actions Monitoring & Automated Recovery Script
# Monitors CI/CD workflows and attempts automated fixes for common failures

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${REPO_ROOT}/.claude/ci-monitor.log"
MAX_FAILURES_BEFORE_ALERT=3
AUTO_RETRY=false  # Set to true to auto-retry failed workflows
RECOVERY_ACTIONS=true  # Enable automated recovery actions

# Auto-detect repository owner/name
GITHUB_REPO=""
function detect_github_repo() {
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
    GITHUB_REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  else
    # Default fallback - should be replaced with actual owner/repo
    GITHUB_REPO=":owner/:repo"
  fi
}

# Portable date function: get ISO 8601 date N hours ago
function hours_ago() {
  local hours=$1
  # Try GNU date first (Linux)
  if date --version 2>/dev/null | grep -q GNU; then
    date -u -d "${hours} hours ago" +"%Y-%m-%dT%H:%M:%SZ"
  else
    # macOS/BSD date: use -v with capital H (hours)
    date -u -v -${hours}H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || {\
      python3 -c "import datetime; print((datetime.datetime.utcnow() - datetime.timedelta(hours=${hours})).strftime('%Y-%m-%dT%H:%M:%SZ'))" 2>/dev/null || \
      echo "1970-01-01T00:00:00Z" ;\
    }
  fi
}

log_message() {
  local level=$1
  local message=$2
  local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

check_workflow_status() {
  local hours=$1
  local since
  since=$(hours_ago "$hours") || since=""
  
  if [[ -z "$since" ]]; then
    log_message "ERROR" "Could not calculate date. Using default (24h ago)."
    since=$(date -u -v -24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
  fi
  
  log_message "INFO" "Checking workflow runs from last ${hours} hours (since: ${since:-unknown})..."
  
  detect_github_repo
  
  local runs
  if [[ "$GITHUB_REPO" != ":owner/:repo" ]]; then
    runs=$(gh api "repos/${GITHUB_REPO}/actions/runs" -q ".workflow_runs[] | select(.created_at >= \"${since}\")" 2>/dev/null || echo "")
  else
    runs=$(gh api repos/:owner/:repo/actions/runs -q ".workflow_runs[] | select(.created_at >= \"${since}\")" 2>/dev/null || echo "")
  fi
  
  if [[ -z "$runs" ]]; then
    log_message "WARN" "Could not fetch workflow runs. Ensure gh CLI is authenticated and repository is detected"
    return 1
  fi
  
  echo "$runs" | jq -r '
    "\(.workflow_id | tostring): \(.id) | \(.name) | \(.html_url)"' 2>/dev/null || {
    log_message "WARN" "Could not parse workflow runs"
    return 0
  }
}

attempt_recovery() {
  local run_id=$1
  
  log_message "INFO" "Attempting recovery for run #${run_id}"
  
  # Get failure details for this run
  detect_github_repo
  local jobs
  if [[ "$GITHUB_REPO" != ":owner/:repo" ]]; then
    jobs=$(gh api "repos/${GITHUB_REPO}/actions/runs/${run_id}/jobs" -q '.jobs[] | select(.conclusion == "failure")' 2>/dev/null || echo "")
  else
    jobs=$(gh api repos/:owner/:repo/actions/runs/${run_id}/jobs -q '.jobs[] | select(.conclusion == "failure")' 2>/dev/null || echo "")
  fi
  
  if [[ -z "$jobs" ]]; then
    log_message "RECOVERY" "No failed jobs found (might be workflow-level failure)"
  else
    echo "$jobs" | jq -r '.name' 2>/dev/null | while IFS= read -r job_name; do
      log_message "RECOVERY" "Failed job: $job_name"
      
      case "$job_name" in
        *"Type Check"*|*"Lint"*)
          log_message "RECOVERY" "⚠️  Type/lint failures require manual code fix."
          ;;
        *"Build"*)
          log_message "RECOVERY" "🔧 Build failure. Try: pnpm run clean && pnpm run build"
          ;;
        *"Test"*)
          log_message "RECOVERY" "🧪 Test failure. Check for flaky tests or new requirements."
          ;;
        *)
          log_message "RECOVERY" "❓ Unknown failure type. Manual investigation required."
          ;;
      esac
    done
  fi
}

monitor_all_workflows() {
  log_message "INFO" "=== GitHub Actions Monitoring Started ==="
  
  check_workflow_status 24
  
  local recent_failures
  detect_github_repo
  local since_6h
  since_6h=$(hours_ago 6) || since_6h=""
  
  if [[ -z "$since_6h" ]]; then
    log_message "ERROR" "Could not calculate 6h ago timestamp, skipping failure check"
  else
    if [[ "$GITHUB_REPO" != ":owner/:repo" ]]; then
      recent_failures=$(gh api "repos/${GITHUB_REPO}/actions/runs" -q ".workflow_runs[] | select(.created_at >= \"${since_6h}\") | select(.conclusion == \"failure\")" 2>/dev/null || echo "")
    else
      recent_failures=$(gh api repos/:owner/:repo/actions/runs -q ".workflow_runs[] | select(.created_at >= \"${since_6h}\") | select(.conclusion == \"failure\")" 2>/dev/null || echo "")
    fi
    
    local failure_count
    failure_count=$(echo "$recent_failures" | jq -s 'length' 2>/dev/null || echo "0")
    
    if [[ "$failure_count" -gt 0 ]]; then
      log_message "WARN" "Found $failure_count failed workflow runs in last 6 hours"
      
      if [[ "$RECOVERY_ACTIONS" == "true" ]]; then
        # Process each failure as JSON object directly
        echo "$recent_failures" | jq -c '.' 2>/dev/null | while IFS= read -r run; do
          local run_id name workflow_id url
          run_id=$(echo "$run" | jq -r '.id')
          name=$(echo "$run" | jq -r '.name')
          workflow_id=$(echo "$run" | jq -r '.workflow_id | tostring')
          url=$(echo "$run" | jq -r '.html_url')
          
          log_message "FAILURE" "Workflow: $name (ID: ${workflow_id}, Run: #${run_id})"
          [[ -n "$url" ]] && log_message "URL" "$url"
          
          if [[ "$AUTO_RETRY" == "true" ]]; then
            log_message "RECOVERY" "Auto-retrying run #${run_id}"
            gh api -X POST "repos/${GITHUB_REPO}/actions/runs/${run_id}/rerun" 2>/dev/null || log_message "ERROR" "Failed to trigger rerun"
          else
            attempt_recovery "$run_id"
          fi
        done
      fi
      
      if [[ "$failure_count" -ge "$MAX_FAILURES_BEFORE_ALERT" ]]; then
        log_message "ALERT" "⚠️  Multiple workflow failures detected! Consider pausing deployments."
      fi
    else
      log_message "INFO" "No failures detected in recent workflows ✓"
    fi
  fi
  
  log_message "INFO" "=== Monitoring Complete ==="
}

main() {
  case "${1:-monitor}" in
    "monitor")
      monitor_all_workflows
      ;;
    "status")
      check_workflow_status 24
      ;;
    "recovery")
      RECOVERY_ACTIONS=true monitor_all_workflows
      ;;
    "full")
      AUTO_RETRY=true RECOVERY_ACTIONS=true monitor_all_workflows
      ;;
    *)
      echo "Usage: $0 {monitor|status|recovery|full}"
      echo "  monitor  - Check workflow status and report failures (default)"
      echo "  status   - Show status of all recent workflow runs"
      echo "  recovery - Attempt automated recovery actions"
      echo "  full     - Full auto-retry mode (use with caution)"
      exit 1
      ;;
  esac
}

main "$@"
