import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TeamNodePosition, RoleLinkPosition } from "./types";

type TeamNodeProps = {
  position: TeamNodePosition;
  index: number;
  onNavigate?: () => void;
};

export const TeamNode = memo(function TeamNode({
  position,
  index,
  onNavigate,
}: TeamNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");
  const { team, x, y, radius, roles } = position;

  const handleClick = () => {
    onNavigate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate?.();
    }
  };

  // Calculate connection lines to roles in this team
  const connectionLines = roles.map((rolePos: RoleLinkPosition) => {
    // Calculate the point on the role circle's edge closest to team node
    const dx = x - rolePos.x;
    const dy = y - rolePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Point on role circle edge in direction of team node
    const edgeX = rolePos.x + (dx / dist) * rolePos.radius;
    const edgeY = rolePos.y + (dy / dist) * rolePos.radius;
    // Check if this is a leader connection (gold):
    // 1. Leader role connecting to its child team (master role leading child team)
    // 2. Leader role directly in this team with no child team (root team leader)
    const isLeaderToChildTeam = rolePos.role.roleType === "leader" && rolePos.childTeamId === team._id;
    const isDirectLeaderOfTeam = rolePos.role.roleType === "leader" && rolePos.teamId === team._id && !rolePos.childTeamId;
    const isGoldConnection = isLeaderToChildTeam || isDirectLeaderOfTeam;
    return { x1: x, y1: y, x2: edgeX, y2: edgeY, roleId: rolePos.role._id, isGoldConnection };
  });

  return (
    <g
      role="button"
      aria-label={t("diagram.teamClickToNavigate", { name: team.name })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `teamNodeReveal 400ms ease-out both`,
        animationDelay: `${300 + index * 60}ms`,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection lines to roles */}
      {connectionLines.map((line) => (
        <line
          key={`conn-${line.roleId}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.isGoldConnection ? "#eac840" : "var(--diagram-node-stroke)"}
          strokeWidth={line.isGoldConnection ? 2 : 1.5}
          opacity={isHovered ? 0.8 : (line.isGoldConnection ? 0.6 : 0.4)}
          style={{
            transition: "opacity 150ms ease-out",
            animation: `connectionReveal 300ms ease-out both`,
            animationDelay: `${400 + index * 60}ms`,
          }}
        />
      ))}

      {/* Hover glow */}
      {isHovered && (
        <circle
          cx={x}
          cy={y}
          r={radius + 3}
          fill="none"
          stroke="#a2dbed"
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: "drop-shadow(0 0 6px rgba(162, 219, 237, 0.5))",
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="var(--diagram-node-fill)"
        stroke={isHovered ? "#a2dbed" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Team name truncated */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={9}
        fontFamily="'Montserrat Alternates', sans-serif"
        fontWeight={500}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {team.name.length > 8 ? team.name.slice(0, 7) + "..." : team.name}
      </text>
    </g>
  );
});
