# Navigation Patterns

## Cross-View Card Modal Opening (MemberKanbanView -> KanbanBoard)
- **Pattern**: Pass card ID via React Router navigation state, read it in target component
- **Type**: `KanbanNavigationState` exported from `src/components/Kanban/KanbanBoard/index.tsx`
  - Fields: `openCardId?: Id<"kanbanCards">`
- **Sender** (MemberKanbanView): `navigate(route, { state: { openCardId: card._id } })`
- **Receiver** (KanbanBoard):
  - `useLocation().state` read once into a ref on mount
  - `useEffect` watches `cardById` map; when card is found, opens modal and clears ref
  - `window.history.replaceState({}, "")` clears state to prevent re-open on back/forward
- **Key considerations**:
  - Board data loads asynchronously, so the effect must wait for `cardById` to be populated
  - Using a ref (not state) for the pending card ID avoids re-render loops
  - Clearing history state prevents re-opening modal on browser navigation
