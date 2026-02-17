# Guiseppe - Customisation Specialist Memory

## Key File Paths

- Global CSS / theme tokens: `src/index.css`
- ThemeProvider: `src/contexts/ThemeContext.tsx` (light/dark/system, class-based on documentElement)
- BrandText helper: `src/components/shared/BrandText.tsx` (isolates "swarmrise" word in Montserrat)
- Icon dictionary: `src/components/Icons/icons.ts` (441 icons, type `Record<string, { path: string }>`, 40x40 viewBox)
- Orga type: `convex/orgas/index.ts` (has `colorScheme: { primary: RGB, secondary: RGB }`, `logoUrl`)
- Team type: `convex/teams/index.ts` (no colour fields yet)
- Role type: `convex/roles/index.ts` (no iconKey field yet)
- Org settings UI: `src/components/OrgaSettingsModal/index.tsx`
- Logo component: `src/components/Logo/index.tsx` (bee logo, NOT customisable)
- CUSTOMISATION.md: `docs/CUSTOMISATION.md`

## Current Customisation State

- Logo upload: IMPLEMENTED (Convex file storage, displayed in header/settings)
- Colour scheme (primary/secondary RGB): IMPLEMENTED in schema + UI (presets + custom picker)
- Dark/light mode: IMPLEMENTED via ThemeContext (class-based `.light`/`.dark`)
- BrandText: IMPLEMENTED (font-swarm only on "swarmrise" word)
- Icon dict: EXISTS (441 icons) but not wired to roles

## Known Issues / Technical Debt

- `#eac840` is hardcoded across ~10+ files (buttons, SVG strokes, focus rings, glow effects)
- `font-swarm` (Montserrat Alternates) is applied to ALL headings h1-h6 in global CSS -- should only be "swarmrise"
- Teams have no colour field -- all use same `var(--diagram-node-fill)`
- Roles have no iconKey field -- no visual differentiation
- No OrgCustomisationProvider to inject CSS vars from Convex data

## CSS Custom Properties in Use

- `@theme` block: `--color-light`, `--color-dark`, `--color-light-paper`, `--color-dark-paper`, `--color-bee-gold`, `--color-bee-gold-dark`, `--font-family-swarm`
- `:root.light` / `:root.dark`: diagram tokens (`--diagram-bg`, `--diagram-node-fill`, `--diagram-node-stroke`, etc.), `--color-gold-text`, `--diagram-golden-bee`
- Tailwind v4 dark mode: `@custom-variant dark (&:where(.dark, .dark *))`

## Customisation Decisions (User-Directed)

- Orga-level: logo, title font, paper colour (light+dark), highlight colour (light+dark)
- Team-level: team colour (light+dark) -- used solid for circles, 80% transparent for backgrounds
- Role-level: SVG icon key from icons.ts
- Montserrat Alternates ONLY for the word "swarmrise", never for org titles
- Role type colours (leader/secretary/referee) are NOT customisable (semantic meaning)
