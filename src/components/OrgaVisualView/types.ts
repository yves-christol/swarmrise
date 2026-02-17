import { Id } from "../../../convex/_generated/dataModel";
import { ViewportState } from "../shared/visualTypes";

export type { ViewportState };

export type TeamWithRoleCount = {
  _id: Id<"teams">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  name: string;
  roleCount: number;
  parentTeamId: Id<"teams"> | null;
  colorLight?: { r: number; g: number; b: number };
  colorDark?: { r: number; g: number; b: number };
};

export type GraphNode = {
  id: string;
  name: string;
  roleCount: number;
  radius: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  isPinned?: boolean;
  colorLight?: { r: number; g: number; b: number };
  colorDark?: { r: number; g: number; b: number };
};

export type GraphEdge = {
  source: string;
  target: string;
};
