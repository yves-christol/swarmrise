import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMembers, useFocus } from "../../tools/orgaStore";
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

function CreateTeamConfirmModal({
  roleName,
  isCreating,
  error,
  onConfirm,
  onCancel,
  modalRef,
}: {
  roleName: string;
  isCreating: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isCreating]);

  // Focus trap
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [modalRef]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isCreating) {
      onCancel();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-150
        ${isVisible ? "bg-black/50" : "bg-black/0"}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-team-confirm-title"
        className={`w-full max-w-md mx-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="create-team-confirm-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("roleManage.createTeamConfirmTitle", { roleName })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("roleManage.createTeamDescription")}
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#d4af37] dark:text-[#eac840] mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet1", { roleName })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#d4af37] dark:text-[#eac840] mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#d4af37] dark:text-[#eac840] mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet3")}</span>
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("roleManage.createTeamDecisionNote")}
          </p>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isCreating}
              aria-label={t("roleManage.createTeamConfirmTitle", { roleName })}
              className="
                px-5 py-2 text-sm font-bold rounded-md
                bg-[#eac840] hover:bg-[#d4af37] text-dark
                transition-colors duration-75
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
              "
            >
              {isCreating ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("roleManage.creatingTeam")}
                </>
              ) : (
                t("roleManage.createTeamSubmit")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoleManageView({ roleId, onZoomOut }: RoleManageViewProps) {
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");

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

  // Check if this role already has a child team
  const hasLinkedChild = useQuery(
    api.roles.functions.hasLinkedChildRole,
    role && !role.roleType && !role.linkedRoleId ? { roleId } : "skip"
  );

  // Get all members for the dropdown
  const { data: members } = useMembers();

  // Navigation
  const { focusOnTeam } = useFocus();

  // Mutations
  const updateRole = useMutation(api.roles.functions.updateRole);
  const deleteRoleMutation = useMutation(api.roles.functions.deleteRole);
  const createTeamMutation = useMutation(api.teams.functions.createTeam);

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateTeamConfirm, setShowCreateTeamConfirm] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  const createTeamModalRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteRole = async () => {
    setIsDeleting(true);
    try {
      await deleteRoleMutation({ roleId });
      onZoomOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roleManage.failedToDelete");
      setSaveMessage({ type: "error", text: message });
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!role) return;
    setIsCreatingTeam(true);
    setCreateTeamError(null);
    try {
      const teamId = await createTeamMutation({
        orgaId: role.orgaId,
        name: role.title,
        roleId: roleId,
        parentTeamId: role.teamId,
      });
      setShowCreateTeamConfirm(false);
      setSaveMessage({ type: "success", text: t("roleManage.teamCreated") });
      setTimeout(() => {
        focusOnTeam(teamId);
      }, 500);
    } catch (error) {
      setCreateTeamError(error instanceof Error ? error.message : t("roleManage.createTeamFailed"));
    } finally {
      setIsCreatingTeam(false);
    }
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
          {/* Linked role warning */}
          {isLinkedRole && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This role is synced from a parent team. To make changes, edit the source role in the parent team.
              </p>
            </div>
          )}
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

        {/* Actions Section - only for regular roles that can become teams and don't already have one */}
        {!role.roleType && !isLinkedRole && hasLinkedChild === false && (
          <section className="mb-8">
            <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
              {t("roleManage.actions")}
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t("roleManage.createTeamDescription")}
              </p>
              <button
                onClick={() => setShowCreateTeamConfirm(true)}
                className="
                  flex items-center gap-2
                  px-4 py-2 text-sm font-medium
                  border border-[#d4af37] dark:border-[#eac840]
                  text-[#d4af37] dark:text-[#eac840]
                  hover:bg-[#eac840]/10 dark:hover:bg-[#eac840]/10
                  rounded-lg
                  transition-colors duration-75
                  focus:outline-none focus:ring-2 focus:ring-[#eac840]
                "
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                     stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v6M5 8h6" />
                </svg>
                {t("roleManage.createTeam")}
              </button>
            </div>
          </section>
        )}

        {/* Danger Zone - only for non-mandatory, non-linked roles */}
        {!role.roleType && !isLinkedRole && (
          <section className="mb-8 pt-6 border-t border-red-200 dark:border-red-900/50">
            <h2 className="font-swarm text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              {t("roleManage.dangerZone")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t("roleManage.deleteRoleWarning")}
            </p>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void handleDeleteRole()}
                  disabled={isDeleting}
                  className="
                    px-4 py-2 text-sm font-medium
                    bg-red-600 hover:bg-red-700
                    text-white
                    rounded-lg
                    transition-colors
                    disabled:opacity-50
                    flex items-center gap-2
                  "
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t("roleManage.deleting")}
                    </>
                  ) : (
                    t("roleManage.confirmDeleteRole")
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="
                    px-4 py-2 text-sm
                    bg-gray-200 dark:bg-gray-700
                    hover:bg-gray-300 dark:hover:bg-gray-600
                    text-gray-700 dark:text-gray-300
                    rounded-lg
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  {tCommon("cancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="
                  px-4 py-2 text-sm
                  border border-red-600 dark:border-red-400
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  rounded-lg
                  transition-colors
                "
              >
                {t("roleManage.deleteRole")}
              </button>
            )}
          </section>
        )}
      </div>

      {/* Create Team Confirmation Modal */}
      {showCreateTeamConfirm && createPortal(
        <CreateTeamConfirmModal
          roleName={role.title}
          isCreating={isCreatingTeam}
          error={createTeamError}
          onConfirm={() => void handleCreateTeam()}
          onCancel={() => {
            setShowCreateTeamConfirm(false);
            setCreateTeamError(null);
          }}
          modalRef={createTeamModalRef}
        />,
        document.body
      )}
    </div>
  );
}
