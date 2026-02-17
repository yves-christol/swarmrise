import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";

type TeamLinkProps = {
  team: {
    _id: Id<"teams">;
    name: string;
  };
  centerX: number;
  centerY: number;
  maxRadius: number;
  onTeamClick?: () => void;
};

export function TeamLink({
  team,
  centerX,
  centerY,
  maxRadius,
  onTeamClick,
}: TeamLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");

  // Position at top of circle, symmetric to member link at bottom
  const linkX = centerX;
  const linkY = centerY - maxRadius - 30;
  const linkRadius = 36;

  // Calculate connection line from circle edge to team link
  const circleEdgeY = centerY - maxRadius;

  const handleClick = () => {
    onTeamClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTeamClick?.();
    }
  };

  // Get initials for team name (first letter of first two words, or first two letters)
  const words = team.name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase()
      : team.name.slice(0, 2).toUpperCase();

  return (
    <g
      role="button"
      aria-label={t("diagram.belongsToTeam", { name: team.name })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: "teamLinkReveal 400ms ease-out 300ms both",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection line from main circle to team */}
      <line
        x1={linkX}
        y1={circleEdgeY}
        x2={linkX}
        y2={linkY + linkRadius}
        stroke={isHovered ? "#a2dbed" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        opacity={isHovered ? 0.8 : 0.4}
        style={{ transition: "stroke 150ms ease-out, opacity 150ms ease-out" }}
      />

      {/* Hover glow effect */}
      {isHovered && (
        <circle
          cx={linkX}
          cy={linkY}
          r={linkRadius + 4}
          fill="none"
          stroke="#a2dbed"
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: "drop-shadow(0 0 8px rgba(162, 219, 237, 0.5))",
          }}
        />
      )}

      {/* Team circle background */}
      <circle
        cx={linkX}
        cy={linkY}
        r={linkRadius}
        fill="var(--diagram-node-fill)"
        stroke={isHovered ? "#a2dbed" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Team initials */}
      <text
        x={linkX}
        y={linkY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={14}
        fontWeight={600}
        fontFamily="'Montserrat Alternates', sans-serif"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {initials}
      </text>

      {/* Team name above circle */}
      <text
        x={linkX}
        y={linkY - linkRadius - 14}
        textAnchor="middle"
        fill="var(--diagram-muted-text)"
        fontSize={11}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {team.name}
      </text>
    </g>
  );
}
