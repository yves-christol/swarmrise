import { memo, useMemo } from "react";
import type { GraphNode, GraphEdge } from "./types";

type ConnectionLineProps = {
  edge: GraphEdge;
  nodes: Map<string, GraphNode>;
  isHovered: boolean;
  onHover: (edge: GraphEdge | null) => void;
};

function getEdgePoint(
  fromCenter: { x: number; y: number },
  toCenter: { x: number; y: number },
  fromRadius: number
): { x: number; y: number } {
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { x: fromCenter.x, y: fromCenter.y };
  }

  return {
    x: fromCenter.x + (dx / distance) * fromRadius,
    y: fromCenter.y + (dy / distance) * fromRadius,
  };
}

export const ConnectionLine = memo(function ConnectionLine({
  edge,
  nodes,
  isHovered,
  onHover,
}: ConnectionLineProps) {
  const sourceNode = nodes.get(edge.source);
  const targetNode = nodes.get(edge.target);

  const { startPoint, endPoint } = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return {
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 0, y: 0 },
      };
    }

    // Calculate edge-to-edge points
    const startPoint = getEdgePoint(
      { x: sourceNode.x, y: sourceNode.y },
      { x: targetNode.x, y: targetNode.y },
      sourceNode.radius
    );

    const endPoint = getEdgePoint(
      { x: targetNode.x, y: targetNode.y },
      { x: sourceNode.x, y: sourceNode.y },
      targetNode.radius
    );

    return { startPoint, endPoint };
  }, [sourceNode, targetNode]);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const strokeColor = isHovered ? "var(--diagram-golden-bee)" : "rgb(75 85 99)"; // Golden-bee (theme-aware) or gray-600
  const strokeWidth = isHovered ? 3 : 2;

  return (
    <g
      onMouseEnter={() => onHover(edge)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      {/* Invisible wider line for easier hover */}
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Visible line */}
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd="url(#arrow)"
        style={{
          transition: "stroke 150ms ease-out, stroke-width 150ms ease-out",
        }}
        role="presentation"
        aria-hidden="true"
      />
    </g>
  );
});
