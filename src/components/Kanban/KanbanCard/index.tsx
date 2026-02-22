import { forwardRef, memo } from "react";
import { useTranslation } from "react-i18next";
import type { KanbanCard as KanbanCardType, KanbanLabel, Priority } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { Id } from "../../../../convex/_generated/dataModel";
import { getRoleIconPath } from "../../../utils/roleIconDefaults";

/** Maps label color keys to Tailwind background classes */
const LABEL_BG_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  gray: "bg-gray-500",
};

/** Maps priority to color classes */
const PRIORITY_CLASSES: Record<Priority, { border: string; dot: string }> = {
  low: { border: "border-l-blue-400", dot: "bg-blue-400" },
  medium: { border: "border-l-amber-400", dot: "bg-amber-400" },
  high: { border: "border-l-orange-500", dot: "bg-orange-500" },
  critical: { border: "border-l-red-600", dot: "bg-red-600" },
};

type KanbanCardProps = {
  card: KanbanCardType;
  cardRole: Role | undefined;
  roleMember: Member | undefined;
  onClick?: () => void;
  style?: React.CSSProperties;
  selectionMode?: boolean;
  isSelected?: boolean;
  labelMap?: Map<Id<"kanbanLabels">, KanbanLabel>;
};

export const KanbanCard = memo(forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard({ card, cardRole, roleMember, onClick, style, selectionMode, isSelected, labelMap, ...props }, ref) {
    const { t } = useTranslation("kanban");
    const isOverdue = card.dueDate < Date.now();

    const dueDateStr = new Date(card.dueDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    // B1: Resolved labels
    const cardLabels = (card.labelIds ?? [])
      .map((id) => labelMap?.get(id))
      .filter(Boolean) as KanbanLabel[];

    // B2: Checklist progress
    const checklist = card.checklist ?? [];
    const checklistTotal = checklist.length;
    const checklistCompleted = checklist.filter((i) => i.completed).length;

    // B6: Priority
    const priority = card.priority;
    const priorityStyles = priority ? PRIORITY_CLASSES[priority] : null;

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
          ${priorityStyles ? `border-l-[3px] ${priorityStyles.border}` : ""}
          ${isSelected ? "border-highlight ring-2 ring-highlight/30" : isOverdue ? "border-red-300 dark:border-red-700" : "border-border-default"}
          ${onClick ? "hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-highlight" : "shadow-lg"}
          transition-shadow duration-75
        `}
        aria-label={`${card.title} - ${cardRole ? cardRole.title : ""} ${roleMember ? `${roleMember.firstname} ${roleMember.surname}` : ""}`}
        {...props}
      >
        <div className="flex items-start gap-2">
          {/* Selection checkbox */}
          {selectionMode && (
            <div className="flex-shrink-0 mt-0.5">
              <div
                className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center
                  transition-colors duration-75
                  ${isSelected
                    ? "bg-highlight border-highlight"
                    : "border-border-strong bg-transparent"
                  }
                `}
              >
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" aria-hidden="true">
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* B1: Label badges (top of card) */}
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {cardLabels.map((label) => (
                  <span
                    key={label._id}
                    className={`inline-block h-1.5 w-8 rounded-full ${LABEL_BG_CLASSES[label.color] ?? "bg-gray-500"}`}
                    title={label.name}
                  />
                ))}
              </div>
            )}

            {/* Title */}
            <p className="text-sm font-medium text-dark dark:text-light leading-snug line-clamp-2">
              {card.title}
            </p>

            {/* B2: Checklist progress bar */}
            {checklistTotal > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex-1 h-1 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      checklistCompleted === checklistTotal ? "bg-green-500" : "bg-highlight"
                    }`}
                    style={{ width: `${(checklistCompleted / checklistTotal) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-tertiary tabular-nums flex-shrink-0">
                  {t("checklist.progress", { completed: checklistCompleted, total: checklistTotal })}
                </span>
              </div>
            )}

            {/* Footer: role icon + member avatar + indicators + due date */}
            <div className="flex items-center justify-between mt-2 gap-2">
              {/* Role + Member */}
              <div className="flex items-center gap-1.5 min-w-0">
                {/* B6: Priority dot */}
                {priorityStyles && (
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityStyles.dot}`}
                    title={priority ? t(`priority.${priority}`) : undefined}
                  />
                )}

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
                          loading="lazy"
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
        </div>
      </div>
    );
  }
));
