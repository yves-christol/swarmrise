import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import type { Message, Channel } from ".";

/**
 * Validate that a message has a lottery embedded tool in "pending" status.
 * Throws if the message doesn't have a lottery tool or is already drawn.
 */
export function requireLotteryPending(message: Message): void {
  if (!message.embeddedTool) {
    throw new Error("Message has no embedded tool");
  }
  if (message.embeddedTool.type !== "lottery") {
    throw new Error("Message embedded tool is not a lottery");
  }
  if (message.embeddedTool.status !== "pending") {
    throw new Error("Lottery has already been drawn");
  }
}

/**
 * Get the pool of member IDs eligible for the lottery based on channel kind.
 * - orga: all org members
 * - team: members with roles in the team (deduplicated)
 * - dm: both DM participants
 */
export async function getChannelMemberPool(
  ctx: QueryCtx | MutationCtx,
  channel: Channel
): Promise<Id<"members">[]> {
  if (channel.kind === "orga") {
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", channel.orgaId))
      .collect();
    return members.map((m) => m._id);
  }

  if (channel.kind === "team" && channel.teamId) {
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", channel.teamId!))
      .collect();
    // Deduplicate by memberId
    const memberIds = [...new Set(roles.map((r) => r.memberId))];
    return memberIds;
  }

  if (channel.kind === "dm") {
    const participants: Id<"members">[] = [];
    if (channel.dmMemberA) participants.push(channel.dmMemberA);
    if (channel.dmMemberB) participants.push(channel.dmMemberB);
    return participants;
  }

  return [];
}
