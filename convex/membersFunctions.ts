import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
} from "./utils";

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
      memberId: v.optional(v.id("members")),
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
          before: v.object({
            name: v.string(),
            logoUrl: v.optional(v.string()),
            colorScheme: v.object({
              primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
              secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
            }),
          }),
          after: v.object({
            name: v.string(),
            logoUrl: v.optional(v.string()),
            colorScheme: v.object({
              primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
              secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
            }),
          }),
        }),
        v.object({
          type: v.literal("Team"),
          before: v.object({
            orgaId: v.id("orgas"),
            name: v.string(),
            parentTeamId: v.optional(v.id("teams")),
            mission: v.optional(v.string()),
            isFirstTeam: v.boolean(),
          }),
          after: v.object({
            orgaId: v.id("orgas"),
            name: v.string(),
            parentTeamId: v.optional(v.id("teams")),
            mission: v.optional(v.string()),
            isFirstTeam: v.boolean(),
          }),
        }),
        v.object({
          type: v.literal("Role"),
          before: v.object({
            teamId: v.id("teams"),
            title: v.string(),
            mission: v.string(),
            duties: v.array(v.string()),
            memberId: v.optional(v.id("members")),
          }),
          after: v.object({
            teamId: v.id("teams"),
            title: v.string(),
            mission: v.string(),
            duties: v.array(v.string()),
            memberId: v.optional(v.id("members")),
          }),
        }),
        v.object({
          type: v.literal("Invitation"),
          before: v.object({
            orgaId: v.id("orgas"),
            emitterMemberId: v.id("members"),
            email: v.string(),
            status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
            sentDate: v.number(),
          }),
          after: v.object({
            orgaId: v.id("orgas"),
            emitterMemberId: v.id("members"),
            email: v.string(),
            status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
            sentDate: v.number(),
          }),
        }),
        v.object({
          type: v.literal("Meeting"),
          before: v.object({
            teamId: v.id("teams"),
            title: v.string(),
            scheduledDate: v.number(),
          }),
          after: v.object({
            teamId: v.id("teams"),
            title: v.string(),
            scheduledDate: v.number(),
          }),
        }),
        v.object({
          type: v.literal("Policy"),
          before: v.object({
            orgaId: v.id("orgas"),
            teamId: v.id("teams"),
            roleId: v.id("roles"),
            issuedDate: v.number(),
            title: v.string(),
            text: v.string(),
            visibility: v.union(v.literal("private"), v.literal("public")),
            expirationDate: v.optional(v.number()),
          }),
          after: v.object({
            orgaId: v.id("orgas"),
            teamId: v.id("teams"),
            roleId: v.id("roles"),
            issuedDate: v.number(),
            title: v.string(),
            text: v.string(),
            visibility: v.union(v.literal("private"), v.literal("public")),
            expirationDate: v.optional(v.number()),
          }),
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
    
    // Remove all roles assigned to this member
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();
    
    for (const role of roles) {
      await ctx.db.patch(role._id, {
        memberId: undefined,
      });
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

