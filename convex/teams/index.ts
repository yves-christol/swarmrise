import { v, Infer }  from "convex/values"

export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
  // Hex color string (e.g. "#3B82F6"), validated for HSL bounds on write
  color: v.optional(v.string()),
})

export const teamValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  ...teamType.fields
})

export type Team = Infer<typeof teamValidator>

