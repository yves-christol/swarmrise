import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFocus, useSelectedOrga } from "../../../tools/orgaStore/hooks";

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

export const RoleSelector = () => {
  const { t } = useTranslation("common");
  const { myMember } = useSelectedOrga();
  const { focus, focusOnRoleFromNav } = useFocus();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const focusedTeamId =
    focus.type === "team" ? focus.teamId : focus.type === "role" ? focus.teamId : null;
  const focusedRoleId = focus.type === "role" ? focus.roleId : null;

  // Fetch all of user's roles
  const myRoles = useQuery(
    api.members.functions.listMemberRoles,
    myMember ? { memberId: myMember._id } : "skip"
  );

  // Filter to roles in the focused team
  const rolesInTeam = useMemo(
    () => (myRoles && focusedTeamId ? myRoles.filter((r) => r.teamId === focusedTeamId) : []),
    [myRoles, focusedTeamId]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  // Don't render if no team focused, or user has 0 roles in this team
  if (!focusedTeamId || rolesInTeam.length === 0) return null;

  // Determine current role name
  const currentRole = focusedRoleId
    ? rolesInTeam.find((r) => r._id === focusedRoleId)
    : null;
  const currentRoleName = currentRole?.title ?? t("selectRole");

  // Single role: static text
  if (rolesInTeam.length === 1) {
    return (
      <span className="text-sm text-dark dark:text-light truncate max-w-[140px] font-medium">
        {rolesInTeam[0].title}
      </span>
    );
  }

  // Multiple roles: dropdown
  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
          hover:bg-slate-200 dark:hover:bg-slate-700"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-sm text-dark dark:text-light truncate max-w-[140px] font-medium">
          {currentRoleName}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && focusedTeamId && (
        <div
          role="listbox"
          aria-label={t("selectRole")}
          className="absolute top-full left-0 mt-1 w-56
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
        >
          <div className="py-1">
            {rolesInTeam.map((role) => {
              const isSelected = role._id === focusedRoleId;
              return (
                <button
                  key={role._id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (role._id !== focusedRoleId) {
                      focusOnRoleFromNav(role._id, focusedTeamId);
                    }
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2
                    transition-colors text-left text-sm
                    ${isSelected ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                >
                  <span className="text-dark dark:text-light truncate">{role.title}</span>
                  {isSelected && <CheckIcon className="w-4 h-4 text-gold flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
