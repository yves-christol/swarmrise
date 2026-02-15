import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { kanbanBoardValidator, kanbanColumnValidator, kanbanCardValidator, DEFAULT_COLUMNS } from ".";
import { requireAuthAndMembership } from "../utils";
import { memberHasTeamAccess } from "../chat/access";
import { requireBoardAccess } from "./access";

// ============================================================
// Queries
// ============================================================

/**
 * Get the Kanban board for a team.
 */
export const getBoard = query({
  args: { teamId: v.id("teams") },
  returns: v.union(kanbanBoardValidator, v.null()),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await requireAuthAndMembership(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");

    return await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();
  },
});

/**
 * Get the full board data (board + columns + cards) in a single query.
 * This is the main loader for the Kanban UI.
 */
export const getBoardWithData = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      board: kanbanBoardValidator,
      columns: v.array(kanbanColumnValidator),
      cards: v.array(kanbanCardValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await requireAuthAndMembership(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");

    const board = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    if (!board) return null;

    const columns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board_and_position", (q) => q.eq("boardId", board._id))
      .collect();

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .collect();

    return { board, columns, cards };
  },
});

/**
 * Get all cards owned by a member across all boards.
 * Used for the member profile view.
 */
export const getCardsByMember = query({
  args: { memberId: v.id("members") },
  returns: v.array(kanbanCardValidator),
  handler: async (ctx, args) => {
    const memberDoc = await ctx.db.get(args.memberId);
    if (!memberDoc) return [];

    await requireAuthAndMembership(ctx, memberDoc.orgaId);

    return await ctx.db
      .query("kanbanCards")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.memberId))
      .collect();
  },
});

// ============================================================
// Mutations
// ============================================================

/**
 * Create a new card in a column.
 */
export const createCard = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    columnId: v.id("kanbanColumns"),
    title: v.string(),
    ownerId: v.id("members"),
    dueDate: v.number(),
    comments: v.optional(v.string()),
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    // Verify column belongs to this board
    const column = await ctx.db.get(args.columnId);
    if (!column || column.boardId !== args.boardId) {
      throw new Error("Column not found on this board");
    }

    // Verify owner is a member of the org
    const owner = await ctx.db.get(args.ownerId);
    if (!owner || owner.orgaId !== board.orgaId) {
      throw new Error("Owner must be a member of the organization");
    }

    // Calculate position: place at end of column
    const existingCards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column_and_position", (q) => q.eq("columnId", args.columnId))
      .collect();

    const maxPosition =
      existingCards.length > 0
        ? Math.max(...existingCards.map((c) => c.position))
        : 0;

    return await ctx.db.insert("kanbanCards", {
      columnId: args.columnId,
      boardId: args.boardId,
      orgaId: board.orgaId,
      ownerId: args.ownerId,
      title: args.title,
      dueDate: args.dueDate,
      comments: args.comments ?? "",
      position: maxPosition + 1024,
    });
  },
});

/**
 * Update card details (title, owner, due date, comments).
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    title: v.optional(v.string()),
    ownerId: v.optional(v.id("members")),
    dueDate: v.optional(v.number()),
    comments: v.optional(v.string()),
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const { board } = await requireBoardAccess(ctx, card.boardId);

    // Verify new owner if provided
    if (args.ownerId !== undefined) {
      const owner = await ctx.db.get(args.ownerId);
      if (!owner || owner.orgaId !== board.orgaId) {
        throw new Error("Owner must be a member of the organization");
      }
    }

    const updates: Partial<{
      title: string;
      ownerId: Id<"members">;
      dueDate: number;
      comments: string;
    }> = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.ownerId !== undefined) updates.ownerId = args.ownerId;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.comments !== undefined) updates.comments = args.comments;

    await ctx.db.patch(args.cardId, updates);
    return args.cardId;
  },
});

/**
 * Move a card to a different column and/or position (drag and drop).
 * Uses fractional indexing: position is the midpoint between neighbors.
 */
export const moveCard = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    targetColumnId: v.id("kanbanColumns"),
    targetPosition: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    // Verify target column belongs to the same board
    const targetColumn = await ctx.db.get(args.targetColumnId);
    if (!targetColumn || targetColumn.boardId !== card.boardId) {
      throw new Error("Target column not found on this board");
    }

    await ctx.db.patch(args.cardId, {
      columnId: args.targetColumnId,
      position: args.targetPosition,
    });

    return null;
  },
});

/**
 * Delete a card permanently.
 */
export const deleteCard = mutation({
  args: { cardId: v.id("kanbanCards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    await ctx.db.delete(args.cardId);
    return null;
  },
});

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

    // Update board column order
    await ctx.db.patch(args.boardId, { columnOrder: args.columnOrder });

    // Update individual column positions to match the order
    for (let i = 0; i < args.columnOrder.length; i++) {
      await ctx.db.patch(args.columnOrder[i], { position: i });
    }

    return null;
  },
});

// ============================================================
// Internal mutations
// ============================================================

/**
 * Backfill Kanban boards for existing teams that don't have one yet.
 * Run once after initial deployment via the Convex dashboard.
 */
export const backfillBoards = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    let created = 0;

    for (const team of teams) {
      const existing = await ctx.db
        .query("kanbanBoards")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .unique();

      if (!existing) {
        const boardId = await ctx.db.insert("kanbanBoards", {
          teamId: team._id,
          orgaId: team.orgaId,
          columnOrder: [],
        });

        const columnIds: Id<"kanbanColumns">[] = [];
        for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
          const columnId = await ctx.db.insert("kanbanColumns", {
            boardId,
            orgaId: team.orgaId,
            name: DEFAULT_COLUMNS[i],
            position: i,
          });
          columnIds.push(columnId);
        }

        await ctx.db.patch(boardId, { columnOrder: columnIds });
        created++;
      }
    }

    return created;
  },
});
