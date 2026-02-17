import { v, Infer } from "convex/values"

// RGB color validator (r, g, b values 0-255)
export const rgbColor = v.object({
  r: v.number(), // 0-255
  g: v.number(), // 0-255
  b: v.number(), // 0-255
});

// Color scheme validator (2 RGB colors)
export const colorScheme = v.object({
  primary: rgbColor,
  secondary: rgbColor,
});

export type RgbColor = Infer<typeof rgbColor>;
export type ColorScheme = Infer<typeof colorScheme>;

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorScheme,
  // Customisation fields
  paperColorLight: v.optional(rgbColor),
  paperColorDark: v.optional(rgbColor),
  highlightColorLight: v.optional(rgbColor),
  highlightColorDark: v.optional(rgbColor),
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

