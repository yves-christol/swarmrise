import { v, Infer } from "convex/values";

// Channel preferences for each notification category
export const channelPreferences = v.object({
  inApp: v.boolean(),
  email: v.boolean(),
  push: v.optional(v.boolean()), // Future: push notifications
});

export type ChannelPreferences = Infer<typeof channelPreferences>;

// Digest frequency options
export const digestFrequency = v.union(
  v.literal("realtime"),
  v.literal("daily"),
  v.literal("weekly")
);

export type DigestFrequency = Infer<typeof digestFrequency>;

// Notification preferences type (fields only, no system fields)
export const notificationPreferencesType = v.object({
  userId: v.id("users"),
  orgaId: v.optional(v.id("orgas")), // null = global defaults, specific = org override

  // Per-category preferences
  invitation: channelPreferences,
  message: channelPreferences,
  tool_event: v.optional(channelPreferences),
  policy_global: channelPreferences,
  policy_team: channelPreferences,
  decision: channelPreferences,
  role_assignment: channelPreferences,
  kanban_due: v.optional(channelPreferences),
  mention: channelPreferences,
  system: channelPreferences,

  // Global settings
  quietHoursStart: v.optional(v.number()), // Hour (0-23)
  quietHoursEnd: v.optional(v.number()),   // Hour (0-23)
  digestFrequency: digestFrequency,
});

// Full notification preferences validator with system fields
export const notificationPreferencesValidator = v.object({
  _id: v.id("notificationPreferences"),
  _creationTime: v.number(),
  ...notificationPreferencesType.fields,
});

export type NotificationPreferences = Infer<typeof notificationPreferencesValidator>;

// Default channel preferences (all enabled except push)
export const defaultChannelPreferences: ChannelPreferences = {
  inApp: true,
  email: true,
  push: false,
};

// Helper to create default preferences for a user
export function createDefaultPreferences(userId: string) {
  return {
    userId,
    orgaId: undefined,
    invitation: defaultChannelPreferences,
    message: defaultChannelPreferences,
    tool_event: defaultChannelPreferences,
    policy_global: defaultChannelPreferences,
    policy_team: defaultChannelPreferences,
    decision: defaultChannelPreferences,
    role_assignment: defaultChannelPreferences,
    mention: defaultChannelPreferences,
    system: { ...defaultChannelPreferences, email: false }, // System notifications: no email by default
    quietHoursStart: undefined,
    quietHoursEnd: undefined,
    digestFrequency: "realtime" as const,
  };
}
