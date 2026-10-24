<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

<!-- BEGIN:aivo-agent-guidance -->

# AIVO agent guidance

## Before any task

Read the rules in `.cursor/rules/` - they are the source of truth for conventions:

- `0-aivo-core.mdc` - workspace map, commands, non-negotiable conventions
- `1-architecture.mdc` - monorepo boundaries and import rules
- `2-feature-workflow.mdc` - spec-driven workflow and verification
- `3-tool-routing.mdc` - which tool or MCP server to use
- `4-code-quality.mdc` - TypeScript, style, error handling, React
- `5-testing.mdc` - test levels, placement, naming
- `6-security.mdc` - secrets, input validation, authorization
- `7-git-workflow.mdc` - branching, commits, PRs, CI reference
- `8-cloudflare.mdc` - Workers runtime, D1/KV/R2/Queues, deploys

## Quick facts

- pnpm + Turborepo, Node >= 24. Run `pnpm lint`, `pnpm check-types`, `pnpm test` from the root before declaring work done.
- Only `apps/api` currently has tests (Vitest). Do not imply coverage elsewhere.
- `apps/api` is Hono on Cloudflare Workers with Zod + OpenAPI. `apps/web` is React on vinext/Vite targeting Workers. `apps/mobile` is Expo Router.
- Shared code goes in `packages/*`; `@repo/ui` exports flat `.tsx` files from `packages/ui/src`.
- Deploys to Cloudflare Workers happen automatically on merge to `main`.

## Commit safety

Never commit secrets. `.cursor/mcp.json` currently contains a GitHub token in plaintext - do not commit it and rotate the token.

<!-- END:aivo-agent-guidance -->

