"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Logo } from "../Logo";
import { RoleLink } from "./RoleLink";
import { TeamNode } from "./TeamNode";
import { ContactInfo } from "./ContactInfo";
import type { MemberFocusViewProps, RoleLinkPosition, TeamNodePosition, RolesByTeam } from "./types";

export function MemberFocusView({
  memberId,
  onZoomOut,
  onNavigateToRole,
  onNavigateToTeam,
}: MemberFocusViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Fetch member data
  const member = useQuery(api.members.functions.getMemberById, { memberId });

  // Fetch member's roles
  const roles = useQuery(api.members.functions.listMemberRoles, { memberId });

  // Fetch member's teams
  const teams = useQuery(api.members.functions.listMemberTeams, { memberId });

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
        case "c":
        case "C":
          setShowContactInfo((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomOut]);

  // Group roles by team
  const rolesByTeam = useMemo(() => {
    if (!roles || !teams) return [];

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const grouped: RolesByTeam[] = [];

    // Group roles by teamId
    const roleGroups = new Map<string, typeof roles>();
    for (const role of roles) {
      const existing = roleGroups.get(role.teamId) || [];
      existing.push(role);
      roleGroups.set(role.teamId, existing);
    }

    // Create RolesByTeam objects
    for (const [teamId, teamRoles] of roleGroups) {
      const team = teamMap.get(teamId as Id<"teams">);
      if (team) {
        grouped.push({ team, roles: teamRoles });
      }
    }

    return grouped;
  }, [roles, teams]);

  // Calculate positions
  const { rolePositions, teamPositions, centerX, centerY, maxRadius, memberRadius } = useMemo(() => {
    const cX = dimensions.width / 2;
    const cY = dimensions.height / 2;
    const mR = Math.min(dimensions.width, dimensions.height) / 2 - 60;
    const memberR = 52;
    const roleRingRadius = mR * 0.65;
    const teamRingRadius = mR * 0.95;
    const roleR = 28;
    const teamR = 22;

    if (rolesByTeam.length === 0) {
      return {
        rolePositions: [],
        teamPositions: [],
        centerX: cX,
        centerY: cY,
        maxRadius: mR,
        memberRadius: memberR,
      };
    }

    // Calculate sector angles for each team
    const teamCount = rolesByTeam.length;
    const sectorAngle = (2 * Math.PI) / teamCount;

    const rPositions: RoleLinkPosition[] = [];
    const tPositions: TeamNodePosition[] = [];

    rolesByTeam.forEach((group, teamIndex) => {
      // Team sector starts at this angle
      const sectorStart = (teamIndex * sectorAngle) - Math.PI / 2;
      const sectorMid = sectorStart + sectorAngle / 2;

      // Position roles within the sector
      const roleCount = group.roles.length;
      const roleSpread = roleCount > 1 ? sectorAngle * 0.7 : 0;
      const roleStartAngle = sectorMid - roleSpread / 2;

      const teamRolePositions: RoleLinkPosition[] = [];

      group.roles.forEach((role, roleIndex) => {
        const roleAngle = roleCount > 1
          ? roleStartAngle + (roleIndex / (roleCount - 1)) * roleSpread
          : sectorMid;

        const pos: RoleLinkPosition = {
          role,
          x: cX + Math.cos(roleAngle) * roleRingRadius,
          y: cY + Math.sin(roleAngle) * roleRingRadius,
          radius: roleR,
          teamId: group.team._id,
        };
        rPositions.push(pos);
        teamRolePositions.push(pos);
      });

      // Position team node at outer edge of sector
      tPositions.push({
        team: group.team,
        x: cX + Math.cos(sectorMid) * teamRingRadius,
        y: cY + Math.sin(sectorMid) * teamRingRadius,
        radius: teamR,
        roles: teamRolePositions,
      });
    });

    return {
      rolePositions: rPositions,
      teamPositions: tPositions,
      centerX: cX,
      centerY: cY,
      maxRadius: mR,
      memberRadius: memberR,
    };
  }, [dimensions, rolesByTeam]);

  // Loading state
  if (member === undefined || roles === undefined || teams === undefined) {
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
            Loading member...
          </span>
        </div>
      </div>
    );
  }

  // Member not found
  if (member === null) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark">
        <BackButton onClick={onZoomOut} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Logo size={48} begin={0} repeatCount={2} />
          <h3 className="font-swarm text-xl font-bold text-dark dark:text-light">
            Member not found
          </h3>
          <p className="text-gray-400 text-center max-w-xs">
            This member may have been removed from the organization.
          </p>
        </div>
      </div>
    );
  }

  // Get initials for avatar fallback
  const initials = `${member.firstname[0] || ""}${member.surname[0] || ""}`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-light dark:bg-dark overflow-hidden"
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes memberCircleReveal {
          from {
            stroke-dashoffset: 400;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes roleReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes teamNodeReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes connectionReveal {
          from {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          to {
            opacity: 0.4;
            stroke-dashoffset: 0;
          }
        }

        @keyframes outerRingReveal {
          from {
            stroke-dashoffset: 2000;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
        }

        @keyframes innerRingReveal {
          from {
            stroke-dashoffset: 1500;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.15;
          }
        }

        @keyframes contactFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes memberContentFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .member-outer-ring {
          stroke-dasharray: 2000;
          animation: outerRingReveal 600ms ease-out forwards;
        }

        .member-inner-ring {
          animation: innerRingReveal 500ms ease-out 100ms forwards;
          opacity: 0;
        }

        .member-circle {
          stroke-dasharray: 400;
          animation: memberCircleReveal 400ms ease-out 150ms forwards;
          opacity: 0;
        }

        .member-content {
          animation: memberContentFadeIn 300ms ease-out 250ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .member-outer-ring,
          .member-inner-ring,
          .member-circle {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
          .member-outer-ring { opacity: 0.3 !important; }
          .member-inner-ring { opacity: 0.15 !important; }
          .member-circle { opacity: 1 !important; }
          .member-content {
            animation: none !important;
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
      <BackButton onClick={onZoomOut} />

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">Esc</kbd>
          <span>Back</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">C</kbd>
          <span>Contact</span>
        </span>
      </div>

      {/* Contact info */}
      {showContactInfo && (
        <ContactInfo member={member} />
      )}

      {/* SVG Diagram */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        role="img"
        aria-label={`Member details for ${member.firstname} ${member.surname} showing ${roles?.length || 0} roles across ${teams?.length || 0} teams`}
      >
        <title>{member.firstname} {member.surname} - Member Details</title>

        {/* Outer boundary circle */}
        <circle
          className="member-outer-ring"
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke="#a2dbed"
          strokeWidth={2}
        />

        {/* Inner decorative ring - role ring guide */}
        <circle
          className="member-inner-ring"
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.65}
          fill="none"
          stroke="#a2dbed"
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        {/* Team nodes with connection lines */}
        {teamPositions.map((pos, index) => (
          <TeamNode
            key={pos.team._id}
            position={pos}
            index={index}
            onNavigate={() => onNavigateToTeam?.(pos.team._id)}
          />
        ))}

        {/* Role circles */}
        {rolePositions.map((pos, index) => (
          <RoleLink
            key={pos.role._id}
            position={pos}
            index={index}
            onClick={() => onNavigateToRole?.(pos.role._id, pos.teamId)}
          />
        ))}

        {/* Member circle at center */}
        <circle
          className="member-circle"
          cx={centerX}
          cy={centerY}
          r={memberRadius}
          fill="var(--diagram-node-fill)"
          stroke="#a2dbed"
          strokeWidth={3}
        />

        {/* Member avatar or initials */}
        <g className="member-content">
          {member.pictureURL ? (
            <>
              <defs>
                <clipPath id={`member-avatar-clip-${member._id}`}>
                  <circle cx={centerX} cy={centerY} r={memberRadius - 4} />
                </clipPath>
              </defs>
              <image
                href={member.pictureURL}
                x={centerX - memberRadius + 4}
                y={centerY - memberRadius + 4}
                width={(memberRadius - 4) * 2}
                height={(memberRadius - 4) * 2}
                clipPath={`url(#member-avatar-clip-${member._id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            </>
          ) : (
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--diagram-node-text)"
              fontSize={20}
              fontWeight={600}
              fontFamily="'Montserrat Alternates', sans-serif"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {initials}
            </text>
          )}
        </g>

        {/* Member name below the circle */}
        <text
          className="member-content"
          x={centerX}
          y={centerY + memberRadius + 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-node-text)"
          fontSize={16}
          fontWeight={600}
          fontFamily="'Montserrat Alternates', sans-serif"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {member.firstname} {member.surname}
        </text>

        {/* Role count subtitle */}
        <text
          className="member-content"
          x={centerX}
          y={centerY + memberRadius + 40}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-muted-text)"
          fontSize={12}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {roles?.length || 0} role{(roles?.length || 0) !== 1 ? "s" : ""} in {teams?.length || 0} team{(teams?.length || 0) !== 1 ? "s" : ""}
        </text>
      </svg>

      {/* Accessibility: screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Now viewing member: {member.firstname} {member.surname}.
        This member has {roles?.length || 0} roles across {teams?.length || 0} teams.
        Press Escape to return.
        Press C to show contact information.
      </div>

      {/* Accessibility: text alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-16 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          View member details as text
        </summary>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p><strong>Name:</strong> {member.firstname} {member.surname}</p>
          <p><strong>Email:</strong> {member.email}</p>
          <p><strong>Roles:</strong> {roles?.length || 0}</p>
          <p><strong>Teams:</strong> {teams?.length || 0}</p>
          {roles && roles.length > 0 && (
            <div>
              <strong>Role list:</strong>
              <ul className="list-disc ml-4">
                {roles.map((role) => (
                  <li key={role._id}>
                    {role.title}
                    {role.roleType && ` (${role.roleType})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

// Back button component
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
      {/* Role circle icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="4" fill="currentColor" fillOpacity="0.3" />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
  );
}
