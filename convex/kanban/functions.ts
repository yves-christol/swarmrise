// Barrel file: re-exports all kanban functions from domain-specific files.
// This preserves all api.kanban.functions.* paths for frontend consumers.

export { checkTeamAccess, getBoard, getBoardWithData, ensureBoard, backfillBoards } from "./boardFunctions";
export {
  reorderColumns,
  addColumn,
  renameColumn,
  deleteColumn,
  setColumnWipLimit,
} from "./columnFunctions";
export {
  getCardsByRole,
  getCardsByMember,
  getCardsByMemberWithContext,
  createCard,
  updateCard,
  moveCard,
  deleteCard,
  bulkMoveCards,
  bulkDeleteCards,
  updateChecklist,
  toggleChecklistItem,
} from "./cardFunctions";
export {
  createLabel,
  updateLabel,
  deleteLabel,
  ensureTemplateLabel,
} from "./labelFunctions";
export {
  getAttachmentsForCard,
  getAttachmentsForCardWithUrls,
  addAttachment,
  deleteAttachment,
} from "./attachmentFunctions";
export {
  getCommentsForCard,
  addComment,
  updateComment,
  deleteComment,
} from "./commentFunctions";
export { migrateOwnerToRole } from "./migrationFunctions";
export { checkDueDateNotifications } from "./cronFunctions";
