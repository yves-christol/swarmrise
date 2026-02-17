import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga, useMembers, useTeams, useRoles, useFocus } from "../../tools/orgaStore";
import { DecisionJournal } from "../DecisionJournal";
import { InvitationModal } from "../InvitationModal";
import { MemberListItem } from "../MemberListItem";
import { TeamListItem, TeamListItemTeam } from "../TeamListItem";
import { MissionReminder } from "../MissionReminder";
import { OrgaSettingsModal } from "../OrgaSettingsModal";

type OrgaManageViewProps = {
  orgaId: Id<"orgas">;
};

function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div
      className="
        flex flex-col items-center
        p-2.5
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg
      "
    >
      <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

const MEMBERS_PAGE_SIZE = 10;
const TEAMS_PAGE_SIZE = 10;

export function OrgaManageView({ orgaId }: OrgaManageViewProps) {
  const { t } = useTranslation("orgs");
  const { t: tCommon } = useTranslation("common");
  const { t: tMembers } = useTranslation("members");
  const { t: tInvitations } = useTranslation("invitations");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [displayedMemberCount, setDisplayedMemberCount] = useState(MEMBERS_PAGE_SIZE);
  const [displayedTeamCount, setDisplayedTeamCount] = useState(TEAMS_PAGE_SIZE);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);

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
      <div className="pt-8 px-8 pb-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-dark dark:text-light">{orga.name}</h1>
            {isOwner && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="
                  flex items-center gap-2
                  px-3 py-1.5
                  text-sm
                  text-gray-600 dark:text-gray-400
                  hover:text-dark dark:hover:text-light
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  rounded-md
                  transition-colors duration-75
                  focus:outline-none focus:ring-2 focus:ring-highlight
                "
                aria-label={t("settings.ariaLabel")}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>{t("settings.button")}</span>
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("settingsAndDirectory")}
          </p>
        </header>

        {/* Overview section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
            {tCommon("overview")}
          </h2>
          {/* Mission reminder */}
          <MissionReminder mission={orgaMission} isLoading={orgaMission === undefined} />
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={counts.teams} label={t("metrics.teams")} color="green" />
            <StatCard value={counts.roles} label={t("metrics.roles")} color="purple" />
            <StatCard value={counts.members} label={t("metrics.members")} color="blue" />
          </div>
        </section>

        {/* Member directory */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark dark:text-light">
              {tMembers("memberDirectory")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvitationModal(true)}
                className="
                  flex items-center gap-1.5
                  px-3 py-1.5
                  text-sm
                  text-gray-600 dark:text-gray-400
                  hover:text-dark dark:hover:text-light
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  rounded-md
                  transition-colors duration-75
                  focus:outline-none focus:ring-2 focus:ring-highlight
                "
                aria-label={tInvitations("sendInvitation")}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                  <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                </svg>
                <span>{tInvitations("invitations")}</span>
              </button>
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
                  focus:outline-none focus:ring-2 focus:ring-highlight
                "
              />
            </div>
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
            <h2 className="text-lg font-semibold text-dark dark:text-light">
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
                focus:outline-none focus:ring-2 focus:ring-highlight
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
      </div>

      {/* Settings modal - only for owner */}
      {isOwner && (
        <OrgaSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          orgaId={orgaId}
          canDelete={canDelete}
        />
      )}

      {/* Invitation modal */}
      <InvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        orgaId={orgaId}
      />
    </div>
  );
}
