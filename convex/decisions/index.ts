import { v, Infer } from "convex/values"
import { invitationStatusType } from "../invitations";

export const targetType = v.union(
  v.literal('orgas'),
  v.literal('teams'),
  v.literal('roles'),
  v.literal('members'),
  v.literal('policies'),
  v.literal('invitations'),
  v.literal('topics'),
  v.literal('elections')
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

// Color value in org diffs: current format is hex string, legacy format was {r,g,b} object
const colorValue = v.union(
  v.string(),
  v.object({ r: v.number(), g: v.number(), b: v.number() })
);

// Organization diff (colorScheme kept for historical records, never remove)
const organizationDiff = v.object({
  type: v.literal("Organization"),
  before: v.optional(v.object({
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colorScheme: v.optional(v.object({ primary: colorValue, secondary: colorValue })),
    accentColor: v.optional(v.string()),
    surfaceColorLight: v.optional(v.string()),
    surfaceColorDark: v.optional(v.string()),
  })),
  after: v.optional(v.object({
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colorScheme: v.optional(v.object({ primary: colorValue, secondary: colorValue })),
    accentColor: v.optional(v.string()),
    surfaceColorLight: v.optional(v.string()),
    surfaceColorDark: v.optional(v.string()),
  })),
});

// Team diff
const teamDiff = v.object({
  type: v.literal("Team"),
  before: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    name: v.optional(v.string()),
    color: v.optional(v.union(v.string(), v.null())),
  })),
  after: v.optional(v.object({
    orgaId: v.optional(v.id("orgas")),
    name: v.optional(v.string()),
    color: v.optional(v.union(v.string(), v.null())),
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
    iconKey: v.optional(v.string()),
  })),
  after: v.optional(v.object({
    teamId: v.optional(v.id("teams")),
    parentTeamId: v.optional(v.id("teams")),
    title: v.optional(v.string()),
    roleType: v.optional(v.union(v.literal("leader"), v.literal("secretary"), v.literal("referee"))),
    mission: v.optional(v.string()),
    duties: v.optional(v.array(v.string())),
    memberId: v.optional(v.id("members")),
    iconKey: v.optional(v.string()),
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
// Legacy fields (teamId, issuedDate, visibility, expirationDate) kept for historical decision records
const policyDiffFields = v.object({
  orgaId: v.optional(v.id("orgas")),
  roleId: v.optional(v.id("roles")),
  number: v.optional(v.number()),
  title: v.optional(v.string()),
  abstract: v.optional(v.string()),
  text: v.optional(v.string()),
  // Legacy fields preserved for backward compatibility with existing decision records
  teamId: v.optional(v.id("teams")),
  issuedDate: v.optional(v.number()),
  visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  expirationDate: v.optional(v.number()),
});

const policyDiff = v.object({
  type: v.literal("Policy"),
  before: v.optional(policyDiffFields),
  after: v.optional(policyDiffFields),
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

// Election diff
const electionDiff = v.object({
  type: v.literal("Election"),
  before: v.optional(v.object({
    roleTitle: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    phase: v.optional(v.string()),
    outcome: v.optional(v.string()),
    electedMemberId: v.optional(v.id("members")),
  })),
  after: v.optional(v.object({
    roleTitle: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    phase: v.optional(v.string()),
    outcome: v.optional(v.string()),
    electedMemberId: v.optional(v.id("members")),
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
  topicDiff,
  electionDiff
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

export type Decision = Infer<typeof decisionValidator>
