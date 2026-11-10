# 03 – Industry and Module Catalogue

Modules are rows in `module_catalogue` with a `scope` of `core` or `industry`. Industry modules reference exactly one `industry_categories` row. A plan grants a subset of the modules already allowed for the category, and it can never add a module from another industry.

## 1. Core modules (all industries)
| Key | Module | Notes | Typical minimum plan |
|---|---|---|---|
| core.org | Organisation management | profile, branches | Trial |
| core.staff | Staff management | invites, roles, limits | Trial |
| core.contacts | Contacts and people | tags, groups, import/export | Trial |
| core.rbac | Roles and permissions | custom roles | Professional |
| core.notify | Notification centre | campaigns, logs, templates | Trial |
| core.whatsapp | WhatsApp | needs a Business account | Basic |
| core.sms | SMS | needs DLT registration (India) | Basic |
| core.email | Email | | Trial |
| core.billing | Payments and billing | payment records, invoices | Basic |
| core.subscription | Subscription management | | Trial |
| core.workflow | Workflow automation | triggers, reminders | Professional |
| core.schedule | Scheduling | calendars, shifts | Basic |
| core.reports | Reports and analytics | | Basic |
| core.documents | Documents | Storage, validation | Basic |
| core.audit | Audit logs | read access by permission | Professional |
| core.settings | Settings | | Trial |
| core.branding | Branding | white-label = add-on | Add-on |
| core.export | Data export | permission `export` | Basic |

## 2. Industry categories and modules
| Industry | Module packages | Phase |
|---|---|---|
| Gym and Fitness | members, membership plans, renewals, attendance, trainers, personal training, payment tracking, expiry notifications | 5 |
| Schools | students, guardians, staff/teachers, classes, sections, attendance, fees, timetables, exams, transport (routes, stops, allocation) | 6 |
| Colleges / Universities | Education package plus departments, courses and semesters | 6 (variant) |
| Tuition / Coaching | Education package, lightweight (batches instead of classes) | 6 (variant) |
| Hospitals / Clinics | patients, appointments, doctors, queue, billing, departments, staff scheduling. **Stricter privacy**: field-level access, mandatory access audit, break-glass reads, shorter sessions | 8 |
| Hotels | rooms, reservations, check-in/out, guests, housekeeping, billing, availability | 8 |
| Restaurants | tables, orders, menu, inventory, staff, billing | 8 |
| Salons / Beauty | appointments, services, stylists, packages | 8+ |
| Retail | products, inventory, sales, customers | 8+ |
| Corporate | employees, attendance, leave, assets | 8+ |
| Automotive | job cards, vehicles, service reminders | 8+ |
| Logistics | vehicles, drivers, routes, shipments | 8+ |
| Professional Services | clients, cases/projects, time and billing | 8+ |

The Education variants share one codebase with different terminology and labels, driven by `industry_categories.terminology` JSON.

## 3. Module package contract
Each package ships:
1. `manifest.ts`: key, name, industry, required permissions, nav entries, routes, quotas.
2. A SQL migration folder with its own Postgres schema, RLS and indexes.
3. Zod schemas and services (server) and UI components.
4. Seeds for `module_catalogue`, `permissions` and default role mappings.
5. Isolation tests.

## 4. Entitlement matrix (illustrative)
| | Trial | Basic | Professional | Enterprise |
|---|---|---|---|---|
| Staff | 3 | 10 | 50 | custom |
| Contacts | 100 | 1,000 | 10,000 | custom |
| Messages/mo | 100 | 1,000 | 10,000 | custom |
| Storage | 100 MB | 2 GB | 20 GB | custom |
| Workflow | no | no | yes | yes |
| White-label | no | add-on | add-on | included |

Numbers are placeholders pending pricing decisions (D6).
