# KANBAN.md - Swarmrise Team Kanban Board

This document defines the architecture, data model, and implementation plan for the Kanban board feature in Swarmrise. It is maintained by Kimiko, the Kanban system architect.

**Status:** Phases 1-4 done. Design evolution in progress: migrating from member-based to role-based card ownership (`ownerId` -> `roleId`). Cards will display role icon + member avatar.

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
| `kanban.getBoardWithData` | `{ teamId: Id<"teams"> }` | `{ board, columns, cards } \| null` | Get board with all columns and cards in one query (main board loader) |
| `kanban.getCardsByRole` | `{ roleId: Id<"roles"> }` | `KanbanCard[]` | Get all cards owned by a specific role |
| `kanban.getCardsByMember` | `{ memberId: Id<"members"> }` | `KanbanCard[]` | Get all cards where the owning role is held by a given member (for member profile view; queries roles by memberId, then cards by roleId) |

### Mutations

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `kanban.createCard` | `{ boardId, columnId, title, roleId, dueDate, comments?, position? }` | `Id<"kanbanCards">` | Create a new card in a column, assigned to a role |
| `kanban.updateCard` | `{ cardId, title?, roleId?, dueDate?, comments? }` | `Id<"kanbanCards">` | Update card details (change owning role, title, etc.) |
| `kanban.moveCard` | `{ cardId, targetColumnId, targetPosition }` | `null` | Move a card to a different column and/or position (drag and drop) |
| `kanban.deleteCard` | `{ cardId }` | `null` | Delete a card permanently |
| `kanban.reorderColumns` | `{ boardId, columnOrder: Id<"kanbanColumns">[] }` | `null` | Reorder columns on a board |

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
    index.tsx             - Main board container, fetches data, provides DnD context
  KanbanColumn/
    index.tsx             - Single column with header and card list
  KanbanCard/
    index.tsx             - Card component (draggable)
  KanbanCardModal/
    index.tsx             - Modal for creating/editing a card
  KanbanSearchBar/
    index.tsx             - Search bar to filter cards across columns
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

```
<DndContext>                           -- from @dnd-kit/core
  <SortableContext>                    -- one per column, from @dnd-kit/sortable
    <KanbanColumn>
      <SortableCard />                 -- useSortable() from @dnd-kit/sortable
      <SortableCard />
      ...
    </KanbanColumn>
  </SortableContext>
  <SortableContext>
    <KanbanColumn>
      ...
    </KanbanColumn>
  </SortableContext>
  <DragOverlay>                        -- ghost card during drag
    <KanbanCard />
  </DragOverlay>
</DndContext>
```

### DnD Event Handling

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const activeCardId = active.id as Id<"kanbanCards">;
  const overContainerId = over.id; // Could be a column or another card

  // Determine target column and position
  // Call kanban.moveCard mutation with optimistic update
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
| Schema: `ownerId` -> `roleId` in kanbanCards | Pending | Replace `ownerId: v.id("members")` with `roleId: v.id("roles")` |
| Schema: indexes `by_owner`/`by_board_and_owner` -> `by_role`/`by_board_and_role` | Pending | Update `convex/schema.ts` |
| Backend: update `kanban/index.ts` types | Pending | Change `kanbanCardType` field |
| Backend: update `kanban/functions.ts` | Pending | All queries/mutations that reference `ownerId` |
| Backend: add `migrateOwnerToRole` internal mutation | Pending | One-time migration for existing cards |
| Backend: update `getBoardWithData` to include roles | Pending | Query roles for the team alongside cards |
| Frontend: `KanbanCard` shows role icon + member avatar | Pending | Dual display: role SVG icon + member photo |
| Frontend: `KanbanCardModal` role picker (replaces member picker) | Pending | Dropdown showing team roles with icons |
| Frontend: `KanbanBoard` fetches roles for the team | Pending | Add `useQuery(listRolesInTeam)` |
| Frontend: `KanbanColumn` passes roleMap | Pending | Thread role data to card components |
| Frontend: update search to filter by role title + holder name | Pending | Extend client-side filter logic |
| i18n: update `owner` -> `role` keys in all 6 languages | Done | `card.owner` -> `card.role`, `card.ownerRequired` -> `card.roleRequired`; added `card.selectRole`, `card.column`, `card.genericError` |

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

### 4. Comments as a simple string (not threaded)

**Decision:** Card comments are a single text field, not a threaded discussion.

**Rationale:** The chat system already provides rich threaded discussions. Kanban comments are for brief context notes ("Waiting on design review", "Blocked by API change"). Detailed discussions should happen in the team channel, not on a card.

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

---

## Future Enhancements

Listed roughly in priority order:

1. **Custom columns** - Add, rename, reorder, delete columns (requires UI for column management and schema support for user-defined column names)
2. **Dedicated full-screen route** - `/o/:orgaId/teams/:teamId/kanban` with maximized board view
3. **Member view integration** - Show all cards owned by roles held by a member across all teams in `MemberManageView`/`MemberVisualView`
4. **Card labels/tags** - Color-coded labels for categorization
5. **Column WIP limits** - Optional maximum card count per column, visual warning when exceeded
6. **Due date notifications** - Notify card owner when a card approaches or passes its due date (integrates with existing notification system)
7. **Card attachments** - File uploads using Convex storage (`convex/storage.ts`)
8. **Decision trail integration** - Record card creation, moves, and edits as Decision entries
9. **Board analytics** - Cycle time, throughput, aging cards
10. **Card templates** - Pre-filled card templates for common action types

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
