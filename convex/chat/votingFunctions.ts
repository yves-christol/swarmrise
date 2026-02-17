import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { voteOptionResultType } from ".";
import { getMemberInOrga } from "../utils";
import { requireChannelAccess, requireNotArchived } from "./access";
import { canFacilitateTopic } from "./topicHelpers";
import { requireVotingOpen, validateChoices } from "./votingHelpers";
import {
  buildToolEventNotification,
  getChannelDisplayName,
  getChannelRecipients,
} from "../notifications/helpers";

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

    const member = await getMemberInOrga(ctx, message.orgaId);
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
