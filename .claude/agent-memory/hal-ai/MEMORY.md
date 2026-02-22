# Hal AI Agent Memory

## Swarmrise Architecture
- Backend: Convex (serverless, reactive database + functions)
- Frontend: React 19 + Vite + Tailwind CSS v4
- Auth: Clerk (JWT-based, `ctx.auth.getUserIdentity()`)
- Package manager: Bun
- Multi-tenant: all entities scoped by `orgaId`, indexed with `by_orga`

## Key Data Model Relationships
- User -> Member (org-scoped identity, holds `roleIds[]`)
- Member -> Role (via `roleIds[]` array on Member)
- Role -> Team (via `teamId` on Role)
- Role has optional `roleType`: "leader" | "secretary" | "referee"
- Channel has `kind`: "orga" | "team" | "dm"
- Message has optional `embeddedTool` (topic/voting/election)
- Decision records have before/after diffs for audit trail

## Auth Pattern
- `getAuthenticatedUser(ctx)` resolves Clerk JWT to User doc
- `getMemberInOrga(ctx, orgaId)` resolves to Member doc
- `requireChannelAccess(ctx, channelId)` checks member access to channels
- Team channels: require member to hold a role in that team
- DM channels: require member to be a participant
- Orga channels: require org membership

## Existing HTTP Routes (convex/http.ts)
- POST `/webhooks/clerk` - Clerk webhook handler
- GET `/files/{storageId}` - Authenticated file serving

## MCP Proposal (docs/AI.md)
- Created 2026-02-20, status: proposal pending review
- Custom URI scheme: `swarmrise://orgas/{orgaId}/...`
- Transport: Streamable HTTP (MCP spec 2025-11-25)
- Auth: OAuth 2.1 with JWT tokens scoped to Member
- Decision: Standalone Node.js server using ConvexHttpClient (not Convex HTTP actions)
- Decision: DM channels never accessible to agents
- Decision: No structural mutations via agents (no team/role/policy creation)
- Decision: Member-scoped tokens (not User-scoped)
- Phased: Phase 1 = read-only, Phase 2 = governance reads + search, Phase 3 = write tools, Phase 4 = advanced

## Key Files
- `/Users/yc/dev/swarmrise/convex/schema.ts` - Full database schema
- `/Users/yc/dev/swarmrise/convex/http.ts` - HTTP routes
- `/Users/yc/dev/swarmrise/convex/utils.ts` - Auth helpers and shared utilities
- `/Users/yc/dev/swarmrise/convex/chat/access.ts` - Channel access control
- `/Users/yc/dev/swarmrise/convex/chat/index.ts` - Chat type definitions
- `/Users/yc/dev/swarmrise/convex/decisions/index.ts` - Decision/diff types
- `/Users/yc/dev/swarmrise/docs/AI.md` - MCP proposal document
- `/Users/yc/dev/swarmrise/docs/VISION.md` - Product vision
- `/Users/yc/dev/swarmrise/docs/SECURITY.md` - Security assessment
