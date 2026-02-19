# Kimiko Kanban - Agent Memory

## Project Architecture Patterns

### Convex Domain Entity Pattern
- Each domain: `convex/<domain>/index.ts` (types + validators) + `functions.ts` (queries/mutations)
- Type pattern: `entityType` (fields only) -> `entityValidator` (with _id, _creationTime) -> `type Entity`
- All functions MUST have `args` and `returns` validators
- All org-scoped tables need `by_orga` index

### Team Auto-Creation Pattern (Key for Kanban)
- `convex/teams/functions.ts::createTeam` (line ~202-208) auto-creates a channel after team creation
- Pattern: insert channel with `{ orgaId, kind: "team", teamId, isArchived: false }`
- Kanban board auto-creation goes right after this block
- `deleteTeam` cleans up channels, roles, topics, policies -- Kanban cleanup goes alongside

### Access Control Pattern
- `convex/chat/access.ts::memberHasTeamAccess(ctx, member, teamId)` checks if member has a role in team
- `requireAuthAndMembership(ctx, orgaId)` from `convex/utils.ts` gets the member doc
- Kanban reuses `memberHasTeamAccess` directly
- Frontend guard: `checkTeamAccess` query returns boolean; downstream queries use `"skip"` when false
- IMPORTANT: Never rely on mutation error catching to detect access denial -- use a query guard to skip entirely

### Frontend Patterns
- Views: `FocusContainer` renders visual/manage views with flip animation
- TeamManageView: uses `useQuery`, `useMutation` hooks directly, `useTranslation("teams")`
- Modals: MUST use `createPortal(modal, document.body)` (see scrolling modal fix in global memory)
- i18n: namespace files in `public/locales/{lng}/{ns}.json`, config in `src/i18n/index.ts`
- Routes: defined in `src/routes/index.ts`, registered in `src/main.tsx`
- Supported languages: en, fr, es, it, uk, zh-TW

### Schema Location
- `convex/schema.ts` imports types from each domain's index.ts
- Tables defined with `defineTable({ ...entityType.fields })` then chained `.index()`

## Key File Paths
- Schema: `/Users/yc/dev/swarmrise/convex/schema.ts`
- Team functions: `/Users/yc/dev/swarmrise/convex/teams/functions.ts`
- Team types: `/Users/yc/dev/swarmrise/convex/teams/index.ts`
- Chat access: `/Users/yc/dev/swarmrise/convex/chat/access.ts`
- Utils: `/Users/yc/dev/swarmrise/convex/utils.ts`
- Routes: `/Users/yc/dev/swarmrise/src/routes/index.ts`
- Main router: `/Users/yc/dev/swarmrise/src/main.tsx`
- i18n config: `/Users/yc/dev/swarmrise/src/i18n/index.ts`
- TeamManageView: `/Users/yc/dev/swarmrise/src/components/TeamManageView/index.tsx`
- FocusContainer: `/Users/yc/dev/swarmrise/src/components/FocusContainer/index.tsx`
- Package.json: `/Users/yc/dev/swarmrise/package.json`
- Design doc: `/Users/yc/dev/swarmrise/docs/KANBAN.md`

## DnD Library: @dnd-kit
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities installed
- CRITICAL: Must configure explicit sensors with activation constraints, otherwise clicks are captured by drag
- PointerSensor: `activationConstraint: { distance: 5 }` -- 5px movement before drag starts
- TouchSensor: `activationConstraint: { delay: 250, tolerance: 5 }` -- 250ms hold before drag
- Without these, `onClick` on sortable items never fires because dnd-kit captures `pointerdown`
- `useSortable` listeners include `onPointerDown`/`onKeyDown` but NOT `onClick`, so onClick is safe to use alongside

## i18n Type Declarations
- Type file: `src/i18n/types.ts` -- must add import + resources entry for new namespaces
- Adding a namespace to `src/i18n/index.ts` ns array is NOT enough -- types.ts must also be updated
- Without the types.ts entry, `useTranslation("kanban")` triggers TS2345 errors on all t() calls

## Decisions Index (in decisions/index.ts)
- targetType union includes: orgas, teams, roles, members, policies, invitations, topics, elections
- May need to add 'kanbanCards' if we integrate Decision audit trail later

## Role System (Key for Role-Based Card Ownership)
- Role entity: `convex/roles/index.ts` -- has `memberId`, `teamId`, `orgaId`, `title`, `iconKey`, `roleType`
- Role icon: `src/utils/roleIconDefaults.ts::getRoleIconPath(iconKey?, roleType?)` returns SVG path
- Icon dictionary: `src/components/Icons/icons.ts` -- iconDict maps string keys to SVG paths
- Roles query: `roles.functions.listRolesInTeam({ teamId })` fetches all roles in a team
- `deleteRole` in `convex/roles/functions.ts` (line 560) does NOT clean up kanban cards
  -- CRITICAL: must add kanban card cleanup when migrating to roleId-based ownership
- `deleteTeam` cleans up roles AND kanban data separately, so team deletion is safe
- A role always has exactly one `memberId` (required field, Id<"members">)
- Role has optional `roleType`: "leader" | "secretary" | "referee"
- Role has optional `iconKey` for custom icon (falls back to roleType default)

## Member Kanban View (D4) -- Implementation Details
- Backend: `getCardsByMemberWithContext` in `convex/kanban/functions.ts` -- enriched query
  - Queries roles by `by_member` index, then cards by `by_role` index for each role
  - Resolves column names, role metadata, board->team mapping, team names
  - Returns `MemberKanbanTeamGroup[]` (cards grouped by team)
- Validators: `memberKanbanCardValidator`, `memberKanbanTeamGroupValidator` in `convex/kanban/index.ts`
- Frontend: `src/components/MemberKanbanView/index.tsx` (NOT under Kanban/ subdirectory)
  - Takes only `memberId` prop (orgaId derived from member doc in backend query)
  - Uses `useFocus().focusOnTeam` for team navigation
  - Three sub-components: MemberKanbanView, TeamCardGroup, MemberKanbanCardItem
  - Cards grouped by column name within each team group
- Integration: Wired into FocusContainer PrismFlip as third "kanban" face for member view
  - Giuseppe handled the PrismFlip wiring and lazy import
  - Import path: `../MemberKanbanView` (relative to FocusContainer)
  - geometry="prism" for member view (3 faces: visual, manage, kanban)
- i18n: `memberView` section in `kanban` namespace -- title, empty, totalCards, viewTeamBoard
  - zh-TW was missed in the initial commit; I added it separately

## Notification System Integration (E1 - Due Date Notifications)
- Notification categories: discriminated union in `convex/notifications/index.ts` on `category` field
- Adding a new category requires: (1) add literal to `notificationCategoryType`, (2) create payload validator, (3) add to `notificationPayload` union
- Notification creation: use `internal.notifications.functions.create` (internalMutation) -- args: userId, orgaId?, memberId?, payload, priority, expiresAt?, groupKey?
- Deduplication: use `groupKey` field + query `by_group_key` index before creating
- Notification preferences: `convex/notificationPreferences/index.ts` -- each category is a field; new categories should be `v.optional()` for backward compat
- Cron jobs: `convex/crons.ts` -- use `crons.interval()` for periodic or `crons.daily()` for fixed time
- Frontend rendering: `src/components/NotificationItem/index.tsx` -- add icon case to `getIconAndColor`, add render function, add to JSX and default exclusion list
- i18n for notifications: keys go in `public/locales/{lng}/notifications.json` (NOT kanban.json)
- Member resolution chain: card.roleId -> role.memberId -> member.personId (= userId for notifications)
- Cron references internal functions as: `internal.kanban.functions.checkDueDateNotifications`

## KANBAN.md Feature Catalogue
- Comprehensive feature catalogue with 30 features across 7 categories (A-G)
- D4 (Member Kanban View): DONE
- E1 (Due Date Notifications): DONE -- hourly cron, approaching (24h) + overdue, dedup via groupKey
- Updated role-based ownership migration status from Pending to Done
