import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  kanbanBoardValidator,
  kanbanColumnValidator,
  kanbanCardValidator,
  kanbanLabelValidator,
  TEMPLATE_LABEL_NAME,
  TEMPLATE_LABEL_COLOR,
  DEFAULT_COLUMNS,
} from ".";
import { getMemberInOrga, memberHasTeamAccess } from "../utils";

/**
 * Check if the authenticated user has access to a team's Kanban board.
 */
export const checkTeamAccess = query({
  args: { teamId: v.id("teams") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return false;

    const member = await getMemberInOrga(ctx, team.orgaId);
    return await memberHasTeamAccess(ctx, member, args.teamId);
  },
});

/**
 * Get the Kanban board for a team.
 */
export const getBoard = query({
  args: { teamId: v.id("teams") },
  returns: v.union(kanbanBoardValidator, v.null()),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) return null;

    return await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();
  },
});

/**
 * Get the full board data (board + columns + cards + labels) in a single query.
 * This is the main loader for the Kanban UI.
 */
export const getBoardWithData = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      board: kanbanBoardValidator,
      columns: v.array(kanbanColumnValidator),
      cards: v.array(kanbanCardValidator),
      labels: v.array(kanbanLabelValidator),
      templateLabelId: v.union(v.id("kanbanLabels"), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) return null;

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

    const labels = await ctx.db
      .query("kanbanLabels")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .collect();

    const templateLabel = labels.find(
      (l) => l.name === TEMPLATE_LABEL_NAME && l.color === TEMPLATE_LABEL_COLOR,
    );

    return {
      board,
      columns,
      cards,
      labels,
      templateLabelId: templateLabel?._id ?? null,
    };
  },
});

/**
 * Ensure a Kanban board exists for a team, creating one with default columns if needed.
 */
export const ensureBoard = mutation({
  args: { teamId: v.id("teams") },
  returns: v.id("kanbanBoards"),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");

    const existing = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    if (existing) return existing._id;

    const boardId = await ctx.db.insert("kanbanBoards", {
      teamId: args.teamId,
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
    return boardId;
  },
});

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
