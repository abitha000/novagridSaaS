# 05 – Tenant Security Plan

## 1. Threat model (summary)
Cross-tenant data read or write, privilege escalation, IDOR, leaked service-role key, forged provider webhooks, message spam or abuse, subscription bypass, and insider (platform support) over-reach.

## 2. Identity and sessions
- Supabase Auth with email/password plus MFA (TOTP) required for platform users and owners, and optional for staff. Email and phone verification before approval.
- Short-lived JWTs with refresh rotation, httpOnly secure cookies via server helpers, logout revokes the session, and idle timeout is stricter for the hospital category.
- Two realms: `app_metadata.realm` is `platform` or `tenant`. `app_metadata` is writable only by the server. A platform user can never act as a tenant user implicitly.

## 3. Tenant context
- Active tenant is passed explicitly with each request. The server validates membership in `tenant_users` and never trusts the client's claim of a tenant.
- SQL helpers (`SECURITY DEFINER`, fixed `search_path`): `is_tenant_member(tenant)`, `has_permission(tenant, key)`, `has_module_access(tenant, module)`, `is_writable(tenant)` (blocks writes in read-only and suspended states), `is_platform_admin()`.

## 4. RLS policy pattern
```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY contacts_select ON contacts FOR SELECT
  USING (has_permission(tenant_id,'contacts.view') AND has_module_access(tenant_id,'core.contacts'));
CREATE POLICY contacts_insert ON contacts FOR INSERT
  WITH CHECK (has_permission(tenant_id,'contacts.create') AND is_writable(tenant_id));
-- update/delete likewise; no policy ⇒ denied
```
- Default deny. A CI check fails if any table in an exposed schema lacks RLS or has `tenant_id` without a policy.
- Industry schemas are not exposed to the API roles unless the module is enabled, and RLS also calls `has_module_access` with the industry key.
- Platform tables are readable only by `is_platform_admin()`. Tenants get narrow views (own subscription, own plan).

## 5. RBAC
System roles: Owner, Admin, Manager, Operator, Accountant, Read-only. Permissions are `<resource>.<action>` with actions view, create, edit, delete, approve, export, manage_settings, manage_staff, send_communications. Resource-level restrictions come from `role_permissions.resource_scope` (for example branch, class or department). Only an Owner can transfer ownership. The last Owner cannot be removed (trigger). Role changes are audited.

## 6. Platform-only operations
Category approval and change, suspension, plan assignment and entitlement edits go through audited RPCs that check `is_platform_admin()`. A tenant cannot update `organisations.industry_category_id`, enforced by column privileges and a trigger. Support access requires a time-boxed grant with a reason, is read-only by default and is fully logged.

## 7. Secrets
Only `.env.example` is committed. Server-only variables (service-role key, WhatsApp token, SMS key, payment secret, webhook secrets) are never prefixed for the client. Provider credentials per tenant are stored encrypted (Supabase Vault or pgsodium), never readable via the API. Build step scans for leaked secrets (gitleaks in CI). **I will not ask for or handle production credentials.** Local development uses the Supabase CLI.

## 8. Input, API and abuse controls
Zod validation on every server function, parameterised queries only, per-IP and per-user rate limits on auth, registration and send endpoints, per-tenant message rate limits and daily caps, CAPTCHA on public registration, and webhook signature verification plus replay protection.

## 9. Files
Private buckets only, paths `tenant_id/entity/uuid`, and Storage RLS ties the path prefix to membership. Uploads validated by MIME sniffing, extension allow-list, size limit and optional malware scanning. Downloads via short-lived signed URLs.

## 10. Audit and monitoring
Append-only `audit_logs` written by triggers and server functions (actor, tenant, action, before/after, IP). Sensitive reads (patient records, exports) are logged too. `security_events` records failed logins, denied access and webhook failures, and platform admins can review them.

## 11. Privacy, consent, retention
Consent ledger per contact × channel, honour opt-out immediately, retention policy per entity with scheduled purge, data export and deletion workflows (DPDP-aligned), phone numbers masked in the UI by default, and minimum-necessary fields for health data with field-level permissions.

## 12. Backup and restore
Supabase PITR on the production project (owner enables it), a documented restore runbook, quarterly restore drills in staging, and exports of critical config.

## 13. Tenant-isolation test suite (mandatory CI gate)
1. Seed tenants A and B (different industries) with users in each role.
2. For every tenant table: A cannot SELECT, INSERT, UPDATE or DELETE B's rows, and cannot insert a row with B's `tenant_id` or a child pointing at a B parent.
3. A gym org cannot read `edu.*` data, even on the Enterprise plan.
4. Read-only and suspended subscriptions block writes.
5. Operator cannot manage staff, and Accountant cannot send messages.
6. Tenant users cannot change their category, plan or `organisations` approval fields.
7. Storage paths of other tenants are inaccessible.
8. Audience resolution for Bus 14 returns only Bus 14 contacts.
9. Webhook with bad signature is rejected, and a duplicate event is a no-op.
10. Meta-test: every table has RLS enabled.

## 14. Hospital addendum
Per-record access reasons, mandatory access logging on reads, optional break-glass flow, field-level restrictions, encryption of sensitive columns, shorter sessions, and a disclaimer that UOP is not a compliant EMR. A legal review is required before any launch (D9).
