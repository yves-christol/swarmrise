import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFocus, useSelectedOrga, useViewMode } from "../../../tools/orgaStore/hooks";
import { useViewModeNavigation } from "../../../hooks/useViewModeNavigation";
import type { ViewMode } from "../../../tools/orgaStore/types";

export const NavOverflowMenu = () => {
  const { t } = useTranslation("common");
  const { myMember } = useSelectedOrga();
  const { focus, focusOnTeamFromNav, focusOnRoleFromNav, isFocusTransitioning } = useFocus();
  const { swapPhase } = useViewMode();
  const { viewMode, changeViewMode } = useViewModeNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const focusedTeamId =
    focus.type === "team" ? focus.teamId : focus.type === "role" ? focus.teamId : null;
  const focusedRoleId = focus.type === "role" ? focus.roleId : null;
  const isTeamFocused = focus.type === "team";

  const myTeams = useQuery(
    api.members.functions.listMemberTeams,
    myMember ? { memberId: myMember._id } : "skip"
  );

  const myRoles = useQuery(
    api.members.functions.listMemberRoles,
    myMember ? { memberId: myMember._id } : "skip"
  );

  const rolesInTeam = useMemo(
    () => (myRoles && focusedTeamId ? myRoles.filter((r) => r.teamId === focusedTeamId) : []),
    [myRoles, focusedTeamId]
  );

  const isMyTeam = myTeams?.some((t) => t._id === focusedTeamId) ?? false;
  const disabled = swapPhase !== "idle" || isFocusTransitioning;

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

  const hasTeamItems = focusedTeamId && isMyTeam && myTeams && myTeams.length > 1;
  const hasRoleItems = rolesInTeam.length > 1;
  const hasViewToggle = true;
  const hasContent = hasTeamItems || hasRoleItems || hasViewToggle;

  if (!hasContent) return null;

  const handleViewChange = (mode: ViewMode) => {
    if (!disabled) {
      changeViewMode(mode);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#eac840]
          hover:bg-slate-200 dark:hover:bg-slate-700
          text-gray-500 dark:text-gray-400"
        aria-label={t("moreOptions")}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="10" r="2" />
          <circle cx="10" cy="10" r="2" />
          <circle cx="16" cy="10" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">

          {/* Team items */}
          {hasTeamItems && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("selectTeam")}
              </div>
              {myTeams?.map((team) => {
                const isSelected = team._id === focusedTeamId;
                return (
                  <button
                    key={team._id}
                    onClick={() => {
                      if (team._id !== focusedTeamId) {
                        focusOnTeamFromNav(team._id);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2
                      transition-colors text-left text-sm
                      ${isSelected ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                  >
                    <span className="text-dark dark:text-light truncate">{team.name}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-gold flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Role items */}
          {hasRoleItems && focusedTeamId && (
            <>
              {hasTeamItems && <div className="border-t border-gray-200 dark:border-gray-700" />}
              <div className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("selectRole")}
                </div>
                {rolesInTeam.map((role) => {
                  const isSelected = role._id === focusedRoleId;
                  return (
                    <button
                      key={role._id}
                      onClick={() => {
                        if (role._id !== focusedRoleId) {
                          focusOnRoleFromNav(role._id, focusedTeamId);
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2
                        transition-colors text-left text-sm
                        ${isSelected ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                      <span className="text-dark dark:text-light truncate">{role.title}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-gold flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* View toggle */}
          {(hasTeamItems || hasRoleItems) && <div className="border-t border-gray-200 dark:border-gray-700" />}
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {t("viewMode")}
            </div>
            <button
              onClick={() => handleViewChange("visual")}
              className={`w-full flex items-center gap-2 px-4 py-2 transition-colors text-left text-sm
                ${viewMode === "visual" ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-dark dark:text-light"}`}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="9" cy="9" r="7" /><circle cx="9" cy="5" r="2" /><circle cx="5" cy="12" r="2" /><circle cx="13" cy="12" r="2" />
              </svg>
              {t("visual")}
            </button>
            <button
              onClick={() => handleViewChange("manage")}
              className={`w-full flex items-center gap-2 px-4 py-2 transition-colors text-left text-sm
                ${viewMode === "manage" ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-dark dark:text-light"}`}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="12" height="3" rx="1" /><rect x="3" y="8" width="12" height="3" rx="1" /><rect x="3" y="13" width="8" height="3" rx="1" />
              </svg>
              {t("manage")}
            </button>
            {isTeamFocused && (
              <button
                onClick={() => handleViewChange("kanban")}
                className={`w-full flex items-center gap-2 px-4 py-2 transition-colors text-left text-sm
                  ${viewMode === "kanban" ? "bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-dark dark:text-light"}`}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2" y="3" width="3.5" height="12" rx="1" /><rect x="7.25" y="3" width="3.5" height="8" rx="1" /><rect x="12.5" y="3" width="3.5" height="10" rx="1" />
                </svg>
                {t("kanban")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
