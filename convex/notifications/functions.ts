import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "../utils";
import {
  notificationValidator,
  notificationPayload,
  notificationPriorityType,
} from "./index";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all notifications for the authenticated user
 */
export const getAll = query({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get unread notifications for the authenticated user
 */
export const getUnread = query({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();
  },
});

/**
 * Get unread notification count for the authenticated user
 */
export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();
    return notifications.length;
  },
});

/**
 * Get notifications for a specific organization
 */
export const getByOrga = query({
  args: { orgaId: v.id("orgas") },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .collect();
  },
});

/**
 * Get non-archived notifications for the authenticated user
 */
export const getActive = query({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", user._id).eq("isArchived", false)
      )
      .collect();
  },
});

/**
 * Get a single notification by ID
 */
export const getById = query({
  args: { notificationId: v.id("notifications") },
  returns: v.union(notificationValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    // Ensure the notification belongs to the authenticated user
    if (!notification || notification.userId !== user._id) {
      return null;
    }

    return notification;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Mark a notification as unread
 */
export const markAsUnread = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    if (notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: false,
        readAt: undefined,
      });
    }

    return null;
  },
});

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllAsRead = mutation({
  args: {},
  returns: v.number(), // Returns count of notifications marked as read
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    const now = Date.now();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return unreadNotifications.length;
  },
});

/**
 * Mark all notifications as read for a specific organization
 */
export const markAllAsReadByOrga = mutation({
  args: { orgaId: v.id("orgas") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", user._id).eq("orgaId", args.orgaId)
      )
      .collect();

    const now = Date.now();
    let count = 0;
    for (const notification of notifications) {
      if (!notification.isRead) {
        await ctx.db.patch(notification._id, {
          isRead: true,
          readAt: now,
        });
        count++;
      }
    }

    return count;
  },
});

/**
 * Archive a notification
 */
export const archive = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    if (!notification.isArchived) {
      await ctx.db.patch(args.notificationId, {
        isArchived: true,
        archivedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Unarchive a notification
 */
export const unarchive = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    if (notification.isArchived) {
      await ctx.db.patch(args.notificationId, {
        isArchived: false,
        archivedAt: undefined,
      });
    }

    return null;
  },
});

/**
 * Delete a notification
 */
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
    return null;
  },
});

/**
 * Delete all archived notifications for the authenticated user
 */
export const removeAllArchived = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const archivedNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", user._id).eq("isArchived", true)
      )
      .collect();

    for (const notification of archivedNotifications) {
      await ctx.db.delete(notification._id);
    }

    return archivedNotifications.length;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for use by other modules)
// ============================================================================

/**
 * Create a notification (internal use only)
 * Called by other modules when events occur that should generate notifications
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    orgaId: v.optional(v.id("orgas")),
    memberId: v.optional(v.id("members")),
    payload: notificationPayload,
    priority: notificationPriorityType,
    expiresAt: v.optional(v.number()),
    groupKey: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      orgaId: args.orgaId,
      memberId: args.memberId,
      payload: args.payload,
      priority: args.priority,
      isRead: false,
      isArchived: false,
      expiresAt: args.expiresAt,
      groupKey: args.groupKey,
    });

    return notificationId;
  },
});

/**
 * Create notifications for multiple users (internal use only)
 * Useful for broadcasting notifications to team members
 */
export const createBatch = internalMutation({
  args: {
    notifications: v.array(
      v.object({
        userId: v.id("users"),
        orgaId: v.optional(v.id("orgas")),
        memberId: v.optional(v.id("members")),
        payload: notificationPayload,
        priority: notificationPriorityType,
        expiresAt: v.optional(v.number()),
        groupKey: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(v.id("notifications")),
  handler: async (ctx, args) => {
    const ids: Id<"notifications">[] = [];

    for (const notification of args.notifications) {
      const id = await ctx.db.insert("notifications", {
        userId: notification.userId,
        orgaId: notification.orgaId,
        memberId: notification.memberId,
        payload: notification.payload,
        priority: notification.priority,
        isRead: false,
        isArchived: false,
        expiresAt: notification.expiresAt,
        groupKey: notification.groupKey,
      });
      ids.push(id);
    }

    return ids;
  },
});

/**
 * Delete notifications by group key (internal use only)
 * Useful when an action is undone (e.g., invitation cancelled)
 */
export const deleteByGroupKey = internalMutation({
  args: { groupKey: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_group_key", (q) => q.eq("groupKey", args.groupKey))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return notifications.length;
  },
});

/**
 * Delete notifications for a specific user in an organization (internal use only)
 * Useful when a member is removed from an organization
 */
export const deleteByUserAndOrga = internalMutation({
  args: {
    userId: v.id("users"),
    orgaId: v.id("orgas"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", args.userId).eq("orgaId", args.orgaId)
      )
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return notifications.length;
  },
});

/**
 * Clean up expired notifications (internal use only)
 * Should be called periodically by a scheduled function
 */
export const cleanupExpired = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();

    // Query only notifications that have already expired using index ordering
    const expiredNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const notification of expiredNotifications) {
      await ctx.db.delete(notification._id);
    }

    return expiredNotifications.length;
  },
});
