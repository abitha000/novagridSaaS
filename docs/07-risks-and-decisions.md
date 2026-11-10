# 07 – Technical Risks and Unresolved Decisions

## A. Decisions needed before Phase 2
| ID | Decision | Options and recommendation |
|---|---|---|
| D1 | **Runtime conflict.** The workspace is a Vite SPA inside Figma Make. TanStack Start needs a server runtime, and Make's preview does not run it | (a) Build in this workspace with Vite plus TanStack Router/Query as an SPA, keeping server logic in Supabase RLS, RPCs and Edge Functions, and migrate to TanStack Start later. (b) Develop TanStack Start in a separate repository or environment outside Make. (c) Prototype UI here only. **Recommendation: (b) for the production product, or (a) if the preview is needed.** Please confirm |
| D2 | Hosting target for TanStack Start (Vercel, Netlify, Cloudflare, Node) | Your choice. Affects adapter and env handling |
| D3 | Payment gateway for India (Razorpay, Cashfree, Stripe) and recurring-billing approach | Recommend Razorpay Subscriptions or Cashfree. Needs your account |
| D4 | SMS provider with DLT (MSG91, Gupshup, Twilio) and WhatsApp BSP (Meta Cloud API direct vs BSP) | Recommend Meta Cloud API direct plus MSG91 |
| D5 | Initial markets and currencies. India-first, multi-currency later? | Affects tax (GST), phone formats and compliance |
| D6 | Pricing: tiers, per-category prices, limits, message pass-through costs | Placeholders in doc 03 |
| D7 | Queue implementation: `pgmq` vs custom table | Recommend `pgmq` if available on your Supabase plan |
| D8 | Email provider (Resend, SES, Postmark) | Recommend Resend or SES |
| D9 | Hospital launch: legal and compliance review owner | Needed before the hospital module is exposed |
| D10 | Platform owner staffing: how many super admins, and MFA policy | Recommend mandatory MFA |
| D11 | Education variants: one module with terminology, or separate packages for college and tuition | Recommend one package with variants |
| D12 | Are branches or multi-location a core concept in v1? | Recommend yes, optional |

## B. Technical risks
| Risk | Impact | Mitigation |
|---|---|---|
| RLS complexity and policy performance | Slow queries, subtle leaks | Helper functions marked STABLE, `tenant_id` leading indexes, EXPLAIN in CI, isolation suite |
| Service-role misuse | Total tenant bypass | Confined module, lint rule, review gate, tests |
| WhatsApp policy (templates, opt-in, quality rating, account bans) | Messaging blocked | Template workflow, consent ledger, throttling, status UI |
| Indian DLT onboarding delays | SMS not usable at launch | Start registration early, WhatsApp and email first |
| Provider status ambiguity | Wrong delivery claims | Statuses only from callbacks, clear `submitted` state |
| Queue duplication or loss | Double or missed messages | Idempotency keys, `SKIP LOCKED`, DLQ, reconciliation job |
| Dynamic audience errors | Wrong people messaged | Preview counts, server-side resolution, dry run, approval for large sends, tests |
| Subscription state edge cases (grace, proration) | Revenue leakage | Explicit state machine with property tests |
| Healthcare data regulation | Legal exposure | Defer module, legal review, stricter controls |
| DPDP and data-retention duties | Compliance gaps | Consent, retention, export and delete features from Phase 3 and 4 |
| Scope breadth (13 industries) | Delays | Manifest architecture, build only Gym and Education first |
| TanStack Start maturity and API churn | Rework | Pin versions, thin framework-dependent layer |
| Multi-org users and context switching bugs | Wrong-tenant writes | Explicit tenant ID per request, server membership check, tests |
| Support access abuse | Privacy breach | Time-boxed grants, reason, full audit, tenant visibility |

## C. Assumptions
Supabase is available to you with Edge Functions, `pg_cron` and Vault. English-only UI in v1. Web only, with no native apps.
