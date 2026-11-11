# PR #21 — Security remediation

## Included
- Centralised subscription eligibility. Writes require an unexpired trial/active period or an unexpired grace window. Read-only subscriptions retain module read access but cannot write.
- Module access uses the same eligibility rules.
- Removed blanket EXECUTE grants on every private-schema function. Only the helpers directly called by authenticated RLS policies receive authenticated EXECUTE.
- Registration rejects an optional preferred plan that is inactive or belongs to another industry.
- Notification creation checks the general notification entitlement and the selected/fallback channel entitlement (core.whatsapp, core.sms, core.email).
- Replaced quota counting by mutable recipient status with a durable per-recipient admission ledger. A recipient consumes at most one monthly credit; retries and later status changes do not refund or double-charge it.

## Quota semantics
A credit is consumed when a recipient is admitted in a non-skipped state. Changing it to skipped later does not refund a credit. A previously skipped recipient consumes a credit if it is subsequently admitted. Provider delivery charges remain separate.

## Still required
- Audit-row allowlist redesign; existing audit redaction remains a separate review item.
- Provider dispatch, consent re-check immediately before send, signed webhook processing and provider billing.
- Full Supabase Auth/PostgREST/Storage rehearsal.
- Backup/PITR verification and restore rehearsal.
- PostgreSQL CI is not a complete Supabase emulator.

## Safety
No migration was applied to live Supabase. Production remains NO-GO pending the full rollout gate.
