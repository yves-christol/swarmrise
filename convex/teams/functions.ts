import { query, mutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { teamValidator } from ".";
import { DEFAULT_COLUMNS } from "../kanban";
import {
  getMemberInOrga,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromTeam,
} from "../utils";

/**
 * Convert a 7-character hex color string (e.g. "#3B82F6") to HSL.
 * Returns { h: 0-360, s: 0-100, l: 0-100 }.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Validate a team color hex string.
 * - Must be a 7-character hex string matching /^#[0-9A-Fa-f]{6}$/
 * - HSL lightness must be between 25% and 75%
 * - HSL saturation must be >= 30%
 * Throws a ConvexError if validation fails.
 */
export function validateTeamColor(hex: string): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new ConvexError(
      `Invalid color format "${hex}". Expected a 7-character hex string like "#3B82F6".`
    );
  }

  const { s, l } = hexToHsl(hex);

  if (l < 25 || l > 75) {
    throw new ConvexError(
      `Color "${hex}" has lightness ${l}% which is outside the allowed range (25-75%).`
    );
  }

  if (s < 30) {
    throw new ConvexError(
      `Color "${hex}" has saturation ${s}% which is below the minimum (30%).`
    );
  }
}

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
    await getMemberInOrga(ctx, orgaId);
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
  returns: v.array(teamValidator),
  handler: async (ctx, args) => {
    await getMemberInOrga(ctx, args.orgaId);
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
  returns: v.array(teamValidator),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.parentTeamId);
    await getMemberInOrga(ctx, orgaId);
    
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
 * List connected teams (parent + children) for a given team.
 * Parent is found via the team's leader role's parentTeamId.
 * Children are teams whose leader role has parentTeamId pointing to this team.
 */
export const listConnectedTeams = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.object({
    parent: v.union(teamValidator, v.null()),
    children: v.array(teamValidator),
  }),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await getMemberInOrga(ctx, orgaId);

    // Find parent: this team's leader role with a parentTeamId
    const teamRoles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("roleType"), "leader"))
      .collect();

    let parent = null;
    for (const role of teamRoles) {
      if (role.parentTeamId) {
        parent = await ctx.db.get(role.parentTeamId);
        break;
      }
    }

    // Find children: leader roles with parentTeamId pointing to this team
    const childLeaderRoles = await ctx.db
      .query("roles")
      .withIndex("by_parent_team", (q) => q.eq("parentTeamId", args.teamId))
      .filter((q) => q.eq(q.field("roleType"), "leader"))
      .collect();

    const childTeamIds = [...new Set(childLeaderRoles.map((role) => role.teamId))];
    const childTeams = await Promise.all(childTeamIds.map((id) => ctx.db.get(id)));

    return {
      parent,
      children: childTeams.filter((t): t is NonNullable<typeof t> => t !== null),
    };
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
    const member = await getMemberInOrga(ctx, args.orgaId);
    
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
    
    // Create secretary role assigned to the leader's member
    const secretaryRoleId = await ctx.db.insert("roles", {
      orgaId: args.orgaId,
      teamId: teamId,
      title: "Secretary",
      roleType: "secretary",
      mission: "",
      duties: [],
      memberId: role.memberId,
    });

    // Create referee role assigned to the leader's member
    const refereeRoleId = await ctx.db.insert("roles", {
      orgaId: args.orgaId,
      teamId: teamId,
      title: "Referee",
      roleType: "referee",
      mission: "",
      duties: [],
      memberId: role.memberId,
    });

    // Update member's roleIds to include the new leader, secretary, and referee roles
    const roleMember = await ctx.db.get(role.memberId);
    if (roleMember) {
      await ctx.db.patch(role.memberId, {
        roleIds: [...roleMember.roleIds, leaderRoleId, secretaryRoleId, refereeRoleId],
      });
    }

    // Auto-create team channel
    await ctx.db.insert("channels", {
      orgaId: args.orgaId,
      kind: "team",
      teamId,
      isArchived: false,
    });

    // Auto-create Kanban board with default columns
    const boardId = await ctx.db.insert("kanbanBoards", {
      teamId,
      orgaId: args.orgaId,
      columnOrder: [],
    });

    const columnIds: Id<"kanbanColumns">[] = [];
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      const columnId = await ctx.db.insert("kanbanColumns", {
        boardId,
        orgaId: args.orgaId,
        name: DEFAULT_COLUMNS[i],
        position: i,
      });
      columnIds.push(columnId);
    }

    await ctx.db.patch(boardId, { columnOrder: columnIds });

    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetTeamId: teamId,
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
    color: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await getMemberInOrga(ctx, orgaId);

    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Validate color if provided
    if (args.color !== undefined && args.color !== null) {
      validateTeamColor(args.color);
    }

    // Update team
    const updates: {
      name?: string;
      color?: string;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) {
      updates.color = args.color ?? undefined;
    }

    // Build before and after with only modified fields
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (args.name !== undefined) {
      before.name = team.name;
      after.name = args.name;
    }
    if (args.color !== undefined) {
      before.color = team.color;
      after.color = args.color;
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
      targetTeamId: args.teamId,
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
      color: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    await getMemberInOrga(ctx, args.orgaId);

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
      color: team.color,
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
    const member = await getMemberInOrga(ctx, orgaId);
    
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

    // Archive team channel (messages remain readable)
    const teamChannel = await ctx.db
      .query("channels")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();
    if (teamChannel) {
      await ctx.db.patch(teamChannel._id, {
        isArchived: true,
        archivedAt: Date.now(),
      });
    }

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

    // Clean up Kanban data
    const teamBoard = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    if (teamBoard) {
      const boardCards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_board", (q) => q.eq("boardId", teamBoard._id))
        .collect();
      for (const card of boardCards) {
        await ctx.db.delete(card._id);
      }

      const boardColumns = await ctx.db
        .query("kanbanColumns")
        .withIndex("by_board", (q) => q.eq("boardId", teamBoard._id))
        .collect();
      for (const column of boardColumns) {
        await ctx.db.delete(column._id);
      }

      await ctx.db.delete(teamBoard._id);
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
      targetTeamId: args.teamId,
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

