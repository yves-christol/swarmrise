import { useTranslation } from "react-i18next";

export function KanbanEmptyState() {
  const { t } = useTranslation("kanban");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Kanban icon */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-gray-300 dark:text-gray-600 mb-4"
        aria-hidden="true"
      >
        <rect x="4" y="8" width="12" height="32" rx="2" />
        <rect x="18" y="8" width="12" height="24" rx="2" />
        <rect x="32" y="8" width="12" height="16" rx="2" />
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("board.empty")}
      </p>
    </div>
  );
}
