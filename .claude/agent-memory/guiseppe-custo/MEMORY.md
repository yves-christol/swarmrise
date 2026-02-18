# Guiseppe - Customisation Specialist Memory

## Key File Paths

- Global CSS / theme tokens: `src/index.css`
- ThemeProvider: `src/contexts/ThemeContext.tsx` (light/dark/system, class-based on documentElement)
- OrgCustomisationProvider: `src/contexts/OrgCustomisationProvider.tsx` (sets --org-paper-color, --org-highlight-color, --org-title-font)
- BrandText helper: `src/components/shared/BrandText.tsx` (isolates "swarmrise" word in Montserrat)
- Icon dictionary: `src/components/Icons/icons.ts` (441 icons, type `Record<string, { path: string }>`, 40x40 viewBox)
- Orga type: `convex/orgas/index.ts` (has `colorScheme`, `paperColorLight/Dark`, `highlightColorLight/Dark`, `logoUrl`, `titleFont`)
- Orga functions: `convex/orgas/functions.ts` (createOrganization, updateOrga, transferOwnership, deleteOrganization)
- Team type: `convex/teams/index.ts`
- Role type: `convex/roles/index.ts` (has `iconKey: v.optional(v.string())`)
- Org settings UI: `src/components/OrgaSettingsModal/index.tsx`
- Create org UI: `src/components/CreateOrganizationModal/index.tsx`
- Color presets: `src/utils/colorPresets.ts` (5 presets, primary+secondary pairs)
- Fonts: `src/components/OrgaSettingsModal/fonts.ts` (system + Google Fonts options)
- Color model refactor proposal: `docs/COLOR_MODEL_REFACTOR_PROPOSAL.md`
- CUSTOMISATION.md: `docs/CUSTOMISATION.md`

## Color Model Refactor (Feb 2026 proposal)

- `colorScheme.primary` and `colorScheme.secondary` are DEAD -- stored but zero components use them for rendering
- `paperColorLight/Dark` and `highlightColorLight/Dark` are ALIVE and heavily used via CSS custom properties
- Proposal: replace 7 color fields with 3 (`accentColor`, `surfaceColorLight`, `surfaceColorDark`)
- Key gap: hover/border/text tokens in index.css are HARDCODED and do not adapt to custom paper colors
- OrgCustomisationProvider derives only 3 vars from paper color; needs to derive 11+ tokens
- See `docs/COLOR_MODEL_REFACTOR_PROPOSAL.md` for full analysis

## Surface Token Usage Stats (Feb 2026)

- bg-highlight / text-highlight / ring-highlight / border-highlight: 168 uses, 57 files
- bg-surface-primary/secondary/tertiary: 194 uses, 67 files
- text-text-secondary/description/tertiary: 344 uses, 69 files
- border-border-default/strong: 182 uses, 65 files
- bg-surface-hover variants: 105 uses, 46 files

## CSS Custom Properties Architecture

- `@theme` block: Tailwind v4 theme integration, references `var(--org-*)` with fallbacks
- OrgCustomisationProvider sets vars via inline style on `<div className="contents">`
- `:root.light` / `:root.dark` blocks define surface/hover/border/text tokens
- `.swarmrise-page` class resets org customisation for static pages

## Role Icon Implementation Status

- Schema: `iconKey: v.optional(v.string())` in `convex/roles/index.ts`
- Backend: createRole/updateRole do NOT accept iconKey yet
- Frontend: No icon picker, no icon rendering in visual views
- Default icon keys by roleType: leader="fivestar", secretary="poetry", referee="mallet"

## Customisation Decisions (User-Directed)

- Orga-level: logo, title font, paper colour (light+dark), highlight colour (light+dark)
- Team-level: SINGLE hex colour per team, HSL bounds: lightness 25-75%, saturation >= 30%
- Role-level: SVG icon key from icons.ts
- Montserrat Alternates ONLY for "swarmrise", never for org titles
- Role type colours (leader/secretary/referee) are NOT customisable (semantic meaning)
