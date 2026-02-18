import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanColumn as KanbanColumnType } from "../../../../convex/kanban";
import type { KanbanCard as KanbanCardType } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { Id } from "../../../../convex/_generated/dataModel";
import { KanbanCard } from "../KanbanCard";

type KanbanColumnProps = {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  roleMap: Map<Id<"roles">, Role>;
  memberMap: Map<Id<"members">, Member>;
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (columnId: Id<"kanbanColumns">) => void;
};

function SortableCard({
  card,
  role,
  roleMember,
  onCardClick,
}: {
  card: KanbanCardType;
  role: Role | undefined;
  roleMember: Member | undefined;
  onCardClick: (card: KanbanCardType) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <KanbanCard
      ref={setNodeRef}
      card={card}
      role={role}
      roleMember={roleMember}
      onClick={() => onCardClick(card)}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
}

export function KanbanColumn({ column, cards, roleMap, memberMap, onCardClick, onAddCard }: KanbanColumnProps) {
  const { t } = useTranslation("kanban");

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.position - b.position),
    [cards],
  );

  const cardIds = useMemo(() => sortedCards.map((c) => c._id), [sortedCards]);

  // Make the column itself a droppable target (for dropping into empty columns)
  const { setNodeRef: setDroppableRef } = useDroppable({ id: `column:${column._id}` });

  return (
    <div
      className="
        flex flex-col
        w-72 flex-shrink-0
        bg-surface-secondary/50
        border border-border-default
        rounded-xl
        max-h-full
      "
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-default">
        <h3 className="text-sm font-semibold text-dark dark:text-light">
          {column.name}
        </h3>
        <span className="text-xs text-text-tertiary tabular-nums">
          {t("board.cardCount", { count: cards.length })}
        </span>
      </div>

      {/* Card list - sortable context */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[4rem]"
        >
          {sortedCards.map((card) => {
            const role = roleMap.get(card.roleId);
            const roleMember = role ? memberMap.get(role.memberId) : undefined;
            return (
              <SortableCard
                key={card._id}
                card={card}
                role={role}
                roleMember={roleMember}
                onCardClick={onCardClick}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Add card button */}
      <div className="p-2 border-t border-border-default">
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
    </div>
  );
}
