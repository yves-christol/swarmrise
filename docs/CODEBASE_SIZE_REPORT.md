# Codebase Size Report

Generated: 2026-02-13

## Source Code

| Category | Files | Lines |
|----------|------:|------:|
| React TSX | 56 | 14,665 |
| TypeScript | 68 | 10,233 |
| CSS | 3 | 412 |
| i18n JSON (6 langs) | 66 | 6,103 |
| **Total** | **124 source files** | **~25,000 hand-written lines** |

## Breakdown by Directory

### `src/` -- 22,811 lines

| Subdirectory | Lines | Files | Notes |
|-------------|------:|------:|-------|
| `src/components/` | 13,875 | 56 | UI components -- bulk of frontend |
| `src/pages/` | 1,039 | 9 | Route page components |
| `src/tools/` | 643 | 5 | Utility tooling |
| `src/hooks/` | 322 | 1 | Custom hooks |
| `src/i18n/` | 224 | 2 | i18n setup (not counting locale JSONs) |
| `src/routes/` | 179 | 3 | Routing config |
| `src/utils/` | 124 | 1 | Shared utilities |
| `src/contexts/` | 80 | 1 | React contexts |

i18n locale JSON files under `src/i18n/locales/` add another 6,103 lines across 66 files (6 languages x 11 namespaces).

### `convex/` -- 8,258 lines (hand-written)

| Subdirectory | Lines | Files | Notes |
|-------------|------:|------:|-------|
| `convex/dataTest/` | 2,170 | 4 | Demo/seed data |
| `convex/notifications/` | 941 | 3 | Notification system |
| `convex/roles/` | 718 | 2 | Role management |
| `convex/orgas/` | 661 | 3 | Organization logic |
| `convex/invitations/` | 509 | 2 | Invitation system |
| `convex/notificationPreferences/` | 501 | 2 | Notification prefs |
| `convex/teams/` | 461 | 2 | Team management |
| `convex/users/` | 456 | 2 | User management |
| `convex/members/` | 433 | 2 | Member management |
| `convex/policies/` | 407 | 2 | Policy management |
| `convex/decisions/` | 268 | 2 | Decision audit trail |
| `convex/webhooks/` | 207 | 3 | Webhook handlers |
| `convex/emails/` | 55 | 1 | Email sending |
| `convex/topics/` | 14 | 1 | Topics (early stage) |
| Root files | 457 | 9 | schema.ts, utils.ts, etc. |

## Production Build

| Asset | Raw Size | Gzipped |
|-------|----------|---------|
| JS bundle | 1.0 MB | 292 KB |
| CSS | 49 KB | 9.3 KB |
| **Total** | **1.1 MB** | **~301.5 KB** |

No code splitting -- everything ships in one chunk.

## Dependencies

**12 production dependencies:**
- `react` + `react-dom` (v19.2.4)
- `convex` (v1.31.7)
- `@clerk/clerk-react` + `@clerk/themes`
- `react-router` (v7.13.0)
- `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- `d3-force` + `@types/d3-force`
- `resend`
- `svix`

**14 dev dependencies** (Vite, TypeScript, Tailwind, ESLint, etc.)

## Largest Source Files

| File | Lines |
|------|------:|
| `src/components/RoleManageView/index.tsx` | 1,212 |
| `src/components/MemberManageView/index.tsx` | 1,107 |
| `src/components/TeamVisualView/index.tsx` | 959 |
| `src/components/OrgaSettingsModal/index.tsx` | 887 |
| `convex/dataTest/createDemoOrga.ts` | 755 |
| `src/components/CreateOrganizationModal/index.tsx` | 729 |
| `convex/roles/functions.ts` | 690 |
| `src/components/MemberVisualView/index.tsx` | 678 |

## Disk Usage

| Item | Size |
|------|------|
| `node_modules/` | 403 MB |
| `src/` | 1.3 MB |
| `convex/` | 424 KB |
| `public/` | 20 KB |
| `docs/` | 292 KB |
