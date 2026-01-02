import { v } from "convex/values"

// Contact info type discriminator
export const contactInfoType = v.union(
  v.literal("LinkedIn"),
  v.literal("Facebook"),
  v.literal("Instagram"),
  v.literal("Whatsapp"),
  v.literal("Mobile"),
  v.literal("Address")
);

// Contact info validator (0 to 10 per Person)
export const contactInfo = v.object({
  type: contactInfoType,
  value: v.string(),
});

export const userType = v.object({
  firstname: v.string(),
  surname: v.string(),
  email: v.string(),
  pictureURL: v.optional(v.string()),
  contactInfos: v.array(contactInfo),
  orgaIds: v.array(v.id("orgas")),
})

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  ...userType.fields
})

