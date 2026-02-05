import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../utils";
import {
  notificationPreferencesValidator,
  channelPreferences,
  digestFrequency,
  createDefaultPreferences,
  ChannelPreferences,
} from "./index";
import { NotificationCategory } from "../notifications";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get notification preferences for the authenticated user
 * Returns global preferences (orgaId = undefined)
 */
export const getGlobal = query({
  args: {},
  returns: v.union(notificationPreferencesValidator, v.null()),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", undefined)
      )
      .unique();
  },
});

/**
 * Get notification preferences for a specific organization
 */
export const getByOrga = query({
  args: { orgaId: v.id("orgas") },
  returns: v.union(notificationPreferencesValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();
  },
});

/**
 * Get all notification preferences for the authenticated user
 * Includes global and all org-specific preferences
 */
export const getAll = query({
  args: {},
  returns: v.array(notificationPreferencesValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get effective preferences for a user in a specific org context
 * Falls back to global preferences if org-specific not set
 */
export const getEffective = query({
  args: { orgaId: v.optional(v.id("orgas")) },
  returns: v.union(notificationPreferencesValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Try org-specific preferences first
    if (args.orgaId) {
      const orgPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_user_and_orga", (q) =>
          q.eq("userId", user._id).eq("orgaId", args.orgaId)
        )
        .unique();

      if (orgPrefs) {
        return orgPrefs;
      }
    }

    // Fall back to global preferences
    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", undefined)
      )
      .unique();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update global notification preferences
 */
export const upsertGlobal = mutation({
  args: {
    invitation: channelPreferences,
    message: channelPreferences,
    policy_global: channelPreferences,
    policy_team: channelPreferences,
    decision: channelPreferences,
    role_assignment: channelPreferences,
    mention: channelPreferences,
    system: channelPreferences,
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
    digestFrequency: digestFrequency,
  },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Check if global preferences exist
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", undefined)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        invitation: args.invitation,
        message: args.message,
        policy_global: args.policy_global,
        policy_team: args.policy_team,
        decision: args.decision,
        role_assignment: args.role_assignment,
        mention: args.mention,
        system: args.system,
        quietHoursStart: args.quietHoursStart,
        quietHoursEnd: args.quietHoursEnd,
        digestFrequency: args.digestFrequency,
      });
      return existing._id;
    }

    // Create new global preferences
    return await ctx.db.insert("notificationPreferences", {
      userId: user._id,
      orgaId: undefined,
      invitation: args.invitation,
      message: args.message,
      policy_global: args.policy_global,
      policy_team: args.policy_team,
      decision: args.decision,
      role_assignment: args.role_assignment,
      mention: args.mention,
      system: args.system,
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
      digestFrequency: args.digestFrequency,
    });
  },
});

/**
 * Create or update organization-specific notification preferences
 */
export const upsertByOrga = mutation({
  args: {
    orgaId: v.id("orgas"),
    invitation: channelPreferences,
    message: channelPreferences,
    policy_global: channelPreferences,
    policy_team: channelPreferences,
    decision: channelPreferences,
    role_assignment: channelPreferences,
    mention: channelPreferences,
    system: channelPreferences,
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
    digestFrequency: digestFrequency,
  },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Check if org preferences exist
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        invitation: args.invitation,
        message: args.message,
        policy_global: args.policy_global,
        policy_team: args.policy_team,
        decision: args.decision,
        role_assignment: args.role_assignment,
        mention: args.mention,
        system: args.system,
        quietHoursStart: args.quietHoursStart,
        quietHoursEnd: args.quietHoursEnd,
        digestFrequency: args.digestFrequency,
      });
      return existing._id;
    }

    // Create new org-specific preferences
    return await ctx.db.insert("notificationPreferences", {
      userId: user._id,
      orgaId: args.orgaId,
      invitation: args.invitation,
      message: args.message,
      policy_global: args.policy_global,
      policy_team: args.policy_team,
      decision: args.decision,
      role_assignment: args.role_assignment,
      mention: args.mention,
      system: args.system,
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
      digestFrequency: args.digestFrequency,
    });
  },
});

/**
 * Update a single category preference
 */
export const updateCategory = mutation({
  args: {
    orgaId: v.optional(v.id("orgas")),
    category: v.union(
      v.literal("invitation"),
      v.literal("message"),
      v.literal("policy_global"),
      v.literal("policy_team"),
      v.literal("decision"),
      v.literal("role_assignment"),
      v.literal("mention"),
      v.literal("system")
    ),
    preferences: channelPreferences,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Find existing preferences
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();

    if (!existing) {
      throw new Error(
        "Notification preferences not found. Create preferences first."
      );
    }

    // Update the specific category
    await ctx.db.patch(existing._id, {
      [args.category]: args.preferences,
    });

    return null;
  },
});

/**
 * Update quiet hours
 */
export const updateQuietHours = mutation({
  args: {
    orgaId: v.optional(v.id("orgas")),
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Validate hours
    if (
      args.quietHoursStart !== undefined &&
      (args.quietHoursStart < 0 || args.quietHoursStart > 23)
    ) {
      throw new Error("quietHoursStart must be between 0 and 23");
    }
    if (
      args.quietHoursEnd !== undefined &&
      (args.quietHoursEnd < 0 || args.quietHoursEnd > 23)
    ) {
      throw new Error("quietHoursEnd must be between 0 and 23");
    }

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();

    if (!existing) {
      throw new Error(
        "Notification preferences not found. Create preferences first."
      );
    }

    await ctx.db.patch(existing._id, {
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
    });

    return null;
  },
});

/**
 * Update digest frequency
 */
export const updateDigestFrequency = mutation({
  args: {
    orgaId: v.optional(v.id("orgas")),
    digestFrequency: digestFrequency,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();

    if (!existing) {
      throw new Error(
        "Notification preferences not found. Create preferences first."
      );
    }

    await ctx.db.patch(existing._id, {
      digestFrequency: args.digestFrequency,
    });

    return null;
  },
});

/**
 * Delete organization-specific preferences (revert to global)
 */
export const removeByOrga = mutation({
  args: { orgaId: v.id("orgas") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

/**
 * Initialize default preferences for a new user
 * Should be called when a user is created
 */
export const initializeDefaults = mutation({
  args: {},
  returns: v.id("notificationPreferences"),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    // Check if preferences already exist
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", undefined)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create default preferences
    const defaults = createDefaultPreferences(user._id);
    return await ctx.db.insert("notificationPreferences", {
      userId: user._id,
      orgaId: undefined,
      invitation: defaults.invitation,
      message: defaults.message,
      policy_global: defaults.policy_global,
      policy_team: defaults.policy_team,
      decision: defaults.decision,
      role_assignment: defaults.role_assignment,
      mention: defaults.mention,
      system: defaults.system,
      quietHoursStart: defaults.quietHoursStart,
      quietHoursEnd: defaults.quietHoursEnd,
      digestFrequency: defaults.digestFrequency,
    });
  },
});
