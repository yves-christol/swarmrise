import { v, Infer }  from "convex/values"

export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
})

export const teamValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  ...teamType.fields
})

export type Team = Infer<typeof teamValidator>

