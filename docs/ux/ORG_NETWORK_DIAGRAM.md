# Organization Network Diagram - UX Design Specification

This document provides comprehensive design guidance for the interactive SVG organization visualization component. The component displays teams as circles connected through leader relationships, with zoom/pan navigation.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Visual Style](#visual-style)
3. [Circle Sizing Algorithm](#circle-sizing-algorithm)
4. [Layout Algorithm](#layout-algorithm)
5. [Connection Lines](#connection-lines)
6. [Typography](#typography)
7. [Interaction Patterns](#interaction-patterns)
8. [States and Feedback](#states-and-feedback)
9. [Animation and Transitions](#animation-and-transitions)
10. [Accessibility](#accessibility)
11. [Implementation Notes](#implementation-notes)

---

## Design Philosophy

This component embodies the swarmrise brand attributes:

- **Organic**: The layout should feel natural, like cells in a living organism or bees in a hive
- **Alive**: Leverage Convex real-time updates so the diagram breathes with the organization
- **Clear**: Relationships must be immediately visible without explanation
- **Light**: Minimal visual chrome, let the structure speak for itself

### Core UX Principles

1. **Immediate comprehension**: A new user should understand the org structure within 3 seconds
2. **Direct manipulation**: Pan and zoom should feel as natural as a map application
3. **Progressive disclosure**: Basic view shows teams; interaction reveals details
4. **No dead ends**: Every visual element should be interactive or informative

---

## Visual Style

### Circle Appearance

#### Base State

```
Light Mode:
- Fill: white (#ffffff)
- Stroke: gray-400 (#9ca3af)
- Stroke width: 2px

Dark Mode:
- Fill: gray-800 (#1f2937)
- Stroke: gray-600 (#4b5563)
- Stroke width: 2px
```

**Tailwind/CSS reference:**
```tsx
// SVG circle base styling
<circle
  fill="currentColor"
  className="text-white dark:text-gray-800"
  stroke="currentColor"
  className="stroke-gray-400 dark:stroke-gray-600"
  strokeWidth={2}
/>
```

#### Hover State

```
Light Mode:
- Fill: slate-50 (#f8fafc)
- Stroke: gray-500 (#6b7280)
- Stroke width: 2px
- Drop shadow: 0 4px 6px -1px rgba(0,0,0,0.1)

Dark Mode:
- Fill: gray-700 (#374151)
- Stroke: gray-500 (#6b7280)
- Stroke width: 2px
- Drop shadow: 0 4px 6px -1px rgba(0,0,0,0.3)
```

**Visual effect:** Subtle lift with shadow, like the circle is rising toward the user.

#### Selected State

```
Light Mode:
- Fill: white (#ffffff)
- Stroke: Bee Gold (#eac840)
- Stroke width: 3px
- Drop shadow: 0 0 0 3px rgba(234,200,64,0.3)

Dark Mode:
- Fill: gray-800 (#1f2937)
- Stroke: Bee Gold (#eac840)
- Stroke width: 3px
- Drop shadow: 0 0 0 3px rgba(234,200,64,0.3)
```

**Note:** The gold ring creates a "glow" effect that stands out without being aggressive.

#### Focus State (Keyboard Navigation)

```
All modes:
- Stroke: Wing Blue (#a2dbed)
- Stroke width: 3px
- Dashed outline: 2px offset
```

### Minimum and Maximum Circle Sizes

```
Minimum radius: 40px (teams with 0-1 roles)
Maximum radius: 120px (cap to prevent dominant circles)
```

These constraints ensure:
- All team names remain readable
- No single team dominates the visual space
- The diagram remains scannable

---

## Circle Sizing Algorithm

The requirement states: "Circle size proportional to number of roles (surface area linear with role count, not radius)."

### Mathematical Formula

Since area = pi * r^2, to make area linear with role count:

```
area = baseArea + (roleCount * areaPerRole)
radius = sqrt(area / pi)
```

### Recommended Values

```typescript
const MIN_AREA = 5027;  // ~40px radius minimum
const MAX_AREA = 45239; // ~120px radius maximum
const AREA_PER_ROLE = 1257; // ~20px radius increment per role

function calculateRadius(roleCount: number): number {
  const area = Math.min(
    MAX_AREA,
    Math.max(MIN_AREA, MIN_AREA + (roleCount * AREA_PER_ROLE))
  );
  return Math.sqrt(area / Math.PI);
}
```

### Visual Sizing Reference

| Roles | Approximate Radius | Visual Size |
|-------|-------------------|-------------|
| 0-1   | 40px              | Compact     |
| 2-3   | 50px              | Small       |
| 4-6   | 60px              | Medium      |
| 7-10  | 75px              | Large       |
| 11-15 | 90px              | Very Large  |
| 16+   | 120px (capped)    | Maximum     |

---

## Layout Algorithm

### Recommended Approach: Force-Directed Layout

Use a force-directed graph algorithm for organic, natural positioning. This aligns with the swarmrise "organic" brand attribute.

#### Force Parameters

```typescript
const layoutConfig = {
  // Repulsion between all nodes (prevents overlap)
  repulsionStrength: -400,

  // Attraction along edges (pulls connected teams together)
  linkStrength: 0.3,
  linkDistance: 150, // Base distance, scales with combined radii

  // Center gravity (prevents drift to edges)
  centerStrength: 0.05,

  // Collision detection (respects circle sizes)
  collisionPadding: 20, // Minimum gap between circles

  // Simulation parameters
  alphaDecay: 0.02,    // How quickly simulation settles
  velocityDecay: 0.4,  // Friction to prevent oscillation
};
```

#### D3-Force Implementation Reference

```typescript
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

const simulation = forceSimulation(nodes)
  .force('charge', forceManyBody().strength(-400))
  .force('link', forceLink(links).distance(d =>
    d.source.radius + d.target.radius + 50
  ))
  .force('center', forceCenter(width / 2, height / 2))
  .force('collision', forceCollide().radius(d => d.radius + 20));
```

### Alternative: Hierarchical Layout

If the organization has a clear tree structure (one root team, no cycles), consider a radial tree layout:

```
         [Root Team]
        /     |     \
   [Team A] [Team B] [Team C]
      |        |
  [Team D]  [Team E]
```

This works well for traditional hierarchies but may not suit all organizational structures.

### Layout Considerations

1. **Initial positioning**: Place nodes in a spiral from center to reduce initial chaos
2. **Stability**: Cache positions between renders; only re-simulate when structure changes
3. **Animation**: Animate position changes smoothly rather than snapping
4. **Responsiveness**: Recalculate center point on container resize

---

## Connection Lines

### Visual Representation of Leader Links

Leader connections show which team a leader role reports to (via `parentTeamId` on roles with `roleType: "leader"`).

#### Line Style

```
Light Mode:
- Stroke: gray-300 (#d1d5db)
- Stroke width: 2px
- Stroke dasharray: none (solid)

Dark Mode:
- Stroke: gray-600 (#4b5563)
- Stroke width: 2px
- Stroke dasharray: none (solid)
```

#### Line Endpoints

Lines should connect from **edge to edge**, not center to center:

```typescript
function getEdgePoint(
  fromCenter: Point,
  toCenter: Point,
  fromRadius: number
): Point {
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return {
    x: fromCenter.x + (dx / distance) * fromRadius,
    y: fromCenter.y + (dy / distance) * fromRadius,
  };
}
```

#### Direction Indicator

Show hierarchy direction with a subtle arrow or gradient:

**Option A - Arrow marker (recommended):**
```svg
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z"
          fill="currentColor"
          className="text-gray-400 dark:text-gray-500" />
  </marker>
</defs>
<line ... markerEnd="url(#arrow)" />
```

**Option B - Gradient fade:**
- Line starts solid at child team, fades to 50% opacity at parent team
- Suggests "flowing toward" the parent

#### Hover State for Lines

When hovering a connection line:
```
Stroke: Bee Gold Dark (#d4af37)
Stroke width: 3px
```

Both connected circles should also highlight subtly (opacity: 1, slight scale: 1.02).

---

## Typography

### Team Name Display

#### Placement

Team names appear centered inside circles:

```tsx
<text
  x={node.x}
  y={node.y}
  textAnchor="middle"
  dominantBaseline="central"
  className="font-swarm text-sm fill-gray-800 dark:fill-gray-200"
>
  {teamName}
</text>
```

#### Sizing Rules

| Circle Radius | Font Size | Max Characters |
|---------------|-----------|----------------|
| 40-50px       | 12px (xs) | 8-10           |
| 51-70px       | 14px (sm) | 12-14          |
| 71-100px      | 16px (base) | 16-18        |
| 101-120px     | 18px (lg) | 20-22          |

#### Text Overflow

For long team names:

1. **Truncate with ellipsis**: "Engineering..."
2. **Two-line wrap**: Split at word boundary if space allows
3. **Full name on hover**: Show tooltip with complete name

```tsx
function truncateTeamName(name: string, radius: number): string {
  const maxChars = Math.floor(radius / 5);
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 1) + '...';
}
```

#### Font Weight

- Default: `font-normal` (400)
- Selected: `font-bold` (700)

---

## Interaction Patterns

### Pan Navigation

**Behavior**: Click and drag on empty canvas space to pan the view.

```
Cursor: grab (default), grabbing (while dragging)
```

**Implementation:**
```typescript
const [offset, setOffset] = useState({ x: 0, y: 0 });
const [isPanning, setIsPanning] = useState(false);
const [panStart, setPanStart] = useState({ x: 0, y: 0 });

function handleMouseDown(e: MouseEvent) {
  if (e.target === svgElement) { // Empty space only
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isPanning) {
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }
}
```

### Zoom Navigation

**Behavior**: Mouse wheel or pinch gesture to zoom in/out.

```
Zoom center: Mouse cursor position (not viewport center)
Zoom range: 0.25x to 4x (prevents extreme zoom)
Zoom step: 1.1x per wheel tick
```

**Implementation:**
```typescript
const [scale, setScale] = useState(1);

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(4, Math.max(0.25, scale * zoomFactor));

  // Zoom toward cursor position
  const rect = svgRef.current.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  setOffset(prev => ({
    x: mouseX - (mouseX - prev.x) * (newScale / scale),
    y: mouseY - (mouseY - prev.y) * (newScale / scale),
  }));
  setScale(newScale);
}
```

### Zoom Controls (Optional UI)

If adding explicit zoom buttons:

```tsx
<div className="absolute bottom-4 right-4 flex flex-col gap-2">
  <button
    onClick={() => setScale(s => Math.min(4, s * 1.2))}
    className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg
               flex items-center justify-center text-xl
               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    aria-label="Zoom in"
  >
    +
  </button>
  <button
    onClick={() => setScale(s => Math.max(0.25, s / 1.2))}
    className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg
               flex items-center justify-center text-xl
               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    aria-label="Zoom out"
  >
    -
  </button>
  <button
    onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
    className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg
               flex items-center justify-center text-xs
               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    aria-label="Reset view"
  >
    1:1
  </button>
</div>
```

### Click Behaviors

| Target | Action | Result |
|--------|--------|--------|
| Team circle | Single click | Select team, show details panel |
| Team circle | Double click | Zoom to fit team + neighbors |
| Connection line | Single click | Highlight both teams |
| Empty space | Single click | Deselect all |
| Empty space | Drag | Pan view |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to next team circle |
| Shift+Tab | Move focus to previous team circle |
| Enter/Space | Select focused team |
| Escape | Deselect all, close details panel |
| Arrow keys | Pan view (when not on a team) |
| +/- | Zoom in/out |
| 0 | Reset zoom to 1:1 |
| Home | Center view on all teams |

---

## States and Feedback

### Loading State

While fetching teams and roles:

```tsx
<div className="flex items-center justify-center h-full">
  <div className="flex flex-col items-center gap-4">
    <svg className="animate-spin h-8 w-8 text-gray-400" ...>
      {/* Spinner SVG */}
    </svg>
    <span className="text-gray-400 text-sm">Loading organization structure...</span>
  </div>
</div>
```

### Empty State

When organization has no teams:

```tsx
<div className="flex flex-col items-center justify-center h-full gap-6 text-center">
  <Logo size={64} begin={0} repeatCount={2} />
  <div>
    <h3 className="font-swarm text-xl font-bold mb-2">No teams yet</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
      Create your first team to start mapping your organization structure.
    </p>
  </div>
  <button className="px-4 py-2 bg-[#eac840] hover:bg-[#d4af37]
                     text-gray-900 rounded-lg font-bold transition-colors">
    Create first team
  </button>
</div>
```

### Error State

If data fetch fails:

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4">
  <span className="text-red-500 text-4xl">!</span>
  <p className="text-gray-500 dark:text-gray-400">
    Unable to load organization structure
  </p>
  <button
    onClick={refetch}
    className="text-[#a2dbed] hover:underline"
  >
    Try again
  </button>
</div>
```

### Selection Details Panel

When a team is selected, show a slide-out panel:

```tsx
<aside className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-800
                  shadow-xl border-l border-gray-200 dark:border-gray-700
                  transform transition-transform duration-200
                  ${selectedTeam ? 'translate-x-0' : 'translate-x-full'}">
  <div className="p-6 flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <h2 className="font-swarm text-xl font-bold">{team.name}</h2>
      <button onClick={clearSelection} aria-label="Close">
        <span className="text-gray-400 hover:text-gray-600">x</span>
      </button>
    </div>

    <div className="flex gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-500">{roleCount}</div>
        <div className="text-xs text-gray-500">Roles</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-500">{memberCount}</div>
        <div className="text-xs text-gray-500">Members</div>
      </div>
    </div>

    <div>
      <h3 className="text-sm font-bold mb-2">Leadership</h3>
      {leaderRole ? (
        <div className="text-sm">{leaderRole.title}</div>
      ) : (
        <div className="text-sm text-gray-400">No leader assigned</div>
      )}
    </div>

    {/* Additional team details */}
  </div>
</aside>
```

---

## Animation and Transitions

### Principle

All animations should feel **organic and purposeful**, never decorative. Think of how bees move: quick, direct, but with natural momentum.

### Timing Standards

| Animation | Duration | Easing |
|-----------|----------|--------|
| Hover effects | 150ms | ease-out |
| Selection changes | 200ms | ease-out |
| Panel slide | 200ms | ease-out |
| Zoom | 200ms | ease-out |
| Node position (layout) | 300ms | ease-in-out |
| Initial reveal | 400ms | ease-out |

### Initial Load Animation

Teams should fade in and settle into position:

```css
@keyframes nodeReveal {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.team-node {
  animation: nodeReveal 400ms ease-out both;
  animation-delay: calc(var(--node-index) * 50ms);
}
```

Cap total animation time by limiting stagger: `max delay = 500ms`.

### Hover Animation

```css
.team-circle {
  transition:
    fill 150ms ease-out,
    stroke 150ms ease-out,
    filter 150ms ease-out;
}

.team-circle:hover {
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}
```

### Selection Animation

```css
.team-circle--selected {
  stroke: #eac840;
  stroke-width: 3px;
  filter: drop-shadow(0 0 8px rgba(234,200,64,0.4));
  animation: selectPulse 600ms ease-out;
}

@keyframes selectPulse {
  0% { filter: drop-shadow(0 0 0 rgba(234,200,64,0)); }
  50% { filter: drop-shadow(0 0 16px rgba(234,200,64,0.6)); }
  100% { filter: drop-shadow(0 0 8px rgba(234,200,64,0.4)); }
}
```

### Real-time Update Animation

When data changes (via Convex subscription), animate smoothly:

```typescript
// Node size changes
<circle
  r={radius}
  style={{ transition: 'r 300ms ease-in-out' }}
/>

// Node position changes
<g
  transform={`translate(${node.x}, ${node.y})`}
  style={{ transition: 'transform 300ms ease-in-out' }}
/>
```

### Avoid

- Bouncy/elastic easing (feels playful, not professional)
- Delays longer than 500ms (feels sluggish)
- Animations that block interaction
- Movement that draws attention away from user intent

---

## Accessibility

### WCAG 2.1 AA Compliance Checklist

#### Color Contrast

- [ ] All text meets 4.5:1 contrast ratio
- [ ] Interactive elements have 3:1 contrast against background
- [ ] Color is not the only indicator (use shape, text, or pattern)

#### Keyboard Navigation

- [ ] All interactive elements are reachable via Tab
- [ ] Focus indicator is clearly visible
- [ ] Escape closes any open panels
- [ ] No keyboard traps

#### Screen Reader Support

```tsx
<svg
  role="img"
  aria-label={`Organization structure diagram showing ${teamCount} teams`}
>
  <title>Organization structure</title>
  <desc>
    Interactive diagram showing {teamCount} teams and their relationships.
    Use Tab to navigate between teams, Enter to select.
  </desc>

  {/* Team circle */}
  <g
    role="button"
    aria-label={`${team.name}, ${roleCount} roles`}
    tabIndex={0}
  >
    <circle ... />
    <text>{team.name}</text>
  </g>

  {/* Connection line */}
  <line
    role="presentation"
    aria-hidden="true"
  />
</svg>
```

#### Alternative View

Provide a non-visual alternative:

```tsx
<details className="sr-only focus-within:not-sr-only">
  <summary>View as text list</summary>
  <ul>
    {teams.map(team => (
      <li key={team._id}>
        {team.name} ({roleCount} roles)
        {parentTeam && ` - Reports to: ${parentTeam.name}`}
      </li>
    ))}
  </ul>
</details>
```

#### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .team-node,
  .team-circle,
  .connection-line {
    animation: none;
    transition-duration: 0.01ms !important;
  }
}
```

#### Focus Management

```typescript
// When selection changes, manage focus appropriately
useEffect(() => {
  if (selectedTeam) {
    detailsPanelRef.current?.focus();
  }
}, [selectedTeam]);
```

---

## Implementation Notes

### Component Structure

```
OrgNetworkDiagram/
  index.tsx           # Main component, orchestrates everything
  useLayoutEngine.ts  # Force-directed layout logic
  useViewport.ts      # Pan/zoom state management
  TeamNode.tsx        # Individual team circle component
  ConnectionLine.tsx  # Line between teams
  DetailsPanel.tsx    # Selected team details
  ZoomControls.tsx    # Optional zoom buttons
  types.ts            # TypeScript interfaces
```

### Data Flow

```
Convex Query (teams + roles)
        |
        v
  Transform to graph nodes/edges
        |
        v
  Layout engine (d3-force)
        |
        v
  Render SVG with positions
        |
        v
  User interactions -> state updates
```

### Performance Considerations

1. **Memoize expensive calculations**: Layout computations should only run when data changes
2. **Use `useMemo` for node positions**: Prevent recalculation on every render
3. **Virtualize if needed**: For very large orgs (50+ teams), consider only rendering visible nodes
4. **Debounce resize handlers**: Prevent layout thrashing during window resize
5. **Use CSS transforms**: `transform: translate()` is GPU-accelerated

### Key Dependencies

- **d3-force**: For force-directed layout (`npm install d3-force @types/d3-force`)
- No external charting libraries needed - pure SVG with React

### Convex Integration

```typescript
// Query structure
const teamsWithRoles = useQuery(api.teams.listWithRoleCounts, {
  orgaId: selectedOrga._id
});

// Expected shape
type TeamWithRoles = {
  team: Team;
  roleCount: number;
  leaderParentTeamId?: Id<"teams">; // From leader role's parentTeamId
};
```

---

## Summary

This organization network diagram should feel like a living map of the organization - responsive, clear, and immediately useful. The visual hierarchy (circle size = team importance by role count, connections = reporting structure) communicates organizational relationships without requiring a legend or explanation.

Key success metrics:
- New users understand the structure in under 5 seconds
- Navigation feels as fluid as Google Maps
- Real-time updates are visible but not disruptive
- Works seamlessly in both light and dark modes
- Fully accessible via keyboard and screen reader

---

*Last updated: 2026-02-01*
*Aligned with BRAND.md v1.0.0*
