import { v, Infer }  from "convex/values"

export const specialRole = v.union(
  v.literal("leader"), v.literal("secretary"), v.literal("referee")
)

export type SpecialRole = Infer<typeof specialRole>;

export const roleType = v.object({
  orgaId: v.id("orgas"), // Added for efficient aggregation by organization
  teamId: v.id("teams"),
  parentTeamId: v.optional(v.id("teams")), // For leader roles: the parent team this role connects to
  title: v.string(),
  roleType: v.optional(specialRole), // Strong typing for specific roles
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

