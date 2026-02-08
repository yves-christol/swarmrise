import { Id } from "../../../convex/_generated/dataModel";
import { RoleData } from "../shared/visualTypes";

export type { RoleData };

export type RoleVisualViewProps = {
  roleId: Id<"roles">;
  onZoomOut: () => void;
  onNavigateToRole?: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
  onNavigateToMember?: (memberId: Id<"members">, origin?: { x: number; y: number; radius: number }) => void;
};

// Simplified member data for role view (doesn't need full member details)
export type RoleMemberData = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};
