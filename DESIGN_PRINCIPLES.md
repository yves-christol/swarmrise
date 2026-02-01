# Swarmrise Design Principles

This document defines the UX philosophy and interaction patterns for Swarmrise. These principles guide all interface decisions and ensure a consistent, delightful user experience.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Full Reactivity](#full-reactivity)
3. [Pure Simplicity](#pure-simplicity)
4. [Loading States](#loading-states)
5. [Error Handling](#error-handling)
6. [Empty States](#empty-states)
7. [Transitions and Animation](#transitions-and-animation)
8. [Feedback Patterns](#feedback-patterns)
9. [Accessibility](#accessibility)
10. [Domain-Specific Patterns](#domain-specific-patterns)
11. [Anti-Patterns](#anti-patterns)

---

## Core Philosophy

### The Three Pillars

1. **Full Reactivity**: Every interaction feels immediate. State changes propagate visually without delay.

2. **Pure Simplicity**: Strip away everything that doesn't serve the user's goal. Every pixel earns its place.

3. **Clarity Over Cleverness**: Choose obvious solutions over clever ones. Users should never have to figure out how to use the interface.

### The User's Perspective

Users come to Swarmrise to:
- Understand their organization's structure at a glance
- Make decisions with full context and traceability
- Know who is responsible for what
- Trust that changes are recorded and visible

The interface should **get out of the way** of these goals.

---

## Full Reactivity

### Why It Matters

Swarmrise uses Convex, a real-time backend. This architectural choice enables reactive UIs that feel alive. The interface should honor this capability.

### Principles

#### Immediate Visual Feedback

When a user takes an action, something should change visually within 100ms.

```tsx
// Good: Optimistic UI with instant feedback
const handleAssignRole = async () => {
  // UI updates immediately via Convex's reactive queries
  await assignRole({ memberId, roleId });
};

// The query automatically updates when data changes
const roles = useQuery(api.roles.functions.listByMember, { memberId });
```

#### Live Data, Not Stale Snapshots

Never show data that might be stale. Use reactive queries.

```tsx
// Good: Always current
const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts);

// Anti-pattern: Fetching once and caching locally
const [orgas, setOrgas] = useState([]);
useEffect(() => { fetchOrgas().then(setOrgas); }, []);
```

#### Propagate State Changes

When data changes in one place, all views of that data should update simultaneously.

- If a member is assigned a new role, both the member view and the role view update
- If an organization name changes, it updates in the header, cards, and any lists
- No "refresh to see changes" patterns

### Implementation Pattern

```tsx
// Convex reactive queries power the UI
export const Authentified = () => {
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts);

  // undefined = loading, empty array = no data, array = data
  if (orgasWithCounts === undefined) {
    return <LoadingState />;
  }

  if (orgasWithCounts.length === 0) {
    return <EmptyState />;
  }

  return <OrgaGrid orgas={orgasWithCounts} />;
};
```

---

## Pure Simplicity

### Why It Matters

Organizational governance is inherently complex. The interface must not add cognitive load.

### Principles

#### Show Only What's Needed

Each screen should answer one primary question. Secondary information is available but not prominent.

```tsx
// Good: Primary info prominent, secondary accessible
<div className="flex flex-col items-center">
  <div className="text-4xl font-bold">{counts.members}</div>
  <div className="text-sm text-gray-600">Members</div>
</div>

// Anti-pattern: Everything competing for attention
<div className="text-2xl font-bold text-blue-500 underline flex items-center gap-2">
  <Icon /> {counts.members} active members in this organization <Badge>New!</Badge>
</div>
```

#### Progressive Disclosure

Start with the minimum. Reveal complexity only when needed.

- Organization card shows counts; click to see details
- Role shows title; expand to see duties
- Decision shows summary; expand to see full diff

#### Consistent Visual Weight

Elements of the same importance should look the same.

```tsx
// Good: All metrics have same visual treatment
<div className="grid grid-cols-3 gap-4">
  <Metric value={members} label="Members" color="blue" />
  <Metric value={teams} label="Teams" color="green" />
  <Metric value={roles} label="Roles" color="purple" />
</div>

// Anti-pattern: Arbitrary differences
<div className="text-4xl">{members}</div>
<div className="text-2xl font-light">{teams}</div>
<div className="text-3xl text-red-500">{roles}</div>
```

#### Whitespace is Intentional

Space separates concepts. Lack of space indicates relationship.

```tsx
// Good: Clear grouping through spacing
<div className="flex flex-col gap-16">      {/* Major sections */}
  <section className="flex flex-col gap-6"> {/* Within sections */}
    <div className="flex flex-col gap-2">   {/* Related elements */}
```

---

## Loading States

### Principles

1. **Never Show Nothing**: A blank screen is disorienting
2. **Indicate Progress**: Users should know something is happening
3. **Preserve Layout**: Loading states should match the shape of loaded content
4. **Be Brief**: Optimize for fast loads; loading states shouldn't be memorable

### Patterns

#### Simple Loading Text

For fast operations or when skeleton complexity isn't worth it:

```tsx
if (data === undefined) {
  return (
    <div className="mx-auto">
      <p>Loading...</p>
    </div>
  );
}
```

#### Skeleton Loading

For lists and grids, preserve the expected layout:

```tsx
// Skeleton card matching real card dimensions
const SkeletonCard = () => (
  <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
    <div className="grid grid-cols-3 gap-4">
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  </div>
);
```

#### Logo Animation

Use the animated bee for longer operations or empty-feeling screens:

```tsx
<div className="flex flex-col items-center gap-4">
  <Logo size={48} begin={0} repeatCount={-1} /> {/* Infinite animation */}
  <p className="text-gray-600">Loading your organizations...</p>
</div>
```

### Anti-Patterns

- Full-screen spinners that block interaction
- Loading states that flash too quickly (add minimum display time if needed)
- Different loading patterns in similar contexts

---

## Error Handling

### Principles

1. **Be Honest**: Tell users what went wrong
2. **Be Brief**: Don't over-explain
3. **Be Helpful**: Offer a path forward
4. **Be Calm**: Errors happen; don't panic the user

### Patterns

#### Inline Errors

For form validation and field-level issues:

```tsx
<input
  className={`border rounded p-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
/>
{error && (
  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
    {error.message}
  </p>
)}
```

#### Section Errors

When a component fails to load:

```tsx
<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
  <p className="text-red-800 dark:text-red-200">
    Unable to load team members.
    <button className="underline ml-2" onClick={retry}>Try again</button>
  </p>
</div>
```

#### Page-Level Errors

When navigation fails or critical data is missing:

```tsx
<div className="flex flex-col items-center gap-4 p-8">
  <h2 className="text-xl font-bold">Something went wrong</h2>
  <p className="text-gray-600 dark:text-gray-400">
    We couldn't find that organization.
  </p>
  <button className="px-4 py-2 bg-dark text-light rounded">
    Go to dashboard
  </button>
</div>
```

### Error Message Writing

| Do | Don't |
|-----|-------|
| "Organization not found" | "Error 404: Resource not found in database" |
| "Sign in to continue" | "Authentication required to access this resource" |
| "Unable to save changes" | "SAVE_FAILED: Network error occurred" |

---

## Empty States

### Principles

1. **Acknowledge the Emptiness**: Don't pretend nothing is wrong
2. **Explain Why**: First time? No results? Different messages.
3. **Guide Forward**: What should the user do next?
4. **Stay Positive**: Empty isn't bad; it's a fresh start

### Patterns

#### First-Time Empty

When the user has no data because they're new:

```tsx
<div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
  <h1 className="text-3xl font-bold">Welcome!</h1>
  <p>You are not a member of any organizations yet.</p>
  <button className="px-4 py-2 bg-[#eac840] text-dark rounded">
    Create your first organization
  </button>
</div>
```

#### Search Empty

When a filter or search returns nothing:

```tsx
<div className="text-center p-8">
  <p className="text-gray-600 dark:text-gray-400">
    No teams match your search.
  </p>
  <button className="underline mt-2" onClick={clearSearch}>
    Clear search
  </button>
</div>
```

#### Contextual Empty

When a specific area has no content:

```tsx
<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
  <p className="text-gray-600 dark:text-gray-400">
    No roles assigned yet
  </p>
  <button className="text-sm underline mt-2">
    Assign first role
  </button>
</div>
```

---

## Transitions and Animation

### Principles

1. **Purpose Over Polish**: Every animation should serve a function
2. **Fast is Better**: Prefer 150-200ms transitions
3. **Entrance > Exit**: Animate things appearing; let them disappear instantly
4. **Consistent Easing**: Use Tailwind's default `transition` timing

### Acceptable Animations

| Pattern | Duration | Purpose |
|---------|----------|---------|
| Hover feedback | 150ms | Indicate interactivity |
| Card shadow on hover | 200ms | Depth feedback |
| Accordion expand | 200ms | Reveal content |
| Page transition | 0ms | Instant navigation |
| Logo wing flutter | 100ms per cycle | Brand personality |

### Implementation

```tsx
// Hover state transition
className="shadow-lg hover:shadow-xl transition-shadow"

// Background color transition
className="bg-white hover:bg-gray-50 transition-colors"

// Combined transitions
className="transition-all duration-200"
```

### Animation Anti-Patterns

- Animations longer than 300ms for UI feedback
- Bouncing or elastic effects (too playful for governance software)
- Animations that block user action
- Parallax scrolling
- Auto-playing animations (except logo)

---

## Feedback Patterns

### Principles

1. **Immediate Acknowledgment**: User knows their action was received
2. **Proportional Response**: Big actions get visible feedback; small ones don't
3. **Silent Success**: Most successes don't need celebration
4. **Undo Over Confirm**: Let users fix mistakes rather than blocking them

### Feedback Levels

| Action | Feedback |
|--------|----------|
| Typing in input | Character appears (native) |
| Clicking button | Brief visual state change |
| Submitting form | Loading state, then result |
| Destructive action | Confirm dialog OR undo option |
| Background save | No visible feedback (Convex handles) |

### When to Use Toasts

Toasts (brief notifications) should be rare:

**Use toasts for:**
- Async operations that complete later
- Actions affecting data the user can't currently see
- Important warnings

**Don't use toasts for:**
- Every successful action
- Validation errors (inline is better)
- Navigation confirmations

### Confirmation Dialogs

Reserve for truly destructive, irreversible actions:

- Deleting an organization
- Removing a member (after which they lose access)
- Revoking roles with consequences

Most actions in Swarmrise are tracked in Decisions and can be reversed, so confirmation dialogs should be rare.

---

## Accessibility

### Baseline Requirements (WCAG 2.1 AA)

1. **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
2. **Keyboard Navigation**: All interactive elements reachable via Tab
3. **Focus Indicators**: Visible focus rings on all focusable elements
4. **Alt Text**: All images have descriptive alternatives
5. **Semantic HTML**: Use proper heading hierarchy and landmarks

### Implementation Checklist

```tsx
// Good: Accessible button
<button
  className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  aria-label="Create new organization"
>
  <PlusIcon aria-hidden="true" />
</button>

// Good: Accessible image
<img
  src={orga.logoUrl}
  alt={`${orga.name} organization logo`}
  className="w-12 h-12 object-contain"
/>

// Good: Accessible form
<label htmlFor="org-name" className="block text-sm font-medium">
  Organization name
</label>
<input
  id="org-name"
  type="text"
  aria-describedby="org-name-hint"
/>
<p id="org-name-hint" className="text-sm text-gray-500">
  This will be visible to all members
</p>
```

### Color Accessibility

The Swarmrise palette meets AA requirements:

| Combination | Contrast Ratio | Pass/Fail |
|-------------|----------------|-----------|
| Dark text on Light bg (#212121 on #eeeeee) | 12.6:1 | Pass |
| Light text on Dark bg (#eeeeee on #212121) | 12.6:1 | Pass |
| Gray-600 on white | 5.7:1 | Pass |
| Gray-400 on gray-800 | 4.6:1 | Pass |

### Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Domain-Specific Patterns

### Organization Cards

Primary entry point to an organization. Show:
- Organization name (prominent)
- Logo (if exists)
- Key metrics (members, teams, roles)

```tsx
<div className="border-2 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
  <div className="flex items-center gap-4 mb-4">
    {orga.logoUrl && <img src={orga.logoUrl} className="w-12 h-12" />}
    <h2 className="text-xl font-bold">{orga.name}</h2>
  </div>
  <MetricsGrid counts={counts} />
</div>
```

### Team Hierarchy

Visualize team structure clearly:
- Indentation for nesting
- Lines or arrows for parent-child relationships
- Leader prominently indicated

### Role Assignments

Show the connection between member and role:
- Avatar or initials for quick recognition
- Role title with team context
- Special role types visually distinguished (leader, secretary, referee)

### Decision Audit Trail

Present changes chronologically:
- Clear before/after states
- Who made the change and when
- Grouped by entity when viewing entity history

### Multi-Tenant Awareness

Always clear which organization context the user is in:
- Organization selector visible when relevant
- Organization name/logo in header
- No cross-organization data leakage in UI

---

## Anti-Patterns

### What to Avoid

| Anti-Pattern | Why It's Bad | Better Alternative |
|--------------|--------------|-------------------|
| Modal for every action | Interrupts flow | Inline editing, optimistic UI |
| "Are you sure?" for everything | Confirmation fatigue | Undo capability |
| Success toasts for every save | Noise | Silent success + reactive UI |
| Loading spinners over content | Blocks visibility | Skeleton loaders |
| Infinite scroll everywhere | Disorienting for lists | Pagination or load more |
| Hamburger menu on desktop | Hides navigation | Visible nav |
| Custom scrollbars | Platform inconsistency | Native scrollbars |
| Tooltip for essential info | Hidden information | Visible labels |
| Red for non-errors | Confusion | Reserve red for danger |
| ALL CAPS buttons | Aggressive | Sentence case |

### Code Smells

```tsx
// Anti-pattern: Alert for feedback
const handleSave = async () => {
  await save();
  alert('Saved!'); // Don't do this
};

// Anti-pattern: Manual refresh
<button onClick={() => window.location.reload()}>
  Refresh to see changes
</button>

// Anti-pattern: Disabling submit during network call
<button disabled={isLoading}>Save</button> // OK sometimes, but prefer optimistic

// Anti-pattern: Inline styles for theming
style={{ backgroundColor: darkMode ? '#212121' : '#eeeeee' }} // Use Tailwind dark:
```

---

## Decision Framework

When making UX decisions, ask:

1. **Does this feel instant?** If not, how can we make it reactive?
2. **Can we remove this?** Does every element earn its place?
3. **Would a new user understand?** Is clarity prioritized?
4. **Is this accessible?** Can everyone use it?
5. **Is this consistent?** Does it match existing patterns?

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-01 | 1.0.0 | Initial design principles established |

---

*These principles should evolve with the product. When new patterns emerge or existing ones prove problematic, update this document and reference it in code reviews.*
