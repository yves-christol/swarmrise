import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { requireChannelAccess, requireNotArchived } from "./access";
import { requireLotteryPending, getChannelMemberPool } from "./lotteryHelpers";
import {
  buildToolEventNotification,
  getChannelDisplayName,
} from "../notifications/helpers";

/**
 * Create a new message with an embedded lottery tool.
 */
export const createLotteryMessage = mutation({
  args: {
    channelId: v.id("channels"),
    description: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmedDescription = args.description.trim();
    if (!trimmedDescription) throw new Error("Description cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmedDescription,
      isEdited: false,
      embeddedTool: {
        type: "lottery",
        description: trimmedDescription,
        status: "pending",
      },
    });

    return messageId;
  },
});

/**
 * Draw the lottery: randomly select a member from the channel pool.
 * Any channel member can trigger the draw. Idempotent -- no-op if already drawn.
 */
export const drawLottery = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Idempotent: if already drawn, return silently
    if (
      message.embeddedTool &&
      message.embeddedTool.type === "lottery" &&
      message.embeddedTool.status === "drawn"
    ) {
      return null;
    }

    const { channel, member } = await requireChannelAccess(ctx, message.channelId);
    requireLotteryPending(message);

    const pool = await getChannelMemberPool(ctx, channel);
    if (pool.length === 0) throw new Error("No eligible members in this channel");

    // Select random member using message ID hash + timestamp for determinism
    const seed = `${args.messageId}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % pool.length;
    const selectedMemberId = pool[index];

    const tool = message.embeddedTool as { type: "lottery"; description: string; status: "pending" };

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        type: "lottery" as const,
        description: tool.description,
        status: "drawn" as const,
        selectedMemberId,
        drawnByMemberId: member._id,
        drawnAt: Date.now(),
        poolSize: pool.length,
      },
    });

    // Notify only the selected member (not all channel members)
    const selectedMember = await ctx.db.get(selectedMemberId);
    if (selectedMember) {
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const notification = buildToolEventNotification({
        userId: selectedMember.personId,
        orgaId: message.orgaId,
        memberId: selectedMemberId,
        messageId: args.messageId,
        channelId: message.channelId,
        channelName,
        toolType: "lottery",
        eventDescription: `You were selected for: "${tool.description}"`,
      });
      await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
        notifications: [notification],
      });
    }

    return null;
  },
});

/**
 * Get lottery details including resolved member info for display.
 */
export const getLotteryDetails = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      description: v.string(),
      status: v.union(v.literal("pending"), v.literal("drawn")),
      poolSize: v.optional(v.number()),
      drawnAt: v.optional(v.number()),
      selectedMember: v.optional(
        v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
          pictureURL: v.optional(v.string()),
        })
      ),
      drawnByMember: v.optional(
        v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
        })
      ),
      pool: v.array(
        v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
          pictureURL: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "lottery") return null;
    const tool = message.embeddedTool;

    const channel = await ctx.db.get(message.channelId);
    if (!channel) return null;

    // Get pool members with resolved info
    const poolIds = await getChannelMemberPool(ctx, channel);
    const pool = await Promise.all(
      poolIds.map(async (id) => {
        const m = await ctx.db.get(id);
        return m
          ? { _id: m._id, firstname: m.firstname, surname: m.surname, pictureURL: m.pictureURL }
          : { _id: id, firstname: "Unknown", surname: "User", pictureURL: undefined };
      })
    );

    // Resolve selected member
    let selectedMember;
    if (tool.selectedMemberId) {
      const m = await ctx.db.get(tool.selectedMemberId);
      if (m) {
        selectedMember = { _id: m._id, firstname: m.firstname, surname: m.surname, pictureURL: m.pictureURL };
      }
    }

    // Resolve drawn-by member
    let drawnByMember;
    if (tool.drawnByMemberId) {
      const m = await ctx.db.get(tool.drawnByMemberId);
      if (m) {
        drawnByMember = { _id: m._id, firstname: m.firstname, surname: m.surname };
      }
    }

    return {
      description: tool.description,
      status: tool.status,
      poolSize: tool.poolSize,
      drawnAt: tool.drawnAt,
      selectedMember,
      drawnByMember,
      pool,
    };
  },
});
