import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TeamNodePosition } from "./types";

/**
 * Wrap a team name into up to three lines that fit within the circle.
 */
function wrapTeamName(name: string, radius: number): string[] {
  const maxCharsPerLine = Math.max(Math.floor((radius * 1.4) / 5), 4);

  if (name.length <= maxCharsPerLine) return [name];

  const words = name.split(/\s+/);

  if (words.length === 1) {
    if (name.length <= maxCharsPerLine * 2) {
      const mid = Math.ceil(name.length / 2);
      return [name.slice(0, mid), name.slice(mid)];
    }
    if (name.length <= maxCharsPerLine * 3) {
      const third = Math.ceil(name.length / 3);
      return [name.slice(0, third), name.slice(third, third * 2), name.slice(third * 2)];
    }
    return [
      name.slice(0, maxCharsPerLine),
      name.slice(maxCharsPerLine, maxCharsPerLine * 2 - 1) + "\u2026",
    ];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (candidate.length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      if (lines.length === 2) {
        const remaining = words.slice(i).join(" ");
        lines.push(
          remaining.length > maxCharsPerLine
            ? remaining.slice(0, maxCharsPerLine - 1) + "\u2026"
            : remaining
        );
        return lines;
      }
      currentLine = words[i];
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

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
  const nameLines = useMemo(() => wrapTeamName(team.name, radius), [team.name, radius]);
  const fontSize = 9;

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

      {/* Team name (up to 3 lines) */}
      <text
        x={x}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={fontSize}
        fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
        fontWeight={500}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {nameLines.length === 1 ? (
          <tspan x={x} y={y}>
            {nameLines[0]}
          </tspan>
        ) : nameLines.length === 2 ? (
          <>
            <tspan x={x} y={y - fontSize * 0.6}>
              {nameLines[0]}
            </tspan>
            <tspan x={x} y={y + fontSize * 0.6}>
              {nameLines[1]}
            </tspan>
          </>
        ) : (
          <>
            <tspan x={x} y={y - fontSize * 1.2}>
              {nameLines[0]}
            </tspan>
            <tspan x={x} y={y}>
              {nameLines[1]}
            </tspan>
            <tspan x={x} y={y + fontSize * 1.2}>
              {nameLines[2]}
            </tspan>
          </>
        )}
      </text>
    </g>
  );
});
