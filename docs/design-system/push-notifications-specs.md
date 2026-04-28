# Push Notification UI Specifications

**Track 2 - Team C: Push Notification UI**
**Designer**: senior-designer
**Date**: 2025-04-27
**Status**: ✅ Complete - Ready for Implementation
**Design System**: AIVO Design System v1.0

---

## 📦 Overview

This document specifies the UI for push notifications and in-app notification center in the AIVO fitness platform. It covers:

- **Push Notifications**: System notifications that appear on device
- **In-App Notification Center**: Dedicated screen for viewing all notifications
- **Notification Settings**: User preferences for notification types
- **Notification Types**: Workout reminders, achievements, social interactions, club events, AI insights

All designs follow the AIVO Design System v1.0 with dark-first theme, semantic tokens, and WCAG 2.1 AA compliance.

---

## 🔔 Notification Types

### Priority Levels

| Priority | Use Case | Color | Sound |
|----------|----------|-------|-------|
| **Urgent** | Health alerts, critical errors | `error` | Yes, repeat |
| **High** | Workout reminders, friend requests | `primary` | Yes, once |
| **Medium** | Achievement unlocked, club activity | `success` | Optional |
| **Low** | Weekly summaries, tips, promotions | `tertiary` | No |

### Notification Categories

1. **Workout** (High): Reminders, workout ready, completion
2. **Achievement** (Medium): Badge unlocked, level up, streak milestone
3. **Social** (Medium): Friend request, comment, like, follow
4. **Club** (Medium): Event reminder, club announcement
5. **AI Insight** (Low): Personalized recommendation, analysis ready
6. **System** (Variable): Maintenance, security alert

---

## 📱 Push Notification UI

### Mobile Push Banner

**Layout** (System notification shade):
```
┌─────────────────────────────────────┐
│ [App Icon]  AIVO                    │
│            Workout Reminder         │
│            Your Upper Body workout  │
│            is scheduled for 6:00 PM │
│                                     │
│ [Dismiss]  [View]                   │
└─────────────────────────────────────┘
```

**Design Specs**:
- Uses native system notification UI
- **App Icon**: 48×48px AIVO logo with primary gradient
- **Title**: `text-base font-bold` (system font)
- **Body**: `text-sm`
- **Actions**: System-provided buttons (Dismiss, View)
- **No custom styling** - follows OS conventions

### Web Push Notification

**Layout** (Browser notification):
```
┌─────────────────────────────────────┐
│ 🔔 AIVO                             │
│                                     │
│  Workout Reminder                   │
│  Your Upper Body workout is         │
│  scheduled for 6:00 PM              │
│                                     │
│  [Dismiss]  [Open App]             │
└─────────────────────────────────────┘
```

**Design Specs**:
- Browser renders with OS styling
- Icon + title + body text
- Action buttons (2 max)
- Position: top-right or bottom-right

---

## 📲 In-App Notification Center

### Notification Page Layout

**Mobile**:
```
┌─────────────────────────────────────┐
│  Notifications  [Settings Btn]      │
├─────────────────────────────────────┤
│  ┌─ Tabs [All|Unread|Mentions] ───┐│
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Notification Item ─────────────┐│
│  │ [Icon] [Badge] [Content]        ││
│  │          [Time] [Unread Dot]    ││
│  └──────────────────────────────────┘│
│  ┌─ Notification Item ─────────────┐│
│  │ [Icon] [Badge] [Content]        ││
│  │          [Time]                 ││
│  └──────────────────────────────────┘│
│  ...                                │
│                                     │
│  [Mark All Read]                    │
└─────────────────────────────────────┘
```

**Tablet/Desktop** (Sidebar or split view):
```
┌─────────────┬─────────────────────────┐
│  Filters    │  Notification Feed     │
│             │                         │
│  ☐ All      │  ┌─ Item (unread) ───┐ │
│  ☑ Unread   │  │ Icon Badge         │ │
│  ☐ Mentions │  │ Content            │ │
│  ☐ Social   │  │ Time  •  Actions   │ │
│  ☐ Workouts │  └────────────────────┘ │
│  ☐ Achievements│  ┌─ Item ───────────┐│
│  ☐ Clubs    │  │ Icon Badge         ││
│  ☐ AI       │  │ Content            ││
│             │  │ Time               ││
│  [Settings] │  └────────────────────┘│
└─────────────┴─────────────────────────┘
```

### Notification Item Component

**Layout**:
```
┌─────────────────────────────────────────┐
│ [Icon:16px] [Badge:24px] [Content]     │
│                           [Time] [Dots] │
│                                         │
│  Additional context line (optional)    │
│  [Action Button] [Dismiss Button]      │
└─────────────────────────────────────────┘
```

**Design Specs**:
- **Container**: `flex-row gap-3 p-4 border-b border-border-secondary`
  - Unread: `bg-primary-500/5` background tint
  - Read: transparent
- **Icon**: `size=16` (category-specific color)
  - Workout: `Dumbbell` (primary)
  - Achievement: `Trophy` (warning)
  - Social: `Users` (success)
  - Club: `UsersRound` (secondary)
  - AI: `Brain` (purple)
  - System: `Bell` (tertiary)
- **Badge** (if notification has data):
  - Small: `size="sm" variant="secondary"`
  - Content: `"New"`, `"3 friends"`, `"5 events"`
- **Content** (flex-1):
  - Title: `text-sm font-medium text-text-primary`
  - Description: `text-sm text-text-secondary` (line-clamp-2)
  - Timestamp: `text-xs text-text-tertiary`
- **Actions**:
  - Unread indicator: `w-2 h-2 rounded-full bg-primary-500` (dot)
  - Time: `text-xs text-text-tertiary`
  - Dots menu: `size=16` icon for overflow actions
- **Action Buttons** (if inline actions):
  - Primary: `size="sm" variant="primary"`
  - Secondary: `size="sm" variant="ghost"`
  - Stacked below content with `flex-row gap-2 mt-2`

**States**:
- Unread: background tint + unread dot + `font-medium` title
- Read: no tint, unread dot absent, `font-normal` title
- Hover (web): `bg-surface-hover`
- Pressed (mobile): `bg-surface-active`

---

## 🎛️ Notification Settings

### Settings Page Layout

**Mobile**:
```
┌─────────────────────────────────────┐
│  Notification Settings              │
├─────────────────────────────────────┤
│  ┌─ Push Notifications Card ───────┐│
│  │ ☑ Push Enabled                 ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Workouts Section ──────────────┐│
│  │ ☑ Workout Reminders            ││
│  │   24h before                   ││
│  │ ☑ Workout Completion           ││
│  │   When finished                ││
│  │ ⚪ Workout Suggestions         ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Achievements Section ──────────┐│
│  │ ☑ Badge Unlocked               ││
│  │ ☑ Level Up                     ││
│  │ ☑ Streak Milestone             ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Social Section ────────────────┐│
│  │ ☑ Friend Requests              ││
│  │ ☑ Comments & Likes             ││
│  │ ☑ Club Activity                ││
│  │ ☑ Direct Messages              ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ AI Insights Section ───────────┐│
│  │ ⚪ Daily Summary               ││
│  │ ⚪ Weekly Report               ││
│  │ ☑ New Insights                 ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ System Section ────────────────┐│
│  │ ☑ Security Alerts              ││
│  │ ☑ App Updates                  ││
│  │ ⚪ Marketing                   ││
│  └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Settings Component Specs**:
- **Layout**: Single-column with section cards
- **Section Card**: `variant="outlined"` with `padding="md"` and `mb-4`
  - Title: `text-base font-semibold mb-3`
  - Divider: `border-b border-border-secondary` (only if multiple toggles)
- **Toggle Switch**: Custom component with:
  - Track: `w-11 h-6 bg-gray-700 rounded-full`
  - Thumb: `w-5 h-5 bg-white rounded-full translate-x-0.5` (checked: `translate-x-5`)
  - Color: `bg-primary-500` when checked
  - Accessibility: `role="switch"`, `aria-checked`, keyboard support
- **Sub-options** (indented `pl-4 mt-2 space-y-2` when parent enabled):
  - Each: `flex-row justify-between items-center py-2`
  - Label: `text-sm text-text-secondary`
  - Additional info: `text-xs text-text-tertiary` below label
- **Disabled**: `opacity-50 pointer-events-none`

### Quiet Hours Settings

**Layout** (additional section):
```
┌─────────────────────────────────────┐
│  Quiet Hours                        │
│  ┌─[Toggle: Enabled]───────────────┐│
│  │ From: [10:00 PM]  To: [6:00 AM] ││
│  │   (Notifications silenced)      ││
│  └──────────────────────────────────┘│
│                                     │
│  ☑ Allow Urgent Only               ││
│    Only security alerts will break ││
│  ─────────────────────────────────  ││
│  [Manage Do Not Disturb]           ││
│  (links to OS settings)            ││
└─────────────────────────────────────┘
```

---

## 🎨 Notification Components

### NotificationItem Component

```typescript
interface NotificationItemProps {
  id: string;
  type: 'workout' | 'achievement' | 'social' | 'club' | 'ai' | 'system';
  title: string;
  description: string;
  timestamp: Date | string;
  isRead: boolean;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
  };
  icon?: ReactNode; // Optional, defaults by type
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary';
    onPress: () => void;
  }>;
  onDismiss?: () => void;
  onPress?: () => void;
}
```

**Usage**:
```tsx
<NotificationItem
  type="achievement"
  title="Badge Unlocked!"
  description="You earned the '10K Steps' badge"
  timestamp={new Date()}
  isRead={false}
  badge={{ text: 'New', variant: 'success' }}
  actions={[
    { label: 'View Badge', variant: 'primary', onPress: handleView },
    { label: 'Dismiss', variant: 'ghost', onPress: handleDismiss }
  ]/>
```

### NotificationList Component

```typescript
interface NotificationListProps {
  notifications: NotificationItemProps[];
  filter?: 'all' | 'unread' | 'mentions';
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onMarkAllRead?: () => void;
}
```

**Features**:
- Pull-to-refresh (mobile)
- Infinite scroll with "Load More"
- Swipe-to-dismiss (mobile)
- Long-press for batch actions
- Empty state with `EmptyState` component

### NotificationSettings Component

```typescript
interface NotificationSettingsProps {
  settings: {
    pushEnabled: boolean;
    categories: {
      workouts: { reminders: boolean; completion: boolean; suggestions: boolean };
      achievements: { badge: boolean; level: boolean; streak: boolean };
      social: { requests: boolean; interactions: boolean; club: boolean; messages: boolean };
      ai: { daily: boolean; weekly: boolean; insights: boolean };
      system: { security: boolean; updates: boolean; marketing: boolean };
    };
    quietHours: { enabled: boolean; start: string; end: string; urgentOnly: boolean };
  };
  onChange: (settings: NotificationSettings) => void;
}
```

---

## 🎨 Design Tokens & Styling

### Notification-Specific Colors

| Element | Token | Hex |
|---------|-------|-----|
| Unread indicator | `bg-primary-500` | #3b82f6 |
| Workout icon | `text-primary-400` | #60a5fa |
| Achievement icon | `text-warning-500` | #f59e0b |
| Social icon | `text-success-500` | #10b981 |
| Club icon | `text-secondary-400` | #94a3b8 |
| AI icon | `#8b5cf6` (purple-500) | #8b5cf6 |
| System icon | `text-tertiary-400` | #94a3b8 |
| Urgent tint | `bg-error-500/10` | rgba(239, 68, 68, 0.1) |

### Badge Variants

```typescript
// Notification badge (small label)
<Badge size="sm" variant="secondary">New</Badge>
<Badge size="sm" variant="success">3 friends</Badge>
<Badge size="sm" variant="warning">5 events</Badge>
<Badge size="sm" variant="default">Important</Badge>
```

### Time Formatting

- **Today**: "10:30 AM" (12h) or "10:30" (24h)
- **Yesterday**: "Yesterday" (localized)
- **This Week**: "Monday", "Tuesday", etc.
- **Older**: "Apr 20" or "Apr 20, 2025"
- Relative fallback: "2 hours ago", "3 days ago" if under 7 days

---

## 📱 Platform Differences

### Mobile (React Native)

**Features**:
- Full-screen notification center accessible via tab or drawer
- Swipe-to-dismiss and swipe-to-actions
- Pull-to-refresh
- Local notifications via Expo Notifications
- Deep linking from notifications
- Native settings integration (opens OS settings for permissions)

**Components**:
- Use `FlashList` for performance with many items
- `react-native-gesture-handler` for swipe actions
- `expo-notifications` for scheduling/display

### Web (Next.js)

**Features**:
- Notification bell icon in header with unread count badge
- Dropdown panel (max 10 items) + "View All" link
- Dedicated `/notifications` page with full feed
- Web Push API for browser notifications
- Service Worker for background handling

**Components**:
- Dropdown with `@radix-ui/react-dropdown-menu`
- Virtual list for large feeds (react-virtual)
- Server-sent events (SSE) or WebSocket for real-time updates

---

## 🔔 Push Notification Triggers

### API Endpoints

**Send Notification**:
```typescript
POST /api/notifications/send
{
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  push?: boolean;
  inApp?: boolean;
}
```

**Batch Send** (for clubs/events):
```typescript
POST /api/notifications/broadcast
{
  clubId?: string;
  eventId?: string;
  type: string;
  title: string;
  body: string;
  excludeUserIds?: string[];
}
```

**User Preferences**:
```typescript
GET /api/notifications/preferences → returns settings
PUT /api/notifications/preferences → update settings
```

**Mark as Read**:
```typescript
POST /api/notifications/:id/read
POST /api/notifications/read-all
```

---

## 🎯 Notification Scenarios

### Workout Reminder

**Push** (24h before):
- Title: "Workout Reminder"
- Body: "Your Upper Body workout is scheduled for tomorrow at 6:00 PM"
- Priority: High
- Sound: Default
- Data: `{ type: 'workout', workoutId: '123', action: 'view' }`

**In-App** (at scheduled time):
- Type: `workout`
- Title: "Time to train!"
- Description: "Your Upper Body workout starts now"
- Badge: `"Scheduled"` (secondary)
- Actions: `["Start Workout", "Snooze 30m"]`

**Completion** (after workout marked done):
- Type: `workout`
- Title: "Workout Complete! 🎉"
- Description: "Great job! You burned ~350 calories"
- Badge: `"+250 pts"` (success)
- Actions: `["View Stats", "Share"]`

### Achievement Unlocked

**Push** (if enabled):
- Title: "Achievement Unlocked!"
- Body: "You earned the '10K Steps' badge"
- Priority: Medium
- Sound: Celebration chime
- Data: `{ type: 'achievement', badgeId: 'steps_10k', action: 'view' }`

**In-App**:
- Type: `achievement`
- Icon: Trophy (gold)
- Title: "🏆 Badge Unlocked!"
- Description: "10K Steps - Complete 10,000 steps in a single day"
- Badge: `"New"` (success)
- Actions: `["View Badge", "Share"]`
- Unread tint: `bg-warning-500/10`

### Social Interaction (Friend Request)

**Push**:
- Title: "New Friend Request"
- Body: "Sarah Mitchell wants to connect with you"
- Priority: High
- Data: `{ type: 'social', socialType: 'friend_request', userId: '456', action: 'view' }`

**In-App**:
- Type: `social`
- Icon: Users (green)
- Title: "Friend Request"
- Description: "Sarah Mitchell wants to connect with you"
- Time: "2 min ago"
- Badge: `"New"` (success)
- Actions: `["Accept", "Decline"]`

### Club Event

**Push** (reminder 1h before):
- Title: "Club Event Starting Soon"
- Body: "Morning Run starts at 7:00 AM at Charles River Path"
- Priority: Medium
- Data: `{ type: 'club', eventId: '789', action: 'view' }`

**In-App**:
- Type: `club`
- Icon: UsersRound (gray)
- Title: "Event Reminder"
- Description: "Morning Run • Charles River Path • 7:00 AM"
- Badge: `"5 going"` (secondary)
- Actions: `["Join", "Details"]`

---

## 📊 Empty States

### No Notifications

```
┌─────────────────────────────────────┐
│        [Bell Icon: 64px]            │
│         No notifications             │
│         You're all caught up!       │
│                                     │
│   [Check Back Later]                │
└─────────────────────────────────────┘
```

- Icon: `size=64`, `text-gray-600`
- Title: `text-lg font-medium mb-2`
- Description: `text-text-secondary text-center mb-4`
- Button: `variant="outline"`

### Empty Filter Results

```
┌─────────────────────────────────────┐
│  No unread notifications            │
│  Great job staying on top of things!│
│                                     │
│  [View All Notifications]           │
└─────────────────────────────────────┘
```

---

## ♿ Accessibility Considerations

### Screen Reader

- Notification type announced: "Workout reminder notification"
- Unread status: "unread" in label
- Time relative: "2 hours ago" (localized)
- Actions: "Double-tap to Accept" or "Double-tap to Dismiss"

### VoiceOver/TalkBack Labels

```typescript
accessibilityLabel={`${type} notification: ${title}. ${description}. ${time}`}
accessibilityRole="alert" // for urgent/high priority
accessibilityState={{ read: isRead }}
```

### Keyboard Navigation (Web)

- Notification items: focusable via Tab
- Action buttons: separate tab stops
- Keyboard shortcuts:
  - `J/K` to navigate items
  - `Enter` to open
  - `D` to dismiss current
  - `Shift+A` to mark all read

### Touch Targets (Mobile)

- All buttons ≥ 44×44pt
- Notification item full-width touch target
- Action buttons separated with `gap-2` to prevent mis-tap

---

## 📦 Component API Reference

### NotificationItem

```typescript
interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date | string;
  isRead: boolean;
  badge?: { text: string; variant?: BadgeVariant };
  actions?: ActionButtonProps[];
  onDismiss?: () => void;
  onPress?: () => void;
  onMarkRead?: () => void;
}
```

### NotificationList

```typescript
interface NotificationListProps {
  notifications: NotificationItemProps[];
  filter?: 'all' | 'unread' | 'mentions';
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onNotificationPress?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
}
```

### NotificationSettings

```typescript
interface NotificationSettingsProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
  showQuietHours?: boolean;
  showPushToggle?: boolean;
}
```

---

## 🔄 Real-Time Updates

### WebSocket Events

```typescript
// New notification arrives
{
  event: 'notification:new';
  data: { notification: Notification };
}

// Notifications read
{
  event: 'notification:read';
  data: { notificationIds: string[] };
}

// Settings changed
{
  event: 'notification:settings_updated';
  data: { settings: NotificationSettings };
}
```

### Polling Fallback

If WebSocket unavailable:
- Poll `GET /api/notifications/unread-count` every 30s
- SSE endpoint: `GET /api/notifications/stream`

---

## 🎨 Animations

### Entry Animations

**New Notification** (in-app feed):
- Fade in + slide from right (mobile)
- Fade in + expand (web)
- Duration: 300ms ease-out
- Stagger: 50ms delay per item

**Badge Pulse** (unread count):
- Scale up to 1.2 → scale down to 1.0
- Duration: 200ms
- Repeat: every 2s while > 0

**Settings Toggle**:
- Thumb: `translateX` slide
- Track: background color crossfade
- Spring animation (iOS: 0.3s with 0.8 damping)

---

## 📱 Page Structure

### Notification Center Page (Mobile)

```
┌─────────────────────────────────────┐
│  [Back]  Notifications   [🔔 5]    │
├─────────────────────────────────────┤
│  ┌─ Filter Pills ─────────────────┐│
│  │ [All ●] [Unread] [Mentions]   ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Notification Feed ────────────┐│
│  │ (FlashList with items)         ││
│  └──────────────────────────────────┘│
│                                     │
│  [Mark All as Read] (if unread>0)  │
└─────────────────────────────────────┘
```

### Notification Settings Page

```
┌─────────────────────────────────────┐
│  [Back]  Notifications Settings    │
├─────────────────────────────────────┤
│  ┌─ Push Toggle Card ──────────────┐│
│  │ Push Notifications [●]         ││
│  │ (system toggle)                ││
│  └──────────────────────────────────┘│
│                                     │
│  ┌─ Workouts Card ────────────────┐│
│  │ ☑ Reminders                   ││
│  │ ☑ Completion                  ││
│  │ ⚪ Suggestions                ││
│  └──────────────────────────────────┘│
│  ... (other categories)            │
│                                     │
│  ┌─ Quiet Hours Card ─────────────┐│
│  │ [●] From 10:00 PM to 6:00 AM  ││
│  │ ☑ Allow Urgent Only           ││
│  └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

**Track 2 Deliverables**:
- [x] Push notification UI specifications (mobile/web)
- [x] In-app notification center design
- [x] Notification item component with variants
- [x] Notification list with filters
- [x] Notification settings screen
- [x] All notification types specified (6 categories)
- [x] Empty states and loading states
- [x] Real-time update patterns
- [x] Accessibility patterns
- [x] Component API reference

**Status**: All notification UI designs complete in this specification.

---

## 🔄 Next Steps

1. **Review**: Team C (senior-push-notifications or appropriate lead) reviews these specs
2. **Implementation Priority**:
   - P0: NotificationItem, NotificationList, NotificationSettings
   - P1: Push notification service (Expo Notifications / Web Push)
   - P2: Real-time updates (WebSocket/SSE)
   - P3: Advanced features (snooze, scheduled summaries)
3. **API Integration**: Coordinate with backend for:
   - Notification storage and retrieval
   - Real-time delivery (Redis pub/sub or similar)
   - User preferences CRUD
   - Push token management (FCM/APNs)
4. **Platform Specific**:
   - **Mobile**: Expo Notifications setup, deep linking
   - **Web**: Service Worker, VAPID keys, permission prompts
5. **Testing**: Verify on real devices (push requires physical device)

---

## 📞 Coordination

- **API Endpoints**: Coordinate with backend team to implement notification routes
- **Database Schema**: Ensure `notifications` table with fields: `id, userId, type, title, body, data, isRead, priority, createdAt`
- **Push Services**:
  - iOS: Apple Push Notification service (APNs)
  - Android: Firebase Cloud Messaging (FCM)
  - Web: VAPID keys for Web Push
- **Permissions**: Handle OS-level permission requests gracefully

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-04-27  
**Next Review**: After implementation sprint
