import type { Priority } from "../../../convex/kanban";
import { Id } from "../../../convex/_generated/dataModel";

// --- Filter types ---

export type DueDateFilter = "all" | "overdue" | "today" | "thisWeek" | "later";

export type KanbanFilters = {
  roleId: Id<"roles"> | null;
  labelId: Id<"kanbanLabels"> | null;
  priority: Priority | "none" | null; // null = all, "none" = cards with no priority
  dueDate: DueDateFilter;
};

export const EMPTY_FILTERS: KanbanFilters = {
  roleId: null,
  labelId: null,
  priority: null,
  dueDate: "all",
};

/** Count how many filters are active (non-default) */
export function countActiveFilters(filters: KanbanFilters): number {
  let count = 0;
  if (filters.roleId !== null) count++;
  if (filters.labelId !== null) count++;
  if (filters.priority !== null) count++;
  if (filters.dueDate !== "all") count++;
  return count;
}

// --- Sort types ---

export type SortOption =
  | "manual"
  | "dueDate"
  | "creationDate"
  | "titleAZ"
  | "titleZA"
  | "priority"
  | "role";
