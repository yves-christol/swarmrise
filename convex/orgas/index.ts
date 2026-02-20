import { v, Infer } from "convex/values"

// Legacy color scheme validator – accepts both old RGB objects and string hex values
// so that `convex deploy` passes schema validation against production data.
// Run `internal.orgas.migrations.stripLegacyColorFields` after deploy, then remove.
const rgbObject = v.object({ r: v.number(), g: v.number(), b: v.number() });
export const colorScheme = v.object({
  primary: v.union(v.string(), rgbObject),
  secondary: v.union(v.string(), rgbObject),
});

export type ColorScheme = Infer<typeof colorScheme>;

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  // New color model (3 fields)
  accentColor: v.optional(v.string()),         // Single brand accent (hex "#RRGGBB")
  surfaceColorLight: v.optional(v.string()),   // Background tint for light mode
  surfaceColorDark: v.optional(v.string()),    // Background tint for dark mode
  // Legacy color fields (kept during migration, will be removed)
  colorScheme: v.optional(colorScheme),
  paperColorLight: v.optional(v.string()),
  paperColorDark: v.optional(v.string()),
  highlightColorLight: v.optional(v.string()),
  highlightColorDark: v.optional(v.string()),
  // Other customisation
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

