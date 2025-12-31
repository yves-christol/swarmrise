import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getTeamLeader,
} from "./utils";

/**
 * Get a member by ID (must be authenticated and member of the same organization)
 */
export const getMemberById = query({
  args: {
    memberId: v.id("members"),
  },
  returns: v.union(
    v.object({
      _id: v.id("members"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      personId: v.id("users"),
      firstname: v.string(),
      surname: v.string(),
      email: v.string(),
      pictureURL: v.optional(v.string()),
      contactInfos: v.array(
        v.object({
          type: v.union(
            v.literal("LinkedIn"),
            v.literal("Facebook"),
            v.literal("Instagram"),
            v.literal("Whatsapp"),
            v.literal("Mobile"),
            v.literal("Address")
          ),
          value: v.string(),
        })
      ),
      roleIds: v.array(v.id("roles")),
    }),
    v.null()
  ),
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
 * List all users in an organization
 */
export const listUsersInOrga = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      firstname: v.string(),
      surname: v.string(),
      email: v.string(),
      pictureURL: v.optional(v.string()),
      contactInfos: v.array(
        v.object({
          type: v.union(
            v.literal("LinkedIn"),
            v.literal("Facebook"),
            v.literal("Instagram"),
            v.literal("Whatsapp"),
            v.literal("Mobile"),
            v.literal("Address")
          ),
          value: v.string(),
        })
      ),
      orgaIds: v.array(v.id("orgas")),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    // Get all members of the organization, then get their users
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    
    const userIds = new Set<Id<"users">>();
    for (const member of members) {
      userIds.add(member.personId);
    }
    
    const users = [];
    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        users.push(user);
      }
    }
    
    return users;
  },
});

/**
 * List all teams a member belongs to (through their roles)
 */
export const listMemberTeams = query({
  args: {
    memberId: v.id("members"),
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
  returns: v.array(
    v.object({
      _id: v.id("decisions"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      timestamp: v.number(),
      authorEmail: v.string(),
      roleName: v.string(),
      teamName: v.string(),
      targetId: v.string(),
      targetType: v.string(),
      diff: v.union(
        v.object({
          type: v.literal("Organization"),
          before: v.optional(v.object({
            name: v.optional(v.string()),
            logoUrl: v.optional(v.string()),
            colorScheme: v.optional(v.object({
              primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
              secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
            })),
          })),
          after: v.optional(v.object({
            name: v.optional(v.string()),
            logoUrl: v.optional(v.string()),
            colorScheme: v.optional(v.object({
              primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
              secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
            })),
          })),
        }),
        v.object({
          type: v.literal("Team"),
          before: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            name: v.optional(v.string()),
            parentTeamId: v.optional(v.id("teams")),
            mission: v.optional(v.string()),
            isFirstTeam: v.optional(v.boolean()),
          })),
          after: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            name: v.optional(v.string()),
            parentTeamId: v.optional(v.id("teams")),
            mission: v.optional(v.string()),
            isFirstTeam: v.optional(v.boolean()),
          })),
        }),
        v.object({
          type: v.literal("Role"),
          before: v.optional(v.object({
            teamId: v.optional(v.id("teams")),
            title: v.optional(v.string()),
            mission: v.optional(v.string()),
            duties: v.optional(v.array(v.string())),
            memberId: v.optional(v.id("members")),
          })),
          after: v.optional(v.object({
            teamId: v.optional(v.id("teams")),
            title: v.optional(v.string()),
            mission: v.optional(v.string()),
            duties: v.optional(v.array(v.string())),
            memberId: v.optional(v.id("members")),
          })),
        }),
        v.object({
          type: v.literal("Invitation"),
          before: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            emitterMemberId: v.optional(v.id("members")),
            email: v.optional(v.string()),
            status: v.optional(v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted"))),
            sentDate: v.optional(v.number()),
          })),
          after: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            emitterMemberId: v.optional(v.id("members")),
            email: v.optional(v.string()),
            status: v.optional(v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted"))),
            sentDate: v.optional(v.number()),
          })),
        }),
        v.object({
          type: v.literal("Policy"),
          before: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            teamId: v.optional(v.id("teams")),
            roleId: v.optional(v.id("roles")),
            issuedDate: v.optional(v.number()),
            title: v.optional(v.string()),
            text: v.optional(v.string()),
            visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
            expirationDate: v.optional(v.number()),
          })),
          after: v.optional(v.object({
            orgaId: v.optional(v.id("orgas")),
            teamId: v.optional(v.id("teams")),
            roleId: v.optional(v.id("roles")),
            issuedDate: v.optional(v.number()),
            title: v.optional(v.string()),
            text: v.optional(v.string()),
            visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
            expirationDate: v.optional(v.number()),
          })),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    await requireAuthAndMembership(ctx, member.orgaId);
    
    // Get all decisions made by this member (by author email)
    return await ctx.db
      .query("decisions")
      .withIndex("by_author", (q) => q.eq("authorEmail", member.email))
      .filter((q) => q.eq(q.field("orgaId"), member.orgaId))
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
    const user = await import("./utils").then((m) => m.getAuthenticatedUser(ctx));
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }
    
    // Check if the leaving member is the owner
    if (orga.owner && orga.owner === member._id) {
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
        const teamLeaderId = await getTeamLeader(ctx, role.teamId);
        
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
      } catch (error) {
        // If we can't get the team leader (e.g., team doesn't exist), 
        // we can't reassign the role, so we skip it
        // This shouldn't happen in normal operation, but we handle it gracefully
        console.error(`Failed to reassign role ${role._id}:`, error);
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
      timestamp: Date.now(),
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

