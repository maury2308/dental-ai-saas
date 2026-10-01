# Supabase Postgres Best Practices

Load this skill BEFORE writing or changing anything that lives in a Postgres database, including schema design, RLS policies, and migrations. Use this skill to diagnose slow queries, high CPU, timeouts, and connection issues.

## Priorities by Impact

1. **Query Performance (CRITICAL)**: Focus on index optimization, avoiding sequential scans on large tables, and optimizing JOINs.
2. **Connection Management (CRITICAL)**: Manage connections efficiently to avoid exhaustion; use pooling where appropriate.
3. **Security & RLS (CRITICAL)**: Ensure Row Level Security is correctly implemented and doesn't introduce performance bottlenecks.
4. **Schema Design (HIGH)**: Optimize data types and normalization.
5. **Concurrency & Locking (MEDIUM-HIGH)**: Minimize locking contention and avoid long-running transactions.
6. **Data Access Patterns (MEDIUM)**: Optimize how data is retrieved and updated.
7. **Monitoring & Diagnostics (LOW-MEDIUM)**: Use EXPLAIN ANALYZE and system views for debugging.
8. **Advanced Features (LOW)**: Utilize specialized Postgres features only when necessary.

## General Guidance
Always contrast "Incorrect SQL" with "Correct SQL" examples and verify improvements with EXPLAIN output or actual metrics.
