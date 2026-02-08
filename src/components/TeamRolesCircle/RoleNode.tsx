import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RolePosition } from "./types";

type RoleNodeProps = {
  position: RolePosition;
  index: number;
  onClick?: () => void;
};

function truncateTitle(title: string, maxLength: number = 12): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 1) + "…";
}

function getRoleStroke(roleType?: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)"; // Golden-bee (theme-aware)
    case "secretary":
      return "#a2dbed"; // Wing Blue
    case "referee":
      return "#a78bfa"; // Purple-400
    default:
      return "var(--diagram-node-stroke)";
  }
}

function getRoleTypeBadgeColor(roleType: "leader" | "secretary" | "referee"): string {
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)"; // Golden-bee (theme-aware)
    case "secretary":
      return "#7dd3fc"; // Light Blue
    case "referee":
      return "#c4b5fd"; // Light Purple
  }
}

export const RoleNode = memo(function RoleNode({
  position,
  index,
  onClick,
}: RoleNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");
  const { role, x, y, radius, memberName } = position;

  const strokeColor = getRoleStroke(role.roleType);
  // All roles use same stroke width - flat organization, no visual hierarchy
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
      aria-label={t("diagram.roleNodeAriaLabel", { title: role.title, type: role.roleType ? `, ${t(`roleTypes.${role.roleType}`, { ns: "members" })}` : "", member: memberName ? `, ${t("diagram.assignedTo")} ${memberName}` : "", synced: role.linkedRoleId ? `, ${t("diagram.syncedFromParentShort")}` : "" })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${Math.min(index * 80, 600)}ms`,
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
          r={radius + 4}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.4}
          style={{
            filter: `drop-shadow(0 0 8px ${strokeColor})`,
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
          transition: "stroke 150ms ease-out, stroke-width 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Role type badge (for special roles) */}
      {role.roleType && (
        <g>
          <circle
            cx={x + radius * 0.7}
            cy={y - radius * 0.7}
            r={10}
            fill={getRoleTypeBadgeColor(role.roleType)}
          />
          {/* Star icon for leader */}
          {role.roleType === "leader" && (
            <g transform={`translate(${x + radius * 0.7}, ${y - radius * 0.7}) scale(0.5)`}>
              <path
                d="M0,-8 L1.8,-2.5 L7.6,-2.5 L2.9,1.5 L4.7,7 L0,3.5 L-4.7,7 L-2.9,1.5 L-7.6,-2.5 L-1.8,-2.5 Z"
                fill="white"
              />
            </g>
          )}
          {/* Feather/quill icon for secretary */}
          {role.roleType === "secretary" && (
            <g transform={`translate(${x + radius * 0.7}, ${y - radius * 0.7}) scale(0.45)`}>
              <path
                d="M-3,10 L-3,12 L5,12 L5,10 L-3,10 M5,-12 C5,-12 -7,0 -5,8 L-3,8 C-3,8 3,-4 5,-12 M-2,6 L-4,8 L-3,8 C-2.5,7.5 -2,7 -2,6"
                fill="white"
              />
            </g>
          )}
          {/* Gavel/mallet icon for referee */}
          {role.roleType === "referee" && (
            <g transform={`translate(${x + radius * 0.7}, ${y - radius * 0.7}) scale(0.4)`}>
              <rect x="-10" y="8" width="14" height="3" rx="1" fill="white" />
              <rect x="-8" y="-8" width="16" height="6" rx="2" fill="white" transform="rotate(-45)" />
              <rect x="-2" y="-2" width="4" height="10" rx="1" fill="white" transform="rotate(-45)" />
            </g>
          )}
        </g>
      )}

      {/* Linked role badge (for roles synced from parent team - double role pattern) */}
      {role.linkedRoleId && (
        <g>
          <circle
            cx={x - radius * 0.7}
            cy={y - radius * 0.7}
            r={9}
            fill="#64748b"
          />
          {/* Chain link icon */}
          <g transform={`translate(${x - radius * 0.7}, ${y - radius * 0.7}) scale(0.35)`}>
            <path
              d="M-8,-2 C-8,-6 -5,-8 -2,-8 L2,-8 C6,-8 8,-5 8,-2 L8,2 C8,5 6,8 2,8 L-2,8 C-5,8 -8,5 -8,2 L-8,-2 M-4,0 L4,0"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}

      {/* Role title - same typography for all roles (flat organization) */}
      <text
        x={x}
        y={memberName ? y - 6 : y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={12}
        fontFamily="'Montserrat Alternates', sans-serif"
        fontWeight={500}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {truncateTitle(role.title, Math.floor(radius / 4))}
      </text>

      {/* Member name (smaller, below title) */}
      {memberName && (
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-muted-text)"
          fontSize={10}
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {truncateTitle(memberName, Math.floor(radius / 3.5))}
        </text>
      )}

    </g>
  );
});
