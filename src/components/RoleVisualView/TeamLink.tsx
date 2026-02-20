import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";

type TeamLinkProps = {
  team: {
    _id: Id<"teams">;
    name: string;
    color?: string;
  };
  centerX: number;
  centerY: number;
  maxRadius: number;
  onTeamClick?: () => void;
};

/**
 * Wrap a team name into up to three lines that fit within the circle.
 * Matches the wrapping logic used by OrgaVisualView/TeamNode and
 * TeamVisualView/TeamNameText for visual consistency.
 */
function wrapTeamName(name: string, maxCharsPerLine: number): string[] {
  if (name.length <= maxCharsPerLine) {
    return [name];
  }

  const words = name.split(/\s+/);

  // Single long word: hard-split across lines
  if (words.length === 1) {
    if (name.length <= maxCharsPerLine * 2) {
      const mid = Math.ceil(name.length / 2);
      return [name.slice(0, mid), name.slice(mid)];
    }
    return [
      name.slice(0, maxCharsPerLine),
      name.slice(maxCharsPerLine, maxCharsPerLine * 2 - 1) + "\u2026",
    ];
  }

  // Build lines word by word, up to 3 lines
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (candidate.length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      if (lines.length === 2) {
        // 3rd line: take all remaining words, truncate if needed
        const remaining = words.slice(i).join(" ");
        if (remaining.length > maxCharsPerLine) {
          lines.push(remaining.slice(0, maxCharsPerLine - 1) + "\u2026");
        } else {
          lines.push(remaining);
        }
        return lines;
      }
      currentLine = words[i];
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function TeamLink({
  team,
  centerX,
  centerY,
  maxRadius,
  onTeamClick,
}: TeamLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");

  // Fill: team color at 20% opacity (80% transparency), matching OrgaVisualView and TeamVisualView
  const fillColor = team.color ? team.color + "33" : "var(--diagram-node-fill)";
  // Stroke: team color when available, matching other visual views
  const strokeColor = team.color ?? "var(--diagram-node-stroke)";

  // Position at top of circle, symmetric to member link at bottom
  const linkX = centerX;
  const linkY = centerY - maxRadius - 30;
  const linkRadius = 36;

  // Wrap team name into up to 3 lines inside the circle
  const fontSize = 10;
  const lineHeight = fontSize * 1.2;
  const maxCharsPerLine = Math.floor(linkRadius / 5); // ~7 chars, matches OrgaVisualView formula
  const nameLines = wrapTeamName(team.name, maxCharsPerLine);

  const handleClick = () => {
    onTeamClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTeamClick?.();
    }
  };

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

      {/* Team circle background - color with 80% transparency */}
      <circle
        cx={linkX}
        cy={linkY}
        r={linkRadius}
        fill={fillColor}
        stroke={isHovered ? "#a2dbed" : strokeColor}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Team name inside circle (up to 3 lines) */}
      <text
        x={linkX}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={fontSize}
        fontWeight={400}
        fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {nameLines.length === 1 ? (
          <tspan x={linkX} y={linkY}>
            {nameLines[0]}
          </tspan>
        ) : nameLines.length === 2 ? (
          <>
            <tspan x={linkX} y={linkY - lineHeight * 0.5}>
              {nameLines[0]}
            </tspan>
            <tspan x={linkX} y={linkY + lineHeight * 0.5}>
              {nameLines[1]}
            </tspan>
          </>
        ) : (
          <>
            <tspan x={linkX} y={linkY - lineHeight}>
              {nameLines[0]}
            </tspan>
            <tspan x={linkX} y={linkY}>
              {nameLines[1]}
            </tspan>
            <tspan x={linkX} y={linkY + lineHeight}>
              {nameLines[2]}
            </tspan>
          </>
        )}
      </text>
    </g>
  );
}
