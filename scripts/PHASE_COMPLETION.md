# Phase Completion Automation

This script automates the process of committing phase completion changes, pushing to remote, and validating CI.

## Features

- **Automatic Conventional Commits**: Generates commits in the format `feat(phase-{n}): complete {phase name} implementation`
- **Git Safety**: Confirmation prompts, branch validation, and clean staging
- **CI Monitoring**: Polls GitHub Actions to ensure the push triggers a successful workflow run
- **Machine-Readable Output**: Emits `::phase-completion::` status lines for automation integration
- **Flexible Options**: Customize commit message, skip push or monitoring, run non-interactively

## Prerequisites

- `git` configured with remote origin pointing to GitHub
- `curl` and `jq` installed for CI monitoring
- `GITHUB_TOKEN` environment variable with `repo` scope (for CI monitoring)
  - You can set it: `export GITHUB_TOKEN=ghp_your_token_here`

## Usage

```bash
# Basic usage with phase info (auto-generates commit message)
bash scripts/phase-completion.sh --phase 2 --phase-name "Health Dashboard" -y

# Provide full commit message manually
bash scripts/phase-completion.sh -m "feat(phase-3): complete social gamification features" -y

# Use custom commit type
bash scripts/phase-completion.sh --phase 1 --phase-name "Auth" --type feat -y

# Skip CI monitoring (e.g., for dry runs)
bash scripts/phase-completion.sh --phase 2 --phase-name "API" --no-monitor -y

# Only commit without pushing
bash scripts/phase-completion.sh --phase 2 --phase-name "Web" --no-push -y
```

## Options

| Flag | Description |
|------|-------------|
| `-p`, `--phase <num>` | Phase number (required for auto-generated commit) |
| `-P`, `--phase-name <name>` | Phase display name (required for auto-generated commit) |
| `-m`, `--message <msg>` | Full conventional commit message (overrides auto-generation) |
| `-t`, `--type <type>` | Commit type (feat, fix, chore, etc.) |
| `-s`, `--scope <scope>` | Commit scope (e.g., "api", "web") |
| `-S`, `--subject <subject>` | Commit subject line |
| `-b`, `--branch <branch>` | Branch to push (default: `main`) |
| `-n`, `--no-push` | Stage and commit only, do not push |
| `-N`, `--no-monitor` | Skip CI monitoring after push |
| `-y`, `--yes` | Skip all confirmation prompts |
| `-h`, `--help` | Show help message |

## Git Hook Integration

You can create a git alias for easy access:

```bash
git config --global alias.phase-complete '!bash scripts/phase-completion.sh'
```

Then run:

```bash
git phase-complete --phase 2 --phase-name "Health Dashboard" -y
```

## TaskList Integration

When a phase is marked complete in the TaskList, the techlead or agent should:

1. Ensure all changes for the phase are committed (or use the script to commit them)
2. Run the script with appropriate phase number and name
3. The script will push and monitor CI
4. Upon success/failure, the script emits a machine-readable status line that can be captured and reported

Example agent workflow:

```bash
OUTPUT=$(bash scripts/phase-completion.sh --phase 2 --phase-name "Health Dashboard" -y 2>&1)
STATUS=$?
# Parse OUTPUT for ::phase-completion:: line and report to techlead
```

## CI Monitoring

The script uses the GitHub API to poll the latest workflow run for the pushed branch. It waits up to 30 minutes (60 attempts × 30 seconds) for completion. Adjust `MAX_ATTEMPTS` and `sleep` intervals in the script if needed.

If `GITHUB_TOKEN` is not set, the script will still commit and push but will skip monitoring and exit with a success status (assuming push succeeded). A warning is printed.

## Exit Codes

- `0`: Success (commit, push, and CI passed)
- `1`: Failure (commit error, push error, CI failure, or timeout)
- `0` (with no changes): No changes to commit

## Output

The script prints colored status messages to stdout. At the end, it emits a machine-readable line:

- Success: `::phase-completion::success phase=<num> commit=<sha> run_id=<id> branch=<branch>`
- Failure: `::phase-completion::failed phase=<num> conclusion=<status> run_id=<id> branch=<branch>`

This allows automated tools to parse the result easily.

## Safety Notes

- The script stages **all** changes (`git add -A`). Ensure you are ready to commit everything.
- By default, it pushes to `main`. Use `--branch` to target a different branch.
- It aborts if the current branch differs from the target branch to prevent accidental pushes to the wrong branch.
- Confirmation is required unless `-y` is used.
- The script does not force-push; it performs a standard push.

## Troubleshooting

**"GITHUB_TOKEN not set"**: Set the environment variable with a token that has `repo` access.

**"Could not parse GitHub repository"**: Ensure your remote origin is in the format `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`.

**CI monitoring times out**: Check the GitHub Actions page manually; the workflow may have been queued or there may be network issues. Increase `MAX_ATTEMPTS` if your CI takes longer.

**curl or jq not found**: Install them (`apt install curl jq` on Ubuntu, `brew install curl jq` on macOS).

## Future Enhancements

- Integration with TaskList API to automatically trigger when all tasks in a phase are marked complete
- Automatic creation of GitHub release or tag upon successful phase completion
- More sophisticated change filtering (e.g., only commit files related to the phase)
- Support for multiple remotes and branch tracking