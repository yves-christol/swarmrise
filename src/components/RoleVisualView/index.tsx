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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
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
          onZoomOut();
          break;
        case "d":
        case "D":
          // Toggle duties section
          if (role?.duties && role.duties.length > 0) {
            setShowDuties((prev) => !prev);
          }
          break;
        case "l":
        case "L":
          // Navigate to linked role (source role in parent team)
          if (linkedRole && onNavigateToRole) {
            onNavigateToRole(linkedRole._id, linkedRole.teamId);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomOut, role?.duties, linkedRole, onNavigateToRole]);

  // Calculate layout
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const maxRadius = Math.min(dimensions.width, dimensions.height) / 2 - 40;

  // Calculate content dimensions
  const contentWidth = maxRadius * 1.2;
  const contentHeight = maxRadius * 0.9;

  // Loading state
  if (role === undefined) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-light dark:bg-dark">
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
    );
  }

  // Role not found
  if (role === null) {
    return <NotFound entityType="role" onNavigateBack={onZoomOut} />;
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

        @keyframes innerCircleReveal {
          from {
            stroke-dashoffset: 1500;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.15;
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

        .role-inner-circle {
          animation: innerCircleReveal 500ms ease-out 100ms forwards;
          opacity: 0;
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

        @keyframes expandDuties {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 200px;
            opacity: 1;
          }
        }

        @keyframes collapseDuties {
          from {
            max-height: 200px;
            opacity: 1;
          }
          to {
            max-height: 0;
            opacity: 0;
          }
        }

        .duties-expanded {
          animation: expandDuties 300ms ease-out forwards;
          overflow: hidden;
        }

        .duties-collapsed {
          animation: collapseDuties 200ms ease-out forwards;
          overflow: hidden;
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
          .role-outer-circle,
          .role-inner-circle {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
          .role-outer-circle { opacity: 0.3 !important; }
          .role-inner-circle { opacity: 0.15 !important; }
          .role-content-title,
          .role-content-badge,
          .role-content-divider,
          .role-content-mission,
          .role-content-duties {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .duties-expanded,
          .duties-collapsed {
            animation: none !important;
            max-height: none !important;
            opacity: 1 !important;
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

        {/* Inner decorative ring */}
        <circle
          className="role-inner-circle"
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.75}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="2 4"
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

            {/* Role Type Badge (if special role) */}
            {role.roleType && (
              <div
                className="role-content-badge flex items-center gap-2 px-3 py-1 rounded-full"
                style={{ backgroundColor: getRoleTypeBadgeColor(role.roleType) + "30" }}
              >
                {/* Icon */}
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
            )}

            {/* Linked Role Badge (for double role pattern) - clickable to navigate */}
            {role.linkedRoleId && linkedRole && (
              <button
                className="role-content-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer border-none"
                onClick={() => onNavigateToRole?.(linkedRole._id, linkedRole.teamId)}
                title="Go to source role in parent team (L)"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M4,6 C4,3 6,1 9,1 L11,1 C14,1 16,3 16,6 L16,10 C16,13 14,15 11,15 L9,15 C6,15 4,13 4,10 M6,8 L10,8" />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("diagram.syncedFromParentShort")}
                </span>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            )}
            {/* Non-clickable badge when linked role data not loaded yet */}
            {role.linkedRoleId && !linkedRole && (
              <div className="role-content-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M4,6 C4,3 6,1 9,1 L11,1 C14,1 16,3 16,6 L16,10 C16,13 14,15 11,15 L9,15 C6,15 4,13 4,10 M6,8 L10,8" />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("diagram.syncedFromParentShort")}
                </span>
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

            {/* Duties Section (expandable) */}
            {role.duties && role.duties.length > 0 && (
              <div className="role-content-duties flex flex-col items-center gap-1 max-w-xs">
                <button
                  onClick={() => setShowDuties((prev) => !prev)}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer bg-transparent border-none"
                  title={showDuties ? "Hide duties (D)" : "Show duties (D)"}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform duration-200 ${showDuties ? "rotate-90" : ""}`}
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                  <span className="font-swarm font-semibold uppercase tracking-wide">
                    {t("diagram.dutiesSection", { count: role.duties.length })}
                  </span>
                </button>
                <div className={showDuties ? "duties-expanded" : "duties-collapsed"}>
                  {showDuties && (
                    <ul className="text-xs text-center text-gray-600 dark:text-gray-400 space-y-1 mt-1">
                      {role.duties.map((duty, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-gray-400">-</span>
                          <span>{duty}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
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
              const linkY = centerY + maxRadius + 50;
              const linkRadius = 28;
              onNavigateToMember?.(memberId, { x: centerX, y: linkY, radius: linkRadius });
            }}
          />
        )}
      </svg>

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
