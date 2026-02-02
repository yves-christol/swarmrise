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

  // Find the leader role to get parent team connection
  const leaderRole = roles?.find((r) => r.roleType === "leader");
  const parentTeamId = leaderRole?.parentTeamId;

  // Fetch parent team if this team has one
  const parentTeam = useQuery(
    api.teams.functions.getTeamById,
    parentTeamId ? { teamId: parentTeamId } : "skip"
  );

  // Fetch linked leader roles pointing to roles in this team (daughter teams)
  const linkedLeaderRoles = useQuery(
    api.roles.functions.getLinkedLeaderRolesForTeam,
    { teamId }
  );

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

  // Calculate parent team position (outside the circle, connected to leader)
  const parentTeamPosition = useMemo(() => {
    if (!parentTeam || !rolePositions.length) return null;
    const leaderPosition = rolePositions.find((p) => p.role.roleType === "leader");
    if (!leaderPosition) return null;
    return calculateParentTeamPlacement(parentTeam, leaderPosition, dimensions);
  }, [parentTeam, rolePositions, dimensions]);

  // Calculate daughter team positions (based on linked leader roles)
  const daughterTeamPositions = useMemo(() => {
    if (!linkedLeaderRoles || !rolePositions.length) return [];
    return calculateDaughterTeamPlacements(linkedLeaderRoles, rolePositions, dimensions);
  }, [linkedLeaderRoles, rolePositions, dimensions]);

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

        {/* Inner ring guide (decorative) - matches role ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.75}
          fill="none"
          stroke="var(--diagram-node-stroke)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.15}
        />

        {/* Team name - centered inside the circle */}
        <TeamNameText
          name={team.name}
          centerX={centerX}
          centerY={centerY}
          fontSize={Math.min(22, maxRadius * 0.11)}
        />

        {/* Role nodes */}
        {rolePositions.map((pos, index) => (
          <RoleNode
            key={pos.role._id}
            position={pos}
            index={index}
          />
        ))}

        {/* Parent team - positioned outside the main circle, connected to leader */}
        {parentTeamPosition && (
          <ParentTeamNode
            position={parentTeamPosition}
            index={0}
            onNavigate={() => focusOnTeam(parentTeamPosition.team._id)}
          />
        )}

        {/* Daughter teams - linked to source roles in this team */}
        {daughterTeamPositions.map((pos, index) => (
          <DaughterTeamNode
            key={pos.daughterTeam._id}
            position={pos}
            index={index}
            onNavigate={() => focusOnTeam(pos.daughterTeam._id)}
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
              {pos.role.linkedRoleId && " [Synced from parent team]"}
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

// Team name text component with two-line wrapping
function TeamNameText({
  name,
  centerX,
  centerY,
  fontSize,
}: {
  name: string;
  centerX: number;
  centerY: number;
  fontSize: number;
}) {
  const maxCharsPerLine = 16;
  const lineHeight = fontSize * 1.2;

  // Split name into lines (max 2 lines, truncate if needed)
  const getLines = (text: string): string[] => {
    // If short enough, single line
    if (text.length <= maxCharsPerLine) {
      return [text];
    }

    // Try to split at a space near the middle
    const words = text.split(" ");
    if (words.length === 1) {
      // Single long word - truncate to fit two lines
      if (text.length <= maxCharsPerLine * 2) {
        const mid = Math.ceil(text.length / 2);
        return [text.slice(0, mid), text.slice(mid)];
      }
      // Too long even for two lines
      return [text.slice(0, maxCharsPerLine), text.slice(maxCharsPerLine, maxCharsPerLine * 2 - 1) + "…"];
    }

    // Find best split point for two lines
    let line1 = "";
    let line2 = "";
    for (const word of words) {
      const testLine = line1 ? `${line1} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        line1 = testLine;
      } else {
        line2 = line2 ? `${line2} ${word}` : word;
      }
    }

    // Truncate line2 if needed
    if (line2.length > maxCharsPerLine) {
      line2 = line2.slice(0, maxCharsPerLine - 1) + "…";
    }

    return line2 ? [line1, line2] : [line1];
  };

  const lines = getLines(name);
  const isTwoLines = lines.length === 2;
  const yOffset = isTwoLines ? -lineHeight / 2 : 0;

  return (
    <text
      x={centerX}
      y={centerY + yOffset}
      textAnchor="middle"
      dominantBaseline="central"
      fill="var(--diagram-node-text)"
      fontSize={fontSize}
      fontWeight={600}
      fontFamily="'Montserrat Alternates', sans-serif"
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={centerX}
          dy={i === 0 ? 0 : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

// Role type definition for internal use
type RoleData = {
  _id: Id<"roles">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  teamId: Id<"teams">;
  parentTeamId?: Id<"teams">;
  linkedRoleId?: Id<"roles">; // For leader roles: points to source role in parent team (double role pattern)
  title: string;
  roleType?: "leader" | "secretary" | "referee";
  mission: string;
  duties: string[];
  memberId: Id<"members">;
};

// Calculate role positions - all roles on a single outer ring (flat organization)
function calculateRolePlacement(
  roles: RoleData[],
  containerSize: { width: number; height: number },
  memberMap: Map<string, { firstname: string; surname: string }>
): RolePosition[] {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Single ring for ALL roles - flat organization, geometric equality
  const roleRingRadius = maxRadius * 0.75;

  // All roles use the same radius - no visual hierarchy
  const ROLE_RADIUS = 36;

  // Sort roles: Leader first (for parent team connection), then secretary, referee, then regular
  // This keeps special roles grouped but doesn't give them prominence
  const sortedRoles = [
    ...roles.filter((r) => r.roleType === "leader"),
    ...roles.filter((r) => r.roleType === "secretary"),
    ...roles.filter((r) => r.roleType === "referee"),
    ...roles.filter((r) => !r.roleType),
  ];

  const totalRoles = sortedRoles.length;
  const positions: RolePosition[] = [];

  sortedRoles.forEach((role, i) => {
    // Even angular distribution, starting from top
    const angle = (2 * Math.PI * i) / Math.max(totalRoles, 1) - Math.PI / 2;
    const member = memberMap.get(role.memberId);
    positions.push({
      role,
      x: centerX + Math.cos(angle) * roleRingRadius,
      y: centerY + Math.sin(angle) * roleRingRadius,
      radius: ROLE_RADIUS,
      memberName: member ? `${member.firstname} ${member.surname}` : undefined,
    });
  });

  return positions;
}

// Parent team type for positioning
type ParentTeamData = {
  _id: Id<"teams">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  name: string;
};

type ParentTeamPosition = {
  team: ParentTeamData;
  x: number;
  y: number;
  radius: number;
  leaderPosition: { x: number; y: number };
};

// Daughter team type for positioning
type DaughterTeamData = {
  _id: Id<"teams">;
  name: string;
};

type DaughterTeamPosition = {
  daughterTeam: DaughterTeamData;
  sourceRoleId: Id<"roles">;
  x: number;
  y: number;
  radius: number;
  sourceRolePosition: { x: number; y: number };
};

// Calculate parent team position (outside the main circle, along the leader's direction)
function calculateParentTeamPlacement(
  parentTeam: ParentTeamData,
  leaderPosition: RolePosition,
  containerSize: { width: number; height: number }
): ParentTeamPosition {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Position parent team along the vector from center through leader
  const leaderAngle = Math.atan2(
    leaderPosition.y - centerY,
    leaderPosition.x - centerX
  );

  // Place outside the main circle boundary
  const parentDistance = maxRadius + 55;
  const parentRadius = 28; // Smaller than role nodes

  return {
    team: parentTeam,
    x: centerX + Math.cos(leaderAngle) * parentDistance,
    y: centerY + Math.sin(leaderAngle) * parentDistance,
    radius: parentRadius,
    leaderPosition: { x: leaderPosition.x, y: leaderPosition.y },
  };
}

// Type for linked leader role data from the API
type LinkedLeaderRoleData = {
  linkedRole: {
    _id: Id<"roles">;
    teamId: Id<"teams">;
    linkedRoleId: Id<"roles">;
    title: string;
    roleType?: "leader" | "secretary" | "referee";
  };
  sourceRoleId: Id<"roles">;
  daughterTeam: {
    _id: Id<"teams">;
    name: string;
  };
};

// Calculate daughter team positions (outside the circle, along the source role's direction)
function calculateDaughterTeamPlacements(
  linkedLeaderRoles: LinkedLeaderRoleData[],
  rolePositions: RolePosition[],
  containerSize: { width: number; height: number }
): DaughterTeamPosition[] {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Place outside the main circle boundary
  const daughterDistance = maxRadius + 55;
  const daughterRadius = 28; // Same as parent team node

  return linkedLeaderRoles.map((linked) => {
    // Find the source role position
    const sourceRolePosition = rolePositions.find((p) => p.role._id === linked.sourceRoleId);
    if (!sourceRolePosition) {
      // Fallback position at bottom if source role not found
      return {
        daughterTeam: linked.daughterTeam,
        sourceRoleId: linked.sourceRoleId,
        x: centerX,
        y: centerY + daughterDistance,
        radius: daughterRadius,
        sourceRolePosition: { x: centerX, y: centerY },
      };
    }

    // Position along the vector from center through source role
    const sourceAngle = Math.atan2(
      sourceRolePosition.y - centerY,
      sourceRolePosition.x - centerX
    );

    return {
      daughterTeam: linked.daughterTeam,
      sourceRoleId: linked.sourceRoleId,
      x: centerX + Math.cos(sourceAngle) * daughterDistance,
      y: centerY + Math.sin(sourceAngle) * daughterDistance,
      radius: daughterRadius,
      sourceRolePosition: { x: sourceRolePosition.x, y: sourceRolePosition.y },
    };
  });
}

// Parent team node component
function ParentTeamNode({
  position,
  index,
  onNavigate,
}: {
  position: ParentTeamPosition;
  index: number;
  onNavigate: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { team, x, y, radius, leaderPosition } = position;

  return (
    <g
      role="button"
      aria-label={`Parent team: ${team.name}. Click to navigate.`}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${300 + index * 80}ms`,
      }}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection line to leader role (from edge of leader circle, not center) */}
      {(() => {
        // Calculate the point on the leader circle's edge closest to parent team
        const dx = x - leaderPosition.x;
        const dy = y - leaderPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const leaderRadius = 36; // Same as ROLE_RADIUS
        // Point on leader circle edge in direction of parent team
        const edgeX = leaderPosition.x + (dx / dist) * leaderRadius;
        const edgeY = leaderPosition.y + (dy / dist) * leaderRadius;
        return (
          <line
            x1={x}
            y1={y}
            x2={edgeX}
            y2={edgeY}
            stroke="#eac840"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={isHovered ? 0.9 : 0.6}
            style={{ transition: "opacity 150ms ease-out" }}
          />
        );
      })()}

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

      {/* Up arrow indicator */}
      <text
        x={x}
        y={y - 4}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={12}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        ↑
      </text>

      {/* Team name */}
      <text
        x={x}
        y={y + 8}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-muted-text)"
        fontSize={9}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {team.name.length > 8 ? team.name.slice(0, 7) + "…" : team.name}
      </text>
    </g>
  );
}

// Daughter team node component (linked to source role in this team)
function DaughterTeamNode({
  position,
  index,
  onNavigate,
}: {
  position: DaughterTeamPosition;
  index: number;
  onNavigate: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { daughterTeam, x, y, radius, sourceRolePosition } = position;

  return (
    <g
      role="button"
      aria-label={`Daughter team: ${daughterTeam.name}. Click to navigate.`}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${500 + index * 80}ms`,
      }}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection line to source role (from edge of role circle, not center) */}
      {(() => {
        // Calculate the point on the source role circle's edge closest to daughter team
        const dx = x - sourceRolePosition.x;
        const dy = y - sourceRolePosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const roleRadius = 36; // Same as ROLE_RADIUS
        // Point on role circle edge in direction of daughter team
        const edgeX = sourceRolePosition.x + (dx / dist) * roleRadius;
        const edgeY = sourceRolePosition.y + (dy / dist) * roleRadius;
        return (
          <line
            x1={x}
            y1={y}
            x2={edgeX}
            y2={edgeY}
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={isHovered ? 0.9 : 0.6}
            style={{ transition: "opacity 150ms ease-out" }}
          />
        );
      })()}

      {/* Hover glow */}
      {isHovered && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="#a78bfa"
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: "drop-shadow(0 0 8px rgba(167, 139, 250, 0.5))",
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="var(--diagram-node-fill)"
        stroke={isHovered ? "#a78bfa" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Down arrow indicator */}
      <text
        x={x}
        y={y - 4}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={12}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        ↓
      </text>

      {/* Team name */}
      <text
        x={x}
        y={y + 8}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-muted-text)"
        fontSize={9}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {daughterTeam.name.length > 8 ? daughterTeam.name.slice(0, 7) + "…" : daughterTeam.name}
      </text>
    </g>
  );
}
