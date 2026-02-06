# Notifications - UX Design Specification

This document defines the user experience for the notification system in Swarmrise, with specific focus on the invitation notification flow.

---

## Overview

The notification system enables users to:
1. See when events require their attention
2. Navigate directly to relevant actions from notifications
3. Manage notification state (read, archive, dismiss)
4. Handle actionable items (accept/decline invitations) inline

---

## Design Principles Applied

Following the three pillars from UX_PRINCIPLES.md:

### Full Reactivity
- Notifications appear instantly via Convex real-time subscriptions
- Badge count updates without polling
- Actions (accept, mark as read) reflect immediately across all tabs
- Panel updates live as new notifications arrive

### Pure Simplicity
- Single click to open notification panel
- Clear primary action for each notification type
- No nested menus or complex navigation
- Minimal visual chrome, maximum information density

### Clarity Over Cleverness
- Icon + text for each notification category (no icon-only)
- Relative timestamps ("2h ago") not absolute
- Actions labeled explicitly ("Accept", "Decline")
- Unread state is obvious but not alarming

---

## Component Architecture

```
Header
  |__ NotificationBell (trigger + badge)
        |__ NotificationPanel (dropdown)
              |__ NotificationItem (per notification)
                    |__ InvitationActions (for invitation type)
                    |__ RoleAssignmentActions (for role type)
                    |__ PolicyLink (for policy type)
                    |__ SystemMessage (for system type)
```

---

## States

### 1. No Notifications

When the user has no active notifications.

**Display**: Bell icon without badge
**Interaction**: Clicking opens empty panel with friendly message

```tsx
<div className="px-4 py-8 text-center">
  <BellOffIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
  <p className="text-gray-500">No notifications</p>
</div>
```

---

### 2. Unread Notifications Present

When user has one or more unread notifications.

**Display**: Bell icon with gold badge showing count
**Badge behavior**:
- Shows exact count for 1-9
- Shows "9+" for 10 or more
- Uses brand gold (#eac840) for visibility

```tsx
// Badge component
<span
  className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center
    text-xs font-bold bg-[#eac840] text-dark rounded-full px-1.5
    ring-2 ring-white dark:ring-dark"
>
  {count > 9 ? "9+" : count}
</span>
```

---

### 3. Panel Open - With Notifications

Notification panel is displayed with active items.

**Structure**:

```
+--------------------------------------+
| Notifications           [Mark all read] |
+--------------------------------------+
| [Unread indicator dot]                   |
| [Mail] Invitation to Acme Corp        |
|        Invited by john@example.com    |
|        [Accept] [Decline]        2h    |
+--------------------------------------+
| [Badge] New role: Secretary           |
|         Finance Team                  |
|         [View Role]              1d    |
+--------------------------------------+
| [Doc] New policy published            |
|       Remote Work Guidelines          |
|       [Read]                     3d    |
+--------------------------------------+
```

---

### 4. Panel Open - Mixed Read/Unread

Visual distinction between read and unread notifications.

**Unread styling**:
- Subtle blue background tint
- Bolder text weight
- Small dot indicator on left

**Read styling**:
- No background tint
- Normal text weight
- No dot indicator

```tsx
// Unread indicator
className={`
  px-4 py-3 relative
  ${!notification.isRead
    ? "bg-blue-50/50 dark:bg-blue-900/10"
    : ""}
`}

// Left dot for unread
{!notification.isRead && (
  <div className="absolute left-1.5 top-1/2 -translate-y-1/2
    w-2 h-2 rounded-full bg-[#eac840]"
  />
)}
```

---

## Notification Types

### 1. Invitation Notification

**When created**: User is invited to an organization
**Priority**: High
**Actions**: Accept, Decline

**Content**:
- Title: "Invitation to {orgaName}"
- Subtitle: "Invited by {inviterName}"
- Actions: Accept (primary gold), Decline (secondary outline)

**Behavior**:
- Accept: User joins org, notification removed, org selected
- Decline: Invitation rejected, notification removed
- Click elsewhere: Opens organization preview (future)

```tsx
const InvitationNotificationItem = ({
  notification,
  onAccept,
  onDecline
}: InvitationNotificationItemProps) => {
  const { invitationId, orgaName, inviterName } = notification.payload;
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(invitationId);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3">
        <MailIcon className="w-5 h-5 text-[#eac840] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-dark dark:text-light">
            Invitation to {orgaName}
          </p>
          <p className="text-sm text-gray-500 truncate">
            Invited by {inviterName}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm font-medium
                bg-[#eac840] hover:bg-[#d4af37] disabled:opacity-50
                text-dark rounded transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(invitationId)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm
                border border-gray-300 dark:border-gray-600
                text-gray-600 dark:text-gray-400
                hover:border-gray-400 dark:hover:border-gray-500
                rounded transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatRelativeTime(notification._creationTime)}
        </span>
      </div>
    </div>
  );
};
```

---

### 2. Role Assignment Notification

**When created**: User is assigned to a role
**Priority**: Normal
**Actions**: View Role

**Content**:
- Title: "Assigned to {roleTitle}"
- Subtitle: "{teamName}"
- Actions: View Role (navigates to role)

**Behavior**:
- View Role: Navigate to role view, mark as read

---

### 3. Policy Notification

**When created**: New policy affects user (org-wide or team)
**Priority**: Normal
**Actions**: Read

**Content**:
- Title: "New policy: {policyTitle}"
- Subtitle: "{orgaName}" or "{teamName}"
- Actions: Read (opens policy)

**Behavior**:
- Read: Navigate to policy, mark as read

---

### 4. System Notification

**When created**: System announcements, maintenance notices
**Priority**: Varies
**Actions**: Dismiss or Learn More

**Content**:
- Title: "{title}"
- Subtitle: "{message}"
- Actions: Dismiss, Learn More (if link provided)

---

## Header Integration

### Notification Bell Position

The notification bell sits in the header utility cluster, left of the user avatar.

```
+---------------------------------------------------------------+
| [Logo] swarmrise    [OrgaSelector]      [Lang][Theme][Bell][User] |
+---------------------------------------------------------------+
```

### Bell Component

```tsx
const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = useQuery(api.notifications.functions.getUnreadCount);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840]"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4
              flex items-center justify-center text-xs font-bold
              bg-[#eac840] text-dark rounded-full px-1
              ring-2 ring-white dark:ring-dark"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
    </div>
  );
};
```

---

## Panel Design

### Panel Dimensions

- **Width**: 320px (w-80)
- **Max Height**: 384px (max-h-96) with scroll
- **Position**: Anchored to bell, right-aligned

### Panel Structure

```tsx
const NotificationPanel = ({ onClose }: { onClose: () => void }) => {
  const notifications = useQuery(api.notifications.functions.getActive);
  const markAllAsRead = useMutation(api.notifications.functions.markAllAsRead);

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 max-h-96
        bg-white dark:bg-gray-800 rounded-lg shadow-xl
        border border-gray-200 dark:border-gray-700 z-50
        overflow-hidden"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
        border-b border-gray-100 dark:border-gray-700 sticky top-0
        bg-white dark:bg-gray-800">
        <h2 className="font-bold text-dark dark:text-light text-sm">
          Notifications
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead({})}
            className="text-xs text-gray-500 hover:text-gray-700
              dark:hover:text-gray-300 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto max-h-80 divide-y
        divide-gray-100 dark:divide-gray-700">
        {notifications?.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            onClose={onClose}
          />
        ))}

        {/* Empty state */}
        {notifications?.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500 text-sm">No notifications</p>
          </div>
        )}

        {/* Loading state */}
        {notifications === undefined && (
          <div className="px-4 py-8 flex justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300
              border-t-[#eac840] rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Open panel (when bell focused) |
| Escape | Close panel |
| Tab | Move between notification items |
| Enter | Activate primary action of focused notification |
| Arrow Down | Move to next notification |
| Arrow Up | Move to previous notification |

### Focus Management

```tsx
// When panel opens, focus first notification or close button
useEffect(() => {
  if (isOpen) {
    const firstItem = panelRef.current?.querySelector("[role='listitem'] button");
    (firstItem as HTMLElement)?.focus();
  }
}, [isOpen]);

// Return focus to bell when panel closes
const handleClose = () => {
  setIsOpen(false);
  bellButtonRef.current?.focus();
};
```

---

## Screen Reader Support

### ARIA Structure

```tsx
// Bell button
<button
  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
  aria-expanded={isOpen}
  aria-haspopup="dialog"
  aria-controls="notification-panel"
>

// Panel
<div
  id="notification-panel"
  role="dialog"
  aria-label="Notifications"
  aria-describedby="notification-panel-description"
>
  <p id="notification-panel-description" className="sr-only">
    {unreadCount} unread notifications. Use arrow keys to navigate.
  </p>

  // Notification list
  <div role="list" aria-label="Notification list">
    <div role="listitem" aria-label="Invitation to Acme Corp, 2 hours ago">
      ...
    </div>
  </div>
</div>
```

### Live Announcements

```tsx
// Announce new notifications
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {newNotification && (
    <span>New notification: {newNotification.payload.title}</span>
  )}
</div>
```

---

## Invitation Flow (End-to-End)

### Step 1: Invitation Created

**Backend**: `createInvitation` mutation in `convex/invitations/functions.ts`
- Creates invitation record
- Creates notification for invitee (if they have a user account)
- Notification includes: invitationId, orgaName, inviterName

```typescript
// Notification payload
{
  category: "invitation",
  invitationId: invitationId,
  orgaName: orga.name,
  inviterName: `${member.firstname} ${member.surname}`
}
```

### Step 2: Notification Delivered

**Frontend**: Real-time update via Convex subscription
- Badge count increments
- If panel is open, new notification appears at top

### Step 3: User Opens Panel

**Frontend**: User clicks bell
- Panel shows all active notifications
- Invitation notification is visible with Accept/Decline actions

### Step 4a: User Accepts

**Frontend**:
1. User clicks Accept
2. Button shows loading state
3. `acceptInvitation` mutation called
4. On success:
   - User added to organization
   - Notification deleted (via groupKey cleanup)
   - Organization selected in OrgaStore
   - Panel closes
   - User sees new organization

**Backend**:
- Invitation status updated to "accepted"
- User's orgaIds array updated
- Member record created
- Notification deleted via `deleteByGroupKey`

### Step 4b: User Declines

**Frontend**:
1. User clicks Decline
2. Button shows loading state
3. `rejectInvitation` mutation called
4. On success:
   - Notification removed from list
   - User remains in current context

**Backend**:
- Invitation status updated to "rejected"
- Notification deleted via `deleteByGroupKey`

### Step 5: User Closes Panel

**Frontend**: Click outside or Escape key
- Panel closes
- Focus returns to bell button
- Remaining notifications persist

---

## Data Flow

### Queries Used

```typescript
// Get unread count for badge
api.notifications.functions.getUnreadCount

// Get all active (non-archived) notifications for panel
api.notifications.functions.getActive

// Get single notification details (if needed)
api.notifications.functions.getById
```

### Mutations Used

```typescript
// Mark single notification as read
api.notifications.functions.markAsRead

// Mark all as read
api.notifications.functions.markAllAsRead

// Archive a notification
api.notifications.functions.archive

// For invitation-specific actions
api.users.functions.acceptInvitation
api.users.functions.rejectInvitation
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Invitation cancelled while panel open | Notification disappears (real-time update) |
| User already accepted in another tab | Notification disappears, org appears in selector |
| Network error on accept | Show error toast, button returns to enabled |
| Very long org/inviter name | Truncate with ellipsis |
| 50+ notifications | Scroll within panel, consider pagination for archive view |
| User not signed in | Bell not shown in header |

---

## Mobile Considerations

### Touch Targets

All interactive elements meet 44x44px minimum:

```tsx
// Bell button padding ensures touch target
className="p-2" // 40px icon + 8px padding each side = 56px total

// Action buttons in notifications
className="px-3 py-2" // Adequate touch area
```

### Panel Behavior on Mobile

- Full-width on screens < 400px
- Max-height respects safe area
- Swipe down to dismiss (future enhancement)

```tsx
className="w-80 max-w-[calc(100vw-2rem)]"
```

---

## Performance Considerations

### Query Optimization

- Use `getUnreadCount` for badge (lightweight query)
- Only fetch full notifications when panel opens
- Limit to 50 active notifications in panel

### Subscription Management

- Single subscription for unread count (always active when signed in)
- Panel notifications subscription only when panel is open

```tsx
// Badge subscription (always on)
const unreadCount = useQuery(api.notifications.functions.getUnreadCount);

// Panel subscription (conditional)
const notifications = useQuery(
  isOpen ? api.notifications.functions.getActive : skipToken
);
```

---

## Testing Checklist

### Functionality
- [ ] Bell shows correct unread count
- [ ] Panel opens on click
- [ ] Panel closes on outside click
- [ ] Panel closes on Escape key
- [ ] Accept invitation adds user to org
- [ ] Decline invitation removes notification
- [ ] Mark as read updates notification state
- [ ] Mark all as read clears unread count
- [ ] New notifications appear in real-time

### Accessibility
- [ ] Bell has correct aria-label with count
- [ ] Panel has role="dialog"
- [ ] Notifications are keyboard navigable
- [ ] Focus management is correct
- [ ] Screen reader announces new notifications

### Edge Cases
- [ ] Empty state shown when no notifications
- [ ] Loading state shown briefly
- [ ] Long text truncates properly
- [ ] Error states handled gracefully
- [ ] Concurrent actions in multiple tabs

### Visual
- [ ] Unread indicator is visible but not alarming
- [ ] Dark mode styling is correct
- [ ] Badge count is readable
- [ ] Panel shadow provides depth
- [ ] Transitions feel smooth

---

## Implementation Order

### Phase 1: Core Components

1. Create `NotificationBell` component
2. Create `NotificationPanel` component
3. Create `NotificationItem` component with category variants
4. Integrate bell into Header

**Deliverable**: Users can see and manage notifications

### Phase 2: Invitation Integration

1. Add invitation-specific actions to NotificationItem
2. Wire up accept/decline mutations
3. Add org selection after accept
4. Test end-to-end invitation flow

**Deliverable**: Full invitation notification workflow

### Phase 3: Polish

1. Add keyboard navigation
2. Add screen reader announcements
3. Add mobile optimizations
4. Add loading and error states

**Deliverable**: Production-ready notification system

### Phase 4: Future Enhancements

1. Notification preferences UI
2. Archive/history view
3. Swipe gestures on mobile
4. Push notifications (browser)

---

## Visual Reference

### Colors

```
Badge background:     #eac840 (Bee Gold)
Unread tint:          blue-50/50 (light), blue-900/10 (dark)
Panel background:     white (light), gray-800 (dark)
Panel border:         gray-200 (light), gray-700 (dark)
Text primary:         dark (light), light (dark)
Text secondary:       gray-500 (light), gray-400 (dark)
Timestamp:            gray-400
```

### Icon Mapping

| Category | Icon | Color |
|----------|------|-------|
| Invitation | MailIcon / EnvelopeIcon | #eac840 |
| Role Assignment | BadgeIcon / UserIcon | #a2dbed |
| Policy | DocumentIcon | gray-500 |
| System | BellIcon / InfoIcon | gray-500 |

---

*Last updated: 2026-02-06*
