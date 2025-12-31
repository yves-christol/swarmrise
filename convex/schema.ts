import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Swarmrise Data Model Schema
 * 
 * Main concepts: Person (User), Orga, Role, Team, Decision
 * Secondary concepts: Invitation, Topic, Meeting, Policy
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

// Policy visibility
const policyVisibility = v.union(
  v.literal("private"), // Only visible to the Team
  v.literal("public")   // Applies to the whole Organization
);

// Decision diff validators - type-safe diffs for specific entity types
// Each diff ensures before and after are of the same type

// Organization diff
const organizationDiff = v.object({
  type: v.literal("Organization"),
  before: v.optional(v.object({
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colorScheme: v.optional(colorScheme),
  })),
  after: v.optional(v.object({
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colorScheme: v.optional(colorScheme),
  })),
});

// Team diff
const teamDiff = v.object({
  type: v.literal("Team"),
  before: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    name: v.optional(v.string()),
    parentTeamId: v.optional(v.id("teams")),
    mission: v.optional(v.string()),
    isFirstTeam: v.optional(v.boolean()),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    name: v.optional(v.string()),
    parentTeamId: v.optional(v.id("teams")),
    mission: v.optional(v.string()),
    isFirstTeam: v.optional(v.boolean()),
  })),
});

// Role diff
const roleDiff = v.object({
  type: v.literal("Role"),
  before: v.optional(v.object({
    teamId: v.optional(v.id("teams")),
    title: v.optional(v.string()),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    memberId: v.optional(v.id("members")),
  })),
  after: v.optional(v.object({
    teamId: v.optional(v.id("teams")),
    title: v.optional(v.string()),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    memberId: v.optional(v.id("members")),
  })),
});

// Invitation diff
const invitationDiff = v.object({
  type: v.literal("Invitation"),
  before: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    emitterMemberId: v.optional(v.id("members")),
    email: v.optional(v.string()),
    status: v.optional(invitationStatus),
    sentDate: v.optional(v.number()),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    emitterMemberId: v.optional(v.id("members")),
    email: v.optional(v.string()),
    status: v.optional(invitationStatus),
    sentDate: v.optional(v.number()),
  })),
});

// Policy diff
const policyDiff = v.object({
  type: v.literal("Policy"),
  before: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    teamId: v.optional(v.id("teams")),
    roleId: v.optional(v.id("roles")),
    issuedDate: v.optional(v.number()),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    visibility: v.optional(policyVisibility),
    expirationDate: v.optional(v.number()),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    teamId: v.optional(v.id("teams")),
    roleId: v.optional(v.id("roles")),
    issuedDate: v.optional(v.number()),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    visibility: v.optional(policyVisibility),
    expirationDate: v.optional(v.number()),
  })),
});

// Decision diff validator - discriminated union ensuring type safety
const decisionDiff = v.union(
  organizationDiff,
  teamDiff,
  roleDiff,
  invitationDiff,
  policyDiff
);

export default defineSchema({
  // numbers for backward compatibility here
  numbers: defineTable({
    value: v.number(),
  }),
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
    owner: v.id("members"), // Member who owns (pays for) the organization
  })
    .index("by_name", ["name"])
    .index("by_owner", ["owner"]),

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
    memberId: v.id("members"), // The Member holding this Role (required)
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

  // Policies collection - Policies belonging to an Organization, from a Team, emitted by a Role
  policies: defineTable({
    orgaId: v.id("orgas"),
    teamId: v.id("teams"),
    roleId: v.id("roles"), // Role that emitted the policy
    issuedDate: v.number(), // Timestamp
    title: v.string(),
    text: v.string(),
    visibility: policyVisibility, // "private" (Team only) or "public" (Organization-wide)
    expirationDate: v.optional(v.number()), // Optional expiration timestamp
  })
    .index("by_orga", ["orgaId"])
    .index("by_team", ["teamId"])
    .index("by_role", ["roleId"])
    .index("by_orga_and_visibility", ["orgaId", "visibility"])
    .index("by_team_and_date", ["teamId", "issuedDate"]),
});
