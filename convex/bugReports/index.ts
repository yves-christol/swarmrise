import { v, Infer } from "convex/values"

export const bugReportType = v.object({
  userId: v.id("users"),
  userEmail: v.string(),
  title: v.string(),
  description: v.string(),
  url: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  orgaId: v.optional(v.id("orgas")),
})

export const bugReportValidator = v.object({
  _id: v.id("bugReports"),
  _creationTime: v.number(),
  ...bugReportType.fields,
})

export type BugReport = Infer<typeof bugReportValidator>
