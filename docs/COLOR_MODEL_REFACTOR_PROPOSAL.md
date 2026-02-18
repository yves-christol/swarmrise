# Orga Color Model Refactor Proposal

**Author:** Guiseppe (Customisation Specialist)
**Date:** 2026-02-18
**Status:** PROPOSAL -- awaiting review

---

## 1. Current State Analysis

### 1.1 Data Model (convex/orgas/index.ts)

The orga document currently stores **7 color-related fields**:

| Field | Type | Location | Purpose |
|---|---|---|---|
| `colorScheme.primary` | `v.string()` (hex) | Required | "Primary color" -- chosen via preset grid |
| `colorScheme.secondary` | `v.string()` (hex) | Required | "Secondary color" -- chosen via preset grid |
| `paperColorLight` | `v.optional(v.string())` | Optional | Background tint for light mode |
| `paperColorDark` | `v.optional(v.string())` | Optional | Background tint for dark mode |
| `highlightColorLight` | `v.optional(v.string())` | Optional | Accent/highlight color for light mode |
| `highlightColorDark` | `v.optional(v.string())` | Optional | Accent/highlight color for dark mode |
| `titleFont` | `v.optional(v.string())` | Optional | Title heading font-family (not a color, kept for reference) |

Plus `logoUrl` (not a color, out of scope for this analysis).

### 1.2 Usage Analysis -- What Is Actually Consumed

#### DEAD: `colorScheme.primary` and `colorScheme.secondary`

These are the most prominent fields in the UI (preset grid with swatches, custom color pickers) yet they are **completely unused by any rendering component**. The search results are definitive:

- `colorScheme.primary` is read ONLY in `OrgaSettingsModal/index.tsx` (to populate the edit form) and `CreateOrganizationModal/index.tsx` (to construct the creation payload).
- `colorScheme.secondary` -- same locations only.
- **Zero components** read `selectedOrga.colorScheme` or use the primary/secondary values for any visual styling.
- The preview in both modals shows two colored bars side by side, but this preview is self-contained and does not affect the app.

These colors are stored in the database and shown in the decision journal diffs, but they have **zero visual effect** on the running application.

#### ALIVE: `paperColorLight` / `paperColorDark`

These flow through `OrgCustomisationProvider.tsx` into CSS custom properties:
- `--org-paper-color` (drives `--surface-primary` in the `@theme` block)
- `--org-paper-color-secondary` (computed as 4% darker in light / 8% lighter in dark)
- `--org-paper-color-tertiary` (computed as 8% darker in light / 15% lighter in dark)

These affect **194 component usages** of `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-tertiary` across 67 files. This is the most impactful customisation channel.

#### ALIVE: `highlightColorLight` / `highlightColorDark`

These flow through `OrgCustomisationProvider.tsx` into:
- `--org-highlight-color` (drives `--color-highlight` in `@theme`)
- `--org-highlight-hover` (auto-computed as 15% darker)

These affect **168 component usages** of `bg-highlight`, `text-highlight`, `ring-highlight`, `border-highlight` across 57 files. Also used by D3 diagrams via `--diagram-golden-bee`.

### 1.3 Token Coverage Gaps

Some surface tokens are NOT driven by org customisation yet:

| Token | Light default | Dark default | Org-driven? |
|---|---|---|---|
| `--surface-primary` | `#ffffff` | `#1f2937` | YES (via `--org-paper-color`) |
| `--surface-secondary` | `#f1f5f9` | `#334155` | YES (via computed variant) |
| `--surface-tertiary` | `#e2e8f0` | `#475569` | YES (via computed variant) |
| `--surface-hover-subtle` | `#f9fafb` | `rgba(55,65,81,0.5)` | **NO** -- hardcoded |
| `--surface-hover` | `#f3f4f6` | `#374151` | **NO** -- hardcoded |
| `--surface-hover-strong` | `#e2e8f0` | `#475569` | **NO** -- hardcoded |
| `--border-default` | `#e5e7eb` | `#374151` | **NO** -- hardcoded |
| `--border-strong` | `#d1d5db` | `#4b5563` | **NO** -- hardcoded |
| `--text-secondary` | `#6b7280` | `#9ca3af` | **NO** -- hardcoded |
| `--text-description` | `#4b5563` | `#9ca3af` | **NO** -- hardcoded |
| `--text-tertiary` | `#9ca3af` | `#6b7280` | **NO** -- hardcoded |

The hover, border, and text tokens are absolute values. When a user sets a dark paper color in light mode (or a light paper color in dark mode), these hardcoded tokens will clash visually. **This is a correctness problem, not just a polish issue.**

### 1.4 Settings Panel UX Issues

The current settings modal has two separate color sections with confusing labels:

1. **"Color Scheme"** section -- preset grid of primary/secondary swatches. These do nothing.
2. **"Customisation"** section -- paper color (light + dark pickers), highlight color (light + dark pickers). These do work.

An admin sees 6 color inputs (2 from presets + 4 from customisation). The two that look most prominent (the preset grid) have zero effect. The four that actually work are buried in a secondary section. This is backwards.

Additionally, requiring admins to set separate light-mode and dark-mode variants is a burden. Most admins will only check one mode and leave the other broken. The system should derive both variants from a single input where possible.

---

## 2. Proposed New Color Model

### 2.1 Fields (3 stored colors + 1 font)

Replace the current 7 color fields with **3 color fields**:

| New field | Type | Purpose | Admin-facing label |
|---|---|---|---|
| `accentColor` | `v.optional(v.string())` | Org brand accent color (buttons, links, badges, selected states) | "Accent color" |
| `surfaceColorLight` | `v.optional(v.string())` | Base background color for light mode | "Background (light)" |
| `surfaceColorDark` | `v.optional(v.string())` | Base background color for dark mode | "Background (dark)" |
| `titleFont` | `v.optional(v.string())` | Title font-family (unchanged) | "Heading font" |

**Removed fields:**
- `colorScheme` (the `{ primary, secondary }` object) -- **DELETE** entirely. Dead code.
- `highlightColorLight` / `highlightColorDark` -- **MERGE** into single `accentColor`. The accent color is inherently mode-independent in most design systems; the system derives light/dark variants.
- `paperColorLight` / `paperColorDark` -- **RENAME** to `surfaceColorLight` / `surfaceColorDark`. Keeping both because backgrounds genuinely differ between modes and cannot be auto-derived from one value.

### 2.2 Why a Single Accent Color

The current model stores separate highlight colors for light and dark mode. In practice:
- Most org brand colors are the same color in both modes (e.g. a company uses #2563EB blue everywhere).
- The system already derives `--org-highlight-hover` by darkening 15%. It can similarly derive a "dark mode text-on-highlight" variant.
- One input is simpler and less error-prone than two.

The `OrgCustomisationProvider` will compute mode-appropriate variants:
- In light mode: use `accentColor` directly, derive hover as 15% darker.
- In dark mode: use `accentColor` directly (or lighten slightly for better contrast against dark surfaces), derive hover.
- For `text-gold` / `--color-gold-text`: compute a dark variant (for light-mode text) and a light variant (for dark-mode text) to meet WCAG AA contrast against surfaces.

### 2.3 Token Mapping

| Stored field | CSS custom property set | Tailwind tokens generated |
|---|---|---|
| `accentColor` | `--org-highlight-color`, `--org-highlight-hover`, `--color-gold-text` | `bg-highlight`, `bg-highlight-hover`, `text-highlight`, `ring-highlight`, `border-highlight`, `text-gold` |
| `surfaceColorLight` | `--org-paper-color`, `--org-paper-color-secondary`, `--org-paper-color-tertiary` (+ derived hover, border, text variants) | `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-tertiary`, `bg-surface-hover-*`, `border-border-*`, `text-text-*` |
| `surfaceColorDark` | Same properties but in dark mode | Same tokens in dark mode |

### 2.4 Derived Token Computation (OrgCustomisationProvider)

When a surface color is set, ALL related tokens must be derived from it. This is the key improvement: currently hover, border, and text tokens are hardcoded and clash with custom paper colors.

```
From surfaceColor (light mode example "#f5f0e8"):
  --org-paper-color:           #f5f0e8          (the color itself)
  --org-paper-color-secondary: darken(4%)       (slightly darker for secondary surfaces)
  --org-paper-color-tertiary:  darken(8%)       (more contrast for tertiary surfaces)
  --surface-hover-subtle:      darken(2%)       (barely visible hover)
  --surface-hover:             darken(5%)       (standard hover)
  --surface-hover-strong:      darken(10%)      (strong hover, pressed states)
  --border-default:            darken(12%)      (subtle borders)
  --border-strong:             darken(18%)      (prominent borders)
  --text-secondary:            darken(45%)      (secondary text -- must pass 4.5:1 contrast)
  --text-description:          darken(55%)      (description text -- must pass 4.5:1 contrast)
  --text-tertiary:             darken(30%)      (tertiary/muted text -- must pass 3:1 contrast)

From surfaceColor (dark mode example "#1e293b"):
  --org-paper-color:           #1e293b
  --org-paper-color-secondary: lighten(8%)
  --org-paper-color-tertiary:  lighten(15%)
  --surface-hover-subtle:      lighten(5%)
  --surface-hover:             lighten(10%)
  --surface-hover-strong:      lighten(18%)
  --border-default:            lighten(12%)
  --border-strong:             lighten(20%)
  --text-secondary:            lighten(50%)     (must pass 4.5:1 contrast)
  --text-description:          lighten(50%)     (must pass 4.5:1 contrast)
  --text-tertiary:             lighten(30%)     (must pass 3:1 contrast)
```

The exact percentages should be tuned to meet WCAG contrast requirements. The derivation functions already exist in `OrgCustomisationProvider.tsx` (`darkenHex`, `lightenHex`) and just need to be extended.

---

## 3. Accessibility Requirements

### 3.1 Contrast Checking for Accent Color

When the admin picks an accent color, the UI must:

1. **Check accent-on-surface contrast** -- the accent used as a background (buttons) needs sufficient contrast with the text placed on it. The system should auto-determine whether to use light or dark text on accent-colored buttons.
   - WCAG AA requirement: 4.5:1 for normal text, 3:1 for large text / UI components.

2. **Check accent-as-text contrast** -- the accent used as text color (links, labels) needs sufficient contrast against the surface background.
   - At minimum, show a warning badge if contrast ratio < 4.5:1.

3. **Show contrast ratio live** in the settings panel. A simple numeric display (e.g., "4.8:1") with a pass/fail indicator is sufficient.

### 3.2 Contrast Checking for Surface Color

When the admin picks a surface color:

1. The derived text tokens (secondary, description, tertiary) must be checked against the surface.
2. If the surface color is too extreme (very dark in light mode, very bright in dark mode), the system should warn or clamp.
3. Suggested guardrails:
   - Light mode surface: lightness >= 85% (HSL) to ensure derived text has room to contrast.
   - Dark mode surface: lightness <= 30% (HSL) to ensure derived text has room to contrast.

### 3.3 Text-on-Accent Auto-Selection

The `OrgCustomisationProvider` should compute a `--accent-text` token:
- If accent luminance > 0.5: use dark text (#111111 or similar).
- If accent luminance <= 0.5: use light text (#ffffff or similar).
- This replaces the current hardcoded `color: "#1a1a2e"` in the highlight preview.

---

## 4. Migration Considerations

### 4.1 Schema Migration (Convex)

Convex does not have traditional SQL migrations. Schema changes are applied by modifying `convex/orgas/index.ts` and the schema. The migration strategy:

1. **Add new fields** (`accentColor`, `surfaceColorLight`, `surfaceColorDark`) as `v.optional(v.string())`.
2. **Keep old fields temporarily** (`colorScheme`, `paperColorLight`, `paperColorDark`, `highlightColorLight`, `highlightColorDark`) as optional.
3. **Write a one-time migration action** that reads all orgas and:
   - Copies `paperColorLight` to `surfaceColorLight`
   - Copies `paperColorDark` to `surfaceColorDark`
   - Copies `highlightColorLight` to `accentColor` (light variant preferred; if only dark is set, use that)
   - Leaves `colorScheme` untouched (it is dead, but removal is a separate step)
4. **Update `OrgCustomisationProvider`** to read the new fields (with fallback to old fields during transition).
5. **After all orgas are migrated**, remove old fields from the schema.

### 4.2 Decision Journal Backward Compatibility

The `decisions` table has `colorScheme` in its diff schema (`convex/decisions/index.ts`, lines 38-43). Old decision records will still reference `colorScheme.primary/secondary`. This is audit data and must not be deleted. The decision rendering (`DecisionJournal/formatters.ts`) should continue to display old `colorScheme` diffs gracefully even after the field is removed from the orga schema.

### 4.3 COLOR_PRESETS

The current `COLOR_PRESETS` in `src/utils/colorPresets.ts` define preset pairs of primary/secondary colors. Since `colorScheme` is being removed, these presets need to be reconceived:

- **Option A (recommended):** Replace with accent color presets -- a curated list of single accent colors (brand blues, greens, purples, etc.) that the admin can pick as a quick start. No primary/secondary distinction.
- **Option B:** Remove presets entirely and just offer the color picker. Less friendly.

The preset grid in the creation/settings modals would become a simpler row of single-color swatches.

### 4.4 Demo/Test Data

`convex/dataTest/demoOrgaConfig.ts` (line 46, 352) and `convex/dataTest/orga.ts` (line 88) seed `colorScheme` values. These must be updated to use the new field names.

---

## 5. Implementation Plan

### Phase 1: Schema and Backend (karl-data)

1. **Update `convex/orgas/index.ts`:**
   - Add `accentColor: v.optional(v.string())` to `orgaType`
   - Rename `paperColorLight` to `surfaceColorLight`, `paperColorDark` to `surfaceColorDark` (or add new fields alongside old ones during migration)
   - Keep `colorScheme` temporarily as `v.optional(colorScheme)` (was required, make optional)
   - Keep `highlightColorLight` / `highlightColorDark` / `paperColorLight` / `paperColorDark` temporarily

2. **Update `convex/orgas/functions.ts`:**
   - `createOrganization`: accept `accentColor` (optional), `surfaceColorLight` (optional), `surfaceColorDark` (optional). Make `colorScheme` optional in args (backward compat).
   - `updateOrga`: accept new fields, stop requiring `colorScheme`.

3. **Write migration action** (`convex/orgas/migrations.ts`):
   - `internalAction` that iterates all orgas and populates new fields from old ones.
   - Safe to run multiple times (idempotent).

4. **Update `convex/decisions/index.ts`:**
   - Add new fields to the organization diff schema alongside old `colorScheme` (both old and new must be accepted for display).

5. **Update test data** (`convex/dataTest/`) to use new field names.

### Phase 2: Provider and Token Derivation (guiseppe-custo / monica-ux-brand)

1. **Update `OrgCustomisationProvider.tsx`:**
   - Read `accentColor` (falling back to `highlightColorLight` for migration).
   - Read `surfaceColorLight` / `surfaceColorDark` (falling back to `paperColorLight` / `paperColorDark`).
   - Derive ALL tokens from the surface color, not just the three paper-color variants. This means computing and setting `--surface-hover-subtle`, `--surface-hover`, `--surface-hover-strong`, `--border-default`, `--border-strong`, `--text-secondary`, `--text-description`, `--text-tertiary` at runtime.
   - Compute `--accent-text` for text-on-accent contrast.

2. **Update `src/index.css`:**
   - Make hover, border, and text tokens reference `var(--org-*)` overrides with hardcoded fallbacks (same pattern as surface-primary). Alternatively, since these are now computed in JS, set them as inline style vars and remove the hardcoded CSS values.

### Phase 3: Settings Panel UI (monica-ux-brand)

1. **Redesign `OrgaSettingsModal` customisation section:**
   - Remove the "Color Scheme" preset grid (primary/secondary).
   - Replace with a single "Accent Color" picker with optional accent presets (single swatches).
   - Keep "Background (Light)" and "Background (Dark)" pickers.
   - Add live contrast-ratio display next to accent and surface pickers.
   - Add warning indicators when contrast is insufficient.

2. **Redesign `CreateOrganizationModal`:**
   - Remove `colorScheme` preset grid.
   - Optionally offer accent color presets as a simpler row of single swatches.
   - Remove the two-swatch preview.

3. **Live preview improvement:**
   - Show a mini-card with actual surface/accent/text combinations rather than abstract color bars.
   - Show both light and dark mode previews side by side.

### Phase 4: Cleanup

1. Remove old fields from schema (`colorScheme`, `paperColorLight`, `paperColorDark`, `highlightColorLight`, `highlightColorDark`).
2. Remove `COLOR_PRESETS` from `src/utils/colorPresets.ts` or replace with accent presets.
3. Remove migration fallback code from `OrgCustomisationProvider`.
4. Update `CUSTOMISATION.md` with the final model.

---

## 6. Summary of Changes by Agent

| Agent | Scope | Key Files |
|---|---|---|
| **karl-data** | Schema changes, migration action, function arg updates | `convex/orgas/index.ts`, `convex/orgas/functions.ts`, `convex/decisions/index.ts`, `convex/dataTest/` |
| **monica-ux-brand** | Settings panel redesign, create modal update, contrast UI, preset overhaul | `src/components/OrgaSettingsModal/index.tsx`, `src/components/CreateOrganizationModal/index.tsx`, `src/utils/colorPresets.ts` |
| **guiseppe-custo** | Provider token derivation, CSS token wiring, accessibility computation, CUSTOMISATION.md | `src/contexts/OrgCustomisationProvider.tsx`, `src/index.css`, `docs/CUSTOMISATION.md` |

---

## 7. Open Questions

1. **Should `surfaceColorLight` and `surfaceColorDark` be merged into a single field?** The current proposal keeps both because light and dark backgrounds are genuinely different colors (e.g., warm cream vs. navy blue). Auto-deriving a dark surface from a light one produces poor results. However, this means 2 of the 3 color fields are surface colors, and many admins will only customise one mode. Worth discussing.

2. **Should accent color support separate light/dark variants as an advanced option?** The proposal uses a single accent, but some brands genuinely use different blues in light vs dark contexts. A compromise: single field by default, with an "advanced" toggle to split into two.

3. **What happens to the decision journal display?** Old decisions referencing `colorScheme.primary/secondary` need to remain displayable. The `formatters.ts` must handle both old and new schemas.

4. **Should the presets carry over at all?** The current presets (gold-blue, green-gray, etc.) are pairs. If we move to single accent colors, we need new presets. A suggested list: brand gold (#eac840), ocean blue (#2563eb), forest green (#16a34a), royal purple (#7c3aed), coral red (#ef4444), teal (#0d9488).

5. **Surface color lightness guardrails.** Should the system clamp surface colors to safe ranges, or just warn? Clamping is more robust but less flexible. Warning is friendlier but allows admins to create inaccessible themes.
