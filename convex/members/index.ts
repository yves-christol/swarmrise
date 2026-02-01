import { v, Infer } from "convex/values";
import { contactInfo } from "../users";

export const memberType = v.object({
  orgaId: v.id("orgas"),
  personId: v.id("users"),
  firstname: v.string(),
  surname: v.string(),
  email: v.string(),
  pictureURL: v.optional(v.string()),
  contactInfos: v.array(contactInfo),
  roleIds: v.array(v.id("roles")),
})

export const memberValidator = v.object({
  _id: v.id("members"),
  _creationTime: v.number(),
  ...memberType.fields
})

export type Member = Infer<typeof memberValidator>

