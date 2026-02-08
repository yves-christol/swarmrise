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
| View Mode Swap | Complete | `FocusContainer/animations.css` | Visual/Manage toggle transitions |
| Node Reveal | Complete | Inline in visual views | Staggered element appearance on load |
| Logo Animation | Complete | `Logo/index.tsx` | Interactive SVG bee wing animation (SMIL) |
| Theme Transition | Complete | `index.css` | Background/text color transitions |
| Micro-interactions | Complete | Various components | Hover, focus, active states |
| Loading States | Complete | Various | Spinners and skeleton pulses |

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
| `dramatic` | 400ms | Focus navigation, major view changes | `--duration-dramatic: 400ms` |
| `reveal` | 600ms | Complex sequences, circle reveals | `--duration-reveal: 600ms` |

### Currently Used Durations

From the codebase analysis:

- **75ms**: Button and link hover states (`transition-colors duration-75`)
- **100ms**: Node drag transitions (`transition: transform 100ms ease-out`)
- **150ms**: Icon crossfades, stroke transitions
- **175ms**: View mode swap animations (`swap-out-up`, `swap-in-up`)
- **200ms**: Focus transition half-duration, theme transitions
- **300ms**: Content fade-in sequences
- **400ms**: Full focus navigation, node reveal animations
- **500-600ms**: Complex circle reveal sequences

---

## Easing Functions

### Standard Easing Curves

| Name | CSS | Use Case |
|------|-----|----------|
| `ease-out` | `ease-out` | Entering elements, reveals |
| `ease-in` | `ease-in` | Exiting elements (rare) |
| `ease-emphasized` | `cubic-bezier(0.4, 0, 0.2, 1)` | Focus navigation, major transitions |
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

**Duration**: 400ms total (200ms zoom-out + 200ms zoom-in)

**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

#### Zoom Animations

```css
/* Zooming into a deeper level (orga -> team, team -> role) */
@keyframes fadeScaleInFromSmall {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}

/* Zooming out to a higher level (role -> team, team -> orga) */
@keyframes fadeScaleInFromLarge {
  from { opacity: 0; transform: scale(1.3); }
  to { opacity: 1; transform: scale(1); }
}
```

**Transition Types Supported**:
- `orga-to-team` / `team-to-orga`
- `team-to-role` / `role-to-team`
- `role-to-member` / `member-to-role`
- Direct jumps: `orga-to-role`, `orga-to-member`

#### View Mode Swap (Visual/Manage Toggle)

```css
/* Swapping view modes with directional hint */
@keyframes swapOutUp {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-24px) scale(0.98); }
}

@keyframes swapInUp {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

**Duration**: 175ms

**Design Rationale**: The vertical translation (24px) combined with subtle scale (0.98) creates a sense of physical pages swapping, reinforcing the conceptual shift between views.

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
3. **No Animation Cancellation**: Rapid navigation can queue animations

---

## Quick Reference

### Adding a New Animation

1. Check if existing pattern applies
2. Choose appropriate timing token
3. Use `cubic-bezier(0.4, 0, 0.2, 1)` for emphasis
4. Add reduced motion fallback
5. Test at 60fps
6. Document in this file

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

*Document Version: 1.0*
*Last Updated: 2026-02-08*
*Maintainer: Luigi (Animation/SVG Agent)*
