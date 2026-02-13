import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "../_generated/dataModel";
import { channelValidator, embeddedToolType } from ".";
import { requireAuthAndMembership, getAuthenticatedUserEmail, getRoleAndTeamInfo } from "../utils";
import { requireChannelAccess, requireNotArchived } from "./access";
import { canFacilitateTopic, requireTopicPhase } from "./topicHelpers";

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
