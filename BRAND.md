# Swarmrise Brand Guidelines

This document defines the visual identity and brand standards for Swarmrise. All UI decisions should reference these guidelines to ensure consistency across the application.

**Canonical Source:** [Notion Brand Guidelines](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61)

---

## Table of Contents

1. [Brand Essence](#brand-essence)
2. [Logo](#logo)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing System](#spacing-system)
6. [Iconography](#iconography)
7. [Voice and Tone](#voice-and-tone)
8. [Component Patterns](#component-patterns)

---

## Brand Essence

### Mission
Swarmrise provides a light governance model that brings clarity and traceability to organizational decision-making without the burden of bureaucracy.

### Brand Attributes
- **Organic**: Like a swarm, we enable natural self-organization
- **Clear**: Decisions and structures are transparent and traceable
- **Light**: No heavy processes, just what's needed
- **Alive**: Real-time, reactive, always current

### Visual Metaphor
The bee represents collective intelligence, purposeful organization, and productive collaboration. The swarm metaphor extends to how organizations can self-organize efficiently when given the right structures.

### Organizational Philosophy
Swarmrise promotes flat, non-hierarchical organizations where:

- **Roles are equal in visual weight** - Leader, secretary, referee, and all other roles are peers, not superiors. No role should appear visually larger, bolder, or more prominent than another.
- **Authority is distributed** - Power flows through the collective, not down from the top. The structure is a network, not a pyramid.
- **Clarity without hierarchy** - Different roles have different functions (indicated by color or icon), but not different importance (indicated by size).

This philosophy must be reflected in all UI decisions. When visualizing organizational structures:
- All role circles MUST be the same size
- Typography weight and size MUST be consistent across all roles
- Visual differentiation uses color or iconography, never scale or prominence

---

## Logo

### The Swarmrise Bee

The logo is an animated SVG bee with four components:

| Component | Color | Hex Code | Description |
|-----------|-------|----------|-------------|
| Back Wing | Light Cyan | `#e0f0f4` | Lighter wing for depth |
| Front Wing | Sky Blue | `#a2dbed` | Primary wing color |
| Body | Gold | `#eac840` | Main body |
| Head | Dark Gold | `#d4af37` | Accent for the head |

### Usage Rules

1. **Minimum Size**: 24px for UI elements, 48px for standalone use
2. **Clear Space**: Maintain at least 8px padding around the logo
3. **Animation**: Wings animate on hover to create a "buzzing" effect
4. **Placement**: Always left-aligned in headers, centered in loading states

### Logo Implementation

```tsx
// Standard header usage
<Logo size={24} begin={2} repeatCount={1} />

// Hero or loading state
<Logo size={64} begin={0} repeatCount={3} />
```

### Do Not

- Recolor the logo components
- Display the logo smaller than 24px
- Place the logo on busy backgrounds without sufficient contrast
- Remove the animation capability

---

## Color System

### Core Palette

Swarmrise uses a minimal, high-contrast palette that works in both light and dark modes.

#### Base Colors

| Name | Light Mode | Dark Mode | Tailwind Class | CSS Variable |
|------|------------|-----------|----------------|--------------|
| Background | `#eeeeee` | `#212121` | `bg-light` / `bg-dark` | `--color-light` / `--color-dark` |
| Text | `#212121` | `#eeeeee` | `text-dark` / `text-light` | `--color-dark` / `--color-light` |

#### Brand Colors (from Logo)

| Name | Hex | Usage | Tailwind |
|------|-----|-------|----------|
| Bee Gold | `#eac840` | Primary accent, CTAs | `bg-[#eac840]` |
| Bee Gold Dark | `#d4af37` | Hover states, borders | `bg-[#d4af37]` |
| Wing Blue | `#a2dbed` | Secondary accent, info states | `bg-[#a2dbed]` |
| Wing Blue Light | `#e0f0f4` | Subtle backgrounds, highlights | `bg-[#e0f0f4]` |

#### Semantic Colors

| Purpose | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Surface | `slate-200` | `slate-800` | Cards, containers |
| Surface Elevated | `white` | `gray-800` | Modals, dropdowns |
| Border | `gray-300` | `gray-700` | Dividers, card borders |
| Text Muted | `gray-600` | `gray-400` | Secondary text |

#### Status Colors

| Status | Color | Tailwind | Usage |
|--------|-------|----------|-------|
| Success | Green | `text-green-600` / `dark:text-green-400` | Teams count, positive actions |
| Info | Blue | `text-blue-600` / `dark:text-blue-400` | Members count, informational |
| Warning | Amber | `text-amber-600` / `dark:text-amber-400` | Pending states |
| Danger | Red | `text-red-600` / `dark:text-red-400` | Destructive actions |
| Neutral | Purple | `text-purple-600` / `dark:text-purple-400` | Roles count |

### Organization Color Schemes

Each organization can define a custom `colorScheme` with primary and secondary RGB values. These should be used sparingly for org-specific branding while maintaining the base Swarmrise identity.

### Color Usage Guidelines

1. **High Contrast First**: Always ensure WCAG 2.1 AA compliance (4.5:1 for text)
2. **Dark Mode Automatic**: Use `dark:` variants for all colored elements
3. **Status Colors Consistently**: Never use green for danger or red for success
4. **Bee Gold Sparingly**: Reserve brand gold for primary actions and key highlights

---

## Typography

### Font Stack

| Usage | Font | Weight | Tailwind Class |
|-------|------|--------|----------------|
| Headings, Brand | Montserrat Alternates | 400 | `font-swarm` |
| Body | Arial, Helvetica, sans-serif | 400 | Default |
| Code | System monospace | 400 | `font-mono` |

### Type Scale

| Element | Size | Tailwind | Usage |
|---------|------|----------|-------|
| Display | 4xl (36px) | `text-4xl` | Hero headings, welcome messages |
| H1 | 3xl (30px) | `text-3xl` | Page titles |
| H2 | xl (20px) | `text-xl` | Section headings, card titles |
| H3 | lg (18px) | `text-lg` | Subsection headings |
| Body | base (16px) | `text-base` | Primary content |
| Small | sm (14px) | `text-sm` | Secondary content, labels |
| Caption | xs (12px) | `text-xs` | Metadata, timestamps |

### Typography Rules

1. **Headings**: Always use `font-swarm` (Montserrat Alternates)
2. **Weight**: Prefer `font-bold` for emphasis, not color changes
3. **Lowercase Preference**: Brand name and headings can use lowercase for approachability (e.g., "welcome!" not "Welcome!")
4. **Line Height**: Default Tailwind line heights are sufficient

### Examples

```tsx
// Hero heading
<h1 className="font-swarm text-4xl font-bold text-center">
  welcome!
</h1>

// Section heading
<h2 className="text-xl font-bold">{orga.name}</h2>

// Body with muted secondary
<p className="text-base">Primary text</p>
<p className="text-sm text-gray-600 dark:text-gray-400">Secondary text</p>
```

---

## Spacing System

Swarmrise uses Tailwind's default spacing scale. Maintain consistency with these conventions:

### Standard Spacing

| Use Case | Size | Tailwind | Pixels |
|----------|------|----------|--------|
| Tight (inline elements) | 2 | `gap-2`, `p-2` | 8px |
| Default (between elements) | 4 | `gap-4`, `p-4` | 16px |
| Comfortable (sections) | 6 | `gap-6`, `p-6` | 24px |
| Spacious (page sections) | 8 | `gap-8`, `p-8` | 32px |
| Generous (major divisions) | 16 | `gap-16`, `p-16` | 64px |

### Layout Patterns

```tsx
// Page container
<main className="p-8 flex flex-col gap-16">

// Card with comfortable padding
<div className="p-6 flex flex-col gap-4">

// Inline elements
<div className="flex items-center gap-2">
```

### Spacing Rules

1. **Consistent Gaps**: Use `gap-*` over margins when using flex/grid
2. **Container Padding**: Pages use `p-8`, cards use `p-4` or `p-6`
3. **Visual Hierarchy**: Larger gaps between major sections, smaller within components
4. **Mobile Responsive**: Consider reducing padding on smaller screens

---

## Iconography

### Icon Style

Swarmrise does not currently use an icon library. When icons are added:

1. **Style**: Outline/line icons preferred over filled
2. **Size**: 16px for inline, 20px for buttons, 24px for standalone
3. **Color**: Inherit text color (`currentColor`)
4. **Library Recommendation**: Lucide React or Heroicons

### The Bee as Icon

The Logo component serves as the primary brand icon. Use it for:
- Header branding
- Loading states (with animation)
- Empty states
- Success confirmations (with celebratory animation)

---

## Voice and Tone

### Writing Principles

| Principle | Do | Don't |
|-----------|-----|-------|
| **Friendly** | "welcome!" | "Welcome to Swarmrise." |
| **Direct** | "Sign in to continue" | "Please sign in to your account to continue" |
| **Confident** | "Create organization" | "Try creating an organization?" |
| **Humble** | "No organizations found" | "Error: No organizations exist" |

### Capitalization

- **Brand name**: Always lowercase "swarmrise"
- **Headings**: Sentence case preferred, can use lowercase for approachability
- **Buttons**: Sentence case ("Create team" not "CREATE TEAM")
- **Labels**: Sentence case

### Messaging Patterns

| State | Example |
|-------|---------|
| Empty | "You are not a member of any organizations yet." |
| Loading | "Loading..." (or use skeleton) |
| Success | Action completes silently (no toast unless critical) |
| Error | Brief, actionable message with recovery option |

### Content Hierarchy

1. **Primary**: What the user needs to do or know
2. **Secondary**: Supporting context
3. **Tertiary**: Technical details, timestamps, metadata

---

## Component Patterns

### Cards

```tsx
// Organization card pattern
<div className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
  {/* Content */}
</div>

// Resource card pattern (compact)
<div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
  {/* Content */}
</div>
```

### Header

```tsx
<header className="sticky top-0 z-10 bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
  <Logo size={24} begin={2} repeatCount={1} />
  <b>swarmrise</b>
  {/* User controls */}
</header>
```

### Grid Layouts

```tsx
// Responsive card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

// Two-column split
<div className="flex gap-2">
  <div className="flex flex-col gap-2 w-1/2">{/* Left */}</div>
  <div className="flex flex-col gap-2 w-1/2">{/* Right */}</div>
</div>
```

### Statistics Display

```tsx
// Metric with label
<div className="flex flex-col items-center">
  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
    {count}
  </div>
  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
    {label}
  </div>
</div>
```

---

## Quick Reference

### CSS Variables (defined in index.css)

```css
@theme {
  --color-light: #eeeeee;
  --color-dark: #212121;
  --font-family-swarm: 'Montserrat Alternates', sans-serif;
}
```

### Tailwind Utilities

| Utility | Usage |
|---------|-------|
| `bg-light` | Light background |
| `bg-dark` | Dark background |
| `text-light` | Light text |
| `text-dark` | Dark text |
| `font-swarm` | Brand heading font |

### Essential Classes Cheatsheet

```tsx
// Dark mode responsive text
className="text-gray-600 dark:text-gray-400"

// Dark mode responsive background
className="bg-white dark:bg-gray-800"

// Dark mode responsive border
className="border-gray-300 dark:border-gray-700"

// Interactive card with hover
className="shadow-lg hover:shadow-xl transition-shadow"

// Centered content container
className="max-w-4xl mx-auto"
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-01 | 1.0.0 | Initial brand guidelines established |

---

*This document should be updated whenever brand decisions are made. For questions about brand usage not covered here, consult the [Notion Brand source](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61).*
