import { query } from "../_generated/server";
import { v } from "convex/values";
import { decisionValidator, targetType } from ".";
import { requireAuthAndMembership } from "../utils";

const DECISIONS_PAGE_SIZE = 20;
const DECISIONS_MAX_LIMIT = 100;

/**
 * List decisions for an organization with cursor-based pagination.
 * Returns most recent decisions first.
 */
export const listDecisionsForOrga = query({
  args: {
    orgaId: v.id("orgas"),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    targetType: v.optional(targetType),
  },
  returns: v.object({
    decisions: v.array(decisionValidator),
    nextCursor: v.union(v.number(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);

    const limit = Math.min(args.limit ?? DECISIONS_PAGE_SIZE, DECISIONS_MAX_LIMIT);

    let q;
    if (args.targetType) {
      q = ctx.db
        .query("decisions")
        .withIndex("by_orga_and_target", (idx) =>
          idx.eq("orgaId", args.orgaId).eq("targetType", args.targetType!)
        );
    } else {
      q = ctx.db
        .query("decisions")
        .withIndex("by_orga", (idx) => idx.eq("orgaId", args.orgaId));
    }

    // Use cursor-based filtering and take only what we need
    const queryOrdered = q.order("desc");
    const all = args.cursor
      ? await queryOrdered.filter((q) => q.lt(q.field("_creationTime"), args.cursor!)).take(limit + 1)
      : await queryOrdered.take(limit + 1);

    const decisions = all.slice(0, limit);
    const hasMore = all.length > limit;
    const nextCursor =
      decisions.length > 0
        ? decisions[decisions.length - 1]._creationTime
        : null;

    return { decisions, nextCursor, hasMore };
  },
});

/**
 * List decisions relevant to a specific team with cursor-based pagination.
 * Matches decisions where targetTeamId equals the team's ID.
 */
export const listDecisionsForTeam = query({
  args: {
    orgaId: v.id("orgas"),
    teamId: v.id("teams"),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    targetType: v.optional(targetType),
  },
  returns: v.object({
    decisions: v.array(decisionValidator),
    nextCursor: v.union(v.number(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);

    const limit = Math.min(args.limit ?? DECISIONS_PAGE_SIZE, DECISIONS_MAX_LIMIT);

    const all = await ctx.db
      .query("decisions")
      .withIndex("by_orga_and_team", (idx) =>
        idx.eq("orgaId", args.orgaId).eq("targetTeamId", args.teamId)
      )
      .order("desc")
      .collect();

    // Apply targetType filter in-memory if specified
    const typeFiltered = args.targetType
      ? all.filter((d) => d.targetType === args.targetType)
      : all;

    // Apply cursor
    const filtered = args.cursor
      ? typeFiltered.filter((d) => d._creationTime < args.cursor!)
      : typeFiltered;

    const decisions = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    const nextCursor =
      decisions.length > 0
        ? decisions[decisions.length - 1]._creationTime
        : null;

    return { decisions, nextCursor, hasMore };
  },
});
