# Kanban Mobile Drag-and-Drop Analysis

## Date: 2026-02-20

## Problem
Users report that on mobile devices, it is impossible to drag kanban cards between columns or reorder them within a column.

## Root Cause

The root cause is a **missing `touch-action: none` CSS property** on draggable card elements, combined with how `@dnd-kit`'s `TouchSensor` delay activation interacts with the browser's native touch scrolling.

### Technical Details

1. **TouchSensor delay activation**: The board configures `TouchSensor` with `{ delay: 250, tolerance: 5 }`. This means the sensor waits 250ms after `touchstart` before activating drag mode. During this delay, `handleMove()` in `AbstractPointerSensor` does NOT call `event.preventDefault()` on `touchmove` events -- it only updates pending state (line 1556 of core.esm.js: `this.handlePending(activationConstraint, delta); return;`).

2. **Browser scroll interception**: Without `touch-action: none` on the draggable element, the browser's default behavior intercepts `touchmove` events for native scrolling/panning. The parent container (`overflow-auto`) and the column card list (`overflow-y-auto`) both enable scrolling, which the browser eagerly claims.

3. **Touch sequence cancellation**: When the browser starts native scrolling, it fires a `touchcancel` event, which `AbstractPointerSensor` handles by calling `handleCancel()` -- aborting the drag before it ever activates.

4. **`TouchSensor.setup()` is necessary but insufficient**: It adds a non-passive `touchmove` listener on `window` so that `preventDefault()` calls work on iOS Safari. But this only matters AFTER the drag activates. During the 250ms delay period, no `preventDefault` is called.

### Why desktop works fine
`PointerSensor` uses `pointerdown`/`pointermove` events. Browsers do not intercept pointer events for native scrolling in the same way they do touch events. The 5px distance constraint activates almost immediately on any mouse movement.

## Key Files
- `src/components/Kanban/KanbanBoard/index.tsx` -- DnD context, sensor config (lines 127-133)
- `src/components/Kanban/KanbanColumn/index.tsx` -- SortableCard wrapper, useSortable (lines 53-103)
- `src/components/Kanban/KanbanCard/index.tsx` -- Card component (receives spread attributes/listeners)
- `node_modules/@dnd-kit/core/dist/core.esm.js` -- AbstractPointerSensor.handleMove (line 1517+), TouchSensor (line 1705+)

## Proposed Fix

### Primary Fix: Add `touch-action: none` to draggable cards

In `src/components/Kanban/KanbanCard/index.tsx`, add `touch-action: none` to the card container when it is draggable (has an onClick/listeners):

```tsx
// In the KanbanCard component's root div className:
className={`
  ...existing classes...
  ${onClick ? "touch-action-none" : ""}
`}
```

Or apply it via the style prop in SortableCard:

```tsx
// In KanbanColumn/index.tsx, SortableCard component:
const style: React.CSSProperties = {
  transform: CSS.Translate.toString(transform),
  transition,
  opacity: isDragging ? 0 : undefined,
  touchAction: (selectionMode || dragDisabled) ? undefined : 'none',
};
```

This tells the browser: "Do not interpret touch gestures on this element as scroll/zoom; let JavaScript handle them." The `touchmove` events will then reach dnd-kit's listener, and after the 250ms delay elapses, the drag activates properly.

### Secondary Fix: Also add `touch-action: none` on column drag handles

In `KanbanColumn/index.tsx`, the column drag handle (6-dot grip) also needs `touch-action: none` for column reordering on mobile:

```tsx
// Column drag handle div (line ~344-359):
<div
  className="p-0.5 ... cursor-grab active:cursor-grabbing"
  style={{ touchAction: 'none' }}
  ...
>
```

And the collapsed column drag handle (line ~291-318):

```tsx
<div
  className="cursor-grab active:cursor-grabbing ..."
  style={{ touchAction: 'none' }}
  ...
>
```

### Tradeoff: Card scrolling within columns

Adding `touch-action: none` to cards means the user cannot scroll the card list by swiping on a card. They must swipe on the empty space between/around cards, or on the column header/footer. This is an acceptable tradeoff because:

1. Cards are the primary draggable elements -- the user expects touch-and-drag on cards.
2. The column has padding and gaps between cards that remain scrollable.
3. This is the standard pattern used by all major kanban apps (Trello, Jira, etc.)

If this tradeoff is unacceptable, an alternative is to use a custom sensor that allows scrolling during the delay period but disables it once drag activates. However, this adds significant complexity.

### Alternative: Use `touch-action: manipulation` (not recommended)

`touch-action: manipulation` allows panning and pinch-zoom but disables double-tap-to-zoom. This is NOT sufficient -- it still allows the browser to claim touch events for scrolling, which is exactly what breaks drag-and-drop. `touch-action: none` is required.

### Alternative: Reduce delay to 0 (not recommended)

Setting `delay: 0` would activate drag immediately on `touchstart`, preventing any scroll. But this would make it impossible to tap cards to open the edit modal, which is worse.

## Implementation Checklist

1. Add `touchAction: 'none'` to the `style` object in `SortableCard` (KanbanColumn/index.tsx) when drag is enabled
2. Add `touchAction: 'none'` to expanded column drag handle (KanbanColumn/index.tsx)
3. Add `touchAction: 'none'` to collapsed column drag handle (KanbanColumn/index.tsx)
4. Test on iOS Safari and Android Chrome:
   - Long-press card -> drag to another column
   - Long-press card -> reorder within column
   - Tap card -> modal opens (click still works)
   - Scroll column by swiping on empty space
   - Scroll board horizontally by swiping on non-card area
5. Verify column drag handles work on mobile
6. Verify DragOverlay appears correctly on mobile

## Version Info
- @dnd-kit/core: 6.3.1
- @dnd-kit/sortable: 10.0.0
- @dnd-kit/utilities: 3.2.2
