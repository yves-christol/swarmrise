# Code Quality Agent Memory

## Audit History
- Round 1 (2026-02-17): Major refactoring (chat split, color migration, naming)
- Round 2 (2026-02-17): Identified duplication and dead code
- Round 3 (2026-02-19): Comprehensive fresh audit
- Round 4 (2026-02-21): Full audit -- all 7 critical/high items identified
- Round 5 (2026-02-21): Post-cleanup verification -- all 7 fixes confirmed clean

## Current Codebase Health: B+ (Good)
- Lint: 0 errors, 0 warnings
- Backend: well-split domain files, consistent patterns
- Frontend: SpinnerIcon shared, color utils consolidated, components well-organized
- Largest files: KanbanBoard (1022), KanbanCardModal (942), TeamVisualView (880) -- all manageable

## Remaining Patterns to Watch
- `notificationPreferences/functions.ts`: 426 lines, 7 exports -- entire module dead code
- Legacy orga color fields still in schema (safe to strip now)
- `getDefaultIconKey` duplicated backend/frontend (acceptable cross-boundary duplication)
- 3 Convex `.filter()` usages that could use indexes
- 3 `any` types in policies/functions.ts
- Dead re-export in chat/access.ts line 7
- Dead export: `listChildTeams` in teams/functions.ts
