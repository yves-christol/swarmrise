import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useFocus } from "../../tools/orgaStore";
import { Logo } from "../Logo";
import { RoleNode } from "./RoleNode";
import { NotFound } from "../NotFound";
import { useViewport } from "../shared/useViewport";
import type { RolePosition } from "./types";

type TeamVisualViewProps = {
  teamId: Id<"teams">;
  onZoomOut: () => void;
};

export function TeamVisualView({ teamId, onZoomOut }: TeamVisualViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { t } = useTranslation("teams");

  // Viewport for pinch-to-zoom and pan
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const svgRefCallback = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node;
    setSvgElement(node);
  }, []);
  const { viewport, handlers: viewportHandlers } = useViewport(svgElement);

  // Focus navigation for clicking into child teams and roles
  const { focusOnTeam, focusOnRole } = useFocus();

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

  // Set of role IDs that are source roles for daughter teams (should be styled golden)
  const daughterTeamSourceRoleIds = useMemo(() => {
    if (!linkedLeaderRoles) return new Set<string>();
    return new Set(linkedLeaderRoles.map((link) => link.sourceRoleId));
  }, [linkedLeaderRoles]);

  // Calculate center and radius
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const maxRadius = Math.min(dimensions.width, dimensions.height) / 2 - 40;
  // Outer circle is inner-tangent with role circles: roleRingRadius + ROLE_RADIUS
  const outerCircleRadius = maxRadius * 0.75 + 36;

  // Not found state - team doesn't exist or no access
  if (team === null) {
    return <NotFound entityType="team" onNavigateBack={onZoomOut} />;
  }

  // Always render container div so ResizeObserver can measure dimensions
  const isLoading = team === undefined || roles === undefined;
  const hasDimensions = dimensions.width > 0 && dimensions.height > 0;
  const isEmpty = !isLoading && roles !== undefined && roles.length === 0;

  if (isLoading || !hasDimensions || isEmpty) {
    return (
      <div ref={containerRef} className="absolute inset-0 bg-light dark:bg-dark overflow-hidden">
        {isEmpty && <ZoomOutButton onClick={onZoomOut} />}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {isLoading ? (
            <>
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
                {t("diagram.loadingTeam")}
              </span>
            </>
          ) : isEmpty ? (
            <>
              <Logo size={48} begin={0} repeatCount={2} />
              <h3 className="font-swarm text-xl font-bold text-dark dark:text-light">
                {t("diagram.noRolesYet")}
              </h3>
              <p className="text-gray-400 text-center max-w-xs">
                {t("diagram.noRolesYetDescription")}
              </p>
            </>
          ) : null}
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

        @keyframes connectionReveal {
          from {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          to {
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          g[role="button"] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .connection-line {
            animation: none !important;
            opacity: 1 !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      {/* Zoom out button */}
      <ZoomOutButton onClick={onZoomOut} />

      {/* SVG Diagram */}
      <svg
        ref={svgRefCallback}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
        role="img"
        aria-label={t("diagram.teamStructureAriaLabel", { name: team.name, count: roles.length })}
        {...viewportHandlers}
      >
        <title>{t("diagram.teamStructureTitle", { name: team.name })}</title>

      <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}>
        {/* Outer boundary circle (inner-tangent with role circles) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerCircleRadius}
          fill="none"
          stroke="var(--diagram-node-stroke)"
          strokeWidth={2}
          opacity={0.3}
        />

        {/* Team name and mission - centered inside the circle */}
        <TeamNameText
          name={team.name}
          mission={leaderRole?.mission}
          centerX={centerX}
          centerY={centerY}
          fontSize={Math.min(22, maxRadius * 0.11)}
        />

        {/* Connection lines (render first, below nodes) */}
        {parentTeamPosition && (
          <ConnectionLine
            fromX={parentTeamPosition.x}
            fromY={parentTeamPosition.y}
            toX={parentTeamPosition.leaderPosition.x}
            toY={parentTeamPosition.leaderPosition.y}
            targetRadius={36}
            animationDelay={300}
          />
        )}
        {daughterTeamPositions.map((pos, index) => (
          <ConnectionLine
            key={`link-${pos.daughterTeam._id}`}
            fromX={pos.x}
            fromY={pos.y}
            toX={pos.sourceRolePosition.x}
            toY={pos.sourceRolePosition.y}
            targetRadius={36}
            animationDelay={500 + index * 80}
          />
        ))}

        {/* Role nodes */}
        {rolePositions.map((pos, index) => (
          <RoleNode
            key={pos.role._id}
            position={pos}
            index={index}
            isDaughterTeamSource={daughterTeamSourceRoleIds.has(pos.role._id)}
            onClick={() => focusOnRole(pos.role._id, teamId, { x: pos.x, y: pos.y, radius: pos.radius })}
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
      </g>
      </svg>

      {/* Accessibility: text list alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          {t("diagram.viewAsTextList")}
        </summary>
        <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {rolePositions.map((pos) => (
            <li key={pos.role._id} className="py-1">
              {pos.role.title}
              {pos.role.roleType && ` (${t(`roleTypes.${pos.role.roleType}`, { ns: "members" })})`}
              {pos.role.linkedRoleId && ` [${t("diagram.syncedFromParent")}]`}
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
      aria-label={t("diagram.returnToOrgOverview")}
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
      <span className="text-sm font-medium">{t("diagram.overview")}</span>
    </button>
  );
}

// Team name and mission text component - name positioned higher, mission up to 3 lines
function TeamNameText({
  name,
  mission,
  centerX,
  centerY,
  fontSize,
}: {
  name: string;
  mission?: string;
  centerX: number;
  centerY: number;
  fontSize: number;
}) {
  const maxCharsPerLine = 16;
  const lineHeight = fontSize * 1.2;
  const missionFontSize = fontSize * 0.6;
  const missionLineHeight = missionFontSize * 1.3;
  const gap = 8;

  // Split name into lines (max 2 lines, truncate if needed)
  const getNameLines = (text: string): string[] => {
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

  // Split mission into lines (max 3 lines, truncate last line if needed)
  const getMissionLines = (text: string, maxLines: number = 3): string[] => {
    const missionMaxChars = Math.floor(maxCharsPerLine * 2.5); // Mission uses smaller font, so can be much wider

    // If short enough, single line
    if (text.length <= missionMaxChars) {
      return [text];
    }

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= missionMaxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;

        // Check if we've reached max lines
        if (lines.length >= maxLines - 1) {
          // This is the last line - add remaining words with truncation
          const remainingWords = words.slice(words.indexOf(word));
          const remaining = remainingWords.join(" ");
          if (remaining.length > missionMaxChars) {
            lines.push(remaining.slice(0, missionMaxChars - 1) + "…");
          } else {
            lines.push(remaining);
          }
          return lines;
        }
      }
    }

    // Don't forget the last line
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const nameLines = getNameLines(name);
  const hasMission = mission && mission.trim().length > 0;
  const missionLines = hasMission ? getMissionLines(mission.trim()) : [];

  // Calculate heights
  const nameHeight = nameLines.length * lineHeight;
  const missionHeight = missionLines.length * missionLineHeight;
  const totalHeight = hasMission
    ? nameHeight + gap + missionHeight
    : nameHeight;

  // Position name higher in the circle - offset upward from center
  // The name sits above center, with mission flowing below
  const verticalOffset = hasMission ? totalHeight * 0.15 : 0;
  const startY = centerY - totalHeight / 2 + lineHeight / 2 - verticalOffset;

  return (
    <g style={{ pointerEvents: "none", userSelect: "none" }}>
      {/* Team name - positioned higher */}
      <text
        x={centerX}
        y={startY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={fontSize}
        fontWeight={600}
        fontFamily="'Montserrat Alternates', sans-serif"
        style={{
          paintOrder: "stroke",
          stroke: "var(--diagram-bg)",
          strokeWidth: 5,
          strokeLinejoin: "round",
        }}
      >
        {nameLines.map((line, i) => (
          <tspan
            key={i}
            x={centerX}
            dy={i === 0 ? 0 : lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>

      {/* Mission - up to 3 lines below name */}
      {hasMission && missionLines.length > 0 && (
        <text
          x={centerX}
          y={startY + nameHeight + gap}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-muted-text)"
          fontSize={missionFontSize}
          fontWeight={400}
          fontFamily="Arial, Helvetica, sans-serif"
          style={{
            paintOrder: "stroke",
            stroke: "var(--diagram-bg)",
            strokeWidth: 4,
            strokeLinejoin: "round",
          }}
        >
          {missionLines.map((line, i) => (
            <tspan
              key={i}
              x={centerX}
              dy={i === 0 ? 0 : missionLineHeight}
            >
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
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

  // Place just outside the outer boundary circle (outerCircleRadius = maxRadius * 0.75 + 36)
  const outerCircleRadius = maxRadius * 0.75 + 36;
  const parentRadius = 28; // Smaller than role nodes
  const parentDistance = outerCircleRadius + 8 + parentRadius;

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

  // Place just outside the outer boundary circle (outerCircleRadius = maxRadius * 0.75 + 36)
  const outerCircleRadius = maxRadius * 0.75 + 36;
  const daughterRadius = 34; // Slightly smaller than role nodes (36)
  const daughterDistance = outerCircleRadius + 8 + daughterRadius;

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
  const { t } = useTranslation("teams");
  const { team, x, y, radius } = position;

  return (
    <g
      role="button"
      aria-label={t("diagram.parentTeamClickToNavigate", { name: team.name })}
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
      {/* Hover glow */}
      {isHovered && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="var(--diagram-golden-bee)"
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
        stroke={isHovered ? "var(--diagram-golden-bee)" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Team name */}
      <text
        x={x}
        y={y}
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
  const { t } = useTranslation("teams");
  const { daughterTeam, x, y, radius } = position;

  return (
    <g
      role="button"
      aria-label={t("diagram.daughterTeamClickToNavigate", { name: daughterTeam.name })}
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
      {/* Hover glow */}
      {isHovered && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="var(--diagram-golden-bee)"
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
        stroke={isHovered ? "var(--diagram-golden-bee)" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Team name */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-muted-text)"
        fontSize={10}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {daughterTeam.name.length > 10 ? daughterTeam.name.slice(0, 9) + "…" : daughterTeam.name}
      </text>
    </g>
  );
}

// Connection line between an external node and a role node (rendered below nodes)
function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  targetRadius,
  animationDelay,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetRadius: number;
  animationDelay: number;
}) {
  // Calculate the point on the target circle's edge closest to the source
  const dx = fromX - toX;
  const dy = fromY - toY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;
  const edgeX = toX + (dx / dist) * targetRadius;
  const edgeY = toY + (dy / dist) * targetRadius;

  return (
    <line
      className="connection-line"
      x1={fromX}
      y1={fromY}
      x2={edgeX}
      y2={edgeY}
      stroke="var(--diagram-golden-bee)"
      strokeWidth={2}
      style={{
        pointerEvents: "none",
        animation: `connectionReveal 300ms ease-out both`,
        animationDelay: `${animationDelay}ms`,
      }}
    />
  );
}
