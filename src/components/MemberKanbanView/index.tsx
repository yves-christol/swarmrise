import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { MemberKanbanCard, MemberKanbanTeamGroup } from "../../../convex/kanban";
import { getRoleIconPath } from "../../utils/roleIconDefaults";
import { useFocus, useSelectedOrga } from "../../tools/orgaStore";
import { routes } from "../../routes";

type MemberKanbanViewProps = {
  memberId: Id<"members">;
};

/**
 * MemberKanbanView displays all Kanban cards owned by roles that
 * a specific member holds, across all teams they belong to.
 * Cards are grouped by team, with each team showing cards
 * organized by column.
 */
export function MemberKanbanView({ memberId }: MemberKanbanViewProps) {
  const { t } = useTranslation("kanban");
  const { t: tCommon } = useTranslation("common");

  const { focusOnTeam } = useFocus();
  const { selectedOrgaId } = useSelectedOrga();
  const navigate = useNavigate();

  const teamGroups = useQuery(
    api.kanban.functions.getCardsByMemberWithContext,
    { memberId },
  );

  // Count total cards across all teams
  const totalCards = useMemo(() => {
    if (!teamGroups) return 0;
    return teamGroups.reduce((sum, group) => sum + group.cards.length, 0);
  }, [teamGroups]);

  // Loading state
  if (teamGroups === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[12rem]">
        <div className="text-text-secondary">{tCommon("loading")}</div>
      </div>
    );
  }

  // Empty state
  if (teamGroups.length === 0 || totalCards === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold text-dark dark:text-light mb-6">
          {t("memberView.title")}
        </h2>
        <div className="bg-surface-primary border border-border-default rounded-lg px-4 py-12 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-text-tertiary"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="6" y="8" width="36" height="32" rx="3" />
            <line x1="18" y1="8" x2="18" y2="40" />
            <line x1="30" y1="8" x2="30" y2="40" />
            <rect x="20" y="14" width="8" height="6" rx="1" />
          </svg>
          <p className="text-text-secondary text-sm">
            {t("memberView.empty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-dark dark:text-light">
          {t("memberView.title")}
        </h2>
        <span className="text-sm text-text-secondary">
          {t("memberView.totalCards", { count: totalCards })}
        </span>
      </div>

      {/* Team groups */}
      <div className="space-y-6">
        {teamGroups.map((group) => (
          <TeamCardGroup
            key={group.teamId}
            group={group}
            onNavigateToTeam={() => focusOnTeam(group.teamId)}
            onNavigateToKanban={() => {
              if (selectedOrgaId) {
                void navigate(routes.teamKanban(selectedOrgaId, group.teamId));
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function TeamCardGroup({
  group,
  onNavigateToTeam,
  onNavigateToKanban,
}: {
  group: MemberKanbanTeamGroup;
  onNavigateToTeam: () => void;
  onNavigateToKanban: () => void;
}) {
  const { t } = useTranslation("kanban");

  // Group cards by column name for organized display
  const cardsByColumn = useMemo(() => {
    const map = new Map<string, MemberKanbanCard[]>();
    for (const card of group.cards) {
      const existing = map.get(card.columnName) ?? [];
      existing.push(card);
      map.set(card.columnName, existing);
    }
    return map;
  }, [group.cards]);

  return (
    <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden">
      {/* Team header */}
      <button
        onClick={onNavigateToTeam}
        className="
          group
          w-full px-4 py-2.5
          bg-surface-secondary
          border-b border-border-default
          flex items-center justify-between
          hover:bg-surface-hover/50
          transition-colors duration-75
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
          text-left
        "
        aria-label={`${group.teamName} - ${t("memberView.viewTeamBoard")}`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.teamColor || "#9ca3af" }}
          />
          <span className="font-medium text-dark dark:text-light">
            {group.teamName}
          </span>
          <span className="text-xs text-text-secondary">
            ({t("board.cardCount", { count: group.cards.length })})
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-75"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>

      {/* Cards organized by column */}
      <div className="p-3 space-y-3">
        {[...cardsByColumn.entries()].map(([columnName, cards]) => (
          <div key={columnName}>
            {/* Column label */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {columnName}
              </span>
              <span className="text-xs text-text-tertiary">
                ({cards.length})
              </span>
            </div>
            {/* Cards in this column */}
            <div className="space-y-1.5 ml-1">
              {cards.map((card) => (
                <MemberKanbanCardItem
                  key={card._id}
                  card={card}
                  onClick={onNavigateToKanban}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberKanbanCardItem({
  card,
  onClick,
}: {
  card: MemberKanbanCard;
  onClick: () => void;
}) {
  const { t } = useTranslation("kanban");
  const isOverdue = card.dueDate < Date.now();

  const dueDateStr = new Date(card.dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left
        p-2.5 rounded-lg
        bg-surface-secondary/60
        border
        ${isOverdue ? "border-red-300 dark:border-red-700" : "border-border-default"}
        hover:bg-surface-hover/50
        transition-colors duration-75
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
      `}
      aria-label={`${card.title} - ${t("memberView.viewTeamBoard")}`}
    >
      {/* Title */}
      <p className="text-sm font-medium text-dark dark:text-light leading-snug line-clamp-2">
        {card.title}
      </p>

      {/* Footer: role + due date */}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {/* Role info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 40 40"
            className="flex-shrink-0 text-dark dark:text-light"
            aria-hidden="true"
          >
            <path
              d={getRoleIconPath(card.roleIconKey, card.roleType)}
              fill="currentColor"
            />
          </svg>
          <span className="text-xs text-text-secondary truncate">
            {card.roleTitle}
          </span>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOverdue && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {t("card.overdue")}
            </span>
          )}
          <span
            className={`
              text-xs
              ${isOverdue
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-text-tertiary"
              }
            `}
            title={isOverdue ? t("card.overdue") : t("card.dueIn", { date: dueDateStr })}
          >
            {dueDateStr}
          </span>
        </div>
      </div>
    </button>
  );
}
