# NOVAGRID Supabase migration runbook

## Current state

- Repository branch: `fix/initial-supabase-migrations`
- The eight reviewed, ordered migrations are in `supabase/migrations/` and are now in the standard Supabase CLI migration directory.
- The original `supabase/proposed-migrations/` files are retained as historical drafts; do not apply those.
- The existing Supabase project currently has only the Figma KV scaffold migration/table. These NOVAGRID migrations have **not** been applied to the live project.
- The KV scaffold is intentionally left untouched.

## Migration order

1. `20261110110000_novagrid_foundation.sql`
2. `20261110110100_novagrid_platform.sql`
3. `20261110110200_novagrid_tenant_core.sql`
4. `20261110110300_novagrid_security_rls.sql`
5. `20261110110400_novagrid_registration_admin_rpc.sql`
6. `20261110110500_novagrid_notifications.sql`
7. `20261110110600_novagrid_audit_triggers.sql`
8. `20261110110700_novagrid_seed_reference_data.sql`

## Before applying to production

1. Create a Supabase staging project or database branch and apply the migrations there first.
2. Review the generated schema and run the RLS isolation tests (see below). The repo's original proposed migrations are not a substitute for tests.
3. Confirm `private` is not an exposed PostgREST schema. The frontend must use only the anon/publishable key; never put the service-role key in Vite variables.
4. Confirm the first platform administrator is created deliberately through a trusted admin-only operation. Do not expose a public signup path for platform admins.
5. Replace sample plan prices before commercial launch. Seeded plans are marked `is_sample = true`.
6. Only after staging passes, take a backup and apply to production in order.

## CLI workflow

From the repository root, after installing/linking the Supabase CLI and selecting the intended project:

```bash
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

Use `--dry-run` only if supported by the installed CLI version. Check the current Supabase CLI help before relying on flags. Do not run `db reset` against the production project.

## Required verification

- `public.novagrid_schema_version()` returns `8`.
- All NOVAGRID tables have RLS enabled and forced.
- A user in tenant A cannot read, insert, update, or reference tenant B's records.
- A tenant cannot assign a role created by another tenant.
- Only a platform super-admin can approve/reject an organisation, assign a subscription, suspend it, or change its industry category.
- A plan scoped to one industry cannot entitle another industry's modules.
- A tenant member cannot read another tenant's role-permission mappings or notification events.
- Notifications are persisted only. No WhatsApp/SMS/email provider dispatch exists yet. Before a dispatch worker is added, it must re-check current consent, recipient address, channel eligibility, quiet hours, subscription entitlement, and notification schedule immediately before sending.
- The last active owner cannot be removed, demoted, or disabled.
- Audit records do not contain phone numbers, email addresses, contact attributes, message bodies, or webhook payloads.

## Known limitations / follow-up migrations

These migrations establish the control plane, tenant core, security policies, consent ledger, and notification persistence. They do not implement provider dispatch, WhatsApp/SMS/email webhooks, payment gateway integration, subscription lifecycle jobs, quota enforcement, storage documents, or Gym/Education domain tables. Those remain later phases. The invitation Edge Function is still a draft and must be reviewed, secured, and tested before deployment.
