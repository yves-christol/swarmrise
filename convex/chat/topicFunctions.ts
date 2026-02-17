import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { topicClarificationReturnType, topicResponseReturnType } from ".";
import { getMemberInOrga, getAuthenticatedUserEmail, getRoleAndTeamInfo } from "../utils";
import { requireChannelAccess, requireNotArchived } from "./access";
import { canFacilitateTopic, requireTopicPhase } from "./topicHelpers";
import {
  buildToolEventNotification,
  getChannelDisplayName,
  getChannelRecipients,
} from "../notifications/helpers";

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

    const member = await getMemberInOrga(ctx, message.orgaId);
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

    const member = await getMemberInOrga(ctx, message.orgaId);
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
