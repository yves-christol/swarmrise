import { Id } from "../../../convex/_generated/dataModel";
import { RoleData, TeamData, MemberData, ContactInfo } from "../shared/visualTypes";

export type { RoleData, TeamData, MemberData, ContactInfo };

export type MemberVisualViewProps = {
  memberId: Id<"members">;
  onZoomOut: () => void;
  onNavigateToRole?: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
  onNavigateToTeam?: (teamId: Id<"teams">) => void;
};

export type RolesByTeam = {
  team: TeamData;
  roles: RoleData[];
};

export type RoleLinkPosition = {
  role: RoleData;
  x: number;
  y: number;
  radius: number;
  teamId: Id<"teams">;
  childTeamId?: Id<"teams">; // For master roles that lead a child team
};

export type TeamNodePosition = {
  team: TeamData;
  x: number;
  y: number;
  radius: number;
  roles: RoleLinkPosition[];
};
