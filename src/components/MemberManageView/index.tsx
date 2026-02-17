import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga, useFocus } from "../../tools/orgaStore";
import { useOrgaStore } from "../../tools/orgaStore";
import { NotFound } from "../NotFound";

type ContactInfo = {
  type: string;
  value: string;
};

const CONTACT_TYPES = [
  "LinkedIn",
  "Email",
  "Mobile",
  "Website",
  "Twitter",
  "Whatsapp",
  "Facebook",
  "Instagram",
  "Address",
] as const;

type MemberManageViewProps = {
  memberId: Id<"members">;
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

function getRoleTypeKey(roleType: "leader" | "secretary" | "referee") {
  return `roleTypes.${roleType}` as const;
}

function getContactIcon(type: string) {
  switch (type) {
    case "LinkedIn":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#0A66C2]">
          <path d="M13.6 1H2.4C1.6 1 1 1.6 1 2.4v11.2c0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4V2.4c0-.8-.6-1.4-1.4-1.4zM5.2 13H3V6.2h2.2V13zM4.1 5.2c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3zM13 13h-2.2V9.7c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.8V13H6.2V6.2h2.1v.9h.1c.3-.6 1-1.2 2.1-1.2 2.2 0 2.6 1.5 2.6 3.4V13z"/>
        </svg>
      );
    case "Email":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <rect x="1" y="3" width="14" height="10" rx="2" />
          <path d="M1 5l7 4 7-4" />
        </svg>
      );
    case "Facebook":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#1877F2]">
          <path d="M15 8a7 7 0 10-8.1 6.9v-4.9H5.1V8h1.8V6.4c0-1.8 1-2.7 2.6-2.7.8 0 1.6.1 1.6.1v1.7h-.9c-.9 0-1.2.6-1.2 1.1V8h2l-.3 2h-1.7v4.9A7 7 0 0015 8z"/>
        </svg>
      );
    case "Instagram":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#E4405F]">
          <path d="M8 1.4c2.1 0 2.4 0 3.2.1.8 0 1.2.2 1.5.3.4.1.6.3.9.6.3.3.4.5.6.9.1.3.2.7.3 1.5 0 .8.1 1.1.1 3.2s0 2.4-.1 3.2c0 .8-.2 1.2-.3 1.5-.1.4-.3.6-.6.9-.3.3-.5.4-.9.6-.3.1-.7.2-1.5.3-.8 0-1.1.1-3.2.1s-2.4 0-3.2-.1c-.8 0-1.2-.2-1.5-.3-.4-.1-.6-.3-.9-.6-.3-.3-.4-.5-.6-.9-.1-.3-.2-.7-.3-1.5 0-.8-.1-1.1-.1-3.2s0-2.4.1-3.2c0-.8.2-1.2.3-1.5.1-.4.3-.6.6-.9.3-.3.5-.4.9-.6.3-.1.7-.2 1.5-.3.8 0 1.1-.1 3.2-.1M8 0C5.8 0 5.5 0 4.7.1c-.8 0-1.4.2-1.9.4-.5.2-1 .5-1.4.9-.4.4-.7.9-.9 1.4-.2.5-.3 1.1-.4 1.9C0 5.5 0 5.8 0 8s0 2.5.1 3.3c0 .8.2 1.4.4 1.9.2.5.5 1 .9 1.4.4.4.9.7 1.4.9.5.2 1.1.3 1.9.4.8 0 1.1.1 3.3.1s2.5 0 3.3-.1c.8 0 1.4-.2 1.9-.4.5-.2 1-.5 1.4-.9.4-.4.7-.9.9-1.4.2-.5.3-1.1.4-1.9 0-.8.1-1.1.1-3.3s0-2.5-.1-3.3c0-.8-.2-1.4-.4-1.9-.2-.5-.5-1-.9-1.4-.4-.4-.9-.7-1.4-.9-.5-.2-1.1-.3-1.9-.4C10.5 0 10.2 0 8 0zm0 3.9a4.1 4.1 0 100 8.2 4.1 4.1 0 000-8.2zm0 6.8a2.7 2.7 0 110-5.4 2.7 2.7 0 010 5.4zm5.2-7a1 1 0 11-2 0 1 1 0 012 0z"/>
        </svg>
      );
    case "Whatsapp":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#25D366]">
          <path d="M13.6 2.3A7.5 7.5 0 001 11.4L0 16l4.7-1.2a7.5 7.5 0 003.6.9A7.5 7.5 0 0016 8.2a7.5 7.5 0 00-2.4-5.9zM8.3 14a6.2 6.2 0 01-3.2-.9l-.2-.1-2.4.6.7-2.4-.2-.2a6.2 6.2 0 119.5-5.3 6.2 6.2 0 01-4.2 8.3zm3.4-4.6c-.2-.1-1.1-.6-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-.9-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.3c.1-.1.1-.2.2-.3 0-.1 0-.2 0-.3l-.6-1.4c-.2-.4-.3-.3-.5-.4h-.4c-.1 0-.4 0-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2z"/>
        </svg>
      );
    case "Mobile":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <rect x="4" y="1" width="8" height="14" rx="2" />
          <line x1="7" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "Website":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <circle cx="8" cy="8" r="6" />
          <ellipse cx="8" cy="8" rx="2.5" ry="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      );
    case "Twitter":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-800 dark:text-gray-200">
          <path d="M9.5 6.8L14.2 1H13L9 5.8 5.7 1H1l5 7.3L1 15h1.3l4.4-5.1 3.5 5.1H15L9.5 6.8zm-1.5 1.8l-.5-.7L3.2 2h1.8l3.3 4.7.5.7 4.2 6H11L8 8.6z"/>
        </svg>
      );
    case "Address":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" />
          <circle cx="8" cy="6" r="2" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
  }
}

function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function getContactLink(type: string, value: string): string | null {
  let url: string;
  switch (type) {
    case "LinkedIn":
      url = value.startsWith("http") ? value : `https://linkedin.com/in/${value}`;
      break;
    case "Email":
      url = `mailto:${value}`;
      break;
    case "Facebook":
      url = value.startsWith("http") ? value : `https://facebook.com/${value}`;
      break;
    case "Instagram":
      url = value.startsWith("http") ? value : `https://instagram.com/${value}`;
      break;
    case "Whatsapp":
      url = `https://wa.me/${value.replace(/\D/g, "")}`;
      break;
    case "Mobile":
      url = `tel:${value}`;
      break;
    case "Website":
      url = value.startsWith("http") ? value : `https://${value}`;
      break;
    case "Twitter":
      url = value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`;
      break;
    default:
      return null;
  }
  return sanitizeUrl(url);
}

function getContactPlaceholderKey(type: string) {
  const keyMap = {
    LinkedIn: "contactPlaceholders.linkedin",
    Email: "contactPlaceholders.email",
    Mobile: "contactPlaceholders.mobile",
    Website: "contactPlaceholders.website",
    Twitter: "contactPlaceholders.twitter",
    Whatsapp: "contactPlaceholders.whatsapp",
    Facebook: "contactPlaceholders.facebook",
    Instagram: "contactPlaceholders.instagram",
    Address: "contactPlaceholders.address",
  } as const;
  return (keyMap[type as keyof typeof keyMap] ?? "contactPlaceholders.default") as any;
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

function LeaveOrgConfirmModal({
  orgName,
  rolesCount,
  isLeaving,
  error,
  onConfirm,
  onCancel,
  modalRef,
}: {
  orgName: string;
  rolesCount: number;
  isLeaving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t: tMembers } = useTranslation("members");
  const { t: tCommon } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLeaving) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isLeaving]);

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
    if (e.target === e.currentTarget && !isLeaving) {
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
        aria-labelledby="leave-org-confirm-title"
        className={`w-full max-w-md mx-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="leave-org-confirm-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {tMembers("leaveOrgConfirmTitle", { orgName })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
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
            {tMembers("leaveOrgConfirmDescription")}
          </p>

          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet1", { count: rolesCount })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet3")}</span>
            </li>
          </ul>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tMembers("leaveOrgDecisionNote")}
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
              disabled={isLeaving}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLeaving}
              className="
                px-5 py-2 text-sm font-bold rounded-md
                bg-red-600 hover:bg-red-700 text-white
                transition-colors duration-75
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
              "
            >
              {isLeaving ? (
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
                  {tMembers("leaving")}
                </>
              ) : (
                tMembers("confirmLeaveOrg")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemberManageView({ memberId, onZoomOut }: MemberManageViewProps) {
  const { t } = useTranslation("common");
  const { t: tMembers } = useTranslation("members");
  const { t: tTeams } = useTranslation("teams");

  // Fetch member data
  const member = useQuery(api.members.functions.getMemberById, { memberId });

  // Fetch member's roles
  const roles = useQuery(api.members.functions.listMemberRoles, { memberId });

  // Fetch member's teams
  const teams = useQuery(api.members.functions.listMemberTeams, { memberId });

  // Get current user's member to check if viewing self
  const { myMember, selectedOrgaId, selectedOrga } = useSelectedOrga();
  const isCurrentUser = myMember?._id === memberId;

  // Navigation hooks
  const { focusOnTeam, focusOnRole } = useFocus();

  // Contact info editing state
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [editedContacts, setEditedContacts] = useState<ContactInfo[]>([]);
  const [newContactType, setNewContactType] = useState<string>("LinkedIn");
  const [newContactValue, setNewContactValue] = useState("");
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [contactSaveMessage, setContactSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Use ref to always have current contacts value in async handlers
  const editedContactsRef = useRef<ContactInfo[]>([]);
  editedContactsRef.current = editedContacts;

  const updateContactInfos = useMutation(api.members.functions.updateMyContactInfos);

  // Leave organization
  const { selectOrga } = useOrgaStore();
  const canLeaveResult = useQuery(
    api.members.functions.canLeaveOrganization,
    isCurrentUser && selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  );
  const leaveOrganizationMutation = useMutation(api.members.functions.leaveOrganization);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const leaveModalRef = useRef<HTMLDivElement | null>(null);

  const canLeave = canLeaveResult?.canLeave ?? false;
  const leaveDisabledReason = canLeaveResult?.reason;

  const handleLeaveOrganization = async () => {
    if (!selectedOrgaId) return;
    const orgaId = selectedOrgaId;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      // Navigate away immediately to prevent stale query errors
      // (deleted member causes listMemberRoles/listMemberTeams to throw)
      selectOrga(null);
      await leaveOrganizationMutation({ orgaId });
    } catch (error) {
      // If mutation fails, re-select the org so user can retry
      selectOrga(orgaId);
      setLeaveError(
        error instanceof Error ? error.message : tMembers("leaveOrgFailed")
      );
      setIsLeaving(false);
    }
  };

  const handleStartEditingContacts = () => {
    const contacts = member?.contactInfos
      ? member.contactInfos.map((c) => ({ type: c.type, value: c.value }))
      : [];
    setEditedContacts(contacts);
    editedContactsRef.current = contacts;
    setNewContactType("LinkedIn");
    setNewContactValue("");
    setIsEditingContacts(true);
  };

  const handleCancelEditingContacts = () => {
    setIsEditingContacts(false);
    setNewContactValue("");
  };

  const handleAddContact = () => {
    if (!newContactValue.trim()) return;
    setEditedContacts((prev) => [...prev, { type: newContactType, value: newContactValue.trim() }]);
    setNewContactValue("");
  };

  const handleRemoveContact = (index: number) => {
    setEditedContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContactTypeChange = (index: number, newType: string) => {
    setEditedContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], type: newType };
      return updated;
    });
  };

  const handleContactValueChange = (index: number, newValue: string) => {
    setEditedContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: newValue };
      return updated;
    });
  };

  const handleSaveContacts = async () => {
    if (!selectedOrgaId) return;
    setIsSavingContacts(true);
    setContactSaveMessage(null);
    try {
      // Include any pending new contact that hasn't been explicitly added yet
      let contacts = editedContactsRef.current;
      if (newContactValue.trim()) {
        contacts = [...contacts, { type: newContactType, value: newContactValue.trim() }];
        setNewContactValue("");
      }
      const contactsToSave = contacts.filter((c) => c.value && c.value.trim());
      await updateContactInfos({
        orgaId: selectedOrgaId,
        contactInfos: contactsToSave as { type: typeof CONTACT_TYPES[number]; value: string }[],
      });
      setIsEditingContacts(false);
      setContactSaveMessage({ type: "success", text: tMembers("contactInfoSaved") });
      setTimeout(() => setContactSaveMessage(null), 3000);
    } catch (error) {
      setContactSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : tMembers("contactInfoSaveFailed"),
      });
    } finally {
      setIsSavingContacts(false);
    }
  };

  // Filter out replica roles (linked roles) - only show master roles
  // Replica roles have linkedRoleId set, pointing to their master in the parent team
  const masterRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((role) => !role.linkedRoleId);
  }, [roles]);

  // Build a map from master role ID -> child team info
  // This maps master roles to the child teams they lead (via their replica/linked roles)
  const masterToChildTeam = useMemo(() => {
    if (!roles || !teams) return new Map<string, { _id: Id<"teams">; name: string }>();

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const result = new Map<string, { _id: Id<"teams">; name: string }>();

    // Find replica roles and map their linkedRoleId to their team (the child team)
    for (const role of roles) {
      if (role.linkedRoleId) {
        const childTeam = teamMap.get(role.teamId);
        if (childTeam) {
          result.set(role.linkedRoleId, { _id: childTeam._id, name: childTeam.name });
        }
      }
    }

    return result;
  }, [roles, teams]);

  // Group roles by team
  const rolesByTeam = useMemo(() => {
    if (!masterRoles.length || !teams) return [];

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const grouped: { team: { _id: Id<"teams">; name: string }; roles: typeof masterRoles }[] = [];

    // Group roles by teamId
    const roleGroups = new Map<string, typeof masterRoles>();
    for (const role of masterRoles) {
      const existing = roleGroups.get(role.teamId) || [];
      existing.push(role);
      roleGroups.set(role.teamId, existing);
    }

    // Create grouped objects sorted by team name
    for (const [teamId, teamRoles] of roleGroups) {
      const team = teamMap.get(teamId as Id<"teams">);
      if (team) {
        // Sort roles: leader first, then secretary, then referee, then others
        const sortedRoles = [...teamRoles].sort((a, b) => {
          const order = { leader: 0, secretary: 1, referee: 2 };
          const aOrder = a.roleType ? order[a.roleType] : 3;
          const bOrder = b.roleType ? order[b.roleType] : 3;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.title.localeCompare(b.title);
        });
        grouped.push({ team: { _id: team._id, name: team.name }, roles: sortedRoles });
      }
    }

    return grouped.sort((a, b) => a.team.name.localeCompare(b.team.name));
  }, [masterRoles, teams]);

  // Loading state
  if (member === undefined) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t("loading")}</div>
      </div>
    );
  }

  // Not found
  if (member === null) {
    return <NotFound entityType="member" onNavigateBack={onZoomOut} />;
  }

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      {/* Content */}
      <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
        {/* Profile Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 border-2 border-gray-300 dark:border-gray-600">
              {member.pictureURL ? (
                <img
                  src={member.pictureURL}
                  alt={`${member.firstname} ${member.surname}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-medium">
                  {member.firstname.charAt(0)}
                  {member.surname.charAt(0)}
                </div>
              )}
            </div>

            {/* Name and email */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-swarm text-3xl font-bold text-dark dark:text-light">
                  {member.firstname} {member.surname}
                </h1>
                {isCurrentUser && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-highlight/20 text-highlight-hover dark:text-highlight">
                    {tMembers("you")}
                  </span>
                )}
              </div>
              <a
                href={`mailto:${member.email}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {member.email}
              </a>
            </div>
          </div>
        </header>

        {/* Analytics section */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            {t("overview")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={masterRoles.length} label={tTeams("roles")} color="purple" />
            <StatCard value={teams?.length || 0} label={tTeams("teams")} color="green" />
          </div>
        </section>

        {/* Contact Information */}
        <section className="mb-8">
          {/* Save message */}
          {contactSaveMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                contactSaveMessage.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {contactSaveMessage.text}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              {tMembers("contactInformation")}
            </h2>
            {isCurrentUser && !isEditingContacts && (
              <button
                onClick={handleStartEditingContacts}
                className="text-sm text-highlight-hover dark:text-highlight hover:underline"
              >
                {tMembers("editContacts")}
              </button>
            )}
          </div>

          {isEditingContacts ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {/* Existing items - editable */}
              {editedContacts.length > 0 && (
                <ul className="space-y-3 mb-4">
                  {editedContacts.map((contact, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <select
                        value={contact.type}
                        onChange={(e) => handleContactTypeChange(index, e.target.value)}
                        className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                      >
                        {CONTACT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={contact.value}
                        onChange={(e) => handleContactValueChange(index, e.target.value)}
                        placeholder={tMembers(getContactPlaceholderKey(contact.type))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
                      />
                      <button
                        onClick={() => handleRemoveContact(index)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label={tMembers("removeContact")}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new contact */}
              <div className="flex items-center gap-2 mb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <select
                  value={newContactType}
                  onChange={(e) => setNewContactType(e.target.value)}
                  className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                >
                  {CONTACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newContactValue}
                  onChange={(e) => setNewContactValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddContact();
                    }
                  }}
                  placeholder={tMembers(getContactPlaceholderKey(newContactType))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight"
                />
                <button
                  onClick={handleAddContact}
                  disabled={!newContactValue.trim()}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tMembers("addContact")}
                </button>
              </div>

              {/* Save/Cancel actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEditingContacts}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {tMembers("cancelEditContacts")}
                </button>
                <button
                  onClick={() => void handleSaveContacts()}
                  disabled={isSavingContacts}
                  className="px-3 py-1.5 text-sm bg-highlight hover:bg-highlight-hover text-dark rounded-lg transition-colors duration-75 disabled:opacity-50"
                >
                  {isSavingContacts ? tMembers("savingContacts") : tMembers("saveContacts")}
                </button>
              </div>
            </div>
          ) : member.contactInfos && member.contactInfos.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {member.contactInfos.map((contact, index) => {
                  const link = getContactLink(contact.type, contact.value);
                  return (
                    <div key={index} className="flex items-center gap-3 px-4 py-3">
                      {getContactIcon(contact.type)}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {contact.type}
                        </span>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-dark dark:text-light hover:text-highlight-hover dark:hover:text-highlight transition-colors truncate"
                          >
                            {contact.value}
                          </a>
                        ) : (
                          <p className="text-dark dark:text-light truncate">{contact.value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {isCurrentUser ? tMembers("noContactInfoYet") : tMembers("noContactInfo")}
              </p>
              {isCurrentUser && (
                <button
                  onClick={handleStartEditingContacts}
                  className="mt-3 text-sm text-highlight-hover dark:text-highlight hover:underline"
                >
                  {tMembers("addFirstContact")}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Roles by Team */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            {tTeams("roles")}
          </h2>
          {rolesByTeam.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {tMembers("noRolesAssigned")}
            </div>
          ) : (
            <div className="space-y-4">
              {rolesByTeam.map(({ team, roles: teamRoles }) => (
                <div
                  key={team._id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Team header - clickable */}
                  <button
                    onClick={() => focusOnTeam(team._id)}
                    className="
                      group
                      w-full px-4 py-2
                      bg-gray-50 dark:bg-gray-700/50
                      border-b border-gray-200 dark:border-gray-700
                      flex items-center justify-between
                      hover:bg-gray-100 dark:hover:bg-gray-600/50
                      transition-colors duration-75
                      focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
                      text-left
                    "
                    aria-label={`${team.name} ${tTeams("team")}. ${tMembers("clickToViewTeam")}`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-gray-400"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <circle cx="8" cy="5" r="1.5" />
                        <circle cx="5" cy="10" r="1.5" />
                        <circle cx="11" cy="10" r="1.5" />
                      </svg>
                      <span className="font-medium text-dark dark:text-light">{team.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({tMembers("roleCount", { count: teamRoles.length })})
                      </span>
                    </div>
                    {/* Chevron indicator */}
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
                      "
                      aria-hidden="true"
                    >
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </button>

                  {/* Roles list */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teamRoles.map((role) => {
                      const childTeam = masterToChildTeam.get(role._id);
                      return (
                        <button
                          key={role._id}
                          onClick={() => focusOnRole(role._id, role.teamId)}
                          className="
                            group
                            w-full px-4 py-3
                            hover:bg-gray-50 dark:hover:bg-gray-700/50
                            transition-colors duration-75
                            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
                            text-left
                          "
                          aria-label={`${role.title}. ${tMembers("clickToViewRole")}`}
                        >
                          <div className="flex items-center justify-between">
                            {/* Left: Role info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {role.roleType && (
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) }}
                                  />
                                )}
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
                                    {tMembers(getRoleTypeKey(role.roleType))}
                                  </span>
                                )}
                              </div>
                              {/* Show child team link for master roles that lead a child team */}
                              {childTeam && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="text-gray-400"
                                  >
                                    <path d="M8 4v8M8 12l-3-3M8 12l3-3" />
                                  </svg>
                                  <span>{tMembers("leadsTeam")}</span>
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      focusOnTeam(childTeam._id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        focusOnTeam(childTeam._id);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    className="
                                      font-medium text-dark dark:text-light
                                      hover:text-highlight-hover dark:hover:text-highlight
                                      hover:underline
                                      transition-colors duration-75
                                      focus:outline-none focus:underline
                                    "
                                  >
                                    {childTeam.name}
                                  </span>
                                </div>
                              )}
                              {role.mission && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                  {role.mission}
                                </p>
                              )}
                            </div>
                            {/* Right: Chevron */}
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
                                ml-2
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger Zone - only shown for current user */}
        {isCurrentUser && (
          <section className="mb-8 pt-6 border-t border-red-200 dark:border-red-900/50">
            <h2 className="font-swarm text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              {tMembers("dangerZone")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {canLeave
                ? tMembers("leaveOrgWarning")
                : leaveDisabledReason === "owner"
                  ? tMembers("leaveOrgDisabledOwner")
                  : tMembers("leaveOrgDisabledFirstTeamLeader")
              }
            </p>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              disabled={!canLeave}
              className={canLeave
                ? "px-4 py-2 text-sm border border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                : "px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed opacity-50"
              }
            >
              {tMembers("leaveOrg", { orgName: selectedOrga?.name ?? "" })}
            </button>
          </section>
        )}

      </div>

      {/* Leave organization confirmation modal */}
      {showLeaveConfirm && createPortal(
        <LeaveOrgConfirmModal
          orgName={selectedOrga?.name ?? ""}
          rolesCount={masterRoles.length}
          isLeaving={isLeaving}
          error={leaveError}
          onConfirm={() => void handleLeaveOrganization()}
          onCancel={() => { setShowLeaveConfirm(false); setLeaveError(null); }}
          modalRef={leaveModalRef}
        />,
        document.body
      )}
    </div>
  );
}
