import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { KanbanLabel, Priority } from "../../../../convex/kanban";
import type { Role } from "../../../../convex/roles";
import { Id } from "../../../../convex/_generated/dataModel";

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

// --- Component ---

type KanbanFilterPanelProps = {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  roles: Role[];
  labels: KanbanLabel[];
};

export function KanbanFilterPanel({
  filters,
  onFiltersChange,
  roles,
  labels,
}: KanbanFilterPanelProps) {
  const { t } = useTranslation("kanban");
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = countActiveFilters(filters);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleClear = useCallback(() => {
    onFiltersChange(EMPTY_FILTERS);
  }, [onFiltersChange]);

  // Sort roles alphabetically for the dropdown
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.title.localeCompare(b.title)),
    [roles],
  );

  // Sort labels alphabetically for the dropdown
  const sortedLabels = useMemo(
    () => [...labels].sort((a, b) => a.name.localeCompare(b.name)),
    [labels],
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* Filter toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5
          px-3 py-1.5 text-xs font-medium rounded-md transition-colors
          ${activeCount > 0
            ? "bg-highlight/20 text-highlight-dark dark:text-highlight border border-highlight/40"
            : "text-text-secondary hover:text-dark dark:hover:text-light hover:bg-surface-hover border border-border-default"
          }
        `}
        title={t("filters.title")}
      >
        {/* Filter icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22a2.25 2.25 0 01-.659-1.59V2.341a.75.75 0 01.628-.74z"
            clipRule="evenodd"
          />
        </svg>
        {t("filters.title")}
        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-highlight text-dark rounded-full leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Filter dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-surface-primary border border-border-strong rounded-lg shadow-lg z-30 p-3 space-y-3">
          {/* Role filter */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1 block">
              {t("filters.role")}
            </label>
            <select
              value={filters.roleId ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  roleId: e.target.value ? (e.target.value as Id<"roles">) : null,
                })
              }
              className="w-full px-2 py-1.5 text-xs rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="">{t("filters.allRoles")}</option>
              {sortedRoles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.title}
                </option>
              ))}
            </select>
          </div>

          {/* Label filter */}
          {labels.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1 block">
                {t("filters.label")}
              </label>
              <select
                value={filters.labelId ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    labelId: e.target.value ? (e.target.value as Id<"kanbanLabels">) : null,
                  })
                }
                className="w-full px-2 py-1.5 text-xs rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
              >
                <option value="">{t("filters.allLabels")}</option>
                {sortedLabels.map((label) => (
                  <option key={label._id} value={label._id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority filter */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1 block">
              {t("filters.priority")}
            </label>
            <select
              value={filters.priority ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priority: e.target.value ? (e.target.value as Priority | "none") : null,
                })
              }
              className="w-full px-2 py-1.5 text-xs rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="">{t("filters.allPriorities")}</option>
              <option value="critical">{t("priority.critical")}</option>
              <option value="high">{t("priority.high")}</option>
              <option value="medium">{t("priority.medium")}</option>
              <option value="low">{t("priority.low")}</option>
              <option value="none">{t("priority.none")}</option>
            </select>
          </div>

          {/* Due date filter */}
          <div>
            <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1 block">
              {t("filters.dueDate")}
            </label>
            <select
              value={filters.dueDate}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dueDate: e.target.value as DueDateFilter,
                })
              }
              className="w-full px-2 py-1.5 text-xs rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="all">{t("filters.allDueDates")}</option>
              <option value="overdue">{t("filters.overdue")}</option>
              <option value="today">{t("filters.dueToday")}</option>
              <option value="thisWeek">{t("filters.dueThisWeek")}</option>
              <option value="later">{t("filters.dueLater")}</option>
            </select>
          </div>

          {/* Clear filters button */}
          {activeCount > 0 && (
            <button
              onClick={handleClear}
              className="w-full px-2 py-1.5 text-xs text-text-secondary hover:text-dark dark:hover:text-light hover:bg-surface-hover rounded-md transition-colors text-center"
            >
              {t("filters.clear")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
