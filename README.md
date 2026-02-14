# Swarmrise

A multi-tenant organization management platform for collaborative governance. Swarmrise enables organizations to structure teams, define roles, make consent-based decisions, and communicate in real time -- with full auditability.

**GitHub:** https://github.com/yves-christol/swarmrise

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Convex (real-time database & serverless functions)
- **Authentication:** Clerk
- **Routing:** React Router 7
- **i18n:** i18next + react-i18next with browser language detection
- **Emails:** Resend
- **Webhooks:** Svix
- **Package Manager:** Bun (required)

## Key Features

- **Multi-tenant architecture** - Complete data isolation between organizations
- **Team & role management** - Hierarchical team structures with typed roles (leader, secretary, referee)
- **Real-time chat** - Organization-wide and team channels with threads, reactions, message search, and keyboard shortcuts
- **Embedded governance tools** - Topic/consent decision tool, voting tool, and candidateless election tool built into chat
- **Notification system** - Real-time notifications with per-user preferences, triggered by chat events and org activity
- **Decision audit trail** - Every modification tracked with before/after diffs
- **Interactive org visualization** - D3-force-powered graph views for organizations, teams, members, and roles
- **Dark mode** - Theme toggle with system preference detection
- **Internationalization** - Multi-language support
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
convex/                        # Backend: Convex functions and schema
├── orgas/                     # Organizations
├── users/                     # User accounts
├── members/                   # Organization memberships
├── teams/                     # Teams within organizations
├── roles/                     # Role definitions and assignments
├── decisions/                 # Audit trail for all modifications
├── invitations/               # Membership invitations
├── policies/                  # Organization policies
├── topics/                    # Discussion topics
├── chat/                      # Real-time messaging (channels, threads, reactions)
├── notifications/             # Notification delivery
├── notificationPreferences/   # Per-user notification settings
├── emails/                    # Email sending via Resend
├── webhooks/                  # Webhook handling via Svix
├── schema.ts                  # Database schema & indexes
├── crons.ts                   # Scheduled tasks
└── utils.ts                   # Shared auth helpers & cross-entity lookups

src/                           # Frontend: React application
├── components/
│   ├── App/                   # Root app component
│   ├── Chat/                  # Chat system
│   │   ├── ChannelList/       # Channel sidebar
│   │   ├── ChatPanel/         # Main chat container
│   │   ├── MessageList/       # Message display
│   │   ├── MessageInput/      # Compose with tool creation modals
│   │   ├── ThreadPanel/       # Threaded replies
│   │   ├── SearchPanel/       # Message search
│   │   ├── Reactions/         # Emoji reactions
│   │   ├── TopicTool/         # Consent-based decision tool
│   │   ├── VotingTool/        # Polling/voting tool
│   │   └── ElectionTool/      # Candidateless election tool
│   ├── OrgaVisualView/        # Organization graph visualization
│   ├── TeamVisualView/        # Team graph visualization
│   ├── MemberVisualView/      # Member graph visualization
│   ├── RoleVisualView/        # Role graph visualization
│   ├── NotificationBell/      # Notification indicator
│   ├── NotificationPanel/     # Notification list
│   └── ...                    # Modals, forms, shared components
├── pages/                     # Static/legal pages (Terms, Privacy, Glossary, Principles)
├── routes/                    # Route components
├── contexts/                  # React contexts (theme)
├── tools/                     # Stores (orgaStore, chatStore)
└── main.tsx                   # Entry point (Clerk + Convex + Router)
```

## Claude Code Agents

This project includes specialized Claude Code agents for assisted development:

| Agent | Specialty |
|-------|-----------|
| **karl** | Data Model Guardian - Reviews schema changes, ensures data consistency, generates migrations |
| **gunter** | Security Analyst - Audits code for vulnerabilities, reviews dependencies for CVEs |
| **monica** | UX & Brand Expert - Provides design guidance, maintains brand consistency |
| **edwige** | Code Quality - Reviews naming consistency, identifies dead code, proposes cleanup |
| **jane** | i18n - Ensures translations are complete and i18n patterns are correct |
| **helen** | Legal Advisor - GDPR compliance, license audits, cookie policies |
| **ivan** | Vision Guardian - Ensures features align with project philosophy |
| **nadia** | Chat Architect - Designs chat system, channels, and embedded tools |
| **luigi** | Animation & SVG - Creates and optimizes SVG graphics and animations |
| **speed** | Performance - Audits Lighthouse scores, bundle sizes, Core Web Vitals |
| **flo** | DevOps - Deployment pipelines, monitoring, production readiness |

## Documentation

- `CLAUDE.md` - Development guidance for Claude Code
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
