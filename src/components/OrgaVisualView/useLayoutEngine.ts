import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";
import type { TeamWithRoleCount, GraphNode, GraphEdge } from "./types";

const MIN_AREA = 5027; // ~40px radius minimum
const MAX_AREA = 45239; // ~120px radius maximum
const AREA_PER_ROLE = 1257; // ~20px radius increment per role

function calculateRadius(roleCount: number): number {
  const area = Math.min(
    MAX_AREA,
    Math.max(MIN_AREA, MIN_AREA + roleCount * AREA_PER_ROLE)
  );
  return Math.sqrt(area / Math.PI);
}

type SimNode = SimulationNodeDatum & GraphNode;
type SimLink = SimulationLinkDatum<SimNode> & { source: string | SimNode; target: string | SimNode };

export function useLayoutEngine(
  teams: TeamWithRoleCount[] | undefined,
  width: number,
  height: number
) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);

  // Create nodes and edges from teams data
  const { initialNodes, edges } = useMemo(() => {
    if (!teams || teams.length === 0) {
      return { initialNodes: [], edges: [] };
    }

    // Create nodes with calculated radii
    const nodeMap = new Map<string, GraphNode>();
    const initialNodes: GraphNode[] = teams.map((team, index) => {
      // Initial position in a spiral pattern from center
      const angle = index * 0.5;
      const spiralRadius = 50 + index * 30;
      const node: GraphNode = {
        id: team._id,
        name: team.name,
        roleCount: team.roleCount,
        radius: calculateRadius(team.roleCount),
        x: width / 2 + Math.cos(angle) * spiralRadius,
        y: height / 2 + Math.sin(angle) * spiralRadius,
        color: team.color,
      };
      nodeMap.set(team._id, node);
      return node;
    });

    // Create edges from leader connections
    const edges: GraphEdge[] = teams
      .filter((team) => team.parentTeamId !== null)
      .map((team) => ({
        source: team._id,
        target: team.parentTeamId!,
      }));

    return { initialNodes, edges };
  }, [teams, width, height]);

  // Run force simulation
  useEffect(() => {
    if (initialNodes.length === 0 || width === 0 || height === 0) {
      setNodes([]);
      return;
    }

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    setIsSimulating(true);

    // Create deep copy of nodes for simulation
    const simNodes: SimNode[] = initialNodes.map((n) => ({ ...n }));
    simNodesRef.current = simNodes;

    // Create links with node references
    const simLinks: SimLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const simulation = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        "charge",
        forceManyBody<SimNode>().strength(-400)
      )
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => {
            const source = d.source as SimNode;
            const target = d.target as SimNode;
            return source.radius + target.radius + 80;
          })
          .strength(0.3)
      )
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "collision",
        forceCollide<SimNode>()
          .radius((d) => d.radius + 20)
          .strength(0.8)
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .stop(); // Prevent auto-start — we'll run it synchronously first

    // Run simulation to completion synchronously so nodes start at final positions
    const alphaMin = simulation.alphaMin();
    while (simulation.alpha() > alphaMin) {
      simulation.tick();
    }

    // Set settled positions immediately (no visible settling animation)
    const snapshotNodes = () =>
      simNodes.map((n) => ({
        id: n.id,
        name: n.name,
        roleCount: n.roleCount,
        radius: n.radius,
        x: n.x ?? 0,
        y: n.y ?? 0,
        isPinned: n.fx != null && n.fy != null,
        color: n.color,
      }));

    setNodes(snapshotNodes());
    setIsSimulating(false);

    simulationRef.current = simulation;

    // Set up tick handler for future interactions (drag reheat)
    simulation.on("tick", () => {
      setNodes(snapshotNodes());
    });

    simulation.on("end", () => {
      setIsSimulating(false);
    });

    return () => {
      simulation.stop();
    };
  }, [initialNodes, edges, width, height]);

  // Drag handlers for elastic deformation effect
  const handleDragStart = useCallback((nodeId: string) => {
    const simulation = simulationRef.current;
    const simNodes = simNodesRef.current;
    if (!simulation || !simNodes) return;

    const node = simNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Reheat simulation for elastic effect
    simulation.alphaTarget(0.3).restart();
    setIsSimulating(true);

    // Fix node position at current location
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handleDrag = useCallback((nodeId: string, x: number, y: number) => {
    const simNodes = simNodesRef.current;
    if (!simNodes) return;

    const node = simNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Update fixed position to follow cursor
    node.fx = x;
    node.fy = y;
  }, []);

  const handleDragEnd = useCallback((nodeId: string) => {
    const simulation = simulationRef.current;
    const simNodes = simNodesRef.current;
    if (!simulation || !simNodes) return;

    const node = simNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Keep node pinned where dropped
    node.fx = node.x;
    node.fy = node.y;

    // Gentle settling for neighbors
    simulation.alphaTarget(0);
  }, []);

  const handleUnpin = useCallback((nodeId: string) => {
    const simulation = simulationRef.current;
    const simNodes = simNodesRef.current;
    if (!simulation || !simNodes) return;

    const node = simNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Release the pin
    node.fx = null;
    node.fy = null;

    // Reheat slightly to let node find natural position
    simulation.alpha(0.3).restart();
    setIsSimulating(true);
  }, []);

  return {
    nodes,
    edges,
    isSimulating,
    dragHandlers: {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      onUnpin: handleUnpin,
    },
  };
}
