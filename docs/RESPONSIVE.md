# Responsive Design & Mobile Strategy

This document describes the responsive design approach, breakpoint strategy, mobile-specific patterns, and known considerations for the Swarmrise application. It is maintained by Zoe (mobile responsiveness specialist) in coordination with Monica (UI/UX) and Nadia (accessibility).

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Breakpoint Strategy](#breakpoint-strategy)
3. [Layout Architecture](#layout-architecture)
4. [Component Responsive Patterns](#component-responsive-patterns)
5. [Touch Interaction Patterns](#touch-interaction-patterns)
6. [D3 Visualizations on Mobile](#d3-visualizations-on-mobile)
7. [Chat Panel Mobile Behavior](#chat-panel-mobile-behavior)
8. [Modals and Overlays](#modals-and-overlays)
9. [Input and Form Handling](#input-and-form-handling)
10. [Known Limitations and Future Work](#known-limitations-and-future-work)

---

## Design Philosophy

Swarmrise follows a **mobile-aware** approach rather than strict mobile-first. The application's primary use case is organizational governance with D3 graph visualizations, which are inherently spatial and benefit from larger screens. However, all views must be usable on mobile devices.

**Key principles:**

- **Content adapts, not just shrinks.** On mobile, the chat panel becomes full-width, channel lists become separate screens, and graph visualizations fill the viewport.
- **Touch targets are generous.** All interactive elements aim for 44x44px minimum touch area (WCAG 2.5.5).
- **No horizontal overflow.** All layouts must work at 320px width minimum.
- **Progressive disclosure.** Mobile views show fewer controls at once, revealing them contextually (e.g., ViewToggle hides text labels on mobile, showing only icons).

---

## Breakpoint Strategy

The project uses **Tailwind CSS v4 default breakpoints** without customization:

| Breakpoint | Min width | Usage in Swarmrise |
|------------|-----------|-------------------|
| `sm:` | 640px | Primary mobile/desktop split point. Chat panel width, channel list visibility, brand text visibility |
| `md:` | 768px | Secondary layout adjustments. Org card grid columns, responsive text sizing |
| `lg:` | 1024px | Tertiary. Org card grid 3-column layout |
| `xl:` | 1280px | Not currently used |
| `2xl:` | 1536px | Not currently used |

**The `sm:` breakpoint is the most important dividing line.** Below `sm:` (< 640px), the interface switches to mobile-specific layouts:

- Chat panel becomes full-width (`w-full sm:w-[400px]`)
- Channel sidebar is hidden; channels shown as full-screen overlay (`hidden sm:block` / `sm:hidden`)
- Brand name "swarmrise" is hidden in header (`hidden sm:inline`)
- ViewToggle shows only icons, hiding text labels (`sr-only sm:not-sr-only`)
- Chat expand/collapse button is hidden (panel is always full-width on mobile)

---

## Layout Architecture

The root layout is a flex column filling the viewport:

```tsx
// App component (src/components/App/index.tsx)
<div className="h-screen flex flex-col">
  <Header />           // flex-shrink-0, fixed height
  <AuthenticatedView /> // flex-1 min-h-0, fills remaining space
</div>
```

The main content area uses `flex-1 min-h-0` to fill exactly the remaining height after the header. The visualization views use `absolute inset-0` within this container to fill the space entirely, which works well across all screen sizes since they are SVG-based and adapt to their container dimensions via `ResizeObserver`.

**Important pattern:** All four visual views (OrgaVisualView, TeamVisualView, MemberVisualView, RoleVisualView) use `ResizeObserver` on their container to track dimensions and render SVG elements accordingly. This means they inherently adapt to any viewport size.

---

## Component Responsive Patterns

### Header (`src/components/Header/index.tsx`)

- Brand text hidden on mobile: `hidden sm:inline`
- Logo always visible at 24px
- OrgaSelector centered with `flex-1 flex justify-center`
- Utility icons (chat toggle, notification bell) always visible
- User button (Clerk) always visible

### ViewToggle (`src/components/ViewToggle/index.tsx`)

- Text labels hidden on mobile: `sr-only sm:not-sr-only`
- Icons always visible at 18x18px
- Positioned absolutely: `absolute top-4 right-4 z-10`
- Touch target size is adequate due to `px-3 py-2` padding

### Organization Card Grid (`src/components/AuthenticatedView/index.tsx`)

- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Cards are full-width on mobile, naturally adapting

### ZoomControls (`src/components/OrgaVisualView/ZoomControls.tsx`)

- Fixed position: `absolute bottom-4 right-4`
- Buttons are 40x40px (`w-10 h-10`), meeting the 44px touch target with the visual hit area of the rounded corners
- Consider increasing to `w-11 h-11 min-h-[44px] min-w-[44px]` in the future for strict WCAG compliance

### DetailsPanel (`src/components/OrgaVisualView/DetailsPanel.tsx`)

- Fixed width: `w-80` (320px) -- this fills the entire width on 320px mobile screens
- Slides in from the right with transform transition
- **Known issue:** On very narrow screens (< 320px), this panel overflows. Consider making it full-width on mobile in the future.

### Back/Navigation Buttons (TeamVisualView, RoleVisualView, MemberVisualView)

- Positioned: `absolute top-4 left-4 z-10`
- Touch-friendly padding: `px-3 py-2`
- Include both icon and text label

### Keyboard Hints (RoleVisualView, MemberVisualView)

- Positioned: `absolute bottom-4 right-4`
- These are desktop-oriented (keyboard shortcuts). Consider hiding on touch devices in the future, since users cannot use `Esc`, `D`, `C`, `L` keys on mobile.

---

## Touch Interaction Patterns

### OrgaVisualView: Pan and Zoom

The `useViewport` hook (`src/components/OrgaVisualView/useViewport.ts`) provides both mouse and touch interaction:

**Mouse (desktop):**
- Click-drag on SVG background to pan
- Scroll wheel to zoom toward cursor position
- Keyboard shortcuts (`+`, `-`, `0`) via the SVG's `onKeyDown`

**Touch (mobile):**
- **Single-finger drag** on SVG background to pan
- **Two-finger pinch** to zoom in/out, centering on the midpoint between fingers
- Touch events are handled with native `addEventListener` using `{ passive: false }` to prevent default browser gestures
- The SVG element has `touch-action: none` to prevent the browser from intercepting touch gestures for scrolling or native pinch-zoom

**Implementation details:**
- Touch state is tracked in refs (`touchStateRef`) to avoid re-renders during gesture
- Pinch-to-zoom calculates scale factor from the ratio of current finger distance to initial finger distance
- Zoom is anchored to the midpoint between the two fingers, so the graph point under the user's fingers stays in place
- Smooth transition from pinch (2 fingers) to pan (1 finger remaining) is handled in `touchend`

### TeamNode: Pointer Events (drag + tap)

The `TeamNode` component uses pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) which work on both mouse and touch. This is the correct approach since pointer events unify mouse/touch/pen input.

- Short taps (no movement > 3px) are treated as clicks to zoom into the team
- Drags with movement > 3px initiate node dragging via the force simulation
- `setPointerCapture` is used to ensure events are received even when the pointer leaves the element

### Other Visual Views (Team, Member, Role)

These views do not have pan/zoom capability -- they are static circle-based layouts that fill the viewport. Interactive elements (role nodes, team nodes, member avatars) use:
- `role="button"` SVG groups with click handlers
- `onMouseEnter`/`onMouseLeave` for hover states (desktop only)
- `onFocus`/`onBlur` for focus states (keyboard navigation)
- Keyboard support: `Enter`/`Space` to activate, `Escape` to go back

**Note:** Hover states (`onMouseEnter`/`onMouseLeave`) do not fire on touch devices. This is acceptable since hover provides visual enhancement only (glow effects, drop shadows) and is not required for functionality.

---

## D3 Visualizations on Mobile

### Architecture

All four visual views use custom SVG rendering with D3 only for the force simulation layout engine (via `d3-force`). The project does **not** use `d3-zoom` or `d3-selection` -- viewport management is entirely custom in `useViewport.ts`.

### OrgaVisualView (Force Graph)

This is the only view with pan/zoom. On mobile:

- **Pinch-to-zoom**: Supported via custom touch handlers in `useViewport.ts`
- **Single-finger pan**: Supported; pans the graph when touching the SVG background
- **Node interaction**: Tap to zoom into a team; drag to move nodes (via pointer events which work on touch)
- **Force simulation**: Runs identically on desktop and mobile; runs to completion synchronously before rendering to avoid visible settling animation
- **Node sizing**: Based on role count (`calculateRadius`), adapts to container dimensions
- **Performance**: The simulation runs once on data load and only re-heats during drag. This is efficient even on mobile.

### TeamVisualView (Circle Layout)

Static layout -- roles arranged in a circle. On mobile:

- The circle radius adapts to `Math.min(width, height) / 2 - 40`, so it fits any viewport
- Text may become small on very narrow screens, but remains readable
- Role nodes are tappable to navigate to the role detail view
- No pan/zoom needed since the layout fits within the viewport

### MemberVisualView (Radial Layout)

Static layout -- roles and teams around a central member avatar. On mobile:

- Same adaptive radius calculation
- Avatar is centered and always visible
- Contact info panel appears as an overlay
- Keyboard shortcut hints (`Esc`, `C`) are shown but not usable on mobile touch devices

### RoleVisualView (Detail View)

Static layout -- single role with centered content. On mobile:

- Uses `foreignObject` for HTML content within SVG, allowing text wrapping and responsive typography
- Role title uses responsive text: `text-xl md:text-2xl`
- Duties modal uses `createPortal(modal, document.body)` to escape overflow constraints
- Modal is nearly full-width on mobile: `max-w-md mx-6` with `max-height: 70vh` and `overflow-y: auto`

### Pinch-to-Zoom Implementation Details

The pinch-to-zoom in `useViewport.ts` uses the following algorithm:

```
On touchstart (2 fingers):
  Record initial finger distance, midpoint, scale, and offsets

On touchmove (2 fingers):
  scaleFactor = currentDistance / initialDistance
  newScale = clamp(initialScale * scaleFactor, MIN_SCALE, MAX_SCALE)
  scaleRatio = newScale / initialScale

  // Anchor zoom to the midpoint between fingers:
  newOffsetX = currentMidpoint.x - (initialMidpoint.x - initialOffsetX) * scaleRatio
  newOffsetY = currentMidpoint.y - (initialMidpoint.y - initialOffsetY) * scaleRatio
```

This ensures the graph content under the user's fingers stays in place as they zoom, which is the expected behavior on mobile devices.

---

## Chat Panel Mobile Behavior

The ChatPanel (`src/components/Chat/ChatPanel/index.tsx`) has significant mobile-specific behavior:

### Width

- Desktop (>= 640px): `w-[400px]` (fixed sidebar width), expandable to `w-full` via toggle
- Mobile (< 640px): Always `w-full` (full-screen)

### Channel List

- Desktop: Shown as a sidebar (`w-[160px]` or `w-[220px]` when expanded), always visible alongside messages
- Mobile: Hidden by default (`hidden sm:block`). When no channel is selected, shown as a full-screen overlay (`sm:hidden`). When a channel is selected, the message list replaces the channel list.

### Expand/Collapse Toggle

- Desktop: Visible (`hidden sm:inline-flex`), toggles between sidebar and full-width modes
- Mobile: Hidden, since the panel is always full-width

### Rendering

- Uses `createPortal(panel, document.body)` to render outside the DOM hierarchy
- Positioned as `fixed top-0 right-0 h-full` with `z-40`
- Animated with `animate-slide-in-right` CSS animation

### Keyboard Shortcuts

- `Escape`: Closes search, then thread, then chat (layered dismissal)
- `Cmd/Ctrl+K`: Toggle search panel
- These are desktop-oriented; mobile users use the close button

---

## Modals and Overlays

### Portal Pattern

All modals use `createPortal(modal, document.body)` to escape ancestor `overflow-hidden` constraints. This is critical because the visual views use `overflow-hidden` on their containers, and without portals, modal content cannot scroll.

**Components using portals:**
- `RoleVisualView` duties modal
- `ChatPanel` (entire panel)
- Various create modals (CreateTopicModal, CreateVotingModal, CreateElectionModal)

### Modal Sizing on Mobile

- Duties modal: `max-w-md mx-6` -- leaves 24px margins on each side, full-width on phones
- Modal max-height: `max-height: 70vh` with `overflow-y: auto` for scrollable content
- Backdrop: `fixed inset-0` with click-to-dismiss
- Modal animations: `modalFadeIn` and `modalSlideIn` CSS keyframes

---

## Input and Form Handling

### Virtual Keyboard Considerations

- The app layout uses `h-screen flex flex-col`. On mobile, when the virtual keyboard appears, `h-screen` may or may not resize depending on the browser. Modern browsers with `interactive-widget=resizes-content` meta tag will resize the viewport.
- Chat message input is at the bottom of the panel; when focused, the keyboard should push it up naturally.

### iOS Zoom Prevention

- Input fields should have `font-size: 16px` or larger to prevent iOS Safari from auto-zooming on focus. The base body font size and input font sizes in the app should be checked against this requirement.
- Currently, the Tailwind default input font size may be smaller than 16px. This should be audited.

### Safe Areas

- The application does not currently use `env(safe-area-inset-*)` for notched device support.
- Future improvement: Add `pb-[env(safe-area-inset-bottom)]` to fixed bottom elements (ZoomControls, keyboard hints, chat message input).

---

## Known Limitations and Future Work

### Current Limitations

1. **DetailsPanel width**: The OrgaVisualView's DetailsPanel is fixed at `w-80` (320px), which fills the entire screen on 320px devices. Consider making it full-width with `w-full sm:w-80` or converting to a bottom sheet on mobile.

2. **Keyboard hints on mobile**: The RoleVisualView and MemberVisualView show keyboard shortcut hints (Esc, D, C, L) that are not usable on touch devices. These should be hidden on touch-only devices or replaced with button-based alternatives.

3. **Hover-dependent interactions**: Some visual views use `onMouseEnter`/`onMouseLeave` for hover glow effects. While these are not functional (just decorative), future enhancements should ensure mobile users can discover interactive elements through other visual cues.

4. **No safe area insets**: Fixed-position elements (ZoomControls, keyboard hints, back buttons) do not account for device notches or home indicators. Add `env(safe-area-inset-*)` padding.

5. **iOS input zoom**: Input `font-size` should be audited to ensure all form inputs are >= 16px to prevent iOS zoom on focus.

6. **TeamVisualView, MemberVisualView, RoleVisualView lack pan/zoom**: On very small screens with many nodes, the circle layouts may become cramped. Consider adding the `useViewport` pan/zoom hook to these views as well.

### Future Improvements

- **Bottom sheet pattern for mobile**: Dropdowns and selection panels could use bottom sheets on mobile for better thumb reachability.
- **Swipe gestures**: Swipe right to go back from team/role/member views; swipe left to open chat panel.
- **Simplified D3 views on mobile**: For organizations with many teams, consider a simplified list or tree view alternative on very small screens.
- **Orientation change handling**: The `ResizeObserver` pattern handles orientation changes automatically, but transitions could be smoother.
- **Mobile navigation drawer**: Consider a hamburger menu or bottom navigation bar for mobile when the app grows beyond the current single-screen focus pattern.

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-02-15 | Initial document. Documented existing responsive patterns, implemented pinch-to-zoom for OrgaVisualView, identified known limitations. |

---

*This document is maintained by Zoe (mobile responsiveness). Coordinate with Monica (UI/UX) for design decisions and Nadia (accessibility) for inclusive patterns.*
