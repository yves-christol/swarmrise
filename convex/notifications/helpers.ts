import { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { NotificationCategory, NotificationPriority } from "./index";
import { ChannelPreferences } from "../notificationPreferences";

/**
 * Check if a user should receive a notification based on their preferences
 * Returns the delivery channels that are enabled
 */
export async function shouldNotify(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgaId: Id<"orgas"> | undefined,
  category: NotificationCategory
): Promise<ChannelPreferences> {
  // Default preferences if none exist
  const defaultPrefs: ChannelPreferences = {
    inApp: true,
    email: true,
    push: false,
  };

  // Check org-specific preferences first
  if (orgaId) {
    const orgPrefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", userId).eq("orgaId", orgaId)
      )
      .unique();

    if (orgPrefs) {
      return orgPrefs[category];
    }
  }

  // Fall back to global preferences
  const globalPrefs = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_user_and_orga", (q) =>
      q.eq("userId", userId).eq("orgaId", undefined)
    )
    .unique();

  if (globalPrefs) {
    return globalPrefs[category];
  }

  // Return defaults if no preferences exist
  return defaultPrefs;
}

/**
 * Check if current time is within user's quiet hours
 */
export async function isInQuietHours(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgaId: Id<"orgas"> | undefined
): Promise<boolean> {
  // Get preferences
  let prefs = null;

  if (orgaId) {
    prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", userId).eq("orgaId", orgaId)
      )
      .unique();
  }

  if (!prefs) {
    prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_and_orga", (q) =>
        q.eq("userId", userId).eq("orgaId", undefined)
      )
      .unique();
  }

  if (!prefs || prefs.quietHoursStart === undefined || prefs.quietHoursEnd === undefined) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getUTCHours(); // Note: Using UTC, may need timezone handling

  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentHour >= start || currentHour < end;
  }

  // Normal range (e.g., 00:00 to 06:00)
  return currentHour >= start && currentHour < end;
}

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
 * Create a team policy notification
 */
export function buildPolicyTeamNotification(
  params: CreateNotificationParams & {
    policyId: Id<"policies">;
    policyTitle: string;
    teamId: Id<"teams">;
    teamName: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "policy_team" as const,
      policyId: params.policyId,
      policyTitle: params.policyTitle,
      teamId: params.teamId,
      teamName: params.teamName,
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
 * Create a decision notification
 */
export function buildDecisionNotification(
  params: CreateNotificationParams & {
    decisionId: Id<"decisions">;
    targetType: string;
    summary: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "decision" as const,
      decisionId: params.decisionId,
      targetType: params.targetType,
      summary: params.summary,
    },
    priority: params.priority ?? ("low" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey ?? `decision-${params.decisionId}`,
  };
}

/**
 * Create a system notification
 */
export function buildSystemNotification(
  params: CreateNotificationParams & {
    title: string;
    message: string;
  }
) {
  return {
    userId: params.userId,
    orgaId: params.orgaId,
    memberId: params.memberId,
    payload: {
      category: "system" as const,
      title: params.title,
      message: params.message,
    },
    priority: params.priority ?? ("normal" as const),
    expiresAt: params.expiresAt,
    groupKey: params.groupKey,
  };
}
