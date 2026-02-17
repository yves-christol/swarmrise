import { v, Infer } from "convex/values"

export const topicType = v.object({
  teamId: v.id("teams"),
  roleId: v.id("roles"), // Role that issued the topic
  title: v.string(),
  text: v.string(),
  issuedDate: v.number(), // Timestamp
})

export const topicValidator = v.object({
  _id: v.id('topics'),
  _creationTime: v.number(),
  ...topicType.fields,
})

export type Topic = Infer<typeof topicValidator>