import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireBoardAccess } from "./access";

/**
 * Reorder columns on a board.
 */
export const reorderColumns = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    columnOrder: v.array(v.id("kanbanColumns")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireBoardAccess(ctx, args.boardId);

    await ctx.db.patch(args.boardId, { columnOrder: args.columnOrder });

    for (let i = 0; i < args.columnOrder.length; i++) {
      await ctx.db.patch(args.columnOrder[i], { position: i });
    }

    return null;
  },
});

/**
 * Add a new column to a board.
 */
export const addColumn = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    name: v.string(),
  },
  returns: v.id("kanbanColumns"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    if (!args.name.trim()) {
      throw new Error("Column name cannot be empty");
    }

    const existingColumns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board_and_position", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxPosition =
      existingColumns.length > 0
        ? Math.max(...existingColumns.map((c) => c.position))
        : -1;

    const columnId = await ctx.db.insert("kanbanColumns", {
      boardId: args.boardId,
      orgaId: board.orgaId,
      name: args.name.trim(),
      position: maxPosition + 1,
    });

    await ctx.db.patch(args.boardId, {
      columnOrder: [...board.columnOrder, columnId],
    });

    return columnId;
  },
});

/**
 * Rename a column.
 */
export const renameColumn = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    await requireBoardAccess(ctx, column.boardId);

    if (!args.name.trim()) {
      throw new Error("Column name cannot be empty");
    }

    await ctx.db.patch(args.columnId, { name: args.name.trim() });
    return null;
  },
});

/**
 * Delete a column and all its cards.
 */
export const deleteColumn = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    const { board } = await requireBoardAccess(ctx, column.boardId);

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();

    for (const card of cards) {
      const comments = await ctx.db
        .query("kanbanComments")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      const attachments = await ctx.db
        .query("kanbanAttachments")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();
      for (const attachment of attachments) {
        await ctx.storage.delete(attachment.storageId);
        const sfRecord = await ctx.db
          .query("storageFiles")
          .withIndex("by_storage_id", (q) => q.eq("storageId", attachment.storageId))
          .unique();
        if (sfRecord) await ctx.db.delete(sfRecord._id);
        await ctx.db.delete(attachment._id);
      }
      await ctx.db.delete(card._id);
    }

    const newOrder = board.columnOrder.filter((id) => id !== args.columnId);
    await ctx.db.patch(board._id, { columnOrder: newOrder });

    await ctx.db.delete(args.columnId);

    return null;
  },
});

/**
 * Set or clear the WIP limit for a column.
 */
export const setColumnWipLimit = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
    wipLimit: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    await requireBoardAccess(ctx, column.boardId);

    const limit = args.wipLimit && args.wipLimit > 0 ? args.wipLimit : undefined;
    await ctx.db.patch(args.columnId, { wipLimit: limit });

    return null;
  },
});
