import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromRole,
  getOrgaFromTeam,
} from "./utils";

/**
 * Get a role by ID
 */
export const getRoleById = query({
  args: {
    roleId: v.id("roles"),
  },
  returns: v.union(
    v.object({
      _id: v.id("roles"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      title: v.string(),
      mission: v.string(),
      duties: v.array(v.string()),
      memberId: v.optional(v.id("members")),
    }),
    v.null()
  ),
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
      memberId: v.optional(v.id("members")),
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
 */
export const createRole = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    mission: v.string(),
    duties: v.array(v.string()),
    memberId: v.optional(v.id("members")),
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Validate member if provided
    if (args.memberId) {
      const assignedMember = await ctx.db.get(args.memberId);
      if (!assignedMember) {
        throw new Error("Member not found");
      }
      if (assignedMember.orgaId !== orgaId) {
        throw new Error("Member must belong to the same organization");
      }
    }
    
    // Create role
    const roleId = await ctx.db.insert("roles", {
      teamId: args.teamId,
      title: args.title,
      mission: args.mission,
      duties: args.duties,
      memberId: args.memberId,
    });
    
    // Update member's roleIds if member is assigned
    if (args.memberId) {
      const assignedMember = await ctx.db.get(args.memberId);
      if (assignedMember) {
        await ctx.db.patch(args.memberId, {
          roleIds: [...assignedMember.roleIds, roleId],
        });
      }
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
        before: {
          teamId: args.teamId,
          title: "",
          mission: "",
          duties: [],
          memberId: undefined,
        },
        after: {
          teamId: args.teamId,
          title: args.title,
          mission: args.mission,
          duties: args.duties,
          memberId: args.memberId,
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
    memberId: v.optional(v.union(v.id("members"), v.null())),
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
    if (args.memberId !== undefined && args.memberId !== null) {
      const assignedMember = await ctx.db.get(args.memberId);
      if (!assignedMember) {
        throw new Error("Member not found");
      }
      if (assignedMember.orgaId !== orgaId) {
        throw new Error("Member must belong to the same organization");
      }
    }
    
    // Store before state
    const before = {
      teamId: role.teamId,
      title: role.title,
      mission: role.mission,
      duties: role.duties,
      memberId: role.memberId,
    };
    
    // Handle member assignment changes
    if (args.memberId !== undefined) {
      // Remove role from old member
      if (role.memberId) {
        const oldMember = await ctx.db.get(role.memberId);
        if (oldMember) {
          await ctx.db.patch(role.memberId, {
            roleIds: oldMember.roleIds.filter((id) => id !== args.roleId),
          });
        }
      }
      
      // Add role to new member
      if (args.memberId) {
        const newMember = await ctx.db.get(args.memberId);
        if (newMember) {
          await ctx.db.patch(args.memberId, {
            roleIds: [...newMember.roleIds, args.roleId],
          });
        }
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
    if (args.memberId !== undefined) updates.memberId = args.memberId ?? undefined;
    
    await ctx.db.patch(args.roleId, updates);
    
    // Get updated role for after state
    const updatedRole = await ctx.db.get(args.roleId);
    if (!updatedRole) {
      throw new Error("Failed to retrieve updated role");
    }
    
    const after = {
      teamId: updatedRole.teamId,
      title: updatedRole.title,
      mission: updatedRole.mission,
      duties: updatedRole.duties,
      memberId: updatedRole.memberId,
    };
    
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
        after,
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
        after: {
          teamId: role.teamId,
          title: "",
          mission: "",
          duties: [],
          memberId: undefined,
        },
      },
    });
    
    return null;
  },
});

