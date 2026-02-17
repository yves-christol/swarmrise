import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DecisionJournal } from "../DecisionJournal";
import { CreateRoleModal } from "../CreateRoleModal";
import { TeamSettingsModal } from "../TeamSettingsModal";
import { MemberListItem, MemberListItemMember } from "../MemberListItem";
import { MissionReminder } from "../MissionReminder";
import { NotFound } from "../NotFound";
import { useFocus, useSelectedOrga } from "../../tools/orgaStore";
import { ContactInfo } from "../../utils/contacts";
import { getRoleTypeBadgeColor } from "../../utils/roleTypeColors";


type TeamManageViewProps = {
  teamId: Id<"teams">;
  onZoomOut: () => void;
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

export function TeamManageView({ teamId, onZoomOut }: TeamManageViewProps) {
  const { t } = useTranslation("teams");
  const { t: tMembers } = useTranslation("members");
  const { t: tCommon } = useTranslation("common");

  // Fetch team data
  const team = useQuery(api.teams.functions.getTeamById, { teamId });

  // Fetch roles for this team
  const roles = useQuery(api.roles.functions.listRolesInTeam, { teamId });

  // Fetch the team's mission (from the leader role)
  const teamMission = useQuery(api.roles.functions.getTeamMission, { teamId });

  // Fetch members
  const members = useQuery(
    api.members.functions.listMembers,
    team ? { orgaId: team.orgaId } : "skip"
  );

  // Find the leader role to get parent team connection
  const leaderRole = roles?.find((r) => r.roleType === "leader");
  const parentTeamId = leaderRole?.parentTeamId;

  // Fetch parent team if this team has one
  const parentTeam = useQuery(
    api.teams.functions.getTeamById,
    parentTeamId ? { teamId: parentTeamId } : "skip"
  );

  // Fetch linked leader roles pointing to roles in this team (child teams)
  const linkedLeaderRoles = useQuery(
    api.roles.functions.getLinkedLeaderRolesForTeam,
    { teamId }
  );

  // Update team mutation
  const updateTeam = useMutation(api.teams.functions.updateTeam);

  // Local state for editing
  const [teamName, setTeamName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize local state when team loads
  useEffect(() => {
    if (team) {
      setTeamName(team.name);
    }
  }, [team]);

  // Get current user's member data and focus navigation
  const { myMember } = useSelectedOrga();
  const { focusOnMember, focusOnRole } = useFocus();

  // Create member lookup map (includes contactInfos for MemberListItem)
  const memberMap = useMemo(() => {
    const map = new Map<string, MemberListItemMember>();
    members?.forEach((m) => map.set(m._id, {
      _id: m._id,
      firstname: m.firstname,
      surname: m.surname,
      pictureURL: m.pictureURL,
      email: m.email,
      contactInfos: (m.contactInfos ?? []) as ContactInfo[],
    }));
    return map;
  }, [members]);

  // Calculate unique members in this team
  const uniqueMembers = useMemo(() => {
    if (!roles) return [];
    const memberIds = new Set(roles.map((r) => r.memberId));
    return Array.from(memberIds)
      .map((id) => memberMap.get(id))
      .filter((m): m is MemberListItemMember => m !== undefined);
  }, [roles, memberMap]);

  // Sort roles: leader first, then secretary, then referee, then others
  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    const order = { leader: 0, secretary: 1, referee: 2 };
    return [...roles].sort((a, b) => {
      const aOrder = a.roleType ? order[a.roleType] : 3;
      const bOrder = b.roleType ? order[b.roleType] : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
  }, [roles]);

  const handleSaveName = async () => {
    if (!team || teamName.trim() === "" || teamName === team.name) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateTeam({ teamId, name: teamName.trim() });
      setIsEditingName(false);
      setSaveMessage({ type: "success", text: t("manage.teamNameUpdated") });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : t("manage.failedToUpdate") });
      setTeamName(team.name);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Loading state
  if (team === undefined) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{tCommon("loading")}</div>
      </div>
    );
  }

  // Not found
  if (team === null) {
    return <NotFound entityType="team" onNavigateBack={onZoomOut} />;
  }

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      {/* Content */}
      <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          {isEditingName ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveName();
                  } else if (e.key === "Escape") {
                    setTeamName(team.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="
                  font-title text-3xl font-bold
                  text-dark dark:text-light
                  bg-transparent
                  border-b-2 border-highlight
                  focus:outline-none
                  w-full
                "
              />
              <button
                onClick={() => void handleSaveName()}
                disabled={isSaving}
                className="
                  px-3 py-1.5 text-sm
                  bg-highlight hover:bg-highlight-hover
                  text-dark
                  rounded-lg
                  transition-colors
                  disabled:opacity-50
                "
              >
                {isSaving ? "..." : t("manage.save")}
              </button>
              <button
                onClick={() => {
                  setTeamName(team.name);
                  setIsEditingName(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {t("manage.cancel")}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-dark dark:text-light">
                  {team.name}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm text-highlight-hover dark:text-highlight hover:underline"
                >
                  {t("manage.edit")}
                </button>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
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
                aria-label={t("manage.settings")}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>{t("manage.settings")}</span>
              </button>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("manage.teamSettingsAndStructure")}
          </p>
        </header>

        {/* Save message */}
        {saveMessage && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm ${
              saveMessage.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Overview section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
            {t("manage.overview")}
          </h2>
          {/* Mission reminder */}
          <MissionReminder mission={teamMission} isLoading={teamMission === undefined} />
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={roles?.length || 0} label={t("manage.rolesCount")} color="purple" />
            <StatCard value={uniqueMembers.length} label={t("manage.membersCount")} color="blue" />
          </div>
        </section>

        {/* Team Connections */}
        {(parentTeam || (linkedLeaderRoles && linkedLeaderRoles.length > 0)) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
              {t("manage.teamConnections")}
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              {/* Parent team */}
              {parentTeam && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t("manage.parentTeam")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                      <path d="M8 12V4M8 4L4 8M8 4L12 8" />
                    </svg>
                    <span className="font-medium text-dark dark:text-light">{parentTeam.name}</span>
                  </div>
                </div>
              )}

              {/* Child teams */}
              {linkedLeaderRoles && linkedLeaderRoles.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t("manage.childTeams", { count: linkedLeaderRoles.length })}
                  </span>
                  <p className="mt-1 text-dark dark:text-light">
                    {linkedLeaderRoles.map((link, index) => (
                      <span key={link.linkedRole._id}>
                        {link.daughterTeam.name}
                        {index < linkedLeaderRoles.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Roles Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark dark:text-light">
              {t("manage.roles")}
            </h2>
            <button
              onClick={() => setIsCreateRoleModalOpen(true)}
              className="
                flex items-center gap-1.5
                px-3 py-1.5 text-sm
                bg-highlight hover:bg-highlight-hover
                text-dark
                rounded-lg
                transition-colors duration-75
              "
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M7 1v12M1 7h12" />
              </svg>
              {t("manage.createRole")}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {!roles || roles.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t("manage.noRolesInTeam")}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedRoles.map((role) => {
                  const member = memberMap.get(role.memberId);
                  return (
                    <button
                      key={role._id}
                      onClick={() => focusOnRole(role._id, teamId)}
                      className="
                        group
                        w-full flex items-center justify-between
                        px-4 py-3
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                        transition-colors duration-75
                        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
                        text-left
                      "
                      aria-label={t("manage.viewRoleDetails", { title: role.title, type: role.roleType ? `, ${tMembers(`roleTypes.${role.roleType}`)}` : "" })}
                    >
                      <div className="flex items-center gap-3">
                        {/* Role type badge */}
                        {role.roleType && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) }}
                            title={tMembers(`roleTypes.${role.roleType}`)}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-dark dark:text-light">
                              {role.title}
                            </span>
                            {role.roleType && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: getRoleTypeBadgeColor(role.roleType) + "20",
                                  color: getRoleTypeBadgeColor(role.roleType),
                                }}
                              >
                                {tMembers(`roleTypes.${role.roleType}`)}
                              </span>
                            )}
                            {role.linkedRoleId && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                {t("manage.synced")}
                              </span>
                            )}
                          </div>
                          {role.mission && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md mt-0.5">
                              {role.mission}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: member info + chevron */}
                      <div className="flex items-center gap-3">
                        {/* Assigned member */}
                        {member && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                              {member.pictureURL ? (
                                <img
                                  src={member.pictureURL}
                                  alt={`${member.firstname} ${member.surname}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-medium">
                                  {member.firstname.charAt(0)}
                                  {member.surname.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {member.firstname} {member.surname}
                            </span>
                          </div>
                        )}

                        {/* Navigation chevron - appears on hover */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="
                            text-gray-400 dark:text-gray-500
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-75
                            flex-shrink-0
                          "
                          aria-hidden="true"
                        >
                          <path d="M6 4l4 4-4 4" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Team Members Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
            {t("manage.teamMembers")}
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {uniqueMembers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t("manage.noMembersInTeam")}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {uniqueMembers.map((member) => (
                  <MemberListItem
                    key={member._id}
                    member={member}
                    isCurrentUser={myMember?._id === member._id}
                    onNavigate={() => focusOnMember(member._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Decision journal */}
        <DecisionJournal scope="team" orgaId={team.orgaId} teamId={team._id} />
      </div>

      <CreateRoleModal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        teamId={teamId}
      />
      <TeamSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        teamId={teamId}
      />
    </div>
  );
}
