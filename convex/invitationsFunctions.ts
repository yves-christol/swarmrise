import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { invitationValidator, invitationStatusValidator } from "./validators";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
} from "./utils";

/**
 * Get an invitation by ID
 */
export const getInvitationById = query({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.union(invitationValidator, v.null()),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      return null;
    }
    await requireAuthAndMembership(ctx, invitation.orgaId);
    return invitation;
  },
});

/**
 * List all invitations in an organization
 */
export const listInvitationsInOrga = query({
  args: {
    orgaId: v.id("orgas"),
    status: invitationStatusValidator,
  },
  returns: v.array(invitationValidator),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    if (args.status) {
      return await ctx.db
        .query("invitations")
        .withIndex("by_orga_and_status", (q) =>
          q.eq("orgaId", args.orgaId).eq("status", args.status)
        )
        .collect();
    } else {
      return await ctx.db
        .query("invitations")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
    }
  },
});

/**
 * Create a new invitation
 */
export const createInvitation = mutation({
  args: {
    orgaId: v.id("orgas"),
    email: v.string(),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    
    // Check if user with this email already exists in the organization
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("orgaId"), args.orgaId))
      .first();
    
    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }
    
    // Check for pending invitation
    const pendingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_orga_and_status", (q) =>
        q.eq("orgaId", args.orgaId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (pendingInvitation) {
      throw new Error("A pending invitation already exists for this email");
    }
    
    // Create invitation
    const invitationId = await ctx.db.insert("invitations", {
      orgaId: args.orgaId,
      emitterMemberId: member._id,
      email: args.email,
      status: "pending",
      sentDate: Date.now(),
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
      targetId: invitationId,
      targetType: "invitations",
      diff: {
        type: "Invitation",
        before: undefined,
        after: {
          orgaId: args.orgaId,
          emitterMemberId: member._id,
          email: args.email,
          status: "pending" as const,
          sentDate: Date.now(),
        },
      },
    });
    
    return invitationId;
  },
});

/**
 * Update invitation status
 */
export const updateInvitationStatus = mutation({
  args: {
    invitationId: v.id("invitations"),
    status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    const member = await requireAuthAndMembership(ctx, invitation.orgaId);
    
    // Update invitation
    await ctx.db.patch(args.invitationId, {
      status: args.status,
    });
    
    // Build before and after with only modified fields (status)
    const before = {
      status: invitation.status,
    };
    const after = {
      status: args.status,
    };
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, invitation.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: invitation.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.invitationId,
      targetType: "invitations",
      diff: {
        type: "Invitation",
        before,
        after,
      },
    });
    
    return args.invitationId;
  },
});

/**
 * Delete an invitation
 */
export const deleteInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    const member = await requireAuthAndMembership(ctx, invitation.orgaId);
    
    // Store before state
    const before = {
      orgaId: invitation.orgaId,
      emitterMemberId: invitation.emitterMemberId,
      email: invitation.email,
      status: invitation.status,
      sentDate: invitation.sentDate,
    };
    
    // Delete invitation
    await ctx.db.delete(args.invitationId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, invitation.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: invitation.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.invitationId,
      targetType: "invitations",
      diff: {
        type: "Invitation",
        before,
        after: undefined,
      },
    });
    
    return null;
  },
});

