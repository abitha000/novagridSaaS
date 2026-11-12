# Live Supabase preflight audit

Audit date: 2026-11-11  
Project: `novagridSaaS` (`weyjtsowvltqbrzltnic`)  
Region: `ap-southeast-2` (Sydney)  
PostgreSQL: `17.11.0.018`  
Project status at audit: `ACTIVE_HEALTHY`

## Executive decision

**NO-GO for the NOVAGRID production schema rollout at this time.** This audit was read-only. No migration, table, policy, function, bucket, user, or project setting was changed.

The live project is still the original Figma KV scaffold, not the NOVAGRID relational application database. The live migration ledger contains only `20261110084730_create_kv_table_5a875bd1`. The only public table returned by the schema inventory is `public.kv_store_5a875bd1`; no NOVAGRID public tables are installed. The live Storage bucket inventory is empty.

## Verified live findings

| Area | Observed state | Consequence |
|---|---|---|
| Migration history | One migration: `20261110084730` | NOVAGRID migrations 0001–0016 are all pending |
| Public schema | Only `kv_store_5a875bd1` | Registration, tenant, platform, billing, contacts and notification APIs cannot operate against the live database |
| Storage | No buckets present | `novagrid-files`, its private policies and quota trigger are not installed |
| Legacy helper | `public.rls_auto_enable()` is SECURITY DEFINER and EXECUTE is currently granted to both `anon` and `authenticated` | External API roles can call an exposed privileged helper |
| KV table | RLS enabled, zero policies | API roles cannot access it through ordinary RLS-protected queries; this is an INFO finding, not a reason to expose it |
| Security advisor | 1 INFO and 2 WARN findings | The WARN findings are the legacy helper grants; the INFO finding is the policy-less KV table |
| Performance advisor | 1 INFO finding: unused KV key index | No NOVAGRID performance conclusion is possible before the schema exists |
| Health advisor | No findings | This does not certify application schema/security readiness |

The repository already contains migration `20261110110800_harden_legacy_rls_auto_enable.sql`, which revokes `PUBLIC`, `anon`, and `authenticated` execution while preserving the DDL event trigger. It has **not** been applied to the live project. Do not grant API access to the KV table merely to silence the RLS-without-policy notice.

## Migration inventory correction

The production runbook must list all 16 NOVAGRID migrations, in timestamp order:

1. `20261110110000_novagrid_foundation.sql`
2. `20261110110100_novagrid_platform.sql`
3. `20261110110200_novagrid_tenant_core.sql`
4. `20261110110300_novagrid_security_rls.sql`
5. `20261110110400_novagrid_registration_admin_rpc.sql`
6. `20261110110500_novagrid_notifications.sql`
7. `20261110110600_novagrid_audit_triggers.sql`
8. `20261110110700_novagrid_seed_reference_data.sql`
9. `20261110110800_harden_legacy_rls_auto_enable.sql`
10. `20261111120000_novagrid_industry_pricing.sql`
11. `20261111133000_enforce_subscription_capacity.sql`
12. `20261111140000_enforce_monthly_message_quota.sql`
13. `20261111150000_enforce_tenant_storage_quota.sql`
14. `20261111160000_harden_tenant_storage_mutations.sql`

There are 14 NOVAGRID migrations (0001–0016 numbering has gaps in timestamps; do not infer count from version labels) plus the existing Figma KV migration. The list above is the complete current repository inventory.

## Required blockers before a production rollout

1. **Backup and restore:** obtain a provider-confirmed backup/PITR status and retention window from the Supabase Dashboard. The connected project tools did not expose backup inventory or prove a restorable backup. A backup is not verified until a restore/recovery procedure is documented and a restore rehearsal is completed.
2. **Resolve the live legacy helper warning:** apply and verify migration 0009 as part of the ordered rollout, or perform an explicitly approved isolated hotfix. Re-run Security Advisor and verify `has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') = false` and the same for `authenticated`.
3. **Full migration review:** review all 14 migrations in order, including RLS, SECURITY DEFINER functions, trigger behavior, Storage policy compatibility and seed/pricing data. PostgreSQL CI is useful but is not a complete Supabase emulator.
4. **RLS adversarial rehearsal:** use two disposable organisations and two Auth users. Test cross-tenant SELECT/INSERT/UPDATE/DELETE, RPC authorization, role reassignment, last-owner protection and expired/suspended subscription behavior.
5. **Storage rehearsal:** after the Storage migrations are installed in an approved test environment, test private bucket upload/list/download/delete, cross-tenant guessed paths, signed URL expiry, quota enforcement, >1,000 object pagination and concurrent uploads.
6. **Platform bootstrap:** only after the schema is installed and verified, create a verified Auth user and grant the first super-admin using the controlled procedure in `docs/12-first-platform-admin-bootstrap.md`.
7. **Application rehearsal:** registration → email confirmation → platform category approval → trial assignment → staff/contact operations → file operations. Do not enable payment or provider dispatch; those integrations are not implemented.

## Backup and rollout limits

The project connector provides read-only project/schema inspection and migration execution, but it did not provide a backup inventory or a restore-verification action. Do not claim a backup exists based only on project status. The user has not explicitly approved a production schema rollout. Keep the live project untouched until the backup, review and test gates are met and the rollout is explicitly approved.

## Audit evidence

Read-only checks used:
- Supabase migration ledger.
- Public/private/Storage table inventory with RLS and columns.
- Direct function privilege check for `public.rls_auto_enable()`.
- Storage bucket inventory.
- Security, Performance and Health Advisors.

No secrets, service-role keys, personal data, or production rows were queried.


## Verification refresh — 2026-11-12

Latest merged main commit `64ee0ddb612813f9f8b005f527d94d1185c14152` has green NOVAGRID CI, migration validation, local Supabase integration and isolated preflight script validation. PR #52 adds Storage API tests (own upload/list/signed read/delete, cross-tenant denial, quota rejection); PR #53 adds unconfirmed-email, registration validation and platform approval negative tests. Full PASS details are recorded in `docs/18-local-supabase-integration.md`.

A fresh read-only inspection of the connected hosted project reconfirmed:
- Migration ledger contains only `20261110084730_create_kv_table_5a875bd1`.
- Public application schema remains absent; only the Figma KV scaffold table exists.
- Storage bucket inventory is empty.
- Legacy `public.rls_auto_enable()` remains callable by `anon` and `authenticated` as SECURITY DEFINER; migration 0009 has not been applied.
- Security Advisor reports the legacy helper as two WARN findings and the policy-less KV table as one INFO finding.
- No NOVAGRID hosted application test was run and no hosted schema/data/settings were changed.

GitHub's commit status for the latest merge records Vercel deployment rate limiting for 24 hours. A preview for this exact commit is therefore not available/verified.

The existing NO-GO decision remains. Automated CI success must not be represented as production test readiness.
