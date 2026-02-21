import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { TEMPLATE_LABEL_NAME, TEMPLATE_LABEL_COLOR } from ".";
import { requireBoardAccess } from "./access";

/**
 * Create a new label for a board.
 */
export const createLabel = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    name: v.string(),
    color: v.string(),
  },
  returns: v.id("kanbanLabels"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    if (!args.name.trim()) {
      throw new Error("Label name cannot be empty");
    }

    return await ctx.db.insert("kanbanLabels", {
      boardId: args.boardId,
      orgaId: board.orgaId,
      name: args.name.trim(),
      color: args.color,
    });
  },
});

/**
 * Update a label's name and/or color.
 */
export const updateLabel = mutation({
  args: {
    labelId: v.id("kanbanLabels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId);
    if (!label) throw new Error("Label not found");

    await requireBoardAccess(ctx, label.boardId);

    const updates: Record<string, string> = {};
    if (args.name !== undefined) {
      if (!args.name.trim()) throw new Error("Label name cannot be empty");
      updates.name = args.name.trim();
    }
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.labelId, updates);
    return null;
  },
});

/**
 * Delete a label. Also removes it from all cards that reference it.
 */
export const deleteLabel = mutation({
  args: { labelId: v.id("kanbanLabels") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId);
    if (!label) throw new Error("Label not found");

    await requireBoardAccess(ctx, label.boardId);

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_board", (q) => q.eq("boardId", label.boardId))
      .collect();

    for (const card of cards) {
      if (card.labelIds && card.labelIds.includes(args.labelId)) {
        await ctx.db.patch(card._id, {
          labelIds: card.labelIds.filter((id) => id !== args.labelId),
        });
      }
    }

    await ctx.db.delete(args.labelId);
    return null;
  },
});

/**
 * Ensure the "template" label exists on a board, creating it if needed.
 */
export const ensureTemplateLabel = mutation({
  args: { boardId: v.id("kanbanBoards") },
  returns: v.id("kanbanLabels"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    const labels = await ctx.db
      .query("kanbanLabels")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const existing = labels.find(
      (l) => l.name === TEMPLATE_LABEL_NAME && l.color === TEMPLATE_LABEL_COLOR,
    );

    if (existing) return existing._id;

    return await ctx.db.insert("kanbanLabels", {
      boardId: args.boardId,
      orgaId: board.orgaId,
      name: TEMPLATE_LABEL_NAME,
      color: TEMPLATE_LABEL_COLOR,
    });
  },
});
