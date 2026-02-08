import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMembers } from "../../tools/orgaStore";
import { MissionReminder } from "../MissionReminder";
import { NotFound } from "../NotFound";

type RoleManageViewProps = {
  roleId: Id<"roles">;
  onZoomOut: () => void;
};

function getRoleTypeLabel(roleType: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "Leader";
    case "secretary":
      return "Secretary";
    case "referee":
      return "Referee";
  }
}

function getRoleTypeBadgeColor(roleType: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "#d4af37";
    case "secretary":
      return "#7dd3fc";
    case "referee":
      return "#c4b5fd";
  }
}

function BackToTeamButton({ teamName, onClick }: { teamName: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        absolute top-4 left-4 z-10
        flex items-center gap-2
        px-3 py-2
        bg-white dark:bg-gray-800
        border border-gray-300 dark:border-gray-700
        rounded-lg
        shadow-md hover:shadow-lg
        transition-shadow
        text-gray-700 dark:text-gray-200
        hover:text-dark dark:hover:text-light
        focus:outline-none focus:ring-2 focus:ring-[#eac840]
      "
      aria-label={`Return to ${teamName} team view`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="6" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="14" cy="12" r="2" />
      </svg>
      <span className="text-sm font-medium">{teamName}</span>
    </button>
  );
}

export function RoleManageView({ roleId, onZoomOut }: RoleManageViewProps) {
  // Fetch role data
  const role = useQuery(api.roles.functions.getRoleById, { roleId });

  // Fetch team for back button
  const team = useQuery(
    api.teams.functions.getTeamById,
    role ? { teamId: role.teamId } : "skip"
  );

  // Fetch current member
  const currentMember = useQuery(
    api.members.functions.getMemberById,
    role ? { memberId: role.memberId } : "skip"
  );

  // Get all members for the dropdown
  const { data: members } = useMembers();

  // Update role mutation
  const updateRole = useMutation(api.roles.functions.updateRole);

  // Local state for editing
  const [selectedMemberId, setSelectedMemberId] = useState<Id<"members"> | null>(null);
  const [roleName, setRoleName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [mission, setMission] = useState("");
  const [duties, setDuties] = useState<string[]>([]);
  const [newDuty, setNewDuty] = useState("");
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [isEditingDuties, setIsEditingDuties] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize local state when role loads
  useEffect(() => {
    if (role) {
      setSelectedMemberId(role.memberId);
      setRoleName(role.title);
      setMission(role.mission || "");
      setDuties(role.duties || []);
    }
  }, [role]);

  // Check if this is a linked role (can't be edited directly)
  const isLinkedRole = role?.linkedRoleId !== undefined;

  // Sort members alphabetically
  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) =>
      `${a.firstname} ${a.surname}`.localeCompare(`${b.firstname} ${b.surname}`)
    );
  }, [members]);

  const handleMemberChange = async (newMemberId: Id<"members">) => {
    if (isLinkedRole || !role || newMemberId === role.memberId) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateRole({ roleId, memberId: newMemberId });
      setSelectedMemberId(newMemberId);
      setSaveMessage({ type: "success", text: "Member updated" });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update" });
      setSelectedMemberId(role.memberId);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleSaveName = async () => {
    if (isLinkedRole || !role) return;
    const trimmedName = roleName.trim();
    if (!trimmedName || trimmedName === role.title) {
      setRoleName(role.title);
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateRole({ roleId, title: trimmedName });
      setIsEditingName(false);
      setSaveMessage({ type: "success", text: "Name updated" });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update" });
      setRoleName(role.title);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleSaveMission = async () => {
    if (isLinkedRole || !role) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateRole({ roleId, mission });
      setIsEditingMission(false);
      setSaveMessage({ type: "success", text: "Mission updated" });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleSaveDuties = async () => {
    if (isLinkedRole || !role) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateRole({ roleId, duties: duties.filter((d) => d.trim() !== "") });
      setIsEditingDuties(false);
      setSaveMessage({ type: "success", text: "Duties updated" });
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleAddDuty = () => {
    if (newDuty.trim()) {
      setDuties([...duties, newDuty.trim()]);
      setNewDuty("");
    }
  };

  const handleRemoveDuty = (index: number) => {
    setDuties(duties.filter((_, i) => i !== index));
  };

  const handleDutyChange = (index: number, value: string) => {
    const newDuties = [...duties];
    newDuties[index] = value;
    setDuties(newDuties);
  };

  // Loading state
  if (role === undefined) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not found
  if (role === null) {
    return <NotFound entityType="role" onNavigateBack={onZoomOut} />;
  }

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      {/* Back button */}
      <BackToTeamButton teamName={team?.name || "Team"} onClick={onZoomOut} />

      {/* Content */}
      <div className="pt-20 px-8 pb-8 max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          {isEditingName ? (
            <div className="flex items-center gap-3 mb-2">
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveName();
                  } else if (e.key === "Escape") {
                    setRoleName(role.title);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                aria-label="Role name"
                className="
                  font-swarm text-3xl font-bold
                  text-dark dark:text-light
                  bg-transparent
                  border-b-2 border-[#eac840]
                  focus:outline-none
                  w-full
                "
              />
              <button
                onClick={() => void handleSaveName()}
                disabled={isSaving}
                className="
                  px-3 py-1.5 text-sm
                  bg-[#eac840] hover:bg-[#d4af37]
                  text-dark
                  rounded-lg
                  transition-colors duration-75
                  disabled:opacity-50
                "
              >
                {isSaving ? "..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setRoleName(role.title);
                  setIsEditingName(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-swarm text-3xl font-bold text-dark dark:text-light">
                {role.title}
              </h1>
              {role.roleType && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getRoleTypeBadgeColor(role.roleType) + "30",
                    color: getRoleTypeBadgeColor(role.roleType),
                  }}
                >
                  {getRoleTypeLabel(role.roleType)}
                </span>
              )}
              {!isLinkedRole && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm text-[#d4af37] dark:text-[#eac840] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Role settings and configuration
          </p>

          {/* Linked role warning */}
          {isLinkedRole && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This role is synced from a parent team. To make changes, edit the source role in the parent team.
              </p>
            </div>
          )}
        </header>

        {/* Mission reminder */}
        <MissionReminder mission={role.mission} />

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

        {/* Assigned Member Section */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            Assigned Member
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {/* Current member display */}
            {currentMember && (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  {currentMember.pictureURL ? (
                    <img
                      src={currentMember.pictureURL}
                      alt={`${currentMember.firstname} ${currentMember.surname}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                      {currentMember.firstname.charAt(0)}
                      {currentMember.surname.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-dark dark:text-light">
                    {currentMember.firstname} {currentMember.surname}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentMember.email}
                  </p>
                </div>
              </div>
            )}

            {/* Member selector */}
            {!isLinkedRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reassign to another member
                </label>
                <select
                  value={selectedMemberId || ""}
                  onChange={(e) => void handleMemberChange(e.target.value as Id<"members">)}
                  disabled={isSaving || isLinkedRole}
                  className="
                    w-full px-3 py-2
                    border border-gray-300 dark:border-gray-600
                    rounded-lg
                    bg-white dark:bg-gray-800
                    text-dark dark:text-light
                    focus:outline-none focus:ring-2 focus:ring-[#eac840]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {sortedMembers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstname} {member.surname}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              Mission
            </h2>
            {!isLinkedRole && !isEditingMission && (
              <button
                onClick={() => setIsEditingMission(true)}
                className="text-sm text-[#d4af37] dark:text-[#eac840] hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {isEditingMission ? (
              <div>
                <textarea
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={4}
                  className="
                    w-full px-3 py-2
                    border border-gray-300 dark:border-gray-600
                    rounded-lg
                    bg-white dark:bg-gray-800
                    text-dark dark:text-light
                    focus:outline-none focus:ring-2 focus:ring-[#eac840]
                    resize-none
                  "
                  placeholder="Describe the mission of this role..."
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => {
                      setMission(role.mission || "");
                      setIsEditingMission(false);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSaveMission()}
                    disabled={isSaving}
                    className="
                      px-3 py-1.5 text-sm
                      bg-[#eac840] hover:bg-[#d4af37]
                      text-dark
                      rounded-lg
                      transition-colors
                      disabled:opacity-50
                    "
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {role.mission || "No mission defined"}
              </p>
            )}
          </div>
        </section>

        {/* Duties Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              Duties
            </h2>
            {!isLinkedRole && !isEditingDuties && (
              <button
                onClick={() => setIsEditingDuties(true)}
                className="text-sm text-[#d4af37] dark:text-[#eac840] hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {isEditingDuties ? (
              <div>
                <ul className="space-y-2 mb-4">
                  {duties.map((duty, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={duty}
                        onChange={(e) => handleDutyChange(index, e.target.value)}
                        className="
                          flex-1 px-3 py-2
                          border border-gray-300 dark:border-gray-600
                          rounded-lg
                          bg-white dark:bg-gray-800
                          text-dark dark:text-light
                          focus:outline-none focus:ring-2 focus:ring-[#eac840]
                        "
                      />
                      <button
                        onClick={() => handleRemoveDuty(index)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove duty"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Add new duty */}
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={newDuty}
                    onChange={(e) => setNewDuty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDuty();
                      }
                    }}
                    placeholder="Add a new duty..."
                    className="
                      flex-1 px-3 py-2
                      border border-gray-300 dark:border-gray-600
                      rounded-lg
                      bg-white dark:bg-gray-800
                      text-dark dark:text-light
                      focus:outline-none focus:ring-2 focus:ring-[#eac840]
                    "
                  />
                  <button
                    onClick={handleAddDuty}
                    disabled={!newDuty.trim()}
                    className="
                      px-3 py-2
                      bg-gray-200 dark:bg-gray-700
                      hover:bg-gray-300 dark:hover:bg-gray-600
                      text-gray-700 dark:text-gray-300
                      rounded-lg
                      transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    Add
                  </button>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setDuties(role.duties || []);
                      setIsEditingDuties(false);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSaveDuties()}
                    disabled={isSaving}
                    className="
                      px-3 py-1.5 text-sm
                      bg-[#eac840] hover:bg-[#d4af37]
                      text-dark
                      rounded-lg
                      transition-colors
                      disabled:opacity-50
                    "
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : duties.length > 0 ? (
              <ul className="space-y-2">
                {duties.map((duty, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-gray-400 mt-0.5">-</span>
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No duties defined</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
