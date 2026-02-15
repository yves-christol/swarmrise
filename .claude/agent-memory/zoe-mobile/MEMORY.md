# Zoe Mobile Agent Memory

## Project Responsive Architecture

### Breakpoint Usage
- `sm:` (640px) is the primary mobile/desktop dividing line used throughout the app
- `md:` (768px) used for grid layouts (org cards) and text sizing
- `lg:` (1024px) used for 3-column org card grid
- No custom breakpoints defined in `tailwind.config.js`
- Tailwind CSS v4 with default breakpoints

### Key Responsive Patterns
- Chat panel: `w-full sm:w-[400px]` (full-width on mobile, fixed sidebar on desktop)
- Channel list: `hidden sm:block` with `sm:hidden` mobile overlay when no channel selected
- Brand text: `hidden sm:inline` in Header
- ViewToggle labels: `sr-only sm:not-sr-only`
- Org card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Layout Structure
- Root: `h-screen flex flex-col` with Header + content area
- Content: `flex-1 min-h-0` fills remaining space
- Visual views: `absolute inset-0` with `ResizeObserver` for dimensions
- All visual views use `overflow-hidden` on containers

### D3 Visualization Architecture
- Only `d3-force` is installed (no `d3-zoom`, `d3-selection`)
- Viewport pan/zoom is custom in `src/components/OrgaVisualView/useViewport.ts`
- Only OrgaVisualView has pan/zoom; TeamVisualView, MemberVisualView, RoleVisualView are static circle layouts
- Pinch-to-zoom implemented (2026-02-15) via native touch event listeners
- SVG uses `touch-action: none` to prevent browser gesture interference
- TeamNode uses pointer events (onPointerDown/Move/Up) which work on both mouse and touch

### Portal Pattern
- Modals use `createPortal(modal, document.body)` to escape `overflow-hidden` ancestors
- Used in: RoleVisualView duties modal, ChatPanel, create modals
- See also user memory note about this pattern

### Known Issues to Address
- DetailsPanel fixed at `w-80` -- fills entire 320px screen, needs mobile adaptation
- Keyboard hint badges on RoleVisualView/MemberVisualView not useful on touch devices
- No `env(safe-area-inset-*)` usage for notched devices
- iOS input zoom prevention not audited (need 16px+ font-size on inputs)
- ZoomControls buttons are 40x40px, slightly under 44px WCAG recommendation

### Documentation
- RESPONSIVE.md created in docs/ (2026-02-15) -- comprehensive mobile patterns doc
- See also: docs/DESIGN_PRINCIPLES.md, docs/UX_PRINCIPLES.md
