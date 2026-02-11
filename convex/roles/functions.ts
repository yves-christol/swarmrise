import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { roleValidator } from ".";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromRole,
  getOrgaFromTeam,
  getTeamLeaderMemberId,
  hasTeamLeader,
} from "../utils";
import { buildRoleAssignmentNotification } from "../notifications/helpers";

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
 * List all roles in an organization
 */
export const listRolesInOrga = query({
  args: { orgaId: v.id("orgas") },
  returns: v.array(roleValidator),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await ctx.db
      .query("roles")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
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
      orgaId: v.id("orgas"),
      teamId: v.id("teams"),
      parentTeamId: v.optional(v.id("teams")),
      linkedRoleId: v.optional(v.id("roles")),
      title: v.string(),
      roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
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
 * Enforces one leader per team
 */
export const createRole = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
    mission: v.string(),
    duties: v.array(v.string()),
    parentTeamId: v.optional(v.id("teams")), // For leader roles: the parent team this role connects to
    memberId: v.optional(v.id("members")), // Optional: if not provided, defaults to team leader
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Enforce one leader per team
    if (args.roleType === "leader") {
      if (await hasTeamLeader(ctx, args.teamId)) {
        throw new Error("Team already has a leader. There can only be one leader per team.");
      }
      
      // Validate parent team if provided
      if (args.parentTeamId) {
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
    } else if (args.parentTeamId) {
      throw new Error("parentTeamId can only be set for leader roles");
    }
    
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
      assignedMemberId = await getTeamLeaderMemberId(ctx, args.teamId);
    }
    
    // Create role
    const roleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: args.teamId,
      parentTeamId: args.parentTeamId,
      title: args.title,
      roleType: args.roleType,
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
          parentTeamId: args.parentTeamId,
          title: args.title,
          roleType: args.roleType,
          mission: args.mission,
          duties: args.duties,
          memberId: assignedMemberId,
        },
      },
    });

    // Notify the assigned member if it's not the person creating the role
    const assignedMemberDoc = await ctx.db.get(assignedMemberId);
    if (assignedMemberDoc && assignedMemberDoc.personId !== member.personId) {
      const team = await ctx.db.get(args.teamId);
      const orga = await ctx.db.get(orgaId);
      if (team && orga) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.functions.create,
          buildRoleAssignmentNotification({
            userId: assignedMemberDoc.personId,
            orgaId: orgaId,
            memberId: assignedMemberId,
            roleId: roleId,
            roleTitle: args.title,
            teamName: team.name,
            orgaName: orga.name,
          })
        );
      }
    }

    return roleId;
  },
});

/**
 * Update a role
 * Enforces one leader per team when updating roleType to leader
 */
export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    title: v.optional(v.string()),
    roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    parentTeamId: v.optional(v.union(v.id("teams"), v.null())), // For leader roles: the parent team this role connects to
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

    // Forbid direct updates to linked leader roles (double role pattern)
    // All changes must go through the source role in the parent team
    if (role.linkedRoleId) {
      throw new Error("Operation not permitted on this role");
    }

    // Enforce one leader per team when setting roleType to leader
    if (args.roleType === "leader" && role.roleType !== "leader") {
      if (await hasTeamLeader(ctx, role.teamId)) {
        throw new Error("Team already has a leader. There can only be one leader per team.");
      }
    }
    
    // Validate parent team if provided
    if (args.parentTeamId !== undefined && args.parentTeamId !== null) {
      if (args.roleType !== "leader" && role.roleType !== "leader") {
        throw new Error("parentTeamId can only be set for leader roles");
      }
      const parentTeam = await ctx.db.get(args.parentTeamId);
      if (!parentTeam) {
        throw new Error("Parent team not found");
      }
      if (parentTeam.orgaId !== orgaId) {
        throw new Error("Parent team must belong to the same organization");
      }
      // Prevent circular references
      if (args.parentTeamId === role.teamId) {
        throw new Error("Team cannot be its own parent");
      }
    } else if (args.parentTeamId === null && role.roleType === "leader") {
      // Allow clearing parentTeamId for leader roles
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
      roleType?: "leader" | "secretary" | "referee";
      mission?: string;
      duties?: string[];
      parentTeamId?: Id<"teams">;
      memberId?: Id<"members">;
    } = {};
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.roleType !== undefined) updates.roleType = args.roleType;
    if (args.mission !== undefined) updates.mission = args.mission;
    if (args.duties !== undefined) updates.duties = args.duties;
    if (args.parentTeamId !== undefined) updates.parentTeamId = args.parentTeamId ?? undefined;
    if (args.memberId !== undefined) updates.memberId = args.memberId;
    
    // Build before and after with only modified fields
    const before: {
      teamId?: Id<"teams">;
      parentTeamId?: Id<"teams">;
      title?: string;
      roleType?: "leader" | "secretary" | "referee";
      mission?: string;
      duties?: string[];
      memberId?: Id<"members">;
    } = {};
    const after: {
      teamId?: Id<"teams">;
      parentTeamId?: Id<"teams">;
      title?: string;
      roleType?: "leader" | "secretary" | "referee";
      mission?: string;
      duties?: string[];
      memberId?: Id<"members">;
    } = {};
    
    if (args.title !== undefined) {
      before.title = role.title;
      after.title = args.title;
    }
    if (args.roleType !== undefined) {
      before.roleType = role.roleType;
      after.roleType = args.roleType;
    }
    if (args.mission !== undefined) {
      before.mission = role.mission;
      after.mission = args.mission;
    }
    if (args.duties !== undefined) {
      before.duties = role.duties;
      after.duties = args.duties;
    }
    if (args.parentTeamId !== undefined) {
      before.parentTeamId = role.parentTeamId;
      after.parentTeamId = args.parentTeamId ?? undefined;
    }
    if (args.memberId !== undefined) {
      before.memberId = role.memberId;
      after.memberId = args.memberId;
    }
    
    await ctx.db.patch(args.roleId, updates);

    // Propagate changes to linked leader roles (double role pattern)
    // Source role is authoritative - changes flow to linked roles
    const linkedRoles = await ctx.db
      .query("roles")
      .withIndex("by_linked_role", (q) => q.eq("linkedRoleId", args.roleId))
      .collect();

    if (linkedRoles.length > 0) {
      const updatedRole = await ctx.db.get(args.roleId);
      if (updatedRole) {
        for (const linked of linkedRoles) {
          // Handle member assignment changes for linked roles
          if (args.memberId !== undefined && args.memberId !== linked.memberId) {
            // Remove linked role from old member
            const oldLinkedMember = await ctx.db.get(linked.memberId);
            if (oldLinkedMember) {
              await ctx.db.patch(linked.memberId, {
                roleIds: oldLinkedMember.roleIds.filter((id) => id !== linked._id),
              });
            }
            // Add linked role to new member
            const newLinkedMember = await ctx.db.get(args.memberId);
            if (newLinkedMember) {
              await ctx.db.patch(args.memberId, {
                roleIds: [...newLinkedMember.roleIds, linked._id],
              });
            }
          }

          // Sync all propagated fields
          await ctx.db.patch(linked._id, {
            title: updatedRole.title,
            mission: updatedRole.mission,
            duties: updatedRole.duties,
            memberId: updatedRole.memberId,
          });
        }
      }
    }

    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
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

    // Notify the new member if the role was reassigned to a different person
    if (args.memberId !== undefined && args.memberId !== role.memberId) {
      const newMember = await ctx.db.get(args.memberId);
      // Don't notify if the person reassigning the role is assigning it to themselves
      if (newMember && newMember.personId !== member.personId) {
        const team = await ctx.db.get(role.teamId);
        const orga = await ctx.db.get(orgaId);
        if (team && orga) {
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.functions.create,
            buildRoleAssignmentNotification({
              userId: newMember.personId,
              orgaId: orgaId,
              memberId: args.memberId,
              roleId: args.roleId,
              roleTitle: args.title ?? role.title,
              teamName: team.name,
              orgaName: orga.name,
            })
          );
        }
      }
    }

    return args.roleId;
  },
});

/**
 * Get linked leader roles that point to roles in a given team
 * Used to display daughter team links in the team focus view
 * Returns linked roles along with their team information
 */
export const getLinkedLeaderRolesForTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(
    v.object({
      linkedRole: v.object({
        _id: v.id("roles"),
        teamId: v.id("teams"),
        linkedRoleId: v.id("roles"),
        title: v.string(),
        roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
      }),
      sourceRoleId: v.id("roles"),
      daughterTeam: v.object({
        _id: v.id("teams"),
        name: v.string(),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);

    // Get all roles in the current team
    const teamRoles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const result: {
      linkedRole: {
        _id: Id<"roles">;
        teamId: Id<"teams">;
        linkedRoleId: Id<"roles">;
        title: string;
        roleType?: "leader" | "secretary" | "referee";
      };
      sourceRoleId: Id<"roles">;
      daughterTeam: {
        _id: Id<"teams">;
        name: string;
      };
    }[] = [];

    // For each role in the current team, find linked roles pointing to it
    for (const role of teamRoles) {
      const linkedRoles = await ctx.db
        .query("roles")
        .withIndex("by_linked_role", (q) => q.eq("linkedRoleId", role._id))
        .collect();

      for (const linkedRole of linkedRoles) {
        // Get the team this linked role belongs to (daughter team)
        const daughterTeam = await ctx.db.get(linkedRole.teamId);
        if (daughterTeam && linkedRole.linkedRoleId) {
          result.push({
            linkedRole: {
              _id: linkedRole._id,
              teamId: linkedRole.teamId,
              linkedRoleId: linkedRole.linkedRoleId,
              title: linkedRole.title,
              roleType: linkedRole.roleType,
            },
            sourceRoleId: role._id,
            daughterTeam: {
              _id: daughterTeam._id,
              name: daughterTeam.name,
            },
          });
        }
      }
    }

    return result;
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

    // Prevent deletion of source roles that have linked leader roles
    // The child team must be deleted first
    const linkedRoles = await ctx.db
      .query("roles")
      .withIndex("by_linked_role", (q) => q.eq("linkedRoleId", args.roleId))
      .first();
    if (linkedRoles) {
      throw new Error("Cannot delete a role that is linked to a child team leader. Delete the child team first.");
    }

    // Store before state
    const before = {
      teamId: role.teamId,
      parentTeamId: role.parentTeamId,
      title: role.title,
      roleType: role.roleType,
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

/**
 * Get the mission for a team
 * A team's mission is the mission of its leader role
 */
export const getTeamMission = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);

    // Find the leader role for this team
    const leaderRole = await ctx.db
      .query("roles")
      .withIndex("by_team_and_role_type", (q) => q.eq("teamId", args.teamId).eq("roleType", "leader"))
      .first();

    if (!leaderRole) {
      return null;
    }

    return leaderRole.mission || null;
  },
});

/**
 * Get the mission for an organization
 * An orga's mission is the mission of the top-level team (the team whose leader has no parentTeamId)
 */
export const getOrgaMission = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);

    // Get all teams in the organization
    const allTeams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();

    // Find the top-level team (leader role with no parentTeamId)
    for (const team of allTeams) {
      const leaderRole = await ctx.db
        .query("roles")
        .withIndex("by_team_and_role_type", (q) => q.eq("teamId", team._id).eq("roleType", "leader"))
        .first();

      if (leaderRole && !leaderRole.parentTeamId) {
        return leaderRole.mission || null;
      }
    }

    return null;
  },
});

