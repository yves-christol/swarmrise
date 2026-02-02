"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useFocus } from "../../tools/orgaStore";
import { Logo } from "../Logo";
import { RoleNode } from "./RoleNode";
import type { RolePosition } from "./types";

type TeamRolesCircleProps = {
  teamId: Id<"teams">;
  onZoomOut: () => void;
};

export function TeamRolesCircle({ teamId, onZoomOut }: TeamRolesCircleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Focus navigation for clicking into child teams
  const { focusOnTeam } = useFocus();

  // Fetch team data
  const team = useQuery(api.teams.functions.getTeamById, { teamId });

  // Fetch roles for this team
  const roles = useQuery(api.roles.functions.listRolesInTeam, { teamId });

  // Fetch child teams (subteams)
  const childTeams = useQuery(api.teams.functions.listChildTeams, { parentTeamId: teamId });

  // Fetch members to display names
  const members = useQuery(
    api.members.functions.listMembers,
    team ? { orgaId: team.orgaId } : "skip"
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

  // Create member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<string, { firstname: string; surname: string }>();
    members?.forEach((m) => map.set(m._id, { firstname: m.firstname, surname: m.surname }));
    return map;
  }, [members]);

  // Calculate role positions
  const rolePositions = useMemo(() => {
    if (!roles) return [];
    return calculateRolePlacement(roles, dimensions, memberMap);
  }, [roles, dimensions, memberMap]);

  // Calculate child team positions (outside the main circle)
  const childTeamPositions = useMemo(() => {
    if (!childTeams || childTeams.length === 0) return [];
    return calculateChildTeamPlacement(childTeams, dimensions);
  }, [childTeams, dimensions]);

  // Calculate center and radius
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const maxRadius = Math.min(dimensions.width, dimensions.height) / 2 - 40;

  // Loading state
  if (team === undefined || team === null || roles === undefined) {
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
            Loading team...
          </span>
        </div>
      </div>
    );
  }

  // Empty state - no roles
  if (roles.length === 0) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark">
        <ZoomOutButton onClick={onZoomOut} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Logo size={48} begin={0} repeatCount={2} />
          <h3 className="font-swarm text-xl font-bold text-dark dark:text-light">
            No roles yet
          </h3>
          <p className="text-gray-400 text-center max-w-xs">
            This team has no roles defined. Create your first role to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-light dark:bg-dark overflow-hidden"
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes nodeReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .role-node {
            animation: none;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Zoom out button */}
      <ZoomOutButton onClick={onZoomOut} />

      {/* Team name header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <h2 className="font-swarm text-xl font-bold text-dark dark:text-light px-4 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg backdrop-blur-sm border border-gray-300 dark:border-gray-700">
          {team.name}
        </h2>
      </div>

      {/* SVG Diagram */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        role="img"
        aria-label={`Team structure diagram for ${team.name} showing ${roles.length} roles`}
      >
        <title>{team.name} - Team Structure</title>

        {/* Outer boundary circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke="var(--diagram-node-stroke)"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.3}
        />

        {/* Inner ring guides (decorative) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.6}
          fill="none"
          stroke="var(--diagram-node-stroke)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.15}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.35}
          fill="none"
          stroke="var(--diagram-node-stroke)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.15}
        />

        {/* Role nodes */}
        {rolePositions.map((pos, index) => (
          <RoleNode
            key={pos.role._id}
            position={pos}
            index={index}
          />
        ))}

        {/* Child teams (subteams) - positioned outside the main circle */}
        {childTeamPositions.map((pos, index) => (
          <ChildTeamNode
            key={pos.team._id}
            position={pos}
            index={index}
            onZoomIn={() => focusOnTeam(pos.team._id)}
          />
        ))}
      </svg>

      {/* Accessibility: text list alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          View as text list
        </summary>
        <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {rolePositions.map((pos) => (
            <li key={pos.role._id} className="py-1">
              {pos.role.title}
              {pos.role.roleType && ` (${pos.role.roleType})`}
              {pos.memberName && ` - ${pos.memberName}`}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

// Zoom out button component
function ZoomOutButton({ onClick }: { onClick: () => void }) {
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
      aria-label="Return to organization overview"
    >
      {/* Simplified network graph icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {/* Three connected circles representing network */}
        <circle cx="10" cy="5" r="3" />
        <circle cx="5" cy="15" r="3" />
        <circle cx="15" cy="15" r="3" />
        {/* Connection lines */}
        <line x1="10" y1="8" x2="6" y2="12" />
        <line x1="10" y1="8" x2="14" y2="12" />
        <line x1="8" y1="15" x2="12" y2="15" />
      </svg>
      <span className="text-sm font-medium">Overview</span>
    </button>
  );
}

// Role type definition for internal use
type RoleData = {
  _id: Id<"roles">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  teamId: Id<"teams">;
  parentTeamId?: Id<"teams">;
  title: string;
  roleType?: "leader" | "secretary" | "referee";
  mission: string;
  duties: string[];
  memberId: Id<"members">;
};

// Calculate role positions based on their type
function calculateRolePlacement(
  roles: RoleData[],
  containerSize: { width: number; height: number },
  memberMap: Map<string, { firstname: string; surname: string }>
): RolePosition[] {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Sort roles by type for ring placement
  const leader = roles.find((r) => r.roleType === "leader");
  const secretary = roles.find((r) => r.roleType === "secretary");
  const referee = roles.find((r) => r.roleType === "referee");
  const regularRoles = roles.filter((r) => !r.roleType);

  // Ring radii
  const triangleRadius = maxRadius * 0.35; // Distance from center to each special role vertex
  const outerRing = maxRadius * 0.85; // Regular roles

  const positions: RolePosition[] = [];

  // Special roles (leader, secretary, referee) form an equilateral triangle
  // with its centroid at the center of the circle
  // Leader at top, secretary bottom-right, referee bottom-left
  const specialRoleAngles = {
    leader: -Math.PI / 2, // Top (pointing up)
    secretary: -Math.PI / 2 + (2 * Math.PI) / 3, // Bottom-right (π/6 = 30°)
    referee: -Math.PI / 2 + (4 * Math.PI) / 3, // Bottom-left (5π/6 = 150°)
  };

  if (leader) {
    const angle = specialRoleAngles.leader;
    const member = memberMap.get(leader.memberId);
    positions.push({
      role: leader,
      x: centerX + Math.cos(angle) * triangleRadius,
      y: centerY + Math.sin(angle) * triangleRadius,
      radius: 42,
      memberName: member ? `${member.firstname} ${member.surname}` : undefined,
    });
  }

  if (secretary) {
    const angle = specialRoleAngles.secretary;
    const member = memberMap.get(secretary.memberId);
    positions.push({
      role: secretary,
      x: centerX + Math.cos(angle) * triangleRadius,
      y: centerY + Math.sin(angle) * triangleRadius,
      radius: 38,
      memberName: member ? `${member.firstname} ${member.surname}` : undefined,
    });
  }

  if (referee) {
    const angle = specialRoleAngles.referee;
    const member = memberMap.get(referee.memberId);
    positions.push({
      role: referee,
      x: centerX + Math.cos(angle) * triangleRadius,
      y: centerY + Math.sin(angle) * triangleRadius,
      radius: 38,
      memberName: member ? `${member.firstname} ${member.surname}` : undefined,
    });
  }

  // Regular roles distributed on outer ring
  regularRoles.forEach((role, i) => {
    // Start from top and go clockwise
    const angle = (2 * Math.PI * i) / Math.max(regularRoles.length, 1) - Math.PI / 2;
    const member = memberMap.get(role.memberId);
    positions.push({
      role,
      x: centerX + Math.cos(angle) * outerRing,
      y: centerY + Math.sin(angle) * outerRing,
      radius: 32,
      memberName: member ? `${member.firstname} ${member.surname}` : undefined,
    });
  });

  return positions;
}

// Child team type for positioning
type ChildTeamData = {
  _id: Id<"teams">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  name: string;
};

type ChildTeamPosition = {
  team: ChildTeamData;
  x: number;
  y: number;
  radius: number;
};

// Calculate child team positions (outside the main circle)
function calculateChildTeamPlacement(
  childTeams: ChildTeamData[],
  containerSize: { width: number; height: number }
): ChildTeamPosition[] {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Position child teams outside the main circle
  const outerDistance = maxRadius + 60; // Outside the main boundary
  const childRadius = 35;

  return childTeams.map((team, i) => {
    // Distribute around the bottom half of the circle (more natural for hierarchy)
    const startAngle = Math.PI * 0.25; // Start at bottom-right
    const endAngle = Math.PI * 0.75; // End at bottom-left
    const angleRange = endAngle - startAngle;
    const angle = childTeams.length === 1
      ? Math.PI / 2 // Single child at bottom
      : startAngle + (angleRange * i) / (childTeams.length - 1);

    return {
      team,
      x: centerX + Math.cos(angle) * outerDistance,
      y: centerY + Math.sin(angle) * outerDistance,
      radius: childRadius,
    };
  });
}

// Child team node component
function ChildTeamNode({
  position,
  index,
  onZoomIn,
}: {
  position: ChildTeamPosition;
  index: number;
  onZoomIn: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { team, x, y, radius } = position;

  return (
    <g
      role="button"
      aria-label={`Subteam: ${team.name}. Click to view.`}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${600 + index * 80}ms`,
      }}
      onClick={onZoomIn}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onZoomIn();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection line to parent circle */}
      <line
        x1={position.x}
        y1={position.y - radius}
        x2={position.x}
        y2={position.y - radius - 20}
        stroke="var(--diagram-node-stroke)"
        strokeWidth={2}
        strokeDasharray="4 2"
        opacity={0.5}
      />

      {/* Hover glow */}
      {isHovered && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="#eac840"
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: "drop-shadow(0 0 8px rgba(234, 200, 64, 0.5))",
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="var(--diagram-node-fill)"
        stroke={isHovered ? "#eac840" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Subteam indicator badge */}
      <circle
        cx={x + radius * 0.6}
        cy={y - radius * 0.6}
        r={8}
        fill="#a78bfa"
      />
      <text
        x={x + radius * 0.6}
        y={y - radius * 0.6}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={9}
        fontWeight={600}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        ↓
      </text>

      {/* Team name */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={11}
        fontFamily="'Montserrat Alternates', sans-serif"
        fontWeight={500}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {team.name.length > 10 ? team.name.slice(0, 9) + "…" : team.name}
      </text>
    </g>
  );
}
