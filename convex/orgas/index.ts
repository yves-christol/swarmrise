import { v, Infer } from "convex/values"

// Color scheme validator (hex strings like "#RRGGBB")
export const colorScheme = v.object({
  primary: v.string(),
  secondary: v.string(),
});

export type ColorScheme = Infer<typeof colorScheme>;

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorScheme,
  // Customisation fields (hex strings like "#RRGGBB")
  paperColorLight: v.optional(v.string()),
  paperColorDark: v.optional(v.string()),
  highlightColorLight: v.optional(v.string()),
  highlightColorDark: v.optional(v.string()),
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

