# React Router Migration Plan

This document outlines the migration from the current focus-based navigation model to React Router URL-based navigation for swarmrise.

**Goal:** Enable browser history navigation, bookmarking, and URL sharing while preserving the existing UX and visual design.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed URL Structure](#proposed-url-structure)
3. [Migration Architecture](#migration-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
6. [Accessibility Considerations](#accessibility-considerations)
7. [Testing Plan](#testing-plan)

---

## Current State Analysis

### How Navigation Works Today

The application uses a **focus-based model** managed by `OrgaStoreProvider`:

```typescript
// Current focus types (src/tools/orgaStore/types.ts)
type FocusTarget =
  | { type: "orga" }
  | { type: "team"; teamId: Id<"teams"> }
  | { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> }
  | { type: "member"; memberId: Id<"members"> };
```

**Key characteristics:**
- State lives in React Context (`OrgaStoreContext`)
- Transitions are animated with zoom effects
- View mode toggles between "visual" (SVG diagrams) and "manage" (web forms)
- The selected organization is persisted in `localStorage`
- Focus state is NOT persisted - always starts at member view ("You come first")

### Components Involved

| Component | Location | Purpose |
|-----------|----------|---------|
| `OrgaStoreProvider` | `/src/tools/orgaStore/index.tsx` | Central state management |
| `FocusContainer` | `/src/components/FocusContainer/index.tsx` | Renders current view based on focus |
| `OrgaVisualView` | `/src/components/OrgaVisualView/index.tsx` | Organization diagram |
| `TeamVisualView` | `/src/components/TeamVisualView/index.tsx` | Team roles circle |
| `RoleVisualView` | `/src/components/RoleVisualView/index.tsx` | Individual role view |
| `MemberVisualView` | `/src/components/MemberVisualView/index.tsx` | Member profile view |
| `*ManageView` | `/src/components/*ManageView/index.tsx` | Management views for each entity |
| `ViewToggle` | `/src/components/ViewToggle/index.tsx` | Visual/manage toggle |

### Current Routing

React Router is already installed and configured (`react-router` v7.13.0). Current routes:

```tsx
// src/main.tsx
<Routes>
  <Route path="/" element={<App />} />
  <Route path="/rawdata" element={<RawDataPage />} />
  <Route path="/principles" element={<PrinciplesPage />} />
  <Route path="/glossary" element={<GlossaryPage />} />
  <Route path="/terms" element={<TermsPage />} />
  <Route path="/privacy" element={<PrivacyPage />} />
</Routes>
```

---

## Proposed URL Structure

### Design Principles

1. **RESTful and Readable**: URLs should be human-readable and follow REST conventions
2. **Hierarchical**: Reflect the orga > team > role / member relationship
3. **Bookmarkable**: Every view state can be represented as a URL
4. **Minimal**: Only include necessary path segments

### URL Schema

```
Base path: /o/:orgaId

Full structure:
/                                     -> Home (unauthenticated: landing, authenticated: redirect to selected orga)
/o/:orgaId                            -> Organization view (default: visual)
/o/:orgaId/manage                     -> Organization manage view
/o/:orgaId/teams/:teamId              -> Team visual view
/o/:orgaId/teams/:teamId/manage       -> Team manage view
/o/:orgaId/teams/:teamId/roles/:roleId          -> Role visual view
/o/:orgaId/teams/:teamId/roles/:roleId/manage   -> Role manage view
/o/:orgaId/members/:memberId          -> Member visual view
/o/:orgaId/members/:memberId/manage   -> Member manage view
```

### URL Examples

| URL | Description |
|-----|-------------|
| `/o/k17abc123def` | View organization network diagram |
| `/o/k17abc123def/manage` | Manage organization settings |
| `/o/k17abc123def/teams/j57xyz789abc` | View team roles circle |
| `/o/k17abc123def/teams/j57xyz789abc/roles/h23qrs456tuv` | View role details |
| `/o/k17abc123def/members/m89lmn123opq` | View member profile |

### Why This Structure

1. **`/o/:orgaId` prefix**: Short, clear, distinguishes from static pages (`/terms`, `/privacy`)
2. **`teams/:teamId` vs `team/:teamId`**: Plural for collections, consistent with REST
3. **`/manage` suffix**: Clear intent, preserves parent route for default view
4. **No `/visual` suffix**: Visual is the default, cleaner URLs for common case

### Query Parameters (Optional Enhancement)

For future extensibility, support optional query params:

```
/o/:orgaId/teams/:teamId?zoom=1.5&center=200,300
/o/:orgaId?panel=decisions
```

---

## Migration Architecture

### Approach: Parallel Router Alongside Focus State

Rather than replacing the focus system entirely, we'll make the router the **source of truth** while keeping the focus system as the **animation orchestrator**.

```
URL Change -> Router -> Update Focus State -> Animate -> Render
User Action -> Update Focus State -> Update URL (pushState) -> Render
```

### New Architecture

```
src/
  routes/
    OrgaRoute.tsx       # Route wrapper for /o/:orgaId/*
    TeamRoute.tsx       # Route wrapper for teams
    RoleRoute.tsx       # Route wrapper for roles
    MemberRoute.tsx     # Route wrapper for members
  hooks/
    useRouteSync.ts     # Bidirectional sync between URL and focus state
    useNavigateWithTransition.ts  # Navigate with animation support
  tools/
    orgaStore/
      index.tsx         # Modified to accept external focus updates
      navigationSync.ts # NEW: URL <-> Focus state synchronization
```

### Key Changes

#### 1. OrgaStoreProvider Enhancement

Add the ability to receive focus state from outside (URL):

```typescript
// Add to OrgaStoreContextType
setFocusFromRoute: (focus: FocusTarget) => void;
```

#### 2. Route Components

Each route component:
- Extracts IDs from URL params
- Validates the entities exist
- Syncs to focus state
- Handles loading/error states

#### 3. Navigation Functions Enhancement

Current navigation functions (e.g., `focusOnTeam`) will be enhanced to:
- Update focus state (for animation)
- Update URL via `navigate()` (for browser history)

```typescript
// Before
const focusOnTeam = useCallback((teamId: Id<"teams">, origin?: TransitionOrigin) => {
  // ... animation setup
  setFocus({ type: "team", teamId });
}, []);

// After
const focusOnTeam = useCallback((teamId: Id<"teams">, origin?: TransitionOrigin) => {
  // ... animation setup
  setFocus({ type: "team", teamId });
  navigate(`/o/${selectedOrgaId}/teams/${teamId}`);
}, [navigate, selectedOrgaId]);
```

---

## Implementation Phases

### Phase 1: Route Structure (Foundation)

**Goal:** Set up routes without breaking existing behavior

**Tasks:**
1. Create route configuration with all entity routes
2. Implement `OrgaRoute` wrapper that reads `:orgaId` and syncs to `selectOrga`
3. Add catch-all route within `/o/:orgaId/*` that renders `AuthenticatedView`
4. Ensure existing navigation still works (URL not yet updated on navigation)

**Files to modify:**
- `/src/main.tsx` - Add new route structure
- `/src/components/App/index.tsx` - Keep for unauthenticated, redirect authenticated

**Files to create:**
- `/src/routes/OrgaRoute.tsx`
- `/src/routes/index.ts`

**Deliverable:** URLs can be manually typed to reach views, but clicking doesn't update URL yet.

---

### Phase 2: URL Sync (Bidirectional)

**Goal:** Keep URL and focus state synchronized

**Tasks:**
1. Create `useRouteSync` hook that:
   - Listens to URL changes and updates focus state
   - Watches focus state and updates URL (with `replaceState` to avoid double entries)
2. Modify `FocusContainer` to use the sync hook
3. Handle organization switching via URL

**Files to modify:**
- `/src/tools/orgaStore/index.tsx` - Add `setFocusFromRoute`
- `/src/components/FocusContainer/index.tsx` - Add route sync

**Files to create:**
- `/src/hooks/useRouteSync.ts`

**Deliverable:** URL updates when navigating, and deep links work.

---

### Phase 3: View Mode in URL

**Goal:** Include visual/manage state in URL

**Tasks:**
1. Add `/manage` suffix support to all entity routes
2. Sync `viewMode` state with URL
3. Ensure view toggle updates URL

**Files to modify:**
- `/src/tools/orgaStore/index.tsx` - Sync viewMode with URL
- `/src/components/ViewToggle/index.tsx` - Navigate instead of just setState
- `/src/routes/*.tsx` - Handle `/manage` suffix

**Deliverable:** Bookmarking manage view works correctly.

---

### Phase 4: Entity Validation and Error Handling

**Goal:** Handle invalid URLs gracefully

**Tasks:**
1. Add loading states while validating entity existence
2. Create `NotFound` component for invalid IDs
3. Handle deleted entities (redirect to parent)
4. Handle permission errors (redirect to home or show error)

**Files to create:**
- `/src/components/NotFound/index.tsx`
- `/src/routes/ErrorBoundary.tsx`

**Deliverable:** Invalid URLs show helpful error messages, not broken UI.

---

### Phase 5: "You Come First" Redirect

**Goal:** Preserve the auto-focus on current user's member view

**Tasks:**
1. When navigating to `/o/:orgaId` without a subpath:
   - If user has a member in this org, redirect to `/o/:orgaId/members/:myMemberId`
   - If no member (owner without member?), stay on org view
2. Make this behavior optional via localStorage preference

**Files to modify:**
- `/src/routes/OrgaRoute.tsx` - Add redirect logic

**Deliverable:** "You come first" behavior preserved via URL redirect.

---

### Phase 6: Transition Animation Preservation

**Goal:** Ensure animations work with URL-based navigation

**Tasks:**
1. Preserve `transitionOrigin` when navigating via URL
2. Handle browser back/forward with appropriate animation direction
3. Ensure animation completion before URL change is committed

**Files to modify:**
- `/src/tools/orgaStore/index.tsx` - Track navigation direction from popstate
- `/src/components/FocusContainer/index.tsx` - Support external navigation

**Deliverable:** Animations feel natural with browser navigation.

---

### Phase 7: Polish and Edge Cases

**Goal:** Handle all edge cases

**Tasks:**
1. Handle rapid navigation (debounce URL updates)
2. Handle organization switching mid-navigation
3. Support browser refresh at any URL depth
4. Clean up localStorage selected orga when URL takes precedence
5. Add analytics events for page views

**Deliverable:** Production-ready URL navigation.

---

## Edge Cases and Error Handling

### Invalid Entity IDs

**Scenario:** User bookmarks a role, then the role is deleted.

**Handling:**
1. Route component attempts to fetch entity
2. If entity returns `null`, show `NotFound` with options:
   - Navigate to parent (team -> org)
   - Navigate to home
3. Do NOT throw - graceful degradation

```tsx
// In RoleRoute.tsx
const role = useQuery(api.roles.functions.getRoleById, { roleId });

if (role === null) {
  return <NotFound
    message={t("roleNotFound")}
    backTo={`/o/${orgaId}/teams/${teamId}`}
  />;
}
```

### Permission Errors

**Scenario:** User tries to access an org they're not a member of.

**Handling:**
1. Check membership in `OrgaRoute`
2. If not a member, redirect to `/` with a toast message
3. For teams/roles/members in orgs user can access, show `NotFound`

### Stale Organization Selection

**Scenario:** URL has `orgaId=A`, but localStorage has `orgaId=B`.

**Resolution:**
- URL wins
- Update localStorage to match URL
- Sync `selectOrga` from URL on mount

### Deep Link to Manage View

**Scenario:** User shares `/o/.../teams/.../manage` link.

**Handling:**
- Parse `/manage` suffix
- Set `viewMode: "manage"` in focus state
- Render `TeamManageView` directly

### Browser Back During Animation

**Scenario:** User clicks back while zoom animation is in progress.

**Handling:**
1. Cancel current animation immediately
2. Start reverse animation from current visual state
3. Or: use `prefers-reduced-motion` to skip animation

---

## Accessibility Considerations

### Focus Management

When URL changes:
1. Move focus to the main content area
2. Announce the new view via `aria-live`
3. Ensure back button is focusable

```tsx
// On route change
useEffect(() => {
  document.getElementById("main-content")?.focus();
  announceToScreenReader(`Now viewing ${getViewDescription(focus)}`);
}, [focus]);
```

### Browser History

Screen reader users rely on browser history:
- Each navigation MUST create a history entry
- Back/forward MUST work predictably
- URL MUST reflect current state

### Skip Links

Add skip link for deep URLs:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Testing Plan

### Unit Tests

| Test Case | Description |
|-----------|-------------|
| Route parsing | Verify IDs extracted correctly from URLs |
| Focus sync | URL change updates focus state |
| Navigation | Focus change updates URL |
| View mode | `/manage` suffix sets correct mode |

### Integration Tests

| Test Case | Description |
|-----------|-------------|
| Deep link to role | Open `/o/.../teams/.../roles/...` directly |
| Back button | Navigate in, press back, verify previous view |
| Org switch via URL | Change orgaId in URL, verify data loads |
| Invalid ID | Navigate to deleted entity, verify error handling |

### E2E Tests

| Test Case | Description |
|-----------|-------------|
| Full navigation flow | Home -> Org -> Team -> Role -> Member -> Back x4 |
| Bookmark and restore | Navigate, bookmark, close, reopen bookmark |
| Share URL | Copy URL, paste in incognito, verify same view |
| Refresh at depth | Navigate to role, refresh, verify same view |

### Manual Testing Checklist

- [ ] Browser back/forward buttons work
- [ ] Animation plays correctly on URL navigation
- [ ] View toggle updates URL
- [ ] Organization selector updates URL
- [ ] Deep links work when not authenticated (redirect to login, then back)
- [ ] Keyboard navigation still works
- [ ] Screen reader announces navigation

---

## Migration Rollout

### Feature Flag (Optional)

Consider a feature flag to enable URL routing:
```typescript
const USE_URL_ROUTING = import.meta.env.VITE_FEATURE_URL_ROUTING === "true";
```

This allows:
- Testing in production with subset of users
- Easy rollback if issues discovered
- Gradual rollout

### Backwards Compatibility

Old URLs (`/`) will continue to work:
- Redirect authenticated users to their default org
- Show landing page to unauthenticated users

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `/src/routes/index.ts` | Route configuration export |
| `/src/routes/OrgaRoute.tsx` | Organization route wrapper |
| `/src/routes/TeamRoute.tsx` | Team route wrapper |
| `/src/routes/RoleRoute.tsx` | Role route wrapper |
| `/src/routes/MemberRoute.tsx` | Member route wrapper |
| `/src/hooks/useRouteSync.ts` | URL <-> Focus synchronization |
| `/src/components/NotFound/index.tsx` | 404-style error page |

### Files to Modify

| File | Changes |
|------|---------|
| `/src/main.tsx` | New route structure |
| `/src/tools/orgaStore/index.tsx` | Add `setFocusFromRoute`, URL sync |
| `/src/components/FocusContainer/index.tsx` | Integrate route sync |
| `/src/components/ViewToggle/index.tsx` | Navigate on toggle |
| `/src/components/OrgaVisualView/index.tsx` | Use navigate for team clicks |
| `/src/components/TeamVisualView/index.tsx` | Use navigate for role clicks |
| `/src/components/RoleVisualView/index.tsx` | Use navigate for member clicks |
| `/src/components/MemberVisualView/index.tsx` | Use navigate for team/role clicks |
| `/src/components/Header/index.tsx` | Org selector uses navigate |
| `/src/components/OrgaSelector/index.tsx` | Navigate on org change |

---

## Open Questions

1. **Should `/` redirect to the last-selected org or show an org picker?**
   - Recommendation: Redirect to last-selected (matches current behavior)

2. **What happens when switching orgs mid-navigation (e.g., viewing team in org A, select org B)?**
   - Recommendation: Navigate to org B's root (`/o/:newOrgaId`)

3. **Should the member "You come first" redirect be optional?**
   - Recommendation: Yes, add a preference in settings

4. **Should we support hash-based fallback for older browsers?**
   - Recommendation: No, modern browsers only (React 19 requirement already excludes old browsers)

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Route Structure | 1-2 days | None |
| Phase 2: URL Sync | 2-3 days | Phase 1 |
| Phase 3: View Mode | 0.5 day | Phase 2 |
| Phase 4: Error Handling | 1 day | Phase 2 |
| Phase 5: "You Come First" | 0.5 day | Phase 2 |
| Phase 6: Animations | 1-2 days | Phase 2 |
| Phase 7: Polish | 1-2 days | All above |
| **Total** | **7-11 days** | |

---

## Conclusion

This migration preserves the existing user experience while adding URL-based navigation. The key insight is that the focus system becomes an **animation layer** rather than the source of truth, with the URL taking that role.

The phased approach allows for incremental delivery and testing, reducing risk while delivering value early (Phase 2 provides functional URL navigation).

---

*Document created: 2026-02-08*
*Last updated: 2026-02-08*
