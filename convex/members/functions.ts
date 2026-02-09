import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { decisionValidator } from "../decisions";
import { memberValidator } from ".";
import { roleValidator } from "../roles";
import { teamValidator } from "../teams";
import { Id } from "../_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getTeamLeaderMemberId,
  getMemberInOrga,
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
    await requireAuthAndMembership(ctx, member.orgaId);
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
    await requireAuthAndMembership(ctx, args.orgaId);
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
    await requireAuthAndMembership(ctx, member.orgaId);
    
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
    await requireAuthAndMembership(ctx, member.orgaId);
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
    await requireAuthAndMembership(ctx, member.orgaId);
    
    // Get all decisions made by this member (by author email)
    return await ctx.db
      .query("decisions")
      .withIndex("by_orga_and_author", (q) => q.eq("orgaId", member.orgaId))
      .filter((q) => q.eq(q.field("authorEmail"), member.email))
      .collect();
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
    const user = await import("../utils").then((m) => m.getAuthenticatedUser(ctx));
    const member = await requireAuthAndMembership(ctx, args.orgaId);
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
      // First, get all related entities
      const teams = await ctx.db
        .query("teams")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
      
      // Delete all roles and topics (need to query before deleting teams)
      for (const team of teams) {
        const roles = await ctx.db
          .query("roles")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        for (const role of roles) {
          await ctx.db.delete(role._id);
        }
        
        // Delete all topics for this team
        const topics = await ctx.db
          .query("topics")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        for (const topic of topics) {
          await ctx.db.delete(topic._id);
        }
      }
      
      // Delete all teams
      for (const team of teams) {
        await ctx.db.delete(team._id);
      }
      
      // Delete all invitations
      const invitations = await ctx.db
        .query("invitations")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
      for (const invitation of invitations) {
        await ctx.db.delete(invitation._id);
      }
      
      // Delete all decisions
      const decisions = await ctx.db
        .query("decisions")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
      for (const decision of decisions) {
        await ctx.db.delete(decision._id);
      }
      
      // Delete all policies
      const policies = await ctx.db
        .query("policies")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
      for (const policy of policies) {
        await ctx.db.delete(policy._id);
      }
      
      // Delete the member
      await ctx.db.delete(member._id);
      
      // Delete the organization
      await ctx.db.delete(args.orgaId);
      
      // Remove organization from user's orgaIds
      await ctx.db.patch(user._id, {
        orgaIds: user.orgaIds.filter((id) => id !== args.orgaId),
      });
      
      return null;
    }
    
    // Non-owner: proceed with normal leave process
    // Reassign all roles assigned to this member to their respective team leaders
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();
    
    for (const role of roles) {
      try {
        // Get the team leader for this role's team
        const teamLeaderId = await getTeamLeaderMemberId(ctx, role.teamId);
        
        // Reassign the role to the team leader
        await ctx.db.patch(role._id, {
          memberId: teamLeaderId,
        });
        
        // Update team leader's roleIds
        const teamLeader = await ctx.db.get(teamLeaderId);
        if (teamLeader && !teamLeader.roleIds.includes(role._id)) {
          await ctx.db.patch(teamLeaderId, {
            roleIds: [...teamLeader.roleIds, role._id],
          });
        }
        
        // Remove role from leaving member's roleIds (if still present)
        if (member.roleIds.includes(role._id)) {
          await ctx.db.patch(member._id, {
            roleIds: member.roleIds.filter((id) => id !== role._id),
          });
        }
      } catch {
        // If we can't get the team leader (e.g., team doesn't exist),
        // we can't reassign the role, so we skip it
        // This shouldn't happen in normal operation, but we handle it gracefully
        console.error("Failed to reassign role during leave operation");
      }
    }
    
    // Delete the member document
    await ctx.db.delete(member._id);
    
    // Remove organization from user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: user.orgaIds.filter((id) => id !== args.orgaId),
    });
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetId: member._id,
      targetType: "members",
      diff: {
        type: "Organization", // Using Organization as placeholder since Member diff not in schema
        before: {
          name: `${member.firstname} ${member.surname}`,
          logoUrl: member.pictureURL,
          colorScheme: { primary: { r: 0, g: 0, b: 0 }, secondary: { r: 0, g: 0, b: 0 } },
        },
        after: {
          name: "",
          logoUrl: undefined,
          colorScheme: { primary: { r: 0, g: 0, b: 0 }, secondary: { r: 0, g: 0, b: 0 } },
        },
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

    // Update the member's contact infos
    await ctx.db.patch(member._id, {
      contactInfos: args.contactInfos,
    });

    return null;
  },
});

