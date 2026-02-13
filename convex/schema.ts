import { defineSchema, defineTable } from "convex/server";
import { userType } from './users'
import { orgaType } from "./orgas";
import { policyType } from "./policies";
import { teamType } from "./teams";
import { roleType } from "./roles";
import { memberType } from "./members";
import { invitationType } from "./invitations"
import { decisionType } from "./decisions"
import { topicType } from './topics'
import { notificationType } from "./notifications"
import { notificationPreferencesType } from "./notificationPreferences"
import { channelType } from "./chat"
import { messageType } from "./chat"
import { channelReadPositionType } from "./chat"
/**
 * Swarmrise Data Model Schema
 *
 * Main concepts: User, Orga, Member, Role, Team, Decision
 * Secondary concepts: Invitation, Topic, Policy, Notification
 */


export default defineSchema({
  // Users collection - contains all Persons
  users: defineTable({...userType.fields}).index("by_email", ["email"]),
  // Orgas collection - contains all Organizations
  orgas: defineTable({ ...orgaType.fields})
    .index("by_name", ["name"])
    .index("by_owner", ["owner"]),

  // Teams collection - each Team belongs to one Orga
  teams: defineTable({ ...teamType.fields})
    .index("by_orga", ["orgaId"]),

  // Members collection - Members of an Orga (replicates Person data for convenience)
  members: defineTable({ ...memberType.fields })
    .index("by_orga", ["orgaId"])
    .index("by_person", ["personId"])
    .index("by_orga_and_person", ["orgaId", "personId"])
    .index("by_email", ["email"]),

  // Roles collection - each Role belongs to one Team
  roles: defineTable({ ...roleType.fields})
    .index("by_orga", ["orgaId"])
    .index("by_team", ["teamId"])
    .index("by_member", ["memberId"])
    .index("by_team_and_title", ["teamId", "title"])
    .index("by_team_and_role_type", ["teamId", "roleType"])
    .index("by_parent_team", ["parentTeamId"])
    .index("by_linked_role", ["linkedRoleId"]),

  // Invitations collection - Invitations sent by Members to join an Orga
  invitations: defineTable({ ...invitationType.fields })
    .index("by_orga", ["orgaId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_orga_and_status", ["orgaId", "status"])
    .index("by_status_and_sentDate", ["status", "sentDate"])
    .index("by_emitter", ["emitterMemberId"])
    .index("by_email_and_status", ["email", "status"]),

  // Decisions collection - Traceability for all modifications
  decisions: defineTable({ ...decisionType.fields })
    .index("by_orga", ["orgaId"])
    .index("by_orga_and_author", ["orgaId", "authorEmail"])
    .index("by_orga_and_target", ["orgaId", "targetType"])
    .index("by_orga_and_team", ["orgaId", "targetTeamId"]),

  // Topics collection - Discussion topics within Teams
  topics: defineTable({ ...topicType.fields})
    .index("by_team", ["teamId"])
    .index("by_role", ["roleId"])
    .index("by_team_and_date", ["teamId", "issuedDate"]),

  // Policies collection - Policies belonging to an Organization, from a Team, emitted by a Role
  policies: defineTable({ ...policyType.fields })
    .index("by_orga", ["orgaId"])
    .index("by_team", ["teamId"])
    .index("by_role", ["roleId"])
    .index("by_orga_and_visibility", ["orgaId", "visibility"])
    .index("by_team_and_date", ["teamId", "issuedDate"]),

  // Notifications collection - User notifications across all categories
  notifications: defineTable({ ...notificationType.fields })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_user_and_orga", ["userId", "orgaId"])
    .index("by_user_and_archived", ["userId", "isArchived"])
    .index("by_orga", ["orgaId"])
    .index("by_expires", ["expiresAt"])
    .index("by_group_key", ["groupKey"]),

  // Notification preferences collection - User preferences for notification delivery
  notificationPreferences: defineTable({ ...notificationPreferencesType.fields })
    .index("by_user", ["userId"])
    .index("by_user_and_orga", ["userId", "orgaId"]),

  // Chat system tables
  channels: defineTable({ ...channelType.fields })
    .index("by_orga", ["orgaId"])
    .index("by_orga_and_kind", ["orgaId", "kind"])
    .index("by_team", ["teamId"])
    .index("by_dm_members", ["orgaId", "dmMemberA", "dmMemberB"]),

  messages: defineTable({ ...messageType.fields })
    .index("by_channel", ["channelId"])
    .index("by_thread_parent", ["threadParentId"])
    .index("by_orga", ["orgaId"])
    .index("by_author", ["authorId"]),

  channelReadPositions: defineTable({ ...channelReadPositionType.fields })
    .index("by_channel_and_member", ["channelId", "memberId"])
    .index("by_member", ["memberId"]),
});
