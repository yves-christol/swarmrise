import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { useClerk } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSelectedOrga } from "../../tools/orgaStore";
import { RoleLink } from "./RoleLink";
import { TeamNode } from "./TeamNode";
import { ContactInfo } from "./ContactInfo";
import { NotFound } from "../NotFound";
import { useViewport } from "../shared/useViewport";
import type { MemberVisualViewProps, RoleLinkPosition, TeamNodePosition, RolesByTeam } from "./types";

export function MemberVisualView({
  memberId,
  onZoomOut,
  onNavigateToRole,
  onNavigateToTeam,
}: MemberVisualViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const { t } = useTranslation("members");

  // Viewport for pinch-to-zoom and pan
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const svgRefCallback = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node;
    setSvgElement(node);
  }, []);
  const { viewport, handlers: viewportHandlers } = useViewport(svgElement);
  const { myMember } = useSelectedOrga();
  const clerk = useClerk();
  const isOwnPage = myMember?._id === memberId;

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

  // Filter out replica roles (linked roles) - only show master roles
  // Replica roles have linkedRoleId set, pointing to their master in the parent team
  const masterRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((role) => !role.linkedRoleId);
  }, [roles]);

  // Build a map from master role ID -> child team info and roleType from replica
  // This maps master roles to the child teams they lead (via their replica/linked roles)
  // Also captures the roleType from the replica role (e.g., "leader") to propagate to the master role display
  const masterToChildTeam = useMemo(() => {
    if (!roles || !teams) return new Map<string, { _id: Id<"teams">; name: string; roleType?: "leader" | "secretary" | "referee" }>();

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const result = new Map<string, { _id: Id<"teams">; name: string; roleType?: "leader" | "secretary" | "referee" }>();

    // Find replica roles and map their linkedRoleId to their team (the child team)
    // Also capture the roleType from the replica role
    for (const role of roles) {
      if (role.linkedRoleId) {
        const childTeam = teamMap.get(role.teamId);
        if (childTeam) {
          result.set(role.linkedRoleId, { _id: childTeam._id, name: childTeam.name, roleType: role.roleType });
        }
      }
    }

    return result;
  }, [roles, teams]);

  // Group roles by team
  const rolesByTeam = useMemo(() => {
    if (!masterRoles.length || !teams) return [];

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const grouped: RolesByTeam[] = [];

    // Group roles by teamId
    const roleGroups = new Map<string, typeof masterRoles>();
    for (const role of masterRoles) {
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
  }, [masterRoles, teams]);

  // Calculate positions
  const { rolePositions, teamPositions, centerX, centerY, maxRadius, memberRadius } = useMemo(() => {
    const cX = dimensions.width / 2;
    const cY = dimensions.height / 2;
    const mR = Math.min(dimensions.width, dimensions.height) / 2 - 60;
    const memberR = 52;
    const roleRingRadius = mR * 0.65;
    const teamRingRadius = mR * 0.95;
    const roleR = 36;
    const teamR = 32;

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

    // Collect all teams that need to be displayed (parent teams + child teams for master roles)
    const allTeams = new Map<string, { _id: Id<"teams">; name: string }>();
    for (const group of rolesByTeam) {
      allTeams.set(group.team._id, { _id: group.team._id, name: group.team.name });
    }
    // Add child teams from masterToChildTeam map
    for (const [, childTeam] of masterToChildTeam) {
      if (!allTeams.has(childTeam._id)) {
        allTeams.set(childTeam._id, childTeam);
      }
    }

    // Calculate sector angles for all teams
    const allTeamsList = Array.from(allTeams.values());
    const teamCount = allTeamsList.length;
    const sectorAngle = (2 * Math.PI) / teamCount;

    // Create a map for team positions by team ID
    const teamPositionMap = new Map<string, TeamNodePosition>();

    const rPositions: RoleLinkPosition[] = [];
    const tPositions: TeamNodePosition[] = [];

    // First pass: create all team positions
    allTeamsList.forEach((team, teamIndex) => {
      const sectorMid = (teamIndex * sectorAngle) - Math.PI / 2;
      const teamPos: TeamNodePosition = {
        team: { _id: team._id, _creationTime: 0, orgaId: "" as Id<"orgas">, name: team.name },
        x: cX + Math.cos(sectorMid) * teamRingRadius,
        y: cY + Math.sin(sectorMid) * teamRingRadius,
        radius: teamR,
        roles: [],
      };
      teamPositionMap.set(team._id, teamPos);
      tPositions.push(teamPos);
    });

    // Second pass: position roles and link them to teams
    rolesByTeam.forEach((group) => {
      const teamPos = teamPositionMap.get(group.team._id);
      if (!teamPos) return;

      // Calculate the team's angle from its position
      const teamAngle = Math.atan2(teamPos.y - cY, teamPos.x - cX);

      // Position roles near their parent team
      const roleCount = group.roles.length;
      const roleSpread = roleCount > 1 ? sectorAngle * 0.7 : 0;
      const roleStartAngle = teamAngle - roleSpread / 2;

      group.roles.forEach((role, roleIndex) => {
        const roleAngle = roleCount > 1
          ? roleStartAngle + (roleIndex / (roleCount - 1)) * roleSpread
          : teamAngle;

        // Check if this role has a child team (via replica/linked role)
        const childTeam = masterToChildTeam.get(role._id);

        // If this master role has a replica role that's a leader of a child team,
        // propagate the roleType from the replica to ensure the golden ring is shown
        const effectiveRoleType = role.roleType || childTeam?.roleType;
        const displayRole = effectiveRoleType !== role.roleType
          ? { ...role, roleType: effectiveRoleType }
          : role;

        const pos: RoleLinkPosition = {
          role: displayRole,
          x: cX + Math.cos(roleAngle) * roleRingRadius,
          y: cY + Math.sin(roleAngle) * roleRingRadius,
          radius: roleR,
          teamId: group.team._id,
          childTeamId: childTeam?._id,
        };
        rPositions.push(pos);
        teamPos.roles.push(pos);

        // If this role has a child team, also add it to the child team's role list
        if (childTeam) {
          const childTeamPos = teamPositionMap.get(childTeam._id);
          if (childTeamPos) {
            childTeamPos.roles.push(pos);
          }
        }
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
  }, [dimensions, rolesByTeam, masterToChildTeam]);

  // Member not found
  if (member === null) {
    return <NotFound entityType="member" onNavigateBack={onZoomOut} />;
  }

  // Always render containerRef so ResizeObserver can measure dimensions
  const isLoading = member === undefined || roles === undefined || teams === undefined;
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
                {t("diagram.loadingMember")}
              </span>
            </div>
          </div>
        )}
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
            opacity: 1;
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
          .member-circle {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
          .member-outer-ring { opacity: 0.3 !important; }
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
          .connection-line {
            animation: none !important;
            opacity: 1 !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono text-[10px]">C</kbd>
          <span>{t("diagram.keyboardContact")}</span>
        </span>
      </div>

      {/* Contact info */}
      {showContactInfo && (
        <ContactInfo member={member} />
      )}

      {/* SVG Diagram */}
      <svg
        ref={svgRefCallback}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
        role="img"
        aria-label={t("diagram.memberDetailsAriaLabel", { name: `${member.firstname} ${member.surname}`, roleCount: masterRoles.length, teamCount: teams?.length || 0 })}
        {...viewportHandlers}
      >
        <title>{t("diagram.memberDetailsTitle", { name: `${member.firstname} ${member.surname}` })}</title>

      <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}>
        {/* Outer boundary circle - encompasses roles but not teams */}
        <circle
          className="member-outer-ring"
          cx={centerX}
          cy={centerY}
          r={maxRadius * 0.80}
          fill="none"
          stroke="#a2dbed"
          strokeWidth={2}
        />

        {/* Connection lines (render first, below nodes) */}
        {teamPositions.map((pos, teamIndex) =>
          pos.roles.map((rolePos) => {
            // Calculate the point on the role circle's edge closest to team node
            const dx = pos.x - rolePos.x;
            const dy = pos.y - rolePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;
            const edgeX = rolePos.x + (dx / dist) * rolePos.radius;
            const edgeY = rolePos.y + (dy / dist) * rolePos.radius;
            // Check if this is a leader connection (gold):
            // 1. Leader role connecting to its child team (master role leading child team)
            // 2. Leader role directly in this team with no child team (root team leader)
            const isLeaderToChildTeam = rolePos.role.roleType === "leader" && rolePos.childTeamId === pos.team._id;
            const isDirectLeaderOfTeam = rolePos.role.roleType === "leader" && rolePos.teamId === pos.team._id && !rolePos.childTeamId;
            const isGoldConnection = isLeaderToChildTeam || isDirectLeaderOfTeam;
            return (
              <line
                className="connection-line"
                key={`conn-${pos.team._id}-${rolePos.role._id}`}
                x1={pos.x}
                y1={pos.y}
                x2={edgeX}
                y2={edgeY}
                stroke={isGoldConnection ? "var(--diagram-golden-bee)" : "var(--diagram-node-stroke)"}
                strokeWidth={isGoldConnection ? 2 : 1.5}
                style={{
                  pointerEvents: "none",
                  animation: `connectionReveal 300ms ease-out both`,
                  animationDelay: `${400 + teamIndex * 60}ms`,
                }}
              />
            );
          })
        )}

        {/* Team nodes */}
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

        {/* Member circle at center - interactive when viewing own page */}
        <g
          role={isOwnPage ? "button" : undefined}
          tabIndex={isOwnPage ? 0 : undefined}
          aria-label={isOwnPage ? t("diagram.manageAccount") : undefined}
          style={{ cursor: isOwnPage ? "pointer" : "default", outline: "none" }}
          onClick={isOwnPage ? () => clerk.openUserProfile() : undefined}
          onKeyDown={isOwnPage ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clerk.openUserProfile(); } } : undefined}
          onMouseEnter={isOwnPage ? () => setIsAvatarHovered(true) : undefined}
          onMouseLeave={isOwnPage ? () => setIsAvatarHovered(false) : undefined}
          onFocus={isOwnPage ? () => setIsAvatarHovered(true) : undefined}
          onBlur={isOwnPage ? () => setIsAvatarHovered(false) : undefined}
        >
          {isOwnPage && <title>{t("diagram.manageAccount")}</title>}

          {/* Hover glow ring */}
          {isAvatarHovered && (
            <circle
              cx={centerX}
              cy={centerY}
              r={memberRadius + 3}
              fill="none"
              stroke="#a2dbed"
              strokeWidth={1}
              opacity={0.5}
              style={{ filter: "drop-shadow(0 0 6px rgba(162, 219, 237, 0.5))" }}
            />
          )}

          <circle
            className="member-circle"
            cx={centerX}
            cy={centerY}
            r={memberRadius}
            fill="var(--diagram-node-fill)"
            stroke="#a2dbed"
            strokeWidth={3}
            style={{
              transition: "filter 150ms ease-out",
              filter: isAvatarHovered ? "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))" : "none",
            }}
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
          style={{
            pointerEvents: "none",
            userSelect: "none",
            paintOrder: "stroke",
            stroke: "var(--diagram-bg)",
            strokeWidth: 5,
            strokeLinejoin: "round",
          }}
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
          style={{
            pointerEvents: "none",
            userSelect: "none",
            paintOrder: "stroke",
            stroke: "var(--diagram-bg)",
            strokeWidth: 4,
            strokeLinejoin: "round",
          }}
        >
          {t("diagram.rolesInTeams", { roleCount: masterRoles.length, teamCount: teams?.length || 0, count: masterRoles.length })}
        </text>
      </g>
      </svg>

      {/* Accessibility: screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {t("diagram.srMemberAnnouncement", { name: `${member.firstname} ${member.surname}`, roleCount: masterRoles.length, teamCount: teams?.length || 0 })}
      </div>

      {/* Accessibility: text alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-16 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          {t("diagram.viewMemberDetailsAsText")}
        </summary>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p><strong>{t("diagram.textName")}</strong> {member.firstname} {member.surname}</p>
          <p><strong>{t("diagram.textEmail")}</strong> {member.email}</p>
          <p><strong>{t("diagram.textRoles")}</strong> {masterRoles.length}</p>
          <p><strong>{t("diagram.textTeams")}</strong> {teams?.length || 0}</p>
          {masterRoles.length > 0 && (
            <div>
              <strong>{t("diagram.textRoleList")}</strong>
              <ul className="list-disc ml-4">
                {masterRoles.map((role) => (
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

