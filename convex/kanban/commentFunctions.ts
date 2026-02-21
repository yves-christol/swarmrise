import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { kanbanCommentValidator } from ".";
import { requireBoardAccess } from "./access";

/**
 * Get all comments for a card, ordered by creation time.
 */
export const getCommentsForCard = query({
  args: { cardId: v.id("kanbanCards") },
  returns: v.array(kanbanCommentValidator),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return [];

    await requireBoardAccess(ctx, card.boardId);

    return await ctx.db
      .query("kanbanComments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
  },
});

/**
 * Add a comment to a card.
 */
export const addComment = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    text: v.string(),
  },
  returns: v.id("kanbanComments"),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const { board, member } = await requireBoardAccess(ctx, card.boardId);

    if (!args.text.trim()) {
      throw new Error("Comment text cannot be empty");
    }

    return await ctx.db.insert("kanbanComments", {
      cardId: args.cardId,
      boardId: card.boardId,
      orgaId: board.orgaId,
      authorId: member._id,
      text: args.text.trim(),
    });
  },
});

/**
 * Update a comment's text. Only the author can edit their comment.
 */
export const updateComment = mutation({
  args: {
    commentId: v.id("kanbanComments"),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const { member } = await requireBoardAccess(ctx, comment.boardId);

    if (comment.authorId !== member._id) {
      throw new Error("You can only edit your own comments");
    }

    if (!args.text.trim()) {
      throw new Error("Comment text cannot be empty");
    }

    await ctx.db.patch(args.commentId, { text: args.text.trim() });
    return null;
  },
});

/**
 * Delete a comment. Only the author can delete their comment.
 */
export const deleteComment = mutation({
  args: { commentId: v.id("kanbanComments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const { member } = await requireBoardAccess(ctx, comment.boardId);

    if (comment.authorId !== member._id) {
      throw new Error("You can only delete your own comments");
    }

    await ctx.db.delete(args.commentId);
    return null;
  },
});
