import { v } from "convex/values"

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

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorScheme,
  owner: v.id("members"),
})

export const orgaValidator = v.object({
  _id: v.id("orgas"),
  _creationTime: v.number(),
  ...orgaType.fields
})

