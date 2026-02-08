# Security Assessment Report

**Assessment Date:** February 1, 2026
**Scope:** Full codebase review of swarmrise application
**Stack:** React 19 + Vite, Convex backend, Clerk authentication, Tailwind CSS v4

---

## Executive Summary

This security assessment identified **1 High**, **5 Medium**, and **4 Low** severity findings. The codebase demonstrates generally good security practices, particularly in its authentication and authorization patterns within Convex functions. However, there are several areas requiring attention, most notably **environment files containing credentials committed to git history** and **a mutation function lacking proper authorization checks**.

The multi-tenant isolation using `orgaId` is consistently implemented across most Convex functions through the `requireAuthAndMembership` helper. Input validation using Convex validators is thorough throughout the codebase.

### Risk Level: **Medium**

---

## Findings

### HIGH Severity

#### H1: Environment Files with Credentials Committed to Git

**Location:** `.env.development`, `.env.local`, `.env.production` (git commit `52744b5`)

**Description:**
Environment files containing development credentials have been committed to git history. These files contain:
- `CONVEX_DEPLOYMENT` - Convex deployment identifier
- `VITE_CONVEX_URL` - Convex cloud URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer domain

While these specific values are publishable/dev keys, the practice of committing `.env` files establishes a dangerous pattern that could lead to accidental exposure of secret keys in the future.

**Impact:**
- Credential exposure risk if secret keys are ever accidentally added
- Attackers with repo access can enumerate development infrastructure
- Violates security best practices for secrets management

**Recommendation:**
1. Add all `.env*` files (except `.env.example`) to `.gitignore`:
   ```
   .env*
   !.env.example
   ```
2. Consider using a secrets management solution (e.g., Vault, AWS Secrets Manager)
3. Rotate any exposed credentials
4. Use `git filter-branch` or BFG Repo Cleaner to remove sensitive files from git history if repository is public or shared

---

### MEDIUM Severity

#### M1: updateUser Mutation Lacks Authorization Check

**Location:** `/Users/yc/dev/swarmrise/convex/users/functions.ts:65-118`

**Description:**
The `updateUser` mutation allows updating any user document by ID without verifying that the authenticated user is the owner of that user record. Any authenticated user can potentially modify another user's profile.

```typescript
export const updateUser = mutation({
  args: {
    userId: v.id("users"),  // Attacker can provide any user ID
    // ...
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Missing: Check that authenticated user === args.userId
    // Proceeds to update without authorization check
  },
});
```

**Impact:**
- Horizontal privilege escalation allowing users to modify other users' profiles
- Data integrity compromise across the application
- Potential for impersonation attacks

**Recommendation:**
Add authorization check to verify the authenticated user matches the user being updated:
```typescript
handler: async (ctx, args) => {
  const authenticatedUser = await getAuthenticatedUser(ctx);
  if (authenticatedUser._id !== args.userId) {
    throw new Error("Not authorized to update this user");
  }
  // ... rest of handler
}
```

---

#### M2: Debug Authentication Endpoint Exposes Token Information

**Location:** `/Users/yc/dev/swarmrise/convex/myFunctions.ts:52-98`

**Description:**
The `debugAuth` query function exposes detailed authentication information including parsed JWT token headers and payloads. It also uses `v.any()` validators which bypass type safety.

```typescript
export const debugAuth = query({
  args: {},
  returns: v.object({
    hasAuth: v.boolean(),
    userIdentity: v.any(),     // Weak typing
    tokenInfo: v.optional(v.any()),  // Exposes JWT internals
  }),
  // ...
});
```

**Impact:**
- Exposes internal authentication details to any authenticated user
- Could reveal token structure useful for attack planning
- Weak validators (`v.any()`) bypass Convex's type safety

**Recommendation:**
1. Remove this debug function in production
2. If needed for development, restrict to admin users or use `internalQuery`
3. Replace `v.any()` with specific validators

---

#### M3: Hardcoded Admin Email in Internal Query

**Location:** `/Users/yc/dev/swarmrise/convex/admin.ts:33`

**Description:**
An admin email address is hardcoded in the `getAdmin` internal query function:

```typescript
return await ctx.db.query("users").withIndex('by_email',
  (q) => q.eq('email', 'yves.christol@gmail.com')).unique();
```

**Impact:**
- Admin identification is hardcoded rather than configured
- Makes role changes require code deployments
- Exposes admin identity in source code

**Recommendation:**
1. Move admin email(s) to environment configuration
2. Implement a proper admin role system using the existing roles infrastructure
3. Consider using Clerk's organization roles for admin designation

---

#### M4: Dependency Vulnerability - js-yaml Prototype Pollution

**Location:** `eslint > @eslint/eslintrc > js-yaml` (versions >=4.0.0 <4.1.1)

**Description:**
The `bun audit` command identified a moderate severity vulnerability in the js-yaml dependency:
- **Advisory:** GHSA-mh29-5h37-fv8m
- **Vulnerability:** Prototype pollution in merge (`<<`) operation

**Impact:**
- While this is a transitive dev dependency, prototype pollution can lead to denial of service or remote code execution in certain contexts

**Recommendation:**
1. Run `bun update` to update dependencies to latest compatible versions
2. Alternatively, run `bun update --latest` to include breaking changes
3. Review and update ESLint configuration if needed after upgrade

---

#### M5: Sample/Demo Functions in Production Codebase

**Location:** `/Users/yc/dev/swarmrise/convex/myFunctions.ts`

**Description:**
The codebase contains sample Convex functions (`listNumbers`, `addNumber`, `myAction`) that appear to be from project scaffolding. The `addNumber` mutation has no authentication requirement.

```typescript
export const addNumber = mutation({
  args: { value: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("numbers", { value: args.value });
  },
});
```

**Impact:**
- Unauthenticated data insertion
- Clutters API surface with unused endpoints
- Potential for abuse or confusion

**Recommendation:**
1. Remove unused sample functions before production deployment
2. If the `numbers` table is needed, add authentication requirements
3. Consider using separate development/production schemas

---

### LOW Severity

#### L1: Missing Content Security Policy (CSP) Headers

**Location:** `/Users/yc/dev/swarmrise/index.html`

**Description:**
The application does not define Content Security Policy headers in the HTML or through server configuration. CSP helps prevent XSS attacks by controlling which resources can be loaded.

**Impact:**
- Reduced defense against XSS attacks
- No protection against inline script injection

**Recommendation:**
Add CSP meta tag or configure CSP headers on the hosting platform:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.convex.cloud https://*.clerk.com">
```

---

#### L2: No Input Length Validation on String Fields

**Location:** Various Convex function validators

**Description:**
While Convex validators ensure type safety, there are no explicit length constraints on string inputs. Fields like `name`, `mission`, `text`, etc. accept strings of unlimited length.

**Impact:**
- Potential for denial of service through oversized inputs
- Database bloat from maliciously large strings
- UI rendering issues with extremely long values

**Recommendation:**
Add length validation where appropriate:
```typescript
// Custom validator with length check
const boundedString = (maxLength: number) =>
  v.string().refine(s => s.length <= maxLength,
    `String must be ${maxLength} characters or less`);
```

---

#### L3: External Logo URLs Not Validated

**Location:** `/Users/yc/dev/swarmrise/convex/orgas/functions.ts`

**Description:**
The `logoUrl` field accepts any string URL without validation. This could allow:
- Non-HTTPS URLs
- Invalid URLs
- Potentially malicious redirect URLs

**Impact:**
- Mixed content warnings if HTTP URLs are used
- Potential for phishing through misleading images
- XSS if URL is rendered unsafely (mitigated by React's default escaping)

**Recommendation:**
1. Validate URL format and scheme (require HTTPS)
2. Consider URL allowlisting for image hosting domains
3. Use Convex file storage for uploaded logos instead of external URLs

---

#### L4: Invitation Email Not Validated for Format

**Location:** `/Users/yc/dev/swarmrise/convex/invitations/functions.ts:58-126`

**Description:**
The `createInvitation` mutation accepts an email string without validating its format:

```typescript
args: {
  orgaId: v.id("orgas"),
  email: v.string(),  // No format validation
}
```

**Impact:**
- Invitations to invalid emails waste resources
- Potential for abuse with malformed email strings
- Poor UX when invalid invitations are created

**Recommendation:**
Add email format validation using a regex or email validator library:
```typescript
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Then validate in handler before processing
```

---

## Positive Security Observations

The following security practices are well-implemented in the codebase:

### Authentication and Authorization
- Clerk integration is properly configured with JWT validation
- The `requireAuthAndMembership` helper consistently enforces org-level access
- Most Convex functions properly validate membership before data access

### Multi-Tenant Isolation
- All organizational data tables have `by_orga` indexes
- Queries consistently filter by `orgaId` to prevent cross-tenant data leakage
- Member-to-organization relationships are properly validated

### Input Validation
- All Convex functions define `args` and `returns` validators
- ID types use `v.id("tableName")` for strong typing
- Union types properly constrain allowed values (e.g., `roleType`)

### Frontend Security
- No use of `dangerouslySetInnerHTML` detected
- React's default XSS protection is in place
- Convex queries handle authorization server-side

### Internal Functions
- Test data generation functions use `internalMutation` preventing external access
- Admin functions properly use `internalQuery`

---

## Recommendations Summary

### Immediate Actions (Before Production)
1. **[H1]** Add `.env*` files to `.gitignore` and remove from git history
2. **[M1]** Add authorization check to `updateUser` mutation
3. **[M2]** Remove or restrict `debugAuth` function
4. **[M5]** Remove sample functions from `myFunctions.ts`

### Short-Term Improvements
1. **[M3]** Move admin configuration to environment variables
2. **[M4]** Update dependencies to resolve js-yaml vulnerability
3. **[L1]** Implement Content Security Policy
4. **[L4]** Add email format validation

### Long-Term Enhancements
1. **[L2]** Implement string length validators across the codebase
2. **[L3]** Add URL validation for external resources
3. Consider implementing rate limiting at the API gateway level
4. Set up security scanning in CI/CD pipeline
5. Implement audit logging for sensitive operations (beyond the current Decision system)

---

## Dependency Status

| Package | Current | Status | Notes |
|---------|---------|--------|-------|
| @clerk/clerk-react | ^5.58.1 | OK | Latest stable |
| convex | ^1.30.0 | OK | Latest stable |
| react | ^19.2.1 | OK | Latest stable |
| js-yaml (transitive) | 4.0.0-4.1.0 | Vulnerable | Update via ESLint |
| vite | ^6.4.1 | OK | Latest stable |

Run `bun audit` regularly to check for new vulnerabilities.

---

## Verification Checklist

- [x] Checked for OWASP Top 10 categories
- [x] Reviewed authentication and authorization flows
- [x] Scanned for hardcoded secrets or credentials
- [x] Assessed input validation completeness
- [x] Verified proper error handling
- [x] Checked dependency versions against known vulnerabilities
- [x] Provided actionable recommendations

---

*This assessment was conducted as a point-in-time security review. Regular security assessments are recommended as the codebase evolves.*
