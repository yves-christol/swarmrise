import { v, Infer } from "convex/values";

// --- Channel ---

export const channelKindType = v.union(
  v.literal("orga"),
  v.literal("team"),
  v.literal("dm"),
);

export const channelType = v.object({
  orgaId: v.id("orgas"),
  kind: channelKindType,
  teamId: v.optional(v.id("teams")),
  // DM participants as separate indexed fields for efficient lookups
  // When creating a DM, store the lexicographically smaller member ID in dmMemberA
  dmMemberA: v.optional(v.id("members")),
  dmMemberB: v.optional(v.id("members")),
  isArchived: v.boolean(),
  archivedAt: v.optional(v.number()),
});

export const channelValidator = v.object({
  _id: v.id("channels"),
  _creationTime: v.number(),
  ...channelType.fields,
});

export type Channel = Infer<typeof channelValidator>;

// --- Embedded Tool (discriminated union) ---

export const embeddedToolType = v.union(
  v.object({
    type: v.literal("topic"),
    title: v.string(),
    description: v.string(),
    phase: v.union(
      v.literal("proposition"),
      v.literal("clarification"),
      v.literal("consent"),
      v.literal("resolved"),
    ),
    outcome: v.optional(v.union(
      v.literal("accepted"),
      v.literal("modified"),
      v.literal("withdrawn"),
    )),
    decisionId: v.optional(v.id("decisions")),
  }),
  v.object({
    type: v.literal("voting"),
    question: v.string(),
    options: v.array(v.object({
      id: v.string(),
      label: v.string(),
    })),
    mode: v.union(v.literal("single"), v.literal("approval"), v.literal("ranked")),
    isAnonymous: v.boolean(),
    deadline: v.optional(v.number()),
    isClosed: v.boolean(),
  }),
  v.object({
    type: v.literal("election"),
    roleTitle: v.string(),
    roleId: v.optional(v.id("roles")),
    teamId: v.id("teams"),
    phase: v.union(
      v.literal("nomination"),
      v.literal("discussion"),
      v.literal("change_round"),
      v.literal("consent"),
      v.literal("elected"),
    ),
    proposedCandidateId: v.optional(v.id("members")),
    electedMemberId: v.optional(v.id("members")),
    outcome: v.optional(v.union(
      v.literal("elected"),
      v.literal("no_election"),
    )),
    decisionId: v.optional(v.id("decisions")),
  }),
);

// --- Message ---

export const messageType = v.object({
  channelId: v.id("channels"),
  orgaId: v.id("orgas"),
  authorId: v.id("members"),
  text: v.string(),
  threadParentId: v.optional(v.id("messages")),
  embeddedTool: v.optional(embeddedToolType),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
});

export const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  ...messageType.fields,
});

export type Message = Infer<typeof messageValidator>;

// --- Channel Read Position ---

export const channelReadPositionType = v.object({
  channelId: v.id("channels"),
  memberId: v.id("members"),
  orgaId: v.id("orgas"),
  lastReadMessageId: v.optional(v.id("messages")),
  lastReadTimestamp: v.number(),
});

export const channelReadPositionValidator = v.object({
  _id: v.id("channelReadPositions"),
  _creationTime: v.number(),
  ...channelReadPositionType.fields,
});

export type ChannelReadPosition = Infer<typeof channelReadPositionValidator>;

// --- Topic Participation ---

export const topicClarificationType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  authorId: v.id("members"),
  question: v.string(),
});

export const topicClarificationValidator = v.object({
  _id: v.id("topicClarifications"),
  _creationTime: v.number(),
  ...topicClarificationType.fields,
});

export type TopicClarification = Infer<typeof topicClarificationValidator>;

export const topicAnswerType = v.object({
  clarificationId: v.id("topicClarifications"),
  orgaId: v.id("orgas"),
  authorId: v.id("members"),
  answer: v.string(),
});

export const topicAnswerValidator = v.object({
  _id: v.id("topicAnswers"),
  _creationTime: v.number(),
  ...topicAnswerType.fields,
});

export type TopicAnswer = Infer<typeof topicAnswerValidator>;

export const topicResponseType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  memberId: v.id("members"),
  response: v.union(
    v.literal("consent"),
    v.literal("objection"),
    v.literal("stand_aside"),
  ),
  reason: v.optional(v.string()),
});

export const topicResponseValidator = v.object({
  _id: v.id("topicResponses"),
  _creationTime: v.number(),
  ...topicResponseType.fields,
});

export type TopicResponse = Infer<typeof topicResponseValidator>;

// --- Vote ---

export const voteType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  memberId: v.id("members"),
  choices: v.array(v.string()),
});

export const voteValidator = v.object({
  _id: v.id("votes"),
  _creationTime: v.number(),
  ...voteType.fields,
});

export type Vote = Infer<typeof voteValidator>;
