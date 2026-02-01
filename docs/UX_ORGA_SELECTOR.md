# Organization Selector - UX Design Specification

This document defines the user experience for the organization selector feature in Swarmrise.

---

## Overview

The organization selector allows users to:
1. See which organization they are currently working in
2. Switch between organizations they are members of
3. Take action when they have no organizations (accept invitations or create one)

---

## Design Principles Applied

Following the three pillars from DESIGN_PRINCIPLES.md:

### Full Reactivity
- Organization list updates in real-time when user joins/leaves orgs
- Invitation status changes propagate immediately
- Selected organization persists across sessions (localStorage)
- All views dependent on selected org update simultaneously

### Pure Simplicity
- Single click to open selector
- Single click to switch organizations
- Empty state has exactly two clear paths forward
- No unnecessary information in the selector

### Clarity Over Cleverness
- Current organization is always visible in header
- Organization names, not just logos
- Obvious visual distinction between selected and other orgs

---

## Component Architecture

```
Header
  |__ OrgaSelector (container)
        |__ OrgaSelectorTrigger (current org display)
        |__ OrgaSelectorDropdown (list of orgs)
        |__ EmptyStatePanel (when no orgs)
```

---

## States

### 1. Loading State
When organizations are being fetched.

```tsx
// Skeleton in header position
<div className="flex items-center gap-2 animate-pulse">
  <div className="w-6 h-6 rounded bg-gray-600" />
  <div className="w-24 h-4 rounded bg-gray-600" />
</div>
```

**Duration**: Brief (Convex queries are fast)
**Behavior**: No interaction possible during loading

---

### 2. Single Organization
User belongs to exactly one organization.

**Display**: Organization name and logo (if exists) shown in header
**Interaction**: Clicking opens dropdown with just the current org (greyed) plus "Create new organization" option
**Rationale**: Even with one org, users should be able to create more

```
[Logo] Organization Name [v]
```

---

### 3. Multiple Organizations
User belongs to two or more organizations.

**Display**: Currently selected organization name and logo
**Interaction**: Click opens dropdown listing all organizations

```
Dropdown Structure:
-------------------
| [Logo] Org 1 (current)  [checkmark] |
| [Logo] Org 2                        |
| [Logo] Org 3                        |
|-------------------------------------|
| + Create new organization           |
-------------------
```

**Selection**: Single click switches organization immediately
**Visual feedback**: Selected org has checkmark, hover state on others

---

### 4. Empty State (No Organizations)
User is not a member of any organization.

**Header Display**: "Select organization" placeholder with emphasis styling

**Main Content**: Full-page empty state with two paths:

```
+----------------------------------------+
|                                        |
|  You are not a member of any          |
|  organizations yet.                    |
|                                        |
|  [If invitations exist:]              |
|  +---------------------------------+   |
|  | PENDING INVITATIONS              |   |
|  |                                  |   |
|  | Acme Corp                        |   |
|  | Invited by alice@acme.com        |   |
|  | [Accept]  [Decline]              |   |
|  |                                  |   |
|  | Beta Labs                        |   |
|  | Invited by bob@beta.io           |   |
|  | [Accept]  [Decline]              |   |
|  +---------------------------------+   |
|                                        |
|  -- or --                              |
|                                        |
|  [Create your first organization]     |
|                                        |
+----------------------------------------+
```

**Priority**: Invitations are shown prominently above the create option
**Rationale**: Accepting an invitation requires less effort than creating

---

## Interaction Patterns

### Opening the Dropdown

**Trigger**: Click on the selector trigger area (entire header section)
**Animation**: Instant appearance (no fade/slide per DESIGN_PRINCIPLES)
**Focus**: First org item receives focus for keyboard navigation

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Open dropdown (when trigger focused) |
| Arrow Down | Move to next item |
| Arrow Up | Move to previous item |
| Enter | Select focused item |
| Escape | Close dropdown |
| Tab | Move focus (standard browser behavior) |

### Closing the Dropdown

**Triggers**:
- Click outside dropdown
- Press Escape
- Select an organization
- Tab away from dropdown

---

## Visual Specifications

### Trigger (Header Element)

```tsx
// Closed state
<button className="flex items-center gap-2 px-3 py-1.5 rounded-md
  hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-offset-2
  focus:ring-[#eac840] focus:ring-offset-dark">
  {/* Logo or placeholder */}
  <span className="text-light font-swarm">{orgName}</span>
  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
</button>
```

### Dropdown Panel

```tsx
<div className="absolute top-full left-0 mt-1 w-72
  bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
  {/* Org list */}
  <div className="py-1">
    {orgs.map(org => (
      <button className="w-full flex items-center gap-3 px-4 py-2.5
        hover:bg-gray-700 transition-colors text-left">
        {/* Logo */}
        <span className="flex-1 text-light">{org.name}</span>
        {isSelected && <CheckIcon className="w-4 h-4 text-[#eac840]" />}
      </button>
    ))}
  </div>

  {/* Divider */}
  <div className="border-t border-gray-700" />

  {/* Create new */}
  <button className="w-full flex items-center gap-3 px-4 py-2.5
    hover:bg-gray-700 transition-colors text-left text-gray-400">
    <PlusIcon className="w-5 h-5" />
    Create new organization
  </button>
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center gap-8 max-w-md mx-auto py-16">
  <Logo size={64} begin={0} repeatCount={2} />

  <div className="text-center">
    <h1 className="font-swarm text-3xl mb-2">welcome!</h1>
    <p className="text-gray-400">
      You are not a member of any organizations yet.
    </p>
  </div>

  {pendingInvitations.length > 0 && (
    <div className="w-full">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4">
        Pending Invitations
      </h2>
      <div className="flex flex-col gap-3">
        {pendingInvitations.map(inv => (
          <InvitationCard invitation={inv} />
        ))}
      </div>
    </div>
  )}

  {pendingInvitations.length > 0 && (
    <div className="flex items-center gap-4 w-full">
      <div className="flex-1 border-t border-gray-700" />
      <span className="text-gray-500 text-sm">or</span>
      <div className="flex-1 border-t border-gray-700" />
    </div>
  )}

  <button className="px-6 py-3 bg-[#eac840] hover:bg-[#d4af37]
    text-dark font-bold rounded-lg transition-colors">
    Create your first organization
  </button>
</div>
```

### Invitation Card

```tsx
<div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
  <div className="flex items-start justify-between mb-3">
    <div>
      <h3 className="font-bold text-light">{orgName}</h3>
      <p className="text-sm text-gray-400">
        Invited by {emitterEmail}
      </p>
    </div>
    {orgLogoUrl && (
      <img src={orgLogoUrl} className="w-10 h-10 rounded" />
    )}
  </div>
  <div className="flex gap-2">
    <button className="flex-1 px-3 py-1.5 bg-[#eac840] hover:bg-[#d4af37]
      text-dark font-medium rounded transition-colors">
      Accept
    </button>
    <button className="px-3 py-1.5 border border-gray-600 hover:border-gray-500
      text-gray-400 hover:text-gray-300 rounded transition-colors">
      Decline
    </button>
  </div>
</div>
```

---

## Accessibility

### ARIA Attributes

```tsx
// Trigger
<button
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-controls="orga-selector-dropdown"
>

// Dropdown
<div
  id="orga-selector-dropdown"
  role="listbox"
  aria-label="Select organization"
>

// Org option
<button
  role="option"
  aria-selected={isSelected}
>
```

### Focus Management
- When dropdown opens, focus moves to the currently selected item
- Focus is trapped within dropdown while open
- When dropdown closes, focus returns to trigger

### Color Contrast
All text meets WCAG 2.1 AA requirements:
- Light text (#eeeeee) on dark backgrounds (#212121, gray-800)
- Gold accent (#eac840) on dark backgrounds

---

## Data Requirements

### Queries Needed

1. `listMyOrgasWithCounts` - Already exists, provides org list with metrics
2. `listMyInvitations` - Already exists, needs filtering for pending status

### Mutations Needed

1. `acceptInvitation` - Already exists
2. `rejectInvitation` - Already exists
3. `createOrganization` - Already exists

### Client State

```tsx
// OrgaStore additions
type OrgaStoreContextType = {
  selectedOrgaId: Id<"orgas"> | null
  selectedOrga: Orga | null  // Full org object for display
  selectOrga: (orgaId: Id<"orgas"> | null) => void
  isLoading: boolean
}
```

### Persistence

- Selected organization ID stored in `localStorage` key: `swarmrise_selected_orga`
- On app load, restore selection if user still has access to that org
- Clear selection if org no longer accessible

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Selected org deleted | Clear selection, show empty state or first available org |
| User removed from selected org | Clear selection, show notification |
| All orgs removed | Show empty state |
| Invitation accepted | Auto-select new org, update list |
| New org created | Auto-select new org, update list |
| Network error loading orgs | Show error state with retry |

---

## Testing Checklist

- [ ] Single org user can see their org in header
- [ ] Multi-org user can switch between orgs
- [ ] Empty state shows invitations correctly
- [ ] Accept invitation adds user to org
- [ ] Decline invitation removes it from list
- [ ] Create org button navigates/opens modal
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Selection persists across page refresh
- [ ] Real-time updates when org data changes

---

## Implementation Order

1. Enhance OrgaStore with persistence and full org data
2. Create OrgaSelectorDropdown component
3. Create EmptyStatePanel component with invitation cards
4. Integrate into Header
5. Add create organization flow (if modal needed)

---

*Last updated: 2026-02-01*
