import { v, Infer } from "convex/values"

export const invitationStatusType = v.union(
  v.literal("pending"), v.literal("rejected"), v.literal("accepted")
)

export type InvitationStatus = Infer<typeof invitationStatusType>;

export const invitationType = v.object({
  orgaId: v.id("orgas"),
  emitterMemberId: v.id("members"),
  email: v.string(),
  status: invitationStatusType,
  sentDate: v.number(),
})

export const invitationValidator = v.object({
  _id: v.id("invitations"),
  _creationTime: v.number(),
  ...invitationType.fields
})


