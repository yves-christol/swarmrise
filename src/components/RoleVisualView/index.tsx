import { useRef, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { MemberLink } from "./MemberLink";
import { NotFound } from "../NotFound";
import type { RoleVisualViewProps } from "./types";

function getRoleStroke(roleType?: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)"; // Golden-bee (theme-aware)
    case "secretary":
      return "#a2dbed"; // Wing Blue
    case "referee":
      return "#a78bfa"; // Purple-400
    default:
      return "var(--diagram-node-stroke)";
  }
}

function getRoleTypeBadgeColor(roleType: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)"; // Golden-bee (theme-aware)
    case "secretary":
      return "#7dd3fc"; // Light Blue
    case "referee":
      return "#c4b5fd"; // Light Purple
  }
}

// getRoleTypeLabel is now handled via i18n: t("roleTypes.<type>", { ns: "members" })

export function RoleVisualView({ roleId, onZoomOut, onNavigateToRole, onNavigateToMember }: RoleVisualViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showDuties, setShowDuties] = useState(false);
  const { t } = useTranslation("teams");

  // Fetch role data
  const role = useQuery(api.roles.functions.getRoleById, { roleId });

  // Fetch linked role's team for navigation (if this is a linked role)
  const linkedRole = useQuery(
    api.roles.functions.getRoleById,
    role?.linkedRoleId ? { roleId: role.linkedRoleId } : "skip"
  );

  // Fetch team for back button label
  const team = useQuery(
    api.teams.functions.getTeamById,
    role ? { teamId: role.teamId } : "skip"
  );

  // Fetch member for link
  const member = useQuery(
    api.members.functions.getMemberById,
    role ? { memberId: role.memberId } : "skip"
  );

  // Fetch daughter linked role (if this role is a source in the double role pattern)
  const daughterLink = useQuery(
    api.roles.functions.getDaughterLinkedRole,
    role ? { roleId: role._id } : "skip"
  );

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "Escape":
          if (showDuties) {
            setShowDuties(false);
          } else {
            onZoomOut();
          }
          break;
        case "d":
        case "D":
          // Toggle duties modal
          if (role?.duties && role.duties.length > 0) {
            setShowDuties((prev) => !prev);
          }
          break;
        case "l":
        case "L":
          // Navigate to linked role (parent or daughter)
          if (linkedRole && onNavigateToRole) {
            onNavigateToRole(linkedRole._id, linkedRole.teamId);
          } else if (daughterLink && onNavigateToRole) {
            onNavigateToRole(daughterLink.linkedRole._id, daughterLink.linkedRole.teamId);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomOut, showDuties, role?.duties, linkedRole, daughterLink, onNavigateToRole]);

  // Calculate layout
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const maxRadius = (Math.min(dimensions.width, dimensions.height) / 2 - 70) * 0.85;

  // Calculate content dimensions
  const contentWidth = maxRadius * 1.41;
  const contentHeight = maxRadius * 1.06;

  // Role not found
  if (role === null) {
    return <NotFound entityType="role" onNavigateBack={onZoomOut} />;
  }

  // Always render containerRef so ResizeObserver can measure dimensions
  const isLoading = role === undefined;
  const hasDimensions = dimensions.width > 0 && dimensions.height > 0;

  if (isLoading || !hasDimensions) {
    return (
      <div ref={containerRef} className="absolute inset-0 bg-light dark:bg-dark">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {t("diagram.loadingRole")}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const strokeColor = getRoleStroke(role.roleType);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-light dark:bg-dark overflow-hidden"
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes circleReveal {
          from {
            stroke-dashoffset: 2000;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
        }

        @keyframes contentFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .role-outer-circle {
          stroke-dasharray: 2000;
          animation: circleReveal 600ms ease-out forwards;
        }

        .role-content-title {
          animation: contentFadeIn 300ms ease-out 200ms both;
        }
        .role-content-badge {
          animation: contentFadeIn 300ms ease-out 250ms both;
        }
        .role-content-divider {
          animation: contentFadeIn 300ms ease-out 300ms both;
        }
        .role-content-mission {
          animation: contentFadeIn 300ms ease-out 350ms both;
        }
        .role-content-duties {
          animation: contentFadeIn 300ms ease-out 400ms both;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes memberLinkReveal {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .role-outer-circle {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
            opacity: 0.3 !important;
          }
          .role-content-title,
          .role-content-badge,
          .role-content-divider,
          .role-content-mission,
          .role-content-duties {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          g[role="button"] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Back button */}
      <BackToTeamButton teamName={team?.name || "Team"} onClick={onZoomOut} />

      {/* Keyboard hints (shown in corner) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">Esc</kbd>
          <span>{t("diagram.keyboardBack")}</span>
        </span>
        {role.duties && role.duties.length > 0 && (
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">D</kbd>
            <span>{t("diagram.keyboardDuties")}</span>
          </span>
        )}
        {role.linkedRoleId && linkedRole && (
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">L</kbd>
            <span>{t("diagram.keyboardSource")}</span>
          </span>
        )}
        {!role.linkedRoleId && daughterLink && (
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">L</kbd>
            <span>{daughterLink.daughterTeam.name}</span>
          </span>
        )}
      </div>

      {/* SVG Diagram */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        role="img"
        aria-label={t("diagram.roleDetailsAriaLabel", { name: role.title })}
      >
        <title>{t("diagram.roleDetailsTitle", { name: role.title })}</title>

        {/* Outer boundary circle */}
        <circle
          className="role-outer-circle"
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* Role content (foreignObject for HTML rendering) */}
        <foreignObject
          x={centerX - contentWidth / 2}
          y={centerY - contentHeight / 2}
          width={contentWidth}
          height={contentHeight}
        >
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 px-4"
            style={{
              // Required for foreignObject in SVG
              // @ts-expect-error xmlns is valid for foreignObject content
              xmlns: "http://www.w3.org/1999/xhtml"
            }}
          >
            {/* Role Title */}
            <h2 className="role-content-title font-swarm text-xl md:text-2xl font-semibold text-dark dark:text-light text-center">
              {role.title}
            </h2>

            {/* Role Type Badge + optional linked role icon (merged when both present) */}
            {role.roleType && (
              role.linkedRoleId ? (
                <button
                  className="role-content-badge flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer border-none hover:brightness-110 transition-all"
                  style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) + "30" }}
                  onClick={() => linkedRole && onNavigateToRole?.(linkedRole._id, linkedRole.teamId)}
                  title="Go to source role in parent team (L)"
                >
                  {role.roleType === "leader" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M8,0 L9.8,5.5 L16,5.5 L11,9 L12.8,15 L8,11 L3.2,15 L5,9 L0,5.5 L6.2,5.5 Z" />
                    </svg>
                  )}
                  {role.roleType === "secretary" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M12,0 C12,0 2,8 3,14 L5,14 C5,14 9,6 12,0 M4,12 L2,14 L3,14 C3.5,13.5 4,13 4,12" />
                    </svg>
                  )}
                  {role.roleType === "referee" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <rect x="1" y="12" width="10" height="3" rx="1" />
                      <rect x="4" y="2" width="8" height="4" rx="1" transform="rotate(-45 8 4)" />
                    </svg>
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: getRoleTypeBadgeColor(role.roleType) }}
                  >
                    {t(`roleTypes.${role.roleType}`, { ns: "members" })}
                  </span>
                  {/* Link icon indicating synced from parent */}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={getRoleTypeBadgeColor(role.roleType)} strokeWidth="2" opacity="0.7">
                    <path d="M6.5,9.5 L9.5,6.5 M5,11 L3.5,12.5 C2.5,13.5 2.5,15 3.5,15 L4,15 C5,15 5.5,14 4.5,13 M11,5 L12.5,3.5 C13.5,2.5 13.5,1 12.5,1 L12,1 C11,1 10.5,2 11.5,3" />
                  </svg>
                </button>
              ) : daughterLink ? (
                <button
                  className="role-content-badge flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer border-none hover:brightness-110 transition-all"
                  style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) + "30" }}
                  onClick={() => onNavigateToRole?.(daughterLink.linkedRole._id, daughterLink.linkedRole.teamId)}
                  title={`Go to role in ${daughterLink.daughterTeam.name} (L)`}
                >
                  {role.roleType === "leader" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M8,0 L9.8,5.5 L16,5.5 L11,9 L12.8,15 L8,11 L3.2,15 L5,9 L0,5.5 L6.2,5.5 Z" />
                    </svg>
                  )}
                  {role.roleType === "secretary" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M12,0 C12,0 2,8 3,14 L5,14 C5,14 9,6 12,0 M4,12 L2,14 L3,14 C3.5,13.5 4,13 4,12" />
                    </svg>
                  )}
                  {role.roleType === "referee" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <rect x="1" y="12" width="10" height="3" rx="1" />
                      <rect x="4" y="2" width="8" height="4" rx="1" transform="rotate(-45 8 4)" />
                    </svg>
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: getRoleTypeBadgeColor(role.roleType) }}
                  >
                    {t(`roleTypes.${role.roleType}`, { ns: "members" })}
                  </span>
                  {/* Link icon indicating synced to daughter team */}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={getRoleTypeBadgeColor(role.roleType)} strokeWidth="2" opacity="0.7">
                    <path d="M6.5,9.5 L9.5,6.5 M5,11 L3.5,12.5 C2.5,13.5 2.5,15 3.5,15 L4,15 C5,15 5.5,14 4.5,13 M11,5 L12.5,3.5 C13.5,2.5 13.5,1 12.5,1 L12,1 C11,1 10.5,2 11.5,3" />
                  </svg>
                </button>
              ) : (
                <div
                  className="role-content-badge flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) + "30" }}
                >
                  {role.roleType === "leader" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M8,0 L9.8,5.5 L16,5.5 L11,9 L12.8,15 L8,11 L3.2,15 L5,9 L0,5.5 L6.2,5.5 Z" />
                    </svg>
                  )}
                  {role.roleType === "secretary" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <path d="M12,0 C12,0 2,8 3,14 L5,14 C5,14 9,6 12,0 M4,12 L2,14 L3,14 C3.5,13.5 4,13 4,12" />
                    </svg>
                  )}
                  {role.roleType === "referee" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={getRoleTypeBadgeColor(role.roleType)}>
                      <rect x="1" y="12" width="10" height="3" rx="1" />
                      <rect x="4" y="2" width="8" height="4" rx="1" transform="rotate(-45 8 4)" />
                    </svg>
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: getRoleTypeBadgeColor(role.roleType) }}
                  >
                    {t(`roleTypes.${role.roleType}`, { ns: "members" })}
                  </span>
                </div>
              )
            )}

            {/* Standalone linked role badge (when no roleType) */}
            {!role.roleType && role.linkedRoleId && linkedRole && (
              <button
                className="role-content-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer border-none"
                onClick={() => onNavigateToRole?.(linkedRole._id, linkedRole.teamId)}
                title="Go to source role in parent team (L)"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M6.5,9.5 L9.5,6.5 M5,11 L3.5,12.5 C2.5,13.5 2.5,15 3.5,15 L4,15 C5,15 5.5,14 4.5,13 M11,5 L12.5,3.5 C13.5,2.5 13.5,1 12.5,1 L12,1 C11,1 10.5,2 11.5,3" />
                </svg>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            )}
            {!role.roleType && role.linkedRoleId && !linkedRole && (
              <div className="role-content-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M6.5,9.5 L9.5,6.5 M5,11 L3.5,12.5 C2.5,13.5 2.5,15 3.5,15 L4,15 C5,15 5.5,14 4.5,13 M11,5 L12.5,3.5 C13.5,2.5 13.5,1 12.5,1 L12,1 C11,1 10.5,2 11.5,3" />
                </svg>
              </div>
            )}

            {/* Divider */}
            <div className="role-content-divider w-16 h-px bg-gray-300 dark:bg-gray-600 my-2" />

            {/* Mission Section */}
            <div className="role-content-mission flex flex-col items-center gap-1 max-w-xs">
              <h3 className="font-swarm text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("diagram.missionSection")}
              </h3>
              <p className="text-sm text-center text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                {role.mission || t("diagram.noMissionDefined")}
              </p>
            </div>

            {/* Duties Button */}
            {role.duties && role.duties.length > 0 && (
              <button
                onClick={() => setShowDuties(true)}
                className="role-content-duties flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-xs text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border-none"
                title={t("diagram.keyboardDuties") + " (D)"}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4h12M2 8h12M2 12h8" />
                </svg>
                <span className="font-swarm font-semibold uppercase tracking-wide">
                  {t("diagram.dutiesSection", { count: role.duties.length })}
                </span>
              </button>
            )}
          </div>
        </foreignObject>

        {/* Member link - positioned outside the main circle */}
        {member && (
          <MemberLink
            member={member}
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
            onMemberClick={(memberId) => {
              // Calculate position for transition origin
              const linkY = centerY + maxRadius + 30;
              const linkRadius = 36;
              onNavigateToMember?.(memberId, { x: centerX, y: linkY, radius: linkRadius });
            }}
          />
        )}
      </svg>

      {/* Duties Modal */}
      {showDuties && role.duties && role.duties.length > 0 && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ animation: "modalFadeIn 200ms ease-out" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setShowDuties(false)}
          />
          {/* Modal content */}
          <div
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-6 max-h-[70vh] flex flex-col"
            style={{ animation: "modalSlideIn 250ms ease-out" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-swarm text-lg font-semibold text-dark dark:text-light">
                {t("diagram.dutiesSection", { count: role.duties.length })}
              </h3>
              <button
                onClick={() => setShowDuties(false)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-none bg-transparent text-gray-500 dark:text-gray-400"
                title="Close (Esc/D)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            {/* Duties list */}
            <ul className="px-5 py-4 overflow-y-auto space-y-3 text-sm text-gray-700 dark:text-gray-300">
              {role.duties.map((duty, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0">-</span>
                  <span className="leading-relaxed">{duty}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Accessibility: screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {t("diagram.srRoleViewAnnouncement", { title: role.title })}
        {role.duties && role.duties.length > 0 && t("diagram.srRoleViewDutiesHint")}
        {role.linkedRoleId && t("diagram.srRoleViewSourceHint")}
      </div>

      {/* Accessibility: text alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-16 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          {t("diagram.viewRoleDetailsAsText")}
        </summary>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p><strong>{t("diagram.textRole")}</strong> {role.title}</p>
          {role.roleType && <p><strong>{t("diagram.textType")}</strong> {t(`roleTypes.${role.roleType}`, { ns: "members" })}</p>}
          <p><strong>{t("diagram.textMission")}</strong> {role.mission || t("diagram.noMissionDefined")}</p>
          {role.duties && role.duties.length > 0 && (
            <div>
              <strong>{t("diagram.textDuties")}</strong>
              <ul className="list-disc ml-4">
                {role.duties.map((duty, i) => <li key={i}>{duty}</li>)}
              </ul>
            </div>
          )}
          {member && <p><strong>{t("diagram.textAssignedTo")}</strong> {member.firstname} {member.surname}</p>}
        </div>
      </details>
    </div>
  );
}

// Back to team button component
function BackToTeamButton({ teamName, onClick }: { teamName: string; onClick: () => void }) {
  const { t } = useTranslation("teams");
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
      aria-label={t("diagram.returnToTeamView", { name: teamName })}
    >
      {/* Circle icon representing team with role dots */}
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
