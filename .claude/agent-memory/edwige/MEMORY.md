# Edwige Agent Memory

## Project Documentation Structure

Documentation files are organized in `/docs/` directory:
- `BRAND.md` - Brand identity guidelines (monica-ux-brand agent)
- `DATA_MODEL_PHILOSOPHY.md` - Data model decisions (karl agent)
- `DESIGN_PRINCIPLES.md` - Design principles
- `I18N.md` - Internationalization rules (jane-i18n agent)
- `LEGAL.md` - Legal compliance (helen-legal-advisor agent)
- `SECURITY.md` - Security guidelines (gunter agent)
- `SWARMRISE.md` - Project overview
- `UX_PRINCIPLES.md` - UX philosophy (monica-ux-brand agent)
- `UX_*.md` files - Additional UX documentation

Files that remain at project root:
- `CLAUDE.md` - Claude Code project instructions (required at root)
- `README.md` - Project readme (standard location)

## Naming Conventions

### Convex Backend
- Type definitions: `entityType` (fields only), `entityValidator` (full document with system fields)
- Index names: `by_field` or `by_field1_and_field2`
- Domain directories: `convex/<domain>/` with `index.ts` (types) and `functions.ts` (queries/mutations)

### Frontend
- Components: PascalCase
- Functions: camelCase
- i18n: Custom React Context system in `src/tools/i18n/`

## Agent-Documentation Mapping

| Agent | Primary Documentation |
|-------|----------------------|
| karl | docs/DATA_MODEL_PHILOSOPHY.md |
| monica-ux-brand | docs/BRAND.md, docs/UX_PRINCIPLES.md |
| helen-legal-advisor | docs/LEGAL.md |
| jane-i18n | docs/I18N.md |
| gunter | docs/SECURITY.md |
