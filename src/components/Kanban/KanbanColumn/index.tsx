import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanColumn as KanbanColumnType } from "../../../../convex/kanban";
import type { KanbanCard as KanbanCardType } from "../../../../convex/kanban";
import type { KanbanLabel } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import type { Priority } from "../../../../convex/kanban";
import { Id } from "../../../../convex/_generated/dataModel";
import { KanbanCard } from "../KanbanCard";
import type { SortOption } from "../KanbanFilterPanel";

/** Prefix matching the one in KanbanBoard -- must stay in sync */
const COLUMN_SORTABLE_PREFIX = "sortable-col:";

type KanbanColumnProps = {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  roleMap: Map<Id<"roles">, Role>;
  memberMap: Map<Id<"members">, Member>;
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (columnId: Id<"kanbanColumns">) => void;
  onRenameColumn: (columnId: Id<"kanbanColumns">, name: string) => void;
  onDeleteColumn: (columnId: Id<"kanbanColumns">) => void;
  isCollapsed: boolean;
  onToggleCollapse: (columnId: Id<"kanbanColumns">) => void;
  // Bulk selection (A5)
  selectionMode: boolean;
  selectedCardIds: Set<string>;
  onToggleCardSelection: (cardId: Id<"kanbanCards">) => void;
  // Labels
  labelMap?: Map<Id<"kanbanLabels">, KanbanLabel>;
  // Column DnD
  isDimmed?: boolean;
  isDraggingColumn?: boolean;
  isOverlay?: boolean;
  // C3: Sort within column
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
};

function SortableCard({
  card,
  cardRole,
  roleMember,
  onCardClick,
  selectionMode,
  isSelected,
  onToggleSelection,
  labelMap,
  dragDisabled,
}: {
  card: KanbanCardType;
  cardRole: Role | undefined;
  roleMember: Member | undefined;
  onCardClick: (card: KanbanCardType) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  labelMap?: Map<Id<"kanbanLabels">, KanbanLabel>;
  dragDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id, disabled: selectionMode || !!dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <KanbanCard
      ref={setNodeRef}
      card={card}
      cardRole={cardRole}
      roleMember={roleMember}
      onClick={selectionMode ? onToggleSelection : () => onCardClick(card)}
      style={style}
      selectionMode={selectionMode}
      isSelected={isSelected}
      labelMap={labelMap}
      {...(selectionMode ? {} : { ...attributes, ...listeners })}
    />
  );
}

export function KanbanColumn({
  column,
  cards,
  roleMap,
  memberMap,
  onCardClick,
  onAddCard,
  onRenameColumn,
  onDeleteColumn,
  isCollapsed,
  onToggleCollapse,
  selectionMode,
  selectedCardIds,
  onToggleCardSelection,
  labelMap,
  isDimmed = false,
  isDraggingColumn = false,
  isOverlay = false,
  sortOption,
  onSortChange,
}: KanbanColumnProps) {
  const { t } = useTranslation("kanban");

  // Column-level sortable (for reordering columns by drag)
  const columnSortableId = `${COLUMN_SORTABLE_PREFIX}${column._id}`;
  const {
    attributes: colAttributes,
    listeners: colListeners,
    setNodeRef: setColumnNodeRef,
    transform: colTransform,
    transition: colTransition,
  } = useSortable({
    id: columnSortableId,
    disabled: selectionMode || isOverlay,
  });

  const columnStyle: React.CSSProperties = isOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(colTransform),
        transition: colTransition,
        opacity: isDraggingColumn ? 0.3 : isDimmed ? 0.4 : undefined,
      };

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // C3: Priority ordering for sort (higher priority = lower number = sorted first)
  const PRIORITY_ORDER: Record<Priority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  // C3: Sort cards based on selected sort option
  const sortedCards = useMemo(() => {
    const sorted = [...cards];

    switch (sortOption) {
      case "dueDate":
        sorted.sort((a, b) => a.dueDate - b.dueDate);
        break;
      case "creationDate":
        sorted.sort((a, b) => b._creationTime - a._creationTime);
        break;
      case "titleAZ":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "titleZA":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "priority":
        sorted.sort((a, b) => {
          const aPriority = a.priority ? PRIORITY_ORDER[a.priority] : 4;
          const bPriority = b.priority ? PRIORITY_ORDER[b.priority] : 4;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.position - b.position;
        });
        break;
      case "role":
        sorted.sort((a, b) => {
          const aRole = roleMap.get(a.roleId);
          const bRole = roleMap.get(b.roleId);
          const aTitle = aRole?.title ?? "";
          const bTitle = bRole?.title ?? "";
          if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
          return a.position - b.position;
        });
        break;
      case "manual":
      default:
        sorted.sort((a, b) => a.position - b.position);
        break;
    }

    return sorted;
  }, [cards, sortOption, roleMap]);

  // C3: Whether a non-manual sort is active (disables DnD for cards in this column)
  const isSorted = sortOption !== "manual";

  // C3: Sort dropdown state
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSortMenu]);

  const cardIds = useMemo(() => sortedCards.map((c) => c._id), [sortedCards]);

  // Make the column itself a droppable target (for dropping into empty columns)
  const { setNodeRef: setDroppableRef } = useDroppable({ id: `column:${column._id}` });

  // WIP limit check
  const wipLimit = column.wipLimit;
  const isOverWip = wipLimit !== undefined && cards.length > wipLimit;
  const isAtWip = wipLimit !== undefined && cards.length === wipLimit;

  // Focus rename input when it appears
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== column.name) {
      onRenameColumn(column._id, trimmed);
    } else {
      setRenameValue(column.name);
    }
    setIsRenaming(false);
  }, [renameValue, column.name, column._id, onRenameColumn]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRenameSubmit();
      } else if (e.key === "Escape") {
        setRenameValue(column.name);
        setIsRenaming(false);
      }
    },
    [handleRenameSubmit, column.name],
  );

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        ref={setColumnNodeRef}
        style={columnStyle}
        className={`
          flex flex-col items-center
          w-10 flex-shrink-0
          bg-surface-secondary/50
          border border-border-default
          rounded-xl
          hover:bg-surface-hover
          transition-colors duration-75
          py-3 gap-2
          snap-start
        `}
      >
        {/* Drag handle for collapsed column -- the entire collapsed bar is the handle */}
        <div
          className="cursor-grab active:cursor-grabbing w-full flex flex-col items-center gap-2"
          {...(selectionMode ? {} : { ...colAttributes, ...colListeners })}
          onClick={(e) => {
            // Only toggle collapse on click, not on drag
            e.stopPropagation();
            onToggleCollapse(column._id);
          }}
          title={`${column.name} (${cards.length})`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleCollapse(column._id);
            }
          }}
        >
          {/* Rotated column name */}
          <span
            className="text-xs font-semibold text-dark dark:text-light whitespace-nowrap"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {column.name}
          </span>
          <span className="text-[10px] text-text-tertiary tabular-nums">
            {cards.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setColumnNodeRef}
      style={columnStyle}
      className={`
        flex flex-col
        w-72 flex-shrink-0
        border
        ${isOverWip ? "border-amber-400 dark:border-amber-600" : "border-border-default"}
        rounded-xl
        max-h-full
        snap-start
        transition-opacity duration-150
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-default gap-1 bg-surface-secondary/50 rounded-t-xl">
        {/* Left: drag handle + collapse toggle + name */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Column drag handle */}
          {!selectionMode && (
            <div
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
              title={t("columnActions.dragToReorder")}
              aria-label={t("columnActions.dragToReorder")}
              {...colAttributes}
              {...colListeners}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="2.5" r="1" />
                <circle cx="8" cy="2.5" r="1" />
                <circle cx="4" cy="6" r="1" />
                <circle cx="8" cy="6" r="1" />
                <circle cx="4" cy="9.5" r="1" />
                <circle cx="8" cy="9.5" r="1" />
              </svg>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => onToggleCollapse(column._id)}
            className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
            title={t("columnActions.collapse")}
            aria-label={t("columnActions.collapse")}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="text-sm font-semibold text-dark dark:text-light bg-transparent border-b border-highlight outline-none min-w-0 flex-1"
            />
          ) : (
            <h3 className="text-sm font-semibold text-dark dark:text-light truncate">
              {column.name}
            </h3>
          )}
        </div>

        {/* Right: card count + WIP + menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Card count with WIP indicator */}
          <span
            className={`text-xs tabular-nums ${
              isOverWip
                ? "text-amber-600 dark:text-amber-400 font-bold"
                : isAtWip
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-text-tertiary"
            }`}
            title={
              wipLimit !== undefined
                ? t("columnActions.wipStatus", { count: cards.length, limit: wipLimit })
                : undefined
            }
          >
            {cards.length}
            {wipLimit !== undefined && (
              <span className="text-text-tertiary">/{wipLimit}</span>
            )}
          </span>

          {/* WIP exceeded warning icon */}
          {isOverWip && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="text-amber-500 flex-shrink-0"
              aria-label={t("columnActions.wipExceeded")}
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          )}

          {/* C3: Sort button */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`p-0.5 transition-colors ${
                isSorted
                  ? "text-highlight"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title={t("sort.title")}
              aria-label={t("sort.title")}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 7.5a.75.75 0 01.75-.75h7.508a.75.75 0 010 1.5H2.75A.75.75 0 012 7.5zM14 7a.75.75 0 01.75.75v6.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 111.1-1.02l1.95 2.1V7.75A.75.75 0 0114 7zM2 11.25a.75.75 0 01.75-.75h4.562a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-surface-primary border border-border-strong rounded-lg shadow-lg z-20 py-1">
                {(["manual", "dueDate", "creationDate", "titleAZ", "titleZA", "priority", "role"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onSortChange(option);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      sortOption === option
                        ? "text-highlight font-medium bg-highlight/10"
                        : "text-dark dark:text-light hover:bg-surface-hover"
                    }`}
                  >
                    {t(`sort.${option}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column menu button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              title={t("columnActions.menu")}
              aria-label={t("columnActions.menu")}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-surface-primary border border-border-strong rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setRenameValue(column.name);
                    setIsRenaming(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-dark dark:text-light hover:bg-surface-hover transition-colors"
                >
                  {t("columnActions.rename")}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-surface-hover transition-colors"
                >
                  {t("columnActions.delete")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 mb-2">
            {t("columnActions.deleteConfirm", { count: cards.length })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDeleteColumn(column._id);
                setShowDeleteConfirm(false);
              }}
              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              {t("columnActions.confirmDelete")}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary"
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Card list - sortable context */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[4rem]"
        >
          {sortedCards.map((card) => {
            const cardRole = roleMap.get(card.roleId);
            const roleMember = cardRole ? memberMap.get(cardRole.memberId) : undefined;
            return (
              <SortableCard
                key={card._id}
                card={card}
                cardRole={cardRole}
                roleMember={roleMember}
                onCardClick={onCardClick}
                selectionMode={selectionMode}
                isSelected={selectedCardIds.has(card._id)}
                onToggleSelection={() => onToggleCardSelection(card._id)}
                labelMap={labelMap}
                dragDisabled={isSorted}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Add card button */}
      {!selectionMode && (
        <div className="p-2 border-t border-border-default bg-surface-secondary/50 rounded-b-xl">
          <button
            onClick={() => onAddCard(column._id)}
            className="
              w-full flex items-center justify-center gap-1.5
              px-3 py-1.5 text-sm
              text-text-secondary
              hover:text-dark dark:hover:text-light
              hover:bg-surface-hover
              rounded-lg
              transition-colors duration-75
            "
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M7 1v12M1 7h12" />
            </svg>
            {t("board.addCard")}
          </button>
        </div>
      )}
    </div>
  );
}
