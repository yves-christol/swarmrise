# Guiseppe - Customisation Specialist Memory

## Key File Paths

- Global CSS / theme tokens: `src/index.css`
- ThemeProvider: `src/contexts/ThemeContext.tsx` (light/dark/system, class-based on documentElement)
- BrandText helper: `src/components/shared/BrandText.tsx` (isolates "swarmrise" word in Montserrat)
- Icon dictionary: `src/components/Icons/icons.ts` (441 icons, type `Record<string, { path: string }>`, 40x40 viewBox)
- Orga type: `convex/orgas/index.ts` (has `colorScheme: { primary: RGB, secondary: RGB }`, `logoUrl`)
- Team type: `convex/teams/index.ts` (currently has `colorLight`/`colorDark` RGB objects -- to be migrated to single `color` hex string)
- Role type: `convex/roles/index.ts` (has `iconKey: v.optional(v.string())` in schema, but NOT yet wired in backend or frontend)
- Org settings UI: `src/components/OrgaSettingsModal/index.tsx`
- Logo component: `src/components/Logo/index.tsx` (bee logo, NOT customisable)
- CUSTOMISATION.md: `docs/CUSTOMISATION.md`

## Current Customisation State

- Logo upload: IMPLEMENTED (Convex file storage, displayed in header/settings)
- Colour scheme (primary/secondary RGB): IMPLEMENTED in schema + UI (presets + custom picker)
- Dark/light mode: IMPLEMENTED via ThemeContext (class-based `.light`/`.dark`)
- BrandText: IMPLEMENTED (font-swarm only on "swarmrise" word)
- Icon dict: EXISTS (441 icons) but not wired to roles
- RoleManageView: `src/components/RoleManageView/index.tsx` (edit form for roles -- no icon picker yet)
- NavBar RoleSelector: `src/components/NavBar/RoleSelector/index.tsx`
- Shared visual types: `src/components/shared/visualTypes.ts` (RoleData type -- no iconKey field yet)

## Role Icon Implementation Status

- Schema: `iconKey: v.optional(v.string())` ALREADY in `convex/roles/index.ts`
- Backend: `createRole` and `updateRole` do NOT accept/handle iconKey yet
- Frontend: No icon picker UI, no icon rendering in visual views
- `RoleData` type in `src/components/shared/visualTypes.ts` does NOT include `iconKey`
- Team creation (`convex/teams/functions.ts` createTeam) inserts leader/secretary/referee roles WITHOUT iconKey
- Role type badge icons are inline SVG (star/feather/gavel) -- NOT from iconDict
- Role rendering components that need icon support:
  - `TeamVisualView/RoleNode.tsx` -- role circles in team view
  - `MemberVisualView/RoleLink.tsx` -- role circles in member view
  - `RoleVisualView/index.tsx` -- role detail view
  - `RoleManageView/index.tsx` -- role edit form (needs icon picker)
  - `NavBar/RoleSelector/index.tsx` -- could show icon next to role name
- Default icon keys by roleType: leader="fivestar", secretary="poetry", referee="mallet"
- Default for roles with no roleType: needs sensible default (e.g. "rond")

## Known Issues / Technical Debt

- Role type badge icons (star/feather/gavel) are hardcoded inline SVGs in 3+ components -- could be unified
- `RoleData` shared type needs `iconKey?: string` added

## CSS Custom Properties in Use

- `@theme` block: `--color-light`, `--color-dark`, `--color-light-paper`, `--color-dark-paper`, `--color-bee-gold`, `--color-bee-gold-dark`, `--font-family-swarm`
- `:root.light` / `:root.dark`: diagram tokens (`--diagram-bg`, `--diagram-node-fill`, `--diagram-node-stroke`, etc.), `--color-gold-text`, `--diagram-golden-bee`
- Tailwind v4 dark mode: `@custom-variant dark (&:where(.dark, .dark *))`

## Customisation Decisions (User-Directed)

- Orga-level: logo, title font, paper colour (light+dark), highlight colour (light+dark)
- Team-level: SINGLE hex colour per team (no light/dark variants), HSL bounds: lightness 25-75%, saturation >= 30%
- Team colour used for: circle outlines (solid), backgrounds (20% opacity), badges, channel indicators
- Role-level: SVG icon key from icons.ts
- Montserrat Alternates ONLY for the word "swarmrise", never for org titles
- Role type colours (leader/secretary/referee) are NOT customisable (semantic meaning)
