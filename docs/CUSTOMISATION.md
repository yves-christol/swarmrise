# CUSTOMISATION.md

Single source of truth for all customisation mechanics in Swarmrise.

---

## 1. Philosophy

Swarmrise should be a canvas, not a billboard. When an organisation configures Swarmrise, the platform's own identity should gracefully recede to let the organisation's identity shine through. Customisation is not vanity -- it is a strategic lever for adoption. An organisation that sees its own logo, its own colours, and its own structure reflected back at it will invest emotionally and practically in using the platform.

There is one exception: the word **"swarmrise"** itself. Wherever the platform name appears, it is always rendered in the Montserrat Alternates font (`font-swarm`). This is the only element that retains Swarmrise's own brand identity. Everything else -- titles, labels, colours, backgrounds -- belongs to the organisation.

---

## 2. Customisation Dimensions

Customisation operates at three hierarchical levels: **Organisation**, **Team**, and **Role**. Each level has its own set of customisable properties, stored in Convex and applied at runtime.

### 2.1 Organisation-level Customisation

| Property | Description | Storage | Default |
|---|---|---|---|
| **Logo** | Custom logo image for the organisation. Displayed in the header bar and in the organisation selector. | `orgas.logoUrl` (Convex file storage URL) | Placeholder building icon |
| **Title font** | The font used for organisation titles, team names, and all heading text within the org context. Does NOT apply to the "swarmrise" word, which always uses Montserrat Alternates. | `orgas.titleFont` (planned) | System sans-serif (Arial/Helvetica) |
| **Paper colour (light mode)** | Background colour for content areas when the user is in light mode. | `orgas.paperColorLight` (planned) | `#FAFAEE` (warm off-white, `--color-light-paper`) |
| **Paper colour (dark mode)** | Background colour for content areas when the user is in dark mode. | `orgas.paperColorDark` (planned) | `#1a1a1a` (near-black, `--color-dark-paper`) |
| **Highlight colour (light mode)** | Accent/highlight colour used for interactive elements, selections, and emphasis in light mode. | `orgas.highlightColorLight` (planned) | `#eac840` (bee gold, `--color-bee-gold`) |
| **Highlight colour (dark mode)** | Accent/highlight colour used for interactive elements, selections, and emphasis in dark mode. | `orgas.highlightColorDark` (planned) | `#eac840` (bee gold, `--color-bee-gold`) |

**Current state:** The `orgas` table already stores `logoUrl` (optional string) and `colorScheme` (an object with `primary` and `secondary` RGB values). The colour scheme concept will evolve into the more granular paper/highlight colour system described above.

#### Logo

- Accepted formats: PNG, JPEG, SVG, WebP
- Uploaded via Convex file storage (`generateUploadUrl` mutation)
- Displayed at small sizes (24px in the header, 56px in the settings modal)
- Should work well on both light and dark backgrounds; recommend SVG or transparent PNG
- When no logo is set, a placeholder building icon is displayed

#### Title Font

- The Montserrat Alternates font (`font-swarm` class, `--font-family-swarm` CSS variable) is currently applied to **all** headings (`h1` through `h6`) and bold elements (`b`) via the global CSS in `src/index.css`
- This must change: Montserrat Alternates should ONLY be applied to the literal word "swarmrise" (already handled by the `BrandText` component in `src/components/shared/BrandText.tsx`)
- Organisation titles, team names, role titles, and all other heading text should use a configurable title font
- Until per-org title fonts are implemented, the default should be the system sans-serif stack (Arial, Helvetica, sans-serif) -- the same font used for body text

#### Paper Colour

- "Paper colour" refers to the background of the main content area (the visual views, manage views, etc.)
- Currently defined as CSS custom properties: `--color-light-paper` (`#FAFAEE`) and `--color-dark-paper` (`#1a1a1a`)
- Each organisation can override these per-mode
- The paper colour is distinct from the overall page background (`--color-light` / `--color-dark`) which remains constant

#### Highlight Colour

- "Highlight colour" is the accent colour used for:
  - Selected/active states (selected team node stroke, active tab)
  - Interactive affordances (buttons, focus rings)
  - Brand accent moments (the gold glow around nodes, save buttons)
- Currently hardcoded as `#eac840` throughout the codebase (both in Tailwind classes like `bg-[#eac840]` and in inline SVG styles)
- Must be abstracted into CSS custom properties so that each organisation can provide its own accent colour
- Two variants are needed: one for light mode, one for dark mode (some accent colours need adjustment for adequate contrast on dark backgrounds)

### 2.2 Team-level Customisation

| Property | Description | Storage | Default |
|---|---|---|---|
| **Team colour (light mode)** | Solid colour used for the team's circle in visual views. Also used at 80% transparency as the team's background fill. | `teams.colorLight` (planned) | `var(--diagram-node-fill)` (slate-200 light / gray-800 dark) |
| **Team colour (dark mode)** | Same as above, for dark mode. | `teams.colorDark` (planned) | `var(--diagram-node-fill)` |

**Current state:** The `teams` table has no colour field. Team circles in the D3-force graph views (`OrgaVisualView/TeamNode.tsx`) use the generic diagram fill colour (`var(--diagram-node-fill)`), which is the same for all teams.

#### How Team Colour Is Applied

Team colour is used in two ways across the visual views:

1. **Team circle (solid):** The team's circle in `OrgaVisualView` and `MemberVisualView` is filled with the team's colour as a solid colour. This makes each team visually distinct.

2. **Team background (80% transparent):** In `TeamVisualView`, `RoleVisualView`, and `MemberVisualView`, the team's colour is used at 80% transparency (`rgba(r, g, b, 0.2)`) as a background fill behind the roles/content. This provides a subtle team identity without overwhelming the content.

The affected visual view components:
- `src/components/OrgaVisualView/TeamNode.tsx` -- team circle fill
- `src/components/TeamVisualView/index.tsx` -- background circle
- `src/components/RoleVisualView/index.tsx` -- background
- `src/components/MemberVisualView/TeamNode.tsx` -- team circle fill
- `src/components/MemberVisualView/index.tsx` -- background

### 2.3 Role-level Customisation

| Property | Description | Storage | Default |
|---|---|---|---|
| **SVG icon** | An icon selected from the `iconDict` in `src/components/Icons/icons.ts`. Displayed inside the role's circle in visual views. | `roles.iconKey` (planned) | `"rond"` (simple circle) |

**Current state:** The `roles` table has no icon field. The icon dictionary (`src/components/Icons/icons.ts`) contains **441 SVG path-based icons**, each identified by a string key (e.g., `"star"`, `"heart"`, `"world"`, `"sun"`).

#### Icon System

- Icons are defined as `{ path: string }` objects in an `iconDict` record keyed by name
- Type: `Record<string, Icon>` where `Icon = { path: string }`
- All icons use a 40x40 viewBox coordinate system (paths are drawn within 0-40 range)
- Icons are rendered as SVG `<path>` elements and can be coloured via `fill` and `stroke`
- The icon selection UI should present a grid/palette of available icons for the user to pick from
- The selected icon key (string) is stored on the role document in Convex

---

## 3. Technical Architecture

### 3.1 Data Storage (Convex)

All customisation preferences are stored in Convex, not in local storage. This ensures:
- Customisation is consistent across devices and browsers
- Preferences survive cache clears
- Multiple users in the same organisation see the same branding

#### Current Schema (what exists today)

```typescript
// convex/orgas/index.ts
export const rgbColor = v.object({
  r: v.number(), // 0-255
  g: v.number(), // 0-255
  b: v.number(), // 0-255
});

export const colorScheme = v.object({
  primary: rgbColor,
  secondary: rgbColor,
});

export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorScheme,
  owner: v.id("users"),
  authorizedEmailDomains: v.optional(v.array(v.string())),
});
```

#### Planned Schema Changes

**Orgas table** -- add fields for granular colour control:

```typescript
export const orgaType = v.object({
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorScheme, // Keep for backwards compatibility
  // New customisation fields:
  paperColorLight: v.optional(rgbColor),   // Content area background (light mode)
  paperColorDark: v.optional(rgbColor),    // Content area background (dark mode)
  highlightColorLight: v.optional(rgbColor), // Accent/highlight (light mode)
  highlightColorDark: v.optional(rgbColor),  // Accent/highlight (dark mode)
  titleFont: v.optional(v.string()),       // Font family name for titles
  owner: v.id("users"),
  authorizedEmailDomains: v.optional(v.array(v.string())),
});
```

**Teams table** -- add colour fields:

```typescript
export const teamType = v.object({
  orgaId: v.id("orgas"),
  name: v.string(),
  // New customisation fields:
  colorLight: v.optional(rgbColor),  // Team colour (light mode)
  colorDark: v.optional(rgbColor),   // Team colour (dark mode)
});
```

**Roles table** -- add icon field:

```typescript
export const roleType = v.object({
  orgaId: v.id("orgas"),
  teamId: v.id("teams"),
  parentTeamId: v.optional(v.id("teams")),
  linkedRoleId: v.optional(v.id("roles")),
  title: v.string(),
  roleType: v.optional(specialRoleType),
  mission: v.string(),
  duties: v.array(v.string()),
  memberId: v.id("members"),
  // New customisation field:
  iconKey: v.optional(v.string()), // Key into iconDict, e.g. "star"
});
```

### 3.2 CSS Custom Properties

Customisation values from Convex are applied at runtime as CSS custom properties on the root or org-scoped container element. This avoids inline styles on individual components and gives a single injection point.

#### Current CSS Custom Properties

Defined in `src/index.css` under `@theme` and `:root.light` / `:root.dark`:

```css
/* Theme tokens (src/index.css) */
@theme {
  --color-light: #eeeeee;
  --color-dark: #212121;
  --color-light-paper: #FAFAEE;
  --color-dark-paper: #1a1a1a;
  --color-bee-gold: #eac840;
  --color-bee-gold-dark: #d4af37;
  --font-family-swarm: 'Montserrat Alternates', sans-serif;
}

/* Diagram tokens (mode-dependent) */
:root.light {
  --diagram-bg: #eeeeee;
  --diagram-node-fill: #e2e8f0;
  --diagram-node-stroke: #9ca3af;
  /* ... more diagram tokens */
  --diagram-golden-bee: #D4AF37;
}

:root.dark {
  --diagram-bg: #212121;
  --diagram-node-fill: #1f2937;
  --diagram-node-stroke: #9ca3af;
  /* ... more diagram tokens */
  --diagram-golden-bee: #EAC840;
}
```

#### Planned Custom Properties for Organisation Customisation

When an organisation's customisation values are loaded from Convex, they should be injected as CSS custom properties on a container element wrapping the org-scoped content:

```css
/* Applied at runtime on the org container */
--org-paper-color: <value from Convex or default>;
--org-highlight-color: <value from Convex or default>;
--org-title-font: <value from Convex or default>;
```

These are mode-aware: the application logic reads `resolvedTheme` from `ThemeContext` and selects the appropriate light/dark variant from the org's Convex data.

### 3.3 Runtime Application

The flow for applying customisation at runtime:

1. **User selects an org** -- the `orgaStore` loads the org document from Convex
2. **Org data includes customisation fields** -- `paperColorLight`, `paperColorDark`, `highlightColorLight`, `highlightColorDark`, `titleFont`
3. **ThemeContext provides `resolvedTheme`** -- either `"light"` or `"dark"`
4. **A customisation provider** (new component, wrapping the org-scoped content) reads both the org data and the resolved theme, then sets CSS custom properties on its root element
5. **Components read from CSS custom properties** -- never from hardcoded values

Example of the customisation provider:

```tsx
function OrgCustomisationProvider({ children }: { children: ReactNode }) {
  const { selectedOrga } = useSelectedOrga();
  const { resolvedTheme } = useTheme();

  const style = useMemo(() => {
    if (!selectedOrga) return {};

    const isDark = resolvedTheme === "dark";
    const paperColor = isDark
      ? selectedOrga.paperColorDark
      : selectedOrga.paperColorLight;
    const highlightColor = isDark
      ? selectedOrga.highlightColorDark
      : selectedOrga.highlightColorLight;

    const vars: Record<string, string> = {};

    if (paperColor) {
      vars["--org-paper-color"] = `rgb(${paperColor.r}, ${paperColor.g}, ${paperColor.b})`;
    }
    if (highlightColor) {
      vars["--org-highlight-color"] = `rgb(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b})`;
    }
    if (selectedOrga.titleFont) {
      vars["--org-title-font"] = selectedOrga.titleFont;
    }

    return vars;
  }, [selectedOrga, resolvedTheme]);

  return <div style={style}>{children}</div>;
}
```

### 3.4 Dark/Light Mode Integration

The `ThemeProvider` in `src/contexts/ThemeContext.tsx` manages dark/light mode:

- Supported modes: `"light"`, `"dark"`, `"system"` (follows OS preference)
- Resolved to either `"light"` or `"dark"` via `resolvedTheme`
- Applied via class on `document.documentElement` (either `.light` or `.dark`)
- Tailwind v4 uses `@custom-variant dark (&:where(.dark, .dark *))` for dark mode styles

Every customisation property that involves colour must provide **two variants**: one for light mode and one for dark mode. This is because:

- A highlight colour that works on a light paper background may be illegible on a dark background
- Paper colours must maintain adequate contrast with text in both modes
- The user or org admin sets both variants explicitly; there is no automatic derivation

### 3.5 Team Colour in Visual Views

Team colours are applied directly in SVG via inline styles, not via CSS custom properties (because each team has its own colour, unlike org-level properties which are scoped to one value per org).

The team colour is used as:

```tsx
// Solid fill for team circle
<circle fill={`rgb(${color.r}, ${color.g}, ${color.b})`} />

// 80% transparent background
<circle fill={`rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`} />
```

When no team colour is set (`colorLight` / `colorDark` is undefined), fall back to the diagram default: `var(--diagram-node-fill)`.

### 3.6 Role Icon Rendering

Role icons from `iconDict` are rendered as SVG paths within the role's visual circle:

```tsx
import { iconDict } from "../Icons/icons";

// In the role's SVG representation:
const icon = role.iconKey ? iconDict[role.iconKey] : iconDict["rond"];

<path
  d={icon.path}
  transform={`translate(${cx - 20}, ${cy - 20})`}  // Center the 40x40 icon
  fill="currentColor"
/>
```

The icon inherits its colour from the SVG context (`fill` or `currentColor`), so it automatically adapts to the theme.

---

## 4. Component Guidelines

Rules for component authors to ensure customisation compliance.

### 4.1 Colour Usage

**Never hardcode colour values.** Use CSS custom properties or Tailwind theme tokens instead.

| Instead of... | Use... |
|---|---|
| `bg-[#eac840]` | `bg-[var(--org-highlight-color,#eac840)]` or a semantic class |
| `style={{ fill: "#eac840" }}` | `style={{ fill: "var(--org-highlight-color, #eac840)" }}` |
| `text-[#FAFAEE]` | `bg-light-paper` / `bg-dark-paper` (existing utilities) |
| `stroke="#eac840"` (in SVG) | `stroke="var(--org-highlight-color, var(--diagram-golden-bee))"` |

**Exception:** The Swarmrise bee logo (`src/components/Logo/index.tsx`) uses its own brand colours (`#eac840`, `#a2dbed`, `#d4af37`, `#e0f0f4`) and should NOT be affected by org customisation. These are the product's identity, not the org's.

### 4.2 Font Usage

- The `font-swarm` class (Montserrat Alternates) should ONLY be used for the literal word "swarmrise"
- Use the `renderBrandText()` helper from `src/components/shared/BrandText.tsx` to render text that might contain the word "swarmrise" -- it automatically applies the brand font to just that word
- Organisation names, team names, role titles, and other headings should use the org's title font (defaulting to the system sans-serif stack)
- Body text uses the system sans-serif stack and is not customisable

### 4.3 Paper Colour

- Content areas should use `bg-light-paper dark:bg-dark-paper` (existing Tailwind utilities)
- When org customisation is implemented, these utilities will read from `--org-paper-color` with fallback to the defaults
- Do not use `bg-white` or `bg-gray-900` for content areas -- use the paper colour tokens

### 4.4 SVG / D3 Visual Views

- Team node fill colours should read from the team's `colorLight`/`colorDark` field, falling back to `var(--diagram-node-fill)`
- Role circles should render the role's `iconKey` icon inside them
- Team background areas (the large translucent circles) should use the team's colour at 20% opacity
- Interactive highlights (selection glow, drag feedback) should use `var(--org-highlight-color)` instead of hardcoded `#eac840`

### 4.5 Graceful Degradation

Every customisation value must have a sensible default. If a value is missing from Convex (the field is `undefined`), the component must render correctly using the default:

- Logo: placeholder icon
- Paper colour: `#FAFAEE` (light) / `#1a1a1a` (dark)
- Highlight colour: `#eac840` (bee gold)
- Team colour: `var(--diagram-node-fill)`
- Role icon: `"rond"` (simple circle)
- Title font: system sans-serif stack

---

## 5. Testing Customisation

### 5.1 Visual Verification

For any component that uses customisation values:

1. **Test with default values** -- component looks correct with no customisation set
2. **Test with custom values** -- component adapts correctly when customisation values are provided
3. **Test both modes** -- switch between light and dark mode and verify both variants of each colour work
4. **Test extreme values** -- try very light and very dark colours to ensure nothing becomes invisible
5. **Test without data** -- verify that `undefined` / missing values fall back gracefully

### 5.2 Accessibility Checks

- Every combination of highlight colour + paper colour must meet WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- The admin UI should warn (not block) when a chosen colour combination has poor contrast
- Team colours at 20% opacity on the paper background must still allow readable text

### 5.3 Performance

- Customisation values are loaded once per org switch (from the org document in Convex)
- CSS custom properties are set once and cascade through the DOM -- no per-component overhead
- No FOUC: the customisation provider should set properties synchronously before children render
- Team and role colours are inline styles on SVG elements -- lightweight and immediate

---

## 6. Constraints and Guardrails

Things that are intentionally NOT customisable, and why.

| Constraint | Reason |
|---|---|
| The "swarmrise" word always uses Montserrat Alternates | Product identity -- ensures Swarmrise is always recognisable |
| The Swarmrise bee logo colours are fixed | The bee is the product mascot, not the org's asset |
| Layout structure (sidebar, header, visual view placement) is not customisable | Consistency of navigation and muscle memory across orgs |
| Role type colours (leader gold, secretary blue, referee purple) are not customisable | These encode semantic meaning in the governance model; changing them would confuse users |
| Dark/light mode is per-user, not per-org | Individual accessibility and preference; an org should not force a mode |
| Body font is not customisable | Readability is paramount; system sans-serif is the most legible choice |
| Chat UI styling is not customisable | Chat is a utility; it should be consistently familiar |
| Notification styling is not customisable | Notifications are system-level; consistent styling builds trust |

---

## 7. Existing Implementation Audit

### 7.1 What Already Works

- **Logo upload and display:** Fully implemented. `OrgaSettingsModal` provides upload/remove UI. Header displays the logo. Storage via Convex file storage.
- **Colour scheme (primary/secondary):** Schema exists (`orgas.colorScheme`). UI for selection exists in `OrgaSettingsModal` and `CreateOrganizationModal` with presets and custom colour pickers.
- **Dark/light mode:** Fully implemented via `ThemeProvider`. Toggle in the user menu. CSS custom properties for mode-specific values.
- **BrandText helper:** `renderBrandText()` correctly isolates the "swarmrise" brand font.
- **Icon dictionary:** 441 SVG icons available in `src/components/Icons/icons.ts`.

### 7.2 What Needs Implementation

- **Paper colour fields** on the orga document (schema change)
- **Highlight colour fields** on the orga document (schema change)
- **Title font field** on the orga document (schema change)
- **Team colour fields** on the team document (schema change)
- **Role icon field** on the role document (schema change)
- **OrgCustomisationProvider** component to inject CSS custom properties
- **Refactor hardcoded `#eac840`** references across the codebase to use `var(--org-highlight-color)`
- **Refactor `font-swarm` usage** on headings to only apply to "swarmrise" (currently applied to all h1-h6 in global CSS)
- **Icon picker UI** for role management
- **Team colour picker UI** for team management
- **Paper/highlight colour pickers** in the org settings modal

### 7.3 Hardcoded Values to Refactor

The following patterns appear across the codebase and need to be replaced with custom property references:

- `bg-[#eac840]` and `hover:bg-[#d4af37]` -- buttons and highlights (replace with `var(--org-highlight-color)`)
- `text-[#eac840]` and `focus:ring-[#eac840]` -- text accents and focus rings
- `stroke="#eac840"` and `fill="#eac840"` in SVG -- diagram interaction highlights
- `rgba(234, 200, 64, ...)` in inline styles -- glow effects on nodes
- Heading font rules in `src/index.css` (`:root.dark h1, ...` and `:root.light h1, ...`) that apply Montserrat Alternates to all headings

---

## 8. Roadmap

### Phase 1: Foundation (Schema + CSS Variable Infrastructure)

- Add new fields to Convex schema (orga, team, role)
- Create `OrgCustomisationProvider` component
- Define CSS custom property naming convention
- Refactor global CSS to separate "swarmrise" brand font from heading font

### Phase 2: Organisation Colours

- Implement paper colour customisation (light + dark)
- Implement highlight colour customisation (light + dark)
- Refactor all hardcoded `#eac840` references to use `var(--org-highlight-color)`
- Update `OrgaSettingsModal` with new colour pickers
- Add contrast ratio warnings

### Phase 3: Team Colours

- Implement team colour customisation (light + dark)
- Update `TeamNode` in `OrgaVisualView` to use team colours
- Update team background in `TeamVisualView` and `RoleVisualView`
- Update `TeamManageView` with colour picker
- Handle `MemberVisualView` team nodes

### Phase 4: Role Icons

- Add `iconKey` field to roles schema
- Build icon picker component (grid of 441 icons, searchable)
- Render icons in `TeamVisualView/RoleNode` and `RoleVisualView`
- Update `RoleManageView` with icon picker

### Phase 5: Title Font

- Define supported font list (system fonts + selected web fonts)
- Implement font loading for web fonts
- Apply per-org title font to headings
- Update `OrgaSettingsModal` with font picker

---

## 9. Key File References

| File | Purpose |
|---|---|
| `src/index.css` | Global CSS theme tokens, custom properties, dark/light mode rules |
| `src/contexts/ThemeContext.tsx` | Dark/light mode provider and `useTheme` hook |
| `src/components/shared/BrandText.tsx` | `renderBrandText()` -- isolates "swarmrise" brand styling |
| `src/components/Icons/icons.ts` | 441 SVG icon definitions (`iconDict`) |
| `src/components/Logo/index.tsx` | Swarmrise bee logo (NOT customisable) |
| `src/components/Header/index.tsx` | Header bar -- shows org logo, entity name, brand text |
| `src/components/OrgaSettingsModal/index.tsx` | Org settings UI -- logo upload, colour scheme picker |
| `src/components/CreateOrganizationModal/index.tsx` | Org creation -- colour scheme presets |
| `convex/orgas/index.ts` | Orga type definition with `colorScheme`, `logoUrl` |
| `convex/teams/index.ts` | Team type definition (no colour yet) |
| `convex/roles/index.ts` | Role type definition (no `iconKey` yet) |
| `convex/schema.ts` | Full Convex schema |
| `src/components/OrgaVisualView/TeamNode.tsx` | Team circle rendering in org graph view |
| `src/components/TeamVisualView/index.tsx` | Team view with role circles |
| `src/components/TeamVisualView/RoleNode.tsx` | Role node rendering in team view |
| `src/components/RoleVisualView/index.tsx` | Role detail view |
| `src/components/MemberVisualView/index.tsx` | Member view with team/role nodes |
| `src/components/MemberVisualView/TeamNode.tsx` | Team circle in member view |
| `src/tools/orgaStore/` | Zustand store for org selection state |
