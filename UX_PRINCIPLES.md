# Swarmrise UX Principles

This document defines the user experience philosophy that guides all interface decisions in Swarmrise. These are actionable rules, not abstract ideals.

**Canonical Source:** [Notion Brand Guidelines](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61)

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Flat Organization Design](#flat-organization-design)
3. [Full Reactivity](#full-reactivity)
4. [Pure Simplicity](#pure-simplicity)
5. [Interaction Patterns](#interaction-patterns)
6. [Feedback and States](#feedback-and-states)
7. [Notifications](#notifications)
8. [Accessibility](#accessibility)
9. [Language Guidelines](#language-guidelines)
10. [Anti-Patterns](#anti-patterns)

---

## Core Philosophy

### Three Pillars

1. **Full Reactivity** - Every interaction feels immediate. The UI responds instantly to user actions.
2. **Pure Simplicity** - Strip away everything that does not serve the user's goal.
3. **Clarity Over Cleverness** - Choose obvious solutions over clever ones.

### The Swarm Mindset

A swarm has no single leader directing every action. Instead, each member acts on local information and simple rules, and complex, intelligent behavior emerges. Swarmrise UI should feel the same way:

- No element demands disproportionate attention
- Structure emerges from relationships, not hierarchy
- Every part serves the whole equally

---

## Flat Organization Design

Swarmrise exists to support organizations that reject traditional command-and-control hierarchies. This core value MUST be reflected in every visual and interaction decision.

### Equal Visual Weight

All roles within a team are peers, regardless of their function. The leader role coordinates, the secretary documents, the referee ensures process - but none is "above" another.

**Rules:**

| Element | Correct | Incorrect |
|---------|---------|-----------|
| Circle size | Same radius for all roles | Larger circles for special roles |
| Font size | Consistent across all roles | Larger text for leaders |
| Font weight | Same weight for all roles | Bold for leaders, normal for others |
| Stroke width | Consistent or thinner accent | Thicker borders for special roles |

**Implementation:**

```tsx
// CORRECT: All roles use the same radius
const ROLE_RADIUS = 36; // Single constant for all roles

positions.push({
  role: anyRole,
  radius: ROLE_RADIUS, // Same for leader, secretary, referee, or regular
});

// CORRECT: Same typography for all roles
<text fontSize={12} fontWeight={500}>
  {role.title}
</text>
```

```tsx
// INCORRECT: Different sizes based on role type
radius: role.roleType === "leader" ? 42 : 32 // Creates visual hierarchy

// INCORRECT: Different typography emphasis
fontSize={role.roleType === "leader" ? 14 : 12}
fontWeight={role.roleType === "leader" ? 700 : 500}
```

### Differentiation Through Color and Iconography

Different functions ARE allowed to have different colors and icons. This provides clarity without implying hierarchy.

**Allowed differentiation:**

- Stroke color (e.g., gold for leader, blue for secretary, purple for referee)
- Small badge icons (star, quill, gavel) positioned consistently
- Background tint within the same opacity range

**Not allowed:**

- Size differences
- Position prominence (e.g., leader always at center or top)
- Animation prominence (e.g., more elaborate effects for leaders)

### Spatial Arrangement

When positioning roles:

- Use geometric arrangements that do not privilege any position (e.g., equilateral triangles, regular polygons)
- If special roles are grouped, they share the same ring or distance from center
- Avoid top-center positioning that implies "head of organization"

---

## Full Reactivity

### Instant Feedback

Users should never wonder if their action registered. Every interaction triggers immediate visual response.

**Rules:**

1. Hover states appear in under 50ms
2. Click/tap feedback is instantaneous (visual change on pointer down, not up)
3. Mutations optimistically update the UI before server confirmation
4. Loading states appear only after 200ms delay (avoid flash for fast operations)

**Tailwind implementation:**

```tsx
// Hover transition that feels instant
className="transition-colors duration-75"

// For drag operations, disable transitions
style={{ transition: isDragging ? "none" : "transform 100ms ease-out" }}
```

### Real-time Updates

Convex provides real-time subscriptions. Leverage this for:

- Live presence indicators
- Collaborative editing
- Instant propagation of changes across all connected clients

### Progressive Loading

When data takes time:

1. Show skeleton UI immediately
2. Load critical content first
3. Populate secondary information as it arrives
4. Never block the entire interface

---

## Pure Simplicity

### Essential Elements Only

Every element must justify its existence. Ask:

- Does this help the user complete their task?
- Could this be removed without losing meaning?
- Is this decoration or function?

### Information Hierarchy

Present information in order of importance:

1. **Primary**: The main action or information (largest, most prominent)
2. **Secondary**: Supporting context (smaller, muted color)
3. **Tertiary**: Metadata, timestamps (smallest, most muted)

```tsx
// Clear hierarchy through size and color
<h2 className="text-xl font-bold">{team.name}</h2>           // Primary
<p className="text-sm text-gray-600">{team.description}</p>  // Secondary
<span className="text-xs text-gray-400">{createdAt}</span>   // Tertiary
```

### White Space

Generous spacing improves comprehension. Do not crowd elements to fit more on screen.

```tsx
// Page sections: large gaps
<main className="flex flex-col gap-16">

// Within sections: medium gaps
<section className="flex flex-col gap-6">

// Related elements: small gaps
<div className="flex items-center gap-2">
```

---

## Interaction Patterns

### Click vs. Drag

- **Single click**: Primary action (navigate, select)
- **Double click**: Secondary action (unpin, edit inline)
- **Drag**: Spatial manipulation (reposition, reorder)

Ensure drag does not conflict with click by requiring minimum movement threshold:

```tsx
if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
  hasMoved.current = true; // Now it's a drag, not a click
}
```

### Focus Navigation

All interactive elements must be keyboard accessible:

```tsx
<g
  role="button"
  tabIndex={0}
  aria-label={`${role.title}, ${role.roleType || "team member"}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAction();
    }
  }}
>
```

### Zoom and Navigation

For nested structures (orgas > teams > roles):

1. Click to zoom in
2. Explicit "back" button to zoom out
3. Breadcrumb trail for deep nesting
4. Animate transitions to maintain spatial awareness

---

## Feedback and States

### Loading States

| Duration | Treatment |
|----------|-----------|
| 0-200ms | No indicator (feels instant) |
| 200ms-2s | Subtle spinner or skeleton |
| 2s+ | Progress indicator with context |

```tsx
// Delayed loading indicator
const [showLoading, setShowLoading] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setShowLoading(true), 200);
  return () => clearTimeout(timer);
}, []);
```

### Empty States

Empty is not error. Guide users toward action:

```tsx
<div className="flex flex-col items-center gap-4">
  <Logo size={48} begin={0} repeatCount={2} />
  <h3 className="font-swarm text-xl font-bold">No roles yet</h3>
  <p className="text-gray-400 text-center max-w-xs">
    This team has no roles defined. Create your first role to see it here.
  </p>
</div>
```

### Error States

- Brief, human-readable message
- Clear recovery action when possible
- Never expose technical details to users

```tsx
// Good
"Could not save changes. Please try again."

// Bad
"Error: ECONRESET - Connection reset by peer"
```

### Success States

Most successes should be silent. The UI simply updates to reflect the new state. Only use explicit success feedback for:

- Irreversible actions (deletion)
- Actions with delayed effect (invitations sent)
- Major milestones (organization created)

---

## Notifications

Notifications inform users about events that require their attention or awareness. In Swarmrise, notifications follow a **pull model** with subtle presence indicators, respecting users' attention while ensuring nothing important is missed.

### Core Principles

1. **Non-Intrusive by Default** - Notifications should inform, not interrupt. Users control when to engage.
2. **Actionable** - Every notification should have a clear path to resolution or dismissal.
3. **Contextual** - Notifications appear where the user can act on them.
4. **Real-Time** - Leverage Convex subscriptions for instant updates without polling.
5. **Dismissable** - Users can always clear or mark notifications as read.

### Notification Categories

| Category | Priority | Examples | Action Required |
|----------|----------|----------|-----------------|
| Invitation | High | Pending org invitation | Accept/Decline |
| Role Assignment | Normal | Assigned to a new role | Acknowledgment |
| Policy | Normal | New org or team policy | Read |
| Decision | Low | Audit trail update | Optional review |
| System | Varies | Maintenance, updates | Varies |

### Display Patterns

#### 1. Notification Indicator (Header)

A subtle badge in the header signals unread notifications. The indicator is:

- **Minimal**: A small dot or count, not a flashy animation
- **Persistent**: Remains visible until notifications are addressed
- **Accessible**: Color is not the only indicator (includes count or icon change)

```tsx
// Notification indicator in header
<button
  className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800
    transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840]"
  aria-label={`${unreadCount} unread notifications`}
>
  <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
  {unreadCount > 0 && (
    <span
      className="absolute top-1 right-1 min-w-4 h-4 flex items-center justify-center
        text-xs font-bold bg-[#eac840] text-dark rounded-full px-1"
      aria-hidden="true"
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</button>
```

#### 2. Notification Panel (Dropdown)

Clicking the indicator reveals a panel with all active notifications.

**Structure:**

```
+----------------------------------+
| Notifications           [Mark all read] |
+----------------------------------+
| [Icon] Invitation to Acme Corp     |
|        From john@acme.com          |
|        [Accept] [Decline]    2h ago|
+----------------------------------+
| [Icon] New role assigned           |
|        Secretary in Finance Team   |
|        [View]               1d ago |
+----------------------------------+
| No more notifications              |
+----------------------------------+
```

**Implementation:**

```tsx
<div
  className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto
    bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200
    dark:border-gray-700 z-50"
  role="dialog"
  aria-label="Notifications"
>
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-3 border-b
    border-gray-100 dark:border-gray-700">
    <h2 className="font-bold text-dark dark:text-light">Notifications</h2>
    {unreadCount > 0 && (
      <button
        onClick={markAllAsRead}
        className="text-sm text-gray-500 hover:text-gray-700
          dark:hover:text-gray-300 transition-colors"
      >
        Mark all read
      </button>
    )}
  </div>

  {/* Notification list */}
  <div className="divide-y divide-gray-100 dark:divide-gray-700">
    {notifications.map((notification) => (
      <NotificationItem key={notification._id} notification={notification} />
    ))}
  </div>

  {/* Empty state */}
  {notifications.length === 0 && (
    <div className="px-4 py-8 text-center text-gray-500">
      No notifications
    </div>
  )}
</div>
```

#### 3. Inline Notifications (Contextual)

For actionable notifications like invitations, show them inline in relevant contexts:

- **Empty State**: When user has no organizations, show pending invitations prominently
- **Organization Settings**: Show pending invitations sent by the user
- **Member Profile**: Show role-related notifications

This reduces friction by placing actions where users naturally look.

### Notification Item Design

Each notification item contains:

1. **Icon**: Category indicator (envelope for invitations, badge for roles, etc.)
2. **Title**: Brief description of the event
3. **Subtitle**: Additional context (who, where)
4. **Actions**: Primary and secondary buttons when applicable
5. **Timestamp**: Relative time ("2h ago", "Yesterday")
6. **Read State**: Visual distinction between read and unread

```tsx
<div
  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors
    ${!isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
>
  <div className="flex gap-3">
    {/* Category icon */}
    <div className={`mt-0.5 ${getCategoryColor(category)}`}>
      {getCategoryIcon(category)}
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className={`text-sm ${!isRead ? "font-medium" : ""} text-dark dark:text-light`}>
        {title}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
        {subtitle}
      </p>

      {/* Actions for actionable notifications */}
      {actions && (
        <div className="flex gap-2 mt-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.handler}
              className={action.primary
                ? "px-3 py-1 text-sm bg-[#eac840] hover:bg-[#d4af37] text-dark rounded transition-colors"
                : "px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 rounded transition-colors"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Timestamp */}
    <span className="text-xs text-gray-400 whitespace-nowrap">
      {formatRelativeTime(createdAt)}
    </span>
  </div>
</div>
```

### Invitation Notifications (Specific Pattern)

Invitations are high-priority notifications that require user action. They appear in multiple places:

#### 1. Header Notification Panel

When a user receives an invitation:
- Notification appears immediately (real-time via Convex)
- Badge count increments
- Clicking reveals invitation with Accept/Decline actions

#### 2. Empty State (No Organizations)

When a user has no organizations:
- Invitations are displayed prominently in the main content area
- This is the primary path to join an organization
- Actions (Accept/Decline) are inline and obvious

#### 3. Navigation from Notification

When user clicks on an invitation notification:
- If accepting: User is added to org and redirected to that organization
- If declining: Notification is dismissed, user remains in current context
- Mark as read: Notification moves to read state but invitation remains actionable

```tsx
// Invitation-specific notification handler
const handleInvitationAction = async (
  action: "accept" | "decline",
  invitationId: Id<"invitations">,
  orgaId: Id<"orgas">
) => {
  if (action === "accept") {
    await acceptInvitation({ invitationId });
    // Select the new organization
    selectOrga(orgaId);
    // Close the notification panel
    setIsPanelOpen(false);
  } else {
    await rejectInvitation({ invitationId });
    // Notification will auto-cleanup due to groupKey deletion
  }
};
```

### Notification Lifecycle

```
Created -> Delivered -> Read -> Archived/Deleted
             |           |
             v           v
          (Acted upon if actionable)
```

**Cleanup Rules:**

- Invitations: Deleted when invitation is accepted, declined, or cancelled
- Role assignments: Archived after 30 days
- Policies: Archived after read + 7 days
- System: Follow explicit expiration

### Real-Time Behavior

Notifications must feel alive:

1. **Instant Appearance**: New notifications appear immediately via Convex subscription
2. **Live Count**: Badge updates without page refresh
3. **Cross-Tab Sync**: Reading in one tab marks as read everywhere
4. **Optimistic Actions**: Accept/Decline feedback is immediate

```tsx
// Subscribe to unread notifications
const notifications = useQuery(api.notifications.functions.getUnread);

// Real-time count for badge
const unreadCount = useQuery(api.notifications.functions.getUnreadCount);
```

### Anti-Patterns for Notifications

| Anti-Pattern | Why It Is Wrong | Better Approach |
|--------------|-----------------|-----------------|
| Toast popups for every event | Interrupts focus, causes alert fatigue | Quiet badge increment, user pulls when ready |
| Sound notifications | Jarring, accessibility issues | Visual-only, silent by default |
| Auto-dismissing actionable items | User might miss important action | Persist until user acts |
| Showing raw timestamps | "2026-02-06T14:30:00Z" is not scannable | Relative time: "2 hours ago" |
| Red badges for all notifications | Creates false urgency | Reserve red for errors, use brand gold for notifications |
| Blocking modals for notifications | Interrupts workflow | Non-modal panel that user controls |
| Infinite notification history | Performance and cognitive load | Paginate or limit to recent (e.g., 50 items) |

### Accessibility for Notifications

1. **Screen Reader Announcements**: New notifications are announced via `aria-live="polite"`
2. **Keyboard Navigation**: Tab through notification items, Enter to expand/act
3. **Focus Management**: When panel opens, focus moves to first item
4. **Color Independence**: Use icons and text, not just color, to convey meaning

```tsx
// Screen reader announcement for new notifications
<div aria-live="polite" className="sr-only">
  {newNotification && `New notification: ${newNotification.title}`}
</div>
```

---

## Accessibility

### Minimum Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support with meaningful labels
- Sufficient color contrast (4.5:1 for text)

### Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition-duration: 0.01ms !important;
  }
}
```

### Alternative Representations

For visual-only content (diagrams, charts), provide text alternatives:

```tsx
<details className="sr-only focus-within:not-sr-only">
  <summary>View as text list</summary>
  <ul>
    {roles.map((role) => (
      <li key={role._id}>{role.title}</li>
    ))}
  </ul>
</details>
```

---

## Language Guidelines

### Terminology That Reflects Our Values

The words we use in the interface reinforce our organizational philosophy. Swarmrise exists to support flat, collaborative structures - our language should reflect this.

#### Avoid "Hierarchy" for Swarmrise Concepts

The word "hierarchy" should **only** be used when referring to external systems that are NOT swarmrise. Within the swarmrise product, use collaborative and networked language instead.

| Instead of... | Use... | Why |
|---------------|--------|-----|
| "Team Hierarchy" | "Team Connections" | Emphasizes relationships, not rank |
| "Hierarchical structure" | "Team network" or "Team structure" | Networks are peer-based |
| "Reporting hierarchy" | "Accountability links" | Describes function, not power |
| "Hierarchy view" | "Organization map" or "Team map" | Maps show connections, not levels |

**When "hierarchy" IS appropriate:**

- Discussing traditional organizational structures that swarmrise replaces
- Comparative content (e.g., "Unlike hierarchy, swarmrise...")
- Legal or philosophy pages explaining the swarmrise difference

**Implementation:**

```tsx
// CORRECT: Collaborative language
<h2>Team Connections</h2>
<p>See how this team connects to others in the organization.</p>

// INCORRECT: Hierarchical language within product
<h2>Team Hierarchy</h2>
<p>View the reporting structure.</p>
```

#### Other Language Patterns

Prefer language that emphasizes:

- **Connections** over "reporting lines"
- **Coordination** over "management"
- **Accountability** over "authority"
- **Peers** over "subordinates"
- **Network** over "chain of command"

---

## Anti-Patterns

### What NOT to Do

| Anti-Pattern | Why It's Wrong | Better Approach |
|--------------|----------------|-----------------|
| Larger circles for leaders | Implies hierarchy | Same size, different color |
| Bold text for special roles | Visual prominence = importance | Consistent typography |
| Leader at top/center | Positional hierarchy | Geometric equality |
| Confirmation dialogs for everything | Slows users down | Undo instead of confirm |
| Tooltips for obvious actions | Clutters interface | Self-explanatory labels |
| Loading spinners immediately | Feels slow | Delay 200ms before showing |
| Error messages in red only | Inaccessible to colorblind | Icon + color + text |
| Hiding actions in menus | Increases friction | Surface common actions |

### Hierarchy Creep

Watch for subtle ways hierarchy sneaks back in:

- "VIP" or "premium" styling for certain users
- Animation emphasis for certain roles
- Z-index that puts some elements permanently above others
- Language that implies rank ("under", "above", "reports to")

---

## Quick Reference

### Checklist Before Shipping

- [ ] All roles/elements are visually equal in size?
- [ ] Color differentiation follows brand palette?
- [ ] Keyboard navigation works completely?
- [ ] Loading states have appropriate delay?
- [ ] Empty states guide toward action?
- [ ] Reduced motion preference respected?
- [ ] Screen reader labels are meaningful?
- [ ] Touch targets are at least 44x44px?
- [ ] Notifications update in real-time?
- [ ] Actionable notifications have clear actions?
- [ ] Notification count is accessible (not color-only)?

### Key Tailwind Patterns

```tsx
// Instant hover feedback
className="transition-colors duration-75 hover:bg-gray-100"

// Accessible focus ring
className="focus:outline-none focus:ring-2 focus:ring-[#eac840]"

// Dark mode responsive
className="bg-white dark:bg-gray-800 text-dark dark:text-light"

// Consistent spacing
className="p-4 gap-4" // Cards
className="p-8 gap-8" // Page sections
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-07 | 1.2.0 | Added language guidelines section - "hierarchy" reserved for external systems |
| 2026-02-06 | 1.1.0 | Added comprehensive notification patterns section |
| 2026-02-02 | 1.0.0 | Initial UX principles established |

---

*This document should be updated whenever UX decisions are made. For questions not covered here, consult the [Brand Guidelines](./BRAND.md) or the [Notion source](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61).*
