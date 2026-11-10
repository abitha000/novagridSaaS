# 06 – Phased Implementation Roadmap

Every phase ends deployable (to staging, and to production only with your approval), tested and documented.

| Phase | Scope | Exit criteria |
|---|---|---|
| 1 | Docs, project structure, database design, tenant model, security design | **You approve these docs and answer D1–D5.** No app code yet |
| 2 | Auth, platform dashboard shell, organisation registration with verification, category approval queue | Registration → approval works end to end locally. MFA for platform users |
| 3 | Tenant isolation migrations and RLS, RBAC, subscription engine, module entitlements | Isolation suite green. Entitlement matrix tests. Read-only and grace behaviour proven |
| 4 | Core modules: contacts, staff, payments, notification centre (data model and UI, queue skeleton) | Import/export contacts, staff invite, payment records, notification records without live providers |
| 5 | Gym module | Member lifecycle, renewals, attendance, expiry reminders |
| 6 | Education module with transport and bus audience | Bus 14 scenario passes end to end in tests |
| 7 | WhatsApp, SMS and email provider integrations, webhooks, retries, DLT and template flows | Delivery states only from callbacks. Sandbox-verified. Needs your provider accounts |
| 8 | More industries, white-label, analytics, hardening (load, pen test, backups) | Security review, restore drill, performance targets |

## Phase 2–3 workstream detail
Phase 2: auth, registration form and Zod schemas, verification, platform layout, approvals queue, audit logging basics.
Phase 3: migration set (platform, tenant core, helpers, policies), seed roles and permissions, subscription state machine, grace and read-only jobs, entitlement checks in server and SQL, isolation tests.

## Gates
After each phase I will summarise what was built, what was tested, what remains, and request approval before the next phase.

## Environment dependencies (provided by you)
Supabase project(s), hosting account, domain, payment gateway account, Meta WhatsApp Business account, SMS provider with DLT registration, and an email provider. All are needed only when the relevant phase starts.
