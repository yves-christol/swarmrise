import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import type { Message } from ".";

/**
 * Check if a member can facilitate a topic (advance phase, resolve).
 * A facilitator is:
 * - The proposer (message author)
 * - The orga owner
 * - A member holding a leader or secretary role in the channel's team
 */
export async function canFacilitateTopic(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
  memberId: Id<"members">
): Promise<boolean> {
  const message = await ctx.db.get(messageId);
  if (!message) return false;

  // Proposer is always a facilitator
  if (message.authorId === memberId) return true;

  // Check if member is orga owner
  const orga = await ctx.db.get(message.orgaId);
  if (!orga) return false;

  const member = await ctx.db.get(memberId);
  if (!member) return false;

  if (orga.owner === member.personId) return true;

  // Check if member holds leader/secretary role in the channel's team
  const channel = await ctx.db.get(message.channelId);
  if (!channel || !channel.teamId) return false;

  const leaderRoles = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) =>
      q.eq("teamId", channel.teamId!).eq("roleType", "leader")
    )
    .collect();

  for (const role of leaderRoles) {
    if (role.memberId === memberId) return true;
  }

  const secretaryRoles = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) =>
      q.eq("teamId", channel.teamId!).eq("roleType", "secretary")
    )
    .collect();

  for (const role of secretaryRoles) {
    if (role.memberId === memberId) return true;
  }

  return false;
}

/**
 * Validate that a message has a topic embedded tool in the expected phase.
 * Throws if the message doesn't have a topic tool or is in the wrong phase.
 */
export function requireTopicPhase(
  message: Message,
  expectedPhase: "clarification" | "consent" | "resolved"
): void {
  if (!message.embeddedTool) {
    throw new Error("Message has no embedded tool");
  }
  if (message.embeddedTool.type !== "topic") {
    throw new Error("Message embedded tool is not a topic");
  }
  if (message.embeddedTool.phase !== expectedPhase) {
    throw new Error(
      `Topic is in "${message.embeddedTool.phase}" phase, expected "${expectedPhase}"`
    );
  }
}
