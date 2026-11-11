# PR #23 — Isolated Supabase API preflight

This adds a manual, non-destructive check against a **disposable Supabase project**. It is deliberately separate from the free PostgreSQL 17 CI fixture.

## Required GitHub configuration

Repository secret values (set only after creating an isolated rehearsal project):
- `REHEARSAL_SUPABASE_URL`
- `REHEARSAL_SUPABASE_ANON_KEY`
- `REHEARSAL_SUPABASE_SERVICE_ROLE_KEY`

Repository variable:
- `NOVAGRID_PRODUCTION_PROJECT_REF` — the production project ref, to make the workflow refuse that target.

The operator must enter the rehearsal project ref twice when manually dispatching the workflow. The workflow also checks that the URL hostname ref matches the input and differs from the production ref.

## What it verifies

- The public schema-version RPC returns version 11.
- Anonymous PostgREST access returns no organisation rows.
- The private `novagrid-files` Storage bucket exists and is not public.
- The anon and service-role keys are distinct.

The script does not create or modify users, rows, files, buckets, or schema. The service-role key is used only to inspect bucket metadata in the workflow runner and is never printed.

## Limitations

This is a preflight, not the full application rehearsal. It does not verify authenticated tenant A/B isolation, email confirmation, registration, platform admin bootstrap, staff invitation, signed URL behavior, Storage upload/delete quotas, provider webhooks, or backup restoration. Those require disposable test identities and a separately approved test plan.

Do not configure production credentials as rehearsal secrets. No live project is modified by this change.
