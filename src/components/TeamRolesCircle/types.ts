import { Id } from "../../../convex/_generated/dataModel";

export type RoleData = {
  _id: Id<"roles">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  teamId: Id<"teams">;
  parentTeamId?: Id<"teams">;
  title: string;
  roleType?: "leader" | "secretary" | "referee";
  mission: string;
  duties: string[];
  memberId: Id<"members">;
};

export type RolePosition = {
  role: RoleData;
  x: number;
  y: number;
  radius: number;
  memberName?: string;
};
