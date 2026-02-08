import { Id } from "../../../convex/_generated/dataModel";

export type MemberVisualViewProps = {
  memberId: Id<"members">;
  onZoomOut: () => void;
  onNavigateToRole?: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
  onNavigateToTeam?: (teamId: Id<"teams">) => void;
};

export type ContactInfo = {
  type: "LinkedIn" | "Email" | "Mobile" | "Website" | "Twitter" | "Whatsapp" | "Facebook" | "Instagram" | "Address";
  value: string;
};

export type MemberData = {
  _id: Id<"members">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  personId: Id<"users">;
  firstname: string;
  surname: string;
  email: string;
  pictureURL?: string;
  contactInfos: ContactInfo[];
  roleIds: Id<"roles">[];
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

export type TeamData = {
  _id: Id<"teams">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  name: string;
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
