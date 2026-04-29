# CI Smoke Tests Integration

This document describes the integration of automated smoke tests into the AIVO CI/CD pipeline.

## Overview

Smoke tests are executed automatically after each deployment to production and staging environments. They verify that the deployed API is healthy and core functionality is accessible.

## Workflow

The smoke tests are defined in `scripts/smoke-tests.sh`. The script performs:

1. Wait for API health endpoint to become ready (up to 60 seconds)
2. Test critical endpoints:
   - GET /health (expect 200)
   - GET / or /api (expect 200)
   - GET /docs (optional, may be disabled)
   - POST /api/auth/google (expect 400 with test token)
   - POST /api/auth/facebook (expect 400)
   - GET /api/users/me (expect 401)
3. Validate health response includes database, cache, and storage status
4. Summarize results and exit with appropriate code

## GitHub Actions Integration

### Production Deployment

The `.github/workflows/deploy.yml` workflow runs on push to `main`. After successful deployment to Cloudflare Workers, it executes:

```yaml
- name: Run Smoke Tests
  run: |
    if [ -z "$API_URL" ]; then
      echo "Error: PRODUCTION_API_URL secret is not set."
      exit 1
    fi
    bash scripts/smoke-tests.sh
  env:
    API_URL: ${{ secrets.PRODUCTION_API_URL }}
```

### Staging Deployment

The `.github/workflows/deploy-staging.yml` workflow runs on push to `staging` or manual dispatch. It deploys to the Cloudflare Workers staging environment and runs smoke tests against `STAGING_API_URL`.

## Required Secrets

To enable smoke tests, set these repository secrets in GitHub Settings → Secrets and variables → Actions:

- `PRODUCTION_API_URL` – Full URL of the production API (e.g., `https://api.aivo.your-domain.workers.dev`)
- `STAGING_API_URL` – Full URL of the staging API (e.g., `http://localhost:8787` or `https://staging.aivo.your-domain.workers.dev`)
- `DEPLOY_WEBHOOK_URL` – Slack/Discord incoming webhook URL for deployment notifications (optional but recommended)

## Notifications

After smoke tests complete, a notification is sent to the configured webhook (if set) with the deployment status (success/failure), commit SHA, branch, and a link to the workflow run.

## Local Testing

You can run smoke tests locally against any environment:

```bash
# Against production (set API_URL)
API_URL=https://api.aivo.website bash scripts/smoke-tests.sh

# Against local development
bash scripts/smoke-tests.sh  # defaults to http://localhost:8787
```

## Failure Handling

If smoke tests fail, the GitHub Actions job will fail, marking the deployment as unsuccessful. The notification step will still run (using `if: always()`) to alert the team.

## Future Enhancements

- Integrate with TaskList to automatically update phase completion status based on smoke test results
- Add more comprehensive endpoint coverage (e.g., actual data creation, AI chat)
- Performance benchmarking (response times)
- Canary analysis integration
