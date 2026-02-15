import { Id } from "../../convex/_generated/dataModel";

export const routes = {
  home: "/",
  orga: (orgaId: Id<"orgas">) => `/o/${orgaId}`,
  orgaManage: (orgaId: Id<"orgas">) => `/o/${orgaId}/manage`,
  team: (orgaId: Id<"orgas">, teamId: Id<"teams">) => `/o/${orgaId}/teams/${teamId}`,
  teamManage: (orgaId: Id<"orgas">, teamId: Id<"teams">) => `/o/${orgaId}/teams/${teamId}/manage`,
  teamKanban: (orgaId: Id<"orgas">, teamId: Id<"teams">) => `/o/${orgaId}/teams/${teamId}/kanban`,
  role: (orgaId: Id<"orgas">, teamId: Id<"teams">, roleId: Id<"roles">) =>
    `/o/${orgaId}/teams/${teamId}/roles/${roleId}`,
  roleManage: (orgaId: Id<"orgas">, teamId: Id<"teams">, roleId: Id<"roles">) =>
    `/o/${orgaId}/teams/${teamId}/roles/${roleId}/manage`,
  member: (orgaId: Id<"orgas">, memberId: Id<"members">) => `/o/${orgaId}/members/${memberId}`,
  memberManage: (orgaId: Id<"orgas">, memberId: Id<"members">) => `/o/${orgaId}/members/${memberId}/manage`,
} as const;
