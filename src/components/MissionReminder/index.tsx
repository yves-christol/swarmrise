import { useTranslation } from "react-i18next";

type MissionReminderProps = {
  mission: string | null | undefined;
  isLoading?: boolean;
};

/**
 * A minimal mission reminder component that displays the mission statement
 * inline within the overview section. Follows brand guidelines:
 * - Uses muted colors for secondary information
 * - No decorative container -- just icon and text
 * - Graceful handling of undefined/empty missions
 */
export function MissionReminder({ mission, isLoading }: MissionReminderProps) {
  const { t } = useTranslation("common");

  // Don't render anything while loading to avoid layout shift
  if (isLoading) {
    return (
      <div className="flex items-start gap-2.5 mb-4">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-tertiary"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3M8 10v1" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="h-4 w-48 bg-surface-tertiary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const displayMission = mission?.trim();
  const hasMission = displayMission && displayMission.length > 0;

  return (
    <div className="flex items-start gap-2.5 mb-4">
      {/* Mission icon - compass/target metaphor */}
      <div className="flex-shrink-0 mt-0.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={hasMission ? "text-text-secondary" : "text-text-tertiary"}
          aria-hidden="true"
        >
          {/* Compass/target icon */}
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="2" />
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        {hasMission ? (
          <p className="text-sm text-text-description leading-relaxed">
            {displayMission}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary italic">
            {t("noMissionDefined")}
          </p>
        )}
      </div>
    </div>
  );
}
