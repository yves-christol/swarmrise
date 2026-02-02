import { Id } from "../../../convex/_generated/dataModel";

export type RoleFocusViewProps = {
  roleId: Id<"roles">;
  onZoomOut: () => void;
  onNavigateToRole?: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
};

export type RoleData = {
  _id: Id<"roles">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  teamId: Id<"teams">;
  parentTeamId?: Id<"teams">;
  linkedRoleId?: Id<"roles">;
  title: string;
  roleType?: "leader" | "secretary" | "referee";
  mission: string;
  duties: string[];
  memberId: Id<"members">;
};

export type MemberData = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};
