import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  kanbanAttachmentValidator,
  kanbanAttachmentWithUrlValidator,
  MAX_ATTACHMENT_SIZE,
} from ".";
import { requireBoardAccess } from "./access";

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/zip",
]);

/**
 * Get all attachments for a card.
 */
export const getAttachmentsForCard = query({
  args: { cardId: v.id("kanbanCards") },
  returns: v.array(kanbanAttachmentValidator),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    await requireBoardAccess(ctx, card.boardId);

    return await ctx.db
      .query("kanbanAttachments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
  },
});

/**
 * Get all attachments for a card with resolved download URLs.
 */
export const getAttachmentsForCardWithUrls = query({
  args: { cardId: v.id("kanbanCards") },
  returns: v.array(kanbanAttachmentWithUrlValidator),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    await requireBoardAccess(ctx, card.boardId);

    const attachments = await ctx.db
      .query("kanbanAttachments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();

    const result = [];
    for (const att of attachments) {
      const url = await ctx.storage.getUrl(att.storageId);
      result.push({ ...att, url });
    }

    return result;
  },
});

/**
 * Add an attachment to a card.
 */
export const addAttachment = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  returns: v.id("kanbanAttachments"),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const { board, member } = await requireBoardAccess(ctx, card.boardId);

    if (args.fileSize > MAX_ATTACHMENT_SIZE) {
      throw new Error("File size exceeds the 10MB limit");
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(args.mimeType)) {
      throw new Error("File type not allowed");
    }

    const attachmentId = await ctx.db.insert("kanbanAttachments", {
      cardId: args.cardId,
      boardId: card.boardId,
      orgaId: board.orgaId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedBy: member._id,
    });

    await ctx.db.insert("storageFiles", {
      storageId: args.storageId,
      orgaId: board.orgaId,
      uploadedBy: member.personId,
      purpose: "kanban_attachment",
      fileName: args.fileName,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
    });

    return attachmentId;
  },
});

/**
 * Delete an attachment from a card.
 */
export const deleteAttachment = mutation({
  args: { attachmentId: v.id("kanbanAttachments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new Error("Attachment not found");

    await requireBoardAccess(ctx, attachment.boardId);

    await ctx.storage.delete(attachment.storageId);
    const sfRecord = await ctx.db
      .query("storageFiles")
      .withIndex("by_storage_id", (q) => q.eq("storageId", attachment.storageId))
      .unique();
    if (sfRecord) await ctx.db.delete(sfRecord._id);
    await ctx.db.delete(args.attachmentId);
    return null;
  },
});
