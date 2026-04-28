#!/usr/bin/env bash
set -euo pipefail

# Navigate to repo root
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || { echo "Not in a git repo"; exit 1; }

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Defaults
COMMIT_MESSAGE=""
CONFIRM=true
PUSH=true
MONITOR=true
BRANCH="main"  # default to main as per requirement
YES=false
PHASE_NUM=""
PHASE_NAME=""
COMMIT_TYPE=""
COMMIT_SCOPE=""
COMMIT_SUBJECT=""

usage() {
  echo "Usage: $0 [options]"
  echo "Automates phase completion: commit changes, push, and monitor CI."
  echo "Options:"
  echo "  -p, --phase <num>      Phase number (e.g., 2)"
  echo "  -P, --phase-name <name> Phase name (e.g., \"Health Dashboard\")"
  echo "  -m, --message <msg>    Full conventional commit message (overrides auto-gen)"
  echo "  -t, --type <type>      Commit type (feat, fix, chore, etc.) for auto-gen"
  echo "  -s, --scope <scope>    Commit scope for auto-gen"
  echo "  -S, --subject <sub>    Commit subject for auto-gen"
  echo "  -b, --branch <branch>  Branch to push (default: main)"
  echo "  -n, --no-push          Only commit, don't push"
  echo "  -N, --no-monitor       Don't monitor CI after push"
  echo "  -y, --yes              Skip confirmation prompts"
  echo "  -h, --help             Show this help"
  exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--phase)
      PHASE_NUM="$2"
      shift 2
      ;;
    -P|--phase-name)
      PHASE_NAME="$2"
      shift 2
      ;;
    -m|--message)
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    -t|--type)
      COMMIT_TYPE="$2"
      shift 2
      ;;
    -s|--scope)
      COMMIT_SCOPE="$2"
      shift 2
      ;;
    -S|--subject)
      COMMIT_SUBJECT="$2"
      shift 2
      ;;
    -b|--branch)
      BRANCH="$2"
      shift 2
      ;;
    -n|--no-push)
      PUSH=false
      shift
      ;;
    -N|--no-monitor)
      MONITOR=false
      shift
      ;;
    -y|--yes)
      YES=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# If phase number and name provided, auto-generate commit message if not set
if [[ -n "$PHASE_NUM" && -n "$PHASE_NAME" && -z "$COMMIT_MESSAGE" ]]; then
  COMMIT_TYPE="${COMMIT_TYPE:-feat}"
  COMMIT_SCOPE="phase-$PHASE_NUM"
  COMMIT_SUBJECT="complete $PHASE_NAME implementation"
  COMMIT_MESSAGE="${COMMIT_TYPE}(${COMMIT_SCOPE}): ${COMMIT_SUBJECT}"
fi

# Check for uncommitted changes
if [[ -z "$(git status --porcelain)" ]]; then
  echo -e "${YELLOW}No changes to commit.${NC}"
  exit 0
fi

# Build commit message if still empty
if [[ -z "$COMMIT_MESSAGE" ]]; then
  if [[ -n "$COMMIT_TYPE" ]]; then
    COMMIT_MESSAGE="${COMMIT_TYPE}"
    if [[ -n "$COMMIT_SCOPE" ]]; then
      COMMIT_MESSAGE="${COMMIT_MESSAGE}(${COMMIT_SCOPE})"
    fi
    COMMIT_MESSAGE="${COMMIT_MESSAGE}: ${COMMIT_SUBJECT}"
    if [[ -z "$COMMIT_SUBJECT" ]]; then
      COMMIT_MESSAGE="${COMMIT_TYPE}"
      [[ -n "$COMMIT_SCOPE" ]] && COMMIT_MESSAGE="${COMMIT_MESSAGE}(${COMMIT_SCOPE})"
    fi
  else
    echo -e "${YELLOW}Enter conventional commit message:${NC}"
    read -r COMMIT_MESSAGE
    if [[ -z "$COMMIT_MESSAGE" ]]; then
      echo -e "${RED}Error: Commit message cannot be empty${NC}"
      exit 1
    fi
  fi
fi

# Confirm commit
if [[ "$CONFIRM" = true && "$YES" = false ]]; then
  echo -e "${YELLOW}The following changes will be committed:${NC}"
  git status --short
  echo -e "\n${YELLOW}Commit message:${NC} $COMMIT_MESSAGE"
  echo -e "${YELLOW}Target branch: $BRANCH${NC}"
  read -p "Proceed with commit and push? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Stage all changes
echo -e "${GREEN}Staging all changes...${NC}"
git add -A

# Commit
echo -e "${GREEN}Committing with message: $COMMIT_MESSAGE${NC}"
if git commit -m "$COMMIT_MESSAGE"; then
  echo -e "${GREEN}✓ Commit successful${NC}"
else
  echo -e "${RED}✗ Commit failed${NC}"
  exit 1
fi

# Push
if [[ "$PUSH" = false ]]; then
  echo -e "${YELLOW}Skipping push (--no-push).${NC}"
  exit 0
fi

# Ensure we are on the intended branch? If current branch differs, abort.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo -e "${YELLOW}Current branch ($CURRENT_BRANCH) differs from target ($BRANCH).${NC}"
  echo "Aborting for safety. Use --branch $CURRENT_BRANCH if you intended to push this branch."
  exit 1
fi

echo -e "${GREEN}Pushing to origin/$BRANCH...${NC}"
if git push origin "$BRANCH"; then
  echo -e "${GREEN}✓ Push successful${NC}"
else
  echo -e "${RED}✗ Push failed${NC}"
  exit 1
fi

# Monitor CI
if [[ "$MONITOR" = false ]]; then
  echo -e "${YELLOW}Skipping CI monitoring (--no-monitor).${NC}"
  echo "::phase-completion::success phase=$PHASE_NUM commit=$(git rev-parse --short HEAD) branch=$BRANCH (CI not monitored)"
  exit 0
fi

# Check for required tools
if ! command -v curl &>/dev/null; then
  echo -e "${RED}Error: curl is required for CI monitoring${NC}"
  echo "::phase-completion::failed phase=$PHASE_NUM error=\"curl missing\""
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq is required for CI monitoring${NC}"
  echo "::phase-completion::failed phase=$PHASE_NUM error=\"jq missing\""
  exit 1
fi

# Get GitHub token
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo -e "${YELLOW}GITHUB_TOKEN not set. Cannot monitor CI.${NC}"
  echo "Set GITHUB_TOKEN environment variable with a GitHub personal access token."
  echo "::phase-completion::success phase=$PHASE_NUM commit=$(git rev-parse --short HEAD) branch=$BRANCH (CI not monitored, token missing)"
  exit 0
fi

# Get repository owner/name
REMOTE_URL=$(git remote get-url origin)
if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo -e "${RED}Could not parse GitHub repository from remote URL: $REMOTE_URL${NC}"
  echo "::phase-completion::failed phase=$PHASE_NUM error=\"cannot parse repo\""
  exit 1
fi

echo -e "${GREEN}Monitoring CI for $OWNER/$REPO on branch $BRANCH...${NC}"

# Poll for workflow run
MAX_ATTEMPTS=60
ATTEMPT=0
RUN_ID=""
while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
  ATTEMPT=$((ATTEMPT+1))
  # Fetch latest push event runs for this branch
  RESPONSE=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/actions/runs?branch=$BRANCH&event=push&per_page=1")
  RUN_ID=$(echo "$RESPONSE" | jq -r '.workflow_runs[0].id // empty')
  if [[ -z "$RUN_ID" ]]; then
    echo "Waiting for CI to start... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 10
    continue
  fi

  # Get run details
  RUN_URL="https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID"
  RUN_DETAILS=$(curl -s -H "Authorization: token $TOKEN" "$RUN_URL")
  STATUS=$(echo "$RUN_DETAILS" | jq -r '.status')
  CONCLUSION=$(echo "$RUN_DETAILS" | jq -r '.conclusion // empty')

  case "$STATUS" in
    queued|in_progress)
      echo -e "${YELLOW}CI status: $STATUS... (attempt $ATTEMPT/$MAX_ATTEMPTS)${NC}"
      sleep 30
      ;;
    completed)
      case "$CONCLUSION" in
        success)
          echo -e "${GREEN}✓ CI passed!${NC}"
          echo "Workflow run: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
          COMMIT_SHA=$(git rev-parse HEAD)
          echo "::phase-completion::success phase=$PHASE_NUM commit=$COMMIT_SHA run_id=$RUN_ID branch=$BRANCH"
          exit 0
          ;;
        failure|cancelled|timed_out|neutral)
          echo -e "${RED}✗ CI $CONCLUSION${NC}"
          echo "Workflow run: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
          echo "::phase-completion::failed phase=$PHASE_NUM conclusion=$CONCLUSION run_id=$RUN_ID branch=$BRANCH"
          exit 1
          ;;
        *)
          echo -e "${YELLOW}CI completed with conclusion: $CONCLUSION (unexpected)${NC}"
          echo "::phase-completion::failed phase=$PHASE_NUM conclusion=$CONCLUSION run_id=$RUN_ID branch=$BRANCH"
          exit 1
          ;;
      esac
      ;;
    *)
      echo "Unexpected status: $STATUS"
      sleep 10
      ;;
  esac
done

echo -e "${RED}Timeout waiting for CI.${NC}"
echo "Check manually: https://github.com/$OWNER/$REPO/actions"
echo "::phase-completion::failed phase=$PHASE_NUM error=\"timeout\""
exit 1