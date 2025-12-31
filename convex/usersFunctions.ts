import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  getAuthenticatedUser,
  getAuthenticatedUserEmail,
  requireAuthAndMembership,
} from "./utils";

/**
 * Get the current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      return await getAuthenticatedUser(ctx);
    } catch {
      return null;
    }
  },
});

/**
 * List all organizations the authenticated user belongs to
 */
export const listMyOrgas = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("orgas"),
      _creationTime: v.number(),
      name: v.string(),
      logoUrl: v.optional(v.string()),
      colorScheme: v.object({
        primary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
        secondary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
      }),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const orgas = [];
    for (const orgaId of user.orgaIds) {
      const orga = await ctx.db.get(orgaId);
      if (orga) {
        orgas.push(orga);
      }
    }
    return orgas;
  },
});

/**
 * List invitations received by the authenticated user's email
 */
export const listMyInvitations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      _creationTime: v.number(),
      orgaId: v.id("orgas"),
      emitterMemberId: v.id("members"),
      email: v.string(),
      status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
      sentDate: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .collect();
  },
});

/**
 * Update user information
 * Note: This updates the user globally. If you need to update member-specific data,
 * use the members functions instead.
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    orgaId: v.id("orgas"),
    firstname: v.optional(v.string()),
    surname: v.optional(v.string()),
    pictureURL: v.optional(v.union(v.string(), v.null())),
    contactInfos: v.optional(
      v.array(
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
      )
    ),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if user belongs to the organization
    if (!user.orgaIds.includes(args.orgaId)) {
      throw new Error("User does not belong to this organization");
    }
    
    // Update user
    const updates: {
      firstname?: string;
      surname?: string;
      pictureURL?: string;
      contactInfos?: Array<{
        type: "LinkedIn" | "Facebook" | "Instagram" | "Whatsapp" | "Mobile" | "Address";
        value: string;
      }>;
    } = {};
    
    if (args.firstname !== undefined) updates.firstname = args.firstname;
    if (args.surname !== undefined) updates.surname = args.surname;
    if (args.pictureURL !== undefined) updates.pictureURL = args.pictureURL ?? undefined;
    if (args.contactInfos !== undefined) updates.contactInfos = args.contactInfos;
    
    await ctx.db.patch(args.userId, updates);
    
    // Get updated user to sync with related members
    const updatedUser = await ctx.db.get(args.userId);
    if (!updatedUser) {
      throw new Error("Failed to retrieve updated user");
    }
    
    // Update all related members to keep them in sync
    const relatedMembers = await ctx.db
      .query("members")
      .withIndex("by_person", (q) => q.eq("personId", args.userId))
      .collect();
    
    for (const relatedMember of relatedMembers) {
      await ctx.db.patch(relatedMember._id, {
        firstname: updatedUser.firstname,
        surname: updatedUser.surname,
        pictureURL: updatedUser.pictureURL,
        contactInfos: updatedUser.contactInfos,
      });
    }
    
    return args.userId;
  },
});

/**
 * Accept a pending invitation
 */
export const acceptInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Verify the invitation is for the authenticated user
    if (invitation.email !== user.email) {
      throw new Error("This invitation is not for you");
    }
    
    // Verify the invitation is pending
    if (invitation.status !== "pending") {
      throw new Error("Invitation is not pending");
    }
    
    // Check if user already belongs to the organization
    if (user.orgaIds.includes(invitation.orgaId)) {
      throw new Error("User already belongs to this organization");
    }
    
    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
    });
    
    // Add organization to user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: [...user.orgaIds, invitation.orgaId],
    });
    
    // Create member document
    const memberId = await ctx.db.insert("members", {
      orgaId: invitation.orgaId,
      personId: user._id,
      firstname: user.firstname,
      surname: user.surname,
      email: user.email,
      pictureURL: user.pictureURL,
      contactInfos: user.contactInfos,
      roleIds: [],
    });
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const updatedInvitation = await ctx.db.get(args.invitationId);
    if (!updatedInvitation) {
      throw new Error("Failed to retrieve updated invitation");
    }
    
    // Build before and after with only modified fields (status)
    const before = {
      status: invitation.status,
    };
    const after = {
      status: updatedInvitation.status,
    };
    
    await ctx.db.insert("decisions", {
      orgaId: invitation.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName: "Member",
      teamName: "System",
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
 * Reject a pending invitation
 */
export const rejectInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Verify the invitation is for the authenticated user
    if (invitation.email !== user.email) {
      throw new Error("This invitation is not for you");
    }
    
    // Verify the invitation is pending
    if (invitation.status !== "pending") {
      throw new Error("Invitation is not pending");
    }
    
    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "rejected",
    });
    
    // Build before and after with only modified fields (status)
    const before = {
      status: invitation.status,
    };
    const after = {
      status: "rejected" as const,
    };
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    
    await ctx.db.insert("decisions", {
      orgaId: invitation.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName: "Member",
      teamName: "System",
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

