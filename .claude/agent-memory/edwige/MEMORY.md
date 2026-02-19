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

## Round 3 Audit Findings (2026-02-19)

### Resolved from Round 2
- ResourceCard component removed
- COLOR_PRESETS consolidated into ACCENT_PRESETS

### Remaining Issues (Critical)
- Org deletion (`deleteOrganization`) does NOT clean up: topics, policies, kanban, notifications, chat tool tables
- `leaveOrganization` (owner-as-last-member) also has incomplete cleanup -- duplicates partial org deletion logic
- `policies/functions.ts` is entirely dead (never called from frontend or backend)
- `notificationPreferences/functions.ts` is entirely dead (never called)

### Remaining Issues (Moderate)
- Spinner SVG inlined ~15 times instead of using SpinnerIcon from Icons.tsx
- `getContactLink` duplicated in MemberVisualView/ContactInfo.tsx vs utils/contacts.tsx
- `createDefaultPreferences` takes `string` instead of `Id<"users">`
- `memberHasTeamAccess` re-exported from chat/access.ts but unused re-export
- Inconsistent semicolons and quote styles in schema.ts
- `getMemberById` in members/functions.ts has indentation issue (line 45-46)

### Dead Code
- `convex/storage.ts`: `getStorageUrl`, `deleteStorageFile`
- `convex/users/functions.ts`: `listMyInvitations`, `syncProfileToMembers`
- `convex/notifications/functions.ts`: `getAll`, `getUnread`, `getByOrga`, `getById`, `markAsUnread`, `markAllAsReadByOrga`, `archive`, `unarchive`, `remove`, `removeAllArchived`, `deleteByUserAndOrga`, `cleanupExpired`
- `convex/invitations/functions.ts`: `getInvitationById` (never from frontend)

### Stale Documentation
- CLAUDE.md references `aggregates.ts` which does not exist

## Agent-Documentation Mapping

| Agent | Primary Documentation |
|-------|----------------------|
| karl | docs/DATA_MODEL_PHILOSOPHY.md |
| monica-ux-brand | docs/BRAND.md, docs/UX_PRINCIPLES.md |
| helen-legal-advisor | docs/LEGAL.md |
| jane-i18n | docs/I18N.md |
| gunter | docs/SECURITY.md |
