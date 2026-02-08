import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga, useMembers, useTeams, useRoles, useFocus } from "../../tools/orgaStore";
import { EmailDomainsInput } from "../EmailDomainsInput";
import { DecisionJournal } from "../DecisionJournal";
import { MemberListItem } from "../MemberListItem";
import { TeamListItem, TeamListItemTeam } from "../TeamListItem";
import { MissionReminder } from "../MissionReminder";

type OrgaManageViewProps = {
  orgaId: Id<"orgas">;
};

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "green" | "purple" | "blue";
}) {
  const colorClasses = {
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    blue: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className="
        flex flex-col items-center
        p-4
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg
      "
    >
      <span className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</span>
      <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</span>
    </div>
  );
}

const MEMBERS_PAGE_SIZE = 10;
const TEAMS_PAGE_SIZE = 10;

export function OrgaManageView({ orgaId }: OrgaManageViewProps) {
  const { t } = useTranslation("orgs");
  const { t: tCommon } = useTranslation("common");
  const { t: tMembers } = useTranslation("members");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displayedMemberCount, setDisplayedMemberCount] = useState(MEMBERS_PAGE_SIZE);
  const [displayedTeamCount, setDisplayedTeamCount] = useState(TEAMS_PAGE_SIZE);

  // Email domains state
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [isSavingDomains, setIsSavingDomains] = useState(false);
  const [domainsSaveStatus, setDomainsSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasDomainsChanged, setHasDomainsChanged] = useState(false);

  // Get organization data
  const orga = useQuery(api.orgas.functions.getOrgaById, { orgaId });

  // Get the organization's mission (from the top-level team's leader role)
  const orgaMission = useQuery(api.roles.functions.getOrgaMission, { orgaId });

  // Get current user's member data
  const { myMember, selectedOrga } = useSelectedOrga();

  // Focus navigation
  const { focusOnMember, focusOnTeam } = useFocus();

  // Get all members
  const { data: members, isLoading: membersLoading } = useMembers();

  // Get all teams and roles
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: roles } = useRoles();

  // Get counts from the orga list (cached data)
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts, {});
  const counts = useMemo(() => {
    const found = orgasWithCounts?.find((o) => o.orga._id === orgaId);
    return found?.counts ?? { members: 0, teams: 0, roles: 0 };
  }, [orgasWithCounts, orgaId]);

  // Compute role counts per team
  const roleCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (roles) {
      for (const role of roles) {
        const current = counts.get(role.teamId) || 0;
        counts.set(role.teamId, current + 1);
      }
    }
    return counts;
  }, [roles]);

  // Enrich teams with role counts
  const teamsWithRoleCounts: TeamListItemTeam[] = useMemo(() => {
    if (!teams) return [];
    return teams.map((team) => ({
      _id: team._id,
      name: team.name,
      roleCount: roleCountByTeam.get(team._id) || 0,
    }));
  }, [teams, roleCountByTeam]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearchQuery.trim()) return members;

    const query = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.firstname.toLowerCase().includes(query) ||
        m.surname.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [members, memberSearchQuery]);

  // Filter teams by search query
  const filteredTeams = useMemo(() => {
    if (!teamsWithRoleCounts.length) return [];
    if (!teamSearchQuery.trim()) return teamsWithRoleCounts;

    const query = teamSearchQuery.toLowerCase();
    return teamsWithRoleCounts.filter((team) =>
      team.name.toLowerCase().includes(query)
    );
  }, [teamsWithRoleCounts, teamSearchQuery]);

  // Reset member pagination when search query changes
  useEffect(() => {
    setDisplayedMemberCount(MEMBERS_PAGE_SIZE);
  }, [memberSearchQuery]);

  // Reset team pagination when search query changes
  useEffect(() => {
    setDisplayedTeamCount(TEAMS_PAGE_SIZE);
  }, [teamSearchQuery]);

  // Paginate the filtered members
  const displayedMembers = useMemo(() => {
    return filteredMembers.slice(0, displayedMemberCount);
  }, [filteredMembers, displayedMemberCount]);

  const totalMemberCount = filteredMembers.length;
  const hasMoreMembers = displayedMemberCount < totalMemberCount;

  const handleLoadMoreMembers = () => {
    setDisplayedMemberCount((prev) => prev + MEMBERS_PAGE_SIZE);
  };

  // Paginate the filtered teams
  const displayedTeams = useMemo(() => {
    return filteredTeams.slice(0, displayedTeamCount);
  }, [filteredTeams, displayedTeamCount]);

  const totalTeamCount = filteredTeams.length;
  const hasMoreTeams = displayedTeamCount < totalTeamCount;

  const handleLoadMoreTeams = () => {
    setDisplayedTeamCount((prev) => prev + TEAMS_PAGE_SIZE);
  };

  // Check if current user is the owner
  const isOwner = useMemo(() => {
    if (!orga || !myMember) return false;
    return orga.owner === myMember.personId;
  }, [orga, myMember]);

  // Check if user can delete the organization
  const canDelete = useMemo(() => {
    if (!orga || !myMember || !members) return false;
    // Must be owner and the only member
    return orga.owner === myMember.personId && members.length === 1;
  }, [orga, myMember, members]);

  // Mutations
  const deleteOrga = useMutation(api.orgas.functions.deleteOrganization);
  const updateOrga = useMutation(api.orgas.functions.updateOrga);

  // Initialize email domains from orga data
  useEffect(() => {
    if (orga) {
      setEmailDomains(orga.authorizedEmailDomains ?? []);
      setHasDomainsChanged(false);
    }
  }, [orga]);

  // Track changes to email domains
  const handleEmailDomainsChange = (newDomains: string[]) => {
    setEmailDomains(newDomains);
    // Check if changed from original
    const originalDomains = orga?.authorizedEmailDomains ?? [];
    const changed =
      newDomains.length !== originalDomains.length ||
      newDomains.some((d, i) => d !== originalDomains[i]);
    setHasDomainsChanged(changed);
    // Reset status when editing
    if (domainsSaveStatus !== "idle") {
      setDomainsSaveStatus("idle");
    }
  };

  const handleSaveDomains = async () => {
    if (!isOwner) return;
    setIsSavingDomains(true);
    setDomainsSaveStatus("idle");
    try {
      await updateOrga({
        orgaId,
        authorizedEmailDomains: emailDomains.length > 0 ? emailDomains : null,
      });
      setDomainsSaveStatus("success");
      setHasDomainsChanged(false);
      // Reset success message after a delay
      setTimeout(() => setDomainsSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to update email domains:", error);
      setDomainsSaveStatus("error");
    } finally {
      setIsSavingDomains(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await deleteOrga({ orgaId });
      // The store will handle navigation after deletion
    } catch (error) {
      console.error("Failed to delete organization:", error);
    }
  };

  if (!orga || !selectedOrga) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      {/* Content with consistent spacing */}
      <div className="pt-20 px-8 pb-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-swarm text-3xl font-bold text-dark dark:text-light">{orga.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("settingsAndDirectory")}
          </p>
        </header>

        {/* Mission reminder */}
        <MissionReminder mission={orgaMission} isLoading={orgaMission === undefined} />

        {/* Analytics section */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            {tCommon("overview")}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={counts.teams} label={t("metrics.teams")} color="green" />
            <StatCard value={counts.roles} label={t("metrics.roles")} color="purple" />
            <StatCard value={counts.members} label={t("metrics.members")} color="blue" />
          </div>
        </section>

        {/* Member directory */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              {tMembers("memberDirectory")}
            </h2>
            <input
              type="search"
              placeholder={tMembers("searchMembers")}
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="
                px-3 py-1.5 text-sm
                border border-gray-300 dark:border-gray-600
                rounded-lg
                bg-white dark:bg-gray-800
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840]
              "
            />
          </div>

          {/* Member list */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {membersLoading ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {tMembers("loadingMembers")}
              </div>
            ) : displayedMembers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {memberSearchQuery ? tMembers("noMembersMatchSearch") : tMembers("noMembersFound")}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedMembers.map((member) => (
                    <MemberListItem
                      key={member._id}
                      member={member}
                      isCurrentUser={myMember?._id === member._id}
                      onNavigate={() => focusOnMember(member._id)}
                    />
                  ))}
                </div>

                {/* Count indicator - only show if paginated */}
                {totalMemberCount > MEMBERS_PAGE_SIZE && (
                  <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-700">
                    {tMembers("showingCount", {
                      shown: displayedMembers.length,
                      total: totalMemberCount,
                    })}
                  </div>
                )}

                {/* Load more button */}
                {hasMoreMembers && (
                  <button
                    onClick={handleLoadMoreMembers}
                    className="
                      w-full py-3
                      text-sm text-gray-500 dark:text-gray-400
                      hover:text-gray-700 dark:hover:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                      transition-colors duration-75
                      border-t border-gray-200 dark:border-gray-700
                      focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
                    "
                  >
                    {tMembers("loadMore")}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Team directory */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              {t("teamDirectory")}
            </h2>
            <input
              type="search"
              placeholder={t("searchTeams")}
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="
                px-3 py-1.5 text-sm
                border border-gray-300 dark:border-gray-600
                rounded-lg
                bg-white dark:bg-gray-800
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840]
              "
            />
          </div>

          {/* Team list */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {teamsLoading ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t("loadingTeams")}
              </div>
            ) : displayedTeams.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {teamSearchQuery ? t("noTeamsMatchSearch") : t("noTeamsFound")}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedTeams.map((team) => (
                    <TeamListItem
                      key={team._id}
                      team={team}
                      onNavigate={() => focusOnTeam(team._id)}
                    />
                  ))}
                </div>

                {/* Count indicator - only show if paginated */}
                {totalTeamCount > TEAMS_PAGE_SIZE && (
                  <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-700">
                    {t("showingTeamsCount", {
                      shown: displayedTeams.length,
                      total: totalTeamCount,
                    })}
                  </div>
                )}

                {/* Load more button */}
                {hasMoreTeams && (
                  <button
                    onClick={handleLoadMoreTeams}
                    className="
                      w-full py-3
                      text-sm text-gray-500 dark:text-gray-400
                      hover:text-gray-700 dark:hover:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                      transition-colors duration-75
                      border-t border-gray-200 dark:border-gray-700
                      focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
                    "
                  >
                    {t("loadMoreTeams")}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Decision journal */}
        <DecisionJournal scope="orga" orgaId={orgaId} />

        {/* Email domain restrictions - only show to owner */}
        {isOwner && (
          <section className="mb-8">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light mb-2">
              {t("authorizedDomainsSectionTitle")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("authorizedDomainsSectionDescription")}
            </p>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <EmailDomainsInput
                domains={emailDomains}
                onChange={handleEmailDomainsChange}
                disabled={isSavingDomains}
              />

              {/* Save button and status */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => void handleSaveDomains()}
                  disabled={isSavingDomains || !hasDomainsChanged}
                  className="
                    px-4 py-2
                    bg-[#eac840] hover:bg-[#d4af37]
                    text-dark
                    font-medium
                    rounded-lg
                    transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-2
                  "
                >
                  {isSavingDomains ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("authorizedDomainsSaving")}
                    </>
                  ) : (
                    t("authorizedDomainsSave")
                  )}
                </button>

                {domainsSaveStatus === "success" && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    {t("authorizedDomainsSaveSuccess")}
                  </span>
                )}

                {domainsSaveStatus === "error" && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {t("authorizedDomainsSaveError")}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Danger zone - only show if user can delete */}
        {canDelete && (
          <section className="mt-12 pt-6 border-t border-red-200 dark:border-red-900/50">
            <h2 className="font-swarm text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              {t("dangerZone")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("deleteOrgWarning")}
            </p>

            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void handleDelete()}
                  className="
                    px-4 py-2
                    bg-red-600 hover:bg-red-700
                    text-white
                    rounded-lg
                    transition-colors
                    font-medium
                  "
                >
                  {t("confirmDeleteOrg")}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="
                    px-4 py-2
                    bg-gray-200 dark:bg-gray-700
                    hover:bg-gray-300 dark:hover:bg-gray-600
                    text-gray-700 dark:text-gray-300
                    rounded-lg
                    transition-colors
                  "
                >
                  {tCommon("cancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="
                  px-4 py-2
                  bg-red-600 hover:bg-red-700
                  text-white
                  rounded-lg
                  transition-colors
                "
              >
                {t("deleteOrganization")}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
