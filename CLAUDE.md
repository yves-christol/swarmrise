# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs frontend and backend concurrently)
bun run dev

# Frontend only (Vite)
bun run dev:frontend

# Backend only (Convex)
bun run dev:backend

# Build
bun run build

# Lint
bun run lint
```

**Note:** This project requires Bun as the package manager (`npx only-allow bun` enforces this).

## Architecture

**Stack:** React 19 + Vite frontend, Convex backend, Clerk authentication, Tailwind CSS v4

### Convex Backend Structure

Each domain entity has its own directory under `convex/`:
- `index.ts` - Type definitions using Convex validators (`v.object({...})`)
- `functions.ts` - Queries and mutations for that domain

**Domain directories:** `orgas/`, `users/`, `members/`, `teams/`, `roles/`, `decisions/`, `invitations/`, `policies/`, `topics/`

**Shared utilities:** `convex/utils.ts` contains auth helpers (`getAuthenticatedUser`, `requireAuthAndMembership`, `getMemberInOrga`) and cross-entity lookups.

### Type Definition Pattern

```typescript
// convex/<domain>/index.ts
export const entityType = v.object({ ... })  // Fields only

export const entityValidator = v.object({    // Full document with system fields
  _id: v.id("collection"),
  _creationTime: v.number(),
  ...entityType.fields
})

export type EntityName = Infer<typeof entityValidator>
```

### Function Pattern

Every Convex function must have `args` and `returns` validators:

```typescript
export const functionName = query({
  args: { orgaId: v.id("orgas") },
  returns: v.union(orgaValidator, v.null()),
  handler: async (ctx, args) => { ... },
});
```

Use `internalQuery`/`internalMutation`/`internalAction` for private functions, referenced via `internal.module.function`.

### Data Model

- **User** - Root entity, holds `orgaIds[]` for organizations they belong to
- **Orga** (Organization) - Has owner, color scheme. Multi-tenant isolation via `orgaId` on all child entities
- **Member** - User's membership in an organization (denormalizes user data), holds `roleIds[]`
- **Team** - Belongs to an orga
- **Role** - Belongs to a team, optional `roleType` ("leader" | "secretary" | "referee"), assigned to a member
- **Decision** - Audit trail with before/after diffs for all modifications

All tables with organizational data are indexed by `by_orga` for efficient queries.

### Frontend

- Entry: `src/main.tsx` sets up `ClerkProvider` → `ConvexProviderWithClerk` → `App`
- Components use Convex hooks (`useQuery`, `useMutation`) directly
- i18n: Custom React Context-based system in `src/tools/i18n/`

## Convex Conventions

From `.cursor/rules/convex_rules.mdc`:

- Use `withIndex()` instead of `filter()` for queries
- Always define indexes in `convex/schema.ts` with descriptive names (`by_field1_and_field2`)
- Use `v.null()` for functions that don't return a value
- Actions using Node.js modules need `"use node";` at file top
- Actions cannot access `ctx.db` - use `ctx.runQuery`/`ctx.runMutation` instead
- Use `Id<"tableName">` type for document IDs, not `string`
