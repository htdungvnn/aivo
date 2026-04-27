# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the AIVO platform.

ADRs document important architectural decisions, the context leading to those decisions, and their consequences.

## What is an ADR?

An ADR is a short document that captures an important decision made during software architecture design, including:

- **Context** - What problem are we solving?
- **Decision** - What solution did we choose and why?
- **Consequences** - What are the outcomes, both positive and negative?
- **Alternatives** - What other options did we consider?

## ADR Status

- **Proposed** - Under consideration, not yet accepted
- **Accepted** - Agreed upon and implemented
- **Deprecated** - No longer relevant (superseded by newer decision)
- **Superseded** - Replaced by a newer ADR

## Creating a New ADR

1. Copy the template: `00-template.md`
2. Rename to sequential number: `001-<short-title>.md`
3. Fill in all sections
4. Submit for team review
5. Update status after team approval

## ADR Index

| # | Title | Status | Date | Supersedes |
|---|-------|--------|------|------------|
| 001 | Realtime Messaging Architecture for Social Features | Accepted | 2025-04-27 | - |
| 002 | Social Features Data Model and Schema Design | Accepted | 2025-04-27 | - |
| 003 | Gamification Leaderboard Caching Strategy | Accepted | 2025-04-27 | - |

---

## Template

See `00-template.md` for the ADR template.

---

## References

- [Michael Nygard's ADR concept](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr.github.io](https://adr.github.io/) - Tools and templates
