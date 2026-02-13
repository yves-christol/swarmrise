# Flo DevOps Agent Memory

## Key Files

- `docs/DEVOPS.md` -- Canonical DevOps documentation (created 2026-02-09)
- `scripts/pre-deploy-check.ts` -- Pre-deployment validation script
- `scripts/env-check.ts` -- Environment variable validation script
- `docs/SECURITY.md` -- Security assessment (created 2026-02-01)

## Environment Variables

### Frontend (Vite, build-time, public)
- `VITE_CONVEX_URL` -- Convex deployment cloud URL
- `VITE_CLERK_PUBLISHABLE_KEY` -- Clerk publishable key

### Convex server-side (private, set via `npx convex env set`)
- `CLERK_JWT_ISSUER_DOMAIN` -- Clerk JWT issuer for auth verification
- `CLERK_WEBHOOK_SECRET` -- Svix signing secret for Clerk webhooks (NOT in .env.example)
- `ADMIN_EMAIL` -- Admin user email for internal queries (NOT in .env.example)

### Local CLI
- `CONVEX_DEPLOYMENT` -- Deployment identifier for `npx convex dev`

## Build Status (2026-02-09)
- Build has 18 TS errors (unused imports, i18n typing, missing properties)
- Lint has 19 warnings (unused vars, react-refresh export warnings)
- 7 Convex query `.filter()` calls that should use `.withIndex()`
- Vite build succeeds independently (tsc fails first in `bun run build`)

## Infrastructure Notes
- No CI/CD pipeline exists yet; recommended GitHub Actions in DEVOPS.md
- No production Convex deployment yet (`.env.production` is empty)
- Convex uses Node.js 22 (`convex.json`)
- Clerk webhooks go to `convex/http.ts` -> `/webhooks/clerk`
- Cron job: `cleanup-old-invitations` daily at 03:00 UTC
- Convex components: aggregateMembers, aggregateTeams, aggregateRoles

## Security Cross-References
- H1: .env files were committed to git history (dev keys only)
- M1: `updateUser` mutation lacks authorization check
- M2: `debugAuth` debug function should be removed
- M5: Sample functions in `myFunctions.ts` should be removed
- See `docs/SECURITY.md` for full findings
