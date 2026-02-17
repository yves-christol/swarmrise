import { v, Infer }  from "convex/values"

import { rgbColor } from "../orgas"

export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
  // Customisation fields
  colorLight: v.optional(rgbColor),
  colorDark: v.optional(rgbColor),
})

export const teamValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  ...teamType.fields
})

export type Team = Infer<typeof teamValidator>

