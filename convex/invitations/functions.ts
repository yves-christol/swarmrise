import { query, mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { invitationValidator, invitationStatusType } from ".";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
} from "../utils";
import { buildInvitationNotification } from "../notifications/helpers";

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
    status: invitationStatusType,
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
 * Helper function to extract domain from an email address
 * Validates basic email format and returns the domain part
 */
function extractEmailDomain(email: string): string {
  const trimmedEmail = email.trim();

  // Basic format check: must have exactly one @ with content on both sides
  const parts = trimmedEmail.split("@");
  if (parts.length !== 2) {
    throw new Error("Invalid email format: must contain exactly one @ symbol");
  }

  const [localPart, domain] = parts;

  // Validate local part is not empty
  if (localPart.length === 0) {
    throw new Error("Invalid email format: missing local part before @");
  }

  // Validate domain is not empty and has basic structure
  if (domain.length === 0) {
    throw new Error("Invalid email format: missing domain after @");
  }

  if (!domain.includes('.')) {
    throw new Error("Invalid email format: domain must contain a dot");
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    throw new Error("Invalid email format: domain cannot start or end with a dot");
  }

  return domain.toLowerCase();
}

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

    // Fetch the organization to check for authorized email domains
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }

    // Validate email domain if authorized domains are configured
    if (orga.authorizedEmailDomains && orga.authorizedEmailDomains.length > 0) {
      const emailDomain = extractEmailDomain(args.email);
      const normalizedAuthorizedDomains = orga.authorizedEmailDomains.map(d => d.toLowerCase());

      if (!normalizedAuthorizedDomains.includes(emailDomain)) {
        throw new Error(
          "Email domain is not authorized for this organization. Contact an administrator for the list of allowed domains."
        );
      }
    }

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

    // Create notification for the invitee if they have a user account
    const inviteeUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (inviteeUser) {
      // Use the orga we already fetched earlier for domain validation
      const inviterName = `${member.firstname} ${member.surname}`;
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.functions.create,
        buildInvitationNotification({
          userId: inviteeUser._id,
          orgaId: args.orgaId,
          invitationId: invitationId,
          orgaName: orga.name,
          inviterName: inviterName,
        })
      );
    }

    return invitationId;
  },
});

/**
 * Update invitation status
 */
export const updateInvitationStatus = mutation({
  args: {
    invitationId: v.id("invitations"),
    status: invitationStatusType,
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

    // Delete any notifications associated with this invitation
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.functions.deleteByGroupKey,
      { groupKey: `invitation-${args.invitationId}` }
    );

    return null;
  },
});

/**
 * Internal mutation to delete old pending invitations (30+ days old)
 * Called by the cron job - does not record Decisions since this is automated cleanup
 */
export const deleteOldPendingInvitations = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_status_and_sentDate", (q) =>
        q.eq("status", "pending").lt("sentDate", thirtyDaysAgo)
      )
      .collect();

    for (const invitation of oldInvitations) {
      await ctx.db.delete(invitation._id);
    }

    return oldInvitations.length;
  },
});

