import { v }  from "convex/values"

export const roleType = v.object({
  teamId: v.id("teams"),
  title: v.string(),
  mission: v.string(),
  duties: v.array(v.string()),
  memberId: v.id("members"),
})

export const roleValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  ...roleType.fields
})

