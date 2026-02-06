"use client";

import { useTranslation } from "react-i18next";

export type ViewMode = "visual" | "manage";

type ViewToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
};

export function ViewToggle({ mode, onChange, disabled = false }: ViewToggleProps) {
  const { t } = useTranslation("common");
  return (
    <div className="absolute top-4 right-4 z-10">
      <div
        className="
          flex items-center
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-700
          rounded-lg
          shadow-md
          overflow-hidden
        "
        role="tablist"
        aria-label={t("viewMode")}
      >
        <button
          role="tab"
          aria-selected={mode === "visual"}
          aria-controls="visual-view"
          onClick={() => onChange("visual")}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2
            transition-colors duration-75
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#eac840]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              mode === "visual"
                ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {/* Circle/Visual icon - network of circles */}
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
          <span className="text-sm font-medium sr-only sm:not-sr-only">{t("visual")}</span>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />

        <button
          role="tab"
          aria-selected={mode === "manage"}
          aria-controls="manage-view"
          onClick={() => onChange("manage")}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2
            transition-colors duration-75
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#eac840]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              mode === "manage"
                ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {/* List/Config icon - stacked rectangles */}
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
          <span className="text-sm font-medium sr-only sm:not-sr-only">{t("manage")}</span>
        </button>
      </div>
    </div>
  );
}
