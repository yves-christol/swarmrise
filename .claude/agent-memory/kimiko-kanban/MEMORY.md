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

## Cross-View Navigation
- See `navigation-patterns.md` for details on Router state-based card modal opening

## KANBAN.md Feature Catalogue
- Comprehensive feature catalogue with 31 features across 7 categories (A-G)
- Category A (A1-A6): ALL DONE
- Category B (B1-B6): ALL DONE
- Category C: C1 (Advanced Filters) DONE, C2 (Server-Side Search) PROPOSED, C3 (Sort) DONE
- D4 (Member Kanban View): DONE
- E1 (Due Date Notifications): DONE -- hourly cron, approaching (24h) + overdue, dedup via groupKey

## Category A: Core Board Enhancements (ALL DONE)
- A1 Custom Columns: `addColumn`, `renameColumn`, `deleteColumn` mutations; inline rename in column header via context menu; add column button at board end
- A2 WIP Limits: `wipLimit: v.optional(v.number())` on `kanbanColumnType`; `setColumnWipLimit` mutation; amber border + warning icon when exceeded; count/limit in header
- A3 Collapse/Expand: localStorage per board (`kanban-collapsed:{boardId}`); collapsed = vertical name + count; toggle via chevron in column header
- A4 Board Settings: `KanbanBoardSettings` modal (portal-based); configure WIP limits for all columns; gear icon in board header
- A5 Bulk Actions: `bulkMoveCards`, `bulkDeleteCards` mutations; selection mode toggle disables DnD; checkbox on each card; bulk toolbar with move-to dropdown + delete
- A6 Column Drag Reorder: horizontal `SortableContext` for columns; `useSortable` per column with `sortable-col:` prefix; 6-dot grip handle in expanded headers; collapsed columns use full bar; `reorderColumns` mutation persists; disabled in selection mode
- i18n sections added: `columnActions.*`, `settings.*`, `bulk.*` in all 6 languages
- Key pattern: selection mode and DnD are mutually exclusive -- `useSortable({ disabled: selectionMode })`

## Column DnD: ID Namespacing Pattern
- Single DndContext for both columns and cards (no nesting)
- Column sortable IDs: `sortable-col:{columnId}` prefix
- Card sortable IDs: raw Convex ID (no prefix)
- Column droppable IDs: `column:{columnId}` prefix (for card drops into empty columns)
- `handleDragStart`/`handleDragEnd` check `isColumnSortableId()` to route logic
- COLUMN_SORTABLE_PREFIX defined in both KanbanBoard and KanbanColumn (must stay in sync)

## Category B: Card Enhancements (ALL DONE)

### B1 Labels
- Table: `kanbanLabels` (boardId, orgaId, name, color) with `by_board` index
- Cards reference via `labelIds: v.optional(v.array(v.id("kanbanLabels")))`
- 10 color palette: red, orange, amber, green, teal, blue, indigo, purple, pink, gray
- `LABEL_COLORS` and `LabelColor` exported from `convex/kanban/index.ts`
- Delete cascades: removes label from all cards on the board
- Frontend: colored pill bars on KanbanCard; toggle picker + inline create in modal
- Search: filters by label name

### B2 Checklists
- Stored INLINE on card: `checklist: v.optional(v.array(checklistItemValidator))`
- `ChecklistItem`: { id: string, text: string, completed: boolean }
- Mutations: `updateChecklist` (full replace), `toggleChecklistItem` (single toggle)
- Frontend: progress bar on card (green when 100%); add/remove/toggle in modal
- Design decision: inline (not separate table) -- always loaded with card, atomic updates

### B3 Attachments
- Table: `kanbanAttachments` (cardId, boardId, orgaId, storageId, fileName, fileSize, mimeType, uploadedBy)
- `MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024` (10MB)
- Upload flow: `generateUploadUrl` -> `fetch(uploadUrl, { method: "POST" })` -> `addAttachment`
- Delete cascade: card/column/bulk delete removes attachments AND storage files via `ctx.storage.delete()`
- Query: `getAttachmentsForCard` -- lazy loaded only when modal opens

### B4 Threaded Comments
- Table: `kanbanComments` (cardId, boardId, orgaId, authorId, text) with `by_card` index
- Author-only edit/delete: `updateComment`/`deleteComment` check `comment.authorId === member._id`
- Query: `getCommentsForCard` -- lazy loaded only when modal opens
- Frontend: comment list with avatar, timestamp, Cmd+Enter submit, own-delete button
- Original `comments` string field retained on card for backward compat

### B5 Templates (REFACTORED - label-based, no separate table)
- Templates = regular cards with a "template" label (purple, name="template")
- Constants: `TEMPLATE_LABEL_NAME = "template"`, `TEMPLATE_LABEL_COLOR = "purple"` in `convex/kanban/index.ts`
- `ensureTemplateLabel` mutation auto-creates the label on first use
- `getBoardWithData` returns `templateLabelId` (null if no template label yet)
- Frontend: cards with template label shown in "From template..." dropdown in create mode
- "Mark as template" / "Unmark template" toggle in edit mode adds/removes template label
- When applying template: copies title, comments, priority, checklist, labels (minus template label)
- Old `kanbanTemplates` table REMOVED from schema

### B6 Priority
- Field: `priority: v.optional(priorityValidator)` on card -- "low" | "medium" | "high" | "critical"
- `PRIORITY_CLASSES` in KanbanCard: colored left border + dot (blue/amber/orange/red)
- Frontend: button row selector in modal (None + 4 levels with colored dots)
- Search: filterable by priority level name

### B-Category Schema Changes
- 3 tables: `kanbanLabels`, `kanbanAttachments`, `kanbanComments` (no more `kanbanTemplates`)
- 3 new optional fields on `kanbanCardType`: `labelIds`, `checklist`, `priority`
- `getBoardWithData` returns `labels` and `templateLabelId` alongside board/columns/cards
- `memberKanbanCardValidator` updated with same 3 new fields
- i18n: 6 new sections in all 6 languages: `labels`, `checklist`, `attachments`, `threadedComments`, `templates`, `priority`

## Category C: Search, Filter, and Sort (C1 + C3 DONE, C2 PROPOSED)

### C1 Advanced Filters
- Component: `src/components/Kanban/KanbanFilterPanel/index.tsx`
- Exports: `KanbanFilterPanel`, `KanbanFilters`, `SortOption`, `EMPTY_FILTERS`, `countActiveFilters`
- Purely frontend -- no backend changes needed
- Filter criteria: roleId, labelId, priority (including "none"), dueDate range (overdue/today/thisWeek/later)
- Filters compose with text search via AND logic
- i18n: `filters.*` section in kanban namespace

### C3 Sort Within Column
- Sort state: `Map<string, SortOption>` in KanbanBoard, not persisted
- Sort options: manual, dueDate, creationDate, titleAZ, titleZA, priority, role
- Sort dropdown icon in column header; highlights when non-manual sort active
- DnD disabled per-column when sort is active (not globally)
- Priority sort order: critical(0) > high(1) > medium(2) > low(3) > none(4)
- i18n: `sort.*` section in kanban namespace
