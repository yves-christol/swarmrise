# Edwige Agent Memory

## Project Conventions

### Convex Backend
- Domain entities: `convex/<domain>/index.ts` (types) + `convex/<domain>/functions.ts` (queries/mutations)
- Type pattern: `entityType` (fields), `entityValidator` (with system fields), `type Entity`
- Auth helpers in `convex/utils.ts`: `getAuthenticatedUserEmail`, `getAuthenticatedUser`, `getMemberInOrga`
- Access control: `convex/chat/access.ts` (also used by kanban), `convex/kanban/access.ts`
- Chat split into 8 domain files with barrel re-export in `convex/chat/functions.ts`
- Kanban split into 7 domain files with barrel re-export in `convex/kanban/functions.ts`
- Color system uses hex strings (migration from RGB completed)
- Index naming: `by_field` or `by_field1_and_field2`
- Notification helpers in `convex/notifications/helpers.ts` (builders, recipients)

### Frontend
- Components: PascalCase dirs with `index.tsx`; functions: camelCase
- Visual views: `OrgaVisualView`, `TeamVisualView`, `RoleVisualView`, `MemberVisualView`
- Manage views: `OrgaManageView`, `TeamManageView`, `RoleManageView`, `MemberManageView`
- State: `orgaStore` and `chatStore` under `src/tools/`
- Shared types: `src/components/shared/visualTypes.ts`
- Shared viewport hook: `src/components/shared/useViewport.ts`
- Color utilities consolidated in `src/utils/colorContrast.ts`
- Shared icon components in `src/components/Icons.tsx` (SpinnerIcon, CheckIcon, XIcon, ErrorIcon, PlusIcon)

## Completed Cleanup

### Round 1 (2026-02-17)
1. Renamed `requireAuthAndMembership` -> `getMemberInOrga`
2. Split `convex/chat/functions.ts` (2660 lines) into 8 domain files
3. Unified color system from RGB to hex
4. Split large frontend components (RoleManageView, MemberManageView)

### Round 2 (2026-02-17)
- ResourceCard removed, COLOR_PRESETS consolidated into ACCENT_PRESETS

### Round 4 cleanup (2026-02-21) -- ALL 7 ITEMS COMPLETED
1. Removed ~400 lines dead notification functions/helpers
2. Consolidated color utils into `src/utils/colorContrast.ts`
3. Replaced 8 inline spinner SVGs with SpinnerIcon
4. Removed ~170 lines dead user/storage functions
5. Split `convex/kanban/functions.ts` (1489 lines) into 7 domain files + barrel
6. Removed legacy color field handling from mutations/frontend
7. Added `by_channel_and_thread_parent` index

## Round 5 Audit (2026-02-21) -- Post-Cleanup Assessment

### Rating: B+ (Good)
All critical items from round 4 resolved. Remaining issues are low-medium priority.

### Remaining Issues
- **notificationPreferences/functions.ts** (426 lines, 7 exports): Entire module never called from frontend or backend
- **Legacy color fields** still in orga schema + migrations.ts (safe to remove now)
- **getDefaultIconKey** duplicated: `convex/roles/iconDefaults.ts` + `src/utils/roleIconDefaults.ts`
- **chat/access.ts line 7**: Dead re-export of `memberHasTeamAccess` (nobody imports from there)
- **listChildTeams**: Exported public query in teams/functions.ts, never called
- **3 Convex .filter()** usages remaining (invitations, decisions, channelFunctions)
- **3 `any` types** in policies/functions.ts (lines 22, 28, 39)
- **CLAUDE.md** references nonexistent `aggregates.ts`
- **Stale docs**: COLOR_MODEL_REFACTOR_PROPOSAL.md, ROUTING_MIGRATION_PLAN.md
- **TODO placeholders** in orgas/functions.ts (leader/secretary/referee missions)

## Agent-Documentation Mapping

| Agent | Primary Documentation |
|-------|----------------------|
| karl | docs/DATA_MODEL_PHILOSOPHY.md |
| monica-ux-brand | docs/BRAND.md, docs/UX_PRINCIPLES.md |
| helen-legal-advisor | docs/LEGAL.md |
| jane-i18n | docs/I18N.md |
| gunter | docs/SECURITY.md |
