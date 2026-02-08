import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { teamValidator } from ".";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromTeam,
} from "../utils";

/**
 * Get a team by ID
 */
export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.union(teamValidator, v.null()),
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
 * Child teams are identified by having a leader role with parentTeamId pointing to the parent
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
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.parentTeamId);
    await requireAuthAndMembership(ctx, orgaId);
    
    // Find all leader roles that have this team as parent
    const leaderRoles = await ctx.db
      .query("roles")
      .withIndex("by_parent_team", (q) => q.eq("parentTeamId", args.parentTeamId))
      .filter((q) => q.eq(q.field("roleType"), "leader"))
      .collect();
    
    // Get unique team IDs from these leader roles
    const childTeamIds = [...new Set(leaderRoles.map(role => role.teamId))];
    
    // Fetch and return the teams
    const childTeams = await Promise.all(
      childTeamIds.map(teamId => ctx.db.get(teamId))
    );
    
    return childTeams.filter((team): team is NonNullable<typeof team> => team !== null);
  },
});

/**
 * Create a new team
 * Requires a non-leader role that will become the leader of the new team
 */
export const createTeam = mutation({
  args: {
    orgaId: v.id("orgas"),
    name: v.string(),
    roleId: v.id("roles"), // Non-leader role that will become the leader of the new team
    parentTeamId: v.optional(v.id("teams")), // Optional parent team (for connector pattern)
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    
    // Validate the role
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    if (role.orgaId !== args.orgaId) {
      throw new Error("Role must belong to the same organization");
    }
    if (role.roleType === "leader") {
      throw new Error("Cannot create a team with a leader role. Provide a non-leader role.");
    }
    
    // If this is a top-level team (no parentTeamId), ensure there's only one top-level team
    if (!args.parentTeamId) {
      // Find all teams in the organization
      const allTeams = await ctx.db
        .query("teams")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
      
      // Check if any team already has a leader role with undefined parentTeamId
      for (const team of allTeams) {
        const leaderRole = await ctx.db
          .query("roles")
          .withIndex("by_team_and_role_type", (q) => q.eq("teamId", team._id).eq("roleType", "leader"))
          .first();
        
        if (leaderRole && !leaderRole.parentTeamId) {
          throw new Error("There can only be one top-level team in an organization");
        }
      }
    } else {
      // Validate parent team if provided
      const parentTeam = await ctx.db.get(args.parentTeamId);
      if (!parentTeam) {
        throw new Error("Parent team not found");
      }
      if (parentTeam.orgaId !== args.orgaId) {
        throw new Error("Parent team must belong to the same organization");
      }
      // Validate that the original role belongs to the parent team (double role pattern)
      if (role.teamId !== args.parentTeamId) {
        throw new Error("Role must belong to the parent team to create a child team");
      }
    }
    
    // Create team
    const teamId = await ctx.db.insert("teams", {
      orgaId: args.orgaId,
      name: args.name,
    });
    
    // Create leader role from the provided role
    // The leader role will have the same member, mission, and duties as the original role
    // The linkedRoleId connects the leader to the original role in the parent team (double role pattern)
    const leaderRoleId = await ctx.db.insert("roles", {
      orgaId: args.orgaId,
      teamId: teamId,
      parentTeamId: args.parentTeamId, // Connector to parent team
      linkedRoleId: args.parentTeamId ? args.roleId : undefined, // Link to original role in parent team
      title: role.title, // Keep the original title or could be "Leader"
      roleType: "leader",
      mission: role.mission,
      duties: role.duties,
      memberId: role.memberId,
    });
    
    // Update member's roleIds to include the new leader role
    const roleMember = await ctx.db.get(role.memberId);
    if (roleMember) {
      await ctx.db.patch(role.memberId, {
        roleIds: [...roleMember.roleIds, leaderRoleId],
      });
    }
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
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
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    
    // Update team
    const updates: {
      name?: string;
    } = {};
    
    if (args.name !== undefined) updates.name = args.name;
    
    // Build before and after with only modified fields
    const before: {
      orgaId?: Id<"orgas">;
      name?: string;
    } = {};
    const after: {
      orgaId?: Id<"orgas">;
      name?: string;
    } = {};
    
    if (args.name !== undefined) {
      before.name = team.name;
      after.name = args.name;
    }
    
    await ctx.db.patch(args.teamId, updates);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
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
 * List teams with role counts and leader connections for network diagram
 */
export const listTeamsWithRoleCounts = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      name: v.string(),
      roleCount: v.number(),
      parentTeamId: v.union(v.id("teams"), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);

    // Get all teams in the organization
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();

    // Get all roles in the organization
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();

    // Build role count map and find leader connections
    const teamRoleCounts = new Map<Id<"teams">, number>();
    const teamParentIds = new Map<Id<"teams">, Id<"teams"> | null>();

    for (const role of roles) {
      // Count roles per team
      const currentCount = teamRoleCounts.get(role.teamId) || 0;
      teamRoleCounts.set(role.teamId, currentCount + 1);

      // Track leader connections (parentTeamId from leader roles)
      if (role.roleType === "leader" && role.parentTeamId) {
        teamParentIds.set(role.teamId, role.parentTeamId);
      }
    }

    // Return teams with their role counts and parent connections
    return teams.map(team => ({
      _id: team._id,
      _creationTime: team._creationTime,
      orgaId: team.orgaId,
      name: team.name,
      roleCount: teamRoleCounts.get(team._id) || 0,
      parentTeamId: teamParentIds.get(team._id) ?? null,
    }));
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
    
    // Check if team has child teams (via leader roles with parentTeamId)
    const childLeaderRoles = await ctx.db
      .query("roles")
      .withIndex("by_parent_team", (q) => q.eq("parentTeamId", args.teamId))
      .filter((q) => q.eq(q.field("roleType"), "leader"))
      .first();
    if (childLeaderRoles) {
      throw new Error("Cannot delete team with child teams");
    }
    
    // Store before state
    const before = {
      orgaId: team.orgaId,
      name: team.name,
    };

    // Clean up roles belonging to this team and remove from members' roleIds
    const teamRoles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const role of teamRoles) {
      // Remove role from the assigned member's roleIds
      if (role.memberId) {
        const roleMember = await ctx.db.get(role.memberId);
        if (roleMember) {
          await ctx.db.patch(role.memberId, {
            roleIds: roleMember.roleIds.filter((id) => id !== role._id),
          });
        }
      }
      await ctx.db.delete(role._id);
    }

    // Clean up topics belonging to this team
    const teamTopics = await ctx.db
      .query("topics")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const topic of teamTopics) {
      await ctx.db.delete(topic._id);
    }

    // Clean up policies belonging to this team
    const teamPolicies = await ctx.db
      .query("policies")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const policy of teamPolicies) {
      await ctx.db.delete(policy._id);
    }

    // Delete team
    await ctx.db.delete(args.teamId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
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

