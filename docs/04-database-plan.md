# 04 – Database Relationship Plan

## Conventions
- UUID PKs (`gen_random_uuid()`), `created_at`, `updated_at`, soft delete (`deleted_at`) where retention matters.
- `tenant_id uuid NOT NULL REFERENCES organisations(id)` on every tenant-owned table, indexed as the leading column.
- Child tables use composite FKs `(tenant_id, parent_id)` → parent `UNIQUE (tenant_id, id)`.
- Enums via lookup tables or CHECK constraints, kept in migrations.
- Every table has RLS enabled, with no table left in `public` without a policy.
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, forward-only. Each table is documented with `COMMENT ON` and mirrored in `docs/schema/`.

## 1. Platform schema
| Table | Key columns | Relationships |
|---|---|---|
| platform_users | id (= auth.users.id), role (super_admin/support), status | 1:1 auth user |
| industry_categories | id, key, name, terminology jsonb, active | 1:N organisations, modules |
| organisations | id (= tenant_id), name, industry_category_id, org_type, owner contact fields, address, country/state/city, approval_status, lifecycle_status, verified_email_at, verified_phone_at, suspended_at | N:1 category |
| organisation_approvals | id, organisation_id, requested_category_id, decision, decided_by, reason, decided_at | N:1 organisation, platform_users |
| subscription_plans | id, key, tier, name, industry_category_id nullable, price, currency, interval, limits jsonb | 1:N entitlements, subscriptions |
| subscriptions | id, organisation_id, plan_id, status, period start/end, grace_until, gateway refs | N:1 org, plan |
| subscription_addons | id, subscription_id, addon_key | N:1 subscription |
| module_catalogue | id, key, scope (core/industry), industry_category_id nullable, name | CHECK: industry scope ⇒ category not null |
| plan_entitlements | plan_id, module_id, feature flags | N:M plan↔module, trigger validates module industry = plan industry or core |
| organisation_settings | organisation_id PK, branding jsonb, locale, timezone, white_label_domain | 1:1 org |
| usage_counters | organisation_id, metric, period, value | quota checks |
| support_access_grants | id, organisation_id, platform_user_id, expires_at, reason, granted_by | audited impersonation-free access |
| audit_logs | id, tenant_id nullable, actor_type, actor_id, action, entity, entity_id, before/after jsonb, ip, user_agent, created_at | append-only, no UPDATE/DELETE grants |
| security_events | id, type, actor, ip, metadata | login failures, RLS denials |
| webhook_events | id, provider, event_id UNIQUE, payload, processed_at | idempotent webhook intake |

## 2. Tenant core
| Table | Key columns | Relationships |
|---|---|---|
| tenant_users | tenant_id, user_id, role_id, status, invited_by | N:M auth user↔org |
| roles | id, tenant_id nullable (null = system role), key, name | 1:N role_permissions |
| permissions | id, key (e.g. `contacts.view`), module_key, action | global catalogue |
| role_permissions | role_id, permission_id, resource_scope jsonb | N:M, resource-level restrictions |
| branches | id, tenant_id, name, address | optional resource scoping |
| contacts | id, tenant_id, type, full_name, phone_e164, email, attributes jsonb, status | recipients with no account. Unique `(tenant_id, phone_e164)` |
| contact_groups, contact_group_members | tenant_id, contact_id, group_id | static lists (internal only) |
| contact_relationships | tenant_id, from_contact, to_contact, kind | for example guardian ↔ student |
| communication_preferences | tenant_id, contact_id, channel, consent_status, consent_source, consented_at, revoked_at, quiet_hours | consent ledger (append history in `consent_events`) |
| notification_templates | tenant_id, channel, name, body, variables, provider_template_id, dlt_template_id, provider_status | |
| notifications | tenant_id, created_by, channel plan, template_id, audience_definition jsonb, scheduled_at, status | campaign |
| notification_recipients | tenant_id, notification_id, contact_id, channel, idempotency_key UNIQUE, status, provider_message_id, attempts, next_attempt_at, error_code, timestamps | one row per contact × channel |
| notification_events | recipient_id, status, provider_event_id, at, raw | delivery timeline from webhooks |
| message_jobs | queue rows or pgmq | worker claims |
| payment_records | tenant_id, contact_id, amount, currency, method, status, source (gateway/manual), reference | |
| invoices | tenant_id, number, contact_id, lines jsonb, total, status | |
| documents | tenant_id, bucket_path, mime, size, checksum, owner entity, uploaded_by | Storage path `tenant_id/...` |
| workflows, workflow_runs | tenant_id, trigger, steps jsonb, status | |
| schedules / events | tenant_id, title, starts_at, resource refs | |
| data_exports | tenant_id, requested_by, status, file | audited |
| retention_policies | tenant_id, entity, days | |

## 3. Industry schemas (separate Postgres schemas, all with `tenant_id`)
- `gym`: members (→ contacts), membership_plans, memberships, attendance, trainers, pt_sessions, gym_payments.
- `edu`: students (→ contacts), guardians (→ contacts), student_guardians, classes, sections, enrolments, attendance, fee_structures, fee_dues, timetable_slots, exams, exam_results, bus_routes, bus_stops, buses, bus_allocations (student↔bus↔stop).
- `hospital` (later): patients, appointments, doctors, departments, queue_tickets, clinical_access_log.
- `hotel`, `restaurant`: planned in Phase 8.

Audience example: `bus_allocations` joins to students, `student_guardians` and `contacts`, so the resolver returns contact IDs for `bus_id = 14` without any manual list.

## 4. Key relationship diagram (simplified)
```
industry_categories 1─N organisations 1─N subscriptions N─1 subscription_plans N─M module_catalogue
organisations 1─N tenant_users N─1 roles N─M permissions
organisations 1─N contacts 1─N communication_preferences
notifications 1─N notification_recipients N─1 contacts ; recipients 1─N notification_events
edu.students N─M edu.guardians (both → contacts) ; edu.bus_allocations → students, buses, stops
```

## 5. Indexing
`(tenant_id, created_at)`, `(tenant_id, phone_e164)`, `notification_recipients (status, next_attempt_at) WHERE status IN ('queued','retry')`, GIN on jsonb attributes only where queried, and `audit_logs (tenant_id, created_at)` (partitioned monthly later).
