import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DecisionJournal } from "../DecisionJournal";
import { CreateRoleModal } from "../CreateRoleModal";
import { MemberListItem, MemberListItemMember } from "../MemberListItem";
import { MissionReminder } from "../MissionReminder";
import { NotFound } from "../NotFound";
import { useFocus, useSelectedOrga } from "../../tools/orgaStore";
import { ContactInfo } from "../../utils/contacts";

type RGB = { r: number; g: number; b: number };

const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};


type TeamManageViewProps = {
  teamId: Id<"teams">;
  onZoomOut: () => void;
};

function getRoleTypeBadgeColor(roleType: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "var(--org-highlight-hover, #d4af37)";
    case "secretary":
      return "#7dd3fc";
    case "referee":
      return "#c4b5fd";
  }
}

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
  const [colorLight, setColorLight] = useState<RGB | null>(null);
  const [colorDark, setColorDark] = useState<RGB | null>(null);
  const [isEditingColor, setIsEditingColor] = useState(false);

  // Initialize local state when team loads
  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setColorLight(team.colorLight ?? null);
      setColorDark(team.colorDark ?? null);
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

  const handleSaveColor = async () => {
    if (!team) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateTeam({
        teamId,
        colorLight: colorLight ?? null,
        colorDark: colorDark ?? null,
      });
      setIsEditingColor(false);
      setSaveMessage({ type: "success", text: t("manage.teamColorUpdated") });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : t("manage.failedToUpdate") });
      setColorLight(team.colorLight ?? null);
      setColorDark(team.colorDark ?? null);
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
                  font-swarm text-3xl font-bold
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
            <div className="flex items-center gap-3">
              {(colorLight || colorDark) && (
                <span
                  className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: colorLight ? rgbToHex(colorLight) : colorDark ? rgbToHex(colorDark) : undefined }}
                />
              )}
              <h1 className="font-swarm text-3xl font-bold text-dark dark:text-light">
                {team.name}
              </h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-sm text-highlight-hover dark:text-highlight hover:underline"
              >
                {t("manage.edit")}
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
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            {t("manage.overview")}
          </h2>
          {/* Mission reminder */}
          <MissionReminder mission={teamMission} isLoading={teamMission === undefined} />
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={roles?.length || 0} label={t("manage.rolesCount")} color="purple" />
            <StatCard value={uniqueMembers.length} label={t("manage.membersCount")} color="blue" />
          </div>
        </section>

        {/* Team Colour */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              {t("manage.teamColor")}
            </h2>
            {!isEditingColor && (
              <button
                onClick={() => setIsEditingColor(true)}
                className="text-sm text-highlight-hover dark:text-highlight hover:underline"
              >
                {t("manage.edit")}
              </button>
            )}
          </div>
          {isEditingColor ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("manage.teamColorHint")}
              </p>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="team-color-light" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("manage.lightMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="team-color-light"
                      type="color"
                      value={colorLight ? rgbToHex(colorLight) : "#888888"}
                      onChange={(e) => setColorLight(hexToRgb(e.target.value))}
                      disabled={isSaving}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {colorLight && (
                      <button
                        type="button"
                        onClick={() => setColorLight(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("manage.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="team-color-dark" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("manage.darkMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="team-color-dark"
                      type="color"
                      value={colorDark ? rgbToHex(colorDark) : "#888888"}
                      onChange={(e) => setColorDark(hexToRgb(e.target.value))}
                      disabled={isSaving}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {colorDark && (
                      <button
                        type="button"
                        onClick={() => setColorDark(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("manage.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleSaveColor()}
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
                    setColorLight(team.colorLight ?? null);
                    setColorDark(team.colorDark ?? null);
                    setIsEditingColor(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {t("manage.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {colorLight || colorDark ? (
                <div className="flex items-center gap-4">
                  {colorLight && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: rgbToHex(colorLight) }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t("manage.lightMode")}</span>
                    </div>
                  )}
                  {colorDark && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: rgbToHex(colorDark) }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t("manage.darkMode")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("manage.teamColorHint")}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Team Connections */}
        {(parentTeam || (linkedLeaderRoles && linkedLeaderRoles.length > 0)) && (
          <section className="mb-8">
            <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
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
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
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
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
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
    </div>
  );
}
