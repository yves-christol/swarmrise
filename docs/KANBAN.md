# KANBAN.md - Swarmrise Team Kanban Board

This document defines the architecture, data model, and implementation plan for the Kanban board feature in Swarmrise. It is maintained by Kimiko, the Kanban system architect.

**Status:** Phases 1-5 done. Category A (Core Board Enhancements: A1-A6) done. Category B (Card Enhancements: B1-B6) done. Role-based ownership migration complete. Cards display role icon + member avatar, labels, priority, checklist progress.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Feature Overview](#feature-overview)
3. [Data Model](#data-model)
4. [Indexes and Query Patterns](#indexes-and-query-patterns)
5. [Access Control](#access-control)
6. [Backend API Surface](#backend-api-surface)
7. [Frontend Architecture](#frontend-architecture)
8. [Drag and Drop](#drag-and-drop)
9. [Search](#search)
10. [i18n Considerations](#i18n-considerations)
11. [Integration Points](#integration-points)
12. [Implementation Plan](#implementation-plan)
13. [Implementation Status](#implementation-status)
14. [Design Decisions](#design-decisions)
15. [Future Enhancements](#future-enhancements)
16. [Feature Catalogue](#feature-catalogue)

---

## Design Philosophy

The Kanban board is a **team-scoped action tracker**. It gives each team a shared surface to track commitments, follow up on actions, and keep visibility into what each member is working on. It is not a generic project management tool -- it is tightly integrated with Swarmrise's organizational structure.

### Guiding Principles

1. **One board per team, always.** A Kanban board is created automatically when a team is created, mirroring how team channels are auto-created. There is no orga-level Kanban. Teams are the unit of coordination.

2. **Accountability is role-based.** Every card is owned by exactly one role, not a person. No unassigned cards. No multiple owners. When a role is reassigned to a different member, all cards tied to that role automatically reflect the new holder. This mirrors Swarmrise's governance philosophy: commitments belong to organizational functions, not individuals.

3. **Simplicity over configurability.** The initial implementation provides four fixed columns (New Topics, Actions, Done, Archived). Custom columns come later. The card model is intentionally lean: title, owner, due date, comments. No labels, no attachments, no checklists -- those are future enhancements that can be added incrementally.

4. **Drag and drop is essential.** Moving cards between columns and reordering within columns must feel instant and fluid. This is the primary interaction pattern for the board.

5. **Real-time by default.** Convex reactive queries power the board. When one team member moves a card, all other members see it move instantly.

---

## Feature Overview

### What It Is

A Kanban board attached to each team in Swarmrise. Team members can create cards, assign them to roles (not individuals), set due dates, and move them across columns to track progress. Each card displays the role icon alongside the avatar of the member currently holding that role.

### What It Is Not

- Not an orga-level project management tool
- Not a replacement for the Decision journal (Kanban tracks ongoing work; Decisions track completed governance actions)
- Not a sprint planning tool (no story points, no velocity charts)

### Core User Stories

1. As a team member, I can see all cards on my team's Kanban board organized by column.
2. As a team member, I can create a new card with a title, owning role, due date, and optional comments.
3. As a team member, I can drag cards between columns and reorder them within a column.
4. As a team member, I can edit a card's details (title, owning role, due date, comments).
5. As a team member, I can search/filter cards across all columns on the board.
6. As a team member, I can see cards with overdue dates visually highlighted.
7. As a team member, I can see each card's role icon and the avatar of the member currently holding that role.
8. When a role is reassigned to a different member, all cards owned by that role automatically show the new member's avatar.

---

## Data Model

### Entity Relationship Diagram

```
+----------------+
|   Team         |
+----------------+
| _id            |
| orgaId         |
| name           |
+--------+-------+
         |
         | 1:1 (auto-created with team)
         v
+--------+-------+
|  KanbanBoard   |
+----------------+
| _id            |
| teamId         |  --> teams._id
| orgaId         |  --> orgas._id
| columnOrder    |  Id<"kanbanColumns">[]
+--------+-------+
         |
         | 1:N
         v
+--------+-------+
| KanbanColumn   |
+----------------+
| _id            |
| boardId        |  --> kanbanBoards._id
| orgaId         |  --> orgas._id
| name           |  string
| position       |  number (ordering within board)
| wipLimit?      |  number (optional; A2: max cards allowed)
+--------+-------+
         |
         | 1:N
         v
+--------+-------+         +----------------+
|  KanbanCard    |         |     Role       |
+----------------+         +----------------+
| _id            |         | _id            |
| columnId       |  -----> | teamId         |
| boardId        |  -----> | memberId       |  --> members._id (current holder)
| orgaId         |         | title          |
| roleId         |  -----> | iconKey        |
| title          |         | roleType       |
| dueDate        |         +----------------+
| comments       |
| position       |
+----------------+

Card.roleId --> roles._id (REQUIRED, exactly one)
Role.memberId --> members._id (the person currently filling the role)

Key insight: When a role is reassigned (role.memberId changes),
all kanban cards with that roleId automatically reflect the new member
because the member is resolved at query time through the role, not stored on the card.
```

### Type Definitions

Following the established pattern from `convex/<domain>/index.ts`:

```typescript
// convex/kanban/index.ts
import { v, Infer } from "convex/values";

// --- KanbanBoard ---

export const kanbanBoardType = v.object({
  teamId: v.id("teams"),
  orgaId: v.id("orgas"),
  columnOrder: v.array(v.id("kanbanColumns")),
});

export const kanbanBoardValidator = v.object({
  _id: v.id("kanbanBoards"),
  _creationTime: v.number(),
  ...kanbanBoardType.fields,
});

export type KanbanBoard = Infer<typeof kanbanBoardValidator>;

// --- KanbanColumn ---

export const kanbanColumnType = v.object({
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  name: v.string(),
  position: v.number(),
  wipLimit: v.optional(v.number()),  // A2: max cards allowed in this column
});

export const kanbanColumnValidator = v.object({
  _id: v.id("kanbanColumns"),
  _creationTime: v.number(),
  ...kanbanColumnType.fields,
});

export type KanbanColumn = Infer<typeof kanbanColumnValidator>;

// --- KanbanCard ---

export const kanbanCardType = v.object({
  columnId: v.id("kanbanColumns"),
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  roleId: v.id("roles"),       // The role that owns this card (REQUIRED, exactly one)
  title: v.string(),
  dueDate: v.number(),
  comments: v.string(),
  position: v.number(),
});

export const kanbanCardValidator = v.object({
  _id: v.id("kanbanCards"),
  _creationTime: v.number(),
  ...kanbanCardType.fields,
});

export type KanbanCard = Infer<typeof kanbanCardValidator>;
```

### Default Columns

When a board is auto-created, four columns are inserted:

| Position | Name          | Purpose                                              |
|----------|---------------|------------------------------------------------------|
| 0        | New Topics    | Newly identified items that need discussion or triage |
| 1        | Actions       | Work that is actively being done                     |
| 2        | Done          | Completed items (kept visible for a period)          |
| 3        | Archived      | Historical items (collapsed by default in UI)        |

The default column names are stored as i18n keys, but the database stores the English name as the default. Users will be able to rename columns in a future enhancement.

---

## Indexes and Query Patterns

Following the project convention of `withIndex()` over `filter()` and `by_orga` on all org-scoped tables:

```typescript
// In convex/schema.ts

kanbanBoards: defineTable({ ...kanbanBoardType.fields })
  .index("by_orga", ["orgaId"])
  .index("by_team", ["teamId"]),

kanbanColumns: defineTable({ ...kanbanColumnType.fields })
  .index("by_orga", ["orgaId"])
  .index("by_board", ["boardId"])
  .index("by_board_and_position", ["boardId", "position"]),

kanbanCards: defineTable({ ...kanbanCardType.fields })
  .index("by_orga", ["orgaId"])
  .index("by_board", ["boardId"])
  .index("by_column", ["columnId"])
  .index("by_column_and_position", ["columnId", "position"])
  .index("by_role", ["roleId"])
  .index("by_board_and_role", ["boardId", "roleId"]),
```

### Query Pattern Rationale

| Index | Used By | Purpose |
|-------|---------|---------|
| `kanbanBoards.by_team` | `getBoard` | Look up the single board for a team |
| `kanbanColumns.by_board` | `getColumnsForBoard` | Fetch all columns in a board |
| `kanbanColumns.by_board_and_position` | `getColumnsForBoard` (ordered) | Fetch columns in display order |
| `kanbanCards.by_column` | `getCardsInColumn` | Fetch cards for one column |
| `kanbanCards.by_column_and_position` | `getCardsInColumn` (ordered) | Fetch cards in display order within a column |
| `kanbanCards.by_board` | `getAllCardsForBoard`, search | Fetch all cards across a board |
| `kanbanCards.by_role` | `getCardsByRole` | All cards owned by a specific role |
| `kanbanCards.by_board_and_role` | `getCardsForRoleOnBoard` | Filter board by owning role |

---

## Access Control

Kanban access control mirrors the chat system's team-scoped access pattern (see `convex/chat/access.ts`).

### Rules

1. **Board access = team membership.** A member can view/edit a Kanban board if and only if they have at least one role in the team. This reuses `memberHasTeamAccess()` from `convex/chat/access.ts`.

2. **All team members can create, edit, and move cards.** There is no distinction between "card owner" and "card editor" -- any team member can modify any card on the board. This matches the collaborative ethos of Swarmrise.

3. **Card ownership is about role accountability, not permissions.** The `roleId` field tracks which organizational role is responsible for the action, not who can edit it. The responsible person is derived from the role's `memberId` at query time.

### Access Helper

```typescript
// convex/kanban/access.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireAuthAndMembership } from "../utils";
import { memberHasTeamAccess } from "../chat/access";
import type { KanbanBoard } from ".";
import type { Member } from "../members";

/**
 * Verify that the authenticated user has access to a Kanban board.
 * Returns the board and the member document.
 * Throws if access is denied.
 */
export async function requireBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"kanbanBoards">,
): Promise<{ board: KanbanBoard; member: Member }> {
  const board = await ctx.db.get(boardId);
  if (!board) throw new Error("Board not found");

  const member = await requireAuthAndMembership(ctx, board.orgaId);

  if (!board.teamId) throw new Error("Board has no teamId");
  const hasAccess = await memberHasTeamAccess(ctx, member, board.teamId);
  if (!hasAccess) throw new Error("Not a member of this team");

  return { board, member };
}
```

---

## Backend API Surface

### File Structure

```
convex/kanban/
  index.ts      - Type definitions and validators (KanbanBoard, KanbanColumn, KanbanCard)
  functions.ts  - All queries and mutations
  access.ts     - Access control helpers (requireBoardAccess)
```

### Queries

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `kanban.checkTeamAccess` | `{ teamId: Id<"teams"> }` | `boolean` | Check if the authenticated user has access to a team's board. Used as a guard to skip heavier queries for non-members. |
| `kanban.getBoard` | `{ teamId: Id<"teams"> }` | `KanbanBoard \| null` | Get the Kanban board for a team |
| `kanban.getBoardWithData` | `{ teamId: Id<"teams"> }` | `{ board, columns, cards, labels, templateLabelId } \| null` | Get board with all columns, cards, labels, and template label ID in one query (main board loader) |
| `kanban.getCardsByRole` | `{ roleId: Id<"roles"> }` | `KanbanCard[]` | Get all cards owned by a specific role |
| `kanban.getCardsByMember` | `{ memberId: Id<"members"> }` | `KanbanCard[]` | Get all cards where the owning role is held by a given member (for member profile view; queries roles by memberId, then cards by roleId) |
| `kanban.getCommentsForCard` | `{ cardId: Id<"kanbanCards"> }` | `KanbanComment[]` | Get all threaded comments for a card, ordered by creation time (B4) |
| `kanban.getAttachmentsForCard` | `{ cardId: Id<"kanbanCards"> }` | `KanbanAttachment[]` | Get all file attachments for a card (B3) |

### Mutations

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `kanban.createCard` | `{ boardId, columnId, title, roleId, dueDate, comments?, position? }` | `Id<"kanbanCards">` | Create a new card in a column, assigned to a role |
| `kanban.updateCard` | `{ cardId, title?, roleId?, dueDate?, comments? }` | `Id<"kanbanCards">` | Update card details (change owning role, title, etc.) |
| `kanban.moveCard` | `{ cardId, targetColumnId, targetPosition }` | `null` | Move a card to a different column and/or position (drag and drop) |
| `kanban.deleteCard` | `{ cardId }` | `null` | Delete a card permanently |
| `kanban.reorderColumns` | `{ boardId, columnOrder: Id<"kanbanColumns">[] }` | `null` | Reorder columns on a board |
| `kanban.addColumn` | `{ boardId, name }` | `Id<"kanbanColumns">` | Add a new column to the board (A1) |
| `kanban.renameColumn` | `{ columnId, name }` | `null` | Rename an existing column (A1) |
| `kanban.deleteColumn` | `{ columnId }` | `null` | Delete a column and all its cards (A1) |
| `kanban.setColumnWipLimit` | `{ columnId, wipLimit: number \| null }` | `null` | Set or clear the WIP limit for a column (A2) |
| `kanban.bulkMoveCards` | `{ cardIds, targetColumnId }` | `null` | Move multiple cards to a column at once (A5) |
| `kanban.bulkDeleteCards` | `{ cardIds }` | `null` | Delete multiple cards at once (A5) |
| `kanban.createLabel` | `{ boardId, name, color }` | `Id<"kanbanLabels">` | Create a label for the board (B1) |
| `kanban.updateLabel` | `{ labelId, name?, color? }` | `null` | Update a label's name/color (B1) |
| `kanban.deleteLabel` | `{ labelId }` | `null` | Delete a label; cascades to remove from all cards/templates (B1) |
| `kanban.updateChecklist` | `{ cardId, checklist }` | `null` | Replace the entire checklist on a card (B2) |
| `kanban.toggleChecklistItem` | `{ cardId, itemId }` | `null` | Toggle a single checklist item's completed state (B2) |
| `kanban.addAttachment` | `{ cardId, storageId, fileName, fileSize, mimeType }` | `Id<"kanbanAttachments">` | Add a file attachment to a card (B3) |
| `kanban.deleteAttachment` | `{ attachmentId }` | `null` | Delete an attachment and its storage file (B3) |
| `kanban.addComment` | `{ cardId, text }` | `Id<"kanbanComments">` | Add a threaded comment to a card (B4) |
| `kanban.updateComment` | `{ commentId, text }` | `null` | Edit a comment (author-only) (B4) |
| `kanban.deleteComment` | `{ commentId }` | `null` | Delete a comment (author-only) (B4) |
| `kanban.ensureTemplateLabel` | `{ boardId }` | `Id<"kanbanLabels">` | Ensure "template" label exists on a board, creating if needed (B5) |

### Board Auto-Creation

The board is auto-created inside `convex/teams/functions.ts::createTeam`, following the same pattern as channel auto-creation:

```typescript
// In createTeam mutation, after the channel auto-creation block:

// Auto-create Kanban board with default columns
const boardId = await ctx.db.insert("kanbanBoards", {
  teamId,
  orgaId: args.orgaId,
  columnOrder: [], // Will be populated after columns are created
});

const defaultColumns = ["New Topics", "Actions", "Done", "Archived"];
const columnIds: Id<"kanbanColumns">[] = [];

for (let i = 0; i < defaultColumns.length; i++) {
  const columnId = await ctx.db.insert("kanbanColumns", {
    boardId,
    orgaId: args.orgaId,
    name: defaultColumns[i],
    position: i,
  });
  columnIds.push(columnId);
}

// Update board with column order
await ctx.db.patch(boardId, { columnOrder: columnIds });
```

### Board Cleanup on Team Deletion

In `convex/teams/functions.ts::deleteTeam`, Kanban data must be cleaned up alongside other team artifacts (channels, roles, topics, policies):

```typescript
// Clean up Kanban data
const teamBoard = await ctx.db
  .query("kanbanBoards")
  .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
  .unique();

if (teamBoard) {
  // Delete all cards on the board
  const boardCards = await ctx.db
    .query("kanbanCards")
    .withIndex("by_board", (q) => q.eq("boardId", teamBoard._id))
    .collect();
  for (const card of boardCards) {
    await ctx.db.delete(card._id);
  }

  // Delete all columns on the board
  const boardColumns = await ctx.db
    .query("kanbanColumns")
    .withIndex("by_board", (q) => q.eq("boardId", teamBoard._id))
    .collect();
  for (const column of boardColumns) {
    await ctx.db.delete(column._id);
  }

  // Delete the board itself
  await ctx.db.delete(teamBoard._id);
}
```

### Position Management

Card and column ordering uses a fractional indexing approach for efficient reordering:

- New cards get position = `(max existing position in column) + 1024`
- When a card is moved between two existing cards, its position = `(position_above + position_below) / 2`
- When positions get too close (difference < 1), rebalance all positions in the column to even spacing (e.g., 1024, 2048, 3072, ...)

This avoids rewriting every card's position on every drag operation.

---

## Frontend Architecture

### Component Hierarchy

```
src/components/Kanban/
  KanbanBoard/
    index.tsx             - Main board container, fetches data, provides DnD context,
                            manages collapsed state (A3), selection mode (A5), add column (A1)
  KanbanColumn/
    index.tsx             - Single column with header, card list, inline rename (A1),
                            delete confirmation (A1), collapse toggle (A3), WIP indicator (A2),
                            selection checkboxes (A5), column context menu
  KanbanCard/
    index.tsx             - Card component (draggable), supports selection mode with checkbox (A5)
  KanbanCardModal/
    index.tsx             - Modal for creating/editing a card
  KanbanBoardSettings/
    index.tsx             - Board settings modal for WIP limits per column (A4)
  KanbanEmptyState/
    index.tsx             - Empty state when board has no cards
```

### Component Details

#### KanbanBoard

The main container component. Rendered inside the `TeamManageView` as a new section, or as a dedicated view accessible from team context.

```typescript
type KanbanBoardProps = {
  teamId: Id<"teams">;
};
```

Responsibilities:
- Fetch board data via `useQuery(api.kanban.functions.getBoardWithData, { teamId })`
- Provide DnD context (wraps columns in `<DndContext>`)
- Manage search state
- Handle column reordering

#### KanbanColumn

Renders a single column with its header and a droppable zone for cards.

```typescript
type KanbanColumnProps = {
  column: KanbanColumn;
  cards: KanbanCard[];
  roleMap: Map<Id<"roles">, Role>;
  memberMap: Map<Id<"members">, Member>;
  onCreateCard: () => void;
};
```

Responsibilities:
- Render column header with name and card count
- Render sorted cards
- "Add card" button at the bottom
- Droppable target for card drag operations

#### KanbanCard

A single card rendered within a column. Draggable.

```typescript
type KanbanCardProps = {
  card: KanbanCard;
  role: Role;             // The owning role (provides icon, title)
  roleMember: Member;     // The member currently holding the role (provides avatar, name)
  onClick: () => void;
};
```

Responsibilities:
- Display card title, role icon + member avatar side-by-side, due date
- Role icon rendered as an SVG using `getRoleIconPath(role.iconKey, role.roleType)`
- Member avatar rendered beside the role icon (small circular photo or initials)
- Visual indicator for overdue cards (red tint or border)
- Draggable via DnD library
- Click to open card detail modal

#### KanbanCardModal

Modal for creating or editing a card. Rendered via `createPortal` to `document.body` (following the pattern from `RoleVisualView` duties modal -- see agent memory about portal pattern for modals).

```typescript
type KanbanCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"kanbanBoards">;
  columns: KanbanColumn[];
  roles: Role[];                   // Team roles for the role picker
  members: Map<Id<"members">, Member>; // Members lookup for displaying role holders
  columnId?: Id<"kanbanColumns">;  // Pre-selected column (for "add card" in a specific column)
  card?: KanbanCard;               // Existing card (for edit mode)
};
```

Fields:
- Title (text input, required)
- Role (role dropdown, required) -- shows role title + icon + current holder's name
- Due date (date picker, required)
- Comments (textarea, optional)
- Column (dropdown, only shown in create mode)

### Integration with Existing Views

The Kanban board is accessed as a **third view mode** alongside "visual" and "manage" for team context, OR as a dedicated section within `TeamManageView`. The recommended approach:

**Option A: Section in TeamManageView (Phase 1)**
Add a collapsible "Kanban Board" section to `TeamManageView`, below the existing roles and members sections. Simple, no routing changes needed.

**Option B: Dedicated route (Phase 2+)**
Add a `/o/:orgaId/teams/:teamId/kanban` route that renders a full-screen Kanban board. This requires a route addition in `src/main.tsx` and a navigation element in `TeamManageView`.

Phase 1 implements Option A. Phase 2 considers Option B if the board needs more screen real estate.

### Routing (Phase 2)

```typescript
// src/routes/index.ts - add:
teamKanban: (orgaId: Id<"orgas">, teamId: Id<"teams">) =>
  `/o/${orgaId}/teams/${teamId}/kanban`,

// src/main.tsx - add route:
<Route path="teams/:teamId/kanban" element={<App />} />
```

---

## Drag and Drop

### Library Choice: `@dnd-kit/core`

The project currently has no drag-and-drop library installed. We choose `@dnd-kit` for:

- **Active maintenance** - Modern React library, works well with React 19
- **Accessibility** - Built-in keyboard support and ARIA announcements
- **Sortable plugin** - `@dnd-kit/sortable` handles within-column reordering elegantly
- **Flexible** - Supports both within-column (sortable) and cross-column (droppable) patterns
- **Small bundle** - Tree-shakeable, only import what we use

### Packages to Install

```bash
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### DnD Architecture

The board has two levels of drag-and-drop:

1. **Column reordering** -- Columns are sortable horizontally via a `SortableContext` with `horizontalListSortingStrategy`. Each column uses `useSortable` with a prefixed ID (`sortable-col:{columnId}`) to distinguish column drags from card drags.

2. **Card movement** -- Within each column, cards are sortable vertically via a per-column `SortableContext` with `verticalListSortingStrategy`. Cards can also be moved across columns.

```
<DndContext>                           -- from @dnd-kit/core
  <SortableContext                     -- horizontal: column reordering
    items={columnSortableIds}
    strategy={horizontalListSortingStrategy}>
    <KanbanColumn>                     -- useSortable("sortable-col:{id}")
      <SortableContext                 -- vertical: card reordering within column
        items={cardIds}
        strategy={verticalListSortingStrategy}>
        <SortableCard />               -- useSortable(card._id)
        ...
      </SortableContext>
    </KanbanColumn>
    ...
  </SortableContext>
  <DragOverlay>                        -- ghost card OR ghost column during drag
    <KanbanCard /> | <KanbanColumn isOverlay />
  </DragOverlay>
</DndContext>
```

### ID Namespacing

To distinguish column drags from card drags in the single `DndContext`:

- Column sortable IDs use the prefix `sortable-col:` (e.g., `sortable-col:j57abc123`)
- Card sortable IDs use the raw Convex card ID (e.g., `j57xyz789`)
- Column droppable IDs use the prefix `column:` (e.g., `column:j57abc123`)

The `handleDragStart` checks the prefix to set either `activeColumnId` or `activeCardId`. The `handleDragEnd` routes to column reorder logic or card move logic based on the same prefix.

### Column Drag Handle

Expanded columns show a 6-dot grip icon in the header as a dedicated drag handle. The `colAttributes` and `colListeners` from `useSortable` are spread only onto this handle element, so dragging is initiated from the handle while clicks on the column name, collapse toggle, and menu remain unaffected.

Collapsed columns use the entire collapsed bar as both the drag handle and the expand button, using the same activation constraints (5px movement / 250ms touch delay) to separate drags from clicks.

### DnD Event Handling

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  // Column reorder
  if (isColumnSortableId(String(active.id))) {
    // Compute new column order and call reorderColumns mutation
    return;
  }

  // Card movement
  const activeCardId = active.id as Id<"kanbanCards">;
  // Determine target column and position
  // Call kanban.moveCard mutation
}
```

### Optimistic Updates

For instant visual feedback during drag operations, we apply optimistic updates before the Convex mutation completes:

1. On `dragEnd`, immediately update local card order/column in React state
2. Call `moveCard` mutation
3. If mutation fails, revert to server state (Convex reactivity handles this automatically since `useQuery` will re-fire with correct data)

---

## Search

The search bar filters cards client-side across all columns on the board. Since the entire board's data is loaded in a single query (`getBoardWithData`), client-side filtering is efficient and instant.

### Search Behavior

- Filters by card title (case-insensitive substring match)
- Filters by role title (e.g., searching "secretary" shows cards owned by the secretary role)
- Filters by role holder's name (first name, last name of the member currently holding the role)
- When search is active, columns only show matching cards
- Empty columns during search are hidden or dimmed
- Clear search button to reset

No server-side search index is needed for Phase 1 since boards are small (typically <100 cards). If boards grow large, a Convex search index on `kanbanCards.title` can be added later.

---

## i18n Considerations

### New Namespace

Add a `kanban` namespace to the i18n configuration:

```typescript
// src/i18n/index.ts - add 'kanban' to ns array:
ns: ['common', 'orgs', 'members', ..., 'kanban'],
```

### Translation Files

Create `public/locales/{lng}/kanban.json` for all supported languages (en, fr, es, it, uk, zh-TW).

### Key Structure (English)

```json
{
  "board": {
    "title": "Kanban Board",
    "empty": "No cards yet. Create one to get started.",
    "search": "Search cards...",
    "addCard": "Add card",
    "cardCount": "{{count}} card",
    "cardCount_plural": "{{count}} cards"
  },
  "columns": {
    "newTopics": "New Topics",
    "actions": "Actions",
    "done": "Done",
    "archived": "Archived"
  },
  "card": {
    "title": "Title",
    "role": "Role",
    "dueDate": "Due date",
    "comments": "Comments",
    "overdue": "Overdue",
    "create": "Create card",
    "edit": "Edit card",
    "delete": "Delete card",
    "deleteConfirm": "Are you sure you want to delete this card?",
    "titleRequired": "Title is required",
    "roleRequired": "Role is required",
    "dueDateRequired": "Due date is required",
    "noComments": "No comments"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "moveToColumn": "Move to {{column}}"
  },
  "dnd": {
    "dragStart": "Picked up card {{title}}",
    "dragOver": "Card {{title}} is over {{column}}",
    "dragEnd": "Card {{title}} dropped in {{column}} at position {{position}}",
    "dragCancel": "Drag cancelled"
  }
}
```

The `dnd` section provides screen reader announcements for accessible drag-and-drop operations (used by `@dnd-kit`'s `announcements` prop).

---

## Integration Points

### 1. Team Creation (`convex/teams/functions.ts::createTeam`)

Add Kanban board auto-creation after the channel auto-creation block (line ~208 in the current file). See [Board Auto-Creation](#board-auto-creation) above.

### 2. Team Deletion (`convex/teams/functions.ts::deleteTeam`)

Add Kanban data cleanup alongside existing cleanup (channels, roles, topics, policies). See [Board Cleanup on Team Deletion](#board-cleanup-on-team-deletion) above.

### 3. Schema (`convex/schema.ts`)

Add three new table definitions with indexes. Import types from `convex/kanban/index.ts`.

### 4. Frontend - TeamManageView

Add a "Kanban Board" section that renders the `<KanbanBoard>` component. This section can be collapsible and placed after the existing "Team Members" section.

### 5. i18n Config (`src/i18n/index.ts`)

Add `'kanban'` to the `ns` array.

### 6. Member Profile (Future)

From `MemberManageView` or `MemberVisualView`, show all cards where the owning role is held by a given member across all teams using `kanban.getCardsByMember` (which resolves roles by memberId, then cards by roleId).

### 7. Decision Audit Trail (Optional, Future)

Card creation, moves, and edits could be recorded as Decisions for governance traceability. This is not in Phase 1 but the pattern is established.

---

## Implementation Plan

### Phase 1: Core Backend + Schema (Estimated: 1 session)

**Goal:** Schema, types, board auto-creation, and all backend functions working.

| Step | Task | Details |
|------|------|---------|
| 1.1 | Create `convex/kanban/index.ts` | Type definitions for KanbanBoard, KanbanColumn, KanbanCard |
| 1.2 | Add tables to `convex/schema.ts` | Three tables with all indexes |
| 1.3 | Create `convex/kanban/access.ts` | `requireBoardAccess` helper |
| 1.4 | Create `convex/kanban/functions.ts` | All queries and mutations |
| 1.5 | Modify `convex/teams/functions.ts` | Board auto-creation in `createTeam`, cleanup in `deleteTeam` |
| 1.6 | Verify with `bun run dev:backend` | Ensure schema deploys and functions compile |

### Phase 2: Frontend Board UI (Estimated: 1-2 sessions)

**Goal:** Visible Kanban board in the team manage view with cards rendered in columns.

| Step | Task | Details |
|------|------|---------|
| 2.1 | Install `@dnd-kit` packages | `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| 2.2 | Create i18n files | `public/locales/{lng}/kanban.json` for all 6 languages |
| 2.3 | Add `'kanban'` to i18n config | Update `src/i18n/index.ts` ns array |
| 2.4 | Create `KanbanCard` component | Card display with title, owner avatar, due date |
| 2.5 | Create `KanbanColumn` component | Column with header, card list, "add card" button |
| 2.6 | Create `KanbanBoard` component | Board container fetching data and rendering columns |
| 2.7 | Create `KanbanEmptyState` component | Shown when board has no cards |
| 2.8 | Integrate into `TeamManageView` | Add Kanban section below team members |

### Phase 3: Card CRUD + Modal (Estimated: 1 session)

**Goal:** Users can create, edit, and delete cards through a modal dialog.

| Step | Task | Details |
|------|------|---------|
| 3.1 | Create `KanbanCardModal` component | Form with title, owner picker, date picker, comments |
| 3.2 | Wire create card flow | "Add card" button opens modal, submits to `createCard` mutation |
| 3.3 | Wire edit card flow | Click card to open modal in edit mode, submits to `updateCard` |
| 3.4 | Wire delete card flow | Delete button in modal with confirmation |
| 3.5 | Add overdue visual indicator | Red tint/border on cards past their due date |

### Phase 4: Drag and Drop (Estimated: 1 session)

**Goal:** Cards can be dragged between columns and reordered within columns.

| Step | Task | Details |
|------|------|---------|
| 4.1 | Add DndContext to KanbanBoard | Wrap columns in `<DndContext>` and `<SortableContext>` |
| 4.2 | Make cards draggable | `useSortable()` on each card |
| 4.3 | Implement `handleDragEnd` | Determine target column/position, call `moveCard` mutation |
| 4.4 | Add DragOverlay | Ghost card during drag for visual feedback |
| 4.5 | Add optimistic updates | Instant visual feedback before mutation completes |
| 4.6 | Add accessibility announcements | Screen reader announcements for drag operations |

### Phase 5: Search + Polish (Estimated: 1 session)

**Goal:** Search bar, responsive design, keyboard shortcuts, and final polish.

| Step | Task | Details |
|------|------|---------|
| 5.1 | Create `KanbanSearchBar` component | Text input that filters cards client-side |
| 5.2 | Implement search filtering | Filter by title and owner name across all columns |
| 5.3 | Add responsive design | Mobile-friendly column layout (horizontal scroll on small screens) |
| 5.4 | Add keyboard shortcuts | Quick card creation, navigation between columns |
| 5.5 | Final UI polish | Transitions, hover states, loading states |

### Phase 6: Future Enhancements (Not scheduled)

- Custom columns (add, rename, reorder, delete)
- Member view: cross-team card aggregation on member profile
- Card labels/tags
- Card attachments (using Convex file storage)
- Decision audit trail integration
- Dedicated full-screen route for the board
- Column WIP limits
- Due date notifications

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Data model design | Done | See this document |
| `convex/kanban/index.ts` (types) | Done | Phase 1.1 |
| Schema tables + indexes | Done | Phase 1.2 |
| `convex/kanban/access.ts` | Done | Phase 1.3 |
| `convex/kanban/functions.ts` | Done | Phase 1.4 |
| Board auto-creation in `createTeam` | Done | Phase 1.5 |
| Board cleanup in `deleteTeam` | Done | Phase 1.5 |
| `@dnd-kit` installation | Done | Phase 2.1 |
| i18n `kanban` namespace | Done | Phase 2.2-2.3 (6 languages) |
| `KanbanCard` component | Done | Phase 2.4 |
| `KanbanColumn` component | Done | Phase 2.5 |
| `KanbanBoard` component | Done | Phase 2.6 |
| `KanbanEmptyState` component | Done | Phase 2.7 |
| Integration into `TeamManageView` | Done | Phase 2.8 |
| `KanbanCardModal` component | Done | Phase 3.1 |
| Card CRUD flows | Done | Phase 3.2-3.4 |
| Overdue visual indicator | Done | Phase 3.5 (built into KanbanCard) |
| Drag and drop | Done | Phase 4 |
| Click-to-edit cards | Done | PointerSensor distance constraint (5px) separates click from drag |
| Touch tap-to-edit cards | Done | TouchSensor delay constraint (250ms) separates tap from long-press drag |
| i18n type declarations | Done | `kanban` namespace added to `src/i18n/types.ts` |
| Search/filter | Done | Phase 5.1-5.2 |
| Responsive design | Done | Phase 5.3 |
| Graceful no-access handling | Done | `checkTeamAccess` query gates all downstream queries; non-members see i18n message with zero backend errors |
| **Role-based ownership migration** | | |
| Schema: `ownerId` -> `roleId` in kanbanCards | Done | `roleId: v.id("roles")` in `kanbanCardType` |
| Schema: indexes `by_role`/`by_board_and_role` | Done | In `convex/schema.ts` |
| Backend: update `kanban/index.ts` types | Done | `kanbanCardType` uses `roleId` |
| Backend: update `kanban/functions.ts` | Done | All queries/mutations reference `roleId` |
| Backend: add `migrateOwnerToRole` internal mutation | Done | One-time migration in `functions.ts` |
| Backend: update `getBoardWithData` to include roles | Done | `KanbanBoard` fetches roles via `listRolesInTeam` |
| Frontend: `KanbanCard` shows role icon + member avatar | Done | Dual display: role SVG icon + member photo |
| Frontend: `KanbanCardModal` role picker (replaces member picker) | Done | Dropdown showing team roles with icons |
| Frontend: `KanbanBoard` fetches roles for the team | Done | `useQuery(listRolesInTeam)` in board component |
| Frontend: `KanbanColumn` passes roleMap | Done | Role data threaded to card components |
| Frontend: update search to filter by role title + holder name | Done | Client-side filter by card title, role title, member name |
| i18n: update `owner` -> `role` keys in all 6 languages | Done | `card.owner` -> `card.role`, `card.ownerRequired` -> `card.roleRequired`; added `card.selectRole`, `card.column`, `card.genericError` |
| **Member Kanban View (D4)** | | |
| Backend: `getCardsByMemberWithContext` query | Done | Enriched query returns cards grouped by team with column/role context |
| Backend: `MemberKanbanCard` + `MemberKanbanTeamGroup` validators | Done | In `convex/kanban/index.ts` |
| Frontend: `MemberKanbanView` component | Done | `src/components/MemberKanbanView/index.tsx` |
| i18n: `memberView` keys in all 6 languages | Done | title, empty, totalCards, viewTeamBoard |
| Integration into FocusContainer PrismFlip | Done | Third "kanban" face on member prism (wired by Giuseppe) |
| **Due Date Notifications (E1)** | | |
| Notification category `kanban_due` | Done | Added to `notifications/index.ts` discriminated union |
| Kanban due payload type | Done | `cardId`, `cardTitle`, `teamId`, `teamName`, `dueDate`, `dueType` |
| Notification preferences `kanban_due` | Done | Optional field in `notificationPreferences/index.ts` |
| Cron job `checkDueDateNotifications` | Done | Hourly cron in `crons.ts`, internal mutation in `kanban/functions.ts` |
| Dedup via `groupKey` | Done | `kanban_due:{cardId}:{approaching\|overdue}`, checked before creation |
| Frontend `NotificationItem` rendering | Done | Clock icon, red (overdue) / amber (approaching) color, title + team |
| i18n notification keys (6 languages) | Done | `kanbanDueApproachingTitle`, `kanbanDueOverdueTitle`, `kanbanDueSubtitle` |
| **Category A: Core Board Enhancements** | | |
| A1: Custom Columns - Backend (`addColumn`, `renameColumn`, `deleteColumn`) | Done | Mutations with board access control, column order management |
| A1: Custom Columns - Frontend (inline rename, delete confirm, add column) | Done | Column header context menu, inline rename input, add column button at end of board |
| A2: Column WIP Limits - Schema (`wipLimit` optional field on `kanbanColumnType`) | Done | `v.optional(v.number())` in column type |
| A2: Column WIP Limits - Backend (`setColumnWipLimit` mutation) | Done | Set or clear WIP limit; pass null/0 to remove |
| A2: Column WIP Limits - Frontend (visual indicators) | Done | Amber border + warning icon when exceeded; count/limit display in header |
| A3: Column Collapse/Expand - Frontend (localStorage persistence) | Done | Collapsed columns show vertical name + count; stored per board in localStorage |
| A4: Board Settings Modal - Frontend (`KanbanBoardSettings` component) | Done | Portal-based modal; configure WIP limits for all columns at once |
| A5: Bulk Card Actions - Backend (`bulkMoveCards`, `bulkDeleteCards`) | Done | Atomic mutations; verify board access via first card |
| A5: Bulk Card Actions - Frontend (selection mode, toolbar) | Done | Select button toggles selection mode; checkboxes on cards; bulk move/delete toolbar |
| A1-A5: i18n keys (6 languages) | Done | `columnActions.*`, `settings.*`, `bulk.*` sections in all language files |
| **Column Drag-and-Drop Reordering (A6)** | | |
| Column DnD: Horizontal SortableContext for columns | Done | `horizontalListSortingStrategy` wrapping all columns |
| Column DnD: `useSortable` per column with prefix ID | Done | `sortable-col:{columnId}` prefix distinguishes from card IDs |
| Column DnD: Drag handle in column header | Done | 6-dot grip icon; collapsed columns use full bar as handle |
| Column DnD: DragOverlay for column ghost | Done | Renders semi-transparent column clone during drag |
| Column DnD: `reorderColumns` mutation wired | Done | Updates `columnOrder` array and column `position` fields |
| Column DnD: Disabled in selection mode | Done | `useSortable({ disabled: selectionMode })` |
| Column DnD: Works with collapsed columns | Done | Collapsed columns are draggable via the entire collapsed bar |
| Column DnD: i18n `dragToReorder` key (6 languages) | Done | `columnActions.dragToReorder` in en/fr/es/it/uk/zh-TW |
| **Category B: Card Enhancements (B1-B6)** | | |
| B1: Labels - Schema (`kanbanLabels` table, `labelIds` on card) | Done | `kanbanLabelType` with boardId, orgaId, name, color; `by_board` index |
| B1: Labels - Backend (`createLabel`, `updateLabel`, `deleteLabel`) | Done | Delete cascades to remove label from all cards + templates |
| B1: Labels - Frontend (label badges on cards, picker in modal, inline creation) | Done | Color-coded pill bars on cards; toggle picker + create-new in modal |
| B1: Labels - Search integration | Done | Cards filterable by label name in search bar |
| B2: Checklists - Schema (`checklist` inline array on card) | Done | `checklistItemValidator` (id, text, completed); stored inline on card |
| B2: Checklists - Backend (`updateChecklist`, `toggleChecklistItem`) | Done | Full checklist replace and individual item toggle |
| B2: Checklists - Frontend (progress bar on cards, editor in modal) | Done | Progress bar with N/M count; add/remove/toggle items in modal |
| B3: Attachments - Schema (`kanbanAttachments` table) | Done | `kanbanAttachmentType` with storageId, fileName, fileSize, mimeType, uploadedBy |
| B3: Attachments - Backend (`addAttachment`, `deleteAttachment`, `getAttachmentsForCard`) | Done | Upload via `generateUploadUrl`; delete cascades to storage file |
| B3: Attachments - Frontend (file upload, listing, delete in modal) | Done | Drag-or-click upload; file list with size; delete with storage cleanup |
| B3: Attachments - Cascade deletion | Done | Card/column/bulk delete removes associated attachments + storage files |
| B4: Comments - Schema (`kanbanComments` table) | Done | `kanbanCommentType` with authorId, text; `by_card` index |
| B4: Comments - Backend (`addComment`, `updateComment`, `deleteComment`, `getCommentsForCard`) | Done | Author-only edit/delete enforcement |
| B4: Comments - Frontend (threaded list in modal, add/delete) | Done | Author avatar + timestamp; Cmd+Enter submit; own-comment delete |
| B5: Templates - Refactored to label-based approach | Done | Templates are cards with "template" purple label; `ensureTemplateLabel` mutation; no separate table |
| B5: Templates - Frontend (template selector in create mode, mark-as-template toggle) | Done | Dropdown of template-labeled cards prefills form; toggle button adds/removes template label |
| B6: Priority - Schema (`priority` optional field on card) | Done | `priorityValidator`: low/medium/high/critical |
| B6: Priority - Frontend (colored border + dot on cards, selector in modal) | Done | Left border color + dot indicator; button row selector in modal |
| B6: Priority - Search integration | Done | Cards filterable by priority level in search bar |
| B1-B6: i18n keys (6 languages) | Done | `labels.*`, `checklist.*`, `attachments.*`, `threadedComments.*`, `templates.*`, `priority.*` |
| B1-B6: `getBoardWithData` updated | Done | Returns `labels` and `templates` alongside board/columns/cards |

---

## Design Decisions

### 1. One board per team (not configurable)

**Decision:** Each team gets exactly one Kanban board, auto-created with the team.

**Rationale:** Matches the channel model (one channel per team). Keeps the mental model simple. A team is a unit of coordination, and one board is sufficient. If a team needs to track fundamentally different types of work, that is a signal the team should be split.

### 2. Single role owner per card (not optional, not multiple)

**Decision:** Every card must be owned by exactly one role (`roleId` is required). The card references a role, not a member directly.

**Rationale:** Swarmrise's governance model is built on clear accountability tied to organizational structure. By linking cards to roles rather than people: (a) "Everyone is responsible" means "no one is responsible" -- requiring exactly one owning role forces explicit commitment. (b) When a role is reassigned to a different member, all associated cards automatically reflect the new holder without any data migration or manual updates. (c) The card display shows both the role icon and the current member's avatar, reinforcing the organizational structure.

### 3. Due date is required

**Decision:** Every card must have a due date.

**Rationale:** A card without a due date is a wish, not a commitment. Due dates create accountability and enable overdue detection. If the exact date is unknown, pick a reasonable deadline -- it can always be updated.

### 4. ~~Comments as a simple string (not threaded)~~ -- SUPERSEDED by B4

**Decision:** ~~Card comments are a single text field, not a threaded discussion.~~ As of B4, comments are stored in a separate `kanbanComments` table with author identity and timestamps. The original `comments` string field is retained for backward compatibility but new comments use the threaded system.

**Rationale:** The original rationale (use chat for discussions) remains valid for detailed conversations. However, lightweight per-card comments with author attribution improve accountability and traceability without requiring users to switch to the chat channel.

### 5. Client-side search (not server-side)

**Decision:** Search filters cards client-side from the already-loaded board data.

**Rationale:** A typical team board has 10-50 cards. Loading all cards in one query is efficient, and client-side filtering provides instant results without additional round-trips. Server-side search can be added if boards grow large.

### 6. Fractional indexing for position

**Decision:** Use fractional positioning (midpoint between neighbors) instead of sequential integers.

**Rationale:** Reordering a card between two others only requires updating one record's position, not rewriting every card in the column. This minimizes writes and avoids race conditions in concurrent editing.

### 7. @dnd-kit over react-beautiful-dnd

**Decision:** Use `@dnd-kit` for drag-and-drop.

**Rationale:** `react-beautiful-dnd` is no longer actively maintained (last release 2022). `@dnd-kit` is modern, tree-shakeable, has excellent accessibility support, and works well with React 19. It is the community-recommended successor.

### 8. Phase 1 integration as TeamManageView section (not separate route)

**Decision:** Start by embedding the board in the existing team manage view, not as a separate route.

**Rationale:** Avoids routing changes, keeps the board visible alongside team context (members, roles). A dedicated route can be added in a future phase if more screen real estate is needed.

### 9. Distance-based drag activation to enable click-to-edit

**Decision:** Configure `PointerSensor` with `activationConstraint: { distance: 5 }` and `TouchSensor` with `activationConstraint: { delay: 250, tolerance: 5 }` instead of using a dedicated drag handle.

**Rationale:** Without an activation constraint, `@dnd-kit` captures pointer events on `pointerdown`, preventing the native `click` event from firing on cards. A distance constraint (5px) tells dnd-kit to wait until the pointer moves at least 5 pixels before activating drag. A quick click (pointer down + pointer up with < 5px movement) falls through to the normal `onClick` handler, opening the card edit modal. For touch devices, a 250ms delay separates a quick tap (edit) from a long press (drag). This preserves full-card dragging without needing a separate drag handle element.

### 10. Access-gated query skipping (not error catching)

**Decision:** The frontend uses a lightweight `checkTeamAccess` query as a guard before calling `getBoardWithData`, `listMembers`, or `ensureBoard`. When the user lacks access, these queries are skipped entirely using Convex's `"skip"` sentinel.

**Rationale:** Previously the frontend called `getBoardWithData` unconditionally and relied on catching `ensureBoard` mutation failures to detect non-membership, which produced console errors. The `checkTeamAccess` query is a cheap boolean check that prevents all downstream queries and mutations from firing when the user is not a team member. This eliminates console exceptions entirely and provides a clean "no access" message without any backend error noise.

### 11. Role-based card ownership (not member-based)

**Decision:** Cards reference `roleId: Id<"roles">` instead of `ownerId: Id<"members">`. The responsible person is derived at query/render time by looking up `role.memberId`.

**Rationale:** In Swarmrise, accountability belongs to organizational functions (roles), not individuals. When a role is reassigned from person A to person B, all kanban cards tied to that role should automatically reflect the new holder. With member-based ownership, every card would need to be manually re-assigned on role changes. With role-based ownership, the indirection through the role document makes reassignment a zero-touch operation for the Kanban system. The card display renders both the role icon (from `role.iconKey`/`role.roleType`) and the current holder's avatar (from `role.memberId -> member.pictureURL`), making the organizational context visible at a glance.

**Migration:** Existing cards with `ownerId: Id<"members">` must be migrated to `roleId: Id<"roles">`. Each card's `ownerId` maps to `member -> member.roleIds -> find role in same team as the card's board`. If a member holds multiple roles in the team, the migration script should use a heuristic (e.g., pick the first role, or flag for manual review). If a member has no role in the team, the card should be flagged for manual assignment.

### 12. Soft WIP limits (warning, not blocking)

**Decision:** WIP limits are advisory -- exceeding the limit changes the column header to amber and shows a warning icon, but does not prevent cards from being added or moved into the column.

**Rationale:** Kanban WIP limits are a signal to the team that a bottleneck is forming. Hard limits would frustrate users during drag-and-drop and create awkward UX when moving cards. The visual warning is sufficient to prompt a conversation about work distribution without blocking workflow.

### 13. Column collapse state stored in localStorage (not server)

**Decision:** Which columns are collapsed is a per-user visual preference stored in localStorage keyed by board ID, not persisted to the database.

**Rationale:** Collapse state is a personal display preference, not shared team state. Storing it in the database would require a per-user-per-board preferences table, which is over-engineered for this use case. localStorage is simple, fast, and appropriately scoped. If the user switches browsers, columns start expanded -- an acceptable tradeoff.

### 14. Bulk actions use selection mode toggle (not drag multi-select)

**Decision:** Bulk card operations require entering a dedicated "selection mode" via a toggle button. In this mode, drag-and-drop is disabled and each card shows a checkbox. Exiting selection mode clears all selections.

**Rationale:** Mixing drag-and-drop with multi-select (e.g., shift-click) creates confusing interaction patterns where the user's intent is ambiguous. A dedicated selection mode makes the interaction clear: you are either in "organize mode" (drag cards) or "batch mode" (select and act on cards). Disabling drag in selection mode prevents accidental card movement during selection.

### 15. Column drag uses a dedicated handle, not the entire header

**Decision:** Expanded columns have a 6-dot grip icon as the drag handle for column reordering, placed to the left of the collapse toggle in the column header. Only dragging from this handle initiates a column drag. Collapsed columns use the entire collapsed bar as the drag handle (since there is no other interactive surface).

**Rationale:** The column header contains clickable elements (collapse toggle, column name for rename, context menu). Attaching drag listeners to the entire header would create ambiguity between drag and click. A dedicated grip handle clearly signals "drag me" and leaves all other header interactions intact. The 5px activation constraint from the PointerSensor still applies, providing additional protection against accidental drags. For collapsed columns, the only interaction is clicking to expand, and the activation constraint adequately separates click from drag.

### 16. Column and card drags use a prefixed ID namespace

**Decision:** Column sortable IDs use the prefix `sortable-col:` while card IDs use their raw Convex IDs. The `handleDragStart` and `handleDragEnd` check this prefix to route to the correct logic.

**Rationale:** A single `DndContext` wraps the entire board (columns and cards). Without namespacing, it would be impossible to distinguish whether a drag operation targets a column or a card. The prefix approach is simple, unambiguous, and avoids needing nested or separate `DndContext` instances, which would complicate cross-column card moves.

### 17. Column deletion cascades to cards

**Decision:** Deleting a column permanently deletes all cards within it. There is no "move cards to another column" option during delete.

**Rationale:** The delete confirmation dialog shows the number of cards that will be deleted, making the consequence explicit. Requiring card migration before deletion adds complexity and slows the operation. Cards in a column being deleted are likely irrelevant -- if they were important, the user would move them first. A future enhancement could offer a "move cards first" option if user feedback warrants it.

### 18. Labels are board-scoped entities (not inline on cards)

**Decision:** Labels are stored in a separate `kanbanLabels` table, scoped to a board. Cards reference labels via `labelIds: Id<"kanbanLabels">[]`. Labels have a `name` and a `color` (Tailwind color key).

**Rationale:** Board-scoped labels allow consistent categorization across all cards. If labels were inline strings, there would be no way to ensure consistent naming or coloring. A separate table enables: (a) shared vocabulary across the board, (b) rename-once-update-everywhere, (c) deletion that cleanly removes the label from all cards and templates. The 10-color palette (red, orange, amber, green, teal, blue, indigo, purple, pink, gray) covers common categorization needs without overwhelming users.

### 19. Checklists stored inline on cards (not as a separate table)

**Decision:** Checklist items are stored as an inline array `checklist: ChecklistItem[]` directly on the card document, not in a separate table.

**Rationale:** Checklists are tightly coupled to their card and are always loaded/displayed together. A separate table would require an additional query per card and complicate the data model unnecessarily. The inline approach means: (a) no extra queries -- checklist data is returned with `getBoardWithData`, (b) atomic updates -- toggling an item is a single `patch` operation, (c) simple deletion -- deleting a card automatically removes its checklist. The trade-off is that concurrent edits to the same checklist can overwrite each other, but this is acceptable for small checklists (typically 3-10 items) on a team board.

### 20. Comments and attachments are separate tables (not inline)

**Decision:** Threaded comments (`kanbanComments`) and file attachments (`kanbanAttachments`) are stored in separate tables, not inline on the card.

**Rationale:** Unlike checklists, comments and attachments can grow unbounded and are loaded on-demand (only when the card modal is open). Storing them inline would bloat every card document and slow down `getBoardWithData` which loads all cards for the board. Separate tables with `by_card` indexes allow lazy loading: `getCommentsForCard` and `getAttachmentsForCard` are only called when a specific card's modal is opened. Cascade deletion is handled explicitly in `deleteCard`, `deleteColumn`, and `bulkDeleteCards`.

### 21. Priority as optional field (not required)

**Decision:** Priority is an optional field on cards (`priority?: "low" | "medium" | "high" | "critical"`). Cards without a priority are displayed normally with no priority indicator.

**Rationale:** Not every card needs a priority. Forcing a priority on every card adds friction during creation. The four-level scale (low/medium/high/critical) is standard and intuitive. Visual indicators (colored left border + dot) make priority scannable without cluttering the card. Priority is filterable in search.

### 22. Templates are regular cards with a "template" label (not a separate table)

**Decision:** Templates are implemented as regular kanban cards that have a specific "template" label (purple color) attached. There is no separate `kanbanTemplates` table. To create a template, users create a normal card and mark it as a template via a toggle in the card modal. To use a template, users pick from cards with the template label when creating a new card, and the card's fields (title, description, checklist, priority, labels minus the template label) are copied into the new card form.

**Rationale:** A separate template system with its own table, CRUD mutations, and management UI was over-engineered for the actual use case. Templates are just reusable card patterns -- making them regular cards with a label is more intuitive: users can see them on the board, edit them like any other card, and the template label is self-documenting. This also eliminates schema complexity (one fewer table), reduces backend code (no template CRUD mutations), and leverages the existing label system. The `ensureTemplateLabel` mutation auto-creates the "template" purple label on first use, so there is no setup required.

### 23. Author-only edit/delete for comments

**Decision:** Only the comment author can edit or delete their own comments. Other team members can view all comments but cannot modify them.

**Rationale:** This mirrors standard comment systems (GitHub, Slack) and prevents accidental or unauthorized modification of others' contributions. The board is collaborative for card management, but individual comments represent a specific person's input and should be protected. Admin override can be added later if needed.

---

## Future Enhancements

Listed roughly in priority order:

1. ~~**Custom columns**~~ - DONE (A1). Add, rename, delete columns via context menu and add-column button.
2. **Dedicated full-screen route** - `/o/:orgaId/teams/:teamId/kanban` with maximized board view (D1)
3. ~~**Member view integration**~~ - DONE (D4). See Feature Catalogue below.
4. ~~**Card labels/tags**~~ - DONE (B1). Color-coded board-scoped labels; inline creation; filterable in search.
5. ~~**Column WIP limits**~~ - DONE (A2). Optional wipLimit field on columns; amber visual warning when exceeded.
6. ~~**Due date notifications**~~ - DONE (E1). Hourly cron checks cards; "approaching" (within 24h) and "overdue" notifications sent to role holder. Dedup via groupKey.
7. ~~**Card attachments**~~ - DONE (B3). File uploads via Convex storage with 10MB limit; delete cascades to storage.
8. **Decision trail integration** - Record card creation, moves, and edits as Decision entries
9. **Board analytics** - Cycle time, throughput, aging cards
10. ~~**Card templates**~~ - DONE (B5). Templates are regular cards with a "template" label; mark/unmark via toggle; "from template" copies fields into new cards.
11. ~~**Card checklists**~~ - DONE (B2). Inline sub-task checklist with progress bar.
12. ~~**Card priority levels**~~ - DONE (B6). Low/Medium/High/Critical with colored left border and dot indicator.
13. ~~**Threaded comments**~~ - DONE (B4). Author-stamped comments with timestamps; author-only edit/delete.

---

## Feature Catalogue

A comprehensive inventory of potential Kanban features, organized by category. Each feature includes a complexity rating (Low / Medium / High) and value assessment (Low / Medium / High). Status is tracked to show the current state of each feature.

### Category A: Core Board Enhancements

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| A1 | Custom Columns | Add, rename, reorder, and delete columns beyond the default four. Requires column management UI and schema support for user-defined names. | Medium | High | DONE |
| A2 | Column WIP Limits | Optional maximum card count per column. Visual warning (color change, icon) when the limit is reached or exceeded. Configurable per-column. | Low | Medium | DONE |
| A3 | Column Collapse/Expand | Allow users to collapse columns to save horizontal space, especially "Archived" which is rarely viewed. Persist collapsed state per user. | Low | Medium | DONE |
| A4 | Board-Level Settings | A settings panel for each board: WIP limits configuration per column. Accessible via gear icon in board header. | Medium | Low | DONE |
| A5 | Bulk Card Actions | Multi-select cards via checkboxes and perform bulk operations: move to column, delete. Selection mode toggle in board header. | Medium | Medium | DONE |
| A6 | Column Drag Reorder | Drag-and-drop columns to reorder them. Dedicated grip handle in expanded column headers; collapsed columns use full bar as handle. Persists via `reorderColumns` mutation. Disabled in selection mode. | Medium | Medium | DONE |

### Category B: Card Enhancements

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| B1 | Card Labels/Tags | Color-coded labels for categorization (e.g., "urgent", "blocked", "discussion"). Configurable per board. Filterable in search. | Medium | High | DONE |
| B2 | Card Checklists | Sub-task checklist within a card. Progress bar showing N/M items completed. Does not affect card position. | Medium | Medium | DONE |
| B3 | Card Attachments | File uploads (images, documents) using Convex storage. Preview thumbnails on cards. Max file size limit (10MB). | High | Medium | DONE |
| B4 | Card Comments (Threaded) | Upgrade from single string to threaded comments. Each comment has author, timestamp. Integrates with member identity. Author-only edit/delete. | High | Medium | DONE |
| B5 | Card Templates | Templates are regular cards with a "template" purple label. Users mark cards as templates via toggle; "from template" dropdown copies fields into new cards. No separate table needed. | Low | Low | DONE |
| B6 | Card Priority Levels | Explicit priority field (Low/Medium/High/Critical) with visual indicators (colored left border, dot). Filterable in search. | Low | Medium | DONE |

### Category C: Search, Filter, and Sort

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| C1 | Advanced Filters | Filter cards by multiple criteria simultaneously: role, due date range, column, label, overdue status. Persistent filter presets. | Medium | High | PROPOSED |
| C2 | Server-Side Search | Full-text search index on card titles and comments for boards with 100+ cards. Uses Convex search indexes. | Medium | Low | PROPOSED |
| C3 | Sort Within Column | Sort cards within a column by due date, creation date, title, or role -- in addition to manual drag ordering. | Low | Medium | PROPOSED |

### Category D: Cross-Entity Views

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| D1 | Dedicated Full-Screen Route | `/o/:orgaId/teams/:teamId/kanban` with maximized board view. Full-width layout without sidebar constraints. | Medium | High | PROPOSED |
| D2 | Role Kanban View | From a role's profile, see all Kanban cards assigned to that role across all boards. Uses existing `getCardsByRole` query. | Low | Medium | PROPOSED |
| D3 | Orga-Wide Dashboard | Aggregated view across all teams in an orga: total cards, overdue count, cards per team, bottleneck columns. Read-only summary. | High | Medium | PROPOSED |
| D4 | Member Kanban View | From a member's profile, see all Kanban cards owned by roles that the member holds, across all teams. Cards grouped by team, organized by column. | Medium | High | DONE |
| D5 | Cross-Team Card Timeline | Timeline view showing cards across all teams sorted by due date. Useful for members with roles in multiple teams. | High | Medium | PROPOSED |

### Category E: Notifications and Automation

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| E1 | Due Date Notifications | Notify card owner (role holder) when a card approaches its due date (e.g., 1 day before) or becomes overdue. Integrates with the existing notification system. | Medium | High | DONE |
| E2 | Card Activity Notifications | Notify relevant parties when a card is created, moved, reassigned, or commented on. Configurable per-user preferences. | Medium | Medium | PROPOSED |
| E3 | Auto-Archive | Automatically move cards from "Done" to "Archived" after a configurable period (e.g., 7 days). Runs via Convex cron. | Low | Medium | PROPOSED |
| E4 | Decision Trail Integration | Record card creation, column moves, role reassignment, and edits as Decision entries for governance traceability. | Medium | Low | PROPOSED |

### Category F: Analytics and Reporting

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| F1 | Board Analytics | Cycle time (how long cards take from "New Topics" to "Done"), throughput (cards completed per week), aging report (cards stale for >N days). | High | Medium | PROPOSED |
| F2 | Cumulative Flow Diagram | Stacked area chart showing card counts per column over time. Classic Kanban metric for identifying bottlenecks. | High | Low | PROPOSED |
| F3 | Overdue Report | Dedicated view listing all overdue cards across a team or orga, sorted by how far past due. Exportable. | Medium | Medium | PROPOSED |

### Category G: Collaboration and Integration

| ID | Feature | Description | Complexity | Value | Status |
|----|---------|-------------|------------|-------|--------|
| G1 | Chat-to-Card | Create a Kanban card directly from a chat message. Pre-fills card title from message text, links back to the message. | Medium | High | PROPOSED |
| G2 | Card-to-Chat | From a card detail modal, jump to the team channel. Optionally create a new message referencing the card. | Low | Medium | PROPOSED |
| G3 | Real-Time Presence | Show which team members are currently viewing the board. Display cursor/card highlighting for active drag operations by others. | High | Low | PROPOSED |
| G4 | Board Export | Export board data as CSV or JSON for external reporting or archival. | Low | Low | PROPOSED |

### Feature Catalogue Summary

| Category | Features | Avg Complexity | Avg Value |
|----------|----------|----------------|-----------|
| A: Core Board | 6 | Medium | Medium |
| B: Card Enhancements | 6 | Medium | Medium |
| C: Search/Filter/Sort | 3 | Medium | Medium |
| D: Cross-Entity Views | 5 | Medium | High |
| E: Notifications/Automation | 4 | Medium | Medium |
| F: Analytics/Reporting | 3 | High | Medium |
| G: Collaboration/Integration | 4 | Medium | Medium |
| **Total** | **31** | | |

---

## Collaboration Notes

### For Other Agents

- The Kanban feature touches `convex/teams/functions.ts` (createTeam, deleteTeam) -- coordinate if making changes to team lifecycle.
- The access control pattern reuses `memberHasTeamAccess` from `convex/chat/access.ts` -- do not duplicate this logic.
- The i18n namespace `kanban` will be added to `src/i18n/index.ts` -- coordinate if changing the i18n configuration.
- Modals must use `createPortal(modal, document.body)` to escape ancestor overflow constraints (established pattern from RoleVisualView).

### Data Migration

**Board backfill (original):** The `backfillBoards` internal mutation creates boards for existing teams that don't have one. This is unchanged.

**ownerId -> roleId migration:** When transitioning from member-based to role-based card ownership, existing cards need their `ownerId` field replaced with `roleId`. The migration strategy:

1. For each kanban card with `ownerId`:
   a. Look up the board to find the team (`board.teamId`)
   b. Query all roles in that team (`roles.by_team`)
   c. Find a role held by the card's `ownerId` member (`role.memberId === card.ownerId`)
   d. If exactly one match: set `card.roleId = role._id`, remove `ownerId`
   e. If multiple matches: pick the first non-special role (or log for manual review)
   f. If no match (member has no role in team): log the card for manual assignment

```typescript
// convex/kanban/functions.ts
export const migrateOwnerToRole = internalMutation({
  args: {},
  returns: v.object({ migrated: v.number(), flagged: v.number() }),
  handler: async (ctx) => {
    const cards = await ctx.db.query("kanbanCards").collect();
    let migrated = 0;
    let flagged = 0;

    for (const card of cards) {
      if ((card as any).roleId) continue; // Already migrated
      const ownerId = (card as any).ownerId;
      if (!ownerId) { flagged++; continue; }

      const board = await ctx.db.get(card.boardId);
      if (!board) { flagged++; continue; }

      const teamRoles = await ctx.db
        .query("roles")
        .withIndex("by_team", (q) => q.eq("teamId", board.teamId))
        .collect();

      const matchingRole = teamRoles.find((r) => r.memberId === ownerId);
      if (matchingRole) {
        await ctx.db.patch(card._id, { roleId: matchingRole._id } as any);
        migrated++;
      } else {
        flagged++;
      }
    }

    return { migrated, flagged };
  },
});
```

**Important:** After running the migration, a schema update removes the old `ownerId` field and `by_owner`/`by_board_and_owner` indexes, replacing them with `roleId` and `by_role`/`by_board_and_role`.
