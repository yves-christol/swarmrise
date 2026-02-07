"use client";

import { useTranslation } from "react-i18next";

type MissionReminderProps = {
  mission: string | null | undefined;
  isLoading?: boolean;
};

/**
 * A subtle mission reminder component that displays the mission statement
 * at the top of manage views. Follows brand guidelines:
 * - Uses muted colors for secondary information
 * - Consistent spacing and typography
 * - Graceful handling of undefined/empty missions
 */
export function MissionReminder({ mission, isLoading }: MissionReminderProps) {
  const { t } = useTranslation("common");

  // Don't render anything while loading to avoid layout shift
  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3M8 10v1" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const displayMission = mission?.trim();
  const hasMission = displayMission && displayMission.length > 0;

  return (
    <div className="mb-6">
      <div
        className={`
          flex items-start gap-3 p-4
          rounded-lg border
          ${hasMission
            ? "bg-[#eac840]/5 dark:bg-[#eac840]/10 border-[#eac840]/20 dark:border-[#eac840]/30"
            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          }
        `}
      >
        {/* Mission icon - compass/target metaphor */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={hasMission ? "text-[#d4af37] dark:text-[#eac840]" : "text-gray-400 dark:text-gray-500"}
            aria-hidden="true"
          >
            {/* Compass/target icon */}
            <circle cx="8" cy="8" r="6" />
            <circle cx="8" cy="8" r="2" />
            <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            {t("mission")}
          </h3>
          {hasMission ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {displayMission}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              {t("noMissionDefined")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
