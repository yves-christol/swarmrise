"use client";

import { useTranslation } from "react-i18next";

const FILTER_TYPES = [
  "all",
  "teams",
  "roles",
  "members",
  "invitations",
  "policies",
  "orgas",
] as const;

export type FilterType = (typeof FILTER_TYPES)[number];

type FilterBarProps = {
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
};

export function FilterBar({ filterType, onFilterTypeChange }: FilterBarProps) {
  const { t } = useTranslation("decisions");

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label={t("toggleFilters")}>
      {FILTER_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onFilterTypeChange(type)}
          role="radio"
          aria-checked={filterType === type}
          className={`
            px-3 py-1 text-xs rounded-full
            transition-colors duration-75
            focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
            ${
              filterType === type
                ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840] font-medium"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          {t(`filterType.${type}`)}
        </button>
      ))}
    </div>
  );
}
