# Project Guidelines

## Objective
Build a multi-tenant SaaS platform that acts as an AI customer service agent via WhatsApp for dental clinics (with flexibility for other businesses requiring appointment scheduling). The platform includes a web dashboard for business owners to manage the entire operation.

## Tech Stack
- Next.js (App Router)
- Supabase (Postgres + RLS)
- Tailwind CSS + shadcn/ui
- Claude AI (Anthropic API)

## Development Patterns
- **Multi-tenancy**: Every table must have a `tenant_id` for RLS.
- **Security**: 
    - No sensitive data in the codebase. Use `.env` or `.env.local`.
    - Never request credentials from the user; use `.env.example` for environment variable guidance.
    - Ensure `.gitignore` protects sensitive information.
    - RLS must be enabled on all Supabase tables.
- **UI**: Use shadcn/ui components for the admin panel.
- **Backend**: Prefer Supabase Edge Functions for WhatsApp webhooks.
- **Supabase/Postgres**: Always invoke the `supabase` and `supabase-postgres-best-practices` skills before making database changes or schema migrations.

## Commit Style
- Use clear, imperative messages.
- Include attribution lines as required.
