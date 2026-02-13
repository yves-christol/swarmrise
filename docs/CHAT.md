# CHAT.md - Swarmrise Communication System

This document defines the architecture, data model, and implementation plan for the Swarmrise chat and communication system. It is maintained by Nadia, the chat system architect.

**Status:** Planning phase. No implementation started.

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
11. [Implementation Phases](#implementation-phases)
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

6. **Low complexity.** The set of concepts is small: channels, messages, threads, embedded tools. No reactions, no statuses, no stories, no bots marketplace. These can be considered later, but the initial system stays lean.

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

## Implementation Phases

### Phase 1: Foundation (Channels and Messages)

**Goal:** Members can send and read text messages in orga and team channels.

**Backend:**
- Create `convex/chat/index.ts` with channel, message, and read position validators
- Create `convex/chat/functions.ts` with:
  - `getChannelsForMember` query
  - `getMessages` query (paginated)
  - `sendMessage` mutation
  - `markAsRead` mutation
  - `getUnreadCounts` query
- Update `convex/schema.ts` with channels, messages, channelReadPositions tables
- Auto-create orga channel when orga is created (update orga creation mutation)
- Auto-create team channel when team is created (update team creation mutation)

**Frontend:**
- Create `ChatPanel` component with channel list and message list
- Create `MessageInput` component
- Create `ChannelListItem` with unread badges
- Integrate chat panel into the authenticated view layout

**Estimated scope:** Core messaging infrastructure.

### Phase 2: Threads and DMs

**Goal:** Members can reply in threads and send direct messages.

**Backend:**
- Add thread support: `threadParentId` on messages, thread reply queries
- Add DM channel creation: `createDMChannel` mutation
- Add DM channel discovery: find existing DM between two members

**Frontend:**
- Create `ThreadPanel` component
- Add DM initiation from member profiles
- Thread reply count display on parent messages

### Phase 3: Topic Tool (Consent-Based Decisions)

**Goal:** Members can initiate and participate in consent-based decisions within chat.

**Backend:**
- Add topicClarifications, topicAnswers, topicResponses tables
- Mutations: `createTopicMessage`, `askClarification`, `answerClarification`, `advanceTopicPhase`, `submitTopicResponse`
- Decision record creation on topic resolution
- Extend `targetType` in decisions to include `"topics"`

**Frontend:**
- Create `TopicTool` embedded component with phase-aware rendering
- Clarification question/answer UI
- Consent response UI with objection reasoning
- Resolved state display with outcome and Decision link

### Phase 4: Voting Tool

**Goal:** Members can create polls and vote.

**Backend:**
- Add votes table
- Mutations: `createVotingMessage`, `submitVote`, `closeVote`
- Vote tally computation (respecting anonymity mode)

**Frontend:**
- Create `VotingTool` embedded component
- Voting mode selection at creation time
- Results visualization (bar chart for single/approval, ranking for ranked)
- Anonymous vs. named result display

### Phase 5: Election Tool

**Goal:** Members can conduct candidateless elections.

**Backend:**
- Add electionNominations, electionResponses tables
- Mutations: `createElectionMessage`, `submitNomination`, `changeNomination`, `advanceElectionPhase`, `submitElectionResponse`
- Decision and role assignment integration

**Frontend:**
- Create `ElectionTool` embedded component with phase-aware rendering
- Hidden nomination phase (reveal after all have nominated)
- Discussion and change round UI
- Consent round UI
- Automatic role assignment prompt

### Phase 6: Polish and Search

**Goal:** Production-ready chat experience.

- Message search within channels and org-wide
- Message editing and deletion
- Channel archival and read-only display
- Notification integration for chat events
- Performance optimization (virtualized message lists, pagination tuning)
- Keyboard shortcuts (Ctrl/Cmd+K for search, Escape to close panels)
- Accessibility audit (screen readers, keyboard navigation, ARIA labels)

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

*This document is maintained by Nadia, the Chat System Architect. Last updated: 2026-02-13.*
