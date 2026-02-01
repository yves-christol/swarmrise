# Swarmrise

A multi-tenant organization management platform for collaborative governance. Swarmrise enables organizations to structure teams, define roles, and track decisions with full auditability.

**GitHub:** https://github.com/yves-christol/swarmrise

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Convex (real-time database & serverless functions)
- **Authentication:** Clerk
- **Package Manager:** Bun (required)

## Key Features

- **Multi-tenant architecture** - Complete data isolation between organizations
- **Team & role management** - Hierarchical team structures with typed roles (leader, secretary, referee)
- **Decision audit trail** - Every modification tracked with before/after diffs
- **Real-time updates** - Changes propagate instantly via Convex subscriptions

## Commands

```bash
# Install dependencies
bun install

# Development (frontend + backend concurrently)
bun run dev

# Frontend only (Vite dev server)
bun run dev:frontend

# Backend only (Convex dev server)
bun run dev:backend

# Build for production
bun run build

# Lint and type-check
bun run lint

# Deploy Convex functions
bun run convex deploy
```

## Project Structure

```
convex/           # Backend: Convex functions and schema
├── orgas/        # Organizations
├── users/        # User accounts
├── members/      # Organization memberships
├── teams/        # Teams within organizations
├── roles/        # Role definitions and assignments
├── decisions/    # Audit trail for all modifications
├── invitations/  # Membership invitations
├── policies/     # Organization policies
└── topics/       # Discussion topics

src/              # Frontend: React application
├── components/   # UI components
└── tools/        # Utilities (i18n, stores)
```

## Claude Code Agents

This project includes specialized Claude Code agents for assisted development:

| Agent | Specialty |
|-------|-----------|
| **karl** | Data Model Guardian - Reviews schema changes, ensures data consistency, generates migrations, maintains `DATA_MODEL_PHILOSOPHY.md` |
| **gunter** | Security Analyst - Audits code for vulnerabilities, reviews dependencies for CVEs, assesses authentication/authorization patterns |
| **monica-ux-brand** | UX & Brand Expert - Provides design guidance, maintains brand consistency, documents UI principles |

### Using Agents

Invoke agents via Claude Code with `@agent-name`:

```
@karl review the schema changes
@gunter check for security issues
@monica-ux-brand help design this component
```

## Documentation

- `CLAUDE.md` - Development guidance for Claude Code
- `DATA_MODEL_PHILOSOPHY.md` - Data architecture decisions and patterns
- `SECURITY.md` - Security audit findings and recommendations

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and configure:
   - `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
   - `VITE_CONVEX_URL` - Your Convex deployment URL
3. Run `bun install`
4. Run `bun run dev`

## License

Apache 2.0 - See [LICENSE.txt](LICENSE.txt)
