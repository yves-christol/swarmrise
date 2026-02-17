import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSelectedOrga } from "../../../tools/orgaStore/hooks";
import { useFocus } from "../../../tools/orgaStore/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

type SearchPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SearchPanel = ({ isOpen, onClose }: SearchPanelProps) => {
  const { t } = useTranslation("common");
  const { selectedOrgaId } = useSelectedOrga();
  const { focusOnTeamFromNav, focusOnRoleFromNav, focusOnMemberFromNav } = useFocus();

  const [teamQuery, setTeamQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Fetch all data for the org
  const teams = useQuery(
    api.teams.functions.listTeamsInOrga,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  );

  const roles = useQuery(
    api.roles.functions.listRolesInOrga,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  );

  const members = useQuery(
    api.members.functions.listMembers,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  );

  // Build a team name lookup for showing team context on roles
  const teamNameMap = useMemo(() => {
    if (!teams) return new Map<Id<"teams">, string>();
    return new Map(teams.map((t) => [t._id, t.name]));
  }, [teams]);

  // Filter results based on queries
  const filteredTeams = useMemo(() => {
    if (!teams || !teamQuery.trim()) return [];
    const q = teamQuery.toLowerCase().trim();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, teamQuery]);

  const filteredRoles = useMemo(() => {
    if (!roles || !roleQuery.trim()) return [];
    const q = roleQuery.toLowerCase().trim();
    return roles.filter((r) => r.title.toLowerCase().includes(q));
  }, [roles, roleQuery]);

  const filteredMembers = useMemo(() => {
    if (!members || !memberQuery.trim()) return [];
    const q = memberQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.firstname.toLowerCase().includes(q) ||
        m.surname.toLowerCase().includes(q) ||
        `${m.firstname} ${m.surname}`.toLowerCase().includes(q)
    );
  }, [members, memberQuery]);

  // Focus first input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the panel to render
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelectTeam = (teamId: Id<"teams">) => {
    focusOnTeamFromNav(teamId);
    onClose();
  };

  const handleSelectRole = (roleId: Id<"roles">, teamId: Id<"teams">) => {
    focusOnRoleFromNav(roleId, teamId);
    onClose();
  };

  const handleSelectMember = (memberId: Id<"members">) => {
    focusOnMemberFromNav(memberId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label={t("search")}
      className="absolute top-full left-0 mt-1 w-80
        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <div className="p-3 flex flex-col gap-3">
        {/* Team search */}
        <div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={firstInputRef}
              type="text"
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
              placeholder={t("searchTeams")}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md
                bg-gray-50 dark:bg-gray-900
                border border-gray-200 dark:border-gray-700
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:border-transparent"
              aria-label={t("searchTeams")}
            />
          </div>
          {teamQuery.trim() && (
            <ul className="mt-1 max-h-32 overflow-y-auto">
              {filteredTeams.length === 0 ? (
                <li className="px-3 py-1.5 text-xs text-gray-400">{t("noResults")}</li>
              ) : (
                filteredTeams.map((team) => (
                  <li key={team._id}>
                    <button
                      onClick={() => handleSelectTeam(team._id)}
                      className="w-full text-left px-3 py-1.5 text-sm
                        text-dark dark:text-light
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        rounded-md transition-colors truncate"
                    >
                      {team.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Role search */}
        <div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder={t("searchRoles")}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md
                bg-gray-50 dark:bg-gray-900
                border border-gray-200 dark:border-gray-700
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:border-transparent"
              aria-label={t("searchRoles")}
            />
          </div>
          {roleQuery.trim() && (
            <ul className="mt-1 max-h-32 overflow-y-auto">
              {filteredRoles.length === 0 ? (
                <li className="px-3 py-1.5 text-xs text-gray-400">{t("noResults")}</li>
              ) : (
                filteredRoles.map((role) => (
                  <li key={role._id}>
                    <button
                      onClick={() => handleSelectRole(role._id, role.teamId)}
                      className="w-full text-left px-3 py-1.5 text-sm
                        text-dark dark:text-light
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        rounded-md transition-colors"
                    >
                      <span className="block truncate">{role.title}</span>
                      <span className="block text-xs text-gray-400 truncate">
                        {teamNameMap.get(role.teamId) ?? ""}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Member search */}
        <div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder={t("searchMembers")}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md
                bg-gray-50 dark:bg-gray-900
                border border-gray-200 dark:border-gray-700
                text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:border-transparent"
              aria-label={t("searchMembers")}
            />
          </div>
          {memberQuery.trim() && (
            <ul className="mt-1 max-h-32 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <li className="px-3 py-1.5 text-xs text-gray-400">{t("noResults")}</li>
              ) : (
                filteredMembers.map((member) => (
                  <li key={member._id}>
                    <button
                      onClick={() => handleSelectMember(member._id)}
                      className="w-full text-left px-3 py-1.5 text-sm
                        text-dark dark:text-light
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        rounded-md transition-colors truncate"
                    >
                      {member.firstname} {member.surname}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
