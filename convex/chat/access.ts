import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getMemberInOrga } from "../utils";
import type { Channel } from ".";
import type { Member } from "../members";

/**
 * Verify that the authenticated user has access to a channel.
 * Returns the channel and the member document.
 * Throws if access is denied.
 */
export async function requireChannelAccess(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<"channels">,
): Promise<{ channel: Channel; member: Member }> {
  const channel = await ctx.db.get(channelId);
  if (!channel) throw new Error("Channel not found");

  const member = await getMemberInOrga(ctx, channel.orgaId);

  if (channel.kind === "team") {
    if (!channel.teamId) throw new Error("Team channel has no teamId");
    const hasAccess = await memberHasTeamAccess(ctx, member, channel.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");
  }

  if (channel.kind === "dm") {
    const isParticipant =
      channel.dmMemberA === member._id || channel.dmMemberB === member._id;
    if (!isParticipant) throw new Error("Not a participant in this conversation");
  }

  return { channel, member };
}

/**
 * Check if a member has at least one role in a team.
 */
export async function memberHasTeamAccess(
  ctx: QueryCtx | MutationCtx,
  member: Member,
  teamId: Id<"teams">,
): Promise<boolean> {
  for (const roleId of member.roleIds) {
    const role = await ctx.db.get(roleId);
    if (role && role.teamId === teamId) return true;
  }
  return false;
}

/**
 * Require that a channel is not archived (for write operations).
 */
export function requireNotArchived(channel: Channel): void {
  if (channel.isArchived) {
    throw new Error("This channel is archived and read-only");
  }
}
