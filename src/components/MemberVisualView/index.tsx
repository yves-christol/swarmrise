import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { RoleLink } from "./RoleLink";
import { TeamNode } from "./TeamNode";
import { ContactInfo } from "./ContactInfo";
import { NotFound } from "../NotFound";
import { Logo } from "../Logo";
import { useViewport } from "../shared/useViewport";
import type { MemberVisualViewProps, RoleLinkPosition, TeamNodePosition, RolesByTeam } from "./types";

// Layout constants
const AVATAR_RADIUS = 44;
const ROLE_RADIUS = 36;
const TEAM_RADIUS = 32;
const COLUMN_GAP = 180; // horizontal gap between columns
const ROLE_VERTICAL_GAP = 24; // vertical gap between role nodes within a team group
const TEAM_GROUP_GAP = 48; // vertical gap between team groups
const ARROW_HEAD_SIZE = 6;

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "Escape":
          if (showContactInfo) {
            setShowContactInfo(false);
          } else {
            onZoomOut();
          }
          break;
        case "c":
        case "C":
          setShowContactInfo((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomOut, showContactInfo]);

  // Filter out replica roles (linked roles) - only show master roles
  const masterRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((role) => !role.linkedRoleId);
  }, [roles]);

  // Build a map from master role ID -> child team info and roleType from replica
  const masterToChildTeam = useMemo(() => {
    if (!roles || !teams) return new Map<string, { _id: Id<"teams">; name: string; color?: string; roleType?: "leader" | "secretary" | "referee" }>();

    const teamMap = new Map(teams.map((t) => [t._id, t]));
    const result = new Map<string, { _id: Id<"teams">; name: string; color?: string; roleType?: "leader" | "secretary" | "referee" }>();

    for (const role of roles) {
      if (role.linkedRoleId) {
        const childTeam = teamMap.get(role.teamId);
        if (childTeam) {
          result.set(role.linkedRoleId, { _id: childTeam._id, name: childTeam.name, color: childTeam.color, roleType: role.roleType });
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

    const roleGroups = new Map<string, typeof masterRoles>();
    for (const role of masterRoles) {
      const existing = roleGroups.get(role.teamId) || [];
      existing.push(role);
      roleGroups.set(role.teamId, existing);
    }

    for (const [teamId, teamRoles] of roleGroups) {
      const team = teamMap.get(teamId as Id<"teams">);
      if (team) {
        grouped.push({ team, roles: teamRoles });
      }
    }

    return grouped;
  }, [masterRoles, teams]);

  // Calculate horizontal flow positions:
  // Column 1 (left): Avatar
  // Column 2 (center): Roles (grouped by team)
  // Column 3 (right): Teams
  const { avatarPos, rolePositions, teamPositions, contentHeight, contentWidth } = useMemo(() => {
    if (rolesByTeam.length === 0) {
      return {
        avatarPos: { x: 0, y: 0 },
        rolePositions: [] as RoleLinkPosition[],
        teamPositions: [] as TeamNodePosition[],
        contentHeight: 0,
        contentWidth: 0,
      };
    }

    // Collect all unique teams (parent teams where roles live + child teams for master roles leading child teams)
    // Stores the SAME TeamNodePosition objects that go into tPositions, so role pushes are shared
    const allTeamNodes = new Map<string, TeamNodePosition>();

    // Calculate total height needed for all role groups
    let totalRolesHeight = 0;
    const groupHeights: number[] = [];

    for (const group of rolesByTeam) {
      const groupHeight = group.roles.length * (ROLE_RADIUS * 2) + (group.roles.length - 1) * ROLE_VERTICAL_GAP;
      groupHeights.push(groupHeight);
      totalRolesHeight += groupHeight;
    }
    totalRolesHeight += (rolesByTeam.length - 1) * TEAM_GROUP_GAP;

    // Column X positions
    const avatarX = AVATAR_RADIUS + 40;
    const roleX = avatarX + COLUMN_GAP;
    const teamX = roleX + COLUMN_GAP;

    // Total content dimensions
    const cWidth = teamX + TEAM_RADIUS + 40;
    const cHeight = Math.max(totalRolesHeight, AVATAR_RADIUS * 2) + 80;

    // Start Y position for roles (centered vertically)
    const startY = cHeight / 2 - totalRolesHeight / 2;

    const rPositions: RoleLinkPosition[] = [];
    const tPositions: TeamNodePosition[] = [];

    let currentY = startY;

    for (let gi = 0; gi < rolesByTeam.length; gi++) {
      const group = rolesByTeam[gi];
      const groupHeight = groupHeights[gi];
      const groupCenterY = currentY + groupHeight / 2;

      // Create the parent team node position
      const parentTeamNode: TeamNodePosition = {
        team: { _id: group.team._id, _creationTime: group.team._creationTime, orgaId: group.team.orgaId, name: group.team.name, color: group.team.color },
        x: teamX,
        y: groupCenterY,
        radius: TEAM_RADIUS,
        roles: [],
      };

      // Store for deduplication (a team may appear both as parent and child)
      if (!allTeamNodes.has(group.team._id)) {
        allTeamNodes.set(group.team._id, parentTeamNode);
        tPositions.push(parentTeamNode);
      }

      // Position each role in this group
      for (let ri = 0; ri < group.roles.length; ri++) {
        const role = group.roles[ri];
        const roleY = currentY + ri * (ROLE_RADIUS * 2 + ROLE_VERTICAL_GAP) + ROLE_RADIUS;

        // Propagate roleType from replica if needed
        const childTeam = masterToChildTeam.get(role._id);
        const effectiveRoleType = role.roleType || childTeam?.roleType;
        const displayRole = effectiveRoleType !== role.roleType
          ? { ...role, roleType: effectiveRoleType }
          : role;

        const pos: RoleLinkPosition = {
          role: displayRole,
          x: roleX,
          y: roleY,
          radius: ROLE_RADIUS,
          teamId: group.team._id,
          childTeamId: childTeam?._id,
        };
        rPositions.push(pos);

        // Link role to its parent team node (allTeamNodes stores the same ref as tPositions)
        const parentEntry = allTeamNodes.get(group.team._id);
        if (parentEntry) {
          parentEntry.roles.push(pos);
        }

        // If this role leads a child team, create a child team node too
        if (childTeam && !allTeamNodes.has(childTeam._id)) {
          // Position child team slightly below the parent team, offset vertically
          const childTeamNode: TeamNodePosition = {
            team: { _id: childTeam._id, _creationTime: 0, orgaId: "" as Id<"orgas">, name: childTeam.name, color: childTeam.color },
            x: teamX,
            y: roleY + TEAM_RADIUS + ROLE_VERTICAL_GAP,
            radius: TEAM_RADIUS,
            roles: [pos],
          };
          allTeamNodes.set(childTeam._id, childTeamNode);
          tPositions.push(childTeamNode);
        } else if (childTeam) {
          // Team already exists, add this role to its connections
          const entry = allTeamNodes.get(childTeam._id);
          if (entry) {
            entry.roles.push(pos);
          }
        }
      }

      currentY += groupHeight + TEAM_GROUP_GAP;
    }

    // Resolve team node vertical overlaps (e.g., parent + child team at same Y)
    const MIN_TEAM_SPACING = TEAM_RADIUS * 2 + 16;
    tPositions.sort((a, b) => a.y - b.y);
    for (let i = 1; i < tPositions.length; i++) {
      const gap = tPositions[i].y - tPositions[i - 1].y;
      if (gap < MIN_TEAM_SPACING) {
        tPositions[i].y = tPositions[i - 1].y + MIN_TEAM_SPACING;
      }
    }

    // Recalculate content height to account for any shifted team nodes
    const maxTeamBottom = tPositions.length > 0
      ? Math.max(...tPositions.map((t) => t.y + t.radius))
      : 0;
    const adjustedHeight = Math.max(cHeight, maxTeamBottom + 40);

    // Avatar position: left column, vertically centered with all content
    const aPos = { x: avatarX, y: adjustedHeight / 2 };

    return {
      avatarPos: aPos,
      rolePositions: rPositions,
      teamPositions: tPositions,
      contentHeight: adjustedHeight,
      contentWidth: cWidth,
    };
  }, [rolesByTeam, masterToChildTeam]);

  // Calculate viewport offset to center the content in the container
  const viewportCenterOffset = useMemo(() => {
    if (contentWidth === 0 || contentHeight === 0) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (dimensions.width - contentWidth) / 2),
      y: Math.max(0, (dimensions.height - contentHeight) / 2),
    };
  }, [dimensions, contentWidth, contentHeight]);

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
                className="animate-spin h-8 w-8 text-text-secondary"
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
              <span className="text-text-description text-sm">
                {t("diagram.loadingMember")}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty state: member has no roles
  const isEmpty = masterRoles.length === 0;

  if (isEmpty) {
    return (
      <div ref={containerRef} className="absolute inset-0 bg-light dark:bg-dark overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          {/* Member avatar - clickable to show contact info */}
          <button
            className="relative cursor-pointer bg-transparent border-none p-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a2dbed] focus-visible:ring-offset-2 focus-visible:ring-offset-light dark:focus-visible:ring-offset-dark"
            onClick={() => setShowContactInfo((prev) => !prev)}
            aria-label={t("viewContactInfo")}
          >
            {member.pictureURL ? (
              <img
                src={member.pictureURL}
                alt={`${member.firstname} ${member.surname}`}
                className="w-24 h-24 rounded-full object-cover border-3 border-[#a2dbed] hover:shadow-lg transition-shadow"
              />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-surface-tertiary border-3 border-[#a2dbed] hover:shadow-lg transition-shadow">
                <span className="font-title text-2xl font-semibold text-dark dark:text-light">
                  {member.firstname[0] || ""}{member.surname[0] || ""}
                </span>
              </div>
            )}
          </button>
          <h2 className="text-xl font-semibold text-dark dark:text-light">
            {member.firstname} {member.surname}
          </h2>
          <Logo size={36} begin={0} repeatCount={2} />
          <p className="text-text-secondary text-sm text-center max-w-xs">
            {t("noRolesAssigned")}
          </p>
        </div>

        {/* Keyboard hints */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-text-description font-mono text-[10px]">C</kbd>
            <span>{t("diagram.keyboardContact")}</span>
          </span>
        </div>

        {showContactInfo && <ContactInfo member={member} onClose={() => setShowContactInfo(false)} />}
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
        @keyframes flowNodeReveal {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes flowArrowReveal {
          from {
            opacity: 0;
            stroke-dashoffset: 500;
          }
          to {
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }

        @keyframes flowAvatarReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes flowContentFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .flow-avatar {
          animation: flowAvatarReveal 400ms ease-out 100ms both;
        }

        .flow-arrow {
          stroke-dasharray: 500;
          animation: flowArrowReveal 400ms ease-out both;
        }

        .flow-content {
          animation: flowContentFadeIn 300ms ease-out 200ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .flow-avatar,
          .flow-content {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .flow-arrow {
            animation: none !important;
            opacity: 1 !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
          g[role="button"] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-text-description font-mono text-[10px]">C</kbd>
          <span>{t("diagram.keyboardContact")}</span>
        </span>
      </div>

      {/* Contact info modal */}
      {showContactInfo && (
        <ContactInfo member={member} onClose={() => setShowContactInfo(false)} />
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

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={ARROW_HEAD_SIZE}
            markerHeight={ARROW_HEAD_SIZE}
            refX={ARROW_HEAD_SIZE}
            refY={ARROW_HEAD_SIZE / 2}
            orient="auto"
          >
            <path
              d={`M0,0 L${ARROW_HEAD_SIZE},${ARROW_HEAD_SIZE / 2} L0,${ARROW_HEAD_SIZE}`}
              fill="var(--diagram-arrow)"
              opacity={0.6}
            />
          </marker>
          <marker
            id="arrowhead-golden"
            markerWidth={ARROW_HEAD_SIZE}
            markerHeight={ARROW_HEAD_SIZE}
            refX={ARROW_HEAD_SIZE}
            refY={ARROW_HEAD_SIZE / 2}
            orient="auto"
          >
            <path
              d={`M0,0 L${ARROW_HEAD_SIZE},${ARROW_HEAD_SIZE / 2} L0,${ARROW_HEAD_SIZE}`}
              fill="var(--diagram-golden-bee)"
              opacity={0.7}
            />
          </marker>
          {/* Avatar clip path */}
          <clipPath id={`member-avatar-clip-${member._id}`}>
            <circle cx={avatarPos.x} cy={avatarPos.y} r={AVATAR_RADIUS - 3} />
          </clipPath>
        </defs>

      <g transform={`translate(${viewport.offsetX + viewportCenterOffset.x}, ${viewport.offsetY + viewportCenterOffset.y}) scale(${viewport.scale})`}>

        {/* === ARROWS: Avatar -> Roles === */}
        {rolePositions.map((pos, index) => {
          const fromX = avatarPos.x + AVATAR_RADIUS;
          const fromY = avatarPos.y;
          const toX = pos.x - pos.radius;
          const toY = pos.y;
          // Curved path for visual elegance
          const cpX1 = fromX + (toX - fromX) * 0.4;
          const cpX2 = fromX + (toX - fromX) * 0.6;
          return (
            <path
              className="flow-arrow"
              key={`avatar-to-role-${pos.role._id}`}
              d={`M${fromX},${fromY} C${cpX1},${fromY} ${cpX2},${toY} ${toX},${toY}`}
              fill="none"
              stroke="var(--diagram-arrow)"
              strokeWidth={1.5}
              opacity={0.5}
              markerEnd="url(#arrowhead)"
              style={{
                pointerEvents: "none",
                animationDelay: `${200 + index * 40}ms`,
              }}
            />
          );
        })}

        {/* === ARROWS: Roles -> Teams === */}
        {teamPositions.map((teamPos) =>
          teamPos.roles.map((rolePos, ri) => {
            const fromX = rolePos.x + rolePos.radius;
            const fromY = rolePos.y;
            const toX = teamPos.x - teamPos.radius;
            const toY = teamPos.y;
            const cpX1 = fromX + (toX - fromX) * 0.4;
            const cpX2 = fromX + (toX - fromX) * 0.6;
            // Gold connection for leader roles connecting to their team
            const isLeaderToChildTeam = rolePos.role.roleType === "leader" && rolePos.childTeamId === teamPos.team._id;
            const isDirectLeaderOfTeam = rolePos.role.roleType === "leader" && rolePos.teamId === teamPos.team._id && !rolePos.childTeamId;
            const isGold = isLeaderToChildTeam || isDirectLeaderOfTeam;
            return (
              <path
                className="flow-arrow"
                key={`role-to-team-${rolePos.role._id}-${teamPos.team._id}`}
                d={`M${fromX},${fromY} C${cpX1},${fromY} ${cpX2},${toY} ${toX},${toY}`}
                fill="none"
                stroke={isGold ? "var(--diagram-golden-bee)" : "var(--diagram-arrow)"}
                strokeWidth={isGold ? 2 : 1.5}
                opacity={isGold ? 0.7 : 0.5}
                markerEnd={isGold ? "url(#arrowhead-golden)" : "url(#arrowhead)"}
                style={{
                  pointerEvents: "none",
                  animationDelay: `${350 + ri * 40}ms`,
                }}
              />
            );
          })
        )}

        {/* === TEAM NODES (right column) === */}
        {teamPositions.map((pos, index) => (
          <TeamNode
            key={pos.team._id}
            position={pos}
            index={index}
            onNavigate={() => onNavigateToTeam?.(pos.team._id)}
          />
        ))}

        {/* === ROLE NODES (center column) === */}
        {rolePositions.map((pos, index) => (
          <RoleLink
            key={pos.role._id}
            position={pos}
            index={index}
            onClick={() => onNavigateToRole?.(pos.role._id, pos.teamId)}
          />
        ))}

        {/* === MEMBER AVATAR (left column) === */}
        <g
          className="flow-avatar"
          role="button"
          tabIndex={0}
          aria-label={t("viewContactInfo")}
          style={{ cursor: "pointer", outline: "none" }}
          onClick={() => setShowContactInfo((prev) => !prev)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowContactInfo((prev) => !prev); } }}
          onMouseEnter={() => setIsAvatarHovered(true)}
          onMouseLeave={() => setIsAvatarHovered(false)}
          onFocus={() => setIsAvatarHovered(true)}
          onBlur={() => setIsAvatarHovered(false)}
        >
          <title>{t("viewContactInfo")}</title>

          {/* Hover glow ring */}
          {isAvatarHovered && (
            <circle
              cx={avatarPos.x}
              cy={avatarPos.y}
              r={AVATAR_RADIUS + 3}
              fill="none"
              stroke="#a2dbed"
              strokeWidth={1}
              opacity={0.5}
              style={{ filter: "drop-shadow(0 0 6px rgba(162, 219, 237, 0.5))" }}
            />
          )}

          <circle
            cx={avatarPos.x}
            cy={avatarPos.y}
            r={AVATAR_RADIUS}
            fill="var(--diagram-node-fill)"
            stroke="#a2dbed"
            strokeWidth={3}
            style={{
              transition: "filter 150ms ease-out",
              filter: isAvatarHovered ? "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))" : "none",
            }}
          />

          {/* Member avatar or initials */}
          <g className="flow-content">
            {member.pictureURL ? (
              <image
                href={member.pictureURL}
                x={avatarPos.x - AVATAR_RADIUS + 3}
                y={avatarPos.y - AVATAR_RADIUS + 3}
                width={(AVATAR_RADIUS - 3) * 2}
                height={(AVATAR_RADIUS - 3) * 2}
                clipPath={`url(#member-avatar-clip-${member._id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x={avatarPos.x}
                y={avatarPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--diagram-node-text)"
                fontSize={22}
                fontWeight={600}
                fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {initials}
              </text>
            )}
          </g>
        </g>

        {/* Member name below the avatar */}
        <text
          className="flow-content"
          x={avatarPos.x}
          y={avatarPos.y + AVATAR_RADIUS + 18}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-node-text)"
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
          style={{
            pointerEvents: "none",
            userSelect: "none",
            paintOrder: "stroke",
            stroke: "var(--diagram-bg)",
            strokeWidth: 4,
            strokeLinejoin: "round",
          }}
        >
          {member.firstname} {member.surname}
        </text>

        {/* Role count subtitle below name */}
        <text
          className="flow-content"
          x={avatarPos.x}
          y={avatarPos.y + AVATAR_RADIUS + 36}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-muted-text)"
          fontSize={11}
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
        <div className="mt-2 text-sm text-text-description space-y-2">
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
