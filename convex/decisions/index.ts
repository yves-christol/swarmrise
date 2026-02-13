import { v } from"convex/values"
import { colorScheme } from "../orgas";
import { policyVisibilityType } from "../policies";
import { invitationStatusType } from "../invitations";

export const targetType = v.union(
  v.literal('orgas'),
  v.literal('teams'),
  v.literal('roles'),
  v.literal('members'),
  v.literal('policies'),
  v.literal('invitations'),
  v.literal('topics')
)

export const targetIdType = v.union(
  v.id('orgas'),
  v.id('teams'),
  v.id('roles'),
  v.id('members'),
  v.id('policies'),
  v.id('invitations'),
  v.id('messages'),
)

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
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    name: v.optional(v.string()),
  })),
});

// Role diff
const roleDiff = v.object({
  type: v.literal("Role"),
  before: v.optional(v.object({
    teamId: v.optional(v.id("teams")),
    parentTeamId: v.optional(v.id("teams")),
    title: v.optional(v.string()),
    roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    memberId: v.optional(v.id("members")),
  })),
  after: v.optional(v.object({
    teamId: v.optional(v.id("teams")),
    parentTeamId: v.optional(v.id("teams")),
    title: v.optional(v.string()),
    roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
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
    status: v.optional(invitationStatusType),
    sentDate: v.optional(v.number()),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    emitterMemberId: v.optional(v.id("members")),
    email: v.optional(v.string()),
    status: v.optional(invitationStatusType),
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
    visibility: v.optional(policyVisibilityType),
    expirationDate: v.optional(v.number()),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    teamId: v.optional(v.id("teams")),
    roleId: v.optional(v.id("roles")),
    issuedDate: v.optional(v.number()),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    visibility: v.optional(policyVisibilityType),
    expirationDate: v.optional(v.number()),
  })),
});

// Member diff
const memberDiff = v.object({
  type: v.literal("Member"),
  before: v.optional(v.object({
    firstname: v.optional(v.string()),
    surname: v.optional(v.string()),
    email: v.optional(v.string()),
  })),
  after: v.optional(v.object({
    firstname: v.optional(v.string()),
    surname: v.optional(v.string()),
    email: v.optional(v.string()),
  })),
});

// Topic diff
const topicDiff = v.object({
  type: v.literal("Topic"),
  before: v.optional(v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    phase: v.optional(v.string()),
    outcome: v.optional(v.string()),
  })),
  after: v.optional(v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    phase: v.optional(v.string()),
    outcome: v.optional(v.string()),
  })),
});

// Decision diff validator - discriminated union ensuring type safety
export const diffType = v.union(
  organizationDiff,
  teamDiff,
  roleDiff,
  invitationDiff,
  policyDiff,
  memberDiff,
  topicDiff
);

export const decisionType = v.object({
  orgaId: v.id('orgas'),
  authorEmail: v.string(),
  roleName: v.string(),
  teamName: v.string(),
  targetTeamId: v.optional(v.id('teams')),
  targetId: targetIdType,
  targetType: targetType,
  diff: diffType
})

export const decisionValidator = v.object({
  _id: v.id('decisions'),
  _creationTime: v.number(),
  ...decisionType.fields
})
