import { v }  from "convex/values"

export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
  parentTeamId: v.optional(v.id("teams")),
  mission: v.optional(v.string()),
  isFirstTeam: v.boolean(),
})

export const teamValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  ...teamType.fields
})

