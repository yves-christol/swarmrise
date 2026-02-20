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
8. [Policies](#policies)
9. [Accessibility](#accessibility)
10. [Language Guidelines](#language-guidelines)
11. [Anti-Patterns](#anti-patterns)

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

## Policies

Policies are permanent rules an organization gives itself to operate with clarity, transparency, and consistency. They are a first-class governance primitive -- not buried in settings, not hidden in documents. They live at the surface of the UI because they shape how the organization behaves.

### Core Principles for Policies

1. **Ownership through Roles** - A policy is ALWAYS owned by a specific role, never by a person directly. When a role changes hands, its policies stay with the role. This reinforces that governance belongs to the structure, not to individuals.
2. **Universal Readability** - Every member of the organization can read and search all policies. Transparency is non-negotiable.
3. **Scoped Editability** - Only the member currently holding the owning role can create, edit, or delete that role's policies. The UI must make this permission boundary visible without creating friction for readers.
4. **Automatic Numbering** - Policies are numbered sequentially within the organization (POL-1, POL-2, ...). Users never choose or manage numbers. The system guarantees uniqueness and order.
5. **Searchable** - Full-text search on title and abstract. Policies are only useful if people can find them.

### Data Model (UI-Relevant Fields)

| Field | Type | Purpose |
|-------|------|---------|
| `number` | Auto-incremented integer | Permanent identifier (POL-1, POL-2, ...) |
| `title` | String | Short, descriptive name |
| `abstract` | String | One-paragraph summary for scanning |
| `text` | Markdown string | Full policy content with embedded images, links |
| `attachmentIds` | Optional array of storage IDs | Files attached to the policy |
| `roleId` | Reference | Owning role |
| `orgaId` | Reference | Organization scope |

### Where Policies Appear

Policies surface in two contexts, each serving a different user need.

#### 1. Organization-Level Policies View (Third View Mode)

At the orga level, policies appear as a third view mode alongside "visual" and "manage". This is where users go to browse, search, and read all policies across the entire organization.

**HeaderViewToggle Change:**

The toggle button in the menu bar must accommodate the new "policies" option. The existing pattern uses icon-only tab buttons separated by vertical dividers, with `role="tab"` and `aria-selected` attributes.

```
+-------+---+-------+---+----------+
| [net] | | [list] | | [scroll] |
+-------+---+-------+---+----------+
 visual     manage       policies
```

- The policies icon should be a scroll/document glyph (lines of text with a seal or ribbon motif) to visually distinguish it from the manage view's stacked-rectangles icon
- The policies tab is always visible at the orga level (unlike kanban, which is conditional on team/member focus)
- At team and member focus levels, the policies tab is NOT shown -- policies are an org-level and role-level concern only

**Implementation for HeaderViewToggle:**

```tsx
// New icon for policies tab (scroll/document)
<button
  role="tab"
  aria-selected={viewMode === "policies"}
  onClick={() => handleChange("policies")}
  disabled={disabled}
  className={tabClass(viewMode === "policies", disabled)}
  title={`${t("policies")} (P)`}
>
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="4" y="2" width="10" height="14" rx="1.5" />
    <line x1="7" y1="6" x2="11" y2="6" />
    <line x1="7" y1="9" x2="11" y2="9" />
    <line x1="7" y1="12" x2="9" y2="12" />
  </svg>
</button>
```

**ViewMode Type Update:**

```typescript
// Updated type
export type ViewMode = "visual" | "manage" | "kanban" | "policies";
```

**PrismFlip Geometry Update:**

The orga-level `PrismFlip` must change from `"coin"` (2 faces) to `"prism"` (3 faces) to support the third policies view. The FocusContainer render logic becomes:

```tsx
// Orga view: now 3 faces (was coin, now prism)
<PrismFlip
  geometry="prism"
  activeFaceKey={getFlipClass()}
  faces={[
    { key: "visual", content: <OrgaVisualView ... /> },
    { key: "manage", content: <OrgaManageView ... /> },
    { key: "policies", content: <OrgaPoliciesView orgaId={orgaId} /> },
  ]}
/>
```

**Keyboard Shortcut:**

- `P` key jumps to policies view (consistent with `V` for visual cycling and `K` for kanban)
- `V` key cycle at orga level becomes: visual -> manage -> policies -> visual

**OrgaPoliciesView Layout:**

The policies list view follows the same layout conventions as `OrgaManageView`: scrollable, `max-w-4xl mx-auto`, with `pt-8 px-8 pb-8` padding.

```
+--------------------------------------------------+
| Policies                           [Search...]   |
| Permanent rules of the organization              |
+--------------------------------------------------+
|                                                   |
| +----------------------------------------------+ |
| | POL-1  Data Retention Policy                  | |
| | Defines how long member data is retained...   | |
| | Secretary, Finance Team         Jan 15, 2026  | |
| +----------------------------------------------+ |
| | POL-2  Decision Quorum Rules                  | |
| | Minimum participation thresholds for...       | |
| | Referee, General Assembly       Feb 3, 2026   | |
| +----------------------------------------------+ |
| | POL-3  Onboarding Process                     | |
| | Steps for integrating new members into...     | |
| | Leader, HR Team                 Feb 10, 2026  | |
| +----------------------------------------------+ |
|                                                   |
| Showing 3 of 12 policies        [Load more]      |
+--------------------------------------------------+
```

**Policy List Item Structure:**

Each row in the policy list contains:

```tsx
<div className="px-4 py-4 hover:bg-surface-hover-subtle transition-colors duration-75 cursor-pointer">
  <div className="flex items-start gap-3">
    {/* Policy number badge */}
    <span className="shrink-0 px-2 py-0.5 rounded bg-surface-tertiary text-xs font-mono text-text-secondary">
      POL-{policy.number}
    </span>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-dark dark:text-light">
        {policy.title}
      </h3>
      <p className="text-sm text-text-description mt-0.5 line-clamp-2">
        {policy.abstract}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
        <span>{roleName}, {teamName}</span>
        <span aria-hidden="true">-</span>
        <time>{formatDate(policy.issuedDate)}</time>
      </div>
    </div>
  </div>
</div>
```

**Information hierarchy within each policy row:**

1. **Primary**: Policy number + title (font-medium, full color)
2. **Secondary**: Abstract (text-description, line-clamped to 2 lines)
3. **Tertiary**: Owning role, team, and date (text-tertiary, smallest)

**Search UX:**

- Search input sits in the section header row, right-aligned, matching the pattern from `OrgaManageView`'s member/team search
- Searches title and abstract fields
- Results update in real-time via Convex subscription (not debounced -- Convex handles this efficiently)
- When a search query is active and returns no results, show: "No policies match your search"
- When no policies exist at all, show an empty state with the Logo and guidance text

**Empty State:**

```tsx
<div className="px-4 py-12 text-center">
  <Logo size={48} begin={0} repeatCount={2} />
  <h3 className="font-swarm text-xl font-bold mt-4 text-dark dark:text-light">
    No policies yet
  </h3>
  <p className="text-text-description text-sm mt-2 max-w-sm mx-auto">
    Policies are created by role holders. When a role publishes a policy,
    it will appear here for everyone to read.
  </p>
</div>
```

Note: There is no "Create policy" button in this view. Policies are created from the role context only, because every policy must be owned by a role. This avoids orphan policies and reinforces the role-ownership principle.

#### 2. Role-Level Policies View (Third Tab in Role Component)

Within the role component, policies appear as a third view alongside visual (SVG circle) and manage (form). This is where the role holder creates and edits their policies.

**PrismFlip Geometry Update for Roles:**

The role-level `PrismFlip` must change from `"coin"` (2 faces) to `"prism"` (3 faces):

```tsx
// Role view: now 3 faces (was coin, now prism)
<PrismFlip
  geometry="prism"
  activeFaceKey={flipClass}
  faces={[
    { key: "visual", content: <RoleVisualView ... /> },
    { key: "manage", content: <RoleManageView ... /> },
    { key: "policies", content: <RolePoliciesView roleId={focusTarget.roleId} /> },
  ]}
/>
```

**HeaderViewToggle at Role Focus:**

When the user has navigated into a role (focus.type === "role"), the toggle shows three tabs: visual, manage, policies. The policies tab replaces the absence of kanban (roles never had kanban).

**RolePoliciesView Layout:**

This view serves a dual purpose: reading (for everyone) and editing (for the role holder only). It follows the `RoleManageView` layout conventions: scrollable, `max-w-2xl mx-auto`, `pt-8 px-8 pb-8`.

```
+--------------------------------------------------+
| Policies for {Role Title}         [+ New policy]  |
| Managed by {Member Name}                          |
+--------------------------------------------------+
|                                                   |
| +----------------------------------------------+ |
| | POL-1  Data Retention Policy         [Edit]  | |
| | Defines how long member data is retained      | |
| | after a member leaves the organization.       | |
| | Issued Jan 15, 2026                           | |
| +----------------------------------------------+ |
| | POL-5  Annual Review Process         [Edit]  | |
| | Steps for conducting the yearly review of...  | |
| | Issued Feb 10, 2026                           | |
| +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

**Editable vs. Read-Only Indication:**

The permission boundary must be visible but not intrusive.

- **If the current user holds the role**: Show "New policy" button in the header and "Edit" links next to each policy. These use the established `text-highlight-hover dark:text-highlight hover:underline` pattern from `RoleManageView`.
- **If the current user does NOT hold the role**: The "New policy" button and "Edit" links simply do not render. No disabled states, no "you can't do this" messages. The absence of controls IS the signal. This follows our principle of removing elements rather than disabling them.

```tsx
// Editable indicator: only render controls when user is role holder
{isRoleHolder && (
  <button
    onClick={() => setShowCreateForm(true)}
    className="
      flex items-center gap-1.5
      px-3 py-1.5
      text-sm
      text-text-description
      hover:text-dark dark:hover:text-light
      hover:bg-surface-hover
      rounded-md
      transition-colors duration-75
      focus:outline-none focus:ring-2 focus:ring-highlight
    "
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
    <span>{t("policies.newPolicy")}</span>
  </button>
)}
```

### Policy Detail and Edit View

When a user clicks on a policy row (either in the orga-level list or the role-level list), the policy opens in a detail view. This is NOT a separate page or modal -- it replaces the list content within the same scrollable container, with a back arrow to return to the list.

**Detail View Layout:**

```
+--------------------------------------------------+
| <- Back to policies                               |
|                                                   |
| POL-3                                             |
| Onboarding Process                        [Edit]  |
|                                                   |
| Defines the steps for integrating new members     |
| into the organization, including orientation,     |
| role assignment, and mentoring period.             |
|                                                   |
| ------------------------------------------------- |
|                                                   |
| [Full markdown-rendered policy text here]         |
| Including headings, lists, images, links...       |
|                                                   |
| ------------------------------------------------- |
|                                                   |
| Issued: January 15, 2026                          |
| Owner: Secretary, Finance Team                    |
+--------------------------------------------------+
```

**Information hierarchy:**

1. **Prominent**: Policy number as a monospace badge, title as h1
2. **Clear**: Abstract as a full paragraph below the title (not truncated)
3. **Separated**: Full markdown text below a divider
4. **Tertiary**: Metadata (date, owner) at the bottom

**Edit Mode:**

When the role holder clicks "Edit", the detail view transitions to an edit form. This follows the in-place editing pattern established by `RoleManageView` (section-by-section editing with Save/Cancel buttons).

```tsx
// Policy edit form structure
<section className="mb-8">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold text-dark dark:text-light">
      {t("policies.title")}
    </h2>
  </div>
  <div className="bg-surface-primary border border-border-default rounded-lg p-4">
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      className="
        w-full px-3 py-2
        border border-border-strong
        rounded-lg
        bg-surface-primary
        text-dark dark:text-light
        focus:outline-none focus:ring-2 focus:ring-highlight
      "
      placeholder={t("policies.titlePlaceholder")}
    />
  </div>
</section>

<section className="mb-8">
  <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
    {t("policies.abstract")}
  </h2>
  <div className="bg-surface-primary border border-border-default rounded-lg p-4">
    <textarea
      value={abstract}
      onChange={(e) => setAbstract(e.target.value)}
      rows={3}
      className="
        w-full px-3 py-2
        border border-border-strong
        rounded-lg
        bg-surface-primary
        text-dark dark:text-light
        focus:outline-none focus:ring-2 focus:ring-highlight
        resize-none
      "
      placeholder={t("policies.abstractPlaceholder")}
    />
  </div>
</section>

<section className="mb-8">
  <h2 className="text-lg font-semibold mb-4 text-dark dark:text-light">
    {t("policies.text")}
  </h2>
  <div className="bg-surface-primary border border-border-default rounded-lg p-4">
    {/* Markdown editor with preview toggle */}
    <MarkdownEditor
      value={text}
      onChange={setText}
      placeholder={t("policies.textPlaceholder")}
    />
  </div>
</section>
```

**Markdown Editor:**

The text field uses a markdown editor with a write/preview toggle. This is a textarea for writing and a rendered markdown view for previewing. The toggle sits above the content area.

```
+--------------------------------------------------+
| [Write]  [Preview]                                |
+--------------------------------------------------+
| # Section heading                                 |
|                                                   |
| Policy text with **bold**, *italic*, and:         |
| - Bullet lists                                    |
| - [Links](https://...)                            |
| - ![Images](https://...)                          |
+--------------------------------------------------+
```

- Write mode: plain textarea with monospace font (`font-mono`)
- Preview mode: rendered markdown with standard prose styling
- The toggle uses the same tab pattern as the view toggle but at smaller scale
- No WYSIWYG toolbar -- markdown is the input format, keeping the interface pure and simple

### Policy Creation Flow

Creating a new policy follows this flow:

1. User is viewing the role-level policies tab
2. User clicks "New policy"
3. An empty edit form appears (replacing the list), with fields for title, abstract, and text
4. User fills in the fields and clicks "Publish"
5. The system assigns the next sequential policy number
6. The new policy appears in both the role's policy list and the org-level policy list
7. A notification is sent to all org members (category: Policy, priority: Normal)

**Create vs. Edit distinction:**

- Creating: Shows "Publish" button (primary action, `bg-highlight hover:bg-highlight-hover text-dark`)
- Editing: Shows "Save changes" button (same styling)
- Both show "Cancel" link (text-only, `text-text-description hover:text-gray-800`)

### Policy Deletion

Deleting a policy is a destructive action. Follow the established danger zone pattern from `RoleManageView`:

- Show a confirmation step: "Delete this policy?" with "Yes, delete" (red) and "Cancel" buttons
- The delete button only appears for the role holder
- After deletion, return to the policy list
- The policy number is NOT reused (POL-3 is retired forever if deleted)

### Policies and Role Transitions

When a role changes hands (member reassignment):

- All policies remain attached to the role
- The new role holder inherits edit/delete permissions
- The previous holder loses edit access immediately (real-time via Convex)
- No notification is needed for this -- the permission change is implicit in the role reassignment

When a role is deleted:

- Policies owned by the role should be transferred to the team's leader role
- This preserves institutional knowledge
- A decision audit entry should record the transfer

### Policies Anti-Patterns

| Anti-Pattern | Why It Is Wrong | Better Approach |
|--------------|-----------------|-----------------|
| "Create policy" button in the org list | Policies without role ownership are orphans | Only create from role context |
| Disabling edit buttons for non-holders | Disabled controls create confusion and frustration | Simply do not render the controls |
| Inline editing in the list view | Policy text is rich and complex | Navigate to detail view for editing |
| Version history in the UI | Adds complexity without clear user need | Rely on decision journal for audit trail |
| Separate policies page/route | Breaks the spatial navigation model | Policies live within the existing view toggle |
| WYSIWYG rich text editor | Complex, bloated, inconsistent output | Markdown with write/preview toggle |
| Policy numbers as editable fields | Users will create conflicting or vanity numbers | Auto-increment, system-managed only |

### Accessibility for Policies

1. **Policy List**: Use `role="list"` with `role="listitem"` for each policy row
2. **Policy Number**: Announced as part of the item label (e.g., `aria-label="Policy 3: Onboarding Process"`)
3. **Search**: The search input has a descriptive `aria-label="Search policies by title or abstract"`
4. **Edit Controls**: Clearly labeled with `aria-label="Edit policy"` and `aria-label="Delete policy"`
5. **Markdown Preview**: The preview area uses `role="document"` with appropriate heading structure
6. **Back Navigation**: The back arrow uses `aria-label="Back to policies list"`

### Policies Checklist Before Shipping

- [ ] Policies tab visible at orga level in the HeaderViewToggle?
- [ ] Policies tab visible at role level in the HeaderViewToggle?
- [ ] Policies tab hidden at team and member focus levels?
- [ ] PrismFlip geometry updated (coin to prism) for orga and role?
- [ ] V key cycling includes policies at orga level?
- [ ] P key shortcut works for policies view?
- [ ] Policy list shows number, title, abstract, owning role, date?
- [ ] Search filters policies by title and abstract?
- [ ] Empty state shows Logo and guidance text?
- [ ] Edit controls only appear for the role holder?
- [ ] Non-holders see a clean read-only view (no disabled buttons)?
- [ ] Policy detail view renders markdown correctly?
- [ ] Markdown editor has write/preview toggle?
- [ ] Policy creation assigns automatic sequential number?
- [ ] Policy deletion uses confirmation pattern (not modal)?
- [ ] All interactive elements are keyboard accessible?
- [ ] Screen reader labels are meaningful for policy content?

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
- [ ] Policies view mode integrated into HeaderViewToggle?
- [ ] Policy edit controls visible only to role holder?
- [ ] Policy search works on title and abstract?

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
| 2026-02-20 | 1.3.0 | Added comprehensive Policies section with org-level and role-level UX patterns |
| 2026-02-07 | 1.2.0 | Added language guidelines section - "hierarchy" reserved for external systems |
| 2026-02-06 | 1.1.0 | Added comprehensive notification patterns section |
| 2026-02-02 | 1.0.0 | Initial UX principles established |

---

*This document should be updated whenever UX decisions are made. For questions not covered here, consult the [Brand Guidelines](./BRAND.md) or the [Notion source](https://swarmrise.notion.site/Brand-d76506305ac54afd80dd6cd41dc59d61).*
