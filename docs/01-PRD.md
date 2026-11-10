# 01 – Product Requirements Document

## 1. Vision
Universal Operations Platform (UOP) is a multi-tenant SaaS where organisations in many industries run administration, staff, contacts, communications, subscriptions, payments and workflows. One codebase, with industry-specific modules switched on per organisation.

## 2. Users
| Persona | Description | Has an account? |
|---|---|---|
| Platform Super Admin | Product company operator. Approves categories, plans, suspensions | Yes (platform realm) |
| Platform Support | Limited, audited, time-boxed support access | Yes (platform realm) |
| Organisation Owner | Registers the org, owns billing | Yes (tenant realm) |
| Org Admin / Manager / Operator / Accountant / Read-only | Staff with scoped permissions | Yes (tenant realm) |
| Recipients (members, students, parents, patients, guests) | Receive messages only | **No**. Stored as `contacts` |

## 3. Non-negotiable rules (from brief, mapped to enforcement)
| Rule | Enforcement |
|---|---|
| One primary industry per organisation | `organisations.industry_category_id NOT NULL`, change only via platform admin RPC |
| Modules limited to approved industry and plan | `module_catalogue.industry_category_id`, plus plan entitlements, evaluated in SQL function `has_module_access()` |
| No cross-industry access via upgrades | Entitlement table has a constraint: a module is either `core` or belongs to exactly one industry; plan grants only filter within the industry set |
| Gym + hotel = two organisations | A user may be a member of several orgs, but each org has its own subscription, data and workspace. No shared data |
| Recipients have no accounts | No auth user is created for `contacts` |
| No phone exposure between recipients | Messages are always one-to-one sends, with no groups and no BCC-style lists. Audience is resolved server-side to IDs and the UI shows counts only |
| White-label is premium | Entitlement flag `white_label` gates branding settings |

## 4. Functional scope
### 4.1 Platform control panel
Overview, registrations queue, industry categories, category approval, suspension, plans, subscription status, module catalogue, entitlements, usage limits, revenue, analytics, white-label, support access (time-boxed, consent-logged), security logs, audit logs, system health.

### 4.2 Organisation lifecycle
Registration → email/phone verification → category approval → plan selection/payment → subscription activation → dashboard.
States: `pending_verification → pending_approval → approved_unsubscribed → active → (past_due/grace) → read_only → suspended | cancelled`.
Category approval and subscription activation are separate state dimensions (`approval_status`, `subscription.status`).
Unapproved organisations see only an onboarding status screen.

### 4.3 Core modules (all industries)
Organisation, staff, contacts, roles and permissions, notification centre, WhatsApp, SMS, email, billing, subscriptions, workflow automation, scheduling, reports, documents, audit logs, settings, branding, export.

### 4.4 Notification engine (flagship)
Individual and segment-based sends, templates, scheduling, automated reminders, delivery status from provider webhooks, failure handling, retries, campaign history, logs, preferences, consent. See doc 02 §6.

### 4.5 Subscriptions
Trial, Basic, Professional, Enterprise; per-category pricing; limits for staff, contacts, messages and storage; add-ons (white-label); renewals, expiry notices, grace period, read-only mode, suspension.

## 5. Non-functional requirements
- Security: RLS on every tenant table, server-side authorisation, audit trail, tested isolation.
- Responsive, mobile-first, light and dark themes, WCAG AA target.
- Performance: p95 list queries below 300 ms at 100k contacts per tenant (indexed on `tenant_id`, plus keyset pagination).
- Reliability: queue-based sends with at-least-once processing and idempotent effects.
- Compliance posture: India DPDP Act awareness, WhatsApp opt-in and template policy, TRAI DLT for SMS. Healthcare data gets stricter controls, and UOP is **not** a certified EMR.
- Observability: structured logs, health checks, provider webhook dashboards.

## 6. Out of scope for the first release
Customer-facing portals or apps, native mobile apps, a marketplace, in-platform telephony, an EMR replacement, and every industry except Gym and Education.

## 7. Success metrics
Time from registration to first message below 1 day, message delivery-status accuracy (a status only ever comes from a provider callback), zero cross-tenant leaks in the automated suite, and trial-to-paid conversion.

## 8. Acceptance criteria for Phase 1
All seven docs reviewed and approved, open decisions in doc 07 answered (at least D1–D5), and no infrastructure created without your approval.
