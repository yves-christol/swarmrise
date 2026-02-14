import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "../_generated/dataModel";
import { channelValidator, embeddedToolType } from ".";
import { requireAuthAndMembership, getAuthenticatedUserEmail, getRoleAndTeamInfo } from "../utils";
import { requireChannelAccess, requireNotArchived } from "./access";
import { canFacilitateTopic, requireTopicPhase } from "./topicHelpers";
import { requireVotingOpen, validateChoices } from "./votingHelpers";
import { canFacilitateElection, requireElectionPhase } from "./electionHelpers";
import {
  buildMessageNotification,
  buildToolEventNotification,
  getChannelDisplayName,
  getChannelRecipients,
} from "../notifications/helpers";

/**
 * Get all channels the authenticated member can access in an organization.
 * Includes the orga channel, team channels where member has roles, and DM channels.
 * Returns channels sorted: orga first, team channels alphabetically, then DMs.
 */
export const getChannelsForMember = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(v.object({
    ...channelValidator.fields,
    name: v.string(),
  })),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);

    type ChannelWithName = {
      _id: Id<"channels">;
      _creationTime: number;
      orgaId: Id<"orgas">;
      kind: "orga" | "team" | "dm";
      teamId?: Id<"teams">;
      dmMemberA?: Id<"members">;
      dmMemberB?: Id<"members">;
      isArchived: boolean;
      archivedAt?: number;
      name: string;
    };

    const result: ChannelWithName[] = [];

    // 1. Always include the orga channel
    const orgaChannel = await ctx.db
      .query("channels")
      .withIndex("by_orga_and_kind", (q) => q.eq("orgaId", args.orgaId).eq("kind", "orga"))
      .unique();

    if (orgaChannel) {
      const orga = await ctx.db.get(args.orgaId);
      result.push({ ...orgaChannel, name: orga?.name ?? "General" });
    }

    // 2. Find team channels where member has a role
    const teamIdSet = new Set<string>();
    for (const roleId of member.roleIds) {
      const role = await ctx.db.get(roleId);
      if (role) teamIdSet.add(role.teamId);
    }

    const teamChannels: ChannelWithName[] = [];
    for (const teamIdStr of teamIdSet) {
      const teamId = teamIdStr as Id<"teams">;
      const channel = await ctx.db
        .query("channels")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .unique();
      if (channel) {
        const team = await ctx.db.get(teamId);
        teamChannels.push({ ...channel, name: team?.name ?? "Team" });
      }
    }

    // Sort team channels alphabetically by name
    teamChannels.sort((a, b) => a.name.localeCompare(b.name));
    result.push(...teamChannels);

    // 3. Find DM channels where member is a participant
    const dmChannels = await ctx.db
      .query("channels")
      .withIndex("by_orga_and_kind", (q) => q.eq("orgaId", args.orgaId).eq("kind", "dm"))
      .collect();

    const dmResults: ChannelWithName[] = [];
    for (const dm of dmChannels) {
      if (dm.dmMemberA === member._id || dm.dmMemberB === member._id) {
        const otherMemberId = dm.dmMemberA === member._id ? dm.dmMemberB : dm.dmMemberA;
        if (otherMemberId) {
          const otherMember = await ctx.db.get(otherMemberId);
          const name = otherMember
            ? `${otherMember.firstname} ${otherMember.surname}`
            : "Unknown";
          dmResults.push({ ...dm, name });
        }
      }
    }

    // Sort DMs alphabetically by name
    dmResults.sort((a, b) => a.name.localeCompare(b.name));
    result.push(...dmResults);

    return result;
  },
});

/**
 * Get paginated messages in a channel, newest first.
 * Returns messages with denormalized author data.
 */
export const getMessages = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(v.object({
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
      author: v.object({
        firstname: v.string(),
        surname: v.string(),
        pictureURL: v.optional(v.string()),
      }),
    })),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireChannelAccess(ctx, args.channelId);

    // Only return top-level messages (not thread replies)
    const paginatedMessages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("threadParentId"), undefined))
      .order("desc")
      .paginate(args.paginationOpts);

    // Denormalize author data with deduplication
    const authorCache = new Map<string, { firstname: string; surname: string; pictureURL?: string }>();

    const page = await Promise.all(
      paginatedMessages.page.map(async (msg) => {
        let author = authorCache.get(msg.authorId);
        if (!author) {
          const memberDoc = await ctx.db.get(msg.authorId);
          author = memberDoc
            ? { firstname: memberDoc.firstname, surname: memberDoc.surname, pictureURL: memberDoc.pictureURL }
            : { firstname: "Unknown", surname: "User" };
          authorCache.set(msg.authorId, author);
        }
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
          author,
        };
      })
    );

    return {
      page,
      isDone: paginatedMessages.isDone,
      continueCursor: paginatedMessages.continueCursor,
    };
  },
});

/**
 * Get unread counts for all channels the member has access to.
 * Caps at 100 per channel to avoid expensive scans.
 */
export const getUnreadCounts = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(v.object({
    channelId: v.id("channels"),
    unreadCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);

    const channelIds: Id<"channels">[] = [];

    // Orga channel
    const orgaChannel = await ctx.db
      .query("channels")
      .withIndex("by_orga_and_kind", (q) => q.eq("orgaId", args.orgaId).eq("kind", "orga"))
      .unique();
    if (orgaChannel) channelIds.push(orgaChannel._id);

    // Team channels
    const teamIdSet = new Set<string>();
    for (const roleId of member.roleIds) {
      const role = await ctx.db.get(roleId);
      if (role) teamIdSet.add(role.teamId);
    }
    for (const teamIdStr of teamIdSet) {
      const teamId = teamIdStr as Id<"teams">;
      const channel = await ctx.db
        .query("channels")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .unique();
      if (channel && !channel.isArchived) channelIds.push(channel._id);
    }

    // DM channels
    const dmChannels = await ctx.db
      .query("channels")
      .withIndex("by_orga_and_kind", (q) => q.eq("orgaId", args.orgaId).eq("kind", "dm"))
      .collect();
    for (const dm of dmChannels) {
      if (dm.dmMemberA === member._id || dm.dmMemberB === member._id) {
        channelIds.push(dm._id);
      }
    }

    // Get unread counts for each channel
    const UNREAD_CAP = 100;
    const results: Array<{ channelId: Id<"channels">; unreadCount: number }> = [];

    for (const channelId of channelIds) {
      const readPosition = await ctx.db
        .query("channelReadPositions")
        .withIndex("by_channel_and_member", (q) =>
          q.eq("channelId", channelId).eq("memberId", member._id)
        )
        .unique();

      const lastReadTimestamp = readPosition?.lastReadTimestamp ?? 0;

      // Use the index on channelId, then filter by creationTime
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) =>
          q.eq("channelId", channelId)
        )
        .filter((q) => q.gt(q.field("_creationTime"), lastReadTimestamp))
        .take(UNREAD_CAP + 1);

      results.push({
        channelId,
        unreadCount: Math.min(unreadMessages.length, UNREAD_CAP),
      });
    }

    return results;
  },
});

/**
 * Send a message to a channel.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    text: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmed,
      isEdited: false,
    });

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

// ---- Phase 2: Threads ----

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
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmed,
      threadParentId: args.threadParentId,
      isEdited: false,
    });

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

// ---- Phase 2: Direct Messages ----

/**
 * Get or create a DM channel between the authenticated member and another member.
 * Always stores the lexicographically smaller member ID in dmMemberA for consistent lookups.
 */
export const getOrCreateDMChannel = mutation({
  args: {
    orgaId: v.id("orgas"),
    otherMemberId: v.id("members"),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);

    if (member._id === args.otherMemberId) {
      throw new Error("Cannot create a DM with yourself");
    }

    // Verify other member exists and is in the same orga
    const otherMember = await ctx.db.get(args.otherMemberId);
    if (!otherMember) throw new Error("Member not found");
    if (otherMember.orgaId !== args.orgaId) throw new Error("Member not in this organization");

    // Canonical ordering: smaller ID in dmMemberA
    const [dmMemberA, dmMemberB] = member._id < args.otherMemberId
      ? [member._id, args.otherMemberId]
      : [args.otherMemberId, member._id];

    // Check if DM channel already exists
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_dm_members", (q) =>
        q.eq("orgaId", args.orgaId).eq("dmMemberA", dmMemberA).eq("dmMemberB", dmMemberB)
      )
      .unique();

    if (existing) return existing._id;

    // Create new DM channel
    const channelId = await ctx.db.insert("channels", {
      orgaId: args.orgaId,
      kind: "dm",
      dmMemberA,
      dmMemberB,
      isArchived: false,
    });

    return channelId;
  },
});

// ---- Phase 3: Topic Tool (Consent-Based Decisions) ----

/**
 * Create a new message with an embedded topic tool in the clarification phase.
 */
export const createTopicMessage = mutation({
  args: {
    channelId: v.id("channels"),
    title: v.string(),
    description: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmedTitle = args.title.trim();
    const trimmedDescription = args.description.trim();
    if (!trimmedTitle) throw new Error("Title cannot be empty");
    if (!trimmedDescription) throw new Error("Description cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmedTitle,
      isEdited: false,
      embeddedTool: {
        type: "topic",
        title: trimmedTitle,
        description: trimmedDescription,
        phase: "clarification",
      },
    });

    return messageId;
  },
});

/**
 * Ask a clarification question on a topic in the clarification phase.
 */
export const askClarification = mutation({
  args: {
    messageId: v.id("messages"),
    question: v.string(),
  },
  returns: v.id("topicClarifications"),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireTopicPhase(message, "clarification");

    const trimmed = args.question.trim();
    if (!trimmed) throw new Error("Question cannot be empty");

    const clarificationId = await ctx.db.insert("topicClarifications", {
      messageId: args.messageId,
      orgaId: message.orgaId,
      authorId: member._id,
      question: trimmed,
    });

    return clarificationId;
  },
});

/**
 * Answer a clarification question on a topic.
 */
export const answerClarification = mutation({
  args: {
    clarificationId: v.id("topicClarifications"),
    answer: v.string(),
  },
  returns: v.id("topicAnswers"),
  handler: async (ctx, args) => {
    const clarification = await ctx.db.get(args.clarificationId);
    if (!clarification) throw new Error("Clarification not found");

    const message = await ctx.db.get(clarification.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireTopicPhase(message, "clarification");

    const trimmed = args.answer.trim();
    if (!trimmed) throw new Error("Answer cannot be empty");

    const answerId = await ctx.db.insert("topicAnswers", {
      clarificationId: args.clarificationId,
      orgaId: message.orgaId,
      authorId: member._id,
      answer: trimmed,
    });

    return answerId;
  },
});

/**
 * Advance or revert the topic phase. Facilitator-only.
 * Supports: clarification -> consent, consent -> clarification (back)
 */
export const advanceTopicPhase = mutation({
  args: {
    messageId: v.id("messages"),
    newPhase: v.union(v.literal("clarification"), v.literal("consent")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "topic") {
      throw new Error("Message is not a topic");
    }

    const currentPhase = message.embeddedTool.phase;

    // Validate transitions
    if (args.newPhase === "consent" && currentPhase !== "clarification") {
      throw new Error("Can only advance to consent from clarification phase");
    }
    if (args.newPhase === "clarification" && currentPhase !== "consent") {
      throw new Error("Can only go back to clarification from consent phase");
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    const isFacilitator = await canFacilitateTopic(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can change the topic phase");

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: args.newPhase,
      },
    });

    // Notify channel members when topic moves to consent phase
    if (args.newPhase === "consent") {
      const channel = await ctx.db.get(message.channelId);
      if (channel) {
        const recipients = await getChannelRecipients(ctx, channel, member._id);
        const channelName = await getChannelDisplayName(ctx, channel, member._id);
        const notifications = recipients.map((r) =>
          buildToolEventNotification({
            userId: r.userId,
            orgaId: message.orgaId,
            memberId: r.memberId,
            messageId: args.messageId,
            channelId: message.channelId,
            channelName,
            toolType: "topic",
            eventDescription: `Topic "${message.embeddedTool!.type === "topic" ? message.embeddedTool!.title : ""}" moved to consent phase`,
            priority: "high",
          })
        );
        if (notifications.length > 0) {
          await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
            notifications,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Submit or update a consent response on a topic in the consent phase.
 * Objections require a reason.
 */
export const submitTopicResponse = mutation({
  args: {
    messageId: v.id("messages"),
    response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireTopicPhase(message, "consent");

    if (args.response === "objection") {
      const trimmedReason = args.reason?.trim();
      if (!trimmedReason) throw new Error("Objections require a reason");
    }

    // Check for existing response using index
    const existing = await ctx.db
      .query("topicResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        response: args.response,
        reason: args.reason?.trim(),
      });
    } else {
      await ctx.db.insert("topicResponses", {
        messageId: args.messageId,
        orgaId: message.orgaId,
        memberId: member._id,
        response: args.response,
        reason: args.reason?.trim(),
      });
    }

    return null;
  },
});

/**
 * Resolve a topic. Facilitator-only.
 * Sets the phase to "resolved" with an outcome and creates a Decision record.
 */
export const resolveTopicTool = mutation({
  args: {
    messageId: v.id("messages"),
    outcome: v.union(v.literal("accepted"), v.literal("modified"), v.literal("withdrawn")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "topic") {
      throw new Error("Message is not a topic");
    }

    if (message.embeddedTool.phase !== "consent") {
      throw new Error("Can only resolve a topic in the consent phase");
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    const isFacilitator = await canFacilitateTopic(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can resolve a topic");

    const authorEmail = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, message.orgaId);

    // Find the team associated with the channel (if any)
    const channel = await ctx.db.get(message.channelId);
    const targetTeamId = channel?.teamId;

    // Create the Decision record
    const decisionId = await ctx.db.insert("decisions", {
      orgaId: message.orgaId,
      authorEmail,
      roleName,
      teamName,
      targetTeamId,
      targetId: args.messageId,
      targetType: "topics",
      diff: {
        type: "Topic",
        before: {
          title: message.embeddedTool.title,
          description: message.embeddedTool.description,
          phase: "consent",
        },
        after: {
          title: message.embeddedTool.title,
          description: message.embeddedTool.description,
          phase: "resolved",
          outcome: args.outcome,
        },
      },
    });

    // Update the message
    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: "resolved",
        outcome: args.outcome,
        decisionId,
      },
    });

    // Notify channel members about topic resolution
    if (channel) {
      const recipients = await getChannelRecipients(ctx, channel, member._id);
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const notifications = recipients.map((r) =>
        buildToolEventNotification({
          userId: r.userId,
          orgaId: message.orgaId,
          memberId: r.memberId,
          messageId: args.messageId,
          channelId: message.channelId,
          channelName,
          toolType: "topic",
          eventDescription: `Topic "${message.embeddedTool!.type === "topic" ? message.embeddedTool!.title : ""}" resolved: ${args.outcome}`,
        })
      );
      if (notifications.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
          notifications,
        });
      }
    }

    return null;
  },
});

// ---- Phase 3: Topic Queries ----

const topicClarificationReturnType = v.object({
  _id: v.id("topicClarifications"),
  _creationTime: v.number(),
  question: v.string(),
  author: v.object({
    _id: v.id("members"),
    firstname: v.string(),
    surname: v.string(),
  }),
  answers: v.array(v.object({
    _id: v.id("topicAnswers"),
    _creationTime: v.number(),
    answer: v.string(),
    author: v.object({
      _id: v.id("members"),
      firstname: v.string(),
      surname: v.string(),
    }),
  })),
});

/**
 * Get all clarifications for a topic message with denormalized authors and nested answers.
 */
export const getTopicClarifications = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(topicClarificationReturnType),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    const clarifications = await ctx.db
      .query("topicClarifications")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    const memberCache = new Map<string, { _id: Id<"members">; firstname: string; surname: string }>();

    const getMember = async (memberId: Id<"members">) => {
      let cached = memberCache.get(memberId);
      if (!cached) {
        const doc = await ctx.db.get(memberId);
        cached = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: memberId, firstname: "Unknown", surname: "User" };
        memberCache.set(memberId, cached);
      }
      return cached;
    };

    return Promise.all(
      clarifications.map(async (c) => {
        const author = await getMember(c.authorId);

        const answers = await ctx.db
          .query("topicAnswers")
          .withIndex("by_clarification", (q) => q.eq("clarificationId", c._id))
          .order("asc")
          .collect();

        const enrichedAnswers = await Promise.all(
          answers.map(async (a) => {
            const answerAuthor = await getMember(a.authorId);
            return {
              _id: a._id,
              _creationTime: a._creationTime,
              answer: a.answer,
              author: answerAuthor,
            };
          })
        );

        return {
          _id: c._id,
          _creationTime: c._creationTime,
          question: c.question,
          author,
          answers: enrichedAnswers,
        };
      })
    );
  },
});

const topicResponseReturnType = v.object({
  _id: v.id("topicResponses"),
  _creationTime: v.number(),
  response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
  reason: v.optional(v.string()),
  member: v.object({
    _id: v.id("members"),
    firstname: v.string(),
    surname: v.string(),
  }),
});

/**
 * Get all responses for a topic message with denormalized member data.
 */
export const getTopicResponses = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(topicResponseReturnType),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    const responses = await ctx.db
      .query("topicResponses")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    return Promise.all(
      responses.map(async (r) => {
        const doc = await ctx.db.get(r.memberId);
        const member = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: r.memberId, firstname: "Unknown", surname: "User" };

        return {
          _id: r._id,
          _creationTime: r._creationTime,
          response: r.response,
          reason: r.reason,
          member,
        };
      })
    );
  },
});

/**
 * Get the current user's response for a topic message.
 */
export const getMyTopicResponse = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("topicResponses"),
      response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
      reason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("topicResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (!existing) return null;

    return {
      _id: existing._id,
      response: existing.response,
      reason: existing.reason,
    };
  },
});

/**
 * Check if the current user can facilitate a topic (advance/resolve).
 */
export const canFacilitate = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return false;

    const { member } = await requireChannelAccess(ctx, message.channelId);
    return canFacilitateTopic(ctx, args.messageId, member._id);
  },
});

// ---- Phase 4: Voting Tool ----

/**
 * Create a new message with an embedded voting tool.
 */
export const createVotingMessage = mutation({
  args: {
    channelId: v.id("channels"),
    question: v.string(),
    options: v.array(v.object({ id: v.string(), label: v.string() })),
    mode: v.union(v.literal("single"), v.literal("approval"), v.literal("ranked")),
    isAnonymous: v.boolean(),
    deadline: v.optional(v.number()),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmedQuestion = args.question.trim();
    if (!trimmedQuestion) throw new Error("Question cannot be empty");
    if (args.options.length < 2) throw new Error("At least 2 options are required");

    // Validate option IDs are unique and labels are non-empty
    const idSet = new Set<string>();
    for (const opt of args.options) {
      if (!opt.id.trim()) throw new Error("Option ID cannot be empty");
      if (!opt.label.trim()) throw new Error("Option label cannot be empty");
      if (idSet.has(opt.id)) throw new Error(`Duplicate option ID: ${opt.id}`);
      idSet.add(opt.id);
    }

    if (args.deadline !== undefined && args.deadline <= Date.now()) {
      throw new Error("Deadline must be in the future");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmedQuestion,
      isEdited: false,
      embeddedTool: {
        type: "voting",
        question: trimmedQuestion,
        options: args.options.map((o) => ({ id: o.id, label: o.label.trim() })),
        mode: args.mode,
        isAnonymous: args.isAnonymous,
        deadline: args.deadline,
        isClosed: false,
      },
    });

    return messageId;
  },
});

/**
 * Submit or update a vote on a voting message.
 */
export const submitVote = mutation({
  args: {
    messageId: v.id("messages"),
    choices: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireVotingOpen(message);

    if (message.embeddedTool!.type !== "voting") throw new Error("Not a voting message");
    const tool = message.embeddedTool as { type: "voting"; options: { id: string; label: string }[]; mode: "single" | "approval" | "ranked" };
    const optionIds = tool.options.map((o) => o.id);
    validateChoices(args.choices, tool.mode, optionIds);

    // Upsert: check for existing vote
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { choices: args.choices });
    } else {
      await ctx.db.insert("votes", {
        messageId: args.messageId,
        orgaId: message.orgaId,
        memberId: member._id,
        choices: args.choices,
      });
    }

    return null;
  },
});

/**
 * Close voting on a message. Facilitator-only.
 */
export const closeVote = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "voting") {
      throw new Error("Message is not a voting tool");
    }
    if (message.embeddedTool.isClosed) {
      throw new Error("Voting is already closed");
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    const isFacilitator = await canFacilitateTopic(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can close voting");

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        isClosed: true,
      },
    });

    // Notify channel members about vote closure
    const channel = await ctx.db.get(message.channelId);
    if (channel) {
      const recipients = await getChannelRecipients(ctx, channel, member._id);
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const notifications = recipients.map((r) =>
        buildToolEventNotification({
          userId: r.userId,
          orgaId: message.orgaId,
          memberId: r.memberId,
          messageId: args.messageId,
          channelId: message.channelId,
          channelName,
          toolType: "voting",
          eventDescription: `Vote closed: "${message.embeddedTool!.type === "voting" ? message.embeddedTool!.question : ""}"`,
        })
      );
      if (notifications.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
          notifications,
        });
      }
    }

    return null;
  },
});

// ---- Phase 4: Voting Queries ----

const voteOptionResultType = v.object({
  optionId: v.string(),
  label: v.string(),
  count: v.number(),
  score: v.number(),
  voters: v.optional(v.array(v.object({
    _id: v.id("members"),
    firstname: v.string(),
    surname: v.string(),
  }))),
});

/**
 * Get aggregated vote results for a voting message.
 */
export const getVoteResults = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      totalVotes: v.number(),
      results: v.array(voteOptionResultType),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "voting") return null;
    const tool = message.embeddedTool;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const memberCache = new Map<string, { _id: Id<"members">; firstname: string; surname: string }>();
    const getMember = async (memberId: Id<"members">) => {
      let cached = memberCache.get(memberId);
      if (!cached) {
        const doc = await ctx.db.get(memberId);
        cached = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: memberId, firstname: "Unknown", surname: "User" };
        memberCache.set(memberId, cached);
      }
      return cached;
    };

    if (tool.mode === "ranked") {
      // Borda count: 1st place = N points, 2nd = N-1, etc.
      const n = tool.options.length;
      const scores = new Map<string, number>();
      const votersByOption = new Map<string, Id<"members">[]>();

      for (const opt of tool.options) {
        scores.set(opt.id, 0);
        votersByOption.set(opt.id, []);
      }

      for (const vote of votes) {
        for (let i = 0; i < vote.choices.length; i++) {
          const optId = vote.choices[i];
          scores.set(optId, (scores.get(optId) ?? 0) + (n - i));
          votersByOption.get(optId)?.push(vote.memberId);
        }
      }

      const results = await Promise.all(
        tool.options.map(async (opt) => {
          const voters = tool.isAnonymous
            ? undefined
            : await Promise.all((votersByOption.get(opt.id) ?? []).map(getMember));
          return {
            optionId: opt.id,
            label: opt.label,
            count: votersByOption.get(opt.id)?.length ?? 0,
            score: scores.get(opt.id) ?? 0,
            voters,
          };
        })
      );

      // Sort by score descending
      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      return { totalVotes: votes.length, results };
    }

    // Single / approval mode: count votes containing each option
    const countByOption = new Map<string, number>();
    const votersByOption = new Map<string, Id<"members">[]>();

    for (const opt of tool.options) {
      countByOption.set(opt.id, 0);
      votersByOption.set(opt.id, []);
    }

    for (const vote of votes) {
      for (const choice of vote.choices) {
        countByOption.set(choice, (countByOption.get(choice) ?? 0) + 1);
        votersByOption.get(choice)?.push(vote.memberId);
      }
    }

    const results = await Promise.all(
      tool.options.map(async (opt) => {
        const voters = tool.isAnonymous
          ? undefined
          : await Promise.all((votersByOption.get(opt.id) ?? []).map(getMember));
        return {
          optionId: opt.id,
          label: opt.label,
          count: countByOption.get(opt.id) ?? 0,
          score: 0,
          voters,
        };
      })
    );

    return { totalVotes: votes.length, results };
  },
});

/**
 * Get the current user's vote for a voting message.
 */
export const getMyVote = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("votes"),
      choices: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (!existing) return null;

    return {
      _id: existing._id,
      choices: existing.choices,
    };
  },
});

// ---- Phase 5: Candidateless Election Tool ----

/**
 * Create a new message with an embedded election tool in the nomination phase.
 * The election is for a role in a specific team.
 */
export const createElectionMessage = mutation({
  args: {
    channelId: v.id("channels"),
    roleTitle: v.string(),
    roleId: v.optional(v.id("roles")),
    teamId: v.id("teams"),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmedTitle = args.roleTitle.trim();
    if (!trimmedTitle) throw new Error("Role title cannot be empty");

    // Verify team exists and belongs to same orga
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.orgaId !== channel.orgaId) throw new Error("Team does not belong to this organization");

    // Verify role if provided
    if (args.roleId) {
      const role = await ctx.db.get(args.roleId);
      if (!role) throw new Error("Role not found");
      if (role.teamId !== args.teamId) throw new Error("Role does not belong to specified team");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmedTitle,
      isEdited: false,
      embeddedTool: {
        type: "election",
        roleTitle: trimmedTitle,
        roleId: args.roleId,
        teamId: args.teamId,
        phase: "nomination",
      },
    });

    // Notify channel members about new election
    const recipients = await getChannelRecipients(ctx, channel, member._id);
    const channelName = await getChannelDisplayName(ctx, channel, member._id);
    const notifications = recipients.map((r) =>
      buildToolEventNotification({
        userId: r.userId,
        orgaId: channel.orgaId,
        memberId: r.memberId,
        messageId,
        channelId: args.channelId,
        channelName,
        toolType: "election",
        eventDescription: `Election opened for "${trimmedTitle}"`,
        priority: "high",
      })
    );
    if (notifications.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
        notifications,
      });
    }

    return messageId;
  },
});

/**
 * Submit a nomination for an election. Each member can nominate exactly one person.
 * Nominations are secret during the nomination phase (only count is visible).
 */
export const submitNomination = mutation({
  args: {
    messageId: v.id("messages"),
    nomineeId: v.id("members"),
    reason: v.string(),
  },
  returns: v.id("electionNominations"),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "nomination");

    const trimmedReason = args.reason.trim();
    if (!trimmedReason) throw new Error("A reason for your nomination is required");

    // Verify nominee is a valid member in the same orga
    const nominee = await ctx.db.get(args.nomineeId);
    if (!nominee) throw new Error("Nominee not found");
    if (nominee.orgaId !== message.orgaId) throw new Error("Nominee is not in this organization");

    // Check uniqueness: one nomination per member per election
    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (existing) throw new Error("You have already nominated someone. Wait for the change round to modify your nomination.");

    const nominationId = await ctx.db.insert("electionNominations", {
      messageId: args.messageId,
      orgaId: message.orgaId,
      nominatorId: member._id,
      nomineeId: args.nomineeId,
      reason: trimmedReason,
    });

    return nominationId;
  },
});

/**
 * Advance the election phase. Facilitator-only.
 * Valid transitions:
 *   nomination -> discussion (reveals nominations, facilitator proposes candidate)
 *   discussion -> change_round
 *   change_round -> consent (requires proposedCandidateId)
 *   consent -> discussion (go back if objections need addressing)
 */
export const advanceElectionPhase = mutation({
  args: {
    messageId: v.id("messages"),
    newPhase: v.union(
      v.literal("nomination"),
      v.literal("discussion"),
      v.literal("change_round"),
      v.literal("consent"),
    ),
    proposedCandidateId: v.optional(v.id("members")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    const currentPhase = message.embeddedTool.phase;

    // Validate phase transitions
    const validTransitions: Record<string, string[]> = {
      nomination: ["discussion"],
      discussion: ["change_round"],
      change_round: ["consent"],
      consent: ["nomination"],
    };

    if (!validTransitions[currentPhase]?.includes(args.newPhase)) {
      throw new Error(`Cannot transition from "${currentPhase}" to "${args.newPhase}"`);
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    const isFacilitator = await canFacilitateElection(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can advance the election phase");

    // Pick up proposed candidate from args if provided, otherwise keep existing
    let proposedCandidateId = message.embeddedTool.proposedCandidateId;
    if (args.proposedCandidateId) {
      proposedCandidateId = args.proposedCandidateId;
    }

    // When advancing to consent, a proposed candidate is required
    if (args.newPhase === "consent" && !proposedCandidateId) {
      throw new Error("A proposed candidate is required to move to the consent phase");
    }

    // When restarting at nomination from consent, clear all nominations, responses, and proposed candidate
    if (args.newPhase === "nomination" && currentPhase === "consent") {
      const responses = await ctx.db
        .query("electionResponses")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
        .collect();
      for (const r of responses) {
        await ctx.db.delete(r._id);
      }
      const nominations = await ctx.db
        .query("electionNominations")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
        .collect();
      for (const n of nominations) {
        await ctx.db.delete(n._id);
      }
      proposedCandidateId = undefined;
    }

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: args.newPhase,
        proposedCandidateId,
      },
    });

    // Notify channel members for consent and discussion phases
    if (args.newPhase === "consent" || args.newPhase === "discussion") {
      const channel = await ctx.db.get(message.channelId);
      if (channel) {
        const recipients = await getChannelRecipients(ctx, channel, member._id);
        const channelName = await getChannelDisplayName(ctx, channel, member._id);
        const roleTitle = message.embeddedTool.roleTitle;
        const notifications = recipients.map((r) =>
          buildToolEventNotification({
            userId: r.userId,
            orgaId: message.orgaId,
            memberId: r.memberId,
            messageId: args.messageId,
            channelId: message.channelId,
            channelName,
            toolType: "election",
            eventDescription: `Election for "${roleTitle}" moved to ${args.newPhase} phase`,
            priority: "high",
          })
        );
        if (notifications.length > 0) {
          await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
            notifications,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Change a nomination during the change_round phase.
 * Members can update their nomination to a different nominee with a new reason.
 */
export const changeNomination = mutation({
  args: {
    messageId: v.id("messages"),
    newNomineeId: v.id("members"),
    newReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "change_round");

    const trimmedReason = args.newReason.trim();
    if (!trimmedReason) throw new Error("A reason for your nomination is required");

    // Verify new nominee
    const nominee = await ctx.db.get(args.newNomineeId);
    if (!nominee) throw new Error("Nominee not found");
    if (nominee.orgaId !== message.orgaId) throw new Error("Nominee is not in this organization");

    // Find existing nomination
    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (!existing) throw new Error("You have not submitted a nomination to change");

    await ctx.db.patch(existing._id, {
      nomineeId: args.newNomineeId,
      reason: trimmedReason,
    });

    return null;
  },
});

/**
 * Submit or update a consent response for the election in the consent phase.
 * Same pattern as topic consent responses.
 */
export const submitElectionResponse = mutation({
  args: {
    messageId: v.id("messages"),
    response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "consent");

    if (args.response === "objection") {
      const trimmedReason = args.reason?.trim();
      if (!trimmedReason) throw new Error("Objections require a reason");
    }

    // Upsert: check for existing response
    const existing = await ctx.db
      .query("electionResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        response: args.response,
        reason: args.reason?.trim(),
      });
    } else {
      await ctx.db.insert("electionResponses", {
        messageId: args.messageId,
        orgaId: message.orgaId,
        memberId: member._id,
        response: args.response,
        reason: args.reason?.trim(),
      });
    }

    return null;
  },
});

/**
 * Resolve an election. Facilitator-only.
 * Sets the phase to "elected" with an outcome and creates a Decision record.
 */
export const resolveElection = mutation({
  args: {
    messageId: v.id("messages"),
    outcome: v.union(v.literal("elected"), v.literal("no_election")),
    electedMemberId: v.optional(v.id("members")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    if (message.embeddedTool.phase !== "consent") {
      throw new Error("Can only resolve an election in the consent phase");
    }

    if (args.outcome === "elected" && !args.electedMemberId) {
      throw new Error("Must specify the elected member when outcome is 'elected'");
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    const isFacilitator = await canFacilitateElection(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can resolve an election");

    const authorEmail = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, message.orgaId);

    // Find the team associated with the channel (if any)
    const channel = await ctx.db.get(message.channelId);
    const targetTeamId = channel?.teamId;

    // Create the Decision record
    const decisionId = await ctx.db.insert("decisions", {
      orgaId: message.orgaId,
      authorEmail,
      roleName,
      teamName,
      targetTeamId,
      targetId: args.messageId,
      targetType: "elections",
      diff: {
        type: "Election",
        before: {
          roleTitle: message.embeddedTool.roleTitle,
          teamId: message.embeddedTool.teamId,
          phase: "consent",
        },
        after: {
          roleTitle: message.embeddedTool.roleTitle,
          teamId: message.embeddedTool.teamId,
          phase: "elected",
          outcome: args.outcome,
          electedMemberId: args.electedMemberId,
        },
      },
    });

    // Update the message
    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: "elected",
        outcome: args.outcome,
        electedMemberId: args.electedMemberId,
        decisionId,
      },
    });

    // Notify channel members about election resolution
    if (channel) {
      const recipients = await getChannelRecipients(ctx, channel, member._id);
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const roleTitle = message.embeddedTool.roleTitle;
      const notifications = recipients.map((r) =>
        buildToolEventNotification({
          userId: r.userId,
          orgaId: message.orgaId,
          memberId: r.memberId,
          messageId: args.messageId,
          channelId: message.channelId,
          channelName,
          toolType: "election",
          eventDescription: `Election for "${roleTitle}" resolved: ${args.outcome}`,
        })
      );
      if (notifications.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
          notifications,
        });
      }
    }

    return null;
  },
});

/**
 * Cancel an election. Only the message author can cancel.
 * Cannot cancel once the election is already resolved (elected) or already cancelled.
 */
export const cancelElection = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    if (message.embeddedTool.phase === "elected" || message.embeddedTool.phase === "cancelled") {
      throw new Error("Cannot cancel an election that is already resolved or cancelled");
    }

    const member = await requireAuthAndMembership(ctx, message.orgaId);
    if (message.authorId !== member._id) {
      throw new Error("Only the election creator can cancel it");
    }

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: "cancelled",
      },
    });

    return null;
  },
});

// ---- Phase 5: Election Queries ----

/**
 * Get nominations for an election message.
 * During nomination phase: returns only nomination count and whether current member has nominated.
 * After nomination phase: returns full nomination details with denormalized member data.
 */
export const getElectionNominations = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      phase: v.literal("secret"),
      totalNominations: v.number(),
      hasNominated: v.boolean(),
    }),
    v.object({
      phase: v.literal("revealed"),
      nominations: v.array(v.object({
        _id: v.id("electionNominations"),
        _creationTime: v.number(),
        nomineeId: v.id("members"),
        reason: v.string(),
        nominator: v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
        }),
        nominee: v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
        }),
      })),
      // Tally: how many nominations each person received
      tally: v.array(v.object({
        memberId: v.id("members"),
        firstname: v.string(),
        surname: v.string(),
        count: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") return null;

    const nominations = await ctx.db
      .query("electionNominations")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    // During nomination phase, keep nominations secret
    if (message.embeddedTool.phase === "nomination") {
      const hasNominated = nominations.some((n) => n.nominatorId === member._id);
      return {
        phase: "secret" as const,
        totalNominations: nominations.length,
        hasNominated,
      };
    }

    // After nomination phase, reveal all nominations
    const memberCache = new Map<string, { _id: Id<"members">; firstname: string; surname: string }>();
    const getMember = async (memberId: Id<"members">) => {
      let cached = memberCache.get(memberId);
      if (!cached) {
        const doc = await ctx.db.get(memberId);
        cached = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: memberId, firstname: "Unknown", surname: "User" };
        memberCache.set(memberId, cached);
      }
      return cached;
    };

    const enrichedNominations = await Promise.all(
      nominations.map(async (n) => {
        const nominator = await getMember(n.nominatorId);
        const nominee = await getMember(n.nomineeId);
        return {
          _id: n._id,
          _creationTime: n._creationTime,
          nomineeId: n.nomineeId,
          reason: n.reason,
          nominator,
          nominee,
        };
      })
    );

    // Build tally
    const tallyMap = new Map<string, { memberId: Id<"members">; count: number }>();
    for (const n of nominations) {
      const key = n.nomineeId;
      const existing = tallyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        tallyMap.set(key, { memberId: n.nomineeId, count: 1 });
      }
    }

    const tally = await Promise.all(
      Array.from(tallyMap.values())
        .sort((a, b) => b.count - a.count)
        .map(async (entry) => {
          const m = await getMember(entry.memberId);
          return {
            memberId: entry.memberId,
            firstname: m.firstname,
            surname: m.surname,
            count: entry.count,
          };
        })
    );

    return {
      phase: "revealed" as const,
      nominations: enrichedNominations,
      tally,
    };
  },
});

/**
 * Get consent responses for an election message (same pattern as topic responses).
 */
export const getElectionResponses = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(v.object({
    _id: v.id("electionResponses"),
    _creationTime: v.number(),
    response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
    reason: v.optional(v.string()),
    member: v.object({
      _id: v.id("members"),
      firstname: v.string(),
      surname: v.string(),
    }),
  })),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    const responses = await ctx.db
      .query("electionResponses")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    return Promise.all(
      responses.map(async (r) => {
        const doc = await ctx.db.get(r.memberId);
        const member = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: r.memberId, firstname: "Unknown", surname: "User" };

        return {
          _id: r._id,
          _creationTime: r._creationTime,
          response: r.response,
          reason: r.reason,
          member,
        };
      })
    );
  },
});

/**
 * Get the current user's nomination for an election message.
 */
export const getMyElectionNomination = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("electionNominations"),
      nomineeId: v.id("members"),
      reason: v.string(),
      nominee: v.object({
        _id: v.id("members"),
        firstname: v.string(),
        surname: v.string(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (!existing) return null;

    const nomineeDoc = await ctx.db.get(existing.nomineeId);
    const nominee = nomineeDoc
      ? { _id: nomineeDoc._id, firstname: nomineeDoc.firstname, surname: nomineeDoc.surname }
      : { _id: existing.nomineeId, firstname: "Unknown", surname: "User" };

    return {
      _id: existing._id,
      nomineeId: existing.nomineeId,
      reason: existing.reason,
      nominee,
    };
  },
});

/**
 * Get the current user's election response.
 */
export const getMyElectionResponse = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("electionResponses"),
      response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
      reason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("electionResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (!existing) return null;

    return {
      _id: existing._id,
      response: existing.response,
      reason: existing.reason,
    };
  },
});

/**
 * Get all members of the election's team who could be nominated.
 * Returns members who hold at least one role in the specified team.
 */
export const getEligibleNominees = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(v.object({
    _id: v.id("members"),
    firstname: v.string(),
    surname: v.string(),
    pictureURL: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") return [];

    const teamId = message.embeddedTool.teamId;

    // Get all roles in the team
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    // Collect unique member IDs
    const memberIdSet = new Set<string>();
    for (const role of roles) {
      if (role.memberId) memberIdSet.add(role.memberId);
    }

    // Also include all orga members (any member can be nominated, not just team members)
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", message.orgaId))
      .collect();

    const results: Array<{
      _id: Id<"members">;
      firstname: string;
      surname: string;
      pictureURL?: string;
    }> = [];

    for (const m of allMembers) {
      results.push({
        _id: m._id,
        firstname: m.firstname,
        surname: m.surname,
        pictureURL: m.pictureURL,
      });
    }

    // Sort alphabetically
    results.sort((a, b) =>
      `${a.firstname} ${a.surname}`.localeCompare(`${b.firstname} ${b.surname}`)
    );

    return results;
  },
});

/**
 * Check if the current user can facilitate an election (advance/resolve).
 */
export const canFacilitateElectionQuery = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return false;

    const { member } = await requireChannelAccess(ctx, message.channelId);
    return canFacilitateElection(ctx, args.messageId, member._id);
  },
});

// ---- Reactions ----

/**
 * Toggle a reaction on a message. If the member already reacted with the given
 * emoji, the reaction is removed. Otherwise it is added.
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);

    // Check for existing reaction using the compound index
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_member_and_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("memberId", member._id)
          .eq("emoji", args.emoji)
      )
      .unique();

    if (existing) {
      // Remove the reaction (toggle off)
      await ctx.db.delete(existing._id);
    } else {
      // Add the reaction (toggle on)
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        orgaId: message.orgaId,
        memberId: member._id,
        emoji: args.emoji,
      });
    }

    return null;
  },
});

/**
 * Get aggregated reactions for a batch of messages.
 * Returns reactions grouped by emoji for each message, with counts and
 * whether the current member has reacted.
 */
export const getReactionsForMessages = query({
  args: {
    messageIds: v.array(v.id("messages")),
  },
  returns: v.array(v.object({
    messageId: v.id("messages"),
    reactions: v.array(v.object({
      emoji: v.string(),
      count: v.number(),
      reacted: v.boolean(),
      memberNames: v.array(v.string()),
    })),
  })),
  handler: async (ctx, args) => {
    if (args.messageIds.length === 0) return [];

    // We need at least one message to determine the channel for access check.
    // All messages in a batch are from the same channel, so check the first one.
    const firstMsg = await ctx.db.get(args.messageIds[0]);
    if (!firstMsg) return [];

    const { member } = await requireChannelAccess(ctx, firstMsg.channelId);

    const memberCache = new Map<string, string>();
    const getMemberName = async (memberId: Id<"members">) => {
      let name = memberCache.get(memberId);
      if (!name) {
        const doc = await ctx.db.get(memberId);
        name = doc ? `${doc.firstname} ${doc.surname}` : "Unknown";
        memberCache.set(memberId, name);
      }
      return name;
    };

    return Promise.all(
      args.messageIds.map(async (messageId) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();

        // Group by emoji
        const emojiMap = new Map<
          string,
          { count: number; reacted: boolean; memberIds: Id<"members">[] }
        >();

        for (const r of reactions) {
          let group = emojiMap.get(r.emoji);
          if (!group) {
            group = { count: 0, reacted: false, memberIds: [] };
            emojiMap.set(r.emoji, group);
          }
          group.count++;
          group.memberIds.push(r.memberId);
          if (r.memberId === member._id) {
            group.reacted = true;
          }
        }

        // Build result, preserving insertion order (which gives a stable emoji order)
        const reactionGroups = await Promise.all(
          Array.from(emojiMap.entries()).map(async ([emoji, group]) => ({
            emoji,
            count: group.count,
            reacted: group.reacted,
            memberNames: await Promise.all(group.memberIds.map(getMemberName)),
          }))
        );

        return { messageId, reactions: reactionGroups };
      })
    );
  },
});

// ---- Message Search ----

/**
 * Search messages by text content within an organization.
 * Optionally scoped to a specific channel.
 * Returns up to 20 results with denormalized author and channel names.
 */
export const searchMessages = query({
  args: {
    orgaId: v.id("orgas"),
    query: v.string(),
    channelId: v.optional(v.id("channels")),
  },
  returns: v.array(v.object({
    _id: v.id("messages"),
    text: v.string(),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    channelName: v.string(),
    authorName: v.string(),
    isEdited: v.boolean(),
  })),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);

    const trimmed = args.query.trim();
    if (trimmed.length < 2) return [];

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_text", (q) => {
        let sq = q.search("text", trimmed).eq("orgaId", args.orgaId);
        if (args.channelId) {
          sq = sq.eq("channelId", args.channelId);
        }
        return sq;
      })
      .take(20);

    // Denormalize author and channel names
    const authorCache = new Map<string, string>();
    const channelCache = new Map<string, string>();

    return Promise.all(
      results.map(async (msg) => {
        // Author name
        let authorName = authorCache.get(msg.authorId);
        if (!authorName) {
          const member = await ctx.db.get(msg.authorId);
          authorName = member
            ? `${member.firstname} ${member.surname}`
            : "Unknown";
          authorCache.set(msg.authorId, authorName);
        }

        // Channel name
        let channelName = channelCache.get(msg.channelId);
        if (!channelName) {
          const channel = await ctx.db.get(msg.channelId);
          if (channel) {
            if (channel.kind === "orga") {
              const orga = await ctx.db.get(channel.orgaId);
              channelName = orga?.name ?? "General";
            } else if (channel.kind === "team" && channel.teamId) {
              const team = await ctx.db.get(channel.teamId);
              channelName = team?.name ?? "Team";
            } else {
              channelName = "DM";
            }
          } else {
            channelName = "Unknown";
          }
          channelCache.set(msg.channelId, channelName);
        }

        return {
          _id: msg._id,
          text: msg.text,
          _creationTime: msg._creationTime,
          channelId: msg.channelId,
          channelName,
          authorName,
          isEdited: msg.isEdited,
        };
      })
    );
  },
});

// ---- Message Edit & Delete ----

/**
 * Edit a message's text content. Only the author can edit their own messages.
 * Messages with embedded tools cannot be edited (they have their own lifecycle).
 * Thread replies can also be edited by their author.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
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

    await ctx.db.patch(args.messageId, {
      text: trimmed,
      isEdited: true,
      editedAt: Date.now(),
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

    // Delete reactions on this message
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const r of reactions) {
      await ctx.db.delete(r._id);
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
        await ctx.db.delete(reply._id);
      }
    }

    // Delete the message itself
    await ctx.db.delete(args.messageId);

    return null;
  },
});
