# NOVAGRID migration security review

Review date: 2026-11-11  
Reviewed scope: all 14 SQL migrations, CI bootstrap/smoke tests, and rollout runbook. Static review only; no production SQL was executed.

## Decision: NO-GO for production rollout

The migrations are a useful foundation, but important authorization, subscription lifecycle and quota semantics need correction before applying them to the live Supabase project.

## Findings

### P1 — Shared authorization helpers ignore subscription period expiry
`private.is_writable` and `private.has_module_access` check subscription status but not `period_end` or `grace_until`. Other quota triggers do check `period_end > now()`. This creates inconsistent access decisions and permits expired rows to remain writable/module-enabled if their status was not transitioned.

**Fix:** define one eligibility rule for trial/active/grace/read_only and period/grace dates, reuse it in RLS/RPC/quota enforcement, and test all lifecycle boundaries.

### P1 — Blanket EXECUTE grant on every private-schema function
Migration 0004 uses `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role`. That includes SECURITY DEFINER helpers and internal trigger functions. The private schema being absent from PostgREST exposed schemas is an external configuration prerequisite, not enforced by the migration.

**Fix:** revoke PUBLIC defaults and grant EXECUTE only to the exact helper functions needed by authenticated policy evaluation. Keep trigger/internal functions inaccessible. Add a deployment check that private is not exposed via PostgREST.

### P1 — Monthly message quota is insert-only
Migration 0012 checks only BEFORE INSERT. It does not protect transitions from skipped/failed to queued via UPDATE. Counting current non-skipped rows also means status changes can retroactively release credits.

**Fix:** define whether credits are consumed on queue admission or provider submission; use an immutable usage ledger/consumed timestamp and enforce every relevant state transition through trusted worker/RPC code. Test updates, retries, concurrency and provider failures.

### P1 — Channel-specific entitlements are not enforced
`create_notification` checks only `core.notify`, even though the module catalogue has `core.whatsapp`, `core.sms` and `core.email`.

**Fix:** either make all channels explicitly included in core.notify and remove misleading separate entitlements, or enforce the selected channel's module in the RPC and plan seed data.

### P2 — Registration accepts invalid preferred plan keys
`register_organisation` stores `p_plan_key` without checking existence, active state or category scope. Subscription assignment later validates category, so this is not an immediate privilege escalation but creates invalid registration intent.

**Fix:** validate optional plan against the chosen category, or store it as explicitly unvalidated preference data.

### P2 — Audit redaction is a denylist and retains PII
The generic audit trigger removes phone/email/attributes/body/raw/payload, but retains contact full_name, owner_name and address. The privacy guarantee should not imply all personal data is excluded.

**Fix:** use table-specific allowlists and test that prohibited PII fields/values are absent.

### P2 — Notification send boundary is not implemented
The RPC snapshots consent/address when queuing. There is no dispatch worker/provider integration yet. Before sending, a trusted worker must re-check consent, address, channel entitlement, quiet hours, schedule and template/provider rules; webhook intake must verify signatures and replay protection.

**Fix:** keep notification feature in persistence/preview mode until the trusted dispatcher and verified webhooks are implemented.

### P2 — Storage tests are not real Supabase Storage integration tests
The SQL trigger relies on Storage metadata size and row policies. CI uses a simplified Storage fixture and cannot validate Storage API behavior, signed URLs, upsert/move semantics, metadata updates, resumable uploads or interactions with existing permissive policies (which combine with OR).

**Fix:** run the two-tenant Storage rehearsal against an isolated Supabase project and inspect all existing policies before production.

### P2 — Missing CI coverage
Current smoke tests do not cover subscription date expiry, channel entitlements, recipient status-update quota transitions, invalid preferred plan keys or audit PII redaction. Real Auth/PostgREST/Storage behavior also remains untested.

**Fix:** extend SQL smoke tests for database invariants and keep real Supabase integration rehearsal as a separate release gate.

## Positive controls
- Tenant-owned roles cannot be reassigned across tenants.
- Membership role assignment checks role tenant ownership.
- Last active owner protection serializes changes with an organisation row lock.
- Platform approval, suspension and subscription assignment RPCs check platform-admin status.
- Tenant tables use RLS and FORCE RLS.
- Notification recipient foreign keys bind tenant, notification and contact.
- Storage update/delete policies were tightened in migration 0014.
- Legacy Figma SECURITY DEFINER helper hardening exists as migration 0009.

## Required remediation order
1. Centralize subscription eligibility and apply it consistently.
2. Replace blanket private function grants with an explicit least-privilege allowlist.
3. Make message-credit consumption robust to state transitions/retries.
4. Resolve channel entitlement semantics and enforce them.
5. Validate registration plan preference and change audit redaction to allowlists.
6. Add SQL tests for each corrected invariant.
7. Run isolated Supabase Auth/PostgREST/Storage integration rehearsal.

## Live-project safety
The connected live project was previously verified to contain only the original Figma KV scaffold migration/table, with no NOVAGRID migration applied. Keep it unchanged. The legacy `public.rls_auto_enable()` grant warning remains until migration 0009 is deliberately applied and verified. A verified backup and restore rehearsal remain prerequisites. This review makes no live database changes.
