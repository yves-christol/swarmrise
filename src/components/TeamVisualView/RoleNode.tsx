import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRoleStroke } from "../../utils/roleTypeColors";
import { getRoleIconPath } from "../../utils/roleIconDefaults";
import type { RolePosition } from "./types";

type RoleNodeProps = {
  position: RolePosition;
  index: number;
  isDaughterTeamSource?: boolean;
  onClick?: () => void;
};

function truncateTitle(title: string, maxLength: number = 12): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 1) + "…";
}

export const RoleNode = memo(function RoleNode({
  position,
  index,
  isDaughterTeamSource,
  onClick,
}: RoleNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");
  const { role, x, y, radius, memberName } = position;

  const strokeColor = getRoleStroke(role.roleType, isDaughterTeamSource);
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

      {/* Role icon (inside circle, above title) */}
      <g
        transform={`translate(${x - 10}, ${memberName ? y - 26 : y - 20}) scale(0.5)`}
        style={{ pointerEvents: "none" }}
      >
        <path
          d={getRoleIconPath(role.iconKey, role.roleType)}
          fill="var(--diagram-node-text)"
        />
      </g>

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
        y={memberName ? y + 2 : y + 4}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--diagram-node-text)"
        fontSize={12}
        fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
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
          y={y + 16}
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
