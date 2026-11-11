# PR #22 — Audit payload allowlist

## Change
Replaced the audit trigger's denylist (which could accidentally retain newly added sensitive columns) with a strict positive allowlist. Only approved operational identifiers, statuses, relationship IDs, channel/type values and lifecycle timestamps are retained. Names, email addresses, phone numbers, addresses, free text, notification bodies, provider payloads, arbitrary attributes and future columns are excluded by default.

The audit trigger remains SECURITY DEFINER and API roles cannot execute it directly. Audit rows remain read-only to tenant API roles.

## Validation
PostgreSQL migration CI includes a regression fixture containing sensitive and unknown fields; only explicitly allowed operational fields may remain.

## Safety / rollout
No live Supabase migration has been applied. This does not replace the required full Supabase Auth/PostgREST/Storage rehearsal or backup/restore verification.
