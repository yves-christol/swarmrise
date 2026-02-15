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
  ownerId: v.id("members"),
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

// Default columns created with every new board
export const DEFAULT_COLUMNS = ["New Topics", "Actions", "Done", "Archived"];
