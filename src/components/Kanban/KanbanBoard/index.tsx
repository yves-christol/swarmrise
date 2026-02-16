import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { KanbanCard as KanbanCardType } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import { KanbanColumn } from "../KanbanColumn";
import { KanbanEmptyState } from "../KanbanEmptyState";
import { KanbanCardModal } from "../KanbanCardModal";
import { KanbanCard } from "../KanbanCard";

type KanbanBoardProps = {
  teamId: Id<"teams">;
  orgaId: Id<"orgas">;
};

/** Position gap between cards. When rebalancing, cards get multiples of this. */
const POSITION_GAP = 1024;

export function KanbanBoard({ teamId, orgaId }: KanbanBoardProps) {
  const { t } = useTranslation("kanban");
  const { t: tCommon } = useTranslation("common");

  // Check team access first — skip all other queries if the user is not a member
  const hasAccess = useQuery(api.kanban.functions.checkTeamAccess, { teamId });

  const boardData = useQuery(
    api.kanban.functions.getBoardWithData,
    hasAccess ? { teamId } : "skip",
  );
  const members = useQuery(
    api.members.functions.listMembers,
    hasAccess ? { orgaId } : "skip",
  );
  const moveCard = useMutation(api.kanban.functions.moveCard);
  const ensureBoard = useMutation(api.kanban.functions.ensureBoard);

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

  // DnD state
  const [activeCardId, setActiveCardId] = useState<Id<"kanbanCards"> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Build member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<Id<"members">, Member>();
    members?.forEach((m) => map.set(m._id, m as Member));
    return map;
  }, [members]);

  // Members as array for modal
  const memberList = useMemo(() => {
    return Array.from(memberMap.values());
  }, [memberMap]);

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

  // Filter cards by search query
  const filteredCardsByColumn = useMemo(() => {
    if (!searchQuery.trim()) return cardsByColumn;

    const query = searchQuery.toLowerCase();
    const filtered = new Map<Id<"kanbanColumns">, KanbanCardType[]>();

    for (const [columnId, cards] of cardsByColumn) {
      filtered.set(
        columnId,
        cards.filter((card) => {
          if (card.title.toLowerCase().includes(query)) return true;
          const owner = memberMap.get(card.ownerId);
          if (owner) {
            const fullName = `${owner.firstname} ${owner.surname}`.toLowerCase();
            if (fullName.includes(query)) return true;
          }
          return false;
        }),
      );
    }
    return filtered;
  }, [cardsByColumn, searchQuery, memberMap]);

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
    setActiveCardId(event.active.id as Id<"kanbanCards">);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by SortableContext
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || !boardData) return;

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
  }, [boardData, cardById, cardsByColumn, findColumnId, moveCard]);

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null);
  }, []);

  const collisionDetection = useCallback(
    (...args: Parameters<typeof pointerWithin>) => {
      const pointerCollisions = pointerWithin(...args);
      if (pointerCollisions.length > 0) return pointerCollisions;
      return closestCorners(...args);
    },
    [],
  );

  // Active card for drag overlay
  const activeCard = activeCardId ? cardById.get(activeCardId) : null;

  // Loading (access check still pending)
  if (hasAccess === undefined) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        {tCommon("loading")}
      </div>
    );
  }

  // User is not a member of this team — show nothing (the Kanban view is inaccessible)
  if (!hasAccess) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        {t("board.noAccess")}
      </div>
    );
  }

  // Board data still loading
  if (boardData === undefined) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        {tCommon("loading")}
      </div>
    );
  }

  // No board yet (ensureBoard is creating it)
  if (boardData === null) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
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
      {/* Board header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
          {t("board.title")}
        </h2>

        {/* Search bar */}
        {totalCards > 0 && (
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
                rounded-lg border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-900
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840]
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
        <div
          className="
            flex gap-3 sm:gap-4
            overflow-x-auto
            pb-4
            -mx-2 px-2
            snap-x snap-mandatory sm:snap-none
          "
          style={{ minHeight: totalCards > 0 ? "20rem" : undefined }}
        >
          {boardData.columns.map((column) => {
            const columnCards = filteredCardsByColumn.get(column._id) ?? [];
            // During search, dim empty columns but keep them visible
            const isEmpty = isSearching && columnCards.length === 0;

            return (
              <div
                key={column._id}
                className={`snap-start ${isEmpty ? "opacity-40" : ""} transition-opacity duration-150`}
              >
                <KanbanColumn
                  column={column}
                  cards={columnCards}
                  memberMap={memberMap}
                  onCardClick={handleCardClick}
                  onAddCard={handleAddCard}
                />
              </div>
            );
          })}
        </div>

        {/* Drag overlay — portaled to document.body to escape ancestor
            transforms/filters that break position:fixed coordinates */}
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="w-64 sm:w-72">
                <KanbanCard
                  card={activeCard}
                  owner={memberMap.get(activeCard.ownerId)}
                />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {/* Card modal */}
      <KanbanCardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        boardId={boardData.board._id}
        columns={boardData.columns}
        members={memberList}
        columnId={createColumnId}
        card={editingCard}
      />
    </div>
  );
}
