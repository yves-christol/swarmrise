# Nadia - Chat System Agent Memory

## Project Architecture
- Stack: React 19 + Vite + Convex + Clerk + Tailwind CSS v4, package manager: Bun
- Each domain entity: `convex/<domain>/index.ts` (types) + `convex/<domain>/functions.ts` (queries/mutations)
- All functions MUST have `args` and `returns` validators
- Multi-tenant isolation: every entity has `orgaId`, indexed with `by_orga`
- Auth helper: `requireAuthAndMembership(ctx, orgaId)` from `convex/utils.ts`
- Decisions table tracks all changes with before/after diffs (discriminated union)

## Existing Data Model (schema.ts)
- Tables: users, orgas, teams, members, roles, invitations, decisions, topics, policies, notifications, notificationPreferences
- Member denormalizes User data (firstname, surname, email, pictureURL, contactInfos) + holds `roleIds[]`
- Role belongs to a team, has optional `roleType` (leader/secretary/referee)
- Team hierarchy modeled through leader role's `parentTeamId`, NOT direct team references
- Linked roles: leader in child team has `linkedRoleId` pointing to source role in parent team

## Notifications System (existing)
- Stored at User level with optional org/member context
- Polymorphic payload via discriminated union (invitation, message, policy_global, etc.)
- `messagePayload` already defined for future chat integration (uses `v.string()` for messageId placeholder)

## Focus Navigation System
- FocusContainer manages transitions between orga/team/role/member views
- ViewToggle: visual vs manage modes with flip animation
- OrgaStore context provides focus state, view mode, and data hooks

## Chat System Design (CHAT.md created 2026-02-13)
- Channels: orga (auto-created), team (auto-created), DM (on demand)
- No custom channels by design -- channels mirror org structure
- Embedded tools: topic (consent decision), voting, candidateless election
- Tool participation data in separate tables to avoid write conflicts
- Key file: `/Users/yc/dev/swarmrise/docs/CHAT.md`

## Open Questions (need collaborator input)
- Karl: DM participant indexing strategy, tool table proliferation
- Monica: chat panel placement, tool creation flow
- Ivan: topic facilitator role, election nomination secrecy, topics entity overlap

## Governance Model (from VISION.md)
- Consent-based decisions: proposition -> clarification -> consent
- Consent != agreement; it means "I can live with this, safe enough to try"
- Objections must be reasoned and constructive
- Role triad: leader (coordinates), secretary (documents), referee (mediates)
- Communication should understand teams, roles, governance -- not generic chat

## UX Principles
- Three pillars: Full Reactivity, Pure Simplicity, Clarity Over Cleverness
- Flat design: all roles visually equal (same size, weight) -- differentiation by color/icon only
- Language: avoid "hierarchy" for swarmrise concepts; use "connections", "network", "map"
- Notifications: non-intrusive, pull model, brand gold (#eac840) for badges
- Reduced motion support required

## Brand
- Bee Gold: #eac840 (primary accent), Dark Gold: #d4af37 (hover)
- Wing Blue: #a2dbed (secondary), Light Cyan: #e0f0f4 (subtle bg)
- Font: Montserrat Alternates for headings (`font-swarm`), system sans for body
- Brand name always lowercase: "swarmrise"
