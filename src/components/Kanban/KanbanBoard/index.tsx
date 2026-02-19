import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { KanbanCard as KanbanCardType } from "../../../../convex/kanban";
import type { KanbanColumn as KanbanColumnType } from "../../../../convex/kanban";
import type { KanbanLabel } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { KanbanColumn } from "../KanbanColumn";
import { KanbanEmptyState } from "../KanbanEmptyState";
import { KanbanCardModal } from "../KanbanCardModal";
import { KanbanCard } from "../KanbanCard";
import { KanbanBoardSettings } from "../KanbanBoardSettings";

/** Prefix to distinguish column sortable IDs from card IDs */
const COLUMN_SORTABLE_PREFIX = "sortable-col:";

/** Convert a column ID to a sortable ID used by @dnd-kit */
function toColumnSortableId(columnId: Id<"kanbanColumns">): string {
  return `${COLUMN_SORTABLE_PREFIX}${columnId}`;
}

/** Check if a sortable ID represents a column (not a card) */
function isColumnSortableId(id: string): boolean {
  return id.startsWith(COLUMN_SORTABLE_PREFIX);
}

/** Extract the raw column ID from a column sortable ID */
function fromColumnSortableId(sortableId: string): Id<"kanbanColumns"> {
  return sortableId.slice(COLUMN_SORTABLE_PREFIX.length) as Id<"kanbanColumns">;
}

type KanbanBoardProps = {
  teamId: Id<"teams">;
  orgaId: Id<"orgas">;
};

/** Position gap between cards. When rebalancing, cards get multiples of this. */
const POSITION_GAP = 1024;

/** localStorage key for collapsed columns per board */
function collapseStorageKey(boardId: string): string {
  return `kanban-collapsed:${boardId}`;
}

export function KanbanBoard({ teamId, orgaId }: KanbanBoardProps) {
  const { t } = useTranslation("kanban");
  const { t: tCommon } = useTranslation("common");

  // Check team access first -- skip all other queries if the user is not a member
  const hasAccess = useQuery(api.kanban.functions.checkTeamAccess, { teamId });

  const boardData = useQuery(
    api.kanban.functions.getBoardWithData,
    hasAccess ? { teamId } : "skip",
  );
  const members = useQuery(
    api.members.functions.listMembers,
    hasAccess ? { orgaId } : "skip",
  );
  const roles = useQuery(
    api.roles.functions.listRolesInTeam,
    hasAccess ? { teamId } : "skip",
  );
  const moveCard = useMutation(api.kanban.functions.moveCard);
  const reorderColumnsMut = useMutation(api.kanban.functions.reorderColumns);
  const ensureBoard = useMutation(api.kanban.functions.ensureBoard);
  const addColumnMut = useMutation(api.kanban.functions.addColumn);
  const renameColumnMut = useMutation(api.kanban.functions.renameColumn);
  const deleteColumnMut = useMutation(api.kanban.functions.deleteColumn);
  const bulkMoveCardsMut = useMutation(api.kanban.functions.bulkMoveCards);
  const bulkDeleteCardsMut = useMutation(api.kanban.functions.bulkDeleteCards);

  // Auto-create board for teams that don't have one yet (only when we have access)
  const ensureBoardCalledRef = useRef(false);
  useEffect(() => {
    if (hasAccess && boardData === null && !ensureBoardCalledRef.current) {
      ensureBoardCalledRef.current = true;
      void ensureBoard({ teamId });
    }
    if (boardData !== null) {
      ensureBoardCalledRef.current = false;
    }
  }, [boardData, teamId, ensureBoard, hasAccess]);

  // Reset when switching teams
  useEffect(() => {
    ensureBoardCalledRef.current = false;
  }, [teamId]);

  // DnD sensors: require 5px movement before drag activates so clicks pass through to onClick.
  // Touch: 250ms delay so taps open the edit modal; long-press initiates drag.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCardType | undefined>();
  const [createColumnId, setCreateColumnId] = useState<Id<"kanbanColumns"> | undefined>();

  // Settings modal state (A4)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // DnD state
  const [activeCardId, setActiveCardId] = useState<Id<"kanbanCards"> | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<Id<"kanbanColumns"> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Collapsed columns state (A3) -- persisted in localStorage
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Load collapsed state from localStorage when board changes
  useEffect(() => {
    if (!boardData?.board._id) return;
    try {
      const stored = localStorage.getItem(collapseStorageKey(boardData.board._id));
      if (stored) {
        setCollapsedColumns(new Set(JSON.parse(stored) as string[]));
      } else {
        setCollapsedColumns(new Set());
      }
    } catch {
      setCollapsedColumns(new Set());
    }
  }, [boardData?.board._id]);

  const toggleColumnCollapse = useCallback(
    (columnId: Id<"kanbanColumns">) => {
      setCollapsedColumns((prev) => {
        const next = new Set(prev);
        if (next.has(columnId)) {
          next.delete(columnId);
        } else {
          next.add(columnId);
        }
        // Persist to localStorage
        if (boardData?.board._id) {
          try {
            localStorage.setItem(
              collapseStorageKey(boardData.board._id),
              JSON.stringify([...next]),
            );
          } catch {
            // Ignore storage errors
          }
        }
        return next;
      });
    },
    [boardData?.board._id],
  );

  // Bulk selection state (A5)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const toggleCardSelection = useCallback((cardId: Id<"kanbanCards">) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedCardIds(new Set());
  }, []);

  const handleBulkMove = useCallback(
    async (targetColumnId: Id<"kanbanColumns">) => {
      if (selectedCardIds.size === 0) return;
      try {
        await bulkMoveCardsMut({
          cardIds: [...selectedCardIds] as Id<"kanbanCards">[],
          targetColumnId,
        });
      } finally {
        exitSelectionMode();
      }
    },
    [selectedCardIds, bulkMoveCardsMut, exitSelectionMode],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedCardIds.size === 0) return;
    try {
      await bulkDeleteCardsMut({
        cardIds: [...selectedCardIds] as Id<"kanbanCards">[],
      });
    } finally {
      exitSelectionMode();
    }
  }, [selectedCardIds, bulkDeleteCardsMut, exitSelectionMode]);

  // Add column state (A1)
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const newColumnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingColumn) {
      newColumnInputRef.current?.focus();
    }
  }, [isAddingColumn]);

  const handleAddColumn = useCallback(async () => {
    const name = newColumnName.trim();
    if (!name || !boardData?.board._id) return;
    try {
      await addColumnMut({ boardId: boardData.board._id, name });
      setNewColumnName("");
      setIsAddingColumn(false);
    } catch {
      // Error handled by Convex
    }
  }, [newColumnName, boardData?.board._id, addColumnMut]);

  const handleRenameColumn = useCallback(
    (columnId: Id<"kanbanColumns">, name: string) => {
      void renameColumnMut({ columnId, name });
    },
    [renameColumnMut],
  );

  const handleDeleteColumn = useCallback(
    (columnId: Id<"kanbanColumns">) => {
      void deleteColumnMut({ columnId });
    },
    [deleteColumnMut],
  );

  // Build member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<Id<"members">, Member>();
    members?.forEach((m) => map.set(m._id, m as Member));
    return map;
  }, [members]);

  // Build role lookup map
  const roleMap = useMemo(() => {
    const map = new Map<Id<"roles">, Role>();
    roles?.forEach((r) => map.set(r._id, r as Role));
    return map;
  }, [roles]);

  // Roles as array for modal
  const roleList = useMemo(() => {
    return Array.from(roleMap.values());
  }, [roleMap]);

  // Build label lookup map (B1)
  const labelMap = useMemo(() => {
    const map = new Map<Id<"kanbanLabels">, KanbanLabel>();
    if (boardData?.labels) {
      for (const label of boardData.labels) {
        map.set(label._id, label);
      }
    }
    return map;
  }, [boardData?.labels]);

  // Group cards by column (sorted by position)
  const cardsByColumn = useMemo(() => {
    const map = new Map<Id<"kanbanColumns">, KanbanCardType[]>();
    if (!boardData) return map;

    for (const column of boardData.columns) {
      map.set(column._id, []);
    }
    for (const card of boardData.cards) {
      const list = map.get(card.columnId);
      if (list) {
        list.push(card);
      }
    }
    // Sort each column's cards by position
    for (const [, cards] of map) {
      cards.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [boardData]);

  // Filter cards by search query (matches card title, role title, member name, labels, priority)
  const filteredCardsByColumn = useMemo(() => {
    if (!searchQuery.trim()) return cardsByColumn;

    const query = searchQuery.toLowerCase();
    const filtered = new Map<Id<"kanbanColumns">, KanbanCardType[]>();

    for (const [columnId, cards] of cardsByColumn) {
      filtered.set(
        columnId,
        cards.filter((card) => {
          if (card.title.toLowerCase().includes(query)) return true;
          const role = roleMap.get(card.roleId);
          if (role) {
            if (role.title.toLowerCase().includes(query)) return true;
            const member = memberMap.get(role.memberId);
            if (member) {
              const fullName = `${member.firstname} ${member.surname}`.toLowerCase();
              if (fullName.includes(query)) return true;
            }
          }
          // B1: Search by label name
          if (card.labelIds) {
            for (const labelId of card.labelIds) {
              const label = labelMap.get(labelId);
              if (label && label.name.toLowerCase().includes(query)) return true;
            }
          }
          // B6: Search by priority
          if (card.priority && card.priority.toLowerCase().includes(query)) return true;
          return false;
        }),
      );
    }
    return filtered;
  }, [cardsByColumn, searchQuery, roleMap, memberMap, labelMap]);

  // Card lookup by id
  const cardById = useMemo(() => {
    const map = new Map<Id<"kanbanCards">, KanbanCardType>();
    if (!boardData) return map;
    for (const card of boardData.cards) {
      map.set(card._id, card);
    }
    return map;
  }, [boardData]);

  // Total card count to decide empty state
  const totalCards = boardData?.cards.length ?? 0;
  const isSearching = searchQuery.trim().length > 0;

  // Find which column a card or column-droppable belongs to
  const findColumnId = useCallback((id: UniqueIdentifier): Id<"kanbanColumns"> | null => {
    const idStr = String(id);
    if (idStr.startsWith("column:")) {
      return idStr.slice(7) as Id<"kanbanColumns">;
    }
    const card = cardById.get(idStr as Id<"kanbanCards">);
    return card?.columnId ?? null;
  }, [cardById]);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (isColumnSortableId(activeId)) {
      setActiveColumnId(fromColumnSortableId(activeId));
      setActiveCardId(null);
    } else {
      setActiveCardId(activeId as Id<"kanbanCards">);
      setActiveColumnId(null);
    }
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by SortableContext
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    setActiveColumnId(null);

    if (!over || !boardData) return;

    const activeIdStr = String(active.id);

    // ---- Column reordering ----
    if (isColumnSortableId(activeIdStr)) {
      const overIdStr = String(over.id);
      if (!isColumnSortableId(overIdStr)) return;
      if (activeIdStr === overIdStr) return;

      const draggedColId = fromColumnSortableId(activeIdStr);
      const overColId = fromColumnSortableId(overIdStr);

      const currentOrder = boardData.columns.map((c) => c._id);
      const oldIndex = currentOrder.indexOf(draggedColId);
      const newIndex = currentOrder.indexOf(overColId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      // Reorder: remove from old position, insert at new
      const newOrder = [...currentOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, draggedColId);

      void reorderColumnsMut({
        boardId: boardData.board._id,
        columnOrder: newOrder,
      });
      return;
    }

    // ---- Card movement (existing logic) ----
    const activeId = active.id as Id<"kanbanCards">;
    const overId = over.id;

    const targetColumnId = findColumnId(overId);
    if (!targetColumnId) return;

    const activeCardData = cardById.get(activeId);
    if (!activeCardData) return;

    const targetCards = (cardsByColumn.get(targetColumnId) ?? [])
      .filter((c) => c._id !== activeId);

    let newPosition: number;

    const overIdStr = String(overId);
    if (overIdStr.startsWith("column:")) {
      newPosition = targetCards.length > 0
        ? targetCards[targetCards.length - 1].position + POSITION_GAP
        : POSITION_GAP;
    } else {
      const overCard = cardById.get(overIdStr as Id<"kanbanCards">);
      if (!overCard) return;

      const overIndex = targetCards.findIndex((c) => c._id === overCard._id);
      if (overIndex === -1) {
        newPosition = activeCardData.position;
      } else {
        const sameColumn = activeCardData.columnId === targetColumnId;
        const activeIndex = sameColumn
          ? (cardsByColumn.get(targetColumnId) ?? []).findIndex((c) => c._id === activeId)
          : -1;
        const insertAfter = sameColumn && activeIndex < overIndex;

        if (insertAfter) {
          const below = targetCards[overIndex + 1];
          newPosition = below
            ? (overCard.position + below.position) / 2
            : overCard.position + POSITION_GAP;
        } else {
          const above = overIndex > 0 ? targetCards[overIndex - 1] : null;
          newPosition = above
            ? (above.position + overCard.position) / 2
            : overCard.position / 2;
        }
      }
    }

    if (activeCardData.columnId === targetColumnId && activeCardData.position === newPosition) {
      return;
    }

    void moveCard({
      cardId: activeId,
      targetColumnId,
      targetPosition: newPosition,
    });
  }, [boardData, cardById, cardsByColumn, findColumnId, moveCard, reorderColumnsMut]);

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null);
    setActiveColumnId(null);
  }, []);

  const collisionDetection = useCallback(
    (...args: Parameters<typeof pointerWithin>) => {
      const pointerCollisions = pointerWithin(...args);
      if (pointerCollisions.length > 0) return pointerCollisions;
      return closestCorners(...args);
    },
    [],
  );

  // Column sortable IDs for horizontal SortableContext
  const columnSortableIds = useMemo(
    () => boardData?.columns.map((c) => toColumnSortableId(c._id)) ?? [],
    [boardData?.columns],
  );

  // Active card for drag overlay
  const activeCard = activeCardId ? cardById.get(activeCardId) : null;
  const activeRole = activeCard ? roleMap.get(activeCard.roleId) : undefined;
  const activeRoleMember = activeRole ? memberMap.get(activeRole.memberId) : undefined;

  // Active column for drag overlay
  const activeColumn: KanbanColumnType | null = useMemo(() => {
    if (!activeColumnId || !boardData) return null;
    return boardData.columns.find((c) => c._id === activeColumnId) ?? null;
  }, [activeColumnId, boardData]);

  // Loading (access check still pending)
  if (hasAccess === undefined) {
    return (
      <div className="py-8 text-center text-text-secondary">
        {tCommon("loading")}
      </div>
    );
  }

  // User is not a member of this team -- show nothing (the Kanban view is inaccessible)
  if (!hasAccess) {
    return (
      <div className="py-8 text-center text-text-secondary">
        {t("board.noAccess")}
      </div>
    );
  }

  // Board data still loading
  if (boardData === undefined) {
    return (
      <div className="py-8 text-center text-text-secondary">
        {tCommon("loading")}
      </div>
    );
  }

  // No board yet (ensureBoard is creating it)
  if (boardData === null) {
    return (
      <div className="py-8 text-center text-text-secondary">
        {tCommon("loading")}
      </div>
    );
  }

  const handleCardClick = (card: KanbanCardType) => {
    if (activeCardId) return;
    setEditingCard(card);
    setCreateColumnId(undefined);
    setIsModalOpen(true);
  };

  const handleAddCard = (columnId: Id<"kanbanColumns">) => {
    setEditingCard(undefined);
    setCreateColumnId(columnId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCard(undefined);
    setCreateColumnId(undefined);
  };

  return (
    <div>
      {/* Board header + search + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-dark dark:text-light">
            {t("board.title")}
          </h2>

          {/* Settings button (A4) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors rounded-md hover:bg-surface-hover"
            title={t("settings.title")}
            aria-label={t("settings.title")}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk selection toggle (A5) */}
          {totalCards > 0 && (
            <button
              onClick={selectionMode ? exitSelectionMode : () => setSelectionMode(true)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${selectionMode
                  ? "bg-highlight text-dark"
                  : "text-text-secondary hover:text-dark dark:hover:text-light hover:bg-surface-hover border border-border-default"
                }
              `}
              title={selectionMode ? t("bulk.exit") : t("bulk.select")}
            >
              {selectionMode ? t("bulk.exit") : t("bulk.select")}
            </button>
          )}

          {/* Search bar */}
          {totalCards > 0 && !selectionMode && (
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("board.search")}
                className="
                  pl-8 pr-8 py-1.5 text-sm
                  w-full sm:w-56
                  rounded-lg border border-border-strong
                  bg-surface-primary
                  text-dark dark:text-light
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-highlight
                  transition-colors
                "
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t("actions.close")}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action toolbar (A5) */}
      {selectionMode && selectedCardIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2.5 bg-surface-secondary/80 border border-border-default rounded-lg">
          <span className="text-sm text-dark dark:text-light font-medium">
            {t("bulk.selected", { count: selectedCardIds.size })}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Move to column dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  void handleBulkMove(e.target.value as Id<"kanbanColumns">);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="px-2.5 py-1 text-xs rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="" disabled>
                {t("bulk.moveTo")}
              </option>
              {boardData.columns.map((col) => (
                <option key={col._id} value={col._id}>
                  {col.name}
                </option>
              ))}
            </select>

            {/* Delete selected */}
            <button
              onClick={() => void handleBulkDelete()}
              className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              {t("bulk.delete")}
            </button>
          </div>
        </div>
      )}

      {totalCards === 0 && !isSearching ? (
        <KanbanEmptyState />
      ) : null}

      {/* Columns with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={columnSortableIds}
          strategy={horizontalListSortingStrategy}
          disabled={selectionMode}
        >
          <div
            className="flex gap-3 sm:gap-4 pb-4"
            style={{ minHeight: totalCards > 0 ? "20rem" : undefined }}
          >
            {boardData.columns.map((column) => {
              const columnCards = filteredCardsByColumn.get(column._id) ?? [];
              // During search, dim empty columns but keep them visible
              const isEmpty = isSearching && columnCards.length === 0;

              return (
                <KanbanColumn
                  key={column._id}
                  column={column}
                  cards={columnCards}
                  roleMap={roleMap}
                  memberMap={memberMap}
                  onCardClick={handleCardClick}
                  onAddCard={handleAddCard}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  isCollapsed={collapsedColumns.has(column._id)}
                  onToggleCollapse={toggleColumnCollapse}
                  selectionMode={selectionMode}
                  selectedCardIds={selectedCardIds}
                  onToggleCardSelection={toggleCardSelection}
                  labelMap={labelMap}
                  isDimmed={isEmpty}
                  isDraggingColumn={activeColumnId === column._id}
                />
              );
            })}

            {/* Add column button (A1) */}
            {!selectionMode && (
              <div className="flex-shrink-0">
                {isAddingColumn ? (
                  <div className="w-72 bg-surface-secondary/50 border border-border-default rounded-xl p-3">
                    <input
                      ref={newColumnInputRef}
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAddColumn();
                        if (e.key === "Escape") {
                          setIsAddingColumn(false);
                          setNewColumnName("");
                        }
                      }}
                      placeholder={t("columnActions.newColumnName")}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border-strong
                        bg-surface-primary text-dark dark:text-light
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-highlight mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleAddColumn()}
                        disabled={!newColumnName.trim()}
                        className="px-3 py-1.5 text-xs font-bold rounded-md bg-highlight hover:bg-highlight-hover text-dark transition-colors disabled:opacity-50"
                      >
                        {t("columnActions.addColumn")}
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnName("");
                        }}
                        className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                      >
                        {t("actions.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="
                      flex items-center gap-1.5
                      w-48 px-4 py-3
                      text-sm text-text-secondary
                      hover:text-dark dark:hover:text-light
                      bg-surface-secondary/30
                      hover:bg-surface-secondary/60
                      border border-dashed border-border-default
                      hover:border-border-strong
                      rounded-xl
                      transition-colors duration-75
                    "
                    title={t("columnActions.addColumn")}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M7 1v12M1 7h12" />
                    </svg>
                    {t("columnActions.addColumn")}
                  </button>
                )}
              </div>
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="w-64 sm:w-72">
              <KanbanCard
                card={activeCard}
                cardRole={activeRole}
                roleMember={activeRoleMember}
                labelMap={labelMap}
              />
            </div>
          ) : activeColumn ? (
            <div className="opacity-80">
              <KanbanColumn
                column={activeColumn}
                cards={filteredCardsByColumn.get(activeColumn._id) ?? []}
                roleMap={roleMap}
                memberMap={memberMap}
                onCardClick={() => {}}
                onAddCard={() => {}}
                onRenameColumn={() => {}}
                onDeleteColumn={() => {}}
                isCollapsed={collapsedColumns.has(activeColumn._id)}
                onToggleCollapse={() => {}}
                selectionMode={selectionMode}
                selectedCardIds={selectedCardIds}
                onToggleCardSelection={() => {}}
                labelMap={labelMap}
                isDimmed={false}
                isDraggingColumn={false}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card modal */}
      <KanbanCardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        boardId={boardData.board._id}
        columns={boardData.columns}
        roles={roleList}
        memberMap={memberMap}
        columnId={createColumnId}
        card={editingCard}
        labels={boardData.labels}
        templates={boardData.templates}
      />

      {/* Board settings modal (A4) */}
      <KanbanBoardSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        columns={boardData.columns}
      />
    </div>
  );
}
