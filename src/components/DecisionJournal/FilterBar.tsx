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
                ? "bg-highlight/20 text-highlight-hover dark:text-highlight font-medium"
                : "bg-surface-secondary text-text-description hover:bg-surface-hover-strong"
            }
          `}
        >
          {t(`filterType.${type}`)}
        </button>
      ))}
    </div>
  );
}
