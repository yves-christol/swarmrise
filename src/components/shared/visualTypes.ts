import { Id } from "../../../convex/_generated/dataModel";

// Shared role data type used across visual views
export type RoleData = {
  _id: Id<"roles">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  teamId: Id<"teams">;
  parentTeamId?: Id<"teams">;
  linkedRoleId?: Id<"roles">; // For leader roles: points to source role in parent team (double role pattern)
  title: string;
  roleType?: "leader" | "secretary" | "referee";
  mission: string;
  duties: string[];
  memberId: Id<"members">;
};

// Shared team data type used across visual views
export type TeamData = {
  _id: Id<"teams">;
  _creationTime: number;
  orgaId: Id<"orgas">;
  name: string;
  color?: string;
};

// Shared member data type used across visual views
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

// Contact info type
export type ContactInfo = {
  type: "LinkedIn" | "Email" | "Mobile" | "Website" | "Twitter" | "Whatsapp" | "Facebook" | "Instagram" | "Address";
  value: string;
};

// Viewport state for pan/zoom interactions
export type ViewportState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

// Transition origin for zoom animations
export type TransitionOrigin = {
  x: number;
  y: number;
  radius: number;
} | null;
