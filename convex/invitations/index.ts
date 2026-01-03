import { v, Infer } from "convex/values"

export const invitationStatus = v.union(
  v.literal("pending"), v.literal("rejected"), v.literal("accepted")
)

export type InvitationStatus = Infer<typeof invitationStatus>;

export const invitationType = v.object({
  orgaId: v.id("orgas"),
  emitterMemberId: v.id("members"),
  email: v.string(),
  status: invitationStatus,
  sentDate: v.number(),
})

export const invitationValidator = v.object({
  _id: v.id("invitations"),
  _creationTime: v.number(),
  ...invitationType.fields
})


