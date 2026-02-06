"use client";

import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga } from "../../tools/orgaStore";

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
      return "#d4af37";
    case "secretary":
      return "#7dd3fc";
    case "referee":
      return "#c4b5fd";
  }
}

function getRoleTypeKey(roleType: "leader" | "secretary" | "referee"): string {
  return `roleTypes.${roleType}`;
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

function getContactLink(type: string, value: string): string | null {
  switch (type) {
    case "LinkedIn":
      return value.startsWith("http") ? value : `https://linkedin.com/in/${value}`;
    case "Email":
      return `mailto:${value}`;
    case "Facebook":
      return value.startsWith("http") ? value : `https://facebook.com/${value}`;
    case "Instagram":
      return value.startsWith("http") ? value : `https://instagram.com/${value}`;
    case "Whatsapp":
      return `https://wa.me/${value.replace(/\D/g, "")}`;
    case "Mobile":
      return `tel:${value}`;
    case "Website":
      return value.startsWith("http") ? value : `https://${value}`;
    case "Twitter":
      return value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`;
    default:
      return null;
  }
}

function getContactPlaceholderKey(type: string): string {
  const keyMap: Record<string, string> = {
    LinkedIn: "contactPlaceholders.linkedin",
    Email: "contactPlaceholders.email",
    Mobile: "contactPlaceholders.mobile",
    Website: "contactPlaceholders.website",
    Twitter: "contactPlaceholders.twitter",
    Whatsapp: "contactPlaceholders.whatsapp",
    Facebook: "contactPlaceholders.facebook",
    Instagram: "contactPlaceholders.instagram",
    Address: "contactPlaceholders.address",
  };
  return keyMap[type] || "contactPlaceholders.default";
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation("common");
  const { t: tMembers } = useTranslation("members");
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
        focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
      "
      aria-label={tMembers("returnToPreviousView")}
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
        <circle cx="10" cy="10" r="4" fill="currentColor" />
      </svg>
      <span className="text-sm font-medium">{t("back")}</span>
    </button>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "purple" | "green";
}) {
  const colorClasses = {
    purple: "text-purple-600 dark:text-purple-400",
    green: "text-green-600 dark:text-green-400",
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
  const { myMember, selectedOrgaId } = useSelectedOrga();
  const isCurrentUser = myMember?._id === memberId;

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
      // Use ref to get the current value, avoiding stale closure issues
      const contactsToSave = editedContactsRef.current.filter((c) => c.value && c.value.trim());
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

  // Group roles by team
  const rolesByTeam = useMemo(() => {
    if (!roles || !teams) return [];

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const grouped: { team: { _id: Id<"teams">; name: string }; roles: typeof roles }[] = [];

    // Group roles by teamId
    const roleGroups = new Map<string, typeof roles>();
    for (const role of roles) {
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
  }, [roles, teams]);

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
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark">
        <BackButton onClick={onZoomOut} />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">{tMembers("memberNotFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      {/* Back button */}
      <BackButton onClick={onZoomOut} />

      {/* Content */}
      <div className="pt-20 px-8 pb-8 max-w-2xl mx-auto">
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
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]">
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
            <StatCard value={roles?.length || 0} label={tTeams("roles")} color="purple" />
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
                className="text-sm text-[#d4af37] dark:text-[#eac840] hover:underline"
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
                        className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-[#eac840]"
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
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-[#eac840]"
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
                  className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-[#eac840]"
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-[#eac840]"
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
                  className="px-3 py-1.5 text-sm bg-[#eac840] hover:bg-[#d4af37] text-dark rounded-lg transition-colors duration-75 disabled:opacity-50"
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
                            className="block text-dark dark:text-light hover:text-[#d4af37] dark:hover:text-[#eac840] transition-colors truncate"
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
                  className="mt-3 text-sm text-[#d4af37] dark:text-[#eac840] hover:underline"
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
                  {/* Team header */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
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
                  </div>

                  {/* Roles list */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teamRoles.map((role) => (
                      <div key={role._id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {role.roleType && (
                            <span
                              className="w-2 h-2 rounded-full"
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
                          {role.linkedRoleId && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              {tMembers("synced")}
                            </span>
                          )}
                        </div>
                        {role.mission && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {role.mission}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Teams List */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            {tTeams("teams")}
          </h2>
          {!teams || teams.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {tMembers("notInAnyTeam")}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {teams
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((team) => {
                    const teamRoleCount = roles?.filter((r) => r.teamId === team._id).length || 0;
                    return (
                      <div key={team._id} className="flex items-center justify-between px-4 py-3">
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
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {tMembers("roleCount", { count: teamRoleCount })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
