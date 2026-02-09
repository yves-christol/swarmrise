# DevOps & Production Operations

**Last updated:** 2026-02-09
**Maintainer:** Flo (DevOps agent)

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Production Readiness Checklist](#production-readiness-checklist)
3. [Deployment Process](#deployment-process)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Scripts & Tooling](#scripts--tooling)
7. [Incident Response](#incident-response)
8. [Rollback Procedures](#rollback-procedures)
9. [Architecture Decisions Log](#architecture-decisions-log)

---

## Stack Overview

| Layer | Technology | Hosting / Provider |
|-------|-----------|-------------------|
| Frontend | React 19 + Vite + Tailwind CSS v4 | `https://swarmrise.com` |
| Backend | Convex (serverless functions + real-time database) | `https://ceaseless-echidna-512.convex.cloud` |
| Authentication | Clerk | `https://clerk.swarmrise.com` |
| Webhook verification | Svix (via Clerk webhooks) | Runs inside Convex Node.js actions |
| Package manager | Bun (enforced via `npx only-allow bun`) | Local / CI |
| Node runtime (Convex) | Node.js 22 (configured in `convex.json`) | Convex Cloud |

**Key architectural note:** Convex manages the database, serverless functions, cron jobs, and real-time subscriptions. There are no traditional servers, containers, or databases to manage. The operational focus is on: Convex function deployment, Clerk integration health, frontend build/deploy pipeline, and environment variable management.

---

## Production Readiness Checklist

Every item below must be verified before the first production deployment. Items marked with `[BLOCKER]` will prevent deployment if not resolved.

### Build & Code Quality

- [x] `bun run build` passes with zero errors and zero warnings
- [x] `bun run lint` passes with zero errors and zero warnings
- [x] All TypeScript compilation errors are resolved
- [ ] All Convex functions have `args` and `returns` validators
- [ ] No `filter()` used in Convex queries -- use `withIndex()` instead
- [ ] No `console.log` in production code (use structured error handling)

### Security (cross-reference `docs/SECURITY.md`)

- [x] `.env*` files (except `.env.example`) are in `.gitignore` and not in git history
- [x] All user-facing Convex functions verify authentication via `getAuthenticatedUser` or `requireAuthAndMembership`
- [x] All queries with organizational data scope to `orgaId` (multi-tenant isolation)
- [x] `updateUser` mutation has authorization check (Security finding M1)
- [x] Debug/sample functions removed (`debugAuth`, `myFunctions.ts` -- Security findings M2, M5)
- [x] Admin email is read from `ADMIN_EMAIL` env var, not hardcoded (Security finding M3)
- [x] CSP header is configured in `index.html` with both dev and prod Clerk domains
- [x] Clerk webhook secret (`CLERK_WEBHOOK_SECRET`) is configured on Convex production environment

### Environment & Secrets

- [x] Production Convex deployment created (`https://ceaseless-echidna-512.convex.cloud`)
- [x] Production Clerk application created (`https://clerk.swarmrise.com`)
- [x] All required environment variables are set (verified via `npx convex env list --prod`)
- [x] Clerk webhook endpoint configured pointing to `https://ceaseless-echidna-512.convex.site/webhooks/clerk`
- [x] Frontend environment variables (`VITE_*`) configured on hosting platform
- [x] Convex environment variables set via `npx convex env set` on the production deployment

### Infrastructure

- [x] Frontend hosting platform configured, serving at `https://swarmrise.com`
- [x] Custom domain configured with HTTPS
- [x] CSP header updated to include production Clerk domain (`*.clerk.com`)
- [x] DNS configured for custom domain
- [x] CI/CD pipeline configured (`.github/workflows/ci.yml`)

### Observability

- [ ] Convex dashboard access verified for the production deployment
- [ ] Convex function logs accessible
- [ ] Clerk dashboard configured for the production instance
- [ ] Error monitoring set up (see "Monitoring" section)

---

## Deployment Process

### Architecture: Two Independent Deployments

This project requires two separate deployments that must be coordinated:

1. **Convex backend** -- Deployed via `npx convex deploy`
2. **Frontend static assets** -- Built via `bun run build`, deployed to static hosting

They are versioned independently but must be compatible. The Convex deployment must happen first (or simultaneously) because the frontend depends on the Convex-generated API types.

### Step-by-Step: First Production Deployment

#### 1. Create Production Convex Deployment

```bash
# Log in to Convex (if not already)
npx convex login

# Create a new production deployment for the project
# This will create a new deployment and give you the production URL
npx convex deploy
```

This will:
- Push all Convex functions to the production deployment
- Run schema validation
- Create database indexes
- Set up the HTTP router (webhook endpoints)

#### 2. Set Convex Environment Variables

```bash
# Set Clerk JWT issuer for authentication
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-production-clerk-domain.clerk.com" --prod

# Set Clerk webhook secret for user sync
npx convex env set CLERK_WEBHOOK_SECRET "whsec_your_production_webhook_secret" --prod

# Set admin email
npx convex env set ADMIN_EMAIL "admin@yourdomain.com" --prod
```

#### 3. Configure Clerk Production Instance

1. In the Clerk Dashboard, create a production instance (or switch your existing instance to production mode)
2. Note the **publishable key** (starts with `pk_live_`)
3. Configure a webhook endpoint:
   - URL: `https://ceaseless-echidna-512.convex.site/webhooks/clerk`
   - Events: `user.created`, `user.updated`
   - Copy the **signing secret** -- this is the `CLERK_WEBHOOK_SECRET`

#### 4. Build and Deploy Frontend

```bash
# Set production environment variables (or configure in hosting platform)
export VITE_CONVEX_URL="https://ceaseless-echidna-512.convex.cloud"
export VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."

# Build
bun run build

# The output is in dist/ -- deploy this to your hosting platform
```

#### 5. Verify Deployment

After deploying both backend and frontend:

1. Open the application in a browser
2. Verify Clerk sign-in works
3. Create a test organization
4. Verify real-time updates work (open two tabs)
5. Check Convex dashboard for function execution logs
6. Verify the Clerk webhook fires on user creation (check Convex logs)

### Subsequent Deployments

For ongoing deployments:

```bash
# 1. Run pre-deploy checks (see Scripts section)
bun run scripts/pre-deploy-check.ts

# 2. Deploy Convex backend
npx convex deploy

# 3. Build frontend
bun run build

# 4. Deploy frontend to hosting platform
# (platform-specific: Vercel auto-deploys from git, Netlify CLI, etc.)
```

### Schema Migrations

Convex handles schema migrations automatically when you deploy. However:

- **Adding new tables or fields**: Safe, deploy normally
- **Adding required fields to existing tables**: Requires a two-step migration:
  1. Deploy with the field as optional
  2. Backfill existing documents
  3. Deploy with the field as required
- **Removing fields**: Safe, old data remains but is no longer validated
- **Renaming fields**: Treat as "add new + backfill + remove old"

Always test schema changes against the development deployment first using `npx convex dev`.

---

## Environment Configuration

### Frontend Environment Variables (Vite -- build time)

These are embedded into the built JavaScript bundle. They must be prefixed with `VITE_`.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_CONVEX_URL` | Yes | Convex deployment cloud URL | `https://ceaseless-echidna-512.convex.cloud` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (pk_test_ or pk_live_) | `pk_live_abc123...` |

**Where to set:** In the hosting platform's build environment settings (Vercel, Netlify, etc.), or in a `.env.production` file that is NOT committed to git.

### Convex Environment Variables (server-side)

These are available to Convex functions at runtime via `process.env`.

| Variable | Required | Description | How to set |
|----------|----------|-------------|------------|
| `CLERK_JWT_ISSUER_DOMAIN` | Yes | Clerk JWT issuer domain for auth verification | `npx convex env set CLERK_JWT_ISSUER_DOMAIN "value" --prod` |
| `CLERK_WEBHOOK_SECRET` | Yes | Svix signing secret for Clerk webhook verification | `npx convex env set CLERK_WEBHOOK_SECRET "value" --prod` |
| `ADMIN_EMAIL` | Recommended | Admin user email for internal admin queries | `npx convex env set ADMIN_EMAIL "value" --prod` |

### Convex Deployment Variables (local development)

These are used by the Convex CLI locally and should be in `.env.local` (gitignored).

| Variable | Required | Description |
|----------|----------|-------------|
| `CONVEX_DEPLOYMENT` | Yes | Convex deployment identifier (e.g., `dev:youthful-starling-351`) |

### Environment Separation

| Environment | Clerk Instance | Convex Deployment | Frontend URL |
|-------------|---------------|-------------------|-------------|
| Development | Dev (`pk_test_*`, `current-slug-83.clerk.accounts.dev`) | Dev (`dev:youthful-starling-351`) | `http://localhost:5173` |
| Production | Production (`pk_live_*`, `clerk.swarmrise.com`) | Prod (`ceaseless-echidna-512`) | `https://swarmrise.com` |

**Critical rule:** Never use development Clerk keys or Convex deployments in production, and vice versa. Each environment must have its own isolated set of credentials.

### Secrets Management

- **Never commit** `.env` files to git (`.gitignore` already covers `*.local` but all `.env*` except `.env.example` should be gitignored)
- Frontend variables (`VITE_*`) are **public** -- they are embedded in the JavaScript bundle. Only put publishable keys here.
- Convex environment variables are **private** -- they are stored securely by Convex and only accessible to server-side functions.
- Clerk webhook secrets must be set on the Convex deployment, not on the frontend.

---

## Monitoring & Health Checks

### What to Monitor

Since this is a Convex-backed application, traditional server monitoring does not apply. Instead, focus on:

#### 1. Convex Function Health (Primary)

- **Dashboard:** `https://dashboard.convex.dev` -- shows function executions, errors, and latency
- **Key metrics:**
  - Function error rate (target: < 0.1%)
  - Function execution time (p50, p95, p99)
  - Database read/write units consumed
  - Scheduler queue depth (for cron jobs)
- **Cron job:** `cleanup-old-invitations` runs daily at 03:00 UTC -- verify it executes

#### 2. Clerk Authentication Health

- **Dashboard:** `https://dashboard.clerk.com` -- shows sign-in attempts, user creation, webhook delivery
- **Key metrics:**
  - Webhook delivery success rate (must be 100%)
  - Failed sign-in attempts (watch for brute force patterns)
  - User creation events matching Convex user records

#### 3. Frontend Availability

- **Hosting platform dashboard** -- uptime, response times, CDN cache hit ratio
- **Key metrics:**
  - Page load time (target: < 3s on 3G)
  - Build success rate in CI/CD
  - Static asset cache headers configured correctly

#### 4. Application-Level Health Checks

Since there is no traditional health endpoint (Convex does not expose custom HTTP endpoints beyond what is in `convex/http.ts`), application health is verified by:

1. **Convex connectivity:** If the frontend can execute a Convex query, the backend is healthy
2. **Auth flow:** If a user can sign in via Clerk and their identity is recognized by Convex, the auth integration is healthy
3. **Webhook sync:** If new Clerk users appear in the Convex `users` table, the webhook pipeline is healthy

### Recommended Monitoring Setup

For a project at this scale, start with:

1. **Convex Dashboard** (built-in, free) -- Function logs, error tracking, performance metrics
2. **Clerk Dashboard** (built-in, free) -- Auth metrics, webhook delivery logs
3. **Hosting platform analytics** (built-in) -- Vercel/Netlify/Cloudflare analytics
4. **Uptime monitoring** (optional) -- A simple uptime checker (e.g., UptimeRobot, Better Uptime) pinging the frontend URL

For production at scale, consider adding:
- Sentry for frontend error tracking (captures React errors and unhandled rejections)
- A Convex HTTP endpoint specifically for health checks (add to `convex/http.ts`)

---

## Scripts & Tooling

All operational scripts live in the `scripts/` directory and are written in TypeScript for Bun.

### `scripts/pre-deploy-check.ts`

Runs all pre-deployment validations. Must pass before any production deployment.

```bash
bun run scripts/pre-deploy-check.ts
```

What it checks:
- TypeScript compilation (`tsc -b`)
- ESLint (`bun run lint`)
- Required environment variables are documented
- No `console.log` statements in Convex functions (excluding `console.error` and `console.warn`)
- No `filter()` calls in Convex queries (should use `withIndex()`)

### `scripts/env-check.ts`

Validates that all required environment variables are configured for a given environment.

```bash
# Check local development environment
bun run scripts/env-check.ts

# Check production (verifies Convex env vars via CLI)
bun run scripts/env-check.ts --prod
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| SEV-1 | Service is completely down | Immediate | Convex deployment broken, Clerk outage |
| SEV-2 | Major feature broken | Within 1 hour | Webhook sync failing, auth errors |
| SEV-3 | Minor issue, workaround exists | Within 24 hours | UI rendering bug, non-critical function error |

### Runbook: Common Issues

#### Users cannot sign in

1. Check Clerk status page: `https://status.clerk.com`
2. Check browser console for Clerk errors
3. Verify `VITE_CLERK_PUBLISHABLE_KEY` matches the correct Clerk instance
4. Verify `CLERK_JWT_ISSUER_DOMAIN` is set correctly on the Convex deployment
5. Check Convex logs for auth-related errors

#### New users are not appearing in the database

1. Check Clerk Dashboard > Webhooks for delivery failures
2. Verify `CLERK_WEBHOOK_SECRET` is correct on the Convex deployment
3. Check Convex logs for webhook handler errors (`convex/webhooks/clerk.ts`)
4. Verify the webhook URL: `https://ceaseless-echidna-512.convex.site/webhooks/clerk`
5. Test by sending a test webhook from Clerk Dashboard

#### Convex functions are failing

1. Open Convex Dashboard > Logs
2. Identify the failing function and error message
3. Check if it is a schema validation error (new deployment with incompatible schema?)
4. Check if it is an auth error (Clerk token verification failing?)
5. If caused by a bad deployment, roll back (see "Rollback Procedures")

#### Frontend shows blank page or hydration errors

1. Check browser console for JavaScript errors
2. Verify `VITE_CONVEX_URL` points to the correct Convex deployment
3. Check if a recent frontend deployment introduced a breaking change
4. Verify CSP headers are not blocking required resources
5. Roll back the frontend deployment if needed

#### Cron job (`cleanup-old-invitations`) is not running

1. Open Convex Dashboard > Cron Jobs
2. Check if the cron is listed and its last execution time
3. Check Convex logs for errors from `invitations.functions.deleteOldPendingInvitations`
4. A new `npx convex deploy` will re-register cron jobs

---

## Rollback Procedures

### Convex Backend Rollback

Convex does not have a built-in "rollback to previous deployment" command. Instead:

**Option A: Redeploy previous code**
```bash
# Check out the previous known-good commit
git log --oneline -10
git checkout <previous-good-commit>

# Deploy that version to production
npx convex deploy

# Return to the current branch
git checkout master
```

**Option B: Revert the bad commit and deploy**
```bash
git revert <bad-commit-hash>
npx convex deploy
```

**Important caveats:**
- Schema changes are NOT automatically rolled back. If you added a new required field and backfilled data, reverting the code does not un-backfill the data.
- Convex functions are deployed atomically -- all functions update at once.
- If a deployment breaks the schema, Convex will reject it and the previous version remains active.

### Frontend Rollback

Frontend rollback depends on the hosting platform:

**Vercel:**
```bash
# List recent deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

**Netlify:**
```bash
# Rollback to previous deploy in Netlify dashboard
# Or redeploy from git: push a revert commit
```

**Manual:**
```bash
# Build from a known-good commit
git checkout <previous-good-commit>
bun run build
# Upload dist/ to your hosting platform
git checkout master
```

### Rollback Decision Matrix

| Symptom | Roll back backend? | Roll back frontend? |
|---------|-------------------|-------------------|
| Convex functions throw errors | Yes | Maybe (if frontend depends on new API) |
| Frontend blank page | No | Yes |
| Auth broken after deploy | Check Convex env vars first | No |
| Data corruption | Yes + investigate | No |
| Performance degradation | Yes (if caused by new function logic) | Check frontend bundle size |

---

## Architecture Decisions Log

### ADR-001: Convex as Backend (Pre-existing)

**Decision:** Use Convex as the sole backend platform.

**Rationale:** Convex provides serverless functions, a real-time database, cron jobs, and HTTP endpoints in a single managed platform. This eliminates the need for traditional server infrastructure, database management, and WebSocket servers.

**Operational impact:**
- No servers to patch, scale, or monitor at the OS level
- Deployment is a single CLI command (`npx convex deploy`)
- Vendor lock-in: migrating away from Convex would require rewriting the entire backend
- Monitoring is through the Convex dashboard; custom metrics require additional tooling

### ADR-002: Separate Dev/Prod Environments via Convex Deployments

**Decision:** Use separate Convex deployments for development and production.

**Rationale:** Convex supports multiple deployments per project. Each deployment has its own database, functions, and environment variables. This provides complete isolation between environments.

**Operational impact:**
- `dev:*` deployments are used during local development (`npx convex dev`)
- `prod:*` deployment is used for production (`npx convex deploy`)
- Environment variables must be set independently on each deployment

### ADR-003: Clerk Webhooks for User Sync

**Decision:** Sync Clerk user data to Convex via Svix-signed webhooks.

**Rationale:** Convex cannot directly call Clerk APIs from queries/mutations (they are sandboxed). Webhooks allow Clerk to push user creation/update events to a Convex HTTP endpoint, which verifies the signature and updates the local `users` table.

**Operational impact:**
- `CLERK_WEBHOOK_SECRET` must be set on every Convex deployment
- Webhook endpoint must be reachable: `https://<deployment>.convex.site/webhooks/clerk`
- If webhooks fail silently, new users will not appear in the database
- Clerk Dashboard > Webhooks shows delivery history and allows manual retries

### ADR-004: CI/CD Pipeline

**Decision:** GitHub Actions CI/CD is configured in `.github/workflows/ci.yml`.

**Behavior:**
1. On PR to master: Runs `bun run build` and `bun run lint` (check job)
2. On push to master: Runs checks, then deploys Convex backend to production

**Required secret:** `CONVEX_DEPLOY_KEY` — generate from Convex Dashboard > Settings > Deploy Keys.

### CI/CD Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI/CD

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run lint

  deploy-convex:
    needs: check
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

The `CONVEX_DEPLOY_KEY` is generated from the Convex Dashboard > Settings > Deploy Keys.

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `convex.json` | Convex project configuration (Node.js version) |
| `convex/auth.config.ts` | Clerk JWT verification configuration for Convex |
| `convex/http.ts` | HTTP router for webhook endpoints |
| `convex/crons.ts` | Scheduled jobs (invitation cleanup daily at 03:00 UTC) |
| `convex/convex.config.ts` | Convex app configuration with aggregate components |
| `convex/schema.ts` | Database schema with all tables and indexes |
| `convex/webhooks/clerk.ts` | Clerk webhook HTTP handler |
| `convex/webhooks/clerkVerify.ts` | Svix signature verification (Node.js action) |
| `convex/admin.ts` | Admin queries (uses `ADMIN_EMAIL` env var) |
| `.env.example` | Template for required environment variables |
| `index.html` | Entry HTML with CSP header |
| `vite.config.ts` | Vite build configuration |
| `eslint.config.js` | ESLint configuration with TypeScript and React rules |
