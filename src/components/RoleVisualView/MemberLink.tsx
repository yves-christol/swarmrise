import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";

type MemberLinkProps = {
  member: {
    _id: Id<"members">;
    firstname: string;
    surname: string;
    pictureURL?: string;
  };
  centerX: number;
  centerY: number;
  maxRadius: number;
  onMemberClick?: (memberId: Id<"members">) => void;
};

export function MemberLink({
  member,
  centerX,
  centerY,
  maxRadius,
  onMemberClick,
}: MemberLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("teams");

  // Position at bottom of circle, close to the outer boundary
  const linkX = centerX;
  const linkY = centerY + maxRadius + 30;
  const linkRadius = 36;

  // Calculate connection line from circle edge to member link
  const circleEdgeY = centerY + maxRadius;

  const handleClick = () => {
    onMemberClick?.(member._id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onMemberClick?.(member._id);
    }
  };

  // Get initials for avatar fallback
  const initials = `${member.firstname[0] || ""}${member.surname[0] || ""}`;

  return (
    <g
      role="button"
      aria-label={t("diagram.assignedToMember", { name: `${member.firstname} ${member.surname}` })}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: "memberLinkReveal 400ms ease-out 300ms both",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Connection line from main circle to member */}
      <line
        x1={linkX}
        y1={circleEdgeY}
        x2={linkX}
        y2={linkY - linkRadius}
        stroke={isHovered ? "var(--diagram-golden-bee)" : "var(--diagram-node-stroke)"}
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
          stroke="var(--diagram-golden-bee)"
          strokeWidth={1}
          opacity={0.5}
          style={{
            filter: "drop-shadow(0 0 8px var(--diagram-golden-bee))",
          }}
        />
      )}

      {/* Member circle background */}
      <circle
        cx={linkX}
        cy={linkY}
        r={linkRadius}
        fill="var(--diagram-node-fill)"
        stroke={isHovered ? "var(--diagram-golden-bee)" : "var(--diagram-node-stroke)"}
        strokeWidth={2}
        style={{
          transition: "stroke 150ms ease-out",
          filter: isHovered ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))" : "none",
        }}
      />

      {/* Member avatar or initials */}
      {member.pictureURL ? (
        <>
          {/* Clip path for circular image */}
          <defs>
            <clipPath id={`member-avatar-clip-${member._id}`}>
              <circle cx={linkX} cy={linkY} r={linkRadius - 3} />
            </clipPath>
          </defs>
          <image
            href={member.pictureURL}
            x={linkX - linkRadius + 3}
            y={linkY - linkRadius + 3}
            width={(linkRadius - 3) * 2}
            height={(linkRadius - 3) * 2}
            clipPath={`url(#member-avatar-clip-${member._id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <text
          x={linkX}
          y={linkY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--diagram-node-text)"
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {initials}
        </text>
      )}

      {/* Member name below circle */}
      <text
        x={linkX}
        y={linkY + linkRadius + 14}
        textAnchor="middle"
        fill="var(--diagram-muted-text)"
        fontSize={11}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {member.firstname} {member.surname}
      </text>

    </g>
  );
}
