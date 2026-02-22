# Animation System Documentation

This document is the single source of truth for all animation patterns, timing functions, and motion design in the Swarmrise project. It should be consulted before implementing any new animation and updated when patterns evolve.

---

## Current Animation Inventory

### Status: Mature (Production-Ready)

The Swarmrise codebase has a well-developed animation system with consistent patterns across the application. The following sections document what exists and establish standards for future development.

### Animation Categories

| Category | Status | Location | Purpose |
|----------|--------|----------|---------|
| Focus Navigation | Complete | `FocusContainer/animations.css` | View transitions between orga/team/role/member |
| PrismFlip (3D Rotation) | Complete | `PrismFlip/index.tsx`, `PrismFlip/PrismFlip.css` | 3D coin/prism flip between view modes |
| Node Reveal | Complete | Inline in visual views | Staggered element appearance on load |
| Logo Animation | Complete | `Logo/index.tsx` | Interactive SVG bee wing animation (SMIL) |
| Theme Transition | Complete | `index.css` | Background/text color transitions |
| Micro-interactions | Complete | Various components | Hover, focus, active states |
| Loading States | Complete | Various | Spinners and skeleton pulses |
| Lottery Tool | Specified | `Chat/LotteryTool/` | Random member selection roulette in chat |

---

## Design Principles

### Motion Serves Purpose

Every animation in Swarmrise must answer one of these questions:

1. **Orientation**: "Where am I?" - Focus transitions show spatial relationships
2. **Feedback**: "Did my action work?" - State changes confirm user intent
3. **Continuity**: "How did I get here?" - Transitions maintain mental models
4. **Attention**: "What should I notice?" - Subtle motion guides focus

If an animation cannot justify its existence through one of these purposes, it should not exist.

### The Swarmrise Motion Personality

Animations should feel:

- **Organic**: Like the movement of a hive - coordinated, natural, purposeful
- **Responsive**: Immediate acknowledgment of user intent
- **Calm**: Never jarring, never distracting from content
- **Efficient**: The fastest animation that still communicates meaning

### Hierarchy of Motion

1. **Critical Path**: Navigation, loading, error states (highest priority for smoothness)
2. **Interaction Feedback**: Hover, focus, active states (must feel instant)
3. **Decorative Enhancement**: Staggered reveals, subtle flourishes (can be disabled)

---

## Timing Tokens

Use these standard durations consistently across the codebase:

| Token | Duration | Use Case | CSS Variable |
|-------|----------|----------|--------------|
| `instant` | 75ms | Micro-interactions, color changes | `--duration-instant: 75ms` |
| `fast` | 150ms | Hover states, small transitions | `--duration-fast: 150ms` |
| `normal` | 200ms | Theme changes, standard transitions | `--duration-normal: 200ms` |
| `emphasis` | 300ms | Content reveals, attention-drawing | `--duration-emphasis: 300ms` |
| `dramatic` | 300ms | Focus navigation, major view changes | `--duration-dramatic: 300ms` |
| `reveal` | 600ms | Complex sequences, circle reveals | `--duration-reveal: 600ms` |

### Currently Used Durations

From the codebase analysis:

- **75ms**: Button and link hover states (`transition-colors duration-75`)
- **100ms**: Node drag transitions (`transition: transform 100ms ease-out`)
- **150ms**: Icon crossfades, stroke transitions
- **150ms**: Focus transition half-duration (non-spatial), theme transitions
- **300ms**: Content fade-in sequences
- **300ms**: Full focus navigation (spatial zoom), node reveal animations at 400ms
- **500ms**: View mode 3D flip transition (visual/manage toggle)
- **500-600ms**: Complex circle reveal sequences

---

## Easing Functions

### Standard Easing Curves

| Name | CSS | Use Case |
|------|-----|----------|
| `ease-out` | `ease-out` | Entering elements, reveals |
| `ease-in` | `ease-in` | Exiting elements (rare) |
| `ease-emphasized` | `cubic-bezier(0.4, 0, 0.2, 1)` | Focus navigation, major transitions |
| `ease-snappy` | `cubic-bezier(0.2, 0, 0, 1)` | Spatial zoom, snappy transitions |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounces (use sparingly) |

### Current Usage

The primary easing in the codebase is:

```css
cubic-bezier(0.4, 0, 0.2, 1)
```

This is the "emphasized ease-out" - starts slowly, accelerates through the middle, then decelerates at the end. It feels natural and responsive.

---

## Component Animation Patterns

### Focus Navigation (`FocusContainer`)

The core navigation animation system for transitioning between entity views.

**Location**: `src/components/FocusContainer/`

**Duration**: 300ms (snappy, macOS Mission Control feel)

**Easing**: `cubic-bezier(0.2, 0, 0, 1)` -- fast start, smooth deceleration

#### Spatial Zoom (orga <-> team)

The orga-to-team and team-to-orga transitions use a **FLIP-inspired spatial zoom** that creates visual continuity between the two views. This is the most important transition in the app because it communicates the spatial hierarchy: teams live inside the organization.

**How it works:**

1. **Both views render simultaneously** during the transition (old view exits, new view enters).
2. **A proxy circle** bridges the visual gap -- it starts at the clicked team node's position and expands to fill the viewport (zoom-in), or starts viewport-sized and contracts to the team node position (zoom-out).
3. **Transform origin** is set to the clicked node's screen position so the old view scales away from the right point.

```css
/* Zoom-in: old orga view scales up toward click point */
@keyframes zoomInExit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(2.5); }
}

/* Zoom-in: new team view enters from small */
@keyframes zoomInEnter {
  from { opacity: 0; transform: scale(0.3); }
  to { opacity: 1; transform: scale(1); }
}

/* Zoom-out: team view shrinks */
@keyframes zoomOutExit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.3); }
}

/* Zoom-out: orga view enters from large */
@keyframes zoomOutEnter {
  from { opacity: 0; transform: scale(2.5); }
  to { opacity: 1; transform: scale(1); }
}
```

**Proxy Circle (FLIP technique):**
- Positioned at its end state in CSS, then transformed to its start state via `transform: translate(...) scale(...)`
- On the next frame, the transform is removed, triggering a CSS transition to animate smoothly
- For zoom-in: starts at node position/size, ends at viewport-covering circle
- For zoom-out: starts at viewport-covering circle, ends at node position/size
- Uses `var(--diagram-node-fill)` and `var(--diagram-node-stroke)` for theme-aware styling

**OrgaVisualView integration:**
- Exposes a `onRegisterNodePositionLookup` prop that provides a function to query team node screen positions
- Used by FocusContainer during zoom-out to target the correct node position
- The orga view also centers on `returnFromTeamId` after zoom-out completes

#### Non-Spatial Zoom (all other transitions)

Other transitions (team-to-role, role-to-member, etc.) use a two-phase scale animation:

**Duration**: 300ms total (150ms exit + 150ms enter)

```css
/* Entering from deeper level */
@keyframes fadeScaleInFromSmall {
  from { opacity: 0; transform: scale(0.3); }
  to { opacity: 1; transform: scale(1); }
}

/* Entering from shallower level */
@keyframes fadeScaleInFromLarge {
  from { opacity: 0; transform: scale(2); }
  to { opacity: 1; transform: scale(1); }
}
```

**Transition Types Supported**:
- **Spatial**: `orga-to-team` / `team-to-orga` (proxy circle + dual layers)
- **Non-spatial**: `team-to-role` / `role-to-team`, `role-to-member` / `member-to-role`
- **Direct jumps**: `orga-to-role`, `orga-to-member` (non-spatial)

#### PrismFlip (3D View Rotation)

The `PrismFlip` component handles 3D rotation between multiple face views (e.g., visual/manage mode toggle). It supports two geometries: **coin** (2 faces, Y-axis half-turn) and **prism** (3 faces, Y-axis third-turns).

**Location**: `src/components/PrismFlip/index.tsx`, `src/components/PrismFlip/PrismFlip.css`

**Duration**: 500ms (default, configurable via `duration` prop)

**Easing**: `cubic-bezier(0.2, 0.8, 0.3, 1)` -- starts slow, accelerates through middle, gentle landing

##### Architecture: No-Reparenting, Hybrid Declarative/Imperative

PrismFlip was completely rewritten (Feb 2026) to fix persistent bugs with the previous portal-and-reparenting approach. The current architecture has three strict design rules:

1. **Face content is rendered as permanent React children** -- they never move in the DOM. This means CSS animations and SVG drawing animations on face content are never restarted by the browser.

2. **Face styles are fully declarative** -- `visibility`, `transform`, `backfaceVisibility`, and `pointerEvents` are computed from a `flipState` state machine and applied via JSX inline styles. This avoids conflicts between React reconciliation and imperative DOM manipulation.

3. **Card rotation is imperative** -- a `useLayoutEffect` uses the reflow trick (`getBoundingClientRect()` between setting the FROM and TO transforms) to snap the card to the start position and transition to the end position in a single browser commit.

##### State Machine

```
idle  ──(activeFaceKey changes)──>  animating { from }
                                        │
                                  (duration ms timeout)
                                        │
                                        v
                                      idle
```

- **`idle`**: Zero 3D context. No `perspective`, no `preserve-3d`, no face transforms. Faces are flat, fully interactive DOM elements.
- **`animating`**: `perspective: 1200px` on root, `transform-style: preserve-3d` on card, per-face `backfaceVisibility: hidden` + position transforms. Only the FROM and TO faces are visible; all others are `visibility: hidden`.

##### CSS Classes

```css
.prism-flip-root  /* Root container, absolute inset:0 */
.prism-flip-card  /* Card wrapper, absolute inset:0 */
.prism-flip-face  /* Individual face, absolute inset:0 */
```

All 3D properties (`perspective`, `transform-style`, `backface-visibility`, face transforms) are applied via **inline styles** controlled by React state -- the CSS file only handles positioning and the reduced-motion safety net.

##### Key Implementation Details

- **Stable effect deps**: The animation `useLayoutEffect` intentionally excludes the `faces` prop array and `onFlipComplete` callback from its dependency list. The `faces` array creates a new reference on every parent render, and `onFlipComplete` is accessed via a ref (`onFlipCompleteRef`). This prevents parent re-renders (e.g., from Convex real-time data) from restarting the animation mid-flip.
- **Apothem calculation**: For prism geometry, the apothem (distance from center to face midpoint) is computed from container width via ResizeObserver and used in `translateZ` transforms.
- **Reduced motion**: Detected via `matchMedia` in a ref. When active, face swaps are instant (no 3D animation), and the CSS file includes a `!important` safety net.
- **Cleanup**: Animation timers are cleared on unmount and on interruption (new flip triggered during existing flip).

##### Design Rationale

The coin/prism flip metaphor creates a satisfying tactile feel, reinforcing that the user is "flipping" between two sides of the same entity. The 500ms duration allows the user to perceive the 3D motion without feeling slow.

### Node Reveal Animations

Used for staggered appearance of diagram elements.

**Location**: Inline `<style>` in visual view components

```css
@keyframes nodeReveal {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
```

**Duration**: 400ms with staggered delays

**Delay Pattern**: `${Math.min(index * 50, 500)}ms` - caps at 500ms to prevent excessive wait times

### Role Visual View Animations

Complex reveal sequence for role details.

**Location**: `src/components/RoleVisualView/index.tsx`

```css
/* Concentric circle reveals */
@keyframes circleReveal {
  from { opacity: 0; transform: scale(0.85); stroke-dashoffset: 200; }
  to { opacity: 1; transform: scale(1); stroke-dashoffset: 0; }
}

/* Content fade-in sequence */
@keyframes contentFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Sequence Timing**:
1. Outer circle: 600ms ease-out
2. Inner circle: 500ms ease-out, 100ms delay
3. Content elements: 300ms each, 200-400ms delays

### Member Visual View Animations

Similar to role view but with additional contact info animation.

**Location**: `src/components/MemberVisualView/index.tsx`

```css
@keyframes outerRingReveal { /* 600ms */ }
@keyframes innerRingReveal { /* 500ms, 100ms delay */ }
@keyframes memberCircleReveal { /* 400ms, 150ms delay */ }
@keyframes memberContentFadeIn { /* 300ms, 250ms delay */ }
@keyframes contactFadeIn { /* 300ms, 400ms delay */ }
```

### Logo Animation (SMIL)

Interactive bee wing animation on hover.

**Location**: `src/components/Logo/index.tsx`

```jsx
<animateTransform
  attributeName="transform"
  type="rotate"
  from="0 600 670"
  to="-25 600 670"
  dur="0.1s"
  begin={isHovered ? "0s" : "never"}
  repeatCount={isHovered ? "indefinite" : "0"}
/>
```

**Note**: While SMIL is technically deprecated, it has broad browser support and works well for this isolated use case. For new animations, prefer CSS or JavaScript approaches.

### Principles Page Stagger

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.principle-card {
  animation: fadeInUp 0.4s ease-out both;
}
```

**Delay Pattern**: `${0.1 + index * 0.05}s`

### Theme Transitions

```css
body {
  transition: background-color 200ms ease-out, color 200ms ease-out;
}
```

### Lottery Tool (Chat Embedded)

Random member selection animation for task assignment. Embedded in chat messages alongside VotingTool, ElectionTool, and TopicTool.

**Location**: `src/components/Chat/LotteryTool/`

**Design Rationale**: The lottery exists to save time -- picking someone randomly instead of debating who should do a task. The animation must feel fun enough to be satisfying, but short enough that it does not undermine the time-saving purpose. The visual metaphor is a "name roulette" -- member avatars shuffle rapidly in a fixed slot, decelerate, and land on the chosen member. This is more personal than a spinning wheel (you see faces, not abstract segments) and more compact than a full wheel (fits in a chat message).

#### Animation Phases

The animation has four distinct phases, progressing linearly:

| Phase | Name | Duration | Purpose |
|-------|------|----------|---------|
| 1 | **Idle** | Indefinite | Static state before/after animation; shows the task description and a "Draw" button (pre-draw) or the result (post-draw) |
| 2 | **Shuffle** | 1200ms | Rapid cycling through member names/avatars to build anticipation |
| 3 | **Deceleration** | 800ms | Cycling slows down, landing on the selected member |
| 4 | **Reveal** | 600ms | Selected member is highlighted with a celebratory pulse |

**Total active animation**: ~2600ms (under 3 seconds). Short enough to not annoy, long enough to build a moment of shared fun.

#### Phase 1: Idle (Pre-Draw)

The tool renders in its chat message card with the task description, the pool of eligible members (shown as a compact avatar row), and a "Draw" button styled with the org highlight color.

```
+------------------------------------------+
|  [dice icon]  Lottery: [task title]       |
|                                           |
|  [av][av][av][av][av]  5 members          |
|                                           |
|  [ Draw ]                                 |
+------------------------------------------+
```

No animation. Static layout. The avatar row uses the same avatar pattern as `MessageItem` (32px circles with image or initials).

#### Phase 2: Shuffle (1200ms)

When the user clicks "Draw" (or when the component mounts with a result that hasn't been animated yet), the shuffle begins.

**Visual**: A single "slot" area (48px tall, full width of the tool body) shows member names vertically sliding through it, like a slot machine reel. Only one name is visible at a time. Names slide upward and out, replaced by the next name sliding in from below.

**Timing**:
- First 400ms: Each name visible for ~80ms (very fast, ~5 names/second)
- Next 400ms: Each name visible for ~120ms (fast, starting to perceive names)
- Final 400ms: Each name visible for ~160ms (noticeably slowing)

**Easing**: Each individual name swap uses `ease-out` for the slide. The overall deceleration curve across the phase is achieved by increasing the interval between swaps, not by changing the per-swap easing.

**Keyframe for each name swap**:

```css
@keyframes lotterySlotUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
```

**Implementation note**: The shuffle is driven by a `requestAnimationFrame` loop or `setInterval` with decreasing frequency. The component picks random members from the pool for display during this phase. The actual selected member is predetermined (received from the backend) but not revealed until Phase 3 ends.

#### Phase 3: Deceleration (800ms)

The shuffle continues to slow down, with the final few "slots" taking progressively longer:

| Slot | Visible duration | Notes |
|------|-----------------|-------|
| n-4 | 160ms | Continuing from shuffle |
| n-3 | 200ms | Noticeably slower |
| n-2 | 280ms | Almost readable |
| n-1 | 360ms | User can read the name |
| **n (winner)** | Holds | Final position -- stays |

The last slot lands on the selected member and holds. The deceleration follows the `ease-emphasized` curve (`cubic-bezier(0.4, 0, 0.2, 1)`) applied to the interval timing.

**Keyframe for the final landing**:

```css
@keyframes lotterySlotLand {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**Duration**: 300ms with `cubic-bezier(0.34, 1.56, 0.64, 1)` (the `ease-spring` curve from our easing tokens) -- a slight overshoot gives a satisfying "click into place" feeling.

#### Phase 4: Reveal (600ms)

Once the selected member's name is in position, a celebration effect plays:

**Visual sequence** (all simultaneous, staggered starts):

1. **Ring pulse** (0ms delay): A circular ring expands outward from behind the member's avatar, using `var(--org-highlight-color)` at 40% opacity, scaling from 1x to 2x and fading to 0. This is a single SVG `<circle>` animated via CSS.

2. **Name glow** (100ms delay): The selected member's name gets a brief text-shadow glow using `var(--org-highlight-color)`, fading in and then settling to a subtle permanent glow.

3. **Badge appear** (200ms delay): A small "Selected" badge fades in and slides up next to the member name.

```css
@keyframes lotteryPulseRing {
  from {
    transform: scale(1);
    opacity: 0.4;
  }
  to {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes lotteryGlow {
  0% {
    text-shadow: 0 0 0 transparent;
  }
  50% {
    text-shadow: 0 0 12px var(--org-highlight-color, #eac840);
  }
  100% {
    text-shadow: 0 0 6px color-mix(in srgb, var(--org-highlight-color, #eac840) 30%, transparent);
  }
}

@keyframes lotteryBadgeIn {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

**Durations**:
- Ring pulse: 600ms, `ease-out`, no repeat
- Name glow: 500ms, `ease-out`, fills forward
- Badge appear: 300ms, `ease-out`, 200ms delay

#### Phase 5: Idle (Post-Draw)

After animation completes, the tool settles into a static result state:

```
+------------------------------------------+
|  [dice icon]  Lottery: [task title]       |
|                                           |
|  [avatar]  Jane Doe         [Selected]    |
|                                           |
|  Drawn from 5 members                     |
+------------------------------------------+
```

The selected member's avatar is displayed at 40px with their full name. The subtle glow from Phase 4 persists as a faint highlight. The "Draw" button is gone, replaced by the result.

#### Reduced Motion Behavior

When `prefers-reduced-motion: reduce` is active:

- **Skip Phases 2 and 3 entirely**. No shuffling, no deceleration.
- **Phase 4 simplified**: The ring pulse is removed. The name glow is replaced by a simple background color highlight (no animation). The badge appears instantly (no slide).
- The transition from "Draw" button to result uses a simple 150ms opacity crossfade.

```css
@media (prefers-reduced-motion: reduce) {
  .lottery-slot {
    animation: none !important;
  }
  .lottery-pulse-ring {
    display: none !important;
  }
  .lottery-result {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

#### SVG Structure

The ring pulse uses a lightweight inline SVG:

```jsx
<svg
  className="lottery-pulse-ring"
  width="48"
  height="48"
  viewBox="0 0 48 48"
  aria-hidden="true"
>
  <circle
    cx="24"
    cy="24"
    r="20"
    fill="none"
    stroke="var(--org-highlight-color, #eac840)"
    strokeWidth="2"
    style={{
      animation: "lotteryPulseRing 600ms ease-out both",
    }}
  />
</svg>
```

The dice icon in the header is a static inline SVG, matching the style of existing tool icons (VotingTool checkbox icon, TopicTool discussion icon):

```jsx
<svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="3" />
  <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
</svg>
```

#### Performance Notes

- All animations use `transform` and `opacity` only (GPU-accelerated)
- The `text-shadow` in the glow effect is the one exception -- it triggers paint but is brief (500ms) and single-element, so the impact is negligible
- The shuffle uses a JS timer to swap displayed names; the slide animation itself is pure CSS on each name element
- `will-change: transform, opacity` is applied to the slot container during Phases 2-3, removed after Phase 4
- The animation state machine prevents re-triggering: once the draw has played, clicking "Draw" again is not possible (the button is replaced by the result)

#### Accessibility

- The "Draw" button has `aria-label` describing the action: "Randomly select a member for [task name]"
- During the shuffle animation, `aria-live="polite"` on a visually hidden element announces: "Drawing..."
- After the reveal, the same `aria-live` region announces: "[Member name] has been selected for [task name]"
- The shuffling slot area has `aria-hidden="true"` during animation (the visual is decorative; the screen reader announcement provides the information)
- The result state is fully accessible with proper heading hierarchy and role descriptions

#### State Machine

```
idle_pre_draw  ──(click Draw)──>  shuffling
    shuffling  ──(1200ms)──────>  decelerating
 decelerating  ──(800ms)───────>  revealing
    revealing  ──(600ms)───────>  idle_post_draw
```

The component also handles a **mount-with-result** path: when a user scrolls up to a lottery message that has already been drawn, it skips directly to `idle_post_draw` with no animation. The animation only plays for users who are present in the channel when the draw happens (they receive the Convex real-time update transitioning the tool from `pending` to `drawn`).

#### Lottery Tool-Specific Tests

- [ ] Shuffle animation runs at 60fps with 20+ member names cycling
- [ ] Deceleration feels natural (no jarring speed changes)
- [ ] The correct member is always shown at the end (matches backend selection)
- [ ] Reduced motion skips directly to result with opacity crossfade
- [ ] Animation does not replay when scrolling away and back
- [ ] Result state renders correctly without animation for historical messages
- [ ] Tool fits within `sm:w-[400px]` chat panel without overflow
- [ ] Member names that are long (30+ characters) are truncated gracefully during shuffle
- [ ] Works with both avatar images and initial-based avatars
- [ ] Screen reader announces the result after animation completes
- [ ] Highlight color adapts to org customisation (`var(--org-highlight-color)`)

---

## 3D Animation Pitfalls (PrismFlip Lessons)

This section documents hard-won lessons from the PrismFlip rewrite (Feb 2026). These rules apply to any 3D CSS animation in the codebase. Violating any of these will reintroduce the bugs that took multiple iterations to fix.

### Rule 1: Never Reparent DOM Nodes That Contain Animations

**Bug**: Calling `appendChild` or `insertBefore` to move a DOM node from one parent to another causes the browser to restart all CSS animations, CSS transitions, and SVG SMIL/drawing animations on that node and its descendants.

**Context**: The original PrismFlip used `createPortal` + `document.createElement` to create persistent face host divs, then physically reparented them between a flat overlay (idle) and 3D prism slots (animating) via `appendChild`. Each flip triggered two reparenting operations (flat-to-prism at start, prism-to-flat at end), replaying SVG stroke-dashoffset animations and CSS keyframe animations twice per flip.

**Fix**: Render face content as permanent React children that never move in the DOM. Control visibility and transforms declaratively via React state instead of physically relocating nodes.

### Rule 2: `overflow: hidden` Destroys `preserve-3d`

**Bug**: Per the CSS Transforms spec, any `overflow` value other than `visible` on an element forces `transform-style: preserve-3d` to compute as `flat`. This causes all 3D-positioned children to collapse onto the same plane and render on top of each other.

**Context**: The original implementation had `overflow: hidden` on intermediate containers to clip content during animation. This silently killed the 3D prism effect, making all faces overlap instead of rotating.

**Fix**: Never set `overflow: hidden` (or `auto`, `scroll`, `clip`) on any element in the ancestor chain between the `perspective` container and the `preserve-3d` card. If you need clipping, apply it to elements *inside* the individual faces, not on their containers.

### Rule 3: Keep 3D Context to Absolute Minimum Duration

**Bug**: Persistent `preserve-3d` contexts interact badly with browser rendering. `visibility: hidden` does not reliably hide children inside a `preserve-3d` container (browser quirk where "hidden" faces bleed through). Persistent 3D contexts also consume GPU compositing resources unnecessarily.

**Context**: The original approach kept `preserve-3d` active at all times. Hidden faces would occasionally flash or overlap with the active face, especially during React re-renders.

**Fix**: Apply `perspective`, `transform-style: preserve-3d`, `backface-visibility: hidden`, and face position transforms *only* during the animation (approximately 500ms). In idle state, strip all 3D properties -- faces are just flat, absolutely-positioned divs with `visibility` controlling which one is shown.

### Rule 4: Face Styles Must Be Declarative, Card Rotation Must Be Imperative

**Bug (if face styles were imperative)**: When React re-renders during an animation (e.g., Convex pushes a data update), React's reconciler overwrites imperative DOM style changes with its own computed values. This causes face visibility/transforms to flash or reset mid-animation.

**Bug (if card rotation were declarative)**: To animate a CSS transition, the browser needs to see two different style states in two different frames. A single React state update + render produces only one style state. There is no way to declaratively say "start at rotation X, transition to rotation Y" in a single render pass.

**Fix**: Use the hybrid approach:
- Face `visibility`, `transform`, `backfaceVisibility`, `pointerEvents` are computed from `flipState` in JSX (declarative). React owns these values and they survive re-renders correctly.
- Card `transform` and `transition` are set imperatively in a `useLayoutEffect` using the reflow trick: set FROM transform with `transition: none`, call `getBoundingClientRect()` to force a reflow, then set TO transform with `transition` enabled. This produces two style states in one commit.

### Rule 5: Never Include Unstable References in Animation Effect Dependencies

**Bug**: Including `faces` (a prop that is a new array reference on every parent render) in a `useLayoutEffect` dependency array causes the effect to re-run every time the parent re-renders. If the parent re-renders mid-animation (common with real-time Convex data), the animation restarts from scratch, producing visual glitches.

**Fix**:
- Access the `faces` data via a ref (`faceIndexMap.current`) instead of including it in deps.
- Access callbacks (`onFlipComplete`) via a ref (`onFlipCompleteRef.current`) instead of including them in deps.
- The animation effect's dependency array should contain only truly stable values: `flipState`, `activeFaceKey`, `angles` (constant), `geometry` (string), `apothem` (changes only on resize), `duration` (number).

### Rule 6: `visibility: hidden` Is Unreliable Inside `preserve-3d`

**Bug**: In some browsers/configurations, elements with `visibility: hidden` inside a `preserve-3d` context are still partially rendered or cause visual artifacts.

**Fix**: Do not rely on `visibility: hidden` alone to hide faces during 3D animation. Use it in combination with:
- Only rendering `backfaceVisibility: hidden` + face transforms on participating faces (FROM and TO).
- Keeping non-participating faces as plain flat divs without any 3D positioning.
- Stripping the entire 3D context (perspective, preserve-3d) as soon as the animation completes.

### Summary Table

| Pitfall | Symptom | Rule |
|---------|---------|------|
| DOM reparenting | CSS/SVG animations replay on every flip | Never reparent animated nodes |
| `overflow: hidden` + `preserve-3d` | All faces render on same plane, overlapping | No `overflow` except `visible` in 3D ancestor chain |
| Persistent 3D context | Hidden faces bleed through, GPU waste | 3D properties only during animation |
| Imperative face styles | Styles reset on React re-render mid-animation | Face styles declarative in JSX |
| Declarative card rotation | Cannot express "start at X, transition to Y" | Card rotation imperative with reflow trick |
| Unstable effect deps | Animation restarts on unrelated parent re-render | Use refs for arrays and callbacks |
| `visibility: hidden` in `preserve-3d` | Hidden faces still visible | Combine visibility with structural 3D removal |

---

## SVG Guidelines

### Current SVG Usage

1. **Logo** (`Logo/index.tsx`): Complex multi-path bee illustration
2. **View Toggle Icons** (`ViewToggle/index.tsx`): Simple inline SVGs
3. **Diagram Elements**: Circles, lines, text in visual views
4. **Loading Spinners**: Standard rotating circles

### Optimization Requirements

All SVGs should:

1. **Use proper viewBox**: Always define `viewBox` for scalability
2. **Avoid unnecessary transforms**: Keep paths in natural coordinates
3. **Minimize path complexity**: Simplify curves where visually acceptable
4. **Use theme variables**: `var(--diagram-node-stroke)` etc.
5. **Include accessibility**: `aria-hidden="true"` for decorative, titles for meaningful

### Example: Well-Structured SVG

```jsx
<svg
  width="18"
  height="18"
  viewBox="0 0 18 18"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.5"
  aria-hidden="true"  // Decorative icon
>
  <circle cx="9" cy="9" r="7" />
  <circle cx="9" cy="5" r="2" />
</svg>
```

### Diagram Node Pattern

```jsx
<g
  role="button"
  aria-label={t("diagram.nodeAriaLabel", { name })}
  tabIndex={0}
  style={{
    cursor: "pointer",
    animation: `nodeReveal 400ms ease-out both`,
    animationDelay: `${index * 50}ms`,
  }}
>
  <circle
    cx={x}
    cy={y}
    r={radius}
    fill="var(--diagram-node-fill)"
    stroke="var(--diagram-node-stroke)"
    strokeWidth={2}
    style={{
      transition: "fill 150ms ease-out, stroke 150ms ease-out",
    }}
  />
</g>
```

---

## Accessibility

### Reduced Motion Support

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .focus-view {
    animation: none !important;
    transition: opacity 150ms ease-out !important;
    transform: none !important;
  }

  .swap-out-up, .swap-in-up, .swap-out-down, .swap-in-down {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

**Pattern**: For reduced motion, replace complex animations with simple opacity fades (150ms).

### Implementation Checklist

- [ ] Animation can be disabled via `prefers-reduced-motion`
- [ ] No essential information conveyed only through motion
- [ ] Focus management works without animation
- [ ] Screen reader announcements for view changes

### Screen Reader Announcements

```jsx
<div role="status" aria-live="polite" className="sr-only">
  {displayedMode === "visual"
    ? "Now viewing visual diagram. Press V to switch to management view."
    : "Now viewing management options. Press V to switch to visual diagram."
  }
</div>
```

---

## Performance Guidelines

### GPU-Accelerated Properties Only

Use only these properties for animations:

- `transform` (translate, scale, rotate)
- `opacity`

Never animate:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `font-size`

### will-change Usage

Apply `will-change` hints sparingly and remove after animation:

```jsx
// During animation
style={{ willChange: "transform, opacity" }}

// After animation completes
style={{ willChange: "auto" }}
```

### Layout Stability

- Define fixed dimensions for containers before animation
- Use `position: absolute` with `inset: 0` for overlay animations
- Never trigger layout during animation (no reading offsetWidth/offsetHeight)
- **Exception**: A single deliberate `getBoundingClientRect()` call *before* the transition starts is acceptable as the "reflow trick" to force the browser to register a start position (see PrismFlip Rule 4). This is not a mid-animation layout thrash -- it happens in `useLayoutEffect` before the browser paints.

### Performance Budgets

| Device Tier | Max Animation Complexity | Frame Target |
|-------------|-------------------------|--------------|
| High-end desktop | 10+ simultaneous animations | 60fps |
| Mobile/tablet | 5 simultaneous animations | 60fps |
| Reduced motion | Opacity only | 60fps |

---

## Testing Requirements

### Manual Testing Checklist

- [ ] Works at 60fps on target devices
- [ ] Graceful degradation for reduced-motion preference
- [ ] Tested at 1x, 2x, and 3x device pixel ratios
- [ ] No visual glitches at animation boundaries
- [ ] Keyboard navigation maintains focus correctly

### Animation-Specific Tests

- [ ] Focus transitions complete without interruption
- [ ] Rapid interaction doesn't break animation state
- [ ] Window resize during animation handled gracefully
- [ ] Theme switch during animation handled gracefully

### PrismFlip-Specific Tests

- [ ] SVG drawing animations on face content do NOT replay on flip
- [ ] CSS keyframe animations on face content do NOT replay on flip
- [ ] Click handlers on the active face remain functional after flip completes
- [ ] Rapid flipping (triggering new flip before previous completes) does not produce visual artifacts
- [ ] Convex real-time data update during mid-flip does not restart the rotation
- [ ] Faces do not overlap or bleed through in idle state
- [ ] Prism geometry recalculates correctly on container resize
- [ ] Reduced motion preference causes instant swap with no 3D animation

---

## Future Considerations

### Potential Enhancements

1. **CSS Custom Properties for Timing**: Centralize all durations as CSS variables
2. **Animation Orchestration Library**: Consider Framer Motion for complex sequences
3. **Performance Monitoring**: Add animation frame tracking in development
4. **Gesture Animations**: Swipe gestures for mobile navigation

### Known Limitations

1. **SMIL in Logo**: Works but is deprecated; consider CSS animation replacement
2. **Inline Styles**: Many animations use inline keyframes; could be centralized
3. **Focus Navigation Queuing**: Rapid focus navigation can queue animations (PrismFlip handles interruption correctly via timer cleanup, but FocusContainer transitions do not yet cancel on re-trigger)

---

## Quick Reference

### Adding a New Animation

1. Check if existing pattern applies
2. Choose appropriate timing token
3. Use `cubic-bezier(0.4, 0, 0.2, 1)` for emphasis
4. Add reduced motion fallback
5. If 3D: read the "3D Animation Pitfalls" section above -- all six rules apply
6. If 3D: verify no `overflow: hidden` in the ancestor chain
7. Test at 60fps
8. Document in this file

### Common Patterns

```css
/* Fade in content */
animation: fadeIn 300ms ease-out both;

/* Reveal with scale */
animation: nodeReveal 400ms ease-out both;

/* Staggered children */
animation-delay: ${index * 50}ms;

/* Hover state */
transition: color 75ms ease-out, opacity 150ms ease-out;
```

---

*Document Version: 3.0*
*Last Updated: 2026-02-22*
*Maintainer: Luigi (Animation/SVG Agent)*
