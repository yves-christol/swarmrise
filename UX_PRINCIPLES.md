# Swarmrise UX Principles

This document defines the user experience philosophy that guides all interface decisions in Swarmrise. These are actionable rules, not abstract ideals.

**Canonical Source:** [Notion Brand Guidelines](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61)

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Flat Organization Design](#flat-organization-design)
3. [Full Reactivity](#full-reactivity)
4. [Pure Simplicity](#pure-simplicity)
5. [Interaction Patterns](#interaction-patterns)
6. [Feedback and States](#feedback-and-states)
7. [Accessibility](#accessibility)
8. [Anti-Patterns](#anti-patterns)

---

## Core Philosophy

### Three Pillars

1. **Full Reactivity** - Every interaction feels immediate. The UI responds instantly to user actions.
2. **Pure Simplicity** - Strip away everything that does not serve the user's goal.
3. **Clarity Over Cleverness** - Choose obvious solutions over clever ones.

### The Swarm Mindset

A swarm has no single leader directing every action. Instead, each member acts on local information and simple rules, and complex, intelligent behavior emerges. Swarmrise UI should feel the same way:

- No element demands disproportionate attention
- Structure emerges from relationships, not hierarchy
- Every part serves the whole equally

---

## Flat Organization Design

Swarmrise exists to support organizations that reject traditional command-and-control hierarchies. This core value MUST be reflected in every visual and interaction decision.

### Equal Visual Weight

All roles within a team are peers, regardless of their function. The leader role coordinates, the secretary documents, the referee ensures process - but none is "above" another.

**Rules:**

| Element | Correct | Incorrect |
|---------|---------|-----------|
| Circle size | Same radius for all roles | Larger circles for special roles |
| Font size | Consistent across all roles | Larger text for leaders |
| Font weight | Same weight for all roles | Bold for leaders, normal for others |
| Stroke width | Consistent or thinner accent | Thicker borders for special roles |

**Implementation:**

```tsx
// CORRECT: All roles use the same radius
const ROLE_RADIUS = 36; // Single constant for all roles

positions.push({
  role: anyRole,
  radius: ROLE_RADIUS, // Same for leader, secretary, referee, or regular
});

// CORRECT: Same typography for all roles
<text fontSize={12} fontWeight={500}>
  {role.title}
</text>
```

```tsx
// INCORRECT: Different sizes based on role type
radius: role.roleType === "leader" ? 42 : 32 // Creates visual hierarchy

// INCORRECT: Different typography emphasis
fontSize={role.roleType === "leader" ? 14 : 12}
fontWeight={role.roleType === "leader" ? 700 : 500}
```

### Differentiation Through Color and Iconography

Different functions ARE allowed to have different colors and icons. This provides clarity without implying hierarchy.

**Allowed differentiation:**

- Stroke color (e.g., gold for leader, blue for secretary, purple for referee)
- Small badge icons (star, quill, gavel) positioned consistently
- Background tint within the same opacity range

**Not allowed:**

- Size differences
- Position prominence (e.g., leader always at center or top)
- Animation prominence (e.g., more elaborate effects for leaders)

### Spatial Arrangement

When positioning roles:

- Use geometric arrangements that do not privilege any position (e.g., equilateral triangles, regular polygons)
- If special roles are grouped, they share the same ring or distance from center
- Avoid top-center positioning that implies "head of organization"

---

## Full Reactivity

### Instant Feedback

Users should never wonder if their action registered. Every interaction triggers immediate visual response.

**Rules:**

1. Hover states appear in under 50ms
2. Click/tap feedback is instantaneous (visual change on pointer down, not up)
3. Mutations optimistically update the UI before server confirmation
4. Loading states appear only after 200ms delay (avoid flash for fast operations)

**Tailwind implementation:**

```tsx
// Hover transition that feels instant
className="transition-colors duration-75"

// For drag operations, disable transitions
style={{ transition: isDragging ? "none" : "transform 100ms ease-out" }}
```

### Real-time Updates

Convex provides real-time subscriptions. Leverage this for:

- Live presence indicators
- Collaborative editing
- Instant propagation of changes across all connected clients

### Progressive Loading

When data takes time:

1. Show skeleton UI immediately
2. Load critical content first
3. Populate secondary information as it arrives
4. Never block the entire interface

---

## Pure Simplicity

### Essential Elements Only

Every element must justify its existence. Ask:

- Does this help the user complete their task?
- Could this be removed without losing meaning?
- Is this decoration or function?

### Information Hierarchy

Present information in order of importance:

1. **Primary**: The main action or information (largest, most prominent)
2. **Secondary**: Supporting context (smaller, muted color)
3. **Tertiary**: Metadata, timestamps (smallest, most muted)

```tsx
// Clear hierarchy through size and color
<h2 className="text-xl font-bold">{team.name}</h2>           // Primary
<p className="text-sm text-gray-600">{team.description}</p>  // Secondary
<span className="text-xs text-gray-400">{createdAt}</span>   // Tertiary
```

### White Space

Generous spacing improves comprehension. Do not crowd elements to fit more on screen.

```tsx
// Page sections: large gaps
<main className="flex flex-col gap-16">

// Within sections: medium gaps
<section className="flex flex-col gap-6">

// Related elements: small gaps
<div className="flex items-center gap-2">
```

---

## Interaction Patterns

### Click vs. Drag

- **Single click**: Primary action (navigate, select)
- **Double click**: Secondary action (unpin, edit inline)
- **Drag**: Spatial manipulation (reposition, reorder)

Ensure drag does not conflict with click by requiring minimum movement threshold:

```tsx
if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
  hasMoved.current = true; // Now it's a drag, not a click
}
```

### Focus Navigation

All interactive elements must be keyboard accessible:

```tsx
<g
  role="button"
  tabIndex={0}
  aria-label={`${role.title}, ${role.roleType || "team member"}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAction();
    }
  }}
>
```

### Zoom and Navigation

For nested structures (orgas > teams > roles):

1. Click to zoom in
2. Explicit "back" button to zoom out
3. Breadcrumb trail for deep nesting
4. Animate transitions to maintain spatial awareness

---

## Feedback and States

### Loading States

| Duration | Treatment |
|----------|-----------|
| 0-200ms | No indicator (feels instant) |
| 200ms-2s | Subtle spinner or skeleton |
| 2s+ | Progress indicator with context |

```tsx
// Delayed loading indicator
const [showLoading, setShowLoading] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setShowLoading(true), 200);
  return () => clearTimeout(timer);
}, []);
```

### Empty States

Empty is not error. Guide users toward action:

```tsx
<div className="flex flex-col items-center gap-4">
  <Logo size={48} begin={0} repeatCount={2} />
  <h3 className="font-swarm text-xl font-bold">No roles yet</h3>
  <p className="text-gray-400 text-center max-w-xs">
    This team has no roles defined. Create your first role to see it here.
  </p>
</div>
```

### Error States

- Brief, human-readable message
- Clear recovery action when possible
- Never expose technical details to users

```tsx
// Good
"Could not save changes. Please try again."

// Bad
"Error: ECONRESET - Connection reset by peer"
```

### Success States

Most successes should be silent. The UI simply updates to reflect the new state. Only use explicit success feedback for:

- Irreversible actions (deletion)
- Actions with delayed effect (invitations sent)
- Major milestones (organization created)

---

## Accessibility

### Minimum Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support with meaningful labels
- Sufficient color contrast (4.5:1 for text)

### Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition-duration: 0.01ms !important;
  }
}
```

### Alternative Representations

For visual-only content (diagrams, charts), provide text alternatives:

```tsx
<details className="sr-only focus-within:not-sr-only">
  <summary>View as text list</summary>
  <ul>
    {roles.map((role) => (
      <li key={role._id}>{role.title}</li>
    ))}
  </ul>
</details>
```

---

## Anti-Patterns

### What NOT to Do

| Anti-Pattern | Why It's Wrong | Better Approach |
|--------------|----------------|-----------------|
| Larger circles for leaders | Implies hierarchy | Same size, different color |
| Bold text for special roles | Visual prominence = importance | Consistent typography |
| Leader at top/center | Positional hierarchy | Geometric equality |
| Confirmation dialogs for everything | Slows users down | Undo instead of confirm |
| Tooltips for obvious actions | Clutters interface | Self-explanatory labels |
| Loading spinners immediately | Feels slow | Delay 200ms before showing |
| Error messages in red only | Inaccessible to colorblind | Icon + color + text |
| Hiding actions in menus | Increases friction | Surface common actions |

### Hierarchy Creep

Watch for subtle ways hierarchy sneaks back in:

- "VIP" or "premium" styling for certain users
- Animation emphasis for certain roles
- Z-index that puts some elements permanently above others
- Language that implies rank ("under", "above", "reports to")

---

## Quick Reference

### Checklist Before Shipping

- [ ] All roles/elements are visually equal in size?
- [ ] Color differentiation follows brand palette?
- [ ] Keyboard navigation works completely?
- [ ] Loading states have appropriate delay?
- [ ] Empty states guide toward action?
- [ ] Reduced motion preference respected?
- [ ] Screen reader labels are meaningful?
- [ ] Touch targets are at least 44x44px?

### Key Tailwind Patterns

```tsx
// Instant hover feedback
className="transition-colors duration-75 hover:bg-gray-100"

// Accessible focus ring
className="focus:outline-none focus:ring-2 focus:ring-[#eac840]"

// Dark mode responsive
className="bg-white dark:bg-gray-800 text-dark dark:text-light"

// Consistent spacing
className="p-4 gap-4" // Cards
className="p-8 gap-8" // Page sections
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 1.0.0 | Initial UX principles established |

---

*This document should be updated whenever UX decisions are made. For questions not covered here, consult the [Brand Guidelines](./BRAND.md) or the [Notion source](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61).*
