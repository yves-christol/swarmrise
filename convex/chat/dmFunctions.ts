import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getMemberInOrga } from "../utils";

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
    const member = await getMemberInOrga(ctx, args.orgaId);

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
