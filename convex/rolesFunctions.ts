import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { roleValidator } from "./validators";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromRole,
  getOrgaFromTeam,
  getTeamLeader,
} from "./utils";

/**
 * Get a role by ID
 */
export const getRoleById = query({
  args: {
    roleId: v.id("roles"),
  },
  returns: v.union(roleValidator, v.null()),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromRole(ctx, args.roleId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db.get(args.roleId);
  },
});

/**
 * List all roles in a team
 */
export const listRolesInTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      title: v.string(),
      mission: v.string(),
      duties: v.array(v.string()),
      memberId: v.id("members"),
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

/**
 * Create a new role
 * The role will be automatically assigned to the Leader of the Team by default
 */
export const createRole = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    mission: v.string(),
    duties: v.array(v.string()),
    memberId: v.optional(v.id("members")), // Optional: if not provided, defaults to team leader
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Determine which member should hold the role
    // Default to team leader if not specified
    let assignedMemberId: Id<"members">;
    if (args.memberId) {
      const assignedMember = await ctx.db.get(args.memberId);
      if (!assignedMember) {
        throw new Error("Member not found");
      }
      if (assignedMember.orgaId !== orgaId) {
        throw new Error("Member must belong to the same organization");
      }
      assignedMemberId = args.memberId;
    } else {
      // Default to team leader
      assignedMemberId = await getTeamLeader(ctx, args.teamId);
    }
    
    // Create role
    const roleId = await ctx.db.insert("roles", {
      teamId: args.teamId,
      title: args.title,
      mission: args.mission,
      duties: args.duties,
      memberId: assignedMemberId,
    });
    
    // Update member's roleIds
    const assignedMember = await ctx.db.get(assignedMemberId);
    if (assignedMember) {
      await ctx.db.patch(assignedMemberId, {
        roleIds: [...assignedMember.roleIds, roleId],
      });
    }
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: roleId,
      targetType: "roles",
      diff: {
        type: "Role",
        before: undefined,
        after: {
          teamId: args.teamId,
          title: args.title,
          mission: args.mission,
          duties: args.duties,
          memberId: assignedMemberId,
        },
      },
    });
    
    return roleId;
  },
});

/**
 * Update a role
 */
export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    title: v.optional(v.string()),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    memberId: v.optional(v.id("members")), // Optional: if provided, must be a valid member ID
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromRole(ctx, args.roleId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Validate member if provided
    if (args.memberId !== undefined) {
      const assignedMember = await ctx.db.get(args.memberId);
      if (!assignedMember) {
        throw new Error("Member not found");
      }
      if (assignedMember.orgaId !== orgaId) {
        throw new Error("Member must belong to the same organization");
      }
    }
    
    // Handle member assignment changes
    if (args.memberId !== undefined && args.memberId !== role.memberId) {
      // Remove role from old member
      const oldMember = await ctx.db.get(role.memberId);
      if (oldMember) {
        await ctx.db.patch(role.memberId, {
          roleIds: oldMember.roleIds.filter((id) => id !== args.roleId),
        });
      }
      
      // Add role to new member
      const newMember = await ctx.db.get(args.memberId);
      if (newMember) {
        await ctx.db.patch(args.memberId, {
          roleIds: [...newMember.roleIds, args.roleId],
        });
      }
    }
    
    // Update role
    const updates: {
      title?: string;
      mission?: string;
      duties?: string[];
      memberId?: Id<"members">;
    } = {};
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.mission !== undefined) updates.mission = args.mission;
    if (args.duties !== undefined) updates.duties = args.duties;
    if (args.memberId !== undefined) updates.memberId = args.memberId;
    
    // Build before and after with only modified fields
    const before: {
      teamId?: Id<"teams">;
      title?: string;
      mission?: string;
      duties?: string[];
      memberId?: Id<"members">;
    } = {};
    const after: {
      teamId?: Id<"teams">;
      title?: string;
      mission?: string;
      duties?: string[];
      memberId?: Id<"members">;
    } = {};
    
    if (args.title !== undefined) {
      before.title = role.title;
      after.title = args.title;
    }
    if (args.mission !== undefined) {
      before.mission = role.mission;
      after.mission = args.mission;
    }
    if (args.duties !== undefined) {
      before.duties = role.duties;
      after.duties = args.duties;
    }
    if (args.memberId !== undefined) {
      before.memberId = role.memberId;
      after.memberId = args.memberId;
    }
    
    await ctx.db.patch(args.roleId, updates);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.roleId,
      targetType: "roles",
      diff: {
        type: "Role",
        before: Object.keys(before).length > 0 ? before : undefined,
        after: Object.keys(after).length > 0 ? after : undefined,
      },
    });
    
    return args.roleId;
  },
});

/**
 * Delete a role
 */
export const deleteRole = mutation({
  args: {
    roleId: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromRole(ctx, args.roleId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Store before state
    const before = {
      teamId: role.teamId,
      title: role.title,
      mission: role.mission,
      duties: role.duties,
      memberId: role.memberId,
    };
    
    // Remove role from member if assigned
    if (role.memberId) {
      const assignedMember = await ctx.db.get(role.memberId);
      if (assignedMember) {
        await ctx.db.patch(role.memberId, {
          roleIds: assignedMember.roleIds.filter((id) => id !== args.roleId),
        });
      }
    }
    
    // Delete role
    await ctx.db.delete(args.roleId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.roleId,
      targetType: "roles",
      diff: {
        type: "Role",
        before,
        after: undefined,
      },
    });
    
    return null;
  },
});

