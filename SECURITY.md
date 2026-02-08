# Security Audit Report -- Swarmrise

**Audit Date:** 2026-02-08
**Auditor:** Gunter (Security Analyst Agent)
**Scope:** Full codebase review of swarmrise -- React 19 + Convex + Clerk + Tailwind CSS v4
**Risk Level:** Low (after remediation)
**Last Updated:** 2026-02-08 -- All High and Medium findings remediated

---

## Executive Summary

The swarmrise codebase demonstrates a generally solid security posture for a multi-tenant organizational management application. Authentication is consistently enforced across most Convex functions via well-structured auth helpers (`getAuthenticatedUser`, `requireAuthAndMembership`). Multi-tenant data isolation is well-implemented through indexed `orgaId` filtering on all organizational queries. Webhook signature verification is properly implemented using svix.

The initial audit identified several findings. All High and Medium severity issues have since been remediated (commits `5ad7e74` and `f079038`). Remaining open items are Low and Informational.

---

## Findings Summary

| ID  | Severity      | Title                                                     | Status      |
|-----|---------------|-----------------------------------------------------------|-------------|
| H1  | High          | Environment files with credentials committed to Git       | **Fixed** (5ad7e74) |
| H2  | High          | Public `action` exposed without authentication            | **Fixed** (5ad7e74) |
| M1  | Medium        | `getStorageUrl` query lacks authentication                | **Fixed** (f079038) |
| M2  | Medium        | `deleteStorageFile` lacks ownership verification          | **Fixed** (f079038) |
| M3  | Medium        | `updateOrga` allows any member to modify org name/logo    | **Fixed** (f079038) |
| M4  | Medium        | `updateInvitationStatus` allows any member to change any invitation status | **Fixed** (f079038) |
| M5  | Medium        | No rate limiting on invitation creation                   | **Fixed** (f079038) |
| M6  | Medium        | `deleteTeam` does not clean up roles before deletion      | **Fixed** (f079038) |
| M7  | Medium        | User-supplied URLs rendered as `href` without sanitization | **Fixed** (f079038) |
| L1  | Low           | Missing Content Security Policy (CSP) headers             | Open        |
| L2  | Low           | No upper bound on `limit` parameter in decisions pagination | Open      |
| L3  | Low           | `listMyPendingInvitationsWithOrga` uses `filter()` instead of index for status | Open |
| L4  | Low           | Error messages may leak internal state                    | Open        |
| L5  | Low           | `decisions.listDecisionsForOrga` collects all then slices in memory | Open |
| L6  | Low           | Notification expiration cleanup is scan-heavy             | Open        |
| I1  | Informational | Dependency vulnerability: js-yaml prototype pollution     | Open        |
| I2  | Informational | No HTTPS enforcement in Vite dev config                   | Open        |
| I3  | Informational | localStorage usage for non-sensitive UI preferences       | Acceptable  |
| I4  | Informational | Test data utilities present in codebase                   | **Fixed** (5ad7e74) |

---

## Detailed Findings

### H1: Environment Files with Credentials Committed to Git -- HIGH

**Location:** `/Users/yc/dev/swarmrise/.env.development`, `/Users/yc/dev/swarmrise/.env.production`

**Description:**
The files `.env.development` and `.env.production` are tracked by git despite the `.gitignore` containing patterns for `.env.*`. This is because the `.gitignore` rule `.env.*` does not retroactively remove files that were already committed (they were added in commit `52744b5`). The `.env.development` file contains:
- Convex deployment identifier (`dev:youthful-starling-351`)
- Convex cloud URL
- Clerk publishable key (`pk_test_...`)
- Clerk JWT issuer domain

While Clerk publishable keys are designed to be public (they are `pk_test_` prefixed), the Convex deployment identifier and site URL reveal infrastructure details. More critically, if secret keys were ever committed to these files, they would persist in git history.

**Impact:** Infrastructure information disclosure. If secret keys were ever added to these tracked files, they would be exposed in git history indefinitely.

**Recommendation:**
1. Remove the tracked env files from git: `git rm --cached .env.development .env.production`
2. Verify git history does not contain any secret keys (e.g., `sk_test_`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`)
3. If secrets were ever committed, rotate all affected credentials immediately
4. Ensure `.gitignore` patterns are effective before the files are re-added

**Remediation (commit 5ad7e74):** Removed `.env.development` and `.env.production` from git tracking via `git rm --cached`. Added `.env.example` as a safe template for developers. The `.gitignore` already contains `.env.*` patterns to prevent re-addition.

---

### H2: Public `action` Exposed Without Authentication -- HIGH

**Location:** `/Users/yc/dev/swarmrise/convex/dataTest/users.ts`, line 356

**Description:**
The function `populateMemberAvatars` is exported as a public `action` (not `internalAction`) and performs no authentication check. Any client can call this function with an arbitrary `orgaId`, which will:
1. Query all members of the specified organization
2. Make external HTTP requests to `i.pravatar.cc` for each member
3. Store images in Convex file storage
4. Update member and user `pictureURL` fields in the database

This is a test utility that should not be exposed in a production deployment.

```typescript
// convex/dataTest/users.ts:356
export const populateMemberAvatars = action({
  args: { orgaId: v.id("orgas") },
  // No authentication check
  handler: async (ctx, args) => {
    return populateAvatarsHandler(ctx, args.orgaId);
  },
});
```

**Impact:** An unauthenticated attacker could enumerate organization IDs, overwrite member profile pictures, cause storage cost abuse by uploading arbitrary images, and trigger excessive outbound HTTP requests (potential SSRF vector).

**Recommendation:**
1. Change `action` to `internalAction` to prevent public access
2. Alternatively, add authentication and authorization checks if this needs to remain callable from the client
3. Consider removing all `dataTest` utilities from production builds entirely

**Remediation (commit 5ad7e74):** Changed `populateMemberAvatars` from `action` to `internalAction`. Removed the unused `action` import. The internal version `populateMemberAvatarsInternal` (already used by `convex/dataTest/orga.ts`) is unaffected.

---

### M1: `getStorageUrl` Query Lacks Authentication -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/storage.ts`, line 23

**Description:**
The `getStorageUrl` query accepts a storage ID and returns the file URL without any authentication check. While Convex storage URLs are ephemeral and time-limited by default, this function allows unauthenticated users to resolve storage IDs to URLs.

```typescript
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // No authentication check
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

**Impact:** If an attacker obtains or guesses a storage ID, they can resolve it to a downloadable URL without being authenticated. This could expose uploaded organization logos or member profile pictures.

**Recommendation:**
Add authentication via `getAuthenticatedUser(ctx)` at minimum. Ideally, verify the requester has access to the organization that owns the stored file.

**Remediation (commit f079038):** Added `await getAuthenticatedUser(ctx)` to the `getStorageUrl` query handler. Unauthenticated users can no longer resolve storage IDs to URLs.

---

### M2: `deleteStorageFile` Lacks Ownership Verification -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/storage.ts`, line 37

**Description:**
The `deleteStorageFile` mutation verifies that the caller is authenticated but does not verify that the caller owns or has permission to delete the specific storage file. Any authenticated user can delete any file in storage if they know the storage ID.

```typescript
export const deleteStorageFile = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx); // Only checks authentication, not authorization
    await ctx.storage.delete(args.storageId);
    return null;
  },
});
```

**Impact:** An authenticated user from one organization could delete logo files or profile images belonging to another organization.

**Recommendation:**
Before deleting, verify the storage file is associated with an entity (org logo, member picture) that the authenticated user has permission to manage.

**Remediation (commit f079038):** Converted `deleteStorageFile` from public `mutation` to `internalMutation`. The function was not called from any frontend code, so making it internal eliminates the attack surface entirely.

---

### M3: `updateOrga` Allows Any Member to Modify Organization Name/Logo -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/orgas/functions.ts`, line 264

**Description:**
The `updateOrga` mutation uses `requireAuthAndMembership` which only verifies the caller is a member of the organization. Any member (not just the owner or a role holder) can modify the organization's name, logo, and color scheme. Only `authorizedEmailDomains` is correctly restricted to the owner.

```typescript
export const updateOrga = mutation({
  // ...
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    // member can change name, logo, colorScheme with no role check
    // Only authorizedEmailDomains is owner-restricted
  },
});
```

**Impact:** A newly invited member with no special role could rename the organization, change its logo, or alter the color scheme.

**Recommendation:**
Add role-based authorization. At minimum, restrict organization name and logo changes to the owner. Consider allowing only members with leader roles to modify these settings.

**Remediation (commit f079038):** Added owner-only checks for `name`, `logoStorageId`, and `colorScheme` fields, matching the existing `authorizedEmailDomains` restriction. Non-owner members now receive an error when attempting to modify these settings.

---

### M4: `updateInvitationStatus` Allows Any Member to Change Any Invitation Status -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/invitations/functions.ts`, line 209

**Description:**
The `updateInvitationStatus` mutation allows any member of an organization to change the status of any invitation in that organization. This means a regular member could cancel invitations sent by other members, or re-set accepted/rejected invitations back to pending.

```typescript
export const updateInvitationStatus = mutation({
  args: {
    invitationId: v.id("invitations"),
    status: invitationStatusType,
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    const member = await requireAuthAndMembership(ctx, invitation.orgaId);
    // Any member can change any invitation to any status
    await ctx.db.patch(args.invitationId, { status: args.status });
  },
});
```

**Impact:** A regular member could manipulate invitation workflows, potentially canceling legitimate invitations or re-activating rejected ones.

**Recommendation:**
1. Restrict status changes to the invitation emitter or organization owner/leader
2. Implement state machine logic to prevent invalid transitions (e.g., accepted -> pending)
3. Validate that only forward transitions are allowed (pending -> accepted/rejected/cancelled)

**Remediation (commit f079038):** Restricted `updateInvitationStatus` to the invitation emitter or organization owner only. Added state machine validation allowing only `pending -> rejected` through this function. The `acceptInvitation` and `rejectInvitation` functions (in `users/functions.ts`) handle invitee-side transitions separately with their own recipient verification.

---

### M5: No Rate Limiting on Invitation Creation -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/invitations/functions.ts`, line 96

**Description:**
The `createInvitation` mutation has no rate limiting. Any authenticated member can create an unlimited number of invitations. While there is a check for duplicate pending invitations for the same email, a member could send invitations to thousands of different email addresses.

**Impact:** Potential for invitation spam abuse, especially if email notifications are later implemented. Could also be used to enumerate valid user emails by observing side effects.

**Recommendation:**
Implement rate limiting -- for example, a maximum number of invitations per member per time window. Convex does not have built-in rate limiting, but this can be implemented by tracking invitation counts per member in a rate-limit document.

**Remediation (commit f079038):** Added rate limiting of 50 invitations per member per 24-hour window. Added a `by_emitter` index on the invitations table (`convex/schema.ts`) for efficient lookups. The check counts recent invitations by `emitterMemberId` with `sentDate` filtering before allowing new invitations.

---

### M6: `deleteTeam` Does Not Clean Up Orphaned Roles -- MEDIUM

**Location:** `/Users/yc/dev/swarmrise/convex/teams/functions.ts`, line 331

**Description:**
The `deleteTeam` mutation checks that no child teams exist (via leader roles with parentTeamId), but does not delete or reassign the roles that belong to the team being deleted. After deletion, roles referencing the deleted `teamId` become orphaned -- they still exist in the database with an invalid `teamId` reference.

**Impact:** Data integrity issue. Orphaned roles with invalid team references could cause runtime errors in queries that attempt to resolve `role.teamId`, and could accumulate over time.

**Recommendation:**
Before deleting a team, delete all roles assigned to that team (or reassign them). Also clean up related topics and policies for the team.

**Remediation (commit f079038):** `deleteTeam` now cleans up all roles belonging to the team (removing each role ID from the assigned member's `roleIds` array), all topics (`by_team` index), and all policies (`by_team` index) before deleting the team itself.

---

### M7: User-Supplied URLs Rendered as `href` Without Sanitization -- MEDIUM

**Location:** Multiple frontend components:
- `/Users/yc/dev/swarmrise/src/components/MemberListItem/index.tsx`, line 166
- `/Users/yc/dev/swarmrise/src/components/MemberManageView/index.tsx`, line 601
- `/Users/yc/dev/swarmrise/src/components/MemberVisualView/index.tsx`, line 519

**Description:**
User-supplied contact information URLs (LinkedIn, Website, Facebook, etc.) and `pictureURL` values are rendered directly as `href` attributes in `<a>` tags without sanitization. The `contactInfo.value` field is a free-text `v.string()` with no URL validation. A malicious user could set their contact info to `javascript:alert(document.cookie)` or other dangerous URL schemes.

While React does provide some protection against `javascript:` URLs by logging warnings, this protection is not a security guarantee and has varied across React versions.

**Impact:** Potential stored XSS if `javascript:` or `data:` URI schemes bypass React's protections. Other members viewing the malicious user's profile could be affected.

**Recommendation:**
1. Validate URLs on the backend -- contact info values of type "Website", "LinkedIn", "Facebook", "Instagram" should be validated to start with `https://` or `http://`
2. On the frontend, sanitize `href` values to only allow `https:`, `http:`, `mailto:`, and `tel:` protocols
3. Add `rel="noopener noreferrer"` to all external links (verify this is already done)

**Remediation (commit f079038):** Added `sanitizeUrl()` function to both `getContactLink` implementations (`src/utils/contacts.tsx` and `src/components/MemberManageView/index.tsx`). The sanitizer uses a regex allowlist that only permits `https:`, `http:`, `mailto:`, and `tel:` protocols. URLs with `javascript:`, `data:`, or other dangerous schemes are blocked (return `null`). All external links already have `rel="noopener noreferrer"`.

---

### L1: Missing Content Security Policy (CSP) Headers -- LOW

**Location:** `/Users/yc/dev/swarmrise/index.html`

**Description:**
The application does not define Content Security Policy headers in the HTML or through server configuration. CSP helps prevent XSS attacks by controlling which resources can be loaded.

**Impact:** Reduced defense-in-depth against XSS attacks. Without CSP, any injected script can load resources from any origin.

**Recommendation:**
Add a CSP meta tag to `index.html` or configure CSP headers on the hosting platform (e.g., Vercel):
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.convex.cloud https://*.convex.site https://*.clerk.accounts.dev; img-src 'self' https://*.convex.cloud data: blob:;">
```

---

### L2: No Upper Bound on `limit` Parameter in Decisions Pagination -- LOW

**Location:** `/Users/yc/dev/swarmrise/convex/decisions/functions.ts`, lines 12 and 64

**Description:**
The `listDecisionsForOrga` and `listDecisionsForTeam` queries accept an optional `limit` parameter with no upper bound. A client could pass `limit: 999999` to force the server to return all decisions in a single query, potentially causing performance issues.

```typescript
const limit = args.limit ?? DECISIONS_PAGE_SIZE; // Default 20, but no max
```

**Impact:** Potential denial of service through expensive queries. An attacker could deliberately request very large result sets.

**Recommendation:**
Cap the limit parameter:
```typescript
const limit = Math.min(args.limit ?? DECISIONS_PAGE_SIZE, 100);
```

---

### L3: `listMyPendingInvitationsWithOrga` Uses `filter()` Instead of Index for Status -- LOW

**Location:** `/Users/yc/dev/swarmrise/convex/users/functions.ts`, line 83

**Description:**
The query filters pending invitations using `.filter()` after an index lookup on email. Per Convex best practices, `filter()` performs in-memory filtering which is less efficient than using a compound index. Similarly, `createInvitation` at `/Users/yc/dev/swarmrise/convex/invitations/functions.ts` line 127 uses `filter()` for `orgaId` after indexing by `email`.

**Impact:** Minor performance impact. Could become noticeable as invitation volumes grow.

**Recommendation:**
Create compound indexes (e.g., `by_email_and_status`) and use `withIndex()` instead of `filter()`.

---

### L4: Error Messages May Leak Internal State -- LOW

**Location:** Various files across `/Users/yc/dev/swarmrise/convex/`

**Description:**
Several error messages include specific internal details that could aid an attacker in understanding the system's structure:
- `"Team leader role not found"` (reveals role hierarchy details)
- `"Team leader role is not assigned to a member"` (reveals assignment model)
- `"Cannot update a linked leader role directly. Update the source role in the parent team instead."` (reveals the double role pattern implementation)
- `console.error` statements with full error objects in `leaveOrganization` (line 297)

**Impact:** Information disclosure that aids in understanding the application's internal data model, which could facilitate more targeted attacks.

**Recommendation:**
Use generic error messages for client-facing errors. Log detailed errors server-side only. For example, replace detailed messages with `"Operation not permitted"` or `"Resource not found"`.

---

### L5: `listDecisionsForOrga` Collects All Records Then Slices in Memory -- LOW

**Location:** `/Users/yc/dev/swarmrise/convex/decisions/functions.ts`, lines 42-56

**Description:**
Both decision list queries use `.collect()` to load all matching decisions into memory, then apply cursor-based pagination by filtering and slicing the array in JavaScript. For organizations with many decisions, this will become increasingly expensive.

```typescript
const all = await q.order("desc").collect();
const filtered = args.cursor
  ? all.filter((d) => d._creationTime < args.cursor!)
  : all;
const decisions = filtered.slice(0, limit);
```

**Impact:** Performance degradation as decision count grows. Could cause timeouts or excessive memory usage for large organizations.

**Recommendation:**
Use Convex's built-in pagination support or limit the query using `.take()` with cursor-based filtering at the index level rather than in memory.

---

### L6: Notification Expiration Cleanup Is Scan-Heavy -- LOW

**Location:** `/Users/yc/dev/swarmrise/convex/notifications/functions.ts`, line 472

**Description:**
The `cleanupExpired` internal mutation queries all notifications with the `by_expires` index and then filters in memory for expired ones. This scans all notifications that have an `expiresAt` field set, regardless of whether they are expired.

**Impact:** As notification volume grows, this cleanup operation will become increasingly expensive. It is mitigated by being an internal mutation (likely called by a scheduler), but could still cause performance issues.

**Recommendation:**
Use a more targeted index query that leverages the timestamp ordering, or use Convex's scheduled deletion pattern.

---

### I1: Dependency Vulnerability: js-yaml Prototype Pollution -- INFORMATIONAL

**Location:** `package.json` transitive dependency via `eslint > @eslint/eslintrc > js-yaml`

**Description:**
`bun audit` reports one moderate vulnerability:
- **js-yaml >=4.0.0 <4.1.1**: Prototype pollution in merge (`<<`) operator
- Advisory: https://github.com/advisories/GHSA-mh29-5h37-fv8m

This is a development dependency (via eslint) and does not affect the production bundle.

**Impact:** Minimal. This vulnerability exists only in the development toolchain (eslint config parsing) and is not included in the production build.

**Recommendation:**
Update eslint dependencies when a compatible version is available: `bun update @eslint/eslintrc`

---

### I2: No HTTPS Enforcement in Vite Dev Config -- INFORMATIONAL

**Location:** `/Users/yc/dev/swarmrise/vite.config.ts`

**Description:**
The Vite development server does not enforce HTTPS. This is standard for local development but should be noted for staging/production deployments.

**Impact:** None for local development. Production is served via Vercel which enforces HTTPS.

**Recommendation:**
No action needed for current setup. Ensure production hosting (Vercel) enforces HTTPS redirects.

---

### I3: localStorage Usage for Non-Sensitive UI Preferences -- INFORMATIONAL

**Location:** Multiple frontend files including:
- `/Users/yc/dev/swarmrise/src/routes/OrgaIndexRoute.tsx`
- `/Users/yc/dev/swarmrise/src/contexts/ThemeContext.tsx`
- `/Users/yc/dev/swarmrise/src/tools/orgaStore/index.tsx`

**Description:**
The application uses `localStorage` for storing UI preferences: theme selection, selected organization ID, and i18n language. No sensitive data (tokens, credentials, PII) is stored in localStorage.

**Impact:** None. This is acceptable usage of localStorage for non-sensitive UI state.

**Recommendation:**
No action needed. Continue avoiding storage of sensitive data in localStorage.

---

### I4: Test Data Utilities Present in Codebase -- INFORMATIONAL

**Location:** `/Users/yc/dev/swarmrise/convex/dataTest/`

**Description:**
The `dataTest` directory contains test data generation utilities for creating test users, organizations, and populating avatars. While most of these are `internalMutation` or `internalAction` (not publicly accessible), `populateMemberAvatars` is a public action (see H2). The presence of test utilities in the production codebase increases the attack surface.

**Impact:** The `internalMutation` and `internalAction` functions are not directly callable from the client and pose minimal risk. However, they add complexity to the codebase and could be accidentally exposed.

**Recommendation:**
Consider moving test utilities to a separate directory that can be excluded from production deployments. At minimum, ensure all test functions use `internal*` function types.

**Remediation (commit 5ad7e74):** All test functions in `dataTest/` now use `internal*` function types (`internalMutation`, `internalAction`, `internalQuery`). The previously public `populateMemberAvatars` was converted to `internalAction`.

---

## Authentication and Authorization Review

### Strengths

1. **Consistent auth helpers**: The codebase uses `getAuthenticatedUser()` and `requireAuthAndMembership()` consistently across virtually all Convex functions.
2. **Multi-tenant isolation**: All organizational queries correctly use `orgaId`-based indexes (`by_orga`, `by_orga_and_person`, etc.) ensuring data cannot leak between organizations.
3. **Webhook verification**: Clerk webhooks are properly verified using svix signature validation via an internal action.
4. **User self-service boundaries**: `updateUser` correctly verifies `authenticatedUser._id !== args.userId` to prevent users from modifying other users' profiles.
5. **Notification ownership**: All notification mutations verify `notification.userId !== user._id` before allowing modifications.
6. **Owner-only operations**: `deleteOrganization` and `transferOwnership` correctly verify owner status before proceeding.
7. **Invitation recipient verification**: `acceptInvitation` and `rejectInvitation` verify `invitation.email !== user.email` to ensure only the recipient can respond.

### Weaknesses

1. **No role-based access control (RBAC)**: Most mutations only check membership, not role. Any member can create teams, roles, policies, and invitations. The data model has role types (leader, secretary, referee) but these are not enforced as authorization levels.
2. **Missing authorization granularity**: Functions like `updateTeam`, `deletePolicy`, `deleteInvitation`, and `createPolicy` should have role-based restrictions. *(Note: `updateOrga` and `updateInvitationStatus` have been fixed -- see M3 and M4.)*

---

## Input Validation Review

### Strengths

1. **Convex validators on all functions**: Every query and mutation has `args` and `returns` validators using Convex's `v.*` system, providing type-safe input validation.
2. **Email domain validation**: The `validateAndNormalizeEmailDomains` function performs thorough validation of email domain formats.
3. **Business logic validation**: Cross-entity validation is performed (e.g., verifying role belongs to team, team belongs to org, preventing circular team references).

### Weaknesses

1. **No string length limits**: String fields like `name`, `title`, `mission`, `text` have no maximum length restrictions via validators. A malicious user could submit extremely long strings.
2. ~~**No URL validation on contact info**~~: *(Fixed in M7)* Frontend `getContactLink` functions now sanitize URLs to only allow `https:`, `http:`, `mailto:`, and `tel:` protocols.
3. **No RGB value range validation**: The `colorScheme` RGB values accept any number, not just 0-255.
4. **No limit cap on pagination**: The `limit` parameter in decisions queries accepts any positive number.

---

## Data Flow Security

### Strengths

1. **Immutable audit trail**: All modifications create decision records, providing full traceability.
2. **Index-based queries**: Most queries use `withIndex()` instead of `filter()`, following Convex best practices.
3. **Internal functions properly scoped**: `internalMutation`, `internalQuery`, and `internalAction` are correctly used for webhook handlers, test data, and system operations.

### Weaknesses

1. **Full document exposure in queries**: Most list queries return complete documents. Consider returning only necessary fields for list views.
2. **Decision diff stores full before/after state**: Decision records capture full state snapshots which could contain sensitive data.

---

## Frontend Security Review

### Strengths

1. **No `dangerouslySetInnerHTML` usage**: The codebase does not use `dangerouslySetInnerHTML` anywhere.
2. **No `eval()`, `innerHTML`, or `document.write()`**: No dynamic code execution patterns found.
3. **React 19 JSX auto-escaping**: All user content is rendered through React's JSX which auto-escapes by default.
4. **Clerk-managed authentication**: Authentication tokens and session management are handled by Clerk's SDK, reducing the risk of implementation errors.
5. **No sensitive data in localStorage**: Only UI preferences are stored client-side.

### Weaknesses

1. ~~**User-supplied URLs in `href` attributes**~~: *(Fixed in M7)* Contact info URLs are now sanitized via `sanitizeUrl()` allowlist.
2. **No CSP headers**: Missing Content Security Policy (see L1).

---

## Dependency Security Status

| Package                          | Current    | Vulnerability                | Severity  | In Production? |
|----------------------------------|------------|------------------------------|-----------|----------------|
| js-yaml (via eslint)             | >=4.0.0    | Prototype pollution in merge | Moderate  | No (dev only)  |

All production dependencies appear to be current and free of known vulnerabilities as of the audit date.

---

## Secrets and Configuration Review

### Findings

1. ~~**`.env.development` committed to git**~~: *(Fixed in H1)* Removed from git tracking. `.env.example` added as a safe template.
2. ~~**`.env.production` committed to git**~~: *(Fixed in H1)* Removed from git tracking.
3. **`.env.local` is NOT tracked**: Correctly excluded by `.gitignore` pattern `*.local`.
4. **No hardcoded secrets in source code**: No API secret keys, tokens, or credentials found in any source files.
5. **`CLERK_WEBHOOK_SECRET` and `ADMIN_EMAIL` are server-side env vars**: Correctly referenced via `process.env` in Convex server code, not exposed to the client.
6. **`VITE_*` prefixed vars are intentionally public**: Clerk publishable key and Convex URL are designed to be client-side.

---

## Overall Security Posture

**Rating: Low Risk (after remediation)**

The application has a solid security foundation. All High and Medium severity issues have been remediated. Authentication is consistently enforced, multi-tenant isolation is properly implemented at the data layer, and the webhook integration follows security best practices. The React frontend avoids common XSS pitfalls, and the Convex backend benefits from type-safe validators.

Key improvements made:
1. ~~**High-severity issues (H1, H2)**~~ -- env files removed from git, public test action secured
2. ~~**Storage access (M1, M2)**~~ -- authentication added, deletion made internal-only
3. ~~**Authorization (M3, M4)**~~ -- org settings restricted to owner, invitation status restricted to emitter/owner with state machine
4. ~~**Rate limiting (M5)**~~ -- invitation creation capped at 50/day per member
5. ~~**Data integrity (M6)**~~ -- team deletion now cleans up roles, topics, and policies
6. ~~**XSS prevention (M7)**~~ -- URL protocol sanitization applied to all contact links

Remaining areas for improvement:
1. **Add role-based authorization** to remaining mutations (`updateTeam`, `deletePolicy`, `createPolicy`)
2. **Add input length limits** to string validators to prevent abuse
3. **Improve pagination** to avoid collecting all records into memory
4. **Add Content Security Policy** headers

The absence of full role-based access control (RBAC) remains the most significant architectural gap. While the data model supports roles (leader, secretary, referee), most mutations beyond `updateOrga` and `updateInvitationStatus` still only check membership.

---

## Action Items (Prioritized)

1. ~~**[CRITICAL]** Remove `.env.development` and `.env.production` from git tracking~~ -- **Done** (5ad7e74)
2. ~~**[CRITICAL]** Change `populateMemberAvatars` from `action` to `internalAction`~~ -- **Done** (5ad7e74)
3. ~~**[HIGH]** Add authentication to `getStorageUrl` query~~ -- **Done** (f079038)
4. ~~**[HIGH]** Convert `deleteStorageFile` to `internalMutation`~~ -- **Done** (f079038)
5. ~~**[HIGH]** Restrict `updateOrga` and `updateInvitationStatus` to owner/emitter~~ -- **Done** (f079038)
6. ~~**[MEDIUM]** Add URL protocol validation for contact info values~~ -- **Done** (f079038)
7. ~~**[MEDIUM]** Add state machine validation for invitation status transitions~~ -- **Done** (f079038)
8. ~~**[MEDIUM]** Fix `deleteTeam` to clean up orphaned roles, topics, and policies~~ -- **Done** (f079038)
9. ~~**[MEDIUM]** Add rate limiting on invitation creation~~ -- **Done** (f079038)
10. **[MEDIUM]** Implement role-based authorization for `deletePolicy` and `createPolicy`
11. **[MEDIUM]** Add string length limits to all `v.string()` validators
12. **[LOW]** Cap `limit` parameter in pagination queries
13. **[LOW]** Add Content Security Policy headers
14. **[LOW]** Replace in-memory pagination with proper cursor-based queries
15. **[LOW]** Sanitize error messages to avoid leaking internal implementation details

---

## Self-Verification Checklist

- [x] Checked for all OWASP Top 10 categories relevant to the code
- [x] Reviewed authentication and authorization flows
- [x] Scanned for hardcoded secrets or credentials
- [x] Assessed input validation completeness
- [x] Verified proper error handling (no sensitive data leakage identified beyond informational messages)
- [x] Checked dependency versions against known vulnerabilities
- [x] Provided clear, actionable recommendations for each finding
