import { v, Infer } from "convex/values"

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  accentColor: v.optional(v.string()),         // Single brand accent (hex "#RRGGBB")
  surfaceColorLight: v.optional(v.string()),   // Background tint for light mode
  surfaceColorDark: v.optional(v.string()),    // Background tint for dark mode
  titleFont: v.optional(v.string()),
  owner: v.id("users"),
  // When set and non-empty, only emails with domains in this list can be invited
  authorizedEmailDomains: v.optional(v.array(v.string())),
})

export const orgaValidator = v.object({
  _id: v.id("orgas"),
  _creationTime: v.number(),
  ...orgaType.fields
})

export type Orga = Infer<typeof orgaValidator>

