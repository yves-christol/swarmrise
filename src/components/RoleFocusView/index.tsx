"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { MemberLink } from "./MemberLink";
import type { RoleFocusViewProps } from "./types";

function getRoleStroke(roleType?: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "#eac840"; // Bee Gold
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
      return "#d4af37"; // Dark Gold
    case "secretary":
      return "#7dd3fc"; // Light Blue
    case "referee":
      return "#c4b5fd"; // Light Purple
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

export function RoleFocusView({ roleId, onZoomOut }: RoleFocusViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch role data
  const role = useQuery(api.roles.functions.getRoleById, { roleId });

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

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onZoomOut();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomOut]);

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
            Loading role...
          </span>
        </div>
      </div>
    );
  }

  // Role not found
  if (role === null) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark">
        <BackToTeamButton teamName={team?.name || "Team"} onClick={onZoomOut} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Logo size={48} begin={0} repeatCount={2} />
          <h3 className="font-swarm text-xl font-bold text-dark dark:text-light">
            Role not found
          </h3>
          <p className="text-gray-400 text-center max-w-xs">
            This role may have been deleted or moved.
          </p>
        </div>
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

        .role-content-title {
          animation: contentFadeIn 300ms ease-out 100ms both;
        }
        .role-content-badge {
          animation: contentFadeIn 300ms ease-out 150ms both;
        }
        .role-content-divider {
          animation: contentFadeIn 300ms ease-out 200ms both;
        }
        .role-content-mission {
          animation: contentFadeIn 300ms ease-out 250ms both;
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
          .role-content-title,
          .role-content-badge,
          .role-content-divider,
          .role-content-mission {
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

      {/* SVG Diagram */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        role="img"
        aria-label={`Role details for ${role.title}`}
      >
        <title>{role.title} - Role Details</title>

        {/* Outer boundary circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          opacity={0.3}
        />

        {/* Inner decorative ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.75}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.15}
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
                  {getRoleTypeLabel(role.roleType)}
                </span>
              </div>
            )}

            {/* Linked Role Badge (for double role pattern) */}
            {role.linkedRoleId && (
              <div className="role-content-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M4,6 C4,3 6,1 9,1 L11,1 C14,1 16,3 16,6 L16,10 C16,13 14,15 11,15 L9,15 C6,15 4,13 4,10 M6,8 L10,8" />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Synced from parent
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="role-content-divider w-16 h-px bg-gray-300 dark:bg-gray-600 my-2" />

            {/* Mission Section */}
            <div className="role-content-mission flex flex-col items-center gap-1 max-w-xs">
              <h3 className="font-swarm text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Mission
              </h3>
              <p className="text-sm text-center text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                {role.mission || "No mission defined"}
              </p>
            </div>
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
              // Future: navigate to member focus view
              console.log("Member clicked:", memberId);
            }}
          />
        )}
      </svg>

      {/* Accessibility: screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Now viewing role: {role.title}. Press Escape to return to team view.
      </div>

      {/* Accessibility: text alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-16 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          View role details as text
        </summary>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p><strong>Role:</strong> {role.title}</p>
          {role.roleType && <p><strong>Type:</strong> {role.roleType}</p>}
          <p><strong>Mission:</strong> {role.mission || "No mission defined"}</p>
          {role.duties && role.duties.length > 0 && (
            <div>
              <strong>Duties:</strong>
              <ul className="list-disc ml-4">
                {role.duties.map((duty, i) => <li key={i}>{duty}</li>)}
              </ul>
            </div>
          )}
          {member && <p><strong>Assigned to:</strong> {member.firstname} {member.surname}</p>}
        </div>
      </details>
    </div>
  );
}

// Back to team button component
function BackToTeamButton({ teamName, onClick }: { teamName: string; onClick: () => void }) {
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
      aria-label={`Return to ${teamName} team view`}
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
