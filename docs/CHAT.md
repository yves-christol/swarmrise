# CHAT.md - Swarmrise Communication System

This document defines the architecture, data model, and implementation plan for the Swarmrise chat and communication system. It is maintained by Nadia, the chat system architect.

**Status:** Detailed implementation plan complete. No implementation started. Ready for Phase 1.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Channel System](#channel-system)
4. [Message Model](#message-model)
5. [Embedded Tools](#embedded-tools)
6. [Data Model](#data-model)
7. [Indexes and Query Patterns](#indexes-and-query-patterns)
8. [Access Control](#access-control)
9. [Integration with Governance](#integration-with-governance)
10. [Frontend Architecture](#frontend-architecture)
11. [Implementation Plan](#implementation-plan)
12. [Open Questions](#open-questions)
13. [Collaboration Notes](#collaboration-notes)

---

## Design Philosophy

The Swarmrise communication system is not a generic chat bolted onto an org tool. It is **communication where governance is native**. From the VISION document:

> Conversations happen within team context. Propositions, clarifications, and consent rounds are first-class communication patterns. Decisions and votes are threaded into the discussion that produced them.

### Guiding Principles

1. **Communication serves governance.** Every channel exists because an organizational unit exists. There is no channel that floats outside the structure. If a team is created, its channel appears. If a team is dissolved, its channel is archived.

2. **Embedded tools, not separate workflows.** A consent-based decision, a vote, or an election does not happen in a separate screen. It happens inside the conversation as an interactive message that all participants can see and act upon in context.

3. **Real-time by default.** Convex reactive queries power the entire system. Messages appear instantly for all participants. No polling. No "refresh to see new messages."

4. **Flat, not noisy.** Following the UX principles: notifications are non-intrusive, messages do not demand attention with sound or aggressive popups, and the system respects quiet hours. The chat is a tool for coordination, not a source of anxiety.

5. **Transparency.** Messages in organizational channels are visible to all members of that scope. There are no secret admin-only discussions within the organizational structure (DMs are separate and explicitly private). This mirrors the governance principle: transparency is the immune system.

6. **Low complexity.** The set of concepts is small: channels, messages, threads, embedded tools, and emoji reactions. No statuses, no stories, no bots marketplace. These can be considered later, but the initial system stays lean.

---

## Architecture Overview

```
+---------------------------------------------------+
|                  Organization                      |
|                                                    |
|  +---------------------------------------------+  |
|  |            Orga Channel                      |  |
|  |  (all members, general communication)        |  |
|  +---------------------------------------------+  |
|                                                    |
|  +-------------------+  +---------------------+   |
|  |  Team A Channel   |  |  Team B Channel     |   |
|  |  (team A members) |  |  (team B members)   |   |
|  +-------------------+  +---------------------+   |
|                                                    |
|  +-------------------+                             |
|  |  Team C Channel   |                             |
|  |  (team C members) |                             |
|  +-------------------+                             |
|                                                    |
|  Direct Messages (1:1 between any two members)     |
+---------------------------------------------------+
```

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Channel** | A communication space tied to an organizational unit (orga or team). Created automatically when the unit is created. |
| **Message** | A single entry in a channel. Can be plain text or contain an embedded tool. |
| **Thread** | A reply chain attached to a specific message. Keeps discussions focused without cluttering the main channel flow. |
| **Embedded Tool** | An interactive widget inside a message: a topic/consent decision, a vote, or an election. |
| **Direct Message** | A private 1:1 conversation between two members within the same orga. |

---

## Channel System

### Channel Types

#### 1. Orga Channel

- **Created automatically** when an organization is created.
- **Accessible by** all members of the organization.
- **Purpose:** General announcements, cross-team discussions, org-wide coordination.
- **Cannot be deleted** while the organization exists.
- **One per organization.** There is no concept of multiple general channels.

#### 2. Team Channel

- **Created automatically** when a team is created.
- **Accessible by** members who hold at least one role in that team.
- **Purpose:** Team-specific coordination, topic discussions, consent decisions.
- **Archived** when the team is deleted. Messages remain readable but no new messages can be posted.
- **One per team.** The team IS the channel; there is no separation between the concepts.

#### 3. Direct Messages

- **Created on demand** when two members within the same orga initiate a conversation.
- **Accessible by** exactly the two participants.
- **Purpose:** Private coordination between individuals.
- **Scoped to the orga.** If two people are members of different orgas, they have separate DM threads per orga. This prevents data leakage across tenants.

### Channel Lifecycle

| Organizational Event | Channel Effect |
|---------------------|----------------|
| Orga created | Orga channel created |
| Team created | Team channel created |
| Team deleted | Team channel archived (read-only) |
| Member added to team (role assigned) | Member gains access to team channel |
| Member removed from team (role unassigned) | Member loses access to team channel |
| Member removed from orga | Member loses access to all channels in that orga |

### Why Not Custom Channels?

Custom channels (user-created channels with arbitrary membership) are intentionally excluded from the initial design. The reasons:

1. **Governance alignment.** Swarmrise channels mirror the organizational structure. A channel without a structural anchor (team or orga) breaks the mental model and introduces informal power structures.
2. **Simplicity.** Custom channels require invitation management, naming, discovery, and moderation. These are significant features with their own complexity.
3. **Progressive adoption.** If custom channels prove necessary, they can be added later as a team-managed feature (a team creates sub-channels for specific workstreams). This keeps them within the governance model.

---

## Message Model

### Plain Messages

A message is a text entry with an author, a timestamp, and optional thread replies.

```
+------------------------------------------+
| [Avatar]  Member Name          2:34 PM   |
|                                          |
| Message text content goes here. It can   |
| contain multiple lines.                  |
|                                          |
|           [3 replies]  [Reply]           |
+------------------------------------------+
```

### Messages with Embedded Tools

A message can contain an embedded tool. When it does, the tool renders as an interactive widget below the message text.

```
+------------------------------------------+
| [Avatar]  Member Name          2:34 PM   |
|                                          |
| I propose we adopt weekly standups.      |
|                                          |
| +--------------------------------------+ |
| |  TOPIC: Weekly Standups              | |
| |  Phase: Clarification                | |
| |                                      | |
| |  [Ask a question]                    | |
| |                                      | |
| |  Q: "What time zone?" - Alice        | |
| |  A: "We'll rotate" - Bob             | |
| +--------------------------------------+ |
|                                          |
|           [3 replies]  [Reply]           |
+------------------------------------------+
```

### Message Content Structure

Messages use a simple format: plain text with an optional embedded tool. No rich text editor, no markdown rendering in v1. This keeps things simple and avoids the complexity of a WYSIWYG editor. Markdown support can be added incrementally.

---

## Embedded Tools

Embedded tools are the governance power of Swarmrise chat. They turn a conversation into a decision-making space.

### Tool System Architecture

Each embedded tool is a **discriminated union variant** in the message schema. The tool type determines which interactive UI component renders inside the message. This follows the same pattern used for Decision diffs and Notification payloads elsewhere in the codebase.

Adding a new tool type means:
1. Add the variant to the `embeddedTool` union in `convex/chat/index.ts`
2. Create the corresponding React component in `src/components/ChatTools/`
3. Add the tool-specific mutations in `convex/chat/functions.ts`

### Tool 1: Topic (Consent-Based Decision)

The topic tool implements the governance sequence described in VISION.md. It is the most important embedded tool because it digitizes the core decision-making process.

#### Phases

```
Proposition --> Clarification --> Consent --> [Resolved]
```

**Phase 1: Proposition**
- The author writes a proposal as the message text.
- The embedded tool shows the proposition clearly formatted.
- Status: "Open for clarification"

**Phase 2: Clarification**
- Any channel member can ask a clarifying question.
- The proposer (or any member) can answer questions.
- Questions and answers are displayed inside the tool widget.
- Crucially: this is NOT the time for opinions. The UI should make this clear. Clarification questions seek to understand the proposal, not to debate it.
- The proposer (or the team leader/facilitator) advances to the consent phase when clarification is sufficient.

**Phase 3: Consent**
- Each member with access to the channel can express:
  - **Consent**: "I can live with this. It is safe enough to try." (Consent is not agreement.)
  - **Objection**: A reasoned, constructive objection. The objector must explain why the proposal is unsafe or harmful.
  - **Stand aside**: "I have reservations but will not block the group."
- Objections are displayed with their reasoning.
- If no objections remain (all resolved or withdrawn), the proposal passes.
- The outcome is recorded as a Decision in the audit trail.

**Phase 4: Resolved**
- The tool shows the outcome: accepted, modified (if objections led to changes), or withdrawn.
- The tool becomes read-only.
- A Decision record is created with the full history.

#### Topic Tool Data

```typescript
topicTool: {
  type: "topic",
  title: string,
  description: string,           // The proposal text
  phase: "proposition" | "clarification" | "consent" | "resolved",
  outcome: "accepted" | "modified" | "withdrawn" | null,
  clarifications: Array<{
    questionerId: Id<"members">,
    question: string,
    answers: Array<{
      answererId: Id<"members">,
      answer: string,
      timestamp: number,
    }>,
    timestamp: number,
  }>,
  responses: Array<{
    memberId: Id<"members">,
    response: "consent" | "objection" | "stand_aside",
    reason: string | null,        // Required for objections
    timestamp: number,
  }>,
  resolvedAt: number | null,
  decisionId: Id<"decisions"> | null,  // Link to audit trail
}
```

### Tool 2: Voting

The voting tool collects preferences among multiple options. Unlike the topic tool, it does not follow the consent model -- it is a preference-gathering mechanism.

#### Voting Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Single choice** | Pick one option | Simple polls, yes/no questions |
| **Approval** | Pick any number of options | "Which of these work for you?" |
| **Ranked** | Order options by preference | Prioritization, scheduling |

#### Voting Tool Data

```typescript
votingTool: {
  type: "voting",
  question: string,
  options: Array<{
    id: string,       // Unique within this vote
    label: string,
  }>,
  mode: "single" | "approval" | "ranked",
  isAnonymous: boolean,
  deadline: number | null,          // Optional deadline timestamp
  votes: Array<{
    memberId: Id<"members">,
    choices: string[],              // Option IDs, ordered for ranked mode
    timestamp: number,
  }>,
  isClosed: boolean,
  closedAt: number | null,
}
```

### Tool 3: Candidateless Election

The candidateless election is a sociocratic process where no one declares candidacy. Instead, members nominate others for a role, followed by a discussion and consent round.

#### Election Phases

```
Nomination --> Discussion --> Change Round --> Consent --> [Elected]
```

**Phase 1: Nomination**
- Each member nominates one person for the role and gives a reason.
- Nominations are hidden until all participants have nominated (to prevent influence).

**Phase 2: Discussion**
- All nominations are revealed.
- Members discuss the nominations openly.
- The facilitator summarizes the discussion.

**Phase 3: Change Round**
- After hearing the discussion, each member may change their nomination or keep it.
- Changes are visible immediately.

**Phase 4: Consent**
- The facilitator proposes the candidate with the most nominations (or a synthesized choice).
- Members consent or object, following the same pattern as the topic tool.

**Phase 5: Elected**
- The elected person is recorded.
- A Decision record is created.
- Optionally, the role assignment can be automated (with confirmation).

#### Election Tool Data

```typescript
electionTool: {
  type: "election",
  roleTitle: string,
  roleId: Id<"roles"> | null,        // The role being filled
  teamId: Id<"teams">,
  phase: "nomination" | "discussion" | "change_round" | "consent" | "elected",
  nominations: Array<{
    nominatorId: Id<"members">,
    nomineeId: Id<"members">,
    reason: string,
    changedInRound: boolean,          // True if changed during change round
    timestamp: number,
  }>,
  proposedCandidateId: Id<"members"> | null,  // Set by facilitator before consent
  consentResponses: Array<{
    memberId: Id<"members">,
    response: "consent" | "objection" | "stand_aside",
    reason: string | null,
    timestamp: number,
  }>,
  electedMemberId: Id<"members"> | null,
  outcome: "elected" | "no_election" | null,
  resolvedAt: number | null,
  decisionId: Id<"decisions"> | null,
}
```

### Extensibility

The embedded tool system is a **discriminated union**. Adding a new tool means adding a new variant to the union. The frontend renders the correct component based on the `type` field. This pattern is already proven in the codebase for Decision diffs and Notification payloads.

Future tools under consideration:
- **Checklist tool** - Collaborative checklist within a message (for meeting agendas)
- **Availability tool** - Find common availability for scheduling
- **Retrospective tool** - Structured retrospective with keep/stop/start categories

---

## Emoji Reactions

Emoji reactions allow members to respond to any message with a curated set of emojis. This provides lightweight feedback without cluttering the conversation with full messages.

### Design

- **Curated palette**: 12 commonly-used emojis (thumbs up/down, heart, smile, laugh, thinking, party, folded hands, clapping, eyes, check mark, cross mark). No full emoji picker -- keeps complexity low.
- **Toggle behavior**: Clicking an emoji badge toggles the user's reaction (add if not present, remove if already reacted). Same-emoji from the same user is idempotent.
- **Real-time**: Reactions are stored in a dedicated `reactions` table and fetched via Convex reactive queries. No polling.
- **Batch fetching**: The `getReactionsForMessages` query accepts a batch of message IDs and returns aggregated reactions (grouped by emoji, with counts, "reacted" flag, and member name tooltips).
- **Placement**: Reaction badges appear below the message text. A "React" text button appears next to the "Reply" button on hover. Existing reaction badges also have an inline "add" button (smiley icon) on hover.
- **Thread support**: Reactions work on both top-level messages and thread replies.

### Data Model

```typescript
// reactions table
{
  messageId: Id<"messages">,
  orgaId: Id<"orgas">,
  memberId: Id<"members">,
  emoji: string, // Unicode emoji character
}
```

**Indexes:**
- `by_message` -- fetch all reactions for a message
- `by_message_and_member_and_emoji` -- fast toggle (upsert/delete)
- `by_orga` -- multi-tenant cleanup

### API

| Function | Type | Description |
|----------|------|-------------|
| `toggleReaction` | mutation | Toggle a reaction on a message (add/remove) |
| `getReactionsForMessages` | query | Batch fetch aggregated reactions for multiple messages |

---

## Data Model

Following the established Swarmrise patterns exactly: `entityType` for fields, `entityValidator` for full document, `by_orga` indexes for multi-tenant isolation, `requireAuthAndMembership` for access control.

### channels table

```typescript
// convex/chat/index.ts

export const channelKindType = v.union(
  v.literal("orga"),     // Organization-wide channel
  v.literal("team"),     // Team-specific channel
  v.literal("dm"),       // Direct message between two members
);

export const channelType = v.object({
  orgaId: v.id("orgas"),
  kind: channelKindType,
  teamId: v.optional(v.id("teams")),         // Set for team channels
  dmParticipants: v.optional(v.array(v.id("members"))),  // Set for DM channels (exactly 2)
  isArchived: v.boolean(),                    // True when source entity is deleted
  archivedAt: v.optional(v.number()),
});

export const channelValidator = v.object({
  _id: v.id("channels"),
  _creationTime: v.number(),
  ...channelType.fields,
});
```

### messages table

```typescript
// Embedded tool discriminated union
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

export const messageType = v.object({
  channelId: v.id("channels"),
  orgaId: v.id("orgas"),                     // Denormalized for efficient queries
  authorId: v.id("members"),
  text: v.string(),
  threadParentId: v.optional(v.id("messages")),  // If this is a thread reply
  embeddedTool: v.optional(embeddedToolType),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
});

export const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  ...messageType.fields,
});
```

### Tool participation tables

Embedded tool participation data (clarifications, votes, nominations, consent responses) is stored in separate tables rather than nested inside the message document. This is critical for two reasons:

1. **Concurrency.** Multiple members may vote or respond simultaneously. Storing responses inside the message document would create write conflicts. Separate tables allow concurrent writes.
2. **Query efficiency.** "Has this member already voted?" is a simple indexed lookup, not a scan through a nested array.

#### topicClarifications table

```typescript
export const topicClarificationType = v.object({
  messageId: v.id("messages"),       // The message containing the topic tool
  orgaId: v.id("orgas"),
  questionerId: v.id("members"),
  question: v.string(),
});

// Answers to clarification questions
export const topicAnswerType = v.object({
  clarificationId: v.id("topicClarifications"),
  orgaId: v.id("orgas"),
  answererId: v.id("members"),
  answer: v.string(),
});
```

#### topicResponses table

```typescript
export const topicResponseType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  memberId: v.id("members"),
  response: v.union(
    v.literal("consent"),
    v.literal("objection"),
    v.literal("stand_aside"),
  ),
  reason: v.optional(v.string()),    // Required for objections
});
```

#### votes table

```typescript
export const voteType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  memberId: v.id("members"),
  choices: v.array(v.string()),      // Option IDs, ordered for ranked mode
});
```

#### electionNominations table

```typescript
export const electionNominationType = v.object({
  messageId: v.id("messages"),
  orgaId: v.id("orgas"),
  nominatorId: v.id("members"),
  nomineeId: v.id("members"),
  reason: v.string(),
  changedInRound: v.boolean(),
});
```

#### electionResponses table

```typescript
export const electionResponseType = v.object({
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
```

### channelReadPositions table

Tracks the last message each member has read in each channel. Used for unread counts and "new messages" indicators.

```typescript
export const channelReadPositionType = v.object({
  channelId: v.id("channels"),
  memberId: v.id("members"),
  orgaId: v.id("orgas"),
  lastReadMessageId: v.optional(v.id("messages")),
  lastReadTimestamp: v.number(),
});
```

---

## Indexes and Query Patterns

### channels table indexes

| Index | Fields | Use Case |
|-------|--------|----------|
| `by_orga` | `[orgaId]` | All channels in an organization |
| `by_orga_and_kind` | `[orgaId, kind]` | Find the orga channel, list team channels |
| `by_team` | `[teamId]` | Find channel for a specific team |
| `by_dm_participants` | `[orgaId, dmParticipants]` | Find DM between two members |

### messages table indexes

| Index | Fields | Use Case |
|-------|--------|----------|
| `by_channel` | `[channelId]` | All messages in a channel (paginated) |
| `by_channel_and_time` | `[channelId, _creationTime]` | Messages in chronological order |
| `by_thread_parent` | `[threadParentId]` | All replies in a thread |
| `by_orga` | `[orgaId]` | Org-wide message queries (search, admin) |
| `by_author` | `[authorId]` | Messages by a specific member |

### Tool participation indexes

| Table | Index | Fields | Use Case |
|-------|-------|--------|----------|
| topicClarifications | `by_message` | `[messageId]` | All clarifications for a topic |
| topicAnswers | `by_clarification` | `[clarificationId]` | All answers to a question |
| topicResponses | `by_message` | `[messageId]` | All consent responses |
| topicResponses | `by_message_and_member` | `[messageId, memberId]` | Check if member responded |
| votes | `by_message` | `[messageId]` | All votes for a poll |
| votes | `by_message_and_member` | `[messageId, memberId]` | Check if member voted |
| electionNominations | `by_message` | `[messageId]` | All nominations |
| electionNominations | `by_message_and_nominator` | `[messageId, nominatorId]` | Member's nomination |
| electionResponses | `by_message` | `[messageId]` | All election consent responses |
| channelReadPositions | `by_channel_and_member` | `[channelId, memberId]` | Read position lookup |
| channelReadPositions | `by_member` | `[memberId]` | All read positions for a member |

### Key Query Patterns

**List messages in a channel (paginated, newest first):**
```typescript
ctx.db.query("messages")
  .withIndex("by_channel_and_time", q => q.eq("channelId", channelId))
  .order("desc")
  .paginate(paginationOpts)
```

**Get unread count for a channel:**
```typescript
const readPosition = await ctx.db.query("channelReadPositions")
  .withIndex("by_channel_and_member", q =>
    q.eq("channelId", channelId).eq("memberId", memberId)
  )
  .unique();

const unreadMessages = await ctx.db.query("messages")
  .withIndex("by_channel_and_time", q =>
    q.eq("channelId", channelId).gt("_creationTime", readPosition?.lastReadTimestamp ?? 0)
  )
  .collect();
// Return unreadMessages.length
```

**Find channels a member can access:**
```typescript
// 1. Always include the orga channel
const orgaChannel = await ctx.db.query("channels")
  .withIndex("by_orga_and_kind", q => q.eq("orgaId", orgaId).eq("kind", "orga"))
  .unique();

// 2. Find team channels where member has a role
const member = await ctx.db.get(memberId);
const teamIds = new Set<Id<"teams">>();
for (const roleId of member.roleIds) {
  const role = await ctx.db.get(roleId);
  if (role) teamIds.add(role.teamId);
}
const teamChannels = [];
for (const teamId of teamIds) {
  const channel = await ctx.db.query("channels")
    .withIndex("by_team", q => q.eq("teamId", teamId))
    .unique();
  if (channel && !channel.isArchived) teamChannels.push(channel);
}

// 3. Find DM channels
const dmChannels = await ctx.db.query("channels")
  .withIndex("by_orga_and_kind", q => q.eq("orgaId", orgaId).eq("kind", "dm"))
  .filter(q => q.or(
    q.eq(q.field("dmParticipants[0]"), memberId),
    q.eq(q.field("dmParticipants[1]"), memberId),
  ))
  .collect();
```

Note: The DM participant lookup is not perfectly indexed. If DM volume becomes large, a dedicated `channelMemberships` table may be needed. For the initial implementation, the number of DMs per member will be small enough that filter-on-index is acceptable.

---

## Access Control

Every chat operation verifies authentication and membership before proceeding.

### Channel Access Rules

| Channel Kind | Who Can Read | Who Can Write |
|-------------|-------------|---------------|
| **orga** | All orga members | All orga members |
| **team** | Members holding a role in the team | Members holding a role in the team |
| **dm** | The two DM participants | The two DM participants |
| **archived** | Anyone who had access (read-only) | No one |

### Enforcement

```typescript
// In every chat query/mutation:
async function requireChannelAccess(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<"channels">,
): Promise<{ channel: Channel; member: Member }> {
  const channel = await ctx.db.get(channelId);
  if (!channel) throw new Error("Channel not found");

  const member = await requireAuthAndMembership(ctx, channel.orgaId);

  if (channel.kind === "team") {
    // Verify member has a role in this team
    const hasAccess = member.roleIds.some(async roleId => {
      const role = await ctx.db.get(roleId);
      return role?.teamId === channel.teamId;
    });
    if (!hasAccess) throw new Error("Not a member of this team");
  }

  if (channel.kind === "dm") {
    if (!channel.dmParticipants?.includes(member._id)) {
      throw new Error("Not a participant in this conversation");
    }
  }

  return { channel, member };
}
```

### Write Restrictions

- Archived channels reject all write operations.
- Embedded tool mutations verify the tool phase (e.g., cannot vote during clarification phase).
- Only the proposer or a facilitator (leader/secretary) can advance tool phases.

---

## Integration with Governance

### Topic Tool and Decisions

When a topic tool reaches the "resolved" phase with outcome "accepted" or "modified":
1. A Decision record is created in the `decisions` table.
2. The Decision's `diff` field records the proposal and outcome.
3. The Decision's `targetType` is extended to include `"topics"`.
4. The `decisionId` is stored on the topic tool for cross-reference.

This means every governance decision made through chat is captured in the same audit trail as structural changes (role assignments, team modifications, etc.).

### Election Tool and Role Assignments

When an election concludes with an elected candidate:
1. A Decision record is created.
2. Optionally (with facilitator confirmation), the elected member is automatically assigned to the role.
3. This triggers the existing role assignment flow, including the linked role pattern for leaders.

### Channel Context in Decisions

Decisions created through chat tools include the channel context, enabling the Decision Journal to link back to the original conversation.

### Notifications

Chat-originated events integrate with the existing notification system:
- New messages in channels a member belongs to can trigger `message` category notifications.
- Topic tools in the consent phase can trigger high-priority notifications for eligible participants.
- Election nominations can trigger notifications for nominees.

The existing `messagePayload` in `convex/notifications/index.ts` already defines the shape for message notifications. It should be updated to use `v.id("messages")` once the messages table exists.

---

## Frontend Architecture

### Where Chat Lives in the UI

The chat interface appears as a **panel** that coexists with the existing visual/manage views. It does not replace the focus navigation system. Instead, it complements it:

- **Channel list** appears in a sidebar or panel when the user is in an orga context.
- **Chat panel** opens alongside the current view (not as a full-page replacement).
- **Team context integration**: When focused on a team in the visual/manage view, the team's channel is highlighted or auto-selected in the chat panel.

This design follows the principle of not disrupting the existing spatial navigation. The chat is additive.

### Component Structure

```
src/components/Chat/
  ChatPanel/             -- Main chat container (sidebar or panel)
    index.tsx
  ChannelList/           -- List of accessible channels with unread counts
    index.tsx
    ChannelListItem.tsx
  MessageList/           -- Scrollable message list with pagination
    index.tsx
    MessageItem.tsx
  MessageInput/          -- Text input with tool attachment options
    index.tsx
  ThreadPanel/           -- Thread view (replies to a message)
    index.tsx
  ChatTools/             -- Embedded tool renderers
    TopicTool.tsx
    VotingTool.tsx
    ElectionTool.tsx
```

### State Management

Chat state follows the existing OrgaStore pattern:
- Selected channel is stored in a ChatStore context.
- Messages are loaded via `useQuery` with pagination.
- Unread counts are reactive queries.
- Thread panel state is local to the component.

### Real-time Behavior

Convex's reactive queries handle all real-time updates:
- New messages appear instantly in the message list.
- Unread counts update immediately.
- Embedded tool state changes (new votes, consent responses) propagate to all viewers in real-time.
- Typing indicators are NOT included in v1 (they add complexity with minimal governance value).

### Responsive Layout

| Viewport | Chat Layout |
|----------|-------------|
| Desktop (>1024px) | Side panel alongside visual/manage view |
| Tablet (768-1024px) | Overlapping panel, toggleable |
| Mobile (<768px) | Full-screen view, replacing visual/manage |

---

## Implementation Plan

This section is the authoritative, step-by-step build plan for the chat system. Each phase has clear deliverables, exact file paths, function signatures, dependencies on prior phases, and acceptance criteria. No phase should be started until its dependencies are complete.

### Notation

- **[BACKEND]** = Convex server-side work (`convex/` directory)
- **[FRONTEND]** = React client-side work (`src/` directory)
- **[SCHEMA]** = Changes to `convex/schema.ts` (requires `bun run dev:backend` restart)
- **[HOOK]** = Modification to an existing mutation/function to integrate chat
- **[I18N]** = Translation keys to add (6 locales: en, fr, es, it, uk, zh-TW)
- **[BLOCKER]** = Must be resolved before starting the step (open question or collaborator input)

---

### Phase 1: Foundation -- Schema, Channels, and Plain Messages

**Goal:** An orga member can open a chat panel, see channels they have access to, send plain text messages, and see messages from others in real-time.

**Dependencies:** None (first phase).

**Blockers to resolve before starting:**
- [BLOCKER/Karl] DM participant indexing strategy (see Open Questions). **Decision needed before DM fields are added to the channels table schema.** However, Phase 1 does NOT implement DMs, so the `dmParticipants` / `dmMemberA`+`dmMemberB` decision can be deferred to Phase 2. For Phase 1, define the channel schema with the DM fields as optional placeholders using the approach Karl recommends. If no answer yet, use `dmMemberA`/`dmMemberB` as separate fields (easier to index) with a TODO comment.
- [BLOCKER/Monica] Chat panel placement (right-side panel vs. left sidebar vs. bottom drawer). **Must be resolved before frontend layout work begins.** If no answer yet, default to right-side panel as it is the most common pattern and does not conflict with the existing left-side OrgaSelector.

#### Step 1.1: Type Definitions [BACKEND]

**File:** `convex/chat/index.ts` (new file)

Define all validators following the existing pattern (`entityType` for fields, `entityValidator` for full document with `_id` and `_creationTime`):

```typescript
// convex/chat/index.ts
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
  teamId: v.optional(v.id("teams")),          // Set when kind === "team"
  // DM participants as separate indexed fields (Karl decision pending)
  dmMemberA: v.optional(v.id("members")),      // Set when kind === "dm"
  dmMemberB: v.optional(v.id("members")),      // Set when kind === "dm"
  isArchived: v.boolean(),
  archivedAt: v.optional(v.number()),
});

export const channelValidator = v.object({
  _id: v.id("channels"),
  _creationTime: v.number(),
  ...channelType.fields,
});

export type Channel = Infer<typeof channelValidator>;

// --- Message ---

export const embeddedToolType = v.union(
  v.object({ type: v.literal("topic"),    /* ... fields from Data Model section */ }),
  v.object({ type: v.literal("voting"),   /* ... fields from Data Model section */ }),
  v.object({ type: v.literal("election"), /* ... fields from Data Model section */ }),
);

export const messageType = v.object({
  channelId: v.id("channels"),
  orgaId: v.id("orgas"),                       // Denormalized
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
```

**Implementation notes:**
- The `embeddedToolType` union should contain all three tool variants with their full field definitions from the Data Model section, even though Phase 1 does not implement tools. This avoids a schema migration later. All tool-specific fields should be `v.optional()` where appropriate.
- `threadParentId` is defined now but queried in Phase 2.

**Acceptance criteria:**
- File compiles with no TypeScript errors.
- Types are exported and usable from `convex/chat/index.ts`.

#### Step 1.2: Schema Registration [SCHEMA]

**File:** `convex/schema.ts`

Add imports and table definitions:

```typescript
import { channelType } from "./chat";
import { messageType } from "./chat";
import { channelReadPositionType } from "./chat";
```

Add to the schema:

```typescript
// Chat system tables
channels: defineTable({ ...channelType.fields })
  .index("by_orga", ["orgaId"])
  .index("by_orga_and_kind", ["orgaId", "kind"])
  .index("by_team", ["teamId"])
  .index("by_dm_members", ["orgaId", "dmMemberA", "dmMemberB"]),

messages: defineTable({ ...messageType.fields })
  .index("by_channel_and_time", ["channelId", "_creationTime"])
  .index("by_thread_parent", ["threadParentId"])
  .index("by_orga", ["orgaId"])
  .index("by_author", ["authorId"]),

channelReadPositions: defineTable({ ...channelReadPositionType.fields })
  .index("by_channel_and_member", ["channelId", "memberId"])
  .index("by_member", ["memberId"]),
```

**Implementation notes:**
- The `by_dm_members` index uses `orgaId` + `dmMemberA` + `dmMemberB`. When creating a DM, always store the lexicographically smaller member ID in `dmMemberA` to ensure consistent lookups.
- Index `by_channel_and_time` uses `_creationTime` as the second field. Convex orders by `_creationTime` within the same `channelId`, enabling efficient paginated queries in chronological order.
- The `by_thread_parent` index is needed in Phase 2 but defined now to avoid a migration.

**Acceptance criteria:**
- `bun run dev:backend` starts without errors.
- Convex dashboard shows the three new tables with their indexes.

#### Step 1.3: Channel Access Control Helper [BACKEND]

**File:** `convex/chat/access.ts` (new file)

Create a reusable access control function used by all chat queries and mutations:

```typescript
// convex/chat/access.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireAuthAndMembership } from "../utils";
import type { Channel } from "./index";
import type { Member } from "../members";

/**
 * Verify that the authenticated user has access to a channel.
 * Returns the channel and the member document.
 * Throws if access is denied.
 */
export async function requireChannelAccess(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<"channels">,
): Promise<{ channel: Channel; member: Member }> {
  const channel = await ctx.db.get(channelId);
  if (!channel) throw new Error("Channel not found");

  const member = await requireAuthAndMembership(ctx, channel.orgaId);

  if (channel.kind === "team") {
    if (!channel.teamId) throw new Error("Team channel has no teamId");
    const hasAccess = await memberHasTeamAccess(ctx, member, channel.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");
  }

  if (channel.kind === "dm") {
    const isParticipant =
      channel.dmMemberA === member._id || channel.dmMemberB === member._id;
    if (!isParticipant) throw new Error("Not a participant in this conversation");
  }

  return { channel, member };
}

/**
 * Check if a member has at least one role in a team.
 */
export async function memberHasTeamAccess(
  ctx: QueryCtx | MutationCtx,
  member: Member,
  teamId: Id<"teams">,
): Promise<boolean> {
  for (const roleId of member.roleIds) {
    const role = await ctx.db.get(roleId);
    if (role && role.teamId === teamId) return true;
  }
  return false;
}

/**
 * Require that a channel is not archived (for write operations).
 */
export function requireNotArchived(channel: Channel): void {
  if (channel.isArchived) {
    throw new Error("This channel is archived and read-only");
  }
}
```

**Implementation notes:**
- The `memberHasTeamAccess` function iterates through the member's `roleIds` array. Since a member typically has 1-5 roles, this is fast. If this ever becomes a bottleneck, it could be replaced with a dedicated index lookup, but that optimization is premature.
- These helpers are intentionally in a separate file from `functions.ts` to keep the function file focused on query/mutation definitions.

**Acceptance criteria:**
- File compiles. Types align with existing `Member` and new `Channel` types.

#### Step 1.4: Core Chat Functions [BACKEND]

**File:** `convex/chat/functions.ts` (new file)

Implement the following queries and mutations:

**Queries:**

1. `getChannelsForMember(args: { orgaId })` -- Returns all channels the authenticated member can access in the orga. Always includes the orga channel. Includes team channels for teams where the member has roles. Excludes DMs (Phase 2). Returns channels sorted: orga first, then team channels alphabetically by team name.

2. `getMessages(args: { channelId, paginationOpts })` -- Returns paginated messages in a channel, newest first. Uses `ctx.db.query("messages").withIndex("by_channel_and_time", ...).order("desc").paginate(paginationOpts)`. Calls `requireChannelAccess` before returning data. Returns messages with author member data denormalized (fetch author's `firstname`, `surname`, `pictureURL` for each message).

3. `getUnreadCounts(args: { orgaId })` -- Returns an array of `{ channelId, unreadCount }` for all channels the member has access to. Uses `channelReadPositions` to determine the last read timestamp, then counts messages after that timestamp. For channels with no read position, all messages are unread.

**Mutations:**

4. `sendMessage(args: { channelId, text })` -- Creates a message. Calls `requireChannelAccess` + `requireNotArchived`. Sets `authorId` to the authenticated member, `orgaId` from the channel, `isEdited: false`. Returns the new message `_id`.

5. `markAsRead(args: { channelId })` -- Updates (or creates) the `channelReadPosition` for the authenticated member in the given channel. Sets `lastReadTimestamp` to `Date.now()`. Uses `withIndex("by_channel_and_member")` to find existing position.

**Implementation notes for `getMessages`:**
- Convex's `paginate()` returns a `PaginationResult` with `page`, `isDone`, and `continueCursor`. The frontend will use `usePaginatedQuery` from `convex/react`.
- To denormalize author data, fetch each unique `authorId` in the page and attach member info. Use a Map to avoid re-fetching the same author multiple times within a page.
- Pagination uses Convex cursor-based pagination (not offset). This is the native approach and handles concurrent writes correctly.

**Implementation notes for `getUnreadCounts`:**
- This query runs on every channel the member has access to. For a member in 1 orga channel + 3 team channels, that is 4 count queries. Each count query reads messages after the last read timestamp. If a channel has thousands of messages, `.collect()` followed by `.length` would be expensive. Instead, use a streaming approach: query messages after the timestamp and take at most N+1 (where N is a display cap, e.g., "99+"). This caps the work per channel.
- Alternatively, if Convex provides a `.count()` method on filtered queries, use that. Check Convex docs. If not, cap at 100 and display "99+".

**Acceptance criteria:**
- All 5 functions compile with `args` and `returns` validators.
- `getChannelsForMember` correctly filters team channels by member role membership.
- `getMessages` returns paginated results with author data.
- `sendMessage` rejects writes to archived channels and channels the member cannot access.
- `markAsRead` creates or updates the read position.

#### Step 1.5: Channel Auto-Creation Hooks [HOOK]

**File:** `convex/orgas/functions.ts` -- modify `createOrganization`

After the organization is created (after the `await ctx.db.insert("orgas", ...)` line), insert the orga channel:

```typescript
// Auto-create orga channel
await ctx.db.insert("channels", {
  orgaId,
  kind: "orga",
  isArchived: false,
});
```

**File:** `convex/teams/functions.ts` -- modify `createTeam`

After the team is created (after `await ctx.db.insert("teams", ...)`), insert the team channel:

```typescript
// Auto-create team channel
await ctx.db.insert("channels", {
  orgaId: args.orgaId,
  kind: "team",
  teamId,
  isArchived: false,
});
```

**File:** `convex/teams/functions.ts` -- modify `deleteTeam`

Before deleting the team (or after), archive the team channel instead of deleting it:

```typescript
// Archive team channel (messages remain readable)
const teamChannel = await ctx.db
  .query("channels")
  .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
  .unique();
if (teamChannel) {
  await ctx.db.patch(teamChannel._id, {
    isArchived: true,
    archivedAt: Date.now(),
  });
}
```

**File:** `convex/orgas/functions.ts` -- modify `deleteOrganization`

When deleting an organization, delete all channels and their messages:

```typescript
// Delete all chat data for this organization
const orgChannels = await ctx.db
  .query("channels")
  .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
  .collect();
for (const channel of orgChannels) {
  // Delete messages in channel
  const channelMessages = await ctx.db
    .query("messages")
    .withIndex("by_channel_and_time", (q) => q.eq("channelId", channel._id))
    .collect();
  for (const msg of channelMessages) {
    await ctx.db.delete(msg._id);
  }
  // Delete read positions
  const readPositions = await ctx.db
    .query("channelReadPositions")
    .withIndex("by_channel_and_member", (q) => q.eq("channelId", channel._id))
    .collect();
  for (const rp of readPositions) {
    await ctx.db.delete(rp._id);
  }
  await ctx.db.delete(channel._id);
}
```

**Implementation notes:**
- The orga deletion code currently deletes teams, roles, decisions, invitations, members, then the orga itself. Chat data deletion should happen before team deletion (since team channels reference teams).
- For the demo data creation script (`convex/dataTest/createDemoOrga.ts`), also create channels for the demo orga and its teams so that the chat panel is testable immediately.

**Acceptance criteria:**
- Creating an orga via the UI automatically creates a channel with `kind: "orga"`.
- Creating a team automatically creates a channel with `kind: "team"` and `teamId` set.
- Deleting a team sets `isArchived: true` on its channel (messages preserved).
- Deleting an orga removes all channels, messages, and read positions.

#### Step 1.6: Demo Data Channel Seeding [HOOK]

**File:** `convex/dataTest/createDemoOrga.ts`

In the demo orga creation script, after teams are created, insert channels:

```typescript
// Create orga channel
const orgaChannelId = await ctx.db.insert("channels", {
  orgaId,
  kind: "orga",
  isArchived: false,
});

// Create team channels for each team
for (const team of createdTeams) {
  await ctx.db.insert("channels", {
    orgaId,
    kind: "team",
    teamId: team._id,
    isArchived: false,
  });
}

// Seed a few messages in the orga channel for testing
await ctx.db.insert("messages", {
  channelId: orgaChannelId,
  orgaId,
  authorId: firstMemberId,
  text: "Welcome to the organization channel!",
  isEdited: false,
});
```

**Acceptance criteria:**
- Running the demo data script creates channels and seed messages visible in the Convex dashboard.

#### Step 1.7: ChatStore Context [FRONTEND]

**File:** `src/tools/chatStore/types.ts` (new file)
**File:** `src/tools/chatStore/context.ts` (new file)
**File:** `src/tools/chatStore/hooks.ts` (new file)
**File:** `src/tools/chatStore/index.tsx` (new file)

Create a ChatStore following the same pattern as OrgaStore:

```typescript
// types.ts
export type ChatStoreContextType = {
  selectedChannelId: Id<"channels"> | null;
  selectChannel: (channelId: Id<"channels">) => void;
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  // Thread panel state
  activeThreadMessageId: Id<"messages"> | null;
  openThread: (messageId: Id<"messages">) => void;
  closeThread: () => void;
};
```

The ChatStoreProvider:
- Lives inside OrgaStoreProvider (needs orgaId context).
- Resets `selectedChannelId` when the selected orga changes.
- Auto-selects the orga channel when chat is opened and no channel is selected.
- Persists `isChatOpen` state to localStorage (so the chat stays open across page refreshes).

**Acceptance criteria:**
- `useChatStore()` hook works in any component inside the provider.
- Selecting a different orga resets the chat channel selection.

#### Step 1.8: ChatPanel Component [FRONTEND]

**File:** `src/components/Chat/ChatPanel/index.tsx` (new file)

The main container component. Layout:

```
+----------------------------------+
| Chat Header (channel name, X)    |
+----------------------------------+
| Channel List | Message List      |
| (sidebar)    | (scrollable)      |
|              |                   |
|              |                   |
|              +-------------------+
|              | Message Input     |
+--------------+-------------------+
```

On mobile (<768px): Channel list and message list are separate screens (tab-based navigation).

On desktop: Two-column layout within the panel. Channel list is a narrow left column (~200px), message list fills the rest.

The panel is positioned as a **right-side panel** (pending Monica's confirmation), taking ~400px width on desktop. It overlaps the FocusContainer content (does not push it). Uses a slide-in animation from the right (300ms, ease-out).

**Integration point:** The ChatPanel is rendered inside `AuthenticatedView` (or `FocusContainer`) as a sibling to the focus content, with `position: fixed` or `absolute` and a z-index above the focus content but below modals.

A toggle button in the Header activates the chat panel (a chat bubble icon next to the NotificationBell).

**Implementation notes:**
- Use `createPortal(panel, document.body)` if ancestor overflow constraints cause issues (same pattern as modal scrolling fix documented in MEMORY.md).
- The panel should be keyboard-dismissable (Escape key closes it).
- The channel list sidebar should be collapsible on tablet viewports.

**Acceptance criteria:**
- Chat panel opens/closes with smooth animation.
- Channel list shows orga channel and team channels with correct names.
- Selecting a channel loads messages.
- Chat panel is responsive across desktop, tablet, and mobile viewports.

#### Step 1.9: ChannelList Component [FRONTEND]

**File:** `src/components/Chat/ChannelList/index.tsx` (new file)
**File:** `src/components/Chat/ChannelList/ChannelListItem.tsx` (new file)

Uses `useQuery(api.chat.functions.getChannelsForMember, { orgaId })`.

Each `ChannelListItem` displays:
- Channel name (orga name for orga channels, team name for team channels, "DM with [Name]" for DMs -- DMs in Phase 2)
- Unread badge (gold #eac840 background, dark text) showing unread count
- Active state highlight when selected
- Archived indicator (gray, italic) for archived team channels

Channel ordering:
1. Orga channel (always first, pinned)
2. Team channels (sorted alphabetically by team name)
3. DM channels (Phase 2)

**Acceptance criteria:**
- Channels load and display correctly.
- Unread badges show accurate counts.
- Clicking a channel selects it and loads its messages.

#### Step 1.10: MessageList Component [FRONTEND]

**File:** `src/components/Chat/MessageList/index.tsx` (new file)
**File:** `src/components/Chat/MessageList/MessageItem.tsx` (new file)

Uses `usePaginatedQuery(api.chat.functions.getMessages, { channelId }, { initialNumItems: 30 })`.

The message list:
- Scrolls with newest messages at the bottom (chat convention).
- Loads older messages when scrolling up (infinite scroll upward using `loadMore()`).
- Auto-scrolls to bottom when new messages arrive (only if the user is already at the bottom; if scrolled up, show a "New messages" indicator).
- Groups consecutive messages from the same author within 5 minutes (compact display: no avatar/name repeat).
- Shows date separators between messages from different days.

Each `MessageItem` displays:
- Author avatar (small circle, using `pictureURL` or initials fallback)
- Author name (`firstname surname`)
- Timestamp (relative for today: "2:34 PM"; full date for older: "Feb 12, 2:34 PM")
- Message text (plain text, preserving line breaks)
- Thread reply indicator (Phase 2): "[N replies] [Reply]" below the message

**Implementation notes:**
- Convex's `usePaginatedQuery` returns pages in reverse chronological order (since we query `order("desc")`). The frontend must reverse the display order within each page so messages read top-to-bottom chronologically. The pagination cursor handles loading older messages.
- For auto-scroll behavior: use a `ref` on the scroll container, check `scrollHeight - scrollTop === clientHeight` to detect if user is at bottom. On new messages, if at bottom, scroll down. Otherwise, show a floating "New messages" button.
- Message grouping logic: compare `authorId` and `_creationTime` difference with the previous message. If same author and less than 5 minutes apart, render in compact mode (no avatar/name, reduced top margin).

**Acceptance criteria:**
- Messages load with pagination (initial 30, load more on scroll).
- New messages from other users appear in real-time without manual refresh.
- Auto-scroll works correctly.
- Date separators appear between different days.
- Author grouping reduces visual clutter.

#### Step 1.11: MessageInput Component [FRONTEND]

**File:** `src/components/Chat/MessageInput/index.tsx` (new file)

A text input area at the bottom of the message list:
- Multi-line textarea that grows up to 4 lines, then scrolls internally.
- Send on Enter (without Shift). Shift+Enter for newline.
- Send button (arrow icon) appears when text is non-empty.
- Disabled state when channel is archived (show "This channel is archived" text).
- Trims whitespace; empty messages are not sent.
- Uses `useMutation(api.chat.functions.sendMessage)`.
- Clears input after successful send.
- Focus trap: the input stays focused after sending (no need to re-click).

**Acceptance criteria:**
- Member can type and send messages.
- Messages appear instantly in the message list (optimistic or via Convex reactivity).
- Archived channels show disabled input with explanation text.
- Enter sends, Shift+Enter creates newline.

#### Step 1.12: Chat Toggle in Header [FRONTEND]

**File:** `src/components/Header/index.tsx` -- modify

Add a chat toggle button (speech bubble icon) next to the NotificationBell:

```tsx
<ChatToggle />  // New component
<NotificationBell />
```

**File:** `src/components/ChatToggle/index.tsx` (new file)

A button that:
- Shows a chat bubble icon.
- Has an unread badge (total unread across all channels) using the same gold badge style as NotificationBell.
- Calls `toggleChat()` from ChatStore on click.
- Highlights when chat is open.

**Acceptance criteria:**
- Chat toggle appears in the header.
- Clicking it opens/closes the chat panel.
- Total unread count badge appears when there are unread messages.

#### Step 1.13: i18n Keys [I18N]

**File:** `src/i18n/locales/en/chat.json` (new file, plus 5 other locales)

Translation keys needed for Phase 1:

```json
{
  "chat": "Chat",
  "channels": "Channels",
  "orgaChannel": "General",
  "teamChannel": "{{teamName}}",
  "directMessage": "DM with {{name}}",
  "sendMessage": "Send message",
  "typeMessage": "Type a message...",
  "archivedChannel": "This channel is archived",
  "newMessages": "New messages",
  "unreadCount": "{{count}} unread",
  "noMessages": "No messages yet. Start the conversation!",
  "loadingMessages": "Loading messages...",
  "today": "Today",
  "yesterday": "Yesterday"
}
```

Register the `chat` namespace in the i18n configuration.

**Acceptance criteria:**
- All chat UI text uses translation keys.
- English translations are complete. Other locales can have English fallbacks initially.

#### Step 1.14: Provider Integration [FRONTEND]

**File:** `src/components/App/index.tsx` or `src/main.tsx` -- modify

Wrap the app tree with `ChatStoreProvider` inside `OrgaStoreProvider`:

```tsx
<OrgaStoreProvider>
  <ChatStoreProvider>
    {/* existing app tree */}
  </ChatStoreProvider>
</OrgaStoreProvider>
```

Render `ChatPanel` conditionally when `isChatOpen` is true, at the top level of the authenticated view.

**Acceptance criteria:**
- Full integration: user can sign in, select an orga, open chat, see channels, send messages, and see them in real-time.

#### Phase 1 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| Chat type definitions | `convex/chat/index.ts` | BACKEND |
| Schema with 3 new tables | `convex/schema.ts` | SCHEMA |
| Access control helpers | `convex/chat/access.ts` | BACKEND |
| 5 core functions | `convex/chat/functions.ts` | BACKEND |
| Orga channel auto-creation | `convex/orgas/functions.ts` | HOOK |
| Team channel auto-creation | `convex/teams/functions.ts` | HOOK |
| Team channel archival on delete | `convex/teams/functions.ts` | HOOK |
| Orga deletion cleanup | `convex/orgas/functions.ts` | HOOK |
| Demo data seeding | `convex/dataTest/createDemoOrga.ts` | HOOK |
| ChatStore context | `src/tools/chatStore/*` | FRONTEND |
| ChatPanel component | `src/components/Chat/ChatPanel/index.tsx` | FRONTEND |
| ChannelList + ChannelListItem | `src/components/Chat/ChannelList/*` | FRONTEND |
| MessageList + MessageItem | `src/components/Chat/MessageList/*` | FRONTEND |
| MessageInput | `src/components/Chat/MessageInput/index.tsx` | FRONTEND |
| ChatToggle in Header | `src/components/ChatToggle/index.tsx`, `Header/index.tsx` | FRONTEND |
| i18n translations (6 locales) | `src/i18n/locales/*/chat.json` | I18N |
| Provider integration | `src/components/App/index.tsx` | FRONTEND |

**Estimated file count:** ~15 new files, ~6 modified files.

---

### Phase 2: Threads and Direct Messages

**Goal:** Members can reply to messages in threads (keeping the main channel clean) and send private 1:1 messages to other members within the same orga.

**Dependencies:** Phase 1 complete.

**Blockers to resolve before starting:**
- [BLOCKER/Karl] Final confirmation on DM indexing: `dmMemberA`/`dmMemberB` approach as implemented in Phase 1. If Karl recommends a `channelMemberships` table instead, this phase must refactor the DM schema.
- [BLOCKER/Monica] DM initiation flow: where does the user click to start a DM? Options: (a) from a member's profile/card in the visual view, (b) from the channel list via a "New DM" button, (c) both. Default assumption: both.

#### Step 2.1: Thread Backend Functions [BACKEND]

**File:** `convex/chat/functions.ts` -- add functions

1. `getThreadReplies(args: { messageId })` -- Returns all replies to a message, ordered chronologically. Uses `withIndex("by_thread_parent", q => q.eq("threadParentId", messageId))`. Denormalizes author data. No pagination (threads are expected to be small, <100 replies).

2. `sendThreadReply(args: { channelId, threadParentId, text })` -- Creates a message with `threadParentId` set. Same access control as `sendMessage`. Returns new message `_id`.

3. `getThreadCounts(args: { channelId, messageIds })` -- Given a list of message IDs (the currently visible page), returns `{ messageId, replyCount, lastReplyTimestamp }` for each. This is more efficient than querying thread counts individually per message. Uses `withIndex("by_thread_parent")` for each messageId.

**Implementation notes:**
- `getThreadCounts` is a batch query to avoid N+1 queries on the frontend. The frontend passes the IDs of messages currently in view.
- Thread replies are NOT counted in the channel's unread count. Only top-level messages increment unread.

**Acceptance criteria:**
- Replying to a message creates a threaded reply.
- Thread replies are returned in chronological order.
- Thread counts are accurate and update in real-time.

#### Step 2.2: DM Backend Functions [BACKEND]

**File:** `convex/chat/functions.ts` -- add functions

4. `getOrCreateDMChannel(args: { orgaId, otherMemberId })` -- Finds an existing DM channel between the authenticated member and `otherMemberId`, or creates one. Uses the `by_dm_members` index. Always stores the smaller `_id` string in `dmMemberA` for consistent lookups. Returns the channel `_id`.

5. Update `getChannelsForMember` to also return DM channels where the member is a participant.

**Implementation notes:**
- DM creation is idempotent. If called twice with the same pair of members, it returns the same channel.
- The `getOrCreateDMChannel` function is a mutation (because it may insert), not a query.
- When returning DM channels in the channel list, include the other participant's name for display purposes.

**Acceptance criteria:**
- DM channel is created on first message between two members.
- Subsequent opens return the same channel.
- DM appears in both participants' channel lists.

#### Step 2.3: ThreadPanel Component [FRONTEND]

**File:** `src/components/Chat/ThreadPanel/index.tsx` (new file)

A side panel (or overlay) that opens when clicking "Reply" or the reply count on a message:
- Shows the parent message at the top (read-only, with context).
- Below it, a list of thread replies in chronological order.
- At the bottom, a MessageInput scoped to the thread.
- Close button (X) returns to the main message list.

Layout options (pending Monica input, default to slide-in from right over the message list):
- On desktop: slides in from right, narrows the message list.
- On mobile: replaces the message list entirely.

**Acceptance criteria:**
- Clicking reply on a message opens the thread panel.
- Thread replies appear in real-time.
- Sending a reply in the thread panel creates a threaded message.
- Thread reply count updates in the main message list.

#### Step 2.4: DM Initiation UI [FRONTEND]

**File:** `src/components/Chat/ChannelList/index.tsx` -- modify

Add a "New conversation" button at the bottom of the DM section in the channel list. Opens a member picker modal showing all members of the current orga. Selecting a member calls `getOrCreateDMChannel` and navigates to that channel.

**File:** `src/components/MemberVisualView/index.tsx` -- modify (optional)
**File:** `src/components/RoleVisualView/MemberLink.tsx` -- modify (optional)

Add a "Send message" action on member cards/profiles that opens the chat panel with the DM channel for that member.

**Acceptance criteria:**
- User can start a DM from the channel list.
- User can start a DM from a member's profile.
- DM channels appear in the channel list with the other member's name.

#### Step 2.5: i18n Keys for Phase 2 [I18N]

Additional translation keys:

```json
{
  "thread": "Thread",
  "replies": "{{count}} replies",
  "reply": "Reply",
  "lastReply": "Last reply {{time}}",
  "newConversation": "New conversation",
  "selectMember": "Select a member",
  "dmWith": "{{name}}",
  "inThread": "In thread"
}
```

#### Phase 2 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| Thread queries + mutation | `convex/chat/functions.ts` | BACKEND |
| DM channel creation | `convex/chat/functions.ts` | BACKEND |
| ThreadPanel component | `src/components/Chat/ThreadPanel/index.tsx` | FRONTEND |
| DM initiation UI | `ChannelList`, member views | FRONTEND |
| i18n translations | `src/i18n/locales/*/chat.json` | I18N |

**Estimated file count:** ~3 new files, ~4 modified files.

---

### Phase 3: Topic Tool (Consent-Based Decisions)

**Goal:** Members can initiate a consent-based decision directly in chat. The tool walks the team through proposition, clarification, and consent phases. The outcome is recorded as a Decision in the audit trail.

**Dependencies:** Phase 1 complete. Phase 2 recommended but not strictly required (threads are independent of tools).

**Blockers to resolve before starting:**
- [BLOCKER/Ivan] **Topic facilitator role:** Who can advance phases? Current assumption: the proposer (message author) or any member holding a leader/secretary role in the team. For orga channels, only the orga owner or any team leader can advance.
- [BLOCKER/Ivan] **Consent education:** Should the UI display a short explanation of the consent model? Current assumption: a collapsible info section at the top of the tool in the clarification and consent phases, explaining the rules (e.g., "Consent means 'I can live with this.' Objections must be constructive.").
- [BLOCKER/Ivan] **Relationship with existing `topics` table:** The existing `topics` entity (in `convex/topics/index.ts`) stores team discussion topics. The topic tool in chat is different -- it is a live governance process. Current assumption: they are separate concepts. The existing `topics` table remains for agenda management. The chat topic tool creates `topicClarifications`, `topicAnswers`, and `topicResponses` in its own tables, and records the outcome in the `decisions` table. A future enhancement could allow converting a `topics` entry into a chat topic tool message.

#### Step 3.1: Tool Participation Tables [SCHEMA]

**File:** `convex/schema.ts` -- add tables

```typescript
import {
  topicClarificationType,
  topicAnswerType,
  topicResponseType,
} from "./chat";

// ... in defineSchema:

topicClarifications: defineTable({ ...topicClarificationType.fields })
  .index("by_message", ["messageId"])
  .index("by_orga", ["orgaId"]),

topicAnswers: defineTable({ ...topicAnswerType.fields })
  .index("by_clarification", ["clarificationId"])
  .index("by_orga", ["orgaId"]),

topicResponses: defineTable({ ...topicResponseType.fields })
  .index("by_message", ["messageId"])
  .index("by_message_and_member", ["messageId", "memberId"])
  .index("by_orga", ["orgaId"]),
```

**File:** `convex/chat/index.ts` -- add type definitions for the three new entities

Follow the same `entityType` / `entityValidator` pattern.

**Acceptance criteria:**
- Schema deploys with no errors.
- Three new tables appear in Convex dashboard.

#### Step 3.2: Decision System Extension [BACKEND]

**File:** `convex/decisions/index.ts` -- modify

Extend the `targetType` union to include `"topics"`:

```typescript
export const targetType = v.union(
  v.literal('orgas'),
  v.literal('teams'),
  v.literal('roles'),
  v.literal('members'),
  v.literal('policies'),
  v.literal('invitations'),
  v.literal('topics'),       // NEW: consent decisions from chat
)
```

Extend `targetIdType` to include `v.id("messages")` (since the topic tool lives on a message):

```typescript
export const targetIdType = v.union(
  v.id('orgas'),
  v.id('teams'),
  v.id('roles'),
  v.id('members'),
  v.id('policies'),
  v.id('invitations'),
  v.id('messages'),           // NEW: for chat topic tool outcomes
)
```

Add a new `topicDiff` variant to `diffType`:

```typescript
const topicDiff = v.object({
  type: v.literal("Topic"),
  before: v.optional(v.object({
    title: v.optional(v.string()),
    phase: v.optional(v.string()),
  })),
  after: v.optional(v.object({
    title: v.optional(v.string()),
    phase: v.optional(v.string()),
    outcome: v.optional(v.string()),
    consentCount: v.optional(v.number()),
    objectionCount: v.optional(v.number()),
    standAsideCount: v.optional(v.number()),
  })),
});

export const diffType = v.union(
  organizationDiff,
  teamDiff,
  roleDiff,
  invitationDiff,
  policyDiff,
  memberDiff,
  topicDiff,       // NEW
);
```

**Acceptance criteria:**
- Decision records can be created with `targetType: "topics"` and `diff.type: "Topic"`.

#### Step 3.3: Topic Tool Mutations [BACKEND]

**File:** `convex/chat/functions.ts` -- add mutations

1. `createTopicMessage(args: { channelId, title, description })` -- Creates a message with `embeddedTool: { type: "topic", title, description, phase: "clarification", ... }`. The message `text` is set to the description. The tool starts in the "clarification" phase (the proposition is the message itself).

2. `askClarification(args: { messageId, question })` -- Inserts a `topicClarification`. Validates: message exists, has a topic tool, phase is "clarification", member has channel access.

3. `answerClarification(args: { clarificationId, answer })` -- Inserts a `topicAnswer`. Any member with channel access can answer.

4. `advanceTopicPhase(args: { messageId, newPhase })` -- Changes the topic tool's `phase` field. Only the proposer or a facilitator (leader/secretary in the channel's team) can advance. Valid transitions: `clarification -> consent`, `consent -> resolved`.

5. `submitTopicResponse(args: { messageId, response, reason? })` -- Inserts a `topicResponse`. Validates: phase is "consent", member has not already responded (check `by_message_and_member` index), reason is required if response is "objection".

6. `resolveTopicTool(args: { messageId, outcome })` -- Called by the facilitator to finalize the topic. Sets `phase: "resolved"` and `outcome`. Creates a Decision record in the `decisions` table.

**Implementation notes:**
- `advanceTopicPhase` and `resolveTopicTool` could be merged into one mutation with conditional logic, but separate mutations are clearer and easier to test.
- When resolving with outcome "accepted", the Decision diff records the final consent tally.
- `resolveTopicTool` also updates the message's `embeddedTool.decisionId` field to link to the created Decision.

**Acceptance criteria:**
- Full topic lifecycle works: create -> ask questions -> answer -> advance to consent -> members respond -> resolve.
- Decision record is created on resolution.
- Unauthorized phase advances are rejected.
- Duplicate responses are rejected.

#### Step 3.4: Topic Tool Queries [BACKEND]

**File:** `convex/chat/functions.ts` -- add queries

7. `getTopicClarifications(args: { messageId })` -- Returns all clarifications with their answers, ordered chronologically. Denormalizes questioner/answerer names.

8. `getTopicResponses(args: { messageId })` -- Returns all consent responses. Denormalizes member names.

9. `getMyTopicResponse(args: { messageId })` -- Returns the authenticated member's response (if any). Used to show "You have already responded" state.

**Acceptance criteria:**
- Clarifications and responses load correctly and update in real-time.

#### Step 3.5: TopicTool Frontend Component [FRONTEND]

**File:** `src/components/Chat/ChatTools/TopicTool.tsx` (new file)

A phase-aware component embedded within a MessageItem:

**Clarification phase:**
- Displays the proposal title and description prominently.
- Shows existing Q&A pairs.
- "Ask a question" input field (visible to all members with access).
- "Answer" button on each unanswered question (visible to all, not just proposer).
- "Advance to consent" button (visible only to facilitator).
- Info section explaining: "This is the clarification phase. Ask questions to understand the proposal. This is not the time for opinions."

**Consent phase:**
- Displays the proposal.
- Shows Q&A from clarification (collapsed by default).
- Three response buttons: "Consent", "Object", "Stand Aside".
- Clicking "Object" opens a text field for the required reason.
- Shows existing responses with member names and reasons.
- Shows tally: "X consented, Y objected, Z stood aside" out of N eligible members.
- "Resolve" button (visible only to facilitator) with outcome selection.
- Info section explaining: "Consent means 'I can live with this and it is safe enough to try.' It is not the same as agreement. Objections must be reasoned and constructive."

**Resolved phase:**
- Read-only display of the outcome (accepted/modified/withdrawn).
- Summary of responses.
- Link to the Decision record in the Decision Journal.
- Visual indicator: green for accepted, yellow for modified, gray for withdrawn.

**Acceptance criteria:**
- Phase transitions render correctly.
- All interactions (ask question, answer, respond, advance, resolve) work end-to-end.
- Real-time updates: other members see questions/answers/responses appear without refreshing.
- Info sections explain the consent model clearly.
- Decision link navigates to the Decision Journal entry.

#### Step 3.6: Tool Creation Flow in MessageInput [FRONTEND]

**File:** `src/components/Chat/MessageInput/index.tsx` -- modify

Add a "+" button (or similar attachment mechanism) next to the text input that opens a tool menu:

```
[+] | Type a message...        [Send]
```

Clicking "+" opens a small popover menu:
- "Consent Decision" (topic tool)
- "Vote" (Phase 4)
- "Election" (Phase 5)

Selecting "Consent Decision" opens a modal with:
- Title field (required)
- Description field (required, multiline)
- "Start Discussion" button

On submit, calls `createTopicMessage`.

**Acceptance criteria:**
- Tool creation menu appears.
- Creating a topic tool produces a message with the embedded tool rendered inline.

#### Step 3.7: i18n Keys for Phase 3 [I18N]

```json
{
  "topic": {
    "title": "Consent Decision",
    "create": "Start a consent decision",
    "proposition": "Proposal",
    "clarification": "Clarification Phase",
    "consent": "Consent Phase",
    "resolved": "Resolved",
    "askQuestion": "Ask a clarifying question...",
    "answer": "Answer",
    "advanceToConsent": "Advance to consent",
    "consentButton": "Consent",
    "objectButton": "Object",
    "standAsideButton": "Stand aside",
    "objectionReason": "Why do you object? (required)",
    "resolve": "Resolve decision",
    "accepted": "Accepted",
    "modified": "Modified after objections",
    "withdrawn": "Withdrawn",
    "clarificationInfo": "Ask questions to understand the proposal. This is not the time for opinions.",
    "consentInfo": "Consent means 'I can live with this and it is safe enough to try.' Objections must be reasoned and constructive.",
    "alreadyResponded": "You have already responded",
    "tally": "{{consent}} consented, {{objection}} objected, {{standAside}} stood aside",
    "viewDecision": "View decision"
  }
}
```

#### Phase 3 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| 3 participation tables | `convex/schema.ts`, `convex/chat/index.ts` | SCHEMA |
| Decision system extension | `convex/decisions/index.ts` | BACKEND |
| 6 topic mutations | `convex/chat/functions.ts` | BACKEND |
| 3 topic queries | `convex/chat/functions.ts` | BACKEND |
| TopicTool component | `src/components/Chat/ChatTools/TopicTool.tsx` | FRONTEND |
| Tool creation flow | `MessageInput/index.tsx` | FRONTEND |
| i18n translations | `src/i18n/locales/*/chat.json` | I18N |

**Estimated file count:** ~3 new files, ~5 modified files.

---

### Phase 4: Voting Tool

**Goal:** Members can create polls with multiple options and collect votes within chat.

**Dependencies:** Phase 1 complete, Phase 3 step 3.6 (tool creation flow in MessageInput).

#### Step 4.1: Votes Table [SCHEMA]

**File:** `convex/schema.ts` -- add table

```typescript
votes: defineTable({ ...voteType.fields })
  .index("by_message", ["messageId"])
  .index("by_message_and_member", ["messageId", "memberId"])
  .index("by_orga", ["orgaId"]),
```

**File:** `convex/chat/index.ts` -- add `voteType` / `voteValidator`

#### Step 4.2: Voting Mutations [BACKEND]

**File:** `convex/chat/functions.ts` -- add mutations

1. `createVotingMessage(args: { channelId, question, options, mode, isAnonymous, deadline? })` -- Creates a message with a voting tool. `options` is an array of `{ id, label }`. Validates at least 2 options.

2. `submitVote(args: { messageId, choices })` -- Inserts a vote. Validates: voting is not closed, member hasn't already voted (or updates existing vote), choices are valid for the mode (single: exactly 1, approval: any subset, ranked: all options in order).

3. `closeVote(args: { messageId })` -- Closes the vote. Only the creator or facilitator can close. Updates the message's `embeddedTool.isClosed`.

**Implementation notes:**
- For ranked voting, `choices` contains all option IDs in the member's preferred order.
- Vote updates (changing your vote) are allowed until the vote is closed. This is an update-or-insert pattern on the `votes` table.
- Deadline enforcement: if a deadline is set, `submitVote` checks `Date.now() < deadline`. A scheduled function could auto-close votes at the deadline (Convex scheduled functions).

#### Step 4.3: Voting Queries [BACKEND]

4. `getVoteResults(args: { messageId })` -- Returns vote tallies. If not anonymous, includes voter names. If anonymous, only totals. For ranked mode, computes a ranking (simple Borda count or similar).

5. `getMyVote(args: { messageId })` -- Returns the authenticated member's current vote.

#### Step 4.4: VotingTool Frontend Component [FRONTEND]

**File:** `src/components/Chat/ChatTools/VotingTool.tsx` (new file)

**Open state:**
- Displays the question.
- Shows options as selectable cards/buttons depending on mode:
  - Single: radio buttons
  - Approval: checkboxes
  - Ranked: drag-and-drop list (or numbered selection)
- "Submit vote" button.
- If member has voted, shows their current selection with "Change vote" option.
- Shows voter count: "N of M members have voted."

**Closed state:**
- Read-only results display.
- Bar chart for single/approval modes (horizontal bars with percentage).
- Ranked list for ranked mode.
- If not anonymous, shows who voted for what.
- If anonymous, only shows totals.

**Implementation notes:**
- Drag-and-drop for ranked voting: use a simple up/down button pattern rather than full drag-and-drop (simpler, more accessible). Each option has up/down arrows to reorder.
- Results visualization: simple CSS bars (percentage width within a container), no charting library needed.

#### Step 4.5: i18n Keys for Phase 4 [I18N]

```json
{
  "voting": {
    "title": "Vote",
    "create": "Create a vote",
    "question": "Question",
    "options": "Options",
    "addOption": "Add option",
    "mode": "Voting mode",
    "single": "Single choice",
    "approval": "Approval voting",
    "ranked": "Ranked choice",
    "anonymous": "Anonymous",
    "deadline": "Deadline (optional)",
    "submitVote": "Submit vote",
    "changeVote": "Change vote",
    "closeVote": "Close voting",
    "voteClosed": "Voting closed",
    "voterCount": "{{count}} of {{total}} voted",
    "results": "Results",
    "yourVote": "Your vote"
  }
}
```

#### Phase 4 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| Votes table | `convex/schema.ts`, `convex/chat/index.ts` | SCHEMA |
| 3 voting mutations | `convex/chat/functions.ts` | BACKEND |
| 2 voting queries | `convex/chat/functions.ts` | BACKEND |
| VotingTool component | `src/components/Chat/ChatTools/VotingTool.tsx` | FRONTEND |
| i18n translations | `src/i18n/locales/*/chat.json` | I18N |

**Estimated file count:** ~1 new file, ~3 modified files.

---

### Phase 5: Candidateless Election Tool

**Goal:** Members can conduct a sociocratic election process for filling a role, with nomination, discussion, change round, and consent phases.

**Dependencies:** Phase 3 complete (reuses the consent response pattern and facilitator logic).

**Blockers to resolve before starting:**
- [BLOCKER/Ivan] **Nomination secrecy:** Current design hides nominations until all eligible members have nominated. But what if some members never nominate? Fallback options: (a) deadline-based reveal, (b) facilitator can force reveal after a waiting period, (c) members who don't nominate within a time window are marked as "abstained." Need Ivan's decision.
- [BLOCKER/Ivan] **Role assignment automation:** After election, should the system automatically assign the elected member to the role? Or just create a Decision record and require manual role assignment? Current assumption: the facilitator sees an "Assign role" button after the election that triggers the existing role assignment flow.

#### Step 5.1: Election Participation Tables [SCHEMA]

**File:** `convex/schema.ts` -- add tables

```typescript
electionNominations: defineTable({ ...electionNominationType.fields })
  .index("by_message", ["messageId"])
  .index("by_message_and_nominator", ["messageId", "nominatorId"])
  .index("by_orga", ["orgaId"]),

electionResponses: defineTable({ ...electionResponseType.fields })
  .index("by_message", ["messageId"])
  .index("by_message_and_member", ["messageId", "memberId"])
  .index("by_orga", ["orgaId"]),
```

#### Step 5.2: Election Mutations [BACKEND]

**File:** `convex/chat/functions.ts` -- add mutations

1. `createElectionMessage(args: { channelId, roleTitle, roleId?, teamId })` -- Creates a message with an election tool in "nomination" phase.

2. `submitNomination(args: { messageId, nomineeId, reason })` -- Inserts an `electionNomination`. Validates: phase is "nomination", member hasn't already nominated (unique by `nominatorId`).

3. `advanceElectionPhase(args: { messageId, newPhase, proposedCandidateId? })` -- Changes phase. Valid transitions: `nomination -> discussion`, `discussion -> change_round`, `change_round -> consent`, `consent -> elected`. When advancing to consent, `proposedCandidateId` is required.

4. `changeNomination(args: { messageId, newNomineeId, newReason })` -- Updates an existing nomination during the "change_round" phase. Sets `changedInRound: true`.

5. `submitElectionResponse(args: { messageId, response, reason? })` -- Same pattern as `submitTopicResponse`. Phase must be "consent".

6. `resolveElection(args: { messageId, outcome, electedMemberId? })` -- Finalizes the election. Creates a Decision record. If outcome is "elected", stores `electedMemberId` on the tool.

**Implementation notes:**
- Nomination secrecy: `getElectionNominations` query (below) returns nominations only when the phase is "discussion" or later. During "nomination" phase, it returns only the count of nominations submitted and whether the current member has nominated.
- The consent pattern is identical to the topic tool's consent phase. Consider extracting shared consent logic into a helper.

#### Step 5.3: Election Queries [BACKEND]

7. `getElectionNominations(args: { messageId })` -- Returns nominations. During "nomination" phase, returns `{ totalNominations, myNominationSubmitted }` (no details). After "nomination" phase, returns full nomination details with member names.

8. `getElectionResponses(args: { messageId })` -- Returns consent responses (same pattern as `getTopicResponses`).

9. `getMyElectionNomination(args: { messageId })` -- Returns the authenticated member's nomination.

10. `getEligibleNominees(args: { messageId })` -- Returns all members of the team who could be nominated (for the nomination member picker).

#### Step 5.4: ElectionTool Frontend Component [FRONTEND]

**File:** `src/components/Chat/ChatTools/ElectionTool.tsx` (new file)

Phase-aware rendering:

**Nomination phase:**
- Displays the role being filled.
- Member picker: "I nominate [dropdown of team members] because [text field]".
- "Submit nomination" button.
- Shows "X of Y members have nominated" (no names visible).
- If member has nominated: "You have nominated [your choice]. Nominations are hidden until the discussion phase."
- "Reveal nominations" button for facilitator (advances to discussion phase).

**Discussion phase:**
- All nominations revealed with nominator names, nominee names, and reasons.
- Nomination tally: who received how many nominations.
- Free-form discussion happens in the message thread (not a tool feature; just encourage thread use).
- "Start change round" button for facilitator.

**Change round phase:**
- Same as discussion, but each member can change their nomination.
- "Change my nomination" button if the member wants to change.
- "Proceed to consent" button for facilitator.

**Consent phase:**
- Facilitator's proposed candidate is displayed prominently.
- Consent/Object/Stand Aside buttons (reuse the pattern from TopicTool).
- Response tally.
- "Conclude election" button for facilitator.

**Elected phase:**
- Read-only result: "[Name] has been elected as [Role]."
- Decision link.
- "Assign role" button for facilitator (calls existing role assignment mutation, with a confirmation popup).

**Acceptance criteria:**
- Full election lifecycle works end-to-end.
- Nominations are hidden during nomination phase.
- Consent round follows the same pattern as topic tool.
- Role assignment integration works (facilitator can assign after election).

#### Step 5.5: i18n Keys for Phase 5 [I18N]

```json
{
  "election": {
    "title": "Election",
    "create": "Start an election",
    "roleTitle": "Role to fill",
    "selectRole": "Select a role (optional)",
    "nominationPhase": "Nomination Phase",
    "discussionPhase": "Discussion Phase",
    "changeRound": "Change Round",
    "consentPhase": "Consent Phase",
    "elected": "Elected",
    "nominate": "I nominate...",
    "nomineeReason": "Because...",
    "submitNomination": "Submit nomination",
    "nominationCount": "{{count}} of {{total}} nominated",
    "nominationsHidden": "Nominations are hidden until the discussion phase",
    "revealNominations": "Reveal nominations",
    "changeNomination": "Change my nomination",
    "proceedToConsent": "Proceed to consent",
    "proposedCandidate": "Proposed candidate",
    "concludeElection": "Conclude election",
    "electedResult": "{{name}} has been elected as {{role}}",
    "noElection": "No candidate was elected",
    "assignRole": "Assign role"
  }
}
```

#### Phase 5 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| 2 election tables | `convex/schema.ts`, `convex/chat/index.ts` | SCHEMA |
| 6 election mutations | `convex/chat/functions.ts` | BACKEND |
| 4 election queries | `convex/chat/functions.ts` | BACKEND |
| ElectionTool component | `src/components/Chat/ChatTools/ElectionTool.tsx` | FRONTEND |
| i18n translations | `src/i18n/locales/*/chat.json` | I18N |

**Estimated file count:** ~1 new file, ~3 modified files.

---

### Phase 6: Notifications Integration

**Goal:** Chat events integrate with the existing notification system so members are informed about messages, tool phase changes, and decisions even when they are not looking at the chat panel.

**Dependencies:** Phases 1-5 complete (or at least Phase 1 + the tools that should trigger notifications).

#### Step 6.1: Update Notification Payloads [BACKEND]

**File:** `convex/notifications/index.ts` -- modify

Update the existing `messagePayload` to use proper typed IDs:

```typescript
export const messagePayload = v.object({
  category: v.literal("message"),
  messageId: v.id("messages"),       // Was v.string()
  channelId: v.id("channels"),       // NEW
  teamId: v.optional(v.id("teams")), // Optional (null for orga channel)
  teamName: v.optional(v.string()),  // Optional
  channelName: v.string(),           // "General" or team name
  senderName: v.string(),
  preview: v.string(),               // First ~100 chars of the message
});
```

Add a new payload for tool events:

```typescript
export const toolEventPayload = v.object({
  category: v.literal("tool_event"),
  messageId: v.id("messages"),
  channelId: v.id("channels"),
  channelName: v.string(),
  toolType: v.union(v.literal("topic"), v.literal("voting"), v.literal("election")),
  eventDescription: v.string(),  // e.g., "Consent phase started for 'Weekly Standups'"
});
```

Update the `notificationPayload` union and `notificationCategoryType` to include the new variant.

#### Step 6.2: Notification Triggers [BACKEND]

**File:** `convex/chat/functions.ts` -- modify tool mutations

Add notification creation calls at key moments:

| Event | Who gets notified | Priority |
|-------|------------------|----------|
| New message in channel | All channel members (except author) who haven't read it within 5 min | normal |
| Topic advanced to consent phase | All channel members | high |
| Election nomination phase opened | All team members | high |
| Election advanced to consent phase | All team members | high |
| Topic/election resolved | All channel members | normal |

**Implementation notes:**
- Notifications for new messages should NOT be created for every message instantly (that would be noisy). Instead, use a batched approach: when `markAsRead` has not been called for a channel within 5 minutes and new messages exist, create a single notification. This can be implemented as a Convex scheduled function that runs periodically, or as a check within `sendMessage` that looks at the last read timestamp.
- Tool event notifications are immediate (they are governance-relevant).
- Notification deduplication: use the `groupKey` field to group notifications for the same channel. When a new notification for the same channel arrives, update the existing unread notification rather than creating a new one.

#### Step 6.3: Notification Display Updates [FRONTEND]

**File:** `src/components/NotificationItem/index.tsx` -- modify

Add rendering logic for `message` and `tool_event` notification categories:
- Message notifications: "New messages in [Channel Name]" with a preview.
- Tool event notifications: "[Event description]" with a link that opens the chat panel to the relevant message.

Clicking a chat notification should:
1. Open the chat panel (if not open).
2. Select the relevant channel.
3. Scroll to the relevant message (for tool events).

**Acceptance criteria:**
- Members receive notifications for governance-relevant events.
- Notifications are not noisy for regular messages.
- Clicking a notification navigates to the correct chat context.

#### Phase 6 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| Updated notification payloads | `convex/notifications/index.ts` | BACKEND |
| Notification triggers in chat mutations | `convex/chat/functions.ts` | BACKEND |
| Notification display for chat events | `src/components/NotificationItem/index.tsx` | FRONTEND |
| Notification click-to-navigate | ChatStore integration | FRONTEND |

---

### Phase 7: Polish, Search, and Accessibility

**Goal:** Production-ready chat experience with search, message editing, keyboard navigation, and accessibility compliance.

**Dependencies:** Phases 1-6 complete.

#### Step 7.1: Message Editing and Deletion [BACKEND + FRONTEND]

**Backend mutations:**
- `editMessage(args: { messageId, newText })` -- Only the author can edit. Sets `isEdited: true`, `editedAt: Date.now()`. Cannot edit messages with embedded tools (tools are managed through their own mutations).
- `deleteMessage(args: { messageId })` -- Only the author or a facilitator can delete. Soft-delete: sets `text: "[message deleted]"`, clears `embeddedTool`. Preserves the message for thread continuity.

**Frontend:**
- Edit: clicking "Edit" on own message turns the message text into an editable textarea.
- Delete: clicking "Delete" shows a confirmation. Deleted messages show "[message deleted]" in gray italic.
- "(edited)" indicator next to timestamp on edited messages.

#### Step 7.2: Message Search [BACKEND + FRONTEND]

**Backend:**
- `searchMessages(args: { orgaId, query, channelId? })` -- Full-text search across messages the member has access to. Optionally scoped to a single channel.

**Implementation notes:**
- Convex supports full-text search via `searchIndex`. Add a search index on the `messages` table:
  ```typescript
  messages: defineTable({ ...messageType.fields })
    .index(...)
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["orgaId", "channelId"],
    })
  ```
- The search query uses `.withSearchIndex("search_text", q => q.search("text", query).eq("orgaId", orgaId))`.
- Search results show message previews with highlighted matches, channel name, author, and timestamp.

**Frontend:**
- Search input at the top of the ChatPanel (or triggered by Ctrl/Cmd+K).
- Results appear as a list. Clicking a result navigates to that message in its channel.
- If the result is in a channel the member cannot access (should not happen due to query filtering), show nothing.

#### Step 7.3: Keyboard Shortcuts [FRONTEND]

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd+K | Open message search |
| Escape | Close chat panel / close thread panel / close search |
| Ctrl/Cmd+Enter | Send message (alternative to Enter) |
| Up Arrow (in empty input) | Edit last own message |

#### Step 7.4: Accessibility Audit [FRONTEND]

- All interactive elements have proper ARIA labels.
- Chat panel has `role="complementary"` and `aria-label="Chat"`.
- Message list has `role="log"` and `aria-live="polite"` for new messages.
- Channel list items are keyboard-navigable with `role="listbox"`.
- Tool components have descriptive ARIA labels for each phase and action.
- Focus management: when chat opens, focus moves to the message input. When thread opens, focus moves to thread input.
- Screen reader announcements for: new messages, phase changes, vote results.
- Reduced motion: all animations respect `prefers-reduced-motion`.

#### Step 7.5: Performance Optimization [FRONTEND]

- **Virtualized message list:** If a channel has >200 visible messages, use virtualization (e.g., `react-window` or `@tanstack/react-virtual`) to render only visible messages. This is critical for channels with high message volume.
- **Pagination tuning:** Initial load of 30 messages, load 20 more per scroll. Test with channels of 10,000+ messages.
- **Debounced unread counts:** The `getUnreadCounts` query runs for all channels. If the member is in many teams, debounce or batch these queries.
- **Author cache:** When rendering a page of messages, deduplicate author lookups (already described in Phase 1).

#### Step 7.6: Channel Archival Display [FRONTEND]

- Archived channels show a banner at the top: "This channel is archived. You can read messages but not post new ones."
- Archived channels appear at the bottom of the channel list, visually dimmed.
- Message input is disabled with explanation text.

#### Phase 7 Summary

| Deliverable | Files | Type |
|------------|-------|------|
| Message edit/delete | `convex/chat/functions.ts`, `MessageItem.tsx` | BACKEND + FRONTEND |
| Full-text search | `convex/schema.ts`, `convex/chat/functions.ts`, search UI | BACKEND + FRONTEND |
| Keyboard shortcuts | Various components | FRONTEND |
| Accessibility compliance | All Chat components | FRONTEND |
| Virtualized message list | `MessageList/index.tsx` | FRONTEND |
| Archived channel display | `ChannelList`, `MessageList` | FRONTEND |

---

### Phase Summary and Timeline

| Phase | Name | Key Deliverable | Depends On |
|-------|------|-----------------|------------|
| **1** | Foundation | Channels, messages, chat panel, real-time messaging | Nothing |
| **2** | Threads + DMs | Thread replies, private DM conversations | Phase 1 |
| **3** | Topic Tool | Consent-based decision flow in chat | Phase 1 |
| **4** | Voting Tool | Polls with multiple voting modes | Phase 1, Phase 3 (tool UI) |
| **5** | Election Tool | Candidateless election process | Phase 3 (consent pattern) |
| **6** | Notifications | Chat event integration with notification system | Phases 1-5 |
| **7** | Polish + Search | Edit, delete, search, a11y, performance | Phases 1-6 |

**Critical path:** Phase 1 -> Phase 3 -> Phase 5 (each builds on the previous).
**Parallel tracks:** After Phase 1, Phases 2-4 can proceed in parallel if separate developers are working on them. Phase 2 (threads/DMs) is independent of Phases 3-5 (tools).

### Total New Tables

| Table | Phase | Purpose |
|-------|-------|---------|
| `channels` | 1 | Communication spaces |
| `messages` | 1 | Text messages and tool containers |
| `channelReadPositions` | 1 | Unread tracking |
| `topicClarifications` | 3 | Consent decision Q&A |
| `topicAnswers` | 3 | Answers to clarification questions |
| `topicResponses` | 3 | Consent/objection/stand-aside responses |
| `votes` | 4 | Poll votes |
| `electionNominations` | 5 | Election candidate nominations |
| `electionResponses` | 5 | Election consent responses |

**Total: 9 new tables** (the existing schema has 10 tables, so this roughly doubles it).

### Risk Assessment

| Risk | Mitigation |
|------|-----------|
| **Write conflicts on messages with tools** | Tool participation stored in separate tables (Phase 3-5 design). Only metadata (phase, outcome) is written to the message document, and only by the facilitator. |
| **Unread count query performance** | Cap unread counts at 100. Batch queries. Consider a materialized unread count field if needed. |
| **DM indexing limitations** | Using `dmMemberA`/`dmMemberB` with canonical ordering. Fallback: `channelMemberships` table if Karl recommends it. |
| **Schema migration for tool types** | Define all tool variants in Phase 1 schema (even if unused until Phases 3-5). Fields are optional. No migration needed when tools are implemented. |
| **Large channel performance** | Pagination from Phase 1. Virtualized rendering in Phase 7. Search index for finding old messages. |
| **Notification noise** | Batched message notifications (5-min delay). Immediate notifications only for governance events. User can mute channels (future enhancement). |

---

## Open Questions

These items need input from collaborators before implementation.

### For Karl (Data Model)

1. **DM participant indexing:** The current design stores `dmParticipants` as an array of two member IDs. Convex cannot index into array elements efficiently. Should we use two separate fields (`dmMemberA`, `dmMemberB`) with a compound index instead? Or create a `channelMemberships` table?

2. **Tool participation table proliferation:** The design creates 5+ tables for tool participation data. Is this acceptable, or should we consolidate into a single `toolParticipations` table with a discriminated union payload?

3. **Message pagination strategy:** Convex's `.paginate()` is the natural choice. Should we use cursor-based pagination or offset-based? Any known limitations with large channels?

### For Monica (UX)

1. **Chat panel placement:** Should the chat be a right-side panel, a left-side sidebar, or a bottom drawer? How does it interact with the existing visual/manage view toggle?

2. **Channel switching:** How should the channel list behave? Always visible? Collapsible? Auto-hide on mobile?

3. **Tool creation flow:** How does a member initiate an embedded tool? A "+" button in the message input? A slash command? A separate menu?

4. **Unread indicators:** Beyond badge counts, should there be a "new messages" divider in the message list?

### For Ivan (Vision/Governance)

1. **Topic tool facilitator role:** Who can advance the topic through phases? Only the proposer? The team leader? The secretary? Should the facilitator role be configurable?

2. **Consent vs. consensus:** The VISION document is clear that consent is not consensus. Should the UI explicitly explain this distinction to participants? An info tooltip? A first-time guide?

3. **Election nomination secrecy:** Should nominations be hidden until ALL eligible members have nominated, or until a deadline? What if some members never nominate?

4. **Topic tool and existing topics entity:** The existing `topics` table in the schema stores discussion topics for teams. Should the topic tool replace or complement this existing entity? Can topics created outside of chat (e.g., agenda items for meetings) be converted into chat topic tools?

---

## Collaboration Notes

### Decisions Made

*(This section will be updated as decisions are made with collaborators.)*

- **2026-02-13:** Initial architecture document created by Nadia.

### Design Rationale

**Why channels mirror organizational structure:**
The VISION document states that communication should understand teams, roles, and governance. By tying channels to teams and orgas, we ensure that access control follows organizational membership automatically, without requiring separate channel management.

**Why embedded tools instead of separate screens:**
The VISION document emphasizes that decisions and votes should be "threaded into the discussion that produced them." Embedded tools keep the decision-making context visible alongside the conversation that motivated it.

**Why separate tables for tool participation:**
Convex mutations are atomic at the document level. If 10 members vote simultaneously and votes are stored in the message document, write conflicts will occur. Separate tables allow concurrent writes without contention.

**Why no rich text in v1:**
The DESIGN_PRINCIPLES document emphasizes pure simplicity: "strip away everything that does not serve the user's goal." For governance communication, plain text is sufficient. Rich text can be added incrementally without changing the data model (the `text` field remains a string; rendering changes are frontend-only).

**Why no typing indicators:**
The UX_PRINCIPLES document says "non-intrusive by default." Typing indicators create social pressure and attention demand. They serve no governance purpose. They can be added later if users request them.

---

*This document is maintained by Nadia, the Chat System Architect. Last updated: 2026-02-13. Implementation plan added: 2026-02-13.*
