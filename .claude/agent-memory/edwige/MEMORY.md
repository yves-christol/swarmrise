# Edwige Agent Memory

## Project Conventions

### Convex Backend
- Domain entities: `convex/<domain>/index.ts` (types) + `convex/<domain>/functions.ts` (queries/mutations)
- Type pattern: `entityType` (fields), `entityValidator` (with system fields), `type Entity`
- Auth helpers in `convex/utils.ts`: `getAuthenticatedUserEmail`, `getAuthenticatedUser`, `getMemberInOrga`
- Access control: `convex/chat/access.ts` (also used by kanban), `convex/kanban/access.ts`
- Chat split into 8 domain files with barrel re-export in `convex/chat/functions.ts`
- Color system uses hex strings (migration from RGB completed)
- Index naming: `by_field` or `by_field1_and_field2`

### Frontend
- Components: PascalCase dirs with `index.tsx`; functions: camelCase
- Visual views: `OrgaVisualView`, `TeamVisualView`, `RoleVisualView`, `MemberVisualView`
- Manage views: `OrgaManageView`, `TeamManageView`, `RoleManageView`, `MemberManageView`
- State: `orgaStore` and `chatStore` under `src/tools/`
- Shared types: `src/components/shared/visualTypes.ts`
- Shared viewport hook: `src/components/shared/useViewport.ts`

## Completed Cleanup

### Round 1 (2026-02-17)
1. Renamed `requireAuthAndMembership` -> `getMemberInOrga`
2. Split `convex/chat/functions.ts` (2660 lines) into 8 domain files
3. Unified color system from RGB to hex
4. Split large frontend components (RoleManageView, MemberManageView)
5. topics/ directory confirmed clean

## Round 2 Audit Findings (2026-02-17)
See `audit-round2.md` for full prioritized list.
Key issues:
- Massive icon duplication (SpinnerIcon x5, CheckIcon x7, XIcon x5, ErrorIcon x3)
- Duplicate COLOR_PRESETS, ContactInfo type (x3), getContactLink (x2)
- `memberHasTeamAccess` lives in chat/access.ts but shared with kanban
- Dead: ResourceCard component, 7 chat validators, SpecialRole/DigestFrequency/NotificationPayload types
- `@types/d3-force` misplaced in dependencies (should be devDependencies)
- `v.any()` in decisions for colorScheme backward compat

## Agent-Documentation Mapping

| Agent | Primary Documentation |
|-------|----------------------|
| karl | docs/DATA_MODEL_PHILOSOPHY.md |
| monica-ux-brand | docs/BRAND.md, docs/UX_PRINCIPLES.md |
| helen-legal-advisor | docs/LEGAL.md |
| jane-i18n | docs/I18N.md |
| gunter | docs/SECURITY.md |
