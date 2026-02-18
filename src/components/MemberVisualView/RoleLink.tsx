import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRoleStroke } from "../../utils/roleTypeColors";
import { getRoleIconPath } from "../../utils/roleIconDefaults";
import type { RoleLinkPosition } from "./types";

type RoleLinkProps = {
  position: RoleLinkPosition;
  index: number;
  onClick?: () => void;
};

function splitTitle(title: string, maxCharsPerLine: number): string[] {
  if (title.length <= maxCharsPerLine) return [title];

  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
    if (lines.length === 2) {
      // Last line: join remaining words
      const remaining = words.slice(words.indexOf(word)).join(" ");
      if (remaining.length > maxCharsPerLine) {
        return [...lines, remaining.slice(0, maxCharsPerLine - 1) + "\u2026"];
      }
      return [...lines, remaining];
    }
  }
  if (current) lines.push(current);

  // Truncate any line that's still too long (single long word)
  return lines.map((line, i) =>
    line.length > maxCharsPerLine && i === lines.length - 1
      ? line.slice(0, maxCharsPerLine - 1) + "\u2026"
      : line.length > maxCharsPerLine
        ? line.slice(0, maxCharsPerLine)
        : line
  );
}

export const RoleLink = memo(function RoleLink({
  position,
  index,
  onClick,
}: RoleLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");
  const { role, x, y, radius } = position;

  const strokeColor = getRoleStroke(role.roleType);
  const strokeWidth = 2;

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <g
      role="button"
      aria-label={t("diagram.roleClickToViewDetails", { title: role.title, type: role.roleType ? `, ${t(`roleTypes.${role.roleType}`, { ns: "members" })}` : "" })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `flowNodeReveal 400ms ease-out both`,
        animationDelay: `${150 + Math.min(index * 50, 400)}ms`,
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
          cx={x}
          cy={y}
          r={radius + 3}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.4}
          style={{
            filter: `drop-shadow(0 0 6px ${strokeColor})`,
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="var(--diagram-node-fill)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Role icon (inside circle, above title) */}
      <g
        transform={`translate(${x - 8}, ${y - radius * 0.75}) scale(0.4)`}
        style={{ pointerEvents: "none" }}
      >
        <path
          d={getRoleIconPath(role.iconKey, role.roleType)}
          fill="var(--diagram-node-text)"
        />
      </g>

      {/* Role title (up to 3 lines) */}
      {(() => {
        const maxChars = Math.floor(radius / 3);
        const lines = splitTitle(role.title, maxChars);
        const lineHeight = 12;
        const startY = y + 4 - ((lines.length - 1) * lineHeight) / 2;
        return (
          <text
            x={x}
            textAnchor="middle"
            fill="var(--diagram-node-text)"
            fontSize={10}
            fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
            fontWeight={500}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {lines.map((line, i) => (
              <tspan
                key={i}
                x={x}
                y={startY + i * lineHeight}
                dominantBaseline="central"
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })()}
    </g>
  );
});
