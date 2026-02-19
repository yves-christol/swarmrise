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
  wipLimit: v.optional(v.number()),
});

export const kanbanColumnValidator = v.object({
  _id: v.id("kanbanColumns"),
  _creationTime: v.number(),
  ...kanbanColumnType.fields,
});

export type KanbanColumn = Infer<typeof kanbanColumnValidator>;

// --- B6: Priority Levels ---

export const priorityValues = ["low", "medium", "high", "critical"] as const;

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export type Priority = (typeof priorityValues)[number];

// --- B2: Checklist Item ---

export const checklistItemValidator = v.object({
  id: v.string(),
  text: v.string(),
  completed: v.boolean(),
});

export type ChecklistItem = Infer<typeof checklistItemValidator>;

// --- KanbanCard (updated with B1, B2, B6 fields) ---

export const kanbanCardType = v.object({
  columnId: v.id("kanbanColumns"),
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  roleId: v.id("roles"),
  title: v.string(),
  dueDate: v.number(),
  comments: v.string(),
  position: v.number(),
  // B1: Label IDs attached to this card
  labelIds: v.optional(v.array(v.id("kanbanLabels"))),
  // B2: Inline checklist items
  checklist: v.optional(v.array(checklistItemValidator)),
  // B6: Priority level
  priority: v.optional(priorityValidator),
});

export const kanbanCardValidator = v.object({
  _id: v.id("kanbanCards"),
  _creationTime: v.number(),
  ...kanbanCardType.fields,
});

export type KanbanCard = Infer<typeof kanbanCardValidator>;

// --- B1: Labels ---

export const kanbanLabelType = v.object({
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  name: v.string(),
  color: v.string(), // Tailwind color key e.g. "red", "blue", "green", "amber", "purple", "pink"
});

export const kanbanLabelValidator = v.object({
  _id: v.id("kanbanLabels"),
  _creationTime: v.number(),
  ...kanbanLabelType.fields,
});

export type KanbanLabel = Infer<typeof kanbanLabelValidator>;

// --- B3: Attachments ---

export const kanbanAttachmentType = v.object({
  cardId: v.id("kanbanCards"),
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileSize: v.number(), // bytes
  mimeType: v.string(),
  uploadedBy: v.id("members"),
});

export const kanbanAttachmentValidator = v.object({
  _id: v.id("kanbanAttachments"),
  _creationTime: v.number(),
  ...kanbanAttachmentType.fields,
});

export type KanbanAttachment = Infer<typeof kanbanAttachmentValidator>;

// --- B3: Attachment with resolved download URL ---

export const kanbanAttachmentWithUrlValidator = v.object({
  _id: v.id("kanbanAttachments"),
  _creationTime: v.number(),
  ...kanbanAttachmentType.fields,
  url: v.union(v.string(), v.null()),
});

export type KanbanAttachmentWithUrl = Infer<typeof kanbanAttachmentWithUrlValidator>;

// --- B4: Threaded Comments ---

export const kanbanCommentType = v.object({
  cardId: v.id("kanbanCards"),
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  authorId: v.id("members"),
  text: v.string(),
});

export const kanbanCommentValidator = v.object({
  _id: v.id("kanbanComments"),
  _creationTime: v.number(),
  ...kanbanCommentType.fields,
});

export type KanbanComment = Infer<typeof kanbanCommentValidator>;

// --- B5: Card Templates ---

export const kanbanTemplateType = v.object({
  boardId: v.id("kanbanBoards"),
  orgaId: v.id("orgas"),
  name: v.string(),
  title: v.string(), // Pre-filled card title
  defaultComments: v.optional(v.string()),
  defaultPriority: v.optional(priorityValidator),
  defaultLabelIds: v.optional(v.array(v.id("kanbanLabels"))),
  defaultChecklist: v.optional(v.array(checklistItemValidator)),
});

export const kanbanTemplateValidator = v.object({
  _id: v.id("kanbanTemplates"),
  _creationTime: v.number(),
  ...kanbanTemplateType.fields,
});

export type KanbanTemplate = Infer<typeof kanbanTemplateValidator>;

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
  // B1, B2, B6 fields
  labelIds: v.optional(v.array(v.id("kanbanLabels"))),
  checklist: v.optional(v.array(checklistItemValidator)),
  priority: v.optional(priorityValidator),
  // Enriched fields
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

// --- Label color definitions (used in frontend) ---

export const LABEL_COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
  "gray",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

// Max attachment file size: 10MB
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

// Default columns created with every new board
export const DEFAULT_COLUMNS = ["New Topics", "Actions", "Done", "Archived"];
