# Focus Navigation - UX Design Specification

This document defines the user experience for the focus-based navigation system in Swarmrise, enabling seamless transitions between organizational views (orga, team, and future: role, member).

---

## Overview

The focus concept determines what component occupies the main view when authenticated with an organization selected. Navigation between focus levels uses meaningful zoom transitions that reinforce spatial mental models.

### Focus Hierarchy

```
Orga (root)
  |-- Team (zoom in)
        |-- Role (future)
              |-- Member (future)
```

---

## Design Principles Applied

Following the three pillars from BRAND.md:

### Full Reactivity
- Transitions respond immediately to user intent
- State changes propagate visually without delay
- Animation frames never skip or stutter
- Focus state is reactive to URL and selection changes

### Pure Simplicity
- Single gesture (click) to zoom in
- Single button (graph icon) to zoom out
- No intermediate states or confirmation dialogs
- Clear visual hierarchy at every level

### Clarity Over Cleverness
- Zoom metaphor is universally understood
- The clicked element becomes the new view (no abstraction)
- Exit button is always visible and obvious
- Spatial memory is preserved (zooming back returns to origin)

---

## Focus States

### State 1: Orga Focus (Current Implementation)

**Display**: OrgNetworkDiagram - D3 force-directed graph of all teams
**Entry**: Default when organization is selected
**Exit**: Click on any team node triggers zoom-in transition

```
+------------------------------------------+
|                 [Header]                 |
+------------------------------------------+
|                                          |
|      [Team A]         [Team B]           |
|           \             /                |
|            \           /                 |
|             [Team C]                     |
|                  |                       |
|             [Team D]                     |
|                                          |
+------------------------------------------+
```

### State 2: Team Focus (New Implementation)

**Display**: TeamRolesCircle - Large circle filling the viewport with concentric role rings
**Entry**: Zoom-in transition from orga view when team node clicked
**Exit**: Click zoom-out button (top-left corner)

```
+------------------------------------------+
| [<] Graph   [Team Name]        [Header]  |
+------------------------------------------+
|                                          |
|          +-------------------+           |
|        /                       \         |
|      /    +--------------+       \       |
|     |    |   Secretary    |       |      |
|     |    |  +----------+  |       |      |
|     |    | |  Leader   |  |       |      |
|     |    |  +----------+  |       |      |
|     |    +--------------+         |      |
|      \                           /       |
|        \   [Other Roles Ring]  /         |
|          +-------------------+           |
|                                          |
+------------------------------------------+
```

---

## Component Architecture

### Focus Store (Extension to OrgaStore)

```typescript
// Addition to src/tools/orgaStore/index.tsx

type FocusTarget =
  | { type: "orga" }
  | { type: "team"; teamId: Id<"teams"> }
  // Future:
  // | { type: "role"; roleId: Id<"roles"> }
  // | { type: "member"; memberId: Id<"members"> }

type FocusState = {
  current: FocusTarget
  previous: FocusTarget | null  // For zoom-out to return correctly
  isTransitioning: boolean
}

// New exports
const useFocus: () => {
  focus: FocusTarget
  focusOnTeam: (teamId: Id<"teams">) => void
  focusOnOrga: () => void
  isTransitioning: boolean
}
```

### Component Hierarchy

```
Authentified
  |__ FocusContainer (new - manages transitions)
        |__ OrgNetworkDiagram (focus: orga)
        |__ TeamRolesCircle (focus: team)
        |__ TransitionOverlay (during zoom animations)
```

---

## Transition Specifications

### Zoom In: Orga to Team

**Trigger**: Click/tap on team node in OrgNetworkDiagram
**Duration**: 400ms (matches existing nodeReveal animation timing)
**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out, feels natural)

**Animation Sequence**:

1. **Frame 0-100ms**: Team node scales up slightly (1.0 to 1.1), other nodes fade to 50% opacity
2. **Frame 100-300ms**: Viewport zooms toward clicked node, node grows to fill viewport
3. **Frame 300-400ms**: Node circle morphs into TeamRolesCircle background, content fades in

```tsx
// Keyframe definition
@keyframes zoomInToTeam {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  25% {
    transform: scale(1.1);
  }
  75% {
    transform: scale(8);
    opacity: 0.9;
  }
  100% {
    transform: scale(10);
    opacity: 0;
  }
}

@keyframes teamViewReveal {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Implementation Notes**:
- Capture clicked node position and radius before transition starts
- Create portal overlay at exact node position
- Animate overlay expansion while fading out original diagram
- Mount TeamRolesCircle beneath overlay, then fade overlay out

### Zoom Out: Team to Orga

**Trigger**: Click zoom-out button
**Duration**: 350ms (slightly faster, feels responsive)
**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

**Animation Sequence**:

1. **Frame 0-100ms**: TeamRolesCircle content fades, outer circle shrinks slightly
2. **Frame 100-250ms**: Circle contracts toward original team node position
3. **Frame 250-350ms**: OrgNetworkDiagram fades in, team node pulses once to orient user

```tsx
@keyframes zoomOutToOrga {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.15);
    opacity: 0.8;
  }
  100% {
    transform: scale(0.1);
    opacity: 0;
  }
}

@keyframes orgaViewReveal {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes originNodePulse {
  0%, 100% {
    stroke-width: 3;
    stroke: #eac840;
  }
  50% {
    stroke-width: 6;
    stroke: #eac840;
  }
}
```

---

## TeamRolesCircle Component

### Visual Design

**Layout**: Single large circle filling available space with concentric rings for roles

**Ring Hierarchy** (from center outward):
1. **Center**: Team name and core info
2. **Inner Ring**: Leader role (if exists) - gold accent
3. **Middle Ring**: Secretary + Referee (if exist)
4. **Outer Ring(s)**: All other roles, distributed evenly

```
+----------------------------------+
|                                  |
|    +------------------------+    |
|    |                        |    |
|    |   +----------------+   |    |
|    |   |   [Leader]     |   |    |
|    |   |                |   |    |
|    |   |   Team Name    |   |    |
|    |   |                |   |    |
|    |   +----------------+   |    |
|    |                        |    |
|    | [Sec]   [Other Roles]  |    |
|    |                        |    |
|    +------------------------+    |
|                                  |
|   [Role] [Role] [Role] [Role]    |
|                                  |
+----------------------------------+
```

### Role Node Design

Each role is represented as a smaller circle within its ring:

```tsx
// Role node in team view
<g className="role-node">
  {/* Outer circle - role boundary */}
  <circle
    cx={x}
    cy={y}
    r={roleRadius}
    fill="var(--diagram-node-fill)"
    stroke={getRoleStroke(roleType)}  // Gold for leader, blue for special roles
    strokeWidth={2}
  />

  {/* Role type indicator (for special roles) */}
  {roleType && (
    <circle
      cx={x}
      cy={y - roleRadius + 8}
      r={6}
      fill={getRoleTypeBadgeColor(roleType)}
    />
  )}

  {/* Role title */}
  <text
    x={x}
    y={y - 4}
    textAnchor="middle"
    className="text-sm font-swarm"
  >
    {truncateTitle(role.title)}
  </text>

  {/* Member name (smaller) */}
  <text
    x={x}
    y={y + 12}
    textAnchor="middle"
    className="text-xs text-gray-400"
  >
    {memberName}
  </text>
</g>
```

### Color Coding for Roles

| Role Type | Stroke Color | Badge Color | Tailwind |
|-----------|--------------|-------------|----------|
| Leader | Bee Gold `#eac840` | Gold `#d4af37` | `stroke-[#eac840]` |
| Secretary | Wing Blue `#a2dbed` | Light Blue `#e0f0f4` | `stroke-[#a2dbed]` |
| Referee | Muted Purple | Light Purple | `stroke-purple-400` |
| Regular | Default border | None | `stroke-gray-400 dark:stroke-gray-600` |

### Sizing Algorithm

```typescript
const calculateRolePlacement = (
  roles: Role[],
  containerSize: { width: number; height: number }
) => {
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 40;

  // Sort roles by type for ring placement
  const leader = roles.find(r => r.roleType === "leader");
  const specialRoles = roles.filter(r =>
    r.roleType === "secretary" || r.roleType === "referee"
  );
  const regularRoles = roles.filter(r => !r.roleType);

  // Ring radii
  const centerRadius = maxRadius * 0.25;  // Team name area
  const innerRing = maxRadius * 0.4;       // Leader
  const middleRing = maxRadius * 0.6;      // Special roles
  const outerRing = maxRadius * 0.85;      // Regular roles

  // Calculate positions
  const positions: RolePosition[] = [];

  // Leader at center-ish
  if (leader) {
    positions.push({
      role: leader,
      x: centerX,
      y: centerY - innerRing * 0.3,
      radius: 40,
    });
  }

  // Special roles distributed on middle ring
  specialRoles.forEach((role, i) => {
    const angle = (Math.PI / 3) * (i + 1);  // 60-degree spacing
    positions.push({
      role,
      x: centerX + Math.cos(angle) * middleRing,
      y: centerY + Math.sin(angle) * middleRing,
      radius: 35,
    });
  });

  // Regular roles distributed on outer ring
  regularRoles.forEach((role, i) => {
    const angle = (2 * Math.PI * i) / regularRoles.length - Math.PI / 2;
    positions.push({
      role,
      x: centerX + Math.cos(angle) * outerRing,
      y: centerY + Math.sin(angle) * outerRing,
      radius: 30,
    });
  });

  return positions;
};
```

### Empty State (No Roles)

When a team has no roles defined:

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4">
  <Logo size={48} begin={0} repeatCount={2} />
  <h3 className="font-swarm text-xl">No roles yet</h3>
  <p className="text-gray-400 text-center max-w-xs">
    This team has no roles defined. Create your first role to see it here.
  </p>
</div>
```

---

## Zoom-Out Button Design

### Placement

Fixed position, top-left corner of the view (not inside the SVG).

### Visual Design

```tsx
<button
  onClick={focusOnOrga}
  className="
    absolute top-4 left-4 z-10
    flex items-center gap-2
    px-3 py-2
    bg-white dark:bg-gray-800
    border border-gray-300 dark:border-gray-700
    rounded-lg
    shadow-md hover:shadow-lg
    transition-shadow
    text-gray-700 dark:text-gray-200
    hover:text-dark dark:hover:text-light
  "
  aria-label="Return to organization overview"
>
  {/* Simplified network graph icon */}
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    {/* Three connected circles representing network */}
    <circle cx="10" cy="5" r="3" />
    <circle cx="5" cy="15" r="3" />
    <circle cx="15" cy="15" r="3" />
    {/* Connection lines */}
    <line x1="10" y1="8" x2="6" y2="12" />
    <line x1="10" y1="8" x2="14" y2="12" />
    <line x1="8" y1="15" x2="12" y2="15" />
  </svg>

  <span className="text-sm font-medium">Overview</span>
</button>
```

### States

| State | Style |
|-------|-------|
| Default | Light background, subtle border, shadow-md |
| Hover | Elevated shadow-lg, slightly darker background |
| Focus | Ring-2 with bee gold color |
| Active | Scale down slightly (0.98) |

### Accessibility

```tsx
aria-label="Return to organization overview"
role="button"
tabIndex={0}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    focusOnOrga();
  }
}}
```

---

## State Management

### URL Integration (Optional Enhancement)

Sync focus state with URL for shareable deep links:

```
/app                        -> Orga focus (default)
/app?team=abc123           -> Team focus on team abc123
```

```typescript
// URL sync hook
const useFocusUrl = () => {
  const searchParams = useSearchParams();
  const { focus, focusOnTeam, focusOnOrga } = useFocus();

  // Sync URL to state on mount
  useEffect(() => {
    const teamId = searchParams.get("team");
    if (teamId) {
      focusOnTeam(teamId as Id<"teams">);
    }
  }, []);

  // Sync state to URL on change
  useEffect(() => {
    if (focus.type === "team") {
      window.history.replaceState(null, "", `?team=${focus.teamId}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [focus]);
};
```

### Persistence Considerations

**Do NOT persist focus state to localStorage** because:
- Focus is transient navigation, not a preference
- Deep links provide explicit navigation when needed
- Returning users should see the orga overview first

---

## Accessibility

### Keyboard Navigation

| Focus State | Key | Action |
|-------------|-----|--------|
| Orga | Enter on team node | Zoom to that team |
| Orga | Tab | Move between team nodes |
| Team | Escape | Return to orga view |
| Team | Tab | Move between role nodes |
| Team | Enter on role | (Future: zoom to role) |

### Screen Reader Announcements

```tsx
// On zoom-in
<div role="status" aria-live="polite" className="sr-only">
  Now viewing team: {teamName}. Press Escape to return to organization overview.
</div>

// On zoom-out
<div role="status" aria-live="polite" className="sr-only">
  Returned to organization overview showing {teamCount} teams.
</div>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .zoom-transition {
    animation: none !important;
    transition: opacity 150ms ease-out !important;
  }

  /* Instant view swap instead of zoom */
  .focus-orga,
  .focus-team {
    animation: fadeIn 150ms ease-out;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Focus Management

- When zooming in, move focus to the first role node (or team header if no roles)
- When zooming out, return focus to the team node that was previously focused
- Use `aria-hidden` on the view being transitioned out

---

## Implementation Phases

### Phase 1: Core Focus State (Recommended First)

1. Add focus state to OrgaStore (or create separate FocusStore)
2. Create FocusContainer wrapper component
3. Wire up team node click in OrgNetworkDiagram to set focus
4. Create basic TeamRolesCircle component (no animation yet)
5. Create zoom-out button

**Deliverable**: Focus navigation works with instant view swap (no animation)

### Phase 2: Transitions

1. Create TransitionOverlay component
2. Implement zoom-in animation sequence
3. Implement zoom-out animation sequence
4. Add reduced motion support

**Deliverable**: Smooth zoom transitions between views

### Phase 3: Polish

1. Add URL sync
2. Add screen reader announcements
3. Add keyboard shortcuts (e.g., Backspace for zoom-out)
4. Refine role node sizing and positioning algorithm
5. Add role hover/selection states

**Deliverable**: Production-ready focus navigation

### Phase 4: Future Extensions (Not Now)

1. Role focus level
2. Member focus level
3. Breadcrumb trail for deep navigation
4. Swipe gestures for mobile

---

## Performance Considerations

### SVG vs Canvas

The TeamRolesCircle should use **SVG** (not Canvas) because:
- Consistent with OrgNetworkDiagram
- Better accessibility (elements can be focused/labeled)
- Simpler to style with CSS variables
- Number of elements is bounded (roles per team)

### Animation Performance

- Use `transform` and `opacity` only (GPU-accelerated)
- Avoid layout-triggering properties during animation
- Use `will-change: transform, opacity` on animating elements
- Clean up `will-change` after animation completes

### Memory

- Unmount non-visible views after transition completes
- Keep one view in DOM during transition (overlay technique)
- Do not preload all team views

---

## Testing Checklist

### Functionality
- [ ] Click on team node zooms to team view
- [ ] Click zoom-out button returns to orga view
- [ ] Correct team data displayed in team view
- [ ] Roles arranged in correct rings based on type
- [ ] Empty state shown for teams with no roles

### Transitions
- [ ] Zoom-in animation completes in ~400ms
- [ ] Zoom-out animation completes in ~350ms
- [ ] No visual glitches during transition
- [ ] Reduced motion respects preference

### Accessibility
- [ ] Keyboard navigation works (Enter to zoom, Escape to return)
- [ ] Screen reader announces view changes
- [ ] Focus management is correct
- [ ] All interactive elements have accessible names

### Edge Cases
- [ ] Zoom to team then switch organizations
- [ ] Zoom to team that is deleted while viewing
- [ ] Window resize during transition
- [ ] Rapid click between team nodes

---

## Visual Reference

### Color Palette Summary

```
Background:      light: #eeeeee    dark: #212121
Surfaces:        light: white      dark: gray-800
Borders:         light: gray-300   dark: gray-700
Primary Text:    light: #212121    dark: #eeeeee
Muted Text:      light: gray-600   dark: gray-400
Brand Accent:    #eac840 (Bee Gold)
Brand Hover:     #d4af37 (Dark Gold)
Info Accent:     #a2dbed (Wing Blue)
```

### Z-Index Layers

```
Base diagram:        0
Zoom-out button:    10
Transition overlay: 20
Header:             30
Modals (future):    40
```

---

*Last updated: 2026-02-02*
