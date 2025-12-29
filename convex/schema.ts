import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Swarmrise Data Model Schema
 * 
 * Main concepts: Person (User), Orga, Role, Team, Decision
 * Secondary concepts: Invitation, Topic, Meeting
 */

// Contact info type discriminator
const contactInfoType = v.union(
  v.literal("LinkedIn"),
  v.literal("Facebook"),
  v.literal("Instagram"),
  v.literal("Whatsapp"),
  v.literal("Mobile"),
  v.literal("Address")
);

// Contact info validator (0 to 10 per Person)
const contactInfo = v.object({
  type: contactInfoType,
  value: v.string(),
});

// RGB color validator (r, g, b values 0-255)
const rgbColor = v.object({
  r: v.number(), // 0-255
  g: v.number(), // 0-255
  b: v.number(), // 0-255
});

// Color scheme validator (2 RGB colors)
const colorScheme = v.object({
  primary: rgbColor,
  secondary: rgbColor,
});

// Invitation status
const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("rejected"),
  v.literal("accepted")
);

// Decision diff validator (before/after state)
const decisionDiff = v.object({
  before: v.any(), // Can be any value representing the state before
  after: v.any(),  // Can be any value representing the state after
});

export default defineSchema({
  // Users collection - contains all Persons
  users: defineTable({
    firstname: v.string(),
    surname: v.string(),
    email: v.string(),
    pictureURL: v.optional(v.string()),
    contactInfos: v.array(contactInfo), // 0 to 10 contact infos
    orgaIds: v.array(v.id("orgas")), // 0 to 10 orgas this person belongs to
  })
    .index("by_email", ["email"]),

  // Orgas collection - contains all Organizations
  orgas: defineTable({
    name: v.string(),
    logoUrl: v.optional(v.string()),
    colorScheme: colorScheme,
  })
    .index("by_name", ["name"]),

  // Teams collection - each Team belongs to one Orga
  teams: defineTable({
    orgaId: v.id("orgas"),
    name: v.string(),
    parentTeamId: v.optional(v.id("teams")), // null if this is the First Team
    mission: v.optional(v.string()), // Mission of the Leader Role (replicated for convenience)
    isFirstTeam: v.boolean(), // true if this is the First Team of the Orga
  })
    .index("by_orga", ["orgaId"])
    .index("by_parent_team", ["parentTeamId"])
    .index("by_orga_and_parent", ["orgaId", "parentTeamId"]),

  // Members collection - Members of an Orga (replicates Person data for convenience)
  members: defineTable({
    orgaId: v.id("orgas"),
    personId: v.id("users"), // Reference to the Person
    // Replicated Person data for convenience
    firstname: v.string(),
    surname: v.string(),
    email: v.string(),
    pictureURL: v.optional(v.string()),
    contactInfos: v.array(contactInfo),
    roleIds: v.array(v.id("roles")), // Roles this member holds (0 to many)
  })
    .index("by_orga", ["orgaId"])
    .index("by_person", ["personId"])
    .index("by_orga_and_person", ["orgaId", "personId"])
    .index("by_email", ["email"]),

  // Roles collection - each Role belongs to one Team
  roles: defineTable({
    teamId: v.id("teams"),
    title: v.string(), // e.g., "Leader", "Secretary", "Referee"
    mission: v.string(),
    duties: v.array(v.string()), // 0 to 10 duties
    memberId: v.optional(v.id("members")), // The Member holding this Role (can be null)
  })
    .index("by_team", ["teamId"])
    .index("by_member", ["memberId"])
    .index("by_team_and_title", ["teamId", "title"]),

  // Invitations collection - Invitations sent by Members to join an Orga
  invitations: defineTable({
    orgaId: v.id("orgas"),
    emitterMemberId: v.id("members"), // Member who sent the invitation
    email: v.string(), // Email of the person being invited
    status: invitationStatus,
    sentDate: v.number(), // Timestamp
  })
    .index("by_orga", ["orgaId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_orga_and_status", ["orgaId", "status"]),

  // Decisions collection - Traceability for all modifications
  decisions: defineTable({
    orgaId: v.id("orgas"),
    timestamp: v.number(),
    authorEmail: v.string(), // Email of the person who made the decision
    roleName: v.string(), // Name of the role that issued the decision
    teamName: v.string(), // Name of the team
    targetId: v.string(), // ID of the target entity (can be any table)
    targetType: v.string(), // Type of target (e.g., "team", "role", "member")
    diff: decisionDiff, // Before/after state
  })
    .index("by_orga", ["orgaId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_author", ["authorEmail"])
    .index("by_orga_and_timestamp", ["orgaId", "timestamp"])
    .index("by_target", ["targetType", "targetId"]),

  // Topics collection - Discussion topics within Teams
  topics: defineTable({
    teamId: v.id("teams"),
    roleId: v.id("roles"), // Role that issued the topic
    title: v.string(),
    text: v.string(),
    issuedDate: v.number(), // Timestamp
  })
    .index("by_team", ["teamId"])
    .index("by_role", ["roleId"])
    .index("by_team_and_date", ["teamId", "issuedDate"]),

  // Meetings collection - Meetings within Teams
  meetings: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    scheduledDate: v.number(), // Timestamp
    // Add more meeting fields as needed
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_date", ["teamId", "scheduledDate"]),
});
