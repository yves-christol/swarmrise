# Code Quality Agent Memory

## Audit History
- Round 1 (2026-02-17): Major refactoring (chat split, color migration, naming)
- Round 2 (2026-02-17): Identified duplication and dead code
- Round 3 (2026-02-19): Comprehensive fresh audit -- see edwige/MEMORY.md for details

## Key Patterns to Watch
- Org deletion logic duplicated in two places with INCOMPLETE cleanup
- Dead code accumulating in notification/policy modules
- Inline spinner SVGs proliferating instead of using shared SpinnerIcon
- Type safety: `createDefaultPreferences` uses `string` not `Id<"users">`
