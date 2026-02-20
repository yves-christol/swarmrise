import { v, Infer } from "convex/values"

export const policyType = v.object({
  orgaId: v.id("orgas"),
  roleId: v.id("roles"), // Role that owns this policy (only the role holder can edit/delete)
  number: v.number(), // Auto-incremented per organization (1, 2, 3, ...)
  title: v.string(),
  abstract: v.string(), // Short summary of the policy
  text: v.string(), // Full policy text in markdown (can embed pictures and URLs)
  attachmentIds: v.optional(v.array(v.id("_storage"))), // Files stored in Convex storage
})

export const policyValidator = v.object({
  _id: v.id("policies"),
  _creationTime: v.number(),
  ...policyType.fields,
})

export type Policy = Infer<typeof policyValidator>
