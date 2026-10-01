# Supabase Skill

Core guidance for working with the Supabase ecosystem.

## Core Principles
- **Verify Docs**: Supabase changes frequently. Always verify against current documentation and the changelog.
- **Validate**: Validate all fixes with test queries.
- **Iterate Carefully**: Avoid loops. If a method fails repeatedly, reconsider the entire approach.
- **API Exposure**: Ensure new tables are exposed via the Data (REST) API and have RLS enabled.
- **RLS Everywhere**: Implement Row Level Security on all tables in exposed schemas.

## Security Checklist
- **Auth**: Use `app_metadata` instead of `user_metadata` for authorization. Note that JWT claims may not always be fresh.
- **Keys**: Never expose `service_role` keys in public clients; use scoped tokens for the Management API.
- **Database**: 
  - Create views using `security_invoker = true`.
  - UPDATE policies must have both `USING` and `WITH CHECK` clauses.
- **Functions**: Prefer `SECURITY INVOKER` over `SECURITY DEFINER` to avoid permission bypasses.
- **Storage**: Upserting requires "INSERT + SELECT + UPDATE" permissions.

## Tooling & Workflow
- **CLI**: Use `--help` frequently. Use `supabase migration new` for imperative projects.
- **MCP Server**: Follow the standard troubleshooting sequence for connection/auth issues.
- **Documentation**: Priority: `search_docs` tool -> markdown pages -> web searches.
- **Schema Workflows**:
  - *Declarative*: Modify `supabase/schemas/` and generate migrations.
  - *Imperative*: Use `execute_sql` or `db query`, then `db pull` to commit.

## Debugging
Refer to "Monitoring and Debugging" documentation before diagnosing REST, Postgres, or service errors.
