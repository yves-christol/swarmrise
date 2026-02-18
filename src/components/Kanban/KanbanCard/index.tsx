import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import type { KanbanCard as KanbanCardType } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { getRoleIconPath } from "../../../utils/roleIconDefaults";

type KanbanCardProps = {
  card: KanbanCardType;
  cardRole: Role | undefined;
  roleMember: Member | undefined;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard({ card, cardRole, roleMember, onClick, style, ...props }, ref) {
    const { t } = useTranslation("kanban");
    const isOverdue = card.dueDate < Date.now();

    const dueDateStr = new Date(card.dueDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        style={style}
        className={`
          w-full text-left
          p-3 rounded-lg
          bg-surface-primary
          border
          ${isOverdue ? "border-red-300 dark:border-red-700" : "border-border-default"}
          ${onClick ? "hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-highlight" : "shadow-lg"}
          transition-shadow duration-75
        `}
        aria-label={`${card.title} - ${cardRole ? cardRole.title : ""} ${roleMember ? `${roleMember.firstname} ${roleMember.surname}` : ""}`}
        {...props}
      >
        {/* Title */}
        <p className="text-sm font-medium text-dark dark:text-light leading-snug line-clamp-2">
          {card.title}
        </p>

        {/* Footer: role icon + member avatar + due date */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {/* Role + Member */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Role icon */}
            {cardRole && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 40 40"
                className="flex-shrink-0 text-dark dark:text-light"
                aria-hidden="true"
              >
                <path
                  d={getRoleIconPath(cardRole.iconKey, cardRole.roleType)}
                  fill="currentColor"
                />
              </svg>
            )}

            {/* Member avatar */}
            {roleMember && (
              <>
                <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-tertiary flex-shrink-0">
                  {roleMember.pictureURL ? (
                    <img
                      src={roleMember.pictureURL}
                      alt={`${roleMember.firstname} ${roleMember.surname}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-text-secondary">
                      {roleMember.firstname.charAt(0)}{roleMember.surname.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-text-secondary truncate">
                  {roleMember.firstname}
                </span>
              </>
            )}
          </div>

          {/* Due date */}
          <span
            className={`
              text-xs flex-shrink-0
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
    );
  }
);
