import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { userValidator, contactInfos, ContactInfos } from ".";
import { orgaValidator } from "../orgas";
import { invitationValidator } from "../invitations";
import {
  getAuthenticatedUser,
  getAuthenticatedUserEmail,
} from "../utils";

/**
 * Get the current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(userValidator, v.null()),
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
  returns: v.array(orgaValidator),
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
  returns: v.array(invitationValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .collect();
  },
});

/**
 * List pending invitations with organization details for the authenticated user
 */
export const listMyPendingInvitationsWithOrga = query({
  args: {},
  returns: v.array(
    v.object({
      invitation: invitationValidator,
      orga: v.object({
        _id: v.id("orgas"),
        name: v.string(),
        logoUrl: v.optional(v.string()),
      }),
      emitterName: v.string(),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    // Get all pending invitations for this user
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Enrich with org data
    const result = [];
    for (const invitation of invitations) {
      const orga = await ctx.db.get(invitation.orgaId);
      if (!orga) continue;

      const emitter = await ctx.db.get(invitation.emitterMemberId);
      const emitterName = emitter
        ? `${emitter.firstname} ${emitter.surname}`.trim() || emitter.email
        : "Unknown";

      result.push({
        invitation,
        orga: {
          _id: orga._id,
          name: orga.name,
          logoUrl: orga.logoUrl,
        },
        emitterName,
      });
    }

    return result;
  },
});

/**
 * Update user information
 * Note: This updates the user globally. If you need to update member-specific data,
 * use the members functions instead.
 * Security: Users can only update their own profile.
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    firstname: v.optional(v.string()),
    surname: v.optional(v.string()),
    pictureURL: v.optional(v.union(v.string(), v.null())),
    contactInfos: contactInfos,
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Authorization check: users can only update their own profile
    const authenticatedUser = await getAuthenticatedUser(ctx);
    if (authenticatedUser._id !== args.userId) {
      throw new Error("Unauthorized: You can only update your own profile");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Update user
    const updates: {
      firstname?: string;
      surname?: string;
      pictureURL?: string;
      contactInfos?: ContactInfos;
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
    if (!memberId) {
      throw new Error("Failed to insert new member accepting an invitation");
    }
    
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
 * Sync current user's profile data (including pictureURL) to all their member records.
 * Useful for backfilling existing members or manual re-sync after profile update.
 */
export const syncProfileToMembers = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    // Find all members linked to this user
    const members = await ctx.db
      .query("members")
      .withIndex("by_person", (q) => q.eq("personId", user._id))
      .collect();

    // Update each member with current user profile data
    let syncedCount = 0;
    for (const member of members) {
      await ctx.db.patch(member._id, {
        firstname: user.firstname,
        surname: user.surname,
        pictureURL: user.pictureURL,
        contactInfos: user.contactInfos,
      });
      syncedCount++;
    }

    return syncedCount;
  },
});

/**
 * Internal: Sync a user's profile data to all their member records by email.
 * Can be run from the Convex dashboard for testing/backfill.
 */
export const syncUserProfileByEmail = internalMutation({
  args: {
    email: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error(`User not found with email: ${args.email}`);
    }

    // Find all members linked to this user
    const members = await ctx.db
      .query("members")
      .withIndex("by_person", (q) => q.eq("personId", user._id))
      .collect();

    // Update each member with current user profile data
    let syncedCount = 0;
    for (const member of members) {
      await ctx.db.patch(member._id, {
        firstname: user.firstname,
        surname: user.surname,
        pictureURL: user.pictureURL,
        contactInfos: user.contactInfos,
      });
      syncedCount++;
    }

    return syncedCount;
  },
});
