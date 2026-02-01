"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useLayoutEngine } from "./useLayoutEngine";
import { useViewport } from "./useViewport";
import { TeamNode } from "./TeamNode";
import { ConnectionLine } from "./ConnectionLine";
import { ZoomControls } from "./ZoomControls";
import { DetailsPanel } from "./DetailsPanel";
import { Logo } from "../Logo";
import type { GraphNode, GraphEdge } from "./types";

type OrgNetworkDiagramProps = {
  orgaId: Id<"orgas">;
};

export function OrgNetworkDiagram({ orgaId }: OrgNetworkDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);

  // Callback ref to capture SVG element
  const svgRefCallback = useCallback((node: SVGSVGElement | null) => {
    setSvgElement(node);
  }, []);

  // Fetch teams with role counts
  const teamsData = useQuery(api.teams.functions.listTeamsWithRoleCounts, {
    orgaId,
  });

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Layout engine
  const { nodes, edges, isSimulating } = useLayoutEngine(
    teamsData,
    dimensions.width,
    dimensions.height
  );

  // Viewport (pan/zoom)
  const { viewport, isPanning, handlers, controls } = useViewport(svgElement);

  // Create node map for edge lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Get selected node
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.target === svgElement) {
        setSelectedNodeId(null);
      }
    },
    [svgElement]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (e.key === "Escape") {
        setSelectedNodeId(null);
      } else if (e.key === "+" || e.key === "=") {
        controls.zoomIn();
      } else if (e.key === "-") {
        controls.zoomOut();
      } else if (e.key === "0") {
        controls.resetView();
      }
    },
    [controls]
  );

  // Loading state
  if (teamsData === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-400 text-sm">
            Loading organization structure...
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (teamsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center">
        <Logo size={64} begin={0} repeatCount={2} />
        <div>
          <h3 className="font-swarm text-xl font-bold mb-2 text-gray-100">
            No teams yet
          </h3>
          <p className="text-gray-400 max-w-sm">
            Create your first team to start mapping your organization structure.
          </p>
        </div>
      </div>
    );
  }

  const transform = `translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-dark-paper overflow-hidden"
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes nodeReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .team-node {
            animation: none;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* SVG Diagram */}
      <svg
        ref={svgRefCallback}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label={`Organization structure diagram showing ${nodes.length} teams`}
        style={{
          cursor: isPanning ? "grabbing" : "grab",
        }}
        onClick={handleBackgroundClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        {...handlers}
      >
        <title>Organization structure</title>
        <desc>
          Interactive diagram showing {nodes.length} teams and their
          relationships. Use Tab to navigate between teams, Enter to select.
        </desc>

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill="rgb(107 114 128)"
              className="text-gray-500"
            />
          </marker>
        </defs>

        {/* Transformed content group */}
        <g transform={transform}>
          {/* Connection lines (render first, below nodes) */}
          {edges.map((edge) => (
            <ConnectionLine
              key={`${edge.source}-${edge.target}`}
              edge={edge}
              nodes={nodeMap}
              isHovered={
                hoveredEdge?.source === edge.source &&
                hoveredEdge?.target === edge.target
              }
              onHover={setHoveredEdge}
            />
          ))}

          {/* Team nodes */}
          {nodes.map((node, index) => (
            <TeamNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isHovered={hoveredNodeId === node.id}
              index={index}
              onSelect={setSelectedNodeId}
              onHover={setHoveredNodeId}
            />
          ))}
        </g>
      </svg>

      {/* Zoom controls */}
      <ZoomControls
        onZoomIn={controls.zoomIn}
        onZoomOut={controls.zoomOut}
        onReset={controls.resetView}
      />

      {/* Details panel */}
      <DetailsPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />

      {/* Simulation indicator */}
      {isSimulating && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Settling...
        </div>
      )}

      {/* Accessibility: text list alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10">
        <summary className="cursor-pointer text-gray-200">
          View as text list
        </summary>
        <ul className="mt-2 text-sm text-gray-300">
          {nodes.map((node) => {
            const parentEdge = edges.find((e) => e.source === node.id);
            const parentNode = parentEdge
              ? nodeMap.get(parentEdge.target)
              : null;
            return (
              <li key={node.id} className="py-1">
                {node.name} ({node.roleCount} roles)
                {parentNode && ` - Reports to: ${parentNode.name}`}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
