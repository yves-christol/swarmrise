"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga } from "../../tools/orgaStore";

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

function getContactIcon(type: string) {
  switch (type) {
    case "LinkedIn":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#0A66C2]">
          <path d="M13.6 1H2.4C1.6 1 1 1.6 1 2.4v11.2c0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4V2.4c0-.8-.6-1.4-1.4-1.4zM5.2 13H3V6.2h2.2V13zM4.1 5.2c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3zM13 13h-2.2V9.7c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.8V13H6.2V6.2h2.1v.9h.1c.3-.6 1-1.2 2.1-1.2 2.2 0 2.6 1.5 2.6 3.4V13z"/>
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
    case "Facebook":
      return value.startsWith("http") ? value : `https://facebook.com/${value}`;
    case "Instagram":
      return value.startsWith("http") ? value : `https://instagram.com/${value}`;
    case "Whatsapp":
      return `https://wa.me/${value.replace(/\D/g, "")}`;
    case "Mobile":
      return `tel:${value}`;
    default:
      return null;
  }
}

function BackButton({ onClick }: { onClick: () => void }) {
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
      aria-label="Return to previous view"
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
      <span className="text-sm font-medium">Back</span>
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
  // Fetch member data
  const member = useQuery(api.members.functions.getMemberById, { memberId });

  // Fetch member's roles
  const roles = useQuery(api.members.functions.listMemberRoles, { memberId });

  // Fetch member's teams
  const teams = useQuery(api.members.functions.listMemberTeams, { memberId });

  // Get current user's member to check if viewing self
  const { myMember } = useSelectedOrga();
  const isCurrentUser = myMember?._id === memberId;

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
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not found
  if (member === null) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark">
        <BackButton onClick={onZoomOut} />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Member not found</p>
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
                    You
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
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={roles?.length || 0} label="Roles" color="purple" />
            <StatCard value={teams?.length || 0} label="Teams" color="green" />
          </div>
        </section>

        {/* Contact Information */}
        {member.contactInfos && member.contactInfos.length > 0 && (
          <section className="mb-8">
            <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
              Contact Information
            </h2>
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
          </section>
        )}

        {/* Roles by Team */}
        <section className="mb-8">
          <h2 className="font-swarm text-lg font-semibold mb-4 text-dark dark:text-light">
            Roles
          </h2>
          {rolesByTeam.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No roles assigned
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
                        ({teamRoles.length} {teamRoles.length === 1 ? "role" : "roles"})
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
                              {getRoleTypeLabel(role.roleType)}
                            </span>
                          )}
                          {role.linkedRoleId && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              Synced
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
            Teams
          </h2>
          {!teams || teams.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Not a member of any team
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
                          {teamRoleCount} {teamRoleCount === 1 ? "role" : "roles"}
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
