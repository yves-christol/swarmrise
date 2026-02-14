import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import type { Message } from ".";

/**
 * Validate that a message has an election embedded tool in the expected phase.
 * Throws if the message doesn't have an election tool or is in the wrong phase.
 */
export function requireElectionPhase(
  message: Message,
  ...allowedPhases: Array<"nomination" | "discussion" | "change_round" | "consent" | "elected">
): void {
  if (!message.embeddedTool) {
    throw new Error("Message has no embedded tool");
  }
  if (message.embeddedTool.type !== "election") {
    throw new Error("Message embedded tool is not an election");
  }
  if (!allowedPhases.includes(message.embeddedTool.phase)) {
    throw new Error(
      `Election is in "${message.embeddedTool.phase}" phase, expected one of: ${allowedPhases.join(", ")}`
    );
  }
}

/**
 * Check if a member can facilitate an election (advance phase, resolve).
 * A facilitator is:
 * - The election initiator (message author)
 * - The orga owner
 * - A member holding a leader or secretary role in the channel's team
 *
 * Same logic as canFacilitateTopic but works for any embedded tool message.
 */
export async function canFacilitateElection(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
  memberId: Id<"members">
): Promise<boolean> {
  const message = await ctx.db.get(messageId);
  if (!message) return false;

  // Initiator is always a facilitator
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
