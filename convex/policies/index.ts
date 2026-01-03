import { v, Infer } from "convex/values"

export const policyVisibility = v.union(v.literal("private"), v.literal("public"))

export type PolicyVisibility = Infer<typeof policyVisibility>;

export const policyType = v.object({
  orgaId: v.id("orgas"),
  teamId: v.id("teams"),
  roleId: v.id("roles"),
  issuedDate: v.number(),
  title: v.string(),
  text: v.string(),
  visibility: policyVisibility,
  expirationDate: v.optional(v.number()),
})

export const policyValidator = v.object({
  _id: v.id("policies"),
  _creationTime: v.number(),
  ...policyType.fields
})

