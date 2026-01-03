import { query } from "../_generated/server";
import { v } from "convex/values";
import { aggregateMembers, aggregateTeams, aggregateRoles } from "../aggregates";
import { requireAuthAndMembership } from "../utils";

/**
 * Get the count of members for an organization
 */
export const getMemberCount = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await aggregateMembers.count(ctx, {
      namespace: args.orgaId,
    });
  },
});

/**
 * Get the count of teams for an organization
 */
export const getTeamCount = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await aggregateTeams.count(ctx, {
      namespace: args.orgaId,
    });
  },
});

/**
 * Get the count of roles for an organization
 */
export const getRoleCount = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await aggregateRoles.count(ctx, {
      namespace: args.orgaId,
    });
  },
});

/**
 * Get all counts (members, teams, roles) for an organization in a single call
 */
export const getOrgaCounts = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    members: v.number(),
    teams: v.number(),
    roles: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    const namespace = args.orgaId;
    const [members, teams, roles] = await Promise.all([
      aggregateMembers.count(ctx, { namespace }),
      aggregateTeams.count(ctx, { namespace }),
      aggregateRoles.count(ctx, { namespace }),
    ]);
    return {
      members,
      teams,
      roles,
    };
  },
});

