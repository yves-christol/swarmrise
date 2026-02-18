import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFocus } from "../../../tools/orgaStore/hooks";

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDownSmallIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

export const TeamSelector = () => {
  const { t } = useTranslation("common");
  const { focus, focusOnTeamFromNav, focusOnTeamFromRole } = useFocus();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get the current team ID from focus
  const focusedTeamId =
    focus.type === "team" ? focus.teamId : focus.type === "role" ? focus.teamId : null;

  // Fetch connected teams (parent + children)
  const connected = useQuery(
    api.teams.functions.listConnectedTeams,
    focusedTeamId ? { teamId: focusedTeamId } : "skip"
  );

  // Fetch the current team info
  const currentTeam = useQuery(
    api.teams.functions.getTeamById,
    focusedTeamId ? { teamId: focusedTeamId } : "skip"
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

  // Don't render if no team context
  if (!focusedTeamId) return null;

  const currentTeamName = currentTeam?.name ?? t("loading");
  const canGoBackToTeam = focus.type === "role";
  const hasConnectedTeams = connected && (connected.parent !== null || connected.children.length > 0);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <div className="flex items-center rounded-md">
        <button
          ref={triggerRef}
          onClick={() => {
            if (canGoBackToTeam) {
              focusOnTeamFromRole();
            }
          }}
          className={`flex items-center gap-1 px-3 py-1.5 transition-colors
            focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
            ${hasConnectedTeams ? 'rounded-l-md' : 'rounded-md'}
            ${canGoBackToTeam ? 'hover:bg-surface-hover-strong cursor-pointer' : ''}`}
          aria-label={currentTeamName}
        >
          <span className="text-sm text-dark dark:text-light truncate max-w-[140px] font-medium">
            {currentTeamName}
          </span>
        </button>
        {hasConnectedTeams && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center py-1.5 pr-2 pl-1 rounded-r-md transition-colors
              focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
              hover:bg-surface-hover-strong"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <ChevronDownIcon
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {isOpen && hasConnectedTeams && connected && (
        <div
          role="listbox"
          aria-label={t("selectTeam")}
          className="absolute top-full left-0 mt-1 w-56
            bg-surface-primary border border-border-default rounded-lg shadow-xl z-50"
        >
          <div className="py-1">
            {/* Parent team */}
            {connected.parent && (
              <button
                role="option"
                aria-selected={false}
                onClick={() => {
                  focusOnTeamFromNav(connected.parent!._id);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="w-full flex items-center gap-2 px-4 py-2
                  transition-colors text-left text-sm
                  hover:bg-surface-hover"
              >
                <ChevronUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-dark dark:text-light truncate">{connected.parent.name}</span>
              </button>
            )}

            {/* Separator between parent and children */}
            {connected.parent && connected.children.length > 0 && (
              <div className="border-t border-border-default my-1" />
            )}

            {/* Child teams */}
            {connected.children.map((child) => (
              <button
                key={child._id}
                role="option"
                aria-selected={false}
                onClick={() => {
                  focusOnTeamFromNav(child._id);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="w-full flex items-center gap-2 px-4 py-2
                  transition-colors text-left text-sm
                  hover:bg-surface-hover"
              >
                <ChevronDownSmallIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-dark dark:text-light truncate">{child.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
