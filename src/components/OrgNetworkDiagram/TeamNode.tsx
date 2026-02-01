import { memo } from "react";
import type { GraphNode } from "./types";

type TeamNodeProps = {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  index: number;
  onSelect: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
};

function truncateTeamName(name: string, radius: number): string {
  const maxChars = Math.floor(radius / 5);
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 1) + "...";
}

function getFontSize(radius: number): number {
  if (radius <= 50) return 12;
  if (radius <= 70) return 14;
  if (radius <= 100) return 16;
  return 18;
}

export const TeamNode = memo(function TeamNode({
  node,
  isSelected,
  isHovered,
  index,
  onSelect,
  onHover,
}: TeamNodeProps) {
  const fontSize = getFontSize(node.radius);
  const displayName = truncateTeamName(node.name, node.radius);

  // Determine stroke and fill based on state
  let strokeColor = "rgb(156 163 175)"; // gray-400
  let strokeWidth = 2;
  const fillColor = "rgb(31 41 55)"; // gray-800 for dark mode

  if (isSelected) {
    strokeColor = "#eac840"; // Bee Gold
    strokeWidth = 3;
  } else if (isHovered) {
    strokeColor = "rgb(107 114 128)"; // gray-500
  }

  return (
    <g
      role="button"
      aria-label={`${node.name}, ${node.roleCount} roles`}
      tabIndex={0}
      style={{
        cursor: "pointer",
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${Math.min(index * 50, 500)}ms`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      {/* Drop shadow for hover/selected */}
      {(isHovered || isSelected) && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius + 4}
          fill="none"
          stroke={isSelected ? "#eac840" : "transparent"}
          strokeWidth={isSelected ? 1 : 0}
          opacity={isSelected ? 0.3 : 0}
          style={{
            filter: isSelected
              ? "drop-shadow(0 0 8px rgba(234, 200, 64, 0.4))"
              : isHovered
              ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))"
              : "none",
          }}
        />
      )}

      {/* Main circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          transition: "fill 150ms ease-out, stroke 150ms ease-out, r 300ms ease-in-out",
          filter: isHovered && !isSelected
            ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))"
            : "none",
        }}
      />

      {/* Team name */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgb(229 231 235)" // gray-200
        fontSize={fontSize}
        fontFamily="'Montserrat Alternates', sans-serif"
        fontWeight={isSelected ? 700 : 400}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          transition: "font-weight 150ms ease-out",
        }}
      >
        {displayName}
      </text>

      {/* Role count badge */}
      {node.roleCount > 0 && (
        <g>
          <circle
            cx={node.x + node.radius * 0.7}
            cy={node.y - node.radius * 0.7}
            r={12}
            fill="rgb(139 92 246)" // purple-500
          />
          <text
            x={node.x + node.radius * 0.7}
            y={node.y - node.radius * 0.7}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            fontWeight={600}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {node.roleCount}
          </text>
        </g>
      )}

      {/* Full name tooltip on hover */}
      {isHovered && displayName !== node.name && (
        <g>
          <rect
            x={node.x - node.name.length * 4}
            y={node.y + node.radius + 10}
            width={node.name.length * 8 + 16}
            height={24}
            rx={4}
            fill="rgb(17 24 39)" // gray-900
            stroke="rgb(75 85 99)" // gray-600
            strokeWidth={1}
          />
          <text
            x={node.x}
            y={node.y + node.radius + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgb(229 231 235)" // gray-200
            fontSize={12}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {node.name}
          </text>
        </g>
      )}
    </g>
  );
});
