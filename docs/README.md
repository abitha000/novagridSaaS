# UOP Documentation Index (Phase 1)

Status: **Phase 1 – awaiting approval.** No application code has been written.

| # | Document | Purpose |
|---|----------|---------|
| 01 | [PRD](01-PRD.md) | Product requirements, personas, scope, acceptance criteria |
| 02 | [System architecture](02-system-architecture.md) | Stack, modular monolith, layers, notification engine, ADRs |
| 03 | [Industry and module catalogue](03-module-catalogue.md) | Core and industry modules, entitlement model |
| 04 | [Database relationship plan](04-database-plan.md) | Every planned table, relationships, conventions |
| 05 | [Tenant security plan](05-tenant-security-plan.md) | Isolation, RLS, RBAC, audit, secrets, tests |
| 06 | [Implementation roadmap](06-roadmap.md) | Phases 1–8 with exit criteria |
| 07 | [Risks and open decisions](07-risks-and-decisions.md) | Technical risks, unresolved questions |

## Repository inspection result

- Contents: Vite 8 + React 19 + Tailwind v4 + TypeScript scaffold; `src/App.tsx` is a 3-line stub; one commit ("bootstrap"). No routes, components, backend, tests or migrations exist.
- **Conflict to resolve:** the mandated stack is TanStack Start + Supabase, but this workspace is a plain Vite SPA hosted in Figma Make, whose preview supports a Vite dev server only. See ADR-001 and Decision D1 in doc 07. This is the most important item needing your decision.
- Nothing will be created in any external account. Supabase, hosting, payment and messaging accounts are yours; the project will only contain code, SQL migrations and `.env.example`.
