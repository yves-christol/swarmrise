import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromTeam,
} from "./utils";

/**
 * Get a team by ID
 */
export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.union(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      name: v.string(),
      parentTeamId: v.optional(v.id("teams")),
      mission: v.optional(v.string()),
      isFirstTeam: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db.get(args.teamId);
  },
});

/**
 * List all teams in an organization
 */
export const listTeamsInOrga = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      name: v.string(),
      parentTeamId: v.optional(v.id("teams")),
      mission: v.optional(v.string()),
      isFirstTeam: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
  },
});

/**
 * List child teams of a parent team
 */
export const listChildTeams = query({
  args: {
    parentTeamId: v.id("teams"),
  },
  returns: v.array(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      name: v.string(),
      parentTeamId: v.optional(v.id("teams")),
      mission: v.optional(v.string()),
      isFirstTeam: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.parentTeamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("teams")
      .withIndex("by_parent_team", (q) => q.eq("parentTeamId", args.parentTeamId))
      .collect();
  },
});

/**
 * Create a new team
 */
export const createTeam = mutation({
  args: {
    orgaId: v.id("orgas"),
    name: v.string(),
    parentTeamId: v.optional(v.id("teams")),
    mission: v.optional(v.string()),
    isFirstTeam: v.boolean(),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    
    // Validate parent team if provided
    if (args.parentTeamId) {
      const parentTeam = await ctx.db.get(args.parentTeamId);
      if (!parentTeam) {
        throw new Error("Parent team not found");
      }
      if (parentTeam.orgaId !== args.orgaId) {
        throw new Error("Parent team must belong to the same organization");
      }
    }
    
    // Create team
    const teamId = await ctx.db.insert("teams", {
      orgaId: args.orgaId,
      name: args.name,
      parentTeamId: args.parentTeamId,
      mission: args.mission,
      isFirstTeam: args.isFirstTeam,
    });
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: teamId,
      targetType: "teams",
      diff: {
        type: "Team",
        before: undefined,
        after: {
          orgaId: args.orgaId,
          name: args.name,
          parentTeamId: args.parentTeamId,
          mission: args.mission,
          isFirstTeam: args.isFirstTeam,
        },
      },
    });
    
    return teamId;
  },
});

/**
 * Update a team
 */
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    parentTeamId: v.optional(v.union(v.id("teams"), v.null())),
    mission: v.optional(v.union(v.string(), v.null())),
    isFirstTeam: v.optional(v.boolean()),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    
    // Validate parent team if provided
    if (args.parentTeamId !== undefined && args.parentTeamId !== null) {
      const parentTeam = await ctx.db.get(args.parentTeamId);
      if (!parentTeam) {
        throw new Error("Parent team not found");
      }
      if (parentTeam.orgaId !== orgaId) {
        throw new Error("Parent team must belong to the same organization");
      }
      // Prevent circular references
      if (args.parentTeamId === args.teamId) {
        throw new Error("Team cannot be its own parent");
      }
    }
    
    // Update team
    const updates: {
      name?: string;
      parentTeamId?: Id<"teams">;
      mission?: string;
      isFirstTeam?: boolean;
    } = {};
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.parentTeamId !== undefined) updates.parentTeamId = args.parentTeamId ?? undefined;
    if (args.mission !== undefined) updates.mission = args.mission ?? undefined;
    if (args.isFirstTeam !== undefined) updates.isFirstTeam = args.isFirstTeam;
    
    // Build before and after with only modified fields
    const before: {
      orgaId?: Id<"orgas">;
      name?: string;
      parentTeamId?: Id<"teams">;
      mission?: string;
      isFirstTeam?: boolean;
    } = {};
    const after: {
      orgaId?: Id<"orgas">;
      name?: string;
      parentTeamId?: Id<"teams">;
      mission?: string;
      isFirstTeam?: boolean;
    } = {};
    
    if (args.name !== undefined) {
      before.name = team.name;
      after.name = args.name;
    }
    if (args.parentTeamId !== undefined) {
      before.parentTeamId = team.parentTeamId;
      after.parentTeamId = args.parentTeamId ?? undefined;
    }
    if (args.mission !== undefined) {
      before.mission = team.mission;
      after.mission = args.mission ?? undefined;
    }
    if (args.isFirstTeam !== undefined) {
      before.isFirstTeam = team.isFirstTeam;
      after.isFirstTeam = args.isFirstTeam;
    }
    
    await ctx.db.patch(args.teamId, updates);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.teamId,
      targetType: "teams",
      diff: {
        type: "Team",
        before: Object.keys(before).length > 0 ? before : undefined,
        after: Object.keys(after).length > 0 ? after : undefined,
      },
    });
    
    return args.teamId;
  },
});

/**
 * Delete a team
 */
export const deleteTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    
    // Check if team has child teams
    const childTeams = await ctx.db
      .query("teams")
      .withIndex("by_parent_team", (q) => q.eq("parentTeamId", args.teamId))
      .first();
    if (childTeams) {
      throw new Error("Cannot delete team with child teams");
    }
    
    // Store before state
    const before = {
      orgaId: team.orgaId,
      name: team.name,
      parentTeamId: team.parentTeamId,
      mission: team.mission,
      isFirstTeam: team.isFirstTeam,
    };
    
    // Delete team
    await ctx.db.delete(args.teamId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.teamId,
      targetType: "teams",
      diff: {
        type: "Team",
        before,
        after: undefined,
      },
    });
    
    return null;
  },
});

