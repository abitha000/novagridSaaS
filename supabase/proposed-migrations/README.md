# NOVAGRID proposed migrations (NOT APPLIED)

These files are drafts for your review. They have not been executed against any database, and they are
deliberately outside `supabase/migrations/` so `supabase db push` cannot pick them up by accident.

Apply only after approval, in order, first on a staging project or a Supabase branch:

1. Review each file. Check the sample prices and permission matrix in `0008`.
2. `git mv supabase/proposed-migrations/*.sql supabase/migrations/` (or copy the files)
3. `supabase link --project-ref <your-ref>` then `supabase db push` (or paste each file into the SQL editor in order)
4. Complete the manual steps in `docs/09-supabase-integration.md`.

Nothing here touches the existing `kv_store_5a875bd1` table.

Assumptions to confirm on your project: the `postgres` role keeps Supabase's default BYPASSRLS attribute (the SECURITY DEFINER
functions and `FORCE ROW LEVEL SECURITY` rely on it), and `pgcrypto`/`gen_random_uuid()` is available (PostgreSQL 13+).
Automated jobs that change organisation lifecycle (subscription expiry) must run as service role, which the 0004 guard trigger
will block unless a dedicated SECURITY DEFINER job function is added in a later migration.

| File | Contents | Schema version |
|---|---|---|
| 0001_foundation.sql | private schema, updated_at trigger, schema-version probe | 1 |
| 0002_platform.sql | categories, platform users, organisations, approvals, plans, subscriptions, modules, entitlements, settings, audit_logs | 2 |
| 0003_tenant_core.sql | roles, permissions, tenant users, contacts, consent | 3 |
| 0004_security_rls.sql | access helper functions and every RLS policy and grant | 4 |
| 0005_registration_admin_rpc.sql | registration, approval, suspension, subscription, consent RPCs | 5 |
| 0006_notifications.sql | templates, notifications, recipients, events, webhook intake, RPCs | 6 |
| 0007_audit_triggers.sql | audit triggers | 7 |
| 0008_seed_reference_data.sql | categories, permissions, system roles, modules, SAMPLE plans | 8 |
