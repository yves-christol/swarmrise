import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";

export type TeamListItemTeam = {
  _id: Id<"teams">;
  name: string;
  roleCount: number;
  color?: string;
};

export type TeamListItemProps = {
  team: TeamListItemTeam;
  onNavigate?: () => void;
};

export function TeamListItem({ team, onNavigate }: TeamListItemProps) {
  const { t: tTeams } = useTranslation("teams");

  const content = (
    <>
      {/* Team color dot */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: team.color || "#9CA3AF" }}
        aria-hidden="true"
      />

      {/* Team name and role count */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-dark dark:text-light truncate block">
          {team.name}
        </span>
        <span className="text-sm text-text-secondary">
          {team.roleCount === 1
            ? tTeams("diagram.roleCountLabel", { count: team.roleCount })
            : tTeams("diagram.roleCountLabel_other", { count: team.roleCount })}
        </span>
      </div>

      {/* Navigation chevron - only if navigable */}
      {onNavigate && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="
            text-text-tertiary
            opacity-0 group-hover:opacity-100
            transition-opacity duration-75
            flex-shrink-0
          "
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </>
  );

  // If navigable, wrap in a button
  if (onNavigate) {
    return (
      <button
        onClick={onNavigate}
        className="
          group
          w-full flex items-center gap-3 px-4 py-3
          hover:bg-surface-hover-subtle
          transition-colors duration-75
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
          text-left
        "
      >
        {content}
      </button>
    );
  }

  // Non-navigable: render as a div
  return (
    <div
      className="
        group
        w-full flex items-center gap-3 px-4 py-3
        hover:bg-surface-hover-subtle
        transition-colors duration-75
      "
    >
      {content}
    </div>
  );
}
