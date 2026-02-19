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
  roleId: v.id("roles"),
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

// --- MemberKanbanView enriched return type ---

/**
 * A card with its column name and role title attached,
 * used for the Member Kanban View where we display cards
 * across multiple teams without access to the full board context.
 */
export const memberKanbanCardValidator = v.object({
  _id: v.id("kanbanCards"),
  _creationTime: v.number(),
  columnId: v.id("kanbanColumns"),
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  roleId: v.id("roles"),
  title: v.string(),
  dueDate: v.number(),
  comments: v.string(),
  position: v.number(),
  columnName: v.string(),
  roleTitle: v.string(),
  roleIconKey: v.optional(v.string()),
  roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
});

export type MemberKanbanCard = Infer<typeof memberKanbanCardValidator>;

/**
 * Cards grouped by team for the Member Kanban View.
 */
export const memberKanbanTeamGroupValidator = v.object({
  teamId: v.id("teams"),
  teamName: v.string(),
  teamColor: v.optional(v.string()),
  cards: v.array(memberKanbanCardValidator),
});

export type MemberKanbanTeamGroup = Infer<typeof memberKanbanTeamGroupValidator>;

// Default columns created with every new board
export const DEFAULT_COLUMNS = ["New Topics", "Actions", "Done", "Archived"];
