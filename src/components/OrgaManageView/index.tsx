"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga, useMembers, useFocus } from "../../tools/orgaStore";
import { EmailDomainsInput } from "../EmailDomainsInput";

type ContactInfo = {
  type: string;
  value: string;
};

type OrgaManageViewProps = {
  orgaId: Id<"orgas">;
};

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

function MemberRow({
  member,
  isCurrentUser,
  onNavigate,
}: {
  member: {
    _id: Id<"members">;
    firstname: string;
    surname: string;
    email: string;
    pictureURL?: string;
    contactInfos: ContactInfo[];
  };
  isCurrentUser: boolean;
  onNavigate: () => void;
}) {
  const [showContacts, setShowContacts] = useState(false);

  // Filter out email from contactInfos since it's already displayed
  const additionalContacts = member.contactInfos.filter((c) => c.type !== "Email");
  const hasAdditionalContacts = additionalContacts.length > 0;

  return (
    <button
      onClick={onNavigate}
      className="
        group
        w-full flex items-center gap-3 px-4 py-3
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        transition-colors duration-75
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
        text-left
      "
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {member.pictureURL ? (
          <img
            src={member.pictureURL}
            alt={`${member.firstname} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
            {member.firstname.charAt(0)}
            {member.surname.charAt(0)}
          </div>
        )}
      </div>

      {/* Name and email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-dark dark:text-light truncate">
            {member.firstname} {member.surname}
          </span>
          {isCurrentUser && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]">
              You
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
          {member.email}
        </span>
      </div>

      {/* Contact info button - only if has additional contacts */}
      {hasAdditionalContacts && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContacts(!showContacts);
            }}
            onBlur={() => setTimeout(() => setShowContacts(false), 150)}
            className="
              p-1.5 rounded-full
              hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors duration-75
              focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
            "
            aria-label="View contact information"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-500 dark:text-gray-400"
            >
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <path d="M1 5l7 4 7-4" />
            </svg>
          </button>

          {/* Contact popover */}
          {showContacts && (
            <div
              className="
                absolute right-0 top-full mt-1 z-20
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg
                p-3 min-w-48
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                {additionalContacts.map((contact, index) => {
                  const link = getContactLink(contact.type, contact.value);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      {getContactIcon(contact.type)}
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-dark dark:text-light hover:text-[#d4af37] dark:hover:text-[#eac840] transition-colors truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.value}
                        </a>
                      ) : (
                        <span className="text-sm text-dark dark:text-light truncate">
                          {contact.value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation chevron */}
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
    </button>
  );
}

export function OrgaManageView({ orgaId }: OrgaManageViewProps) {
  const { t } = useTranslation("orgs");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Email domains state
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [isSavingDomains, setIsSavingDomains] = useState(false);
  const [domainsSaveStatus, setDomainsSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasDomainsChanged, setHasDomainsChanged] = useState(false);

  // Get organization data
  const orga = useQuery(api.orgas.functions.getOrgaById, { orgaId });

  // Get current user's member data
  const { myMember, selectedOrga } = useSelectedOrga();

  // Focus navigation
  const { focusOnMember } = useFocus();

  // Get all members
  const { data: members, isLoading: membersLoading } = useMembers();

  // Get counts from the orga list (cached data)
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts, {});
  const counts = useMemo(() => {
    const found = orgasWithCounts?.find((o) => o.orga._id === orgaId);
    return found?.counts ?? { members: 0, teams: 0, roles: 0 };
  }, [orgasWithCounts, orgaId]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.firstname.toLowerCase().includes(query) ||
        m.surname.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

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
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
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
            Organization settings and directory
          </p>
        </header>

        {/* Analytics section */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={counts.teams} label="Teams" color="green" />
            <StatCard value={counts.roles} label="Roles" color="purple" />
            <StatCard value={counts.members} label="Members" color="blue" />
          </div>
        </section>

        {/* Member directory */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-swarm text-lg font-semibold text-dark dark:text-light">
              Member Directory
            </h2>
            <input
              type="search"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? "No members match your search" : "No members found"}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMembers.map((member) => (
                  <MemberRow
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
              Danger Zone
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Once you delete an organization, there is no going back. Please be certain.
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
                  Yes, delete this organization
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
                  Cancel
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
                Delete Organization
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
