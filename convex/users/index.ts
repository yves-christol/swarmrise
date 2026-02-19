import { v, Infer } from "convex/values"

// Contact info type discriminator
export const contactInfoType = v.union(
  v.literal("LinkedIn"),
  v.literal("Email"),
  v.literal("Mobile"),
  v.literal("Website"),
  v.literal("Twitter"),
  v.literal("Whatsapp"),
  v.literal("Facebook"),
  v.literal("Instagram"),
  v.literal("Address")
);

// Contact info validator (0 to 10 per Person)
export const contactInfo = v.object({
  type: contactInfoType,
  value: v.string(),
});

export const contactInfos = v.array(contactInfo)

export type ContactInfos = Infer<typeof contactInfos>

export const userType = v.object({
  firstname: v.string(),
  surname: v.string(),
  email: v.string(),
  pictureURL: v.optional(v.string()),
  contactInfos: contactInfos,
  orgaIds: v.array(v.id("orgas")),
  termsAcceptedAt: v.optional(v.number()),
  termsVersion: v.optional(v.string()),
  privacyVersion: v.optional(v.string()),
})

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  ...userType.fields
})

export type User = Infer<typeof userValidator>

