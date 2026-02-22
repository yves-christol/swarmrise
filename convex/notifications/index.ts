import { v, Infer } from "convex/values";

// Notification categories - extensible for future notification types
export const notificationCategoryType = v.union(
  v.literal("invitation"),       // Pending invitation to join org
  v.literal("message"),          // Unread chat messages in a channel
  v.literal("tool_event"),       // Chat tool events (topic/election/vote phase changes)
  v.literal("policy_global"),    // New org-wide policy
  v.literal("policy_team"),      // New team policy
  v.literal("decision"),         // New decision affecting user
  v.literal("role_assignment"),  // Assigned to a new role
  v.literal("mention"),          // Mentioned in a topic/discussion (future)
  v.literal("kanban_due"),       // Kanban card approaching due date or overdue
  v.literal("system")            // System announcements
);

export type NotificationCategory = Infer<typeof notificationCategoryType>;

// Priority levels for notification ordering and display
export const notificationPriorityType = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent")
);

export type NotificationPriority = Infer<typeof notificationPriorityType>;

// Invitation payload
export const invitationPayload = v.object({
  category: v.literal("invitation"),
  invitationId: v.id("invitations"),
  orgaName: v.string(),
  inviterName: v.string(),
});

// Message payload (chat messages)
export const messagePayload = v.object({
  category: v.literal("message"),
  messageId: v.id("messages"),
  channelId: v.id("channels"),
  channelName: v.string(),
  teamId: v.optional(v.id("teams")),
  teamName: v.optional(v.string()),
  senderName: v.string(),
  preview: v.string(),
});

// Tool event payload (topic/election/vote phase changes)
export const toolEventPayload = v.object({
  category: v.literal("tool_event"),
  messageId: v.id("messages"),
  channelId: v.id("channels"),
  channelName: v.string(),
  toolType: v.union(v.literal("topic"), v.literal("voting"), v.literal("election"), v.literal("lottery")),
  eventDescription: v.string(),
});

// Global policy payload
export const policyGlobalPayload = v.object({
  category: v.literal("policy_global"),
  policyId: v.id("policies"),
  policyTitle: v.string(),
  orgaId: v.id("orgas"),
  orgaName: v.string(),
});

// Team policy payload
export const policyTeamPayload = v.object({
  category: v.literal("policy_team"),
  policyId: v.id("policies"),
  policyTitle: v.string(),
  teamId: v.id("teams"),
  teamName: v.string(),
});

// Decision payload
export const decisionPayload = v.object({
  category: v.literal("decision"),
  decisionId: v.id("decisions"),
  targetType: v.string(),
  summary: v.string(),
});

// Role assignment payload
export const roleAssignmentPayload = v.object({
  category: v.literal("role_assignment"),
  roleId: v.id("roles"),
  roleTitle: v.string(),
  teamName: v.string(),
  orgaId: v.id("orgas"),
  orgaName: v.string(),
});

// Mention payload (future feature)
export const mentionPayload = v.object({
  category: v.literal("mention"),
  sourceType: v.union(v.literal("topic"), v.literal("message")),
  sourceId: v.string(), // Will be proper ID type when implemented
  mentionerName: v.string(),
  preview: v.string(),
});

// Kanban due date payload
export const kanbanDuePayload = v.object({
  category: v.literal("kanban_due"),
  cardId: v.id("kanbanCards"),
  cardTitle: v.string(),
  teamId: v.id("teams"),
  teamName: v.string(),
  dueDate: v.number(),
  dueType: v.union(v.literal("approaching"), v.literal("overdue")),
});

// System payload
export const systemPayload = v.object({
  category: v.literal("system"),
  title: v.string(),
  message: v.string(),
});

// Polymorphic payload - discriminated union based on category
export const notificationPayload = v.union(
  invitationPayload,
  messagePayload,
  toolEventPayload,
  policyGlobalPayload,
  policyTeamPayload,
  decisionPayload,
  roleAssignmentPayload,
  mentionPayload,
  kanbanDuePayload,
  systemPayload
);

export type NotificationPayload = Infer<typeof notificationPayload>;

// Main notification type (fields only, no system fields)
export const notificationType = v.object({
  // Target - who receives this notification
  userId: v.id("users"),                 // The notification recipient
  orgaId: v.optional(v.id("orgas")),     // Optional: null for user-level (invitations to new orgs)
  memberId: v.optional(v.id("members")), // Optional: the member context if applicable

  // Content
  payload: notificationPayload,
  priority: notificationPriorityType,

  // State
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  isArchived: v.boolean(),
  archivedAt: v.optional(v.number()),

  // Metadata
  expiresAt: v.optional(v.number()),   // Auto-cleanup for transient notifications
  groupKey: v.optional(v.string()),    // For grouping related notifications
});

// Full notification validator with system fields
export const notificationValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  ...notificationType.fields,
});

export type Notification = Infer<typeof notificationValidator>;
