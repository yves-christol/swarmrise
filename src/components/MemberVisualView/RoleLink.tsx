import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRoleStroke } from "../../utils/roleTypeColors";
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

      {/* Role type badge (for special roles) */}
      {role.roleType && (
        <g>
          <circle
            cx={x + radius * 0.65}
            cy={y - radius * 0.65}
            r={7}
            fill={strokeColor}
          />
          {/* Star icon for leader */}
          {role.roleType === "leader" && (
            <g transform={`translate(${x + radius * 0.65}, ${y - radius * 0.65}) scale(0.35)`}>
              <path
                d="M0,-8 L1.8,-2.5 L7.6,-2.5 L2.9,1.5 L4.7,7 L0,3.5 L-4.7,7 L-2.9,1.5 L-7.6,-2.5 L-1.8,-2.5 Z"
                fill="white"
              />
            </g>
          )}
          {/* Feather icon for secretary */}
          {role.roleType === "secretary" && (
            <g transform={`translate(${x + radius * 0.65}, ${y - radius * 0.65}) scale(0.3)`}>
              <path
                d="M-3,10 L-3,12 L5,12 L5,10 L-3,10 M5,-12 C5,-12 -7,0 -5,8 L-3,8 C-3,8 3,-4 5,-12 M-2,6 L-4,8 L-3,8 C-2.5,7.5 -2,7 -2,6"
                fill="white"
              />
            </g>
          )}
          {/* Gavel icon for referee */}
          {role.roleType === "referee" && (
            <g transform={`translate(${x + radius * 0.65}, ${y - radius * 0.65}) scale(0.3)`}>
              <rect x="-10" y="8" width="14" height="3" rx="1" fill="white" />
              <rect x="-8" y="-8" width="16" height="6" rx="2" fill="white" transform="rotate(-45)" />
            </g>
          )}
        </g>
      )}

      {/* Role title (up to 3 lines) */}
      {(() => {
        const maxChars = Math.floor(radius / 3);
        const lines = splitTitle(role.title, maxChars);
        const lineHeight = 12;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
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
