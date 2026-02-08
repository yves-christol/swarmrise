import { v, Infer }  from "convex/values"

export const specialRoleType = v.union(
  v.literal("leader"), v.literal("secretary"), v.literal("referee")
)

export type SpecialRole = Infer<typeof specialRoleType>;

export const roleType = v.object({
  orgaId: v.id("orgas"), // Added for efficient aggregation by organization
  teamId: v.id("teams"),
  parentTeamId: v.optional(v.id("teams")), // For leader roles: the parent team this role connects to
  linkedRoleId: v.optional(v.id("roles")), // For leader roles: the corresponding role in parent team (double role pattern)
  title: v.string(),
  roleType: v.optional(specialRoleType), // Strong typing for specific roles
  mission: v.string(),
  duties: v.array(v.string()),
  memberId: v.id("members"),
})

export const roleValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  ...roleType.fields
})

export type Role = Infer<typeof roleValidator>

