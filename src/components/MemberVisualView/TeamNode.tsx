import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TeamNodePosition } from "./types";

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
  const { team, x, y, radius } = position;

  // Resolve team colour – same pattern as OrgaVisualView/TeamNode:
  // fill at 20 % opacity, stroke at full colour
  const teamColorHex = team.color ?? null;
  const fillColor = teamColorHex
    ? teamColorHex + "33"
    : "var(--diagram-node-fill)";
  const defaultStroke = teamColorHex ?? "var(--diagram-node-stroke)";

  const handleClick = () => {
    onNavigate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate?.();
    }
  };

  return (
    <g
      role="button"
      aria-label={t("diagram.teamClickToNavigate", { name: team.name })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `flowNodeReveal 400ms ease-out both`,
        animationDelay: `${300 + index * 50}ms`,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
          r={radius + 3}
          fill="none"
          stroke={teamColorHex ?? "#a2dbed"}
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: teamColorHex
              ? `drop-shadow(0 0 6px ${teamColorHex}80)`
              : "drop-shadow(0 0 6px rgba(162, 219, 237, 0.5))",
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={fillColor}
        stroke={isHovered ? (teamColorHex ?? "#a2dbed") : defaultStroke}
        strokeWidth={2}
        style={{
          transition: "fill 150ms ease-out, stroke 150ms ease-out",
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
        fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
        fontWeight={500}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {team.name.length > 12 ? team.name.slice(0, 11) + "..." : team.name}
      </text>
    </g>
  );
});
