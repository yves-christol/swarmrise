# AI.md -- MCP Integration Proposal for Swarmrise

**Author:** Hal (AI Architect Agent)
**Date:** 2026-02-20
**Status:** Proposal -- pending team review
**MCP Spec Version:** 2025-11-25

---

## Table of Contents

1. [Why AI Agents in a Governance Platform](#1-why-ai-agents-in-a-governance-platform)
2. [Architecture Overview](#2-architecture-overview)
3. [Token-Based Agent Access System](#3-token-based-agent-access-system)
4. [MCP Server Design](#4-mcp-server-design)
   - [Resources (read access)](#41-resources-read-access)
   - [Tools (action access)](#42-tools-action-access)
   - [Prompts (contextual)](#43-prompts-contextual)
5. [Authorization Model](#5-authorization-model)
6. [Security Model and Threat Analysis](#6-security-model-and-threat-analysis)
7. [Integration with Convex Backend](#7-integration-with-convex-backend)
8. [Phased Roadmap](#8-phased-roadmap)
9. [Decision Records](#9-decision-records)
10. [References](#10-references)

---

## 1. Why AI Agents in a Governance Platform

Swarmrise is a governance tool built on transparency, distributed authority, and consent-based decision-making. AI agents are a natural fit -- not to replace human judgment, but to augment human governance with:

- **Synthesis**: Agents can summarize channel discussions, extract action items, and highlight unresolved objections across teams.
- **Accessibility**: Members who cannot attend synchronous discussions can delegate observation to an agent that watches their channels.
- **Analysis**: Agents can analyze decision history, policy compliance, and organizational health metrics across the decision journal.
- **Facilitation**: Agents can assist secretaries by drafting meeting summaries, or assist leaders by surfacing relevant policies during topic discussions.

The critical design constraint: **AI proposes, humans decide.** Agents must operate within the existing governance structure -- scoped to a specific member, inheriting that member's roles and team access. An agent never gains authority beyond what the member who authorized it already possesses.

This aligns with the MCP specification's core principle: "Users must explicitly consent to and understand all data access and operations."

---

## 2. Architecture Overview

The Swarmrise MCP server sits between external AI clients (Claude, GPT, custom agents) and the Convex backend. It exposes organizational data as MCP Resources, governance actions as MCP Tools, and contextual templates as MCP Prompts.

```
+-------------------+       +---------------------+       +------------------+
|                   |       |                     |       |                  |
|  AI Client        | <---> |  Swarmrise MCP      | <---> |  Convex Backend  |
|  (Claude, GPT,    |  MCP  |  Server             | HTTP  |  (queries,       |
|   custom agents)  | JSON- |  (Streamable HTTP)  | calls |   mutations,     |
|                   | RPC   |                     |       |   actions)       |
+-------------------+       +---------------------+       +------------------+
                                    |
                                    | OAuth 2.1
                                    v
                            +---------------------+
                            |  Authorization      |
                            |  Server             |
                            |  (Clerk or custom)  |
                            +---------------------+
```

### Component Roles

| Component | Role | Notes |
|-----------|------|-------|
| AI Client (Host) | MCP client that discovers and invokes resources/tools | Claude Desktop, Cursor, custom agent scripts |
| Swarmrise MCP Server | MCP server + OAuth 2.1 resource server | Validates tokens, maps MCP operations to Convex functions |
| Convex Backend | Data layer and business logic | Existing queries/mutations, multi-tenant isolation |
| Authorization Server | Issues and validates OAuth tokens | Could be Clerk (existing) or a dedicated auth service |

### Transport

The MCP server uses **Streamable HTTP** transport (the current standard, replacing deprecated SSE-only transport). This means:

- A single HTTP endpoint (e.g., `https://api.swarmrise.app/mcp`) handles POST and GET.
- Clients send JSON-RPC messages via POST.
- Server may respond with `application/json` or initiate an SSE stream for long-running operations.
- Session management via `MCP-Session-Id` header.
- Protocol version negotiated at initialization via `MCP-Protocol-Version: 2025-11-25`.

### Deployment Options

Two viable approaches, with a recommendation:

**Option A: Standalone Node.js server (recommended for Phase 1)**

A separate Node.js process that imports the `@modelcontextprotocol/sdk` and calls Convex via the Convex HTTP client (`ConvexHttpClient`). This decouples the MCP layer from the Convex deployment cycle and allows independent scaling, versioning, and security hardening.

**Option B: Convex HTTP action layer**

Extend `convex/http.ts` with MCP routes. Simpler deployment but couples MCP protocol handling with backend functions and limits flexibility (Convex actions have execution time limits, and long-running SSE streams may not fit well).

**Decision: Option A for Phase 1.** The MCP server is a stateful protocol with session management, SSE streaming, and OAuth flows that benefit from a dedicated process. The Convex HTTP client provides efficient access to the backend from an external service.

---

## 3. Token-Based Agent Access System

### Design Principles

Every agent token is scoped to a **member** (not a user). This is critical because:

- A `Member` is the org-scoped identity in Swarmrise (a `User` can be a member of multiple orgs).
- A `Member` holds specific `roleIds[]` that determine team access and governance capabilities.
- Multi-tenant isolation is enforced at the member level -- an agent inherits exactly the same access boundaries as the human member who authorized it.

### Token Scopes

Tokens encode the following dimensions:

| Dimension | Description | Source |
|-----------|-------------|--------|
| `orgaId` | Which organization the token grants access to | From the Member record |
| `memberId` | Which member the agent acts on behalf of | The authorizing member |
| `roleIds[]` | Which roles the agent can exercise | Subset of the member's `roleIds[]` |
| `permission` | `readonly` or `action` | Chosen at token creation time |
| `resourceScopes[]` | Which resource types the token can access | e.g., `["channels", "decisions", "policies"]` |
| `expiry` | Token expiration timestamp | Short-lived (1 hour default) |

### Permission Levels

**`readonly`** -- The agent can:
- List and read teams, members, roles, channels, messages, decisions, policies, topics.
- Search messages.
- Read governance tool states (topic phases, vote tallies, election statuses).

**`action`** -- The agent can do everything in `readonly`, plus:
- Send messages to channels the member has access to.
- Add reactions to messages.
- Cast votes on behalf of the member (in open voting tools).
- Respond to topics (consent/objection/stand aside) on behalf of the member.
- Nominate members in candidateless elections.

Actions the agent can **never** perform, regardless of permission level:
- Create or delete teams, roles, or members (structural changes require human action).
- Modify policies (policy ownership is tied to role holders, requiring human accountability).
- Delete messages or channels.
- Accept or reject invitations.
- Change organization settings.

### Role-Based Access Scoping

The agent's access is further scoped by the roles included in the token:

```
Member (Alice)
  |-- roleIds: [role_A (leader, Team Alpha), role_B (secretary, Team Beta)]
  |
  Token for agent:
    roleIds: [role_A]  <-- Only Team Alpha access
    permission: readonly
    resourceScopes: ["channels", "messages", "decisions"]
```

When the agent requests resources:
1. The MCP server resolves `roleIds` to `teamIds` via the existing Role -> Team relationship.
2. Channel access follows the same rules as `requireChannelAccess` in `convex/chat/access.ts`:
   - Orga-wide channels: accessible if the member belongs to the org.
   - Team channels: accessible only if the member holds a role in that team.
   - DM channels: never accessible to agents (private human communication).
3. Decision records are filtered by `orgaId` (org-wide visibility, matching the transparency principle).
4. Policies are org-wide readable (matching the existing visibility model).

### Token Lifecycle

```
  Member authorizes agent
        |
        v
  [Token Created]  <-- Short-lived (1h), signed JWT
        |
        v
  [Agent uses token] --> [MCP Server validates]
        |                       |
        |               Token valid?
        |              /          \
        |           Yes            No --> 401 Unauthorized
        |            |
        v            v
  [Access granted] [Refresh if needed]
        |
        v
  [Audit: Decision record created for every action-level operation]
```

---

## 4. MCP Server Design

### 4.1 Resources (read access)

Resources expose organizational data for AI agents to read. Each resource is identified by a URI using the custom `swarmrise://` scheme.

#### Resource Templates

These are parameterized URI patterns that agents can use to discover and read specific data.

| URI Template | Name | Description | MIME Type |
|-------------|------|-------------|-----------|
| `swarmrise://orgas/{orgaId}` | Organization | Organization details (name, accent color, owner) | `application/json` |
| `swarmrise://orgas/{orgaId}/teams` | Teams | All teams in the organization | `application/json` |
| `swarmrise://orgas/{orgaId}/teams/{teamId}` | Team | Single team with its roles | `application/json` |
| `swarmrise://orgas/{orgaId}/members` | Members | All members in the organization | `application/json` |
| `swarmrise://orgas/{orgaId}/members/{memberId}` | Member | Single member with their roles and teams | `application/json` |
| `swarmrise://orgas/{orgaId}/roles` | Roles | All roles (filtered by token's role scope) | `application/json` |
| `swarmrise://orgas/{orgaId}/channels` | Channels | Accessible channels (orga-wide + team channels for token's roles) | `application/json` |
| `swarmrise://orgas/{orgaId}/channels/{channelId}/messages` | Messages | Messages in a channel (paginated, most recent first) | `application/json` |
| `swarmrise://orgas/{orgaId}/channels/{channelId}/messages/{messageId}/thread` | Thread | Thread replies for a message | `application/json` |
| `swarmrise://orgas/{orgaId}/decisions` | Decisions | Decision audit trail (paginated, most recent first) | `application/json` |
| `swarmrise://orgas/{orgaId}/policies` | Policies | All organization policies | `application/json` |
| `swarmrise://orgas/{orgaId}/policies/{policyId}` | Policy | Single policy with full text | `application/json` |
| `swarmrise://orgas/{orgaId}/topics` | Topics | Active topics across accessible teams | `application/json` |
| `swarmrise://orgas/{orgaId}/governance-tools` | Governance Tools | Active embedded tools (topic/consent, voting, election) in accessible channels | `application/json` |

#### Resource Subscription Support

The MCP server will declare `subscribe: true` and `listChanged: true` capabilities. This allows agents to:

- Subscribe to specific channels for real-time message updates.
- Receive notifications when governance tools change state (e.g., a topic moves from "clarification" to "consent" phase).
- Get notified when the team/role structure changes.

This maps naturally to Convex's reactive query system -- the MCP server can maintain Convex subscriptions and forward changes as MCP resource update notifications.

#### Example: Reading channel messages

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/read",
  "params": {
    "uri": "swarmrise://orgas/k17abc123/channels/k17def456/messages?limit=50"
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "contents": [
      {
        "uri": "swarmrise://orgas/k17abc123/channels/k17def456/messages",
        "mimeType": "application/json",
        "text": "[{\"_id\":\"k17msg001\",\"text\":\"We should revisit the Q2 budget...\",\"authorName\":\"Alice Martin\",\"createdAt\":\"2026-02-19T14:30:00Z\",\"embeddedTool\":{\"type\":\"topic\",\"title\":\"Q2 Budget Review\",\"phase\":\"clarification\"},\"threadCount\":3,\"reactions\":[{\"emoji\":\"thumbsup\",\"count\":2}]}]"
      }
    ]
  }
}
```

### 4.2 Tools (action access)

Tools allow agents to perform governance actions. All tools require an `action`-level token. Every tool invocation creates a Decision record for audit.

| Tool Name | Description | Input Schema | Required Role Scope |
|-----------|-------------|-------------|-------------------|
| `send_message` | Post a message to a channel | `{ channelId, text, threadParentId? }` | Any role with channel access |
| `react_to_message` | Add an emoji reaction | `{ messageId, emoji }` | Any role with channel access |
| `cast_vote` | Vote on an active voting tool | `{ messageId, choices[] }` | Any role with channel access |
| `respond_to_topic` | Respond to a consent process | `{ messageId, response: "consent"\|"objection"\|"stand_aside", reason? }` | Any role in the topic's team |
| `ask_clarification` | Ask a clarification question on a topic | `{ messageId, question }` | Any role in the topic's team |
| `nominate_member` | Nominate someone in a candidateless election | `{ messageId, nomineeId, reason }` | Any role in the election's team |
| `respond_to_election` | Respond to an election consent round | `{ messageId, response: "consent"\|"objection"\|"stand_aside", reason? }` | Any role in the election's team |
| `search_messages` | Full-text search across accessible channels | `{ query, channelId? }` | Any role (results filtered by access) |

#### Tool Annotations

Each tool includes annotations to help AI clients understand the tool's behavior:

```json
{
  "name": "cast_vote",
  "title": "Cast Vote",
  "description": "Cast a vote on an active voting tool in a channel message. The vote is recorded on behalf of the member associated with this agent's token. Requires action-level permission and a role with access to the channel containing the voting tool.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "messageId": {
        "type": "string",
        "description": "The Convex ID of the message containing the voting tool"
      },
      "choices": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of option IDs to vote for. For single-choice mode, provide exactly one. For approval mode, provide one or more. For ranked mode, provide in preference order."
      }
    },
    "required": ["messageId", "choices"]
  },
  "annotations": {
    "title": "Cast Vote",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

#### Audit Trail

Every tool invocation that mutates data generates a Decision record:

```typescript
{
  orgaId: token.orgaId,
  authorEmail: member.email,         // The human member who authorized the agent
  roleName: "AI Agent (via Alice)",  // Clearly marked as agent action
  teamName: team.name,
  targetId: messageId,
  targetType: "topics",              // or "elections", etc.
  diff: {
    type: "Topic",
    before: { phase: "clarification" },
    after: { phase: "consent", outcome: "accepted" }
  }
}
```

The `roleName` field explicitly marks actions as agent-initiated, maintaining the transparency principle.

### 4.3 Prompts (contextual)

Prompts provide pre-built templates that help AI clients interact effectively with Swarmrise data. These are user-controlled -- the human selects which prompt to use.

| Prompt Name | Description | Arguments |
|-------------|-------------|-----------|
| `governance_context` | Provides the member's roles, teams, active topics, and pending governance actions | `{ orgaId }` |
| `meeting_summary` | Summarizes recent activity in a team channel, highlighting decisions, votes, and topic outcomes | `{ channelId, since? }` |
| `policy_review` | Gathers all policies related to a team and formats them for review or discussion | `{ teamId }` |
| `decision_history` | Summarizes recent decisions affecting a team or the whole organization | `{ orgaId, teamId?, limit? }` |
| `topic_briefing` | Provides full context for a specific topic: the proposal, clarification Q&A, and current consent status | `{ messageId }` |
| `election_briefing` | Summarizes a candidateless election: nominations, discussion points, and consent status | `{ messageId }` |
| `member_overview` | Provides a comprehensive view of a member's roles, duties, policies, and recent activity | `{ memberId }` |

#### Example: governance_context prompt

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/get",
  "params": {
    "name": "governance_context",
    "arguments": { "orgaId": "k17abc123" }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "description": "Current governance context for Alice in Acme Corp",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "You are acting on behalf of Alice Martin in the organization Acme Corp.\n\nAlice holds the following roles:\n- Product Lead (Team: Product, mission: 'Define and prioritize the product roadmap')\n- Secretary (Team: Operations, mission: 'Ensure documentation and procedural integrity')\n\nActive governance items requiring attention:\n- Topic: 'Q2 Budget Review' in Team Product channel (phase: clarification, 2 unanswered questions)\n- Voting: 'Office location preference' in Org channel (deadline: 2026-02-22, Alice has not voted)\n- Election: 'New Design Lead' in Team Product (phase: nomination, 3 nominations so far)\n\nRecent decisions (last 7 days): 4 decisions recorded.\n\nPolicies owned by Alice's roles: 3 policies (Policy #7, #12, #15)."
        }
      }
    ]
  }
}
```

---

## 5. Authorization Model

The MCP specification mandates OAuth 2.1 for HTTP-based transports. Here is how Swarmrise implements it.

### Roles

| MCP Role | Swarmrise Implementation |
|----------|------------------------|
| MCP Server (Resource Server) | The Swarmrise MCP server validates Bearer tokens on every request |
| MCP Client | The AI agent application (Claude Desktop, Cursor, custom client) |
| Authorization Server | Either Clerk (existing) or a dedicated lightweight auth service |

### Authorization Flow

```
AI Client                     MCP Server                    Auth Server
    |                             |                             |
    |-- POST /mcp (no token) --> |                             |
    |<-- 401 Unauthorized -------|                             |
    |   WWW-Authenticate: Bearer |                             |
    |   resource_metadata="..."  |                             |
    |                             |                             |
    |-- GET /.well-known/        |                             |
    |   oauth-protected-resource |                             |
    |<-- Protected Resource      |                             |
    |   Metadata (with auth      |                             |
    |   server URL) -------------|                             |
    |                             |                             |
    |-- GET auth server metadata --------------------------->  |
    |<-- Authorization Server Metadata --------------------- |
    |                             |                             |
    |-- Authorization Code + PKCE --------------------------> |
    |   (user logs in via Clerk,  |                             |
    |    selects org + member +   |                             |
    |    roles + permission level)|                             |
    |<-- Access Token + Refresh Token ---------------------- |
    |                             |                             |
    |-- POST /mcp + Bearer token >|                             |
    |<-- MCP Response ------------|                             |
```

### Token Claims (JWT)

```json
{
  "iss": "https://auth.swarmrise.app",
  "sub": "member_k17abc123",
  "aud": "https://api.swarmrise.app/mcp",
  "exp": 1740150000,
  "iat": 1740146400,
  "scope": "readonly",
  "swarmrise": {
    "orgaId": "k17org456",
    "memberId": "k17mem789",
    "roleIds": ["k17role_a", "k17role_b"],
    "resourceScopes": ["channels", "messages", "decisions", "policies", "teams", "members", "roles"],
    "permission": "readonly"
  }
}
```

### Scopes

The authorization server defines these OAuth scopes:

| Scope | Description |
|-------|-------------|
| `swarmrise:read` | Read access to organizational data (resources only) |
| `swarmrise:write` | Write access (tools -- send messages, cast votes, etc.) |
| `swarmrise:governance` | Governance actions (respond to topics, elections) |

Scope combinations:
- `readonly` token = `swarmrise:read`
- `action` token = `swarmrise:read swarmrise:write swarmrise:governance`

### Consent Screen

During the OAuth flow, the user (member) sees a consent screen that clearly lists:

1. Which organization the agent will access.
2. Which roles the agent will operate under.
3. Whether the agent can read only or also perform actions.
4. Which resource types the agent can access.
5. The token expiration period.

This aligns with Swarmrise's transparency principle and the MCP spec's requirement for explicit user consent.

---

## 6. Security Model and Threat Analysis

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Token theft** | Short-lived tokens (1h), refresh token rotation, HTTPS-only transport, secure token storage guidance for clients |
| **Agent impersonation** | All agent actions are tagged with `"AI Agent (via [Member Name])"` in Decision records. Members can review and revoke agent access at any time. |
| **Cross-tenant data leakage** | Token is bound to a single `orgaId`. The MCP server validates `orgaId` on every request and delegates to Convex queries that enforce `by_orga` index filtering. |
| **Privilege escalation** | Token's `roleIds` are validated against the member's current `roleIds` at request time (not just at token issuance). If a member loses a role, the agent's access is immediately reduced. |
| **DM privacy violation** | DM channels are explicitly excluded from agent access, regardless of token scope. |
| **Automated spam/abuse** | Rate limiting per token: 60 read requests/min, 10 write requests/min. Rate limits are configurable per organization. |
| **Unauthorized structural changes** | Tools are limited to communication and governance participation. No tools exist for creating/deleting teams, roles, members, or policies. |
| **DNS rebinding** | MCP server validates `Origin` header on all requests (required by MCP spec for Streamable HTTP). |
| **Token audience mismatch** | Server validates `aud` claim matches the MCP server's canonical URI. Tokens issued for other services are rejected. |
| **Session hijacking** | `MCP-Session-Id` is a cryptographically secure UUID. Sessions are bound to the originating token. |

### Security Invariants

These invariants must hold at all times:

1. **An agent can never see data that its authorizing member cannot see.** This is enforced by resolving the token's `memberId` and `roleIds` and applying the same access checks as the web application.

2. **An agent can never perform an action that its authorizing member cannot perform.** Tool invocations check the member's current roles and channel access before executing.

3. **Every agent mutation is recorded in the Decision journal.** There are no silent writes. The audit trail distinguishes human actions from agent actions.

4. **Token revocation is immediate.** Revoking a token (via the Swarmrise UI or API) adds it to a server-side revocation list checked on every request. Short token lifetimes (1h) provide a natural cleanup.

5. **DM channels are never accessible to agents.** This is a hard rule, not a configurable option.

### Rate Limiting

| Operation Type | Default Limit | Configurable |
|---------------|--------------|-------------|
| Resource reads | 60/minute per token | Yes, per org |
| Tool invocations | 10/minute per token | Yes, per org |
| Search queries | 20/minute per token | Yes, per org |
| Session initialization | 5/hour per member | No |

---

## 7. Integration with Convex Backend

### Mapping MCP Operations to Convex Functions

The MCP server translates MCP protocol operations into Convex client calls. Here is the mapping for key operations.

#### Resources -> Convex Queries

| MCP Resource | Convex Query | Notes |
|-------------|-------------|-------|
| `swarmrise://orgas/{orgaId}` | `api.orgas.functions.getOrga` | Validates org membership via token |
| `swarmrise://orgas/{orgaId}/teams` | `api.teams.functions.getTeams` | Returns all teams in org |
| `swarmrise://orgas/{orgaId}/members` | `api.members.functions.getMembers` | Returns all members in org |
| `swarmrise://orgas/{orgaId}/channels` | `api.chat.functions.listChannels` | Filtered by token's role-based access |
| `swarmrise://orgas/{orgaId}/channels/{channelId}/messages` | `api.chat.functions.listMessages` | Access checked per `requireChannelAccess` pattern |
| `swarmrise://orgas/{orgaId}/decisions` | `api.decisions.functions.getDecisionsByOrga` | Org-wide, paginated |
| `swarmrise://orgas/{orgaId}/policies` | `api.policies.functions.getPolicies` | Org-wide readable |

#### Tools -> Convex Mutations

| MCP Tool | Convex Mutation | Notes |
|----------|----------------|-------|
| `send_message` | `api.chat.functions.sendMessage` | Channel access check + creates Decision record |
| `react_to_message` | `api.chat.functions.addReaction` | Channel access check |
| `cast_vote` | `api.chat.functions.castVote` | Validates voting tool is open |
| `respond_to_topic` | `api.chat.functions.respondToTopic` | Validates topic phase is "consent" |
| `ask_clarification` | `api.chat.functions.askClarification` | Validates topic phase is "clarification" |
| `nominate_member` | `api.chat.functions.nominate` | Validates election phase is "nomination" |
| `search_messages` | `api.chat.functions.searchMessages` | Uses existing search index, filtered by access |

### New Convex Functions Needed

The MCP server will need a few new internal queries that existing functions do not provide:

```typescript
// convex/mcp/functions.ts

// Resolve a token's roleIds to the teams they grant access to
export const resolveTokenAccess = internalQuery({
  args: {
    memberId: v.id("members"),
    roleIds: v.array(v.id("roles")),
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    teamIds: v.array(v.id("teams")),
    channelIds: v.array(v.id("channels")),
  }),
  handler: async (ctx, args) => {
    // 1. Validate member exists and belongs to org
    // 2. Validate roleIds are a subset of member's current roleIds
    // 3. Resolve roles -> teams -> channels
    // 4. Add orga-wide channels
    // 5. Exclude DM channels
  },
});

// Get active governance tools (topics, votes, elections) across accessible channels
export const getActiveGovernanceTools = internalQuery({
  args: {
    orgaId: v.id("orgas"),
    channelIds: v.array(v.id("channels")),
  },
  returns: v.array(v.object({
    messageId: v.id("messages"),
    channelId: v.id("channels"),
    toolType: v.union(v.literal("topic"), v.literal("voting"), v.literal("election")),
    title: v.string(),
    phase: v.optional(v.string()),
    isClosed: v.optional(v.boolean()),
  })),
  handler: async (ctx, args) => {
    // Query messages with embeddedTool across the given channels
    // Filter to active (non-resolved, non-closed) tools
  },
});

// Validate an agent token's claims against current database state
export const validateTokenClaims = internalQuery({
  args: {
    memberId: v.id("members"),
    orgaId: v.id("orgas"),
    roleIds: v.array(v.id("roles")),
  },
  returns: v.object({
    valid: v.boolean(),
    currentRoleIds: v.array(v.id("roles")),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Check member exists and belongs to org
    // 2. Check that token's roleIds are still a subset of member's roleIds
    // 3. Return validation result
  },
});
```

### Authentication Bypass for Agent Tokens

Current Convex functions use `ctx.auth.getUserIdentity()` (Clerk JWT) for authentication. The MCP server operates outside the Clerk auth flow, so it must:

1. Validate the agent token (JWT) independently.
2. Use the `ConvexHttpClient` with appropriate internal functions that accept `memberId` as an argument rather than relying on `ctx.auth`.
3. New internal functions (prefixed `mcp_`) accept an explicit `memberId` parameter and perform the same access checks as existing functions but without requiring a Clerk session.

This is a clean separation: the MCP server handles agent authentication, then calls internal Convex functions that trust the validated identity.

---

## 8. Phased Roadmap

### Phase 1: Foundation (4-6 weeks)

**Goal:** Read-only MCP server with token system.

Deliverables:
- [ ] Standalone Node.js MCP server with Streamable HTTP transport
- [ ] OAuth 2.1 authorization flow (token issuance for a member + org + roles)
- [ ] Protected Resource Metadata endpoint (RFC 9728)
- [ ] Core resources: organization, teams, members, roles, channels, messages
- [ ] Token validation middleware
- [ ] Rate limiting
- [ ] `swarmrise:read` scope
- [ ] Unit tests for token validation and access scoping
- [ ] Integration test: Claude Desktop connecting to the MCP server and reading org data

### Phase 2: Governance Tools (3-4 weeks)

**Goal:** Read access to governance data + search.

Deliverables:
- [ ] Resources: decisions, policies, topics, governance tools
- [ ] `search_messages` tool (read-only, uses existing search index)
- [ ] Prompts: `governance_context`, `meeting_summary`, `policy_review`
- [ ] Resource subscriptions (real-time updates via Convex reactivity)
- [ ] Pagination support for all list resources

### Phase 3: Actions (3-4 weeks)

**Goal:** Write capabilities via MCP tools.

Deliverables:
- [ ] `swarmrise:write` and `swarmrise:governance` scopes
- [ ] Tools: `send_message`, `react_to_message`, `cast_vote`
- [ ] Tools: `respond_to_topic`, `ask_clarification`, `nominate_member`, `respond_to_election`
- [ ] Decision record generation for all agent mutations
- [ ] Agent action UI indicator in the Swarmrise web app (so humans see which messages/votes came from agents)
- [ ] Token management UI: create, view, revoke tokens from the member settings page

### Phase 4: Advanced Features (ongoing)

**Goal:** Production hardening and advanced capabilities.

Deliverables:
- [ ] Token revocation list with real-time propagation
- [ ] Per-organization rate limit configuration
- [ ] Prompts: `decision_history`, `topic_briefing`, `election_briefing`, `member_overview`
- [ ] Agent activity dashboard (org admins can see all agent actions)
- [ ] Webhook notifications for agent actions (for external monitoring)
- [ ] Multi-agent coordination patterns (future: agents discussing in channels)

---

## 9. Decision Records

This section records architectural decisions made in this proposal.

### DR-001: Custom URI scheme `swarmrise://`

**Context:** MCP resources need URI identifiers. The spec allows custom URI schemes.

**Decision:** Use `swarmrise://orgas/{orgaId}/...` as the URI scheme for all resources.

**Rationale:** This makes resource URIs self-documenting, avoids confusion with `https://` URLs (which MCP reserves for directly-fetchable web resources), and cleanly encodes the multi-tenant hierarchy (org -> team -> channel -> message).

### DR-002: Member-scoped tokens, not user-scoped

**Context:** Swarmrise has both `User` (global identity) and `Member` (org-scoped identity with roles).

**Decision:** Agent tokens are scoped to a `Member`, not a `User`.

**Rationale:** A user can belong to multiple organizations. Each membership has different roles and access. Scoping to a member provides the correct authorization boundary and prevents cross-org data leakage. An agent that needs access to multiple orgs must use separate tokens.

### DR-003: DM channels are never agent-accessible

**Context:** DM (direct message) channels are private conversations between two members.

**Decision:** DM channels are excluded from agent access unconditionally.

**Rationale:** DMs represent private human-to-human communication. Exposing them to agents, even with the member's consent, creates a chilling effect on candid communication and violates the trust model. If a member wants to share DM content with an agent, they can copy it into a team channel.

### DR-004: Standalone Node.js server over Convex HTTP actions

**Context:** The MCP server could be built as Convex HTTP routes or a standalone service.

**Decision:** Standalone Node.js server using `ConvexHttpClient`.

**Rationale:** MCP's Streamable HTTP transport requires stateful session management and long-lived SSE connections that do not fit well within Convex's action execution model. A dedicated server also allows independent versioning, scaling, and security configuration without coupling to backend deployments.

### DR-005: Structural mutations are never available to agents

**Context:** Agents could theoretically create teams, assign roles, or modify policies.

**Decision:** Agent tools are limited to communication and governance participation (messages, votes, topic responses, election nominations).

**Rationale:** Structural changes to an organization (creating teams, assigning roles, writing policies) are governance acts that require human accountability. Swarmrise's consent-based decision model depends on human judgment for these actions. Agents can inform and assist, but the structural authority stays with humans.

---

## 10. References

### MCP Specification

- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) -- The authoritative protocol reference.
- [MCP Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) -- Streamable HTTP transport details.
- [MCP Authorization (draft)](https://modelcontextprotocol.io/specification/draft/basic/authorization) -- OAuth 2.1 authorization model.
- [MCP Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) -- Resource definition and subscription.
- [MCP Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) -- Tool definition and invocation.
- [MCP Prompts](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) -- Prompt templates.

### Background

- [MCP as the USB-C of AI](https://simonwillison.net/2024/Nov/25/model-context-protocol/) -- Simon Willison's introduction to MCP.
- [MCP Authorization Spec Update (Nov 2025)](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update) -- Enterprise authorization extensions.
- [Why MCP Deprecated SSE](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/) -- Transport evolution from SSE to Streamable HTTP.
- [MCP OAuth 2.1 Deep Dive](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/) -- OAuth 2.1 and PKCE in MCP.

### Swarmrise Internal

- [VISION.md](/docs/VISION.md) -- Swarmrise vision and core beliefs.
- [SECURITY.md](/docs/SECURITY.md) -- Security assessment report.
- [DATA_MODEL.md](/docs/DATA_MODEL.md) -- Data model documentation.
- [CHAT.md](/docs/CHAT.md) -- Chat system documentation.

---

*This document is maintained by Hal, the AI Architect Agent. It will be updated as the design evolves through team review and implementation.*
