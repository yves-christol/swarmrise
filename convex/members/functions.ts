import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { decisionValidator } from "../decisions";
import { memberValidator } from ".";
import { roleValidator } from "../roles";
import { teamValidator } from "../teams";
import { Id } from "../_generated/dataModel";
import {
  getMemberInOrga,
  getAuthenticatedUser,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getTeamLeaderMemberId,
  ensureEmailInContactInfos,
  deleteAllOrgaData,
} from "../utils";
import { contactInfo } from "../users";

/**
 * Get the current user's member document in an organization.
 * This is the "You come first" query - centered on the current user.
 */
export const getMyMember = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.union(memberValidator, v.null()),
  handler: async (ctx, args) => {
    try {
      const member = await getMemberInOrga(ctx, args.orgaId);
      return member;
    } catch {
      // User is not authenticated or not a member of this organization
      return null;
    }
  },
});

/**
 * Get a member by ID (must be authenticated and member of the same organization)
 */
export const getMemberById = query({
  args: {
    memberId: v.id("members"),
  },
    returns: v.union(memberValidator, v.null()),
 
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      return null;
    }
    await getMemberInOrga(ctx, member.orgaId);
    return member;
  },
});

/**
 * List all members in an organization
 */
export const listMembers = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(memberValidator),
  handler: async (ctx, args) => {
    await getMemberInOrga(ctx, args.orgaId);
    // Get all members of the organization, then get their users
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    
    return members;
  },
});

/**
 * List all teams a member belongs to (through their roles)
 */
export const listMemberTeams = query({
  args: {
    memberId: v.id("members"),
  },
  returns: v.array( teamValidator ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    await getMemberInOrga(ctx, member.orgaId);
    
    // Get all roles for this member
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    
    // Get unique team IDs
    const teamIds = new Set<Id<"teams">>();
    for (const role of roles) {
      teamIds.add(role.teamId);
    }
    
    // Get teams
    const teams = [];
    for (const teamId of teamIds) {
      const team = await ctx.db.get(teamId);
      if (team) {
        teams.push(team);
      }
    }
    
    return teams;
  },
});

/**
 * List all roles held by a member
 */
export const listMemberRoles = query({
  args: {
    memberId: v.id("members"),
  },
  returns: v.array( roleValidator ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    await getMemberInOrga(ctx, member.orgaId);
    return await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

/**
 * List all decisions made by a member (by author email)
 */
export const listMemberDecisions = query({
  args: {
    memberId: v.id("members"),
  },
  returns: v.array( decisionValidator ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    await getMemberInOrga(ctx, member.orgaId);
    
    // Get all decisions made by this member (by author email)
    return await ctx.db
      .query("decisions")
      .withIndex("by_orga_and_author", (q) => q.eq("orgaId", member.orgaId).eq("authorEmail", member.email))
      .collect();
  },
});

/**
 * Check if the current user can leave an organization.
 * Returns canLeave=false if member is the owner or the leader of the first (root) team.
 */
export const canLeaveOrganization = query({
  args: { orgaId: v.id("orgas") },
  returns: v.object({
    canLeave: v.boolean(),
    reason: v.optional(v.union(v.literal("owner"), v.literal("leader_of_first_team"))),
  }),
  handler: async (ctx, args) => {
    const member = await getMemberInOrga(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      return { canLeave: false, reason: "owner" as const };
    }

    // Check 1: Is owner?
    const user = await getAuthenticatedUser(ctx);
    if (orga.owner === user._id) {
      return { canLeave: false, reason: "owner" as const };
    }

    // Check 2: Is leader of first (root) team?
    const memberRoles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    for (const role of memberRoles) {
      if (role.roleType === "leader" && !role.parentTeamId) {
        return { canLeave: false, reason: "leader_of_first_team" as const };
      }
    }

    return { canLeave: true };
  },
});

/**
 * Leave an organization
 */
export const leaveOrganization = mutation({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const member = await getMemberInOrga(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }

    // Check if the leaving member is the owner
    if (orga.owner && orga.owner === user._id) {
      // Owner can only leave if they are the last member
      const allMembers = await ctx.db
        .query("members")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();

      if (allMembers.length > 1) {
        throw new Error("Owner cannot leave the organization unless they are the last member. Please transfer ownership first.");
      }

      // Owner is the last member - delete the organization and all related data
      await deleteAllOrgaData(ctx, args.orgaId);

      await ctx.db.delete(member._id);
      await ctx.db.delete(args.orgaId);

      await ctx.db.patch(user._id, {
        orgaIds: user.orgaIds.filter((id) => id !== args.orgaId),
      });

      return null;
    }

    // Server-side guard: block if leader of root team
    const memberRoles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    for (const role of memberRoles) {
      if (role.roleType === "leader" && !role.parentTeamId) {
        throw new Error("Cannot leave: you are the leader of the founding team. Reassign the leader role first.");
      }
    }

    // Collect role and team info for the decision BEFORE modifying anything
    const email = await getAuthenticatedUserEmail(ctx);
    const roleAndTeamInfo = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);

    // Reassign all roles to appropriate leaders
    for (const role of memberRoles) {
      let transferTargetId: Id<"members">;

      if (role.roleType === "leader") {
        // Leader role: transfer to parent team's leader
        if (!role.parentTeamId) {
          // Root team leader - should be blocked above, but safety check
          throw new Error("Cannot reassign root team leader role");
        }
        transferTargetId = await getTeamLeaderMemberId(ctx, role.parentTeamId);
      } else {
        // Non-leader role: transfer to same team's leader
        transferTargetId = await getTeamLeaderMemberId(ctx, role.teamId);
      }

      // Reassign the role
      await ctx.db.patch(role._id, { memberId: transferTargetId });

      // Add role to new holder's roleIds (re-read to avoid stale data)
      const targetMember = await ctx.db.get(transferTargetId);
      if (targetMember && !targetMember.roleIds.includes(role._id)) {
        await ctx.db.patch(transferTargetId, {
          roleIds: [...targetMember.roleIds, role._id],
        });
      }

      // Propagate to linked roles (double role pattern)
      const linkedRoles = await ctx.db
        .query("roles")
        .withIndex("by_linked_role", (q) => q.eq("linkedRoleId", role._id))
        .collect();

      for (const linked of linkedRoles) {
        // Remove linked role from leaving member
        const oldLinkedHolder = await ctx.db.get(linked.memberId);
        if (oldLinkedHolder && oldLinkedHolder._id === member._id) {
          // The leaving member also holds the linked role - reassign it
          await ctx.db.patch(linked._id, { memberId: transferTargetId });

          // Add linked role to target's roleIds
          const refreshedTarget = await ctx.db.get(transferTargetId);
          if (refreshedTarget && !refreshedTarget.roleIds.includes(linked._id)) {
            await ctx.db.patch(transferTargetId, {
              roleIds: [...refreshedTarget.roleIds, linked._id],
            });
          }
        }
      }
    }

    // Delete the member document
    await ctx.db.delete(member._id);

    // Remove organization from user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: user.orgaIds.filter((id) => id !== args.orgaId),
    });

    // Create decision record with proper Member diff
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName: roleAndTeamInfo.roleName,
      teamName: roleAndTeamInfo.teamName,
      targetId: member._id,
      targetType: "members",
      diff: {
        type: "Member",
        before: {
          firstname: member.firstname,
          surname: member.surname,
          email: member.email,
        },
        after: undefined,
      },
    });

    return null;
  },
});

/**
 * Update the current user's contact information for a specific organization.
 * Only the member themselves can update their contact info.
 */
export const updateMyContactInfos = mutation({
  args: {
    orgaId: v.id("orgas"),
    contactInfos: v.array(contactInfo),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the current user's member in this organization
    const member = await getMemberInOrga(ctx, args.orgaId);

    // Ensure the member's own email is always present in contactInfos
    const safeContactInfos = ensureEmailInContactInfos(args.contactInfos, member.email);

    // Update the member's contact infos
    await ctx.db.patch(member._id, {
      contactInfos: safeContactInfos,
    });

    return null;
  },
});

