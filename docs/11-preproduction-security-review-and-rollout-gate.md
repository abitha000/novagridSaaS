# NOVAGRID pre-production security review and rollout gate

Status: zero-additional-cost PostgreSQL 17 CI is configured on `main`. Production rollout remains blocked until the latest CI run, security, backup and application-level gates below are complete.

## Environment facts verified on 2026-11-10

- Target Supabase project: `novagridSaaS` (`weyjtsowvltqbrzltnic`), ACTIVE_HEALTHY, ap-southeast-2, PostgreSQL 17.
- The live database still has only the original `public.kv_store_5a875bd1` table and migration `20261110084730`.
- No NOVAGRID relational migrations have been applied to the live project.
- The existing KV table has RLS enabled and no policies. Preserve it; do not drop or expose it as part of NOVAGRID rollout.
- The existing project has a SECURITY DEFINER event-trigger function `public.rls_auto_enable()` executable by anon and authenticated. The live Supabase Security Advisor still flags this because migration 0009 has not been applied to the live database. Migration 0009 revokes API-role EXECUTE grants while preserving the event trigger; verify the finding disappears after a controlled rollout. The KV table RLS-without-policy finding is intentional for the preserved scaffold and should not be exposed.

## Migration 0009

- Revokes direct EXECUTE privileges on the legacy `public.rls_auto_enable()` function from `PUBLIC`, `anon` and `authenticated` when it exists, while preserving its event trigger. The function definition and event trigger must still be reviewed against the live project before relying on this mitigation.

## Changes in this branch after the first successful CI run

- Serialize last-owner changes by locking the parent organisation row before checking remaining owners.
- Require `core.contacts` entitlement when recording communication consent.
- Delay queued notification recipients until the campaign's scheduled time.
- Attribute subscription audit events to their organisation tenant.
- Tighten phone/email validation expressions.

The latest branch head passed the PostgreSQL 17 GitHub Actions migration and smoke-test job. This validates migration syntax and the included smoke tests, not all application-level security gates.

## Zero-additional-cost validation environment

- Do not create a paid Supabase branch or another Supabase project for routine staging.
- GitHub Actions provisions an ephemeral PostgreSQL 17 service container for each CI run, applies all committed migrations, and runs the SQL smoke tests. The container is discarded after the job.
- Vercel Preview deployments may be used for frontend review with non-production test credentials. Never point preview builds at production write credentials.
- This PostgreSQL container is not a complete Supabase emulator: Auth, Storage, Edge Functions, Realtime, provider webhooks and production backup/restore still require separate validation. Storage SQL policies are smoke-tested against a minimal fixture only; real Storage API behavior is not certified by CI.
- Production Supabase remains read-only until an approved rollout window and verified backup are in place.

## Security review gates

1. Keep the PostgreSQL 17 GitHub Actions check green on every change; all ten migrations and smoke tests passed on the current head.
2. Automated smoke tests now include tenant isolation, cross-tenant writes, platform-only approval/suspension/subscription RPC denial for tenant owners, legacy SECURITY DEFINER RPC grants, plan/category alignment, capacity/pricing catalogue checks and last-owner protections. Continue expanding tests for:
   - tenant A cannot read/write tenant B records;
   - wrong-tenant role assignment is rejected;
   - tenant role ownership cannot be reassigned;
   - last active owner cannot be demoted, disabled or deleted;
   - only platform super-admin can approve/reject organisations or assign subscriptions;
   - plan/category mismatch is rejected;
   - contacts and communications are blocked without module entitlements;
   - opted-out/unknown-consent contacts are skipped;
   - scheduled notifications are not eligible for dispatch before scheduled_at;
   - audit rows redact contact data and are tenant-scoped.
3. Create the first platform super-admin through a one-time controlled SQL/admin process after migration. Never add a hard-coded admin identity or expose service-role credentials in the browser.
4. Review and harden the existing `public.rls_auto_enable()` EXECUTE grants flagged by Security Advisor. Keep the event trigger itself intact unless separately reviewed.
5. Confirm the production app environment uses only the Supabase anon/publishable key, with RLS protecting every exposed table. Service-role key belongs only in trusted server/Edge Function secrets.
6. Confirm the invite-staff Edge Function is deployed with JWT verification and checks `can_manage_staff` using the caller's JWT before using service-role privileges.
7. Confirm no notification provider dispatch is enabled until Meta WhatsApp opt-in/templates, India SMS DLT, provider secrets, signed webhook verification, retries and idempotency are implemented and tested. Current SQL only persists campaigns/recipients; it does not send messages.
8. Back up the project and export the current schema before any production DDL. Do not use `db reset`, drop the KV table, or apply draft files under `supabase/proposed-migrations/`.

## Controlled rollout sequence

1. Obtain a fresh green CI run on the final commit.
2. Take a Supabase backup and export current schema.
3. Apply only `supabase/migrations/*.sql` sequentially using the migration runner; never apply `supabase/proposed-migrations/`.
4. Verify migration history and schema version 10, RLS/force-RLS on every NOVAGRID table, grants, functions and triggers.
5. Run Supabase Security, Performance and Health Advisors; resolve all NOVAGRID findings.
6. Bootstrap the first platform super-admin through a secure one-time procedure; verify the admin can sign in and no tenant can impersonate platform roles.
7. Connect the app and verify registration, approval, subscription assignment, staff invitations, contact CRUD and tenant isolation with two test organisations.
8. Keep provider dispatch disabled until its separate delivery pipeline is implemented.
9. Before enabling tenant file management on a real project, run the Storage rehearsal below with two disposable organisations and authenticated users.

## Required real-Supabase Storage rehearsal (not covered by PostgreSQL CI)

Use disposable test organisations only after the reviewed migrations have been applied in an approved environment. Do not use production customer files. Verify: (1) authenticated tenant A can list, upload, open and delete its own file; (2) tenant A cannot list, sign, overwrite or delete tenant B's object by guessing its path; (3) a non-member receives no object metadata or signed URL; (4) expired, suspended and non-approved organisations cannot upload, update or delete; (5) a file larger than remaining quota is rejected and concurrent uploads cannot exceed quota; (6) pagination returns all files when more than 1,000 objects exist; (7) Storage object metadata reports byte size as expected; and (8) signed URLs expire after the configured 60 seconds. Record the project, test identities, outcomes and cleanup. Never place service-role credentials in the browser.

## Known product limitations

- Gym and Education launch prices in migration 0010 are proposed commercial rates and require validation before real billing.
- No payment gateway activation/webhook flow is implemented yet.
- No notification provider dispatcher or webhook handler is implemented yet.
- Gym and Education domain-specific tables/flows are not part of these ten migrations.
- A green migration smoke test is not a substitute for application-level, adversarial RLS tests or a backup/restore rehearsal.
