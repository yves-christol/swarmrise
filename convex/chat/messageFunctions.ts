import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { embeddedToolType } from ".";
import { requireChannelAccess, requireNotArchived } from "./access";
import {
  buildMessageNotification,
  getChannelDisplayName,
  getChannelRecipients,
} from "../notifications/helpers";

/**
 * Send a message to a channel.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    text: v.string(),
    mentions: v.optional(v.array(v.id("members"))),
    imageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmed = args.text.trim();
    // Allow empty text only when an image is attached
    if (trimmed.length === 0 && !args.imageId) {
      throw new Error("Message cannot be empty");
    }

    // Deduplicate mentions
    const mentions = args.mentions ? [...new Set(args.mentions)] : undefined;

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmed,
      isEdited: false,
      mentions,
      imageId: args.imageId,
    });

    // Track the image in storageFiles for access control
    if (args.imageId) {
      await ctx.db.insert("storageFiles", {
        storageId: args.imageId,
        orgaId: channel.orgaId,
        uploadedBy: member.personId,
        purpose: "chat_image",
      });
    }

    // --- Chat message notifications (coalesced) ---
    const recipients = await getChannelRecipients(ctx, channel, member._id);
    const channelName = await getChannelDisplayName(ctx, channel, member._id);
    const senderName = `${member.firstname} ${member.surname}`;
    const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + "..." : trimmed;
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = Date.now();

    const notifications: Array<ReturnType<typeof buildMessageNotification>> = [];
    for (const r of recipients) {
      // Check if user read the channel recently (within 5 min)
      const readPos = await ctx.db
        .query("channelReadPositions")
        .withIndex("by_channel_and_member", (q) =>
          q.eq("channelId", args.channelId).eq("memberId", r.memberId)
        )
        .unique();
      if (readPos && now - readPos.lastReadTimestamp < FIVE_MINUTES) continue;

      // Check if an unread notification already exists for this channel+user
      const groupKey = `chat-message-${args.channelId}-${r.userId}`;
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_group_key", (q) => q.eq("groupKey", groupKey))
        .first();
      if (existing && !existing.isRead) continue;

      notifications.push(
        buildMessageNotification({
          userId: r.userId,
          orgaId: channel.orgaId,
          memberId: r.memberId,
          messageId,
          channelId: args.channelId,
          channelName,
          teamId: channel.teamId,
          teamName: channel.teamId
            ? (await ctx.db.get(channel.teamId))?.name
            : undefined,
          senderName,
          preview,
        })
      );
    }
    if (notifications.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
        notifications,
      });
    }

    return messageId;
  },
});

/**
 * Mark a channel as read for the authenticated member.
 * Updates or creates the read position.
 */
export const markAsRead = mutation({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);

    const existing = await ctx.db
      .query("channelReadPositions")
      .withIndex("by_channel_and_member", (q) =>
        q.eq("channelId", args.channelId).eq("memberId", member._id)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadTimestamp: now,
      });
    } else {
      await ctx.db.insert("channelReadPositions", {
        channelId: args.channelId,
        memberId: member._id,
        orgaId: channel.orgaId,
        lastReadTimestamp: now,
      });
    }

    return null;
  },
});

/**
 * Get a single message by ID with denormalized author data.
 * Used by ThreadPanel to fetch the parent message.
 */
export const getMessageById = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      orgaId: v.id("orgas"),
      authorId: v.id("members"),
      text: v.string(),
      isEdited: v.boolean(),
      editedAt: v.optional(v.number()),
      threadParentId: v.optional(v.id("messages")),
      embeddedTool: v.optional(embeddedToolType),
      mentions: v.optional(v.array(v.id("members"))),
      imageUrl: v.optional(v.union(v.string(), v.null())),
      author: v.object({
        firstname: v.string(),
        surname: v.string(),
        pictureURL: v.optional(v.string()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return null;

    await requireChannelAccess(ctx, msg.channelId);

    const memberDoc = await ctx.db.get(msg.authorId);
    const author = memberDoc
      ? { firstname: memberDoc.firstname, surname: memberDoc.surname, pictureURL: memberDoc.pictureURL }
      : { firstname: "Unknown", surname: "User" };

    const imageUrl = msg.imageId
      ? await ctx.storage.getUrl(msg.imageId)
      : undefined;

    return {
      _id: msg._id,
      _creationTime: msg._creationTime,
      channelId: msg.channelId,
      orgaId: msg.orgaId,
      authorId: msg.authorId,
      text: msg.text,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      threadParentId: msg.threadParentId,
      embeddedTool: msg.embeddedTool,
      mentions: msg.mentions,
      imageUrl,
      author,
    };
  },
});

/**
 * Get all replies to a message (thread), ordered chronologically.
 * No pagination (threads expected <100 replies).
 */
export const getThreadReplies = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    orgaId: v.id("orgas"),
    authorId: v.id("members"),
    text: v.string(),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
    threadParentId: v.optional(v.id("messages")),
    embeddedTool: v.optional(embeddedToolType),
    mentions: v.optional(v.array(v.id("members"))),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    author: v.object({
      firstname: v.string(),
      surname: v.string(),
      pictureURL: v.optional(v.string()),
    }),
  })),
  handler: async (ctx, args) => {
    // Get the parent message to verify access
    const parentMsg = await ctx.db.get(args.messageId);
    if (!parentMsg) throw new Error("Message not found");
    await requireChannelAccess(ctx, parentMsg.channelId);

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_thread_parent", (q) => q.eq("threadParentId", args.messageId))
      .order("asc")
      .collect();

    const authorCache = new Map<string, { firstname: string; surname: string; pictureURL?: string }>();

    return Promise.all(
      replies.map(async (msg) => {
        let author = authorCache.get(msg.authorId);
        if (!author) {
          const memberDoc = await ctx.db.get(msg.authorId);
          author = memberDoc
            ? { firstname: memberDoc.firstname, surname: memberDoc.surname, pictureURL: memberDoc.pictureURL }
            : { firstname: "Unknown", surname: "User" };
          authorCache.set(msg.authorId, author);
        }
        const imageUrl = msg.imageId
          ? await ctx.storage.getUrl(msg.imageId)
          : undefined;
        return {
          _id: msg._id,
          _creationTime: msg._creationTime,
          channelId: msg.channelId,
          orgaId: msg.orgaId,
          authorId: msg.authorId,
          text: msg.text,
          isEdited: msg.isEdited,
          editedAt: msg.editedAt,
          threadParentId: msg.threadParentId,
          embeddedTool: msg.embeddedTool,
          mentions: msg.mentions,
          imageUrl,
          author,
        };
      })
    );
  },
});

/**
 * Send a reply to a thread.
 */
export const sendThreadReply = mutation({
  args: {
    channelId: v.id("channels"),
    threadParentId: v.id("messages"),
    text: v.string(),
    mentions: v.optional(v.array(v.id("members"))),
    imageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    // Verify parent message exists and belongs to this channel
    const parentMsg = await ctx.db.get(args.threadParentId);
    if (!parentMsg) throw new Error("Parent message not found");
    if (parentMsg.channelId !== args.channelId) throw new Error("Parent message does not belong to this channel");

    const trimmed = args.text.trim();
    // Allow empty text only when an image is attached
    if (trimmed.length === 0 && !args.imageId) {
      throw new Error("Message cannot be empty");
    }

    // Deduplicate mentions
    const mentions = args.mentions ? [...new Set(args.mentions)] : undefined;

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmed,
      threadParentId: args.threadParentId,
      isEdited: false,
      mentions,
      imageId: args.imageId,
    });

    // Track the image in storageFiles for access control
    if (args.imageId) {
      await ctx.db.insert("storageFiles", {
        storageId: args.imageId,
        orgaId: channel.orgaId,
        uploadedBy: member.personId,
        purpose: "chat_image",
      });
    }

    // --- Thread reply notifications (coalesced) ---
    // Recipients: parent author + all reply authors, minus the sender
    const recipientMemberIds = new Set<Id<"members">>();
    recipientMemberIds.add(parentMsg.authorId);

    const existingReplies = await ctx.db
      .query("messages")
      .withIndex("by_thread_parent", (q) => q.eq("threadParentId", args.threadParentId))
      .collect();
    for (const reply of existingReplies) {
      recipientMemberIds.add(reply.authorId);
    }
    recipientMemberIds.delete(member._id);

    if (recipientMemberIds.size > 0) {
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const senderName = `${member.firstname} ${member.surname}`;
      const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + "..." : trimmed;
      const FIVE_MINUTES = 5 * 60 * 1000;
      const now = Date.now();

      const notifications: Array<ReturnType<typeof buildMessageNotification>> = [];
      for (const recipientMemberId of recipientMemberIds) {
        const recipientMember = await ctx.db.get(recipientMemberId);
        if (!recipientMember) continue;

        // Check if user read the channel recently (within 5 min)
        const readPos = await ctx.db
          .query("channelReadPositions")
          .withIndex("by_channel_and_member", (q) =>
            q.eq("channelId", args.channelId).eq("memberId", recipientMember._id)
          )
          .unique();
        if (readPos && now - readPos.lastReadTimestamp < FIVE_MINUTES) continue;

        // Check if an unread notification already exists for this thread+user
        const groupKey = `chat-thread-${args.threadParentId}-${recipientMember.personId}`;
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_group_key", (q) => q.eq("groupKey", groupKey))
          .first();
        if (existing && !existing.isRead) continue;

        notifications.push(
          buildMessageNotification({
            userId: recipientMember.personId,
            orgaId: channel.orgaId,
            memberId: recipientMember._id,
            messageId,
            channelId: args.channelId,
            channelName,
            teamId: channel.teamId,
            teamName: channel.teamId
              ? (await ctx.db.get(channel.teamId))?.name
              : undefined,
            senderName,
            preview,
            groupKey,
          })
        );
      }
      if (notifications.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
          notifications,
        });
      }
    }

    return messageId;
  },
});

/**
 * Get thread reply counts for a batch of message IDs.
 * Returns count and last reply timestamp for each message.
 */
export const getThreadCounts = query({
  args: {
    channelId: v.id("channels"),
    messageIds: v.array(v.id("messages")),
  },
  returns: v.array(v.object({
    messageId: v.id("messages"),
    replyCount: v.number(),
    lastReplyTimestamp: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    await requireChannelAccess(ctx, args.channelId);

    return Promise.all(
      args.messageIds.map(async (messageId) => {
        const replies = await ctx.db
          .query("messages")
          .withIndex("by_thread_parent", (q) => q.eq("threadParentId", messageId))
          .collect();

        return {
          messageId,
          replyCount: replies.length,
          lastReplyTimestamp: replies.length > 0
            ? replies[replies.length - 1]._creationTime
            : undefined,
        };
      })
    );
  },
});

/**
 * Edit a message's text content. Only the author can edit their own messages.
 * Messages with embedded tools cannot be edited (they have their own lifecycle).
 * Thread replies can also be edited by their author.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
    mentions: v.optional(v.array(v.id("members"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);

    // Only the author can edit
    if (message.authorId !== member._id) {
      throw new Error("Only the author can edit this message");
    }

    // Messages with embedded tools cannot be edited
    if (message.embeddedTool) {
      throw new Error("Messages with embedded tools cannot be edited");
    }

    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty");
    }

    // Deduplicate mentions
    const mentions = args.mentions ? [...new Set(args.mentions)] : undefined;

    await ctx.db.patch(args.messageId, {
      text: trimmed,
      isEdited: true,
      editedAt: Date.now(),
      mentions,
    });

    return null;
  },
});

/**
 * Delete a message. Only the author can delete their own messages.
 * Messages with embedded tools cannot be deleted (they have their own lifecycle).
 * When a top-level message with thread replies is deleted, all replies and their
 * reactions are also deleted.
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);

    // Only the author can delete
    if (message.authorId !== member._id) {
      throw new Error("Only the author can delete this message");
    }

    // Messages with embedded tools cannot be deleted
    if (message.embeddedTool) {
      throw new Error("Messages with embedded tools cannot be deleted");
    }

    // Helper: clean up an image from storage and storageFiles tracking
    async function cleanupImage(imageId: Id<"_storage">) {
      await ctx.storage.delete(imageId);
      const sfRecord = await ctx.db
        .query("storageFiles")
        .withIndex("by_storage_id", (q) => q.eq("storageId", imageId))
        .unique();
      if (sfRecord) await ctx.db.delete(sfRecord._id);
    }

    // Delete reactions on this message
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const r of reactions) {
      await ctx.db.delete(r._id);
    }

    // Clean up image attachment on this message
    if (message.imageId) {
      await cleanupImage(message.imageId);
    }

    // If this is a top-level message, also delete thread replies and their reactions
    if (!message.threadParentId) {
      const replies = await ctx.db
        .query("messages")
        .withIndex("by_thread_parent", (q) => q.eq("threadParentId", args.messageId))
        .collect();

      for (const reply of replies) {
        // Delete reactions on each reply
        const replyReactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", reply._id))
          .collect();
        for (const r of replyReactions) {
          await ctx.db.delete(r._id);
        }
        // Clean up image attachment on each reply
        if (reply.imageId) {
          await cleanupImage(reply.imageId);
        }
        await ctx.db.delete(reply._id);
      }
    }

    // Delete the message itself
    await ctx.db.delete(args.messageId);

    return null;
  },
});
