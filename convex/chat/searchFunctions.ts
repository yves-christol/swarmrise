import { query } from "../_generated/server";
import { v } from "convex/values";
import { getMemberInOrga } from "../utils";

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
    await getMemberInOrga(ctx, args.orgaId);

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
