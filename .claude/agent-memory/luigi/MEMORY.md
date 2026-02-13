# Luigi's Animation/SVG Memory - Swarmrise Project

## Project Animation Overview

Swarmrise has a mature animation system with consistent patterns. The primary documentation is at `/Users/yc/dev/swarmrise/docs/ANIMATION.md`.

## Key Patterns Discovered

### Timing Standards
- **75ms**: Micro-interactions (button hover)
- **150ms**: State transitions (stroke changes), non-spatial half-duration
- **200ms**: Theme transitions
- **300ms**: Focus navigation spatial zoom (full duration), connection line reveal
- **400ms**: Node reveal animations
- **500ms**: View mode 3D flip (visual/manage toggle)
- **600ms**: Complex circle reveal sequences

### Easing Curves
- **Primary (emphasized):** `cubic-bezier(0.4, 0, 0.2, 1)` -- most transitions
- **Snappy (spatial zoom):** `cubic-bezier(0.2, 0, 0, 1)` -- fast start, smooth decel
- **3D Flip:** `cubic-bezier(0.2, 0.8, 0.3, 1)` -- slow start, accel, gentle land

### Animation Locations
- Focus navigation + spatial zoom: `src/components/FocusContainer/animations.css`
- Focus container logic: `src/components/FocusContainer/index.tsx`
- Theme transitions: `src/index.css`
- Visual view reveals: Inline `<style>` tags in each view component
- Logo SMIL animation: `src/components/Logo/index.tsx`

### Visual View Animation Architecture
Each visual view component (OrgaVisualView, TeamVisualView, MemberVisualView) defines its own keyframes in an inline `<style>` block at the top of the render. Connection lines and nodes each have their own entrance animations with staggered delays.

**Critical lesson (Feb 2025):** When extracting SVG elements from parent `<g>` groups into separate layers (e.g., for z-ordering fixes), any animation that was inherited from the parent `<g>` must be explicitly re-applied to the extracted element. Connection lines inside node `<g>` groups inherit the group's `nodeReveal` animation; once moved to a separate render layer, they need their own `connectionReveal` animation.

### Connection Line Animation Pattern
Duration: 300ms, ease-out, fill both. Delay: coordinated with parent node delay.
Must add `className="connection-line"` for reduced-motion targeting.

### Reduced Motion Pattern
All views must include reduced-motion media queries covering:
- `g[role="button"]` for interactive node groups
- `.connection-line` for connection line elements
- View-specific classes (e.g., `.member-outer-ring`, `.member-circle`)

## Spatial Zoom (Tier 3 FLIP-inspired) - Implemented

### Architecture
The orga-to-team and team-to-orga transitions use a FLIP-inspired approach:
1. Both old and new views render simultaneously (`.zoom-layer-old`, `.zoom-layer-new`)
2. A proxy circle element bridges the visual gap
3. Transform origin targets the clicked node's screen position

### Key Implementation Details
- Proxy circle uses FLIP: positioned at end state, transformed to start state, then animated to identity
- `getBoundingClientRect()` forces reflow before removing transform (critical for FLIP timing)
- OrgaVisualView exposes `onRegisterNodePositionLookup` prop for zoom-out node targeting
- `viewportRef` and `nodesRef` pattern used so lookup closure always reads current values
- Viewport diagonal used for `fullRadius` to ensure proxy covers entire container

## Technical Notes

### SVG Diagram Theming
CSS variables: `--diagram-node-fill`, `--diagram-node-stroke`, `--diagram-node-text`, `--diagram-golden-bee`
Defined in `:root.light` and `:root.dark` in `index.css`.

### 3D Flip Pattern (View Mode Toggle)
CSS-driven 3D coin flip. Duration: 500ms with flip easing.
Both faces rendered simultaneously with `backface-visibility: hidden`.

### Stagger Delay Pattern
```javascript
animationDelay: `${Math.min(index * 50, 500)}ms`
```

## Known Layout Issue: Drawing Area Sizing
**Root cause:** `AuthenticatedView` hardcodes header height with `h-[calc(100vh-4rem)]`.
**Fix direction:** Replace with flex layout.

## Color Decisions
Defer to @monica for all color choices. My domain is motion and structure.

## Related Documentation
- `docs/UX_FOCUS_NAVIGATION.md` - Detailed focus transition specs
- `docs/BRAND.md` - Brand principles that inform motion personality
- `docs/ANIMATION.md` - Full animation system documentation
