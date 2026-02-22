import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { NotificationPriority } from "./index";
import { Channel } from "../chat";

/**
 * Get all members with roles in a specific team
 * Returns unique member IDs with their associated user IDs
 */
export async function getTeamMemberUsers(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<Array<{ memberId: Id<"members">; userId: Id<"users"> }>> {
  const roles = await ctx.db
    .query("roles")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();

  const memberIds = [...new Set(roles.map((r) => r.memberId))];
  const result: Array<{ memberId: Id<"members">; userId: Id<"users"> }> = [];

  for (const memberId of memberIds) {
    const member = await ctx.db.get(memberId);
    if (member) {
      result.push({ memberId, userId: member.personId });
    }
  }

  return result;
}

/**
 * Get all members in an organization
 * Returns member IDs with their associated user IDs
 */
export async function getOrgaMemberUsers(
  ctx: QueryCtx | MutationCtx,
  orgaId: Id<"orgas">
): Promise<Array<{ memberId: Id<"members">; userId: Id<"users"> }>> {
  const members = await ctx.db
    .query("members")
    .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
    .collect();

  return members.map((m) => ({ memberId: m._id, userId: m.personId }));
}

/**
 * Helper type for notification creation parameters
 */
export interface CreateNotificationParams {
  userId: Id<"users">;
  orgaId?: Id<"orgas">;
  memberId?: Id<"members">;
  priority?: NotificationPriority;
  expiresAt?: number;
  groupKey?: string;
}

/**
 * Create an invitation notification
 */
export function buildInvitationNotification(
  params: CreateNotificationParams & {
    invitationId: Id<"invitations">;
    orgaName: string;
    inviterName: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "invitation" as const,
      invitationId: params.invitationId,
      orgaName: params.orgaName,
      inviterName: params.inviterName,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `invitation-${params.invitationId}`,
  };
}

/**
 * Create a global policy notification
 */
export function buildPolicyGlobalNotification(
  params: CreateNotificationParams & {
    policyId: Id<"policies">;
    policyTitle: string;
    orgaName: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "policy_global" as const,
      policyId: params.policyId,
      policyTitle: params.policyTitle,
      orgaId: params.orgaId!,
      orgaName: params.orgaName,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `policy-${params.policyId}`,
  };
}

/**
 * Create a role assignment notification
 */
export function buildRoleAssignmentNotification(
  params: CreateNotificationParams & {
    roleId: Id<"roles">;
    roleTitle: string;
    teamName: string;
    orgaName: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "role_assignment" as const,
      roleId: params.roleId,
      roleTitle: params.roleTitle,
      teamName: params.teamName,
      orgaId: params.orgaId!,
      orgaName: params.orgaName,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `role-${params.roleId}`,
  };
}

/**
 * Create a chat message notification
 */
export function buildMessageNotification(
  params: CreateNotificationParams & {
    messageId: Id<"messages">;
    channelId: Id<"channels">;
    channelName: string;
    teamId?: Id<"teams">;
    teamName?: string;
    senderName: string;
    preview: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "message" as const,
      messageId: params.messageId,
      channelId: params.channelId,
      channelName: params.channelName,
      teamId: params.teamId,
      teamName: params.teamName,
      senderName: params.senderName,
      preview: params.preview,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `chat-message-${params.channelId}-${params.userId}`,
  };
}

/**
 * Create a tool event notification (topic/election/vote phase change)
 */
export function buildToolEventNotification(
  params: CreateNotificationParams & {
    messageId: Id<"messages">;
    channelId: Id<"channels">;
    channelName: string;
    toolType: "topic" | "voting" | "election" | "lottery";
    eventDescription: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "tool_event" as const,
      messageId: params.messageId,
      channelId: params.channelId,
      channelName: params.channelName,
      toolType: params.toolType,
      eventDescription: params.eventDescription,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `chat-tool-${params.messageId}`,
  };
}

/**
 * Resolve a channel to a human-readable display name.
 * - Orga channel: org name or "General"
 * - Team channel: team name
 * - DM channel: other participant's name
 */
export async function getChannelDisplayName(
  ctx: QueryCtx | MutationCtx,
  channel: Channel,
  viewerMemberId?: Id<"members">
): Promise<string> {
  if (channel.kind === "orga") {
    const orga = await ctx.db.get(channel.orgaId);
    return orga?.name ?? "General";
  }
  if (channel.kind === "team" && channel.teamId) {
    const team = await ctx.db.get(channel.teamId);
    return team?.name ?? "Team";
  }
  if (channel.kind === "dm") {
    const otherMemberId =
      viewerMemberId && channel.dmMemberA === viewerMemberId
        ? channel.dmMemberB
        : channel.dmMemberA;
    if (otherMemberId) {
      const otherMember = await ctx.db.get(otherMemberId);
      if (otherMember) return `${otherMember.firstname} ${otherMember.surname}`;
    }
    return "DM";
  }
  return "Channel";
}

/**
 * Get all members who should receive notifications for a channel, excluding the actor.
 * - Orga channel: all org members
 * - Team channel: all members with roles in that team
 * - DM channel: the other participant
 */
export async function getChannelRecipients(
  ctx: QueryCtx | MutationCtx,
  channel: Channel,
  excludeMemberId: Id<"members">
): Promise<Array<{ memberId: Id<"members">; userId: Id<"users"> }>> {
  if (channel.kind === "orga") {
    const all = await getOrgaMemberUsers(ctx, channel.orgaId);
    return all.filter((m) => m.memberId !== excludeMemberId);
  }
  if (channel.kind === "team" && channel.teamId) {
    const all = await getTeamMemberUsers(ctx, channel.teamId);
    return all.filter((m) => m.memberId !== excludeMemberId);
  }
  if (channel.kind === "dm") {
    const otherMemberId =
      channel.dmMemberA === excludeMemberId ? channel.dmMemberB : channel.dmMemberA;
    if (otherMemberId) {
      const otherMember = await ctx.db.get(otherMemberId);
      if (otherMember) {
        return [{ memberId: otherMemberId, userId: otherMember.personId }];
      }
    }
    return [];
  }
  return [];
}
