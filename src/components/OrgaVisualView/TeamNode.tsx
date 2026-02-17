import { memo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "../../contexts/ThemeContext";
import type { GraphNode } from "./types";

type TeamNodeProps = {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  index: number;
  screenToGraph: (screenX: number, screenY: number) => { x: number; y: number };
  onSelect: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
  onDragStart: (nodeId: string) => void;
  onDrag: (nodeId: string, x: number, y: number) => void;
  onDragEnd: (nodeId: string) => void;
  onUnpin: (nodeId: string) => void;
  onZoomIn: (teamId: Id<"teams">, x: number, y: number, radius: number) => void;
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
  screenToGraph,
  onSelect: _onSelect,
  onHover,
  onDragStart,
  onDrag,
  onDragEnd,
  onUnpin,
  onZoomIn,
}: TeamNodeProps) {
  void _onSelect; // Reserved for future use (e.g., multi-select)
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation("teams");
  const { resolvedTheme } = useTheme();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const fontSize = getFontSize(node.radius);
  const displayName = truncateTeamName(node.name, node.radius);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left mouse button
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as SVGGElement;
      target.setPointerCapture(e.pointerId);

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      hasMoved.current = false;
      setIsDragging(true);
      onDragStart(node.id);
    },
    [node.id, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.stopPropagation();

      // Check if we've moved enough to consider it a drag (not just a click)
      if (dragStartPos.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved.current = true;
        }
      }

      const graphPos = screenToGraph(e.clientX, e.clientY);
      onDrag(node.id, graphPos.x, graphPos.y);
    },
    [isDragging, node.id, onDrag, screenToGraph]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.stopPropagation();

      const target = e.currentTarget as SVGGElement;
      target.releasePointerCapture(e.pointerId);

      setIsDragging(false);
      dragStartPos.current = null;
      onDragEnd(node.id);

      // If we didn't move much, treat it as a click to zoom into the team
      if (!hasMoved.current) {
        onZoomIn(node.id as Id<"teams">, node.x, node.y, node.radius);
      }
    },
    [isDragging, node.id, node.x, node.y, node.radius, onDragEnd, onZoomIn]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.isPinned) {
        onUnpin(node.id);
      }
    },
    [node.id, node.isPinned, onUnpin]
  );

  // Resolve team colour based on theme
  const teamColor = resolvedTheme === "dark" ? node.colorDark : node.colorLight;
  const teamColorRgb = teamColor
    ? `rgb(${teamColor.r}, ${teamColor.g}, ${teamColor.b})`
    : null;
  // Fill: team color at 80% transparency (0.2 opacity), fallback to default
  const fillColor = teamColor
    ? `rgba(${teamColor.r}, ${teamColor.g}, ${teamColor.b}, 0.2)`
    : "var(--diagram-node-fill)";

  // Determine stroke and fill based on state
  // Stroke: use the team color when available, thicker line
  let strokeColor = teamColorRgb ?? "var(--diagram-node-stroke)";
  let strokeWidth = 3;
  const textColor = "var(--diagram-node-text)";

  if (isDragging) {
    strokeColor = "var(--org-highlight-color, #eac840)"; // Highlight during drag
    strokeWidth = 4;
  } else if (isSelected) {
    strokeColor = "var(--org-highlight-color, #eac840)"; // Selected accent
    strokeWidth = 4;
  } else if (isHovered) {
    strokeColor = teamColorRgb ?? "var(--diagram-node-stroke-hover)";
  }

  // Scale and shadow for drag state
  const scale = isDragging ? 1.05 : 1;
  const shadowFilter = isDragging
    ? "drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))"
    : isHovered && !isSelected
    ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))"
    : "none";

  // Cursor based on state
  const cursor = isDragging ? "grabbing" : isHovered ? "grab" : "pointer";

  return (
    <g
      role="button"
      aria-label={t("diagram.teamNodeAriaLabel", { name: node.name, count: node.roleCount, pinned: node.isPinned ? t("diagram.pinned") : "" })}
      tabIndex={0}
      style={{
        cursor,
        outline: "none",
        animation: `nodeReveal 400ms ease-out both`,
        animationDelay: `${Math.min(index * 50, 500)}ms`,
        transformOrigin: `${node.x}px ${node.y}px`,
        transform: `scale(${scale})`,
        transition: isDragging ? "none" : "transform 100ms ease-out",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => !isDragging && onHover(node.id)}
      onMouseLeave={() => !isDragging && onHover(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onZoomIn(node.id as Id<"teams">, node.x, node.y, node.radius);
        }
      }}
    >
      {/* Drop shadow for hover/selected/dragging */}
      {(isHovered || isSelected || isDragging) && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius + 4}
          fill="none"
          stroke={isSelected || isDragging ? "var(--org-highlight-color, #eac840)" : "transparent"}
          strokeWidth={isSelected || isDragging ? 1 : 0}
          opacity={isSelected || isDragging ? 0.3 : 0}
          style={{
            filter:
              isDragging
                ? "drop-shadow(0 0 12px var(--diagram-golden-bee))"
                : isSelected
                ? "drop-shadow(0 0 8px var(--diagram-golden-bee))"
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
          transition: isDragging
            ? "none"
            : "fill 150ms ease-out, stroke 150ms ease-out, r 300ms ease-in-out",
          filter: shadowFilter,
        }}
      />

      {/* Pinned indicator */}
      {node.isPinned && !isDragging && (
        <g>
          <circle
            cx={node.x - node.radius * 0.7}
            cy={node.y - node.radius * 0.7}
            r={8}
            fill="var(--org-highlight-color, #eac840)"
            opacity={0.8}
          />
          <text
            x={node.x - node.radius * 0.7}
            y={node.y - node.radius * 0.7 + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            ⚓
          </text>
        </g>
      )}

      {/* Team name */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
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
            fill="var(--diagram-badge-bg)"
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
      {isHovered && !isDragging && displayName !== node.name && (
        <g>
          <rect
            x={node.x - node.name.length * 4}
            y={node.y + node.radius + 10}
            width={node.name.length * 8 + 16}
            height={24}
            rx={4}
            fill="var(--diagram-tooltip-bg)"
            stroke="var(--diagram-tooltip-border)"
            strokeWidth={1}
          />
          <text
            x={node.x}
            y={node.y + node.radius + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--diagram-tooltip-text)"
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
