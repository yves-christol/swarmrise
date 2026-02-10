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
        {team.name.length > 12 ? team.name.slice(0, 11) + "..." : team.name}
      </text>
    </g>
  );
});
