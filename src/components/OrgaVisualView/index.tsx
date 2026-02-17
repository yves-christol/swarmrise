import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useFocus } from "../../tools/orgaStore";
import { useLayoutEngine } from "./useLayoutEngine";
import { useViewport } from "./useViewport";
import { TeamNode } from "./TeamNode";
import { ConnectionLine } from "./ConnectionLine";
import { ZoomControls } from "./ZoomControls";
import { DetailsPanel } from "./DetailsPanel";
import { Logo } from "../Logo";
import type { GraphNode, GraphEdge } from "./types";

type OrgaVisualViewProps = {
  orgaId: Id<"orgas">;
  /** Register a lookup function so FocusContainer can find node screen positions for zoom-out */
  onRegisterNodePositionLookup?: (
    lookup: (teamId: string) => { x: number; y: number; radius: number } | null
  ) => void;
};

export function OrgaVisualView({ orgaId, onRegisterNodePositionLookup }: OrgaVisualViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const { t } = useTranslation("teams");

  // Focus navigation
  const { focusOnTeam, returnFromTeamId, clearReturnFromTeamId } = useFocus();

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
  const { nodes, edges, isSimulating, dragHandlers } = useLayoutEngine(
    teamsData,
    dimensions.width,
    dimensions.height
  );

  // Viewport (pan/zoom)
  const { viewport, isPanning, handlers, controls } = useViewport(svgElement);

  // Handle team zoom (click on team node to focus)
  // Receives node position for zoom animation origin
  const handleTeamZoom = useCallback(
    (teamId: Id<"teams">, nodeX: number, nodeY: number, nodeRadius: number) => {
      // Convert node coordinates to screen coordinates
      const screenX = nodeX * viewport.scale + viewport.offsetX;
      const screenY = nodeY * viewport.scale + viewport.offsetY;
      const screenRadius = nodeRadius * viewport.scale;

      focusOnTeam(teamId, { x: screenX, y: screenY, radius: screenRadius });
    },
    [focusOnTeam, viewport.scale, viewport.offsetX, viewport.offsetY]
  );

  // Create node map for edge lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Get selected node
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;

  // Register node position lookup for FocusContainer (zoom-out targeting)
  // This allows the parent to query where a team node is on screen.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (!onRegisterNodePositionLookup) return;

    const lookup = (teamId: string): { x: number; y: number; radius: number } | null => {
      const node = nodesRef.current.find((n) => n.id === teamId);
      if (!node) return null;
      const vp = viewportRef.current;
      // Convert graph coordinates to screen coordinates relative to the container
      return {
        x: node.x * vp.scale + vp.offsetX,
        y: node.y * vp.scale + vp.offsetY,
        radius: node.radius * vp.scale,
      };
    };

    onRegisterNodePositionLookup(lookup);
  }, [onRegisterNodePositionLookup, nodes, viewport]);

  // Center on the team we returned from (after zooming out from TeamRolesCircle)
  // Uses useLayoutEffect to adjust viewport before paint, preventing a flash of wrong position
  const centeringDoneRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!returnFromTeamId || nodes.length === 0) return;
    if (centeringDoneRef.current === returnFromTeamId) return;

    const container = containerRef.current;
    if (!container) return;

    const teamNode = nodes.find(n => n.id === returnFromTeamId);
    if (teamNode) {
      // Use actual container dimensions directly
      const width = container.clientWidth;
      const height = container.clientHeight;
      controls.centerOnPoint(teamNode.x, teamNode.y, width, height);
      centeringDoneRef.current = returnFromTeamId;
      clearReturnFromTeamId();
    }
  }, [returnFromTeamId, nodes, controls, clearReturnFromTeamId]);

  // Convert screen coordinates to graph coordinates (for drag)
  const screenToGraph = useCallback(
    (screenX: number, screenY: number) => {
      if (!svgElement) return { x: screenX, y: screenY };
      const rect = svgElement.getBoundingClientRect();
      const svgX = screenX - rect.left;
      const svgY = screenY - rect.top;
      return {
        x: (svgX - viewport.offsetX) / viewport.scale,
        y: (svgY - viewport.offsetY) / viewport.scale,
      };
    },
    [svgElement, viewport.offsetX, viewport.offsetY, viewport.scale]
  );

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

  // Loading, empty, or waiting for dimensions — always render containerRef for ResizeObserver
  const isLoading = teamsData === undefined;
  const isEmpty = !isLoading && teamsData.length === 0;
  const hasDimensions = dimensions.width > 0 && dimensions.height > 0;

  if (isLoading || isEmpty || !hasDimensions) {
    return (
      <div ref={containerRef} className="absolute inset-0 bg-light dark:bg-dark">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400"
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
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {t("diagram.loadingOrgStructure")}
              </span>
            </>
          ) : isEmpty ? (
            <>
              <Logo size={64} begin={0} repeatCount={2} />
              <div>
                <h3 className="text-xl font-bold mb-2 text-dark dark:text-light">
                  {t("diagram.noTeamsYet")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                  {t("diagram.noTeamsYetDescription")}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  const transform = `translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-light dark:bg-dark overflow-hidden"
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
        className="block w-full h-full"
        role="img"
        aria-label={t("diagram.orgStructureAriaLabel", { count: nodes.length })}
        style={{
          cursor: isPanning ? "grabbing" : "grab",
          touchAction: "none", // Prevent browser touch gestures; we handle pinch-to-zoom and pan
        }}
        onClick={handleBackgroundClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        {...handlers}
      >
        <title>{t("diagram.orgStructureTitle")}</title>
        <desc>
          {t("diagram.orgStructureDesc", { count: nodes.length })}
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
              fill="var(--diagram-arrow)"
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
              screenToGraph={screenToGraph}
              onSelect={setSelectedNodeId}
              onHover={setHoveredNodeId}
              onDragStart={dragHandlers.onDragStart}
              onDrag={dragHandlers.onDrag}
              onDragEnd={dragHandlers.onDragEnd}
              onUnpin={dragHandlers.onUnpin}
              onZoomIn={handleTeamZoom}
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
        <div className="absolute top-4 left-4 px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 border border-gray-300 dark:border-gray-700">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {t("diagram.settling")}
        </div>
      )}

      {/* Accessibility: text list alternative */}
      <details className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:p-4 focus-within:rounded-lg focus-within:z-10 focus-within:border focus-within:border-gray-300 dark:focus-within:border-gray-700">
        <summary className="cursor-pointer text-gray-700 dark:text-gray-200">
          {t("diagram.viewAsTextList")}
        </summary>
        <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {nodes.map((node) => {
            const parentEdge = edges.find((e) => e.source === node.id);
            const parentNode = parentEdge
              ? nodeMap.get(parentEdge.target)
              : null;
            return (
              <li key={node.id} className="py-1">
                {node.name} ({t("diagram.roleCountLabel", { count: node.roleCount })})
                {parentNode && ` - ${t("diagram.reportsTo", { name: parentNode.name })}`}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
