# ADR-001: Database Ownership Model

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

AIVO is a monorepo containing multiple microservices (Auth, Coach, Health, Nutrition, Mail, Gateway) that share a common database infrastructure using Cloudflare D1. Each service needs to own its data while maintaining clear boundaries.

## Decision

Each service owns its database schema and tables. Cross-service database access is prohibited.

### Service Ownership Map

| Service | Database | Tables |
|---------|----------|--------|
| Auth | `aivo-auth-db` | `users`, `sessions`, `refresh_tokens`, `audit_logs`, `user_identities`, `user_roles`, `roles`, `verification_codes` |
| Coach | `aivo-coach-db` | `exercises`, `workout_plans`, `workout_sessions`, `workout_sets`, `workout_reps`, `workout_corrections`, `workout_summaries`, `user_fitness_goals`, `user_exercise_preferences`, `ai_planning_jobs`, `workout_progress_summaries` |
| Health | `aivo-health-db` | `daily_readiness_snapshots`, `readiness_factor_snapshots`, `daily_intelligence_snapshots`, `daily_actions`, `daily_plan_adaptations`, `user_check_ins`, `health_metric_daily_summaries`, `chart_aggregation_snapshots`, `ai_insight_cache`, `user_health_targets`, `user_habits`, `daily_habit_completions`, `hydration_entries`, `health_report_schedules`, `health_report_jobs`, `health_reports` |
| Nutrition | `aivo-nutrition-db` | `foods`, `user_food_corrections`, `meal_analyses`, `meal_analysis_items`, `meals`, `meal_items`, `meal_plans`, `meal_plan_entries`, `nutrition_targets`, `daily_nutrition_summaries`, `ai_usage` |
| Mail | Stateless | No domain tables (only operational state if required) |
| Gateway | Minimal | No domain tables |

## Consequences

### Positive

- Clear ownership boundaries prevent data coupling
- Services can evolve independently
- Schema changes are isolated
- Database binding least privilege is possible

### Negative

- Cross-service queries require API calls
- Some data duplication may occur (e.g., user references)
- Event-driven coordination adds latency

## Implementation

### Directory Structure

```
apps/services/{service}/
  migrations/
    0001_initial_{service}_schema.sql
    0002_*.sql
  src/
    db/
      index.ts           # Database client and exports
      schema.ts         # Table definitions (optional)
      repositories/     # Service-specific repositories
        user-repository.ts
        session-repository.ts
      transactions/     # Transaction boundaries
        workout-transaction.ts
```

### Naming Conventions

- Database bindings follow pattern: `{service}_binding: D1Database`
- Table names use snake_case with service prefix
- Index names follow `idx_{table}_{column(s)}` pattern
- Foreign keys explicitly named: `fk_{table}_{referenced_table}`

## References

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Database Migration Strategy ADR](database-migration-strategy.md)
