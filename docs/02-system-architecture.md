# 02 – System Architecture

## 1. Principles
Modular monolith. Domain modules with explicit public interfaces. Tenant ID is part of every query. Authorisation is enforced twice: in server functions and in Postgres RLS. Secrets only server-side. Every external effect goes through a queue.

## 2. Stack
| Layer | Choice |
|---|---|
| UI | React 19, TypeScript (strict), Tailwind v4, shadcn/ui, Lucide |
| App framework | TanStack Start (server functions, file routing via TanStack Router, TanStack Query) |
| Validation | Zod, shared by client and server |
| Backend | Supabase: Postgres, Auth, Storage, RLS, Edge Functions |
| Queue | Postgres-backed queue (`pgmq` or a `message_jobs` table with `FOR UPDATE SKIP LOCKED`) driven by Edge Functions and `pg_cron` |
| Tests | Vitest (unit), pgTAP or SQL integration tests for RLS, Playwright (E2E) |

## 3. Logical architecture
```
Browser (React) ──► TanStack Start server functions ──► Supabase (user JWT → RLS)
                         │                                   │
                         │ service-role only in             Postgres ◄── pg_cron
                         ▼ narrow server modules              ▲
                  Edge Functions: dispatch-worker, webhooks ──┘
                         │
              WhatsApp Cloud API · SMS (DLT) gateway · Email · Payment gateway
```
- **Default data path:** server functions call Supabase with the *user's* JWT, so RLS applies. The service-role client is confined to `src/server/privileged/*` (webhooks, workers, platform-admin RPCs) and lint-banned elsewhere.
- Two auth realms: `platform_users` and `tenant_users`, distinguished by JWT custom claims. Platform and organisation apps are separate route trees with separate layouts: `/platform/*` and `/app/*`.

## 4. Proposed source structure
```
docs/
supabase/
  migrations/          # timestamped, forward-only SQL
  tests/               # pgTAP RLS and isolation tests
  functions/           # dispatch-worker, whatsapp-webhook, sms-webhook, email-webhook, payment-webhook
src/
  routes/              # TanStack Start routes: (public), platform/, app/
  core/                # shared kernel: auth, tenant-context, permissions, entitlements, audit, errors
  modules/
    core/              # contacts, staff, notifications, billing, documents, scheduling, reports ...
    industries/
      gym/ education/ hospital/ hotel/ restaurant/ ...   # each: manifest, routes, schema, services, ui
  components/ui/       # shadcn
  lib/                 # supabase clients (browser, server, privileged), env, zod schemas
```
Each industry exposes a `manifest.ts` declaring its module keys, permissions, navigation, routes and migration folder. A new industry is added by registering a manifest and a SQL migration. No core code changes are needed.

## 5. Multi-tenancy model
- Shared database, shared schema, `tenant_id uuid NOT NULL` on all tenant-owned rows. (A schema-per-tenant design was rejected because it makes migrations and cost unmanageable at scale.)
- Composite foreign keys `(tenant_id, id)` stop a child row from referencing a parent in another tenant.
- Membership: `tenant_users(user_id, tenant_id, role_id)`. A user can belong to several orgs, and the active org is chosen by the switcher and carried in a verified claim or request header. The server re-checks membership every request.
- Industry-specific tables live in separate Postgres schemas (`gym`, `edu`, `hospital`, `hotel`, `restaurant`) so access can be granted per module family.

## 6. Notification engine
**Flow**
1. Staff picks an audience (static list, or dynamic segment such as `bus_id = 14`) and a template or message.
2. Server checks permission `communications.send`, entitlement, quota and consent, then writes one `notifications` row (campaign).
3. Audience resolver (SQL, server-side) expands to recipients, and one `notification_recipients` row per contact × channel is created with an idempotency key `hash(notification_id, contact_id, channel)`. Consent and preference filtering happens here, and skipped rows record the reason.
4. Jobs are enqueued. The worker claims batches with `SKIP LOCKED`, applies per-tenant and per-provider rate limits, calls the provider, and stores `provider_message_id` with status `submitted`, **never** `delivered`.
5. Provider webhooks (signature-verified, deduplicated by event ID) advance status: `sent → delivered → read`, or `failed`.
6. Failures are classified: transient ones are retried with exponential backoff and jitter up to N attempts, permanent ones (invalid number, opted out, template rejected) are not retried. Exhausted jobs go to a dead-letter state visible in the UI.
7. Channel fallback (WhatsApp → SMS) is optional and configurable, and only goes to contacts consented for that channel.

**Compliance hooks:** WhatsApp messages outside the 24h window must use approved templates, tracked in `notification_templates.provider_status`. Opt-in is stored with source and timestamp in `communication_preferences`. SMS templates carry a DLT `template_id` and `entity_id` (sender header registration). Quiet hours and unsubscribe handling are enforced at resolution time.

**Privacy:** the UI only shows audience counts and names the admin is permitted to see. No group chats are created. Messages are sent one-to-one.

## 7. Entitlements
`has_module_access(tenant, module_key)` = org approved ∧ subscription in (trial, active, grace, read_only for view) ∧ module ∈ industry catalogue (or core) ∧ module ∈ plan entitlements. Usage limits are checked in `check_quota(tenant, metric)` and counted from `usage_counters`. Read-only mode is enforced in RLS by denying writes when the subscription is `read_only` or `suspended`.

## 8. Payments
Two separate flows. (a) **Platform billing:** the org pays UOP for its subscription. (b) **Tenant payment records:** the org logs fees and payments from its own customers (`payment_records`). Gateway selection is Decision D3. Payment status is only set from a verified gateway webhook or by explicit manual entry flagged `recorded_manually`.

## 9. Branding and white-label
`organisation_settings` holds theme tokens, logo, name and domain. Without the white-label entitlement, "Powered by UOP" is forced. Custom domains are a later phase.

## 10. Architecture decision records
| ADR | Decision | Reason |
|---|---|---|
| 001 | TanStack Start as the app framework, not Next.js | Mandated. **Conflict:** the Figma Make workspace is plain Vite. See D1 |
| 002 | Shared schema with RLS | Operational simplicity and cost |
| 003 | Postgres-backed queue first | No extra infrastructure, transactional enqueue |
| 004 | Permissions in DB, checked in SQL and server | One source of truth, no drift |
| 005 | Contacts are not auth users | Product rule F |
| 006 | Provider status only from callbacks | Brief rule 13 |
| 007 | Forward-only migrations in `supabase/migrations` | Auditability |
| 008 | Industry modules via manifest and schema namespace | Add industries without rewriting |

## 11. Environments
Local (Supabase CLI), staging, production, all in *your* Supabase projects. CI runs lint, typecheck, unit tests and RLS tests against a local Supabase. Deployment only after your explicit approval.
