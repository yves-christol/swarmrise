import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireChannelAccess } from "./access";

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
