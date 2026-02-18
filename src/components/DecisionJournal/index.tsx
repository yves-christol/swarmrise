import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DecisionRow } from "./DecisionRow";
import { FilterBar, type FilterType } from "./FilterBar";
import { type Decision, getDateGroup } from "./formatters";

type DecisionJournalProps =
  | { scope: "orga"; orgaId: Id<"orgas"> }
  | { scope: "team"; orgaId: Id<"orgas">; teamId: Id<"teams"> };

export function DecisionJournal(props: DecisionJournalProps) {
  const { t } = useTranslation("decisions");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allDecisions, setAllDecisions] = useState<Decision[]>([]);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);

  const targetTypeArg = filterType === "all" ? undefined : filterType;
  const showTeamName = props.scope === "orga";

  // Query for decisions
  const result =
    props.scope === "orga"
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useQuery(api.decisions.functions.listDecisionsForOrga, {
          orgaId: props.orgaId,
          cursor,
          targetType: targetTypeArg,
        })
      : // eslint-disable-next-line react-hooks/rules-of-hooks
        useQuery(api.decisions.functions.listDecisionsForTeam, {
          orgaId: props.orgaId,
          teamId: props.teamId,
          cursor,
          targetType: targetTypeArg,
        });

  // Combine paginated results
  const decisions = useMemo(() => {
    if (!result) return hasLoadedMore ? allDecisions : [];
    if (!hasLoadedMore) return result.decisions;
    // Merge: allDecisions + new page, dedup by _id
    const seen = new Set(allDecisions.map((d) => d._id));
    const merged = [...allDecisions];
    for (const d of result.decisions) {
      if (!seen.has(d._id)) {
        merged.push(d);
      }
    }
    return merged;
  }, [result, allDecisions, hasLoadedMore]);

  const hasMore = result?.hasMore ?? false;

  // Group decisions by date
  const groupedDecisions = useMemo(() => {
    const groups: { label: string; decisions: Decision[] }[] = [];
    let currentLabel = "";

    for (const decision of decisions) {
      const label = getDateGroup(decision._creationTime, t("today"), t("yesterday"));
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, decisions: [decision] });
      } else {
        groups[groups.length - 1].decisions.push(decision);
      }
    }

    return groups;
  }, [decisions, t]);

  const handleLoadMore = useCallback(() => {
    if (!result || result.decisions.length === 0) return;
    // Save current decisions before loading more
    setAllDecisions(decisions);
    setHasLoadedMore(true);
    setCursor(result.nextCursor ?? undefined);
  }, [result, decisions]);

  const handleFilterChange = useCallback((type: FilterType) => {
    setFilterType(type);
    // Reset pagination when filter changes
    setCursor(undefined);
    setAllDecisions([]);
    setHasLoadedMore(false);
  }, []);

  const isLoading = result === undefined;

  return (
    <section className="mb-8">
      {/* Section header with filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-light">
            {t("journal")}
          </h2>
          <p className="text-sm text-text-description mt-0.5">
            {props.scope === "orga"
              ? t("journalDescriptionOrga")
              : t("journalDescriptionTeam")}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            p-2 rounded-lg
            transition-colors duration-75
            focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
            ${
              showFilters
                ? "bg-surface-tertiary text-dark dark:text-light"
                : "hover:bg-surface-hover text-text-secondary"
            }
          `}
          aria-label={t("toggleFilters")}
          aria-expanded={showFilters}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 5h14M5 10h10M7 15h6" />
          </svg>
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <FilterBar filterType={filterType} onFilterTypeChange={handleFilterChange} />
      )}

      {/* Decision list */}
      <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-text-secondary">
            {t("loadingMore")}
          </div>
        ) : decisions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-text-secondary text-sm">
              {filterType !== "all" ? t("noDecisionsMatchFilter") : t("noDecisionsYet")}
            </p>
            {filterType === "all" && (
              <p className="text-text-tertiary text-xs mt-1">
                {t("noDecisionsYetHint")}
              </p>
            )}
          </div>
        ) : (
          <>
            {groupedDecisions.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="px-4 py-2 bg-surface-secondary border-b border-border-default">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    {group.label}
                  </span>
                </div>
                {/* Decision rows */}
                <div className="divide-y divide-border-default">
                  {group.decisions.map((decision) => (
                    <DecisionRow
                      key={decision._id}
                      decision={decision}
                      showTeamName={showTeamName}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more button */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                className="
                  w-full py-3
                  text-sm text-text-secondary
                  hover:text-gray-700 dark:hover:text-gray-300
                  hover:bg-surface-hover-subtle
                  transition-colors duration-75
                  border-t border-border-default
                "
              >
                {t("loadMore")}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
