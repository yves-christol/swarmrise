"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga, useMembers } from "../../tools/orgaStore";

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

function MemberRow({
  member,
  isCurrentUser,
}: {
  member: {
    _id: Id<"members">;
    firstname: string;
    surname: string;
    email: string;
    pictureURL?: string;
  };
  isCurrentUser: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
    </div>
  );
}

export function OrgaManageView({ orgaId }: OrgaManageViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get organization data
  const orga = useQuery(api.orgas.functions.getOrgaById, { orgaId });

  // Get current user's member data
  const { myMember, selectedOrga } = useSelectedOrga();

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

  // Check if user can delete the organization
  const canDelete = useMemo(() => {
    if (!orga || !myMember || !members) return false;
    // Must be owner and the only member
    return orga.owner === myMember.personId && members.length === 1;
  }, [orga, myMember, members]);

  // Delete mutation (we'll need to implement this)
  const deleteOrga = useMutation(api.orgas.functions.deleteOrganization);

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
                  />
                ))}
              </div>
            )}
          </div>
        </section>

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
