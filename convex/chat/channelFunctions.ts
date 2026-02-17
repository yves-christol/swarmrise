import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "../_generated/dataModel";
import { channelValidator, embeddedToolType } from ".";
import { getMemberInOrga } from "../utils";
import { requireChannelAccess } from "./access";

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
    const member = await getMemberInOrga(ctx, args.orgaId);

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
      mentions: v.optional(v.array(v.id("members"))),
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
          mentions: msg.mentions,
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
    const member = await getMemberInOrga(ctx, args.orgaId);

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
