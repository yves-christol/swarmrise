import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { GraphNode } from "./types";

type DetailsPanelProps = {
  node: GraphNode | null;
  onClose: () => void;
};

export const DetailsPanel = memo(function DetailsPanel({
  node,
  onClose,
}: DetailsPanelProps) {
  const { t } = useTranslation("teams");
  return (
    <aside
      className={`
        absolute top-0 right-0 h-full w-80
        bg-surface-primary
        shadow-xl border-l border-border-strong
        transform transition-transform duration-200
        ${node ? "translate-x-0" : "translate-x-full"}
      `}
    >
      {node && (
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-dark dark:text-light">
              {node.name}
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
              aria-label={t("diagram.close")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-surface-tertiary rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {node.roleCount}
              </div>
              <div className="text-xs text-text-description">{t("diagram.rolesLabel")}</div>
            </div>
          </div>

          <div className="border-t border-border-strong pt-4">
            <h3 className="text-sm font-bold text-text-description mb-2">{t("diagram.teamInfoHeading")}</h3>
            <p className="text-sm text-text-description">
              {t("diagram.teamRolesAssigned", { count: node.roleCount })}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
});
