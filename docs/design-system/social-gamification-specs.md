# Social & Gamification UI Specifications

**Track 1 - Team A: Social Features & Gamification**
**Designer**: senior-designer
**Date**: 2025-04-27
**Status**: ✅ Complete - Ready for Implementation
**Design System**: AIVO Design System v1.0

---

## 📦 Overview

This document specifies the UI for social features and gamification elements in the AIVO fitness platform. It extends the core design system with:

- **User Profile** (enhanced with social elements)
- **Leaderboards** (global, friends, club-specific)
- **Clubs & Events** (community features)
- **Achievements & Badges** (gamification)
- **Points, Streaks, Levels** (progression systems)

All designs follow the AIVO Design System v1.0 with dark-first theme, semantic tokens, and WCAG 2.1 AA compliance.

---

## 🎯 User Profile (Enhanced)

### Profile Header Card

**Layout Structure**:
```
┌─────────────────────────────────────┐
│ [Avatar XL]   [Name]                │
│               [@username]           │
│               Level 12 • 8,450 pts  │
│                                     │
│ ── Stats Grid (2×2) ────────────── │
│ │ Workouts │ Streak │ Calories │   │
│ │   247    │  15d   │ 52,340   │   │
│ ─────────────────────────────────── │
│                                     │
│ [Following] [Followers] [Badges]   │
│     1,248       3,456      24/30    │
│                                     │
│ [Edit Profile Button]               │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Card Variant**: `filled` with gradient border (primary 20% opacity)
- **Avatar**: `size="xl"` (96px) with `status="online"` indicator
- **Name**: `text-2xl font-bold text-text-primary`
- **Username**: `text-sm text-text-secondary` with @ prefix
- **Level/Points**: `text-base font-medium bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full`
- **Stats Grid**: 2×2 grid, `gap-4`, each stat:
  - Label: `text-sm text-text-tertiary`
  - Value: `text-xl font-bold text-text-primary`
  - Icon: `size=20` (WorkoutDumbbell, Flame, Fire, Target)
- **Social counts**: `text-sm text-text-secondary` with `text-text-primary` numbers
- **Edit Button**: `variant="outline" size="md" fullWidth`

**Responsive**:
- Mobile: Stack avatar and stats vertically
- Tablet+: Side-by-side layout (avatar left, content right)

---

## 🏆 Leaderboards

### Leaderboard Types

Three leaderboard variants with consistent structure:

1. **Global Leaderboard** (all users)
2. **Friends Leaderboard** (following only)
3. **Club Leaderboard** (club members)

### Leaderboard Item Component

**Layout**:
```
┌─────────────────────────────────────────┐
│ Rank  Avatar    Name          Points    │
│  1   [A]       Alex C.        ███████  │
│       [A]  (Level 24)      8,450 pts  │
│                                         │
│  2   [A]       Sarah M.       ██████   │
│       [A]  (Level 21)      7,230 pts  │
│                                         │
│  3   [A]       Mike R.       █████     │
│       [A]  (Level 19)      6,120 pts  │
│                                         │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Design Specs**:
- **Card**: `variant="outlined"` with `padding="md"`
- **Header**: `text-lg font-semibold` with filter tabs (Global/Friends/Club)
- **Tabs**: `variant="ghost" size="sm"` with `active:bg-primary-500/10`
- **List Items**: `flex-row items-center gap-3 py-3 border-b border-border-secondary`
- **Rank**:
  - Top 3: `w-8 text-center text-lg font-bold`
    - 1st: `text-warning-500` (gold)
    - 2nd: `text-gray-400` (silver)
    - 3rd: `text-orange-600` (bronze)
  - Others: `w-8 text-center text-sm text-text-tertiary`
- **Avatar**: `size="sm"` with `status="online"` if active recently
- **Name**: `text-base font-medium text-text-primary`
- **Level**: `text-xs text-text-tertiary` below name
- **Points**: `text-sm font-semibold text-primary-400`
- **Progress Bar** (optional): Small `h-1 bg-surface rounded-full` with `bg-primary-500` fill proportional to rank
- **Self Highlight**: Current user's entry gets `bg-primary-500/5` background

**Mobile Adaptations**:
- Compact rows with `py-2`
- Smaller avatars (`size="xs"`)
- Show only top 50 initially with "Load More" button

---

## 🏁 Clubs & Events

### Club Card Component

**Layout**:
```
┌─────────────────────────────────────┐
│  ┌─[Club Avatar]──────────────────┐ │
│  │ [A] AIVO Runners Club         │ │
│  │ 2,456 members • Boston, MA    │ │
│  │                                │ │
│  │ [Join Button] [View Button]   │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Card**: `variant="elevated"` with `padding="md"`
- **Avatar**: `size="lg"` (48px), `rounded="full"` with club initials fallback
- **Name**: `text-lg font-semibold text-text-primary`
- **Meta**: `text-sm text-text-secondary` (members + location)
- **Actions**:
  - Join: `variant="primary" size="sm"` (if not member)
  - View: `variant="outline" size="sm"` (if member)
  - Both in `flex-row gap-2`
- **Badge** (optional): `"Active"` with `variant="success" size="sm"` if club has recent activity

### Event Card Component

**Layout**:
```
┌─────────────────────────────────────┐
│  [Event Image/Icon]  [Date Badge]  │
│                     Sat, Apr 29      │
│                                      │
│  Morning Run • 5K                   │
│  ─────────────────────────────────  │
│  📍 Charles River Path             │
│  ⏰ 7:00 AM • 15 going              │
│                                      │
│ [Join Event] [Details]              │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Card**: `variant="outlined"` with `padding="md"`
- **Header**: `flex-row gap-3`
  - Event Image: `w-16 h-16 bg-surface rounded-lg` with activity icon
  - Date Badge: `flex-col items-center justify-center bg-primary-500/10 rounded-lg w-14 h-14`
    - Day: `text-xl font-bold text-primary-400`
    - Month: `text-xs text-text-secondary uppercase`
- **Title**: `text-base font-semibold text-text-primary`
- **Type Badge**: `"5K"` with `variant="secondary" size="sm"` inline with title
- **Divider**: `my-2 border-b border-border-secondary`
- **Details**:
  - Location: `flex-row items-center gap-2 text-sm text-text-secondary`
  - Time/Count: `flex-row items-center gap-2 text-sm text-text-secondary`
- **Actions**: `flex-row gap-2 mt-2`
  - Join: `variant="primary" size="sm" fullWidth`
  - Details: `variant="ghost" size="sm"`

### Events Feed Layout

**Mobile**: Full-width cards stacked vertically
**Tablet+**: Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

---

## 🎖️ Achievements & Badges (Gamification)

### Gamification Badge Component

**Layout**:
```
┌─────────────────────────────────────┐
│        ┌──────────────┐             │
│        │   [Icon]     │             │
│        │   UNLOCKED   │   or       │
│        │   or LOCKED  │             │
│        └──────────────┘             │
│                                      │
│    10K Steps Achieved               │
│    Complete 10,000 steps in a day   │
│                                      │
│  ████████░░░░ 80% progress         │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Card**: `variant="filled"` with `padding="md"` and border radius `radius-lg`
- **Badge Icon Container**: `w-20 h-20 rounded-full flex items-center justify-center`
  - Unlocked: `bg-gradient-to-br from-primary-500 to-primary-600`
  - Locked: `bg-gray-800`
  - Icon: `size=40` white or gray-500
  - Progress ring (optional): SVG circle with `stroke-primary-400` for progress
- **Title**: `text-base font-bold text-text-primary mt-3`
- **Description**: `text-sm text-text-secondary mt-1`
- **Progress Bar** (if incomplete): `h-2 bg-gray-800 rounded-full mt-3 overflow-hidden`
  - Fill: `h-full bg-primary-500` with width based on progress
  - Percentage: `text-xs text-text-tertiary mt-1` (e.g., "80% to next reward")
- **Rarity Tint** (optional):
  - Common: No tint
  - Rare: `border-2 border-warning-500`
  - Epic: `border-2 border-primary-500`
  - Legendary: `border-2 border-success-500` + `shadow-lg shadow-primary-500/30`

### Badge Variants

1. **Achievement Badge**: Milestone-based (e.g., "10K Steps", "First Workout")
2. **Streak Badge**: Consistency tracking (e.g., "7-Day Streak", "Perfect Month")
3. **Challenge Badge**: Event participation (e.g., "Spring 5K", "Holiday Challenge")
4. **Social Badge**: Community engagement (e.g., "Club Member", "Helper")

**Badge Grid**:
- Mobile: `grid-cols-2 gap-3`
- Tablet+: `grid-cols-3 md:grid-cols-4 gap-4`
- Card size: `min-h-32` with centered content

---

## 📊 Points, Streaks & Levels

### Level Progress Card

**Layout**:
```
┌─────────────────────────────────────┐
│  Level 12                            │
│  ────────────────────────────────   │
│  ████████████████░░░░░░░░░░░░ 65%   │
│  5,200 / 8,000 XP to Level 13       │
│                                      │
│  ┌─[Weekly Reset]─────────────────┐ │
│  │ 3 days left in streak! 🔥      │ │
│  │ Next: 5,000 pts for Gold       │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Card**: `variant="gradient"` (primary gradient background)
- **Level Badge**: `bg-black/30 backdrop-blur rounded-lg p-4 text-center`
  - Label: `text-sm font-medium text-white/80`
  - Number: `text-4xl font-bold text-white`
- **Progress Bar**: `h-3 bg-black/30 rounded-full mt-3 overflow-hidden`
  - Fill: `h-full bg-warning-500` with gradient
  - Label: `text-xs text-white/80 mt-1 text-center`
- **Streak Banner** (if active): `bg-warning-500/20 border border-warning-500/30 rounded-lg p-3 mt-3`
  - Fire icon: `size=20 text-warning-500`
  - Text: `text-sm font-medium text-warning-400`
  - Next reward: `text-xs text-warning-500/80`

### Points History List

**Layout**:
```
┌─────────────────────────────────────┐
│  Points History                      │
│  ─────────────────────────────────  │
│  +250  Workout Completed      Today │
│  +100  Daily Streak Bonus     Today │
│  +50   Social Share           Today │
│  +500  Monthly Challenge Won  Apr 25 │
│  -100  Missed Workout         Apr 24 │
│                                      │
│  [View All History]                 │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Header**: `text-base font-semibold`
- **List Items**: `flex-row justify-between items-center py-2 border-b border-border-secondary`
  - Description: `text-sm text-text-primary`
  - Amount: `font-semibold`
    - Positive: `text-success-500`
    - Negative: `text-error-500`
  - Date: `text-xs text-text-tertiary`
- **Footer**: `mt-3`
  - Link: `variant="ghost" size="sm"` with chevron icon

---

## 👥 Social Interactions

### Following/Followers List

**Layout**:
```
┌─────────────────────────────────────┐
│  [Tabs: Following | Followers]      │
│  ─────────────────────────────────  │
│  [Avatar]  Sarah Mitchell          │
│  [A]       @sarahm • Level 21      │
│            Following each other    │
│            [Unfollow]              │
│  ─────────────────────────────────  │
│  [Avatar]  Mike Roberts            │
│  [A]       @miker • Level 19       │
│            [Follow Back]           │
│  ─────────────────────────────────  │
│  ...                                │
└─────────────────────────────────────┘
```

**Design Specs**:
- **Tabs**: `variant="ghost" size="sm"` with active indicator
- **List Item**: `flex-row items-center gap-3 py-3`
  - Avatar: `size="md"`
  - Info: `flex-1`
    - Name: `text-base font-medium`
    - Username/Level: `text-sm text-text-secondary`
    - Mutual status (if applicable): `text-xs text-primary-400`
  - Action: `size="sm" variant="ghost"` or `"primary"` based on state
- **Divider**: `border-b border-border-secondary`

---

## 🎨 Component Specifications Summary

### New Components Required

| Component | Platform | Status | Priority |
|-----------|----------|--------|----------|
| `LeaderboardCard` | Web + Mobile | 🔄 New | High |
| `ClubCard` | Web + Mobile | 🔄 New | High |
| `EventCard` | Web + Mobile | 🔄 New | High |
| `AchievementBadge` | Web + Mobile | 🔄 New | High |
| `LevelProgress` | Web + Mobile | 🔄 New | Medium |
| `PointsHistory` | Web + Mobile | 🔄 New | Medium |
| `SocialStats` | Web + Mobile | 🔄 New | Medium |
| `ProfileHeader` | Web + Mobile | 🔄 New | High |

### Component Variants & States

**LeaderboardCard**:
- Variants: `default`, `highlighted` (current user), `compact`
- States: `idle`, `hover` (web), `pressed` (mobile)

**ClubCard**:
- Variants: `default`, `joined`, `featured`
- States: `idle`, `hover`, `joined`

**AchievementBadge**:
- Variants: `locked`, `unlocked`, `in-progress`
- Rarity: `common`, `rare`, `epic`, `legendary`
- States: `idle`, `hover` (show tooltip with description)

---

## 📱 Responsive Breakpoints

### Mobile (< 768px)
- Full-width cards
- Stacked layouts
- Smaller avatars and icons
- Compact spacing (`p-3`, `gap-2`)

### Tablet (≥ 768px)
- Side-by-side profile header
- Grid layouts: 2 columns
- Standard spacing (`p-4`, `gap-4`)

### Desktop (≥ 1024px)
- Multi-column grids: 3 columns
- Leaderboard shows more details (progress bars, level)
- Profile with expanded stats

---

## 🎯 Gamification Patterns

### Points System

| Action | Points | Frequency |
|--------|--------|-----------|
| Complete Workout | +250 | Once per workout |
| Daily Login | +50 | Once per day |
| 7-Day Streak Bonus | +500 | Weekly |
| Social Share | +100 | Daily limit 3 |
| Club Participation | +200 | Per event |
| Challenge Win | +500 | Monthly |
| Friend Referral | +1000 | Once per friend |

**Visual Treatment**:
- Positive points: `text-success-500` with ↑ arrow
- Negative points: `text-error-500` with ↓ arrow

### Streaks

**Streak Tracking**:
- Current streak: consecutive days with workout
- Longest streak: all-time best
- Streak bonuses: multipliers at 7, 30, 100 days

**Visual Indicators**:
- Active streak: `🔥` icon + `bg-warning-500/10 border-warning-500`
- Broken streak: `⚡` icon + `bg-gray-800`
- Streak milestone: `🎉` celebration animation

### Levels

**Level Progression**:
- Level 1 → 50
- XP required: exponential growth (base 1000, 1.2× multiplier per level)
- Level badge: prominent display on profile header
- Level-up animation: confetti + celebration modal

**XP Sources**:
- Workouts: 100-500 XP based on duration/intensity
- Challenges: 200-1000 XP
- Social: 50 XP per interaction

---

## 🎨 Color Usage

### Gamification Colors

| Purpose | Token | Hex | Usage |
|---------|-------|-----|-------|
| Primary Progress | `bg-primary-500` | #3b82f6 | XP bars, progress indicators |
| Success/Achievement | `bg-success-500` | #10b981 | Points positive, unlocked badges |
| Warning/Streak | `bg-warning-500` | #f59e0b | Streak indicators, time-sensitive |
| Error/Loss | `bg-error-500` | #ef4444 | Points negative, broken streaks |
| Rare Badge | `border-warning-500` | #f59e0b | Epic achievements |
| Epic Badge | `border-primary-500` | #3b82f6 | Major milestones |
| Legendary | `border-success-500` | #10b981 | Ultimate achievements |

---

## ♿ Accessibility Considerations

### Keyboard Navigation (Web)
- Leaderboard items: focusable with clear outline
- Badge grid: tab order left-to-right, top-to-bottom
- Filters: keyboard-accessible tabs
- Buttons: `:focus-visible` with `ring-2 ring-primary-500`

### Screen Reader
- Badge status: `aria-label="Achievement Unlocked: 10K Steps"` or `"Locked: Complete 10,000 steps"`
- Leaderboard rank: `aria-sort="numeric"` on table headers
- Points: announce with `"plus"` or `"minus"` prefix
- Streaks: `aria-live="polite"` for streak changes

### Touch Targets (Mobile)
- All interactive elements ≥ 44×44pt
- Badge grid items: minimum touch target with invisible padding
- Leaderboard rows: full-width touch targets

---

## 📦 Component API Reference

### LeaderboardCard

```typescript
interface LeaderboardCardProps {
  rank: number;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    level: number;
    points: number;
    isCurrentUser?: boolean;
  };
  points?: number; // Optional display format
  showProgress?: boolean;
  variant?: 'default' | 'highlighted' | 'compact';
  onPress?: (userId: string) => void;
}
```

### AchievementBadge

```typescript
interface AchievementBadgeProps {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  unlockedAt?: Date;
  progress?: number; // 0-100
  maxProgress?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  onPress?: () => void;
}
```

### ClubCard

```typescript
interface ClubCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  memberCount: number;
  location?: string;
  isJoined: boolean;
  isFeatured?: boolean;
  onJoin?: () => void;
  onView?: () => void;
}
```

---

## 📐 Page Layouts

### Profile Page Structure

```
┌─────────────────────────────────────┐
│ [Back Button]  Profile              │
├─────────────────────────────────────┤
│ ┌─ Profile Header Card ────────────┐│
│ │ Avatar + Info + Stats Grid       ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Level Progress Card ────────────┐│
│ │ XP bar + Streak + Next Reward    ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Achievements Section ───────────┐│
│ │ Grid of Badge Cards              ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Social Stats Section ───────────┐│
│ │ Following / Followers            ││
│ │ Recent Activity List             ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Points History ─────────────────┐│
│ │ List of recent point changes     ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Leaderboard Page Structure

```
┌─────────────────────────────────────┐
│ [Back]  Leaderboard                 │
├─────────────────────────────────────┤
│ ┌─ Tabs [Global|Friends|Club] ────┐│
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Leaderboard Card (x10-20) ──────┐│
│ │ Rank + Avatar + Name + Points    ││
│ │ Progress bars (optional)         ││
│ └──────────────────────────────────┘│
│                                     │
│ [Load More Button]                  │
└─────────────────────────────────────┘
```

### Clubs/Events Page Structure

```
┌─────────────────────────────────────┐
│ [Back]  Clubs & Events              │
├─────────────────────────────────────┤
│ ┌─ Filter Tabs [Clubs|Events] ─────┐│
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ [Club Card] ────────────────────┐│
│ └──────────────────────────────────┘│
│ ┌─ [Event Card] ───────────────────┐│
│ └──────────────────────────────────┘│
│ ┌─ [Club Card] ────────────────────┐│
│ └──────────────────────────────────┘│
│ ...                                 │
│                                     │
│ [Create Club Button (FAB mobile)]  │
└─────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

**Track 1 Deliverables**:
- [x] Profile header design with stats grid
- [x] Leaderboard component variants (3 types)
- [x] Club card and Event card components
- [x] Achievement badge system with rarity tiers
- [x] Level/Points/Streaks gamification patterns
- [x] Social interactions (following/followers)
- [x] Responsive layouts (mobile/tablet/desktop)
- [x] Accessibility patterns (ARIA, focus, touch targets)

**Status**: All wireframes and component mockups complete in this specification.

---

## 🔄 Next Steps

1. **Review**: Team A (senior-hono) reviews these specifications for API needs
2. **Implementation Priority**:
   - P0: ProfileHeader, AchievementBadge, LeaderboardCard
   - P1: ClubCard, EventCard, LevelProgress
   - P2: PointsHistory, SocialStats
3. **API Integration**: Coordinate with senior-hono for endpoints:
   - `GET /api/users/:id/profile`
   - `GET /api/leaderboards/:type`
   - `GET /api/clubs`
   - `GET /api/events`
   - `POST /api/achievements`
4. **Database**: Ensure schema includes user profiles, clubs, events, achievements tables

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-04-27  
**Next Review**: After implementation sprint
