import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Policy } from "../../../convex/policies";
import { PolicyMarkdown } from "../shared/PolicyMarkdown";

type OrgaPoliciesViewProps = {
  orgaId: Id<"orgas">;
};

const PAGE_SIZE = 10;

export function OrgaPoliciesView({ orgaId }: OrgaPoliciesViewProps) {
  const { t } = useTranslation("policies");
  const { t: tCommon } = useTranslation("common");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset pagination when search changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [debouncedSearch]);

  const policies = useQuery(api.policies.functions.list, {
    orgaId,
    search: debouncedSearch || undefined,
  });

  const displayedPolicies = useMemo(() => {
    if (!policies) return [];
    return policies.slice(0, displayCount);
  }, [policies, displayCount]);

  const hasMore = policies ? displayCount < policies.length : false;

  const handleSelectPolicy = useCallback((policy: Policy) => {
    setSelectedPolicy(policy);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPolicy(null);
  }, []);

  // Detail view for a single policy
  if (selectedPolicy) {
    return (
      <PolicyDetail
        policy={selectedPolicy}
        onBack={handleBack}
      />
    );
  }

  // List view
  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      <div className="pt-8 px-8 pb-8 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-dark dark:text-light">
            {t("list.title")}
          </h1>
        </header>

        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            placeholder={t("list.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="
              w-full px-4 py-2.5 text-sm
              border border-border-strong
              rounded-lg
              bg-surface-primary
              text-dark dark:text-light
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-highlight
            "
          />
        </div>

        {/* Policy list */}
        {policies === undefined ? (
          <div className="text-center py-12 text-text-secondary">
            {tCommon("loading")}
          </div>
        ) : displayedPolicies.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            {debouncedSearch ? t("list.emptySearch") : t("list.empty")}
          </div>
        ) : (
          <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden">
            <div className="divide-y divide-border-default">
              {displayedPolicies.map((policy) => (
                <PolicyListItem
                  key={policy._id}
                  policy={policy}
                  onSelect={handleSelectPolicy}
                />
              ))}
            </div>

            {policies.length > PAGE_SIZE && (
              <div className="px-4 py-2 text-xs text-text-tertiary text-center border-t border-border-default">
                {t("list.showingCount", {
                  shown: displayedPolicies.length,
                  total: policies.length,
                })}
              </div>
            )}

            {hasMore && (
              <button
                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                className="
                  w-full py-3
                  text-sm text-text-secondary
                  hover:text-gray-700 dark:hover:text-gray-300
                  hover:bg-surface-hover-subtle
                  transition-colors duration-75
                  border-t border-border-default
                  focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
                "
              >
                {t("list.loadMore")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function PolicyListItem({
  policy,
  onSelect,
}: {
  policy: Policy;
  onSelect: (policy: Policy) => void;
}) {
  return (
    <button
      onClick={() => onSelect(policy)}
      className="
        w-full px-4 py-3 text-left
        hover:bg-surface-hover-subtle
        transition-colors duration-75
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
        flex items-center gap-3
        group
      "
    >
      <span className="shrink-0 text-xs font-mono text-text-tertiary bg-surface-tertiary rounded px-1.5 py-0.5">
        #{policy.number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-dark dark:text-light truncate">
          {policy.title}
        </div>
        <div className="text-sm text-text-description line-clamp-2 mt-0.5">
          {policy.abstract}
        </div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        <path d="M6 4l4 4-4 4" />
      </svg>
    </button>
  );
}

function PolicyDetail({
  policy,
  onBack,
}: {
  policy: Policy;
  onBack: () => void;
}) {
  const { t } = useTranslation("policies");

  // Fetch the owning role to display its name
  const role = useQuery(api.roles.functions.getRoleById, {
    roleId: policy.roleId,
  });

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      <div className="pt-8 px-8 pb-8 max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="
            flex items-center gap-1.5
            text-sm text-text-secondary
            hover:text-dark dark:hover:text-light
            transition-colors duration-75
            mb-6
          "
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" />
          </svg>
          {t("detail.backToList")}
        </button>

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-text-tertiary bg-surface-tertiary rounded px-2 py-1">
              #{policy.number}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-dark dark:text-light mb-2">
            {policy.title}
          </h1>
          {role && (
            <p className="text-sm text-text-secondary">
              {t("detail.ownedBy", { role: role.title })}
            </p>
          )}
        </header>

        {/* Abstract */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t("detail.abstract")}
          </h2>
          <div className="bg-surface-primary border border-border-default rounded-lg p-4">
            <p className="text-text-description leading-relaxed">{policy.abstract}</p>
          </div>
        </section>

        {/* Full text */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t("detail.fullText")}
          </h2>
          <div className="bg-surface-primary border border-border-default rounded-lg p-6">
            <PolicyMarkdown text={policy.text} />
          </div>
        </section>
      </div>
    </div>
  );
}
