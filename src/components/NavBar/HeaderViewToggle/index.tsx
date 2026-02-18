import { useTranslation } from "react-i18next";
import { useFocus, useViewMode } from "../../../tools/orgaStore/hooks";
import { useViewModeNavigation } from "../../../hooks/useViewModeNavigation";
import type { ViewMode } from "../../../tools/orgaStore/types";

const tabClass = (isActive: boolean, disabled: boolean) => `
  flex items-center justify-center px-2 py-1.5
  transition-colors duration-75
  focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
  ${
    isActive
      ? "bg-highlight/20 text-highlight-hover dark:text-highlight"
      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
  }
`;

export const HeaderViewToggle = () => {
  const { t } = useTranslation("common");
  const { changeViewMode } = useViewModeNavigation();
  const { swapPhase } = useViewMode();
  const { focus, isFocusTransitioning } = useFocus();

  const { viewMode } = useViewModeNavigation();
  const disabled = swapPhase !== "idle" || isFocusTransitioning;
  const isTeamFocused = focus.type === "team";

  const handleChange = (mode: ViewMode) => {
    if (!disabled) changeViewMode(mode);
  };

  return (
    <div
      className="flex items-center bg-surface-primary border border-border-strong rounded-lg shadow-md overflow-hidden"
      role="tablist"
      aria-label={t("viewMode")}
    >
      <button
        role="tab"
        aria-selected={viewMode === "visual"}
        onClick={() => handleChange("visual")}
        disabled={disabled}
        className={tabClass(viewMode === "visual", disabled)}
        title={`${t("visual")} (V)`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="7" />
          <circle cx="9" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="13" cy="12" r="2" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />

      <button
        role="tab"
        aria-selected={viewMode === "manage"}
        onClick={() => handleChange("manage")}
        disabled={disabled}
        className={tabClass(viewMode === "manage", disabled)}
        title={`${t("manage")} (V)`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="12" height="3" rx="1" />
          <rect x="3" y="8" width="12" height="3" rx="1" />
          <rect x="3" y="13" width="8" height="3" rx="1" />
        </svg>
      </button>

      {isTeamFocused && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          <button
            role="tab"
            aria-selected={viewMode === "kanban"}
            onClick={() => handleChange("kanban")}
            disabled={disabled}
            className={tabClass(viewMode === "kanban", disabled)}
            title={`${t("kanban")} (K)`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="3.5" height="12" rx="1" />
              <rect x="7.25" y="3" width="3.5" height="8" rx="1" />
              <rect x="12.5" y="3" width="3.5" height="10" rx="1" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};
