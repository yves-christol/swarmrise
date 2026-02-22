import { v, Infer } from "convex/values";

export const storageFilePurpose = v.union(
  v.literal("kanban_attachment"),
  v.literal("org_logo"),
  v.literal("policy_attachment"),
  v.literal("chat_image"),
);

export const storageFileType = v.object({
  storageId: v.id("_storage"),
  orgaId: v.id("orgas"),
  uploadedBy: v.id("users"),
  purpose: storageFilePurpose,
  fileName: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  fileSize: v.optional(v.number()),
});

export const storageFileValidator = v.object({
  _id: v.id("storageFiles"),
  _creationTime: v.number(),
  ...storageFileType.fields,
});

export type StorageFile = Infer<typeof storageFileValidator>;
