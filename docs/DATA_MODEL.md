# Swarmrise Data Model Philosophy

This document captures the design principles, architectural decisions, and rationale behind the Swarmrise data model. It serves as a guide for understanding existing patterns and making consistent decisions for future development.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Primary Entities](#primary-entities)
4. [Secondary Entities](#secondary-entities)
5. [Key Design Patterns](#key-design-patterns)
6. [Indexing Strategy](#indexing-strategy)
7. [Type Definition Pattern](#type-definition-pattern)
8. [Multi-Tenant Isolation](#multi-tenant-isolation)
9. [Audit Trail with Decisions](#audit-trail-with-decisions)
10. [Team Hierarchy Model](#team-hierarchy-model)
11. [Design Decisions Rationale](#design-decisions-rationale)
12. [Notification System](#notification-system)
13. [Migration History](#migration-history)

---

## Core Principles

### 1. Multi-Tenant First
Every organizational entity includes an `orgaId` field for tenant isolation. This enables efficient queries scoped to a single organization and prevents data leakage between tenants.

### 2. Denormalization for Read Performance
The `Member` entity intentionally duplicates `User` data (firstname, surname, email, pictureURL, contactInfos). This trade-off prioritizes read performance over storage efficiency, eliminating joins when displaying member information within an organization context.

### 3. Role-Based Access and Structure
Roles are first-class citizens in the data model. They define not just permissions but organizational structure. The three special role types (leader, secretary, referee) carry semantic meaning beyond simple labels.

### 4. Complete Audit Trail
Every modification to organizational data creates a `Decision` record with before/after diffs. This provides full traceability for governance and compliance.

### 5. Index-First Query Design
All queries must use `withIndex()` rather than `filter()`. Indexes are designed upfront to support known query patterns, ensuring predictable performance at scale.

---

## Entity Relationship Diagram

```
                                    +----------------+
                                    |     User       |
                                    +----------------+
                                    | _id            |
                                    | email          |
                                    | firstname      |
                                    | surname        |
                                    | pictureURL?    |
                                    | contactInfos[] |
                                    | orgaIds[]  ----+----> References multiple Orgas
                                    +----------------+
                                           |
                                           | personId (1:N - one User can be Member in many Orgas)
                                           v
+----------------+                +------------------+                +----------------+
|     Orga       |<-- orgaId ----|     Member       |---- roleIds -->|     Role       |
+----------------+                +------------------+                +----------------+
| _id            |                | _id              |                | _id            |
| name           |                | orgaId           |                | orgaId         |
| logoUrl?       |                | personId         |                | teamId         |
| colorScheme    |                | firstname        |                | parentTeamId?  |
| owner ---------|-->User._id    | surname          |                | title          |
+----------------+                | email            |                | roleType?      |
       |                          | pictureURL?      |                | mission        |
       |                          | contactInfos[]   |                | duties[]       |
       |                          | roleIds[]        |                | memberId       |
       |                          +------------------+                +----------------+
       |                                                                     |
       |                                                                     | teamId
       v                                                                     v
+----------------+                                                   +----------------+
|     Team       |<--------------------------------------------------|   (belongs to) |
+----------------+                                                   +----------------+
| _id            |
| orgaId         |
| name           |
+----------------+
       |
       | teamId (1:N)
       v
+------------------+    +------------------+    +------------------+
|     Topic        |    |     Policy       |    |   Invitation     |
+------------------+    +------------------+    +------------------+
| _id              |    | _id              |    | _id              |
| teamId           |    | orgaId           |    | orgaId           |
| roleId           |    | teamId           |    | emitterMemberId  |
| title            |    | roleId           |    | email            |
| text             |    | issuedDate       |    | status           |
| issuedDate       |    | title            |    | sentDate         |
+------------------+    | text             |    +------------------+
                        | visibility       |
                        | expirationDate?  |
                        +------------------+

+--------------------+
|     Decision       |  (Audit Trail)
+--------------------+
| _id                |
| orgaId             |
| authorEmail        |
| roleName           |
| teamName           |
| targetId           |
| targetType         |
| diff               | --> Discriminated union with before/after states
+--------------------+


+------------------------+                    +-------------------------------+
|     Notification       |                    |   NotificationPreferences     |
+------------------------+                    +-------------------------------+
| _id                    |                    | _id                           |
| userId ----------------+---> User._id <-----+ userId                        |
| orgaId?                |                    | orgaId?                       |
| memberId?              |                    | invitation (channel prefs)    |
| payload (union) -------|-> category-specific| message (channel prefs)       |
| priority               |                    | policy_global (channel prefs) |
| isRead                 |                    | policy_team (channel prefs)   |
| readAt?                |                    | decision (channel prefs)      |
| isArchived             |                    | role_assignment (channel prefs)|
| archivedAt?            |                    | mention (channel prefs)       |
| expiresAt?             |                    | system (channel prefs)        |
| groupKey?              |                    | quietHoursStart?              |
+------------------------+                    | quietHoursEnd?                |
                                              | digestFrequency               |
                                              +-------------------------------+
```

---

## Primary Entities

### User
The root identity entity representing a person in the system.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"users">` | System-generated unique identifier |
| `firstname` | `string` | User's first name |
| `surname` | `string` | User's last name |
| `email` | `string` | Primary email (indexed, used for auth lookup) |
| `pictureURL` | `string?` | Optional profile picture URL |
| `contactInfos` | `ContactInfo[]` | Array of contact methods (LinkedIn, mobile, etc.) |
| `orgaIds` | `Id<"orgas">[]` | Organizations this user belongs to |

**Key Decisions:**
- `orgaIds` is stored on User (not derived) for fast "my organizations" queries
- Email is the unique identifier for matching Clerk identity to internal user

### Orga (Organization)
The tenant container for all organizational data.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"orgas">` | System-generated unique identifier |
| `name` | `string` | Organization display name |
| `logoUrl` | `string?` | Optional organization logo |
| `colorScheme` | `ColorScheme` | Primary and secondary RGB colors for branding |
| `owner` | `Id<"users">` | The User who owns this organization |
| `authorizedEmailDomains` | `string[]?` | Optional list of allowed email domains for invitations |

**Key Decisions:**
- `owner` references a User, not a Member, because ownership transcends membership
- Color scheme is stored as RGB objects for flexibility in rendering
- `authorizedEmailDomains` enables organizations to restrict invitations to specific email domains (e.g., only `@company.com` emails). When set and non-empty, the backend enforces this restriction at invitation creation time.

### Member
A User's presence within a specific Organization. This is the "persona" of a User in an Orga context.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"members">` | System-generated unique identifier |
| `orgaId` | `Id<"orgas">` | The organization this membership belongs to |
| `personId` | `Id<"users">` | Reference to the underlying User |
| `firstname` | `string` | Denormalized from User |
| `surname` | `string` | Denormalized from User |
| `email` | `string` | Denormalized from User |
| `pictureURL` | `string?` | Denormalized from User |
| `contactInfos` | `ContactInfo[]` | Denormalized from User |
| `roleIds` | `Id<"roles">[]` | Roles held by this member |

**Why Denormalization:**
- Avoids N+1 queries when listing organization members
- Allows member profiles to diverge from user profiles if needed in the future
- Simplifies frontend components that only need member context

### Team
A group within an Organization that contains Roles.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"teams">` | System-generated unique identifier |
| `orgaId` | `Id<"orgas">` | The organization this team belongs to |
| `name` | `string` | Team display name |

**Key Decisions:**
- Teams are flat entities; hierarchy is modeled through Role relationships
- Every organization starts with exactly one top-level team

### Role
A position within a Team, assigned to a Member.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"roles">` | System-generated unique identifier |
| `orgaId` | `Id<"orgas">` | Denormalized for efficient org-wide role queries |
| `teamId` | `Id<"teams">` | The team this role belongs to |
| `parentTeamId` | `Id<"teams">?` | For leader roles: connects to parent team hierarchy |
| `linkedRoleId` | `Id<"roles">?` | For leader roles: the source role in parent team (double role pattern) |
| `title` | `string` | Role title (e.g., "Product Manager") |
| `roleType` | `SpecialRole?` | Optional: "leader", "secretary", or "referee" |
| `mission` | `string` | Role's purpose statement |
| `duties` | `string[]` | List of responsibilities |
| `memberId` | `Id<"members">` | The member holding this role |

**Special Role Types:**
- `leader`: The accountable person for a team. Exactly one per team. Can have `parentTeamId` to establish hierarchy and `linkedRoleId` for the double role pattern.
- `secretary`: Handles team administration and record-keeping
- `referee`: Resolves conflicts and ensures process adherence

### Decision
Audit trail entry for any modification to organizational data.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `Id<"decisions">` | System-generated unique identifier |
| `orgaId` | `Id<"orgas">` | The organization context |
| `authorEmail` | `string` | Email of the person who made the change |
| `roleName` | `string` | The role they were acting in |
| `teamName` | `string` | The team context |
| `targetId` | `Id<...>` | ID of the modified entity |
| `targetType` | `TargetType` | Type of entity: orgas, teams, roles, members, policies, invitations |
| `diff` | `DiffType` | Discriminated union with before/after states |

---

## Secondary Entities

### Invitation
Represents a pending invitation to join an organization.

| Field | Type | Description |
|-------|------|-------------|
| `orgaId` | `Id<"orgas">` | Target organization |
| `emitterMemberId` | `Id<"members">` | Who sent the invitation |
| `email` | `string` | Invitee's email address |
| `status` | `InvitationStatus` | "pending", "rejected", or "accepted" |
| `sentDate` | `number` | Timestamp when invitation was sent |

### Policy
A document published by a Role, belonging to a Team within an Organization.

| Field | Type | Description |
|-------|------|-------------|
| `orgaId` | `Id<"orgas">` | Organization context |
| `teamId` | `Id<"teams">` | Team that owns the policy |
| `roleId` | `Id<"roles">` | Role that authored the policy |
| `issuedDate` | `number` | Publication timestamp |
| `title` | `string` | Policy title |
| `text` | `string` | Policy content |
| `visibility` | `PolicyVisibility` | "private" or "public" |
| `expirationDate` | `number?` | Optional expiration |

### Topic
A discussion item within a Team, raised by a Role.

| Field | Type | Description |
|-------|------|-------------|
| `teamId` | `Id<"teams">` | Team context |
| `roleId` | `Id<"roles">` | Role that raised the topic |
| `title` | `string` | Topic title |
| `text` | `string` | Topic description |
| `issuedDate` | `number` | When the topic was raised |

---

## Key Design Patterns

### 1. Dual Validator Pattern

Every entity defines two validators:
1. `entityType` - Contains only the fields (no system fields)
2. `entityValidator` - Includes `_id` and `_creationTime`

```typescript
// convex/<domain>/index.ts
export const roleType = v.object({
  orgaId: v.id("orgas"),
  teamId: v.id("teams"),
  title: v.string(),
  // ... other fields
})

export const roleValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  ...roleType.fields
})
```

**Why This Pattern:**
- `entityType` is used in `schema.ts` table definitions
- `entityValidator` is used for return type validation in queries
- DRY principle: field definitions are not duplicated

### 2. Bidirectional Role-Member References

- `Role.memberId` points to the member holding the role
- `Member.roleIds[]` lists all roles held by the member

**Why Bidirectional:**
- "Who holds this role?" -> Direct lookup via `Role.memberId`
- "What roles does this member have?" -> Direct lookup via `Member.roleIds`
- No joins required for either direction

**Consistency Requirement:**
When assigning/unassigning roles, both sides must be updated atomically.

### 3. Linked Roles Pattern (Double Role)

When a child team is created from a role in a parent team, the role holder serves a "double role":
- The **original role** remains in the parent team (representing the child team)
- A **leader role** is created in the child team with `linkedRoleId` pointing to the original

```
Parent Team                    Child Team
┌─────────────────┐           ┌─────────────────┐
│ Role: "Finance" │──────────▶│ Leader Role     │
│ (source)        │ linkedRoleId │ (linked)     │
│                 │           │                 │
│ ✓ Can edit      │           │ ✗ Cannot edit   │
│ ✓ Changes sync  │           │   directly      │
└─────────────────┘           └─────────────────┘
```

**Behavior:**
- **Source role is authoritative**: Updates to the source role atomically propagate to linked leader roles
- **No direct edits to linked roles**: Attempting to update a role with `linkedRoleId` throws an error
- **Deletion protection**: Source roles with linked leaders cannot be deleted (delete the child team first)
- **Propagated fields**: `title`, `mission`, `duties`, `memberId`

**Why This Pattern:**
- Maintains the double role semantic (person represents child team in parent team)
- Keeps queries simple (each role is self-contained, no joins needed)
- Ensures data consistency through atomic propagation
- Leverages existing `by_linked_role` index for efficient sync

### 4. Organization ID Denormalization on Roles

Roles include `orgaId` even though it could be derived from `teamId`:

```typescript
export const roleType = v.object({
  orgaId: v.id("orgas"),  // Denormalized
  teamId: v.id("teams"),
  // ...
})
```

**Why:**
- Enables `by_orga` index for efficient "all roles in organization" queries
- Avoids joining through teams when filtering by organization

---

## Indexing Strategy

### Naming Convention
Indexes follow the pattern: `by_field1_and_field2`

### Standard Indexes

| Table | Index | Fields | Use Case |
|-------|-------|--------|----------|
| users | by_email | [email] | Auth lookup |
| orgas | by_name | [name] | Name search |
| orgas | by_owner | [owner] | Owner's organizations |
| teams | by_orga | [orgaId] | Teams in organization |
| members | by_orga | [orgaId] | Members in organization |
| members | by_person | [personId] | User's memberships |
| members | by_orga_and_person | [orgaId, personId] | Specific membership lookup |
| members | by_email | [email] | Email-based lookup |
| roles | by_orga | [orgaId] | Roles in organization |
| roles | by_team | [teamId] | Roles in team |
| roles | by_member | [memberId] | Member's roles |
| roles | by_team_and_role_type | [teamId, roleType] | Find team leader/secretary/referee |
| roles | by_parent_team | [parentTeamId] | Child teams lookup |
| roles | by_linked_role | [linkedRoleId] | Find linked leader roles for propagation |
| invitations | by_orga | [orgaId] | Org's invitations |
| invitations | by_email | [email] | Invitations to email |
| invitations | by_orga_and_status | [orgaId, status] | Pending invitations in org |
| decisions | by_orga | [orgaId] | Org's audit trail |
| decisions | by_orga_and_author | [orgaId, authorEmail] | User's decisions in org |
| decisions | by_orga_and_target | [orgaId, targetType] | Decisions by entity type |
| topics | by_team | [teamId] | Team's topics |
| topics | by_team_and_date | [teamId, issuedDate] | Chronological topics |
| policies | by_orga | [orgaId] | Org's policies |
| policies | by_team | [teamId] | Team's policies |
| policies | by_orga_and_visibility | [orgaId, visibility] | Public policies in org |
| notifications | by_user | [userId] | All notifications for user |
| notifications | by_user_and_read | [userId, isRead] | Unread notifications |
| notifications | by_user_and_orga | [userId, orgaId] | Notifications by org |
| notifications | by_user_and_archived | [userId, isArchived] | Active vs archived |
| notifications | by_orga | [orgaId] | Admin org-wide queries |
| notifications | by_expires | [expiresAt] | Cleanup expired |
| notifications | by_group_key | [groupKey] | Related notifications |
| notificationPreferences | by_user | [userId] | User's preferences |
| notificationPreferences | by_user_and_orga | [userId, orgaId] | Specific preferences |

### Index Design Rules

1. **Always index foreign keys** - Any `*Id` field should have an index
2. **Compound indexes for common query patterns** - e.g., `by_orga_and_person`
3. **Filter fields in indexes** - If you filter by status, include it in an index
4. **Order matters** - Put equality checks before range queries

---

## Multi-Tenant Isolation

### Pattern
Every tenant-scoped entity includes `orgaId: v.id("orgas")`:

```typescript
export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
})
```

### Enforcement Layers

1. **Query Level**: All queries use `withIndex("by_orga", q => q.eq("orgaId", orgaId))`
2. **Function Level**: `requireAuthAndMembership(ctx, orgaId)` validates access
3. **Schema Level**: `orgaId` is required (not optional)

### Cross-Tenant Data

Only `User` is not tenant-scoped, as users can belong to multiple organizations.

---

## Audit Trail with Decisions

### Purpose
Complete traceability for governance. Every change is recorded with:
- Who made the change (authorEmail)
- In what capacity (roleName, teamName)
- What changed (diff with before/after)
- When (_creationTime)

### Diff Structure

The `diff` field is a discriminated union based on entity type:

```typescript
export const diffType = v.union(
  organizationDiff,  // type: "Organization"
  teamDiff,          // type: "Team"
  roleDiff,          // type: "Role"
  invitationDiff,    // type: "Invitation"
  policyDiff         // type: "Policy"
)
```

Each diff has:
- `type`: Discriminator field
- `before`: Previous state (undefined for creates)
- `after`: New state (undefined for deletes)

### Recording Decisions

Every mutation that modifies data should:

```typescript
await ctx.db.insert("decisions", {
  orgaId,
  authorEmail: email,
  roleName,
  teamName,
  targetId: entityId,
  targetType: "roles",  // or appropriate type
  diff: {
    type: "Role",
    before: { title: oldTitle },
    after: { title: newTitle },
  },
});
```

---

## Team Hierarchy Model

### Design Choice
Team hierarchy is modeled through Role relationships, not direct Team references.

### How It Works

1. Each Team has exactly one `leader` role
2. The leader role can have a `parentTeamId`
3. `parentTeamId` points to the parent team (if any)
4. The top-level team has a leader role with `parentTeamId: undefined`

### Querying Hierarchy

**Find child teams of a parent:**
```typescript
const childLeaderRoles = await ctx.db
  .query("roles")
  .withIndex("by_parent_team", q => q.eq("parentTeamId", parentTeamId))
  .filter(q => q.eq(q.field("roleType"), "leader"))
  .collect();

const childTeamIds = childLeaderRoles.map(role => role.teamId);
```

### Constraints

- Only one top-level team per organization (leader with no parentTeamId)
- Only leader roles can have parentTeamId
- Circular references are prevented at mutation time

---

## Design Decisions Rationale

### Why Member Denormalizes User Data
**Decision:** Copy user fields to member instead of just referencing.

**Rationale:**
- Most UI views show member info within org context
- Eliminates join when listing members
- Future flexibility: member profile can differ from user profile
- Trade-off: Updates to User require Member sync (acceptable overhead)

### Why Roles Store orgaId
**Decision:** Denormalize orgaId on roles even though derivable from teamId.

**Rationale:**
- "All roles in organization" is a common query
- Without denormalization: query all teams, then all roles per team (N+1)
- With denormalization: single indexed query

### Why Bidirectional Role-Member References
**Decision:** Store references in both directions.

**Rationale:**
- "Member's roles" and "Role's holder" are equally common queries
- Avoids table scans in either direction
- Consistency maintained by mutation logic

### Why Hierarchy Through Roles, Not Teams
**Decision:** Team parent-child relationships via leader role's parentTeamId.

**Rationale:**
- A team's connection to its parent is through its leader
- The leader "represents" the team in the parent team
- More flexible than hard-coded team.parentId
- Allows teams to potentially reorganize without changing team documents

### Why Linked Roles Duplicate Data with Atomic Sync
**Decision:** The leader role in a child team duplicates `title`, `mission`, `duties`, and `memberId` from the source role in the parent team, with automatic propagation when the source changes.

**Rationale:**
- Queries remain simple - each role is self-contained with no joins needed
- The `by_linked_role` index enables efficient sync lookup
- Source role is authoritative; linked roles cannot be edited directly
- Atomic propagation ensures consistency within the same transaction
- Alternative approaches (virtual roles, multi-team roles) were rejected due to query complexity or indexing limitations

**Considered Alternatives:**
1. *Single role belonging to multiple teams* - Cannot efficiently index for "roles in team X"
2. *Virtual/computed roles* - Identity problems, increased query complexity
3. *Minimal leader with derived fields* - Required making fields optional, breaking schema
4. *Bidirectional sync* - Risk of confusion about which role was edited

### Why Typed Diffs in Decisions
**Decision:** Discriminated union for diff types rather than generic JSON.

**Rationale:**
- Type safety at runtime (Convex validates)
- Self-documenting: each entity type has defined trackable fields
- Enables type-safe diff rendering in UI
- Future: Enables structured queries on diff contents

---

## Notification System

### Overview

The notification system provides a unified framework for delivering alerts to users across all notification types. It uses an event-based model where notifications are stored as discrete records rather than computed on-the-fly.

### Design Decisions

#### User-Level vs Member-Level Notifications

**Decision:** Store notifications at the User level with optional org/member context.

**Rationale:**
- Invitations must work before membership exists (the invitee may not be a member yet)
- A single query can fetch all notifications for a user across all their organizations
- The frontend can filter/group by organization as needed
- Avoids orphan notifications when members are removed from organizations

#### Event-Based Storage vs Computed

**Decision:** Store notifications as discrete records rather than computing them on-the-fly.

**Rationale:**
- Rich metadata support (read state, archival, expiration, grouping)
- Efficient queries via proper indexes
- Supports notification-specific actions (mark as read, archive)
- Extensible to new notification types via discriminated union
- Works for pre-membership scenarios (invitations)

#### Polymorphic Payload

**Decision:** Use a discriminated union for notification payloads based on category.

**Rationale:**
- Type safety at runtime (Convex validates the payload structure)
- Self-documenting: each category has a defined payload shape
- Frontend can render category-specific UI based on payload type
- Adding new categories only requires extending the union

### Notification Entity

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | The notification recipient |
| `orgaId` | `Id<"orgas">?` | Optional organization context |
| `memberId` | `Id<"members">?` | Optional member context |
| `payload` | `NotificationPayload` | Discriminated union with category-specific data |
| `priority` | `NotificationPriority` | "low", "normal", "high", "urgent" |
| `isRead` | `boolean` | Whether the notification has been read |
| `readAt` | `number?` | Timestamp when marked as read |
| `isArchived` | `boolean` | Whether the notification has been archived |
| `archivedAt` | `number?` | Timestamp when archived |
| `expiresAt` | `number?` | Auto-cleanup timestamp |
| `groupKey` | `string?` | For grouping related notifications |

### Notification Categories

| Category | Description | Payload Fields |
|----------|-------------|----------------|
| `invitation` | Pending invitation to join org | invitationId, orgaName, inviterName |
| `message` | Unread message in team (future) | messageId, teamId, teamName, senderName, preview |
| `policy_global` | New org-wide policy | policyId, policyTitle, orgaId, orgaName |
| `policy_team` | New team policy | policyId, policyTitle, teamId, teamName |
| `decision` | New decision affecting user | decisionId, targetType, summary |
| `role_assignment` | Assigned to a new role | roleId, roleTitle, teamName, orgaId, orgaName |
| `mention` | Mentioned in topic/discussion (future) | sourceType, sourceId, mentionerName, preview |
| `system` | System announcements | title, message |

### Notification Preferences Entity

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | The user these preferences belong to |
| `orgaId` | `Id<"orgas">?` | null = global defaults, specific = org override |
| `[category]` | `ChannelPreferences` | Per-category channel settings (inApp, email, push) |
| `quietHoursStart` | `number?` | Hour (0-23) when quiet hours begin |
| `quietHoursEnd` | `number?` | Hour (0-23) when quiet hours end |
| `digestFrequency` | `DigestFrequency` | "realtime", "daily", "weekly" |

### Index Strategy

**Notifications:**
- `by_user` - Fetch all notifications for a user
- `by_user_and_read` - Fetch unread notifications efficiently
- `by_user_and_orga` - Filter notifications by organization
- `by_user_and_archived` - Separate active from archived
- `by_orga` - Admin queries for org-wide notifications
- `by_expires` - Cleanup expired notifications
- `by_group_key` - Delete/update related notifications as a group

**Notification Preferences:**
- `by_user` - Get all preferences for a user
- `by_user_and_orga` - Get specific preferences (global or org-specific)

### Integration Pattern

When creating notifications in other modules:

```typescript
import { internal } from "../_generated/api";
import { buildInvitationNotification, shouldNotify } from "../notifications/helpers";

// In a mutation handler:
const prefs = await shouldNotify(ctx, targetUserId, orgaId, "invitation");
if (prefs.inApp) {
  await ctx.scheduler.runAfter(0, internal.notifications.functions.create,
    buildInvitationNotification({
      userId: targetUserId,
      orgaId: orgaId,
      invitationId: invitation._id,
      orgaName: orga.name,
      inviterName: `${member.firstname} ${member.surname}`,
    })
  );
}
```

---

## Migration History

| Date | Description | Impact |
|------|-------------|--------|
| Initial | Base schema established | N/A |
| 2026-02-02 | Added `linkedRoleId` field to roles for double role pattern | Safe - new optional field, existing data unaffected |
| 2026-02-05 | Added notifications and notificationPreferences tables | Safe - new tables, no existing data affected |
| 2026-02-06 | Added `authorizedEmailDomains` optional field to orgas | Safe - new optional field, existing data unaffected. Enables domain-restricted invitations. |

*This section should be updated when migrations are performed.*

---

## Appendix: Validator Reference

### Contact Info Types
```typescript
contactInfoType = "LinkedIn" | "Facebook" | "Instagram" | "Whatsapp" | "Mobile" | "Address"
```

### Special Role Types
```typescript
specialRoleType = "leader" | "secretary" | "referee"
```

### Invitation Status
```typescript
invitationStatusType = "pending" | "rejected" | "accepted"
```

### Policy Visibility
```typescript
policyVisibilityType = "private" | "public"
```

### Target Types (for Decisions)
```typescript
targetType = "orgas" | "teams" | "roles" | "members" | "policies" | "invitations"
```

### Notification Categories
```typescript
notificationCategoryType = "invitation" | "message" | "policy_global" | "policy_team" | "decision" | "role_assignment" | "mention" | "system"
```

### Notification Priority
```typescript
notificationPriorityType = "low" | "normal" | "high" | "urgent"
```

### Digest Frequency
```typescript
digestFrequency = "realtime" | "daily" | "weekly"
```

---

## Checklist for New Entity Development

When adding a new entity to the schema:

- [ ] Create `convex/<entity>/index.ts` with `entityType` and `entityValidator`
- [ ] Add table definition to `convex/schema.ts`
- [ ] Include `orgaId` if entity is tenant-scoped
- [ ] Add `by_orga` index if tenant-scoped
- [ ] Add indexes for all foreign key fields
- [ ] Add compound indexes for common query patterns
- [ ] Create `convex/<entity>/functions.ts` with queries and mutations
- [ ] Use `withIndex()` for all queries (never `filter()` alone)
- [ ] Add `args` and `returns` validators to all functions
- [ ] Call `requireAuthAndMembership()` in handlers
- [ ] Create `Decision` records for all mutations
- [ ] Add diff type to `decisions/index.ts` if auditing is needed
- [ ] Update this document with the new entity
