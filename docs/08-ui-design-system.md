# 08 – NOVAGRID UI/UX Design System and Prototype

Status: design prototype only. Sample data, no backend. It follows docs 01–07 (the Phase 1 plan is unchanged).

## Where things live
| Area | Route (hash) | Source |
|---|---|---|
| Design index (11 sections) | `#/design` | `src/pages/Design.tsx` |
| 01 Brand, 02 System | `#/design/brand`, `#/design/system` | `Design.tsx`, tokens in `src/index.css` |
| 03 Public site, login, registration | `#/`, `#/product`, `#/pricing`, `#/login`, `#/register` … | `src/pages/Public.tsx` |
| 04 Platform owner | `#/platform/*` | `src/pages/Platform.tsx` |
| 05–07 Workspace (Gym, Education; Hospital/Hotel previews) | `#/app/{gym,education,hospital,hotel}/*` | `src/pages/Workspace.tsx` |
| 08 Notifications (Bus 14 scenario) | `#/app/education/comms?audience=bus14` | `src/pages/Comms.tsx` |
| 09 Subscription and billing | `#/app/<industry>/billing` | `src/pages/Billing.tsx` |
| 10 Mobile (390 / 768 / 1440 live frames) | `#/design/mobile` | `Design.tsx` |
| 11 Motion and first-visit intro | `#/design/motion`, `#/intro` | `Design.tsx`, `src/pages/Intro.tsx` |

## Rules encoded in the design
- Platform console (dark navy sidebar, "Platform owner" badge) and organisation workspace (light sidebar, org switcher) are visually distinct.
- Workspace navigation shows only the approved industry's modules. Recipients appear as contacts, never as users, and phone numbers are masked.
- Category approval and subscription are separate screens and states.
- Delivery status only advances through simulated provider callbacks: Queued, Submitted, Sent, Delivered, Read, Failed, Retrying.
- All prices are labelled sample values in INR.
- First-visit intro uses the `ng_intro_seen` localStorage flag, and is skipped under reduced-motion.

## Handoff notes
Palette: Soft Ivory #FAF8F3 and Midnight Black #08090B as base, Neon Lime #CDF22B as the electric accent (dark text on lime, never lime text on light surfaces). Tokens keep the `ng-*` names, so `ng-indigo` now means the lime accent.

Tokens are Tailwind v4 `@theme` variables (`--color-ng-*`). Shared components are in `src/ui.tsx`. Replace `src/data.ts` with real data sources at implementation time. Dark mode for the application is not designed, because dashboards are light by brief.
