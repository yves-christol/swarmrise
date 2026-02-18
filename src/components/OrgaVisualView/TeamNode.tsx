import { memo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";
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

/**
 * Wrap a team name into up to two lines that fit within the circle.
 * Returns { lines } where lines is an array of 1-2 strings.
 *
 * Strategy:
 * 1. If the full name fits on one line, use it as-is.
 * 2. Otherwise, split at the best word boundary to produce two lines.
 * 3. If the name still does not fit on two lines, truncate the second line.
 */
function wrapTeamName(
  name: string,
  radius: number
): { lines: string[] } {
  // Characters that fit on one line inside the circle (conservative estimate
  // based on average character width relative to the node radius).
  const maxCharsPerLine = Math.floor(radius / 5);

  // Single line: name fits entirely
  if (name.length <= maxCharsPerLine) {
    return { lines: [name] };
  }

  // Try to split at a word boundary near the middle or at maxCharsPerLine
  const words = name.split(/\s+/);

  // If it is a single long word, hard-split it across two lines
  if (words.length === 1) {
    const firstLine = name.slice(0, maxCharsPerLine);
    const remainder = name.slice(maxCharsPerLine);
    if (remainder.length <= maxCharsPerLine) {
      return { lines: [firstLine, remainder] };
    }
    return {
      lines: [firstLine, remainder.slice(0, maxCharsPerLine - 1) + "\u2026"],
    };
  }

  // Build the first line word by word, stopping before we exceed maxCharsPerLine
  let firstLine = "";
  let splitIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const candidate = firstLine ? firstLine + " " + words[i] : words[i];
    if (candidate.length > maxCharsPerLine && firstLine.length > 0) {
      // Adding this word would overflow -- stop here
      splitIndex = i;
      break;
    }
    firstLine = candidate;
    splitIndex = i + 1;
  }

  // If all words ended up on the first line (each word is short but total is long),
  // that means the first word alone exceeds maxCharsPerLine. Fall back to hard split.
  if (splitIndex >= words.length) {
    // All words on line 1, nothing left for line 2 -- name fit on one line after all
    // (shouldn't normally reach here, but safety check)
    return { lines: [firstLine] };
  }

  const secondLine = words.slice(splitIndex).join(" ");

  if (secondLine.length <= maxCharsPerLine) {
    return { lines: [firstLine, secondLine] };
  }

  return {
    lines: [firstLine, secondLine.slice(0, maxCharsPerLine - 1) + "\u2026"],
  };
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
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const fontSize = getFontSize(node.radius);
  const { lines: nameLines } = wrapTeamName(node.name, node.radius);

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

  // Resolve team colour
  const teamColorHex = node.color ?? null;
  // Fill: team color at 20% opacity, fallback to default
  const fillColor = teamColorHex
    ? teamColorHex + "33"
    : "var(--diagram-node-fill)";

  // Determine stroke and fill based on state
  // Stroke: use the team color when available, thicker line
  let strokeColor = teamColorHex ?? "var(--diagram-node-stroke)";
  let strokeWidth = 3;
  const textColor = "var(--diagram-node-text)";

  if (isDragging) {
    strokeColor = "var(--org-highlight-color, #eac840)"; // Highlight during drag
    strokeWidth = 4;
  } else if (isSelected) {
    strokeColor = "var(--org-highlight-color, #eac840)"; // Selected accent
    strokeWidth = 4;
  } else if (isHovered) {
    strokeColor = teamColorHex ?? "var(--diagram-node-stroke-hover)";
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

      {/* Team name (up to two lines) */}
      <text
        x={node.x}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={fontSize}
        fontFamily="var(--org-title-font, Arial, Helvetica, sans-serif)"
        fontWeight={isSelected ? 700 : 400}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          transition: "font-weight 150ms ease-out",
        }}
      >
        {nameLines.length === 1 ? (
          <tspan x={node.x} y={node.y}>
            {nameLines[0]}
          </tspan>
        ) : (
          <>
            <tspan x={node.x} y={node.y - fontSize * 0.6}>
              {nameLines[0]}
            </tspan>
            <tspan x={node.x} y={node.y + fontSize * 0.6}>
              {nameLines[1]}
            </tspan>
          </>
        )}
      </text>

    </g>
  );
});
