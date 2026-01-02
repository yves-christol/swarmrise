import { v } from "convex/values"

export const invitationStatus = v.union(
  v.literal("pending"), v.literal("rejected"), v.literal("accepted")
)

export const invitationType = v.object({
  orgaId: v.id("orgas"),
  emitterMemberId: v.id("members"),
  email: v.string(),
  status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
  sentDate: v.number(),
})

export const invitationValidator = v.object({
  _id: v.id("invitations"),
  _creationTime: v.number(),
  ...invitationType.fields
})


