import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Policy } from "../../../convex/policies";
import type { Role } from "../../../convex/roles";
import { PolicyMarkdown } from "../shared/PolicyMarkdown";
import { getRoleIconPath } from "../../utils/roleIconDefaults";
import { useFocus, useViewMode } from "../../tools/orgaStore";

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

  const { focusOnRole } = useFocus();
  const { setViewMode } = useViewMode();

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

  // Fetch all roles in the org for efficient lookup
  const roles = useQuery(api.roles.functions.listRolesInOrga, { orgaId });

  const roleMap = useMemo(() => {
    const map = new Map<Id<"roles">, Role>();
    roles?.forEach((role) => map.set(role._id, role));
    return map;
  }, [roles]);

  const handleNavigateToRole = useCallback(
    (roleId: Id<"roles">, teamId: Id<"teams">) => {
      setViewMode("visual");
      focusOnRole(roleId, teamId);
    },
    [focusOnRole, setViewMode]
  );

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
        roleMap={roleMap}
        onNavigateToRole={handleNavigateToRole}
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
                  role={roleMap.get(policy.roleId)}
                  onSelect={handleSelectPolicy}
                  onNavigateToRole={handleNavigateToRole}
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
  role,
  onSelect,
  onNavigateToRole,
}: {
  policy: Policy;
  role: Role | undefined;
  onSelect: (policy: Policy) => void;
  onNavigateToRole: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-dark dark:text-light truncate">
            {policy.title}
          </span>
          {role && (
            <RoleBadge
              role={role}
              onNavigateToRole={onNavigateToRole}
            />
          )}
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

function RoleBadge({
  role,
  onNavigateToRole,
}: {
  role: Role;
  onNavigateToRole: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
}) {
  const { t } = useTranslation("policies");

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onNavigateToRole(role._id, role.teamId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onNavigateToRole(role._id, role.teamId);
        }
      }}
      title={t("list.goToRole", { role: role.title })}
      className="
        inline-flex items-center gap-1 shrink-0
        px-1.5 py-0.5
        text-xs text-text-secondary
        bg-surface-tertiary
        rounded
        hover:bg-highlight/10 hover:text-highlight
        transition-colors duration-75
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-highlight
      "
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 40 40"
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          d={getRoleIconPath(role.iconKey, role.roleType)}
          fill="currentColor"
        />
      </svg>
      <span className="truncate max-w-[10rem]">{role.title}</span>
    </span>
  );
}

function PolicyDetail({
  policy,
  onBack,
  roleMap,
  onNavigateToRole,
}: {
  policy: Policy;
  onBack: () => void;
  roleMap: Map<Id<"roles">, Role>;
  onNavigateToRole: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
}) {
  const { t } = useTranslation("policies");

  // Use the pre-fetched role from the map, fall back to individual query
  const fetchedRole = useQuery(
    api.roles.functions.getRoleById,
    roleMap.has(policy.roleId) ? "skip" : { roleId: policy.roleId }
  );
  const role = roleMap.get(policy.roleId) ?? fetchedRole;

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
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>{t("detail.ownedByPrefix")}</span>
              <RoleBadge
                role={role}
                onNavigateToRole={onNavigateToRole}
              />
            </div>
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
